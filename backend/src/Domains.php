<?php
declare(strict_types=1);

namespace ServerDeck;

class Domains
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * Get live dynamic domains, subdomains, SSL certificate validity, and live HTTP health ping
     */
    public function getDomainsAndSsl(): array
    {
        $homeDir = PathGuard::homeDir();

        // 1. Dapatkan daftar semua domain & subdomain secara dinamis via cPanel UAPI
        $allDomains = $this->discoverDomains($homeDir);

        // 2. Dapatkan data SSL yang terpasang dari cPanel
        $sslMap = $this->getInstalledSslCertificates();

        $results = [];
        $now = time();

        foreach ($allDomains as $domainName => $domainMeta) {
            $matchedSsl = $this->matchSslForDomain($domainName, $sslMap);

            $status = 'no_ssl';
            $issuer = 'Belum Terpasang (Pending AutoSSL)';
            $provider = 'AutoSSL';
            $validFrom = '-';
            $validUntil = '-';
            $notAfter = 0;
            $daysRemaining = 0;
            $fqdnsCount = 1;
            $ip = $domainMeta['ip'] ?: ($_SERVER['SERVER_ADDR'] ?? gethostbyname(gethostname()) ?: '127.0.0.1');

            if ($matchedSsl !== null) {
                $cert = $matchedSsl['certificate'] ?? [];
                $notBefore = (int)($cert['not_before'] ?? 0);
                $notAfter  = (int)($cert['not_after'] ?? 0);
                $issuer    = $cert['issuer.organizationName'] ?? ($cert['issuer_text'] ?? "Let's Encrypt");
                $provider  = $cert['auto_ssl_provider_display_name'] ?? ($cert['auto_ssl_provider'] ?? 'AutoSSL');
                $fqdnsCount = count($matchedSsl['fqdns'] ?? ($matchedSsl['domains'] ?? [$domainName]));
                $ip = $matchedSsl['ip'] ?? $ip;

                $validFrom  = $notBefore > 0 ? date('d M Y', $notBefore) : '-';
                $validUntil = $notAfter > 0 ? date('d M Y', $notAfter) : '-';

                $daysRemaining = $notAfter > 0 ? (int)floor(($notAfter - $now) / 86400) : 0;
                if ($daysRemaining <= 0) {
                    $status = 'expired';
                } elseif ($daysRemaining <= 30) {
                    $status = 'expiring';
                } else {
                    $status = 'valid';
                }
            }

            // Quick live HTTP ping (coba HTTPS, jika gagal coba HTTP)
            $ping = $this->pingUrl("https://{$domainName}");
            if (!$ping['is_online'] && $status === 'no_ssl') {
                $httpPing = $this->pingUrl("http://{$domainName}");
                if ($httpPing['is_online']) {
                    $ping = $httpPing;
                }
            }

            $results[] = [
                'server_name'     => $domainName,
                'primary_domain'  => $domainName,
                'type'            => $domainMeta['type'] ?? 'domain',
                'type_label'      => $domainMeta['type_label'] ?? 'Domain',
                'docroot'         => $domainMeta['docroot'] ?? '',
                'php_version'     => $domainMeta['php'] ?? '',
                'domains'         => [$domainName],
                'fqdns_count'     => $fqdnsCount,
                'issuer'          => $issuer,
                'provider'        => $provider,
                'valid_from'      => $validFrom,
                'valid_until'     => $validUntil,
                'expires_at'      => $notAfter,
                'days_remaining'  => $daysRemaining,
                'status'          => $status,
                'is_autossl'      => true,
                'ip'              => $ip,
                'http_ping'       => $ping,
            ];
        }

        // Sort: Domain Utama paling atas, lalu Addon, lalu Subdomain, urut abjad
        usort($results, function ($a, $b) {
            $priority = ['main' => 1, 'addon' => 2, 'subdomain' => 3, 'domain' => 4];
            $pa = $priority[$a['type']] ?? 5;
            $pb = $priority[$b['type']] ?? 5;
            if ($pa !== $pb) {
                return $pa <=> $pb;
            }
            return strcasecmp($a['primary_domain'], $b['primary_domain']);
        });

        return [
            'success' => true,
            'hosts'   => $results,
        ];
    }

    /**
     * Discover all domains & subdomains dynamically via cPanel UAPI & Filesystem fallback
     */
    private function discoverDomains(string $homeDir): array
    {
        $domains = [];

        // Method 1: cPanel DomainInfo domains_data (paling lengkap: docroot, php, type)
        $raw = @shell_exec('uapi --output=json DomainInfo domains_data 2>/dev/null');
        $json = json_decode((string)$raw, true);
        $data = $json['result']['data'] ?? null;

        if (is_array($data)) {
            // Main domain
            if (!empty($data['main_domain']['domain'])) {
                $m = $data['main_domain'];
                $domains[$m['domain']] = [
                    'domain'     => $m['domain'],
                    'type'       => 'main',
                    'type_label' => 'Domain Utama',
                    'docroot'    => $m['documentroot'] ?? ($homeDir . '/public_html'),
                    'php'        => $m['phpversion'] ?? '',
                    'ip'         => $m['ip'] ?? '',
                ];
            }

            // Addon domains
            if (!empty($data['addon_domains']) && is_array($data['addon_domains'])) {
                foreach ($data['addon_domains'] as $a) {
                    if (!empty($a['domain'])) {
                        $domains[$a['domain']] = [
                            'domain'     => $a['domain'],
                            'type'       => 'addon',
                            'type_label' => 'Addon Domain',
                            'docroot'    => $a['documentroot'] ?? '',
                            'php'        => $a['phpversion'] ?? '',
                            'ip'         => $a['ip'] ?? '',
                        ];
                    }
                }
            }

            // Subdomains
            if (!empty($data['sub_domains']) && is_array($data['sub_domains'])) {
                $mainDom = $data['main_domain']['domain'] ?? '';
                foreach ($data['sub_domains'] as $s) {
                    $dom = $s['domain'] ?? '';
                    if (empty($dom)) continue;

                    // Filter internal alias subdomains e.g. 'sub.addon.example.com'
                    if (!empty($mainDom) && str_ends_with($dom, '.' . $mainDom)) {
                        $basePart = substr($dom, 0, -strlen('.' . $mainDom));
                        if (isset($domains[$basePart])) {
                            continue;
                        }
                    }

                    $domains[$dom] = [
                        'domain'     => $dom,
                        'type'       => 'subdomain',
                        'type_label' => 'Subdomain',
                        'docroot'    => $s['documentroot'] ?? '',
                        'php'        => $s['phpversion'] ?? '',
                        'ip'         => $s['ip'] ?? '',
                    ];
                }
            }
        }

        // Method 2: Fallback jika domains_data kosong (misal non-cPanel atau UAPI dibatasi)
        if (empty($domains)) {
            // Subdomain listsubdomains
            $rawSub = @shell_exec('uapi --output=json SubDomain listsubdomains 2>/dev/null');
            $jsonSub = json_decode((string)$rawSub, true);
            $subData = $jsonSub['result']['data'] ?? [];

            foreach ($subData as $s) {
                $dom = $s['domain'] ?? '';
                if (!empty($dom)) {
                    $domains[$dom] = [
                        'domain'     => $dom,
                        'type'       => 'subdomain',
                        'type_label' => 'Subdomain',
                        'docroot'    => $s['dir'] ?? '',
                        'php'        => '',
                        'ip'         => '',
                    ];
                }
            }

            // Scan filesystem ~/domains/
            if (is_dir($homeDir . '/domains')) {
                $dirs = @scandir($homeDir . '/domains') ?: [];
                foreach ($dirs as $d) {
                    if ($d[0] !== '.' && $d !== 'README.txt' && is_dir($homeDir . '/domains/' . $d)) {
                        if (!isset($domains[$d])) {
                            $domains[$d] = [
                                'domain'     => $d,
                                'type'       => 'subdomain',
                                'type_label' => 'Subdomain',
                                'docroot'    => $homeDir . '/domains/' . $d . '/public_html',
                                'php'        => '',
                                'ip'         => '',
                            ];
                        }
                    }
                }
            }

            // Scan root level domain folders
            $rootItems = @scandir($homeDir) ?: [];
            foreach ($rootItems as $item) {
                if ($item[0] === '.' || $item === 'domains' || $item === 'public_html' || $item === 'projects') continue;
                if (str_contains($item, '.') && is_dir($homeDir . '/' . $item)) {
                    if (!isset($domains[$item])) {
                        $domains[$item] = [
                            'domain'     => $item,
                            'type'       => 'addon',
                            'type_label' => 'Addon Domain',
                            'docroot'    => $homeDir . '/' . $item,
                            'php'        => '',
                            'ip'         => '',
                        ];
                    }
                }
            }

            // Selalu tambahkan main public_html jika ada
            if (is_dir($homeDir . '/public_html') && !isset($domains['public_html'])) {
                $hostGuess = $_SERVER['HTTP_HOST'] ?? 'main';
                $hostGuess = preg_replace('/:[0-9]+$/', '', $hostGuess);
                $domains[$hostGuess] = [
                    'domain'     => $hostGuess,
                    'type'       => 'main',
                    'type_label' => 'Domain Utama',
                    'docroot'    => $homeDir . '/public_html',
                    'php'        => '',
                    'ip'         => '',
                ];
            }
        }

        return $domains;
    }

    /**
     * Get installed SSL certificates map from cPanel
     */
    private function getInstalledSslCertificates(): array
    {
        $raw = @shell_exec('uapi --output=json SSL installed_hosts 2>/dev/null');
        $json = json_decode((string)$raw, true);
        return $json['result']['data'] ?? [];
    }

    /**
     * Match a domain to an installed SSL host entry
     */
    private function matchSslForDomain(string $domain, array $sslHosts): ?array
    {
        // 1. Direct match by servername
        foreach ($sslHosts as $host) {
            if (strcasecmp($host['servername'] ?? '', $domain) === 0) {
                return $host;
            }
        }

        // 2. Match in domains array of cert
        foreach ($sslHosts as $host) {
            $domains = $host['domains'] ?? [];
            foreach ($domains as $d) {
                if (strcasecmp($d, $domain) === 0) {
                    return $host;
                }
            }
        }

        // 3. Wildcard match (e.g. *.example.com)
        foreach ($sslHosts as $host) {
            $domains = $host['domains'] ?? [];
            foreach ($domains as $d) {
                if (str_starts_with($d, '*.')) {
                    $base = substr($d, 2);
                    if (str_ends_with($domain, '.' . $base) || strcasecmp($domain, $base) === 0) {
                        return $host;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Fast non-blocking HTTP health check
     */
    private function pingUrl(string $url): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_NOBODY         => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            CURLOPT_TIMEOUT        => 3,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT      => 'MusendDeck-HealthCheck/1.2',
        ]);

        $start = microtime(true);
        curl_exec($ch);
        $durationMs = (int)round((microtime(true) - $start) * 1000);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        $isOk = ($httpCode >= 200 && $httpCode < 400);

        return [
            'url'         => $url,
            'http_code'   => $httpCode,
            'latency_ms'  => $durationMs,
            'is_online'   => $isOk,
            'error'       => $error ?: null,
        ];
    }
}

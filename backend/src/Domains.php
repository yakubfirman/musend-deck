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
     * Get SSL hosts, certificate validity, and live HTTP health ping
     */
    public function getDomainsAndSsl(): array
    {
        $cmd = "uapi --output=json SSL installed_hosts 2>/dev/null";
        $json = @shell_exec($cmd);
        $hosts = [];

        if ($json) {
            $parsed = json_decode($json, true);
            $hosts = $parsed['result']['data'] ?? [];
        }

        $results = [];
        $now = time();

        foreach ($hosts as $host) {
            $cert = $host['certificate'] ?? [];
            $servername = $host['servername'] ?? ($host['domains'][0] ?? 'unknown');
            $docroot = $host['docroot'] ?? '';
            $domains = $host['domains'] ?? [];
            $fqdns   = $host['fqdns'] ?? [];

            $notBefore = (int)($cert['not_before'] ?? 0);
            $notAfter  = (int)($cert['not_after'] ?? 0);
            $issuer    = $cert['issuer.organizationName'] ?? ($cert['issuer_text'] ?? "Let's Encrypt");
            $provider  = $cert['auto_ssl_provider_display_name'] ?? ($cert['auto_ssl_provider'] ?? 'AutoSSL');

            $daysRemaining = $notAfter > 0 ? (int)floor(($notAfter - $now) / 86400) : 0;
            $status = 'valid';
            if ($daysRemaining <= 0) {
                $status = 'expired';
            } elseif ($daysRemaining <= 30) {
                $status = 'expiring';
            }

            // Target domain to check HTTP health
            $primaryDomain = $servername;
            if (str_starts_with($primaryDomain, '*.')) {
                $primaryDomain = substr($primaryDomain, 2);
            }
            if (str_contains($primaryDomain, 'musend.web.id')) {
                $primaryDomain = 'musend.web.id';
            } elseif (str_contains($primaryDomain, 'api.yakubfirman.com')) {
                $primaryDomain = 'api.yakubfirman.com';
            } elseif (str_contains($primaryDomain, 'yakubfirman.com') && !str_contains($primaryDomain, 'api.')) {
                $primaryDomain = 'yakubfirman.com';
            }

            // Quick live HTTP ping
            $ping = $this->pingUrl("https://{$primaryDomain}");

            $results[] = [
                'server_name'     => $servername,
                'primary_domain'  => $primaryDomain,
                'docroot'         => $docroot,
                'domains'         => $domains,
                'fqdns_count'     => count($fqdns),
                'issuer'          => $issuer,
                'provider'        => $provider,
                'valid_from'      => $notBefore > 0 ? date('d M Y', $notBefore) : '-',
                'valid_until'     => $notAfter > 0 ? date('d M Y', $notAfter) : '-',
                'expires_at'      => $notAfter,
                'days_remaining'  => $daysRemaining,
                'status'          => $status,
                'is_autossl'      => (bool)($cert['is_autossl'] ?? true),
                'ip'              => $host['ip'] ?? '178.83.188.88',
                'http_ping'       => $ping,
            ];
        }

        // Deduplicate by primary domain
        $unique = [];
        foreach ($results as $item) {
            $key = $item['primary_domain'];
            if (!isset($unique[$key]) || $item['days_remaining'] > $unique[$key]['days_remaining']) {
                $unique[$key] = $item;
            }
        }

        return [
            'success' => true,
            'hosts'   => array_values($unique),
        ];
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
            CURLOPT_USERAGENT      => 'ServerDeck-HealthCheck/1.0',
        ]);

        $start = microtime(true);
        curl_exec($ch);
        $durationMs = (int)round((microtime(true) - $start) * 1000);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        $isOk = ($httpCode >= 200 && $httpCode < 400);

        return [
            'url'         => $url,
            'http_code'   => $httpCode ?: 0,
            'latency_ms'  => $durationMs,
            'is_online'   => $isOk,
            'error'       => $error ?: null,
        ];
    }
}

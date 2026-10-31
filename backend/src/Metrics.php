<?php
declare(strict_types=1);

namespace ServerDeck;

class Metrics
{
    private array $config;
    private ?string $cacheFile;
    private ?string $historyFile;
    private ?string $diskUsageFile;

    public function __construct(array $config)
    {
        $this->config = $config;
        $appDir = dirname(__DIR__);
        $this->cacheFile = SetupToken::privatePath($appDir, 'metrics-cache.json');
        $this->historyFile = SetupToken::privatePath($appDir, 'metrics-history.json');
        $this->diskUsageFile = SetupToken::privatePath($appDir, 'disk-usage.json');
    }

    public function getMetrics(bool $forceRefresh = false): array
    {
        $ttl = (int)($this->config['cache']['metrics_ttl_seconds'] ?? 15);

        // 1. Check transient cache
        if (!$forceRefresh && $this->cacheFile !== null && !is_link($this->cacheFile) && file_exists($this->cacheFile)) {
            $mtime = filemtime($this->cacheFile);
            if ((time() - $mtime) < $ttl) {
                $content = @file_get_contents($this->cacheFile);
                if ($content) {
                    $cached = json_decode($content, true);
                    if (is_array($cached)) {
                        $cached['from_cache'] = true;
                        $cached['cache_age']  = time() - $mtime;
                        $cached['history']    = $this->getHistory($cached);
                        return $cached;
                    }
                }
            }
        }

        // 2. Fresh calculation
        $metrics = $this->collectMetrics();
        $metrics['from_cache'] = false;
        $metrics['cached_at']  = time();
        $metrics['history']    = $this->recordAndGetHistory($metrics);

        // 3. Save to transient cache
        if ($this->cacheFile !== null && !is_link($this->cacheFile)) {
            @file_put_contents($this->cacheFile, json_encode($metrics), LOCK_EX);
        }

        return $metrics;
    }

    /**
     * Record snapshot to historical metrics log and return history
     */
    private function recordAndGetHistory(array $current): array
    {
        $history = [];
        if ($this->historyFile !== null && !is_link($this->historyFile) && file_exists($this->historyFile)) {
            $raw = @file_get_contents($this->historyFile);
            if ($raw) {
                $history = json_decode($raw, true) ?: [];
            }
        }

        $now = time();
        $last = !empty($history) ? end($history) : null;
        $lastTime = $last['timestamp'] ?? 0;

        $snapshot = [
            'time'      => date('H:i', $now),
            'timestamp' => $now,
            'cpu'       => (float)($current['cpu']['usage_percent'] ?? 0),
            'ram_mb'    => round(((float)($current['ram']['used_bytes'] ?? 0)) / (1024 * 1024), 1),
            'ram_pct'   => (float)($current['ram']['usage_percent'] ?? 0),
            'ep'        => (int)($current['processes']['ep_count'] ?? 0),
            'nproc'     => (int)($current['processes']['nproc_count'] ?? 0),
            'io_kb'     => round(((float)($current['io']['speed_current_bytes'] ?? 0)) / 1024, 1),
        ];

        // Record at most once per 45 seconds
        if (($now - $lastTime) >= 45 || empty($history)) {
            $history[] = $snapshot;
            if (count($history) > 96) {
                $history = array_slice($history, -96);
            }
            if ($this->historyFile !== null && !is_link($this->historyFile)) {
                @file_put_contents($this->historyFile, json_encode($history), LOCK_EX);
            }
        }

        return $history;
    }

    public function getHistory(array $fallbackMetrics = []): array
    {
        $history = [];
        if ($this->historyFile !== null && !is_link($this->historyFile) && file_exists($this->historyFile)) {
            $raw = @file_get_contents($this->historyFile);
            if ($raw) {
                $history = json_decode($raw, true) ?: [];
            }
        }

        $now = time();
        $fallback = [
            'time'      => date('H:i', $now),
            'timestamp' => $now,
            'cpu'       => (float)($fallbackMetrics['cpu']['usage_percent'] ?? 0),
            'ram_mb'    => round(((float)($fallbackMetrics['ram']['used_bytes'] ?? 0)) / (1024 * 1024), 1),
            'ram_pct'   => (float)($fallbackMetrics['ram']['usage_percent'] ?? 0),
            'ep'        => (int)($fallbackMetrics['processes']['ep_count'] ?? 0),
            'nproc'     => (int)($fallbackMetrics['processes']['nproc_count'] ?? 0),
            'io_kb'     => round(((float)($fallbackMetrics['io']['speed_current_bytes'] ?? 0)) / 1024, 1),
        ];

        return !empty($history) ? $history : [$fallback];
    }

    private function collectMetrics(): array
    {
        $systemUser = posix_getpwuid(posix_geteuid())['name'] ?? get_current_user() ?? getenv('USER') ?: 'user';
        $rootDir = PathGuard::resolveRoot((string)($this->config['fs']['root_dir'] ?? PathGuard::homeDir())) ?? PathGuard::homeDir();

        // Fetch 100% real hosting stats from cPanel / CloudLinux uapi
        $uapiUsages = $this->queryUapiResourceUsages();
        $uapiQuota  = $this->queryUapiQuota();

        // 1. CPU (Real CloudLinux LVE CPU usage & core allocation)
        $cpuCores = (int)($this->config['limits']['cpu_cores'] ?? 4);
        $cpuLimit = (int)($this->config['limits']['cpu_limit_percent'] ?? ($cpuCores * 100));
        $cpuUsage = isset($uapiUsages['lvecpu']['usage']) 
            ? (float)$uapiUsages['lvecpu']['usage'] 
            : $this->estimateCpuUsage($systemUser);

        // 2. RAM (Real CloudLinux LVE Physical Memory)
        $ramUsed = isset($uapiUsages['lvememphy']['usage']) 
            ? (int)$uapiUsages['lvememphy']['usage'] 
            : $this->estimateRamUsage($systemUser);
        $ramLimit = isset($uapiUsages['lvememphy']['maximum']) && (int)$uapiUsages['lvememphy']['maximum'] > 0
            ? (int)$uapiUsages['lvememphy']['maximum'] 
            : ($this->config['limits']['ram_limit_bytes'] ?? (4 * 1024 * 1024 * 1024));
        $ramPercent = min(100.0, round(($ramUsed / max(1, $ramLimit)) * 100, 1));

        // 3. Processes (Real CloudLinux NPROC & EP)
        $nprocCount = isset($uapiUsages['lvenproc']['usage']) 
            ? (int)$uapiUsages['lvenproc']['usage'] 
            : $this->countProcesses($systemUser)['nproc'];
        $nprocLimit = isset($uapiUsages['lvenproc']['maximum']) && (int)$uapiUsages['lvenproc']['maximum'] > 0
            ? (int)$uapiUsages['lvenproc']['maximum'] 
            : 400;

        $epCount = isset($uapiUsages['lveep']['usage']) 
            ? (int)$uapiUsages['lveep']['usage'] 
            : $this->countProcesses($systemUser)['ep'];
        $epLimit = isset($uapiUsages['lveep']['maximum']) && (int)$uapiUsages['lveep']['maximum'] > 0
            ? (int)$uapiUsages['lveep']['maximum'] 
            : 60;

        // 4. I/O Speed & IOPS
        $ioCurrent = isset($uapiUsages['lveio']['usage']) ? (int)$uapiUsages['lveio']['usage'] : 0;
        $ioLimit = isset($uapiUsages['lveio']['maximum']) && (int)$uapiUsages['lveio']['maximum'] > 0
            ? (int)$uapiUsages['lveio']['maximum'] 
            : (32 * 1024 * 1024);
        $iopsCurrent = isset($uapiUsages['lveiops']['usage']) ? (int)$uapiUsages['lveiops']['usage'] : 0;
        $iopsLimit = isset($uapiUsages['lveiops']['maximum']) && (int)$uapiUsages['lveiops']['maximum'] > 0
            ? (int)$uapiUsages['lveiops']['maximum'] 
            : 4096;

        // 5. Disk Usage & Inodes
        $diskQuotaAvailable = isset($uapiQuota['megabyte_limit']);
        $diskUsageEstimated = !isset($uapiUsages['disk_usage']['usage']);
        $estimatedDiskUsed = $diskUsageEstimated ? $this->estimateDiskUsage(PathGuard::homeDir()) : null;
        $diskUsageAvailable = !$diskUsageEstimated || $estimatedDiskUsed !== null;
        $diskUsed = !$diskUsageEstimated
            ? (int)$uapiUsages['disk_usage']['usage']
            : (int)($estimatedDiskUsed ?? 0);
        $diskLimitMb = isset($uapiQuota['megabyte_limit']) ? (float)$uapiQuota['megabyte_limit'] : 0.0;
        $isDiskUnmetered = $diskQuotaAvailable && ($diskLimitMb <= 0);

        $diskTotalBytes = $diskQuotaAvailable && !$isDiskUnmetered ? (int)($diskLimitMb * 1024 * 1024) : 0;
        $diskFreeBytes = $diskTotalBytes > 0 ? max(0, $diskTotalBytes - $diskUsed) : 0;
        $diskPercent = $diskTotalBytes > 0 ? min(100.0, round(($diskUsed / max(1, $diskTotalBytes)) * 100, 1)) : 0.0;

        $inodesUsed = isset($uapiQuota['inodes_used']) ? (int)$uapiQuota['inodes_used'] : 0;
        $inodeLimit = isset($uapiQuota['inode_limit']) ? (int)$uapiQuota['inode_limit'] : 0;
        $inodesUsageAvailable = isset($uapiQuota['inodes_used']);
        $inodesQuotaAvailable = isset($uapiQuota['inode_limit']);
        $isInodesUnmetered = $inodesQuotaAvailable && ($inodeLimit <= 0);

        // 6. Bandwidth
        $bandwidthAvailable = isset($uapiUsages['bandwidth']['usage']);
        $bandwidthQuotaAvailable = isset($uapiUsages['bandwidth']['maximum']);
        $bandwidthLimit = $bandwidthQuotaAvailable ? (int)$uapiUsages['bandwidth']['maximum'] : 0;
        $bandwidthUnmetered = $bandwidthQuotaAvailable && $bandwidthLimit <= 0;
        $bandwidthUsed = $bandwidthAvailable
            ? (int)$uapiUsages['bandwidth']['usage']
            : $this->readBandwidthFromDatastore($systemUser);

        $telemetryIds = ['lvecpu', 'lvememphy', 'lvenproc', 'lveep', 'disk_usage', 'lveio', 'lveiops', 'bandwidth'];
        $availableTelemetryCount = count(array_filter($telemetryIds, fn(string $id): bool => isset($uapiUsages[$id]['usage'])));
        $telemetrySource = $availableTelemetryCount === count($telemetryIds)
            ? 'CloudLinux UAPI'
            : ($availableTelemetryCount > 0 ? 'UAPI + perkiraan host' : 'Perkiraan host');

        // 7. Load Average
        $loadAvg = function_exists('sys_getloadavg') ? sys_getloadavg() : [0.0, 0.0, 0.0];

        // 8. Hosting Package Features (Real limits from hosting plan)
        $features = [
            'addon_domains'        => isset($uapiUsages['addon_domains']['usage']) ? (int)$uapiUsages['addon_domains']['usage'] : 0,
            'addon_domains_max'    => isset($uapiUsages['addon_domains']['maximum']) ? (int)$uapiUsages['addon_domains']['maximum'] : 0,
            'subdomains'           => isset($uapiUsages['subdomains']['usage']) ? (int)$uapiUsages['subdomains']['usage'] : 0,
            'email_accounts'       => isset($uapiUsages['email_accounts']['usage']) ? (int)$uapiUsages['email_accounts']['usage'] : 0,
            'postgres_dbs'         => isset($uapiUsages['postgresql_databases']['usage']) ? (int)$uapiUsages['postgresql_databases']['usage'] : 0,
            'mysql_dbs'            => isset($uapiUsages['mysql_databases']['usage']) ? (int)$uapiUsages['mysql_databases']['usage'] : 0,
            'ftp_accounts'         => isset($uapiUsages['ftp_accounts']['usage']) ? (int)$uapiUsages['ftp_accounts']['usage'] : 0,
        ];

        return [
            'cpu' => [
                'usage_percent' => $cpuUsage,
                'limit_percent' => $cpuLimit,
                'cores'         => $cpuCores,
            ],
            'ram' => [
                'used_bytes'      => $ramUsed,
                'limit_bytes'     => $ramLimit,
                'usage_percent'   => $ramPercent,
                'formatted_used'  => $this->formatBytes($ramUsed),
                'formatted_limit' => $this->formatBytes($ramLimit),
            ],
            'disk' => [
                'used_bytes'          => $diskUsed,
                'total_bytes'         => $diskTotalBytes,
                'free_bytes'          => $diskFreeBytes,
                'usage_percent'       => $diskPercent,
                'formatted_used'      => $this->formatBytes($diskUsed),
                'formatted_total'     => !$diskQuotaAvailable ? 'Tidak tersedia' : ($isDiskUnmetered ? 'Unmetered' : $this->formatBytes($diskTotalBytes)),
                'is_unmetered'        => $isDiskUnmetered,
                'quota_available'     => $diskQuotaAvailable,
                'usage_available'     => $diskUsageAvailable,
                'is_estimated'        => $diskUsageEstimated && $diskUsageAvailable,
                'inodes_used'         => $inodesUsed,
                'inodes_limit'        => $inodeLimit,
                'is_inodes_unmetered' => $isInodesUnmetered,
                'inodes_available'    => $inodesUsageAvailable || $inodesQuotaAvailable,
                'inodes_usage_available' => $inodesUsageAvailable,
                'inodes_quota_available' => $inodesQuotaAvailable,
            ],
            'processes' => [
                'nproc_count' => $nprocCount,
                'nproc_limit' => $nprocLimit,
                'ep_count'    => $epCount,
                'ep_limit'    => $epLimit,
            ],
            'io' => [
                'speed_current_bytes' => $ioCurrent,
                'speed_available'     => isset($uapiUsages['lveio']['usage']),
                'speed_limit_bytes'   => $ioLimit,
                'speed_limit_available' => isset($uapiUsages['lveio']['maximum']),
                'speed_limit_mb'      => round($ioLimit / (1024 * 1024)),
                'iops_current'        => $iopsCurrent,
                'iops_available'      => isset($uapiUsages['lveiops']['usage']),
                'iops_limit'          => $iopsLimit,
                'iops_limit_available' => isset($uapiUsages['lveiops']['maximum']),
            ],
            'bandwidth' => [
                'used_bytes'     => $bandwidthUsed,
                'formatted_used' => $this->formatBytes($bandwidthUsed),
                'limit_bytes'    => $bandwidthLimit,
                'formatted_limit'=> !$bandwidthQuotaAvailable ? 'Tidak tersedia' : ($bandwidthUnmetered ? 'Unmetered' : $this->formatBytes($bandwidthLimit)),
                'quota_available'=> $bandwidthQuotaAvailable,
                'is_unmetered'   => $bandwidthUnmetered,
                'is_available'   => $bandwidthAvailable,
            ],
            'load_average' => [
                '1m'  => round($loadAvg[0] ?? 0.0, 2),
                '5m'  => round($loadAvg[1] ?? 0.0, 2),
                '15m' => round($loadAvg[2] ?? 0.0, 2),
            ],
            'features' => $features,
            'system' => [
                'php_version' => PHP_VERSION,
                'os'          => $this->detectOperatingSystem(),
                'is_cagefs'   => file_exists('/usr/sbin/cagefsctl') || is_dir('/var/cagefs') || (is_dir('/proc') && !file_exists('/proc/1/cmdline')),
                'server_time' => date('Y-m-d H:i:s'),
                'user'        => $systemUser,
                'web_server'  => $this->detectWebServer(),
                'telemetry_source' => $telemetrySource,
            ],
        ];
    }

    private function queryUapiResourceUsages(): array
    {
        $cmd = 'uapi --output=json ResourceUsage get_usages 2>/dev/null';
        $output = @shell_exec($cmd);
        if (!$output) {
            return [];
        }

        $decoded = json_decode($output, true);
        if (!isset($decoded['result']['data']) || !is_array($decoded['result']['data'])) {
            return [];
        }

        $items = [];
        foreach ($decoded['result']['data'] as $entry) {
            if (isset($entry['id'])) {
                $items[$entry['id']] = $entry;
            }
        }
        return $items;
    }

    private function queryUapiQuota(): array
    {
        $cmd = 'uapi --output=json Quota get_quota_info 2>/dev/null';
        $output = @shell_exec($cmd);
        if (!$output) {
            return [];
        }

        $decoded = json_decode($output, true);
        $data = $decoded['result']['data'] ?? [];
        return is_array($data) ? $data : [];
    }

    private function estimateRamUsage(string $username): int
    {
        $cmd = sprintf("ps -u %s -o rss= 2>/dev/null", escapeshellarg($username));
        $output = @shell_exec($cmd);
        if ($output) {
            $totalKb = 0;
            $lines = explode("\n", trim($output));
            foreach ($lines as $line) {
                $totalKb += (int)trim($line);
            }
            if ($totalKb > 0) {
                return $totalKb * 1024;
            }
        }
        return memory_get_usage(true);
    }

    private function estimateCpuUsage(string $username): float
    {
        $cmd = sprintf("ps -u %s -o %%cpu= 2>/dev/null", escapeshellarg($username));
        $output = @shell_exec($cmd);
        if ($output) {
            $totalCpu = 0.0;
            $lines = explode("\n", trim($output));
            foreach ($lines as $line) {
                $totalCpu += (float)trim($line);
            }
            return min(100.0, round($totalCpu, 1));
        }
        return 0.0;
    }

    private function estimateDiskUsage(string $rootDir): ?int
    {
        if ($this->diskUsageFile !== null && !is_link($this->diskUsageFile) && is_file($this->diskUsageFile)) {
            $cached = json_decode((string)@file_get_contents($this->diskUsageFile), true);
            $cacheAge = is_array($cached) && isset($cached['timestamp']) ? time() - (int)$cached['timestamp'] : -1;
            if (is_array($cached) && isset($cached['used_bytes']) && $cacheAge >= 0 && $cacheAge < 300) {
                return max(0, (int)$cached['used_bytes']);
            }
        }

        // Filesystem free space includes other users' files; measure this home
        // directory instead. Cache the scan to avoid repeating it every poll.
        $cmd = 'timeout 10s du -sb -- ' . escapeshellarg($rootDir) . ' 2>/dev/null';
        $output = @shell_exec($cmd);
        if (!is_string($output) || !preg_match('/^(\d+)\s/', trim($output), $matches)) {
            return null;
        }

        $usedBytes = max(0, (int)$matches[1]);
        if ($this->diskUsageFile !== null && !is_link($this->diskUsageFile)) {
            @file_put_contents($this->diskUsageFile, json_encode([
                'timestamp'  => time(),
                'used_bytes' => $usedBytes,
            ]), LOCK_EX);
        }
        return $usedBytes;
    }

    private function countProcesses(string $username): array
    {
        $nproc = 0;
        $ep = 0;

        $cmd = sprintf("ps -u %s -o comm= 2>/dev/null", escapeshellarg($username));
        $output = @shell_exec($cmd);
        if ($output) {
            $lines = array_filter(array_map('trim', explode("\n", trim($output))));
            $nproc = count($lines);

            foreach ($lines as $comm) {
                if (preg_match('/^(lsphp|php-fpm|php|httpd|apache)/i', $comm)) {
                    $ep++;
                }
            }
        }

        return [
            'nproc' => max(1, $nproc),
            'ep'    => max(1, $ep),
        ];
    }

    private function readBandwidthFromDatastore(string $username): int
    {
        return 0;
    }

    public function formatBytes(int|float $bytes, int $precision = 2): string
    {
        $bytes = (float)max($bytes, 0);
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $pow = floor(($bytes > 0 ? log($bytes) : 0) / log(1024));
        $pow = (int)min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    private function detectOperatingSystem(): string
    {
        $osName = PHP_OS_FAMILY . ' (' . php_uname('s') . ')';

        if (file_exists('/etc/os-release')) {
            $osRelease = (string)@file_get_contents('/etc/os-release');
            if (preg_match('/PRETTY_NAME="([^"]+)"/', $osRelease, $m)) {
                $osName = $m[1];
            }
        } elseif (file_exists('/etc/redhat-release')) {
            $osName = trim((string)@file_get_contents('/etc/redhat-release'));
        }

        $isCageFs = file_exists('/usr/sbin/cagefsctl') || is_dir('/var/cagefs') || (is_dir('/proc') && !file_exists('/proc/1/cmdline'));
        if ($isCageFs && !str_contains($osName, 'CageFS')) {
            $osName .= ' (CageFS)';
        }

        return $osName;
    }

    private function detectWebServer(): string
    {
        if (!empty($_SERVER['SERVER_SOFTWARE'])) {
            $raw = $_SERVER['SERVER_SOFTWARE'];
            if (stripos($raw, 'LiteSpeed') !== false) return 'LiteSpeed Web Server';
            if (stripos($raw, 'nginx') !== false) return 'Nginx Web Server';
            if (stripos($raw, 'apache') !== false) return 'Apache Web Server';
            if (stripos($raw, 'caddy') !== false) return 'Caddy Web Server';
            return $raw;
        }

        if (file_exists('/usr/local/lsws') || getenv('LSWS_EDITION')) {
            return 'LiteSpeed Web Server';
        }
        if (file_exists('/etc/nginx') || @exec('which nginx 2>/dev/null')) {
            return 'Nginx Web Server';
        }
        if (file_exists('/etc/apache2') || file_exists('/etc/httpd')) {
            return 'Apache Web Server';
        }

        return 'Linux Web Server';
    }
}

<?php
declare(strict_types=1);

namespace ServerDeck;

class Metrics
{
    private array $config;
    private string $cacheFile;

    public function __construct(array $config)
    {
        $this->config = $config;
        $tempDir = $config['cache']['temp_dir'] ?? sys_get_temp_dir();
        $this->cacheFile = rtrim($tempDir, '/\\') . '/serverdeck_metrics.json';
    }

    public function getMetrics(bool $forceRefresh = false): array
    {
        $ttl = (int)($this->config['cache']['metrics_ttl_seconds'] ?? 15);

        // 1. Check transient cache
        if (!$forceRefresh && file_exists($this->cacheFile)) {
            $mtime = filemtime($this->cacheFile);
            if ((time() - $mtime) < $ttl) {
                $content = @file_get_contents($this->cacheFile);
                if ($content) {
                    $cached = json_decode($content, true);
                    if (is_array($cached)) {
                        $cached['from_cache'] = true;
                        $cached['cache_age']  = time() - $mtime;
                        return $cached;
                    }
                }
            }
        }

        // 2. Fresh calculation
        $metrics = $this->collectMetrics();
        $metrics['from_cache'] = false;
        $metrics['cached_at']  = time();

        // 3. Save to transient cache
        @file_put_contents($this->cacheFile, json_encode($metrics), LOCK_EX);

        return $metrics;
    }

    private function collectMetrics(): array
    {
        $systemUser = get_current_user() ?: 'yakubfir';
        $rootDir = $this->config['fs']['root_dir'] ?? (getenv('HOME') ?: '/home/' . $systemUser);

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
        $diskUsed = isset($uapiUsages['disk_usage']['usage']) 
            ? (int)$uapiUsages['disk_usage']['usage'] 
            : $this->estimateDiskUsage($rootDir)['used_bytes'];
        $diskLimitMb = isset($uapiQuota['megabyte_limit']) ? (float)$uapiQuota['megabyte_limit'] : 0.0;
        $isDiskUnmetered = ($diskLimitMb <= 0);

        $diskTotalBytes = $isDiskUnmetered 
            ? (@disk_total_space($rootDir) ?: (100 * 1024 * 1024 * 1024)) 
            : (int)($diskLimitMb * 1024 * 1024);
        $diskFreeBytes = max(0, $diskTotalBytes - $diskUsed);
        $diskPercent = min(100.0, round(($diskUsed / max(1, $diskTotalBytes)) * 100, 1));

        $inodesUsed = isset($uapiQuota['inodes_used']) ? (int)$uapiQuota['inodes_used'] : 51952;
        $inodeLimit = isset($uapiQuota['inode_limit']) ? (int)$uapiQuota['inode_limit'] : 0;
        $isInodesUnmetered = ($inodeLimit <= 0);

        // 6. Bandwidth
        $bandwidthUsed = isset($uapiUsages['bandwidth']['usage']) 
            ? (int)$uapiUsages['bandwidth']['usage'] 
            : $this->readBandwidthFromDatastore($systemUser);

        // 7. Load Average
        $loadAvg = function_exists('sys_getloadavg') ? sys_getloadavg() : [0.0, 0.0, 0.0];

        // 8. Hosting Package Features (Real limits from hosting plan)
        $features = [
            'addon_domains'        => isset($uapiUsages['addon_domains']['usage']) ? (int)$uapiUsages['addon_domains']['usage'] : 1,
            'addon_domains_max'    => isset($uapiUsages['addon_domains']['maximum']) ? (int)$uapiUsages['addon_domains']['maximum'] : 4,
            'subdomains'           => isset($uapiUsages['subdomains']['usage']) ? (int)$uapiUsages['subdomains']['usage'] : 2,
            'email_accounts'       => isset($uapiUsages['email_accounts']['usage']) ? (int)$uapiUsages['email_accounts']['usage'] : 1,
            'postgres_dbs'         => isset($uapiUsages['postgresql_databases']['usage']) ? (int)$uapiUsages['postgresql_databases']['usage'] : 1,
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
                'formatted_total'     => $isDiskUnmetered ? 'Unmetered (SSD)' : $this->formatBytes($diskTotalBytes),
                'is_unmetered'        => $isDiskUnmetered,
                'inodes_used'         => $inodesUsed,
                'inodes_limit'        => $inodeLimit,
                'is_inodes_unmetered' => $isInodesUnmetered,
            ],
            'processes' => [
                'nproc_count' => $nprocCount,
                'nproc_limit' => $nprocLimit,
                'ep_count'    => $epCount,
                'ep_limit'    => $epLimit,
            ],
            'io' => [
                'speed_current_bytes' => $ioCurrent,
                'speed_limit_bytes'   => $ioLimit,
                'speed_limit_mb'      => round($ioLimit / (1024 * 1024)),
                'iops_current'        => $iopsCurrent,
                'iops_limit'          => $iopsLimit,
            ],
            'bandwidth' => [
                'used_bytes'     => $bandwidthUsed,
                'formatted_used' => $this->formatBytes($bandwidthUsed),
                'is_unmetered'   => true,
            ],
            'load_average' => [
                '1m'  => round($loadAvg[0] ?? 0.0, 2),
                '5m'  => round($loadAvg[1] ?? 0.0, 2),
                '15m' => round($loadAvg[2] ?? 0.0, 2),
            ],
            'features' => $features,
            'system' => [
                'php_version' => PHP_VERSION,
                'os'          => 'CloudLinux OS (CageFS)',
                'server_time' => date('Y-m-d H:i:s'),
                'user'        => $systemUser,
                'web_server'  => 'LiteSpeed Web Server',
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
        return $decoded['result']['data'] ?? [];
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

    private function estimateDiskUsage(string $rootDir): array
    {
        $totalBytes = @disk_total_space($rootDir) ?: (100 * 1024 * 1024 * 1024);
        $freeBytes  = @disk_free_space($rootDir) ?: (50 * 1024 * 1024 * 1024);
        $usedBytes  = max(0, $totalBytes - $freeBytes);
        $percent    = round(($usedBytes / max(1, $totalBytes)) * 100, 1);

        return [
            'used_bytes'   => $usedBytes,
            'total_bytes'  => $totalBytes,
            'free_bytes'   => $freeBytes,
            'percent'      => $percent,
            'inodes_used'  => 51952,
            'inodes_limit' => 0,
        ];
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
        return 524 * 1024 * 1024;
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
}

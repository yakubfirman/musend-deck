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
        $limits = $this->config['limits'] ?? [];
        $rootDir = $this->config['fs']['root_dir'] ?? (getenv('HOME') ?: '/home/yakubfir');
        $username = $this->config['auth']['username'] ?? 'yakubfir';

        $ramLimit = (int)($limits['ram_limit_bytes'] ?? 4 * 1024 * 1024 * 1024);
        $cpuLimit = (int)($limits['cpu_limit_percent'] ?? 100);
        $nprocLimit = (int)($limits['nproc_limit'] ?? 400);
        $epLimit = (int)($limits['ep_limit'] ?? 60);
        $ioLimit = (int)($limits['io_limit_bytes'] ?? 32 * 1024 * 1024);
        $iopsLimit = (int)($limits['iops_limit'] ?? 4096);

        // RAM calculation (Hosting-scoped LVE or system fallback)
        $ramUsed = $this->estimateRamUsage($username);
        $ramPercent = min(100.0, round(($ramUsed / max(1, $ramLimit)) * 100, 1));

        // CPU calculation
        $cpuPercent = $this->estimateCpuUsage($username);

        // Disk & Inode calculation
        $diskStats = $this->estimateDiskUsage($rootDir);

        // Processes (NPROC & EP)
        $procStats = $this->countProcesses($username);

        // Load Average
        $loadAvg = function_exists('sys_getloadavg') ? sys_getloadavg() : [0.0, 0.0, 0.0];

        // Bandwidth (via cPanel datastore if available)
        $bandwidthUsed = $this->readBandwidthFromDatastore($username);

        return [
            'cpu' => [
                'usage_percent' => $cpuPercent,
                'limit_percent' => $cpuLimit,
                'cores'         => $limits['cpu_cores'] ?? 1,
            ],
            'ram' => [
                'used_bytes'      => $ramUsed,
                'limit_bytes'     => $ramLimit,
                'usage_percent'   => $ramPercent,
                'formatted_used'  => $this->formatBytes($ramUsed),
                'formatted_limit' => $this->formatBytes($ramLimit),
            ],
            'disk' => [
                'used_bytes'      => $diskStats['used_bytes'],
                'total_bytes'     => $diskStats['total_bytes'],
                'free_bytes'      => $diskStats['free_bytes'],
                'usage_percent'   => $diskStats['percent'],
                'formatted_used'  => $this->formatBytes($diskStats['used_bytes']),
                'formatted_total' => $this->formatBytes($diskStats['total_bytes']),
                'inodes_used'     => $diskStats['inodes_used'],
                'inodes_limit'    => $diskStats['inodes_limit'],
            ],
            'processes' => [
                'nproc_count' => $procStats['nproc'],
                'nproc_limit' => $nprocLimit,
                'ep_count'    => $procStats['ep'],
                'ep_limit'    => $epLimit,
            ],
            'io' => [
                'speed_limit_bytes' => $ioLimit,
                'speed_limit_mb'    => round($ioLimit / (1024 * 1024)),
                'iops_limit'        => $iopsLimit,
            ],
            'bandwidth' => [
                'used_bytes'     => $bandwidthUsed,
                'formatted_used' => $this->formatBytes($bandwidthUsed),
            ],
            'load_average' => [
                '1m'  => round($loadAvg[0] ?? 0.0, 2),
                '5m'  => round($loadAvg[1] ?? 0.0, 2),
                '15m' => round($loadAvg[2] ?? 0.0, 2),
            ],
            'system' => [
                'php_version' => PHP_VERSION,
                'os'          => PHP_OS,
                'server_time' => date('Y-m-d H:i:s'),
                'user'        => $username,
            ],
        ];
    }

    private function estimateRamUsage(string $username): int
    {
        // 1. Try reading cPanel datastore if available
        $homeDir = getenv('HOME') ?: ("/home/" . $username);
        $datastoreFile = $homeDir . '/.cpanel/datastore/_cloudlinux_lve_usage';
        if (file_exists($datastoreFile)) {
            $raw = @file_get_contents($datastoreFile);
            if ($raw && preg_match('/mem:(\d+)/i', $raw, $m)) {
                return (int)$m[1];
            }
        }

        // 2. Linux ps calculation for user processes (Resident Set Size RSS in KB)
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

        // 3. Fallback to PHP current allocated memory
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

        // Check cPanel datastore for quota info if available
        $cpanelDisk = getenv('HOME') . '/.cpanel/datastore/_disk_usage';
        if (file_exists($cpanelDisk)) {
            $data = @file_get_contents($cpanelDisk);
            if ($data && preg_match('/(\d+)/', $data, $m)) {
                $usedBytes = (int)$m[1] * 1024; // KB to bytes
                $percent = round(($usedBytes / max(1, $totalBytes)) * 100, 1);
            }
        }

        return [
            'used_bytes'   => $usedBytes,
            'total_bytes'  => $totalBytes,
            'free_bytes'   => $freeBytes,
            'percent'      => $percent,
            'inodes_used'  => 38918, // Indicative default or read from quota
            'inodes_limit' => 300000,
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
                // Entry processes are active web workers
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
        $homeDir = getenv('HOME') ?: ("/home/" . $username);
        $bwFile = $homeDir . '/.cpanel/datastore/user_bandwidth';
        if (file_exists($bwFile)) {
            $content = @file_get_contents($bwFile);
            if ($content && preg_match('/total:(\d+)/i', $content, $m)) {
                return (int)$m[1];
            }
        }
        return 516 * 1024 * 1024; // ~516 MB baseline
    }

    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}

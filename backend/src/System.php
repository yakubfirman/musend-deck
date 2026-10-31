<?php
declare(strict_types=1);

namespace ServerDeck;

class System
{
    private array $config;
    private string $rootDir;
    private string $username;

    public function __construct(array $config)
    {
        $this->config = $config;
        // system_user = Linux OS user (e.g. cpanel user), username = panel login
        $this->username = $config['auth']['system_user']
            ?? $config['auth']['username']
            ?? (posix_getpwuid(posix_getuid())['name'] ?? get_current_user() ?? getenv('USER') ?: 'user');
        $rawRoot = $config['fs']['root_dir'] ?? (getenv('HOME') ?: ('/home/' . $this->username));
        $this->rootDir = realpath($rawRoot) ?: $rawRoot;
    }

    public function listProcesses(): array
    {
        $cmd = sprintf(
            "ps -u %s -o pid,ppid,%%cpu,%%mem,time,comm,args --sort=-%%cpu 2>/dev/null",
            escapeshellarg($this->username)
        );

        $output = @shell_exec($cmd);
        if ($output === null) {
            return [
                'success' => true,
                'data'    => [],
                'count'   => 0,
            ];
        }

        $lines = explode("\n", trim($output));
        if (count($lines) <= 1) {
            return [
                'success' => true,
                'data'    => [],
                'count'   => 0,
            ];
        }

        // Drop header line
        array_shift($lines);

        $processes = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') continue;

            $parts = preg_split('/\s+/', $line, 7);
            if (count($parts) >= 6) {
                $processes[] = [
                    'pid'     => (int)$parts[0],
                    'ppid'    => (int)$parts[1],
                    'cpu'     => (float)$parts[2],
                    'mem'     => (float)$parts[3],
                    'time'    => $parts[4],
                    'comm'    => $parts[5],
                    'args'    => $parts[6] ?? $parts[5],
                ];
            }
        }

        return [
            'success' => true,
            'data'    => $processes,
            'count'   => count($processes),
        ];
    }

    public function killProcess(int $pid, int $signal = 15): array
    {
        if ($pid <= 1) {
            return [
                'success' => false,
                'error'   => 'PID sistem tidak valid.',
                'code'    => 400,
            ];
        }

        // Strict ownership check: ensure PID is owned by the current user
        $checkCmd = sprintf("ps -u %s -o pid= 2>/dev/null", escapeshellarg($this->username));
        $userPidsRaw = @shell_exec($checkCmd);
        $userPids = array_map('intval', array_filter(array_map('trim', explode("\n", (string)$userPidsRaw))));

        if (!in_array($pid, $userPids, true)) {
            return [
                'success' => false,
                'error'   => 'Proses tidak ditemukan atau bukan milik akun Anda.',
                'code'    => 403,
            ];
        }

        $sig = ($signal === 9) ? 9 : 15; // Only allow SIGTERM (15) or SIGKILL (9)
        $killCmd = sprintf("kill -%d %d 2>&1", $sig, $pid);
        $result = @shell_exec($killCmd);

        return [
            'success' => true,
            'message' => sprintf('Sinyal %d berhasil dikirim ke PID %d.', $sig, $pid),
            'output'  => trim((string)$result),
        ];
    }

    public function resolveCwd(string $cwd): string
    {
        $cwd = trim($cwd);
        if ($cwd === '' || $cwd === '~' || $cwd === '.') {
            return $this->rootDir;
        }

        if (str_starts_with($cwd, '~/')) {
            $cwd = $this->rootDir . '/' . substr($cwd, 2);
        } elseif (!str_starts_with($cwd, '/')) {
            $cwd = $this->rootDir . '/' . $cwd;
        }

        $real = realpath($cwd);
        if ($real !== false && is_dir($real)) {
            // Check within rootDir or equal to rootDir
            if ($real === $this->rootDir || str_starts_with($real, $this->rootDir . '/')) {
                return $real;
            }
        }

        return $this->rootDir;
    }

    public function runTerminal(string $command, string $cwdRel = ''): array
    {
        $command = trim($command);
        if ($command === '') {
            return [
                'success' => false,
                'error'   => 'Perintah tidak boleh kosong.',
                'code'    => 400,
            ];
        }

        // Security: Disallow destructive root commands
        $banned = ['rm -rf /', 'sudo ', 'mkfs', 'dd if=', ':(){ :|:& };:'];
        foreach ($banned as $bad) {
            if (stripos($command, $bad) !== false) {
                return [
                    'success' => false,
                    'error'   => 'Perintah berbahaya diblokir oleh sistem keamanan.',
                    'code'    => 403,
                ];
            }
        }

        // Resolve starting working directory safely
        $startCwd = $this->resolveCwd($cwdRel);

        // Build bash script with working directory tracking and exit code preservation
        $delimiter = '___SERVERDECK_TERMINAL_V1___';
        $startCwdEscaped = escapeshellarg($startCwd);
        $rootDirEscaped  = escapeshellarg($this->rootDir);

        // Bash script: cd into start directory, execute command, capture exit code, print new pwd & exit code
        $script = sprintf(
            "cd %s 2>/dev/null || cd %s\n%s\n__SD_EC__=\$?\necho -n \"%s\$(pwd)%s\${__SD_EC__}\"",
            $startCwdEscaped,
            $rootDirEscaped,
            $command,
            $delimiter . 'CWD:',
            $delimiter . 'EC:'
        );

        // Set 15-second timeout to avoid holding EP slot
        $descriptors = [
            0 => ['pipe', 'r'], // stdin
            1 => ['pipe', 'w'], // stdout
            2 => ['pipe', 'w'], // stderr
        ];

        $process = proc_open(['bash', '-c', $script], $descriptors, $pipes, $startCwd);
        if (!is_resource($process)) {
            return [
                'success' => false,
                'error'   => 'Gagal mengeksekusi perintah terminal.',
                'code'    => 500,
            ];
        }

        fclose($pipes[0]);

        // Non-blocking reads with 15s deadline
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $startTime = time();
        $stdout = '';
        $stderr = '';
        $timeoutSeconds = 15;
        $timedOut = false;

        while (true) {
            $stdout .= stream_get_contents($pipes[1]);
            $stderr .= stream_get_contents($pipes[2]);

            $status = proc_get_status($process);
            if (!$status['running']) {
                break;
            }

            if ((time() - $startTime) >= $timeoutSeconds) {
                $timedOut = true;
                proc_terminate($process, 9);
                break;
            }

            usleep(25000); // 25ms interval
        }

        $stdout .= stream_get_contents($pipes[1]);
        $stderr .= stream_get_contents($pipes[2]);

        fclose($pipes[1]);
        fclose($pipes[2]);
        $procExitCode = proc_close($process);

        if ($timedOut) {
            $relCwd = ($startCwd === $this->rootDir) ? '' : substr($startCwd, strlen($this->rootDir) + 1);
            return [
                'success'   => false,
                'error'     => sprintf('Eksekusi perintah dihentikan karena melebihi batas waktu (%d detik).', $timeoutSeconds),
                'output'    => $stdout,
                'cwd'       => $relCwd,
                'cwd_full'  => $startCwd,
                'code'      => 408,
            ];
        }

        // Parse delimiter from stdout
        $regex = '#' . preg_quote($delimiter, '#') . 'CWD:(.*?)' . preg_quote($delimiter, '#') . 'EC:(\d+)$#s';
        $finalCwd = $startCwd;
        $exitCode = $procExitCode;
        $cleanStdout = $stdout;

        if (preg_match($regex, $stdout, $matches)) {
            $cleanStdout = substr($stdout, 0, -strlen($matches[0]));
            $reportedCwd = trim($matches[1]);
            $exitCode = (int)$matches[2];

            // Verify cage jail boundary
            $realReported = realpath($reportedCwd);
            if ($realReported !== false && ($realReported === $this->rootDir || str_starts_with($realReported, $this->rootDir . '/'))) {
                $finalCwd = $realReported;
            } else {
                // Clamped to root directory if user navigated outside
                $finalCwd = $this->rootDir;
            }
        }

        $relCwd = ($finalCwd === $this->rootDir) ? '' : substr($finalCwd, strlen($this->rootDir) + 1);

        $output = '';
        if ($cleanStdout !== '' && $stderr !== '') {
            $output = rtrim($cleanStdout) . "\n" . trim($stderr);
        } elseif ($cleanStdout !== '') {
            $output = $cleanStdout;
        } else {
            $output = $stderr;
        }

        return [
            'success'   => true,
            'command'   => $command,
            'cwd'       => $relCwd,
            'cwd_full'  => $finalCwd,
            'output'    => $output,
            'stdout'    => $cleanStdout,
            'stderr'    => $stderr,
            'exit_code' => $exitCode,
        ];
    }

    public function completeTerminal(string $line, string $cwdRel = ''): array
    {
        $startCwd = $this->resolveCwd($cwdRel);

        // Extract last word/token from line
        if (preg_match('/^(.*?)([\S]*)$/s', $line, $matches)) {
            $prefix = $matches[1];
            $token = $matches[2];
        } else {
            $prefix = '';
            $token = $line;
        }

        $trimmedPrefix = trim($prefix);
        $isCd = ($trimmedPrefix === 'cd' || str_ends_with($trimmedPrefix, ' cd') || str_starts_with($trimmedPrefix, 'cd '));
        $isFirstWord = ($prefix === '');

        $flag = $isCd ? '-d' : ($isFirstWord ? '-c' : '-f');

        // Handle tilde ~/
        $hasTilde = str_starts_with($token, '~/');
        $expandedToken = $token;
        if ($hasTilde) {
            $expandedToken = $this->rootDir . '/' . substr($token, 2);
        }

        $cmd = sprintf(
            "cd %s && compgen %s %s 2>/dev/null",
            escapeshellarg($startCwd),
            $flag,
            escapeshellarg($expandedToken)
        );

        $output = @shell_exec($cmd);
        $rawMatches = array_values(array_filter(explode("\n", trim((string)$output))));

        // If isFirstWord and no commands found, fallback to files/directories
        if ($isFirstWord && empty($rawMatches)) {
            $cmdFiles = sprintf(
                "cd %s && compgen -f %s 2>/dev/null",
                escapeshellarg($startCwd),
                escapeshellarg($expandedToken)
            );
            $outputFiles = @shell_exec($cmdFiles);
            $rawMatches = array_values(array_filter(explode("\n", trim((string)$outputFiles))));
        }

        $formattedMatches = [];
        $cleanedStrings = [];

        foreach ($rawMatches as $m) {
            $displayPath = $m;
            if ($hasTilde && str_starts_with($m, $this->rootDir . '/')) {
                $displayPath = '~/' . substr($m, strlen($this->rootDir) + 1);
            } elseif ($hasTilde && $m === $this->rootDir) {
                $displayPath = '~/';
            }

            // Determine if directory
            $fullCheck = $hasTilde
                ? ($this->rootDir . '/' . ltrim(substr($displayPath, 2), '/'))
                : ($startCwd . '/' . ltrim($m, '/'));
            $isDir = is_dir($fullCheck);

            $val = $displayPath . ($isDir && !str_ends_with($displayPath, '/') ? '/' : '');
            $formattedMatches[] = [
                'value'  => $val,
                'name'   => basename($displayPath) . ($isDir ? '/' : ''),
                'is_dir' => $isDir,
            ];
            $cleanedStrings[] = $val;
        }

        // Calculate common prefix among matches
        $commonPrefix = '';
        if (!empty($cleanedStrings)) {
            $commonPrefix = $cleanedStrings[0];
            foreach ($cleanedStrings as $str) {
                while (!str_starts_with($str, $commonPrefix)) {
                    $commonPrefix = substr($commonPrefix, 0, -1);
                    if ($commonPrefix === '') break;
                }
            }
        }

        $completedLine = $line;
        if (count($cleanedStrings) === 1) {
            $completedLine = $prefix . $cleanedStrings[0];
        } elseif ($commonPrefix !== '' && strlen($commonPrefix) > strlen($token)) {
            $completedLine = $prefix . $commonPrefix;
        }

        return [
            'success'        => true,
            'token'          => $token,
            'prefix'         => $prefix,
            'matches'        => array_slice($formattedMatches, 0, 50),
            'common_prefix'  => $commonPrefix,
            'completed_line' => $completedLine,
            'count'          => count($formattedMatches),
        ];
    }

    public function tailLog(string $type, int $lines = 100): array
    {
        $logPaths = $this->config['logs'][$type] ?? [];
        $targetFile = null;

        foreach ($logPaths as $path) {
            if (file_exists($path) && is_readable($path)) {
                $targetFile = $path;
                break;
            }
        }

        if ($targetFile === null) {
            return [
                'success' => true,
                'data'    => [
                    'type'       => $type,
                    'file'       => null,
                    'lines'      => [sprintf('[Notice] File log %s belum ditemukan atau belum dapat dibaca.', $type)],
                    'line_count' => 1,
                ],
            ];
        }

        $lineList = $this->reverseByteSeekTail($targetFile, min(500, max(10, $lines)));

        return [
            'success' => true,
            'data'    => [
                'type'       => $type,
                'file'       => basename($targetFile),
                'full_path'  => $targetFile,
                'lines'      => $lineList,
                'line_count' => count($lineList),
                'file_size'  => filesize($targetFile),
            ],
        ];
    }

    /**
     * Efficient reverse byte-seek tail.
     * Reads last N lines without loading the whole file into PHP memory.
     */
    private function reverseByteSeekTail(string $filepath, int $lines): array
    {
        $f = @fopen($filepath, 'rb');
        if (!$f) {
            return [];
        }

        $buffer = '';
        $chunkSize = 4096;
        fseek($f, 0, SEEK_END);
        $pos = ftell($f);
        $lineCount = 0;

        while ($pos > 0 && $lineCount <= $lines) {
            $readSize = min($chunkSize, $pos);
            $pos -= $readSize;
            fseek($f, $pos, SEEK_SET);
            $chunk = fread($f, $readSize);
            $buffer = $chunk . $buffer;
            $lineCount = substr_count($buffer, "\n");
        }
        fclose($f);

        $allLines = explode("\n", trim($buffer));
        if (count($allLines) > $lines) {
            $allLines = array_slice($allLines, -$lines);
        }

        return $allLines;
    }

    /**
     * Get Housekeeping status: inspect orphaned build assets & stale temp files
     */
    public function getHousekeepingStatus(): array
    {
        $monitorDir = dirname(__DIR__); // monitor root
        $indexHtml = $monitorDir . '/index.html';
        $assetsDir = $monitorDir . '/assets';

        $referencedFiles = [];
        if (file_exists($indexHtml)) {
            $content = (string)file_get_contents($indexHtml);
            preg_match_all('/assets\/([a-zA-Z0-9_\-\.]+)/', $content, $matches);
            $referencedFiles = array_unique($matches[1] ?? []);
        }

        $allAssets = glob($assetsDir . '/*') ?: [];
        $staleAssets = [];
        $staleBytes = 0;
        $activeBytes = 0;

        foreach ($allAssets as $file) {
            $base = basename($file);
            $size = filesize($file) ?: 0;
            if (!in_array($base, $referencedFiles, true)) {
                $staleAssets[] = [
                    'name'           => $base,
                    'size'           => $size,
                    'formatted_size' => $this->formatBytes($size),
                ];
                $staleBytes += $size;
            } else {
                $activeBytes += $size;
            }
        }

        // Check stale temporary files older than 24 hours
        $tmpDir = sys_get_temp_dir() ?: '/tmp';
        $tmpFiles = glob($tmpDir . '/serverdeck_*') ?: [];
        $staleTmpCount = 0;
        $staleTmpBytes = 0;
        $now = time();
        foreach ($tmpFiles as $tf) {
            if ($now - filemtime($tf) > 86400) {
                $staleTmpCount++;
                $staleTmpBytes += (filesize($tf) ?: 0);
            }
        }

        return [
            'success'              => true,
            'stale_assets'         => $staleAssets,
            'stale_assets_count'   => count($staleAssets),
            'stale_bytes'          => $staleBytes,
            'formatted_stale_size' => $this->formatBytes($staleBytes),
            'active_bytes'         => $activeBytes,
            'formatted_active_size'=> $this->formatBytes($activeBytes),
            'stale_tmp_count'      => $staleTmpCount,
            'stale_tmp_bytes'      => $staleTmpBytes,
        ];
    }

    /**
     * Run Housekeeping cleanup: remove orphaned assets & stale caches
     */
    public function runHousekeeping(): array
    {
        $status = $this->getHousekeepingStatus();
        $monitorDir = dirname(__DIR__);
        $assetsDir = $monitorDir . '/assets';
        $cleanedFiles = [];
        $freedBytes = 0;

        foreach ($status['stale_assets'] as $asset) {
            $path = $assetsDir . '/' . $asset['name'];
            if (file_exists($path)) {
                $freedBytes += (filesize($path) ?: 0);
                @unlink($path);
                $cleanedFiles[] = $asset['name'];
            }
        }

        // Clean stale temporary files older than 24 hours
        $tmpDir = sys_get_temp_dir() ?: '/tmp';
        $tmpFiles = glob($tmpDir . '/serverdeck_*') ?: [];
        $now = time();
        foreach ($tmpFiles as $tf) {
            if ($now - filemtime($tf) > 86400) {
                $freedBytes += (filesize($tf) ?: 0);
                @unlink($tf);
            }
        }

        return [
            'success'         => true,
            'message'         => count($cleanedFiles) > 0
                ? sprintf("Berhasil membersihkan %d file aset lama dan membebaskan %s ruang disk.", count($cleanedFiles), $this->formatBytes($freedBytes))
                : "Semua aset sudah bersih dan optimal. Tidak ada file sampah.",
            'cleaned_count'   => count($cleanedFiles),
            'freed_bytes'     => $freedBytes,
            'formatted_freed' => $this->formatBytes($freedBytes),
            'cleaned_files'   => $cleanedFiles,
        ];
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes <= 0) return '0 B';
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = (int)floor(log($bytes, 1024));
        $val = $bytes / pow(1024, $i);
        return round($val, 2) . ' ' . ($units[$i] ?? 'B');
    }
}

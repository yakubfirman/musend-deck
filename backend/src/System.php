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
        // system_user = Linux OS user (yakubfir), username = panel login (musend)
        $this->username = $config['auth']['system_user']
            ?? $config['auth']['username']
            ?? (posix_getpwuid(posix_getuid())['name'] ?? get_current_user() ?? 'yakubfir');
        $rawRoot = $config['fs']['root_dir'] ?? (getenv('HOME') ?: '/home/yakubfir');
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

        // Resolve CWD
        $cwd = $this->rootDir;
        if ($cwdRel !== '') {
            $candidate = realpath($this->rootDir . '/' . ltrim($cwdRel, '/'));
            if ($candidate && str_starts_with($candidate, $this->rootDir)) {
                $cwd = $candidate;
            }
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

        // Set 10-second timeout to avoid holding EP slot
        $descriptors = [
            0 => ['pipe', 'r'], // stdin
            1 => ['pipe', 'w'], // stdout
            2 => ['pipe', 'w'], // stderr
        ];

        $process = proc_open($command, $descriptors, $pipes, $cwd, null);
        if (!is_resource($process)) {
            return [
                'success' => false,
                'error'   => 'Gagal mengeksekusi perintah terminal.',
                'code'    => 500,
            ];
        }

        fclose($pipes[0]);

        // Non-blocking reads with 10s deadline
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $startTime = time();
        $stdout = '';
        $stderr = '';
        $timeoutSeconds = 10;
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

            usleep(50000); // 50ms interval
        }

        $stdout .= stream_get_contents($pipes[1]);
        $stderr .= stream_get_contents($pipes[2]);

        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        if ($timedOut) {
            return [
                'success' => false,
                'error'   => sprintf('Eksekusi perintah dihentikan karena melebihi batas waktu (%d detik).', $timeoutSeconds),
                'output'  => $stdout,
                'code'    => 408,
            ];
        }

        return [
            'success'   => true,
            'command'   => $command,
            'cwd'       => $cwd,
            'output'    => $stdout !== '' ? $stdout : $stderr,
            'exit_code' => $exitCode,
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
}

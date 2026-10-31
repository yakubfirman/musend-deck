<?php
declare(strict_types=1);

namespace ServerDeck;

class CronManager
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * Read and parse current user crontab
     */
    public function listJobs(): array
    {
        $output = [];
        @exec('crontab -l 2>/dev/null', $output, $code);

        $jobs = [];
        $lastComment = '';

        foreach ($output as $idx => $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                $lastComment = '';
                continue;
            }

            // Comment line
            if (str_starts_with($trimmed, '#')) {
                // Check if this is a disabled cron job: "# * * * * cmd"
                $uncommented = trim(substr($trimmed, 1));
                if ($this->isCronLine($uncommented)) {
                    $parsed = $this->parseCronLine($uncommented);
                    $jobs[] = array_merge($parsed, [
                        'line_index'   => $idx,
                        'enabled'      => false,
                        'comment'      => $lastComment ?: 'Dinonaktifkan',
                        'raw'          => $trimmed,
                    ]);
                    $lastComment = '';
                    continue;
                }
                $lastComment = $trimmed;
                continue;
            }

            if ($this->isCronLine($trimmed)) {
                $parsed = $this->parseCronLine($trimmed);
                $jobs[] = array_merge($parsed, [
                    'line_index'   => $idx,
                    'enabled'      => true,
                    'comment'      => $lastComment,
                    'raw'          => $trimmed,
                ]);
                $lastComment = '';
            }
        }

        return [
            'success' => true,
            'jobs'    => $jobs,
            'count'   => count($jobs),
        ];
    }

    /**
     * Add a new cron job
     */
    public function addJob(string $expression, string $command, string $comment = ''): array
    {
        $expression = trim($expression);
        $command = trim($command);
        $comment = trim($comment);

        if (!$this->isCronExpression($expression)) {
            return [
                'success' => false,
                'error'   => 'Format ekspresi cron tidak valid (harus 5 komponen waktu: menit jam hari bulan hari_minggu).',
                'code'    => 400,
            ];
        }

        if (empty($command)) {
            return [
                'success' => false,
                'error'   => 'Perintah (command) tidak boleh kosong.',
                'code'    => 400,
            ];
        }

        $lines = $this->readRawCrontab();

        if (!empty($comment)) {
            $lines[] = "# " . str_replace(["\r", "\n"], ' ', $comment);
        }
        $lines[] = "{$expression} {$command}";

        return $this->saveRawCrontab($lines);
    }

    /**
     * Toggle cron job enabled/disabled
     */
    public function toggleJob(int $jobIndex): array
    {
        $list = $this->listJobs();
        $jobs = $list['jobs'] ?? [];

        if (!isset($jobs[$jobIndex])) {
            return [
                'success' => false,
                'error'   => 'Cron job index tidak ditemukan.',
                'code'    => 404,
            ];
        }

        $job = $jobs[$jobIndex];
        $rawLines = $this->readRawCrontab();
        $targetLineIdx = $job['line_index'];

        if (!isset($rawLines[$targetLineIdx])) {
            return [
                'success' => false,
                'error'   => 'Baris crontab tidak sesuai.',
                'code'    => 500,
            ];
        }

        if ($job['enabled']) {
            // Disable: prepend "# "
            $rawLines[$targetLineIdx] = "# " . $job['expression'] . " " . $job['command'];
        } else {
            // Enable: remove leading "# "
            $rawLines[$targetLineIdx] = $job['expression'] . " " . $job['command'];
        }

        return $this->saveRawCrontab($rawLines);
    }

    /**
     * Delete cron job
     */
    public function deleteJob(int $jobIndex): array
    {
        $list = $this->listJobs();
        $jobs = $list['jobs'] ?? [];

        if (!isset($jobs[$jobIndex])) {
            return [
                'success' => false,
                'error'   => 'Cron job index tidak ditemukan.',
                'code'    => 404,
            ];
        }

        $job = $jobs[$jobIndex];
        $rawLines = $this->readRawCrontab();
        $targetLineIdx = $job['line_index'];

        // Also remove preceding comment if it matches
        if ($targetLineIdx > 0 && isset($rawLines[$targetLineIdx - 1]) && str_starts_with(trim($rawLines[$targetLineIdx - 1]), '#')) {
            unset($rawLines[$targetLineIdx - 1]);
        }
        unset($rawLines[$targetLineIdx]);

        return $this->saveRawCrontab(array_values($rawLines));
    }

    /**
     * Test run a cron job command immediately
     */
    public function testRun(string $command): array
    {
        $command = trim($command);
        if (empty($command)) {
            return ['success' => false, 'error' => 'Perintah kosong.'];
        }

        $start = microtime(true);
        $fullCmd = "bash -c " . escapeshellarg($command . " 2>&1");
        $output = [];
        $exitCode = 0;
        @exec($fullCmd, $output, $exitCode);
        $durationMs = (int)round((microtime(true) - $start) * 1000);

        return [
            'success'     => true,
            'exit_code'   => $exitCode,
            'duration_ms' => $durationMs,
            'output'      => implode("\n", $output),
            'command'     => $command,
        ];
    }

    private function readRawCrontab(): array
    {
        $output = [];
        @exec('crontab -l 2>/dev/null', $output);
        return $output;
    }

    private function saveRawCrontab(array $lines): array
    {
        $content = implode("\n", array_map('trim', $lines)) . "\n";
        $tmpFile = tempnam(sys_get_temp_dir(), 'cron_');
        file_put_contents($tmpFile, $content);

        @exec("crontab " . escapeshellarg($tmpFile) . " 2>&1", $out, $code);
        @unlink($tmpFile);

        if ($code === 0) {
            return [
                'success' => true,
                'message' => 'Crontab berhasil diperbarui.',
            ];
        }

        return [
            'success' => false,
            'error'   => 'Gagal memperbarui crontab: ' . implode(' ', $out),
            'code'    => 500,
        ];
    }

    private function isCronLine(string $line): bool
    {
        $parts = preg_split('/\s+/', trim($line));
        return count($parts) >= 6 && $this->isCronExpression(implode(' ', array_slice($parts, 0, 5)));
    }

    private function isCronExpression(string $expr): bool
    {
        $parts = preg_split('/\s+/', trim($expr));
        if (count($parts) !== 5) {
            return false;
        }

        // Each part can be *, digits, comma, hyphen, slash
        $pattern = '/^[\d*\/,-]+$/';
        foreach ($parts as $p) {
            if (!preg_match($pattern, $p)) {
                return false;
            }
        }
        return true;
    }

    private function parseCronLine(string $line): array
    {
        $parts = preg_split('/\s+/', trim($line), 6);
        $expression = implode(' ', array_slice($parts, 0, 5));
        $command = $parts[5] ?? '';

        return [
            'expression'  => $expression,
            'command'     => $command,
            'human'       => $this->translateCronToIndonesian($expression),
        ];
    }

    private function translateCronToIndonesian(string $expr): string
    {
        $p = preg_split('/\s+/', trim($expr));
        if (count($p) !== 5) return $expr;

        [$min, $hour, $dom, $mon, $dow] = $p;

        if ($expr === '* * * * *') return 'Setiap menit';
        if ($expr === '*/5 * * * *') return 'Setiap 5 menit';
        if ($expr === '*/10 * * * *') return 'Setiap 10 menit';
        if ($expr === '*/15 * * * *') return 'Setiap 15 menit';
        if ($expr === '*/30 * * * *') return 'Setiap 30 menit';
        if ($expr === '0 * * * *') return 'Setiap jam (menit 00)';
        if ($expr === '0 0 * * *') return 'Setiap hari tengah malam (00:00)';
        if ($expr === '0 12 * * *') return 'Setiap hari siang (12:00)';
        if ($expr === '0 0 * * 0') return 'Setiap hari Minggu (00:00)';
        if ($expr === '0 0 1 * *') return 'Hari pertama setiap bulan (00:00)';

        // General description
        $desc = '';
        if (str_starts_with($min, '*/')) {
            $desc .= 'Setiap ' . substr($min, 2) . ' menit';
        } elseif ($min === '0') {
            $desc .= 'Pada menit 00';
        } else {
            $desc .= "Pada menit {$min}";
        }

        if ($hour !== '*') {
            $desc .= ", jam {$hour}:00";
        }
        if ($dow !== '*') {
            $days = ['0' => 'Minggu', '1' => 'Senin', '2' => 'Selasa', '3' => 'Rabu', '4' => 'Kamis', '5' => 'Jumat', '6' => 'Sabtu', '7' => 'Minggu'];
            $desc .= ", setiap hari " . ($days[$dow] ?? "ke-{$dow}");
        }

        return $desc ?: $expr;
    }
}

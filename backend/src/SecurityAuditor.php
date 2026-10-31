<?php
declare(strict_types=1);

namespace ServerDeck;

class SecurityAuditor
{
    private array $config;
    private string $homeDir;

    public function __construct(array $config)
    {
        $this->config = $config;
        $this->homeDir = rtrim(getenv('HOME') ?: ('/home/' . (posix_getpwuid(posix_getuid())['name'] ?? get_current_user() ?? getenv('USER') ?: 'user')), '/');
    }

    /**
     * Perform deep security audit
     */
    public function audit(): array
    {
        $findings = [];
        $score = 100;

        // 1. PHP Production Settings
        $displayErrors = (bool)ini_get('display_errors');
        if ($displayErrors) {
            $score -= 10;
            $findings[] = [
                'id'          => 'php_display_errors',
                'severity'    => 'medium',
                'title'       => 'PHP display_errors Aktif',
                'description' => 'Opsi display_errors aktif di PHP. Pesan error atau stack trace berpotensi terekspos ke publik.',
                'path'        => 'php.ini / .htaccess',
                'current'     => 'On',
                'recommended' => 'Off',
                'can_fix'     => true,
            ];
        } else {
            $findings[] = [
                'id'          => 'php_display_errors',
                'severity'    => 'good',
                'title'       => 'PHP display_errors Nonaktif',
                'description' => 'display_errors dimatikan dengan benar untuk lingkungan produksi.',
                'path'        => 'php.ini',
                'current'     => 'Off',
                'recommended' => 'Off',
                'can_fix'     => false,
            ];
        }

        // 2. Audit SSH Directory & Keys
        $sshDir = $this->homeDir . '/.ssh';
        if (is_dir($sshDir)) {
            $sshPerm = substr(sprintf('%o', fileperms($sshDir)), -4);
            if ($sshPerm !== '0700') {
                $score -= 10;
                $findings[] = [
                    'id'          => 'ssh_dir_perms',
                    'severity'    => 'high',
                    'title'       => 'Izin Folder .ssh Terlalu Terbuka',
                    'description' => "Folder .ssh memiliki izin {$sshPerm}. Seharusnya hanya pemilik yang dapat mengakses (0700).",
                    'path'        => $sshDir,
                    'current'     => $sshPerm,
                    'recommended' => '0700',
                    'can_fix'     => true,
                ];
            } else {
                $findings[] = [
                    'id'          => 'ssh_dir_perms',
                    'severity'    => 'good',
                    'title'       => 'Izin Folder .ssh Aman (0700)',
                    'description' => 'Folder .ssh terlindungi dengan hak akses privat.',
                    'path'        => $sshDir,
                    'current'     => '0700',
                    'recommended' => '0700',
                    'can_fix'     => false,
                ];
            }

            // Check private keys
            $privateKeys = glob($sshDir . '/id_*') ?: [];
            foreach ($privateKeys as $pk) {
                if (str_ends_with($pk, '.pub')) continue;
                $pkPerm = substr(sprintf('%o', fileperms($pk)), -4);
                if ($pkPerm !== '0600') {
                    $score -= 15;
                    $findings[] = [
                        'id'          => 'ssh_key_perms_' . basename($pk),
                        'severity'    => 'high',
                        'title'       => 'Izin Private Key SSH Tidak Aman',
                        'description' => "File private key " . basename($pk) . " memiliki izin {$pkPerm}. Seharusnya 0600.",
                        'path'        => $pk,
                        'current'     => $pkPerm,
                        'recommended' => '0600',
                        'can_fix'     => true,
                    ];
                }
            }
        }

        // 3. Scan Web Roots for World-Writable (0777) or Exposed Sensitive Files
        $webRoots = [
            $this->homeDir . '/public_html',
            $this->homeDir . '/musend.web.id',
        ];

        $insecurePermCount = 0;
        $insecurePaths = [];

        foreach ($webRoots as $root) {
            if (!is_dir($root)) continue;

            // Check for exposed .git directory inside web roots
            if (is_dir($root . '/.git')) {
                $score -= 20;
                $findings[] = [
                    'id'          => 'exposed_git_' . md5($root),
                    'severity'    => 'high',
                    'title'       => 'Folder .git Ditemukan di Web Root',
                    'description' => "Folder repository .git berada di direktori publik ({$root}). Metadata dan source code bisa diunduh jika tidak diproteksi oleh .htaccess.",
                    'path'        => $root . '/.git',
                    'current'     => 'Exposed',
                    'recommended' => 'Block via .htaccess atau pindahkan git ke luar web root',
                    'can_fix'     => true,
                ];
            }

            // Check for unshielded .env in public root
            if (file_exists($root . '/.env')) {
                $score -= 25;
                $findings[] = [
                    'id'          => 'exposed_env_' . md5($root),
                    'severity'    => 'high',
                    'title'       => 'File .env Berada Langsung di Web Root',
                    'description' => "File .env ditemukan di {$root}. Variabel lingkungan dan kata sandi berisiko diakses langsung dari browser.",
                    'path'        => $root . '/.env',
                    'current'     => 'Exposed',
                    'recommended' => 'Lindungi via .htaccess atau simpan di luar folder publik',
                    'can_fix'     => true,
                ];
            }

            // Fast find for 0777 in web roots
            $cmd = "find " . escapeshellarg($root) . " -maxdepth 3 -perm 0777 2>/dev/null | head -n 20";
            $writableItems = array_filter(explode("\n", (string)@shell_exec($cmd)));
            if (!empty($writableItems)) {
                $insecurePermCount += count($writableItems);
                $insecurePaths = array_merge($insecurePaths, $writableItems);
            }
        }

        if ($insecurePermCount > 0) {
            $deduction = min(30, $insecurePermCount * 5);
            $score -= $deduction;
            $findings[] = [
                'id'          => 'world_writable_files',
                'severity'    => 'high',
                'title'       => "Ditemukan {$insecurePermCount} File/Folder World-Writable (0777)",
                'description' => 'Izin 0777 memberikan hak tulis kepada seluruh pengguna server. Sangat berisiko terhadap penyisipan webshell atau malware.',
                'path'        => implode(', ', array_slice($insecurePaths, 0, 3)) . ($insecurePermCount > 3 ? '...' : ''),
                'current'     => '0777',
                'recommended' => '0755 (Folder) / 0644 (File)',
                'can_fix'     => true,
            ];
        } else {
            $findings[] = [
                'id'          => 'world_writable_files',
                'severity'    => 'good',
                'title'       => 'Tidak Ditemukan Izin 0777 di Web Root',
                'description' => 'Seluruh folder dan file web root memiliki izin terkontrol.',
                'path'        => 'public_html & musend.web.id',
                'current'     => '0755 / 0644',
                'recommended' => '0755 / 0644',
                'can_fix'     => false,
            ];
        }

        // 4. Audit .env files in projects/
        $projectEnvs = glob($this->homeDir . '/projects/*/.env') ?: [];
        foreach ($projectEnvs as $envPath) {
            $perm = substr(sprintf('%o', fileperms($envPath)), -4);
            if ($perm !== '0600' && $perm !== '0640') {
                $score -= 5;
                $findings[] = [
                    'id'          => 'env_perm_' . md5($envPath),
                    'severity'    => 'medium',
                    'title'       => 'Izin File Konfigurasi ' . basename(dirname($envPath)) . '/.env Terlalu Terbuka',
                    'description' => "File .env memiliki izin {$perm}. Disarankan diatur ke 0600 agar hanya user pemilik yang bisa membaca.",
                    'path'        => $envPath,
                    'current'     => $perm,
                    'recommended' => '0600',
                    'can_fix'     => true,
                ];
            }
        }

        // Calculate Grade
        $score = max(10, min(100, $score));
        $grade = 'A+';
        if ($score < 60) {
            $grade = 'D';
        } elseif ($score < 75) {
            $grade = 'C';
        } elseif ($score < 85) {
            $grade = 'B';
        } elseif ($score < 95) {
            $grade = 'A';
        }

        $summary = [
            'total'    => count($findings),
            'high'     => count(array_filter($findings, fn($f) => $f['severity'] === 'high')),
            'medium'   => count(array_filter($findings, fn($f) => $f['severity'] === 'medium')),
            'good'     => count(array_filter($findings, fn($f) => $f['severity'] === 'good')),
            'fixable'  => count(array_filter($findings, fn($f) => !empty($f['can_fix']))),
        ];

        return [
            'success'   => true,
            'score'     => $score,
            'grade'     => $grade,
            'summary'   => $summary,
            'findings'  => $findings,
            'timestamp' => time(),
        ];
    }

    /**
     * 1-Click Normalizer: Fix all permissions & strengthen security
     */
    public function fixPermissions(): array
    {
        $actions = [];

        // 1. Fix SSH permissions
        $sshDir = $this->homeDir . '/.ssh';
        if (is_dir($sshDir)) {
            @chmod($sshDir, 0700);
            $actions[] = "Normalisasi {$sshDir} ke 0700";

            $files = glob($sshDir . '/*') ?: [];
            foreach ($files as $f) {
                if (str_ends_with($f, '.pub')) {
                    @chmod($f, 0644);
                } else {
                    @chmod($f, 0600);
                }
            }
            $actions[] = "Normalisasi kunci SSH ke 0600";
        }

        // 2. Fix projects .env files to 0600
        $projectEnvs = glob($this->homeDir . '/projects/*/.env') ?: [];
        foreach ($projectEnvs as $env) {
            @chmod($env, 0600);
        }
        if (!empty($projectEnvs)) {
            $actions[] = "Mengamankan " . count($projectEnvs) . " file .env ke 0600";
        }

        // 3. Normalize public directories and files (remove 0777)
        $targets = [
            $this->homeDir . '/public_html',
            $this->homeDir . '/musend.web.id',
        ];

        foreach ($targets as $dir) {
            if (!is_dir($dir)) continue;

            // Fix directories to 0755
            @exec("find " . escapeshellarg($dir) . " -type d -perm 0777 -exec chmod 0755 {} + 2>/dev/null");
            // Fix files to 0644
            @exec("find " . escapeshellarg($dir) . " -type f -perm 0777 -exec chmod 0644 {} + 2>/dev/null");
            @exec("find " . escapeshellarg($dir) . " -type f -perm 0666 -exec chmod 0644 {} + 2>/dev/null");
            $actions[] = "Menormalkan folder ke 0755 dan file ke 0644 di " . basename($dir);

            // Ensure .htaccess blocks sensitive files
            $this->ensureHtaccessProtection($dir);
        }

        return [
            'success' => true,
            'message' => 'Normalisasi izin berhasil dijalankan sepenuhnya.',
            'actions' => $actions,
            'audit'   => $this->audit(),
        ];
    }

    /**
     * Ensure Apache .htaccess protects hidden files (.git, .env, etc.)
     */
    private function ensureHtaccessProtection(string $dir): void
    {
        $htaccess = $dir . '/.htaccess';
        $rulesMarker = "# --- SERVERDECK SECURITY RULES ---";
        $rulesBlock = "\n{$rulesMarker}\n" .
            "<FilesMatch \"^\\.(env|git|htaccess|htpasswd|ini|log|sh|sql)\">\n" .
            "    Require all denied\n" .
            "</FilesMatch>\n" .
            "Options -Indexes\n" .
            "# --- END SERVERDECK SECURITY RULES ---\n";

        if (file_exists($htaccess)) {
            $content = (string)file_get_contents($htaccess);
            if (!str_contains($content, $rulesMarker)) {
                @file_put_contents($htaccess, $content . $rulesBlock, FILE_APPEND | LOCK_EX);
            }
        } else {
            @file_put_contents($htaccess, $rulesBlock, LOCK_EX);
        }
    }
}

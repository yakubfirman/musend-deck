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
        $this->homeDir = PathGuard::homeDir();
    }

    /**
     * Perform deep security audit
     */
    public function audit(): array
    {
        $findings = [];
        $score = 100;

        $effectiveUid = function_exists('posix_geteuid') ? posix_geteuid() : null;
        if ($effectiveUid === 0) {
            $score -= 40;
            $findings[] = [
                'id'          => 'php_runs_as_root',
                'severity'    => 'high',
                'title'       => 'PHP Berjalan sebagai root',
                'description' => 'Terminal dan operasi backend mewarisi hak root. Jalankan PHP-FPM/web server sebagai akun Linux non-root sebelum menggunakan panel.',
                'path'        => 'PHP process user',
                'current'     => 'root (UID 0)',
                'recommended' => 'Akun Linux khusus non-root',
                'can_fix'     => false,
            ];
        }

        $findings[] = [
            'id'          => 'terminal_os_scope',
            'severity'    => 'info',
            'title'       => 'Terminal berjalan dengan hak akun Linux aplikasi',
            'description' => 'Direktori awal mengikuti root file manager, tetapi shell dapat mengakses semua hal yang diizinkan untuk akun OS PHP. Gunakan akun Linux khusus dan batasi akses jaringan panel.',
            'path'        => 'terminal/run',
            'current'     => 'Akun OS PHP',
            'recommended' => 'Akun OS terisolasi',
            'can_fix'     => false,
        ];

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
                'can_fix'     => false,
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
        if (is_dir($sshDir) && !is_link($sshDir)) {
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
                if (str_ends_with($pk, '.pub') || is_link($pk) || !is_file($pk)) continue;
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

        // 3. Scan Web Roots for world-writable files and exposed sensitive files.
        $webRoots = $this->getWebRoots();
        $isNginx = stripos((string)($_SERVER['SERVER_SOFTWARE'] ?? ''), 'nginx') !== false;

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
                    'description' => "Folder repository .git berada di direktori publik ({$root}). Metadata dan source code dapat diunduh jika aturan web server tidak memblokirnya.",
                    'path'        => $root . '/.git',
                    'current'     => 'Exposed',
                    'recommended' => $isNginx ? 'Block pada konfigurasi Nginx atau pindahkan git ke luar web root' : 'Block via .htaccess atau pindahkan git ke luar web root',
                    'can_fix'     => !$isNginx,
                ];
            }

            // Check for unshielded .env in public root
            if (file_exists($root . '/.env')) {
                $score -= 25;
                $findings[] = [
                    'id'          => 'exposed_env_' . md5($root),
                    'severity'    => 'high',
                    'title'       => 'File .env Berada Langsung di Web Root',
                    'description' => "File .env ditemukan di {$root}. Pastikan aturan web server memblokir akses langsung ke file tersebut.",
                    'path'        => $root . '/.env',
                    'current'     => 'Exposed',
                    'recommended' => $isNginx ? 'Block pada konfigurasi Nginx atau simpan di luar folder publik' : 'Lindungi via .htaccess atau simpan di luar folder publik',
                    'can_fix'     => !$isNginx,
                ];
            }

            if ($isNginx) {
                $score -= 10;
                $findings[] = [
                    'id'          => 'nginx_access_rules_' . md5($root),
                    'severity'    => 'medium',
                    'title'       => 'Aturan Akses Nginx Tidak Dapat Diverifikasi',
                    'description' => 'Nginx tidak membaca .htaccess. Pastikan konfigurasi server memblokir file tersembunyi, .env, config.php, setup-token.php, dan direktori src.',
                    'path'        => $root,
                    'current'     => 'Perlindungan .htaccess tidak berlaku di Nginx',
                    'recommended' => 'Terapkan snippet konfigurasi Nginx Musend Deck',
                    'can_fix'     => false,
                ];
            }

            // Match any permission mode where the "other" class can write.
            $cmd = "find " . escapeshellarg($root) . " -maxdepth 3 -perm -0002 2>/dev/null | head -n 20";
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
                'title'       => "Ditemukan {$insecurePermCount} File/Folder yang Dapat Ditulis Pengguna Lain",
                'description' => 'Bit write untuk pengguna lain dapat memungkinkan akun berbeda mengubah file web. Izin yang terdeteksi perlu ditinjau.',
                'path'        => implode(', ', array_slice($insecurePaths, 0, 3)) . ($insecurePermCount > 3 ? '...' : ''),
                'current'     => 'Other-write aktif',
                'recommended' => 'Hapus bit write untuk pengguna lain',
                'can_fix'     => true,
            ];
        } else {
            $findings[] = [
                'id'          => 'world_writable_files',
                'severity'    => 'good',
                'title'       => 'Tidak Ditemukan File Web yang Dapat Ditulis Pengguna Lain',
                'description' => 'Tidak ditemukan bit write untuk pengguna lain pada kedalaman pemindaian yang diperiksa.',
                'path'        => implode(' & ', array_map('basename', $webRoots)),
                'current'     => 'Tidak ada other-write',
                'recommended' => 'Pertahankan izin minimum yang diperlukan',
                'can_fix'     => false,
            ];
        }

        // 4. Audit .env files in projects/
        $projectEnvs = glob($this->homeDir . '/projects/*/.env') ?: [];
        foreach ($projectEnvs as $envPath) {
            $projectDir = realpath(dirname($envPath));
            if (
                is_link($envPath)
                || !is_file($envPath)
                || $projectDir === false
                || !PathGuard::isWithin($projectDir, $this->homeDir)
            ) continue;
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
     * Apply conservative permission fixes and web-server protection rules.
     */
    public function fixPermissions(): array
    {
        $actions = [];

        // 1. Fix SSH permissions
        $sshDir = $this->homeDir . '/.ssh';
        if (is_dir($sshDir) && !is_link($sshDir)) {
            @chmod($sshDir, 0700);
            $actions[] = "Normalisasi {$sshDir} ke 0700";

            $files = glob($sshDir . '/*') ?: [];
            foreach ($files as $f) {
                if (is_link($f) || !is_file($f)) continue;
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
        $fixedProjectEnvCount = 0;
        foreach ($projectEnvs as $env) {
            $realEnv = realpath($env);
            $realProjectDir = realpath(dirname($env));
            if (
                is_file($env)
                && !is_link($env)
                && $realEnv !== false
                && $realProjectDir !== false
                && PathGuard::isWithin($realEnv, $this->homeDir)
                && PathGuard::isWithin($realProjectDir, $this->homeDir)
            ) {
                if (@chmod($env, 0600)) {
                    $fixedProjectEnvCount++;
                }
            }
        }
        if ($fixedProjectEnvCount > 0) {
            $actions[] = "Mengamankan {$fixedProjectEnvCount} file .env ke 0600";
        }

        // 3. Normalize public directories and files (remove 0777)
        $targets = $this->getWebRoots();

        foreach ($targets as $dir) {
            if (!is_dir($dir)) continue;

            // Remove only the unsafe world-write bit; preserve execute and owner/group permissions.
            @exec("find " . escapeshellarg($dir) . " -type d -perm -0002 -exec chmod o-w {} + 2>/dev/null");
            @exec("find " . escapeshellarg($dir) . " -type f -perm -0002 -exec chmod o-w {} + 2>/dev/null");
            $actions[] = "Menghapus izin write untuk pengguna lain di " . basename($dir);

            // Ensure .htaccess blocks sensitive files
            $this->ensureHtaccessProtection($dir);
        }

        return [
            'success' => true,
            'message' => 'Normalisasi izin yang terdeteksi selesai dijalankan.',
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
        $rulesMarker = '# MUSEND DECK SECURITY RULES';
        $rulesBlock = "\n{$rulesMarker}\n" .
            "<IfModule mod_authz_core.c>\n" .
            "<FilesMatch \"^(config\\.php|config\\.sample\\.php|setup-token\\.php|nginx-security\\.conf\\.example|\\.musend-config-[a-f0-9]+\\.php|\\.(env|git|htaccess|htpasswd|ini|log|sh|sql))\">\n" .
            "    Require all denied\n" .
            "</FilesMatch>\n" .
            "</IfModule>\n" .
            "<IfModule !mod_authz_core.c>\n" .
            "<FilesMatch \"^(config\\.php|config\\.sample\\.php|setup-token\\.php|nginx-security\\.conf\\.example|\\.musend-config-[a-f0-9]+\\.php|\\.(env|git|htaccess|htpasswd|ini|log|sh|sql))\">\n" .
            "    Order allow,deny\n" .
            "    Deny from all\n" .
            "</FilesMatch>\n" .
            "</IfModule>\n" .
            "<FilesMatch \"(?i)\\.(sql|log|ini|sh|bak|old|orig|swp)$\">\n" .
            "    <IfModule mod_authz_core.c>Require all denied</IfModule>\n" .
            "    <IfModule !mod_authz_core.c>Order allow,deny\nDeny from all</IfModule>\n" .
            "</FilesMatch>\n" .
            "<IfModule mod_rewrite.c>\n" .
            "    RewriteEngine On\n" .
            "    RewriteRule \"(^|/)\\.(?!well-known(?:/|$))\" - [F,L]\n" .
            "</IfModule>\n" .
            "Options -Indexes\n" .
            "# --- END SERVERDECK SECURITY RULES ---\n";

        if (is_link($htaccess)) {
            return;
        }

        if (is_file($htaccess)) {
            $content = (string)file_get_contents($htaccess);
            if (!str_contains($content, $rulesMarker)) {
                @file_put_contents($htaccess, $content . $rulesBlock, FILE_APPEND | LOCK_EX);
            }
        } elseif (!file_exists($htaccess)) {
            @file_put_contents($htaccess, $rulesBlock, LOCK_EX);
        }
    }

    /**
     * Dynamically discover all web roots in this hosting account
     */
    private function getWebRoots(): array
    {
        $roots = [$this->homeDir . '/public_html'];

        // Subdomains in ~/domains/
        if (is_dir($this->homeDir . '/domains')) {
            $items = @scandir($this->homeDir . '/domains') ?: [];
            foreach ($items as $item) {
                if ($item[0] !== '.' && is_dir($this->homeDir . '/domains/' . $item . '/public_html')) {
                    $roots[] = $this->homeDir . '/domains/' . $item . '/public_html';
                }
            }
        }

        // Domain-like directories directly in ~/
        $rootItems = @scandir($this->homeDir) ?: [];
        foreach ($rootItems as $item) {
            if ($item[0] === '.' || in_array($item, ['domains', 'projects', 'logs', 'access-logs', 'etc', 'mail', 'ssl', 'tmp', 'bin'])) {
                continue;
            }
            if (str_contains($item, '.') && is_dir($this->homeDir . '/' . $item)) {
                $roots[] = $this->homeDir . '/' . $item;
            }
        }

        $safeRoots = [];
        foreach (array_unique($roots) as $root) {
            if (is_link($root)) {
                continue;
            }
            $realRoot = realpath($root);
            if ($realRoot !== false && is_dir($realRoot) && PathGuard::isWithin($realRoot, $this->homeDir)) {
                $safeRoots[] = $realRoot;
            }
        }

        return array_values(array_unique($safeRoots));
    }
}

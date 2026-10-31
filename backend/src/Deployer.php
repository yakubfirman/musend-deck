<?php
declare(strict_types=1);

namespace ServerDeck;

class Deployer
{
    private array $config;
    private string $homeDir;
    private string $tmpDir;

    public function __construct(array $config)
    {
        $this->config = $config;
        $this->homeDir = rtrim(getenv('HOME') ?: ('/home/' . (get_current_user() ?: 'yakubfir')), '/');
        $this->tmpDir = sys_get_temp_dir() ?: '/tmp';
    }

    /**
     * Get list of deployable projects and their current git metadata dynamically
     */
    public function getProjects(): array
    {
        $projectsDir = $this->homeDir . '/projects';
        $binDir = $this->homeDir . '/bin';

        // Known default metadata mapping for common presets
        $presets = [
            'web-yakubfirman' => [
                'id'          => 'web',
                'name'        => 'Frontend Website',
                'description' => 'Astro SSG / SSR Portfolio & Web',
                'url'         => 'https://yakubfirman.com',
                'type'        => 'astro',
                'deploy_script' => $binDir . '/deploy-web',
            ],
            'api-yakubfirman' => [
                'id'          => 'api',
                'name'        => 'Backend API',
                'description' => 'Laravel 11 REST API & PostgreSQL Service',
                'url'         => 'https://api.yakubfirman.com',
                'type'        => 'laravel',
                'deploy_script' => $binDir . '/deploy-api',
            ],
            'hostingmanage' => [
                'id'          => 'monitor',
                'name'        => 'Musend Deck Cockpit',
                'description' => 'Zero-Daemon Cloud & Shared Hosting Management',
                'url'         => 'https://musend.web.id/monitor/',
                'type'        => 'react-php',
                'deploy_script' => $binDir . '/deploy-monitor',
            ],
        ];

        $discoveredProjects = [];

        // Scan ~/projects directory
        if (is_dir($projectsDir)) {
            $items = @scandir($projectsDir) ?: [];
            foreach ($items as $item) {
                if ($item[0] === '.' || !is_dir($projectsDir . '/' . $item)) {
                    continue;
                }

                $dir = $projectsDir . '/' . $item;
                $preset = $presets[$item] ?? null;

                $id = $preset['id'] ?? $item;
                $name = $preset['name'] ?? ucwords(str_replace(['-', '_'], ' ', $item));
                $type = $preset['type'] ?? $this->detectProjectType($dir);
                $desc = $preset['description'] ?? "Aplikasi {$type} pada {$item}";
                $url  = $preset['url'] ?? $this->detectProjectUrl($dir);

                // Find matching deploy script
                $deployScript = $preset['deploy_script'] ?? null;
                if (!$deployScript || !file_exists($deployScript)) {
                    $candidates = [
                        $binDir . '/deploy-' . $item,
                        $binDir . '/deploy-' . $id,
                    ];
                    foreach ($candidates as $cand) {
                        if (file_exists($cand)) {
                            $deployScript = $cand;
                            break;
                        }
                    }
                }

                $gitInfo = [
                    'branch'   => 'unknown',
                    'commit'   => '-------',
                    'message'  => 'Belum ada riwayat commit',
                    'author'   => '',
                    'date'     => '',
                    'is_dirty' => false,
                    'exists'   => true,
                ];

                if (is_dir($dir . '/.git')) {
                    $branch = @exec("cd " . escapeshellarg($dir) . " && git rev-parse --abbrev-ref HEAD 2>/dev/null");
                    if ($branch) {
                        $gitInfo['branch'] = trim($branch);
                    }

                    $log = @exec("cd " . escapeshellarg($dir) . " && git log -1 --format=\"%h|%s|%an|%cr|%ct\" 2>/dev/null");
                    if ($log) {
                        $parts = explode('|', $log);
                        $gitInfo['commit']  = $parts[0] ?? '';
                        $gitInfo['message'] = $parts[1] ?? '';
                        $gitInfo['author']  = $parts[2] ?? '';
                        $gitInfo['date']    = $parts[3] ?? '';
                    }

                    $status = @exec("cd " . escapeshellarg($dir) . " && git status --porcelain 2>/dev/null");
                    $gitInfo['is_dirty'] = !empty(trim((string)$status));
                }

                $discoveredProjects[$id] = [
                    'id'            => $id,
                    'project_folder'=> $item,
                    'name'          => $name,
                    'description'   => $desc,
                    'path'          => $dir,
                    'deploy_script' => $deployScript,
                    'has_deploy'    => !empty($deployScript) && file_exists($deployScript),
                    'url'           => $url,
                    'type'          => $type,
                    'git'           => $gitInfo,
                ];
            }
        }

        // Return array of projects
        return [
            'success'  => true,
            'projects' => array_values($discoveredProjects),
            'scripts'  => [
                'deploy_all' => file_exists($binDir . '/deploy-all'),
                'deploy_new' => file_exists($binDir . '/deploy-new'),
            ],
        ];
    }

    /**
     * Start a deployment asynchronously
     */
    public function startDeployment(string $target): array
    {
        $target = trim($target);
        if ($target === '') {
            return [
                'success' => false,
                'error'   => "Target deploy tidak boleh kosong.",
                'code'    => 400,
            ];
        }

        $binDir = $this->homeDir . '/bin';

        // 1. Periksa apakah preset global atau script langsung
        $script = null;
        if ($target === 'all') {
            $script = $binDir . '/deploy-all';
        } elseif ($target === 'full') {
            $script = $binDir . '/deploy-all full';
        } elseif ($target === 'web') {
            $script = $binDir . '/deploy-web';
        } elseif ($target === 'api') {
            $script = $binDir . '/deploy-api';
        } elseif ($target === 'monitor' || $target === 'musend-deck' || $target === 'hostingmanage') {
            $script = $binDir . '/deploy-monitor';
        } else {
            // Cek apakah ada script deploy-<target>
            $sanitizedTarget = preg_replace('/[^a-zA-Z0-9_-]/', '', $target);
            if (file_exists($binDir . '/deploy-' . $sanitizedTarget)) {
                $script = $binDir . '/deploy-' . $sanitizedTarget;
            } elseif (file_exists($binDir . '/deploy-all')) {
                // Coba deploy-all <target>
                $script = $binDir . '/deploy-all ' . escapeshellarg($sanitizedTarget);
            }
        }

        if (!$script) {
            return [
                'success' => false,
                'error'   => "Tidak ditemukan script deploy untuk target '{$target}'. Gunakan 'deploy-new' untuk membuatnya.",
                'code'    => 404,
            ];
        }

        $id = 'dep_' . time() . '_' . bin2hex(random_bytes(3));
        $logFile = $this->tmpDir . "/serverdeck_{$id}.log";
        $metaFile = $this->tmpDir . "/serverdeck_{$id}.json";
        $exitFile = $this->tmpDir . "/serverdeck_{$id}.exit";

        $meta = [
            'id'         => $id,
            'target'     => $target,
            'command'    => $script,
            'start_time' => time(),
            'status'     => 'running',
            'exit_code'  => null,
        ];
        file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT));
        file_put_contents($logFile, "=== MEMULAI DEPLOYMENT [target: {$target}] ===\n" . date('Y-m-d H:i:s') . "\nPerintah: {$script}\n\n");

        // Execute via background shell
        $cmd = "(" . $script . " >> " . escapeshellarg($logFile) . " 2>&1; echo $? > " . escapeshellarg($exitFile) . ") > /dev/null 2>&1 &";
        pclose(popen($cmd, 'r'));

        return [
            'success'       => true,
            'deployment_id' => $id,
            'target'        => $target,
            'status'        => 'running',
            'message'       => "Deployment untuk '{$target}' berhasil dipicu di background.",
        ];
    }

    /**
     * Poll status and get log output of a deployment
     */
    public function getDeploymentStatus(string $id): array
    {
        $id = preg_replace('/[^a-zA-Z0-9_-]/', '', $id);
        $logFile = $this->tmpDir . "/serverdeck_{$id}.log";
        $metaFile = $this->tmpDir . "/serverdeck_{$id}.json";
        $exitFile = $this->tmpDir . "/serverdeck_{$id}.exit";

        if (!file_exists($metaFile)) {
            return [
                'success' => false,
                'error'   => 'Deployment ID tidak ditemukan.',
                'code'    => 404,
            ];
        }

        $meta = json_decode((string)file_get_contents($metaFile), true) ?: [];
        $logContent = file_exists($logFile) ? (string)file_get_contents($logFile) : '';

        $status = $meta['status'] ?? 'running';
        $exitCode = $meta['exit_code'] ?? null;

        if (file_exists($exitFile)) {
            $code = (int)trim((string)file_get_contents($exitFile));
            $exitCode = $code;
            $status = ($code === 0) ? 'success' : 'failed';
            $meta['status'] = $status;
            $meta['exit_code'] = $exitCode;
            $meta['end_time'] = time();
            @file_put_contents($metaFile, json_encode($meta, JSON_PRETTY_PRINT));
        }

        $duration = (time() - (int)($meta['start_time'] ?? time()));

        return [
            'success'   => true,
            'id'        => $id,
            'target'    => $meta['target'] ?? 'unknown',
            'status'    => $status,
            'exit_code' => $exitCode,
            'duration'  => $duration,
            'log'       => $logContent,
        ];
    }

    /**
     * Detect project type from directory files
     */
    private function detectProjectType(string $dir): string
    {
        if (file_exists($dir . '/artisan') || file_exists($dir . '/composer.json')) {
            return 'laravel';
        }
        if (file_exists($dir . '/astro.config.mjs') || file_exists($dir . '/astro.config.ts')) {
            return 'astro';
        }
        if (file_exists($dir . '/next.config.js') || file_exists($dir . '/next.config.mjs')) {
            return 'nextjs';
        }
        if (file_exists($dir . '/vite.config.ts') || file_exists($dir . '/vite.config.js')) {
            return 'react/vite';
        }
        if (file_exists($dir . '/package.json')) {
            return 'node';
        }
        if (file_exists($dir . '/index.php')) {
            return 'php';
        }
        return 'web/static';
    }

    /**
     * Detect project URL from .env or package.json
     */
    private function detectProjectUrl(string $dir): ?string
    {
        // Try reading .env
        $envFile = $dir . '/.env';
        if (file_exists($envFile)) {
            $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            foreach ($lines as $line) {
                if (preg_match('/^APP_URL\s*=\s*(.+)$/i', trim($line), $m)) {
                    $u = trim(trim($m[1]), "\"'\r\n");
                    if (filter_var($u, FILTER_VALIDATE_URL)) {
                        return $u;
                    }
                }
            }
        }

        // Try reading package.json homepage
        $pkgFile = $dir . '/package.json';
        if (file_exists($pkgFile)) {
            $pkg = json_decode((string)@file_get_contents($pkgFile), true);
            if (!empty($pkg['homepage']) && filter_var($pkg['homepage'], FILTER_VALIDATE_URL)) {
                return $pkg['homepage'];
            }
        }

        return null;
    }
}

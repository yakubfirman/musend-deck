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
        $this->homeDir = rtrim(getenv('HOME') ?: '/home/' . (get_current_user() ?: 'yakubfir'), '/');
        $this->tmpDir = sys_get_temp_dir() ?: '/tmp';
    }

    /**
     * Get list of deployable projects and their current git metadata
     */
    public function getProjects(): array
    {
        $projects = [
            'web' => [
                'id'          => 'web',
                'name'        => 'Frontend Website',
                'description' => 'Astro SSG / SSR Portfolio & Web',
                'path'        => $this->homeDir . '/projects/web-yakubfirman',
                'deploy_script' => $this->homeDir . '/bin/deploy-web',
                'url'         => 'https://yakubfirman.com',
                'type'        => 'astro',
            ],
            'api' => [
                'id'          => 'api',
                'name'        => 'Backend API',
                'description' => 'Laravel 11 REST API & PostgreSQL Service',
                'path'        => $this->homeDir . '/projects/api-yakubfirman',
                'deploy_script' => $this->homeDir . '/bin/deploy-api',
                'url'         => 'https://api.yakubfirman.com',
                'type'        => 'laravel',
            ],
            'monitor' => [
                'id'          => 'monitor',
                'name'        => 'ServerDeck Monitor',
                'description' => 'Lightweight CloudLinux & Server Dashboard',
                'path'        => $this->homeDir . '/projects/hostingmanage',
                'deploy_script' => $this->homeDir . '/bin/deploy-monitor',
                'url'         => 'https://musend.web.id/monitor/',
                'type'        => 'react-php',
            ],
        ];

        $results = [];
        foreach ($projects as $key => $proj) {
            $dir = $proj['path'];
            $gitInfo = [
                'branch'       => 'unknown',
                'commit'       => '-------',
                'message'      => 'No commit found',
                'author'       => '',
                'date'         => '',
                'is_dirty'     => false,
                'exists'       => is_dir($dir),
            ];

            if (is_dir($dir) && is_dir($dir . '/.git')) {
                // Branch
                $branch = @exec("cd " . escapeshellarg($dir) . " && git rev-parse --abbrev-ref HEAD 2>/dev/null");
                if ($branch) {
                    $gitInfo['branch'] = trim($branch);
                }

                // Last commit info
                $log = @exec("cd " . escapeshellarg($dir) . " && git log -1 --format=\"%h|%s|%an|%cr|%ct\" 2>/dev/null");
                if ($log) {
                    $parts = explode('|', $log);
                    $gitInfo['commit']  = $parts[0] ?? '';
                    $gitInfo['message'] = $parts[1] ?? '';
                    $gitInfo['author']  = $parts[2] ?? '';
                    $gitInfo['date']    = $parts[3] ?? '';
                }

                // Check dirty files
                $status = @exec("cd " . escapeshellarg($dir) . " && git status --porcelain 2>/dev/null");
                $gitInfo['is_dirty'] = !empty(trim((string)$status));
            }

            $proj['git'] = $gitInfo;
            $results[] = $proj;
        }

        return [
            'success'  => true,
            'projects' => $results,
            'scripts'  => [
                'deploy_all' => file_exists($this->homeDir . '/bin/deploy-all'),
            ],
        ];
    }

    /**
     * Start a deployment asynchronously
     */
    public function startDeployment(string $target): array
    {
        $validTargets = ['all', 'web', 'api', 'monitor', 'full'];
        if (!in_array($target, $validTargets, true)) {
            return [
                'success' => false,
                'error'   => "Target deploy '{$target}' tidak valid.",
                'code'    => 400,
            ];
        }

        $script = match ($target) {
            'all'     => $this->homeDir . '/bin/deploy-all',
            'full'    => $this->homeDir . '/bin/deploy-all full',
            'web'     => $this->homeDir . '/bin/deploy-web',
            'api'     => $this->homeDir . '/bin/deploy-api',
            'monitor' => $this->homeDir . '/bin/deploy-monitor',
        };

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
        file_put_contents($logFile, "=== MEMULAI DEPLOYMENT [target: {$target}] ===\n" . date('Y-m-d H:i:s') . "\n\n");

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
}

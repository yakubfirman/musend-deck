<?php
declare(strict_types=1);

namespace ServerDeck;

use PDO;
use Exception;

class Databases
{
    private array $config;
    private string $homeDir;
    private string $backupDir;

    public function __construct(array $config)
    {
        $this->config = $config;
        $this->homeDir = PathGuard::homeDir();
        $this->backupDir = '';
        $backupParent = $this->homeDir . '/backups';
        if (!is_link($backupParent) && (!file_exists($backupParent) || is_dir($backupParent))) {
            if (!is_dir($backupParent)) {
                @mkdir($backupParent, 0700);
            }
            $candidate = $backupParent . '/db';
            if (!is_link($candidate) && (!file_exists($candidate) || is_dir($candidate))) {
                if (!is_dir($candidate)) {
                    @mkdir($candidate, 0700);
                }
                $realCandidate = realpath($candidate);
                if ($realCandidate !== false && PathGuard::isWithin($realCandidate, $this->homeDir) && is_dir($realCandidate)) {
                    @chmod($realCandidate, 0700);
                    $this->backupDir = $realCandidate;
                }
            }
        }
    }

    /**
     * Get database credentials dynamically from any project .env or config
     */
    private function getPgConfig(): array
    {
        // 1. Direct configuration from config.php if present
        if (!empty($this->config['database']['name'])) {
            return [
                'host'     => $this->config['database']['host'] ?? '127.0.0.1',
                'port'     => (int)($this->config['database']['port'] ?? 5432),
                'database' => $this->config['database']['name'] ?? '',
                'username' => $this->config['database']['user'] ?? '',
                'password' => $this->config['database']['pass'] ?? '',
            ];
        }

        $envFile = null;
        // 2. Scan ~/projects for any .env containing DB credentials
        $projDir = $this->homeDir . '/projects';
        if (is_dir($projDir)) {
            $subDirs = @scandir($projDir) ?: [];
            foreach ($subDirs as $sub) {
                if ($sub[0] === '.') continue;
                $realProject = realpath($projDir . '/' . $sub);
                if ($realProject === false || !PathGuard::isWithin($realProject, $this->homeDir)) continue;
                $cand = $projDir . '/' . $sub . '/.env';
                if (is_file($cand) && !is_link($cand)) {
                    $content = @file_get_contents($cand);
                    if ($content && (str_contains($content, 'DB_DATABASE') || str_contains($content, 'DATABASE_URL'))) {
                        $envFile = $cand;
                        break;
                    }
                }
            }
        }

        // 3. Scan user home for .env
        if (!$envFile && is_file($this->homeDir . '/.env') && !is_link($this->homeDir . '/.env')) {
            $envFile = $this->homeDir . '/.env';
        }

        $env = [];
        if ($envFile && file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            foreach ($lines as $line) {
                if (str_starts_with(trim($line), '#')) {
                    continue;
                }
                if (str_contains($line, '=')) {
                    [$k, $v] = explode('=', $line, 2);
                    $env[trim($k)] = trim(trim($v), "\"'\r\n");
                }
            }
        }

        return [
            'host'     => $env['DB_HOST'] ?? ($this->config['database']['host'] ?? '127.0.0.1'),
            'port'     => (int)($env['DB_PORT'] ?? ($this->config['database']['port'] ?? 5432)),
            'database' => $env['DB_DATABASE'] ?? ($this->config['database']['name'] ?? ''),
            'username' => $env['DB_USERNAME'] ?? ($this->config['database']['user'] ?? ''),
            'password' => $env['DB_PASSWORD'] ?? ($this->config['database']['pass'] ?? ''),
        ];
    }

    /**
     * List all databases (Postgres & MySQL via cPanel UAPI)
     */
    public function getOverview(): array
    {
        $pgConfig = $this->getPgConfig();
        $pgData = [
            'type'        => 'postgresql',
            'database'    => $pgConfig['database'],
            'username'    => $pgConfig['username'],
            'host'        => $pgConfig['host'],
            'port'        => $pgConfig['port'],
            'connected'   => false,
            'size_bytes'  => 0,
            'formatted_size' => '0 B',
            'table_count' => 0,
            'tables'      => [],
            'error'       => null,
        ];

        $databaseName = (string)($pgConfig['database'] ?? '');
        $databaseHost = (string)($pgConfig['host'] ?? '');
        $databasePort = (int)($pgConfig['port'] ?? 0);
        $pgConfigValid = $databaseName !== ''
            && preg_match('/^[A-Za-z0-9_.-]+$/D', $databaseName) === 1
            && preg_match('/^[A-Za-z0-9._:\/-]+$/D', $databaseHost) === 1
            && $databasePort >= 1
            && $databasePort <= 65535;

        if ($pgConfigValid) {
        try {
            $dsn = "pgsql:host={$pgConfig['host']};port={$pgConfig['port']};dbname={$pgConfig['database']};";
            $pdo = new PDO($dsn, $pgConfig['username'], $pgConfig['password'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT            => 3,
            ]);
            $pgData['connected'] = true;

            // Database size
            $stmt = $pdo->prepare('SELECT pg_database_size(CAST(:database AS name)) AS size');
            $stmt->execute(['database' => $pgConfig['database']]);
            $sizeRow = $stmt->fetch();
            $dbSizeBytes = (int)($sizeRow['size'] ?? 0);
            $pgData['size_bytes'] = $dbSizeBytes;
            $pgData['formatted_size'] = $this->formatBytes($dbSizeBytes);

            // Tables info
            $query = "
                SELECT 
                    t.table_name,
                    pg_total_relation_size(quote_ident(t.table_name)) as total_size,
                    pg_relation_size(quote_ident(t.table_name)) as data_size,
                    (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as row_estimate
                FROM information_schema.tables t
                WHERE t.table_schema = 'public'
                ORDER BY total_size DESC;
            ";
            $tablesStmt = $pdo->query($query);
            $tables = [];
            while ($row = $tablesStmt->fetch()) {
                $totalSize = (int)($row['total_size'] ?? 0);
                $tables[] = [
                    'name'           => $row['table_name'],
                    'rows_estimate'  => max(0, (int)($row['row_estimate'] ?? 0)),
                    'size_bytes'     => $totalSize,
                    'formatted_size' => $this->formatBytes($totalSize),
                ];
            }
            $pgData['tables'] = $tables;
            $pgData['table_count'] = count($tables);
        } catch (Exception $e) {
            $pgData['error'] = $e->getMessage();
        }
        } else {
            $pgData['error'] = 'Konfigurasi PostgreSQL tidak tersedia atau mengandung nilai yang tidak valid.';
        }

        // MySQL databases via cPanel UAPI
        $mysqlData = [];
        $cmd = "uapi --output=json Mysql list_databases 2>/dev/null";
        $json = @shell_exec($cmd);
        if ($json) {
            $parsed = json_decode($json, true);
            $dbList = $parsed['result']['data'] ?? [];
            foreach ($dbList as $db) {
                $mysqlData[] = [
                    'database'       => $db['database'] ?? '',
                    'size_bytes'     => (int)($db['disk_usage'] ?? 0),
                    'formatted_size' => $this->formatBytes((int)($db['disk_usage'] ?? 0)),
                    'users'          => $db['users'] ?? [],
                    'table_count'    => (int)($db['table_count'] ?? 0),
                ];
            }
        }

        return [
            'success'    => true,
            'postgresql' => $pgData,
            'mysql'      => $mysqlData,
            'backups'    => $this->listBackups(),
        ];
    }

    /**
     * Create 1-click database dump/backup (PostgreSQL or MySQL)
     */
    public function createBackup(string $dbType = 'postgresql', string $dbName = ''): array
    {
        if ($this->backupDir === '') {
            return [
                'success' => false,
                'error'   => 'Folder backup privat tidak tersedia di dalam home akun.',
                'code'    => 500,
            ];
        }

        $timestamp = date('Ymd_His');
        if ($dbType === 'postgresql') {
            $pg = $this->getPgConfig();
            if (empty($pg['database'])) {
                return [
                    'success' => false,
                    'error'   => 'Konfigurasi database PostgreSQL tidak ditemukan.',
                    'code'    => 400,
                ];
            }
            $safeDatabaseName = substr(preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)$pg['database']), 0, 80);
            $filename = "pg_{$safeDatabaseName}_{$timestamp}_" . bin2hex(random_bytes(3)) . '.sql.gz';
            $targetPath = $this->backupDir . '/' . $filename;
            $stagedPath = @tempnam($this->backupDir, '.musend-db-');
            if ($stagedPath === false || realpath(dirname($stagedPath)) !== realpath($this->backupDir)) {
                if (is_string($stagedPath)) @unlink($stagedPath);
                return ['success' => false, 'error' => 'Gagal membuat file sementara privat untuk backup.', 'code' => 500];
            }

            $pipeline = sprintf(
                'PGPASSWORD=%s pg_dump -h %s -p %d -U %s %s | gzip > %s',
                escapeshellarg($pg['password']),
                escapeshellarg($pg['host']),
                $pg['port'],
                escapeshellarg($pg['username']),
                escapeshellarg($pg['database']),
                escapeshellarg($stagedPath)
            );
            $cmd = 'bash -o pipefail -c ' . escapeshellarg($pipeline);

            @exec($cmd, $output, $code);

            if ($code === 0 && is_file($stagedPath) && !is_link($stagedPath) && filesize($stagedPath) > 20 && @chmod($stagedPath, 0600) && @link($stagedPath, $targetPath)) {
                @unlink($stagedPath);
                return [
                    'success'        => true,
                    'filename'       => $filename,
                    'size'           => filesize($targetPath),
                    'formatted_size' => $this->formatBytes(filesize($targetPath)),
                    'message'        => "Backup PostgreSQL '{$pg['database']}' berhasil dibuat.",
                ];
            }

            @unlink($stagedPath);
            return [
                'success' => false,
                'error'   => 'Gagal mengeksekusi pg_dump: ' . implode(' ', $output),
                'code'    => 500,
            ];
        }

        if ($dbType === 'mysql') {
            $dbName = preg_replace('/[^a-zA-Z0-9_\-]/', '', $dbName);
            if (empty($dbName)) {
                $cmdList = "uapi --output=json Mysql list_databases 2>/dev/null";
                $jsonList = @shell_exec($cmdList);
                if ($jsonList) {
                    $parsed = json_decode($jsonList, true);
                    $first = $parsed['result']['data'][0]['database'] ?? null;
                    if ($first) $dbName = $first;
                }
            }
            if (empty($dbName)) {
                return [
                    'success' => false,
                    'error'   => 'Database MySQL tidak ditemukan untuk di-backup.',
                    'code'    => 400,
                ];
            }
            $filename = "mysql_{$dbName}_{$timestamp}_" . bin2hex(random_bytes(3)) . '.sql.gz';
            $targetPath = $this->backupDir . '/' . $filename;
            $stagedPath = @tempnam($this->backupDir, '.musend-db-');
            if ($stagedPath === false || realpath(dirname($stagedPath)) !== realpath($this->backupDir)) {
                if (is_string($stagedPath)) @unlink($stagedPath);
                return ['success' => false, 'error' => 'Gagal membuat file sementara privat untuk backup.', 'code' => 500];
            }
            $pipeline = sprintf('mysqldump %s | gzip > %s', escapeshellarg($dbName), escapeshellarg($stagedPath));
            $cmd = 'bash -o pipefail -c ' . escapeshellarg($pipeline);
            @exec($cmd, $output, $code);
            if ($code === 0 && is_file($stagedPath) && !is_link($stagedPath) && filesize($stagedPath) > 20 && @chmod($stagedPath, 0600) && @link($stagedPath, $targetPath)) {
                @unlink($stagedPath);
                return [
                    'success'        => true,
                    'filename'       => $filename,
                    'size'           => filesize($targetPath),
                    'formatted_size' => $this->formatBytes(filesize($targetPath)),
                    'message'        => "Backup MySQL '{$dbName}' berhasil dibuat.",
                ];
            }
            @unlink($stagedPath);
            return [
                'success' => false,
                'error'   => 'Gagal mengeksekusi mysqldump: ' . implode(' ', $output),
                'code'    => 500,
            ];
        }

        return [
            'success' => false,
            'error'   => 'Tipe database tidak didukung untuk backup.',
            'code'    => 400,
        ];
    }

    /**
     * List all database backup files in backup directory
     */
    public function listBackups(): array
    {
        $files = $this->backupDir !== '' ? (glob($this->backupDir . '/*.sql.gz') ?: []) : [];
        $results = [];

        foreach ($files as $file) {
            if (is_link($file) || !is_file($file)) continue;
            $size = filesize($file);
            $mtime = filemtime($file);
            $results[] = [
                'filename'       => basename($file),
                'size_bytes'     => $size,
                'formatted_size' => $this->formatBytes($size),
                'mtime'          => $mtime,
                'formatted_date' => date('d M Y H:i:s', $mtime),
            ];
        }

        // Sort descending by date
        usort($results, fn($a, $b) => $b['mtime'] <=> $a['mtime']);
        return $results;
    }

    /**
     * Download backup file safely
     */
    public function downloadBackup(string $filename): void
    {
        $safeName = basename($filename);
        $fullPath = $this->backupDir . '/' . $safeName;

        if ($this->backupDir === '' || !preg_match('/^[a-zA-Z0-9._-]+\.sql\.gz$/', $safeName) || !is_file($fullPath) || is_link($fullPath)) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'File backup tidak ditemukan.']);
            exit;
        }

        header('Content-Description: File Transfer');
        header('Content-Type: application/gzip');
        header('Content-Disposition: attachment; filename="' . $safeName . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($fullPath));
        readfile($fullPath);
        exit;
    }

    /**
     * Delete a backup file
     */
    public function deleteBackup(string $filename): array
    {
        $safeName = basename($filename);
        $fullPath = $this->backupDir . '/' . $safeName;

        if ($this->backupDir !== '' && preg_match('/^[a-zA-Z0-9._-]+\.sql\.gz$/', $safeName) && is_file($fullPath) && !is_link($fullPath)) {
            @unlink($fullPath);
            return [
                'success' => true,
                'message' => "File backup '{$safeName}' berhasil dihapus.",
            ];
        }

        return [
            'success' => false,
            'error'   => 'File backup tidak ditemukan.',
            'code'    => 404,
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

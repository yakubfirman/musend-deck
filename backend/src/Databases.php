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
            $configuredDriver = strtolower((string)($this->config['database']['driver'] ?? 'pgsql'));
            if (!in_array($configuredDriver, ['pgsql', 'postgres', 'postgresql'], true)) {
                return ['host' => '', 'port' => 5432, 'database' => '', 'username' => '', 'password' => ''];
            }
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
                    $connection = '';
                    $databaseUrl = '';
                    if (is_string($content)) {
                        if (preg_match('/^\s*DB_CONNECTION\s*=\s*["\']?([^"\'\s#]+)/mi', $content, $match)) $connection = strtolower($match[1]);
                        if (preg_match('/^\s*DATABASE_URL\s*=\s*["\']?([^"\'\s#]+)/mi', $content, $match)) $databaseUrl = strtolower($match[1]);
                    }
                    $explicitlyNotPostgres = ($connection !== '' && !in_array($connection, ['pgsql', 'postgres', 'postgresql'], true))
                        || str_starts_with($databaseUrl, 'mysql://')
                        || str_starts_with($databaseUrl, 'mysql:')
                        || str_starts_with($databaseUrl, 'mysql+');
                    if ($content && !$explicitlyNotPostgres && (str_contains($content, 'DB_DATABASE') || str_contains($content, 'DATABASE_URL'))) {
                        $envFile = $cand;
                        break;
                    }
                }
            }
        }

        // 3. Scan user home for .env, applying the same PostgreSQL-only filter.
        if (!$envFile && is_file($this->homeDir . '/.env') && !is_link($this->homeDir . '/.env')) {
            $homeEnvContent = @file_get_contents($this->homeDir . '/.env');
            $connection = '';
            $databaseUrl = '';
            if (is_string($homeEnvContent)) {
                if (preg_match('/^\s*DB_CONNECTION\s*=\s*["\']?([^"\'\s#]+)/mi', $homeEnvContent, $match)) $connection = strtolower($match[1]);
                if (preg_match('/^\s*DATABASE_URL\s*=\s*["\']?([^"\'\s#]+)/mi', $homeEnvContent, $match)) $databaseUrl = strtolower($match[1]);
            }
            $explicitlyNotPostgres = ($connection !== '' && !in_array($connection, ['pgsql', 'postgres', 'postgresql'], true))
                || str_starts_with($databaseUrl, 'mysql://')
                || str_starts_with($databaseUrl, 'mysql:')
                || str_starts_with($databaseUrl, 'mysql+');
            if (is_string($homeEnvContent) && !$explicitlyNotPostgres && (str_contains($homeEnvContent, 'DB_DATABASE') || str_contains($homeEnvContent, 'DATABASE_URL'))) {
                $envFile = $this->homeDir . '/.env';
            }
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
            'backup_policy' => $this->retentionPolicy(),
        ];
    }

    /**
     * Create 1-click database dump/backup (PostgreSQL or MySQL)
     */
    public function createBackup(string $dbType = 'postgresql', string $dbName = '', bool $deferRetention = false): array
    {
        if (!function_exists('exec')) {
            return ['success' => false, 'error' => 'Backup database membutuhkan fungsi exec yang tersedia.', 'code' => 503];
        }
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
                'PGPASSWORD=%s pg_dump --clean --if-exists -h %s -p %d -U %s %s | gzip > %s',
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
                if (!$deferRetention) $this->pruneBackups();
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
            $pipeline = sprintf('mysqldump --add-drop-table %s | gzip > %s', escapeshellarg($dbName), escapeshellarg($stagedPath));
            $cmd = 'bash -o pipefail -c ' . escapeshellarg($pipeline);
            @exec($cmd, $output, $code);
            if ($code === 0 && is_file($stagedPath) && !is_link($stagedPath) && filesize($stagedPath) > 20 && @chmod($stagedPath, 0600) && @link($stagedPath, $targetPath)) {
                @unlink($stagedPath);
                if (!$deferRetention) $this->pruneBackups();
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
        header('Cache-Control: private, no-store, max-age=0');
        header('Pragma: no-cache');
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

    public function retentionPolicy(): array
    {
        return [
            'days' => max(1, min(3650, (int)($this->config['backup']['retention_days'] ?? 30))),
            'max_backups' => max(1, min(1000, (int)($this->config['backup']['max_backups'] ?? 20))),
            'offsite_enabled' => trim((string)($this->config['backup']['rclone_remote'] ?? '')) !== '',
        ];
    }

    /** Create backups for the PostgreSQL configuration and databases discovered by cPanel UAPI. */
    public function createScheduledBackups(): array
    {
        $results = [];
        $pg = $this->getPgConfig();
        if (!empty($pg['database'])) {
            $results[] = ['type' => 'postgresql', 'database' => $pg['database']] + $this->createBackup('postgresql', '', true);
        }

        if (function_exists('shell_exec')) {
            $json = @shell_exec('uapi --output=json Mysql list_databases 2>/dev/null');
            $parsed = is_string($json) ? json_decode($json, true) : null;
            $databases = $parsed['result']['data'] ?? [];
            if (is_array($databases)) {
                $names = [];
                foreach ($databases as $entry) {
                    $name = is_array($entry) ? (string)($entry['database'] ?? '') : '';
                    $name = preg_replace('/[^a-zA-Z0-9_-]/', '', $name);
                    if ($name !== '') $names[] = $name;
                }
                foreach (array_slice(array_values(array_unique($names)), 0, 50) as $name) {
                    $results[] = ['type' => 'mysql', 'database' => $name] + $this->createBackup('mysql', $name, true);
                }
            }
        }

        $successful = count(array_filter($results, static fn(array $result): bool => ($result['success'] ?? false) === true));
        return [
            'success' => $results === [] || $successful === count($results),
            'skipped' => $results === [],
            'created' => $successful,
            'attempted' => count($results),
            'results' => $results,
            'message' => $results === [] ? 'Tidak ada database yang terdeteksi untuk backup.' : "{$successful} dari " . count($results) . ' backup berhasil dibuat.',
        ];
    }

    /** Delete backups outside the configured age/count window, counted separately per database. */
    public function pruneBackups(array $exclude = []): array
    {
        if ($this->backupDir === '') {
            return ['success' => false, 'error' => 'Folder backup privat tidak tersedia.', 'deleted' => 0];
        }

        $policy = $this->retentionPolicy();
        $files = array_values(array_filter(glob($this->backupDir . '/*.sql.gz') ?: [], static fn(string $path): bool => !is_link($path) && is_file($path)));
        usort($files, static fn(string $a, string $b): int => (filemtime($b) ?: 0) <=> (filemtime($a) ?: 0));
        $cutoff = time() - $policy['days'] * 86400;
        $deleted = 0;

        $eligibleByDatabase = [];
        foreach ($files as $file) {
            if (in_array(basename($file), $exclude, true)) continue;
            $filename = basename($file);
            $group = preg_match('/^(pg|mysql)_(.+)_[0-9]{8}_[0-9]{6}_[a-f0-9]{6}\.sql\.gz$/D', $filename, $matches)
                ? $matches[1] . ':' . $matches[2]
                : 'other:' . $filename;
            $groupIndex = $eligibleByDatabase[$group] ?? 0;
            $mtime = filemtime($file) ?: 0;
            if ($groupIndex >= $policy['max_backups'] || ($mtime > 0 && $mtime < $cutoff)) {
                if (@unlink($file)) $deleted++;
            }
            $eligibleByDatabase[$group] = $groupIndex + 1;
        }

        return ['success' => true, 'deleted' => $deleted, 'retained' => count($files) - $deleted, 'policy' => $policy];
    }

    /** Copy private backup files to a configured rclone remote when invoked by maintenance. */
    public function syncBackupsOffsite(): array
    {
        $remote = trim((string)($this->config['backup']['rclone_remote'] ?? ''));
        if ($remote === '') {
            return ['success' => true, 'skipped' => true, 'message' => 'Tujuan off-site belum dikonfigurasi.'];
        }
        if ($this->backupDir === '' || !function_exists('exec') || !function_exists('shell_exec')) {
            return ['success' => false, 'error' => 'Backup privat atau fungsi exec tidak tersedia.'];
        }
        if (!preg_match('/^(?:[A-Za-z0-9_.-]+:.+|\/[^\r\n]*)$/D', $remote)) {
            return ['success' => false, 'error' => 'Tujuan harus berupa remote rclone bernama, seperti remote:bucket/path.'];
        }
        $rclone = trim((string)@shell_exec('command -v rclone 2>/dev/null'));
        if ($rclone === '' || !is_executable($rclone)) {
            return ['success' => false, 'error' => 'rclone tidak ditemukan. Instal dan konfigurasi rclone untuk akun PHP/CLI.'];
        }
        $pruned = $this->pruneBackups();
        if (!($pruned['success'] ?? false)) {
            return ['success' => false, 'error' => $pruned['error'] ?? 'Retensi backup lokal gagal diterapkan.'];
        }

        $output = [];
        $code = 1;
        $retentionDays = $this->retentionPolicy()['days'];
        $deleteCommand = escapeshellarg($rclone) . ' delete --min-age ' . $retentionDays . 'd --include ' . escapeshellarg('*.sql.gz') . ' ' . escapeshellarg($remote) . ' 2>&1';
        @exec($deleteCommand, $output, $code);
        if ($code !== 0) {
            return ['success' => false, 'error' => 'Pembersihan arsip off-site gagal: ' . implode(' ', array_slice($output, -8)), 'code' => $code];
        }

        $output = [];
        $code = 1;
        $command = escapeshellarg($rclone) . ' copy --include ' . escapeshellarg('*.sql.gz') . ' ' . escapeshellarg($this->backupDir) . ' ' . escapeshellarg($remote) . ' 2>&1';
        @exec($command, $output, $code);
        return [
            'success' => $code === 0,
            'message' => $code === 0 ? 'Backup berhasil disalin ke tujuan off-site.' : null,
            'error' => $code === 0 ? null : 'Sinkronisasi off-site gagal: ' . implode(' ', array_slice($output, -8)),
            'code' => $code,
        ];
    }

    /** Restore only a panel-created archive and take a fresh snapshot before importing it. */
    public function restoreBackup(string $filename): array
    {
        if ($this->backupDir === '' || $filename !== basename($filename) || !preg_match('/^(pg|mysql)_(.+)_([0-9]{8}_[0-9]{6})_([a-f0-9]{6})\.sql\.gz$/D', $filename, $matches)) {
            return ['success' => false, 'error' => 'File backup tidak valid.', 'code' => 400];
        }
        $archive = $this->backupDir . '/' . $filename;
        if (is_link($archive) || !is_file($archive) || realpath(dirname($archive)) !== realpath($this->backupDir)) {
            return ['success' => false, 'error' => 'File backup tidak ditemukan.', 'code' => 404];
        }
        if (!function_exists('exec')) {
            return ['success' => false, 'error' => 'Restore membutuhkan fungsi exec yang tersedia pada PHP web.', 'code' => 503];
        }

        $type = $matches[1] === 'pg' ? 'postgresql' : 'mysql';
        $database = $matches[2];
        if ($type === 'postgresql') {
            $pg = $this->getPgConfig();
            $expected = substr(preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)$pg['database']), 0, 80);
            if ($database !== $expected || empty($pg['database'])) {
                return ['success' => false, 'error' => 'Backup PostgreSQL tidak cocok dengan database yang dikonfigurasi saat ini.', 'code' => 400];
            }
        } else {
            $pg = [];
            $database = preg_replace('/[^a-zA-Z0-9_-]/', '', $database);
            if ($database === '') return ['success' => false, 'error' => 'Nama database MySQL pada arsip tidak valid.', 'code' => 400];
        }

        $preRestore = $this->createBackup($type, $database, true);
        if (!($preRestore['success'] ?? false)) {
            return [
                'success' => false,
                'error' => 'Restore dibatalkan karena snapshot sebelum restore gagal dibuat: ' . ($preRestore['error'] ?? 'kesalahan tidak diketahui'),
                'code' => 500,
            ];
        }

        $errorFile = @tempnam($this->backupDir, '.musend-restore-error-');
        if ($errorFile === false || realpath(dirname($errorFile)) !== realpath($this->backupDir)) {
            if (is_string($errorFile)) @unlink($errorFile);
            return ['success' => false, 'error' => 'Gagal menyiapkan file diagnostik privat.', 'code' => 500, 'pre_restore_backup' => $preRestore['filename']];
        }
        @chmod($errorFile, 0600);

        $gzipCheck = [];
        $gzipCode = 1;
        @exec('gzip -t -- ' . escapeshellarg($archive) . ' 2>&1', $gzipCheck, $gzipCode);
        if ($gzipCode !== 0) {
            @unlink($errorFile);
            $this->pruneBackups([$filename, $preRestore['filename']]);
            return ['success' => false, 'error' => 'Arsip gzip rusak atau tidak dapat dibaca.', 'code' => 400, 'pre_restore_backup' => $preRestore['filename']];
        }

        $output = [];
        $code = 1;
        $pipeline = $this->restoreCommand($type, $archive, $database, $pg, $errorFile);
        @exec('bash -o pipefail -c ' . escapeshellarg($pipeline), $output, $code);
        $detail = trim(substr((string)@file_get_contents($errorFile), 0, 4096));
        $rolledBack = false;
        if ($code !== 0) {
            @file_put_contents($errorFile, '');
            $rollbackPath = $this->backupDir . '/' . $preRestore['filename'];
            $rollbackOutput = [];
            $rollbackCode = 1;
            $rollbackCommand = $this->restoreCommand($type, $rollbackPath, $database, $pg, $errorFile);
            @exec('bash -o pipefail -c ' . escapeshellarg($rollbackCommand), $rollbackOutput, $rollbackCode);
            $rolledBack = $rollbackCode === 0;
        }
        @unlink($errorFile);
        $this->pruneBackups([$filename, $preRestore['filename']]);

        if ($code !== 0) {
            return [
                'success' => false,
                'error' => 'Restore database gagal.' . ($detail !== '' ? ' ' . $detail : '') . ($rolledBack ? ' Kondisi sebelumnya berhasil dipulihkan.' : ' Pemulihan otomatis gagal; snapshot sebelum restore tersedia.'),
                'code' => 500,
                'pre_restore_backup' => $preRestore['filename'],
                'rolled_back' => $rolledBack,
            ];
        }
        return [
            'success' => true,
            'message' => "Database '{$database}' berhasil dipulihkan dari {$filename}.",
            'pre_restore_backup' => $preRestore['filename'],
        ];
    }

    private function restoreCommand(string $type, string $archive, string $database, array $pg, string $errorFile): string
    {
        if ($type === 'postgresql') {
            $connection = sprintf(
                '-X -v ON_ERROR_STOP=1 -h %s -p %d -U %s %s',
                escapeshellarg($pg['host']),
                (int)$pg['port'],
                escapeshellarg($pg['username']),
                escapeshellarg($pg['database'])
            );
            $clearSchema = sprintf(
                'PGPASSWORD=%s psql %s -c %s >/dev/null 2>%s',
                escapeshellarg($pg['password']),
                $connection,
                escapeshellarg('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'),
                escapeshellarg($errorFile)
            );
            $import = sprintf(
                'gzip -dc -- %s | PGPASSWORD=%s psql %s >/dev/null 2>>%s',
                escapeshellarg($archive),
                escapeshellarg($pg['password']),
                $connection,
                escapeshellarg($errorFile)
            );
            return $clearSchema . ' && set -o pipefail && ' . $import;
        }

        $dropTablesQuery = "SELECT `statement` FROM (SELECT 0 AS `sequence`, 'SET FOREIGN_KEY_CHECKS=0;' AS `statement` UNION ALL SELECT 1, CONCAT('DROP TABLE IF EXISTS `', REPLACE(TABLE_NAME, '`', '``'), '`;') FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' UNION ALL SELECT 2, 'SET FOREIGN_KEY_CHECKS=1;') AS `restore_commands` ORDER BY `sequence`";
        $clearTables = sprintf(
            'mysql --batch --skip-column-names --database=%s -e %s 2>>%s | mysql --database=%s 2>>%s',
            escapeshellarg($database),
            escapeshellarg($dropTablesQuery),
            escapeshellarg($errorFile),
            escapeshellarg($database),
            escapeshellarg($errorFile)
        );
        $import = sprintf(
            'gzip -dc -- %s | mysql --database=%s >/dev/null 2>>%s',
            escapeshellarg($archive),
            escapeshellarg($database),
            escapeshellarg($errorFile)
        );
        return 'set -o pipefail && ' . $clearTables . ' && ' . $import;
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

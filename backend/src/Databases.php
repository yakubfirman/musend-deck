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
        $this->homeDir = rtrim(getenv('HOME') ?: '/home/' . (get_current_user() ?: 'yakubfir'), '/');
        $this->backupDir = $this->homeDir . '/backups/db';
        if (!is_dir($this->backupDir)) {
            @mkdir($this->backupDir, 0755, true);
        }
    }

    /**
     * Get database credentials from api-yakubfirman/.env or config
     */
    private function getPgConfig(): array
    {
        $envFile = $this->homeDir . '/projects/api-yakubfirman/.env';
        $env = [];
        if (file_exists($envFile)) {
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

        try {
            $dsn = "pgsql:host={$pgConfig['host']};port={$pgConfig['port']};dbname={$pgConfig['database']};";
            $pdo = new PDO($dsn, $pgConfig['username'], $pgConfig['password'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT            => 3,
            ]);
            $pgData['connected'] = true;

            // Database size
            $stmt = $pdo->query("SELECT pg_database_size('{$pgConfig['database']}') as size;");
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
     * Create 1-click database dump/backup
     */
    public function createBackup(string $dbType = 'postgresql'): array
    {
        $timestamp = date('Ymd_His');
        if ($dbType === 'postgresql') {
            $pg = $this->getPgConfig();
            $filename = "pg_{$pg['database']}_{$timestamp}.sql.gz";
            $targetPath = $this->backupDir . '/' . $filename;

            $cmd = sprintf(
                'PGPASSWORD=%s pg_dump -h %s -p %d -U %s %s 2>&1 | gzip > %s',
                escapeshellarg($pg['password']),
                escapeshellarg($pg['host']),
                $pg['port'],
                escapeshellarg($pg['username']),
                escapeshellarg($pg['database']),
                escapeshellarg($targetPath)
            );

            @exec($cmd, $output, $code);

            if ($code === 0 && file_exists($targetPath) && filesize($targetPath) > 20) {
                return [
                    'success'  => true,
                    'filename' => $filename,
                    'size'     => filesize($targetPath),
                    'formatted_size' => $this->formatBytes(filesize($targetPath)),
                    'message'  => "Backup PostgreSQL '{$pg['database']}' berhasil dibuat.",
                ];
            }

            @unlink($targetPath);
            return [
                'success' => false,
                'error'   => 'Gagal mengeksekusi pg_dump: ' . implode(' ', $output),
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
        $files = glob($this->backupDir . '/*.sql.gz') ?: [];
        $results = [];

        foreach ($files as $file) {
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

        if (!file_exists($fullPath) || !str_ends_with($safeName, '.sql.gz')) {
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

        if (file_exists($fullPath)) {
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

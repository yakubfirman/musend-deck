<?php
declare(strict_types=1);

namespace ServerDeck;

class Files
{
    private string $rootDir;
    private int $maxUploadSize;

    public function __construct(array $config)
    {
        $rawRoot = $config['fs']['root_dir'] ?? (getenv('HOME') ?: '/home/yakubfir');
        $realRoot = realpath($rawRoot);
        $this->rootDir = $realRoot ? rtrim($realRoot, '/\\') : rtrim($rawRoot, '/\\');
        $this->maxUploadSize = (int)($config['fs']['max_upload_size'] ?? 64 * 1024 * 1024);
    }

    public function getRootDir(): string
    {
        return $this->rootDir;
    }

    public function resolvePath(string $relPath, bool $mustExist = true): ?string
    {
        // Normalize relative path
        $relPath = trim(str_replace(['\\', "\0"], ['/', ''], $relPath));
        $relPath = ltrim($relPath, '/');

        // Prevent direct tricks like "../"
        $parts = array_filter(explode('/', $relPath), function ($p) {
            return $p !== '' && $p !== '.';
        });

        $sanitizedParts = [];
        foreach ($parts as $part) {
            if ($part === '..') {
                if (empty($sanitizedParts)) {
                    // Attempting to go above root
                    return null;
                }
                array_pop($sanitizedParts);
            } else {
                $sanitizedParts[] = $part;
            }
        }

        $fullPath = $this->rootDir . (!empty($sanitizedParts) ? '/' . implode('/', $sanitizedParts) : '');

        if ($mustExist) {
            $real = realpath($fullPath);
            if ($real === false) {
                return null;
            }
            // Strict jail check
            if ($real !== $this->rootDir && !str_starts_with($real, $this->rootDir . DIRECTORY_SEPARATOR)) {
                return null;
            }
            return $real;
        }

        // For files yet to be created, check parent directory
        $parent = dirname($fullPath);
        $realParent = realpath($parent);
        if ($realParent === false) {
            return null;
        }
        if ($realParent !== $this->rootDir && !str_starts_with($realParent, $this->rootDir . DIRECTORY_SEPARATOR)) {
            return null;
        }

        return $fullPath;
    }

    public function list(string $relPath = ''): array
    {
        $targetDir = $this->resolvePath($relPath, true);
        if ($targetDir === null || !is_dir($targetDir)) {
            return [
                'success' => false,
                'error'   => 'Direktori tidak ditemukan atau akses ditolak.',
                'code'    => 404,
            ];
        }

        $entries = @scandir($targetDir);
        if ($entries === false) {
            return [
                'success' => false,
                'error'   => 'Gagal membaca direktori.',
                'code'    => 500,
            ];
        }

        $directories = [];
        $files = [];

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $full = $targetDir . DIRECTORY_SEPARATOR . $entry;
            $isDir = is_dir($full);
            $size = $isDir ? 0 : (@filesize($full) ?: 0);
            $mtime = @filemtime($full) ?: time();
            $perms = @fileperms($full);
            $octalPerms = $perms !== false ? substr(sprintf('%o', $perms), -4) : '0644';
            $ext = $isDir ? '' : strtolower(pathinfo($entry, PATHINFO_EXTENSION));

            $item = [
                'name'           => $entry,
                'path'           => $this->getRelativePath($full),
                'is_dir'         => $isDir,
                'size'           => $size,
                'formatted_size' => $isDir ? '-' : $this->formatBytes($size),
                'mtime'          => $mtime,
                'formatted_date' => date('Y-m-d H:i', $mtime),
                'perms'          => $octalPerms,
                'extension'      => $ext,
            ];

            if ($isDir) {
                $directories[] = $item;
            } else {
                $files[] = $item;
            }
        }

        // Sort alphabetically
        usort($directories, fn($a, $b) => strcasecmp($a['name'], $b['name']));
        usort($files, fn($a, $b) => strcasecmp($a['name'], $b['name']));

        // Build breadcrumbs
        $currentRel = $this->getRelativePath($targetDir);
        $breadcrumbs = $this->buildBreadcrumbs($currentRel);

        return [
            'success' => true,
            'data'    => [
                'current_path' => $currentRel,
                'root_name'    => basename($this->rootDir),
                'breadcrumbs'  => $breadcrumbs,
                'total_items'  => count($directories) + count($files),
                'items'        => array_merge($directories, $files),
            ],
        ];
    }

    public function read(string $relPath): array
    {
        $targetFile = $this->resolvePath($relPath, true);
        if ($targetFile === null || !is_file($targetFile)) {
            return [
                'success' => false,
                'error'   => 'File tidak ditemukan.',
                'code'    => 404,
            ];
        }

        $size = @filesize($targetFile) ?: 0;
        if ($size > 5 * 1024 * 1024) { // Max 5MB for in-browser editor
            return [
                'success' => false,
                'error'   => 'Ukuran file melebihi batas editor (Maks 5 MB).',
                'code'    => 413,
            ];
        }

        $content = @file_get_contents($targetFile);
        if ($content === false) {
            return [
                'success' => false,
                'error'   => 'Gagal membaca isi file.',
                'code'    => 500,
            ];
        }

        return [
            'success' => true,
            'data'    => [
                'path'      => $this->getRelativePath($targetFile),
                'name'      => basename($targetFile),
                'content'   => $content,
                'size'      => $size,
                'extension' => strtolower(pathinfo($targetFile, PATHINFO_EXTENSION)),
            ],
        ];
    }

    public function save(string $relPath, string $content): array
    {
        $targetFile = $this->resolvePath($relPath, false);
        if ($targetFile === null) {
            return [
                'success' => false,
                'error'   => 'Path file tidak valid atau berada di luar root.',
                'code'    => 403,
            ];
        }

        if (@file_put_contents($targetFile, $content, LOCK_EX) === false) {
            return [
                'success' => false,
                'error'   => 'Gagal menyimpan perubahan file.',
                'code'    => 500,
            ];
        }

        return [
            'success' => true,
            'message' => 'File berhasil disimpan.',
        ];
    }

    public function create(string $dirRel, string $name, string $type): array
    {
        $dir = $this->resolvePath($dirRel, true);
        if ($dir === null || !is_dir($dir)) {
            return [
                'success' => false,
                'error'   => 'Direktori target tidak ditemukan.',
                'code'    => 404,
            ];
        }

        $cleanName = trim(str_replace(['/', '\\', "\0"], '', $name));
        if ($cleanName === '') {
            return [
                'success' => false,
                'error'   => 'Nama tidak boleh kosong.',
                'code'    => 400,
            ];
        }

        $target = $dir . DIRECTORY_SEPARATOR . $cleanName;
        if (file_exists($target)) {
            return [
                'success' => false,
                'error'   => 'Nama file atau folder sudah digunakan.',
                'code'    => 409,
            ];
        }

        if ($type === 'dir') {
            if (!@mkdir($target, 0755, true)) {
                return [
                    'success' => false,
                    'error'   => 'Gagal membuat folder baru.',
                    'code'    => 500,
                ];
            }
        } else {
            if (@file_put_contents($target, '') === false) {
                return [
                    'success' => false,
                    'error'   => 'Gagal membuat file baru.',
                    'code'    => 500,
                ];
            }
        }

        return [
            'success' => true,
            'message' => ($type === 'dir' ? 'Folder' : 'File') . ' berhasil dibuat.',
        ];
    }

    public function delete(string $relPath): array
    {
        $target = $this->resolvePath($relPath, true);
        if ($target === null) {
            return [
                'success' => false,
                'error'   => 'Item tidak ditemukan.',
                'code'    => 404,
            ];
        }

        // Strict guard: NEVER delete the root jail itself
        if ($target === $this->rootDir) {
            return [
                'success' => false,
                'error'   => 'Dilarang menghapus root direktori.',
                'code'    => 403,
            ];
        }

        $success = is_dir($target) ? $this->deleteRecursive($target) : @unlink($target);
        if (!$success) {
            return [
                'success' => false,
                'error'   => 'Gagal menghapus item.',
                'code'    => 500,
            ];
        }

        return [
            'success' => true,
            'message' => 'Item berhasil dihapus.',
        ];
    }

    public function rename(string $oldRelPath, string $newName): array
    {
        $oldTarget = $this->resolvePath($oldRelPath, true);
        if ($oldTarget === null || $oldTarget === $this->rootDir) {
            return [
                'success' => false,
                'error'   => 'Item tidak valid untuk diubah namanya.',
                'code'    => 400,
            ];
        }

        $cleanName = trim(str_replace(['/', '\\', "\0"], '', $newName));
        if ($cleanName === '') {
            return [
                'success' => false,
                'error'   => 'Nama baru tidak boleh kosong.',
                'code'    => 400,
            ];
        }

        $newTarget = dirname($oldTarget) . DIRECTORY_SEPARATOR . $cleanName;
        if (file_exists($newTarget)) {
            return [
                'success' => false,
                'error'   => 'Nama target sudah digunakan.',
                'code'    => 409,
            ];
        }

        if (!@rename($oldTarget, $newTarget)) {
            return [
                'success' => false,
                'error'   => 'Gagal mengubah nama.',
                'code'    => 500,
            ];
        }

        return [
            'success' => true,
            'message' => 'Nama berhasil diperbarui.',
        ];
    }

    public function chmod(string $relPath, string $mode): array
    {
        $target = $this->resolvePath($relPath, true);
        if ($target === null) {
            return [
                'success' => false,
                'error'   => 'Item tidak ditemukan.',
                'code'    => 404,
            ];
        }

        // Parse octal mode e.g. "0755" or "755"
        $octal = octdec(ltrim($mode, '0'));
        if ($octal === 0) {
            return [
                'success' => false,
                'error'   => 'Mode permission tidak valid.',
                'code'    => 400,
            ];
        }

        if (!@chmod($target, (int)$octal)) {
            return [
                'success' => false,
                'error'   => 'Gagal mengubah permission.',
                'code'    => 500,
            ];
        }

        return [
            'success' => true,
            'message' => 'Permission berhasil diubah.',
        ];
    }

    public function upload(string $dirRel, array $files): array
    {
        $dir = $this->resolvePath($dirRel, true);
        if ($dir === null || !is_dir($dir)) {
            return [
                'success' => false,
                'error'   => 'Direktori tujuan tidak ditemukan.',
                'code'    => 404,
            ];
        }

        $uploadedCount = 0;
        $errors = [];

        // Normalize $_FILES structure
        $fileList = $this->normalizeFilesArray($files);

        foreach ($fileList as $file) {
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $errors[] = $file['name'] . ': upload error code ' . $file['error'];
                continue;
            }

            if ($file['size'] > $this->maxUploadSize) {
                $errors[] = $file['name'] . ': ukuran melebihi batas';
                continue;
            }

            $cleanName = basename($file['name']);
            $targetPath = $dir . DIRECTORY_SEPARATOR . $cleanName;

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                $uploadedCount++;
            } else {
                $errors[] = $cleanName . ': gagal memindahkan file';
            }
        }

        return [
            'success' => $uploadedCount > 0,
            'data'    => [
                'uploaded' => $uploadedCount,
                'errors'   => $errors,
            ],
            'message' => sprintf('%d file berhasil diunggah.', $uploadedCount),
        ];
    }

    public function zip(string $dirRel, array $items, string $zipName): array
    {
        if (!class_exists('\ZipArchive')) {
            return [
                'success' => false,
                'error'   => 'Ekstensi PHP ZipArchive tidak aktif pada server ini.',
                'code'    => 500,
            ];
        }

        $dir = $this->resolvePath($dirRel, true);
        if ($dir === null || !is_dir($dir)) {
            return [
                'success' => false,
                'error'   => 'Direktori asal tidak ditemukan.',
                'code'    => 404,
            ];
        }

        $cleanZipName = trim(str_replace(['/', '\\', "\0"], '', $zipName));
        if (!str_ends_with(strtolower($cleanZipName), '.zip')) {
            $cleanZipName .= '.zip';
        }

        $zipPath = $dir . DIRECTORY_SEPARATOR . $cleanZipName;
        $zip = new \ZipArchive();

        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return [
                'success' => false,
                'error'   => 'Gagal membuat file arsip ZIP.',
                'code'    => 500,
            ];
        }

        foreach ($items as $item) {
            $itemTarget = $this->resolvePath($item, true);
            if ($itemTarget === null) {
                continue;
            }

            $baseName = basename($itemTarget);
            if (is_dir($itemTarget)) {
                $this->addFolderToZip($zip, $itemTarget, $baseName);
            } else {
                $zip->addFile($itemTarget, $baseName);
            }
        }

        $zip->close();

        return [
            'success' => true,
            'message' => 'Arsip ZIP berhasil dibuat.',
        ];
    }

    public function unzip(string $relPath, ?string $destDirRel = null): array
    {
        if (!class_exists('\ZipArchive')) {
            return [
                'success' => false,
                'error'   => 'Ekstensi PHP ZipArchive tidak aktif pada server ini.',
                'code'    => 500,
            ];
        }

        $zipTarget = $this->resolvePath($relPath, true);
        if ($zipTarget === null || !is_file($zipTarget)) {
            return [
                'success' => false,
                'error'   => 'File arsip tidak ditemukan.',
                'code'    => 404,
            ];
        }

        $destination = $destDirRel ? $this->resolvePath($destDirRel, true) : dirname($zipTarget);
        if ($destination === null || !is_dir($destination)) {
            return [
                'success' => false,
                'error'   => 'Direktori tujuan ekstraksi tidak valid.',
                'code'    => 400,
            ];
        }

        $zip = new \ZipArchive();
        if ($zip->open($zipTarget) !== true) {
            return [
                'success' => false,
                'error'   => 'Gagal membuka file arsip ZIP.',
                'code'    => 500,
            ];
        }

        // Validate zip entries to prevent zip-slip traversal
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $filename = $zip->getNameIndex($i);
            if (str_contains($filename, '..')) {
                $zip->close();
                return [
                    'success' => false,
                    'error'   => 'Arsip berbahaya terdeteksi (path traversal attempt).',
                    'code'    => 403,
                ];
            }
        }

        $zip->extractTo($destination);
        $zip->close();

        return [
            'success' => true,
            'message' => 'Arsip berhasil diekstrak.',
        ];
    }

    public function download(string $relPath): void
    {
        $target = $this->resolvePath($relPath, true);
        if ($target === null || !is_file($target)) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'File tidak ditemukan']);
            exit;
        }

        $filename = basename($target);
        $filesize = filesize($target);

        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . addslashes($filename) . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . $filesize);

        // Stream file without loading entirely into PHP memory
        $handle = fopen($target, 'rb');
        if ($handle) {
            while (!feof($handle)) {
                echo fread($handle, 64 * 1024);
                flush();
            }
            fclose($handle);
        }
        exit;
    }

    private function getRelativePath(string $absPath): string
    {
        if ($absPath === $this->rootDir) {
            return '';
        }
        if (str_starts_with($absPath, $this->rootDir . DIRECTORY_SEPARATOR)) {
            return substr($absPath, strlen($this->rootDir) + 1);
        }
        return '';
    }

    private function buildBreadcrumbs(string $relPath): array
    {
        $crumbs = [
            ['name' => 'Home (~)', 'path' => '']
        ];

        if ($relPath === '') {
            return $crumbs;
        }

        $parts = explode('/', str_replace('\\', '/', $relPath));
        $accum = '';
        foreach ($parts as $p) {
            if ($p === '') continue;
            $accum = $accum === '' ? $p : $accum . '/' . $p;
            $crumbs[] = [
                'name' => $p,
                'path' => $accum,
            ];
        }

        return $crumbs;
    }

    private function deleteRecursive(string $dir): bool
    {
        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            if (is_dir($path)) {
                $this->deleteRecursive($path);
            } else {
                @unlink($path);
            }
        }
        return @rmdir($dir);
    }

    private function addFolderToZip(\ZipArchive $zip, string $folder, string $localPath): void
    {
        $zip->addEmptyDir($localPath);
        $files = scandir($folder);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            $full = $folder . DIRECTORY_SEPARATOR . $file;
            $subLocal = $localPath . '/' . $file;
            if (is_dir($full)) {
                $this->addFolderToZip($zip, $full, $subLocal);
            } else {
                $zip->addFile($full, $subLocal);
            }
        }
    }

    private function normalizeFilesArray(array $files): array
    {
        $normalized = [];
        if (!isset($files['name'])) {
            return $normalized;
        }

        if (is_array($files['name'])) {
            $count = count($files['name']);
            for ($i = 0; $i < $count; $i++) {
                $normalized[] = [
                    'name'     => $files['name'][$i],
                    'type'     => $files['type'][$i] ?? '',
                    'tmp_name' => $files['tmp_name'][$i],
                    'error'    => $files['error'][$i],
                    'size'     => $files['size'][$i],
                ];
            }
        } else {
            $normalized[] = $files;
        }

        return $normalized;
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, 1) . ' ' . $units[$pow];
    }
}

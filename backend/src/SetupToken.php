<?php
declare(strict_types=1);

namespace ServerDeck;

final class SetupToken
{
    public static function privateDirectory(string $appDir): ?string
    {
        $uid = function_exists('posix_geteuid') ? posix_geteuid() : getmyuid();
        $tempRoot = realpath(sys_get_temp_dir() ?: '/tmp');
        if ($tempRoot === false || !is_dir($tempRoot)) {
            return null;
        }
        $tempRoot = rtrim($tempRoot, DIRECTORY_SEPARATOR);
        $canonicalAppDir = realpath($appDir) ?: $appDir;
        $appKey = substr(hash('sha256', $canonicalAppDir), 0, 24);
        $privateDir = $tempRoot . '/musend-deck-' . $uid . '-' . $appKey;
        if (!is_dir($privateDir)) {
            @mkdir($privateDir, 0700, true);
        }

        if (is_link($privateDir) || !is_dir($privateDir) || realpath($privateDir) !== $privateDir || @fileowner($privateDir) !== $uid) {
            return null;
        }
        @chmod($privateDir, 0700);
        $permissions = @fileperms($privateDir);
        if ($permissions === false || ($permissions & 0777) !== 0700 || !is_writable($privateDir)) {
            return null;
        }

        return $privateDir;
    }

    public static function privatePath(string $appDir, string $fileName): ?string
    {
        if (!preg_match('/^[a-zA-Z0-9._-]+$/', $fileName)) {
            return null;
        }
        $directory = self::privateDirectory($appDir);
        return $directory === null ? null : $directory . '/' . $fileName;
    }

    private static function tokenFile(string $appDir): ?string
    {
        return self::privatePath($appDir, 'setup.token');
    }

    public static function exists(string $appDir): bool
    {
        $path = self::tokenFile($appDir);
        return $path !== null && is_file($path) && !is_link($path) && is_readable($path);
    }

    /** Create or return the per-install secret. Intended for CLI installation only. */
    public static function issue(string $appDir): string
    {
        $path = self::tokenFile($appDir);
        if ($path === null || is_link($path)) {
            throw new \RuntimeException('Tidak dapat membuat token setup privat.');
        }
        $handle = @fopen($path, 'c+');
        if ($handle === false || !flock($handle, LOCK_EX)) {
            if (is_resource($handle)) {
                fclose($handle);
            }
            throw new RuntimeException('Tidak dapat membuat token setup privat.');
        }

        rewind($handle);
        $token = trim((string)stream_get_contents($handle));
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            $token = bin2hex(random_bytes(32));
            rewind($handle);
            ftruncate($handle, 0);
            $written = fwrite($handle, $token . "\n");
            $flushed = fflush($handle);
            if ($written === false || $written !== strlen($token . "\n") || !$flushed) {
                flock($handle, LOCK_UN);
                fclose($handle);
                throw new RuntimeException('Tidak dapat menyimpan token setup privat.');
            }
        }

        @chmod($path, 0600);
        flock($handle, LOCK_UN);
        fclose($handle);
        return $token;
    }

    public static function verify(string $appDir, string $candidate): bool
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $candidate)) {
            return false;
        }

        $path = self::tokenFile($appDir);
        if ($path === null || !is_file($path) || is_link($path) || !is_readable($path)) {
            return false;
        }

        $stored = trim((string)@file_get_contents($path));
        return preg_match('/^[a-f0-9]{64}$/', $stored) === 1 && hash_equals($stored, $candidate);
    }

    public static function consume(string $appDir): void
    {
        $path = self::tokenFile($appDir);
        if ($path !== null && !is_link($path)) {
            @unlink($path);
        }
    }
}

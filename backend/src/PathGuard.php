<?php
declare(strict_types=1);

namespace ServerDeck;

/** Shared path policy for the File Manager's home-directory boundary. */
final class PathGuard
{
    public static function homeDir(): string
    {
        $uid = function_exists('posix_geteuid')
            ? posix_geteuid()
            : (function_exists('posix_getuid') ? posix_getuid() : null);
        $entry = $uid !== null && function_exists('posix_getpwuid') ? posix_getpwuid($uid) : false;
        $candidates = [
            is_array($entry) ? ($entry['dir'] ?? '') : '',
            getenv('HOME') ?: '',
        ];

        foreach ($candidates as $candidate) {
            if ($candidate === '') {
                continue;
            }
            $real = @realpath($candidate);
            if ($real !== false && is_dir($real)) {
                return rtrim($real, DIRECTORY_SEPARATOR) ?: DIRECTORY_SEPARATOR;
            }
        }

        $cwd = @realpath(getcwd() ?: '.');
        return $cwd !== false ? $cwd : DIRECTORY_SEPARATOR;
    }

    public static function isWithin(string $path, string $root): bool
    {
        $root = rtrim($root, DIRECTORY_SEPARATOR) ?: DIRECTORY_SEPARATOR;
        if ($path === $root) {
            return true;
        }
        if ($root === DIRECTORY_SEPARATOR) {
            return str_starts_with($path, DIRECTORY_SEPARATOR);
        }
        return str_starts_with($path, $root . DIRECTORY_SEPARATOR);
    }

    /** Return a canonical root only when it is a directory inside the OS user's home. */
    public static function resolveRoot(?string $requested): ?string
    {
        $home = self::homeDir();
        $candidate = trim((string)$requested);
        if ($candidate === '') {
            return $home;
        }

        $real = realpath($candidate);
        if ($real === false || !is_dir($real) || !self::isWithin($real, $home)) {
            return null;
        }

        return rtrim($real, DIRECTORY_SEPARATOR) ?: DIRECTORY_SEPARATOR;
    }
}

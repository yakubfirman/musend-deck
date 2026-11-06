<?php
declare(strict_types=1);

namespace ServerDeck;

/** Small private, bounded audit trail for panel actions. Payloads and secrets are never recorded. */
final class AuditLog
{
    private const MAX_ENTRIES = 1000;

    private static function path(string $appDir): ?string
    {
        return SetupToken::privatePath($appDir, 'audit.json');
    }

    public static function record(string $appDir, array $event): void
    {
        $path = self::path($appDir);
        if ($path === null || is_link($path)) {
            return;
        }

        $handle = @fopen($path, 'c+');
        if ($handle === false || !flock($handle, LOCK_EX)) {
            if (is_resource($handle)) fclose($handle);
            return;
        }

        @chmod($path, 0600);
        rewind($handle);
        $existing = json_decode((string)stream_get_contents($handle), true);
        $entries = is_array($existing) ? $existing : [];
        $entries[] = [
            'time' => time(),
            'user' => isset($event['user']) ? substr((string)$event['user'], 0, 80) : null,
            'ip' => isset($event['ip']) ? substr((string)$event['ip'], 0, 64) : 'unknown',
            'action' => substr((string)($event['action'] ?? 'unknown'), 0, 80),
            'status' => (int)($event['status'] ?? 0),
            'success' => (bool)($event['success'] ?? false),
        ];
        $entries = array_slice($entries, -self::MAX_ENTRIES);

        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($entries, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        fflush($handle);
        flock($handle, LOCK_UN);
        fclose($handle);
    }

    public static function recent(string $appDir, int $limit = 100): array
    {
        $path = self::path($appDir);
        if ($path === null || is_link($path) || !is_file($path)) {
            return [];
        }

        $handle = @fopen($path, 'rb');
        if ($handle === false || !flock($handle, LOCK_SH)) {
            if (is_resource($handle)) fclose($handle);
            return [];
        }
        $entries = json_decode((string)stream_get_contents($handle), true);
        flock($handle, LOCK_UN);
        fclose($handle);

        if (!is_array($entries)) {
            return [];
        }
        return array_reverse(array_slice($entries, -max(1, min(200, $limit))));
    }
}

<?php
declare(strict_types=1);

// This entry point is intended for cron/CLI only; it never exposes config data over HTTP.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

spl_autoload_register(static function (string $class): void {
    $prefix = 'ServerDeck\\';
    if (str_starts_with($class, $prefix)) {
        $file = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) require_once $file;
    }
});

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    fwrite(STDERR, "Musend Deck belum dikonfigurasi.\n");
    exit(2);
}

$config = require $configFile;
$database = new \ServerDeck\Databases($config);
$command = $argv[1] ?? 'backups:maintain';

if (!in_array($command, ['backups:create', 'backups:prune', 'backups:sync', 'backups:maintain'], true)) {
    fwrite(STDERR, "Pemakaian: php maintenance.php [backups:create|backups:prune|backups:sync|backups:maintain]\n");
    exit(2);
}

$failed = false;
if (in_array($command, ['backups:create', 'backups:maintain'], true)) {
    $result = $database->createScheduledBackups();
    echo 'Create: ' . json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    $failed = !($result['success'] ?? false);
}

if (in_array($command, ['backups:create', 'backups:prune', 'backups:maintain'], true)) {
    $result = $database->pruneBackups();
    echo 'Prune: ' . json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    $failed = $failed || !($result['success'] ?? false);
}

if (in_array($command, ['backups:sync', 'backups:maintain'], true)) {
    $result = $database->syncBackupsOffsite();
    echo 'Off-site: ' . json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    $failed = $failed || !($result['success'] ?? false);
}

exit($failed ? 1 : 0);

<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/PathGuard.php';
require_once __DIR__ . '/../src/RuntimeChecks.php';
require_once __DIR__ . '/../src/Files.php';

use ServerDeck\Files;
use ServerDeck\PathGuard;
use ServerDeck\RuntimeChecks;

function expect(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

expect(PathGuard::isWithin('/srv/account', '/srv/account'), 'the root path must be within itself');
expect(PathGuard::isWithin('/srv/account/project', '/srv/account'), 'a child path must be within its root');
expect(!PathGuard::isWithin('/srv/account-backup', '/srv/account'), 'a sibling with a shared prefix must be outside the root');
expect(PathGuard::isWithin('/var/tmp', '/'), 'the filesystem root must contain absolute paths');

$home = PathGuard::homeDir();
expect(PathGuard::resolveRoot($home) === $home, 'the canonical account home must be an allowed root');
$files = new Files(['fs' => ['root_dir' => $home]]);
expect($files->resolvePath('') === $home, 'the File Manager must resolve its configured root');
expect($files->resolvePath('../outside-home') === null, 'the File Manager must reject traversal above its root');
expect(RuntimeChecks::systemUserName() !== '', 'system user label must never be empty');

$report = RuntimeChecks::report();
expect(is_bool($report['ready'] ?? null), 'preflight must expose an overall readiness value');
expect(is_array($report['checks'] ?? null), 'preflight must expose its checks');

$ids = [];
foreach ($report['checks'] as $check) {
    expect(is_array($check), 'each preflight check must be an object-like array');
    expect(is_string($check['id'] ?? null) && $check['id'] !== '', 'each check needs a stable id');
    expect(is_string($check['label'] ?? null) && $check['label'] !== '', 'each check needs a user-facing label');
    expect(in_array($check['status'] ?? null, ['pass', 'warn', 'fail'], true), 'check status must be supported by the Setup Wizard');
    expect(is_bool($check['required'] ?? null), 'each check must declare whether it is required');
    expect(is_string($check['detail'] ?? null) && $check['detail'] !== '', 'each check needs an actionable detail');
    $ids[] = $check['id'];
}

expect(count($ids) === count(array_unique($ids)), 'preflight check ids must be unique');
$requiredFailures = array_filter(
    $report['checks'],
    static fn(array $check): bool => $check['required'] && $check['status'] !== 'pass'
);
expect($report['ready'] === (count($requiredFailures) === 0), 'readiness must match required check results');
echo 'PHP checks passed (' . count($ids) . ' preflight checks).'.PHP_EOL;

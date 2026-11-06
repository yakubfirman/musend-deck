<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/PathGuard.php';
require_once __DIR__ . '/../src/RuntimeChecks.php';
require_once __DIR__ . '/../src/Files.php';
require_once __DIR__ . '/../src/SetupToken.php';
require_once __DIR__ . '/../src/Auth.php';

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

$_SERVER['REMOTE_ADDR'] = '203.0.113.42';
$ipAuth = new \ServerDeck\Auth(['auth' => [
    'allowed_ips' => ['203.0.113.0/24'],
    'trusted_proxies' => [],
]]);
expect($ipAuth->ipMatchesCidr('203.0.113.42', '203.0.113.0/24'), 'IPv4 CIDR allowlist must include addresses in its network');
expect(!$ipAuth->ipMatchesCidr('203.0.114.42', '203.0.113.0/24'), 'IPv4 CIDR allowlist must reject addresses outside its network');
expect($ipAuth->ipMatchesCidr('2001:db8::42', '2001:db8::/48'), 'IPv6 CIDR allowlist must match IPv6 addresses');
expect($ipAuth->ipMatchesCidr('2001:db8::42', '2001:0db8:0:0:0:0:0:42'), 'exact IPv6 allowlist entries must match equivalent address notation');
expect($ipAuth->isClientIpAllowed(), 'the client address in the configured CIDR must be allowed');
$blockedIpAuth = new \ServerDeck\Auth(['auth' => [
    'allowed_ips' => ['198.51.100.0/24'],
    'trusted_proxies' => [],
]]);
expect(!$blockedIpAuth->isClientIpAllowed(), 'the allowlist must reject a client outside every configured network');

$home = PathGuard::homeDir();
expect(PathGuard::resolveRoot($home) === $home, 'the canonical account home must be an allowed root');
$testDir = $home . '/.musend-test-' . bin2hex(random_bytes(6));
expect(@mkdir($testDir, 0700), 'the File Manager pagination fixture directory must be created');
for ($i = 0; $i < 25; $i++) {
    file_put_contents($testDir . '/item-' . str_pad((string)$i, 2, '0', STR_PAD_LEFT), 'test');
}
$pagedFiles = new Files(['fs' => ['root_dir' => $testDir]]);
$firstPage = $pagedFiles->list('', 0, 20)['data'];
$secondPage = $pagedFiles->list('', 20, 20)['data'];
expect(count($firstPage['items']) === 20, 'the first file listing page must be limited to the requested size');
expect($firstPage['has_more'] === true && $firstPage['total_items'] === 25, 'the first file listing page must expose total count and continuation state');
expect(count($secondPage['items']) === 5 && $secondPage['has_more'] === false, 'the final file listing page must contain only remaining items');
foreach (glob($testDir . '/*') ?: [] as $fixture) {
    if (is_file($fixture) && !is_link($fixture)) @unlink($fixture);
}
@rmdir($testDir);
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

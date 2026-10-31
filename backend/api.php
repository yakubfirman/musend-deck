<?php
declare(strict_types=1);

/**
 * ServerDeck Micro REST API Router
 * Ultra-Lightweight & Zero-Daemon PHP 8.2+ Backend
 */

// 1. Error & Exception Handling
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// 2. CORS handling for local Vite development
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && (str_contains($origin, 'localhost') || str_contains($origin, '127.0.0.1'))) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 3. Simple Zero-Vendor SPL Autoloader
spl_autoload_register(function (string $class): void {
    $prefix = 'ServerDeck\\';
    if (str_starts_with($class, $prefix)) {
        $relativeClass = substr($class, strlen($prefix));
        $file = __DIR__ . '/src/' . str_replace('\\', '/', $relativeClass) . '.php';
        if (file_exists($file)) {
            require_once $file;
        }
    }
});

// 4. Load Configuration
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    $configFile = __DIR__ . '/config.sample.php';
}
$config = require $configFile;

// 5. Initialize Core Classes
$auth     = new \ServerDeck\Auth($config);
$metrics  = new \ServerDeck\Metrics($config);
$files    = new \ServerDeck\Files($config);
$system   = new \ServerDeck\System($config);
$deployer = new \ServerDeck\Deployer($config);
$database = new \ServerDeck\Databases($config);
$domains  = new \ServerDeck\Domains($config);
$cron     = new \ServerDeck\CronManager($config);
$security = new \ServerDeck\SecurityAuditor($config);

// 6. Resolve Route Action & Method
$action = $_GET['action'] ?? $_GET['endpoint'] ?? '';
if ($action === '' && !empty($_SERVER['PATH_INFO'])) {
    $action = trim($_SERVER['PATH_INFO'], '/');
}
$action = strtolower(trim($action));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Parse JSON request body if present
$rawBody = file_get_contents('php://input');
$body = [];
if (!empty($rawBody)) {
    $decoded = json_decode($rawBody, true);
    if (is_array($decoded)) {
        $body = $decoded;
    }
}
$input = array_merge($_GET, $_POST, $body);

// Helper function to send JSON response
function jsonResponse(array $response, int $httpStatus = 200): void {
    http_response_code($httpStatus);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// 7. Route Handling

// Route: Auth Check (Public)
if ($action === 'auth/check' && $method === 'GET') {
    $isAuth = $auth->isAuthenticated();
    jsonResponse([
        'success'         => true,
        'authenticated'   => $isAuth,
        'username'        => $isAuth ? $auth->getUser() : null,
        'csrf_token'      => $auth->getCsrfToken(),
    ]);
}

// Route: Auth Login (Public)
if ($action === 'auth/login' && $method === 'POST') {
    $username = (string)($input['username'] ?? '');
    $password = (string)($input['password'] ?? '');
    $result = $auth->login($username, $password);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// --- Protected Routes Guard ---
if (!$auth->isAuthenticated()) {
    jsonResponse([
        'success' => false,
        'error'   => 'Sesi telah berakhir atau belum terautentikasi.',
        'code'    => 401,
    ], 401);
}

// CSRF Verification for all state-mutating requests
if ($method === 'POST') {
    $clientCsrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $input['csrf_token'] ?? null;
    if (!$auth->verifyCsrf($clientCsrf)) {
        jsonResponse([
            'success' => false,
            'error'   => 'Validasi CSRF token gagal. Silakan muat ulang halaman.',
            'code'    => 403,
        ], 403);
    }
}

// Route: Auth Logout
if ($action === 'auth/logout' && $method === 'POST') {
    jsonResponse($auth->logout());
}

// Route: Hosting Resource Metrics
if ($action === 'stats' && $method === 'GET') {
    $force = !empty($_GET['force']);
    $data = $metrics->getMetrics($force);
    jsonResponse([
        'success' => true,
        'data'    => $data,
    ]);
}

// Route: Files List
if ($action === 'files/list' && $method === 'GET') {
    $path = (string)($input['path'] ?? '');
    $result = $files->list($path);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Files Read Text
if ($action === 'files/read' && $method === 'GET') {
    $path = (string)($input['path'] ?? '');
    $result = $files->read($path);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Files Save Text
if ($action === 'files/save' && $method === 'POST') {
    $path = (string)($input['path'] ?? '');
    $content = (string)($input['content'] ?? '');
    $result = $files->save($path, $content);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Files Create File/Folder
if ($action === 'files/create' && $method === 'POST') {
    $dir = (string)($input['dir'] ?? '');
    $name = (string)($input['name'] ?? '');
    $type = (string)($input['type'] ?? 'file');
    $result = $files->create($dir, $name, $type);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Files Delete
if ($action === 'files/delete' && $method === 'POST') {
    $path = (string)($input['path'] ?? '');
    $result = $files->delete($path);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Files Rename
if ($action === 'files/rename' && $method === 'POST') {
    $oldPath = (string)($input['old_path'] ?? '');
    $newName = (string)($input['new_name'] ?? '');
    $result = $files->rename($oldPath, $newName);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Files Chmod
if ($action === 'files/chmod' && $method === 'POST') {
    $path = (string)($input['path'] ?? '');
    $mode = (string)($input['mode'] ?? '0644');
    $result = $files->chmod($path, $mode);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Files Upload
if ($action === 'files/upload' && $method === 'POST') {
    $dir = (string)($input['dir'] ?? '');
    $uploaded = $_FILES['files'] ?? [];
    $result = $files->upload($dir, $uploaded);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Files Download
if ($action === 'files/download' && $method === 'GET') {
    $path = (string)($input['path'] ?? '');
    $files->download($path);
    exit;
}

// Route: Files ZIP
if ($action === 'files/zip' && $method === 'POST') {
    $dir = (string)($input['dir'] ?? '');
    $items = (array)($input['items'] ?? []);
    $zipName = (string)($input['zip_name'] ?? 'archive.zip');
    $result = $files->zip($dir, $items, $zipName);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Files UNZIP
if ($action === 'files/unzip' && $method === 'POST') {
    $path = (string)($input['path'] ?? '');
    $destDir = !empty($input['dest_dir']) ? (string)$input['dest_dir'] : null;
    $result = $files->unzip($path, $destDir);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Processes List
if ($action === 'processes/list' && $method === 'GET') {
    $result = $system->listProcesses();
    jsonResponse($result);
}

// Route: Processes Kill
if ($action === 'processes/kill' && $method === 'POST') {
    $pid = (int)($input['pid'] ?? 0);
    $signal = (int)($input['signal'] ?? 15);
    $result = $system->killProcess($pid, $signal);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Terminal Run
if ($action === 'terminal/run' && $method === 'POST') {
    $cmd = (string)($input['cmd'] ?? '');
    $cwd = (string)($input['cwd'] ?? '');
    $result = $system->runTerminal($cmd, $cwd);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Logs Tail
if ($action === 'logs/tail' && $method === 'GET') {
    $type = (string)($input['type'] ?? 'error');
    $lines = (int)($input['lines'] ?? 100);
    $result = $system->tailLog($type, $lines);
    jsonResponse($result);
}

// Route: Settings Change Password
if ($action === 'settings/password' && $method === 'POST') {
    $oldPass = (string)($input['old_password'] ?? '');
    $newPass = (string)($input['new_password'] ?? '');

    if (strlen($newPass) < 6) {
        jsonResponse([
            'success' => false,
            'error'   => 'Kata sandi baru minimal 6 karakter.',
            'code'    => 400,
        ], 400);
    }

    $loginCheck = $auth->login($auth->getUser() ?? '', $oldPass);
    if (!$loginCheck['success']) {
        jsonResponse([
            'success' => false,
            'error'   => 'Kata sandi lama tidak tepat.',
            'code'    => 400,
        ], 400);
    }

    // Update config.php
    $newHash = password_hash($newPass, PASSWORD_BCRYPT);
    $configContent = file_get_contents($configFile);
    $pattern = "/'password_hash'\s*=>\s*'[^']*'/";
    $replacement = "'password_hash' => '{$newHash}'";

    if (preg_match($pattern, $configContent)) {
        $updated = preg_replace($pattern, $replacement, $configContent);
        if (@file_put_contents($configFile, $updated, LOCK_EX)) {
            jsonResponse([
                'success' => true,
                'message' => 'Kata sandi berhasil diperbarui.',
            ]);
        }
    }

    jsonResponse([
        'success' => false,
        'error'   => 'Gagal memperbarui file config.php.',
        'code'    => 500,
    ], 500);
}

// Route: Deployment Projects List
if ($action === 'deploy/projects' && $method === 'GET') {
    jsonResponse($deployer->getProjects());
}

// Route: Deployment Start
if ($action === 'deploy/start' && $method === 'POST') {
    $target = (string)($input['target'] ?? 'web');
    $result = $deployer->startDeployment($target);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Deployment Status Poll
if ($action === 'deploy/status' && $method === 'GET') {
    $id = (string)($input['id'] ?? '');
    $result = $deployer->getDeploymentStatus($id);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Database Overview
if ($action === 'db/overview' && $method === 'GET') {
    jsonResponse($database->getOverview());
}

// Route: Database Backup (1-Click)
if ($action === 'db/backup' && $method === 'POST') {
    $dbType = (string)($input['type'] ?? 'postgresql');
    $result = $database->createBackup($dbType);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Database Download Backup File
if ($action === 'db/download' && $method === 'GET') {
    $file = (string)($input['file'] ?? '');
    $database->downloadBackup($file);
    exit;
}

// Route: Database Delete Backup File
if ($action === 'db/delete' && $method === 'POST') {
    $file = (string)($input['file'] ?? '');
    $result = $database->deleteBackup($file);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Domains & SSL Monitoring
if ($action === 'domains/ssl' && $method === 'GET') {
    jsonResponse($domains->getDomainsAndSsl());
}

// Route: Cron Jobs List
if ($action === 'cron/list' && $method === 'GET') {
    jsonResponse($cron->listJobs());
}

// Route: Cron Job Add
if ($action === 'cron/add' && $method === 'POST') {
    $expr = (string)($input['expression'] ?? '');
    $cmd = (string)($input['command'] ?? '');
    $comment = (string)($input['comment'] ?? '');
    $result = $cron->addJob($expr, $cmd, $comment);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Cron Job Toggle
if ($action === 'cron/toggle' && $method === 'POST') {
    $idx = (int)($input['index'] ?? 0);
    $result = $cron->toggleJob($idx);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Cron Job Delete
if ($action === 'cron/delete' && $method === 'POST') {
    $idx = (int)($input['index'] ?? 0);
    $result = $cron->deleteJob($idx);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Cron Job Test Run
if ($action === 'cron/test' && $method === 'POST') {
    $cmd = (string)($input['command'] ?? '');
    $result = $cron->testRun($cmd);
    jsonResponse($result, $result['code'] ?? ($result['success'] ? 200 : 400));
}

// Route: Security Audit
if ($action === 'security/audit' && $method === 'GET') {
    jsonResponse($security->audit());
}

// Route: Security 1-Click Fix Permissions
if ($action === 'security/fix' && $method === 'POST') {
    jsonResponse($security->fixPermissions());
}

// Route: Metrics 24h Trend History
if ($action === 'stats/history' && $method === 'GET') {
    jsonResponse([
        'success' => true,
        'data'    => $metrics->getHistory(),
    ]);
}

// Route: Housekeeping Status
if ($action === 'system/housekeep/status' && $method === 'GET') {
    jsonResponse($system->getHousekeepingStatus());
}

// Route: Housekeeping Clean
if ($action === 'system/housekeep/clean' && $method === 'POST') {
    jsonResponse($system->runHousekeeping());
}

// 8. Fallback 404 for unknown endpoint
jsonResponse([
    'success' => false,
    'error'   => "Endpoint '{$action}' tidak ditemukan.",
    'code'    => 404,
], 404);

<?php
declare(strict_types=1);

namespace ServerDeck;

class Auth
{
    private array $config;
    private string $rateLimitFile;

    public function __construct(array $config)
    {
        $this->config = $config;
        $tempDir = $config['cache']['temp_dir'] ?? sys_get_temp_dir();
        $this->rateLimitFile = rtrim($tempDir, '/\\') . '/serverdeck_rate_limit.json';
        $this->initSession();
    }

    private function initSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

            session_set_cookie_params([
                'lifetime' => 86400 * 7, // 7 days
                'path'     => '/',
                'domain'   => '',
                'secure'   => $isHttps,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);

            session_start();
        }

        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
    }

    public function getCsrfToken(): string
    {
        return $_SESSION['csrf_token'] ?? '';
    }

    public function verifyCsrf(?string $token): bool
    {
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        if (empty($sessionToken) || empty($token)) {
            return false;
        }
        return hash_equals($sessionToken, $token);
    }

    public function isAuthenticated(): bool
    {
        return !empty($_SESSION['serverdeck_user']);
    }

    public function getUser(): ?string
    {
        return $_SESSION['serverdeck_user'] ?? null;
    }

    public function login(string $username, string $password): array
    {
        $clientIp = $this->getClientIp();

        if ($this->isRateLimited($clientIp)) {
            return [
                'success' => false,
                'error'   => 'Terlalu banyak percobaan login gagal. Silakan coba lagi dalam 5 menit.',
                'code'    => 429,
            ];
        }

        $expectedUser = $this->config['auth']['username'] ?? 'admin';
        $expectedHash = $this->config['auth']['password_hash'] ?? '';
        $tolerateDot  = !empty($this->config['auth']['tolerate_trailing_dot']);

        // Case-insensitive username check
        if (strcasecmp(trim($username), trim($expectedUser)) !== 0) {
            $this->recordFailedAttempt($clientIp);
            return [
                'success' => false,
                'error'   => 'Kredensial tidak valid.',
                'code'    => 401,
            ];
        }

        // Verify password with optional trailing dot tolerance
        $passwordMatches = $this->verifyPassword($password, $expectedHash);

        if (!$passwordMatches && $tolerateDot) {
            if (str_ends_with($password, '.')) {
                $passwordMatches = $this->verifyPassword(substr($password, 0, -1), $expectedHash);
            } else {
                $passwordMatches = $this->verifyPassword($password . '.', $expectedHash);
            }
        }

        if (!$passwordMatches) {
            $this->recordFailedAttempt($clientIp);
            return [
                'success' => false,
                'error'   => 'Kredensial tidak valid.',
                'code'    => 401,
            ];
        }

        // Login success
        $this->clearRateLimit($clientIp);
        session_regenerate_id(true);

        $_SESSION['serverdeck_user'] = $expectedUser;
        $_SESSION['csrf_token']      = bin2hex(random_bytes(32));

        return [
            'success' => true,
            'data'    => [
                'username'   => $expectedUser,
                'csrf_token' => $_SESSION['csrf_token'],
            ],
            'message' => 'Login berhasil',
        ];
    }

    public function logout(): array
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }
        session_destroy();

        return [
            'success' => true,
            'message' => 'Sesi telah diakhiri.',
        ];
    }

    private function verifyPassword(string $input, string $storedHash): bool
    {
        $devPlain = $this->config['auth']['dev_plain_password'] ?? null;
        if (!empty($devPlain) && hash_equals($devPlain, $input)) {
            return true;
        }

        if (str_starts_with($storedHash, '$2y$') || str_starts_with($storedHash, '$2a$') || str_starts_with($storedHash, '$argon2')) {
            return password_verify($input, $storedHash);
        }
        // Fallback for plain text in dev config
        return hash_equals($storedHash, $input);
    }

    private function getClientIp(): string
    {
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            return $_SERVER['HTTP_CF_CONNECTING_IP'];
        }
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($parts[0]);
        }
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    private function isRateLimited(string $ip): bool
    {
        $data = $this->readRateLimitData();
        if (!isset($data[$ip])) {
            return false;
        }

        $record = $data[$ip];
        if (time() > $record['locked_until']) {
            return false;
        }

        return $record['attempts'] >= 5;
    }

    private function recordFailedAttempt(string $ip): void
    {
        $data = $this->readRateLimitData();
        $now = time();

        if (!isset($data[$ip]) || $now > ($data[$ip]['locked_until'] ?? 0)) {
            $data[$ip] = [
                'attempts'     => 1,
                'first_failed' => $now,
                'locked_until' => $now + 300, // 5 min window
            ];
        } else {
            $data[$ip]['attempts']++;
            if ($data[$ip]['attempts'] >= 5) {
                $data[$ip]['locked_until'] = $now + 300; // Lock for 5 min
            }
        }

        // Clean expired entries
        foreach ($data as $storedIp => $rec) {
            if ($now > $rec['locked_until'] + 3600) {
                unset($data[$storedIp]);
            }
        }

        $this->writeRateLimitData($data);
    }

    private function clearRateLimit(string $ip): void
    {
        $data = $this->readRateLimitData();
        if (isset($data[$ip])) {
            unset($data[$ip]);
            $this->writeRateLimitData($data);
        }
    }

    private function readRateLimitData(): array
    {
        if (!file_exists($this->rateLimitFile)) {
            return [];
        }
        $content = @file_get_contents($this->rateLimitFile);
        if (!$content) {
            return [];
        }
        $json = json_decode($content, true);
        return is_array($json) ? $json : [];
    }

    public function setSessionUser(string $username): string
    {
        session_regenerate_id(true);
        $_SESSION['serverdeck_user'] = $username;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        return $_SESSION['csrf_token'];
    }

    private function writeRateLimitData(array $data): void
    {
        @file_put_contents($this->rateLimitFile, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
    }
}

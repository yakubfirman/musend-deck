<?php
declare(strict_types=1);

namespace ServerDeck;

class Auth
{
    private array $config;
    private ?string $rateLimitFile;

    public function __construct(array $config)
    {
        $this->config = $config;
        $this->rateLimitFile = SetupToken::privatePath(dirname(__DIR__), 'login-rate.json');
        $this->initSession();
    }

    private function initSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
            $remoteIp = filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP);
            $trustedProxies = $this->config['auth']['trusted_proxies'] ?? [];
            if (
                !$isHttps
                && $remoteIp !== false
                && is_array($trustedProxies)
                && $this->isTrustedProxy($remoteIp, $trustedProxies)
            ) {
                $forwardedProto = strtolower(trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
                $isHttps = $forwardedProto === 'https';
            }

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

    public function verifyCurrentPassword(string $password): bool
    {
        $storedHash = $this->config['auth']['password_hash'] ?? '';
        return $this->verifyPassword($password, $storedHash);
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
        // Case-insensitive username check
        if (strcasecmp(trim($username), trim($expectedUser)) !== 0) {
            $this->recordFailedAttempt($clientIp);
            return [
                'success' => false,
                'error'   => 'Kredensial tidak valid.',
                'code'    => 401,
            ];
        }

        $passwordMatches = $this->verifyPassword($password, $expectedHash);

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
        if ($input === '' || strlen($input) > 72 || $storedHash === '' || password_get_info($storedHash)['algo'] === null) {
            return false;
        }
        return password_verify($input, $storedHash);
    }

    private function getClientIp(): string
    {
        $remoteIp = filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP);
        if ($remoteIp === false) {
            return '127.0.0.1';
        }

        $trustedProxies = $this->config['auth']['trusted_proxies'] ?? [];
        if (!is_array($trustedProxies) || !$this->isTrustedProxy($remoteIp, $trustedProxies)) {
            return $remoteIp;
        }

        $cloudflareIp = filter_var($_SERVER['HTTP_CF_CONNECTING_IP'] ?? '', FILTER_VALIDATE_IP);
        if ($cloudflareIp !== false) {
            return $cloudflareIp;
        }

        $forwarded = array_values(array_filter(array_map('trim', explode(',', (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))),
            fn(string $ip): bool => filter_var($ip, FILTER_VALIDATE_IP) !== false
        ));
        $forwarded[] = $remoteIp;

        // Walk from the trusted proxy inward; the first non-trusted hop is the client.
        for ($i = count($forwarded) - 1; $i >= 0; $i--) {
            if (!$this->isTrustedProxy($forwarded[$i], $trustedProxies)) {
                return $forwarded[$i];
            }
        }

        return $remoteIp;
    }

    private function isTrustedProxy(string $ip, array $trustedProxies): bool
    {
        foreach ($trustedProxies as $entry) {
            if (!is_string($entry) || $entry === '') {
                continue;
            }

            if (!str_contains($entry, '/')) {
                if (hash_equals($entry, $ip)) {
                    return true;
                }
                continue;
            }

            [$network, $prefixText] = explode('/', $entry, 2);
            $ipBytes = @inet_pton($ip);
            $networkBytes = @inet_pton($network);
            if ($ipBytes === false || $networkBytes === false || strlen($ipBytes) !== strlen($networkBytes)) {
                continue;
            }

            $prefix = filter_var($prefixText, FILTER_VALIDATE_INT);
            $maxBits = strlen($ipBytes) * 8;
            if ($prefix === false || $prefix < 0 || $prefix > $maxBits) {
                continue;
            }

            $wholeBytes = intdiv($prefix, 8);
            $remainingBits = $prefix % 8;
            if (substr($ipBytes, 0, $wholeBytes) !== substr($networkBytes, 0, $wholeBytes)) {
                continue;
            }
            if ($remainingBits === 0) {
                return true;
            }

            $mask = (0xff << (8 - $remainingBits)) & 0xff;
            if ((ord($ipBytes[$wholeBytes]) & $mask) === (ord($networkBytes[$wholeBytes]) & $mask)) {
                return true;
            }
        }

        return false;
    }

    private function isRateLimited(string $ip): bool
    {
        if ($this->rateLimitFile === null || is_link($this->rateLimitFile)) {
            return true;
        }
        $handle = @fopen($this->rateLimitFile, 'c+');
        if ($handle === false || !flock($handle, LOCK_SH)) {
            if (is_resource($handle)) fclose($handle);
            return true;
        }
        @chmod($this->rateLimitFile, 0600);
        rewind($handle);
        $content = stream_get_contents($handle);
        flock($handle, LOCK_UN);
        fclose($handle);
        $data = json_decode((string)$content, true);
        $data = is_array($data) ? $data : [];
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
        $this->updateRateLimitData(function (array &$data) use ($ip): void {
            $now = time();
            if (!isset($data[$ip]) || $now > ($data[$ip]['locked_until'] ?? 0)) {
                $data[$ip] = [
                    'attempts'     => 1,
                    'first_failed' => $now,
                    'locked_until' => $now + 300,
                ];
            } else {
                $data[$ip]['attempts']++;
                if ($data[$ip]['attempts'] >= 5) {
                    $data[$ip]['locked_until'] = $now + 300;
                }
            }

            foreach ($data as $storedIp => $record) {
                if ($now > ($record['locked_until'] ?? 0) + 3600) {
                    unset($data[$storedIp]);
                }
            }
        });
    }

    private function clearRateLimit(string $ip): void
    {
        $this->updateRateLimitData(function (array &$data) use ($ip): void {
            unset($data[$ip]);
        });
    }

    private function updateRateLimitData(callable $mutator): void
    {
        if ($this->rateLimitFile === null || is_link($this->rateLimitFile)) {
            return;
        }
        $handle = @fopen($this->rateLimitFile, 'c+');
        if ($handle === false || !flock($handle, LOCK_EX)) {
            if (is_resource($handle)) fclose($handle);
            return;
        }

        @chmod($this->rateLimitFile, 0600);
        rewind($handle);
        $data = json_decode((string)stream_get_contents($handle), true);
        $data = is_array($data) ? $data : [];
        $mutator($data);

        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($data, JSON_UNESCAPED_SLASHES));
        fflush($handle);
        flock($handle, LOCK_UN);
        fclose($handle);
    }

    public function setSessionUser(string $username): string
    {
        session_regenerate_id(true);
        $_SESSION['serverdeck_user'] = $username;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        return $_SESSION['csrf_token'];
    }
}

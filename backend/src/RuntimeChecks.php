<?php
declare(strict_types=1);

namespace ServerDeck;

/** Environment checks shared by the Setup Wizard and installer diagnostics. */
final class RuntimeChecks
{
    public static function systemUserName(): string
    {
        if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) {
            $entry = @posix_getpwuid(posix_geteuid());
            if (is_array($entry) && !empty($entry['name'])) {
                return (string)$entry['name'];
            }
        }

        foreach ([getenv('USER'), get_current_user()] as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return 'unknown';
    }

    public static function report(): array
    {
        $hasPosix = function_exists('posix_geteuid') && function_exists('posix_getpwuid');
        $uid = $hasPosix ? @posix_geteuid() : null;
        $home = PathGuard::homeDir();
        $openBasedirPaths = self::openBasedirPaths();
        $openBasedirCoreAllowed = self::pathAllowedByOpenBasedir(dirname(__DIR__), $openBasedirPaths)
            && self::pathAllowedByOpenBasedir(sys_get_temp_dir(), $openBasedirPaths);
        $openBasedirHomeAllowed = self::pathAllowedByOpenBasedir(self::homeDirCandidate($home), $openBasedirPaths);
        $pdoDrivers = class_exists('PDO') ? \PDO::getAvailableDrivers() : [];
        $supportedPdoDrivers = array_values(array_intersect(['mysql', 'pgsql'], $pdoDrivers));

        $checks = [
            self::check(
                'php-version',
                'PHP 8.2 atau lebih baru',
                version_compare(PHP_VERSION, '8.2.0', '>=') ? 'pass' : 'fail',
                true,
                version_compare(PHP_VERSION, '8.2.0', '>=')
                    ? 'Versi PHP web memenuhi minimum.'
                    : 'Perbarui PHP web ke versi 8.2 atau lebih baru.'
            ),
            self::check(
                'json',
                'Ekstensi JSON',
                function_exists('json_encode') && function_exists('json_decode') ? 'pass' : 'fail',
                true,
                'JSON dipakai oleh API dan antarmuka.'
            ),
            self::check(
                'posix',
                'Identitas akun Linux (POSIX)',
                $hasPosix ? 'pass' : 'fail',
                true,
                $hasPosix
                    ? 'PHP dapat memeriksa identitas dan hak akun yang menjalankan panel.'
                    : 'Aktifkan ekstensi POSIX pada PHP web; panel perlu memastikan proses tidak berjalan sebagai root.'
            ),
            self::check(
                'non-root',
                'Akun PHP non-root',
                !$hasPosix ? 'fail' : ($uid === 0 ? 'fail' : 'pass'),
                true,
                !$hasPosix
                    ? 'Pemeriksaan akun belum dapat dilakukan tanpa POSIX.'
                    : ($uid === 0
                        ? 'Setup diblokir karena panel tidak boleh berjalan sebagai root.'
                        : 'Panel berjalan dengan akun Linux non-root.')
            ),
            self::check(
                'app-writable',
                'Direktori aplikasi dapat ditulis',
                @is_writable(dirname(__DIR__)) ? 'pass' : 'fail',
                true,
                @is_writable(dirname(__DIR__))
                    ? 'Direktori aplikasi dapat menyimpan konfigurasi saat setup.'
                    : 'Berikan izin tulis pada direktori instalasi kepada akun PHP.'
            ),
            self::check(
                'temp-writable',
                'Direktori sementara dapat ditulis',
                @is_writable(sys_get_temp_dir()) ? 'pass' : 'fail',
                true,
                @is_writable(sys_get_temp_dir())
                    ? 'Penyimpanan token dan cache sementara tersedia.'
                    : 'Akun PHP perlu direktori sementara yang dapat ditulis.'
            ),
            self::check(
                'open-basedir',
                'Akses aplikasi dan direktori sementara',
                $openBasedirCoreAllowed ? 'pass' : 'fail',
                true,
                $openBasedirCoreAllowed
                    ? 'Direktori aplikasi dan sementara dapat diakses PHP.'
                    : 'Tambahkan direktori aplikasi dan sementara ke daftar open_basedir PHP web.'
            ),
            self::check(
                'home-access',
                'Akses home akun',
                $openBasedirHomeAllowed ? 'pass' : 'warn',
                false,
                $openBasedirHomeAllowed
                    ? 'PHP dapat mengakses home akun.'
                    : 'open_basedir membatasi home akun; periksa root File Manager setelah setup.'
            ),
            self::check('proc-open', 'Fungsi proc_open', function_exists('proc_open') ? 'pass' : 'warn', false,
                function_exists('proc_open') ? 'Terminal dan uji jalankan cron tersedia.' : 'Terminal dan uji jalankan cron memerlukan proc_open.'),
            self::check('shell-exec', 'Fungsi shell_exec', function_exists('shell_exec') ? 'pass' : 'warn', false,
                function_exists('shell_exec') ? 'Pembacaan metrik dan proses shell tersedia.' : 'Metrik berbasis perintah shell dan beberapa fitur sistem dapat terbatas.'),
            self::check('exec', 'Fungsi exec', function_exists('exec') ? 'pass' : 'warn', false,
                function_exists('exec') ? 'Integrasi Git dan crontab dapat dijalankan.' : 'Deployment Git dan pengelolaan cron dapat terbatas.'),
            self::check('zip', 'Ekstensi ZIP', extension_loaded('zip') ? 'pass' : 'warn', false,
                extension_loaded('zip') ? 'Kompresi dan ekstraksi ZIP tersedia.' : 'Aktifkan ekstensi ZIP untuk fitur arsip file.'),
            self::check('pdo-drivers', 'Driver PDO MySQL/PostgreSQL', count($supportedPdoDrivers) > 0 ? 'pass' : 'warn', false,
                count($supportedPdoDrivers) > 0
                    ? 'Driver tersedia: ' . implode(', ', $supportedPdoDrivers) . '.'
                    : 'Aktifkan driver PDO MySQL atau PostgreSQL untuk koneksi database yang sesuai.'),
            self::check('curl', 'Ekstensi cURL', extension_loaded('curl') ? 'pass' : 'warn', false,
                extension_loaded('curl') ? 'Pemeriksaan HTTP domain tersedia.' : 'Pemeriksaan kesehatan HTTP domain memerlukan ekstensi cURL.'),
            self::check('bash', 'Perintah Bash', self::hasExecutable('bash') ? 'pass' : 'warn', false,
                self::hasExecutable('bash') ? 'Shell Bash tersedia untuk terminal.' : 'Terminal memerlukan Bash.'),
            self::check('git', 'Perintah Git', self::hasExecutable('git') ? 'pass' : 'warn', false,
                self::hasExecutable('git') ? 'Integrasi dan deployment Git tersedia.' : 'Instal Git untuk memakai fitur deployment.'),
            self::check('crontab', 'Perintah crontab', self::hasExecutable('crontab') ? 'pass' : 'warn', false,
                self::hasExecutable('crontab') ? 'Pengelolaan cron tersedia.' : 'Fitur cron memerlukan crontab dan izin akun hosting.'),
            self::check('ps', 'Perintah ps', self::hasExecutable('ps') ? 'pass' : 'warn', false,
                self::hasExecutable('ps') ? 'Daftar proses dapat dibaca.' : 'Daftar dan terminasi proses memerlukan perintah ps.'),
            self::check('gzip', 'Perintah gzip', self::hasExecutable('gzip') ? 'pass' : 'warn', false,
                self::hasExecutable('gzip') ? 'Kompresi backup database tersedia.' : 'Backup database terkompresi memerlukan gzip.'),
            self::check('pg-dump', 'Perintah pg_dump', self::hasExecutable('pg_dump') ? 'pass' : 'warn', false,
                self::hasExecutable('pg_dump') ? 'Backup PostgreSQL tersedia.' : 'Backup PostgreSQL memerlukan pg_dump.'),
            self::check('mysql-dump', 'Perintah mysqldump', self::hasExecutable('mysqldump') ? 'pass' : 'warn', false,
                self::hasExecutable('mysqldump') ? 'Backup MySQL/MariaDB tersedia.' : 'Backup MySQL/MariaDB memerlukan mysqldump.'),
            self::check('uapi', 'Perintah cPanel UAPI', self::hasExecutable('uapi') ? 'pass' : 'warn', false,
                self::hasExecutable('uapi') ? 'Integrasi discovery cPanel tersedia.' : 'Discovery hosting melalui UAPI hanya tersedia pada cPanel.'),
        ];

        $ready = true;
        foreach ($checks as $check) {
            if ($check['required'] && $check['status'] !== 'pass') {
                $ready = false;
                break;
            }
        }

        return ['ready' => $ready, 'checks' => $checks];
    }

    private static function check(string $id, string $label, string $status, bool $required, string $detail): array
    {
        return compact('id', 'label', 'status', 'required', 'detail');
    }

    private static function openBasedirPaths(): ?array
    {
        $setting = trim((string)ini_get('open_basedir'));
        if ($setting === '') {
            return null;
        }

        $allowedPaths = [];
        foreach (explode(PATH_SEPARATOR, $setting) as $candidate) {
            $candidate = trim($candidate);
            if ($candidate === '') {
                continue;
            }
            $realCandidate = @realpath($candidate);
            if ($realCandidate !== false) {
                $allowedPaths[] = $realCandidate;
            }
        }

        return $allowedPaths;
    }

    private static function pathAllowedByOpenBasedir(string $path, ?array $allowedPaths): bool
    {
        return $allowedPaths === null || self::pathAllowed($path, $allowedPaths);
    }

    private static function homeDirCandidate(string $fallback): string
    {
        $environmentHome = getenv('HOME');
        if (is_string($environmentHome) && trim($environmentHome) !== '') {
            return trim($environmentHome);
        }

        if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) {
            $entry = @posix_getpwuid(posix_geteuid());
            if (is_array($entry) && !empty($entry['dir'])) {
                return (string)$entry['dir'];
            }
        }

        return $fallback;
    }

    private static function pathAllowed(string $path, array $allowedPaths): bool
    {
        $realPath = @realpath($path);
        if ($realPath === false) {
            return false;
        }

        foreach ($allowedPaths as $allowedPath) {
            if (PathGuard::isWithin($realPath, $allowedPath)) {
                return true;
            }
        }

        return false;
    }

    private static function hasExecutable(string $name): bool
    {
        $path = getenv('PATH') ?: '';
        foreach (explode(PATH_SEPARATOR, $path) as $directory) {
            $candidate = $directory . DIRECTORY_SEPARATOR . $name;
            if ($directory !== '' && @is_file($candidate) && @is_executable($candidate)) {
                return true;
            }
        }

        return false;
    }
}

# Hosting Compatibility

Musend Deck runs through the PHP runtime provided by the web server. The PHP CLI used during installation can differ from PHP-FPM or the web server's PHP handler, so use the Setup Wizard's preflight results as the source of truth for the web runtime.

## Required for setup

| Requirement | Why it is needed |
|---|---|
| Linux and PHP 8.2 or newer | Supported runtime and operating system |
| PHP JSON functions | API request and response encoding |
| PHP POSIX identity functions | Confirm the PHP process runs as a non-root account |
| Non-root PHP account | Shell and file operations inherit this account's permissions |
| Writable application directory | Initial setup writes `config.php` |
| Writable system temporary directory | Private setup token and cache storage |
| `open_basedir` access | If enabled, it must allow the application and temporary directory |

## Optional feature dependencies

| Feature | Dependencies that may be needed |
|---|---|
| Web Console and cron test-run | `proc_open`, Bash; `exec` and `shell_exec` may also be restricted by the host |
| Process and resource information | `shell_exec`, `exec`, and the `ps` command; CloudLinux data additionally needs cPanel UAPI |
| Deployment Center | `exec` or `shell_exec`, Git, and the project's configured deploy script and runtimes |
| ZIP create/extract | PHP ZIP extension (`ZipArchive`) |
| Database inspection | A supported PDO driver (`mysql` or `pgsql`) or the relevant hosting integration |
| Compressed database backups | `exec`, Bash, `gzip`, and `pg_dump` or `mysqldump` for the selected database |
| Domain HTTP checks | PHP cURL extension |
| cPanel domain/database discovery | `uapi` command available to the PHP account |
| Full home-directory File Manager access | The account home must also be allowed by `open_basedir` |

Some shared hosts disable process functions or hide host utilities from PHP-FPM. Those restrictions can leave the panel usable while limiting the corresponding feature. The Setup Wizard reports required blockers and optional feature warnings without exposing server paths.

## Web server

- **Apache / LiteSpeed:** the supplied `.htaccess` adds access restrictions. Confirm that the host allows the required directives.
- **Nginx:** Nginx ignores `.htaccess`; apply and scope [`backend/nginx-security.conf.example`](../backend/nginx-security.conf.example) to the panel's document root.
- **Subfolder installs:** use the correct document root and keep the panel's security rules scoped to that install path.

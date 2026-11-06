# Backup and Recovery

Musend Deck stores database archives in `~/backups/db/`. The folder is kept private to the Linux account; generated archive files use mode `0600`.

## Retention and off-site copies

The default policy keeps up to 20 archives per database and removes files older than 30 days. Merge this top-level entry into the array returned by `config.php`:

```php
'backup' => [
    'retention_days' => 30,
    'max_backups' => 20,
    'rclone_remote' => 'offsite:musend-deck/backups',
],
```

An empty `rclone_remote` disables off-site copying. For off-site storage, install and configure `rclone` for the same Linux account that runs PHP and cron. Keep remote credentials in rclone's private configuration, not in `config.php`. Use a dedicated remote directory for Musend Deck: maintenance removes matching `*.sql.gz` archives older than the configured retention period, then copies the current local archives. A crypt remote can encrypt archives before they leave the host.

Schedule daily backups, pruning, and off-site copies with the hosting account's crontab:

```cron
30 2 * * * /usr/bin/php /absolute/path/to/maintenance.php backups:maintain >> /home/ACCOUNT/logs/musend-deck-maintenance.log 2>&1
```

Replace the PHP executable and paths with the values for the hosting account. Run the same command manually once to confirm that PHP CLI can read `config.php`, discover the databases, and access the configured `rclone` remote.

Other maintenance commands are available:

```bash
php /absolute/path/to/maintenance.php backups:create
php /absolute/path/to/maintenance.php backups:prune
php /absolute/path/to/maintenance.php backups:sync
```

`backups:create` backs up the configured PostgreSQL database and MySQL/MariaDB databases returned by cPanel UAPI. `backups:prune` applies the configured age and per-database count limits. `backups:sync` applies local retention, then copies archives to `rclone_remote` when configured; remote cleanup applies the age limit.

## Restore

The Database Manager lists local archives and provides a restore action. It requires typing the archive filename exactly. Before importing, Musend Deck creates a fresh snapshot of the current database. If the import fails, it attempts to restore that snapshot and reports whether recovery succeeded. Keep a separate off-site copy for recovery if the host account or disk is unavailable.

Restore replaces database objects represented by the selected dump. Do not close the page or interrupt the host process during import. For a large archive or a constrained PHP-FPM timeout, restore it from SSH with the native database tools instead.

## Deployment rollback

Deployment history and logs are retained privately for up to seven days. To enable a project rollback action, provide an executable script at `~/bin/rollback-<target>`, for example `~/bin/rollback-web`. The script should restore the release that the project considers safe; Musend Deck does not infer deployment layouts or alter project-specific release directories.

## Installer recovery

Before switching the active installation, `install.sh` stages the new files and moves the previous document root into a hidden, mode-`0700` sibling directory named `.musend-deck-recovery-*`. If the switch fails, the installer moves the old directory back. Keep the recovery directory until the updated panel has been checked. It contains the previous `config.php` and should not be shared or moved into a public location.

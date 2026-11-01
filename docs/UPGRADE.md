# Upgrade and Recovery

The installer can update a directory it recognizes as a Musend Deck installation. It copies the new application assets and backend source over existing files, preserves `config.php`, and does not remove files that are no longer part of the release. The process is not atomic, so keep a restorable backup until the updated panel has been checked.

## Before an upgrade

1. Schedule a short maintenance window and make sure you have SSH access.
2. Back up the entire Musend Deck document root to a private location outside the web root. Include `config.php`, `.htaccess`, `api.php`, `src/`, and the frontend assets.
3. Keep a copy of the exact source revision or release archive you are about to install.
4. Confirm the PHP CLI account is the same Linux account that owns the installation and runs PHP-FPM.

## Upgrade from a source checkout

In a clean checkout of the release you want to install:

```bash
git fetch --tags
git checkout <release-tag>
npm --prefix frontend ci
npm --prefix frontend run build
bash install.sh /absolute/path/to/musend-deck
```

Pass the existing Musend Deck document root as the final argument. The installer checks for a managed Musend Deck install before replacing its frontend and backend application files. It does not overwrite `config.php`; review `.htaccess` changes manually if the target has custom web-server rules.

## Verify the upgrade

- Open the panel and confirm login and `auth/check` work.
- Check the hosting preflight and run a basic file listing.
- Verify the features you rely on, such as ZIP operations, database access, cron, and deployment.
- Review server error logs for PHP errors before closing the maintenance window.

## Roll back

If verification fails, restore the complete document-root backup from before the upgrade, including the old frontend assets, `api.php`, `src/`, `.htaccess`, and `config.php`. Restoring only `config.php` is not a complete rollback. Keep the failed release and sanitized logs available for diagnosis.

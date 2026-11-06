# Upgrade and Recovery

The installer can update a directory it recognizes as a Musend Deck installation. It first stages the new application files, preserves `config.php` and custom files, then switches the document root. A brief gap can occur during the directory rename. The previous document root is kept under `~/.musend-deck-recovery/` with mode `0700`; if that location cannot be created, the installer leaves a hidden sibling recovery directory with mode `0700`. If activation fails, the installer moves the previous directory back. Files no longer included in the release are preserved in the staged copy.

## Before an upgrade

1. Schedule a short maintenance window and make sure you have SSH access.
2. Make a separate backup of the entire Musend Deck document root to a private location. Include `config.php`, `.htaccess`, `api.php`, `src/`, and the frontend assets. The installer recovery copy is an extra recovery point, not a replacement for your backup.
3. Keep a copy of the exact source revision or release archive you are about to install.
4. Confirm the PHP CLI account is the same Linux account that owns the installation and runs PHP-FPM.

## Upgrade from a source checkout

In a clean checkout of the release you want to install:

Replace `<release-tag>` and `/absolute/path/to/musend-deck` with the tag and document-root path for your installation before running the commands.

```bash
git fetch --tags
git checkout <release-tag>
npm --prefix frontend ci
npm --prefix frontend run build
bash install.sh /absolute/path/to/musend-deck
```

Pass the existing Musend Deck document root as the final argument. The installer checks for a managed Musend Deck install before replacing its frontend and backend application files. It preserves `config.php`, custom files, and custom `.htaccess` content while adding current panel security rules where missing. Keep the recovery directory until the upgrade is verified.

## Verify the upgrade

- Open the panel and confirm login and `auth/check` work.
- Check the hosting preflight and run a basic file listing.
- Verify the features you rely on, such as ZIP operations, database access, cron, and deployment.
- Review server error logs for PHP errors before closing the maintenance window.

## Roll back

If verification fails, restore the recovery copy from `~/.musend-deck-recovery/` or the separate backup, including the old frontend assets, `api.php`, `src/`, `.htaccess`, and `config.php`. Restoring only `config.php` is not a complete rollback. Keep the failed release and sanitized logs available for diagnosis.

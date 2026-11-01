# Contributing to Musend Deck

Thanks for helping improve Musend Deck. Bug reports, documentation fixes, compatibility notes, and code contributions are welcome.

## Before you start

- Search existing issues before opening a duplicate.
- For a large change, open an issue or discussion first so the scope can be agreed on.
- Never include passwords, setup tokens, `.env` contents, private hostnames, or unredacted logs in an issue or pull request.
- Keep pull requests focused and describe the user-visible impact.

## Local development

Requirements: Node.js 20 or newer, npm, PHP 8.2 or newer, and a non-root Linux account for exercising server features.

```bash
npm --prefix frontend ci
php backend/setup-token.php
php -S 127.0.0.1:8000 -t backend
```

Copy the printed one-time token into the Setup Wizard when prompted.

In another terminal:

```bash
npm --prefix frontend run dev
```

The Vite development server proxies API requests to the PHP server. Some features need host utilities such as Bash, Git, `crontab`, `ps`, `pg_dump`, or `mysqldump`; their availability depends on the local environment.

## Checks before submitting

```bash
npm --prefix frontend run build
php backend/tests/run.php
find backend -type f -name '*.php' -print0 | xargs -0 -n 1 php -l
bash -n install.sh
bash -n scripts/build-package.sh
shellcheck install.sh scripts/build-package.sh
```

The CI workflow runs the frontend build and PHP checks on PHP 8.2 through 8.5. Include manual verification steps for behavior that the automated checks cannot cover, especially file operations, deployment, and hosting-specific integrations.

## Pull requests

Please include:

- A short explanation of the problem and the change.
- The commands you ran and their results.
- Screenshots for visible UI changes, with private server details removed.
- Any hosting limitations or configuration changes that users need to know about.

Do not commit generated `frontend/dist` files, local configuration, credentials, setup tokens, or server logs.

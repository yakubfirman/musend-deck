# Musend Deck

<p align="center">
  <img src="frontend/public/icon-192x192.png" alt="Musend Deck Logo" width="110" height="110" />
</p>

<h1 align="center">Musend Deck</h1>

<p align="center">
  <strong>Modern PHP On-Demand Server & Hosting Cockpit</strong>
</p>

<p align="center">
  A lightweight, self-hosted server management platform designed for Linux Shared Hosting, Cloud Instances, and VPS environments.
</p>

<p align="center">
  <a href="https://php.net"><img src="https://img.shields.io/badge/PHP-8.2%2B-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP 8.2+" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" /></a>
  <a href="https://vite.dev"><img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://web.dev/progressive-web-apps/"><img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Ready" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-security">Security</a> •
  <a href="#-license">License</a>
</p>

---

## Overview

**Musend Deck** is a modern, self-hosted server management and hosting control platform built around a PHP on-demand architecture.

It provides a centralized interface for managing server resources, files, deployments, databases, domains, scheduled tasks, and security configurations without requiring a permanently running application daemon.

Designed specifically for Linux environments, Musend Deck aims to make server management more accessible, efficient, and resource-conscious — including on environments with limited privileges, such as Linux Shared Hosting.

### Why Musend Deck?

Traditional server management platforms often rely on persistent application services and elevated system privileges.

Musend Deck takes a different approach:

- **PHP On-Demand:** API requests are handled by PHP-FPM or the PHP runtime provided by the web server.
- **No Permanent Application Daemon:** No dedicated Node.js, Python, or Go application daemon is required.
- **Non-Root Operation:** Designed to operate under a dedicated, unprivileged Linux account.
- **Resource-Conscious:** Avoids keeping a separate application service running continuously.
- **Unified Management:** Combines essential server management tools in one modern web interface.
- **Self-Hosted:** Your application and server management data remain within your own hosting environment.

---

## Features

Musend Deck brings together essential server management capabilities in a single dashboard.

### 01. Web Console

An interactive browser-based terminal for executing Linux commands directly through your hosting environment.

- Persistent working directory between command executions.
- Interactive directory navigation (`cd`, `cd ..`, `cd ~`).
- Smart Tab autocomplete for files, directories, and available utilities.
- Interactive breadcrumb navigation.
- Command history with Up/Down arrow navigation.
- Keyboard shortcuts, including `Ctrl + L` to clear the terminal.
- Shell execution under the operating system account running PHP.

> Terminal commands inherit the permissions of the PHP operating system account. The panel is not an OS-level sandbox, and restricted command lists are only an additional safeguard.

### 02. Real-Time Server Monitoring

Monitor server resource utilization through a centralized telemetry dashboard.

- CPU utilization monitoring.
- Memory and RAM usage.
- Process information.
- Disk utilization and storage monitoring.
- Available I/O metrics.
- CloudLinux UAPI integration when supported by the hosting environment.
- Historical telemetry visualization using interactive SVG charts.
- Up to 96 collected telemetry samples.

Metrics that cannot be retrieved from the hosting environment are identified separately rather than presented as actual measurements.

### 03. File Manager & Code Editor

A built-in file management environment with an integrated source code editor.

- Grid and table file browsing modes.
- File filtering by type and category.
- File upload and download.
- File permission management (`chmod`).
- ZIP archive creation and extraction.
- Integrated CodeMirror 6 editor.
- Syntax support for PHP, JavaScript, TypeScript, HTML, CSS, JSON, YAML, and Markdown.
- Directory navigation and file operations.

### 04. Deployment Center

Simplify application deployment through an integrated deployment management interface.

- Automatic project discovery inside `~/projects/`.
- Framework detection for Laravel, Astro, Next.js, React/Vite, Node.js, and PHP Native.
- Git repository information:
  - Current branch.
  - Latest commit hash.
  - Commit message.
  - Commit author.
  - Repository status (clean/dirty).
- One-click deployment through configured deployment scripts.
- Automated Git pull and build processes where configured.
- Real-time deployment output and execution logs.

> Deployment execution depends on the deployment scripts and runtime tools configured on the server.

### 05. Database Inspector & Backup

Manage and inspect database information without leaving the dashboard.

- PostgreSQL support.
- MySQL and MariaDB support.
- Database connection discovery from project `.env` files or panel configuration.
- Database table listing.
- Estimated row counts.
- Table storage size information.
- One-click compressed SQL backup (`.sql.gz`).
- Backup archive management.
- Backup download and deletion.

### 06. Domain & SSL Monitor

Monitor configured domains and SSL certificate expiration.

- Automatic domain discovery.
- Main domain, addon domain, and subdomain detection.
- SSL certificate expiration monitoring.
- Remaining certificate validity calculation.
- Pending SSL issuance status detection.
- HTTP/HTTPS response health checks.
- Live ping and latency testing.

### 07. Cron Jobs Manager

Manage scheduled Linux tasks through a graphical interface.

- Read existing crontab entries.
- Create and edit scheduled tasks.
- Enable and disable scheduled jobs.
- Delete existing cron entries.
- Human-readable cron expression translation.
- Command test-run before saving scheduled tasks.

Example:

`*/15 * * * *` → Every 15 minutes.

### 08. Security Auditor

Inspect selected security-related configurations and file permissions.

- World-writable permission detection.
- SSH directory permission checks.
- `.env` file permission checks.
- PHP root execution detection.
- Selected web server security configuration checks.
- Security score calculation.
- Permission Normalizer for selected file and directory permissions.
- Optional `.htaccess` security rule management.

> Security checks cover selected account-level conditions and should not be considered a complete security audit or penetration test.

### 09. Housekeeping & Storage Optimizer

Keep the hosting environment cleaner by managing selected temporary resources.

- Detect outdated JavaScript and CSS build assets.
- Remove obsolete deployment artifacts.
- Clean temporary telemetry metric files older than 24 hours.
- Help reduce unnecessary disk and inode consumption.

### 10. PWA & Command Palette

Access Musend Deck through a modern application-like experience.

- Progressive Web App support.
- Installable interface on supported mobile and desktop platforms.
- Standalone application display.
- Dark mode interface.
- Integrated Command Palette.
- Quick module navigation with `Ctrl + K` / `Cmd + K`.
- First-Time Setup Wizard.
- Graphical initial configuration.

---

## Architecture

### PHP On-Demand Architecture

Musend Deck is designed around a request-driven PHP architecture.

Unlike traditional application servers that require a continuously running application process, Musend Deck processes API requests through the PHP runtime already provided by the hosting environment.

```text
                USER / BROWSER
                      |
                      v
              WEB APPLICATION
              React + Vite SPA
                      |
                      v
                WEB SERVER
              Apache / Nginx
                      |
                      v
                PHP RUNTIME
                 PHP 8.2+
                      |
                      v
                API ROUTER
                 api.php
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
       FILES       DATABASE     SYSTEM
      MANAGER      INSPECTOR    COMMANDS
          |           |           |
          +-----------+-----------+
                      |
                      v
              LINUX USER SPACE
              Non-Root Account
```

### Technology Stack

| Layer | Technology |
|---|---|
| Backend Runtime | PHP 8.2+ |
| Backend Architecture | PHP On-Demand |
| Frontend Framework | React 18 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3.4 |
| Icons | Lucide Icons |
| Code Editor | CodeMirror 6 |
| Application Type | Single Page Application |
| Deployment Environment | Linux |
| Web Server | Apache / LiteSpeed / Nginx |
| Application Delivery | PWA |

### Runtime Philosophy

The architecture follows several principles:

1. API requests are executed through PHP-FPM or the PHP runtime supplied by the web server.
2. No permanently running application daemon is required.
3. Temporary background processes may be launched for deployment or other operations that need them.
4. Application operations run with the permissions of the PHP operating system account.
5. The application does not require `sudo` or root privileges.

**Important distinction:** PHP on-demand does not mean the entire hosting environment is resource-free. The web server, PHP-FPM workers, database services, and temporary processes still consume system resources according to their configurations.

---

## Installation

Musend Deck supports several installation layouts, allowing it to work with different hosting configurations.

### Installation Locations

| Installation Type | Example Directory | Access URL |
|---|---|---|
| Main domain subfolder | `~/public_html/MusendDeck/` | `https://example.com/MusendDeck/` |
| Dedicated subdomain | `~/deck.example.com/` | `https://deck.example.com/` |
| Subdomain subfolder | `~/deck.example.com/panel/` | `https://deck.example.com/panel/` |
| Main domain root | `~/public_html/` | `https://example.com/` |

> **Note:** On cPanel or shared hosting, make sure the installation directory matches the Document Root configured for your domain or subdomain.

Use an empty document root or a dedicated subfolder. The installer refuses to overwrite existing `index.html` or `api.php` files.

### Prerequisites

Before installation, make sure your environment provides:

- Linux-based hosting environment.
- PHP 8.2 or newer.
- SSH access for CLI installation.
- Required PHP extensions.
- A supported web server.
- An unprivileged Linux account for PHP execution.

### Method 1 — Automated Installation (Recommended)

Connect to your server through SSH and execute:

```bash
git clone https://github.com/yakubfirman/musend-deck.git musend-deck

cd musend-deck

bash install.sh
```

The installation script will:

1. Check PHP runtime availability and compatibility.
2. Ask for the destination web directory.
3. Install the compiled frontend application.
4. Install the PHP API router and required backend files.
5. Prepare the setup token generation utility.
6. Apply permissions to the application files being installed.
7. Generate and display a one-time setup token.

Example installation destinations:

```text
~/public_html/MusendDeck
~/deck.example.com
~/public_html
~/panel.example.com/MusendDeck
```

Save the generated setup token. You will need it during the initial configuration.

The installer does not automatically delete existing asset directories or recursively change permissions across the entire document root.

### Method 2 — Manual Installation

If you prefer manual deployment, follow these steps.

**1. Clone the repository**

```bash
git clone https://github.com/yakubfirman/musend-deck.git

cd musend-deck
```

**2. Build the frontend**

```bash
cd frontend

npm install

npm run build

cd ..
```

**3. Define the installation directory**

Choose your destination directory:

```bash
# Main domain subfolder
TARGET=~/public_html/MusendDeck

# Dedicated subdomain
# TARGET=~/deck.example.com

# Main domain root
# TARGET=~/public_html
```

**4. Copy application files**

```bash
mkdir -p "$TARGET"

for path in index.html api.php setup-token.php config.sample.php config.php src; do
    if [ -e "$TARGET/$path" ]; then
        echo "File $path already exists. Use an empty document root." >&2
        exit 1
    fi
done

cp -r frontend/dist/. "$TARGET/"

cp backend/api.php "$TARGET/"

cp backend/setup-token.php "$TARGET/"

cp backend/config.sample.php "$TARGET/"

cp -n backend/.htaccess "$TARGET/.htaccess"

cp -r backend/src "$TARGET/"
```

For Nginx environments, review `backend/nginx-security.conf.example` and apply the appropriate rules inside your Nginx server block.

If an existing `.htaccess` file is present, merge the required rules manually. Do not overwrite existing website configuration.

**5. Generate the setup token**

```bash
php "$TARGET/setup-token.php"
```

Keep the generated token for the next step.

### Method 3 — Initial Setup Wizard

Once the application files have been installed:

1. Open your installation URL in a browser.
2. The Musend Deck Setup Wizard should appear automatically.
3. Run the setup token utility through SSH if you have not already generated a token.
4. Enter the one-time setup token.
5. Create your administrator username and password.
6. Review the suggested CPU and RAM allocation.
7. Click **Install & Enter Dashboard**.

The setup token is consumed after successful configuration.

**Password requirements:** 12–72 bytes.

After successful installation, you can access your server management dashboard.

---

## System Requirements

| Component | Requirement | Description |
|---|---|---|
| Operating System | Linux | Standard Linux distributions |
| Architecture | x86_64 / ARM64 | Supported Linux architectures |
| PHP Runtime | PHP 8.2+ | CLI / FPM / FastCGI |
| PHP Extensions | `json`, `mbstring`, `zip`, `pdo`, `posix` | Required application extensions |
| Web Server | Apache / LiteSpeed / Nginx | Supported web server environments |
| User Privileges | Non-root account | No `sudo` requirement |
| SSH Access | Recommended | Required for installation and server operations |

### Web Server Configuration

**Apache / LiteSpeed**

The application uses `.htaccess` for relevant access restrictions.

**Nginx**

Nginx does not process `.htaccess` files. Review:

`backend/nginx-security.conf.example`

Apply the required configuration inside the relevant Nginx `server` block.

If the domain hosts multiple applications, make sure the security rules are scoped to the Musend Deck application path.

---

## Security

Security is an important consideration for any application that provides server management capabilities.

Musend Deck implements several application-level security measures.

### Authentication & Password Protection

- Password hashing using PHP `password_hash()`.
- Password verification using `password_verify()`.
- One-time setup token for initial installation.
- Token generation through CLI.
- Private temporary token storage with restrictive permissions.
- Automatic token consumption after successful setup.

### File System Protection

- File Manager canonical path validation.
- File Manager operations restricted to the configured Linux account home directory.
- Final symlink targets are rejected by the File Manager.
- Selected permission checks for sensitive files and directories.

**Important:** The File Manager path restriction is an application-level restriction. It does not restrict shell commands executed through the Web Console.

The `root_dir` configuration defines the File Manager's starting directory and path boundary. It is not an operating system security sandbox.

### Request Protection

- CSRF token validation for state-changing requests.
- Restricted development CORS origins.
- Explicit trusted proxy configuration for forwarded client IP information.
- Configurable web server access restrictions.

### Deployment Recommendations

For a safer production environment:

1. Run PHP-FPM under a dedicated non-root Linux account.
2. Use HTTPS for all panel access.
3. Restrict access through a VPN or IP allowlist.
4. Avoid exposing the panel directly to the public internet whenever possible.
5. Review permissions of application configuration files.
6. Review Nginx or Apache security rules before deployment.
7. Keep PHP and server utilities updated.

> **Security Notice:** Musend Deck provides server management capabilities, including shell command execution. Only install it in environments you control and protect its access accordingly. Its security auditor is not a substitute for a complete security assessment or penetration test.

---

## Project Structure

The repository is organized into separate frontend and backend components.

```text
musend-deck/
│
├── backend/
│   ├── src/
│   ├── api.php
│   ├── setup-token.php
│   ├── config.sample.php
│   ├── .htaccess
│   └── nginx-security.conf.example
│
├── frontend/
│   ├── public/
│   │   └── icon-192x192.png
│   ├── src/
│   ├── dist/
│   ├── package.json
│   └── vite.config.ts
│
├── install.sh
├── LICENSE
└── README.md
```

*The structure above illustrates the main application components; individual directories may contain additional files.*

---

## Roadmap

Musend Deck is designed to evolve as a flexible and practical hosting management platform.

Potential future development directions include:

- [ ] Extended server monitoring capabilities.
- [ ] More comprehensive security auditing.
- [ ] Enhanced deployment automation.
- [ ] Improved backup and restoration workflows.
- [ ] Additional database management capabilities.
- [ ] Better multi-domain management.
- [ ] Extended hosting environment compatibility.
- [ ] Improved operational logging and diagnostics.

---

## Contributing

Contributions, ideas, bug reports, and suggestions are welcome.

If you find an issue or have an idea for improving Musend Deck:

1. Fork this repository.
2. Create a feature branch.
3. Implement your changes.
4. Test your implementation.
5. Submit a Pull Request.

For significant changes, consider opening an issue first to discuss the proposed implementation.

---

## Developer

<p align="center">
  <strong>Designed & Developed by</strong>
</p>

<h3 align="center">Yakub Firman Mustofa</h3>

<p align="center">
  Full-Stack Web Developer · API Enthusiast · Open Source Builder
</p>

<p align="center">
  <a href="https://yakubfirman.com">Website</a> •
  <a href="https://github.com/yakubfirman">GitHub</a> •
  <a href="https://linkedin.com/in/yakub-firman-mustofa">LinkedIn</a>
</p>

---

## License

Musend Deck is open-source software licensed under the [MIT License](LICENSE).

You are free to use, modify, distribute, and integrate this software into your own projects, subject to the terms of the license.

---

<p align="center">
  <img src="frontend/public/icon-192x192.png" width="52" height="52" alt="Musend Deck" />
</p>

<p align="center">
  <strong>Musend Deck</strong>
  <br />
  <sub>Built for efficient, accessible, and resource-conscious server management.</sub>
</p>

<p align="center">
  <sub>© Yakub Firman Mustofa · Open Source Project</sub>
</p>
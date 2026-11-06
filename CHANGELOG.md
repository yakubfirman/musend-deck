# Changelog

Notable changes to Musend Deck are listed here.

## [1.4.0] - 2026-11-07

### Added

- Configurable IP/CIDR allowlisting, idle session expiry, and a private bounded activity log.
- Database restore with a pre-restore snapshot, retention policy, scheduled CLI maintenance, and optional rclone off-site copies.
- Deployment history and optional per-project rollback scripts.
- Paginated file listings and bounded deployment log responses.
- Staged installer activation with a private recovery copy and automatic rollback if activation fails.
- Backup, recovery, and security configuration guides.

### Changed

- Hide host details from unauthenticated status checks after setup and add browser security headers.
- Align the PRD and release metadata with Musend Deck 1.4.0.

## [1.3.0] - 2026-11-01

### Added

- Hosting preflight checks in the Setup Wizard for required runtime support and optional feature dependencies.
- Hosting compatibility, upgrade, and recovery guides.
- GitHub Sponsors support and project security and contribution policies.
- A release package path for hosting accounts without Node.js.

### Changed

- Align frontend package metadata and lockfile with the 1.3.0 release.
- Use locked npm dependencies when building from source.
- Remove GitHub Actions and Dependabot automation; contributor checks are documented for local use.
- Add the MIT license to the generated release archive.

### Fixed

- Correct the JSX closing markup in the ZIP modal so the frontend build can complete.

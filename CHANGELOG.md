# Changelog

Notable changes to Musend Deck are listed here.

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

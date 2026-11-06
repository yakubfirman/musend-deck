# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately through [GitHub Security Advisories](https://github.com/yakubfirman/musend-deck/security/advisories/new). If private reporting is unavailable, contact the maintainer through [GitHub](https://github.com/yakubfirman) before sharing technical details publicly.

Include the affected version or commit, the impact, and steps to reproduce. Remove credentials, setup tokens, customer data, and other secrets from any report. Please do not use public issues for unpatched vulnerabilities.

The project is maintained on a best-effort basis and does not promise a response or fix time. The maintainer will coordinate disclosure with the reporter when possible.

## Security model

Musend Deck is a management panel. Authenticated users can perform operations using the operating-system permissions of the PHP process, including running shell commands through the Web Console. The command deny list is a small guardrail, not a shell sandbox.

The File Manager's configured `root_dir` limits File Manager operations. It does not limit terminal commands, deployment scripts, cron commands, or other code running as PHP. A compromise of the panel can therefore affect everything that the PHP account can access.

For installations:

- Run PHP as a dedicated, unprivileged Linux account. Setup refuses root and checks this again on the server.
- Use HTTPS and restrict panel access to trusted networks or an access gateway.
- Optionally configure `auth.allowed_ips` in `config.php` with exact IP addresses or CIDRs; use `auth.trusted_proxies` only for proxy addresses you control. The Settings page also checks that a new allowlist retains the current client IP before saving.
- Sessions expire after one hour without activity by default. Change `auth.session_idle_seconds` in `config.php` if your workflow needs a different timeout (5 minutes to 24 hours).
- Keep the panel in a dedicated document root and apply the provided Apache/LiteSpeed or Nginx access rules.
- Protect `config.php`, setup tokens, database credentials, and backups from web access and other local users.
- Review which users and deployment scripts can access the PHP account's files.

The project includes authentication, CSRF checks, login throttling, a one-time setup token, optional IP allowlisting, session idle expiry, a bounded private audit trail, and File Manager path checks. These application controls do not replace operating-system permissions, web-server rules, or a full security assessment.

## Review baseline

Security changes should be reviewed against the relevant requirements in [OWASP ASVS 5.0](https://asvs.owasp.org/), especially authentication, session management, access control, injection prevention, file handling, API behavior, and configuration. This is a development checklist; it is not a claim of ASVS verification or certification.

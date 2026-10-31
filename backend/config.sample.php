<?php
/**
 * ServerDeck Configuration
 *
 * Copy this file to config.php and set your credentials.
 * config.php is protected by .htaccess and should NEVER be exposed publicly.
 */

return [
    // Authentication Credentials
    'auth' => [
        // Case-insensitive username check
        'username' => 'yakubfir',

        // Password hash generated via password_hash('YourPasswordHere', PASSWORD_BCRYPT)
        // Default sample password: "admin" (CHANGE THIS IMMEDIATELY!)
        'password_hash' => '$2y$10$wSjB5Kz4vGqJbQ0gL2F4I.v8Tq5W.7D8Q9Z5R4Y3X2W1V0U9T8S7R',

        // Allow optional period/dot at the end of password during entry
        'tolerate_trailing_dot' => true,
    ],

    // File System & Scope Jail
    'fs' => [
        // Strict boundary: all file operations will be locked inside this root
        // Shared hosting target: '/home/yakubfir'
        // For local development, this defaults to the user's home or project root
        'root_dir' => getenv('SERVERDECK_ROOT') ?: (is_dir('/home/yakubfir') ? '/home/yakubfir' : dirname(__DIR__)),

        // Max upload file size in bytes (e.g., 64MB)
        'max_upload_size' => 64 * 1024 * 1024,
    ],

    // Hosting Quotas & Limits (CloudLinux LVE Scope)
    'limits' => [
        'cpu_limit_percent' => 400, // 400% = 4 CPU Cores
        'cpu_cores'         => 4,
        'ram_limit_bytes'   => 4 * 1024 * 1024 * 1024, // 4.00 GB
        'nproc_limit'       => 400,
        'ep_limit'          => 60,
        'io_limit_bytes'    => 32 * 1024 * 1024, // 32 MB/s
        'iops_limit'        => 4096,
    ],

    // Monitored Log Files
    'logs' => [
        'access' => [
            '/home/yakubfir/logs/musend.web.id.ssl.log',
            '/home/yakubfir/access-logs/musend.web.id-ssl_log',
        ],
        'error' => [
            '/home/yakubfir/logs/error_log',
            '/home/yakubfir/public_html/error_log',
            dirname(__DIR__) . '/error_log',
        ],
    ],

    // Performance & Cache
    'cache' => [
        // Duration to cache metrics in temporary file to prevent CPU fork overhead
        'metrics_ttl_seconds' => 15,
        'temp_dir' => sys_get_temp_dir(),
    ],
];

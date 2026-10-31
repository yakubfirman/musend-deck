<?php
declare(strict_types=1);

require_once __DIR__ . '/src/SetupToken.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

try {
    $token = \ServerDeck\SetupToken::issue(__DIR__);
    fwrite(STDOUT, "Token setup satu kali Musend Deck:\n{$token}\n\nMasukkan token ini di Setup Wizard. Token akan dihapus setelah setup berhasil.\n");
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}

<?php
declare(strict_types=1);

$path = __DIR__ . '/../config.local.php';
if (is_file($path)) {
    $config = require $path;
} elseif (getenv('DB_DSN')) {
    // Docker Compose setzt diese Werte; Zugangsdaten bleiben ausserhalb von public/.
    $config = [
        'auth_url' => getenv('AUTH_URL') ?: 'https://auth.mmacodeclub.ch',
        'app_origin' => getenv('APP_ORIGIN') ?: 'http://localhost:8000',
        'db_dsn' => getenv('DB_DSN'),
        'db_user' => getenv('DB_USER') ?: '',
        'db_password' => getenv('DB_PASSWORD') ?: '',
    ];
} else {
    json_error(503, 'Die Projektkonfiguration fehlt. Kopiere config.example.php nach config.local.php.');
}
foreach (['auth_url', 'app_origin', 'db_dsn', 'db_user', 'db_password'] as $key) {
    if (!is_array($config) || !is_string($config[$key] ?? null)) {
        json_error(503, 'Die Projektkonfiguration ist ungültig. Prüfe config.local.php.');
    }
}
return $config;

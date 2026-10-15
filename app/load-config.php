<?php
declare(strict_types=1);

$path = __DIR__ . '/../config.php';
if (!is_file($path)) {
    json_error(503, 'Die Projektkonfiguration fehlt. Kopiere config.example.php nach config.php.');
}
$config = require $path;
foreach (['auth_url', 'app_origin', 'db_host', 'db_name', 'db_user', 'db_password'] as $key) {
    if (!is_array($config) || !is_string($config[$key] ?? null)) {
        json_error(503, 'Die Projektkonfiguration ist ungültig. Prüfe config.php.');
    }
}
return $config;

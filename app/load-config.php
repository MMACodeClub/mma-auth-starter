<?php
declare(strict_types=1);
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/config-validation.php';

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
if (!mma_https_origin($config['auth_url']) || !mma_https_origin($config['app_origin'])) {
    json_error(503, 'auth_url und app_origin müssen exakte HTTPS-Adressen ohne Pfad, / am Ende, Zugangsdaten, Query oder Fragment sein. Verwende kleingeschriebene Domains und keinen Standardport :443.');
}
return $config;

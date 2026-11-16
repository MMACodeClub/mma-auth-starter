<?php
declare(strict_types=1);
require_once __DIR__ . '/http.php';

// Nur mit der Person aus mma_require_user() aufrufen, nie mit Browserangaben.
function mma_db(array $config, array $user): PDO
{
    $dsn = 'mysql:host=' . $config['db_host'] . ';dbname=' . $config['db_name'] . ';charset=utf8mb4';
    try {
        $pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $error) {
        json_error(503, 'Keine Verbindung zur Datenbank. Prüfe die Angaben in config.php.');
    }
    // Für persönliche Notizen reicht die stabile ID. Name und E-Mail bleiben
    // beim Auth-Service und werden nicht in jede Projektdatenbank kopiert.
    $pdo->prepare('INSERT INTO users (id) VALUES (?) ON DUPLICATE KEY UPDATE id = id')
        ->execute([$user['id']]);
    return $pdo;
}

<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require __DIR__ . '/../../mma-auth.php';

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    json_error(405, 'Methode nicht unterstützt.');
}
$configPath = __DIR__ . '/../../config.local.php';
if (!is_file($configPath)) json_error(503, 'Die Projektkonfiguration fehlt. Siehe README.');
$config = require $configPath;
$user = mma_require_user($config);

try {
    $pdo = new PDO($config['db_dsn'], $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, email = ?')
        ->execute([$user['id'], $user['name'], $user['email'], $user['name'], $user['email']]);
    if ($method === 'POST') {
        if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
            json_error(415, 'Sende JSON mit Content-Type application/json.');
        }
        $body = file_get_contents('php://input', false, null, 0, 10241);
        if (strlen($body) > 10240) json_error(413, 'Die Anfrage ist zu gross.');
        $input = json_decode($body, true);
        $text = is_string($input['text'] ?? null) ? trim($input['text']) : '';
        $length = preg_match_all('/./us', $text);
        if ($text === '' || $length === false || $length > 500) json_error(400, 'Bitte gib einen Text mit 1–500 Zeichen ein.');
        // Die User-ID kommt ausschliesslich aus der geprüften Auth-Antwort.
        $pdo->prepare('INSERT INTO notes (user_id, text) VALUES (?, ?)')->execute([$user['id'], $text]);
        http_response_code(201);
    }
    $query = $pdo->prepare('SELECT id, text, created_at FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 100');
    $query->execute([$user['id']]);
    echo json_encode($query->fetchAll(), JSON_UNESCAPED_UNICODE);
} catch (PDOException $error) {
    // Keine Zugangsdaten, SQL-Abfragen oder internen Pfade an den Browser geben.
    json_error(503, 'Die Projektdatenbank ist gerade nicht verfügbar. Prüfe die Serverkonfiguration.');
}

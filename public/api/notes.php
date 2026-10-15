<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require __DIR__ . '/../../app/auth.php';
header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'DELETE'], true)) {
    header('Allow: GET, POST, DELETE');
    json_error(405, 'Methode nicht unterstützt.');
}
$config = require __DIR__ . '/../../app/config.php';
$user = mma_require_user($config);

if ($method !== 'GET') {
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
        json_error(415, 'Sende JSON mit Content-Type application/json.');
    }
    $body = file_get_contents('php://input', false, null, 0, 10241);
    if ($body === false) json_error(400, 'Die Anfrage konnte nicht gelesen werden.');
    if (strlen($body) > 10240) json_error(413, 'Die Anfrage ist zu gross.');
    $input = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) json_error(400, 'Sende ein gültiges JSON-Objekt.');
    if ($method === 'POST') {
        $text = is_string($input['text'] ?? null) ? trim($input['text']) : '';
        $length = preg_match_all('/./us', $text);
        if ($text === '' || $length === false || $length > 500) json_error(400, 'Bitte gib einen Text mit 1–500 Zeichen ein.');
    } elseif (!is_int($input['id'] ?? null) || $input['id'] < 1) {
        json_error(400, 'Bitte gib eine gültige Notiz-ID an.');
    }
}

try {
    $pdo = new PDO($config['db_dsn'], $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, email = ?')
        ->execute([$user['id'], $user['name'], $user['email'], $user['name'], $user['email']]);
    if ($method === 'POST') {
        // Die User-ID kommt ausschliesslich aus der geprüften Auth-Antwort.
        $pdo->prepare('INSERT INTO notes (user_id, text) VALUES (?, ?)')->execute([$user['id'], $text]);
        http_response_code(201);
    }
    if ($method === 'DELETE') {
        $delete = $pdo->prepare('DELETE FROM notes WHERE id = ? AND user_id = ?');
        $delete->execute([$input['id'], $user['id']]);
        if ($delete->rowCount() === 0) json_error(404, 'Diese Notiz wurde nicht gefunden.');
    }
    $query = $pdo->prepare('SELECT id, text, created_at FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 100');
    $query->execute([$user['id']]);
    echo json_encode($query->fetchAll(), JSON_UNESCAPED_UNICODE);
} catch (PDOException $error) {
    // Keine Zugangsdaten, SQL-Abfragen oder internen Pfade an den Browser geben.
    json_error(503, 'Die Projektdatenbank ist gerade nicht verfügbar. Prüfe die Serverkonfiguration.');
}

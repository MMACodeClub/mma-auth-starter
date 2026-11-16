<?php
declare(strict_types=1);
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/db.php';

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'DELETE'], true)) {
    header('Allow: GET, POST, DELETE');
    json_error(405, 'Methode nicht unterstützt.');
}
$config = require __DIR__ . '/../../app/load-config.php';
$user = mma_require_user($config);

if ($method !== 'GET') {
    $input = read_json();
    if ($method === 'POST') {
        $text = is_string($input['text'] ?? null) ? trim($input['text']) : '';
        $length = preg_match_all('/./us', $text);
        if ($text === '' || $length === false || $length > 500) json_error(400, 'Bitte gib einen Text mit 1–500 Zeichen ein.');
    } elseif (!is_int($input['id'] ?? null) || $input['id'] < 1) {
        json_error(400, 'Bitte gib eine gültige Notiz-ID an.');
    }
}

$pdo = mma_db($config, $user);
if ($method === 'POST') {
    // Die Sperre auf der User-Zeile serialisiert parallele Schreibanfragen
    // dieser Person. So können zwei Tabs das Limit nicht gleichzeitig umgehen.
    $pdo->beginTransaction();
    $lock = $pdo->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE');
    $lock->execute([$user['id']]);
    $count = $pdo->prepare('SELECT COUNT(*) FROM notes WHERE user_id = ?');
    $count->execute([$user['id']]);
    if ((int) $count->fetchColumn() >= 100) {
        $pdo->rollBack();
        json_error(409, 'Du kannst höchstens 100 Notizen speichern. Lösche zuerst eine Notiz.');
    }
    // Die User-ID kommt ausschliesslich aus der geprüften Auth-Antwort.
    $pdo->prepare('INSERT INTO notes (user_id, text) VALUES (?, ?)')->execute([$user['id'], $text]);
    $pdo->commit();
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

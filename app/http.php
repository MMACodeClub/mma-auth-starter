<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function json_error(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// Liest ein JSON-Objekt. Die passenden Felder prüft anschliessend dein Endpunkt.
function read_json(): array
{
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
        json_error(415, 'Sende JSON mit Content-Type application/json.');
    }
    $body = file_get_contents('php://input', false, null, 0, 10241);
    if ($body === false) json_error(400, 'Die Anfrage konnte nicht gelesen werden.');
    if (strlen($body) > 10240) json_error(413, 'Die Anfrage ist zu gross.');
    $input = json_decode($body);
    if (json_last_error() !== JSON_ERROR_NONE || !($input instanceof stdClass)) {
        json_error(400, 'Sende ein gültiges JSON-Objekt.');
    }
    return (array) $input;
}

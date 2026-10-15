<?php
declare(strict_types=1);

// Für JSON-API-Endpunkte: Diese Datei setzt JSON-Header, auch über auth.php.
// Für selbst erzeugte HTML-Seiten sind diese Helfer nicht als Seitenvorlage gedacht.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function json_error(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// Unbehandelte Ausnahmen bleiben als JSON lesbar. Keine Tokens, Zugangsdaten
// oder SQL-Inhalte protokollieren: Typ und Fundstelle helfen bei der Fehlersuche.
set_exception_handler(static function (Throwable $error): void {
    error_log(sprintf('MMA API: %s in %s:%d (Code %s)',
        get_class($error), basename($error->getFile()), $error->getLine(), $error->getCode()));
    if ($error instanceof PDOException) {
        json_error(500, 'Die Datenbankabfrage ist fehlgeschlagen. Ist die Tabelle importiert und stimmen die Spaltennamen?');
    }
    json_error(500, 'Auf dem Server ist ein Fehler passiert.');
});

// Liest ein JSON-Objekt. Die passenden Felder prüft anschliessend dein Endpunkt.
function read_json(): array
{
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
        json_error(415, 'Sende JSON mit Content-Type application/json.');
    }
    $body = file_get_contents('php://input', false, null, 0, 10241);
    if ($body === false) json_error(400, 'Die Anfrage konnte nicht gelesen werden.');
    if (strlen($body) > 10240) json_error(413, 'Die Anfrage ist zu gross.');
    $input = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($input) || !str_starts_with(ltrim($body), '{')) {
        json_error(400, 'Sende ein gültiges JSON-Objekt.');
    }
    return $input;
}

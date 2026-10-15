<?php
declare(strict_types=1);

function json_error(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function mma_require_user(array $config): array
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer [A-Za-z0-9_-]{20,200}$/D', $authorization)) {
        json_error(401, 'Bitte melde dich an.');
    }
    if (!function_exists('curl_init')) json_error(503, 'PHP benötigt die cURL-Erweiterung.');
    $curl = curl_init(rtrim($config['auth_url'], '/') . '/api/me');
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: ' . $authorization],
        CURLOPT_TIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    $body = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    unset($curl);
    if ($status === 401 || $status === 403) json_error(401, 'Dein Login ist abgelaufen. Bitte melde dich erneut an.');
    if ($body === false || $status !== 200) json_error(502, 'Der Login-Service ist gerade nicht erreichbar.');
    $data = json_decode($body, true);
    if (!is_array($data) || !is_array($data['user'] ?? null)
        || !is_string($data['user']['id'] ?? null) || $data['user']['id'] === ''
        || !is_string($data['user']['name'] ?? null) || !is_string($data['user']['email'] ?? null)) {
        json_error(502, 'Der Login-Service hat eine ungültige Antwort geliefert.');
    }
    // Auch den Token-Empfänger prüfen: Tokens anderer Projekte zurückweisen.
    if (($data['origin'] ?? '') !== $config['app_origin']) {
        json_error(403, 'Dieses Token gehört zu einem anderen Projekt.');
    }
    return $data['user'];
}

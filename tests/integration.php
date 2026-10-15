<?php
declare(strict_types=1);

// Aufruf: docker compose exec -T web php < tests/integration.php
// Ausschliesslich die isolierte lokale Compose-Datenbank verwenden.
if (getenv('DB_DSN') !== 'mysql:host=db;port=3306;dbname=mma_projekt;charset=utf8mb4'
    || getenv('DB_PASSWORD') !== 'lokal-demo-passwort') {
    throw new RuntimeException('Diese Tests benötigen die lokale Compose-Umgebung.');
}
$root = getcwd();
$database = 'mma_test_' . bin2hex(random_bytes(6));
$temp = sys_get_temp_dir() . '/' . $database;
mkdir($temp);
$log = $temp . '/server.log';
$processes = [];
$pdo = new PDO('mysql:host=db;charset=utf8mb4', 'root', 'lokal-demo-root-passwort', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$passed = 0;

function check(string $label, bool $condition): void
{
    global $passed;
    if (!$condition) throw new RuntimeException('FEHLER: ' . $label);
    echo 'ok ' . ++$passed . ' · ' . $label . "\n";
}
function server(array $args): mixed
{
    global $log, $processes;
    $process = proc_open([PHP_BINARY, '-S', ...$args], [['pipe', 'r'], ['file', $log, 'a'], ['file', $log, 'a']], $pipes);
    if (!is_resource($process)) throw new RuntimeException('Testserver konnte nicht starten.');
    fclose($pipes[0]);
    $processes[] = $process;
    return $process;
}
function waitForServer(int $port): void
{
    for ($i = 0; $i < 100; $i++) {
        $socket = @fsockopen('127.0.0.1', $port);
        if ($socket) { fclose($socket); return; }
        usleep(50000);
    }
    throw new RuntimeException('Testserver nicht erreichbar.');
}
function request(string $method = 'GET', ?string $token = 'a', ?string $body = null, string $type = 'application/json', string $path = '/api/notes.php'): array
{
    $curl = curl_init('http://127.0.0.1:18101' . $path);
    $headers = ['Content-Type: ' . $type];
    if ($token !== null) $headers[] = 'Authorization: Bearer ' . str_repeat($token, 32);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 10]);
    if ($body !== null) curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
    $text = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    if ($text === false) throw new RuntimeException(curl_error($curl));
    return [$status, json_decode($text, true), $text];
}
function removeTree(string $path): void
{
    foreach (scandir($path) as $name) {
        if ($name === '.' || $name === '..') continue;
        $file = $path . '/' . $name;
        is_dir($file) ? removeTree($file) : unlink($file);
    }
    rmdir($path);
}
try {
    $pdo->exec("CREATE DATABASE `$database` CHARACTER SET utf8mb4");
    $pdo->exec("USE `$database`");
    $pdo->exec(file_get_contents($root . '/schema.sql'));
    mkdir($temp . '/public');
    mkdir($temp . '/public/api');
    mkdir($temp . '/app');
    foreach (['public/api/notes.php', 'app/auth.php', 'app/load-config.php'] as $file) copy($root . '/' . $file, $temp . '/' . $file);
    $config = [
        'auth_url' => 'http://127.0.0.1:18102',
        'app_origin' => 'http://localhost:8000',
        'db_dsn' => "mysql:host=db;dbname=$database;charset=utf8mb4",
        'db_user' => 'root',
        'db_password' => 'lokal-demo-root-passwort',
    ];
    file_put_contents($temp . '/config.php', '<?php return ' . var_export($config, true) . ';');
    file_put_contents($temp . '/auth-router.php', <<<'PHP'
<?php
header('Content-Type: application/json');
$token = substr($_SERVER['HTTP_AUTHORIZATION'] ?? '', 7);
$kind = $token[0] ?? '';
if (!in_array($kind, ['a', 'b', 'c', 'm', 's'], true)) { http_response_code(401); echo '{"error":"invalid"}'; return; }
if ($kind === 's') { http_response_code(503); echo '{}'; return; }
if ($kind === 'm') { echo '{"user":{"id":"u_incomplete"},"origin":"http://localhost:8000"}'; return; }
echo json_encode([
    'user' => ['id' => 'u_test_' . $kind, 'name' => 'Test ' . $kind, 'email' => $kind . '@example.test', 'klasse' => 'Testklasse'],
    'origin' => $kind === 'c' ? 'https://fremdes-projekt.example' : 'http://localhost:8000',
]);
PHP);
    server(['127.0.0.1:18102', $temp . '/auth-router.php']);
    $app = server(['127.0.0.1:18101', '-t', $temp . '/public']);
    waitForServer(18101);
    waitForServer(18102);
    check('Ohne Token: 401', request(token: null)[0] === 401);
    check('Ungültiges Token: 401', request(token: 'x')[0] === 401);
    check('Fremde Projekt-Origin: 403', request(token: 'c')[0] === 403);
    check('Unvollständige Auth-Antwort: 502', request(token: 'm')[0] === 502);
    check('Auth-Dienst ausgefallen: 502', request(token: 's')[0] === 502);
    check('Unzulässige Methode: 405', request('PUT')[0] === 405);
    check('Leere Liste nach Start', request()[1] === []);
    check('Ungültiges JSON: 400', request('POST', body: '{')[0] === 400);
    check('Leere Notiz: 400', request('POST', body: '{"text":"  "}')[0] === 400);
    check('Falscher Content-Type: 415', request('POST', body: '{}', type: 'text/plain')[0] === 415);
    check('Mehr als 500 Zeichen: 400', request('POST', body: json_encode(['text' => str_repeat('ä', 501)]))[0] === 400);
    check('Zu grosser Body: 413', request('POST', body: str_repeat('x', 10241))[0] === 413);
    [$status, $notes] = request('POST', body: json_encode(['text' => '  Idee mit ü und <script>alert(1)</script>  ', 'user_id' => 'u_test_b']));
    check('Notiz angelegt, Text bleibt Text', $status === 201 && count($notes) === 1 && $notes[0]['text'] === 'Idee mit ü und <script>alert(1)</script>');
    $id = (int) $notes[0]['id'];
    check('Gesendete User-ID wird ignoriert', request(token: 'b')[1] === []);
    check('Andere Person kann fremde Notiz nicht löschen', request('DELETE', 'b', json_encode(['id' => $id]))[0] === 404);
    check('Fremdes Projekt kann nichts speichern', request('POST', 'c', '{"text":"fremd"}')[0] === 403);
    check('Fremdes Projekt kann nichts löschen', request('DELETE', 'c', json_encode(['id' => $id]))[0] === 403);
    check('Ungültige Lösch-ID: 400', request('DELETE', body: '{"id":"1 OR 1=1"}')[0] === 400);
    proc_terminate($app);
    proc_close($app);
    server(['127.0.0.1:18101', '-t', $temp . '/public']);
    waitForServer(18101);
    check('Notiz bleibt nach PHP-Neustart erhalten', (int) request()[1][0]['id'] === $id);
    check('500 Unicode-Zeichen erlaubt', request('POST', body: json_encode(['text' => str_repeat('😀', 500)]))[0] === 201);
    [$status, $notes] = request('DELETE', body: json_encode(['id' => $id]));
    check('Eigene Notiz löschen', $status === 200 && count($notes) === 1 && (int) $notes[0]['id'] !== $id);
    check('Erneutes Löschen: 404', request('DELETE', body: json_encode(['id' => $id]))[0] === 404);
    $insert = $pdo->prepare('INSERT INTO notes (user_id, text) VALUES (?, ?)');
    for ($i = 0; $i < 105; $i++) $insert->execute(['u_test_a', 'Test ' . $i]);
    $notes = request()[1];
    check('Neueste 100 Notizen in absteigender Reihenfolge', count($notes) === 100 && $notes[0]['text'] === 'Test 104' && $notes[99]['text'] === 'Test 5');
    check('Konfiguration liegt ausserhalb des Webroots', request(path: '/config.php')[0] === 404);
    $pdo->exec("DROP DATABASE `$database`");
    [$status, $data] = request();
    check('Datenbankfehler ohne interne Details: 503', $status === 503 && !str_contains(json_encode($data), 'SQLSTATE'));
    echo "Alle $passed Prüfungen erfolgreich.\n";
} finally {
    foreach ($processes as $process) {
        if (is_resource($process)) { proc_terminate($process); proc_close($process); }
    }
    $pdo->exec("DROP DATABASE IF EXISTS `$database`");
    removeTree($temp);
}

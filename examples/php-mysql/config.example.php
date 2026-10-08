<?php
// Nach config.local.php kopieren. Diese Datei liegt ausserhalb von public/.
return [
    'auth_url' => 'https://auth.mmacodeclub.ch',
    // Exakte Frontend-Origin, ohne Pfad und ohne abschliessenden Schrägstrich.
    'app_origin' => 'http://localhost:8000',
    'db_dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=mma_projekt;charset=utf8mb4',
    'db_user' => 'mma_projekt',
    'db_password' => '', // Das Passwort deines eigenen Datenbank-Benutzers.
];

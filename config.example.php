<?php
// Nach config.php kopieren und deine Projektdatenbank eintragen.
return [
    'auth_url' => 'https://auth.mmacodeclub.ch',
    // Exakte Adresse im Browser: Schema, Host und Port, ohne Pfad.
    'app_origin' => 'http://localhost:8000',
    'db_dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=mma_projekt;charset=utf8mb4',
    'db_user' => 'mma_projekt',
    'db_password' => '',
];

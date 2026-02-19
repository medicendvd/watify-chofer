<?php
/**
 * Watify — Seed de usuarios con password_hash
 * Correr UNA SOLA VEZ después de schema.sql + seed.sql
 * Uso: php seed.php  (desde la carpeta db/)
 */

$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$db   = getenv('DB_NAME') ?: 'watify';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: 'Molkito12';

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (Exception $e) {
    die("Error de conexión: " . $e->getMessage() . "\n");
}

$users = [
    ['david', '112233', 'Admin'],
    ['chevo', '112233', 'Admin'],
    ['ch1',   '1111',   'Chofer'],
    ['ch2',   '2222',   'Chofer'],
    ['ch3',   '3333',   'Chofer'],
];

$stmt = $pdo->prepare(
    "INSERT INTO users (name, password, role) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role)"
);

foreach ($users as [$name, $plainPassword, $role]) {
    $hash = password_hash($plainPassword, PASSWORD_BCRYPT);
    $stmt->execute([$name, $hash, $role]);
    echo "Usuario '$name' ($role) insertado.\n";
}

echo "\nSeed completado. Usuarios listos.\n";

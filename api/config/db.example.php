<?php
/**
 * PLANTILLA para producción (Hostinger)
 * Copia este archivo como db.php en el servidor y rellena con tus datos reales
 * NUNCA subas db.php al repositorio
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $host = 'localhost';          // En Hostinger normalmente es localhost
    $port = '3306';
    $db   = 'TU_NOMBRE_DE_BD';   // Panel Hostinger → Bases de datos MySQL
    $user = 'TU_USUARIO_BD';
    $pass = 'TU_PASSWORD_BD';

    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",
        $user, $pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
    return $pdo;
}

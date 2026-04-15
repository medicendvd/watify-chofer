<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

cors();
session_start();

// Invalidar remember_token en la base de datos
if (!empty($_SESSION['user_id'])) {
    try {
        $pdo = getDB();
        $pdo->prepare('UPDATE users SET remember_token = NULL, remember_token_expires = NULL WHERE id = ?')
            ->execute([$_SESSION['user_id']]);
    } catch (\Throwable $e) { /* ignorar */ }
}

// Limpiar cookie del navegador
setcookie('remember_token', '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_destroy();
jsonResponse(['ok' => true]);

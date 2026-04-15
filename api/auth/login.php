<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

cors();
session_set_cookie_params([
    'lifetime' => 30 * 24 * 60 * 60,
    'path'     => '/',
    'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$body = getBody();
$name = trim($body['name'] ?? '');
$password = $body['password'] ?? '';

if (!$name || !$password) jsonError('Usuario y contraseña requeridos');

$pdo  = getDB();
$stmt = $pdo->prepare('SELECT id, name, password, role FROM users WHERE name = ?');
$stmt->execute([$name]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonError('Usuario o contraseña incorrectos', 401);
}

$_SESSION['user_id']   = $user['id'];
$_SESSION['user_name'] = $user['name'];
$_SESSION['user_role'] = $user['role'];

// ── Remember-me token (1 año) ─────────────────────────────────────────────
$token   = bin2hex(random_bytes(32)); // 64 hex chars
$expires = date('Y-m-d H:i:s', strtotime('+1 year'));

$pdo->prepare('UPDATE users SET remember_token = ?, remember_token_expires = ? WHERE id = ?')
    ->execute([$token, $expires, $user['id']]);

$cookieParams = [
    'expires'  => time() + 365 * 24 * 60 * 60,
    'path'     => '/',
    'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax',
];
setcookie('remember_token', $token, $cookieParams);

jsonResponse([
    'id'   => $user['id'],
    'name' => $user['name'],
    'role' => $user['role'],
]);

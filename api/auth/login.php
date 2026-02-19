<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

cors();
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

jsonResponse([
    'id'   => $user['id'],
    'name' => $user['name'],
    'role' => $user['role'],
]);

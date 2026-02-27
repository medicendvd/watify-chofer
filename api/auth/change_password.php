<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$user = requireAuth();

$body = getBody();
$current_password = $body['current_password'] ?? '';
$new_password     = $body['new_password'] ?? '';

if (!$current_password || !$new_password) jsonError('Los campos no pueden estar vacíos');
if (strlen($new_password) < 4) jsonError('La nueva contraseña debe tener al menos 4 caracteres');

$pdo  = getDB();
$stmt = $pdo->prepare('SELECT password FROM users WHERE id = ?');
$stmt->execute([$user['id']]);
$row  = $stmt->fetch();

if (!$row || !password_verify($current_password, $row['password'])) {
    jsonError('Contraseña actual incorrecta', 400);
}

$hash = password_hash($new_password, PASSWORD_DEFAULT);
$upd  = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
$upd->execute([$hash, $user['id']]);

jsonResponse(['ok' => true]);

<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$user = requireAuth(['Chofer', 'Admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$body      = getBody();
$routeId   = (int)($body['route_id']       ?? 0);
$wasFull   = isset($body['was_full'])  ? (int)(bool)$body['was_full'] : null;
$condition = $body['condition_type'] ?? '';

$validConditions = ['buen_estado', 'uso_leve', 'parchado', 'tostado'];

if (!$routeId)                              jsonError('route_id requerido');
if ($wasFull === null)                      jsonError('Indica si el garrafón estaba lleno o vacío');
if (!in_array($condition, $validConditions)) jsonError('Condición inválida');

$pdo = getDB();

// Verificar que la ruta pertenece al usuario
$check = $pdo->prepare('SELECT id FROM routes WHERE id = ? AND user_id = ? AND status = "active"');
$check->execute([$routeId, $user['id']]);
if (!$check->fetch()) jsonError('Ruta no encontrada o ya finalizada', 404);

$stmt = $pdo->prepare(
    'INSERT INTO broken_garrafones (route_id, user_id, was_full, condition_type) VALUES (?, ?, ?, ?)'
);
$stmt->execute([$routeId, $user['id'], $wasFull, $condition]);

jsonResponse(['ok' => true, 'id' => (int)$pdo->lastInsertId()], 201);

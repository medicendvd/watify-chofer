<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method === 'POST') {
    $body     = getBody();
    $route_id = (int)($body['route_id'] ?? 0);
    $cantidad = (int)($body['cantidad'] ?? 0);
    $cliente  = trim($body['cliente'] ?? '');

    if ($route_id <= 0) jsonError('route_id requerido');
    if ($cantidad <= 0) jsonError('cantidad debe ser mayor a 0');
    if (!$cliente)      jsonError('cliente requerido');

    $stmt = $pdo->prepare('INSERT INTO route_facturas (route_id, cantidad, cliente) VALUES (?, ?, ?)');
    $stmt->execute([$route_id, $cantidad, $cliente]);
    $id = $pdo->lastInsertId();

    jsonResponse(['id' => (int)$id, 'route_id' => $route_id, 'cantidad' => $cantidad, 'cliente' => $cliente], 201);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('id requerido');

    $stmt = $pdo->prepare('DELETE FROM route_facturas WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['ok' => true]);
}

jsonError('Método no permitido', 405);

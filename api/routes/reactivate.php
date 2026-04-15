<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$user = requireAuth(['Admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$body    = getBody();
$routeId = (int)($body['route_id'] ?? 0);
if (!$routeId) jsonError('route_id requerido');

$pdo = getDB();

$stmt = $pdo->prepare('SELECT * FROM routes WHERE id = ?');
$stmt->execute([$routeId]);
$route = $stmt->fetch();

if (!$route) jsonError('Ruta no encontrada', 404);
if ($route['status'] !== 'finished') jsonError('La ruta no está finalizada');

$pdo->prepare("UPDATE routes SET status='active', finished_at=NULL WHERE id=?")
    ->execute([$routeId]);

jsonResponse(['ok' => true, 'route_id' => $routeId]);

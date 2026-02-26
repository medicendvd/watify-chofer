<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Método no permitido', 405);

$pdo = getDB();

// Obtener user_id del usuario Sucursal
$stmtUser = $pdo->query("SELECT id FROM users WHERE role = 'Sucursal' LIMIT 1");
$sucursalUser = $stmtUser->fetch();
if (!$sucursalUser) jsonError('Usuario sucursal no encontrado', 404);
$sucursalId = (int)$sucursalUser['id'];

// Buscar ruta de hoy
$stmtRoute = $pdo->prepare("
    SELECT id, started_at FROM routes
    WHERE user_id = ? AND DATE(started_at) = CURDATE()
    ORDER BY id DESC LIMIT 1
");
$stmtRoute->execute([$sucursalId]);
$route = $stmtRoute->fetch();

if (!$route) {
    // Crear ruta del día
    $stmtInsert = $pdo->prepare("
        INSERT INTO routes (user_id, garrafones_loaded, status) VALUES (?, 0, 'active')
    ");
    $stmtInsert->execute([$sucursalId]);
    $routeId   = (int)$pdo->lastInsertId();
    $startedAt = date('Y-m-d H:i:s');
} else {
    $routeId   = (int)$route['id'];
    $startedAt = $route['started_at'];
}

jsonResponse([
    'route_id'   => $routeId,
    'started_at' => $startedAt,
]);

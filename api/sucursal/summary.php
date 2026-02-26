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
    SELECT id FROM routes
    WHERE user_id = ? AND DATE(started_at) = CURDATE()
    ORDER BY id DESC LIMIT 1
");
$stmtRoute->execute([$sucursalId]);
$routeRow = $stmtRoute->fetch();

$today = date('Y-m-d');

if (!$routeRow) {
    jsonResponse([
        'date'              => $today,
        'route_id'          => null,
        'total'             => 0,
        'transaction_count' => 0,
        'by_method'         => [],
        'by_product'        => [],
    ]);
}

$routeId = (int)$routeRow['id'];

// Por método de pago
$stmtMethod = $pdo->prepare("
    SELECT pm.name AS method, pm.color, pm.icon,
           SUM(t.total) AS total,
           COUNT(t.id) AS count
    FROM transactions t
    JOIN payment_methods pm ON pm.id = t.payment_method_id
    WHERE t.route_id = ?
    GROUP BY pm.id
    ORDER BY SUM(t.total) DESC
");
$stmtMethod->execute([$routeId]);
$byMethod = array_map(fn($m) => [
    'method' => $m['method'],
    'color'  => $m['color'],
    'icon'   => $m['icon'],
    'total'  => (float)$m['total'],
    'count'  => (int)$m['count'],
], $stmtMethod->fetchAll());

// Por producto
$stmtProduct = $pdo->prepare("
    SELECT p.name AS product,
           SUM(ti.quantity) AS units,
           SUM(ti.subtotal) AS total
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    JOIN products p     ON p.id = ti.product_id
    WHERE t.route_id = ?
    GROUP BY p.id
    ORDER BY SUM(ti.subtotal) DESC
");
$stmtProduct->execute([$routeId]);
$byProduct = array_map(fn($p) => [
    'product' => $p['product'],
    'units'   => (int)$p['units'],
    'total'   => (float)$p['total'],
], $stmtProduct->fetchAll());

$grandTotal = array_sum(array_column($byMethod, 'total'));
$txCount    = array_sum(array_column($byMethod, 'count'));

jsonResponse([
    'date'              => $today,
    'route_id'          => $routeId,
    'total'             => $grandTotal,
    'transaction_count' => (int)$txCount,
    'by_method'         => $byMethod,
    'by_product'        => $byProduct,
]);

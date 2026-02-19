<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Método no permitido', 405);

$pdo = getDB();

// Rutas activas + rutas finalizadas hoy, ordenadas: activas primero, luego por nombre
$routesStmt = $pdo->query("
    SELECT r.id, r.garrafones_loaded, r.status, r.started_at, r.finished_at,
           u.id AS user_id, u.name AS chofer_name
    FROM routes r
    JOIN users u ON u.id = r.user_id
    WHERE r.status = 'active'
       OR (r.status = 'finished' AND DATE(r.started_at) = CURDATE())
    ORDER BY
      CASE r.status WHEN 'active' THEN 0 ELSE 1 END,
      u.name,
      r.started_at DESC
");
$routes = $routesStmt->fetchAll();

$result = [];

foreach ($routes as $route) {
    $routeId = (int)$route['id'];

    // Resumen financiero por método de pago
    $byMethod = $pdo->prepare("
        SELECT pm.name AS method, pm.color, pm.icon,
               SUM(t.total) AS total, COUNT(t.id) AS count
        FROM transactions t
        JOIN payment_methods pm ON pm.id = t.payment_method_id
        WHERE t.route_id = ?
        GROUP BY pm.id
        ORDER BY total DESC
    ");
    $byMethod->execute([$routeId]);
    $methods = $byMethod->fetchAll();

    // Empresas a crédito
    $byCompany = $pdo->prepare("
        SELECT c.name AS company, SUM(t.total) AS total, COUNT(t.id) AS count
        FROM transactions t
        JOIN companies c ON c.id = t.company_id
        WHERE t.route_id = ? AND t.company_id IS NOT NULL
        GROUP BY c.id
        ORDER BY c.name
    ");
    $byCompany->execute([$routeId]);
    $companies = $byCompany->fetchAll();
    $totalNegocios = array_sum(array_column($companies, 'total'));

    // Productos vendidos (todos)
    $productsStmt = $pdo->prepare("
        SELECT p.name AS product, p.display_order,
               SUM(ti.quantity) AS units,
               SUM(ti.subtotal) AS total
        FROM transactions t
        JOIN transaction_items ti ON ti.transaction_id = t.id
        JOIN products p ON p.id = ti.product_id
        WHERE t.route_id = ?
        GROUP BY p.id
        ORDER BY p.display_order
    ");
    $productsStmt->execute([$routeId]);
    $products = $productsStmt->fetchAll();

    // Garrafones vendidos
    $garrafStmt = $pdo->prepare("
        SELECT
          COALESCE(SUM(CASE WHEN p.name='Recarga' THEN ti.quantity ELSE 0 END),0) AS recargas,
          COALESCE(SUM(CASE WHEN p.name='Nuevo'   THEN ti.quantity ELSE 0 END),0) AS nuevos
        FROM transactions t
        LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
        LEFT JOIN products p ON p.id = ti.product_id
        WHERE t.route_id = ?
    ");
    $garrafStmt->execute([$routeId]);
    $garrafData = $garrafStmt->fetch();

    // Quebrados
    $brokenStmt = $pdo->prepare("
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN was_full=1 THEN 1 ELSE 0 END),0) AS llenos,
          COALESCE(SUM(CASE WHEN was_full=0 THEN 1 ELSE 0 END),0) AS vacios
        FROM broken_garrafones WHERE route_id = ?
    ");
    $brokenStmt->execute([$routeId]);
    $broken = $brokenStmt->fetch();

    $loaded   = (int)$route['garrafones_loaded'];
    $recargas = (int)$garrafData['recargas'];
    $nuevos   = (int)$garrafData['nuevos'];
    $qLlenos  = (int)$broken['llenos'];
    $qVacios  = (int)$broken['vacios'];

    $llenosARegr = max(0, $loaded - $recargas - $nuevos - $qLlenos);
    $vaciosARegr = max(0, $recargas - $qVacios);

    $result[] = [
        'route_id'      => $routeId,
        'chofer_id'     => (int)$route['user_id'],
        'chofer_name'   => $route['chofer_name'],
        'status'        => $route['status'],
        'started_at'    => $route['started_at'],
        'finished_at'   => $route['finished_at'],
        'total_ventas'  => (float)array_sum(array_column($methods, 'total')),
        'products'      => array_map(fn($p) => [
            'product' => $p['product'],
            'units'   => (int)$p['units'],
            'total'   => (float)$p['total'],
        ], $products),
        'by_method'     => $methods,
        'companies'     => $companies,
        'total_negocios'=> (float)$totalNegocios,
        'garrafones'    => [
            'cargados'          => $loaded,
            'recargas_vendidas' => $recargas,
            'nuevos_vendidos'   => $nuevos,
            'quebrados_llenos'  => $qLlenos,
            'quebrados_vacios'  => $qVacios,
            'total_quebrados'   => $qLlenos + $qVacios,
            'llenos_a_regresar' => $llenosARegr,
            'vacios_a_regresar' => $vaciosARegr,
            'total_a_regresar'  => $llenosARegr + $vaciosARegr,
        ],
    ];
}

jsonResponse($result);

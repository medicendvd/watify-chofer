<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Método no permitido', 405);

$pdo = getDB();

// Rango de "hoy" en zona horaria México para evitar el bug de CURDATE() UTC
$tz         = new DateTimeZone('America/Mexico_City');
$todayStart = (new DateTime('today', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
$todayEnd   = (new DateTime('tomorrow', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');

$routesStmt = $pdo->prepare("
    SELECT r.id, r.garrafones_loaded, r.status, r.started_at, r.finished_at,
           u.id AS user_id, u.name AS chofer_name
    FROM routes r
    JOIN users u ON u.id = r.user_id
    WHERE u.role != 'Sucursal'
      AND (r.status = 'active'
           OR (r.status = 'finished' AND r.started_at >= ? AND r.started_at < ?))
    ORDER BY
      CASE r.status WHEN 'active' THEN 0 ELSE 1 END,
      u.name,
      r.started_at DESC
");
$routesStmt->execute([$todayStart, $todayEnd]);
$routes = $routesStmt->fetchAll();

$result = [];

foreach ($routes as $route) {
    $routeId = (int)$route['id'];

    // Total de ventas (clientes)
    $countStmt = $pdo->prepare("SELECT COUNT(*) AS total FROM transactions WHERE route_id = ?");
    $countStmt->execute([$routeId]);
    $transactionCount = (int)$countStmt->fetchColumn();

    // Empresas a crédito con conteo de garrafones (sin dinero)
    $companyStmt = $pdo->prepare("
        SELECT c.name AS company,
               COALESCE(SUM(CASE WHEN p.name IN ('Recarga','Nuevo') THEN ti.quantity ELSE 0 END), 0) AS garrafones
        FROM transactions t
        JOIN companies c ON c.id = t.company_id
        JOIN transaction_items ti ON ti.transaction_id = t.id
        JOIN products p ON p.id = ti.product_id
        WHERE t.route_id = ? AND t.company_id IS NOT NULL
        GROUP BY c.id
        ORDER BY c.name
    ");
    $companyStmt->execute([$routeId]);
    $companies = $companyStmt->fetchAll();

    // Ventas con Link (método 4): nombre cliente + garrafones
    $linkStmt = $pdo->prepare("
        SELECT t.customer_name,
               COALESCE(SUM(CASE WHEN p.name IN ('Recarga','Nuevo') THEN ti.quantity ELSE 0 END), 0) AS garrafones
        FROM transactions t
        LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
        LEFT JOIN products p ON p.id = ti.product_id
        WHERE t.route_id = ? AND t.payment_method_id = 4
        GROUP BY t.id
        ORDER BY t.id
    ");
    $linkStmt->execute([$routeId]);
    $linkSales = $linkStmt->fetchAll();

    // Ventas con Tarjeta (método 2): nombre cliente + garrafones
    $tarjetaStmt = $pdo->prepare("
        SELECT t.customer_name,
               COALESCE(SUM(CASE WHEN p.name IN ('Recarga','Nuevo') THEN ti.quantity ELSE 0 END), 0) AS garrafones
        FROM transactions t
        LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
        LEFT JOIN products p ON p.id = ti.product_id
        WHERE t.route_id = ? AND t.payment_method_id = 2
        GROUP BY t.id
        ORDER BY t.id
    ");
    $tarjetaStmt->execute([$routeId]);
    $tarjetaSales = $tarjetaStmt->fetchAll();

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
        'route_id'         => $routeId,
        'chofer_id'        => (int)$route['user_id'],
        'chofer_name'      => $route['chofer_name'],
        'status'           => $route['status'],
        'started_at'       => $route['started_at'],
        'finished_at'      => $route['finished_at'],
        'transaction_count'=> $transactionCount,
        'companies'        => array_map(fn($c) => [
            'company'    => $c['company'],
            'garrafones' => (int)$c['garrafones'],
        ], $companies),
        'link_sales'       => array_map(fn($t) => [
            'customer_name' => $t['customer_name'],
            'garrafones'    => (int)$t['garrafones'],
        ], $linkSales),
        'tarjeta_sales'    => array_map(fn($t) => [
            'customer_name' => $t['customer_name'],
            'garrafones'    => (int)$t['garrafones'],
        ], $tarjetaSales),
        'garrafones'       => [
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

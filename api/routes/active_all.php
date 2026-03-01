<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Método no permitido', 405);

$pdo = getDB();

// Precio base de Recarga (igual que weekly.php)
$stmtPrecio = $pdo->query("SELECT base_price FROM products WHERE name LIKE '%Recarga%' ORDER BY display_order LIMIT 1");
$precioRecarga = (float)($stmtPrecio->fetchColumn() ?: 45);

// Calcular rango de "hoy" en zona horaria de México (UTC-6) para evitar
// que CURDATE() de MySQL (UTC) cause que las rutas desaparezcan después de las 6 PM
$tz         = new DateTimeZone('America/Mexico_City');
$todayStart = (new DateTime('today', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
$todayEnd   = (new DateTime('tomorrow', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');

// Rutas activas + rutas finalizadas hoy, ordenadas: activas primero, luego por nombre
$routesStmt = $pdo->prepare("
    SELECT r.id, r.garrafones_loaded, r.status, r.started_at, r.finished_at,
           u.id AS user_id, u.name AS chofer_name
    FROM routes r
    JOIN users u ON u.id = r.user_id
    WHERE (r.status = 'active'
       OR (r.status = 'finished' AND r.started_at >= ? AND r.started_at < ?))
      AND u.role != 'Sucursal'
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

    // Resumen financiero por método de pago (con garrafones)
    $byMethod = $pdo->prepare("
        SELECT pm.id, pm.name AS method, pm.color, pm.icon,
               SUM(t.total) AS total,
               COUNT(DISTINCT t.id) AS count,
               COALESCE(SUM(ti.quantity), 0) AS garrafones
        FROM transactions t
        JOIN payment_methods pm ON pm.id = t.payment_method_id
        LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
        WHERE t.route_id = ?
        GROUP BY pm.id
        ORDER BY SUM(t.total) DESC
    ");
    $byMethod->execute([$routeId]);
    $methodsRaw = $byMethod->fetchAll();
    $methods = array_map(fn($m) => [
        'id'         => (int)$m['id'],
        'method'     => $m['method'],
        'color'      => $m['color'],
        'icon'       => $m['icon'],
        'total'      => (float)$m['total'],
        'count'      => (int)$m['count'],
        'garrafones' => (int)$m['garrafones'],
    ], $methodsRaw);

    // Empresas a crédito (con garrafones)
    $byCompany = $pdo->prepare("
        SELECT c.name AS company, SUM(t.total) AS total,
               COUNT(DISTINCT t.id) AS count,
               COALESCE(SUM(ti.quantity), 0) AS garrafones
        FROM transactions t
        JOIN companies c ON c.id = t.company_id
        LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
        WHERE t.route_id = ? AND t.company_id IS NOT NULL
        GROUP BY c.id
        ORDER BY c.name
    ");
    $byCompany->execute([$routeId]);
    $companiesRaw = $byCompany->fetchAll();
    $companies = array_map(fn($c) => [
        'company'    => $c['company'],
        'total'      => (float)$c['total'],
        'count'      => (int)$c['count'],
        'garrafones' => (int)$c['garrafones'],
    ], $companiesRaw);
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

    // Transacciones individuales de la ruta
    $txStmt = $pdo->prepare("
        SELECT t.id, t.customer_name, t.total, t.transaction_date,
               t.payment_method_id, t.company_id,
               pm.name AS method, pm.color,
               c.name AS company_name
        FROM transactions t
        JOIN payment_methods pm ON pm.id = t.payment_method_id
        LEFT JOIN companies c ON c.id = t.company_id
        WHERE t.route_id = ?
        ORDER BY t.transaction_date ASC
    ");
    $txStmt->execute([$routeId]);
    $txRows = $txStmt->fetchAll();

    $txIds = array_column($txRows, 'id');
    $txItems = [];
    if (!empty($txIds)) {
        $placeholders = implode(',', array_fill(0, count($txIds), '?'));
        $itemStmt = $pdo->prepare("
            SELECT ti.transaction_id, ti.product_id, ti.unit_price,
                   p.name AS product, ti.quantity
            FROM transaction_items ti
            JOIN products p ON p.id = ti.product_id
            WHERE ti.transaction_id IN ($placeholders)
            ORDER BY p.display_order
        ");
        $itemStmt->execute($txIds);
        foreach ($itemStmt->fetchAll() as $item) {
            $txItems[(int)$item['transaction_id']][] = [
                'product_id' => (int)$item['product_id'],
                'unit_price' => (float)$item['unit_price'],
                'product'    => $item['product'],
                'quantity'   => (int)$item['quantity'],
            ];
        }
    }

    $transactions = array_map(fn($tx) => [
        'id'                => (int)$tx['id'],
        'customer_name'     => $tx['customer_name'],
        'company_name'      => $tx['company_name'],
        'company_id'        => $tx['company_id'] ? (int)$tx['company_id'] : null,
        'payment_method_id' => (int)$tx['payment_method_id'],
        'method'            => $tx['method'],
        'color'             => $tx['color'],
        'total'             => (float)$tx['total'],
        'time'              => $tx['transaction_date'],
        'items'             => $txItems[(int)$tx['id']] ?? [],
    ], $txRows);

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

    // Facturas de garrafones registradas para esta ruta
    $facturasStmt = $pdo->prepare('SELECT id, cantidad, cliente FROM route_facturas WHERE route_id = ? ORDER BY id ASC');
    $facturasStmt->execute([$routeId]);
    $facturas = array_map(fn($f) => [
        'id'       => (int)$f['id'],
        'cantidad' => (int)$f['cantidad'],
        'cliente'  => $f['cliente'],
    ], $facturasStmt->fetchAll());

    // Incidencias del día (deducciones y ajustes) para este chofer
    $routeDate = date('Y-m-d', strtotime($route['started_at']));
    $incStmt = $pdo->prepare(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM weekly_incidents WHERE chofer_id = ? AND `date` = ?"
    );
    $incStmt->execute([(int)$route['user_id'], $routeDate]);
    $incidenciasTotal = (float)$incStmt->fetchColumn();

    // Efectivo solo de HOY (para que el sobre del día coincida con el resumen semanal)
    $efectivoHoyStmt = $pdo->prepare("
        SELECT COALESCE(SUM(t.total), 0) AS total
        FROM transactions t
        JOIN payment_methods pm ON pm.id = t.payment_method_id
        WHERE t.route_id = ?
          AND pm.name IN ('Efectivo', 'Negocios en Efectivo')
          AND DATE(t.transaction_date) = ?
    ");
    $efectivoHoyStmt->execute([$routeId, $routeDate]);
    $efectivoHoy = (float)$efectivoHoyStmt->fetchColumn();

    $result[] = [
        'route_id'      => $routeId,
        'chofer_id'     => (int)$route['user_id'],
        'chofer_name'   => $route['chofer_name'],
        'status'        => $route['status'],
        'started_at'    => $route['started_at'],
        'finished_at'   => $route['finished_at'],
        'total_ventas'      => (float)array_sum(array_column($methods, 'total')),
        'transaction_count' => (int)array_sum(array_column($methods, 'count')),
        'products'      => array_map(fn($p) => [
            'product' => $p['product'],
            'units'   => (int)$p['units'],
            'total'   => (float)$p['total'],
        ], $products),
        'by_method'      => $methods,
        'companies'      => $companies,
        'total_negocios' => (float)$totalNegocios,
        'transactions'   => $transactions,
        'facturas'          => $facturas,
        'precio_recarga'    => $precioRecarga,
        'incidencias_total' => $incidenciasTotal,
        'efectivo_hoy'      => $efectivoHoy,
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

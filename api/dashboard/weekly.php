<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

$pdo = getDB();
$tz  = new DateTimeZone('America/Mexico_City');

// Lunes al domingo de la semana actual
$today     = new DateTime('today', $tz);
$dow       = (int)$today->format('N'); // 1=Lun, 7=Dom
$monday    = (clone $today)->modify('-' . ($dow - 1) . ' days');
$sunday    = (clone $monday)->modify('+6 days');
$mondayStr = $monday->format('Y-m-d');
$sundayStr = $sunday->format('Y-m-d');

// Totales por chofer, día y método de pago
$stmt = $pdo->prepare("
    SELECT u.id                      AS user_id,
           u.name                    AS user_name,
           DATE(t.transaction_date)  AS day,
           pm.name                   AS method,
           SUM(t.total)              AS total
    FROM transactions t
    JOIN payment_methods pm ON pm.id = t.payment_method_id
    JOIN users u            ON u.id  = t.user_id
    WHERE DATE(t.transaction_date) BETWEEN ? AND ?
      AND u.role = 'Chofer'
    GROUP BY u.id, DATE(t.transaction_date), pm.id
    ORDER BY u.name ASC, day ASC
");
$stmt->execute([$mondayStr, $sundayStr]);
$rows = $stmt->fetchAll();

// Precio base de Recarga (para calcular efectivo facturado)
$stmtPrecio = $pdo->query("SELECT base_price FROM products WHERE name LIKE '%Recarga%' ORDER BY display_order LIMIT 1");
$precioRecarga = (float)($stmtPrecio->fetchColumn() ?: 45);

// Efectivo facturado por chofer y día (route_facturas × precio Recarga)
$stmtFact = $pdo->prepare("
    SELECT r.user_id,
           u.name                AS user_name,
           DATE(r.started_at)   AS day,
           SUM(rf.cantidad)     AS total_garrafones
    FROM route_facturas rf
    JOIN routes r ON r.id = rf.route_id
    JOIN users u  ON u.id = r.user_id
    WHERE DATE(r.started_at) BETWEEN ? AND ?
    GROUP BY r.user_id, DATE(r.started_at)
");
$stmtFact->execute([$mondayStr, $sundayStr]);
$facturadoByDriverDay = [];
foreach ($stmtFact->fetchAll() as $r) {
    $facturadoByDriverDay[$r['user_id']]['name'] = $r['user_name'];
    $facturadoByDriverDay[$r['user_id']]['days'][$r['day']] = (int)$r['total_garrafones'] * $precioRecarga;
}

// Garrafones Nuevos por chofer y día (en dinero)
$stmtNuevos = $pdo->prepare("
    SELECT u.id                      AS user_id,
           DATE(t.transaction_date)  AS day,
           COALESCE(SUM(ti.subtotal), 0) AS nuevos
    FROM transaction_items ti
    JOIN transactions t ON t.id  = ti.transaction_id
    JOIN products p     ON p.id  = ti.product_id
    JOIN users u        ON u.id  = t.user_id
    WHERE p.name LIKE '%Nuevo%'
      AND DATE(t.transaction_date) BETWEEN ? AND ?
      AND u.role = 'Chofer'
    GROUP BY u.id, DATE(t.transaction_date)
");
$stmtNuevos->execute([$mondayStr, $sundayStr]);
$nuevosByDriverDay = [];
foreach ($stmtNuevos->fetchAll() as $r) {
    $nuevosByDriverDay[$r['user_id']][$r['day']] = (float)$r['nuevos'];
}

// Incidencias por chofer y día — individuales para mostrar detalle y tipo
$stmtInc = $pdo->prepare("
    SELECT id, chofer_id, `date`, amount, description,
           COALESCE(type, 'deduccion') AS type,
           prev_efectivo
    FROM weekly_incidents
    WHERE `date` BETWEEN ? AND ?
    ORDER BY id ASC
");
$stmtInc->execute([$mondayStr, $sundayStr]);
$incidentsByDriverDay = [];
foreach ($stmtInc->fetchAll() as $r) {
    $uid = $r['chofer_id'];
    $day = $r['date'];
    if (!isset($incidentsByDriverDay[$uid][$day])) {
        $incidentsByDriverDay[$uid][$day] = ['total' => 0.0, 'list' => []];
    }
    $incidentsByDriverDay[$uid][$day]['total'] += (float)$r['amount'];
    $incidentsByDriverDay[$uid][$day]['list'][] = [
        'id'            => (int)$r['id'],
        'amount'        => (float)$r['amount'],
        'description'   => $r['description'],
        'type'          => $r['type'],
        'prev_efectivo' => $r['prev_efectivo'] !== null ? (float)$r['prev_efectivo'] : null,
    ];
}

// Confirmaciones por chofer y día
$stmtConf = $pdo->prepare("
    SELECT chofer_id, `date`
    FROM weekly_confirmations
    WHERE `date` BETWEEN ? AND ?
");
$stmtConf->execute([$mondayStr, $sundayStr]);
$confirmedByDriverDay = [];
foreach ($stmtConf->fetchAll() as $r) {
    $confirmedByDriverDay[$r['chofer_id']][$r['date']] = true;
}

// Construir mapa user_id → { name, days: { day → {...} } }
$emptyDay = ['efectivo' => 0, 'negocios' => 0, 'link' => 0, 'tarjeta' => 0, 'nuevos' => 0, 'facturado' => 0];
$driverMap = [];
foreach ($rows as $r) {
    $uid    = $r['user_id'];
    $day    = $r['day'];
    $method = $r['method'];
    if (!isset($driverMap[$uid]))              $driverMap[$uid] = ['name' => $r['user_name'], 'days' => []];
    if (!isset($driverMap[$uid]['days'][$day])) $driverMap[$uid]['days'][$day] = $emptyDay;
    match ($method) {
        'Efectivo', 'Negocios en Efectivo' =>
            $driverMap[$uid]['days'][$day]['efectivo'] += (float)$r['total'],
        'Negocios' => $driverMap[$uid]['days'][$day]['negocios'] += (float)$r['total'],
        'Link'     => $driverMap[$uid]['days'][$day]['link']     += (float)$r['total'],
        'Tarjeta'  => $driverMap[$uid]['days'][$day]['tarjeta']  += (float)$r['total'],
        default    => null,
    };
}
foreach ($nuevosByDriverDay as $uid => $dayMap) {
    foreach ($dayMap as $day => $qty) {
        if (!isset($driverMap[$uid]))               continue;
        if (!isset($driverMap[$uid]['days'][$day])) $driverMap[$uid]['days'][$day] = $emptyDay;
        $driverMap[$uid]['days'][$day]['nuevos'] = $qty;
    }
}
foreach ($facturadoByDriverDay as $uid => $driverFact) {
    if (!isset($driverMap[$uid])) $driverMap[$uid] = ['name' => $driverFact['name'], 'days' => []];
    foreach ($driverFact['days'] as $day => $amount) {
        if (!isset($driverMap[$uid]['days'][$day])) $driverMap[$uid]['days'][$day] = $emptyDay;
        $driverMap[$uid]['days'][$day]['facturado'] = $amount;
    }
}

// Construir array final con los 7 días por chofer
$drivers = [];
foreach ($driverMap as $uid => $driverData) {
    $driverDays = [];
    for ($i = 0; $i < 7; $i++) {
        $d           = (clone $monday)->modify("+$i days")->format('Y-m-d');
        $data          = $driverData['days'][$d] ?? $emptyDay;
        $incData       = $incidentsByDriverDay[$uid][$d] ?? ['total' => 0.0, 'list' => []];
        $incidencias   = $incData['total'];
        $incidentsList = $incData['list'];
        $efectivoNeto = max(0, $data['efectivo'] - $incidencias);
        $total        = $efectivoNeto + $data['negocios'] + $data['link'] + $data['tarjeta'];
        $driverDays[] = [
            'date'           => $d,
            'efectivo'       => $efectivoNeto,
            'incidencias'    => $incidencias,
            'incidents_list' => $incidentsList,
            'facturado'      => $data['facturado'],
            'negocios'       => $data['negocios'],
            'link'           => $data['link'],
            'tarjeta'        => $data['tarjeta'],
            'nuevos'         => $data['nuevos'],
            'total'          => $total,
            'confirmed'      => $confirmedByDriverDay[$uid][$d] ?? false,
        ];
    }
    $drivers[] = [
        'id'   => (int)$uid,
        'name' => $driverData['name'],
        'days' => $driverDays,
    ];
}

jsonResponse([
    'week_start' => $mondayStr,
    'week_end'   => $sundayStr,
    'drivers'    => $drivers,
]);

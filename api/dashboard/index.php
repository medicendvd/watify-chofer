<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

$pdo  = getDB();
$date = $_GET['date'] ?? date('Y-m-d');

// ── 1. Total del día y por método de pago ────────────────────────────────────
$byMethod = $pdo->prepare("
    SELECT pm.name AS method, pm.color, pm.icon,
           SUM(t.total) AS total,
           COUNT(t.id)  AS count
    FROM transactions t
    JOIN payment_methods pm ON pm.id = t.payment_method_id
    WHERE DATE(t.transaction_date) = ?
    GROUP BY pm.id
");
$byMethod->execute([$date]);
$byMethodData = $byMethod->fetchAll();
$grandTotal   = array_sum(array_column($byMethodData, 'total'));

// ── 2. Por producto ─────────────────────────────────────────────────────────
$byProduct = $pdo->prepare("
    SELECT p.name AS product, p.display_order,
           SUM(ti.quantity) AS units,
           SUM(ti.subtotal)  AS total
    FROM transaction_items ti
    JOIN products p      ON p.id = ti.product_id
    JOIN transactions t  ON t.id = ti.transaction_id
    WHERE DATE(t.transaction_date) = ?
    GROUP BY p.id
    ORDER BY p.display_order
");
$byProduct->execute([$date]);
$byProductData = $byProduct->fetchAll();

// ── 3. Resumen por chofer ────────────────────────────────────────────────────
$byDriver = $pdo->prepare("
    SELECT u.id AS chofer_id, u.name AS chofer_name,
           pm.name AS method, pm.color, pm.icon,
           c.name AS company_name,
           SUM(t.total) AS total,
           COUNT(t.id)  AS count,
           COALESCE(SUM(ti_agg.qty), 0) AS garrafones
    FROM transactions t
    JOIN users u            ON u.id  = t.user_id
    JOIN payment_methods pm ON pm.id = t.payment_method_id
    LEFT JOIN companies c   ON c.id  = t.company_id
    LEFT JOIN (
        SELECT transaction_id, SUM(quantity) AS qty
        FROM transaction_items
        GROUP BY transaction_id
    ) ti_agg ON ti_agg.transaction_id = t.id
    WHERE DATE(t.transaction_date) = ? AND u.role = 'Chofer'
    GROUP BY u.id, pm.id, c.id
    ORDER BY u.name, pm.name
");
$byDriver->execute([$date]);

// Clientes con nombre para Link y Tarjeta
$clienteQuery = $pdo->prepare("
    SELECT t.user_id AS chofer_id,
           pm.name AS method,
           t.customer_name,
           COALESCE(SUM(ti.quantity), 0) AS garrafones
    FROM transactions t
    JOIN payment_methods pm ON pm.id = t.payment_method_id
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    WHERE DATE(t.transaction_date) = ?
      AND pm.name IN ('Link', 'Tarjeta')
      AND t.customer_name IS NOT NULL AND t.customer_name != ''
    GROUP BY t.id
    ORDER BY t.transaction_date
");
$clienteQuery->execute([$date]);

$clientesByKey = [];
foreach ($clienteQuery->fetchAll() as $row) {
    $key = $row['chofer_id'] . '_' . $row['method'];
    $clientesByKey[$key][] = [
        'name'       => $row['customer_name'],
        'garrafones' => (int)$row['garrafones'],
    ];
}

// Agrupar por chofer
$drivers = [];
foreach ($byDriver->fetchAll() as $row) {
    $cid = $row['chofer_id'];
    if (!isset($drivers[$cid])) {
        $drivers[$cid] = ['id' => $cid, 'name' => $row['chofer_name'], 'methods' => [], 'total' => 0];
    }
    $methodKey = $cid . '_' . $row['method'];
    $drivers[$cid]['methods'][] = [
        'method'       => $row['method'],
        'color'        => $row['color'],
        'icon'         => $row['icon'],
        'company_name' => $row['company_name'],
        'total'        => (float)$row['total'],
        'count'        => (int)$row['count'],
        'garrafones'   => (int)$row['garrafones'],
        'customers'    => $clientesByKey[$methodKey] ?? [],
    ];
    $drivers[$cid]['total'] += (float)$row['total'];
}

// ── 3b. Aplicar incidencias del día al efectivo ─────────────────────────────
$incStmt = $pdo->prepare("
    SELECT chofer_id, COALESCE(SUM(amount), 0) AS total
    FROM weekly_incidents
    WHERE `date` = ?
    GROUP BY chofer_id
");
$incStmt->execute([$date]);
$incByChofer      = [];
$totalIncidencias = 0.0;
foreach ($incStmt->fetchAll() as $r) {
    $incByChofer[(int)$r['chofer_id']] = (float)$r['total'];
    $totalIncidencias += (float)$r['total'];
}

// Ajustar total global de Efectivo y grand_total
if ($totalIncidencias != 0) {
    foreach ($byMethodData as &$m) {
        if ($m['method'] === 'Efectivo') {
            $m['total'] = max(0, (float)$m['total'] - $totalIncidencias);
            break;
        }
    }
    unset($m);
    $grandTotal = array_sum(array_column($byMethodData, 'total'));
}

// Ajustar efectivo por chofer en by_driver
foreach ($incByChofer as $choferId => $incAmount) {
    if (!isset($drivers[$choferId])) continue;
    foreach ($drivers[$choferId]['methods'] as &$method) {
        if ($method['method'] === 'Efectivo') {
            $method['total'] = max(0, $method['total'] - $incAmount);
            break;
        }
    }
    unset($method);
    $drivers[$choferId]['total'] = max(0, $drivers[$choferId]['total'] - $incAmount);
}

// ── 4. Series semanales (últimos 7 días) ────────────────────────────────────
$weekly = $pdo->prepare("
    SELECT DATE(transaction_date) AS day, SUM(total) AS total
    FROM transactions
    WHERE transaction_date >= DATE_SUB(?, INTERVAL 6 DAY)
      AND transaction_date < DATE_ADD(?, INTERVAL 1 DAY)
    GROUP BY DATE(transaction_date)
    ORDER BY day ASC
");
$weekly->execute([$date, $date]);
$weeklyData = $weekly->fetchAll();

// ── 5. DOD / WOW / MOM ──────────────────────────────────────────────────────
function periodTotal(PDO $pdo, string $from, string $to): float {
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(total),0) FROM transactions
         WHERE DATE(transaction_date) BETWEEN ? AND ?"
    );
    $stmt->execute([$from, $to]);
    return (float)$stmt->fetchColumn();
}

$today     = $date;
$yesterday = date('Y-m-d', strtotime('-1 day', strtotime($date)));
$lastWeek  = date('Y-m-d', strtotime('-7 days', strtotime($date)));
$monthStart   = date('Y-m-01', strtotime($date));
$lastMonthStart = date('Y-m-01', strtotime('-1 month', strtotime($date)));
$lastMonthEnd   = date('Y-m-t', strtotime('-1 month', strtotime($date)));

$todayTotal     = periodTotal($pdo, $today, $today);
$yesterdayTotal = periodTotal($pdo, $yesterday, $yesterday);
$lastWeekDay    = periodTotal($pdo, $lastWeek, $lastWeek);
$thisMonth      = periodTotal($pdo, $monthStart, $today);
$lastMonth      = periodTotal($pdo, $lastMonthStart, $lastMonthEnd);

$growth = fn($now, $prev) => $prev > 0 ? round(($now - $prev) / $prev * 100, 1) : null;

jsonResponse([
    'date'         => $date,
    'grand_total'  => (float)$grandTotal,
    'by_method'    => $byMethodData,
    'by_product'   => $byProductData,
    'by_driver'    => array_values($drivers),
    'weekly'       => $weeklyData,
    'dod'          => ['today' => $todayTotal, 'yesterday' => $yesterdayTotal, 'pct' => $growth($todayTotal, $yesterdayTotal)],
    'wow'          => ['this_week_day' => $todayTotal, 'last_week_day' => $lastWeekDay, 'pct' => $growth($todayTotal, $lastWeekDay)],
    'mom'          => ['this_month' => $thisMonth, 'last_month' => $lastMonth, 'pct' => $growth($thisMonth, $lastMonth)],
]);

<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

$pdo = getDB();

$MONTH_NAMES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
$DOW_LABELS  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ── Filtro de mes (opcional) ─────────────────────────────────────────────────
$month = isset($_GET['month']) ? $_GET['month'] : null;
if ($month && !preg_match('/^\d{4}-\d{2}$/', $month)) $month = null;

if ($month) {
    $monthStart     = $month . '-01';
    $monthEnd       = date('Y-m-t', strtotime($monthStart));
    $prevMonthStart = date('Y-m-01', strtotime('-1 month', strtotime($monthStart)));
    $prevMonthEnd   = date('Y-m-t',  strtotime('-1 month', strtotime($monthStart)));
    [$y, $m]        = explode('-', $month);
    $monthLabel     = $MONTH_NAMES[(int)$m] . ' ' . $y;

    // Resumen del mes
    $stmtSum = $pdo->prepare("SELECT COALESCE(SUM(total),0) AS total, COUNT(id) AS count FROM transactions WHERE DATE(transaction_date) BETWEEN ? AND ?");
    $stmtSum->execute([$monthStart, $monthEnd]);
    $sumRow = $stmtSum->fetch();

    $stmtPrev = $pdo->prepare("SELECT COALESCE(SUM(total),0) AS total FROM transactions WHERE DATE(transaction_date) BETWEEN ? AND ?");
    $stmtPrev->execute([$prevMonthStart, $prevMonthEnd]);
    $prevRow = $stmtPrev->fetch();

    $thisTotal = (float)$sumRow['total'];
    $prevTotal = (float)$prevRow['total'];
    $momPct    = $prevTotal > 0 ? round(($thisTotal - $prevTotal) / $prevTotal * 100, 1) : null;

    $monthSummary = [
        'month'       => $month,
        'month_label' => $monthLabel,
        'total'       => $thisTotal,
        'count'       => (int)$sumRow['count'],
        'prev_total'  => $prevTotal,
        'mom_pct'     => $momPct,
    ];

    // 1. Tendencia semanal — semanas del mes
    $stmtWeekly = $pdo->prepare("
        SELECT DATE_SUB(DATE(transaction_date), INTERVAL WEEKDAY(transaction_date) DAY) AS week_start,
               SUM(total) AS total, COUNT(id) AS count
        FROM transactions
        WHERE DATE(transaction_date) BETWEEN ? AND ?
        GROUP BY week_start ORDER BY week_start ASC
    ");
    $stmtWeekly->execute([$monthStart, $monthEnd]);
    $weeklyRaw   = $stmtWeekly->fetchAll();
    $weeklyTrend = [];
    for ($i = 0; $i < count($weeklyRaw); $i++) {
        $total = (float)$weeklyRaw[$i]['total'];
        $prev  = $i > 0 ? (float)$weeklyRaw[$i - 1]['total'] : null;
        $wow   = ($prev !== null && $prev > 0) ? round(($total - $prev) / $prev * 100, 1) : null;
        $d     = new DateTime($weeklyRaw[$i]['week_start']);
        $mn    = (int)$d->format('n');
        $weeklyTrend[] = [
            'week_start' => $weeklyRaw[$i]['week_start'],
            'week_label' => $d->format('d') . ' ' . $MONTH_NAMES[$mn],
            'total'      => $total,
            'count'      => (int)$weeklyRaw[$i]['count'],
            'wow_pct'    => $wow,
        ];
    }

    // 2. Tendencia diaria del mes (misma estructura que monthly_trend)
    $stmtMonthly = $pdo->prepare("
        SELECT DATE(transaction_date) AS month, SUM(total) AS total, COUNT(id) AS count
        FROM transactions
        WHERE DATE(transaction_date) BETWEEN ? AND ?
        GROUP BY DATE(transaction_date) ORDER BY month ASC
    ");
    $stmtMonthly->execute([$monthStart, $monthEnd]);
    $monthlyRaw   = $stmtMonthly->fetchAll();
    $monthlyTrend = [];
    for ($i = 0; $i < count($monthlyRaw); $i++) {
        $total = (float)$monthlyRaw[$i]['total'];
        $prev  = $i > 0 ? (float)$monthlyRaw[$i - 1]['total'] : null;
        $dod   = ($prev !== null && $prev > 0) ? round(($total - $prev) / $prev * 100, 1) : null;
        $d     = new DateTime($monthlyRaw[$i]['month']);
        $monthlyTrend[] = [
            'month'       => $monthlyRaw[$i]['month'],
            'month_label' => $d->format('j'),
            'total'       => $total,
            'count'       => (int)$monthlyRaw[$i]['count'],
            'mom_pct'     => $dod,
        ];
    }

    // 3. Desempeño de choferes — semanas del mes
    $stmtDrivers = $pdo->prepare("
        SELECT u.id AS driver_id, u.name AS driver_name,
               DATE_SUB(DATE(t.transaction_date), INTERVAL WEEKDAY(t.transaction_date) DAY) AS week_start,
               SUM(t.total) AS total
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        WHERE u.role = 'Chofer' AND DATE(t.transaction_date) BETWEEN ? AND ?
        GROUP BY u.id, week_start ORDER BY week_start ASC, u.name ASC
    ");
    $stmtDrivers->execute([$monthStart, $monthEnd]);
    $driverMap = [];
    foreach ($stmtDrivers->fetchAll() as $r) {
        $uid = (int)$r['driver_id'];
        if (!isset($driverMap[$uid])) {
            $driverMap[$uid] = ['driver_id' => $uid, 'driver_name' => $r['driver_name'], 'weeks' => []];
        }
        $driverMap[$uid]['weeks'][] = ['week_start' => $r['week_start'], 'total' => (float)$r['total']];
    }
    $driversTrend = array_values($driverMap);

    // 4. Evolución de métodos — días del mes (misma estructura que methods_trend)
    $stmtMethods = $pdo->prepare("
        SELECT pm.name AS method, pm.color AS color,
               DATE(t.transaction_date) AS month,
               SUM(t.total) AS total, COUNT(t.id) AS count
        FROM transactions t
        JOIN payment_methods pm ON pm.id = t.payment_method_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        GROUP BY pm.id, DATE(t.transaction_date) ORDER BY month ASC, pm.name ASC
    ");
    $stmtMethods->execute([$monthStart, $monthEnd]);
    $methodMap = [];
    foreach ($stmtMethods->fetchAll() as $r) {
        $key = $r['method'];
        if (!isset($methodMap[$key])) {
            $methodMap[$key] = ['method' => $key, 'color' => $r['color'], 'months' => []];
        }
        $methodMap[$key]['months'][] = ['month' => $r['month'], 'total' => (float)$r['total'], 'count' => (int)$r['count']];
    }
    $methodsTrend = array_values($methodMap);

    // 5. Análisis por día de la semana — solo el mes
    $stmtDow = $pdo->prepare("
        SELECT dow, AVG(daily_total) AS avg_total, MAX(daily_total) AS max_total,
               MIN(daily_total) AS min_total, COUNT(*) AS day_count
        FROM (
            SELECT DATE(transaction_date) AS day, WEEKDAY(transaction_date) AS dow, SUM(total) AS daily_total
            FROM transactions
            WHERE DATE(transaction_date) BETWEEN ? AND ?
            GROUP BY DATE(transaction_date), WEEKDAY(transaction_date)
        ) daily
        GROUP BY dow ORDER BY dow ASC
    ");
    $stmtDow->execute([$monthStart, $monthEnd]);
    $dowAnalysis = [];
    foreach ($stmtDow->fetchAll() as $r) {
        $dow = (int)$r['dow'];
        $dowAnalysis[] = [
            'dow'       => $dow,
            'label'     => $DOW_LABELS[$dow] ?? "D$dow",
            'avg_total' => round((float)$r['avg_total'], 0),
            'max_total' => (float)$r['max_total'],
            'min_total' => (float)$r['min_total'],
            'day_count' => (int)$r['day_count'],
        ];
    }

    jsonResponse([
        'weekly_trend'  => $weeklyTrend,
        'monthly_trend' => $monthlyTrend,
        'drivers_trend' => $driversTrend,
        'methods_trend' => $methodsTrend,
        'dow_analysis'  => $dowAnalysis,
        'month_summary' => $monthSummary,
    ]);
    exit;
}

// ── 1. Tendencia semanal — últimas 12 semanas ────────────────────────────────
$stmtWeekly = $pdo->query("
    SELECT
        DATE_SUB(DATE(transaction_date), INTERVAL WEEKDAY(transaction_date) DAY) AS week_start,
        SUM(total) AS total,
        COUNT(id)  AS count
    FROM transactions
    WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
    GROUP BY week_start
    ORDER BY week_start ASC
");
$weeklyRaw   = $stmtWeekly->fetchAll();
$weeklyTrend = [];
for ($i = 0; $i < count($weeklyRaw); $i++) {
    $total   = (float)$weeklyRaw[$i]['total'];
    $prev    = $i > 0 ? (float)$weeklyRaw[$i - 1]['total'] : null;
    $wow_pct = ($prev !== null && $prev > 0) ? round(($total - $prev) / $prev * 100, 1) : null;
    $d       = new DateTime($weeklyRaw[$i]['week_start']);
    $mn      = (int)$d->format('n');
    $weeklyTrend[] = [
        'week_start'  => $weeklyRaw[$i]['week_start'],
        'week_label'  => $d->format('d') . ' ' . $MONTH_NAMES[$mn],
        'total'       => $total,
        'count'       => (int)$weeklyRaw[$i]['count'],
        'wow_pct'     => $wow_pct,
    ];
}

// ── 2. Tendencia mensual — últimos 8 meses ───────────────────────────────────
$stmtMonthly = $pdo->query("
    SELECT
        DATE_FORMAT(transaction_date, '%Y-%m') AS month,
        SUM(total) AS total,
        COUNT(id)  AS count
    FROM transactions
    WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 8 MONTH)
    GROUP BY month
    ORDER BY month ASC
");
$monthlyRaw   = $stmtMonthly->fetchAll();
$monthlyTrend = [];
for ($i = 0; $i < count($monthlyRaw); $i++) {
    $total   = (float)$monthlyRaw[$i]['total'];
    $prev    = $i > 0 ? (float)$monthlyRaw[$i - 1]['total'] : null;
    $mom_pct = ($prev !== null && $prev > 0) ? round(($total - $prev) / $prev * 100, 1) : null;
    [$y, $m] = explode('-', $monthlyRaw[$i]['month']);
    $monthlyTrend[] = [
        'month'       => $monthlyRaw[$i]['month'],
        'month_label' => $MONTH_NAMES[(int)$m] . ' ' . substr($y, 2),
        'total'       => $total,
        'count'       => (int)$monthlyRaw[$i]['count'],
        'mom_pct'     => $mom_pct,
    ];
}

// ── 3. Desempeño de choferes — últimas 8 semanas ────────────────────────────
$stmtDrivers = $pdo->query("
    SELECT
        u.id   AS driver_id,
        u.name AS driver_name,
        DATE_SUB(DATE(t.transaction_date), INTERVAL WEEKDAY(t.transaction_date) DAY) AS week_start,
        SUM(t.total) AS total
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    WHERE u.role = 'Chofer'
      AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
    GROUP BY u.id, week_start
    ORDER BY week_start ASC, u.name ASC
");
$driverMap = [];
foreach ($stmtDrivers->fetchAll() as $r) {
    $uid = (int)$r['driver_id'];
    if (!isset($driverMap[$uid])) {
        $driverMap[$uid] = ['driver_id' => $uid, 'driver_name' => $r['driver_name'], 'weeks' => []];
    }
    $driverMap[$uid]['weeks'][] = [
        'week_start' => $r['week_start'],
        'total'      => (float)$r['total'],
    ];
}
$driversTrend = array_values($driverMap);

// ── 4. Evolución de métodos de pago — últimos 6 meses ───────────────────────
$stmtMethods = $pdo->query("
    SELECT
        pm.name  AS method,
        pm.color AS color,
        DATE_FORMAT(t.transaction_date, '%Y-%m') AS month,
        SUM(t.total) AS total,
        COUNT(t.id)  AS count
    FROM transactions t
    JOIN payment_methods pm ON pm.id = t.payment_method_id
    WHERE t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY pm.id, month
    ORDER BY month ASC, pm.name ASC
");
$methodMap = [];
foreach ($stmtMethods->fetchAll() as $r) {
    $key = $r['method'];
    if (!isset($methodMap[$key])) {
        $methodMap[$key] = ['method' => $key, 'color' => $r['color'], 'months' => []];
    }
    $methodMap[$key]['months'][] = [
        'month' => $r['month'],
        'total' => (float)$r['total'],
        'count' => (int)$r['count'],
    ];
}
$methodsTrend = array_values($methodMap);

// ── 5. Análisis por día de semana — últimos 90 días ─────────────────────────
$stmtDow = $pdo->query("
    SELECT
        dow,
        AVG(daily_total) AS avg_total,
        MAX(daily_total) AS max_total,
        MIN(daily_total) AS min_total,
        COUNT(*)         AS day_count
    FROM (
        SELECT
            DATE(transaction_date)      AS day,
            WEEKDAY(transaction_date)   AS dow,
            SUM(total)                  AS daily_total
        FROM transactions
        WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        GROUP BY DATE(transaction_date), WEEKDAY(transaction_date)
    ) daily
    GROUP BY dow
    ORDER BY dow ASC
");
$dowAnalysis = [];
foreach ($stmtDow->fetchAll() as $r) {
    $dow = (int)$r['dow'];
    $dowAnalysis[] = [
        'dow'       => $dow,
        'label'     => $DOW_LABELS[$dow] ?? "D$dow",
        'avg_total' => round((float)$r['avg_total'], 0),
        'max_total' => (float)$r['max_total'],
        'min_total' => (float)$r['min_total'],
        'day_count' => (int)$r['day_count'],
    ];
}

jsonResponse([
    'weekly_trend'  => $weeklyTrend,
    'monthly_trend' => $monthlyTrend,
    'drivers_trend' => $driversTrend,
    'methods_trend' => $methodsTrend,
    'dow_analysis'  => $dowAnalysis,
]);

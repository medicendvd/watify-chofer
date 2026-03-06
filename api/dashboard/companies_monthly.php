<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

$pdo = getDB();

// Mes a consultar (default: mes actual, puede recibir ?month=2025-03)
$month = $_GET['month'] ?? date('Y-m');

// Validar formato
if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
    $month = date('Y-m');
}

$monthStart = $month . '-01';
$monthEnd   = date('Y-m-t', strtotime($monthStart));

// ── 1. Totales por empresa ───────────────────────────────────────────────────
$stmtCompanies = $pdo->prepare("
    SELECT
        c.id            AS company_id,
        c.name          AS company,
        COUNT(DISTINCT t.id)  AS visits,
        COALESCE(SUM(ti.quantity), 0) AS units,
        SUM(t.total)    AS total
    FROM transactions t
    JOIN companies c ON c.id = t.company_id
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    WHERE DATE(t.transaction_date) BETWEEN ? AND ?
      AND t.company_id IS NOT NULL
    GROUP BY c.id
    ORDER BY total DESC
");
$stmtCompanies->execute([$monthStart, $monthEnd]);
$companyRows = $stmtCompanies->fetchAll();

// ── 2. Desglose por producto por empresa ─────────────────────────────────────
$stmtProducts = $pdo->prepare("
    SELECT
        t.company_id,
        p.name          AS product,
        p.display_order,
        SUM(ti.quantity)  AS units,
        SUM(ti.subtotal)  AS total
    FROM transaction_items ti
    JOIN transactions t ON t.id = ti.transaction_id
    JOIN products p     ON p.id = ti.product_id
    WHERE DATE(t.transaction_date) BETWEEN ? AND ?
      AND t.company_id IS NOT NULL
    GROUP BY t.company_id, p.id
    ORDER BY t.company_id, p.display_order
");
$stmtProducts->execute([$monthStart, $monthEnd]);

$productsByCompany = [];
foreach ($stmtProducts->fetchAll() as $r) {
    $cid = (int)$r['company_id'];
    $productsByCompany[$cid][] = [
        'product' => $r['product'],
        'units'   => (int)$r['units'],
        'total'   => (float)$r['total'],
    ];
}

// ── 3. Tendencia diaria agregada (todas las empresas) ────────────────────────
$stmtDaily = $pdo->prepare("
    SELECT
        DATE(t.transaction_date) AS day,
        SUM(t.total)             AS total,
        COUNT(DISTINCT t.id)     AS visits
    FROM transactions t
    WHERE DATE(t.transaction_date) BETWEEN ? AND ?
      AND t.company_id IS NOT NULL
    GROUP BY DATE(t.transaction_date)
    ORDER BY day ASC
");
$stmtDaily->execute([$monthStart, $monthEnd]);
$dailyTrend = [];
foreach ($stmtDaily->fetchAll() as $r) {
    $d = new DateTime($r['day']);
    $dailyTrend[] = [
        'day'    => $r['day'],
        'label'  => $d->format('d'),
        'total'  => (float)$r['total'],
        'visits' => (int)$r['visits'],
    ];
}

// ── 4. Construir response ────────────────────────────────────────────────────
$companies = [];
$grandTotal = 0;
$grandUnits = 0;
$grandVisits = 0;

foreach ($companyRows as $r) {
    $cid         = (int)$r['company_id'];
    $total       = (float)$r['total'];
    $grandTotal += $total;
    $grandUnits += (int)$r['units'];
    $grandVisits += (int)$r['visits'];
    $companies[] = [
        'company_id' => $cid,
        'company'    => $r['company'],
        'visits'     => (int)$r['visits'],
        'units'      => (int)$r['units'],
        'total'      => $total,
        'products'   => $productsByCompany[$cid] ?? [],
    ];
}

// Etiqueta del mes en español
$MONTH_NAMES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
[$y, $m] = explode('-', $month);
$monthLabel = $MONTH_NAMES[(int)$m] . ' ' . $y;

jsonResponse([
    'month'       => $month,
    'month_label' => $monthLabel,
    'grand_total' => $grandTotal,
    'grand_units' => $grandUnits,
    'grand_visits'=> $grandVisits,
    'companies'   => $companies,
    'daily_trend' => $dailyTrend,
]);

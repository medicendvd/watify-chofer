<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

$pdo = getDB();

$companyId = (int)($_GET['company_id'] ?? 0);
$month     = $_GET['month'] ?? date('Y-m');

if ($companyId <= 0) jsonError('company_id requerido');
if (!preg_match('/^\d{4}-\d{2}$/', $month)) $month = date('Y-m');

$monthStart = $month . '-01';
$monthEnd   = date('Y-m-t', strtotime($monthStart));

// Nombre de la empresa
$stmtCo = $pdo->prepare("SELECT name FROM companies WHERE id = ?");
$stmtCo->execute([$companyId]);
$company = $stmtCo->fetchColumn();
if (!$company) jsonError('Empresa no encontrada', 404);

// Entregas del mes — una fila por transacción
$stmt = $pdo->prepare("
    SELECT
        t.id,
        DATE(t.transaction_date)    AS date,
        t.transaction_date          AS datetime,
        t.customer_name,
        t.notes,
        u.name                      AS chofer,
        t.total,
        COALESCE(SUM(ti.quantity), 0) AS units
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    WHERE t.company_id = ?
      AND DATE(t.transaction_date) BETWEEN ? AND ?
    GROUP BY t.id
    ORDER BY t.transaction_date ASC
");
$stmt->execute([$companyId, $monthStart, $monthEnd]);
$rows = $stmt->fetchAll();

// Ítems por transacción
$stmtItems = $pdo->prepare("
    SELECT ti.transaction_id, p.name AS product, ti.quantity
    FROM transaction_items ti
    JOIN products p ON p.id = ti.product_id
    WHERE ti.transaction_id IN (
        SELECT id FROM transactions
        WHERE company_id = ?
          AND DATE(transaction_date) BETWEEN ? AND ?
    )
    ORDER BY p.display_order
");
$stmtItems->execute([$companyId, $monthStart, $monthEnd]);

$itemsByTx = [];
foreach ($stmtItems->fetchAll() as $r) {
    $itemsByTx[(int)$r['transaction_id']][] = [
        'product'  => $r['product'],
        'quantity' => (int)$r['quantity'],
    ];
}

$deliveries = [];
foreach ($rows as $r) {
    $deliveries[] = [
        'id'            => (int)$r['id'],
        'date'          => $r['date'],
        'customer_name' => $r['customer_name'],
        'notes'         => $r['notes'],
        'chofer'        => $r['chofer'],
        'total'         => (float)$r['total'],
        'units'         => (int)$r['units'],
        'items'         => $itemsByTx[(int)$r['id']] ?? [],
    ];
}

jsonResponse([
    'company_id'   => $companyId,
    'company'      => $company,
    'month'        => $month,
    'deliveries'   => $deliveries,
]);

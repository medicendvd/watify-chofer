<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin', 'Visor']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Método no permitido', 405);

$pdo = getDB();

$stmt = $pdo->query("
    SELECT
        t.id               AS transaction_id,
        t.customer_name,
        t.transaction_date AS delivery_date,
        t.total,
        COALESCE(SUM(ti.quantity), 0) AS garrafones,
        lp.paid_at,
        u.name             AS paid_by_name
    FROM transactions t
    JOIN payment_methods pm ON pm.id = t.payment_method_id AND pm.name = 'Link'
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    LEFT JOIN link_payments lp ON lp.transaction_id = t.id
    LEFT JOIN users u ON u.id = lp.paid_by
    GROUP BY t.id, t.customer_name, t.transaction_date, t.total, lp.paid_at, u.name
    ORDER BY (lp.paid_at IS NOT NULL) ASC, t.transaction_date ASC
");

$rows = $stmt->fetchAll();

$result = array_map(fn($r) => [
    'transaction_id' => (int)$r['transaction_id'],
    'customer_name'  => $r['customer_name'],
    'garrafones'     => (int)$r['garrafones'],
    'total'          => (float)$r['total'],
    'delivery_date'  => $r['delivery_date'],
    'paid_at'        => $r['paid_at'],
    'paid_by_name'   => $r['paid_by_name'],
], $rows);

jsonResponse($result);

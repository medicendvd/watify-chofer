<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$currentUser = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// GET /api/transactions/ — transacciones del día actual (del chofer o todas si es Admin)
if ($method === 'GET') {
    $date   = $_GET['date'] ?? date('Y-m-d');
    $userId = $_GET['user_id'] ?? null;

    if ($currentUser['role'] === 'Chofer') {
        // Solo ve las suyas
        $userId = $currentUser['id'];
    }

    $where = 'DATE(t.transaction_date) = :date';
    $params = [':date' => $date];

    if ($userId) {
        $where .= ' AND t.user_id = :user_id';
        $params[':user_id'] = (int)$userId;
    }

    $sql = "
        SELECT
            t.id,
            t.user_id,
            u.name AS chofer_name,
            t.customer_name,
            t.company_id,
            c.name  AS company_name,
            t.payment_method_id,
            pm.name  AS payment_method_name,
            pm.color AS payment_method_color,
            pm.icon  AS payment_method_icon,
            t.total,
            t.notes,
            t.transaction_date
        FROM transactions t
        JOIN users u           ON u.id  = t.user_id
        JOIN payment_methods pm ON pm.id = t.payment_method_id
        LEFT JOIN companies c  ON c.id  = t.company_id
        WHERE $where
        ORDER BY t.transaction_date DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll();

    // Adjuntar items a cada transacción
    $txIds = array_column($transactions, 'id');
    $items = [];

    if (!empty($txIds)) {
        $placeholders = implode(',', array_fill(0, count($txIds), '?'));
        $itemStmt = $pdo->prepare(
            "SELECT ti.transaction_id, ti.product_id, p.name AS product_name,
                    ti.quantity, ti.unit_price, ti.subtotal
             FROM transaction_items ti
             JOIN products p ON p.id = ti.product_id
             WHERE ti.transaction_id IN ($placeholders)"
        );
        $itemStmt->execute($txIds);
        foreach ($itemStmt->fetchAll() as $item) {
            $items[$item['transaction_id']][] = $item;
        }
    }

    foreach ($transactions as &$tx) {
        $tx['items'] = $items[$tx['id']] ?? [];
    }

    jsonResponse($transactions);
}

// POST /api/transactions/ — crear venta
if ($method === 'POST') {
    $body            = getBody();
    $customerName    = trim($body['customer_name'] ?? '');
    $companyId       = $body['company_id'] ? (int)$body['company_id'] : null;
    $paymentMethodId = (int)($body['payment_method_id'] ?? 0);
    $notes           = trim($body['notes'] ?? '');
    $items           = $body['items'] ?? [];
    $routeId         = $body['route_id'] ? (int)$body['route_id'] : null;

    if (!$paymentMethodId)    jsonError('Método de pago requerido');
    if (empty($items))        jsonError('Agrega al menos un producto');

    // Calcular total
    $total = 0;
    foreach ($items as $item) {
        $total += (float)$item['unit_price'] * (int)$item['quantity'];
    }

    $pdo->beginTransaction();
    try {
        $stmtTx = $pdo->prepare(
            'INSERT INTO transactions
             (user_id, route_id, customer_name, company_id, payment_method_id, total, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmtTx->execute([
            $currentUser['id'],
            $routeId,
            $customerName ?: null,
            $companyId,
            $paymentMethodId,
            $total,
            $notes ?: null,
        ]);
        $txId = $pdo->lastInsertId();

        $stmtItem = $pdo->prepare(
            'INSERT INTO transaction_items
             (transaction_id, product_id, quantity, unit_price, subtotal)
             VALUES (?, ?, ?, ?, ?)'
        );
        foreach ($items as $item) {
            $qty      = (int)$item['quantity'];
            $price    = (float)$item['unit_price'];
            $subtotal = $qty * $price;
            $stmtItem->execute([$txId, (int)$item['product_id'], $qty, $price, $subtotal]);
        }

        $pdo->commit();
        jsonResponse(['id' => $txId, 'total' => $total], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Error al guardar la venta: ' . $e->getMessage(), 500);
    }
}

jsonError('Método no permitido', 405);

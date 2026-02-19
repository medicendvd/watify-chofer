<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$currentUser = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) jsonError('ID requerido');

// Verificar que la transacción existe y pertenece al usuario (o es Admin)
$tx = $pdo->prepare('SELECT * FROM transactions WHERE id = ?');
$tx->execute([$id]);
$transaction = $tx->fetch();

if (!$transaction) jsonError('Transacción no encontrada', 404);

if ($currentUser['role'] !== 'Admin' && $transaction['user_id'] !== $currentUser['id']) {
    jsonError('Acceso denegado', 403);
}

// DELETE
if ($method === 'DELETE') {
    $pdo->prepare('DELETE FROM transactions WHERE id = ?')->execute([$id]);
    jsonResponse(['ok' => true]);
}

// PUT — editar transacción
if ($method === 'PUT') {
    $body            = getBody();
    $customerName    = trim($body['customer_name'] ?? '');
    $companyId       = isset($body['company_id']) && $body['company_id'] ? (int)$body['company_id'] : null;
    $paymentMethodId = (int)($body['payment_method_id'] ?? 0);
    $notes           = trim($body['notes'] ?? '');
    $items           = $body['items'] ?? [];

    if (!$paymentMethodId) jsonError('Método de pago requerido');
    if (empty($items))     jsonError('Agrega al menos un producto');

    $total = 0;
    foreach ($items as $item) {
        $total += (float)$item['unit_price'] * (int)$item['quantity'];
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'UPDATE transactions
             SET customer_name=?, company_id=?, payment_method_id=?, total=?, notes=?
             WHERE id=?'
        )->execute([$customerName ?: null, $companyId, $paymentMethodId, $total, $notes ?: null, $id]);

        // Reemplazar items
        $pdo->prepare('DELETE FROM transaction_items WHERE transaction_id = ?')->execute([$id]);

        $stmtItem = $pdo->prepare(
            'INSERT INTO transaction_items
             (transaction_id, product_id, quantity, unit_price, subtotal)
             VALUES (?, ?, ?, ?, ?)'
        );
        foreach ($items as $item) {
            $qty      = (int)$item['quantity'];
            $price    = (float)$item['unit_price'];
            $stmtItem->execute([$id, (int)$item['product_id'], $qty, $price, $qty * $price]);
        }

        $pdo->commit();
        jsonResponse(['ok' => true, 'id' => $id, 'total' => $total]);

    } catch (Exception $e) {
        $pdo->rollBack();
        jsonError('Error al actualizar: ' . $e->getMessage(), 500);
    }
}

jsonError('Método no permitido', 405);

<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) jsonError('Cuerpo JSON inválido', 400);

$routeId         = isset($body['route_id'])         ? (int)$body['route_id']         : null;
$customerName    = $body['customer_name']    ?? null;
$companyId       = isset($body['company_id'])       ? (int)$body['company_id']       : null;
$paymentMethodId = isset($body['payment_method_id']) ? (int)$body['payment_method_id'] : null;
$items           = $body['items'] ?? [];

// Validaciones básicas
if (!$routeId)         jsonError('route_id requerido', 400);
if (!$paymentMethodId) jsonError('payment_method_id requerido', 400);
if (empty($items))     jsonError('items no puede estar vacío', 400);
if ($paymentMethodId === 3 && !$companyId) jsonError('company_id requerido para método Negocios', 400);

$pdo = getDB();

// Verificar que la ruta pertenece al usuario Sucursal
$stmtUser = $pdo->query("SELECT id FROM users WHERE role = 'Sucursal' LIMIT 1");
$sucursalUser = $stmtUser->fetch();
if (!$sucursalUser) jsonError('Usuario sucursal no encontrado', 404);
$sucursalId = (int)$sucursalUser['id'];

$stmtRoute = $pdo->prepare("SELECT id FROM routes WHERE id = ? AND user_id = ?");
$stmtRoute->execute([$routeId, $sucursalId]);
if (!$stmtRoute->fetch()) jsonError('Ruta no válida para sucursal', 403);

// Calcular total
$total = 0.0;
foreach ($items as $item) {
    $qty       = isset($item['quantity'])   ? (int)$item['quantity']   : 0;
    $unitPrice = isset($item['unit_price']) ? (float)$item['unit_price'] : 0.0;
    if ($qty <= 0 || $unitPrice < 0) jsonError('Item inválido', 400);
    $total += $qty * $unitPrice;
}
if ($total <= 0) jsonError('Total debe ser mayor a 0', 400);

// Transacción PDO
$pdo->beginTransaction();
try {
    $stmtTx = $pdo->prepare("
        INSERT INTO transactions (user_id, route_id, customer_name, company_id, payment_method_id, total)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmtTx->execute([$sucursalId, $routeId, $customerName ?: null, $companyId, $paymentMethodId, $total]);
    $txId = (int)$pdo->lastInsertId();

    $stmtItem = $pdo->prepare("
        INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
    ");
    foreach ($items as $item) {
        $qty       = (int)$item['quantity'];
        $productId = (int)$item['product_id'];
        $unitPrice = (float)$item['unit_price'];
        $subtotal  = $qty * $unitPrice;
        $stmtItem->execute([$txId, $productId, $qty, $unitPrice, $subtotal]);
    }

    $pdo->commit();
    jsonResponse(['id' => $txId, 'total' => $total]);
} catch (Exception $e) {
    $pdo->rollBack();
    jsonError('Error al registrar venta: ' . $e->getMessage(), 500);
}

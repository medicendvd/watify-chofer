<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') jsonError('Método no permitido', 405);

$body      = getBody();
$companyId = (int)($body['company_id'] ?? 0);
$productId = (int)($body['product_id'] ?? 0);
$price     = (float)($body['price'] ?? 0);

if (!$companyId || !$productId || $price < 0) jsonError('Datos inválidos');

$pdo  = getDB();
$stmt = $pdo->prepare(
    'INSERT INTO company_prices (company_id, product_id, price) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE price = VALUES(price)'
);
$stmt->execute([$companyId, $productId, $price]);

jsonResponse(['ok' => true, 'company_id' => $companyId, 'product_id' => $productId, 'price' => $price]);

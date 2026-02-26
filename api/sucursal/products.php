<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Método no permitido', 405);

$pdo = getDB();

$stmt = $pdo->query("
    SELECT id, name, base_price, display_order
    FROM products
    WHERE sucursal_only = 1
    ORDER BY display_order ASC
");
$products = array_map(fn($p) => [
    'id'            => (int)$p['id'],
    'name'          => $p['name'],
    'base_price'    => (float)$p['base_price'],
    'display_order' => (int)$p['display_order'],
], $stmt->fetchAll());

jsonResponse($products);

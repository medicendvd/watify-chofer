<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$currentUser = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method === 'GET') {
    // Devuelve empresas con sus precios especiales por producto
    $companies = $pdo->query(
        'SELECT c.id, c.name, c.is_active FROM companies c WHERE c.is_active = 1 ORDER BY c.display_order ASC, c.name ASC'
    )->fetchAll();

    // Adjuntar precios especiales a cada empresa
    $prices = $pdo->query(
        'SELECT cp.company_id, cp.product_id, cp.price FROM company_prices cp'
    )->fetchAll();

    $priceMap = [];
    foreach ($prices as $p) {
        $priceMap[$p['company_id']][$p['product_id']] = (float)$p['price'];
    }

    foreach ($companies as &$c) {
        $c['special_prices'] = $priceMap[$c['id']] ?? [];
    }

    jsonResponse($companies);
}

if ($method === 'POST') {
    requireAuth(['Admin']);
    $body = getBody();
    $name = trim($body['name'] ?? '');
    if (!$name) jsonError('Nombre requerido');

    $stmt = $pdo->prepare('INSERT INTO companies (name) VALUES (?)');
    $stmt->execute([$name]);
    $id = $pdo->lastInsertId();

    jsonResponse(['id' => $id, 'name' => $name, 'is_active' => 1, 'special_prices' => []], 201);
}

jsonError('Método no permitido', 405);

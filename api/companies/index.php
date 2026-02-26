<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$currentUser = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method === 'GET') {
    $userId = $currentUser['id'];

    // Asignaciones de zona del usuario actual
    $stmtZone = $pdo->prepare(
        'SELECT company_id, priority FROM company_assignments WHERE user_id = ? ORDER BY priority ASC'
    );
    $stmtZone->execute([$userId]);
    $zoneRows = $stmtZone->fetchAll();
    $hasZone  = count($zoneRows) > 0;
    $zoneMap  = [];
    foreach ($zoneRows as $z) {
        $zoneMap[(int)$z['company_id']] = (int)$z['priority'];
    }

    // Empresas activas
    $companies = $pdo->query(
        'SELECT c.id, c.name, c.is_active, c.payment_method_id FROM companies c WHERE c.is_active = 1'
    )->fetchAll();

    // Precios especiales
    $prices = $pdo->query(
        'SELECT cp.company_id, cp.product_id, cp.price FROM company_prices cp'
    )->fetchAll();
    $priceMap = [];
    foreach ($prices as $p) {
        $priceMap[$p['company_id']][$p['product_id']] = (float)$p['price'];
    }

    // Añadir is_zone y zone_priority a cada empresa
    foreach ($companies as &$c) {
        $cid = (int)$c['id'];
        $c['payment_method_id'] = $c['payment_method_id'] !== null ? (int)$c['payment_method_id'] : null;
        $c['special_prices']    = $priceMap[$cid] ?? [];
        $c['is_zone']           = $hasZone ? isset($zoneMap[$cid]) : true;
        $c['zone_priority']     = $zoneMap[$cid] ?? null;
    }
    unset($c);

    // Ordenar: zona primero (por priority), luego resto alfabéticamente
    usort($companies, function($a, $b) {
        $aZone = $a['is_zone'] && $a['zone_priority'] !== null;
        $bZone = $b['is_zone'] && $b['zone_priority'] !== null;
        if ($aZone && $bZone) return $a['zone_priority'] - $b['zone_priority'];
        if ($aZone)  return -1;
        if ($bZone)  return  1;
        return strcmp($a['name'], $b['name']);
    });

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

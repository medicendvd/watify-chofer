<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$user   = requireAuth(['Chofer', 'Admin']);
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// GET — obtener ruta activa del usuario
if ($method === 'GET') {
    $stmt = $pdo->prepare(
        "SELECT r.id, r.garrafones_loaded, r.status, r.started_at,
                -- Recargas vendidas en esta ruta (quantity suma múltiples items)
                COALESCE(SUM(CASE WHEN p.name = 'Recarga' THEN ti.quantity ELSE 0 END), 0) AS recargas_vendidas,
                COALESCE(SUM(CASE WHEN p.name = 'Nuevo'   THEN ti.quantity ELSE 0 END), 0) AS nuevos_vendidos,
                -- Garrafones quebrados
                (SELECT COUNT(*) FROM broken_garrafones bg WHERE bg.route_id = r.id) AS total_quebrados,
                (SELECT COUNT(*) FROM broken_garrafones bg WHERE bg.route_id = r.id AND bg.was_full = 1) AS quebrados_llenos,
                (SELECT COUNT(*) FROM broken_garrafones bg WHERE bg.route_id = r.id AND bg.was_full = 0) AS quebrados_vacios
         FROM routes r
         LEFT JOIN transactions t   ON t.route_id = r.id
         LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
         LEFT JOIN products p        ON p.id = ti.product_id
         WHERE r.user_id = ? AND r.status = 'active'
         GROUP BY r.id
         ORDER BY r.started_at DESC
         LIMIT 1"
    );
    $stmt->execute([$user['id']]);
    $route = $stmt->fetch();

    if (!$route) {
        jsonResponse(null);
    }

    // Calcular conteos de garrafones
    $loaded          = (int)$route['garrafones_loaded'];
    $recargas        = (int)$route['recargas_vendidas'];
    $nuevos          = (int)$route['nuevos_vendidos'];
    $qLlenos         = (int)$route['quebrados_llenos'];
    $qVacios         = (int)$route['quebrados_vacios'];
    $totalQuebrados  = $qLlenos + $qVacios;

    $llenosARegr  = max(0, $loaded - $recargas - $nuevos - $qLlenos);
    $vaciosARegr  = max(0, $recargas - $qVacios);
    $totalARegr   = $llenosARegr + $vaciosARegr;

    jsonResponse([
        'id'               => (int)$route['id'],
        'garrafones_loaded'=> $loaded,
        'status'           => $route['status'],
        'started_at'       => $route['started_at'],
        'garrafones' => [
            'cargados'         => $loaded,
            'recargas_vendidas'=> $recargas,
            'nuevos_vendidos'  => $nuevos,
            'total_quebrados'  => $totalQuebrados,
            'quebrados_llenos' => $qLlenos,
            'quebrados_vacios' => $qVacios,
            'llenos_a_regresar'=> $llenosARegr,
            'vacios_a_regresar'=> $vaciosARegr,
            'total_a_regresar' => $totalARegr,
        ],
    ]);
}

// POST — crear nueva ruta
if ($method === 'POST') {
    $body      = getBody();
    $garrafones = (int)($body['garrafones_loaded'] ?? 0);
    if ($garrafones <= 0) jsonError('Indica cuántos garrafones cargaste');

    // Finalizar cualquier ruta activa previa
    $pdo->prepare(
        "UPDATE routes SET status='finished', finished_at=NOW() WHERE user_id=? AND status='active'"
    )->execute([$user['id']]);

    $stmt = $pdo->prepare(
        'INSERT INTO routes (user_id, garrafones_loaded, status) VALUES (?, ?, "active")'
    );
    $stmt->execute([$user['id'], $garrafones]);
    $routeId = $pdo->lastInsertId();

    jsonResponse([
        'id'                => (int)$routeId,
        'garrafones_loaded' => $garrafones,
        'status'            => 'active',
        'garrafones' => [
            'cargados'          => $garrafones,
            'recargas_vendidas' => 0,
            'nuevos_vendidos'   => 0,
            'total_quebrados'   => 0,
            'quebrados_llenos'  => 0,
            'quebrados_vacios'  => 0,
            'llenos_a_regresar' => $garrafones,
            'vacios_a_regresar' => 0,
            'total_a_regresar'  => $garrafones,
        ],
    ], 201);
}

jsonError('Método no permitido', 405);

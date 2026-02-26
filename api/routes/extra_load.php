<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$user   = requireAuth(['Chofer', 'Admin']);
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// GET — chofer obtiene su primera carga pendiente
if ($method === 'GET') {
    // Buscar ruta activa del chofer
    $routeStmt = $pdo->prepare(
        "SELECT id FROM routes WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1"
    );
    $routeStmt->execute([$user['id']]);
    $route = $routeStmt->fetch();

    if (!$route) {
        jsonResponse(null);
    }

    $stmt = $pdo->prepare(
        "SELECT * FROM recargas_extra WHERE route_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 1"
    );
    $stmt->execute([(int)$route['id']]);
    $load = $stmt->fetch();

    jsonResponse($load ?: null);
}

// POST — admin envía carga extra a una ruta
if ($method === 'POST') {
    if ($user['role'] !== 'Admin') jsonError('Acceso denegado', 403);

    $body     = getBody();
    $routeId  = (int)($body['route_id'] ?? 0);
    $cantidad = (int)($body['cantidad'] ?? 0);

    if (!$routeId)        jsonError('route_id requerido');
    if ($cantidad <= 0)   jsonError('cantidad debe ser mayor a 0');

    // Verificar que la ruta existe y está activa
    $routeStmt = $pdo->prepare("SELECT id FROM routes WHERE id = ? AND status = 'active'");
    $routeStmt->execute([$routeId]);
    if (!$routeStmt->fetch()) jsonError('Ruta no encontrada o no activa', 404);

    // Insertar la carga y sumar garrafones_loaded inmediatamente
    $stmt = $pdo->prepare(
        "INSERT INTO recargas_extra (route_id, cantidad) VALUES (?, ?)"
    );
    $stmt->execute([$routeId, $cantidad]);
    $newId = (int)$pdo->lastInsertId();

    $pdo->prepare(
        "UPDATE routes SET garrafones_loaded = garrafones_loaded + ? WHERE id = ?"
    )->execute([$cantidad, $routeId]);

    jsonResponse(['ok' => true, 'id' => $newId], 201);
}

// PATCH — chofer acepta la carga
if ($method === 'PATCH') {
    $body = getBody();
    $id   = (int)($body['id'] ?? 0);
    if (!$id) jsonError('id requerido');

    // Obtener la carga y verificar que es de la ruta del chofer
    $loadStmt = $pdo->prepare(
        "SELECT re.* FROM recargas_extra re
         JOIN routes r ON r.id = re.route_id
         WHERE re.id = ? AND re.status = 'pending' AND r.user_id = ?"
    );
    $loadStmt->execute([$id, $user['id']]);
    $load = $loadStmt->fetch();

    if (!$load) jsonError('Carga no encontrada o ya aceptada', 404);

    // Marcar como aceptada (garrafones_loaded ya fue sumado al enviar)
    $pdo->prepare(
        "UPDATE recargas_extra SET status='accepted', accepted_at=NOW() WHERE id=?"
    )->execute([$id]);

    jsonResponse(['ok' => true]);
}

jsonError('Método no permitido', 405);

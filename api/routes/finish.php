<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$user = requireAuth(['Chofer', 'Admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$body    = getBody();
$routeId = (int)($body['route_id'] ?? 0);
if (!$routeId) jsonError('route_id requerido');

$pdo = getDB();

// Verificar que la ruta pertenece al usuario
$route = $pdo->prepare('SELECT * FROM routes WHERE id = ? AND user_id = ?');
$route->execute([$routeId, $user['id']]);
$routeData = $route->fetch();
if (!$routeData) jsonError('Ruta no encontrada', 404);

// ── Resumen financiero por método de pago ────────────────────────────────────
$byMethod = $pdo->prepare("
    SELECT pm.name AS method, pm.color, pm.icon,
           SUM(t.total) AS total, COUNT(t.id) AS count
    FROM transactions t
    JOIN payment_methods pm ON pm.id = t.payment_method_id
    WHERE t.route_id = ?
    GROUP BY pm.id
");
$byMethod->execute([$routeId]);

// ── Empresas a crédito ───────────────────────────────────────────────────────
$byCompany = $pdo->prepare("
    SELECT c.name AS company, SUM(t.total) AS total, COUNT(t.id) AS count
    FROM transactions t
    JOIN companies c ON c.id = t.company_id
    WHERE t.route_id = ? AND t.company_id IS NOT NULL
    GROUP BY c.id
    ORDER BY c.name
");
$byCompany->execute([$routeId]);
$companies = $byCompany->fetchAll();
$totalNegocios = array_sum(array_column($companies, 'total'));

// ── Conteo de garrafones ─────────────────────────────────────────────────────
$garrafStmt = $pdo->prepare("
    SELECT
      COALESCE(SUM(CASE WHEN p.name='Recarga' THEN ti.quantity ELSE 0 END),0) AS recargas,
      COALESCE(SUM(CASE WHEN p.name='Nuevo'   THEN ti.quantity ELSE 0 END),0) AS nuevos
    FROM transactions t
    JOIN transaction_items ti ON ti.transaction_id = t.id
    JOIN products p ON p.id = ti.product_id
    WHERE t.route_id = ?
");
$garrafStmt->execute([$routeId]);
$garrafData = $garrafStmt->fetch();

$brokenStmt = $pdo->prepare("
    SELECT
      COUNT(*) AS total,
      SUM(was_full=1) AS llenos,
      SUM(was_full=0) AS vacios
    FROM broken_garrafones WHERE route_id = ?
");
$brokenStmt->execute([$routeId]);
$broken = $brokenStmt->fetch();

$loaded    = (int)$routeData['garrafones_loaded'];
$recargas  = (int)$garrafData['recargas'];
$nuevos    = (int)$garrafData['nuevos'];
$qLlenos   = (int)$broken['llenos'];
$qVacios   = (int)$broken['vacios'];

$llenosARegr = max(0, $loaded - $recargas - $nuevos - $qLlenos);
$vaciosARegr = max(0, $recargas - $qVacios);

// ── Marcar ruta como terminada ────────────────────────────────────────────────
$pdo->prepare("UPDATE routes SET status='finished', finished_at=NOW() WHERE id=?")
    ->execute([$routeId]);

jsonResponse([
    'route_id'    => $routeId,
    'by_method'   => $byMethod->fetchAll(),
    'companies'   => $companies,
    'total_negocios' => (float)$totalNegocios,
    'garrafones'  => [
        'cargados'          => $loaded,
        'recargas_vendidas' => $recargas,
        'nuevos_vendidos'   => $nuevos,
        'quebrados_llenos'  => $qLlenos,
        'quebrados_vacios'  => $qVacios,
        'total_quebrados'   => $qLlenos + $qVacios,
        'llenos_a_regresar' => $llenosARegr,
        'vacios_a_regresar' => $vaciosARegr,
        'total_a_regresar'  => $llenosARegr + $vaciosARegr,
    ],
]);

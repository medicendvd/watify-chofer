<?php
/**
 * Cron job — finalizar rutas activas del día anterior automáticamente.
 *
 * Configurar en Hostinger cPanel → Cron Jobs:
 *   Hora: 59 23 * * *  (cada día a las 23:59)
 *   Comando: curl -s "https://TU_DOMINIO/api/routes/cron_finish.php?token=TU_TOKEN_SECRETO" > /dev/null 2>&1
 *
 * El token se define en la variable CRON_SECRET de .env o directamente abajo.
 */
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';

date_default_timezone_set('America/Mexico_City');

// ── Validar token secreto ────────────────────────────────────────────────────
$secret = getenv('CRON_SECRET') ?: 'watify_cron_2026';  // cambia esto en producción
$token  = $_GET['token'] ?? $_SERVER['HTTP_X_CRON_TOKEN'] ?? '';

if (!hash_equals($secret, $token)) {
    http_response_code(403);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

cors();

$pdo = getDB();

// Finalizar todas las rutas activas cuyo día ya terminó (started_at de un día anterior a hoy)
$stmt = $pdo->prepare("
    UPDATE routes
    SET status = 'finished',
        finished_at = DATE_FORMAT(DATE(started_at), '%Y-%m-%d 23:59:00')
    WHERE status = 'active'
      AND DATE(started_at) < CURDATE()
");
$stmt->execute();
$count = $stmt->rowCount();

jsonResponse([
    'ok'       => true,
    'finished' => $count,
    'ts'       => date('Y-m-d H:i:s'),
]);

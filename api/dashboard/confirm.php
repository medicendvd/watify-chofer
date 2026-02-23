<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$admin = requireAuth(['Admin']);
$pdo   = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$body     = getBody();
$choferId = (int)($body['chofer_id'] ?? 0);
$date     = trim($body['date'] ?? '');

if (!$choferId)                                  jsonError('chofer_id requerido');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) jsonError('Fecha inválida');

$stmt = $pdo->prepare(
    'INSERT INTO weekly_confirmations (`date`, chofer_id, confirmed_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE confirmed_by = VALUES(confirmed_by), confirmed_at = NOW()'
);
$stmt->execute([$date, $choferId, $admin['id']]);

jsonResponse(['ok' => true]);

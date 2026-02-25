<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$admin = requireAuth(['Admin']);
$pdo   = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$body        = getBody();
$choferId    = (int)($body['chofer_id'] ?? 0);
$description = trim($body['description'] ?? '');
$type        = ($body['type'] ?? '') === 'ajuste' ? 'ajuste' : 'deduccion';

if (!$choferId)    jsonError('chofer_id requerido');
if (!$description) jsonError('Descripción requerida');

$tz      = new DateTimeZone('America/Mexico_City');
$dateStr = trim($body['date'] ?? '');
if ($dateStr && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)) {
    $date = $dateStr;
} else {
    $date = (new DateTime('today', $tz))->format('Y-m-d');
}

if ($type === 'ajuste') {
    $prevEfectivo = (float)($body['prev_efectivo'] ?? 0);
    $newEfectivo  = (float)($body['new_efectivo']  ?? 0);
    if ($prevEfectivo < 0 || $newEfectivo < 0) jsonError('Montos inválidos');
    $amount = $prevEfectivo - $newEfectivo; // puede ser negativo (corrección al alza)
} else {
    $amount       = (float)($body['amount'] ?? 0);
    $prevEfectivo = null;
    if ($amount <= 0) jsonError('El monto debe ser mayor a $0');
}

$stmt = $pdo->prepare(
    'INSERT INTO weekly_incidents (`date`, chofer_id, description, amount, created_by, type, prev_efectivo)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([$date, $choferId, $description, $amount, $admin['id'], $type, $prevEfectivo]);
$id = $pdo->lastInsertId();

jsonResponse(['id' => (int)$id, 'date' => $date], 201);

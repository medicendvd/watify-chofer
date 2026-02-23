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
$amount      = (float)($body['amount'] ?? 0);

if (!$choferId)    jsonError('chofer_id requerido');
if (!$description) jsonError('Descripción requerida');
if ($amount <= 0)  jsonError('El monto debe ser mayor a $0');

$tz   = new DateTimeZone('America/Mexico_City');
$date = (new DateTime('today', $tz))->format('Y-m-d');

$stmt = $pdo->prepare(
    'INSERT INTO weekly_incidents (`date`, chofer_id, description, amount, created_by)
     VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([$date, $choferId, $description, $amount, $admin['id']]);
$id = $pdo->lastInsertId();

jsonResponse(['id' => (int)$id, 'date' => $date], 201);

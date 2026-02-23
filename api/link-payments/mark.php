<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
$user = requireAuth(['Admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$body           = getBody();
$transaction_id = (int)($body['transaction_id'] ?? 0);
if (!$transaction_id) jsonError('transaction_id requerido');

$pdo = getDB();

$stmt = $pdo->prepare("
    INSERT INTO link_payments (transaction_id, paid_at, paid_by)
    VALUES (?, NOW(), ?)
    ON DUPLICATE KEY UPDATE paid_at = NOW(), paid_by = ?
");
$stmt->execute([$transaction_id, $user['id'], $user['id']]);

jsonResponse(['ok' => true, 'paid_at' => date('Y-m-d H:i:s')]);

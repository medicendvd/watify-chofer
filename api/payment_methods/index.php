<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Método no permitido', 405);

$pdo  = getDB();
$stmt = $pdo->query("SELECT id, name, color, icon, is_active FROM payment_methods ORDER BY id");
jsonResponse($stmt->fetchAll());

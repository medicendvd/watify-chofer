<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth();

$pdo  = getDB();
$stmt = $pdo->query('SELECT id, name, base_price, display_order FROM products ORDER BY display_order ASC');
jsonResponse($stmt->fetchAll());

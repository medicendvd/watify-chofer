<?php
/**
 * Migración: agregar columnas remember_token a tabla users.
 * Ejecutar UNA sola vez en producción:
 *   curl "https://TU_DOMINIO/api/config/migrate_remember_token.php?run=1"
 * Después ELIMINAR este archivo del servidor por seguridad.
 */
if (($_GET['run'] ?? '') !== '1') {
    echo 'Agrega ?run=1 para ejecutar la migración.';
    exit;
}

require_once __DIR__ . '/db.php';
$pdo = getDB();

// Verificar si ya existen las columnas
$cols = $pdo->query("SHOW COLUMNS FROM users LIKE 'remember_token'")->fetchAll();
if (!empty($cols)) {
    echo json_encode(['ok' => true, 'msg' => 'Las columnas ya existen, nada que hacer.']);
    exit;
}

$pdo->exec("
    ALTER TABLE users
      ADD COLUMN remember_token VARCHAR(64) NULL,
      ADD COLUMN remember_token_expires DATETIME NULL,
      ADD INDEX idx_remember_token (remember_token)
");

echo json_encode(['ok' => true, 'msg' => 'Migración aplicada correctamente.']);

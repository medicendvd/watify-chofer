<?php
date_default_timezone_set('America/Mexico_City');

function requireAuth(array $roles = []): array {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 30 * 24 * 60 * 60,
            'path'     => '/',
            'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    // ── Si la sesión PHP expiró, intentar restaurarla con el remember_token ──
    if (empty($_SESSION['user_id'])) {
        $token = $_COOKIE['remember_token'] ?? '';
        if ($token !== '') {
            try {
                require_once __DIR__ . '/../config/db.php';
                $pdo  = getDB();
                $stmt = $pdo->prepare(
                    'SELECT id, name, role FROM users
                     WHERE remember_token = ?
                       AND remember_token_expires > NOW()'
                );
                $stmt->execute([$token]);
                $user = $stmt->fetch();
                if ($user) {
                    $_SESSION['user_id']   = $user['id'];
                    $_SESSION['user_name'] = $user['name'];
                    $_SESSION['user_role'] = $user['role'];
                }
            } catch (\Throwable $e) { /* ignorar — jsonError abajo si sigue vacío */ }
        }
    }

    if (empty($_SESSION['user_id'])) {
        jsonError('No autorizado', 401);
    }

    if (!empty($roles) && !in_array($_SESSION['user_role'], $roles, true)) {
        jsonError('Acceso denegado', 403);
    }

    return [
        'id'   => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'],
        'role' => $_SESSION['user_role'],
    ];
}

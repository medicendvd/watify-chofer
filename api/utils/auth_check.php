<?php
/**
 * Verifica que haya sesión activa.
 * Opcionalmente restringe a roles específicos.
 *
 * Uso:
 *   requireAuth();              // cualquier usuario logueado
 *   requireAuth(['Admin']);     // solo Admins
 */
function requireAuth(array $roles = []): array {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
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

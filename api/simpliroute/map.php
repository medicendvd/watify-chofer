<?php
require_once '../config/db.php';
require_once '../utils/response.php';
require_once '../utils/auth_check.php';

requireAuth(['Admin', 'Visor']);

$token = 'a8be0c30758b3b22809f3d4365e3cb13522e34af';
$date  = date('Y-m-d');

function sr_get(string $url, string $token): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER  => true,
        CURLOPT_TIMEOUT         => 15,
        CURLOPT_FOLLOWLOCATION  => true,
        CURLOPT_SSL_VERIFYPEER  => false,   // compatibilidad Hostinger
        CURLOPT_SSL_VERIFYHOST  => 0,
        CURLOPT_HTTPHEADER      => [
            "Authorization: Token {$token}",
            "Content-Type: application/json",
        ],
    ]);
    $body  = curl_exec($ch);
    $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);

    if ($error || $code !== 200 || !$body) return null;
    $decoded = json_decode($body, true);
    return is_array($decoded) ? $decoded : null;
}

// 1. Vehículos con rutas hoy
$vehicles = sr_get("https://api.simpliroute.com/v1/plans/{$date}/vehicles/", $token);
if (empty($vehicles)) {
    jsonResponse(['routes' => [], 'date' => $date]);
}

// 2. Todas las visitas del día
$allVisits = sr_get("https://api.simpliroute.com/v1/routes/visits/?planned_date={$date}", $token) ?? [];

// Agrupar visitas por route_id
$visitsByRoute = [];
foreach ($allVisits as $v) {
    $rid = $v['route'] ?? null;
    if (!$rid) continue;
    $visitsByRoute[$rid][] = [
        'order'        => (int)($v['order'] ?? 0),
        'title'        => $v['title']   ?? '',
        'address'      => $v['address'] ?? '',
        'lat'          => (float)($v['latitude']  ?? 0),
        'lng'          => (float)($v['longitude'] ?? 0),
        'status'       => $v['status']  ?? 'pending',
        'checkout_lat' => isset($v['checkout_latitude'])  && $v['checkout_latitude']  !== null ? (float)$v['checkout_latitude']  : null,
        'checkout_lng' => isset($v['checkout_longitude']) && $v['checkout_longitude'] !== null ? (float)$v['checkout_longitude'] : null,
        'checkout_time'=> $v['checkout_time'] ?? null,
    ];
}

// 3. Construir salida
$routes = [];
foreach ($vehicles as $vehicle) {
    $vehicleRoutes = $vehicle['routes'] ?? [];
    foreach ($vehicleRoutes as $routeRef) {
        $rid    = $routeRef['id'];
        $visits = $visitsByRoute[$rid] ?? [];
        usort($visits, fn($a, $b) => $a['order'] - $b['order']);

        // Última posición conocida = último checkout con coordenadas
        $lastPos = null;
        foreach (array_reverse($visits) as $vv) {
            if ($vv['checkout_lat'] && $vv['checkout_lng']) {
                $lastPos = ['lat' => $vv['checkout_lat'], 'lng' => $vv['checkout_lng']];
                break;
            }
        }

        $completedCount = count(array_filter($visits, fn($vv) => $vv['status'] === 'completed'));

        $routes[] = [
            'route_id'      => $rid,
            'vehicle_name'  => $vehicle['name']             ?? '',
            'driver_name'   => $vehicle['driver']['name']   ?? '',
            'driver_phone'  => $vehicle['driver']['phone']  ?? '',
            'color'         => $vehicle['color']            ?? '#1a2fa8',
            'total_visits'  => count($visits),
            'completed'     => $completedCount,
            'last_position' => $lastPos,
            'visits'        => $visits,
        ];
    }
}

jsonResponse(['routes' => $routes, 'date' => $date]);

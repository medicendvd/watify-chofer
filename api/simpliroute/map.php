<?php
require_once '../config/db.php';
require_once '../utils/response.php';
require_once '../utils/auth_check.php';

requireAuth(['Admin', 'Visor']);

$token = 'a8be0c30758b3b22809f3d4365e3cb13522e34af';
$date  = date('Y-m-d', strtotime('now', mktime(0, 0, 0, (int)date('n'), (int)date('j'), (int)date('Y'))));

function sr_get(string $url, string $token): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER     => ["Authorization: Token {$token}", "Content-Type: application/json"],
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200 || !$body) return null;
    return json_decode($body, true);
}

// 1. Today's vehicles with planned routes
$vehicles = sr_get("https://api.simpliroute.com/v1/plans/{$date}/vehicles/", $token);
if (empty($vehicles)) {
    json_response(['routes' => [], 'date' => $date]);
}

// 2. All visits for today
$allVisits = sr_get("https://api.simpliroute.com/v1/routes/visits/?planned_date={$date}", $token) ?? [];

// Group visits by route_id
$visitsByRoute = [];
foreach ($allVisits as $v) {
    $rid = $v['route'];
    $visitsByRoute[$rid][] = [
        'order'        => (int)$v['order'],
        'title'        => $v['title'] ?? '',
        'address'      => $v['address'] ?? '',
        'lat'          => (float)$v['latitude'],
        'lng'          => (float)$v['longitude'],
        'status'       => $v['status'] ?? 'pending',
        'checkout_lat' => $v['checkout_latitude']  ? (float)$v['checkout_latitude']  : null,
        'checkout_lng' => $v['checkout_longitude'] ? (float)$v['checkout_longitude'] : null,
        'checkout_time'=> $v['checkout_time'] ?? null,
    ];
}

// 3. Build output
$routes = [];
foreach ($vehicles as $vehicle) {
    foreach ($vehicle['routes'] as $routeRef) {
        $rid    = $routeRef['id'];
        $visits = $visitsByRoute[$rid] ?? [];
        usort($visits, fn($a, $b) => $a['order'] - $b['order']);

        // Last known position = most recent checkout coordinates
        $lastPos = null;
        foreach (array_reverse($visits) as $vv) {
            if ($vv['checkout_lat'] && $vv['checkout_lng']) {
                $lastPos = ['lat' => $vv['checkout_lat'], 'lng' => $vv['checkout_lng']];
                break;
            }
        }

        $completedCount = count(array_filter($visits, fn($vv) => $vv['status'] === 'completed'));

        $routes[] = [
            'route_id'       => $rid,
            'vehicle_name'   => $vehicle['name'] ?? '',
            'driver_name'    => $vehicle['driver']['name'] ?? '',
            'driver_phone'   => $vehicle['driver']['phone'] ?? '',
            'color'          => $vehicle['color'] ?? '#1a2fa8',
            'total_visits'   => count($visits),
            'completed'      => $completedCount,
            'last_position'  => $lastPos,
            'visits'         => $visits,
        ];
    }
}

json_response(['routes' => $routes, 'date' => $date]);

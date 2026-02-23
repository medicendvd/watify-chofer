<?php
// Suprimir errores/avisos que corrompan el JSON en producción
ini_set('display_errors', '0');
error_reporting(0);
ob_start(); // capturar cualquier salida espuria antes del JSON

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/auth_check.php';

cors();
requireAuth(['Admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonError('Método no permitido', 405);

// Cargar credenciales locales si existen
$stripeConfig = __DIR__ . '/../config/stripe.php';
if (file_exists($stripeConfig)) require_once $stripeConfig;

$stripeKey = getenv('STRIPE_SECRET_KEY');
if (!$stripeKey) jsonError('Stripe no configurado. Agrega STRIPE_SECRET_KEY al servidor.', 503);

// ── Llamada a la API de Stripe ───────────────────────────────────────────────
function stripeGet(string $endpoint, array $params, string $key): array {
    $url = 'https://api.stripe.com/v1/' . $endpoint . '?' . http_build_query($params);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $key],
        CURLOPT_TIMEOUT        => 15,
    ]);
    $body = curl_exec($ch);
    $err  = curl_error($ch);
    if ($err) return ['error' => ['message' => $err]];
    return json_decode($body, true) ?? [];
}

// Traer checkout sessions completadas hoy (en horario de México)
$tz         = new DateTimeZone('America/Mexico_City');
$todayStart = (new DateTime('today midnight', $tz))->getTimestamp();
$response   = stripeGet('checkout/sessions', [
    'limit'        => 100,
    'status'       => 'complete',
    'created[gte]' => $todayStart,
], $stripeKey);

if (isset($response['error'])) {
    jsonError('Error de Stripe: ' . $response['error']['message'], 502);
}

$sessions = $response['data'] ?? [];

// ── Pagos pendientes de Link en nuestra BD ───────────────────────────────────
$pdo = getDB();
try {
    $pending = $pdo->query("
        SELECT t.id AS transaction_id, t.customer_name, t.total,
               COALESCE(SUM(ti.quantity), 0) AS garrafones,
               t.transaction_date AS delivery_date
        FROM transactions t
        JOIN payment_methods pm ON pm.id = t.payment_method_id AND pm.name = 'Link'
        LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
        LEFT JOIN link_payments lp ON lp.transaction_id = t.id
        WHERE lp.paid_at IS NULL
        GROUP BY t.id
    ")->fetchAll();
} catch (\PDOException $e) {
    ob_end_clean();
    jsonError('Tabla link_payments no encontrada. Créala en la BD: ' . $e->getMessage(), 500);
}

// ── Función de similitud de nombres ─────────────────────────────────────────
function nameSimilarity(string $a, string $b): float {
    $a = mb_strtolower(trim($a));
    $b = mb_strtolower(trim($b));
    if ($a === $b) return 1.0;
    // Contiene
    if (str_contains($a, $b) || str_contains($b, $a)) return 0.85;
    // similar_text
    similar_text($a, $b, $pct);
    return $pct / 100;
}

// ── Cruzar sesiones Stripe con pendientes ───────────────────────────────────
$matches = [];

foreach ($sessions as $session) {
    $stripeName   = trim($session['customer_details']['name'] ?? '');
    $stripeAmount = ($session['amount_total'] ?? 0) / 100; // centavos → pesos
    $stripeEmail  = $session['customer_details']['email'] ?? null;
    $stripeId     = $session['id'];
    $stripeDate   = date('Y-m-d H:i:s', $session['created']);

    if (!$stripeName) continue;

    // Buscar mejor coincidencia entre pendientes
    $bestScore = 0;
    $bestMatch = null;

    foreach ($pending as $p) {
        if (!$p['customer_name']) continue;
        $score = nameSimilarity($stripeName, $p['customer_name']);
        if ($score > $bestScore) {
            $bestScore = $score;
            $bestMatch = $p;
        }
    }

    $matches[] = [
        'stripe_session_id' => $stripeId,
        'stripe_name'       => $stripeName,
        'stripe_email'      => $stripeEmail,
        'stripe_amount'     => (float)$stripeAmount,
        'stripe_date'       => $stripeDate,
        'match'             => $bestMatch ? [
            'transaction_id' => (int)$bestMatch['transaction_id'],
            'customer_name'  => $bestMatch['customer_name'],
            'garrafones'     => (int)$bestMatch['garrafones'],
            'total'          => (float)$bestMatch['total'],
            'delivery_date'  => $bestMatch['delivery_date'],
            'score'          => round($bestScore, 2),
        ] : null,
    ];
}

// Ordenar: mejores coincidencias primero
usort($matches, fn($a, $b) =>
    ($b['match']['score'] ?? 0) <=> ($a['match']['score'] ?? 0)
);

ob_end_clean();
jsonResponse($matches);

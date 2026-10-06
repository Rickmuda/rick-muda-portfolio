<?php
/**
 * Scoreboard moderation for the admin panel. Proxies to Supabase with the
 * service_role key, which lives only in protected-files/admin-secrets.php and
 * never reaches the browser.
 *
 * GET    /api/scores.php?game=tetris[&variant=easy]  -> {"scores":[...]}
 * DELETE /api/scores.php?id=<uuid>                     -> {"ok":true}
 * Both need an admin session + X-CSRF-Token.
 */

require __DIR__ . '/_bootstrap.php';

require_admin();

$supabaseUrl = rtrim((string) secret('SUPABASE_URL', 'https://cpiptviuvzwlyomfhbax.supabase.co'), '/');
$serviceKey = (string) secret('SUPABASE_SERVICE_ROLE_KEY');
if ($serviceKey === '') {
    send_json(503, ['error' => 'Scoreboard moderation not configured']);
}

function supabase_request($method, $url, $key)
{
    if (!function_exists('curl_init')) {
        send_json(503, ['error' => 'curl not available']);
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => [
            'apikey: ' . $key,
            'Authorization: Bearer ' . $key,
            'Content-Type: application/json',
        ],
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$status, $body];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $game = isset($_GET['game']) ? (string) $_GET['game'] : '';
    if (!in_array($game, ['minesweeper', 'tetris', 'flappyRick', 'solitaire'], true)) {
        send_json(400, ['error' => 'Invalid game']);
    }
    $params = [
        'game'   => 'eq.' . $game,
        'select' => 'id,player_name,value,variant,metric,created_at',
        'order'  => 'created_at.desc',
        'limit'  => '200',
    ];
    $variant = isset($_GET['variant']) ? (string) $_GET['variant'] : '';
    if ($variant !== '') {
        if (!preg_match('/^[a-z]{1,20}$/', $variant)) {
            send_json(400, ['error' => 'Invalid variant']);
        }
        $params['variant'] = 'eq.' . $variant;
    }
    list($status, $body) = supabase_request('GET', $supabaseUrl . '/rest/v1/game_scores?' . http_build_query($params), $serviceKey);
    $data = json_decode((string) $body, true);
    if ($status < 200 || $status >= 300 || !is_array($data)) {
        send_json(502, ['error' => 'Supabase request failed']);
    }
    send_json(200, ['scores' => $data]);
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (string) $_GET['id'] : '';
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
        send_json(400, ['error' => 'Invalid id']);
    }
    list($status) = supabase_request('DELETE', $supabaseUrl . '/rest/v1/game_scores?id=eq.' . $id, $serviceKey);
    if ($status < 200 || $status >= 300) {
        send_json(502, ['error' => 'Supabase request failed']);
    }
    send_json(200, ['ok' => true]);
}

send_json(405, ['error' => 'Method not allowed']);

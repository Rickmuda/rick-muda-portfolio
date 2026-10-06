<?php
/**
 * Admin login/logout/status.
 *
 * GET  /api/auth.php                       -> {"loggedIn":bool,"csrf":"..."}
 * POST /api/auth.php {"action":"login","password":"..."}
 * POST /api/auth.php {"action":"logout"}   (needs X-CSRF-Token)
 *
 * The password is checked against ADMIN_PASSWORD_HASH (a password_hash()
 * value) in protected-files/admin-secrets.php. Failed logins are rate limited
 * per IP: 5 attempts per 15 minutes.
 */

require __DIR__ . '/_bootstrap.php';

define('ATTEMPTS_FILE', CMS_DIR . '/login-attempts.json');
define('MAX_ATTEMPTS', 5);
define('ATTEMPT_WINDOW', 15 * 60);

function recent_attempts()
{
    $all = read_json_file(ATTEMPTS_FILE);
    if (!$all) {
        return [];
    }
    $now = time();
    $out = [];
    foreach ($all as $ip => $times) {
        $times = array_values(array_filter((array) $times, function ($t) use ($now) {
            return $now - (int) $t < ATTEMPT_WINDOW;
        }));
        if ($times) {
            $out[$ip] = $times;
        }
    }
    return $out;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $loggedIn = is_admin();
    send_json(200, ['loggedIn' => $loggedIn, 'csrf' => $loggedIn ? csrf_token() : null]);
}

if ($method !== 'POST') {
    send_json(405, ['error' => 'Method not allowed']);
}

$input = request_json_body(10000);
$action = isset($input['action']) ? (string) $input['action'] : '';

if ($action === 'logout') {
    require_admin();
    $_SESSION = [];
    session_destroy();
    send_json(200, ['loggedIn' => false]);
}

if ($action !== 'login') {
    send_json(400, ['error' => 'Unknown action']);
}

$hash = secret('ADMIN_PASSWORD_HASH');
if (!is_string($hash) || $hash === '') {
    send_json(503, ['error' => 'Admin not configured']);
}

$ipKey = hash('sha256', client_ip());
$attempts = recent_attempts();
if (isset($attempts[$ipKey]) && count($attempts[$ipKey]) >= MAX_ATTEMPTS) {
    send_json(429, ['error' => 'Too many attempts']);
}

$password = isset($input['password']) ? (string) $input['password'] : '';
if ($password === '' || !password_verify($password, $hash)) {
    $attempts[$ipKey][] = time();
    write_json_file(ATTEMPTS_FILE, $attempts);
    // Small delay to slow down guessing even further.
    usleep(500000);
    send_json(401, ['error' => 'Invalid password']);
}

unset($attempts[$ipKey]);
write_json_file(ATTEMPTS_FILE, $attempts);

start_admin_session();
session_regenerate_id(true);
$_SESSION['admin'] = true;
$_SESSION['login_at'] = time();
$_SESSION['csrf'] = bin2hex(random_bytes(32));

send_json(200, ['loggedIn' => true, 'csrf' => $_SESSION['csrf']]);

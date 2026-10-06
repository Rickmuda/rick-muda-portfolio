<?php
/**
 * Shared helpers for the admin CMS endpoints (content.php, auth.php,
 * upload.php, scores.php).
 *
 * Deploy layout (shared hosting), same idea as download.php:
 *   <webroot>/api/*.php                            <- shipped in dist/
 *   <webroot>/uploads/                             <- created on first upload, NOT touched by deploys
 *   <one level above webroot>/protected-files/
 *       admin-secrets.php                          <- upload manually (see protected-files/README.md)
 *       cms/content.json                           <- written by the admin panel
 *       cms/backups/                               <- last versions of content.json
 */

if (basename($_SERVER['SCRIPT_FILENAME']) === basename(__FILE__)) {
    http_response_code(404);
    exit;
}

define('PROTECTED_DIR', __DIR__ . '/../../protected-files');
define('CMS_DIR', PROTECTED_DIR . '/cms');
define('CONTENT_FILE', CMS_DIR . '/content.json');
define('BACKUP_DIR', CMS_DIR . '/backups');
define('UPLOADS_DIR', __DIR__ . '/../uploads');
define('MAX_BACKUPS', 10);
// Sub-folders of uploads/ the admin panel may upload images into.
define('UPLOAD_FOLDERS', ['projects', 'art', 'downloads', 'vinyl', 'wallpapers', 'about', 'cv']);
// Download files managed from the admin panel (outside the web root).
define('CMS_DOWNLOADS_DIR', PROTECTED_DIR . '/cms-downloads');

function send_json($status, $payload)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function load_secrets()
{
    static $secrets = null;
    if ($secrets !== null) {
        return $secrets;
    }
    $file = PROTECTED_DIR . '/admin-secrets.php';
    $secrets = is_file($file) ? include $file : [];
    if (!is_array($secrets)) {
        $secrets = [];
    }
    return $secrets;
}

function secret($key, $default = '')
{
    $env = getenv($key);
    if ($env !== false && $env !== '') {
        return $env;
    }
    $secrets = load_secrets();
    return isset($secrets[$key]) ? $secrets[$key] : $default;
}

function start_admin_session()
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    session_name('rm_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/api/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function is_admin()
{
    start_admin_session();
    if (empty($_SESSION['admin'])) {
        return false;
    }
    // Sessions expire after 8 hours, regardless of activity.
    if (empty($_SESSION['login_at']) || time() - $_SESSION['login_at'] > 8 * 3600) {
        $_SESSION = [];
        return false;
    }
    return true;
}

function csrf_token()
{
    start_admin_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

// Every state-changing admin request must be logged in AND carry the CSRF
// token from auth.php in an X-CSRF-Token header.
function require_admin()
{
    if (!is_admin()) {
        send_json(401, ['error' => 'Not logged in']);
    }
    $header = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? (string) $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
    if ($header === '' || !hash_equals(csrf_token(), $header)) {
        send_json(403, ['error' => 'Invalid CSRF token']);
    }
}

function ensure_dir($dir)
{
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        send_json(503, ['error' => 'Storage not writable']);
    }
}

function read_json_file($file)
{
    if (!is_file($file)) {
        return null;
    }
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

// Write via a temp file + rename so a crash mid-write never leaves a
// half-written JSON file behind.
function write_json_file($file, $data)
{
    ensure_dir(dirname($file));
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false || file_put_contents($tmp, $json, LOCK_EX) === false) {
        @unlink($tmp);
        send_json(500, ['error' => 'Could not write file']);
    }
    if (!rename($tmp, $file)) {
        @unlink($tmp);
        send_json(500, ['error' => 'Could not write file']);
    }
}

function client_ip()
{
    return isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
}

function request_json_body($maxBytes = 2000000)
{
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) {
        send_json(413, ['error' => 'Request too large']);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        send_json(400, ['error' => 'Invalid JSON']);
    }
    return $data;
}

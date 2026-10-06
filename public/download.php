<?php
/**
 * Password-protected download gatekeeper.
 *
 * The actual file lives OUTSIDE the public web root, so it can never be reached
 * by guessing or altering a URL. The only way to obtain the bytes is a POST with
 * the correct password, which is verified here, server-side.
 *
 * Deploy layout (shared hosting):
 *   <webroot>/download.php                         <- this file (shipped in dist/)
 *   <webroot>/downloads-config.php                  <- shared registry (shipped in dist/)
 *   <one level above webroot>/protected-files/
 *       portfolio-fotografie.zip                   <- the file (upload manually)
 *       download-secrets.php                       <- passwords (upload manually)
 *       cms-downloads/<id>/<file>                  <- files uploaded from the admin panel
 *       cms/download-passwords.json                <- password hashes set from the admin panel
 *
 * download-secrets.php must return an array, e.g.:
 *   <?php return ['DOWNLOAD_PORTFOLIO_PASSWORD' => 'your-strong-password']; ?>
 *
 * The registry of downloads (and the version-resolution helpers used by
 * version.php too) lives in downloads-config.php. Once the admin panel manages
 * the downloads, its settings win - see the bottom of downloads-config.php.
 */

require __DIR__ . '/downloads-config.php';

function send_json($status, $payload)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

// Only accept POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(405, ['error' => 'Method not allowed']);
}

// Parse JSON body.
$input    = json_decode(file_get_contents('php://input'), true);
$id       = isset($input['id']) ? (string) $input['id'] : '';
$password = isset($input['password']) ? (string) $input['password'] : '';

$registry = isset($DOWNLOADS[$id]) ? $DOWNLOADS[$id] : null;
$cms = cms_download_entry($id);

if ($cms === false || ($cms === null && $registry === null)) {
    send_json(404, ['error' => 'Download not found']);
}

if ($cms !== null) {
    // Managed from the admin panel.
    if (!empty($cms['hidden']) || empty($cms['available'])) {
        send_json(404, ['error' => 'File not available']);
    }
    $needsPassword = !isset($cms['mode']) || $cms['mode'] !== 'gated';
    $resolved = cms_download_file($id);
    if ($resolved === null && $registry !== null) {
        $resolved = resolve_download_entry($registry);
    }
    $hash = cms_download_password_hash($id);
    $passwordKey = $registry && !empty($registry['passwordKey']) ? $registry['passwordKey'] : null;
} else {
    // Registry only (admin panel never saved a downloads list).
    $needsPassword = !empty($registry['passwordKey']);
    $resolved = resolve_download_entry($registry);
    $hash = null;
    $passwordKey = $needsPassword ? $registry['passwordKey'] : null;
}

if ($needsPassword) {
    if ($hash !== null) {
        $valid = $password !== '' && password_verify($password, $hash);
    } else {
        // Resolve the expected password: prefer an env var, fall back to a
        // secrets file kept outside the web root.
        $expected = $passwordKey ? getenv($passwordKey) : false;
        if ($passwordKey && ($expected === false || $expected === '')) {
            $secretsFile = __DIR__ . '/../protected-files/download-secrets.php';
            if (is_file($secretsFile)) {
                $secrets  = include $secretsFile;
                $expected = isset($secrets[$passwordKey]) ? $secrets[$passwordKey] : '';
            }
        }
        if (!is_string($expected) || $expected === '') {
            send_json(503, ['error' => 'Download not configured']);
        }
        // Constant-time comparison (no timing/length leak).
        $valid = $password !== '' && hash_equals($expected, $password);
    }
    if (!$valid) {
        send_json(401, ['error' => 'Invalid password']);
    }
}

if ($resolved === null) {
    send_json(404, ['error' => 'File not available']);
}

// Stream the file as an attachment.
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . str_replace('"', '', $resolved['downloadName']) . '"');
header('Content-Length: ' . filesize($resolved['file']));
header('Cache-Control: no-store');
readfile($resolved['file']);
exit;

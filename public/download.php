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
 *
 * download-secrets.php must return an array, e.g.:
 *   <?php return ['DOWNLOAD_PORTFOLIO_PASSWORD' => 'your-strong-password']; ?>
 *
 * The registry of downloads (and the version-resolution helpers used by
 * version.php too) lives in downloads-config.php.
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

if (!isset($DOWNLOADS[$id])) {
    send_json(404, ['error' => 'Download not found']);
}
$entry = $DOWNLOADS[$id];

// Entries without a passwordKey are gated only by living outside the web
// root; no password verification is needed for them.
if (!empty($entry['passwordKey'])) {
    // Resolve the expected password: prefer an env var, fall back to a secrets
    // file kept outside the web root.
    $expected = getenv($entry['passwordKey']);
    if ($expected === false || $expected === '') {
        $secretsFile = __DIR__ . '/../protected-files/download-secrets.php';
        if (is_file($secretsFile)) {
            $secrets  = include $secretsFile;
            $expected = isset($secrets[$entry['passwordKey']]) ? $secrets[$entry['passwordKey']] : '';
        }
    }
    if (!is_string($expected) || $expected === '') {
        send_json(503, ['error' => 'Download not configured']);
    }

    // Constant-time comparison (no timing/length leak).
    if ($password === '' || !hash_equals($expected, $password)) {
        send_json(401, ['error' => 'Invalid password']);
    }
}

$resolved = resolve_download_entry($entry);
if ($resolved === null) {
    send_json(404, ['error' => 'File not available']);
}

// Stream the file as an attachment.
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $resolved['downloadName'] . '"');
header('Content-Length: ' . filesize($resolved['file']));
header('Cache-Control: no-store');
readfile($resolved['file']);
exit;

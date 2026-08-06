<?php
/**
 * Read-only version/size lookup for downloads whose version is baked into
 * the filename (see downloads-config.php). Lets the frontend show the
 * current version without a code change + redeploy every time a new file is
 * uploaded to protected-files/.
 *
 * GET /version.php?id=playdeck -> {"version":"2.0.2","size":12345678}
 */

require __DIR__ . '/downloads-config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$id = isset($_GET['id']) ? (string) $_GET['id'] : '';
if (!isset($DOWNLOADS[$id])) {
    http_response_code(404);
    echo json_encode(['error' => 'Download not found']);
    exit;
}

$resolved = resolve_download_entry($DOWNLOADS[$id]);
if ($resolved === null) {
    http_response_code(404);
    echo json_encode(['error' => 'File not available']);
    exit;
}

echo json_encode([
    'version' => $resolved['version'],
    'size'    => filesize($resolved['file']),
]);

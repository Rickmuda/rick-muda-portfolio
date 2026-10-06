<?php
/**
 * Download files + passwords for the admin panel. Files are stored outside the
 * web root (protected-files/cms-downloads/<id>/) and only ever served through
 * download.php.
 *
 * GET  /api/download-file.php
 *   -> {"files": {"<id>": {"name", "size"}}, "passwords": {"<id>": true}}
 * POST /api/download-file.php  (multipart, in chunks so large files fit within
 *      the host's upload limit)
 *   action=chunk, id, uploadId, index, total, name, chunk=<blob>
 *   -> {"done": false} until the last chunk, then {"done": true, "name", "size"}
 * POST /api/download-file.php {"action": "password", "id", "password"}  ("" clears it)
 * POST /api/download-file.php {"action": "delete", "id"}  (file + password)
 *
 * All requests need an admin session + X-CSRF-Token.
 */

require __DIR__ . '/_bootstrap.php';

define('PASSWORDS_FILE', CMS_DIR . '/download-passwords.json');
define('CHUNK_DIR', CMS_DIR . '/upload-chunks');
define('MAX_CHUNKS', 2000);          // 2000 x 2 MB = 4 GB
define('MAX_CHUNK_BYTES', 5 * 1024 * 1024);

require_admin();

function valid_id($id)
{
    return is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id);
}

function safe_file_name($name)
{
    $name = preg_replace('/[^A-Za-z0-9 ._()-]/', '_', basename((string) $name));
    $name = ltrim(trim($name), '.');
    return $name === '' ? 'download' : substr($name, 0, 150);
}

function remove_dir($dir)
{
    foreach ((array) glob($dir . '/*') as $file) {
        if (is_file($file)) {
            @unlink($file);
        }
    }
    @rmdir($dir);
}

// Leftover chunks from uploads that never finished.
function cleanup_stale_chunks()
{
    foreach ((array) glob(CHUNK_DIR . '/*', GLOB_ONLYDIR) as $dir) {
        if (filemtime($dir) < time() - 86400) {
            remove_dir($dir);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $files = [];
    foreach ((array) glob(CMS_DOWNLOADS_DIR . '/*', GLOB_ONLYDIR) as $dir) {
        foreach ((array) glob($dir . '/*') as $file) {
            if (is_file($file) && substr($file, -5) !== '.part') {
                $files[basename($dir)] = ['name' => basename($file), 'size' => filesize($file)];
                break;
            }
        }
    }
    $hashes = read_json_file(PASSWORDS_FILE) ?: [];
    $passwords = [];
    foreach (array_keys($hashes) as $id) {
        $passwords[$id] = true;
    }
    send_json(200, ['files' => (object) $files, 'passwords' => (object) $passwords]);
}

if ($method !== 'POST') {
    send_json(405, ['error' => 'Method not allowed']);
}

$action = isset($_POST['action']) ? (string) $_POST['action'] : '';

// --- chunked file upload -----------------------------------------------------
if ($action === 'chunk') {
    $id = isset($_POST['id']) ? (string) $_POST['id'] : '';
    $uploadId = isset($_POST['uploadId']) ? (string) $_POST['uploadId'] : '';
    $index = isset($_POST['index']) ? (int) $_POST['index'] : -1;
    $total = isset($_POST['total']) ? (int) $_POST['total'] : 0;
    if (!valid_id($id) || !preg_match('/^[a-f0-9]{16,64}$/', $uploadId)
        || $total < 1 || $total > MAX_CHUNKS || $index < 0 || $index >= $total) {
        send_json(400, ['error' => 'Invalid chunk']);
    }
    if (!isset($_FILES['chunk']) || $_FILES['chunk']['error'] !== UPLOAD_ERR_OK
        || $_FILES['chunk']['size'] > MAX_CHUNK_BYTES) {
        send_json(400, ['error' => 'Invalid chunk']);
    }

    $dir = CHUNK_DIR . '/' . $uploadId;
    ensure_dir($dir);
    if (!move_uploaded_file($_FILES['chunk']['tmp_name'], $dir . '/' . $index)) {
        send_json(500, ['error' => 'Could not store chunk']);
    }
    touch($dir);

    $received = count((array) glob($dir . '/*'));
    if ($received < $total) {
        send_json(200, ['done' => false]);
    }

    // All chunks are in: stitch them together next to the final location,
    // then swap it in so a half-written file is never served.
    $name = safe_file_name(isset($_POST['name']) ? $_POST['name'] : '');
    $targetDir = CMS_DOWNLOADS_DIR . '/' . $id;
    ensure_dir($targetDir);
    $partFile = $targetDir . '/' . $name . '.part';
    $out = fopen($partFile, 'wb');
    if (!$out) {
        send_json(500, ['error' => 'Could not write file']);
    }
    for ($i = 0; $i < $total; $i++) {
        $chunk = $dir . '/' . $i;
        if (!is_file($chunk)) {
            fclose($out);
            @unlink($partFile);
            send_json(400, ['error' => 'Missing chunk']);
        }
        $in = fopen($chunk, 'rb');
        stream_copy_to_stream($in, $out);
        fclose($in);
    }
    fclose($out);
    remove_dir($dir);

    foreach ((array) glob($targetDir . '/*') as $old) {
        if (is_file($old) && $old !== $partFile) {
            @unlink($old);
        }
    }
    $final = $targetDir . '/' . $name;
    rename($partFile, $final);
    cleanup_stale_chunks();

    send_json(200, ['done' => true, 'name' => $name, 'size' => filesize($final)]);
}

// --- JSON actions --------------------------------------------------------------
$input = request_json_body(10000);
$action = isset($input['action']) ? (string) $input['action'] : '';
$id = isset($input['id']) ? (string) $input['id'] : '';
if (!valid_id($id)) {
    send_json(400, ['error' => 'Invalid id']);
}

if ($action === 'password') {
    $password = isset($input['password']) ? (string) $input['password'] : '';
    $hashes = read_json_file(PASSWORDS_FILE) ?: [];
    if ($password === '') {
        unset($hashes[$id]);
    } else {
        if (strlen($password) < 4 || strlen($password) > 200) {
            send_json(400, ['error' => 'Password must be 4-200 characters']);
        }
        $hashes[$id] = password_hash($password, PASSWORD_DEFAULT);
    }
    write_json_file(PASSWORDS_FILE, (object) $hashes);
    send_json(200, ['ok' => true, 'hasPassword' => isset($hashes[$id])]);
}

if ($action === 'delete') {
    remove_dir(CMS_DOWNLOADS_DIR . '/' . $id);
    $hashes = read_json_file(PASSWORDS_FILE) ?: [];
    if (isset($hashes[$id])) {
        unset($hashes[$id]);
        write_json_file(PASSWORDS_FILE, (object) $hashes);
    }
    send_json(200, ['ok' => true]);
}

send_json(400, ['error' => 'Unknown action']);

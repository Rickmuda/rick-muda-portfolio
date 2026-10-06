<?php
/**
 * Image upload for the admin panel.
 *
 * POST /api/upload.php  (multipart: file=<image>, folder=<one of UPLOAD_FOLDERS>, X-CSRF-Token header)
 *   -> {"url":"/uploads/projects/<random>.webp"}
 *
 * The file only becomes part of the site once content.php is saved with its
 * URL in it. Files that drop out of the content on a later save are deleted
 * by content.php.
 */

require __DIR__ . '/_bootstrap.php';

define('MAX_UPLOAD_BYTES', 8 * 1024 * 1024);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(405, ['error' => 'Method not allowed']);
}

require_admin();

$folder = isset($_POST['folder']) ? (string) $_POST['folder'] : '';
if (!in_array($folder, UPLOAD_FOLDERS, true)) {
    send_json(400, ['error' => 'Invalid folder']);
}

if (!isset($_FILES['file']) || !is_array($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    send_json(400, ['error' => 'No file uploaded']);
}

$file = $_FILES['file'];
if ($file['size'] <= 0 || $file['size'] > MAX_UPLOAD_BYTES) {
    send_json(413, ['error' => 'File too large']);
}

// The cv/ folder takes PDFs only; every other folder takes images only.
if ($folder === 'cv') {
    $head = (string) file_get_contents($file['tmp_name'], false, null, 0, 5);
    $mime = function_exists('finfo_open') ? (string) finfo_file(finfo_open(FILEINFO_MIME_TYPE), $file['tmp_name']) : '';
    if ($head !== '%PDF-' || ($mime !== '' && $mime !== 'application/pdf')) {
        send_json(415, ['error' => 'Unsupported file type']);
    }
    $dir = UPLOADS_DIR . '/cv';
    ensure_dir($dir);
    protect_uploads_dir();
    $name = gmdate('Ymd') . '-' . bin2hex(random_bytes(8)) . '.pdf';
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
        send_json(500, ['error' => 'Could not store file']);
    }
    @chmod($dir . '/' . $name, 0644);
    send_json(200, ['url' => '/uploads/cv/' . $name]);
}

// Check the actual bytes, never the client-supplied name/type.
$allowed = [
    'image/webp' => 'webp',
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
];
$mime = '';
if (function_exists('finfo_open')) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = (string) finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
}
$info = @getimagesize($file['tmp_name']);
if (!isset($allowed[$mime]) || $info === false || $info['mime'] !== $mime) {
    send_json(415, ['error' => 'Unsupported file type']);
}

$dir = UPLOADS_DIR . '/' . $folder;
ensure_dir($dir);
protect_uploads_dir();

$name = gmdate('Ymd') . '-' . bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
    send_json(500, ['error' => 'Could not store file']);
}
@chmod($dir . '/' . $name, 0644);

send_json(200, ['url' => '/uploads/' . $folder . '/' . $name]);

// The uploads folder is excluded from the deploy mirror (so uploads survive
// deploys), which means its .htaccess can't ship via dist/ - write it here.
function protect_uploads_dir()
{
    $htaccess = UPLOADS_DIR . '/.htaccess';
    if (is_file($htaccess)) {
        return;
    }
    $rules = <<<'HTACCESS'
# Uploaded images only: never execute or serve scripts from this folder.
Options -Indexes -ExecCGI
<FilesMatch "\.(php\d?|phtml|phar|pl|py|cgi|sh|html?|svg)$">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>
<IfModule mod_php.c>
  php_flag engine off
</IfModule>
<IfModule mod_php7.c>
  php_flag engine off
</IfModule>
HTACCESS;
    @file_put_contents($htaccess, $rules . "\n");
}

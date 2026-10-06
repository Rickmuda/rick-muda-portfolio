<?php
/**
 * Editable portfolio content (projects, art gallery, text overrides).
 *
 * GET /api/content.php           -> {"content": {...} | null}  (public, hidden items stripped)
 * GET /api/content.php?admin=1   -> everything, including hidden items (admin only)
 * PUT /api/content.php {...}     -> save (admin + X-CSRF-Token)
 *
 * null means "nothing saved yet": the frontend then uses the defaults bundled
 * in src/projectsData.js, src/galleryImages.js and src/i18n.js.
 */

require __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $content = read_json_file(CONTENT_FILE);
    $wantsAll = !empty($_GET['admin']);
    if ($wantsAll && !is_admin()) {
        send_json(401, ['error' => 'Not logged in']);
    }
    if ($content && !$wantsAll) {
        $content = strip_hidden($content);
    }
    if ($content) {
        $content = keep_maps_as_objects($content);
    }
    send_json(200, ['content' => $content]);
}

if ($method !== 'PUT') {
    send_json(405, ['error' => 'Method not allowed']);
}

require_admin();

$input = request_json_body();
$clean = sanitize_content($input);
$previous = read_json_file(CONTENT_FILE);

if ($previous) {
    backup_content();
}
write_json_file(CONTENT_FILE, $clean);
if ($previous) {
    delete_orphaned_uploads($previous, $clean);
}

send_json(200, ['content' => $clean]);

// ---------------------------------------------------------------------------

function strip_hidden($content)
{
    foreach (['projects', 'art'] as $list) {
        if (!isset($content[$list]) || !is_array($content[$list])) {
            continue;
        }
        $content[$list] = array_values(array_filter($content[$list], function ($item) {
            return empty($item['hidden']);
        }));
    }
    return $content;
}

// json_decode(..., true) turns {} into [], so restore the empty maps before
// sending the content back out.
function keep_maps_as_objects($content)
{
    foreach (['projects'] as $list) {
        foreach ((array) (isset($content[$list]) ? $content[$list] : []) as $i => $item) {
            foreach (['title', 'description'] as $field) {
                $content[$list][$i][$field] = (object) (isset($item[$field]) ? $item[$field] : []);
            }
        }
    }
    foreach (['en', 'nl'] as $lang) {
        $content['texts'][$lang] = (object) (isset($content['texts'][$lang]) ? $content['texts'][$lang] : []);
    }
    if (isset($content['layout']['desktop'])) {
        $content['layout']['desktop']['positions'] = (object) (isset($content['layout']['desktop']['positions'])
            ? $content['layout']['desktop']['positions'] : []);
    }
    return $content;
}

function str_field($value, $max = 500)
{
    if (!is_string($value) && !is_numeric($value)) {
        return '';
    }
    $value = trim((string) $value);
    return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
}

function id_field($value)
{
    $value = str_field($value, 64);
    return preg_match('/^[A-Za-z0-9_-]+$/', $value) ? $value : '';
}

// Allowed image references: an uploaded file ("/uploads/..."), a bundled
// default asset ("bundled:projects/<file>") or an absolute http(s) URL.
function image_field($value)
{
    $value = str_field($value, 1000);
    if (preg_match('#^/uploads/(projects|art)/[A-Za-z0-9_-]+\.(webp|jpe?g|png|gif)$#i', $value)) {
        return $value;
    }
    if (preg_match('#^bundled:(projects|art)/[^/\\\\]+$#', $value)) {
        return $value;
    }
    if (preg_match('#^https?://#i', $value) && filter_var($value, FILTER_VALIDATE_URL)) {
        return $value;
    }
    return '';
}

function url_field($value)
{
    $value = str_field($value, 1000);
    if ($value === '') {
        return '';
    }
    return (preg_match('#^https?://#i', $value) && filter_var($value, FILTER_VALIDATE_URL)) ? $value : '';
}

function localized_field($value, $max)
{
    $out = [];
    if (!is_array($value)) {
        return $out;
    }
    foreach (['en', 'nl'] as $lang) {
        if (isset($value[$lang])) {
            $text = str_field($value[$lang], $max);
            if ($text !== '') {
                $out[$lang] = $text;
            }
        }
    }
    return $out;
}

function sanitize_content($input)
{
    $projects = [];
    $seen = [];
    foreach ((array) (isset($input['projects']) ? $input['projects'] : []) as $p) {
        if (!is_array($p)) {
            continue;
        }
        $id = id_field(isset($p['id']) ? $p['id'] : '');
        if ($id === '' || isset($seen[$id])) {
            continue;
        }
        $seen[$id] = true;
        $images = [];
        foreach ((array) (isset($p['images']) ? $p['images'] : []) as $img) {
            $img = image_field($img);
            if ($img !== '') {
                $images[] = $img;
            }
        }
        $project = [
            'id'          => $id,
            'title'       => (object) localized_field(isset($p['title']) ? $p['title'] : null, 200),
            'description' => (object) localized_field(isset($p['description']) ? $p['description'] : null, 5000),
            'type'        => str_field(isset($p['type']) ? $p['type'] : '', 60),
            'dateCreated' => preg_match('/^\d{4}-\d{2}-\d{2}$/', isset($p['dateCreated']) ? (string) $p['dateCreated'] : '') ? $p['dateCreated'] : '',
            'images'      => array_slice($images, 0, 30),
            'link'        => url_field(isset($p['link']) ? $p['link'] : ''),
            'repository'  => url_field(isset($p['repository']) ? $p['repository'] : ''),
            'status'      => str_field(isset($p['status']) ? $p['status'] : '', 40),
            'disabled'    => !empty($p['disabled']),
            'hidden'      => !empty($p['hidden']),
        ];
        // Bundled default projects keep their i18n keys as a fallback for
        // when no custom title/description has been typed in.
        foreach (['titleKey', 'descKey'] as $key) {
            if (!empty($p[$key])) {
                $value = id_field($p[$key]);
                if ($value !== '') {
                    $project[$key] = $value;
                }
            }
        }
        $projects[] = $project;
    }

    $art = [];
    $seen = [];
    foreach ((array) (isset($input['art']) ? $input['art'] : []) as $a) {
        if (!is_array($a)) {
            continue;
        }
        $id = id_field(isset($a['id']) ? $a['id'] : '');
        $src = image_field(isset($a['src']) ? $a['src'] : '');
        if ($id === '' || $src === '' || isset($seen[$id])) {
            continue;
        }
        $seen[$id] = true;
        $art[] = [
            'id'     => $id,
            'src'    => $src,
            'name'   => str_field(isset($a['name']) ? $a['name'] : '', 100),
            'hidden' => !empty($a['hidden']),
        ];
    }

    $texts = ['en' => [], 'nl' => []];
    $inputTexts = isset($input['texts']) && is_array($input['texts']) ? $input['texts'] : [];
    foreach (['en', 'nl'] as $lang) {
        if (!isset($inputTexts[$lang]) || !is_array($inputTexts[$lang])) {
            continue;
        }
        foreach ($inputTexts[$lang] as $key => $value) {
            if (!preg_match('/^[A-Za-z0-9_.-]{1,100}$/', (string) $key) || !is_string($value)) {
                continue;
            }
            $texts[$lang][$key] = function_exists('mb_substr') ? mb_substr($value, 0, 10000) : substr($value, 0, 10000);
        }
    }

    $result = [
        'version'   => 1,
        'updatedAt' => gmdate('c'),
        'projects'  => array_slice($projects, 0, 200),
        'art'       => array_slice($art, 0, 500),
        // (object) keeps empty maps as {} instead of [] in the JSON.
        'texts'     => ['en' => (object) $texts['en'], 'nl' => (object) $texts['nl']],
    ];
    $layout = sanitize_layout(isset($input['layout']) ? $input['layout'] : null);
    if ($layout !== null) {
        $result['layout'] = $layout;
    }
    return $result;
}

// Default app placement: order + visibility for the desktop and the mobile
// home screen, plus optional fixed desktop grid cells. Either part may be
// missing (= use the defaults from the code).
function sanitize_layout($input)
{
    if (!is_array($input)) {
        return null;
    }
    $out = [];
    foreach (['desktop', 'mobile'] as $surface) {
        if (!isset($input[$surface]['items']) || !is_array($input[$surface]['items'])) {
            continue;
        }
        $items = [];
        $seen = [];
        foreach ($input[$surface]['items'] as $item) {
            $id = id_field(is_array($item) && isset($item['id']) ? $item['id'] : '');
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $items[] = ['id' => $id, 'hidden' => !empty($item['hidden'])];
        }
        $out[$surface] = ['items' => array_slice($items, 0, 100)];
    }
    if (isset($out['desktop'])) {
        $positions = [];
        $inputPositions = isset($input['desktop']['positions']) && is_array($input['desktop']['positions'])
            ? $input['desktop']['positions'] : [];
        foreach ($inputPositions as $id => $cell) {
            $id = id_field($id);
            if ($id === '' || !is_array($cell) || !isset($cell['col'], $cell['row'])) {
                continue;
            }
            $col = (int) $cell['col'];
            $row = (int) $cell['row'];
            if ($col < 0 || $col > 50 || $row < 0 || $row > 50) {
                continue;
            }
            $positions[$id] = ['col' => $col, 'row' => $row];
            if (count($positions) >= 100) {
                break;
            }
        }
        $out['desktop']['positions'] = (object) $positions;
    }
    return $out ? $out : null;
}

function backup_content()
{
    ensure_dir(BACKUP_DIR);
    @copy(CONTENT_FILE, BACKUP_DIR . '/content-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(2)) . '.json');
    $backups = glob(BACKUP_DIR . '/content-*.json');
    if ($backups && count($backups) > MAX_BACKUPS) {
        sort($backups);
        foreach (array_slice($backups, 0, count($backups) - MAX_BACKUPS) as $old) {
            @unlink($old);
        }
    }
}

function referenced_uploads($content)
{
    $refs = [];
    foreach ((array) (isset($content['projects']) ? $content['projects'] : []) as $p) {
        foreach ((array) (isset($p['images']) ? $p['images'] : []) as $img) {
            if (is_string($img) && strpos($img, '/uploads/') === 0) {
                $refs[$img] = true;
            }
        }
    }
    foreach ((array) (isset($content['art']) ? $content['art'] : []) as $a) {
        if (isset($a['src']) && is_string($a['src']) && strpos($a['src'], '/uploads/') === 0) {
            $refs[$a['src']] = true;
        }
    }
    return $refs;
}

// Removes uploaded files that the previous version used but the new one no
// longer does - this is how "delete photo" frees the file on disk.
function delete_orphaned_uploads($previous, $next)
{
    $before = referenced_uploads($previous);
    $after = referenced_uploads($next);
    foreach (array_keys($before) as $url) {
        if (isset($after[$url])) {
            continue;
        }
        if (!preg_match('#^/uploads/(projects|art)/([A-Za-z0-9_-]+\.(webp|jpe?g|png|gif))$#i', $url, $m)) {
            continue;
        }
        $file = UPLOADS_DIR . '/' . $m[1] . '/' . basename($m[2]);
        if (is_file($file)) {
            @unlink($file);
        }
    }
}

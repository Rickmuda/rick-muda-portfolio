<?php
/**
 * Editable portfolio content: projects, art gallery, text overrides, app
 * layout, downloads, vinyl collection, skill tree and wallpapers.
 *
 * GET /api/content.php           -> {"content": {...} | null}  (public, hidden items stripped)
 * GET /api/content.php?admin=1   -> everything, including hidden items (admin only)
 * PUT /api/content.php {...}     -> save (admin + X-CSRF-Token)
 *
 * null (or a missing section) means "nothing saved yet": the frontend then
 * uses the defaults bundled in the code (src/projectsData.js, src/i18n.js, ...).
 */

require __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $wantsAll = !empty($_GET['admin']);
    if ($wantsAll && !is_admin()) {
        send_json(401, ['error' => 'Not logged in']);
    }
    // Decoded as objects (not arrays) so empty maps stay {} on the way out.
    $content = is_file(CONTENT_FILE) ? json_decode(file_get_contents(CONTENT_FILE)) : null;
    if (!is_object($content)) {
        $content = null;
    }
    if ($content && !$wantsAll) {
        strip_hidden($content);
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
// Public view

function filter_hidden($list)
{
    return array_values(array_filter((array) $list, function ($item) {
        return empty($item->hidden);
    }));
}

function strip_hidden($content)
{
    foreach (['projects', 'art', 'downloads'] as $list) {
        if (isset($content->$list) && is_array($content->$list)) {
            $content->$list = filter_hidden($content->$list);
        }
    }
    if (isset($content->wallpapers->items) && is_array($content->wallpapers->items)) {
        $content->wallpapers->items = filter_hidden($content->wallpapers->items);
    }
    foreach (['questions', 'socials', 'certificates'] as $list) {
        if (isset($content->about->$list) && is_array($content->about->$list)) {
            $content->about->$list = filter_hidden($content->about->$list);
        }
    }
}

// ---------------------------------------------------------------------------
// Field helpers

function field($array, $key, $default = null)
{
    return is_array($array) && isset($array[$key]) ? $array[$key] : $default;
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

function upload_pattern()
{
    return '#^/uploads/(' . implode('|', UPLOAD_FOLDERS) . ')/([A-Za-z0-9_-]+\.(webp|jpe?g|png|gif|pdf))$#i';
}

// Allowed image references: an uploaded file ("/uploads/..."), a bundled
// default asset ("bundled:projects/<file>") or an absolute http(s) URL.
function image_field($value)
{
    $value = str_field($value, 1000);
    if (preg_match(upload_pattern(), $value) && !preg_match('#\.pdf$#i', $value)) {
        return $value;
    }
    if (preg_match('#^bundled:(projects|art|downloads|about)/[^/\\\\]+$#', $value)) {
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

// {"en": "...", "nl": "..."} -> object (so an empty one stays {} in the JSON).
function localized_field($value, $max)
{
    $out = [];
    if (is_array($value)) {
        foreach (['en', 'nl'] as $lang) {
            if (isset($value[$lang])) {
                $text = str_field($value[$lang], $max);
                if ($text !== '') {
                    $out[$lang] = $text;
                }
            }
        }
    }
    return (object) $out;
}

// Bundled defaults keep their i18n keys as a fallback for when no custom
// title/description has been typed in.
function copy_i18n_keys($from, &$to, $keys)
{
    foreach ($keys as $key) {
        $value = id_field(field($from, $key, ''));
        if ($value !== '') {
            $to[$key] = $value;
        }
    }
}

// A CSS gradient for the built-in wallpapers - nothing that could load a URL.
function gradient_field($value)
{
    $value = str_field($value, 400);
    return preg_match('/^(linear|radial)-gradient\([#%0-9a-zA-Z.,\s()-]+\)$/', $value) && stripos($value, 'url') === false
        ? $value : '';
}

function color_field($value, $default)
{
    $value = str_field($value, 7);
    return preg_match('/^#[0-9a-fA-F]{6}$/', $value) ? $value : $default;
}

// Runs $fn over a list, keeping results with a unique, valid id.
function unique_list($items, $fn, $max)
{
    $out = [];
    $seen = [];
    foreach ((array) $items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $clean = $fn($item);
        if (!$clean || $clean['id'] === '' || isset($seen[$clean['id']])) {
            continue;
        }
        $seen[$clean['id']] = true;
        $out[] = $clean;
        if (count($out) >= $max) {
            break;
        }
    }
    return $out;
}

// ---------------------------------------------------------------------------
// Sections

function sanitize_content($input)
{
    $result = [
        'version'   => 1,
        'updatedAt' => gmdate('c'),
        'projects'  => sanitize_projects(field($input, 'projects', [])),
        'art'       => sanitize_art(field($input, 'art', [])),
        'texts'     => sanitize_texts(field($input, 'texts', [])),
    ];
    $optional = [
        'layout'     => sanitize_layout(field($input, 'layout')),
        'downloads'  => sanitize_downloads(field($input, 'downloads')),
        'vinyl'      => sanitize_vinyl(field($input, 'vinyl')),
        'skills'     => sanitize_skills(field($input, 'skills')),
        'wallpapers' => sanitize_wallpapers(field($input, 'wallpapers')),
        'about'      => sanitize_about(field($input, 'about')),
    ];
    foreach ($optional as $key => $value) {
        if ($value !== null) {
            $result[$key] = $value;
        }
    }
    return $result;
}

function sanitize_projects($items)
{
    return unique_list($items, function ($p) {
        $images = [];
        foreach ((array) field($p, 'images', []) as $img) {
            $img = image_field($img);
            if ($img !== '') {
                $images[] = $img;
            }
        }
        $date = (string) field($p, 'dateCreated', '');
        $project = [
            'id'          => id_field(field($p, 'id', '')),
            'title'       => localized_field(field($p, 'title'), 200),
            'description' => localized_field(field($p, 'description'), 5000),
            'type'        => str_field(field($p, 'type', ''), 60),
            'dateCreated' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : '',
            'images'      => array_slice($images, 0, 30),
            'link'        => url_field(field($p, 'link', '')),
            'repository'  => url_field(field($p, 'repository', '')),
            'status'      => str_field(field($p, 'status', ''), 40),
            'disabled'    => !empty($p['disabled']),
            'hidden'      => !empty($p['hidden']),
            // Scrapped projects move to the Recycle Bin instead of the Projects folder.
            'scrapped'    => !empty($p['scrapped']),
        ];
        copy_i18n_keys($p, $project, ['titleKey', 'descKey']);
        return $project;
    }, 200);
}

function sanitize_art($items)
{
    return unique_list($items, function ($a) {
        $src = image_field(field($a, 'src', ''));
        return $src === '' ? null : [
            'id'     => id_field(field($a, 'id', '')),
            'src'    => $src,
            'name'   => str_field(field($a, 'name', ''), 100),
            'hidden' => !empty($a['hidden']),
        ];
    }, 500);
}

function sanitize_texts($input)
{
    $texts = [];
    foreach (['en', 'nl'] as $lang) {
        $out = [];
        foreach ((array) field($input, $lang, []) as $key => $value) {
            if (!preg_match('/^[A-Za-z0-9_.-]{1,100}$/', (string) $key) || !is_string($value)) {
                continue;
            }
            $out[$key] = function_exists('mb_substr') ? mb_substr($value, 0, 10000) : substr($value, 0, 10000);
        }
        $texts[$lang] = (object) $out;
    }
    return $texts;
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
        $items = unique_list($input[$surface]['items'], function ($item) {
            return ['id' => id_field(field($item, 'id', '')), 'hidden' => !empty($item['hidden'])];
        }, 100);
        $out[$surface] = ['items' => $items];
    }
    if (isset($out['desktop'])) {
        $positions = [];
        foreach ((array) field($input['desktop'], 'positions', []) as $id => $cell) {
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

// Download cards. The files themselves (and their passwords) are managed by
// download-file.php; download.php reads `mode`, `available` and `hidden`
// from here to decide who may fetch a file.
function sanitize_downloads($items)
{
    if (!is_array($items)) {
        return null;
    }
    return unique_list($items, function ($d) {
        $mode = field($d, 'mode', 'password');
        $devices = field($d, 'devices', 'all');
        $download = [
            'id'          => id_field(field($d, 'id', '')),
            'title'       => localized_field(field($d, 'title'), 200),
            'description' => localized_field(field($d, 'description'), 3000),
            'thumbnail'   => image_field(field($d, 'thumbnail', '')),
            'version'     => str_field(field($d, 'version', ''), 40),
            'size'        => str_field(field($d, 'size', ''), 40),
            'mode'        => in_array($mode, ['password', 'gated'], true) ? $mode : 'password',
            'devices'     => in_array($devices, ['all', 'desktop', 'mobile'], true) ? $devices : 'all',
            'available'   => !empty($d['available']),
            'autoVersion' => !empty($d['autoVersion']),
            'hidden'      => !empty($d['hidden']),
        ];
        copy_i18n_keys($d, $download, ['titleKey', 'descKey']);
        return $download;
    }, 50);
}

// Vinyl collection: the albums come live from Discogs; this only stores the
// Discogs user, which releases to hide and albums to add by hand.
function sanitize_vinyl($input)
{
    if (!is_array($input)) {
        return null;
    }
    $username = str_field(field($input, 'username', ''), 60);
    $hidden = [];
    foreach ((array) field($input, 'hidden', []) as $id) {
        if (is_numeric($id)) {
            $hidden[] = (int) $id;
        }
    }
    $extra = unique_list(field($input, 'extra', []), function ($a) {
        return [
            'id'     => id_field(field($a, 'id', '')),
            'title'  => str_field(field($a, 'title', ''), 200),
            'artist' => str_field(field($a, 'artist', ''), 200),
            'cover'  => image_field(field($a, 'cover', '')),
            'hidden' => !empty($a['hidden']),
        ];
    }, 300);
    return [
        'username' => preg_match('/^[A-Za-z0-9_.-]*$/', $username) ? $username : '',
        'hidden'   => array_slice(array_values(array_unique($hidden)), 0, 2000),
        'extra'    => $extra,
    ];
}

function sanitize_skills($input)
{
    if (!is_array($input) || !isset($input['skills']) || !is_array($input['skills'])) {
        return null;
    }
    $categories = unique_list(field($input, 'categories', []), function ($c) {
        return [
            'id'    => id_field(field($c, 'id', '')),
            'label' => localized_field(field($c, 'label'), 60),
            'color' => color_field(field($c, 'color', ''), '#9b20b7'),
        ];
    }, 20);
    $skills = unique_list($input['skills'], function ($s) {
        $connections = [];
        foreach ((array) field($s, 'connections', []) as $id) {
            $id = id_field($id);
            if ($id !== '') {
                $connections[] = $id;
            }
        }
        return [
            'id'          => id_field(field($s, 'id', '')),
            'name'        => str_field(field($s, 'name', ''), 60),
            'category'    => id_field(field($s, 'category', '')),
            'level'       => max(1, min(5, (int) field($s, 'level', 3))),
            'x'           => max(0, min(1000, (int) field($s, 'x', 500))),
            'y'           => max(0, min(600, (int) field($s, 'y', 300))),
            'connections' => array_slice(array_values(array_unique($connections)), 0, 20),
            'desc'        => localized_field(field($s, 'desc'), 500),
        ];
    }, 100);
    return ['categories' => $categories, 'skills' => $skills];
}

function sanitize_wallpapers($input)
{
    if (!is_array($input) || !isset($input['items']) || !is_array($input['items'])) {
        return null;
    }
    $items = unique_list($input['items'], function ($w) {
        $wallpaper = [
            'id'        => id_field(field($w, 'id', '')),
            'label'     => localized_field(field($w, 'label'), 60),
            'image'     => image_field(field($w, 'image', '')),
            'darkImage' => image_field(field($w, 'darkImage', '')),
            'css'       => gradient_field(field($w, 'css', '')),
            'darkCss'   => gradient_field(field($w, 'darkCss', '')),
            'hidden'    => !empty($w['hidden']),
        ];
        copy_i18n_keys($w, $wallpaper, ['labelKey']);
        // Needs something to show.
        return ($wallpaper['image'] === '' && $wallpaper['css'] === '') ? null : $wallpaper;
    }, 50);
    return [
        'items'     => $items,
        'defaultId' => id_field(field($input, 'defaultId', '')),
    ];
}

// About Me chat: profile, questions with Rick's answers, CV, socials, certificates.
function sanitize_about($input)
{
    if (!is_array($input) || !isset($input['questions']) || !is_array($input['questions'])) {
        return null;
    }
    $questions = unique_list($input['questions'], function ($q) {
        $messages = [];
        foreach ((array) field($q, 'messages', []) as $m) {
            if (!is_array($m)) {
                continue;
            }
            $message = ['text' => localized_field(field($m, 'text'), 2000)];
            copy_i18n_keys($m, $message, ['key']);
            $messages[] = $message;
            if (count($messages) >= 20) {
                break;
            }
        }
        $attachment = field($q, 'attachment', 'none');
        $question = [
            'id'         => id_field(field($q, 'id', '')),
            'label'      => localized_field(field($q, 'label'), 200),
            'messages'   => $messages,
            'attachment' => in_array($attachment, ['none', 'cv', 'socials', 'certificates'], true) ? $attachment : 'none',
            'hidden'     => !empty($q['hidden']),
        ];
        copy_i18n_keys($q, $question, ['labelKey']);
        return $question;
    }, 30);

    $socials = unique_list(field($input, 'socials', []), function ($s) {
        $icon = str_field(field($s, 'icon', ''), 30);
        return [
            'id'     => id_field(field($s, 'id', '')),
            'icon'   => preg_match('/^[a-z0-9-]+$/', $icon) ? $icon : 'link',
            'url'    => url_field(field($s, 'url', '')),
            'label'  => str_field(field($s, 'label', ''), 60),
            'hidden' => !empty($s['hidden']),
        ];
    }, 30);

    $certificates = unique_list(field($input, 'certificates', []), function ($c) {
        $image = image_field(field($c, 'image', ''));
        return $image === '' ? null : [
            'id'     => id_field(field($c, 'id', '')),
            'title'  => str_field(field($c, 'title', ''), 120),
            'image'  => $image,
            'hidden' => !empty($c['hidden']),
        ];
    }, 50);

    $cv = field($input, 'cv', []);
    $cvFile = str_field(field($cv, 'file', ''), 300);
    $about = [
        'avatar'       => image_field(field($input, 'avatar', '')),
        'status'       => localized_field(field($input, 'status'), 80),
        'greeting'     => localized_field(field($input, 'greeting'), 1000),
        'questions'    => $questions,
        'socials'      => $socials,
        'certificates' => $certificates,
        'cv'           => [
            'file' => preg_match('#^/uploads/cv/[A-Za-z0-9_-]+\.pdf$#', $cvFile) ? $cvFile : '',
            'name' => preg_replace('/[^A-Za-z0-9 ._()-]/', '_', str_field(field($cv, 'name', ''), 120)),
        ],
    ];
    copy_i18n_keys($input, $about, ['greetingKey']);
    return $about;
}

// ---------------------------------------------------------------------------
// Backups + upload cleanup

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

// Every "/uploads/..." string anywhere in the content.
function referenced_uploads($value, &$refs = [])
{
    if (is_string($value)) {
        if (strpos($value, '/uploads/') === 0) {
            $refs[$value] = true;
        }
    } elseif (is_array($value) || is_object($value)) {
        foreach ($value as $child) {
            referenced_uploads($child, $refs);
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
        if (isset($after[$url]) || !preg_match(upload_pattern(), $url, $m)) {
            continue;
        }
        $file = UPLOADS_DIR . '/' . $m[1] . '/' . basename($m[2]);
        if (is_file($file)) {
            @unlink($file);
        }
    }
}

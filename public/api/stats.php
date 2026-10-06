<?php
/**
 * Privacy-friendly visitor statistics - no cookies, no third parties.
 *
 * POST /api/stats.php {"event": "visit", "device": "mobile|desktop", "lang": "en|nl"}
 * POST /api/stats.php {"event": "open", "app": "<window name>"}
 *   -> 204. Public; sent by the site itself (src/stats.js).
 * GET  /api/stats.php?days=30
 *   -> {"days": [{"date", "visits", "uniques", "mobile", "desktop", "apps": {...}, "lang": {...}}]}
 *   Admin only.
 *
 * Unique visitors are counted with a hash of IP + user agent + a secret that
 * changes every day; those hashes live in a per-day file that is deleted after
 * two days, so nothing can be traced back to a person or across days. Only
 * the daily totals are kept (protected-files/cms/stats/<YYYY-MM>.json).
 */

require __DIR__ . '/_bootstrap.php';

define('STATS_DIR', CMS_DIR . '/stats');
define('MAX_EVENTS_PER_VISITOR', 300);

// Read-modify-write a JSON file under an exclusive lock, so simultaneous
// visitors can't overwrite each other's counts.
function update_json_locked($file, $fn)
{
    ensure_dir(dirname($file));
    $fh = fopen($file, 'c+');
    if (!$fh) {
        return null;
    }
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) {
        $data = [];
    }
    $result = $fn($data);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data, JSON_UNESCAPED_SLASHES));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return $result;
}

function stats_secret()
{
    $file = STATS_DIR . '/secret.txt';
    if (!is_file($file)) {
        ensure_dir(STATS_DIR);
        file_put_contents($file, bin2hex(random_bytes(32)), LOCK_EX);
    }
    return trim(file_get_contents($file));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!is_admin()) {
        send_json(401, ['error' => 'Not logged in']);
    }
    $count = isset($_GET['days']) ? max(1, min(366, (int) $_GET['days'])) : 30;
    $months = [];
    $out = [];
    for ($i = $count - 1; $i >= 0; $i--) {
        $date = gmdate('Y-m-d', strtotime("-$i days"));
        $month = substr($date, 0, 7);
        if (!isset($months[$month])) {
            $months[$month] = read_json_file(STATS_DIR . '/' . $month . '.json') ?: [];
        }
        $day = isset($months[$month][$date]) ? $months[$month][$date] : [];
        $out[] = [
            'date'    => $date,
            'visits'  => isset($day['visits']) ? (int) $day['visits'] : 0,
            'uniques' => isset($day['uniques']) ? (int) $day['uniques'] : 0,
            'mobile'  => isset($day['mobile']) ? (int) $day['mobile'] : 0,
            'desktop' => isset($day['desktop']) ? (int) $day['desktop'] : 0,
            'apps'    => (object) (isset($day['apps']) ? $day['apps'] : []),
            'lang'    => (object) (isset($day['lang']) ? $day['lang'] : []),
        ];
    }
    send_json(200, ['days' => $out]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(405, ['error' => 'Method not allowed']);
}

$respondEmpty = function () {
    http_response_code(204);
    exit;
};

$ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|preview|headless|lighthouse|curl|wget|python/i', $ua)) {
    $respondEmpty();
}

$input = json_decode((string) file_get_contents('php://input', false, null, 0, 2000), true);
$event = is_array($input) && isset($input['event']) ? (string) $input['event'] : '';
if (!in_array($event, ['visit', 'open'], true)) {
    $respondEmpty();
}

$today = gmdate('Y-m-d');
$visitor = hash('sha256', stats_secret() . '|' . $today . '|' . client_ip() . '|' . $ua);

// Per-day visitor hashes (for uniques + a per-visitor event cap).
$isNew = update_json_locked(STATS_DIR . '/visitors-' . $today . '.json', function (&$visitors) use ($visitor) {
    $isNew = !isset($visitors[$visitor]);
    $visitors[$visitor] = ($isNew ? 0 : $visitors[$visitor]) + 1;
    return ['new' => $isNew, 'count' => $visitors[$visitor]];
});
if (!$isNew || $isNew['count'] > MAX_EVENTS_PER_VISITOR) {
    $respondEmpty();
}

update_json_locked(STATS_DIR . '/' . substr($today, 0, 7) . '.json', function (&$days) use ($today, $event, $input, $isNew) {
    $day = isset($days[$today]) ? $days[$today] : ['visits' => 0, 'uniques' => 0, 'mobile' => 0, 'desktop' => 0, 'apps' => [], 'lang' => []];
    if ($event === 'visit') {
        $day['visits']++;
        if ($isNew['new']) {
            $day['uniques']++;
        }
        $device = isset($input['device']) && $input['device'] === 'mobile' ? 'mobile' : 'desktop';
        $day[$device]++;
        $lang = isset($input['lang']) && in_array($input['lang'], ['en', 'nl'], true) ? $input['lang'] : null;
        if ($lang) {
            $day['lang'][$lang] = (isset($day['lang'][$lang]) ? $day['lang'][$lang] : 0) + 1;
        }
    } else {
        $app = isset($input['app']) ? (string) $input['app'] : '';
        if (preg_match('/^[A-Za-z0-9_-]{1,40}$/', $app) && (count($day['apps']) < 100 || isset($day['apps'][$app]))) {
            $day['apps'][$app] = (isset($day['apps'][$app]) ? $day['apps'][$app] : 0) + 1;
        }
    }
    $days[$today] = $day;
});

// Visitor hashes are only needed for the current day.
foreach ((array) glob(STATS_DIR . '/visitors-*.json') as $file) {
    if (basename($file) < 'visitors-' . gmdate('Y-m-d', strtotime('-1 day')) . '.json') {
        @unlink($file);
    }
}

$respondEmpty();

<?php
/**
 * Shared registry for the download gatekeeper (download.php) and the
 * version-lookup endpoint (version.php). Only file locations/naming rules
 * live here - the files themselves stay outside the web root and out of git.
 */

$DOWNLOADS = [
    'portfolio-fotografie' => [
        'file'        => __DIR__ . '/../protected-files/portfolio-fotografie.zip',
        'downloadName' => 'Portfolio-opdracht-Fotografie.zip',
        'passwordKey' => 'DOWNLOAD_PORTFOLIO_PASSWORD',
    ],
    'stickyreminders' => [
        'file'        => __DIR__ . '/../protected-files/StickyReminders.apk',
        'downloadName' => 'StickyReminders.apk',
        'passwordKey' => 'DOWNLOAD_STICKYREMINDERS_PASSWORD',
    ],
    'lunarhome' => [
        'file'        => __DIR__ . '/../protected-files/LunarHome.apk',
        'downloadName' => 'LunarHome.apk',
        'passwordKey' => 'DOWNLOAD_LUNARHOME_PASSWORD',
    ],
    // No passwordKey: gated only by living outside the web root. No fixed
    // 'file' either - the version is baked into the filename, so the newest
    // matching file is resolved automatically at request time. To ship a new
    // version, just upload "Playdeck Setup <version>.exe" to
    // protected-files/ (the old file may be deleted or left in place; the
    // highest version always wins). No code changes or redeploy needed.
    'playdeck' => [
        'pattern'      => __DIR__ . '/../protected-files/Playdeck Setup *.exe',
        'versionRegex' => '/^Playdeck Setup ([\d.]+)\.exe$/i',
    ],
];

// Resolves a versioned entry (one with 'pattern' + 'versionRegex' instead of
// a fixed 'file') to its newest matching file on disk, plus the version
// string extracted from the filename. Returns null if nothing matches.
function resolve_versioned_entry($entry)
{
    $matches = glob($entry['pattern']);
    if (!$matches) {
        return null;
    }

    $best = null;
    $bestVersion = null;
    foreach ($matches as $path) {
        if (!preg_match($entry['versionRegex'], basename($path), $m)) {
            continue;
        }
        $version = $m[1];
        if ($bestVersion === null || version_compare($version, $bestVersion, '>')) {
            $best = $path;
            $bestVersion = $version;
        }
    }

    if ($best === null) {
        return null;
    }

    return ['file' => $best, 'downloadName' => basename($best), 'version' => $bestVersion];
}

// Resolves any registry entry to ['file', 'downloadName', 'version'] (version
// is null for entries with a fixed filename). Returns null if the entry - or
// its matching file - isn't available.
function resolve_download_entry($entry)
{
    if (isset($entry['pattern'])) {
        return resolve_versioned_entry($entry);
    }
    if (!is_file($entry['file'])) {
        return null;
    }
    return ['file' => $entry['file'], 'downloadName' => $entry['downloadName'], 'version' => null];
}

// ---------------------------------------------------------------------------
// Downloads managed from the admin panel (see public/api/download-file.php).
//
// Once the admin panel has saved a `downloads` list in
// protected-files/cms/content.json, that list decides which downloads exist,
// whether they need a password ("mode": "password") or not ("gated"), and
// whether they're available. A file uploaded from the admin panel lives in
// protected-files/cms-downloads/<id>/ and wins over the $DOWNLOADS registry
// above; without one, the registry file is used. Same for the password: one
// set from the admin panel (stored as a hash) wins over download-secrets.php.

define('CMS_PROTECTED_DIR', __DIR__ . '/../protected-files');

function cms_read_json($file)
{
    if (!is_file($file)) {
        return null;
    }
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

// null  = the admin panel doesn't manage downloads (yet): use the registry.
// false = it does, and this id isn't in its list.
// array = the admin panel's entry for this id.
function cms_download_entry($id)
{
    $content = cms_read_json(CMS_PROTECTED_DIR . '/cms/content.json');
    if (!$content || !isset($content['downloads']) || !is_array($content['downloads'])) {
        return null;
    }
    foreach ($content['downloads'] as $entry) {
        if (isset($entry['id']) && $entry['id'] === $id) {
            return $entry;
        }
    }
    return false;
}

// The file uploaded for this id from the admin panel, or null.
function cms_download_file($id)
{
    if (!preg_match('/^[A-Za-z0-9_-]+$/', $id)) {
        return null;
    }
    $files = glob(CMS_PROTECTED_DIR . '/cms-downloads/' . $id . '/*');
    foreach ((array) $files as $file) {
        if (is_file($file) && substr($file, -5) !== '.part') {
            return ['file' => $file, 'downloadName' => basename($file), 'version' => null];
        }
    }
    return null;
}

function cms_download_password_hash($id)
{
    $hashes = cms_read_json(CMS_PROTECTED_DIR . '/cms/download-passwords.json');
    return $hashes && isset($hashes[$id]) && is_string($hashes[$id]) ? $hashes[$id] : null;
}

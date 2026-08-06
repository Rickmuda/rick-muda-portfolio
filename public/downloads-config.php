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

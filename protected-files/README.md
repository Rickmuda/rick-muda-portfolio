# Protected download files

> Also holds the admin panel's secrets and saved content - see
> [Admin panel](#admin-panel) at the bottom.

Files for the password-protected download window are served **only** by
`public/download.php` (deployed to `www.rickmuda.nl/download.php`). They are never
served statically and are excluded from git (see `.gitignore`), so they cannot leak
through the public repo or a guessable URL.

This folder is just for local reference + this README. **On the live server the files
must sit OUTSIDE the web root** (see below).

## Enabling the photography portfolio download (on the server)

The frontend is FTP-deployed to your ping64 web root (the `dist/` contents). The PHP
script expects its protected files one level *above* that web root:

```
<web root>/download.php                          <- shipped automatically via dist/
<web root>/version.php                            <- shipped automatically via dist/
<web root>/downloads-config.php                    <- shipped automatically via dist/
<one level above web root>/protected-files/
    portfolio-fotografie.zip                      <- upload manually
    download-secrets.php                          <- upload manually
```

1. **Upload the file** to `protected-files/portfolio-fotografie.zip` (outside the web root).
2. **Set the password.** Create `protected-files/download-secrets.php` containing:
   ```php
   <?php
   return [
       'DOWNLOAD_PORTFOLIO_PASSWORD' => 'your-strong-password-here',
   ];
   ```
   (Alternatively set a `DOWNLOAD_PORTFOLIO_PASSWORD` env var if your host supports it.)
3. In `src/components/windows/Downloads.vue` set the item's `available: true` and
   update its `size` (and `version` if relevant), then deploy the frontend.

If your hosting layout does NOT allow files above the web root, adjust the relative
paths in `download.php` and protect the folder with an `.htaccess` containing
`Require all denied` (Apache 2.4) so it can't be downloaded directly.

## Adding more downloads
Add an entry to `$DOWNLOADS` in `public/downloads-config.php` (with its own
`passwordKey`, or a `pattern`/`versionRegex` pair for a filename-versioned download
like Playdeck) and a matching item in `Downloads.vue`.

## LunarHome app download

Released - `available: true` in `Downloads.vue`'s `lunarhome` entry. Password key
`DOWNLOAD_LUNARHOME_PASSWORD`, password `ilydeempie`.

Before deploying, make sure the server actually has:
1. The file at `protected-files/LunarHome.apk` (outside the web root).
2. `'DOWNLOAD_LUNARHOME_PASSWORD' => 'ilydeempie',` in the server's own
   `protected-files/download-secrets.php` (already present in the local copy here for
   reference).

Without both of those in place on the server, the download card will show but the
unlock will fail with "Something went wrong" / 503.

## Playdeck app download

Released - `available: true` in `Downloads.vue`'s `playdeck` entry. No password: the
`playdeck` entry in `downloads-config.php` has no `passwordKey`, so the file is gated
only by living outside the web root, not by a password prompt.

**The version shown on the site is read automatically from the uploaded filename** -
no code change or redeploy needed for a new release. To ship a new version:

1. Upload the new build to `protected-files/Playdeck Setup <version>.exe` (outside the
   web root, exact naming - e.g. `Playdeck Setup 2.1.0.exe`). Old versions may be left
   in place or deleted; whichever file has the highest version number wins.
2. That's it. `Downloads.vue` calls `GET /version.php?id=playdeck` on load, which
   scans `protected-files/` for files matching `Playdeck Setup *.exe`, picks the
   highest version via `version_compare()`, and returns its version + file size. The
   download button (`POST /download.php`) resolves the same file.

Without a matching file present, the download card will show but requesting it will
fail with "Something went wrong" / 404, and the version/size will stay blank.

The matching/version-resolution logic lives in `downloads-config.php` (shipped in
`dist/`, alongside `download.php` and `version.php`) so it's shared between the
download and version-lookup endpoints.

## Admin panel

Open the **MudaDigitaal** terminal on the site and type `admin`. That opens the admin
panel (it is not listed in `help`, the start menu or search). From there you can
manage projects, project photos, the Art gallery, all texts (EN + NL) and remove
scoreboard entries.

It is backed by PHP endpoints in `public/api/` (shipped via `dist/` like
`download.php`) and stores everything on the server:

```
<web root>/api/*.php                         <- shipped automatically via dist/
<web root>/uploads/projects|art/             <- uploaded photos (created on first upload)
<one level above web root>/protected-files/
    admin-secrets.php                        <- upload manually (see below)
    cms/content.json                         <- written by the admin panel
    cms/backups/                             <- last 10 versions of content.json
    cms/login-attempts.json                  <- login rate limiting
```

`uploads/` is excluded from the deploy mirror in `.github/workflows/deploy.yml`, so
uploaded photos survive deploys. Until the first save, the site keeps using the
defaults in `src/projectsData.js`, `src/galleryImages.js` and `src/i18n.js`.

### One-time setup on the server

1. Make a password hash (locally, with PHP installed):
   ```
   php -r "echo password_hash('your-strong-password', PASSWORD_DEFAULT);"
   ```
2. Upload `protected-files/admin-secrets.php` (outside the web root, next to
   `download-secrets.php`):
   ```php
   <?php
   return [
       'ADMIN_PASSWORD_HASH' => '$2y$10$...the hash from step 1...',
       // Only needed for scoreboard moderation (Supabase -> Project settings -> API keys):
       'SUPABASE_SERVICE_ROLE_KEY' => '...',
   ];
   ```
   Use single quotes around the hash (it contains `$`).
3. Make sure PHP can write to `protected-files/cms/` and `<web root>/uploads/`
   (both are created automatically if the parent folder is writable).

### Notes
- Five wrong passwords from the same IP lock the login for 15 minutes.
- A session lasts at most 8 hours.
- Deleting a photo (or a project/art item with uploaded photos) removes the file from
  `uploads/` when you save. Restoring an older backup from `cms/backups/` will
  therefore not bring those files back.
- The admin panel only works on the live site (or `php -S` on a built `dist/`), not on
  `npm run dev`, which has no PHP. The site itself still works there with the defaults.

### Downloads, vinyl, skill tree, wallpapers and statistics

These are also managed from the admin panel (tabs of the same name):

- **Downloads**: once the admin panel has saved its downloads list, that list decides
  which downloads exist, whether they need a password and whether they're available.
  Files uploaded from the panel go to `protected-files/cms-downloads/<id>/` (uploaded
  in 2 MB chunks, so large files work regardless of the host's upload limit) and win
  over the files listed in `downloads-config.php`. Passwords set from the panel are
  stored as hashes in `protected-files/cms/download-passwords.json` and win over
  `download-secrets.php`. Downloads without a panel file/password keep using the
  existing files and passwords described above.
- **Statistics** (`public/api/stats.php`): daily totals in `protected-files/cms/stats/`.
  No cookies; unique visitors are counted with a per-day hash that is deleted after
  two days. The admin's own browser is excluded after logging in once.

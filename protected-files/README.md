# Protected download files

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
Add an entry to `$DOWNLOADS` in `public/download.php` (with its own `passwordKey`)
and a matching item in `Downloads.vue`.

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

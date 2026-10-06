// Default download cards, bundled with the site. Downloads.vue reads them
// through src/contentStore.js, which the admin panel can override.
//
// mode: "password" = streamed by download.php only after the right password,
//       "gated"    = streamed by download.php without a password.
// Either way the file lives outside the web root (protected-files/), so it
// can't be reached by guessing a URL.
// devices: "all" | "desktop" (e.g. a Windows .exe) | "mobile" (e.g. an APK).
// autoVersion: version + size are read from the uploaded filename by
// /version.php (see downloads-config.php), so no redeploy is needed for a new build.

export const downloads = [
  {
    id: "portfolio-fotografie",
    titleKey: "dlPhotoTitle",
    descKey: "dlPhotoDesc",
    version: "v1.0",
    size: "",
    thumbnail: "bundled:downloads/fotoport.webp",
    mode: "password",
    available: true,
    devices: "desktop",
  },
  {
    id: "stickyreminders",
    titleKey: "dlStickyTitle",
    descKey: "dlStickyDesc",
    version: "v1.0",
    size: "",
    thumbnail: "bundled:downloads/sticky-icon.webp",
    mode: "password",
    available: true,
    devices: "mobile",
  },
  {
    id: "lunarhome",
    titleKey: "dlLunarTitle",
    descKey: "dlLunarDesc",
    version: "v1.0",
    size: "",
    thumbnail: "bundled:downloads/lunarhome_icon.webp",
    mode: "password",
    available: true,
    devices: "mobile",
  },
  {
    id: "playdeck",
    titleKey: "dlPlaydeckTitle",
    descKey: "dlPlaydeckDesc",
    version: "",
    size: "",
    autoVersion: true,
    thumbnail: "bundled:downloads/playdeck_icon.webp",
    mode: "gated",
    available: true,
    devices: "desktop",
  },
];

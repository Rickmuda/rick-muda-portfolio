// Wallpaper presets. Each entry has a CSS background-image value that can be
// either a url() (bundled via Vite) or a gradient. Pub-sub lets the desktop
// background subscribe to changes from the Settings window.

const STORAGE_KEY = "portfolio-wallpaper";

const roomUrl = new URL("@/assets/img/imggallery/room.webp", import.meta.url).href;

export const wallpapers = [
  { id: "default",  labelKey: "wpDefault",  cssValue: `url('${roomUrl}')` },
  { id: "aurora",   labelKey: "wpAurora",   cssValue: "linear-gradient(135deg, #1a1a3e 0%, #4a2c7a 55%, #c43c8a 100%)" },
  { id: "sunset",   labelKey: "wpSunset",   cssValue: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)" },
  { id: "ocean",    labelKey: "wpOcean",    cssValue: "linear-gradient(135deg, #2e3192 0%, #1bffff 100%)" },
  { id: "forest",   labelKey: "wpForest",   cssValue: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)" },
  { id: "midnight", labelKey: "wpMidnight", cssValue: "linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)" },
];

const listeners = new Set();

export function getCurrentId() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && wallpapers.some((w) => w.id === v) ? v : "default";
  } catch (_) {
    return "default";
  }
}

export function getCurrent() {
  const id = getCurrentId();
  return wallpapers.find((w) => w.id === id) || wallpapers[0];
}

export function setCurrent(id) {
  const next = wallpapers.find((w) => w.id === id);
  if (!next) return null;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (_) {}
  for (const fn of listeners) {
    try { fn(next); } catch (_) {}
  }
  return next;
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

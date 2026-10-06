// Wallpapers. The list (and which one new visitors get) comes from
// src/contentStore.js: the defaults in src/wallpapersData.js, or what the admin
// panel saved. Each entry has a CSS background-image value (`cssValue`, a url()
// or a gradient) plus a dark-mode variant (`darkCssValue`). The visitor's own
// pick is kept in localStorage; pub-sub lets the desktop background follow
// changes from the Settings window.

import { wallpaperList, defaultWallpaper, itemText } from "./contentStore";

const STORAGE_KEY = "portfolio-wallpaper";

const listeners = new Set();

// Reactive: reads the content store, so computed properties using it update
// when the admin's wallpaper list arrives from the server.
export function getWallpapers() {
  return wallpaperList();
}

export function wallpaperLabel(wp) {
  return itemText(wp.label, wp.labelKey, wp.id);
}

function storedId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (_) {
    return null;
  }
}

export function getCurrentId() {
  const list = getWallpapers();
  const picked = storedId();
  if (picked && list.some((w) => w.id === picked)) return picked;
  const fallback = defaultWallpaper();
  if (list.some((w) => w.id === fallback)) return fallback;
  return list[0]?.id || "default";
}

export function getCurrent() {
  const list = getWallpapers();
  const id = getCurrentId();
  return list.find((w) => w.id === id) || list[0] || { id: "default", cssValue: "none", darkCssValue: "none" };
}

export function setCurrent(id) {
  const next = getWallpapers().find((w) => w.id === id);
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

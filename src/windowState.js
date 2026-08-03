// Persists desktop window chrome (which windows are open/minimized, and each
// window's geometry) across reloads. Mirrors desktopLayout.js's storage shape.
//
// Deliberately NOT persisted: explorerPath/explorerSelect/projectSelect/
// photoSelect - fileExplorer/projects/artGallery just reopen at their default
// state, which sidesteps threading persistence through App.vue's per-window
// prop special-cases in getWindowProps().

const CHROME_KEY = "portfolio-window-chrome";
const GEOMETRY_KEY = "portfolio-window-geometry";

export function getChromeState() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHROME_KEY) || "null");
    if (!raw || typeof raw !== "object") return { open: [], minimized: {} };
    return {
      open: Array.isArray(raw.open) ? raw.open : [],
      minimized: raw.minimized && typeof raw.minimized === "object" ? raw.minimized : {},
    };
  } catch (_) {
    return { open: [], minimized: {} };
  }
}

export function setChromeState(open, minimized) {
  try {
    localStorage.setItem(CHROME_KEY, JSON.stringify({ open, minimized }));
  } catch (_) {}
}

function loadGeometry() {
  try {
    const raw = JSON.parse(localStorage.getItem(GEOMETRY_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch (_) {
    return {};
  }
}

let geometry = loadGeometry();

// Per-window geometry: { x, y, w, h, maximized, snapSide: null|"left"|"right" }
export function getGeometry(appName) {
  return geometry[appName] || null;
}

export function setGeometry(appName, geo) {
  geometry = { ...geometry, [appName]: geo };
  try {
    localStorage.setItem(GEOMETRY_KEY, JSON.stringify(geometry));
  } catch (_) {}
}

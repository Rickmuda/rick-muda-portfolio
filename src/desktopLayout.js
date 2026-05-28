// Persists desktop icon positions to localStorage. This stores LAYOUT only (where
// the user dragged each icon), not file-system content - the VFS itself stays
// read-only. Positions are keyed by VFS node id: { [id]: { x, y } }.
//
// Mirrors the pub-sub shape of wallpapers.js so callers can subscribe to changes.

const STORAGE_KEY = "portfolio-desktop-layout";

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch (_) {
    return {};
  }
}

let positions = load();
const listeners = new Set();

// Returns a shallow copy so callers cannot mutate the internal map directly.
export function getPositions() {
  return { ...positions };
}

export function setPosition(id, pos) {
  if (!id || !pos) return;
  positions = { ...positions, [id]: { x: Math.round(pos.x), y: Math.round(pos.y) } };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch (_) {}
  for (const fn of listeners) {
    try { fn(positions); } catch (_) {}
  }
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

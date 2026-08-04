// Persists visitor desktop-icon customization to localStorage: which default
// desktop icons have been hidden, and which non-default VFS nodes have been
// pinned to the desktop from File Explorer. Both lists hold identities (see
// identityOf() in filesystem.js), not raw VFS node ids, so toggling either of
// the intentional duplicate app nodes (e.g. "aboutMe" / "aboutMeDesktop")
// means the same thing.
//
// Mirrors the pub-sub + localStorage shape of desktopLayout.js / wallpapers.js.

import { getDefaultDesktopIdentities } from "./filesystem";

const STORAGE_KEY = "portfolio-desktop-icons";

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      removed: Array.isArray(raw.removed) ? raw.removed : [],
      added: Array.isArray(raw.added) ? raw.added : [],
    };
  } catch (_) {
    return { removed: [], added: [] };
  }
}

let state = load();
const listeners = new Set();

function persistAndNotify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
  for (const fn of listeners) {
    try { fn(state); } catch (_) {}
  }
}

// Returns a shallow copy so callers cannot mutate the internal state directly.
export function getState() {
  return { removed: [...state.removed], added: [...state.added] };
}

// Default identities flip `removed`; everything else flips `added`. One
// function drives both "remove from desktop" (Desktop.vue) and "add/remove to
// desktop" (FileExplorer.vue) so behavior stays identical regardless of which
// duplicate node triggered it.
export function toggleDesktop(identity) {
  if (!identity) return;
  const defaults = getDefaultDesktopIdentities();
  if (defaults.has(identity)) {
    state = state.removed.includes(identity)
      ? { ...state, removed: state.removed.filter((i) => i !== identity) }
      : { ...state, removed: [...state.removed, identity] };
  } else {
    state = state.added.includes(identity)
      ? { ...state, added: state.added.filter((i) => i !== identity) }
      : { ...state, added: [...state.added, identity] };
  }
  persistAndNotify();
}

export function resetDesktop() {
  state = { removed: [], added: [] };
  persistAndNotify();
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

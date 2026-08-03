// Persists the user's manual dark-mode override (if any). Null means "no
// explicit choice yet" - App.vue then falls back to the OS's prefers-color-scheme,
// and finally to a time-of-day heuristic if neither signal is available.

const STORAGE_KEY = "portfolio-dark-mode-override";

export function getOverride() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch (_) {
    return null;
  }
}

export function setOverride(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch (_) {}
}

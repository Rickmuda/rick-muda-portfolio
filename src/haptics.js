// Tiny wrapper around navigator.vibrate for the OS-feel layer, mirroring
// sounds.js's enabled/localStorage shape. Opt-out (on by default) since it's
// low-risk on devices that support it and a total no-op on ones that don't -
// but some users find vibration intrusive, hence the Settings toggle.
const STORAGE_KEY = "hapticsEnabled";

class HapticsManager {
  constructor() {
    this.enabled = localStorage.getItem(STORAGE_KEY) !== "0";
  }
  setEnabled(value) {
    this.enabled = !!value;
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  }
  isEnabled() {
    return this.enabled;
  }
  supported() {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }
  vibrate(pattern) {
    if (!this.enabled || !this.supported()) return;
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
}

export const haptics = new HapticsManager();

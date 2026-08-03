// Classifies the current device into one of three tiers so the desktop-OS
// chrome can adapt beyond the simple phone-vs-not-phone split `isMobile` used
// to make on its own. `mobile` keeps its existing exact threshold (zero
// regression to current phone behavior); `tablet` is new - a touch device
// too wide for the phone launcher but too imprecise for tiny mouse-era hit
// targets (8px resize handles, etc). Breakpoints are named constants so
// they're easy to retune later.
const MOBILE_MAX_WIDTH = 768;
const TABLET_MAX_WIDTH = 1200;

export function getDeviceTier(width = window.innerWidth) {
  if (width <= MOBILE_MAX_WIDTH) return "mobile";
  const isCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  if (isCoarsePointer && width <= TABLET_MAX_WIDTH) return "tablet";
  return "desktop";
}

// Simple achievements / trophies registry. State is persisted to localStorage
// and a tiny pub-sub lets the toast component listen for new unlocks.

const STORAGE_KEY = "achievements-unlocked";

function loadUnlocked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch (_) {
    return new Set();
  }
}

const unlocked = loadUnlocked();
const listeners = new Set();

export const achievements = [
  { id: "first-boot",         icon: "user",         titleKey: "achFirstBootTitle",        descKey: "achFirstBootDesc" },
  { id: "solitaire-won",      icon: "clone",        titleKey: "achSolitaireWonTitle",     descKey: "achSolitaireWonDesc" },
  { id: "paint-stroke",       icon: "paintbrush",   titleKey: "achPaintStrokeTitle",      descKey: "achPaintStrokeDesc" },
  { id: "paint-bucket",       icon: "fill-drip",    titleKey: "achPaintBucketTitle",      descKey: "achPaintBucketDesc" },
  { id: "paint-clear",        icon: "trash",        titleKey: "achPaintClearTitle",       descKey: "achPaintClearDesc" },
  { id: "flappy-score-10",    icon: "dove",         titleKey: "achFlappyScore10Title",    descKey: "achFlappyScore10Desc" },
  { id: "opened-all-windows", icon: "sitemap",      titleKey: "achTourGuideTitle",        descKey: "achTourGuideDesc" },
  { id: "easter-egg-found",   icon: "egg",          titleKey: "achHackerTitle",           descKey: "achHackerDesc" },
  { id: "night-owl",          icon: "moon",         titleKey: "achNightOwlTitle",         descKey: "achNightOwlDesc" },
  { id: "bilingual",          icon: "book",         titleKey: "achBilingualTitle",        descKey: "achBilingualDesc" },
];

export function unlock(id) {
  if (unlocked.has(id)) return null;
  const ach = achievements.find((a) => a.id === id);
  if (!ach) return null;
  unlocked.add(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  } catch (_) {}
  for (const fn of listeners) {
    try { fn(ach); } catch (_) {}
  }
  return ach;
}

export function isUnlocked(id) {
  return unlocked.has(id);
}

export function unlockedIds() {
  return [...unlocked];
}

export function onUnlock(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

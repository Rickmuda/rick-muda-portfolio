import { defineAsyncComponent } from "vue";
import { minigamesFolder } from "./minigames";

// Each window is code-split into its own chunk. The loader is held in a map so
// we can both lazy-render through defineAsyncComponent AND warm-preload every
// chunk during idle time after the main app paints.
// Note: projects/downloads/artGallery remain here because the MOBILE launcher
// (appList + openApp) still opens them as windows. On desktop they are instead
// embedded as browsable folders inside the File Explorer (see src/filesystem.js).
const windowLoaders = {
  aboutMe:         () => import("./components/windows/AboutMe.vue"),
  projects:        () => import("./components/windows/Projects.vue"),
  contact:         () => import("./components/windows/Contact.vue"),
  newsletter:      () => import("./components/windows/Newsletter.vue"),
  artGallery:      () => import("./components/windows/ArtGallery.vue"),
  miniGame:        () => import("./components/games/Solitaire.vue"),
  oldVideo:        () => import("./components/windows/OldVideo.vue"),
  vinylCollection: () => import("./components/windows/VinylCollection.vue"),
  skillTree:       () => import("./components/windows/SkillTree.vue"),
  downloads:       () => import("./components/windows/Downloads.vue"),
  settings:        () => import("./components/windows/Settings.vue"),
  flappyRick:      () => import("./components/games/FlappyRick.vue"),
  minesweeper:     () => import("./components/games/Minesweeper.vue"),
  tetris:          () => import("./components/games/Tetris.vue"),
  mudaDigitaal:    () => import("./components/windows/MudaTerminal.vue"),
  paint:           () => import("./components/windows/Paint.vue"),
  achievements:    () => import("./components/windows/Achievements.vue"),
  fileExplorer:    () => import("./components/windows/FileExplorer.vue"),
  camera:          () => import("./components/windows/CameraApp.vue"),
  scoreboards:     () => import("./components/windows/Scoreboards.vue"),
};

const lazy = (loader) => defineAsyncComponent(loader);

export const windowConfig = {
  aboutMe:         { component: lazy(windowLoaders.aboutMe),         title: "aboutMe",        defaultWidth: 900,  defaultHeight: 700, defaultX: 100, defaultY: 100 },
  projects:        { component: lazy(windowLoaders.projects),        title: "projects",       defaultWidth: 1200, defaultHeight: 800, defaultX: 200, defaultY: 20 },
  contact:         { component: lazy(windowLoaders.contact),         title: "contact",        defaultWidth: 850,  defaultHeight: 650, defaultX: 300, defaultY: 200 },
  newsletter:      { component: lazy(windowLoaders.newsletter),      title: "newsletter",     defaultWidth: 520,  defaultHeight: 680, defaultX: 320, defaultY: 40 },
  artGallery:      { component: lazy(windowLoaders.artGallery),      title: "artGallery",     defaultWidth: 1000, defaultHeight: 800, defaultX: 500, defaultY: 20 },
  miniGame:        { component: lazy(windowLoaders.miniGame),        title: "solitaire",      defaultWidth: 1000, defaultHeight: 700, defaultX: 600, defaultY: 100 },
  oldVideo:        { component: lazy(windowLoaders.oldVideo),        title: "Easter Egg",     defaultWidth: 800,  defaultHeight: 600, defaultX: 300, defaultY: 200 },
  vinylCollection: { component: lazy(windowLoaders.vinylCollection), title: "vinylCollection",defaultWidth: 900,  defaultHeight: 700, defaultX: 220, defaultY: 60 },
  skillTree:       { component: lazy(windowLoaders.skillTree),       title: "skillTree",      defaultWidth: 1100, defaultHeight: 750, defaultX: 150, defaultY: 40 },
  downloads:       { component: lazy(windowLoaders.downloads),       title: "downloads",      defaultWidth: 1000, defaultHeight: 720, defaultX: 260, defaultY: 50 },
  settings:        { component: lazy(windowLoaders.settings),        title: "settings",       defaultWidth: 700,  defaultHeight: 600, defaultX: 300, defaultY: 150 },
  flappyRick:      { component: lazy(windowLoaders.flappyRick),      title: "flappyRick",     defaultWidth: 480,  defaultHeight: 720, defaultX: 360, defaultY: 40 },
  minesweeper:     { component: lazy(windowLoaders.minesweeper),     title: "minesweeper",    defaultWidth: 460,  defaultHeight: 560, defaultX: 340, defaultY: 60 },
  tetris:          { component: lazy(windowLoaders.tetris),          title: "tetris",         defaultWidth: 460,  defaultHeight: 720, defaultX: 320, defaultY: 30 },
  mudaDigitaal:    { component: lazy(windowLoaders.mudaDigitaal),    title: "mudaDigitaal",   defaultWidth: 760,  defaultHeight: 520, defaultX: 240, defaultY: 80 },
  paint:           { component: lazy(windowLoaders.paint),           title: "paint",          defaultWidth: 760,  defaultHeight: 560, defaultX: 280, defaultY: 80 },
  achievements:    { component: lazy(windowLoaders.achievements),    title: "achievements",   defaultWidth: 800,  defaultHeight: 600, defaultX: 320, defaultY: 80 },
  fileExplorer:    { component: lazy(windowLoaders.fileExplorer),    title: "fileExplorer",   defaultWidth: 1240, defaultHeight: 800, defaultX: 180, defaultY: 50 },
  camera:          { component: lazy(windowLoaders.camera),         title: "camera",         defaultWidth: 480,  defaultHeight: 720, defaultX: 360, defaultY: 40 },
  scoreboards:     { component: lazy(windowLoaders.scoreboards),    title: "scoreboards",    defaultWidth: 800,  defaultHeight: 600, defaultX: 340, defaultY: 90 },
};

// Warm the dynamic-import cache for every window during browser idle time so
// that clicking an icon opens its window without a network round-trip.
let preloadStarted = false;
export function preloadAllWindows() {
  if (preloadStarted) return;
  // Skip the idle-time import burst on a constrained connection - fine on
  // broadband, but firing every window chunk at once is wasteful for someone
  // on a metered/slow connection (each window still lazy-loads on first open).
  const conn = typeof navigator !== "undefined" ? navigator.connection : null;
  if (conn && (conn.saveData || ["slow-2g", "2g"].includes(conn.effectiveType))) {
    return;
  }
  preloadStarted = true;
  const loaders = Object.values(windowLoaders);
  const schedule = typeof window !== "undefined" && typeof window.requestIdleCallback === "function"
    ? (cb) => window.requestIdleCallback(cb, { timeout: 2500 })
    : (cb) => setTimeout(cb, 600);
  // Fire all loaders in one idle slot - they fetch in parallel and the browser
  // throttles concurrent requests, so we do not need to chain them.
  schedule(() => {
    for (const loader of loaders) {
      loader().catch(() => {}); // network errors are non-fatal
    }
  });
}

// Ordered app list used by the mobile launcher (and a single source of truth
// for icon + i18n label per app). `pinned: true` additionally marks the subset
// shown on the desktop taskbar (see `taskbarPinned` below) - File Explorer isn't
// in this list (mobile has no file-explorer icon by design) so it stays a
// separate hand-written entry in Taskbar.vue, same as Desktop.vue's synthetic
// "__explorer" node.
export const appList = [
  // Content first, then identity/getting-in-touch, then the utility apps
  // (pinned subset), then fun extras, with Downloads last.
  { name: "projects",        icon: "folder",       labelKey: "projects" },
  { name: "artGallery",      icon: "palette",      labelKey: "artGallery" },
  { name: "aboutMe",         icon: "user",         labelKey: "aboutMe",   pinned: true },
  { name: "contact",         icon: "envelope",     labelKey: "contact",   pinned: true },
  { name: "newsletter",      icon: "bell",         labelKey: "newsletter" },
  { name: "skillTree",       icon: "sitemap",      labelKey: "skillTree",      pinned: true },
  { name: "paint",           icon: "paintbrush",   labelKey: "paint",          pinned: true },
  { name: "mudaDigitaal",    icon: "terminal",     labelKey: "mudaDigitaal",   pinned: true },
  { name: "achievements",    icon: "trophy",       labelKey: "achievements",   pinned: true },
  { name: "settings",        icon: "cog",          labelKey: "settings",       pinned: true },
  { ...minigamesFolder, folder: true },
  { name: "vinylCollection", icon: "compact-disc", labelKey: "vinylCollection" },
  { name: "camera",          icon: "camera",       labelKey: "camera" },
  { name: "downloads",       icon: "download",     labelKey: "downloads" },
];

// Subset of appList pinned to the desktop taskbar, in taskbar order.
export const taskbarPinned = appList.filter((a) => a.pinned);

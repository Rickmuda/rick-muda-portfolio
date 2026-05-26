import { defineAsyncComponent } from "vue";
import { minigames } from "./minigames";

// Each window is code-split into its own chunk. The loader is held in a map so
// we can both lazy-render through defineAsyncComponent AND warm-preload every
// chunk during idle time after the main app paints.
const windowLoaders = {
  aboutMe:         () => import("./components/windows/AboutMe.vue"),
  projects:        () => import("./components/windows/Projects.vue"),
  contact:         () => import("./components/windows/Contact.vue"),
  artGallery:      () => import("./components/windows/ArtGallery.vue"),
  miniGame:        () => import("./components/games/Solitaire.vue"),
  oldVideo:        () => import("./components/windows/OldVideo.vue"),
  vinylCollection: () => import("./components/windows/VinylCollection.vue"),
  skillTree:       () => import("./components/windows/SkillTree.vue"),
  downloads:       () => import("./components/windows/Downloads.vue"),
  settings:        () => import("./components/windows/Settings.vue"),
  minigames:       () => import("./components/windows/MinigamesFolder.vue"),
  flappyRick:      () => import("./components/games/FlappyRick.vue"),
  minesweeper:     () => import("./components/games/Minesweeper.vue"),
  mudaDigitaal:    () => import("./components/windows/MudaTerminal.vue"),
  paint:           () => import("./components/windows/Paint.vue"),
  achievements:    () => import("./components/windows/Achievements.vue"),
};

const lazy = (loader) => defineAsyncComponent(loader);

export const windowConfig = {
  aboutMe:         { component: lazy(windowLoaders.aboutMe),         title: "aboutMe",        defaultWidth: 900,  defaultHeight: 700, defaultX: 100, defaultY: 100 },
  projects:        { component: lazy(windowLoaders.projects),        title: "projects",       defaultWidth: 1200, defaultHeight: 800, defaultX: 200, defaultY: 20 },
  contact:         { component: lazy(windowLoaders.contact),         title: "contact",        defaultWidth: 850,  defaultHeight: 650, defaultX: 300, defaultY: 200 },
  artGallery:      { component: lazy(windowLoaders.artGallery),      title: "artGallery",     defaultWidth: 1000, defaultHeight: 800, defaultX: 500, defaultY: 20 },
  miniGame:        { component: lazy(windowLoaders.miniGame),        title: "solitaire",      defaultWidth: 1000, defaultHeight: 700, defaultX: 600, defaultY: 100 },
  oldVideo:        { component: lazy(windowLoaders.oldVideo),        title: "Easter Egg",     defaultWidth: 800,  defaultHeight: 600, defaultX: 300, defaultY: 200 },
  vinylCollection: { component: lazy(windowLoaders.vinylCollection), title: "vinylCollection",defaultWidth: 900,  defaultHeight: 700, defaultX: 220, defaultY: 60 },
  skillTree:       { component: lazy(windowLoaders.skillTree),       title: "skillTree",      defaultWidth: 1100, defaultHeight: 750, defaultX: 150, defaultY: 40 },
  downloads:       { component: lazy(windowLoaders.downloads),       title: "downloads",      defaultWidth: 1000, defaultHeight: 720, defaultX: 260, defaultY: 50 },
  settings:        { component: lazy(windowLoaders.settings),        title: "settings",       defaultWidth: 700,  defaultHeight: 600, defaultX: 300, defaultY: 150 },
  minigames:       { component: lazy(windowLoaders.minigames),       title: "minigames",      defaultWidth: 720,  defaultHeight: 520, defaultX: 320, defaultY: 90 },
  flappyRick:      { component: lazy(windowLoaders.flappyRick),      title: "flappyRick",     defaultWidth: 480,  defaultHeight: 720, defaultX: 360, defaultY: 40 },
  minesweeper:     { component: lazy(windowLoaders.minesweeper),     title: "minesweeper",    defaultWidth: 460,  defaultHeight: 560, defaultX: 340, defaultY: 60 },
  mudaDigitaal:    { component: lazy(windowLoaders.mudaDigitaal),    title: "mudaDigitaal",   defaultWidth: 760,  defaultHeight: 520, defaultX: 240, defaultY: 80 },
  paint:           { component: lazy(windowLoaders.paint),           title: "paint",          defaultWidth: 760,  defaultHeight: 560, defaultX: 280, defaultY: 80 },
  achievements:    { component: lazy(windowLoaders.achievements),    title: "achievements",   defaultWidth: 800,  defaultHeight: 600, defaultX: 320, defaultY: 80 },
};

// Warm the dynamic-import cache for every window during browser idle time so
// that clicking an icon opens its window without a network round-trip.
let preloadStarted = false;
export function preloadAllWindows() {
  if (preloadStarted) return;
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
// for icon + i18n label per app).
export const appList = [
  { name: "aboutMe",         icon: "user",         labelKey: "aboutMe" },
  { name: "projects",        icon: "folder",       labelKey: "projects" },
  { name: "artGallery",      icon: "palette",      labelKey: "artGallery" },
  { name: "contact",         icon: "envelope",     labelKey: "contact" },
  { name: "downloads",       icon: "download",     labelKey: "downloads" },
  { name: "minigames",       icon: "folder",       labelKey: "minigames", folder: true, items: minigames },
  { name: "vinylCollection", icon: "compact-disc", labelKey: "vinylCollection" },
  { name: "skillTree",       icon: "sitemap",      labelKey: "skillTree" },
  { name: "mudaDigitaal",    icon: "terminal",     labelKey: "mudaDigitaal" },
  { name: "paint",           icon: "paintbrush",   labelKey: "paint" },
  { name: "achievements",    icon: "trophy",       labelKey: "achievements" },
  { name: "settings",        icon: "cog",          labelKey: "settings" },
];

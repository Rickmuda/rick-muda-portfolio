// Read-only virtual file system (VFS) for the desktop OS metaphor.
//
// Single source of truth that feeds BOTH the desktop icons and the File Explorer
// window. It is immutable: visitors browse, open and rearrange desktop icons, but
// cannot create/rename/delete/move entries.
//
// Node shape:
//   {
//     id,                 // unique within its sibling set; a path is an array of ids
//     type,               // 'app' | 'folder'
//     name?,              // literal display name; takes precedence over labelKey
//     labelKey?,          // i18n key for the display name
//     icon,               // FontAwesome icon name (must be registered in main.js)
//     descKey,            // i18n key for the right-click info card description
//     desktop?,           // true = also shown as a desktop icon (curated subset)
//     app?,               // type 'app': windowConfig key to openApp()
//     children?,          // type 'folder' (icon-grid folder): child nodes
//     component?,         // type 'folder' (embedded folder): component rendered in the
//                         //   Explorer main pane instead of an icon grid
//     componentProps?,    // props bound to the embedded component
//   }

import { defineAsyncComponent } from "vue";
import { minigames } from "./minigames";

const lazy = (loader) => defineAsyncComponent(loader);

const gameDesc = {
  miniGame: "descSolitaire",
  minesweeper: "descMinesweeper",
  tetris: "descTetris",
  flappyRick: "descFlappy",
};

// Games are owned by src/minigames.js; mirror them into folder children here so
// there is no duplicated game metadata.
const gameNodes = minigames.map((g) => ({
  id: g.name,
  type: "app",
  app: g.name,
  labelKey: g.labelKey,
  icon: g.icon,
  descKey: gameDesc[g.name] || "descApp",
}));

export const vfsRoot = {
  id: "root",
  type: "folder",
  labelKey: "desktopRoot",
  icon: "house",
  descKey: "descDesktop",
  children: [
    // Apps (the curated ones are flagged desktop:true and also appear on the bureaublad).
    { id: "aboutMe",      type: "app", app: "aboutMe",      labelKey: "aboutMe",      icon: "user",       descKey: "descAboutMe",      desktop: true },
    { id: "contact",      type: "app", app: "contact",      labelKey: "contact",      icon: "envelope",   descKey: "descContact",      desktop: true },
    { id: "newsletter",   type: "app", app: "newsletter",   labelKey: "newsletter",   icon: "bell",       descKey: "descNewsletter",   desktop: true },
    { id: "mudaDigitaal", type: "app", app: "mudaDigitaal", labelKey: "mudaDigitaal", icon: "terminal",   descKey: "descTerminal",     desktop: true },
    { id: "skillTree",    type: "app", app: "skillTree",    labelKey: "skillTree",    icon: "sitemap",    descKey: "descSkillTree",    desktop: true },
    { id: "paint",        type: "app", app: "paint",        labelKey: "paint",        icon: "paintbrush", descKey: "descPaint",        desktop: true },
    { id: "achievements", type: "app", app: "achievements", labelKey: "achievements", icon: "trophy",     descKey: "descAchievements", desktop: true },
    { id: "settings",     type: "app", app: "settings",     labelKey: "settings",     icon: "cog",        descKey: "descSettings",     desktop: true },

    // Single launcher for the vinyl player (keeps its existing window behavior).
    { id: "vinylCollection", type: "app", app: "vinylCollection", labelKey: "vinylCollection", icon: "compact-disc", descKey: "descVinyl" },

    // Browsable folders (embedded views in the Explorer main pane).
    {
      id: "projects", type: "folder", labelKey: "projects", icon: "code", descKey: "descProjects", desktop: true,
      component: lazy(() => import("./components/windows/Projects.vue")),
    },
    {
      id: "pictures", type: "folder", labelKey: "fsPictures", icon: "images", descKey: "descPictures",
      children: [
        {
          id: "art", type: "folder", labelKey: "fsArt", icon: "palette", descKey: "descArt",
          component: lazy(() => import("./components/windows/PicturesGallery.vue")),
          componentProps: { source: "art" },
        },
        {
          id: "projectPhotos", type: "folder", labelKey: "fsProjectPhotos", icon: "photo-film", descKey: "descProjectPhotos",
          component: lazy(() => import("./components/windows/PicturesGallery.vue")),
          componentProps: { source: "projects" },
        },
      ],
    },
    {
      id: "downloads", type: "folder", labelKey: "downloads", icon: "download", descKey: "descDownloads",
      component: lazy(() => import("./components/windows/Downloads.vue")),
    },

    // Plain icon-grid folder (also pinned to the desktop).
    { id: "minigames", type: "folder", labelKey: "minigames", icon: "gamepad", descKey: "descMinigames", desktop: true, children: gameNodes },

    // Recycle bin: scrapped / back-burner projects, shown with the projects detail view.
    {
      id: "recycleBin", type: "folder", labelKey: "recycleBin", icon: "trash-can", descKey: "descRecycleBin", desktop: true,
      component: lazy(() => import("./components/windows/Projects.vue")),
      componentProps: { variant: "recycle" },
    },
  ],
};

// All root-level nodes (Explorer top level).
export function getRootNodes() {
  return vfsRoot.children;
}

// Curated subset shown as desktop icons.
export function getDesktopNodes() {
  return vfsRoot.children.filter((n) => n.desktop);
}

// Walk from the root following an array of ids; return the node or null.
export function resolvePath(pathIds) {
  let node = vfsRoot;
  for (const id of pathIds || []) {
    if (!node || !node.children) return null;
    node = node.children.find((c) => c.id === id) || null;
  }
  return node;
}

// Children of the folder at pathIds (empty array if it is not an icon-grid folder).
export function listChildren(pathIds) {
  const node = resolvePath(pathIds);
  return node && node.children ? node.children : [];
}

// Depth-first lookup by id (ids are globally unique in this tree).
export function findNodeById(id, node = vfsRoot) {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(id, child);
      if (found) return found;
    }
  }
  return null;
}

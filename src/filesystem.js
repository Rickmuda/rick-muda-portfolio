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
    // Browsable folders (embedded views in the Explorer main pane).
    {
      id: "projects", type: "folder", labelKey: "projects", icon: "code", descKey: "descProjects", desktop: true,
      component: lazy(() => import("./components/windows/Projects.vue")),
    },

    // Plain icon-grid folder grouping the individual apps that used to sit
    // flat at the Explorer root. Each still carries desktop:true, so they
    // still appear as their own desktop/mobile icons (see the recursive walk
    // in getDesktopNodes() below) - this folder only tidies up File Explorer.
    {
      id: "applications", type: "folder", labelKey: "applications", icon: "table-cells-large", descKey: "descApplications",
      children: [
        { id: "aboutMe",      type: "app", app: "aboutMe",      labelKey: "aboutMe",      icon: "user",       descKey: "descAboutMe",      desktop: true },
        { id: "contact",      type: "app", app: "contact",      labelKey: "contact",      icon: "envelope",   descKey: "descContact",      desktop: true },
        { id: "newsletter",   type: "app", app: "newsletter",   labelKey: "newsletter",   icon: "bell",       descKey: "descNewsletter",   desktop: true },
        { id: "skillTree",    type: "app", app: "skillTree",    labelKey: "skillTree",    icon: "sitemap",    descKey: "descSkillTree",    desktop: true },
        { id: "paint",        type: "app", app: "paint",        labelKey: "paint",        icon: "paintbrush", descKey: "descPaint",        desktop: true },
        { id: "mudaDigitaal", type: "app", app: "mudaDigitaal", labelKey: "mudaDigitaal", icon: "terminal",   descKey: "descTerminal",     desktop: true },
        { id: "achievements", type: "app", app: "achievements", labelKey: "achievements", icon: "trophy",     descKey: "descAchievements", desktop: true },
        { id: "settings",     type: "app", app: "settings",     labelKey: "settings",     icon: "cog",        descKey: "descSettings",     desktop: true },
      ],
    },

    // Same 8 apps as above, also surfaced flat at the Explorer root so
    // "Desktop" mirrors what visitors actually see on the desktop (not just
    // inside "Applications"). Distinct ids (Desktop-suffixed) keep them from
    // colliding with the "applications" copies, which are the ones that carry
    // desktop:true and drive the real desktop/mobile icons - these flat copies
    // deliberately don't, so an app doesn't end up with two desktop icons.
    { id: "aboutMeDesktop",      type: "app", app: "aboutMe",      labelKey: "aboutMe",      icon: "user",       descKey: "descAboutMe" },
    { id: "contactDesktop",      type: "app", app: "contact",      labelKey: "contact",      icon: "envelope",   descKey: "descContact" },
    { id: "newsletterDesktop",   type: "app", app: "newsletter",   labelKey: "newsletter",   icon: "bell",       descKey: "descNewsletter" },
    { id: "skillTreeDesktop",    type: "app", app: "skillTree",    labelKey: "skillTree",    icon: "sitemap",    descKey: "descSkillTree" },
    { id: "paintDesktop",        type: "app", app: "paint",        labelKey: "paint",        icon: "paintbrush", descKey: "descPaint" },
    { id: "mudaDigitaalDesktop", type: "app", app: "mudaDigitaal", labelKey: "mudaDigitaal", icon: "terminal",   descKey: "descTerminal" },
    { id: "achievementsDesktop", type: "app", app: "achievements", labelKey: "achievements", icon: "trophy",     descKey: "descAchievements" },
    { id: "settingsDesktop",     type: "app", app: "settings",     labelKey: "settings",     icon: "cog",        descKey: "descSettings" },

    // Plain icon-grid folder (also pinned to the desktop).
    { id: "minigames", type: "folder", labelKey: "minigames", icon: "gamepad", descKey: "descMinigames", desktop: true, children: gameNodes },

    // Single launcher for the vinyl player (keeps its existing window behavior).
    { id: "vinylCollection", type: "app", app: "vinylCollection", labelKey: "vinylCollection", icon: "compact-disc", descKey: "descVinyl" },

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

// Curated subset shown as desktop icons - walks the whole tree (not just the
// top level) so desktop:true nodes nested inside a folder (e.g. the apps
// grouped under "applications" for File Explorer) still surface here, in
// tree order.
function collectDesktopNodes(node, acc) {
  for (const child of node.children || []) {
    if (child.desktop) acc.push(child);
    collectDesktopNodes(child, acc);
  }
  return acc;
}

export function getDesktopNodes() {
  return collectDesktopNodes(vfsRoot, []);
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

// Stable identity for a node, used by the desktop-icon customization feature
// (src/desktopIcons.js) to dedupe the intentional flat/nested duplicate app
// nodes (e.g. "aboutMe" vs "aboutMeDesktop" both identify as "aboutMe") -
// apps are identified by which window they open, folders by their own id.
export function identityOf(node) {
  return node.type === "app" ? node.app : node.id;
}

// Identities of the curated default desktop set - single source of truth so
// desktopIcons.js and every component agree on what counts as "default"
// without each recomputing (and potentially drifting from) their own copy.
export function getDefaultDesktopIdentities() {
  return new Set(getDesktopNodes().map(identityOf));
}

// First node (tree order) whose identityOf() matches. Used to resolve a
// user-added desktop identity back into a renderable node.
export function findNodeByIdentity(identity, nodes = vfsRoot.children) {
  for (const node of nodes) {
    if (identityOf(node) === identity) return node;
    if (node.children) {
      const found = findNodeByIdentity(identity, node.children);
      if (found) return found;
    }
  }
  return null;
}

// Ids-path from root to the node with the given id, matching resolvePath()'s
// convention (relative to vfsRoot.children, never includes the synthetic
// "root" id). Unlike a flat [id] lookup, this works for nodes at any depth.
export function findNodePath(id, nodes = vfsRoot.children, trail = []) {
  for (const node of nodes) {
    const nextTrail = [...trail, node.id];
    if (node.id === id) return nextTrail;
    if (node.children) {
      const found = findNodePath(id, node.children, nextTrail);
      if (found) return found;
    }
  }
  return null;
}

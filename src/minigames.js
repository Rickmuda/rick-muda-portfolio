// Shared list of minigames shown inside the Minigames folder (iOS-style folder
// overlay on both desktop and mobile). Each game must also have a windowConfig
// entry so it opens via openApp(name). Add new games here.
export const minigames = [
  { name: "miniGame", icon: "clone", labelKey: "solitaire" },
  { name: "minesweeper", icon: "bomb", labelKey: "minesweeper" },
  { name: "tetris", icon: "shapes", labelKey: "tetris" },
  { name: "flappyRick", icon: "dove", labelKey: "flappyRick" },
  { name: "scoreboards", icon: "ranking-star", labelKey: "scoreboards" },
];

// Folder descriptor consumed by the desktop icon, the taskbar launcher and the
// mobile home launcher so every surface opens the exact same folder overlay.
export const minigamesFolder = {
  name: "minigames",
  icon: "folder",
  labelKey: "minigames",
  items: minigames,
};

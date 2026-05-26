// Shared list of minigames shown inside the Minigames folder (desktop window
// + mobile folder overlay). Each game must also have a windowConfig entry so it
// opens via openApp(name). Add new games here.
export const minigames = [
  { name: "miniGame", icon: "clone", labelKey: "solitaire" },
  { name: "minesweeper", icon: "bomb", labelKey: "minesweeper" },
  { name: "flappyRick", icon: "dove", labelKey: "flappyRick" },
];

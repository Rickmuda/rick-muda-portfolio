// Shared list of minigames shown inside the Minigames folder (desktop window
// + mobile folder overlay). Each game must also have a windowConfig entry so it
// opens via openApp(name). Add new games here.
export const minigames = [
  { name: "miniGame", icon: "clone", labelKey: "solitaire" },
  // Not built yet: shown greyed-out / "coming soon" and not openable.
  { name: "doom", icon: "skull", labelKey: "doom", comingSoon: true },
  { name: "flappyRick", icon: "dove", labelKey: "flappyRick", comingSoon: true },
];

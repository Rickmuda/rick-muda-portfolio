// Default wallpaper presets, bundled with the site. src/wallpapers.js reads
// them through src/contentStore.js, which the admin panel can override.
//
// Each wallpaper is either an image (`image`, optional `darkImage`) or a CSS
// gradient (`css`, optional `darkCss`); the dark variant is used in dark mode.

export const wallpapers = [
  { id: "default",  labelKey: "wpDefault",  image: "bundled:art/room.webp", darkImage: "bundled:art/roomdark.webp" },
  { id: "aurora",   labelKey: "wpAurora",   css: "linear-gradient(135deg, #1a1a3e 0%, #4a2c7a 55%, #c43c8a 100%)", darkCss: "linear-gradient(135deg, #0a0a1d 0%, #1f1238 55%, #5a1c40 100%)" },
  { id: "sunset",   labelKey: "wpSunset",   css: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)",              darkCss: "linear-gradient(135deg, #4a2218 0%, #5a3a26 100%)" },
  { id: "ocean",    labelKey: "wpOcean",    css: "linear-gradient(135deg, #2e3192 0%, #1bffff 100%)",              darkCss: "linear-gradient(135deg, #0c0e3a 0%, #0a4f5a 100%)" },
  { id: "forest",   labelKey: "wpForest",   css: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",              darkCss: "linear-gradient(135deg, #061f26 0%, #1f3d2a 100%)" },
  { id: "midnight", labelKey: "wpMidnight", css: "linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)", darkCss: "linear-gradient(135deg, #050414 0%, #16142e 55%, #0f0f1c 100%)" },
];

export const defaultWallpaperId = "default";

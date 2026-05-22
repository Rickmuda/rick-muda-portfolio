import AboutMe from "./components/windows/AboutMe.vue";
import Projects from "./components/windows/Projects.vue";
import Contact from "./components/windows/Contact.vue";
import ArtGallery from "./components/windows/ArtGallery.vue";
import MiniGame from "./components/windows/MiniGame.vue";
import Settings from "./components/windows/Settings.vue";
import OldVideo from "./components/windows/OldVideo.vue";
import VinylCollection from "./components/windows/VinylCollection.vue";
import SkillTree from "./components/windows/SkillTree.vue";
import Downloads from "./components/windows/Downloads.vue";
import MinigamesFolder from "./components/windows/MinigamesFolder.vue";
import FlappyRick from "./components/windows/FlappyRick.vue";
import { minigames } from "./minigames";

export const windowConfig = {
  aboutMe: {
    component: AboutMe,
    title: "aboutMe",
    defaultWidth: 900,
    defaultHeight: 700,
    defaultX: 100,
    defaultY: 100,
  },
  projects: {
    component: Projects,
    title: "projects",
    defaultWidth: 1200,
    defaultHeight: 800,
    defaultX: 200,
    defaultY: 20,
  },
  contact: {
    component: Contact,
    title: "contact",
    defaultWidth: 850,
    defaultHeight: 650,
    defaultX: 300,
    defaultY: 200,
  },
  artGallery: {
    component: ArtGallery,
    title: "artGallery",
    defaultWidth: 1000,
    defaultHeight: 800,
    defaultX: 500,
    defaultY: 20,
  },
  miniGame: {
    component: MiniGame,
    title: "solitaire",
    defaultWidth: 1000,
    defaultHeight: 700,
    defaultX: 600,
    defaultY: 100,
  },
  oldVideo: {
    component: OldVideo,
    title: "Easter Egg",
    defaultWidth: 800,
    defaultHeight: 600,
    defaultX: 300,
    defaultY: 200,
  },
  vinylCollection: {
    component: VinylCollection,
    title: "vinylCollection",
    defaultWidth: 900,
    defaultHeight: 700,
    defaultX: 220,
    defaultY: 60,
  },
  skillTree: {
    component: SkillTree,
    title: "skillTree",
    defaultWidth: 1100,
    defaultHeight: 750,
    defaultX: 150,
    defaultY: 40,
  },
  downloads: {
    component: Downloads,
    title: "downloads",
    defaultWidth: 1000,
    defaultHeight: 720,
    defaultX: 260,
    defaultY: 50,
  },
  settings: {
    component: Settings,
    title: "settings",
    defaultWidth: 700,
    defaultHeight: 600,
    defaultX: 300,
    defaultY: 150,
  },
  minigames: {
    component: MinigamesFolder,
    title: "minigames",
    defaultWidth: 720,
    defaultHeight: 520,
    defaultX: 320,
    defaultY: 90,
  },
  flappyRick: {
    component: FlappyRick,
    title: "flappyRick",
    defaultWidth: 480,
    defaultHeight: 720,
    defaultX: 360,
    defaultY: 40,
  },
};

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
  { name: "settings",        icon: "cog",          labelKey: "settings" },
];
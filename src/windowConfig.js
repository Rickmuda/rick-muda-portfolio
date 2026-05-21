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
    title: "miniGame",
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
};
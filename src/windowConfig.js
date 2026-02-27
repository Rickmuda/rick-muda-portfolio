import AboutMe from "./components/windows/AboutMe.vue";
import Projects from "./components/windows/Projects.vue";
import Contact from "./components/windows/Contact.vue";
import Socials from "./components/windows/Socials.vue";
import ArtGallery from "./components/windows/ArtGallery.vue";
import MiniGame from "./components/windows/MiniGame.vue";
import OldVideo from "./components/windows/OldVideo.vue";
import Certificates from "./components/windows/Certificates.vue";

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
    defaultWidth: 600,
    defaultHeight: 500,
    defaultX: 300,
    defaultY: 200,
  },
  socials: {
    component: Socials,
    title: "socials",
    defaultWidth: 800,
    defaultHeight: 600,
    defaultX: 400,
    defaultY: 250,
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
  certificates: {
    component: Certificates,
    title: "certificates",
    defaultWidth: 1100,
    defaultHeight: 600,
    defaultX: 150,
    defaultY: 50,
  },
  oldVideo: {
    component: OldVideo,
    title: "Easter Egg",
    defaultWidth: 800,
    defaultHeight: 600,
    defaultX: 300,
    defaultY: 200,
  },
};
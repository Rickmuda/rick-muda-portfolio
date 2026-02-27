import AboutMe from "./components/windows/AboutMe.vue";
import Projects from "./components/windows/Projects.vue";
import Contact from "./components/windows/Contact.vue";
import ArtGallery from "./components/windows/ArtGallery.vue";
import MiniGame from "./components/windows/MiniGame.vue";
import Settings from "./components/windows/Settings.vue";
import OldVideo from "./components/windows/OldVideo.vue";
<<<<<<< Updated upstream
import Guestbook from "./components/windows/Guestbook.vue";
import Certificates from "./components/windows/Certificates.vue";
=======
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
  settings: {
    component: Settings,
    title: "settings",
    defaultWidth: 500,
    defaultHeight: 400,
    defaultX: 700,
    defaultY: 400,
  },
  guestbook: {
    component: Guestbook,
    title: "guestbook",
    defaultWidth: 800,
    defaultHeight: 750,
    defaultX: 150,
    defaultY: 50,
  },
  certificates: {
    component: Certificates,
    title: "certificates",
    defaultWidth: 1100,
    defaultHeight: 600,
    defaultX: 150,
    defaultY: 50,
  },
=======
>>>>>>> Stashed changes
  oldVideo: {
    component: OldVideo,
    title: "Easter Egg",
    defaultWidth: 800,
    defaultHeight: 600,
    defaultX: 300,
    defaultY: 200,
  },
};
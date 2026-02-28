import "./assets/main.css";
import './assets/mobile.css'
import { createApp } from "vue";
import App from "./App.vue";
import i18n from "./i18n";
import router from "./router";

// Import FontAwesome
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

// Import specific icons
import {
  faUser,
  faFolder,
  faEnvelope,
  faShareNodes,
  faGamepad,
  faPalette,
  faCog,
  faCube,
  faEgg,
  faBook,
  faCertificate,
  faWrench,
  faSun,
  faMoon,
} from "@fortawesome/free-solid-svg-icons";
import {
  faTwitter,
  faInstagram,
  faLinkedin,
  faGithub,
  faYoutube,
  faTiktok,
  faSpotify,
  faSteam,
  faCodepen,
} from "@fortawesome/free-brands-svg-icons";

// Add icons to the library
library.add(
  faUser,
  faFolder,
  faEnvelope,
  faShareNodes,
  faGamepad,
  faPalette,
  faCog,
  faCube,
  faEgg,
  faBook,
  faCertificate,
  faWrench,
  faSun,
  faMoon
);
library.add(faTwitter, faInstagram, faLinkedin, faGithub, faYoutube, faTiktok, faSpotify, faSteam, faCodepen);

const app = createApp(App);

app.use(i18n);
app.use(router);

// Register FontAwesomeIcon globally
app.component("font-awesome-icon", FontAwesomeIcon);

app.mount("#app");
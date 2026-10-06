import "./assets/main.css";
import './assets/mobile.css'
import { createApp } from "vue";
import App from "./App.vue";
import i18n from "./i18n";
import router from "./router";
import { loadContent } from "./contentStore";

// Import FontAwesome
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

// Import specific icons
import {
  faUser,
  faFolder,
  faEnvelope,
  faPalette,
  faCog,
  faEgg,
  faBook,
  faMoon,
  faCompactDisc,
  faSitemap,
  faDownload,
  faLock,
  faSignal,
  faWifi,
  faBolt,
  faBatteryFull,
  faBatteryThreeQuarters,
  faBatteryHalf,
  faBatteryQuarter,
  faBatteryEmpty,
  faBomb,
  faFlag,
  faClock,
  faImage,
  faExpand,
  faXmark,
  faShapes,
  faDove,
  faClone,
  faTerminal,
  faPaintbrush,
  faEraser,
  faRotateLeft,
  faTrash,
  faFillDrip,
  faTrophy,
  faFolderOpen,
  faFileLines,
  faCircleInfo,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faHouse,
  faTrashCan,
  faImages,
  faMagnifyingGlass,
  faPowerOff,
  faCode,
  faGamepad,
  faPhotoFilm,
  faCamera,
  faCameraRotate,
  faChevronUp,
  faBell,
  faRankingStar,
  faTableCellsLarge,
  faPlus,
  faEye,
  faEyeSlash,
  faPen,
  faGripVertical,
  faUpload,
  faRightFromBracket,
  faFloppyDisk,
  faLink,
  faChartColumn,
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
  faXTwitter,
  faBluesky,
  faFacebook,
  faTwitch,
  faDiscord,
  faReddit,
  faSoundcloud,
  faBehance,
  faDribbble,
} from "@fortawesome/free-brands-svg-icons";

// Add icons to the library
library.add(
  faUser,
  faFolder,
  faEnvelope,
  faPalette,
  faCog,
  faEgg,
  faBook,
  faMoon,
  faCompactDisc,
  faSitemap,
  faDownload,
  faLock,
  faSignal,
  faWifi,
  faBolt,
  faBatteryFull,
  faBatteryThreeQuarters,
  faBatteryHalf,
  faBatteryQuarter,
  faBatteryEmpty,
  faBomb,
  faFlag,
  faClock,
  faImage,
  faExpand,
  faXmark,
  faShapes,
  faDove,
  faClone,
  faTerminal,
  faPaintbrush,
  faEraser,
  faRotateLeft,
  faTrash,
  faFillDrip,
  faTrophy,
  faFolderOpen,
  faFileLines,
  faCircleInfo,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faHouse,
  faTrashCan,
  faImages,
  faMagnifyingGlass,
  faPowerOff,
  faCode,
  faGamepad,
  faPhotoFilm,
  faCamera,
  faCameraRotate,
  faChevronUp,
  faBell,
  faRankingStar,
  faTableCellsLarge,
  faPlus,
  faEye,
  faEyeSlash,
  faPen,
  faGripVertical,
  faUpload,
  faRightFromBracket,
  faFloppyDisk,
  faLink,
  faChartColumn
);
library.add(faTwitter, faInstagram, faLinkedin, faGithub, faYoutube, faTiktok, faSpotify, faSteam);
// Extra brands the About Me social links can use (see socialIcons in src/aboutData.js).
library.add(faXTwitter, faBluesky, faFacebook, faTwitch, faDiscord, faReddit, faSoundcloud, faBehance, faDribbble);

const app = createApp(App);

app.use(i18n);
app.use(router);

// Register FontAwesomeIcon globally
app.component("font-awesome-icon", FontAwesomeIcon);

app.mount("#app");

// Swap in projects/photos/texts saved from the admin panel (falls back to the
// bundled defaults if there are none or the API is unreachable).
loadContent();
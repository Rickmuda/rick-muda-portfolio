<template>
  <div id="app">
    <!-- Mobile Overlay -->
    <div v-if="isMobile" class="mobile-overlay" @click="playMobileAudio">
      <div class="mobile-overlay-text">This version still has to be made but I'm a lil lazy.</div>
      <audio ref="mobileAudio" loop>
        <source :src="oopsieAudio" type="audio/mpeg">
      </audio>
    </div>

    <!-- Router View for Error Pages -->
    <router-view v-if="$route.name === 'NotFound'" />

    <!-- Main App Content -->
    <template v-else>
      <!-- Background -->
      <div class="background" :class="{ 'background-logged-in': loggedIn, 'dark-mode': darkMode }">
        <!-- Login Screen -->
        <LoginScreen v-if="!loggedIn" @login="checkLoginState" />

        <!-- Desktop -->
        <Desktop v-else :openApp="openApp" :easterEggApps="easterEggApps" />
      </div>

      <!-- Taskbar -->
      <Taskbar
        v-if="loggedIn"
        :openApp="openApp"
        :commitSummary="commitSummary"
        :commitDescription="commitDescription"
        :easterEggApps="easterEggApps"
        :easterEggTriggered="easterEggTriggered" 
      />

      <!-- Dynamic App Windows -->
      <AppWindow
        v-for="window in openWindows"
        :key="window"
        v-show="!minimizedWindows[window]"
        :title="$t(windowConfig[window].title)"
        :defaultWidth="windowConfig[window].defaultWidth"
        :defaultHeight="windowConfig[window].defaultHeight"
        :defaultX="windowConfig[window].defaultX"
        :defaultY="windowConfig[window].defaultY"
        :zIndex="windowZIndices[window]" 
        @close="closeApp(window)"
        @bringToFront="bringWindowToFront(window)" 
      >
        <component
          :is="windowConfig[window].component"
          v-bind="getWindowProps(window)"
        />
      </AppWindow>

      <!-- Under Development Modal -->
      <UnderDevelopment 
        v-if="showUnderDevelopment" 
        @close="closeUnderDevelopment" 
      />
    </template>
  </div>
</template>

<script>
import LoginScreen from "./components/LoginScreen.vue";
import Desktop from "./components/Desktop.vue";
import Taskbar from "./components/Taskbar.vue";
import AppWindow from "./components/AppWindow.vue";
import UnderDevelopment from "./components/UnderDevelopment.vue";
import { windowConfig } from "./windowConfig";

export default {
  name: 'App',
  components: {
    LoginScreen,
    Desktop,
    Taskbar,
    AppWindow,
    UnderDevelopment,
  },
  data() {
    return {
      loggedIn: false,
      openWindows: [],
      darkMode: false,
      currentLanguage: "en",
      currentDate: new Date().toLocaleDateString(),
      commitSummary: __COMMIT_SUMMARY__,
      commitDescription: __COMMIT_DESCRIPTION__,
      zIndexCounter: 10,
      windowZIndices: {},
      konamiCode: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"],
      currentInput: [],
      easterEggTriggered: false,
      keydownListenerAdded: false,
      easterEggApps: [],
      guestbookEntries: [],
      guestbookLoading: true,
      guestbookError: null,
      showUnderDevelopment: false,
      unfinishedApps: ['threeDPrinting'],
      isMobile: false,
      oopsieAudio: new URL('@/assets/sounds/oopsie.mp3', import.meta.url).href,
    };
  },
  computed: {
    windowConfig() {
      return windowConfig;
    },
  },
  methods: {
    openApp(appName) {
      if (this.unfinishedApps.includes(appName)) {
        this.showUnderDevelopment = true;
        return;
      }

      if (this.openWindows.includes(appName)) {
        this.closeApp(appName);
        return;
      }

      this.openWindows.push(appName);
      this.windowZIndices[appName] = this.zIndexCounter++;
    },
    closeApp(appName) {
      this.openWindows = this.openWindows.filter(window => window !== appName);
      delete this.windowZIndices[appName];
    },
    checkLoginState() {
      this.loggedIn = true;
    },
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
    },
    setDarkModeBasedOnTime() {
      const currentHour = new Date().getHours();
      this.darkMode = currentHour >= 18 || currentHour < 6;
    },
    bringWindowToFront(appName) {
      this.windowZIndices[appName] = this.zIndexCounter++;
    },
    getWindowProps(windowName) {
      if (windowName === "settings") {
        return {
          darkMode: this.darkMode,
          currentLanguage: this.currentLanguage,
          "onUpdate:darkMode": (value) => (this.darkMode = value),
          "onUpdate:currentLanguage": (value) => (this.currentLanguage = value),
        };
      }
      if (windowName === "guestbook") {
        return {
          entries: this.guestbookEntries,
          isLoading: this.guestbookLoading,
          error: this.guestbookError,
          onEntryAdded: this.fetchGuestbookEntries
        };
      }
      return windowConfig[windowName]?.props || {};
    },
    handleKeydown(event) {
      if (this.easterEggTriggered) return;

      this.currentInput.push(event.key);
      if (this.currentInput.length > this.konamiCode.length) {
        this.currentInput.shift();
      }
      if (this.currentInput.join("") === this.konamiCode.join("")) {
        this.triggerEasterEgg();
      }
    },
    triggerEasterEgg() {
      if (this.easterEggTriggered) return;

      this.easterEggTriggered = true;
      if (!this.easterEggApps.includes("oldVideo")) {
        this.easterEggApps.push("oldVideo");
      }
    },
    async fetchGuestbookEntries() {
      try {
        const baseUrl = import.meta.env.VITE_API_URL;
        if (baseUrl) {
          const response = await fetch(`${baseUrl}/guestbook`);
          if (!response.ok) throw new Error('Failed to fetch entries');
          this.guestbookEntries = await response.json();
        } else {
          const saved = localStorage.getItem('guestbookEntries');
          this.guestbookEntries = saved ? JSON.parse(saved) : [];
        }
      } catch (error) {
        console.error('Error fetching guestbook entries:', error);
        const saved = localStorage.getItem('guestbookEntries');
        this.guestbookEntries = saved ? JSON.parse(saved) : [];
        this.guestbookError = error.message;
      } finally {
        this.guestbookLoading = false;
      }
    },
    closeUnderDevelopment() {
      this.showUnderDevelopment = false;
    },
    checkMobile() {
      this.isMobile = window.innerWidth <= 768;
      if (this.isMobile && this.$refs.mobileAudio) {
        this.$refs.mobileAudio.play().catch(() => {});
      } else if (!this.isMobile && this.$refs.mobileAudio) {
        this.$refs.mobileAudio.pause();
        this.$refs.mobileAudio.currentTime = 0;
      }
    },
    playMobileAudio() {
      if (this.$refs.mobileAudio) {
        this.$refs.mobileAudio.play().catch(() => {});
      }
    },
    preloadProjectImages() {
      const projectImages = [
        'weather1.webp', 'weather2.webp', 'weather3.webp',
        'annoying1.webp', 'annoying2.webp', 'annoying3.webp',
        'whack1.webp', 'whack2.webp', 'whack3.webp',
        'gym-list.webp',
        'one-pager.webp',
        'snackbar-podcast.webp',
        'undertale-sudoku.webp',
        'longvideotheater.webp',
        'dungeon and music.webp',
        'portfolio1.webp', 'portfolio2.webp', 'portfolio3.webp',
        'quiet1.webp', 'quiet2.webp', 'quiet3.webp'
      ];
      projectImages.forEach(filename => {
        const img = new Image();
        img.src = new URL(`./assets/img/projects/${filename}`, import.meta.url).href;
      });

      // Preload gallery images
      const galleryImages = [
        'dance.gif', 'fnf.webp', 'panels.webp', 'pepe.webp', 'pose.webp',
        'room.webp', 'roomdark.webp', 'swag.webp', 'vtuber.webp'
      ];
      galleryImages.forEach(filename => {
        const img = new Image();
        img.src = new URL(`./assets/img/imggallery/${filename}`, import.meta.url).href;
      });

      // Preload profile picture
      const pfp = new Image();
      pfp.src = new URL('./assets/img/self-image-1.webp', import.meta.url).href;

      // Preload certificate images
      const certImages = ['rattickling.webp', 'dudeism.webp'];
      certImages.forEach(filename => {
        const img = new Image();
        img.src = new URL(`./assets/img/certificates/${filename}`, import.meta.url).href;
      });
    },
  },
  async mounted() {
    this.checkMobile();
    this.preloadProjectImages();
    window.addEventListener('resize', this.checkMobile);

    const savedLanguage = localStorage.getItem("portfolio-language");
    if (savedLanguage) {
      this.updateLanguage(savedLanguage);
    }

    this.setDarkModeBasedOnTime();

    setInterval(() => {
      this.setDarkModeBasedOnTime();
    }, 43200000);

    if (!this.keydownListenerAdded) {
      window.addEventListener("keydown", this.handleKeydown);
      this.keydownListenerAdded = true;
    }

    await this.fetchGuestbookEntries();
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile);
    if (this.keydownListenerAdded) {
      window.removeEventListener("keydown", this.handleKeydown);
      this.keydownListenerAdded = false;
    }
  },
};
</script>

<style scoped>
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.mobile-overlay-text {
  color: #fff;
  font-size: clamp(16px, 5vw, 24px);
  font-weight: bold;
  text-align: center;
  line-height: 1.5;
  max-width: 90%;
  margin: 0 auto;
}
</style>
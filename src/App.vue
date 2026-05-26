<template>
  <div id="app">
    <!-- Router View for Error Pages -->
    <router-view v-if="$route.name === 'NotFound'" />

    <!-- Main App Content -->
    <template v-else>
      <!-- Background -->
      <div class="background" :class="{ 'dark-mode': darkMode }">
        <!-- Mobile: phone-style launcher. Desktop: OS metaphor. -->
        <MobileHome v-if="isMobile" :openApp="openApp" :apps="mobileApps" />
        <Desktop v-else :openApp="openApp" :easterEggApps="easterEggApps" />
      </div>

      <!-- Taskbar: desktop only -->
      <Taskbar
        v-if="!isMobile"
        :openApp="openApp"
        :commitSummary="commitSummary"
        :commitDescription="commitDescription"
        :easterEggApps="easterEggApps"
        :easterEggTriggered="easterEggTriggered"
        :darkMode="darkMode"
        :currentLanguage="currentLanguage"
        :openWindows="openWindows"
        :minimizedWindows="minimizedWindows"
        @toggle-dark-mode="toggleDarkMode"
        @update-language="updateLanguage"
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
        :isMobile="isMobile"
        @close="closeApp(window)"
        @minimize="minimizeApp(window)"
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
import Desktop from "./components/Desktop.vue";
import MobileHome from "./components/MobileHome.vue";
import Taskbar from "./components/Taskbar.vue";
import AppWindow from "./components/AppWindow.vue";
import UnderDevelopment from "./components/UnderDevelopment.vue";
import { windowConfig, appList } from "./windowConfig";

export default {
  name: 'App',
  components: {
    Desktop,
    MobileHome,
    Taskbar,
    AppWindow,
    UnderDevelopment,
  },
  data() {
    return {
      openWindows: [],
      minimizedWindows: {},
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
      showUnderDevelopment: false,
      unfinishedApps: ['threeDPrinting'],
      isMobile: false,
    };
  },
  computed: {
    windowConfig() {
      return windowConfig;
    },
    mobileApps() {
      const eggs = this.easterEggApps.map((name) => ({
        name,
        icon: "egg",
        labelKey: "easterEgg",
      }));
      return [...appList, ...eggs];
    },
  },
  methods: {
    openApp(appName) {
      if (this.unfinishedApps.includes(appName)) {
        this.showUnderDevelopment = true;
        return;
      }

      if (this.openWindows.includes(appName)) {
        if (this.minimizedWindows[appName]) {
          this.minimizedWindows = { ...this.minimizedWindows, [appName]: false };
          this.bringWindowToFront(appName);
        } else {
          this.minimizeApp(appName);
        }
        return;
      }

      this.openWindows.push(appName);
      this.windowZIndices[appName] = this.zIndexCounter++;
    },
    closeApp(appName) {
      this.openWindows = this.openWindows.filter(window => window !== appName);
      delete this.windowZIndices[appName];
    },
    minimizeApp(appName) {
      this.minimizedWindows = { ...this.minimizedWindows, [appName]: true };
    },
    // Removed login logic
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
      if (windowName === "minigames") {
        return { openApp: this.openApp };
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
    closeUnderDevelopment() {
      this.showUnderDevelopment = false;
    },
    checkMobile() {
      this.isMobile = window.innerWidth <= 768;
    },
    updateLanguage(lang) {
      this.currentLanguage = lang;
      this.$i18n.locale = lang;
    },
  },
  async mounted() {
    this.checkMobile();
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


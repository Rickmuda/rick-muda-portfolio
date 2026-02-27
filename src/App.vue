<template>
  <div id="app">
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
        :openWindows="openWindows"
        :activeWindow="activeWindow"
        :darkMode="darkMode"
        :currentLanguage="currentLanguage"
        @update:darkMode="toggleDarkMode"
        @update:currentLanguage="updateLanguage"
        :commitSummary="commitSummary"
        :commitDescription="commitDescription"
        :easterEggApps="easterEggApps"
        :easterEggTriggered="easterEggTriggered" 
      />

      <!-- Dynamic App Windows -->
      <AppWindow
        v-for="window in visibleWindows"
        :key="window"
        :title="$t(windowConfig[window].title)"
        :defaultWidth="windowConfig[window].defaultWidth"
        :defaultHeight="windowConfig[window].defaultHeight"
        :defaultX="windowConfig[window].defaultX"
        :defaultY="windowConfig[window].defaultY"
        :zIndex="windowZIndices[window]" 
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
      activeWindow: "",
      windowZIndices: {},
      minimizedWindows: {},
      konamiCode: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"],
      currentInput: [],
      easterEggTriggered: false,
      keydownListenerAdded: false,
      easterEggApps: [],
      showUnderDevelopment: false,
      unfinishedApps: ['threeDPrinting'],
    };
  },
  computed: {
    windowConfig() {
      return windowConfig;
    },
    visibleWindows() {
      return this.openWindows.filter((windowName) => !this.minimizedWindows[windowName]);
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
          this.minimizedWindows[appName] = false;
        }
        this.bringWindowToFront(appName);
        return;
      }

      this.openWindows.push(appName);
      this.windowZIndices[appName] = this.zIndexCounter++;
      this.activeWindow = appName;
    },
    closeApp(appName) {
      this.openWindows = this.openWindows.filter(window => window !== appName);
      delete this.windowZIndices[appName];
      delete this.minimizedWindows[appName];
      this.activeWindow = this.openWindows.length ? this.openWindows[this.openWindows.length - 1] : "";
    },
    minimizeApp(appName) {
      this.minimizedWindows[appName] = true;
      if (this.activeWindow === appName) {
        const nextVisible = this.visibleWindows.filter((name) => name !== appName);
        this.activeWindow = nextVisible.length ? nextVisible[nextVisible.length - 1] : "";
      }
    },
    checkLoginState() {
      this.loggedIn = true;
    },
    toggleDarkMode(value) {
      this.darkMode = typeof value === "boolean" ? value : !this.darkMode;
      localStorage.setItem("portfolio-dark-mode", JSON.stringify(this.darkMode));
    },
    setDarkModeBasedOnTime() {
      const savedDarkMode = localStorage.getItem("portfolio-dark-mode");
      if (savedDarkMode !== null) {
        this.darkMode = JSON.parse(savedDarkMode);
        return;
      }
      const currentHour = new Date().getHours();
      this.darkMode = currentHour >= 18 || currentHour < 6;
    },
    updateLanguage(language) {
      this.currentLanguage = language;
      this.$i18n.locale = language;
      localStorage.setItem("portfolio-language", language);
    },
    bringWindowToFront(appName) {
      if (this.minimizedWindows[appName]) {
        this.minimizedWindows[appName] = false;
      }
      this.windowZIndices[appName] = this.zIndexCounter++;
      this.activeWindow = appName;
    },
    getWindowProps(windowName) {
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
  },
  mounted() {
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
    if (this.keydownListenerAdded) {
      window.removeEventListener("keydown", this.handleKeydown);
      this.keydownListenerAdded = false;
    }
  },
};
</script>
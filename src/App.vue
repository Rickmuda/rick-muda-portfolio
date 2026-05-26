<template>
  <div id="app">
    <!-- Router View for Error Pages -->
    <router-view v-if="$route.name === 'NotFound'" />

    <!-- Main App Content -->
    <template v-else>
      <!-- Background -->
      <div
        class="background"
        :class="{ 'dark-mode': darkMode }"
        :style="{ backgroundImage: wallpaperCss }"
      >
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
        :openWindows="openWindows"
        :minimizedWindows="minimizedWindows"
        :windowThumbnails="windowThumbnails"
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
        :data-app-name="window"
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

      <!-- Boot screen (first visit per session) -->
      <BootScreen v-if="booting" @done="onBootDone" />

      <!-- Achievement unlock popup -->
      <AchievementToast />
    </template>
  </div>
</template>

<script>
import Desktop from "./components/Desktop.vue";
import MobileHome from "./components/MobileHome.vue";
import Taskbar from "./components/Taskbar.vue";
import AppWindow from "./components/AppWindow.vue";
import UnderDevelopment from "./components/UnderDevelopment.vue";
import BootScreen from "./components/BootScreen.vue";
import AchievementToast from "./components/AchievementToast.vue";
import { windowConfig, appList, preloadAllWindows } from "./windowConfig";
import { sounds } from "./sounds";
import { unlock as unlockAchievement, achievements as allAchievements } from "./achievements";
import { getCurrent as getCurrentWallpaper, onChange as onWallpaperChange } from "./wallpapers";

export default {
  name: 'App',
  components: {
    Desktop,
    MobileHome,
    Taskbar,
    AppWindow,
    UnderDevelopment,
    BootScreen,
    AchievementToast,
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
      // Mobile equivalent: swipe up/up/down/down/left/right/left/right, then two taps.
      gestureKonami: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "Tap", "Tap"],
      currentGestureInput: [],
      touchStartX: null,
      touchStartY: null,
      touchStartTime: 0,
      easterEggTriggered: false,
      keydownListenerAdded: false,
      touchListenersAdded: false,
      easterEggApps: [],
      showUnderDevelopment: false,
      unfinishedApps: ['threeDPrinting'],
      isMobile: false,
      booting: typeof sessionStorage !== "undefined" && sessionStorage.getItem("booted") !== "1",
      openedAppsEver: new Set(),
      windowThumbnails: {},
      wallpaperId: getCurrentWallpaper().id,
      wallpaperCss: getCurrentWallpaper().cssValue,
      wallpaperUnsubscribe: null,
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
      sounds.play("open");

      unlockAchievement("first-boot");
      this.openedAppsEver.add(appName);
      // Count unique non-easter-egg apps the user has opened.
      const trackable = new Set(Object.keys(windowConfig).filter((k) => k !== "oldVideo"));
      const opened = [...this.openedAppsEver].filter((a) => trackable.has(a));
      if (opened.length >= trackable.size) {
        unlockAchievement("opened-all-windows");
      }
    },
    closeApp(appName) {
      this.openWindows = this.openWindows.filter(window => window !== appName);
      delete this.windowZIndices[appName];
      sounds.play("close");
    },
    async minimizeApp(appName) {
      // Snapshot the window content for the taskbar hover preview BEFORE we
      // hide it. html2canvas is dynamically imported so it stays out of the
      // initial bundle.
      if (!this.isMobile) {
        try {
          const el = document.querySelector(`[data-app-name="${appName}"]`);
          if (el) {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(el, {
              scale: 0.25,
              backgroundColor: null,
              logging: false,
              useCORS: true,
            });
            this.windowThumbnails = {
              ...this.windowThumbnails,
              [appName]: canvas.toDataURL("image/png"),
            };
          }
        } catch (_) {
          // Snapshot failed (CORS / WebGL canvas / etc.) - skip preview.
        }
      }
      this.minimizedWindows = { ...this.minimizedWindows, [appName]: true };
      sounds.play("minimize");
    },
    onBootDone() {
      this.booting = false;
      try { sessionStorage.setItem("booted", "1"); } catch (_) {}
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
          currentWallpaperId: this.wallpaperId,
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
    handleTouchStart(event) {
      if (this.easterEggTriggered) return;
      const t = event.changedTouches && event.changedTouches[0];
      if (!t) return;
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.touchStartTime = Date.now();
    },
    handleTouchEnd(event) {
      if (this.easterEggTriggered) return;
      if (this.touchStartX == null) return;
      const t = event.changedTouches && event.changedTouches[0];
      const startX = this.touchStartX;
      const startY = this.touchStartY;
      const startTime = this.touchStartTime;
      this.touchStartX = null;
      this.touchStartY = null;
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const dt = Date.now() - startTime;
      const TAP_MAX = 10;
      const SWIPE_MIN = 30;

      let gesture = null;
      if (absX < TAP_MAX && absY < TAP_MAX && dt < 500) {
        gesture = "Tap";
      } else if (absX >= SWIPE_MIN && absX > absY) {
        gesture = dx > 0 ? "ArrowRight" : "ArrowLeft";
      } else if (absY >= SWIPE_MIN && absY > absX) {
        gesture = dy > 0 ? "ArrowDown" : "ArrowUp";
      }
      if (!gesture) return;

      this.currentGestureInput.push(gesture);
      if (this.currentGestureInput.length > this.gestureKonami.length) {
        this.currentGestureInput.shift();
      }
      if (this.currentGestureInput.join(",") === this.gestureKonami.join(",")) {
        this.triggerEasterEgg();
      }
    },
    triggerEasterEgg() {
      if (this.easterEggTriggered) return;

      this.easterEggTriggered = true;
      if (!this.easterEggApps.includes("oldVideo")) {
        this.easterEggApps.push("oldVideo");
      }
      unlockAchievement("easter-egg-found");
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

    // Warm all window chunks during idle time so the first click on any icon
    // opens instantly instead of triggering a network fetch.
    preloadAllWindows();

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
    if (!this.touchListenersAdded) {
      window.addEventListener("touchstart", this.handleTouchStart, { passive: true });
      window.addEventListener("touchend", this.handleTouchEnd, { passive: true });
      this.touchListenersAdded = true;
    }

    this.wallpaperUnsubscribe = onWallpaperChange((wp) => {
      this.wallpaperId = wp.id;
      this.wallpaperCss = wp.cssValue;
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile);
    if (this.keydownListenerAdded) {
      window.removeEventListener("keydown", this.handleKeydown);
      this.keydownListenerAdded = false;
    }
    if (this.touchListenersAdded) {
      window.removeEventListener("touchstart", this.handleTouchStart);
      window.removeEventListener("touchend", this.handleTouchEnd);
      this.touchListenersAdded = false;
    }
    if (this.wallpaperUnsubscribe) {
      this.wallpaperUnsubscribe();
      this.wallpaperUnsubscribe = null;
    }
  },
};
</script>


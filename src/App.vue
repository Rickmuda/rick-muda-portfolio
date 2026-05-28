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
        :style="{ backgroundImage: backgroundCss }"
      >
        <!-- Mobile: phone-style launcher. Desktop: OS metaphor. -->
        <MobileHome v-if="isMobile" :openApp="openApp" :apps="mobileApps" />
        <Desktop v-else :openNode="openNode" :easterEggApps="easterEggApps" />
      </div>

      <!-- Taskbar: desktop only -->
      <Taskbar
        v-if="!isMobile"
        :openApp="openApp"
        :openExplorerRoot="openExplorerRoot"
        :openNode="openNode"
        :openExplorerAt="openExplorerAt"
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
        :ref="(el) => setWindowRef(window, el)"
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
        @snap="(side) => onWindowSnap(window, side)"
        @unsnap="onWindowUnsnap(window)"
      >
        <component
          :is="windowConfig[window].component"
          v-bind="getWindowProps(window)"
        />
      </AppWindow>

      <!-- Snap chooser: Windows-style overlay on the empty half after a
           left/right snap, letting the user fill it with another open window. -->
      <div
        v-if="snapChooser && snapCandidates.length"
        class="snap-chooser"
        :style="snapChooserStyle"
        @click.self="closeSnapChooser"
      >
        <div class="snap-chooser-inner" @click.stop>
          <div class="snap-chooser-header">
            <span class="snap-chooser-title">{{ $t('snapChooserTitle') }}</span>
            <button class="snap-chooser-close" @click="closeSnapChooser" aria-label="Close">
              <font-awesome-icon icon="xmark" />
            </button>
          </div>
          <div class="snap-chooser-grid">
            <button
              v-for="cand in snapCandidates"
              :key="cand"
              class="snap-chooser-card"
              @click="pickSnapTarget(cand)"
            >
              <font-awesome-icon :icon="getAppMeta(cand).icon" class="snap-chooser-icon" />
              <span class="snap-chooser-label">{{ $t(getAppMeta(cand).labelKey) }}</span>
            </button>
          </div>
        </div>
      </div>

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
import BootScreen from "./components/BootScreen.vue";
import AchievementToast from "./components/AchievementToast.vue";
import { windowConfig, appList, preloadAllWindows } from "./windowConfig";
import { sounds } from "./sounds";
import { unlock as unlockAchievement } from "./achievements";
import { getCurrent as getCurrentWallpaper, onChange as onWallpaperChange } from "./wallpapers";

export default {
  name: 'App',
  components: {
    Desktop,
    MobileHome,
    Taskbar,
    AppWindow,
    BootScreen,
    AchievementToast,
  },
  data() {
    return {
      openWindows: [],
      minimizedWindows: {},
      darkMode: false,
      currentLanguage: "en",
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
      isMobile: false,
      booting: typeof sessionStorage !== "undefined" && sessionStorage.getItem("booted") !== "1",
      openedAppsEver: new Set(),
      windowThumbnails: {},
      wallpaper: getCurrentWallpaper(),
      wallpaperUnsubscribe: null,
      // Cached html2canvas module so minimize doesn't pay the dynamic-import cost.
      html2canvas: null,
      // Function-ref registry: maps appName -> AppWindow component instance so
      // we can drive snap on a different window than the one that emitted.
      windowRefs: {},
      // { fromApp, side } while the snap-fill overlay is visible, null otherwise.
      snapChooser: null,
      // File Explorer is single-instance; explorerPath is the folder it currently shows.
      explorerPath: [],
      // Optional selection target (project/photo) passed to the embedded folder view,
      // set by the start-menu search and cleared on any normal navigation.
      explorerSelect: null,
    };
  },
  computed: {
    windowConfig() {
      return windowConfig;
    },
    wallpaperId() {
      return this.wallpaper.id;
    },
    // Effective desktop background. Each wallpaper has an optional darkCssValue
    // variant; if missing we fall back to the light value so darkMode still
    // tracks the toggle even on wallpapers we haven't styled.
    backgroundCss() {
      return this.darkMode && this.wallpaper.darkCssValue
        ? this.wallpaper.darkCssValue
        : this.wallpaper.cssValue;
    },
    snapChooserStyle() {
      if (!this.snapChooser) return {};
      const vw = window.innerWidth;
      const vh = Math.max(window.innerHeight - 60, 300);
      const half = Math.round(vw / 2);
      // Cover the half opposite the snapped window.
      if (this.snapChooser.side === "left") {
        return { left: half + "px", top: "0px", width: half + "px", height: vh + "px" };
      }
      return { left: "0px", top: "0px", width: half + "px", height: vh + "px" };
    },
    snapCandidates() {
      if (!this.snapChooser) return [];
      return this.openWindows.filter((w) => w !== this.snapChooser.fromApp);
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
      // Count unique openable app windows the user has opened. Excluded: the easter
      // egg, the File Explorer chrome, and projects/downloads/artGallery (on desktop
      // these are embedded folders in the Explorer, not standalone windows).
      const NON_APP = new Set(["oldVideo", "fileExplorer", "projects", "downloads", "artGallery"]);
      const trackable = new Set(
        Object.keys(windowConfig).filter((k) => !NON_APP.has(k))
      );
      const opened = [...this.openedAppsEver].filter((a) => trackable.has(a));
      if (opened.length >= trackable.size) {
        unlockAchievement("opened-all-windows");
      }
    },
    // Open a window without the toggle-minimize behavior of openApp. Used when
    // navigating the (single-instance) file explorer / viewer so a second open
    // request never minimizes the window the user is looking at.
    ensureOpen(appName) {
      if (!this.openWindows.includes(appName)) {
        this.openWindows.push(appName);
        this.windowZIndices[appName] = this.zIndexCounter++;
        sounds.play("open");
        unlockAchievement("first-boot");
        return;
      }
      if (this.minimizedWindows[appName]) {
        this.minimizedWindows = { ...this.minimizedWindows, [appName]: false };
      }
      this.bringWindowToFront(appName);
    },
    // Dispatch a VFS node: the explorer icon opens the explorer at root, apps launch
    // their window, folders open in the explorer (at root level - the explorer
    // navigates deeper itself).
    openNode(node) {
      if (!node) return;
      if (node.type === "explorer") {
        this.openExplorerRoot();
      } else if (node.type === "folder") {
        this.explorerSelect = null;
        this.explorerPath = [node.id];
        this.ensureOpen("fileExplorer");
      } else if (node.type === "app") {
        this.openApp(node.app);
      }
    },
    openExplorerRoot() {
      this.explorerSelect = null;
      this.explorerPath = [];
      this.ensureOpen("fileExplorer");
    },
    // Open the explorer at a folder with a selection target for its embedded view
    // (used by the start-menu search to jump to a project or photo).
    openExplorerAt(path, selection = null) {
      const samePath =
        path.length === this.explorerPath.length &&
        path.every((id, i) => id === this.explorerPath[i]);
      if (!samePath) this.explorerPath = path;
      this.explorerSelect = selection;
      this.ensureOpen("fileExplorer");
    },
    closeApp(appName) {
      this.openWindows = this.openWindows.filter(window => window !== appName);
      delete this.windowZIndices[appName];
      delete this.windowRefs[appName];
      // Dismiss the chooser if it was anchored to the window we just closed.
      if (this.snapChooser && this.snapChooser.fromApp === appName) {
        this.snapChooser = null;
      }
      sounds.play("close");
    },
    setWindowRef(name, el) {
      // Function ref called on mount with the component instance, and on
      // unmount with null - we only care about the live instance.
      if (el) this.windowRefs[name] = el;
      else delete this.windowRefs[name];
    },
    onWindowSnap(appName, side) {
      // Only left/right open the fill chooser - max takes the whole desktop.
      if (side !== "left" && side !== "right") return;
      if (this.isMobile) return;
      const others = this.openWindows.filter((w) => w !== appName);
      if (others.length === 0) return;
      this.snapChooser = { fromApp: appName, side };
    },
    onWindowUnsnap(appName) {
      if (this.snapChooser && this.snapChooser.fromApp === appName) {
        this.snapChooser = null;
      }
    },
    closeSnapChooser() {
      this.snapChooser = null;
    },
    pickSnapTarget(appName) {
      if (!this.snapChooser) return;
      const oppositeSide = this.snapChooser.side === "left" ? "right" : "left";
      // Restore the target if it's currently minimized so the snap is visible.
      if (this.minimizedWindows[appName]) {
        this.minimizedWindows = { ...this.minimizedWindows, [appName]: false };
      }
      this.bringWindowToFront(appName);
      // Wait a tick so v-show / z-index updates apply before snap geometry runs.
      this.$nextTick(() => {
        const ref = this.windowRefs[appName];
        if (ref && typeof ref.applySnap === "function") {
          // silent: this snap is driven by the chooser itself - emitting
          // would reopen another chooser on the opposite half forever.
          ref.applySnap(oppositeSide, { silent: true });
        }
      });
      this.snapChooser = null;
    },
    getAppMeta(name) {
      const fromList = appList.find((a) => a.name === name);
      if (fromList) return fromList;
      if (this.easterEggApps.includes(name)) {
        return { name, icon: "egg", labelKey: "easterEgg" };
      }
      const cfg = windowConfig[name];
      return { name, icon: "folder", labelKey: cfg?.title || name };
    },
    minimizeApp(appName) {
      // Kick off the taskbar-preview snapshot synchronously, BEFORE hiding the
      // window. html2canvas reads the live DOM in its own microtask, which
      // runs before Vue applies display:none from v-show - so by the time the
      // user sees the window vanish, we have already captured it.
      // Crucially we do not await the snapshot: the user's click feels instant
      // and the thumbnail updates whenever the rasterization finishes.
      if (!this.isMobile && this.html2canvas) {
        try {
          const el = document.querySelector(`[data-app-name="${appName}"]`);
          if (el) {
            this.html2canvas(el, {
              scale: 0.25,
              backgroundColor: null,
              logging: false,
              useCORS: true,
            })
              .then((canvas) => {
                this.windowThumbnails = {
                  ...this.windowThumbnails,
                  [appName]: canvas.toDataURL("image/png"),
                };
              })
              .catch(() => {});
          }
        } catch (_) {}
      }
      this.minimizedWindows = { ...this.minimizedWindows, [appName]: true };
      sounds.play("minimize");
    },
    onBootDone() {
      this.booting = false;
      try { sessionStorage.setItem("booted", "1"); } catch (_) {}
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
      if (windowName === "fileExplorer") {
        return {
          path: this.explorerPath,
          openNode: this.openNode,
          selection: this.explorerSelect,
          "onUpdate:path": (value) => {
            this.explorerPath = value;
            this.explorerSelect = null; // user navigation clears any search target
          },
        };
      }
      return windowConfig[windowName]?.props || {};
    },
    handleKeydown(event) {
      if (event.key === "Escape" && this.snapChooser) {
        this.snapChooser = null;
        return;
      }
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

    // Pre-load html2canvas so the first minimize doesn't pay the dynamic
    // import cost on top of the rasterization. Schedule for idle time.
    const schedule = typeof window !== "undefined" && typeof window.requestIdleCallback === "function"
      ? (cb) => window.requestIdleCallback(cb, { timeout: 2500 })
      : (cb) => setTimeout(cb, 800);
    schedule(() => {
      import("html2canvas")
        .then((mod) => { this.html2canvas = mod.default; })
        .catch(() => {});
    });

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
      this.wallpaper = wp;
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

<style scoped>
.snap-chooser {
  position: fixed;
  z-index: 1090;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 12, 30, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: snapChooserFade 0.18s ease-out;
}

.snap-chooser-inner {
  width: min(100%, 420px);
  margin: 24px;
  padding: 18px;
  background: linear-gradient(180deg, #2a1a35, #1b1024);
  border: 2px solid #8404a1;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.snap-chooser-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.snap-chooser-title {
  font-family: 'PortfolioFont', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.snap-chooser-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease;
}

.snap-chooser-close:hover {
  background: rgba(255, 255, 255, 0.18);
}

.snap-chooser-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
}

.snap-chooser-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 8px;
  min-height: 84px;
  background: rgba(155, 32, 183, 0.18);
  border: 1px solid rgba(196, 55, 230, 0.4);
  border-radius: 10px;
  color: #fff;
  font-family: 'PortfolioFont', sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.12s ease, border-color 0.12s ease;
}

.snap-chooser-card:hover {
  background: rgba(155, 32, 183, 0.35);
  border-color: #c637e6;
  transform: translateY(-1px);
}

.snap-chooser-icon {
  font-size: 22px;
  color: #d4a8e8;
}

.snap-chooser-label {
  text-align: center;
  word-break: break-word;
}

@keyframes snapChooserFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>


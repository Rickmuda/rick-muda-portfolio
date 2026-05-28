<template>
  <div
    class="mobile-home"
    @touchstart.passive="onHomeTouchStart"
    @touchend.passive="onHomeTouchEnd"
  >
    <div class="status-bar">
      <span class="sb-time">{{ time }}</span>
      <span class="sb-icons">
        <font-awesome-icon icon="signal" />
        <font-awesome-icon icon="wifi" />
        <span class="sb-battery">
          <font-awesome-icon v-if="batteryCharging" icon="bolt" class="sb-bolt" />
          <span class="sb-battery-pct">{{ batteryPct }}%</span>
          <font-awesome-icon :icon="batteryIcon" />
        </span>
      </span>
    </div>

    <div class="home-pager" ref="pager" @scroll="onScroll">
      <div
        class="home-page"
        v-for="(page, i) in pages"
        :key="i"
      >
        <div
          class="home-icon"
          v-for="app in page"
          :key="app.name"
          @click="onIconClick(app)"
        >
          <div v-if="app.folder" class="folder-preview">
            <span
              v-for="item in app.items.slice(0, 4)"
              :key="item.name"
              class="folder-preview-icon"
            >
              <font-awesome-icon :icon="item.icon" />
            </span>
          </div>
          <div v-else class="home-icon-image">
            <font-awesome-icon :icon="app.icon" class="home-icon-inner" />
          </div>
          <div class="home-icon-text">{{ $t(app.labelKey) }}</div>
        </div>
      </div>
    </div>

    <div class="home-dots" v-if="pages.length > 1">
      <span
        v-for="(p, i) in pages"
        :key="i"
        class="home-dot"
        :class="{ active: i === activePage }"
        @click="goToPage(i)"
      ></span>
    </div>

    <!-- Swipe-up affordance: opens the app drawer (also via swipe up from the bottom). -->
    <div class="drawer-trigger" @click="openDrawer">
      <span class="drawer-trigger-pill"></span>
    </div>

    <!-- App drawer (slide-up): all apps + search (apps, projects, photos). -->
    <div class="app-drawer" :class="{ open: drawerOpen }">
      <div
        class="drawer-top"
        @touchstart.passive="onDrawerTouchStart"
        @touchend.passive="onDrawerTouchEnd"
      >
        <span class="drawer-grabber" @click="closeDrawer"></span>
        <div class="drawer-search">
          <font-awesome-icon icon="magnifying-glass" class="drawer-search-icon" />
          <input
            v-model="query"
            class="drawer-search-input"
            type="text"
            :placeholder="$t('startSearch')"
            spellcheck="false"
          />
        </div>
      </div>

      <div class="drawer-grid">
        <button
          v-for="r in results"
          :key="r.id"
          class="drawer-item"
          @click="onResult(r)"
        >
          <span class="drawer-item-icon">
            <img v-if="r.kind === 'photo'" :src="r.src" :alt="r.label" class="drawer-thumb" />
            <font-awesome-icon v-else :icon="r.icon" class="drawer-item-glyph" />
          </span>
          <span class="drawer-item-label">{{ r.label }}</span>
        </button>
        <div v-if="!results.length" class="drawer-empty">{{ $t('startNoResults') }}</div>
      </div>
    </div>

    <!-- iOS-style folder overlay (shared with the desktop) -->
    <FolderOverlay :folder="openFolderApp" @close="closeFolder" @open="openGame" />
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import FolderOverlay from "./FolderOverlay.vue";
import { projects as projectsData } from "../projectsData";
import { galleryImages } from "../galleryImages";

const APPS_PER_PAGE = 6;

export default {
  name: "MobileHome",
  components: {
    FontAwesomeIcon,
    FolderOverlay,
  },
  props: {
    openApp: {
      type: Function,
      required: true,
    },
    apps: {
      type: Array,
      required: true,
    },
    openProjectSelected: {
      type: Function,
      required: true,
    },
    openPhotoSelected: {
      type: Function,
      required: true,
    },
  },
  data() {
    return {
      activePage: 0,
      time: "",
      timeTimer: null,
      batteryPct: 100,
      batteryCharging: false,
      battery: null,
      openFolderApp: null,
      // App drawer
      drawerOpen: false,
      query: "",
      homeTouchStartX: 0,
      homeTouchStartY: 0,
      drawerTouchStartY: 0,
    };
  },
  computed: {
    pages() {
      const out = [];
      for (let i = 0; i < this.apps.length; i += APPS_PER_PAGE) {
        out.push(this.apps.slice(i, i + APPS_PER_PAGE));
      }
      return out;
    },
    // Flat list of every app (folders expanded into their items) for the drawer.
    allApps() {
      const out = [];
      for (const a of this.apps) {
        if (a.folder && a.items) out.push(...a.items);
        else out.push(a);
      }
      return out;
    },
    // Drawer contents: all apps when idle; apps + projects + photos when searching.
    results() {
      const q = this.query.trim().toLowerCase();
      if (!q) {
        return this.allApps.map((a) => ({
          kind: "app", id: "a-" + a.name, label: this.$t(a.labelKey), icon: a.icon, name: a.name,
        }));
      }
      const out = [];
      for (const a of this.allApps) {
        const label = this.$t(a.labelKey) || "";
        if (label.toLowerCase().includes(q)) {
          out.push({ kind: "app", id: "a-" + a.name, label, icon: a.icon, name: a.name });
        }
      }
      for (const p of projectsData) {
        const label = this.$t(p.titleKey);
        if (label.toLowerCase().includes(q)) {
          out.push({ kind: "project", id: "p-" + p.titleKey, label, icon: "code", titleKey: p.titleKey });
        }
      }
      for (const im of galleryImages) {
        if (im.name.toLowerCase().includes(q)) {
          out.push({ kind: "photo", id: "img-" + im.name, label: im.name, icon: "image", src: im.src });
        }
      }
      return out;
    },
    batteryIcon() {
      const p = this.batteryPct;
      if (p >= 88) return "battery-full";
      if (p >= 63) return "battery-three-quarters";
      if (p >= 38) return "battery-half";
      if (p >= 13) return "battery-quarter";
      return "battery-empty";
    },
  },
  mounted() {
    this.updateTime();
    this.timeTimer = setInterval(this.updateTime, 1000);

    if (navigator.getBattery) {
      navigator
        .getBattery()
        .then((b) => {
          this.battery = b;
          this.updateBattery();
          b.addEventListener("levelchange", this.updateBattery);
          b.addEventListener("chargingchange", this.updateBattery);
        })
        .catch(() => {});
    }
  },
  beforeUnmount() {
    clearInterval(this.timeTimer);
    if (this.battery) {
      this.battery.removeEventListener("levelchange", this.updateBattery);
      this.battery.removeEventListener("chargingchange", this.updateBattery);
    }
  },
  methods: {
    updateTime() {
      this.time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    updateBattery() {
      if (!this.battery) return;
      this.batteryPct = Math.round(this.battery.level * 100);
      this.batteryCharging = this.battery.charging;
    },
    onScroll() {
      const pager = this.$refs.pager;
      if (!pager || !pager.clientWidth) return;
      this.activePage = Math.round(pager.scrollLeft / pager.clientWidth);
    },
    goToPage(i) {
      const pager = this.$refs.pager;
      if (pager) {
        pager.scrollTo({ left: i * pager.clientWidth, behavior: "smooth" });
      }
    },
    onIconClick(app) {
      if (app.folder) {
        this.openFolder(app);
      } else {
        this.openApp(app.name);
      }
    },
    openFolder(app) {
      this.openFolderApp = app;
    },
    closeFolder() {
      this.openFolderApp = null;
    },
    openGame(name) {
      this.closeFolder();
      this.openApp(name);
    },
    // --- App drawer ---
    openDrawer() {
      this.drawerOpen = true;
    },
    closeDrawer() {
      this.drawerOpen = false;
      this.query = "";
    },
    onResult(r) {
      if (r.kind === "app") this.openApp(r.name);
      else if (r.kind === "project") this.openProjectSelected(r.titleKey);
      else if (r.kind === "photo") this.openPhotoSelected(r.src);
      // Closing the drawer reveals the home at the page the user swiped up from.
      this.closeDrawer();
    },
    onHomeTouchStart(e) {
      const t = e.changedTouches[0];
      this.homeTouchStartX = t.clientX;
      this.homeTouchStartY = t.clientY;
    },
    onHomeTouchEnd(e) {
      if (this.drawerOpen) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.homeTouchStartX;
      const dy = t.clientY - this.homeTouchStartY;
      // Open on a clear upward swipe that starts in the bottom ~40% of the screen
      // (keeps it from clashing with the konami swipe and horizontal paging).
      if (
        this.homeTouchStartY > window.innerHeight * 0.6 &&
        dy < -60 &&
        Math.abs(dy) > Math.abs(dx)
      ) {
        this.openDrawer();
      }
    },
    onDrawerTouchStart(e) {
      this.drawerTouchStartY = e.changedTouches[0].clientY;
    },
    onDrawerTouchEnd(e) {
      const dy = e.changedTouches[0].clientY - this.drawerTouchStartY;
      if (dy > 60) this.closeDrawer();
    },
  },
};
</script>

<style scoped>
.mobile-home {
  position: fixed;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
}

.status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 18px;
  padding-top: env(safe-area-inset-top, 0);
  color: #fff;
  font-size: 13px;
  font-weight: bold;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
    1px 1px 0 #000;
}

.sb-icons {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.sb-battery {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sb-battery-pct {
  font-size: 12px;
}

.home-pager {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.home-pager::-webkit-scrollbar {
  display: none;
}

.home-page {
  flex: 0 0 100%;
  width: 100%;
  scroll-snap-align: center;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 24px;
  place-items: center;
  padding: 32px 24px;
}

.home-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  max-width: 110px;
}

.home-icon-image {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: #9b20b7;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease;
}

.home-icon-image:active {
  transform: scale(0.94);
}

.home-icon-inner {
  font-size: 30px;
  color: #fff;
}

/* Folder tile: mini-grid preview of the contained app icons (iOS-style) */
.folder-preview {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 5px;
  padding: 8px;
  box-sizing: border-box;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease;
}

.folder-preview:active {
  transform: scale(0.94);
}

.folder-preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #9b20b7;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
}

.home-icon-text {
  margin-top: 8px;
  font-size: 13px;
  color: #fff;
  font-weight: bold;
  text-align: center;
  line-height: 1.2;
  word-wrap: break-word;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
    1px 1px 0 #000;
}

.home-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 0 12px;
}

.home-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.55);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  transition: width 0.2s ease, background 0.2s ease;
  cursor: pointer;
}

.home-dot.active {
  width: 24px;
  border-radius: 5px;
  background: #fff;
}

/* Swipe-up trigger pill (home indicator style) */
.drawer-trigger {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 4px 0 14px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 0));
  cursor: pointer;
}

.drawer-trigger-pill {
  width: 120px;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* App drawer */
.app-drawer {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(26, 16, 36, 0.97);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.28s ease;
}

.app-drawer.open {
  transform: translateY(0);
}

.drawer-top {
  flex-shrink: 0;
  padding: 10px 18px 12px;
  padding-top: calc(10px + env(safe-area-inset-top, 0));
}

.drawer-grabber {
  display: block;
  width: 44px;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.4);
  margin: 4px auto 14px;
  cursor: pointer;
}

.drawer-search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  padding: 10px 16px;
}

.drawer-search-icon {
  color: #d4a8e8;
}

.drawer-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-family: inherit;
  font-size: 15px;
}

.drawer-search-input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.drawer-grid {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px 8px;
  padding: 16px 18px;
  padding-bottom: calc(32px + env(safe-area-inset-bottom, 0));
  align-content: start;
}

.drawer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: #fff;
  font-family: inherit;
  cursor: pointer;
}

.drawer-item-icon {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  background: #9b20b7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
}

.drawer-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drawer-item-label {
  font-size: 12px;
  text-align: center;
  line-height: 1.15;
  word-break: break-word;
}

.drawer-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #b6a6c4;
  padding: 24px;
  font-size: 14px;
}
</style>

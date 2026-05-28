<template>
  <div class="mobile-home">
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

    <!-- iOS-style folder overlay (shared with the desktop) -->
    <FolderOverlay :folder="openFolderApp" @close="closeFolder" @open="openGame" />
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import FolderOverlay from "./FolderOverlay.vue";

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
  padding: 12px 0 24px;
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
</style>

<template>
  <div class="taskbar">
    <!-- Left spacer balances the centered icon group against the clock on the right. -->
    <div class="taskbar-spacer"></div>

    <!-- Start button + the apps that live on the desktop, centered as one group. -->
    <div class="taskbar-icons">
      <!-- Start button (styled like the app icons) -->
      <div
        class="taskbar-icon"
        :class="{ 'app-open': startMenuOpen }"
        tabindex="0"
        role="button"
        :aria-pressed="startMenuOpen"
        @click.stop="toggleStartMenu"
        @keydown.enter="toggleStartMenu"
        @keydown.space.prevent="toggleStartMenu"
        title="Start"
      >
        <img src="/src/assets/img/pfp.webp" alt="Start" class="start-img" />
      </div>

      <!-- File Explorer -->
      <div
        class="taskbar-icon"
        :class="iconState('fileExplorer')"
        tabindex="0"
        role="button"
        :aria-pressed="openWindows.includes('fileExplorer')"
        @click="openExplorerRoot"
        @keydown.enter="openExplorerRoot"
        @keydown.space.prevent="openExplorerRoot"
        @mouseenter="onIconEnter('fileExplorer', $event)"
        @mouseleave="onIconLeave"
        title="File Explorer"
      >
        <font-awesome-icon icon="folder-open" />
        <span v-if="openWindows.includes('fileExplorer')" class="taskbar-indicator" :class="{ minimized: minimizedWindows['fileExplorer'] }"></span>
      </div>

      <!-- Pinned apps: single source of truth is taskbarPinned (windowConfig.js),
           the same list the mobile launcher's appList is filtered from. -->
      <div
        v-for="item in taskbarPinned"
        :key="item.name"
        class="taskbar-icon"
        :class="iconState(item.name)"
        :title="$t(item.labelKey)"
        tabindex="0"
        role="button"
        :aria-pressed="openWindows.includes(item.name)"
        @click="openApp(item.name)"
        @keydown.enter="openApp(item.name)"
        @keydown.space.prevent="openApp(item.name)"
        @mouseenter="onIconEnter(item.name, $event)"
        @mouseleave="onIconLeave"
      >
        <font-awesome-icon :icon="item.icon" />
        <span v-if="openWindows.includes(item.name)" class="taskbar-indicator" :class="{ minimized: minimizedWindows[item.name] }"></span>
      </div>

      <!-- Window switcher trigger (also reachable via Ctrl+Alt+Tab). -->
      <div
        class="taskbar-icon"
        tabindex="0"
        role="button"
        :aria-label="$t('switcherTitle')"
        @click="openSwitcher"
        @keydown.enter="openSwitcher"
        @keydown.space.prevent="openSwitcher"
        :title="$t('switcherTitle')"
      >
        <font-awesome-icon icon="window-restore" />
      </div>

      <!-- Easter Egg Icon -->
      <div
        v-for="app in easterEggApps"
        :key="app"
        class="taskbar-icon"
        :class="iconState(app)"
        tabindex="0"
        role="button"
        :aria-pressed="openWindows.includes(app)"
        @click="openApp(app)"
        @keydown.enter="openApp(app)"
        @keydown.space.prevent="openApp(app)"
        @mouseenter="onIconEnter(app, $event)"
        @mouseleave="onIconLeave"
        title="Easter Egg"
      >
        <font-awesome-icon icon="egg" />
        <span v-if="openWindows.includes(app)" class="taskbar-indicator" :class="{ minimized: minimizedWindows[app] }"></span>
      </div>
    </div>

    <!-- Hover preview of a minimized window -->
    <Teleport to="body">
      <div
        v-if="previewFor"
        class="taskbar-preview"
        :style="{ left: previewLeft + 'px', bottom: previewBottom + 'px' }"
      >
        <img v-if="windowThumbnails[previewFor]" :src="windowThumbnails[previewFor]" :alt="previewFor" />
        <div v-else class="taskbar-preview-empty">{{ previewFor }}</div>
      </div>
    </Teleport>

    <!-- Right Box: clock -->
    <div class="taskbar-right">
      <div class="taskbar-clock">
        <div class="taskbar-item">{{ currentTime }}</div>
        <div class="taskbar-item">{{ currentDate }}</div>
      </div>
    </div>

    <!-- Start Menu -->
    <StartMenu
      v-if="startMenuOpen"
      :commitSummary="commitSummary"
      :commitDescription="commitDescription"
      :openNode="openNode"
      :openExplorerAt="openExplorerAt"
      :easterEggApps="easterEggApps"
      @close="closeStartMenu"
    />
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import StartMenu from "./StartMenu.vue";
import { taskbarPinned } from "../windowConfig";

export default {
  props: {
    openApp: {
      type: Function,
      required: true,
    },
    openExplorerRoot: {
      type: Function,
      required: true,
    },
    openNode: {
      type: Function,
      required: true,
    },
    openExplorerAt: {
      type: Function,
      required: true,
    },
    commitSummary: {
      type: String,
      required: true,
    },
    commitDescription: {
      type: String,
      required: true,
    },
    easterEggTriggered: {
      type: Boolean,
      required: true,
    },
    easterEggApps: {
      type: Array,
      required: true,
    },
    openWindows: {
      type: Array,
      default: () => [],
    },
    minimizedWindows: {
      type: Object,
      default: () => ({}),
    },
    windowThumbnails: {
      type: Object,
      default: () => ({}),
    },
    openSwitcher: {
      type: Function,
      required: true,
    },
  },
  data() {
    return {
      currentDate: new Date().toLocaleDateString(),
      currentTime: new Date().toLocaleTimeString(),
      startMenuOpen: false,
      previewFor: null,
      previewLeft: 0,
      previewBottom: 0,
      taskbarPinned,
    };
  },
  methods: {
    toggleStartMenu() {
      if (this.startMenuOpen) {
        this.closeStartMenu();
        return;
      }
      this.startMenuOpen = true;
      // Defer so this very click doesn't immediately trigger the outside-click close.
      this.$nextTick(() => document.addEventListener("click", this.onDocClick));
    },
    closeStartMenu() {
      this.startMenuOpen = false;
      document.removeEventListener("click", this.onDocClick);
    },
    onDocClick() {
      // Any click that reaches the document (i.e. outside the menu) closes it.
      this.closeStartMenu();
    },
    updateTime() {
      this.currentTime = new Date().toLocaleTimeString();
      this.currentDate = new Date().toLocaleDateString();
    },
    iconState(app) {
      if (!this.openWindows.includes(app)) return '';
      return this.minimizedWindows[app] ? 'app-minimized' : 'app-open';
    },
    onIconEnter(app, event) {
      // Only preview minimized windows (open ones are already on screen).
      if (!this.minimizedWindows[app]) {
        this.previewFor = null;
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const previewWidth = 240;
      const left = Math.max(8, Math.min(
        rect.left + rect.width / 2 - previewWidth / 2,
        window.innerWidth - previewWidth - 8,
      ));
      this.previewFor = app;
      this.previewLeft = left;
      this.previewBottom = window.innerHeight - rect.top + 8;
    },
    onIconLeave() {
      this.previewFor = null;
    },
  },
  mounted() {
    setInterval(this.updateTime, 1000); // Update time every second
  },
  beforeUnmount() {
    document.removeEventListener("click", this.onDocClick);
  },
  components: {
    FontAwesomeIcon,
    StartMenu,
  },
};
</script>

<style scoped>
.taskbar-icon {
  position: relative;
}

.taskbar-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: white;
}

.taskbar-indicator.minimized {
  background: rgba(255, 255, 255, 0.4);
}

.app-open {
  background: rgba(255, 255, 255, 0.15);
}

.app-minimized {
  background: rgba(255, 255, 255, 0.05);
}

/* Center the start button + app icons as one group (middle grid column). */
.taskbar-icons {
  justify-content: center;
}

/* Clock sits at the far right (right grid column). */
.taskbar-right {
  justify-self: end;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.taskbar-clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

/* Start button: same look as the app icons, with the profile photo as its glyph. */
.start-img {
  width: 26px;
  height: 26px;
  object-fit: cover;
  border-radius: 50%;
}
</style>

<!-- Non-scoped: the preview tooltip is teleported to <body>. -->
<style>
/* Fixed-size preview box: width AND height are constant so the hover
   tooltip always looks the same regardless of the source window's aspect
   ratio. The image is letterboxed inside via object-fit: contain. */
.taskbar-preview {
  position: fixed;
  width: 240px;
  height: 150px;
  padding: 6px;
  background: linear-gradient(180deg, #2a2a35, #1f1f2d);
  border: 2px solid #8404a1;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6);
  z-index: 99999;
  pointer-events: none;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.taskbar-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.taskbar-preview-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #d4a8e8;
  font-family: "PortfolioFont", sans-serif;
  font-size: 13px;
  font-weight: 600;
}
</style>

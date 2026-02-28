<template>
  <div class="taskbar">
    <!-- Left Box -->
    <div class="taskbar-left-box" @mouseover="openStartMenu" @mouseleave="closeStartMenu">
      <img src="/src/assets/img/pfp.webp" alt="Profile Picture" class="taskbar-image" />
    </div>

    <!-- Icons -->
    <div class="taskbar-icons">

      <!-- About me -->
      <div class="taskbar-icon" :class="iconState('aboutMe')" @click="openApp('aboutMe')">
        <font-awesome-icon icon="user" />
        <span v-if="openWindows.includes('aboutMe')" class="taskbar-indicator" :class="{ minimized: minimizedWindows['aboutMe'] }"></span>
      </div>

      <!-- Projects -->
      <div class="taskbar-icon" :class="iconState('projects')" @click="openApp('projects')">
        <font-awesome-icon icon="folder" />
        <span v-if="openWindows.includes('projects')" class="taskbar-indicator" :class="{ minimized: minimizedWindows['projects'] }"></span>
      </div>

      <!-- Contact -->
      <div class="taskbar-icon" :class="iconState('contact')" @click="openApp('contact')">
        <font-awesome-icon icon="envelope" />
        <span v-if="openWindows.includes('contact')" class="taskbar-indicator" :class="{ minimized: minimizedWindows['contact'] }"></span>
      </div>


      <!-- Mini Game -->
      <div class="taskbar-icon" :class="iconState('miniGame')" @click="openApp('miniGame')">
        <font-awesome-icon icon="gamepad" />
        <span v-if="openWindows.includes('miniGame')" class="taskbar-indicator" :class="{ minimized: minimizedWindows['miniGame'] }"></span>
      </div>

      <!-- Art Gallery -->
      <div class="taskbar-icon" :class="iconState('artGallery')" @click="openApp('artGallery')">
        <font-awesome-icon icon="palette" />
        <span v-if="openWindows.includes('artGallery')" class="taskbar-indicator" :class="{ minimized: minimizedWindows['artGallery'] }"></span>
      </div>


      <!-- Easter Egg Icon -->
      <div v-for="app in easterEggApps" :key="app" class="taskbar-icon" :class="iconState(app)" @click="openApp(app)" title="Easter Egg">
        <font-awesome-icon icon="egg" />
        <span v-if="openWindows.includes(app)" class="taskbar-indicator" :class="{ minimized: minimizedWindows[app] }"></span>
      </div>
    </div>

    <!-- Right Box -->
    <div class="taskbar-right">
      <div class="taskbar-item">{{ currentTime }}</div>
      <div class="taskbar-item">{{ currentDate }}</div>

    </div>

    <!-- Start Menu -->
    <StartMenu
      v-if="startMenuOpen"
      :commitSummary="commitSummary"
      :commitDescription="commitDescription"
      :darkMode="darkMode"
      :currentLanguage="currentLanguage"
      @toggle-dark-mode="$emit('toggle-dark-mode')"
      @update-language="(lang) => $emit('update-language', lang)"
      @mouseover="keepStartMenuOpen"
      @mouseleave="closeStartMenu"
    />
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import StartMenu from "./StartMenu.vue";

export default {
  props: {
    openApp: {
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
    darkMode: {
      type: Boolean,
      required: true,
    },
    currentLanguage: {
      type: String,
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
  },
  data() {
    return {
      currentDate: new Date().toLocaleDateString(),
      currentTime: new Date().toLocaleTimeString(),
      startMenuOpen: false,
      closeTimer: null,
    };
  },
  methods: {
    openStartMenu() {
      clearTimeout(this.closeTimer);
      this.startMenuOpen = true;
    },
    closeStartMenu() {
      this.closeTimer = setTimeout(() => { this.startMenuOpen = false; }, 100);
    },
    keepStartMenuOpen() {
      clearTimeout(this.closeTimer);
      this.startMenuOpen = true;
    },
    updateTime() {
      this.currentTime = new Date().toLocaleTimeString();
      this.currentDate = new Date().toLocaleDateString();
    },
    iconState(app) {
      if (!this.openWindows.includes(app)) return '';
      return this.minimizedWindows[app] ? 'app-minimized' : 'app-open';
    },
  },
  mounted() {
    setInterval(this.updateTime, 1000); // Update time every second
  },
  watch: {},
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
</style>

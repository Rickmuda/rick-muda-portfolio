<template>
  <div class="taskbar">
    <!-- Left Box + Start Menu Container -->
    <div class="taskbar-menu-wrapper" @mouseenter="openStartMenu" @mouseleave="scheduleCloseStartMenu">
      <div class="taskbar-left-box">
        <img src="/src/assets/img/pfp.webp" alt="Profile Picture" class="taskbar-image" />
      </div>

      <!-- Start Menu -->
      <StartMenu
        v-if="startMenuOpen"
        :commitSummary="commitSummary"
        :commitDescription="commitDescription"
        :darkMode="darkMode"
        :currentLanguage="currentLanguage"
        @update:darkMode="$emit('update:darkMode', $event)"
        @update:currentLanguage="$emit('update:currentLanguage', $event)"
      />
    </div>

    <!-- Icons -->
    <div class="taskbar-icons">

      <!-- About me -->
      <div class="taskbar-icon" :class="iconState('aboutMe')" @click="openApp('aboutMe')">
        <font-awesome-icon icon="user" />
      </div>

      <!-- Projects -->
      <div class="taskbar-icon" :class="iconState('projects')" @click="openApp('projects')">
        <font-awesome-icon icon="folder" />
      </div>

      <!-- Contact -->
      <div class="taskbar-icon" :class="iconState('contact')" @click="openApp('contact')">
        <font-awesome-icon icon="envelope" />
      </div>

      <!-- Socials -->
      <div class="taskbar-icon" :class="iconState('socials')" @click="openApp('socials')">
        <font-awesome-icon icon="share-nodes" />
      </div>

      <!-- Mini Game -->
      <div class="taskbar-icon" :class="iconState('miniGame')" @click="openApp('miniGame')">
        <font-awesome-icon icon="gamepad" />
      </div>

      <!-- Art Gallery -->
      <div class="taskbar-icon" :class="iconState('artGallery')" @click="openApp('artGallery')">
        <font-awesome-icon icon="palette" />
      </div>

      <!-- Certificates -->
      <div class="taskbar-icon" :class="iconState('certificates')" @click="openApp('certificates')">
        <font-awesome-icon icon="certificate" />
      </div> 

      <!-- Easter Egg Icon -->
      <div v-for="app in easterEggApps" :key="app" class="taskbar-icon" :class="iconState(app)" @click="openApp(app)" title="Easter Egg">
        <font-awesome-icon icon="egg" />
      </div>
    </div>

    <!-- Right Box -->
    <div class="taskbar-right">
      <div class="taskbar-item">{{ currentTime }}</div>
      <div class="taskbar-item">{{ currentDate }}</div>
    </div>
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
      required: true,
    },
    activeWindow: {
      type: String,
      default: "",
    },
    easterEggTriggered: {
      type: Boolean,
      required: true,
    },
    easterEggApps: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      currentDate: new Date().toLocaleDateString(),
      currentTime: new Date().toLocaleTimeString(),
      startMenuOpen: false,
      closeMenuTimeout: null,
    };
  },
  methods: {
    openStartMenu() {
      if (this.closeMenuTimeout) {
        clearTimeout(this.closeMenuTimeout);
        this.closeMenuTimeout = null;
      }
      this.startMenuOpen = true;
    },
    scheduleCloseStartMenu() {
      if (this.closeMenuTimeout) {
        clearTimeout(this.closeMenuTimeout);
      }
      this.closeMenuTimeout = setTimeout(() => {
        this.startMenuOpen = false;
      }, 200);
    },
    updateTime() {
      this.currentTime = new Date().toLocaleTimeString();
      this.currentDate = new Date().toLocaleDateString();
    },
    iconState(appName) {
      return {
        "is-open": this.openWindows.includes(appName),
        "is-active": this.activeWindow === appName,
      };
    },
  },
  mounted() {
    setInterval(this.updateTime, 1000);
  },
  beforeUnmount() {
    if (this.closeMenuTimeout) {
      clearTimeout(this.closeMenuTimeout);
    }
  },
  components: {
    FontAwesomeIcon,
    StartMenu,
  },
};
</script>

<style scoped>
.taskbar-icon.is-open {
  box-shadow: inset 0 -3px 0 #ffffff;
  border: 2px solid rgba(255, 255, 255, 0.45);
}

.taskbar-icon.is-active {
  background-color: #7f17a0;
  transform: translateY(-2px);
  border: 2px solid rgba(255, 255, 255, 0.9);
}

.taskbar-icon.is-active:hover {
  transform: translateY(-2px) scale(1.05);
}

.taskbar-menu-wrapper {
  display: flex;
  align-items: flex-start;
  position: relative;
}
</style>

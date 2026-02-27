<template>
  <div class="start-menu" @mouseenter="$emit('menu-enter')" @mouseleave="$emit('menu-leave')">
    <div class="start-menu-topbar">{{ $t('startMenu') }}</div>
    <div class="start-menu-content">
      <p>{{ $t('startMenuIntro') }}</p>
      <div class="version-and-settings">
        <div class="version-info">
          <p class="version-line">{{ $t('currentVersion') }}: {{ commitSummary }}</p>
          <p class="change-line">{{ commitDescription }}</p>
        </div>
        <button class="dark-mode-switch" :class="{ active: darkMode }" @click="toggleDarkMode" :title="darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
          <span class="switch-label">{{ darkMode ? $t('enableLightMode') || 'Enable Light Mode' : $t('enableDarkMode') }}</span>
          <span class="switch-toggle"></span>
        </button>
        <label class="label-text" for="language-select">{{ $t('selectLanguage') }}</label>
        <select id="language-select" v-model="selectedLanguage" @change="changeLanguage">
          <option value="en">{{ $t('english') }}</option>
          <option value="nl">{{ $t('dutch') }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
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
  },
  data() {
    return {
      selectedLanguage: this.currentLanguage,
    };
  },
  methods: {
    toggleDarkMode() {
      this.$emit("update:darkMode", !this.darkMode);
    },
    changeLanguage() {
      this.$emit("update:currentLanguage", this.selectedLanguage);
    },
  },
};
</script>

<style scoped>
.start-menu-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.version-and-settings {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.version-info {
  margin-bottom: -4px;
}

.version-line {
  margin: 0;
  font-size: 13px;
  line-height: 1.3;
}

.change-line {
  margin: 0;
  font-size: 13px;
  line-height: 1.3;
}

.label-text {
  font-size: 13px;
}

.dark-mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  border: 1px solid #8404a1;
  background: #f5f5f5;
  color: #111;
  border-radius: 4px;
  padding: 4px 8px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
  font-size: 13px;
}

.dark-mode-switch:hover {
  background: #e8e8e8;
}

.dark-mode-switch.active {
  /* Keep base styling; only the toggle box color changes via .switch-toggle */
}

.dark-mode-switch.active:hover {
  background: #e8e8e8;
}

.switch-toggle {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 2px;
  background: #ccc;
  transition: background 0.3s ease;
}

.dark-mode-switch.active .switch-toggle {
  background: #383838;
}

.switch-label {
  font-weight: 500;
}

#language-select {
  border: 1px solid #8404a1;
  background: #ffffff;
  color: #111;
  border-radius: 4px;
  padding: 3px 6px;
  font-family: inherit;
}
</style>
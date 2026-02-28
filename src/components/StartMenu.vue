<template>
  <div class="start-menu">
    <div class="start-menu-topbar">{{ $t('startMenu') }}</div>
    <div class="start-menu-content">
      <p>{{ $t('startMenuIntro') }}</p>
      <p>{{ $t('currentVersion') }}: {{ commitSummary }}</p>
      <p>{{ commitDescription }}</p>
    </div>
    <div class="start-menu-controls">
      <button class="start-menu-ctrl-btn" @click="$emit('toggle-dark-mode')" :title="$t('toggleDarkMode')">
        <font-awesome-icon :icon="darkMode ? 'moon' : 'sun'" />
      </button>
      <select class="start-menu-ctrl-select" v-model="selectedLanguage" @change="$emit('update-language', selectedLanguage)" :title="$t('changeLanguage')">
        <option value="en">EN</option>
        <option value="nl">NL</option>
      </select>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

export default {
  components: { FontAwesomeIcon },
  emits: ['toggle-dark-mode', 'update-language'],
  props: {
    commitSummary: { type: String, required: true },
    commitDescription: { type: String, required: true },
    darkMode: { type: Boolean, required: true },
    currentLanguage: { type: String, required: true },
  },
  data() {
    return { selectedLanguage: this.currentLanguage };
  },
  watch: {
    currentLanguage(newLang) { this.selectedLanguage = newLang; }
  },
};
</script>

<style scoped>
.start-menu-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.start-menu-ctrl-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 6px;
  color: white;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background 0.2s;
}

.start-menu-ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.start-menu-ctrl-select {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 6px;
  color: white;
  padding: 4px 8px;
  height: 32px;
  cursor: pointer;
  font-size: 13px;
  outline: none;
}

.start-menu-ctrl-select option {
  background: #7a1a91;
  color: white;
}
</style>
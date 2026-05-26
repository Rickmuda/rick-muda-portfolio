<template>
  <div class="settings">
    <!-- Dark Mode Toggle -->
    <label class="dark-mode-toggle">
      <span class="label-text">{{ $t('enableDarkMode') }}</span>
      <input type="checkbox" :checked="darkMode" @change="toggleDarkMode" />
      <span class="slider"></span>
    </label>

    <!-- Sound Toggle -->
    <label class="dark-mode-toggle">
      <span class="label-text">{{ $t('enableSounds') }}</span>
      <input type="checkbox" :checked="soundsEnabled" @change="toggleSounds" />
      <span class="slider"></span>
    </label>

    <!-- Language Selection -->
    <div class="language-selection">
      <label for="language-select" class="label-text">{{ $t('selectLanguage') }}</label>
      <select id="language-select" v-model="selectedLanguage" @change="changeLanguage">
        <option value="en">{{ $t('english') }}</option>
        <option value="nl">{{ $t('dutch') }}</option>
        <!-- <option value="de">{{ $t('german') }}</option> -->
      </select>
    </div>
  </div>
</template>

<script>
import { sounds } from "../../sounds";
import { unlock as unlockAchievement } from "../../achievements";

export default {
  props: {
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
      selectedLanguage: this.currentLanguage, // Initialize with the current language
      soundsEnabled: sounds.isEnabled(),
    };
  },
  methods: {
    toggleDarkMode() {
      this.$emit("update:darkMode", !this.darkMode); // Emit the updated value to App.vue
      unlockAchievement("night-owl");
    },
    toggleSounds() {
      this.soundsEnabled = !this.soundsEnabled;
      sounds.setEnabled(this.soundsEnabled);
      if (this.soundsEnabled) sounds.play("open");
    },
    changeLanguage() {
      this.$emit("update:currentLanguage", this.selectedLanguage); // Emit the selected language to App.vue
      this.$i18n.locale = this.selectedLanguage; // Update the locale dynamically
      unlockAchievement("bilingual");
    },
  },
};
</script>

<style scoped>
.settings {
  height: 100%;
  background: #1a1a24;
  box-sizing: border-box;
}

.language-selection select,
.language-selection select option {
  font-family: 'PortfolioFont', sans-serif;
}

/* Desktop: card-style rows with consistent padding, label left, control right. */
@media (min-width: 769px) {
  .settings {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 24px;
    width: 100%;
    box-sizing: border-box;
  }

  .dark-mode-toggle,
  .language-selection {
    align-self: center;
    width: 100%;
    max-width: 560px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
  }

  .language-selection select {
    margin-left: 0;
    padding: 8px 12px;
  }
}

/* Mobile-only restyle: card layout for the settings controls */
@media (max-width: 768px) {
  .settings {
    gap: 16px;
    padding: 16px;
    max-width: 480px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .dark-mode-toggle,
  .language-selection {
    display: flex;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 12px;
    padding: 16px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .dark-mode-toggle {
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .language-selection {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .language-selection .label-text {
    font-size: 16px;
  }

  .language-selection select {
    width: 100%;
    margin-left: 0;
    padding: 12px;
    font-size: 15px;
    border-radius: 8px;
    border: 1px solid #7a1897;
    background: #252535;
    color: #fff;
    font-family: inherit;
  }
}
</style>
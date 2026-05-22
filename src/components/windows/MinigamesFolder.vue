<template>
  <div class="minigames-folder">
    <div class="mf-grid">
      <button
        v-for="game in games"
        :key="game.name"
        class="mf-item"
        :class="{ 'is-coming-soon': game.comingSoon }"
        type="button"
        :disabled="game.comingSoon"
        @click="game.comingSoon || openApp(game.name)"
      >
        <span class="mf-icon">
          <font-awesome-icon :icon="game.icon" />
        </span>
        <span class="mf-label">{{ $t(game.labelKey) }}</span>
        <span v-if="game.comingSoon" class="mf-soon">{{ $t('comingSoon') }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { minigames } from "../../minigames";

export default {
  name: "MinigamesFolder",
  components: {
    FontAwesomeIcon,
  },
  props: {
    openApp: {
      type: Function,
      required: true,
    },
  },
  data() {
    return {
      games: minigames,
    };
  },
};
</script>

<style scoped>
.minigames-folder {
  height: 100%;
  background: #1a1a24;
  border: 2px solid #000;
  overflow-y: auto;
}

.mf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 18px;
  padding: 20px;
  align-content: start;
}

.mf-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #4f115d;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  color: #fff;
  transition: background 0.15s ease, border-color 0.15s ease,
    transform 0.15s ease;
}

.mf-item:hover:not(.is-coming-soon) {
  background: rgba(155, 32, 183, 0.18);
  border-color: #c637e6;
  transform: translateY(-2px);
}

.mf-item.is-coming-soon {
  opacity: 0.45;
  cursor: not-allowed;
}

.mf-soon {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #d4a8e8;
}

.mf-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #9b20b7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
}

.mf-label {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
  word-wrap: break-word;
}
</style>

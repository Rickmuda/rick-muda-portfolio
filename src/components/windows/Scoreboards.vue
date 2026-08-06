<template>
  <div class="sb-window">
    <header class="sb-header">
      <h2>{{ $t('scoreboards') }}</h2>
    </header>

    <div class="sb-tabs" role="tablist">
      <button
        v-for="g in GAMES"
        :key="g.key"
        type="button"
        class="sb-tab"
        role="tab"
        :aria-selected="activeGame === g.key"
        :class="{ active: activeGame === g.key }"
        @click="selectGame(g.key)"
      >
        <font-awesome-icon :icon="g.icon" />
        {{ $t(g.labelKey) }}
      </button>
    </div>

    <div class="sb-body">
      <div v-if="activeGameConfig.hasVariant" class="sb-variant-tabs">
        <button
          v-for="d in MINESWEEPER_DIFFICULTIES"
          :key="d"
          type="button"
          class="sb-variant-tab"
          :class="{ active: activeDifficulty === d }"
          @click="selectDifficulty(d)"
        >
          {{ $t(`mine${d[0].toUpperCase()}${d.slice(1)}`) }}
        </button>
      </div>

      <div class="sb-list-wrap">
        <div v-if="loading" class="sb-empty">{{ $t('scoreboardLoading') }}</div>
        <ol v-else-if="scores.length" class="sb-list">
          <li v-for="(entry, i) in scores" :key="i" class="sb-row">
            <span class="sb-rank" :aria-label="`${$t('scoreboardRank')} ${i + 1}`">{{ i + 1 }}</span>
            <span class="sb-name">{{ entry.player_name }}</span>
            <span class="sb-value">{{ formatValue(entry.value, activeGameConfig.metric) }}</span>
          </li>
        </ol>
        <div v-else class="sb-empty">{{ $t('scoreboardEmpty') }}</div>
      </div>

      <div class="sb-submit" v-if="localBestRaw !== null">
        <div class="sb-your-best">
          {{ $t('scoreboardYourBest') }}: <strong>{{ formatValue(localBestRaw, activeGameConfig.metric) }}</strong>
          <span v-if="activeGame === 'solitaire'"> &middot; {{ $t('scoreboardWins') }}: {{ localSolitaireWins }}</span>
        </div>
        <form class="sb-submit-form" @submit.prevent="submit">
          <input
            v-model="nameInput"
            type="text"
            :placeholder="$t('scoreboardNamePlaceholder')"
            maxlength="20"
            required
          />
          <!-- Honeypot: hidden from real users via .sr-only; a bot that fills
               every field trips this, so submitScore() quietly rejects it. -->
          <input v-model="honeypot" type="text" class="sr-only" tabindex="-1" autocomplete="off" />
          <button type="submit" :disabled="submitting">{{ $t('scoreboardSubmit') }}</button>
        </form>
        <div v-if="submitMessage" class="sb-message" :class="submitMessage.type">{{ submitMessage.text }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { fetchTopScores, submitScore } from "../../leaderboard";

const NAME_KEY = "scoreboardPlayerName";

// One entry per Games-folder game. `metric` says how `value` ranks:
// "score" = higher is better, "time_seconds" = lower is better. `hasVariant`
// marks Minesweeper, the only game with a difficulty split.
const GAMES = [
  { key: "minesweeper", icon: "bomb",      labelKey: "minesweeper", metric: "time_seconds", hasVariant: true },
  { key: "tetris",      icon: "shapes",    labelKey: "tetris",      metric: "score",        hasVariant: false },
  { key: "flappyRick",  icon: "dove",      labelKey: "flappyRick",  metric: "score",        hasVariant: false },
  { key: "solitaire",   icon: "clone",     labelKey: "solitaire",   metric: "time_seconds", hasVariant: false },
];
const MINESWEEPER_DIFFICULTIES = ["easy", "medium", "hard"];

// Reads whichever local-best key the active game already persists (see each
// game's own file for the matching write side - none of them needed changing
// to expose this, the keys already existed except Solitaire's, added
// alongside this window). Returns null when nothing's been played yet, so the
// submit form only ever appears once there's a real value to submit.
function readSavedName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch (_) {
    return "";
  }
}

function readLocalBest(game, difficulty) {
  const KEYS = {
    minesweeper: `minesweeper-best-${difficulty}`,
    tetris: "tetris-best",
    flappyRick: "flappyRickBest",
    solitaire: "solitaire-best-time",
  };
  try {
    const raw = localStorage.getItem(KEYS[game]);
    return raw === null ? null : parseInt(raw, 10);
  } catch (_) {
    return null;
  }
}

export default {
  name: "Scoreboards",
  data() {
    return {
      GAMES,
      MINESWEEPER_DIFFICULTIES,
      activeGame: "minesweeper",
      activeDifficulty: "easy",
      scores: [],
      loading: false,
      nameInput: readSavedName(),
      honeypot: "",
      submitting: false,
      submitMessage: null, // { type: 'success'|'error', text }
    };
  },
  computed: {
    activeGameConfig() {
      return this.GAMES.find((g) => g.key === this.activeGame);
    },
    currentVariant() {
      return this.activeGameConfig.hasVariant ? this.activeDifficulty : null;
    },
    localBestRaw() {
      return readLocalBest(this.activeGame, this.activeDifficulty);
    },
    localSolitaireWins() {
      try {
        return parseInt(localStorage.getItem("solitaire-wins") || "0", 10);
      } catch (_) {
        return 0;
      }
    },
  },
  mounted() {
    this.loadScores();
  },
  methods: {
    async loadScores() {
      this.loading = true;
      this.scores = await fetchTopScores({
        game: this.activeGame,
        variant: this.currentVariant,
        metric: this.activeGameConfig.metric,
      });
      this.loading = false;
    },
    selectGame(key) {
      if (this.activeGame === key) return;
      this.activeGame = key;
      this.submitMessage = null;
      this.loadScores();
    },
    selectDifficulty(diff) {
      if (this.activeDifficulty === diff) return;
      this.activeDifficulty = diff;
      this.submitMessage = null;
      this.loadScores();
    },
    formatValue(value, metric) {
      return metric === "time_seconds" ? `${value}s` : String(value);
    },
    async submit() {
      if (this.localBestRaw === null || this.submitting) return;
      this.submitting = true;
      this.submitMessage = null;
      const result = await submitScore({
        game: this.activeGame,
        variant: this.currentVariant,
        metric: this.activeGameConfig.metric,
        playerName: this.nameInput,
        value: this.localBestRaw,
        honeypot: this.honeypot,
      });
      this.submitting = false;
      if (result.ok) {
        try {
          localStorage.setItem(NAME_KEY, this.nameInput.trim());
        } catch (_) {}
        this.submitMessage = { type: "success", text: this.$t("scoreboardSubmitted") };
        this.loadScores();
      } else if (result.reason === "profanity") {
        this.submitMessage = { type: "error", text: this.$t("scoreboardNameRejected") };
      } else {
        this.submitMessage = { type: "error", text: this.$t("scoreboardSubmitError") };
      }
    },
  },
};
</script>

<style scoped>
.sb-window {
  height: 100%;
  background: #1a1a24;
  color: #fff;
  border: 2px solid #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sb-header {
  padding: 12px 16px;
  background: linear-gradient(180deg, #2a2a35, #1f1f2d);
  border-bottom: 2px solid #4f115d;
}

.sb-header h2 {
  margin: 0;
  font-size: 18px;
}

.sb-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  background: #1f1f2d;
  border-bottom: 1px solid #4f115d;
}

.sb-tab,
.sb-variant-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #4f115d;
  border-radius: 8px;
  color: #c0b8cc;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.sb-tab:hover,
.sb-variant-tab:hover {
  background: rgba(155, 32, 183, 0.18);
}

.sb-tab.active,
.sb-variant-tab.active {
  background: #9b20b7;
  border-color: #c637e6;
  color: #fff;
}

.sb-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px;
  gap: 12px;
}

.sb-variant-tabs {
  display: flex;
  gap: 6px;
}

.sb-list-wrap {
  flex: 1;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid #4f115d;
  border-radius: 8px;
}

.sb-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.sb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sb-row:last-child {
  border-bottom: none;
}

.sb-rank {
  width: 24px;
  flex-shrink: 0;
  font-weight: 700;
  color: #d4a8e8;
}

.sb-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sb-value {
  font-weight: 700;
  flex-shrink: 0;
}

.sb-empty {
  padding: 24px;
  text-align: center;
  color: #6a647a;
  font-size: 13px;
}

.sb-submit {
  border-top: 1px solid #4f115d;
  padding-top: 12px;
}

.sb-your-best {
  font-size: 13px;
  color: #c0b8cc;
  margin-bottom: 8px;
}

.sb-submit-form {
  display: flex;
  gap: 8px;
}

.sb-submit-form input[type="text"]:not(.sr-only) {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #4f115d;
  background: #252535;
  color: #fff;
  font-family: inherit;
}

.sb-submit-form button {
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid #c637e6;
  background: #9b20b7;
  color: #fff;
  font-family: inherit;
  cursor: pointer;
}

.sb-submit-form button:disabled {
  opacity: 0.6;
  cursor: default;
}

.sb-message {
  margin-top: 8px;
  font-size: 12px;
}

.sb-message.success { color: #7fe0a0; }
.sb-message.error { color: #ff6b8b; }

@media (max-width: 768px) {
  .sb-tabs {
    justify-content: center;
  }

  .sb-submit-form {
    flex-direction: column;
  }
}
</style>

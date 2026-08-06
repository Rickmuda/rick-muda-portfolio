<template>
  <div v-if="configured" class="ssp" @click.stop @touchstart.stop>
    <div class="ssp-headline">
      <font-awesome-icon icon="trophy" />
      {{ $t('scoreboardNewBest') }}
    </div>
    <form v-if="!submitted" class="ssp-form" @submit.prevent="submit">
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
    <div v-if="message" class="ssp-message" :class="message.type">{{ message.text }}</div>
  </div>
</template>

<script>
import { submitScore } from "../leaderboard";
import { keysConfigured } from "../supabaseConfig";

const NAME_KEY = "scoreboardPlayerName";

// Drop-in "new high score" prompt for a game's own game-over screen, so a
// player can submit straight to the global leaderboard without opening the
// separate Scoreboards window. Mirrors Scoreboards.vue's submit form/copy -
// same submitScore() call, same success/error messages - just scoped to a
// single value instead of a whole tab's worth of state.
export default {
  name: "ScoreSubmitPrompt",
  props: {
    game: { type: String, required: true },
    variant: { type: String, default: null },
    metric: { type: String, required: true },
    value: { type: Number, required: true },
  },
  data() {
    let savedName = "";
    try {
      savedName = localStorage.getItem(NAME_KEY) || "";
    } catch (_) {}
    return {
      configured: keysConfigured(),
      nameInput: savedName,
      honeypot: "",
      submitting: false,
      submitted: false,
      message: null,
    };
  },
  methods: {
    async submit() {
      if (this.submitting) return;
      this.submitting = true;
      this.message = null;
      const result = await submitScore({
        game: this.game,
        variant: this.variant,
        metric: this.metric,
        playerName: this.nameInput,
        value: this.value,
        honeypot: this.honeypot,
      });
      this.submitting = false;
      if (result.ok) {
        try {
          localStorage.setItem(NAME_KEY, this.nameInput.trim());
        } catch (_) {}
        this.submitted = true;
        this.message = { type: "success", text: this.$t("scoreboardSubmitted") };
      } else if (result.reason === "profanity") {
        this.message = { type: "error", text: this.$t("scoreboardNameRejected") };
      } else {
        this.message = { type: "error", text: this.$t("scoreboardSubmitError") };
      }
    },
  },
};
</script>

<style scoped>
.ssp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid #c637e6;
  border-radius: 8px;
}

.ssp-headline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #ffd76b;
}

.ssp-form {
  display: flex;
  gap: 6px;
}

.ssp-form input[type="text"]:not(.sr-only) {
  width: 140px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #4f115d;
  background: #252535;
  color: #fff;
  font-family: inherit;
  font-size: 13px;
}

.ssp-form button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #c637e6;
  background: #9b20b7;
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.ssp-form button:hover:not(:disabled) {
  background: #c637e6;
}

.ssp-form button:disabled {
  opacity: 0.6;
  cursor: default;
}

.ssp-message {
  font-size: 12px;
}

.ssp-message.success { color: #7fe0a0; }
.ssp-message.error { color: #ff6b8b; }
</style>

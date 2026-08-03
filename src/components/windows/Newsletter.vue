<template>
  <div class="newsletter-window">
    <!-- Purely decorative fake browser chrome dressing up the real OS window
         as a "90s popup ad". No fake titlebar/controls here anymore - the
         real window titlebar above this already provides those. -->
    <div class="fake-addressbar" aria-hidden="true">
      <span class="fake-address-icon">🌐</span>
      <span class="fake-address-text">http://www.rickmuda.nl/subscribe.html</span>
      <span class="fake-go-btn">Go</span>
    </div>

    <div class="ad-content">
      <div class="ad-badge">{{ $t("newsletterPopupBadge") }}</div>
      <h2 class="ad-headline">{{ $t("newsletterPopupHeadline") }}</h2>
      <p class="ad-sub">{{ $t("newsletterIntro") }}</p>

      <div class="ad-form">
        <input
          type="email"
          v-model="email"
          :placeholder="$t('enterEmail')"
          :disabled="status === 'loading'"
          @keyup.enter="submit"
          class="ad-input"
        />

        <!-- Honeypot: hidden from real visitors, only a bot would fill this in. -->
        <input
          type="text"
          v-model="honeypot"
          class="honeypot"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        />

        <button @click="submit" :disabled="status === 'loading'" class="ad-cta">
          {{ status === "loading" ? $t("newsletterSubscribing") : $t("newsletterSubscribe") }}
        </button>
      </div>

      <p
        v-if="statusMessage"
        class="ad-status"
        :class="{ 'is-error': status === 'error' }"
      >
        {{ statusMessage }}
      </p>

      <p class="ad-disclaimer">{{ $t("newsletterPopupDisclaimer") }}</p>

      <div class="hit-counter" aria-hidden="true">
        <span class="hit-counter-label">{{ $t("newsletterPopupCounter") }}</span>
        <span class="hit-counter-digits">
          <span v-for="(d, i) in counterDigits" :key="i" class="hit-counter-digit">{{ d }}</span>
        </span>
      </div>
    </div>

    <div class="fake-statusbar" aria-hidden="true">
      <span>📄 Done</span>
      <span>🌐 Internet</span>
    </div>
  </div>
</template>

<script>
import { subscribe } from "../../newsletterConfig";

export default {
  data() {
    return {
      email: "",
      honeypot: "",
      status: "idle", // idle | loading | success | error
      // A stable, purely-cosmetic "hit counter" number, styled after the
      // classic free-hosting-site visitor counter. Randomized once per visit.
      counter: String(Math.floor(Math.random() * 900000) + 100000),
    };
  },
  computed: {
    counterDigits() {
      return this.counter.split("");
    },
    statusMessage() {
      switch (this.status) {
        case "success":
          return this.$t("newsletterSuccess");
        case "already":
          return this.$t("newsletterAlready");
        case "invalid":
          return this.$t("newsletterInvalid");
        case "error":
          return this.$t("errorOccurred");
        default:
          return "";
      }
    },
  },
  methods: {
    async submit() {
      if (this.status === "loading") return;
      this.status = "loading";

      const result = await subscribe(this.email, this.honeypot);

      if (result.ok) {
        this.status = "success";
        this.email = "";
      } else if (result.reason === "already") {
        this.status = "already";
      } else if (result.reason === "invalid") {
        this.status = "invalid";
      } else {
        this.status = "error";
      }
    },
  },
};
</script>

<style scoped>
.newsletter-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: Tahoma, Verdana, sans-serif;
  font-weight: 400;
  overflow: hidden;
  /* Every AppWindow wraps its content in .app-content, which (see
     src/assets/main.css) applies a 4-direction 1px black text-shadow
     "stroke" to all text for legibility on other windows. At the small
     sizes used here that stroke visually merges into a black smear/line
     through the glyphs, so opt this window's text back out of it; the
     headline below sets its own deliberate shadow. */
  text-shadow: none;
  /* Tahoma has no real italic/bold face on some systems, so the browser
     fakes ("synthesizes") one by double-stroking the glyphs - at small
     sizes that can also look like a stray line through the text. */
  font-synthesis: none;
}

/* Fake address bar */
.fake-addressbar {
  background: #d4d0c8;
  border-bottom: 1px solid #808080;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  flex-shrink: 0;
}

.fake-address-icon {
  flex-shrink: 0;
}

.fake-address-text {
  flex: 1;
  background: #fff;
  border: 1px solid #808080;
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.35);
  padding: 4px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #000;
  font-weight: 700;
}

.fake-go-btn {
  flex-shrink: 0;
  background: #c0c0c0;
  border-top: 1px solid #fff;
  border-left: 1px solid #fff;
  border-bottom: 1px solid #555;
  border-right: 1px solid #555;
  padding: 4px 12px;
  color: #000;
  font-weight: 700;
}

/* The "ad" itself - now the main body of the window */
.ad-content {
  flex: 1;
  min-height: 0;
  background: linear-gradient(160deg, #fff200, #ffb300);
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  overflow-y: auto;
}

.ad-badge {
  background: #cc0000;
  color: #ffe600;
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 6px 14px;
  border-radius: 2px;
  transform: rotate(-3deg);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.25);
  animation: ad-blink 1s steps(1) infinite;
}

.ad-headline {
  font-family: Impact, "Arial Narrow Bold", Tahoma, sans-serif;
  font-size: clamp(24px, 6.5vw, 32px);
  line-height: 1.2;
  color: #c00000;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.2);
  text-transform: uppercase;
  margin: 0;
  animation: ad-pulse 1.4s ease-in-out infinite;
}

.ad-sub {
  font-family: Tahoma, Verdana, sans-serif;
  font-weight: 700;
  color: #1a1a6e;
  font-size: 18px;
  line-height: 1.4;
  max-width: 320px;
  margin: 0;
}

.ad-disclaimer {
  font-family: Tahoma, Verdana, sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-size: 12px;
  color: #6b5a00;
  margin: 0;
}

.ad-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 300px;
  margin-top: 6px;
}

.ad-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 10px;
  border-width: 2px;
  border-style: solid;
  border-top-color: #555;
  border-left-color: #555;
  border-bottom-color: #fff;
  border-right-color: #fff;
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.4);
  font-family: Tahoma, sans-serif;
  font-size: 15px;
  background: #fff;
  color: #000;
}

.ad-input::placeholder {
  color: #777;
}

.ad-input:focus {
  outline: 2px dotted #1a1a6e;
  outline-offset: 1px;
}

.honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.ad-cta {
  background: linear-gradient(180deg, #f4f4f4, #c0c0c0);
  border-width: 2px;
  border-style: solid;
  border-top-color: #fff;
  border-left-color: #fff;
  border-bottom-color: #555;
  border-right-color: #555;
  padding: 14px 18px;
  font-family: Tahoma, sans-serif;
  font-weight: 900;
  font-size: 16px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #000;
  cursor: pointer;
}

.ad-cta::after {
  content: "!";
}

.ad-cta:hover:not(:disabled) {
  background: linear-gradient(180deg, #ffffff, #d6d6d6);
}

.ad-cta:active:not(:disabled) {
  border-top-color: #555;
  border-left-color: #555;
  border-bottom-color: #fff;
  border-right-color: #fff;
  transform: translateY(1px);
}

.ad-cta:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ad-status {
  font-family: Tahoma, sans-serif;
  font-weight: 700;
  font-size: 13px;
  background: #fff;
  border: 1px solid #000;
  padding: 6px 12px;
  color: #0a5c0a;
  margin: 0;
}

.ad-status.is-error {
  color: #b00000;
}

.hit-counter {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.hit-counter-label {
  font-family: Tahoma, sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #1a1a6e;
}

.hit-counter-digits {
  display: flex;
  gap: 2px;
  background: #000;
  padding: 4px;
  border-width: 2px;
  border-style: solid;
  border-top-color: #555;
  border-left-color: #555;
  border-bottom-color: #fff;
  border-right-color: #fff;
}

.hit-counter-digit {
  background: #111;
  color: #33ff33;
  font-family: "Courier New", monospace;
  font-weight: 700;
  font-size: 15px;
  width: 14px;
  text-align: center;
}

/* Fake status bar */
.fake-statusbar {
  flex-shrink: 0;
  background: #d4d0c8;
  border-top: 1px solid #fff;
  padding: 4px 10px;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 700;
  color: #000;
}

@keyframes ad-blink {
  50% {
    opacity: 0;
  }
}

@keyframes ad-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.04);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ad-badge {
    animation: none;
  }

  .ad-headline {
    animation: none;
  }
}

@media (max-width: 768px) {
  .ad-content {
    padding: 22px 16px;
  }

  .ad-input,
  .ad-cta {
    min-height: 44px;
  }
}
</style>

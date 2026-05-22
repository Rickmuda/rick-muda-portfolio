<template>
  <div class="downloads-window">
    <!-- Download cards -->
    <div class="downloads-grid">
      <div
        v-for="item in downloads"
        :key="item.id"
        class="download-card"
        :class="{ 'is-coming-soon': isComingSoon(item) }"
      >
        <!-- Thumbnail -->
        <div class="card-thumb">
          <img :src="item.thumbnail" :alt="$t(item.titleKey)" class="card-thumb-img" />
          <span v-if="isComingSoon(item)" class="coming-soon-ribbon">{{ $t('comingSoon') }}</span>
        </div>

        <!-- Body -->
        <div class="card-body">
          <h3 class="card-title">{{ $t(item.titleKey) }}</h3>
          <p class="card-desc">{{ $t(item.descKey) }}</p>

          <!-- Meta: version · size, with a lock indicator when protected -->
          <div class="card-meta">
            <span class="meta-text">{{ metaText(item) }}</span>
            <font-awesome-icon
              v-if="item.protected"
              icon="lock"
              class="meta-lock"
              :title="$t('protected')"
            />
          </div>

          <!-- Action -->
          <div class="card-action">
            <!-- Coming soon -->
            <button
              v-if="isComingSoon(item)"
              class="card-btn disabled"
              type="button"
              disabled
            >
              {{ $t('comingSoon') }}
            </button>

            <!-- Password-protected: reveal field on demand -->
            <template v-else-if="item.protected">
              <!-- Not for mobile: greyed-out, disabled unlock button -->
              <button
                v-if="isMobile && item.mobileUnavailable"
                class="card-btn disabled"
                type="button"
                disabled
                :title="$t('desktopOnly')"
              >
                <font-awesome-icon icon="lock" />
                {{ $t('unlock') }}
              </button>

              <button
                v-else-if="!revealedIds[item.id]"
                class="card-btn"
                type="button"
                @click="reveal(item)"
              >
                <font-awesome-icon icon="lock" />
                {{ $t('unlock') }}
              </button>

              <transition name="reveal">
                <form
                  v-if="revealedIds[item.id]"
                  class="unlock-form"
                  @submit.prevent="unlock(item)"
                >
                  <div class="password-row">
                    <input
                      :ref="(el) => setInputRef(item.id, el)"
                      v-model="passwords[item.id]"
                      type="password"
                      class="password-input"
                      :placeholder="$t('downloadEnterPassword')"
                      :disabled="loadingIds[item.id]"
                      autocomplete="off"
                    />
                    <button
                      class="card-btn icon-btn"
                      type="submit"
                      :disabled="loadingIds[item.id] || !passwords[item.id]"
                      :aria-label="$t('download')"
                    >
                      <font-awesome-icon :icon="loadingIds[item.id] ? 'lock' : 'download'" />
                    </button>
                  </div>
                  <span v-if="errors[item.id]" class="password-error">{{ errors[item.id] }}</span>
                </form>
              </transition>
            </template>

            <!-- Direct (unprotected) download -->
            <a
              v-else
              :href="item.file.url"
              :download="item.file.name"
              class="card-btn"
            >
              <font-awesome-icon icon="download" />
              {{ $t('download') }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

export default {
  name: "Downloads",
  components: {
    FontAwesomeIcon,
  },
  data() {
    return {
      downloads: [
        {
          id: "portfolio-fotografie",
          titleKey: "dlPhotoTitle",
          descKey: "dlPhotoDesc",
          version: "v1.0",
          // Leave empty until the real size is known; it's hidden when blank.
          size: "",
          thumbnail: new URL("@/assets/img/downloads/fotoport.webp", import.meta.url).href,
          // Password-protected: the file is streamed by the backend only after a
          // correct password. The file is NOT served from a public URL, so it
          // cannot be reached by guessing/altering a URL.
          protected: true,
          // Flip to true once the file is on the server (protected-files/) and the
          // password is set. Until then the card shows "Coming soon".
          available: true,
          // Not meant for mobile: the unlock button is greyed out/disabled on
          // phones (<=768px). Set false for downloads that work fine on mobile.
          mobileUnavailable: true,
          // For unprotected downloads instead use: file: { url, name }
        },
      ],
      passwords: {},
      errors: {},
      loadingIds: {},
      revealedIds: {},
      isMobile: false,
    };
  },
  created() {
    // Plain (non-reactive) store for input DOM refs.
    this.inputRefs = {};
    // Pre-initialise per-item state so v-model bindings stay reactive.
    this.downloads.forEach((item) => {
      this.passwords[item.id] = "";
      this.errors[item.id] = "";
      this.loadingIds[item.id] = false;
      this.revealedIds[item.id] = false;
    });
  },
  mounted() {
    this.mq = window.matchMedia("(max-width: 768px)");
    this.isMobile = this.mq.matches;
    this.onMqChange = (e) => {
      this.isMobile = e.matches;
    };
    this.mq.addEventListener("change", this.onMqChange);
  },
  beforeUnmount() {
    if (this.mq) this.mq.removeEventListener("change", this.onMqChange);
  },
  methods: {
    isComingSoon(item) {
      return item.protected ? !item.available : !item.file;
    },
    metaText(item) {
      return [item.version, item.size].filter(Boolean).join(" · ");
    },
    setInputRef(id, el) {
      if (el) this.inputRefs[id] = el;
    },
    reveal(item) {
      this.revealedIds[item.id] = true;
      this.$nextTick(() => {
        const input = this.inputRefs[item.id];
        if (input) input.focus();
      });
    },
    async unlock(item) {
      this.errors[item.id] = "";
      const password = this.passwords[item.id];
      if (!password) return;

      this.loadingIds[item.id] = true;
      try {
        // Same-origin PHP gatekeeper (public/download.php). It verifies the
        // password server-side and streams the file, which lives outside the
        // web root - so it can't be reached by altering the URL.
        const response = await fetch("/download.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, password }),
        });

        if (response.status === 401) {
          this.errors[item.id] = this.$t("downloadWrongPassword");
          return;
        }
        if (!response.ok) {
          this.errors[item.id] = this.$t("downloadError");
          return;
        }

        // Stream the returned file to a browser download.
        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : item.id;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        this.passwords[item.id] = "";
      } catch (error) {
        console.error("Download error:", error);
        this.errors[item.id] = this.$t("downloadError");
      } finally {
        this.loadingIds[item.id] = false;
      }
    },
  },
};
</script>

<style scoped>
.downloads-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #0a0a0a, #1a1a1a);
  color: #fff;
  font-family: "PortfolioFont", sans-serif;
}

/* ---- Grid ---- */
.downloads-grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 18px;
  padding: 20px;
  align-content: start;
}

/* ---- Card ---- */
.download-card {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.035);
  border: 2px solid #9b20b7;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45), 0 6px 16px rgba(0, 0, 0, 0.35);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.download-card:hover {
  transform: translateY(-2px);
  border-color: #c637e6;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45), 0 0 16px rgba(178, 40, 210, 0.5),
    0 6px 16px rgba(0, 0, 0, 0.4);
}

/* ---- Thumbnail ---- */
.card-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #14081e;
  overflow: hidden;
  border-bottom: 2px solid #9b20b7;
}

.card-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.is-coming-soon .card-thumb-img {
  filter: grayscale(0.6) brightness(0.6);
}

.coming-soon-ribbon {
  position: absolute;
  top: 18px;
  right: -52px;
  width: 180px;
  transform: rotate(45deg);
  background: #9b20b7;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-align: center;
  padding: 5px 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* ---- Body ---- */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  flex: 1;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
}

.card-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #c0b8cc;
  flex: 1;
}

/* ---- Meta row ---- */
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #a89bb6;
}

.meta-text {
  letter-spacing: 0.3px;
}

.meta-lock {
  margin-left: auto;
  color: #b98dc7;
  font-size: 12px;
}

/* ---- Action ---- */
.card-action {
  margin-top: 6px;
}

.card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px 14px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(180deg, #b228d2, #8313a0);
  border: 1px solid #7a1897;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.18s ease, filter 0.18s ease;
  box-sizing: border-box;
}

.card-btn:hover {
  filter: brightness(1.12);
}

.card-btn.disabled,
.card-btn:disabled {
  background: #3a2a4a;
  border-color: #4a3a5a;
  color: #9a9ab0;
  cursor: not-allowed;
  filter: none;
}

/* ---- Unlock form (revealed) ---- */
.unlock-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.password-row {
  display: flex;
  gap: 8px;
}

.password-input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #6a5880;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
}

.password-input::placeholder {
  color: #a89bb6;
}

.password-input:focus {
  outline: none;
  border-color: #b228d2;
  box-shadow: 0 0 0 2px rgba(178, 40, 210, 0.25);
}

.card-btn.icon-btn {
  width: 46px;
  flex-shrink: 0;
  padding: 11px 0;
}

.password-error {
  font-size: 12px;
  color: #ff7a8a;
}

/* ---- Reveal transition ---- */
.reveal-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.reveal-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

/* ---- Scrollbar ---- */
.downloads-grid::-webkit-scrollbar {
  width: 8px;
}

.downloads-grid::-webkit-scrollbar-track {
  background: transparent;
}

.downloads-grid::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #9b20b7, #6a1480);
  border-radius: 4px;
}

.downloads-grid::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #b228d2, #7c1894);
}
</style>

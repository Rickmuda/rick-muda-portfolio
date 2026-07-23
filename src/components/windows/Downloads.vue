<template>
  <div class="downloads-window">
    <!-- Download cards -->
    <div class="downloads-grid">
      <div
        v-for="item in visibleDownloads"
        :key="item.id"
        class="download-card"
        :class="{ 'is-coming-soon': isComingSoon(item) }"
      >
        <!-- Thumbnail -->
        <div class="card-thumb">
          <img :src="item.thumbnail" :alt="$t(item.titleKey)" class="card-thumb-img" loading="lazy" decoding="async" />
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
              <button
                v-if="!revealedIds[item.id]"
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

            <!-- Gated: file lives outside the web root and is streamed via
                 download.php, but no password is required -->
            <template v-else-if="item.gated">
              <button
                class="card-btn"
                type="button"
                :disabled="loadingIds[item.id]"
                @click="downloadGated(item)"
              >
                <font-awesome-icon icon="download" />
                {{ $t('download') }}
              </button>
              <span v-if="errors[item.id]" class="password-error">{{ errors[item.id] }}</span>
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
          // Not meant for mobile: hidden on phones (<=768px). Set false for
          // downloads that work fine on mobile.
          mobileUnavailable: true,
          // For unprotected downloads instead use: file: { url, name }
        },
        {
          id: "stickyreminders",
          titleKey: "dlStickyTitle",
          descKey: "dlStickyDesc",
          version: "v1.0",
          size: "",
          thumbnail: new URL("@/assets/img/downloads/sticky-icon.webp", import.meta.url).href,
          protected: true,
          available: true,
          // It's an Android APK: only installable on mobile, so it's hidden
          // on desktop.
          desktopUnavailable: true,
        },
        {
          id: "lunarhome",
          titleKey: "dlLunarTitle",
          descKey: "dlLunarDesc",
          version: "v1.0",
          size: "",
          thumbnail: new URL("@/assets/img/downloads/lunarhome_icon.webp", import.meta.url).href,
          protected: true,
          available: true,
          // Android APK: only installable on mobile, so it's hidden on desktop.
          desktopUnavailable: true,
        },
        {
          id: "playdeck",
          titleKey: "dlPlaydeckTitle",
          descKey: "dlPlaydeckDesc",
          version: "v1.5.1",
          size: "",
          thumbnail: new URL("@/assets/img/downloads/playdeck_icon.webp", import.meta.url).href,
          // Lives outside the web root (protected-files/) and is streamed via
          // public/download.php like the protected downloads, but no
          // password is required to fetch it.
          gated: true,
          available: true,
          // It's a Windows .exe: only runnable on desktop, so it's hidden on mobile.
          mobileUnavailable: true,
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
  computed: {
    // Only show downloads that make sense on the current device: mobile-only
    // downloads (e.g. an APK) are hidden on desktop and vice versa.
    visibleDownloads() {
      return this.downloads.filter((item) => !this.isDeviceUnavailable(item));
    },
  },
  methods: {
    isComingSoon(item) {
      if (item.protected || item.gated) return !item.available;
      return !item.file;
    },
    isDeviceUnavailable(item) {
      return this.isMobile ? !!item.mobileUnavailable : !!item.desktopUnavailable;
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
    // Streams the browser download from a download.php response's blob body,
    // falling back to the item id if no filename is in the response headers.
    triggerBlobDownload(response, blob, fallbackName) {
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : fallbackName;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
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

        const blob = await response.blob();
        this.triggerBlobDownload(response, blob, item.id);
        this.passwords[item.id] = "";
      } catch (error) {
        console.error("Download error:", error);
        this.errors[item.id] = this.$t("downloadError");
      } finally {
        this.loadingIds[item.id] = false;
      }
    },
    // Same download.php gatekeeper as unlock(), but for entries that require
    // no password - the file just lives outside the web root.
    async downloadGated(item) {
      this.errors[item.id] = "";
      this.loadingIds[item.id] = true;
      try {
        const response = await fetch("/download.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });

        if (!response.ok) {
          this.errors[item.id] = this.$t("downloadError");
          return;
        }

        const blob = await response.blob();
        this.triggerBlobDownload(response, blob, item.id);
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

/* Input above, submit button below - both centered as a group rather than
   stretched edge-to-edge, so the button reads as a single tappable target
   instead of a full-width bar. */
.password-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.password-input {
  width: 80%;
  max-width: 240px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #6a5880;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  text-align: center;
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

/* ---- Mobile ----
   Cards switch from a vertical poster layout to a horizontal, app-store-style
   list row: a rounded square icon on the left, title/description/meta on the
   right, and the action button spanning the full width underneath. */
@media (max-width: 768px) {
  .downloads-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px;
  }

  /* A grid, not a wrapping flex row: the icon and the title/description/meta
     text are explicit, independent columns, and the action button is placed
     on its own row spanning both columns underneath. Using flex here left
     the action row's height fighting for space inside the text column,
     which showed up as a dead gap between the meta row and the button. */
  .download-card {
    display: grid;
    grid-template-columns: 68px 1fr;
    column-gap: 14px;
    row-gap: 6px;
    padding: 14px;
    border-radius: 18px;
  }

  /* Avoid a hover state getting "stuck" after a tap; use a tactile press
     effect instead. */
  .download-card:hover {
    transform: none;
    border-color: #9b20b7;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45), 0 6px 16px rgba(0, 0, 0, 0.35);
  }

  .download-card:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  /* Unwraps .card-body so its children (title/desc/meta/action) become
     direct grid items of .download-card and can each be placed explicitly. */
  .card-body {
    display: contents;
  }

  .card-thumb {
    grid-column: 1;
    grid-row: 1 / span 3;
    align-self: center;
    width: 68px;
    height: 68px;
    aspect-ratio: unset;
    border-radius: 16px;
    border: none;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 3px 8px rgba(0, 0, 0, 0.4);
  }

  /* The diagonal desktop ribbon doesn't fit a small square icon; swap it for
     a compact corner badge. */
  .coming-soon-ribbon {
    top: 4px;
    left: 4px;
    right: auto;
    width: auto;
    transform: none;
    border-radius: 6px;
    font-size: 9px;
    padding: 3px 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .card-title {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    font-size: 15.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-desc {
    grid-column: 2;
    grid-row: 2;
    min-width: 0;
    font-size: 13px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-meta {
    grid-column: 2;
    grid-row: 3;
    font-size: 12px;
  }

  /* Full-width row underneath the icon/title block. */
  .card-action {
    grid-column: 1 / -1;
    grid-row: 4;
    margin-top: 4px;
  }

  .card-btn {
    padding: 12px 14px;
    font-size: 14px;
    border-radius: 10px;
    -webkit-tap-highlight-color: transparent;
  }

  /* A slightly bigger, still-centered tap target than the desktop button. */
  .card-btn.icon-btn {
    width: 56px;
    padding: 13px 0;
  }

  /* 16px avoids iOS Safari auto-zooming the page when the input is focused. */
  .password-input {
    width: 85%;
    font-size: 16px;
    padding: 12px;
  }
}
</style>

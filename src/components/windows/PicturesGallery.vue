<template>
  <div class="pg-window">
    <!-- Thumbnail grid -->
    <div class="pg-grid">
      <button
        v-for="(image, i) in images"
        :key="i"
        class="pg-thumb"
        :title="image.name"
        @click="openFullscreen(i)"
      >
        <img :src="image.src" :alt="image.name" loading="lazy" decoding="async" />
      </button>
    </div>

    <!-- Fullscreen lightbox -->
    <Teleport to="body">
      <div v-if="fullscreen && currentImage" class="pg-lightbox" @click="closeFullscreen">
        <button
          v-if="images.length > 1"
          class="pg-arrow pg-arrow-left"
          aria-label="Previous"
          @click.stop="prevImage"
        >
          <font-awesome-icon icon="arrow-left" />
        </button>
        <img :src="currentImage.src" :alt="currentImage.name" class="pg-lightbox-img" />
        <button
          v-if="images.length > 1"
          class="pg-arrow pg-arrow-right"
          aria-label="Next"
          @click.stop="nextImage"
        >
          <font-awesome-icon icon="arrow-right" />
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { unlock as unlockAchievement } from "../../achievements";
import { projects as projectsData } from "../../projectsData";
import { galleryImages } from "../../galleryImages";

export default {
  name: "PicturesGallery",
  components: { FontAwesomeIcon },
  props: {
    // 'art' = the gallery artwork (non-project photos), 'projects' = project screenshots.
    source: { type: String, default: "art" },
    // Optional { photoSrc } set by the start-menu search to open a photo fullscreen.
    selection: { type: Object, default: null },
  },
  data() {
    return {
      fullscreen: false,
      fullscreenIndex: 0,
    };
  },
  computed: {
    images() {
      if (this.source === "projects") {
        const out = [];
        for (const p of projectsData) {
          const title = this.$t(p.titleKey);
          p.images.forEach((src, i) => {
            out.push({ src, name: p.images.length > 1 ? `${title} (${i + 1})` : title });
          });
        }
        return out;
      }
      return galleryImages;
    },
    currentImage() {
      return this.images[this.fullscreenIndex] || null;
    },
  },
  watch: {
    source() {
      this.fullscreen = false;
      this.fullscreenIndex = 0;
    },
    selection() {
      this.applySelection();
    },
  },
  methods: {
    // Open a photo fullscreen when the start-menu search points us at one.
    applySelection() {
      if (!this.selection || !this.selection.photoSrc) return;
      const idx = this.images.findIndex((im) => im.src === this.selection.photoSrc);
      if (idx >= 0) this.openFullscreen(idx);
    },
    openFullscreen(i) {
      this.fullscreenIndex = i;
      this.fullscreen = true;
      unlockAchievement("art-collector");
    },
    closeFullscreen() {
      this.fullscreen = false;
    },
    nextImage() {
      const n = this.images.length;
      this.fullscreenIndex = (this.fullscreenIndex + 1) % n;
    },
    prevImage() {
      const n = this.images.length;
      this.fullscreenIndex = (this.fullscreenIndex - 1 + n) % n;
    },
    onKeydown(e) {
      if (!this.fullscreen) return;
      if (e.key === "Escape") this.closeFullscreen();
      else if (e.key === "ArrowRight") this.nextImage();
      else if (e.key === "ArrowLeft") this.prevImage();
    },
  },
  mounted() {
    window.addEventListener("keydown", this.onKeydown);
    this.applySelection();
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.onKeydown);
  },
};
</script>

<style scoped>
.pg-window {
  height: 100%;
  width: 100%;
  background: #1a1a24;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: "PortfolioFont", sans-serif;
}

.pg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
  padding: 16px;
  align-content: start;
}

.pg-thumb {
  border: 2px solid #4f115d;
  border-radius: 8px;
  background: #0a0a0f;
  padding: 0;
  cursor: zoom-in;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.pg-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pg-thumb:hover {
  transform: translateY(-2px);
  border-color: #c637e6;
}

.pg-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1400;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
  padding: 24px;
}

.pg-lightbox-img {
  max-width: 92%;
  max-height: 92%;
  object-fit: contain;
  border: 3px solid #fff;
  border-radius: 8px;
}

.pg-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: rgba(155, 32, 183, 0.7);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.pg-arrow:hover {
  background: rgba(155, 32, 183, 1);
}

.pg-arrow-left {
  left: 24px;
}

.pg-arrow-right {
  right: 24px;
}
</style>

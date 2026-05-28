<template>
  <div class="photo-viewer">
    <div class="viewer-top">
      <span>Photo {{ selectedImageIndex + 1 }} / {{ artGalleryImages.length }}</span>
      <button
        class="fullscreen-btn"
        :aria-label="$t('viewFullscreen')"
        :title="$t('viewFullscreen')"
        @click="openFullscreen"
      >
        <font-awesome-icon icon="expand" />
      </button>
    </div>
    <div class="viewer-canvas" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <button
        v-if="selectedImageIndex > 0"
        class="nav-arrow left"
        aria-label="Vorige foto"
        @click="previousImage"
      >
        &#8249;
      </button>
      <transition :name="slideName">
        <img
          :key="selectedImageIndex"
          :src="artGalleryImages[selectedImageIndex]"
          alt="Selected Art"
          class="main-photo"
          loading="lazy"
          decoding="async"
          @click="openFullscreen"
        />
      </transition>
      <button
        v-if="selectedImageIndex < artGalleryImages.length - 1"
        class="nav-arrow right"
        aria-label="Volgende foto"
        @click="nextImage"
      >
        &#8250;
      </button>
    </div>
    <div class="viewer-strip" ref="strip">
      <button
        v-for="(image, index) in artGalleryImages"
        :key="index"
        class="thumb"
        :class="{ active: selectedImageIndex === index }"
        @click="selectImage(index)"
      >
        <img
          :src="selectedImageIndex === index || !image.endsWith('.gif') ? image : (frozenGifFrames[index] || image)"
          alt="Art thumbnail"
          loading="lazy"
          decoding="async"
        />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="isFullscreen"
        class="lightbox-overlay"
        @click.self="closeFullscreen"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      >
        <button class="lightbox-close" :aria-label="$t('closeFullscreen')" @click="closeFullscreen">
          <font-awesome-icon icon="xmark" />
        </button>
        <button
          v-if="selectedImageIndex > 0"
          class="lightbox-nav left"
          aria-label="Previous"
          @click.stop="previousImage"
        >&#8249;</button>
        <img
          :src="artGalleryImages[selectedImageIndex]"
          class="lightbox-image"
          alt="Art fullscreen"
          @click.stop
        />
        <button
          v-if="selectedImageIndex < artGalleryImages.length - 1"
          class="lightbox-nav right"
          aria-label="Next"
          @click.stop="nextImage"
        >&#8250;</button>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { unlock as unlockAchievement } from "../../achievements";

export default {
  props: {
    // Optional { photoSrc } from the mobile search to open a photo fullscreen.
    selection: { type: Object, default: null },
  },
  data() {
    return {
      artGalleryImages: [
        new URL('@/assets/img/imggallery/fnf.webp', import.meta.url).href,
        new URL('@/assets/img/imggallery/panels.webp', import.meta.url).href,
        new URL('@/assets/img/imggallery/pepe.webp', import.meta.url).href,
        new URL('@/assets/img/imggallery/room.webp', import.meta.url).href,
        new URL('@/assets/img/imggallery/vtuber.webp', import.meta.url).href,
        new URL('@/assets/img/imggallery/pose.webp', import.meta.url).href,
        new URL('@/assets/img/imggallery/swag.webp', import.meta.url).href,
        new URL('@/assets/img/imggallery/dance.gif', import.meta.url).href,
      ],
      selectedImageIndex: 0,
      frozenGifFrames: {},
      touchStartX: 0,
      slideName: 'slide-next',
      isFullscreen: false,
    };
  },
  mounted() {
    this.extractGifFirstFrames();
    window.addEventListener('keydown', this.handleKeydown);
    this.applySelection();
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
  },
  watch: {
    selectedImageIndex() {
      this.$nextTick(this.scrollActiveThumb);
    },
    selection() {
      this.applySelection();
    },
  },
  methods: {
    extractGifFirstFrames() {
      this.artGalleryImages.forEach((image, index) => {
        if (image.endsWith('.gif')) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            this.frozenGifFrames = { ...this.frozenGifFrames, [index]: canvas.toDataURL() };
          };
          img.src = image;
        }
      });
    },
    nextImage() {
      if (this.selectedImageIndex < this.artGalleryImages.length - 1) {
        this.slideName = 'slide-next';
        this.selectedImageIndex += 1;
      }
    },
    previousImage() {
      if (this.selectedImageIndex > 0) {
        this.slideName = 'slide-prev';
        this.selectedImageIndex -= 1;
      }
    },
    selectImage(index) {
      if (index === this.selectedImageIndex) return;
      this.slideName = index > this.selectedImageIndex ? 'slide-next' : 'slide-prev';
      this.selectedImageIndex = index;
    },
    scrollActiveThumb() {
      const strip = this.$refs.strip;
      if (!strip) return;
      const active = strip.querySelector('.thumb.active');
      if (active) {
        active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    },
    handleKeydown(e) {
      if (e.key === 'ArrowRight') {
        this.nextImage();
      } else if (e.key === 'ArrowLeft') {
        this.previousImage();
      } else if (e.key === 'Escape' && this.isFullscreen) {
        this.closeFullscreen();
      }
    },
    applySelection() {
      if (!this.selection || !this.selection.photoSrc) return;
      const idx = this.artGalleryImages.findIndex((s) => s === this.selection.photoSrc);
      if (idx >= 0) {
        this.selectedImageIndex = idx;
        this.openFullscreen();
      }
    },
    openFullscreen() {
      if (this.isFullscreen) return;
      this.isFullscreen = true;
      unlockAchievement("art-collector");
    },
    closeFullscreen() {
      this.isFullscreen = false;
    },
    onTouchStart(e) {
      this.touchStartX = e.changedTouches[0].clientX;
    },
    onTouchEnd(e) {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(dx) > 40) {
        if (dx < 0) {
          this.nextImage();
        } else {
          this.previousImage();
        }
      }
    },
  },
};
</script>

<style scoped>
.photo-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1d1d1d;
  border: 2px solid #000;
}

.viewer-top {
  height: 36px;
  background: linear-gradient(180deg, #f6f7f9, #dfe6f2);
  border-bottom: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  color: #fff;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
}

.fullscreen-btn {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  text-shadow: inherit;
  transition: transform 0.15s ease;
}

.fullscreen-btn:hover {
  transform: scale(1.15);
}

.main-photo {
  cursor: zoom-in;
}

.viewer-canvas {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  min-height: 0;
  overflow: hidden;
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 48px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.4;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 2;
}

.nav-arrow.left {
  left: 12px;
}

.nav-arrow.right {
  right: 12px;
}

.photo-viewer:hover .nav-arrow {
  opacity: 1;
}

.nav-arrow:hover {
  transform: translateY(-50%) scale(1.15);
}

.nav-arrow:focus-visible {
  outline: 2px solid #9b20b7;
  outline-offset: 2px;
}

.main-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 16px;
  box-sizing: border-box;
}

/* Slide transition between photos (direction-aware) */
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-next-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-next-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-prev-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-prev-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.viewer-strip {
  height: 90px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px;
  border-top: 1px solid #444;
  background: #222;
}

.thumb {
  border: 2px solid transparent;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.thumb img {
  width: 100px;
  height: 70px;
  object-fit: cover;
  border-radius: 6px;
}

.thumb.active {
  border-color: #9b20b7;
}

@media (max-width: 768px) {
  .photo-viewer {
    height: 100%;
    overflow: hidden;
  }

  .nav-arrow {
    display: none !important;
  }

  .viewer-canvas {
    padding: 10px;
  }

  .viewer-strip {
    height: 72px;
  }

  .thumb img {
    width: 60px;
    height: 44px;
  }
}
</style>

<!-- Lightbox styles live in an unscoped block because <Teleport to="body"> moves
     the overlay outside this component's scope. -->
<style>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  animation: lightbox-fade-in 0.18s ease-out;
}

@keyframes lightbox-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.lightbox-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  cursor: default;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  color: #fff;
  font-size: 22px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: scale(1.08);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.35);
  border: none;
  color: #fff;
  font-size: 48px;
  line-height: 1;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.15s ease, transform 0.15s ease;
}

.lightbox-nav.left  { left: 16px; }
.lightbox-nav.right { right: 16px; }

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.08);
}

@media (max-width: 768px) {
  .lightbox-overlay { padding: 12px; }
  .lightbox-nav     { display: none; }
  .lightbox-close   { top: 8px; right: 8px; }
}
</style>

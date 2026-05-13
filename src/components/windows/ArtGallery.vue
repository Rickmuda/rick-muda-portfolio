<template>
  <div class="photo-viewer">
    <div class="viewer-top">
      <span>Photo {{ selectedImageIndex + 1 }} / {{ artGalleryImages.length }}</span>
    </div>
    <div class="viewer-canvas">
      <button
        v-if="selectedImageIndex > 0"
        class="nav-arrow left"
        aria-label="Vorige foto"
        @click="previousImage"
      >
        &#8249;
      </button>
      <img :src="artGalleryImages[selectedImageIndex]" alt="Selected Art" class="main-photo" />
      <button
        v-if="selectedImageIndex < artGalleryImages.length - 1"
        class="nav-arrow right"
        aria-label="Volgende foto"
        @click="nextImage"
      >
        &#8250;
      </button>
    </div>
    <div class="viewer-strip">
      <button
        v-for="(image, index) in artGalleryImages"
        :key="index"
        class="thumb"
        :class="{ active: selectedImageIndex === index }"
        @click="selectedImageIndex = index"
      >
        <img 
          :src="selectedImageIndex === index || !image.endsWith('.gif') ? image : (frozenGifFrames[index] || image)"
          alt="Art thumbnail"
        />
      </button>
    </div>
  </div>
</template>

<script>
export default {
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
    };
  },
  mounted() {
    this.extractGifFirstFrames();
    window.addEventListener('keydown', this.handleKeydown);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
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
        this.selectedImageIndex += 1;
      }
    },
    previousImage() {
      if (this.selectedImageIndex > 0) {
        this.selectedImageIndex -= 1;
      }
    },
    handleKeydown(e) {
      if (e.key === 'ArrowRight') {
        this.nextImage();
      } else if (e.key === 'ArrowLeft') {
        this.previousImage();
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
  padding: 0 12px;
  color: #fff;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
}

.viewer-canvas {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  min-height: 0;
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
  width: 100%;
  height: 100%;
  object-fit: contain;
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
</style>

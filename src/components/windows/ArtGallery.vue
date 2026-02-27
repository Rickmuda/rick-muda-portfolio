<template>
  <div class="photo-viewer">
    <div class="viewer-top">
      <span>Photo {{ selectedImageIndex + 1 }} / {{ artGalleryImages.length }}</span>
    </div>
    <div class="viewer-canvas">
      <img :src="artGalleryImages[selectedImageIndex]" alt="Selected Art" class="main-photo" />
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  min-height: 0;
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

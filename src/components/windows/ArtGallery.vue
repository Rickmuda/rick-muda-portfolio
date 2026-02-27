<template>
  <div class="photo-viewer">
    <div class="viewer-top">
      <span>Photo {{ selectedImageIndex + 1 }} / {{ artGalleryImages.length }}</span>
    </div>
    <div class="viewer-canvas">
      <button class="nav-btn" @click="previousImage">◀</button>
      <img :src="artGalleryImages[selectedImageIndex]" alt="Selected Art" class="main-photo" />
      <button class="nav-btn" @click="nextImage">▶</button>
    </div>
    <div class="viewer-strip">
      <button
        v-for="(image, index) in artGalleryImages"
        :key="index"
        class="thumb"
        :class="{ active: selectedImageIndex === index }"
        @click="openImage(index)"
      >
        <img :src="image" alt="Art thumbnail" />
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
        new URL('@/assets/img/imggallery/dance.gif', import.meta.url).href,
      ],
      selectedImageIndex: 0,
    };
  },
  methods: {
    openImage(index) {
      this.selectedImageIndex = index;
    },
    nextImage() {
      this.selectedImageIndex =
        (this.selectedImageIndex + 1) % this.artGalleryImages.length;
    },
    previousImage() {
      this.selectedImageIndex =
        (this.selectedImageIndex - 1 + this.artGalleryImages.length) %
        this.artGalleryImages.length;
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
  color: #222;
}

.viewer-canvas {
  flex: 1;
  display: grid;
  grid-template-columns: 50px 1fr 50px;
  gap: 10px;
  align-items: center;
  padding: 16px;
}

.main-photo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #111;
  border: 1px solid #666;
}

.nav-btn {
  height: 44px;
  border-radius: 6px;
  border: 1px solid #7f17a0;
  background: #9b20b7;
  color: white;
  cursor: pointer;
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
}

.thumb.active {
  border-color: #9b20b7;
}
</style>
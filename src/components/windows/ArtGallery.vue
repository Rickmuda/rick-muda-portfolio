<template>
<<<<<<< Updated upstream
  <div class="art-gallery">
    <div class="gallery-grid">
      <div
=======
  <div class="photo-viewer">
    <div class="viewer-top">
      <span>Photo {{ selectedImageIndex + 1 }} / {{ artGalleryImages.length }}</span>
    </div>
    <div class="viewer-canvas">
      <img :src="artGalleryImages[selectedImageIndex]" alt="Selected Art" class="main-photo" />
    </div>
    <div class="viewer-strip">
      <button
>>>>>>> Stashed changes
        v-for="(image, index) in artGalleryImages"
        :key="index"
        class="gallery-item"
        @click="openImage(index)"
      >
<<<<<<< Updated upstream
        <img :src="image" alt="Art" class="gallery-image" />
      </div>
=======
        <img 
          :src="selectedImageIndex === index || !image.endsWith('.gif') ? image : (frozenGifFrames[index] || image)"
          alt="Art thumbnail"
        />
      </button>
>>>>>>> Stashed changes
    </div>
    <teleport to="body">
      <div
        v-if="selectedImageIndex !== null"
        class="image-modal"
        @click.self="closeImage" 
      >
        <button class="arrow left-arrow" @click="previousImage">&#9664;</button>
        <img :src="artGalleryImages[selectedImageIndex]" alt="Selected Art" class="modal-image" />
        <button class="arrow right-arrow" @click="nextImage">&#9654;</button>
        <button class="close-modal" @click="closeImage">
          <span>X</span>
        </button>
      </div>
    </teleport>
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
<<<<<<< Updated upstream
      selectedImageIndex: null, // Track the index of the selected image
=======
      selectedImageIndex: 0,
      frozenGifFrames: {},
>>>>>>> Stashed changes
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
    openImage(index) {
      this.selectedImageIndex = index; // Open the modal with the selected image index
    },
    closeImage() {
      this.selectedImageIndex = null; // Close the modal
    },
    nextImage() {
      // Go to the next image, loop back to the first if at the end
      this.selectedImageIndex =
        (this.selectedImageIndex + 1) % this.artGalleryImages.length;
    },
    previousImage() {
      // Go to the previous image, loop back to the last if at the beginning
      this.selectedImageIndex =
        (this.selectedImageIndex - 1 + this.artGalleryImages.length) %
        this.artGalleryImages.length;
    },
  },
};
<<<<<<< Updated upstream
</script>
=======
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
>>>>>>> Stashed changes

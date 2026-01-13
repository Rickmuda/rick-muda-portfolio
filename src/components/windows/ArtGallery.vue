<template>
  <div class="art-gallery">
    <div class="gallery-grid">
      <div
        v-for="(image, index) in artGalleryImages"
        :key="index"
        class="gallery-item"
        @click="openImage(index)"
      >
        <img :src="image" alt="Art" class="gallery-image" />
      </div>
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
        new URL('@/assets/img/imggallery/dance.gif', import.meta.url).href,
      ],
      selectedImageIndex: null, // Track the index of the selected image
    };
  },
  methods: {
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
</script>
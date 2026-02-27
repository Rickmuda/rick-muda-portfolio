<template>
  <div class="login-screen">
    <div class="center-box">
      <img src="/src/assets/img/pfp.webp" alt="Profile Picture" class="center-image" />
<<<<<<< Updated upstream
    </div>
    
    <!-- Mobile Slide Login -->
    <div v-if="isMobile" class="slide-container">
      <div class="slide-track" @click="startSliding" @touchstart="startSliding">
        <div class="slide-bar" :style="{ width: slideProgress + '%' }"></div>
        <div class="slide-handle" :style="{ left: slideProgress + '%' }"></div>
=======
      <h2 class="welcome-title">Rick Muda Portfolio</h2>

      <div v-if="showIntro" class="boot-sequence">
        <p class="boot-line">{{ bootMessage }}</p>
        <div class="boot-progress">
          <div class="boot-progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
>>>>>>> Stashed changes
      </div>
    </div>
    
    <!-- Desktop Password Login -->
    <div v-else class="password-box">
      <form @submit.prevent="checkPasswordLength">
        <!-- Hidden username field for accessibility -->
        <input
          type="text"
          name="username"
          autocomplete="username"
          style="display: none;"
        />
        <input
          type="password"
          v-model="passwordInput"
          class="password-input"
          placeholder="Enter 6 random keys"
          autocomplete="new-password"
          readonly
        />
      </form>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      passwordInput: "", // Manage passwordInput locally
      isMobile: false,
      slideProgress: 0,
      isSliding: false
    };
  },
  methods: {
    detectMobile() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      this.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                     window.innerWidth <= 768;
    },
    startSliding() {
      if (this.isSliding) return;
      
      this.isSliding = true;
      
      const slideInterval = setInterval(() => {
        this.slideProgress += 5; // Increased from 3 to 5 for faster animation
        
        if (this.slideProgress >= 100) {
          clearInterval(slideInterval);
          this.slideProgress = 100;
          
          setTimeout(() => {
            this.$emit("login");
          }, 200); // Reduced delay from 500ms to 200ms
        }
      }, 20); // Reduced from 30ms to 20ms for smoother, faster animation
    },
    simulateTyping() {
      const keys = ["a", "b", "c", "d", "e", "f"]; // Simulated keys
      let index = 0;

      const typingInterval = setInterval(() => {
        if (index < keys.length) {
          this.passwordInput += keys[index]; // Simulate typing
          index++;
        } else {
          clearInterval(typingInterval); // Stop typing
          this.checkPasswordLength(); // Automatically log in after typing
        }
      }, 200); // Simulate typing every 200ms
    },
    checkPasswordLength() {
      // Simulate a successful login
      this.$emit("login"); // Emit the login event to the parent component
    },
  },
  mounted() {
    this.detectMobile();
    
    if (!this.isMobile) {
      this.simulateTyping(); // Start simulating typing when the component is mounted
    } else {
      // Auto-start sliding after a delay on mobile
      setTimeout(() => {
        this.startSliding();
      }, 1000); // Reduced delay from 1500ms to 1000ms
    }
    
    // Listen for resize events to re-detect mobile
    window.addEventListener('resize', this.detectMobile);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.detectMobile);
  }
};
</script>
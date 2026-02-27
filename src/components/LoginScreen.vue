<template>
  <div class="login-screen">
    <div class="login-card">
      <img src="/src/assets/img/pfp.webp" alt="Profile Picture" class="center-image" />
      <h2 class="welcome-title">Rick Muda Portfolio</h2>
      <p class="welcome-subtitle">Version 3.0.0</p>

      <div v-if="showIntro" class="boot-sequence">
        <p class="boot-line">{{ bootMessage }}</p>
        <div class="boot-progress">
          <div class="boot-progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>

      <button v-else class="enter-button" @click="enterDesktop">
        Enter Desktop
      </button>
    </div>
  </div>
</template>

<script>
const INTRO_STORAGE_KEY = "portfolio-login-intro-seen-v3";

export default {
  data() {
    return {
      showIntro: true,
      progress: 0,
      bootMessage: "Preparing desktop...",
      introInterval: null,
    };
  },
  methods: {
    startIntro() {
      const seenIntro = localStorage.getItem(INTRO_STORAGE_KEY) === "true";

      if (seenIntro) {
        this.showIntro = false;
        return;
      }

      this.showIntro = true;
      this.progress = 0;
      this.bootMessage = "Preparing desktop...";

      this.introInterval = setInterval(() => {
        this.progress += 4;

        if (this.progress >= 30) {
          this.bootMessage = "Loading window manager...";
        }
        if (this.progress >= 65) {
          this.bootMessage = "Applying portfolio theme...";
        }
        if (this.progress >= 95) {
          this.bootMessage = "Ready.";
        }

        if (this.progress >= 100) {
          clearInterval(this.introInterval);
          this.introInterval = null;
          localStorage.setItem(INTRO_STORAGE_KEY, "true");
          setTimeout(() => this.enterDesktop(), 250);
        }
      }, 45);
    },
    enterDesktop() {
      this.$emit("login");
    },
  },
  mounted() {
    this.startIntro();
  },
  beforeUnmount() {
    if (this.introInterval) {
      clearInterval(this.introInterval);
      this.introInterval = null;
    }
  }
};
</script>

<style scoped>
.login-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.login-card {
  width: min(520px, 92vw);
  border: 4px solid #8404a1;
  border-radius: 16px;
  background: rgba(43, 8, 51, 0.9);
  padding: 24px;
  color: #fff;
  text-align: center;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.center-image {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 12px;
  border: 3px solid #9b20b7;
}

.welcome-title {
  margin-top: 16px;
  font-size: 28px;
}

.welcome-subtitle {
  opacity: 0.9;
  margin-bottom: 18px;
}

.boot-sequence {
  text-align: left;
  border: 2px solid #9b20b7;
  border-radius: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.35);
}

.boot-line {
  margin-bottom: 10px;
}

.boot-progress {
  width: 100%;
  height: 12px;
  border-radius: 99px;
  border: 1px solid #a948bf;
  overflow: hidden;
}

.boot-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8404a1, #9b20b7);
  transition: width 0.2s ease;
}

.enter-button {
  margin-top: 8px;
  background: #9b20b7;
  border: 2px solid #8404a1;
  color: #fff;
  border-radius: 8px;
  padding: 10px 18px;
  cursor: pointer;
  font-family: inherit;
}
</style>
<template>
  <div class="login-screen">
    <div class="center-box">
      <img src="/src/assets/img/pfp.webp" alt="Profile Picture" class="center-image" />
      <h2 class="welcome-title">Rick Muda Portfolio</h2>

      <div v-if="showIntro" class="boot-sequence">
        <p class="boot-line">{{ bootMessage }}</p>
        <div class="boot-progress">
          <div class="boot-progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>
    </div>
    
    <!-- Password Login -->
    <div v-if="!showIntro" class="password-box">
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
      passwordInput: "",
      showIntro: true,
      bootMessage: "Loading portfolio...",
      progress: 0
    };
  },
  methods: {
    runBootSequence() {
      const messages = [
        "Loading portfolio...",
        "Initializing components...",
        "Loading assets...",
        "Almost ready..."
      ];
      let messageIndex = 0;

      const bootInterval = setInterval(() => {
        this.progress += 2;

        if (this.progress >= 25 && messageIndex < 1) {
          messageIndex = 1;
          this.bootMessage = messages[messageIndex];
        } else if (this.progress >= 50 && messageIndex < 2) {
          messageIndex = 2;
          this.bootMessage = messages[messageIndex];
        } else if (this.progress >= 75 && messageIndex < 3) {
          messageIndex = 3;
          this.bootMessage = messages[messageIndex];
        }

        if (this.progress >= 100) {
          clearInterval(bootInterval);
          this.showIntro = false;
          this.simulateTyping();
        }
      }, 30);
    },
    simulateTyping() {
      const keys = ["a", "b", "c", "d", "e", "f"];
      let index = 0;

      const typingInterval = setInterval(() => {
        if (index < keys.length) {
          this.passwordInput += keys[index];
          index++;
        } else {
          clearInterval(typingInterval);
          this.checkPasswordLength();
        }
      }, 200);
    },
    checkPasswordLength() {
      this.$emit("login");
    },
  },
  mounted() {
    this.runBootSequence();
  }
};
</script>

<style scoped>
.login-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
  padding-bottom: 100px;
}

.center-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.center-image {
  width: 180px;
  height: 180px;
  object-fit: cover;
  border-radius: 50%;
  border: 4px solid #9b20b7;
  box-shadow: 0 0 20px rgba(155, 32, 183, 0.5);
}

.welcome-title {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  margin: 10px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.boot-sequence {
  text-align: center;
  margin-top: 20px;
}

.boot-line {
  color: #d99be8;
  font-size: 14px;
  margin-bottom: 10px;
}

.boot-progress {
  width: 200px;
  height: 8px;
  background: #2a2a3a;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #9b20b7;
}

.boot-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9b20b7, #d99be8);
  transition: width 0.1s ease;
}

.password-box {
  margin-top: 20px;
}

.password-input {
  width: 220px;
  padding: 12px 16px;
  border: 2px solid #9b20b7;
  border-radius: 8px;
  background: #1a1a24;
  color: #fff;
  font-size: 16px;
  text-align: center;
  letter-spacing: 8px;
}

.password-input:focus {
  outline: none;
  border-color: #d99be8;
  box-shadow: 0 0 10px rgba(155, 32, 183, 0.3);
}

.password-input::placeholder {
  color: #888;
  letter-spacing: 0;
}
</style>

<template>
  <div class="messenger-window">
    <!-- Certificate overlay backdrop -->
    <div 
      v-if="hasCertificateExpanded" 
      class="certificate-backdrop"
      @click="closeAllCertificates"
    ></div>
    
    <aside class="messenger-sidebar">
      <img src="/src/assets/img/self-image-1.webp" alt="Rick" class="avatar" />
      <p class="status">Rick · Online</p>
    </aside>

    <section class="messenger-chat">
      <div class="chat-log" ref="chatLog">
        <div v-for="(item, index) in chatLog" :key="index" class="chat-entry">
          <div class="bubble bubble-question" v-if="item.question">
            <span class="bubble-author">You</span>
            {{ item.question }}
          </div>
          <div v-if="item.answer" class="bubble bubble-answer">
            <span class="bubble-author">Rick</span>
            {{ item.answer }}
          </div>
          <!-- File download box -->
          <div v-if="item.file" class="bubble bubble-answer file-bubble">
            <span class="bubble-author">Rick</span>
            <a :href="item.file.url" :download="item.file.name" class="file-download">
              <span class="file-icon">📄</span>
              <span class="file-info">
                <span class="file-name">{{ item.file.name }}</span>
                <span class="file-hint">Click to download</span>
              </span>
            </a>
          </div>
          <!-- Social icons box -->
          <div v-if="item.socials" class="bubble bubble-answer socials-bubble">
            <span class="bubble-author">Rick</span>
            <div class="chat-socials">
              <a href="https://twitter.com/Rick_rickerd" target="_blank" rel="noopener noreferrer" class="chat-social-icon" aria-label="Twitter">
                <font-awesome-icon :icon="['fab', 'twitter']" />
              </a>
              <a href="https://www.instagram.com/rick_muda/" target="_blank" rel="noopener noreferrer" class="chat-social-icon" aria-label="Instagram">
                <font-awesome-icon :icon="['fab', 'instagram']" />
              </a>
              <a href="https://www.linkedin.com/in/rick-ambergen-30b73a29a/" target="_blank" rel="noopener noreferrer" class="chat-social-icon" aria-label="LinkedIn">
                <font-awesome-icon :icon="['fab', 'linkedin']" />
              </a>
              <a href="https://github.com/rickmuda" target="_blank" rel="noopener noreferrer" class="chat-social-icon" aria-label="GitHub">
                <font-awesome-icon :icon="['fab', 'github']" />
              </a>
              <a href="https://www.youtube.com/channel/UCHSimkVEkXs0Xp1U4nInA0w" target="_blank" rel="noopener noreferrer" class="chat-social-icon" aria-label="YouTube">
                <font-awesome-icon :icon="['fab', 'youtube']" />
              </a>
              <a href="https://www.tiktok.com/@rick_muda" target="_blank" rel="noopener noreferrer" class="chat-social-icon" aria-label="TikTok">
                <font-awesome-icon :icon="['fab', 'tiktok']" />
              </a>
              <a href="https://open.spotify.com/user/rick_rickerd_rickman" target="_blank" rel="noopener noreferrer" class="chat-social-icon" aria-label="Spotify">
                <font-awesome-icon :icon="['fab', 'spotify']" />
              </a>
              <a href="https://steamcommunity.com/id/rick_muda/" target="_blank" rel="noopener noreferrer" class="chat-social-icon" aria-label="Steam">
                <font-awesome-icon :icon="['fab', 'steam']" />
              </a>
            </div>
          </div>
          <!-- Certificates box -->
          <div v-if="item.certificates" class="bubble bubble-answer certificates-bubble">
            <span class="bubble-author">Rick</span>
            <div class="chat-certificates">
              <div 
                v-for="(cert, certIndex) in certificatesList" 
                :key="certIndex"
                class="chat-certificate"
                :class="{ expanded: expandedCertificates[certIndex] }"
                @click.stop="toggleCertificate(certIndex)"
              >
                <img :src="cert.image" :alt="cert.title" />
                <span class="cert-title">{{ cert.title }}</span>
                <span v-if="expandedCertificates[certIndex]" class="cert-close-hint">Click to close</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="isTyping" class="chat-entry">
          <div class="bubble bubble-answer typing-bubble">
            <span class="bubble-author">Rick</span>
            <span class="typing-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </span>
          </div>
        </div>
      </div>

      <div class="quick-options">
        <button
          v-for="option in allOptions"
          :key="option.key"
          class="option-button"
          :class="{ used: usedKeys.includes(option.key), waiting: isTyping && !usedKeys.includes(option.key) }"
          :disabled="isTyping || usedKeys.includes(option.key)"
          @click="pickOption(option)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

export default {
  components: {
    FontAwesomeIcon,
  },
  data() {
    return {
      allOptions: [
        { key: "about", label: this.$t("tellMeAboutYourself") },
        { key: "projects", label: this.$t("showMeYourProjects") },
        { key: "skills", label: this.$t("whatAreYourSkills") },
        { key: "cv", label: this.$t("canISeeYourCV") || "Can I see your CV?" },
        { key: "socials", label: this.$t("whatAreYourSocials") || "What are your socials?" },
        { key: "certificates", label: this.$t("showMeYourCertificates") || "Show me your certificates." },
      ],
      responses: {},
      // Multi-message sequences for all options
      sequences: {},
      usedKeys: [],
      chatLog: [
        {
          answer: this.$t("greeting"),
        },
      ],
      isTyping: false,
      expandedCertificates: {},
      certificatesList: [
        {
          title: "Rat Tickling",
          image: new URL('@/assets/img/certificates/rattickling.webp', import.meta.url).href
        },
        {
          title: "Church of Dudeism",
          image: new URL('@/assets/img/certificates/dudeism.webp', import.meta.url).href
        },
      ],
    };
  },
  created() {
    this.sequences = {
      about: [
        this.$t("aboutMeNerd"),
        this.$t("aboutMeGadgets"),
        this.$t("aboutMeVinyls"),
        this.$t("aboutMeGames"),
        this.$t("aboutMeBooks"),
      ],
      projects: [
        this.$t("projectsIntro"),
        this.$t("projectsGithub"),
      ],
      skills: [
        this.$t("skillsIntro"),
        this.$t("skillsLanguages"),
        this.$t("skillsBackEnd"),
      ],
      cv: [
        this.$t("cvSure"),
      ],
      socials: [
        this.$t("socialsIntro"),
      ],
      certificates: [
        this.$t("certificatesIntro"),
      ],
    };
  },
  computed: {
    availableOptions() {
      return this.allOptions.filter((o) => !this.usedKeys.includes(o.key));
    },
    hasCertificateExpanded() {
      return Object.values(this.expandedCertificates).some(expanded => expanded);
    },
  },
  methods: {
    closeAllCertificates() {
      this.expandedCertificates = {};
    },
    pickOption(option) {
      if (this.isTyping) return;

      // Mark option as used
      this.usedKeys.push(option.key);

      // Show user message immediately
      this.chatLog.push({
        question: option.label,
        answer: null,
      });
      this.scrollToBottom();

      this.playSequence(option.key);
    },

    async playSequence(key) {
      const messages = this.sequences[key];
      if (!messages || messages.length === 0) return;
      this.isTyping = true;
      this.scrollToBottom();

      for (let i = 0; i < messages.length; i++) {
        const delay = 800 + Math.random() * 700;
        await this.wait(delay);

        if (i === 0) {
          // Fill in the answer on the user's question entry
          this.chatLog[this.chatLog.length - 1].answer = messages[i];
        } else {
          // Subsequent messages appear as standalone Rick messages
          this.chatLog.push({
            question: null,
            answer: messages[i],
          });
        }
        this.scrollToBottom();
      }

      // If this is the CV option, append the file download entry
      if (key === "cv") {
        const delay = 600 + Math.random() * 400;
        await this.wait(delay);
        this.chatLog.push({
          question: null,
          answer: null,
          file: {
            name: "Rick_Ambergen_CV.pdf",
            url: "/cv/Rick_Ambergen_CV.pdf",
          },
        });
        this.scrollToBottom();
      }

      // If this is the socials option, append the social icons entry
      if (key === "socials") {
        const delay = 600 + Math.random() * 400;
        await this.wait(delay);
        this.chatLog.push({
          question: null,
          answer: null,
          socials: true,
        });
        this.scrollToBottom();
      }

      // If this is the certificates option, append the certificates entry
      if (key === "certificates") {
        const delay = 600 + Math.random() * 400;
        await this.wait(delay);
        this.chatLog.push({
          question: null,
          answer: null,
          certificates: true,
        });
        this.scrollToBottom();
      }

      this.isTyping = false;
      this.scrollToBottom();
    },

    wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const log = this.$refs.chatLog;
        if (log) log.scrollTop = log.scrollHeight;
      });
    },
    toggleCertificate(index) {
      this.expandedCertificates = {
        ...this.expandedCertificates,
        [index]: !this.expandedCertificates[index]
      };
    },
  },
};
</script>

<style scoped>
.messenger-window {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  border: 2px solid #1a1a1a;
  background: #2b2b3a;
  font-size: 15px;
  line-height: 1.6;
  overflow: hidden;
  position: relative;
}

/* ---- Certificate backdrop ---- */
.certificate-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999;
  cursor: pointer;
}

/* ---- Sidebar ---- */
.messenger-sidebar {
  border-right: 1px solid #3e3e52;
  background: linear-gradient(180deg, #33334a, #2a2a40);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 14px;
  overflow: hidden;
}

.avatar {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid #9b20b7;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  flex-shrink: 0;
}

.status {
  color: #5cd64e;
  font-weight: 700;
  font-size: 14px;
  margin: 0;
}

/* ---- Fun Facts ---- */
.fun-facts {
  width: 85%;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid #4a4a60;
  border-radius: 6px;
  padding: 7px 10px;
}

.fun-facts-title {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  color: #c77dda;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fun-facts-list {
  list-style: "★ ";
  padding-left: 16px;
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: #c8c8d4;
}

.fun-facts-list li {
  margin-bottom: 2px;
}

/* ---- Chat area ---- */
.messenger-chat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: #2f2f42;
  min-height: 0;
  overflow: hidden;
}

.chat-log {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #3e3e52;
  border-radius: 6px;
  padding: 14px;
  background: #1e1e2e;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chat-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ---- Bubbles ---- */
.bubble {
  padding: 10px 14px;
  border-radius: 10px;
  max-width: 85%;
  font-size: 14.5px;
  line-height: 1.55;
  word-wrap: break-word;
}

.bubble-author {
  display: block;
  font-weight: 700;
  font-size: 12px;
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.bubble-question {
  align-self: flex-end;
  background: #3a3a55;
  color: #dcdce6;
  border-bottom-right-radius: 2px;
}

.bubble-question .bubble-author {
  color: #9a9ab0;
}

.bubble-answer {
  align-self: flex-start;
  background: #44365a;
  border: 1px solid #5a4870;
  color: #e0dae6;
  border-bottom-left-radius: 2px;
}

.bubble-answer .bubble-author {
  color: #c77dda;
}

/* ---- Quick options ---- */
.quick-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.option-button {
  border: 1px solid #4f115d;
  background: #9b20b7;
  color: #fff;
  border-radius: 5px;
  padding: 10px 8px;
  font-family: inherit;
  font-size: 13.5px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.option-button:hover:not(:disabled) {
  background: #8313a0;
}

.option-button:disabled {
  cursor: not-allowed;
}

.option-button.waiting {
  background: #5a2d6e;
  border-color: #4a2060;
  color: #b0a0bb;
  opacity: 0.6;
  cursor: default;
}

.option-button.used {
  background: #3a2a4a;
  border-color: #3a2a4a;
  color: #7a7a8e;
  opacity: 0.7;
  cursor: default;
}

.option-button.used:hover {
  background: #3a2a4a;
}

/* ---- File download bubble ---- */
.file-bubble {
  padding: 10px 14px;
}

.file-download {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid #5a4870;
  border-radius: 8px;
  text-decoration: none;
  color: #e0dae6;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.file-download:hover {
  background: rgba(155, 32, 183, 0.2);
  border-color: #9b20b7;
}

.file-icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.file-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #e0dae6;
}

.file-hint {
  font-size: 11px;
  color: #9a9ab0;
}

/* ---- Social icons in chat ---- */
.socials-bubble {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-socials {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  animation: fadeInSocials 0.4s ease-out;
}

.chat-social-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(155, 32, 183, 0.3);
  border: 1px solid #9b20b7;
  border-radius: 8px;
  color: #c77dda;
  font-size: 18px;
  text-decoration: none;
  transition: all 0.2s ease;
  animation: slideInIcon 0.3s ease-out backwards;
}

.chat-social-icon:nth-child(1) { animation-delay: 0.05s; }
.chat-social-icon:nth-child(2) { animation-delay: 0.1s; }
.chat-social-icon:nth-child(3) { animation-delay: 0.15s; }
.chat-social-icon:nth-child(4) { animation-delay: 0.2s; }
.chat-social-icon:nth-child(5) { animation-delay: 0.25s; }
.chat-social-icon:nth-child(6) { animation-delay: 0.3s; }
.chat-social-icon:nth-child(7) { animation-delay: 0.35s; }
.chat-social-icon:nth-child(8) { animation-delay: 0.4s; }

.chat-social-icon:hover {
  background: rgba(155, 32, 183, 0.6);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(155, 32, 183, 0.4);
}

@keyframes fadeInSocials {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInIcon {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---- Certificates in chat ---- */
.certificates-bubble {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-certificates {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  position: relative;
}

.chat-certificate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  position: relative;
}

.chat-certificate img {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  border: 2px solid #9b20b7;
}

.chat-certificate:hover img {
  border-color: #c77dda;
  box-shadow: 0 4px 12px rgba(155, 32, 183, 0.4);
}

.chat-certificate.expanded {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  padding: 16px;
  background: #2b2b3a;
  border-radius: 12px;
  border: 2px solid #9b20b7;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.chat-certificate.expanded img {
  width: auto;
  height: auto;
  max-width: 80vw;
  max-height: 70vh;
  object-fit: contain;
}

.cert-title {
  font-size: 11px;
  color: #b98dc7;
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.chat-certificate.expanded .cert-title {
  max-width: none;
  font-size: 14px;
  color: #fff;
  margin-top: 10px;
}

.cert-close-hint {
  font-size: 11px;
  color: #9a9ab0;
  margin-top: 6px;
}

/* ---- Typing indicator ---- */
.typing-bubble {
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
}

.typing-dots {
  display: flex;
  gap: 5px;
  align-items: center;
  height: 20px;
}

.typing-dots .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c77dda;
  animation: typingBounce 1.2s infinite ease-in-out;
}

.typing-dots .dot:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots .dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typingBounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* ---- Mobile ---- */
@media (max-width: 900px) {
  .messenger-window {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .messenger-sidebar {
    border-right: none;
    border-bottom: 1px solid #3e3e52;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .avatar {
    width: 48px;
    height: 48px;
  }

  .fun-facts {
    width: auto;
    flex: 1;
    margin-top: 0;
  }
}
</style>

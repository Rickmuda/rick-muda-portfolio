<template>
  <Transition name="boot-fade">
    <div v-if="visible" class="boot-screen">
      <div class="boot-logo">MudaOS</div>
      <div class="boot-version">v{{ version }}</div>
      <div class="boot-lines">
        <div v-for="(line, i) in shownLines" :key="i" class="boot-line">
          {{ line }}
        </div>
      </div>
      <div class="boot-spinner"></div>
    </div>
  </Transition>
</template>

<script>
import { sounds } from "../sounds";

const LINES = [
  "POST: CPU @ 4.20 GHz ... OK",
  "Mounting /home/rick ... OK",
  "Loading window manager ... OK",
  "Booting MudaOS desktop ...",
  "Welcome.",
];

export default {
  name: "BootScreen",
  data() {
    return {
      visible: true,
      shownLines: [],
      version: __COMMIT_SUMMARY__,
    };
  },
  mounted() {
    sounds.play("boot");
    let i = 0;
    const next = () => {
      if (i >= LINES.length) {
        setTimeout(() => {
          this.visible = false;
          this.$emit("done");
        }, 400);
        return;
      }
      this.shownLines.push(LINES[i++]);
      setTimeout(next, 220);
    };
    setTimeout(next, 250);
  },
};
</script>

<style scoped>
.boot-screen {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: radial-gradient(circle at 50% 40%, #4a0d5c 0%, #1a1a24 70%, #000 100%);
  color: #d4a8e8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: "PortfolioFont", monospace;
  text-shadow: 0 0 8px rgba(155, 32, 183, 0.6);
  user-select: none;
}

.boot-logo {
  font-size: 56px;
  font-weight: 800;
  letter-spacing: 4px;
  color: #fff;
  margin-bottom: 6px;
}

.boot-version {
  font-size: 13px;
  color: #9b20b7;
  margin-bottom: 32px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.boot-lines {
  width: min(360px, 80vw);
  min-height: 140px;
  font-size: 13px;
  color: #b98dc7;
  line-height: 1.6;
  text-align: left;
}

.boot-line {
  animation: line-in 0.12s ease;
}

@keyframes line-in {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: 1; transform: translateY(0); }
}

.boot-spinner {
  margin-top: 28px;
  width: 28px;
  height: 28px;
  border: 3px solid rgba(155, 32, 183, 0.3);
  border-top-color: #c637e6;
  border-radius: 50%;
  animation: boot-spin 0.8s linear infinite;
}

@keyframes boot-spin {
  to { transform: rotate(360deg); }
}

.boot-fade-leave-active {
  transition: opacity 0.35s ease;
}
.boot-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .boot-logo { font-size: 40px; }
  .boot-lines { font-size: 12px; min-height: 120px; }
}
</style>

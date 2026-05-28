<template>
  <!-- Teleported to <body> so it escapes the .background stacking context and
       renders above windows + taskbar. -->
  <Teleport to="body">
    <transition name="info-fade">
      <div
        v-if="node"
        class="info-card"
        :style="cardStyle"
        @mousedown.stop
        @contextmenu.prevent.stop
      >
        <div class="info-card-head">
          <span class="info-card-icon">
            <font-awesome-icon :icon="node.icon || 'circle-info'" />
          </span>
          <span class="info-card-title">{{ node.name || $t(node.labelKey) }}</span>
        </div>
        <div class="info-card-desc">{{ $t(node.descKey) }}</div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const CARD_W = 240;
const CARD_H = 150;

export default {
  name: "InfoCard",
  components: { FontAwesomeIcon },
  props: {
    // null when hidden, otherwise a VFS node.
    node: { type: Object, default: null },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  emits: ["close"],
  computed: {
    cardStyle() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = Math.max(8, Math.min(this.x, vw - CARD_W - 8));
      const top = Math.max(8, Math.min(this.y, vh - CARD_H - 8));
      return { left: left + "px", top: top + "px", width: CARD_W + "px" };
    },
  },
  watch: {
    node(val) {
      if (val) this.addListeners();
      else this.removeListeners();
    },
  },
  methods: {
    addListeners() {
      document.addEventListener("mousedown", this.onDocMouseDown);
      document.addEventListener("keydown", this.onKeydown);
    },
    removeListeners() {
      document.removeEventListener("mousedown", this.onDocMouseDown);
      document.removeEventListener("keydown", this.onKeydown);
    },
    onDocMouseDown() {
      // A mousedown inside the card is stopped via @mousedown.stop, so reaching
      // here means the click landed outside - dismiss.
      this.$emit("close");
    },
    onKeydown(e) {
      if (e.key === "Escape") this.$emit("close");
    },
  },
  beforeUnmount() {
    this.removeListeners();
  },
};
</script>

<style scoped>
.info-card {
  position: fixed;
  z-index: 1300;
  background: linear-gradient(180deg, #2a1a35, #1b1024);
  border: 2px solid #8404a1;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
  padding: 14px;
  color: #fff;
  font-family: "PortfolioFont", sans-serif;
}

.info-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.info-card-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #9b20b7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
}

.info-card-title {
  font-size: 15px;
  font-weight: 700;
  word-break: break-word;
}

.info-card-desc {
  font-size: 13px;
  line-height: 1.4;
  color: #e6d3f0;
}

.info-fade-enter-active,
.info-fade-leave-active {
  transition: opacity 0.12s ease;
}

.info-fade-enter-from,
.info-fade-leave-to {
  opacity: 0;
}
</style>

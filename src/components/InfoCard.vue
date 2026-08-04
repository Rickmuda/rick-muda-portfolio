<template>
  <!-- Teleported to <body> so it escapes the .background stacking context and
       renders above windows + taskbar. -->
  <Teleport to="body">
    <transition name="info-fade">
      <div
        v-if="node"
        ref="card"
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
        <div class="info-card-actions" v-if="actions.length">
          <button
            v-for="a in actions"
            :key="a.key"
            type="button"
            class="info-card-action"
            @click="runAction(a)"
          >
            <font-awesome-icon :icon="a.icon" />
            {{ a.label }}
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const CARD_W = 240;
// Fallback used only before the card has rendered once (ref not measured yet).
const CARD_H_FALLBACK = 150;

export default {
  name: "InfoCard",
  components: { FontAwesomeIcon },
  props: {
    // null when hidden, otherwise a VFS node.
    node: { type: Object, default: null },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    // Optional action buttons: { key, icon, label, onClick }[]
    actions: { type: Array, default: () => [] },
  },
  emits: ["close"],
  data() {
    return { cardH: CARD_H_FALLBACK };
  },
  computed: {
    cardStyle() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = Math.max(8, Math.min(this.x, vw - CARD_W - 8));
      const top = Math.max(8, Math.min(this.y, vh - this.cardH - 8));
      return { left: left + "px", top: top + "px", width: CARD_W + "px" };
    },
  },
  watch: {
    node(val) {
      if (val) {
        this.addListeners();
        this.$nextTick(this.measure);
      } else {
        this.removeListeners();
      }
    },
    actions() {
      this.$nextTick(this.measure);
    },
  },
  methods: {
    measure() {
      const el = this.$refs.card;
      if (el) this.cardH = el.offsetHeight;
    },
    runAction(a) {
      a.onClick();
      this.$emit("close");
    },
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

.info-card-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.info-card-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: rgba(155, 32, 183, 0.25);
  border: 1px solid rgba(155, 32, 183, 0.5);
  border-radius: 6px;
  color: #fff;
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.info-card-action:hover,
.info-card-action:focus-visible {
  background: rgba(155, 32, 183, 0.45);
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

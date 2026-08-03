<template>
  <Teleport to="body">
    <Transition name="ach-pop">
      <div v-if="current" class="ach-toast" :key="current.id">
        <div class="ach-icon">
          <font-awesome-icon :icon="current.icon" />
        </div>
        <div class="ach-text">
          <div class="ach-tag">{{ $t('achievementUnlocked') }}</div>
          <div class="ach-title">{{ $t(current.titleKey) }}</div>
          <div class="ach-desc">{{ $t(current.descKey) }}</div>
        </div>
      </div>
    </Transition>
    <!-- Permanently-mounted (not v-if-toggled) live region: some screen readers
         only watch live regions that were already present before the content
         inside them changes, so this can't be the same element the toast uses. -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ liveMessage }}</div>
  </Teleport>
</template>

<script>
import { onUnlock } from "../achievements";
import { sounds } from "../sounds";

export default {
  name: "AchievementToast",
  data() {
    return {
      queue: [],
      current: null,
      liveMessage: "",
      _unsubscribe: null,
      _timeout: null,
    };
  },
  mounted() {
    this._unsubscribe = onUnlock((ach) => {
      this.queue.push(ach);
      this.showNext();
    });
  },
  beforeUnmount() {
    if (this._unsubscribe) this._unsubscribe();
    if (this._timeout) clearTimeout(this._timeout);
  },
  methods: {
    showNext() {
      if (this.current || !this.queue.length) return;
      this.current = this.queue.shift();
      this.liveMessage = `${this.$t("achievementUnlocked")}: ${this.$t(this.current.titleKey)} — ${this.$t(this.current.descKey)}`;
      sounds.play("open");
      this._timeout = setTimeout(() => {
        this.current = null;
        this._timeout = setTimeout(() => this.showNext(), 250);
      }, 3200);
    },
  },
};
</script>

<style>
.ach-toast {
  position: fixed;
  bottom: 80px;
  right: 24px;
  z-index: 100000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(180deg, #2a2a35, #1f1f2d);
  border: 2px solid #c637e6;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 32px rgba(155, 32, 183, 0.4);
  color: #fff;
  font-family: "PortfolioFont", sans-serif;
  max-width: 340px;
}

.ach-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #9b20b7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.ach-text { min-width: 0; }

.ach-tag {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  /* Lighter than the usual #c637e6 brand purple - at this size/weight the
     brand shade is only ~3.7:1 against this background, below the 4.5:1 AA
     text threshold. This shade clears it comfortably (~7.8:1). */
  color: #e0a3f5;
  font-weight: 700;
}

.ach-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-top: 1px;
}

.ach-desc {
  font-size: 12px;
  color: #c0b8cc;
  margin-top: 2px;
}

.ach-pop-enter-active,
.ach-pop-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.ach-pop-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.ach-pop-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@media (prefers-reduced-motion: reduce) {
  .ach-pop-enter-active,
  .ach-pop-leave-active {
    transition: none !important;
  }
}

@media (max-width: 768px) {
  .ach-toast {
    bottom: 12px;
    right: 12px;
    left: 12px;
    max-width: none;
  }
}
</style>

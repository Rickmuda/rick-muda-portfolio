<template>
  <div class="ach-window">
    <header class="ach-header">
      <h2>{{ $t('achievements') }}</h2>
      <div class="ach-progress">{{ unlockedCount }} / {{ achievements.length }}</div>
    </header>
    <div class="ach-grid">
      <div
        v-for="ach in achievements"
        :key="ach.id"
        class="ach-card"
        :class="{ locked: !isUnlocked(ach.id) }"
      >
        <div class="ach-card-icon">
          <font-awesome-icon :icon="isUnlocked(ach.id) ? ach.icon : 'lock'" />
        </div>
        <div class="ach-card-body">
          <div class="ach-card-title">
            {{ isUnlocked(ach.id) ? $t(ach.titleKey) : "???" }}
          </div>
          <div class="ach-card-desc">
            {{ isUnlocked(ach.id) ? $t(ach.descKey) : $t('achievementLocked') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { achievements, isUnlocked, unlockedIds } from "../../achievements";

export default {
  name: "Achievements",
  data() {
    return {
      achievements,
      // re-render trigger via mounted re-read of unlockedIds
      tick: 0,
    };
  },
  computed: {
    unlockedCount() {
      return unlockedIds().length;
    },
  },
  methods: {
    isUnlocked,
  },
};
</script>

<style scoped>
.ach-window {
  height: 100%;
  background: #1a1a24;
  color: #fff;
  border: 2px solid #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ach-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(180deg, #2a2a35, #1f1f2d);
  border-bottom: 2px solid #4f115d;
}

.ach-header h2 {
  margin: 0;
  font-size: 18px;
}

.ach-progress {
  background: #9b20b7;
  border: 1px solid #c637e6;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
}

.ach-grid {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.ach-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(155, 32, 183, 0.12);
  border: 1px solid #4f115d;
  border-radius: 8px;
}

.ach-card.locked {
  opacity: 0.55;
  background: rgba(255, 255, 255, 0.04);
}

.ach-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #9b20b7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.ach-card.locked .ach-card-icon {
  background: #2a2a35;
  color: #6a647a;
}

.ach-card-body { min-width: 0; }

.ach-card-title {
  font-weight: 700;
  font-size: 14px;
  color: #fff;
}

.ach-card-desc {
  font-size: 12px;
  color: #c0b8cc;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .ach-grid {
    grid-template-columns: 1fr;
  }
}
</style>

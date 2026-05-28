<template>
  <!-- Teleported to <body> so it escapes the .background stacking context and
       sits above the taskbar + windows on desktop (and over everything on
       mobile, where there is no taskbar). -->
  <Teleport to="body">
    <transition name="folder-fade">
      <div v-if="folder" class="folder-overlay" @click.self="$emit('close')">
        <div class="folder-panel">
          <div class="folder-panel-title">{{ $t(folder.labelKey) }}</div>
          <div class="folder-panel-grid">
            <div
              class="folder-icon"
              :class="{ 'is-coming-soon': item.comingSoon }"
              v-for="item in folder.items"
              :key="item.name"
              @click="item.comingSoon || $emit('open', item.name)"
            >
              <div class="folder-icon-image">
                <font-awesome-icon :icon="item.icon" class="folder-icon-inner" />
              </div>
              <div class="folder-icon-text">{{ $t(item.labelKey) }}</div>
              <div v-if="item.comingSoon" class="folder-icon-soon">{{ $t('comingSoon') }}</div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

export default {
  name: "FolderOverlay",
  components: { FontAwesomeIcon },
  props: {
    // null when closed, otherwise a folder descriptor: { labelKey, items }.
    folder: {
      type: Object,
      default: null,
    },
  },
  emits: ["close", "open"],
};
</script>

<style scoped>
.folder-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.folder-panel {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.folder-panel-title {
  color: #fff;
  font-weight: bold;
  text-align: center;
  margin-bottom: 16px;
  font-size: 16px;
  font-family: 'PortfolioFont', sans-serif;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
    1px 1px 0 #000;
}

.folder-panel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  justify-items: center;
  align-items: start;
}

.folder-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  max-width: 110px;
}

.folder-icon-image {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: #9b20b7;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease;
}

.folder-icon:hover .folder-icon-image {
  transform: scale(1.06);
}

.folder-icon-image:active {
  transform: scale(0.94);
}

.folder-icon-inner {
  font-size: 30px;
  color: #fff;
}

.folder-icon-text {
  margin-top: 8px;
  font-size: 13px;
  color: #fff;
  font-weight: bold;
  text-align: center;
  line-height: 1.2;
  word-wrap: break-word;
  font-family: 'PortfolioFont', sans-serif;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
    1px 1px 0 #000;
}

.folder-icon.is-coming-soon {
  opacity: 0.45;
  cursor: not-allowed;
}

.folder-icon-soon {
  margin-top: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #d4a8e8;
}

.folder-fade-enter-active,
.folder-fade-leave-active {
  transition: opacity 0.2s ease;
}

.folder-fade-enter-from,
.folder-fade-leave-to {
  opacity: 0;
}
</style>

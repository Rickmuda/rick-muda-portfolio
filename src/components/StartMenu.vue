<template>
  <div class="start-menu" @click.stop>
    <!-- Search -->
    <div class="sm-search">
      <font-awesome-icon icon="magnifying-glass" class="sm-search-icon" />
      <input
        v-model="query"
        class="sm-search-input"
        type="text"
        :placeholder="$t('startSearch')"
        spellcheck="false"
      />
    </div>

    <!-- Pinned apps / search results (apps, folders, projects and photos) -->
    <div class="sm-section">
      <div class="sm-section-head">{{ searching ? $t('startResults') : $t('startPinned') }}</div>
      <div class="sm-pins">
        <button
          v-for="r in results"
          :key="r.id"
          class="sm-pin"
          @click="onResult(r)"
        >
          <span class="sm-pin-icon">
            <img v-if="r.kind === 'photo'" :src="r.src" :alt="r.label" class="sm-pin-thumb" />
            <font-awesome-icon v-else :icon="r.icon" />
          </span>
          <span class="sm-pin-label">{{ r.label }}</span>
        </button>
        <div v-if="!results.length" class="sm-no-results">{{ $t('startNoResults') }}</div>
      </div>
    </div>

    <!-- Recommended: surfaces the current version / latest update (hidden while searching) -->
    <div class="sm-section" v-if="!searching">
      <div class="sm-section-head">{{ $t('startRecommended') }}</div>
      <div class="sm-version-card">
        <span class="sm-version-icon"><font-awesome-icon icon="circle-info" /></span>
        <div class="sm-version-text">
          <div class="sm-version-title">{{ $t('currentVersion') }}: {{ commitSummary }}</div>
          <div class="sm-version-desc">{{ commitDescription }}</div>
        </div>
      </div>
    </div>

    <!-- Footer: user + power -->
    <div class="sm-footer">
      <div class="sm-user">
        <img src="/src/assets/img/pfp.webp" alt="" class="sm-user-pfp" />
        <span class="sm-user-name">Rick Muda</span>
      </div>
      <button class="sm-power" :title="$t('startPower')">
        <font-awesome-icon icon="power-off" />
      </button>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { getRootNodes } from "../filesystem";
import { projects as projectsData } from "../projectsData";
import { galleryImages } from "../galleryImages";

export default {
  components: { FontAwesomeIcon },
  props: {
    commitSummary: { type: String, required: true },
    commitDescription: { type: String, required: true },
    openNode: { type: Function, required: true },
    openExplorerAt: { type: Function, required: true },
  },
  emits: ["close"],
  data() {
    return {
      query: "",
    };
  },
  computed: {
    searching() {
      return this.query.trim().length > 0;
    },
    pins() {
      const explorer = { id: "__explorer", type: "explorer", icon: "folder-open", labelKey: "fileExplorer" };
      return [explorer, ...getRootNodes()];
    },
    results() {
      const q = this.query.trim().toLowerCase();
      // No query: show the pinned apps/folders.
      if (!q) {
        return this.pins.map((n) => ({
          kind: "node",
          id: "n-" + n.id,
          label: n.name || this.$t(n.labelKey),
          icon: n.icon,
          node: n,
        }));
      }
      // Query: apps/folders + projects + art photos that match.
      const out = [];
      for (const n of this.pins) {
        const label = n.name || this.$t(n.labelKey) || "";
        if (label.toLowerCase().includes(q)) {
          out.push({ kind: "node", id: "n-" + n.id, label, icon: n.icon, node: n });
        }
      }
      for (const p of projectsData) {
        const label = this.$t(p.titleKey);
        if (label.toLowerCase().includes(q)) {
          out.push({ kind: "project", id: "p-" + p.titleKey, label, icon: "folder", titleKey: p.titleKey });
        }
      }
      for (const im of galleryImages) {
        if (im.name.toLowerCase().includes(q)) {
          out.push({ kind: "photo", id: "img-" + im.name, label: im.name, icon: "image", src: im.src });
        }
      }
      return out;
    },
  },
  methods: {
    onResult(r) {
      if (r.kind === "node") {
        this.openNode(r.node);
      } else if (r.kind === "project") {
        // Open the Projects folder and select that project.
        this.openExplorerAt(["projects"], { projectTitleKey: r.titleKey });
      } else if (r.kind === "photo") {
        // Open the Art folder and show that photo fullscreen.
        this.openExplorerAt(["pictures", "art"], { photoSrc: r.src });
      }
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
/* Windows 11-style start panel, anchored above the centered start button. */
.start-menu {
  position: fixed;
  left: 50%;
  right: auto;
  bottom: 70px;
  top: auto;
  transform: translateX(-50%);
  width: min(620px, 94vw);
  max-height: 74vh;
  height: auto;
  background: rgba(32, 22, 42, 0.92);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(196, 55, 230, 0.4);
  border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
  z-index: 1200;
  display: flex;
  flex-direction: column;
  padding: 18px;
  gap: 14px;
  font-family: "PortfolioFont", sans-serif;
  color: #fff;
  overflow: hidden;
  animation: smRise 0.16s ease-out;
}

@keyframes smRise {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}

.sm-search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  padding: 9px 16px;
  flex-shrink: 0;
}

.sm-search-icon {
  color: #d4a8e8;
  font-size: 14px;
}

.sm-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
}

.sm-search-input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.sm-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.sm-section-head {
  font-size: 13px;
  font-weight: 700;
  color: #e6d3f0;
}

.sm-pins {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  overflow-y: auto;
}

.sm-pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 12px 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #fff;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.sm-pin:hover {
  background: rgba(255, 255, 255, 0.12);
}

.sm-pin-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #9b20b7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  color: #fff;
  overflow: hidden;
}

.sm-pin-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sm-pin-label {
  text-align: center;
  line-height: 1.15;
  word-break: break-word;
  width: 100%;
}

.sm-no-results {
  grid-column: 1 / -1;
  padding: 16px;
  text-align: center;
  color: #b6a6c4;
  font-size: 13px;
}

.sm-version-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
}

.sm-version-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(155, 32, 183, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.sm-version-title {
  font-size: 13px;
  font-weight: 700;
}

.sm-version-desc {
  font-size: 12px;
  color: #c0b8cc;
  margin-top: 2px;
}

.sm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  padding-top: 12px;
  flex-shrink: 0;
}

.sm-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sm-user-pfp {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.sm-user-name {
  font-size: 14px;
  font-weight: 600;
}

.sm-power {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease;
}

.sm-power:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>

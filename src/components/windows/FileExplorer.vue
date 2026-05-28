<template>
  <div class="file-explorer">
    <!-- Toolbar: back / up / breadcrumb -->
    <div class="fe-toolbar">
      <button class="fe-nav" :disabled="!canBack" :title="$t('explorerBack')" @click="goBack">
        <font-awesome-icon icon="arrow-left" />
      </button>
      <button class="fe-nav" :disabled="!canUp" :title="$t('explorerUp')" @click="goUp">
        <font-awesome-icon icon="arrow-up" />
      </button>
      <div class="fe-crumbs">
        <template v-for="(crumb, i) in crumbs" :key="i">
          <span class="fe-crumb" @click="navigateTo(crumb.ids)">{{ crumb.label }}</span>
          <span v-if="i < crumbs.length - 1" class="fe-crumb-sep">/</span>
        </template>
      </div>
    </div>

    <div class="fe-body">
      <!-- Sidebar: folder tree -->
      <div class="fe-sidebar">
        <div
          class="fe-tree-row"
          :class="{ active: isActivePath([]) }"
          @click="navigateTo([])"
        >
          <font-awesome-icon icon="house" class="fe-tree-icon" />
          <span>{{ $t('desktopRoot') }}</span>
        </div>
        <div
          v-for="row in folderTree"
          :key="row.ids.join('/')"
          class="fe-tree-row"
          :class="{ active: isActivePath(row.ids) }"
          :style="{ paddingLeft: 12 + row.depth * 16 + 'px' }"
          @click="navigateTo(row.ids)"
        >
          <font-awesome-icon
            :icon="row.node.icon"
            class="fe-tree-icon"
          />
          <span>{{ row.node.name || $t(row.node.labelKey) }}</span>
        </div>
      </div>

      <!-- Main pane: an embedded view for component-backed folders, otherwise an
           icon grid of the current folder's children. -->
      <div
        class="fe-main"
        :class="{ 'fe-main-embed': currentComponent }"
        @click="selectedId = null"
        @contextmenu.prevent
      >
        <component v-if="currentComponent" :is="currentComponent" v-bind="currentComponentProps" :selection="selection" />
        <template v-else>
          <div v-if="!items.length" class="fe-empty">{{ $t('desktopRoot') }}</div>
          <div class="fe-grid" v-else>
            <div
              v-for="node in items"
              :key="node.id"
              class="fe-item"
              :class="{ selected: selectedId === node.id }"
              @click.stop="onItemClick(node)"
              @contextmenu.prevent.stop="onItemContext(node, $event)"
            >
              <div class="fe-item-icon">
                <font-awesome-icon :icon="node.icon" />
              </div>
              <div class="fe-item-label">{{ node.name || $t(node.labelKey) }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <InfoCard :node="infoNode" :x="infoX" :y="infoY" @close="infoNode = null" />
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import InfoCard from "../InfoCard.vue";
import { vfsRoot, resolvePath, listChildren } from "../../filesystem";

export default {
  name: "FileExplorer",
  components: { FontAwesomeIcon, InfoCard },
  props: {
    // Current folder path as an array of node ids ([] = root). Controlled by App.vue.
    path: { type: Array, default: () => [] },
    // Dispatcher from App.vue that opens apps and files (NOT folders - we navigate those).
    openNode: { type: Function, default: null },
    // Optional selection target passed to the embedded folder component (search).
    selection: { type: Object, default: null },
    isMobile: { type: Boolean, default: false },
  },
  emits: ["update:path"],
  data() {
    return {
      selectedId: null,
      history: [],
      navigatingBack: false,
      infoNode: null,
      infoX: 0,
      infoY: 0,
    };
  },
  computed: {
    items() {
      return listChildren(this.path);
    },
    currentNode() {
      return resolvePath(this.path);
    },
    currentComponent() {
      return this.currentNode && this.currentNode.component ? this.currentNode.component : null;
    },
    currentComponentProps() {
      return (this.currentNode && this.currentNode.componentProps) || {};
    },
    canUp() {
      return this.path.length > 0;
    },
    canBack() {
      return this.history.length > 0;
    },
    crumbs() {
      const out = [{ label: this.$t("desktopRoot"), ids: [] }];
      const acc = [];
      for (const id of this.path) {
        acc.push(id);
        const node = resolvePath([...acc]);
        out.push({
          label: node ? node.name || this.$t(node.labelKey) : id,
          ids: [...acc],
        });
      }
      return out;
    },
    // Folder tree for the sidebar. A folder's children are only listed when that
    // folder is "open" - i.e. it lies on the current path (expand-on-navigate).
    folderTree() {
      const path = this.path;
      const onPath = (ids) => ids.length <= path.length && ids.every((id, i) => id === path[i]);
      const rows = [];
      const walk = (nodes, depth, parentIds) => {
        for (const node of nodes) {
          if (node.type !== "folder") continue;
          const ids = [...parentIds, node.id];
          const expanded = onPath(ids);
          rows.push({ node, depth, ids, expanded });
          if (node.children && expanded) walk(node.children, depth + 1, ids);
        }
      };
      walk(vfsRoot.children, 0, []);
      return rows;
    },
  },
  watch: {
    path(newVal, oldVal) {
      // Record history on every navigation except a Back action.
      if (this.navigatingBack) {
        this.navigatingBack = false;
      } else {
        this.history.push([...oldVal]);
      }
      this.selectedId = null;
      this.infoNode = null;
    },
  },
  methods: {
    isActivePath(ids) {
      return ids.length === this.path.length && ids.every((id, i) => id === this.path[i]);
    },
    navigateTo(ids) {
      if (this.isActivePath(ids)) return;
      this.$emit("update:path", ids);
    },
    goUp() {
      if (this.canUp) this.navigateTo(this.path.slice(0, -1));
    },
    goBack() {
      if (!this.canBack) return;
      const prev = this.history.pop();
      this.navigatingBack = true;
      this.$emit("update:path", prev);
    },
    onItemClick(node) {
      // Single-click opens: folders navigate this window, everything else routes
      // through the App dispatcher (apps launch their window).
      if (node.type === "folder") {
        this.navigateTo([...this.path, node.id]);
      } else if (this.openNode) {
        this.openNode(node);
      }
    },
    onItemContext(node, e) {
      this.selectedId = node.id;
      this.infoNode = node;
      this.infoX = e.clientX;
      this.infoY = e.clientY;
    },
  },
};
</script>

<style scoped>
.file-explorer {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a24;
  color: #fff;
  font-family: "PortfolioFont", sans-serif;
}

.fe-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #20202c;
  border-bottom: 2px solid #000;
}

.fe-nav {
  width: 32px;
  height: 32px;
  border: 1px solid #4f115d;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease;
}

.fe-nav:hover:not(:disabled) {
  background: rgba(155, 32, 183, 0.3);
}

.fe-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.fe-crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 13px;
  margin-left: 6px;
}

.fe-crumb {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.fe-crumb:hover {
  background: rgba(155, 32, 183, 0.3);
}

.fe-crumb-sep {
  color: #8a7a95;
}

.fe-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.fe-sidebar {
  flex-shrink: 0;
  width: 200px;
  background: #16161f;
  border-right: 2px solid #000;
  overflow-y: auto;
  padding: 8px 0;
}

.fe-tree-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fe-tree-row:hover {
  background: rgba(155, 32, 183, 0.18);
}

.fe-tree-row.active {
  background: rgba(155, 32, 183, 0.32);
}

.fe-tree-icon {
  color: #d4a8e8;
  width: 16px;
}

.fe-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
}

/* Embedded folder views (Projects/Downloads/Pictures) fill the pane themselves. */
.fe-main.fe-main-embed {
  padding: 0;
  overflow: hidden;
  display: flex;
}

.fe-main.fe-main-embed > * {
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
}

.fe-empty {
  color: #8a7a95;
  font-size: 14px;
  text-align: center;
  margin-top: 40px;
}

.fe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 14px;
  align-content: start;
}

.fe-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.fe-item:hover {
  background: rgba(155, 32, 183, 0.15);
}

.fe-item.selected {
  background: rgba(155, 32, 183, 0.3);
  border-color: #c637e6;
}

.fe-item-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #9b20b7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
}

.fe-item-label {
  font-size: 12px;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
}
</style>

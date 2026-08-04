<template>
  <div class="desktop" @mousedown.self="selectedId = null" @contextmenu.prevent="onDesktopContext">
    <div
      v-for="node in nodes"
      :key="node.id"
      class="app-icon"
      :class="{ selected: selectedId === node.id, dragging: draggingId === node.id }"
      :style="iconStyle(node)"
      tabindex="0"
      role="button"
      @mousedown.stop="onMouseDown(node, $event)"
      @click.stop="onClick(node)"
      @contextmenu.prevent.stop="onContext(node, $event)"
      @keydown.enter="onClick(node)"
      @keydown.space.prevent="onClick(node)"
    >
      <div class="app-icon-image">
        <font-awesome-icon :icon="node.icon" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ node.name || $t(node.labelKey) }}</div>
    </div>

    <InfoCard :node="infoNode" :x="infoX" :y="infoY" :actions="infoActions" @close="infoNode = null" />

    <!-- Right-click-on-empty-desktop menu: change wallpaper / auto-arrange icons. -->
    <Teleport to="body">
      <div
        v-if="desktopMenu"
        class="desktop-ctx-menu"
        :style="ctxMenuStyle"
        @mousedown.stop
        @contextmenu.prevent.stop
      >
        <template v-if="!wallpaperPickerOpen">
          <button type="button" class="ctx-item" @click="toggleWallpaperPicker">
            <font-awesome-icon icon="palette" />
            {{ $t('ctxChangeWallpaper') }}
          </button>
          <button type="button" class="ctx-item" @click="autoArrangeIcons">
            <font-awesome-icon icon="sitemap" />
            {{ $t('ctxAutoArrange') }}
          </button>
          <button type="button" class="ctx-item" @click="resetDesktopIcons">
            <font-awesome-icon icon="trash-can" />
            {{ $t('ctxResetDesktop') }}
          </button>
        </template>
        <div v-else class="ctx-wallpaper-grid">
          <button
            v-for="wp in wallpapers"
            :key="wp.id"
            type="button"
            class="ctx-wallpaper-thumb"
            :class="{ active: getCurrentWallpaperId() === wp.id }"
            :style="{ backgroundImage: wp.cssValue }"
            :title="$t(wp.labelKey)"
            :aria-label="$t(wp.labelKey)"
            @click="pickWallpaper(wp.id)"
          ></button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import InfoCard from "./InfoCard.vue";
import { getDesktopNodes, identityOf, findNodeByIdentity } from "../filesystem";
import { getPositions, setPosition, onChange as onLayoutChange } from "../desktopLayout";
import { wallpapers, getCurrentId as getCurrentWallpaperId, setCurrent as setWallpaper } from "../wallpapers";
import { getState as getDesktopIconsState, toggleDesktop, resetDesktop, onChange as onDesktopIconsChange } from "../desktopIcons";

// Larger cells than the icons themselves so dragged icons get breathing room.
const CELL_W = 124;
const CELL_H = 122;
const ORIGIN_X = 32;
const ORIGIN_Y = 28;
const ICON_W = 100;
const ICON_H = 104;
const TASKBAR_H = 60;
const DRAG_THRESHOLD = 5;

export default {
  name: "Desktop",
  components: { FontAwesomeIcon, InfoCard },
  props: {
    openNode: { type: Function, required: true },
    easterEggApps: { type: Array, required: true },
  },
  data() {
    return {
      // Dragged/persisted position overrides, keyed by node id: { id: {x,y} }.
      positions: {},
      selectedId: null,
      draggingId: null,
      // Live drag bookkeeping.
      dragNode: null,
      startX: 0,
      startY: 0,
      origX: 0,
      origY: 0,
      moved: false,
      justDragged: false,
      // Right-click info card.
      infoNode: null,
      infoX: 0,
      infoY: 0,
      infoActions: [],
      // Right-click-on-empty-desktop menu: null when hidden, else {x, y}.
      desktopMenu: null,
      wallpaperPickerOpen: false,
      wallpapers,
      // Viewport size (drives the default auto-grid; reflows on resize).
      vw: window.innerWidth,
      vh: window.innerHeight,
      layoutUnsub: null,
      // User-customized desktop icon set (removed defaults / added extras).
      desktopIconsState: getDesktopIconsState(),
      desktopIconsUnsub: null,
    };
  },
  computed: {
    nodes() {
      const explorer = {
        id: "__explorer",
        type: "explorer",
        labelKey: "fileExplorer",
        icon: "folder-open",
        descKey: "descFileExplorer",
      };
      const removedSet = new Set(this.desktopIconsState.removed);
      const defaultIcons = getDesktopNodes().filter((n) => !removedSet.has(identityOf(n)));
      const addedNodes = this.desktopIconsState.added.map((id) => findNodeByIdentity(id)).filter(Boolean);
      const eggs = this.easterEggApps.map((name) => ({
        id: name,
        type: "app",
        app: name,
        labelKey: "easterEgg",
        icon: "egg",
        descKey: "descApp",
      }));
      return [explorer, ...defaultIcons, ...addedNodes, ...eggs];
    },
    // Grid dimensions that fit the current viewport (drives both the default
    // layout and drag snapping, so everything aligns to one grid).
    gridCols() {
      // Span the full desktop width so icons can be dropped anywhere, including
      // the right-hand side (no artificial column cap).
      return Math.max(1, Math.floor((this.vw - 2 * ORIGIN_X) / CELL_W));
    },
    gridRows() {
      return Math.max(1, Math.floor((this.vh - TASKBAR_H - ORIGIN_Y) / CELL_H));
    },
    // Auto-grid fallback position for every node without a dragged/persisted
    // position. Cells already taken by a persisted position are reserved first
    // so a newly-added node can never default onto a cell someone dragged an
    // icon to - that was letting icons land on top of each other at startup.
    defaultPositions() {
      const cols = this.gridCols;
      const rows = this.gridRows;
      const totalCells = Math.max(cols * rows, this.nodes.length);
      const occupied = new Set();
      for (const node of this.nodes) {
        const stored = this.positions[node.id];
        if (!stored) continue;
        const { col, row } = this.cellFromPos(stored.x, stored.y);
        occupied.add(col + "," + row);
      }
      const map = {};
      let cursor = 0;
      for (const node of this.nodes) {
        if (this.positions[node.id]) continue;
        let steps = 0;
        while (steps <= totalCells) {
          const col = cursor % cols;
          const row = Math.floor(cursor / cols);
          const key = col + "," + row;
          cursor++;
          steps++;
          if (!occupied.has(key)) {
            occupied.add(key);
            map[node.id] = this.posFromCell(col, row);
            break;
          }
        }
      }
      return map;
    },
    // Clamped so the menu never renders partly off-screen, mirroring InfoCard's
    // own cardStyle clamping.
    ctxMenuStyle() {
      if (!this.desktopMenu) return {};
      const MENU_W = 220;
      const MENU_H = this.wallpaperPickerOpen ? 130 : 96;
      const left = Math.max(8, Math.min(this.desktopMenu.x, window.innerWidth - MENU_W - 8));
      const top = Math.max(8, Math.min(this.desktopMenu.y, window.innerHeight - MENU_H - 8));
      return { left: left + "px", top: top + "px" };
    },
  },
  methods: {
    getCurrentWallpaperId,
    effectivePos(node) {
      return this.positions[node.id] || this.defaultPositions[node.id] || { x: ORIGIN_X, y: ORIGIN_Y };
    },
    posFromCell(col, row) {
      return { x: ORIGIN_X + col * CELL_W, y: ORIGIN_Y + row * CELL_H };
    },
    cellFromPos(x, y) {
      const col = Math.max(0, Math.min(this.gridCols - 1, Math.round((x - ORIGIN_X) / CELL_W)));
      const row = Math.max(0, Math.min(this.gridRows - 1, Math.round((y - ORIGIN_Y) / CELL_H)));
      return { col, row };
    },
    // Grid cells occupied by every icon except the one being dragged.
    occupiedCells(exceptId) {
      const set = new Set();
      for (const node of this.nodes) {
        if (node.id === exceptId) continue;
        const p = this.effectivePos(node);
        const { col, row } = this.cellFromPos(p.x, p.y);
        set.add(col + "," + row);
      }
      return set;
    },
    // Nearest free cell to (col,row), searched in expanding rings.
    findFreeCell(col, row, occupied) {
      if (!occupied.has(col + "," + row)) return { col, row };
      const maxR = this.gridCols + this.gridRows;
      for (let r = 1; r <= maxR; r++) {
        for (let dc = -r; dc <= r; dc++) {
          for (let dr = -r; dr <= r; dr++) {
            if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue; // ring edge only
            const c = col + dc;
            const rr = row + dr;
            if (c < 0 || rr < 0 || c >= this.gridCols || rr >= this.gridRows) continue;
            if (!occupied.has(c + "," + rr)) return { col: c, row: rr };
          }
        }
      }
      return { col, row };
    },
    iconStyle(node) {
      const p = this.effectivePos(node);
      return { left: p.x + "px", top: p.y + "px" };
    },
    onMouseDown(node, e) {
      // Icons stop mousedown propagation, so the InfoCard's outside-click
      // listener never fires for icon-to-icon clicks - close it explicitly.
      this.infoNode = null;
      if (e.button !== 0) return; // left button only; right opens the info card
      const p = this.effectivePos(node);
      this.dragNode = node;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.origX = p.x;
      this.origY = p.y;
      this.moved = false;
      document.addEventListener("mousemove", this.onDocMouseMove);
      document.addEventListener("mouseup", this.onDocMouseUp);
    },
    onDocMouseMove(e) {
      if (!this.dragNode) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      if (!this.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      this.moved = true;
      this.draggingId = this.dragNode.id;
      const maxX = Math.max(0, this.vw - ICON_W);
      const maxY = Math.max(0, this.vh - TASKBAR_H - ICON_H);
      const x = Math.max(0, Math.min(this.origX + dx, maxX));
      const y = Math.max(0, Math.min(this.origY + dy, maxY));
      this.positions = { ...this.positions, [this.dragNode.id]: { x, y } };
    },
    onDocMouseUp() {
      document.removeEventListener("mousemove", this.onDocMouseMove);
      document.removeEventListener("mouseup", this.onDocMouseUp);
      if (this.moved && this.dragNode) {
        // Snap to the nearest grid cell, then bump to the closest free cell so
        // icons never stack on top of each other.
        const cur = this.positions[this.dragNode.id];
        const { col, row } = this.cellFromPos(cur.x, cur.y);
        const free = this.findFreeCell(col, row, this.occupiedCells(this.dragNode.id));
        const snapped = this.posFromCell(free.col, free.row);
        this.positions = { ...this.positions, [this.dragNode.id]: snapped };
        setPosition(this.dragNode.id, snapped);
        this.justDragged = true;
        // Clear after the trailing click/dblclick has been swallowed.
        setTimeout(() => { this.justDragged = false; }, 0);
      }
      this.draggingId = null;
      this.dragNode = null;
    },
    onClick(node) {
      // Single-click opens (drags are swallowed by the justDragged guard).
      if (this.justDragged) return;
      this.openNode(node);
    },
    onContext(node, e) {
      this.closeDesktopMenu();
      this.selectedId = node.id;
      this.infoNode = node;
      this.infoX = e.clientX;
      this.infoY = e.clientY;
      this.infoActions = this.actionsFor(node);
    },
    // The permanent File Explorer icon and session-only easter eggs aren't
    // part of the customizable desktop set - no toggle action for those.
    actionsFor(node) {
      if (node.type === "explorer" || node.labelKey === "easterEgg") return [];
      return [{
        key: "remove",
        icon: "trash-can",
        label: this.$t("ctxRemoveFromDesktop"),
        onClick: () => toggleDesktop(identityOf(node)),
      }];
    },
    resetDesktopIcons() {
      resetDesktop();
      this.closeDesktopMenu();
    },
    onDesktopContext(e) {
      this.infoNode = null;
      this.wallpaperPickerOpen = false;
      this.desktopMenu = { x: e.clientX, y: e.clientY };
    },
    closeDesktopMenu() {
      this.desktopMenu = null;
      this.wallpaperPickerOpen = false;
    },
    toggleWallpaperPicker() {
      this.wallpaperPickerOpen = !this.wallpaperPickerOpen;
    },
    pickWallpaper(id) {
      setWallpaper(id);
      this.closeDesktopMenu();
    },
    // Repacks every icon into the grid in its current order, left-to-right,
    // top-to-bottom - reuses the same posFromCell math the default auto-grid
    // layout already uses, just applied to every node rather than only the
    // ones without a stored position.
    autoArrangeIcons() {
      const cols = this.gridCols;
      const next = {};
      this.nodes.forEach((node, i) => {
        const pos = this.posFromCell(i % cols, Math.floor(i / cols));
        next[node.id] = pos;
        setPosition(node.id, pos);
      });
      this.positions = next;
      this.closeDesktopMenu();
    },
    onDocMouseDownForMenu(e) {
      // Clicks inside the menu are stopped via @mousedown.stop, so reaching
      // here means the click landed outside - dismiss.
      if (this.desktopMenu) this.closeDesktopMenu();
    },
    onKeydownForMenu(e) {
      if (e.key === "Escape" && this.desktopMenu) this.closeDesktopMenu();
    },
    onResize() {
      this.vw = window.innerWidth;
      this.vh = window.innerHeight;
      // Pull any dragged icons that now sit off-screen back into view.
      const maxX = Math.max(0, this.vw - ICON_W);
      const maxY = Math.max(0, this.vh - TASKBAR_H - ICON_H);
      let changed = false;
      const next = { ...this.positions };
      for (const id of Object.keys(next)) {
        const clampedX = Math.max(0, Math.min(next[id].x, maxX));
        const clampedY = Math.max(0, Math.min(next[id].y, maxY));
        if (clampedX !== next[id].x || clampedY !== next[id].y) {
          next[id] = { x: clampedX, y: clampedY };
          changed = true;
        }
      }
      if (changed) this.positions = next;
    },
    loadPositions() {
      // Keep only stored positions whose node still exists in the tree.
      const validIds = new Set(this.nodes.map((n) => n.id));
      const stored = getPositions();
      const filtered = {};
      for (const id of Object.keys(stored)) {
        if (validIds.has(id)) filtered[id] = stored[id];
      }
      this.positions = filtered;
    },
  },
  mounted() {
    this.loadPositions();
    this.layoutUnsub = onLayoutChange(() => this.loadPositions());
    this.desktopIconsUnsub = onDesktopIconsChange((s) => { this.desktopIconsState = s; });
    window.addEventListener("resize", this.onResize);
    document.addEventListener("mousedown", this.onDocMouseDownForMenu);
    document.addEventListener("keydown", this.onKeydownForMenu);
  },
  beforeUnmount() {
    document.removeEventListener("mousemove", this.onDocMouseMove);
    document.removeEventListener("mouseup", this.onDocMouseUp);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("mousedown", this.onDocMouseDownForMenu);
    document.removeEventListener("keydown", this.onKeydownForMenu);
    if (this.layoutUnsub) this.layoutUnsub();
    if (this.desktopIconsUnsub) this.desktopIconsUnsub();
  },
};
</script>

<style scoped>
.app-icon {
  position: absolute;
  width: 84px;
  user-select: none;
  /* Glide into the grid cell on drop (disabled mid-drag for 1:1 cursor follow). */
  transition: left 0.12s ease, top 0.12s ease;
}

.app-icon.dragging {
  opacity: 0.8;
  z-index: 5;
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .app-icon {
    transition: none !important;
  }
}

.app-icon.selected .app-icon-image {
  background-color: rgb(72, 14, 85);
  outline: 2px solid #c637e6;
}

.app-icon.selected .app-icon-text {
  background: rgba(155, 32, 183, 0.5);
  border-radius: 4px;
}
</style>

<!-- Non-scoped: the menu is teleported to <body>. -->
<style>
.desktop-ctx-menu {
  position: fixed;
  z-index: 1300;
  min-width: 200px;
  background: linear-gradient(180deg, #2a1a35, #1b1024);
  border: 2px solid #8404a1;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
  padding: 6px;
  font-family: "PortfolioFont", sans-serif;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.ctx-item:hover,
.ctx-item:focus-visible {
  background: rgba(155, 32, 183, 0.35);
}

.ctx-wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 6px;
}

.ctx-wallpaper-thumb {
  height: 44px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.ctx-wallpaper-thumb:hover {
  transform: scale(1.04);
  border-color: rgba(255, 255, 255, 0.5);
}

.ctx-wallpaper-thumb.active {
  border-color: #9b20b7;
  box-shadow: 0 0 0 2px rgba(155, 32, 183, 0.35);
}

.ctx-wallpaper-thumb:focus-visible {
  outline: 2px solid #c637e6;
  outline-offset: 2px;
}
</style>

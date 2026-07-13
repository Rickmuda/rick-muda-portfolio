<template>
  <div class="desktop" @mousedown.self="selectedId = null" @contextmenu.prevent>
    <div
      v-for="node in nodes"
      :key="node.id"
      class="app-icon"
      :class="{ selected: selectedId === node.id, dragging: draggingId === node.id }"
      :style="iconStyle(node)"
      @mousedown.stop="onMouseDown(node, $event)"
      @click.stop="onClick(node)"
      @contextmenu.prevent.stop="onContext(node, $event)"
    >
      <div class="app-icon-image">
        <font-awesome-icon :icon="node.icon" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ node.name || $t(node.labelKey) }}</div>
    </div>

    <InfoCard :node="infoNode" :x="infoX" :y="infoY" @close="infoNode = null" />
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import InfoCard from "./InfoCard.vue";
import { getDesktopNodes } from "../filesystem";
import { getPositions, setPosition, onChange as onLayoutChange } from "../desktopLayout";

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
      // Viewport size (drives the default auto-grid; reflows on resize).
      vw: window.innerWidth,
      vh: window.innerHeight,
      layoutUnsub: null,
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
      const eggs = this.easterEggApps.map((name) => ({
        id: name,
        type: "app",
        app: name,
        labelKey: "easterEgg",
        icon: "egg",
        descKey: "descApp",
      }));
      return [explorer, ...getDesktopNodes(), ...eggs];
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
  },
  methods: {
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
      this.selectedId = node.id;
      this.infoNode = node;
      this.infoX = e.clientX;
      this.infoY = e.clientY;
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
    window.addEventListener("resize", this.onResize);
  },
  beforeUnmount() {
    document.removeEventListener("mousemove", this.onDocMouseMove);
    document.removeEventListener("mouseup", this.onDocMouseUp);
    window.removeEventListener("resize", this.onResize);
    if (this.layoutUnsub) this.layoutUnsub();
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

.app-icon.selected .app-icon-image {
  background-color: rgb(72, 14, 85);
  outline: 2px solid #c637e6;
}

.app-icon.selected .app-icon-text {
  background: rgba(155, 32, 183, 0.5);
  border-radius: 4px;
}
</style>

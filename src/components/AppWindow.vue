<template>
  <div
    class="draggable-window"
    :class="{ mobile: isMobile }"
    :style="isMobile
      ? { zIndex: zIndex }
      : {
          zIndex: zIndex,
          left: windowState.x + 'px',
          top: windowState.y + 'px',
          width: windowState.w + 'px',
          height: windowState.h + 'px',
        }"
    @mousedown="bringToFront"
  >
    <div class="app-window">
      <div class="top-bar" @mousedown="startDrag" @dblclick="onTitleBarDblClick">
        <span class="window-title">{{ title }}</span>
        <div class="window-controls">
          <button v-if="!isMobile" class="window-control minimize" @click.stop="minimizeWindow" title="Minimize" aria-label="Minimize">
            <svg class="control-icon" viewBox="0 0 10 10" aria-hidden="true">
              <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="1" stroke-linecap="square" />
            </svg>
          </button>
          <button v-if="!isMobile" class="window-control maximize" @click.stop="toggleMaximize" title="Maximize / Restore" aria-label="Maximize or restore">
            <svg class="control-icon" viewBox="0 0 10 10" aria-hidden="true">
              <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1" />
            </svg>
          </button>
          <button class="window-control close" @click.stop="closeWindow" title="Close" aria-label="Close">
            <svg class="control-icon" viewBox="0 0 10 10" aria-hidden="true">
              <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" stroke-width="1" stroke-linecap="square" />
              <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" stroke-width="1" stroke-linecap="square" />
            </svg>
          </button>
        </div>
      </div>
      <div class="app-content">
        <slot></slot>
      </div>
    </div>

    <!-- Resize handles (desktop only, hidden when maximized/snapped) -->
    <template v-if="!isMobile && !isSnapped">
      <div class="resize-handle resize-n"  @mousedown.stop="startResize('n',  $event)"></div>
      <div class="resize-handle resize-s"  @mousedown.stop="startResize('s',  $event)"></div>
      <div class="resize-handle resize-e"  @mousedown.stop="startResize('e',  $event)"></div>
      <div class="resize-handle resize-w"  @mousedown.stop="startResize('w',  $event)"></div>
      <div class="resize-handle resize-ne" @mousedown.stop="startResize('ne', $event)"></div>
      <div class="resize-handle resize-nw" @mousedown.stop="startResize('nw', $event)"></div>
      <div class="resize-handle resize-se" @mousedown.stop="startResize('se', $event)"></div>
      <div class="resize-handle resize-sw" @mousedown.stop="startResize('sw', $event)"></div>
    </template>

    <!-- Snap preview overlay (renders globally during drag near an edge).
         Kept inside the root so AppWindow stays a single-root component and
         v-show from the parent works. Teleport still moves it to <body>. -->
    <Teleport to="body">
      <div
        v-if="snapPreview"
        class="snap-preview"
        :style="snapPreviewStyle"
      ></div>
    </Teleport>
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      required: true,
    },
    defaultWidth: {
      type: Number,
      required: true,
    },
    defaultHeight: {
      type: Number,
      required: true,
    },
    defaultX: {
      type: Number,
      default: 100,
    },
    defaultY: {
      type: Number,
      default: 100,
    },
    zIndex: {
      type: Number,
      required: true,
    },
    isMobile: {
      type: Boolean,
      default: false,
    },
  },
  components: {},
  data() {
    return {
      windowState: {
        x: this.defaultX,
        y: this.defaultY,
        w: this.defaultWidth,
        h: this.defaultHeight,
      },
      restoreState: null,
      isMaximized: false,
      isSnapped: false, // true when window is in a top/left/right snapped state
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      windowStartX: 0,
      windowStartY: 0,
      // Snap preview: null or one of 'max' | 'left' | 'right' during drag.
      snapPreview: null,
      // Resize state
      isResizing: false,
      resizeDir: null,
      resizeStartMouseX: 0,
      resizeStartMouseY: 0,
      resizeStartState: null,
    };
  },
  computed: {
    snapPreviewStyle() {
      if (!this.snapPreview) return {};
      const vw = window.innerWidth;
      const vh = window.innerHeight - 60; // taskbar gap
      if (this.snapPreview === "max") {
        return { left: "0px", top: "0px", width: vw + "px", height: vh + "px" };
      }
      if (this.snapPreview === "left") {
        return { left: "0px", top: "0px", width: vw / 2 + "px", height: vh + "px" };
      }
      if (this.snapPreview === "right") {
        return { left: vw / 2 + "px", top: "0px", width: vw / 2 + "px", height: vh + "px" };
      }
      return {};
    },
  },
  methods: {
    closeWindow() {
      this.$emit("close");
    },
    minimizeWindow() {
      this.$emit("minimize");
    },
    startDrag(e) {
      // Windows are fullscreen and fixed on mobile - no dragging.
      if (this.isMobile) return;
      // Don't start drag if clicking on window controls
      if (e.target.closest('.window-controls')) {
        return;
      }

      // If dragging from a snapped/maximized window, restore size first so the
      // window pops out under the cursor (Windows-style drag-away unsnap).
      if (this.isMaximized || this.isSnapped) {
        const restored = this.restoreState || {
          x: this.defaultX,
          y: this.defaultY,
          w: this.defaultWidth,
          h: this.defaultHeight,
        };
        // Position so cursor stays roughly centered on the title bar.
        const newX = Math.max(0, Math.min(e.clientX - restored.w / 2, window.innerWidth - restored.w));
        const newY = Math.max(0, e.clientY - 20);
        this.windowState = { x: newX, y: newY, w: restored.w, h: restored.h };
        this.isMaximized = false;
        this.isSnapped = false;
      }

      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.windowStartX = this.windowState.x;
      this.windowStartY = this.windowState.y;

      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
    },
    onDrag(e) {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.dragStartX;
      const deltaY = e.clientY - this.dragStartY;

      let newX = this.windowStartX + deltaX;
      let newY = this.windowStartY + deltaY;

      // Constrain to parent bounds
      const maxX = window.innerWidth - this.windowState.w;
      const maxY = window.innerHeight - this.windowState.h - 60; // Account for taskbar

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      this.windowState.x = newX;
      this.windowState.y = newY;

      // Snap zone detection (Aero-style). Cursor near top/left/right edge
      // triggers a preview overlay that commits on mouse up.
      const THRESHOLD = 8;
      if (e.clientY <= THRESHOLD) {
        this.snapPreview = "max";
      } else if (e.clientX <= THRESHOLD) {
        this.snapPreview = "left";
      } else if (e.clientX >= window.innerWidth - THRESHOLD) {
        this.snapPreview = "right";
      } else {
        this.snapPreview = null;
      }
    },
    stopDrag() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.stopDrag);

      // Commit pending snap.
      if (this.snapPreview) {
        this.applySnap(this.snapPreview);
        this.snapPreview = null;
      }
    },
    applySnap(side) {
      // Save restoreState only if this is a fresh snap (not snap-to-snap).
      if (!this.isMaximized && !this.isSnapped) {
        this.restoreState = { ...this.windowState };
      }
      const vw = window.innerWidth;
      const vh = Math.max(window.innerHeight - 60, 300);
      if (side === "max") {
        this.windowState = { x: 0, y: 0, w: vw, h: vh };
        this.isMaximized = true;
        this.isSnapped = false;
      } else if (side === "left") {
        this.windowState = { x: 0, y: 0, w: Math.round(vw / 2), h: vh };
        this.isMaximized = false;
        this.isSnapped = true;
      } else if (side === "right") {
        const half = Math.round(vw / 2);
        this.windowState = { x: vw - half, y: 0, w: half, h: vh };
        this.isMaximized = false;
        this.isSnapped = true;
      }
    },
    onTitleBarDblClick(e) {
      if (this.isMobile) return;
      if (e.target.closest('.window-controls')) return;
      this.toggleMaximize();
    },
    toggleMaximize() {
      if (!this.isMaximized && !this.isSnapped) {
        this.applySnap("max");
        return;
      }
      // Restore.
      if (this.restoreState) {
        this.windowState = { ...this.restoreState };
      }
      this.isMaximized = false;
      this.isSnapped = false;
    },
    startResize(dir, e) {
      if (this.isMobile) return;
      this.isResizing = true;
      this.resizeDir = dir;
      this.resizeStartMouseX = e.clientX;
      this.resizeStartMouseY = e.clientY;
      this.resizeStartState = { ...this.windowState };
      document.addEventListener('mousemove', this.onResize);
      document.addEventListener('mouseup', this.stopResize);
    },
    onResize(e) {
      if (!this.isResizing) return;
      const MIN_W = 320;
      const MIN_H = 240;
      const taskbarGap = 60;
      const dx = e.clientX - this.resizeStartMouseX;
      const dy = e.clientY - this.resizeStartMouseY;
      const start = this.resizeStartState;
      const dir = this.resizeDir;

      let x = start.x;
      let y = start.y;
      let w = start.w;
      let h = start.h;

      if (dir.includes('e')) {
        w = Math.max(MIN_W, Math.min(start.w + dx, window.innerWidth - start.x));
      }
      if (dir.includes('w')) {
        const proposedW = start.w - dx;
        if (proposedW >= MIN_W) {
          w = proposedW;
          x = Math.max(0, start.x + dx);
        } else {
          w = MIN_W;
          x = start.x + (start.w - MIN_W);
        }
      }
      if (dir.includes('s')) {
        h = Math.max(MIN_H, Math.min(start.h + dy, window.innerHeight - start.y - taskbarGap));
      }
      if (dir.includes('n')) {
        const proposedH = start.h - dy;
        if (proposedH >= MIN_H) {
          h = proposedH;
          y = Math.max(0, start.y + dy);
        } else {
          h = MIN_H;
          y = start.y + (start.h - MIN_H);
        }
      }

      this.windowState = { x, y, w, h };
    },
    stopResize() {
      this.isResizing = false;
      this.resizeDir = null;
      document.removeEventListener('mousemove', this.onResize);
      document.removeEventListener('mouseup', this.stopResize);
    },
    bringToFront() {
      this.$emit("bringToFront");
    },
    handleResize() {
      // Re-fit the window to the viewport if it's currently maximized or snapped.
      if (this.isMaximized) {
        this.windowState = {
          x: 0,
          y: 0,
          w: window.innerWidth,
          h: Math.max(window.innerHeight - 60, 300),
        };
        return;
      }
      if (this.isSnapped) {
        const vw = window.innerWidth;
        const half = Math.round(vw / 2);
        const vh = Math.max(window.innerHeight - 60, 300);
        // Preserve which side we're snapped to.
        const isLeftSnap = this.windowState.x === 0;
        this.windowState = {
          x: isLeftSnap ? 0 : vw - half,
          y: 0,
          w: half,
          h: vh,
        };
      }
    },
  },
  mounted() {
    window.addEventListener("resize", this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.stopResize);
  },
};
</script>

<style scoped>
.draggable-window {
  position: fixed;
}

/* Resize handles - invisible strips around the window edges. */
.resize-handle {
  position: absolute;
  z-index: 10;
}

.resize-n {
  top: -4px;
  left: 12px;
  right: 12px;
  height: 8px;
  cursor: ns-resize;
}

.resize-s {
  bottom: -4px;
  left: 12px;
  right: 12px;
  height: 8px;
  cursor: ns-resize;
}

.resize-e {
  right: -4px;
  top: 12px;
  bottom: 12px;
  width: 8px;
  cursor: ew-resize;
}

.resize-w {
  left: -4px;
  top: 12px;
  bottom: 12px;
  width: 8px;
  cursor: ew-resize;
}

.resize-ne {
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  cursor: nesw-resize;
}

.resize-nw {
  top: -4px;
  left: -4px;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
}

.resize-se {
  bottom: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
}

.resize-sw {
  bottom: -4px;
  left: -4px;
  width: 16px;
  height: 16px;
  cursor: nesw-resize;
}

.app-window {
  width: 100%;
  height: 100%;
  background: rgba(155, 32, 183, 1);
  border-radius: 15px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 3px solid black;
}

.top-bar {
  height: 56px;
  background: rgba(217, 217, 217, 1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 3px solid black;
  user-select: none;
  cursor: move;
}

.window-title {
  font-size: 18px;
  font-weight: bold;
}

.window-controls {
  display: flex;
  align-items: stretch;
  height: 100%;
}

.window-control {
  width: 54px;
  height: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease;
}

.control-icon {
  width: 14px;
  height: 14px;
  color: #1a1a1a;
  pointer-events: none;
  display: block;
}

.window-control.minimize:hover {
  background: rgba(0, 0, 0, 0.08);
}

.window-control.maximize:hover {
  background: rgba(0, 0, 0, 0.08);
}

.window-control.close:hover {
  background: #e81123;
}

.window-control.close:hover .control-icon {
  color: #fff;
}

.app-content {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.draggable-window.mobile {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  border-radius: 0;
}

.draggable-window.mobile .app-window {
  border-radius: 0;
  border: none;
  height: 100%;
}

.draggable-window.mobile .top-bar {
  cursor: default;
}

@media (max-width: 768px) {
  .window-control {
    width: 48px;
  }

  /* Mobile is fullscreen - no resize handles. */
  .resize-handle {
    display: none !important;
  }

  /* Fullscreen, square, edge-to-edge windows on mobile (width-based so it
     applies regardless of the isMobile prop). */
  .draggable-window {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: auto !important;
    bottom: auto !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .app-window {
    border-radius: 0 !important;
    border: none !important;
    height: 100% !important;
  }

  .top-bar {
    border-radius: 0 !important;
  }
}
</style>

<!-- Non-scoped: the snap preview is teleported to <body>. -->
<style>
.snap-preview {
  position: fixed;
  background: rgba(155, 32, 183, 0.25);
  border: 2px solid #c637e6;
  box-shadow: 0 0 24px rgba(155, 32, 183, 0.5);
  border-radius: 8px;
  pointer-events: none;
  z-index: 9999;
  transition: left 0.12s ease, top 0.12s ease, width 0.12s ease, height 0.12s ease;
}
</style>

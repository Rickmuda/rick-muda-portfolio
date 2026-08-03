<template>
  <div
    class="draggable-window"
    :class="{ mobile: isMobile, tablet: isTablet }"
    :style="isMobile
      ? { zIndex: zIndex }
      : {
          zIndex: zIndex,
          left: windowState.x + 'px',
          top: windowState.y + 'px',
          width: windowState.w + 'px',
          height: windowState.h + 'px',
        }"
    tabindex="-1"
    role="dialog"
    :aria-label="title"
    @mousedown="bringToFront"
    @keydown="handleWindowKeydown"
  >
    <div class="app-window" :class="{ snapped: isSnapped || isMaximized }">
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
import { sounds } from "../sounds";
import { getGeometry, setGeometry } from "../windowState";

// Every non-maximized snap mode applySnap() understands - halves and quarters.
const SNAP_SIDES = new Set(["left", "right", "top-left", "top-right", "bottom-left", "bottom-right"]);

export default {
  props: {
    title: {
      type: String,
      required: true,
    },
    // Identifies this window for geometry persistence (see windowState.js).
    // Null for windows that don't need it (there are none currently, but this
    // keeps the prop optional rather than required).
    appName: {
      type: String,
      default: null,
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
    // Touch tablet (coarse pointer, too wide for the phone launcher) - keeps
    // the full desktop windowing chrome but with bigger touch targets.
    isTablet: {
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
      snapSide: null, // "left" | "right" | null - which side isSnapped refers to
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
  watch: {
    // Notify parent when a snapped window becomes unsnapped (drag-away,
    // restore via title-bar dbl-click, maximize, etc.) so the snap chooser
    // overlay can dismiss itself.
    isSnapped(newVal, oldVal) {
      if (oldVal && !newVal) this.$emit("unsnap");
    },
    isMaximized(newVal, oldVal) {
      // Maximizing replaces a left/right snap - also a dismissal signal.
      if (newVal && !oldVal) this.$emit("unsnap");
    },
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
      const halfW = vw / 2;
      const halfH = vh / 2;
      if (this.snapPreview === "top-left") {
        return { left: "0px", top: "0px", width: halfW + "px", height: halfH + "px" };
      }
      if (this.snapPreview === "top-right") {
        return { left: halfW + "px", top: "0px", width: halfW + "px", height: halfH + "px" };
      }
      if (this.snapPreview === "bottom-left") {
        return { left: "0px", top: halfH + "px", width: halfW + "px", height: halfH + "px" };
      }
      if (this.snapPreview === "bottom-right") {
        return { left: halfW + "px", top: halfH + "px", width: halfW + "px", height: halfH + "px" };
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

      // Snap zone detection (Aero-style). Cursor near top edge maximizes;
      // near a corner (a bigger hit zone, since it's 2D) quarter-snaps; near
      // just left/right edge halves. Corners are checked before the plain
      // left/right edges so a drag into a corner doesn't get caught by the
      // wider single-edge threshold first.
      const THRESHOLD = 8;
      const CORNER_THRESHOLD = 48;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nearTop = e.clientY <= CORNER_THRESHOLD;
      const nearBottom = e.clientY >= vh - CORNER_THRESHOLD;
      const nearLeft = e.clientX <= CORNER_THRESHOLD;
      const nearRight = e.clientX >= vw - CORNER_THRESHOLD;
      if (e.clientY <= THRESHOLD) {
        this.snapPreview = "max";
      } else if (nearLeft && nearTop) {
        this.snapPreview = "top-left";
      } else if (nearRight && nearTop) {
        this.snapPreview = "top-right";
      } else if (nearLeft && nearBottom) {
        this.snapPreview = "bottom-left";
      } else if (nearRight && nearBottom) {
        this.snapPreview = "bottom-right";
      } else if (e.clientX <= THRESHOLD) {
        this.snapPreview = "left";
      } else if (e.clientX >= vw - THRESHOLD) {
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
      this.persistGeometry();
    },
    applySnap(side, { silent = false } = {}) {
      // Save restoreState only if this is a fresh snap (not snap-to-snap).
      if (!this.isMaximized && !this.isSnapped) {
        this.restoreState = { ...this.windowState };
      }
      const vw = window.innerWidth;
      const vh = Math.max(window.innerHeight - 60, 300);
      sounds.play("maximize");
      if (side === "max") {
        this.windowState = { x: 0, y: 0, w: vw, h: vh };
        this.isMaximized = true;
        this.isSnapped = false;
        this.snapSide = null;
      } else if (side === "left") {
        this.windowState = { x: 0, y: 0, w: Math.round(vw / 2), h: vh };
        this.isMaximized = false;
        this.isSnapped = true;
        this.snapSide = "left";
        if (!silent) this.$emit("snap", "left");
      } else if (side === "right") {
        const half = Math.round(vw / 2);
        this.windowState = { x: vw - half, y: 0, w: half, h: vh };
        this.isMaximized = false;
        this.isSnapped = true;
        this.snapSide = "right";
        if (!silent) this.$emit("snap", "right");
      } else if (
        side === "top-left" || side === "top-right" ||
        side === "bottom-left" || side === "bottom-right"
      ) {
        // Quarter-tiling. Deliberate scope cut: unlike left/right, these don't
        // emit "snap" - the snap-chooser fill-overlay only understands halves.
        const halfW = Math.round(vw / 2);
        const halfH = Math.round(vh / 2);
        const x = side.endsWith("right") ? vw - halfW : 0;
        const y = side.startsWith("bottom") ? vh - halfH : 0;
        this.windowState = { x, y, w: halfW, h: halfH };
        this.isMaximized = false;
        this.isSnapped = true;
        this.snapSide = side;
      }
      this.persistGeometry();
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
      this.snapSide = null;
      sounds.play("restore");
      this.persistGeometry();
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
      this.persistGeometry();
    },
    bringToFront() {
      this.$emit("bringToFront");
    },
    // Single keydown entry point for this window: dispatches to the focus
    // trap and the arrow-key move/resize handler below.
    handleWindowKeydown(event) {
      this.trapFocus(event);
      this.handleArrowNudge(event);
    },
    // Arrow keys move the window in 10px steps (40px with Shift) when the
    // window itself is focused (not one of its interactive descendants -
    // that would hijack arrow keys from e.g. a focused slider). Ctrl+Arrow
    // resizes instead of moving. Manually nudging a snapped window unsnaps
    // it first, mirroring the drag-away-to-unsnap behavior.
    handleArrowNudge(event) {
      if (this.isMobile || this.isMaximized) return;
      if (event.target !== this.$el) return;
      if (!event.key.startsWith("Arrow")) return;
      const STEP = event.shiftKey ? 40 : 10;
      const MIN_W = 320;
      const MIN_H = 240;
      const taskbarGap = 60;
      const state = { ...this.windowState };
      if (event.ctrlKey) {
        if (event.key === "ArrowRight") state.w += STEP;
        else if (event.key === "ArrowLeft") state.w = Math.max(MIN_W, state.w - STEP);
        else if (event.key === "ArrowDown") state.h += STEP;
        else if (event.key === "ArrowUp") state.h = Math.max(MIN_H, state.h - STEP);
        state.w = Math.min(state.w, window.innerWidth - state.x);
        state.h = Math.min(state.h, window.innerHeight - taskbarGap - state.y);
      } else {
        if (event.key === "ArrowRight") state.x += STEP;
        else if (event.key === "ArrowLeft") state.x -= STEP;
        else if (event.key === "ArrowDown") state.y += STEP;
        else if (event.key === "ArrowUp") state.y -= STEP;
        const maxX = Math.max(0, window.innerWidth - state.w);
        const maxY = Math.max(0, window.innerHeight - state.h - taskbarGap);
        state.x = Math.max(0, Math.min(state.x, maxX));
        state.y = Math.max(0, Math.min(state.y, maxY));
      }
      event.preventDefault();
      this.windowState = state;
      if (this.isSnapped) {
        this.isSnapped = false;
        this.snapSide = null;
      }
      this.persistGeometry();
    },
    // Basic focus trap: Tab/Shift+Tab wraps within this window's focusable
    // descendants instead of leaking out to icons/windows behind it.
    trapFocus(event) {
      if (event.key !== "Tab") return;
      const focusable = this.$el.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    // Persists current geometry/mode - called at every settle point (drag/resize
    // end, snap, restore). No-op on mobile, where geometry is meaningless.
    persistGeometry() {
      if (this.isMobile || !this.appName) return;
      setGeometry(this.appName, {
        x: this.windowState.x,
        y: this.windowState.y,
        w: this.windowState.w,
        h: this.windowState.h,
        maximized: this.isMaximized,
        snapSide: this.isSnapped ? this.snapSide : null,
      });
    },
    // Applies persisted geometry (if any) once the window mounts. Maximized/
    // snapped windows are restored via applySnap so their rect is recomputed
    // for the CURRENT viewport rather than trusting stale saved pixel values;
    // plain windows are clamped in case the screen shrank since they were saved.
    restorePersistedGeometry() {
      if (this.isMobile || !this.appName) return;
      const persisted = getGeometry(this.appName);
      if (!persisted) return;
      if (persisted.maximized) {
        this.applySnap("max", { silent: true });
        return;
      }
      if (SNAP_SIDES.has(persisted.snapSide)) {
        this.applySnap(persisted.snapSide, { silent: true });
        return;
      }
      const MIN_W = 320;
      const MIN_H = 240;
      const w = Math.max(MIN_W, Math.min(persisted.w, window.innerWidth));
      const h = Math.max(MIN_H, Math.min(persisted.h, Math.max(window.innerHeight - 60, 300)));
      const maxX = Math.max(0, window.innerWidth - w);
      const maxY = Math.max(0, window.innerHeight - h - 60);
      this.windowState = {
        x: Math.max(0, Math.min(persisted.x, maxX)),
        y: Math.max(0, Math.min(persisted.y, maxY)),
        w,
        h,
      };
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
        const halfW = Math.round(vw / 2);
        const vh = Math.max(window.innerHeight - 60, 300);
        const halfH = Math.round(vh / 2);
        const isQuarter = this.snapSide && this.snapSide !== "left" && this.snapSide !== "right";
        this.windowState = {
          x: this.snapSide && this.snapSide.endsWith("right") ? vw - halfW : 0,
          y: isQuarter && this.snapSide.startsWith("bottom") ? vh - halfH : 0,
          w: halfW,
          h: isQuarter ? halfH : vh,
        };
        return;
      }
      // Plain window: clamp back into the viewport if it now hangs off-screen -
      // reachable once geometry can restore from a different, larger screen.
      const maxX = Math.max(0, window.innerWidth - this.windowState.w);
      const maxY = Math.max(0, window.innerHeight - this.windowState.h - 60);
      const clampedX = Math.max(0, Math.min(this.windowState.x, maxX));
      const clampedY = Math.max(0, Math.min(this.windowState.y, maxY));
      if (clampedX !== this.windowState.x || clampedY !== this.windowState.y) {
        this.windowState = { ...this.windowState, x: clampedX, y: clampedY };
      }
    },
  },
  mounted() {
    window.addEventListener("resize", this.handleResize);
    this.restorePersistedGeometry();
    // Move focus into the newly-opened window so keyboard/screen-reader users
    // land somewhere sensible instead of focus staying on the triggering icon.
    this.$el.focus({ preventScroll: true });
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

/* Tablet (coarse pointer): bigger touch targets for resize handles and window
   controls - the mouse-era 8px/16px hit areas are too small to reliably tap. */
.draggable-window.tablet .resize-n,
.draggable-window.tablet .resize-s {
  height: 16px;
  top: -8px;
}
.draggable-window.tablet .resize-s {
  top: auto;
  bottom: -8px;
}
.draggable-window.tablet .resize-e,
.draggable-window.tablet .resize-w {
  width: 16px;
}
.draggable-window.tablet .resize-e { right: -8px; }
.draggable-window.tablet .resize-w { left: -8px; }
.draggable-window.tablet .resize-ne,
.draggable-window.tablet .resize-nw,
.draggable-window.tablet .resize-se,
.draggable-window.tablet .resize-sw {
  width: 28px;
  height: 28px;
}
.draggable-window.tablet .window-control {
  width: 64px;
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

/* When snapped/maximized the window is flush against the viewport edge, so
   drop the rounded corners and the black outline for a clean Windows-style fit. */
.app-window.snapped {
  border-radius: 0;
  border: none;
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

@media (prefers-reduced-motion: reduce) {
  .snap-preview {
    transition: none !important;
  }
}
</style>

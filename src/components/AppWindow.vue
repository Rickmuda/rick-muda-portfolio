<template>
  <div
    class="draggable-window"
    :style="{
      zIndex: zIndex,
      left: windowState.x + 'px',
      top: windowState.y + 'px',
      width: windowState.w + 'px',
      height: windowState.h + 'px',
    }"
    @mousedown="bringToFront"
  >
    <div class="app-window">
      <div class="top-bar" @mousedown="startDrag">
        <span class="window-title">{{ title }}</span>
        <div class="window-controls">
          <button class="window-control minimize" @click.stop="minimizeWindow" title="Minimize" aria-label="Minimize">
            <span class="control-icon">&#x2015;</span>
          </button>
          <button class="window-control maximize" @click.stop="toggleMaximize" title="Maximize / Restore" aria-label="Maximize or restore">
            <span class="control-icon maximize-icon"></span>
          </button>
          <button class="window-control close" @click.stop="closeWindow" title="Close" aria-label="Close">
            <span class="control-icon">&times;</span>
          </button>
        </div>
      </div>
      <div class="app-content">
        <slot></slot>
      </div>
    </div>
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
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      windowStartX: 0,
      windowStartY: 0,
    };
  },
  methods: {
    closeWindow() {
      this.$emit("close");
    },
    minimizeWindow() {
      this.$emit("minimize");
    },
    startDrag(e) {
      // Don't start drag if clicking on window controls
      if (e.target.closest('.window-controls')) {
        return;
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
    },
    stopDrag() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.stopDrag);
    },
    toggleMaximize() {
      if (!this.isMaximized) {
        this.restoreState = { ...this.windowState };
        this.windowState = {
          x: 0,
          y: 0,
          w: window.innerWidth,
          h: Math.max(window.innerHeight - 60, 300),
        };
        this.isMaximized = true;
        return;
      }

      if (this.restoreState) {
        this.windowState = { ...this.restoreState };
      }
      this.isMaximized = false;
    },
    bringToFront() {
      this.$emit("bringToFront");
    },
    handleResize() {
      if (!this.isMaximized) {
        return;
      }
      this.windowState = {
        x: 0,
        y: 0,
        w: window.innerWidth,
        h: Math.max(window.innerHeight - 60, 300),
      };
    },
  },
  mounted() {
    window.addEventListener("resize", this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  },
};
</script>

<style scoped>
.draggable-window {
  position: fixed;
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
  border-left: 1px solid rgba(0, 0, 0, 0.1);
}

.control-icon {
  font-size: 22px;
  line-height: 1;
  color: #1a1a1a;
  pointer-events: none;
}

.maximize-icon {
  width: 12px;
  height: 12px;
  border: 2px solid #1a1a1a;
  border-radius: 0;
  display: inline-block;
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

@media (max-width: 768px) {
  .window-control {
    width: 48px;
  }
}
</style>

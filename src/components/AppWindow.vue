<template>
  <vue3-draggable-resizable
    :x="defaultX"
    :y="defaultY"
    :w="defaultWidth"
    :h="defaultHeight"
    :resizable="false"
    :draggable="false"
    :active="true"
    :parent="true"
    class="draggable-window"
    :style="{ zIndex: zIndex }"
    @mousedown="bringToFront"
  >
    <div class="app-window">
      <div class="top-bar" @mousedown="startDrag">
        <span class="window-title">{{ title }}</span>
<<<<<<< Updated upstream
        <div class="close-button" @click="closeWindow">
          <span>X</span>
=======
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
>>>>>>> Stashed changes
        </div>
      </div>
      <div class="app-content">
        <slot></slot>
      </div>
    </div>
  </vue3-draggable-resizable>
</template>

<script>
import Vue3DraggableResizable from "vue3-draggable-resizable";
import "vue3-draggable-resizable/dist/Vue3DraggableResizable.css";

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
      required: true, // Pass the z-index from App.vue
    },
  },
  components: {
    Vue3DraggableResizable,
  },
<<<<<<< Updated upstream
=======
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
>>>>>>> Stashed changes
  methods: {
    closeWindow() {
      this.$emit("close");
    },
<<<<<<< Updated upstream
    bringToFront() {
      this.$emit("bringToFront"); // Emit an event to bring the window to the front
    },
=======
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
      this.$emit("bringToFront"); // Emit an event to bring the window to the front
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
>>>>>>> Stashed changes
  },
};
</script>

<style scoped>
.draggable-window {
  z-index: 10;
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
<<<<<<< Updated upstream
=======
  user-select: none;
  cursor: move;
>>>>>>> Stashed changes
}

.window-title {
  font-size: 18px;
  font-weight: bold;
}

.close-button {
  width: 40px;
  height: 40px;
  background: rgba(255, 0, 0, 1);
  border-radius: 5px;
  display: flex;
<<<<<<< Updated upstream
  justify-content: center;
  align-items: center;
  cursor: pointer;
=======
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
>>>>>>> Stashed changes
}

.app-content {
  flex: 1;
<<<<<<< Updated upstream
  overflow: auto;
  padding: 20px;
=======
  overflow: hidden;
  padding: 0;
}

@media (max-width: 768px) {
  .window-control {
    width: 48px;
  }
>>>>>>> Stashed changes
}
</style>
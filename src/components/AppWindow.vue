<template>
  <vue3-draggable-resizable
    :x="windowState.x"
    :y="windowState.y"
    :w="windowState.w"
    :h="windowState.h"
    :resizable="false"
    :active="true"
    :parent="true" 
    class="draggable-window"
    :style="{ zIndex: zIndex }"
    @mousedown="bringToFront"
  >
    <div class="app-window">
      <div class="top-bar">
        <span class="window-title">{{ title }}</span>
        <div class="window-controls">
          <button class="window-control minimize" @click="minimizeWindow" title="Minimize" aria-label="Minimize">
            <span class="control-icon">&#x2015;</span>
          </button>
          <button class="window-control maximize" @click="toggleMaximize" title="Maximize / Restore" aria-label="Maximize or restore">
            <span class="control-icon maximize-icon"></span>
          </button>
          <button class="window-control close" @click="closeWindow" title="Close" aria-label="Close">
            <span class="control-icon">&times;</span>
          </button>
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
    };
  },
  methods: {
    closeWindow() {
      this.$emit("close");
    },
    minimizeWindow() {
      this.$emit("minimize");
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
  height: 40px;
  background: rgba(217, 217, 217, 1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 14px;
  border-bottom: 3px solid black;
  user-select: none;
}

.window-title {
  font-size: 16px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.window-controls {
  display: flex;
  align-items: stretch;
  height: 100%;
}

.window-control {
  width: 46px;
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
  font-size: 16px;
  line-height: 1;
  color: #1a1a1a;
  pointer-events: none;
}

.maximize-icon {
  width: 10px;
  height: 10px;
  border: 1.5px solid #1a1a1a;
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
    width: 40px;
  }
}
</style>
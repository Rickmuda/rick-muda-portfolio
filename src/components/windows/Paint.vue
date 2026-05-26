<template>
  <div class="paint-window" :class="{ 'is-mobile': isMobile }">
    <!-- Desktop toolbar -->
    <div v-if="!isMobile" class="paint-toolbar">
      <div class="tool-group">
        <button
          type="button"
          class="tool-btn"
          :class="{ active: tool === 'brush' }"
          @click="tool = 'brush'"
        >{{ $t('paintBrush') }}</button>
        <button
          type="button"
          class="tool-btn"
          :class="{ active: tool === 'bucket' }"
          @click="tool = 'bucket'"
        >{{ $t('paintBucket') }}</button>
        <button
          type="button"
          class="tool-btn"
          :class="{ active: tool === 'eraser' }"
          @click="tool = 'eraser'"
        >{{ $t('paintEraser') }}</button>
      </div>

      <div class="tool-group size-group">
        <input
          type="range"
          min="2"
          max="40"
          step="1"
          v-model.number="size"
          class="size-slider"
          aria-label="Brush size"
        />
        <span class="size-readout">{{ size }}px</span>
      </div>

      <div class="tool-group swatches">
        <button
          v-for="swatch in palette"
          :key="swatch"
          type="button"
          class="swatch"
          :class="{ active: color === swatch }"
          :style="{ background: swatch }"
          :aria-label="`Color ${swatch}`"
          @click="color = swatch"
        ></button>
        <input
          type="color"
          v-model="color"
          class="color-picker"
          aria-label="Custom color"
        />
      </div>

      <div class="tool-group actions">
        <button type="button" class="action-btn" @click="undo" :disabled="!undoStack.length">
          {{ $t('paintUndo') }}
        </button>
        <button type="button" class="action-btn" @click="confirmClear">
          {{ $t('paintClear') }}
        </button>
        <button type="button" class="action-btn primary" @click="savePng">
          {{ $t('paintSave') }}
        </button>
      </div>
    </div>

    <!-- Mobile top bar: tool toggle + size slider + current-color dot -->
    <div v-if="isMobile" class="mobile-top-bar">
      <button
        type="button"
        class="mobile-tool-btn"
        :class="{ active: tool === 'brush' }"
        :aria-label="$t('paintBrush')"
        @click="tool = 'brush'"
      >
        <font-awesome-icon icon="paintbrush" />
      </button>
      <button
        type="button"
        class="mobile-tool-btn"
        :class="{ active: tool === 'bucket' }"
        :aria-label="$t('paintBucket')"
        @click="tool = 'bucket'"
      >
        <font-awesome-icon icon="fill-drip" />
      </button>
      <button
        type="button"
        class="mobile-tool-btn"
        :class="{ active: tool === 'eraser' }"
        :aria-label="$t('paintEraser')"
        @click="tool = 'eraser'"
      >
        <font-awesome-icon icon="eraser" />
      </button>
      <input
        type="range"
        min="2"
        max="40"
        step="1"
        v-model.number="size"
        class="mobile-size-slider"
        :aria-label="$t('paintBrush')"
      />
      <span class="mobile-size-readout">{{ size }}</span>
      <label class="mobile-color-dot" :style="{ background: tool === 'eraser' ? '#fff' : color }">
        <input
          type="color"
          v-model="color"
          class="mobile-color-input"
          aria-label="Custom color"
        />
      </label>
    </div>

    <div ref="stage" class="paint-stage">
      <canvas
        ref="canvas"
        class="paint-canvas"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onPointerUp"
        @mouseleave="onPointerUp"
      ></canvas>

      <div
        v-if="showClearConfirm"
        class="paint-modal-backdrop"
        @click.self="showClearConfirm = false"
      >
        <div class="paint-modal" role="dialog" aria-modal="true">
          <div class="paint-modal-title">{{ $t('paintClear') }}</div>
          <p class="paint-modal-body">{{ $t('paintClearConfirm') }}</p>
          <div class="paint-modal-actions">
            <button type="button" class="action-btn" @click="showClearConfirm = false">
              {{ $t('paintCancel') }}
            </button>
            <button type="button" class="action-btn primary" @click="doClear">
              {{ $t('paintClear') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile bottom bar: scrollable color row + action icons -->
    <div v-if="isMobile" class="mobile-bottom-bar">
      <div class="mobile-swatch-row">
        <button
          v-for="swatch in palette"
          :key="swatch"
          type="button"
          class="mobile-swatch"
          :class="{ active: color === swatch }"
          :style="{ background: swatch }"
          :aria-label="`Color ${swatch}`"
          @click="onMobileSwatchPick(swatch)"
        ></button>
      </div>
      <div class="mobile-actions">
        <button
          type="button"
          class="mobile-action-btn"
          @click="undo"
          :disabled="!undoStack.length"
          :aria-label="$t('paintUndo')"
        >
          <font-awesome-icon icon="rotate-left" />
        </button>
        <button
          type="button"
          class="mobile-action-btn"
          @click="confirmClear"
          :aria-label="$t('paintClear')"
        >
          <font-awesome-icon icon="trash" />
        </button>
        <button
          type="button"
          class="mobile-action-btn primary"
          @click="savePng"
          :aria-label="$t('paintSave')"
        >
          <font-awesome-icon icon="download" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { unlock as unlockAchievement } from "../../achievements";

const PALETTE = [
  "#ffffff",
  "#000000",
  "#e63946",
  "#f4a261",
  "#ffd166",
  "#2a9d8f",
  "#4cc9f0",
  "#9b20b7",
];
const STORAGE_KEY = "paint-canvas";
const MAX_UNDO = 20;

export default {
  name: "Paint",
  data() {
    return {
      tool: "brush",
      color: "#9b20b7",
      size: 6,
      palette: PALETTE,
      isDrawing: false,
      lastX: 0,
      lastY: 0,
      undoStack: [],
      ctx: null,
      resizeObserver: null,
      showClearConfirm: false,
      isMobile: typeof window !== "undefined" && window.innerWidth <= 768,
    };
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext("2d");
    this.resize(true);

    this.resizeObserver = new ResizeObserver(() => this.resize(false));
    this.resizeObserver.observe(this.$refs.stage);

    // Block touchmove default at the canvas so painting does not scroll the page.
    this.$refs.canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
    this.$refs.canvas.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.$refs.canvas.addEventListener("touchend", this.onPointerUp);
    this.$refs.canvas.addEventListener("touchcancel", this.onPointerUp);

    window.addEventListener("resize", this.onWindowResize);
  },
  beforeUnmount() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    const canvas = this.$refs.canvas;
    if (canvas) {
      canvas.removeEventListener("touchstart", this.onTouchStart);
      canvas.removeEventListener("touchmove", this.onTouchMove);
      canvas.removeEventListener("touchend", this.onPointerUp);
      canvas.removeEventListener("touchcancel", this.onPointerUp);
    }
    window.removeEventListener("resize", this.onWindowResize);
  },
  methods: {
    onWindowResize() {
      this.isMobile = window.innerWidth <= 768;
    },
    resize(isInitial) {
      const stage = this.$refs.stage;
      const canvas = this.$refs.canvas;
      if (!stage || !canvas) return;
      const w = Math.max(1, Math.round(stage.clientWidth));
      const h = Math.max(1, Math.round(stage.clientHeight));

      // Preserve existing pixels by snapshotting to an offscreen canvas, then
      // blitting back after resizing the visible canvas.
      const prevW = canvas.width;
      const prevH = canvas.height;
      let snapshot = null;
      if (!isInitial && prevW > 0 && prevH > 0) {
        snapshot = document.createElement("canvas");
        snapshot.width = prevW;
        snapshot.height = prevH;
        snapshot.getContext("2d").drawImage(canvas, 0, 0);
      }

      canvas.width = w;
      canvas.height = h;

      if (snapshot) {
        this.ctx.drawImage(snapshot, 0, 0);
      } else if (isInitial) {
        this.restoreFromStorage();
      }
    },
    restoreFromStorage() {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return;
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0);
      };
      img.src = data;
    },
    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, this.$refs.canvas.toDataURL("image/png"));
      } catch (_) {
        // Quota exceeded or similar - silently skip persistence.
      }
    },
    pushUndo() {
      const canvas = this.$refs.canvas;
      const snap = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.undoStack.push(snap);
      if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    },
    undo() {
      const snap = this.undoStack.pop();
      if (!snap) return;
      this.ctx.putImageData(snap, 0, 0);
      this.persist();
    },
    confirmClear() {
      this.showClearConfirm = true;
    },
    doClear() {
      this.showClearConfirm = false;
      this.pushUndo();
      const canvas = this.$refs.canvas;
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.persist();
      unlockAchievement("paint-clear");
    },
    async savePng() {
      const canvas = this.$refs.canvas;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      const filename = `paint-${Date.now()}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // Prefer the share sheet on mobile (especially iOS Safari, where
      // <a download> just opens the image in a new tab instead of saving).
      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], title: "Paint" });
          return;
        } catch (_) {
          // User cancelled or share failed - fall through to download.
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    pointerPos(clientX, clientY) {
      const rect = this.$refs.canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    beginStroke(x, y) {
      this.pushUndo();
      unlockAchievement("paint-stroke");
      this.isDrawing = true;
      this.lastX = x;
      this.lastY = y;
      // Draw a single dot so a tap shows up even without movement.
      this.applyStrokeStyle();
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    },
    extendStroke(x, y) {
      if (!this.isDrawing) return;
      this.applyStrokeStyle();
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.lastX = x;
      this.lastY = y;
    },
    applyStrokeStyle() {
      const ctx = this.ctx;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = this.size;
      if (this.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.fillStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
      }
    },
    onMobileSwatchPick(swatch) {
      this.color = swatch;
      if (this.tool === "eraser") this.tool = "brush";
    },
    floodFill(startX, startY) {
      const canvas = this.$refs.canvas;
      const w = canvas.width;
      const h = canvas.height;
      const sx = Math.floor(startX);
      const sy = Math.floor(startY);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;

      const imageData = this.ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const idx0 = (sy * w + sx) * 4;
      const tr = data[idx0];
      const tg = data[idx0 + 1];
      const tb = data[idx0 + 2];
      const ta = data[idx0 + 3];

      const hex = this.color.replace("#", "");
      const fr = parseInt(hex.substring(0, 2), 16);
      const fg = parseInt(hex.substring(2, 4), 16);
      const fb = parseInt(hex.substring(4, 6), 16);
      const fa = 255;

      if (tr === fr && tg === fg && tb === fb && ta === fa) return;

      this.pushUndo();

      const matches = (x, y) => {
        const i = (y * w + x) * 4;
        return (
          data[i] === tr &&
          data[i + 1] === tg &&
          data[i + 2] === tb &&
          data[i + 3] === ta
        );
      };
      const setPixel = (x, y) => {
        const i = (y * w + x) * 4;
        data[i] = fr;
        data[i + 1] = fg;
        data[i + 2] = fb;
        data[i + 3] = fa;
      };

      // Scanline flood fill - fast and avoids deep recursion on large areas.
      const stack = [[sx, sy]];
      while (stack.length) {
        const [seedX, seedY] = stack.pop();
        let x = seedX;
        while (x >= 0 && matches(x, seedY)) x--;
        x++;
        let spanAbove = false;
        let spanBelow = false;
        while (x < w && matches(x, seedY)) {
          setPixel(x, seedY);
          if (seedY > 0) {
            const above = matches(x, seedY - 1);
            if (above && !spanAbove) {
              stack.push([x, seedY - 1]);
              spanAbove = true;
            } else if (!above) {
              spanAbove = false;
            }
          }
          if (seedY < h - 1) {
            const below = matches(x, seedY + 1);
            if (below && !spanBelow) {
              stack.push([x, seedY + 1]);
              spanBelow = true;
            } else if (!below) {
              spanBelow = false;
            }
          }
          x++;
        }
      }

      this.ctx.putImageData(imageData, 0, 0);
      this.persist();
      unlockAchievement("paint-bucket");
    },
    onMouseDown(e) {
      const { x, y } = this.pointerPos(e.clientX, e.clientY);
      if (this.tool === "bucket") {
        this.floodFill(x, y);
        return;
      }
      this.beginStroke(x, y);
    },
    onMouseMove(e) {
      if (!this.isDrawing) return;
      const { x, y } = this.pointerPos(e.clientX, e.clientY);
      this.extendStroke(x, y);
    },
    onTouchStart(e) {
      if (!e.touches.length) return;
      e.preventDefault();
      const t = e.touches[0];
      const { x, y } = this.pointerPos(t.clientX, t.clientY);
      if (this.tool === "bucket") {
        this.floodFill(x, y);
        return;
      }
      this.beginStroke(x, y);
    },
    onTouchMove(e) {
      if (!this.isDrawing || !e.touches.length) return;
      e.preventDefault();
      const t = e.touches[0];
      const { x, y } = this.pointerPos(t.clientX, t.clientY);
      this.extendStroke(x, y);
    },
    onPointerUp() {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      this.persist();
    },
  },
};
</script>

<style scoped>
.paint-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a24;
  color: #fff;
  border: 2px solid #000;
}

.paint-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  background: linear-gradient(180deg, #2a2a35, #1f1f2d);
  border-bottom: 2px solid #4f115d;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-btn,
.action-btn {
  background: #2a2a35;
  border: 1px solid #4f115d;
  color: #d4a8e8;
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
}

.tool-btn:hover,
.action-btn:hover:not(:disabled) {
  background: #3a1a48;
  color: #fff;
}

.tool-btn.active {
  background: #9b20b7;
  color: #fff;
  border-color: #c637e6;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #9b20b7;
  color: #fff;
  border-color: #c637e6;
}

.action-btn.primary:hover {
  background: #c637e6;
}

.size-slider {
  width: 110px;
  accent-color: #9b20b7;
}

.size-readout {
  font-size: 11px;
  color: #c0b8cc;
  min-width: 34px;
  text-align: right;
}

.swatches {
  flex-wrap: wrap;
}

.swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #4f115d;
  cursor: pointer;
  padding: 0;
}

.swatch.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px #9b20b7;
}

.color-picker {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid #4f115d;
  border-radius: 6px;
  padding: 0;
  cursor: pointer;
}

.paint-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  background:
    linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%),
    linear-gradient(45deg, #ddd 25%, #fff 25%, #fff 75%, #ddd 75%);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  overflow: hidden;
}

.paint-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

.paint-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(10, 4, 18, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  padding: 16px;
}

.paint-modal {
  background: linear-gradient(180deg, #2a2a35, #1f1f2d);
  border: 2px solid #8404a1;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  color: #d0c8db;
  min-width: 260px;
  max-width: 360px;
  width: 100%;
}

.paint-modal-title {
  background: linear-gradient(180deg, #5b0f6f, #3a0944);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 12px;
  border-bottom: 2px solid #4f115d;
  border-radius: 6px 6px 0 0;
}

.paint-modal-body {
  margin: 0;
  padding: 18px 16px;
  font-size: 14px;
  color: #d0c8db;
  text-align: center;
}

.paint-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 14px 14px;
}

/* Mobile-only layout: tools on top, palette + actions on bottom, big canvas. */
.mobile-top-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: linear-gradient(180deg, #2a2a35, #1f1f2d);
  border-bottom: 2px solid #4f115d;
  flex-shrink: 0;
}

.mobile-tool-btn {
  width: 44px;
  height: 44px;
  background: #2a2a35;
  border: 1px solid #4f115d;
  color: #d4a8e8;
  border-radius: 8px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  touch-action: manipulation;
}

.mobile-tool-btn.active {
  background: #9b20b7;
  color: #fff;
  border-color: #c637e6;
}

.mobile-size-slider {
  flex: 1;
  min-width: 0;
  accent-color: #9b20b7;
  height: 32px;
}

.mobile-size-slider::-webkit-slider-thumb {
  width: 26px;
  height: 26px;
}

.mobile-size-readout {
  font-size: 13px;
  color: #c0b8cc;
  min-width: 26px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.mobile-color-dot {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px #4f115d;
  cursor: pointer;
  flex-shrink: 0;
  overflow: hidden;
}

.mobile-color-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: 0;
  padding: 0;
}

.mobile-bottom-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom)) 12px;
  background: linear-gradient(180deg, #1f1f2d, #2a2a35);
  border-top: 2px solid #4f115d;
  flex-shrink: 0;
}

.mobile-swatch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  flex: 1;
  padding: 4px 2px;
  scrollbar-width: none;
}

.mobile-swatch-row::-webkit-scrollbar {
  display: none;
}

.mobile-swatch {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  border: 2px solid #4f115d;
  padding: 0;
  cursor: pointer;
  touch-action: manipulation;
}

.mobile-swatch.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px #9b20b7;
  transform: scale(1.05);
}

.mobile-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.mobile-action-btn {
  width: 44px;
  height: 44px;
  background: #2a2a35;
  border: 1px solid #4f115d;
  color: #d4a8e8;
  border-radius: 8px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  touch-action: manipulation;
}

.mobile-action-btn:disabled {
  opacity: 0.4;
}

.mobile-action-btn.primary {
  background: #9b20b7;
  color: #fff;
  border-color: #c637e6;
}

@media (max-width: 768px) {
  .paint-window.is-mobile .paint-stage {
    background-size: 28px 28px;
    background-position: 0 0, 14px 14px;
  }

  .paint-modal {
    width: calc(100% - 32px);
    max-width: 360px;
  }

  .paint-modal-title {
    font-size: 14px;
    padding: 10px 14px;
  }

  .paint-modal-body {
    font-size: 15px;
    padding: 20px 18px;
  }

  .paint-modal-actions {
    gap: 12px;
    padding: 0 16px 16px;
  }

  .paint-modal-actions .action-btn {
    padding: 10px 16px;
    font-size: 14px;
    min-height: 44px;
  }
}
</style>

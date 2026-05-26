<template>
  <div class="ms-window" :class="`ms-diff-${difficulty}`">
    <div class="ms-header">
      <div class="ms-status">
        <span class="ms-counter" :title="$t('mineFlagged')">
          <font-awesome-icon icon="bomb" /> {{ minesLeft }}
        </span>
        <span class="ms-counter" :title="'Time'">
          <font-awesome-icon icon="clock" /> {{ timer }}s
        </span>
      </div>
      <div class="ms-actions">
        <select v-model="difficulty" @change="newGame">
          <option value="easy">{{ $t('mineEasy') }}</option>
          <option value="medium">{{ $t('mineMedium') }}</option>
          <option value="hard">{{ $t('mineHard') }}</option>
        </select>
        <button class="ms-btn" @click="newGame">{{ $t('mineNewGame') }}</button>
      </div>
    </div>

    <div v-if="endState" class="ms-banner" :class="endState">
      <strong>{{ endState === 'win' ? $t('mineWin') : $t('mineLose') }}</strong>
      <span v-if="endState === 'win' && bestTime !== null" class="ms-best">
        {{ $t('mineBest') }}: {{ bestTime }}s
      </span>
    </div>

    <div class="ms-board-wrap">
      <div
        class="ms-board"
        :style="boardStyle"
        @contextmenu.prevent
      >
        <button
          v-for="cell in board"
          :key="cell.idx"
          type="button"
          class="ms-cell"
          :class="cellClass(cell)"
          @click="onLeftClick(cell)"
          @contextmenu.prevent="onRightClick(cell)"
          @touchstart.passive="onTouchStart($event, cell)"
          @touchend="onTouchEnd($event, cell)"
          @touchmove="onTouchMove"
          :disabled="endState !== null"
        >
          <template v-if="cell.revealed">
            <font-awesome-icon v-if="cell.mine" icon="bomb" />
            <span v-else-if="cell.adj > 0" :class="`ms-n-${cell.adj}`">{{ cell.adj }}</span>
          </template>
          <font-awesome-icon v-else-if="cell.flagged" icon="flag" class="ms-flag" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { sounds } from "../../sounds";
import { unlock as unlockAchievement } from "../../achievements";

const DIFFICULTY = {
  easy:   { cols: 9,  rows: 9,  mines: 10 },
  medium: { cols: 16, rows: 16, mines: 40 },
  hard:   { cols: 30, rows: 16, mines: 99 },
};

const LONG_PRESS_MS = 400;
const TOUCH_MOVE_TOLERANCE = 10;

export default {
  name: "Minesweeper",
  data() {
    return {
      difficulty: "easy",
      board: [],
      cols: DIFFICULTY.easy.cols,
      rows: DIFFICULTY.easy.rows,
      mineCount: DIFFICULTY.easy.mines,
      flaggedCount: 0,
      revealedCount: 0,
      minesPlaced: false,
      endState: null,
      timer: 0,
      timerHandle: null,
      bestTime: null,
      touch: { startX: 0, startY: 0, longPressTimer: null, longPressFired: false },
    };
  },
  computed: {
    minesLeft() {
      return Math.max(0, this.mineCount - this.flaggedCount);
    },
    boardStyle() {
      return {
        gridTemplateColumns: `repeat(${this.cols}, var(--ms-cell))`,
        gridTemplateRows: `repeat(${this.rows}, var(--ms-cell))`,
      };
    },
  },
  mounted() {
    this.newGame();
  },
  beforeUnmount() {
    this.stopTimer();
    this.clearLongPress();
  },
  methods: {
    newGame() {
      const cfg = DIFFICULTY[this.difficulty];
      this.cols = cfg.cols;
      this.rows = cfg.rows;
      this.mineCount = cfg.mines;
      this.board = [];
      for (let i = 0; i < cfg.cols * cfg.rows; i += 1) {
        this.board.push({
          idx: i,
          mine: false,
          revealed: false,
          flagged: false,
          adj: 0,
        });
      }
      this.flaggedCount = 0;
      this.revealedCount = 0;
      this.minesPlaced = false;
      this.endState = null;
      this.timer = 0;
      this.bestTime = this.loadBestTime();
      this.stopTimer();
    },
    placeMines(safeIdx) {
      const safeSet = new Set([safeIdx, ...this.neighbors(safeIdx)]);
      const candidates = [];
      for (let i = 0; i < this.board.length; i += 1) {
        if (!safeSet.has(i)) candidates.push(i);
      }
      // Fisher-Yates partial shuffle to pick `mineCount` cells.
      for (let i = 0; i < this.mineCount; i += 1) {
        const j = i + Math.floor(Math.random() * (candidates.length - i));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        this.board[candidates[i]].mine = true;
      }
      // Pre-compute adjacency counts.
      for (let i = 0; i < this.board.length; i += 1) {
        if (this.board[i].mine) continue;
        let n = 0;
        for (const nb of this.neighbors(i)) {
          if (this.board[nb].mine) n += 1;
        }
        this.board[i].adj = n;
      }
      this.minesPlaced = true;
    },
    neighbors(idx) {
      const x = idx % this.cols;
      const y = Math.floor(idx / this.cols);
      const out = [];
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
          out.push(ny * this.cols + nx);
        }
      }
      return out;
    },
    onLeftClick(cell) {
      if (this.endState) return;
      if (cell.flagged || cell.revealed) return;
      if (!this.minesPlaced) {
        this.placeMines(cell.idx);
        this.startTimer();
      }
      this.reveal(cell.idx);
    },
    onRightClick(cell) {
      if (this.endState || cell.revealed) return;
      this.toggleFlag(cell);
    },
    toggleFlag(cell) {
      cell.flagged = !cell.flagged;
      this.flaggedCount += cell.flagged ? 1 : -1;
      sounds.play("minimize");
    },
    reveal(idx) {
      const cell = this.board[idx];
      if (cell.revealed || cell.flagged) return;
      cell.revealed = true;
      this.revealedCount += 1;
      if (cell.mine) {
        sounds.play("error");
        this.endState = "lose";
        this.revealAllMines();
        this.stopTimer();
        return;
      }
      sounds.play("open");
      if (cell.adj === 0) {
        for (const nb of this.neighbors(idx)) {
          const ncell = this.board[nb];
          if (!ncell.revealed && !ncell.mine) this.reveal(nb);
        }
      }
      this.checkWin();
    },
    revealAllMines() {
      for (const c of this.board) {
        if (c.mine) c.revealed = true;
      }
    },
    checkWin() {
      const totalSafe = this.board.length - this.mineCount;
      if (this.revealedCount >= totalSafe) {
        this.endState = "win";
        this.stopTimer();
        this.saveBestTime();
        unlockAchievement("minesweeper-won");
      }
    },
    cellClass(cell) {
      if (!cell.revealed) {
        return { "ms-hidden": true, "ms-flag-on": cell.flagged };
      }
      return {
        "ms-revealed": true,
        "ms-mine": cell.mine,
        [`ms-adj-${cell.adj}`]: !cell.mine && cell.adj > 0,
      };
    },
    startTimer() {
      this.stopTimer();
      const start = Date.now();
      this.timerHandle = setInterval(() => {
        this.timer = Math.floor((Date.now() - start) / 1000);
      }, 250);
    },
    stopTimer() {
      if (this.timerHandle) {
        clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
    },
    bestKey() {
      return `minesweeper-best-${this.difficulty}`;
    },
    loadBestTime() {
      try {
        const v = localStorage.getItem(this.bestKey());
        return v ? parseInt(v, 10) : null;
      } catch (_) {
        return null;
      }
    },
    saveBestTime() {
      try {
        const prev = this.loadBestTime();
        if (prev === null || this.timer < prev) {
          localStorage.setItem(this.bestKey(), String(this.timer));
          this.bestTime = this.timer;
        }
      } catch (_) {}
    },
    // Mobile: long-press flags, tap reveals.
    onTouchStart(event, cell) {
      if (this.endState || cell.revealed) return;
      const t = event.changedTouches[0];
      this.touch.startX = t.clientX;
      this.touch.startY = t.clientY;
      this.touch.longPressFired = false;
      this.clearLongPress();
      this.touch.longPressTimer = setTimeout(() => {
        this.touch.longPressFired = true;
        this.toggleFlag(cell);
      }, LONG_PRESS_MS);
    },
    onTouchEnd(event, cell) {
      this.clearLongPress();
      if (this.touch.longPressFired) {
        event.preventDefault();
        return;
      }
      // Tap: reveal. Use preventDefault so the synthesized click does not also fire.
      const t = event.changedTouches[0];
      const dx = Math.abs(t.clientX - this.touch.startX);
      const dy = Math.abs(t.clientY - this.touch.startY);
      if (dx <= TOUCH_MOVE_TOLERANCE && dy <= TOUCH_MOVE_TOLERANCE) {
        event.preventDefault();
        this.onLeftClick(cell);
      }
    },
    onTouchMove(event) {
      const t = event.changedTouches[0];
      const dx = Math.abs(t.clientX - this.touch.startX);
      const dy = Math.abs(t.clientY - this.touch.startY);
      if (dx > TOUCH_MOVE_TOLERANCE || dy > TOUCH_MOVE_TOLERANCE) {
        this.clearLongPress();
      }
    },
    clearLongPress() {
      if (this.touch.longPressTimer) {
        clearTimeout(this.touch.longPressTimer);
        this.touch.longPressTimer = null;
      }
    },
  },
};
</script>

<style scoped>
.ms-window {
  --ms-cell: 32px;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #2b2b35;
  color: #f0f0f0;
  font-family: 'PortfolioFont', sans-serif;
  overflow: hidden;
}

.ms-diff-medium { --ms-cell: 26px; }
.ms-diff-hard   { --ms-cell: 22px; }

.ms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(180deg, #3a3a48, #2b2b35);
  border-bottom: 1px solid #000;
  gap: 8px;
  flex-wrap: wrap;
}

.ms-status {
  display: flex;
  gap: 14px;
  font-size: 14px;
}

.ms-counter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1a1a24;
  padding: 4px 8px;
  border: 1px solid #000;
  border-radius: 3px;
}

.ms-actions {
  display: flex;
  gap: 8px;
}

.ms-actions select,
.ms-btn {
  font-family: inherit;
  background: #1a1a24;
  color: #f0f0f0;
  border: 1px solid #000;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 3px;
}

.ms-btn:hover,
.ms-actions select:hover {
  background: #232331;
}

.ms-banner {
  text-align: center;
  padding: 6px;
  font-size: 14px;
  border-bottom: 1px solid #000;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.ms-banner.win  { background: #2e6b2e; }
.ms-banner.lose { background: #6b2e2e; }

.ms-best { opacity: 0.85; font-size: 12px; }

.ms-board-wrap {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12px;
}

.ms-board {
  display: grid;
  gap: 1px;
  background: #000;
  padding: 1px;
  user-select: none;
  touch-action: manipulation;
}

.ms-cell {
  width: var(--ms-cell);
  height: var(--ms-cell);
  border: none;
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-weight: 700;
  font-size: calc(var(--ms-cell) * 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
}

.ms-hidden {
  background: linear-gradient(135deg, #c0c0c8, #9090a0);
  box-shadow: inset 1px 1px 0 #f0f0f5, inset -1px -1px 0 #555560;
}

.ms-hidden:hover:not([disabled]) {
  filter: brightness(1.08);
}

.ms-revealed {
  background: #d8d8de;
  box-shadow: inset 0 0 0 1px #888;
  cursor: default;
}

.ms-mine {
  background: #c04040;
  color: #fff;
}

.ms-flag-on .ms-flag,
.ms-flag {
  color: #c04040;
}

/* Number colors mirror the classic Windows palette. */
.ms-adj-1 { color: #1a1aff; }
.ms-adj-2 { color: #008000; }
.ms-adj-3 { color: #ff0000; }
.ms-adj-4 { color: #000080; }
.ms-adj-5 { color: #800000; }
.ms-adj-6 { color: #008080; }
.ms-adj-7 { color: #000000; }
.ms-adj-8 { color: #808080; }

@media (max-width: 768px) {
  .ms-window           { --ms-cell: 30px; }
  .ms-diff-medium      { --ms-cell: 22px; }
  .ms-diff-hard        { --ms-cell: 18px; }
  .ms-header           { font-size: 12px; padding: 6px 8px; }
}
</style>

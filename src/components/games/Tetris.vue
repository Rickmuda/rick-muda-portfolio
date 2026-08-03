<template>
  <div class="tet-window">
    <div class="tet-header">
      <div class="tet-stats">
        <span><b>{{ $t('tetrisScore') }}:</b> {{ score }}</span>
        <span><b>{{ $t('tetrisLevel') }}:</b> {{ level }}</span>
        <span><b>{{ $t('tetrisLines') }}:</b> {{ lines }}</span>
      </div>
      <button class="tet-btn" @click="newGame">{{ $t('tetrisStart') }}</button>
    </div>

    <div class="tet-play">
      <div class="tet-board-wrap">
        <div class="tet-board" :style="boardStyle">
          <div
            v-for="(cell, idx) in renderCells"
            :key="idx"
            class="tet-cell"
            :class="cell ? `tet-c-${cell}` : 'tet-empty'"
          ></div>
        </div>
        <div v-if="gameOver" class="tet-overlay">
          <div class="tet-banner">{{ $t('tetrisGameOver') }}</div>
          <div class="tet-banner sub">{{ $t('tetrisScore') }}: {{ score }}</div>
          <div class="tet-banner sub" v-if="bestScore">{{ $t('flappyBest') }}: {{ bestScore }}</div>
          <button class="tet-btn" @click="newGame">{{ $t('tetrisStart') }}</button>
        </div>
      </div>

      <div class="tet-side">
        <div class="tet-next-label">{{ $t('tetrisNext') }}</div>
        <div class="tet-preview">
          <div
            v-for="(cell, idx) in nextPreviewCells"
            :key="idx"
            class="tet-cell preview"
            :class="cell ? `tet-c-${cell}` : 'tet-empty'"
          ></div>
        </div>
        <div class="tet-instructions">{{ $t('tetrisInstructions') }}</div>
      </div>
    </div>

    <div class="tet-touch">
      <button class="tet-tbtn" @click="move(-1)" aria-label="Left">&#9664;</button>
      <button class="tet-tbtn" @click="rotate" aria-label="Rotate">&#10227;</button>
      <button class="tet-tbtn" @click="move(1)" aria-label="Right">&#9654;</button>
      <button class="tet-tbtn" @click="softDrop" aria-label="Soft drop">&#9660;</button>
      <button class="tet-tbtn" @click="hardDrop" aria-label="Hard drop">&#8650;</button>
    </div>
  </div>
</template>

<script>
import { sounds } from "../../sounds";
import { unlock as unlockAchievement } from "../../achievements";

const COLS = 10;
const ROWS = 20;

// Each piece: 4x4 matrices for each rotation. 1 = filled. Color is the piece key.
function rotateMatrix(m) {
  const n = m.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      out[x][n - 1 - y] = m[y][x];
    }
  }
  return out;
}

function buildRotations(base) {
  const rots = [base];
  for (let i = 1; i < 4; i += 1) rots.push(rotateMatrix(rots[i - 1]));
  // De-dupe identical rotations (e.g. O has only one).
  const unique = [];
  const seen = new Set();
  for (const r of rots) {
    const key = r.map((row) => row.join("")).join("/");
    if (!seen.has(key)) { seen.add(key); unique.push(r); }
  }
  return unique;
}

const PIECES = {
  I: buildRotations([[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]]),
  O: buildRotations([[1,1,0,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]]),
  T: buildRotations([[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]]),
  L: buildRotations([[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]]),
  J: buildRotations([[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]]),
  S: buildRotations([[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]]),
  Z: buildRotations([[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]]),
};

const KEYS = ["I", "O", "T", "L", "J", "S", "Z"];

function makeBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(""));
}

function randomPiece() {
  const key = KEYS[Math.floor(Math.random() * KEYS.length)];
  return { key, rot: 0, x: 3, y: 0 };
}

export default {
  name: "Tetris",
  data() {
    return {
      board: makeBoard(),
      current: null,
      nextPiece: randomPiece(),
      score: 0,
      lines: 0,
      level: 1,
      gameOver: true,
      bestScore: 0,
      dropHandle: null,
      lastTick: 0,
      achievementFired: false,
    };
  },
  computed: {
    boardStyle() {
      return {
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      };
    },
    dropIntervalMs() {
      return Math.max(80, 700 - (this.level - 1) * 60);
    },
    renderCells() {
      const view = this.board.map((row) => row.slice());
      if (this.current && !this.gameOver) {
        const shape = PIECES[this.current.key][this.current.rot];
        for (let y = 0; y < 4; y += 1) {
          for (let x = 0; x < 4; x += 1) {
            if (!shape[y][x]) continue;
            const by = this.current.y + y;
            const bx = this.current.x + x;
            if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
              view[by][bx] = this.current.key;
            }
          }
        }
      }
      return view.flat();
    },
    nextPreviewCells() {
      const shape = PIECES[this.nextPiece.key][0];
      const out = [];
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          out.push(shape[y][x] ? this.nextPiece.key : "");
        }
      }
      return out;
    },
  },
  mounted() {
    this.bestScore = this.loadBest();
    window.addEventListener("keydown", this.handleKey);
    this.newGame();
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.handleKey);
    this.stopDrop();
  },
  methods: {
    newGame() {
      this.board = makeBoard();
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.gameOver = false;
      this.achievementFired = false;
      this.nextPiece = randomPiece();
      this.spawn();
      this.scheduleDrop();
    },
    spawn() {
      this.current = this.nextPiece;
      this.nextPiece = randomPiece();
      if (this.collides(this.current.x, this.current.y, this.current.rot)) {
        this.endGame();
      }
    },
    collides(nx, ny, rot) {
      const shape = PIECES[this.current.key][rot];
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          if (!shape[y][x]) continue;
          const by = ny + y;
          const bx = nx + x;
          if (bx < 0 || bx >= COLS || by >= ROWS) return true;
          if (by >= 0 && this.board[by][bx]) return true;
        }
      }
      return false;
    },
    move(dir) {
      if (this.gameOver || !this.current) return;
      if (!this.collides(this.current.x + dir, this.current.y, this.current.rot)) {
        this.current = { ...this.current, x: this.current.x + dir };
      }
    },
    rotate() {
      if (this.gameOver || !this.current) return;
      const rotations = PIECES[this.current.key].length;
      const nextRot = (this.current.rot + 1) % rotations;
      if (!this.collides(this.current.x, this.current.y, nextRot)) {
        this.current = { ...this.current, rot: nextRot };
      }
    },
    softDrop() {
      if (this.gameOver || !this.current) return;
      if (!this.collides(this.current.x, this.current.y + 1, this.current.rot)) {
        this.current = { ...this.current, y: this.current.y + 1 };
        this.score += 1;
      } else {
        this.lockPiece();
      }
    },
    hardDrop() {
      if (this.gameOver || !this.current) return;
      let drop = 0;
      while (!this.collides(this.current.x, this.current.y + drop + 1, this.current.rot)) {
        drop += 1;
      }
      this.current = { ...this.current, y: this.current.y + drop };
      this.score += drop * 2;
      this.lockPiece();
    },
    lockPiece() {
      const shape = PIECES[this.current.key][this.current.rot];
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          if (!shape[y][x]) continue;
          const by = this.current.y + y;
          const bx = this.current.x + x;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            this.board[by][bx] = this.current.key;
          }
        }
      }
      this.clearLines();
      this.spawn();
    },
    clearLines() {
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y -= 1) {
        if (this.board[y].every((c) => c)) {
          this.board.splice(y, 1);
          this.board.unshift(Array(COLS).fill(""));
          cleared += 1;
          y += 1; // recheck same row after shift
        }
      }
      if (cleared > 0) {
        const pointsTable = { 1: 40, 2: 100, 3: 300, 4: 1200 };
        this.score += (pointsTable[cleared] || 0) * this.level;
        this.lines += cleared;
        this.level = 1 + Math.floor(this.lines / 10);
        sounds.play("open");
        if (this.lines >= 10 && !this.achievementFired) {
          this.achievementFired = true;
          unlockAchievement("block-buster");
        }
      }
    },
    scheduleDrop() {
      this.stopDrop();
      const tick = () => {
        if (this.gameOver) return;
        if (this.current && !this.collides(this.current.x, this.current.y + 1, this.current.rot)) {
          this.current = { ...this.current, y: this.current.y + 1 };
        } else if (this.current) {
          this.lockPiece();
        }
        this.dropHandle = setTimeout(tick, this.dropIntervalMs);
      };
      this.dropHandle = setTimeout(tick, this.dropIntervalMs);
    },
    stopDrop() {
      if (this.dropHandle) {
        clearTimeout(this.dropHandle);
        this.dropHandle = null;
      }
    },
    endGame() {
      this.gameOver = true;
      this.stopDrop();
      sounds.play("error");
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.saveBest(this.score);
      }
    },
    loadBest() {
      try {
        return parseInt(localStorage.getItem("tetris-best") || "0", 10);
      } catch (_) { return 0; }
    },
    saveBest(v) {
      try { localStorage.setItem("tetris-best", String(v)); } catch (_) {}
    },
    handleKey(e) {
      if (this.gameOver) return;
      switch (e.key) {
        case "ArrowLeft":  this.move(-1); e.preventDefault(); break;
        case "ArrowRight": this.move(1);  e.preventDefault(); break;
        case "ArrowDown":  this.softDrop(); e.preventDefault(); break;
        case "ArrowUp":    this.rotate();   e.preventDefault(); break;
        case " ":          this.hardDrop(); e.preventDefault(); break;
        default: break;
      }
    },
  },
};
</script>

<style scoped>
.tet-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a24;
  color: #f0f0f0;
  font-family: 'PortfolioFont', sans-serif;
  overflow: hidden;
}

.tet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(180deg, #3a3a48, #2b2b35);
  border-bottom: 1px solid #000;
  gap: 8px;
  flex-wrap: wrap;
}

.tet-stats {
  display: flex;
  gap: 14px;
  font-size: 13px;
}

.tet-btn {
  font-family: inherit;
  background: #1a1a24;
  color: #f0f0f0;
  border: 1px solid #000;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 3px;
}

.tet-btn:hover { background: #232331; }

.tet-play {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 12px;
  min-height: 0;
  justify-content: center;
}

.tet-board-wrap {
  position: relative;
  aspect-ratio: 10 / 20;
  height: 100%;
  max-height: 600px;
}

.tet-board {
  display: grid;
  gap: 1px;
  background: #000;
  padding: 2px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.tet-cell {
  width: 100%;
  height: 100%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
}

.tet-empty { background: #2a2a36; }

.tet-c-I { background: #00cfd9; }
.tet-c-O { background: #d9c700; }
.tet-c-T { background: #a020c4; }
.tet-c-L { background: #f08000; }
.tet-c-J { background: #2050d0; }
.tet-c-S { background: #20c040; }
.tet-c-Z { background: #d02040; }

.tet-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.tet-banner { font-size: 22px; font-weight: 700; }
.tet-banner.sub { font-size: 14px; opacity: 0.8; }

.tet-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 96px;
}

.tet-next-label {
  font-size: 12px;
  opacity: 0.8;
  text-transform: uppercase;
}

.tet-preview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 1px;
  background: #000;
  padding: 2px;
  width: 96px;
  height: 96px;
}

.tet-cell.preview {
  width: auto;
  height: auto;
}

.tet-instructions {
  font-size: 11px;
  opacity: 0.7;
  line-height: 1.3;
}

.tet-touch {
  display: none;
  gap: 6px;
  padding: 8px;
  background: #15151c;
  border-top: 1px solid #000;
  justify-content: center;
}

.tet-tbtn {
  flex: 1;
  max-width: 80px;
  padding: 12px 0;
  background: #2a2a36;
  color: #f0f0f0;
  border: 1px solid #000;
  border-radius: 6px;
  font-size: 18px;
  cursor: pointer;
}

.tet-tbtn:active { background: #404050; }

/* Also matches touch tablets up to 1200px wide (not just phones) so a
   coarse-pointer device in landscape gets the touch-friendly layout instead
   of falling into the mouse-oriented desktop one. */
@media (max-width: 768px), (pointer: coarse) and (max-width: 1200px) {
  .tet-play { gap: 8px; padding: 8px; }
  .tet-side { min-width: 70px; }
  .tet-preview { width: 70px; height: 70px; }
  .tet-touch { display: flex; }
  .tet-stats { font-size: 11px; gap: 8px; }
}
</style>

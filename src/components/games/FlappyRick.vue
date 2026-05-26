<template>
  <div class="flappy-window">
    <div ref="stage" class="flappy-stage" @click="onPress" @touchstart.prevent="onPress">
      <canvas ref="canvas" class="flappy-canvas"></canvas>

      <div v-if="state === 'ready'" class="flappy-overlay">
        <p class="flappy-title">{{ $t('flappyRick') }}</p>
        <p class="flappy-hint">{{ $t('flappyInstructions') }}</p>
        <button type="button" @click.stop="start">{{ $t('flappyStart') }}</button>
      </div>

      <div v-if="state === 'playing' && awaitingFirstFlap" class="flappy-tap-hint">
        {{ $t('flappyInstructions') }}
      </div>

      <div v-else-if="state === 'over'" class="flappy-overlay">
        <p class="flappy-title">{{ $t('flappyGameOver') }}</p>
        <p class="flappy-hint">{{ $t('flappyScore') }}: {{ score }} · {{ $t('flappyBest') }}: {{ best }}</p>
        <button type="button" @click.stop="start">{{ $t('flappyRestart') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
// Self-contained Flappy Bird clone. The "bird" is Rick's avatar (self-image-1.webp).
// The canvas is sized to its container (this.W x this.H) so it fills the whole
// window; a ResizeObserver keeps the drawing buffer in sync with the layout.
import birdSrc from "../../assets/img/self-image-1.webp";
import bgSrc from "../../assets/img/imggallery/room.webp";

const GRAVITY = 0.2;
const FLAP = -5.4;
const BIRD_SIZE = 44;
const PIPE_WIDTH = 64;
const PIPE_GAP = 250;
const PIPE_SPACING = 340; // horizontal distance between pipe pairs
const PIPE_SPEED = 1.2;
const BG_SPEED = 0.5; // background scrolls slower than pipes for a parallax feel

export default {
  name: "FlappyRick",
  data() {
    return {
      state: "ready", // ready | playing | over
      awaitingFirstFlap: false, // bird hovers in place until the first flap
      score: 0,
      best: Number(localStorage.getItem("flappyRickBest") || 0),
      W: 400, // current canvas size, set from the container on mount/resize
      H: 600,
      bird: { x: 112, y: 300, vy: 0 },
      pipes: [],
      ctx: null,
      birdImg: null,
      bgImg: null,
      bgX: 0,
      rafId: null,
      resizeObserver: null,
    };
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext("2d");
    this.resize();

    this.birdImg = new Image();
    this.birdImg.src = birdSrc;
    this.birdImg.onload = () => this.draw();

    this.bgImg = new Image();
    this.bgImg.src = bgSrc;
    this.bgImg.onload = () => this.draw();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.$refs.stage);

    window.addEventListener("keydown", this.onKey);
    this.draw();
  },
  beforeUnmount() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.onKey);
    if (this.resizeObserver) this.resizeObserver.disconnect();
  },
  methods: {
    resize() {
      const stage = this.$refs.stage;
      if (!stage) return;
      const w = Math.max(1, Math.round(stage.clientWidth));
      const h = Math.max(1, Math.round(stage.clientHeight));
      // Keep the bird at the same vertical fraction across resizes.
      const yFraction = this.bird.y / this.H;
      this.W = w;
      this.H = h;
      this.$refs.canvas.width = w;
      this.$refs.canvas.height = h;
      this.bird.x = w * 0.28;
      this.bird.y = yFraction * h;
      this.draw();
    },
    start() {
      this.score = 0;
      this.bird = { x: this.W * 0.28, y: this.H / 2, vy: 0 };
      this.pipes = [];
      this.spawnPipe(this.W + 80);
      this.spawnPipe(this.W + 80 + PIPE_SPACING);
      this.state = "playing";
      this.awaitingFirstFlap = true;
      cancelAnimationFrame(this.rafId);
      this.loop();
    },
    spawnPipe(x) {
      const margin = 60;
      const gapTop = margin + Math.random() * (this.H - PIPE_GAP - margin * 2);
      this.pipes.push({ x, gapTop, scored: false });
    },
    onKey(e) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        this.onPress();
      }
    },
    onPress() {
      if (this.state === "ready") {
        this.start();
      } else if (this.state === "playing") {
        this.flap();
      } else if (this.state === "over") {
        this.start();
      }
    },
    flap() {
      this.awaitingFirstFlap = false;
      this.bird.vy = FLAP;
    },
    loop() {
      this.update();
      this.draw();
      if (this.state === "playing") {
        this.rafId = requestAnimationFrame(this.loop);
      }
    },
    update() {
      const bird = this.bird;
      // Hold the bird hovering at the center until the player's first flap.
      if (this.awaitingFirstFlap) {
        bird.vy = 0;
        bird.y = this.H / 2 + Math.sin(Date.now() / 300) * 6;
        return;
      }
      bird.vy += GRAVITY;
      bird.y += bird.vy;

      this.bgX -= BG_SPEED; // looped seamlessly in draw()

      // Move pipes, recycle and spawn, score when passed.
      for (const pipe of this.pipes) {
        pipe.x -= PIPE_SPEED;
        if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
          pipe.scored = true;
          this.score++;
        }
      }
      if (this.pipes.length && this.pipes[0].x + PIPE_WIDTH < 0) {
        this.pipes.shift();
        const lastX = this.pipes[this.pipes.length - 1].x;
        this.spawnPipe(lastX + PIPE_SPACING);
      }

      if (this.hasCollision()) {
        this.gameOver();
      }
    },
    hasCollision() {
      const bird = this.bird;
      const half = BIRD_SIZE / 2;
      // Slightly forgiving hitbox so the round avatar feels fair.
      const pad = 11;
      const top = bird.y - half + pad;
      const bottom = bird.y + half - pad;
      const left = bird.x - half + pad;
      const right = bird.x + half - pad;

      if (bottom >= this.H || top <= 0) return true;

      for (const pipe of this.pipes) {
        const inX = right > pipe.x && left < pipe.x + PIPE_WIDTH;
        if (inX) {
          const gapBottom = pipe.gapTop + PIPE_GAP;
          if (top < pipe.gapTop || bottom > gapBottom) return true;
        }
      }
      return false;
    },
    gameOver() {
      this.state = "over";
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem("flappyRickBest", String(this.best));
      }
      cancelAnimationFrame(this.rafId);
    },
    draw() {
      const ctx = this.ctx;
      if (!ctx) return;

      // Background: room.webp scrolled left and tiled so it loops seamlessly.
      if (this.bgImg && this.bgImg.complete && this.bgImg.naturalWidth) {
        // Scale the image to fill the canvas height, then tile horizontally.
        const tileW = this.H * (this.bgImg.naturalWidth / this.bgImg.naturalHeight);
        // Normalize offset into [-tileW, 0) so we only ever draw a couple of tiles.
        let startX = this.bgX % tileW;
        if (startX > 0) startX -= tileW;
        for (let x = startX; x < this.W; x += tileW) {
          ctx.drawImage(this.bgImg, x, 0, tileW, this.H);
        }
        // Subtle dark overlay so pipes and the bird stay readable.
        ctx.fillStyle = "rgba(20, 6, 30, 0.35)";
        ctx.fillRect(0, 0, this.W, this.H);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, this.H);
        sky.addColorStop(0, "#2a0a3a");
        sky.addColorStop(1, "#6a1a8a");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, this.W, this.H);
      }

      // Pipes
      ctx.fillStyle = "#9b20b7";
      ctx.strokeStyle = "#3a0944";
      ctx.lineWidth = 3;
      for (const pipe of this.pipes) {
        const gapBottom = pipe.gapTop + PIPE_GAP;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapTop);
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapTop);
        ctx.fillRect(pipe.x, gapBottom, PIPE_WIDTH, this.H - gapBottom);
        ctx.strokeRect(pipe.x, gapBottom, PIPE_WIDTH, this.H - gapBottom);
      }

      // Bird (Rick's avatar), rotated toward velocity, clipped to a circle.
      const bird = this.bird;
      const half = BIRD_SIZE / 2;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      const angle = Math.max(-0.5, Math.min(1, bird.vy / 12));
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.arc(0, 0, half, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (this.birdImg && this.birdImg.complete) {
        ctx.drawImage(this.birdImg, -half, -half, BIRD_SIZE, BIRD_SIZE);
      } else {
        ctx.fillStyle = "#fff";
        ctx.fillRect(-half, -half, BIRD_SIZE, BIRD_SIZE);
      }
      ctx.restore();
      // Ring around the avatar
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, half, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Live score, top-left. Hidden on the game-over screen (the overlay shows
      // the final score + best there instead).
      if (this.state === "playing") {
        ctx.font = "bold 36px 'PortfolioFont', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
        ctx.strokeText(String(this.score), 16, 14);
        ctx.fillStyle = "#fff";
        ctx.fillText(String(this.score), 16, 14);
      }
    },
  },
};
</script>

<style scoped>
.flappy-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a24;
  color: #fff;
  border: 2px solid #000;
  overflow: hidden;
}

.flappy-stage {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  cursor: pointer;
  user-select: none;
}

.flappy-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.flappy-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.55);
  text-align: center;
  padding: 20px;
}

.flappy-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
}

.flappy-hint {
  margin: 0;
  font-size: 14px;
  color: #d4a8e8;
  max-width: 280px;
}

.flappy-overlay button {
  background: #9b20b7;
  border: 1px solid #4f115d;
  color: #fff;
  border-radius: 8px;
  padding: 10px 22px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.flappy-overlay button:hover {
  background: #c637e6;
}

.flappy-tap-hint {
  position: absolute;
  left: 50%;
  bottom: 18%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.55);
  color: #d4a8e8;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  max-width: 80%;
  pointer-events: none; /* let clicks pass through to flap */
  animation: flappy-pulse 1.1s ease-in-out infinite;
}

@keyframes flappy-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
</style>

<template>
  <div class="intro3d" :class="{ leaving }">
    <canvas ref="canvas" class="intro3d-canvas" :class="{ ready }" aria-hidden="true"></canvas>
    <button class="intro3d-skip" @click="skip">
      {{ skipLabel }} <kbd>Esc</kbd>
    </button>
  </div>
</template>

<script>
// 3D intro: shows the room, flies the camera into the middle monitor and hands
// over to the real BootScreen. The monitor shows a pixel-matched copy of the
// BootScreen's first frame, so the swap from WebGL to DOM is invisible.
//
// Events:
//   screen - the camera has filled the viewport with the monitor; mount the
//            BootScreen underneath now.
//   done   - the intro has faded out; unmount it.
import * as THREE from "three";
import { loadRoom } from "./room";

const IDLE_MS = 2200;   // look at the room before moving
const ZOOM_MS = 5000;   // camera flight into the screen
const FADE_MS = 350;    // crossfade onto the DOM BootScreen
const FOV = 45;          // landscape viewports
const FOV_PORTRAIT = 62; // wider lens on phones so the room still fits

// Camera flights per target screen: start point, a point along the way, and
// where the camera looks at the start.
const FLIGHTS = {
  monitor: {
    from: [1.5, 1.65, 1.9],   // near the door
    via: [0.45, 1.32, -0.15], // over the chair
    lookFrom: [-0.1, 1.2, -1.4],
  },
  phone: {
    from: [1.35, 1.6, 1.7],
    via: [0.75, 1.15, -0.55],  // down past the chair to the desk
    lookFrom: [0.0, 1.05, -1.45],
  },
};

// Retro look: the scene renders at LOW_LINES vertical pixels (N64 = 240) and
// is scaled up with hard nearest-neighbour pixels, quantized to 15-bit color
// with ordered dithering. In the last part of the zoom the resolution steps
// up (like a console switching video mode) so the hand-off to the sharp DOM
// BootScreen stays seamless.
const LOW_LINES = 240;
const RES_STEPS = [240, 360, 540, 0]; // 0 = native resolution
const RES_UP_FROM = 0.72;              // zoom progress where stepping starts
const COLOR_LEVELS = 31;               // 31 = 15-bit N64 color, 63 = smoother

const POST_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const POST_FRAG = `
uniform sampler2D tScene;
uniform vec2 lowRes;
uniform float dither;
uniform float levels;
varying vec2 vUv;
float bayer4(vec2 p) {
  int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
void main() {
  vec4 c = linearToOutputTexel(texture2D(tScene, vUv));
  // Reduced color depth (31 levels = 5 bits per channel) with a 4x4 ordered dither, N64 style.
  float b = bayer4(floor(vUv * lowRes)) - 0.5;
  vec3 q = floor((c.rgb + b / levels) * levels + 0.5) / levels;
  gl_FragColor = vec4(mix(c.rgb, q, dither), 1.0);
}
`;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Draws the BootScreen's first frame (logo, version, spinner on its gradient)
// at viewport size, cropped the same way the monitor will cover the viewport.
async function drawBootFrame(canvas, version) {
  try { await document.fonts.load('800 56px "PortfolioFont"'); } catch (_) {}
  const ctx = canvas.getContext("2d");
  const tw = canvas.width, th = canvas.height;
  const vw = window.innerWidth, vh = window.innerHeight;
  const k = Math.max(vw / tw, vh / th); // viewport px per texture px when covering
  ctx.setTransform(1 / k, 0, 0, 1 / k, tw / 2 - vw / 2 / k, th / 2 - vh / 2 / k);

  // Fill well past the viewport so the cropped edges are never empty.
  const cx = vw * 0.5, cy = vh * 0.4;
  const r = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, "#4a0d5c");
  grad.addColorStop(0.7, "#1a1a24");
  grad.addColorStop(1, "#000");
  ctx.fillStyle = grad;
  ctx.fillRect(-vw, -vh, vw * 3, vh * 3);

  // Same vertical layout as BootScreen.vue's flex column.
  const mobile = vw <= 768;
  const logoPx = mobile ? 40 : 56;
  const blockH = logoPx * 1.2 + 6 + 16 + 32 + (mobile ? 120 : 140) + 28 + 28;
  const top = vh / 2 - blockH / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(155, 32, 183, 0.6)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${logoPx}px "PortfolioFont", monospace`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
  ctx.fillText("MudaOS", cx, top + (logoPx * 1.2) / 2);

  ctx.fillStyle = "#9b20b7";
  ctx.font = `13px "PortfolioFont", monospace`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
  ctx.fillText(`V${version}`.toUpperCase(), cx, top + logoPx * 1.2 + 6 + 8);

  const sy = top + blockH - 14;
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(155, 32, 183, 0.3)";
  ctx.beginPath(); ctx.arc(cx, sy, 12.5, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#c637e6";
  ctx.beginPath(); ctx.arc(cx, sy, 12.5, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke();
}

export default {
  name: "Intro3D",
  props: {
    // "monitor" for the desktop intro, "phone" for the mobile one.
    target: { type: String, default: "monitor" },
  },
  emits: ["screen", "done"],
  data() {
    return { leaving: false, ready: false };
  },
  computed: {
    skipLabel() {
      return this.$i18n?.locale === "nl" ? "Intro overslaan" : "Skip intro";
    },
  },
  async mounted() {
    // Whatever goes wrong while setting up, never leave the visitor stuck on
    // the intro: fall straight through to the boot screen.
    try {
      await this.setup();
    } catch (err) {
      console.warn("[Intro3D] intro failed, skipping it", err);
      this.finish(true);
    }
  },
  beforeUnmount() {
    this.finished = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKey);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.room?.scene.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { m?.map?.dispose(); m?.dispose?.(); });
    });
    this.rt?.dispose();
    this.post?.dispose();
    this.renderer?.dispose();
  },
  methods: {
    // Builds the renderer, room and camera, then starts the animation.
    async setup() {
      this.finished = false;
      window.addEventListener("keydown", this.onKey);
      document.addEventListener("visibilitychange", this.onVisibility);
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.$refs.canvas, antialias: true });
      } catch (_) {
        this.finish(true); // no WebGL: go straight to the boot screen
        return;
      }
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      try {
        this.room = await loadRoom();
      } catch (err) {
        console.warn("[Intro3D] room failed to load", err);
        this.finish(true);
        return;
      }
      if (this.finishing) return; // skipped while loading
      this.screen = this.room.screens[this.target] || this.room.screens.monitor;

      // Boot frame texture on the main monitor.
      this.bootCanvas = document.createElement("canvas");
      // Longest side 2048 px, in the target screen's aspect ratio.
      const aspect = this.screen.width / this.screen.height;
      this.bootCanvas.width = aspect >= 1 ? 2048 : Math.round(2048 * aspect);
      this.bootCanvas.height = aspect >= 1 ? Math.round(2048 / aspect) : 2048;
      await drawBootFrame(this.bootCanvas, __COMMIT_SUMMARY__);
      if (this.finishing) return;
      const tex = new THREE.CanvasTexture(this.bootCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      this.screen.mesh.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false });

      // Low-res render target + fullscreen pass that upscales and dithers.
      this.rt = new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        // Half float: an 8-bit linear buffer bands badly in dark gradients.
        type: THREE.HalfFloatType,
        depthBuffer: true,
      });
      this.post = new THREE.ShaderMaterial({
        uniforms: {
          tScene: { value: this.rt.texture },
          lowRes: { value: new THREE.Vector2(1, 1) },
          dither: { value: 1 },
          levels: { value: COLOR_LEVELS },
        },
        vertexShader: POST_VERT,
        fragmentShader: POST_FRAG,
        depthTest: false,
        depthWrite: false,
      });
      this.postScene = new THREE.Scene();
      this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
      this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.lines = LOW_LINES;

      this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.005, 50);
      this.onResize();
      window.addEventListener("resize", this.onResize);

      // Own clock: pauses while the tab is hidden, so visitors who switch
      // tabs don't come back to a finished intro.
      this.elapsed = 0;
      this.last = performance.now();
      this.tick();
      this.ready = true; // fade the canvas in now that the first frame exists
    },
    // Builds the camera flight. The end point is the distance at which the
    // monitor exactly covers the viewport, so it depends on the aspect ratio.
    onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.renderer.setSize(w, h, false);
      this.lines = null; // force the render target to resize
      this.camera.aspect = w / h;
      this.camera.fov = w < h ? FOV_PORTRAIT : FOV;
      this.camera.updateProjectionMatrix();

      const { center: c, normal: n, width: sw, height: sh } = this.screen;
      const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const dist = Math.min(sh / 2 / tan, sw / 2 / (tan * this.camera.aspect)) * 0.995;
      const end = c.clone().addScaledVector(n, dist);

      const flight = FLIGHTS[this.target] || FLIGHTS.monitor;
      // Line up in front of the screen; closer for the small phone.
      const lineUp = Math.max(sw, sh) < 0.3 ? 0.18 : 0.35;
      this.path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(...flight.from),
        new THREE.Vector3(...flight.via),
        c.clone().addScaledVector(n, lineUp),
        end,
      ], false, "centripetal");
      this.lookFrom = new THREE.Vector3(...flight.lookFrom);
      this.lookTo = c.clone();
      // Re-crop the boot frame for the new viewport shape.
      if (this.bootCanvas && this.screen.mesh.material.map) {
        drawBootFrame(this.bootCanvas, __COMMIT_SUMMARY__).then(() => {
          if (this.room) this.screen.mesh.material.map.needsUpdate = true;
        });
      }
    },
    tick() {
      if (this.finished) return;
      this.raf = requestAnimationFrame(this.tick);
      try {
        this.frame();
      } catch (err) {
        console.warn("[Intro3D] render error, skipping intro", err);
        cancelAnimationFrame(this.raf);
        this.finish(true);
      }
    },
    frame() {
      const now = performance.now();
      // Real time, also on slow devices or throttled background windows.
      // Time while the tab is hidden is skipped (see onVisibility).
      this.elapsed += Math.min(now - this.last, 1000);
      this.last = now;
      const elapsed = this.elapsed;
      const sway = Math.max(0, 1 - elapsed / IDLE_MS);
      const raw = Math.min(1, Math.max(0, (elapsed - IDLE_MS) / ZOOM_MS));
      const t = easeInOutCubic(raw);

      const pos = this.path.getPointAt(t);
      // Small idle drift so the room doesn't feel like a still image.
      pos.x += Math.sin(elapsed / 700) * 0.04 * sway;
      pos.y += Math.sin(elapsed / 900) * 0.02 * sway;
      this.camera.position.copy(pos);
      // Turn towards the screen faster than we travel, so we end square on it.
      const look = this.lookFrom.clone().lerp(this.lookTo, Math.min(1, t * 1.6));
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(look);
      this.room.animate(elapsed);
      this.renderRetro(raw);

      if (raw >= 1) this.finish(false);
    },
    // Renders the scene into the low-res target, then upscales it to the
    // canvas with hard pixels and dithering.
    renderRetro(progress) {
      const step = progress < RES_UP_FROM
        ? 0
        : Math.min(RES_STEPS.length - 1,
            Math.floor(((progress - RES_UP_FROM) / (1 - RES_UP_FROM)) * RES_STEPS.length));
      const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      const lines = RES_STEPS[step] || size.y;
      if (lines !== this.lines) {
        this.lines = lines;
        const lh = Math.min(lines, size.y);
        const lw = Math.round(lh * (size.x / size.y));
        this.rt.setSize(lw, lh);
        this.post.uniforms.lowRes.value.set(lw, lh);
        // Color depth climbs with each step too (31 -> 63 -> 127 levels) and
        // dithering is off at native resolution, so the last frame is clean.
        this.post.uniforms.levels.value = (COLOR_LEVELS + 1) * 2 ** step - 1;
        this.post.uniforms.dither.value = RES_STEPS[step] ? 1 : 0;
      }
      this.renderer.setRenderTarget(this.rt);
      this.renderer.render(this.room.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.postCamera);
    },
    finish(instant) {
      if (this.finishing) return;
      this.finishing = true;
      // Returning visitors go straight to the boot screen next time.
      try { localStorage.setItem("introSeen", "1"); } catch (_) {}
      this.$emit("screen");
      this.leaving = true;
      setTimeout(() => {
        this.finished = true;
        this.$emit("done");
      }, instant ? 0 : FADE_MS);
    },
    skip() {
      this.finish(false);
    },
    onVisibility() {
      // Coming back to the tab: continue from where we were.
      if (document.visibilityState === "visible") this.last = performance.now();
    },
    onKey(e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.skip();
      }
    },
  },
};
</script>

<style scoped>
.intro3d {
  position: fixed;
  inset: 0;
  z-index: 100000; /* above BootScreen (99999) so we can fade onto it */
  background: #1a1a24;
  transition: opacity 0.35s ease;
}
.intro3d.leaving {
  opacity: 0;
  pointer-events: none;
}
.intro3d-canvas {
  display: block;
  opacity: 0;
  transition: opacity 0.5s ease;
  image-rendering: pixelated;
  width: 100%;
  height: 100%;
}
.intro3d-canvas.ready {
  opacity: 1;
}
.intro3d-skip {
  animation: intro3d-skip-in 0.4s ease 0.6s both;
  position: absolute;
  right: calc(20px + env(safe-area-inset-right));
  bottom: calc(20px + env(safe-area-inset-bottom));
  padding: 8px 14px;
  border: 1px solid rgba(198, 55, 230, 0.6);
  border-radius: 6px;
  background: rgba(26, 26, 36, 0.7);
  color: #d4a8e8;
  font-family: "PortfolioFont", monospace;
  font-size: 13px;
  cursor: pointer;
}
.intro3d-skip kbd {
  margin-left: 6px;
  padding: 1px 5px;
  border: 1px solid rgba(212, 168, 232, 0.4);
  border-radius: 3px;
  font: inherit;
  font-size: 11px;
  opacity: 0.8;
}
@keyframes intro3d-skip-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .intro3d-skip { animation: none; }
}
/* Touch screens: no keyboard hint, and a bigger tap target. */
@media (hover: none) {
  .intro3d-skip kbd { display: none; }
  .intro3d-skip { padding: 12px 18px; font-size: 14px; }
}
.intro3d-skip:hover,
.intro3d-skip:focus-visible {
  background: #9b20b7;
  color: #fff;
  outline: none;
}
</style>

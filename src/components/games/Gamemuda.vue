<template>
  <div
    class="gm-window"
    :class="{ dragging }"
    ref="root"
    tabindex="-1"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="gm-header">
      <div class="gm-actions">
        <button class="gm-btn primary" @click="$refs.file.click()">
          <font-awesome-icon icon="upload" /> {{ $t('gamemudaLoad') }}
        </button>
        <input ref="file" type="file" accept=".gb,.gbc,.zip" hidden @change="onFile" />
      </div>
      <span class="gm-rom" v-if="romName" :title="romName">{{ romName }}</span>
    </div>

    <div class="gm-stage">
      <canvas ref="canvas" class="gm-canvas"></canvas>
      <div class="gm-drop">{{ $t('gamemudaDrop') }}</div>
      <div v-if="error" class="gm-error">{{ error }}</div>
      <div class="gm-osd" :class="{ show: osdVisible }" aria-live="polite">
        <font-awesome-icon :icon="volume === 0 ? 'volume-xmark' : volume < 0.5 ? 'volume-low' : 'volume-high'" />
        <span class="gm-osd-bar"><span :style="{ width: Math.round(volume * 100) + '%' }"></span></span>
        <span class="gm-osd-num">{{ Math.round(volume * 100) }}</span>
      </div>
    </div>

    <div class="gm-help">{{ $t('gamemudaHelp') }}</div>
  </div>
</template>

<script>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildPlaceholder } from "./gamemuda/placeholder.js";
import { Emulator } from "./gamemuda/emulator.js";
import { Controls3D } from "./gamemuda/input.js";
import { playBoot } from "./gamemuda/boot.js";

// Drop your own Blender export here (public/models/gamemuda.glb). Until it
// exists, the code-built placeholder with the same object names is used.
const MODEL_URL = "/models/gamemuda.glb";
const VOLUME_KEY = "gamemuda-volume-v2"; // v2: new default of 40 for everyone
const DEFAULT_VOLUME = 0.4;
const SWITCH_TRAVEL = 0.05; // power slider moves this far along X when on

function loadVolume() {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
  } catch (_) {
    return DEFAULT_VOLUME;
  }
}

export default {
  name: "Gamemuda",
  data() {
    return {
      romName: "",
      powered: false,
      error: "",
      dragging: false,
      volume: loadVolume(),
      osdVisible: false,
    };
  },
  mounted() {
    // Three.js objects are kept off the reactive data on purpose: Vue proxies
    // would slow down the render loop and break some three.js internals.
    this.dragDepth = 0;
    this.destroyed = false;
    this.rom = null;         // the loaded cartridge (File), re-read on every boot
    this.powerGen = 0;       // bumps on every power change; stale async work bails out
    this.bootAbort = null;
    this.setup();

    // Same trick as Tetris: AppWindow focuses its own root after mount, which
    // would make arrow keys nudge the window. Take focus back.
    this.$nextTick(() => this.$refs.root?.focus({ preventScroll: true }));
  },
  beforeUnmount() {
    this.destroyed = true;
    this.powerGen++;
    this.bootAbort?.abort();
    this.chimeCtx?.close?.().catch(() => {});
    clearTimeout(this.osdTimer);
    this.renderer?.setAnimationLoop(null);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.orbit?.dispose();
    this.emulator?.destroy();
    this.scene?.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        m?.map?.dispose();
        m?.dispose();
      });
    });
    this.screenTex?.dispose();
    this.envMap?.dispose();
    this.renderer?.dispose();
  },
  methods: {
    async setup() {
      const canvas = this.$refs.canvas;

      // ---------- Renderer & scene ----------
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer = renderer;

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      scene.environment = this.envMap;
      // Softer reflections + directional light so the low-poly facets read
      scene.environmentIntensity = 0.45;
      const key = new THREE.DirectionalLight(0xfff4e6, 1.6);
      key.position.set(1.5, 2, 3);
      const rim = new THREE.DirectionalLight(0x8fb8ff, 0.7);
      rim.position.set(-2, 1, -2);
      scene.add(key, rim, new THREE.HemisphereLight(0xdfe9ff, 0x2a2233, 0.5));
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
      camera.position.set(0.9, 0.6, 2.6); // a bit from above, so the power switch shows
      this.camera = camera;

      const orbit = new OrbitControls(camera, canvas);
      orbit.enableDamping = true;
      orbit.enablePan = false;
      orbit.minDistance = 1.3;
      orbit.maxDistance = 5;
      orbit.minPolarAngle = Math.PI * 0.15;
      orbit.maxPolarAngle = Math.PI * 0.85;
      orbit.autoRotate = true;
      orbit.autoRotateSpeed = 0.6;
      this.orbit = orbit;

      // ---------- Emulator -> screen texture ----------
      this.emulator = new Emulator(
        { insert: this.$t("gamemudaInsert"), off: this.$t("gamemudaOff") },
        this.volume,
      );
      const screenTex = new THREE.CanvasTexture(this.emulator.canvas);
      screenTex.magFilter = THREE.NearestFilter; // crisp pixels
      screenTex.minFilter = THREE.NearestFilter;
      screenTex.generateMipmaps = false;
      screenTex.colorSpace = THREE.SRGBColorSpace;
      this.screenTex = screenTex;

      // ---------- Model ----------
      // Labels on the model use the site font; make sure it's loaded first
      try {
        await document.fonts.load('32px "PortfolioFont"');
      } catch (_) {}
      const model = await this.loadModel();
      if (this.destroyed) return;
      scene.add(model);

      const screen = model.getObjectByName("screen");
      if (screen) {
        screen.material = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
      } else {
        console.warn('[gamemuda] No object named "screen" found in the model.');
      }

      // Power switch + LED (optional in a custom model)
      const sw = model.getObjectByName("power_switch");
      this.powerSwitch = sw ? { obj: sw, baseX: sw.position.x } : null;
      const led = model.getObjectByName("power_led");
      this.ledMat = led?.material?.clone?.() || null;
      if (this.ledMat) {
        led.material = this.ledMat;
        this.ledColor = this.ledMat.color.clone();
      }
      this.applyPowerLook();

      const box = new THREE.Box3().setFromObject(model);
      orbit.target.copy(box.getCenter(new THREE.Vector3()));
      orbit.update();

      // ---------- Input ----------
      let interacted = false;
      const stopAutoRotate = () => {
        if (interacted) return;
        interacted = true;
        orbit.autoRotate = false;
      };
      this.controls = new Controls3D({
        model,
        camera,
        canvas,
        orbit,
        keyTarget: this.$refs.root,
        volume: this.volume,
        progress: () => this.emulator.cycles(),
        isRunning: () => this.emulator.playing,
        onChange: (state) => this.emulator.setJoypad(state),
        onVolume: (v) => this.onVolume(v),
        onPower: () => this.togglePower(),
        onFirstInteraction: stopAutoRotate,
      });
      orbit.addEventListener("start", stopAutoRotate);

      // ---------- Resize + render loop ----------
      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      this.resizeObserver = new ResizeObserver(resize);
      this.resizeObserver.observe(canvas);
      resize();

      // The window is hidden with v-show when minimized: pause the game and
      // skip rendering, then resume when it's visible again.
      let pausedByHide = false;
      renderer.setAnimationLoop(() => {
        const hidden = canvas.clientWidth === 0 || document.hidden;
        if (hidden) {
          if (this.emulator.playing && !pausedByHide) {
            pausedByHide = true;
            this.emulator.stop(this.$t("gamemudaPaused"));
          }
          return;
        }
        if (pausedByHide) {
          pausedByHide = false;
          if (this.powered) this.emulator.start();
        }
        // Slide the power switch towards its position
        if (this.powerSwitch) {
          const { obj, baseX } = this.powerSwitch;
          const target = baseX + (this.powered ? SWITCH_TRAVEL : 0);
          obj.position.x += (target - obj.position.x) * 0.35;
        }
        orbit.update();
        screenTex.needsUpdate = true;
        renderer.render(scene, camera);
      });
    },

    async loadModel() {
      try {
        const head = await fetch(MODEL_URL, { method: "HEAD" });
        const type = head.headers.get("content-type") || "";
        // The SPA fallback answers unknown URLs with index.html.
        if (!head.ok || type.includes("text/html")) throw new Error("no model");
        const draco = new DRACOLoader(); // decoder files are bundled by three.js itself
        const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(MODEL_URL);
        draco.dispose();
        this.screenTex.flipY = false; // glTF UVs have their origin top-left
        return gltf.scene;
      } catch (_) {
        return buildPlaceholder();
      }
    },

    /** Insert a cartridge. Like the real thing: power cycles if it's on. */
    async loadRom(file) {
      if (!file || !this.emulator) return;
      this.error = "";
      this.rom = file;
      this.romName = file.name || "";
      this.$refs.root?.focus({ preventScroll: true });
      if (this.powered) await this.powerOff();
      await this.powerOn();
    },

    togglePower() {
      if (this.powered) this.powerOff();
      else this.powerOn();
      this.$refs.root?.focus({ preventScroll: true });
    },

    /** Switch on: start-up animation, then a cold boot of the cartridge. */
    async powerOn() {
      if (!this.emulator || this.powered) return;
      const gen = ++this.powerGen;
      this.powered = true;
      this.applyPowerLook();
      this.bootAbort = new AbortController();

      const finished = await playBoot(this.emulator.canvas, {
        volume: this.volume,
        signal: this.bootAbort.signal,
        audioContext: this.getChimeContext(),
      });
      if (!finished || gen !== this.powerGen) return;

      if (!this.rom) {
        this.emulator.drawIdle(this.$t("gamemudaInsert"));
        return;
      }
      try {
        await this.emulator.boot(this.rom);
        // Switched off (or another cartridge inserted) while booting
        if (gen !== this.powerGen || !this.powered) await this.emulator.powerOff();
      } catch (err) {
        console.error(err);
        if (gen !== this.powerGen) return;
        this.error = this.$t("gamemudaError");
        this.emulator.drawIdle(this.$t("gamemudaError"));
      }
    },

    /** Switch off for real: save, halt the emulator, screen and LED dark. */
    async powerOff() {
      if (!this.emulator || !this.powered) return;
      this.powerGen++;
      this.powered = false;
      this.bootAbort?.abort();
      this.applyPowerLook();
      this.controls?.releaseAll();
      await this.emulator.powerOff();
    },

    applyPowerLook() {
      if (!this.ledMat) return;
      if (this.powered) {
        this.ledMat.color.copy(this.ledColor);
        this.ledMat.emissive.copy(this.ledColor);
        this.ledMat.emissiveIntensity = 0.9;
      } else {
        this.ledMat.color.setHex(0x4a2622);
        this.ledMat.emissiveIntensity = 0;
      }
    },

    // Separate small AudioContext for the start-up chime; created on the
    // first power-on, which is always a user gesture.
    getChimeContext() {
      if (!this.chimeCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.chimeCtx = Ctx ? new Ctx() : null;
      }
      return this.chimeCtx;
    },

    onVolume(v) {
      this.volume = v;
      this.emulator?.setVolume(v);
      try {
        localStorage.setItem(VOLUME_KEY, String(v));
      } catch (_) {}
      this.osdVisible = true;
      clearTimeout(this.osdTimer);
      this.osdTimer = setTimeout(() => (this.osdVisible = false), 1200);
    },

    onFile(e) {
      this.loadRom(e.target.files[0]);
      e.target.value = ""; // allow re-selecting the same file
    },

    onDragEnter() {
      this.dragDepth++;
      this.dragging = true;
    },
    onDragLeave() {
      if (--this.dragDepth <= 0) {
        this.dragDepth = 0;
        this.dragging = false;
      }
    },
    onDrop(e) {
      this.dragDepth = 0;
      this.dragging = false;
      this.loadRom(e.dataTransfer?.files?.[0]);
    },
  },
};
</script>

<style scoped>
.gm-window {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: radial-gradient(ellipse at 50% 40%, #262633, #14141c 75%);
  color: #f0f0f0;
  font-family: 'PortfolioFont', sans-serif;
  overflow: hidden;
  outline: none;
  /* Rapid clicks on the model must not select text in the window */
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.gm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(180deg, #3a3a48, #2b2b35);
  border-bottom: 1px solid #000;
  flex-wrap: wrap;
}

.gm-actions {
  display: flex;
  gap: 6px;
}

.gm-btn {
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1a1a24;
  color: #f0f0f0;
  border: 1px solid #000;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 3px;
}
.gm-btn:hover:not(:disabled) { background: #232331; }
.gm-btn:disabled { opacity: 0.45; cursor: default; }
.gm-btn.primary { background: #e4572e; }
.gm-btn.primary:hover { background: #f06a42; }

.gm-rom {
  font-size: 12px;
  opacity: 0.7;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gm-stage {
  position: relative;
  flex: 1;
  min-height: 0;
}

.gm-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}

.gm-drop {
  position: absolute;
  inset: 8px;
  display: grid;
  place-items: center;
  border: 2px dashed #e4572e;
  background: rgba(228, 87, 46, 0.12);
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
.gm-window.dragging .gm-drop { opacity: 1; }

.gm-error {
  position: absolute;
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
  background: #d02040;
  padding: 4px 10px;
  border-radius: 3px;
  font-size: 13px;
}

.gm-osd {
  position: absolute;
  right: 12px;
  top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(20, 20, 28, 0.85);
  border: 1px solid #000;
  border-radius: 3px;
  font-size: 12px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.15s, transform 0.15s;
  pointer-events: none;
}
.gm-osd.show { opacity: 1; transform: none; }
.gm-osd-bar {
  width: 80px;
  height: 6px;
  background: #2a2a36;
  border-radius: 3px;
  overflow: hidden;
}
.gm-osd-bar > span {
  display: block;
  height: 100%;
  background: #e4572e;
}
.gm-osd-num { min-width: 22px; text-align: right; }

.gm-help {
  padding: 6px 12px 8px;
  font-size: 12px;
  text-align: center;
  opacity: 0.65;
}
</style>

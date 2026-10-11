import * as THREE from "three";

const MAP = {
  btn_a: "A",
  btn_b: "B",
  btn_start: "START",
  btn_select: "SELECT",
  dpad_up: "UP",
  dpad_down: "DOWN",
  dpad_left: "LEFT",
  dpad_right: "RIGHT",
};
const VOLUME = "volume_wheel";
const POWER = "power_switch";

const KEYS = {
  ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
  KeyW: "UP", KeyS: "DOWN", KeyA: "LEFT", KeyD: "RIGHT",
  KeyX: "A", KeyZ: "B", Enter: "START", ShiftLeft: "SELECT", ShiftRight: "SELECT", Backspace: "SELECT",
};
const VOLUME_KEYS = { Minus: -0.1, NumpadSubtract: -0.1, Equal: 0.1, NumpadAdd: 0.1 };

const PRESS_DEPTH = 0.012;  // how far a button sinks in (model units)
const DPAD_TILT = 0.12;     // d-pad tilt in radians
// The emulator runs in a worker and on a busy/slow device it lags behind or
// runs frames in bursts. A press that is released before the emulator ran a
// frame with it is never seen by the game (that was the "sometimes a button
// doesn't register" bug). So every change (press or release) stays in effect
// until the emulator CONFIRMED it applied the change and then actually ran
// MIN_CYCLES of Game Boy time, measured with the core's own cycle counter.
// Quick taps are queued instead of merged: 5 fast taps = 5 presses.
const ALL_ACTIONS = ["UP", "DOWN", "LEFT", "RIGHT", "A", "B", "START", "SELECT"];
const FRAME_CYCLES = 70224;          // one Game Boy frame
const MIN_CYCLES = FRAME_CYCLES * 3; // games read the joypad about once per frame
const MIN_HOLD_MS = 40;              // keep the 3D press visible a moment
const POLL_MS = 16;
const STALL_MS = 500;                // core didn't advance this long: stop waiting
const GIVE_UP_MS = 3000;             // never hold a pending change longer than this
const MAX_QUEUE = 12;                // max pending transitions per button (6 taps)
// Clicks that just miss a button still count if they land this close to it
// (in CSS pixels, measured from the button's projected edge).
const HIT_SLOP_PX = 14;
// The wheel only sticks out of the side over roughly +-60 degrees, so the
// marker rib (pointing +X at 50 %) sweeps +-55 degrees: volume 0 = marker at
// the bottom of the visible arc, 100 = at the top. It never disappears
// into the body, and its position always matches the volume.
const WHEEL_RANGE = THREE.MathUtils.degToRad(110);
const DRAG_PX_PER_FULL = 160;        // drag distance for 0 -> 100 %

/**
 * Wires the 3D buttons (via raycasting), the volume wheel and the keyboard to
 * the emulator. Multi-touch: every finger/mouse pointer holds its own button.
 * Keyboard input is scoped to `keyTarget` (the window root) so arrow keys in
 * other portfolio windows are left alone.
 */
export class Controls3D {
  constructor({ model, camera, canvas, orbit, keyTarget, volume = 0.4, progress, isRunning, onChange, onVolume, onPower, onFirstInteraction }) {
    this.onPower = onPower;
    this.progress = progress || (async () => null); // async () => core cycle counter
    this.isRunning = isRunning || (() => false);
    this.model = model;
    this.camera = camera;
    this.canvas = canvas;
    this.orbit = orbit;
    this.keyTarget = keyTarget;
    this.onChange = onChange;
    this.onVolume = onVolume;
    this.onFirstInteraction = onFirstInteraction;

    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.pointers = new Map();  // pointerId -> button name | VOLUME
    this.keys = new Set();      // joypad actions held via keyboard
    this.lastWant = new Set();  // raw input state at the previous update
    // Per action: what the game currently gets, since when, and queued changes
    this.btn = {};
    for (const a of ALL_ACTIONS) this.btn[a] = { down: false, cyc: null, time: 0, queue: [], acked: true, seq: 0 };
    this.seq = 0;
    this.latestCycles = null;
    this.lastProgressAt = performance.now();
    this.polling = false;
    this.disposed = false;
    this.timer = null;
    this.wheelDrag = null;      // { pointerId, startY, startVolume }

    this.buttons = [];
    this.visuals = {};
    model.traverse((o) => {
      if (!MAP[o.name]) return;
      this.buttons.push(o);
      // D-pad hitboxes: hittable but invisible
      if (o.name.startsWith("dpad_") && o.isMesh) {
        o.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        o.userData.hitbox = true;
      }
    });
    for (const name of ["btn_a", "btn_b", "btn_start", "btn_select"]) {
      const obj = model.getObjectByName(name);
      if (obj) this.visuals[name] = { obj, base: obj.position.clone() };
    }
    const dpad = model.getObjectByName("dpad");
    this.dpad = dpad ? { obj: dpad, base: dpad.rotation.clone() } : null;

    const wheel = model.getObjectByName(VOLUME);
    this.wheel = wheel ? { obj: wheel, base: wheel.rotation.clone() } : null;
    this.volume = THREE.MathUtils.clamp(volume, 0, 1);
    this.applyWheelRotation();

    // Capture phase: we run before OrbitControls and can swallow the event.
    const cap = { capture: true };
    canvas.addEventListener("pointerdown", this.onDown, cap);
    canvas.addEventListener("pointermove", this.onMove, cap);
    canvas.addEventListener("wheel", this.onWheel, { capture: true, passive: false });
    canvas.addEventListener("pointermove", this.onHover);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    keyTarget.addEventListener("keydown", this.onKeyDown);
    keyTarget.addEventListener("keyup", this.onKeyUp);
    keyTarget.addEventListener("focusout", this.onFocusOut);
    window.addEventListener("blur", this.releaseAll);
  }

  dispose() {
    const c = this.canvas;
    const cap = { capture: true };
    c.removeEventListener("pointerdown", this.onDown, cap);
    c.removeEventListener("pointermove", this.onMove, cap);
    c.removeEventListener("wheel", this.onWheel, cap);
    c.removeEventListener("pointermove", this.onHover);
    c.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    this.keyTarget.removeEventListener("keydown", this.onKeyDown);
    this.keyTarget.removeEventListener("keyup", this.onKeyUp);
    this.keyTarget.removeEventListener("focusout", this.onFocusOut);
    window.removeEventListener("blur", this.releaseAll);
    this.disposed = true;
    clearTimeout(this.timer);
  }

  // ---------------------------------------------------------------- picking

  setRay(e) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  /** Named control an object belongs to (walks up, so grouped meshes work). */
  controlOf(obj) {
    for (let o = obj; o && o !== this.model.parent; o = o.parent) {
      if (MAP[o.name] || o.name === VOLUME || o.name === POWER) return o.name;
    }
    return null;
  }

  /**
   * First thing under the pointer, respecting occlusion: a click on the back
   * of the device no longer "shines through" onto the buttons. Transparent
   * decals (labels) are skipped so they never block a button.
   */
  firstHit() {
    for (const h of this.raycaster.intersectObject(this.model, true)) {
      const control = this.controlOf(h.object);
      if (control) return control;
      // Hit the visible d-pad itself (e.g. at a steep angle): pick the arm
      if (this.dpad && this.isInside(h.object, this.dpad.obj)) return this.dpadDirection(h.point);
      if (!h.object.visible) continue;
      const m = h.object.material;
      if (m && m.transparent && m.opacity < 1) continue; // decal / text plane
      return null; // something opaque (body, bezel...) is in front
    }
    return null;
  }

  isInside(obj, ancestor) {
    for (let o = obj; o; o = o.parent) if (o === ancestor) return true;
    return false;
  }

  dpadDirection(worldPoint) {
    const p = this.dpad.obj.worldToLocal(worldPoint.clone());
    if (Math.abs(p.x) > Math.abs(p.y)) return p.x > 0 ? "dpad_right" : "dpad_left";
    return p.y > 0 ? "dpad_up" : "dpad_down";
  }

  /** Direct hit, else the nearest visible button within HIT_SLOP_PX. */
  pick(e) {
    this.setRay(e);
    const direct = this.firstHit();
    if (direct) return direct;

    const r = this.canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    let best = null;
    let bestDist = Infinity;
    const sphere = new THREE.Sphere();
    const center = new THREE.Vector3();
    const edge = new THREE.Vector3();
    for (const b of this.buttons) {
      if (!b.isMesh || !b.geometry) continue;
      if (!b.geometry.boundingSphere) b.geometry.computeBoundingSphere();
      sphere.copy(b.geometry.boundingSphere).applyMatrix4(b.matrixWorld);
      // Project center and a point on the sphere to get a screen-space radius
      center.copy(sphere.center).project(this.camera);
      const cx = (center.x + 1) * 0.5 * r.width;
      const cy = (1 - center.y) * 0.5 * r.height;
      edge.copy(this.camera.up).normalize().multiplyScalar(sphere.radius).add(sphere.center).project(this.camera);
      const radiusPx = Math.hypot((edge.x - center.x) * 0.5 * r.width, (edge.y - center.y) * 0.5 * r.height);
      const d = Math.hypot(px - cx, py - cy) - radiusPx * 0.8;
      if (d > HIT_SLOP_PX || d >= bestDist) continue;
      // Only if that button is actually visible from here (not behind the body)
      this.raycaster.setFromCamera(center, this.camera);
      if (this.firstHit() !== b.name) continue;
      best = b.name;
      bestDist = d;
    }
    return best;
  }

  // --------------------------------------------------------------- pointers

  onDown = (e) => {
    if (e.button !== undefined && e.button > 0) return; // right/middle: orbit
    this.onFirstInteraction?.();
    const name = this.pick(e);
    if (!name) return; // empty space: let OrbitControls rotate
    if (name === POWER) {
      e.stopImmediatePropagation();
      this.keyTarget.focus?.({ preventScroll: true });
      this.onPower?.();
      return;
    }
    // Stop OrbitControls from seeing this press. No preventDefault(): the
    // window should still come to the front and take focus as usual.
    e.stopImmediatePropagation();
    this.keyTarget.focus?.({ preventScroll: true });
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
    this.pointers.set(e.pointerId, name);
    if (name === VOLUME) {
      this.wheelDrag = { pointerId: e.pointerId, startY: e.clientY, startVolume: this.volume };
    }
    this.update();
  };

  onMove = (e) => {
    const current = this.pointers.get(e.pointerId);
    if (!current) return;
    e.stopImmediatePropagation();
    if (current === VOLUME) {
      const d = this.wheelDrag;
      if (d && d.pointerId === e.pointerId) {
        this.setVolume(d.startVolume + (d.startY - e.clientY) / DRAG_PX_PER_FULL);
      }
      return;
    }
    // Sliding a finger across the d-pad switches direction
    if (!current.startsWith("dpad_")) return;
    this.setRay(e);
    const name = this.firstHit();
    if (name && name !== current && name.startsWith("dpad_")) {
      this.pointers.set(e.pointerId, name);
      this.update();
    }
  };

  onUp = (e) => {
    const name = this.pointers.get(e.pointerId);
    if (!name) return;
    this.pointers.delete(e.pointerId);
    if (name === VOLUME) this.wheelDrag = null;
    this.update();
  };

  onHover = (e) => {
    if (this.pointers.size) return;
    this.setRay(e);
    const name = this.firstHit();
    this.canvas.style.cursor = name === VOLUME ? "ns-resize" : name ? "pointer" : "grab";
  };

  // Scrolling over the volume wheel turns it instead of zooming the camera
  onWheel = (e) => {
    this.setRay(e);
    if (this.firstHit() !== VOLUME) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.setVolume(this.volume + (e.deltaY < 0 ? 0.05 : -0.05));
  };

  onContextMenu = (e) => e.preventDefault();

  // --------------------------------------------------------------- keyboard

  onKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === "KeyP" && !e.repeat) {
      e.preventDefault();
      this.onPower?.();
      return;
    }
    if (VOLUME_KEYS[e.code] !== undefined) {
      e.preventDefault();
      this.setVolume(this.volume + VOLUME_KEYS[e.code]);
      return;
    }
    const action = KEYS[e.code];
    if (!action) return;
    // Also stops Enter/Space from re-activating a focused header button, and
    // keeps AppWindow's arrow-key window nudge out of it.
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat && this.keys.has(action)) return;
    this.onFirstInteraction?.();
    this.keys.add(action);
    this.update();
  };

  onKeyUp = (e) => {
    const action = KEYS[e.code];
    if (!action) return;
    this.keys.delete(action);
    // Shift held for Select: both Shift keys map to it, keep it while one is down
    this.update();
  };

  // Focus moved to another window: let go of held keys.
  onFocusOut = (e) => {
    if (!this.keyTarget.contains(e.relatedTarget)) {
      this.keys.clear();
      this.update();
    }
  };

  releaseAll = () => {
    this.pointers.clear();
    this.keys.clear();
    this.wheelDrag = null;
    this.update();
  };

  // ------------------------------------------------------------------ state

  setVolume(v) {
    const next = THREE.MathUtils.clamp(Math.round(v * 100) / 100, 0, 1);
    if (next === this.volume) return;
    this.volume = next;
    this.applyWheelRotation();
    this.onVolume?.(next);
  }

  applyWheelRotation() {
    if (!this.wheel) return;
    const { obj, base } = this.wheel;
    obj.rotation.copy(base);
    obj.rotation.z += (this.volume - 0.5) * WHEEL_RANGE;
  }

  /** Raw input right now: pointers + keys. */
  wanted() {
    const want = new Set();
    for (const name of this.pointers.values()) if (MAP[name]) want.add(MAP[name]);
    for (const action of this.keys) want.add(action);
    return want;
  }

  /** Called when pointers/keys change. Turns raw edges into queued transitions. */
  update() {
    const want = this.wanted();
    for (const a of ALL_ACTIONS) {
      const was = this.lastWant.has(a);
      const is = want.has(a);
      if (was === is) continue;
      const q = this.btn[a].queue;
      if (q.length < MAX_QUEUE) q.push(is);
      else q[q.length - 1] = is; // queue full: keep the latest wish
    }
    this.lastWant = want;
    this.orbit.enabled = this.pointers.size === 0;
    this.pump();
  }

  hasPending() {
    return ALL_ACTIONS.some((a) => this.btn[a].queue.length);
  }

  /** While changes are waiting, keep reading the core's cycle counter. */
  async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      while (!this.disposed && this.hasPending()) {
        const c = await this.progress();
        if (typeof c === "number" && c !== this.latestCycles) {
          this.latestCycles = c;
          this.lastProgressAt = performance.now();
        }
        this.pump();
        if (this.hasPending()) await new Promise((r) => setTimeout(r, POLL_MS));
      }
    } finally {
      this.polling = false;
    }
  }

  /** Apply queued transitions whose previous state lasted long enough. */
  pump() {
    clearTimeout(this.timer);
    const now = performance.now();
    const running = this.isRunning();
    let changed = false;

    for (const a of ALL_ACTIONS) {
      const b = this.btn[a];
      while (b.queue.length) {
        const next = b.queue[0];
        if (next === b.down) {
          b.queue.shift(); // no-op transition
          continue;
        }
        const age = now - b.time;
        const stalled = now - this.lastProgressAt > STALL_MS;
        let ready;
        if (!running || age >= GIVE_UP_MS) {
          ready = true; // paused / no ROM, or safety net: never stick forever
        } else if (!b.acked) {
          ready = false; // core hasn't confirmed the current state yet
        } else if (b.cyc === null) {
          ready = age >= 100; // no cycle counter available: plain time fallback
        } else {
          const ran = this.latestCycles === null ? 0 : this.latestCycles - b.cyc;
          ready = (ran >= MIN_CYCLES && age >= MIN_HOLD_MS) || stalled;
        }
        if (!ready) break;
        b.queue.shift();
        b.down = next;
        b.cyc = null;
        b.time = now;
        b.acked = false;
        b.seq = this.seq + 1;
        changed = true;
        break; // one transition per button per pump, so each state gets its frames
      }
    }

    if (changed) this.emit();
    if (this.hasPending()) {
      this.poll();
      this.timer = setTimeout(() => this.pump(), 50); // safety net
    }
  }

  emit() {
    const state = {};
    for (const a of ALL_ACTIONS) state[a] = this.btn[a].down;

    // Visual feedback follows what the game sees
    for (const [name, v] of Object.entries(this.visuals)) {
      v.obj.position.copy(v.base);
      if (state[MAP[name]]) v.obj.position.z -= PRESS_DEPTH;
    }
    if (this.dpad) {
      const { obj, base } = this.dpad;
      obj.rotation.copy(base);
      obj.rotation.x += (state.UP ? -DPAD_TILT : 0) + (state.DOWN ? DPAD_TILT : 0);
      obj.rotation.y += (state.LEFT ? -DPAD_TILT : 0) + (state.RIGHT ? DPAD_TILT : 0);
    }

    const seq = ++this.seq;
    Promise.resolve(this.onChange(state)).then((cycles) => {
      // The core applied this state: count emulated time from here
      const c = typeof cycles === "number" ? cycles : null;
      if (c !== null) {
        this.latestCycles = c;
        this.lastProgressAt = performance.now();
      }
      for (const a of ALL_ACTIONS) {
        const b = this.btn[a];
        if (b.seq === seq) {
          b.acked = true;
          b.cyc = c;
        }
      }
      this.pump();
    });
  }

  /** Re-send the current state (e.g. after the emulator resumes). */
  resend() {
    this.emit();
  }
}

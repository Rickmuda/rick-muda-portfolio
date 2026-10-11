import { WasmBoy } from "wasmboy";

// Some WasmBoy calls don't return a promise; this handles both cases and
// swallows errors that are harmless (e.g. pausing when nothing is loaded).
async function safe(fn) {
  try {
    await fn();
  } catch (_) {
    /* ignore */
  }
}

/**
 * Thin wrapper around WasmBoy (a singleton). WasmBoy draws every frame onto a
 * 160x144 canvas; Gamemuda.vue uses that canvas as the texture on the screen
 * of the 3D model.
 *
 * Battery saves (e.g. Pokemon progress) are stored by WasmBoy in IndexedDB,
 * keyed by the cartridge header, and restored automatically on loadROM().
 */
export class Emulator {
  constructor(labels = {}, volume = 0.4) {
    this.labels = labels;
    this.volume = volume;
    this.gain = null; // our own GainNode, created on WasmBoy's AudioContext
    this.canvas = document.createElement("canvas");
    this.canvas.width = 160;
    this.canvas.height = 144;
    this.ready = false;
    this.loaded = false;
    this.playing = false;
    this.drawOff(); // starts switched off
  }

  async init() {
    await WasmBoy.config(
      {
        headless: false,
        isAudioEnabled: true,
        isGbcEnabled: true,
        frameSkip: 0,
        maxNumberOfAutoSaveStates: 0,
        onPlay: () => (this.playing = true),
        onPause: () => (this.playing = false),
        // Every audio buffer WasmBoy plays passes through here; route it
        // through our gain node so the volume wheel can control it.
        updateAudioCallback: (ctx, source) => {
          if (!this.gain || this.gain.context !== ctx) {
            this.gain = ctx.createGain();
            this.gain.gain.value = this.volume * this.volume;
          }
          source.connect(this.gain);
          return this.gain;
        },
      },
      this.canvas,
    );
    // We feed input ourselves (3D buttons + keyboard scoped to the window).
    WasmBoy.disableDefaultJoypad();
    this.ready = true;
  }

  /**
   * Cold boot: (re)load the ROM so the game starts from scratch, exactly like
   * switching a real handheld on. Battery saves are restored by loadROM().
   * @param {File|Uint8Array|string} rom File (re-read on every boot, .zip
   *   works), bytes or URL
   */
  async boot(rom) {
    if (!this.ready) await this.init();
    await this.persist();
    await safe(() => WasmBoy.pause());
    // Bytes: pass a copy, the buffer may be transferred to the worker
    await WasmBoy.loadROM(rom instanceof Uint8Array ? new Uint8Array(rom) : rom);
    // loadROM() silently re-enables WasmBoy's built-in keyboard joypad, which
    // then sends "nothing pressed" to the game on every rendered frame and
    // overwrites our presses. That was the main cause of missed inputs.
    WasmBoy.disableDefaultJoypad();
    this.loaded = true;
    await this.start();
  }

  async start() {
    if (!this.loaded) return;
    await safe(() => WasmBoy.resumeAudioContext());
    WasmBoy.disableDefaultJoypad(); // see boot()
    await WasmBoy.play();
    this.playing = true;
    // Buttons held while (re)starting: send them again
    if (this.lastJoypad) this.setJoypad(this.lastJoypad);
  }

  async stop(sub = this.labels.off) {
    if (!this.loaded) return;
    await safe(() => WasmBoy.pause());
    this.playing = false;
    await this.persist();
    this.drawIdle(sub);
  }

  /** Power off: save, halt the emulator and show a dark, unlit screen. */
  async powerOff() {
    if (this.loaded) {
      await safe(() => WasmBoy.pause());
      await this.persist();
    }
    this.playing = false;
    this.drawOff();
  }

  /** Screen with the power off. */
  drawOff() {
    const g = this.canvas.getContext("2d");
    g.fillStyle = "#1b2219";
    g.fillRect(0, 0, 160, 144);
  }

  /** Write the cartridge RAM (in-game save) to IndexedDB. */
  async persist() {
    if (this.loaded) await safe(() => WasmBoy.saveLoadedCartridge());
  }

  /** Called when the window closes. */
  async destroy() {
    await safe(() => WasmBoy.pause());
    await this.persist();
    this.playing = false;
  }

  /** 0..1 */
  setVolume(v) {
    this.volume = v;
    this.applyVolume();
  }

  applyVolume() {
    if (!this.gain) return;
    // Perceptual curve: ears hear loudness roughly logarithmically
    const g = this.volume * this.volume;
    const t = this.gain.context.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setTargetAtTime(g, t, 0.015);
  }

  /**
   * state: { UP, DOWN, LEFT, RIGHT, A, B, START, SELECT } booleans.
   * Resolves with the core's cycle counter right after the state was applied
   * (or null when nothing is running).
   *
   * WasmBoy's public setJoypadState() hops through a separate controller
   * worker and never confirms anything. _runWasmExport() goes straight to the
   * worker that runs the game and answers after the call ran, so the input
   * code knows exactly from which point on the game "sees" a button.
   */
  async setJoypad(state) {
    this.lastJoypad = state;
    if (!this.loaded) return null;
    if (typeof WasmBoy._runWasmExport !== "function") {
      WasmBoy.setJoypadState(state);
      return null;
    }
    const args = [state.UP, state.RIGHT, state.DOWN, state.LEFT, state.A, state.B, state.SELECT, state.START].map((v) => (v ? 1 : 0));
    try {
      await WasmBoy._runWasmExport("setJoypadState", args);
      // Messages to the worker are handled in order, so this reading is taken
      // right after the new state was applied.
      return await this.cycles();
    } catch (_) {
      WasmBoy.setJoypadState(state);
      return null;
    }
  }

  /** Total CPU cycles the core has executed (one DMG frame = 70224). */
  async cycles() {
    if (!this.loaded || typeof WasmBoy._runWasmExport !== "function") return null;
    try {
      const [sets, perSet, rest] = await Promise.all([
        WasmBoy._runWasmExport("getCycleSets"),
        WasmBoy._runWasmExport("getCyclesPerCycleSet"),
        WasmBoy._runWasmExport("getCycles"),
      ]);
      return sets * perSet + rest;
    } catch (_) {
      return null;
    }
  }

  /** Screen shown while no game is running. */
  drawIdle(sub = this.labels.insert || "INSERT CARTRIDGE") {
    const g = this.canvas.getContext("2d");
    g.fillStyle = "#9bbc0f";
    g.fillRect(0, 0, 160, 144);
    g.fillStyle = "#306230";
    g.textAlign = "center";
    g.font = '16px "PortfolioFont", monospace';
    g.fillText("GAMEMUDA", 80, 66);
    g.font = '8px "PortfolioFont", monospace';
    g.fillText(String(sub).toUpperCase(), 80, 86);
  }
}

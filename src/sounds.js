// Tiny Web Audio sound effects for the OS-feel layer. No asset files;
// every sound is synthesized from oscillators so the bundle stays light.
//
// Usage:
//   import { sounds } from "./sounds";
//   sounds.play("open");
//   sounds.setEnabled(false);

const STORAGE_KEY = "soundEnabled";

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem(STORAGE_KEY) !== "0";
    this.ctx = null;
  }
  ensureCtx() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    return this.ctx;
  }
  setEnabled(value) {
    this.enabled = !!value;
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  }
  isEnabled() {
    return this.enabled;
  }
  play(name) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    // Resume context on first user gesture (browsers suspend autoplay audio).
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    switch (name) {
      case "open":   return this.tone(ctx, 880, 0.06, "square",   0.05);
      case "close":  return this.glide(ctx, 660, 220, 0.18, "sine", 0.04);
      case "minimize": return this.glide(ctx, 660, 330, 0.12, "triangle", 0.04);
      case "error":  return this.tone(ctx, 220, 0.22, "sawtooth", 0.06);
      case "boot":   return this.boot(ctx);
      default:       return this.tone(ctx, 600, 0.04, "sine", 0.04);
    }
  }
  tone(ctx, freq, duration, type = "sine", gain = 0.05) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration + 0.02);
  }
  glide(ctx, from, to, duration, type = "sine", gain = 0.05) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = from;
    osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
    g.gain.value = gain;
    osc.connect(g).connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration + 0.02);
  }
  boot(ctx) {
    // Two-note startup chime.
    this.tone(ctx, 523.25, 0.18, "triangle", 0.05); // C5
    setTimeout(() => this.tone(ctx, 783.99, 0.28, "triangle", 0.06), 160); // G5
  }
}

export const sounds = new SoundManager();

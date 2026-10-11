/**
 * Gamemuda start-up animation, drawn on the 160x144 screen canvas:
 *   1. the screen "backlight" fades up from off to the light green LCD colour
 *   2. the GAMEMUDA logo slides down from the top, in the site font
 *   3. when it lands: the classic two-tone "ba-ding" chime, and a little shine
 *   4. a short hold, then the game takes over
 *
 * playBoot() resolves when finished, or early (with false) when the signal is
 * aborted, e.g. when the power is switched off during the animation.
 */

const LCD = "#9bbc0f";      // lightest Game Boy green
const INK = "#306230";      // dark green
const INK_SOFT = "#5f8a2a";
const OFF = "#1b2219";      // same as Emulator.drawOff()
const FONT = '"PortfolioFont", monospace';

const FADE_MS = 350;
const SLIDE_MS = 1500;
const HOLD_MS = 1100;
const TOTAL_MS = FADE_MS + SLIDE_MS + HOLD_MS;

export function playBoot(canvas, { volume = 0.4, signal, audioContext } = {}) {
  const g = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  let chimed = false;

  return new Promise((resolve) => {
    const t0 = performance.now();

    const frame = (now) => {
      if (signal?.aborted) return resolve(false);
      const t = now - t0;

      // 1. backlight
      const fade = Math.min(1, t / FADE_MS);
      g.fillStyle = mix(OFF, LCD, fade);
      g.fillRect(0, 0, W, H);

      // 2. logo slides from above the screen to the middle, in 2-px steps
      //    (stepped movement looks like a real low-res LCD)
      const slide = clamp01((t - FADE_MS) / SLIDE_MS);
      const targetY = 66;
      const y = Math.round((-12 + (targetY + 12) * slide) / 2) * 2;
      if (t > FADE_MS * 0.5) {
        g.fillStyle = INK;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `18px ${FONT}`;
        g.fillText("GAMEMUDA", W / 2, y);
      }

      // 3. landed: chime + shine sweep + small credit line
      if (slide >= 1) {
        if (!chimed) {
          chimed = true;
          chime(audioContext, volume);
        }
        const since = t - FADE_MS - SLIDE_MS;
        const shine = since / 450;
        if (shine < 1) {
          const x = -20 + (W + 40) * shine;
          // Redraw the logo in a light colour, clipped to a slanted band
          g.save();
          g.beginPath();
          g.moveTo(x, targetY - 12);
          g.lineTo(x + 8, targetY - 12);
          g.lineTo(x + 2, targetY + 12);
          g.lineTo(x - 6, targetY + 12);
          g.closePath();
          g.clip();
          g.fillStyle = "#8bac0f";
          g.font = `18px ${FONT}`;
          g.fillText("GAMEMUDA", W / 2, targetY);
          g.restore();
        }
        g.fillStyle = mix(LCD, INK_SOFT, clamp01(since / 300));
        g.font = `8px ${FONT}`;
        g.fillText("rickmuda.nl", W / 2, targetY + 22);
      }

      if (t >= TOTAL_MS) return resolve(true);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

/** Two short square-wave tones, like the original start-up sound. */
function chime(ctx, volume) {
  if (!ctx || volume <= 0) return;
  try {
    if (ctx.state === "suspended") ctx.resume();
    const out = ctx.createGain();
    out.gain.value = volume * volume * 0.25; // square waves are loud
    out.connect(ctx.destination);
    const start = ctx.currentTime + 0.01;
    tone(ctx, out, 1046.5, start, 0.07);        // C6
    tone(ctx, out, 2093.0, start + 0.08, 0.55); // C7, rings out
  } catch (_) {
    /* audio is optional */
  }
}

function tone(ctx, out, freq, at, dur) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(1, at + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

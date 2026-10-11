// What the two side monitors show after MudaOS wakes up: a video site on the
// left and a chat app on the right. Both are generic, hand-drawn mock-ups
// (no real logos or names) in the dark purple style of the setup.
//
// Want your real screens? Put screenshots in public/intro/screens/ as
// left.webp and right.webp (.jpg/.png also work); they replace the mock-ups.

const C = {
  bg: "#0f0f14",
  panel: "#17171f",
  line: "#2a2a38",
  text: "#c9c6d6",
  dim: "#6c6a7c",
  accent: "#9b20b7",
  accent2: "#c637e6",
};

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

// A grey "text" line: rounded bar of a given width.
function bar(ctx, x, y, w, h, fill = C.dim) {
  roundRect(ctx, x, y, w, h, h / 2, fill);
}

// Left monitor: video site with a big player and a column of recommendations.
export function drawVideoSite(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Top bar: menu, search field, avatar.
  const tb = H * 0.1;
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, W, tb);
  for (let i = 0; i < 3; i++) bar(ctx, W * 0.02, tb * (0.32 + i * 0.16), W * 0.025, tb * 0.07, C.text);
  roundRect(ctx, W * 0.3, tb * 0.22, W * 0.4, tb * 0.56, tb * 0.28, "#1f1f2b");
  bar(ctx, W * 0.32, tb * 0.45, W * 0.12, tb * 0.1);
  circle(ctx, W * 0.96, tb / 2, tb * 0.28, C.accent);

  // Player with a little pixel-art sunset "video".
  const px = W * 0.025, py = tb + H * 0.04, pw = W * 0.64, ph = pw * 9 / 16;
  const sky = ctx.createLinearGradient(0, py, 0, py + ph);
  sky.addColorStop(0, "#2b1048");
  sky.addColorStop(0.55, "#b0407a");
  sky.addColorStop(1, "#f0a050");
  ctx.fillStyle = sky;
  ctx.fillRect(px, py, pw, ph);
  circle(ctx, px + pw * 0.62, py + ph * 0.55, ph * 0.13, "#ffd27a");
  const hills = (base, amp, color, seed) => {
    ctx.beginPath();
    ctx.moveTo(px, py + ph);
    for (let i = 0; i <= 12; i++) {
      const x = px + (pw * i) / 12;
      ctx.lineTo(x, py + ph * base - Math.abs(Math.sin(i * 1.7 + seed)) * ph * amp);
    }
    ctx.lineTo(px + pw, py + ph);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  hills(0.8, 0.22, "#4a1e5a", 1);
  hills(0.92, 0.15, "#24102e", 3);
  // Controls: progress bar with scrubber, play/volume hints.
  const by = py + ph - ph * 0.08;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(px, by - ph * 0.04, pw, ph * 0.12);
  bar(ctx, px + pw * 0.02, by, pw * 0.96, ph * 0.018, "rgba(255,255,255,0.3)");
  bar(ctx, px + pw * 0.02, by, pw * 0.38, ph * 0.018, "#e0313f");
  circle(ctx, px + pw * 0.4, by + ph * 0.009, ph * 0.025, "#e0313f");
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(px + pw * 0.025, by + ph * 0.035);
  ctx.lineTo(px + pw * 0.025, by + ph * 0.075);
  ctx.lineTo(px + pw * 0.045, by + ph * 0.055);
  ctx.fill();

  // Title, channel and description lines under the player.
  const ty = py + ph + H * 0.04;
  bar(ctx, px, ty, pw * 0.75, H * 0.03, C.text);
  circle(ctx, px + H * 0.035, ty + H * 0.1, H * 0.035, C.accent2);
  bar(ctx, px + H * 0.09, ty + H * 0.08, pw * 0.22, H * 0.022, C.text);
  bar(ctx, px + H * 0.09, ty + H * 0.115, pw * 0.14, H * 0.018);
  roundRect(ctx, px + pw * 0.8, ty + H * 0.075, pw * 0.2, H * 0.05, H * 0.025, "#e8e6f0");

  // Recommendations column.
  const cx = W * 0.69, cw = W * 0.29;
  const thumbs = ["#3a6ea8", "#a83a5a", "#3aa86e", "#a8843a", "#6a3aa8", "#3a8aa8"];
  for (let i = 0; i < 6; i++) {
    const y = tb + H * 0.04 + i * H * 0.145;
    const tw = cw * 0.45, th = tw * 9 / 16;
    roundRect(ctx, cx, y, tw, th, 4, thumbs[i]);
    bar(ctx, cx + tw + cw * 0.05, y + th * 0.08, cw * 0.46, th * 0.16, C.text);
    bar(ctx, cx + tw + cw * 0.05, y + th * 0.38, cw * 0.32, th * 0.13);
    bar(ctx, cx + tw + cw * 0.05, y + th * 0.62, cw * 0.24, th * 0.13);
  }
}

// Right monitor (portrait): chat app with server icons and a busy channel.
export function drawChatApp(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = "#1c1b24";
  ctx.fillRect(0, 0, W, H);

  // Server rail.
  const rw = W * 0.17;
  ctx.fillStyle = "#121118";
  ctx.fillRect(0, 0, rw, H);
  roundRect(ctx, rw * 0.18, rw * 0.18, rw * 0.64, rw * 0.64, rw * 0.2, C.accent);
  ctx.fillStyle = C.line;
  ctx.fillRect(rw * 0.3, rw * 0.95, rw * 0.4, 2);
  ["#3a6ea8", "#a83a5a", "#3aa86e", "#a8843a", "#5a5a6a", "#6a3aa8", "#3a8aa8"].forEach((c, i) =>
    circle(ctx, rw / 2, rw * (1.55 + i * 0.95), rw * 0.32, c));

  // Channel header.
  const x0 = rw;
  const hh = H * 0.06;
  ctx.fillStyle = "#211f2a";
  ctx.fillRect(x0, 0, W - x0, hh);
  ctx.fillStyle = C.dim;
  ctx.font = `bold ${Math.round(hh * 0.45)}px "PortfolioFont", monospace`;
  ctx.textBaseline = "middle";
  ctx.fillText("#", x0 + W * 0.04, hh / 2);
  ctx.fillStyle = C.text;
  ctx.fillText("general", x0 + W * 0.1, hh / 2);
  ctx.fillStyle = C.line;
  ctx.fillRect(x0, hh, W - x0, 2);

  // Messages: avatar, coloured name, text lines; one with an image.
  const names = ["#c637e6", "#4ab0e0", "#e0a03a", "#5ad08a", "#e05a7a", "#c637e6", "#4ab0e0"];
  const lines = [[0.55, 0.3], [0.62], [0.48, 0.58, 0.2], [0.4], [0.6, 0.35], [0.5], [0.3]];
  let y = hh + H * 0.03;
  const ax = x0 + W * 0.06, ar = W * 0.045, tx = x0 + W * 0.17, maxW = W - tx - W * 0.05;
  lines.forEach((ls, i) => {
    circle(ctx, ax, y + ar, ar, names[(i + 2) % names.length]);
    bar(ctx, tx, y + ar * 0.2, maxW * 0.28, H * 0.012, names[i]);
    bar(ctx, tx + maxW * 0.32, y + ar * 0.25, maxW * 0.14, H * 0.009, "#4a4858");
    let ly = y + ar * 0.2 + H * 0.025;
    ls.forEach((f) => { bar(ctx, tx, ly, maxW * f / 0.62, H * 0.01, C.text); ly += H * 0.02; });
    if (i === 3) {
      roundRect(ctx, tx, ly, maxW * 0.8, maxW * 0.45, 6, "#3a2a50");
      circle(ctx, tx + maxW * 0.4, ly + maxW * 0.22, maxW * 0.08, C.accent2);
      ly += maxW * 0.45 + H * 0.012;
    }
    y = ly + H * 0.025;
  });

  // Message box.
  const iy = H - H * 0.07;
  roundRect(ctx, x0 + W * 0.04, iy, W - x0 - W * 0.08, H * 0.05, H * 0.012, "#2a2834");
  circle(ctx, x0 + W * 0.09, iy + H * 0.025, H * 0.011, "#5a5868");
  bar(ctx, x0 + W * 0.15, iy + H * 0.02, W * 0.32, H * 0.01, "#4a4858");
}

// Fills `canvas` with the user's screenshot if one exists (cover-fit), else
// with the mock-up. Resolves once the canvas is final.
export function paintSideScreen(canvas, base, drawMockup) {
  drawMockup(canvas);
  return new Promise((resolve) => {
    const tryExt = (exts) => {
      if (!exts.length) return resolve(false);
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        const W = canvas.width, H = canvas.height;
        const k = Math.max(W / img.width, H / img.height);
        const w = img.width * k, h = img.height * k;
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        resolve(true);
      };
      img.onerror = () => tryExt(exts.slice(1));
      img.src = `${base}.${exts[0]}`;
    };
    tryExt(["webp", "jpg", "png"]);
  });
}

// Builds the 3D room for the intro. Right now this is a hand-made low poly
// "greybox" of the desk setup so the camera path and screen hand-off can be
// tuned. When the real Blender model is ready:
//   1. Export it as public/models/room.glb (Draco or Meshopt compressed).
//   2. Name the plane that is the middle monitor's display "Screen_Main"
//      (UVs filling 0..1, facing +Z of the object's local space).
//   3. Set ROOM_MODEL_URL below to "/models/room.glb".
// loadRoom() then uses the model and puts the boot texture on Screen_Main.
import * as THREE from "three";

export const ROOM_MODEL_URL = null; // e.g. "/models/room.glb"

// Palette taken from the room wallpaper (room.webp / roomdark.webp).
const DAY = {
  wall: 0xc9bfa4, floor: 0x9a7052, desk: 0x7a5a42, dark: 0x2e2a36,
  bed: 0x8a3442, sheet: 0x7fa39c, rug: 0xc4beb0, shelf: 0xe2ddd2,
  sky: 0xa8d0e6, ambient: 0.9, sun: 1.4, lamp: 0.5, bg: 0x1a1a24,
  fog: 0x3a2a48,
};
const NIGHT = {
  ...DAY, wall: 0x857c94, floor: 0x6a4c3c, sky: 0x1d2440,
  ambient: 0.75, sun: 0.35, lamp: 1.6, fog: 0x241a33,
};

export function isNight() {
  const h = new Date().getHours();
  return h >= 18 || h < 6;
}

// --- N64 / PS2 style materials -------------------------------------------
// Tiny 32x32 textures with bilinear filtering and no mipmaps (the N64 look),
// multiplied by per-vertex colors that darken towards the bottom of each
// object (the fake Gouraud "ambient occlusion" games of that era baked in).

function canvasTexture(draw, size = 32) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

// Small random-ish noise so the textures aren't perfectly flat.
function speckle(ctx, size, amount, seed = 1) {
  let x = seed;
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * size * 0.35; i++) {
    const v = Math.floor(rnd() * amount);
    ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${v / 255})`;
    ctx.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1, 1);
  }
}

function makeTextures() {
  return {
    plain: canvasTexture((ctx, s) => {
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, 26, 7);
    }),
    wood: canvasTexture((ctx, s) => {
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 8) {
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(0, y, s, 1);
        ctx.fillStyle = `rgba(0,0,0,${0.04 + (y % 16) * 0.006})`; ctx.fillRect(0, y + 1, s, 7);
        ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect((y * 7) % s, y, 1, 8);
      }
      speckle(ctx, s, 30, 3);
    }),
    stripes: canvasTexture((ctx, s) => {
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      for (let x = 0; x < s; x += 8) ctx.fillRect(x, 0, 3, s);
      speckle(ctx, s, 18, 11);
    }),
    fabric: canvasTexture((ctx, s) => {
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let i = 0; i < s; i += 4) { ctx.fillRect(i, 0, 1, s); ctx.fillRect(0, i, s, 1); }
      speckle(ctx, s, 22, 5);
    }),
  };
}

function shadeVertices(geo, h) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = 0.62 + 0.38 * ((pos.getY(i) + h / 2) / h); // 0.62 bottom -> 1.0 top
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = k;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

// Adds a textured, vertex-shaded box. `tex` is one of makeTextures(); `tile`
// is how many world units one texture repeat covers.
function box(parent, look, color, [w, h, d], [x, y, z], rotY = 0) {
  const { tex, tile = 0.5 } = look;
  const geo = new THREE.BoxGeometry(w, h, d);
  shadeVertices(geo, h);
  const map = tex.clone();
  map.repeat.set(Math.max(1, Math.max(w, d) / tile), Math.max(1, h / tile));
  map.needsUpdate = true;
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color, map, vertexColors: true }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  parent.add(mesh);
  return mesh;
}

// Small helper for non-box shapes (heads, mouse) with the same retro material.
function shape(parent, look, color, geo, [x, y, z], rot = [0, 0, 0]) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  shadeVertices(geo, bb.max.y - bb.min.y || 1);
  const map = look.tex.clone();
  map.needsUpdate = true;
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, map, vertexColors: true }));
  mesh.position.set(x, y, z);
  mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

// Monitor power LED colours: on, and the pulsing amber of standby.
const LED_ON = 0xc637e6;
const LED_SLEEP = 0xffa020;

// A monitor hanging on the arm: bezel, back plate and a screen plane just in
// front of the bezel. (x, y, z) is the center of the display.
function monitor(parent, L, pal, { x, y, z, rotY, w, h, glow }) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  parent.add(group);
  box(group, L.plastic, pal.dark, [w + 0.03, h + 0.03, 0.025], [0, 0, 0]);
  box(group, L.plastic, pal.dark, [0.12, 0.12, 0.03], [0, 0, -0.025]); // VESA plate
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: glow ?? 0x0c0c14, fog: false }),
  );
  // 1 mm in front of the bezel: closer than that z-fights on dark screens.
  screen.position.set(0, 0, 0.0135);
  group.add(screen);
  // Small power LED in the bottom-right corner of the bezel.
  const led = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.006, 0.002),
    new THREE.MeshBasicMaterial({ color: LED_ON, fog: false }),
  );
  led.position.set(w / 2 - 0.012, -h / 2 - 0.008, 0.0145);
  group.add(led);
  return { group, screen, led, top: h / 2 + 0.015 };
}

// Generic blocky toy figure (~4.5 cm), standing on top of a monitor.
function minifig(parent, L, [x, y, z], [legs, torso, head]) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  box(g, L.plastic, legs, [0.016, 0.014, 0.008], [0, 0.007, 0]);
  box(g, L.plastic, torso, [0.016, 0.014, 0.008], [0, 0.021, 0]);
  shape(g, L.plastic, head, new THREE.CylinderGeometry(0.0055, 0.0055, 0.01, 8), [0, 0.033, 0]);
  return g;
}

// Generic collectible figure on a round base (~25 cm).
function figure(parent, L, pal, [x, y, z], rotY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  shape(g, L.plastic, 0x1d1b22, new THREE.CylinderGeometry(0.05, 0.055, 0.015, 10), [0, 0.0075, 0]);
  box(g, L.plastic, 0x4a4450, [0.022, 0.09, 0.025], [-0.016, 0.06, 0]);
  box(g, L.plastic, 0x4a4450, [0.022, 0.09, 0.025], [0.016, 0.06, 0]);
  box(g, L.fabric, 0x6d6070, [0.06, 0.075, 0.035], [0, 0.142, 0]);
  box(g, L.fabric, 0x3a3240, [0.07, 0.11, 0.012], [0, 0.13, -0.022]); // cloak
  box(g, L.plastic, 0x6d6070, [0.016, 0.07, 0.018], [-0.04, 0.14, 0], 0);
  box(g, L.plastic, 0x6d6070, [0.016, 0.07, 0.018], [0.04, 0.14, 0], 0);
  box(g, L.plastic, 0x8a8290, [0.006, 0.12, 0.006], [0.05, 0.13, 0.02]); // weapon
  shape(g, L.plastic, 0x8a7a70, new THREE.IcosahedronGeometry(0.018, 0), [0, 0.2, 0]);
}

// Boxed N64 game standing upright, with its cover on the front. Covers load
// from public/intro/games/<id>.webp (same tiny-texture treatment as posters).
//   PAL box: landscape, ~19 x 13.5 x 3.5 cm
//   Japanese box: portrait and narrower, ~13 x 17.8 x 3 cm
export const GAME_BOXES = {
  pal: [0.19, 0.135, 0.035],
  jp: [0.13, 0.178, 0.03],
};

function gameBox(parent, L, { id, size, color }, [x, y, z], rotY) {
  const [w, h, d] = GAME_BOXES[size];
  const b = box(parent, L.plastic, color, [w, h, d], [x, y + h / 2, z], rotY);
  const tw = size === "pal" ? 64 : 44, th = size === "pal" ? 45 : 60;
  const tex = smallTexture(tw, th);
  const ctx = tex.image.getContext("2d");
  ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, tw, th);
  loadImageInto(tex, `/intro/games/${id}`);
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  cover.position.set(0, 0, d / 2 + 0.0005);
  cover.name = `Game_${id}`;
  b.add(cover);
}

// ---- Posters ------------------------------------------------------------
// Put your own images in public/intro/posters/<id>.webp (or .jpg/.png). They
// get shrunk to N64 texture size, so a phone photo of the real poster works.
// Without an image the frame shows an abstract placeholder.
export const POSTERS = [
  { id: "bloodborne", palette: ["#1b1a22", "#3b2f3a", "#7a6a58", "#c9b28a"] },
  { id: "isaac",      palette: ["#e8d6b8", "#c25a4a", "#5a3a34", "#2a1e1e"] },
  { id: "sonic",      palette: ["#1d4fb8", "#f0c419", "#e23b3b", "#ffffff"] },
  { id: "moonknight", palette: ["#0e0f18", "#e9e7e0", "#6b6e7a", "#2a2d3a"] },
];
const POSTER_W = 48, POSTER_H = 68; // texture size: tiny on purpose

function smallTexture(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

// Abstract low poly placeholder: a fan of triangles in the poster's palette.
function drawPlaceholder(tex, palette, seed) {
  const ctx = tex.image.getContext("2d");
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  const cx = POSTER_W * (0.3 + rnd() * 0.4), cy = POSTER_H * (0.3 + rnd() * 0.3);
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.5;
    pts.push([cx + Math.cos(a) * 60, cy + Math.sin(a) * 60]);
  }
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    ctx.fillStyle = palette[1 + (i % 3)];
    ctx.globalAlpha = 0.35 + rnd() * 0.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.fill();
  });
  ctx.globalAlpha = 1;
  tex.needsUpdate = true;
}

// Images still loading; loadRoom() waits for these (briefly) so posters and
// covers don't pop in while the camera is already moving.
let pendingImages = [];

// Loads <base>.webp/.jpg/.png and cover-fits it into the tiny canvas texture.
function loadImageInto(tex, base) {
  const W = tex.image.width, H = tex.image.height;
  let done;
  pendingImages.push(new Promise((r) => { done = r; }));
  const tryExt = (exts) => {
    if (!exts.length) { done(); return; }
    const img = new Image();
    img.onload = () => {
      // Cover-fit into the tiny texture.
      const ctx = tex.image.getContext("2d");
      const k = Math.max(W / img.width, H / img.height);
      const w = img.width * k, h = img.height * k;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      tex.needsUpdate = true;
      done();
    };
    img.onerror = () => tryExt(exts.slice(1));
    img.src = `${base}.${exts[0]}`;
  };
  tryExt(["webp", "jpg", "png"]);
}

function poster(parent, L, pal, def, i, [x, y, z]) {
  const w = 0.38, h = 0.54;
  box(parent, L.plastic, 0x1a171e, [w + 0.03, h + 0.03, 0.02], [x, y, z]); // frame
  const tex = smallTexture(POSTER_W, POSTER_H);
  drawPlaceholder(tex, def.palette, i + 1);
  loadImageInto(tex, `/intro/posters/${def.id}`);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  art.position.set(x, y, z + 0.011);
  art.name = `Poster_${def.id}`;
  parent.add(art);
}

// ---- Bird cage with two pineapple green-cheeked conures -----------------
// Cage on a rolling stand against the right wall. Bars are one instanced
// mesh so the many thin rods stay cheap.

// Pineapple green-cheeked conure colors.
const CONURE = {
  body: 0x9cc65a,   // light, slightly yellow green
  wing: 0x7fae44,
  breast: 0xe0c85a, // yellow-washed chest
  belly: 0xc8463a,  // red belly patch
  tail: 0xa83a2e,   // maroon-red tail
  head: 0x9a8a72,   // grey-brown/tan cap
  cheek: 0xa8cf6a,
  beak: 0x4a4650,
  eyeRing: 0xf2f0ea,
};

function conure(parent, L, [x, y, z], rotY) {
  const bird = new THREE.Group();
  bird.position.set(x, y, z);
  bird.rotation.y = rotY;
  parent.add(bird);
  const P = L.plastic;
  // Body leans slightly forward like a perched parrot.
  const body = shape(bird, P, CONURE.body, new THREE.IcosahedronGeometry(0.03, 0), [0, 0.045, 0]);
  body.scale.set(0.85, 1.35, 0.9);
  shape(bird, P, CONURE.breast, new THREE.IcosahedronGeometry(0.022, 0), [0, 0.055, 0.016]).scale.set(0.9, 1, 0.6);
  shape(bird, P, CONURE.belly, new THREE.IcosahedronGeometry(0.018, 0), [0, 0.03, 0.016]).scale.set(0.9, 0.9, 0.6);
  // Wings along the sides.
  box(bird, P, CONURE.wing, [0.008, 0.05, 0.04], [-0.024, 0.045, -0.004]);
  box(bird, P, CONURE.wing, [0.008, 0.05, 0.04], [0.024, 0.045, -0.004]);
  // Long tail pointing down and back.
  const tail = box(bird, P, CONURE.tail, [0.018, 0.075, 0.008], [0, -0.005, -0.02]);
  tail.rotation.x = -0.35;
  // Head: pivot so it can bob and tilt.
  const head = new THREE.Group();
  head.position.set(0, 0.092, 0.006);
  bird.add(head);
  shape(head, P, CONURE.head, new THREE.IcosahedronGeometry(0.021, 0), [0, 0.006, 0]);
  shape(head, P, CONURE.cheek, new THREE.IcosahedronGeometry(0.014, 0), [0, -0.004, 0.009]).scale.set(1.3, 0.8, 0.8);
  shape(head, P, CONURE.beak, new THREE.ConeGeometry(0.007, 0.016, 5), [0, -0.002, 0.024], [Math.PI / 2 + 0.5, 0, 0]);
  for (const side of [-1, 1]) {
    shape(head, P, CONURE.eyeRing, new THREE.IcosahedronGeometry(0.005, 0), [side * 0.016, 0.006, 0.01]);
    shape(head, P, 0x111111, new THREE.IcosahedronGeometry(0.0028, 0), [side * 0.019, 0.006, 0.011]);
  }
  // Feet gripping the perch.
  box(bird, P, 0x7a6a70, [0.02, 0.006, 0.012], [0, 0.002, 0.004]);
  return { bird, head };
}

function birdcage(scene, L, pal) {
  const cage = new THREE.Group();
  cage.position.set(1.8, 0, -1.45);
  cage.rotation.y = -0.35; // front turned towards the door / camera
  scene.add(cage);
  const metal = 0xe6e2da;
  const W = 0.6, D = 0.45, H = 0.75, BASE = 0.78; // cage size, stand height

  // Stand: four legs on little wheels, plus a lower shelf.
  for (const [lx, lz] of [[-W / 2 + 0.03, -D / 2 + 0.03], [W / 2 - 0.03, -D / 2 + 0.03],
    [-W / 2 + 0.03, D / 2 - 0.03], [W / 2 - 0.03, D / 2 - 0.03]]) {
    box(cage, L.plastic, metal, [0.025, BASE, 0.025], [lx, BASE / 2 + 0.03, lz]);
    shape(cage, L.plastic, 0x2a2830, new THREE.CylinderGeometry(0.02, 0.02, 0.02, 6), [lx, 0.015, lz], [0, 0, Math.PI / 2]);
  }
  box(cage, L.plastic, metal, [W - 0.04, 0.015, D - 0.04], [0, 0.3, 0]);
  // Cage floor tray and roof.
  box(cage, L.plastic, 0xd8d2c6, [W + 0.03, 0.06, D + 0.03], [0, BASE + 0.03, 0]);
  box(cage, L.plastic, metal, [W + 0.01, 0.02, D + 0.01], [0, BASE + H, 0]);
  // Horizontal rails at a few heights.
  for (const ry of [0.06, H * 0.5, H - 0.02]) {
    box(cage, L.plastic, metal, [W, 0.008, 0.008], [0, BASE + ry, D / 2]);
    box(cage, L.plastic, metal, [W, 0.008, 0.008], [0, BASE + ry, -D / 2]);
    box(cage, L.plastic, metal, [0.008, 0.008, D], [W / 2, BASE + ry, 0]);
    box(cage, L.plastic, metal, [0.008, 0.008, D], [-W / 2, BASE + ry, 0]);
  }

  // Vertical bars: one instanced mesh around all four sides.
  const gap = 0.03;
  const spots = [];
  for (let bx = -W / 2; bx <= W / 2 + 1e-6; bx += gap) spots.push([bx, D / 2], [bx, -D / 2]);
  for (let bz = -D / 2 + gap; bz < D / 2 - 1e-6; bz += gap) spots.push([W / 2, bz], [-W / 2, bz]);
  const bars = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.004, H, 0.004),
    // Slightly darker than the frame so the thin bars don't drown the birds
    // at 240 lines.
    new THREE.MeshLambertMaterial({ color: 0xa8a39c }),
    spots.length,
  );
  const m = new THREE.Matrix4();
  spots.forEach(([bx, bz], i) => bars.setMatrixAt(i, m.makeTranslation(bx, BASE + H / 2, bz)));
  cage.add(bars);

  // Inside: wooden perch, food and water bowls, a hanging toy.
  const perchY = BASE + 0.32;
  shape(cage, L.wood, 0x8a6a48, new THREE.CylinderGeometry(0.008, 0.008, W - 0.02, 6), [0, perchY, 0], [0, 0, Math.PI / 2]);
  shape(cage, L.plastic, 0xd8d8d8, new THREE.CylinderGeometry(0.035, 0.028, 0.03, 8), [-0.2, BASE + 0.2, D / 2 - 0.04]);
  shape(cage, L.plastic, 0x5a8ac8, new THREE.CylinderGeometry(0.035, 0.028, 0.03, 8), [0.2, BASE + 0.2, D / 2 - 0.04]);
  box(cage, L.plastic, 0x8a6a48, [0.004, 0.18, 0.004], [0.18, BASE + H - 0.1, -0.05]);
  [0xe23b3b, 0xf0c419, 0x3a8ac8, 0x6ac84a].forEach((c, i) =>
    box(cage, L.wood, c, [0.025, 0.025, 0.025], [0.18, BASE + H - 0.2 - i * 0.03, -0.05], i * 0.4));

  // The two conures, sitting close together on the perch.
  const birds = [
    conure(cage, L, [-0.06, perchY + 0.008, 0], 0.15),
    conure(cage, L, [0.03, perchY + 0.008, 0], -0.25),
  ];

  // Small idle motion: head bobs and tilts, like they're watching the camera.
  return (t) => {
    birds.forEach(({ head, bird }, i) => {
      const p = t * 0.0025 + i * 1.7;
      head.rotation.z = Math.sin(p) * 0.25;
      head.rotation.y = Math.sin(p * 0.6 + i) * 0.5;
      bird.position.y = perchY + 0.008 + Math.max(0, Math.sin(p * 1.3)) * 0.004;
    });
  };
}

// ---- Cabinet with a terrarium and a pygmy chameleon ---------------------
// Left of the desk against the back wall. A densely planted tank with lots of
// twigs, the way pygmy chameleons like it.

// Green colouring and drawn ~1.7x real size so it reads at 240 lines.
const CHAMELEON_SCALE = 1.7;

function pygmyChameleon(parent, L, [x, y, z], rotY) {
  const P = L.plastic;
  const brown = 0x86c843, light = 0xd2e878, dark = 0x4e8a2c; // bright lime so it stands out from the plants
  const cham = new THREE.Group();
  cham.position.set(x, y, z);
  cham.rotation.y = rotY;
  cham.scale.setScalar(CHAMELEON_SCALE);
  parent.add(cham);
  // Body: tall and flattened sideways, with a little dorsal ridge.
  const body = shape(cham, P, brown, new THREE.IcosahedronGeometry(0.014, 0), [0, 0.014, 0]);
  body.scale.set(0.55, 0.9, 1.5);
  box(cham, P, dark, [0.003, 0.004, 0.034], [0, 0.027, 0]);
  shape(cham, P, light, new THREE.IcosahedronGeometry(0.007, 0), [0.004, 0.011, 0.004]).scale.set(0.5, 1, 1.6);
  // Head with a pointed casque, and two turret eyes that roam.
  const head = new THREE.Group();
  head.position.set(0, 0.018, 0.024);
  cham.add(head);
  shape(head, P, brown, new THREE.ConeGeometry(0.009, 0.02, 4), [0, 0, 0.004], [Math.PI / 2, Math.PI / 4, 0]);
  shape(head, P, dark, new THREE.ConeGeometry(0.004, 0.012, 3), [0, 0.008, -0.002], [-0.6, 0, 0]);
  const eyes = [-1, 1].map((side) => {
    const eye = shape(head, P, light, new THREE.IcosahedronGeometry(0.0042, 0), [side * 0.006, 0.002, 0.002]);
    shape(eye, P, 0x111111, new THREE.IcosahedronGeometry(0.0016, 0), [side * 0.003, 0, 0.002]);
    return eye;
  });
  // Legs gripping the twig.
  for (const [lx, lz] of [[-1, 0.012], [1, 0.012], [-1, -0.012], [1, -0.012]]) {
    const leg = box(cham, P, dark, [0.003, 0.014, 0.003], [lx * 0.006, 0.004, lz]);
    leg.rotation.z = lx * 0.5;
  }
  // Curled tail: a partial ring behind the body.
  shape(cham, P, brown, new THREE.TorusGeometry(0.008, 0.0025, 4, 10, Math.PI * 1.5), [0, 0.006, -0.026], [0, Math.PI / 2, Math.PI]);
  return { cham, eyes, head, baseY: y };
}

function terrarium(scene, L, pal) {
  const g = new THREE.Group();
  g.position.set(-1.62, 0, -1.5);
  g.rotation.y = 0.25; // turned a little towards the room
  scene.add(g);

  // Cabinet: body, two doors with handles, top board.
  const CW = 0.8, CH = 0.72, CD = 0.45;
  box(g, L.wood, 0xd9d2c4, [CW, CH, CD], [0, CH / 2, 0]);
  box(g, L.wood, 0xcfc7b8, [CW / 2 - 0.015, CH - 0.06, 0.01], [-CW / 4, CH / 2, CD / 2 + 0.005]);
  box(g, L.wood, 0xcfc7b8, [CW / 2 - 0.015, CH - 0.06, 0.01], [CW / 4, CH / 2, CD / 2 + 0.005]);
  box(g, L.plastic, 0x3a3640, [0.012, 0.06, 0.012], [-0.03, CH / 2 + 0.08, CD / 2 + 0.016]);
  box(g, L.plastic, 0x3a3640, [0.012, 0.06, 0.012], [0.03, CH / 2 + 0.08, CD / 2 + 0.016]);

  // Terrarium: 45 x 45 x 60 cm glass box with a black frame and mesh lid.
  const TW = 0.45, TD = 0.45, TH = 0.6, base = CH;
  const frame = 0x1c1b20;
  for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(g, L.plastic, frame, [0.015, TH, 0.015], [fx * TW / 2, base + TH / 2, fz * TD / 2]);
  }
  box(g, L.plastic, frame, [TW + 0.02, 0.04, TD + 0.02], [0, base + 0.02, 0]); // bottom rim
  // Glass panes (front and sides) - see-through.
  const glass = new THREE.MeshLambertMaterial({
    color: 0xcfe8e4, transparent: true, opacity: 0.18, depthWrite: false,
  });
  const pane = (w, h, px, pz, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass);
    m.position.set(px, base + 0.04 + h / 2, pz);
    m.rotation.y = ry;
    m.renderOrder = 2;
    g.add(m);
  };
  pane(TW, TH - 0.04, 0, TD / 2, 0);
  pane(TD, TH - 0.04, -TW / 2, 0, -Math.PI / 2);
  pane(TD, TH - 0.04, TW / 2, 0, Math.PI / 2);
  // Cork background on the back.
  box(g, L.fabric, 0x6a4a32, [TW - 0.01, TH - 0.05, 0.02], [0, base + TH / 2, -TD / 2 + 0.012]);
  // Mesh lid and a warm lamp on top.
  box(g, L.fabric, 0x2a2830, [TW + 0.02, 0.015, TD + 0.02], [0, base + TH, 0]);
  box(g, L.plastic, 0x1c1b20, [0.3, 0.035, 0.06], [0, base + TH + 0.025, 0]);
  const lampGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xfff0c8, fog: false }),
  );
  lampGlow.rotation.x = Math.PI / 2;
  lampGlow.position.set(0, base + TH - 0.009, 0);
  g.add(lampGlow);
  const lamp = new THREE.PointLight(0xffe2b0, 0.9, 0.9, 1.5);
  lamp.position.set(0, base + TH - 0.05, 0);
  g.add(lamp);

  // Inside: substrate, leaf litter, twigs, plants.
  const soil = base + 0.06; // top of the substrate
  box(g, L.fabric, 0x4a3426, [TW - 0.02, 0.06, TD - 0.02], [0, base + 0.03, 0]);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const leafColors = [0x8a5a2a, 0x6a4422, 0xa8743a, 0x5a3a20];
  for (let i = 0; i < 26; i++) {
    const leaf = new THREE.Mesh(
      new THREE.PlaneGeometry(0.035, 0.022),
      new THREE.MeshLambertMaterial({ color: leafColors[i % 4], side: THREE.DoubleSide }),
    );
    leaf.rotation.set(-Math.PI / 2 + (rnd() - 0.5) * 0.4, 0, rnd() * Math.PI);
    leaf.position.set((rnd() - 0.5) * (TW - 0.06), soil + 0.002 + rnd() * 0.006, (rnd() - 0.5) * (TD - 0.06));
    g.add(leaf);
  }
  const twig = (len, [tx, ty, tz], rot, r = 0.005) =>
    shape(g, L.wood, 0x5a4232, new THREE.CylinderGeometry(r * 0.7, r, len, 5), [tx, ty, tz], rot);
  // Main perch for the chameleon, then a tangle of twigs at all heights.
  twig(0.38, [0, soil + 0.09, 0.02], [0, 0.3, 1.1], 0.007);
  const twigs = [
    [0.3, [-0.08, 0.16, -0.06], [0.2, 0, -0.9]],
    [0.22, [0.12, 0.08, -0.08], [-0.3, 0, 0.5]],
    [0.42, [0.06, 0.24, -0.1], [0.1, 0.8, 1.25]],
    [0.34, [-0.12, 0.3, 0.04], [-0.2, -0.6, -1.0]],
    [0.28, [0.14, 0.34, 0.06], [0.4, 0.2, 0.7]],
    [0.46, [-0.02, 0.2, -0.15], [0, 1.4, 1.35]],
    [0.25, [-0.15, 0.1, 0.1], [0.6, 0, 0.3]],
    [0.3, [0.16, 0.18, 0.14], [-0.5, 0.4, -0.4]],
    [0.36, [0.0, 0.4, -0.05], [0.2, -1.0, 1.45]],
    [0.2, [-0.16, 0.42, -0.12], [0.3, 0, -0.5]],
    [0.24, [0.08, 0.05, 0.14], [1.2, 0.3, 0.2]],
    [0.32, [-0.06, 0.06, -0.02], [0.1, 2.2, 1.4]],
  ];
  twigs.forEach(([len, [tx, ty, tz], rot]) => twig(len, [tx, soil + ty, tz], rot, 0.003 + rnd() * 0.003));

  // Plants: broad-leaf clumps all over, a few tall ones in the back.
  const plant = (px, pz, h, color, leaves = 6) => {
    for (let i = 0; i < leaves; i++) {
      const leaf = shape(g, L.fabric, color, new THREE.ConeGeometry(0.018, h, 3),
        [px + (rnd() - 0.5) * 0.04, soil + h / 2, pz + (rnd() - 0.5) * 0.04],
        [(rnd() - 0.5) * 0.8, rnd() * Math.PI, (rnd() - 0.5) * 0.8]);
      leaf.scale.set(1, 1, 0.3);
    }
  };
  const greens = [0x3f7a3a, 0x4f8a3e, 0x5a9a48, 0x2f6a34, 0x6aa850];
  [
    [-0.16, -0.15, 0.32], [0.15, -0.14, 0.38], [0.0, -0.17, 0.26], [-0.08, -0.12, 0.2],
    [0.16, 0.13, 0.12], [-0.17, 0.14, 0.14], [0.06, 0.16, 0.08], [-0.05, 0.12, 0.1],
    [0.1, -0.02, 0.16], [-0.17, -0.01, 0.22], [0.17, 0.02, 0.24],
  ].forEach(([px, pz, h], i) => plant(px, pz, h, greens[i % greens.length], h > 0.2 ? 7 : 5));
  // Round-leaf plants (pothos-like) between the clumps.
  for (let i = 0; i < 14; i++) {
    const leaf = shape(g, L.fabric, greens[i % greens.length], new THREE.CircleGeometry(0.02, 5),
      [(rnd() - 0.5) * 0.36, soil + 0.02 + rnd() * 0.1, (rnd() - 0.5) * 0.36],
      [-0.6 - rnd() * 0.6, rnd() * Math.PI * 2, 0]);
    leaf.material.side = THREE.DoubleSide;
  }
  // Moss patches on the ground.
  for (let i = 0; i < 8; i++) {
    const moss = shape(g, L.fabric, 0x4a7a32, new THREE.CircleGeometry(0.03 + rnd() * 0.02, 6),
      [(rnd() - 0.5) * 0.36, soil + 0.003, (rnd() - 0.5) * 0.36], [-Math.PI / 2, 0, rnd() * 3]);
    moss.material.side = THREE.DoubleSide;
  }
  // A trailing plant hanging down from the lid in the back corner.
  for (let i = 0; i < 9; i++) {
    const vine = shape(g, L.fabric, greens[(i + 2) % greens.length], new THREE.ConeGeometry(0.012, 0.06, 3),
      [-0.14 + (rnd() - 0.5) * 0.06, base + TH - 0.05 - i * 0.035, -0.17 + (rnd() - 0.5) * 0.04],
      [Math.PI + (rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5]);
    vine.scale.set(1, 1, 0.35);
  }

  // The chameleon, on the low diagonal twig.
  const c = pygmyChameleon(g, L, [0.02, soil + 0.092, 0.02], -1.1);

  // Photo frame on the cabinet, to the right of the terrarium.
  pictureFrame(g, L, [0.31, CH, 0.08], -0.25);

  // Slow rocking walk-in-place and independent eye movement.
  return (t) => {
    c.cham.rotation.z = Math.sin(t * 0.004) * 0.12;
    c.cham.position.x = 0.02 + Math.sin(t * 0.004) * 0.002;
    c.eyes[0].rotation.y = Math.sin(t * 0.0013) * 0.8;
    c.eyes[1].rotation.y = Math.sin(t * 0.0009 + 2) * 0.8;
    c.head.rotation.x = Math.sin(t * 0.0011) * 0.1;
  };
}

// Phone standing in a little desk stand: the mobile intro flies into this
// screen instead of the monitor. Portrait, ~7 x 15 cm display.
function phoneOnStand(scene, L, pal, [x, y, z], rotY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  scene.add(g);
  // Stand: base plate and a back support.
  box(g, L.plastic, 0x2a2830, [0.09, 0.012, 0.08], [0, 0.006, 0]);
  const back = box(g, L.plastic, 0x2a2830, [0.07, 0.11, 0.01], [0, 0.06, -0.02]);
  back.rotation.x = -0.28;
  box(g, L.plastic, 0x2a2830, [0.085, 0.012, 0.012], [0, 0.018, 0.022]); // lip
  // Phone, leaning back against the support.
  const phone = new THREE.Group();
  phone.position.set(0, 0.095, 0.0);
  phone.rotation.x = -0.28;
  g.add(phone);
  const W = 0.071, H = 0.153;
  box(phone, L.plastic, 0x15141a, [W + 0.008, H + 0.012, 0.008], [0, 0, 0]);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ color: 0x140c1c, fog: false }),
  );
  screen.position.set(0, 0, 0.0041);
  screen.name = "Screen_Phone";
  phone.add(screen);
  return screen;
}

// ---- Microphone on a boom arm ---------------------------------------------
// A cylinder between two points (arm segments, springs).
function rod(parent, look, color, a, b, r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const mesh = shape(parent, look, color, new THREE.CylinderGeometry(r, r, len, 6),
    [(A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2]);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return mesh;
}

// Desk clamp at the back-left corner, two-part boom arm with springs, and a
// mic in a shock mount pointing at the chair.
function micArm(scene, L, desk) {
  const P = L.plastic, arm = 0x1f1d24, metal = 0x8a8894;
  const base = [-0.82, desk, -1.72];
  box(scene, P, arm, [0.06, 0.05, 0.08], [base[0], desk + 0.025, base[2]]);      // clamp
  box(scene, P, arm, [0.06, 0.012, 0.08], [base[0], desk - 0.03, base[2]]);      // clamp jaw
  const pivot = [base[0], desk + 0.16, base[2]];
  rod(scene, P, arm, [base[0], desk + 0.05, base[2]], pivot, 0.012);
  const elbow = [-0.72, 1.32, -1.5];
  const end = [-0.5, 1.12, -1.22];
  for (const off of [-0.012, 0.012]) {
    rod(scene, P, arm, [pivot[0] + off, pivot[1], pivot[2]], [elbow[0] + off, elbow[1], elbow[2]], 0.006);
    rod(scene, P, arm, [elbow[0] + off, elbow[1], elbow[2]], [end[0] + off, end[1], end[2]], 0.006);
  }
  // Springs along both segments.
  rod(scene, P, metal, [pivot[0], pivot[1] + 0.04, pivot[2] + 0.02], [elbow[0], elbow[1] - 0.05, elbow[2]], 0.004);
  rod(scene, P, metal, [elbow[0], elbow[1] - 0.03, elbow[2] + 0.03], [end[0] - 0.05, end[1] + 0.02, end[2] - 0.04], 0.004);
  box(scene, P, arm, [0.04, 0.04, 0.04], elbow); // elbow joint

  // Mic hanging down from the end of the arm, tilted towards the chair.
  const mic = new THREE.Group();
  mic.position.set(end[0], end[1] - 0.03, end[2]);
  mic.rotation.set(0.9, 0.35, 0);
  scene.add(mic);
  shape(mic, P, 0x2a2830, new THREE.TorusGeometry(0.042, 0.004, 4, 12), [0, 0, 0], [Math.PI / 2, 0, 0]);
  shape(mic, P, 0x2a2830, new THREE.TorusGeometry(0.042, 0.004, 4, 12), [0, -0.06, 0], [Math.PI / 2, 0, 0]);
  shape(mic, P, 0x15141a, new THREE.CylinderGeometry(0.026, 0.026, 0.16, 8), [0, -0.02, 0]);       // body
  shape(mic, L.fabric, 0x4a4856, new THREE.CylinderGeometry(0.028, 0.028, 0.06, 8), [0, 0.07, 0]); // grille
  shape(mic, P, 0x4a4856, new THREE.SphereGeometry(0.028, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.1, 0]);
  shape(mic, P, 0xc637e6, new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6), [0, 0.01, 0.026], [Math.PI / 2, 0, 0]); // status light
}

// ---- Mousepad ---------------------------------------------------------------
// Desk mat under keyboard and mouse. Image: public/intro/mousepad.webp
// (.jpg/.png also work), shown on the whole mat (cover-fit).
function mousepad(scene, L, desk, [x, z], [w, d]) {
  box(scene, L.fabric, 0x141318, [w, 0.003, d], [x, desk + 0.0015, z]);
  const tex = smallTexture(160, Math.round(160 * d / w));
  const ctx = tex.image.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, tex.image.width, tex.image.height);
  g.addColorStop(0, "#2a1038"); g.addColorStop(1, "#140c1c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, tex.image.width, tex.image.height);
  loadImageInto(tex, "/intro/mousepad");
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.006, d - 0.006), new THREE.MeshLambertMaterial({ map: tex }));
  top.rotation.x = -Math.PI / 2;
  top.position.set(x, desk + 0.0032, z);
  top.name = "Mousepad";
  scene.add(top);
}

// ---- Picture frame ----------------------------------------------------------
// Standing photo frame with a little stand at the back.
// Photo: public/intro/frame.webp (.jpg/.png also work).
export const PHOTO_FRAME = { width: 0.13, height: 0.18 }; // portrait 13 x 18 cm

function pictureFrame(parent, L, [x, y, z], rotY) {
  const { width: w, height: h } = PHOTO_FRAME;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  const tilt = -0.18; // leaning back
  const f = new THREE.Group();
  f.position.set(0, h / 2 + 0.012, 0);
  f.rotation.x = tilt;
  g.add(f);
  box(f, L.wood, 0x3a2a22, [w + 0.024, h + 0.024, 0.014], [0, 0, 0]);
  const tex = smallTexture(Math.round(64 * w / h), 64);
  const ctx = tex.image.getContext("2d");
  ctx.fillStyle = "#d8d2c4";
  ctx.fillRect(0, 0, tex.image.width, tex.image.height);
  ctx.fillStyle = "#b8b0a0";
  ctx.fillRect(tex.image.width * 0.2, tex.image.height * 0.25, tex.image.width * 0.6, tex.image.height * 0.5);
  loadImageInto(tex, "/intro/frame");
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  photo.position.set(0, 0, 0.0075);
  photo.name = "PhotoFrame";
  f.add(photo);
  const stand = box(g, L.wood, 0x3a2a22, [0.02, h * 0.7, 0.006], [0, h * 0.35, -0.045]);
  stand.rotation.x = 0.35;
}

function buildGreybox(pal) {
  const scene = new THREE.Scene();
  const T = makeTextures();
  const L = {
    floor: { tex: T.wood, tile: 0.6 },
    wall: { tex: T.stripes, tile: 0.8 },
    wood: { tex: T.wood, tile: 0.4 },
    plastic: { tex: T.plain, tile: 0.3 },
    fabric: { tex: T.fabric, tile: 0.4 },
  };

  // Room shell: floor, back wall, side walls.
  box(scene, L.floor, pal.floor, [5, 0.1, 5], [0, -0.05, 0]);
  box(scene, L.wall, pal.wall, [5, 3, 0.1], [0, 1.5, -1.85]);
  box(scene, L.wall, pal.wall, [0.1, 3, 5], [-2.2, 1.5, 0]);
  box(scene, L.wall, pal.wall, [0.1, 3, 5], [2.2, 1.5, 0]);
  // Window on the left wall.
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.9),
    new THREE.MeshBasicMaterial({ color: pal.sky, fog: false }),
  );
  win.position.set(-2.14, 1.75, 0.3);
  win.rotation.y = Math.PI / 2;
  scene.add(win);
  box(scene, L.wood, pal.shelf, [0.06, 0.06, 1.2], [-2.12, 1.28, 0.3]);

  // Desk (top surface at y = 0.755).
  const DESK = 0.755;
  box(scene, L.wood, pal.desk, [1.8, 0.05, 0.75], [0, 0.73, -1.42]);
  for (const [x, z] of [[-0.85, -1.74], [0.85, -1.74], [-0.85, -1.1], [0.85, -1.1]]) {
    box(scene, L.wood, pal.desk, [0.05, 0.71, 0.05], [x, 0.355, z]);
  }

  // Full-size (100%) keyboard: main block + numpad, and a wireless mouse.
  // (Raised 3 mm: they sit on the desk mat.)
  box(scene, L.plastic, pal.dark, [0.44, 0.022, 0.14], [-0.02, DESK + 0.014, -1.2]);
  box(scene, L.plastic, 0x3c3846, [0.34, 0.006, 0.115], [-0.065, DESK + 0.028, -1.2]);
  box(scene, L.plastic, 0x3c3846, [0.07, 0.006, 0.115], [0.155, DESK + 0.028, -1.2]);
  shape(scene, L.plastic, pal.dark, new THREE.SphereGeometry(0.03, 6, 4), [0.3, DESK + 0.015, -1.18], [0, 0, 0])
    .scale.set(1, 0.45, 1.7);
  // Desk mat under keyboard and mouse.
  mousepad(scene, L, DESK, [0.08, -1.18], [0.8, 0.3]);
  // Microphone on a boom arm, clamped to the back-left of the desk.
  micArm(scene, L, DESK);
  // PC tower under the right side of the desk.
  box(scene, L.plastic, pal.dark, [0.22, 0.48, 0.48], [0.62, 0.24, -1.45]);
  box(scene, L.plastic, 0x9b20b7, [0.005, 0.3, 0.005], [0.505, 0.3, -1.22]); // front LED strip

  // Monitor arm: desk clamp pole with a crossbar holding all three screens.
  box(scene, L.plastic, 0x24222a, [0.05, 0.6, 0.05], [0, DESK + 0.3, -1.76]);
  box(scene, L.plastic, 0x24222a, [1.1, 0.03, 0.03], [0, 1.15, -1.73]);
  box(scene, L.plastic, 0x24222a, [0.03, 0.03, 0.08], [0, 1.27, -1.7]);

  // Screens, left to right: 1 horizontal, 2 horizontal and raised (the OS),
  // 3 vertical.
  const W = 0.6, H = 0.3375;
  const m1 = monitor(scene, L, pal, { x: -0.62, y: 1.15, z: -1.55, rotY: 0.38, w: W, h: H, glow: 0x24152e });
  const m2 = monitor(scene, L, pal, { x: 0, y: 1.29, z: -1.65, rotY: 0, w: W, h: H });
  const m3 = monitor(scene, L, pal, { x: 0.5, y: 1.2, z: -1.57, rotY: -0.38, w: H, h: W, glow: 0x24152e });
  const screen = m2.screen;
  // Phone on a stand to the right of the keyboard (target of the mobile intro).
  const phoneScreen = phoneOnStand(scene, L, pal, [0.43, DESK, -1.38], -0.35);

  // Toy figures on top of screens 1 and 3.
  const figColors = [
    [0x2a3fa8, 0xc8202a, 0xc8202a], [0x1a1a1a, 0x1a1a1a, 0xe8e8e8],
    [0xc8202a, 0x1a1a1a, 0xc8202a], [0x3a3a44, 0xd8d8d8, 0xd8d8d8],
    [0x7a2a8a, 0x2a2a2a, 0x2a2a2a],
  ];
  [-0.2, -0.1, 0, 0.1, 0.2].forEach((fx, i) =>
    minifig(m1.group, L, [fx, m1.top, 0], figColors[i]));
  [-0.11, -0.04, 0.03, 0.1].forEach((fx, i) =>
    minifig(m3.group, L, [fx, 0.3 + 0.015, 0], figColors[(i + 2) % figColors.length]));

  // Under the middle screen: two boxed N64 games on the left, figure on the right.
  gameBox(scene, L, { id: "majoras-mask-pal", size: "pal", color: 0x1f3a24 }, [-0.27, DESK, -1.56], 0.1);
  gameBox(scene, L, { id: "papermario-jp", size: "jp", color: 0xe8d48a }, [-0.08, DESK, -1.57], -0.05);
  figure(scene, L, pal, [0.17, DESK, -1.55], -0.25);

  // Four posters above the desk.
  POSTERS.forEach((def, i) => poster(scene, L, pal, def, i, [-0.69 + i * 0.46, 2.0, -1.79]));

  // Chair.
  box(scene, L.fabric, pal.dark, [0.5, 0.08, 0.5], [0.1, 0.5, -0.55]);
  box(scene, L.fabric, pal.dark, [0.5, 0.6, 0.06], [0.1, 0.85, -0.3]);
  box(scene, L.plastic, pal.dark, [0.06, 0.46, 0.06], [0.1, 0.23, -0.55]);

  // Bed along the left wall and the rug.
  box(scene, L.fabric, pal.bed, [1.0, 0.4, 2.0], [-1.65, 0.2, 1.2]);
  box(scene, L.fabric, pal.sheet, [1.0, 0.12, 1.5], [-1.65, 0.46, 1.45]);
  box(scene, L.fabric, pal.rug, [1.4, 0.02, 1.0], [0.2, 0.01, 0.5]);
  // Bird cage on the right with the two conures.
  const birds = birdcage(scene, L, pal);
  // Cabinet with the terrarium and pygmy chameleon on the left.
  const chameleon = terrarium(scene, L, pal);
  const animate = (t) => { birds(t); chameleon(t); };

  return {
    scene, screen, phoneScreen, animate,
    sideScreens: [m1.screen, m3.screen],
    leds: [m1.led, m2.led, m3.led],
  };
}

async function buildFromModel(url) {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(url);
  const scene = new THREE.Scene();
  scene.add(gltf.scene);
  const screen = gltf.scene.getObjectByName("Screen_Main");
  if (!screen) throw new Error("room.glb has no object named Screen_Main");
  // Optional: name the phone's display "Screen_Phone" for the mobile intro.
  const phoneScreen = gltf.scene.getObjectByName("Screen_Phone") || null;
  return { scene, screen, phoneScreen };
}

function addLights(scene, pal) {
  scene.background = new THREE.Color(pal.bg);
  // Distance fog: the classic N64/PS2 way of hiding the far plane.
  scene.fog = new THREE.Fog(pal.fog, 2.2, 6.5);
  scene.add(new THREE.AmbientLight(0xffffff, pal.ambient));
  const sun = new THREE.DirectionalLight(0xfff1dc, pal.sun);
  sun.position.set(-3, 3, 1.5);
  scene.add(sun);
  // Purple monitor glow, stronger at night.
  const glow = new THREE.PointLight(0xc637e6, pal.lamp, 3.5, 1.5);
  glow.position.set(0, 1.2, -1.1);
  scene.add(glow);
  return glow;
}

// Returns the scene plus the main screen's world-space center, normal and size,
// which the intro uses to land the camera exactly in front of it.
export async function loadRoom() {
  const pal = isNight() ? NIGHT : DAY;
  pendingImages = [];
  const room = ROOM_MODEL_URL ? await buildFromModel(ROOM_MODEL_URL) : buildGreybox(pal);
  const glow = addLights(room.scene, pal);
  // Power state of the whole setup: side screens and the monitor glow go dark
  // when MudaOS shuts down.
  const sideScreens = room.sideScreens || [];
  const sideColors = sideScreens.map((m) => m.material.color.clone());
  const glowOn = glow.intensity;
  const setPowered = (level) => {
    // level: 1 = on, 0 = screens dark (in between while switching)
    glow.intensity = glowOn * (0.12 + 0.88 * level);
    sideScreens.forEach((m, i) => m.material.color.copy(sideColors[i]).multiplyScalar(level));
  };
  // Standby: the monitor LEDs pulse amber instead of glowing purple.
  const leds = room.leds || [];
  let sleeping = false;
  const setSleeping = (on) => { sleeping = on; };
  const ledColor = new THREE.Color();
  // The LEDs are only a few pixels at 240 lines, so standby also gets a soft
  // amber glow over the desk that pulses with them.
  const standbyGlow = new THREE.PointLight(LED_SLEEP, 0, 1.6, 2);
  standbyGlow.position.set(0, 1.05, -1.35);
  room.scene.add(standbyGlow);
  const roomAnimate = room.animate || (() => {});
  const animate = (t) => {
    roomAnimate(t);
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.0028);
    if (sleeping) ledColor.set(LED_SLEEP).multiplyScalar(0.2 + 0.8 * pulse);
    else ledColor.set(LED_ON);
    standbyGlow.intensity = sleeping ? 0.15 + 0.45 * pulse : 0;
    leds.forEach((l) => l.material.color.copy(ledColor));
  };
  room.scene.updateMatrixWorld(true);
  // Give posters and game covers up to 1.5 s to arrive before we start.
  await Promise.race([
    Promise.all(pendingImages),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  const monitor = screenInfo(room.screen);
  return {
    scene: room.scene,
    animate,
    setPowered,
    setSleeping,
    sideScreens,
    // Camera targets: the middle monitor (desktop intro) and the phone
    // (mobile intro; falls back to the monitor if the model has no phone).
    screens: {
      monitor,
      phone: room.phoneScreen ? screenInfo(room.phoneScreen) : monitor,
    },
  };
}

// World-space center, facing direction and size of a screen plane, used to
// land the camera exactly in front of it.
function screenInfo(mesh) {
  mesh.geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  mesh.geometry.boundingBox.getSize(size);
  const scale = new THREE.Vector3();
  mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
  const center = new THREE.Vector3();
  mesh.geometry.boundingBox.getCenter(center);
  mesh.localToWorld(center);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
  return { mesh, center, normal, width: size.x * scale.x, height: size.y * scale.y };
}

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
  screen.position.set(0, 0, 0.0126);
  group.add(screen);
  return { group, screen, top: h / 2 + 0.015 };
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

// Boxed N64 game standing upright (box is ~19 x 13.5 x 3.5 cm).
function gameBox(parent, L, color, [x, y, z], rotY) {
  const b = box(parent, L.plastic, color, [0.19, 0.135, 0.035], [x, y + 0.0675, z], rotY);
  // Lighter "art" panel on the front face.
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.09),
    new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }),
  );
  panel.position.set(0.005, -0.008, 0.0176);
  b.add(panel);
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

function posterTexture() {
  const c = document.createElement("canvas");
  c.width = POSTER_W; c.height = POSTER_H;
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

function loadPosterImage(tex, id) {
  const tryExt = (exts) => {
    if (!exts.length) return;
    const img = new Image();
    img.onload = () => {
      // Cover-fit into the tiny texture.
      const ctx = tex.image.getContext("2d");
      const k = Math.max(POSTER_W / img.width, POSTER_H / img.height);
      const w = img.width * k, h = img.height * k;
      ctx.drawImage(img, (POSTER_W - w) / 2, (POSTER_H - h) / 2, w, h);
      tex.needsUpdate = true;
    };
    img.onerror = () => tryExt(exts.slice(1));
    img.src = `/intro/posters/${id}.${exts[0]}`;
  };
  tryExt(["webp", "jpg", "png"]);
}

function poster(parent, L, pal, def, i, [x, y, z]) {
  const w = 0.38, h = 0.54;
  box(parent, L.plastic, 0x1a171e, [w + 0.03, h + 0.03, 0.02], [x, y, z]); // frame
  const tex = posterTexture();
  drawPlaceholder(tex, def.palette, i + 1);
  loadPosterImage(tex, def.id);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  art.position.set(x, y, z + 0.011);
  art.name = `Poster_${def.id}`;
  parent.add(art);
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
  box(scene, L.plastic, pal.dark, [0.44, 0.022, 0.14], [-0.02, DESK + 0.011, -1.2]);
  box(scene, L.plastic, 0x3c3846, [0.34, 0.006, 0.115], [-0.065, DESK + 0.025, -1.2]);
  box(scene, L.plastic, 0x3c3846, [0.07, 0.006, 0.115], [0.155, DESK + 0.025, -1.2]);
  shape(scene, L.plastic, pal.dark, new THREE.SphereGeometry(0.03, 6, 4), [0.3, DESK + 0.012, -1.18], [0, 0, 0])
    .scale.set(1, 0.45, 1.7);
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
  gameBox(scene, L, 0x2b2b36, [-0.25, DESK, -1.56], 0.1);
  gameBox(scene, L, 0x3a3a48, [-0.05, DESK, -1.57], -0.05);
  figure(scene, L, pal, [0.17, DESK, -1.55], -0.25);

  // Four posters above the desk.
  POSTERS.forEach((def, i) => poster(scene, L, pal, def, i, [-0.69 + i * 0.46, 2.0, -1.79]));

  // Chair.
  box(scene, L.fabric, pal.dark, [0.5, 0.08, 0.5], [0.1, 0.5, -0.55]);
  box(scene, L.fabric, pal.dark, [0.5, 0.6, 0.06], [0.1, 0.85, -0.3]);
  box(scene, L.plastic, pal.dark, [0.06, 0.46, 0.06], [0.1, 0.23, -0.55]);

  // Bed along the left wall, rug, shelf on the right.
  box(scene, L.fabric, pal.bed, [1.0, 0.4, 2.0], [-1.65, 0.2, 1.2]);
  box(scene, L.fabric, pal.sheet, [1.0, 0.12, 1.5], [-1.65, 0.46, 1.45]);
  box(scene, L.fabric, pal.rug, [1.4, 0.02, 1.0], [0.2, 0.01, 0.5]);
  box(scene, L.wood, pal.shelf, [0.5, 1.8, 0.35], [1.9, 0.9, -1.2]);

  return { scene, screen };
}

async function buildFromModel(url) {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(url);
  const scene = new THREE.Scene();
  scene.add(gltf.scene);
  const screen = gltf.scene.getObjectByName("Screen_Main");
  if (!screen) throw new Error("room.glb has no object named Screen_Main");
  return { scene, screen };
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
}

// Returns the scene plus the main screen's world-space center, normal and size,
// which the intro uses to land the camera exactly in front of it.
export async function loadRoom() {
  const pal = isNight() ? NIGHT : DAY;
  const room = ROOM_MODEL_URL ? await buildFromModel(ROOM_MODEL_URL) : buildGreybox(pal);
  addLights(room.scene, pal);
  // The monitor's display ignores fog and light so it stays bright.
  room.screen.material.fog = false;
  room.scene.updateMatrixWorld(true);

  const { screen } = room;
  screen.geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  screen.geometry.boundingBox.getSize(size);
  const scale = new THREE.Vector3();
  screen.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
  const center = new THREE.Vector3();
  screen.geometry.boundingBox.getCenter(center);
  screen.localToWorld(center);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(screen.matrixWorld);

  return {
    scene: room.scene,
    screen,
    screenCenter: center,
    screenNormal: normal,
    screenWidth: size.x * scale.x,
    screenHeight: size.y * scale.y,
  };
}

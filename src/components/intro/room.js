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

// One monitor: stand, bezel and a screen plane just in front of the bezel.
function monitor(parent, L, pal, { x, z, rotY, w, h }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  parent.add(group);
  box(group, L.plastic, pal.dark, [0.22, 0.02, 0.16], [0, 0.76, 0]);
  box(group, L.plastic, pal.dark, [0.04, 0.22, 0.04], [0, 0.88, -0.02]);
  box(group, L.plastic, pal.dark, [w + 0.04, h + 0.04, 0.03], [0, 1.0 + h / 2, 0]);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: 0x0c0c14 }),
  );
  screen.position.set(0, 1.0 + h / 2, 0.0151);
  group.add(screen);
  return screen;
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

  // Desk.
  box(scene, L.wood, pal.desk, [1.8, 0.05, 0.75], [0, 0.73, -1.42]);
  for (const [x, z] of [[-0.85, -1.74], [0.85, -1.74], [-0.85, -1.1], [0.85, -1.1]]) {
    box(scene, L.wood, pal.desk, [0.05, 0.71, 0.05], [x, 0.355, z]);
  }
  // Keyboard, mouse, PC tower.
  box(scene, L.plastic, pal.dark, [0.44, 0.02, 0.14], [0, 0.765, -1.2]);
  box(scene, L.plastic, pal.dark, [0.06, 0.02, 0.1], [0.33, 0.765, -1.2]);
  box(scene, L.plastic, pal.dark, [0.22, 0.48, 0.48], [0.68, 0.24, -1.45]);

// Three monitors; the middle one is where the OS lives.
  const W = 0.6, H = 0.3375;
  const screen = monitor(scene, L, pal, { x: 0, z: -1.6, rotY: 0, w: W, h: H });
  monitor(scene, L, pal, { x: -0.64, z: -1.5, rotY: 0.45, w: W, h: H });
  monitor(scene, L, pal, { x: 0.64, z: -1.5, rotY: -0.45, w: W, h: H });

  // Chair.
  box(scene, L.fabric, pal.dark, [0.5, 0.08, 0.5], [0.1, 0.5, -0.55]);
  box(scene, L.fabric, pal.dark, [0.5, 0.6, 0.06], [0.1, 0.85, -0.3]);
  box(scene, L.plastic, pal.dark, [0.06, 0.46, 0.06], [0.1, 0.23, -0.55]);

  // Bed along the left wall, rug, shelf with figures on the right.
  box(scene, L.fabric, pal.bed, [1.0, 0.4, 2.0], [-1.65, 0.2, 1.2]);
  box(scene, L.fabric, pal.sheet, [1.0, 0.12, 1.5], [-1.65, 0.46, 1.45]);
  box(scene, L.fabric, pal.rug, [1.4, 0.02, 1.0], [0.2, 0.01, 0.5]);
  box(scene, L.wood, pal.shelf, [0.5, 1.8, 0.35], [1.9, 0.9, -1.2]);
  for (const y of [0.5, 0.95, 1.4]) {
    box(scene, L.plastic, 0x9b20b7, [0.12, 0.2, 0.12], [1.9, y + 0.1, -1.2]);
  }

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

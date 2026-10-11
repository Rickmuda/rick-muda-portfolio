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
  wall: 0xb9b19a, floor: 0x7d5b45, desk: 0x5b4636, dark: 0x2a2630,
  bed: 0x7a2f3a, sheet: 0x6f8f8a, rug: 0xb8b3a6, shelf: 0xd9d4c8,
  sky: 0x9fc6d8, ambient: 0.75, sun: 1.6, lamp: 0.6, bg: 0x1a1a24,
};
const NIGHT = {
  ...DAY, wall: 0x6e6878, floor: 0x4a3830, sky: 0x1d2440,
  ambient: 0.35, sun: 0.25, lamp: 1.8,
};

export function isNight() {
  const h = new Date().getHours();
  return h >= 18 || h < 6;
}

function toonGradient() {
  // 3-step toon ramp so surfaces get flat, cartoon-style shading.
  const data = new Uint8Array([90, 170, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const OUTLINE = new THREE.LineBasicMaterial({ color: 0x15121a });

// Adds a box with flat toon shading and black ink edges, like the wallpaper.
function box(parent, gradientMap, color, [w, h, d], [x, y, z], rotY = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color, gradientMap }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), OUTLINE));
  parent.add(mesh);
  return mesh;
}

// One monitor: stand, bezel and a screen plane just in front of the bezel.
function monitor(parent, g, pal, { x, z, rotY, w, h }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  parent.add(group);
  box(group, g, pal.dark, [0.22, 0.02, 0.16], [0, 0.76, 0]);
  box(group, g, pal.dark, [0.04, 0.22, 0.04], [0, 0.88, -0.02]);
  box(group, g, pal.dark, [w + 0.04, h + 0.04, 0.03], [0, 1.0 + h / 2, 0]);
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
  const g = toonGradient();

  // Room shell: floor, back wall, left wall, ceiling hint.
  box(scene, g, pal.floor, [5, 0.1, 5], [0, -0.05, 0]);
  box(scene, g, pal.wall, [5, 3, 0.1], [0, 1.5, -1.85]);
  box(scene, g, pal.wall, [0.1, 3, 5], [-2.2, 1.5, 0]);
  box(scene, g, pal.wall, [0.1, 3, 5], [2.2, 1.5, 0]);
  // Window on the left wall.
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.9),
    new THREE.MeshBasicMaterial({ color: pal.sky }),
  );
  win.position.set(-2.14, 1.75, 0.3);
  win.rotation.y = Math.PI / 2;
  scene.add(win);
  box(scene, g, pal.shelf, [0.06, 0.06, 1.2], [-2.12, 1.28, 0.3]);

  // Desk.
  box(scene, g, pal.desk, [1.8, 0.05, 0.75], [0, 0.73, -1.42]);
  for (const [x, z] of [[-0.85, -1.74], [0.85, -1.74], [-0.85, -1.1], [0.85, -1.1]]) {
    box(scene, g, pal.desk, [0.05, 0.71, 0.05], [x, 0.355, z]);
  }
  // Keyboard, mouse, PC tower.
  box(scene, g, pal.dark, [0.44, 0.02, 0.14], [0, 0.765, -1.2]);
  box(scene, g, pal.dark, [0.06, 0.02, 0.1], [0.33, 0.765, -1.2]);
  box(scene, g, pal.dark, [0.22, 0.48, 0.48], [0.68, 0.24, -1.45]);

  // Three monitors; the middle one is where the OS lives.
  const W = 0.6, H = 0.3375;
  const screen = monitor(scene, g, pal, { x: 0, z: -1.6, rotY: 0, w: W, h: H });
  monitor(scene, g, pal, { x: -0.64, z: -1.5, rotY: 0.45, w: W, h: H });
  monitor(scene, g, pal, { x: 0.64, z: -1.5, rotY: -0.45, w: W, h: H });

  // Chair.
  box(scene, g, pal.dark, [0.5, 0.08, 0.5], [0.1, 0.5, -0.55]);
  box(scene, g, pal.dark, [0.5, 0.6, 0.06], [0.1, 0.85, -0.3]);
  box(scene, g, pal.dark, [0.06, 0.46, 0.06], [0.1, 0.23, -0.55]);

  // Bed along the left wall, rug, shelf with figures on the right.
  box(scene, g, pal.bed, [1.0, 0.4, 2.0], [-1.65, 0.2, 1.2]);
  box(scene, g, pal.sheet, [1.0, 0.12, 1.5], [-1.65, 0.46, 1.45]);
  box(scene, g, pal.rug, [1.4, 0.02, 1.0], [0.2, 0.01, 0.5]);
  box(scene, g, pal.shelf, [0.5, 1.8, 0.35], [1.9, 0.9, -1.2]);
  for (const y of [0.5, 0.95, 1.4]) {
    box(scene, g, 0x9b20b7, [0.12, 0.2, 0.12], [1.9, y + 0.1, -1.2]);
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

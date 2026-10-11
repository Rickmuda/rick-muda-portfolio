import * as THREE from "three";

/**
 * Temporary Gamemuda model in a low-poly style, built entirely in code:
 * chamfered edges instead of round ones, few segments, flat-shaded facets
 * and a flat colour palette.
 *
 * It uses exactly the object names your Blender model must use, so a .glb
 * export can replace it 1-to-1:
 *
 *   screen                       plane with UVs 0..1 (emulator output)
 *   btn_a, btn_b                 round buttons
 *   btn_start, btn_select        small pill buttons
 *   dpad                         visible d-pad (tilts when pressed)
 *   dpad_up/down/left/right      hitboxes on top of the d-pad (made invisible in code)
 *   volume_wheel                 thumb wheel on the right side, rotates around its local Z;
 *                                its first rib (pointing +X) is the volume marker
 *   power_switch                 slider on the top edge, moves along +X when switched on
 *   power_led                    LED next to the screen, lit while the power is on
 *
 * Convention: the front faces +Z, buttons move towards -Z when pressed.
 */

const PALETTE = {
  shell: 0x2c6e72,
  shellDark: 0x235a5e,
  bezel: 0x22252b,
  dark: 0x2a2e36,
  accent: 0xf25f3a,
  rubber: 0x7d8794,
  led: 0xff4d3d,
};

// Same font as the rest of rickmuda.nl (declared in src/assets/main.css).
// Gamemuda.vue waits for it to load before building the model.
export const LABEL_FONT = '"PortfolioFont", system-ui, sans-serif';

// Flat shading is what gives the faceted low-poly look
const flat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra });

export function buildPlaceholder() {
  const root = new THREE.Group();
  root.name = "gamemuda";

  const W = 0.9, H = 1.5, D = 0.16;
  const BEVEL = 0.02;

  const shell = flat(PALETTE.shell);
  const shellDark = flat(PALETTE.shellDark);
  const bezelMat = flat(PALETTE.bezel);
  const dark = flat(PALETTE.dark);
  const accent = flat(PALETTE.accent);
  const rubber = flat(PALETTE.rubber);

  // ---------------------------------------------------------------- body
  // Chamfered outline; the bottom-right corner is a big 2-step chamfer as the
  // Gamemuda's signature detail. A single bevel segment = one sharp facet.
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(chamferRect(W, H, 0.07, 0.28), {
      depth: D, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 1,
    }),
    shell,
  );
  body.name = "body";
  body.position.z = -D / 2;
  root.add(body);

  const front = D / 2 + BEVEL; // z of the front face
  const back = -front;

  // Cartridge slot on top and a battery cover on the back
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.1), dark);
  slot.position.set(0.06, H / 2 + BEVEL - 0.005, 0);
  root.add(slot);

  const cover = new THREE.Mesh(
    new THREE.ExtrudeGeometry(chamferRect(0.56, 0.42, 0.04, 0.04), {
      depth: 0.008, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1,
    }),
    shellDark,
  );
  cover.rotation.y = Math.PI; // face the back
  cover.position.set(0, -0.32, back);
  root.add(cover);

  // ---------------------------------------------------------- screen area
  const bezel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(chamferRect(0.74, 0.66, 0.05, 0.05), {
      depth: 0.006, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1,
    }),
    bezelMat,
  );
  bezel.position.set(0, 0.34, front);
  root.add(bezel);

  // Screen: 160x144 -> 10:9 aspect ratio
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.468), new THREE.MeshBasicMaterial({ color: 0x9bbc0f }));
  screen.name = "screen";
  screen.position.set(0, 0.36, front + 0.0105);
  root.add(screen);

  // Power LED: a tiny gem left of the screen
  const led = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.014, 0),
    flat(PALETTE.led, { emissive: PALETTE.led, emissiveIntensity: 0.6 }),
  );
  led.name = "power_led";
  led.position.set(-0.315, 0.42, front + 0.014);
  root.add(led);

  // ----------------------------------------------------------- power switch
  // Slider on the top edge, left of the cartridge slot (like the original).
  // Off = left, on = right; Gamemuda.vue slides it along X.
  const topY = H / 2 + BEVEL;
  const track = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.05), bezelMat);
  track.position.set(-0.29, topY - 0.004, 0);
  root.add(track);
  const power = new THREE.Group();
  power.name = "power_switch";
  const knob = new THREE.Mesh(
    new THREE.ExtrudeGeometry(chamferRect(0.05, 0.045, 0.01, 0.01), {
      depth: 0.03, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1,
    }),
    rubber,
  );
  knob.rotation.x = -Math.PI / 2; // lie flat on the top edge, extruding upwards
  power.add(knob);
  for (const gx of [-0.012, 0, 0.012]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.04), bezelMat);
    groove.position.set(gx, 0.033, 0);
    power.add(groove);
  }
  power.position.set(-0.315, topY - 0.002, 0); // off position; on = +0.05 on X
  root.add(power);

  // Small "OFF  ON" print on the front, above the screen
  const pwrLabel = textPlane("OFF  ON", 0.12, 0.026, "#9aa3ad");
  pwrLabel.position.set(-0.29, 0.715, front + 0.001);
  root.add(pwrLabel);

  // Logo below the screen
  const logo = textPlane("GAMEMUDA", 0.42, 0.06, "#e8e6e1");
  logo.position.set(0, -0.06, front + 0.001);
  root.add(logo);

  // ------------------------------------------------------------------ d-pad
  const dpad = new THREE.Group();
  dpad.name = "dpad";
  const cross = new THREE.ExtrudeGeometry(crossShape(0.22, 0.072), {
    depth: 0.026, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 1,
  });
  cross.translate(0, 0, 0.007); // sit on the front face
  dpad.add(new THREE.Mesh(cross, dark));
  // Low-poly dimple in the middle
  const dimple = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.006, 6), shellDark);
  dimple.rotation.x = Math.PI / 2;
  dimple.position.z = 0.041;
  dpad.add(dimple);
  dpad.position.set(-0.22, -0.32, front);
  root.add(dpad);

  // D-pad hitboxes (invisible but hittable)
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const off = 0.075, hs = 0.085;
  for (const [name, x, y] of [["dpad_up", 0, off], ["dpad_down", 0, -off], ["dpad_left", -off, 0], ["dpad_right", off, 0]]) {
    const hit = new THREE.Mesh(new THREE.BoxGeometry(hs, hs, 0.06), hitMat);
    hit.name = name;
    hit.position.set(dpad.position.x + x, dpad.position.y + y, front + 0.03);
    root.add(hit);
  }

  // ----------------------------------------------------------------- A / B
  // Octagonal buttons with a faceted top, made with a lathe of 8 segments.
  const abGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0001, 0),
      new THREE.Vector2(0.058, 0),
      new THREE.Vector2(0.058, 0.022),
      new THREE.Vector2(0.044, 0.036),
      new THREE.Vector2(0.0001, 0.04),
    ],
    8,
  );
  abGeo.rotateX(Math.PI / 2); // lathe axis Y -> Z (towards the viewer)
  abGeo.rotateZ(Math.PI / 8); // flat edge on top
  const btnB = new THREE.Mesh(abGeo, accent);
  btnB.name = "btn_b";
  btnB.position.set(0.15, -0.36, front);
  const btnA = new THREE.Mesh(abGeo, accent);
  btnA.name = "btn_a";
  btnA.position.set(0.31, -0.28, front);
  root.add(btnA, btnB);

  const la = textPlane("A", 0.05, 0.05, "#9aa3ad");
  la.position.set(0.31, -0.37, front + 0.001);
  const lb = textPlane("B", 0.05, 0.05, "#9aa3ad");
  lb.position.set(0.15, -0.45, front + 0.001);
  root.add(la, lb);

  // ------------------------------------------------------- Start / Select
  // Hexagonal pills
  const pillGeo = new THREE.CapsuleGeometry(0.018, 0.07, 1, 6);
  pillGeo.rotateZ(Math.PI / 2 - 0.45);
  for (const [name, x, label] of [["btn_select", -0.09, "SELECT"], ["btn_start", 0.09, "START"]]) {
    const pill = new THREE.Mesh(pillGeo, rubber);
    pill.name = name;
    pill.position.set(x, -0.58, front + 0.01);
    root.add(pill);
    const t = textPlane(label, 0.12, 0.03, "#9aa3ad");
    t.position.set(x, -0.64, front + 0.001);
    root.add(t);
  }

  // ----------------------------------------------------------- volume wheel
  // A 12-sided ribbed wheel sticking out of the right side. Its axis is Z
  // (same as the front normal), so it rolls when you drag it.
  const wheel = new THREE.Group();
  wheel.name = "volume_wheel";
  const wheelR = 0.085, wheelT = 0.05, sides = 12;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelT, sides), dark);
  disc.rotation.x = Math.PI / 2;
  wheel.add(disc);
  const ribGeo = new THREE.BoxGeometry(0.016, 0.02, wheelT * 0.9);
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const rib = new THREE.Mesh(ribGeo, i === 0 ? accent : dark); // orange rib shows rotation
    rib.position.set(Math.cos(a) * wheelR, Math.sin(a) * wheelR, 0);
    rib.rotation.z = a;
    wheel.add(rib);
  }
  wheel.position.set(W / 2 + BEVEL - wheelR + 0.045, 0.18, 0);
  root.add(wheel);

  // Labels on the right side, facing +X: louder up, softer down
  const side = W / 2 + BEVEL + 0.001;
  for (const [txt, y, w, h] of [["+", 0.18 + wheelR + 0.035, 0.04, 0.04], ["-", 0.18 - wheelR - 0.03, 0.04, 0.04], ["VOL", 0.18 - wheelR - 0.075, 0.1, 0.035]]) {
    const t = textPlane(txt, w, h, "#9aa3ad");
    t.rotation.y = Math.PI / 2;
    t.position.set(side, y, 0);
    root.add(t);
  }

  // --------------------------------------------------------- speaker grille
  // Six slanted slits, laid out to stay well inside the chamfered corner
  const slitGeo = new THREE.BoxGeometry(0.014, 0.085, 0.006);
  for (let i = 0; i < 6; i++) {
    const slit = new THREE.Mesh(slitGeo, bezelMat);
    slit.rotation.z = -0.45;
    slit.position.set(0.19 + i * 0.032, -0.53 - i * 0.014, front);
    root.add(slit);
  }

  return root;
}

/** Rectangle with straight 45° chamfers; bottom-right gets a 2-step chamfer. */
function chamferRect(w, h, c, cBottomRight) {
  const s = new THREE.Shape();
  const x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
  const r = cBottomRight;
  const k = r * (1 - Math.SQRT1_2); // middle point of a 2-segment quarter circle
  s.moveTo(x0 + c, y0);
  s.lineTo(x1 - r, y0);
  if (r > c) s.lineTo(x1 - k, y0 + k);
  s.lineTo(x1, y0 + r);
  s.lineTo(x1, y1 - c);
  s.lineTo(x1 - c, y1);
  s.lineTo(x0 + c, y1);
  s.lineTo(x0, y1 - c);
  s.lineTo(x0, y0 + c);
  s.lineTo(x0 + c, y0);
  return s;
}

/** Plus-shaped outline for the d-pad. */
function crossShape(len, width) {
  const a = len / 2, b = width / 2;
  const s = new THREE.Shape();
  s.moveTo(-b, a);
  s.lineTo(b, a);
  s.lineTo(b, b);
  s.lineTo(a, b);
  s.lineTo(a, -b);
  s.lineTo(b, -b);
  s.lineTo(b, -a);
  s.lineTo(-b, -a);
  s.lineTo(-b, -b);
  s.lineTo(-a, -b);
  s.lineTo(-a, b);
  s.lineTo(-b, b);
  s.lineTo(-b, a);
  return s;
}

function textPlane(text, w, h, color) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const g = c.getContext("2d");
  g.fillStyle = color;
  g.font = `${Math.round(c.height * 0.8)}px ${LABEL_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

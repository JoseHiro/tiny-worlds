// The desk and what is on it (room/DESIGN.md §4.1): a standing desk with an oak top, two monitors on an arm, a light
// bar, a 65% keyboard on a felt mat, a laptop on a stand, a mug, a rubber duck, a pothos, headphones on
// a hook, two little speakers, notes; the office chair with a hoodie on its back, the PC under the desk with its fans.
// Chibi scale (1 m ≈ 0.76); the small things are made about 1.2× so they read. Parts face the user sitting at +Z.
import * as THREE from 'three';
import { mat, mesh, rbox, box, cyl } from '../../airport/src/parts.js';

export const DESK = { w: 1.06, d: 0.53, h: 0.55, top: 0.022 };
export const COL = { oak: 0xc49a6c, black: 0x1e1f23, iron: 0x2b2d33, felt: 0x3a3e46, alu: 0xb9bcc2, cream: 0xddd1b6, orange: 0xe8673c, mint: 0x9fd6c2, grey: 0x8d9099, leaf: 0x5f8f4a, leaf2: 0x7fae5a };
const M = (c, o) => mat(c, o);
const glow = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

// a canvas texture made once
const tex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
const OAK = tex(512, 256, (x, w, h) => {
  x.fillStyle = '#c49a6c'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { const y = Math.random() * h; x.strokeStyle = `rgba(${Math.random() < 0.5 ? '120,80,45' : '220,180,130'},${0.08 + Math.random() * 0.12})`; x.lineWidth = 0.5 + Math.random() * 2; x.beginPath(); x.moveTo(0, y); for (let k = 0; k <= 16; k++) x.lineTo(k * w / 16, y + Math.sin(k * 0.7 + i) * 3 + (Math.random() - 0.5) * 2); x.stroke(); }
  for (let i = 0; i < 3; i++) { const cx = Math.random() * w, cy = Math.random() * h; x.strokeStyle = 'rgba(110,70,40,0.25)'; for (let r = 3; r < 16; r += 3) { x.beginPath(); x.ellipse(cx, cy, r * 2.4, r * 0.6, 0, 0, 7); x.stroke(); } }
});
const FELT = tex(256, 256, (x, w, h) => { x.fillStyle = '#3a3e46'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)'; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } x.strokeStyle = 'rgba(20,22,26,0.8)'; x.setLineDash([5, 4]); x.lineWidth = 2; x.strokeRect(5, 5, w - 10, h - 10); });

// ---------- the desk: oak top, black T legs, the cable tray under it ----------
export function desk() {
  const g = new THREE.Group(), { w, d, h, top } = DESK, iron = M(COL.black, { roughness: 0.45, metalness: 0.5 });
  g.add(mesh(new THREE.BoxGeometry(w, top, d), new THREE.MeshStandardMaterial({ map: OAK, roughness: 0.55 }), 0, h - top / 2, 0));
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.08);
    g.add(box(0.05, h - top - 0.03, 0.035, iron, x, (h - top) / 2 + 0.01, 0)); // the column
    g.add(box(0.06, 0.02, d * 0.92, iron, x, 0.01, 0)); // the foot
    g.add(box(0.05, 0.02, d * 0.8, iron, x, h - top - 0.02, 0)); // the arm under the top
    g.add(box(0.04, 0.012, 0.03, M(0x111111), x, 0.004, d * 0.44)); g.add(box(0.04, 0.012, 0.03, M(0x111111), x, 0.004, -d * 0.44));
  }
  g.add(box(w - 0.2, 0.03, 0.04, iron, 0, h - top - 0.035, 0)); // the beam
  g.add(box(0.07, 0.025, 0.04, M(0x1a1a1a), w / 2 - 0.16, h - top - 0.025, d / 2 - 0.04)); // the up/down buttons
  g.add(box(0.03, 0.006, 0.002, glow(0x5ad1ff, 1.4), w / 2 - 0.16, h - top - 0.024, d / 2 - 0.019));
  // the cable tray, cables sagging out of it
  const tray = M(0x26282d, { roughness: 0.6, metalness: 0.4 });
  g.add(box(w * 0.6, 0.005, 0.07, tray, 0, h - top - 0.08, -d / 2 + 0.08)); g.add(box(w * 0.6, 0.04, 0.005, tray, 0, h - top - 0.06, -d / 2 + 0.045)); g.add(box(w * 0.6, 0.04, 0.005, tray, 0, h - top - 0.06, -d / 2 + 0.115));
  const cable = M(0x141414, { roughness: 0.7 });
  for (const [x0, x1, sag] of [[-0.2, -0.05, 0.06], [0.05, 0.3, 0.09], [0.25, 0.4, 0.14]]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, h - top - 0.07, -d / 2 + 0.08), new THREE.Vector3((x0 + x1) / 2, h - top - 0.07 - sag, -d / 2 + 0.06), new THREE.Vector3(x1, h - top - 0.02, -d / 2 + 0.04)]);
    g.add(mesh(new THREE.TubeGeometry(c, 12, 0.004, 5), cable));
  }
  g.userData.top = h;
  return g;
}

export function deskMat(w = 0.72, d = 0.3) {
  const m = mesh(new THREE.BoxGeometry(w, 0.004, d), new THREE.MeshStandardMaterial({ map: FELT, roughness: 1 }), 0, 0.002, 0);
  m.castShadow = false; return m;
}

// ---------- a monitor: thin bezel, a stand plate on the back; the screen is a plane from Screens ----------
export function monitor(screens, region, w, h) {
  const g = new THREE.Group(), body = M(COL.black, { roughness: 0.5 });
  g.add(rbox(w + 0.012, h + 0.012, 0.012, 0.004, body, 0, 0, 0));
  g.add(rbox(w * 0.6, h * 0.6, 0.02, 0.008, body, 0, 0, -0.012)); // the bulge at the back
  g.add(box(0.06, 0.06, 0.008, M(COL.iron, { metalness: 0.6, roughness: 0.4 }), 0, 0, -0.025)); // the VESA plate
  const s = screens.plane(region, w, h);
  s.position.z = 0.0062; g.add(s);
  g.add(box(0.012, 0.0025, 0.001, glow(0xffffff, 0.6), w / 2 - 0.02, -h / 2 - 0.003, 0.0065)); // the power light
  g.userData.screen = s;
  return g;
}

// ---------- the monitor arm: a clamp at the back edge, a pole, two arms reaching to each monitor ----------
export function monitorArm(reach) { // reach: [[x, y, z], …] the back of each monitor, in desk-top coordinates
  const g = new THREE.Group(), al = M(0x2a2c31, { roughness: 0.35, metalness: 0.7 });
  g.add(box(0.05, 0.03, 0.06, al, 0, 0.015, 0)); // the clamp
  g.add(box(0.05, 0.05, 0.01, al, 0, -0.02, 0.03));
  const top = Math.max(...reach.map((r) => r[1]));
  g.add(cyl(0.012, 0.012, top + 0.02, al, 0, (top + 0.02) / 2, 0, 14));
  for (const [x, y, z] of reach) {
    const a = new THREE.Vector3(0, y, 0), b = new THREE.Vector3(x, y, z), mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0, 0.06));
    for (const [p, q] of [[a, mid], [mid, b]]) {
      const len = p.distanceTo(q), arm = box(0.022, 0.02, len, al, 0, 0, 0);
      arm.position.copy(p).lerp(q, 0.5); arm.lookAt(q); g.add(arm);
    }
    g.add(cyl(0.014, 0.014, 0.03, al, mid.x, mid.y, mid.z, 12));
  }
  return g;
}

// ---------- the light bar on top of the main monitor (its light is added by the scene) ----------
export function lightBar(w = 0.36) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, w, 14).rotateZ(Math.PI / 2), M(0x1c1d21, { roughness: 0.35, metalness: 0.6 }), 0, 0, 0.012));
  g.add(box(w - 0.02, 0.002, 0.008, glow(0xffd8a8, 2.2), 0, -0.009, 0.014)); // the glowing strip underneath
  g.add(box(0.03, 0.02, 0.03, M(0x1c1d21), 0, -0.012, -0.004)); // the clip over the monitor
  return g;
}

// ---------- the keyboard: a 65% board, every key its own instance (they go down when typed) ----------
const ROWS = [ // [width in keys, colour]
  [[1, 'o'], ...Array(12).fill([1, 'c']), [2, 'g'], [1, 'g']],
  [[1.5, 'g'], ...Array(12).fill([1, 'c']), [1.5, 'g'], [1, 'g']],
  [[1.75, 'g'], ...Array(11).fill([1, 'c']), [2.25, 'o'], [1, 'g']],
  [[2.25, 'g'], ...Array(10).fill([1, 'c']), [1.75, 'g'], [1, 'm'], [1, 'g']],
  [[1.25, 'g'], [1.25, 'g'], [1.25, 'g'], [6.25, 'm'], [1, 'g'], [1, 'g'], [1, 'm'], [1, 'm'], [1, 'm']],
];
export function keyboard() {
  const g = new THREE.Group(), u = 0.0175, rows = ROWS.length, cols = 16;
  const W = cols * u + 0.012, D = rows * u + 0.012;
  const caseMat = M(0x2f3a4a, { roughness: 0.35, metalness: 0.5 });
  const kb = rbox(W, 0.016, D, 0.004, caseMat, 0, 0.008, 0); g.add(kb);
  g.add(box(W - 0.008, 0.002, D - 0.008, M(0x111316), 0, 0.0165, 0)); // the plate between the keys
  // the key cap: a box narrowed at the top
  const cap = new THREE.BoxGeometry(1, 1, 1); const p = cap.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.78); p.setZ(i, p.getZ(i) * 0.78 - 0.04); }
  cap.computeVertexNormals(); cap.translate(0, 0.5, 0);
  const keys = [];
  ROWS.forEach((row, r) => { let x = -cols * u / 2; for (const [kw, c] of row) { keys.push({ x: x + kw * u / 2, z: -rows * u / 2 + (r + 0.5) * u, w: kw * u - 0.0025, c, r }); x += kw * u; } });
  const im = new THREE.InstancedMesh(cap, M(0xffffff, { roughness: 0.55 }), keys.length);
  const COLS = { c: COL.cream, g: COL.grey, o: COL.orange, m: COL.mint }, color = new THREE.Color(), o = new THREE.Object3D();
  keys.forEach((k, i) => { im.setColorAt(i, color.set(COLS[k.c])); });
  im.castShadow = true; im.receiveShadow = true; g.add(im);
  const down = new Float32Array(keys.length);
  const place = () => { keys.forEach((k, i) => { o.position.set(k.x, 0.016 - down[i] * 0.004, k.z); o.rotation.x = (k.r - 2) * 0.05; o.scale.set(k.w, 0.011, u - 0.0025); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.instanceMatrix.needsUpdate = true; };
  place();
  // the coiled cable out of the back
  const pts = []; for (let i = 0; i <= 120; i++) { const t = i / 120, a = t * Math.PI * 2 * 9; pts.push(new THREE.Vector3(-0.08 + t * 0.1 + Math.cos(a) * 0.006 * (t > 0.2 && t < 0.6 ? 1 : 0), 0.004 + Math.sin(a) * 0.006 * (t > 0.2 && t < 0.6 ? 1 : 0), -D / 2 - 0.01 - t * 0.12)); }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.0022, 5), M(COL.orange, { roughness: 0.5 })));
  g.userData.dynamic = true;
  // press a key for the character typed (any key of the right kind, roughly where it is)
  g.userData.press = (ch) => {
    let i;
    if (ch === ' ') i = keys.findIndex((k) => k.w > 0.08);
    else if (ch === '\n') i = keys.findIndex((k) => k.r === 2 && k.c === 'o');
    else { const pick = keys.filter((k) => k.c === 'c'); i = keys.indexOf(pick[(ch.charCodeAt(0) * 7) % pick.length]); }
    if (i >= 0) down[i] = 1;
  };
  g.userData.update = (dt) => { let any = false; for (let i = 0; i < down.length; i++) if (down[i] > 0) { down[i] = Math.max(0, down[i] - dt * 9); any = true; } if (any) place(); };
  return g;
}

export function mouse() {
  const g = new THREE.Group();
  const m = mesh(new THREE.SphereGeometry(0.022, 16, 10), M(0x2a2b30, { roughness: 0.4 }), 0, 0, 0); m.scale.set(0.75, 0.45, 1.1); m.position.y = 0.006; g.add(m);
  g.add(box(0.002, 0.002, 0.01, M(0x555555), 0, 0.016, -0.01));
  return g;
}

// ---------- the laptop, open on an aluminium stand; stickers on the lid ----------
export function laptopOnStand(screens) {
  const g = new THREE.Group(), al = M(0x5d6066, { roughness: 0.5, metalness: 0.5 }), // (space grey: silver under the lamp read as a white slab)
    w = 0.25, d = 0.17;
  // the stand: two angled plates
  const stand = new THREE.Group(); stand.position.y = 0; g.add(stand);
  for (const s of [-1, 1]) { const leg = box(0.012, 0.09, 0.14, al, s * w * 0.35, 0.045, 0); leg.rotation.x = 0.35; stand.add(leg); }
  const base = new THREE.Group(); base.position.set(0, 0.08, 0.01); base.rotation.x = 0.3; g.add(base);
  base.add(rbox(w, 0.008, d, 0.004, al, 0, 0, 0));
  base.add(box(w * 0.86, 0.001, d * 0.5, M(0x18191c), 0, 0.0045, -0.02)); // the keys
  const lid = new THREE.Group(); lid.position.set(0, 0.004, -d / 2); lid.rotation.x = 1.35; base.add(lid);
  lid.add(rbox(w, 0.006, d, 0.004, al, 0, 0.003, -d / 2));
  const s = screens.plane('laptop', w * 0.92, d * 0.86); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.0065, -d / 2); lid.add(s);
  // stickers on the back of the lid
  const ST = [[0xe8673c, 0.03, -0.05, 0.022], [0x82aaff, -0.06, -0.09, 0.018], [0xffcb6b, 0.07, -0.12, 0.015], [0x9fd6c2, -0.04, -0.03, 0.02], [0xffffff, 0.0, -0.11, 0.016]];
  for (const [c, x, z, r] of ST) lid.add(mesh(new THREE.CircleGeometry(r, 18).rotateX(Math.PI / 2), M(c, { roughness: 0.6 }), x, -0.0005, z));
  return g;
}

// ---------- the mug of coffee on a cork coaster (steam rises from userData.steamAt) ----------
export function mug(color = 0x2f3e57) {
  const g = new THREE.Group(), r = 0.026, h = 0.06;
  g.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.005, 24), M(0xb08a5a, { roughness: 1 }), 0, 0.0025, 0)); // the coaster
  const body = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(r * 0.92, 0), new THREE.Vector2(r, 0.006), new THREE.Vector2(r, h), new THREE.Vector2(r * 0.88, h), new THREE.Vector2(r * 0.88, 0.008)], 28);
  g.add(mesh(body, M(color, { roughness: 0.3 }), 0, 0.005, 0));
  g.add(mesh(new THREE.CircleGeometry(r * 0.88, 24).rotateX(-Math.PI / 2), M(0x3a2214, { roughness: 0.15 }), 0, 0.005 + h * 0.8, 0)); // the coffee
  g.add(mesh(new THREE.TorusGeometry(0.016, 0.0045, 8, 16, Math.PI * 1.3).rotateZ(-Math.PI * 0.65), M(color, { roughness: 0.3 }), r + 0.004, 0.005 + h * 0.5, 0));
  g.userData.steamAt = [0, 0.005 + h + 0.01, 0];
  return g;
}

export function rubberDuck() {
  const g = new THREE.Group(), y = M(0xffd23c, { roughness: 0.35 });
  const b = mesh(new THREE.SphereGeometry(0.022, 16, 12), y, 0, 0.018, 0); b.scale.set(1.1, 0.8, 1.3); g.add(b);
  g.add(mesh(new THREE.SphereGeometry(0.014, 14, 10), y, 0, 0.044, 0.012));
  const beak = mesh(new THREE.SphereGeometry(0.007, 10, 8), M(0xf28c28), 0, 0.042, 0.026); beak.scale.set(1.3, 0.5, 1); g.add(beak);
  for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.0025, 8, 6), M(0x111111), s * 0.007, 0.048, 0.024));
  const tail = mesh(new THREE.ConeGeometry(0.008, 0.016, 10), y, 0, 0.03, -0.028); tail.rotation.x = -1.0; g.add(tail);
  return g;
}

// a pothos in a small pot: leaves along a few vines, some hanging over the edge of the desk
export function pothos({ vines = 5, hang = 0.22 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.06, 18), M(0xe8e1d4, { roughness: 0.8 }), 0, 0.03, 0)); // the pot
  g.add(mesh(new THREE.CircleGeometry(0.037, 16).rotateX(-Math.PI / 2), M(0x3a2a1c, { roughness: 1 }), 0, 0.055, 0));
  const leafGeo = new THREE.SphereGeometry(0.014, 8, 6); leafGeo.scale(1, 0.18, 1.35); leafGeo.translate(0, 0, 0.012);
  const ls = [M(COL.leaf, { roughness: 0.6 }), M(COL.leaf2, { roughness: 0.6 }), M(0xa3c46a, { roughness: 0.6 })];
  for (let v = 0; v < vines; v++) {
    const a = (v / vines) * Math.PI * 2 + 0.4, droop = v % 2 ? hang : 0.06 + v * 0.02;
    for (let k = 0; k < 9; k++) {
      const t = k / 8, out = 0.02 + t * 0.09, y = 0.07 + Math.sin(t * Math.PI) * 0.04 - t * t * droop;
      const leaf = mesh(leafGeo, ls[(v + k) % 3], Math.cos(a) * out, y, Math.sin(a) * out);
      leaf.rotation.set(0.5 + t * 0.6, -a + Math.PI / 2 + (k % 2 ? 0.5 : -0.5), 0); leaf.scale.setScalar(0.7 + (1 - t) * 0.5);
      g.add(leaf);
    }
  }
  return g;
}

// headphones hanging on a little stand
export function headphones() {
  const g = new THREE.Group(), al = M(0x2a2c31, { roughness: 0.35, metalness: 0.7 });
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.008, 20), al, 0, 0.004, 0));
  g.add(cyl(0.006, 0.006, 0.22, al, 0, 0.11, 0, 10));
  g.add(box(0.05, 0.012, 0.03, al, 0, 0.22, 0));
  const band = mesh(new THREE.TorusGeometry(0.05, 0.006, 8, 24, Math.PI), M(0x222327, { roughness: 0.7 }), 0, 0.17, 0); g.add(band);
  for (const s of [-1, 1]) { const cup = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 20).rotateZ(Math.PI / 2), M(0x34363c, { roughness: 0.6 }), s * 0.05, 0.16, 0); g.add(cup); g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.003, 16).rotateZ(Math.PI / 2), M(COL.orange), s * 0.061, 0.16, 0)); }
  return g;
}

export function speaker() {
  const g = new THREE.Group();
  g.add(rbox(0.07, 0.11, 0.08, 0.006, M(0xe9e4da, { roughness: 0.6 }), 0, 0.055, 0));
  g.add(mesh(new THREE.CircleGeometry(0.025, 20), M(0x2a2a2a, { roughness: 0.8 }), 0, 0.045, 0.041));
  g.add(mesh(new THREE.CircleGeometry(0.01, 16), M(0x2a2a2a, { roughness: 0.5 }), 0, 0.088, 0.041));
  g.add(mesh(new THREE.TorusGeometry(0.025, 0.0018, 6, 20), M(0x9a8f80), 0, 0.045, 0.0412));
  return g;
}

// a sticky note (stuck to a bezel, or lying on the desk)
export function note(color = 0xffe066, lines = 3) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#' + new THREE.Color(color).getHexString(); x.fillRect(0, 0, 64, 64); x.strokeStyle = 'rgba(40,40,60,0.75)'; x.lineWidth = 2.5;
  for (let i = 0; i < lines; i++) { x.beginPath(); x.moveTo(8, 16 + i * 14); for (let k = 1; k <= 8; k++) x.lineTo(8 + k * (34 + Math.random() * 14) / 8, 16 + i * 14 + Math.sin(k * 2.1 + i) * 2); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.045), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide }));
  return m;
}

export function notebookAndPen() {
  const g = new THREE.Group();
  g.add(rbox(0.1, 0.012, 0.14, 0.003, M(0x2c2c30, { roughness: 0.8 }), 0, 0.006, 0));
  g.add(box(0.096, 0.001, 0.136, M(0xf3eee2, { roughness: 1 }), 0.002, 0.0125, 0));
  g.add(box(0.004, 0.012, 0.14, M(0xc9714a), 0.03, 0.006, 0)); // the band
  const pen = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.11, 8).rotateZ(Math.PI / 2), M(0x1d3557, { roughness: 0.3, metalness: 0.3 }), 0.01, 0.017, 0.02); pen.rotation.y = 0.5; g.add(pen);
  return g;
}

export function phoneStand() {
  const g = new THREE.Group(), al = M(COL.alu, { roughness: 0.3, metalness: 0.8 });
  g.add(box(0.05, 0.004, 0.05, al, 0, 0.002, 0));
  const back = box(0.04, 0.07, 0.004, al, 0, 0.035, -0.012); back.rotation.x = -0.3; g.add(back);
  const ph = new THREE.Group(); ph.position.set(0, 0.05, -0.0); ph.rotation.x = -0.3; g.add(ph);
  ph.add(rbox(0.04, 0.085, 0.006, 0.004, M(0x1c1c1e), 0, 0, 0.002));
  ph.add(mesh(new THREE.PlaneGeometry(0.035, 0.075), glow(0x2a3a5a, 1), 0, 0, 0.0055));
  ph.add(box(0.018, 0.004, 0.001, glow(0xffffff, 0.5), 0, 0.025, 0.006)); // the time on the lock screen
  return g;
}

// ---------- the office chair: five legs on castors, a mesh back, a hoodie over it ----------
export function officeChair({ hoodie = 0xd9a441 } = {}) {
  const g = new THREE.Group(), black = M(0x2a2c31, { roughness: 0.5 }), al = M(0x6b6e75, { roughness: 0.3, metalness: 0.8 });
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2, leg = box(0.03, 0.02, 0.22, black, Math.sin(a) * 0.11, 0.04, Math.cos(a) * 0.11); leg.rotation.y = a; g.add(leg);
    g.add(mesh(new THREE.SphereGeometry(0.018, 10, 8), black, Math.sin(a) * 0.22, 0.018, Math.cos(a) * 0.22));
  }
  g.add(cyl(0.025, 0.03, 0.06, black, 0, 0.07, 0)); g.add(cyl(0.014, 0.014, 0.18, al, 0, 0.18, 0, 12));
  const seat = rbox(0.36, 0.06, 0.34, 0.025, M(0x41444c, { roughness: 0.9 }), 0, 0.33, 0); g.add(seat);
  // the back: a frame with a dark mesh in it
  const frame = new THREE.Group(); frame.position.set(0, 0.36, -0.17); frame.rotation.x = -0.12; g.add(frame);
  frame.add(box(0.04, 0.42, 0.03, black, 0, 0.1, -0.02));
  const curve = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.quadraticCurveTo(w / 2 + 0.02, h * 0.6, w / 2 - 0.02, h); s.quadraticCurveTo(0, h + 0.04, -w / 2 + 0.02, h); s.quadraticCurveTo(-w / 2 - 0.02, h * 0.6, -w / 2, 0); return s; };
  const back = new THREE.ExtrudeGeometry(curve(0.34, 0.46), { depth: 0.015, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.006, bevelSegments: 2 });
  frame.add(mesh(back, M(0x474b55, { roughness: 0.95 }), 0, 0.08, -0.01)); // (a mid grey mesh, so it reads against the dark room)
  frame.add(mesh(new THREE.BoxGeometry(0.28, 0.05, 0.03), M(0x26282d, { roughness: 0.9 }), 0, 0.15, 0.015)); // the lumbar pad
  for (const s of [-1, 1]) { g.add(box(0.025, 0.14, 0.025, black, s * 0.2, 0.42, -0.02)); g.add(rbox(0.05, 0.02, 0.2, 0.008, black, s * 0.2, 0.5, 0.0)); }
  // the hoodie hung over the top of the back: down the back, a hood, a sleeve hanging
  if (hoodie) {
    const cloth = M(hoodie, { roughness: 1 });
    const h1 = rbox(0.3, 0.2, 0.045, 0.02, cloth, 0, 0.42, -0.04); frame.add(h1);
    const h2 = rbox(0.3, 0.08, 0.06, 0.03, cloth, 0, 0.53, -0.01); frame.add(h2);
    const hood = mesh(new THREE.SphereGeometry(0.075, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), cloth, 0, 0.5, -0.07); hood.rotation.x = Math.PI * 0.6; hood.scale.set(1, 0.6, 1); frame.add(hood);
    const sleeve = cyl(0.025, 0.028, 0.3, cloth, 0.15, 0.36, -0.06, 10); sleeve.rotation.z = 0.15; frame.add(sleeve);
  }
  return g;
}

// ---------- the PC under the desk: a black case, glass side, three fans glowing and turning ----------
export function pcTower() {
  const g = new THREE.Group(), w = 0.16, h = 0.36, d = 0.34, black = M(0x15161a, { roughness: 0.45, metalness: 0.4 });
  g.add(box(w, 0.012, d, black, 0, h - 0.006, 0)); g.add(box(w, 0.012, d, black, 0, 0.026, 0)); g.add(box(0.008, h - 0.02, d, black, -w / 2 + 0.004, h / 2 + 0.01, 0));
  g.add(box(w, h - 0.02, 0.01, black, 0, h / 2 + 0.01, -d / 2 + 0.005)); const fr = M(0x1c1d21, { roughness: 0.5 }); // the front: a frame, the fans showing through the mesh
  for (const s of [-1, 1]) g.add(box(0.016, h - 0.02, 0.012, fr, s * (w / 2 - 0.008), h / 2 + 0.01, d / 2 - 0.006));
  g.add(box(w, 0.03, 0.012, fr, 0, h - 0.025, d / 2 - 0.006));
  g.add(mesh(new THREE.PlaneGeometry(w - 0.03, h - 0.06), new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.8, transparent: true, opacity: 0.45 }), 0, h / 2 + 0.005, d / 2 - 0.001));
  for (const s of [-1, 1]) for (const z of [-1, 1]) g.add(box(0.02, 0.02, 0.03, M(0x0d0d0d), s * 0.05, 0.01, z * 0.13)); // the feet
  // inside: the board, the graphics card, a cooler
  g.add(box(0.005, h - 0.06, d - 0.06, M(0x1b2a24, { roughness: 0.6 }), -w / 2 + 0.012, h / 2 + 0.01, 0));
  g.add(box(0.05, 0.05, 0.24, M(0x2a2c31, { roughness: 0.4, metalness: 0.6 }), -0.03, 0.15, 0.01)); // the graphics card
  g.add(box(0.002, 0.004, 0.22, glow(0x8b6cff, 2.2), -0.004, 0.17, 0.01));
  g.add(cyl(0.035, 0.035, 0.04, M(0x2a2c31, { metalness: 0.6, roughness: 0.4 }), -0.03, 0.27, -0.04, 18).rotateZ(Math.PI / 2));
  // the glass side
  g.add(mesh(new THREE.PlaneGeometry(d - 0.01, h - 0.02).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22 }), w / 2, h / 2 + 0.01, 0));
  // three fans behind the front panel, their rings glowing; the blades turn (userData.update)
  const fans = [];
  const bladeGeo = new THREE.BoxGeometry(0.003, 0.04, 0.012); bladeGeo.translate(0, 0.022, 0);
  [0.1, 0.2, 0.3].forEach((y, i) => {
    const f = new THREE.Group(); f.position.set(0, y, d / 2 - 0.018); g.add(f);
    f.add(mesh(new THREE.TorusGeometry(0.045, 0.004, 8, 32), glow([0x5ad1ff, 0x8b6cff, 0xff6ca8][i], 2.4), 0, 0, 0));
    const blades = new THREE.Group(); blades.userData.dynamic = true; f.add(blades); fans.push(blades);
    for (let k = 0; k < 7; k++) { const b = new THREE.Group(); b.rotation.z = (k / 7) * Math.PI * 2; const bl = mesh(bladeGeo, M(0x2a2c31, { roughness: 0.6 })); bl.rotation.y = 0.4; b.add(bl); blades.add(b); }
  });
  g.userData.update = (dt) => { for (const b of fans) b.rotation.z += dt * 14; };
  return g;
}

// ---------- the neon on the wall: </> in a pink tube ----------
export function neonSign(color = 0xff6ca8) {
  const g = new THREE.Group(), tube = glow(color, 2.6), back = M(0x2a2c31, { roughness: 0.3, transparent: true, opacity: 0.35 });
  const S = [[[-0.14, 0.06], [-0.2, 0], [-0.14, -0.06]], [[-0.03, -0.08], [0.03, 0.08]], [[0.14, 0.06], [0.2, 0], [0.14, -0.06]]];
  for (const pts of S) {
    const path = new THREE.CurvePath(), v = pts.map(([x, y]) => new THREE.Vector3(x, y, 0.012));
    for (let i = 1; i < v.length; i++) path.add(new THREE.LineCurve3(v[i - 1], v[i]));
    g.add(mesh(new THREE.TubeGeometry(path, 16, 0.006, 8), tube));
    for (const p of v) g.add(mesh(new THREE.SphereGeometry(0.006, 8, 6), tube, p.x, p.y, p.z)); // (round corners and ends)
  }
  g.add(box(0.46, 0.22, 0.006, back, 0, 0, 0.003));
  return g;
}

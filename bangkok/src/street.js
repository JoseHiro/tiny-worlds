// Buildings and street parts (bangkok/DESIGN.md §4, B1–B10) and strings of bulbs. Facades face +Z and stand on
// z = 0 (the building runs back to −Z); the street is at +Z. A floor is 2.3 tall, the shop floor 2.6.
import * as THREE from 'three';
import { PALETTE, BK, M, mat, bx, rb, cy, sp, cn, put, pivot, group, bits, rng, addTo, BOX, CYL, SPH, CONE, stripeMat, checkMat, signPlane, liveAll } from './common.js';
import { metalTable, stool, foodShelf } from './stalls.js';

const G_H = 2.6, F_H = 2.3;
export const FACADES = [0xe9dfc8, 0xd8c8b0, 0xc9d4c8, 0xe6c8b8, 0xd0d4dc, 0xe8d890];

// ---------- vertical signs: a second atlas for stacked Chinese lettering ----------
export const VLABELS = {
  gold: ['金行', 0xd9342b, 0xe8b64a], hotel: ['旅社', 0xf4f0e8, 0xd9342b], tea: ['茶樓', 0xe8b64a, 0xa0201a],
  medicine: ['藥行', 0x2f7a4a, 0xf4f0e8], restaurant: ['大酒家', 0xd9342b, 0xf4f0e8], shark: ['魚翅', 0xf4f0e8, 0x2c5aa0],
  noodle: ['粿汁', 0xf2b84b, 0xa0201a], bank: ['銀行', 0x1c2232, 0xe8b64a],
};
const VCELL = [64, 256];
let VATLAS = null;
function vAtlas() {
  if (VATLAS) return VATLAS;
  const keys = Object.keys(VLABELS);
  const c = document.createElement('canvas'); c.width = VCELL[0] * keys.length; c.height = VCELL[1];
  const x = c.getContext('2d');
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  keys.forEach((k, i) => {
    const [text, bg, fg] = VLABELS[k], x0 = i * VCELL[0];
    x.fillStyle = hex(bg); x.fillRect(x0, 0, VCELL[0], VCELL[1]);
    x.strokeStyle = hex(fg); x.lineWidth = 3; x.strokeRect(x0 + 4, 4, VCELL[0] - 8, VCELL[1] - 8);
    x.fillStyle = hex(fg); x.textAlign = 'center'; x.textBaseline = 'middle';
    const size = text.length > 2 ? 46 : 54;
    x.font = `700 ${size}px "PingFang TC", "Hiragino Sans", "Noto Sans CJK TC", serif`;
    [...text].forEach((ch, j) => x.fillText(ch, x0 + VCELL[0] / 2, (VCELL[1] / (text.length + 1)) * (j + 1) + 4));
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  VATLAS = { mat: new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.5, side: THREE.DoubleSide }), keys };
  return VATLAS;
}
const vGeos = new Map();
// B3 — a tall board standing out from the facade (+Z), lettered on both faces, with a neon outline
export function vSign(key = 'gold', { h = 2.4, d = 0.8, neon = BK.neonPink } = {}) {
  const A = vAtlas(), i = A.keys.indexOf(key);
  const g = new THREE.Group();
  bx(g, 0.1, h, d, M.ink, 0, h / 2, d / 2 + 0.12);
  const k = `${key}|${h}|${d}`;
  if (!vGeos.has(k)) {
    const geo = new THREE.PlaneGeometry(d, h).rotateY(Math.PI / 2);
    const uv = geo.attributes.uv, n = A.keys.length;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, (i + uv.getX(j)) / n, uv.getY(j));
    vGeos.set(k, geo);
  }
  for (const s of [-1, 1]) {
    const face = put(g, vGeos.get(k), A.mat, s * 0.052, h / 2, d / 2 + 0.12);
    face.castShadow = false;
    if (s < 0) face.rotation.y = Math.PI;
    const glow = M.glow(neon, 1.6);
    for (const [w, hh, y, z] of [[0.02, h + 0.04, h / 2, 0.11], [0.02, h + 0.04, h / 2, d + 0.13], [d + 0.04, 0.02, h + 0.01, d / 2 + 0.12], [d + 0.04, 0.02, -0.01, d / 2 + 0.12]]) {
      const b = bx(g, 0.012, hh, w === 0.02 ? 0.02 : w, glow, s * 0.058, y, z);
      b.castShadow = false;
    }
  }
  for (const y of [0.15, h - 0.15]) bx(g, 0.04, 0.04, 0.14, M.darkSteel, 0, y, 0.06); // brackets into the wall
  g.userData = { kind: 'vSign' };
  return g;
}

// ---------- B1 / B2 / B7 shophouse ----------
// shop: 'goods' | 'gold' | 'pharmacy' | 'eatery' | 'mart'. Upper floors: windows (some lit at night), grilles,
// an air-conditioner, a balcony with washing and plants; on the roof a parapet and a blue water tank.
const SHOP = {
  goods: { inside: 0x8a7a68, light: 0xfff0d0, label: 'goods' },
  gold: { inside: 0xa0201a, light: 0xffd890, label: 'gold' },
  pharmacy: { inside: 0xeef2ee, light: 0xf4fbff, label: 'pharmacy' },
  eatery: { inside: 0xc9a07a, light: 0xffe0b0, label: 'eatery' },
  mart: { inside: 0xf4f6f6, light: 0xffffff, label: 'minimart' },
};
export function shophouse({ floors = 4, w = 3.0, depth = 4.0, color = FACADES[0], shop = 'goods', seed = 1, signs = [] } = {}) {
  const g = new THREE.Group();
  const rnd = rng(seed);
  const S = SHOP[shop];
  const wall = mat(color, { roughness: 0.9 }), trim = mat(0xf4f0e8, { roughness: 0.8 });
  const H = G_H + (floors - 1) * F_H + 0.5;
  // party walls, back wall, the shop's insides
  for (const s of [-1, 1]) bx(g, 0.12, H, depth, wall, s * (w / 2 - 0.06), H / 2, -depth / 2);
  bx(g, w, H, 0.12, wall, 0, H / 2, -depth + 0.06);
  bx(g, w - 0.24, 0.05, depth - 0.2, mat(0x9a948a), 0, 0.025, -depth / 2);
  bx(g, w - 0.26, G_H - 0.1, 0.05, mat(S.inside, { roughness: 0.8 }), 0, G_H / 2, -depth + 0.15);
  bx(g, w - 0.4, 0.03, 1.4, M.glow(S.light, 0.9), 0, G_H - 0.06, -1.2); // the ceiling light
  bx(g, w - 0.24, 0.1, depth - 0.2, wall, 0, G_H + 0.05, -depth / 2); // the first floor's slab
  for (const s of [-1, 1]) bx(g, 0.22, G_H, 0.3, wall, s * (w / 2 - 0.11), G_H / 2, -0.15); // piers
  shopInside(g, shop, w, rnd);
  // the rolled-up shutter and the fascia with its sign
  bx(g, w - 0.4, 0.22, 0.22, M.darkSteel, 0, G_H - 0.12, -0.12);
  bx(g, w, 0.55, 0.12, trim, 0, G_H + 0.27, 0.0);
  const fs = signPlane(S.label, w - 0.3, 0.45); fs.position.set(0, G_H + 0.27, 0.065); g.add(fs);
  if (shop === 'mart') { // stripes under the sign and a glass front
    [0xe8673c, 0x2f8a4a, 0xd9342b].forEach((c, i) => bx(g, w - 0.1, 0.05, 0.13, mat(c), 0, G_H - 0.03 - i * 0.055, 0.0));
    bx(g, w - 0.5, G_H - 0.3, 0.03, M.glass, 0, (G_H - 0.3) / 2 + 0.05, -0.05);
    for (const x of [-0.45, 0.45]) bx(g, 0.04, G_H - 0.3, 0.05, M.steel, x, (G_H - 0.3) / 2 + 0.05, -0.05);
  }
  // upper floors
  for (let f = 0; f < floors - 1; f++) {
    const y0 = G_H + 0.55 + f * F_H, fh = f === floors - 2 ? F_H - 0.55 + 0.5 : F_H;
    bx(g, w, fh, 0.16, wall, 0, y0 + fh / 2, -0.08);
    for (const sx of [-0.62, 0.62]) {
      const x = sx * (w / 3.0);
      bx(g, 0.86, 1.18, 0.05, trim, x, y0 + 1.0, 0.02);
      const lit = rnd() < 0.45;
      bx(g, 0.76, 1.06, 0.02, lit ? M.glow(0xffd8a0, 0.7) : mat(0x2a3040, { roughness: 0.2 }), x, y0 + 1.0, 0.04);
      for (let k = -2; k <= 2; k++) bx(g, 0.02, 1.08, 0.02, M.darkSteel, x + k * 0.16, y0 + 1.0, 0.07); // grille
      if (rnd() < 0.5) { // an air-conditioner on a bracket under the window
        rb(g, 0.6, 0.38, 0.3, 0.03, M.white, x, y0 + 0.25, 0.22);
        cy(g, 0.13, 0.13, 0.02, M.darkSteel, x + 0.1, y0 + 0.25, 0.37, 14).rotation.x = Math.PI / 2;
      }
    }
    if (f === 0) balcony(g, w, y0, rnd);
    for (let k = 0; k < 2; k++) bx(g, 0.05, fh * (0.4 + rnd() * 0.5), 0.005, mat(0x5a5850, { transparent: true, opacity: 0.25 }), (rnd() - 0.5) * w * 0.9, y0 + fh * 0.4, 0.002); // rain streaks
  }
  // roof: parapet, slab, water tank, antenna
  bx(g, w, 0.4, 0.16, trim, 0, H + 0.2, -0.08);
  bx(g, w - 0.24, 0.1, depth - 0.2, mat(0x8a857a), 0, H - 0.05, -depth / 2);
  cy(g, 0.32, 0.32, 0.7, mat(0x3a7fd0, { roughness: 0.5 }), w * 0.2, H + 0.35, -depth * 0.6, 14);
  cy(g, 0.012, 0.012, 1.2, M.darkSteel, -w * 0.25, H + 0.6, -depth * 0.4, 4);
  bx(g, 0.5, 0.02, 0.02, M.darkSteel, -w * 0.25, H + 1.0, -depth * 0.4);
  // vertical signs hung on the facade
  signs.forEach(([key, x, y, neon], i) => addTo(g, vSign(key, { neon: neon ?? [BK.neonPink, BK.neonBlue, BK.neonGreen][i % 3] })).position.set(x, y, 0));
  g.userData = { kind: 'shophouse', w, height: H };
  return g;
}
function balcony(g, w, y0, rnd) {
  bx(g, w - 0.2, 0.1, 0.55, mat(0xd8d2c4), 0, y0 + 0.05, 0.27);
  for (let x = -w / 2 + 0.2; x <= w / 2 - 0.2; x += 0.15) bx(g, 0.015, 0.7, 0.015, M.darkSteel, x, y0 + 0.45, 0.53);
  bx(g, w - 0.2, 0.03, 0.04, M.darkSteel, 0, y0 + 0.8, 0.53);
  // washing on a line, two pots of plants
  const line = cy(g, 0.004, 0.004, w - 0.4, M.ink, 0, y0 + 1.55, 0.4, 4); line.rotation.z = Math.PI / 2;
  const cols = [PALETTE.sky, PALETTE.pink, PALETTE.white, PALETTE.yellow, PALETTE.teal];
  for (let i = 0; i < 4; i++) bx(g, 0.22, 0.32 + rnd() * 0.15, 0.01, mat(cols[(i + Math.floor(rnd() * 5)) % 5]), -w / 2 + 0.45 + i * 0.5, y0 + 1.36, 0.4);
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) { cy(g, 0.12, 0.09, 0.2, mat(0xb0603a), x, y0 + 0.2, 0.3, 10); sp(g, 0.18, M.leaf, x, y0 + 0.42, 0.3).scale.set(1, 0.9, 1); }
}
// what is inside each kind of shop (on the shop floor, behind the shutter)
function shopInside(g, shop, w, rnd) {
  if (shop === 'gold') { // red walls, glass counters, gold glowing on red velvet
    for (const x of [-w / 4, w / 4]) {
      bx(g, w / 2 - 0.3, 0.85, 0.6, mat(0x7a1812), x, 0.43, -1.0);
      bx(g, w / 2 - 0.3, 0.3, 0.6, M.glass, x, 1.0, -1.0);
      bits(g, BOX(0.06, 0.03, 0.04), M.glow(0xf2c24a, 1.3), Array.from({ length: 14 }, () => [x + (rnd() - 0.5) * (w / 2 - 0.5), 0.9, -1.0 + (rnd() - 0.5) * 0.4, 0, rnd() * 3, 0]));
    }
    bx(g, w - 0.4, 0.8, 0.05, M.glow(0xe8b64a, 0.5), 0, 1.6, -3.7); // the gold wall at the back
  } else if (shop === 'eatery') {
    for (const x of [-w / 4, w / 4]) { const t = addTo(g, metalTable({ set: true })); t.position.set(x, 0.05, -1.6); for (const dz of [-0.45, 0.45]) addTo(g, stool(dz < 0 ? BK.stoolRed : BK.stoolBlue)).position.set(x, 0.05, -1.6 + dz); }
  } else { // shelves of goods (pharmacy: white boxes; mart: snacks and drinks)
    const colors = shop === 'pharmacy' ? [0xf4f0e8, 0x8db6d6, 0x5fae6a, 0xf2b84b] : [0xe8673c, 0x3a7fd0, 0xf2b84b, 0x5fae6a, 0xd9342b, 0xf09a9a];
    addTo(g, foodShelf(w - 0.6, colors, rnd)).position.set(0, 0.05, -3.55);
    if (shop === 'mart' || shop === 'pharmacy') { addTo(g, foodShelf(1.2, colors, rnd)).position.set(-w / 4, 0.05, -1.8); bx(g, 0.9, 0.9, 0.5, M.white, w / 4, 0.5, -1.0); }
  }
}

// ---------- B4 poles and wires ----------
export function pole({ h = 6.5, transformer = true } = {}) {
  const g = new THREE.Group();
  const concrete = mat(0xa8a49c, { roughness: 0.95 });
  put(g, CYL(0.09, 0.14, h, 8), concrete, 0, h / 2, 0);
  for (const y of [h - 0.4, h - 0.9]) {
    bx(g, 1.4, 0.08, 0.08, concrete, 0, y, 0);
    for (const x of [-0.6, -0.3, 0.3, 0.6]) cy(g, 0.03, 0.03, 0.08, M.white, x, y + 0.08, 0, 6);
  }
  if (transformer) { cy(g, 0.24, 0.24, 0.7, mat(0x8a8f96, { metalness: 0.3 }), 0.32, h - 2.0, 0, 12); bx(g, 0.3, 0.06, 0.3, M.darkSteel, 0.2, h - 2.4, 0); }
  // the famous coils of spare cable, and two junction boxes
  for (let i = 0; i < 3; i++) { const c = put(g, new THREE.TorusGeometry(0.28 + i * 0.05, 0.02, 4, 18), M.ink, 0, h - 2.8 - i * 0.12, 0.05); c.rotation.x = Math.PI / 2 + (i - 1) * 0.3; }
  bx(g, 0.25, 0.35, 0.12, mat(0x7a7f86), 0, h - 3.6, 0.15);
  bx(g, 0.2, 0.25, 0.1, mat(0x5a7a9a), 0, h - 4.1, 0.15);
  g.userData = { kind: 'pole', top: h - 0.4 };
  return g;
}
// a sagging bundle of wires from a to b (world points)
export function wires(a, b, { n = 7, sag = 0.7, seed = 1 } = {}) {
  const g = new THREE.Group();
  const rnd = rng(seed);
  for (let k = 0; k < n; k++) {
    const dy = (rnd() - 0.5) * 0.4, dz = (rnd() - 0.5) * 0.3, s = sag * (0.7 + rnd() * 0.6);
    const pts = Array.from({ length: 12 }, (_, i) => { const t = i / 11; return new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, dy - s * 4 * t * (1 - t), dz * (0.3 + 4 * t * (1 - t)))); });
    const m = put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.012 + rnd() * 0.008, 4), M.ink, 0, 0, 0);
    m.receiveShadow = false;
  }
  return g;
}

// ---------- bulbs ----------
// A string of round bulbs sagging from a to b; colors cycle. Bulbs are one instanced mesh, always bright.
const BULB = new THREE.MeshBasicMaterial({ color: 0xffffff });
export function bulbString(a, b, { n = 16, sag = 0.3, colors = [BK.bulb], r = 0.035 } = {}) {
  const g = new THREE.Group();
  const at = (t) => new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0));
  const cable = put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 10 }, (_, i) => at(i / 9))), 16, 0.006, 3), M.ink, 0, 0, 0);
  cable.castShadow = false;
  const im = new THREE.InstancedMesh(SPH(r, 8, 6), BULB, n);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const p = at((i + 0.5) / n); m4.makeTranslation(p.x, p.y - r, p.z); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(colors[i % colors.length])); }
  g.add(im);
  return g;
}

// ---------- B5 the night-market arch ----------
export function arch({ w = 4.8, h = 3.4 } = {}) {
  const g = new THREE.Group();
  const red = mat(0xb8281e, { roughness: 0.6 });
  for (const s of [-1, 1]) { bx(g, 0.3, h, 0.3, red, s * w / 2, h / 2, 0); bx(g, 0.4, 0.2, 0.4, mat(0xc9a24a, { metalness: 0.4 }), s * w / 2, 0.1, 0); }
  bx(g, w + 0.5, 0.7, 0.22, red, 0, h + 0.2, 0);
  bx(g, w + 0.7, 0.08, 0.3, mat(0xc9a24a, { metalness: 0.4 }), 0, h + 0.58, 0);
  const s = signPlane('market', w - 0.8, 0.55); s.position.set(0, h + 0.2, 0.115); g.add(s);
  for (const y of [h - 0.17, h + 0.57]) g.add(bulbString(new THREE.Vector3(-w / 2 - 0.2, y, 0.13), new THREE.Vector3(w / 2 + 0.2, y, 0.13), { n: 22, sag: 0, r: 0.03 }));
  // two red lanterns
  for (const x of [-w / 4, w / 4]) {
    cy(g, 0.005, 0.005, 0.3, M.ink, x, h - 0.3, 0, 4);
    sp(g, 0.2, M.glow(0xd9342b, 0.9), x, h - 0.65, 0).scale.set(1, 0.85, 1);
    for (const dy of [-0.18, 0.18]) cy(g, 0.08, 0.08, 0.05, mat(0xc9a24a), x, h - 0.65 + dy, 0, 10);
  }
  g.userData = { kind: 'arch' };
  return g;
}

// ---------- B6 tent ----------
// 2.4 square, a peaked striped roof with a valance, an LED bar under it. colors: [a, b] stripes or [a] plain.
export function tent({ colors = BK.tents[0], w = 2.4, h = 2.4, table = false } = {}) {
  const g = new THREE.Group();
  for (const x of [-1, 1]) for (const z of [-1, 1]) cy(g, 0.025, 0.025, h, M.steel, x * (w / 2 - 0.03), h / 2, z * (w / 2 - 0.03), 6);
  const roof = put(g, new THREE.ConeGeometry(w / Math.SQRT2, 0.55, 4, 1, true), stripeMat(colors[0], colors[1] ?? colors[0], 16), 0, h + 0.27, 0);
  roof.rotation.y = Math.PI / 4;
  const val = stripeMat(colors[0], colors[1] ?? colors[0], 24);
  for (const [x, z, ry] of [[0, w / 2, 0], [0, -w / 2, 0], [w / 2, 0, Math.PI / 2], [-w / 2, 0, Math.PI / 2]]) { const v = put(g, BOX(w, 0.22, 0.01), val, x, h - 0.08, z); v.rotation.y = ry; }
  bx(g, w - 0.4, 0.03, 0.03, M.glow(0xf4fbff, 1.6), 0, h - 0.24, 0);
  if (table) { const t = addTo(g, metalTable({ w: 1.6, set: false })); t.scale.z = 0.7; }
  g.userData = { kind: 'tent', h };
  return g;
}

// ---------- B8 spirit house (san phra phum) ----------
export function spiritHouse() {
  const g = new THREE.Group();
  const gold = mat(0xd8a83a, { metalness: 0.5, roughness: 0.35 }), cream = mat(0xf2e6c8);
  bx(g, 0.16, 1.0, 0.16, M.white, 0, 0.5, 0);
  bx(g, 0.2, 0.06, 0.2, gold, 0, 1.0, 0);
  bx(g, 0.72, 0.06, 0.72, cream, 0, 1.06, 0);
  for (const x of [-0.33, 0.33]) for (const z of [-0.33, 0.33]) cy(g, 0.012, 0.012, 0.08, gold, x, 1.13, z, 6);
  bx(g, 0.38, 0.3, 0.3, cream, 0, 1.24, -0.06);
  bx(g, 0.12, 0.2, 0.01, mat(0x7a1812), 0, 1.2, 0.095);
  for (const [r, y, c] of [[0.34, 1.48, 0xb8281e], [0.24, 1.62, 0x2f6a4a], [0.15, 1.73, 0xb8281e]]) { const roof = cn(g, r, 0.16, mat(c), 0, y, -0.06, 4); roof.rotation.y = Math.PI / 4; }
  cn(g, 0.02, 0.18, gold, 0, 1.88, -0.06, 6);
  // offerings: red soda with straws, marigold garlands, incense, a small lamp
  for (const x of [-0.24, -0.17]) { cy(g, 0.022, 0.022, 0.1, M.clear(0xd9242b, 0.85), x, 1.14, 0.22, 8); cy(g, 0.003, 0.003, 0.1, M.white, x + 0.005, 1.22, 0.22, 4); }
  for (const x of [0.12, 0.24]) { const ring = put(g, new THREE.TorusGeometry(0.05, 0.016, 5, 12), mat(0xf2a020), x, 1.1, 0.2); ring.rotation.x = Math.PI / 2; }
  for (let i = 0; i < 3; i++) { cy(g, 0.003, 0.003, 0.14, mat(0xc9a04a), -0.02 + i * 0.02, 1.16, 0.25, 4); sp(g, 0.006, M.glow(0xff6a2a, 2), -0.02 + i * 0.02, 1.23, 0.25); }
  sp(g, 0.025, M.glow(0xffcf80, 1.5), 0, 1.16, 0.12);
  g.userData = { kind: 'spiritHouse' };
  return g;
}

// ---------- B9 sidewalk ----------
// len along X, the kerb on the +Z edge with red-and-white kerb paint, a manhole and a drain
export function sidewalk({ len = 4, d = 2.2 } = {}) {
  const g = new THREE.Group();
  const top = 0.14;
  bx(g, len, top, d, checkMat(0xb8b4ac, 0xa8a49c, 10), 0, top / 2, 0);
  const n = Math.round(len / 0.5);
  bits(g, BOX(0.5, 0.15, 0.12), mat(0xd9342b), Array.from({ length: Math.ceil(n / 2) }, (_, i) => [-len / 2 + 0.25 + i * 1.0, top / 2, d / 2 - 0.06]));
  bits(g, BOX(0.5, 0.15, 0.12), mat(0xf4f0e8), Array.from({ length: Math.floor(n / 2) }, (_, i) => [-len / 2 + 0.75 + i * 1.0, top / 2, d / 2 - 0.06]));
  cy(g, 0.3, 0.3, 0.01, mat(0x3a3d44, { metalness: 0.4 }), len * 0.2, top + 0.005, -0.2, 16);
  bx(g, 0.6, 0.012, 0.25, M.iron, -len * 0.3, top + 0.006, d / 2 - 0.3);
  for (let i = 0; i < 5; i++) bx(g, 0.03, 0.014, 0.2, mat(0x0d0e10), -len * 0.3 - 0.24 + i * 0.12, top + 0.007, d / 2 - 0.3);
  g.userData = { kind: 'sidewalk', top };
  return g;
}

// ---------- B10 a little stage at the end of the lane ----------
export function stage({ w = 3.0, d = 2.0 } = {}) {
  const g = new THREE.Group();
  bx(g, w, 0.4, d, mat(0x4a3426, { roughness: 0.8 }), 0, 0.2, 0);
  bx(g, w, 2.0, 0.1, mat(0x1c2232), 0, 1.4, -d / 2 + 0.05);
  const s = signPlane('market', 1.8, 0.4); s.position.set(0, 1.9, -d / 2 + 0.11); g.add(s);
  g.add(bulbString(new THREE.Vector3(-w / 2, 2.4, -d / 2 + 0.12), new THREE.Vector3(w / 2, 2.4, -d / 2 + 0.12), { n: 18, sag: 0.25, colors: [BK.bulb, BK.neonPink, BK.neonBlue, BK.neonGreen] }));
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) { rb(g, 0.4, 0.7, 0.35, 0.03, mat(0x1d1f23), x, 0.75, -d / 2 + 0.4); cy(g, 0.1, 0.1, 0.02, mat(0x3a3d44), x, 0.85, -d / 2 + 0.58, 12).rotation.x = Math.PI / 2; }
  cy(g, 0.008, 0.008, 1.2, M.darkSteel, 0.4, 1.0, 0.2, 5);
  sp(g, 0.03, M.ink, 0.4, 1.6, 0.2);
  addTo(g, stool(BK.stoolBlue)).position.set(-0.1, 0.4, 0);
  g.userData = { kind: 'stage', floor: 0.4 };
  return g;
}

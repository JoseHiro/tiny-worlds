// What fills a stall (bangkok/DESIGN.md §12.2): plastic baskets, heaps, things hung from a rail, price cards, a bare
// bulb, coolers, sacks and stacks underneath. Every shape is made once and shared; anything repeated (skewers, fruit,
// folded shirts, bags) is one InstancedMesh with a colour per instance (market.js flattens and bakes them later).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, mat, bx, rb, cy, sp, put, rng, BOX, CYL, SPH, CONE, puffs, liveAll, addTo } from './common.js';

const G = {};
const once = (k, make) => (G[k] ??= make());
const PAINT = mat(0xffffff, { roughness: 0.6 }), GLOSS = mat(0xffffff, { roughness: 0.3 }), CLOTH = mat(0xffffff, { roughness: 0.85, side: THREE.DoubleSide });
const col = new THREE.Color(), o3 = new THREE.Object3D();

// many of one shape: pts [[x, y, z, rx, ry, rz, s | [sx, sy, sz]], …], colours one per point (or one for all)
export function cbits(parent, geo, pts, colors, material = PAINT) {
  const im = new THREE.InstancedMesh(geo, material, pts.length);
  pts.forEach(([x, y, z, rx = 0, ry = 0, rz = 0, s = 1], i) => {
    o3.position.set(x, y, z); o3.rotation.set(rx, ry, rz); Array.isArray(s) ? o3.scale.set(...s) : o3.scale.setScalar(s); o3.updateMatrix();
    im.setMatrixAt(i, o3.matrix); im.setColorAt(i, col.set(Array.isArray(colors) ? colors[i % colors.length] : colors));
  });
  im.castShadow = im.receiveShadow = true;
  parent.add(im);
  return im;
}
// points heaped in a w × d tray up to h high (higher in the middle), starting at y0
export function heapPts(n, w, d, h, y0 = 0, seed = 1, size = 0.03) {
  const rnd = rng(seed);
  return Array.from({ length: n }, () => {
    const x = (rnd() - 0.5) * (w - size * 2), z = (rnd() - 0.5) * (d - size * 2);
    const k = 1 - Math.max(Math.abs(x) / (w / 2), Math.abs(z) / (d / 2));
    return [x, y0 + size + rnd() * h * (0.3 + 0.7 * k), z, rnd() * 3, rnd() * 3, rnd() * 3];
  });
}

// ---------- containers ----------
// a plastic market basket (open top, a darker band of slots), w × d × h; userData.top is where things heap from
export function basket({ w = 0.3, d = 0.22, h = 0.1, color = 0xd9342b } = {}) {
  const g = new THREE.Group(), m = mat(color, { roughness: 0.45 }), slot = mat(new THREE.Color(color).multiplyScalar(0.55).getHex(), { roughness: 0.6 });
  bx(g, w, 0.012, d, m, 0, 0.006, 0);
  for (const s of [-1, 1]) { bx(g, w, h, 0.01, m, 0, h / 2, s * d / 2); bx(g, 0.01, h, d, m, s * w / 2, h / 2, 0); }
  for (const s of [-1, 1]) { bx(g, w * 0.86, h * 0.35, 0.012, slot, 0, h * 0.55, s * d / 2); bx(g, 0.012, h * 0.35, d * 0.8, slot, s * w / 2, h * 0.55, 0); }
  g.userData = { kind: 'basket', top: h * 0.5, w, d };
  return g;
}
// a steel tray (shallow), w × d
export function tray(w = 0.36, d = 0.24) {
  const g = new THREE.Group();
  bx(g, w, 0.01, d, M.steel, 0, 0.005, 0);
  for (const s of [-1, 1]) { bx(g, w, 0.025, 0.006, M.steel, 0, 0.015, s * d / 2); bx(g, 0.006, 0.025, d, M.steel, s * w / 2, 0.015, 0); }
  g.userData = { kind: 'tray', top: 0.01, w, d };
  return g;
}
// a plastic crate on the ground
export function crate(color = 0x3a7fd0, { w = 0.42, d = 0.3, h = 0.24 } = {}) { const g = basket({ w, d, h, color }); g.userData.kind = 'crate'; return g; }
// a cooler box with a white lid
export function cooler(color = 0x3a7fd0) {
  const g = new THREE.Group();
  rb(g, 0.5, 0.3, 0.32, 0.04, mat(color, { roughness: 0.4 }), 0, 0.15, 0);
  rb(g, 0.52, 0.06, 0.34, 0.03, M.white, 0, 0.32, 0);
  bx(g, 0.2, 0.03, 0.04, M.white, 0, 0.36, 0);
  return g;
}
export function sack(color = 0xd8c8a0, fill = 0x1d1f23) { // a sack of charcoal, rolled open
  const g = new THREE.Group();
  cy(g, 0.15, 0.17, 0.34, mat(color, { roughness: 0.95 }), 0, 0.17, 0, 10);
  put(g, new THREE.TorusGeometry(0.15, 0.025, 5, 12), mat(color, { roughness: 0.95 }), 0, 0.34, 0).rotation.x = Math.PI / 2;
  cbits(g, BOX(0.05, 0.04, 0.05), heapPts(12, 0.24, 0.24, 0.06, 0.3, 7, 0.02), fill);
  return g;
}
export function bucket(color = 0x4f9d6a) { const g = new THREE.Group(); put(g, CYL(0.12, 0.1, 0.22, 12, true), mat(color, { roughness: 0.45, side: THREE.DoubleSide }), 0, 0.11, 0); cy(g, 0.1, 0.1, 0.01, mat(0x8fc8e0, { roughness: 0.1 }), 0, 0.16, 0, 12); return g; }
export function stoolStack(n = 4, color = 0xe0453a) { const g = new THREE.Group(), m = mat(color, { roughness: 0.45, side: THREE.DoubleSide }); for (let i = 0; i < n; i++) put(g, CYL(0.1, 0.13, 0.28, 12, true), m, 0, 0.14 + i * 0.05, 0); return g; }
export function foamStack(n = 5) { const g = new THREE.Group(); for (let i = 0; i < n; i++) rb(g, 0.34, 0.12, 0.24, 0.02, M.white, 0, 0.06 + i * 0.12, 0); return g; }

// ---------- light: a bare bulb on its flex (with a halo, see market.js) ----------
export function bareBulb({ drop = 0.3, color = 0xffd890 } = {}) {
  const g = new THREE.Group();
  cy(g, 0.004, 0.004, drop, M.ink, 0, -drop / 2, 0, 4);
  cy(g, 0.016, 0.016, 0.03, M.ink, 0, -drop, 0, 6);
  sp(g, 0.04, M.glow(color, 2.2), 0, -drop - 0.045, 0).castShadow = false;
  const h = new THREE.Object3D(); h.position.y = -drop - 0.045; h.userData.halo = [color, 1.0]; g.add(h);
  return g;
}
// an LED tube under a roof (white or coloured)
export function ledTube(len = 1, color = 0xf4fbff) { const g = new THREE.Group(); bx(g, len, 0.03, 0.03, M.glow(color, 1.8), 0, 0, 0).castShadow = false; for (let i = 0; i < 3; i++) { const h = new THREE.Object3D(); h.position.x = (i - 1) * len * 0.35; h.userData.halo = [color, 0.7]; g.add(h); } return g; }

// ---------- price cards: a small atlas of hand-written prices ----------
const PRICES = ['฿10', '฿20', '฿40', '฿50', '฿99', '3 / ฿100', 'ลด 50%', '฿150'];
const PRICE_TEX = (() => {
  const c = document.createElement('canvas'); c.width = 128 * 4; c.height = 64 * 2;
  const x = c.getContext('2d');
  PRICES.forEach((p, i) => {
    const x0 = (i % 4) * 128, y0 = Math.floor(i / 4) * 64;
    x.fillStyle = i % 3 === 2 ? '#f2d84a' : '#fbf7ee'; x.fillRect(x0 + 2, y0 + 2, 124, 60);
    x.fillStyle = i % 2 ? '#d9342b' : '#1c2232'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 ${p.length > 4 ? 30 : 40}px "Marker Felt", "Chalkboard SE", "Thonburi", sans-serif`; x.fillText(p, x0 + 64, y0 + 34, 118);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
})();
const PRICE_MAT = new THREE.MeshStandardMaterial({ map: PRICE_TEX, roughness: 0.7, side: THREE.DoubleSide });
// a price card facing +Z (i: which price), w wide; stick: on a skewer stuck into the food
export function price(i = 0, { w = 0.14, stick = 0 } = {}) {
  const geo = once(`price${i}|${w}`, () => { const g = new THREE.PlaneGeometry(w, w / 2); const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, ((i % 4) + uv.getX(k)) / 4, 1 - (Math.floor(i / 4) + 1 - uv.getY(k)) / 2); return g; });
  const g = new THREE.Group();
  const card = put(g, geo, PRICE_MAT, 0, stick + w / 4, 0); card.castShadow = false;
  if (stick) cy(g, 0.003, 0.003, stick, M.bamboo, 0, stick / 2, -0.002, 4);
  return g;
}

// ---------- hanging things ----------
// a rail from (−len/2) to (len/2) at height h on two thin posts; items: [{ make: () => obj, n, colors? }] hung under it
export function rail(len, h, { posts = true } = {}) {
  const g = new THREE.Group();
  cy(g, 0.008, 0.008, len, M.steel, 0, h, 0, 5).rotation.z = Math.PI / 2;
  if (posts) for (const s of [-1, 1]) cy(g, 0.01, 0.01, h, M.steel, s * len / 2, h / 2, 0, 5);
  return g;
}
// clear plastic bags of drink hung on strings (one instanced batch of bags, coloured, plus the strings)
export function hungBags(n, len, h, colors, { drop = 0.12, size = 0.05 } = {}) {
  const g = new THREE.Group();
  const bag = once('bag', () => new THREE.SphereGeometry(1, 8, 6).scale(1, 1.45, 0.8));
  const pts = Array.from({ length: n }, (_, i) => [-len / 2 + (i + 0.5) * (len / n), h - drop - size * 1.4, 0, 0, i * 0.7, 0, size]);
  cbits(g, bag, pts, colors, mat(0xffffff, { roughness: 0.25, transparent: true, opacity: 0.92 }));
  cbits(g, once('string', () => new THREE.CylinderGeometry(0.002, 0.002, 1, 3)), pts.map(([x]) => [x, h - drop / 2, 0, 0, 0, 0, [1, drop, 1]]), 0xf4f0e8);
  return g;
}

// ---------- grilled things: a grate packed with skewers (two instanced batches: sticks, meat) ----------
// n skewers across the grate (along z), x from −len/2 to len/2; colors: of the meat, picked in turn
export function skewerRow(n, len, { stick = 0.24, colors = [0x8a4a22, 0x7a3e1c, 0x9a5426], bits = 4, size = 0.026, shape = 'chunk' } = {}) {
  const g = new THREE.Group();
  const meat = shape === 'ball' ? once('ball', () => new THREE.SphereGeometry(1, 8, 6)) : once('chunk', () => new THREE.BoxGeometry(1.1, 0.8, 1).translate(0, 0.2, 0));
  const xs = Array.from({ length: n }, (_, i) => -len / 2 + (i + 0.5) * (len / n));
  cbits(g, once('stick', () => new THREE.CylinderGeometry(0.0035, 0.0035, 1, 4).rotateX(Math.PI / 2)), xs.map((x) => [x, 0.004, 0, 0, 0, 0, [1, 1, stick]]), 0xd8c08a);
  const pts = [], cs = [];
  xs.forEach((x, i) => { for (let k = 0; k < bits; k++) { pts.push([x, 0.008, stick / 2 - 0.035 - k * size * 1.3, (i + k) * 0.4, 0, 0, size]); cs.push(colors[(i * 3 + k) % colors.length]); } });
  cbits(g, meat, pts, cs, GLOSS);
  return g;
}

// ---------- fruit: heaps of whole fruit (each kind a few instanced batches) ----------
const FRUIT = {
  pineapple: { geo: () => new THREE.SphereGeometry(1, 10, 8).scale(0.055, 0.085, 0.055), c: [0xc8902a, 0xd8a03a, 0xb8802a], crown: 0x4f8a3a },
  dragon: { geo: () => new THREE.SphereGeometry(1, 10, 8).scale(0.05, 0.065, 0.05), c: [0xe0407a, 0xd83070, 0xe8508a], crown: 0x8fc04a },
  rambutan: { geo: () => new THREE.IcosahedronGeometry(0.028, 0), c: [0xd9242b, 0xc81a24, 0xe84a2a] },
  mangosteen: { geo: () => new THREE.SphereGeometry(0.03, 10, 8), c: [0x5a1f3a, 0x4a1830], crown: 0x5f8a3a },
  mango: { geo: () => new THREE.SphereGeometry(1, 10, 8).scale(0.06, 0.036, 0.042), c: [0xf6b93a, 0xf2a830, 0x9fc04a] },
  orange: { geo: () => new THREE.SphereGeometry(0.035, 10, 8), c: [0xf08a1a, 0xf29a2a, 0xe87a12] },
  watermelon: { geo: () => new THREE.SphereGeometry(1, 14, 10).scale(0.15, 0.12, 0.12), c: [0x2f6a2e, 0x3a7a34] },
  banana: { geo: () => new THREE.TorusGeometry(0.06, 0.013, 5, 8, 1.6), c: [0xf2d040, 0xe8c838] },
  // the market's other produce and ready food, heaped the same way
  lime: { geo: () => new THREE.SphereGeometry(0.022, 8, 6), c: [0x8fc04a, 0x7ab03a, 0xa0c850] },
  tomato: { geo: () => new THREE.SphereGeometry(0.024, 8, 6).scale(1, 0.85, 1), c: [0xd9342b, 0xe8452a, 0xc82820] },
  chili: { geo: () => new THREE.ConeGeometry(0.008, 0.06, 5).rotateZ(Math.PI / 2), c: [0xd9242b, 0xe83a2a, 0x4f9d3a] },
  papaya: { geo: () => new THREE.SphereGeometry(1, 10, 8).scale(0.09, 0.05, 0.05), c: [0x7ab040, 0x8fc04a, 0x6aa038] },
  bean: { geo: () => new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4).rotateZ(Math.PI / 2), c: [0x4f9d3a, 0x5fae4a] },
  egg: { geo: () => new THREE.SphereGeometry(1, 8, 6).scale(0.022, 0.028, 0.022), c: [0xf6f0e2, 0xe8d8b8, 0xf2e4c8] },
  chestnut: { geo: () => new THREE.SphereGeometry(1, 8, 6).scale(0.02, 0.016, 0.02), c: [0x5a2e18, 0x6b3a20, 0x4a2412] },
  crab: { geo: () => new THREE.SphereGeometry(1, 10, 6).scale(0.06, 0.025, 0.045), c: [0xe8552a, 0xd9452a, 0xf06a3a] },
  shell: { geo: () => new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.03, 0.015, 0.022), c: [0x3a3040, 0xd8c8b0, 0x5a4a5a] },
  shrimp: { geo: () => new THREE.TorusGeometry(0.03, 0.012, 6, 10, Math.PI * 1.4), c: [0xf08a5a, 0xe87a4a] },
  meatball: { geo: () => new THREE.SphereGeometry(0.018, 8, 6), c: [0xf2e8d8, 0xc89a6a, 0xe8c8a0] },
  roll: { geo: () => new THREE.CylinderGeometry(0.016, 0.016, 0.1, 8).rotateZ(Math.PI / 2), c: [0xd8962a, 0xe8a83a, 0xc8862a] },
  fried: { geo: () => new THREE.DodecahedronGeometry(0.03, 0).scale(1.3, 0.8, 1), c: [0xc87a2a, 0xd8902a, 0xb86a20] },
  insect: { geo: () => new THREE.CapsuleGeometry(0.008, 0.03, 2, 5).rotateZ(Math.PI / 2), c: [0x5a3a1a, 0x7a4a20, 0x3a2410] },
  sweet: { geo: () => new THREE.BoxGeometry(0.035, 0.02, 0.035), c: [0x5fae6a, 0xf09ab0, 0xf2d040, 0xf4f0e8, 0x8a5aa0] },
  ball: { geo: () => new THREE.SphereGeometry(0.02, 8, 6), c: [0xf09ab0, 0x5fae6a, 0xf2d040, 0xf4f0e8] },
  durian: { geo: () => new THREE.IcosahedronGeometry(0.08, 1).scale(1, 1.2, 1), c: [0x8a9a3a, 0x9aa848, 0x7a8a30] },
  coconut: { geo: () => new THREE.SphereGeometry(0.06, 10, 8), c: [0x6a9a3a, 0x7aa848, 0xe8dcc0] },
};
// a heap of fruit kind in a w × d space up to h high
export function fruitHeap(kind, n, w, d, h, seed = 1) {
  const f = FRUIT[kind], g = new THREE.Group(), geo = once(`fruit${kind}`, f.geo);
  const r = { watermelon: 0.12, durian: 0.09, coconut: 0.06, papaya: 0.05, crab: 0.04 }[kind] ?? 0.025;
  const pts = heapPts(n, w, d, h, 0, seed, r).map((p) => (kind === 'pineapple' || kind === 'dragon' ? [p[0], p[1], p[2], (p[3] - 1.5) * 0.3, p[4], (p[5] - 1.5) * 0.3] : p));
  cbits(g, geo, pts, f.c, ['rambutan', 'durian', 'egg', 'chestnut', 'shell'].includes(kind) ? PAINT : GLOSS);
  if (f.crown) { // pineapple and dragon fruit: a tuft on top (pineapple a spiky crown)
    const cr = once(`crown${kind}`, () => (kind === 'pineapple' ? mergeGeometries([0, 1, 2].map((i) => new THREE.ConeGeometry(0.018, 0.09, 4).rotateZ(0.35).rotateY((i * Math.PI * 2) / 3).translate(0, 0.12, 0))) : new THREE.ConeGeometry(0.018, 0.04, 5).translate(0, kind === 'dragon' ? 0.08 : 0.035, 0)));
    cbits(g, cr, pts, f.crown);
  }
  return g;
}
// cut fruit on sticks, lying on ice in rows: kinds [[flesh, rind | null], …], per row n
export function fruitSticks(kinds, n, w, d, seed = 2) {
  const g = new THREE.Group(), rnd = rng(seed), stick = once('fstick', () => new THREE.BoxGeometry(0.035, 0.035, 0.12));
  kinds.forEach(([flesh, rind], i) => {
    const x = -w / 2 + (i + 0.5) * (w / kinds.length), pts = Array.from({ length: n }, (_, k) => [x + (rnd() - 0.5) * 0.01, 0.018, -d / 2 + (k + 0.5) * (d / n), 0, (rnd() - 0.5) * 0.15, 0]);
    cbits(g, stick, pts, flesh, GLOSS);
    if (rind) cbits(g, once('rind', () => new THREE.BoxGeometry(0.037, 0.012, 0.121)), pts.map((p) => [p[0], 0.004, p[2], 0, p[4], 0]), rind);
  });
  return g;
}

// ---------- clothes ----------
const SHIRT = () => once('shirt', () => mergeGeometries([
  new THREE.BoxGeometry(0.3, 0.36, 0.012).translate(0, -0.2, 0),
  new THREE.BoxGeometry(0.12, 0.1, 0.012).rotateZ(0.6).translate(-0.17, -0.07, 0),
  new THREE.BoxGeometry(0.12, 0.1, 0.012).rotateZ(-0.6).translate(0.17, -0.07, 0),
]));
const DRESS = () => once('dress', () => mergeGeometries([new THREE.CylinderGeometry(0.07, 0.17, 0.52, 6, 1).scale(1, 1, 0.22).translate(0, -0.3, 0), new THREE.BoxGeometry(0.14, 0.06, 0.03).translate(0, -0.03, 0)]));
const HANGER = () => once('hanger', () => mergeGeometries([new THREE.TorusGeometry(0.02, 0.003, 4, 8, Math.PI * 1.3).rotateZ(-0.2).translate(0, 0.02, 0), new THREE.BoxGeometry(0.3, 0.006, 0.006).translate(0, -0.02, 0)]));
// a rail of things on hangers, facing +Z: kind 'shirt' | 'dress', n of them along len at height h
export function hungClothes(kind, n, len, h, colors, seed = 3) {
  const g = new THREE.Group(), rnd = rng(seed);
  const pts = Array.from({ length: n }, (_, i) => [-len / 2 + (i + 0.5) * (len / n), h - 0.02, (rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.3, 0]);
  cbits(g, kind === 'dress' ? DRESS() : SHIRT(), pts, colors, CLOTH);
  cbits(g, HANGER(), pts.map((p) => [p[0], h, p[2], 0, p[4], 0]), 0x3a3d44);
  return g;
}
// folded clothes in stacks on a table: [x, z] spots, up to max high
export function foldedStacks(spots, colors, { max = 7, seed = 4 } = {}) {
  const g = new THREE.Group(), rnd = rng(seed), fold = once('fold', () => new THREE.BoxGeometry(0.24, 0.028, 0.2));
  const pts = [], cs = [];
  spots.forEach(([x, z], s) => { const n = 3 + Math.floor(rnd() * (max - 2)); for (let k = 0; k < n; k++) { pts.push([x + (rnd() - 0.5) * 0.02, 0.016 + k * 0.03, z + (rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.12, 0]); cs.push(colors[(s * 5 + k * 3 + Math.floor(rnd() * 2)) % colors.length]); } });
  cbits(g, fold, pts, cs, CLOTH);
  return g;
}
// a hat stand: a pole, and straw / bucket hats on pegs
export function hatStand(colors = [0xe8d8a0, 0xd9342b, 0x2c3a57, 0xf2b84b, 0x4f9d6a]) {
  const g = new THREE.Group();
  cy(g, 0.012, 0.012, 1.4, M.darkSteel, 0, 0.7, 0, 5); cy(g, 0.14, 0.14, 0.02, M.darkSteel, 0, 0.01, 0, 10);
  const hat = once('hat', () => mergeGeometries([new THREE.CylinderGeometry(0.13, 0.13, 0.01, 12), new THREE.CylinderGeometry(0.075, 0.085, 0.08, 12).translate(0, 0.045, 0)]));
  cbits(g, hat, [0, 1, 2, 3, 4].map((i) => [Math.cos(i * 1.3) * 0.12, 0.75 + i * 0.13, Math.sin(i * 1.3) * 0.12, Math.sin(i * 1.3) * 0.25, 0, -Math.cos(i * 1.3) * 0.25]), colors, CLOTH);
  return g;
}
// pairs of flip-flops in rows on a mat
export function sandals(rows = 3, cols = 5, colors = [0xd9342b, 0x3a7fd0, 0xf2b84b, 0x4f9d6a, 0xf09a9a, 0x1c2232]) {
  const g = new THREE.Group();
  bx(g, cols * 0.2 + 0.06, 0.008, rows * 0.24 + 0.06, mat(0x2c5aa0, { roughness: 0.9 }), 0, 0.004, 0);
  const sole = once('sole', () => new THREE.CylinderGeometry(1, 1, 1, 10).scale(0.04, 0.012, 0.1));
  const pts = [], cs = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) for (const s of [-1, 1]) { pts.push([(c - (cols - 1) / 2) * 0.2 + s * 0.045, 0.014, (r - (rows - 1) / 2) * 0.24, 0, s * 0.05, 0]); cs.push(colors[(r * cols + c) % colors.length]); }
  cbits(g, sole, pts, cs);
  return g;
}

// ---------- stacks and dispensers ----------
// bowls (or cups) stacked upside down, n high, in stacks at spots
export function stacks(kind, spots, n = 6, color = 0xf4f0e8) {
  const g = new THREE.Group();
  const geo = once(`stack${kind}`, () => (kind === 'cup' ? new THREE.CylinderGeometry(0.035, 0.026, 0.09, 10, 1, true) : new THREE.SphereGeometry(0.07, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1)));
  const step = kind === 'cup' ? 0.012 : 0.02, y0 = kind === 'cup' ? 0.045 : 0.0;
  const pts = spots.flatMap(([x, z]) => Array.from({ length: n }, (_, k) => [x, y0 + k * step, z]));
  cbits(g, geo, pts, color, mat(0xffffff, { roughness: 0.4, side: THREE.DoubleSide }));
  return g;
}
// a drink tank: a clear barrel of coloured juice with a tap (the juice glows a little at night)
export function tank(color = 0xe8823a, { r = 0.1, h = 0.3 } = {}) {
  const g = new THREE.Group();
  cy(g, r * 0.93, r * 0.93, h * 0.8, M.glow(color, 0.35), 0, h * 0.42, 0, 12);
  put(g, CYL(r, r, h, 14, true), mat(0xffffff, { transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), 0, h / 2, 0);
  cy(g, r * 1.02, r * 1.02, 0.02, M.white, 0, h, 0, 14);
  bx(g, 0.03, 0.03, 0.05, M.white, 0, 0.05, r + 0.02);
  return g;
}
// small boxes of things in a grid on a board facing +Z (phone cases, earrings, sunglasses)
export function pegBoard({ w = 0.9, h = 0.7, cols = 8, rows = 6, item = [0.07, 0.11, 0.012], colors, board = 0x2c3a57 } = {}) {
  const g = new THREE.Group();
  bx(g, w, h, 0.02, mat(board, { roughness: 0.9 }), 0, h / 2, 0);
  const geo = once(`peg${item}`, () => new THREE.BoxGeometry(...item));
  const pts = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([-w / 2 + (c + 0.5) * (w / cols), h - (r + 0.5) * (h / rows), 0.012 + item[2] / 2]);
  cbits(g, geo, pts, colors ?? [0xd9342b, 0x3a7fd0, 0xf2b84b, 0x4f9d6a, 0xf09ab0, 0x1c2232, 0xf4f0e8, 0x8a5aa0, 0x5ce1ff]);
  return g;
}
// a turning tower of sunglasses
export function glassesTower() {
  const g = new THREE.Group();
  cy(g, 0.012, 0.012, 1.2, M.darkSteel, 0, 0.6, 0, 5); cy(g, 0.13, 0.13, 0.02, M.darkSteel, 0, 0.01, 0, 10);
  const lens = once('glasses', () => mergeGeometries([new THREE.BoxGeometry(0.012, 0.03, 0.045).translate(0, 0, -0.026), new THREE.BoxGeometry(0.012, 0.03, 0.045).translate(0, 0, 0.026), new THREE.BoxGeometry(0.01, 0.006, 0.11).translate(0, 0.012, 0)]));
  const pts = [];
  for (let k = 0; k < 6; k++) for (let a = 0; a < 6; a++) { const t = (a / 6) * Math.PI * 2 + k * 0.4; pts.push([Math.cos(t) * 0.07, 0.55 + k * 0.1, Math.sin(t) * 0.07, 0, -t, 0]); }
  cbits(g, lens, pts, [0x1c2232, 0x3a1a10, 0xd9342b, 0x2c5aa0, 0xf2b84b, 0x1c2232], GLOSS);
  return g;
}
// toys: a heap of soft toys (a body and two ears each), light-up wands that glow at night, balloons above
export function plushHeap(n, w, d, h, seed = 6) {
  const g = new THREE.Group(), cs = [0xf09ab0, 0xf4f0e8, 0xc89a6a, 0x5ce1ff, 0xf2d040, 0x8a5aa0, 0x5fae6a];
  const pts = heapPts(n, w, d, h, 0, seed, 0.06);
  cbits(g, once('plush', () => new THREE.SphereGeometry(0.06, 10, 8)), pts, cs, CLOTH);
  cbits(g, once('ears', () => mergeGeometries([-1, 1].map((s) => new THREE.SphereGeometry(0.022, 6, 5).translate(0, 0.055, s * 0.035)))), pts.map((p) => [p[0], p[1], p[2], 0, p[4], 0]), cs, CLOTH);
  return g;
}
export function glowToys(n = 12, w = 0.6, seed = 8) {
  const g = new THREE.Group(), rnd = rng(seed);
  const geo = once('wand', () => new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5));
  [0xff5ca8, 0x5ce1ff, 0x5cff8a, 0xffd060].forEach((c, k) => {
    const pts = Array.from({ length: Math.ceil(n / 4) }, () => [(rnd() - 0.5) * w, 0.11, (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.5, 0, (rnd() - 0.5) * 0.5]);
    const im = cbits(g, geo, pts, c, M.glow(c, 1.8)); im.castShadow = false;
    for (const p of pts.slice(0, 2)) { const h = new THREE.Object3D(); h.position.set(p[0], 0.15, p[2]); h.userData.halo = [c, 0.4]; g.add(h); }
  });
  return g;
}
export function balloons(n = 6, seed = 9) {
  const g = new THREE.Group(), rnd = rng(seed);
  const pts = Array.from({ length: n }, (_, i) => [(rnd() - 0.5) * 0.3, 0.55 + rnd() * 0.15, (rnd() - 0.5) * 0.3]);
  cbits(g, once('balloon', () => new THREE.SphereGeometry(1, 10, 8).scale(0.09, 0.11, 0.09)), pts, [0xd9342b, 0xf2d040, 0x3a7fd0, 0xf09ab0, 0x5fae6a, 0xf4f0e8], GLOSS);
  cbits(g, once('bstring', () => new THREE.CylinderGeometry(0.002, 0.002, 1, 3)), pts.map(([x, y, z]) => [x / 2, y / 2, z / 2, Math.atan2(z, y) * 0, 0, -Math.atan2(x, y), [1, y, 1]]), 0xf4f0e8);
  return g;
}
// records: crates of LPs on edge (black, a coloured label), facing +Z
export function recordCrate(color = 0x8a6a4a, seed = 10) {
  const g = basket({ w: 0.36, d: 0.36, h: 0.2, color }), rnd = rng(seed);
  const pts = Array.from({ length: 14 }, (_, i) => [0, 0.17, -0.15 + i * 0.022, (rnd() - 0.5) * 0.12, 0, 0]);
  cbits(g, once('lp', () => new THREE.BoxGeometry(0.32, 0.32, 0.006)), pts, [0x1c2232, 0x2c3a57, 0xf4f0e8, 0xd9342b, 0xf2b84b, 0x1c2232]);
  return g;
}
export function radio(color = 0x8a5a34) { const g = new THREE.Group(); rb(g, 0.26, 0.16, 0.1, 0.02, mat(color, { roughness: 0.5 }), 0, 0.08, 0); cy(g, 0.045, 0.045, 0.01, M.ink, -0.06, 0.08, 0.05, 12).rotation.x = Math.PI / 2; bx(g, 0.08, 0.05, 0.01, M.glow(0xffd890, 0.8), 0.06, 0.09, 0.052); cy(g, 0.003, 0.003, 0.25, M.steel, 0.1, 0.27, 0, 4).rotation.z = -0.3; return g; }

export { puffs, liveAll, addTo };

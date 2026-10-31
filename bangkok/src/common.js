// Shared bits for the Bangkok night market (bangkok/DESIGN.md): cached geometry, the palette, the one canvas
// that holds every sign's lettering, and the steam / smoke / flame effects. Scale: 1 m ≈ 0.76, a person is 1.3.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PALETTE, mat } from '../../airport/src/parts.js';

export { PALETTE, mat };

// ---------- cached geometry ----------
const geos = new Map();
const cached = (key, make) => { if (!geos.has(key)) geos.set(key, make()); return geos.get(key); };
export const BOX = (w, h, d) => cached(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const RBOX = (w, h, d, r) => cached(`r${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
export const CYL = (rt, rb, h, s = 14, open = false) => cached(`c${rt}|${rb}|${h}|${s}|${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
export const SPH = (r, w = 12, h = 8) => cached(`s${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h));
export const CONE = (r, h, s = 10) => cached(`k${r}|${h}|${s}`, () => new THREE.ConeGeometry(r, h, s));
export const geoCount = () => geos.size;

export function put(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const bx = (g, w, h, d, m, x, y, z) => put(g, BOX(w, h, d), m, x, y, z);
export const rb = (g, w, h, d, r, m, x, y, z) => put(g, RBOX(w, h, d, r), m, x, y, z);
export const cy = (g, rt, rbot, h, m, x, y, z, s) => put(g, CYL(rt, rbot, h, s), m, x, y, z);
export const sp = (g, r, m, x, y, z) => put(g, SPH(r), m, x, y, z);
export const cn = (g, r, h, m, x, y, z, s) => put(g, CONE(r, h, s), m, x, y, z);
export const pivot = (parent, x = 0, y = 0, z = 0) => { const p = new THREE.Group(); p.position.set(x, y, z); p.userData.dynamic = true; parent.add(p); return p; };
// add a child and get the child back (Object3D.add returns the parent)
export const addTo = (parent, child) => { parent.add(child); return child; };
export const group = (parent, x = 0, y = 0, z = 0) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };

// Many small bits (bean sprouts, peanuts, coals, ice): one InstancedMesh. pts: [[x, y, z, rx, ry, rz, s], …]
export function bits(parent, geometry, material, pts) {
  const im = new THREE.InstancedMesh(geometry, material, pts.length);
  const o = new THREE.Object3D();
  pts.forEach(([x, y, z, rx = 0, ry = 0, rz = 0, s = 1], i) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.setScalar(s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.castShadow = im.receiveShadow = true;
  parent.add(im);
  return im;
}
// a steady random sequence
export const rng = (seed = 1) => { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
// points scattered in a disc (r) on a mound (h): for heaps of food
export function mound(n, r, h, seed = 1, y0 = 0) {
  const rnd = rng(seed);
  return Array.from({ length: n }, () => {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
    return [Math.cos(a) * d, y0 + h * (1 - (d / r) ** 2) + rnd() * 0.004, Math.sin(a) * d, rnd() * 3, rnd() * 3, rnd() * 3, 0.8 + rnd() * 0.4];
  });
}

// ---------- palette (DESIGN.md §3) ----------
export const BK = {
  night: 0x1d2440, plum: 0x2a2350,
  red: 0xd9342b, gold: 0xe8b64a, neonPink: 0xff5ca8, neonBlue: 0x5ce1ff, neonGreen: 0x5cff8a,
  stoolRed: 0xe0453a, stoolBlue: 0x3a7fd0,
  bulb: 0xffcf80, coal: 0xff7a2a,
  steel: 0xc9ccd1, wood: 0x8a6a4a, bamboo: 0xd8c08a, leaf: 0x4f8a3a,
  tents: [[0xd9342b, 0xf4f0e8], [0x3a7fd0, 0xf4f0e8], [0xf2b84b], [0x4f9d6a], [0xe8673c]],
};
export const M = {
  steel: mat(BK.steel, { metalness: 0.65, roughness: 0.28 }),
  darkSteel: mat(0x3a3d44, { metalness: 0.5, roughness: 0.4 }),
  iron: mat(0x24252a, { metalness: 0.4, roughness: 0.6 }),
  glass: mat(0xd8eef2, { transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }),
  white: mat(PALETTE.white),
  ink: mat(PALETTE.ink),
  wood: mat(BK.wood, { roughness: 0.85 }),
  bamboo: mat(BK.bamboo, { roughness: 0.8 }),
  leaf: mat(BK.leaf, { roughness: 0.7 }),
  food: (c, o = {}) => mat(c, { roughness: 0.55, ...o }),
  shiny: (c) => mat(c, { roughness: 0.3 }), // glazed, oily
  plastic: (c) => mat(c, { roughness: 0.45 }),
  clear: (c, o = 0.55) => mat(c, { transparent: true, opacity: o, roughness: 0.1 }),
  glow: (c, i = 1) => glowMat(c, i),
};
const glows = new Map();
function glowMat(c, i) {
  const k = c + '|' + i;
  if (!glows.has(k)) glows.set(k, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 }));
  return glows.get(k);
}
// coals and charcoal glow flicker together: one material, call tickFx once a frame
export const COAL = new THREE.MeshStandardMaterial({ color: 0x3a1a10, emissive: BK.coal, emissiveIntensity: 1.2, roughness: 0.9 });

// ---------- stripes and checks (shared canvas textures) ----------
const texs = new Map();
function canvasTex(key, w, h, draw, repeat) {
  if (texs.has(key)) return texs.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  texs.set(key, t);
  return t;
}
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
// vertical stripes around (u) — for parasols and tent roofs
export function stripeMat(a, b = a, n = 8) {
  return cachedMat(`stripe${a}|${b}|${n}`, () => new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide, map: canvasTex(`stripe${a}|${b}|${n}`, 64, 4, (x, w) => { for (let i = 0; i < n; i++) { x.fillStyle = hex(i % 2 ? b : a); x.fillRect((i * w) / n, 0, w / n + 1, 4); } }) }));
}
export function checkMat(a, b, n = 6) {
  return cachedMat(`check${a}|${b}|${n}`, () => new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(`check${a}|${b}|${n}`, 32, 32, (x) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = hex((i + j) % 2 ? a : b); x.fillRect(i * 8, j * 8, 8, 8); } }, [n / 4, n / 4]) }));
}
const mats = new Map();
function cachedMat(k, make) { if (!mats.has(k)) mats.set(k, make()); return mats.get(k); }

// ---------- lettering: one atlas for every sign (DESIGN.md §10) ----------
// Each label has a cell; a sign is a plane whose UVs pick its cell. bg / fg are the sign's colours.
export const LABELS = {
  padthai: ['ผัดไทย', 'PAD THAI', 0xd9342b, 0xf4f0e8],
  somtam: ['ส้มตำ', 'SOM TAM', 0xf2b84b, 0x1c2232],
  mooping: ['หมูปิ้ง', 'MOO PING', 0xe8673c, 0xf4f0e8],
  khaomangai: ['ข้าวมันไก่', '海南雞飯', 0xf4f0e8, 0xd9342b],
  kuaytiew: ['ก๋วยเตี๋ยว', 'NOODLES', 0x3a7fd0, 0xf4f0e8],
  fruit: ['ผลไม้', 'FRUIT', 0x4f9d6a, 0xf4f0e8],
  mango: ['ข้าวเหนียวมะม่วง', 'MANGO STICKY RICE', 0xf2b84b, 0x1c2232],
  chayen: ['ชาเย็น', 'THAI TEA', 0xe8673c, 0xf4f0e8],
  seafood: ['อาหารทะเล', '海鮮', 0x1c2232, 0xe8b64a],
  roti: ['โรตี', 'ROTI', 0xf09a9a, 0x1c2232],
  gold: ['金行', 'ร้านทอง', 0xd9342b, 0xe8b64a],
  market: ['ตลาดนัด', 'NIGHT MARKET 夜市', 0x1c2232, 0xffcf80],
  chestnut: ['糖炒栗子', 'เกาลัด', 0xd9342b, 0xe8b64a],
  kuayjub: ['ก๋วยจั๊บ', '粿汁', 0xf4f0e8, 0x1c2232],
  satay: ['สะเต๊ะ', 'SATAY', 0x8a5a34, 0xf4f0e8],
  coconut: ['มะพร้าว', 'COCONUT', 0x4f8a3a, 0xf4f0e8],
  minimart: ['MINI MART', '24 ชม. · OPEN 24 HOURS', 0xf4f0e8, 0xe8673c],
  pharmacy: ['ร้านขายยา', 'PHARMACY 藥房', 0x4f9d6a, 0xf4f0e8],
  eatery: ['ร้านอาหาร', 'RESTAURANT 餐廳', 0xd9342b, 0xe8b64a],
  goods: ['ร้านค้า', 'SHOP 商行', 0x2c3a57, 0xf4f0e8],
  taxi: ['TAXI-METER', 'แท็กซี่มิเตอร์', 0xf4f0e8, 0xd9342b],
  tuktuk: ['ตุ๊กตุ๊ก', 'TUK TUK', 0x1c2232, 0xf2b84b],
};
const CELL = [256, 96], COLS = 4;
const ATLAS = canvasTex('atlas', CELL[0] * COLS, CELL[1] * Math.ceil(Object.keys(LABELS).length / COLS), (x) => {
  Object.values(LABELS).forEach(([big, small, bg, fg], i) => {
    const x0 = (i % COLS) * CELL[0], y0 = Math.floor(i / COLS) * CELL[1];
    x.fillStyle = hex(bg); x.fillRect(x0, y0, CELL[0], CELL[1]);
    x.strokeStyle = hex(fg); x.lineWidth = 3; x.strokeRect(x0 + 5, y0 + 5, CELL[0] - 10, CELL[1] - 10);
    x.fillStyle = hex(fg); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 ${big.length > 8 ? 30 : 40}px "Thonburi", "Noto Sans Thai", "PingFang SC", sans-serif`;
    x.fillText(big, x0 + CELL[0] / 2, y0 + 38, CELL[0] - 20);
    x.font = '600 16px Inter, "PingFang SC", sans-serif';
    x.fillText(small, x0 + CELL[0] / 2, y0 + 74, CELL[0] - 20);
  });
});
ATLAS.anisotropy = 4;
const signMatLit = new THREE.MeshStandardMaterial({ map: ATLAS, emissiveMap: ATLAS, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.5 });
const signMatFlat = new THREE.MeshStandardMaterial({ map: ATLAS, roughness: 0.6 });
// a sign facing +Z, w × h, lit (lettering glows) or painted
export function signPlane(key, w, h, { lit = true } = {}) {
  const i = Object.keys(LABELS).indexOf(key);
  const geo = cached(`sign${key}|${w}|${h}`, () => {
    const g = new THREE.PlaneGeometry(w, h);
    const rows = Math.ceil(Object.keys(LABELS).length / COLS);
    const u0 = (i % COLS) / COLS, v1 = 1 - Math.floor(i / COLS) / rows, du = 1 / COLS, dv = 1 / rows;
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * du, v1 - dv + uv.getY(k) * dv);
    return g;
  });
  return new THREE.Mesh(geo, lit ? signMatLit : signMatFlat);
}

// ---------- steam, smoke and flame ----------
// Soft puffs are sprites (they face every camera); one texture, a material per puff for its own fade.
const PUFF = canvasTex('puff', 64, 64, (x) => {
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
});
// kind 'steam' (white, quick) or 'smoke' (grey-blue, slow, wide). Returns a group whose update(t) moves the puffs.
export function puffs(kind = 'steam', { n = 4, rise = 0.5, size = 0.18, spread = 0.06, seed = 1 } = {}) {
  const g = new THREE.Group();
  const color = kind === 'smoke' ? 0xb8bccb : 0xffffff, alpha = kind === 'smoke' ? 0.45 : 0.6, speed = kind === 'smoke' ? 0.35 : 0.6;
  const rnd = rng(seed);
  const list = Array.from({ length: n }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUFF, color, transparent: true, depthWrite: false, opacity: 0 }));
    s.scale.setScalar(0.001);
    g.add(s);
    return { s, off: i / n, dx: (rnd() - 0.5) * spread, dz: (rnd() - 0.5) * spread };
  });
  g.userData = { kind: 'puffs', on: 1, update(t) {
    for (const p of list) {
      const k = (t * speed + p.off) % 1;
      p.s.position.set(p.dx * (1 + k * 2), k * rise, p.dz * (1 + k * 2));
      p.s.scale.setScalar(size * (0.5 + k * 1.3));
      p.s.material.opacity = Math.sin(k * Math.PI) * alpha * g.userData.on;
    }
  } };
  return g;
}
// a burst of wok fire: glowing cones that flicker; userData.flare 0 … 1 sets how big
const FIRE = [new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }), new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })];
export function flame({ r = 0.12, h = 0.3, n = 5, seed = 2 } = {}) {
  const g = new THREE.Group();
  const rnd = rng(seed);
  const tongues = Array.from({ length: n }, (_, i) => {
    const m = new THREE.Mesh(CONE(r * (0.4 + rnd() * 0.4), h, 6), FIRE[i % 2]);
    const a = (i / n) * Math.PI * 2;
    m.userData.base = [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, 0.6 + rnd() * 0.6, rnd() * 6];
    g.add(m);
    return m;
  });
  g.userData = { kind: 'flame', flare: 1, update(t) {
    const f = g.userData.flare;
    g.visible = f > 0.02;
    for (const m of tongues) {
      const [x, z, k, ph] = m.userData.base;
      const s = f * k * (0.75 + 0.25 * Math.sin(t * 17 + ph));
      m.scale.set(1, s, 1);
      m.position.set(x, (h * s) / 2, z);
    }
  } };
  return g;
}
// a ring of little blue gas flames under a pot or wok
export function gasRing(r = 0.1) {
  const g = new THREE.Group();
  const blue = new THREE.MeshBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const c = put(g, CONE(0.012, 0.05, 5), blue, Math.cos(a) * r, 0.025, Math.sin(a) * r); c.castShadow = false; }
  return g;
}
export function tickFx(t) { COAL.emissiveIntensity = 1.0 + Math.sin(t * 3.1) * 0.25 + Math.sin(t * 7.7) * 0.12; }

// ---------- moving parts (same idea as the cabin's) ----------
export function stateful(g, init, apply) {
  const cur = { ...init };
  g.userData.state = { ...init };
  const prev = g.userData.update;
  g.userData.update = (t, dt = 1 / 60) => {
    prev?.(t, dt);
    const k = Math.min(1, dt * 3.5);
    for (const key in g.userData.state) { const w = g.userData.state[key]; cur[key] = typeof w === 'number' ? cur[key] + (w - cur[key]) * k : w; }
    apply(cur, t);
  };
  apply(cur, 0);
  g.userData.pose = apply;
  return g;
}
// parts with their own update (puffs, flames, fans) inside a bigger part: run them all from the parent
export function liveAll(g) {
  const list = [];
  const walk = (o) => { for (const c of o.children) { if (c.userData.update) list.push(c); else walk(c); } }; // the nearest ones only: they run their own
  walk(g);
  const own = g.userData.update;
  g.userData.update = (t, dt) => { own?.(t, dt); for (const o of list) o.userData.update(t, dt); };
  return g;
}

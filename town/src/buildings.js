// Roads & towns — buildings (town/DESIGN.md §2.4). Buildings are put together from modules (walls, a glass
// front, a sign band, a roof with a parapet) and then baked into a few meshes. Shop names are made up.
// Conventions: the front faces +Z (the street), the ground floor sits on y = 0, origin at the footprint centre.
import * as THREE from 'three';
import { mat, mesh, box, rbox, cyl } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';

export const FLOOR = 2.6;

// styles: colours and finishes by region (§1.5)
export const STYLES = {
  okinawa: { wall: 0xf1ede4, trim: 0xd9d2c4, roof: 0xe3ddd1, accentA: 0x2fa58f, accentB: 0xe8673c, ground: 0xc9c3b6 },
  japan: { wall: 0xe8e2d6, trim: 0x8e8a82, roof: 0x55595f, accentA: 0x3a6db5, accentB: 0xe2b23a, ground: 0xbdb8ae },
};

// signs: canvas textures, one per text and colour, shared
const signs = new Map();
export function signTexture(text, { bg = '#ffffff', fg = '#1c2232', w = 512, h = 96, font = 'bold 54px sans-serif', sub = '' } = {}) {
  const k = [text, bg, fg, w, h, font, sub].join('|');
  if (signs.has(k)) return signs.get(k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((l, i) => g.fillText(l, w / 2, (sub ? h * 0.42 : h / 2) + (i - (lines.length - 1) / 2) * (h / (lines.length + 0.6))));
  if (sub) { g.font = `bold ${Math.round(h * 0.2)}px sans-serif`; g.fillText(sub, w / 2, h * 0.82); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  signs.set(k, t);
  return t;
}
const signMat = (text, opts) => mat(0xffffff, { map: signTexture(text, opts), roughness: 0.5, emissive: 0xffffff, emissiveMap: signTexture(text, opts), emissiveIntensity: 0.15 });

// ---------- modules ----------

// a plain wall panel from (x0, z0) to (x1, z1), h high, t thick
export function wall(g, [x0, z0], [x1, z1], h, m, { y = 0, t = 0.2 } = {}) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  const b = box(len, h, t, m, (x0 + x1) / 2, y + h / 2, (z0 + z1) / 2);
  b.rotation.y = -Math.atan2(dz, dx);
  g.add(b);
  return b;
}
// a glass shop front along x at z, with mullions and a pair of sliding doors in the middle (dynamic)
export function glassFront(g, width, h, z, { frame = mat(0x9aa0a6, { metalness: 0.5, roughness: 0.35 }), doorW = 1.6 } = {}) {
  const glass = mat(0xbfd9e3, { transparent: true, opacity: 0.32, roughness: 0.08, metalness: 0.1, depthWrite: false });
  g.add(box(width, h, 0.04, glass, 0, h / 2, z));
  for (let x = -width / 2; x <= width / 2 + 0.01; x += width / 6) g.add(box(0.07, h, 0.1, frame, x, h / 2, z));
  g.add(box(width, 0.08, 0.12, frame, 0, h, z));
  g.add(box(width, 0.12, 0.12, frame, 0, 0.06, z));
  const doors = [];
  for (const s of [-1, 1]) {
    const d = new THREE.Group();
    d.userData.dynamic = true;
    d.add(box(doorW / 2, h - 0.15, 0.03, glass, 0, (h - 0.15) / 2, 0));
    d.add(box(doorW / 2, 0.06, 0.05, frame, 0, h - 0.18, 0));
    d.position.set(s * doorW / 4, 0, z + 0.08);
    d.userData.x0 = d.position.x;
    d.userData.side = s;
    g.add(d);
    doors.push(d);
  }
  g.add(box(doorW + 0.3, 0.08, 0.14, frame, 0, h - 0.1, z + 0.08));
  return doors;
}
// a flat roof with a parapet and some machinery
export function flatRoof(g, w, d, y, m, { parapet = 0.45, units = 2, z = 0 } = {}) {
  g.add(box(w + 0.1, 0.25, d + 0.1, m, 0, y + 0.12, z));
  for (const [cx, cz, lw, ld] of [[0, d / 2, w, 0.16], [0, -d / 2, w, 0.16], [w / 2, 0, 0.16, d], [-w / 2, 0, 0.16, d]]) g.add(box(lw + 0.1, parapet, ld + 0.1, m, cx, y + 0.25 + parapet / 2, cz + z));
  const metal = mat(0xb7bcc2, { metalness: 0.4, roughness: 0.5 });
  for (let i = 0; i < units; i++) {
    const x = -w / 4 + i * 1.6, uz = z - d / 4;
    g.add(rbox(1.1, 0.6, 0.8, 0.06, metal, x, y + 0.55, uz));
    g.add(cyl(0.22, 0.22, 0.04, mat(0x5d6168), x, y + 0.87, uz, 14));
  }
}
// parking bays in front: n bays side by side along x, centred at (cx, cz), cars nose-in toward −Z
export function parking(g, n, cx, cz, { bay = 1.5, depth = 3.0 } = {}) {
  const asphalt = mat(0x5a5e65, { roughness: 0.95 });
  const white = mat(0xf4f0e8);
  g.add(box(n * bay + 0.6, 0.04, depth + 1.6, asphalt, cx, 0.02, cz + 0.8));
  for (let i = 0; i <= n; i++) g.add(box(0.07, 0.012, depth, white, cx - (n * bay) / 2 + i * bay, 0.045, cz));
  for (let i = 0; i < n; i++) g.add(box(0.7, 0.1, 0.14, mat(0xd8d2c4), cx - (n * bay) / 2 + (i + 0.5) * bay, 0.09, cz - depth / 2 + 0.3)); // wheel stops
}

// ---------- コンビニ (convenience store) ----------
const STORE_NAMES = [
  { name: 'まちかどマート', sub: 'MACHIKADO MART', a: 0x2fa58f, b: 0xe8673c },
  { name: 'サンゴストア', sub: 'SANGO STORE', a: 0x3a7fd0, b: 0xf2b84b },
  { name: 'ハイサイ24', sub: 'HAISAI 24', a: 0xd9465b, b: 0x2c3a57 },
];
export function convenienceStore({ style = STYLES.okinawa, brand = 0 } = {}) {
  const B = STORE_NAMES[brand % STORE_NAMES.length];
  const g = new THREE.Group();
  g.userData = { kind: 'building', building: 'convenienceStore', name: B.name };
  const W = 12, D = 9, Hh = 3.6;
  const wallM = mat(style.wall, { roughness: 0.85 });
  const trim = mat(style.trim, { roughness: 0.8 });
  const front = D / 2;
  // floor slab and the walk in front of the glass
  g.add(box(W + 0.4, 0.15, D + 0.4, mat(style.ground), 0, 0.075, 0));
  g.add(box(W, 0.15, 1.6, mat(0xdcd5c7), 0, 0.075, front + 0.8));
  // walls: back, sides, and the solid corners either side of the glass
  wall(g, [-W / 2, -D / 2], [W / 2, -D / 2], Hh, wallM, { y: 0.15 });
  wall(g, [-W / 2, -D / 2], [-W / 2, D / 2], Hh, wallM, { y: 0.15 });
  wall(g, [W / 2, -D / 2], [W / 2, D / 2], Hh, wallM, { y: 0.15 });
  wall(g, [-W / 2, front], [-W / 2 + 1.4, front], Hh, wallM, { y: 0.15 });
  wall(g, [W / 2 - 1.4, front], [W / 2, front], Hh, wallM, { y: 0.15 });
  const shop = new THREE.Group();
  shop.position.y = 0.15;
  g.add(shop);
  const doors = glassFront(shop, W - 2.8, 2.5, front);
  shop.add(box(W - 2.8, Hh - 2.5, 0.2, wallM, 0, 2.5 + (Hh - 2.5) / 2, front));
  // the sign band: colour stripes wrapping the front and the corners, the name in the middle
  const a = mat(B.a, { roughness: 0.5 }), b = mat(B.b, { roughness: 0.5 });
  const y0 = Hh + 0.15;
  // (the walls are 0.2 thick on the outline, so the band stands 0.15 proud of them)
  g.add(box(W + 0.5, 0.24, D + 0.5, a, 0, y0 - 0.42, 0));
  g.add(box(W + 0.52, 0.12, D + 0.52, b, 0, y0 - 0.24, 0));
  g.add(box(W + 0.5, 0.24, D + 0.5, a, 0, y0 - 0.06, 0));
  g.add(box(3.9, 0.84, 0.08, mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.1 }), 0, y0 - 0.24, front + 0.3));
  const name = mesh(new THREE.PlaneGeometry(3.7, 0.7), signMat(B.name, { sub: B.sub, fg: '#' + B.a.toString(16).padStart(6, '0') }), 0, y0 - 0.24, front + 0.345);
  g.add(name);
  flatRoof(g, W, D, y0, trim, { units: 3 });
  // inside, seen through the glass: shelves of goods, the counter, lights in the ceiling
  const inside = mat(0xf6f3ec, { roughness: 0.9 });
  g.add(box(W - 0.4, 0.04, D - 0.4, inside, 0, 0.17, 0));
  const goods = [0xe8673c, 0x2fa58f, 0xf2b84b, 0x3a7fd0, 0xd9465b, 0x9b7fd1];
  for (let r = 0; r < 3; r++) {
    const x = -2.6 + r * 2.2;
    g.add(box(0.7, 1.3, 4.6, mat(0xe3ded4), x, 0.8, -0.6));
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) g.add(box(0.06, 0.22, 4.4, mat(goods[(r * 3 + k + (s > 0 ? 2 : 0)) % goods.length], { roughness: 0.6 }), x + s * 0.37, 0.5 + k * 0.38, -0.6));
  }
  g.add(box(0.9, 1.6, D - 1.6, mat(0xdfe8ee, { emissive: 0xffffff, emissiveIntensity: 0.15 }), -W / 2 + 0.6, 0.95, -0.2)); // the drinks fridges along the wall
  g.add(rbox(3.4, 1.0, 0.8, 0.06, mat(0xc9b28a), 3.4, 0.65, 1.6)); // counter
  g.add(box(0.5, 0.36, 0.3, mat(0x2c3a57), 3.0, 1.33, 1.6)); // till
  for (let x = -4; x <= 4; x += 2.6) g.add(box(1.8, 0.04, 0.3, mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.9 }), x, Hh + 0.1, 0));
  // out front: bins, a bike rack, two banner flags, the tall sign by the road
  for (let i = 0; i < 3; i++) g.add(rbox(0.36, 0.8, 0.36, 0.05, mat([0x3a7fd0, 0x2fa58f, 0xf2b84b][i]), 4.6 + i * 0.42, 0.55, front + 1.1));
  for (let i = 0; i < 4; i++) g.add(box(0.05, 0.5, 0.6, mat(0xa3a7ad, { metalness: 0.5 }), -4.6 + i * 0.5, 0.4, front + 1.1));
  const flags = [];
  for (const x of [-5.2, -3.7]) {
    g.add(cyl(0.025, 0.025, 2.0, mat(0xdcdcdc), x, 1.15, front + 1.4, 6));
    const f = new THREE.Group();
    f.userData.dynamic = true;
    f.add(box(0.02, 1.2, 0.42, mat(B.b, { side: THREE.DoubleSide }), 0, 0, 0.22));
    f.position.set(x, 1.4, front + 1.4);
    g.add(f);
    flags.push(f);
  }
  const pylon = new THREE.Group();
  pylon.add(box(0.3, 4.2, 0.3, trim, 0, 2.1, 0));
  pylon.add(box(1.6, 1.4, 0.3, a, 0, 4.6, 0));
  pylon.add(mesh(new THREE.PlaneGeometry(1.4, 0.4), signMat(B.sub, { w: 512, h: 128, font: 'bold 50px sans-serif', bg: '#ffffff', fg: '#1c2232' }), 0, 4.6, 0.16));
  pylon.add(box(1.6, 0.14, 0.32, b, 0, 4.0, 0));
  pylon.position.set(W / 2 + 1.0, 0, front + 5.4);
  g.add(pylon);
  parking(g, 5, -1.2, front + 3.6);
  bakeStatic(g);
  // shoppers come and go: the doors slide open when someone is near; the flags flutter
  g.userData.doors = doors;
  g.userData.update = (t, dt, someoneNear = false) => {
    for (const d of doors) {
      const want = someoneNear ? 0.72 : 0;
      d.userData.open = (d.userData.open ?? 0) + (want - (d.userData.open ?? 0)) * Math.min(1, dt * 4);
      d.position.x = d.userData.x0 + d.userData.side * d.userData.open;
    }
    flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2.3 + i) * 0.25; f.rotation.x = Math.sin(t * 3.1 + i * 2) * 0.04; });
  };
  return g;
}

// ---------- more modules ----------

const glassM = () => mat(0x6f8fa8, { roughness: 0.15, metalness: 0.2 });
const frameM = () => mat(0xb9bdc2, { metalness: 0.5, roughness: 0.4 });
// a row of windows on a wall facing +Z at z (or −Z with face = -1): xs centres, y centre, w × h
export function windows(g, xs, y, w, h, z, { face = 1, sill = true, shutter = null } = {}) {
  for (const x of xs) {
    g.add(box(w, h, 0.04, glassM(), x, y, z + face * 0.02));
    g.add(box(w + 0.08, 0.06, 0.08, frameM(), x, y + h / 2, z + face * 0.03));
    g.add(box(0.05, h, 0.06, frameM(), x, y, z + face * 0.03));
    if (sill) g.add(box(w + 0.16, 0.06, 0.16, mat(0xd8d2c4), x, y - h / 2 - 0.03, z + face * 0.06));
    if (shutter) g.add(box(w + 0.1, 0.22, 0.14, mat(shutter), x, y + h / 2 + 0.12, z + face * 0.06)); // shutter box (typhoon shutters)
  }
}
// the same on a side wall facing ±X at x
export function windowsSide(g, zs, y, w, h, x, face = 1) {
  for (const z of zs) { g.add(box(0.04, h, w, glassM(), x + face * 0.02, y, z)); g.add(box(0.08, 0.06, w + 0.08, frameM(), x + face * 0.03, y + h / 2, z)); }
}
// a door on the +Z face
export function door(g, x, z, { w = 0.9, h = 2.0, color = 0x7a5a3a, glass = false } = {}) {
  g.add(box(w, h, 0.06, glass ? glassM() : mat(color, { roughness: 0.6 }), x, h / 2, z + 0.03));
  g.add(box(w + 0.12, 0.08, 0.1, frameM(), x, h + 0.04, z + 0.04));
  if (!glass) g.add(box(0.04, 0.12, 0.06, mat(0xc9ccd1, { metalness: 0.6 }), x + w * 0.35, h * 0.5, z + 0.08));
}
// 給水タンク: the round tank on an Okinawan roof
export function waterTank(g, x, y, z) {
  const t = mat(0xe9e6df, { roughness: 0.5, metalness: 0.2 });
  for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) g.add(box(0.08, 0.6, 0.08, mat(0x9aa0a6), x + dx, y + 0.3, z + dz));
  g.add(cyl(0.55, 0.55, 0.9, t, x, y + 1.05, z, 18));
  g.add(mesh(new THREE.SphereGeometry(0.55, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.3, 1), t, x, y + 1.5, z));
}
// シーサー: a small terracotta guardian lion, facing +Z
export function shisa(g, x, y, z, { ry = 0, color = 0xb5603e, s = 1 } = {}) {
  const c = new THREE.Group();
  const clay = mat(color, { roughness: 0.85 });
  c.add(mesh(new THREE.SphereGeometry(0.16, 10, 8).scale(0.9, 1, 1.1), clay, 0, 0.16, -0.03));
  c.add(mesh(new THREE.SphereGeometry(0.15, 10, 8), clay, 0, 0.36, 0.06));
  c.add(mesh(new THREE.SphereGeometry(0.17, 10, 6).scale(1, 0.8, 0.5), mat(0x9a4a2e, { roughness: 0.9 }), 0, 0.38, 0.0)); // mane
  for (const sx of [-1, 1]) c.add(mesh(new THREE.SphereGeometry(0.035, 6, 5), mat(0x1c1d21), sx * 0.06, 0.4, 0.19));
  c.add(box(0.12, 0.03, 0.04, mat(0x6e2e1e), 0, 0.31, 0.2)); // the mouth
  c.add(box(0.36, 0.08, 0.4, mat(0xcfc9bd), 0, 0.04, 0)); // plinth
  c.position.set(x, y, z); c.rotation.y = ry; c.scale.setScalar(s);
  g.add(c);
}
// roofs: hip (寄棟) and gable (切妻), centred on (0, y, 0), w along X, d along Z
export function hipRoof(w, d, h, m) {
  const r = Math.max(0, (w - d) / 2), hw = w / 2, hd = d / 2;
  const v = (x, y, z) => [x, y, z];
  const A = v(-hw, 0, hd), B = v(hw, 0, hd), C = v(hw, 0, -hd), D = v(-hw, 0, -hd), P = v(-r, h, 0), Q = v(r, h, 0);
  const tris = [A, B, Q, A, Q, P, C, D, P, C, P, Q, B, C, Q, D, A, P];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  geo.computeVertexNormals();
  return mesh(geo, m);
}
export function gableRoof(w, d, h, m) {
  const s = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h)]);
  return mesh(new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }).translate(0, 0, -w / 2).rotateY(Math.PI / 2), m);
}
// a striped awning over a shop front at z, width w, from height y
export function awning(g, w, y, z, colors = [0xe8673c, 0xf4f2ec], depth = 1.0) {
  const n = Math.max(2, Math.round(w / 0.5));
  for (let i = 0; i < n; i++) { const b = box(w / n, 0.05, depth, mat(colors[i % colors.length], { roughness: 0.8, side: THREE.DoubleSide }), -w / 2 + (i + 0.5) * (w / n), y, z + depth / 2); b.rotation.x = 0.35; g.add(b); }
  g.add(box(w, 0.18, 0.04, mat(colors[0]), 0, y - 0.25, z + depth * 0.95));
}
// a sign board on the +Z face
export function signBoard(g, text, w, h, x, y, z, opts = {}) {
  g.add(box(w + 0.1, h + 0.1, 0.08, mat(0x2a2d33), x, y, z + 0.04));
  g.add(mesh(new THREE.PlaneGeometry(w, h), signMat(text, { w: 512, h: Math.round(512 * h / w), font: `bold ${Math.round(300 * h / w)}px sans-serif`, ...opts }), x, y, z + 0.085));
}
// a colour band round the top edge of a box building (w × d, centred at z), with a plain roof inside it
const fascia = (g, w, d, y, h, m, z = 0) => {
  for (const [x, zz, lw, ld] of [[0, d / 2, w + 0.12, 0.12], [0, -d / 2, w + 0.12, 0.12], [w / 2, 0, 0.12, d], [-w / 2, 0, 0.12, d]]) g.add(box(lw, h, ld, m, x, y, z + zz));
  g.add(box(w - 0.1, 0.1, d - 0.1, mat(0xd8d4cb, { roughness: 0.9 }), 0, y - h / 2 + 0.25, z));
};
const lot = (g, w, d, color = 0xc9c3b6) => g.add(box(w, 0.08, d, mat(color, { roughness: 1 }), 0, 0.04, 0));
const finish = (g, kind, extra = {}) => { g.userData = { kind: 'building', building: kind, ...extra }; bakeStatic(g); return g; };

// ---------- 戸建て住宅 (Okinawan concrete house: flat roof, water tank, shisa at the gate, flower-block wall) ----------
export function house({ style = STYLES.okinawa, accent = 0x4f9d8f, floors = 2, variant = 0 } = {}) {
  const g = new THREE.Group();
  const W = 7, D = 6, H = FLOOR * floors + 0.4;
  const wallM = mat([style.wall, 0xf3e9d6, 0xe8eef0][variant % 3], { roughness: 0.9 });
  lot(g, 10, 9.6);
  g.add(box(W, H, D, wallM, 0, H / 2 + 0.08, -1));
  g.add(box(W + 0.1, 0.12, D + 0.1, mat(accent), 0, FLOOR + 0.1, -1)); // a colour band between floors
  for (let f = 0; f < floors; f++) windows(g, [-2.2, 2.0], 1.5 + f * FLOOR, 1.2, 1.0, D / 2 - 1, { shutter: 0xd8d2c4 });
  door(g, 0, D / 2 - 1, { color: 0x6b4a32 });
  g.add(box(2.0, 0.12, 1.2, wallM, 0, 2.4, D / 2 - 0.4)); // porch canopy
  if (floors > 1) { // balcony with a rail, and the washing
    g.add(box(W - 1, 0.12, 1.0, wallM, 0, FLOOR + 0.2, D / 2 - 0.5));
    g.add(box(W - 1, 0.8, 0.06, mat(0xe9e6df), 0, FLOOR + 0.66, D / 2));
    const line = new THREE.Group(); line.userData.dynamic = true;
    for (let i = 0; i < 4; i++) line.add(box(0.4, 0.5, 0.02, mat([0xf4f2ec, 0x8db6d6, 0xf2c4cf, 0xf2b84b][i]), -1.5 + i * 0.6, 0, 0));
    line.position.set(0.5, FLOOR + 1.3, D / 2 - 0.4);
    g.add(line);
  }
  flatRoof(g, W, D, H + 0.08, mat(style.trim), { parapet: 0.35, units: 1, z: -1 });
  waterTank(g, 2.0, H + 0.33, -2.2);
  // the gate: two posts with shisa, and the flower-block wall round the lot
  for (const x of [-0.9, 0.9]) { g.add(box(0.4, 1.4, 0.4, mat(0xdcd6cb), x, 0.7, 4.6)); shisa(g, x, 1.4, 4.6, { s: 0.9 }); }
  const block = mat(0xdcd6cb, { roughness: 0.95 });
  for (const [x0, x1] of [[-5, -1.1], [1.1, 5]]) g.add(box(x1 - x0, 1.2, 0.15, block, (x0 + x1) / 2, 0.6, 4.7));
  for (const x of [-5, 5]) g.add(box(0.15, 1.2, 9.4, block, x, 0.6, 0));
  g.add(box(10, 1.2, 0.15, block, 0, 0.6, -4.7));
  return finish(g, 'house');
}

// ---------- 古い平屋 (red-tile hip roof with white mortar ridges, a shisa on top, engawa, stone wall, hinpun) ----------
export function oldHouse() {
  const g = new THREE.Group();
  lot(g, 12, 11, 0xd8ccb0);
  const W = 8, D = 7;
  const wood = mat(0x8a6a4a, { roughness: 0.8 }), plaster = mat(0xf0e9da, { roughness: 0.9 });
  g.add(box(W, 0.5, D, mat(0xb8b0a0), 0, 0.25, -1.5)); // raised floor
  g.add(box(W - 0.4, 2.4, D - 0.4, plaster, 0, 1.7, -1.5));
  for (let x = -W / 2 + 0.4; x <= W / 2 - 0.4; x += 1.2) g.add(box(0.12, 2.4, 0.12, wood, x, 1.7, D / 2 - 1.5 - 0.1));
  for (let x = -W / 2 + 1.0; x < W / 2 - 0.4; x += 1.2) g.add(box(1.0, 1.9, 0.04, mat(0xf4efe2, { roughness: 0.9 }), x, 1.5, D / 2 - 1.5 - 0.15)); // sliding doors
  g.add(box(W, 0.12, 1.0, wood, 0, 0.56, D / 2 - 1.0)); // engawa
  const tile = mat(0xc4553a, { roughness: 0.8 }), mortar = mat(0xf4f2ec, { roughness: 0.9 });
  const roof = hipRoof(W + 1.6, D + 1.6, 2.2, tile); roof.position.set(0, 2.9, -1.5); g.add(roof);
  const ridge = box(W + 1.6 - (D + 1.6), 0.16, 0.22, mortar, 0, 5.12, -1.5); g.add(ridge);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { // white mortar on the hips
    const len = Math.hypot((D + 1.6) / 2, (D + 1.6) / 2, 2.2);
    const hipLine = box(0.16, 0.14, len, mortar, sx * ((W + 1.6 - (D + 1.6)) / 2 + (D + 1.6) / 4), 4.0, -1.5 + sz * (D + 1.6) / 4);
    hipLine.rotation.order = 'YXZ'; hipLine.rotation.y = Math.atan2(sx, sz); hipLine.rotation.x = Math.atan2(2.2, Math.hypot((D + 1.6) / 2, (D + 1.6) / 2));
    g.add(hipLine);
  }
  shisa(g, 0, 5.15, -1.5 + 0.1, { s: 1.3 });
  // hinpun: the screen wall just inside the gate, and the coral stone wall round the lot
  g.add(box(2.6, 1.5, 0.4, mat(0xd8d0bf, { roughness: 1 }), 0, 0.75, 3.4));
  const stone = mat(0xd8d0bf, { roughness: 1, flatShading: true });
  for (const [x0, x1] of [[-6, -1.2], [1.2, 6]]) g.add(box(x1 - x0, 1.4, 0.5, stone, (x0 + x1) / 2, 0.7, 5.3));
  for (const x of [-6, 6]) g.add(box(0.5, 1.4, 11, stone, x, 0.7, 0));
  g.add(box(12, 1.4, 0.5, stone, 0, 0.7, -5.3));
  return finish(g, 'oldHouse');
}

// ---------- アパート ----------
export function apartment({ floors = 5, accent = 0xe8673c, style = STYLES.okinawa } = {}) {
  const g = new THREE.Group();
  const W = 10, D = 8, H = floors * FLOOR + 0.3;
  const wallM = mat(style.wall, { roughness: 0.9 });
  lot(g, 13, 12);
  g.add(box(W, H, D, wallM, 0, H / 2 + 0.08, -1));
  g.add(box(0.5, H, D + 0.02, mat(accent), -W / 2 + 0.25, H / 2 + 0.08, -1)); // the colour stripe up the corner
  for (let f = 0; f < floors; f++) {
    const y = 0.08 + f * FLOOR;
    windows(g, [-3, 0, 3], y + 1.4, 1.4, 1.2, D / 2 - 1, { sill: false });
    if (f > 0) { // balconies with railings
      g.add(box(W - 0.8, 0.14, 1.2, wallM, 0.2, y + 0.1, D / 2 - 0.4));
      g.add(box(W - 0.8, 0.9, 0.08, mat(0xe9e6df), 0.2, y + 0.6, D / 2 + 0.16));
    }
    windowsSide(g, [-2.5, 0.5], y + 1.4, 1.0, 1.0, W / 2, 1);
  }
  // outside stair on the side
  const stairM = mat(0xc9c5bc);
  for (let f = 0; f < floors - 1; f++) for (let i = 0; i < 8; i++) g.add(box(1.2, 0.12, 0.35, stairM, W / 2 + 0.8, 0.08 + f * FLOOR + (i + 1) * (FLOOR / 8), -4 + i * 0.35 + (f % 2) * 0));
  g.add(box(0.06, H, 0.06, stairM, W / 2 + 1.4, H / 2, -4));
  door(g, 2.5, D / 2 - 1, { glass: true, w: 1.4 });
  flatRoof(g, W, D, H + 0.08, mat(style.trim), { parapet: 0.5, units: 2, z: -1 });
  waterTank(g, -3, H + 0.33, -3); waterTank(g, -1.4, H + 0.33, -3);
  signBoard(g, 'コーポ うりずん', 2.2, 0.5, -2.5, 2.4, D / 2 - 1 + 0.02, { bg: '#f4f2ec', fg: '#2c3a57' });
  return finish(g, 'apartment');
}

// ---------- ガソリンスタンド ----------
export function gasStation({ brand = 'ENEOKA', a = 0xd9362b, b = 0xf2b84b } = {}) {
  const g = new THREE.Group();
  lot(g, 16, 14, 0xb9b5ad);
  const canopyM = mat(0xf4f2ec, { roughness: 0.5 });
  for (const [x, z] of [[-4, -1.5], [4, -1.5], [-4, 3.5], [4, 3.5]]) g.add(box(0.4, 4.4, 0.4, mat(0xd8d4cb), x, 2.2, z));
  g.add(box(13, 0.5, 8, canopyM, 0, 4.6, 1));
  g.add(box(13.05, 0.26, 8.05, mat(a), 0, 4.65, 1));
  g.add(box(13.06, 0.08, 8.06, mat(b), 0, 4.45, 1));
  g.add(box(12, 0.05, 7, mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), 0, 4.33, 1));
  signBoard(g, brand, 3, 0.55, 0, 4.65, 5.0, { bg: '#' + a.toString(16).padStart(6, '0'), fg: '#ffffff' });
  for (const z of [-0.2, 2.2]) { // pump islands
    g.add(box(4.5, 0.2, 0.9, mat(0xd8d4cb), 0, 0.18, z));
    for (const x of [-1.2, 1.2]) {
      g.add(box(0.7, 1.5, 0.45, mat(0xf4f2ec), x, 1.03, z));
      g.add(box(0.72, 0.3, 0.47, mat(a), x, 1.6, z));
      g.add(box(0.4, 0.3, 0.02, mat(0x1c2232, { emissive: 0x3fbf9f, emissiveIntensity: 0.4 }), x, 1.2, z + 0.24));
    }
  }
  // the shop at the back, and the price sign by the road
  g.add(box(8, 3.2, 4, mat(0xf4f2ec), 0, 1.68, -5));
  windows(g, [-2.5, -0.8, 0.9], 1.6, 1.4, 1.6, -3, {});
  door(g, 2.6, -3, { glass: true, w: 1.4 });
  g.add(box(8.05, 0.4, 4.05, mat(a), 0, 3.1, -5));
  const pylon = new THREE.Group();
  pylon.add(box(0.3, 3.2, 0.3, mat(0xd8d4cb), 0, 1.6, 0));
  pylon.add(box(1.6, 2.2, 0.3, mat(0x1c2232), 0, 3.6, 0));
  pylon.add(mesh(new THREE.PlaneGeometry(1.4, 1.9), signMat('レギュラー 168\nハイオク 179\n軽油 148', { w: 256, h: 340, font: 'bold 34px sans-serif', bg: '#1c2232', fg: '#ffd27a' }), 0, 3.6, 0.16));
  pylon.position.set(6.8, 0, 6.2);
  g.add(pylon);
  return finish(g, 'gasStation');
}

// ---------- ドライブインの店 (an old American-style burger drive-in; a made-up name) ----------
export function driveIn() {
  const g = new THREE.Group();
  lot(g, 16, 14, 0xb9b5ad);
  const brown = mat(0x7a4a2a, { roughness: 0.6 }), orange = mat(0xe8673c, { roughness: 0.5 }), cream = mat(0xf3e9d6, { roughness: 0.8 });
  g.add(box(9, 3.4, 7, cream, 0, 1.78, -3));
  windows(g, [-3, -1.2, 0.6], 1.6, 1.5, 1.8, 0.5, { sill: false });
  door(g, 2.8, 0.5, { glass: true, w: 1.2 });
  g.add(box(9.6, 0.5, 7.6, orange, 0, 3.6, -3));
  g.add(box(9.62, 0.12, 7.62, brown, 0, 3.32, -3));
  // the big sign on the roof: a ring with the name
  const ring = mesh(new THREE.TorusGeometry(1.3, 0.16, 10, 28), orange, 0, 6.0, -3); g.add(ring);
  g.add(cyl(1.15, 1.15, 0.2, brown, 0, 6.0, -3, 28).rotateX(Math.PI / 2));
  g.add(mesh(new THREE.PlaneGeometry(2.0, 0.9), signMat('ROCKET', { w: 512, h: 230, font: 'italic bold 120px sans-serif', bg: '#7a4a2a', fg: '#f3e9d6', sub: 'BURGER' }), 0, 6.0, -2.88));
  g.add(box(0.3, 1.6, 0.3, brown, 0, 4.6, -3));
  // car-hop stalls: a long canopy with menu boards
  g.add(box(14, 0.25, 3, orange, 0, 2.7, 4.8));
  for (let x = -6.5; x <= 6.5; x += 3.25) { g.add(box(0.2, 2.6, 0.2, brown, x, 1.35, 3.6)); g.add(box(0.5, 0.7, 0.08, mat(0x1c2232, { emissive: 0xffc870, emissiveIntensity: 0.3 }), x, 1.4, 3.75)); }
  for (let x = -5; x <= 5; x += 3.25) g.add(box(0.07, 0.012, 4, mat(0xf4f0e8), x - 1.6, 0.09, 5.2));
  return finish(g, 'driveIn');
}

// ---------- スーパー ----------
export function supermarket() {
  const g = new THREE.Group();
  const W = 20, D = 16, Hh = 5;
  lot(g, W + 2, D + 2);
  g.add(box(W, Hh, D, mat(0xf1ede4, { roughness: 0.9 }), 0, Hh / 2 + 0.08, 0));
  fascia(g, W, D, Hh - 0.2, 1.0, mat(0x3a7fd0));
  signBoard(g, 'まるみつスーパー', 6, 0.9, 0, Hh - 0.2, D / 2 + 0.05, { bg: '#ffffff', fg: '#3a7fd0' });
  g.add(box(8, 3, 0.06, mat(0xbfd9e3, { transparent: true, opacity: 0.4, depthWrite: false }), 0, 1.6, D / 2 + 0.03));
  for (let x = -4; x <= 4; x += 1.6) g.add(box(0.08, 3, 0.1, frameM(), x, 1.6, D / 2 + 0.05));
  g.add(box(9, 0.25, 2.4, mat(0xe9e6df), 0, 3.3, D / 2 + 1.2)); // entrance canopy
  for (const x of [-4.3, 4.3]) g.add(box(0.2, 3.2, 0.2, frameM(), x, 1.65, D / 2 + 2.3));
  for (let i = 0; i < 6; i++) { // trolleys lined up
    const c = new THREE.Group();
    c.add(box(0.5, 0.4, 0.7, mat(0xb9bdc2, { metalness: 0.6, roughness: 0.3 }), 0, 0.65, 0));
    c.add(box(0.5, 0.05, 0.7, mat(0x9aa0a6), 0, 0.3, 0));
    c.position.set(7 + 0, 0, D / 2 + 1 + i * 0.25);
    g.add(c);
  }
  for (let x = -8; x <= 8; x += 4) g.add(rbox(1.6, 0.8, 1.2, 0.08, mat(0xb7bcc2, { metalness: 0.4 }), x, Hh + 0.5, -4));
  return finish(g, 'supermarket');
}

// ---------- レンタカー営業所 (the office; put a parkingLot of identical vans beside it) ----------
export function rentalOffice({ name = 'でいごレンタカー', color = 0xd23a2a } = {}) {
  const g = new THREE.Group();
  lot(g, 12, 10);
  g.add(box(10, 3.6, 7, mat(0xf4f2ec), 0, 1.88, -1));
  fascia(g, 10, 7, 3.45, 0.6, mat(color), -1);
  signBoard(g, name, 4.2, 0.6, 0, 3.45, 2.55, { bg: '#ffffff', fg: '#' + color.toString(16).padStart(6, '0'), sub: 'RENT A CAR' });
  g.add(box(8, 2.5, 0.06, mat(0xbfd9e3, { transparent: true, opacity: 0.4, depthWrite: false }), 0, 1.4, 2.53));
  for (let x = -4; x <= 4; x += 2) g.add(box(0.08, 2.5, 0.1, frameM(), x, 1.4, 2.56));
  g.add(box(9.5, 0.04, 2, mat(0xdcd5c7), 0, 0.1, 3.6)); // the walk in front
  // the shuttle bus stop: a marked bay and a sign
  g.add(box(0.06, 2.2, 0.06, frameM(), 4.6, 1.1, 4.4));
  g.add(mesh(new THREE.PlaneGeometry(0.9, 0.5), signMat('送迎バス', { w: 256, h: 140, font: 'bold 52px sans-serif', bg: '#' + color.toString(16).padStart(6, '0'), fg: '#ffffff', sub: 'SHUTTLE' }), 4.6, 2.1, 4.44));
  deigoPots(g);
  return finish(g, 'rentalOffice');
}
function deigoPots(g) { for (const x of [-4.4, -3.4]) { g.add(cyl(0.3, 0.24, 0.5, mat(0xb5603e), x, 0.33, 3.9, 12)); g.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), mat(0x4f8a3f), x, 0.85, 3.9)); } }

// ---------- 土産物屋 (bingata cloth, shisa figures, T-shirts) ----------
export function souvenirShop({ name = 'おみやげ ちゅら屋' } = {}) {
  const g = new THREE.Group();
  lot(g, 10, 8, 0xd8d2c4);
  const W = 8, D = 6;
  g.add(box(W, 3.6, 0.2, mat(0xf3e9d6), 0, 1.88, -D / 2));
  for (const x of [-W / 2, W / 2]) g.add(box(0.2, 3.6, D, mat(0xf3e9d6), x, 1.88, 0));
  g.add(box(W + 0.3, 0.3, D + 0.3, mat(0xc4553a), 0, 3.8, 0));
  awning(g, W, 3.1, D / 2, [0x2fa58f, 0xf4f2ec]);
  signBoard(g, name, 3.6, 0.55, 0, 3.8, D / 2 + 0.12, { bg: '#2fa58f', fg: '#ffffff' });
  // goods: tables of shisa figures, hanging bingata cloth, a T-shirt rack
  const table = mat(0x8a6a4a);
  for (const x of [-2.2, 0.6]) {
    g.add(box(2.0, 0.8, 1.0, table, x, 0.48, 1.2));
    for (let i = 0; i < 6; i++) shisa(g, x - 0.8 + i * 0.32, 0.88, 1.2, { s: 0.45, color: [0xb5603e, 0x3a7fd0, 0xf2b84b][i % 3] });
  }
  const bingata = ['#e8673c', '#f2b84b', '#2fa58f', '#d23a8a', '#3a7fd0'];
  bingata.forEach((col, i) => g.add(mesh(new THREE.PlaneGeometry(0.6, 1.2), mat(parseInt(col.slice(1), 16), { side: THREE.DoubleSide, roughness: 0.8 }), -3.2 + i * 0.8, 2.2, -D / 2 + 0.2)));
  g.add(box(2.4, 0.05, 0.05, frameM(), 2.6, 2.0, 0.2));
  for (let i = 0; i < 5; i++) g.add(box(0.5, 0.6, 0.04, mat(bingata[i]), 1.7 + i * 0.45, 1.55, 0.2));
  return finish(g, 'souvenirShop');
}

// ---------- ホテル（リゾート）: stepped balconies facing the sea (+Z), a porte-cochère ----------
export function hotel({ floors = 7, name = 'HOTEL CORAL' } = {}) {
  const g = new THREE.Group();
  const W = 24, D = 12;
  lot(g, W + 4, D + 10, 0xd8d2c4);
  const wallM = mat(0xf4f2ec, { roughness: 0.85 });
  for (let f = 0; f < floors; f++) {
    const step = Math.max(0, f - 2) * 0.6; // upper floors step back
    const y = 0.08 + f * FLOOR;
    g.add(box(W - step * 2, FLOOR, D - step, wallM, 0, y + FLOOR / 2, -1 - step / 2));
    if (f > 0) {
      g.add(box(W - step * 2, 0.15, 1.2, wallM, 0, y + 0.08, D / 2 - 1 - step + 0.6));
      g.add(box(W - step * 2, 0.8, 0.06, mat(0xbfd9e3, { transparent: true, opacity: 0.5, depthWrite: false }), 0, y + 0.55, D / 2 - 1 - step + 1.2));
      for (let x = -W / 2 + 1.5 + step; x < W / 2 - step; x += 3) g.add(box(2.4, 1.9, 0.04, glassM(), x, y + 1.25, D / 2 - 1 - step + 0.01));
    }
  }
  g.add(box(10, 2.6, 0.06, glassM(), 0, 1.4, D / 2 - 0.98));
  g.add(box(8, 0.35, 5, mat(0xe9e6df), 0, 3.0, D / 2 + 1.5)); // porte-cochère
  for (const x of [-3.6, 3.6]) g.add(box(0.35, 3.0, 0.35, mat(0xd8d2c4), x, 1.5, D / 2 + 3.6));
  signBoard(g, name, 4, 0.5, 0, 3.0, D / 2 + 4.0, { bg: '#2c3a57', fg: '#f3e9d6' });
  return finish(g, 'hotel');
}

// ---------- 商店街の店 (shop below, home above): kind = bakery | flowers | grocery | cafe ----------
export function shopHouse({ kind = 'grocery', color = 0xe8e2d6 } = {}) {
  const S = { bakery: ['パン工房', [0xc98a4a, 0xf4f2ec], 0xe9c38a], flowers: ['はなや', [0xd23a8a, 0xf4f2ec], 0xd63a8a], grocery: ['青果 まーさん', [0x2fa58f, 0xf4f2ec], 0x6fae4c], cafe: ['喫茶 ゆんたく', [0x7a4a2a, 0xf3e9d6], 0x7a4a2a] }[kind];
  const g = new THREE.Group();
  const W = 5, D = 8;
  lot(g, W, D + 1.5, 0xd8d2c4);
  const wallM = mat(color, { roughness: 0.9 });
  g.add(box(W, FLOOR * 2 + 0.4, 0.2, wallM, 0, FLOOR + 0.28, -D / 2));
  for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) g.add(box(0.2, FLOOR * 2 + 0.4, D, wallM, x, FLOOR + 0.28, 0));
  g.add(box(W, FLOOR * 1 + 0.2, D, wallM, 0, FLOOR * 1.5 + 0.38, -0.2));
  windows(g, [-1.2, 1.2], FLOOR + 1.5, 1.2, 1.0, D / 2 - 0.2, {});
  g.add(box(W - 0.4, 0.5, 0.1, mat(0x9aa0a6, { metalness: 0.5 }), 0, FLOOR - 0.15, D / 2 - 0.2)); // the rolled-up shutter
  awning(g, W - 0.2, FLOOR - 0.45, D / 2 - 0.2, S[1], 0.9);
  signBoard(g, S[0], 3, 0.55, 0, FLOOR * 2 + 0.2, D / 2 - 0.15, { bg: '#f4f2ec', fg: '#1c2232' });
  // goods out front
  g.add(box(2.6, 0.7, 0.8, mat(0x8a6a4a), 0, 0.43, D / 2 + 0.2));
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(S[2]), -1.05 + i * 0.42, 0.9, D / 2 + 0.2));
  return finish(g, 'shopHouse', { shop: kind });
}

// ---------- 市場 (an arcade over a lane: fish and fruit stalls) ----------
export function market() {
  const g = new THREE.Group();
  const L = 20, W = 8;
  lot(g, L, W + 6, 0xcfcac0);
  for (let x = -L / 2 + 1; x <= L / 2 - 1; x += 3) for (const s of [1, -1]) g.add(box(0.25, 4.2, 0.25, frameM(), x, 2.1, s * W / 2));
  const roof = mesh(new THREE.CylinderGeometry(W / 2 + 0.3, W / 2 + 0.3, L, 24, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), mat(0xe8f0f2, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), 0, 4.2, 0);
  g.add(roof);
  const fish = [0xd23a2a, 0x3a7fd0, 0x2fa58f, 0xf2b84b, 0x9b7fd1];
  const fruit = [0xf2b84b, 0x6fae4c, 0xe8673c, 0xd63a8a];
  for (let x = -L / 2 + 2; x < L / 2 - 1; x += 3.4) for (const s of [1, -1]) {
    const isFish = (Math.round(x) + s) % 2 === 0;
    g.add(box(2.6, 0.85, 1.4, mat(isFish ? 0xe9e6df : 0x8a6a4a), x, 0.5, s * (W / 2 - 1.2)));
    for (let i = 0; i < 8; i++) {
      const c = (isFish ? fish : fruit)[i % 4];
      const piece = isFish ? mesh(new THREE.SphereGeometry(0.16, 8, 6).scale(1.8, 0.5, 0.8), mat(c), x - 1.0 + (i % 4) * 0.66, 1.0, s * (W / 2 - 1.2) + (i < 4 ? -0.3 : 0.3)) : mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(c), x - 1.0 + (i % 4) * 0.66, 1.02, s * (W / 2 - 1.2) + (i < 4 ? -0.3 : 0.3));
      g.add(piece);
    }
    signBoard(g, isFish ? '鮮魚' : '果物', 1.2, 0.4, x, 3.0, s * (W / 2 - 0.6) - (s > 0 ? 0.1 : -0.1), {});
  }
  signBoard(g, 'まちぐゎー市場', 4, 0.7, 0, 4.6, W / 2 + 0.4, { bg: '#d23a2a', fg: '#ffffff' });
  return finish(g, 'market');
}

// ---------- 学校 (3 floors, a clock, a sandy schoolyard with goals) ----------
export function school() {
  const g = new THREE.Group();
  const W = 30, D = 10;
  lot(g, W + 4, 34, 0xd8c8a0);
  const wallM = mat(0xf1ede4, { roughness: 0.9 });
  g.add(box(W, 3 * FLOOR + 0.4, D, wallM, 0, (3 * FLOOR + 0.4) / 2 + 0.08, -10));
  for (let f = 0; f < 3; f++) {
    windows(g, Array.from({ length: 12 }, (_, i) => -13.2 + i * 2.4), 1.5 + f * FLOOR, 1.8, 1.4, -10 + D / 2, { sill: false });
    g.add(box(W + 0.05, 0.16, D + 0.05, mat(0xd8d2c4), 0, f * FLOOR + 0.08, -10));
  }
  g.add(cyl(0.8, 0.8, 0.1, mat(0xf4f2ec), 0, 3 * FLOOR + 1.1, -10 + D / 2 + 0.1, 24).rotateX(Math.PI / 2));
  g.add(box(0.06, 0.6, 0.04, mat(0x1c2232), 0, 3 * FLOOR + 1.25, -10 + D / 2 + 0.17));
  g.add(box(0.45, 0.06, 0.04, mat(0x1c2232), 0.18, 3 * FLOOR + 1.1, -10 + D / 2 + 0.17));
  g.add(box(3, 0.6, 3, wallM, 0, 3 * FLOOR + 0.9, -10)); // the clock tower block
  // the schoolyard: goals and a running track line
  for (const x of [-12, 12]) { g.add(box(0.1, 2, 0.1, mat(0xf4f2ec), x, 1, 4)); g.add(box(0.1, 2, 0.1, mat(0xf4f2ec), x, 1, 8)); g.add(box(0.1, 0.1, 4, mat(0xf4f2ec), x, 2, 6)); }
  const track = new THREE.Mesh(new THREE.RingGeometry(7.6, 7.8, 48).rotateX(-Math.PI / 2), mat(0xf4f2ec)); track.scale.set(1.5, 1, 0.9); track.position.set(0, 0.09, 6); g.add(track);
  return finish(g, 'school');
}

// ---------- 病院・役所 (white blocks with an entrance canopy; no red cross — that emblem is protected) ----------
export function publicBuilding({ kind = 'hospital' } = {}) {
  const g = new THREE.Group();
  const W = 20, D = 14, floors = 4;
  lot(g, W + 4, D + 8);
  const wallM = mat(0xf6f4ef, { roughness: 0.85 });
  g.add(box(W, floors * FLOOR + 0.4, D, wallM, 0, (floors * FLOOR + 0.4) / 2 + 0.08, -2));
  for (let f = 0; f < floors; f++) windows(g, Array.from({ length: 7 }, (_, i) => -8.4 + i * 2.8), 1.5 + f * FLOOR, 2.0, 1.3, -2 + D / 2, { sill: false });
  g.add(box(8, 0.35, 4, mat(0xe9e6df), 0, 3.0, D / 2 + 0));
  for (const x of [-3.6, 3.6]) g.add(box(0.3, 3.0, 0.3, frameM(), x, 1.5, D / 2 + 1.8));
  door(g, 0, -2 + D / 2, { glass: true, w: 2.4, h: 2.4 });
  const label = kind === 'hospital' ? ['なは中央病院', '#2fa58f'] : ['市役所', '#2c3a57'];
  signBoard(g, label[0], 4.4, 0.7, 0, floors * FLOOR - 0.5, -2 + D / 2 + 0.02, { bg: '#ffffff', fg: label[1] });
  if (kind === 'hospital') g.add(mesh(new THREE.PlaneGeometry(1, 1), signMat('＋', { w: 128, h: 128, font: 'bold 110px sans-serif', bg: '#2fa58f', fg: '#ffffff' }), -6, floors * FLOOR - 0.5, -2 + D / 2 + 0.03));
  return finish(g, kind);
}

// ---------- 立体駐車場 (open decks on columns, a ramp, a P sign) ----------
export function parkingGarage({ decks = 3 } = {}) {
  const g = new THREE.Group();
  const W = 16, D = 24;
  lot(g, W + 2, D + 2, 0x9a9890);
  const conc = mat(0xc9c5bc, { roughness: 0.9 });
  for (let k = 1; k <= decks; k++) {
    const y = k * 2.7;
    g.add(box(W, 0.3, D, conc, 0, y, 0));
    for (const s of [1, -1]) { g.add(box(W, 0.9, 0.15, conc, 0, y + 0.6, s * D / 2)); g.add(box(0.15, 0.9, D, conc, s * W / 2, y + 0.6, 0)); }
  }
  for (let x = -W / 2 + 0.3; x <= W / 2; x += 5.2) for (let z = -D / 2 + 0.3; z <= D / 2; z += 5.8) g.add(box(0.4, decks * 2.7, 0.4, conc, x, decks * 2.7 / 2, z));
  const ramp = box(3, 0.3, 8.5, conc, W / 2 + 1.6, 1.35, 4); ramp.rotation.x = Math.atan2(2.7, 8.5); g.add(ramp);
  const p = new THREE.Group();
  p.add(box(0.3, 3, 0.3, frameM(), 0, 1.5, 0));
  p.add(mesh(new THREE.PlaneGeometry(1.4, 1.4), signMat('P', { w: 256, h: 256, font: 'bold 220px sans-serif', bg: '#1f5fa8', fg: '#ffffff' }), 0, 3.6, 0.01));
  p.position.set(W / 2 + 3.4, 0, D / 2);
  g.add(p);
  return finish(g, 'parkingGarage', { decks: Array.from({ length: decks }, (_, k) => (k + 1) * 2.7 + 0.15) });
}

// ---------- 倉庫 (corrugated walls, big shutters, a low gable roof) ----------
export function warehouse() {
  const g = new THREE.Group();
  const W = 20, D = 14, Hh = 7;
  lot(g, W + 4, D + 6, 0xa9a59c);
  const corr = mat(0xc4c8cd, { roughness: 0.55, metalness: 0.4 });
  g.add(box(W, Hh, D, corr, 0, Hh / 2 + 0.08, 0));
  for (let x = -W / 2; x <= W / 2; x += 0.5) g.add(box(0.06, Hh, 0.04, mat(0xaeb3b9, { metalness: 0.4 }), x, Hh / 2 + 0.08, D / 2 + 0.02));
  for (const x of [-5, 0, 5]) { g.add(box(3.6, 4.2, 0.1, mat(0x8e9298, { metalness: 0.3 }), x, 2.18, D / 2 + 0.06)); for (let y = 0.4; y < 4.2; y += 0.25) g.add(box(3.6, 0.03, 0.12, mat(0x7a7e84), x, y, D / 2 + 0.08)); }
  const roof = gableRoof(W + 0.6, D + 0.6, 1.6, mat(0x6f7e8c, { roughness: 0.6, metalness: 0.3 })); roof.position.y = Hh + 0.08; g.add(roof);
  signBoard(g, '那覇港運 第3倉庫', 6, 0.7, 0, Hh - 0.8, D / 2 + 0.1, { bg: '#f4f2ec', fg: '#2c3a57' });
  return finish(g, 'warehouse');
}

// ---------- 御嶽（うたき）/ 神社: a sacred grove — or, for the Japan style, a red torii and a small shrine ----------
export function sacredPlace({ style = 'okinawa', tree = null } = {}) {
  const g = new THREE.Group();
  lot(g, 12, 12, 0xbfb59c);
  if (style === 'okinawa') {
    const stone = mat(0xd8d0bf, { roughness: 1, flatShading: true });
    for (const [x, z, w, d] of [[0, -4, 8, 0.6], [-4, 0, 0.6, 8], [4, 0, 0.6, 8], [-2.6, 4, 2.8, 0.6], [2.6, 4, 2.8, 0.6]]) g.add(box(w, 0.9, d, stone, x, 0.45, z));
    g.add(mesh(new THREE.DodecahedronGeometry(0.6, 0), stone, 0, 0.5, -2.6)); // the stone where prayers are offered
    g.add(box(0.8, 0.12, 0.4, mat(0x8a8478), 0, 0.12, -1.8)); // incense tray
    if (tree) { tree.position.set(1.5, 0, -1); g.add(tree); }
  } else {
    const red = mat(0xd23a2a, { roughness: 0.6 }), black = mat(0x1c1d21);
    for (const x of [-1.3, 1.3]) g.add(cyl(0.14, 0.16, 3.2, red, x, 1.6, 4, 12));
    g.add(box(3.6, 0.22, 0.3, black, 0, 3.3, 4)); g.add(box(3.2, 0.18, 0.24, red, 0, 2.8, 4));
    g.add(box(2.4, 1.6, 2.0, mat(0x8a6a4a), 0, 1.0, -2.5));
    const roof = gableRoof(2.8, 3.0, 1.0, mat(0x55595f)); roof.position.set(0, 1.8, -2.5); g.add(roof);
    g.add(box(0.8, 0.1, 6, mat(0xd8d2c4), 0, 0.1, 1));
  }
  return finish(g, style === 'okinawa' ? 'utaki' : 'shrine');
}

// ---------- 公園: lawn, paths, a slide, swings, a sandpit, benches, a toilet ----------
export function park({ trees = [] } = {}) {
  const g = new THREE.Group();
  g.add(box(24, 0.08, 24, mat(0xa9c98a, { roughness: 1 }), 0, 0.04, 0));
  g.add(box(2, 0.1, 24, mat(0xd8cfb8), 0, 0.06, 0));
  g.add(box(24, 0.1, 2, mat(0xd8cfb8), 0, 0.06, 0));
  // slide
  const red = mat(0xd23a2a), yellow = mat(0xf2b84b), steel = frameM();
  g.add(box(1.2, 1.6, 1.2, red, -6, 0.8, -6));
  const sl = box(0.8, 0.08, 3.2, yellow, -6, 0.85, -4.2); sl.rotation.x = -0.52; g.add(sl);
  for (let i = 0; i < 5; i++) g.add(box(0.8, 0.06, 0.2, steel, -6, 0.3 + i * 0.3, -7.0 - i * 0.12));
  // swings
  for (const x of [4, 7]) { const a = box(0.1, 2.4, 0.1, steel, x, 1.2, -6); a.rotation.z = 0.1; g.add(a); }
  g.add(box(3.4, 0.1, 0.1, steel, 5.5, 2.4, -6));
  const swings = [];
  for (const x of [4.8, 6.2]) { const s = new THREE.Group(); s.userData.dynamic = true; s.add(box(0.03, 1.7, 0.03, steel, 0, -0.85, -0.2)); s.add(box(0.03, 1.7, 0.03, steel, 0, -0.85, 0.2)); s.add(box(0.5, 0.06, 0.45, red, 0, -1.7, 0)); s.position.set(x, 2.4, -6); g.add(s); swings.push(s); }
  // sandpit, benches, toilet
  g.add(box(3, 0.2, 3, mat(0xc9b48e), 6, 0.14, 6));
  for (const [x, z] of [[-3, 3], [3, -3]]) { g.add(box(1.6, 0.08, 0.45, mat(0x8a6a4a), x, 0.45, z)); g.add(box(1.6, 0.4, 0.06, mat(0x8a6a4a), x, 0.7, z - 0.2)); }
  g.add(box(2.4, 2.6, 2, mat(0xe9e6df), -8, 1.35, 7)); g.add(box(2.7, 0.2, 2.3, mat(0x2fa58f), -8, 2.7, 7));
  trees.forEach((t, i) => { t.position.set([-9, 9, 9, -2][i % 4], 0, [-9, -9, 9, 9][i % 4]); g.add(t); });
  finish(g, 'park');
  g.userData.update = (t) => swings.forEach((s, i) => (s.rotation.z = Math.sin(t * 1.8 + i * 1.3) * 0.35));
  return g;
}

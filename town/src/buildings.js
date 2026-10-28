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
  g.fillText(text, w / 2, sub ? h * 0.42 : h / 2);
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
export function flatRoof(g, w, d, y, m, { parapet = 0.45, units = 2 } = {}) {
  g.add(box(w + 0.1, 0.25, d + 0.1, m, 0, y + 0.12, 0));
  for (const [cx, cz, lw, ld] of [[0, d / 2, w, 0.16], [0, -d / 2, w, 0.16], [w / 2, 0, 0.16, d], [-w / 2, 0, 0.16, d]]) g.add(box(lw + 0.1, parapet, ld + 0.1, m, cx, y + 0.25 + parapet / 2, cz));
  const metal = mat(0xb7bcc2, { metalness: 0.4, roughness: 0.5 });
  for (let i = 0; i < units; i++) {
    const x = -w / 4 + i * 1.6, z = -d / 4;
    g.add(rbox(1.1, 0.6, 0.8, 0.06, metal, x, y + 0.55, z));
    g.add(cyl(0.22, 0.22, 0.04, mat(0x5d6168), x, y + 0.87, z, 14));
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

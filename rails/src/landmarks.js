// The landmarks (rails/DESIGN.md §1.3): Tokyo Station's red-brick Marunouchi building, Tokyo Tower, the Skytree at the
// north-east corner, the Metropolitan Government towers and the other tall ones, the Shibuya scramble, and the hills
// with the tunnel mouths at the board's edges. Plain parts, shared materials; the static ones are baked by the caller.
import * as THREE from 'three';
import { mat, box, cyl, mesh } from '../../airport/src/parts.js';
import { BOARD } from './network.js';

// plots to keep clear of the town's blocks: [x, z, radius]
export const PLOTS = {
  tokyoStation: [3.88, -0.35, 0.6], tokyoTower: [0.98, 4.75, 0.35], skytree: [11.0, -7.0, 0.35], tocho: [-8.73, -2.12, 0.42],
  sunshine: [-3.87, -10.83, 0.25], roppongi: [-1.95, 4.34, 0.25], scramble: [-6.4, 4.95, 0.2], crossing: [-7.6, 4.7, 0.42],
  westHill: [BOARD.x0 + 0.4, -5.2, 1.0], eastHill: [BOARD.x1 - 0.4, -3.3, 0.85],
};
export const keep = () => Object.values(PLOTS);

// the tall towers go in with the town's blocks (one instanced mesh): { x, z, w, d, h, yaw, color }
export function towers() {
  const [tx, tz] = PLOTS.tocho, [sx, sz] = PLOTS.sunshine, [rx, rz] = PLOTS.roppongi, [qx, qz] = PLOTS.scramble;
  const stone = 0xd2ccc0;
  return [
    // the Tokyo Metropolitan Government Building: a wide base, twin towers, their tops turned
    { x: tx, z: tz + 0.08, w: 0.62, d: 0.3, h: 0.5, color: stone, kind: 2 },
    { x: tx - 0.17, z: tz - 0.02, w: 0.24, d: 0.24, h: 1.05, color: stone, kind: 2 }, { x: tx + 0.17, z: tz - 0.02, w: 0.24, d: 0.24, h: 1.05, color: stone, kind: 2 },
    { x: tx - 0.17, z: tz - 0.02, w: 0.17, d: 0.17, h: 1.13, yaw: Math.PI / 4, color: stone, kind: 2 }, { x: tx + 0.17, z: tz - 0.02, w: 0.17, d: 0.17, h: 1.13, yaw: Math.PI / 4, color: stone, kind: 2 },
    { x: sx, z: sz, w: 0.3, d: 0.2, h: 0.98, color: 0xc4c8cc, kind: 2 }, // Sunshine 60
    { x: rx, z: rz, w: 0.3, d: 0.3, h: 0.92, yaw: 0.4, color: 0x9fb2c2, kind: 3 }, // Roppongi Hills
    { x: qx, z: qz, w: 0.22, d: 0.2, h: 0.9, color: 0xb9c6cf, kind: 3 }, // Shibuya Scramble Square
  ];
}

export function landmarks() {
  const g = new THREE.Group();
  g.add(tokyoStation(), tokyoTower(), skytree(), crossing());
  g.add(hill(PLOTS.westHill[0], PLOTS.westHill[1], 1), hill(PLOTS.eastHill[0], PLOTS.eastHill[1], -1));
  return g;
}

// Tokyo Station, Marunouchi side: a long red-brick front with white stone bands, a dome at each end, the middle raised
function tokyoStation() {
  const g = new THREE.Group(), [x, z] = PLOTS.tokyoStation, brick = mat(0xb5653f, { roughness: 0.85 }), white = mat(0xf2ede2), slate = mat(0x6b7078, { roughness: 0.6 });
  const L = 1.1, W = 0.16;
  g.add(box(W, 0.12, L, brick, 0, 0.06, 0));
  for (const y of [0.035, 0.08, 0.118]) g.add(box(W + 0.004, 0.006, L + 0.004, white, 0, y, 0)); // the stone bands
  g.add(box(W * 0.8, 0.02, L * 0.98, slate, 0, 0.13, 0)); // the roof
  g.add(box(W + 0.02, 0.15, 0.14, brick, 0, 0.075, 0), box(W + 0.024, 0.008, 0.144, white, 0, 0.15, 0)); // the middle
  for (const s of [-1, 1]) {
    g.add(box(W + 0.05, 0.15, 0.2, brick, 0, 0.075, s * (L / 2 - 0.08)), box(W + 0.054, 0.008, 0.204, white, 0, 0.15, s * (L / 2 - 0.08)));
    g.add(cyl(0.085, 0.1, 0.03, slate, 0, 0.17, s * (L / 2 - 0.08), 8), mesh(new THREE.SphereGeometry(0.085, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), slate, 0, 0.185, s * (L / 2 - 0.08)));
    g.add(cyl(0.008, 0.012, 0.03, white, 0, 0.27, s * (L / 2 - 0.08), 6));
  }
  g.position.set(x, 0, z);
  return g;
}

// Tokyo Tower: four-sided lattice in international orange and white, two observation decks, the antenna
function tokyoTower() {
  const g = new THREE.Group(), [x, z] = PLOTS.tokyoTower, orange = mat(0xe8562a, { roughness: 0.55 }), white = mat(0xf4f0e8, { roughness: 0.55 }), deck = mat(0x8a9aa8, { metalness: 0.3, roughness: 0.4 });
  const seg = (r0, r1, y0, y1, m) => { const c = cyl(r1, r0, y1 - y0, m, 0, (y0 + y1) / 2, 0, 4); c.rotation.y = Math.PI / 4; g.add(c); };
  const H = [0, 0.16, 0.3, 0.44, 0.58, 0.72, 0.86, 1.0, 1.12];
  for (let i = 0; i < H.length - 1; i++) { const r = (y) => 0.2 * Math.pow(1 - y / 1.25, 2.2) + 0.012; seg(r(H[i]), r(H[i + 1]), H[i], H[i + 1], i % 2 ? white : orange); }
  for (const s of [-1, 1]) for (const t of [-1, 1]) g.add(box(0.07, 0.12, 0.07, orange, s * 0.13, 0.06, t * 0.13)); // the four feet
  g.add(cyl(0.09, 0.08, 0.05, deck, 0, 0.4, 0, 8), cyl(0.045, 0.04, 0.03, deck, 0, 0.82, 0, 8));
  g.add(cyl(0.006, 0.01, 0.3, white, 0, 1.25, 0, 5));
  g.position.set(x, 0, z);
  return g;
}

// the Skytree in the corner, the tallest thing on the board
function skytree() {
  const g = new THREE.Group(), [x, z] = PLOTS.skytree, steel = mat(0xdfe6ee, { roughness: 0.45, metalness: 0.2 }), deck = mat(0x9fb0c0, { roughness: 0.35, metalness: 0.3 });
  g.add(cyl(0.05, 0.16, 1.5, steel, 0, 0.75, 0, 12), cyl(0.035, 0.05, 0.75, steel, 0, 1.87, 0, 10));
  g.add(cyl(0.11, 0.1, 0.07, deck, 0, 1.25, 0, 14), cyl(0.07, 0.065, 0.05, deck, 0, 1.75, 0, 12));
  g.add(cyl(0.012, 0.025, 0.45, steel, 0, 2.47, 0, 6));
  g.add(box(0.5, 0.06, 0.5, mat(0xb9c6cf), 0, 0.03, 0)); // its base
  g.position.set(x, 0, z);
  return g;
}

// the Shibuya scramble: a square of road with zebra stripes across and corner to corner
function crossing() {
  const [x, z] = PLOTS.crossing, c = document.createElement('canvas'); c.width = c.height = 128;
  const k = c.getContext('2d');
  k.fillStyle = '#7a7c80'; k.fillRect(0, 0, 128, 128);
  k.strokeStyle = '#f2f0ea'; k.lineWidth = 3; k.setLineDash([3, 4]);
  const zebra = (x0, y0, x1, y1) => { k.lineWidth = 14; k.beginPath(); k.moveTo(x0, y0); k.lineTo(x1, y1); k.stroke(); };
  zebra(22, 16, 106, 16); zebra(22, 112, 106, 112); zebra(16, 22, 16, 106); zebra(112, 22, 112, 106); zebra(28, 28, 100, 100); zebra(100, 28, 28, 100);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  m.position.set(x, 0.004, z); m.receiveShadow = true;
  return m;
}

// a hill at the board's edge where the lines go into a tunnel; `face` +1: the mouths look east, −1 west
function hill(x, z, face) {
  const g = new THREE.Group(), green = mat(0x6f9a4f, { roughness: 0.95, flatShading: true }), concrete = mat(0xcfcac2), dark = mat(0x15171b);
  const h = mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), green);
  h.scale.set(0.75, 0.42, face > 0 ? 1.05 : 0.85); h.position.set(face > 0 ? -0.15 : 0.15, 0, 0); g.add(h);
  const w = face > 0 ? 0.95 : 0.5;
  g.add(box(0.06, 0.3, w, concrete, face * 0.4, 0.15, 0), box(0.07, 0.17, w - 0.12, dark, face * 0.4, 0.1, 0)); // the portal
  g.position.set(x, 0, z);
  return g;
}

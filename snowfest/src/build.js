// The buildings (snowfest/DESIGN.md §1.5, §5): the white clapboard clock tower, the red-brick hall with its octagonal
// dome, three town buildings, the neon building, a little izakaya, the hotel, and the lattice tower with its observation
// deck and electric clock. All front toward +z, standing on y = 0. Snow settles on every roof by itself (toy material).
import * as THREE from 'three';
import { kits, group, G, C, IKit } from './kit.js';

// a gable roof: a triangular prism along x, base at y = 0, ridge at y = 1.5 (scale it)
const prism = new THREE.CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0.5, 0);
const pyramid = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4);
const roof = (k, len, h, half, col, x, y, z, ry = 0) => k.add(prism, col, x, y, z, { ry, s: [len, h / 1.5, half / 0.87] });
const Q = new THREE.Quaternion(), E = new THREE.Euler(), A = new THREE.Vector3(), B = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
// a strut from a to b (a thin cylinder)
export function strut(k, a, b, r, col) {
  A.set(...a); B.set(...b); const d = B.clone().sub(A), len = d.length();
  Q.setFromUnitVectors(UP, d.normalize()); E.setFromQuaternion(Q, 'XYZ');
  k.add(G.cyl8, col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, { rx: E.x, ry: E.y, rz: E.z, s: [r, len, r] });
}
// a grid of windows on a face: lit or glass, in frames
function windows(k, { cols, rows, w, h, x0, y0, dx, dy, z, frame = C.white, lit = 0.3, seed = 1 }) {
  let n = seed;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    n = (n * 16807) % 2147483647; const x = x0 + c * dx, y = y0 + r * dy;
    k.toy.box(w + 0.06, h + 0.06, 0.04, frame, x, y, z, { r: 0.01, seg: 1 });
    (n / 2147483647 < lit ? k.glow : k.glass).box(w, h, 0.03, n / 2147483647 < lit ? 0xffd89a : C.glass, x, y, z + 0.015, { r: 0 });
  }
}

export function clockTower() { // two storeys of white boards, tall windows, a red roof, and the little clock tower over the porch
  const k = kits('toy', 'glass', 'glow'), t = k.toy, W = 3.4, H = 2.4, D = 2.3, WALL = 0xf4efe4;
  t.box(W, H, D, WALL, 0, H / 2, 0, { r: 0.08 });
  for (let i = 1; i < 12; i++) for (const z of [D / 2 + 0.005, -D / 2 - 0.005]) t.box(W - 0.1, 0.02, 0.02, 0xd9d2c2, 0, i * 0.2, z, { r: 0 }); // the boards
  t.box(W + 0.12, 0.12, D + 0.12, 0xe8e2d4, 0, H, 0, { r: 0.04 }); t.box(W + 0.1, 0.1, D + 0.1, 0x9a8a78, 0, 0.05, 0, { r: 0.03 });
  roof(t, W + 0.3, 1.0, D / 2 + 0.25, 0xc23c34, 0, H + 0.05, 0);
  windows(k, { cols: 4, rows: 2, w: 0.34, h: 0.62, x0: -1.2, y0: 0.7, dx: 0.8, dy: 1.15, z: D / 2 + 0.02, lit: 0.2 });
  // the porch and the tower over it
  t.box(1.2, 0.9, 0.7, WALL, 0, 0.45, D / 2 + 0.35, { r: 0.05 }); t.box(0.42, 0.7, 0.03, 0x6b4a34, 0, 0.35, D / 2 + 0.71, { r: 0 });
  roof(t, 1.4, 0.5, 0.45, 0xc23c34, 0, 0.9, D / 2 + 0.38, Math.PI / 2);
  const TY = H + 0.6;
  t.box(1.0, 1.5, 1.0, WALL, 0, TY + 0.75, 0.4, { r: 0.05 }); t.box(1.1, 0.12, 1.1, 0xe8e2d4, 0, TY + 1.5, 0.4, { r: 0.03 });
  for (const [x, z, ry] of [[0, 0.91, 0], [0.51, 0.4, Math.PI / 2], [-0.51, 0.4, -Math.PI / 2], [0, -0.11, Math.PI]]) { // four clock faces
    t.add(G.cyl, 0xfbfaf6, x, TY + 0.95, z, { rx: Math.PI / 2, ry, s: [0.33, 0.03, 0.33] });
    const fx = Math.sin(ry) * 0.02, fz = Math.cos(ry) * 0.02;
    t.box(0.025, 0.2, 0.02, C.ink, x + fx, TY + 1.03, z + fz, { ry, r: 0 }); t.box(0.15, 0.025, 0.02, C.ink, x + fx + Math.cos(ry) * 0.06, TY + 0.95, z + fz - Math.sin(ry) * 0.06, { ry, r: 0 });
  }
  t.box(0.7, 0.5, 0.7, WALL, 0, TY + 1.8, 0.4, { r: 0.04 }); // the belfry
  t.add(pyramid, 0xc23c34, 0, TY + 2.35, 0.4, { s: [0.6, 0.6, 0.6] }); t.add(G.cyl8, 0x9a8a78, 0, TY + 2.8, 0.4, { s: [0.02, 0.4, 0.02] });
  return group(k);
}
export function brickHall() { // red brick, rows of white-framed windows, an octagonal tower with a copper dome, a copper roof
  const k = kits('toy', 'glass', 'glow'), t = k.toy, W = 5.6, H = 2.8, D = 2.6;
  t.box(W, H, D, C.brick, 0, H / 2, 0, { r: 0.06 });
  for (let i = 1; i < 14; i++) t.box(W + 0.01, 0.015, D + 0.01, 0x9a4630, 0, i * 0.2, 0, { r: 0 }); // the courses
  for (const y of [0.05, 1.4, H]) t.box(W + 0.1, 0.1, D + 0.1, 0xe8e2d4, 0, y, 0, { r: 0.03 });
  t.box(W - 0.3, 0.7, D - 0.3, C.copper, 0, H + 0.35, 0, { r: 0.25 }); // the copper roof
  windows(k, { cols: 7, rows: 2, w: 0.3, h: 0.55, x0: -2.4, y0: 0.75, dx: 0.8, dy: 1.3, z: D / 2 + 0.02, lit: 0.25, seed: 5 });
  t.box(1.4, 1.2, 0.5, C.brick, 0, 0.6, D / 2 + 0.25, { r: 0.04 }); t.add(G.arch, 0x4a3a30, 0, 0.75, D / 2 + 0.51, { s: [0.3, 0.3, 0.02] }); t.box(0.6, 0.75, 0.02, 0x4a3a30, 0, 0.38, D / 2 + 0.51, { r: 0 }); // the entrance
  // the octagonal tower: two drums, the dome, a lantern
  t.add(G.cyl8, C.brick, 0, H + 1.1, 0, { s: [0.85, 1.5, 0.85] }); t.add(G.cyl8, 0xe8e2d4, 0, H + 1.9, 0, { s: [0.95, 0.12, 0.95] });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; k.glass.box(0.2, 0.42, 0.03, C.glass, Math.sin(a) * 0.82, H + 1.15, Math.cos(a) * 0.82, { ry: a, r: 0 }); }
  t.add(G.half, C.copper, 0, H + 1.95, 0, { s: [0.85, 0.9, 0.85] }); t.add(G.cyl8, 0xe8e2d4, 0, H + 2.95, 0, { s: [0.18, 0.3, 0.18] }); t.add(G.cone, C.copper, 0, H + 3.25, 0, { s: [0.2, 0.3, 0.2] });
  return group(k);
}
// three town buildings: an office of glass, flats with balconies, a store with a sign band
export function building(kind = 0) {
  const k = kits('toy', 'glass', 'glow'), t = k.toy;
  if (kind === 0) {
    const W = 2.4, H = 5.2, D = 2.4; t.box(W, H, D, C.concrete, 0, H / 2, 0, { r: 0.1 });
    windows(k, { cols: 4, rows: 8, w: 0.4, h: 0.42, x0: -0.84, y0: 0.6, dx: 0.56, dy: 0.6, z: D / 2 + 0.01, frame: 0xb0aca4, lit: 0.35, seed: 2 });
    t.box(0.7, 0.4, 0.5, 0x9aa0aa, 0.5, H + 0.2, -0.3, { r: 0.06 }); t.box(0.4, 0.3, 0.4, 0x9aa0aa, -0.6, H + 0.15, 0.3, { r: 0.05 }); // rooftop units
  } else if (kind === 1) {
    const W = 2.2, H = 4.2, D = 2.0; t.box(W, H, D, 0xe8d8b8, 0, H / 2, 0, { r: 0.1 });
    for (let f = 0; f < 5; f++) { const y = 0.5 + f * 0.75; windows(k, { cols: 2, rows: 1, w: 0.5, h: 0.4, x0: -0.5, y0: y + 0.25, dx: 1.0, dy: 0, z: D / 2 + 0.01, frame: 0xd8c8a8, lit: 0.4, seed: f + 9 }); t.box(W - 0.2, 0.06, 0.32, 0xc8bca4, 0, y, D / 2 + 0.16, { r: 0.02 }); t.box(W - 0.2, 0.22, 0.04, 0xc8bca4, 0, y + 0.13, D / 2 + 0.31, { r: 0.01 }); }
  } else {
    const W = 3.2, H = 3.6, D = 2.6; t.box(W, H, D, 0xf0ebe0, 0, H / 2, 0, { r: 0.12 });
    k.glass.box(W - 0.4, 1.0, 0.03, C.glass, 0, 0.7, D / 2 + 0.01, { r: 0 }); k.glow.box(W - 0.6, 0.4, 0.04, 0xffe2a8, 0, 1.6, D / 2 + 0.02, { r: 0 }); // shop windows, a lit sign band
    windows(k, { cols: 5, rows: 2, w: 0.38, h: 0.36, x0: -1.2, y0: 2.3, dx: 0.6, dy: 0.7, z: D / 2 + 0.01, lit: 0.3, seed: 4 });
    t.box(W + 0.1, 0.12, D + 0.1, 0xd8383a, 0, 2.0, 0, { r: 0.03 }); // a red band
  }
  return group(k);
}
export function neonBuilding() { // a tall narrow block with vertical signs and coloured tubes, lit faintly by day
  const k = kits('toy', 'glow', 'glass'), t = k.toy, W = 2.0, H = 5.0, D = 2.0;
  t.box(W, H, D, 0x4a4f62, 0, H / 2, 0, { r: 0.08 });
  for (let f = 0; f < 7; f++) k.glass.box(W - 0.3, 0.32, 0.03, 0x8fa8d0, 0, 0.6 + f * 0.62, D / 2 + 0.01, { r: 0 });
  const cols = [C.neonPink, C.neonBlue, 0xffd23f, 0x8fffb0];
  for (let i = 0; i < 2; i++) { // vertical signs standing out from the corner
    const x = i ? 0.75 : -0.75, col = cols[i];
    t.box(0.28, 2.6, 0.5, 0x2a2f40, x, 2.6, D / 2 + 0.3, { r: 0.04 });
    for (let j = 0; j < 5; j++) k.glow.box(0.04, 0.32, 0.36, col, x + (i ? 0.15 : -0.15), 1.6 + j * 0.48, D / 2 + 0.3, { r: 0 });
  }
  for (let j = 0; j < 4; j++) k.glow.box(W + 0.02, 0.04, D + 0.02, cols[j], 0, 0.95 + j * 1.2, 0, { r: 0 }); // neon bands round it
  return group(k);
}
export function izakaya() { // a small wooden bar: a sliding door, a red noren, red lanterns, a sign, a buried AC unit
  const k = kits('toy', 'glow', 'glass'), t = k.toy, W = 1.8, H = 1.5, D = 1.4;
  t.box(W, H, D, 0x7a5236, 0, H / 2, 0, { r: 0.05 });
  roof(t, W + 0.2, 0.5, D / 2 + 0.15, 0x3a3f4f, 0, H, 0);
  k.glow.box(0.9, 0.7, 0.03, 0xffd89a, 0, 0.45, D / 2 + 0.01, { r: 0 }); for (let i = 0; i < 4; i++) t.box(0.02, 0.7, 0.04, 0x5a3a26, -0.33 + i * 0.22, 0.45, D / 2 + 0.03, { r: 0 }); // the lit sliding door
  for (let i = 0; i < 3; i++) t.box(0.28, 0.32, 0.02, C.noren, -0.3 + i * 0.3, 0.95, D / 2 + 0.06, { r: 0 }); // the noren
  for (const x of [-0.75, 0.75]) { k.glow.add(G.ball, 0xff6a4a, x, 1.0, D / 2 + 0.15, { s: [0.12, 0.17, 0.12] }); t.add(G.cyl, 0x2a2f40, x, 1.19, D / 2 + 0.15, { s: [0.07, 0.04, 0.07] }); }
  t.box(0.7, 0.22, 0.05, 0xfbfaf6, 0, 1.3, D / 2 + 0.03, { r: 0.02 });
  t.box(0.5, 0.36, 0.3, 0xd8d4cc, 0.6, 0.18, -D / 2 - 0.16, { r: 0.04 }); // the AC unit out back
  return group(k);
}
export function hotel() { // a tall pale hotel with a canopy over the door and flags
  const k = kits('toy', 'glass', 'glow'), t = k.toy, W = 3.0, H = 6.0, D = 2.6;
  t.box(W, H, D, 0xe0dcd2, 0, H / 2, 0, { r: 0.12 });
  windows(k, { cols: 5, rows: 8, w: 0.32, h: 0.38, x0: -1.2, y0: 1.5, dx: 0.6, dy: 0.55, z: D / 2 + 0.01, frame: 0xc8c0b0, lit: 0.3, seed: 7 });
  k.glass.box(1.6, 0.9, 0.03, C.glass, 0, 0.5, D / 2 + 0.01, { r: 0 });
  t.box(1.9, 0.08, 0.9, 0x6b4a34, 0, 1.1, D / 2 + 0.45, { r: 0.02 }); for (const x of [-0.85, 0.85]) t.add(G.cyl8, 0x9a8a78, x, 0.55, D / 2 + 0.85, { s: [0.035, 1.1, 0.035] });
  for (const x of [-1.1, 1.1]) { t.add(G.cyl8, 0xd0ccc4, x, 1.4, D / 2 + 1.2, { s: [0.025, 2.8, 0.025] }); t.box(0.02, 0.5, 0.36, x < 0 ? 0x2f55c4 : 0xd8383a, x, 2.5, D / 2 + 1.0, { r: 0 }); }
  return group(k);
}
export function tvTower() { // four legs leaning in, cross braces, the observation deck, an electric clock, the mast — orange-red
  const k = kits('metal', 'glass', 'glow', 'toy'), m = k.metal, COL = C.tower, H1 = 8.4, H2 = 14.2;
  const half = (y) => (y < H1 ? 1.6 - (y / H1) * 1.0 : 0.6 - ((y - H1) / (H2 - H1)) * 0.45); // half width at a height
  const corner = (y, sx, sz) => [sx * half(y), y, sz * half(y)];
  const levels = [0, 1.6, 3.2, 4.8, 6.4, H1, 10, 11.5, 12.8, H2];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let i = 0; i < levels.length - 1; i++) strut(m, corner(levels[i], sx, sz), corner(levels[i + 1], sx, sz), 0.07 - i * 0.004, COL);
  for (let i = 0; i < levels.length - 1; i++) { // braces on each face: an X between two levels, and a ring
    const y0 = levels[i], y1 = levels[i + 1];
    for (const [a, b] of [[[1, 1], [-1, 1]], [[1, -1], [-1, -1]], [[1, 1], [1, -1]], [[-1, 1], [-1, -1]]]) {
      strut(m, corner(y0, ...a), corner(y1, ...b), 0.03, COL); strut(m, corner(y0, ...b), corner(y1, ...a), 0.03, COL);
      strut(m, corner(y1, ...a), corner(y1, ...b), 0.035, 0xf4efe4);
    }
  }
  // the deck: a glass band in a box, snow on its roof
  const DY = 6.6; k.toy.box(2.6, 0.25, 2.6, 0xd8d4cc, 0, DY, 0, { r: 0.05 }); k.glass.box(2.5, 0.75, 2.5, 0x8fb4d8, 0, DY + 0.5, 0, { r: 0.05 }); k.toy.box(2.7, 0.2, 2.7, 0xd8d4cc, 0, DY + 0.95, 0, { r: 0.06 });
  // the electric clock under the deck, facing front
  k.toy.box(1.5, 0.6, 0.12, 0x1c2232, 0, DY - 0.75, half(DY - 0.75) + 0.08, { r: 0.03 }); k.glow.box(1.3, 0.38, 0.03, 0x8fffb0, 0, DY - 0.75, half(DY - 0.75) + 0.15, { r: 0 });
  strut(m, [0, H2, 0], [0, H2 + 1.8, 0], 0.04, 0xf4efe4); k.glow.ball(0.07, 0xff4a4a, 0, H2 + 1.85, 0);
  k.toy.box(3.6, 0.3, 3.6, 0x9aa0aa, 0, 0.15, 0, { r: 0.08 }); // the base
  return group(k);
}

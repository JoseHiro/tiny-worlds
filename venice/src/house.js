// The houses of Venice and its landmarks (venice/DESIGN.md §1.4–§1.6): plaster houses rising out of the water with
// pointed arched windows in white stone, green shutters, little balconies, funnel chimneys, flower boxes and a water door;
// five kinds of house; the bell tower, the domed church, the palace with its diamond-patterned wall, the stone bridge
// with shops on it, a covered bridge, a wooden bridge, little stone bridges, the two columns and the arcade.
// Everything faces +z. A house stands on y = 0 (put it at y = -0.25 to have it rise out of the water).
import * as THREE from 'three';
import { kits, group, G, C, WALLS, FLOOR, archGeo, prismGeo, hipGeo, bridgeGeo, shape } from './kit.js';

const TAU = Math.PI * 2;
// (a seeded pick, so a house is the same each time)
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// ---- the pieces of a front ----
// an arched window in a white stone frame: `pointed` for the Gothic ones
export function archWin(k, x, y, z, w, h, { pointed = true, ry = 0, frame = C.stone, glass = C.glassDark, sill = true } = {}) {
  const dz = Math.cos(ry), dx = Math.sin(ry);
  k.stone.add(archGeo(w + 0.08, h + 0.06, 0.04, pointed), frame, x, y - 0.03, z, { ry });
  k.glass.add(archGeo(w, h, 0.03, pointed), glass, x + dx * 0.012, y, z + dz * 0.012, { ry });
  if (sill) k.stone.box(w + 0.16, 0.05, 0.1, frame, x + dx * 0.03, y - 0.04, z + dz * 0.03, { r: 0.015, ry });
}
// a square window with green shutters folded back either side
export function shutterWin(k, x, y, z, w, h, { ry = 0, shutter = C.shutter, open = true } = {}) {
  const dz = Math.cos(ry), dx = Math.sin(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
  k.stone.box(w + 0.08, h + 0.08, 0.04, C.stone, x, y + h / 2, z, { r: 0.015, ry });
  k.glass.box(w, h, 0.03, C.glassDark, x + dx * 0.012, y + h / 2, z + dz * 0.012, { r: 0.01, ry });
  if (open) for (const s of [-1, 1]) k.plain.box(w * 0.52, h, 0.03, shutter, x + sx * s * (w * 0.78) + dx * 0.02, y + h / 2, z + sz * s * (w * 0.78) + dz * 0.02, { r: 0.01, ry });
  else k.plain.box(w, h, 0.03, shutter, x + dx * 0.02, y + h / 2, z + dz * 0.02, { r: 0.01, ry });
  k.stone.box(w + 0.14, 0.04, 0.09, C.stone, x + dx * 0.03, y - 0.03, z + dz * 0.03, { r: 0.012, ry });
}
// a little stone balcony with balusters
export function balcony(k, x, y, z, w, { ry = 0 } = {}) {
  const dz = Math.cos(ry), dx = Math.sin(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
  k.stone.box(w, 0.06, 0.28, C.stone, x + dx * 0.14, y, z + dz * 0.14, { r: 0.02, ry });
  k.stone.box(w, 0.04, 0.06, C.stone, x + dx * 0.26, y + 0.26, z + dz * 0.26, { r: 0.015, ry });
  const n = Math.max(3, Math.round(w / 0.1));
  for (let i = 0; i < n; i++) { const u = (i / (n - 1) - 0.5) * (w - 0.06); k.stone.add(G.cyl8, C.stone, x + sx * u + dx * 0.26, y + 0.14, z + sz * u + dz * 0.26, { s: [0.018, 0.22, 0.018] }); }
}
// the Venetian funnel chimney: a stack that opens out into a cone at the top
export function chimney(k, x, y, z, kind = 0, col = C.cream) {
  k.wall.box(0.12, 0.34, 0.12, col, x, y + 0.17, z, { r: 0.02 });
  if (kind === 0) { k.wall.add(G.cyl, col, x, y + 0.4, z, { s: [0.1, 0.12, 0.1] }); k.wall.add(G.cone, col, x, y + 0.53, z, { s: [0.15, 0.16, 0.15], rx: Math.PI }); k.plain.add(G.cyl, 0x5a4a40, x, y + 0.61, z, { s: [0.13, 0.02, 0.13] }); }
  else if (kind === 1) { k.wall.add(G.cone, col, x, y + 0.48, z, { s: [0.13, 0.2, 0.13], rx: Math.PI }); k.wall.box(0.2, 0.04, 0.2, col, x, y + 0.6, z, { r: 0.01 }); }
  else { k.wall.add(G.cyl, col, x, y + 0.42, z, { s: [0.08, 0.16, 0.08] }); k.roof.add(G.half, C.roof, x, y + 0.5, z, { s: [0.12, 0.08, 0.12] }); }
}
// a window box of red geraniums
export function flowers(k, x, y, z, w, { ry = 0 } = {}) {
  const dz = Math.cos(ry), dx = Math.sin(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
  k.plain.box(w, 0.08, 0.1, 0x7a5a3a, x + dx * 0.07, y, z + dz * 0.07, { r: 0.02, ry });
  const n = Math.max(2, Math.round(w / 0.09));
  for (let i = 0; i < n; i++) { const u = (i / (n - 1) - 0.5) * (w - 0.05); k.plain.ball(0.045, C.leaf, x + sx * u + dx * 0.08, y + 0.06, z + sz * u + dz * 0.08); k.plain.ball(0.028, C.geranium, x + sx * u + dx * 0.1, y + 0.1, z + sz * u + dz * 0.1); }
}
// a water door: an arched door down to the water, stone steps going under
export function waterDoor(k, x, z, w = 0.55, h = 0.75, { ry = 0, base = 0.25 } = {}) {
  const dz = Math.cos(ry), dx = Math.sin(ry);
  k.stone.add(archGeo(w + 0.1, h + 0.06, 0.05, false), C.stone, x, base - 0.03, z, { ry });
  k.plain.add(archGeo(w, h, 0.04, false), 0x5a3a28, x + dx * 0.012, base, z + dz * 0.012, { ry });
  for (let i = 0; i < 3; i++) k.stone.box(w + 0.1, 0.08, 0.14, C.stone, x + dx * (0.08 + i * 0.12), base - 0.05 - i * 0.1, z + dz * (0.08 + i * 0.12), { r: 0.02, ry });
}
// a mooring pole, striped, a gold ball on top; `h` above the water
export function pole(k, x, z, col = C.poleBlue, h = 1.4) {
  const n = 7;
  for (let i = 0; i < n; i++) k.plain.add(G.cyl8, i % 2 ? C.white : col, x, -0.3 + (i + 0.5) * (h + 0.3) / n, z, { s: [0.045, (h + 0.3) / n, 0.045], ry: i * 0.4 });
  k.gold.ball(0.06, C.gold, x, h + 0.04, z);
}

// ---- a house ----
// kind: 'palazzo' | 'medium' | 'narrow' | 'corner' | 'warehouse'; col: a wall colour; seed varies the details
export function house(kind = 'medium', { col = null, seed = 1, sides = true, water = true } = {}) {
  const r = rng(seed * 97 + 13), k = kits('wall', 'stone', 'roof', 'plain', 'glass', 'gold', 'glow', 'shiny', 'metal');
  col ??= WALLS[Math.floor(r() * WALLS.length)];
  const S = { palazzo: [3.0, 2.2, 4], medium: [2.2, 1.8, 3], narrow: [1.2, 1.6, 4], corner: [1.8, 1.8, 3], warehouse: [2.6, 2.0, 2] }[kind];
  const [w, d, n] = S, Ht = n * FLOOR + 0.15, fz = d / 2;
  k.wall.box(w, Ht, d, col, 0, Ht / 2, 0, { r: 0.08, seg: 1 });
  k.stone.box(w + 0.04, 0.16, d + 0.04, C.stone, 0, 0.08, 0, { r: 0.04 }); // a stone foot at the waterline
  // string courses between the floors, a cornice at the top
  for (let f = 1; f < n; f++) k.stone.box(w + 0.03, 0.05, 0.05, C.stone, 0, f * FLOOR + 0.12, fz, { r: 0.015 });
  k.stone.box(w + 0.1, 0.1, d + 0.1, C.stone, 0, Ht, 0, { r: 0.03 });
  // the roof: low hipped (or a gable for the warehouse), terracotta
  if (kind === 'warehouse') k.roof.add(prismGeo(d + 0.16, 0.42, w + 0.16), C.roof, 0, Ht + 0.04, 0, { ry: Math.PI / 2 });
  else k.roof.add(hipGeo, C.roof, 0, Ht + 0.04, 0, { s: [w + 0.16, 0.36 + w * 0.04, d + 0.16] });
  const y0 = (f) => f * FLOOR + 0.27; // the sill of a floor
  if (kind === 'palazzo') {
    waterDoor(k, 0, fz, 0.8, 0.82);
    for (const x of [-1.05, 1.05]) shutterWin(k, x, 0.38, fz, 0.32, 0.4);
    for (const f of [1, 2]) { // the great windows of the hall: five pointed lights on a balcony, a single one each side
      balcony(k, 0, y0(f) - 0.04, fz, 1.75);
      for (let i = 0; i < 5; i++) archWin(k, (i - 2) * 0.32, y0(f), fz, 0.24, 0.56, { sill: false });
      for (const x of [-1.12, 1.12]) archWin(k, x, y0(f), fz, 0.3, 0.56);
    }
    for (let i = 0; i < 4; i++) shutterWin(k, (i - 1.5) * 0.7, y0(3), fz, 0.26, 0.34);
  } else if (kind === 'medium') {
    waterDoor(k, -0.45, fz, 0.6, 0.72); shutterWin(k, 0.55, 0.38, fz, 0.3, 0.38);
    balcony(k, 0, y0(1) - 0.04, fz, 1.1);
    for (let i = 0; i < 3; i++) archWin(k, (i - 1) * 0.32, y0(1), fz, 0.24, 0.52, { sill: false });
    for (const x of [-0.82, 0.82]) { archWin(k, x, y0(1), fz, 0.26, 0.5); flowers(k, x, y0(1) - 0.02, fz + 0.06, 0.34); }
    for (let i = 0; i < 3; i++) shutterWin(k, (i - 1) * 0.7, y0(2), fz, 0.26, 0.36);
  } else if (kind === 'narrow') {
    waterDoor(k, 0, fz, 0.5, 0.7);
    for (let f = 1; f < n; f++) { if (f === 1) archWin(k, 0, y0(f), fz, 0.32, 0.5, { pointed: false }); else for (const x of [-0.27, 0.27]) shutterWin(k, x, y0(f), fz, 0.22, 0.36, { open: r() > 0.3 }); }
    flowers(k, 0, y0(1) - 0.02, fz + 0.06, 0.44);
  } else if (kind === 'corner') { // a shop below: a window, a striped awning
    k.glass.box(1.1, 0.5, 0.03, 0xf3d9a6, -0.2, 0.55, fz + 0.01, { r: 0.02 });
    k.stone.box(1.2, 0.06, 0.06, C.stone, -0.2, 0.83, fz + 0.02, { r: 0.015 });
    for (let i = 0; i < 6; i++) k.plain.box(0.2, 0.04, 0.42, i % 2 ? C.white : 0x2f6f5a, -0.7 + i * 0.2, 0.98, fz + 0.18, { r: 0.01, rx: 0.42 });
    k.plain.add(archGeo(0.36, 0.6, 0.04, false), 0x5a3a28, 0.62, 0.25, fz + 0.01);
    for (let f = 1; f < n; f++) for (const x of [-0.45, 0.45]) shutterWin(k, x, y0(f), fz, 0.26, 0.38);
    balcony(k, 0.45, y0(1) - 0.04, fz, 0.5); flowers(k, -0.45, y0(1) - 0.02, fz + 0.06, 0.36);
  } else { // warehouse: a wide water door, small high windows, a beam with a pulley under the gable
    waterDoor(k, 0, fz, 1.1, 0.95);
    for (const x of [-0.9, 0.9]) shutterWin(k, x, 0.45, fz, 0.24, 0.3, { open: false });
    for (let i = 0; i < 4; i++) archWin(k, (i - 1.5) * 0.55, y0(1) + 0.1, fz, 0.22, 0.36, { pointed: false });
    k.plain.box(0.08, 0.08, 0.5, C.wood, 0, Ht - 0.1, fz + 0.2, { r: 0.015 });
    k.metal.add(G.torus, 0x4a4f5a, 0, Ht - 0.2, fz + 0.4, { s: 0.05, ry: Math.PI / 2 });
    k.plain.add(G.cyl8, 0xc9b48a, 0, Ht - 0.7, fz + 0.4, { s: [0.008, 1.0, 0.008] });
  }
  if (sides) for (const s of [-1, 1]) for (let f = 1; f < n; f++) { // a window or two on each side
    const m = d > 1.7 ? [-0.4, 0.4] : [0];
    for (const z of m) shutterWin(k, s * w / 2, y0(f), z, 0.24, 0.34, { ry: s * Math.PI / 2, open: r() > 0.4 });
  }
  // chimneys and, on some, a wooden roof terrace
  const nc = kind === 'palazzo' ? 3 : kind === 'narrow' ? 1 : 2;
  for (let i = 0; i < nc; i++) chimney(k, (i / Math.max(1, nc - 1) - 0.5) * (w - 0.6) * (nc > 1 ? 1 : 0) + (nc === 1 ? w * 0.25 : 0), Ht + 0.05, -d * 0.2 + (i % 2) * 0.25, Math.floor(r() * 3), col);
  if (kind === 'medium' || kind === 'narrow') {
    const tx = kind === 'narrow' ? -0.15 : 0.5, ty = Ht + 0.32;
    for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) k.plain.box(0.04, 0.4, 0.04, C.wood, tx + x, ty, z * 0.8, { r: 0.01 });
    k.plain.box(0.72, 0.04, 0.58, C.wood, tx, ty + 0.2, 0, { r: 0.01 });
    for (const z of [-0.27, 0.27]) k.plain.box(0.72, 0.03, 0.03, C.wood, tx, ty + 0.38, z, { r: 0.01 });
  }
  const g = group(k);
  g.userData = { kind, w, d, h: Ht + 0.45 };
  return g;
}
export const HOUSE_KINDS = ['palazzo', 'medium', 'narrow', 'corner', 'warehouse'];

// ---- landmarks ----
export function campanile() { // the bell tower: red brick with pale strips, a white belfry of arches, a green spire, a gold angel
  const k = kits('wall', 'stone', 'plain', 'glass', 'gold', 'roof'), W = 1.0, Hs = 4.6;
  k.stone.box(W + 0.2, 0.3, W + 0.2, C.stone, 0, 0.15, 0, { r: 0.04 });
  k.wall.box(W, Hs, W, C.brick, 0, 0.3 + Hs / 2, 0, { r: 0.05 });
  for (const s of [-1, 1]) for (const t of [-1, 0, 1]) { k.wall.box(0.08, Hs - 0.3, 0.04, 0xc8664a, t * 0.3, 0.3 + Hs / 2, s * (W / 2 + 0.01), { r: 0.01 }); k.wall.box(0.04, Hs - 0.3, 0.08, 0xc8664a, s * (W / 2 + 0.01), 0.3 + Hs / 2, t * 0.3, { r: 0.01 }); }
  const b = 0.3 + Hs;
  k.stone.box(W + 0.12, 0.1, W + 0.12, C.stone, 0, b + 0.05, 0, { r: 0.02 });
  k.stone.box(W, 0.7, W, C.stone, 0, b + 0.45, 0, { r: 0.04 });
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; for (const t of [-0.28, 0, 0.28]) k.glass.add(archGeo(0.18, 0.5, 0.03, false), 0x3a3f4f, Math.sin(a) * (W / 2 + 0.005) + Math.cos(a) * t, b + 0.15, Math.cos(a) * (W / 2 + 0.005) - Math.sin(a) * t, { ry: a }); }
  k.gold.ball(0.12, C.gold, 0, b + 0.45, 0); // (a bell glinting inside)
  k.stone.box(W + 0.12, 0.1, W + 0.12, C.stone, 0, b + 0.85, 0, { r: 0.02 });
  k.wall.box(W - 0.08, 0.55, W - 0.08, C.brick, 0, b + 1.15, 0, { r: 0.04 });
  k.roof.add(hipGeo, C.copper, 0, b + 1.42, 0, { s: [W - 0.04, 1.3, W - 0.04] });
  k.gold.add(G.cone, C.gold, 0, b + 2.86, 0, { s: [0.07, 0.2, 0.07] }); k.gold.ball(0.07, C.gold, 0, b + 3.0, 0);
  for (const s of [-1, 1]) k.gold.box(0.14, 0.03, 0.05, C.gold, s * 0.08, b + 3.0, 0, { r: 0.01, rz: s * 0.4 });
  const g = group(k); g.userData = { h: b + 3.1 }; return g;
}
export function basilica() { // the domed church: white, five green domes on drums, arched doors with gold above
  const k = kits('stone', 'plain', 'glass', 'gold', 'roof'), W = 4.0, D = 3.4, Hb = 1.9;
  k.stone.box(W, Hb, D, C.stone, 0, Hb / 2, 0, { r: 0.08 });
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.78, big = i === 2;
    k.plain.add(archGeo(big ? 0.62 : 0.5, big ? 1.5 : 1.25, 0.06, false), 0xe6dccb, x, 0.05, D / 2 + 0.02);
    k.gold.add(archGeo(big ? 0.5 : 0.4, big ? 0.6 : 0.5, 0.04, false), C.gold, x, (big ? 0.95 : 0.78), D / 2 + 0.05);
    k.plain.add(archGeo(big ? 0.42 : 0.34, big ? 0.85 : 0.7, 0.04, false), 0x5a3a28, x, 0.05, D / 2 + 0.06);
    k.stone.add(archGeo(0.44, 0.5, 0.06, true), C.stone, x, Hb - 0.02, D / 2 - 0.05); // the little gables on the roofline
    k.gold.ball(0.05, C.gold, x, Hb + 0.52, D / 2 - 0.05);
  }
  for (const [x, z, r] of [[0, 0, 0.8], [0, -1.05, 0.6], [0, 1.0, 0.6], [-1.35, 0, 0.6], [1.35, 0, 0.6]]) {
    k.stone.add(G.cyl, C.stone, x, Hb + 0.16, z, { s: [r * 0.9, 0.32, r * 0.9] });
    k.roof.add(G.half, C.copper, x, Hb + 0.3, z, { s: [r, r * 1.05, r] });
    k.gold.add(G.cone, C.gold, x, Hb + 0.32 + r * 1.05 + 0.12, z, { s: [0.06, 0.24, 0.06] }); k.gold.ball(0.05, C.gold, x, Hb + 0.32 + r * 1.05 + 0.28, z);
  }
  const g = group(k); g.userData = { h: Hb + 1.4 }; return g;
}
export function palace() { // the doge's palace: an arcade below, a loggia of small arches, a pink and white diamond wall
  const k = kits('stone', 'plain', 'glass', 'wall', 'gold'), W = 5.2, D = 2.6;
  k.stone.box(W, 0.9, D, C.stone, 0, 0.45, 0, { r: 0.05 });
  for (let i = 0; i < 9; i++) k.glass.add(archGeo(0.38, 0.7, 0.04, true), 0x3d4152, (i - 4) * 0.56, 0.06, D / 2 + 0.01);
  k.stone.box(W + 0.04, 0.6, D, C.stone, 0, 1.2, 0, { r: 0.03 });
  for (let i = 0; i < 17; i++) k.glass.add(archGeo(0.18, 0.4, 0.04, true), 0x3d4152, (i - 8) * 0.29, 0.96, D / 2 + 0.01);
  k.stone.box(W + 0.06, 0.06, 0.2, C.stone, 0, 0.95, D / 2 + 0.06, { r: 0.02 });
  const top = 1.5, wh = 1.4;
  k.wall.box(W, wh, D, 0xf2c8c0, 0, top + wh / 2, 0, { r: 0.04 });
  for (let row = 0; row < 6; row++) for (let i = 0; i < 22; i++) { // white diamonds over the pink
    const x = (i - 10.5) * 0.23 + (row % 2) * 0.115; if (Math.abs(x) > W / 2 - 0.1) continue;
    k.stone.box(0.09, 0.09, 0.02, C.white, x, top + 0.16 + row * 0.2, D / 2 + 0.01, { r: 0.01, rz: Math.PI / 4 });
  }
  for (const x of [-1.6, -0.6, 0.6, 1.6]) archWin(k, x, top + 0.35, D / 2 + 0.01, 0.34, 0.62);
  k.stone.add(archGeo(0.5, 0.9, 0.06, true), C.stone, 0, top + 0.3, D / 2 + 0.03); k.plain.add(archGeo(0.38, 0.72, 0.04, true), 0x3d4152, 0, top + 0.36, D / 2 + 0.05);
  for (let i = 0; i < 26; i++) k.stone.add(G.cone, C.white, (i - 12.5) * 0.2, top + wh + 0.1, D / 2 - 0.05, { s: [0.05, 0.18, 0.05] }); // the lace of the crest
  k.stone.box(W + 0.06, 0.06, D + 0.06, C.stone, 0, top + wh, 0, { r: 0.02 });
  const g = group(k); g.userData = { h: top + wh + 0.2 }; return g;
}
export function arcade(len = 6) { // the long arcade round the square: arches below, windows above, a café under it
  const k = kits('stone', 'glass', 'wall', 'roof', 'plain', 'gold'), D = 1.6, n = Math.round(len / 0.5);
  k.stone.box(len, 2.2, D, C.stone, 0, 1.1, 0, { r: 0.05 });
  for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.5; k.glass.add(archGeo(0.32, 0.72, 0.04, false), 0x4d5162, x, 0.02, D / 2 + 0.01); archWin(k, x, 1.15, D / 2 + 0.01, 0.2, 0.42, { pointed: false, glass: 0x3d4152 }); }
  k.stone.box(len + 0.06, 0.08, D + 0.06, C.stone, 0, 2.2, 0, { r: 0.02 });
  k.roof.add(prismGeo(D + 0.1, 0.3, len + 0.1), C.roof, 0, 2.24, 0, { ry: Math.PI / 2 });
  for (let i = 0; i < n; i += 2) { const x = (i - (n - 1) / 2) * 0.5; archWin(k, x, 1.15, -D / 2 - 0.01, 0.22, 0.42, { pointed: false, ry: Math.PI }); shutterWin(k, x, 0.35, -D / 2 - 0.01, 0.22, 0.32, { ry: Math.PI, open: i % 4 === 0 }); } // (the back has windows too)
  return group(k);
}
export function columns() { // the two columns at the water's edge: one with a winged lion, one with a figure
  const k = kits('stone', 'gold', 'plain'), g = new THREE.Group();
  for (const [x, top] of [[-1.2, 'lion'], [1.2, 'man']]) {
    k.stone.box(0.6, 0.3, 0.6, C.stone, x, 0.15, 0, { r: 0.05 }); k.stone.add(G.cyl, 0xd8d0c4, x, 2.05, 0, { s: [0.17, 3.5, 0.17] }); k.stone.box(0.45, 0.2, 0.45, C.stone, x, 3.9, 0, { r: 0.04 });
    if (top === 'lion') { k.gold.box(0.42, 0.2, 0.18, 0x8a8f78, x, 4.12, 0, { r: 0.06 }); k.gold.ball(0.12, 0x8a8f78, x + 0.22, 4.25, 0); for (const s of [-1, 1]) k.gold.box(0.28, 0.04, 0.14, 0x8a8f78, x - 0.05, 4.3, s * 0.1, { r: 0.02, rz: 0.6, rx: s * 0.3 }); }
    else { k.stone.add(G.cap, 0xe8e2d6, x, 4.28, 0, { s: [0.1, 0.22, 0.1] }); k.stone.ball(0.08, 0xe8e2d6, x, 4.55, 0); k.stone.add(G.cyl8, 0xe8e2d6, x + 0.1, 4.3, 0, { s: [0.015, 0.5, 0.015] }); }
  }
  g.add(group(k)); g.userData = { h: 4.6 }; return g;
}

// ---- bridges ----
export function stoneBridge(span = 2.2, width = 1.0) { // a little humped stone bridge: white edges, low steps, iron rails
  const k = kits('stone', 'metal'), w = span + 1.4, rise = 0.32;
  k.stone.add(bridgeGeo(w, rise, span, 0.18, width), 0xe8e0d2, 0, -0.05, 0);
  const n = 9, top = (x) => rise * (1 - (2 * x / w) ** 2) + 0.18 - 0.05;
  for (let i = 0; i < n; i++) { const x = (i / (n - 1) - 0.5) * (w - 0.3); k.stone.box(0.08, 0.03, width - 0.1, C.stone, x, top(x) + 0.01, 0, { r: 0.01 }); }
  for (const s of [-1, 1]) for (let i = 0; i < 11; i++) { const x = (i / 10 - 0.5) * (w - 0.3); k.metal.add(G.cyl8, 0x2f3445, x, top(x) + 0.2, s * (width / 2 - 0.04), { s: [0.012, 0.4, 0.012] }); if (i < 10) { const x2 = ((i + 1) / 10 - 0.5) * (w - 0.3), mx = (x + x2) / 2, a = Math.atan2(top(x2) - top(x), x2 - x); k.metal.add(G.cyl8, 0x2f3445, mx, (top(x) + top(x2)) / 2 + 0.4, s * (width / 2 - 0.04), { s: [0.015, Math.hypot(x2 - x, top(x2) - top(x)) + 0.01, 0.015], rz: a - Math.PI / 2 }); } }
  const g = group(k); g.userData = { w, top }; return g;
}
export function woodBridge(span = 4.4, width = 1.3) { // a wide wooden arch bridge on a lattice of beams
  const k = kits('plain'), w = span + 1, rise = 0.9, top = (x) => rise * (1 - (2 * x / w) ** 2) + 0.1;
  const n = 14;
  for (let i = 0; i < n; i++) { const x0 = (i / n - 0.5) * w, x1 = ((i + 1) / n - 0.5) * w, a = Math.atan2(top(x1) - top(x0), x1 - x0); k.plain.box(Math.hypot(x1 - x0, top(x1) - top(x0)) + 0.02, 0.08, width, C.wood, (x0 + x1) / 2, (top(x0) + top(x1)) / 2, 0, { r: 0.02, rz: a }); }
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 12; i++) { const x = (i / 12 - 0.5) * (w - 0.2); k.plain.box(0.05, 0.42, 0.05, 0x6b4a32, x, top(x) + 0.23, s * (width / 2 - 0.03), { r: 0.01 }); }
    for (let i = 0; i < 12; i++) { const x0 = (i / 12 - 0.5) * (w - 0.2), x1 = ((i + 1) / 12 - 0.5) * (w - 0.2), a = Math.atan2(top(x1) - top(x0), x1 - x0); k.plain.box(Math.hypot(x1 - x0, top(x1) - top(x0)) + 0.02, 0.05, 0.06, C.wood, (x0 + x1) / 2, (top(x0) + top(x1)) / 2 + 0.44, s * (width / 2 - 0.03), { r: 0.015, rz: a }); }
    for (let i = 1; i < 6; i++) { const x = (i / 6 - 0.5) * span * 0.9; k.plain.box(0.07, Math.max(0.1, top(x) - 0.05), 0.07, 0x6b4a32, x, top(x) / 2 - 0.05, s * (width / 2 - 0.15), { r: 0.015 }); }
  }
  for (const z of [-0.4, 0.4]) for (let i = 0; i < 12; i++) { // two curved ribs under the deck, springing from the water
    const rib = (x) => (rise + 0.1) * (1 - (2 * x / span) ** 2) - 0.1;
    const x0 = (i / 12 - 0.5) * span, x1 = ((i + 1) / 12 - 0.5) * span, a = Math.atan2(rib(x1) - rib(x0), x1 - x0);
    k.plain.box(Math.hypot(x1 - x0, rib(x1) - rib(x0)) + 0.02, 0.1, 0.1, 0x6b4a32, (x0 + x1) / 2, (rib(x0) + rib(x1)) / 2, z * width, { r: 0.02, rz: a });
  }
  const g = group(k); g.userData = { w, top }; return g;
}
export function bigBridge() { // the great stone bridge: a single arch, two rows of shops on it under red roofs, a portico in the middle
  const k = kits('stone', 'wall', 'roof', 'glass', 'plain', 'metal'), span = 4.2, w = 7.4, width = 2.4, rise = 1.0;
  k.stone.add(bridgeGeo(w, rise, span, 0.3, width), 0xeee6d8, 0, -0.1, 0);
  const top = (x) => rise * (1 - (2 * x / w) ** 2) + 0.2;
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { // shops in steps up each side of the hump
    const x = s * (0.75 + i * 0.5), y = top(x);
    k.wall.box(0.5, 0.55, 0.62, C.stone, x, y + 0.28, -0.55, { r: 0.03 }); k.wall.box(0.5, 0.55, 0.62, C.stone, x, y + 0.28, 0.55, { r: 0.03 });
    k.glass.add(archGeo(0.28, 0.4, 0.03, false), 0x4d5162, x, y + 0.05, 0.87); k.glass.add(archGeo(0.28, 0.4, 0.03, false), 0x4d5162, x, y + 0.05, -0.87, { ry: Math.PI });
    k.roof.add(prismGeo(0.72, 0.18, 0.52), C.roof, x, y + 0.56, -0.55, { ry: Math.PI / 2 }); k.roof.add(prismGeo(0.72, 0.18, 0.52), C.roof, x, y + 0.56, 0.55, { ry: Math.PI / 2 });
  }
  const t0 = top(0);
  k.stone.box(1.0, 1.0, width, C.stone, 0, t0 + 0.5, 0, { r: 0.05 }); // the portico
  for (const z of [-1, 1]) k.glass.add(archGeo(0.5, 0.75, 0.04, false), 0x4d5162, 0, t0, z * (width / 2 + 0.005), { ry: z < 0 ? Math.PI : 0 });
  k.roof.add(prismGeo(width + 0.1, 0.3, 1.1), C.roof, 0, t0 + 1.0, 0, { ry: 0 });
  for (const s of [-1, 1]) for (let i = 0; i < 16; i++) { const x = (i / 15 - 0.5) * (w - 0.3); k.stone.box(0.05, 0.22, 0.05, C.stone, x, top(x) + 0.11, s * (width / 2 - 0.03), { r: 0.01 }); }
  const g = group(k); g.userData = { w, top, h: t0 + 1.3 }; return g;
}
export function sighsBridge() { // a covered white bridge across a narrow canal, between two walls, with little barred windows
  const k = kits('stone', 'wall', 'glass', 'metal', 'plain'), span = 1.6, H0 = 1.6;
  for (const s of [-1, 1]) {
    const x = s * (span / 2 + 0.6);
    k.wall.box(1.2, 3.2, 1.4, s < 0 ? 0xe8e0d2 : C.cream, x, 1.6, 0, { r: 0.05 });
    for (const y of [0.5, 2.5]) shutterWin(k, x, y, 0.7, 0.3, 0.4, { open: y > 1 });
  }
  k.stone.box(span + 0.1, 0.9, 0.9, C.stone, 0, H0 + 0.45, 0, { r: 0.06 });
  k.stone.add(archGeo(span + 0.1, 0.5, 0.9, false), C.stone, 0, H0 + 0.6, 0);
  k.stone.add(archGeo(span * 0.85, 0.35, 0.95, false), 0xe8e0d2, 0, H0 - 0.05, 0);
  for (const z of [-1, 1]) for (const x of [-0.35, 0.35]) { k.glass.box(0.26, 0.26, 0.03, 0x3d4152, x, H0 + 0.55, z * 0.46, { r: 0.02 }); for (const t of [-0.06, 0.06]) k.metal.box(0.02, 0.26, 0.02, C.stone, x + t, H0 + 0.55, z * 0.48, { r: 0.005 }); for (const t of [-0.06, 0.06]) k.metal.box(0.26, 0.02, 0.02, C.stone, x, H0 + 0.55 + t, z * 0.48, { r: 0.005 }); }
  return group(k);
}

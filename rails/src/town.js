// The town on the board (rails/DESIGN.md §1.3, §6): the bay, the Sumida and the Kanda River, the outer moat, the
// Palace in its moat and the parks; then blocks of buildings everywhere the rails, water and green leave room — low
// in the neighbourhoods, tall round Shinjuku, Marunouchi, Shiodome, Shibuya, Ikebukuro and Shinagawa. A coarse grid
// remembers what is where, so placing thousands of blocks stays quick.
import * as THREE from 'three';
import { Path, strip } from './track.js';
import { BOARD } from './network.js';
import { patch, buildings, trees, WATER, GREEN } from './scenery.js';

const FOREST = 0x5d8a45;
const TRACK = 1, WET = 2, PARK = 4, KEEP = 8;

class Grid {
  constructor({ x0, x1, z0, z1 }, cell = 0.1) {
    Object.assign(this, { x0, z0, cell, w: Math.ceil((x1 - x0) / cell), h: Math.ceil((z1 - z0) / cell) });
    this.v = new Uint8Array(this.w * this.h);
  }
  i(x, z) { const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell); return i < 0 || j < 0 || i >= this.w || j >= this.h ? -1 : j * this.w + i; }
  get(x, z) { const i = this.i(x, z); return i < 0 ? 0 : this.v[i]; }
  disc(x, z, r, bit) { for (let dz = -r; dz <= r; dz += this.cell) for (let dx = -r; dx <= r; dx += this.cell) if (dx * dx + dz * dz <= r * r) { const i = this.i(x + dx, z + dz); if (i >= 0) this.v[i] |= bit; } }
  poly(pts, bit) { for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) if (inside(pts, this.x0 + (i + 0.5) * this.cell, this.z0 + (j + 0.5) * this.cell)) this.v[j * this.w + i] |= bit; }
  path(p, r, bit, s0 = 0, s1 = p.length, a = [0, 0, 0, 0]) { for (let s = s0; s <= s1; s += 0.05) { p.at(s, 0, a); this.disc(a[0], a[1], r, bit); } }
  any(x, z, r, bits) { for (const dx of [-r, 0, r]) for (const dz of [-r, 0, r]) if (this.get(x + dx, z + dz) & bits) return true; return false; }
}
function inside(pts, x, z) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; }
  return c;
}
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const oval = (cx, cz, rx, rz, n = 20) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cz + Math.sin((i / n) * Math.PI * 2) * rz]);
const rnd = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);

// ---------- what is where ----------
const BAY = [[5.5, 4.1], [6.9, 3.7], [8.4, 4.0], [11.5, 4.6], [11.5, 14.4], [2.4, 14.4], [2.5, 11.2], [3.4, 8.2], [4.5, 5.6]];
const SUMIDA = [[10.6, -14.2], [10.4, -10], [10.3, -6.9], [9.6, -4.6], [9.0, -3.2], [8.6, -1.0], [8.0, 1.5], [7.1, 3.8]];
const KANDA = [[-0.6, -5.65], [0.9, -5.37], [2.44, -5.38], [3.8, -4.95], [4.6, -4.85], [5.25, -4.55], [5.75, -3.6], [6.6, -3.3], [8.3, -3.42], [9.05, -3.15]];
const PALACE = rect(0.95, -2.9, 3.45, 0.05);
const PARKS = {
  palace: [PALACE, FOREST],
  gyoen: [rect(-6.0, -1.55, -4.4, -0.62), GREEN],
  jingu: [[[-9.1, -0.55], [-7.2, -0.55], [-7.15, 2.5], [-9.1, 2.5]], FOREST],
  yoyogi: [rect(-9.7, 2.5, -7.7, 3.9), GREEN],
  ueno: [[[4.8, -9.1], [6.35, -9.1], [6.35, -6.6], [4.8, -6.6]], GREEN],
  shiba: [rect(0.45, 4.25, 1.6, 5.6), GREEN],
};
// where the town grows tall: [x, z, height, reach]
const PEAKS = [[-8.5, -2.3, 0.95, 1.3], [3.75, -0.6, 0.7, 0.9], [3.9, 3.9, 0.6, 0.9], [-6.9, 4.6, 0.55, 0.9], [-5.0, -10.8, 0.45, 1.0], [0.6, 11.2, 0.55, 1.0], [-1.9, 4.3, 0.6, 0.8], [5.9, -4.3, 0.35, 0.6], [-0.2, -1.2, 0.35, 0.8]];

export function buildTown(net, { keep = [] } = {}) {
  const g = new THREE.Group(), grid = new Grid(BOARD), a = [0, 0, 0, 0];
  // the rails (with room for the platforms), the water, the green, the landmarks' plots
  for (const line of Object.values(net.lines)) {
    const p = line.path, s0 = p.closed ? 0 : line.seen[0] - 0.6, s1 = p.closed ? p.length : line.seen[1] + 0.6;
    grid.path(p, 0.34, TRACK, Math.max(0, s0), Math.min(p.length, s1));
    for (const s of p.stations) grid.path(p, 0.42, TRACK, s - 0.5, s + 0.5);
  }
  const sumida = new Path(SUMIDA, { step: 0.05 }), kanda = new Path(KANDA, { step: 0.05 });
  grid.poly(BAY, WET); grid.path(sumida, 0.36, WET); grid.path(kanda, 0.12, WET);
  const moatPath = net.corridor, ms0 = moatPath.nearest(0.9, -4.87), ms1 = moatPath.nearest(-1.77, -1.33) + 0.3;
  for (let s = ms0; s < ms1; s += 0.05) { moatPath.at(s, -0.55, a); grid.disc(a[0], a[1], 0.14, WET); }
  const pond = oval(5.42, -6.98, 0.42, 0.32);
  grid.poly(pond, WET);
  for (const [pts] of Object.values(PARKS)) grid.poly(pts, PARK);
  grid.poly(rect(0.8, -3.05, 3.6, 0.2), WET); // the Palace moat round it
  for (const [x, z, r] of keep) grid.disc(x, z, r, KEEP);
  const water = (x, z) => !!(grid.get(x, z) & WET);

  // ---------- water and green ----------
  const wet = new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.22, metalness: 0.1 });
  const wets = [strip(sumida, 0, sumida.length, () => -0.3, () => 0.3, () => 0.003), strip(kanda, 0, kanda.length, () => -0.08, () => 0.08, () => 0.003), strip(moatPath, ms0, ms1, () => -0.66, () => -0.44, () => 0.003)];
  for (const m of wets) g.add(Object.assign(new THREE.Mesh(m, wet), { receiveShadow: true }));
  g.add(patch(BAY, WATER, 0.003), patch(pond, WATER, 0.004), patch(rect(0.8, -3.05, 3.6, 0.2), WATER, 0.003));
  for (const [pts, color] of Object.values(PARKS)) g.add(patch(pts, color, pts === PALACE ? 0.005 : 0.004));

  // trees: thick in the Palace and the shrine forest, scattered in the parks, a few along the streets
  const tr = [];
  for (const [k, [pts]] of Object.entries(PARKS)) {
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]), dense = k === 'palace' || k === 'jingu' ? 0.11 : 0.2;
    for (let x = Math.min(...xs); x < Math.max(...xs); x += dense) for (let z = Math.min(...zs); z < Math.max(...zs); z += dense) {
      const px = x + (rnd() - 0.5) * dense, pz = z + (rnd() - 0.5) * dense;
      if (inside(pts, px, pz) && !(grid.get(px, pz) & (TRACK | KEEP)) && !inside(pond, px, pz) && rnd() < (dense < 0.15 ? 0.85 : 0.5)) tr.push({ x: px, z: pz, s: 0.7 + rnd() * 0.7 });
    }
  }

  // ---------- the blocks ----------
  const blocks = [], tones = [0xeeeae2, 0xe6dccb, 0xdcd8d0, 0xf2efe8, 0xd9cbb5, 0xe8d8c8, 0xd6d0c4, 0xc9c3b6], glass = [0xc9d1d6, 0xb9c6cf, 0xa9bccb, 0xdcd8d0];
  const C = 0.32;
  for (let ix = 0, x = BOARD.x0 + 0.3; x < BOARD.x1 - 0.2; x += C, ix++) for (let iz = 0, z = BOARD.z0 + 0.3; z < BOARD.z1 - 0.2; z += C, iz++) {
    if (ix % 4 === 0 || iz % 3 === 0) { if (rnd() < 0.06 && !grid.any(x, z, 0.05, TRACK | WET | PARK | KEEP)) tr.push({ x, z, s: 0.6 }); continue; } // the streets, a street tree here and there
    const w = 0.18 + rnd() * 0.1, d = 0.18 + rnd() * 0.1, px = x + (rnd() - 0.5) * 0.05, pz = z + (rnd() - 0.5) * 0.05;
    if (grid.any(px, pz, Math.max(w, d) / 2, TRACK | WET | PARK | KEEP)) continue;
    let tall = 0;
    for (const [cx, cz, h, r] of PEAKS) tall = Math.max(tall, h * Math.max(0, 1 - Math.hypot(px - cx, pz - cz) / r) ** 1.5);
    const h = 0.05 + rnd() * 0.09 + tall * (0.4 + rnd() * 0.8);
    blocks.push({ x: px, z: pz, w, d, h, yaw: (rnd() - 0.5) * 0.08, color: h > 0.35 ? glass[Math.floor(rnd() * glass.length)] : tones[Math.floor(rnd() * tones.length)] });
  }
  return { group: g, blocks, trees: tr, water, grid };
}

// put the blocks and trees in (after the landmarks have added theirs)
export function finishTown(scene, town) {
  scene.add(buildings(town.blocks), trees(town.trees));
}

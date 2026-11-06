// The town on the board (rails/DESIGN.md §1.3, §6): the bay, the Sumida and the Kanda River, the outer moat, the
// Palace in its moat and the parks; then blocks of buildings everywhere the rails, water and green leave room — low
// in the neighbourhoods, tall round Shinjuku, Marunouchi, Shiodome, Shibuya, Ikebukuro and Shinagawa. A coarse grid
// remembers what is where, so placing thousands of blocks stays quick.
import * as THREE from 'three';
import { Path, strip } from './track.js';
import { BOARD } from './network.js';
import { patch, buildings, trees, WATER, GREEN, FLOOR, HOUSE, FLATS, OFFICE, GLASS, PLAIN } from './scenery.js';
import { STATIONS, toXZ } from './geo.js';

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
// where the town grows tall (offices): [lat, lon, how tall 0–1, reach]
const PEAKS = [
  [35.6905, 139.6935, 1, 1.2], [35.6830, 139.7650, 0.95, 1.0], [35.6640, 139.7610, 0.8, 0.7], [35.6665, 139.7470, 0.85, 0.9], // Nishi-Shinjuku, Marunouchi, Shiodome, Toranomon
  [35.6580, 139.7025, 0.7, 0.8], [35.6270, 139.7425, 0.7, 0.7], [35.6195, 139.7295, 0.55, 0.5], [35.7295, 139.7170, 0.55, 0.8], // Shibuya, Shinagawa, Ōsaki, Ikebukuro
  [35.6995, 139.7730, 0.45, 0.5], [35.6620, 139.7340, 0.6, 0.8], [35.6550, 139.7570, 0.55, 0.5], // Akihabara, Roppongi, Hamamatsuchō
];
// the real towers: [lat, lon, height in metres, width, depth, kind, colour]
const MARU = 0.0045; // (Marunouchi's towers stand behind the red-brick station, which is set west of its real place to clear the curve)
const PER_METRE = 0.0047; // (the tall ones a little over twice the map's scale, as the landmarks are)
const TOWERS = [
  [35.6857, 139.6907, 235, 0.2, 0.2, 3, 0x7f8e98], [35.6837, 139.6868, 234, 0.18, 0.24, 2, 0xb9b8b2], [35.6918, 139.6946, 225, 0.2, 0.15, 3, 0x6f7f8a], // Park Tower, Opera City, Mitsui
  [35.6920, 139.6927, 210, 0.18, 0.18, 2, 0xc9c6bd], [35.6922, 139.6962, 223, 0.2, 0.13, 3, 0x8a959c], [35.6930, 139.6952, 210, 0.16, 0.16, 3, 0xb0bec7], // Sumitomo, Center Bldg, Nomura
  [35.6905, 139.6965, 204, 0.12, 0.12, 3, 0x6e8a9c], [35.6903, 139.6950, 178, 0.2, 0.12, 2, 0xe1dfd8], [35.6957, 139.7010, 225, 0.15, 0.15, 3, 0x9aa6ae], // Cocoon, Keiō Plaza, Kabukichō Tower
  [35.6847, 139.7022, 240, 0.14, 0.14, 2, 0xbfc3c4], // Docomo Yoyogi
  [35.6855, 139.7705, 212, 0.2, 0.15, 3, 0x9eb0bd], [35.6812, 139.7640 - MARU, 180, 0.18, 0.18, 2, 0xd3cdbf], [35.6823, 139.7652 - MARU, 198, 0.18, 0.16, 3, 0xa8b3ba], // Tokiwabashi, Marunouchi Bldg, Shin-Maru
  [35.6800, 139.7695, 205, 0.16, 0.12, 3, 0xb3c3cf], [35.6775, 139.7690, 205, 0.16, 0.12, 3, 0xb3c3cf], [35.6862, 139.7652 - MARU, 200, 0.16, 0.16, 3, 0x8c9ba5], // GranTokyo N, S, Ōtemachi Tower
  [35.6643, 139.7625, 213, 0.18, 0.11, 3, 0x93a8b8], [35.6645, 139.7600, 216, 0.17, 0.17, 3, 0x7d8f9b], [35.6556, 139.7565, 235, 0.17, 0.17, 3, 0x8fa2ae], // Dentsu, Shiodome City Center, World Trade Center
  [35.6668, 139.7496, 255, 0.2, 0.17, 3, 0x9fafba], [35.6698, 139.7488, 266, 0.18, 0.18, 3, 0x7b8c97], [35.6605, 139.7404, 325, 0.2, 0.2, 3, 0xa9b6be], // Toranomon Hills, its Station Tower, Azabudai Hills
  [35.6656, 139.7310, 248, 0.18, 0.18, 3, 0x87979f], [35.6680, 139.7409, 153, 0.2, 0.2, 2, 0xc4bdb1], // Midtown, Ark Hills
  [35.6590, 139.7036, 183, 0.16, 0.14, 3, 0x93a7b4], [35.6573, 139.7032, 180, 0.14, 0.12, 2, 0xd9d8d2], [35.6555, 139.7008, 179, 0.15, 0.13, 3, 0x8fa0aa], [35.6531, 139.6972, 184, 0.14, 0.14, 3, 0x9aabb6], // Hikarie, Stream, Sakura Stage, Cerulean
  [35.6275, 139.7413, 140, 0.18, 0.12, 3, 0x9cadb8], [35.6262, 139.7424, 150, 0.18, 0.12, 3, 0x8a9ba6], [35.6360, 139.7400, 160, 0.16, 0.14, 3, 0xa7b9c4], // Shinagawa Intercity, Grand Commons, Takanawa Gateway City
  [35.6185, 139.7285, 134, 0.15, 0.15, 3, 0x95a6b0], [35.6205, 139.7310, 140, 0.18, 0.14, 2, 0xc5c3bd], // Ōsaki
  [35.6995, 139.7737, 157, 0.16, 0.14, 3, 0x8e9fa9], [35.7010, 139.7725, 105, 0.16, 0.16, 2, 0xbdbfbf], [35.7011, 139.7468, 150, 0.16, 0.14, 3, 0x9aaab3], // Akihabara Crossfield, UDX, Iidabashi
  [35.7285, 139.7710, 150, 0.14, 0.14, 2, 0xd2cfc7], [35.7263, 139.7155, 189, 0.14, 0.14, 3, 0xa5b4bc], // Nippori, Toshima ward office
];
const BIG = new Set(['shinjuku', 'tokyo', 'shibuya', 'ikebukuro', 'shinagawa', 'ueno', 'akihabara', 'osaki', 'gotanda', 'takadanobaba']);
// colours: houses' walls and roofs, flats (tiles), offices (stone and panels), glass
const WALLS = [0xf3f0ea, 0xebe5d8, 0xdedad2, 0xd4c9b6, 0xc2bcb2, 0xa89a88, 0xe6dfd3, 0xcfd3d4];
const ROOFS = [0x6a6e74, 0x7a6e64, 0x5d6878, 0x857b70, 0x6e7468, 0x9a9488, 0x5a5d62, 0x8b8d90];
const FLATS_C = [0xe9e4da, 0xd9ccb4, 0xc7b49a, 0xa58a70, 0xdcdad5, 0xbdb8b0, 0xcfc2ae, 0xf0eee8];
const OFFICE_C = [0xd8d6d0, 0xc4c6c6, 0xb3b7ba, 0xcfc6b5, 0x9ea4a8, 0xe5e3de, 0xbab2a4];
const GLASS_C = [0x8fa3b2, 0x7d93a3, 0xa3b4c0, 0x6f8592, 0x93a39f, 0xb5c2cb];
// the plant on a tall roof
const plant = (x, z, w, d, h) => ({ x: x + (rnd() - 0.5) * w * 0.3, z: z + (rnd() - 0.5) * d * 0.3, w: w * (0.3 + rnd() * 0.2), d: d * (0.3 + rnd() * 0.2), h: 0.008 + rnd() * 0.01, y: h, kind: PLAIN, color: 0xb4b3ae });

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
  // the real towers first (each kept clear of the rails and the water, nudged a little if it must be)
  const blocks = [];
  for (const [la, lo, metres, w, d, kind, color] of TOWERS) {
    const [x0, z0] = toXZ(la, lo), r = Math.max(w, d) / 2 + 0.03;
    const spot = [[0, 0], [0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15], [0.25, 0.15], [-0.25, -0.15], [0.15, -0.25], [-0.15, 0.25]].map(([dx, dz]) => [x0 + dx, z0 + dz]).find(([x, z]) => !grid.any(x, z, r, TRACK | WET | PARK | KEEP));
    if (!spot) continue;
    const [x, z] = spot, h = metres * PER_METRE;
    blocks.push({ x, z, w, d, h, yaw: (rnd() - 0.5) * 0.1, kind, color }, plant(x, z, w, d, h));
    grid.disc(x, z, r, KEEP);
  }
  // then block by block: a tall office or two where the town peaks, shops and offices round the stations, and
  // everywhere else houses — two or three storeys, mostly with pitched roofs — with a block of flats among them
  const stations = Object.entries(STATIONS).map(([k, s]) => [...toXZ(s[3], s[4]), BIG.has(k) ? 1 : 0.6]);
  const peaks = PEAKS.map(([la, lo, k, r]) => [...toXZ(la, lo), k, r]);
  const near = (list, x, z, reach) => list.reduce((m, [cx, cz, k, r = reach]) => Math.max(m, k * Math.max(0, 1 - Math.hypot(x - cx, z - cz) / r) ** 1.4), 0);
  const C = 0.32, pick = (a) => a[Math.floor(rnd() * a.length)];
  for (let ix = 0, x = BOARD.x0 + 0.3; x < BOARD.x1 - 0.2; x += C, ix++) for (let iz = 0, z = BOARD.z0 + 0.3; z < BOARD.z1 - 0.2; z += C, iz++) {
    if (ix % 4 === 0 || iz % 3 === 0) { if (rnd() < 0.06 && !grid.any(x, z, 0.05, TRACK | WET | PARK | KEEP)) tr.push({ x, z, s: 0.6 }); continue; } // the streets, a street tree here and there
    const cbd = near(peaks, x, z), busy = near(stations, x, z, 0.9), yaw = (rnd() - 0.5) * 0.06;
    const lots = cbd > 0.4 && rnd() < cbd ? [[1, 1]] : busy + cbd > 0.5 ? [[2, 1], [1, 2], [2, 2]][Math.floor(rnd() * 3)] : [[2, 2], [3, 2], [2, 3], [3, 3]][Math.floor(rnd() * 4)];
    const [nx, nz] = lots, lw = 0.27 / nx, ld = 0.27 / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const w = lw * (0.72 + rnd() * 0.22), d = ld * (0.72 + rnd() * 0.22), px = x + (i - (nx - 1) / 2) * lw + (rnd() - 0.5) * 0.015, pz = z + (j - (nz - 1) / 2) * ld + (rnd() - 0.5) * 0.015;
      if (grid.any(px, pz, Math.max(w, d) / 2, TRACK | WET | PARK | KEEP)) continue;
      if (nx === 1) { // a tower of the business district
        const floors = Math.round(14 + cbd * (14 + rnd() * 22)), glass = rnd() < 0.55, h = floors * FLOOR;
        blocks.push({ x: px, z: pz, w, d, h, yaw, kind: glass ? GLASS : OFFICE, color: pick(glass ? GLASS_C : OFFICE_C) }, plant(px, pz, w, d, h));
      } else if (busy + cbd > 0.5) { // round a station: shops below, offices and flats above
        const floors = Math.round(4 + rnd() * 5 + (busy + cbd) * (2 + rnd() * 6)), flats = rnd() < 0.35, h = floors * FLOOR;
        blocks.push({ x: px, z: pz, w, d, h, yaw, kind: flats ? FLATS : OFFICE, color: pick(flats ? FLATS_C : OFFICE_C) });
        if (floors > 6) blocks.push(plant(px, pz, w, d, h));
      } else if (rnd() < 0.18 + busy * 0.3) { // a block of flats among the houses
        const floors = 4 + Math.floor(rnd() * 8), h = floors * FLOOR;
        blocks.push({ x: px, z: pz, w: Math.max(w, d) * 1.1, d: Math.min(w, d), h, yaw, kind: FLATS, color: pick(FLATS_C) });
      } else { // a house
        const hw = w * (0.6 + rnd() * 0.3), hd = d * (0.6 + rnd() * 0.3), h = (2 + (rnd() < 0.3 ? 1 : 0)) * FLOOR + 0.004;
        blocks.push({ x: px, z: pz, w: hw, d: hd, h, yaw: yaw + (rnd() < 0.2 ? Math.PI / 2 : 0), kind: HOUSE, color: pick(WALLS), roof: rnd() < 0.75 ? pick(ROOFS) : undefined });
      }
    }
  }
  return { group: g, blocks, trees: tr, water, grid };
}

// put the blocks and trees in (after the landmarks have added theirs)
export function finishTown(scene, town) {
  scene.add(buildings(town.blocks), trees(town.trees));
}

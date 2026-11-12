// The sculptures (snowfest/DESIGN.md §1.3, §5): the big snow castle with its stage, the middle-sized ones (an owl, a whale,
// a fox and her cub, a squirrel), a family of snowmen dressed up, twelve little citizens' sculptures, and the ice: carved
// fish, flower, bird and heart on blocks with a coloured light under them, a slide, a wall of blocks, icicles.
// Each returns a Group standing on y = 0, its front toward +z; things that move have userData.update(t, dt).
import * as THREE from 'three';
import { kits, group, G, C, MAT, IKit } from './kit.js';

const SNOW = 0xf2f6fc, SHADE = 0xd4deee, CARVE = 0xbac9e2; // (sculpted snow: the face, the cut-back planes, the deep cuts)
const flag = (col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3, 6, 1).translate(0.25, 0, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, side: THREE.DoubleSide })); m.castShadow = true; return m; };
const wave = (m, t, ph) => { const p = m.geometry.attributes.position; if (!m.userData.x0) m.userData.x0 = Float32Array.from(p.array); const a = m.userData.x0; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(a[i * 3] * 9 - t * 6 + ph) * 0.06 * a[i * 3] * 2); p.needsUpdate = true; };

// ---- the big one ----
export function snowCastle() {
  const k = kits('snow', 'toy', 'glow');
  const s = k.snow, W = 8, D = 4.6;
  s.box(W + 1.2, 0.7, D + 1.6, SHADE, 0, 0.35, 0, { r: 0.3 }); // the plinth
  for (let i = 0; i < 5; i++) s.box(2.4 - i * 0.1, 0.14, 0.3, SNOW, 0, 0.07 + i * 0.14, D / 2 + 0.9 - i * 0.3, { r: 0.05 }); // steps up
  s.box(4.2, 3.6, 2.6, SNOW, 0, 0.7 + 1.8, -0.3, { r: 0.25 }); // the keep
  s.box(4.6, 0.3, 3.0, SHADE, 0, 4.45, -0.3, { r: 0.12 }); // its cornice
  for (let i = -4; i <= 4; i++) s.box(0.34, 0.36, 0.34, SNOW, i * 0.5, 4.78, 1.0, { r: 0.08 }); // crenellations
  s.box(2.2, 1.6, 1.6, SNOW, 0, 5.4, -0.6, { r: 0.2 }); // the upper hall
  s.add(G.half, SNOW, 0, 6.2, -0.6, { s: [0.95, 1.1, 0.8] }); // its dome
  s.add(G.cone, SNOW, 0, 7.6, -0.6, { s: [0.22, 0.8, 0.22] }); // a spire
  // the gate: an arch cut deep, a portcullis of shadow, and the windows
  s.add(G.arch, CARVE, 0, 2.0, 1.02, { s: [0.8, 0.8, 0.06] }); s.box(1.6, 1.3, 0.06, CARVE, 0, 1.35, 1.02, { r: 0 });
  for (const x of [-1.4, 1.4]) for (const y of [2.4, 3.5]) { s.add(G.arch, CARVE, x, y + 0.2, 1.02, { s: [0.22, 0.22, 0.05] }); s.box(0.44, 0.4, 0.05, CARVE, x, y, 1.02, { r: 0 }); }
  for (const x of [-0.6, 0, 0.6]) s.add(G.arch, CARVE, x, 5.55, 0.22, { s: [0.15, 0.15, 0.04] });
  // four round towers, with pointed snow roofs
  for (const [x, z, h] of [[-3.3, 0.9, 4.6], [3.3, 0.9, 4.6], [-2.6, -1.4, 5.6], [2.6, -1.4, 5.6]]) {
    s.add(G.cyl, SNOW, x, 0.7 + h / 2, z, { s: [0.72, h, 0.72] });
    s.add(G.cyl, SHADE, x, 0.7 + h + 0.1, z, { s: [0.86, 0.22, 0.86] });
    s.add(G.cone, SNOW, x, 0.7 + h + 0.95, z, { s: [0.86, 1.5, 0.86] });
    for (const y of [1.8, 3.2]) { s.add(G.arch, CARVE, x, 0.7 + y + 0.18, z + 0.7, { s: [0.16, 0.16, 0.04] }); s.box(0.32, 0.3, 0.04, CARVE, x, 0.7 + y, z + 0.7, { r: 0 }); }
  }
  // walls between the front towers and the keep
  for (const x of [-2.5, 2.5]) { s.box(1.4, 2.4, 1.2, SNOW, x, 0.7 + 1.2, 0.6, { r: 0.15 }); for (const dx of [-0.45, 0, 0.45]) s.box(0.26, 0.3, 0.26, SNOW, x + dx, 0.7 + 2.55, 1.0, { r: 0.06 }); }
  // the stage in front: boards, a skirt, two speaker stacks, a truss over it
  const t = k.toy, SY = 0.7, SZ = D / 2 + 2.3;
  t.box(5.2, 0.5, 1.8, 0x6b4a34, 0, SY / 2 + 0.05, SZ, { r: 0.05 }); t.box(5.2, 0.32, 0.04, 0x2f55c4, 0, 0.25, SZ + 0.91, { r: 0 });
  for (const x of [-2.9, 2.9]) { t.box(0.6, 1.4, 0.6, 0x2a2f40, x, 0.7, SZ, { r: 0.05 }); for (const y of [0.4, 0.95]) t.add(G.cyl, 0x4a5068, x, y, SZ + 0.31, { rx: Math.PI / 2, s: [0.18, 0.02, 0.18] }); }
  for (const x of [-2.5, 2.5]) t.add(G.cyl8, 0x9aa3b4, x, 1.9, SZ - 0.6, { s: [0.06, 3.0, 0.06] });
  t.box(5.2, 0.16, 0.16, 0x9aa3b4, 0, 3.4, SZ - 0.6, { r: 0.02 });
  for (const x of [-1.6, -0.5, 0.5, 1.6]) { t.add(G.cyl, 0x2a2f40, x, 3.2, SZ - 0.6, { s: [0.1, 0.22, 0.1] }); k.glow.add(G.cyl, 0xfff2d0, x, 3.08, SZ - 0.6, { s: [0.08, 0.02, 0.08] }); }
  const g = group(k);
  // flags on the towers, fluttering
  const flags = [[-2.6, 7.0, -1.4, C.noren], [2.6, 7.0, -1.4, 0x2f55c4], [0, 8.1, -0.6, 0xf2c230]].map(([x, y, z, col]) => { const pole = new THREE.Mesh(G.cyl8, MAT.plain); pole.scale.set(0.025, 0.7, 0.025); pole.position.set(x, y, z); g.add(pole); const f = flag(col); f.position.set(x, y + 0.2, z); g.add(f); return f; });
  g.userData.update = (time) => flags.forEach((f, i) => wave(f, time, i));
  g.userData.stage = new THREE.Vector3(0, SY, SZ);
  return g;
}

// ---- middle-sized ----
export function owl() { // a Blakiston's fish owl: round, ear tufts, big carved eyes, on a stump of snow
  const k = kits('snow', 'toy'), s = k.snow;
  s.box(1.8, 0.6, 1.6, SHADE, 0, 0.3, 0, { r: 0.2 }); s.add(G.cyl, SNOW, 0, 0.9, 0, { s: [0.6, 0.7, 0.6] });
  s.add(G.ball, SNOW, 0, 1.95, 0, { s: [0.85, 1.05, 0.75] }); // body
  s.add(G.ball, SNOW, 0, 3.05, 0.05, { s: [0.72, 0.62, 0.66] }); // head
  for (const x of [-1, 1]) {
    s.add(G.cone, SNOW, x * 0.42, 3.6, 0, { rz: -x * 0.5, s: [0.18, 0.5, 0.14] }); // ear tufts
    s.add(G.ball, CARVE, x * 0.26, 3.1, 0.6, { s: [0.2, 0.2, 0.06] }); s.add(G.ball, SNOW, x * 0.26, 3.1, 0.64, { s: [0.09, 0.09, 0.03] }); // eyes: a ring cut, a boss left
    s.add(G.ball, SHADE, x * 0.72, 2.0, -0.05, { rz: x * 0.2, s: [0.3, 0.85, 0.6] }); // wings
  }
  s.add(G.cone, SHADE, 0, 2.88, 0.66, { rx: Math.PI, s: [0.09, 0.2, 0.09] }); // beak
  for (let i = 0; i < 4; i++) s.add(G.ball, CARVE, 0, 1.6 + i * 0.28, 0.72, { s: [0.32 - i * 0.04, 0.05, 0.06] }); // breast feathers
  for (const x of [-0.25, 0.25]) s.add(G.ball, SHADE, x, 1.2, 0.45, { s: [0.18, 0.1, 0.2] }); // feet
  return group(k);
}
export function whale() { // a whale leaping from a wave of snow, a spout of snow above it
  const k = kits('snow'), s = k.snow;
  s.box(4.2, 0.5, 2.2, SHADE, 0, 0.25, 0, { r: 0.2 });
  for (let i = 0; i < 9; i++) s.add(G.lump, SNOW, -1.9 + i * 0.48, 0.65 + Math.sin(i * 1.3) * 0.12, Math.cos(i * 0.9) * 0.4, { s: 0.42 + (i % 3) * 0.08 }); // the wave
  s.add(G.cap, SNOW, 0.1, 1.75, 0, { rz: -0.75, s: [0.75, 1.5, 0.72] }); // body, leaping up out of the wave
  s.add(G.ball, SNOW, 0.95, 2.75, 0, { rz: -0.7, s: [0.82, 0.72, 0.7] }); // head
  for (let i = 0; i < 5; i++) s.add(G.ball, CARVE, 0.75 + i * 0.16, 2.0 + i * 0.16, 0, { rz: -0.75, s: [0.05, 0.28, 0.6 - i * 0.05] }); // throat grooves
  for (const z of [-1, 1]) s.add(G.ball, CARVE, 1.2, 2.85, z * 0.6, { s: [0.08, 0.08, 0.04] }); // eyes
  for (const z of [-1, 1]) s.add(G.ball, SHADE, 0.6, 1.4, z * 0.75, { rx: z * 0.6, s: [0.5, 0.12, 0.28] }); // flippers
  s.add(G.cap, SNOW, -1.35, 1.0, 0, { rz: -0.4, s: [0.3, 0.5, 0.3] });
  for (const z of [-1, 1]) s.add(G.ball, SNOW, -1.75, 1.05, z * 0.42, { rx: z * 0.4, s: [0.42, 0.12, 0.42] }); // flukes
  for (let i = 0; i < 6; i++) s.add(G.lump, SNOW, 1.3 + Math.sin(i * 2.1) * 0.18, 3.4 + i * 0.22, Math.cos(i * 1.7) * 0.15, { s: 0.16 + i * 0.03 }); // the spout
  return group(k);
}
export function foxes() { // a fox and her cub, sitting, tails curled round
  const k = kits('snow'), s = k.snow;
  s.box(2.6, 0.4, 1.6, SHADE, 0, 0.2, 0, { r: 0.15 });
  const fox = (x, sc, turn) => {
    const P = (a, b, c) => [x + (a * Math.cos(turn) + c * Math.sin(turn)) * sc, 0.4 + b * sc, (-a * Math.sin(turn) + c * Math.cos(turn)) * sc];
    s.add(G.ball, SNOW, ...P(0, 0.75, 0), { s: [0.55 * sc, 0.75 * sc, 0.5 * sc] }); // body
    s.add(G.ball, SNOW, ...P(0, 1.55, 0.1), { s: [0.4 * sc, 0.36 * sc, 0.38 * sc] }); // head
    s.add(G.cone, SNOW, ...P(0, 1.48, 0.55), { rx: Math.PI / 2, ry: turn, s: [0.16 * sc, 0.4 * sc, 0.14 * sc] }); // snout
    for (const e of [-1, 1]) { s.add(G.cone, SNOW, ...P(e * 0.22, 1.95, 0.05), { ry: turn, rz: -e * 0.25, s: [0.14 * sc, 0.34 * sc, 0.08 * sc] }); s.add(G.ball, CARVE, ...P(e * 0.15, 1.6, 0.42), { s: 0.04 * sc }); }
    s.add(G.cap, SNOW, ...P(-0.45, 0.35, 0.35), { rz: 0.4, ry: turn + 1.2, s: [0.22 * sc, 0.6 * sc, 0.22 * sc] }); // the tail round the feet
    s.add(G.ball, SHADE, ...P(0, 0.85, 0.42), { s: [0.3 * sc, 0.4 * sc, 0.1 * sc] }); // the bib
  };
  fox(-0.45, 1, 0.25); fox(0.75, 0.6, -0.4);
  return group(k);
}
export function squirrel() { // an Ezo squirrel holding a nut, a big tail up its back
  const k = kits('snow'), s = k.snow;
  s.add(G.cyl, SHADE, 0, 0.2, 0, { s: [0.55, 0.4, 0.55] });
  s.add(G.ball, SNOW, 0, 0.75, 0, { s: [0.3, 0.38, 0.28] }); s.add(G.ball, SNOW, 0, 1.25, 0.06, { s: [0.24, 0.22, 0.22] });
  for (const e of [-1, 1]) { s.add(G.cone, SNOW, e * 0.12, 1.5, 0.02, { s: [0.06, 0.18, 0.05] }); s.add(G.ball, CARVE, e * 0.09, 1.28, 0.24, { s: 0.03 }); }
  s.add(G.ball, SHADE, 0, 0.9, 0.28, { s: 0.1 }); // the nut
  s.add(G.cap, SNOW, 0, 1.0, -0.38, { rx: 0.25, s: [0.2, 0.55, 0.18] }); s.add(G.ball, SNOW, 0, 1.55, -0.3, { s: [0.22, 0.2, 0.18] });
  return group(k);
}
export function snowmen() { // a family of snowmen dressed up: buckets and knit hats, scarves, carrot noses, coal eyes and buttons
  const k = kits('snow', 'toy'), s = k.snow, t = k.toy;
  const man = (x, sc, hat, scarf) => {
    s.add(G.ball, SNOW, x, 0.45 * sc, 0, { s: 0.5 * sc }); s.add(G.ball, SNOW, x, 1.12 * sc, 0, { s: 0.36 * sc });
    for (const e of [-1, 1]) t.ball(0.035 * sc, C.ink, x + e * 0.12 * sc, 1.2 * sc, 0.32 * sc);
    t.add(G.cone, 0xf08a24, x, 1.1 * sc, 0.45 * sc, { rx: Math.PI / 2, s: [0.05 * sc, 0.25 * sc, 0.05 * sc] });
    for (let i = 0; i < 3; i++) t.ball(0.035 * sc, C.ink, x, (0.35 + i * 0.17) * sc, 0.48 * sc - i * 0.02 * sc);
    t.add(G.torus, scarf, x, 0.86 * sc, 0, { rx: Math.PI / 2, s: [0.3 * sc, 0.3 * sc, 0.32 * sc] }); t.box(0.1 * sc, 0.3 * sc, 0.05 * sc, scarf, x + 0.18 * sc, 0.72 * sc, 0.28 * sc, { r: 0.02 * sc });
    if (hat === 'bucket') t.add(G.cyl, 0xd8383a, x, 1.52 * sc, 0, { rz: 0.15, s: [0.2 * sc, 0.28 * sc, 0.2 * sc] });
    else { t.add(G.half, hat, x, 1.36 * sc, 0, { s: [0.3 * sc, 0.28 * sc, 0.3 * sc] }); t.ball(0.07 * sc, C.white, x, 1.66 * sc, 0); }
    for (const e of [-1, 1]) t.add(G.cyl8, 0x6b4a34, x + e * 0.48 * sc, 0.98 * sc, 0, { rz: e * 1.0, s: [0.02 * sc, 0.45 * sc, 0.02 * sc] }); // twig arms
  };
  man(-0.9, 1.25, 'bucket', 0x3f6fd6); man(0.15, 1.05, 0xf08ac0, 0xf2c230); man(0.95, 0.7, 0x4fb39a, 0xe8483f);
  return group(k);
}
// the twelve little citizens' sculptures, each on its own block of snow
export const LITTLE = ['snowman', 'rabbit', 'penguin', 'crab', 'daruma', 'house', 'car', 'bear', 'seal', 'cat', 'star', 'heart'];
export function little(kind) {
  const k = kits('snow', 'toy'), s = k.snow;
  s.box(0.8, 0.5, 0.8, SHADE, 0, 0.25, 0, { r: 0.08 });
  const B = 0.5;
  ({
    snowman: () => { s.add(G.ball, SNOW, 0, B + 0.22, 0, { s: 0.24 }); s.add(G.ball, SNOW, 0, B + 0.55, 0, { s: 0.16 }); },
    rabbit: () => { s.add(G.ball, SNOW, 0, B + 0.2, 0, { s: [0.22, 0.2, 0.26] }); s.add(G.ball, SNOW, 0, B + 0.42, 0.1, { s: 0.14 }); for (const e of [-1, 1]) s.add(G.cap, SNOW, e * 0.06, B + 0.64, 0.06, { rz: -e * 0.15, s: [0.04, 0.12, 0.03] }); },
    penguin: () => { s.add(G.ball, SNOW, 0, B + 0.3, 0, { s: [0.2, 0.3, 0.18] }); s.add(G.cone, SHADE, 0, B + 0.48, 0.18, { rx: Math.PI / 2, s: [0.04, 0.1, 0.04] }); for (const e of [-1, 1]) s.add(G.ball, SHADE, e * 0.19, B + 0.28, 0, { rz: e * 0.3, s: [0.04, 0.16, 0.08] }); },
    crab: () => { s.add(G.ball, SNOW, 0, B + 0.12, 0, { s: [0.28, 0.12, 0.2] }); for (const e of [-1, 1]) { s.add(G.ball, SNOW, e * 0.3, B + 0.25, 0.15, { s: [0.1, 0.08, 0.06] }); for (let i = 0; i < 3; i++) s.add(G.cap, SNOW, e * 0.3, B + 0.06, -0.1 + i * 0.1, { rz: e * 1.2, s: [0.025, 0.08, 0.025] }); s.add(G.ball, CARVE, e * 0.07, B + 0.25, 0.12, { s: 0.03 }); } },
    daruma: () => { s.add(G.ball, SNOW, 0, B + 0.3, 0, { s: [0.26, 0.3, 0.24] }); s.add(G.ball, CARVE, 0, B + 0.38, 0.19, { s: [0.15, 0.11, 0.05] }); },
    house: () => { s.box(0.5, 0.36, 0.45, SNOW, 0, B + 0.18, 0, { r: 0.05 }); s.add(G.cone6, SNOW, 0, B + 0.52, 0, { ry: Math.PI / 6, s: [0.42, 0.32, 0.38] }); s.box(0.12, 0.18, 0.02, CARVE, 0, B + 0.1, 0.23, { r: 0 }); },
    car: () => { s.box(0.62, 0.18, 0.34, SNOW, 0, B + 0.15, 0, { r: 0.07 }); s.box(0.34, 0.16, 0.3, SNOW, -0.04, B + 0.31, 0, { r: 0.06 }); for (const x of [-0.2, 0.2]) for (const z of [-0.17, 0.17]) s.add(G.cyl, SHADE, x, B + 0.07, z, { rx: Math.PI / 2, s: [0.07, 0.04, 0.07] }); },
    bear: () => { s.add(G.ball, SNOW, 0, B + 0.22, 0, { s: [0.25, 0.24, 0.22] }); s.add(G.ball, SNOW, 0, B + 0.52, 0.02, { s: 0.16 }); for (const e of [-1, 1]) s.add(G.ball, SNOW, e * 0.12, B + 0.66, 0, { s: 0.06 }); s.add(G.ball, SHADE, 0, B + 0.48, 0.16, { s: [0.07, 0.05, 0.05] }); },
    seal: () => { s.add(G.cap, SNOW, 0, B + 0.14, 0, { rz: Math.PI / 2 - 0.3, s: [0.14, 0.32, 0.15] }); s.add(G.ball, SNOW, 0.24, B + 0.3, 0, { s: 0.13 }); for (const e of [-1, 1]) s.add(G.ball, CARVE, 0.33, B + 0.33, e * 0.05, { s: 0.025 }); },
    cat: () => { s.add(G.ball, SNOW, 0, B + 0.2, 0, { s: [0.2, 0.2, 0.18] }); s.add(G.ball, SNOW, 0, B + 0.46, 0.02, { s: 0.14 }); for (const e of [-1, 1]) s.add(G.cone, SNOW, e * 0.08, B + 0.6, 0, { s: [0.05, 0.1, 0.04] }); s.add(G.cap, SNOW, -0.16, B + 0.1, 0.1, { rz: 1.3, s: [0.035, 0.14, 0.035] }); },
    star: () => { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; s.add(G.cone, SNOW, Math.sin(a) * 0.14, B + 0.32 + Math.cos(a) * 0.14, 0, { rz: -a, s: [0.09, 0.22, 0.06] }); } s.add(G.ball, SNOW, 0, B + 0.32, 0, { s: [0.12, 0.12, 0.07] }); },
    heart: () => { for (const e of [-1, 1]) s.add(G.ball, SNOW, e * 0.1, B + 0.42, 0, { s: [0.14, 0.14, 0.09] }); s.add(G.cone, SNOW, 0, B + 0.24, 0, { rx: Math.PI, s: [0.22, 0.28, 0.09] }); },
  })[kind]();
  k.toy.box(0.32, 0.12, 0.02, C.woodLight, 0, 0.18, 0.41, { r: 0.01 }); // the name board
  return group(k);
}

// ---- ice ----
const ICE_KINDS = ['fish', 'flower', 'bird', 'heart'];
export { ICE_KINDS };
export function iceSculpture(kind, tint = 'ice') {
  const k = kits('ice', 'glow'), i = new IKit(), ice = k.ice;
  ice.box(0.9, 0.6, 0.6, C.ice, 0, 0.3, 0, { r: 0.04 }); // the block it's carved on
  const B = 0.6;
  ({
    fish: () => { i.add(G.ball, C.ice, 0, B + 0.55, 0, { rz: 0.5, s: [0.45, 0.2, 0.14] }); i.add(G.cone, C.ice, -0.4, B + 0.25, 0, { rz: 0.5 + Math.PI / 2, s: [0.18, 0.3, 0.05] }); i.add(G.cone, C.ice, 0.05, B + 0.82, 0, { rz: 0.4, s: [0.1, 0.2, 0.03] }); for (let n = 0; n < 4; n++) i.add(G.lump, C.ice, -0.15 + n * 0.12, B + 0.12 + n * 0.08, 0, { s: 0.09 }); },
    flower: () => { i.add(G.cyl8, C.ice, 0, B + 0.35, 0, { s: [0.03, 0.7, 0.03] }); for (let n = 0; n < 7; n++) { const a = (n / 7) * Math.PI * 2; i.add(G.ball, C.ice, Math.cos(a) * 0.17, B + 0.78 + Math.sin(a) * 0.17, 0, { rz: a, s: [0.15, 0.07, 0.05] }); } i.add(G.ball, C.ice, 0, B + 0.78, 0, { s: 0.08 }); for (const e of [-1, 1]) i.add(G.ball, C.ice, e * 0.12, B + 0.3, 0, { rz: e * 0.8, s: [0.14, 0.05, 0.03] }); },
    bird: () => { i.add(G.ball, C.ice, 0, B + 0.4, 0, { s: [0.2, 0.18, 0.16] }); i.add(G.ball, C.ice, 0.18, B + 0.6, 0, { s: 0.11 }); i.add(G.cone, C.ice, 0.32, B + 0.6, 0, { rz: -Math.PI / 2, s: [0.03, 0.1, 0.03] }); for (const e of [-1, 1]) i.add(G.ball, C.ice, -0.05, B + 0.62, e * 0.22, { rx: e * 0.9, s: [0.28, 0.04, 0.14] }); i.add(G.cone, C.ice, -0.25, B + 0.42, 0, { rz: 1.9, s: [0.08, 0.22, 0.03] }); },
    heart: () => { for (const e of [-1, 1]) i.add(G.ball, C.ice, e * 0.15, B + 0.62, 0, { s: [0.2, 0.2, 0.1] }); i.add(G.cone, C.ice, 0, B + 0.34, 0, { rx: Math.PI, s: [0.32, 0.42, 0.1] }); },
  })[kind]();
  const g = group(k);
  const carved = i.mesh(MAT[tint], { cast: false }); g.add(carved);
  // a coloured light set in the snow in front of it, shining up
  const lampCol = { ice: 0x7fd8ff, iceBlue: 0x6fb0ff, icePink: 0xff8fc8 }[tint];
  const lamp = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: lampCol })); lamp.scale.set(0.08, 0.05, 0.08); lamp.position.set(0, 0.03, 0.5); g.add(lamp);
  return g;
}
export function iceSlide() { // stairs of packed snow up the back, an ice run down the front, rails, and a sled waiting
  const k = kits('snow', 'ice', 'toy'), s = k.snow;
  s.box(1.6, 2.2, 1.6, SNOW, 0, 1.1, -1.6, { r: 0.2 });
  for (let i = 0; i < 7; i++) s.box(0.8, 0.3, 0.32, SHADE, -1.2, 0.15 + i * 0.3, -1.0 - i * 0.3 + 1.0, { r: 0.05 }); // steps up the side
  const run = 3.6, drop = 2.0, ang = Math.atan2(drop, run);
  for (const e of [-1, 1]) s.box(0.18, 0.36, run + 0.6, SNOW, e * 0.55, drop / 2 + 0.18, 0.3, { rx: ang, r: 0.08 }); // the side banks
  k.ice.box(0.95, 0.1, run + 0.6, 0xd8f2ff, 0, drop / 2 + 0.02, 0.3, { rx: ang, r: 0.03 }); // the ice run
  s.box(1.4, 0.2, 1.0, SHADE, 0, 0.1, 2.6, { r: 0.08 }); // the run-out
  for (const e of [-1, 1]) { for (const z of [-2.3, -0.9]) k.toy.add(G.cyl8, 0xe8483f, e * 0.75, 2.6, z, { s: [0.03, 0.8, 0.03] }); k.toy.add(G.cyl8, 0xe8483f, e * 0.75, 3.0, -1.6, { rx: Math.PI / 2, s: [0.03, 1.4, 0.03] }); } // (the rails round the top)
  return group(k);
}
export function iceWall() { // a low wall of clear blocks, lit from inside
  const k = kits('ice');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6 - r; c++) k.ice.box(0.5, 0.3, 0.35, C.ice, (c - (5 - r) / 2) * 0.52, 0.15 + r * 0.31, 0, { r: 0.02 });
  return group(k);
}
// icicles along an eave: n hanging cones, longer in the middle
export function icicles(len = 2, n = 14) {
  const k = kits('ice');
  for (let i = 0; i < n; i++) { const x = (i / (n - 1) - 0.5) * len, l = 0.08 + (0.5 - Math.abs(i / (n - 1) - 0.5)) * 0.35 * (0.6 + ((i * 37) % 10) / 10); k.ice.add(G.cone, 0xe8f6ff, x, -l / 2, 0, { rx: Math.PI, s: [0.03, l, 0.03] }); }
  k.ice.box(len + 0.1, 0.06, 0.08, 0xe8f6ff, 0, 0, 0, { r: 0.02 });
  return group(k);
}

// The village (santorini/DESIGN.md §1.4, §1.5, §4): white sugar-cube houses stacked down the caldera's terraces, blue doors
// and shutters, a few pale blue, yellow and salmon ones, flat roofs with a low wall or a barrel vault, pools and parasols on
// the terraces, bougainvillea spilling over the walls; the blue-domed church with its bell tower, two small chapels below
// it, the windmill on the ridge, the zigzag steps down the face to the harbour with its tavernas and pier. Everything that
// doesn't move is one mesh (and the domes, the pools: one each, for their gloss).
import * as THREE from 'three';
import { Kit, toy } from '../../fuji/src/kit.js';
import { at, facing, terraceY, rim, faceTop, profile, ROWS, ROW, FACE, HARBOR, RC } from './land.js';

const WHITE = 0xf7f3ea, BLUE = 0x2f7fd6, DOME = 0x1f5fbf, PAVE = 0xf1ece0, THATCH = 0xc9a46a, WOOD = 0x9a6a44;
const BODIES = [0x9fd4f0, 0xf6d98a, 0xf2b49a, 0xe9e1f2];
const rad = Math.PI / 180;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// a frame: an origin and a yaw; P(local) → world [x, y, z]
export const frame = (x, y, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return { ry, P: (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c] }; };
// a slot on the cliff: at angle a, d out from the shore, standing at y, facing the sea
export const slot = (a, d, y) => { const [x, z] = at(a, d); return frame(x, y, z, facing(a)); };
const cellD = (row) => (row < ROWS ? FACE + row * ROW + 0.38 : FACE + ROWS * ROW + 0.45);

const vaultG = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2); // (along x, arched up)
const archG = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2); // (along z: an arch seen from the front)
const domeG = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
const drumG = new THREE.CylinderGeometry(1, 1, 1, 24), coneG = new THREE.ConeGeometry(1, 1, 18), ballG = new THREE.IcosahedronGeometry(1, 1);

// the special places: [angle, row, width, what]
const SPECIAL = [
  [-100, 4, 1.9, 'church'], [-96.2, 4, 0.9, 'belfry'],
  [-94, 2, 1.1, 'chapel'], [-106.4, 2, 1.1, 'chapel'], [-121, 3, 1.0, 'chapel'],
  [-101.5, 5, 6.2, 'hero'], [-95.5, 5, 1.4, 'clear'], [-98, 3, 2.6, 'clear'], [-88, 5, 1.6, 'cafe'], [-68, 4, 2.4, 'mill'], [-68, 5, 2.4, 'mill'],
];
const blocked = (a, row, w) => SPECIAL.some(([sa, sr, sw]) => sr === row && Math.abs(a - sa) * rad * (RC + cellD(row)) < (w + sw) / 2 + 0.08);

function house(k, pools, f, w, h, dp, { col = WHITE, vault = false, top = true } = {}) {
  k.box(w, h, dp, col, ...f.P(0, h / 2, 0), { ry: f.ry, r: 0.06 });
  const door = rnd() < 0.85 ? BLUE : rnd() < 0.5 ? 0x5fb6e6 : 0xb8473a;
  const dx = (rnd() - 0.5) * Math.max(0, w - 0.42);
  k.box(0.19, 0.32, 0.03, door, ...f.P(dx, 0.27, dp / 2), { ry: f.ry, r: 0 });
  const wx = dx > 0 ? dx - 0.3 : dx + 0.3;
  if (Math.abs(wx) < w / 2 - 0.1) k.box(0.14, 0.15, 0.03, door, ...f.P(wx, 0.4, dp / 2), { ry: f.ry, r: 0 });
  if (h > 1.25) k.box(0.15, 0.17, 0.03, door, ...f.P(-dx * 0.6, h - 0.32, dp / 2), { ry: f.ry, r: 0 });
  if (vault) { k.add(vaultG, col, ...f.P(0, h - 0.01, 0), { ry: f.ry, s: [w * 0.97, dp * 0.36, dp * 0.49] }); return; }
  k.box(w, 0.1, 0.05, col, ...f.P(0, h + 0.04, dp / 2 - 0.025), { ry: f.ry, r: 0.02 }); // (the terrace's low wall)
  if (!top) return;
  const r = rnd();
  if (r < 0.14 && w > 0.85) pools.box(w * 0.6, 0.03, dp * 0.5, 0x3fd6e8, ...f.P(0, h + 0.005, 0.02), { ry: f.ry, r: 0 }); // a pool
  else if (r < 0.3) { // a parasol and a lounger
    const px = (rnd() - 0.5) * (w - 0.3);
    const [x, y, z] = f.P(px, h, 0);
    k.add(drumG, 0xe8e2d4, x, y + 0.18, z, { s: [0.012, 0.36, 0.012] });
    k.add(coneG, rnd() < 0.7 ? 0xfbfaf6 : 0x2f7fd6, x, y + 0.4, z, { s: [0.2, 0.09, 0.2] });
    k.box(0.12, 0.04, 0.28, 0xfbfaf6, ...f.P(px + 0.18, h + 0.04, 0.02), { ry: f.ry, r: 0.015 });
  }
}

// bougainvillea spilling over a wall: pink balls hanging from a front corner
function flowers(k, f, x, y, z) {
  for (let i = 0; i < 9; i++) {
    const s = 0.05 + rnd() * 0.05, c = i < 7 ? (rnd() < 0.55 ? 0xe83d8c : 0xc22a7a) : 0x4f9a4a;
    k.add(ballG, c, ...f.P(x + (rnd() - 0.5) * 0.22, y - rnd() * 0.32, z + rnd() * 0.06), { s });
  }
}

function church(k, domes, f, w, h, dp, dr) {
  k.box(w, h, dp, WHITE, ...f.P(0, h / 2, 0), { ry: f.ry, r: 0.05 });
  k.box(0.2, 0.36, 0.03, BLUE, ...f.P(0, 0.28, dp / 2), { ry: f.ry, r: 0 });
  k.add(archG, WHITE, ...f.P(0, 0.46, dp / 2 + 0.005), { ry: f.ry, s: [0.12, 0.12, 0.03] });
  k.add(drumG, WHITE, ...f.P(0, h + 0.1, 0), { ry: f.ry, s: [dr * 0.9, 0.22, dr * 0.9] });
  for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; k.box(0.05, 0.1, 0.02, 0x2a5aa8, ...f.P(Math.sin(t) * dr * 0.9, h + 0.11, Math.cos(t) * dr * 0.9), { ry: f.ry + t, r: 0 }); } // (the drum's windows)
  domes.add(domeG, DOME, ...f.P(0, h + 0.2, 0), { s: [dr, dr * 1.05, dr] });
  const top = h + 0.2 + dr * 1.05;
  k.add(drumG, WHITE, ...f.P(0, top + 0.03, 0), { s: [0.05, 0.08, 0.05] });
  k.box(0.03, 0.24, 0.03, WHITE, ...f.P(0, top + 0.18, 0), { ry: f.ry, r: 0 });
  k.box(0.14, 0.03, 0.03, WHITE, ...f.P(0, top + 0.22, 0), { ry: f.ry, r: 0 });
}

function belfry(k, f, scene) {
  const T = 0.28;
  k.box(0.86, 0.8, T, WHITE, ...f.P(0, 0.4, 0), { ry: f.ry, r: 0.03 });
  for (const lx of [-0.37, 0, 0.37]) k.box(0.12, 0.5, T, WHITE, ...f.P(lx, 1.05, 0), { ry: f.ry, r: 0.02 });
  k.box(0.86, 0.14, T, WHITE, ...f.P(0, 1.36, 0), { ry: f.ry, r: 0.03 });
  for (const lx of [-0.21, 0.21]) k.box(0.1, 0.36, T, WHITE, ...f.P(lx, 1.6, 0), { ry: f.ry, r: 0.02 });
  k.add(archG, WHITE, ...f.P(0, 1.78, 0), { ry: f.ry, s: [0.26, 0.2, T] });
  k.box(0.03, 0.22, 0.03, WHITE, ...f.P(0, 2.08, 0), { ry: f.ry, r: 0 });
  k.box(0.13, 0.03, 0.03, WHITE, ...f.P(0, 2.12, 0), { ry: f.ry, r: 0 });
  // the bells: each hangs from the top of its opening, and swings
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb98a3a, roughness: 0.4, metalness: 0.6 });
  const bellG = new THREE.CylinderGeometry(0.035, 0.075, 0.12, 14).translate(0, -0.1, 0);
  return [[-0.185, 1.3, 0.14], [0.185, 1.3, 0.12], [0, 1.78, 0.1]].map(([lx, ly, s]) => {
    const g = new THREE.Group(); g.position.set(...f.P(lx, ly, 0)); g.rotation.y = f.ry;
    const b = new THREE.Mesh(bellG, bronze); b.scale.setScalar(s / 0.12); b.castShadow = true; g.add(b); scene.add(g);
    return g;
  });
}

function windmill(k, f, scene) {
  const [x, y, z] = f.P(0, 0, 0);
  k.add(drumG, WHITE, x, y + 0.65, z, { s: [0.44, 1.3, 0.44] });
  k.add(drumG, WHITE, x, y + 0.04, z, { s: [0.56, 0.08, 0.56] });
  k.box(0.2, 0.34, 0.06, BLUE, ...f.P(0, 0.3, 0.43), { ry: f.ry, r: 0 });
  k.box(0.13, 0.13, 0.04, BLUE, ...f.P(0.18, 0.95, 0.42), { ry: f.ry, r: 0 });
  k.add(coneG, THATCH, x, y + 1.62, z, { s: [0.5, 0.65, 0.5] });
  // the sails: six spokes with canvas, on their own mesh (they turn)
  const s = new Kit();
  s.ball(0.06, WOOD, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const p = (i / 6) * Math.PI * 2, dx = Math.cos(p), dy = Math.sin(p);
    s.box(0.03, 1.0, 0.03, WOOD, dx * 0.5, dy * 0.5, 0, { rz: p - Math.PI / 2, r: 0 });
    s.box(0.22, 0.72, 0.01, 0xfbfaf6, dx * 0.6 - dy * 0.12, dy * 0.6 + dx * 0.12, 0.01, { rz: p - Math.PI / 2, r: 0 });
  }
  const sails = s.bake(toy()); sails.castShadow = true;
  const hub = new THREE.Group(); hub.position.set(...f.P(0, 1.42, 0.52)); hub.rotation.y = f.ry; hub.add(sails); scene.add(hub);
  return sails;
}

// the steps: zigzag up the face from the water to the village's lowest terrace
function steps(k) {
  const path = [], LEGS = 7, A = -149, B = -139, y0 = 0.4, y1 = faceTop(-144) + 0.02, N = 14;
  for (let j = 0; j < LEGS; j++) {
    const from = j % 2 ? B : A, to = j % 2 ? A : B;
    for (let s = j ? 1 : 0; s <= N; s++) {
      const u = s / N, a = from + (to - from) * u, y = y0 + (y1 - y0) * (j + u) / LEGS;
      const d = FACE * Math.pow(Math.max(0.01, y) / faceTop(a), 1 / 0.7) + 0.08;
      const [x, z] = at(a, d); path.push([x, y, z, a]);
    }
  }
  for (const [x, y, z, a] of path) {
    const ry = facing(a), f = frame(x, y, z, ry);
    k.box(0.26, 0.5, 0.44, PAVE, ...f.P(0, -0.25, 0), { ry, r: 0 });
    k.box(0.26, 0.13, 0.05, WHITE, ...f.P(0, 0.06, 0.21), { ry, r: 0 });
  }
  return path;
}

export function village(scene) {
  const k = new Kit(), domes = new Kit(), pools = new Kit();

  // the houses, row by row up the terraces, and along the top
  for (let row = 0; row <= ROWS; row++) {
    const d = cellD(row), r = RC + d;
    let a = -184 + rnd() * 1.5;
    while (a < -61) {
      const w = 0.75 + rnd() * 0.55, da = w / r / rad, ac = a + da / 2;
      const thin = Math.min(1, (ac + 186) / 14, (-59 - ac) / 6); // (fewer toward the ends)
      const stairTop = row < 2 && ac > -152 && ac < -136; // (where the steps come up)
      if (!blocked(ac, row, w) && !stairTop && rnd() < thin) {
        const y = terraceY(ac, row), rise = (rim(ac) - faceTop(ac)) / ROWS;
        const tall = rnd() < 0.15, h = row < ROWS ? rise + 0.12 + (tall ? 0.45 : 0) : 0.9 + (tall ? 0.4 : 0);
        const f = slot(ac, d, y), dp = row < ROWS ? 0.6 : 0.72;
        const pale = rnd() < 0.18 && !(row >= 3 && Math.abs(ac + 100) < 10); // (all white round the church)
        house(k, pools, f, w, h, dp, { col: pale ? BODIES[Math.floor(rnd() * BODIES.length)] : WHITE, vault: rnd() < 0.3 });
        if (rnd() < 0.22) flowers(k, f, (rnd() < 0.5 ? -1 : 1) * (w / 2 - 0.06), h - 0.02, dp / 2 + 0.02);
      }
      a += da + (0.12 + (rnd() < 0.16 ? 0.55 : 0)) / r / rad;
    }
  }

  // the church: its blue dome over the sea, its bell tower beside it, and the chapels below
  const ch = slot(-100, cellD(4) + 0.05, terraceY(-100, 4));
  church(k, domes, ch, 1.4, 1.15, 0.75, 0.42);
  for (const [a, row, dr] of [[-94, 2, 0.3], [-106.4, 2, 0.32], [-121, 3, 0.3]]) church(k, domes, slot(a, cellD(row) + 0.06, terraceY(a, row)), 0.95, 0.95, 0.7, dr);
  const bells = belfry(k, slot(-96.2, cellD(4), terraceY(-96.2, 4)), scene);
  flowers(k, ch, 0.66, 1.1, 0.39);

  // the hero's terrace at the top: paved, a low wall at its edge, a bench
  { const f = slot(-101, 6.55, rim(-101)); k.box(4.4, 0.06, 0.9, PAVE, ...f.P(0, 0.03, 0.1), { ry: f.ry, r: 0.02 }); k.box(4.4, 0.16, 0.08, WHITE, ...f.P(0, 0.08, 0.53), { ry: f.ry, r: 0.03 }); }
  // the café terrace: two tables under parasols
  { const f = slot(-88, cellD(5), rim(-88)); k.box(1.5, 0.06, 0.8, PAVE, ...f.P(0, 0.03, 0), { ry: f.ry, r: 0.02 }); k.box(1.5, 0.16, 0.07, WHITE, ...f.P(0, 0.08, 0.4), { ry: f.ry, r: 0.03 });
    for (const lx of [-0.4, 0.4]) { const [x, y, z] = f.P(lx, 0, 0); k.add(drumG, BLUE, x, y + 0.17, z, { s: [0.11, 0.03, 0.11] }); k.add(drumG, BLUE, x, y + 0.085, z, { s: [0.02, 0.17, 0.02] }); k.add(drumG, 0xe8e2d4, x, y + 0.3, z, { s: [0.012, 0.6, 0.012] }); k.add(coneG, 0xfbfaf6, x, y + 0.62, z, { s: [0.32, 0.12, 0.32] }); } }

  // the windmill on the ridge
  const sails = windmill(k, slot(-68, cellD(5) - 0.2, rim(-68)), scene);

  // cave houses dug into the top of the face
  for (const a of [-131, -127.5, -84, -79.5, -75, -168, -172.5]) { const d = 1.72, f = slot(a, d, profile(d, a) - 0.25); k.box(0.7, 0.62, 0.3, WHITE, ...f.P(0, 0.31, 0.05), { ry: f.ry, r: 0.05 }); k.box(0.17, 0.3, 0.03, BLUE, ...f.P(0, 0.2, 0.2), { ry: f.ry, r: 0 }); k.add(archG, BLUE, ...f.P(0, 0.35, 0.2), { ry: f.ry, s: [0.085, 0.085, 0.03] }); }

  // the steps down to the harbour
  const path = steps(k);

  // the harbour: tavernas against the cliff, tables on the quay, a wooden pier
  for (const [da, col] of [[-3.2, WHITE], [0, 0xf6d98a], [3.2, WHITE]]) { const a = HARBOR + da, f = slot(a, 1.15, 0.22); house(k, pools, f, 0.95, 0.8, 0.55, { col, top: false }); k.box(0.95, 0.04, 0.4, 0x2f7fd6, ...f.P(0, 0.72, 0.42), { ry: f.ry, r: 0 }); }
  for (const da of [-3.6, -1.6, 1.6, 3.6]) { const f = slot(HARBOR + da, 0.4, 0.22), [x, y, z] = f.P(0, 0, 0); k.add(drumG, WHITE, x, y + 0.15, z, { s: [0.12, 0.03, 0.12] }); k.add(drumG, WHITE, x, y + 0.075, z, { s: [0.02, 0.15, 0.02] }); for (const s of [-1, 1]) k.box(0.1, 0.12, 0.1, BLUE, ...f.P(s * 0.2, 0.06, 0), { ry: f.ry, r: 0.01 }); }
  { const a = HARBOR + 0.8, f = slot(a, -1.0, 0.16); k.box(0.32, 0.05, 2.6, WOOD, ...f.P(0, 0, 0), { ry: f.ry, r: 0.01 }); for (const lz of [-1.0, -0.2, 0.6]) for (const s of [-1, 1]) { const [x, y, z] = f.P(s * 0.2, 0, -lz); k.add(drumG, 0x6e4a30, x, y - 0.35, z, { s: [0.03, 0.75, 0.03] }); } }

  // a few olive bushes on the top
  for (let i = 0; i < 14; i++) { const a = -132 + rnd() * 62, d = cellD(5) + 1.6 + rnd() * 2.5, [x, z] = at(a, d), y = rim(a) + Math.min(0.8, (d - FACE - ROWS * ROW) * 0.08); for (let j = 0; j < 4; j++) k.add(ballG, j % 2 ? 0x6f8f4a : 0x58773c, x + (rnd() - 0.5) * 0.3, y + 0.12 + rnd() * 0.12, z + (rnd() - 0.5) * 0.3, { s: 0.12 + rnd() * 0.08 }); }

  const town = k.bake(toy()); town.castShadow = true; town.receiveShadow = true; scene.add(town);
  const dm = domes.bake(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32 })); dm.castShadow = true; scene.add(dm);
  const pl = pools.bake(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, emissive: 0x1aa0c0, emissiveIntensity: 0.3 })); scene.add(pl);
  return { sails, bells, path, church: ch };
}

// Greenery round a café (cafe/DESIGN.md §2.6): northern trees (birch, spruce, rowan), a lilac, clipped hedges,
// flower beds and planters, window boxes, ivy on a wall, a bench and a bike rack. Trees are one merged shape each,
// drawn as often as needed and swaying (town/src/nature.js); everything else is plain parts, baked with the street.
import * as THREE from 'three';
import { part, tube, seeded, ellipsoid } from '../../sealife/src/kit.js';
import { treeMesh, leafy } from '../../town/src/nature.js';
import { mesh, box, cyl, rbox } from '../../airport/src/parts.js';
import { CAFE, M } from './furniture.js';

// シラカバ: a slim white trunk with dark marks, a light, airy crown
export function birch({ seed = 1, h = 5.5 } = {}) {
  return treeMesh('birch' + seed + h, () => {
    const rnd = seeded(seed + 11), lean = (rnd() - 0.5) * 0.4;
    const parts = [part(tube([[0, 0, 0], [lean * 0.3, h * 0.5, 0], [lean, h, 0.05]], 0.11, 0.05, 7), (p) => (Math.sin(p.y * 13 + p.x * 40) > 0.85 ? '#3a3a36' : '#ece8de'))];
    for (let i = 0; i < 7; i++) {
      const y = h * (0.55 + rnd() * 0.45), a = rnd() * Math.PI * 2, r = 0.4 + rnd() * 0.5;
      parts.push(part(ellipsoid(0.55 + rnd() * 0.25, 0.6, 0.55, 9), leafy('#9cc46a', '#b8d47a', 0.2), { pos: [lean * y / h + Math.cos(a) * r, y, Math.sin(a) * r] }));
    }
    return parts;
  }, { mode: 'sway', amp: 0.08, freq: 1.1, waves: 0.2, z0: h * 0.4, len: h });
}
// トウヒ: a dark cone of stacked tiers
export function spruce({ seed = 1, h = 6 } = {}) {
  return treeMesh('spruce' + seed + h, () => {
    const rnd = seeded(seed + 23), parts = [part(tube([[0, 0, 0], [0, h * 0.9, 0]], 0.13, 0.06, 6), '#5a4636')];
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const y = h * 0.18 + i * (h * 0.7) / tiers, r = (1 - i / tiers) * h * 0.26 + 0.25;
      const g = new THREE.ConeGeometry(r, h * 0.26, 9); g.rotateY(rnd() * 2);
      parts.push(part(g, leafy('#3f6b4a', '#4f7d55', 0.3), { pos: [0, y + h * 0.1, 0] }));
    }
    return parts;
  }, { mode: 'sway', amp: 0.03, freq: 0.7, waves: 0.1, z0: h * 0.3, len: h });
}
// ナナカマド: a round crown with clusters of red berries
export function rowan({ seed = 1 } = {}) {
  return treeMesh('rowan' + seed, () => {
    const rnd = seeded(seed + 37), parts = [part(tube([[0, 0, 0], [0.05, 1.3, 0], [0.12, 2.3, 0]], 0.1, 0.06, 6), '#6b5a48')];
    for (let i = 0; i < 5; i++) parts.push(part(ellipsoid(0.85, 0.7, 0.85, 10), leafy('#5f9a4c', '#74ad58'), { pos: [(rnd() - 0.5) * 1.1, 2.5 + rnd() * 0.6, (rnd() - 0.5) * 1.1] }));
    for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, y = 2.2 + rnd() * 1.2, r = 0.8 + rnd() * 0.3; parts.push(part(ellipsoid(0.1, 0.08, 0.1, 6), '#d2402e', { pos: [Math.cos(a) * r, y, Math.sin(a) * r] })); }
    return parts;
  }, { mode: 'sway', amp: 0.05, freq: 0.9, waves: 0.1, z0: 1.3, len: 3 });
}
// ライラック: a bush of green with purple plumes
export function lilac({ seed = 1, color = '#b48ad0' } = {}) {
  return treeMesh('lilac' + seed + color, () => {
    const rnd = seeded(seed + 41), parts = [];
    for (let i = 0; i < 6; i++) parts.push(part(ellipsoid(0.55, 0.5, 0.55, 8), leafy('#5a8f4a', '#6aa054'), { pos: [(rnd() - 0.5) * 1.0, 0.55 + rnd() * 0.5, (rnd() - 0.5) * 1.0] }));
    for (let i = 0; i < 12; i++) { const a = rnd() * Math.PI * 2, r = 0.45 + rnd() * 0.3; parts.push(part(new THREE.ConeGeometry(0.1, 0.32, 6), i % 3 ? color : '#e6d2f0', { pos: [Math.cos(a) * r, 1.0 + rnd() * 0.4, Math.sin(a) * r] })); }
    return parts;
  }, { mode: 'sway', amp: 0.04, freq: 1.0, waves: 0.2, z0: 0.3, len: 1.5 });
}

// flowers on a strip: little stems and heads in a few colours (one group of parts)
function flowers(g, w, d, y, { colors = ['#e2a9a0', '#f2c94c', '#f6f1e6', '#b48ad0'], n = 18, seed = 3, tall = 0.22 } = {}) {
  const rnd = seeded(seed), stem = M(0x5f8f4a), heads = colors.map((c) => M(c, { roughness: 0.7 }));
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * (w - 0.1), z = (rnd() - 0.5) * (d - 0.1), h = tall * (0.7 + rnd() * 0.6);
    g.add(cyl(0.008, 0.008, h, stem, x, y + h / 2, z, 4));
    g.add(mesh(new THREE.SphereGeometry(0.04 + rnd() * 0.02, 6, 4), heads[i % heads.length], x, y + h, z));
  }
}
// a wooden planter box with a low hedge, lavender, grasses or flowers
export function planter({ len = 1.6, w = 0.45, h = 0.45, kind = 'flowers', wood = CAFE.oak, seed = 3 } = {}) {
  const g = new THREE.Group();
  g.add(box(len, h, w, M(wood), 0, h / 2, 0));
  for (let x = -len / 2 + 0.1; x < len / 2; x += 0.2) g.add(box(0.015, h - 0.06, 0.01, M(0xa07a50), x, h / 2, w / 2 + 0.005)); // slats
  g.add(box(len - 0.06, 0.02, w - 0.06, M(0x4a3426), 0, h - 0.02, 0)); // soil
  if (kind === 'hedge') g.add(rbox(len - 0.08, 0.4, w - 0.06, 0.12, M(0x4f7d45, { roughness: 1 }), 0, h + 0.18, 0));
  else if (kind === 'lavender') { const rnd = seeded(seed); for (let i = 0; i < len * 7; i++) { const x = -len / 2 + 0.12 + (i / (len * 7)) * (len - 0.24), z = (rnd() - 0.5) * (w - 0.15); g.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), M(0x7a9a6a), x, h + 0.06, z)); g.add(mesh(new THREE.ConeGeometry(0.03, 0.16, 5), M(0x8a6ab8), x, h + 0.2, z)); } }
  else if (kind === 'grass') { const rnd = seeded(seed); for (let i = 0; i < len * 6; i++) { const b = mesh(new THREE.ConeGeometry(0.06, 0.5, 4), M(i % 2 ? 0xb8b06a : 0x9aa85a), -len / 2 + 0.1 + rnd() * (len - 0.2), h + 0.25, (rnd() - 0.5) * (w - 0.15)); b.rotation.z = (rnd() - 0.5) * 0.4; g.add(b); } }
  else flowers(g, len, w, h, { seed, n: Math.round(len * 12) });
  return g;
}
// a window box under a sill: a slim trough spilling flowers
export function windowBox({ len = 1.4, colors } = {}) {
  const g = new THREE.Group();
  g.add(box(len, 0.16, 0.2, M(CAFE.white), 0, 0.08, 0));
  for (let i = 0; i < len * 6; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), M(i % 3 ? 0x5f8f4a : 0x74ad58), -len / 2 + 0.08 + i * (len - 0.16) / (len * 6), 0.18, (i % 2) * 0.05 - 0.02));
  flowers(g, len, 0.16, 0.14, { colors, n: Math.round(len * 10), tall: 0.12, seed: Math.round(len * 10) });
  return g;
}
// a bed of flowers edged with stones, w × d
export function flowerBed({ w = 2, d = 1, colors, seed = 5 } = {}) {
  const g = new THREE.Group();
  g.add(box(w, 0.08, d, M(0x4a3426, { roughness: 1 }), 0, 0.04, 0));
  for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.25) for (const z of [-d / 2, d / 2]) g.add(rbox(0.22, 0.1, 0.12, 0.04, M(0xb0aa9e), x, 0.05, z));
  for (let z = -d / 2 + 0.25; z < d / 2; z += 0.25) for (const x of [-w / 2, w / 2]) g.add(rbox(0.12, 0.1, 0.22, 0.04, M(0xb0aa9e), x, 0.05, z));
  for (let i = 0; i < w * d * 4; i++) { const r = seeded(seed + i); g.add(mesh(new THREE.SphereGeometry(0.1, 6, 4), M(0x5f8f4a), (r() - 0.5) * (w - 0.3), 0.12, (r() - 0.5) * (d - 0.3))); }
  flowers(g, w, d, 0.08, { colors, n: Math.round(w * d * 16), seed });
  return g;
}
// a clipped box hedge
export function hedge({ len = 3, h = 0.8, w = 0.6 } = {}) {
  const g = new THREE.Group();
  g.add(rbox(len, h, w, 0.18, M(0x4a7a44, { roughness: 1 }), 0, h / 2, 0));
  return g;
}
// ivy climbing a wall (in the wall's plane, facing +Z): clumps of leaves thinning upward
export function ivy({ w = 2.5, h = 2.6, seed = 7 } = {}) {
  const g = new THREE.Group(), rnd = seeded(seed), ms = [M(0x3f6b3a), M(0x557f45), M(0x6a9450)];
  for (let i = 0; i < w * h * 9; i++) {
    const y = Math.pow(rnd(), 1.6) * h, x = (rnd() - 0.5) * w * (1 - (y / h) * 0.5);
    const l = mesh(new THREE.CircleGeometry(0.09 + rnd() * 0.05, 5), ms[i % 3], x, y, 0.02 + rnd() * 0.03); l.rotation.z = rnd() * 3; g.add(l);
  }
  return g;
}
// a park bench of slats on iron legs
export function bench({ len = 1.6 } = {}) {
  const g = new THREE.Group(), wood = M(CAFE.oak), iron = M(CAFE.iron);
  for (let k = 0; k < 3; k++) g.add(box(len, 0.03, 0.1, wood, 0, 0.42, -0.12 + k * 0.12));
  for (let k = 0; k < 2; k++) g.add(box(len, 0.1, 0.03, wood, 0, 0.6 + k * 0.14, -0.22));
  for (const x of [-len / 2 + 0.12, len / 2 - 0.12]) { g.add(box(0.05, 0.42, 0.36, iron, x, 0.21, 0)); g.add(box(0.05, 0.4, 0.04, iron, x, 0.62, -0.22)); }
  return g;
}
// a planter with a little clipped tree (a bay laurel ball on a stem), for either side of a door
export function topiary({ pot = CAFE.white, h = 1.5 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.26, 0.2, 0.5, M(pot), 0, 0.25, 0, 12));
  g.add(cyl(0.03, 0.035, h - 0.6, M(0x6b4a35), 0, 0.5 + (h - 0.6) / 2, 0, 6));
  g.add(mesh(new THREE.SphereGeometry(0.38, 12, 10), M(0x4f7d45, { roughness: 1 }), 0, h, 0));
  return g;
}

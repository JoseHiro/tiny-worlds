// The street things (snowfest/DESIGN.md §1.3, §1.6, §5): lamps with snow caps, vertical traffic lights (as in Hokkaido,
// so snow slides off), a bus stop, a vending machine, a bench, fences, banners, signboards, trees with bulbs, firs, AC
// units and a post box under snow, and the banks of snow the ploughs leave. Snow on top comes from the toy material;
// the heaped snow is its own (snow) material.
import * as THREE from 'three';
import { kits, group, G, C } from './kit.js';

export function streetLamp() { // a tall dark pole, a curved arm, a lamp with a hat of snow
  const k = kits('toy', 'glow', 'snow'), t = k.toy;
  t.add(G.cyl8, 0x3a4152, 0, 1.4, 0, { s: [0.05, 2.8, 0.05] }); t.add(G.cyl8, 0x3a4152, 0, 0.1, 0, { s: [0.12, 0.2, 0.12] });
  t.add(G.torus, 0x3a4152, 0.2, 2.8, 0, { rx: Math.PI / 2, s: [0.2, 0.2, 0.2] });
  t.add(G.cyl, 0x3a4152, 0.4, 2.85, 0, { s: [0.16, 0.08, 0.16] }); k.glow.add(G.half, 0xfff0d0, 0.4, 2.81, 0, { rx: Math.PI, s: [0.13, 0.1, 0.13] });
  k.snow.add(G.half, C.snow, 0.4, 2.89, 0, { s: [0.19, 0.1, 0.19] });
  return group(k);
}
export function signal() { // a vertical traffic light: red at the top, a hood over each lamp, snow on the hoods
  const k = kits('toy', 'glow'), t = k.toy;
  t.add(G.cyl8, 0x9aa0aa, 0, 1.6, 0, { s: [0.04, 3.2, 0.04] }); t.box(0.04, 0.04, 0.5, 0x9aa0aa, 0, 3.0, 0.25, { r: 0 });
  t.box(0.26, 0.82, 0.14, 0x9aa0aa, 0, 2.7, 0.5, { r: 0.04 });
  [[0xff4a3a, 2.95], [0xffc23a, 2.7], [0x3ad08a, 2.45]].forEach(([col, y], i) => { (i === 0 ? k.glow : t).add(G.cyl, i === 0 ? col : 0x5a6070, 0, y, 0.58, { rx: Math.PI / 2, s: [0.09, 0.02, 0.09] }); t.add(G.half, 0x9aa0aa, 0, y + 0.03, 0.6, { rx: Math.PI / 2 + 0.2, s: [0.11, 0.12, 0.11] }); });
  t.box(0.04, 0.6, 0.04, 0x9aa0aa, 0, 1.2, 0.0, { r: 0 }); k.glow.box(0.18, 0.18, 0.04, 0x3ad08a, 0.12, 1.4, 0.02, { r: 0.02 }); // the walk signal
  return group(k);
}
export function busStop() { // a glass shelter with a bench and a timetable, snow on the roof
  const k = kits('toy', 'glass'), t = k.toy;
  t.box(1.8, 0.08, 0.8, 0x9aa0aa, 0, 1.6, 0, { r: 0.03 }); for (const x of [-0.85, 0.85]) t.add(G.cyl8, 0x9aa0aa, x, 0.8, -0.3, { s: [0.04, 1.6, 0.04] });
  k.glass.box(1.7, 1.3, 0.03, 0x9ac0e0, 0, 0.85, -0.35, { r: 0 }); t.box(1.2, 0.06, 0.3, C.woodLight, 0, 0.42, -0.15, { r: 0.02 });
  t.add(G.cyl8, 0x9aa0aa, 1.2, 1.0, 0.3, { s: [0.035, 2.0, 0.035] }); t.add(G.cyl, 0x3f6fd6, 1.2, 1.9, 0.3, { rx: Math.PI / 2, s: [0.2, 0.03, 0.2] });
  return group(k);
}
export function vending() { // a vending machine, glowing, drinks behind its window, a little snow on top
  const k = kits('toy', 'glow'), t = k.toy;
  t.box(0.7, 1.3, 0.5, 0xe8483f, 0, 0.65, 0, { r: 0.04 }); k.glow.box(0.56, 0.6, 0.02, 0xf4f8ff, 0, 0.9, 0.25, { r: 0 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) t.add(G.cyl, C.coats[(r * 5 + c) % 6], -0.2 + c * 0.1, 0.72 + r * 0.18, 0.27, { s: [0.03, 0.1, 0.03] });
  t.box(0.3, 0.1, 0.04, 0x2a2f40, 0, 0.28, 0.26, { r: 0.01 });
  return group(k);
}
export function bench() { // a park bench buried to the seat, a cushion of snow on it
  const k = kits('toy', 'snow'), t = k.toy;
  t.box(1.2, 0.06, 0.4, C.wood, 0, 0.42, 0, { r: 0.02 }); t.box(1.2, 0.3, 0.05, C.wood, 0, 0.66, -0.18, { r: 0.02 }); for (const x of [-0.5, 0.5]) t.box(0.06, 0.42, 0.36, 0x3a4152, x, 0.21, 0, { r: 0.01 });
  k.snow.box(1.15, 0.14, 0.38, C.snow, 0, 0.5, 0, { r: 0.07 });
  return group(k);
}
export function fence(len = 3) { // a low wooden fence of posts and two rails, snow along the top
  const k = kits('toy'), t = k.toy, n = Math.round(len / 0.5);
  for (let i = 0; i <= n; i++) t.box(0.07, 0.55, 0.07, C.woodLight, -len / 2 + i * len / n, 0.27, 0, { r: 0.02 });
  for (const y of [0.2, 0.45]) t.box(len, 0.06, 0.04, C.woodLight, 0, y, 0, { r: 0.01 });
  return group(k);
}
export function nobori(col = C.noren) { // a tall banner on a pole (it flaps)
  const k = kits('toy'); k.toy.add(G.cyl8, 0xc8ccd4, 0, 1.1, 0, { s: [0.02, 2.2, 0.02] }); k.toy.box(0.4, 0.02, 0.02, 0xc8ccd4, 0.2, 2.15, 0, { r: 0 });
  const g = group(k);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 1.5, 1, 8).translate(0.2, 1.38, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, side: THREE.DoubleSide })); cloth.castShadow = true; g.add(cloth);
  const p = cloth.geometry.attributes.position, z0 = Float32Array.from(p.array);
  g.userData.update = (t) => { for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(t * 3 + z0[i * 3 + 1] * 3) * 0.04 * (2.15 - z0[i * 3 + 1])); p.needsUpdate = true; };
  return g;
}
export function signboard() { // a guide board on two legs: a map, an arrow
  const k = kits('toy'), t = k.toy;
  for (const x of [-0.45, 0.45]) t.add(G.cyl8, 0x6b4a34, x, 0.6, 0, { s: [0.04, 1.2, 0.04] });
  t.box(1.1, 0.7, 0.06, C.woodLight, 0, 1.1, 0, { r: 0.03 }); t.box(0.9, 0.5, 0.01, 0xdfe9f4, 0, 1.1, 0.035, { r: 0 });
  t.box(0.5, 0.06, 0.01, 0x3f6fd6, -0.1, 1.15, 0.045, { r: 0 }); t.add(G.cone, 0xe8483f, 0.2, 1.0, 0.045, { rz: -Math.PI / 2, s: [0.05, 0.08, 0.01] });
  return group(k);
}
export function lightTree(seed = 1) { // a bare street tree wound with bulbs
  const k = kits('toy', 'glow'), t = k.toy;
  t.add(G.cyl8, 0x5a4232, 0, 0.8, 0, { s: [0.08, 1.6, 0.08] });
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + r(), y = 1.3 + r() * 0.8, L = 0.6 + r() * 0.4, tip = [Math.cos(a) * L, y + 0.6, Math.sin(a) * L];
    t.add(G.cyl8, 0x5a4232, tip[0] / 2, (1.4 + tip[1]) / 2, tip[2] / 2, { rx: Math.sin(a) * 0.6, rz: -Math.cos(a) * 0.6, s: [0.03, 1.0, 0.03] });
    for (let j = 0; j < 5; j++) k.glow.ball(0.03, 0xfff0c0, tip[0] * j / 5 + (r() - 0.5) * 0.1, 1.4 + (tip[1] - 1.4) * j / 5, tip[2] * j / 5 + (r() - 0.5) * 0.1); }
  return group(k);
}
export function conifer(h = 2.6) { // a fir: green tiers with snow lying on each
  const k = kits('toy', 'snow'), t = k.toy;
  t.add(G.cyl8, 0x5a4232, 0, 0.2, 0, { s: [0.08, 0.4, 0.08] });
  for (let i = 0; i < 4; i++) { const y = 0.4 + i * h * 0.2, r = h * (0.36 - i * 0.07); t.add(G.cone, C.conifer, 0, y + h * 0.17, 0, { s: [r, h * 0.36, r] }); k.snow.add(G.cone, C.snow, 0, y + h * 0.25, 0, { s: [r * 0.8, h * 0.22, r * 0.8] }); }
  return group(k);
}
export function acUnit() { const k = kits('toy', 'snow'); k.toy.box(0.6, 0.45, 0.3, 0xd8d4cc, 0, 0.23, 0, { r: 0.04 }); k.toy.add(G.cyl, 0x9aa0aa, -0.08, 0.23, 0.155, { rx: Math.PI / 2, s: [0.15, 0.01, 0.15] }); k.snow.box(0.62, 0.14, 0.32, C.snow, 0, 0.5, 0, { r: 0.06 }); return group(k); }
export function postBox() { const k = kits('toy', 'snow'); k.toy.add(G.cyl, 0xd8383a, 0, 0.45, 0, { s: [0.2, 0.9, 0.2] }); k.toy.box(0.2, 0.03, 0.02, C.ink, 0, 0.7, 0.2, { r: 0 }); k.snow.add(G.half, C.snow, 0, 0.9, 0, { s: [0.22, 0.12, 0.22] }); return group(k); }
// a bank of snow left by the ploughs along a road: lumps, packed, grey low down
export function snowBank(len = 4, h = 0.6, seed = 3) {
  const k = kits('snow'); let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = Math.ceil(len / 0.7);
  for (let i = 0; i < n; i++) { const x = -len / 2 + (i + 0.5) * len / n; k.snow.add(G.lump, i % 3 ? C.snow : C.packed, x, h * 0.45, (r() - 0.5) * 0.1, { s: [len / n * (0.75 + r() * 0.3), h * (0.5 + r() * 0.3), 0.32] }); } // (long soft humps, not a row of balls)
  k.snow.box(len, h * 0.5, 0.6, 0xc9d0dc, 0, h * 0.25, 0, { r: 0.1 });
  return group(k);
}

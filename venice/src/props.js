// The small things of Venice's squares and alleys (venice/DESIGN.md §1.6, §1.10): the stone wellhead, an iron lantern on
// a wall bracket, a yellow signpost (an arrow, no words), café tables under umbrellas, a little stage with a piano,
// market stalls (fruit, and fish on ice), a stand of masks, a gelato counter, a glass furnace, washing on a line, a
// handcart, a bench, a red post box, pots of flowers, a bundle of three posts in the lagoon, the water-bus pontoon and
// a gondola pier.
import * as THREE from 'three';
import { kits, group, G, C, archGeo, prismGeo, LAND } from './kit.js';
import { pole } from './house.js';
import { put } from './people.js';

export function wellhead() { const k = kits('stone'); k.stone.box(0.7, 0.08, 0.7, C.stone, 0, 0.04, 0, { r: 0.03 }); k.stone.add(G.cyl8, 0xe8e0d2, 0, 0.3, 0, { s: [0.3, 0.46, 0.3], ry: Math.PI / 8 }); k.stone.add(G.cyl8, C.stone, 0, 0.55, 0, { s: [0.34, 0.06, 0.34], ry: Math.PI / 8 }); for (let i = 0; i < 8; i++) { const a = (i + 0.5) * Math.PI / 4; k.stone.box(0.12, 0.14, 0.02, 0xd8cfbf, Math.sin(a) * 0.29, 0.3, Math.cos(a) * 0.29, { r: 0.01, ry: a }); } k.stone.add(G.cyl8, 0x2a3a3a, 0, 0.585, 0, { s: [0.22, 0.01, 0.22] }); return group(k); }
export function lantern(wall = true) { // a black iron lantern on a curling bracket (or on a post)
  const k = kits('metal', 'glow');
  if (wall) { k.metal.box(0.04, 0.04, 0.4, 0x2a2f40, 0, 1.6, 0.2, { r: 0.01 }); k.metal.add(G.torus, 0x2a2f40, 0, 1.52, 0.3, { s: 0.07, ry: Math.PI / 2 }); }
  else { k.metal.add(G.cyl8, 0x2a2f40, 0, 0.8, 0.4, { s: [0.035, 1.6, 0.035] }); k.metal.box(0.18, 0.06, 0.18, 0x2a2f40, 0, 0.03, 0.4, { r: 0.02 }); }
  k.metal.add(G.cone6, 0x2a2f40, 0, 1.78, 0.4, { s: [0.12, 0.1, 0.12] }); k.glow.box(0.13, 0.18, 0.13, 0xffe0a0, 0, 1.64, 0.4, { r: 0.02 }); k.metal.box(0.15, 0.03, 0.15, 0x2a2f40, 0, 1.54, 0.4, { r: 0.01 });
  return group(k);
}
export function signpost() { const k = kits('plain', 'metal'); k.metal.add(G.cyl8, 0x2a2f40, 0, 0.55, 0, { s: [0.025, 1.1, 0.025] }); k.plain.box(0.5, 0.14, 0.03, 0xf2c230, 0.2, 0.95, 0, { r: 0.02 }); k.plain.add(G.cone, 0xf2c230, 0.5, 0.95, 0, { s: [0.09, 0.14, 0.015], rz: -Math.PI / 2 }); k.plain.box(0.3, 0.05, 0.035, 0x2a2f40, 0.18, 0.95, 0, { r: 0.01 }); return group(k); }
export function cafeTable(umbrella = 0xf4efe4) { // a round table, two chairs, a cream umbrella
  const k = kits('plain', 'metal');
  k.metal.add(G.cyl8, 0x2a2f40, 0, 0.18, 0, { s: [0.02, 0.36, 0.02] }); k.plain.add(G.cyl, C.white, 0, 0.37, 0, { s: [0.2, 0.025, 0.2] });
  for (const s of [-1, 1]) { k.metal.box(0.16, 0.02, 0.16, 0x2a2f40, s * 0.3, 0.2, 0, { r: 0.01 }); k.metal.box(0.02, 0.2, 0.16, 0x2a2f40, s * 0.38, 0.3, 0, { r: 0.005 }); for (const z of [-0.07, 0.07]) k.metal.add(G.cyl8, 0x2a2f40, s * 0.3, 0.1, z, { s: [0.01, 0.2, 0.01] }); }
  k.plain.add(G.cyl, 0xe8673c, 0.05, 0.42, 0, { s: [0.03, 0.06, 0.03] });
  if (umbrella) { k.metal.add(G.cyl8, 0xd8d4cc, 0, 0.7, 0, { s: [0.015, 0.7, 0.015] }); k.plain.add(G.cone, umbrella, 0, 1.08, 0, { s: [0.55, 0.22, 0.55] }); k.plain.add(G.cyl, umbrella, 0, 0.96, 0, { s: [0.55, 0.03, 0.55] }); }
  return group(k);
}
export function bandstand() { // a little stage under an awning: a piano, music stands
  const k = kits('plain', 'shiny', 'metal');
  k.plain.box(1.6, 0.12, 1.0, C.wood, 0, 0.06, 0, { r: 0.03 });
  k.shiny.box(0.55, 0.3, 0.3, 0x1e2433, -0.3, 0.32, -0.15, { r: 0.04 }); k.plain.box(0.5, 0.04, 0.1, C.white, -0.3, 0.48, -0.02, { r: 0.01 }); k.shiny.box(0.55, 0.06, 0.32, 0x1e2433, -0.3, 0.5, -0.15, { r: 0.02, rx: -0.3 });
  for (const x of [0.35, 0.65]) { k.metal.add(G.cyl8, 0x2a2f40, x, 0.35, 0.15, { s: [0.01, 0.5, 0.01] }); k.metal.box(0.16, 0.12, 0.01, 0x2a2f40, x, 0.62, 0.15, { r: 0.004, rx: -0.4 }); }
  for (const x of [-0.75, 0.75]) k.metal.add(G.cyl8, C.gold, x, 0.75, 0.45, { s: [0.025, 1.4, 0.025] });
  for (let i = 0; i < 6; i++) k.plain.box(0.27, 0.03, 0.5, i % 2 ? C.white : 0xa8202c, -0.67 + i * 0.27, 1.45, 0.25, { r: 0.01, rx: -0.25 });
  return group(k);
}
export function marketStall(kind = 'fruit') { // a white awning on poles, crates of fruit and veg, or fish on ice
  const k = kits('plain', 'shiny', 'metal');
  for (const [x, z] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) k.metal.add(G.cyl8, 0xd8d4cc, x, 0.6, z, { s: [0.02, 1.2, 0.02] });
  k.plain.add(prismGeo(0.9, 0.2, 1.4), C.white, 0, 1.2, 0, { ry: Math.PI / 2 });
  k.plain.box(1.3, 0.06, 0.8, C.wood, 0, 0.5, 0, { r: 0.02, rx: 0.15 });
  if (kind === 'fruit') for (let i = 0; i < 6; i++) { const x = -0.45 + (i % 3) * 0.45, z = i < 3 ? -0.15 : 0.18, col = [0xe8483f, 0xf2a23a, 0x7cc94a, 0xf2c230, 0x8a3a8a, 0xe8673c][i]; k.plain.box(0.38, 0.1, 0.28, 0xc9965a, x, 0.58 + (i < 3 ? 0.05 : 0), z, { r: 0.02, rx: 0.15 }); for (let j = 0; j < 6; j++) k.plain.ball(0.05, col, x - 0.12 + (j % 3) * 0.12, 0.66 + (i < 3 ? 0.05 : 0), z - 0.05 + Math.floor(j / 3) * 0.1); }
  else { k.shiny.box(1.2, 0.06, 0.7, 0xe4f2fa, 0, 0.56, 0, { r: 0.02, rx: 0.15 }); for (let i = 0; i < 9; i++) k.shiny.add(G.cap, [0x9aa8b8, 0xd8a090, 0x7a8a9a][i % 3], -0.45 + (i % 3) * 0.45, 0.62, -0.18 + Math.floor(i / 3) * 0.18, { s: [0.04, 0.12, 0.03], rz: Math.PI / 2, rx: 0.15 }); for (let i = 0; i < 4; i++) k.shiny.ball(0.06, 0xe8483f, -0.4 + i * 0.27, 0.64, 0.25); }
  return group(k);
}
export function maskStand() { // a rack of masks: white, gold, red, blue, with feathers
  const k = kits('plain', 'gold', 'shiny');
  k.plain.box(0.9, 1.1, 0.08, 0x6b4a32, 0, 0.55, 0, { r: 0.02 });
  const cols = [0xfbfaf6, C.gold, 0xd8383a, 0x24345f, 0xe8a0c8, 0x2a2018, C.gold, 0xfbfaf6, 0x4fb39a];
  cols.forEach((c, i) => { const x = -0.3 + (i % 3) * 0.3, y = 0.3 + Math.floor(i / 3) * 0.3; (c === C.gold ? k.gold : k.shiny).add(G.ball, c, x, y, 0.06, { s: [0.11, 0.08, 0.04] }); for (const s of [-1, 1]) k.plain.ball(0.018, 0x1e2433, x + s * 0.04, y + 0.01, 0.1); if (i % 2 === 0) k.plain.add(G.cap, [0xd8383a, 0xf2c230, 0x24345f][i % 3], x + 0.06, y + 0.1, 0.05, { s: [0.015, 0.06, 0.008], rz: -0.5 }); });
  return group(k);
}
export function gelato() { // a glass counter of pastel tubs under a little striped awning
  const k = kits('plain', 'clear', 'metal');
  k.plain.box(1.2, 0.55, 0.5, C.white, 0, 0.27, 0, { r: 0.04 });
  const cols = [0xf6c6d6, 0xfff1b8, 0xb8e6c8, 0x8a5a3a, 0xf2a23a, 0xc8b8f0, 0xffffff, 0xe8483f];
  cols.forEach((c, i) => k.plain.add(G.half, c, -0.45 + (i % 4) * 0.3, 0.56, -0.08 + Math.floor(i / 4) * 0.17, { s: [0.11, 0.09, 0.07] }));
  k.clear.box(1.2, 0.25, 0.5, 0xdff0f8, 0, 0.68, 0, { r: 0.04 });
  for (let i = 0; i < 5; i++) k.plain.box(0.26, 0.03, 0.5, i % 2 ? C.white : 0xf08ac0, -0.52 + i * 0.26, 1.15, 0.1, { r: 0.01, rx: 0.3 });
  for (const x of [-0.6, 0.6]) k.metal.add(G.cyl8, 0xd8d4cc, x, 0.6, -0.2, { s: [0.015, 1.2, 0.015] });
  return group(k);
}
export function furnace() { // the glassblower's brick furnace with a glowing mouth
  const k = kits('wall', 'glow', 'metal');
  k.wall.box(0.9, 0.5, 0.8, C.brick, 0, 0.25, 0, { r: 0.05 }); k.wall.add(G.half, C.brick, 0, 0.5, 0, { s: [0.45, 0.45, 0.4] });
  k.glow.add(archGeo(0.28, 0.3, 0.05, false), 0xff7a2a, 0, 0.32, 0.4); k.wall.add(G.cyl, C.brick, 0.2, 1.05, -0.15, { s: [0.08, 0.5, 0.08] });
  k.metal.box(0.5, 0.04, 0.2, 0x5a6070, 0, 0.32, 0.55, { r: 0.01 });
  const g = group(k), light = new THREE.PointLight(0xff8a3a, 1.2, 2.5); light.position.set(0, 0.45, 0.6); g.add(light);
  g.userData.update = (t) => { light.intensity = 1.0 + Math.sin(t * 9) * 0.2 + Math.sin(t * 23) * 0.1; };
  return g;
}
export function washing(span = 2.0, h = 2.4) { // a line between two windows, clothes swaying
  const g = new THREE.Group(), k = kits('metal'); k.metal.add(G.cyl8, 0xd8d4cc, 0, h, 0, { s: [0.006, span, 0.006], rz: Math.PI / 2 }); g.add(group(k));
  const cols = [0xfbfaf6, 0x6fb0e0, 0xf08ac0, 0xfbfaf6, 0xf2c230, 0x3f6fd6, 0xfbfaf6];
  const cloths = cols.map((c, i) => { const p = new THREE.Group(); p.position.set(-span / 2 + 0.2 + i * (span - 0.4) / (cols.length - 1), h, 0); put(p, G.plane, c, 0, -0.13, 0, [0.2 - (i % 3) * 0.03, 0.26 - (i % 2) * 0.06, 1], [0, 0, 0], 0.9, { side: THREE.DoubleSide }); g.add(p); return p; });
  g.userData.update = (t) => cloths.forEach((p, i) => (p.rotation.x = Math.sin(t * 1.6 + i * 0.7) * 0.25));
  return g;
}
export function handcart() { const k = kits('plain', 'metal'); k.plain.box(0.5, 0.06, 0.35, 0x3f6fd6, 0, 0.22, 0, { r: 0.02 }); k.plain.box(0.5, 0.18, 0.02, 0x3f6fd6, 0, 0.3, 0.17, { r: 0.01 }); k.plain.box(0.5, 0.18, 0.02, 0x3f6fd6, 0, 0.3, -0.17, { r: 0.01 }); for (const z of [-0.18, 0.18]) k.metal.add(G.cyl, 0x2a2f40, -0.1, 0.1, z, { s: [0.1, 0.03, 0.1], rx: Math.PI / 2 }); k.metal.add(G.cyl8, 0x2a2f40, 0.4, 0.4, 0, { s: [0.015, 0.4, 0.015], rz: 0.8 }); k.plain.box(0.2, 0.15, 0.16, 0xc9965a, 0.05, 0.33, 0, { r: 0.02 }); return group(k); }
export function bench() { const k = kits('plain', 'metal'); for (const x of [-0.35, 0.35]) k.metal.box(0.04, 0.3, 0.3, 0x2a2f40, x, 0.15, 0, { r: 0.01 }); for (const z of [-0.08, 0.04]) k.plain.box(0.9, 0.03, 0.09, C.wood, 0, 0.3, z, { r: 0.01 }); k.plain.box(0.9, 0.09, 0.03, C.wood, 0, 0.45, -0.13, { r: 0.01 }); return group(k); }
export function postBox() { const k = kits('shiny'); k.shiny.box(0.22, 0.32, 0.14, 0xd8383a, 0, 0.9, 0, { r: 0.04 }); k.shiny.box(0.14, 0.02, 0.02, 0x2a2f40, 0, 0.98, 0.075, { r: 0.005 }); return group(k); }
export function planters() { const k = kits('wall', 'plain'); for (const [x, s] of [[-0.3, 1], [0.15, 0.8], [0.45, 0.6]]) { k.wall.add(G.cyl, C.terracotta, x, 0.12 * s, 0, { s: [0.12 * s, 0.24 * s, 0.12 * s] }); k.plain.ball(0.16 * s, C.leaf, x, 0.3 * s, 0); for (let i = 0; i < 4; i++) k.plain.ball(0.035, [C.geranium, 0xf08ac0][i % 2], x + Math.cos(i * 1.6) * 0.1 * s, 0.36 * s + (i % 2) * 0.04, Math.sin(i * 1.6) * 0.1 * s); } return group(k); }
export function bricola() { // three weathered posts lashed together, marking the channel in the lagoon
  const k = kits('plain', 'metal');
  for (const [x, z, a] of [[0, 0, 0], [0.12, 0.06, 0.05], [0.05, -0.1, -0.05]]) for (let i = 0; i < 4; i++) k.plain.add(G.cyl8, i === 0 ? 0x3a4a3a : 0x6b5a48, x, -0.4 + i * 0.55, z, { s: [0.07, 0.55, 0.07], rz: a, rx: a });
  for (const y of [0.8, 1.1]) k.metal.add(G.torus, 0x4a4f5a, 0.06, y, -0.01, { s: [0.13, 0.13, 0.2], rx: Math.PI / 2 });
  return group(k);
}
export function pontoon() { // the water-bus stop: a floating platform with a yellow edge and a little shelter
  const k = kits('plain', 'glass', 'shiny');
  k.plain.box(3.0, 0.22, 1.1, 0x4a5060, 0, 0.05, 0, { r: 0.04 }); k.plain.box(3.04, 0.06, 1.14, 0xf2c230, 0, 0.18, 0, { r: 0.02 });
  k.plain.box(2.6, 0.04, 0.9, 0xc8c2b4, 0, 0.18, 0, { r: 0.01 });
  for (const x of [-1.2, 1.2]) for (const z of [-0.4, 0.4]) k.plain.box(0.06, 0.8, 0.06, 0xf4f4f0, x, 0.6, z, { r: 0.015 });
  k.plain.box(2.7, 0.06, 1.0, 0xf4f4f0, 0, 1.02, 0, { r: 0.02 }); k.glass.box(2.4, 0.5, 0.03, 0x9fc4d6, 0, 0.6, -0.42, { r: 0.01 });
  k.plain.box(0.6, 0.16, 0.04, 0xf2c230, 0, 1.12, 0.48, { r: 0.02 });
  return group(k);
}
export function gondolaPier(n = 4) { // a wooden jetty with blue-striped poles to tie up to
  const g = new THREE.Group(), k = kits('plain', 'gold', 'stone');
  k.plain.box(0.9, 0.08, n * 0.7, C.wood, 0, LAND - 0.05, 0, { r: 0.02 });
  for (let i = 0; i <= n; i++) k.plain.add(G.cyl8, 0x5a4a3a, 0.4, LAND / 2 - 0.2, (i - n / 2) * 0.7, { s: [0.05, LAND + 0.4, 0.05] });
  for (let i = 0; i <= n; i++) pole(k, 1.15, (i - n / 2) * 0.7, C.poleBlue, 1.2);
  g.add(group(k)); return g;
}

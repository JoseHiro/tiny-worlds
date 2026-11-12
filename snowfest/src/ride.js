// What drives through the snow (snowfest/DESIGN.md §1.6): the tram, the sasara tram (bamboo brushes spinning at its ends,
// flinging snow off the rails), the plough truck, the rotary blower (a plume of snow), a taxi and a car under snow, the
// bus. All nose toward +x, wheels on y = 0. Snow sits on their roofs (toy material).
import * as THREE from 'three';
import { kits, group, G, C, IKit, MAT } from './kit.js';
import { steam } from './stalls.js';

function wheels(k, xs, z, r = 0.16) { for (const x of xs) for (const s of [-1, 1]) k.toy.add(G.cyl, 0x2a2f40, x, r, s * z, { rx: Math.PI / 2, s: [r, 0.12, r] }); }
function windowsRow(k, x0, x1, y, h, z, n, col = 0x8fb4d8) { const w = (x1 - x0) / n; for (let i = 0; i < n; i++) for (const s of [-1, 1]) k.glass.box(w * 0.82, h, 0.03, col, x0 + (i + 0.5) * w, y, s * z, { r: 0 }); }

export function tram() { // a green and white streetcar with a pantograph
  const k = kits('toy', 'glass', 'glow'), t = k.toy, L = 3.2, W = 0.95;
  t.box(L, 0.55, W, C.tram, 0, 0.45, 0, { r: 0.1 }); t.box(L, 0.6, W, 0xf4efe4, 0, 1.0, 0, { r: 0.1 }); t.box(L - 0.1, 0.12, W - 0.1, 0x9aa0aa, 0, 1.36, 0, { r: 0.05 });
  windowsRow(k, -1.3, 1.3, 1.0, 0.36, W / 2 + 0.005, 6);
  for (const s of [-1, 1]) { k.glass.box(0.03, 0.4, W - 0.25, 0x8fb4d8, s * (L / 2 + 0.005), 1.0, 0, { r: 0 }); k.glow.ball(0.05, 0xfff0c0, s * (L / 2 + 0.01), 0.5, 0.3); k.glow.ball(0.05, 0xfff0c0, s * (L / 2 + 0.01), 0.5, -0.3); }
  t.box(0.04, 0.3, 0.6, 0x3a4152, 0, 1.6, 0, { rz: 0.5, r: 0 }); t.box(0.04, 0.3, 0.6, 0x3a4152, 0.12, 1.6, 0, { rz: -0.5, r: 0 }); t.box(0.1, 0.02, 0.7, 0x3a4152, 0.06, 1.75, 0, { r: 0 });
  k.glow.box(0.5, 0.14, 0.02, 0xffd060, L / 2 - 0.4, 1.22, W / 2 + 0.01, { r: 0 }); // the destination
  wheels(k, [-1.0, 1.0], W / 2 - 0.05, 0.14);
  return group(k);
}
export function sasara() { // the snow-clearing tram: a boxy car with spinning brushes front and back throwing up snow
  const k = kits('toy', 'glass'), t = k.toy, L = 2.6, W = 0.9;
  t.box(L, 1.1, W, 0xf2c230, 0, 0.75, 0, { r: 0.08 }); t.box(L, 0.12, W + 0.02, C.tram, 0, 0.35, 0, { r: 0.03 });
  windowsRow(k, -0.9, 0.9, 1.0, 0.3, W / 2 + 0.005, 4);
  wheels(k, [-0.8, 0.8], W / 2 - 0.05, 0.14);
  const g = group(k);
  const brushes = [-1, 1].map((s) => { const b = new IKit(); b.add(G.cyl, 0x8a6a3a, 0, 0, 0, { rx: Math.PI / 2, s: [0.22, W - 0.1, 0.22] }); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.box(0.04, 0.2, W - 0.12, 0xd9b26a, Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0, { rz: a + Math.PI / 2, r: 0 }); } const m = b.mesh(MAT.plain); m.position.set(s * (L / 2 + 0.2), 0.25, 0); g.add(m); return m; });
  const spray = [-1, 1].map((s) => { const sp = steam({ n: 7, h: 0.9, size: 0.3 }); sp.position.set(s * (L / 2 + 0.45), 0.25, 0); g.add(sp); return sp; });
  g.userData.update = (time) => { brushes.forEach((b, i) => (b.rotation.z = time * 12 * (i ? -1 : 1))); spray.forEach((s) => s.userData.update(time * 2.4)); };
  return g;
}
export function plough() { // a yellow plough truck: an angled blade with black-and-yellow stripes, a flashing beacon
  const k = kits('toy', 'glass', 'glow'), t = k.toy;
  t.box(1.0, 1.0, 1.0, C.plow, 0.6, 0.85, 0, { r: 0.1 }); k.glass.box(0.03, 0.4, 0.8, 0x8fb4d8, 1.11, 1.05, 0, { r: 0 }); for (const s of [-1, 1]) k.glass.box(0.5, 0.36, 0.03, 0x8fb4d8, 0.65, 1.05, s * 0.505, { r: 0 });
  t.box(1.6, 0.8, 1.0, 0xe0b020, -0.75, 0.75, 0, { r: 0.08 }); t.box(2.6, 0.2, 1.0, 0x3a4152, -0.15, 0.32, 0, { r: 0.04 });
  t.box(0.12, 0.55, 1.7, C.plow, 1.55, 0.3, 0, { ry: 0.35, r: 0.04 }); for (let i = 0; i < 5; i++) t.box(0.02, 0.1, 0.25, C.ink, 1.62 + (i - 2) * 0.12 * Math.sin(0.35), 0.3, (i - 2) * 0.32, { ry: 0.35, r: 0 });
  wheels(k, [-1.0, -0.3, 0.6], 0.48, 0.2);
  const g = group(k);
  const beacon = new THREE.Mesh(G.half, new THREE.MeshBasicMaterial({ color: 0xff9a2a })); beacon.scale.set(0.1, 0.12, 0.1); beacon.position.set(0.6, 1.36, 0); g.add(beacon);
  g.userData.update = (time) => { beacon.material.color.setHSL(0.08, 1, 0.35 + 0.3 * (Math.sin(time * 9) > 0 ? 1 : 0)); };
  return g;
}
export function rotary() { // a rotary blower: a big drum of augers in front, a chute throwing a plume of snow up and aside
  const k = kits('toy', 'glass', 'glow'), t = k.toy;
  t.box(1.2, 1.1, 1.1, 0xf08a24, 0.2, 0.95, 0, { r: 0.1 }); k.glass.box(0.03, 0.4, 0.9, 0x8fb4d8, 0.81, 1.15, 0, { r: 0 });
  t.box(1.4, 0.8, 1.1, 0xd87a20, -1.0, 0.8, 0, { r: 0.08 }); wheels(k, [-1.2, -0.3, 0.5], 0.52, 0.22);
  t.box(0.7, 0.8, 1.6, 0xf08a24, 1.25, 0.45, 0, { r: 0.08 }); for (let i = 0; i < 5; i++) t.add(G.torus, 0x9aa0aa, 1.62, 0.42, -0.6 + i * 0.3, { s: [0.3, 0.3, 0.6] });
  t.add(G.cyl, 0xf08a24, 1.2, 1.25, 0, { rz: -0.4, s: [0.14, 0.9, 0.14] });
  const g = group(k);
  const plume = steam({ n: 10, h: 2.2, size: 0.55 }); plume.position.set(1.35, 1.6, 0); plume.rotation.x = -0.6; g.add(plume);
  g.userData.update = (time) => plume.userData.update(time * 2);
  return g;
}
export function car({ color = 0x3f6fd6, taxi = false, buried = false } = {}) { // a small car, maybe a taxi, maybe buried under a hump of snow
  const k = kits('toy', 'glass', 'glow', 'snow'), t = k.toy, col = taxi ? 0xf2c230 : color;
  t.box(1.5, 0.42, 0.78, col, 0, 0.36, 0, { r: 0.14 }); t.box(0.86, 0.38, 0.72, col, -0.1, 0.72, 0, { r: 0.14 });
  k.glass.box(0.03, 0.28, 0.6, 0x8fb4d8, 0.34, 0.74, 0, { r: 0 }); for (const s of [-1, 1]) k.glass.box(0.66, 0.26, 0.03, 0x8fb4d8, -0.1, 0.74, s * 0.365, { r: 0 });
  for (const s of [-1, 1]) k.glow.ball(0.05, 0xfff4d0, 0.76, 0.4, s * 0.26);
  wheels(k, [-0.48, 0.48], 0.36, 0.15);
  if (taxi) { t.box(0.3, 0.12, 0.12, 0xfbfaf6, -0.1, 0.97, 0, { r: 0.03 }); t.box(1.5, 0.05, 0.01, 0x2a2f40, 0, 0.36, 0.395, { r: 0 }); }
  if (buried) { k.snow.add(G.half, C.snow, -0.05, 0.72, 0, { s: [0.8, 0.45, 0.48] }); k.snow.add(G.half, C.snow, 0.45, 0.55, 0, { s: [0.4, 0.22, 0.42] }); }
  return group(k);
}
export function bus() { // a city bus, green stripe, a lit destination, snow on the roof
  const k = kits('toy', 'glass', 'glow'), t = k.toy, L = 3.8, W = 1.0;
  t.box(L, 1.2, W, 0xf4efe4, 0, 0.8, 0, { r: 0.14 }); t.box(L + 0.02, 0.14, W + 0.02, C.tram, 0, 0.55, 0, { r: 0.03 });
  windowsRow(k, -1.6, 1.4, 1.0, 0.42, W / 2 + 0.005, 6); k.glass.box(0.03, 0.6, W - 0.2, 0x8fb4d8, L / 2 + 0.005, 0.95, 0, { r: 0 });
  k.glow.box(0.03, 0.14, 0.6, 0xffd060, L / 2 + 0.01, 1.32, 0, { r: 0 });
  wheels(k, [-1.2, 1.2], W / 2, 0.2);
  return group(k);
}

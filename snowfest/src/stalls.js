// The food stalls (snowfest/DESIGN.md §1.4): one shared white tent and counter, and what makes each one itself — ramen,
// jaga-butter, grilled corn, crab soup, hot wine, soup curry. Steam rises from the pots (soft puffs, one shared texture).
import * as THREE from 'three';
import { kits, group, G, C } from './kit.js';

let puffTex = null;
const puff = () => puffTex ??= (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,0.85)'); r.addColorStop(0.5, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
// steam (or smoke): puffs that rise, swell and fade, over and over
export function steam({ n = 6, h = 1.4, size = 0.35, grey = false } = {}) {
  const g = new THREE.Group(), mat = new THREE.SpriteMaterial({ map: puff(), color: grey ? 0xc8ccd4 : 0xffffff, transparent: true, depthWrite: false, opacity: 0.6 });
  const ps = Array.from({ length: n }, (_, i) => { const s = new THREE.Sprite(mat.clone()); s.userData.ph = i / n; g.add(s); return s; });
  g.userData.update = (t) => ps.forEach((s, i) => { const u = (t * 0.35 + s.userData.ph) % 1; s.position.set(Math.sin(t * 0.8 + i) * 0.08 * u, u * h, Math.cos(t * 0.6 + i) * 0.05 * u); s.scale.setScalar(size * (0.5 + u * 1.4)); s.material.opacity = 0.55 * Math.sin(u * Math.PI); });
  return g;
}

export const STALLS = ['ramen', 'jaga', 'corn', 'crab', 'wine', 'curry'];
const NAMES = { ramen: ['ラーメン', 'Ramen'], jaga: ['じゃがバター', 'Jaga-butter'], corn: ['焼きとうもろこし', 'Grilled corn'], crab: ['カニ汁', 'Crab soup'], wine: ['ホットワイン', 'Hot wine'], curry: ['スープカレー', 'Soup curry'] };
export { NAMES as STALL_NAMES };
export function stall(kind = 'ramen') {
  const k = kits('toy', 'glow'), t = k.toy, W = 1.8, D = 1.1;
  // the tent: four posts, a white gabled canvas roof, a back sheet, a string of bulbs along the front
  for (const [x, z] of [[-W / 2, D / 2], [W / 2, D / 2], [-W / 2, -D / 2], [W / 2, -D / 2]]) t.add(G.cyl8, 0xb8bcc4, x, 0.95, z, { s: [0.03, 1.9, 0.03] });
  const roofG = new THREE.CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0.5, 0);
  t.add(roofG, C.white, 0, 1.88, 0, { s: [W + 0.2, 0.4 / 1.5, (D / 2 + 0.2) / 0.87] });
  t.box(W, 1.0, 0.03, 0xe8ecf2, 0, 1.4, -D / 2, { r: 0 });
  for (let i = 0; i < 9; i++) { const x = -W / 2 + 0.1 + i * (W - 0.2) / 8; k.glow.ball(0.035, 0xffe0a0, x, 1.8 - Math.sin((i / 8) * Math.PI) * 0.08, D / 2 + 0.04); }
  // the counter
  t.box(W - 0.1, 0.8, 0.5, C.wood, 0, 0.4, 0.2, { r: 0.04 }); t.box(W, 0.05, 0.6, C.woodLight, 0, 0.82, 0.2, { r: 0.02 });
  const sign = (col, txtCol = C.white) => { t.box(W - 0.3, 0.32, 0.04, col, 0, 1.6, D / 2 + 0.12, { r: 0.04 }); for (let i = 0; i < 4; i++) t.box(0.18, 0.12, 0.01, txtCol, -0.45 + i * 0.3, 1.6, D / 2 + 0.15, { r: 0 }); };
  const pot = (x, col = 0x9aa0aa) => { t.add(G.cyl, col, x, 1.0, 0.15, { s: [0.2, 0.3, 0.2] }); t.add(G.cyl, 0x6b4a34, x, 0.86, 0.15, { s: [0.24, 0.04, 0.24] }); };
  const steams = [];
  ({
    ramen: () => { sign(C.noren); for (let i = 0; i < 4; i++) t.box(0.36, 0.42, 0.02, C.noren, -0.6 + i * 0.4, 1.25, D / 2 + 0.06, { r: 0 }); pot(-0.4); pot(0.3); for (const x of [0.6, 0.75]) { t.add(G.half, 0xd8383a, x, 0.85, 0.35, { rx: Math.PI, s: [0.1, 0.07, 0.1] }); t.add(G.cyl, 0xf2c95a, x, 0.85, 0.35, { s: [0.09, 0.01, 0.09] }); } steams.push([-0.4, 1.2], [0.3, 1.2]); },
    jaga: () => { sign(0xf2c230, C.ink); pot(0, 0x4a5068); for (let i = 0; i < 5; i++) t.ball(0.07, 0xd9b26a, -0.6 + i * 0.13, 0.9, 0.38); t.add(G.cyl8, 0xb8bcc4, 0.85, 1.2, D / 2 + 0.25, { s: [0.02, 2.4, 0.02] }); t.box(0.02, 1.0, 0.3, 0xf2c230, 0.85, 1.6, D / 2 + 0.1, { r: 0 }); steams.push([0, 1.2]); },
    corn: () => { sign(0x3f8f5a); t.box(1.2, 0.08, 0.36, 0x2a2f40, 0, 0.9, 0.18, { r: 0.02 }); for (let i = 0; i < 6; i++) t.add(G.cap, 0xf2c230, -0.45 + i * 0.18, 0.97, 0.18, { rx: Math.PI / 2, s: [0.045, 0.16, 0.045] }); k.glow.box(1.1, 0.02, 0.3, 0xff7a3a, 0, 0.94, 0.18, { r: 0 }); steams.push([0, 1.0]); },
    crab: () => { sign(0x2f55c4); pot(-0.3); t.box(0.5, 0.3, 0.36, 0xfbfaf6, 0.5, 0.97, 0.15, { r: 0.04 });
      const cx = 0, cy = 2.3, cz = 0.2; t.add(G.ball, 0xe8483f, cx, cy, cz, { s: [0.5, 0.22, 0.32] }); // the big crab on the roof
      for (const e of [-1, 1]) { t.add(G.ball, 0xe8483f, cx + e * 0.55, cy + 0.2, cz + 0.25, { s: [0.18, 0.13, 0.1] }); t.add(G.cap, 0xe8483f, cx + e * 0.4, cy + 0.1, cz + 0.2, { rz: e * 0.8, s: [0.04, 0.12, 0.04] }); for (let i = 0; i < 3; i++) t.add(G.cap, 0xe8483f, cx + e * 0.52, cy - 0.12, cz - 0.15 + i * 0.15, { rz: e * 1.1, s: [0.03, 0.16, 0.03] }); t.ball(0.04, C.ink, cx + e * 0.12, cy + 0.2, cz + 0.28); }
      steams.push([-0.3, 1.2]); },
    wine: () => { sign(0x7a2a5a); pot(-0.2, 0x6b2a3a); for (let i = 0; i < 6; i++) t.add(G.cyl, 0xfbfaf6, 0.25 + (i % 3) * 0.14, 0.9, 0.3 - Math.floor(i / 3) * 0.14, { s: [0.045, 0.1, 0.045] }); steams.push([-0.2, 1.2]); },
    curry: () => { sign(0xf08a24); pot(-0.35, 0x6b4a34); pot(0.35, 0x6b4a34); for (const x of [0.65]) { t.add(G.half, 0xfbfaf6, x, 0.88, 0.38, { rx: Math.PI, s: [0.11, 0.06, 0.11] }); t.add(G.cyl, 0xd8702a, x, 0.88, 0.38, { s: [0.1, 0.01, 0.1] }); } steams.push([-0.35, 1.2], [0.35, 1.2]); },
  })[kind]();
  const g = group(k);
  for (const [x, y] of steams) { const s = steam({ n: 5, h: 1.2, size: 0.3 }); s.position.set(x, y, 0.15); g.add(s); }
  const moving = g.children.filter((c) => c.userData.update);
  g.userData.update = (time) => moving.forEach((m) => m.userData.update(time));
  return g;
}

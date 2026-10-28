// Small things on the tables (cafe/DESIGN.md §4): cups (latte art, cappuccino, espresso, mug, iced, tea), a laptop
// whose screen shows code / a spreadsheet / a design / a video call, an open book, a notebook with a pen, a tablet,
// a phone, headphones, a plate with a pastry — and the steam that rises from every hot drink (one draw call).
import * as THREE from 'three';
import { mat, mesh, box, cyl, rbox } from '../../airport/src/parts.js';
import { CAFE, M } from './furniture.js';

const tex = new Map();
function canvasTex(key, w, h, draw) { if (tex.has(key)) return tex.get(key); const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; tex.set(key, t); return t; }
// latte art: a heart or a leaf (rosetta) in milk foam on espresso
const artTex = (kind) => canvasTex('art' + kind, 64, 64, (x) => {
  x.fillStyle = '#b07a4a'; x.beginPath(); x.arc(32, 32, 32, 0, 7); x.fill();
  x.fillStyle = '#f6eadb';
  if (kind === 'heart') { x.beginPath(); x.moveTo(32, 50); x.bezierCurveTo(8, 34, 16, 14, 32, 26); x.bezierCurveTo(48, 14, 56, 34, 32, 50); x.fill(); }
  else if (kind === 'leaf') { for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(32, 16 + k * 6, 16 - k * 1.8, 3.2, 0, 0, 7); x.fill(); } x.fillRect(31, 12, 2, 40); }
  else { x.beginPath(); x.arc(32, 32, 22, 0, 7); x.fill(); x.fillStyle = '#c8956a'; x.beginPath(); x.arc(32, 32, 6, 0, 7); x.fill(); } // cappuccino foam
});
export function cup({ kind = 'latte', art = 'heart', color = CAFE.white } = {}) {
  const g = new THREE.Group(), china = M(color, { roughness: 0.35 });
  let top = 0.07;
  if (kind === 'iced') {
    g.add(cyl(0.05, 0.04, 0.16, M(0xdfeef0, { transparent: true, opacity: 0.35, roughness: 0.05 }), 0, 0.08, 0, 12));
    g.add(cyl(0.045, 0.037, 0.06, M(0x6b4022), 0, 0.03, 0, 12)); g.add(cyl(0.046, 0.045, 0.06, M(0xe8d8c0), 0, 0.09, 0, 12)); // coffee under milk
    for (let k = 0; k < 3; k++) g.add(box(0.03, 0.03, 0.03, M(0xf2fafb, { transparent: true, opacity: 0.7 }), Math.cos(k * 2) * 0.02, 0.125, Math.sin(k * 2) * 0.02));
    const straw = cyl(0.005, 0.005, 0.22, M(CAFE.terracotta), 0.015, 0.14, 0, 5); straw.rotation.z = 0.15; g.add(straw);
    g.userData = { kind: 'cup', cup: kind, hot: false };
    return g;
  }
  if (kind === 'yunomi' || kind === 'chawan') { // a tall teacup with no handle, or a wide bowl of whisked matcha
    const glaze = M(color === CAFE.white ? (kind === 'yunomi' ? 0x8a7a6a : 0x3a3430) : color, { roughness: 0.6 });
    if (kind === 'yunomi') { g.add(cyl(0.035, 0.03, 0.09, glaze, 0, 0.045, 0, 12)); g.add(mesh(new THREE.CircleGeometry(0.031, 12).rotateX(-Math.PI / 2), M(0x9a8a3a, { roughness: 0.2 }), 0, 0.085, 0)); g.userData = { kind: 'cup', cup: kind, hot: true, steamAt: [0, 0.1, 0] }; }
    else { g.add(mesh(new THREE.SphereGeometry(0.065, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glaze, 0, 0.065, 0)); g.add(mesh(new THREE.CircleGeometry(0.06, 14).rotateX(-Math.PI / 2), M(0x8fb04a, { roughness: 0.5 }), 0, 0.055, 0)); g.userData = { kind: 'cup', cup: kind, hot: true, steamAt: [0, 0.07, 0] }; }
    return g;
  }
  const r = kind === 'espresso' ? 0.03 : kind === 'mug' ? 0.045 : 0.045, h = kind === 'espresso' ? 0.04 : kind === 'mug' ? 0.1 : 0.06;
  if (kind !== 'mug') g.add(cyl(0.075, 0.07, 0.01, china, 0, 0.005, 0, 16)); // saucer
  g.add(cyl(r, r * 0.75, h, china, 0, 0.01 + h / 2, 0, 14));
  g.add(mesh(new THREE.TorusGeometry(r * 0.5, 0.007, 4, 8), china, r + 0.012, 0.01 + h * 0.55, 0));
  const surf = mesh(new THREE.CircleGeometry(r * 0.92, 16).rotateX(-Math.PI / 2), kind === 'tea' ? M(0xb06a2a, { roughness: 0.2 }) : kind === 'espresso' ? M(0x4a2a1a, { roughness: 0.2 }) : new THREE.MeshStandardMaterial({ map: artTex(kind === 'cappuccino' ? 'foam' : art), roughness: 0.5 }), 0, 0.01 + h - 0.006, 0);
  g.add(surf);
  top = 0.01 + h;
  g.userData = { kind: 'cup', cup: kind, hot: true, steamAt: [0, top + 0.02, 0] };
  return g;
}
// a laptop (thin, silver). screen: 'code' | 'sheet' | 'design' | 'call'. The picture scrolls a little while someone types
const screens = {
  code: (x, w, h) => { x.fillStyle = '#1e2329'; x.fillRect(0, 0, w, h); const cols = ['#e2a9a0', '#9db59a', '#d9a441', '#8ab4d8', '#c8c8c8']; for (let r = 0; r < 40; r++) { let cx = 8 + (r % 5) * 6; for (let k = 0; k < 3 + (r * 7) % 4; k++) { const len = 10 + ((r * 13 + k * 7) % 30); x.fillStyle = cols[(r + k) % cols.length]; x.fillRect(cx, 6 + r * 7, len, 3); cx += len + 5; } } },
  sheet: (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#4a8a5a'; x.fillRect(0, 0, w, 12); x.strokeStyle = '#d6dbe0'; for (let c = 0; c < w; c += 28) { x.beginPath(); x.moveTo(c, 12); x.lineTo(c, h); x.stroke(); } for (let r = 12; r < h; r += 9) { x.beginPath(); x.moveTo(0, r); x.lineTo(w, r); x.stroke(); } x.fillStyle = '#5a6670'; for (let r = 0; r < 26; r++) for (let c = 0; c < 4; c++) x.fillRect(4 + c * 28, 15 + r * 9, 8 + ((r * c * 7) % 14), 3); },
  design: (x, w, h) => { x.fillStyle = '#f3ead8'; x.fillRect(0, 0, w, h); x.fillStyle = '#2f3e57'; x.fillRect(0, 0, 18, h); x.fillStyle = '#e2a9a0'; x.beginPath(); x.arc(70, 60, 26, 0, 7); x.fill(); x.fillStyle = '#9db59a'; x.fillRect(40, 100, 60, 30); x.fillStyle = '#d9a441'; x.beginPath(); x.moveTo(30, 200); x.lineTo(70, 150); x.lineTo(110, 200); x.fill(); },
  call: (x, w, h) => { x.fillStyle = '#222'; x.fillRect(0, 0, w, h); const t = ['#8ab4d8', '#e2a9a0', '#9db59a', '#d9a441']; for (let k = 0; k < 4; k++) { const cx = (k % 2) * w / 2, cy = Math.floor(k / 2) * h / 3; x.fillStyle = '#3a3f46'; x.fillRect(cx + 2, cy + 2, w / 2 - 4, h / 3 - 4); x.fillStyle = t[k]; x.beginPath(); x.arc(cx + w / 4, cy + h / 6 + 6, 12, 0, 7); x.fill(); x.fillRect(cx + w / 4 - 16, cy + h / 6 + 18, 32, 14); } },
};
export function laptop({ screen = 'code', open = 1 } = {}) {
  const g = new THREE.Group(), al = M(0xc9ccd1, { metalness: 0.55, roughness: 0.3 });
  g.add(rbox(0.32, 0.015, 0.22, 0.01, al, 0, 0.008, 0));
  g.add(box(0.27, 0.002, 0.1, M(0x2a2d33), 0, 0.017, -0.02)); // the keyboard
  const lid = new THREE.Group(); lid.position.set(0, 0.015, -0.11); g.add(lid);
  lid.add(rbox(0.32, 0.21, 0.01, 0.01, al, 0, 0.105, 0));
  const t = canvasTex('screen' + screen, 128, 256, (x, w, h) => screens[screen](x, w, h)).clone(); t.needsUpdate = true;
  t.repeat.set(1, 0.5); t.wrapT = THREE.RepeatWrapping;
  const sm = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.65, roughness: 0.4 });
  lid.add(mesh(new THREE.PlaneGeometry(0.29, 0.18), sm, 0, 0.11, 0.006));
  lid.add(mesh(new THREE.CircleGeometry(0.018, 12), M(0xe8eaee, { metalness: 0.4 }), 0, 0.11, -0.006)).children.at(-1).rotation.y = Math.PI; // a plain mark on the back
  lid.rotation.x = -(1 - open) * 1.5 - 0.18;
  g.userData = { kind: 'laptop', screen, open, typing: false, lid, update: (time, dt = 0) => { if (g.userData.typing) t.offset.y = (t.offset.y + dt * (screen === 'call' ? 0 : 0.012)) % 0.5; } };
  return g;
}
export function book({ color = CAFE.terracotta, open = true } = {}) {
  const g = new THREE.Group();
  if (!open) { g.add(box(0.16, 0.03, 0.22, M(color), 0, 0.015, 0)); g.add(box(0.15, 0.024, 0.21, M(0xf6f1e6), 0.006, 0.015, 0)); return g; }
  for (const s of [1, -1]) { const p = box(0.13, 0.012, 0.19, M(0xf8f4ea), s * 0.067, 0.014, 0); p.rotation.z = -s * 0.08; g.add(p); const c = box(0.135, 0.006, 0.2, M(color), s * 0.068, 0.006, 0); c.rotation.z = -s * 0.08; g.add(c); }
  for (let k = 0; k < 8; k++) for (const s of [1, -1]) g.add(box(0.1, 0.001, 0.004, M(0x9a9aa0), s * 0.067, 0.022, -0.07 + k * 0.02));
  return g;
}
export function notebook({ color = CAFE.sage } = {}) {
  const g = new THREE.Group();
  g.add(box(0.15, 0.008, 0.2, M(color), 0, 0.004, 0)); g.add(box(0.14, 0.004, 0.19, M(0xffffff), 0, 0.01, 0));
  for (let k = 0; k < 7; k++) g.add(box(0.11, 0.001, 0.003, M(0x8ab4d8), 0, 0.013, -0.07 + k * 0.024));
  const pen = cyl(0.004, 0.004, 0.14, M(CAFE.mustard), 0.1, 0.008, 0.02, 5); pen.rotation.x = Math.PI / 2; pen.rotation.z = 0.3; g.add(pen);
  const hl = cyl(0.008, 0.008, 0.1, M(0xf2e94c), -0.11, 0.008, 0.05, 6); hl.rotation.x = Math.PI / 2; g.add(hl); // a highlighter
  return g;
}
// Mina's sketchbook (DESIGN.md §12), open at the last drawing: 1 the rainy street from the Nordic window, 2 the stone
// lantern and the ripples in the garden, 3 the Sagrada Família in pencil, 4 the same in watercolour at night
const SKETCH = [
  (x) => { x.strokeRect(14, 22, 100, 70); x.beginPath(); x.moveTo(64, 22); x.lineTo(64, 92); x.moveTo(14, 57); x.lineTo(114, 57); x.stroke(); for (let k = 0; k < 18; k++) { const a = 20 + (k * 37) % 90, b = 26 + (k * 23) % 58; x.beginPath(); x.moveTo(a, b); x.lineTo(a - 2, b + 7); x.stroke(); } x.beginPath(); x.ellipse(36, 98, 12, 5, 0, 0, 7); x.moveTo(24, 98); x.lineTo(20, 90); x.lineTo(28, 94); x.stroke(); },
  (x) => { x.strokeRect(52, 30, 24, 8); x.strokeRect(56, 38, 16, 14); x.beginPath(); x.moveTo(46, 30); x.lineTo(64, 18); x.lineTo(82, 30); x.moveTo(60, 52); x.lineTo(60, 80); x.moveTo(68, 52); x.lineTo(68, 80); x.moveTo(48, 82); x.lineTo(80, 82); x.stroke(); for (const r of [6, 12, 18]) { x.beginPath(); x.ellipse(96, 100, r, r * 0.4, 0, 0, 7); x.stroke(); } x.beginPath(); x.arc(30, 96, 10, Math.PI, 0); x.stroke(); },
  (x) => { for (const [cx, h] of [[30, 56], [46, 70], [64, 90], [82, 70], [98, 56]]) { x.beginPath(); x.moveTo(cx - 7, 112); x.lineTo(cx - 4, 112 - h); x.quadraticCurveTo(cx, 106 - h - 14, cx + 4, 112 - h); x.lineTo(cx + 7, 112); x.stroke(); for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(cx - 2, 104 - k * h / 6); x.lineTo(cx + 2, 104 - k * h / 6); x.stroke(); } } x.beginPath(); x.moveTo(10, 114); x.lineTo(118, 114); x.stroke(); },
];
const sketchTex = (n) => canvasTex('sketch' + n, 256, 128, (x) => {
  x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#e6dfd0'; x.fillRect(127, 0, 2, 128);
  const page = (i, dx) => { if (i < 1) return; x.save(); x.translate(dx, 0); if (i === 4) { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#2f3e6a'); g.addColorStop(1, '#c9714a'); x.globalAlpha = 0.55; x.fillStyle = g; x.fillRect(8, 8, 112, 112); x.globalAlpha = 1; x.strokeStyle = '#f6e3b0'; } else x.strokeStyle = '#4a4540'; x.lineWidth = 1.4; SKETCH[Math.min(i, 3) - 1](x); x.restore(); };
  page(n - 1, 0); page(n, 128);
});
export function sketchbook({ page = 1 } = {}) {
  const g = new THREE.Group();
  g.add(box(0.36, 0.01, 0.2, M(0x3a3f4a), 0, 0.005, 0));
  const face = new THREE.MeshStandardMaterial({ map: sketchTex(page), roughness: 0.9 });
  g.add(mesh(new THREE.PlaneGeometry(0.34, 0.18).rotateX(-Math.PI / 2), face, 0, 0.012, 0));
  const pencil = cyl(0.004, 0.004, 0.15, M(0x3a3f4a), 0.2, 0.008, 0.02, 6); pencil.rotation.x = Math.PI / 2; pencil.rotation.z = 0.4; g.add(pencil);
  g.userData.page = (n) => { face.map = sketchTex(n); }; // turn to a later drawing
  return g;
}
export function tablet() {
  const g = new THREE.Group();
  g.add(rbox(0.24, 0.008, 0.17, 0.01, M(0x2a2d33), 0, 0.004, 0));
  const t = canvasTex('tabletArt', 128, 96, (x) => { x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, 128, 96); x.strokeStyle = '#2f3e57'; x.lineWidth = 2; x.beginPath(); x.arc(64, 44, 22, 0, 7); x.stroke(); x.fillStyle = '#e2a9a0'; x.beginPath(); x.arc(56, 40, 5, 0, 7); x.fill(); x.beginPath(); x.moveTo(44, 70); x.quadraticCurveTo(64, 82, 84, 70); x.stroke(); });
  g.add(mesh(new THREE.PlaneGeometry(0.22, 0.15).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5 }), 0, 0.009, 0));
  const pen = cyl(0.004, 0.004, 0.13, M(0xf6f1e6), 0.14, 0.006, 0, 5); pen.rotation.x = Math.PI / 2; g.add(pen);
  return g;
}
export function phone() { const g = new THREE.Group(); g.add(rbox(0.06, 0.008, 0.12, 0.008, M(0x2a2d33), 0, 0.004, 0)); g.add(mesh(new THREE.PlaneGeometry(0.05, 0.1).rotateX(-Math.PI / 2), M(0x3a4a5a, { emissive: 0x8ab4d8, emissiveIntensity: 0.3 }), 0, 0.009, 0)); return g; }
export function plate({ food = 'roll' } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.1, 0.09, 0.015, M(CAFE.white, { roughness: 0.35 }), 0, 0.008, 0, 18));
  const c = { roll: 0xc9884a, cake: 0xf2dca0, croissant: 0xd9a441, dora: 0xa8743a, toast: 0xe8c890, churro: 0xc9884a }[food] ?? 0xc9884a;
  if (food === 'roll') g.add(mesh(new THREE.TorusGeometry(0.04, 0.025, 6, 10).rotateX(Math.PI / 2), M(c), 0, 0.03, 0));
  else if (food === 'cake') { g.add(cyl(0.05, 0.05, 0.06, M(c), 0, 0.045, 0, 3)); g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), M(0xc8283a), 0, 0.085, 0)); }
  else g.add(mesh(new THREE.CapsuleGeometry(0.025, 0.07, 4, 8).rotateZ(Math.PI / 2), M(c), 0, 0.03, 0));
  const fork = box(0.1, 0.004, 0.01, M(CAFE.steel, { metalness: 0.6 }), 0.02, 0.018, 0.06); fork.rotation.y = 0.3; g.add(fork);
  return g;
}

// ---------- steam: soft puffs that rise, drift and fade above every hot drink (one Points draw) ----------
const puffTex = canvasTex('puff', 64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
export class Steam {
  constructor(parent, { max = 600, per = 5 } = {}) {
    this.max = max; this.per = per; this.sources = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.life = new Float32Array(max); this.seed = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: puffTex }, uScale: { value: 1300 } }, transparent: true, depthWrite: false,
      vertexShader: 'attribute float aLife; varying float vL; uniform float uScale; void main(){ vL = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uScale * (0.02 + 0.05 * aLife) / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D uTex; varying float vL; void main(){ vec4 c = texture2D(uTex, gl_PointCoord); float a = c.a * 0.5 * smoothstep(0.0, 0.15, vL) * (1.0 - smoothstep(0.55, 1.0, vL)); if (vL <= 0.0) discard; gl_FragColor = vec4(1.0, 0.98, 0.95, a); }',
    });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 2;
    parent.add(this.points);
  }
  // follow an object (a cup) — its steamAt point, wherever it is in the world
  add(obj) { if (this.sources.length * this.per >= this.max) return; const base = this.sources.length * this.per; this.sources.push({ obj, base }); for (let k = 0; k < this.per; k++) { this.life[base + k] = (k / this.per); this.seed[base + k] = Math.random() * 6.28; } }
  update(t, dt) {
    const v = new THREE.Vector3();
    for (const { obj, base } of this.sources) {
      const at = obj.userData.steamAt ?? [0, 0.1, 0];
      v.set(...at); obj.localToWorld(v);
      const on = obj.visible && obj.parent?.visible !== false;
      for (let k = 0; k < this.per; k++) {
        const i = base + k; let L = this.life[i] + dt * 0.45;
        if (L >= 1) L = 0;
        this.life[i] = on ? L : 0;
        const s = this.seed[i];
        this.pos[i * 3] = v.x + Math.sin(t * 1.3 + s + L * 4) * 0.02 * L;
        this.pos[i * 3 + 1] = v.y + L * 0.22;
        this.pos[i * 3 + 2] = v.z + Math.cos(t * 1.1 + s * 2 + L * 3) * 0.02 * L;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aLife.needsUpdate = true;
    this.points.geometry.setDrawRange(0, this.sources.length * this.per);
  }
}

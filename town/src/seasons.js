// Seasons for the old capital (koto/DESIGN.md §1.5): trees keep their shape, their crowns change colour
// (or go bare in winter), and things fall — petals in spring, leaves in autumn, snow in winter.
// setSeason(name) updates every tree made here and every Falling system.
import * as THREE from 'three';
import { part, assemble, ellipsoid, tube, seeded, swimMaterial } from '../../sealife/src/kit.js';

export const SEASONS = {
  spring: { ja: '春', sakura: '#f7c6d2', momiji: '#a8c96a', yanagi: '#b9d77a', ume: '#9cc46a', fuji: '#9a7fd0', fujiLeaf: '#8fb86a', tsubaki: '#c8283a', ajisai: null, grass: '#a9c98a', sky: '#eef0f4', fall: { color: '#f9d4dd', size: 0.09, n: 260, speed: 0.5 } },
  summer: { ja: '初夏', sakura: '#6aa654', momiji: '#5f9a46', yanagi: '#7fae5a', ume: '#6aa654', fuji: null, fujiLeaf: '#5f9a46', tsubaki: null, ajisai: '#7f8fd8', grass: '#8fbf6a', sky: '#e6efe9', fall: null },
  autumn: { ja: '秋', sakura: '#c9782f', momiji: '#d9482b', yanagi: '#c9b85a', ume: '#b8a050', fuji: null, fujiLeaf: '#c9a84a', tsubaki: null, ajisai: null, grass: '#b8b07a', sky: '#f2ebe0', fall: { color: '#d9542f', size: 0.1, n: 200, speed: 0.6 } },
  winter: { ja: '冬', sakura: null, momiji: null, yanagi: null, ume: '#f4c7d4', fuji: null, fujiLeaf: null, tsubaki: '#c8283a', ajisai: null, grass: '#e8ecee', sky: '#e9edf1', fall: { color: '#ffffff', size: 0.07, n: 420, speed: 0.35 } },
};
let current = 'spring';
const crownMats = {}; // by tree kind: shared, recoloured by the season
const crowns = []; // [mesh, kind]: hidden when the season has no leaves
const fallers = [];
const listeners = [];
export const onSeason = (f) => { listeners.push(f); f(current, SEASONS[current]); };
export function setSeason(name) {
  current = name;
  const S = SEASONS[name];
  for (const [kind, m] of Object.entries(crownMats)) if (S[kind]) m.color.set(S[kind]);
  for (const [mesh, kind] of crowns) mesh.visible = !!S[kind];
  for (const f of fallers) f.setSeason(S.fall);
  for (const f of listeners) f(name, S);
}
export const season = () => current;

const SWAY = { yanagi: { amp: 0.18, freq: 0.9, waves: 0.3, z0: 0.5, len: 4 }, fuji: { amp: 0.06, freq: 1.1, waves: 0.2, z0: 1.4, len: 1.2 } };
function crownMat(kind) {
  if (!crownMats[kind]) {
    crownMats[kind] = swimMaterial({ mode: 'sway', amp: 0.05, freq: 0.8, waves: 0.15, z0: 1.5, len: 4, ...SWAY[kind] }, { roughness: 0.9 });
    crownMats[kind].color.set(SEASONS[current][kind] ?? '#ffffff');
  }
  return crownMats[kind];
}
const barkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
const shades = (lo, hi) => (p) => '#' + new THREE.Color().setScalar(THREE.MathUtils.lerp(lo, hi, Math.min(1, Math.max(0, (Math.sin(p.x * 13 + p.y * 7) * Math.sin(p.z * 11) + 1) / 2)))).getHexString();
const geoCache = new Map();
const once = (k, f) => { if (!geoCache.has(k)) geoCache.set(k, f()); return geoCache.get(k); };

// a branching trunk: returns the branch tips (where the crown puffs go)
function branches(r, parts, { height = 2.2, spread = 1.6, levels = 3, color = '#5a4636', thick = 0.18 }) {
  const tips = [];
  const grow = (from, dir, len, rad, lv) => {
    const to = from.clone().addScaledVector(dir, len);
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.15));
    parts.push(part(tube([from.toArray(), mid.toArray(), to.toArray()], rad, rad * 0.7, 6), color));
    if (lv === 0) { tips.push(to); return; }
    const n = 2 + (r() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const d = dir.clone().add(new THREE.Vector3((r() - 0.5) * spread, 0.15 + r() * 0.3, (r() - 0.5) * spread)).normalize();
      grow(to, d, len * 0.72, rad * 0.62, lv - 1);
    }
  };
  grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), height * 0.45, thick, levels);
  return tips;
}

function tree(kind, build) {
  const { bark, crown } = once(kind, build);
  const g = new THREE.Group();
  const b = new THREE.Mesh(bark, barkMat); b.castShadow = true; g.add(b);
  const c = new THREE.Mesh(crown, crownMat(kind.split(':')[0])); c.castShadow = true; c.receiveShadow = true; g.add(c);
  c.visible = !!SEASONS[current][kind.split(':')[0]];
  crowns.push([c, kind.split(':')[0]]);
  g.userData = { kind: 'nature', nature: kind, keep: true };
  return g;
}

// 桜: a spreading cherry, or a weeping one (しだれ桜)
export function sakura({ seed = 1, weeping = false } = {}) {
  return tree(`sakura:${weeping ? 'w' : 'n'}${seed}`, () => {
    const r = seeded(seed + 3), parts = [], puffs = [];
    const tips = branches(r, parts, weeping ? { height: 3.4, spread: 1.2, levels: 3, thick: 0.2 } : { height: 2.6, spread: 2.0, levels: 3, thick: 0.22 });
    for (const t of tips) {
      if (weeping) { // strands hanging down from each tip, flowers along them
        for (let k = 0; k < 3; k++) { const a = r() * 6.28, o = 0.25 + r() * 0.3; const x = t.x + Math.cos(a) * o, z = t.z + Math.sin(a) * o; parts.push(part(tube([[t.x, t.y, t.z], [x, t.y - 0.5, z], [x, t.y - 1.8 - r(), z]], 0.012, 0.008, 3), '#5a4636')); for (let y = 0.4; y < 1.9; y += 0.32) puffs.push(part(ellipsoid(0.16, 0.22, 0.16, 6), shades(0.82, 1), { pos: [x, t.y - y, z] })); }
      } else for (let k = 0; k < 2; k++) puffs.push(part(ellipsoid(0.55 + r() * 0.3, 0.38 + r() * 0.15, 0.55 + r() * 0.3, 8), shades(0.78, 1), { pos: [t.x + (r() - 0.5) * 0.3, t.y + r() * 0.2, t.z + (r() - 0.5) * 0.3] }));
    }
    return { bark: assemble(parts), crown: assemble(puffs) };
  });
}
// 楓 (イロハモミジ): a slender maple with layered, flat-ish canopy tiers
export function momiji({ seed = 1 } = {}) {
  return tree(`momiji:${seed}`, () => {
    const r = seeded(seed + 9), parts = [], puffs = [];
    const tips = branches(r, parts, { height: 2.4, spread: 1.7, levels: 3, thick: 0.13, color: '#4a3e34' });
    for (const t of tips) puffs.push(part(ellipsoid(0.5 + r() * 0.25, 0.18 + r() * 0.08, 0.5 + r() * 0.25, 9), shades(0.75, 1), { pos: [t.x, t.y + 0.05, t.z] }));
    return { bark: assemble(parts), crown: assemble(puffs) };
  });
}

// 柳: a willow by the river, long strands down to the water swinging in the wind
export function yanagi({ seed = 1 } = {}) {
  return tree(`yanagi:${seed}`, () => {
    const r = seeded(seed + 21), parts = [], strands = [];
    const tips = branches(r, parts, { height: 3.6, spread: 1.4, levels: 2, thick: 0.22, color: '#4a4036' });
    for (const t of tips) for (let k = 0; k < 6; k++) {
      const a = r() * 6.28, o = 0.2 + r() * 0.9, x = t.x + Math.cos(a) * o, z = t.z + Math.sin(a) * o, L = 1.8 + r() * 1.4;
      for (let y = 0.1; y < L; y += 0.22) strands.push(part(ellipsoid(0.07, 0.16, 0.07, 5), shades(0.75, 1), { pos: [x + Math.sin(y) * 0.05, t.y + 0.3 - y, z] }));
    }
    return { bark: assemble(parts), crown: assemble(strands) };
  });
}
// 梅: a small plum with crooked branches — white-pink blossom in winter, leaves the rest of the year
export function ume({ seed = 1 } = {}) {
  return tree(`ume:${seed}`, () => {
    const r = seeded(seed + 31), parts = [], puffs = [];
    const tips = branches(r, parts, { height: 1.8, spread: 2.4, levels: 3, thick: 0.13, color: '#3e342c' });
    for (const t of tips) for (let k = 0; k < 4; k++) puffs.push(part(ellipsoid(0.12, 0.12, 0.12, 5), shades(0.85, 1), { pos: [t.x + (r() - 0.5) * 0.5, t.y + (r() - 0.5) * 0.3, t.z + (r() - 0.5) * 0.5] }));
    return { bark: assemble(parts), crown: assemble(puffs) };
  });
}
// 松: a trained garden pine — a leaning trunk and flat cloud-like pads of needles (evergreen)
const pineMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, color: '#3f6a3a' });
const mossMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, color: '#7f9f52' });
export function matsu({ seed = 1, lean = 0.5 } = {}) {
  const geo = once(`matsu:${seed}:${lean}`, () => {
    const r = seeded(seed + 41), bark = [], pads = [];
    const pts = [[0, 0, 0], [lean * 0.4, 1.0, 0.1], [lean * 1.1, 1.9, -0.1], [lean * 1.4, 2.8, 0.15]];
    bark.push(part(tube(pts, 0.2, 0.09, 7), '#6b4a3a'));
    for (let i = 0; i < 6; i++) {
      const k = 0.3 + i * 0.13, p = pts[Math.min(3, Math.round(k * 3))], a = i * 2.3 + r(), L = 0.8 + r() * 0.7;
      const end = [p[0] + Math.cos(a) * L, p[1] + 0.15 + r() * 0.2, p[2] + Math.sin(a) * L];
      bark.push(part(tube([p, [(p[0] + end[0]) / 2, p[1] + 0.25, (p[2] + end[2]) / 2], end], 0.06, 0.03, 5), '#6b4a3a'));
      pads.push(part(ellipsoid(0.6 + r() * 0.3, 0.16, 0.5 + r() * 0.3, 9), shades(0.55, 0.8), { pos: end }));
    }
    pads.push(part(ellipsoid(0.7, 0.22, 0.6, 9), shades(0.55, 0.8), { pos: [lean * 1.4, 2.95, 0.15] }));
    return { bark: assemble(bark), pads: assemble(pads) };
  });
  const g = new THREE.Group();
  const b = new THREE.Mesh(geo.bark, barkMat); b.castShadow = true; g.add(b);
  const p = new THREE.Mesh(geo.pads, pineMat); p.castShadow = true; p.receiveShadow = true; g.add(p);
  g.userData = { kind: 'nature', nature: 'matsu', keep: true };
  return g;
}
// bushes: 椿 (camellia, flowers in winter and spring), 紫陽花 (hydrangea, flowers in early summer). Leaves stay; flowers come and go
const bushMat = swimMaterial({ mode: 'sway', amp: 0.02, freq: 0.7, waves: 0.1, z0: 0.3, len: 1.2 }, { roughness: 0.9 });
bushMat.color.set('#4f7a3a');
function bush(kind, seed, size, flowerSize) {
  const geo = once(`${kind}:${seed}`, () => {
    const r = seeded(seed + 51), leaves = [], flowers = [];
    for (let k = 0; k < 9; k++) { const a = k * 2.4, o = r() * 0.5 * size; leaves.push(part(ellipsoid(0.42 * size, 0.36 * size, 0.42 * size, 8), shades(0.7, 1), { pos: [Math.cos(a) * o, 0.35 * size + r() * 0.4 * size, Math.sin(a) * o] })); }
    for (let k = 0; k < 14; k++) { const a = k * 2.1 + r(), e = 0.2 + r() * 1.0, rr = 0.62 * size; flowers.push(part(ellipsoid(flowerSize, flowerSize, flowerSize, 6), shades(0.8, 1), { pos: [Math.cos(a) * Math.cos(e) * rr, 0.45 * size + Math.sin(e) * rr * 0.8, Math.sin(a) * Math.cos(e) * rr] })); }
    return { leaves: assemble(leaves), flowers: assemble(flowers) };
  });
  const g = new THREE.Group();
  const l = new THREE.Mesh(geo.leaves, bushMat); l.castShadow = true; g.add(l);
  const f = new THREE.Mesh(geo.flowers, crownMat(kind)); g.add(f);
  f.visible = !!SEASONS[current][kind]; crowns.push([f, kind]);
  g.userData = { kind: 'nature', nature: kind, keep: true };
  return g;
}
export const tsubaki = ({ seed = 1, size = 1 } = {}) => bush('tsubaki', seed, size, 0.1);
export const ajisai = ({ seed = 1, size = 0.8 } = {}) => bush('ajisai', seed, size, 0.17);
// 藤棚: a wooden trellis covered in vine leaves, purple clusters hanging in spring
export function fujidana({ w = 4, d = 3, h = 2.4 } = {}) {
  const geo = once(`fuji:${w}:${d}`, () => {
    const r = seeded(77), frame = [], leaves = [], hang = [];
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) frame.push(part(new THREE.CylinderGeometry(0.07, 0.07, h, 6), '#6b5a48', { pos: [x * w / 2, h / 2, z * d / 2] }));
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.5) frame.push(part(new THREE.BoxGeometry(0.06, 0.06, d + 0.4), '#7a6a58', { pos: [x, h, 0] }));
    for (const z of [-d / 2, d / 2]) frame.push(part(new THREE.BoxGeometry(w + 0.4, 0.1, 0.1), '#6b5a48', { pos: [0, h - 0.06, z] }));
    frame.push(part(tube([[w / 2, 0, d / 2], [w / 2 - 0.1, h * 0.6, d / 2 + 0.1], [w / 2, h, d / 2 - 0.2]], 0.07, 0.05, 5), '#4a3e34')); // the vine trunk
    for (let k = 0; k < 40; k++) leaves.push(part(ellipsoid(0.35, 0.1, 0.35, 6), shades(0.75, 1), { pos: [(r() - 0.5) * w, h + 0.08, (r() - 0.5) * d] }));
    for (let k = 0; k < 46; k++) hang.push(part(new THREE.ConeGeometry(0.08, 0.5 + r() * 0.3, 6).rotateX(Math.PI), shades(0.8, 1), { pos: [(r() - 0.5) * (w - 0.3), h - 0.3, (r() - 0.5) * (d - 0.3)] }));
    return { frame: assemble(frame), leaves: assemble(leaves), hang: assemble(hang) };
  });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo.frame, barkMat));
  for (const [gg, kind] of [[geo.leaves, 'fujiLeaf'], [geo.hang, 'fuji']]) { const m = new THREE.Mesh(gg, crownMat(kind)); m.visible = !!SEASONS[current][kind]; crowns.push([m, kind]); g.add(m); }
  g.userData = { kind: 'nature', nature: 'fujidana', keep: true };
  return g;
}
// 竹林: a grove of tall culms with nodes, leaves high up, all swaying (instanced: 2 draw calls)
const bambooMats = {};
// avoid(x, z): true where no culm may stand (a path through the grove), in the grove's own coordinates
export function bamboo({ w = 8, d = 8, n = 90, h = 9, seed = 3, avoid = null } = {}) {
  const geo = once(`bamboo:${h}`, () => {
    const culm = [part(new THREE.CylinderGeometry(0.06, 0.075, h, 7).translate(0, h / 2, 0), (p) => (Math.sin(p.y * 3) > 0.96 ? '#a8c27a' : '#7fa05a'))];
    for (let y = 0.5; y < h; y += 0.8) culm.push(part(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 6, 1, true), '#c9d69a', { pos: [0, y, 0] })); // the nodes
    const leaves = [];
    const r = seeded(9);
    for (let k = 0; k < 9; k++) { const y = h * 0.55 + r() * h * 0.45, a = r() * 6.28; leaves.push(part(new THREE.OctahedronGeometry(1, 0).scale(0.6, 0.12, 0.28), shades(0.7, 1), { pos: [Math.cos(a) * 0.4, y, Math.sin(a) * 0.4], rot: [0, -a, 0.3] })); }
    return { culm: assemble(culm), leaves: assemble(leaves) };
  });
  bambooMats.culm ??= swimMaterial({ mode: 'sway', amp: 0.25, freq: 0.6, waves: 0.05, z0: 1, len: h }, { roughness: 0.6 });
  bambooMats.leaves ??= swimMaterial({ mode: 'sway', amp: 0.25, freq: 0.6, waves: 0.05, z0: 1, len: h }, { roughness: 0.9 });
  bambooMats.leaves.color.set('#7fae5a');
  const r = seeded(seed), g = new THREE.Group(), o = new THREE.Object3D();
  const ph = new Float32Array(n);
  const ims = [new THREE.InstancedMesh(geo.culm, bambooMats.culm, n), new THREE.InstancedMesh(geo.leaves, bambooMats.leaves, n)];
  for (let i = 0; i < n; i++) {
    let x, z, tries = 0;
    do { x = (r() - 0.5) * w; z = (r() - 0.5) * d; } while (avoid && avoid(x, z) && ++tries < 30);
    o.position.set(x, 0, z); o.rotation.set((r() - 0.5) * 0.06, r() * 6.28, (r() - 0.5) * 0.06); o.scale.setScalar(0.75 + r() * 0.4); o.updateMatrix();
    ims.forEach((im) => im.setMatrixAt(i, o.matrix)); ph[i] = r() * 6.28;
  }
  for (const im of ims) { im.geometry = im.geometry.clone(); im.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1)); im.castShadow = true; g.add(im); }
  g.userData = { kind: 'nature', nature: 'bamboo', keep: true, count: n };
  return g;
}
// 杉: a forest of tall cedars, stacked dark cones on a straight red-brown trunk (instanced: 2 draw calls, evergreen)
// at: [[x, y, z, scale], …]
const sugiMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, color: '#3a5f3e' });
export function sugiForest(at, { seed = 7 } = {}) {
  const geo = once('sugi', () => {
    const trunk = assemble([part(new THREE.CylinderGeometry(0.12, 0.22, 9, 6).translate(0, 4.5, 0), '#7a4a34')]);
    const crown = [];
    for (let k = 0; k < 5; k++) crown.push(part(new THREE.ConeGeometry(1.5 - k * 0.24, 2.2, 8).translate(0, 3.6 + k * 1.25, 0), shades(0.6 + k * 0.06, 0.85 + k * 0.03)));
    return { trunk, crown: assemble(crown) };
  });
  const r = seeded(seed), g = new THREE.Group(), o = new THREE.Object3D();
  const ims = [new THREE.InstancedMesh(geo.trunk, barkMat, at.length), new THREE.InstancedMesh(geo.crown, sugiMat, at.length)];
  at.forEach(([x, y, z, sc = 1], i) => { o.position.set(x, y, z); o.rotation.set(0, r() * 6.28, (r() - 0.5) * 0.04); o.scale.set(sc, sc * (0.9 + r() * 0.25), sc); o.updateMatrix(); ims.forEach((im) => im.setMatrixAt(i, o.matrix)); });
  for (const im of ims) { im.castShadow = true; im.receiveShadow = true; g.add(im); }
  g.userData = { kind: 'nature', nature: 'sugi', keep: true, count: at.length };
  return g;
}
// 苔と羊歯: a mossy mound with a few ferns (ground cover around stones and lanterns)
export function mossPatch({ w = 3, d = 2, seed = 4, ferns = 5 } = {}) {
  const geo = once(`moss:${w}:${d}:${seed}`, () => {
    const r = seeded(seed + 61), ps = [];
    for (let k = 0; k < 10; k++) ps.push(part(ellipsoid(0.4 + r() * 0.5, 0.08 + r() * 0.06, 0.35 + r() * 0.4, 8), shades(0.55, 0.85), { pos: [(r() - 0.5) * w, 0.02, (r() - 0.5) * d] }));
    for (let k = 0; k < ferns; k++) { const x = (r() - 0.5) * w * 0.8, z = (r() - 0.5) * d * 0.8; for (let j = 0; j < 6; j++) { const a = (j / 6) * 6.28 + r(); ps.push(part(ellipsoid(0.32, 0.03, 0.08, 5), '#c8e0b0', { pos: [x + Math.cos(a) * 0.25, 0.22, z + Math.sin(a) * 0.25], rot: [0, -a, 0.5] })); } }
    return assemble(ps);
  });
  const m = new THREE.Mesh(geo, mossMat); m.receiveShadow = true;
  m.userData = { kind: 'nature', nature: 'moss' };
  return m;
}

// ---------- falling things: petals, leaves, snow (points that drift down and around) ----------
export class Falling {
  constructor(parent, { area = [-10, 10, -10, 10], top = 8 } = {}) {
    this.area = area; this.top = top;
    this.max = 420;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.max * 3);
    this.ph = Float32Array.from({ length: this.max }, () => Math.random() * 6.28);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({ size: 0.1, color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    parent.add(this.points);
    for (let i = 0; i < this.max; i++) this.respawn(i, true);
    fallers.push(this);
    this.setSeason(SEASONS[current].fall);
  }
  respawn(i, anywhere) {
    const [x0, x1, z0, z1] = this.area;
    this.pos[i * 3] = x0 + Math.random() * (x1 - x0);
    this.pos[i * 3 + 1] = anywhere ? Math.random() * this.top : this.top;
    this.pos[i * 3 + 2] = z0 + Math.random() * (z1 - z0);
  }
  setSeason(f) {
    this.f = f;
    this.points.visible = !!f;
    if (f) { this.mat.color.set(f.color); this.mat.size = f.size; this.points.geometry.setDrawRange(0, f.n); }
  }
  update(t, dt) {
    if (!this.f) return;
    const n = this.f.n, sp = this.f.speed;
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      this.pos[k + 1] -= sp * dt * (0.7 + 0.3 * Math.sin(this.ph[i]));
      this.pos[k] += Math.sin(t * 0.9 + this.ph[i]) * dt * 0.3; // they flutter as they fall
      this.pos[k + 2] += Math.cos(t * 0.7 + this.ph[i] * 1.3) * dt * 0.25;
      if (this.pos[k + 1] < 0) this.respawn(i, false);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

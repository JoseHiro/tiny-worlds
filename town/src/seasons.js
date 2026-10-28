// Seasons for the old capital (koto/DESIGN.md §1.5): trees keep their shape, their crowns change colour
// (or go bare in winter), and things fall — petals in spring, leaves in autumn, snow in winter.
// setSeason(name) updates every tree made here and every Falling system.
import * as THREE from 'three';
import { part, assemble, ellipsoid, tube, seeded, swimMaterial } from '../../sealife/src/kit.js';

export const SEASONS = {
  spring: { ja: '春', sakura: '#f7c6d2', momiji: '#a8c96a', grass: '#a9c98a', sky: '#eef0f4', fall: { color: '#f9d4dd', size: 0.09, n: 260, speed: 0.5 } },
  summer: { ja: '初夏', sakura: '#6aa654', momiji: '#5f9a46', grass: '#8fbf6a', sky: '#e6efe9', fall: null },
  autumn: { ja: '秋', sakura: '#c9782f', momiji: '#d9482b', grass: '#b8b07a', sky: '#f2ebe0', fall: { color: '#d9542f', size: 0.1, n: 200, speed: 0.6 } },
  winter: { ja: '冬', sakura: null, momiji: null, grass: '#e8ecee', sky: '#e9edf1', fall: { color: '#ffffff', size: 0.07, n: 420, speed: 0.35 } },
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

function crownMat(kind) {
  if (!crownMats[kind]) {
    crownMats[kind] = swimMaterial({ mode: 'sway', amp: 0.05, freq: 0.8, waves: 0.15, z0: 1.5, len: 4 }, { roughness: 0.9 });
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

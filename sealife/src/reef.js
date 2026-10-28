// The reef kit (sealife/DESIGN.md §6): corals, soft corals, sea fans, sponges, rocks, seagrass — for any warm sea.
// Each kind is one shape (vertex colours carry the shading: darker at the base, lighter at the tips) drawn many
// times with a tint per colony (instance colour), so a whole reef is a dozen draw calls. Things that move sway
// with the sea-life kit's shader. Everything stands on y = 0 at its base.
import * as THREE from 'three';
import { part, assemble, ellipsoid, tube, seeded, swimMaterial } from './kit.js';

const grey = (k) => new THREE.Color().setScalar(k).getHexString();
const shade = (lo = 0.55, hi = 1, h = 1) => (p) => '#' + grey(THREE.MathUtils.lerp(lo, hi, THREE.MathUtils.clamp(p.y / h, 0, 1)));

// ---------- shapes ----------

// エダサンゴ: branches in three tiers, tips bright
function staghorn(seed) {
  const r = seeded(seed), parts = [];
  const grow = (from, dir, len, rad, depth) => {
    const to = from.clone().addScaledVector(dir, len);
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3((r() - 0.5) * 0.05, 0, (r() - 0.5) * 0.05));
    parts.push(part(tube([from.toArray(), mid.toArray(), to.toArray()], rad, rad * 0.75, 5), shade(0.5, 1, 0.9)));
    if (depth === 0) { parts.push(part(ellipsoid(rad * 0.9, rad * 1.2, rad * 0.9, 6), '#ffffff', { pos: to.toArray() })); return; }
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const d = dir.clone().add(new THREE.Vector3((r() - 0.5) * 1.1, 0.25 + r() * 0.4, (r() - 0.5) * 1.1)).normalize();
      grow(to, d, len * (0.65 + r() * 0.2), rad * 0.75, depth - 1);
    }
  };
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + r(); grow(new THREE.Vector3(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08), new THREE.Vector3(Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6).normalize(), 0.32, 0.055, 2); }
  return assemble(parts);
}
// テーブルサンゴ: a short stalk and a flat plate with a lifted rim, bumpy on top
function tableCoral() {
  const plate = new THREE.LatheGeometry([[0, 0.05], [0.5, 0.08], [0.88, 0.1], [1.0, 0.2], [1.02, 0.14], [0.9, 0.02], [0.4, 0.0], [0, -0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 36);
  const pos = plate.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (v.y > 0.04) pos.setY(i, v.y + Math.sin(v.x * 21) * Math.sin(v.z * 19) * 0.012); }
  plate.computeVertexNormals();
  return assemble([
    part(new THREE.CylinderGeometry(0.1, 0.16, 0.42, 8).translate(0, 0.21, 0), '#8a8a8a'),
    part(plate, (p) => (p.y > 0.07 ? '#' + grey(0.85 + Math.min(0.15, Math.hypot(p.x, p.z) * 0.15)) : '#9a9a9a'), { pos: [0, 0.4, 0] }),
  ]);
}
// ノウサンゴ: a dome with meandering grooves
function brain() {
  const g = new THREE.SphereGeometry(0.5, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = g.attributes.position, v = new THREE.Vector3(), col = [];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const m = Math.sin(v.x * 17 + Math.sin(v.z * 11) * 2.2 + Math.sin(v.y * 9));
    v.multiplyScalar(1 + m * 0.025);
    pos.setXYZ(i, v.x, v.y * 0.8, v.z);
  }
  g.computeVertexNormals();
  return assemble([part(g, (p) => '#' + grey(Math.sin(p.x * 17 + Math.sin(p.z * 11) * 2.2 + Math.sin(p.y / 0.8 * 9)) > 0.2 ? 1 : 0.62))]);
}
// ハマサンゴ: a big lumpy boulder (the base of a bommie)
function boulder(seed) {
  const r = seeded(seed), g = new THREE.IcosahedronGeometry(1, 3);
  const pos = g.attributes.position, v = new THREE.Vector3();
  const a = r() * 6, b = r() * 6;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + 0.12 * Math.sin(v.x * 3 + a) * Math.sin(v.z * 3 + b) + 0.06 * Math.sin(v.y * 7 + v.x * 5);
    v.multiplyScalar(k);
    if (v.y < 0) v.y *= 0.15;
    pos.setXYZ(i, v.x * 1.25, v.y * 0.75 + 0.15, v.z * 1.1);
  }
  g.computeVertexNormals();
  return assemble([part(g, (p) => '#' + grey(0.72 + 0.28 * THREE.MathUtils.clamp(p.y / 0.9, 0, 1) - (Math.sin(p.x * 9) * Math.sin(p.z * 8) > 0.6 ? 0.08 : 0)))]);
}
// 葉状サンゴ: thin curved leaves in a whorl
function foliose(seed) {
  const r = seeded(seed), parts = [];
  for (let i = 0; i < 12; i++) { // overlapping cupped leaves rising in a whorl
    const a = (i / 12) * Math.PI * 2 * 1.6 + r() * 0.4, h = 0.05 + (i / 12) * 0.35;
    const leaf = new THREE.SphereGeometry(0.4, 14, 6, 0, 2.0, 0.25, 0.9).translate(0, -0.4, 0);
    parts.push(part(leaf, shade(0.6, 1, 0.6), { pos: [Math.cos(a) * 0.05, h + 0.4, Math.sin(a) * 0.05], rot: [0, -a, 0.15], scale: [1, 0.6, 1] }));
  }
  return assemble(parts);
}
// ユビエダハマサンゴ: a clump of short blunt fingers
function finger(seed) {
  const r = seeded(seed), parts = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * 0.32, h = 0.18 + r() * 0.2;
    parts.push(part(new THREE.CapsuleGeometry(0.045, h, 3, 6).translate(0, h / 2 + 0.04, 0), shade(0.6, 1, 0.45), { pos: [Math.cos(a) * d, 0, Math.sin(a) * d], rot: [(r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5] }));
  }
  return assemble(parts);
}
// クサビライシ: a disc with radial ridges, lying on the sand
function mushroom() {
  const g = new THREE.CylinderGeometry(0.2, 0.21, 0.06, 40, 1).translate(0, 0.03, 0);
  const pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (v.y > 0.05) pos.setY(i, v.y + 0.02 + Math.abs(Math.sin(Math.atan2(v.z, v.x) * 22)) * 0.015 * Math.hypot(v.x, v.z) / 0.2); }
  g.computeVertexNormals();
  return assemble([part(g.scale(1.3, 1, 1), (p) => '#' + grey(0.75 + Math.abs(Math.sin(Math.atan2(p.z, p.x) * 22)) * 0.25))]);
}
// ウミキノコ: a leather coral — a stalk and a frilled cap (sways)
function leather() {
  const cap = new THREE.SphereGeometry(0.42, 32, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.25, 1);
  const pos = cap.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const rr = Math.hypot(v.x, v.z); pos.setY(i, v.y + Math.sin(Math.atan2(v.z, v.x) * 8) * 0.05 * (rr / 0.42) ** 2); }
  cap.computeVertexNormals();
  return assemble([
    part(new THREE.CylinderGeometry(0.1, 0.16, 0.36, 10).translate(0, 0.18, 0), '#a0a0a0'),
    part(cap, (p) => '#' + grey(Math.sin(p.x * 60) * Math.sin(p.z * 60) > 0.5 ? 0.85 : 1), { pos: [0, 0.36, 0] }),
  ]);
}
// ウミトサカ: a tree soft coral — short branches crowned with puffs of polyps (sways)
function softTree(seed) {
  const r = seeded(seed), parts = [part(tube([[0, 0, 0], [0.02, 0.18, 0], [0, 0.32, 0.02]], 0.07, 0.05, 6), '#c8c8c8')];
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.28, h = 0.2 + r() * 0.25, out = 0.1 + r() * 0.15;
    const tip = [Math.cos(a) * out, h + 0.15, Math.sin(a) * out];
    parts.push(part(tube([[0, h * 0.6, 0], [tip[0] * 0.6, h + 0.05, tip[2] * 0.6], tip], 0.035, 0.025, 4), '#d8d8d8'));
    parts.push(part(ellipsoid(0.09, 0.08, 0.09, 7), (p) => '#' + grey(Math.sin(p.x * 70 + p.y * 50) > 0.3 ? 1 : 0.85), { pos: tip }));
  }
  return assemble(parts);
}
// ウミウチワ: a sea fan — a flat lattice of branches in the XY plane (sways)
function seaFan(seed) {
  const r = seeded(seed), parts = [];
  const grow = (x, y, ang, len, rad, depth) => {
    const x2 = x + Math.sin(ang) * len, y2 = y + Math.cos(ang) * len;
    parts.push(part(tube([[x, y, 0], [(x + x2) / 2 + (r() - 0.5) * 0.03, (y + y2) / 2, 0], [x2, y2, 0]], rad, rad * 0.8, 4), shade(0.75, 1, 1.4)));
    if (depth === 0) return;
    grow(x2, y2, ang - 0.35 - r() * 0.2, len * 0.82, rad * 0.8, depth - 1);
    grow(x2, y2, ang + 0.35 + r() * 0.2, len * 0.82, rad * 0.8, depth - 1);
  };
  grow(0, 0, 0, 0.3, 0.035, 0);
  grow(0, 0.3, -0.5, 0.28, 0.03, 4);
  grow(0, 0.3, 0.5, 0.28, 0.03, 4);
  return assemble(parts);
}
// カイメン: a barrel sponge, or a bunch of tube sponges
function barrelSponge() {
  const outer = new THREE.LatheGeometry([[0.18, 0], [0.32, 0.25], [0.36, 0.55], [0.3, 0.7], [0.24, 0.7], [0.26, 0.5], [0.2, 0.2], [0, 0.18]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
  return assemble([part(outer, (p) => '#' + grey(p.y > 0.66 || Math.hypot(p.x, p.z) < 0.27 && p.y > 0.2 ? 0.55 : 0.9 + Math.sin(p.y * 40) * 0.08))]);
}
function tubeSponge(seed) {
  const r = seeded(seed), parts = [];
  for (let i = 0; i < 5; i++) {
    const a = r() * 6.28, d = r() * 0.15, h = 0.35 + r() * 0.45;
    parts.push(part(new THREE.CylinderGeometry(0.07, 0.08, h, 10, 1, true).translate(0, h / 2, 0), '#e8e8e8', { pos: [Math.cos(a) * d, 0, Math.sin(a) * d], rot: [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4] }));
    parts.push(part(new THREE.CircleGeometry(0.066, 10).rotateX(-Math.PI / 2).translate(0, h - 0.04, 0), '#555555', { pos: [Math.cos(a) * d, 0, Math.sin(a) * d], rot: [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4] }));
  }
  return assemble(parts);
}
// 岩 and サンゴ礫
function rock(seed) {
  const r = seeded(seed), g = new THREE.DodecahedronGeometry(0.5, 1);
  const pos = g.attributes.position, v = new THREE.Vector3(), a = r() * 9, b = r() * 9;
  // lumps from the position (not per vertex), so the faces that share a corner stay joined
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); v.multiplyScalar(0.88 + 0.14 * Math.sin(v.x * 7 + a) * Math.sin(v.z * 6 + b) + 0.06 * Math.sin(v.y * 9 + a)); if (v.y < 0) v.y *= 0.3; pos.setXYZ(i, v.x * 1.2, v.y * 0.7 + 0.08, v.z); }
  g.computeVertexNormals();
  return assemble([part(g.toNonIndexed(), shade(0.7, 0.95, 0.4))]);
}
function rubble(seed) {
  const r = seeded(seed), parts = [];
  for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = r() * 0.35; parts.push(part(new THREE.CapsuleGeometry(0.03, 0.12 + r() * 0.1, 2, 5), '#f0f0f0', { pos: [Math.cos(a) * d, 0.03, Math.sin(a) * d], rot: [Math.PI / 2, r() * 3, 0] })); }
  return assemble(parts);
}
function grassTuft(seed) {
  const r = seeded(seed), parts = [];
  for (let i = 0; i < 7; i++) { const h = 0.3 + r() * 0.25; parts.push(part(new THREE.PlaneGeometry(0.04, h, 1, 3).translate(0, h / 2, 0), shade(0.7, 1, 0.5), { pos: [(r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.12], rot: [0, r() * 3, 0] })); }
  return assemble(parts);
}

// ---------- the kinds: shape variants, colony colours, motion ----------
const C = (...hex) => hex.map((h) => new THREE.Color(h));
export const REEF_KINDS = {
  staghorn: { h: 0.9, ja: 'エダサンゴ', make: [11, 12, 13].map((s) => () => staghorn(s)), colors: C('#c48a4a', '#a3a84a', '#c9965a', '#a46ad0', '#d07ab0', '#d0a050') },
  table: { h: 0.6, side: THREE.DoubleSide, ja: 'テーブルサンゴ', make: [tableCoral], colors: C('#c9a85a', '#a8b050', '#c49a58', '#d8b86a') },
  brain: { h: 0.42, ja: 'ノウサンゴ', make: [brain], colors: C('#d8c070', '#b0c060', '#c99a5a', '#a8b878') },
  boulder: { h: 1.0, ja: 'ハマサンゴ', make: [1, 2, 3].map((s) => () => boulder(s)), colors: C('#d6c08a', '#c8ad7a', '#d2b880', '#bca98a') },
  foliose: { h: 0.8, side: THREE.DoubleSide, ja: '葉状サンゴ', make: [21, 22].map((s) => () => foliose(s)), colors: C('#a8783e', '#8a9a48', '#b8884a') },
  finger: { h: 0.5, ja: 'ユビエダハマサンゴ', make: [31, 32].map((s) => () => finger(s)), colors: C('#d8b060', '#b08ad0', '#c8b060') },
  mushroom: { h: 0.12, ja: 'クサビライシ', make: [mushroom], colors: C('#d0a858', '#a8c060', '#e0a878') },
  leather: { h: 0.55, ja: 'ウミキノコ', make: [leather], colors: C('#d8b860', '#b8d070', '#e0c878'), sway: { amp: 0.06, freq: 0.9, len: 0.6 } },
  softTree: { h: 0.6, ja: 'ウミトサカ', make: [41, 42].map((s) => () => softTree(s)), colors: C('#ff6f9a', '#b46ae8', '#ffc040', '#ff8a5a'), sway: { amp: 0.08, freq: 1.1, len: 0.5 } },
  seaFan: { h: 1.55, ja: 'ウミウチワ', make: [51, 52].map((s) => () => seaFan(s)), colors: C('#e8402a', '#ff7a2a', '#ffc83a', '#e0306a'), sway: { amp: 0.1, freq: 0.7, len: 1.5 }, side: THREE.DoubleSide },
  barrel: { h: 0.72, ja: 'カイメン（樽）', make: [barrelSponge], colors: C('#a04aa0', '#c8683a', '#7a58c0') },
  tubeSponge: { h: 0.85, ja: 'カイメン（管）', make: [61, 62].map((s) => () => tubeSponge(s)), colors: C('#a05ae8', '#ff8a3a', '#e8d040') },
  rock: { h: 0.5, ja: '岩', make: [71, 72, 73].map((s) => () => rock(s)), colors: C('#a8a294', '#9a9488', '#b5ae9e') },
  rubble: { h: 0.1, ja: 'サンゴ礫', make: [81, 82].map((s) => () => rubble(s)), colors: C('#e6e0d0', '#d8d2c2') },
  seagrass: { h: 0.6, ja: '海草', make: [91, 92].map((s) => () => grassTuft(s)), colors: C('#5f9a4a', '#6aa654', '#4f8a3f'), sway: { amp: 0.09, freq: 0.9, len: 0.5 }, side: THREE.DoubleSide },
};

// ---------- the builder: collect colonies, then draw each kind × shape as one instanced mesh ----------
export class Reef {
  // extras: shader injections (a world's caustics) · clip: clipping planes
  // top: the water surface (y) — nothing grows out of the water; colonies too tall for the depth are made smaller
  constructor({ extras = [], clip = null, seed = 7, top = null } = {}) { this.extras = extras; this.clip = clip; this.top = top; this.items = new Map(); this.rnd = seeded(seed); }
  // add one colony: kind, at (x, y, z), size, turned ry, colour (index or Color) and shape variant (random if not given)
  add(kind, x, y, z, { size = 1, ry = null, color = null, variant = null, tilt = 0 } = {}) {
    const K = REEF_KINDS[kind], r = this.rnd;
    if (this.top != null) { size = Math.min(size, (this.top - y - 0.18) / K.h); if (size < 0.3) return this; }
    const v = variant ?? Math.floor(r() * K.make.length);
    const key = kind + ':' + v;
    if (!this.items.has(key)) this.items.set(key, { kind, v, list: [] });
    const c = color instanceof THREE.Color ? color : K.colors[color ?? Math.floor(r() * K.colors.length)];
    this.items.get(key).list.push({ x, y, z, size, ry: ry ?? r() * 6.28, tilt, c: c.clone().offsetHSL(0, (r() - 0.5) * 0.06, (r() - 0.5) * 0.06) });
    return this;
  }
  build(parent) {
    const group = new THREE.Group();
    const o = new THREE.Object3D();
    const mats = new Map();
    for (const { kind, v, list } of this.items.values()) {
      const K = REEF_KINDS[kind];
      const geo = (K.geo ??= []) && (K.geo[v] ??= K.make[v]());
      const mkey = kind;
      if (!mats.has(mkey)) {
        const m = swimMaterial({ mode: 'sway', amp: K.sway?.amp ?? 0, freq: K.sway?.freq ?? 1, waves: 0.2, z0: 0, len: K.sway?.len ?? 1 }, { extras: this.extras, roughness: 0.85, side: K.side ?? THREE.FrontSide });
        if (this.clip) m.clippingPlanes = this.clip;
        mats.set(mkey, m);
      }
      const im = new THREE.InstancedMesh(geo, mats.get(mkey), list.length);
      if (K.sway) { // each colony sways in its own time
        im.geometry = geo.clone();
        im.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(Float32Array.from(list, (it) => it.x * 0.4 + it.z * 0.3), 1));
      }
      list.forEach((it, i) => {
        o.position.set(it.x, it.y, it.z);
        o.rotation.set(it.tilt, it.ry, 0, 'YXZ');
        o.scale.setScalar(it.size);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
        im.setColorAt(i, it.c);
      });
      im.castShadow = true; im.receiveShadow = true;
      im.userData = { kind: 'reef', reef: kind, count: list.length };
      group.add(im);
    }
    group.userData = { kind: 'reef', count: [...this.items.values()].reduce((a, it) => a + it.list.length, 0) };
    parent.add(group);
    return group;
  }
}

// a bommie: a boulder with corals growing on it (size ≈ its width / 2)
export function bommie(reef, x, y, z, size = 1, r = Math.random) {
  reef.add('boulder', x, y - 0.1 * size, z, { size, color: Math.floor(r() * 4) });
  const top = (a, d) => { const u = d * size; return [x + Math.cos(a) * u * 1.1, y + 0.15 * size + 0.75 * size * Math.sqrt(Math.max(0, 1 - d * d)), z + Math.sin(a) * u]; };
  const n = Math.round(3 + size * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * 0.85, [px, py, pz] = top(a, d);
    const pick = r();
    const kind = pick < 0.35 ? 'staghorn' : pick < 0.5 ? 'brain' : pick < 0.62 ? 'table' : pick < 0.74 ? 'softTree' : pick < 0.84 ? 'leather' : pick < 0.92 ? 'foliose' : 'tubeSponge';
    reef.add(kind, px, py - 0.05, pz, { size: (kind === 'table' ? 0.55 : 0.7) * (0.7 + r() * 0.5) * Math.min(1.2, size), tilt: d * 0.5 * (r() < 0.5 ? 1 : -1) });
  }
}

// Fill a seabed with reef. zoneAt(x, z) → 'lagoon' | 'flat' | 'crest' | 'slope' | null; ground(x, z) → y.
// avoid: [[x, z, r], …] spots to keep clear. Returns the bommie positions (where small fish gather).
export function reefScape(reef, { bounds, zoneAt, ground, avoid = [], density = 1, seed = 3 }) {
  const r = seeded(seed);
  const [x0, x1, z0, z1] = bounds;
  const free = (x, z, rad) => avoid.every(([ax, az, ar]) => Math.hypot(x - ax, z - az) > ar + rad);
  const spot = (x, z) => [x, ground(x, z), z];
  const bommies = [];
  const area = (x1 - x0) * (z1 - z0);
  for (let k = 0; k < area * 0.55 * density; k++) {
    const x = THREE.MathUtils.lerp(x0, x1, r()), z = THREE.MathUtils.lerp(z0, z1, r());
    const zone = zoneAt(x, z);
    if (!zone || !free(x, z, 0.6)) continue;
    const [, y] = spot(x, z), q = r();
    if (zone === 'lagoon') { // sparse: sand, seagrass, a few finger and mushroom corals, rubble
      if (q < 0.18) reef.add('seagrass', x, y, z, { size: 0.9 + r() * 0.6 });
      else if (q < 0.21) reef.add('finger', x, y, z, { size: 0.8 + r() * 0.6 });
      else if (q < 0.235) reef.add('mushroom', x, y, z, { size: 0.9 + r() * 0.5 });
      else if (q < 0.25) reef.add('rubble', x, y, z);
      else if (q < 0.255) reef.add('rock', x, y, z, { size: 0.6 + r() * 0.6 });
    } else if (zone === 'flat') { // the reef flat: bommies and colonies all over
      if (q < 0.035 && free(x, z, 2)) { const s = 0.8 + r() * 0.9; bommie(reef, x, y, z, s, r); bommies.push([x, z]); avoid.push([x, z, s * 1.4]); }
      else if (q < 0.25) reef.add('staghorn', x, y, z, { size: 0.8 + r() * 0.7 });
      else if (q < 0.31) reef.add('brain', x, y, z, { size: 0.7 + r() * 0.8 });
      else if (q < 0.35) reef.add('table', x, y + 0.02, z, { size: 0.7 + r() * 0.6 });
      else if (q < 0.4) reef.add('finger', x, y, z, { size: 0.9 + r() * 0.6 });
      else if (q < 0.44) reef.add('leather', x, y, z, { size: 0.8 + r() * 0.5 });
      else if (q < 0.48) reef.add('softTree', x, y, z, { size: 0.8 + r() * 0.6 });
      else if (q < 0.51) reef.add('foliose', x, y, z, { size: 0.8 + r() * 0.5 });
      else if (q < 0.53) reef.add('barrel', x, y, z, { size: 0.7 + r() * 0.6 });
      else if (q < 0.58) reef.add('rubble', x, y, z);
      else if (q < 0.61) reef.add('rock', x, y, z, { size: 0.5 + r() * 0.7 });
    } else if (zone === 'crest') { // the edge the waves hit: tables and low massive corals
      if (q < 0.18) reef.add('table', x, y + 0.02, z, { size: 1.0 + r() * 0.8 });
      else if (q < 0.3) reef.add('boulder', x, y - 0.1, z, { size: 0.5 + r() * 0.5 });
      else if (q < 0.38) reef.add('brain', x, y, z, { size: 0.8 + r() * 0.6 });
      else if (q < 0.44) reef.add('staghorn', x, y, z, { size: 0.7 + r() * 0.4 });
      else if (q < 0.5) reef.add('rock', x, y, z, { size: 0.6 + r() * 0.8 });
    } else if (zone === 'slope') { // the drop-off: sea fans across the current, soft corals, sponges, plates
      if (q < 0.1) reef.add('seaFan', x, y - 0.05, z, { size: 1.0 + r() * 0.8, ry: Math.PI / 2 + (r() - 0.5) * 0.6 });
      else if (q < 0.2) reef.add('softTree', x, y, z, { size: 1.0 + r() * 0.8 });
      else if (q < 0.27) reef.add('tubeSponge', x, y, z, { size: 1.0 + r() * 0.6 });
      else if (q < 0.33) reef.add('barrel', x, y, z, { size: 1.0 + r() * 0.8 });
      else if (q < 0.4) reef.add('foliose', x, y, z, { size: 1.0 + r() * 0.6, tilt: 0.3 });
      else if (q < 0.46) reef.add('rock', x, y, z, { size: 0.8 + r() * 1.0 });
    }
  }
  return bommies;
}

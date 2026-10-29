// Roads & towns — roadside nature (town/DESIGN.md §2.5). Plants are one merged shape drawn many times
// (InstancedMesh), bent in the vertex shader by the sea-life kit's "sway" — so a whole field is one draw call.
import * as THREE from 'three';
import { part, assemble, tube, seeded, swimMaterial, ellipsoid } from '../../sealife/src/kit.js';
import { mat, mesh } from '../../airport/src/parts.js';
import { TILE } from './roads.js';

// one cane plant: a jointed stalk and long arching leaves from the top third
let caneGeo = null;
function canePlant() {
  if (caneGeo) return caneGeo; // shared by every field
  const rnd = seeded(12);
  const parts = [];
  for (const [dx, dz, h] of [[0, 0, 2.5], [0.08, 0.05, 2.2], [-0.06, 0.07, 2.35]]) {
    parts.push(part(tube([[dx, 0, dz], [dx + 0.02, h * 0.5, dz], [dx + 0.05, h, dz + 0.02]], 0.035, 0.025, 5), (p) => (Math.sin(p.y * 9) > 0.93 ? '#a9b56a' : '#8fa65a')));
    for (let i = 0; i < 6; i++) {
      const a = rnd() * Math.PI * 2, y = h * (0.55 + i * 0.07), reach = 0.7 + rnd() * 0.5;
      const ca = Math.cos(a), sa = Math.sin(a);
      parts.push(part(tube([[dx, y, dz], [dx + ca * reach * 0.5, y + 0.35, dz + sa * reach * 0.5], [dx + ca * reach, y + 0.1, dz + sa * reach], [dx + ca * reach * 1.25, y - 0.35, dz + sa * reach * 1.25]], 0.035, 0.008, 3), i < 2 ? '#c2b56a' : '#6fa04c'));
    }
  }
  caneGeo = assemble(parts);
  return caneGeo;
}

// a field filling one tile (or w × d), rows along x; gusts of wind roll across it from −x
export function caneField({ w = TILE, d = TILE, rows = 0.9, step = 0.5, seed = 3 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'nature', nature: 'caneField' };
  // Okinawa's red soil, with furrows
  const soil = mat(0xa45a3c, { roughness: 1 });
  g.add(mesh(new THREE.BoxGeometry(w, 0.1, d), soil, 0, 0.05, 0));
  for (let z = -d / 2 + rows / 2; z < d / 2; z += rows) g.add(mesh(new THREE.BoxGeometry(w - 0.2, 0.08, 0.3), mat(0x8d4a30, { roughness: 1 }), 0, 0.12, z));
  const spots = [];
  const rnd = seeded(seed);
  for (let z = -d / 2 + rows / 2; z < d / 2; z += rows) for (let x = -w / 2 + step / 2; x < w / 2; x += step) {
    if (rnd() < 0.06) continue;
    spots.push([x + (rnd() - 0.5) * 0.15, z + (rnd() - 0.5) * 0.12, 0.8 + rnd() * 0.35, rnd() * 6.28]);
  }
  const m = swimMaterial({ mode: 'sway', amp: 0.28, freq: 1.25, waves: 0.18, z0: 0.3, len: 2.4 }, { roughness: 0.85 });
  const field = new THREE.InstancedMesh(canePlant(), m, spots.length);
  const geo = field.geometry = canePlant().clone(); // per-field geometry only for the phase attribute
  // the wind's phase follows x, so a gust visibly travels across the field; a little randomness per plant
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(Float32Array.from(spots, ([x, , , r]) => -x * 0.45 + r * 0.08), 1));
  const o = new THREE.Object3D();
  spots.forEach(([x, z, s, r], i) => { o.position.set(x, 0.1, z); o.rotation.set(0, r, 0); o.scale.set(1, s, 1); o.updateMatrix(); field.setMatrixAt(i, o.matrix); });
  field.castShadow = true;
  field.receiveShadow = true;
  g.add(field);
  // gusts: the sway grows and fades
  g.userData.update = (t) => { m.userData.swim.uAmp.value = 0.18 + 0.14 * Math.max(0, Math.sin(t * 0.35)) ** 2; };
  g.userData.count = spots.length;
  return g;
}

// ---------- the rest of the roadside nature (town/DESIGN.md §2.5) ----------
// Trees are merged shapes with vertex colours; rows and fields are instanced. Everything stands on y = 0.


const geoCache = new Map();
const once = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
const plain = new Map();
const vcMat = (sway) => { const k = JSON.stringify(sway); if (!plain.has(k)) plain.set(k, swimMaterial(sway, { roughness: 0.9 })); return plain.get(k); };
// one tree: a merged shape that sways a little at the top
export function treeMesh(key, build, sway = { mode: 'sway', amp: 0.06, freq: 0.9, waves: 0.15, z0: 1.5, len: 5 }) {
  const m = new THREE.Mesh(once(key, () => assemble(build())), vcMat(sway));
  m.castShadow = true; m.receiveShadow = true;
  m.userData = { kind: 'nature', nature: key, keep: true }; // keep: a building's bakeStatic must not merge it (it would lose its colours)
  return m;
}
export const leafy = (base, alt, k = 0.35) => (p) => (Math.sin(p.x * 7.1 + p.y * 5.3) * Math.sin(p.z * 6.7 - p.y * 3.1) > k ? alt : base);

// ヤシ: a curved trunk and a crown of drooping fronds
export function palm({ height = 6, lean = 0.5, seed = 1 } = {}) {
  return treeMesh('palm' + height + lean + seed, () => {
    const rnd = seeded(seed + 7);
    const top = [lean * 1.2, height, 0];
    const parts = [part(tube([[0, 0, 0], [lean * 0.2, height * 0.4, 0], [lean * 0.7, height * 0.8, 0], top], 0.2, 0.13, 7), (p) => (Math.sin(p.y * 9) > 0.6 ? '#8a6c4c' : '#9c7a55'))];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rnd() * 0.3, c = Math.cos(a), s = Math.sin(a), r = 2.2 + rnd() * 0.6;
      parts.push(part(tube([top, [top[0] + c * r * 0.4, top[1] + 0.45, top[2] + s * r * 0.4], [top[0] + c * r * 0.8, top[1] + 0.1, top[2] + s * r * 0.8], [top[0] + c * r, top[1] - 0.8, top[2] + s * r]], 0.16, 0.03, 3), i % 3 ? '#4f9a5a' : '#3f8a4c'));
    }
    for (let i = 0; i < 5; i++) parts.push(part(ellipsoid(0.12, 0.12, 0.12, 6), '#7a5a2a', { pos: [top[0] + Math.cos(i * 1.3) * 0.2, top[1] - 0.25, Math.sin(i * 1.3) * 0.2] }));
    return parts;
  }, { mode: 'sway', amp: 0.18, freq: 0.8, waves: 0.12, z0: height * 0.4, len: height });
}

// デイゴ: a spreading tree with bright red flowers (Okinawa's prefectural flower)
export function deigo({ seed = 2 } = {}) {
  return treeMesh('deigo' + seed, () => {
    const rnd = seeded(seed + 31);
    const parts = [part(tube([[0, 0, 0], [0.1, 1.4, 0], [0.2, 2.4, 0.1]], 0.28, 0.16, 7), '#7d6a58')];
    for (let i = 0; i < 4; i++) { const a = i * 1.6, c = Math.cos(a), s = Math.sin(a); parts.push(part(tube([[0.2, 2.2, 0.1], [c * 1.0, 3.0, s * 1.0], [c * 1.7, 3.5, s * 1.7]], 0.14, 0.06, 5), '#7d6a58')); }
    for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, r = rnd() * 1.6; parts.push(part(ellipsoid(1.1 + rnd() * 0.4, 0.7, 1.1, 10), leafy('#5e9a4a', '#d23a2a', 0.25), { pos: [Math.cos(a) * r, 3.4 + rnd() * 0.6, Math.sin(a) * r] })); }
    return parts;
  });
}

// ガジュマル: a wide banyan with aerial roots hanging down
export function gajumaru({ seed = 3, size = 1 } = {}) {
  const m = treeMesh('gajumaru' + seed, () => {
    const rnd = seeded(seed + 51);
    const parts = [];
    for (let i = 0; i < 5; i++) { const a = i * 1.26, c = Math.cos(a) * 0.35, s = Math.sin(a) * 0.35; parts.push(part(tube([[c, 0, s], [c * 0.6, 1.2, s * 0.6], [c * 2, 2.4, s * 2]], 0.22, 0.12, 6), '#8f8577')); }
    for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, r = 0.8 + rnd() * 1.8; parts.push(part(ellipsoid(1.4 + rnd() * 0.5, 0.9, 1.4, 10), leafy('#3f7d3f', '#2f6a35'), { pos: [Math.cos(a) * r, 3.0 + rnd() * 0.7, Math.sin(a) * r] })); }
    for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, r = 1.0 + rnd() * 2.0, x = Math.cos(a) * r, z = Math.sin(a) * r; parts.push(part(tube([[x, 2.6, z], [x + 0.05, 1.4, z], [x, 0.2 + rnd() * 0.8, z]], 0.03, 0.015, 3), '#9a8c78')); }
    return parts;
  });
  m.scale.setScalar(size);
  return m;
}

// 街路樹: a round street tree; bougainvillea: a magenta flowering bush
export function streetTree({ seed = 4 } = {}) {
  return treeMesh('streetTree' + seed, () => {
    const rnd = seeded(seed + 61);
    const parts = [part(tube([[0, 0, 0], [0, 1.4, 0], [0.05, 2.2, 0]], 0.1, 0.07, 6), '#7d6a58')];
    for (let i = 0; i < 5; i++) parts.push(part(ellipsoid(0.8, 0.75, 0.8, 10), leafy('#6aa654', '#5a9346'), { pos: [(rnd() - 0.5) * 0.9, 2.5 + rnd() * 0.6, (rnd() - 0.5) * 0.9] }));
    return parts;
  }, { mode: 'sway', amp: 0.05, freq: 0.9, waves: 0.1, z0: 1.4, len: 3 });
}
export function bougainvillea({ seed = 5 } = {}) {
  return treeMesh('bougainvillea' + seed, () => {
    const rnd = seeded(seed + 71);
    return Array.from({ length: 7 }, () => part(ellipsoid(0.55, 0.45, 0.55, 9), leafy('#d63a8a', '#4f8a3f', -0.2), { pos: [(rnd() - 0.5) * 1.4, 0.45 + rnd() * 0.6, (rnd() - 0.5) * 1.0] }));
  }, { mode: 'sway', amp: 0.03, freq: 1.1, waves: 0.1, z0: 0.3, len: 1.2 });
}

// a row of repeated plants along X (instanced): hedges, windbreaks, palm avenues
function row(geo, sway, length, spacing, { jitter = 0.15, scale = [0.85, 1.15], seed = 9 } = {}) {
  const n = Math.max(1, Math.floor(length / spacing));
  const m = new THREE.InstancedMesh(geo, vcMat(sway), n);
  m.geometry = geo.clone();
  const rnd = seeded(seed);
  m.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(Float32Array.from({ length: n }, (_, i) => i * 0.4 + rnd()), 1));
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { o.position.set(-length / 2 + (i + 0.5) * spacing + (rnd() - 0.5) * jitter, 0, (rnd() - 0.5) * jitter); o.rotation.y = rnd() * 6.28; o.scale.setScalar(THREE.MathUtils.lerp(scale[0], scale[1], rnd())); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
// 防風林 (モクマオウ): tall, thin, feathery trees in a line
export function windbreak({ length = 24 } = {}) {
  const geo = once('mokumao', () => assemble([part(tube([[0, 0, 0], [0, 3, 0], [0, 6, 0]], 0.12, 0.06, 5), '#7a6a5a'), ...[0, 1, 2, 3].map((i) => part(new THREE.ConeGeometry(0.9 - i * 0.15, 1.8, 7), leafy('#4f7a4a', '#5f8a55', 0), { pos: [0, 3.0 + i * 0.9, 0] }))]));
  const m = row(geo, { mode: 'sway', amp: 0.14, freq: 0.7, waves: 0.12, z0: 2, len: 6 }, length, 1.4);
  m.userData = { kind: 'nature', nature: 'windbreak' };
  return m;
}
// フクギの生け垣: a dense dark-green hedge of round-leaved trees
export function fukugiHedge({ length = 12, height = 3.2 } = {}) {
  const geo = once('fukugi' + height, () => assemble([part(tube([[0, 0, 0], [0, height * 0.5, 0]], 0.08, 0.06, 5), '#6f5f4f'), part(ellipsoid(0.55, height * 0.42, 0.55, 9), leafy('#2f5f34', '#3c7040', 0.1), { pos: [0, height * 0.55, 0] })]));
  const m = row(geo, { mode: 'sway', amp: 0.02, freq: 0.8, waves: 0.1, z0: 0.5, len: height }, length, 0.6, { jitter: 0.05 });
  m.userData = { kind: 'nature', nature: 'fukugiHedge' };
  return m;
}
// ヤシ並木
export function palmRow({ length = 24, spacing = 6 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'nature', nature: 'palmRow' };
  for (let x = -length / 2 + spacing / 2, i = 0; x < length / 2; x += spacing, i++) { const p = palm({ height: 5.5 + (i % 3) * 0.5, lean: 0.3 * (i % 2 ? 1 : -1), seed: i % 4 }); p.position.x = x; g.add(p); }
  return g;
}

// 畑（野菜）: rows of low leafy plants on red soil
export function vegField({ w = TILE, d = TILE, crop = 'cabbage' } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'nature', nature: 'vegField' };
  g.add(mesh(new THREE.BoxGeometry(w, 0.1, d), mat(0xa45a3c, { roughness: 1 }), 0, 0.05, 0));
  for (let z = -d / 2 + 0.5; z < d / 2; z += 1.0) g.add(mesh(new THREE.BoxGeometry(w - 0.4, 0.14, 0.55), mat(0x8d4a30, { roughness: 1 }), 0, 0.14, z));
  const geo = once('crop' + crop, () => assemble(crop === 'cabbage' ? [part(ellipsoid(0.24, 0.17, 0.24, 9), leafy('#9cc46a', '#7fae55', 0))] : [part(new THREE.ConeGeometry(0.15, 0.6, 5).translate(0, 0.3, 0), '#5f9a46')]));
  const spots = [];
  for (let z = -d / 2 + 0.5; z < d / 2; z += 1.0) for (let x = -w / 2 + 0.4; x < w / 2 - 0.2; x += 0.55) spots.push([x, z]);
  const m = new THREE.InstancedMesh(geo, mat(0xffffff, { vertexColors: true, roughness: 0.9 }), spots.length);
  const o = new THREE.Object3D();
  spots.forEach(([x, z], i) => { o.position.set(x, 0.2, z); o.rotation.y = i; o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.castShadow = true;
  g.add(m);
  return g;
}

// 田んぼ: water between low banks and rows of rice that sway (season: 'green' | 'gold')
export function ricePaddy({ w = TILE, d = TILE, season = 'green' } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'nature', nature: 'ricePaddy' };
  g.add(mesh(new THREE.BoxGeometry(w, 0.05, d), mat(0x6b5a44, { roughness: 1 }), 0, 0.025, 0));
  g.add(mesh(new THREE.PlaneGeometry(w - 0.6, d - 0.6).rotateX(-Math.PI / 2), mat(0x8fb4b4, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.8 }), 0, 0.12, 0));
  for (const [x, z, lw, ld] of [[0, d / 2 - 0.15, w, 0.3], [0, -d / 2 + 0.15, w, 0.3], [w / 2 - 0.15, 0, 0.3, d], [-w / 2 + 0.15, 0, 0.3, d]]) g.add(mesh(new THREE.BoxGeometry(lw, 0.3, ld), M_bank(), x, 0.15, z));
  const color = season === 'gold' ? '#d8b44a' : '#6fae4c';
  const geo = once('rice' + season, () => assemble([0, 1, 2, 3].map((i) => part(new THREE.ConeGeometry(0.03, 0.55, 3).translate(0, 0.27, 0), color, { pos: [Math.cos(i * 1.6) * 0.05, 0, Math.sin(i * 1.6) * 0.05], rot: [Math.cos(i) * 0.2, 0, Math.sin(i) * 0.2] }))));
  const spots = [];
  for (let z = -d / 2 + 0.6; z < d / 2 - 0.4; z += 0.35) for (let x = -w / 2 + 0.6; x < w / 2 - 0.4; x += 0.3) spots.push([x, z]);
  const m = new THREE.InstancedMesh(geo, vcMat({ mode: 'sway', amp: 0.08, freq: 1.2, waves: 0.1, z0: 0.05, len: 0.6 }), spots.length);
  m.geometry = geo.clone();
  m.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(Float32Array.from(spots, ([x]) => -x * 0.5), 1));
  const o = new THREE.Object3D();
  spots.forEach(([x, z], i) => { o.position.set(x, 0.1, z); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  g.add(m);
  return g;
}
const M_bank = () => mat(0x8fae6e, { roughness: 1 });

// 石垣: a dry-stone wall of irregular coral limestone (instanced stones), `length` along X
export function stoneWall({ length = 8, height = 1.3 } = {}) {
  const geo = once('stone', () => new THREE.DodecahedronGeometry(0.22, 0));
  const spots = [];
  const rnd = seeded(77);
  for (let y = 0.15; y < height; y += 0.3) for (let x = -length / 2 + 0.2; x < length / 2; x += 0.34) spots.push([x + (y * 3 % 2 ? 0.15 : 0) + (rnd() - 0.5) * 0.05, y, rnd()]);
  const m = new THREE.InstancedMesh(geo, mat(0xd8d0bf, { roughness: 1, flatShading: true }), spots.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  spots.forEach(([x, y, r], i) => { o.position.set(x, y, 0); o.rotation.set(r * 3, r * 5, r * 2); o.scale.set(0.9 + r * 0.3, 0.75, 0.8 + r * 0.4); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(0xd8d0bf).offsetHSL(0, 0, (r - 0.5) * 0.12)); });
  m.castShadow = true; m.receiveShadow = true;
  m.userData = { kind: 'nature', nature: 'stoneWall' };
  return m;
}

// 花ブロックの塀: a concrete block wall with a row of patterned (flower) blocks on top
const flowerTex = () => once('hanaTex', () => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#e9e4da'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#8f8a80';
  for (const [x, y] of [[16, 16], [48, 16], [16, 48], [48, 48]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
  g.fillRect(29, 4, 6, 56); g.fillRect(4, 29, 56, 6);
  g.strokeStyle = '#cfc9bd'; g.lineWidth = 3; g.strokeRect(1, 1, 62, 62);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
});
export function blockWall({ length = 8, height = 1.3, flowers = true } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'nature', nature: 'blockWall' };
  const solid = flowers ? height - 0.4 : height;
  g.add(mesh(new THREE.BoxGeometry(length, solid, 0.15), mat(0xdcd6cb, { roughness: 0.95 }), 0, solid / 2, 0));
  if (flowers) {
    const t = flowerTex().clone(); t.needsUpdate = true; t.repeat.set(length / 0.4, 1);
    g.add(mesh(new THREE.BoxGeometry(length, 0.4, 0.15), mat(0xffffff, { map: t, roughness: 0.9 }), 0, solid + 0.2, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(length + 0.04, 0.05, 0.19), mat(0xcfc9bd), 0, height + 0.02, 0));
  return g;
}

// 空き地・草むら: patchy grass with tufts and a few wild flowers
export function grassLot({ w = TILE, d = TILE, seed = 6 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'nature', nature: 'grassLot' };
  g.add(mesh(new THREE.BoxGeometry(w, 0.06, d), mat(0xa9c98a, { roughness: 1 }), 0, 0.03, 0));
  const geo = once('tuft', () => assemble([0, 1, 2, 3, 4].map((i) => part(new THREE.ConeGeometry(0.04, 0.4, 3).translate(0, 0.2, 0), i % 2 ? '#7fae55' : '#8fbf60', { pos: [Math.cos(i * 1.3) * 0.08, 0, Math.sin(i * 1.3) * 0.08], rot: [Math.cos(i) * 0.3, 0, Math.sin(i) * 0.3] }))));
  const rnd = seeded(seed), n = Math.round(w * d * 0.8);
  const m = new THREE.InstancedMesh(geo, vcMat({ mode: 'sway', amp: 0.05, freq: 1.3, waves: 0.1, z0: 0, len: 0.4 }), n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { o.position.set((rnd() - 0.5) * w, 0.05, (rnd() - 0.5) * d); o.scale.setScalar(0.6 + rnd() * 0.9); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
  g.add(m);
  return g;
}

// The Eixample: Barcelona's blocks of flats round the Sagrada Família (cafe/BARCELONA.md §3.1). A building is put
// together from storeys and bays: French windows with wooden shutters, iron balconies (one per window or running
// along the floor), a tribuna (an enclosed bay window) in the middle, string courses and a cornice, a roof terrace
// with its parapet, water tanks and washing. Six types set the colours and the details.
// Everything that repeats is drawn with instancing: a Facades collects where each piece goes (for one building, or for
// the whole city) and build() makes one InstancedMesh per piece and one merged mesh for all the walls.
// Conventions: a building's front faces +Z, x across its front from its middle, y = 0 at the pavement.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { part, assemble } from '../../sealife/src/kit.js';

export const BW = 2.3, GH = 3.4, EH = 2.2, FH = 2.8, DEPTH = 13; // bay width, ground floor, entresol, upper floors, depth

// ---------- the building types ----------
export const TYPES = {
  cream: { wall: '#e8dcc4', band: '#d4c3a3', shutter: '#5f7f5a', balcony: 'single', rail: 'straight', tribuna: 'wood', roof: 'tank' },
  ochre: { wall: '#d9b98a', band: '#c4a070', shutter: '#7a5a3a', balcony: 'long', rail: 'straight', tribuna: null, roof: 'laundry' },
  pink: { wall: '#e8c4b4', band: '#d4a898', shutter: '#6a7f8f', balcony: 'single', rail: 'curly', tribuna: null, roof: 'plants', pots: true },
  brick: { wall: '#b8674a', band: '#f0e6d6', shutter: '#5f7f5a', balcony: 'single', rail: 'straight', tribuna: null, roof: 'tank', frame: '#f0e6d6' },
  modernista: { wall: '#e6d6b8', band: '#c9a87c', shutter: '#4f6f7a', balcony: 'long', rail: 'curly', tribuna: 'stone', roof: 'gable', tiles: true },
  modern: { wall: '#f2f0ea', band: '#dedad2', shutter: null, balcony: 'long', rail: 'glass', tribuna: null, roof: 'plants' },
};
export const SHUTTERS = ['#5f7f5a', '#7a5a3a', '#6a7f8f', '#8a9a6a', '#2f3e57'];
export const AWNINGS = ['#b5452b', '#2f5a4a', '#c9a24a', '#3a4a6a', '#8a3a4a', '#e8dcc4'];

// ---------- the pieces (each made once, as one geometry with its colours) ----------
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (r0, r1, h, s = 8) => new THREE.CylinderGeometry(r0, r1, h, s);
const IRON = '#2a2a2c', STONE = '#d8cdb8', GLASS = '#3a4a5a', WOOD = '#7a5a3a', FRAME = '#f3ead8';
// an iron railing as a picture: bars, top and bottom rails (and scrolls), cut out by its alpha — one quad per face
function railTex(curly) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.strokeStyle = IRON; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 6); x.lineTo(256, 6); x.moveTo(0, 88); x.lineTo(256, 88); x.stroke();
  x.lineWidth = 3; x.beginPath(); for (let k = 8; k < 256; k += 16) { x.moveTo(k, 6); x.lineTo(k, 88); } x.stroke();
  if (curly) { x.lineWidth = 3; for (let k = 32; k < 256; k += 64) { x.beginPath(); x.arc(k, 47, 18, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(k, 47, 8, 0, Math.PI * 1.5); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const RAIL = { straight: new THREE.MeshStandardMaterial({ map: railTex(false), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }), curly: new THREE.MeshStandardMaterial({ map: railTex(true), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }) };
const quad = (w, x, z, ry = 0) => { const g = new THREE.PlaneGeometry(w, 0.86); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * w / 1.2); g.rotateY(ry); g.translate(x, 0.5, z); return g; };
function railGeo(w, z0, side) { const gs = [quad(w, 0, z0)]; if (side) for (const s of [-1, 1]) gs.push(quad(z0, s * w / 2, z0 / 2, Math.PI / 2)); return mergeGeometries(gs); }
function railing(w, kind, z0 = 0.5) { // only the glass kind is solid; the iron ones are the RAILS below
  if (kind !== 'glass') return [];
  return [part(B(w, 0.85, 0.03), '#bcd4dc', { pos: [0, 0.5, z0] }), part(B(w, 0.04, 0.05), '#c9ccd1', { pos: [0, 0.94, z0] })];
}
// the iron railings that go with each balcony (drawn with RAIL materials)
const RAILS = { balSingle: ['straight', 1.56, 0.56, true], balSingleC: ['curly', 1.56, 0.56, true], balLong: ['straight', BW, 0.72, false], balLongC: ['curly', BW, 0.72, false] };
const PIECES = {
  // a French window: a recess of dark glass, a pale frame, a stone lintel and sill (its base at y = 0, the floor)
  window: () => [part(B(1.0, 2.1, 0.05), GLASS, { pos: [0, 1.05, 0.02] }), part(B(1.16, 0.08, 0.1), FRAME, { pos: [0, 2.12, 0.05] }), ...[-0.54, 0.54].map((x) => part(B(0.08, 2.1, 0.1), FRAME, { pos: [x, 1.05, 0.05] })), part(B(0.04, 2.0, 0.06), FRAME, { pos: [0, 1.05, 0.05] }), part(B(1.4, 0.22, 0.14), STONE, { pos: [0, 2.32, 0.07] }), part(B(1.2, 0.1, 0.08), STONE, { pos: [0, 2.48, 0.05] })],
  windowB: () => [part(B(1.0, 2.1, 0.05), GLASS, { pos: [0, 1.05, 0.02] }), part(B(1.16, 0.08, 0.1), '#f0e6d6', { pos: [0, 2.12, 0.05] }), ...[-0.54, 0.54].map((x) => part(B(0.08, 2.1, 0.1), '#f0e6d6', { pos: [x, 1.05, 0.05] })), part(B(1.3, 0.16, 0.12), '#f0e6d6', { pos: [0, 2.26, 0.06] })], // (brick: white frames, no stone)
  small: () => [part(B(0.8, 1.1, 0.05), GLASS, { pos: [0, 0.55, 0.02] }), ...[-0.44, 0.44].map((x) => part(B(0.08, 1.1, 0.08), FRAME, { pos: [x, 0.55, 0.04] })), part(B(0.96, 0.08, 0.1), FRAME, { pos: [0, 1.12, 0.05] }), part(B(0.96, 0.08, 0.14), STONE, { pos: [0, -0.02, 0.07] })], // entresol and attic
  // balconies: a stone slab on two brackets, and its railing
  balSingle: () => [part(B(1.6, 0.12, 0.6), STONE, { pos: [0, -0.06, 0.3] }), ...[-0.6, 0.6].map((x) => part(B(0.1, 0.24, 0.4), STONE, { pos: [x, -0.24, 0.2] })), ],
  balSingleC: () => [part(B(1.6, 0.12, 0.6), STONE, { pos: [0, -0.06, 0.3] }), ...[-0.6, 0.6].map((x) => part(B(0.1, 0.24, 0.4), STONE, { pos: [x, -0.24, 0.2] })), ],
  balLong: () => [part(B(BW, 0.12, 0.75), STONE, { pos: [0, -0.06, 0.37] }), part(B(0.1, 0.24, 0.5), STONE, { pos: [0, -0.24, 0.25] }), ],
  balLongC: () => [part(B(BW, 0.12, 0.75), STONE, { pos: [0, -0.06, 0.37] }), part(B(0.1, 0.24, 0.5), STONE, { pos: [0, -0.24, 0.25] }), ],
  balLongG: () => [part(B(BW, 0.12, 0.85), '#e6e2da', { pos: [0, -0.06, 0.42] }), ...railing(BW, 'glass', 0.82)],
  balEnd: () => [part(B(0.04, 0.04, 0.72), IRON, { pos: [0, 0.92, 0.36] }), part(B(0.02, 0.8, 0.72), IRON, { pos: [0, 0.52, 0.36] })],
  // wooden shutters (white here; each instance takes its own colour): folded back, half shut (the top flap tilted out), shut
  shutOpen: () => [-0.82, 0.82].map((x) => part(B(0.5, 2.0, 0.04), '#ffffff', { pos: [x, 1.05, 0.05] })),
  shutHalf: () => [part(B(1.04, 1.25, 0.04), '#ffffff', { pos: [0, 0.68, 0.1] }), part(B(1.04, 0.75, 0.04), '#ffffff', { pos: [0, 1.62, 0.28], rot: [-0.55, 0, 0] })],
  shutShut: () => [-0.26, 0.26].map((x) => part(B(0.5, 2.06, 0.04), '#ffffff', { pos: [x, 1.05, 0.08] })),
  // a geranium box on a balcony
  pots: () => [part(B(0.9, 0.18, 0.2), '#c9714a', { pos: [0, 0.09, 0.42] }), ...[-0.3, 0, 0.3].map((x, i) => part(new THREE.SphereGeometry(0.14, 6, 4), i === 1 ? '#d2402e' : '#5f8f4a', { pos: [x, 0.26, 0.42] })), part(new THREE.SphereGeometry(0.08, 6, 4), '#e2a9a0', { pos: [-0.2, 0.36, 0.44] })],
  // the tribuna: a glazed bay three storeys high, of wood or of stone
  tribWood: () => { const p = [], h = FH * 3 - 0.4; p.push(part(B(1.9, h, 0.8), '#8a6a4a', { pos: [0, h / 2, 0.4] })); for (let f = 0; f < 3; f++) { p.push(part(B(1.7, 1.7, 0.04), GLASS, { pos: [0, f * FH + 1.2, 0.81] })); for (const x of [-0.42, 0, 0.42]) p.push(part(B(0.05, 1.7, 0.05), FRAME, { pos: [x, f * FH + 1.2, 0.83] })); p.push(part(B(1.96, 0.12, 0.86), '#6b4a35', { pos: [0, f * FH + 0.25, 0.42] })); } p.push(part(B(2.1, 0.2, 0.95), '#6b4a35', { pos: [0, h, 0.45] })); return p; },
  tribStone: () => { const p = [], h = FH * 3 - 0.4; p.push(part(B(2.0, h, 0.9), STONE, { pos: [0, h / 2, 0.45] })); for (let f = 0; f < 3; f++) { p.push(part(B(1.6, 1.8, 0.04), GLASS, { pos: [0, f * FH + 1.25, 0.91] })); for (const x of [-0.53, 0.53]) p.push(part(C(0.07, 0.07, 1.8, 6), '#c9b89c', { pos: [x, f * FH + 1.25, 0.95] })); p.push(part(new THREE.TorusGeometry(0.8, 0.07, 4, 12, Math.PI), '#c9b89c', { pos: [0, f * FH + 2.15, 0.93] })); } p.push(part(B(2.2, 0.3, 1.0), '#c9a87c', { pos: [0, h + 0.1, 0.5] })); return p; },
  // a band of coloured tiles under the cornice (modernista)
  tiles: () => { const p = [], cols = ['#3f8a9a', '#e8c46a', '#d96a4a', '#5f9a6a', '#f6f1e6']; for (let k = 0; k < 6; k++) p.push(part(B(BW / 6 - 0.02, 0.36, 0.04), cols[k % 5], { pos: [-BW / 2 + BW / 12 + k * BW / 6, 0, 0.03] })); return p; },
  // the roof: a parapet of stone balusters (one bay's worth), a water tank, a line of washing, pots of plants
  parapet: () => { const p = [part(B(BW, 0.12, 0.3), STONE, { pos: [0, 0.95, 0] }), part(B(BW, 0.12, 0.3), STONE, { pos: [0, 0.06, 0] })]; for (let x = -BW / 2 + 0.19; x < BW / 2; x += 0.38) p.push(part(B(0.12, 0.8, 0.12), STONE, { pos: [x, 0.5, 0] })); return p; },
  tank: () => [part(C(0.6, 0.6, 1.3, 12), '#9aa0a6', { pos: [0, 1.55, 0] }), ...[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([x, z]) => part(B(0.08, 0.9, 0.08), IRON, { pos: [x, 0.45, z] })), part(C(0.62, 0.62, 0.08, 12), '#7a8086', { pos: [0, 2.24, 0] })],
  laundry: () => { const p = [], cols = ['#f6f1e6', '#7fb6c4', '#e2a9a0', '#f2c94c', '#ffffff', '#5f7f9a']; for (const x of [-1.6, 1.6]) p.push(part(B(0.05, 1.7, 0.05), IRON, { pos: [x, 0.85, 0] })); p.push(part(B(3.2, 0.015, 0.015), '#d8d8d8', { pos: [0, 1.65, 0] })); for (let k = 0; k < 6; k++) p.push(part(B(0.32 + (k % 2) * 0.14, 0.42 + (k % 3) * 0.1, 0.02), cols[k], { pos: [-1.25 + k * 0.5, 1.4 - (k % 3) * 0.05, 0] })); return p; },
  plants: () => [part(B(1.0, 0.4, 0.4), '#c9714a', { pos: [0, 0.2, 0] }), part(new THREE.SphereGeometry(0.42, 7, 5), '#5f8f4a', { pos: [-0.2, 0.62, 0] }), part(new THREE.SphereGeometry(0.32, 7, 5), '#74ad58', { pos: [0.28, 0.58, 0.05] }), part(C(0.04, 0.05, 1.2, 5), '#6b4a35', { pos: [0.6, 0.6, 0] }), part(new THREE.SphereGeometry(0.4, 7, 5), '#4f7d45', { pos: [0.6, 1.3, 0] })],
  hut: () => [part(B(3.0, 2.4, 2.6), '#e0d6c4', { pos: [0, 1.2, 0] }), part(B(3.2, 0.15, 2.8), '#c9b89c', { pos: [0, 2.45, 0] }), part(B(0.9, 1.9, 0.05), WOOD, { pos: [0.6, 0.95, 1.31] })],
  // the ground floor between shops: the street door (an arched wooden portal), a shop shut behind its metal blind
  portal: () => [part(B(1.6, 2.6, 0.06), WOOD, { pos: [0, 1.3, 0.04] }), part(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), '#2a2a2c', { pos: [0, 2.6, 0.04] }), part(B(2.0, 0.25, 0.16), STONE, { pos: [0, 3.15, 0.08] }), ...[-0.9, 0.9].map((x) => part(B(0.2, 3.0, 0.16), STONE, { pos: [x, 1.5, 0.08] })), part(B(0.06, 0.25, 0.06), '#c9a24a', { pos: [0.5, 1.2, 0.09] })],
  blind: () => { const p = [part(B(2.0, 2.6, 0.05), '#9aa0a6', { pos: [0, 1.3, 0.04] }), part(B(2.1, 0.3, 0.25), '#7a8086', { pos: [0, 2.72, 0.1] })]; for (let y = 0.1; y < 2.6; y += 0.16) p.push(part(B(2.0, 0.02, 0.06), '#7a8086', { pos: [0, y, 0.06] })); p.push(part(B(1.0, 0.7, 0.06), '#d96a4a', { pos: [-0.2, 1.1, 0.07] }), part(B(0.6, 0.4, 0.06), '#3f8a9a', { pos: [0.5, 1.4, 0.075] })); return p; }, // (with a bit of colourful graffiti)
  // an ordinary shop front where no particular shop goes: a glazed front and a sign band, and its canvas awning
  vitrine: () => [part(B(2.0, 2.4, 0.06), GLASS, { pos: [0, 1.3, 0.04] }), part(B(2.1, 0.12, 0.12), '#2f3e3a', { pos: [0, 0.1, 0.07] }), ...[-1.0, 1.0, 0].map((x) => part(B(0.08, 2.5, 0.1), '#2f3e3a', { pos: [x, 1.25, 0.06] })), part(B(2.1, 0.45, 0.1), '#2f3e3a', { pos: [0, 2.85, 0.06] })],
  canopy: () => [part(B(2.1, 0.05, 0.9), '#ffffff', { pos: [0, 3.0, 0.5], rot: [0.35, 0, 0] }), part(B(2.1, 0.25, 0.03), '#ffffff', { pos: [0, 2.78, 0.93] })], // (its colour per instance)
  backWin: () => [part(B(0.8, 1.2, 0.06), '#4a5560', { pos: [0, 0.6, 0.02] })], // (onto the courtyard: just the window)
  // the name of the street on a corner: a white marble plate
  plaque: () => [part(B(0.9, 0.35, 0.04), '#f6f4ee', { pos: [0, 0, 0.02] }), part(B(0.7, 0.06, 0.05), '#2a2a2c', { pos: [0, 0.03, 0.03] }), part(B(0.5, 0.04, 0.05), '#2a2a2c', { pos: [0, -0.08, 0.03] })],
};
const geoCache = new Map(), railCache = new Map();
const pieceGeo = (k) => geoCache.get(k) ?? geoCache.set(k, assemble(PIECES[k]())).get(k);
const pieceMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
const LIT = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0 }); // windows lit at night (their opacity follows the dark)
export const setNight = (dark) => { LIT.opacity = Math.max(0, dark - 0.3) / 0.7; LIT.visible = LIT.opacity > 0.01; };

// ---------- the collector ----------
export class Facades {
  constructor() { this.pieces = new Map(); this.walls = []; this.lit = []; }
  put(kind, m, color = null) { (this.pieces.get(kind) ?? this.pieces.set(kind, []).get(kind)).push([m.clone(), color]); }
  wall(geo, color, m) { this.walls.push({ geo, color, m: m.clone() }); }
  build() {
    const g = new THREE.Group();
    for (const [kind, list] of this.pieces) {
      if (RAILS[kind]) { const [rk, w, z0, side] = RAILS[kind], rm = new THREE.InstancedMesh(railCache.get(kind) ?? railCache.set(kind, railGeo(w, z0, side)).get(kind), RAIL[rk], list.length); list.forEach(([m], i) => rm.setMatrixAt(i, m)); rm.castShadow = true; rm.userData.keep = true; rm.computeBoundingSphere(); g.add(rm); }
      const im = new THREE.InstancedMesh(pieceGeo(kind), pieceMat, list.length);
      list.forEach(([m, c], i) => { im.setMatrixAt(i, m); if (c) im.setColorAt(i, new THREE.Color(c)); else if (im.instanceColor || list.some((x) => x[1])) im.setColorAt(i, new THREE.Color(1, 1, 1)); });
      im.castShadow = true; im.receiveShadow = true; im.userData.keep = true;
      im.computeBoundingSphere(); g.add(im);
    }
    if (this.lit.length) { const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.96, 2.0).translate(0, 1.05, 0.06), LIT, this.lit.length); this.lit.forEach((m, i) => im.setMatrixAt(i, m)); im.userData.keep = true; im.computeBoundingSphere(); g.add(im); }
    if (this.walls.length) { const w = new THREE.Mesh(assemble(this.walls), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); w.castShadow = true; w.receiveShadow = true; w.userData.keep = true; g.add(w); }
    return g;
  }
}

// ---------- one building ----------
const rnd = (seed) => { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };
const _m = new THREE.Matrix4(), _l = new THREE.Matrix4();
// place: the building's own frame in the world (a Matrix4); bays across its front; floors above the entresol;
// ground: one entry per bay — 'shop' (left open for a shop front), 'portal', 'blind', or null (plain wall)
// upper: only the floors above the shop (the building stands on something else, like the café's own shell)
export function building(F, place, { type = 'cream', bays = 5, floors = 5, depth = DEPTH, seed = 1, ground = null, plaque = null, back = true, upper = false } = {}) {
  const T = TYPES[type], r = rnd(seed), w = bays * BW;
  const top = GH + EH + floors * FH, H = top + 0.6;
  const at = (x, y, z, ry = 0) => _m.multiplyMatrices(place, _l.makeRotationY(ry).setPosition(x, y, z));
  // the walls: the block itself, string courses over the ground floor and the entresol, a band at each floor, the cornice
  const y0 = upper ? GH : 0;
  F.wall(B(w, H - y0, depth), T.wall, at(0, (H + y0) / 2, -depth / 2));
  F.wall(B(w + 0.1, 0.35, 0.25), T.band, at(0, GH, 0.1));
  F.wall(B(w + 0.1, 0.22, 0.18), T.band, at(0, GH + EH, 0.08));
  for (let f = 1; f < floors; f++) F.wall(B(w, 0.1, 0.1), T.band, at(0, GH + EH + f * FH - 0.05, 0.05));
  F.wall(B(w + 0.5, 0.45, 0.7), T.band, at(0, top + 0.1, 0.2));
  if (type === 'brick') for (let x = -w / 2; x <= w / 2 + 0.01; x += BW) F.wall(B(0.35, top - GH, 0.08), '#a8573a', at(x, GH + (top - GH) / 2, 0.04)); // brick pilasters
  // the ground floor and the entresol
  const g = upper ? [] : ground ?? Array.from({ length: bays }, (_, i) => (i === Math.floor(bays / 2) ? 'portal' : r() < 0.5 ? 'blind' : 'shop'));
  const shops = [];
  g.forEach((k, i) => { const x = -w / 2 + BW / 2 + i * BW; if (k === 'shop') shops.push(x); else if (k) F.put(k, at(x, 0, 0)); });
  for (let i = 0; i < bays; i++) F.put('small', at(-w / 2 + BW / 2 + i * BW, GH + 0.5, 0));
  // the tribuna takes the middle bay of floors 1–3 (if the type has one and the front is wide enough)
  const mid = Math.floor(bays / 2), trib = T.tribuna && bays >= 3 ? mid : -1;
  if (trib >= 0) F.put(T.tribuna === 'wood' ? 'tribWood' : 'tribStone', at(-w / 2 + BW / 2 + trib * BW, GH + EH + 0.2, 0));
  // the floors: a window and its shutters in every bay, a balcony on each (or one along the floor)
  const winKind = type === 'brick' ? 'windowB' : 'window';
  for (let f = 0; f < floors; f++) {
    const y = GH + EH + f * FH, last = f === floors - 1;
    for (let i = 0; i < bays; i++) {
      if (i === trib && f < 3) continue;
      const x = -w / 2 + BW / 2 + i * BW;
      if (last && floors > 4) { F.put('small', at(x, y + 0.6, 0)); continue; } // the attic: small windows
      F.put(winKind, at(x, y, 0));
      if (r() < 0.22) F.lit.push(at(x, y, 0).clone());
      if (T.shutter) { const s = r(); F.put(s < 0.45 ? 'shutOpen' : s < 0.8 ? 'shutHalf' : 'shutShut', at(x, y, 0), r() < 0.85 ? T.shutter : SHUTTERS[Math.floor(r() * SHUTTERS.length)]); }
      if (T.balcony === 'long' && f < 2) F.put(T.rail === 'curly' ? 'balLongC' : T.rail === 'glass' ? 'balLongG' : 'balLong', at(x, y, 0));
      else F.put(T.rail === 'curly' ? 'balSingleC' : 'balSingle', at(x, y, 0));
      if (T.pots && r() < 0.6) F.put('pots', at(x, y, 0));
    }
    if (T.balcony === 'long' && f < 2) for (const s of [-1, 1]) F.put('balEnd', at(s * (w / 2 - 0.02), y, 0));
  }
  if (T.tiles) for (let i = 0; i < bays; i++) F.put('tiles', at(-w / 2 + BW / 2 + i * BW, top - 0.3, 0));
  // the roof
  for (let i = 0; i < bays; i++) F.put('parapet', at(-w / 2 + BW / 2 + i * BW, H, -0.2));
  if (T.roof === 'gable') { const gw = Math.min(w * 0.5, 7); F.wall(new THREE.CylinderGeometry(gw / 2, gw / 2, 0.5, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), T.wall, at(0, H + 0.2, -0.25)); F.put('tiles', at(0, H + gw / 4, 0)); }
  F.put('hut', at((r() - 0.5) * (w - 4), H, -depth / 2));
  if (T.roof === 'tank' || r() < 0.4) F.put('tank', at((r() - 0.5) * (w - 3), H, -depth * 0.3));
  if (T.roof === 'laundry' || r() < 0.3) F.put('laundry', at((r() - 0.5) * (w - 4), H, -depth * 0.7));
  if (T.roof === 'plants' || r() < 0.4) F.put('plants', at((r() - 0.5) * (w - 2), H, -1.2));
  if (plaque) F.put('plaque', at(plaque * (w / 2 - 0.7), GH + 0.9, 0));
  // the back, onto the courtyard: plain windows in rows (no shutters or balconies)
  if (back) for (let f = 0; f < floors + 1; f++) for (let i = 0; i < bays; i++) F.put('backWin', at(-w / 2 + BW / 2 + i * BW, GH + 0.5 + f * FH, -depth, Math.PI));
  return { w, H, shops };
}

// ---------- a row of buildings along a street ----------
// from (x0, z0), its fronts facing yaw, running len to the right (as you face them). shops: true → the shop slots are
// returned ({ x, z, yaw }) for the caller to fill; false → each gets an ordinary shop front with an awning.
export function row(F, { x0, z0, yaw, len, seed = 1, types = Object.keys(TYPES), floors = [4, 5, 6], shops = false }) {
  const r = rnd(seed), out = [], dir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const place = (x, z) => new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
  let left = Math.floor(len / BW), at = (len - left * BW) / 2; // whole bays, centred on the stretch
  while (left > 0) {
    let bays = Math.max(3, Math.round(3 + r() * 4)); if (left - bays < 3) bays = left; // (the last one takes what is left)
    const wd = bays * BW, mx = x0 + dir.x * (at + wd / 2), mz = z0 + dir.z * (at + wd / 2);
    const res = building(F, place(mx, mz), { type: types[Math.floor(r() * types.length)], bays, floors: floors[Math.floor(r() * floors.length)], seed: seed * 31 + Math.round(at) });
    for (const sx of res.shops) { const slot = { x: mx + dir.x * sx, z: mz + dir.z * sx, yaw }; if (shops) out.push(slot); else plainShop(F, slot, r); }
    at += wd; left -= bays;
  }
  return out;
}
export function plainShop(F, { x, z, yaw }, r = Math.random) { const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z); F.put('vitrine', m); F.put('canopy', m, AWNINGS[Math.floor(r() * AWNINGS.length)]); }

// ---------- a whole block: buildings round the edge of a chamfered square, a courtyard in the middle ----------
// cx, cz: its middle; w × d; cham: the cut corners. Returns where its shops can go: [{ x, z, yaw }] in the world.
export function block(F, { cx, cz, w, d, cham = 11, seed = 1, types = Object.keys(TYPES), floors = [4, 5, 6], shopsOn = ['n', 'e', 's', 'w'], skip = [] } = {}) {
  const r = rnd(seed), out = [];
  const sides = { // [start x, start z, direction yaw of the front, length]
    s: [cx - w / 2 + cham, cz + d / 2, 0, w - 2 * cham], e: [cx + w / 2, cz + d / 2 - cham, Math.PI / 2, d - 2 * cham],
    n: [cx + w / 2 - cham, cz - d / 2, Math.PI, w - 2 * cham], w: [cx - w / 2, cz - d / 2 + cham, -Math.PI / 2, d - 2 * cham],
  };
  const place = (x, z, yaw) => new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
  for (const [k, [x0, z0, yaw, len]] of Object.entries(sides)) if (!skip.includes(k)) out.push(...row(F, { x0, z0, yaw, len, seed: seed * 13 + k.charCodeAt(0), types, floors, shops: shopsOn.includes(k) }));
  // the four cut corners: one building each, facing out at 45°, a street plate on it
  const cl = cham * Math.SQRT2;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const mx = cx + sx * (w / 2 - cham / 2), mz = cz + sz * (d / 2 - cham / 2), yaw = Math.atan2(sx, sz);
    const bays = Math.max(3, Math.floor(cl / BW));
    const res = building(F, place(mx, mz, yaw), { type: types[Math.floor(r() * types.length)], bays, floors: 5, seed: seed * 7 + sx * 3 + sz, plaque: 1, ground: Array.from({ length: bays }, (_, i) => (i === 1 ? 'shop' : i === 0 ? 'portal' : 'blind')) });
    for (const s of res.shops) out.push({ x: mx + Math.cos(yaw) * s, z: mz - Math.sin(yaw) * s, yaw, corner: true });
  }
  return out;
}

// The Sagrada Família as it stands in 2026 (cafe/SAGRADA.md): the spire generator, the 14 built towers in their
// places, the body of the basilica (nave, transept, apse), and the Glory façade under construction with its cranes.
// Built in metres (the plan's 7.5 m grid), then scaled to the chibi world (1 m ≈ 0.76) by the caller.
// Axes: +X toward the Nativity façade (north-east), −X the Passion façade, +Z toward the Glory façade (the main
// entrance, south-east), −Z the apse (north-west). The crossing is at the origin; y = 0 is the street.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, box, cyl } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';

export const SAGRADA_SCALE = 0.76;
// stone: the old Nativity sandstone is darker; later work is paler; the tops are glazed ceramic and Venetian glass
export const STONE = {
  old: mat(0xa08868, { roughness: 0.95, flatShading: true }),
  new: mat(0xcfc2a8, { roughness: 0.9, flatShading: true }),
  pale: mat(0xe4dccb, { roughness: 0.85 }),
  white: mat(0xf4f2ec, { roughness: 0.35 }),
  dark: mat(0x4a3e34, { roughness: 1 }),
  slot: mat(0x6a5e52, { roughness: 1 }),
  glass: mat(0x8fb8d0, { roughness: 0.15, metalness: 0.3 }),
};
// Venetian glass and trencadís: a glittering tile texture (red, gold, white, green)
const mosaic = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const cols = ['#c8283a', '#d9a441', '#f4efe2', '#e8c060', '#b81e30', '#f6f1e6', '#3f8a5a', '#d8cfa0'];
  for (let r = 0; r < 16; r++) for (let k = 0; k < 16; k++) { x.fillStyle = cols[(r * 5 + k * 3 + ((r * k) % 3)) % cols.length]; x.fillRect(k * 8 + 1, r * 8 + 1, 7, 7); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
export const MOSAIC = new THREE.MeshStandardMaterial({ map: mosaic, roughness: 0.25, metalness: 0.25 });
const STAR = new THREE.MeshStandardMaterial({ color: 0xf6f8ff, emissive: 0xdfe8ff, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.92 });
export function setNight(k) { STAR.emissiveIntensity = 0.3 + k * 2.5; }

// a lathe around Y from [radius, height] pairs
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)), seg);
// a parabolic taper: radius r0 at y0 down to r1 at y1, curving like a parabola (Gaudí's catenary-parabolic towers)
const parabola = (r0, r1, y0, y1, n = 14, p = 1.7) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [r1 + (r0 - r1) * (1 - t ** p), y0 + (y1 - y0) * t]; });

// the bell openings: short dark slats climbing the shaft in spirals (merged into one geometry per tower)
function louvres(rAt, y0, y1, { rows = 4, step = 2.0, w = 0.45, h = 1.1 } = {}) {
  const parts = [], g = new THREE.BoxGeometry(w, h, 0.6);
  for (let k = 0; k < rows; k++) for (let y = y0; y < y1; y += step) {
    const a = (k / rows) * Math.PI * 2 + (y - y0) * 0.09; // the spiral
    const r = rAt(y) - 0.15, m = new THREE.Matrix4().makeRotationY(-a).setPosition(Math.cos(a) * r, y, Math.sin(a) * r);
    parts.push(g.clone().applyMatrix4(m));
  }
  return mergeGeometries(parts);
}

// ---------- an apostle's bell tower (Nativity / Passion): a square foot in the façade, then a round parabolic shaft
// with spiral openings and a band of lettering, crowned by a glittering bishop's-mitre pinnacle ----------
// h: total height · r: shaft radius at its foot · foot: where the round shaft leaves the façade · plan 'circle'|'ellipse'
export function apostleTower({ h = 100, r = 3.6, foot = 0.3, stone = STONE.old, plan = 'circle' } = {}) {
  const g = new THREE.Group();
  const y0 = h * foot, yTop = h * 0.8; // shaft from the façade to where the pinnacle begins
  g.add(box(r * 2.3, y0, r * 2.3, stone, 0, y0 / 2, 0)); // the square foot (hidden in the façade)
  const prof = parabola(r, r * 0.42, y0, yTop);
  const shaft = mesh(lathe(prof, 24), stone);
  const rAt = (y) => { const t = (y - y0) / (yTop - y0); return r * 0.42 + (r - r * 0.42) * (1 - t ** 1.7); };
  const lv = mesh(louvres(rAt, y0 + 3, yTop - 4), STONE.dark);
  if (plan === 'ellipse') { shaft.scale.set(1, 1, 0.82); lv.scale.set(1, 1, 0.82); }
  g.add(shaft, lv);
  g.add(mesh(new THREE.TorusGeometry(rAt(h * 0.62) + 0.1, 0.35, 6, 24).rotateX(Math.PI / 2), STONE.pale, 0, h * 0.62, 0)); // the lettering band
  // the pinnacle: a ribbed spindle in mosaic, a ring, the mitre, a cross of white balls
  const py = yTop, ph = h - yTop, pr = r * 0.42;
  g.add(mesh(lathe([[pr, 0], [pr * 1.25, ph * 0.18], [pr * 0.9, ph * 0.42], [pr * 0.55, ph * 0.62], [0.2, ph * 0.66]].map(([a, b]) => [a, b + py]), 12), MOSAIC));
  g.add(mesh(new THREE.TorusGeometry(pr * 0.95, 0.3, 6, 16).rotateX(Math.PI / 2), MOSAIC, 0, py + ph * 0.24, 0)); // the ring
  for (const s of [1, -1]) { const tri = new THREE.Shape([new THREE.Vector2(-pr * 0.7, 0), new THREE.Vector2(pr * 0.7, 0), new THREE.Vector2(0, ph * 0.28)]); const m = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.4, bevelEnabled: false }), MOSAIC, 0, py + ph * 0.62, s * 0.2 - 0.2); m.rotation.y = s > 0 ? 0 : Math.PI / 2; g.add(m); } // the mitre, two crossed points
  const ball = new THREE.SphereGeometry(0.75, 10, 8);
  for (const [x, y, z] of [[0, ph * 0.98, 0], [0.9, ph * 0.9, 0], [-0.9, ph * 0.9, 0], [0, ph * 0.9, 0.9], [0, ph * 0.9, -0.9]]) g.add(mesh(ball, STONE.white, x, py + y, z));
  g.userData = { kind: 'tower', tower: 'apostle', h };
  return g;
}

// ---------- an evangelist's tower (135 m): ribbed stone shaft with tall openings, its symbol on top ----------
// symbol: 'man' (Matthew) | 'lion' (Mark) | 'bull' (Luke) | 'eagle' (John)
export function evangelistTower({ h = 135, r = 5.2, symbol = 'man' } = {}) {
  const g = new THREE.Group();
  const yTop = h * 0.86;
  const prof = parabola(r, r * 0.45, 0, yTop, 16, 2.0);
  g.add(mesh(lathe(prof, 8), STONE.new)); // eight-sided
  const rAt = (y) => { const t = y / yTop; return r * 0.45 + (r - r * 0.45) * (1 - t ** 2); };
  // vertical ribs and tall window slots between them
  const ribs = [], slots = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    for (let y = 46; y < yTop - 6; y += 8) { const rr = rAt(y); ribs.push(new THREE.BoxGeometry(0.6, 8, 0.7).applyMatrix4(new THREE.Matrix4().makeRotationY(-a).setPosition(Math.cos(a) * rr, y + 4, Math.sin(a) * rr))); const b = a + Math.PI / 8; slots.push(new THREE.BoxGeometry(rr * 0.22, 3.6, 0.5).applyMatrix4(new THREE.Matrix4().makeRotationY(-b + Math.PI / 2).setPosition(Math.cos(b) * (rr - 0.15), y + 4, Math.sin(b) * (rr - 0.15)))); }
  }
  g.add(mesh(mergeGeometries(ribs), STONE.pale), mesh(mergeGeometries(slots), STONE.slot));
  // the upper third glazed white, like the central tower
  g.add(mesh(lathe(parabola(rAt(yTop * 0.72) + 0.05, r * 0.45 + 0.05, yTop * 0.72, yTop, 8, 2.0), 8), STONE.white));
  // the crown: a white glazed tip and the symbol (simplified)
  g.add(mesh(lathe([[r * 0.45, 0], [r * 0.6, 3], [r * 0.4, 8], [0.4, h - yTop - 5]].map(([a, b]) => [a, b + yTop]), 12), STONE.white));
  const sy = h - 4.5, gold = mat(0xd9b860, { metalness: 0.5, roughness: 0.35 }), w = STONE.white;
  const sym = new THREE.Group(); sym.position.y = sy;
  if (symbol === 'eagle' || symbol === 'man') for (const s of [1, -1]) { const wing = mesh(new THREE.SphereGeometry(1, 10, 6), w, s * 1.8, 0.5, 0); wing.scale.set(2.2, 0.35, 0.9); wing.rotation.z = s * 0.45; sym.add(wing); } // wings
  if (symbol === 'man') { sym.add(mesh(new THREE.CapsuleGeometry(0.9, 2.2, 4, 8), w, 0, 0.6, 0)); sym.add(mesh(new THREE.SphereGeometry(0.75, 10, 8), w, 0, 2.6, 0)); }
  if (symbol === 'eagle') { sym.add(mesh(new THREE.SphereGeometry(1.1, 10, 8), w, 0, 0.6, 0)); sym.add(mesh(new THREE.ConeGeometry(0.4, 1.2, 6).rotateZ(-Math.PI / 2), gold, 1.4, 1.2, 0)); }
  if (symbol === 'lion') { const b = mesh(new THREE.SphereGeometry(1.3, 10, 8), gold, 0, 0.6, 0); b.scale.set(1.5, 1, 1); sym.add(b); sym.add(mesh(new THREE.SphereGeometry(1.0, 10, 8), gold, 1.6, 1.4, 0)); for (const s of [1, -1]) { const wing = mesh(new THREE.SphereGeometry(1, 10, 6), w, -0.4, 1.6, s * 1.3); wing.scale.set(1.4, 0.3, 1.2); sym.add(wing); } }
  if (symbol === 'bull') { const b = mesh(new THREE.SphereGeometry(1.3, 10, 8), mat(0xc9a07a, { roughness: 0.5 }), 0, 0.6, 0); b.scale.set(1.6, 1, 1); sym.add(b); sym.add(mesh(new THREE.SphereGeometry(0.9, 10, 8), mat(0xc9a07a), 1.8, 1.0, 0)); for (const s of [1, -1]) sym.add(mesh(new THREE.ConeGeometry(0.2, 0.9, 6), w, 2.0, 1.9, s * 0.6)); for (const s of [1, -1]) { const wing = mesh(new THREE.SphereGeometry(1, 10, 6), w, -0.4, 1.6, s * 1.3); wing.scale.set(1.4, 0.3, 1.2); sym.add(wing); } }
  g.add(sym);
  g.userData = { kind: 'tower', tower: 'evangelist', symbol, h };
  return g;
}

// ---------- the Virgin Mary's tower (138 m) over the apse: ribbed shaft, a crown, the twelve-pointed glass star ----------
export function maryTower({ h = 138, r = 6.2 } = {}) {
  const g = evangelistTower({ h: h - 8, r, symbol: 'none' });
  g.children.at(-1).removeFromParent(); // (no symbol)
  // the star: twelve points, one on each corner of an icosahedron, 7.5 m across
  const ico = new THREE.IcosahedronGeometry(1, 0), p = ico.attributes.position, dirs = [];
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize(); if (!dirs.some((d) => d.distanceTo(v) < 0.01)) dirs.push(v); }
  const spikes = dirs.map((d) => new THREE.ConeGeometry(0.75, 3.2, 6).translate(0, 1.6 + 0.8, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)));
  spikes.push(new THREE.IcosahedronGeometry(1.4, 0));
  const star = mesh(mergeGeometries(spikes.map((s) => (s.index ? s.toNonIndexed() : s))), STAR, 0, h - 4, 0);
  star.userData.keep = true;
  g.add(star);
  g.userData = { kind: 'tower', tower: 'mary', h, star };
  return g;
}

// ---------- Jesus Christ's tower (172.5 m) over the crossing: the tallest; its top clad in white glazed ceramic and
// glass, crowned by a 17 m cross with arms in four directions ----------
export function jesusTower({ h = 172.5, r = 9.5 } = {}) {
  const g = new THREE.Group();
  const crossH = 17, yW = h - crossH - 38, yTop = h - crossH; // the white upper part from yW to yTop
  g.add(mesh(lathe(parabola(r, r * 0.55, 0, yW, 16, 1.6), 8), STONE.new));
  g.add(mesh(lathe(parabola(r * 0.55, 1.2, yW, yTop, 16, 1.4), 8), STONE.white));
  // vertical glass strips on the white part, and ribs on the stone part
  const strips = [];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; for (let y = yW + 2; y < yTop - 6; y += 5) { const t = (y - yW) / (yTop - yW), rr = 1.2 + (r * 0.55 - 1.2) * (1 - t ** 1.4); strips.push(new THREE.BoxGeometry(0.5, 4, 0.5).applyMatrix4(new THREE.Matrix4().makeRotationY(-a).setPosition(Math.cos(a) * rr, y + 2, Math.sin(a) * rr))); } }
  g.add(mesh(mergeGeometries(strips), STONE.glass));
  const ribs = [];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; for (let y = 60; y < yW - 4; y += 8) { const t = y / yW, rr = r * 0.55 + (r - r * 0.55) * (1 - t ** 1.6); ribs.push(new THREE.BoxGeometry(0.7, 8, 0.8).applyMatrix4(new THREE.Matrix4().makeRotationY(-a).setPosition(Math.cos(a) * rr, y + 4, Math.sin(a) * rr))); } }
  g.add(mesh(mergeGeometries(ribs), STONE.pale));
  // the cross: an upright and four arms, square in section, white with glass faces
  const cy = yTop, cross = new THREE.Group(); cross.position.y = cy;
  cross.add(box(2.2, crossH, 2.2, STONE.white, 0, crossH / 2, 0));
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cross.add(box(x ? 6 : 2.2, 2.2, z ? 6 : 2.2, STONE.white, x * 3.5, crossH * 0.62, z * 3.5));
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cross.add(box(x ? 5.6 : 0.4, 1.4, z ? 5.6 : 0.4, STONE.glass, x * 3.6, crossH * 0.62, z * 3.6));
  g.add(cross);
  g.userData = { kind: 'tower', tower: 'jesus', h };
  return g;
}

// ---------- the basilica, as built in 2026 ----------
// plan (metres, interior): nave 5 aisles x ±22.5 from the crossing to the Glory front (+Z), transept 3 aisles z ±15
// out to the Nativity (+X) and Passion (−X) fronts, apse to −Z with its ambulatory of seven chapels.
export const PLAN = { naveHalf: 22.5, transHalf: 15, nativityX: 30, passionX: -30, gloryZ: 52, apseZ: -38, crossing: 7.5 };
export function basilica() {
  const g = new THREE.Group();
  const S = STONE.new, O = STONE.old;
  const { naveHalf: nh, transHalf: th, nativityX: nx, passionX: px, gloryZ: gz, apseZ: az } = PLAN;
  // the body: side aisles to 30 m, the central vessel higher, with a stepped roof
  const block = (x0, x1, z0, z1, y, m) => g.add(box(x1 - x0, y, z1 - z0, m, (x0 + x1) / 2, y / 2, (z0 + z1) / 2));
  block(-nh, nh, th, gz - 6, 30, S); // nave (side aisles' height)
  block(-7.5, 7.5, th, gz - 6, 46, S); // central nave
  block(px + 3, nx - 3, -th, th, 30, S); // transept
  block(px + 3, nx - 3, -7.5, 7.5, 46, S); // central transept
  block(-nh, nh, -th - 6, th, 46, S); // around the crossing
  // the nave's roof: a long gable over the central vessel, and the clerestory windows
  const roofG = new THREE.CylinderGeometry(7.6, 7.6, gz - 6 - th, 4, 1, false, Math.PI / 4).rotateX(Math.PI / 2).scale(1, 0.9, 1);
  g.add(mesh(roofG, S, 0, 46, (th + gz - 6) / 2));
  const roofT = new THREE.CylinderGeometry(7.6, 7.6, nx - px - 6, 4, 1, false, Math.PI / 4).rotateZ(Math.PI / 2).scale(1, 0.9, 1);
  g.add(mesh(roofT, S, 0, 46, 0));
  // tall windows along the sides (dark, with a hint of colour inside)
  const win = [], winM = mat(0x3a4a5a, { roughness: 0.3, emissive: 0x6a5030, emissiveIntensity: 0.15 });
  for (let z = th + 4; z < gz - 8; z += 7.5) for (const s of [1, -1]) { win.push(new THREE.BoxGeometry(0.4, 14, 3.6).translate(s * (nh + 0.05), 14, z)); win.push(new THREE.BoxGeometry(0.4, 10, 3.2).translate(s * 7.55, 38, z)); }
  g.add(mesh(mergeGeometries(win), winM));
  // fruit pinnacles along the tops of the nave walls: baskets of coloured fruit on stone stems
  const fruitCols = [0xd9482b, 0xe8a030, 0x8fb04a, 0xc8283a, 0xf2c94c, 0x9a5ab8];
  const fr = fruitCols.map(() => []);
  let k = 0;
  for (let z = th + 3.75; z < gz - 7; z += 7.5) for (const s of [1, -1]) {
    const x = s * nh;
    g.add(cyl(0.8, 1.2, 6, S, x, 33, z, 8));
    for (let j = 0; j < 5; j++) { const a = j * 1.3; fr[(k + j) % fr.length].push(new THREE.SphereGeometry(0.75, 8, 6).translate(x + Math.cos(a) * 0.7, 36.6 + (j % 2) * 0.6, z + Math.sin(a) * 0.7)); }
    k++;
  }
  fr.forEach((list, i) => list.length && g.add(mesh(mergeGeometries(list), mat(fruitCols[i], { roughness: 0.3, metalness: 0.2 }))));
  // the apse: a half-round wall, seven chapel bulges, a row of small pinnacles
  const ac = -th - 6, ar = 15;
  g.add(mesh(new THREE.CylinderGeometry(ar, ar, 40, 24, 1, false, Math.PI / 2, Math.PI), O, 0, 20, ac));
  for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + ((i + 0.5) / 7) * Math.PI; g.add(cyl(3.2, 3.6, 22, O, Math.sin(a) * (ar + 1.2), 11, ac + Math.cos(a) * (ar + 1.2), 10)); g.add(mesh(new THREE.ConeGeometry(1.4, 9, 8), O, Math.sin(a) * (ar + 1.2), 26.5, ac + Math.cos(a) * (ar + 1.2))); }
  // two sacristies at the corners by the apse: domed, with a pinnacle
  for (const s of [1, -1]) { g.add(cyl(7, 7.5, 24, S, s * 27, 12, -30, 12)); g.add(mesh(new THREE.ConeGeometry(7.2, 16, 12), S, s * 27, 32, -30)); g.add(mesh(new THREE.SphereGeometry(1.2, 10, 8), MOSAIC, s * 27, 41, -30)); }
  // the cloister: a low covered walk right round the building
  const cl = (x0, x1, z0, z1) => g.add(box(Math.abs(x1 - x0) || 3, 7, Math.abs(z1 - z0) || 3, S, (x0 + x1) / 2, 3.5, (z0 + z1) / 2));
  cl(px - 6, nx + 6, az - 8, az - 8); cl(px - 6, px - 6, az - 8, gz - 4); cl(nx + 6, nx + 6, az - 8, gz - 4);
  // the transept fronts (placeholders until the façades are modelled): the Nativity in old dark stone, the Passion pale
  block(nx - 3, nx + 3, -th - 6, th + 6, 34, O);
  block(px - 3, px + 3, -th - 6, th + 6, 34, STONE.pale);
  bakeStatic(g);
  g.userData = { kind: 'basilica' };
  return g;
}
// the towers in their places (2026: 14 of 18)
export function towers() {
  const g = new THREE.Group();
  const { nativityX: nx, passionX: px } = PLAN;
  // Nativity (north-east): Barnabas, Simon, Jude, Matthias — the outer pair taller (≈107 m), the inner ≈98.5 m
  [[-17.5, 107, 'マティア'], [-6, 98.5, 'ユダ'], [6, 98.5, 'シモン'], [17.5, 107, 'バルナバ']].forEach(([z, h, name]) => { const t = apostleTower({ h, r: 3.6, stone: STONE.old }); t.position.set(nx + 1.5, 0, z); t.userData.name = name; g.add(t); });
  // Passion (west / south-west): James the Less, Bartholomew, Thomas, Philip — elliptical plan, paler stone
  [[-17.5, 112, 'ヤコブ（小）'], [-6, 107, 'バルトロマイ'], [6, 107, 'トマス'], [17.5, 112, 'フィリポ']].forEach(([z, h, name]) => { const t = apostleTower({ h, r: 3.6, stone: STONE.new, plan: 'ellipse' }); t.position.set(px - 1.5, 0, z); t.userData.name = name; g.add(t); });
  // the four evangelists around the crossing, Mary over the apse, Jesus in the middle
  [[-1, 1, 'man'], [1, 1, 'lion'], [-1, -1, 'bull'], [1, -1, 'eagle']].forEach(([sx, sz, symbol]) => { const t = evangelistTower({ symbol }); t.position.set(sx * 11, 0, sz * 11); g.add(t); });
  const mary = maryTower(); mary.position.set(0, 0, -24); g.add(mary);
  g.add(jesusTower());
  g.userData = { kind: 'towers', mary };
  return g;
}
// the Glory façade in 2026: a raised base, the start of its columns, scaffolding, tower cranes turning slowly
export function gloryWorks() {
  const g = new THREE.Group(), S = STONE.pale;
  const { naveHalf: nh, gloryZ: gz } = PLAN;
  g.add(box(nh * 2 + 8, 5, 14, S, 0, 2.5, gz + 1)); // the raised porch floor (about 5 m above the street)
  for (let i = 0; i < 7; i++) g.add(cyl(1.4, 1.8, 14 + (i % 3) * 4, S, -18 + i * 6, 5 + 7 + (i % 3) * 2, gz + 4, 10)); // the seven columns, rising
  g.add(box(nh * 2 - 6, 30, 1.5, S, 0, 15 + 5, gz - 5.5)); // the inner front wall
  const scaffold = mat(0x8a8f96, { metalness: 0.4, roughness: 0.5 }), tube = [];
  for (let x = -nh; x <= nh; x += 3) for (let y = 5; y < 34; y += 3) tube.push(new THREE.BoxGeometry(0.15, 3, 0.15).translate(x, y + 1.5, gz + 7.5));
  for (let y = 5; y < 34; y += 3) tube.push(new THREE.BoxGeometry(nh * 2, 0.15, 0.15).translate(0, y, gz + 7.5));
  g.add(mesh(mergeGeometries(tube), scaffold));
  // the cranes: a lattice mast and a long jib, slewing slowly
  const yellow = mat(0xe8b830, { roughness: 0.6 }), cranes = [];
  for (const [x, z, h, ph] of [[-30, gz + 12, 95, 0], [26, gz - 2, 110, 2]]) {
    const c = new THREE.Group(); c.position.set(x, 0, z);
    c.add(box(2.2, h, 2.2, yellow, 0, h / 2, 0));
    const jib = new THREE.Group(); jib.position.y = h;
    jib.add(box(48, 1.6, 1.6, yellow, 14, 0, 0)); jib.add(box(12, 3, 3, mat(0x7a7f86), -12, -1, 0)); jib.add(box(2, 6, 2, yellow, 0, 3, 0));
    jib.add(cyl(0.05, 0.05, 30, mat(0x2a2a2c), 30, -15, 0, 4)); jib.add(box(2.5, 1.5, 2.5, mat(0x2a2a2c), 30, -30, 0));
    jib.userData.dynamic = true; jib.rotation.y = ph; c.add(jib); g.add(c); cranes.push(jib);
  }
  bakeStatic(g);
  g.userData = { kind: 'gloryWorks', update: (t, dt = 0) => cranes.forEach((j, i) => { j.rotation.y += dt * (i ? -0.02 : 0.025); }) };
  return g;
}

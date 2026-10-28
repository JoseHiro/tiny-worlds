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
// the Nativity's weathered sandstone: warm ochre, darker in the crevices, with streaks running down (it repeats)
const nativityTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#a58c68'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const v = 52 + ((i * 37) % 23); x.fillStyle = `hsla(34, 24%, ${v}%, 0.35)`; x.beginPath(); x.arc((i * 73) % 256, (i * 151) % 256, 2 + (i % 5), 0, 7); x.fill(); }
  for (let i = 0; i < 70; i++) { const px = (i * 97) % 256, py = (i * 53) % 256, len = 20 + (i % 7) * 12; const gr = x.createLinearGradient(0, py, 0, py + len); gr.addColorStop(0, 'rgba(60,45,30,0.45)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); x.fillStyle = gr; x.fillRect(px, py, 2 + (i % 3), len); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 6); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
export const NATIVITY = new THREE.MeshStandardMaterial({ map: nativityTex, roughness: 0.95, flatShading: true });
export const MOSAIC = new THREE.MeshStandardMaterial({ map: mosaic, roughness: 0.25, metalness: 0.25 });
const STAR = new THREE.MeshStandardMaterial({ color: 0xf6f8ff, emissive: 0xdfe8ff, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.92 });
// the night: the stone glows warm under floodlights, the white tops and the cross shine cool, the mosaic pinnacles
// sparkle, the stained glass glows from inside, the cranes blink red. k: 0 (day) … 1 (night)
const WINDOWS = [0x3a6ad0, 0x2fa58f, 0xe8902a, 0xd9482b].map((c) => new THREE.MeshStandardMaterial({ color: 0x3a4a5a, emissive: c, emissiveIntensity: 0.15, roughness: 0.3 }));
const CRANE_LIGHT = new THREE.MeshStandardMaterial({ color: 0x8a1f1f, emissive: 0xff2a1a, emissiveIntensity: 0 });
let night = 0;
export function setNight(k) {
  night = k;
  STAR.emissiveIntensity = 0.3 + k * 2.5;
  for (const [m, i] of [[STONE.old, 0.1], [STONE.new, 0.12], [STONE.pale, 0.12], [NATIVITY, 0.16]]) { m.emissive.set(0xffc48a); m.emissiveIntensity = i * k; }
  STONE.white.emissive.set(0xeef2ff); STONE.white.emissiveIntensity = 0.5 * k;
  STONE.glass.emissive.set(0xbfe0ff); STONE.glass.emissiveIntensity = 0.8 * k;
  MOSAIC.emissive.set(0xffffff); MOSAIC.emissiveMap = MOSAIC.map; MOSAIC.emissiveIntensity = 0.55 * k; MOSAIC.needsUpdate = true;
  WINDOWS.forEach((m) => (m.emissiveIntensity = 0.15 + 1.4 * k));
}
// floodlights from the streets onto the façades and up the towers (in the basilica's own metres; s scales them)
export function nightLights(parent, s = SAGRADA_SCALE) {
  const spots = [[[80, 3, 0], [32, 40, 0]], [[-80, 3, 0], [-32, 40, 0]], [[20, 4, 95], [0, 45, 45]], [[60, 3, -60], [0, 80, 0]]].map(([p, q]) => {
    const l = new THREE.SpotLight(0xffd7a0, 0, 260 * s, 0.55, 0.6, 1.1);
    l.position.set(...p).multiplyScalar(s); l.target.position.set(...q).multiplyScalar(s);
    parent.add(l, l.target); return l;
  });
  return { update: (k) => spots.forEach((l) => (l.intensity = k * 2600 * s * s)) };
}

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
  g.add(box(r * 1.9, y0, r * 1.9, stone, 0, y0 / 2, 0)); // the square foot (it stands in the façade)
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
  const win = []; // tall windows: stained glass, glowing at night (blue, green, orange, red)
  for (let z = th + 4; z < gz - 8; z += 7.5) for (const s of [1, -1]) { win.push(new THREE.BoxGeometry(0.4, 14, 3.6).translate(s * (nh + 0.05), 14, z)); win.push(new THREE.BoxGeometry(0.4, 10, 3.2).translate(s * 7.55, 38, z)); }
  WINDOWS.forEach((m, c) => { const part = win.filter((_, i) => Math.floor(i / 2) % WINDOWS.length === c); if (part.length) g.add(mesh(mergeGeometries(part), m)); });
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
  block(nx - 4, nx + 1, -th - 6, th + 6, 30, O); // (behind the Nativity façade, which is modelled on its own)
  block(px - 1, px + 4, -th - 6, th + 6, 30, STONE.pale); // (behind the Passion façade, modelled on its own)
  bakeStatic(g);
  g.userData = { kind: 'basilica' };
  return g;
}
// the towers in their places (2026: 14 of 18)
export function towers() {
  const g = new THREE.Group();
  const { nativityX: nx, passionX: px } = PLAN;
  // Nativity (north-east): Barnabas, Simon, Jude, Matthias — the outer pair taller (≈107 m), the inner ≈98.5 m
  [[-18.5, 107, 'マティア'], [-7, 98.5, 'ユダ'], [7, 98.5, 'シモン'], [18.5, 107, 'バルナバ']].forEach(([z, h, name]) => { const t = apostleTower({ h, r: 3.6, stone: NATIVITY }); t.position.set(nx + 1.5, 0, z); t.userData.name = name; g.add(t); });
  // Passion (west / south-west): James the Less, Bartholomew, Thomas, Philip — elliptical plan, paler stone
  [[-18.5, 112, 'ヤコブ（小）'], [-7, 107, 'バルトロマイ'], [7, 107, 'トマス'], [18.5, 112, 'フィリポ']].forEach(([z, h, name]) => { const t = apostleTower({ h, r: 3.6, stone: STONE.new, plan: 'ellipse' }); t.position.set(px - 1.5, 0, z); t.userData.name = name; g.add(t); });
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
    jib.add(box(48, 1.6, 1.6, yellow, 14, 0, 0)); jib.add(box(12, 3, 3, mat(0x7a7f86), -12, -1, 0)); jib.add(box(2, 6, 2, yellow, 0, 3, 0)); for (const x of [0, 37.5]) jib.add(mesh(new THREE.SphereGeometry(0.6, 8, 6), CRANE_LIGHT, x, x ? 1 : 6.4, 0)); // warning lights
    jib.add(cyl(0.05, 0.05, 30, mat(0x2a2a2c), 30, -15, 0, 4)); jib.add(box(2.5, 1.5, 2.5, mat(0x2a2a2c), 30, -30, 0));
    jib.userData.dynamic = true; jib.rotation.y = ph; c.add(jib); g.add(c); cranes.push(jib);
  }
  bakeStatic(g);
  g.userData = { kind: 'gloryWorks', update: (t, dt = 0) => { cranes.forEach((j, i) => { j.rotation.y += dt * (i ? -0.02 : 0.025); }); CRANE_LIGHT.emissiveIntensity = Math.floor(t * 1.2) % 2 ? 0.2 + 2.5 * night : 0.05; } };
  return g;
}

// ---------- the Nativity façade (north-east, +X): the most detailed part, seen from the café across Plaça de Gaudí ----------
// Three portals between the four tower feet — Hope (+Z, left as you face it), Charity in the middle (the widest and
// tallest), Faith (−Z) — each a deep parabolic opening with stepped archivolts and green bronze doors, under a tall
// gable of "melting" stone: drips, leaves and groups of figures. On the middle gable the cypress, the Tree of Life,
// green with white doves. Two columns stand between the portals on turtles (a sea turtle on the sea side, a tortoise
// on the mountain side); chameleons on the corners; angels with trumpets; the star over the Nativity.
export function nativityFacade() {
  const g = new THREE.Group();
  const X = PLAN.nativityX + 3.4; // the front face of the façade wall
  const portals = [{ z: 0, hw: 3.4, h: 21, top: 52, name: '愛' }, { z: 12.75, hw: 2.4, h: 15, top: 40, name: '希望' }, { z: -12.75, hw: 2.4, h: 15, top: 40, name: '信仰' }];
  const stone = NATIVITY, light = mat(0xc4ad88, { roughness: 0.95, flatShading: true }), dark = mat(0x2a221a, { roughness: 1 });
  const pb = (hw, h, y0 = 0) => (z) => y0 + h * (1 - (z / hw) ** 2); // a parabolic arch
  // the wall: an organic, bumpy surface (a displaced grid), lumpier toward the top as it melts into sculpture
  const W = 46, H = 34, wall = new THREE.PlaneGeometry(W, H, 92, 68).rotateY(Math.PI / 2), wp = wall.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const z = wp.getZ(i), y = wp.getY(i) + H / 2, k = 0.3 + 0.7 * (y / H);
    const d = k * (0.45 * Math.sin(z * 1.7 + y * 0.6) * Math.sin(y * 1.3 - z * 0.4) + 0.3 * Math.max(0, Math.sin(z * 3.1 + Math.sin(y * 0.8) * 2)) * (1 + Math.sin(y * 0.4)));
    wp.setXYZ(i, d, y, z);
  }
  wall.computeVertexNormals();
  g.add(mesh(wall, stone, X, 0, 0));
  g.add(box(4, H, W, stone, X - 2.2, H / 2, 0)); // its thickness, behind
  // each portal
  const drips = [], figs = [], leaves = [];
  const cone = new THREE.ConeGeometry(0.22, 1.1, 5).rotateX(Math.PI); // a drip of stone, point down
  for (const P of portals) {
    const arch = pb(P.hw, P.h);
    // the opening (dark), the bronze doors inside it
    const shape = new THREE.Shape(); const N = 24;
    for (let i = 0; i <= N; i++) { const z = -P.hw + (2 * P.hw * i) / N; i ? shape.lineTo(z, arch(z)) : shape.moveTo(z, arch(z)); }
    shape.lineTo(P.hw, 0); shape.lineTo(-P.hw, 0);
    const open = mesh(new THREE.ShapeGeometry(shape), dark, X + 0.5, 0, P.z); open.rotation.y = Math.PI / 2; g.add(open);
    const door = mesh(new THREE.PlaneGeometry(P.hw * 1.1, Math.min(7, P.h * 0.4)), BRONZE, X + 0.55, Math.min(7, P.h * 0.4) / 2, P.z); door.rotation.y = Math.PI / 2; g.add(door);
    // stepped archivolts: three parabolic rolls standing out from the wall
    for (let k = 1; k <= 3; k++) {
      const s = 1 + k * 0.16, pts = [];
      for (let i = 0; i <= 30; i++) { const z = -P.hw * s + (2 * P.hw * s * i) / 30; pts.push(new THREE.Vector3(X + 0.4 + k * 0.45, P.h * s * (1 - (z / (P.hw * s)) ** 2), P.z + z)); }
      g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.32 + k * 0.05, 6), k === 2 ? light : stone));
    }
    // the gable above: a tall pointed mass rising to P.top, drips hanging from its edges, figures and leaves on it
    const gw = P.hw * 1.75, gy = P.h * 1.42, edge = (z) => gy + (P.top - gy) * (1 - Math.abs(z / gw) ** 1.6);
    const gs = new THREE.Shape(); for (let i = 0; i <= N; i++) { const z = -gw + (2 * gw * i) / N; i ? gs.lineTo(z, edge(z)) : gs.moveTo(z, edge(z)); } gs.lineTo(gw, gy - 3); gs.lineTo(-gw, gy - 3);
    const gab = mesh(new THREE.ExtrudeGeometry(gs, { depth: 2.2, bevelEnabled: false }), stone, X - 0.6, 0, P.z); gab.rotation.y = Math.PI / 2; g.add(gab); // its body
    g.add(mesh(gableSkin(gw, gy - 3, P.top, edge), stone, X + 1.6, 0, P.z)); // its lumpy, melting face
    for (let y = gy; y < P.top - 3; y += 3.2) for (let z = -gw + 0.4; z < gw; z += 0.7) if (edge(z) > y + 1) drips.push(cone.clone().scale(1.1, 0.8 + ((Math.round(z * 7 + y) % 5) + 5) % 5 * 0.35, 1.1).translate(X + 2.6, y, P.z + z)); // rows of stone icicles
    for (let i = 0; i <= 22; i++) { const z = -gw + (2 * gw * i) / 22; drips.push(cone.clone().scale(1, 0.7 + ((i * 7) % 5) * 0.25, 1).translate(X + 2.0, edge(z) - 0.6, P.z + z)); }
    // the stone melting down over the archivolts
    for (let i = 0; i < 26; i++) { const z = -P.hw * 1.5 + (3 * P.hw * i) / 25, y = P.h * 1.5 * (1 - (z / (P.hw * 1.5)) ** 2); if (y > 0.5) drips.push(cone.clone().scale(1.3, 1.2 + ((i * 5) % 4) * 0.4, 1.3).translate(X + 2.2, y + 0.2, P.z + z)); }
    // figure groups: little standing figures (capsules) in rows on the gable — the scenes of the portal
    const rows = P.z === 0 ? [[gy + 0.5, 5], [gy + 6.5, 4], [gy + 12.5, 3]] : [[gy + 0.5, 3], [gy + 5.5, 2]];
    for (const [y, n] of rows) for (let j = 0; j < n; j++) { const z = (j - (n - 1) / 2) * 1.5; figs.push(new THREE.CapsuleGeometry(0.4, 1.2, 3, 6).translate(X + 2.9, y, P.z + z)); figs.push(new THREE.SphereGeometry(0.38, 6, 5).translate(X + 2.9, y + 1.1, P.z + z)); }
    for (let j = 0; j < 40; j++) { const a = j * 2.4, rr = 0.6 + (j % 5) * 0.5, y = P.h + 1 + (j * 0.73) % (P.top - P.h - 6); leaves.push(new THREE.SphereGeometry(0.5, 5, 4).scale(1.3, 0.5, 1).translate(X + 2.0 + Math.sin(a) * 0.4, y, P.z + Math.cos(a) * rr * P.hw * 0.4)); }
  }
  // over the top of the wall: a fringe of drips
  for (let z = -W / 2; z < W / 2; z += 0.8) drips.push(cone.clone().scale(1, 1 + ((z * 13) % 3), 1).translate(X + 0.9, H - 0.6, z));
  g.add(mesh(mergeGeometries(drips), stone), mesh(mergeGeometries(figs), light), mesh(mergeGeometries(leaves), mat(0x9a8a62, { roughness: 1, flatShading: true })));
  // the Tree of Life: a green cypress on the middle gable, white doves on it and around, a cross at its tip
  const cy = portals[0].top - 2, cyp = [];
  for (let k = 0; k < 8; k++) cyp.push(new THREE.ConeGeometry(3.4 - k * 0.38, 3.2, 10).translate(0, cy + 1.6 + k * 1.75, 0));
  g.add(mesh(mergeGeometries(cyp), mat(0x3f6a3a, { roughness: 0.8, flatShading: true }), X + 0.8, 0, 0));
  const doves = [];
  for (let k = 0; k < 18; k++) { const a = k * 1.9, y = cy + 1.5 + (k * 0.83) % 13, rr = 3.2 - (y - cy) * 0.2; doves.push(new THREE.SphereGeometry(0.42, 6, 5).scale(1.6, 0.8, 0.8).translate(X + 0.8 + Math.cos(a) * rr, y, Math.sin(a) * rr)); }
  g.add(mesh(mergeGeometries(doves), STONE.white));
  g.add(box(0.4, 2.4, 0.4, mat(0xc8283a), X + 0.8, cy + 16.4, 0)); g.add(box(0.4, 0.4, 1.6, mat(0xc8283a), X + 0.8, cy + 16.9, 0)); // the cross
  // the two columns between the portals, on their turtles; palm-leaf capitals
  for (const [s, sea] of [[1, true], [-1, false]]) {
    const z = s * 7.2;
    g.add(cyl(0.6, 0.75, 17, light, X + 3.2, 1.2 + 8.5, z, 12));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const leaf = box(0.2, 2.2, 0.8, mat(0x9a8a62), X + 3.2 + Math.cos(a) * 0.9, 18.6, z + Math.sin(a) * 0.9); leaf.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); g.add(leaf); }
    const tm = mat(sea ? 0x6f7f74 : 0x7a7462, { roughness: 0.9, flatShading: true }), sh = mesh(new THREE.SphereGeometry(1.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), tm, X + 3.2, 0.1, z); sh.scale.set(1.3, 0.75, 1.1); g.add(sh);
    g.add(mesh(new THREE.SphereGeometry(0.45, 8, 6), tm, X + 5.0, 0.5, z));
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const f = mesh(new THREE.SphereGeometry(0.45, 6, 4), tm, X + 3.2 + dx * 1.3, 0.25, z + dz * 1.1); f.scale.set(sea ? 1.8 : 0.9, 0.3, sea ? 0.7 : 0.9); g.add(f); } // flippers or feet
  }
  // chameleons on the corners, angels with trumpets, the star over the middle doorway
  for (const s of [1, -1]) { const c = new THREE.Group(); c.add(mesh(new THREE.SphereGeometry(0.6, 8, 6), mat(0x6f8a4a), 0, 0, 0)); c.children[0].scale.set(2, 0.8, 0.8); c.add(mesh(new THREE.TorusGeometry(0.35, 0.12, 4, 8, Math.PI * 1.5), mat(0x6f8a4a), -1.3, -0.3, 0)); c.position.set(X + 0.9, 9.5, s * 22.3); c.rotation.z = -1.1; g.add(c); }
  const gold = mat(0xd9b860, { metalness: 0.5, roughness: 0.35 });
  for (const z of [-18.5, -7, 7, 18.5]) { const a = new THREE.Group(); a.add(mesh(new THREE.CapsuleGeometry(0.55, 1.6, 4, 8), STONE.pale, 0, 0, 0)); a.add(mesh(new THREE.SphereGeometry(0.45, 8, 6), STONE.pale, 0, 1.3, 0)); for (const w of [1, -1]) { const wing = mesh(new THREE.SphereGeometry(0.9, 8, 5), STONE.pale, -0.4, 0.6, w * 0.8); wing.scale.set(0.5, 1.4, 0.3); a.add(wing); } const tr = mesh(new THREE.ConeGeometry(0.25, 1.8, 8).rotateZ(-Math.PI / 2 - 0.5), gold, 1.0, 1.4, 0); a.add(tr); a.position.set(X + 2.4, 26.5, z); g.add(a); }
  const star = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 0.6 : 1.4; k ? star.lineTo(Math.cos(a) * r, -Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, -Math.sin(a) * r); }
  const st = mesh(new THREE.ExtrudeGeometry(star, { depth: 0.3, bevelEnabled: false }), gold, X + 2.8, portals[0].h * 1.42 - 1.6, 0); st.rotation.y = Math.PI / 2; g.add(st);
  bakeStatic(g);
  g.userData = { kind: 'facade', facade: 'nativity', portals };
  return g;
}
// the face of a gable: a displaced grid clipped to the gable's outline (only the faces fully inside are kept)
function gableSkin(gw, y0, top, edge) {
  const nz = 30, ny = 46, pos = [], idx = [], inside = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nz; i++) {
    const z = -gw + (2 * gw * i) / nz, y = y0 + ((top - y0) * j) / ny;
    const d = 0.55 * Math.sin(z * 2.1 + y * 0.9) * Math.sin(y * 1.7 - z) + 0.45 * Math.max(0, Math.sin(y * 2.2 + Math.sin(z * 1.3) * 2)) + 0.25 * Math.sin(z * 5 + y * 4);
    pos.push(d, y, z); inside.push(y <= edge(z) + 0.2);
  }
  const row = nz + 1;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nz; i++) { const a = j * row + i, b = a + 1, c = a + row, e = c + 1; if (inside[a] && inside[b] && inside[c] && inside[e]) idx.push(a, b, c, b, e, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const uv = new Float32Array((pos.length / 3) * 2); for (let k = 0; k < pos.length / 3; k++) { uv[k * 2] = pos[k * 3 + 2] / 8; uv[k * 2 + 1] = pos[k * 3 + 1] / 8; } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
// green bronze doors covered in leaves and little creatures (a canvas pattern)
const BRONZE = (() => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#4f7a62'; x.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 160; i++) { const px = (i * 41) % 128, py = (i * 97) % 256, a = i * 0.7; x.fillStyle = i % 9 === 0 ? '#c9a24a' : `hsl(${140 + (i % 20)}, 30%, ${30 + (i % 4) * 6}%)`; x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.ellipse(0, 0, 8, 3.5, 0, 0, 7); x.fill(); x.restore(); }
  x.fillStyle = '#2a3a30'; x.fillRect(62, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.45 });
})();

// ---------- the Passion façade (west, −X): austere and bony, in pale stone ----------
// A plain wall with bronze doors of text; in front, a porch whose roof rests on six inclined columns like strained
// muscles or bones; above it a pyramid of eighteen bone-shaped columns under a cross crowned with thorns. Angular,
// faceted figures (after Subirachs) climb the façade in an S: the Last Supper and the arrest below, the way to
// Calvary in the middle, the Crucifixion high in the centre; and on the bridge between the two middle towers, the
// golden Ascension. Beside the door, the magic square whose rows add up to 33.
export function passionFacade() {
  const g = new THREE.Group();
  const X = PLAN.passionX - 3.4; // the face of the wall (the porch reaches out toward −X)
  const pale = STONE.pale, stone = STONE.new, bone = mat(0xe6dcc8, { roughness: 0.8 }), dark = mat(0x2a2620, { roughness: 1 });
  // the wall: smooth, with a slight batter, and the three doorways
  g.add(box(4, 34, 46, pale, X + 2, 17, 0));
  for (const [z, w, h] of [[0, 7, 13], [12.75, 3.6, 9], [-12.75, 3.6, 9]]) {
    g.add(box(0.2, h, w, dark, X - 0.05, h / 2, z));
    const d = mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.92), TEXTDOOR, X - 0.2, h * 0.46, z); d.rotation.y = -Math.PI / 2; g.add(d);
  }
  // the six inclined columns: thick at the top where they take the roof, jointed like bones, leaning back to the wall
  const P0 = X - 7.5, roofY = 19;
  const colZ = [-15.5, -9.3, -3.1, 3.1, 9.3, 15.5];
  for (const z of colZ) {
    const a = new THREE.Vector3(P0, 0, z * 1.08), b = new THREE.Vector3(X - 2.2, roofY, z * 0.92);
    const c = new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.45).add(new THREE.Vector3(-0.8, 0, 0)), b]);
    const prof = (t) => 0.75 + 0.55 * t + 0.25 * Math.sin(t * Math.PI * 3) ** 2; // swelling and pinched
    const geo = new THREE.TubeGeometry(c, 24, 1, 10), pp = geo.attributes.position;
    // scale each ring of the tube around its centre by the profile (thicker at the top, knotty)
    const ctr = new THREE.Vector3();
    for (let i = 0; i < pp.count; i++) { const ring = Math.floor(i / 11), t = ring / 24; c.getPointAt(Math.min(1, t), ctr); const v = new THREE.Vector3().fromBufferAttribute(pp, i).sub(ctr).multiplyScalar(prof(t)).add(ctr); pp.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    g.add(mesh(geo, bone));
    for (const t of [0.33, 0.66]) { c.getPointAt(t, ctr); g.add(mesh(new THREE.SphereGeometry(prof(t) * 1.15, 10, 8), bone, ctr.x, ctr.y, ctr.z)); } // the joints
  }
  // the porch roof (a thick lintel with a rounded front), its underside darker
  g.add(box(9, 3.2, 40, stone, X - 4.5, roofY + 1.6, 0));
  const lip = cyl(1.6, 1.6, 40, bone, X - 9, roofY + 1.6, 0, 12); lip.rotation.x = Math.PI / 2; g.add(lip);
  // the pyramid of eighteen bones (6 + 5 + 4 + 3) on the roof, rising to the cross
  const bones = [];
  [[6, 0], [5, 1], [4, 2], [3, 3]].forEach(([n, row]) => {
    for (let k = 0; k < n; k++) {
      const z = (k - (n - 1) / 2) * 5.2, x = X - 5.8 + row * 1.2, h = 9 + row * 4.5 - Math.abs(z) * 0.4, y0 = roofY + 3.2 + row * 1.0;
      bones.push(new THREE.CylinderGeometry(0.55, 0.7, h, 8).translate(x, y0 + h / 2, z));
      for (const yy of [y0 + h, y0 + h * 0.5]) bones.push(new THREE.SphereGeometry(0.85, 8, 6).translate(x, yy, z)); // knuckles
    }
  });
  g.add(mesh(mergeGeometries(bones.map((b) => (b.index ? b.toNonIndexed() : b))), bone));
  const crossY = roofY + 3.2 + 3 + 9 + 13.5 + 1.5;
  g.add(box(0.9, 7, 0.9, stone, X - 2.4, crossY + 3.5, 0)); g.add(box(0.9, 0.9, 4.5, stone, X - 2.4, crossY + 5, 0));
  g.add(mesh(new THREE.TorusGeometry(1.1, 0.35, 6, 14).rotateY(Math.PI / 2), mat(0x6a5a40, { roughness: 1, flatShading: true }), X - 2.9, crossY + 5, 0)); // the crown of thorns
  // the faceted figures, in an S: low left→right, middle right→left, the Crucifixion high in the centre
  const figM = mat(0xb0a690, { roughness: 0.85, flatShading: true }), figs = [];
  const figure = (x, y, z, s = 1, lean = 0) => {
    figs.push(new THREE.BoxGeometry(0.9 * s, 2.0 * s, 0.7 * s).applyMatrix4(new THREE.Matrix4().makeRotationZ(lean).setPosition(x, y + s, z)));
    figs.push(new THREE.OctahedronGeometry(0.42 * s, 0).translate(x, y + 2.4 * s, z)); // a faceted head
  };
  for (let k = 0; k < 9; k++) figure(X - 1.3, 0.3, -14 + k * 3.4, 1.45, (k % 3 - 1) * 0.15); // the Last Supper, the kiss of Judas, the arrest
  for (let k = 0; k < 7; k++) figure(X - 1.3, roofY + 4, 13 - k * 4.2, 1.5, (k % 2 ? 0.2 : -0.2)); // the way to Calvary
  // the Crucifixion, high in the centre, and the Ascension on the bridge between the middle towers
  g.add(box(0.6, 7, 0.6, stone, X - 1.0, 41, 0)); g.add(box(0.6, 0.6, 4, stone, X - 1.0, 43, 0));
  figure(X - 1.4, 37.8, 0, 1.6);
  const bridgeY = 62;
  g.add(box(3, 2, 14, stone, PLAN.passionX - 1.5, bridgeY, 0));
  const gold = mat(0xd9b860, { metalness: 0.6, roughness: 0.3 });
  g.add(mesh(new THREE.CapsuleGeometry(0.8, 3.2, 4, 8), gold, PLAN.passionX - 1.5, bridgeY + 3.6, 0)); g.add(mesh(new THREE.OctahedronGeometry(0.7, 0), gold, PLAN.passionX - 1.5, bridgeY + 6.3, 0));
  g.add(mesh(mergeGeometries(figs.map((b) => (b.index ? b.toNonIndexed() : b))), figM));
  // the magic square beside the main door
  const ms = mesh(new THREE.PlaneGeometry(1.6, 1.6), MAGIC, X - 0.12, 4.2, 5.2); ms.rotation.y = -Math.PI / 2; g.add(ms);
  bakeStatic(g);
  g.userData = { kind: 'facade', facade: 'passion' };
  return g;
}
const TEXTDOOR = (() => { // bronze doors covered in lines of text (the Gospel of the Passion)
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#6a5a40'; x.fillRect(0, 0, 128, 256);
  for (let r = 0; r < 60; r++) for (let k = 0; k < 6; k++) { x.fillStyle = (r * 7 + k * 3) % 11 === 0 ? '#e8d8a0' : '#3a3024'; x.fillRect(4 + k * 20, 4 + r * 4.2, 6 + ((r * k) % 10), 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.5 });
})();
const MAGIC = (() => { // Subirachs' magic square: every row, column and diagonal adds up to 33
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#d6ccb8'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#6a5a40'; x.lineWidth = 2;
  const sq = [[1, 14, 14, 4], [11, 7, 6, 9], [8, 10, 10, 5], [13, 2, 3, 15]];
  x.font = 'bold 20px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#3a3024';
  sq.forEach((row, r) => row.forEach((n, k) => { x.strokeRect(4 + k * 30, 4 + r * 30, 30, 30); x.fillText(n, 19 + k * 30, 20 + r * 30); }));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
})();

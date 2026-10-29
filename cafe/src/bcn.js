// Barcelona's street life round the Sagrada Família (cafe/BARCELONA.md §3.2–§3.4): the shops on the ground floors
// (a bakery, a fruit shop, a tapas bar, an ice-cream shop, a pharmacy, a souvenir shop), the flower and newspaper
// kiosks, the plaza (the pond and its ducks, sandy paths, a playground, a mosaic bench, an iron drinking fountain) and
// the street (plane trees in their iron grates, Falqués's five-light lamps, bike-share docks, rubbish containers,
// a painter's easel).
// A shop front stands on its bay (2.3 wide) against the wall at z = 0, facing +Z; things on the pavement go in front.
import * as THREE from 'three';
import { mesh, box, cyl, rbox } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { signTexture } from '../../town/src/buildings.js';
import { part, tube, seeded, ellipsoid } from '../../sealife/src/kit.js';
import { treeMesh, leafy } from '../../town/src/nature.js';
import { bicycle } from '../../town/src/vehicles.js';
import { CAFE, M, GLOW, GLASS } from './furniture.js';
import { drawSketch } from './things.js';

// a round bar from a to b
const strut = (a, b, r, m) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), c = cyl(r, r, A.distanceTo(Bv), m, 0, 0, 0, 6); c.position.copy(A).add(Bv).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize()); return c; };
const bake = (g, kind, extra = {}) => { bakeStatic(g); g.userData = { ...g.userData, kind, ...extra }; return g; };
const sign = (text, bg, fg, w = 1.9, h = 0.4, font = 'bold 44px Georgia, serif') => mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTexture(text, { w: 512, h: Math.round(512 * h / w), font, bg, fg }), roughness: 0.6 }));
// the frame every shop shares: a painted surround standing out from the wall, a sign board over it, the shop window
// (a lit space between the wall and the glass, where the shop's things go: z 0.1–0.4) and an open door
const SHOW = 0.28; // where a window's things stand
function front(color, signText, signBg, signFg, { glass = true } = {}) {
  const g = new THREE.Group(), paint = M(color, { roughness: 0.6 });
  for (const x of [-1.05, 1.05]) g.add(box(0.18, 3.0, 0.5, paint, x, 1.5, 0.25));
  g.add(box(2.3, 0.55, 0.52, paint, 0, 2.85, 0.26));
  const s = sign(signText, signBg, signFg); s.position.set(0, 2.85, 0.53); g.add(s);
  g.add(box(1.1, 0.4, 0.46, paint, -0.4, 0.2, 0.23)); // the stall riser under the window
  g.add(box(1.1, 2.15, 0.03, M(0xf6e6c8, { roughness: 0.9 }), -0.4, 1.47, 0.02)); // the back of the window, warm and light
  g.add(box(1.1, 0.04, 0.42, M(0xf3ead8), -0.4, 2.56, 0.23));
  if (glass) { const gl = mesh(new THREE.PlaneGeometry(1.1, 2.15), GLASS, -0.4, 1.47, 0.47); gl.userData.keep = true; g.add(gl); }
  g.add(box(0.7, 2.3, 0.05, M(0x2a2a2c, { roughness: 0.4 }), 0.6, 1.15, 0.04)); // the open doorway, dark inside
  for (const x of [0.2, 1.0]) g.add(box(0.06, 2.3, 0.5, paint, x, 1.15, 0.25));
  return g;
}
const canopy = (color, w = 2.2) => { const g = new THREE.Group(), m = M(color, { roughness: 0.9, side: THREE.DoubleSide }); const s = box(w, 0.05, 1.0, m, 0, 2.5, 0.95); s.rotation.x = 0.35; g.add(s); g.add(box(w, 0.25, 0.03, m, 0, 2.22, 1.42)); return g; };
const crate = (g, x, y, z, fruit, n = 6, wood = 0xc9a87c) => { g.add(box(0.5, 0.16, 0.34, M(wood), x, y + 0.08, z)); for (let i = 0; i < n; i++) g.add(mesh(new THREE.SphereGeometry(0.065, 7, 5), M(fruit, { roughness: 0.6 }), x - 0.18 + (i % 3) * 0.18, y + 0.2, z - 0.08 + Math.floor(i / 3) * 0.16)); };

// ---------- the shops ----------
// FORN DE PA: loaves and baguettes on the shelves behind the glass, a basket of rolls outside
export function bakery() {
  const g = front(0x6b4a35, 'FORN DE PA', '#f3ead8', '#6b4a35');
  g.add(canopy(0xe8dcc4));
  for (const [y, k] of [[0.5, 0], [0.95, 1], [1.4, 2]]) { g.add(box(1.0, 0.03, 0.3, M(CAFE.oak), -0.35, y, SHOW)); for (let i = 0; i < 4; i++) { const x = -0.75 + i * 0.25; if (k === 1) { const b = mesh(new THREE.CapsuleGeometry(0.04, 0.24, 4, 6).rotateZ(Math.PI / 2), M(0xd9a441), x, y + 0.06, SHOW); b.rotation.y = 0.3; g.add(b); } else g.add(mesh(new THREE.SphereGeometry(k ? 0.09 : 0.07, 8, 6), M(k ? 0xc9884a : 0xe8b878), x, y + 0.08, SHOW)).children.at(-1).scale.set(1, 0.7, 1); } }
  g.add(cyl(0.22, 0.18, 0.18, M(0xb89a6a), -0.55, 0.55, 0.85, 10)); for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 6, 5), M(0xd9a441), -0.62 + (i % 3) * 0.08, 0.68, 0.82 + Math.floor(i / 3) * 0.08)); // a basket of rolls on a stool
  g.add(box(0.3, 0.45, 0.3, M(CAFE.walnut), -0.55, 0.22, 0.85));
  return bake(g, 'bcnShop', { shop: 'bakery' });
}
// FRUITES: a stepped stand of crates out on the pavement, every colour of the market
export function fruiteria() {
  const g = front(0x2f5a4a, 'FRUITES · VERDURES', '#2f5a4a', '#f3ead8');
  g.add(canopy(0x3f7a5a));
  const F = [0xf28c28, 0xd2402e, 0x8fb83a, 0xf2d43a, 0x6a3a7a, 0xe8c46a, 0x3f8a3a, 0xd96a4a, 0xf6e2b0];
  for (let r = 0; r < 3; r++) { g.add(box(2.0, 0.04, 0.4, M(CAFE.oak), 0, 0.35 + r * 0.25, 1.15 - r * 0.32)); for (let k = 0; k < 4; k++) crate(g, -0.75 + k * 0.5, 0.37 + r * 0.25, 1.15 - r * 0.32, F[(k + r * 4) % F.length]); }
  for (const x of [-0.95, 0.95]) g.add(box(0.05, 0.9, 1.0, M(CAFE.oak), x, 0.45, 0.9));
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), M([0x8fb83a, 0xf2d43a, 0x3f8a3a][i]), -0.6 + i * 0.6, 0.12, 1.6)).children.at(-1).scale.set(1.3, 0.9, 0.9); // melons on the ground
  return bake(g, 'bcnShop', { shop: 'fruiteria' });
}
// BAR · TAPES: hams hanging in the window, a counter with bottles; its terrace is terrace()
export function tapasBar() {
  const g = front(0x8a2a2a, 'BAR · TAPES', '#8a2a2a', '#f3ead8');
  for (let i = 0; i < 3; i++) { g.add(cyl(0.005, 0.005, 0.3, M(0x2a2a2c), -0.7 + i * 0.3, 2.25, SHOW, 4)); g.add(mesh(new THREE.ConeGeometry(0.1, 0.5, 8).rotateX(Math.PI), M(0x9a4a3a, { roughness: 0.6 }), -0.7 + i * 0.3, 1.85, SHOW)); }
  g.add(box(1.0, 0.04, 0.2, M(CAFE.walnut), -0.4, 1.25, SHOW)); for (let i = 0; i < 6; i++) g.add(cyl(0.03, 0.035, 0.28, M([0x3a5a2a, 0x6a2a2a, 0xc9a24a][i % 3], { roughness: 0.2 }), -0.8 + i * 0.16, 1.41, SHOW, 6));
  const t = sign('Patatas bravas · Croquetes · Pa amb tomàquet', '#2b2f2c', '#f3ead8', 0.5, 0.7, 'bold 26px sans-serif'); t.position.set(0.6, 1.5, 0.08); t.position.z = 0.1; g.add(t); // the day's tapas on a board by the door
  return bake(g, 'bcnShop', { shop: 'tapas' });
}
// a terrace: little tables under red parasols (n of them, in a row along +X)
export function terrace({ n = 2, color = 0xc8283a } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 2.2;
    g.add(cyl(0.3, 0.3, 0.03, M(CAFE.marble, { roughness: 0.3 }), x, 0.72, 0, 14)); g.add(cyl(0.03, 0.03, 0.7, M(CAFE.iron), x, 0.36, 0, 6)); g.add(cyl(0.2, 0.2, 0.03, M(CAFE.iron), x, 0.02, 0, 10));
    for (const s of [-1, 1]) { const c = new THREE.Group(); c.add(box(0.38, 0.04, 0.38, M(0xc9a87c), 0, 0.44, 0)); c.add(box(0.38, 0.4, 0.04, M(0xc9a87c), 0, 0.66, -0.18)); for (const [a, b] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) c.add(cyl(0.015, 0.015, 0.44, M(CAFE.iron), a, 0.22, b, 4)); c.position.set(x + s * 0.55, 0, 0); c.rotation.y = s * Math.PI / 2; g.add(c); }
    g.add(cyl(0.025, 0.03, 2.4, M(0xf3ead8), x, 1.2, 0, 6)); g.add(mesh(new THREE.ConeGeometry(1.1, 0.35, 8, 1, true), M(color, { side: THREE.DoubleSide, roughness: 0.8 }), x, 2.35, 0)); g.add(mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.14, 8, 1, true), M(0xf3ead8, { side: THREE.DoubleSide }), x, 2.15, 0));
    g.add(cyl(0.03, 0.03, 0.06, M(CAFE.white), x - 0.1, 0.77, 0.05, 8)); g.add(cyl(0.12, 0.1, 0.02, M(CAFE.white), x + 0.1, 0.745, -0.05, 12)); // a glass of vermouth, a plate of tapas
  }
  return bake(g, 'terrace');
}
// GELATS: pastel front, a case of coloured tubs, a big cone over the door
export function gelateria() {
  const g = front(0xa8d8c8, 'GELATS', '#f6d8de', '#c84a6a', { glass: false });
  g.add(box(1.1, 0.8, 0.5, M(CAFE.white), -0.4, 0.4, 0.55)); const gl = mesh(new THREE.BoxGeometry(1.1, 0.3, 0.5), GLASS, -0.4, 0.95, 0.55); gl.userData.keep = true; g.add(gl);
  const C = [0xf6d8de, 0xf2e6a0, 0x8a5a3a, 0xa8d8a0, 0xd2402e, 0xf6f1e6, 0x6a3a7a, 0xf2a040];
  for (let i = 0; i < 8; i++) g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), M(C[i], { roughness: 0.5 }), -0.8 + (i % 4) * 0.27, 0.86, 0.45 + Math.floor(i / 4) * 0.18));
  const cone = new THREE.Group(); cone.add(mesh(new THREE.ConeGeometry(0.16, 0.5, 10).rotateX(Math.PI), M(0xd9a441), 0, 0, 0)); cone.add(mesh(new THREE.SphereGeometry(0.17, 10, 8), M(0xf6d8de), 0, 0.3, 0)); cone.add(mesh(new THREE.SphereGeometry(0.15, 10, 8), M(0xa8d8a0), 0, 0.5, 0)); cone.position.set(0.95, 2.1, 0.8); g.add(cone);
  g.add(box(0.05, 0.05, 0.6, M(CAFE.iron), 0.95, 2.3, 0.55));
  return bake(g, 'bcnShop', { shop: 'gelateria' });
}
// FARMÀCIA: a white front and the green cross that hangs out over the pavement, lit
export const CROSS = new THREE.MeshStandardMaterial({ color: 0x2a9a4a, emissive: 0x3ad06a, emissiveIntensity: 0.8, roughness: 0.4 });
export function pharmacy() {
  const g = front(0xf2f0ea, 'FARMÀCIA', '#f2f0ea', '#2a7a4a');
  for (let y = 0.6; y < 2.0; y += 0.35) { g.add(box(1.0, 0.03, 0.25, M(CAFE.white), -0.35, y, SHOW)); for (let i = 0; i < 5; i++) g.add(rbox(0.12, 0.16, 0.08, 0.01, M([0xf6f1e6, 0x7fb6c4, 0xe2a9a0, 0xa8d8a0][i % 4]), -0.75 + i * 0.2, y + 0.1, SHOW)); }
  const cross = new THREE.Group(); cross.add(box(0.5, 0.16, 0.08, CROSS, 0, 0, 0)); cross.add(box(0.16, 0.5, 0.08, CROSS, 0, 0, 0)); cross.rotation.y = Math.PI / 2; cross.position.set(1.15, 3.4, 0.9); cross.scale.setScalar(1.5); g.add(cross);
  g.add(box(0.04, 0.04, 0.9, M(CAFE.iron), 1.15, 3.4, 0.45));
  return bake(g, 'bcnShop', { shop: 'pharmacy' });
}
// RECORDS DE BARCELONA: mosaic-tile front, mugs and little towers in the window, a turning rack of postcards outside
function trencadisTex(seed = 3) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), r = seeded(seed);
  x.fillStyle = '#f6f4ee'; x.fillRect(0, 0, 128, 128);
  const cols = ['#3f8a9a', '#e8c46a', '#d96a4a', '#5f9a6a', '#2f5a8a', '#f2a040', '#c84a6a', '#f6f1e6'];
  for (let i = 0; i < 90; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; x.beginPath(); const cx = r() * 128, cy = r() * 128, n = 4 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const a = (k / n) * 6.28 + r() * 0.5, rr = 5 + r() * 6; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const TRENCADIS = new THREE.MeshStandardMaterial({ map: trencadisTex(), roughness: 0.35 });
export function souvenirs() {
  const g = front(0x2f5a8a, 'RECORDS · SOUVENIRS', '#2f5a8a', '#f2d43a');
  for (const x of [-1.05, 1.05]) g.add(box(0.2, 3.0, 0.51, TRENCADIS, x, 1.5, 0.25));
  for (const [y, k] of [[0.6, 0], [1.1, 1], [1.6, 2]]) { g.add(box(1.0, 0.03, 0.25, M(CAFE.white), -0.35, y, SHOW)); for (let i = 0; i < 5; i++) { const x = -0.75 + i * 0.2; if (k === 1) { g.add(cyl(0.025, 0.035, 0.3, M(0xd9c4a0), x, y + 0.15, SHOW, 6)); g.add(mesh(new THREE.ConeGeometry(0.03, 0.12, 6), M(0xd9c4a0), x, y + 0.36, SHOW)); } else g.add(cyl(0.045, 0.04, 0.09, M([0x3f8a9a, 0xe8c46a, 0xd96a4a, 0x5f9a6a, 0x2f5a8a][i]), x, y + 0.06, SHOW, 8)); } }
  for (let i = 0; i < 3; i++) g.add(box(0.36, 0.42, 0.02, M([0xf6f1e6, 0xc8283a, 0x2f5a8a][i]), -0.8 + i * 0.4, 2.2, SHOW)); // T-shirts hanging at the top of the window
  bake(g, 'bcnShop', { shop: 'souvenirs' });
  // the postcard rack turns (not baked)
  const rack = new THREE.Group(); rack.add(cyl(0.02, 0.02, 1.5, M(CAFE.iron), 0, 0.75, 0, 6)); rack.add(cyl(0.2, 0.2, 0.03, M(CAFE.iron), 0, 0.02, 0, 10));
  const spin = new THREE.Group(); spin.position.y = 0.4;
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const p = mesh(new THREE.PlaneGeometry(0.14, 0.2), M([0x3f8a9a, 0xe8c46a, 0xd96a4a, 0x5f9a6a, 0xf2a040, 0xc8a87c][(r * 4 + k) % 6], { side: THREE.DoubleSide }), Math.sin(k * Math.PI / 2) * 0.13, r * 0.24, Math.cos(k * Math.PI / 2) * 0.13); p.rotation.y = k * Math.PI / 2; spin.add(p); }
  rack.add(spin); rack.position.set(0.7, 0, 1.1); spin.userData.dynamic = true; g.add(rack);
  g.userData.update = (t) => (spin.rotation.y = t * 0.3);
  return g;
}

// ---------- the kiosks ----------
// a flower kiosk: a green hut, buckets of flowers on tiers all round
export function flowerKiosk() {
  const g = new THREE.Group(), green = M(0x2f5a4a, { roughness: 0.5 });
  g.add(rbox(2.0, 2.3, 1.5, 0.08, green, 0, 1.15, 0)); g.add(box(2.6, 0.12, 2.1, green, 0, 2.4, 0)); g.add(box(2.2, 0.3, 1.7, M(0xf3ead8), 0, 2.6, 0));
  const s = sign('FLORS', '#f3ead8', '#2f5a4a', 1.4, 0.3); s.position.set(0, 2.6, 0.86); g.add(s);
  const fl = [0xd2402e, 0xf2c94c, 0xf6f1e6, 0xe2a9a0, 0xb48ad0, 0xf28c28, 0x7fb6c4];
  for (const [side, w] of [[1, 2.0], [-1, 2.0]]) for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
    const x = -0.85 + k * 0.34, z = side * (0.9 + r * 0.3), y = 0.5 - r * 0.25;
    g.add(cyl(0.12, 0.1, 0.25, M(0x9aa0a6, { metalness: 0.4, roughness: 0.4 }), x, y, z, 8));
    for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 6, 5), M(fl[(k + r * 3 + i) % fl.length], { roughness: 0.7 }), x + Math.cos(i * 1.3) * 0.06, y + 0.25 + (i % 2) * 0.06, z + Math.sin(i * 1.3) * 0.06));
    void w;
  }
  for (const side of [1, -1]) g.add(box(2.0, 0.04, 0.6, M(CAFE.oak), 0, 0.35, side * 1.0));
  return bake(g, 'kiosk');
}
// a newspaper kiosk: the hut is walls of magazines, papers on the counter
export function newsKiosk() {
  const g = new THREE.Group(), green = M(0x2a3a34, { roughness: 0.5 });
  g.add(box(2.4, 2.2, 1.6, green, 0, 1.1, 0)); g.add(box(2.9, 0.12, 2.1, green, 0, 2.3, 0));
  const s = sign('PREMSA · REVISTES', '#c8283a', '#f6f4ee', 2.2, 0.32, 'bold 40px sans-serif'); s.position.set(0, 2.5, 0.0); g.add(s); g.add(box(2.2, 0.4, 0.04, M(0xc8283a), 0, 2.5, -0.03));
  const cols = [0xd2402e, 0x2f5a8a, 0xf2c94c, 0xf6f1e6, 0x5f9a6a, 0xe2a9a0, 0x2a2a2c, 0xf28c28];
  for (const side of [1, -1]) for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) { const p = box(0.28, 0.36, 0.02, M(cols[(r * 3 + k * 5 + (side > 0 ? 0 : 2)) % cols.length]), -1.0 + k * 0.33, 0.6 + r * 0.42, side * 0.82); p.rotation.x = side * 0.15; g.add(p); }
  g.add(box(2.0, 0.08, 0.5, M(CAFE.oak), 0, 0.95, 1.05)); for (let k = 0; k < 6; k++) g.add(box(0.28, 0.03, 0.38, M(k % 2 ? 0xf6f4ee : 0xe8e2d4), -0.8 + k * 0.32, 1.01, 1.05));
  return bake(g, 'kiosk');
}

// ---------- the plaza ----------
// the pond's edge for a shape (a THREE.Shape in x, -z): a flat coping of stone round the water, reeds and lily pads
export function pondEdge(shape, { width = 0.7, seed = 4, bed = true } = {}) { // bed: the floor seen through the water (not under a mirror)
  const g = new THREE.Group(), pts = shape.getSpacedPoints(90), r = seeded(seed);
  const outer = new THREE.Shape(), hole = new THREE.Path();
  const off = (p, i, d) => { const a = pts[(i + 1) % pts.length], b = pts[(i + pts.length - 1) % pts.length], n = new THREE.Vector2(b.y - a.y, a.x - b.x).normalize(); return p.clone().addScaledVector(n, -d); };
  pts.forEach((p, i) => { const o = off(p, i, width); i ? outer.lineTo(o.x, o.y) : outer.moveTo(o.x, o.y); i ? hole.lineTo(p.x, p.y) : hole.moveTo(p.x, p.y); });
  outer.holes.push(hole);
  const coping = mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.32, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 }).rotateX(-Math.PI / 2), M(0xd8cdb8, { roughness: 0.8 }), 0, 0, 0);
  g.add(coping);
  if (bed) g.add(mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }).rotateX(-Math.PI / 2), M(0x4a6a6a, { roughness: 0.9 }), 0, -0.25, 0)); // the floor of the pond
  // reeds in clumps along the edge, lily pads (some with a flower) on the water
  for (let i = 0; i < 9; i++) { const k = Math.floor(r() * pts.length), p = off(pts[k], k, -0.6); for (let j = 0; j < 7; j++) { const b = mesh(new THREE.ConeGeometry(0.04, 0.9 + r() * 0.5, 4), M(j % 2 ? 0x6a8a3a : 0x8aa04a), p.x + (r() - 0.5) * 0.6, 0.45, -p.y + (r() - 0.5) * 0.6); b.rotation.set((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3); g.add(b); } }
  for (let i = 0; i < 16; i++) { const k = Math.floor(r() * pts.length), p = off(pts[k], k, -1.5 - r() * 3); const pad = mesh(new THREE.CircleGeometry(0.28 + r() * 0.15, 10, 0.3, Math.PI * 1.85).rotateX(-Math.PI / 2), M(0x4f8a3a, { side: THREE.DoubleSide }), p.x, 0.09, -p.y); pad.rotation.y = r() * 6; g.add(pad); if (i % 4 === 0) g.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), M(0xf2b8c8), p.x, 0.13, -p.y)); }
  return bake(g, 'pondEdge');
}
// a duck (a mallard: green head, brown breast) that paddles round a loop; a few of them follow each other
export function duck({ drake = true } = {}) {
  const g = new THREE.Group(), body = M(drake ? 0x9a9488 : 0x9a7a5a);
  const b = mesh(new THREE.SphereGeometry(0.18, 10, 8), body, 0, 0.1, 0); b.scale.set(1.5, 0.8, 1); g.add(b);
  g.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), M(drake ? 0x8a5a3a : 0x9a7a5a), 0.18, 0.12, 0));
  g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), M(drake ? 0x2f6a3a : 0x8a6a4a), 0.28, 0.3, 0));
  g.add(box(0.12, 0.03, 0.06, M(0xe8b84a), 0.4, 0.29, 0));
  const tail = mesh(new THREE.ConeGeometry(0.06, 0.16, 5).rotateZ(Math.PI / 2 + 0.6), M(drake ? 0x3a3a3a : 0x8a6a4a), -0.28, 0.18, 0); g.add(tail);
  return g;
}
export function ducks(n = 4, { rx = 8, rz = 4 } = {}) {
  const g = new THREE.Group(), list = [];
  for (let i = 0; i < n; i++) { const d = duck({ drake: i % 2 === 0 }); d.scale.setScalar(1.6); g.add(d); list.push(d); }
  g.userData = { kind: 'ducks', update: (t) => list.forEach((d, i) => { const a = t * 0.08 - i * 0.18, x = Math.cos(a) * rx * (1 + 0.04 * Math.sin(t * 0.5 + i)), z = Math.sin(a) * rz; d.position.set(x, 0.04 + Math.sin(t * 2 + i) * 0.01, z); d.rotation.y = Math.atan2(-Math.cos(a) * rz, -Math.sin(a) * rx) + Math.PI; }) };
  return g;
}
// a sandy path along points (a ribbon of sauló, with low stone kerbs both sides)
export const SAULO = new THREE.MeshStandardMaterial({ color: 0xd8c49a, roughness: 1 });
export function path(points, w = 2.4, { kerb = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z))), N = Math.max(8, Math.round(curve.getLength() / 1.2));
  const pos = [], idx = [], kL = [], kR = [];
  for (let i = 0; i <= N; i++) { const p = curve.getPoint(i / N), t = curve.getTangent(i / N), n = new THREE.Vector3(-t.z, 0, t.x).normalize(); pos.push(p.x + n.x * w / 2, 0.03, p.z + n.z * w / 2, p.x - n.x * w / 2, 0.03, p.z - n.z * w / 2); kL.push(new THREE.Vector3(p.x + n.x * w / 2, 0.06, p.z + n.z * w / 2)); kR.push(new THREE.Vector3(p.x - n.x * w / 2, 0.06, p.z - n.z * w / 2)); if (i) { const a = i * 2 - 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const g = new THREE.Group(); const m = new THREE.Mesh(geo, SAULO); m.receiveShadow = true; g.add(m);
  if (kerb) for (const k of [kL, kR]) g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(k), N, 0.08, 4), M(0xb8b2a6), 0, 0, 0));
  return bake(g, 'path');
}
// a playground: a soft red floor, a slide, two swings (they swing), a spring rider
export function playground() {
  const g = new THREE.Group();
  g.add(box(9, 0.06, 7, M(0xb8564a, { roughness: 1 }), 0, 0.03, 0));
  for (const [x, z, w, d] of [[0, -3.5, 9, 0.1], [0, 3.5, 9, 0.1], [-4.5, 0, 0.1, 7], [4.5, 0, 0.1, 7]]) g.add(box(w, 0.7, d, M(0x2f5a4a), x, 0.35, z)); // the low fence
  const sl = new THREE.Group(); sl.add(box(1.2, 1.6, 1.2, M(0x3f8a9a), 0, 0.8, 0)); sl.add(box(1.3, 0.1, 1.3, M(0xf2c94c), 0, 1.65, 0));
  const chute = box(0.6, 0.06, 2.6, M(0xf2c94c), 0, 0.9, 1.7); chute.rotation.x = 0.55; sl.add(chute); for (let k = 0; k < 5; k++) sl.add(box(0.6, 0.06, 0.2, M(0xd2402e), 0, 0.3 * k + 0.15, -0.8 - k * 0.15));
  sl.position.set(-2.3, 0, -0.6); g.add(sl);
  const frame = new THREE.Group(); for (const x of [-1.4, 1.4]) for (const s of [-1, 1]) frame.add(strut([x, 0, s * 0.7], [x, 2.5, 0], 0.05, M(0xd2402e))); frame.add(box(2.9, 0.1, 0.1, M(0xd2402e), 0, 2.5, 0));
  const swings = [-0.6, 0.6].map((x) => { const s = new THREE.Group(); s.position.set(x, 2.45, 0); for (const z of [-0.18, 0.18]) s.add(box(0.02, 1.8, 0.02, M(0x9aa0a6), 0, -0.9, z)); s.add(box(0.5, 0.05, 0.4, M(0x2a2a2c), 0, -1.8, 0)); s.userData.dynamic = true; frame.add(s); return s; });
  frame.position.set(2.2, 0, -1.2); frame.rotation.y = Math.PI / 2; g.add(frame);
  const rider = new THREE.Group(); rider.add(cyl(0.08, 0.08, 0.5, M(0x9aa0a6), 0, 0.25, 0, 6)); const horse = mesh(new THREE.SphereGeometry(0.3, 10, 8), M(0xf2c94c), 0, 0.65, 0); horse.scale.set(1.5, 0.8, 0.7); rider.add(horse); rider.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), M(0xf2c94c), 0.4, 0.9, 0)); rider.position.set(1.5, 0, 2.2); g.add(rider);
  bake(g, 'playground');
  g.userData.update = (t) => swings.forEach((s, i) => (s.rotation.z = Math.sin(t * 1.8 + i * 1.3) * 0.45));
  return g;
}
// a curving bench covered in broken tiles (trencadís), like Park Güell's
export function mosaicBench({ len = 5 } = {}) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector2(-len / 2 + u * len, Math.sin(u * Math.PI * 2) * 0.6)); }
  const seat = new THREE.Shape(); pts.forEach((p, i) => (i ? seat.lineTo(p.x, p.y) : seat.moveTo(p.x, p.y))); for (let i = pts.length - 1; i >= 0; i--) seat.lineTo(pts[i].x, pts[i].y + 0.55);
  g.add(mesh(new THREE.ExtrudeGeometry(seat, { depth: 0.45, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }).rotateX(-Math.PI / 2), TRENCADIS, 0, 0, 0));
  const backPts = pts.map((p) => new THREE.Vector3(p.x, 0.8, -p.y - 0.5));
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(backPts), 40, 0.16, 6), TRENCADIS, 0, 0, 0));
  return bake(g, 'mosaicBench');
}
// an iron drinking fountain (four spouts round a fluted column, a lamp on top) over a grate
export function fountain() {
  const g = new THREE.Group(), iron = M(0x2f3a34, { roughness: 0.4, metalness: 0.3 });
  g.add(box(1.2, 0.04, 1.2, M(0x3a3a3a), 0, 0.02, 0));
  g.add(cyl(0.16, 0.22, 1.1, iron, 0, 0.55, 0, 10)); g.add(cyl(0.25, 0.2, 0.15, iron, 0, 1.15, 0, 10));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, sp = cyl(0.025, 0.02, 0.22, M(0xc9a24a, { metalness: 0.6, roughness: 0.3 }), Math.cos(a) * 0.25, 0.85, Math.sin(a) * 0.25, 6); sp.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); g.add(sp); }
  g.add(cyl(0.06, 0.08, 1.4, iron, 0, 1.9, 0, 8)); g.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), GLOW.bulb, 0, 2.7, 0)); g.add(mesh(new THREE.ConeGeometry(0.24, 0.2, 8), iron, 0, 2.95, 0));
  return bake(g, 'fountain');
}

// ---------- the street ----------
// Falqués's lamp on Avinguda de Gaudí: a tall stone-footed iron column, four curling arms and a fifth light on top
export function falquesLamp() {
  const g = new THREE.Group(), iron = M(0x24302a, { roughness: 0.4, metalness: 0.3 });
  g.add(cyl(0.45, 0.55, 0.9, M(0xd8cdb8), 0, 0.45, 0, 8)); g.add(cyl(0.18, 0.28, 0.5, iron, 0, 1.15, 0, 8));
  g.add(cyl(0.11, 0.15, 4.4, iron, 0, 3.6, 0, 8)); for (const y of [2.0, 3.4, 4.8]) g.add(mesh(new THREE.TorusGeometry(0.15, 0.04, 5, 10).rotateX(Math.PI / 2), iron, 0, y, 0));
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 5.4, 0], [c * 0.5, 5.9, s * 0.5], [c * 1.0, 5.8, s * 1.0], [c * 1.15, 5.5, s * 1.15]].map((p) => new THREE.Vector3(...p))), 12, 0.04, 5), iron, 0, 0, 0));
    g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), GLOW.bulb, c * 1.15, 5.25, s * 1.15)); g.add(mesh(new THREE.ConeGeometry(0.2, 0.18, 8), iron, c * 1.15, 5.52, s * 1.15));
  }
  g.add(mesh(new THREE.SphereGeometry(0.26, 10, 8), GLOW.bulb, 0, 6.3, 0)); g.add(mesh(new THREE.ConeGeometry(0.26, 0.4, 8), iron, 0, 6.65, 0)); g.add(cyl(0.02, 0.02, 0.3, iron, 0, 6.95, 0, 4));
  return bake(g, 'falques');
}
// プラタナス: a mottled trunk (cream and grey patches) and a broad, high crown
export function planeTree({ seed = 1, h = 9 } = {}) {
  return treeMesh('plane' + seed + h, () => {
    const rnd = seeded(seed + 51), lean = (rnd() - 0.5) * 0.6;
    const parts = [part(tube([[0, 0, 0], [lean * 0.3, h * 0.45, 0], [lean, h * 0.7, 0.1]], 0.32, 0.18, 7), (p) => (Math.sin(p.x * 9 + p.y * 3) * Math.cos(p.z * 8 - p.y * 2) > 0.2 ? '#d8d0b8' : '#8a8478'))];
    for (const a of [0.3, 2.4, 4.4]) parts.push(part(tube([[lean, h * 0.62, 0], [lean + Math.cos(a) * 1.4, h * 0.82, Math.sin(a) * 1.4]], 0.14, 0.08, 5), '#9a9488'));
    for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI * 2, r = 1.0 + rnd() * 1.6; parts.push(part(ellipsoid(1.7 + rnd() * 0.6, 1.3, 1.7 + rnd() * 0.6, 7), leafy('#6a9a4a', '#7fae5a'), { pos: [lean + Math.cos(a) * r, h * (0.8 + rnd() * 0.25), Math.sin(a) * r] })); }
    return parts;
  }, { mode: 'sway', amp: 0.04, freq: 0.7, waves: 0.1, z0: h * 0.5, len: h * 1.2 });
}
// the iron grate round a street tree's foot
export function treeGrate() {
  const g = new THREE.Group(), iron = M(0x3a3a3a, { roughness: 0.6, metalness: 0.3 });
  for (let k = 0; k < 9; k++) { g.add(box(1.6, 0.03, 0.06, iron, 0, 0.035, -0.8 + k * 0.2)); g.add(box(0.06, 0.03, 1.6, iron, -0.8 + k * 0.2, 0.035, 0)); }
  g.add(cyl(0.45, 0.45, 0.04, M(0x5a4a3a), 0, 0.03, 0, 10));
  return bake(g, 'grate');
}
// a bike-share dock: a red post with its screen, a row of red-and-white bikes in their stands
export function bikeDock({ n = 6 } = {}) {
  const g = new THREE.Group(), red = M(0xc8283a, { roughness: 0.4 });
  g.add(rbox(0.4, 1.6, 0.3, 0.05, red, -0.8, 0.8, 0)); g.add(box(0.28, 0.2, 0.02, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9ad0f0, emissiveIntensity: 0.4 }), -0.8, 1.3, 0.16));
  g.add(box(n * 0.75, 0.12, 0.2, M(0x9aa0a6), -0.4 + n * 0.375, 0.06, 0));
  for (let i = 0; i < n; i++) { const x = -0.2 + i * 0.75; g.add(box(0.08, 0.6, 0.08, red, x, 0.36, 0)); }
  bake(g, 'bikeDock');
  for (let i = 0; i < n - 1; i++) { const b = bicycle({ color: i % 2 ? 0xf6f4ee : 0xc8283a, role: null }); b.position.set(-0.2 + i * 0.75, 0, 0.6); b.rotation.y = Math.PI / 2; b.scale.setScalar(0.95); g.add(b); }
  return g;
}
// the big street bins: grey, yellow, blue, green, brown
export function containers() {
  const g = new THREE.Group();
  [0x6a6e72, 0xf2c94c, 0x2f5a8a, 0x3f8a3a, 0x8a5a3a].forEach((c, i) => { const x = (i - 2) * 1.5; g.add(rbox(1.35, 1.4, 1.1, 0.12, M(c, { roughness: 0.6 }), x, 0.85, 0)); g.add(rbox(1.4, 0.12, 1.15, 0.05, M(c, { roughness: 0.5 }), x, 1.6, -0.02)); for (const s of [-0.5, 0.5]) g.add(cyl(0.12, 0.12, 0.06, M(0x2a2a2c), x + s, 0.12, 0.55, 8)).children.at(-1).rotation.x = Math.PI / 2; });
  return bake(g, 'containers');
}
// a painter's easel with a canvas of the basilica (and a stool)
export function easel() {
  const g = new THREE.Group(), wood = M(0x9a7a5a);
  for (const s of [-1, 1]) { const l = box(0.04, 1.7, 0.04, wood, s * 0.3, 0.85, 0.1); l.rotation.z = -s * 0.15; g.add(l); }
  const bl = box(0.04, 1.7, 0.04, wood, 0, 0.8, -0.35); bl.rotation.x = 0.35; g.add(bl);
  g.add(box(0.8, 0.04, 0.08, wood, 0, 0.75, 0.14));
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, 128, 128); drawSketch(x, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  g.add(box(0.7, 0.7, 0.03, M(0xf6f4ee), 0, 1.15, 0.12)); g.add(mesh(new THREE.PlaneGeometry(0.66, 0.66), new THREE.MeshStandardMaterial({ map: t }), 0, 1.15, 0.14));
  g.add(cyl(0.18, 0.18, 0.04, wood, 0.2, 0.5, 0.9, 10)); for (const a of [0, 2.1, 4.2]) g.add(cyl(0.02, 0.02, 0.5, wood, 0.2 + Math.cos(a) * 0.12, 0.25, 0.9 + Math.sin(a) * 0.12, 4));
  return bake(g, 'easel');
}
// a row of bollards (the avenue keeps the cars out)
export function bollards(n = 6, gap = 1.6) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { g.add(cyl(0.09, 0.11, 0.9, M(0x5a5a5a, { metalness: 0.4, roughness: 0.4 }), (i - (n - 1) / 2) * gap, 0.45, 0, 8)); g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), M(0x5a5a5a, { metalness: 0.4, roughness: 0.4 }), (i - (n - 1) / 2) * gap, 0.92, 0)); } return bake(g, 'bollards'); }
export const SHOPS = { bakery, fruiteria, tapasBar, gelateria, pharmacy, souvenirs };

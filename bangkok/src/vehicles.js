// Vehicles of the street (bangkok/DESIGN.md §8): tuk-tuks, taxis, scooters, a motorbike with a sidecar stall.
// The nose points +X; userData.speed (units a second) turns the wheels; kind 'car' keeps them out of bakeStatic.
import * as THREE from 'three';
import { person } from '../../airport/src/parts.js';
import { BK, M, mat, bx, rb, cy, sp, put, addTo, SPH, signPlane } from './common.js';
import * as F from './foods.js';
import './people.js';

const chrome = mat(0xd8dce2, { metalness: 0.8, roughness: 0.2 });
const tinted = mat(0x1d2a3a, { roughness: 0.1, metalness: 0.3 });

// a wheel spinning about Z: tyre, rim and hub
function wheel(parent, r, w, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const t = cy(g, r, r, w, M.iron, 0, 0, 0, 16); t.rotation.x = Math.PI / 2;
  const rim = cy(g, r * 0.6, r * 0.6, w + 0.01, chrome, 0, 0, 0, 10); rim.rotation.x = Math.PI / 2;
  bx(g, r * 1.1, r * 0.12, w + 0.02, M.darkSteel, 0, 0, 0); // a spoke, so the turning shows
  g.userData.dynamic = true;
  parent.add(g);
  return g;
}
// wheels turn with userData.speed; extra(t, dt) runs too
function rolling(g, wheels, r, extra) {
  let dist = 0;
  g.userData.speed = g.userData.speed ?? 0;
  g.userData.update = (t, dt = 1 / 60) => { dist += g.userData.speed * dt; for (const w of wheels) w.rotation.z = -dist / r; extra?.(t, dt); };
  g.userData.kind = 'car';
  return g;
}

// ---------- tuk-tuk ----------
export const TUK_LIVERIES = {
  blue: { body: 0x2c5aa0, roof: 0x2c5aa0, seat: 0xd9342b },
  green: { body: 0x2f8a4a, roof: 0xf2b84b, seat: 0x1c2232 },
  red: { body: 0xc8283a, roof: 0x1c2232, seat: 0xf2b84b },
};
// 2.1 long, 1.05 wide, 1.6 tall: driver up front, a bench for three behind, a roof trimmed with chasing bulbs
export function tuktuk(livery = TUK_LIVERIES.blue, { driver = true, bulbs = true } = {}) {
  const g = new THREE.Group();
  const body = mat(livery.body, { roughness: 0.35, metalness: 0.2 }), roof = mat(livery.roof, { roughness: 0.4 }), seat = mat(livery.seat, { roughness: 0.6 });
  bx(g, 1.85, 0.08, 0.95, M.darkSteel, -0.1, 0.3, 0);
  // the nose: one wheel, a cowl, headlight, the bars, a windscreen
  rb(g, 0.4, 0.45, 0.42, 0.08, body, 0.82, 0.55, 0);
  sp(g, 0.07, M.glow(0xfff4d0, 1.3), 1.03, 0.62, 0);
  rb(g, 0.3, 0.06, 0.2, 0.03, body, 0.88, 0.32, 0); // mudguard
  const bar = cy(g, 0.014, 0.014, 0.6, chrome, 0.66, 0.98, 0, 6); bar.rotation.x = Math.PI / 2;
  cy(g, 0.02, 0.02, 0.4, chrome, 0.7, 0.8, 0, 6);
  const scr = bx(g, 0.02, 0.36, 0.7, mat(0xd8eef2, { transparent: true, opacity: 0.35, roughness: 0.05 }), 0.76, 1.18, 0); scr.rotation.z = 0.25;
  // the driver's seat and the passengers' bench with a back
  rb(g, 0.3, 0.1, 0.36, 0.04, seat, 0.42, 0.62, 0);
  rb(g, 0.5, 0.12, 0.92, 0.04, seat, -0.4, 0.55, 0);
  rb(g, 0.1, 0.48, 0.92, 0.04, seat, -0.68, 0.82, 0);
  // sides with a chrome strip, the engine box at the back, tail lights
  for (const s of [-1, 1]) {
    bx(g, 1.4, 0.32, 0.03, body, -0.1, 0.48, s * 0.48);
    bx(g, 1.4, 0.03, 0.035, chrome, -0.1, 0.64, s * 0.48);
    bx(g, 0.02, 0.06, 0.1, M.glow(0xff3a2a, 1.4), -0.83, 0.48, s * 0.36);
  }
  rb(g, 0.25, 0.3, 0.9, 0.05, body, -0.78, 0.45, 0);
  cy(g, 0.03, 0.03, 0.25, chrome, -0.9, 0.3, 0.3, 6).rotation.z = Math.PI / 2; // exhaust
  // posts and the roof, a little sign
  for (const [x, z] of [[0.7, 0.42], [0.7, -0.42], [-0.72, 0.46], [-0.72, -0.46]]) cy(g, 0.015, 0.015, 1.15, chrome, x, 0.95, z, 6);
  rb(g, 1.7, 0.08, 1.05, 0.03, roof, -0.02, 1.56, 0);
  bx(g, 1.72, 0.12, 1.06, roof, -0.02, 1.47, 0); // the valance round the roof
  const sign = signPlane('tuktuk', 0.5, 0.14); sign.position.set(0.85, 1.47, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
  const wheels = [wheel(g, 0.17, 0.1, 0.85, 0.17, 0), wheel(g, 0.18, 0.12, -0.55, 0.18, 0.5), wheel(g, 0.18, 0.12, -0.55, 0.18, -0.5)];
  // bulbs along the valance: their colours run round the roof
  let chase = null;
  if (bulbs) {
    const pts = [];
    for (let i = 0; i < 12; i++) pts.push([-0.86 + i * 0.145, 1.43, 0.535], [-0.86 + i * 0.145, 1.43, -0.535]);
    for (let i = 0; i < 6; i++) pts.push([0.845, 1.43, -0.45 + i * 0.18]);
    const im = new THREE.InstancedMesh(SPH(0.022, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), pts.length);
    const m4 = new THREE.Matrix4();
    pts.forEach(([x, y, z], i) => im.setMatrixAt(i, m4.makeTranslation(x, y, z)));
    g.add(im);
    const cols = [BK.neonPink, BK.neonBlue, BK.neonGreen, BK.bulb].map((c) => new THREE.Color(c));
    let last = -1;
    chase = (t) => { const k = Math.floor(t * 4); if (k === last) return; last = k; for (let i = 0; i < pts.length; i++) im.setColorAt(i, cols[(i + k) % cols.length]); im.instanceColor.needsUpdate = true; };
    chase(0);
  }
  let drv = null;
  if (driver) { drv = person('motoTaxi', { mode: 'sit', seed: 70 }); drv.position.set(0.4, 0.32, 0); g.add(drv); }
  return rolling(g, wheels, 0.18, (t) => { chase?.(t); drv?.userData.update(t); });
}

// ---------- taxi ----------
// A saloon 3.4 long. 'pink' all over, or 'greenYellow' (green on top, yellow below). The roof sign says TAXI-METER;
// the red "vacant" lamp in the windscreen is on when state.vacant.
export function taxi(kind = 'pink') {
  const g = new THREE.Group();
  const top = mat(kind === 'pink' ? 0xf07aa8 : 0x2f8a4a, { roughness: 0.3, metalness: 0.3 });
  const low = mat(kind === 'pink' ? 0xf07aa8 : 0xf2c430, { roughness: 0.3, metalness: 0.3 });
  rb(g, 3.4, 0.48, 1.35, 0.14, low, 0, 0.5, 0);
  rb(g, 0.9, 0.06, 1.3, 0.03, top, 1.15, 0.76, 0); // bonnet
  rb(g, 0.65, 0.06, 1.3, 0.03, top, -1.35, 0.76, 0); // boot
  rb(g, 1.85, 0.46, 1.22, 0.12, tinted, -0.15, 0.98, 0); // the glass house
  rb(g, 1.5, 0.08, 1.24, 0.04, top, -0.2, 1.22, 0); // roof
  for (const x of [-0.15]) for (const s of [-1, 1]) bx(g, 0.1, 0.42, 0.02, top, x, 0.98, s * 0.615); // B-pillars
  for (const s of [-1, 1]) {
    sp(g, 0.08, M.glow(0xfff4d0, 1.2), 1.68, 0.56, s * 0.48).scale.set(0.4, 0.6, 1);
    bx(g, 0.03, 0.1, 0.22, M.glow(0xff3a2a, 1.3), -1.7, 0.6, s * 0.48);
    bx(g, 0.12, 0.05, 0.03, M.darkSteel, 0.35, 0.72, s * 0.69); // door handles
  }
  bx(g, 0.04, 0.16, 0.7, M.darkSteel, 1.7, 0.45, 0); // grille
  for (const x of [1.72, -1.72]) bx(g, 0.06, 0.12, 1.36, M.darkSteel, x, 0.32, 0); // bumpers
  // roof sign, the vacant lamp
  bx(g, 0.24, 0.16, 0.6, M.white, -0.2, 1.34, 0);
  for (const s of [-1, 1]) { const p = signPlane('taxi', 0.58, 0.14); p.position.set(-0.2 + s * 0.121, 1.34, 0); p.rotation.y = s * Math.PI / 2; g.add(p); }
  const vacant = bx(g, 0.02, 0.06, 0.12, M.glow(0xff2a2a, 2), 0.72, 0.86, 0.38);
  const wheels = [[1.05, 0.62], [1.05, -0.62], [-1.1, 0.62], [-1.1, -0.62]].map(([x, z]) => wheel(g, 0.26, 0.18, x, 0.26, z));
  g.userData.state = { vacant: true };
  return rolling(g, wheels, 0.26, () => { vacant.visible = !!g.userData.state.vacant; });
}

// ---------- scooter and motorbike taxi ----------
export function scooter({ color = 0xd9342b, rider = null, pillion = null } = {}) {
  const g = new THREE.Group();
  const paint = mat(color, { roughness: 0.3, metalness: 0.3 });
  bx(g, 0.5, 0.06, 0.24, M.darkSteel, 0.05, 0.3, 0); // floorboard
  const shield = rb(g, 0.14, 0.62, 0.34, 0.05, paint, 0.38, 0.58, 0); shield.rotation.z = -0.2;
  cy(g, 0.025, 0.025, 0.5, chrome, 0.5, 0.55, 0, 6).rotation.z = -0.35; // the fork
  const bar = cy(g, 0.015, 0.015, 0.55, M.ink, 0.44, 0.98, 0, 6); bar.rotation.x = Math.PI / 2;
  sp(g, 0.05, M.glow(0xfff4d0, 1.3), 0.5, 0.92, 0);
  rb(g, 0.62, 0.28, 0.3, 0.1, paint, -0.25, 0.52, 0);
  rb(g, 0.55, 0.1, 0.28, 0.04, mat(0x1d1f23), -0.2, 0.7, 0);
  bx(g, 0.03, 0.05, 0.12, M.glow(0xff3a2a, 1.3), -0.57, 0.6, 0);
  cy(g, 0.03, 0.025, 0.3, chrome, -0.35, 0.25, 0.14, 6).rotation.z = Math.PI / 2 - 0.2;
  const wheels = [wheel(g, 0.2, 0.08, 0.55, 0.2, 0), wheel(g, 0.2, 0.08, -0.45, 0.2, 0)];
  const people = [];
  if (rider) { const p = person(rider, { mode: 'sit', seed: 71 }); p.position.set(-0.12, 0.4, 0); g.add(p); people.push(p); }
  if (pillion) { const p = person(pillion, { mode: 'sit', seed: 72 }); p.position.set(-0.42, 0.42, 0); g.add(p); people.push(p); }
  return rolling(g, wheels, 0.2, (t) => { for (const p of people) p.userData.update(t); });
}
export const motoTaxi = () => scooter({ color: 0x2c3a57, rider: 'motoTaxi', pillion: 'thaiStudent' });

// ---------- motorbike with a sidecar stall ----------
// The bike on the left, a steel food box on a platform to its right (+Z) with its own wheel and a parasol.
// food: 'meatballs' (luk chin skewers and the fryer) or 'fruit' (fruit sticks on ice)
export function sidecarStall({ food = 'meatballs', color = 0x3a7fd0 } = {}) {
  const g = new THREE.Group();
  const bike = scooter({ color, rider: 'griller' });
  g.add(bike);
  const side = new THREE.Group(); side.position.z = 0.75; g.add(side);
  bx(side, 1.3, 0.06, 0.8, M.darkSteel, -0.1, 0.36, 0);
  bx(side, 0.06, 0.04, 0.8, M.darkSteel, -0.1, 0.36, -0.4);
  rb(side, 1.2, 0.4, 0.7, 0.03, M.steel, -0.1, 0.6, 0);
  const sideWheel = wheel(side, 0.18, 0.08, -0.2, 0.18, 0.42);
  // a glass case on top, with the food inside
  const top = 0.8;
  for (const x of [-0.65, 0.45]) for (const z of [-0.32, 0.32]) bx(side, 0.02, 0.4, 0.02, M.steel, x, top + 0.2, z);
  bx(side, 1.12, 0.4, 0.005, M.glass, -0.1, top + 0.2, 0.32);
  bx(side, 1.12, 0.02, 0.66, M.steel, -0.1, top + 0.41, 0);
  if (food === 'fruit') { const ice = addTo(side, new THREE.Group()); ice.position.set(-0.1, top, 0); bx(ice, 1.0, 0.04, 0.55, mat(0xf4fbff), 0, 0.02, 0); addTo(ice, F.fruitRows(0.04)).position.x = 0.0; }
  else { addTo(side, F.fryer()).position.set(0.2, top, 0); for (let i = 0; i < 2; i++) addTo(side, F.lukChin()).position.set(-0.35, top + 0.02 + i * 0.04, -0.05 + i * 0.1); }
  // a parasol on a pole from the platform
  cy(side, 0.015, 0.015, 1.7, M.steel, -0.6, 1.2, -0.3, 6);
  const umb = put(side, new THREE.ConeGeometry(0.8, 0.28, 10, 1, true), mat(0xf2b84b, { side: THREE.DoubleSide, roughness: 0.7 }), -0.6, 2.05, -0.3);
  umb.castShadow = true;
  g.userData.speed = 0;
  const bikeUpdate = bike.userData.update;
  let dist = 0;
  g.userData.update = (t, dt = 1 / 60) => { bike.userData.speed = g.userData.speed; bikeUpdate(t, dt); dist += g.userData.speed * dt; sideWheel.rotation.z = -dist / 0.18; };
  g.userData.kind = 'car';
  return g;
}

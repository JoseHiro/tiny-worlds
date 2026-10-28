// Roads & towns — vehicles (town/DESIGN.md §2.3). Same small scale as the airport cars; nose +X, wheels on y = 0.
// Each vehicle's userData has: wheels, update(dt) (wheels turn, brake lights, turn signals), and what the traffic
// sets on it — speed, braking, blink ('L' | 'R' | null).
import * as THREE from 'three';
import { mat, mesh, rbox, box, cyl, PALETTE, person } from '../../airport/src/parts.js';
import { compactRig } from '../../airport/src/merge.js';

const glass = mat(PALETTE.glass, { roughness: 0.2 });
const dark = mat(0x2a2d33, { roughness: 0.8 });
const chrome = mat(0xc9ccd1, { roughness: 0.3, metalness: 0.6 });
const head = mat(0xfff4d6, { emissive: 0xfff1c8, emissiveIntensity: 0.6 });

// number plates: one canvas texture per kind, shared by every car
const plates = new Map();
function plateTex(kind) {
  if (plates.has(kind)) return plates.get(kind);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  const green = kind === 'commercial' || kind === 'taxi'; // business plates are green with white letters
  g.fillStyle = green ? '#2f6b45' : '#f6f4ec'; g.fillRect(0, 0, 128, 64);
  g.strokeStyle = green ? '#f6f4ec' : '#3a6b45'; g.lineWidth = 4; g.strokeRect(3, 3, 122, 58);
  g.fillStyle = green ? '#f6f4ec' : '#2f5a3b';
  g.font = 'bold 15px sans-serif'; g.textAlign = 'center';
  g.fillText('沖縄 300', 64, 22);
  g.font = 'bold 30px sans-serif';
  g.fillText(kind === 'rental' ? 'わ 12-34' : green ? 'あ 90-12' : 'さ 56-78', 64, 54);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  plates.set(kind, t);
  return t;
}
const plateMat = (kind) => mat(0xffffff, { map: plateTex(kind), roughness: 0.5 });

function wheel(r, w, x, z) {
  const g = new THREE.Group();
  g.position.set(x, r, z);
  const tire = mesh(new THREE.CylinderGeometry(r, r, w, 18).rotateX(Math.PI / 2), mat(PALETTE.tire, { roughness: 0.9 }));
  const hub = mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 12).rotateX(Math.PI / 2), chrome);
  const spoke = mesh(new THREE.BoxGeometry(r * 0.9, r * 0.14, w + 0.03), mat(PALETTE.grey));
  g.add(tire, hub, spoke);
  g.userData.radius = r;
  return g;
}

// lamps that change: brake lights and turn signals get their own materials per vehicle
function lamps(g, ud, { front, back, y, z, w = 0.22 }) {
  const brake = new THREE.MeshStandardMaterial({ color: 0x8a1f1f, emissive: 0xff2a1a, emissiveIntensity: 0.15, roughness: 0.4 });
  const amberL = new THREE.MeshStandardMaterial({ color: 0xb87a1c, emissive: 0xffa21a, emissiveIntensity: 0, roughness: 0.4 });
  const amberR = amberL.clone();
  for (const s of [1, -1]) {
    g.add(box(0.04, 0.12, w, head, front, y, s * z));
    g.add(box(0.04, 0.16, w * 0.8, brake, back, y + 0.04, s * z));
    const am = s < 0 ? amberL : amberR; // left is −z (facing +X)
    g.add(box(0.05, 0.07, 0.1, am, front - 0.01, y - 0.1, s * (z + 0.06)));
    g.add(box(0.05, 0.07, 0.1, am, back + 0.01, y - 0.1, s * (z + 0.06)));
    g.add(box(0.16, 0.05, 0.03, am, front - 0.55, y + 0.05, s * (z + 0.28))); // side repeater
  }
  Object.assign(ud, { brake, amberL, amberR, blinkT: 0 });
}

function rig(g, ud) {
  ud.speed = 0; ud.braking = false; ud.blink = null;
  ud.update = (dt) => {
    for (const w of ud.wheels) w.rotation.z -= (ud.speed * dt) / w.userData.radius;
    ud.brake.emissiveIntensity = ud.braking ? 1.6 : 0.15;
    ud.blinkT += dt;
    const on = Math.floor(ud.blinkT * 2.6) % 2 === 0;
    ud.amberL.emissiveIntensity = ud.blink === 'L' && on ? 2.2 : 0;
    ud.amberR.emissiveIntensity = ud.blink === 'R' && on ? 2.2 : 0;
    if (ud.door) { ud.doorT += ((ud.doorOpen ? 1 : 0) - ud.doorT) * Math.min(1, dt * 3); ud.door.position.set(ud.door.userData.x0 - ud.doorT * 0.62, 0, -ud.doorT * 0.05); }
  };
  return compactRig(g);
}

// ---------- ミニバン (the rental car, and a common family car) ----------
export const MINIVAN_COLORS = { pearl: 0xf3f1ea, silver: 0xc3c7cc, navy: 0x2c3a57, wine: 0x7a2f3a, sky: 0x8db6d6, black: 0x26282d };
export function minivan({ color = MINIVAN_COLORS.pearl, rental = true } = {}) {
  const g = new THREE.Group();
  const ud = (g.userData = { kind: 'car', vehicle: 'minivan', wheels: [] });
  const paint = mat(color, { roughness: 0.35, metalness: 0.15 });
  const L = 2.4, W = 1.05;
  // body, and a painted cabin with the windows set into it; a raked windscreen over a short bonnet
  g.add(rbox(L, 0.62, W, 0.16, paint, 0, 0.55, 0));
  g.add(rbox(1.86, 0.58, W - 0.06, 0.14, paint, -0.24, 1.12, 0));
  for (const s of [1, -1]) {
    g.add(box(0.5, 0.36, 0.02, glass, 0.38, 1.14, s * (W / 2 - 0.02)));  // front door window
    g.add(box(0.56, 0.36, 0.02, glass, -0.22, 1.14, s * (W / 2 - 0.02))); // sliding door window
    g.add(box(0.5, 0.34, 0.02, glass, -0.82, 1.14, s * (W / 2 - 0.02)));  // rear quarter
  }
  g.add(box(0.02, 0.36, W - 0.3, glass, -L / 2 + 0.03, 1.12, 0)); // back window
  // the raked front: a painted wedge from the cabin's front edge down to the bonnet, glass laid on its slope
  const wedge = new THREE.Shape([new THREE.Vector2(0.62, 0.84), new THREE.Vector2(1.0, 0.84), new THREE.Vector2(0.62, 1.38)]);
  g.add(mesh(new THREE.ExtrudeGeometry(wedge, { depth: W - 0.08, bevelEnabled: false }).translate(0, 0, -(W - 0.08) / 2), paint));
  const shield = box(0.03, 0.6, W - 0.16, glass, 0.82, 1.11, 0);
  shield.rotation.z = Math.atan2(0.38, 0.54);
  g.add(shield);
  // bumpers, grille, mirrors
  g.add(rbox(0.12, 0.2, W + 0.02, 0.05, dark, L / 2 - 0.02, 0.32, 0));
  g.add(rbox(0.12, 0.2, W + 0.02, 0.05, dark, -L / 2 + 0.02, 0.32, 0));
  g.add(box(0.03, 0.12, 0.5, dark, L / 2 + 0.005, 0.56, 0));
  for (const s of [1, -1]) g.add(rbox(0.1, 0.08, 0.12, 0.03, paint, 0.5, 0.9, s * (W / 2 + 0.05)));
  // plates
  const pm = plateMat(rental ? 'rental' : 'private');
  for (const [x, ry] of [[L / 2 + 0.03, Math.PI / 2], [-L / 2 - 0.03, -Math.PI / 2]]) {
    const p = mesh(new THREE.PlaneGeometry(0.34, 0.17), pm, x, 0.42, 0);
    p.rotation.y = ry;
    g.add(p);
  }
  // the sliding door on the left side (−z, the kerb side when we drive on the left): it slides back when open
  const door = new THREE.Group();
  door.add(box(0.62, 0.52, 0.02, paint, 0, 0.6, -W / 2 - 0.01));
  door.add(box(0.6, 0.4, 0.02, glass, 0, 1.1, -W / 2 - 0.0));
  door.add(box(0.1, 0.03, 0.02, chrome, 0.2, 0.72, -W / 2 - 0.025));
  door.userData.x0 = 0.1;
  door.position.x = 0.1;
  g.add(door);
  g.add(box(1.3, 0.012, 0.01, dark, -0.2, 0.86, -W / 2 - 0.005)); // the door rail
  Object.assign(ud, { door, doorT: 0, doorOpen: false });
  lamps(g, ud, { front: L / 2, back: -L / 2, y: 0.66, z: 0.36 });
  for (const x of [0.8, -0.78]) for (const z of [0.45, -0.45]) { const w = wheel(0.24, 0.2, x, z); ud.wheels.push(w); g.add(w); }
  return rig(g, ud);
}

// ---------- the rest of the vehicles (town/DESIGN.md §2.3) ----------


const tex = new Map();
function canvasMat(key, w, h, draw, extra = {}) {
  if (!tex.has(key)) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    tex.set(key, t);
  }
  return mat(0xffffff, { map: tex.get(key), roughness: 0.5, ...extra });
}
// glass panes on both sides: spans [[x, width], ...] at height y (centre), h tall
function sideGlass(g, spans, y, h, W) { for (const s of [1, -1]) for (const [x, w] of spans) g.add(box(w, h, 0.02, glass, x, y, s * (W / 2 - 0.01))); }
// a raked windscreen: a painted wedge from (x0, yTop) on the cabin down to (x1, yLow) on the bonnet, glass on its slope
function raked(g, paint, x0, x1, yLow, yTop, W, back = false) {
  const s = back ? -1 : 1;
  const w = new THREE.Shape([new THREE.Vector2(x0, yLow), new THREE.Vector2(x1, yLow), new THREE.Vector2(x0, yTop)]);
  g.add(mesh(new THREE.ExtrudeGeometry(w, { depth: W, bevelEnabled: false }).translate(0, 0, -W / 2), paint));
  const len = Math.hypot(x1 - x0, yTop - yLow);
  const sh = box(0.03, len * 0.92, W - 0.1, glass, (x0 + x1) / 2 + s * 0.012, (yLow + yTop) / 2, 0);
  sh.rotation.z = s * Math.atan2(Math.abs(x1 - x0), yTop - yLow);
  g.add(sh);
}
function wheelsAt(g, ud, xs, r, W, w = 0.18) { for (const x of xs) for (const z of [W / 2 - w / 2, -(W / 2 - w / 2)]) { const wh = wheel(r, w, x, z); ud.wheels.push(wh); g.add(wh); } }
function platesAt(g, L, y, kind = 'private') {
  const pm = plateMat(kind);
  for (const [x, ry] of [[L / 2 + 0.03, Math.PI / 2], [-L / 2 - 0.03, -Math.PI / 2]]) { const p = mesh(new THREE.PlaneGeometry(0.32, 0.16), pm, x, y, 0); p.rotation.y = ry; g.add(p); }
}
const bumpers = (g, L, W, y = 0.3) => { g.add(rbox(0.12, 0.18, W + 0.02, 0.05, dark, L / 2 - 0.02, y, 0)); g.add(rbox(0.12, 0.18, W + 0.02, 0.05, dark, -L / 2 + 0.02, y, 0)); };
const start = (vehicle, len) => { const g = new THREE.Group(); const ud = (g.userData = { kind: 'car', vehicle, wheels: [], len }); return [g, ud]; };
// a light bar whose two halves flash in turn (police, ambulance)
function lightBar(g, ud, x, y, W, colors = [0xff2a1a, 0xff2a1a]) {
  const a = new THREE.MeshStandardMaterial({ color: 0x5a1010, emissive: colors[0], emissiveIntensity: 0 }), b = a.clone();
  b.emissive.set(colors[1]);
  g.add(box(0.22, 0.1, W * 0.35, a, x, y, W * 0.2));
  g.add(box(0.22, 0.1, W * 0.35, b, x, y, -W * 0.2));
  g.add(box(0.26, 0.04, W * 0.8, dark, x, y - 0.06, 0));
  const prev = ud.update;
  ud.siren = true;
  ud.update = (dt) => { prev(dt); const k = Math.floor(ud.blinkT * 6) % 2; a.emissiveIntensity = ud.siren && k ? 3 : 0; b.emissiveIntensity = ud.siren && !k ? 3 : 0; };
}

// 乗用車（セダン）
export const CAR_COLORS = [0xf3f1ea, 0xc3c7cc, 0x2c3a57, 0x7a2f3a, 0x26282d, 0x8db6d6, 0x3f6b4f, 0xd9465b];
export function sedan({ color = CAR_COLORS[1], plate = 'private' } = {}) {
  const [g, ud] = start('sedan', 2.1);
  const paint = mat(color, { roughness: 0.35, metalness: 0.15 });
  const L = 2.1, W = 1.0;
  g.add(rbox(L, 0.44, W, 0.15, paint, 0, 0.44, 0));
  g.add(rbox(1.0, 0.36, W - 0.08, 0.12, paint, -0.16, 0.82, 0));
  raked(g, paint, 0.34, 0.68, 0.64, 1.0, W - 0.08);
  raked(g, paint, -0.66, -0.94, 0.64, 1.0, W - 0.08, true);
  sideGlass(g, [[0.12, 0.38], [-0.36, 0.4]], 0.84, 0.26, W - 0.08);
  bumpers(g, L, W);
  platesAt(g, L, 0.36, plate);
  lamps(g, ud, { front: L / 2, back: -L / 2, y: 0.52, z: 0.33, w: 0.2 });
  wheelsAt(g, ud, [0.66, -0.66], 0.22, W);
  return rig(g, ud);
}

// 軽自動車 (a tall little box)
export const KEI_COLORS = [0xbfe3e0, 0xf3e3b0, 0xf2c4cf, 0xf3f1ea, 0x9fb6d6];
export function keiCar({ color = KEI_COLORS[0] } = {}) {
  const [g, ud] = start('kei', 1.7);
  const paint = mat(color, { roughness: 0.4, metalness: 0.1 });
  const L = 1.7, W = 0.95;
  g.add(rbox(L, 0.5, W, 0.15, paint, 0, 0.45, 0));
  g.add(rbox(1.3, 0.58, W - 0.04, 0.16, paint, -0.18, 1.0, 0));
  raked(g, paint, 0.47, 0.72, 0.7, 1.25, W - 0.06);
  sideGlass(g, [[0.22, 0.42], [-0.3, 0.5]], 1.03, 0.36, W - 0.04);
  g.add(box(0.02, 0.34, W - 0.3, glass, -0.84, 1.02, 0));
  bumpers(g, L, W);
  platesAt(g, L, 0.36);
  lamps(g, ud, { front: L / 2, back: -L / 2, y: 0.55, z: 0.32, w: 0.16 });
  wheelsAt(g, ud, [0.56, -0.56], 0.2, W);
  return rig(g, ud);
}

// SUV
export function suv({ color = 0x3f6b4f } = {}) {
  const [g, ud] = start('suv', 2.3);
  const paint = mat(color, { roughness: 0.4, metalness: 0.15 });
  const L = 2.3, W = 1.1;
  g.add(rbox(L, 0.62, W, 0.12, paint, 0, 0.6, 0));
  g.add(rbox(1.5, 0.5, W - 0.06, 0.1, paint, -0.3, 1.15, 0));
  raked(g, paint, 0.45, 0.72, 0.9, 1.4, W - 0.06);
  sideGlass(g, [[0.2, 0.4], [-0.3, 0.46], [-0.82, 0.36]], 1.17, 0.34, W - 0.06);
  for (const s of [1, -1]) g.add(box(1.3, 0.04, 0.04, dark, -0.3, 1.43, s * 0.42)); // roof rails
  const spare = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 16).rotateZ(Math.PI / 2), mat(PALETTE.tire), -L / 2 - 0.08, 0.72, 0); g.add(spare);
  bumpers(g, L, W, 0.34);
  platesAt(g, L, 0.4);
  lamps(g, ud, { front: L / 2, back: -L / 2, y: 0.72, z: 0.38, w: 0.2 });
  wheelsAt(g, ud, [0.74, -0.72], 0.27, W, 0.22);
  return rig(g, ud);
}

// タクシー: a sedan with the roof sign (andon) and a door stripe
export function taxi({ color = 0xf2c94c } = {}) {
  const g = sedan({ color, plate: 'taxi' });
  g.userData.vehicle = 'taxi';
  const andon = canvasMat('taxi-andon', 128, 64, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#2c3a57'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText('TAXI', w / 2, 44); }, { emissive: 0xffffff, emissiveIntensity: 0.3 });
  g.add(box(0.36, 0.16, 0.12, andon, -0.16, 1.07, 0));
  for (const s of [1, -1]) g.add(box(1.6, 0.06, 0.01, mat(0x2fa58f), 0, 0.55, s * 0.505));
  return g;
}

// 路線バス: front and middle doors that open at stops, a destination sign
export function routeBus({ accent = 0x2fa58f, to = '那覇空港' } = {}) {
  const [g, ud] = start('routeBus', 5.6);
  ud.bus = true;
  const L = 5.6, W = 1.55;
  const shell = mat(0xf4f2ec, { roughness: 0.45 }), band = mat(accent, { roughness: 0.5 });
  g.add(rbox(L, 1.65, W, 0.18, shell, 0, 1.12, 0));
  g.add(box(L + 0.01, 0.16, W + 0.01, band, 0, 0.62, 0));
  sideGlass(g, [[1.6, 1.2], [0.2, 1.3], [-1.2, 1.3], [-2.4, 0.8]], 1.45, 0.62, W + 0.02);
  g.add(box(0.03, 0.8, W - 0.2, glass, L / 2 + 0.005, 1.35, 0)); // windscreen
  g.add(box(0.03, 0.5, W - 0.3, glass, -L / 2 - 0.005, 1.45, 0));
  const dest = canvasMat('dest|' + to, 256, 48, (c, w, h) => { c.fillStyle = '#16181c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb347'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.fillText(to + ' 行', w / 2, 34); }, { emissive: 0xffffff, emissiveIntensity: 0.6 });
  const ds = mesh(new THREE.PlaneGeometry(1.0, 0.2), dest, L / 2 + 0.02, 1.86, 0); ds.rotation.y = Math.PI / 2; g.add(ds);
  // doors on the left (−z, the kerb side): front and middle, they slide open
  const doors = [];
  for (const x of [2.15, -0.4]) {
    const d = new THREE.Group();
    d.add(box(0.7, 1.3, 0.03, glass, 0, 1.0, 0));
    d.add(box(0.72, 0.06, 0.04, band, 0, 1.66, 0));
    d.position.set(x, 0, -W / 2 - 0.02);
    d.userData.x0 = x;
    g.add(d);
    doors.push(d);
  }
  platesAt(g, L, 0.45, 'commercial');
  lamps(g, ud, { front: L / 2, back: -L / 2, y: 0.5, z: 0.6, w: 0.22 });
  wheelsAt(g, ud, [1.85, -1.75], 0.32, W, 0.24);
  Object.assign(ud, { doorOpen: false, doorT: 0 });
  rig(g, ud);
  const base = ud.update;
  ud.update = (dt) => {
    base(dt);
    ud.doorT += ((ud.doorOpen ? 1 : 0) - ud.doorT) * Math.min(1, dt * 3);
    for (const d of doors) { d.position.x = d.userData.x0 - ud.doorT * 0.62; d.position.z = -W / 2 - 0.02 - ud.doorT * 0.06; }
  };
  return g;
}

// 観光バス: tall, big windows, a bright livery (a made-up company)
export function tourBus({ a = 0xe8673c, b = 0x2c3a57 } = {}) {
  const [g, ud] = start('tourBus', 6.0);
  const L = 6.0, W = 1.6;
  const shell = mat(0xf4f2ec, { roughness: 0.4 });
  g.add(rbox(L, 1.9, W, 0.2, shell, 0, 1.27, 0));
  const livery = canvasMat('tour|' + a + b, 512, 128, (c, w, h) => {
    c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#' + a.toString(16).padStart(6, '0'); c.beginPath(); c.moveTo(0, h); c.bezierCurveTo(w * 0.3, h * 0.2, w * 0.6, h * 0.9, w, h * 0.1); c.lineTo(w, h); c.fill();
    c.fillStyle = '#' + b.toString(16).padStart(6, '0'); c.font = 'italic bold 30px sans-serif'; c.fillText('Ryukyu Blue Tours', 24, 44);
  });
  for (const s of [1, -1]) { const p = mesh(new THREE.PlaneGeometry(L - 0.4, 0.8), livery, 0, 0.7, s * (W / 2 + 0.01)); if (s < 0) p.rotation.y = Math.PI; g.add(p); }
  sideGlass(g, [[1.8, 1.5], [0.15, 1.6], [-1.55, 1.6], [-2.7, 0.5]], 1.72, 0.7, W + 0.02);
  g.add(box(0.03, 0.95, W - 0.18, glass, L / 2 + 0.005, 1.6, 0));
  platesAt(g, L, 0.45, 'commercial');
  lamps(g, ud, { front: L / 2, back: -L / 2, y: 0.55, z: 0.62, w: 0.22 });
  wheelsAt(g, ud, [2.0, -1.6, -2.3], 0.33, W, 0.24);
  return rig(g, ud);
}

// 軽トラック: a little flatbed; load: 'cane' (a bundle of sugar cane) or null
export function keiTruck({ load = 'cane' } = {}) {
  const [g, ud] = start('keiTruck', 1.8);
  const paint = mat(0xf3f1ea, { roughness: 0.4 });
  const L = 1.8, W = 0.95;
  g.add(rbox(0.6, 0.95, W, 0.12, paint, 0.6, 0.78, 0));
  g.add(box(0.03, 0.4, W - 0.12, glass, 0.905, 1.0, 0));
  sideGlass(g, [[0.62, 0.4]], 1.0, 0.34, W);
  g.add(box(1.2, 0.08, W, mat(0xbfc3c8), -0.3, 0.46, 0)); // bed
  for (const s of [1, -1]) g.add(box(1.2, 0.26, 0.04, mat(0xbfc3c8), -0.3, 0.62, s * (W / 2 - 0.02)));
  g.add(box(0.04, 0.26, W, mat(0xbfc3c8), -0.88, 0.62, 0));
  if (load === 'cane') for (let i = 0; i < 14; i++) { const z = ((i % 5) - 2) * 0.13, y = 0.6 + Math.floor(i / 5) * 0.09; g.add(cyl(0.04, 0.04, 1.5, mat(i % 3 ? 0x9faa5c : 0xb9b46c), -0.25, y, z, 6).rotateZ(Math.PI / 2)); }
  platesAt(g, L, 0.36);
  lamps(g, ud, { front: 0.9, back: -0.9, y: 0.5, z: 0.32, w: 0.14 });
  wheelsAt(g, ud, [0.55, -0.55], 0.2, W);
  return rig(g, ud);
}

// 配送トラック: cab and a box body with the (made-up) company's stripe
export function deliveryTruck({ name = 'ちゅら便', color = 0x3a7fd0 } = {}) {
  const [g, ud] = start('deliveryTruck', 3.0);
  const L = 3.0, W = 1.2;
  const cab = mat(0xf4f2ec, { roughness: 0.4 });
  g.add(rbox(0.8, 1.25, W, 0.12, cab, 1.08, 0.88, 0));
  g.add(box(0.03, 0.5, W - 0.14, glass, 1.485, 1.2, 0));
  sideGlass(g, [[1.12, 0.5]], 1.2, 0.4, W);
  g.add(rbox(2.1, 1.6, W + 0.06, 0.06, mat(0xf6f4ef), -0.42, 1.12, 0));
  const side = canvasMat('deliv|' + name + color, 512, 160, (c, w, h) => { c.fillStyle = '#f6f4ef'; c.fillRect(0, 0, w, h); c.fillStyle = '#' + color.toString(16).padStart(6, '0'); c.fillRect(0, h - 40, w, 26); c.font = 'bold 64px sans-serif'; c.fillText(name, 30, 84); });
  for (const s of [1, -1]) { const p = mesh(new THREE.PlaneGeometry(2.0, 0.62), side, -0.42, 1.2, s * (W / 2 + 0.04)); if (s < 0) p.rotation.y = Math.PI; g.add(p); }
  g.add(box(0.03, 1.4, W - 0.1, mat(0xdedad2), -1.48, 1.1, 0)); // back doors
  platesAt(g, L, 0.42, 'commercial');
  lamps(g, ud, { front: 1.48, back: -1.48, y: 0.5, z: 0.45, w: 0.18 });
  wheelsAt(g, ud, [1.0, -0.95], 0.27, W, 0.22);
  return rig(g, ud);
}

// 大型トラック: a cab and a long container
export function bigTruck({ color = 0xd9465b } = {}) {
  const [g, ud] = start('bigTruck', 4.5);
  const L = 4.5, W = 1.4;
  g.add(rbox(1.0, 1.5, W, 0.12, mat(color, { roughness: 0.4 }), 1.72, 1.05, 0));
  g.add(box(0.03, 0.6, W - 0.14, glass, 2.225, 1.45, 0));
  sideGlass(g, [[1.75, 0.55]], 1.45, 0.45, W);
  g.add(box(3.3, 1.9, W, mat(0xd8d4cb, { roughness: 0.6 }), -0.55, 1.35, 0));
  for (let x = -2.1; x <= 1.0; x += 0.25) for (const s of [1, -1]) g.add(box(0.03, 1.8, 0.02, mat(0xc4bfb4), x, 1.35, s * (W / 2 + 0.01))); // ribs
  g.add(box(3.3, 0.2, W - 0.1, dark, -0.55, 0.36, 0));
  platesAt(g, L, 0.42, 'commercial');
  lamps(g, ud, { front: 2.24, back: -2.22, y: 0.55, z: 0.52, w: 0.2 });
  wheelsAt(g, ud, [1.7, -1.3, -1.9], 0.33, W, 0.26);
  return rig(g, ud);
}

// バイク・スクーター with its rider
export function scooter({ color = 0xd9362b, rider = true } = {}) {
  const [g, ud] = start('scooter', 1.0);
  const paint = mat(color, { roughness: 0.35 });
  g.add(rbox(0.5, 0.2, 0.3, 0.08, paint, -0.12, 0.38, 0)); // body under the seat
  g.add(rbox(0.36, 0.08, 0.26, 0.04, dark, -0.12, 0.52, 0)); // seat
  g.add(box(0.36, 0.05, 0.22, dark, 0.15, 0.25, 0)); // floor
  const front = box(0.1, 0.55, 0.22, paint, 0.34, 0.55, 0); front.rotation.z = 0.3; g.add(front);
  g.add(box(0.04, 0.04, 0.5, chrome, 0.42, 0.86, 0)); // handlebar
  g.add(box(0.04, 0.1, 0.12, head, 0.46, 0.7, 0));
  const tail = new THREE.MeshStandardMaterial({ color: 0x8a1f1f, emissive: 0xff2a1a, emissiveIntensity: 0.15 });
  g.add(box(0.03, 0.06, 0.1, tail, -0.38, 0.42, 0));
  const amberL = new THREE.MeshStandardMaterial({ color: 0xb87a1c, emissive: 0xffa21a, emissiveIntensity: 0 }), amberR = amberL.clone();
  Object.assign(ud, { brake: tail, amberL, amberR, blinkT: 0 });
  for (const x of [0.34, -0.36]) { const w = wheel(0.17, 0.1, x, 0); ud.wheels.push(w); g.add(w); }
  if (rider) { const p = person('rider', { mode: 'sit' }); p.position.set(-0.22, 0.2, 0); p.scale.setScalar(0.85); p.userData.update(0); g.add(p); }
  return rig(g, ud);
}

// 自転車 with its rider
export function bicycle({ color = 0x3a7fd0, role = 'student' } = {}) {
  const [g, ud] = start('bicycle', 0.85);
  const frame = mat(color, { roughness: 0.4, metalness: 0.3 });
  const rim = mat(0x2a2d33);
  for (const x of [0.33, -0.33]) {
    const w = new THREE.Group(); w.position.set(x, 0.24, 0);
    w.add(mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 20), rim));
    w.add(box(0.4, 0.015, 0.015, chrome)); w.add(box(0.015, 0.4, 0.015, chrome));
    w.userData.radius = 0.24;
    ud.wheels.push(w); g.add(w);
  }
  const tube = (x0, y0, x1, y1) => { const b = box(Math.hypot(x1 - x0, y1 - y0), 0.03, 0.03, frame, (x0 + x1) / 2, (y0 + y1) / 2, 0); b.rotation.z = Math.atan2(y1 - y0, x1 - x0); g.add(b); };
  tube(-0.33, 0.24, 0, 0.26); tube(0, 0.26, -0.08, 0.56); tube(-0.08, 0.56, 0.26, 0.58); tube(0, 0.26, 0.26, 0.58); tube(0.26, 0.58, 0.33, 0.24); tube(-0.33, 0.24, -0.08, 0.56);
  g.add(box(0.2, 0.04, 0.1, dark, -0.1, 0.6, 0)); // saddle
  g.add(box(0.03, 0.03, 0.42, chrome, 0.27, 0.68, 0)); // bars
  g.add(box(0.2, 0.14, 0.24, mat(0x9aa0a6), 0.4, 0.62, 0)); // basket
  const tail = new THREE.MeshStandardMaterial({ color: 0x8a1f1f, emissive: 0xff2a1a, emissiveIntensity: 0.15 });
  const amberL = tail.clone(), amberR = tail.clone();
  Object.assign(ud, { brake: tail, amberL, amberR, blinkT: 0 });
  if (role) { const p = person(role, { mode: 'sit' }); p.position.set(-0.12, 0.25, 0); p.scale.setScalar(0.8); p.userData.update(0); g.add(p); }
  return rig(g, ud);
}

// パトカー: black and white, with a light bar
export function policeCar() {
  const g = sedan({ color: 0xf4f2ec, plate: 'private' });
  g.userData.vehicle = 'police';
  const black = mat(0x1d1f23, { roughness: 0.4 });
  g.add(rbox(2.12, 0.3, 1.02, 0.12, black, 0, 0.36, 0)); // black lower half (white above, as in Japan)
  const word = canvasMat('police', 256, 48, (c, w, h) => { c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d1f23'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.fillText('POLICE  警察', w / 2, 34); });
  for (const s of [1, -1]) { const p = mesh(new THREE.PlaneGeometry(0.9, 0.17), word, 0, 0.56, s * 0.505); if (s < 0) p.rotation.y = Math.PI; g.add(p); }
  lightBar(g, g.userData, -0.16, 1.05, 0.9);
  return g;
}

// 救急車: a white box van with a red stripe and lights
export function ambulance() {
  const [g, ud] = start('ambulance', 2.6);
  const L = 2.6, W = 1.1;
  const white = mat(0xf6f4ef, { roughness: 0.4 });
  g.add(rbox(L, 0.6, W, 0.14, white, 0, 0.55, 0));
  g.add(rbox(1.95, 0.7, W - 0.02, 0.12, white, -0.3, 1.18, 0));
  raked(g, white, 0.67, 1.02, 0.84, 1.5, W - 0.06);
  sideGlass(g, [[0.4, 0.42]], 1.25, 0.34, W - 0.02);
  for (const s of [1, -1]) g.add(box(L - 0.2, 0.1, 0.01, mat(0xd9362b), 0, 0.82, s * (W / 2 + 0.005)));
  const word = canvasMat('amb', 256, 64, (c, w, h) => { c.fillStyle = '#f6f4ef'; c.fillRect(0, 0, w, h); c.fillStyle = '#d9362b'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.fillText('救急車', w / 2, 46); });
  for (const s of [1, -1]) { const p = mesh(new THREE.PlaneGeometry(1.0, 0.25), word, -0.5, 1.2, s * (W / 2 + 0.005)); if (s < 0) p.rotation.y = Math.PI; g.add(p); }
  bumpers(g, L, W);
  platesAt(g, L, 0.36, 'commercial');
  lamps(g, ud, { front: L / 2, back: -L / 2, y: 0.6, z: 0.4, w: 0.18 });
  wheelsAt(g, ud, [0.85, -0.85], 0.24, W, 0.2);
  rig(g, ud);
  lightBar(g, ud, 0.5, 1.6, W, [0xff2a1a, 0xfff1e0]);
  return g;
}

// ---------- モノレール (two cars astride a single beam) ----------
export function monorail({ cars = 2, accent = 0x2fa58f } = {}) {
  const g = new THREE.Group();
  const ud = (g.userData = { kind: 'monorail', len: cars * 5.1 });
  const shell = mat(0xf4f2ec, { roughness: 0.4 }), band = mat(accent, { roughness: 0.5 }), skirt = mat(0x9aa0a6, { roughness: 0.6 });
  for (let i = 0; i < cars; i++) {
    const c = new THREE.Group();
    c.position.x = -i * 5.1;
    c.add(rbox(5.0, 1.5, 1.4, 0.3, shell, 0, 1.0, 0));
    c.add(box(4.9, 0.14, 1.42, band, 0, 0.55, 0));
    sideGlass(c, [[1.6, 1.2], [0, 1.4], [-1.6, 1.2]], 1.25, 0.6, 1.42);
    c.add(box(4.6, 0.7, 1.0, skirt, 0, 0.05, 0)); // straddles the beam
    if (i === 0 || i === cars - 1) { // rounded nose with a big window
      const s = i === 0 ? 1 : -1;
      c.add(mesh(new THREE.SphereGeometry(0.75, 16, 10).scale(0.7, 1, 0.95), shell, s * 2.45, 1.0, 0));
      c.add(mesh(new THREE.SphereGeometry(0.62, 14, 8, 0, Math.PI * 2, 0.4, 0.9).scale(0.7, 1, 0.95).rotateZ(s * -Math.PI / 2), glass, s * 2.55, 1.15, 0));
    }
    g.add(c);
  }
  return compactRig(g);
}
// the beam on T-piers, `length` along X, `height` above the ground
export function monorailBeam({ length = 48, height = 6.5, spacing = 12 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'monorailBeam', height };
  const conc = mat(0xd8d3c8, { roughness: 0.85 });
  g.add(box(length, 0.9, 0.8, conc, 0, height - 0.45, 0));
  for (let x = -length / 2 + spacing / 2; x < length / 2; x += spacing) {
    g.add(box(0.9, height - 1.2, 0.9, conc, x, (height - 1.2) / 2, 0));
    g.add(box(1.2, 0.5, 2.0, conc, x, height - 1.1, 0));
  }
  return compactRig(g);
}

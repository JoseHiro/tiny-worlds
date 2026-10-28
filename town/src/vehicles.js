// Roads & towns — vehicles (town/DESIGN.md §2.3). Same small scale as the airport cars; nose +X, wheels on y = 0.
// Each vehicle's userData has: wheels, update(dt) (wheels turn, brake lights, turn signals), and what the traffic
// sets on it — speed, braking, blink ('L' | 'R' | null).
import * as THREE from 'three';
import { mat, mesh, rbox, box, cyl, PALETTE } from '../../airport/src/parts.js';
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
  g.fillStyle = '#f6f4ec'; g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#3a6b45'; g.lineWidth = 4; g.strokeRect(3, 3, 122, 58);
  g.fillStyle = '#2f5a3b';
  g.font = 'bold 15px sans-serif'; g.textAlign = 'center';
  g.fillText('沖縄 300', 64, 22);
  g.font = 'bold 30px sans-serif';
  g.fillText(kind === 'rental' ? 'わ 12-34' : 'さ 56-78', 64, 54);
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

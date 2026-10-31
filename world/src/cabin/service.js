// Galley, trolleys, meals, lavatory and flight deck (world/CABIN.md §5.3). Nose +X, floor y = 0.
import * as THREE from 'three';
import { PALETTE, CP, M, V, mood, mat, bx, rb, cy, sp, put, pivot, stateful } from './common.js';

const glass = (c, o = 0.45) => mat(c, { transparent: true, opacity: o, roughness: 0.1 });

// ---------- G1 galley ----------
// Built against a wall at x 0; its front faces +X, where the crew stand. width runs along Z.
// Below the worktop: trolley bays; above: ovens, coffee makers, a boiler, storage boxes.
export function galley({ width = 2.4, bays = 4, ovens = 3 } = {}) {
  const g = new THREE.Group();
  const body = mat(CP.galley, { roughness: 0.5 });
  const z0 = -width / 2;
  bx(g, 0.1, 1.72, width, body, 0.05, 0.86, 0); // back wall
  bx(g, 0.62, 1.72, 0.04, body, 0.31, 0.86, z0 + 0.02); // ends
  bx(g, 0.62, 1.72, 0.04, body, 0.31, 0.86, -z0 - 0.02);
  bx(g, 1.0, 0.02, width, M.trim, 0.5, 0.012, 0); // anti-slip floor
  // trolley bays with the trolleys in them, then cupboards for the rest of the width
  const bw = 0.3;
  for (let i = 0; i < bays; i++) {
    const z = z0 + 0.04 + bw * (i + 0.5);
    rb(g, 0.04, 0.78, bw - 0.03, 0.02, M.steel, 0.6, 0.42, z);
    bx(g, 0.02, 0.05, 0.12, mat(i % 2 ? PALETTE.yellow : PALETTE.orange), 0.625, 0.74, z);
    bx(g, 0.02, 0.1, 0.16, M.white, 0.625, 0.55, z); // the trolley's label card
    bx(g, 0.6, 0.82, 0.015, body, 0.31, 0.42, z + bw / 2);
  }
  const cupStart = z0 + 0.04 + bays * bw;
  const cupW = width / 2 - cupStart;
  if (cupW > 0.1) {
    rb(g, 0.58, 0.8, cupW - 0.04, 0.02, body, 0.31, 0.42, cupStart + cupW / 2);
    for (let z = cupStart + 0.15; z < width / 2 - 0.1; z += 0.3) bx(g, 0.02, 0.03, 0.1, M.steel, 0.6, 0.75, z);
  }
  // worktop with a sink, cups, trays and a coffee pot
  bx(g, 0.66, 0.04, width, M.steel, 0.33, 0.84, 0);
  bx(g, 0.3, 0.012, 0.26, M.ink, 0.3, 0.862, z0 + 0.3);
  cy(g, 0.012, 0.012, 0.14, M.steel, 0.12, 0.93, z0 + 0.3, 6);
  for (let i = 0; i < 4; i++) cy(g, 0.03, 0.022, 0.09, M.white, 0.42, 0.9 + i * 0.03, z0 + 0.66, 10); // a stack of cups
  for (let i = 0; i < 3; i++) bx(g, 0.26, 0.018, 0.2, M.panel, 0.32, 0.875 + i * 0.022, z0 + 1.0);
  const pot = cy(g, 0.05, 0.06, 0.13, glass(0x3a2a20, 0.8), 0.45, 0.93, z0 + 1.35, 12);
  cy(pot, 0.05, 0.05, 0.02, M.ink, 0, 0.07, 0, 12);
  // upper units: ovens with a glowing window, coffee makers, a boiler, storage boxes on top
  const ovenGlow = [];
  const slots = [...Array(ovens).fill('oven'), 'coffee', 'coffee', 'boiler'];
  const sw = (width - 0.1) / slots.length;
  slots.forEach((kind, i) => {
    const z = z0 + 0.05 + sw * (i + 0.5);
    if (kind === 'oven') {
      rb(g, 0.42, 0.34, sw - 0.04, 0.02, M.trim, 0.25, 1.08, z);
      const w = bx(g, 0.012, 0.16, sw * 0.6, M.glow(0xff9b5c, 0.2), 0.465, 1.08, z);
      w.material = w.material.clone(); // each oven glows on its own
      ovenGlow.push(w);
      bx(g, 0.02, 0.03, sw * 0.5, M.steel, 0.47, 1.22, z);
    } else if (kind === 'coffee') {
      rb(g, 0.36, 0.34, sw - 0.06, 0.03, M.steel, 0.22, 1.08, z);
      bx(g, 0.012, 0.04, 0.04, M.glow(PALETTE.red, 1.2), 0.405, 1.2, z - sw * 0.25);
      cy(g, 0.045, 0.05, 0.12, glass(0x3a2a20, 0.8), 0.33, 0.96, z, 12);
    } else {
      rb(g, 0.36, 0.38, sw - 0.06, 0.03, M.white, 0.22, 1.1, z);
      bx(g, 0.012, 0.04, 0.06, M.glow(0x7fd0ff, 1), 0.405, 1.22, z);
      cy(g, 0.012, 0.012, 0.06, M.steel, 0.42, 0.95, z, 6);
    }
  });
  for (let row = 0; row < 2; row++) for (let z = z0 + 0.2; z < width / 2 - 0.1; z += 0.32) {
    rb(g, 0.4, 0.16, 0.29, 0.02, body, 0.24, 1.38 + row * 0.18, z);
    bx(g, 0.02, 0.05, 0.06, mat((row + Math.round(z * 3)) % 2 ? PALETTE.yellow : PALETTE.orange), 0.445, 1.38 + row * 0.18, z);
  }
  bx(g, 0.5, 0.03, width, body, 0.26, 1.72, 0);
  stateful(g, { ovens: 0 }, (s, t) => ovenGlow.forEach((w, i) => { w.material.emissiveIntensity = 0.15 + s.ovens * (1.0 + Math.sin(t * 2 + i) * 0.15); }));
  g.userData.kind = 'galley';
  g.userData.stand = V(0.85, 0); // where a crew member works, facing −X
  return g;
}

// ---------- G2 / G3 trolleys ----------
// 0.62 long (X) × 0.26 wide × 0.8 tall: fits the 0.7 aisle. kind 'drinks' (bottles on top, a drawer) or
// 'meals' (the end door opens on trays). state.open moves the drawer or the door.
export function trolley({ kind = 'drinks' } = {}) {
  const g = new THREE.Group();
  const L = 0.62, W = 0.26, H = 0.78;
  if (kind === 'meals') { // a shell, so the trays show when the door is open
    bx(g, L, 0.03, W, M.steel, 0, H, 0);
    bx(g, L, 0.03, W, M.steel, 0, 0.08, 0);
    for (const s of [-1, 1]) bx(g, L, H - 0.06, 0.02, M.steel, 0, (H + 0.08) / 2, s * (W / 2 - 0.01));
    bx(g, 0.02, H - 0.06, W, M.steel, -L / 2 + 0.01, (H + 0.08) / 2, 0);
    for (let y = 0.14; y < H - 0.04; y += 0.06) {
      bx(g, L - 0.06, 0.012, W - 0.05, M.panel, 0.01, y, 0);
      bx(g, 0.08, 0.02, 0.06, mat(y % 0.12 < 0.06 ? PALETTE.orange : PALETTE.green), 0.18, y + 0.016, -0.04);
    }
  } else {
    rb(g, L, H - 0.06, W, 0.02, M.steel, 0, (H + 0.08) / 2, 0);
  }
  bx(g, L + 0.02, 0.025, W + 0.02, mat(kind === 'meals' ? PALETTE.teal : PALETTE.orange), 0, H + 0.02, 0);
  for (const s of [-1, 1]) bx(g, 0.02, 0.04, W - 0.04, M.ink, s * (L / 2 + 0.015), H - 0.06, 0);
  for (const x of [-0.24, 0.24]) for (const z of [-0.09, 0.09]) { const w = cy(g, 0.035, 0.035, 0.03, M.rubber, x, 0.035, z, 10); w.rotation.x = Math.PI / 2; }
  bx(g, 0.05, 0.02, 0.1, mat(PALETTE.red), L / 2 - 0.02, 0.05, 0); // brake pedal
  let moving;
  if (kind === 'drinks') {
    const top = H + 0.035;
    [[0.2, -0.07, 0x3f7a4a], [0.2, 0.0, 0x7a2a3a], [0.2, 0.07, 0xbfe0f0]].forEach(([x, z, c]) => {
      cy(g, 0.025, 0.025, 0.14, glass(c, 0.85), x, top + 0.07, z, 10);
      cy(g, 0.01, 0.012, 0.04, glass(c, 0.85), x, top + 0.16, z, 8);
    });
    [[0.02, -0.08, PALETTE.red], [0.02, -0.03, PALETTE.yellow], [0.07, -0.08, PALETTE.green], [0.07, -0.03, PALETTE.sky]].forEach(([x, z, c]) => cy(g, 0.018, 0.018, 0.05, mat(c, { metalness: 0.5 }), x, top + 0.025, z, 10));
    for (let i = 0; i < 5; i++) cy(g, 0.028, 0.02, 0.06, M.white, -0.12, top + 0.03 + i * 0.022, 0.06, 10);
    cy(g, 0.05, 0.04, 0.08, M.steel, -0.2, top + 0.04, -0.05, 12); // ice bucket
    moving = pivot(g, L / 2, 0.62, 0);
    rb(moving, 0.24, 0.1, W - 0.05, 0.01, M.white, -0.12, 0, 0);
    bx(moving, 0.012, 0.03, 0.1, M.ink, 0.005, 0, 0);
  } else {
    moving = pivot(g, L / 2, 0.42, -W / 2);
    bx(moving, 0.02, H - 0.08, W, M.steel, 0, 0, W / 2);
    bx(moving, 0.012, 0.06, 0.06, mat(PALETTE.yellow), 0.012, 0.25, W - 0.04);
  }
  stateful(g, { open: 0 }, (s) => {
    if (kind === 'drinks') moving.position.x = L / 2 + s.open * 0.16;
    else moving.rotation.y = -s.open * 1.9;
  });
  g.userData.kind = 'trolley';
  return g;
}

// ---------- G4 economy meal tray ----------
// 0.3 × 0.22, made to sit on a tray table. state.lid 0 → 1 lifts the foil off the hot dish.
export function mealTray() {
  const g = new THREE.Group();
  rb(g, 0.3, 0.02, 0.22, 0.008, M.panel, 0, 0.01, 0);
  rb(g, 0.14, 0.04, 0.1, 0.01, M.white, 0.06, 0.04, -0.05); // the hot dish
  bx(g, 0.12, 0.012, 0.08, mat(0xc98a3a), 0.06, 0.058, -0.05); // curry
  bx(g, 0.05, 0.014, 0.08, M.white, 0.025, 0.06, -0.05); // rice
  const lid = pivot(g, 0.06, 0.066, -0.05);
  rb(lid, 0.145, 0.012, 0.105, 0.005, M.steel, 0, 0, 0);
  cy(g, 0.035, 0.028, 0.03, M.white, -0.07, 0.035, -0.06, 12); // salad
  put(g, new THREE.SphereGeometry(0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(PALETTE.green), -0.07, 0.045, -0.06);
  sp(g, 0.024, mat(0xc99a5a), -0.08, 0.04, 0.05).scale.set(1.3, 0.8, 1);
  cy(g, 0.022, 0.018, 0.04, mat(0xf2b9c0), 0.02, 0.04, 0.06, 10); // dessert
  bx(g, 0.12, 0.008, 0.03, M.white, 0.08, 0.025, 0.07); // cutlery pack
  const cup = cy(g, 0.022, 0.018, 0.05, M.white, 0.12, 0.045, 0.02, 10);
  cy(cup, 0.02, 0.02, 0.004, mat(0x3a2a20), 0, 0.024, 0, 10);
  stateful(g, { lid: 0 }, (s) => {
    lid.position.set(0.06, 0.066 + Math.sin(s.lid * Math.PI) * 0.05, -0.05 - s.lid * 0.13); // lifted and set down beside the tray
    lid.rotation.x = -s.lid * 0.5;
  });
  g.userData.kind = 'meal';
  return g;
}

// ---------- G5 business dinner ----------
export function bizMeal() {
  const g = new THREE.Group();
  bx(g, 0.42, 0.006, 0.32, M.white, 0, 0.003, 0); // the cloth
  cy(g, 0.085, 0.075, 0.014, M.white, 0.02, 0.013, -0.02, 20);
  sp(g, 0.035, mat(0xb5654a), 0.03, 0.03, -0.03).scale.set(1.3, 0.5, 1);
  sp(g, 0.022, mat(PALETTE.green), -0.01, 0.03, 0.01).scale.set(1, 0.6, 1);
  sp(g, 0.014, mat(PALETTE.orange), 0.05, 0.028, 0.02);
  cy(g, 0.04, 0.035, 0.008, M.white, -0.14, 0.008, -0.1, 16); // bread plate
  sp(g, 0.022, mat(0xc99a5a), -0.14, 0.024, -0.1).scale.set(1.3, 0.8, 1);
  cy(g, 0.012, 0.02, 0.004, glass(0xffffff, 0.5), 0.14, 0.004, 0.1, 12); // wine glass
  cy(g, 0.003, 0.003, 0.05, glass(0xffffff, 0.5), 0.14, 0.03, 0.1, 6);
  cy(g, 0.022, 0.012, 0.04, glass(0xffffff, 0.35), 0.14, 0.075, 0.1, 12);
  cy(g, 0.015, 0.01, 0.015, mat(0x7a2a3a), 0.14, 0.066, 0.1, 12);
  bx(g, 0.06, 0.012, 0.1, M.fabric(CP.biz), -0.15, 0.01, 0.08); // napkin
  for (const z of [-0.12, 0.12]) bx(g, 0.12, 0.004, 0.012, M.steel, 0.02, 0.008, z); // knife and fork
  cy(g, 0.008, 0.008, 0.03, M.white, -0.06, 0.02, 0.12, 8);
  cy(g, 0.008, 0.008, 0.03, M.ink, -0.04, 0.02, 0.12, 8);
  g.userData.kind = 'meal';
  return g;
}

// ---------- L1 lavatory ----------
// 0.95 square; the bi-fold door is on the +X face. occupied: the lamp outside turns red and the door shuts.
export function lavatory() {
  const g = new THREE.Group();
  const wall = mat(CP.lining, { roughness: 0.7 });
  const h = 1.72, s = 0.95;
  bx(g, 0.05, h, s, wall, -s / 2, h / 2, 0);
  for (const z of [-s / 2, s / 2]) bx(g, s, h, 0.05, wall, 0, h / 2, z);
  bx(g, 0.05, h, 0.2, wall, s / 2, h / 2, -s / 2 + 0.1);
  bx(g, 0.05, 0.2, s, wall, s / 2, h - 0.1, 0);
  bx(g, s, 0.02, s, mat(0x8a8f99), 0, 0.012, 0);
  // toilet, basin with a mirror, a towel slot
  rb(g, 0.36, 0.3, 0.32, 0.08, M.white, -0.25, 0.15, 0.22);
  rb(g, 0.3, 0.03, 0.3, 0.04, M.white, -0.24, 0.31, 0.22);
  rb(g, 0.1, 0.3, 0.3, 0.03, M.white, -0.42, 0.42, 0.22);
  bx(g, 0.34, 0.08, 0.38, M.white, -0.3, 0.74, -0.24);
  cy(g, 0.09, 0.07, 0.03, mat(0xdcdcdc), -0.3, 0.785, -0.24, 16);
  cy(g, 0.01, 0.01, 0.1, M.steel, -0.42, 0.83, -0.24, 6);
  bx(g, 0.02, 0.42, 0.36, mat(0xbfd8e8, { metalness: 0.7, roughness: 0.05 }), -0.455, 1.22, -0.24);
  bx(g, 0.02, 0.06, 0.12, M.ink, -0.455, 0.98, 0.0);
  // the bi-fold door: two leaves on a hinge at the +Z side of the opening
  const hinge = pivot(g, s / 2, 0, s / 2 - 0.02);
  const leafA = pivot(hinge, 0, 0, 0);
  rb(leafA, 0.04, h - 0.22, 0.36, 0.01, wall, 0, (h - 0.2) / 2, -0.18);
  const leafB = pivot(leafA, 0, 0, -0.36);
  rb(leafB, 0.04, h - 0.22, 0.36, 0.01, wall, 0, (h - 0.2) / 2, -0.18);
  bx(leafB, 0.03, 0.03, 0.06, M.steel, 0.03, 0.85, -0.3);
  const lamp = bx(g, 0.02, 0.08, 0.16, M.glow(0x45e07a, 1.2), s / 2 + 0.03, 1.66, -0.2);
  lamp.userData.dynamic = true; // its material changes, so it is never merged
  const red = M.glow(PALETTE.red, 1.4), green = M.glow(0x45e07a, 1.2);
  stateful(g, { occupied: false, door: 0 }, (st) => {
    const open = st.occupied ? 0 : st.door;
    leafA.rotation.y = open * 1.25;
    leafB.rotation.y = -open * 2.5;
    lamp.material = st.occupied ? red : green;
  });
  g.userData.kind = 'lav';
  g.userData.inside = V(-0.1, -0.05);
  g.userData.queue = V(s / 2 + 0.45, -0.2);
  return g;
}

// ---------- C1 flight deck ----------
// Two seats facing +X at z ±0.5, the panel with six displays, glareshield, pedestal, yokes, windscreen (the sky
// colour of the mood), an overhead panel above the cut (state.overhead hides it), coffee on the side.
function deckTex(kind) {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 128;
  const x = c.getContext('2d');
  if (kind === 'pfd') {
    x.fillStyle = '#3f86c9'; x.fillRect(0, 0, 96, 64);
    x.fillStyle = '#8a5a34'; x.fillRect(0, 64, 96, 64);
    x.strokeStyle = '#fff'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, 64); x.lineTo(96, 64); x.stroke();
    for (const y of [44, 84]) { x.beginPath(); x.moveTo(36, y); x.lineTo(60, y); x.stroke(); }
    x.strokeStyle = '#f2b84b'; x.lineWidth = 4; x.beginPath(); x.moveTo(26, 64); x.lineTo(42, 64); x.moveTo(54, 64); x.lineTo(70, 64); x.stroke();
    x.fillStyle = '#1c2232'; x.fillRect(0, 0, 14, 128); x.fillRect(82, 0, 14, 128);
  } else if (kind === 'nd') {
    x.fillStyle = '#0b0f18'; x.fillRect(0, 0, 96, 128);
    x.strokeStyle = '#ffffff'; x.lineWidth = 1.5;
    for (const r of [30, 56]) { x.beginPath(); x.arc(48, 110, r, Math.PI, 2 * Math.PI); x.stroke(); }
    x.strokeStyle = '#e04ad0'; x.lineWidth = 2; x.beginPath(); x.moveTo(48, 110); x.lineTo(40, 60); x.lineTo(56, 18); x.stroke();
    x.fillStyle = '#45e07a'; x.fillRect(20, 40, 8, 4); x.fillRect(70, 70, 6, 6);
  } else {
    x.fillStyle = '#0b0f18'; x.fillRect(0, 0, 96, 128);
    x.strokeStyle = '#ffffff'; x.lineWidth = 2;
    for (const [cx, cy0] of [[26, 30], [70, 30], [26, 76], [70, 76]]) { x.beginPath(); x.arc(cx, cy0, 16, Math.PI * 0.75, Math.PI * 2.1); x.stroke(); }
    x.fillStyle = '#45e07a'; x.fillRect(10, 104, 76, 6);
    x.fillStyle = '#7fd0ff'; x.fillRect(10, 114, 50, 6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1 });
}
let DECK = null;
function overheadMat() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#5a606b'; x.fillRect(0, 0, 128, 128);
  const cols = ['#e6e3dc', '#e6e3dc', '#f2b84b', '#45e07a', '#e6e3dc', '#d9473b'];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { x.fillStyle = cols[(i * 7 + j * 3) % cols.length]; x.fillRect(6 + i * 13, 6 + j * 13, 7, 7); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 });
}

export function flightDeck() {
  DECK ??= { pfd: deckTex('pfd'), nd: deckTex('nd'), eicas: deckTex('eicas'), over: overheadMat() };
  const g = new THREE.Group();
  const sheep = M.fabric(0x9a8a74), dark = M.trim;
  bx(g, 2.2, 0.1, 2.5, mat(0x3a4152, { roughness: 1 }), 0.4, -0.05, 0);
  for (const z of [-0.5, 0.5]) {
    bx(g, 0.34, 0.24, 0.32, dark, 0, 0.12, z);
    rb(g, 0.5, 0.12, 0.48, 0.05, sheep, 0, 0.32, z);
    const back = rb(g, 0.12, 0.85, 0.48, 0.05, sheep, -0.26, 0.78, z);
    back.rotation.z = 0.12;
    rb(g, 0.1, 0.2, 0.32, 0.04, dark, -0.33, 1.28, z);
    bx(g, 0.3, 0.04, 0.06, dark, -0.02, 0.52, z + Math.sign(z) * 0.27); // outboard armrest
    // a yoke: column from the floor, a horned wheel
    cy(g, 0.03, 0.035, 0.6, dark, 0.62, 0.3, z, 8);
    bx(g, 0.04, 0.05, 0.32, M.ink, 0.6, 0.63, z);
    for (const s of [-1, 1]) bx(g, 0.04, 0.14, 0.04, M.ink, 0.6, 0.68, z + s * 0.15);
  }
  // main panel (tilted back), six screens
  const panel = pivot(g, 1.08, 0.78, 0);
  panel.rotation.z = 0.22;
  bx(panel, 0.1, 0.46, 2.1, M.ink, 0, 0, 0);
  [['pfd', -0.86], ['nd', -0.5], ['eicas', -0.15], ['eicas', 0.15], ['nd', 0.5], ['pfd', 0.86]].forEach(([k, z]) => bx(panel, 0.012, 0.3, 0.24, DECK[k], -0.056, 0.02, z));
  bx(g, 0.5, 0.09, 2.2, M.ink, 1.24, 1.07, 0); // glareshield
  bx(g, 0.02, 0.07, 1.0, dark, 1.0, 1.06, 0);
  for (const z of [-0.3, 0, 0.3]) bx(g, 0.012, 0.03, 0.12, M.glow(0xff9b5c, 1.2), 0.988, 1.065, z);
  // pedestal with thrust levers
  bx(g, 0.75, 0.5, 0.34, dark, 0.58, 0.25, 0);
  bx(g, 0.6, 0.02, 0.3, M.ink, 0.56, 0.51, 0);
  for (const z of [-0.05, 0.05]) { const lv = bx(g, 0.04, 0.18, 0.025, M.steel, 0.72, 0.6, z); lv.rotation.z = 0.35; bx(g, 0.05, 0.03, 0.05, M.white, 0.68, 0.69, z); }
  bx(g, 0.03, 0.12, 0.03, M.white, 0.5, 0.58, 0.12);
  for (let i = 0; i < 3; i++) bx(g, 0.1, 0.012, 0.22, M.glow(i === 1 ? 0xff9b5c : 0x45e07a, 0.6), 0.33 + i * 0.12, 0.522, 0);
  // windscreen: two front panes leaning back, two side panes
  for (const s of [-1, 1]) {
    const f = pivot(g, 1.46, 1.4, s * 0.5);
    f.rotation.z = 0.55;
    bx(f, 0.02, 0.5, 0.92, mood.sky, 0, 0, 0);
    bx(f, 0.04, 0.56, 0.05, M.ink, 0, 0, s * 0.48);
    const side = bx(g, 0.8, 0.42, 0.02, mood.sky, 0.95, 1.38, s * 1.12);
    side.rotation.x = -s * 0.25;
  }
  bx(g, 0.05, 0.58, 0.06, M.ink, 1.48, 1.38, 0); // centre post
  // side consoles with a coffee cup on the captain's side
  for (const s of [-1, 1]) bx(g, 0.9, 0.55, 0.22, dark, 0.15, 0.27, s * 1.0);
  const cup = cy(g, 0.03, 0.025, 0.07, M.white, 0.35, 0.585, -1.0, 10);
  cy(cup, 0.028, 0.028, 0.005, mat(0x3a2a20), 0, 0.034, 0, 10);
  bx(g, 0.18, 0.012, 0.13, M.white, 0.05, 0.555, 1.0); // charts on a clipboard
  // overhead panel, above the cut
  const over = pivot(g, 0.55, 1.95, 0);
  over.rotation.z = -0.25;
  rb(over, 0.9, 0.06, 1.0, 0.02, dark, 0, 0, 0);
  bx(over, 0.86, 0.008, 0.94, DECK.over, 0, -0.032, 0);
  stateful(g, { overhead: true }, (s, t) => {
    over.visible = s.overhead;
    DECK.pfd.emissiveMap.offset.y = Math.sin(t * 0.4) * 0.02; // the horizon breathes a little
  });
  g.userData.kind = 'deck';
  g.userData.seats = [V(0.04, -0.5), V(0.04, 0.5)];
  return g;
}

// Sea-life species. Each builder returns a spec: { id, name, size, habitat, geometry, swim }.
// Sizes follow DESIGN.md §2 ("readable scale": small creatures drawn larger).
import * as THREE from 'three';
import { part, assemble, ellipsoid, fin, body, eyes, countershade } from './kit.js';

const L2 = (ja, en) => ({ ja, en });

// ---------- ナンヨウハギ (blue tang) — the reference fish ----------
export function blueTang() {
  const L = 0.45;
  const parts = [
    part(ellipsoid(0.225, 0.15, 0.05), '#2f5fd2'),
    // the black "palette" marking, a little proud of the body on both sides
    part(ellipsoid(0.15, 0.062, 0.053), '#151b36', { pos: [-0.01, 0.045, 0], rot: [0, 0, -0.22] }),
    part(ellipsoid(0.11, 0.03, 0.0525), '#151b36', { pos: [-0.1, -0.005, 0], rot: [0, 0, 0.35] }),
    part(fin([[0, 0], [-0.12, 0.085], [-0.095, 0], [-0.12, -0.085]], 0.012), '#f2c94c', { pos: [-0.2, 0, 0] }), // tail
    part(fin([[0.1, 0], [-0.17, 0], [-0.14, 0.055], [0.05, 0.045]], 0.01), '#1d2c70', { pos: [0, 0.125, 0] }), // dorsal
    part(fin([[0.04, 0], [-0.16, 0], [-0.13, -0.045], [0.0, -0.035]], 0.01), '#1d2c70', { pos: [0, -0.12, 0] }), // anal
    part(fin([[0, 0], [-0.07, 0.03], [-0.06, -0.02]], 0.008), '#4f7fe0', { pos: [0.06, -0.03, 0.052] }),
    part(fin([[0, 0], [-0.07, 0.03], [-0.06, -0.02]], 0.008), '#4f7fe0', { pos: [0.06, -0.03, -0.052] }),
    part(ellipsoid(0.025, 0.012, 0.03), '#f2c94c', { pos: [-0.165, 0, 0] }), // yellow spine at the tail root
    ...eyes(0.13, 0.04, 0.043, 0.022),
  ];
  return {
    id: 'blueTang', name: L2('ナンヨウハギ', 'Blue tang'), size: L, habitat: ['reef'], water: ['tropical'],
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.05, freq: 9, waves: 0.6, nose: 0.225, len: L },
  };
}

// ---------- マンタ (manta ray) — the reference ray ----------
export function manta() {
  const span = 3.4, half = span / 2;
  const sh = new THREE.Shape();
  sh.moveTo(0.95, 0);
  sh.quadraticCurveTo(0.55, 1.0, -0.12, half);
  sh.quadraticCurveTo(-0.35, 0.8, -0.85, 0.12);
  sh.lineTo(-0.85, -0.12);
  sh.quadraticCurveTo(-0.35, -0.8, -0.12, -half);
  sh.quadraticCurveTo(0.55, -1.0, 0.95, 0);
  const t = 0.07;
  const wings = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 1, curveSegments: 16 })
    .rotateX(Math.PI / 2).translate(0, t / 2, 0); // shape y → world z, thickness centred on y = 0
  const shade = countershade('#1f2433', '#f2f0ea', 0, 0.02);
  const parts = [
    part(wings, shade),
    part(ellipsoid(0.95, 0.2, 0.5), shade, { pos: [0.05, 0, 0] }), // the body hump
    // white shoulder patches on the back
    part(ellipsoid(0.32, 0.02, 0.2), '#e9e7e0', { pos: [0.25, 0.18, 0.42], rot: [0, 0.5, 0] }),
    part(ellipsoid(0.32, 0.02, 0.2), '#e9e7e0', { pos: [0.25, 0.18, -0.42], rot: [0, -0.5, 0] }),
    // cephalic fins (the curled "horns")
    part(ellipsoid(0.22, 0.05, 0.07), '#1f2433', { pos: [1.05, -0.02, 0.3], rot: [0.6, -0.25, 0] }),
    part(ellipsoid(0.22, 0.05, 0.07), '#1f2433', { pos: [1.05, -0.02, -0.3], rot: [-0.6, 0.25, 0] }),
    part(new THREE.CylinderGeometry(0.012, 0.03, 1.1, 6).rotateZ(Math.PI / 2), '#1f2433', { pos: [-1.35, 0, 0] }), // tail
    ...eyes(0.88, 0.05, 0.36, 0.035),
  ];
  return {
    id: 'manta', name: L2('マンタ', 'Manta ray'), size: span, habitat: ['ocean', 'reef'], water: ['tropical', 'temperate'],
    geometry: assemble(parts),
    swim: { mode: 'flap', amp: 0.55, freq: 1.3, waves: 0.8, z0: 0.35, len: half - 0.35 },
  };
}

// ---------- ツマグロ (blacktip reef shark) — the reference shark ----------
export function blacktipShark() {
  const L = 1.6;
  const torso = body([[0, 0], [0.05, 0.1], [0.09, 0.4], [0.15, 0.8], [0.17, 1.05], [0.15, 1.3], [0.1, 1.48], [0.045, 1.58], [0, 1.6]]).translate(-0.8, 0, 0).scale(1, 0.95, 0.85);
  const grey = '#8f9aa6', black = '#1c1f26';
  const tipped = (limit) => (p) => (limit(p) ? black : grey);
  const parts = [
    part(torso, countershade(grey, '#f1efe9', -0.03, 0.04)),
    part(fin([[0.13, 0], [-0.12, 0], [-0.1, 0.27]], 0.02), tipped((p) => p.y > 0.33), { pos: [0.05, 0.13, 0] }), // dorsal
    part(fin([[0.04, 0], [-0.05, 0], [-0.05, 0.08]], 0.015), grey, { pos: [-0.45, 0.07, 0] }), // second dorsal
    part(fin([[0.12, 0], [-0.1, 0], [-0.16, -0.26]], 0.015), tipped((p) => Math.abs(p.z) > 0.3), { pos: [0.3, -0.08, 0.1], rot: [-1.0, 0, 0] }),
    part(fin([[0.12, 0], [-0.1, 0], [-0.16, -0.26]], 0.015), tipped((p) => Math.abs(p.z) > 0.3), { pos: [0.3, -0.08, -0.1], rot: [1.0, 0, 0] }),
    part(fin([[0.04, 0], [-0.32, 0.3], [-0.24, 0.02], [-0.2, -0.16]], 0.02), grey, { pos: [-0.76, 0.0, 0] }), // tail
    // the black tips, as thin caps over the fins (flat fins have too few vertices to paint)
    part(fin([[-0.03, 0.19], [-0.115, 0.19], [-0.1, 0.27]], 0.026), black, { pos: [0.05, 0.13, 0] }),
    part(fin([[-0.11, -0.17], [-0.14, -0.17], [-0.16, -0.26]], 0.021), black, { pos: [0.3, -0.08, 0.1], rot: [-1.0, 0, 0] }),
    part(fin([[-0.11, -0.17], [-0.14, -0.17], [-0.16, -0.26]], 0.021), black, { pos: [0.3, -0.08, -0.1], rot: [1.0, 0, 0] }),
    part(fin([[-0.26, 0.2], [-0.32, 0.3], [-0.3, 0.2]], 0.026), black, { pos: [-0.76, 0.0, 0] }),
    part(fin([[-0.21, -0.1], [-0.2, -0.16], [-0.235, -0.09]], 0.026), black, { pos: [-0.76, 0.0, 0] }),
    ...eyes(0.6, 0.04, 0.085, 0.018),
  ];
  return {
    id: 'blacktip', name: L2('ツマグロ', 'Blacktip reef shark'), size: L, habitat: ['lagoon', 'reef'], water: ['tropical'],
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.16, freq: 2.4, waves: 0.7, nose: 0.8, len: L },
  };
}

// ---------- ジンベエザメ (whale shark) ----------
export function whaleShark() {
  const L = 8.5;
  const prof = [[0, 0], [0.22, 0.4], [0.55, 1.6], [0.95, 3.4], [1.15, 5.0], [1.12, 6.4], [1.02, 7.5], [0.9, 8.15], [0.62, 8.45], [0, 8.52]];
  const torso = body(prof, 28).translate(-L / 2, 0, 0).scale(1, 0.72, 1);
  const top = '#3c5870';
  const radius = (x) => { // body radius at x (from the profile), for placing spots
    const y = x + L / 2;
    for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) {
      const [r0, y0] = prof[i - 1], [r1, y1] = prof[i];
      return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
    }
    return 0;
  };
  const parts = [
    part(torso, countershade(top, '#eef0ec', -0.15, 0.12)),
    part(new THREE.BoxGeometry(0.12, 0.09, 1.25), '#1b2430', { pos: [4.18, -0.12, 0] }), // wide mouth
    part(fin([[0.6, 0], [-0.4, 0], [-0.55, 1.05]], 0.08), top, { pos: [-0.6, 0.62, 0] }), // first dorsal
    part(fin([[0.2, 0], [-0.15, 0], [-0.2, 0.32]], 0.05), top, { pos: [-2.6, 0.38, 0] }),
    part(fin([[0.6, 0], [-0.4, 0], [-0.9, -1.4]], 0.06), top, { pos: [1.7, -0.45, 0.75], rot: [-1.1, 0, 0] }),
    part(fin([[0.6, 0], [-0.4, 0], [-0.9, -1.4]], 0.06), top, { pos: [1.7, -0.45, -0.75], rot: [1.1, 0, 0] }),
    part(fin([[0.25, 0], [-0.9, 1.6], [-0.55, 0.05], [-0.9, -1.25]], 0.08), top, { pos: [-4.15, 0.05, 0] }), // crescent tail
    ...eyes(3.55, 0.12, 0.98, 0.07),
  ];
  // three ridges along the back, beads that follow the body's curve
  for (const th of [-0.5, 0, 0.5]) for (let x = -2.4; x <= 3.2; x += 0.22) {
    const r = radius(x);
    parts.push(part(ellipsoid(0.14, 0.035, 0.035, 6), '#6f8597', { pos: [x, Math.cos(th) * r * 0.72 + 0.01, Math.sin(th) * r] }));
  }
  // white spots over the back and sides (pseudo-random but fixed)
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 170; i++) {
    const x = -3.6 + rnd() * 7.4, th = (rnd() - 0.5) * 2.6; // angle from the top
    const r = radius(x) * 1.0;
    if (r < 0.3) continue;
    const y = Math.cos(th) * r * 0.72, z = Math.sin(th) * r;
    parts.push(part(ellipsoid(0.07, 0.07, 0.07, 6), '#f4f3ee', { pos: [x, y + 0.01, z], scale: [1, 0.5, 1], rot: [th, 0, 0] }));
  }
  return {
    id: 'whaleShark', name: L2('ジンベエザメ', 'Whale shark'), size: L, habitat: ['ocean'], water: ['tropical'],
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.55, freq: 0.75, waves: 0.5, nose: L / 2, len: L },
  };
}

// ---------- アオウミガメ (green turtle) ----------
export function greenTurtle() {
  const shell = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.56, 0.24, 0.46);
  const skin = '#b6a56f', paddle = '#8e8257';
  const flipper = fin([[0.1, 0], [-0.07, 0], [-0.3, 0.34], [-0.42, 0.55], [-0.33, 0.56], [-0.12, 0.38], [0.05, 0.15]], 0.03).rotateX(Math.PI / 2); // in the XZ plane, reaching +Z
  const rear = fin([[0.06, 0], [-0.05, 0], [-0.2, 0.18], [-0.1, 0.22]], 0.025).rotateX(Math.PI / 2);
  const mirror = (g) => g.clone().scale(1, 1, -1);
  const parts = [
    part(shell, '#5f7440'),
    part(ellipsoid(0.52, 0.06, 0.42), '#e5d6a3', { pos: [0, -0.01, 0] }), // plastron
    part(new THREE.TorusGeometry(0.5, 0.025, 6, 30).rotateX(Math.PI / 2).scale(1.1, 1, 0.92), '#4c5d32', { pos: [0, 0.01, 0] }), // shell rim
    part(ellipsoid(0.14, 0.11, 0.12), skin, { pos: [0.66, 0.04, 0] }), // head
    part(new THREE.CylinderGeometry(0.08, 0.1, 0.16, 10).rotateZ(Math.PI / 2), skin, { pos: [0.54, 0.02, 0] }), // neck
    part(flipper, paddle, { pos: [0.3, -0.02, 0.32] }),
    part(mirror(flipper), paddle, { pos: [0.3, -0.02, -0.32] }),
    part(rear, paddle, { pos: [-0.42, -0.03, 0.2] }),
    part(mirror(rear), paddle, { pos: [-0.42, -0.03, -0.2] }),
    ...eyes(0.74, 0.08, 0.085, 0.022),
  ];
  // scutes: a row of five down the middle and four each side
  const onShell = (x, z) => 0.24 * Math.sqrt(Math.max(0, 1 - (x / 0.56) ** 2 - (z / 0.46) ** 2));
  for (let i = 0; i < 5; i++) { const x = 0.34 - i * 0.17; parts.push(part(ellipsoid(0.1, 0.012, 0.09, 8), '#8a9a55', { pos: [x, onShell(x, 0) - 0.004, 0] })); }
  for (const sd of [1, -1]) for (let i = 0; i < 4; i++) { const x = 0.27 - i * 0.18; parts.push(part(ellipsoid(0.09, 0.012, 0.08, 8), '#7f9050', { pos: [x, onShell(x, 0.2) - 0.006, sd * 0.2], rot: [sd * 0.45, 0, 0] })); }
  return {
    id: 'greenTurtle', name: L2('アオウミガメ', 'Green sea turtle'), size: 1.2, habitat: ['lagoon', 'reef'], water: ['tropical', 'temperate'],
    geometry: assemble(parts),
    swim: { mode: 'flap', amp: 0.28, freq: 1.3, waves: 0.4, z0: 0.34, len: 0.5 },
  };
}

export const SPECIES = { blueTang, manta, blacktipShark, whaleShark, greenTurtle };

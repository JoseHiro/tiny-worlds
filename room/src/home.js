// The rest of the one-room flat (room/DESIGN.md §1.3, §1.4, §4.2, §4.3): the bed and the lamp beside it, the
// bookcase, the whiteboard, the little kitchen and the fridge, the coffee cart, the rug and the low table, the plants,
// the window with its curtains, the air conditioner, a box from a delivery. Chibi scale (1 m ≈ 0.76); parts face +z.
import * as THREE from 'three';
import { mat, mesh, rbox, box, cyl } from '../../airport/src/parts.js';
import { canvasTex } from './surfaces.js';

const M = (c, o) => mat(c, o);
const glow = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// ---------- the bed: a low wooden frame, a mattress, a rumpled duvet, two pillows (length along x, head at −x) ----------
export function bed({ l = 1.48, w = 0.74 } = {}) {
  const g = new THREE.Group(), wood = M(0xb08a5e, { roughness: 0.6 });
  g.add(box(l, 0.1, w, wood, 0, 0.09, 0));
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.add(box(0.05, 0.05, 0.05, wood, x * (l / 2 - 0.03), 0.025, z * (w / 2 - 0.03)));
  g.add(box(0.03, 0.32, w, wood, -l / 2 - 0.015, 0.2, 0)); // the headboard
  g.add(rbox(l - 0.02, 0.1, w - 0.03, 0.03, M(0xf0ece4, { roughness: 0.9 }), 0, 0.19, 0));
  // the duvet: a soft slab with lumps, folded back at the head, a corner turned down
  const du = new THREE.BoxGeometry(l * 0.72, 0.06, w + 0.04, 24, 1, 12), p = du.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i), edge = Math.abs(z) > w / 2 - 0.01;
    const lump = Math.sin(x * 9 + 1) * 0.012 + Math.sin(z * 11 + x * 4) * 0.01 + Math.cos(x * 23) * 0.004;
    p.setY(i, y + (y > 0 ? lump + 0.01 : 0) - (edge ? 0.06 : 0) - (Math.abs(z) > w / 2 - 0.05 ? 0.02 : 0));
  }
  du.computeVertexNormals();
  g.add(mesh(du, M(0x8fa3b8, { roughness: 1 }), l * 0.13, 0.27, 0));
  const fold = rbox(0.14, 0.05, w + 0.02, 0.025, M(0xe9e4da, { roughness: 1 }), -l * 0.24, 0.27, 0); g.add(fold); // the turned-back top, the cover's white inside
  for (const z of [-0.17, 0.17]) { const pl = rbox(0.18, 0.06, 0.3, 0.03, M(0xf6f3ec, { roughness: 1 }), -l / 2 + 0.13, 0.28, z); pl.rotation.z = 0.25; g.add(pl); }
  const cu = rbox(0.06, 0.16, 0.16, 0.04, M(0xd9a441, { roughness: 1 }), -l / 2 + 0.12, 0.33, 0.05); cu.rotation.set(0.2, 0.3, 0.35); g.add(cu); // a cushion
  g.userData.top = 0.3;
  return g;
}

export function sideTable() {
  const g = new THREE.Group(), wood = M(0x6b4a35, { roughness: 0.6 });
  g.add(box(0.28, 0.02, 0.26, wood, 0, 0.37, 0)); g.add(box(0.28, 0.02, 0.26, wood, 0, 0.16, 0));
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.add(box(0.02, 0.38, 0.02, wood, x * 0.125, 0.19, z * 0.115));
  g.add(box(0.1, 0.03, 0.14, M(0x9fd6c2), -0.05, 0.185, 0)); g.add(box(0.1, 0.025, 0.14, M(0xc9714a), -0.05, 0.212, 0)); // books on the low shelf
  const ph = rbox(0.05, 0.006, 0.1, 0.005, M(0x1c1c1e), 0.07, 0.383, 0.04); ph.rotation.y = 0.3; g.add(ph); // a phone charging
  g.add(box(0.035, 0.001, 0.07, glow(0x2a3a5a), 0.07, 0.387, 0.04));
  g.userData.top = 0.38;
  return g;
}
// the lamp on it: a ceramic base, a linen shade that glows (its light is added by the scene at userData.lightAt)
export function tableLamp() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.05, 18, 12), M(0x9db59a, { roughness: 0.35 }), 0, 0.05, 0));
  g.add(cyl(0.006, 0.006, 0.08, M(0xc9a24a, { metalness: 0.8, roughness: 0.3 }), 0, 0.12, 0, 8));
  const shade = new THREE.CylinderGeometry(0.055, 0.085, 0.11, 24, 1, true);
  const shadeM = new THREE.MeshStandardMaterial({ color: 0xf3e6cc, emissive: 0xffb36a, emissiveIntensity: 1.3, roughness: 1, side: THREE.DoubleSide }); shadeM.userData.k = 1.3;
  g.add(mesh(shade, shadeM, 0, 0.19, 0));
  g.userData.lightAt = [0, 0.17, 0]; g.userData.shade = shadeM;
  return g;
}

// ---------- the bookcase: four shelves of books, some lying flat, a plant, a box, a figure ----------
export function bookcase({ w = 0.6, d = 0.24, h = 1.32 } = {}) {
  const g = new THREE.Group(), wood = M(0xe9e2d4, { roughness: 0.7 });
  for (const s of [-1, 1]) g.add(box(0.02, h, d, wood, s * (w / 2 - 0.01), h / 2, 0));
  g.add(box(w, h, 0.01, M(0xd9d1c2), 0, h / 2, -d / 2 + 0.005));
  const levels = [0.02, 0.34, 0.66, 0.98, h - 0.01];
  for (const y of levels) g.add(box(w - 0.02, 0.02, d, wood, 0, y, 0));
  const COLS = [0x2f3e57, 0xc9714a, 0xefe3c8, 0x5f8f4a, 0x82aaff, 0x1e1f23, 0xd9a441, 0xb5452b, 0x6b4a35, 0x9db59a, 0xe2a9a0, 0x3a3f4a];
  levels.slice(0, 4).forEach((y, li) => {
    let x = -w / 2 + 0.03;
    const stop = li === 1 ? 0.05 : li === 3 ? -0.02 : w / 2 - 0.03;
    while (x < stop - 0.03) {
      const bw = 0.018 + rnd() * 0.02, bh = 0.17 + rnd() * 0.1, c = COLS[(rnd() * COLS.length) | 0];
      g.add(box(bw, bh, d * 0.8, M(c, { roughness: 0.8 }), x + bw / 2, y + 0.01 + bh / 2, 0.01));
      if (rnd() < 0.5) g.add(box(bw * 0.7, 0.008, 0.002, M(0xf2ede2), x + bw / 2, y + 0.01 + bh * 0.8, d * 0.4 + 0.012)); // a band on the spine
      x += bw + 0.002;
    }
    if (li === 1) { for (let k = 0; k < 4; k++) g.add(box(0.2, 0.025, 0.16, M(COLS[(k * 5) % COLS.length], { roughness: 0.8 }), 0.17, y + 0.023 + k * 0.026, 0)); } // a stack lying flat
    if (li === 3) { // a plant and a figure on the top shelf
      g.add(cyl(0.04, 0.032, 0.07, M(0xc9714a, { roughness: 0.8 }), 0.12, y + 0.045, 0));
      for (let k = 0; k < 7; k++) { const lf = mesh(new THREE.SphereGeometry(0.025, 8, 6), M(k % 2 ? 0x5f8f4a : 0x7fae5a, { roughness: 0.6 }), 0.12 + Math.cos(k) * 0.03, y + 0.1 + (k % 3) * 0.015, Math.sin(k) * 0.03); lf.scale.set(1, 0.4, 1.6); lf.rotation.y = k; g.add(lf); }
      g.add(rbox(0.04, 0.06, 0.03, 0.01, M(0x82aaff), 0.22, y + 0.04, 0.02)); g.add(mesh(new THREE.SphereGeometry(0.025, 12, 8), M(0xf1d2b6), 0.22, y + 0.095, 0.02));
    }
  });
  g.add(rbox(0.22, 0.12, 0.18, 0.01, M(0xc8a27a, { roughness: 0.9 }), 0, h + 0.06, 0)); // a storage box on top
  return g;
}

// ---------- the whiteboard: boxes and arrows of the thing being built, a TODO list ----------
export function whiteboard() {
  const t = canvasTex(512, 340, (x, w, h) => {
    x.fillStyle = '#f7f7f4'; x.fillRect(0, 0, w, h);
    x.lineWidth = 3; x.font = '600 20px "Marker Felt", "Comic Sans MS", sans-serif';
    const boxAt = (bx, by, label, c) => { x.strokeStyle = c; x.strokeRect(bx, by, 110, 46); x.fillStyle = c; x.fillText(label, bx + 12, by + 30); };
    boxAt(20, 30, 'readers', '#2f5fb5'); boxAt(200, 30, 'merge()', '#2f5fb5'); boxAt(200, 130, 'dedupe', '#c8283a'); boxAt(380, 30, 'API', '#2f5fb5');
    x.strokeStyle = '#333'; const arrow = (a, b, c, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); const an = Math.atan2(d - b, c - a); x.beginPath(); x.moveTo(c, d); x.lineTo(c - 12 * Math.cos(an - 0.4), d - 12 * Math.sin(an - 0.4)); x.moveTo(c, d); x.lineTo(c - 12 * Math.cos(an + 0.4), d - 12 * Math.sin(an + 0.4)); x.stroke(); };
    arrow(130, 53, 198, 53); arrow(255, 78, 255, 128); arrow(310, 53, 378, 53);
    x.fillStyle = '#c8283a'; x.fillText('?? same t', 330, 160);
    x.fillStyle = '#2a7a3a'; x.font = '600 19px "Marker Felt", "Comic Sans MS", sans-serif';
    ['TODO', '☑ parse logs', '☑ sort by time', '☐ dedupe (bug!)', '☐ deploy'].forEach((s, i) => x.fillText(s, 24, 120 + i * 36));
  });
  const g = new THREE.Group();
  g.add(box(0.58, 0.39, 0.015, M(0xb9bcc2, { metalness: 0.6, roughness: 0.4 }), 0, 0, 0));
  g.add(mesh(new THREE.PlaneGeometry(0.56, 0.37), new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }), 0, 0, 0.0085));
  g.add(box(0.4, 0.012, 0.03, M(0xb9bcc2, { metalness: 0.6 }), 0, -0.2, 0.015)); // the tray, a marker on it
  g.add(cyl(0.005, 0.005, 0.06, M(0x2f5fb5), 0.05, -0.19, 0.02, 8).rotateZ(Math.PI / 2));
  return g;
}

// ---------- the little kitchen: a counter with the sink and one hob, a cupboard over it with a light under ----------
export function kitchenette({ l = 0.8, d = 0.42, h = 0.65 } = {}) { // length along x
  const g = new THREE.Group(), white = M(0xf2efe8, { roughness: 0.5 }), steel = M(0xc9ccd1, { metalness: 0.85, roughness: 0.25 });
  g.add(box(l, h - 0.03, d - 0.02, white, 0, (h - 0.03) / 2, -0.01));
  for (const x of [-l / 4, l / 4]) { g.add(box(l / 2 - 0.01, h - 0.1, 0.005, M(0xe7e2d8, { roughness: 0.5 }), x, (h - 0.03) / 2 + 0.02, d / 2 - 0.018)); g.add(box(0.08, 0.008, 0.012, steel, x, h - 0.11, d / 2 - 0.01)); }
  g.add(box(l, 0.03, d, steel, 0, h - 0.015, 0)); // the steel top
  g.add(box(0.3, 0.012, 0.26, M(0x8a8d93, { metalness: 0.8, roughness: 0.3 }), -l / 4, h - 0.006, 0)); // the sink
  const tap = new THREE.Group(); tap.position.set(-l / 4, h, -d / 2 + 0.05); g.add(tap);
  tap.add(cyl(0.01, 0.012, 0.12, steel, 0, 0.06, 0, 10)); const sp = cyl(0.007, 0.007, 0.1, steel, 0, 0.12, 0.045, 8); sp.rotation.x = Math.PI / 2; tap.add(sp);
  g.add(box(0.25, 0.008, 0.25, M(0x111113, { roughness: 0.1, metalness: 0.3 }), l / 4 + 0.02, h + 0.004, 0)); // the hob, its ring
  g.add(mesh(new THREE.RingGeometry(0.06, 0.068, 32).rotateX(-Math.PI / 2), M(0x5a5d63), l / 4 + 0.02, h + 0.0085, 0));
  // a little pot on the hob, a dish rack by the sink with two cups and a plate
  g.add(cyl(0.07, 0.07, 0.07, M(0xd9482b, { roughness: 0.4 }), l / 4 + 0.02, h + 0.043, 0, 20)); g.add(cyl(0.072, 0.072, 0.008, M(0x2a2a2c), l / 4 + 0.02, h + 0.08, 0, 20));
  const rack = new THREE.Group(); rack.position.set(-l / 2 + 0.06, h, 0.04); g.add(rack);
  rack.add(box(0.1, 0.005, 0.18, steel, 0, 0.003, 0)); for (const z of [-0.09, 0.09]) rack.add(box(0.1, 0.05, 0.004, steel, 0, 0.028, z));
  const plate = cyl(0.06, 0.06, 0.006, M(0xf6f3ec), 0.0, 0.065, 0.0, 20); plate.rotation.z = Math.PI / 2 - 0.2; rack.add(plate);
  // the cupboard on the wall above, its light strip underneath
  const up = new THREE.Group(); up.position.set(0, 1.22, -d / 2 + 0.16); g.add(up);
  up.add(box(l, 0.32, 0.3, white, 0, 0, 0));
  for (const x of [-l / 4, l / 4]) { up.add(box(l / 2 - 0.01, 0.3, 0.005, M(0xe7e2d8), x, 0, 0.152)); up.add(box(0.008, 0.06, 0.012, steel, x + (x < 0 ? l / 4 - 0.04 : -l / 4 + 0.04), -0.1, 0.158)); }
  up.add(box(l - 0.06, 0.006, 0.02, glow(0xffd8a8, 1.6), 0, -0.163, 0.08));
  g.userData.lightAt = [0, 1.05, -d / 2 + 0.24]; g.userData.top = h;
  return g;
}

export function fridge() {
  const g = new THREE.Group(), w = 0.38, d = 0.42, h = 0.66, white = M(0xe9e6df, { roughness: 0.35 });
  g.add(rbox(w, h, d, 0.02, white, 0, h / 2, 0));
  g.add(box(w - 0.01, 0.006, 0.004, M(0xbdbab2), 0, h * 0.62, d / 2 + 0.001)); // the freezer door line
  for (const y of [h * 0.78, h * 0.4]) g.add(box(0.012, 0.1, 0.02, M(0xbdbab2), w / 2 - 0.04, y, d / 2 + 0.01));
  const mags = [[0xe8673c, -0.08, h * 0.5], [0x82aaff, 0.0, h * 0.45], [0xffcb6b, -0.05, h * 0.8]];
  for (const [c, x, y] of mags) g.add(box(0.03, 0.03, 0.006, M(c), x, y, d / 2 + 0.003));
  g.add(mesh(new THREE.PlaneGeometry(0.07, 0.09), M(0xf6f3ec, { roughness: 1 }), -0.06, h * 0.48, d / 2 + 0.002)); // a note under a magnet
  // the microwave on top
  const mw = new THREE.Group(); mw.position.y = h; g.add(mw);
  mw.add(rbox(0.36, 0.2, 0.3, 0.012, M(0x2b2d33, { roughness: 0.4 }), 0, 0.1, 0));
  mw.add(box(0.24, 0.14, 0.004, M(0x0d0f12, { roughness: 0.1 }), -0.04, 0.1, 0.151));
  mw.add(box(0.05, 0.012, 0.004, glow(0x5ad1ff, 1.3), 0.13, 0.16, 0.152)); // the clock
  return g;
}

// ---------- the coffee cart: three shelves; the kettle, grinder, scale and dripper on top, beans and mugs below ----------
export function coffeeCart() {
  const g = new THREE.Group(), w = 0.32, d = 0.24, black = M(0x2a2c31, { roughness: 0.4, metalness: 0.6 }), wood = M(0xc49a6c, { roughness: 0.6 });
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { g.add(cyl(0.007, 0.007, 0.56, black, x * (w / 2 - 0.01), 0.3, z * (d / 2 - 0.01), 8)); g.add(mesh(new THREE.SphereGeometry(0.014, 8, 6), M(0x111111), x * (w / 2 - 0.01), 0.014, z * (d / 2 - 0.01))); }
  for (const y of [0.08, 0.32, 0.56]) g.add(box(w, 0.015, d, wood, 0, y, 0));
  const top = 0.568;
  // the gooseneck kettle on its base (its temperature lit)
  const k = new THREE.Group(); k.position.set(-0.08, top, -0.02); g.add(k);
  k.add(cyl(0.05, 0.05, 0.015, M(0x1a1b1f), 0, 0.008, 0, 20)); k.add(box(0.03, 0.01, 0.002, glow(0xff8a4a, 2), 0, 0.009, 0.05));
  k.add(mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.08, 20), M(0x1e1f23, { roughness: 0.3, metalness: 0.5 }), 0, 0.055, 0));
  const spout = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.035, 0.03, 0), new THREE.Vector3(0.09, 0.03, 0), new THREE.Vector3(0.1, 0.11, 0)), 10, 0.004, 6);
  k.add(mesh(spout, M(0x1e1f23, { metalness: 0.5, roughness: 0.3 }))); k.add(mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 14, Math.PI).rotateZ(-Math.PI / 2), M(0x1e1f23), -0.045, 0.055, 0)); // the handle
  k.add(cyl(0.012, 0.012, 0.01, M(0x6b4a35), 0, 0.1, 0, 10));
  // the hand grinder, the scale with the dripper and server on it
  const gr = new THREE.Group(); gr.position.set(0.04, top, 0.06); g.add(gr);
  gr.add(cyl(0.022, 0.022, 0.1, M(0xb9bcc2, { metalness: 0.8, roughness: 0.3 }), 0, 0.05, 0, 16)); gr.add(cyl(0.004, 0.004, 0.05, M(0x2a2c31), 0.02, 0.11, 0, 6).rotateZ(Math.PI / 2)); gr.add(mesh(new THREE.SphereGeometry(0.008, 8, 6), wood, 0.045, 0.12, 0));
  const sc = new THREE.Group(); sc.position.set(0.07, top, -0.05); g.add(sc);
  sc.add(rbox(0.12, 0.012, 0.1, 0.005, M(0x1e1f23), 0, 0.006, 0)); sc.add(box(0.035, 0.008, 0.001, glow(0x9fe8ff, 1.6), 0, 0.007, 0.0505));
  sc.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.06, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8e2ea, transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide }), 0, 0.042, 0)); // the glass server
  sc.add(mesh(new THREE.CircleGeometry(0.03, 16).rotateX(-Math.PI / 2), M(0x3a2214, { roughness: 0.1 }), 0, 0.025, 0));
  sc.add(mesh(new THREE.CylinderGeometry(0.045, 0.02, 0.045, 16), M(0xf2efe8, { roughness: 0.3 }), 0, 0.095, 0)); // the dripper
  // below: bags of beans, filters, three mugs; at the bottom a basket
  for (let i = 0; i < 3; i++) { const b = rbox(0.06, 0.09, 0.04, 0.01, M([0x6b4a35, 0x2f3e57, 0xd9a441][i], { roughness: 0.8 }), -0.1 + i * 0.07, 0.38, -0.04); b.rotation.y = (i - 1) * 0.2; g.add(b); }
  for (let i = 0; i < 3; i++) { g.add(cyl(0.022, 0.022, 0.05, M([0xf2efe8, 0xe8673c, 0x9fd6c2][i], { roughness: 0.3 }), -0.08 + i * 0.07, 0.353, 0.06, 14)); }
  g.add(rbox(0.26, 0.1, 0.2, 0.02, M(0xb08a5a, { roughness: 1 }), 0, 0.14, 0));
  g.userData.top = top;
  return g;
}

// ---------- the rug, the low table, a floor cushion, a game controller ----------
export function rug(w = 1.1, d = 0.8) {
  const t = canvasTex(256, 192, (x, cw, ch) => {
    x.fillStyle = '#b9a68a'; x.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 14000; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(90,70,50,0.12)' : 'rgba(255,245,225,0.1)'; x.fillRect(Math.random() * cw, Math.random() * ch, 1.5, 3); }
    x.strokeStyle = 'rgba(120,95,70,0.5)'; x.lineWidth = 4; x.strokeRect(14, 14, cw - 28, ch - 28); x.lineWidth = 2; x.strokeRect(24, 24, cw - 48, ch - 48);
  });
  const m = mesh(new THREE.BoxGeometry(w, 0.012, d), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), 0, 0.006, 0); m.castShadow = false; return m;
}
export function lowTable() {
  const g = new THREE.Group(), wood = M(0xc49a6c, { roughness: 0.55 });
  g.add(rbox(0.56, 0.03, 0.4, 0.012, wood, 0, 0.27, 0));
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.add(cyl(0.015, 0.012, 0.26, wood, x * 0.24, 0.13, z * 0.16, 10));
  // a controller, a magazine, a mug, a small console under the table
  const pad = new THREE.Group(); pad.position.set(0.1, 0.29, 0.05); pad.rotation.y = 0.4; g.add(pad);
  pad.add(rbox(0.1, 0.018, 0.05, 0.012, M(0x2f3a4a, { roughness: 0.5 }), 0, 0.009, 0));
  for (const s of [-1, 1]) pad.add(mesh(new THREE.SphereGeometry(0.026, 10, 8), M(0x2f3a4a, { roughness: 0.5 }), s * 0.045, 0.008, 0.012));
  pad.add(box(0.012, 0.004, 0.012, glow(0x82aaff, 1.4), 0, 0.019, -0.012));
  const mag = box(0.16, 0.006, 0.21, M(0xe8673c, { roughness: 0.8 }), -0.13, 0.288, -0.03); mag.rotation.y = -0.2; g.add(mag);
  
  g.add(rbox(0.22, 0.05, 0.16, 0.012, M(0xeeeae2, { roughness: 0.4 }), 0, 0.06, 0)); g.add(box(0.012, 0.004, 0.003, glow(0x5ad1ff, 1.5), 0.08, 0.06, 0.081));
  return g;
}
export function floorCushion(color = 0x9db59a) {
  const c = rbox(0.34, 0.08, 0.34, 0.04, M(color, { roughness: 1 }), 0, 0.04, 0);
  const p = c.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.02) p.setY(i, p.getY(i) + 0.015 * (1 - (p.getX(i) ** 2 + p.getZ(i) ** 2) / 0.06)); c.geometry.computeVertexNormals();
  return c;
}

// ---------- plants: a monstera with split leaves in a basket, a little cactus ----------
const monsteraLeaf = (() => {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.09, 0.02, 0.12, 0.12, 0, 0.2); s.bezierCurveTo(-0.12, 0.12, -0.09, 0.02, 0, 0);
  for (const [x, y, r] of [[0.05, 0.08, 0.012], [-0.05, 0.1, 0.012], [0.06, 0.13, 0.01], [-0.055, 0.06, 0.01]]) { const h = new THREE.Path(); h.absellipse(x, y, r * 1.6, r, 0, Math.PI * 2, false, 0.4); s.holes.push(h); }
  const g = new THREE.ShapeGeometry(s, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -Math.abs(p.getX(i)) * 0.35); g.computeVertexNormals(); return g;
})();
export function monstera() {
  const g = new THREE.Group();
  g.add(cyl(0.11, 0.09, 0.18, M(0xb08a5a, { roughness: 1 }), 0, 0.09, 0, 18)); // the basket
  g.add(mesh(new THREE.CircleGeometry(0.1, 16).rotateX(-Math.PI / 2), M(0x3a2a1c, { roughness: 1 }), 0, 0.17, 0));
  const stem = M(0x5f7f3a, { roughness: 0.7 }), leaf = [M(0x3f6f3a, { roughness: 0.55, side: THREE.DoubleSide }), M(0x4f7f42, { roughness: 0.55, side: THREE.DoubleSide })];
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4, len = 0.3 + (k % 4) * 0.08, out = 0.08 + (k % 3) * 0.06;
    const tip = new THREE.Vector3(Math.cos(a) * out, 0.17 + len, Math.sin(a) * out);
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.17, 0), new THREE.Vector3(Math.cos(a) * out * 0.3, 0.17 + len * 0.7, Math.sin(a) * out * 0.3), tip);
    g.add(mesh(new THREE.TubeGeometry(c, 8, 0.005, 5), stem));
    const lf = mesh(monsteraLeaf, leaf[k % 2]); lf.position.copy(tip); lf.rotation.set(-0.9 - (k % 3) * 0.25, -a + Math.PI / 2, 0, 'YXZ'); lf.scale.setScalar(1.1 + (k % 3) * 0.25); g.add(lf);
  }
  return g;
}

// ---------- the window: an aluminium frame with two sliding panes, a sill, curtains on a rail (w × h, at its centre) ----------
export function windowSet({ w = 1.0, h = 1.0 } = {}) {
  const g = new THREE.Group(), al = M(0x9a9da3, { metalness: 0.7, roughness: 0.35 });
  for (const s of [-1, 1]) { g.add(box(0.03, h, 0.06, al, s * (w / 2 - 0.015), 0, 0)); g.add(box(w, 0.03, 0.06, al, 0, s * (h / 2 - 0.015), 0)); }
  g.add(box(0.025, h - 0.04, 0.03, al, 0.02, 0, 0.012)); // where the two panes overlap
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.4, depthWrite: false });
  for (const s of [-1, 1]) g.add(mesh(new THREE.PlaneGeometry(w / 2 - 0.03, h - 0.05), glass, s * (w / 4) + 0.01 * s, 0, s * 0.01));
  g.add(box(w + 0.08, 0.02, 0.1, M(0xeeeae2, { roughness: 0.6 }), 0, -h / 2 - 0.01, 0.06)); // the sill
  // the rail and the curtains: a thick one bunched to the left, a lace one half across, a T-shirt drying on a hanger
  const rail = cyl(0.008, 0.008, w + 0.4, M(0xd9d4cc), 0, h / 2 + 0.07, 0.12, 8); rail.rotation.z = Math.PI / 2; g.add(rail);
  const curtain = (cw, ch, folds, color, opacity, x) => {
    const geo = new THREE.PlaneGeometry(cw, ch, folds * 4, 4), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / cw) * folds * Math.PI * 2) * 0.018 * (0.6 + 0.4 * (0.5 - p.getY(i) / ch)));
    geo.computeVertexNormals();
    const m = mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }), x, h / 2 + 0.07 - ch / 2, 0.13);
    if (opacity < 1) m.castShadow = false;
    return m;
  };
  g.add(curtain(0.26, h + 0.28, 4, 0x56685a, 1, -w / 2 - 0.06));
  g.add(curtain(0.16, h + 0.28, 3, 0x56685a, 1, w / 2 + 0.1));
  g.add(curtain(0.34, h + 0.22, 5, 0xf6f3ec, 0.22, -w / 4 - 0.04)); // the lace, a third of the way across
  const hanger = new THREE.Group(); hanger.position.set(w * 0.28, h / 2 + 0.07, 0.15); g.add(hanger);
  hanger.add(mesh(new THREE.TorusGeometry(0.012, 0.002, 4, 10, Math.PI * 1.5), M(0x2a2c31), 0, 0.0, 0));
  const tee = new THREE.Shape(); tee.moveTo(-0.05, -0.02); tee.lineTo(-0.1, -0.05); tee.lineTo(-0.08, -0.09); tee.lineTo(-0.055, -0.075); tee.lineTo(-0.055, -0.24); tee.lineTo(0.055, -0.24); tee.lineTo(0.055, -0.075); tee.lineTo(0.08, -0.09); tee.lineTo(0.1, -0.05); tee.lineTo(0.05, -0.02); tee.quadraticCurveTo(0, -0.05, -0.05, -0.02);
  hanger.add(mesh(new THREE.ExtrudeGeometry(tee, { depth: 0.01, bevelEnabled: false }), M(0xe2a9a0, { roughness: 1 }), 0, 0, -0.005));
  return g;
}

export function aircon() {
  const g = new THREE.Group();
  g.add(rbox(0.6, 0.2, 0.16, 0.04, M(0xf4f2ee, { roughness: 0.5 }), 0, 0, 0));
  g.add(box(0.5, 0.012, 0.004, M(0xd6d3cc), 0, -0.07, 0.081)); g.add(box(0.012, 0.006, 0.002, glow(0x9fe8ff, 1.2), 0.24, -0.04, 0.081));
  return g;
}
export function cardboardBox() {
  const g = new THREE.Group(), card = M(0xc8a27a, { roughness: 1 });
  g.add(box(0.34, 0.22, 0.26, card, 0, 0.11, 0));
  g.add(box(0.34, 0.002, 0.04, M(0xd9c7a0, { roughness: 0.5 }), 0, 0.221, 0)); // the tape
  g.add(box(0.1, 0.07, 0.002, M(0xf6f3ec), 0.08, 0.13, 0.131)); // the label
  return g;
}
export function wallClock() {
  const g = new THREE.Group();
  g.add(cyl(0.09, 0.09, 0.02, M(0x2a2c31), 0, 0, 0, 28).rotateX(Math.PI / 2));
  g.add(mesh(new THREE.CircleGeometry(0.08, 28), M(0xf6f3ec, { roughness: 0.8 }), 0, 0, 0.011));
  const hands = []; for (const [len, wd] of [[0.045, 0.006], [0.065, 0.004]]) { const h = new THREE.Group(); h.position.z = 0.013; const b = box(wd, len, 0.002, M(0x1e1f23), 0, len / 2, 0); h.add(b); g.add(h); hands.push(h); }
  hands.forEach((h) => (h.userData.dynamic = true));
  g.userData.set = (hours) => { hands[0].rotation.z = -(hours / 12) * Math.PI * 2; hands[1].rotation.z = -(hours % 1) * Math.PI * 2; };
  return g;
}

// ---------- the cat, curled up asleep (§5.3): a round body, the head tucked on the front paws, the tail round the
// body; it breathes, an ear flicks now and then, the tip of the tail twitches. Faces +x (its head), about 0.3 long.
export function sleepingCat({ fur = 0xe0a060, white = 0xf6f2ea } = {}) {
  const g = new THREE.Group(), f = M(fur, { roughness: 0.95 }), w = M(white, { roughness: 0.95 }), dark = M(0x2a2018);
  const body = new THREE.Group(); g.add(body);
  const b = mesh(new THREE.SphereGeometry(0.1, 20, 14), f, 0, 0.075, 0); b.scale.set(1.35, 0.75, 1.05); body.add(b);
  const hip = mesh(new THREE.SphereGeometry(0.075, 16, 12), f, -0.08, 0.07, -0.03); hip.scale.set(1, 0.8, 1); body.add(hip);
  for (const [x, z] of [[0.025, -0.03], [-0.06, 0.04]]) { const s = mesh(new THREE.SphereGeometry(0.03, 10, 8), f, x, 0.13, z); s.scale.set(2.2, 0.5, 1.6); body.add(s); } // the back, a little fuller on top
  // the front paws, side by side, the chin on them
  for (const z of [0.035, 0.075]) { const p = mesh(new THREE.CapsuleGeometry(0.018, 0.06, 4, 8).rotateZ(Math.PI / 2), w, 0.12, 0.025, z); body.add(p); }
  const head = new THREE.Group(); head.position.set(0.12, 0.075, 0.05); head.rotation.set(0.15, -0.5, -0.25); body.add(head);
  const hd = mesh(new THREE.SphereGeometry(0.058, 18, 14), f); hd.scale.set(1, 0.88, 1.05); head.add(hd);
  const muzzle = mesh(new THREE.SphereGeometry(0.03, 12, 10), w, 0.042, -0.014, 0); muzzle.scale.set(0.8, 0.7, 1.1); head.add(muzzle);
  head.add(mesh(new THREE.SphereGeometry(0.007, 8, 6), M(0xd98a8a), 0.066, -0.004, 0)); // the nose
  for (const z of [-0.022, 0.022]) { const e = box(0.003, 0.002, 0.016, dark, 0.05, 0.012, z); e.rotation.y = z > 0 ? -0.3 : 0.3; head.add(e); } // eyes shut: two short lines
  const ears = [];
  for (const z of [-0.03, 0.03]) { const ear = new THREE.Group(); ear.position.set(-0.005, 0.045, z); ear.rotation.x = z > 0 ? 0.35 : -0.35; head.add(ear); ear.add(mesh(new THREE.ConeGeometry(0.02, 0.038, 4), f, 0, 0.016, 0)); ear.add(mesh(new THREE.ConeGeometry(0.011, 0.024, 4), M(0xe8b0a0), 0.006, 0.014, 0)); ears.push(ear); }
  // the tail round the front of the body, its tip resting by the nose
  const tailPts = [[-0.15, 0.04, -0.02], [-0.16, 0.03, 0.08], [-0.06, 0.025, 0.13], [0.06, 0.025, 0.125], [0.13, 0.03, 0.1]].map((p) => new THREE.Vector3(...p));
  const tail = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPts), 24, 0.019, 8), f); body.add(tail);
  const tip = new THREE.Group(); tip.position.copy(tailPts[4]); body.add(tip); tip.add(mesh(new THREE.SphereGeometry(0.019, 10, 8), w)); tip.userData.dynamic = true;
  g.userData = { kind: 'animal', animal: 'cat' };
  g.userData.update = (t) => {
    const br = Math.sin(t * 1.6); body.scale.set(1, 1 + br * 0.025, 1 + br * 0.012); // breathing
    const flick = Math.max(0, Math.sin(t * 0.7) - 0.96) * 25; ears[1].rotation.z = -flick * 0.4; // an ear, now and then
    tip.position.set(tailPts[4].x + Math.sin(t * 3) * 0.004 * (Math.sin(t * 0.3) > 0.5 ? 1 : 0), tailPts[4].y, tailPts[4].z);
  };
  return g;
}

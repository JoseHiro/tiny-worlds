// Stall parts shared by every stall (bangkok/DESIGN.md §5, K1–K10). The customer side is +Z, the vendor stands at −Z;
// counters run along X. A stall = a base (cart or table) + a roof (parasol or tent) + cooking kit + food + a vendor.
import * as THREE from 'three';
import { PALETTE, BK, M, mat, bx, rb, cy, sp, cn, put, pivot, group, bits, rng, BOX, CYL, SPH, COAL, stripeMat, checkMat, signPlane, puffs, flame, gasRing, stateful, liveAll, addTo } from './common.js';

// ---------- K1 the stainless cart (rot khen) ----------
// 1.2 long, counter at 0.66; a glass case on the left half, room to cook on the right, a lit sign on top.
export function cart({ sign = 'padthai', gas = PALETTE.red, caseW = 0.66 } = {}) {
  const g = new THREE.Group();
  rb(g, 1.2, 0.5, 0.55, 0.03, M.steel, 0, 0.38, 0);
  bx(g, 1.16, 0.012, 0.5, M.darkSteel, 0, 0.3, 0.02); // the shelf line
  for (const x of [-0.3, 0.3]) bx(g, 0.012, 0.36, 0.01, M.darkSteel, x, 0.4, 0.278); // door seams
  bx(g, 1.24, 0.03, 0.6, M.steel, 0, 0.645, 0);
  // two bicycle wheels on one side, two legs on the other
  for (const z of [-0.3, 0.3]) {
    const w = cy(g, 0.13, 0.13, 0.03, M.iron, 0.42, 0.13, z, 16); w.rotation.x = Math.PI / 2;
    const hub = cy(g, 0.03, 0.03, 0.035, M.steel, 0.42, 0.13, z, 8); hub.rotation.x = Math.PI / 2;
    bx(g, 0.03, 0.14, 0.03, M.steel, -0.52, 0.07, z * 0.8);
  }
  // the glass case: posts, a shelf, glass on three sides and the top
  const cx = -0.6 + caseW / 2, top = 0.66, ch = 0.44;
  for (const x of [-0.58, -0.58 + caseW]) for (const z of [-0.26, 0.26]) bx(g, 0.02, ch, 0.02, M.steel, x, top + ch / 2, z);
  bx(g, caseW, 0.012, 0.5, M.steel, cx, top + 0.22, 0);
  bx(g, caseW, ch, 0.006, M.glass, cx, top + ch / 2, 0.26);
  for (const x of [-0.58, -0.58 + caseW]) bx(g, 0.006, ch, 0.52, M.glass, x, top + ch / 2, 0);
  bx(g, caseW + 0.02, 0.02, 0.54, M.steel, cx, top + ch, 0);
  // the sign on a frame over the case
  for (const x of [-0.55, 0.55]) bx(g, 0.02, 0.36, 0.02, M.steel, x, top + ch + 0.18, 0.24);
  bx(g, 1.16, 0.34, 0.03, M.ink, 0, top + ch + 0.33, 0.24);
  const s = signPlane(sign, 1.1, 0.3); s.position.set(0, top + ch + 0.33, 0.257); g.add(s);
  // the gas cylinder at the back corner
  addTo(g, gasCylinder(gas)).position.set(0.5, 0, -0.42);
  g.userData = { kind: 'cart', top, case: [cx, top + 0.23, 0], caseFloor: [cx, top, 0], cook: [0.32, top, -0.02], vendor: [0.2, -0.7] };
  return g;
}
export function gasCylinder(color = PALETTE.red) {
  const g = new THREE.Group();
  rb(g, 0.18, 0.4, 0.18, 0.08, mat(color, { roughness: 0.4 }), 0, 0.2, 0);
  cy(g, 0.05, 0.05, 0.06, M.steel, 0, 0.42, 0, 10);
  cy(g, 0.015, 0.015, 0.05, M.ink, 0, 0.47, 0, 6);
  return g;
}

// ---------- K2 folding table with a vinyl cloth ----------
export function foldTable({ w = 0.8, d = 0.55, h = 0.56, cloth = [0xd9342b, 0xf4f0e8] } = {}) {
  const g = new THREE.Group();
  bx(g, w, 0.02, d, cloth ? checkMat(...cloth) : M.steel, 0, h, 0);
  if (cloth) { for (const z of [-d / 2, d / 2]) bx(g, w, 0.08, 0.005, checkMat(...cloth), 0, h - 0.05, z); }
  for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) for (const z of [-d / 2 + 0.04, d / 2 - 0.04]) cy(g, 0.012, 0.012, h, M.steel, x, h / 2, z, 6);
  g.userData = { kind: 'table', top: h };
  return g;
}

// ---------- K3 parasol ----------
export function parasol({ colors = [0xd9342b, 0xf4f0e8], r = 1.0, h = 2.1, tilt = 0 } = {}) {
  const g = new THREE.Group();
  const p = pivot(g, 0, 0, 0);
  p.rotation.z = tilt;
  cy(p, 0.018, 0.018, h, M.steel, 0, h / 2, 0, 6);
  const top = put(p, new THREE.ConeGeometry(r, 0.34, 12, 1, true), stripeMat(colors[0], colors[1] ?? colors[0], 12), 0, h - 0.1, 0);
  top.castShadow = true;
  cn(p, 0.025, 0.08, M.ink, 0, h + 0.1, 0, 6);
  // a weighted base
  cy(g, 0.16, 0.18, 0.06, M.iron, 0, 0.03, 0, 12);
  g.userData = { kind: 'parasol' };
  return g;
}

// ---------- K4 charcoal grill ----------
// A long steel trough on legs, glowing coals, a grate; userData.grate is where skewers lie.
export function grill({ len = 0.7, smoke = true } = {}) {
  const g = new THREE.Group();
  const H = 0.6;
  bx(g, len, 0.1, 0.28, M.darkSteel, 0, H, 0);
  for (const z of [-0.14, 0.14]) bx(g, len, 0.06, 0.012, M.steel, 0, H + 0.06, z);
  for (const x of [-len / 2 + 0.04, len / 2 - 0.04]) for (const z of [-0.1, 0.1]) bx(g, 0.025, H - 0.05, 0.025, M.darkSteel, x, (H - 0.05) / 2, z);
  const rnd = rng(4);
  bits(g, BOX(0.045, 0.03, 0.04), COAL, Array.from({ length: Math.round(len * 40) }, () => [(rnd() - 0.5) * (len - 0.06), H + 0.06 + rnd() * 0.02, (rnd() - 0.5) * 0.22, rnd(), rnd() * 3, rnd()]));
  for (let i = 0; i < 6; i++) { const b = cy(g, 0.004, 0.004, len, M.steel, 0, H + 0.085, -0.11 + i * 0.044, 4); b.rotation.z = Math.PI / 2; }
  if (smoke) addTo(g, puffs('smoke', { n: 5, rise: 0.9, size: 0.3, spread: len * 0.6, seed: 3 })).position.set(0, H + 0.12, 0);
  g.userData = { kind: 'grill', grate: H + 0.09, len };
  return liveAll(g);
}

// ---------- K5 gas wok stove ----------
// A ring stand over a burner, the wok on top. state.toss 0 → 1 tilts the wok and throws up the fire.
export function wokStove({ food = null } = {}) {
  const g = new THREE.Group();
  const H = 0.56;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; bx(g, 0.03, H, 0.03, M.iron, Math.cos(a) * 0.18, H / 2, Math.sin(a) * 0.18); }
  const ring = put(g, new THREE.TorusGeometry(0.19, 0.015, 6, 20), M.iron, 0, H, 0); ring.rotation.x = Math.PI / 2;
  cy(g, 0.07, 0.08, 0.06, M.iron, 0, H - 0.08, 0, 12);
  addTo(g, gasRing(0.06)).position.y = H - 0.05;
  const wok = pivot(g, 0, H + 0.13, 0);
  put(wok, new THREE.SphereGeometry(0.22, 18, 8, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), M.iron, 0, 0, 0).material = mat(0x24252a, { metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide });
  const handle = cy(wok, 0.012, 0.012, 0.22, M.ink, -0.3, -0.08, 0, 6); handle.rotation.z = Math.PI / 2 - 0.25;
  if (food) { food.position.y = -0.15; wok.add(food); }
  const fire = flame({ r: 0.14, h: 0.34, n: 6 });
  fire.position.set(0.1, H + 0.06, 0);
  g.add(fire);
  const ladle = pivot(g, 0.02, H + 0.28, -0.05);
  cy(ladle, 0.008, 0.008, 0.28, M.steel, 0, 0, 0, 5).rotation.z = 0.6;
  const cupL = put(ladle, new THREE.SphereGeometry(0.04, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.steel, 0.08, -0.12, 0);
  cupL.material = mat(0xc9ccd1, { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide });
  stateful(g, { toss: 0 }, (s, t) => {
    const k = s.toss * Math.max(0, Math.sin(t * 5));
    wok.rotation.z = -0.25 * k;
    wok.position.y = H + 0.13 + 0.03 * k;
    fire.userData.flare = 0.15 + s.toss * (0.4 + 0.6 * k);
    ladle.rotation.y = Math.sin(t * 6) * 0.6 * (0.3 + s.toss);
  });
  g.userData.kind = 'wok';
  return liveAll(g);
}

// ---------- K6 stock pot ----------
export function stockPot({ r = 0.16, h = 0.3, broth = 0xd9b98a, stand = true, steam = true } = {}) {
  const g = new THREE.Group();
  const y0 = stand ? 0.42 : 0;
  if (stand) { cy(g, r * 0.9, r * 1.0, y0, M.darkSteel, 0, y0 / 2, 0, 12); addTo(g, gasRing(r * 0.6)).position.y = y0 - 0.02; }
  put(g, CYL(r, r * 0.95, h, 18, true), mat(BK.steel, { metalness: 0.65, roughness: 0.28, side: THREE.DoubleSide }), 0, y0 + h / 2, 0);
  cy(g, r * 0.95, r * 0.95, 0.01, M.steel, 0, y0 + 0.005, 0, 18);
  cy(g, r * 0.96, r * 0.96, 0.01, M.food(broth, { roughness: 0.15 }), 0, y0 + h * 0.85, 0, 18);
  for (const s of [-1, 1]) bx(g, 0.03, 0.02, 0.06, M.steel, s * (r + 0.015), y0 + h * 0.85, 0);
  const ladle = cy(g, 0.008, 0.008, 0.36, M.steel, r * 0.4, y0 + h + 0.05, 0, 5); ladle.rotation.z = -0.4;
  if (steam) addTo(g, puffs('steam', { n: 4, rise: 0.5, size: r * 1.3, spread: r, seed: 7 })).position.y = y0 + h;
  g.userData = { kind: 'pot', top: y0 + h };
  return liveAll(g);
}

// ---------- K7 griddle ----------
export function griddle({ w = 0.55, d = 0.38, steam = true } = {}) {
  const g = new THREE.Group();
  const H = 0.6;
  rb(g, w + 0.04, H - 0.04, d + 0.04, 0.02, M.steel, 0, (H - 0.04) / 2, 0);
  bx(g, w, 0.025, d, mat(0x2a2b30, { metalness: 0.5, roughness: 0.35 }), 0, H, 0);
  for (const z of [-d / 2, d / 2]) bx(g, w, 0.04, 0.012, M.steel, 0, H + 0.02, z);
  if (steam) addTo(g, puffs('steam', { n: 3, rise: 0.4, size: 0.2, spread: w * 0.6, seed: 9 })).position.y = H + 0.02;
  g.userData = { kind: 'griddle', top: H + 0.013 };
  return liveAll(g);
}

// ---------- K8 ice display box ----------
// A glass-sided steel tray of crushed ice; userData.ice is the ice top.
export function iceCase({ w = 0.7, d = 0.4, h = 0.0 } = {}) {
  const g = new THREE.Group();
  bx(g, w, 0.04, d, M.steel, 0, h + 0.02, 0);
  const rnd = rng(5);
  bits(g, BOX(0.03, 0.02, 0.03), M.clear(0xf4fbff, 0.85), Array.from({ length: Math.round(w * d * 900) }, () => [(rnd() - 0.5) * (w - 0.03), h + 0.045 + rnd() * 0.015, (rnd() - 0.5) * (d - 0.03), rnd() * 3, rnd() * 3, rnd() * 3]));
  for (const z of [-d / 2, d / 2]) bx(g, w, 0.16, 0.006, M.glass, 0, h + 0.1, z);
  for (const x of [-w / 2, w / 2]) bx(g, 0.006, 0.16, d, M.glass, x, h + 0.1, 0);
  g.userData = { kind: 'ice', ice: h + 0.06 };
  return g;
}

// ---------- K9 seating: stools, a steel table, the condiment set ----------
export function stool(color = BK.stoolRed) {
  const g = new THREE.Group();
  const m = M.plastic(color);
  put(g, CYL(0.1, 0.13, 0.28, 12, true), mat(color, { roughness: 0.45, side: THREE.DoubleSide }), 0, 0.14, 0);
  cy(g, 0.105, 0.1, 0.025, m, 0, 0.29, 0, 12);
  cy(g, 0.03, 0.03, 0.027, mat(0x1c2232), 0, 0.291, 0, 8); // the hole in the seat
  return g;
}
export function condiments() {
  const g = new THREE.Group();
  bx(g, 0.2, 0.01, 0.07, M.steel, 0, 0.005, 0);
  [[0xf4f0e8, 0], [0xd9342b, 1], [0x8a5a2a, 2], [0xe6e2c8, 3]].forEach(([c, i]) => {
    const x = -0.075 + i * 0.05;
    cy(g, 0.02, 0.02, 0.045, M.clear(0xffffff, 0.4), x, 0.032, 0, 10);
    cy(g, 0.018, 0.018, 0.03, M.food(c), x, 0.025, 0, 10);
    cy(g, 0.004, 0.004, 0.06, M.steel, x + 0.008, 0.06, 0, 4); // a spoon
  });
  bx(g, 0.012, 0.08, 0.06, M.steel, 0.11, 0.04, 0); // the handle
  return g;
}
export function metalTable({ w = 0.62, h = 0.5, set = true } = {}) {
  const g = new THREE.Group();
  bx(g, w, 0.02, w, M.steel, 0, h, 0);
  for (const x of [-1, 1]) for (const z of [-1, 1]) cy(g, 0.012, 0.012, h, M.steel, x * (w / 2 - 0.05), h / 2, z * (w / 2 - 0.05), 6);
  if (set) {
    addTo(g, condiments()).position.set(0, h + 0.01, -0.12);
    const holder = cy(g, 0.025, 0.025, 0.08, M.steel, 0.2, h + 0.05, -0.12, 8);
    bits(holder, BOX(0.006, 0.12, 0.006), M.bamboo, [[0, 0.03, 0.005], [0.008, 0.03, -0.006], [-0.008, 0.03, 0], [0.004, 0.03, 0.01]]);
    rb(g, 0.1, 0.05, 0.06, 0.01, M.plastic(0xf09a9a), -0.2, h + 0.035, -0.14); // tissues
    bx(g, 0.04, 0.012, 0.02, M.white, -0.2, h + 0.066, -0.14);
  }
  g.userData = { kind: 'metalTable', top: h + 0.01 };
  return g;
}
// a table with four stools; userData.seats are where people sit (facing the table)
export function seating({ colors = [BK.stoolRed, BK.stoolBlue, BK.stoolRed, BK.stoolBlue] } = {}) {
  const g = new THREE.Group();
  g.add(metalTable());
  const seats = [[0, 0.46, Math.PI / 2], [0, -0.46, -Math.PI / 2], [0.46, 0, Math.PI], [-0.46, 0, 0]];
  seats.forEach(([x, z], i) => addTo(g, stool(colors[i])).position.set(x, 0, z));
  g.userData = { kind: 'seating', top: 0.51, seats: seats.map(([x, z, yaw]) => ({ x, z, yaw })) };
  return g;
}

// ---------- K10 small things ----------
export function calculator() { const g = new THREE.Group(); rb(g, 0.08, 0.015, 0.11, 0.005, M.plastic(0x3a3d44), 0, 0.008, 0); bx(g, 0.06, 0.002, 0.025, M.glow(0x9fd28a, 0.4), 0, 0.016, -0.03); return g; }
export function cashBox() { const g = new THREE.Group(); bx(g, 0.2, 0.08, 0.14, mat(0x3f6fa0), 0, 0.04, 0); bx(g, 0.18, 0.005, 0.12, M.food(0xd8c49a), 0, 0.082, 0); return g; }
export function foamBoxes(n = 4) { const g = new THREE.Group(); for (let i = 0; i < n; i++) rb(g, 0.14, 0.05, 0.14, 0.01, M.white, 0, 0.025 + i * 0.05, 0); return g; }
export function bin(color = 0x4f9d6a) { const g = new THREE.Group(); cy(g, 0.13, 0.11, 0.38, M.plastic(color), 0, 0.19, 0, 12); cy(g, 0.135, 0.135, 0.02, M.plastic(0x1c2232), 0, 0.385, 0, 12); return g; }
// a bunch of empty plastic bags hung on a hook (the vendor tears one off)
export function bagBunch() {
  const g = new THREE.Group();
  cy(g, 0.004, 0.004, 0.06, M.steel, 0, 0.03, 0, 4);
  const rnd = rng(8);
  bits(g, BOX(0.09, 0.14, 0.004), M.clear(0xffffff, 0.55), Array.from({ length: 6 }, (_, i) => [0, -0.07, 0, 0, rnd() * 0.5, (rnd() - 0.5) * 0.2, 1]));
  return g;
}
// a stand fan; its blades turn
export function fan(color = 0x3a7fd0) {
  const g = new THREE.Group();
  cy(g, 0.12, 0.13, 0.03, M.plastic(color), 0, 0.015, 0, 12);
  cy(g, 0.015, 0.015, 0.7, M.plastic(0xf4f0e8), 0, 0.36, 0, 6);
  rb(g, 0.1, 0.1, 0.12, 0.03, M.plastic(color), -0.06, 0.74, 0);
  const cage = put(g, new THREE.TorusGeometry(0.16, 0.006, 4, 24), M.steel, 0.03, 0.74, 0); cage.rotation.y = Math.PI / 2;
  const rotor = pivot(g, 0.02, 0.74, 0);
  for (let i = 0; i < 3; i++) { const b = bx(rotor, 0.01, 0.13, 0.06, M.clear(color, 0.7), 0, 0, 0); b.geometry = BOX(0.01, 0.13, 0.06).clone().translate(0, 0.07, 0); b.rotation.x = (i / 3) * Math.PI * 2; }
  g.userData = { kind: 'fan', update: (t) => { rotor.rotation.x = t * 18; } };
  return g;
}
// a menu board with photos of the dishes and prices (one shared canvas)
let MENU = null;
export function menuBoard() {
  MENU ??= (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 160;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f0e8'; x.fillRect(0, 0, 128, 160);
    const cols = ['#c98a3a', '#e8673c', '#f2b84b', '#7fa05a', '#d9342b', '#8a5a34'];
    for (let i = 0; i < 6; i++) { const cx = 8 + (i % 2) * 60, cy0 = 8 + Math.floor(i / 2) * 50; x.fillStyle = '#ffffff'; x.fillRect(cx, cy0, 52, 34); x.fillStyle = cols[i]; x.beginPath(); x.ellipse(cx + 26, cy0 + 17, 18, 11, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#d9342b'; x.font = '700 11px sans-serif'; x.fillText(`${40 + i * 10}฿`, cx + 4, cy0 + 46); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
  })();
  const g = new THREE.Group();
  bx(g, 0.34, 0.42, 0.015, M.wood, 0, 0.21, 0);
  const p = put(g, new THREE.PlaneGeometry(0.3, 0.38), MENU, 0, 0.21, 0.009);
  p.castShadow = false;
  return g;
}

// a shop shelf against a wall: four boards of packets and bottles in the given colours (shophouses, the mini mart)
export function foodShelf(w = 2, colors = [0xe8673c, 0x3a7fd0, 0xf2b84b, 0x5fae6a], rnd = rng(1)) {
  const g = new THREE.Group();
  for (const x of [-w / 2, w / 2]) bx(g, 0.03, 1.7, 0.35, M.steel, x, 0.85, 0);
  const groups = colors.map(() => []);
  for (let k = 0; k < 4; k++) {
    const y = 0.15 + k * 0.42;
    bx(g, w, 0.025, 0.35, M.steel, 0, y, 0);
    for (let x = -w / 2 + 0.08; x < w / 2 - 0.05; x += 0.1) groups[Math.floor(rnd() * colors.length)].push([x, y + 0.13, 0.02, 0, (rnd() - 0.5) * 0.2, 0, 0.85 + rnd() * 0.3]);
  }
  colors.forEach((c, i) => groups[i].length && bits(g, BOX(0.08, 0.24, 0.16), mat(c, { roughness: 0.5 }), groups[i]));
  return g;
}

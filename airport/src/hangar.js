// The maintenance hangar (DESIGN.md §12): a cutaway hall, the tools of the trade, and the people who keep working in it.
// Hall space: origin at the middle of the floor, +X = the open door (east), +Z = south (the side cut at waist height).
import * as THREE from 'three';
import { PALETTE, LIVERIES, mat, mesh, rbox, box, cyl, airplane, person, pushbackTug } from './parts.js';
import { canvasTexture } from './interior.js';
import { Agent, FACE } from '../../koto/src/people.js';

export const HALL = { d: 20, w: 22, h: 7, ridge: 8, cut: 1.1 }; // depth (x) × width (z), eaves and ridge height, south wall cut
const STEEL = () => mat(0x5f6b7a, { metalness: 0.4, roughness: 0.5 });
const YELLOW = () => mat(PALETTE.yellow);
const RED = () => mat(0xc8402f, { roughness: 0.45 });

function sign(text, sub, w, h, { bg = '#2c3a57', fg = '#f4f0e8', accent = '#f2b84b' } = {}) {
  const tex = canvasTexture(512, Math.round((512 * h) / w), (g, cw, ch) => {
    g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
    g.fillStyle = accent; g.fillRect(0, ch - 10, cw, 10);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${Math.round(ch * (sub ? 0.42 : 0.6))}px "Hiragino Sans", "Noto Sans JP", sans-serif`;
    g.fillText(text, cw / 2, ch * (sub ? 0.38 : 0.5));
    if (sub) { g.font = `600 ${Math.round(ch * 0.2)}px "Helvetica Neue", sans-serif`; g.fillText(sub, cw / 2, ch * 0.76); }
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
}

// ---------- the building ----------

// lamp: the material of the high-bay lights (the airport passes one that glows brighter at night)
// the light the lamps throw on the floor: soft warm pools painted once (the airport fades it in at night)
export function lightPools() {
  const { d, w } = HALL, S = 16; // canvas pixels per metre
  return canvasTexture(d * S, w * S, (g, cw, ch) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch); g.globalCompositeOperation = 'lighter';
    for (let x = -d / 2 + 5; x < d / 2; x += 5) for (const z of [-6, -1.5, 3, 7.5]) {
      const cx = (x + d / 2) * S, cy = (z + w / 2) * S, r = 3.4 * S, grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgb(150,135,110)'); grad.addColorStop(0.5, 'rgb(70,62,50)'); grad.addColorStop(1, 'rgb(0,0,0)');
      g.fillStyle = grad; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  });
}

// pool: a material for the floor light (emissiveMap = lightPools()); none in the catalog
export function hangarHall({ lamp = mat(0xfff6dc, { emissive: 0xfff6dc, emissiveIntensity: 0.6 }), pool = null } = {}) {
  const g = new THREE.Group();
  const { d, w, h, ridge, cut } = HALL, X0 = -d / 2, X1 = d / 2, Z0 = -w / 2, Z1 = w / 2;
  const wall = mat(0xc9ced4, { roughness: 0.8 }), steel = STEEL();
  // floor: grey epoxy, a yellow lead-in line, the nose stop bar, hazard stripes across the door sill
  g.add(box(d, 0.06, w, mat(0x9ea4ab, { roughness: 0.5 }), 0, 0.03, 0));
  if (pool) { const p = new THREE.Mesh(new THREE.PlaneGeometry(d, w).rotateX(-Math.PI / 2), pool); p.position.y = 0.075; p.receiveShadow = true; g.add(p); }
  g.add(box(d - 1, 0.01, 0.12, YELLOW(), 0.5, 0.065, 0));
  g.add(box(0.14, 0.01, 3, YELLOW(), -7.8, 0.065, 0));
  for (const z of [-4.6, 4.6]) g.add(box(d - 2, 0.01, 0.08, YELLOW(), 0, 0.065, z * 2)); // walkway lines along the walls
  for (let z = Z0 + 0.4; z < Z1; z += 0.8) g.add(box(0.5, 0.012, 0.4, mat(z % 1.6 < 0.8 ? PALETTE.ink : PALETTE.yellow), X1 - 0.3, 0.066, z));
  // walls: north and back full height (with a strip of high windows), south cut at waist height so we can look in
  g.add(box(d, h, 0.25, wall, 0, h / 2, Z0));
  g.add(box(0.25, h, w, wall, X0, h / 2, 0));
  g.add(box(d, cut, 0.25, wall, 0, cut / 2, Z1));
  g.add(box(d, 0.12, 0.35, mat(PALETTE.navy), 0, cut, Z1));
  const glass = mat(0xbcd3e6, { emissive: 0x6f8fb0, emissiveIntensity: 0.25, roughness: 0.2 });
  for (let x = X0 + 1.5; x < X1 - 1; x += 2.5) g.add(box(2, 0.9, 0.06, glass, x, h - 1.2, Z0 + 0.14));
  for (let z = Z0 + 1.6; z < Z1 - 1; z += 2.6) g.add(box(0.06, 0.9, 2, glass, X0 + 0.14, h - 1.2, z));
  // the gable end above the door, the header beam and its name
  g.add(box(0.5, 1.0, w + 0.3, mat(PALETTE.navy), X1, h - 0.5, 0));
  const name = sign('第1格納庫', 'HANGAR 1 · MAINTENANCE', 6, 0.9);
  name.position.set(X1 + 0.26, h - 0.5, 0); name.rotation.y = Math.PI / 2; g.add(name);
  // the doors, slid away to the north end in three staggered leaves
  for (let k = 0; k < 3; k++) g.add(box(0.2, h - 1.05, 3.6, mat(0xb4bcc6, { metalness: 0.2 }), X1 - 0.2 - k * 0.24, (h - 1.0) / 2, Z0 + 2 + k * 0.5));
  // steel posts along the cut south wall and the door edge
  for (let x = X0; x <= X1 + 0.01; x += 5) g.add(box(0.3, h, 0.3, steel, x, h / 2, Z1));
  g.add(box(0.3, h, 0.3, steel, X1, h / 2, Z0));
  // roof trusses (pitched top chord, flat bottom chord, a few struts); roof sheet over the north half only
  const pitch = Math.atan2(ridge - h, w / 2), half = Math.hypot(ridge - h, w / 2);
  for (let x = X0; x <= X1 + 0.01; x += 5) {
    g.add(box(0.16, 0.16, w, steel, x, h - 0.4, 0));
    for (const s of [1, -1]) { const top = box(0.18, 0.18, half, steel, x, (h + ridge) / 2, (s * w) / 4); top.rotation.x = s * pitch; g.add(top); }
    for (const z of [-7.3, -3.6, 0, 3.6, 7.3]) { const tH = ridge - (Math.abs(z) / (w / 2)) * (ridge - h) - (h - 0.4); g.add(box(0.1, tH, 0.1, steel, x, h - 0.4 + tH / 2, z)); }
  }
  for (const z of [-8, -4, 4, 8]) g.add(box(d, 0.1, 0.1, steel, 0, ridge - (Math.abs(z) / (w / 2)) * (ridge - h) + 0.12, z)); // purlins
  const roof = box(d + 0.6, 0.14, half + 0.2, mat(0xaeb5be, { roughness: 0.7, side: THREE.DoubleSide }), 0, (h + ridge) / 2 + 0.17, -w / 4);
  roof.rotation.x = -pitch; g.add(roof);
  // high-bay lamps under the bottom chords
  for (let x = X0 + 5; x < X1; x += 5) for (const z of [-6, -1.5, 3, 7.5]) {
    g.add(cyl(0.03, 0.03, 0.35, steel, x, h - 0.62, z, 5));
    g.add(cyl(0.1, 0.26, 0.2, mat(PALETTE.darkGrey), x, h - 0.88, z, 12));
    g.add(cyl(0.24, 0.24, 0.02, lamp, x, h - 0.99, z, 12));
  }
  // the back wall: the name of the place and the safety banner
  const big = sign('整備', 'MAINTENANCE', 5, 1.6); big.position.set(X0 + 0.14, h - 2.6, -4); big.rotation.y = Math.PI / 2; g.add(big);
  const banner = sign('安全第一', 'SAFETY FIRST', 4.2, 1.0, { bg: '#f6f4ee', fg: '#2a7a3a', accent: '#2a7a3a' });
  banner.position.set(X0 + 0.14, h - 2.4, 4.5); banner.rotation.y = Math.PI / 2; g.add(banner);
  return g;
}

// ---------- equipment ----------

// a work platform with stairs: deck at height h, w along x, d deep, stairs coming down toward +z
export function dockStand({ h = 1.0, w = 1.6, d = 1.0 } = {}) {
  const g = new THREE.Group(), steel = STEEL(), yel = YELLOW();
  g.add(box(w, 0.08, d, mat(0x8a8f96, { metalness: 0.4 }), 0, h, 0));
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) g.add(box(0.07, h, 0.07, steel, x, h / 2, z));
  // guard rails on three sides (the work side, -z, is open to the aircraft)
  const sx = w / 2 - 0.3, railW = sx - 0.3 + w / 2; // the +z rail stops short of the stairs
  for (const y of [h + 0.55, h + 1.0]) {
    g.add(box(railW, 0.04, 0.04, yel, -w / 2 + railW / 2, y, d / 2));
    for (const x of [-w / 2, w / 2]) g.add(box(0.04, 0.04, d, yel, x, y, 0));
  }
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [sx - 0.3, d / 2]]) g.add(box(0.05, 1.0, 0.05, yel, x, h + 0.5, z));
  // stairs: steps and two stringers
  const run = h * 1.3, n = Math.round(h / 0.2);
  for (let i = 0; i < n; i++) g.add(box(0.5, 0.04, run / n, mat(0x8a8f96, { metalness: 0.4 }), sx, (h * (i + 0.5)) / n, d / 2 + run - (run * (i + 0.5)) / n));
  for (const x of [sx - 0.27, sx + 0.27]) {
    const s = box(0.04, 0.12, Math.hypot(run, h), yel, x, h / 2, d / 2 + run / 2); s.rotation.x = Math.atan2(h, run); g.add(s);
    const r = box(0.03, 0.03, Math.hypot(run, h), yel, x, h / 2 + 0.85, d / 2 + run / 2); r.rotation.x = Math.atan2(h, run); g.add(r);
  }
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) g.add(cyl(0.06, 0.06, 0.05, mat(PALETTE.ink), x, 0.03, d / 2 - 0.05, 8));
  g.userData.deck = { h, w, d, run, stairX: sx };
  return g;
}

// a scissor lift: yellow chassis, three crossed stages, a railed platform. userData.setHeight(h) moves it (0.4 … 3)
export function scissorLift() {
  const g = new THREE.Group(), yel = YELLOW(), L = 1.4, base = 0.32;
  g.add(rbox(1.6, 0.26, 0.8, 0.05, mat(PALETTE.yellow), 0, base - 0.08, 0));
  for (const x of [-0.6, 0.6]) for (const z of [-0.36, 0.36]) { const w = cyl(0.12, 0.12, 0.1, mat(PALETTE.tire), x, 0.12, z, 12); w.rotation.x = Math.PI / 2; g.add(w); }
  const bars = [];
  for (let i = 0; i < 3; i++) for (const s of [1, -1]) for (const z of [-0.32, 0.32]) {
    const b = box(L, 0.06, 0.04, mat(0x3a3f4a), 0, 0, z); b.userData.dynamic = true; b.userData.stage = i; b.userData.sign = s;
    bars.push(b); g.add(b);
  }
  const top = new THREE.Group(); top.userData.dynamic = true; g.add(top);
  top.add(box(1.7, 0.08, 0.9, mat(0x8a8f96, { metalness: 0.4 }), 0, 0, 0));
  for (const y of [0.5, 0.95]) { for (const z of [-0.45, 0.45]) top.add(box(1.7, 0.04, 0.04, yel, 0, y, z)); for (const x of [-0.85, 0.85]) top.add(box(0.04, 0.04, 0.9, yel, x, y, 0)); }
  for (const x of [-0.85, 0.85]) for (const z of [-0.45, 0.45]) top.add(box(0.04, 0.95, 0.04, yel, x, 0.48, z));
  top.add(box(0.2, 0.3, 0.3, mat(PALETTE.darkGrey), 0.7, 0.75, 0.3)); // the control box
  g.userData.top = top;
  g.userData.setHeight = (hh) => {
    const stage = (Math.max(0.4, hh) - base) / 3, a = Math.asin(Math.min(0.99, stage / L));
    for (const b of bars) { b.position.y = base + stage * (b.userData.stage + 0.5); b.rotation.z = b.userData.sign * a; }
    top.position.y = Math.max(0.4, hh);
  };
  g.userData.setHeight(0.4);
  return g;
}

// a spare engine on its transport cradle
export function engineStand() {
  const g = new THREE.Group(), yel = mat(PALETTE.yellow);
  g.add(box(2.2, 0.12, 1.1, yel, 0, 0.22, 0));
  for (const x of [-0.95, 0.95]) for (const z of [-0.5, 0.5]) { const w = cyl(0.12, 0.12, 0.08, mat(PALETTE.tire), x, 0.12, z, 10); w.rotation.x = Math.PI / 2; g.add(w); }
  for (const x of [-0.6, 0.6]) { g.add(box(0.12, 0.45, 0.9, yel, x, 0.5, 0)); g.add(box(0.14, 0.1, 0.5, mat(0x3a3f4a), x, 0.74, 0)); }
  const eng = new THREE.Group(); eng.position.set(0, 1.2, 0);
  const nac = cyl(0.46, 0.36, 1.8, mat(PALETTE.white), 0, 0, 0, 20); nac.rotation.z = -Math.PI / 2;
  const intake = cyl(0.38, 0.38, 0.06, mat(PALETTE.ink), 0.9, 0, 0, 20); intake.rotation.z = -Math.PI / 2;
  const fan = cyl(0.37, 0.37, 0.04, mat(0x8a8f96, { metalness: 0.7, roughness: 0.3 }), 0.86, 0, 0, 20); fan.rotation.z = -Math.PI / 2;
  const cone = mesh(new THREE.ConeGeometry(0.12, 0.25, 12).rotateZ(-Math.PI / 2), mat(0x3a3f4a), 0.95, 0, 0);
  eng.add(nac, intake, fan, cone);
  g.add(eng);
  g.add(box(0.03, 0.03, 1.0, mat(PALETTE.red), 0.95, 0.75, 0)); // a red "remove before flight" tag line
  return g;
}

// a red roll cabinet with drawers, a few tools on top
export function toolCabinet() {
  const g = new THREE.Group();
  g.add(rbox(0.5, 0.9, 0.9, 0.03, RED(), 0, 0.55, 0));
  for (let i = 0; i < 6; i++) g.add(box(0.02, 0.02, 0.6, mat(0xc9ccd1, { metalness: 0.6 }), 0.26, 0.25 + i * 0.12, 0));
  for (const z of [-0.35, 0.35]) for (const x of [-0.18, 0.18]) g.add(cyl(0.05, 0.05, 0.08, mat(PALETTE.ink), x, 0.05, z, 8));
  g.add(box(0.12, 0.05, 0.3, mat(0x9aa0a8, { metalness: 0.6 }), 0, 1.03, -0.15));
  g.add(cyl(0.03, 0.03, 0.3, mat(PALETTE.yellow), 0.05, 1.03, 0.2, 6)).children.at(-1).rotation.x = Math.PI / 2;
  return g;
}

// a bench with a vice, and a pegboard of tools on the wall behind (the bench faces +x)
export function workbench() {
  const g = new THREE.Group(), steel = STEEL();
  g.add(box(0.8, 0.08, 2.2, mat(0x8a6a4a), 0, 0.85, 0));
  for (const z of [-1.0, 1.0]) for (const x of [-0.32, 0.32]) g.add(box(0.06, 0.85, 0.06, steel, x, 0.42, z));
  g.add(box(0.7, 0.04, 2.0, steel, 0, 0.25, 0));
  g.add(box(0.2, 0.14, 0.18, mat(0x3f5f8a), 0.25, 0.96, -0.6)); // the vice
  g.add(box(0.04, 1.0, 2.2, mat(0xd9cfb8), -0.42, 1.55, 0)); // pegboard
  const tools = [[0.3, 0.06, 0x9aa0a8], [0.35, 0.05, 0xc8402f], [0.25, 0.08, 0x9aa0a8], [0.4, 0.05, 0xf2b84b], [0.28, 0.06, 0x3f5f8a]];
  tools.forEach(([len, wd, c], i) => g.add(box(0.03, len, wd, mat(c, { metalness: 0.3 }), -0.39, 1.6, -0.8 + i * 0.4)));
  g.add(box(0.2, 0.12, 0.3, mat(PALETTE.orange), 0, 0.95, 0.5)); // a parts tray
  return g;
}

// open shelving with parts boxes (deterministic colours)
export function partsRack({ len = 2.4, levels = 4 } = {}) {
  const g = new THREE.Group(), steel = STEEL(), cols = [0x8db6d6, 0xe8673c, 0xf2b84b, 0x4f9d8f, 0xd9cfb8];
  for (const z of [-len / 2, len / 2]) for (const x of [-0.25, 0.25]) g.add(box(0.05, 2.2, 0.05, steel, x, 1.1, z));
  for (let i = 0; i < levels; i++) {
    const y = 0.15 + i * 0.6;
    g.add(box(0.55, 0.04, len, mat(0x8a8f96, { metalness: 0.3 }), 0, y, 0));
    for (let k = 0; k < 5; k++) if ((i * 7 + k * 3) % 5 !== 0) g.add(box(0.42, 0.3, 0.38, mat(cols[(i + k * 2) % cols.length]), 0, y + 0.17, -len / 2 + 0.3 + k * (len - 0.6) / 4));
  }
  return g;
}

// spare main wheels standing in a rack
export function tireRack() {
  const g = new THREE.Group(), steel = STEEL();
  g.add(box(0.7, 0.06, 2.4, steel, 0, 0.1, 0));
  for (const z of [-1.15, 1.15]) g.add(box(0.06, 0.9, 0.06, steel, -0.3, 0.45, z));
  g.add(box(0.05, 0.05, 2.4, steel, -0.3, 0.85, 0));
  for (let i = 0; i < 4; i++) {
    const t = mesh(new THREE.TorusGeometry(0.28, 0.12, 8, 16), mat(PALETTE.tire), 0, 0.45, -0.85 + i * 0.56);
    g.add(t);
    g.add(cyl(0.18, 0.18, 0.18, mat(0xc9ccd1, { metalness: 0.5 }), 0, 0.45, -0.85 + i * 0.56, 12)).children.at(-1).rotation.x = Math.PI / 2;
  }
  return g;
}

// a tripod jack holding a wing up at height h
export function tripodJack(h = 1.1) {
  const g = new THREE.Group(), yel = mat(PALETTE.yellow);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2, leg = box(0.07, Math.hypot(0.65, h * 0.7), 0.07, yel, Math.cos(a) * 0.32, h * 0.35, Math.sin(a) * 0.32);
    leg.rotation.set(Math.sin(a) * 0.75, 0, -Math.cos(a) * 0.75); g.add(leg);
    g.add(cyl(0.08, 0.08, 0.03, mat(PALETTE.ink), Math.cos(a) * 0.62, 0.015, Math.sin(a) * 0.62, 8));
  }
  g.add(cyl(0.09, 0.09, h * 0.4, mat(0x3a3f4a), 0, h * 0.7, 0, 10));
  g.add(cyl(0.04, 0.04, h * 0.2, mat(0xc9ccd1, { metalness: 0.6 }), 0, h * 0.95, 0, 8));
  g.add(cyl(0.1, 0.1, 0.03, mat(PALETTE.ink), 0, h, 0, 10));
  return g;
}

// the ground power unit: a little trailer with a cable that runs to `to` (a point in the cart's own space)
export function groundPower({ to = new THREE.Vector3(2.5, 0, 0) } = {}) {
  const g = new THREE.Group();
  g.add(rbox(1.3, 0.75, 0.8, 0.06, mat(PALETTE.white), 0, 0.62, 0));
  g.add(box(1.32, 0.12, 0.82, mat(PALETTE.orange), 0, 0.3, 0));
  g.add(box(0.02, 0.3, 0.5, mat(0x3a3f4a), 0.66, 0.7, 0));
  g.add(cyl(0.04, 0.04, 0.05, mat(PALETTE.green, { emissive: PALETTE.green, emissiveIntensity: 1 }), 0.67, 0.92, 0.18, 8)).children.at(-1).rotation.z = Math.PI / 2;
  for (const x of [-0.4, 0.4]) for (const z of [-0.42, 0.42]) { const w = cyl(0.14, 0.14, 0.08, mat(PALETTE.tire), x, 0.14, z, 10); w.rotation.x = Math.PI / 2; g.add(w); }
  g.add(box(0.6, 0.05, 0.05, mat(PALETTE.darkGrey), 0.9, 0.2, 0)); // tow bar
  const a = new THREE.Vector3(0.6, 0.5, 0.3), mid = a.clone().lerp(to, 0.5).setY(0.03);
  const curve = new THREE.CatmullRomCurve3([a, new THREE.Vector3(0.9, 0.04, 0.4), mid, to.clone().setY(0.04), to.clone().setY(1.0)]);
  g.add(mesh(new THREE.TubeGeometry(curve, 40, 0.035, 6), mat(PALETTE.ink)));
  return g;
}

// a glass site office (w along x, d deep): desk, monitor, chair; userData.seat is where the supervisor stands at the desk
export function siteOffice({ w = 4, d = 3.2 } = {}) {
  const g = new THREE.Group(), frame = mat(PALETTE.navy), steel = STEEL();
  const glass = new THREE.MeshStandardMaterial({ color: 0xbcd3e6, transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false });
  g.add(box(w, 0.08, d, mat(0xd9cfb8), 0, 0.04, 0));
  g.add(box(w, 0.1, d, frame, 0, 2.5, 0));
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) g.add(box(0.08, 2.5, 0.08, frame, x, 1.25, z));
  g.add(box(w, 1.6, 0.04, glass, 0, 1.6, d / 2)); g.add(box(w, 0.8, 0.08, frame, 0, 0.4, d / 2));
  g.add(box(0.04, 1.6, d - 1.0, glass, w / 2, 1.6, -0.5)); g.add(box(0.08, 0.8, d - 1.0, frame, w / 2, 0.4, -0.5)); // the door gap at the +x / +z corner
  g.add(box(w, 2.5, 0.08, mat(0xc9ced4), 0, 1.25, -d / 2));
  g.add(box(0.08, 2.5, d, mat(0xc9ced4), -w / 2, 1.25, 0));
  g.add(box(1.6, 0.05, 0.7, mat(0x8a6a4a), -0.6, 0.72, -d / 2 + 0.5));
  for (const x of [-1.3, 0.1]) g.add(box(0.05, 0.7, 0.6, steel, x, 0.36, -d / 2 + 0.5));
  g.add(box(0.5, 0.32, 0.04, mat(PALETTE.ink), -0.6, 1.0, -d / 2 + 0.3));
  g.add(box(0.46, 0.28, 0.01, new THREE.MeshStandardMaterial({ color: 0x8db6d6, emissive: 0x8db6d6, emissiveIntensity: 0.8 }), -0.6, 1.0, -d / 2 + 0.33));
  g.add(box(1.2, 0.8, 0.03, mat(PALETTE.white), 0.9, 1.6, -d / 2 + 0.06)); // the whiteboard with the day's jobs
  for (let i = 0; i < 4; i++) g.add(box(0.7 - i * 0.1, 0.03, 0.01, mat([PALETTE.navy, PALETTE.red, PALETTE.navy, PALETTE.green][i]), 0.8, 1.85 - i * 0.15, -d / 2 + 0.08));
  g.userData.seat = new THREE.Vector3(-0.6, 0, -d / 2 + 1.05);
  return g;
}

export function safetyCone() {
  const g = new THREE.Group();
  g.add(box(0.32, 0.03, 0.32, mat(PALETTE.orange), 0, 0.015, 0));
  g.add(cyl(0.03, 0.12, 0.42, mat(PALETTE.orange), 0, 0.24, 0, 10));
  g.add(cyl(0.075, 0.09, 0.08, mat(PALETTE.white), 0, 0.25, 0, 10));
  return g;
}

// ---------- the whole hangar, with its people ----------

// Where things stand in hall space. The aircraft sits nose-in (toward -x) at PLANE, scaled 0.94.
const PLANE = { x: -0.5, z: 0, s: 0.94 };
const SPOT = {
  noseDock: [-6.3, 1.3], lift: [6.9, 0], engine: [-2.95, 2.25], gear: [-0.12, 1.95], spare: [4.5, 8.2],
  cabinet: [-3.4, 4.6], bench: [-9.4, 6.4], rack: [-9.5, -4.6], tires: [-3.5, 10.2], gpu: [-8.4, 8.8], office: [5.0, -8.9],
};

// A hangar on its own (the catalog card), or the statics + live parts for the airport.
// Returns { group, statics, update(t, dt) }: statics can be baked, group holds everything that moves.
export function hangarScene({ lamp, pool } = {}) {
  const statics = new THREE.Group(), group = new THREE.Group();
  const put = (o, [x, z], ry = 0, into = statics) => { o.position.set(x, 0, z); o.rotation.y = ry; into.add(o); return o; };
  statics.add(hangarHall({ lamp, pool }));
  const plane = airplane(LIVERIES.midnight, { cowlOpen: 1 });
  plane.userData.kind = 'static';
  plane.position.set(PLANE.x, 0, PLANE.z); plane.rotation.y = Math.PI; plane.scale.setScalar(PLANE.s);
  statics.add(plane);
  const dock = put(dockStand({ h: 1.0, w: 1.6, d: 1.0 }), SPOT.noseDock);
  put(engineStand(), SPOT.spare, Math.PI);
  put(toolCabinet(), SPOT.cabinet, Math.PI / 2); // drawers toward the aircraft
  put(workbench(), SPOT.bench);
  put(partsRack(), SPOT.rack);
  put(partsRack({ len: 2.4 }), [SPOT.rack[0], SPOT.rack[1] - 2.8]);
  put(tireRack(), SPOT.tires, Math.PI / 2);
  for (const z of [-3.9, 3.9]) put(tripodJack(1.3), [0.05, z]);
  const noseGear = new THREE.Vector3(PLANE.x - 5.6 * PLANE.s - SPOT.gpu[0], 0, PLANE.z - SPOT.gpu[1]);
  put(groundPower({ to: noseGear }), SPOT.gpu);
  const office = put(siteOffice(), SPOT.office);
  const tug = pushbackTug(); tug.userData.kind = 'static'; put(tug, [6.5, 9.8], Math.PI);
  for (const [x, z] of [[9.2, 6], [9.2, -2.5], [2, 8.6]]) put(safetyCone(), [x, z]);
  for (const z of [-1.13, 1.13]) for (const x of [-0.5, 0.26]) { const c = new THREE.Group(); c.add(box(0.2, 0.14, 0.34, mat(PALETTE.yellow), 0, 0.07, 0)); put(c, [x, PLANE.z + z]); } // wheel chocks

  // the lift at the tail (moves; its rider is parented to the platform)
  const lift = put(scissorLift(), SPOT.lift, 0, group);
  const rider = person('mechanicB', { mode: 'idle', seed: 41 });
  rider.position.set(-0.45, 0.04, 0); rider.rotation.y = Math.PI; rider.userData.phase = 2;
  lift.userData.top.add(rider);

  // the people who walk about (Agents, koto/src/people.js); a deck and its stairs lift the nose-dock mechanic
  const D = dock.userData.deck, dx = SPOT.noseDock[0], dz = SPOT.noseDock[1];
  const heightAt = (x, z) => {
    if (Math.abs(x - dx) <= D.w / 2 && Math.abs(z - dz) <= D.d / 2 + 0.05) return D.h + 0.04;
    if (Math.abs(x - (dx + D.stairX)) <= 0.3 && z > dz + D.d / 2 && z < dz + D.d / 2 + D.run) return D.h * (1 - (z - dz - D.d / 2) / D.run);
    return 0.06;
  };
  const up = FACE.up, toward = (fx, fz) => Math.atan2(-fz, fx); // up = facing -z (the aircraft, from the south side)
  const seat = office.userData.seat.clone().add(new THREE.Vector3(SPOT.office[0], 0, SPOT.office[1]));
  const sx = dx + D.stairX;
  const agents = [
    // at the open engine: ratchet, reach in, fetch something from the cabinet
    ['mechanic', [{ to: SPOT.engine }, { do: 'reach', dur: 9, face: FACE.east }, { do: 'wrench', dur: 6, face: FACE.east }, { to: [SPOT.cabinet[0], SPOT.cabinet[1] - 0.75] }, { do: 'idle', dur: 2.5, face: FACE.down }]],
    // kneeling at the main gear with a torch
    ['mechanicC', [{ to: SPOT.gear }, { do: 'kneel', dur: 12, face: up }, { do: 'inspect', dur: 4, face: up }]],
    // up on the nose dock, at the windscreen; down the stairs now and then
    ['mechanic', [{ to: [sx, dz + D.d / 2 + D.run + 0.5] }, { to: [sx, dz] }, { to: [dx - 0.1, dz - 0.15] }, { do: 'reach', dur: 10, face: up }, { do: 'wrench', dur: 6, face: up },
      { to: [sx, dz] }, { to: [sx, dz + D.d / 2 + D.run + 0.5] }, { to: [-7.4, 8.0] }, { do: 'idle', dur: 3, face: toward(-1, 0.6) }]],
    // at the bench, then fetching a part from the shelves
    ['mechanicB', [{ to: [SPOT.bench[0] + 0.8, SPOT.bench[1]] }, { do: 'wrench', dur: 10, face: FACE.west }, { to: [SPOT.rack[0] + 0.85, SPOT.rack[1]] }, { do: 'reach', dur: 3, face: FACE.west }]],
    // the inspector's round, writing at each stop
    ['inspector', [{ to: [-4.4, 5.0] }, { do: 'write', dur: 4, face: up }, { to: [-3.4, 7.3] }, { to: [3.6, 7.3] }, { do: 'write', dur: 3, face: toward(0.3, 1) },
      { to: [8.7, 3.2] }, { do: 'look', dur: 3, face: FACE.west }, { to: [8.7, -6.4] }, { to: [SPOT.office[0] + 2.4, SPOT.office[1] + 1.1] }, { hide: 5 },
      { to: [-8.6, -6.2] }, { to: [-8.6, -0.6] }, { do: 'look', dur: 3, face: FACE.east }, { to: [-8.6, 5.0] }]],
  ].map(([role, route], i) => new Agent(group, role, route, { heightAt, speed: 0.9, phase: i * 1.7 }));
  const boss = put(person('supervisor', { mode: 'type', seed: 7 }), [seat.x, seat.z], FACE.up, group);

  return {
    statics, group,
    update(t, dt) {
      // the lift: up (4 s) · work at the rudder (14 s) · down (4 s) · wait (4 s)
      const k = t % 26, h = k < 4 ? k / 4 : k < 18 ? 1 : k < 22 ? 1 - (k - 18) / 4 : 0;
      lift.userData.setHeight(0.4 + h * 2.2);
      rider.userData.mode = k >= 4 && k < 18 ? (k < 11 ? 'reach' : 'wrench') : 'idle';
      rider.userData.update(t);
      for (const a of agents) a.update(t, dt);
      boss.userData.update(t);
    },
  };
}

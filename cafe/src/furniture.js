// Café furniture and fittings (cafe/DESIGN.md §3): the shop's shell (a dollhouse whose near walls hide), the counter,
// the espresso machine, grinder, pour-over station, register, pastry case, menu board, shelves, the window bar,
// stools, chairs, tables, sofa and armchair, rug, lamps and pendants, candles, plants, a bookshelf, the door and
// its bell, an awning, signs and an umbrella stand. Front faces +Z, floor y = 0, origin at the footprint centre.
import * as THREE from 'three';
import { mat, mesh, box, cyl, rbox } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { signTexture } from '../../town/src/buildings.js';

export const CAFE = {
  cream: 0xf3ead8, plaster: 0xf6f1e6, sage: 0x9db59a, oak: 0xc49a6c, walnut: 0x6b4a35, floor: 0xb0855a,
  terracotta: 0xc9714a, mustard: 0xd9a441, rose: 0xe2a9a0, navy: 0x2f3e57, brass: 0xc9a24a, iron: 0x2a2a2c, steel: 0xc9ccd1,
  leaf: 0x5f8f4a, leaf2: 0x7fae5a, marble: 0xeeeae2, white: 0xfbf8f2,
};
export const M = (c, o = {}) => mat(c, { roughness: 0.8, ...o });
const bake = (g, kind, extra = {}) => { bakeStatic(g); g.userData = { ...g.userData, kind: 'furniture', furniture: kind, ...extra }; return g; };
const legs4 = (g, w, d, h, r, m, inset = 0.06) => { for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(cyl(r, r * 0.8, h, m, x * (w / 2 - inset), h / 2, z * (d / 2 - inset), 8)); };

// glowing things: bulbs, candle flames, the pastry case light — one material each, brightened when it gets dark
export const GLOW = {
  bulb: new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 0.6, roughness: 0.4 }),
  flame: new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffa040, emissiveIntensity: 1.2 }),
  case: new THREE.MeshStandardMaterial({ color: 0xfff6e6, emissive: 0xfff0d0, emissiveIntensity: 0.25, roughness: 0.5 }),
};
export function setGlow(dark) { GLOW.bulb.emissiveIntensity = 0.5 + dark * 1.6; GLOW.case.emissiveIntensity = 0.2 + dark * 0.6; WASHI.emissiveIntensity = 0.35 + dark * 1.3; }
export const GLASS = new THREE.MeshStandardMaterial({ color: 0xcfe2e6, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false });

// ---------- the shell: floor, four walls with windows and a door, a ceiling with beams ----------
// openings: { front: [[x0, x1, kind]], right: [[z0, z1, kind]], … } with kind 'window' | 'door'
// Each wall is its own group (userData.side, userData.normal) so the scene can hide the ones between camera and room.
export function shell({ w = 14, d = 10, h = 3.2, wall = CAFE.plaster, wainscot = CAFE.sage, floor = CAFE.floor, frame = CAFE.iron, openings = {}, sill = 0.75, head = 2.6, brick = 'back' } = {}) {
  const g = new THREE.Group();
  const floorTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); for (let r = 0; r < 8; r++) for (let k = -1; k < 8; k++) { const off = (r % 2) * 16; x.fillStyle = `hsl(28, 38%, ${44 + ((r * 7 + k * 13) % 9)}%)`; x.fillRect(k * 32 + off, r * 32, 31, 31); x.fillStyle = 'rgba(60,35,20,0.25)'; x.fillRect(k * 32 + off, r * 32 + 15, 31, 1); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 2.5, d / 2.5); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const fl = mesh(new THREE.BoxGeometry(w, 0.12, d), new THREE.MeshStandardMaterial({ map: floorTex, color: floor === CAFE.floor ? 0xffffff : floor, roughness: 0.7 }), 0, -0.045, 0);
  fl.receiveShadow = true; g.add(fl); // (its top 1.5 cm above the street, so the two never flicker)
  const walls = {};
  const wallM = M(wall, { roughness: 0.95 }), lowM = M(wainscot, { roughness: 0.9 }), frameM = M(frame, { roughness: 0.5 }), trim = M(CAFE.white);
  const brickTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#d9cfc2'; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 8; r++) for (let k = -1; k < 4; k++) { x.fillStyle = `hsl(${12 + (r * 5 + k * 7) % 10}, 32%, ${58 + ((r * 3 + k) % 5) * 3}%)`; x.fillRect(k * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  // one wall: along local X from -len/2..len/2, facing +Z (inside), with openings cut out
  function makeWall(side, len, ops) {
    const wg = new THREE.Group(), T = 0.2;
    const solid = (x0, x1, y0, y1) => {
      if (x1 - x0 < 0.01 || y1 - y0 < 0.01) return;
      const isBrick = side === brick;
      let m = wallM;
      if (isBrick) { const t = brickTex.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 2, (y1 - y0) / 1); m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); }
      wg.add(box(x1 - x0, y1 - y0, T, m, (x0 + x1) / 2, (y0 + y1) / 2, 0));
      if (!isBrick && y0 < 0.9) wg.add(box(x1 - x0, Math.min(0.9, y1) - y0, 0.03, lowM, (x0 + x1) / 2, (y0 + Math.min(0.9, y1)) / 2, T / 2 + 0.015)); // the wainscot
    };
    const list = [...ops].sort((a, b) => a[0] - b[0]);
    let x = -len / 2;
    const panes = [];
    for (const [x0, x1, kind] of list) {
      solid(x, x0, 0, h);
      const bottom = kind === 'door' ? 0 : sill, top = kind === 'door' ? 2.3 : head;
      solid(x0, x1, top, h); solid(x0, x1, 0, bottom);
      // the frame and its glass
      for (const fx of [x0, x1]) wg.add(box(0.08, top - bottom, 0.16, frameM, fx, (top + bottom) / 2, 0));
      wg.add(box(x1 - x0, 0.08, 0.16, frameM, (x0 + x1) / 2, top, 0));
      if (kind === 'window') {
        wg.add(box(x1 - x0 + 0.2, 0.06, 0.34, trim, (x0 + x1) / 2, bottom, 0.08)); // the sill
        const n = Math.max(1, Math.round((x1 - x0) / 1.6));
        for (let k = 1; k < n; k++) wg.add(box(0.05, top - bottom, 0.1, frameM, x0 + (k / n) * (x1 - x0), (top + bottom) / 2, 0));
        wg.add(box(x1 - x0, 0.05, 0.1, frameM, (x0 + x1) / 2, top - 0.5, 0)); // the transom
        const gl = mesh(new THREE.PlaneGeometry(x1 - x0, top - bottom), GLASS, (x0 + x1) / 2, (top + bottom) / 2, 0); gl.userData.keep = true; wg.add(gl);
        panes.push({ x0, x1, y0: bottom, y1: top });
      }
      x = x1;
    }
    solid(x, len / 2, 0, h);
    wg.add(box(len, 0.12, 0.26, trim, 0, h - 0.06, 0.03)); // the cornice
    wg.userData = { kind: 'wall', side, panes };
    return wg;
  }
  // each wall is built along its local X with the room on its +Z side, then turned into place. Openings come in scene
  // coordinates (front / back: x, left / right: z); on the front and left walls local X runs the opposite way.
  const SIDES = { front: [0, d / 2, Math.PI, w, true, [0, 0, 1]], back: [0, -d / 2, 0, w, false, [0, 0, -1]], right: [w / 2, 0, -Math.PI / 2, d, false, [1, 0, 0]], left: [-w / 2, 0, Math.PI / 2, d, true, [-1, 0, 0]] };
  for (const [side, [x, z, ry, len, flip, n]] of Object.entries(SIDES)) {
    const ops = (openings[side] ?? []).map(([a, b, k]) => (flip ? [-b, -a, k] : [a, b, k]));
    const wg = makeWall(side, len, ops);
    wg.position.set(x, 0, z); wg.rotation.y = ry;
    bakeStatic(wg);
    wg.userData.normal = new THREE.Vector3(...n);
    walls[side] = wg; g.add(wg);
  }
  // ceiling beams (hidden from above)
  const ceiling = new THREE.Group();
  ceiling.add(box(w, 0.06, d, M(wall), 0, h + 0.03, 0));
  for (let x = -w / 2 + 1.2; x < w / 2; x += 2.2) ceiling.add(box(0.18, 0.2, d, M(CAFE.oak), x, h - 0.1, 0));
  bakeStatic(ceiling); ceiling.userData.kind = 'ceiling';
  g.add(ceiling);
  g.userData = { kind: 'shell', walls, ceiling, w, d, h };
  return g;
}
// hide the walls between the camera and the room (and the ceiling when looking from above)
export function cutaway(sh, camera, { near = 22, high = 4.6 } = {}) {
  const P = camera.position, { walls, ceiling, h } = sh.userData, wp = new THREE.Vector3(), n = new THREE.Vector3();
  for (const wg of Object.values(walls)) {
    wg.getWorldPosition(wp); n.copy(wg.userData.normal).transformDirection(sh.matrixWorld); // (works for a shell turned in the world)
    const outside = (P.x - wp.x) * n.x + (P.z - wp.z) * n.z > 0;
    const far = P.distanceTo(wp.setY(wp.y + 1.5)) > near || P.y > wp.y - 1.5 + high;
    wg.visible = !(outside && far);
  }
  sh.getWorldPosition(wp);
  ceiling.visible = P.y < wp.y + h;
}

// ---------- the counter and the bar ----------
export function counter({ len = 5, depth = 0.7, h = 0.75, front = CAFE.oak, top = CAFE.marble } = {}) {
  const g = new THREE.Group();
  g.add(box(len, h - 0.05, depth, M(front), 0, (h - 0.05) / 2, 0));
  for (let x = -len / 2 + 0.06; x < len / 2; x += 0.12) g.add(box(0.05, h - 0.12, 0.02, M(0xb08458), x, (h - 0.05) / 2, depth / 2 + 0.01)); // slats
  g.add(box(len + 0.06, 0.05, depth + 0.06, M(top, { roughness: 0.3 }), 0, h, 0));
  g.add(box(len, 0.06, 0.3, M(CAFE.oak), 0, 0.92, -depth / 2 + 0.2)); // the back ledge
  return bake(g, 'counter', { top: h + 0.025 });
}
export function espressoMachine() {
  const g = new THREE.Group(), steel = M(CAFE.steel, { metalness: 0.6, roughness: 0.3 }), body = M(0x9db59a, { roughness: 0.45 });
  g.add(rbox(0.9, 0.42, 0.45, 0.05, body, 0, 0.21, 0));
  g.add(box(0.92, 0.04, 0.47, steel, 0, 0.44, 0)); // cup warmer
  for (let k = 0; k < 5; k++) g.add(cyl(0.035, 0.03, 0.05, M(CAFE.white), -0.32 + k * 0.16, 0.49, 0, 8)); // cups on top
  for (const x of [-0.2, 0.2]) { g.add(cyl(0.05, 0.05, 0.06, steel, x, 0.22, 0.25, 10)); g.add(box(0.05, 0.03, 0.18, M(CAFE.iron), x, 0.2, 0.36)); } // group heads + handles
  g.add(box(0.8, 0.03, 0.2, steel, 0, 0.04, 0.32)); // drip tray
  g.add(cyl(0.012, 0.012, 0.22, steel, 0.4, 0.25, 0.26, 6)); // steam wand
  for (const x of [-0.3, 0.3]) g.add(cyl(0.035, 0.035, 0.02, M(0xf6f1e6), x, 0.36, 0.23, 12)).children.at(-1).rotation.x = Math.PI / 2; // gauges
  return bake(g, 'espresso', { spout: [0, 0.18, 0.25], wand: [0.4, 0.15, 0.26] });
}
export function grinder() {
  const g = new THREE.Group();
  g.add(box(0.18, 0.28, 0.2, M(CAFE.iron, { roughness: 0.4 }), 0, 0.14, 0));
  g.add(mesh(new THREE.ConeGeometry(0.1, 0.18, 12).rotateX(Math.PI), M(0x6b4a35, { transparent: true, opacity: 0.8 }), 0, 0.38, 0)); // the hopper of beans
  return bake(g, 'grinder');
}
export function pourOver() { // a wooden stand with two drippers over glass servers, and a gooseneck kettle
  const g = new THREE.Group(), wood = M(CAFE.walnut);
  g.add(box(0.7, 0.03, 0.22, wood, 0, 0.3, 0)); for (const x of [-0.33, 0.33]) g.add(box(0.03, 0.3, 0.2, wood, x, 0.15, 0));
  for (const x of [-0.16, 0.16]) { g.add(mesh(new THREE.ConeGeometry(0.07, 0.1, 12).rotateX(Math.PI), M(CAFE.white), x, 0.36, 0)); g.add(cyl(0.05, 0.06, 0.12, M(0xcfe2e6, { transparent: true, opacity: 0.6 }), x, 0.06, 0, 10)); g.add(cyl(0.045, 0.055, 0.05, M(0x5a3020), x, 0.03, 0, 10)); }
  const k = new THREE.Group(); k.add(cyl(0.07, 0.08, 0.12, M(CAFE.iron, { roughness: 0.3, metalness: 0.4 }), 0, 0.06, 0, 12));
  const spout = cyl(0.008, 0.012, 0.18, M(CAFE.iron), 0.09, 0.12, 0, 6); spout.rotation.z = -0.9; k.add(spout); k.position.set(0.55, 0, 0); g.add(k);
  return bake(g, 'pourOver');
}
export function register() {
  const g = new THREE.Group();
  g.add(cyl(0.03, 0.05, 0.16, M(CAFE.steel, { metalness: 0.5 }), 0, 0.08, 0));
  const t = box(0.26, 0.18, 0.02, M(0x1d1f23), 0, 0.2, 0); t.rotation.x = -0.5; g.add(t);
  const s = mesh(new THREE.PlaneGeometry(0.22, 0.14), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfe0f0, emissiveIntensity: 0.6 }), 0, 0.205, 0.012); s.rotation.x = -0.5; g.add(s);
  g.add(cyl(0.05, 0.05, 0.12, M(0xcfe2e6, { transparent: true, opacity: 0.5 }), 0.25, 0.06, 0.05, 10)); // the tip jar
  return bake(g, 'register');
}
// the pastry case: glass on three shelves of cakes and buns, lit from inside
export function pastryCase({ len = 1.4, items = 'nordic' } = {}) {
  const g = new THREE.Group();
  g.add(box(len, 0.75, 0.7, M(CAFE.oak), 0, 0.375, 0));
  g.add(box(len, 0.45, 0.03, GLOW.case, 0, 0.98, -0.31)); // the lit back of the case
  for (const y of [0.78, 1.03]) g.add(box(len - 0.04, 0.015, 0.56, M(CAFE.white, { roughness: 0.3 }), 0, y, -0.02)); // glass shelves
  const gl = mesh(new THREE.BoxGeometry(len + 0.02, 0.47, 0.62), GLASS, 0, 0.99, -0.02); gl.userData.keep = true; g.add(gl);
  const shapes = {
    nordic: [[0xc9884a, 'roll'], [0xe8c890, 'bun'], [0xd9a0a8, 'cake'], [0x8a5a3a, 'cookie'], [0xf2dca0, 'tart']],
    wa: [[0xa8743a, 'dora'], [0x7fae5a, 'roll'], [0xf2e6d0, 'mochi'], [0x6b4a35, 'cake'], [0xe8c890, 'toast']],
    barcelona: [[0xd9a441, 'croissant'], [0xc9884a, 'churro'], [0xd96a4a, 'tomato'], [0xe8c890, 'bun'], [0x8a5a3a, 'cake']],
  }[items];
  for (const [row, y] of [[0, 0.8], [1, 1.05]]) for (let k = 0; k < 6; k++) {
    const [c, kind] = shapes[(k + row * 2) % shapes.length], x = -len / 2 + 0.15 + k * (len - 0.3) / 5, z = row ? -0.12 : 0.08;
    const m = M(c, { roughness: 0.7 });
    if (kind === 'roll' || kind === 'dora') g.add(mesh(new THREE.TorusGeometry(0.05, 0.03, 6, 10).rotateX(Math.PI / 2), m, x, y + 0.03, z));
    else if (kind === 'cake' || kind === 'tart') { g.add(cyl(0.07, 0.07, 0.07, m, x, y + 0.035, z, 10)); g.add(mesh(new THREE.SphereGeometry(0.02, 6, 4), M(0xc8283a), x, y + 0.08, z)); }
    else if (kind === 'cookie') g.add(cyl(0.05, 0.05, 0.015, m, x, y + 0.01, z, 10));
    else if (kind === 'croissant' || kind === 'churro') { const b = mesh(new THREE.CapsuleGeometry(0.03, 0.08, 4, 8).rotateZ(Math.PI / 2), m, x, y + 0.03, z); b.rotation.y = 0.4; g.add(b); }
    else g.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), m, x, y + 0.035, z));
  }
  return bake(g, 'pastryCase');
}
// a chalkboard menu (hand-lettered lines)
export function menuBoard({ title = 'MENU', lines = ['ブレンド 450', 'カフェラテ 520', 'カプチーノ 520', 'カルダモンロール 380'], w = 1.6, h = 1.0 } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext('2d'); x.fillStyle = '#2b2f2c'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#f3ead8'; x.font = 'italic bold 52px Georgia, serif'; x.textAlign = 'center'; x.fillText(title, 256, 66);
  x.font = '30px sans-serif'; x.textAlign = 'left'; lines.forEach((l, i) => x.fillText(l, 40, 120 + i * 44));
  x.strokeStyle = '#d9a441'; x.lineWidth = 3; x.beginPath(); x.moveTo(170, 82); x.lineTo(342, 82); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  g.add(box(w + 0.1, h + 0.1, 0.04, M(CAFE.oak), 0, 0, 0));
  g.add(mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), 0, 0, 0.025));
  return bake(g, 'menuBoard');
}
// open shelves on the wall: mugs, jars of beans, coffee bags, a plant
export function wallShelf({ len = 2.4, rows = 2 } = {}) {
  const g = new THREE.Group();
  const mugCols = [CAFE.white, CAFE.sage, CAFE.terracotta, CAFE.mustard, CAFE.rose, CAFE.navy];
  for (let r = 0; r < rows; r++) {
    const y = r * 0.45;
    g.add(box(len, 0.04, 0.25, M(CAFE.oak), 0, y, 0));
    for (let k = 0; k < Math.floor(len / 0.18); k++) {
      const x = -len / 2 + 0.12 + k * 0.18, kind = (k + r * 3) % 5;
      if (kind < 2) g.add(cyl(0.05, 0.045, 0.1, M(mugCols[(k + r) % mugCols.length]), x, y + 0.07, 0, 10));
      else if (kind === 2) g.add(cyl(0.05, 0.05, 0.18, M(0xcfe2e6, { transparent: true, opacity: 0.55 }), x, y + 0.11, 0, 10));
      else if (kind === 3) g.add(rbox(0.12, 0.2, 0.08, 0.02, M([0x8a5a3a, 0x2f3e57, 0xc9714a][(k + r) % 3]), x, y + 0.12, 0));
    }
  }
  return bake(g, 'wallShelf');
}
// the long counter along the window, and its stools
export function windowBar({ len = 7, h = 0.95, depth = 0.45 } = {}) {
  const g = new THREE.Group();
  g.add(box(len, 0.05, depth, M(CAFE.oak), 0, h, 0));
  for (let x = -len / 2 + 0.3; x < len / 2; x += 1.8) g.add(box(0.05, h, 0.05, M(CAFE.iron), x, h / 2, -depth / 2 + 0.05));
  g.add(box(len, 0.04, 0.04, M(CAFE.iron), 0, 0.25, -depth / 2 + 0.05)); // the foot rail
  return bake(g, 'windowBar', { top: h + 0.025 });
}
export function stool({ h = 0.66, color = CAFE.oak } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.16, 0.16, 0.05, M(color), 0, h, 0, 14));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.78; const l = cyl(0.015, 0.02, h, M(CAFE.iron), Math.cos(a) * 0.1, h / 2, Math.sin(a) * 0.1, 6); l.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); g.add(l); }
  g.add(mesh(new THREE.TorusGeometry(0.11, 0.01, 4, 12).rotateX(Math.PI / 2), M(CAFE.iron), 0, 0.22, 0));
  return bake(g, 'stool', { seat: h + 0.025 });
}
// chairs: bentwood (曲げ木), wishbone-ish (Y), a rattan bistro chair; they face +X (where a person sitting faces)
export function chair({ kind = 'bentwood', color = CAFE.walnut, seat = 0.36 } = {}) {
  const g = new THREE.Group(), m = M(color);
  g.add(cyl(0.17, 0.17, 0.04, kind === 'bistro' ? M(0xc9a87c) : m, 0, seat, 0, 14));
  for (const [x, z] of [[0.11, 0.11], [0.11, -0.11], [-0.11, 0.11], [-0.11, -0.11]]) g.add(cyl(0.015, 0.018, seat, m, x, seat / 2, z, 6));
  if (kind === 'bentwood') { const b = mesh(new THREE.TorusGeometry(0.15, 0.015, 4, 14, Math.PI), m, -0.14, seat + 0.2, 0); b.rotation.y = Math.PI / 2; g.add(b); g.add(box(0.02, 0.3, 0.02, m, -0.15, seat + 0.13, 0.13)); g.add(box(0.02, 0.3, 0.02, m, -0.15, seat + 0.13, -0.13)); }
  else if (kind === 'wishbone') { const b = mesh(new THREE.TorusGeometry(0.17, 0.02, 4, 16, Math.PI), m, -0.06, seat + 0.18, 0); b.rotation.set(Math.PI / 2, Math.PI / 2, 0); b.rotation.order = 'YXZ'; b.rotation.set(-Math.PI / 2 + 0.2, Math.PI / 2, 0); g.add(b); g.add(box(0.02, 0.22, 0.04, m, -0.16, seat + 0.11, 0)); }
  else { const b = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.22, 14, 1, true, Math.PI / 2, Math.PI), M(0xc9a87c, { side: THREE.DoubleSide }), 0, seat + 0.13, 0); g.add(b); } // the rattan back
  return bake(g, 'chair', { seat: seat + 0.02 });
}
export function roundTable({ r = 0.36, h = 0.55, top = CAFE.marble } = {}) {
  const g = new THREE.Group();
  g.add(cyl(r, r, 0.04, M(top, { roughness: 0.3 }), 0, h, 0, 20));
  g.add(cyl(0.03, 0.03, h, M(CAFE.iron), 0, h / 2, 0, 8));
  g.add(cyl(0.18, 0.2, 0.03, M(CAFE.iron), 0, 0.015, 0, 14));
  return bake(g, 'table', { top: h + 0.02 });
}
export function longTable({ len = 3.6, w = 1.0, h = 0.55, color = CAFE.oak } = {}) {
  const g = new THREE.Group();
  g.add(box(len, 0.06, w, M(color), 0, h, 0));
  for (const x of [-len / 2 + 0.25, len / 2 - 0.25]) { g.add(box(0.08, h, w - 0.2, M(CAFE.iron), x, h / 2, 0)); }
  return bake(g, 'table', { top: h + 0.03 });
}
export function sofa({ len = 1.9, color = 0x8a9a8a } = {}) {
  const g = new THREE.Group(), m = M(color, { roughness: 1 });
  g.add(rbox(len, 0.22, 0.7, 0.06, m, 0, 0.2, 0));
  g.add(rbox(len, 0.4, 0.18, 0.06, m, 0, 0.45, -0.28));
  for (const s of [1, -1]) g.add(rbox(0.16, 0.32, 0.7, 0.06, m, s * (len / 2 - 0.08), 0.32, 0));
  for (let k = 0; k < 2; k++) g.add(rbox(len / 2 - 0.12, 0.08, 0.5, 0.04, M(color, { roughness: 1 }), (k - 0.5) * (len / 2 - 0.1), 0.34, 0.05)); // cushions
  g.add(rbox(0.25, 0.22, 0.08, 0.04, M(CAFE.mustard, { roughness: 1 }), -len / 2 + 0.35, 0.5, -0.15)); // a pillow
  for (const s of [1, -1]) g.add(cyl(0.02, 0.02, 0.1, M(CAFE.walnut), s * (len / 2 - 0.1), 0.05, 0.25, 6));
  return bake(g, 'sofa', { seat: 0.38 });
}
export function armchair({ color = CAFE.terracotta } = {}) {
  const g = new THREE.Group(), m = M(color, { roughness: 1 });
  g.add(rbox(0.75, 0.22, 0.7, 0.06, m, 0, 0.2, 0)); g.add(rbox(0.75, 0.5, 0.16, 0.06, m, 0, 0.5, -0.28));
  for (const s of [1, -1]) g.add(rbox(0.14, 0.3, 0.68, 0.06, m, s * 0.31, 0.38, 0));
  return bake(g, 'armchair', { seat: 0.36 });
}
export function rug({ w = 2.6, d = 1.8, a = 0xe8dcc6, b = CAFE.terracotta } = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * d / w); const x = c.getContext('2d');
  x.fillStyle = '#' + new THREE.Color(a).getHexString(); x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#' + new THREE.Color(b).getHexString(); x.lineWidth = 6; x.strokeRect(14, 14, c.width - 28, c.height - 28);
  for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(40 + k * 36, c.height / 2 - 20); x.lineTo(58 + k * 36, c.height / 2); x.lineTo(40 + k * 36, c.height / 2 + 20); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), 0, 0.012, 0);
  m.receiveShadow = true; m.userData.kind = 'rug';
  return m;
}
export function lowTable({ w = 0.9, d = 0.5 } = {}) { const g = new THREE.Group(); g.add(box(w, 0.04, d, M(CAFE.oak), 0, 0.32, 0)); legs4(g, w, d, 0.32, 0.02, M(CAFE.walnut)); return bake(g, 'lowTable', { top: 0.34 }); }
// lamps: pendants (globe / cone / layered shades), a floor lamp; candles that flicker
export function pendant({ kind = 'globe', drop = 1.0, color = CAFE.white } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.006, 0.006, drop, M(CAFE.iron), 0, -drop / 2, 0, 4));
  if (kind === 'globe') g.add(mesh(new THREE.SphereGeometry(0.13, 14, 10), GLOW.bulb, 0, -drop - 0.1, 0));
  else if (kind === 'cone') { g.add(mesh(new THREE.ConeGeometry(0.18, 0.2, 16, 1, true), M(color, { side: THREE.DoubleSide }), 0, -drop - 0.08, 0)); g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), GLOW.bulb, 0, -drop - 0.12, 0)); }
  else { for (let k = 0; k < 3; k++) g.add(mesh(new THREE.CylinderGeometry(0.06 + k * 0.06, 0.1 + k * 0.07, 0.05, 18, 1, true), M(color, { side: THREE.DoubleSide }), 0, -drop - k * 0.06, 0)); g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), GLOW.bulb, 0, -drop - 0.1, 0)); } // layered (北欧)
  g.userData = { kind: 'lamp', light: [0, -drop - 0.15, 0] };
  return g;
}
export function floorLamp() {
  const g = new THREE.Group();
  g.add(cyl(0.15, 0.17, 0.03, M(CAFE.iron), 0, 0.015, 0, 14)); g.add(cyl(0.012, 0.012, 1.45, M(CAFE.brass, { metalness: 0.5 }), 0, 0.74, 0, 6));
  g.add(mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.24, 16, 1, true), M(0xf3e6c8, { side: THREE.DoubleSide, emissive: 0xffc27a, emissiveIntensity: 0.25 }), 0, 1.5, 0));
  g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), GLOW.bulb, 0, 1.45, 0));
  g.userData = { kind: 'lamp', light: [0, 1.4, 0] };
  return g;
}
export function candle({ jar = true } = {}) {
  const g = new THREE.Group();
  if (jar) g.add(cyl(0.035, 0.035, 0.07, M(0xd9c8a0, { transparent: true, opacity: 0.7 }), 0, 0.035, 0, 10));
  g.add(cyl(0.025, 0.025, 0.05, M(CAFE.white), 0, 0.03, 0, 8));
  const f = mesh(new THREE.ConeGeometry(0.012, 0.035, 6), GLOW.flame, 0, 0.075, 0); g.add(f);
  g.userData = { kind: 'candle', dynamic: true, update: (t) => { f.scale.set(1, 0.85 + Math.sin(t * 9 + g.id) * 0.12 + Math.sin(t * 23 + g.id) * 0.05, 1); } };
  return g;
}
// string lights along a line (for windows and terraces)
export function stringLights(points, { sag = 0.15, every = 0.35 } = {}) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(...points[i]), b = new THREE.Vector3(...points[i + 1]), n = Math.ceil(a.distanceTo(b) / every);
    for (let k = 0; k < n; k++) { const t = k / n, p = a.clone().lerp(b, t); p.y -= Math.sin(Math.PI * t) * sag; pts.push(p); }
  }
  pts.push(new THREE.Vector3(...points.at(-1)));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2a2c })));
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), GLOW.bulb, pts.length);
  const o = new THREE.Object3D(); pts.forEach((p, i) => { o.position.copy(p).add(new THREE.Vector3(0, -0.04, 0)); o.updateMatrix(); bulbs.setMatrixAt(i, o.matrix); });
  g.add(bulbs);
  g.userData = { kind: 'stringLights' };
  return g;
}
// plants: a fiddle-leaf fig, a monstera, a hanging pothos, little pots for the sill
export function plant({ kind = 'fiddle', pot = CAFE.terracotta, s = 1 } = {}) {
  const g = new THREE.Group(), leaf = M(CAFE.leaf, { roughness: 0.7, side: THREE.DoubleSide }), leaf2 = M(CAFE.leaf2, { roughness: 0.7, side: THREE.DoubleSide });
  if (kind === 'hanging') {
    g.add(cyl(0.004, 0.004, 0.6, M(0xc9b48a), 0, -0.3, 0, 4)); g.add(cyl(0.12, 0.09, 0.14, M(pot), 0, -0.66, 0, 12));
    for (let k = 0; k < 7; k++) { const a = k * 0.9; for (let j = 0; j < 6; j++) { const l = mesh(new THREE.CircleGeometry(0.05, 6), j % 2 ? leaf : leaf2, Math.cos(a) * (0.12 + j * 0.01), -0.62 - j * 0.11, Math.sin(a) * (0.12 + j * 0.01)); l.rotation.set(0.4, a, 0); g.add(l); } }
    g.userData = { kind: 'plant', hanging: true };
    return bake(g, 'plant');
  }
  const potH = kind === 'small' ? 0.12 : 0.4;
  g.add(cyl(potH * 0.6, potH * 0.45, potH, M(pot), 0, potH / 2, 0, 14));
  g.add(cyl(potH * 0.58, potH * 0.58, 0.02, M(0x4a3426), 0, potH - 0.02, 0, 14));
  if (kind === 'small') { for (let k = 0; k < 5; k++) { const a = k * 1.25; g.add(mesh(new THREE.SphereGeometry(0.04, 6, 4), leaf2, Math.cos(a) * 0.03, potH + 0.04 + (k % 2) * 0.03, Math.sin(a) * 0.03)); } }
  else if (kind === 'fiddle') {
    g.add(cyl(0.025, 0.03, 1.4, M(0x6b4a35), 0, potH + 0.7, 0, 6));
    for (let k = 0; k < 16; k++) { const a = k * 2.3, y = potH + 0.6 + k * 0.06; const l = mesh(new THREE.SphereGeometry(0.14, 8, 6), k % 2 ? leaf : leaf2, Math.cos(a) * 0.14, y, Math.sin(a) * 0.14); l.scale.set(1, 0.25, 0.75); l.rotation.set(0.3, -a, 0.5); g.add(l); }
  } else { // monstera
    for (let k = 0; k < 9; k++) { const a = k * 0.7, r = 0.25 + (k % 3) * 0.08; g.add(cyl(0.01, 0.01, 0.6, leaf, Math.cos(a) * r * 0.5, potH + 0.3, Math.sin(a) * r * 0.5, 4)); const l = mesh(new THREE.CircleGeometry(0.2, 10), k % 2 ? leaf : leaf2, Math.cos(a) * r, potH + 0.55 + (k % 3) * 0.08, Math.sin(a) * r); l.rotation.set(-1.0, -a + Math.PI / 2, 0); g.add(l); }
  }
  g.scale.setScalar(s);
  return bake(g, 'plant');
}
export function bookshelf({ w = 1.4, h = 1.9 } = {}) {
  const g = new THREE.Group(), wood = M(CAFE.oak);
  for (const x of [-w / 2, w / 2]) g.add(box(0.04, h, 0.32, wood, x, h / 2, 0));
  const cols = [CAFE.terracotta, CAFE.navy, CAFE.mustard, CAFE.sage, CAFE.rose, 0x6b4a35, 0xf3ead8, 0x4a6b8a];
  for (let r = 0; r < 4; r++) {
    const y = 0.05 + r * (h / 4);
    g.add(box(w, 0.03, 0.32, wood, 0, y, 0));
    let x = -w / 2 + 0.06;
    for (let k = 0; x < w / 2 - 0.08; k++) { const bw = 0.04 + ((k * 7 + r) % 3) * 0.015, bh = 0.24 + ((k * 5 + r * 3) % 4) * 0.03; const b = box(bw, bh, 0.22, M(cols[(k * 3 + r) % cols.length]), x + bw / 2, y + bh / 2 + 0.015, 0.02); if ((k + r) % 9 === 4) b.rotation.z = 0.3; g.add(b); x += bw + 0.005; if ((k + r * 2) % 11 === 7) x += 0.15; }
  }
  return bake(g, 'bookshelf');
}
// the door: glass and wood, a brass handle, a bell that rings when it swings
export function door({ w = 1.1, h = 2.3, color = CAFE.walnut } = {}) {
  const g = new THREE.Group(), leaf = new THREE.Group(); leaf.position.x = -w / 2; g.add(leaf);
  leaf.add(box(w, h, 0.06, M(color), w / 2, h / 2, 0));
  const gl = mesh(new THREE.PlaneGeometry(w - 0.3, h - 0.9), GLASS, w / 2, h / 2 + 0.25, 0.035); leaf.add(gl);
  leaf.add(box(0.03, 0.3, 0.05, M(CAFE.brass, { metalness: 0.6, roughness: 0.3 }), w - 0.12, 1.05, 0.06));
  const sign = mesh(new THREE.PlaneGeometry(0.34, 0.16), new THREE.MeshStandardMaterial({ map: signTexture('OPEN', { w: 128, h: 64, font: 'bold 40px Georgia, serif', bg: '#f3ead8', fg: '#2f3e57' }) }), w / 2, 1.55, 0.04); leaf.add(sign);
  const bell = mesh(new THREE.ConeGeometry(0.04, 0.06, 8), M(CAFE.brass, { metalness: 0.7, roughness: 0.3 }), -w / 2 + 0.1, h - 0.1, -0.1); g.add(bell);
  leaf.userData.dynamic = true; bell.userData.dynamic = true;
  g.userData = { kind: 'door', open: 0, update: (t, dt = 0) => { const ud = g.userData; ud.k = THREE.MathUtils.lerp(ud.k ?? 0, ud.open, Math.min(1, dt * 4)); leaf.rotation.y = -ud.k * 1.3; bell.rotation.z = Math.sin(t * 18) * 0.3 * ud.k; } };
  return g;
}
export function awning({ w = 3, depth = 1.2, a = 0x7a9a7a, b = CAFE.cream } = {}) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 8; const x = c.getContext('2d'); for (let k = 0; k < 8; k++) { x.fillStyle = '#' + new THREE.Color(k % 2 ? b : a).getHexString(); x.fillRect(k * 16, 0, 16, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(w / 2, 1);
  const m = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 });
  const g = new THREE.Group();
  const slope = mesh(new THREE.PlaneGeometry(w, depth), m, 0, -depth * 0.25, depth / 2); slope.rotation.x = -Math.PI / 2 + 0.5; g.add(slope);
  const val = mesh(new THREE.PlaneGeometry(w, 0.22), m, 0, -depth * 0.5 - 0.1, depth * 0.9); g.add(val); // the valance
  for (const s of [1, -1]) g.add(box(0.03, 0.03, depth, M(CAFE.iron), s * w / 2, -depth * 0.25, depth / 2)).children.at(-1).rotation.x = 0.5;
  g.userData = { kind: 'awning', edge: [[-w / 2, -depth * 0.5 - 0.2, depth * 0.9], [w / 2, -depth * 0.5 - 0.2, depth * 0.9]] };
  return g;
}
export function bladeSign({ name = 'Stilla kaffe', sub = 'coffee · cake', color = '#2f3e57' } = {}) {
  const g = new THREE.Group();
  g.add(box(0.7, 0.03, 0.03, M(CAFE.iron), 0.35, 0, 0));
  const t = signTexture(name, { w: 256, h: 256, font: 'italic bold 40px Georgia, serif', bg: '#f3ead8', fg: color, sub });
  const p = mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.15 }), 0.45, -0.32, 0);
  p.rotation.y = Math.PI / 2; g.add(p);
  g.userData = { kind: 'sign' };
  return g;
}
export function aFrame({ lines = ['本日のおすすめ', 'カルダモンロール', '雨の日はおかわり半額'] } = {}) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 256; c.height = 384; const x = c.getContext('2d'); x.fillStyle = '#2b2f2c'; x.fillRect(0, 0, 256, 384); x.fillStyle = '#f3ead8'; x.textAlign = 'center'; x.font = 'bold 30px sans-serif'; lines.forEach((l, i) => x.fillText(l, 128, 80 + i * 70)); x.strokeStyle = '#d9a441'; x.lineWidth = 3; x.strokeRect(14, 14, 228, 356);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  for (const s of [1, -1]) { const p = new THREE.Group(); p.add(box(0.5, 0.8, 0.03, M(CAFE.oak), 0, 0.4, 0)); p.add(mesh(new THREE.PlaneGeometry(0.42, 0.66), new THREE.MeshStandardMaterial({ map: t }), 0, 0.42, 0.02)); p.rotation.x = s * 0.2; p.rotation.y = s > 0 ? 0 : Math.PI; p.position.z = s * 0.08; g.add(p); }
  return bake(g, 'aFrame');
}
export function umbrellaStand({ n = 3 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.15, 0.13, 0.45, M(CAFE.iron, { roughness: 0.4 }), 0, 0.225, 0, 14));
  const cols = [CAFE.navy, CAFE.terracotta, CAFE.mustard, 0x2a2a2c, CAFE.sage];
  for (let k = 0; k < n; k++) { const u = mesh(new THREE.CylinderGeometry(0.02, 0.07, 0.75, 8), M(cols[k % cols.length]), Math.cos(k * 2.1) * 0.06, 0.6, Math.sin(k * 2.1) * 0.06); u.rotation.set(Math.sin(k) * 0.12, 0, Math.cos(k) * 0.12); g.add(u); }
  return bake(g, 'umbrellaStand');
}
export function coatRack() {
  const g = new THREE.Group();
  g.add(cyl(0.02, 0.025, 1.7, M(CAFE.walnut), 0, 0.85, 0, 8)); g.add(cyl(0.18, 0.2, 0.03, M(CAFE.walnut), 0, 0.015, 0, 12));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; const h = cyl(0.01, 0.01, 0.16, M(CAFE.walnut), Math.cos(a) * 0.06, 1.6, Math.sin(a) * 0.06, 4); h.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8); g.add(h); }
  g.add(rbox(0.3, 0.6, 0.12, 0.05, M(0xc9a87c), 0.12, 1.25, 0)); // a raincoat
  return bake(g, 'coatRack');
}
export function ceilingFan() {
  const g = new THREE.Group(), blades = new THREE.Group();
  g.add(cyl(0.015, 0.015, 0.4, M(CAFE.iron), 0, -0.2, 0, 4)); g.add(cyl(0.08, 0.08, 0.08, M(CAFE.iron), 0, -0.42, 0, 10));
  for (let k = 0; k < 4; k++) { const b = box(0.55, 0.012, 0.11, M(CAFE.oak), 0.32, 0, 0); const p = new THREE.Group(); p.rotation.y = (k / 4) * Math.PI * 2; p.add(b); blades.add(p); }
  blades.position.y = -0.44; blades.userData.dynamic = true; g.add(blades);
  g.userData = { kind: 'fan', update: (t, dt = 0) => { blades.rotation.y += dt * 1.2; } };
  return g;
}
export function recordPlayer() {
  const g = new THREE.Group(), disc = new THREE.Group();
  g.add(rbox(0.42, 0.1, 0.34, 0.02, M(CAFE.walnut), 0, 0.05, 0));
  disc.add(cyl(0.14, 0.14, 0.01, M(0x1d1f23, { roughness: 0.3 }), 0, 0, 0, 24)); disc.add(cyl(0.04, 0.04, 0.012, M(CAFE.terracotta), 0, 0, 0, 12));
  disc.position.set(-0.03, 0.11, 0); disc.userData.dynamic = true; g.add(disc);
  const arm = box(0.2, 0.01, 0.01, M(CAFE.steel, { metalness: 0.6 }), 0.12, 0.13, 0.08); arm.rotation.y = 0.6; g.add(arm);
  g.userData = { kind: 'recordPlayer', update: (t, dt = 0) => { disc.rotation.y += dt * 3.5; } };
  return g;
}

// ---------- the Japanese café's pieces (cafe/DESIGN.md §2.5 和のカフェ) ----------
// a paper lantern hanging from the ceiling (washi over a bamboo frame)
export function washiLamp({ drop = 1.0, r = 0.2, h = 0.42 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.006, 0.006, drop, M(CAFE.iron), 0, -drop / 2, 0, 4));
  g.add(mesh(new THREE.CylinderGeometry(r, r, h, 16, 1, true), WASHI, 0, -drop - h / 2, 0));
  for (const y of [0, -h]) g.add(mesh(new THREE.TorusGeometry(r, 0.01, 4, 16).rotateX(Math.PI / 2), M(0x8a6a4a), 0, -drop + y, 0));
  g.userData = { kind: 'lamp' };
  return g;
}
export const WASHI = new THREE.MeshStandardMaterial({ color: 0xfaf3e2, emissive: 0xffc27a, emissiveIntensity: 0.4, roughness: 0.9, side: THREE.DoubleSide });
const tatamiTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#c9c48a'; x.fillRect(0, 0, 128, 256); x.strokeStyle = 'rgba(120,110,60,0.25)'; for (let y = 0; y < 256; y += 3) { x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke(); } x.fillStyle = '#2f3e2a'; x.fillRect(0, 0, 8, 256); x.fillRect(120, 0, 8, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
// 小上がり: a raised floor of tatami mats with a wooden edge and a step
export function tatamiDais({ w = 5, d = 3.2, h = 0.36 } = {}) {
  const g = new THREE.Group();
  g.add(box(w, h, d, M(CAFE.walnut), 0, h / 2, 0));
  const mats = Math.round(w / 0.9);
  for (let k = 0; k < mats; k++) { const t = tatamiTex.clone(); t.needsUpdate = true; t.repeat.set(1, 1); const m = mesh(new THREE.PlaneGeometry(w / mats - 0.02, d - 0.1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), -w / 2 + (k + 0.5) * (w / mats), h + 0.005, 0); g.add(m); }
  g.add(box(w, 0.06, 0.12, M(0x3a2c22), 0, h, d / 2 - 0.06)); // the edge (框)
  g.add(box(1.2, 0.18, 0.4, M(CAFE.walnut), w / 2 - 1, 0.09, d / 2 + 0.2)); // a step stone of wood
  return bake(g, 'tatamiDais', { top: h });
}
export function zabuton({ color = 0x7a2f3a } = {}) { const g = new THREE.Group(); g.add(rbox(0.5, 0.07, 0.5, 0.03, M(color, { roughness: 1 }), 0, 0.035, 0)); return g; }
// a hanging scroll with brush lettering
export function kakejiku({ text = '一期一会' } = {}) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 384; const x = c.getContext('2d');
  x.fillStyle = '#6b5a48'; x.fillRect(0, 0, 96, 384); x.fillStyle = '#f6efe0'; x.fillRect(12, 40, 72, 300);
  x.fillStyle = '#1d1f23'; x.font = 'bold 56px serif'; x.textAlign = 'center'; [...text].forEach((ch, i) => x.fillText(ch, 48, 100 + i * 66));
  x.fillStyle = '#c8283a'; x.fillRect(58, 300, 16, 16); // the seal
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  g.add(mesh(new THREE.PlaneGeometry(0.5, 2.0), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), 0, 0, 0));
  for (const y of [1.0, -1.0]) g.add(cyl(0.025, 0.025, 0.6, M(0x3a2c22), 0, y, 0.02, 6)).children.at(-1).rotation.z = Math.PI / 2;
  return g;
}
// つくばい: a low stone basin fed by a bamboo spout, with a ladle; its water ripples in the rain
export function tsukubai() {
  const g = new THREE.Group(), stone = M(0x8a867c, { roughness: 1, flatShading: true });
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.4, 10), stone, 0, 0.2, 0));
  const water = mesh(new THREE.CircleGeometry(0.3, 16).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4f7a7a, roughness: 0.05, metalness: 0.2 }), 0, 0.38, 0); g.add(water);
  const spout = cyl(0.035, 0.035, 0.9, M(0x8fb06a), 0.45, 0.62, 0, 8); spout.rotation.z = 1.25; g.add(spout); g.add(cyl(0.04, 0.04, 0.55, M(0x8fb06a), 0.82, 0.3, 0, 8));
  const ladle = cyl(0.008, 0.008, 0.4, M(0xc9b07a), -0.05, 0.42, 0.12, 4); ladle.rotation.x = Math.PI / 2; g.add(ladle);
  for (const [x, z] of [[-0.7, 0.4], [0.2, 0.75], [-0.4, -0.6]]) { const st = mesh(new THREE.DodecahedronGeometry(0.22, 0), stone, x, 0.1, z); st.scale.y = 0.5; g.add(st); }
  const stream = cyl(0.01, 0.01, 0.12, M(0xcfe8f0, { transparent: true, opacity: 0.6 }), 0.09, 0.44, 0, 4); g.add(stream);
  g.userData = { kind: 'tsukubai', water };
  return g;
}

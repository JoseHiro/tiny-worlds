// Aircraft cabin at person scale (a character is 1.3 tall) — the "cabin view" (DESIGN.md §9).
// The aircraft is cut open at window height. Nose points +X; floor at y = 0;
// seen from the passenger's seat, left is −Z (the L1 door is on −Z).
import * as THREE from 'three';
import { PALETTE, mat, mesh, rbox, box, cyl, person } from './parts.js';
import { metal, screenMat, luggage, BAG_COLORS, routine } from './interior.js';
import { bakeStatic } from './merge.js';

const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
const LOOK = { px: 0, nx: Math.PI, pz: -Math.PI / 2, nz: Math.PI / 2 };

// ---------- geometry of the cabin ----------

const GEAR_H = 2.6; // cabin floor height above the ground when the kit stands on its own
export const CABIN = {
  length: 36, radius: 2.4, centerY: 0.9, cutY: 1.35,
  rows: 18, pitch: 0.85, firstRowX: 5.9, // row 1 is at the front
  seatZ: { A: -1.68, B: -1.18, C: -0.68, D: 0.68, E: 1.18, F: 1.68 },
  door: V(10.0, -2.15), aisleZ: 0,
  galley: [7.0, 9.2], lavs: [-11.6, -10.0], cockpit: [12.4, 15.2],
};
export const rowX = (r) => CABIN.firstRowX - (r - 1) * CABIN.pitch;
export const seatPos = (r, letter) => V(rowX(r) + 0.02, CABIN.seatZ[letter]);
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ---------- parts ----------

// Three seats side by side (along Z), facing +X. Accent = seat fabric.
export function seatTriple({ color = PALETTE.navy, headrest = PALETTE.white } = {}) {
  const g = new THREE.Group();
  const fabric = mat(color, { roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const z = (i - 1) * 0.5;
    g.add(rbox(0.46, 0.12, 0.44, 0.05, fabric, 0, 0.3, z)); // cushion
    const back = rbox(0.12, 0.78, 0.44, 0.05, fabric, -0.24, 0.72, z);
    back.rotation.z = 0.1;
    g.add(back);
    g.add(box(0.13, 0.16, 0.4, mat(headrest), -0.26, 1.02, z)); // headrest cover
    g.add(box(0.02, 0.18, 0.26, mat(PALETTE.darkGrey), -0.31, 0.62, z)); // seat-back pocket / tray
  }
  for (let i = 0; i <= 3; i++) g.add(box(0.36, 0.05, 0.05, mat(PALETTE.darkGrey), -0.02, 0.48, (i - 1.5) * 0.5)); // armrests
  for (const z of [-0.55, 0.55]) g.add(box(0.05, 0.24, 0.05, metal(), 0, 0.12, z), box(0.42, 0.04, 0.05, metal(), 0, 0.02, z));
  g.userData = { kind: 'seats' };
  return g;
}

// Overhead bin run along X on one side; the doors lift open (open = 0..1).
export function overheadBins(length, { side = 1 } = {}) {
  const g = new THREE.Group();
  const shell = mat(PALETTE.white, { transparent: true, opacity: 0.45, depthWrite: false });
  g.add(box(length, 0.42, 0.75, shell, 0, 1.82, side * 1.55));
  g.add(box(length, 0.03, 0.78, mat(PALETTE.grey), 0, 1.6, side * 1.55)); // bin floor line
  const doors = [];
  for (let x = -length / 2 + 0.5; x < length / 2; x += 1.0) {
    const hinge = new THREE.Group();
    hinge.userData.dynamic = true;
    hinge.position.set(x, 2.03, side * 1.18);
    hinge.add(box(0.96, 0.4, 0.03, mat(PALETTE.white, { transparent: true, opacity: 0.6, depthWrite: false }), 0, -0.2, 0));
    g.add(hinge);
    doors.push(hinge);
  }
  g.userData = { kind: 'bins', open: 0, update: () => { for (const d of doors) d.rotation.x = side * g.userData.open * 1.2; } };
  return g;
}

export function galleyBlock() {
  const g = new THREE.Group();
  const steel = metal();
  g.add(box(1.6, 1.3, 0.55, mat(PALETTE.white), 0, 0.65, 0));
  for (let i = 0; i < 3; i++) { // stowed trolleys
    g.add(rbox(0.42, 0.9, 0.04, 0.02, steel, -0.5 + i * 0.5, 0.46, 0.29));
    g.add(box(0.3, 0.04, 0.02, mat(PALETTE.ink), -0.5 + i * 0.5, 0.82, 0.31));
  }
  g.add(box(1.6, 0.05, 0.58, mat(PALETTE.grey), 0, 1.33, 0));
  g.add(rbox(0.32, 0.28, 0.26, 0.03, steel, -0.4, 1.5, 0)); // coffee maker
  g.add(box(0.12, 0.05, 0.02, screenMat(0xff9b5c, 0.8), -0.4, 1.56, 0.13));
  g.add(rbox(0.36, 0.3, 0.3, 0.03, mat(PALETTE.darkGrey), 0.35, 1.52, 0)); // oven
  g.add(box(0.24, 0.16, 0.02, screenMat(0x9fd2e0, 0.5), 0.35, 1.54, 0.16));
  g.userData = { kind: 'galley' };
  return g;
}

export function lavatory({ side = 1 } = {}) {
  const g = new THREE.Group();
  g.add(box(1.1, 1.3, 0.06, mat(PALETTE.white), 0, 0.65, -side * 0.5)); // inner wall
  for (const x of [-0.55, 0.55]) g.add(box(0.06, 1.3, 1.0, mat(PALETTE.white), x, 0.65, 0));
  g.add(rbox(0.36, 0.42, 0.4, 0.08, mat(PALETTE.white), -0.2, 0.21, side * 0.2)); // toilet
  g.add(box(0.5, 0.06, 0.32, mat(PALETTE.grey), 0.22, 0.8, side * 0.25)); // basin
  const sign = mesh(new THREE.BoxGeometry(0.2, 0.12, 0.02), screenMat(0x45e07a, 1), 0.3, 1.18, -side * 0.53);
  g.add(sign);
  g.userData = { kind: 'lav', sign };
  return g;
}

export function cockpit() {
  const g = new THREE.Group();
  for (const z of [-0.5, 0.5]) {
    g.add(rbox(0.5, 0.12, 0.48, 0.05, mat(PALETTE.ink), 0, 0.34, z));
    g.add(rbox(0.12, 0.85, 0.48, 0.05, mat(PALETTE.ink), -0.26, 0.78, z));
  }
  g.add(box(0.35, 0.5, 1.9, mat(PALETTE.darkGrey), 1.1, 0.75, 0)); // panel
  const screens = [];
  for (const z of [-0.7, -0.3, 0.3, 0.7]) {
    const s = mesh(new THREE.BoxGeometry(0.02, 0.22, 0.3), screenMat(z < 0 ? 0x7fd0ff : 0x9fffc8, 0.9), 0.92, 0.82, z);
    g.add(s);
    screens.push(s);
  }
  g.add(box(0.5, 0.12, 0.3, mat(PALETTE.darkGrey), 0.6, 0.62, 0)); // pedestal
  g.add(box(0.6, 0.06, 2.0, mat(PALETTE.ink), 1.3, 1.25, 0)); // glare shield
  g.userData = { kind: 'cockpit', seats: [V(0.04, -0.5), V(0.04, 0.5)], update: (t) => screens.forEach((s, i) => { s.material.emissiveIntensity = 0.7 + 0.2 * Math.sin(t * 2 + i); }) };
  return g;
}

export function serviceCart() {
  const g = new THREE.Group();
  g.add(rbox(0.6, 0.9, 0.34, 0.03, metal(), 0, 0.5, 0));
  g.add(box(0.62, 0.04, 0.36, mat(PALETTE.orange), 0, 0.96, 0));
  g.add(cyl(0.035, 0.035, 0.08, mat(PALETTE.white), 0.1, 1.02, 0.05, 8));
  g.add(cyl(0.035, 0.035, 0.08, mat(PALETTE.white), -0.1, 1.02, -0.05, 8));
  for (const x of [-0.22, 0.22]) for (const z of [-0.12, 0.12]) g.add(cyl(0.04, 0.04, 0.03, mat(PALETTE.ink), x, 0.04, z, 8));
  g.userData = { kind: 'cart' };
  return g;
}

// Seat-belt sign + no-smoking sign panel (lit = belts on).
export function beltSign() {
  const g = new THREE.Group();
  g.add(box(0.06, 0.14, 0.42, mat(PALETTE.white), 0, 0, 0));
  const lamp = mesh(new THREE.BoxGeometry(0.02, 0.1, 0.16), screenMat(0xfff1c8, 0.2), 0.035, 0, -0.1);
  g.add(lamp, mesh(new THREE.BoxGeometry(0.02, 0.1, 0.16), screenMat(0xffd0d0, 0.6), 0.035, 0, 0.1));
  g.userData = { kind: 'beltSign', on: false, update: () => { lamp.material.emissiveIntensity = g.userData.on ? 1.6 : 0.15; } };
  return g;
}

// Filler passengers for the seats nobody is following: three instanced meshes in all.
export function seatedCrowd(spots) {
  const g = new THREE.Group();
  const n = spots.length;
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.17, 0.16, 4, 10), mat(0xffffff), n);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.25, 14, 10), mat(PALETTE.skin), n);
  const hair = new THREE.InstancedMesh(new THREE.SphereGeometry(0.265, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff), n);
  const tops = [PALETTE.sky, PALETTE.navy, PALETTE.teal, PALETTE.orange, PALETTE.pink, PALETTE.green, PALETTE.yellow, PALETTE.grey, PALETTE.red].map((c) => new THREE.Color(c));
  const hairs = [PALETTE.ink, PALETTE.brown, 0xd9d6d0, PALETTE.ink, PALETTE.brown].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4();
  spots.forEach((p, i) => {
    bodies.setMatrixAt(i, m4.makeTranslation(p.x - 0.02, 0.56, p.z));
    heads.setMatrixAt(i, m4.makeTranslation(p.x - 0.02, 0.98, p.z));
    hair.setMatrixAt(i, m4.makeTranslation(p.x - 0.05, 1.0, p.z));
    bodies.setColorAt(i, tops[(i * 7) % tops.length]);
    hair.setColorAt(i, hairs[(i * 3) % hairs.length]);
  });
  for (const im of [bodies, heads, hair]) { im.castShadow = true; g.add(im); }
  g.userData = { kind: 'crowd' };
  return g;
}

// ---------- the cut-open fuselage ----------

function fuselage(livery) {
  const g = new THREE.Group();
  const { length, radius, centerY, cutY } = CABIN;
  // lathe profile, tail (y = 0) → nose (y = length); kept below the cut line
  const prof = [[0, 0], [0.6, 0.4], [1.6, 2.6], [2.3, 5.2], [radius, 6.6], [radius, 30], [2.3, 31.6], [2.0, 33.2], [1.4, 34.6], [0.6, 35.6], [0, 36]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const margin = Math.asin((cutY - centerY) / radius); // keep the walls up to the cut height
  // lathe phi: world height ∝ −sin(phi) after the rotation below, so the bottom is phi = π/2
  const skin = mesh(new THREE.LatheGeometry(prof, 48, -margin, Math.PI + 2 * margin), mat(livery.body, { side: THREE.DoubleSide, roughness: 0.5 }));
  skin.rotation.z = -Math.PI / 2;
  skin.position.set(-length / 2, centerY, 0);
  g.add(skin);
  // inner lining a hair inside, cabin-cream, so the inside reads warmer than the outside
  const lining = mesh(new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(Math.max(0, p.x - 0.06), p.y)), 48, -margin, Math.PI + 2 * margin), mat(0xefe8dc, { side: THREE.BackSide }));
  lining.rotation.z = -Math.PI / 2;
  lining.position.copy(skin.position);
  g.add(lining);
  // the cut edge: a dark line like a section drawing
  for (const s of [1, -1]) g.add(box(29, 0.05, 0.12, mat(PALETTE.ink), 0, cutY, s * Math.sqrt(radius * radius - (cutY - centerY) ** 2)));
  // cheatline on the outside, windows along both walls
  for (const s of [1, -1]) {
    const zr = Math.sqrt(radius * radius - (0.35 - centerY) ** 2) + 0.01;
    g.add(box(23, 0.14, 0.02, mat(livery.tail), -1, 0.35, s * zr));
  }
  const winMat = mat(PALETTE.glass, { roughness: 0.2 });
  for (let r = 1; r <= CABIN.rows; r++) for (const s of [1, -1]) {
    const zr = Math.sqrt(radius * radius - (1.02 - centerY) ** 2) - 0.03;
    g.add(rbox(0.32, 0.4, 0.05, 0.1, winMat, rowX(r) + 0.25, 1.02, s * zr));
  }
  // floor: carpet with an aisle runner
  g.add(box(26, 0.1, 4.4, mat(0x56637a, { roughness: 1 }), -0.4, -0.05, 0));
  g.add(box(26, 0.02, 0.7, mat(0x7c4b52, { roughness: 1 }), -0.4, 0.01, 0));
  g.add(box(2.8, 0.1, 3.0, mat(0x3a4152, { roughness: 1 }), 13.6, 0.05, 0)); // cockpit floor
  // tail fin, wing stubs and engines so it still reads as an aircraft
  const finShape = new THREE.Shape([[-12, 0], [-16.2, 6.5], [-18.2, 6.5], [-17.6, 0]].map(([a, b]) => new THREE.Vector2(a, b)));
  const fin = mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.3, bevelEnabled: false }).translate(0, 0, -0.15), mat(livery.tail), 0, centerY + 1.2, 0);
  g.add(fin);
  for (const s of [1, -1]) {
    const wing = new THREE.Shape([[3, 0], [-3.5, 9], [-6, 9], [-3, 0]].map(([a, b]) => new THREE.Vector2(a, b * s)));
    const w = mesh(new THREE.ExtrudeGeometry(wing, { depth: 0.3, bevelEnabled: false }).rotateX(-Math.PI / 2), mat(PALETTE.cream), 0, -0.55, 0);
    g.add(w);
    const eng = mesh(new THREE.CylinderGeometry(0.95, 0.8, 3.6, 24).rotateZ(-Math.PI / 2), mat(livery.engine), 1.6, -1.55, -s * 4.6);
    g.add(eng);
  }
  // bulkheads: cockpit door wall and the rear wall
  for (const [x, w] of [[12.3, 3.6], [-11.9, 3.4]]) {
    g.add(box(0.1, cutY, w * 0.4, mat(PALETTE.white), x, cutY / 2, -w * 0.3));
    g.add(box(0.1, cutY, w * 0.4, mat(PALETTE.white), x, cutY / 2, w * 0.3));
  }
  // L1 door frame
  g.add(box(0.9, 1.3, 0.08, mat(PALETTE.grey), CABIN.door.x, 0.65, -2.25));
  return g;
}

// ---------- cabin kit ----------

// A whole cabin: shell, 18 rows, galley, lavatories, cockpit, crew; filler passengers in the
// seats nobody is following. With ambient = true, a loop of passengers boards and leaves.
export function cabinKit({ livery = { body: PALETTE.white, tail: PALETTE.orange, engine: PALETTE.navy }, load = 0.75, ambient = true } = {}) {
  const g = new THREE.Group();
  g.add(fuselage(livery));
  const updaters = [];
  const put = (o, x, z, ry = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); if (o.userData.update) updaters.push((t, dt) => o.userData.update(t, dt)); return o; };

  for (let r = 1; r <= CABIN.rows; r++) {
    put(seatTriple({ color: r <= 3 ? PALETTE.teal : PALETTE.navy }), rowX(r), (CABIN.seatZ.A + CABIN.seatZ.C) / 2);
    put(seatTriple({ color: r <= 3 ? PALETTE.teal : PALETTE.navy }), rowX(r), (CABIN.seatZ.D + CABIN.seatZ.F) / 2);
  }
  const binLen = CABIN.rows * CABIN.pitch;
  const bins = [1, -1].map((side) => put(overheadBins(binLen, { side }), CABIN.firstRowX - binLen / 2 + 0.6, 0));
  put(galleyBlock(), 8.1, 1.7, Math.PI);
  put(galleyBlock(), 8.1, -1.55, 0).scale.x = 0.6;
  put(lavatory({ side: 1 }), -10.8, 1.25);
  put(lavatory({ side: -1 }), -10.8, -1.25);
  put(galleyBlock(), -11.3, 0, Math.PI / 2).scale.x = 0.9;
  const deck = put(cockpit(), 13.2, 0);
  const signs = [3, 9, 15].map((r) => put(beltSign(), rowX(r) - 0.3, 0, 0, 2.05));

  // seats: who sits where. Free seats are listed for real passengers; the rest get a filler.
  const all = [];
  for (let r = 1; r <= CABIN.rows; r++) for (const l of LETTERS) all.push({ row: r, letter: l, pos: seatPos(r, l) });
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const filled = all.filter(() => rnd() < load);
  const free = all.filter((x) => !filled.includes(x));
  const crowd = seatedCrowd(filled.map((x) => x.pos));
  g.add(crowd);

  // crew: two pilots, a purser greeting at the door, one more mid-cabin
  const people = [];
  const who = (role, p, look, mode) => {
    const pp = person(role, { mode });
    pp.position.copy(p);
    pp.rotation.y = look;
    pp.userData.phase = Math.random() * 10;
    g.add(pp);
    people.push(pp);
    return pp;
  };
  deck.userData.seats.forEach((p, i) => who('pilot', p.clone().add(deck.position), LOOK.px, 'sit'));
  who('attendant', V(9.3, -1.2), LOOK.nz, 'idle');
  const fa = who('attendant', V(1.0, 0), LOOK.nx, 'walk');

  // ambient boarding loop: door → aisle → bag in the bin → seat → (later) up and off
  const actors = [];
  if (ambient) {
    const ppl = ['business', 'woman', 'child', 'passenger', 'senior', 'backpacker', 'woman', 'business', 'passenger', 'child'];
    const crowdList = [];
    ppl.forEach((type, i) => {
      const seat = free[(i * 5) % free.length];
      const x = rowX(seat.row) + 0.45;
      const side = Math.sign(CABIN.seatZ[seat.letter]);
      actors.push(routine(g, type, [
        { to: V(CABIN.door.x, CABIN.door.z - 0.6), bag: true },
        { to: V(CABIN.door.x - 0.3, 0) },
        { to: V(x, 0) },
        { to: V(x, 0), wait: 1.6, mode: 'lift', look: side < 0 ? LOOK.nz : LOOK.pz, bag: false },
        { to: V(x, seat.pos.z) },
        { to: seat.pos.clone(), wait: 18, mode: 'sit', look: LOOK.px },
        { to: V(x, seat.pos.z) },
        { to: V(x, 0), wait: 1.4, mode: 'lift', look: side < 0 ? LOOK.nz : LOOK.pz, bag: true },
        { to: V(CABIN.door.x - 0.3, 0) },
        { to: V(CABIN.door.x, CABIN.door.z - 0.6) },
      ], { crowd: crowdList, offset: i * 3.1, speed: 1.0 }));
    });
  }

  bakeStatic(g);
  // stand the cut-open aircraft on its gear so wings and engines clear the ground
  const outer = new THREE.Group();
  g.position.y = GEAR_H;
  outer.add(g);
  const gear = new THREE.Group();
  for (const [x, zs] of [[11.5, [0]], [-0.4, [-1.3, 1.3]]]) for (const z of zs) {
    gear.add(cyl(0.12, 0.12, GEAR_H - 0.3, metal(), x, (GEAR_H - 0.3) / 2 + 0.3, z, 8));
    for (const dz of [-0.28, 0.28]) {
      const w = cyl(0.42, 0.42, 0.3, mat(PALETTE.tire, { roughness: 0.9 }), x, 0.42, z + dz, 18);
      w.rotation.x = Math.PI / 2;
      gear.add(w);
    }
  }
  outer.add(gear);
  bakeStatic(gear);
  let faX = 1.0, faDir = 1;
  outer.userData = { cabin: g };
  g.userData = {
    kind: 'cabin',
    free, filled, signs, bins,
    update(t, dt) {
      for (const f of updaters) f(t, dt);
      for (const p of people) p.userData.update(t);
      for (const a of actors) a.update(t, dt);
      // the second attendant walks the aisle checking belts
      faX += faDir * dt * 0.6;
      if (faX > 6.5 || faX < -9) faDir *= -1;
      fa.position.x = faX;
      fa.rotation.y = faDir > 0 ? LOOK.px : LOOK.nx;
      // bins open while anyone is stowing, belt signs on when everyone is seated
      const stowing = actors.some((a) => a.p.userData.mode === 'lift');
      for (const b of bins) b.userData.open += ((stowing ? 1 : 0.15) - b.userData.open) * Math.min(1, dt * 3);
      const seated = actors.length && actors.every((a) => a.p.userData.mode === 'sit');
      for (const sg of signs) sg.userData.on = !actors.length || seated;
    },
  };
  outer.userData = { ...g.userData, cabin: g };
  return outer;
}

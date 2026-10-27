// The two-storey terminal: shell, floors, room kits, arrivals corridor and the
// cutaway view modes ('exterior' | 'f2' | 'f1').
import * as THREE from 'three';
import { PALETTE, mat, mesh, rbox, box, cyl } from './parts.js';
import { bakeStatic } from './merge.js';
import { glowMat } from './scenery.js';
import { checkInHall, hangingSign, planter, bench } from './interior.js';
import { securityHall, lounge, gateLounge, baggageHall, claimHall, arrivalsLobby, immigrationHall, escalator, travelator, glassPartition, textPanel } from './rooms.js';
import * as L from './layout.js';

const { x0, x1, z0, z1 } = L.TERMINAL;
const F2 = L.FLOOR.f2, ROOF = L.FLOOR.roof;
const CUT = 0.7; // cutaway wall height

// A wall run along X or Z from (ax, az) to (bx, bz) between y0 and y0 + h.
function wall(group, ax, az, bx, bz, y0, h, { glass = false, thick = 0.25 } = {}) {
  const len = Math.hypot(bx - ax, bz - az);
  const alongX = Math.abs(bz - az) < 1e-6;
  const cx = (ax + bx) / 2, cz = (az + bz) / 2;
  if (glass) {
    const pane = glowMat(0x3a4a63, 0xffc983, 0, 0.7, { roughness: 0.15, metalness: 0.35 });
    group.add(box(alongX ? len : 0.12, h, alongX ? 0.12 : len, pane, cx, y0 + h / 2, cz));
    for (let s = 0; s <= len + 1e-6; s += 2) {
      const t = s / len;
      group.add(box(0.14, h, 0.16, mat(PALETTE.white), ax + (bx - ax) * t, y0 + h / 2, az + (bz - az) * t));
    }
  } else {
    group.add(box(alongX ? len : thick, h, alongX ? thick : len, mat(PALETTE.white), cx, y0 + h / 2, cz));
  }
}

function cutCap(group, ax, az, bx, bz, y) {
  const len = Math.hypot(bx - ax, bz - az);
  const alongX = Math.abs(bz - az) < 1e-6;
  group.add(box(alongX ? len : 0.3, 0.04, alongX ? 0.3 : len, mat(PALETTE.ink), (ax + bx) / 2, y, (az + bz) / 2));
}

// Perimeter of one storey. full = real wall height; otherwise cut at CUT with a dark cap.
function storey(y0, full) {
  const g = new THREE.Group();
  const h = full ? 3.0 : CUT;
  const runs = [
    [x0, z0, x1, z0, true], // airside: glass
    [x0, z1, x1, z1, true], // landside: glass
    [x0, z0, x0, z1, false],
    [x1, z0, x1, z1, false],
  ];
  for (const [ax, az, bx, bz, glass] of runs) {
    wall(g, ax, az, bx, bz, y0, h, { glass });
    if (!full) cutCap(g, ax, az, bx, bz, y0 + h + 0.02);
  }
  if (full) { // spandrel band between the floors / under the roof, with the orange fascia line
    g.add(box(x1 - x0 + 0.3, 0.4, 0.3, mat(PALETTE.white), (x0 + x1) / 2, y0 + 3.0 - 0.2, z0));
    g.add(box(x1 - x0 + 0.3, 0.4, 0.3, mat(PALETTE.white), (x0 + x1) / 2, y0 + 3.0 - 0.2, z1));
  }
  return g;
}

function roof() {
  const g = new THREE.Group();
  const w = x1 - x0 + 2, d = z1 - z0 + 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  g.add(rbox(w, 0.5, d, 0.2, mat(PALETTE.white), cx, ROOF - 0.15, cz));
  g.add(box(w + 0.04, 0.14, d + 0.04, mat(PALETTE.orange), cx, ROOF - 0.38, cz));
  for (const z of [z0 + 6, cz, z1 - 6]) g.add(box(w - 10, 0.25, 1.4, glowMat(0x9fb6c9, 0xfff0d0, 0, 0.7, { roughness: 0.1 }), cx, ROOF + 0.2, z));
  for (const [x, z] of [[x0 + 12, z0 + 9], [x0 + 16, z0 + 9], [x1 - 14, z1 - 10], [5, z0 + 9]]) g.add(rbox(3, 1, 2, 0.1, mat(PALETTE.grey), x, ROOF + 0.6, z));
  // landside name sign on the roof edge
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = '#1c2232';
  ctx.font = 'italic 400 92px "Instrument Serif", Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Mini Airport', 40, 68);
  ctx.fillStyle = '#e8673c';
  ctx.beginPath();
  ctx.arc(980, 64, 22, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  sign.position.set(-20, ROOF + 1.1, z1 + 1.05);
  g.add(sign, box(16.4, 2.4, 0.2, mat(PALETTE.white), -20, ROOF + 1.1, z1 + 0.9));
  return g;
}

// 2F floor plate, with a hole over the escalator and the open void over the 1F halls.
function floor2() {
  const g = new THREE.Group();
  const t = 0.4, y = F2 - t / 2;
  const slab = (ax, az, bx, bz) => g.add(box(bx - ax, t, bz - az, mat(PALETTE.cream), (ax + bx) / 2, y, (az + bz) / 2));
  const S = L.BANDS.concourse[0]; // gates + concourse are full width; the south band has the void
  const ex0 = L.ESCALATOR.topX - 0.4, ex1 = L.ESCALATOR.topX + 6.2;
  const ez0 = L.ESCALATOR.z - 0.9, ez1 = L.ESCALATOR.z + 0.9;
  slab(x0, z0, ex0, S);
  slab(ex0, ez1, ex1, S);
  slab(ex0, z0, ex1, ez0);
  slab(ex1, z0, x1, S);
  slab(x0, S, x1, L.BANDS.south[0]); // concourse
  slab(x0, L.BANDS.south[0], L.VOID.x0, z1);
  // glass balustrade around the void
  const rail = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), alongX = Math.abs(bz - az) < 1e-6;
    g.add(mesh(new THREE.BoxGeometry(alongX ? len : 0.05, 0.9, alongX ? 0.05 : len), mat(0xbfd8e6, { transparent: true, opacity: 0.3, depthWrite: false }), (ax + bx) / 2, F2 + 0.45, (az + bz) / 2));
    g.add(box(alongX ? len : 0.08, 0.06, alongX ? 0.08 : len, mat(PALETTE.ink), (ax + bx) / 2, F2 + 0.9, (az + bz) / 2));
  };
  rail(L.VOID.x0, L.BANDS.south[0], x1, L.BANDS.south[0]);
  rail(L.VOID.x0, L.BANDS.south[0], L.VOID.x0, z1);
  // concourse floor finish + gate number signs over each gate entrance
  const [k0, k1] = L.BANDS.concourse;
  g.add(box(x1 - x0, 0.02, k1 - k0, mat(0xf0e7d6), (x0 + x1) / 2, F2 + 0.01, (k0 + k1) / 2));
  return g;
}

// 2F arrivals corridor along the airside facade: glass on the gate side, two moving walkways,
// glass vestibules where each gate's bridge door crosses it, escalator down at the east end.
function corridor(updaters) {
  const g = new THREE.Group();
  const [c0, c1] = L.BANDS.corridor;
  const cz = (c0 + c1) / 2;
  g.add(box(x1 - x0, 0.02, c1 - c0, mat(0xe3e8ee), (x0 + x1) / 2, F2 + 0.01, cz));
  const doors = L.ROOMS.gates.map((r) => r.x + 4.5);
  // partition on the gate side, interrupted at every gate door
  let from = x0 + 0.2;
  for (const dx of [...doors, x1 - 0.2]) {
    const to = Math.min(dx - 0.9, x1 - 0.2);
    if (to - from > 0.5) {
      const p = glassPartition(to - from);
      p.position.set((from + to) / 2, F2, c1);
      g.add(p);
    }
    from = dx + 0.9;
  }
  for (const [x, len] of [[-38, 14], [-2, 14], [28, 12]]) {
    const w = travelator(len);
    w.position.set(x, F2, cz + 0.6);
    g.add(w);
    updaters.push((t, dt) => w.userData.update(t, dt));
  }
  const sign = textPanel({ w: 3.4, h: 0.55, bg: PALETTE.yellow, fg: '#1c2232', lines: [['到着・手荷物受取 →', 0.5, 700], ['Arrivals · Baggage Claim', 0.3, 500]], glow: 0.3 });
  sign.position.set(0, F2 + 2.2, cz);
  g.add(sign);
  const esc = escalator({ rise: F2 });
  esc.position.set(L.ESCALATOR.topX + esc.userData.run, 0, L.ESCALATOR.z);
  esc.rotation.y = Math.PI; // top at topX on 2F, bottom further east on 1F
  g.add(esc);
  updaters.push((t, dt) => esc.userData.update(t, dt));
  return g;
}

// 1F back-of-house hall under the gates (arrivals walk through it from the escalator).
function floor1Fill() {
  const g = new THREE.Group();
  g.add(box(x1 - x0, 0.03, z1 - z0, mat(0xe9e3d7), (x0 + x1) / 2, 0.015, (z0 + z1) / 2)); // just under the 1F rooms (they sit at +0.04)
  for (let x = x0 + 6; x < x1; x += 12) for (const z of [L.BANDS.gates[0], L.BANDS.south[0]]) g.add(box(0.5, F2, 0.5, mat(PALETTE.white), x, F2 / 2, z)); // columns
  return g;
}

export function buildTerminal(scene) {
  const updaters = [];
  const T = {
    shell1Full: storey(0, true), shell1Cut: storey(0, false),
    shell2Full: storey(F2, true), shell2Cut: storey(F2, false),
    floor2: floor2(), roof: roof(), floor1: floor1Fill(),
    rooms2: new THREE.Group(), rooms1: new THREE.Group(), corridor: corridor(updaters),
  };
  for (const k of ['shell1Full', 'shell1Cut', 'shell2Full', 'shell2Cut', 'floor2', 'roof', 'floor1']) bakeStatic(T[k]);

  const place = (group, kit, r, ry = 0) => {
    kit.position.set(r.x, r.y, r.z);
    kit.rotation.y = ry;
    group.add(kit);
    if (kit.userData.update) updaters.push((t, dt) => kit.userData.update(t, dt));
    return kit;
  };
  // Rooms on the passenger path run without their scripted crowds: real passengers
  // (pax.js) walk through them using each kit's anchors.
  const rooms = {
    gates: L.ROOMS.gates.map((r) => place(T.rooms2, gateLounge({ outside: false, gate: r.stand, ambient: false }), r)),
    checkIn: L.ROOMS.checkIn.map((r) => place(T.rooms2, checkInHall({ ambient: false }), r)),
    security: place(T.rooms2, securityHall({ ambient: false }), L.ROOMS.security),
    lounges: L.ROOMS.lounges.map((r) => place(T.rooms2, lounge(), r)),
    sorting: place(T.rooms1, baggageHall({ ambient: false }), L.ROOMS.sorting),
    claim: place(T.rooms1, claimHall({ ambient: false }), L.ROOMS.claim),
    lobby: place(T.rooms1, arrivalsLobby({ ambient: false }), L.ROOMS.lobby),
    immigration: place(T.rooms1, immigrationHall({ ambient: false }), L.ROOMS.immigration),
  };
  for (const g of Object.values(T)) scene.add(g);

  let mode = null;
  const set = (m) => {
    if (m === mode) return;
    mode = m;
    const ext = m === 'exterior', f1 = m === 'f1';
    T.roof.visible = ext;
    T.shell2Full.visible = ext;
    T.shell2Cut.visible = m === 'f2';
    T.shell1Full.visible = !f1;
    T.shell1Cut.visible = f1;
    T.floor2.visible = !f1;
    T.rooms2.visible = m === 'f2';
    T.corridor.visible = !ext;
    T.rooms1.visible = !ext; // in 2F mode the claim hall and lobby show through the void
    T.floor1.visible = !ext;
  };
  set('exterior');
  return {
    rooms,
    get mode() { return mode; },
    setMode: set,
    update(t, dt) { if (mode !== 'exterior') for (const f of updaters) f(t, dt); },
  };
}

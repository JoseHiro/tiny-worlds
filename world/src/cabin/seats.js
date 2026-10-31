// Seats for the in-flight cabin (world/CABIN.md §5.1). Every seat faces +X; left is −Z.
// Each part keeps its wanted state in userData.state (see stateful) and lists where people sit in userData.seats.
import * as THREE from 'three';
import { CP, M, V, SCREENS, mood, bx, rb, cy, sp, pivot, stateful } from './common.js';

// ---------- a row of seats (economy and premium economy share the build) ----------

function seatRow({ n, width, fabric, head, cushion = [0.46, 0.12], backH = 0.8, screen = [0.15, 0.24], legrest = false, cocktail = false, screens }) {
  const g = new THREE.Group();
  const fab = M.fabric(fabric), hr = M.fabric(head);
  const seats = [], parts = [];
  const zOf = (i) => (i - (n - 1) / 2) * width;
  const cw = width - 0.06; // cushion width
  for (let i = 0; i < n; i++) {
    const z = zOf(i);
    rb(g, cushion[0], cushion[1], cw, 0.05, fab, 0, 0.3, z);
    rb(g, 0.05, cushion[1] * 0.8, cw - 0.04, 0.02, M.plastic, cushion[0] / 2, 0.27, z); // the front lip
    const back = pivot(g, -cushion[0] / 2 + 0.03, 0.34, z);
    rb(back, 0.12, backH, cw, 0.05, fab, -0.02, backH / 2, 0);
    rb(back, 0.04, backH - 0.08, cw - 0.02, 0.03, M.plastic, -0.09, backH / 2 - 0.02, 0); // the shell the row behind sees
    bx(back, 0.14, 0.2, cw - 0.04, hr, -0.01, backH - 0.08, 0); // headrest cover
    const scr = bx(back, 0.012, screen[0], screen[1], SCREENS[screens?.[i] ?? 'off'], -0.116, backH - 0.24, 0);
    bx(back, 0.016, 0.14, cw * 0.7, M.trim, -0.115, 0.1, 0); // seat-back pocket
    bx(back, 0.01, 0.02, cw * 0.7, M.ink, -0.124, 0.17, 0); // the pocket's elastic
    const tray = pivot(back, -0.12, 0.2, 0); // hinged at its foot: stowed upright, down = flat toward the row behind
    rb(tray, 0.02, 0.28, cw * 0.78, 0.01, M.panel, -0.012, 0.14, 0);
    bx(tray, 0.012, 0.03, 0.06, M.trim, -0.022, 0.26, 0); // latch
    let flap = null;
    if (legrest) {
      flap = pivot(g, cushion[0] / 2, 0.28, z);
      rb(flap, 0.05, 0.26, cw - 0.06, 0.02, fab, 0.01, -0.13, 0);
    }
    seats.push(V(0.02, z));
    parts.push({ back, tray, scr, flap });
  }
  // armrests between and at both ends; a cocktail table in the wide ones
  for (let i = 0; i <= n; i++) {
    const z = zOf(i - 0.5);
    const wide = cocktail && i > 0 && i < n;
    bx(g, 0.36, 0.05, wide ? 0.09 : 0.05, M.trim, -0.02, 0.5, z);
    bx(g, 0.05, 0.18, 0.04, M.trim, 0.12, 0.4, z);
    if (wide) { bx(g, 0.16, 0.012, 0.14, M.leather(CP.premHead), 0.08, 0.53, z); }
  }
  // the frame: two legs and a rail
  const half = (n * width) / 2 - 0.1;
  for (const z of [-half, half]) {
    bx(g, 0.05, 0.24, 0.05, M.steel, 0.1, 0.12, z);
    bx(g, 0.05, 0.24, 0.05, M.steel, -0.14, 0.12, z);
    bx(g, 0.46, 0.04, 0.05, M.steel, -0.02, 0.02, z);
  }
  bx(g, 0.04, 0.04, n * width - 0.1, M.steel, -0.02, 0.22, 0);

  const init = {};
  for (let i = 0; i < n; i++) { init['recline' + i] = 0; init['tray' + i] = 0; init['legrest' + i] = 0; }
  stateful(g, init, (s) => parts.forEach((p, i) => {
    p.back.rotation.z = 0.1 + s['recline' + i] * 0.24;
    p.tray.rotation.z = s['tray' + i] * (Math.PI / 2 - p.back.rotation.z); // flat whatever the recline
    if (p.flap) p.flap.rotation.z = s['legrest' + i] * 1.35;
  }));
  g.userData.kind = 'seats';
  g.userData.seats = seats;
  g.userData.setScreen = (i, name) => { parts[i].scr.material = SCREENS[name]; };
  return g;
}

// one seat on its own, for the instanced cabin (armrests on both sides overlap the neighbour's exactly)
export const ecoSeat = () => seatRow({ n: 1, width: 0.5, fabric: CP.eco, head: CP.ecoHead, screens: ['map'] });
export const premSeat = () => seatRow({ n: 1, width: 0.58, fabric: CP.prem, head: CP.premHead, cushion: [0.5, 0.14], backH: 0.86, screen: [0.18, 0.28], legrest: true, screens: ['map'] });

// S3 — economy, three abreast (seat 0.5, pitch 0.85: the same as the airport's cabin view)
export const ecoTriple = ({ screens = ['map', 'movie', 'movieB'] } = {}) =>
  seatRow({ n: 3, width: 0.5, fabric: CP.eco, head: CP.ecoHead, screens });

// S2 — premium economy, two or three abreast: wider, a leg rest and a cocktail table
export const premRow = ({ n = 2, screens = ['movie', 'map', 'movieB'] } = {}) =>
  seatRow({ n, width: 0.58, fabric: CP.prem, head: CP.premHead, cushion: [0.5, 0.14], backH: 0.86, screen: [0.18, 0.28], legrest: true, cocktail: true, screens });

// ---------- S1 business pod (reverse herringbone) ----------
// 1.9 long × 0.82 wide. Back wall at x −0.8, ottoman and screen at the front. The privacy wall is on −Z,
// the console and the sliding door on +Z (the aisle). recline 0 → 1 slides the seat forward and lays it flat.
export function businessPod({ screen = 'movie' } = {}) {
  const g = new THREE.Group();
  const shell = M.leather(CP.bizShell), leather = M.leather(CP.biz), sz = -0.08; // the seat sits a little off-centre
  // shell: privacy wall, back wall, a gold line along the top
  rb(g, 1.9, 1.05, 0.05, 0.02, shell, 0.15, 0.525, -0.39);
  rb(g, 0.06, 1.05, 0.82, 0.02, shell, -0.8, 0.525, 0);
  bx(g, 1.9, 0.025, 0.07, M.gold, 0.15, 1.06, -0.39);
  bx(g, 0.07, 0.025, 0.82, M.gold, -0.8, 1.06, 0);
  // console on the aisle side: leather top, a reading lamp, water, the remote
  rb(g, 0.9, 0.6, 0.24, 0.03, shell, -0.1, 0.3, 0.29);
  bx(g, 0.88, 0.02, 0.22, leather, -0.1, 0.61, 0.29);
  bx(g, 0.88, 0.012, 0.012, M.gold, -0.1, 0.62, 0.18);
  cy(g, 0.012, 0.012, 0.36, M.steel, -0.48, 0.78, 0.33, 6);
  const lampArm = cy(g, 0.01, 0.01, 0.2, M.steel, -0.42, 0.95, 0.3, 6);
  lampArm.rotation.x = 0.9;
  cy(g, 0.04, 0.03, 0.04, mood.lamp, -0.36, 0.98, 0.24, 12);
  cy(g, 0.022, 0.022, 0.12, M.glow(0xbfe0f0, 0.15), 0.2, 0.68, 0.3, 10); // water
  cy(g, 0.012, 0.012, 0.025, M.fabric(0x2c6fb0), 0.2, 0.75, 0.3, 8);
  bx(g, 0.1, 0.015, 0.05, M.ink, 0.02, 0.625, 0.3); // remote
  // ottoman and the screen above it
  rb(g, 0.42, 0.32, 0.52, 0.04, shell, 0.86, 0.16, sz);
  rb(g, 0.4, 0.06, 0.48, 0.03, leather, 0.86, 0.35, sz);
  rb(g, 0.05, 0.5, 0.66, 0.02, shell, 1.08, 0.8, sz);
  const scr = bx(g, 0.012, 0.3, 0.5, SCREENS[screen], 1.05, 0.82, sz);
  // the seat: it slides forward as it lies down
  const seat = pivot(g, 0, 0, sz);
  bx(seat, 0.4, 0.24, 0.36, M.trim, 0, 0.12, 0);
  rb(seat, 0.54, 0.13, 0.46, 0.05, leather, 0, 0.32, 0);
  const back = pivot(seat, -0.22, 0.38, 0);
  rb(back, 0.13, 0.78, 0.46, 0.05, leather, -0.02, 0.39, 0);
  bx(back, 0.1, 0.18, 0.4, M.fabric(CP.bizShell), 0.02, 0.7, 0); // headrest cushion
  const legs = pivot(seat, 0.27, 0.36, 0);
  rb(legs, 0.05, 0.3, 0.44, 0.02, leather, 0.0, -0.15, 0);
  // bedding: folded on the ottoman while sitting; spread with a pillow when flat
  const folded = rb(g, 0.26, 0.08, 0.36, 0.03, M.fabric(PALETTE_BLANKET), 0.86, 0.42, sz);
  const blanket = rb(g, 1.25, 0.04, 0.46, 0.02, M.fabric(PALETTE_BLANKET), 0.25, 0.46, sz);
  bx(blanket, 1.26, 0.01, 0.05, M.fabric(CP.biz), 0, 0.02, 0.14);
  const pillow = rb(g, 0.24, 0.08, 0.38, 0.04, M.white, -0.6, 0.47, sz);
  folded.userData.keep = blanket.userData.keep = pillow.userData.keep = true; // they come and go
  // the door slides along the aisle side (closed: in front of the console's end)
  const door = pivot(g, 0.72, 0, 0.43);
  rb(door, 0.68, 0.95, 0.035, 0.015, shell, 0, 0.475, 0);
  bx(door, 0.68, 0.025, 0.05, M.gold, 0, 0.96, 0);

  stateful(g, { recline: 0, door: 0 }, (s) => {
    const k = s.recline;
    seat.position.x = k * 0.25;
    back.rotation.z = 0.18 + k * (Math.PI / 2 - 0.2);
    legs.rotation.z = k * 1.5;
    folded.visible = k < 0.5;
    blanket.visible = pillow.visible = k >= 0.5;
    door.position.x = 0.72 - (1 - s.door) * 0.7; // 1 = closed, 0 = slid back beside the console
  });
  g.userData.kind = 'pod';
  g.userData.seats = [V(0.02, sz)];
  g.userData.bed = V(0.68, sz, 0.56); // a sleeper's feet when flat (lie them on the back, head toward −X)
  g.userData.setScreen = (name) => { scr.material = SCREENS[name]; };
  return g;
}
const PALETTE_BLANKET = 0xe8dcc8;

// ---------- S4 bulkhead with a bassinet ----------
// The wall in front of the first row of a cabin: a big moving-map screen and, if asked, a baby's bed on a bracket.
export function bulkhead({ width = 1.55, screen = 'map', accent = CP.eco } = {}) {
  const g = new THREE.Group();
  bx(g, 0.08, 1.7, width, M.lining, 0, 0.85, 0);
  bx(g, 0.09, 0.22, width, M.fabric(accent), 0, 0.11, 0);
  bx(g, 0.04, 0.5, width * 0.62, M.trim, -0.05, 1.18, 0);
  bx(g, 0.012, 0.42, width * 0.56, SCREENS[screen], -0.072, 1.18, 0);
  // the bassinet: a bracket, a white basket, a baby asleep under a pink blanket
  const cot = pivot(g, 0, 0, 0);
  bx(cot, 0.26, 0.04, 0.5, M.steel, -0.15, 0.82, 0);
  const basket = new THREE.Group(); basket.position.set(-0.36, 0.9, 0); cot.add(basket);
  rb(basket, 0.36, 0.04, 0.66, 0.02, M.white, 0, 0, 0);
  for (const z of [-0.32, 0.32]) bx(basket, 0.36, 0.18, 0.025, M.white, 0, 0.09, z);
  for (const x of [-0.17, 0.17]) bx(basket, 0.025, 0.18, 0.66, M.white, x, 0.09, 0);
  rb(basket, 0.28, 0.06, 0.4, 0.03, M.fabric(0xf2b9c0), 0, 0.06, -0.06);
  sp(basket, 0.075, M.fabric(0xf1c7a5), 0, 0.09, 0.2);
  g.userData.kind = 'bulkhead';
  stateful(g, { baby: true }, (s) => { cot.visible = s.baby; });
  return g;
}

// ---------- S5 crew jump seat ----------
// Folds against a wall (the wall is at x 0, the attendant faces +X). open 0 → 1 drops the seat.
export function jumpSeat() {
  const g = new THREE.Group();
  bx(g, 0.05, 1.3, 0.5, M.panel, -0.02, 0.75, 0);
  rb(g, 0.06, 0.5, 0.42, 0.03, M.fabric(PALETTE_NAVY), 0.03, 0.85, 0);
  rb(g, 0.06, 0.16, 0.3, 0.03, M.fabric(PALETTE_NAVY), 0.03, 1.22, 0);
  for (const z of [-0.1, 0.1]) bx(g, 0.012, 0.5, 0.04, M.ink, 0.065, 0.85, z); // harness
  bx(g, 0.012, 0.05, 0.3, M.ink, 0.066, 0.62, 0);
  const pan = pivot(g, 0.04, 0.44, 0);
  rb(pan, 0.36, 0.06, 0.42, 0.03, M.fabric(PALETTE_NAVY), 0.18, 0, 0);
  stateful(g, { open: 1 }, (s) => { pan.rotation.z = (1 - s.open) * Math.PI / 2; });
  g.userData.kind = 'jumpSeat';
  g.userData.seats = [V(0.12, 0)];
  return g;
}
const PALETTE_NAVY = CP.eco;

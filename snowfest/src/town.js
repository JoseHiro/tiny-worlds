// The town on its square board (snowfest/DESIGN.md §4): a 3 × 3 grid. Two roads run east–west (the north one with tram
// rails) and two north–south; the middle row of blocks is the festival park — stalls and the little sculptures in the
// west, the snow castle and its stage in the middle, the owl, the whale, the foxes and the lattice tower in the east. North:
// the red-brick hall, the clock tower, offices and a hotel. South: a lane of izakaya, the neon blocks and a store, the
// hotel, with the ice sculptures along the front. The board's edge shows the cut: snow over earth over wood.
// Units: a person is 0.58 tall. x east, z south (toward the viewer).
import * as THREE from 'three';
import { IKit, MAT, G, C } from './kit.js';
import { snowCastle, owl, whale, foxes, squirrel, snowmen, little, LITTLE, iceSculpture, ICE_KINDS, iceSlide, iceWall, icicles } from './sculpt.js';
import { clockTower, brickHall, building, neonBuilding, izakaya, hotel, tvTower } from './build.js';
import { stall, STALLS } from './stalls.js';
import { bigAir, rink, snowballFight, snowmanBuilder, slideRider, dancers, crowd, rowsOf } from './activities.js';
import { streetLamp, signal, busStop, vending, bench, fence, nobori, signboard, lightTree, conifer, acUnit, postBox, snowBank } from './street.js';

export const HALF = 15, ROAD = 2, R1 = 5; // (the board is 30 across; roads 2 wide, centred at ±5)
export const ROADS_X = [-R1, R1], ROADS_Z = [-R1, R1];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function place(scene, obj, x, z, ry = 0, s = 1) { obj.position.set(x, 0, z); obj.rotation.y = ry; obj.scale.setScalar(s); scene.add(obj); return obj; }

// the board: a slab of snow on a layer of earth on a wooden base, rounded; the roads, their markings, the tram rails
function board(scene) {
  const k = new IKit(), W = HALF * 2;
  k.box(W + 0.4, 0.5, W + 0.4, 0xecd9b8, 0, -0.95, 0, { r: 0.2 }); // the wooden base
  k.box(W, 0.35, W, 0x6b5442, 0, -0.52, 0, { r: 0.1 }); // earth
  scene.add(k.mesh(MAT.plain, { cast: false }));
  const s = new IKit(); s.box(W, 0.36, W, C.snow, 0, -0.18, 0, { r: 0.16, seg: 2 }); scene.add(s.mesh(MAT.snow, { cast: false }));
  // roads: wet dark asphalt, slush at the edges, dashed centre lines, crossings half gone under snow
  const r = new IKit(), y = 0.005;
  for (const z of ROADS_Z) r.box(W, 0.02, ROAD, C.road, 0, y, z, { r: 0 });
  for (const x of ROADS_X) r.box(ROAD, 0.022, W, C.road, x, y + 0.001, 0, { r: 0 });
  scene.add(r.mesh(MAT.shiny, { cast: false }));
  const m = new IKit();
  for (const z of ROADS_Z) for (let x = -HALF + 0.5; x < HALF; x += 1.2) if (Math.abs(Math.abs(x) - R1) > 1.4) m.box(0.6, 0.01, 0.06, 0xe8edf4, x, 0.02, z, { r: 0 });
  for (const x of ROADS_X) for (let z = -HALF + 0.5; z < HALF; z += 1.2) if (Math.abs(Math.abs(z) - R1) > 1.4) m.box(0.06, 0.01, 0.6, 0xe8edf4, x, 0.022, z, { r: 0 });
  for (const cx of ROADS_X) for (const cz of ROADS_Z) for (let i = 0; i < 6; i++) { // crossings on all four sides, patchy
    if (rnd() < 0.75) m.box(0.22, 0.01, 1.4, 0xe8edf4, cx - 0.65 + i * 0.26, 0.024, cz + 1.6, { r: 0 });
    if (rnd() < 0.75) m.box(0.22, 0.01, 1.4, 0xe8edf4, cx - 0.65 + i * 0.26, 0.024, cz - 1.6, { r: 0 });
    if (rnd() < 0.75) m.box(1.4, 0.01, 0.22, 0xe8edf4, cx + 1.6, 0.024, cz - 0.65 + i * 0.26, { r: 0 });
    if (rnd() < 0.75) m.box(1.4, 0.01, 0.22, 0xe8edf4, cx - 1.6, 0.024, cz - 0.65 + i * 0.26, { r: 0 });
  }
  for (const dz of [-0.32, 0.32]) m.box(W, 0.03, 0.05, 0x9aa0aa, 0, 0.03, -R1 + dz, { r: 0 }); // tram rails (north road)
  scene.add(m.mesh(MAT.plain, { cast: false }));
  // slush along the kerbs and the ploughs' banks of snow, broken at the crossings
  const segs = [[-HALF + 0.2, -R1 - 1.5], [-R1 + 1.5, R1 - 1.5], [R1 + 1.5, HALF - 0.2]];
  for (const z of ROADS_Z) for (const side of [-1, 1]) for (const [a, b] of segs) { const bank = snowBank(b - a, 0.35 + rnd() * 0.2, Math.floor(rnd() * 99)); place(scene, bank, (a + b) / 2, z + side * (ROAD / 2 + 0.25)); }
  for (const x of ROADS_X) for (const side of [-1, 1]) for (const [a, b] of segs) { const bank = snowBank(b - a, 0.35 + rnd() * 0.2, Math.floor(rnd() * 99)); place(scene, bank, x + side * (ROAD / 2 + 0.25), (a + b) / 2, Math.PI / 2); }
}

// the park: three blocks in the middle row
function park(scene, moving) {
  // west: three stalls along the north edge, the twelve little sculptures in two rows, the snowmen, the ice slide
  STALLS.slice(0, 3).forEach((k, i) => moving.push(place(scene, stall(k), -13 + i * 2.5, -3.0)));
  moving.push(place(scene, bigAir(), -14.7, 0.2, 0, 0.72)); // (the in-run starts in the west corner, the landing runs out toward the castle)
  place(scene, snowmen(), -13.3, 2.9, 0.3, 0.9);
  const slide = place(scene, iceSlide(), -9.0, 2.75, -Math.PI / 2, 0.85); const sr = slideRider(); slide.add(sr); moving.push(sr);
  moving.push(place(scene, snowmanBuilder(1.6), -8.0, -1.55));
  scene.add(crowd([...rowsOf(-12.6, 1.2, -8.2, 1.2, 9, Math.PI), ...rowsOf(-6.6, -1.0, -6.6, 1.0, 4, -Math.PI / 2)])); // (watching the big air)
  // middle: the castle and its stage, facing the viewer
  const castle = place(scene, snowCastle(), 0, -1.2, 0, 0.82); moving.push(castle);
  const dance = dancers(2); dance.position.set(0, 0.6, 2.75); scene.add(dance); moving.push(dance);
  scene.add(crowd(rowsOf(-3.2, 3.75, 3.2, 3.75, 13, Math.PI, 2))); // (the audience in front of the stage)
  // east: the owl, the whale, the foxes and squirrel, three more stalls along the south edge facing into the park, the tower
  place(scene, owl(), 7.6, -2.4, 0.2, 0.75);
  place(scene, whale(), 9.9, -2.3, -0.3, 0.6);
  moving.push(place(scene, snowballFight(3.4), 9.2, 0.6));
  scene.add(crowd([[7.1, -0.9, 0.6], [11.3, -0.8, -0.6], [9.2, 1.95, Math.PI, true]]));
  STALLS.slice(3).forEach((k, i) => moving.push(place(scene, stall(k), 7.3 + i * 2.2, 3.1, Math.PI)));
  place(scene, tvTower(), 13.2, 0.2);
  // round every park block: lit trees at the corners, banners, a fence along the roads, lamps
  for (const bx of [-10.5, 0, 10.5]) {
    const hw = bx ? 4.3 : 3.8;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) if (!(bx > 0 && sx > 0)) place(scene, lightTree(Math.floor(rnd() * 50)), bx + sx * (hw - 0.3), sz * 3.6, rnd() * 6, 0.85);
  }
  for (const [x, z, col] of [[-6.6, -2.0, C.noren], [-6.6, -1.3, 0x2f55c4], [-6.6, -0.6, 0xf2c230], [6.6, 1.8, C.noren], [6.6, 2.5, 0x3f8f5a], [3.6, 3.4, 0x2f55c4], [-3.6, 3.4, C.noren]]) moving.push(place(scene, nobori(col), x, z, Math.PI / 2));
  for (const x of [-10.5, 10.5]) { place(scene, fence(4.5), x - 1.8, 3.8); }
  place(scene, signboard(), -3.4, 2.4, 0.4, 0.9);
}

// north: the brick hall, the clock tower with firs round it, offices and flats, the hotel
function north(scene, moving) {
  place(scene, brickHall(), -10.5, -11.7);
  for (const [x, z] of [[-14.2, -14], [-6.8, -14.1]]) place(scene, conifer(2.2 + rnd() * 0.8), x, z);
  LITTLE.forEach((k, i) => place(scene, little(k), -13.8 + (i % 6) * 1.3, -8.7 + Math.floor(i / 6) * 1.3, 0, 0.9)); // (the little sculptures on the hall's forecourt)
  place(scene, clockTower(), -0.4, -10.2);
  for (const [x, z, h] of [[-3.2, -7.4, 2.4], [3.2, -13.4, 2.8], [-3.4, -13.6, 2.2]]) place(scene, conifer(h), x, z);
  place(scene, foxes(), 2.7, -8.2, -0.4, 0.6); place(scene, squirrel(), 3.6, -7.5, -0.3, 0.6);
  place(scene, fence(5), -0.4, -7.0);
  place(scene, building(0), 8.4, -11.6); place(scene, building(1), 11.4, -11.8); place(scene, hotel(), 13.75, -12.0, 0, 0.8);
  moving.push(place(scene, rink(6.4, 2.4), 10.3, -8.6));
  scene.add(crowd(rowsOf(7.6, -7.15, 13.0, -7.15, 8, Math.PI)));
  for (const x of [7, 10, 13]) place(scene, acUnit(), x, -14.4, Math.PI);
}
// south: a lane of izakaya, the neon blocks and a store, the hotel; the ice sculptures along the front with lights
function south(scene, moving) {
  for (let i = 0; i < 3; i++) place(scene, izakaya(), -13.4 + i * 2.3, 10.4, 0, 1);
  place(scene, postBox(), -7.2, 12.2);
  place(scene, neonBuilding(), -2.4, 9.8, 0, 0.75); place(scene, neonBuilding(), 0.0, 9.8, 0, 0.65); place(scene, building(2), 3.0, 9.8, 0, 0.8);
  place(scene, building(2), 10.4, 9.6, 0, 0.85); place(scene, izakaya(), 13.4, 10.4); // (low on the south side, so the park shows over it)
  place(scene, vending(), 7.2, 11.4, 0, 0.9); place(scene, bench(), 8.6, 12.6);
  // the ice promenade along the front edge
  const tints = ['ice', 'iceBlue', 'icePink'];
  let n = 0;
  for (const x of [-13.5, -11.6, -9.6, -3.3, -1.2, 0.9, 3.0, 7.4, 9.6, 11.8, 13.8]) place(scene, iceSculpture(ICE_KINDS[n % 4], tints[n++ % 3]), x, 13.6, 0, 0.9);
  place(scene, iceWall(), -11.1, 12.3, 0, 0.9);
  for (const x of [-13.4, -11.1, -8.8]) { const ic = icicles(1.8, 12); ic.position.set(x, 1.5, 11.1); scene.add(ic); }
}
// along the roads: lamps on both sides, vertical signals at the corners
function streets(scene) {
  for (const z of ROADS_Z) for (let x = -13; x <= 13; x += 3.4) if (Math.abs(Math.abs(x) - R1) > 1.6) place(scene, streetLamp(), x, z + Math.sign(z) * 1.75, -Math.sign(z) * Math.PI / 2); // (on the side away from the park)
  for (const cx of ROADS_X) for (const cz of ROADS_Z) for (const [sx, sz, ry] of [[1, 1, 0], [-1, -1, Math.PI]]) place(scene, signal(), cx + sx * 1.35, cz + sz * 1.35, ry, 0.8);
}

export function town(scene) {
  const moving = [];
  board(scene); park(scene, moving); north(scene, moving); south(scene, moving); streets(scene);
  return { moving };
}

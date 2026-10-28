// Stilla Kaffe — the Nordic café (cafe/DESIGN.md §2, §2.5): a corner shop of white walls and pale oak on a cobbled
// street. Laptop people at the window bar, students at the long table, a reader on the sofa, a pair at a small table,
// baristas at the machine; outside, the rain comes and goes and people come in from it.
import * as THREE from 'three';
import { bakeStatic } from '../../airport/src/merge.js';
import { box } from '../../airport/src/parts.js';
import { createWorld, v3, LOOKS } from '../../koto/src/world.js';
import { Agent, FACE } from '../../koto/src/people.js';
import { cat } from '../../town/src/koto-props.js';
import { sedan, keiCar, bicycle, CAR_COLORS, KEI_COLORS } from '../../town/src/vehicles.js';
import { streetLight } from '../../town/src/gear.js';
import { streetTree } from '../../town/src/nature.js';
import { CAFE, M, GLOW, setGlow, shell, cutaway, counter, espressoMachine, grinder, pourOver, register, pastryCase, menuBoard, wallShelf, windowBar, stool, chair, roundTable, longTable, sofa, armchair, rug, lowTable, pendant, floorLamp, candle, stringLights, plant, bookshelf, door, awning, bladeSign, aFrame, umbrellaStand, coatRack, ceilingFan, recordPlayer } from './furniture.js';
import { cup, laptop, book, notebook, tablet, phone, plate, Steam } from './things.js';
import { Weather, Rain, Wet, puddles, WindowDrops } from './rain.js';
import { Ambience } from './sound.js';

const VIEWS = {
  all: ['全体', v3(19, 17, 23), v3(0, 0.8, 0.5)],
  window: ['窓の外から', v3(-2.6, 1.85, 8.6), v3(-2.6, 1.4, 3.9)],
  counter: ['カウンター', v3(1.4, 3.3, 1.2), v3(2.5, 1.1, -4.0)],
  table: ['相席テーブル', v3(-2.2, 4.4, 3.6), v3(-2.2, 0.6, 0.3)],
  sofa: ['ソファ', v3(-3.0, 2.2, 0.2), v3(-6.0, 0.7, -2.6)],
  street: ['通り', v3(11.5, 2.4, 13.5), v3(2, 1.8, 4.5)],
};
const world = createWorld({ views: VIEWS, shadow: 24, target: [0, 0, 1], look: 'day' });
const { scene, camera, life, people, steps } = world;
const heightAt = () => 0;
const lift = (seat) => seat - 0.26; // how far to raise a sitting figure above the floor for a seat this high

// ---------- the ground: cobbles, a pavement, the corner ----------
const wet = new Wet();
const cobbles = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#5a5d62'; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 8; r++) for (let k = 0; k < 9; k++) { x.fillStyle = `hsl(210, 4%, ${42 + ((r * 7 + k * 5) % 9) * 1.6}%)`; x.beginPath(); x.ellipse(k * 16 + (r % 2) * 8, r * 16 + 8, 7, 6.5, 0, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const flags = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#8f8b84'; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { x.fillStyle = `hsl(35, 5%, ${62 + ((r + k * 3) % 4) * 3}%)`; x.fillRect(k * 32 + 1, r * 32 + 1, 30, 30); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const paveM = wet.add(new THREE.MeshStandardMaterial({ map: flags, roughness: 0.9 }));
world.slab(-11, 13.5, -7, 15, () => 0, 1, 1, paveM);
flags.repeat.set(12, 11);
function roadStrip(w, d, x, z) { const t = cobbles.clone(); t.needsUpdate = true; t.repeat.set(w / 2.5, d / 2.5); const m = wet.add(new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })); const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m); r.position.set(x, 0.01, z); r.receiveShadow = true; scene.add(r); }
roadStrip(24.5, 5.2, 1.25, 11.3); // the street in front
roadStrip(4.2, 15.4, 11.4, 0.7); // the side street
const pud = puddles(scene, [[-6, 10.5, 1.1, 0.5], [3, 12.4, 1.4, 0.6], [11, 4, 0.6, 1.0], [-1, 7.1, 0.7, 0.3], [9.5, 7.6, 0.5, 0.4], [11.8, -3.5, 0.5, 0.9]], 0.02);

// ---------- the shop ----------
const T = 3.2; // ceiling
const shop = shell({ w: 14, d: 10, h: T, openings: { front: [[-6.4, -3.6, 'window'], [-3.2, -0.4, 'window'], [-0.1, 2.9, 'window'], [3.6, 4.7, 'door'], [5.1, 6.6, 'window']], right: [[-3.6, -0.6, 'window'], [0.1, 3.6, 'window']] } });
scene.add(shop);
const inside = new THREE.Group(); scene.add(inside);
const at = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; inside.add(o); return o; };
// the counter, the back bar with the machine, the pastry case, the menu and the shelves
const ctr = at(counter({ len: 4.5 }), 2.35, -2.9);
at(pastryCase({ len: 1.4 }), -0.6, -2.9);
const back = at(counter({ len: 4.6, depth: 0.55, front: CAFE.white }), 2.3, -4.6);
at(espressoMachine(), 2.5, -4.55, 0, back.userData.top);
at(grinder(), 1.4, -4.6, 0, back.userData.top);
at(pourOver(), 3.75, -4.6, 0, back.userData.top);
at(register(), 4.0, -2.75, 0, ctr.userData.top);
for (let k = 0; k < 3; k++) at(cup({ kind: k === 1 ? 'cappuccino' : 'latte', art: k ? 'leaf' : 'heart' }), 1.6 + k * 0.35, -2.7, 0, ctr.userData.top); // ready at the pick-up end
at(menuBoard({ title: 'Stilla kaffe', lines: ['ブレンド ............ 450', 'カフェラテ .......... 520', 'カプチーノ .......... 520', 'カルダモンロール ... 380'] }), 2.4, -4.86, 0, 2.15);
at(wallShelf({ len: 2.2 }), -1.1, -4.86, 0, 1.4);
at(box(1.1, 2.25, 0.08, M(CAFE.walnut)), -3.3, -4.95, 0, 1.125); // the kitchen door
at(box(1.5, 0.7, 0.45, M(CAFE.oak)), -5.4, -4.6, 0, 0.35); // a sideboard
const record = at(recordPlayer(), -5.6, -4.6, 0, 0.7); life.push(record);
at(plant({ kind: 'small' }), -4.9, -4.6, 0, 0.7);
// the window bar with its stools, the long table, the sofa corner, two small tables
const bar = at(windowBar({ len: 8.8 }), -1.8, 4.55);
const STOOLS = [-5.6, -4.25, -2.9, -1.55, -0.2, 1.15, 2.5];
for (const x of STOOLS) at(stool(), x, 4.0);
at(longTable({ len: 3.6 }), -2.2, 0.4);
const SEATS_T = [-3.5, -2.2, -0.9];
for (const x of SEATS_T) { at(chair({ kind: 'wishbone', color: CAFE.oak }), x, -0.35, -Math.PI / 2); at(chair({ kind: 'wishbone', color: CAFE.oak }), x, 1.15, Math.PI / 2); }
at(rug({ w: 2.8, d: 2.4 }), -5.4, -2.4);
at(sofa({ len: 2.0, color: 0x9aa89a }), -6.5, -2.4, Math.PI / 2);
at(armchair({ color: CAFE.terracotta }), -4.2, -3.7, -0.7);
at(lowTable(), -5.3, -2.4, Math.PI / 2);
at(floorLamp(), -6.5, -4.3);
at(bookshelf(), -6.82, 0.6, Math.PI / 2);
at(plant({ kind: 'fiddle' }), -6.4, 3.0);
at(plant({ kind: 'monstera' }), 6.4, -4.3);
const TWO = [[5.4, 2.6], [5.4, 0.2]];
for (const [x, z] of TWO) { at(roundTable(), x, z); at(chair({ color: CAFE.walnut }), x - 0.55, z, 0); at(chair({ color: CAFE.walnut }), x + 0.55, z, Math.PI); life.push(at(candle(), x + 0.12, z - 0.15, 0, 0.57)); }
for (const x of [-2.9, -1.5]) life.push(at(candle(), x, 0.4, 0, 0.58));
// the door, the umbrella stand, the coat rack
const dr = at(door(), 4.15, 4.95); life.push(dr);
at(umbrellaStand({ n: 4 }), 3.3, 4.35);
at(coatRack(), 5.2, 4.4);
// lights: pendants over the bar, the long table, the counter and the small tables; string lights in the window; a fan
for (const x of [-5.0, -2.6, -0.2, 2.2]) at(pendant({ kind: 'globe', drop: 1.35 }), x, 4.3, 0, T);
for (const x of [-3.4, -2.2, -1.0]) at(pendant({ kind: 'layered', drop: 1.25, color: CAFE.white }), x, 0.4, 0, T);
for (const x of [1.0, 2.4, 3.8]) at(pendant({ kind: 'cone', drop: 1.15, color: CAFE.sage }), x, -2.9, 0, T);
for (const [x, z] of TWO) at(pendant({ kind: 'globe', drop: 1.3 }), x, z, 0, T);
inside.add(stringLights([[-6.4, 2.7, 4.75], [-3.4, 2.75, 4.75], [-0.3, 2.7, 4.75], [2.8, 2.75, 4.75]], { sag: 0.12 }));
const fan = at(ceilingFan(), 1.5, 1.4, 0, T); life.push(fan);
at(plant({ kind: 'hanging' }), 0.9, 4.3, 0, T); at(plant({ kind: 'hanging' }), -6.2, -0.6, 0, T);
for (const x of [-6.0, 2.9]) at(plant({ kind: 'small' }), x, 4.62, 0, bar.userData.top);
// warm light in the room (no shadows: cheap), brighter as it gets darker outside
const lamps = [[-2.2, 2.0, 0.4], [-2.0, 2.0, 4.2], [2.4, 2.1, -2.9], [-5.6, 1.6, -3.4], [5.4, 2.0, 1.4]].map(([x, y, z]) => { const l = new THREE.PointLight(0xffc27a, 4, 9, 1.4); l.position.set(x, y, z); scene.add(l); return l; });

// ---------- outside: the awning, the signs, bikes, a lamp, a tree, the houses across the street ----------
const outside = new THREE.Group(); scene.add(outside);
const out = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; outside.add(o); return o; };
const aw = out(awning({ w: 11.4, depth: 1.3, a: 0x6f8a7a, b: CAFE.cream }), -0.9, 5.05, 0, 3.0);
out(bladeSign({ name: 'Stilla', sub: 'kaffe · bulle' }), 7.05, 5.05, 0, 3.2);
out(aFrame({ lines: ['きょうのおすすめ', 'カルダモンロール', '雨の日は', 'おかわり半額'] }), 2.1, 6.4, -0.3);
for (let k = 0; k < 3; k++) out(bicycle({ color: [0x9db59a, 0x2f3e57, 0xc9714a][k], role: null }), -4.6 + k * 0.9, 7.3, Math.PI / 2 + 0.1);
const lamp1 = out(streetLight({ height: 4.6, reach: 1.0 }), 8.4, 8.2, Math.PI);
out(streetTree({ seed: 7 }), -9.2, 7.6);
out(plant({ kind: 'small', s: 2.2 }), 3.25, 5.5); out(plant({ kind: 'small', s: 2.2 }), 5.05, 5.5);
const across = new THREE.Group(); scene.add(across); // the houses across the street: shown only from the street, not from above
const facade = (w, h, color, x, z, yaw = 0) => { // a house across the street: a wall with windows that glow at night
  const g = new THREE.Group();
  g.add(box(w, h, 1.0, M(color, { roughness: 0.95 }), 0, h / 2, 0));
  g.add(box(w + 0.2, 0.3, 1.2, M(0x3a3d42), 0, h + 0.15, 0));
  for (let r = 0; r < Math.floor(h / 2.4); r++) for (let k = 0; k < Math.floor(w / 1.8); k++) g.add(box(0.8, 1.2, 0.06, (r * 3 + k) % 4 === 1 ? GLOW.case : M(0x3a4a5a, { roughness: 0.2 }), -w / 2 + 0.9 + k * 1.8, 1.4 + r * 2.4, 0.52));
  g.add(box(1.0, 2.0, 0.06, M(CAFE.walnut), -w / 2 + 0.9, 1.0, 0.52));
  g.position.set(x, 0, z); g.rotation.y = yaw; across.add(g); return g;
};
facade(6, 7.4, 0xd9b26a, -7.6, 14.4, Math.PI); facade(5.5, 9.6, 0xb8665a, -1.8, 14.4, Math.PI); facade(6.5, 7.2, 0x9db5a8, 4.4, 14.4, Math.PI); facade(4.6, 8.4, 0xe8dcc6, 10, 14.4, Math.PI);
facade(12, 4.8, 0xc9b49a, -9.9, -1, Math.PI / 2); // the neighbour on the left, across a narrow alley
bakeStatic(inside); bakeStatic(outside); bakeStatic(across);

// ---------- things on the tables, steam over the hot drinks ----------
const steam = new Steam(scene);
const onTable = (o, x, z, yaw, y) => { at(o, x, z, yaw, y); if (o.userData.hot) steam.add(o); return o; };
const laptops = {};
const BT = bar.userData.top, TT = 0.58;
laptops.mac = onTable(laptop({ screen: 'code' }), -4.25, 4.55, Math.PI, BT); onTable(cup({ kind: 'latte', art: 'leaf' }), -3.85, 4.6, 0, BT);
laptops.call = onTable(laptop({ screen: 'call' }), -1.55, 4.55, Math.PI, BT); onTable(cup({ kind: 'mug', color: CAFE.sage }), -1.15, 4.62, 0, BT);
onTable(phone(), 1.0, 4.5, 0.4, BT); onTable(cup({ kind: 'iced' }), 1.4, 4.6, 0, BT); onTable(plate({ food: 'roll' }), 0.7, 4.65, 0, BT);
onTable(notebook(), -3.5, 0.1, 0, TT); onTable(book({ color: CAFE.navy }), -3.15, 0.15, 0.2, TT); onTable(cup({ kind: 'cappuccino' }), -3.9, 0.2, 0, TT);
onTable(notebook({ color: CAFE.rose }), -2.2, 0.1, -0.1, TT); onTable(cup({ kind: 'mug', color: CAFE.terracotta }), -1.85, 0.2, 0, TT);
onTable(tablet(), -0.9, 0.75, Math.PI, TT); onTable(cup({ kind: 'latte' }), -1.3, 0.65, 0, TT); onTable(plate({ food: 'cake' }), -0.5, 0.6, 0, TT);
onTable(cup({ kind: 'mug', color: CAFE.mustard }), -3.5, 0.7, 0, TT); onTable(cup({ kind: 'mug', color: 0x8a5a3a }), -2.2, 0.7, 0, TT); onTable(plate({ food: 'roll' }), -2.85, 0.65, 0, TT);
onTable(cup({ kind: 'latte' }), 5.2, 2.5, 0, TT); onTable(cup({ kind: 'cappuccino' }), 5.6, 2.7, 0, TT); onTable(plate({ food: 'cake' }), 5.4, 2.85, 0, TT);
onTable(cup({ kind: 'espresso' }), 5.25, 0.15, 0, TT); onTable(book({ color: 0xe8e2d4 }), 5.5, 0.25, Math.PI / 2, TT); // the newspaper (a big pale book)
onTable(cup({ kind: 'tea' }), -5.4, -2.3, 0, 0.36); onTable(book({ color: CAFE.terracotta, open: false }), -5.2, -2.6, 0.3, 0.36);

// ---------- people ----------
const agents = [];
const agent = (role, route, o = {}) => { const a = new Agent(scene, role, route, { heightAt, ...o }); people.push(a); agents.push(a); return a; };
// someone at a seat: a loop of what they do there (each a { do, dur })
const sitter = (role, x, z, face, seat, acts, phase = 0) => agent(role, [{ jump: [x, z] }, ...acts.map(([m, d]) => ({ do: m, dur: d, face, lift: lift(seat) }))], { phase });
const STOOL = 0.69, CHAIR = 0.38;
const mac = sitter('macWorker', -4.25, 4.02, FACE.down, STOOL, [['sitType', 14], ['sitSip', 4], ['sitType', 10], ['sitThink', 5], ['sitStretch', 3]]);
const call = sitter('callWorker', -1.55, 4.02, FACE.down, STOOL, [['sitChat', 8], ['sitType', 6], ['sitSip', 4], ['sitChat', 9]], 1);
sitter('regular', 1.15, 4.02, FACE.down, STOOL, [['sitThink', 9], ['sitSip', 5], ['sitChat', 6]], 2);
sitter('studentA', -3.5, -0.38, FACE.down, CHAIR, [['sitWrite', 12], ['sitThink', 5], ['sitRead', 8], ['sitStretch', 3], ['sitWrite', 9]], 3);
sitter('studentB', -2.2, -0.38, FACE.down, CHAIR, [['sitWrite', 15], ['sitSip', 4], ['sitRead', 10]], 4);
sitter('designer', -0.9, 1.18, FACE.up, CHAIR, [['sitWrite', 10], ['sitThink', 4], ['sitSip', 4]], 5);
sitter('parent', -3.5, 1.18, FACE.up, CHAIR, [['sitChat', 8], ['sitSip', 5]], 6);
sitter('rainKid', -2.2, 1.18, FACE.up, CHAIR * 1.25, [['sitChat', 6], ['sitThink', 4]], 7);
sitter('reader', -6.35, -2.2, FACE.east, 0.38, [['sitRead', 16], ['sitSip', 4], ['sitThink', 5]], 8);
sitter('chatA', 4.86, 2.6, FACE.east, CHAIR, [['sitChat', 7], ['sitSip', 4], ['sitChat', 9]], 9);
sitter('chatB', 5.94, 2.6, FACE.west, CHAIR, [['sitChat', 6], ['sitSip', 5]], 10);
sitter('oldman', 5.94, 0.2, FACE.west, CHAIR, [['sitRead', 14], ['sitSip', 4]], 11);
// the baristas: espresso and milk, the register, wiping; pour-over, the cake case, clearing the small tables
agent('barista', [{ jump: [3.95, -3.6] }, { do: 'idle', dur: 4, face: FACE.down }, { to: [2.5, -3.95] }, { do: 'pour', dur: 6, face: FACE.up }, { to: [1.9, -3.55] }, { do: 'idle', dur: 2, face: FACE.down }, { do: 'wipe', dur: 3.5, face: FACE.down }]);
agent('barista2', [{ jump: [3.75, -3.95] }, { do: 'pour', dur: 8, face: FACE.up }, { to: [-0.6, -3.6] }, { do: 'hold', dur: 2.5, face: FACE.down }, { to: [-1.7, -3.7] }, { to: [-1.7, -1.8] }, { to: [4.7, 1.5] }, { do: 'wipe', dur: 4, face: FACE.east }, { to: [-1.7, -1.8] }, { to: [-1.7, -3.7] }, { to: [3.75, -3.95] }]);
// people coming in from the rain: along the pavement, in at the door (the bell), the umbrella in the stand,
// order, wait, sit at the bar a while, and back out into the street
const weather = new Weather({ start: 'drizzle' });
const sound = new Ambience();
let doorT = 0;
const ring = () => { doorT = 1.6; sound.bell(); };
function comer(role, stoolX, delay) {
  const a = agent(role, [
    { jump: [-10.5, 6.6] }, { to: [4.15, 6.3] }, { call: ring }, { to: [4.15, 4.3] },
    { call: () => (a.p.userData.indoors = true) }, { to: [3.45, 4.0] }, { do: 'hold', dur: 1.4, face: FACE.down },
    { to: [3.6, -1.9] }, { do: 'idle', dur: 4.5, face: FACE.up }, { to: [1.9, -2.0] }, { do: 'idle', dur: 3, face: FACE.up },
    { to: [stoolX, 3.3] }, { to: [stoolX, 4.02] }, { do: 'sitSip', dur: 30, face: FACE.down, lift: lift(STOOL) }, { do: 'sitThink', dur: 12, face: FACE.down, lift: lift(STOOL) },
    { to: [stoolX, 3.3] }, { to: [4.15, 4.3] }, { call: ring }, { to: [4.15, 6.3] }, { call: () => (a.p.userData.indoors = false) }, { to: [13.4, 6.4] }, { hide: 20 + delay },
  ], { delay, speed: 0.9, onStep: (s) => s.call?.() });
  return a;
}
comer('rainComer', -2.9, 4); comer('chatB', -0.2, 40);
// passers-by on the pavement and across the street
const passers = [['rainComer', -10.5, 7.9, 13, 7.9, 0], ['tourist', 13, 8.2, -10.5, 8.2, 12], ['business', 10.5, -6.5, 10.5, 13, 6], ['woman', 12.4, 13, 12.4, -6.5, 20]].map(([r, x0, z0, x1, z1, d]) => agent(r, [{ jump: [x0, z0] }, { to: [x1, z1] }, { hide: 6 }], { delay: d, speed: 0.95 }));
// the café cat, asleep at the end of the window bar
const kitty = cat({ color: 0xe8a050, mode: 'sleep' }); kitty.position.set(-6.0, BT, 4.5); kitty.rotation.y = 0.4; scene.add(kitty); life.push(kitty);
// cars along the street
const cars = [[sedan({ color: CAR_COLORS[2] }), 1, 10.2], [keiCar({ color: KEI_COLORS[0] }), -1, 12.4], [sedan({ color: CAR_COLORS[0] }), -1, 12.4]].map(([c, dir, z], i) => { c.userData.dir = dir; c.userData.x = -8 + i * 9; c.position.z = z; c.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(c); return c; });

// ---------- rain ----------
const rain = new Rain(scene, { zones: [[-11, 13.5, 6.4, 15, 0], [7.2, 13.5, -7, 6.4, 0], [-11, -9.4, -7, 6.4, 0]], top: 9, count: 3200 });
rain.dripLine([-6.5, 2.2, 6.2], [4.7, 2.2, 6.2], 0, 18);
shop.updateMatrixWorld(true);
const panes = [];
for (const side of ['front', 'right']) { const wg = shop.userData.walls[side]; for (const p of wg.userData.panes) { const c = new THREE.Vector3((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0); wg.localToWorld(c); panes.push({ center: c, normal: wg.userData.normal.clone(), w: p.x1 - p.x0, h: p.y1 - p.y0 }); } }
const drops = new WindowDrops(scene, panes);

// ---------- the panel: weather, the drifting camera, the sound ----------
const $ = (id) => document.getElementById(id);
const WJA = { clear: '晴れ', cloudy: 'くもり', drizzle: '小雨', rain: '本降り', after: '雨上がり' };
for (const b of $('weather').children) b.onclick = () => { weather.hold(b.dataset.v); [...$('weather').children].forEach((x) => x.classList.toggle('on', x === b)); };
let drift = false, driftT = 0, driftI = 0;
const DRIFT = [[[-2.6, 1.7, 8.0], [-2.6, 1.3, 4.0]], [[-0.6, 2.0, 2.6], [-2.6, 0.7, 0.1]], [[-3.6, 1.8, -0.4], [-6.2, 0.7, -2.6]], [[2.8, 2.2, -0.6], [2.6, 1.1, -4.2]], [[3.2, 1.8, 1.5], [5.6, 0.7, 2.5]], [[10, 2.6, 11.5], [0, 1.8, 4.6]]];
$('drift').onclick = () => { drift = !drift; driftT = 0; $('drift').classList.toggle('on', drift); };
$('sound').onclick = () => { const on = sound.toggle(); $('sound').textContent = on ? '音 · ON' : '音 · OFF'; $('sound').classList.toggle('on', on); };
const sky = new THREE.Color(), grey = new THREE.Color('#8f98a3');
let uiT = 0;
steps.push((t, dt) => {
  weather.update(dt);
  const r = weather.rain, look = world.look, L = LOOKS[look];
  // light: clouds dim the sun, darkness (night, clouds, rain) brings up the lamps inside
  const dim = 1 - 0.5 * weather.cloud;
  world.hemi.intensity = L.hemi[0] * (0.6 + 0.4 * dim); world.sun.intensity = L.sun[0] * dim;
  sky.set(L.sky ?? '#e8eef2').lerp(grey, look === 'night' ? 0.15 : weather.cloud * 0.55); scene.background.copy(sky);
  const dark = Math.min(1, { morning: 0.25, day: 0, dusk: 0.6, night: 1 }[look] + weather.cloud * 0.35);
  setGlow(dark); lamps.forEach((l) => (l.intensity = 3 + dark * 14));
  lamp1.userData.setNight?.(dark > 0.5);
  rain.update(t, dt, r); drops.update(dt, r); wet.update(weather.wet); pud.update(weather.wet);
  steam.update(t, dt);
  sound.update(dt, r);
  // the door swings while someone passes; umbrellas open in the rain
  doorT = Math.max(0, doorT - dt); dr.userData.open = doorT > 0 ? 1 : 0;
  for (const a of agents) a.p.userData.umbrella = !a.p.userData.indoors && r > 0.15;
  laptops.mac.userData.typing = mac.p.userData.mode === 'sitType'; laptops.call.userData.typing = call.p.userData.mode === 'sitType';
  laptops.mac.userData.update(t, dt);
  for (const c of cars) { const ud = c.userData; ud.speed = 3.5; ud.x += ud.dir * ud.speed * dt; if (ud.x > 16) ud.x = -14; if (ud.x < -14) ud.x = 16; c.position.x = ud.x; c.visible = ud.x > -10.8 && ud.x < 13.2; ud.update(dt); }
  // the drifting camera: a slow glide from seat to seat
  if (drift && ((driftT -= dt) <= 0)) { driftT = 14; const [p, q] = DRIFT[driftI++ % DRIFT.length]; world.cam(v3(...p), v3(...q), 7); }
  cutaway(shop, camera);
  across.visible = camera.position.y < 6.5;
  if ((uiT -= dt) <= 0) { uiT = 0.5; $('weatherLine').textContent = `いまの天気：${WJA[weather.state]}${weather.mode === 'auto' ? '（自動で移り変わります）' : ''}`; }
});
world.start();
window.__cafe = { weather, rain, steam, shop, sound };

// Stilla Kaffe — the Nordic café (cafe/DESIGN.md §2, §2.5): a big corner shop of white walls and pale oak on a cobbled
// street. A long counter with a pastry case, the register and a pick-up end; a wall of beans and tumblers for sale;
// laptop people at the window bar, students at the long table, readers on the sofa, pairs at small tables; people in
// and out all day, most of them taking their coffee away. Outside: birches, a spruce and a rowan, hedges, flower
// beds and planters, a little garden at the back; the rain comes and goes.
import * as THREE from 'three';
import { bakeStatic } from '../../airport/src/merge.js';
import { box } from '../../airport/src/parts.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { createWorld, v3, LOOKS } from '../../koto/src/world.js';
import { Agent, FACE } from '../../koto/src/people.js';
import { cat } from '../../town/src/koto-props.js';
import { sedan, keiCar, bicycle, CAR_COLORS, KEI_COLORS } from '../../town/src/vehicles.js';
import { streetLight } from '../../town/src/gear.js';
import { streetTree } from '../../town/src/nature.js';
import { CAFE, M, GLOW, setGlow, shell, cutaway, counter, espressoMachine, grinder, pourOver, register, pastryCase, menuBoard, merchWall, merchTable, pickupSign, condimentBar, windowBar, stool, chair, roundTable, longTable, sofa, rug, lowTable, pendant, floorLamp, candle, stringLights, plant, bookshelf, door, bladeSign, aFrame, umbrellaStand, coatRack, ceilingFan, recordPlayer } from './furniture.js';
import { birch, spruce, rowan, lilac, planter, windowBox, flowerBed, hedge, ivy, bench, topiary } from './garden.js';
import { cup, laptop, book, notebook, tablet, phone, plate, sketchbook, Steam } from './things.js';
import { minaStory, holdWeather } from './mina.js';
import { Weather, Rain, Wet, puddles, WindowDrops } from './rain.js';
import { Ambience } from './sound.js';

const VIEWS = {
  all: [['全体', 'Overview'], v3(22, 20, 27), v3(-1.5, 0.8, 0)],
  window: [['窓の外から', 'From the window'], v3(-2.6, 1.85, 8.6), v3(-2.6, 1.4, 3.9)],
  counter: [['カウンター', 'Counter'], v3(1.6, 3.2, 0.2), v3(1.0, 1.1, -5.4)],
  shelves: [['豆とタンブラー', 'Beans & tumblers'], v3(-5.6, 2.3, -1.2), v3(-10.4, 1.1, -4.2)],
  table: [['相席テーブル', 'Shared table'], v3(-2.2, 4.4, 3.6), v3(-2.2, 0.6, 0.3)],
  sofa: [['ソファ', 'Sofa'], v3(-6.4, 2.2, 0.6), v3(-9.0, 0.7, 4.0)],
  street: [['通り', 'Street'], v3(11.5, 2.4, 13.5), v3(2, 1.8, 4.5)],
  garden: [['裏庭', 'Back garden'], v3(-4, 6.5, -18), v3(-3, 0.5, -8.5)],
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
world.slab(-16, 13.5, -11, 15, () => 0, 1, 1, paveM);
flags.repeat.set(15, 13);
function roadStrip(w, d, x, z) { const t = cobbles.clone(); t.needsUpdate = true; t.repeat.set(w / 2.5, d / 2.5); const m = wet.add(new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })); const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m); r.position.set(x, 0.01, z); r.receiveShadow = true; scene.add(r); }
roadStrip(29.5, 5.2, -1.25, 11.3); // the street in front
roadStrip(4.2, 19.6, 11.4, -1.2); // the side street
const pud = puddles(scene, [[-6, 10.5, 1.1, 0.5], [3, 12.4, 1.4, 0.6], [11, 4, 0.6, 1.0], [-1, 7.1, 0.7, 0.3], [9.5, 7.6, 0.5, 0.4], [11.8, -3.5, 0.5, 0.9], [-13, 10.8, 1.0, 0.5], [11.6, -9, 0.5, 0.8]], 0.02);

// ---------- the shop ----------
const T = 3.2; // ceiling
// 18 × 12, from x −11 to 7 and z −7 to 5 (the front and the right-hand side where they always were; it grew to the
// left and to the back). Openings are given in the shell's own coordinates: x + 2, z + 1.
const shop = shell({ w: 18, d: 12, h: T, openings: {
  front: [[-8.4, -5.0, 'window'], [-4.4, -1.6, 'window'], [-1.2, 1.6, 'window'], [1.9, 4.9, 'window'], [5.6, 6.7, 'door'], [7.1, 8.6, 'window']],
  right: [[-5.2, -3.4, 'window'], [-2.6, 0.4, 'window'], [1.1, 4.6, 'window']],
  left: [[0.5, 3.5, 'window']],
  back: [[-7.8, -3.0, 'window']],
} });
shop.position.set(-2, 0, -1);
scene.add(shop);
const inside = new THREE.Group(); scene.add(inside);
const at = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; inside.add(o); return o; };
// the counter along the back: the pick-up end, the pastry case, the register; behind it the bar with two machines,
// grinders and the pour-over, three menus over it, the kitchen door at the end
const ctrA = at(counter({ len: 3.0 }), -1.5, -4.0), ctrB = at(counter({ len: 2.6 }), 3.1, -4.0);
at(pastryCase({ len: 1.8 }), 0.9, -4.0);
const back = at(counter({ len: 7.4, depth: 0.55, front: CAFE.white }), 0.7, -6.45);
at(espressoMachine(), 2.7, -6.4, 0, back.userData.top); at(espressoMachine(), 0.4, -6.4, 0, back.userData.top);
at(grinder(), 1.6, -6.45, 0, back.userData.top); at(grinder(), -0.6, -6.45, 0, back.userData.top);
at(pourOver(), -2.1, -6.45, 0, back.userData.top);
at(register(), 3.6, -3.85, 0, ctrB.userData.top); at(register(), 2.5, -3.85, 0, ctrB.userData.top);
for (let k = 0; k < 5; k++) at(cup({ kind: k % 2 ? 'cappuccino' : 'latte', art: k % 3 ? 'leaf' : 'heart' }), -2.7 + k * 0.32, -3.8, 0, ctrA.userData.top); // ready at the pick-up end
at(pickupSign(), -1.8, -4.0, 0, 2.5);
at(menuBoard({ title: 'Kaffe', lines: ['ブレンド ............ 450', 'カフェラテ .......... 520', 'カプチーノ .......... 520', 'フラットホワイト .... 540'] }), -1.6, -6.86, 0, 2.2);
at(menuBoard({ title: 'Fika', lines: ['カルダモンロール ... 380', 'シナモンロール ..... 360', 'ブルーベリータルト . 480', 'ライ麦サンド ....... 620'] }), 0.7, -6.86, 0, 2.2);
at(menuBoard({ title: 'Te & mer', lines: ['ルイボスティー ...... 480', 'ホットチョコ ........ 500', 'きょうの豆 ...... 1,600', 'タンブラー ...... 2,800'] }), 3.0, -6.86, 0, 2.2);
at(box(1.1, 2.25, 0.08, M(CAFE.walnut)), 5.6, -6.95, 0, 1.125); // the kitchen door
// beans and tumblers for sale: a wall of shelves on the left, a table of them in front, milk and sugar by the pick-up
at(merchWall({ len: 3.6 }), -10.78, -4.2, Math.PI / 2);
at(merchTable(), -7.6, -4.6);
at(condimentBar(), -3.9, -4.3);
at(box(1.5, 0.7, 0.45, M(CAFE.oak)), -9.6, -6.7, 0, 0.35); // a sideboard under the back window
const record = at(recordPlayer(), -9.8, -6.7, 0, 0.7); life.push(record);
at(plant({ kind: 'small' }), -9.1, -6.7, 0, 0.7);
// the window bar with its stools, the long table, the sofa corner, two small tables
const bar = at(windowBar({ len: 8.8 }), -1.8, 4.55);
const STOOLS = [-5.6, -4.25, -2.9, -1.55, -0.2, 1.15, 2.5];
for (const x of STOOLS) at(stool(), x, 4.0);
at(longTable({ len: 3.6 }), -2.2, 0.4);
const SEATS_T = [-3.5, -2.2, -0.9];
for (const x of SEATS_T) { at(chair({ kind: 'wishbone', color: CAFE.oak }), x, -0.35, -Math.PI / 2); at(chair({ kind: 'wishbone', color: CAFE.oak }), x, 1.15, Math.PI / 2); }
// the sofa corner at the front left, under its own window
at(rug({ w: 3.0, d: 2.2 }), -8.8, 3.3);
at(sofa({ len: 2.4, color: 0x9aa89a }), -8.8, 4.35, Math.PI);
at(lowTable(), -8.8, 3.3);
at(floorLamp(), -10.5, 4.4);
at(bookshelf(), -10.8, 1.2, Math.PI / 2);
at(plant({ kind: 'fiddle' }), -10.4, -1.2);
at(plant({ kind: 'monstera' }), 6.4, -4.6); at(plant({ kind: 'monstera' }), -4.9, -6.6);
const TWO = [[5.4, 2.6], [5.4, 0.2], [-7.6, -1.6], [-7.6, 0.8]];
for (const [x, z] of TWO) { at(roundTable(), x, z); at(chair({ color: CAFE.walnut }), x - 0.55, z, 0); at(chair({ color: CAFE.walnut }), x + 0.55, z, Math.PI); life.push(at(candle(), x + 0.12, z - 0.15, 0, 0.57)); }
for (const x of [-2.9, -1.5]) life.push(at(candle(), x, 0.4, 0, 0.58));
// the door, the umbrella stand, the coat rack
const dr = at(door(), 4.15, 4.95); life.push(dr);
at(umbrellaStand({ n: 4 }), 3.3, 4.35);
at(coatRack(), 5.2, 4.4);
// lights: pendants over the bar, the long table, the counter and the small tables; string lights in the window; a fan
for (const x of [-5.0, -2.6, -0.2, 2.2]) at(pendant({ kind: 'globe', drop: 1.35 }), x, 4.3, 0, T);
for (const x of [-3.4, -2.2, -1.0]) at(pendant({ kind: 'layered', drop: 1.25, color: CAFE.white }), x, 0.4, 0, T);
for (const x of [-2.4, -0.6, 1.2, 3.0, 4.2]) at(pendant({ kind: 'cone', drop: 1.15, color: CAFE.sage }), x, -4.0, 0, T);
for (const x of [-9.4, -8.2]) at(pendant({ kind: 'layered', drop: 1.2, color: CAFE.white }), x, 3.2, 0, T);
at(pendant({ kind: 'globe', drop: 1.0 }), -7.6, -4.6, 0, T);
for (const [x, z] of TWO) at(pendant({ kind: 'globe', drop: 1.3 }), x, z, 0, T);
inside.add(stringLights([[-6.4, 2.7, 4.75], [-3.4, 2.75, 4.75], [-0.3, 2.7, 4.75], [2.8, 2.75, 4.75]], { sag: 0.12 }));
const fan = at(ceilingFan(), 1.5, 1.4, 0, T); life.push(fan);
at(plant({ kind: 'hanging' }), 0.9, 4.3, 0, T); at(plant({ kind: 'hanging' }), -6.2, -0.6, 0, T); at(plant({ kind: 'hanging' }), -10.2, 3.0, 0, T); at(plant({ kind: 'hanging' }), 6.2, -2.0, 0, T);
for (const x of [-6.0, 2.9]) at(plant({ kind: 'small' }), x, 4.62, 0, bar.userData.top);
// warm light in the room (no shadows: cheap), brighter as it gets darker outside
const lamps = [[-2.2, 2.0, 0.4], [-2.0, 2.0, 4.2], [1.0, 2.1, -4.6], [-8.8, 1.6, 3.0], [5.4, 2.0, 1.4], [-8.4, 2.0, -3.6], [-7.6, 2.0, -0.4]].map(([x, y, z]) => { const l = new THREE.PointLight(0xffc27a, 4, 9, 1.4); l.position.set(x, y, z); scene.add(l); return l; });

// ---------- outside: the signs, bikes, a lamp, trees and flowers, the gardens, the houses across the street ----------
const outside = new THREE.Group(); scene.add(outside);
const out = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; outside.add(o); return o; };
out(bladeSign({ name: 'Stilla', sub: 'kaffe · bulle' }), 7.05, 5.05, 0, 3.2);
out(aFrame({ lines: ['きょうのおすすめ', 'カルダモンロール', '雨の日は', 'おかわり半額'] }), 2.1, 6.4, -0.3);
for (let k = 0; k < 3; k++) out(bicycle({ color: [0x9db59a, 0x2f3e57, 0xc9714a][k], role: null }), -4.6 + k * 0.9, 7.3, Math.PI / 2 + 0.1);
const lamp1 = out(streetLight({ height: 4.6, reach: 1.0 }), 8.4, 8.2, Math.PI);
out(streetTree({ seed: 7 }), -9.2, 7.6); out(birch({ seed: 3, h: 6 }), -14.6, 7.8);
out(topiary(), 3.25, 5.55); out(topiary(), 5.05, 5.55); // either side of the door
// along the front: window boxes under the sills, planters at the kerb (lavender, flowers, grasses, a low hedge)
for (const [x0, x1] of [[-10.4, -7.0], [-6.4, -3.6], [-3.2, -0.4], [-0.1, 2.9], [5.1, 6.6]]) out(windowBox({ len: x1 - x0 - 0.2, colors: x0 < -5 ? ['#e2a9a0', '#f6f1e6', '#d2402e'] : ['#f2c94c', '#f6f1e6', '#b48ad0'] }), (x0 + x1) / 2, 5.22, 0, 0.56);
out(planter({ len: 2.2, kind: 'lavender', seed: 2 }), -12.6, 8.4); out(planter({ len: 1.8, kind: 'flowers', seed: 4 }), -6.8, 8.4);
out(planter({ len: 1.8, kind: 'grass', seed: 6 }), -0.2, 8.4); out(planter({ len: 1.6, kind: 'hedge' }), 5.6, 8.4);
out(planter({ len: 1.2, kind: 'flowers', seed: 9, wood: CAFE.walnut }), 8.3, 6.2, Math.PI / 2);
// down the side street: hedged planters against the wall, ivy on the corner
for (const z of [-9, -6.4, -3.8]) out(planter({ len: 1.6, kind: 'hedge', wood: CAFE.walnut }), 8.6, z, Math.PI / 2);
// the little garden at the back: grass, a spruce, birches, a rowan, a lilac, a bed of flowers, two benches, a hedge
const lawnM = new THREE.MeshStandardMaterial({ color: 0x7fa65a, roughness: 1 });
const lawn = (x0, x1, z0, z1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), lawnM); m.position.set((x0 + x1) / 2, 0.015, (z0 + z1) / 2); m.receiveShadow = true; outside.add(m); };
lawn(-16, 7.2, -11, -7.2); lawn(-16, -11.2, -7.2, 5.3);
out(hedge({ len: 23, h: 0.9 }), -4.4, -10.6);
out(spruce({ seed: 1, h: 6.5 }), -14.4, -9.4); out(spruce({ seed: 2, h: 4.8 }), 5.8, -9.8);
out(birch({ seed: 1, h: 5.8 }), -9.4, -9.6); out(birch({ seed: 2, h: 5.0 }), -7.6, -8.4); out(birch({ seed: 4, h: 6.2 }), -14.2, -3.6); out(birch({ seed: 5, h: 5.2 }), -13.0, 1.2);
out(rowan({ seed: 1 }), 2.2, -9.4); out(lilac({ seed: 1 }), -12.4, -6.0); out(lilac({ seed: 2, color: '#e6b0c8' }), 4.6, -8.2);
out(flowerBed({ w: 3.2, d: 1.2, colors: ['#e2a9a0', '#f2c94c', '#f6f1e6', '#d2402e'], seed: 5 }), -2.6, -9.2);
out(flowerBed({ w: 2.0, d: 1.2, colors: ['#b48ad0', '#f6f1e6', '#7fb6c4'], seed: 8 }), -14.2, 3.6);
out(bench(), -5.0, -9.6); out(bench(), -12.3, -1.6, Math.PI / 2);
// ivy grows on the walls themselves (in each wall's own coordinates, on its outer face), so it hides with them
for (const [side, x, w, h, seed] of [['back', 5.2, 3.4, 2.8, 5], ['left', 0, 2.4, 2.4, 9], ['right', 0.75, 0.65, 2.9, 3]]) {
  const v = ivy({ w, h, seed }); v.position.set(x, 0, -0.12); v.rotation.y = Math.PI; bakeStatic(v); shop.userData.walls[side].add(v);
}
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
onTable(cup({ kind: 'tea' }), -9.1, 3.3, 0, 0.36); onTable(book({ color: CAFE.terracotta, open: false }), -8.5, 3.2, 0.3, 0.36); onTable(cup({ kind: 'latte', art: 'heart' }), -8.4, 3.45, 0, 0.36);
onTable(cup({ kind: 'cappuccino' }), -7.8, -1.6, 0, TT); onTable(book({ color: CAFE.sage }), -7.5, -1.5, 0.4, TT); // the small tables on the left
onTable(laptop({ screen: 'code' }), -7.4, 0.8, Math.PI / 2, TT); onTable(cup({ kind: 'iced' }), -7.8, 0.65, 0, TT); onTable(plate({ food: 'cake' }), -7.8, 0.95, 0, TT);

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
sitter('reader', -9.4, 4.2, FACE.up, 0.38, [['sitRead', 16], ['sitSip', 4], ['sitThink', 5]], 8);
sitter('designer', -8.2, 4.2, FACE.up, 0.38, [['sitChat', 7], ['sitSip', 5], ['sitThink', 6]], 12);
sitter('parent', -8.14, -1.6, FACE.east, CHAIR, [['sitRead', 12], ['sitSip', 5]], 13);
sitter('studentB', -7.06, 0.8, FACE.west, CHAIR, [['sitType', 14], ['sitSip', 4], ['sitThink', 6]], 14);
sitter('chatA', -8.14, 0.8, FACE.east, CHAIR, [['sitChat', 9], ['sitSip', 5]], 15);
sitter('chatA', 4.86, 2.6, FACE.east, CHAIR, [['sitChat', 7], ['sitSip', 4], ['sitChat', 9]], 9);
sitter('chatB', 5.94, 2.6, FACE.west, CHAIR, [['sitChat', 6], ['sitSip', 5]], 10);
sitter('oldman', 5.94, 0.2, FACE.west, CHAIR, [['sitRead', 14], ['sitSip', 4]], 11);
// three baristas behind the long counter: one at the register, one on the machines handing drinks out at the pick-up
// end, one at the pastry case who comes round to clear the tables
agent('barista', [{ jump: [3.6, -4.75] }, { do: 'idle', dur: 5, face: FACE.down }, { to: [2.6, -5.75] }, { do: 'pour', dur: 5, face: FACE.up }, { to: [3.6, -4.75] }, { do: 'idle', dur: 4, face: FACE.down }, { to: [2.5, -4.75] }, { do: 'wipe', dur: 3, face: FACE.down }]);
agent('barista2', [{ jump: [0.4, -5.75] }, { do: 'pour', dur: 7, face: FACE.up }, { to: [-1.6, -4.75] }, { do: 'hold', dur: 2.5, face: FACE.down }, { to: [-2.1, -5.75] }, { do: 'pour', dur: 5, face: FACE.up }, { to: [-1.6, -4.75] }, { do: 'hold', dur: 2, face: FACE.down }, { to: [0.4, -5.75] }]);
agent('barista2', [{ jump: [0.9, -4.75] }, { do: 'hold', dur: 4, face: FACE.down }, { to: [5.2, -5.0] }, { to: [5.2, -2.6] }, { to: [4.7, 1.5] }, { do: 'wipe', dur: 4, face: FACE.east }, { to: [0.3, -1.9] }, { to: [-4.6, -2.4] }, { to: [-6.6, -0.4] }, { do: 'wipe', dur: 3, face: FACE.west }, { to: [-4.6, -2.4] }, { to: [5.2, -2.6] }, { to: [5.2, -5.0] }, { to: [0.9, -4.75] }], { phase: 2 });
// people coming in from the rain: along the pavement, in at the door (the bell), the umbrella in the stand,
// order, wait, sit at the bar a while, and back out into the street
// order at the register, wait at the pick-up end
const ORDER = (dur) => [{ to: [3.6, -3.3] }, { do: 'idle', dur, face: FACE.up }, { to: [-1.6, -3.3] }, { do: 'idle', dur: 3, face: FACE.up }];
const weather = new Weather({ start: 'drizzle' });
const sound = new Ambience();
let doorT = 0;
const ring = () => { doorT = 1.6; sound.bell(); };
function comer(role, stoolX, delay) {
  const a = agent(role, [
    { jump: [-15.5, 6.6] }, { to: [4.15, 6.3] }, { call: ring }, { to: [4.15, 4.3] },
    { call: () => (a.p.userData.indoors = true) }, { to: [3.45, 4.0] }, { do: 'hold', dur: 1.4, face: FACE.down },
    ...ORDER(4.5),
    { to: [0.3, -1.9] }, { to: [0.3, 3.3] }, { to: [stoolX, 3.3] }, { to: [stoolX, 4.02] }, { do: 'sitSip', dur: 30, face: FACE.down, lift: lift(STOOL) }, { do: 'sitThink', dur: 12, face: FACE.down, lift: lift(STOOL) },
    { to: [stoolX, 3.3] }, { to: [4.15, 4.3] }, { call: ring }, { to: [4.15, 6.3] }, { call: () => (a.p.userData.indoors = false) }, { to: [13.4, 6.4] }, { hide: 20 + delay },
  ], { delay, speed: 0.9, onStep: (s) => s.call?.() });
  return a;
}
comer('rainComer', -2.9, 4); comer('chatB', -0.2, 40);
// and people who take their coffee away: in, order, wait at the pick-up end, out with a cup; from either end of the street
function togo(role, delay, fromLeft) {
  const x0 = fromLeft ? -15.5 : 13.4, z0 = fromLeft ? 6.6 : 6.4, a = agent(role, [
    { jump: [x0, z0] }, { to: [4.15, 6.3] }, { call: ring }, { to: [4.15, 4.3] }, { call: () => (a.p.userData.indoors = true) },
    ...ORDER(3.5), { swap: role + 'Cup' },
    { to: [3.0, -1.8] }, { to: [4.15, 4.3] }, { call: ring }, { to: [4.15, 6.3] }, { call: () => (a.p.userData.indoors = false) },
    { to: [fromLeft ? 13.4 : -15.5, fromLeft ? 6.4 : 6.6] }, { hide: 30 + delay * 0.5 }, { swap: role },
  ], { delay, speed: 1.0, onStep: (s) => s.call?.() });
  return a;
}
togo('togoA', 10, true); togo('togoB', 22, false); togo('togoC', 34, true); togo('togoD', 47, false); togo('togoE', 60, true);
// passers-by on the pavement and across the street
const passers = [['rainComer', -15.5, 7.6, 13, 7.6, 0], ['tourist', 13, 7.9, -15.5, 7.9, 12], ['business', 10.5, -10.5, 10.5, 13, 6], ['woman', 12.4, 13, 12.4, -10.5, 20]].map(([r, x0, z0, x1, z1, d]) => agent(r, [{ jump: [x0, z0] }, { to: [x1, z1] }, { hide: 6 }], { delay: d, speed: 0.95 }));
// the café cat, asleep at the end of the window bar
const kitty = cat({ color: 0xe8a050, mode: 'sleep' }); kitty.position.set(-6.0, BT, 4.5); kitty.rotation.y = 0.4; scene.add(kitty); life.push(kitty);
// ---------- the story, chapter 1 (DESIGN.md §12): Mina comes in out of the drizzle, sketches the street from the
// window bar, the cat climbs into her lap, the rain stops and she goes on her way ----------
const SEAT = -5.6, me = () => tale.actors()[0].p.userData;
const mPlate = onTable(plate({ food: 'roll' }), SEAT + 0.32, 4.62, 0, BT), mBook = onTable(sketchbook({ page: 1 }), SEAT - 0.05, 4.5, Math.PI, BT);
mPlate.visible = mBook.visible = false;
let catWalk = null;
function catTo(x, y, z, mode, dur = 2.2) { // the cat strolls (or hops) from where it is to (x, y, z), then settles
  const p0 = kitty.position.clone(), p1 = new THREE.Vector3(x, y, z); let t = 0;
  kitty.userData.mode = 'walk'; kitty.rotation.y = Math.atan2(-(z - p0.z), x - p0.x);
  catWalk = (dt) => { t = Math.min(1, t + dt / dur); kitty.position.lerpVectors(p0, p1, t); kitty.position.y += Math.sin(t * Math.PI) * 0.25; if (t === 1) { kitty.userData.mode = mode; catWalk = null; } };
}
const sit = (m, dur, extra = {}) => ({ do: m, dur, face: FACE.down, lift: lift(STOOL), ...extra });
const tale = minaStory(world, {
  no: 1, heightAt,
  setup: () => { holdWeather(weather, 'drizzle'); world.setLook('morning'); mPlate.visible = mBook.visible = false; mBook.userData.page(1); kitty.position.set(-6.0, BT, 4.5); kitty.rotation.y = 0.4; kitty.userData.mode = 'sleep'; catWalk = null; },
  route: [
    { jump: [-15.5, 6.6], say: ['朝の小雨。スケッチブックを鞄に入れて、ミナは北の街の石畳を歩いていた。', 'A drizzly morning. With a sketchbook in her bag, Mina walks the cobbles of a northern town.'], shot: [[-1.5, 2.0, 9.0], [-8, 1.2, 6.4]] },
    { to: [1.5, 6.4], shot: { track: [-3.5, 2.6, 4] } },
    { to: [4.15, 6.3], say: ['「あ、いい匂い」 角のカフェから、シナモンとコーヒーの香り。', '“Oh, that smells good.” Cinnamon and coffee from the café on the corner.'], call: ring },
    { to: [4.15, 4.3] },
    { to: [3.45, 4.0], call: () => (me().indoors = true), say: ['ドアのベルが鳴る。傘を傘立てに。', 'The bell over the door rings. Her umbrella goes in the stand.'], shot: [[1.2, 2.4, 1.6], [3.6, 1.0, 4.0]] },
    { do: 'hold', dur: 1.4, face: FACE.down },
    { to: [3.6, -3.3], shot: [[6.0, 2.4, -0.6], [2.6, 1.1, -4.4]] },
    { do: 'idle', dur: 4, face: FACE.up, say: ['「カルダモンロールと、ラテをひとつ」', '“A cardamom roll and a latte, please.”'] },
    { to: [-1.6, -3.3] }, { do: 'idle', dur: 2.5, face: FACE.up, say: ['ラテの上にはハート。', 'A heart on top of the latte.'] },
    { swap: 'minaIn' },
    { to: [-4.6, -2.2], call: () => (me().indoors = true) }, { to: [-4.6, 3.3] }, { to: [SEAT, 3.3] }, { to: [SEAT, 4.02] },
    sit('sitSip', 5, { call: () => (mPlate.visible = mBook.visible = true), say: ['窓際のいちばん端の席。となりの窓台で、店の猫が眠っている。', 'The last stool along the window. On the sill beside her, the café cat is asleep.'], shot: [[-3.5, 1.55, 3.4], [-6.1, 0.95, 4.35]] }),
    sit('sitWrite', 9, { say: ['雨の通りを描く。傘の人、光る石畳、向かいの黄色い家。', 'She draws the rainy street: people under umbrellas, shining cobbles, the yellow house opposite.'], shot: [[-5.6, 1.7, 8.2], [-5.6, 1.2, 4.1]] }),
    sit('sitThink', 5, { call: () => catTo(SEAT + 0.04, 0.74, 4.3, 'sleep'), say: ['猫が起きて、のびをして……ミナのひざの上へ。', 'The cat wakes, stretches… and climbs into Mina’s lap.'], shot: [[-4.5, 1.25, 2.9], [-5.6, 0.75, 4.2]] }),
    sit('sitThink', 4, { say: ['「……動けなくなっちゃった」', '“…Well, now I can’t move.”'] }),
    sit('sitWrite', 8, { call: () => mBook.userData.page(1), say: ['猫をひざにのせたまま、もう一枚。ラテはもう冷めている。', 'One more drawing with the cat on her lap. The latte has gone cold.'], shot: [[-3.6, 2.4, 2.4], [-5.6, 0.8, 4.4]] }),
    sit('sitSip', 4, { call: () => { holdWeather(weather, 'clear'); world.setLook('day'); }, say: ['気がつくと雨がやんでいた。雲のすきまから日が差す。', 'Before she knows it, the rain has stopped. Sun through a gap in the clouds.'], shot: [[-5.6, 1.9, 9.5], [-5.6, 1.2, 4.2]] }),
    sit('sitThink', 3, { call: () => catTo(-6.0, BT, 4.5, 'sleep', 1.4), say: ['猫は窓台に戻って、また丸くなる。', 'The cat goes back to the sill and curls up again.'] }),
    { to: [SEAT, 3.3], call: () => (mPlate.visible = mBook.visible = false) }, { to: [3.45, 4.0] },
    { swap: 'minaBare' },
    { do: 'idle', dur: 1.2, face: FACE.up, say: ['「ごちそうさまでした」', '“Thank you, that was lovely.”'] },
    { to: [4.15, 4.3], call: ring }, { to: [4.15, 6.3], call: () => (me().indoors = false) },
    { to: [13.4, 6.4], say: ['晴れた空の下、次の町へ。……傘を傘立てに置いたまま。', 'Off to the next town under a clearing sky… leaving her umbrella in the stand.'], shot: [[8, 2.6, 13], [4, 1.4, 6]], end: true },
    { hide: 9999 },
  ],
});

// cars along the street
const cars = [[sedan({ color: CAR_COLORS[2] }), 1, 10.2], [keiCar({ color: KEI_COLORS[0] }), -1, 12.4], [sedan({ color: CAR_COLORS[0] }), -1, 12.4]].map(([c, dir, z], i) => { c.userData.dir = dir; c.userData.x = -8 + i * 9; c.position.z = z; c.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(c); return c; });

// ---------- rain ----------
const rain = new Rain(scene, { zones: [[-16, 13.5, 5.3, 15, 0], [7.2, 13.5, -11, 5.3, 0], [-16, -11.2, -11, 5.3, 0], [-11.2, 7.2, -11, -7.2, 0]], top: 9, count: 4200 });
shop.updateMatrixWorld(true);
const panes = [];
for (const side of ['front', 'right']) { const wg = shop.userData.walls[side]; for (const p of wg.userData.panes) { const c = new THREE.Vector3((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0); wg.localToWorld(c); panes.push({ center: c, normal: wg.userData.normal.clone(), w: p.x1 - p.x0, h: p.y1 - p.y0 }); } }
const drops = new WindowDrops(scene, panes);

// ---------- the panel: weather, the drifting camera, the sound ----------
const $ = (id) => document.getElementById(id);
const WJA = { clear: ['晴れ', 'clear'], cloudy: ['くもり', 'cloudy'], drizzle: ['小雨', 'drizzle'], rain: ['本降り', 'pouring'], after: ['雨上がり', 'after the rain'] };
for (const b of $('weather').children) b.onclick = () => { weather.hold(b.dataset.v); [...$('weather').children].forEach((x) => x.classList.toggle('on', x === b)); };
let drift = false, driftT = 0, driftI = 0;
const DRIFT = [[[-2.6, 1.7, 8.0], [-2.6, 1.3, 4.0]], [[-0.6, 2.0, 2.6], [-2.6, 0.7, 0.1]], [[-6.2, 2.0, 1.2], [-9.0, 0.7, 4.0]], [[2.6, 2.3, -1.2], [1.0, 1.2, -5.6]], [[-5.4, 2.2, -1.4], [-10.4, 1.1, -4.2]], [[3.2, 1.8, 1.5], [5.6, 0.7, 2.5]], [[-6, 3.2, -15], [-4, 0.8, -8.5]], [[10, 2.6, 11.5], [0, 1.8, 4.6]]];
$('drift').onclick = () => { drift = !drift; driftT = 0; $('drift').classList.toggle('on', drift); };
const soundLabel = () => { $('sound').textContent = L(sound.on ? ['音 · ON', 'Sound · ON'] : ['音 · OFF', 'Sound · OFF']); };
$('sound').onclick = () => { $('sound').classList.toggle('on', sound.toggle()); soundLabel(); };
onLang(soundLabel);
const sky = new THREE.Color(), grey = new THREE.Color('#8f98a3');
let uiT = 0;
steps.push((t, dt) => {
  weather.update(dt);
  const r = weather.rain, look = world.look, LK = LOOKS[look];
  // light: clouds dim the sun, darkness (night, clouds, rain) brings up the lamps inside
  const dim = 1 - 0.5 * weather.cloud;
  world.hemi.intensity = LK.hemi[0] * (0.6 + 0.4 * dim); world.sun.intensity = LK.sun[0] * dim;
  sky.set(LK.sky ?? '#e8eef2').lerp(grey, look === 'night' ? 0.15 : weather.cloud * 0.55); scene.background.copy(sky);
  const dark = Math.min(1, { morning: 0.25, day: 0, dusk: 0.6, night: 1 }[look] + weather.cloud * 0.35);
  setGlow(dark); lamps.forEach((l) => (l.intensity = 3 + dark * 14));
  lamp1.userData.setNight?.(dark > 0.5);
  rain.update(t, dt, r); drops.update(dt, r); wet.update(weather.wet); pud.update(weather.wet);
  steam.update(t, dt);
  sound.update(dt, r);
  // the door swings while someone passes; umbrellas open in the rain
  doorT = Math.max(0, doorT - dt); dr.userData.open = doorT > 0 ? 1 : 0;
  for (const a of people) a.p.userData.umbrella = !a.p.userData.indoors && r > 0.15;
  catWalk?.(dt);
  laptops.mac.userData.typing = mac.p.userData.mode === 'sitType'; laptops.call.userData.typing = call.p.userData.mode === 'sitType';
  laptops.mac.userData.update(t, dt);
  for (const c of cars) { const ud = c.userData; ud.speed = 3.5; ud.x += ud.dir * ud.speed * dt; if (ud.x > 16) ud.x = -19; if (ud.x < -19) ud.x = 16; c.position.x = ud.x; c.visible = ud.x > -15.8 && ud.x < 13.2; ud.update(dt); }
  // the drifting camera: a slow glide from seat to seat
  if (drift && ((driftT -= dt) <= 0)) { driftT = 14; const [p, q] = DRIFT[driftI++ % DRIFT.length]; world.cam(v3(...p), v3(...q), 7); }
  cutaway(shop, camera);
  across.visible = camera.position.y < 6.5;
  if ((uiT -= dt) <= 0) { uiT = 0.5; $('weatherLine').textContent = L([`いまの天気：${WJA[weather.state][0]}${weather.mode === 'auto' ? '（自動で移り変わります）' : ''}`, `Now: ${WJA[weather.state][1]}${weather.mode === 'auto' ? ' (changes on its own)' : ''}`]); }
});
world.start();
window.__cafe = { weather, rain, steam, shop, sound };

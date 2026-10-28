// Naha Road — from Naha Airport to the beach (town/DESIGN.md §3.1). Built from the shared roads & towns kit.
// West (x < 0) is the airport; the road runs east, 25 tiles, to the beach car park and the sea.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { clock } from '../../sealife/src/kit.js';
import { person, mat, mesh, box } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { tile, Network, Traffic, Signals, TILE } from '../../town/src/roads.js';
import { straight4, taper, busBay, parkingLot, LANES4 } from '../../town/src/roads-more.js';
import * as V from '../../town/src/vehicles.js';
import * as G from '../../town/src/gear.js';
import * as B from '../../town/src/buildings.js';
import * as N from '../../town/src/nature.js';
import { Story } from './story.js';

const $ = (id) => document.getElementById(id);
const smooth = THREE.MathUtils.smoothstep;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer, scene ----------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
$('app').appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.className = 'labels';
$('app').appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e4eee9');
scene.fog = new THREE.Fog('#e4eee9', 140, 320);
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 900);
const controls = new OrbitControls(camera, labels.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = 1.4;
controls.minDistance = 8;
controls.maxDistance = 360;

const hemi = new THREE.HemisphereLight('#fffaf0', '#b9c9b4', 1.45);
const sun = new THREE.DirectionalLight('#fff4e0', 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 220 });
sun.shadow.bias = -0.0005;
scene.add(hemi, sun, sun.target);

// ---------- the route: 25 tiles west → east ----------

const ROUTE = [];
for (let i = 0; i <= 8; i++) ROUTE.push({ i, kind: 'four', y: 0 });
ROUTE[4].gap = true; // a break in the median at the rental-car office
ROUTE[6].crossing = true; // the signalled pedestrian crossing in town
ROUTE.push({ i: 9, kind: 'taper', y: 0 });
for (let i = 10; i <= 17; i++) ROUTE.push({ i, kind: i === 12 ? 'bay' : 'two', y: 0 });
ROUTE.push({ i: 18, kind: 'two', y: 0, rise: 1.5 }, { i: 19, kind: 'two', y: 1.5, rise: 1.5 }, { i: 20, kind: 'two', y: 3 }, { i: 21, kind: 'two', y: 3, rise: -1.5 }, { i: 22, kind: 'two', y: 1.5, rise: -1.5 });
for (let i = 23; i <= 24; i++) ROUTE.push({ i, kind: 'two', y: 0 });
const X_END = 24 * TILE + TILE / 2; // the east end of the road
// road height at x (the ground follows it: the hill is the road's hill)
export function roadY(x) {
  const r = ROUTE[THREE.MathUtils.clamp(Math.round(x / TILE), 0, ROUTE.length - 1)];
  if (x < -TILE / 2 || x > X_END) return 0;
  return r.y + (r.rise ?? 0) * smooth(x - r.i * TILE, -TILE / 2, TILE / 2);
}

const net = new Network();
const ctrl = new Signals({ green: 11, yellow: 2.4, red: 1.4 });
const tiles = new THREE.Group();
const T = {}; // tiles by index
for (const r of ROUTE) {
  const o = { at: [r.i, 0], y: r.y, rise: r.rise ?? 0 };
  const t = r.kind === 'four' ? straight4({ ...o, crossing: r.crossing ? ctrl : null, medianGap: !!r.gap }) : r.kind === 'taper' ? taper(o) : r.kind === 'bay' ? busBay(o) : tile('straight', o);
  T[r.i] = t;
  tiles.add(net.add(t));
}
scene.add(tiles);
const lanesOf = (i) => T[i].userData.paths;
const eastbound = (p) => p.end.x > p.start.x;

// ---------- the ground: grass that rises with the hill, sand and the sea at the east end ----------
{
  const x0 = -60, x1 = 420, w = x1 - x0, nx = 240;
  const geo = new THREE.PlaneGeometry(w, 130, nx, 30).rotateX(-Math.PI / 2).translate(x0 + w / 2, 0, 0);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const grass = new THREE.Color('#a9c98a'), sand = new THREE.Color('#f2e6c9'), pave = new THREE.Color('#cfcac0'), c = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k);
    let y = roadY(x) - 0.08;
    if (x > 300) y = THREE.MathUtils.lerp(-0.08, -1.4, smooth(x, 300, 330)); // the beach slopes into the sea
    y -= smooth(Math.abs(z), 50, 65) * 0.6; // soft edges
    pos.setY(k, y);
    c.copy(grass);
    if (x < -6) c.copy(pave);
    if (x > 299) c.copy(grass).lerp(sand, smooth(x, 299, 303));
    col.set([c.r, c.g, c.b], k * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);
  // the sea: shallows over the sand, then the blue
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 130).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3fc1c9', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 }));
  sea.position.set(370, -0.55, 0);
  scene.add(sea);
  const shallow = new THREE.Mesh(new THREE.PlaneGeometry(30, 130).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8fe8dc', roughness: 0.2, transparent: true, opacity: 0.75 }));
  shallow.position.set(322, -0.5, 0);
  scene.add(shallow);
}

// place something on the ground at (x, z), facing ry
const put = (o, x, z, ry = 0) => { o.position.set(x, roadY(x), z); o.rotation.y = ry; scene.add(o); return o; };
const updaters = []; // (t, dt) each frame

// ---------- west end: Naha Airport's front, the monorail station over the plaza ----------
{
  const g = new THREE.Group();
  g.add(box(14, 0.12, 64, mat(0xcfcac0, { roughness: 0.95 }), -13, 0.06, 0)); // the plaza
  const glass = mat(0x7d9db5, { roughness: 0.15, metalness: 0.2 }), wall = mat(0xf1ede4, { roughness: 0.85 });
  g.add(box(24, 10, 60, wall, -32, 5, 0));
  g.add(box(0.3, 8, 56, glass, -19.9, 4.6, 0));
  for (let z = -27; z <= 27; z += 3) g.add(box(0.4, 8, 0.2, mat(0xb9bdc2, { metalness: 0.5 }), -19.7, 4.6, z));
  g.add(box(5, 0.5, 60, mat(0xe9e6df), -17.5, 5.6, 0)); // the canopy over the curb
  for (const z of [-24, -12, 0, 12, 24]) g.add(box(0.35, 5.4, 0.35, mat(0xd8d4cb), -15.3, 2.7, z));
  g.add(box(26, 1.2, 62, mat(0x2c3a57), -32, 10.6, 0)); // roof band
  const sign = new THREE.Group(); // the name over the front, facing east (+X)
  B.signBoard(sign, '那覇空港', 9, 2.0, 0, 0, 0, { bg: '#2c3a57', fg: '#f3e9d6', sub: 'NAHA AIRPORT' });
  sign.rotation.y = Math.PI / 2; sign.position.set(-18.95, 10.7, 0);
  g.add(sign);
  for (const z of [-8, 8]) { g.add(box(0.2, 2.6, 3.0, mat(0x9fc7d8, { transparent: true, opacity: 0.5 }), -19.75, 1.3, z)); g.add(box(0.1, 0.5, 2, mat(0x2fa58f), -19.6, 3.0, z)); } // arrival doors
  // the monorail station above the plaza, the beam runs east from it over the road's median
  const conc = mat(0xd8d3c8, { roughness: 0.85 });
  g.add(box(16, 0.6, 7, conc, -12, 6.4, 0));
  g.add(box(16, 0.3, 7.6, mat(0x2fa58f), -12, 10, 0));
  for (const s of [1, -1]) { g.add(box(16, 2.6, 0.1, mat(0xcfe1e8, { transparent: true, opacity: 0.35, depthWrite: false }), -12, 8.1, s * 3.4)); for (const x of [-19, -12, -5]) g.add(box(0.4, 9.7, 0.4, conc, x, 4.85, s * 3.2)); }
  for (let k = 0; k < 14; k++) g.add(box(1.4, 0.14, 0.45, conc, -16, 0.2 + k * 0.45, 4.2 + k * 0.42)); // stairs down to the plaza
  B.signBoard(g, '那覇空港駅', 3.2, 0.6, -12, 9.2, 3.55, { bg: '#2fa58f', fg: '#ffffff', sub: 'Naha Airport Sta.' });
  const stop = G.busStop({ name: 'レンタカー送迎', shelter: true }); stop.position.set(-2, 0.12, -8.3); g.add(stop); // open toward the road (+Z)
  bakeStatic(g);
  scene.add(g);
}
const beam = V.monorailBeam({ length: 116, height: 7 });
beam.position.set(38, 0, 0); // from the station (x ≈ −20) to the end of town (x ≈ 96), over the median
scene.add(beam);
const train = V.monorail();
train.position.set(-12, 7, 0);
scene.add(train);
{ // the train: stop at the airport, run to the end of the line and back
  let k = 0, dir = 1, wait = 6;
  updaters.push((t, dt) => {
    if (wait > 0) { wait -= dt; return; }
    k = THREE.MathUtils.clamp(k + dir * dt / 26, 0, 1);
    train.position.x = THREE.MathUtils.lerp(-8, 92, smooth(k, 0, 1));
    if (k === 0 || k === 1) { dir = -dir; wait = 8; }
  });
}

// ---------- ① 空港通り: palms along both sides, the direction sign ----------
for (const z of [-9, 9]) put(N.palmRow({ length: 34, spacing: 5.5 }), 13, z);
put(G.guideSign({ lines: [['↑', '那覇市街・ビーチ', 'Naha City · Beach'], ['←', '国際通り', 'Kokusai St.'], ['→', '那覇港', 'Naha Port']] }), 22, -8.3, Math.PI);

// ---------- ② the rental-car office (north side) and its lot of white vans ----------
const office = put(B.rentalOffice(), 50, -14.5);
const lot = put(parkingLot({ cols: 6, rows: 2 }), 34, -19);
const rentals = lot.userData.bays.map((b, i) => {
  const v = V.minivan({ rental: true });
  const p = b.pos.clone().add(lot.position);
  v.position.copy(p); v.rotation.y = b.ry;
  scene.add(v);
  return v;
});
const familyVan = rentals[3]; // the one the family gets

// ---------- ③ 国道（市街地）: shops both sides, the crossing, street lights ----------
put(B.convenienceStore({ brand: 2 }), 74, -16.5);
const gas = put(B.gasStation(), 84, 18.5, Math.PI);
put(B.apartment({ accent: 0xe8673c }), 102, 19, Math.PI);
put(B.souvenirShop(), 63, 15, Math.PI);
['cafe', 'bakery', 'flowers', 'grocery'].forEach((k, n) => put(B.shopHouse({ kind: k, color: [0xf1ede4, 0xf3e9d6, 0xe8eef0, 0xe8e2d6][n] }), 86 + n * 5, -14.5));
put(B.apartment({ floors: 4, accent: 0x3a7fd0 }), 110, -18);
for (let x = 6; x <= 102; x += 12) for (const s of [1, -1]) put(G.streetLight({ reach: 1.6 }), x + (s > 0 ? 6 : 0), s * 8.4, s > 0 ? Math.PI / 2 : -Math.PI / 2);
const banners = [put(G.banner({ text: '冷やし', color: '#3a7fd0' }), 71, -8.6), put(G.banner({ text: '給油', color: '#d9362b' }), 79, 8.7), put(G.banner({ text: '新発売', color: '#2fa58f' }), 80.5, 8.7)];
// people who cross at the lights when they turn green for walking
const crossers = [];
for (let n = 0; n < 4; n++) {
  const p = person(['kariyushi', 'tourist', 'student', 'senior'][n], { mode: 'idle' });
  const side = n % 2 ? 1 : -1;
  p.position.set(72 + (n - 1.5) * 0.7, 0.12, side * 8.1);
  p.userData.side = side;
  scene.add(p);
  crossers.push(p);
}

// ---------- ④ 住宅地: houses, the bus stop, power poles ----------
const bay = T[12];
put(G.busStop({ name: '大道' }), 0, 0).position.copy(bay.userData.stopAt).add(bay.position);
[[118, 0], [131, 2], [156, 1], [168, 0]].forEach(([x, v]) => put(B.house({ variant: v, floors: v === 2 ? 1 : 2, accent: [0x4f9d8f, 0xe8673c, 0x3a7fd0][v] }), x, -13.5));
put(B.oldHouse(), 145, -14.5);
[[120, 1], [134, 0], [148, 2], [162, 1]].forEach(([x, v]) => put(B.house({ variant: v, accent: [0x4f9d8f, 0xe8673c, 0x3a7fd0][v] }), x, 13.5, Math.PI));
{
  const poles = [];
  for (let x = 114; x <= 210; x += 12) poles.push(put(G.powerPole({ transformer: x % 24 === 6 }), x, -7.1));
  scene.updateMatrixWorld(true);
  for (let k = 0; k < poles.length - 1; k++) scene.add(G.wires(poles[k].userData.tops.map((p) => p.clone().applyMatrix4(poles[k].matrixWorld)), poles[k + 1].userData.tops.map((p) => p.clone().applyMatrix4(poles[k + 1].matrixWorld))));
  put(G.curveMirror(), 139, 7.3, Math.PI / 2);
  const vm = put(G.vendingMachine(), 151, 7.6, Math.PI / 2); vm.position.y = 0.12;
}

// ---------- ⑤ サトウキビ畑 ----------
const fields = [];
for (const [x, z, kind] of [[168, -15, 'cane'], [180, -15, 'veg'], [192, -15, 'cane'], [204, -15, 'cane'], [180, 15, 'cane'], [204, 15, 'veg'], [216, 15, 'cane']]) fields.push(put(kind === 'cane' ? N.caneField({ seed: x }) : N.vegField(), x, z));
put(N.windbreak({ length: 60 }), 192, -23);
put(B.oldHouse(), 192, 18, Math.PI);
put(N.stoneWall({ length: 9 }), 190, 11.2);
put(N.fukugiHedge({ length: 8 }), 196, 11.6);
const farmer = put(person('farmer', { mode: 'idle' }), 182, -10.5);

// ---------- ⑥ the hill and the sea beyond ----------
put(G.guideSign({ lines: [['↑', '海浜公園', 'Beach Park'], ['←', '那覇空港', 'Naha Airport'], ['→', '南部', 'South']], color: '#1f5fa8' }), 238, -6.8, Math.PI);
for (const [x, z] of [[222, -12], [230, 12], [246, -11], [254, 13], [262, -12]]) put(N.palm({ height: 5.5, lean: (x % 3) * 0.2 - 0.2, seed: x % 4 }), x, z);
put(N.deigo(), 236, 14);
put(N.grassLot({ w: 24, d: 14 }), 240, -16);

// ---------- ⑦ the beach car park, the shops, the path to the sand ----------
const beachLot = put(parkingLot({ cols: 6, rows: 2 }), 282, 17);
const parked = beachLot.userData.bays.map((b) => b.pos.clone().add(beachLot.position));
[[0, () => V.sedan({ color: V.CAR_COLORS[3] })], [2, () => V.keiCar()], [5, () => V.minivan({ color: V.MINIVAN_COLORS.silver, rental: false })], [7, () => V.suv()], [9, () => V.minivan()]].forEach(([k, mk]) => { const v = mk(); v.position.copy(parked[k]); v.rotation.y = beachLot.userData.bays[k].ry; scene.add(v); });
const familyBay = 3; // where the family parks
put(B.driveIn(), 282, -19);
put(B.souvenirShop({ name: 'ビーチ売店 うみかじ' }), 296, -14);
const wb = put(N.windbreak({ length: 40 }), 300, -30); wb.rotation.y = Math.PI / 2;
for (const [x, z] of [[302, 4], [306, 18], [304, 28], [308, -4], [303, -16]]) put(N.palm({ height: 6, lean: 0.6, seed: (x + z) % 4 }), x, z);
for (const [x, z, c] of [[312, 10, 0xe8673c], [314, 20, 0x2fa58f]]) { const p = new THREE.Group(); p.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), mat(0xf4f0e8), 0, 1.1, 0)); p.add(mesh(new THREE.ConeGeometry(1.3, 0.5, 10, 1, true), mat(c, { side: THREE.DoubleSide }), 0, 2.2, 0)); put(p, x, z); }
put(N.bougainvillea(), 298, 12);

// ---------- traffic ----------

const traffic = new Traffic(net, { speed: 4.6 });
// cars leaving an end of the road come back in at the other end, in a lane going the same way (when it's clear)
const ends = net.paths.filter((p) => p.start.x < -5 || p.start.x > X_END - 1);
traffic.wrap = (p) => {
  const c = traffic.cars.find((x) => x.path === p);
  if (c?.story) return null; // the family's car and the shuttle never loop
  const dir = Math.sign(p.end.x - p.start.x);
  const opts = ends.filter((s) => Math.sign(s.end.x - s.start.x) === dir && Math.abs(s.start.x - p.end.x) > 100);
  const lane = opts.sort((a, b) => Math.abs(a.start.z - p.end.z) - Math.abs(b.start.z - p.end.z))[0];
  return lane && traffic.cars.every((o) => !(o.path === lane && o.s < 9)) ? lane : null;
};
const mk = [() => V.sedan({ color: V.CAR_COLORS[2] }), () => V.minivan(), () => V.keiCar(), () => V.taxi(), () => V.routeBus({ to: '那覇バスターミナル' }), () => V.deliveryTruck(), () => V.minivan({ color: V.MINIVAN_COLORS.wine, rental: false }), () => V.keiTruck(), () => V.suv(), () => V.sedan({ color: V.CAR_COLORS[0] }), () => V.scooter(), () => V.tourBus(), () => V.keiCar({ color: V.KEI_COLORS[2] }), () => V.minivan({ color: V.MINIVAN_COLORS.sky }), () => V.bigTruck(), () => V.sedan({ color: V.CAR_COLORS[7] })];
const spots = [[1, 'e'], [3, 'w'], [5, 'e'], [7, 'w'], [11, 'e'], [14, 'w'], [16, 'e'], [19, 'w'], [23, 'e'], [2, 'w'], [8, 'e'], [13, 'w'], [17, 'w'], [21, 'e'], [10, 'w'], [24, 'w']];
mk.forEach((make, n) => {
  const v = make(); scene.add(v);
  const [i, d] = spots[n];
  const lane = lanesOf(i).filter((p) => !p.busOnly && (d === 'e') === eastbound(p))[n % 2];
  traffic.add(v, lane ?? lanesOf(i)[0], 2, { len: v.userData.len ?? 2.4, bus: !!v.userData.bus, speed: v.userData.vehicle === 'scooter' || v.userData.vehicle === 'keiTruck' ? 3.4 : v.userData.bus ? 3.8 : undefined });
});
// cars that came round from the other end grow in, rather than popping up
updaters.push((t, dt) => { for (const c of traffic.cars) { if (c.teleported) { c.obj.scale.setScalar(0.05); c.teleported = false; } if (c.obj.scale.x < 1) c.obj.scale.setScalar(Math.min(1, c.obj.scale.x + dt * 1.6)); } });

// ---------- the family's story ----------

const story = new Story({ scene, traffic, net, lanesOf, roadY, rentals, familyVan, office, lot, beachLot, familyBay, labels: CSS2DObject, text: (s) => { $('storyText').textContent = s; }, done: (link) => showLink(link) });

// ---------- views ----------

const SECTIONS = [
  { id: 'airport', ja: '空港', x: -8, cap: '那覇空港の到着口とモノレールの駅' },
  { id: 's1', ja: '①', x: 14, cap: '① 空港通り — ヤシ並木と案内標識、頭上をモノレール' },
  { id: 's2', ja: '②', x: 44, cap: '② レンタカー営業所 — わナンバーの白いミニバンがずらり' },
  { id: 's3', ja: '③', x: 84, cap: '③ 国道（市街地）— 押しボタン式の信号で止まる、店と人' },
  { id: 's4', ja: '④', x: 140, cap: '④ 住宅地 — 給水タンクの家、電柱、バス停に寄るバス' },
  { id: 's5', ja: '⑤', x: 190, cap: '⑤ サトウキビ畑 — 風が渡る畑と軽トラ' },
  { id: 's6', ja: '⑥', x: 240, cap: '⑥ 坂の上 — 海が見えた！' },
  { id: 's7', ja: '⑦', x: 290, cap: '⑦ ビーチの駐車場 — この先は那覇の海' },
];
let mode = 'overview';
let fly = null;
function flyTo(pos, target, dur = 1.6) { fly = { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone() }; }
function goSection(s) {
  mode = 'overview';
  setView('');
  const y = roadY(s.x);
  flyTo(vec(s.x + 26, y + 30, 46), vec(s.x, y, 0));
  $('section').textContent = s.cap;
}
function goAll() { mode = 'overview'; setView('all'); flyTo(vec(150, 190, 250), vec(150, 0, 0)); $('section').textContent = '那覇空港から海まで、約300（25区間）'; }
function goDrive() { mode = 'drive'; setView('drive'); }
function setView(v) { $('views').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); }
$('views').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.v === 'all') goAll(); else if (b.dataset.v === 'drive') goDrive(); else goSection(SECTIONS.find((s) => s.id === b.dataset.v));
});
for (const s of SECTIONS) { const b = document.createElement('button'); b.textContent = s.ja; b.dataset.v = s.id; $('views').appendChild(b); }
$('legs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; startLeg(b.dataset.leg); });
function startLeg(leg) {
  $('link').hidden = true;
  $('legs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.leg === leg));
  story.start(leg);
  goDrive();
}
function showLink(link) {
  const a = $('link');
  a.href = link.href; a.textContent = link.label; a.hidden = false;
}

// the drive camera: behind and above the family's car; on the hill it rises to show the sea
const chase = { pos: vec(0, 20, 30), look: vec(0, 0, 0) };
function driveCamera(dt) {
  const target = story.focus();
  if (!target) return;
  const { pos, fwd, onFoot } = target;
  let want, look;
  if (onFoot) { // people walking: a raised three-quarter view from the south-east, never from behind (buildings)
    want = pos.clone().add(vec(10, 17, 23));
    look = pos.clone();
  } else { // a car: behind and well above, like looking down on a diorama; over the crest it rises to show the sea
    const k = smooth(pos.x, 226, 240) * (1 - smooth(pos.x, 262, 275));
    const back = THREE.MathUtils.lerp(16, 12, k), up = THREE.MathUtils.lerp(12, 15, k), ahead = THREE.MathUtils.lerp(3, 42, k);
    want = pos.clone().addScaledVector(fwd, -back).add(vec(0, up, 0));
    look = pos.clone().addScaledVector(fwd, ahead).add(vec(0, -k * 2, 0));
  }
  chase.pos.lerp(want, Math.min(1, dt * 2.2));
  chase.look.lerp(look, Math.min(1, dt * 2.6));
  camera.position.copy(chase.pos);
  controls.target.copy(chase.look);
  const s = [...SECTIONS].reverse().find((q) => pos.x > q.x - 18);
  if (s) $('section').textContent = s.cap;
}

// ---------- loop ----------

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const timer = new THREE.Clock();
let crossPhase = null;
function frame(dt, t) {
  clock.uTime.value = t;
  ctrl.update(dt);
  T[6].userData.updateLights(t);
  traffic.update(dt);
  for (const f of updaters) f(t, dt);
  story.update(t, dt);
  for (const f of fields) f.userData.update?.(t);
  for (const b of banners) b.userData.update(t);
  gas.userData.update?.(t, dt);
  farmer.userData.update(t);
  // pedestrians at the crossing: when it turns green for walking, they cross to the other side
  const walk = ctrl.state('ns') === 'green';
  if (walk && crossPhase !== ctrl.t - (ctrl.t % ctrl.cycle)) {
    crossPhase = ctrl.t - (ctrl.t % ctrl.cycle);
    crossers.forEach((p, n) => { p.userData.goal = -p.userData.side * 8.1; p.userData.delay = n * 0.7; });
  }
  for (const p of crossers) {
    if (p.userData.goal == null) { p.userData.mode = 'idle'; p.userData.update(t); continue; }
    if ((p.userData.delay -= dt) > 0) { p.userData.update(t); continue; }
    const dz = p.userData.goal - p.position.z;
    if (Math.abs(dz) < 0.05) { p.userData.side = Math.sign(p.userData.goal); p.userData.goal = null; p.rotation.y = 0; continue; }
    p.userData.mode = 'walk';
    p.rotation.y = dz > 0 ? -Math.PI / 2 : Math.PI / 2;
    p.position.z += Math.sign(dz) * Math.min(Math.abs(dz), dt * 1.25);
    p.position.y = Math.abs(p.position.z) > LANES4.edge ? 0.12 : 0.02;
    p.userData.update(t);
  }
}
renderer.setAnimationLoop(() => {
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.elapsedTime;
  frame(dt, t);
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / fly.dur);
    const k = smooth(fly.t, 0, 1);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    controls.target.lerpVectors(fly.t0, fly.t1, k);
    if (fly.t >= 1) fly = null;
  } else if (mode === 'drive') driveCamera(dt);
  if (mode === 'drive' && !fly) camera.lookAt(controls.target); // the chase camera aims itself (orbit damping would lag behind)
  else controls.update();
  // haze far away, relative to how far out the camera is (the overview sees the whole road)
  const dist = camera.position.distanceTo(controls.target);
  scene.fog.near = dist * 1.2; scene.fog.far = dist * 3;
  // keep the shadow camera near what we look at
  sun.position.copy(controls.target).add(vec(30, 60, 25));
  sun.target.position.copy(controls.target);
  renderer.render(scene, camera);
  labels.render(scene, camera);
});

// start: from the URL (?leg=out | back) or the overview
const leg = new URLSearchParams(location.search).get('leg');
camera.position.set(150, 190, 250);
controls.target.set(150, 0, 0);
if (leg === 'out' || leg === 'back') startLeg(leg); else goAll();

// debug: snapshots at a fixed size (the preview pane is narrow), and fast-forward
window.__road = {
  scene, camera, controls, traffic, story, net, T, ROUTE, roadY,
  advance(sec) { for (let k = 0; k < sec * 30; k++) { const tt = timer.elapsedTime + k / 30; frame(1 / 30, tt); if (mode === 'drive') driveCamera(1 / 30); } },
  snapshot(w = 1400, h = 800) {
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (mode === 'drive') camera.lookAt(controls.target); else controls.update();
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/jpeg', 0.88);
    resize();
    return url;
  },
  goSection: (id) => goSection(SECTIONS.find((s) => s.id === id)), goAll, goDrive,
};

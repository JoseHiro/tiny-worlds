// Roads & towns catalog: one renderer, one small scene per card (scissor viewports), and sample scenes.
// Cards build their scene only when they first come near the screen (memory stays low until you look).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clock } from '../../sealife/src/kit.js';
import { person, PASSENGER_TYPES } from '../../airport/src/parts.js';
import { tile, Network, Traffic, Signals, TILE } from './roads.js';
import { straight4, taper, roundabout, curveBig, bridge, tunnel, busBay, alley, farmRoad, parkingLot, river } from './roads-more.js';
import * as V from './vehicles.js';
import * as G from './gear.js';
import * as B from './buildings.js';
import * as N from './nature.js';

const BG = new THREE.Color('#e7efe9');
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

function stage(build, { view = [1, 0.7, 1.1], fill = 0.95, shadows = false } = {}) { // fill 1 ≈ the bounding sphere just fits
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fffaf0', '#b9c9b4', 1.5));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.4);
  sun.position.set(14, 26, 10);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 });
    sun.shadow.bias = -0.0005;
  }
  scene.add(sun);
  const built = build(scene);
  const sphere = new THREE.Box3().setFromObject(built.obj).getBoundingSphere(new THREE.Sphere());
  const target = built.target ?? sphere.center;
  const radius = built.radius ?? sphere.radius;
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 800);
  camera.position.copy(vec(...view).normalize().multiplyScalar((radius / Math.sin(THREE.MathUtils.degToRad(15))) * fill)).add(target);
  camera.lookAt(target);
  return { scene, camera, target, update: built.update ?? (() => {}), obj: built.obj, built };
}

// ---------- card builders ----------

const ground = (scene, size, color = 0xa9c98a, y = -0.06) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 1 })); m.position.y = y; m.receiveShadow = true; scene.add(m); return m; };
// call what moves: vehicles take update(dt), everything else update(t, dt)
const tick = (o, t, dt) => (o.userData.kind === 'car' ? o.userData.update(dt) : o.userData.update(t, dt));
// one thing (or a few side by side), turning slowly
function show(make, { spin = true, spacing = 0, update } = {}) {
  return (scene) => {
    const made = [].concat(make());
    const pivot = new THREE.Group();
    made.forEach((o, i) => { if (spacing) o.position.x += (i - (made.length - 1) / 2) * spacing; pivot.add(o); });
    scene.add(pivot);
    const moving = [];
    pivot.traverse((o) => { if (o !== pivot && o.userData.update) moving.push(o); });
    return { obj: pivot, update: (t, dt, still) => {
      if (spin && !still) pivot.rotation.y += dt * 0.25;
      update?.(made, t, dt);
      for (const o of moving) tick(o, t, dt);
    } };
  };
}
// a vehicle on the spot: wheels turning, indicators, brake lights; extra(v, t) for doors etc.
const drive = (make, extra) => show(make, { update: (m, t) => m.forEach((v) => { v.userData.speed = 2; v.userData.blink = t % 8 < 3 ? 'L' : null; v.userData.braking = t % 8 > 5; extra?.(v, t); }) });

function crossCard(scene) {
  const ctrl = new Signals();
  const t = tile('cross', { signals: ctrl });
  const lights = G.junctionLights(t, ctrl);
  scene.add(t);
  return { obj: t, update: (time, dt) => { ctrl.update(dt); lights.update(time); } };
}
function lightCard(scene) {
  const set = G.lampSet();
  const l = G.trafficLight(set);
  scene.add(l);
  const ctrl = new Signals({ green: 4, yellow: 1.6, red: 1 });
  return { obj: l, update: (t, dt, still) => { if (!still) l.rotation.y += dt * 0.3; ctrl.update(dt); const st = ctrl.state('ew'); G.showLamps(set, st, st === 'green' ? 'walk' : 'stop', t); } };
}
function bridgeCard(scene) {
  const r = river({ w: TILE }); r.rotation.y = Math.PI / 2; scene.add(r);
  const b = bridge({ height: 1.6 }); b.position.y = 0.4; scene.add(b);
  return { obj: b, target: vec(0, -0.4, 0) };
}
function elevatedCard(scene) {
  ground(scene, 30, 0xb9b5ad, -6.2);
  const b = bridge({ height: 6.2 }); scene.add(b);
  return { obj: b, target: vec(0, -2.5, 0), radius: 9 };
}
function busBayCard(scene) {
  const t = busBay(); scene.add(t);
  const s = G.busStop({ name: '海浜公園前' }); s.position.copy(t.userData.stopAt); scene.add(s);
  const bus = V.routeBus(); bus.position.set(0.3, 0, -3.3); scene.add(bus);
  return { obj: t, update: (time, dt) => { bus.userData.doorOpen = time % 8 > 2 && time % 8 < 6; bus.userData.braking = true; bus.userData.update(dt); } };
}
function parkingCard(scene) {
  const lotG = parkingLot({ cols: 6 }); scene.add(lotG);
  const makers = [() => V.minivan(), () => V.sedan({ color: V.CAR_COLORS[3] }), () => V.keiCar(), () => V.suv(), () => V.minivan({ color: V.MINIVAN_COLORS.navy, rental: false }), () => V.sedan()];
  lotG.userData.bays.forEach((b, i) => { if (i % 4 === 3) return; const v = makers[i % makers.length](); v.position.copy(b.pos); v.rotation.y = b.ry; scene.add(v); });
  return { obj: lotG };
}
function wiresCard(scene) {
  const a = G.powerPole(), b = G.powerPole({ transformer: false });
  a.position.x = -6; b.position.x = 6;
  scene.add(a, b);
  scene.updateMatrixWorld(true);
  scene.add(G.wires(a.userData.tops.map((p) => p.clone().applyMatrix4(a.matrixWorld)), b.userData.tops.map((p) => p.clone().applyMatrix4(b.matrixWorld))));
  return { obj: a, target: vec(0, 4, 0), radius: 7.5 };
}
function monorailCard(scene) {
  ground(scene, 60, 0xb9b5ad);
  const beam = V.monorailBeam({ length: 48 }); scene.add(beam);
  const train = V.monorail(); train.position.y = beam.userData.height; scene.add(train);
  return { obj: beam, update: (t) => { train.position.x = THREE.MathUtils.lerp(-14, 19, (Math.sin(t * 0.25) + 1) / 2); }, target: vec(0, 4, 0), radius: 18 };
}
function peopleCard(scene) {
  const roles = ['clerk', 'police', 'worker', 'student', 'farmer', 'jogger', 'kariyushi', 'tourist', 'busDriver', ...PASSENGER_TYPES.slice(0, 3)];
  const g = new THREE.Group();
  const ps = roles.map((r, i) => { const p = person(r, { mode: i % 3 === 0 ? 'walk' : 'idle' }); p.position.set((i - (roles.length - 1) / 2) * 0.9, 0, 0); p.userData.phase = i; g.add(p); return p; });
  scene.add(g);
  return { obj: g, update: (t) => ps.forEach((p) => p.userData.update(t)), radius: 4.5 };
}

// ---------- samples: whole streets with traffic ----------

// cars leaving the end of an open road come back in at the other end, in a lane going the same way
function wrapAround(traffic, starts) {
  traffic.wrap = (p) => {
    const dir = new THREE.Vector3().subVectors(p.end, p.pts.at(-2)).normalize();
    const same = starts.filter((s) => new THREE.Vector3().subVectors(s.pts[1], s.start).normalize().dot(dir) > 0.9 && Math.abs(s.start.z - p.end.z) < 0.5);
    // wait at the end until the way in is clear (don't drop a car on top of another)
    return same.find((s) => traffic.cars.every((o) => !(o.path === s && o.s < 9))) ?? null;
  };
}
// put a car on a path; random lane among those given
const addCars = (scene, traffic, makers, lanes, { busStops = false } = {}) => makers.forEach((mk, i) => {
  const v = mk(); scene.add(v);
  const lane = lanes[i % lanes.length];
  traffic.add(v, lane, ((i * 3.7) % Math.max(1, lane.len - 2)), { len: v.userData.len ?? 2.4, bus: busStops && !!v.userData.bus, speed: v.userData.vehicle === 'scooter' || v.userData.vehicle === 'keiTruck' ? 3.2 : undefined });
});

function intersectionSample(scene) {
  ground(scene, 110);
  const net = new Network();
  const ctrl = new Signals({ green: 9 });
  // a ring road with straights between the junctions (queues need somewhere to wait), a signalled crossroads in the middle
  const layout = [
    ['curve', -2, -2, 3], ['straight', -1, -2, 0], ['tee', 0, -2, 0], ['straight', 1, -2, 0], ['curve', 2, -2, 0],
    ['straight', -2, -1, 1], ['straight', 0, -1, 1], ['straight', 2, -1, 1],
    ['tee', -2, 0, 3], ['straight', -1, 0, 0], ['cross', 0, 0, 0], ['straight', 1, 0, 0], ['tee', 2, 0, 1],
    ['straight', -2, 1, 1], ['straight', 0, 1, 1], ['straight', 2, 1, 1],
    ['curve', -2, 2, 2], ['straight', -1, 2, 0], ['tee', 0, 2, 2], ['straight', 1, 2, 0], ['curve', 2, 2, 1],
  ];
  const tiles = new THREE.Group();
  let lights = null;
  for (const [kind, gx, gz, turns] of layout) {
    const t = tile(kind, { at: [gx, gz], turns, signals: kind === 'cross' ? ctrl : null });
    if (kind === 'cross') lights = G.junctionLights(t, ctrl);
    tiles.add(net.add(t));
  }
  scene.add(tiles);
  // the blocks: a store, a cane field, houses
  const store = B.convenienceStore(); store.scale.setScalar(0.62); store.position.set(-TILE, 0, TILE + 1.2); store.rotation.y = Math.PI; scene.add(store);
  const field = N.caneField({ seed: 5, w: 9, d: 9 }); field.position.set(TILE, 0, -TILE); scene.add(field);
  const h1 = B.house({ variant: 1, accent: 0xe8673c }); h1.scale.setScalar(0.8); h1.position.set(-TILE, 0, -TILE); scene.add(h1);
  const h2 = B.house({ variant: 2, floors: 1, accent: 0x3a7fd0 }); h2.scale.setScalar(0.8); h2.position.set(TILE, 0, TILE); h2.rotation.y = Math.PI; scene.add(h2);
  const traffic = new Traffic(net);
  const starts = net.paths.filter((p) => !p.turn && !p.conflicts.length);
  addCars(scene, traffic, [() => V.minivan(), () => V.sedan({ color: V.CAR_COLORS[2] }), () => V.keiCar({ color: V.KEI_COLORS[1] }), () => V.taxi(), () => V.minivan({ color: V.MINIVAN_COLORS.wine, rental: false }), () => V.suv(), () => V.keiTruck(), () => V.sedan({ color: V.CAR_COLORS[7] }), () => V.minivan({ color: V.MINIVAN_COLORS.sky })], starts.filter((_, i) => i % 3 === 0));
  return { obj: tiles, target: vec(0, 0, 0), radius: 32, traffic, ctrl, update: (t, dt) => { ctrl.update(dt); lights.update(t); traffic.update(dt); store.userData.update(t, dt, Math.sin(t * 0.8) > 0.4); field.userData.update(t); } };
}

// the main road in town: 4 lanes, the monorail overhead, a petrol station, a store, apartments, buses
function mainRoadSample(scene) {
  ground(scene, 120, 0xb9c9a8);
  const net = new Network();
  const tiles = new THREE.Group();
  for (let i = -3; i <= 3; i++) tiles.add(net.add(straight4({ at: [i, 0] })));
  scene.add(tiles);
  const beam = V.monorailBeam({ length: 84, height: 7 }); scene.add(beam);
  const train = V.monorail(); train.position.y = 7; scene.add(train);
  const put = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; scene.add(o); return o; };
  put(B.gasStation(), -22, 17, Math.PI);
  const store = put(B.convenienceStore({ brand: 1 }), 0, 16.5, Math.PI);
  put(B.apartment(), 21, 17.5, Math.PI);
  put(B.apartment({ floors: 4, accent: 0x3a7fd0 }), -22, -16);
  put(B.shopHouse({ kind: 'cafe' }), -8, -13); put(B.shopHouse({ kind: 'bakery', color: 0xf3e9d6 }), -3, -13); put(B.shopHouse({ kind: 'flowers', color: 0xe8eef0 }), 2, -13); put(B.shopHouse({ kind: 'grocery' }), 7, -13);
  put(B.souvenirShop(), 18, -13);
  put(G.guideSign(), 30, -9.2, Math.PI);
  for (let x = -36; x <= 36; x += 12) for (const s of [1, -1]) put(G.streetLight(), x + (s > 0 ? 6 : 0), s * 7.6, s > 0 ? Math.PI / 2 : -Math.PI / 2);
  const banners = [put(G.banner({ text: '給油', color: '#d9362b' }), -15, 8.4), put(G.banner({ text: '新発売', color: '#2fa58f' }), 6.5, 8.4)];
  const traffic = new Traffic(net, { speed: 5 });
  const ends = net.paths.filter((p) => Math.abs(p.start.x) > 40);
  wrapAround(traffic, ends);
  addCars(scene, traffic, [() => V.minivan(), () => V.routeBus(), () => V.sedan({ color: V.CAR_COLORS[0] }), () => V.deliveryTruck(), () => V.taxi(), () => V.bigTruck(), () => V.keiCar({ color: V.KEI_COLORS[2] }), () => V.suv({ color: 0x26282d }), () => V.minivan({ color: V.MINIVAN_COLORS.silver }), () => V.tourBus(), () => V.sedan({ color: V.CAR_COLORS[5] }), () => V.scooter()], net.paths);
  return { obj: tiles, target: vec(0, 1.5, 0), radius: 30, traffic, update: (t, dt) => { traffic.update(dt); train.position.x = THREE.MathUtils.lerp(-34, 40, (Math.sin(t * 0.12) + 1) / 2); store.userData.update(t, dt, Math.sin(t) > 0.5); banners.forEach((b) => b.userData.update(t)); } };
}

// a quiet street of houses: power poles, a bus stop the bus pulls into, kids on bicycles, a park
function residentialSample(scene) {
  ground(scene, 100, 0xa9c98a);
  const net = new Network();
  const tiles = new THREE.Group();
  let bay = null;
  for (let i = -3; i <= 3; i++) { const t = i === 1 ? (bay = busBay({ at: [i, 0] })) : tile('straight', { at: [i, 0] }); tiles.add(net.add(t)); }
  scene.add(tiles);
  const stop = G.busStop({ name: '大道' }); stop.position.copy(bay.userData.stopAt).add(bay.position); scene.add(stop);
  const put = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; scene.add(o); return o; };
  [[-30, 0], [-18, 1], [6, 2], [18, 0]].forEach(([x, v]) => put(B.house({ variant: v, accent: [0x4f9d8f, 0xe8673c, 0x3a7fd0][v] }), x, 11, Math.PI));
  put(B.oldHouse(), -6, 11.5, Math.PI);
  [[-28, 1], [-16, 2], [-4, 0], [10, 1], [24, 2]].forEach(([x, v]) => put(B.house({ variant: v, floors: v === 2 ? 1 : 2 }), x, -11));
  const pk = put(B.park({ trees: [N.gajumaru(), N.deigo(), N.streetTree(), N.bougainvillea()] }), 34, 18); pk.scale.setScalar(0.6);
  const poles = [];
  for (let x = -40; x <= 40; x += 13) poles.push(put(G.powerPole({ transformer: Math.abs(x) % 26 < 13 }), x, -4.9));
  scene.updateMatrixWorld(true);
  for (let i = 0; i < poles.length - 1; i++) scene.add(G.wires(poles[i].userData.tops.map((p) => p.clone().applyMatrix4(poles[i].matrixWorld)), poles[i + 1].userData.tops.map((p) => p.clone().applyMatrix4(poles[i + 1].matrixWorld))));
  put(G.curveMirror(), -12, 4.6, -Math.PI / 2);
  const vm = put(G.vendingMachine(), 1.5, 4.9, -Math.PI / 2); vm.position.y = 0.12;
  put(G.postBox(), 3, 4.6).position.y = 0.12;
  const traffic = new Traffic(net, { speed: 3.6 });
  const ends = net.paths.filter((p) => Math.abs(p.start.x) > 40 && !p.busOnly);
  wrapAround(traffic, ends);
  addCars(scene, traffic, [() => V.routeBus({ to: '那覇バスターミナル' }), () => V.keiCar(), () => V.minivan({ color: V.MINIVAN_COLORS.sky, rental: false }), () => V.keiCar({ color: V.KEI_COLORS[3] }), () => V.sedan()], net.paths.filter((p) => !p.busOnly), { busStops: true });
  const bikes = [0, 1].map((i) => { const b = V.bicycle({ color: [0x3a7fd0, 0xd23a8a][i], role: i ? 'child' : 'student' }); scene.add(b); return b; });
  return { obj: tiles, target: vec(0, 1.5, 0), radius: 30, traffic, update: (t, dt) => {
    traffic.update(dt);
    bikes.forEach((b, i) => { const x = ((t * 1.6 + i * 30) % 90) - 45; b.position.set(i ? -x : x, 0.12, i ? 3.4 : -3.4); b.rotation.y = i ? Math.PI : 0; b.userData.speed = 1.6; b.userData.update(dt); });
    pk.userData.update(t);
  } };
}

// the farm road: cane, vegetables, a paddy, a windbreak, an old house, an utaki, kei trucks
function farmSample(scene) {
  ground(scene, 100, 0x9fc47c);
  const net = new Network();
  const tiles = new THREE.Group();
  for (let i = -3; i <= 3; i++) tiles.add(net.add(farmRoad({ at: [i, 0] })));
  scene.add(tiles);
  const put = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; scene.add(o); return o; };
  const fields = [];
  for (let i = -3; i <= 3; i++) fields.push(put(i === 1 ? N.ricePaddy() : i % 3 === 0 ? N.vegField({ crop: i ? 'cabbage' : 'onion' }) : N.caneField({ seed: i + 10 }), i * TILE, -TILE));
  put(N.windbreak({ length: 84 }), 0, 9);
  put(B.oldHouse(), -18, 17, Math.PI);
  put(N.fukugiHedge({ length: 12 }), -18, 10.8);
  put(N.stoneWall({ length: 10 }), 6, 7.5);
  put(B.sacredPlace({ tree: N.gajumaru({ seed: 8 }) }), 14, 17);
  put(N.grassLot(), 30, 17);
  const traffic = new Traffic(net, { speed: 2.6 });
  const ends = net.paths.filter((p) => Math.abs(p.start.x) > 40);
  wrapAround(traffic, ends);
  addCars(scene, traffic, [() => V.keiTruck(), () => V.keiTruck({ load: null }), () => V.minivan()], net.paths);
  const farmer = put(person('farmer', { mode: 'idle' }), -3, -8);
  farmer.position.y = 0.1;
  return { obj: tiles, target: vec(0, 1, -2), radius: 30, traffic, update: (t, dt) => { traffic.update(dt); fields.forEach((f) => f.userData.update?.(t)); farmer.userData.update(t); } };
}

// ---------- the catalog ----------

const C = (group, name, en, note, build, opts = {}) => ({ group, name, en, note, build, ...opts });
const row = (n) => ({ view: [0.35, 0.5, 1.2], fill: 0.8, n });
const ITEMS = [
  C('sample', '見本：交差点と環状の道', 'Sample · a crossroads inside a ring road', '信号の交差点（赤で止まる、前の車との間をあける、右折は対向車を待つ）· T字路とカーブの環状の道（交差点の間に直線）· いろいろな車9台 · 区画にコンビニ、サトウキビ畑、家', intersectionSample, { wide: true, view: [0.6, 1.0, 0.9], fill: 0.5, shadows: true }),
  C('sample', '見本：国道と街', 'Sample · the main road in town', '4車線の国道 · 頭上をモノレール · ガソリンスタンド、コンビニ、アパート、商店、土産物屋 · 案内標識と街灯 · 路線バス、観光バス、トラック、タクシー、スクーター', mainRoadSample, { wide: true, view: [0.45, 1.0, 0.9], fill: 0.5, shadows: true }),
  C('sample', '見本：住宅地', 'Sample · a residential street', '給水タンクの家、赤瓦の古い家 · 電柱と電線 · バス停の切り込みに路線バスが寄って扉を開ける · 自転車の子ども · 公園', residentialSample, { wide: true, view: [0.45, 1.0, 0.9], fill: 0.5, shadows: true }),
  C('sample', '見本：畑の道', 'Sample · a farm road', '砂利の農道 · サトウキビ畑、野菜畑、田んぼ · 防風林、フクギの生け垣、石垣 · 御嶽 · サトウキビを積んだ軽トラ', farmSample, { wide: true, view: [0.45, 0.9, 0.9], fill: 0.5, shadows: true }),
  // roads
  C('road', '直線（2車線）', 'Straight · 2 lanes', '長さ12 · 車道5.2＋歩道1.5×2 · 破線の中央線、外側線、縁石、草の路肩', show(() => tile('straight'))),
  C('road', 'カーブ', 'Curve', '半径6（中心線）· 内外に歩道', show(() => tile('curve'))),
  C('road', '大きなカーブ', 'Big curve', '2×2区画 · 半径18 · 外側にガードレール（海沿いの道に）', show(() => curveBig())),
  C('road', 'T字路', 'T-junction', '角の歩道は丸く · 横断歩道と停止線', show(() => tile('tee'))),
  C('road', '十字路（信号）', 'Crossroads with lights', '信号4基（各方向の左奥）· 東西→南北の順に青', crossCard),
  C('road', 'ロータリー', 'Roundabout', '3×3区画 · 時計回りの一方通行 · 花の植え込み（空港前・駅前に）', show(() => roundabout(), { spin: false }), { view: [0.6, 1.2, 0.9] }),
  C('road', '坂', 'Slope', '長さ12で1.5上がる（海が見えてくる坂に）', show(() => tile('straight', { rise: 1.5 }))),
  C('road', '4車線（中央分離帯）', '4 lanes with a median', '幅16 · 植え込みの分離帯 · 車線境界の破線（国道・空港通りに）', show(() => straight4())),
  C('road', '4→2車線', 'Taper · 4 to 2 lanes', '外側の車線が終わって合流する · 分離帯が細くなって消える', show(() => taper())),
  C('road', '橋', 'Bridge', '欄干つき · 川の上', bridgeCard),
  C('road', '高架', 'Elevated road', '高さ6の橋脚', elevatedCard),
  C('road', 'トンネル', 'Tunnel', '丘の下 · 坑門 · 天井の照明', show(() => tunnel()), { view: [1, 0.5, 0.5] }),
  C('road', 'バス停の切り込み', 'Bus bay', '歩道が引っ込んでバスが寄る · 停留所と屋根付き待合 · バスの扉が開く', busBayCard),
  C('road', '路地', 'Alley', '幅3.5 · 側溝とふた（歩く人の道）', show(() => alley())),
  C('road', '農道', 'Farm road', '砂利、わだち、真ん中に草', show(() => farmRoad())),
  C('road', '駐車場', 'Car park', '区画、白線、車止め、照明', parkingCard, { view: [0.6, 1, 0.8] }),
  // equipment
  C('gear', '信号機', 'Traffic light', '横3灯（左から青・黄・赤）· 歩行者用信号と押しボタン', lightCard, { view: [1.2, 0.35, 0.5], fill: 0.85 }),
  C('gear', '案内標識', 'Direction sign', '青い板に行き先と矢印（那覇市街・空港・海浜公園）', show(() => G.guideSign(), { spin: false }), { view: [1.3, 0.3, -0.4], fill: 0.8 }),
  C('gear', '規制標識', 'Regulatory signs', '止まれ · 最高速度40 · 駐車禁止', show(() => [G.roadSign('stop'), G.roadSign('speed'), G.roadSign('noParking')], { spacing: 1.4, spin: false }), { view: [1, 0.2, 0] }),
  C('gear', '街灯', 'Street light', '高さ5 · 夜に灯る', show(() => G.streetLight())),
  C('gear', 'ガードレール・カーブミラー', 'Guardrail · curve mirror', '白い波板／オレンジの柱と丸い鏡', show(() => [G.guardrail(), G.curveMirror()], { spacing: 4 })),
  C('gear', '電柱と電線', 'Power poles and wires', '腕金、がいし、変圧器 · たるんだ電線', wiresCard),
  C('gear', 'バス停', 'Bus stop', '標識と時刻表 · 屋根とベンチ', show(() => G.busStop())),
  C('gear', '自動販売機', 'Vending machine', '光る正面 · 横にゴミ箱', show(() => G.vendingMachine())),
  C('gear', 'ポスト・消火栓・ボラード', 'Post box · hydrant · bollard', '赤いポスト、赤い消火栓、黄帯の車止め', show(() => [G.postBox(), G.hydrant(), G.bollard()], { spacing: 1.2 })),
  C('gear', '横断歩道橋', 'Footbridge', '道をまたぐ · 両端に階段', show(() => G.footbridge())),
  C('gear', '工事', 'Roadworks', 'コーン、点滅する矢印板、柵、工事中の看板', show(() => G.roadworks())),
  C('gear', 'のぼり旗', 'Banner flags', '店の前で風に揺れる', show(() => [G.banner(), G.banner({ text: '冷やし', color: '#3a7fd0' }), G.banner({ text: '給油', color: '#d9362b' })], { spacing: 0.9, spin: false }), { view: [1, 0.3, 0.2] }),
  // vehicles
  C('car', 'ミニバン（レンタカー）', 'Minivan · rental', 'わナンバー · スライドドア · ウインカー、ブレーキ', drive(() => V.minivan(), (v, t) => { v.userData.doorOpen = t % 10 > 4 && t % 10 < 7.5; })),
  C('car', 'ミニバンの色', 'Minivan colours', 'パール、銀、紺、ワイン、水色、黒', show(() => Object.values(V.MINIVAN_COLORS).map((c, i) => V.minivan({ color: c, rental: i === 0 })), { spacing: 1.5, spin: false }), row()),
  C('car', '乗用車', 'Sedan', '2.1 × 1.0 × 1.1 · 8色', show(() => V.CAR_COLORS.slice(0, 5).map((c) => V.sedan({ color: c })), { spacing: 1.4, spin: false }), row()),
  C('car', '軽自動車', 'Kei car', '1.7 × 0.95 × 1.25 · 背の高い箱 · パステル色', show(() => V.KEI_COLORS.map((c) => V.keiCar({ color: c })), { spacing: 1.3, spin: false }), row()),
  C('car', 'SUV', 'SUV', '2.3 × 1.1 × 1.35 · 背面のスペアタイヤ、ルーフレール', drive(() => V.suv())),
  C('car', 'タクシー', 'Taxi', '屋根の行灯 · 緑ナンバー', drive(() => V.taxi())),
  C('car', '路線バス', 'Route bus', '5.6 × 1.55 · 前と中の扉が開く · 行き先表示', drive(() => V.routeBus(), (v, t) => { v.userData.doorOpen = t % 8 > 3; })),
  C('car', '観光バス', 'Tour bus', '6.0 × 1.6 · 大きな窓 · 架空の会社の塗装', drive(() => V.tourBus())),
  C('car', '軽トラック', 'Kei truck', 'サトウキビを積む', drive(() => V.keiTruck())),
  C('car', '配送トラック', 'Delivery truck', '箱の荷台 · 架空の会社名', drive(() => V.deliveryTruck())),
  C('car', '大型トラック', 'Big truck', '4.5 · コンテナ', drive(() => V.bigTruck())),
  C('car', 'スクーター・自転車', 'Scooter · bicycle', '人が乗っている', show(() => [V.scooter(), V.bicycle()], { spacing: 1.4 })),
  C('car', 'パトカー・救急車', 'Police car · ambulance', '赤色灯が回る', show(() => [V.policeCar(), V.ambulance()], { spacing: 1.8 })),
  C('car', 'モノレール', 'Monorail', '2両 · 高架の軌道にまたがって走る', monorailCard),
  // buildings
  C('building', 'コンビニ', 'Convenience store', '看板帯、自動ドア、駐車場、のぼり旗', show(() => B.convenienceStore(), { spin: false }), { view: [0.6, 0.6, 1.2] }),
  C('building', '戸建て住宅（沖縄）', 'House · Okinawa', '平らな屋根と給水タンク、門のシーサー、花ブロックの塀、ベランダの洗濯物 · 3色', show(() => [0, 1, 2].map((v) => B.house({ variant: v, floors: v === 2 ? 1 : 2, accent: [0x4f9d8f, 0xe8673c, 0x3a7fd0][v] })), { spacing: 11, spin: false }), row()),
  C('building', '古い平屋', 'Old house', '赤瓦の寄棟と白い漆喰、屋根のシーサー、縁側、ヒンプン、石垣', show(() => B.oldHouse(), { spin: false }), { view: [0.6, 0.7, 1.1] }),
  C('building', 'アパート', 'Apartment', '5階建て、ベランダ、外階段、屋上タンク', show(() => B.apartment(), { spin: false }), { view: [0.7, 0.5, 1.1] }),
  C('building', 'ガソリンスタンド', 'Petrol station', '大屋根、給油機、店、価格の看板（架空の会社）', show(() => B.gasStation(), { spin: false }), { view: [0.6, 0.6, 1.1] }),
  C('building', 'ドライブインの店', 'Drive-in', '屋根の丸い看板、車で止まる屋根付きの区画', show(() => B.driveIn(), { spin: false }), { view: [0.6, 0.6, 1.1] }),
  C('building', 'スーパー', 'Supermarket', '大きな箱、入口の屋根、カート', show(() => B.supermarket(), { spin: false }), { view: [0.6, 0.6, 1.1] }),
  C('building', 'レンタカー営業所', 'Rental car office', 'ガラスの事務所、送迎バスの乗り場（隣に駐車場を置く）', show(() => B.rentalOffice(), { spin: false }), { view: [0.6, 0.6, 1.1] }),
  C('building', '土産物屋', 'Souvenir shop', '日よけ、シーサーの置物、紅型の布、Tシャツ', show(() => B.souvenirShop(), { spin: false }), { view: [0.5, 0.5, 1.2] }),
  C('building', 'ホテル（リゾート）', 'Resort hotel', '段々のバルコニー、正面の車寄せ', show(() => B.hotel(), { spin: false }), { view: [0.6, 0.5, 1.1] }),
  C('building', '商店街の店', 'Shop houses', '1階が店、2階が住まい · パン屋、花屋、八百屋、喫茶', show(() => ['bakery', 'flowers', 'grocery', 'cafe'].map((k, i) => B.shopHouse({ kind: k, color: [0xf3e9d6, 0xe8eef0, 0xe8e2d6, 0xf1ede4][i] })), { spacing: 5, spin: false }), row()),
  C('building', '市場', 'Market', 'アーケード、魚と果物の台', show(() => B.market(), { spin: false }), { view: [0.5, 0.8, 1.0] }),
  C('building', '学校', 'School', '3階建て、時計、校庭とゴール', show(() => B.school(), { spin: false }), { view: [0.4, 0.7, 1.1] }),
  C('building', '病院・役所', 'Hospital · town hall', '白い建物と正面の屋根（赤十字の印は使わない）', show(() => [B.publicBuilding({ kind: 'hospital' }), B.publicBuilding({ kind: 'office' })], { spacing: 26, spin: false }), row()),
  C('building', '立体駐車場', 'Parking garage', '3層、スロープ、Pの看板', show(() => B.parkingGarage(), { spin: false }), { view: [0.7, 0.6, 1.0] }),
  C('building', '倉庫', 'Warehouse', '波板の壁、大きなシャッター', show(() => B.warehouse(), { spin: false }), { view: [0.6, 0.5, 1.1] }),
  C('building', '御嶽・神社', 'Utaki · shrine', '石の囲いとガジュマル（沖縄）／赤い鳥居と祠（日本の街）', show(() => [B.sacredPlace({ tree: N.gajumaru() }), B.sacredPlace({ style: 'japan' })], { spacing: 14, spin: false }), row()),
  C('building', '公園', 'Park', '芝生、すべり台、ブランコ（揺れる）、砂場、ベンチ、トイレ', show(() => B.park({ trees: [N.gajumaru(), N.deigo(), N.streetTree(), N.bougainvillea()] }), { spin: false }), { view: [0.6, 0.8, 1.0] }),
  // nature
  C('nature', 'サトウキビ畑', 'Sugar-cane field', '赤土の畝 · 風が波のように渡る（1回の描画）', show(() => N.caneField(), { spin: false }), { view: [1, 0.55, 1.0] }),
  C('nature', 'ヤシ並木', 'Palm avenue', '幹の曲がり、垂れる葉、実 · 風で揺れる', show(() => N.palmRow({ length: 18 }), { spin: false }), { view: [0.4, 0.4, 1.2] }),
  C('nature', 'デイゴ・ガジュマル', 'Deigo · banyan', '赤い花の木／気根の垂れる大木', show(() => [N.deigo(), N.gajumaru()], { spacing: 7 })),
  C('nature', '街路樹・ブーゲンビリア', 'Street tree · bougainvillea', '丸い街路樹／赤紫の花の茂み', show(() => [N.streetTree(), N.bougainvillea()], { spacing: 3 })),
  C('nature', '防風林・フクギの生け垣', 'Windbreak · fukugi hedge', 'モクマオウの列／濃い緑の生け垣', show(() => { const a = N.windbreak({ length: 12 }); const b = N.fukugiHedge({ length: 12 }); b.position.z = 3; return [a, b]; }, { spin: false }), { view: [0.6, 0.4, 1.1] }),
  C('nature', '畑（野菜）', 'Vegetable field', 'キャベツの畝 · 赤土', show(() => N.vegField(), { spin: false }), { view: [1, 0.7, 1.0] }),
  C('nature', '田んぼ', 'Rice paddy', '水を張った田 · 青い稲と実った稲', show(() => [N.ricePaddy(), N.ricePaddy({ season: 'gold' })], { spacing: 13, spin: false }), { view: [0.5, 0.6, 1.0] }),
  C('nature', '石垣・花ブロックの塀', 'Stone wall · flower-block wall', 'サンゴ石灰岩の石垣／花ブロック', show(() => { const a = N.stoneWall({ length: 6 }); const b = N.blockWall({ length: 6 }); b.position.z = 1.5; return [a, b]; }, { spin: false }), { view: [0.6, 0.4, 1.1] }),
  C('nature', '空き地', 'Grassy lot', '揺れる草むら', show(() => N.grassLot(), { spin: false }), { view: [1, 0.7, 1.0] }),
  // people
  C('people', '道の人', 'People in town', '店員、警察官、作業員、学生、農家、ジョガー、かりゆしの人、観光客、運転手、乗客', peopleCard, { view: [0.3, 0.3, 1.2], fill: 0.85 }),
];
const GROUPS = [['all', 'すべて'], ['sample', '見本'], ['road', '道'], ['car', '車'], ['gear', '設備'], ['building', '建物'], ['nature', '自然'], ['people', '人']];

// ---------- page ----------

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const grid = document.getElementById('grid');
const tabs = document.getElementById('tabs');
for (const [id, ja] of GROUPS) {
  const b = document.createElement('button');
  b.textContent = `${ja} ${id === 'all' ? ITEMS.length : ITEMS.filter((i) => i.group === id).length}`;
  b.dataset.tab = id;
  b.addEventListener('click', () => showTab(id));
  tabs.appendChild(b);
}
const cards = ITEMS.map((item) => {
  const card = document.createElement('div');
  card.className = 'card' + (item.wide ? ' wide' : '');
  card.innerHTML = `<div class="view"></div><div class="meta"><b>${item.name}</b> <span>${item.en}</span><small>${item.note}</small></div>`;
  grid.appendChild(card);
  const c = { item, card, view: card.querySelector('.view'), st: null };
  card.addEventListener('click', () => openDetail(c));
  return c;
});
const ready = (c) => (c.st ??= (() => { const st = stage(c.item.build, c.item); if (c.item.wide) st.scene.background = BG; return st; })());
function showTab(id) {
  for (const c of cards) c.card.style.display = id === 'all' || c.item.group === id ? '' : 'none';
  for (const b of tabs.children) b.classList.toggle('on', b.dataset.tab === id);
  try { localStorage.setItem('town.tab', id); } catch {}
}
let first = 'all';
try { first = localStorage.getItem('town.tab') || 'all'; } catch {}
showTab(GROUPS.some(([id]) => id === first) ? first : 'all');

const detailEl = document.getElementById('detail');
const detailView = document.getElementById('detailView');
let detail = null, detailCam = null, controls = null;
function openDetail(c) {
  const st = ready(c);
  detail = c;
  detailCam = st.camera.clone();
  controls = new OrbitControls(detailCam, detailView);
  controls.target.copy(st.target);
  controls.enableDamping = true;
  document.getElementById('dName').textContent = `${c.item.name} · ${c.item.en}`;
  document.getElementById('dNote').textContent = c.item.note;
  detailEl.classList.add('open');
}
function closeDetail() { if (!detail) return; controls.dispose(); detail = null; detailEl.classList.remove('open'); }
document.getElementById('close').addEventListener('click', closeDetail);
addEventListener('keydown', (e) => e.key === 'Escape' && closeDetail());

function resize() { renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', resize);
resize();

const timer = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.elapsedTime;
  clock.uTime.value = t;
  const H = canvas.clientHeight;
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  const jobs = detail ? [[detail, detailView, true]] : cards.map((c) => [c, c.view, false]);
  for (const [c, view, inDetail] of jobs) {
    const r = view.getBoundingClientRect();
    if (r.bottom < -300 || r.top > H + 300 || r.width === 0) continue; // build a little before it scrolls in
    const st = ready(c);
    if (r.bottom < 0 || r.top > H) continue;
    const cam = inDetail ? detailCam : st.camera;
    st.update(t, dt, inDetail);
    if (inDetail) controls.update();
    cam.aspect = r.width / r.height;
    cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(st.scene, cam);
  }
});

// debug: render cards at a fixed size into an overlay (the preview pane is narrow); the extra renderer is disposed
window.__town = {
  cards,
  ready,
  find: (name) => cards.findIndex((c) => c.item.name.includes(name)),
  sheet(ids, { cols = 2, W = 560, Hh = 400, advance = 2, pos = null, target = null } = {}) {
    const rows = Math.ceil(ids.length / cols);
    const cv = document.createElement('canvas'); cv.width = W * cols; cv.height = Hh * rows;
    const ctx = cv.getContext('2d'); ctx.font = '18px sans-serif';
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setSize(W, Hh, false); r.toneMapping = THREE.NeutralToneMapping; r.shadowMap.enabled = true; r.setClearColor(BG);
    ids.forEach((i, n) => {
      const st = ready(cards[i]);
      for (let k = 0; k < advance * 30; k++) { clock.uTime.value += 1 / 30; st.update(clock.uTime.value, 1 / 30, true); }
      const cam = st.camera.clone();
      if (pos) { cam.position.set(...pos); cam.lookAt(...(target ?? st.target.toArray())); }
      cam.aspect = W / Hh; cam.updateProjectionMatrix();
      r.render(st.scene, cam);
      ctx.drawImage(r.domElement, (n % cols) * W, Math.floor(n / cols) * Hh);
      ctx.fillStyle = '#000'; ctx.fillText(i + ' ' + cards[i].item.name, (n % cols) * W + 6, Math.floor(n / cols) * Hh + 20);
    });
    r.dispose(); r.forceContextLoss();
    let img = document.getElementById('shot');
    if (!img) { img = document.createElement('img'); img.id = 'shot'; Object.assign(img.style, { position: 'fixed', left: 0, top: 0, width: '100%', zIndex: 99 }); img.onclick = () => img.remove(); document.body.appendChild(img); }
    img.src = cv.toDataURL('image/jpeg', 0.88);
    return 'ok';
  },
};

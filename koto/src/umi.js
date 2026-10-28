// Koto — scene G+H (koto/DESIGN.md §7.8): the beach and the coast road, a single-track tram running close past the
// houses with a little station and a level crossing, the street of shops up to the Great Buddha sitting in the open.
import * as THREE from 'three';
import { mat, box } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { roof } from '../../town/src/roofs.js';
import { machiya, KOTO, M } from '../../town/src/koto.js';
import { sanmon, temizuya, shamusho, daibutsu, ishidan } from '../../town/src/koto-temples.js';
import { chaya, miyageya, yokan, kominkaCafe, eki } from '../../town/src/koto-town.js';
import { toro, fumikiri, parasol, pigeon, tobi, cat, risu } from '../../town/src/koto-props.js';
import { tram, kawabune } from '../../town/src/koto-ride.js';
import { sedan, keiCar, taxi, CAR_COLORS, KEI_COLORS } from '../../town/src/vehicles.js';
import { sakura, momiji, matsu, ume, ajisai, tsubaki, sugiForest, Falling } from '../../town/src/seasons.js';
import { person } from '../../airport/src/parts.js';
import { Agent, group, still, yawTo, FACE } from './people.js';
import { createWorld, v3 } from './world.js';

// ---------- the land ----------
const X0 = -28, X1 = 28, Z0 = -44, Z1 = 44;
const TRACK = 5.5, ROAD = [13.1, 16.5], WALL = 16.8, WATER = -0.9;
const sand = (z) => Math.max(-1.5, -0.6 - (z - 17) * 0.035 - Math.max(0, z - 26) * 0.12); // the beach, then the sea floor
const hill = (z, x) => { const t = Math.min(1, Math.max(0, (-37 - z) / 7)); return t * t * (3 - 2 * t) * (8 + 1.5 * Math.sin(x * 0.3)); };
const STEPS = { z: 18.45, n: 4, rise: 0.15, run: 0.42 }; // down from the road to the sand
const LANE = 2.0; // the street of shops, x −2…2
const GATE = -16;
function heightAt(x, z) {
  if (z > WALL) {
    if (Math.abs(x) < 1.6 && z < STEPS.z + STEPS.run / 2) { const k = Math.round((STEPS.z - z) / STEPS.run); return -0.6 + STEPS.rise * Math.min(STEPS.n, k + 1); }
    return Math.max(sand(z), WATER - 0.05);
  }
  if (z < -37) return hill(z, x);
  if (Math.abs(x) < 4.9 && z < GATE + 2.8 && z > GATE - 2.8) return 0.35; // the gate's stone floor
  return 0;
}

const VIEWS = {
  all: ['全体', v3(64, 60, 82), v3(0, 0, -2)],
  sea: ['海から', v3(5, 4, 42), v3(0, 2.5, 12)],
  tram: ['電車', v3(4.5, 2.3, 9.4), v3(-14, 1.8, 5.2)],
  station: ['駅', v3(-27, 6.5, -5), v3(-16, 1.2, 5)],
  hase: ['長谷の通り', v3(0.4, 3.0, 11.6), v3(0, 4.5, -22)],
  buddha: ['大仏', v3(3, 5.5, -18.2), v3(0, 6.2, -31)],
};
let followMe;
const world = createWorld({ views: VIEWS, shadow: 64, follow: { agent: () => followMe, idle: '', offset: [1.5, 9, 10] } });
const { scene, life, people, stills, steps } = world;
const sandMat = new THREE.MeshStandardMaterial({ color: 0xe6d6b0, roughness: 1 });
world.slab(X0, X1, Z0, WALL, (z, x) => (z < -37 ? hill(z, x) : 0), 30, 20);
world.slab(X0, X1, WALL, Z1, (z) => sand(z), 40, 1, sandMat);

// the sea: a moving surface, its cut faces, and the wash on the beach
const seaTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#3f8f9a'; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(220,245,245,0.3)'; x.lineWidth = 2; for (let k = 0; k < 30; k++) { const y = (k * 41) % 128, x0 = (k * 67) % 128; x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo(x0 + 10, y - 3, x0 + 22, y); x.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 3); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const sea = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - 22).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: seaTex, color: 0xcfeef0, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.82 }));
sea.position.set(0, WATER, (Z1 + 22) / 2); scene.add(sea);
const cutM = new THREE.MeshStandardMaterial({ color: 0x3f8f9a, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
for (const [w, x, z, ry] of [[X1 - X0, 0, Z1, 0], [Z1 - 22, X0, (Z1 + 22) / 2, Math.PI / 2], [Z1 - 22, X1, (Z1 + 22) / 2, Math.PI / 2]]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.6), cutM); f.position.set(x, WATER - 0.3, z); f.rotation.y = ry; scene.add(f); }
const foam = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, 0.7, 40, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, roughness: 0.6 }));
scene.add(foam);
const shoreZ = 17 + (-0.6 - WATER) / 0.035; // where the sand meets the water

const town = new THREE.Group(); scene.add(town);
const at = (obj, x, z, yaw = 0, y = null) => { obj.position.set(x, y ?? heightAt(x, z), z); obj.rotation.y = yaw; town.add(obj); return obj; };

// ---------- the coast road: asphalt with a centre line, a crossing, the sea wall and the steps down ----------
const roadTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#5a5e64'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#f2ede2'; for (let k = 0; k < 256; k += 32) x.fillRect(k, 31, 18, 2); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(8, 1); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const road = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, ROAD[1] - ROAD[0]).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 }));
road.position.set(0, 0.02, (ROAD[0] + ROAD[1]) / 2); road.receiveShadow = true; scene.add(road);
for (let x = -1.4; x <= 1.4; x += 0.5) at(box(0.32, 0.01, ROAD[1] - ROAD[0] - 0.2, M(0xf6f4ee)), x, (ROAD[0] + ROAD[1]) / 2, 0, 0.03); // the zebra crossing
for (const s of [1, -1]) at(box((X1 - X0) / 2 - 1.7, 0.55, 0.35, M(0xb8b4aa, { roughness: 1 })), s * ((X1 - X0) / 4 + 0.85), WALL - 0.1, 0, 0.27); // the sea wall's parapet
at(box(X1 - X0, 0.12, ROAD[0] - 12.5, M(0xc9c4b8)), 0, (ROAD[0] + 12.4) / 2, 0, 0.06); // the pavement in front of the houses
at(ishidan({ n: STEPS.n, w: 3.0, rise: STEPS.rise, run: STEPS.run, moss: false }), 0, STEPS.z, 0, -0.6);
for (const s of [1, -1]) for (let k = 0; k < 3; k++) { const p = parasol({ color: [0xe8673c, 0x3a7fd0, 0xf2c94c][k], mat2: [0x3fc1c9, 0xf2c4cf, 0xf6f4ee][k] }); p.position.set(s * (6 + k * 7.5), sand(19.5 + k), 19.5 + k); town.add(p); }

// ---------- the track: ballast, sleepers, two rails, wire poles; the station; the level crossing ----------
at(box(X1 - X0, 0.18, 2.6, M(0x8a8680, { roughness: 1, flatShading: true })), 0, TRACK, 0, 0.09);
for (let x = X0 + 0.3; x < X1; x += 0.6) at(box(0.22, 0.08, 1.9, M(0x5a4a3a)), x, TRACK, 0, 0.22);
for (const s of [0.53, -0.53]) at(box(X1 - X0, 0.08, 0.07, mat(0x8a8f96, { metalness: 0.6, roughness: 0.4 })), 0, TRACK + s, 0, 0.3);
for (let x = X0 + 4; x < X1; x += 10) { at(box(0.2, 4.4, 0.2, M(0x6b5a48)), x, TRACK - 1.9, 0, 2.2); at(box(0.12, 0.12, 2.2, M(0x3a3f4a)), x, TRACK - 0.9, 0, 4.25); }
at(box(X1 - X0, 0.025, 0.025, M(0x2a2d33)), 0, TRACK, 0, 3.86); // the contact wire
at(eki({ name: 'はせ', en: 'Hase', length: 16 }), -19, TRACK - 1.1 - 0.25 - 1.5);
const gates = [[-2.5, TRACK - 1.9, 0], [2.5, TRACK + 1.9, Math.PI]].map(([x, z, ry]) => { const f = fumikiri({ arm: 2.3 }); at(f, x, z, ry, 0); return f; });

// ---------- houses: small houses with their backs to the track, facing the road ----------
const SOUTH = [[-25.2, 'home'], [-19.8, 'sweets'], [-14.2, 'home'], [-8.6, 'tea'], [-3.0 - 0.2, null], [5.4, 'home'], [11, 'craft'], [16.6, 'home'], [22.2, 'sweets']];
for (const [x, shop] of SOUTH) if (shop) at(machiya({ w: 5.4, d: 4.4, shop, lattice: x > 10 ? 'bengara' : 'wood' }), x, TRACK + 1.4 + 0.2 + 2.2 + 0.1);
// north of the track: a western house, a café, and the street of shops (their sides right by the rails)
at(yokan(), 16, TRACK - 1.35 - 0.6 - 4, 0);
at(kominkaCafe(), 24, TRACK - 1.35 - 2.4 - 3.5 - 4, 0);
const lane = [];
for (const [side, list] of [[-1, [[() => miyageya(), 5.4, 8, 1.7], [() => chaya({ name: 'わらび餅' }), 6, 5, 1.7], [() => machiya({ shop: 'sweets', d: 8 }), 5.4, 8, 0.6]]], [1, [[() => miyageya(), 5.4, 8, 1.7], [() => machiya({ shop: 'tea', d: 9, lattice: 'bengara' }), 5.4, 9, 0.6], [() => machiya({ shop: 'craft', d: 9 }), 5.4, 9, 0.6]]]]) {
  let z = TRACK - 2.6;
  for (const [make, w, d, out] of list) { const b = make(), zc = z - w / 2; at(b, side * (LANE + 0.15 + d / 2 + out), zc, side < 0 ? Math.PI / 2 : -Math.PI / 2); lane.push(b); z -= w + 0.2; }
}

// ---------- H: the Great Buddha's precinct ----------
const gate = sanmon({ w: 9, d: 4.5 }); gate.scale.setScalar(0.78); at(gate, 0, GATE, 0, 0);
function tsuiji(len) {
  const g = new THREE.Group();
  g.add(box(len, 2.2, 0.5, M(KOTO.earth), 0, 1.1, 0));
  for (const y of [1.35, 1.7]) g.add(box(len, 0.05, 0.52, M(KOTO.plaster), 0, y, 0));
  const cap = roof({ kind: 'gable', w: len, d: 1.0, h: 0.28, onigawara: false }); cap.position.y = 2.2; g.add(cap);
  return g;
}
for (const s of [1, -1]) { at(tsuiji(21), s * 16.4, GATE); at(tsuiji(21.5), s * 26.6, GATE - 10.75, Math.PI / 2); }
at(daibutsu(), 0, -31);
world.paved(3.2, 7.5, 0, GATE - 6.4, { y: () => 0.03 });
world.paved(4, 5.6, 0, 9.6, { y: () => 0.035 }); world.paved(4, 17.4, 0, -4.5, { y: () => 0.035 }); // the street of shops
const gravel = new THREE.Mesh(new THREE.PlaneGeometry(50, 21).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 1 }));
gravel.position.set(0, 0.015, GATE - 10.6); gravel.receiveShadow = true; scene.add(gravel);
at(temizuya(), 8.5, -20.5, -Math.PI / 2);
at(shamusho({ w: 5 }), -10, -22, Math.PI / 2);
for (const s of [1, -1]) at(toro({ h: 1.8 }), s * 2.4, -20);
// along the street: a lantern at each shop corner
const nature = new THREE.Group(); scene.add(nature);
const plant = (o, x, z, yaw = 0) => { o.position.set(x, heightAt(x, z), z); o.rotation.y = yaw; nature.add(o); return o; };
for (const s of [1, -1]) for (let z = -19; z > -36; z -= 2.2) for (const dx of [0, 1.6]) plant(ajisai({ seed: Math.abs(Math.round(z * 3 + dx)) % 5 + 1, size: 0.75 }), s * (15 + dx), z + dx * 0.6, z);
[[-8, -18.5, 'sakura'], [8.5, -27, 'sakura'], [-7, -35, 'matsu'], [7, -35.5, 'matsu'], [-21, -24, 'momiji'], [21, -30, 'momiji'], [-12.5, -30, 'ume'], [12, -18.5, 'tsubaki'], [24, 10.5, 'matsu'], [-24, 1, 'sakura']].forEach(([x, z, k], i) => plant(k === 'sakura' ? sakura({ seed: i + 1 }) : k === 'matsu' ? matsu({ seed: i, lean: 0.6 }) : k === 'momiji' ? momiji({ seed: i }) : k === 'ume' ? ume({ seed: i }) : tsubaki({ seed: i }), x, z, i));
const cedars = [];
for (let z = -38.5; z > -44; z -= 2.6) for (let x = -26.5; x < 27; x += 2.9) { const jx = x + Math.sin(x * 9.1 + z * 3) * 0.9, jz = z + Math.cos(x * 5 - z) * 0.7; cedars.push([jx, hill(jz, jx), jz, 0.8 + ((x * 7 + z * 3) % 4) * 0.1]); }
scene.add(sugiForest(cedars, { seed: 3 }));
[[-12, -40], [-3, -41], [6, -39.5], [15, -40.5]].forEach(([x, z], i) => plant(momiji({ seed: i + 6 }), x, z));

town.traverse((o) => { if (o.userData.update && o.userData.kind === 'building' && !life.includes(o)) life.push(o); });
bakeStatic(town);

// ---------- the tram: waits at the station, runs east over the crossing, turns back ----------
const tr = tram({ dest: '鎌倉 Kamakura' }); scene.add(tr);
const TRAM = { len: tr.userData.len, station: -19, east: 20, v: 3.2, dwell: 9, turn: 4 };
const tripT = (TRAM.east - TRAM.station) / TRAM.v * 1.25;
const cycle = 2 * TRAM.dwell + 2 * tripT;
let tramX = TRAM.station, tramMoving = false, tramAtStation = true, tramDir = 0;
function tramAt(t) { // the tram's centre and speed at time t in its cycle
  const c = t % cycle, ease = (k) => k * k * (3 - 2 * k), dE = (k) => 6 * k * (1 - k);
  if (c < TRAM.dwell) return [TRAM.station, 0, true];
  if (c < TRAM.dwell + tripT) { const k = (c - TRAM.dwell) / tripT; return [TRAM.station + (TRAM.east - TRAM.station) * ease(k), (TRAM.east - TRAM.station) * dE(k) / tripT, false]; }
  if (c < 2 * TRAM.dwell + tripT) return [TRAM.east, 0, false];
  const k = (c - 2 * TRAM.dwell - tripT) / tripT; return [TRAM.east + (TRAM.station - TRAM.east) * ease(k), (TRAM.station - TRAM.east) * dE(k) / tripT, false];
}
// the crossing closes while the tram is moving and near it (or about to come)
let closed = 0, gateShut = false;

// ---------- cars along the coast road (keep left: eastbound on the land side) ----------
const cars = [];
[[sedan({ color: CAR_COLORS[0] }), 1], [keiCar({ color: KEI_COLORS[1] }), 1], [taxi(), 1], [sedan({ color: CAR_COLORS[3] }), -1], [keiCar({ color: KEI_COLORS[2] }), -1], [sedan({ color: CAR_COLORS[6] }), -1]].forEach(([c, dir], i) => {
  c.userData.dir = dir; c.userData.x = -26 + ((i * 19) % 52); c.rotation.y = dir > 0 ? 0 : Math.PI;
  c.position.z = dir > 0 ? ROAD[0] + 0.85 : ROAD[1] - 0.85; scene.add(c); cars.push(c);
});

// ---------- animals ----------
const animals = new THREE.Group(); scene.add(animals);
const put = (a, x, z, yaw = 0, y = null) => { a.position.set(x, y ?? heightAt(x, z), z); a.rotation.y = yaw; animals.add(a); life.push(a); return a; };
for (let k = 0; k < 8; k++) put(pigeon({ seed: k }), -3 + (k % 4) * 1.6, -22.5 - Math.floor(k / 4) * 1.2, k);
put(cat({ mode: 'sleep', color: 0x3a3a3a }), -4.6, TRACK - 3.2, 0.6, 0.12);
put(risu(), 9, -38.5, 1);
for (const [r, h, x] of [[9, 18, 0], [6, 14, 8]]) { const k = put(tobi(), x, 26, 0, 0); k.userData.radius = r; k.userData.height = h; }

// ---------- people ----------
const agent = (role, route, o = {}) => { const a = new Agent(scene, role, route, { heightAt, ...o }); people.push(a); return a; };
const onCrossing = () => people.some((a) => a.p.visible && Math.abs(a.p.position.x) < 1.8 && a.p.position.z > ROAD[0] - 0.3 && a.p.position.z < ROAD[1] + 0.3);
const gateOpen = () => !gateShut;
// from the beach: up the steps, over the road and the tracks, up the street to the Buddha, and back to the sea
function buddhaRoute(l, { photo = true, incense = true, j = 0 } = {}) {
  const r = [
    { jump: [-4 + j * 3, 21 + j], label: '浜辺から' },
    { to: [-0.6 * l, STEPS.z + 0.6] }, { to: [-0.6 * l, WALL + 0.1], label: '石段を上る' },
    { to: [-0.6 * l, ROAD[1] + 0.4] }, { until: () => !cars.some((c) => Math.abs(c.userData.x) < 5), face: FACE.up, label: '車が過ぎるのを待つ' },
    { to: [-0.6 * l, ROAD[0] - 0.4], label: '横断歩道を渡る' },
    { to: [-l, TRACK + 2.4] }, { until: gateOpen, face: FACE.up, label: '踏切で電車を待つ' },
    { to: [-l, TRACK - 2.4], label: '踏切を渡る' },
    { to: [-l, GATE + 3.2], label: '長谷の通りを歩く' }, { do: 'bow', dur: 1, face: FACE.up, label: '山門で一礼' },
    { to: [-0.5 * l, GATE - 4], label: '大仏へ' },
  ];
  if (incense) r.push({ to: [-0.9 + j, -24.2] }, { do: 'pray', dur: 2.6, face: FACE.up, label: '香炉の前で手を合わせる' });
  r.push({ to: [-3.5 + j * 2, -23 + j] }, { do: 'look', dur: 3, face: yawTo(3.5, -8), label: '大仏を見上げる' });
  if (photo) r.push({ do: 'photo', dur: 2.4, face: yawTo(3.5, -8), label: '写真を撮る' });
  r.push({ to: [0.5 * l, GATE - 4], label: '海へ戻る' }, { to: [l, GATE + 3.2] }, { to: [l, TRACK - 2.4] }, { until: gateOpen, face: FACE.down, label: '踏切で電車を待つ' }, { to: [l, TRACK + 2.4] });
  r.push({ to: [0.6 * l, ROAD[0] - 0.4] }, { until: () => !cars.some((c) => Math.abs(c.userData.x) < 5), face: FACE.down }, { to: [0.6 * l, ROAD[1] + 0.4], label: '横断歩道を渡る' }, { to: [0.6 * l, WALL + 0.1], label: '浜へ下りる' }, { to: [0.6 * l, STEPS.z + 0.6] }, { to: [4 - j * 3, 21.5], label: '浜辺でひと休み' });
  return r;
}
followMe = agent('kimonoWoman', buddhaRoute(1.2), { speed: 0.9 });
agent('kimonoMan', buddhaRoute(1.5, { incense: false }), { speed: 0.9, delay: 0.8, phase: 1 });
agent('visitor', buddhaRoute(1.0, { j: 0.6 }), { speed: 1.0, delay: 12 });
agent('umbrellaWoman', buddhaRoute(1.4, { photo: false, j: -0.5 }), { speed: 0.8, delay: 25 });
agent('senior', buddhaRoute(0.9, { photo: false, j: 0.9 }), { speed: 0.6, delay: 5 });
agent('jinbeiKid', buddhaRoute(1.6, { incense: false, j: -0.8 }), { speed: 1.0, delay: 40 });
// a school class posing in front of the Buddha while their teacher takes the picture
const cls = ['schoolGirl', 'schoolBoy', 'schoolGirl', 'schoolBoy', 'schoolGirl', 'schoolBoy', 'schoolGirl', 'schoolBoy'];
cls.forEach((r, i) => stills.push(still(scene, r, 'idle', [4.5 + (i % 4 - 1.5) * 0.75, 0, -23.4 - Math.floor(i / 4) * 0.7 + (i % 2) * 0.05], FACE.down)));
stills.push(still(scene, 'teacher', 'photo', [4.6, 0, -19.6], FACE.up));
// at the station: two waiting who board the tram and come back later
for (const [role, x, d] of [['kimonoWoman2', -16, 0], ['visitor', -21, 3]]) agent(role, [{ jump: [x, TRACK - 2.0] }, { until: () => tramAtStation && !tramMoving, face: FACE.down, label: '電車を待つ' }, { hide: cycle - 5 + d }, { to: [x + 1.5, TRACK - 2.0], label: '電車を降りる' }, { do: 'idle', dur: 4 + d }]);
stills.push(still(scene, 'senior', 'sit', [-13.5, 0.62, TRACK - 3.5], FACE.down));
// on the beach: parents on their mats, children running in and out of the waves, a surfer, shop people
stills.push(still(scene, 'swimMum', 'sit', [6.4, sand(20.4) + 0.05, 20.6], FACE.down));
stills.push(still(scene, 'swimDad', 'sit', [-13.6, sand(20.6) + 0.05, 20.8], FACE.down));
const kids = ['swimKid', 'swimKid'].map((r, i) => agent(r, [{ jump: [-8 + i * 12, shoreZ - 1] }, { to: [-5 + i * 12, shoreZ + 0.8] }, { do: 'look', dur: 1.5, face: FACE.down }, { to: [-9 + i * 12, shoreZ - 1.4] }, { to: [-7 + i * 12, shoreZ + 0.5] }, { do: 'idle', dur: 2 }], { speed: 1.3, phase: i }));
const surfer = person('swimDad', { mode: 'sit' }); scene.add(surfer);
const board = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.6, 4, 10).rotateZ(Math.PI / 2), mat(0xf6f4ee)); board.scale.y = 0.25; scene.add(board);
const boat = kawabune(); boat.position.set(10, WATER - 0.2, 36); boat.rotation.y = 0.6; scene.add(boat); life.push(boat);
for (const b of lane.slice(0, 1).concat(lane.slice(3, 4))) { b.updateMatrixWorld(true); const p = new THREE.Vector3(1.2, 0, 4.6).applyMatrix4(b.matrixWorld); stills.push(still(scene, 'teaStaff', 'idle', [p.x, 0, p.z], b.rotation.y - Math.PI / 2)); }
{ const ch = lane[1]; ch.updateMatrixWorld(true); ch.userData.seats.forEach((s, i) => { const p = new THREE.Vector3(...s).applyMatrix4(ch.matrixWorld); stills.push(still(scene, i ? 'kimonoMan' : 'yukataGirl', 'sit', [p.x, p.y - 0.3, p.z], ch.rotation.y - Math.PI / 2)); }); }

const falls = new Falling(scene, { area: [-26, 26, -40, 12], top: 12 });
steps.push((t, dt) => {
  falls.update(t, dt);
  seaTex.offset.set(t * 0.004, -t * 0.01);
  // the wash: in and out over the sand
  const fz = shoreZ + Math.sin(t * 0.7) * 0.7 - 0.2;
  foam.position.set(0, Math.max(sand(fz), WATER) + 0.03, fz); foam.material.opacity = 0.45 + 0.35 * Math.max(0, Math.sin(t * 0.7 + 1.2));
  surfer.position.set(-4 + Math.sin(t * 0.1) * 3, WATER + 0.05 + Math.sin(t * 1.4) * 0.08, 33); surfer.rotation.y = FACE.down; surfer.userData.update(t);
  board.position.set(surfer.position.x, WATER + 0.02 + Math.sin(t * 1.4) * 0.08, 33); board.rotation.y = FACE.down - Math.PI / 2;
  // the tram and the crossing
  const [x, v, atSt] = tramAt(t);
  tramX = x; tramMoving = Math.abs(v) > 0.05; tramAtStation = atSt; tramDir = Math.sign(v);
  tr.position.set(x + TRAM.len / 2 - 3.4, 0.34, TRACK); // (tram() builds its cars toward −X from the front car)
  tr.userData.speed = v; tr.userData.update(t, dt);
  const front = x + (v >= 0 ? TRAM.len / 2 : -TRAM.len / 2), approaching = tramMoving && (Math.abs(front) < 11 || Math.abs(x) < TRAM.len / 2 + 2);
  gateShut = approaching || closed > 0.05;
  closed = THREE.MathUtils.clamp(closed + (approaching ? dt : -dt) * 0.6, 0, 1);
  gates.forEach((g) => g.userData.set(approaching ? Math.max(closed, 0.001) : closed, t));
  // the cars: they stop for people on the crossing
  const busy = onCrossing();
  for (const c of cars) {
    const ud = c.userData, ahead = ud.dir > 0 ? -2.6 - ud.x : ud.x - 2.6, stop = busy && ahead > 0 && ahead < 5;
    ud.speed = THREE.MathUtils.lerp(ud.speed ?? 6, stop ? 0 : 6, Math.min(1, dt * (stop ? 4 : 1)));
    ud.x += ud.dir * ud.speed * dt;
    if (ud.x > 30) ud.x = -30; if (ud.x < -30) ud.x = 30;
    c.position.x = ud.x; c.visible = Math.abs(ud.x) < 26.5;
    ud.braking = stop; ud.update(dt);
  }
});
world.start();
window.__umi = { crossing: () => ({ shut: gateShut, closed, tramX, tramMoving }) };

// The night market (bangkok/DESIGN.md §2, §8, step 4 of §11): a Yaowarat-style road of shophouses and neon signs with
// stalls along both pavements and traffic in the middle, and off its south side, through the arch, a lane of coloured
// tents with a little stage at the end. Over two minutes the sky goes from dusk to night, the signs come on one after
// another and the stalls open; then the evening starts again. Click anyone to follow them; the story follows Noi.
// Axes: the road runs along X (−34 … 34), north is −Z; the lane runs south (+Z) from x 3 … 15. 1 m ≈ 0.76.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { mat } from '../../airport/src/parts.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { createWorld, v3 } from '../../koto/src/world.js';
import { Agent, yawTo, still } from '../../koto/src/people.js';
import { story } from '../../koto/src/story.js';
import { BK, COAL, tickFx, rng } from './common.js';
import * as K from './stalls.js';
import * as F from './foods.js';
import * as S from './street.js';
import * as W from './vehicles.js';
import * as Kit from './kit.js';
import { Queue, Seats, Shopper, Throng } from './crowd.js';
import { surfaces, patch, lightPools, ROAD } from './ground.js';
import './people.js';

const VIEWS = {
  all: [['全体', 'Overview'], v3(-10, 58, 46), v3(3, 0, 3)],
  road: [['ヤワラート通り', 'Yaowarat Road'], v3(-27, 3.0, 1.0), v3(6, 4.2, -3)],
  stall: [['ノーイの屋台', "Noi's stall"], v3(5.4, 2.3, 6.8), v3(0.8, 1.0, 4.8)],
  lane: [['テントの路地', 'The tent lane'], v3(9, 2.2, 8.2), v3(9, 1.6, 30)],
  tents: [['テントの屋根', 'Tent roofs'], v3(10, 28, 32), v3(9, 0, 23)],
  stage: [['舞台', 'The stage'], v3(9, 2.6, 31), v3(9, 1.3, 39)],
};
const world = createWorld({ views: VIEWS, shadow: 46, target: [2, 0, 10], look: 'dusk' });
const { scene, camera, controls, life, people, steps } = world;
camera.far = 400; camera.fov = 40; camera.updateProjectionMatrix();
controls.maxDistance = 150;
scene.fog = new THREE.Fog(0x1d2440, 70, 190);

// ---------- the clock: one evening is two minutes (dusk → night in the first one), then it starts again ----------
const CYCLE = 130, DARK = 60;
const clock = { t: 0, loop: 0, mode: 'auto', k: 0 };
const nightAt = (t) => (t < DARK ? (t / DARK) * (t / DARK) * (3 - (2 * t) / DARK) : t > CYCLE - 5 ? (CYCLE - t) / 5 : 1);

// ---------- the ground ----------
const WALK = 6.35; // the line people walk along on either pavement (|z|)
const tarmac = mat(0x34373f, { roughness: 0.95 }), concrete = mat(0x8a877f, { roughness: 0.95 });
world.slab(-34, 34, -12.4, 11.6, () => 0, 1, 1, tarmac);
world.slab(-3.2, 21.2, 11.6, 42, () => 0.02, 1, 1, concrete); // the lane's block
const flat = (w, d, x, z, m, y = 0.012) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m); p.position.set(x, y, z); p.receiveShadow = true; scene.add(p); return p; };
flat(12, 7.6, 9, 7.8, concrete); // the lane's mouth, from the kerb to the tents
// the surfaces (ground.js): worn asphalt between the kerbs, concrete slabs from the mouth of the lane to the stage
{ const S0 = surfaces();
  scene.add(patch(S0.road, 68, ROAD.d, 0, 0.004, 0, ROAD.len, ROAD.d));
  scene.add(patch(S0.concrete, 12, 7.6, 9, 0.014, 7.8), patch(S0.concrete, 12, 30.4, 9, 0.026, 26.8)); }
const town = new THREE.Group(); scene.add(town);
const put = (parent, o, x, z, y = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; parent.add(o); return o; };
{ const dash = mat(0xf2e6b0); for (let x = -33; x < 34; x += 2.2) put(town, new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.01, 0.1), dash), x, 0, 0.01);
  const zebra = mat(0xeeeae2); for (let z = -3.4; z <= 3.4; z += 0.85) put(town, new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.01, 0.45), zebra), 9, z, 0.012); }
// the pavements: kerb on the road side, 0.14 high
for (const x of [-25.5, -8.5, 8.5, 25.5]) put(town, S.sidewalk({ len: 17, d: 3.4 }), x, -5.7);
put(town, S.sidewalk({ len: 37, d: 3.4 }), -15.5, 5.7, 0, Math.PI);
put(town, S.sidewalk({ len: 19, d: 3.4 }), 24.5, 5.7, 0, Math.PI);
const onPavement = (x, z) => Math.abs(z) > 4 && Math.abs(z) < 7.5 && !(z > 0 && x > 3 && x < 15);
const heightAt = (x, z) => (onPavement(x, z) ? 0.14 : z > 11.6 ? 0.02 : 0);

const HALO = []; // glows to draw round the lights: [position, colour, size, when it comes on (0…1 of dark)] (see halo below)

// ---------- the shophouses on both sides, their signs, poles, wires and bulbs ----------
const SHOPS = ['goods', 'gold', 'eatery', 'goods', 'pharmacy', 'gold', 'goods', 'eatery', 'mart', 'goods', 'gold', 'eatery'];
const SIGN_FOR = { gold: ['gold', 'jewel', 'bank'], eatery: ['restaurant', 'shark', 'noodle', 'seafood', 'duck'], pharmacy: ['medicine', 'herbal', 'hotel'], goods: ['tea', 'hotel', 'pawn', 'massage'], mart: ['massage', 'hotel'] };
const BIG = ['gold', 'restaurant', 'hotel', 'jewel', 'shark', 'seafood', 'bank', 'duck', 'tea', 'pawn']; // the big ones high up
const TUBES = [BK.neonPink, BK.neonBlue, BK.neonGreen, 0xffd060, 0xff5a3a];
const DOORS = []; // shop doors people come out of and go into: [x, z on the pavement, z just inside]
for (const side of [-1, 1]) for (let i = 0; i < 22; i++) {
  const x = -31.5 + i * 3;
  if (side > 0 && x > 3 && x < 15) continue; // the lane
  const k = i + (side > 0 ? 5 : 0), shop = SHOPS[k % SHOPS.length], floors = 3 + ((k * 7) % 3);
  const H = 2.6 + (floors - 1) * 2.3 + 0.5, keys = SIGN_FOR[shop];
  // signs stacked up every facade, sticking out over the pavement: one low, one higher, and a big one near the top
  const signs = [[keys[k % keys.length], 0.9, 3.3], [keys[(k + 1) % keys.length], -0.9, Math.min(5.6, H - 2.6), TUBES[(k + 2) % 5]]];
  if (floors > 3) signs.push([BIG[(k * 3 + (side > 0 ? 1 : 0)) % BIG.length], 0.9, H - 3.8, TUBES[k % 5], 3.4, 1.25]);
  put(town, S.shophouse({ shop, floors, w: 3.0, color: S.FACADES[k % S.FACADES.length], seed: 10 + k + (side > 0 ? 50 : 0), signs, neon: TUBES[(k + 3) % 5] }), x, side * 7.4, 0, side > 0 ? Math.PI : 0);
  for (const y of [2.59, 3.15]) for (let dx = -1.2; dx <= 1.2; dx += 0.6) HALO.push([new THREE.Vector3(x + dx, y, side * 7.31), TUBES[(k + 3) % 5], 0.55, 0.25]); // (the fascia's neon)
  DOORS.push([x, side * 7.0, side * 7.9]);
}
// the lane's walls: the backs of the next blocks, a few windows lit
for (const [x0, x1] of [[-3.2, 2.9], [15.1, 21.2]]) {
  const back = put(town, new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 3.6, 30), mat(0x8f877a, { roughness: 0.95 })), (x0 + x1) / 2, 26.6, 1.8);
  back.castShadow = back.receiveShadow = true;
  const face = x0 < 0 ? x1 + 0.01 : x0 - 0.01, rnd = rng(x0 < 0 ? 41 : 42);
  for (let z = 13; z < 41; z += 2.4) for (const y of [2.2]) { const lit = rnd() < 0.4, w = put(town, new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.0, 0.8), lit ? mat(0xffd8a0, { emissive: 0xffd8a0, emissiveIntensity: 0.7 }) : mat(0x2a3040, { roughness: 0.2 })), face, z, y); w.castShadow = false; }
}
put(town, new THREE.Mesh(new THREE.BoxGeometry(18, 4, 0.4), mat(0x6f6a62, { roughness: 0.95 })), 9, 41.6, 2); // the far wall
// poles at the kerb, wires along each side and a few across, strings of bulbs over the pavement
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const POLES = { '-1': [-30, -18, -6, 6, 18, 30], 1: [-30, -18, -6, 18, 30] };
for (const side of [-1, 1]) {
  const xs = POLES[side], z = side * 4.3;
  xs.forEach((x, i) => put(town, S.pole({ transformer: i % 2 === 0 }), x, z, 0.14));
  for (let i = 0; i < xs.length - 1; i++) {
    town.add(S.wires(V(xs[i], 6.2, z), V(xs[i + 1], 6.2, z), { n: 7, sag: 0.9, seed: i + side * 10 }));
    if (xs[i + 1] - xs[i] < 20) town.add(S.bulbString(V(xs[i], 3.1, z), V(xs[i + 1], 3.1, z), { n: 26, sag: 0.5, colors: [BK.bulb] }));
  }
  town.add(S.bulbString(V(-30, 3.1, z), V(-33.8, 3.0, z), { n: 6, sag: 0.1 }));
}
for (const x of [-18, 18, -30]) town.add(S.wires(V(x, 6.0, -4.3), V(x, 6.0, 4.3), { n: 5, sag: 0.6, seed: x + 3 }));
// red lanterns strung across the road from pole to pole, and bulbs along the shop fronts under the fascias
for (const x of [-30, -18, -6, 18, 30]) town.add(S.bulbString(V(x, 5.5, -4.3), V(x, 5.5, 4.3), { n: 9, sag: 1.1, r: 0.17, colors: [0xd9342b, 0xd9342b, 0xe8b64a] }));
for (const side of [-1, 1]) for (let x = -33.5; x < 33; x += 6) {
  if (side > 0 && x + 6 > 3 && x < 15) continue; // (the lane)
  town.add(S.bulbString(V(x, 2.5, side * 7.15), V(x + 6, 2.5, side * 7.15), { n: 20, sag: 0.18, r: 0.03, colors: [BK.bulb, BK.bulb, BK.neonPink, BK.bulb, BK.neonBlue, BK.bulb, 0xffd060] }));
}
town.add(S.wires(V(6, 5.8, -4.3), V(18, 5.8, 4.3), { n: 4, sag: 0.7, seed: 8 }));
// the arch at the lane's mouth, the shrine and a sleeping dog on the north pavement
put(town, S.arch({ w: 10.2, h: 4.0 }), 9, 7.9, 0, Math.PI);
put(town, S.spiritHouse(), 11.6, -6.95, 0.14);
put(town, sleepingDog(), 12.6, -6.7, 0.14, 0.4);
function sleepingDog() {
  const g = new THREE.Group(), m = mat(0xb0885a, { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), m); body.scale.set(1.7, 0.6, 1); body.position.y = 0.12; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), m); head.position.set(0.36, 0.09, 0.06); head.scale.set(1.3, 0.8, 1); g.add(head);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), mat(0x8a6a4a)); e.position.set(0.32, 0.17, 0.06 + s * 0.07); e.scale.set(0.6, 0.4, 1.2); g.add(e); }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.2, 3, 6), m); tail.position.set(-0.35, 0.06, 0.12); tail.rotation.set(Math.PI / 2, 0, 0.9); g.add(tail);
  return g;
}

// ---------- the lane: two rows of tents, bulbs criss-crossing over the aisle, the stage ----------
const LEFT = ['hoytod', 'insects', 'mango', 'satay', 'toys', 'tomyum', 'accessories', 'kaprao', 'coconut', 'drinks']; // (Noi buys mango sticky rice at the third)
const RIGHT = ['khanomkrok', 'porkLeg', 'clothes', 'records', 'mango', 'accessories', 'kaprao', 'toys', 'durian', 'sweets'];
const stallsRoot = new THREE.Group(); scene.add(stallsRoot);
const STALLS = []; // { g, q, x, z, side, openAt, open }
for (let k = 0; k < 10; k++) for (const [row, kinds] of [[-1, LEFT], [1, RIGHT]]) {
  const x = 9 + row * 3, z = 12 + k * 2.5;
  const g = put(stallsRoot, Kit.tentStall(kinds[k], { colors: BK.tents[(k + (row > 0 ? 2 : 0)) % 5] }), x, z, 0.02, row < 0 ? Math.PI / 2 : -Math.PI / 2);
  const fx = x - row * 0.78;
  STALLS.push({ g, x, z, lane: true, openAt: 14 + k * 2.2 + (row > 0 ? 1 : 0), q: new Queue({ spot: [fx, z], step: [-row * 0.5, 0], face: row < 0 ? Math.PI : 0, max: 3 }) });
}
for (let k = 0; k <= 10; k++) { const z = 10.9 + k * 2.5; town.add(S.bulbString(V(6, 3.25, z), V(12, 3.25, z + 1.25), { n: 12, sag: 0.25, colors: [BK.bulb, BK.neonPink, BK.bulb, BK.neonBlue, BK.bulb, BK.neonGreen] })); }
const stage = put(town, S.stage(), 9, 39.2, 0.02, Math.PI);
world.stills.push(still(scene, 'musician', 'sit', [9.1, 0.42, 39.2], Math.PI / 2));

// ---------- the stalls along both pavements (north stalls face the shops: their customers stand at −Z) ----------
const NORTH = [[-29, 'mooping'], [-25, 'khaomangai'], [-21, 'fruit'], [-17, 'chestnut'], [-13, 'seafood'], [-9, 'kuayjub'], [-5, 'tea'], [-1, 'roti'], [3, 'noodle'], [14, 'somtam'], [18, 'satay'], [22, 'fruit'], [26, 'nest'], [30, 'fried']];
const SOUTH = [[-29, 'kuayjub'], [-25, 'tea'], [-21, 'mooping'], [-17, 'fruit'], [-13, 'chestnut'], [-9, 'seafood'], [-5, 'somtam'], [18, 'khaomangai'], [22, 'roti'], [26, 'noodle'], [30, 'tea']];
// and as the evening fills up, more in every gap between them (small carts between two big stalls), so the food runs
// on without a break along both pavements
NORTH.push([-27, 'roti'], [-23, 'tea'], [-19, 'somtam'], [-15, 'noodle'], [-11, 'chestnut'], [-7, 'fried'], [-3, 'mooping'], [16, 'tea'], [20, 'chestnut'], [24, 'kuayjub'], [28, 'nest'], [32, 'roti']);
SOUTH.push([-27, 'satay'], [-23, 'noodle'], [-19, 'nest'], [-15, 'seafood'], [-11, 'fried'], [-7, 'roti'], [-3, 'chestnut'], [20, 'mooping'], [24, 'somtam'], [28, 'khaomangai'], [32, 'tea']);
for (const [side, list] of [[-1, NORTH], [1, SOUTH]]) list.forEach(([x, kind], i) => {
  const g = put(stallsRoot, Kit.STALLS[kind](), x, side * 5.0, 0.14, side < 0 ? Math.PI : 0);
  const [fx, fz] = g.userData.front, spot = [x + (side < 0 ? -fx : fx), side * (5.0 + fz)];
  STALLS.push({ g, x, z: side * 5, side, openAt: 3 + ((i * 7) % 11) * 2.4 + (side > 0 ? 1.2 : 0), q: new Queue({ spot, step: [i % 2 ? 0.6 : -0.6, 0], face: side < 0 ? -Math.PI / 2 : Math.PI / 2 }) });
});
for (const s of STALLS) { s.open = true; s.q.ready = () => s.open; life.push(s.g); }
// keep what moves (fire, steam, people, the wok) out of the merge; bake the rest of the street into a few meshes
const keepMoving = (root) => root.traverse((o) => { if (o !== root && o.userData.update && o.userData.kind !== 'stall') o.userData.keep = true; });
keepMoving(stallsRoot);

// small instanced batches that never move (ice, packets on shelves, gold in the cases, the stalls' clutter) become
// plain meshes, so the bake can merge them with everything else of the same material; a batch with a colour per
// instance keeps its colours as vertex colours (one shared vertex-colour copy of its material). Strings of coloured
// bulbs stay instanced (the halos are found from them).
const vcMats = new Map();
const vcMat = (m) => { if (!vcMats.has(m)) { const c = m.clone(); c.vertexColors = true; vcMats.set(m, c); } return vcMats.get(m); };
function flattenInstances(root) {
  const list = [], m = new THREE.Matrix4(), c = new THREE.Color();
  root.traverse((o) => { if (o.isInstancedMesh && !(o.instanceColor && o.material.isMeshBasicMaterial)) list.push(o); });
  for (const im of list) {
    let moving = false;
    for (let p = im.parent; p && p !== root; p = p.parent) if (p.userData.keep || p.userData.dynamic || p.userData.kind === 'person') moving = true;
    if (moving) continue;
    const base = im.geometry.index ? im.geometry.toNonIndexed() : im.geometry.clone();
    for (const name of Object.keys(base.attributes)) if (!['position', 'normal', 'uv'].includes(name)) base.deleteAttribute(name);
    const parts = Array.from({ length: im.count }, (_, i) => {
      im.getMatrixAt(i, m); const p = base.clone().applyMatrix4(m);
      if (im.instanceColor) { im.getColorAt(i, c); p.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.attributes.position.count * 3).map((_, k) => c.toArray()[k % 3]), 3)); }
      return p;
    });
    const mesh = new THREE.Mesh(mergeGeometries(parts), im.instanceColor ? vcMat(im.material) : im.material);
    im.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.castShadow = im.castShadow; mesh.receiveShadow = im.receiveShadow;
    im.parent.add(mesh); im.removeFromParent();
  }
}

// ---------- tables of plastic stools at the road's edge and in the lane ----------
const DISHES = [F.padThaiDish, F.noodleSoup, F.khaoManGaiDish, F.kapraoDish, F.somTamDish, F.mangoStickyRice, F.moopingDish, F.tomYum];
const SEAT_PTS = [[0, 0.46, Math.PI / 2], [0, -0.46, -Math.PI / 2], [0.46, 0, Math.PI], [-0.46, 0, 0]];
let dishN = 0;
// a table at (x, z); via: where people come from; skip: which seats nobody uses (the one on the traffic side)
function table(x, z, via, { skip = -1, seats = new Seats() } = {}) {
  put(town, K.seating(), x, z, heightAt(x, z));
  SEAT_PTS.forEach(([sx, sz, yaw], i) => {
    if (i === skip) return;
    const dish = put(scene, DISHES[dishN++ % DISHES.length](), x + sx * 0.45, z + sz * 0.45, 0.51 + heightAt(x, z));
    dish.visible = false;
    seats.add({ x: x + sx * 0.92, z: z + sz * 0.92, yaw, via, out: [x + sx * 1.9, z + sz * 1.9], dish });
  });
  return seats;
}
const TABLES = []; // { x, side, seats }
for (const [side, xs] of [[-1, [-27, -19, -11, -3, 16, 24]], [1, [-27, -19, -11, 20, 28]]]) for (const x of xs) TABLES.push({ x, side, seats: table(x, side * 3.2, [x, side * 4.6], { skip: side < 0 ? 0 : 1 }) });
const noiTable = table(-1.2, 3.2, [-1.2, 4.6]); // the story's people sit here
noiTable.chairs.forEach((c) => (c.reserved = true));
const laneSeats = new Seats();
for (const [x, z] of [[6, 9.6], [12, 9.6], [6.4, 36.6], [11.6, 36.6]]) table(x, z, [9, z], { seats: laneSeats });
const noiChair = laneSeats.chairs.find((c) => c.x < 12 && c.x > 11 && c.z === 9.6); noiChair.reserved = true; // Noi's break

// ---------- Noi's cart: it comes out of the lane at dusk, pushed by Noi and her father ----------
const noiStall = Kit.padThai({ vendor: null });
const NOI_SPOT = [1.0, 5.0];
put(scene, noiStall, ...NOI_SPOT, 0.14);
const parasol = noiStall.children.find((o) => o.userData.kind === 'parasol'); parasol.userData.keep = true;
keepMoving(noiStall); flattenInstances(noiStall); bakeStatic(noiStall);
life.push(noiStall);
const noiQ = new Queue({ spot: [1.5, 5.75], step: [-0.6, 0], face: Math.PI / 2, max: 5 });
let noiOpen = false; noiQ.ready = () => noiOpen;
const cart = { mode: 'park', fold: 1, by: null };
function setCart(mode) {
  cart.mode = mode;
  if (mode === 'push') { noiOpen = false; noiStall.userData.open(false); cart.fold = 0; }
  if (mode === 'park') { noiStall.position.set(NOI_SPOT[0], 0.14, NOI_SPOT[1]); noiStall.rotation.y = 0; }
}
const openNoi = () => { cart.fold = 1; noiOpen = true; noiStall.userData.open(true); };

// ---------- traffic: east on the north half of the road, west on the south half, but nobody keeps to a lane. Bikes
// weave through the gaps and ride along the kerb, tuk-tuks nose past the taxis, and anyone boxed in drifts over the
// centre line for a moment to get round. They all stop for people crossing. ----------
const SPAN = 84, KERB = 2.75; // (the tables stand from |z| 2.75 out)
const T = W.TUK_LIVERIES;
const traffic = [ // vehicle, direction (+1 east), speed, length, half-width, where it likes to be (z)
  [W.tuktuk(T.blue), 1, 3.0, 2.1, 0.55, -1.3], [W.taxi('pink'), 1, 3.4, 3.4, 0.68, -1.2], [W.tuktuk(T.red), 1, 2.8, 2.1, 0.55, -1.6], [W.taxi('greenYellow'), 1, 3.2, 3.4, 0.68, -1.1],
  [W.scooter({ color: 0xf2b84b, rider: 'bkGirl' }), 1, 3.8, 1.3, 0.22, -2.3], [W.motoTaxi(), 1, 3.6, 1.3, 0.22, -2.4], [W.scooter({ color: 0x3a7fd0, rider: 'bkBoy' }), 1, 4.0, 1.3, 0.22, -0.6],
  [W.scooter({ color: 0xe8673c, rider: 'bkWorker', pillion: 'bkGirl' }), 1, 3.9, 1.3, 0.22, -2.2], [W.motoTaxi(), 1, 4.1, 1.3, 0.22, -1.8], [W.tuktuk(T.green), 1, 3.1, 2.1, 0.55, -2.0],
  [W.taxi('greenYellow'), -1, 3.3, 3.4, 0.68, 1.2], [W.tuktuk(T.green), -1, 2.9, 2.1, 0.55, 1.4], [W.sidecarStall(), -1, 1.8, 1.8, 0.7, 2.0], [W.taxi('pink'), -1, 3.4, 3.4, 0.68, 1.1],
  [W.scooter({ color: 0xd9342b, rider: 'bkWorker' }), -1, 3.8, 1.3, 0.22, 2.3], [W.sidecarStall({ food: 'fruit', color: 0x2f8a4a }), -1, 1.8, 1.8, 0.7, 2.0], [W.motoTaxi(), -1, 3.7, 1.3, 0.22, 2.4],
  [W.scooter({ color: 0x5fae6a, rider: 'bkBoy' }), -1, 4.0, 1.3, 0.22, 0.7], [W.scooter({ color: 0xf09a9a, rider: 'bkAuntie' }), -1, 3.5, 1.3, 0.22, 1.9], [W.tuktuk(T.blue), -1, 3.0, 2.1, 0.55, 1.6],
  [W.taxi('pink'), 1, 3.3, 3.4, 0.68, -1.4], [W.scooter({ color: 0x1c2232, rider: 'bkUncle' }), 1, 3.7, 1.3, 0.22, -2.5], [W.scooter({ color: 0xf4f0e8, rider: 'bkGirl', pillion: 'bkBoy' }), 1, 4.2, 1.3, 0.22, -0.9],
  [W.tuktuk(T.red), -1, 2.9, 2.1, 0.55, 1.3], [W.motoTaxi(), -1, 3.9, 1.3, 0.22, 2.5], [W.scooter({ color: 0x3a7fd0, rider: 'bkWorker' }), -1, 4.1, 1.3, 0.22, 0.9],
].map(([v, d, v0, len, hw, home], i) => {
  const off = hw === 0.7 ? 0.5 * d : 0; // (a sidecar stall: the box sits beside the bike, on the centre-line side)
  v.userData.car = { d, v0, len, hw, off, home, z: home - off, zt: home - off, v: v0, x: -SPAN / 2 + ((i * 37) % SPAN), bike: hw < 0.3, stuck: 0, next: 0, rnd: rng(i * 13 + 5) };
  v.rotation.y = d > 0 ? 0 : Math.PI;
  v.position.set(v.userData.car.x, 0, v.userData.car.z);
  scene.add(v); life.push(v); bakeStatic(v); // (one mesh per material; wheels, riders and the bulbs stay apart)
  return v;
});
// parked: a tuk-tuk waiting for a fare, the motorbike-taxi stand (orange vests, astride their bikes)
{ const tk = put(scene, W.tuktuk(W.TUK_LIVERIES.red), 12.2, -3.2); life.push(bakeStatic(tk));
  for (const x of [4.6, 6.0]) life.push(bakeStatic(put(scene, W.scooter({ color: 0x2c3a57, rider: 'motoTaxi' }), x, -3.35, 0, Math.PI))); }
const motoBike = bakeStatic(put(scene, W.scooter({ color: 0x5f7f9a }), 7.4, -3.35, 0, Math.PI)); // the regular's own
const BLOCKS = ['sit', 'sitEat', 'sitSip', 'sit'];
const wrap = (dx) => ((((dx + SPAN / 2) % SPAN) + SPAN) % SPAN) - SPAN / 2; // (−SPAN/2 … SPAN/2: the road is a loop)
// how far ahead is clear for car c at lateral position z: the nearest vehicle in its way going the same way, or coming
// the other way (kept well clear of), and anyone crossing on foot
function clearAhead(v, z) {
  const c = v.userData.car;
  let gap = Infinity;
  for (const u of traffic) {
    const o = u.userData.car;
    if (u === v || Math.abs(o.z + o.off - z) > o.hw + c.hw + 0.12) continue;
    const ahead = o.d === c.d ? ((((o.x - c.x) * c.d) % SPAN) + SPAN) % SPAN : wrap(o.x - c.x) * c.d;
    if (ahead < 0) continue;
    gap = Math.min(gap, ahead - (o.len + c.len) / 2 - (o.d === c.d ? 0 : 3));
  }
  for (const a of people) {
    if (!a.p.visible || BLOCKS.includes(a.p.userData.mode)) continue;
    const P = a.p.position;
    if (Math.abs(P.z) > 3.9 || Math.abs(P.z - z) > c.hw + 0.35) continue;
    const ahead = (P.x - c.x) * c.d - c.len / 2;
    if (ahead > -0.4) gap = Math.min(gap, ahead + 0.2);
  }
  return gap;
}
// is anyone alongside in the way of moving over to z?
function beside(v, z) {
  const c = v.userData.car, lo = Math.min(z, c.z) + c.off - c.hw, hi = Math.max(z, c.z) + c.off + c.hw;
  for (const u of traffic) {
    const o = u.userData.car;
    if (u !== v && Math.abs(wrap(o.x - c.x)) < (o.len + c.len) / 2 + 0.3 && o.z + o.off + o.hw > lo - 0.1 && o.z + o.off - o.hw < hi + 0.1) return true;
  }
  return false;
}
function drive(dt) {
  for (const v of traffic) {
    const c = v.userData.car, d = c.d;
    const lo = d > 0 ? -KERB + c.hw : -0.5, hi = d > 0 ? 0.5 : KERB - c.hw; // (where the middle of it may go)
    const gap = clearAhead(v, c.z + c.off);
    const want = gap < 6 ? Math.min(c.v0, Math.max(0, (gap - 0.9) * 1.4)) : c.v0;
    c.v += (want - c.v) * Math.min(1, dt * (want < c.v ? 5 : 1.2));
    // where to be across the road: boxed in → the side with the most room (bikes at once, the rest after a moment);
    // on the wrong side with someone coming → back; otherwise drift about (bikes anywhere, the rest near home)
    c.stuck = gap < 5 ? c.stuck + dt : 0; c.next -= dt;
    const wrong = (c.z + c.off) * d > 0.1;
    if (wrong && clearAhead(v, c.z + c.off) < 12) c.zt = c.home - c.off;
    else if (c.stuck > (c.bike ? 0.1 : 0.7) && c.next <= 0) {
      let best = c.z + c.off, room = gap;
      for (const s of [0.6, -0.6, 1.0, -1.0, 1.5, -1.5]) {
        const z = c.z + c.off + s * (c.bike ? 1 : 1.3);
        if (z < lo || z > hi || beside(v, z - c.off)) continue;
        const g = clearAhead(v, z);
        if (g > room + 1.5) { best = z; room = g; }
      }
      c.zt = best - c.off; c.next = 0.5;
    } else if (c.next <= 0) {
      c.next = 1.2 + c.rnd() * 3;
      c.zt = (c.bike ? lo + c.rnd() * (hi - lo) : Math.min(hi, Math.max(lo, c.home + (c.rnd() - 0.5) * 0.9))) - c.off;
    }
    const lat = (c.bike ? 1.1 : 0.5) * Math.min(1, c.v / 1.5 + 0.2) * dt;
    let dz = Math.max(-lat, Math.min(lat, c.zt - c.z));
    if (dz && beside(v, c.z + dz)) { dz = 0; c.zt = c.z; }
    c.z += dz;
    c.x += c.v * d * dt;
    if (c.x > SPAN / 2) c.x -= SPAN; else if (c.x < -SPAN / 2) c.x += SPAN;
    v.position.set(c.x, 0, c.z); v.visible = Math.abs(c.x) < 33.2;
    v.rotation.y = yawTo(d * Math.max(c.v, 0.4), dt ? dz / dt : 0); // (nosing over as it changes its line)
    v.userData.speed = c.v;
  }
}

// ---------- people ----------
const ROLES = ['tourist', 'touristA', 'touristB', 'touristC', 'touristD', 'visitor', 'woman', 'senior', 'thaiStudent', 'veiBag', 'bkAuntie', 'bkUncle', 'bkWorker', 'bkGirl', 'bkBoy', 'backpacker', 'togoB', 'studentA'];
const WHO = {
  tourist: ['旅行者', 'A traveller'], touristA: ['写真好きの旅行者', 'A traveller with a camera'], touristB: ['旅行者', 'A traveller'], touristC: ['旅行者', 'A traveller'], touristD: ['旅行者', 'A traveller'],
  visitor: ['カメラを持った旅行者', 'A traveller with a camera'], backpacker: ['バックパッカー', 'A backpacker'], woman: ['仕事帰りの人', 'On the way home from work'], senior: ['近所のおじいさん', 'A neighbour'],
  thaiStudent: ['学生', 'A student'], studentA: ['学生', 'A student'], veiBag: ['買い物の人', 'Out shopping'], togoB: ['夕ごはんを買いに来た人', 'Buying dinner'],
  bkAuntie: ['近所のおばさん', 'An auntie from round the corner'], bkUncle: ['近所のおじさん', 'An uncle from round the corner'], bkWorker: ['会社帰りの人', 'An office worker'], bkGirl: ['友だちと夜市へ', 'Out with friends'], bkBoy: ['友だちと夜市へ', 'Out with friends'],
};
const NAMES = { padthai: ['パッタイ', 'pad thai'], fruit: ['果物', 'fruit'], noodle: ['麺', 'noodles'], kuayjub: ['クイジャップ', 'kuay jub'], chestnut: ['焼き栗', 'roast chestnuts'], khaomangai: ['カオマンガイ', 'khao man gai'], roti: ['ロティ', 'roti'], nest: ['ツバメの巣', "bird's nest"], mooping: ['ムーピン', 'moo ping'], satay: ['サテ', 'satay'], seafood: ['海鮮焼き', 'grilled seafood'], somtam: ['ソムタム', 'som tam'], tea: ['タイティー', 'Thai tea'], fried: ['揚げ物', 'fried snacks'], mango: ['マンゴーもち米', 'mango sticky rice'], coconut: ['ココナツ', 'coconut'], durian: ['ドリアン', 'durian'], sweets: ['タイのお菓子', 'Thai sweets'], insects: ['虫の揚げ物', 'fried insects'], hoytod: ['ホイトード', 'hoy tod'], kaprao: ['ガパオ', 'kaprao'], clothes: ['服', 'clothes'], toys: ['おもちゃ', 'toys'], accessories: ['アクセサリー', 'accessories'], records: ['レコード', 'records'], tomyum: ['トムヤムクン', 'tom yum'], drinks: ['飲み物', 'a drink'], porkLeg: ['カオカームー', 'khao kha moo'], khanomkrok: ['カノムクロック', 'khanom krok'] };
const GOODS = ['clothes', 'toys', 'accessories', 'records']; // (not food: people look rather than queue)
const buying = (s) => { const n = NAMES[s.g.userData.type] ?? ['屋台', 'a stall']; return GOODS.includes(s.g.userData.type) ? [`${n[0]}を見る`, `Looking at ${n[1]}`] : [`${n[0]}の列に並ぶ`, `Queueing for ${n[1]}`]; };
const all = []; // every Shopper (so the story can clear them out of lines and seats)
function shopper(role, route, o = {}) { const a = new Shopper(scene, role, route, { heightAt, ...o, who: o.who ?? WHO[role] ?? ['夜市の客', 'At the market'] }); people.push(a); all.push(a); return a; }

// a market-goer's evening: in from one end of the road, a stall or two on the way, perhaps a stool at a table,
// perhaps across into the lane (its tents, the stage), and out at the other end (or into a shop)
function shopperRoute(n) {
  const rnd = rng(n * 7 + 3), d = rnd() < 0.5 ? 1 : -1;
  let side = rnd() < 0.5 ? -1 : 1;
  const lane = rnd() < 0.45, eat = rnd() < 0.45;
  const door = rnd() < 0.3 ? DOORS[Math.floor(rnd() * DOORS.length)] : null;
  const r = [];
  if (door && door[1] * side > 0 && rnd() < 0.5) r.push({ jump: [door[0], door[2]] }, { to: [door[0], door[1]] }); // out of a shop
  else r.push({ jump: [-33.2 * d, side * WALK] });
  r[0].label = ['夜市へ', 'Off to the market'];
  const visit = (x0, x1) => { // stalls on this side between x0 and x1, in walking order
    const here = STALLS.filter((s) => s.side === side && (s.x - x0) * d > 0 && (x1 - s.x) * d > 0).sort((a, b) => (a.x - b.x) * d);
    let sat = false;
    for (const s of here) {
      if (rnd() < 0.3) r.push({ to: [s.q.spot[0], side * WALK] }, { queue: s.q, label: buying(s) }, { do: 'hold', dur: 1.2 });
      const tb = TABLES.find((t) => t.side === side && Math.abs(t.x - s.x) < 3);
      if (eat && !sat && tb && rnd() < 0.35) { sat = true; r.push({ to: [tb.x, side * WALK] }, { seat: tb.seats, dur: 9 + rnd() * 9, label: ['丸椅子で食べる', 'Eating on a plastic stool'] }); }
    }
  };
  if (lane) {
    visit(-34 * d, 9);
    if (side < 0) r.push({ to: [9, -WALK] }, { to: [9, -4.3], label: ['道をわたる', 'Crossing the road'] }, { to: [9, 4.4] });
    side = 1;
    r.push({ to: [9, 8.6], label: ['アーチをくぐって路地へ', 'Through the arch into the lane'] });
    const tents = STALLS.filter((s) => s.lane && rnd() < 0.2).slice(0, 3).sort((a, b) => a.z - b.z);
    for (const s of tents) r.push({ to: [s.x < 9 ? 8.4 : 9.6, s.z] }, { queue: s.q, label: buying(s) }, { do: 'hold', dur: 1.2 });
    if (rnd() < 0.4) r.push({ to: [9 + (rnd() - 0.5) * 2, 35.6 + rnd()], label: ['舞台の歌を聞く', 'Listening at the stage'] }, { do: 'look', dur: 6 + rnd() * 8, face: yawTo(0, 1) });
    if (eat && rnd() < 0.5) r.push({ to: [9, 22] }, { seat: laneSeats, dur: 10 + rnd() * 8, label: ['路地のテーブルで食べる', 'Eating at a table in the lane'] });
    r.push({ to: [9, 8.6] }, { to: [9, WALK] });
    visit(9, 34 * d);
  } else visit(-34 * d, 34 * d);
  const home = door && door[1] * side > 0 ? door : null;
  if (home) r.push({ to: [home[0], home[1]] }, { to: [home[0], home[2]], label: ['家に帰る', 'Home'] }, { hide: 4 + rnd() * 10 });
  else r.push({ to: [33.2 * d, side * WALK], label: ['帰り道', 'Heading home'] }, { hide: 3 + rnd() * 10 });
  return r;
}
for (let n = 0; n < 40; n++) shopper(ROLES[n % ROLES.length], shopperRoute(n), { seed: n, speed: 0.75 + (n % 5) * 0.08, delay: (n * 1.7) % 34, phase: n });
// and the crowd round them: both pavements packed in both directions, a loop up and down the lane between the tents
const offEnd = (x) => Math.abs(x) > 33.2;
const throng = new Throng(scene, [
  ...[-1, 1].flatMap((side) => [
    { pts: [[-34.5, side * 6.15], [34.5, side * 6.15]], n: 68, hide: offEnd, browse: (x) => [x, side * 4.6] }, // (the stalls)
    { pts: [[34.5, side * 6.98], [-34.5, side * 6.98]], n: 68, hide: offEnd, browse: (x) => [x, side * 8.5] }, // (the shops)
  ]),
  ...[[7.6, 10.4], [8.35, 9.65]].map(([a, b]) => ({ pts: [[a, 9.0], [a, 34.6], [b, 34.6], [b, 9.0]], closed: true, n: 30, spread: 0.3, browse: (x, z) => [x < 9 ? 6 : 12, z] })),
], { heightAt, others: people, seed: 9 });
steps.push((t, dt) => throng.update(t, dt));

// ---------- the story's people (DESIGN.md §0): the regular, the traveller, three students — on the evening's clock ----------
// Each waits (hidden or idle) until their moment, and starts again with the next evening.
let cast = [];
const at = (sec) => () => clock.t >= sec;
function spawnCast(withNoi = true) {
  for (const a of cast) { if (a.quit) a.quit([noiQ, ...STALLS.map((s) => s.q)]); else a.remove(); people.splice(people.indexOf(a), 1); }
  cast = [];
  const add = (a) => (cast.push(a), people.includes(a) || people.push(a), a);
  // each of them waits for the next evening at the end: mark the evening as they start, wait until it changes
  const evening = () => { let l = -1; return [{ call: () => (l = clock.loop) }, () => clock.loop !== l]; };
  const run = (s) => s.call?.();
  // the motorbike-taxi regular: astride his bike at the stand, then across the road for his usual
  const BIKE = [motoBike.position.x + 0.12, motoBike.position.z];
  { const [mark, next] = evening(), wait = { do: 'sit', lift: 0.4, face: Math.PI, label: ['バイクにまたがって客を待つ', 'Waiting astride his bike for a fare'] };
    add(new Shopper(scene, 'motoTaxi', [{ jump: BIKE }, mark, { until: at(21), ...wait },
      { to: [BIKE[0] - 0.6, -3.9] }, { to: [-1.0, -3.6], label: ['道をわたってノーイの屋台へ', "Across the road to Noi's stall"] }, { to: [-1.0, 4.4] }, { to: [-0.8, WALK] },
      { queue: noiQ, label: ['「いつもの、辛くして」', '“The usual, extra spicy.”'] }, { seat: noiTable, only: noiTable.chairs.slice(0, 1), dur: 12, label: ['パッタイを食べる', 'Eating his pad thai'] },
      { to: [-1.0, 3.6] }, { to: [BIKE[0] - 0.6, -3.9], label: ['バイクに戻る', 'Back to his bike'] }, { to: BIKE }, { until: next, ...wait }], { heightAt, who: ['常連のバイクタクシー', 'The regular (a motorbike-taxi rider)'], speed: 0.9 })); }
  // the traveller from Japan: out of the lane, a photo of the wok, in the line, then off east with a bag
  { const [mark, next] = evening();
    add(new Shopper(scene, 'jpTraveler', [{ jump: [9, 22] }, mark, { hide: at(26) }, { to: [9, 8.6], label: ['路地のテントを見て歩く', 'Wandering out of the tent lane'] }, { to: [3.4, 6.6] },
      { do: 'photo', dur: 4, face: yawTo(-1.45, -1.75), label: ['鍋の炎を写真に撮る', 'Photographing the wok fire'] }, { to: [-0.8, 6.6] }, { queue: noiQ, label: ['ノーイの屋台に並ぶ', "In line at Noi's stall"] },
      { swap: 'jpTravelerBag' }, { do: 'hold', dur: 1.5, label: ['「コップンカー」', '“Khop khun kha!”'] }, { to: [3.4, 6.6] }, { to: [16, WALK] }, { to: [33.2, WALK], label: ['袋をさげて、通りの先へ', 'Off down the road with her bag'] },
      { swap: 'jpTraveler' }, { hide: next }], { heightAt, who: ['日本から来た旅行者', 'A traveller from Japan'], speed: 0.95 })); }
  // three students out of a shop door, one pad thai shared between them
  ['thaiStudent', 'thaiStudentB', 'thaiStudentC'].forEach((role, i) => {
    const [mark, next] = evening(), x = -19.5 + i * 0.5;
    add(new Shopper(scene, role, [{ jump: [x, 7.9] }, mark, { hide: at(41 + i * 0.6) }, { to: [x, WALK + 0.3 * i - 0.3] }, { to: [-1.4 - i * 0.6, WALK + 0.2], label: ['学校帰りに夜市へ', 'To the market after school'] },
      { queue: noiQ, label: ['ノーイの屋台に並ぶ', "In line at Noi's stall"] }, { seat: noiTable, only: noiTable.chairs.slice(1), dur: at(100), label: ['ひと皿を3人で分ける', 'One plate between three'] },
      { to: [x, WALK] }, { to: [x, 7.9], label: ['家に帰る', 'Home'] }, { hide: next }], { heightAt, who: ['学生の3人組', 'Three students'], speed: 1.0, phase: i, seed: i }));
  });
  // Noi's father: beside the cart, then at the counter handing out plates
  { const [mark, next] = evening(), serve = { do: 'serve', face: FRONT, label: ['皿にパッタイを盛る', 'Dishing up pad thai'] };
    const dad = add(new Agent(scene, 'noiDad', [{ jump: [9.7, 13.4] }, mark, { to: [9.7, 8.9], label: ['屋台車を押して通りへ', 'Pushing the cart out to the road'] }, { to: [5.2, 5.6] }, { to: [0.3, 5.6] }, { to: [0.1, 4.4] },
      { ...serve, dur: 3 }, { ...serve, until: next }], { heightAt, speed: 1.15, onStep: run }));
    dad.who = ['ノーイの父', "Noi's father"]; }
  if (withNoi) { const noi = new Agent(scene, 'noi', noiRoute(false), { heightAt, speed: 1.2, onStep: run }); noi.who = ['ノーイ（パッタイ屋の娘）', 'Noi, of the pad thai stall']; add(noi); cart.by = noi; }
}

// Noi's evening. In the story (told = true) the steps carry its lines and camera; otherwise she repeats it each evening.
const FRONT = -Math.PI / 2; // facing the customers (+Z)
function noiRoute(told) {
  const s = (o, say, shot) => (told ? { ...o, say, shot } : o);
  const r = [
    s({ jump: [9, 13.8], call: () => setCart('push'), label: ['父と屋台車を押して通りへ', 'Pushing the cart out with her father'] }, ['夕方のヤワラート。パッタイ屋の娘ノーイは、父と屋台車を押して通りへ出る。', 'Dusk on Yaowarat Road. Noi, whose family sells pad thai, pushes the cart out to the road with her father.'], [[15, 4.5, 3], [7, 0.8, 10]]),
    { do: 'push', dur: 1.2, face: Math.PI / 2 }, { to: [9, 8.6] }, { to: [4.6, 5.0] }, { to: [1.95, 5.0], call: () => {} },
    s({ to: [1.95, 4.4], call: () => setCart('park') }, null, null),
    s({ do: 'reach', dur: 2.5, face: FRONT, call: openNoi, label: ['パラソルを開いて火を入れる', 'Opening the parasol, lighting the gas'] }, ['パラソルを開いて、ガスに火を入れる。今夜もここが、ノーイの場所。', 'Up goes the parasol, on goes the gas. This is Noi’s spot, every night.'], [[5.4, 2.1, 6.6], [0.9, 1.0, 4.9]]),
    s({ until: at(30), do: 'wok', face: FRONT, label: ['パッタイを炒める', 'Frying pad thai'] }, ['空が暗くなるにつれて、看板がひとつ、またひとつと灯っていく。', 'As the sky darkens, the signs come on, one after another.'], [[-24, 3.0, 1.2], [6, 4.6, -4]]),
    s({ until: at(44), do: 'wok', face: FRONT }, ['最初のお客は、常連のバイクタクシーのおじさん。「いつもの、辛くして」', 'The first customer is a regular, a motorbike-taxi rider. “The usual, extra spicy.”'], [[-3.4, 2.0, 1.8], [0.8, 1.0, 5.4]]),
    s({ until: at(58), do: 'wok', face: FRONT }, ['日本から来た旅行者が、鍋の炎を写真に撮ってから列に並ぶ。', 'A traveller from Japan photographs the wok fire, then joins the line.'], [[5.6, 2.0, 7.4], [1.0, 1.0, 5.4]]),
    s({ until: at(72), do: 'wok', face: FRONT }, ['学校帰りの3人組。ひと皿を3人で分けて、丸椅子でわいわい。', 'Three students on their way home from school share one plate on the plastic stools.'], [[-4.2, 2.3, 1.4], [-1.2, 0.6, 3.6]]),
    s({ do: 'wok', dur: 4, face: FRONT }, ['鍋をあおるたびに炎が上がる。行列がのびていく。', 'Every toss of the wok sends up a burst of flame. The line grows.'], [[3.4, 1.35, 3.6], [1.8, 1.0, 4.9]]),
    s({ to: [3.4, 4.5], label: ['ひと休み', 'A break'] }, ['夜が更けて、父に鍋をまかせてひと休み。路地のテントへ。', 'Later on, she leaves the wok to her father and takes a break among the tents.'], { track: [-2.5, 3, -4] }),
    { to: [8.4, 8.6] }, { to: [8.4, 17] }, { to: [7.3, 17] },
    { do: 'hold', dur: 2.5, face: Math.PI, label: ['マンゴーもち米を買う', 'Buying mango sticky rice'] },
    { to: [8.4, 16] }, { to: [10.6, 9.6] }, { to: [noiChair.x, noiChair.z] },
    s({ do: 'sitEat', dur: 11, face: noiChair.yaw, call: () => (noiChair.dish.visible = true), label: ['マンゴーもち米を食べる', 'Eating mango sticky rice'] }, ['マンゴーもち米。路地の奥の舞台から、ギターの音が聞こえる。', 'Mango sticky rice. From the stage at the end of the lane comes the sound of a guitar.'], [[10.0, 1.9, 7.4], [11.6, 0.8, 9.6]]),
    { to: [10.6, 9.6], call: () => (noiChair.dish.visible = false) }, { to: [8.4, 8.6] }, { to: [3.4, 4.5] }, { to: [1.95, 4.4] },
  ];
  if (told) r.push({ do: 'wok', dur: 7, face: FRONT, say: ['屋台に戻ると、またお客が待っている。ヤワラートの夜は、まだまだ続く。', 'Back at the cart, more customers are waiting. The night on Yaowarat Road goes on and on.'], shot: [[-7, 6.5, 0.5], [1.5, 1, 5]], end: true }, { do: 'wok', dur: 99999, face: FRONT });
  else r.push({ until: () => clock.loop !== noiLoop, do: 'wok', face: FRONT });
  if (!told) r[0].call = () => { noiLoop = clock.loop; setCart('push'); };
  return r;
}
let noiLoop = 0;
spawnCast(true);

// the story (koto/src/story.js): one chapter; it restarts the evening and tells it from Noi's side
let telling = false;
const tale = story(world, {
  no: 1, heightAt, cast: ['noi'], speed: 1.2, route: () => noiRoute(true),
  chapters: [{ no: 1, href: './?story=1', title: ['ノーイの屋台の一夜', "A night at Noi's stall"] }],
  setup: () => { telling = true; clock.t = 0; clock.loop++; setMode('auto'); spawnCast(false); },
});

// ---------- click someone to follow them ----------
const $ = (id) => document.getElementById(id);
let followed = null;
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let down = null;
world.renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
world.renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(people.filter((a) => a.p.visible).map((a) => a.p), true)[0];
  if (!hit) return;
  let o = hit.object; while (o && !people.some((a) => a.p === o)) o = o.parent;
  follow(people.find((a) => a.p === o));
});
function follow(a) { followed = a; if (a) world.track(a, [2.6, 2.6, 3.6]); followLine(); }
$('followAny').onclick = () => { const list = all.filter((a) => a.p.visible); follow(list[Math.floor(Math.random() * list.length)]); };
$('views').addEventListener('click', () => { followed = null; followLine(); });
function followLine() { $('followLine').textContent = followed ? `${L(followed.who ?? ['夜市の客', 'At the market'])} — ${L(followed.label || ['歩いている', 'Walking'])}` : L(['人をクリックすると、その人について行きます。', 'Click anyone to follow them round the market.']); }
onLang(followLine);

// ---------- light: dusk → night ----------
for (const b of $('clock').children) b.onclick = () => setMode(b.dataset.v);
function setMode(m) { clock.mode = m; for (const b of $('clock').children) b.classList.toggle('on', b.dataset.v === m); }
const glow = []; // materials that light up as it gets dark: [material, its full intensity, when it comes on (0…1 of dark)]
const bulbs = []; // the bulbs (unlit materials): dim grey by day, full colour at night
const lamps = [[-20, 0], [0, 0], [20, 0], [9, 24]].map(([x, z]) => { const l = new THREE.PointLight(0xffb070, 0, 26, 1.2); l.position.set(x, 4.6, z); scene.add(l); return l; });
{ // the vertical signs light up one by one from the west, two of them flicker
  const buckets = new Map(), signs = [];
  town.updateMatrixWorld(true);
  town.traverse((o) => { if (o.userData.kind === 'vSign') signs.push(o); });
  signs.forEach((sg, i) => {
    const x = sg.getWorldPosition(new THREE.Vector3()).x, b = i === 5 || i === 21 ? `f${i}` : Math.floor((x + 34) / 8.6);
    const { h, d, neon } = sg.userData;
    HALO.push([sg.localToWorld(new THREE.Vector3(0, h / 2, d / 2 + 0.12)), neon, Math.max(h, d) * 1.15, typeof b === 'number' ? 0.2 + b * 0.075 : 0.5]);
    sg.traverse((m) => {
      if (!m.isMesh || !(m.material.emissiveIntensity >= 1.5)) return;
      const key = `${b}|${m.material.uuid}`;
      if (!buckets.has(key)) { const c = m.material.clone(); buckets.set(key, c); glow.push([c, c.emissiveIntensity, typeof b === 'number' ? 0.2 + b * 0.075 : 0.5, typeof b === 'string']); }
      m.material = buckets.get(key);
    });
  });
}
scene.updateMatrixWorld(true);
scene.traverse((o) => { if (o.userData.halo) HALO.push([o.getWorldPosition(new THREE.Vector3()), ...o.userData.halo, 0.2]); }); // (bulbs and coals on the stalls)
flattenInstances(town); flattenInstances(stallsRoot);
bakeStatic(town); bakeStatic(stallsRoot);
{ const seen = new Set(glow.map(([m]) => m));
  scene.traverse((o) => {
    if (!o.isMesh || seen.has(o.material)) return;
    const m = o.material; seen.add(m);
    if (m === COAL) return;
    if (m.isMeshBasicMaterial && o.isInstancedMesh) bulbs.push(m);
    else if (m.emissiveIntensity > 0 && m.emissive && m.emissive.getHex() !== 0) glow.push([m, m.emissiveIntensity, 0.25, false]);
  }); }
// ---------- halos: a soft glow round every bulb, lantern, sign and neon tube once it is dark, so the street glitters
// without a bloom pass (no extra render targets). One draw of points, additive, behind whatever stands in front. ----------
const halo = (() => {
  const v = new THREE.Vector3(), m4 = new THREE.Matrix4(), c = new THREE.Color();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => { // the bulbs and lanterns (instanced spheres)
    if (!o.isInstancedMesh || !o.material.isMeshBasicMaterial || !o.instanceColor) return;
    o.geometry.computeBoundingSphere();
    const r = o.geometry.boundingSphere.radius;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); v.setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld); o.getColorAt(i, c); HALO.push([v.clone(), c.getHex(), Math.min(1.3, r * 8 + 0.12), 0.15]); }
  });
  const n = HALO.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), on = new Float32Array(n), ph = new Float32Array(n);
  HALO.forEach(([p, hex, s, k], i) => { p.toArray(pos, i * 3); c.set(hex).convertLinearToSRGB().toArray(col, i * 3); size[i] = s; on[i] = k; ph[i] = (i * 0.618) % 1; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aOn', new THREE.BufferAttribute(on, 1)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 }, uT: { value: 0 }, uScale: { value: 400 } },
    vertexShader: `attribute vec3 aColor; attribute float aSize, aOn, aPh; uniform float uK, uT, uScale; varying vec3 vC; varying float vA;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = min(aSize * uScale / -mv.z, 360.0);
        vA = smoothstep(aOn, aOn + 0.12, uK) * (0.78 + 0.22 * sin(uT * (2.0 + aPh * 3.0) + aPh * 40.0)); vC = aColor; }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main() { float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; float a = exp(-r * r * 4.0) * (1.0 - r); gl_FragColor = vec4(vC * a * vA * 0.6, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
  const pts = new THREE.Points(g, material);
  pts.frustumCulled = false; pts.renderOrder = 2;
  const sz = new THREE.Vector2();
  pts.onBeforeRender = (r, s, cam) => { material.uniforms.uScale.value = r.getDrawingBufferSize(sz).y / (2 * Math.tan((cam.fov * Math.PI) / 360)); };
  scene.add(pts);
  return material.uniforms;
})();
// ---------- pools of light on the ground under the lights (ground.js), from the same list as the halos ----------
const pools = (() => {
  const pts = [];
  HALO.forEach(([p, color, size, on], i) => {
    const y = heightAt(p.x, p.z) + (p.z > 11.6 ? 0.03 : 0.01);
    if (p.y < 0.3) return;
    if (size >= 2.7) pts.push([p.x, y, p.z, color, 1.7, on]); // a sign: a wide wash of its colour
    else if (size >= 1.2) pts.push([p.x, y, p.z, color, 1.5, on]); // a lantern
    else if (size >= 0.95) pts.push([p.x, y, p.z, color, 1.3, on]); // a stall's bulb, the coals
    else if (size >= 0.5 && p.y > 2.5 && p.y < 2.7 && i % 2) pts.push([p.x, y, p.z, color, 0.8, on, 1.6]); // a fascia's neon
    else if (size < 0.5 && i % 3 === 0) pts.push([p.x, y, p.z, color, 0.7, on]); // bulbs on strings
  });
  return lightPools(scene, pts);
})();
const SKY = [new THREE.Color('#e9a47c'), new THREE.Color('#6a4f86'), new THREE.Color('#1d2440')], sky = new THREE.Color();
const HEMI = [[1.05, '#ffe0cc', '#8a7a8a'], [0.55, '#8a98d8', '#2a2434']], SUN = [[1.3, '#ff9a5a', [-60, 16, 12]], [0.3, '#a9b8e8', [-30, 50, 20]]];
const c0 = new THREE.Color(), c1 = new THREE.Color();
function light(k, t) {
  if (k < 0.5) sky.copy(SKY[0]).lerp(SKY[1], k * 2); else sky.copy(SKY[1]).lerp(SKY[2], (k - 0.5) * 2);
  scene.background.copy(sky); scene.fog.color.copy(sky);
  world.hemi.intensity = HEMI[0][0] + (HEMI[1][0] - HEMI[0][0]) * k;
  world.hemi.color.copy(c0.set(HEMI[0][1]).lerp(c1.set(HEMI[1][1]), k)); world.hemi.groundColor.copy(c0.set(HEMI[0][2]).lerp(c1.set(HEMI[1][2]), k));
  world.sun.intensity = SUN[0][0] + (SUN[1][0] - SUN[0][0]) * k; world.sun.color.copy(c0.set(SUN[0][1]).lerp(c1.set(SUN[1][1]), k));
  world.sun.position.set(...SUN[0][2].map((v, i) => v + (SUN[1][2][i] - v) * k)).add(world.sun.target.position);
  for (const [m, full, on, flicker] of glow) {
    let f = 0.12 + 0.88 * Math.min(1, Math.max(0, (k - on) / 0.12));
    if (flicker && k > on && Math.sin(t * 23) + Math.sin(t * 7.3 + 1) > 1.1) f *= 0.15;
    m.emissiveIntensity = full * f;
  }
  for (const m of bulbs) m.color.setScalar(0.35 + 0.65 * Math.min(1, k * 1.6));
  for (const l of lamps) l.intensity = 28 * Math.max(0, (k - 0.3) / 0.7);
  halo.uK.value = k; halo.uT.value = t; pools.uK.value = k;
  world.sun.castShadow = k < 0.8; // (by moonlight the shadows hardly show: skip the shadow pass)
}

// ---------- the loop ----------
steps.push((t, dt) => {
  clock.t += dt;
  // while the story is told the night holds until its last line; then the evening starts again with everyone
  const told = telling && tale.actors()[0]?.route[tale.actors()[0].i]?.dur === 99999;
  if (clock.t >= CYCLE && (!telling || told)) {
    clock.t = 0; clock.loop++;
    if (told) { telling = false; for (const a of tale.actors()) { a.remove(); people.splice(people.indexOf(a), 1); } spawnCast(true); }
  }
  clock.k = clock.mode === 'auto' ? (telling && clock.t > DARK ? 1 : nightAt(clock.t)) : clock.mode === 'night' ? 1 : 0;
  light(clock.k, t);
  tickFx(t);
  for (const s of STALLS) { const open = clock.t >= s.openAt; if (open !== s.open) { s.open = open; s.g.userData.open(open); } }
  drive(dt);
  // the cart follows whoever is pushing it (Noi), a step ahead of her; its parasol folds while it moves
  const noi = telling ? tale.actors()[0] : cart.by;
  if (cart.mode === 'push' && noi) {
    const P = noi.p.position, yaw = noi.p.rotation.y;
    noiStall.position.set(P.x + Math.cos(yaw) * 0.95, heightAt(P.x, P.z), P.z - Math.sin(yaw) * 0.95);
    noiStall.rotation.y = yaw + Math.PI;
    if (noi.p.userData.mode === 'walk') { noi.p.userData.mode = 'push'; noi.p.userData.update(t); }
  }
  const f = parasol.scale.x + ((cart.fold ? 1 : 0.18) - parasol.scale.x) * Math.min(1, dt * 2);
  parasol.scale.set(f, cart.fold ? 1 : 0.92, f);
});
setMode('auto');
setInterval(followLine, 400);
world.start();
window.__market = { clock, STALLS, traffic, throng, cast: () => cast, people, setMode, tale, follow };

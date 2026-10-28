// Koto — scene F (koto/DESIGN.md §7.6): a stone-paved lane of teahouses in the geisha district, crossed by a canal
// with willows, a stone bridge and a little shrine at its foot, and a narrow dead-end alley (ろーじ). Best at dusk.
import * as THREE from 'three';
import { bakeStatic } from '../../airport/src/merge.js';
import { machiya } from '../../town/src/koto.js';
import { hokora } from '../../town/src/koto-temples.js';
import { ochaya, ryokan, kura } from '../../town/src/koto-town.js';
import { toro, andon, takegaki, endai, kawa, ishibashi, cat, sagi } from '../../town/src/koto-props.js';
import { rickshaw } from '../../town/src/koto-ride.js';
import { sakura, momiji, matsu, yanagi, tsubaki, bamboo, mossPatch, Falling } from '../../town/src/seasons.js';
import { Agent, group, still, FACE } from './people.js';
import { createWorld, v3 } from './world.js';

// the rows along the lane, north of the canal: [make, frontage, depth, how far the front reaches past the house]
const LEFT = [
  [() => ochaya({ name: '花菱' }), 6, 10, 0.6], [() => machiya({ shop: 'home', lattice: 'bengara' }), 5.4, 11, 0.6], [() => ochaya({ name: '小松' }), 6, 10, 0.6],
  [() => ochaya({ name: '藤乃' }), 6, 10, 0.6], [() => machiya({ shop: 'tea', lattice: 'bengara' }), 5.4, 11, 0.6], [() => ochaya({ name: '鶴屋' }), 6, 10, 0.6],
  [() => machiya({ shop: 'home' }), 5.4, 11, 0.6], [() => ochaya({ name: '菊乃' }), 6, 10, 0.6],
];
const RIGHT = [
  [() => ochaya({ name: '千代' }), 6, 10, 0.6], [() => machiya({ shop: 'home', lattice: 'bengara' }), 5.4, 11, 0.6], [() => ryokan({ name: '料亭 しのぶ' }), 10, 8, 0.65],
  'roji', [() => ochaya({ name: '若菜' }), 6, 10, 0.6], [() => machiya({ shop: 'sweets', lattice: 'bengara' }), 5.4, 11, 0.6], [() => ochaya({ name: '梅香' }), 6, 10, 0.6],
];
const Z_TOP = 34.6, GAP = 0.2, ROJI = 1.8, EDGE = 1.9; // house fronts stand back EDGE from the middle of the lane
let zr = Z_TOP; for (const it of RIGHT) { if (it === 'roji') { zr -= ROJI / 2; break; } zr -= it[1] + GAP; }
const CANAL = -18;

const VIEWS = {
  all: ['全体', v3(58, 56, 72), v3(0, 0, -2)],
  lane: ['路地', v3(0.3, 4.6, 37), v3(0, 2.0, 8)],
  canal: ['白川', v3(-21.8, 3.0, -18.2), v3(3, 0.2, -17.2)],
  bridge: ['橋と社', v3(8.5, 4.4, -6.5), v3(2.5, 1.0, -15.5)],
  roji: ['ろーじ', v3(-1.3, 2.5, zr), v3(14, 1.1, zr)],
};
let followMe;
const world = createWorld({ views: VIEWS, shadow: 50, follow: { agent: () => followMe, idle: '', offset: [0.2, 4.4, -7.5] }, look: 'dusk' });
const { scene, life, people, stills, steps } = world;

// ---------- ground, canal, bridge ----------
world.slab(-22, 22, CANAL + 2, 35);
world.slab(-22, 22, -35, CANAL - 2);
world.slab(-22, 22, CANAL - 2, CANAL + 2, () => -0.9);
const town = new THREE.Group(); scene.add(town);
const at = (obj, x, z, yaw = 0, y = 0) => { obj.position.set(x, y, z); obj.rotation.y = yaw; town.add(obj); return obj; };
const river = at(kawa({ length: 44, w: 4 }), 0, CANAL); life.push(river);
const bridge = at(ishibashi({ span: 5.2, w: 3.4 }), 0, CANAL);
function heightAt(x, z) {
  if (Math.abs(x) < 1.75 && Math.abs(z - CANAL) < 2.6) return bridge.userData.deck(z - CANAL);
  if (Math.abs(z - CANAL) < 2) return -0.85; // down in the canal (the heron)
  return 0;
}
world.paved(3.6, 35 - (CANAL + 2.6), 0, (35 + CANAL + 2.6) / 2, { kind: 'granite', rough: 0.55 }); // the lane, north
world.paved(3.6, CANAL - 2.6 + 35, 0, (CANAL - 2.6 - 35) / 2, { kind: 'granite', rough: 0.55 }); // and south
for (const s of [1, -1]) world.paved(2.8, 20.2, s * 11.9, CANAL + 3.6, { rotY: Math.PI / 2 }); // the canal-side walk
world.paved(1.6, 12, EDGE + 6, zr, { rotY: Math.PI / 2 }); // the alley

// ---------- the teahouses ----------
const houses = [];
for (const [side, list] of [[-1, LEFT], [1, RIGHT]]) {
  let z = Z_TOP;
  for (const it of list) {
    if (it === 'roji') { z -= ROJI; continue; }
    const [make, w, d, out] = it, b = make(), zc = z - w / 2;
    at(b, side * (EDGE + d / 2 + out), zc, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    houses.push({ b, side, z: zc, w, d });
    z -= w + GAP;
  }
}
// south of the canal the teahouses face the water (their verandas and blinds over the canal)
['富久', '雪乃', '豆千代', '桃', '春日', '笹乃'].forEach((name, i) => { const s = i < 3 ? -1 : 1, k = i % 3; at(ochaya({ name }), s * (5.3 + k * 6.2), CANAL - 2 - 0.3 - 5.6); });
// the little shrine at the bridge foot, a bench with a parasol, lanterns along the water
at(hokora(), 4.7, CANAL + 6.4, -Math.PI / 2);
const bench = at(endai({ umbrella: true, length: 1.6 }), 3.3, CANAL + 10.4, -Math.PI / 2);
for (const x of [-8, 11]) at(toro({ kind: 'yukimi' }), x, CANAL + 4.3);
// the alley: bamboo fences, a lamp at its mouth, a tiny garden at the end
for (const s of [1, -1]) at(takegaki({ kind: 'kenninji', length: 4.4, h: 1.8 }), 13.6, zr + s * 0.95);
at(takegaki({ kind: 'kenninji', length: 2.4, h: 1.8 }), 17.6, zr, Math.PI / 2);
at(andon({ text: 'しのぶ' }), EDGE + 0.4, zr + 0.75, -Math.PI / 2);
at(toro({ kind: 'yukimi' }), 16.2, zr - 0.4);
// behind the houses
at(kura({ sake: false }), 18, 24, -Math.PI / 2);
const nature = new THREE.Group(); scene.add(nature);
const plant = (obj, x, z, yaw = 0) => { obj.position.set(x, heightAt(x, z), z); obj.rotation.y = yaw; nature.add(obj); return obj; };
[[-19, 'yanagi'], [-14.5, 'sakura'], [-10, 'yanagi'], [-5, 'sakura'], [8.5, 'yanagi'], [13, 'sakura'], [17.2, 'yanagi'], [21, 'sakura']].forEach(([x, k], i) => plant(k === 'yanagi' ? yanagi({ seed: i }) : sakura({ seed: i + 3 }), x, CANAL + 2.6, i));
[[-17.5, 27, 'matsu'], [-17, 12, 'momiji'], [-17.5, -3, 'sakura'], [18.5, 6, 'matsu'], [18, -4, 'momiji'], [16.6, zr + 0.6, 'tsubaki']].forEach(([x, z, k], i) => plant(k === 'matsu' ? matsu({ seed: i + 2, lean: 0.5 }) : k === 'momiji' ? momiji({ seed: i + 4 }) : k === 'sakura' ? sakura({ seed: i + 8 }) : tsubaki({ seed: i }), x, z, i));
plant(mossPatch({ w: 2.2, d: 1.2, seed: 11 }), 15.8, zr + 0.2);
for (const s of [1, -1]) plant(bamboo({ w: 19, d: 3, n: 60, h: 8, seed: s > 0 ? 4 : 6 }), s * 12.1, -33.3);

town.traverse((o) => { if (o.userData.update && o.userData.kind === 'building' && !life.includes(o)) life.push(o); });
bakeStatic(town);

// ---------- animals ----------
const animals = new THREE.Group(); scene.add(animals);
const put = (a, x, z, yaw = 0, y = null) => { a.position.set(x, y ?? heightAt(x, z), z); a.rotation.y = yaw; animals.add(a); life.push(a); return a; };
put(cat({ color: 0xf2ede2, mode: 'sleep' }), 3.3, CANAL + 10.0, 1.2, 0.56);
put(cat({ color: 0x3a3a3a, mode: 'sit' }), 1.6, CANAL + 0.9, FACE.east, bridge.userData.deck(0.9) + 0.48);
const walker = put(cat({ color: 0xe8a050, mode: 'walk' }), -18, CANAL + 3.4, 0);
put(sagi(), 9, CANAL - 0.6, 2.2);
put(sagi(), -15, CANAL + 0.4, -0.8);

// ---------- people ----------
const agent = (role, route, o = {}) => { const a = new Agent(scene, role, route, { heightAt, ...o }); people.push(a); return a; };
// the teahouse the maiko are expected at (花菱, the first on the left), and its door
const hana = houses[0].b; hana.updateMatrixWorld(true);
const door = new THREE.Vector3(6 / 2 - 1.05, 0, 10 / 2 + 0.6).applyMatrix4(hana.matrixWorld);
const maikoRoute = [
  { jump: [1.0, -34], label: 'お座敷へ向かう' },
  { to: [1.0, CANAL - 3] },
  { to: [1.0, CANAL + 3], label: '白川の石橋を渡る' },
  { to: [1.0, door.z - 1.5], label: '格子の路地をゆっくり歩く' },
  { to: [-0.9, door.z], label: 'お茶屋の前へ' },
  { do: 'bow', dur: 1.8, face: FACE.west, label: '女将さんにお辞儀' },
  { to: [door.x + 0.3, door.z] },
  { hide: 22, label: 'お座敷' },
  { to: [-0.9, door.z - 0.6], label: 'お座敷を終えて' },
  { do: 'bow', dur: 1.4, face: FACE.west, label: 'お辞儀をして帰る' },
  { to: [-1.0, CANAL + 3] },
  { to: [-1.0, -34], label: '路地を戻る' },
];
const pair = group(scene, ['maiko', 'maiko'], maikoRoute, { heightAt, speed: 0.55 });
people.push(...pair);
followMe = pair[0];
// 女将: at the door, bowing now and then
agent('okami', [{ jump: [door.x + 0.2, door.z + 1.2] }, { do: 'idle', dur: 9, face: FACE.east }, { do: 'bow', dur: 1.6, face: FACE.east }]);
agent('okami', [{ jump: [EDGE + 0.3, houses.find((h) => h.side > 0).z - 1.6] }, { do: 'idle', dur: 12, face: FACE.west }, { do: 'bow', dur: 1.6, face: FACE.west }]);
// strollers: down the left of the lane, a look at the canal from the bridge, back up the right
function strollLane(l, { photo = false, roji = false } = {}) {
  const r = [{ jump: [-l, 34.5] }];
  if (roji) r.push({ to: [-l, zr] }, { to: [EDGE + 0.6, zr] }, { to: [14.2, zr] }, { do: 'look', dur: 3, face: FACE.east }, { to: [EDGE + 0.6, zr] }, { to: [-l, zr - 0.5] });
  r.push({ to: [-l, CANAL + 3] });
  if (photo) r.push({ to: [-1.1, CANAL + 0.4] }, { do: 'photo', dur: 2.8, face: FACE.west }, { to: [-l, CANAL - 3] });
  r.push({ to: [-l, -33] }, { to: [l, -33] }, { to: [l, 34.5] });
  return r;
}
people.push(...group(scene, ['kimonoWoman', 'kimonoMan'], strollLane(1.1, { roji: true }), { heightAt, speed: 0.75, delay: 3 }));
agent('umbrellaWoman', strollLane(1.2), { speed: 0.7, delay: 14 });
agent('visitor', strollLane(1.3, { photo: true }), { speed: 0.9, delay: 8 });
agent('yukataGirl', strollLane(0.9, { photo: true }), { speed: 0.85, delay: 26 });
agent('kimonoWoman2', strollLane(1.25, { roji: true }), { speed: 0.75, delay: 40 });
agent('senior', strollLane(1.0), { speed: 0.55, delay: 18 });
// someone resting on the bench under the parasol, a photographer on the canal walk
{ bench.updateMatrixWorld(true); const p = new THREE.Vector3(-0.4, 0.5, 0).applyMatrix4(bench.matrixWorld); stills.push(still(scene, 'kimonoMan', 'sit', [p.x, p.y - 0.3, p.z], FACE.west)); }
stills.push(still(scene, 'tourist', 'photo', [-7, 0, CANAL + 3.4], FACE.up));

// the rickshaw passes slowly down the lane, then comes round again
const rk = rickshaw({ riders: ['furisode', 'kimonoMan'] }); scene.add(rk);
let rkZ = 30;
// petals, leaves, snow
const falls = new Falling(scene, { area: [-20, 20, -34, 34], top: 10 });
steps.push((t, dt) => {
  falls.update(t, dt);
  rkZ -= dt * 1.25; if (rkZ < -40) rkZ = 46; // (out of sight off the ends: it goes round the block)
  rk.visible = rkZ < 36 && rkZ > -36;
  rk.position.set(-0.05, heightAt(0, rkZ) + 0.02, rkZ); rk.rotation.y = FACE.up;
  rk.userData.speed = 1.25; rk.userData.update(t, dt);
  // the cat on the canal walk: a few steps one way, a sit, back again
  const u = (t * 0.06) % 2, k = u < 1 ? u : 2 - u;
  walker.position.x = -19 + k * 12; walker.rotation.y = u < 1 ? 0 : Math.PI;
  walker.userData.mode = Math.abs(Math.sin(t * 0.3)) < 0.2 ? 'sit' : 'walk';
});
world.start();

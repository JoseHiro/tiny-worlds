// 喫茶あめつち — the Japanese café (cafe/DESIGN.md §2.5): an old townhouse made into a café on a stone-paved alley.
// Lattice windows and a noren at the door, a tatami dais with low tables, a single-plank table, a counter with
// pour-over and wagashi; at the back, a glass wall onto a small courtyard garden (坪庭) where the rain falls on moss,
// a stone lantern and a water basin. Seasons change the maple and the camellia.
import * as THREE from 'three';
import { bakeStatic } from '../../airport/src/merge.js';
import { mesh, box } from '../../airport/src/parts.js';
import { createWorld, v3, LOOKS } from '../../koto/src/world.js';
import { Agent, FACE } from '../../koto/src/people.js';
import { roof } from '../../town/src/roofs.js';
import { machiya } from '../../town/src/koto.js';
import { toro, andon, endai, cat, setLamps } from '../../town/src/koto-props.js';
import { momiji, tsubaki, bamboo, mossPatch, Falling } from '../../town/src/seasons.js';
import { signTexture } from '../../town/src/buildings.js';
import { CAFE, M, setGlow, shell, cutaway, counter, pourOver, register, pastryCase, wallShelf, windowBar, chair, longTable, lowTable, plant, umbrellaStand, washiLamp, tatamiDais, zabuton, kakejiku, tsukubai } from './furniture.js';
import { cup, plate, laptop, book, notebook, Steam } from './things.js';
import { Weather, Rain, Wet, puddles, WindowDrops } from './rain.js';
import { Ambience } from './sound.js';

const VIEWS = {
  all: ['全体', v3(15, 14, -19), v3(0, 0.5, -1)],
  garden: ['坪庭', v3(1.6, 1.6, -0.6), v3(0, 0.9, -7.5)],
  alley: ['路地から', v3(4.6, 1.6, 8.9), v3(-1.2, 1.7, 4)],
  tatami: ['小上がり', v3(-0.6, 2.3, 1.2), v3(-3.8, 0.5, -1.8)],
  counter: ['カウンター', v3(1.4, 2.2, 1.6), v3(4.6, 1.1, -0.2)],
  above: ['坪庭を上から', v3(0.5, 10, -1.5), v3(0, 0, -7)],
};
const world = createWorld({ views: VIEWS, shadow: 20, target: [0, 0, -1], look: 'day' });
const { scene, camera, life, people, steps } = world;
const heightAt = () => 0;
const lift = (seat) => seat - 0.26;

// ---------- the ground: the stone-paved alley in front, the café, the garden behind ----------
const wet = new Wet();
const ishiTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#6a6660'; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) { x.fillStyle = `hsl(30, 4%, ${46 + ((r * 3 + k * 5) % 7) * 2}%)`; x.fillRect(k * 48 + (r % 2) * 24 + 2, r * 32 + 2, 44, 28); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const groundM = wet.add(new THREE.MeshStandardMaterial({ map: ishiTex, roughness: 0.85 }));
ishiTex.repeat.set(10, 8);
world.slab(-15, 15, -11, 11, () => 0, 1, 1, groundM);
const pud = puddles(scene, [[-6, 7.2, 1.0, 0.4], [5, 8.4, 0.8, 0.35], [10, 6.4, 0.6, 0.3]], 0.02);

// ---------- the café: a townhouse shell ----------
const T = 3.0;
const shop = shell({ w: 12, d: 8, h: T, wall: 0xf2ede2, wainscot: 0x5a3f2e, floor: 0x8a6a4a, frame: 0x3a2c22, brick: 'none', openings: { front: [[-5.4, -1.3, 'window'], [-0.6, 0.6, 'door'], [1.3, 5.4, 'window']], back: [[-5.6, 5.6, 'window']] } });
scene.add(shop);
const inside = new THREE.Group(); scene.add(inside);
const at = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; inside.add(o); return o; };
// the counter along the right wall: pour-over, the register, the wagashi case, shelves of pottery
const ctr = at(counter({ len: 4, front: CAFE.walnut, top: 0xd8c4a0 }), 4.2, 0.6, -Math.PI / 2);
at(pourOver(), 4.25, -0.4, -Math.PI / 2, ctr.userData.top);
at(register(), 4.15, 1.9, -Math.PI / 2, ctr.userData.top);
at(pastryCase({ len: 1.2, items: 'wa' }), 4.2, -2.1, -Math.PI / 2);
at(wallShelf({ len: 3.2 }), 5.86, 0, -Math.PI / 2, 1.5);
at(plant({ kind: 'small' }), 4.15, 2.45, 0, ctr.userData.top);
// the tatami dais with two low tables and cushions
const dais = at(tatamiDais({ w: 4.6, d: 3.0 }), -3.5, -1.6);
const DT = dais.userData.top;
for (const x of [-4.6, -2.4]) { at(lowTable({ w: 0.9, d: 0.6 }), x, -1.6, 0, DT); for (const z of [-2.25, -0.95]) at(zabuton({ color: z < -1.6 ? 0x7a2f3a : 0x2f4a6b }), x, z, 0, DT); }
// the garden counter facing the glass, with chairs
const gbar = at(windowBar({ len: 4.2, h: 0.75 }), 1.6, -3.55, Math.PI);
const GSEATS = [0.0, 1.2, 2.4, 3.4];
for (const x of GSEATS) at(chair({ kind: 'bentwood', color: CAFE.walnut }), x, -2.95, Math.PI / 2);
// the single-plank table
at(longTable({ len: 3.2, w: 0.9, color: 0x7a5a40 }), -1.8, 2.2);
const PLANK = [-3.0, -1.8, -0.6];
for (const x of PLANK) { at(chair({ color: CAFE.walnut }), x, 1.6, -Math.PI / 2); at(chair({ color: CAFE.walnut }), x, 2.8, Math.PI / 2); }
// lamps, the scroll, the umbrella stand
for (const x of PLANK) at(washiLamp({ drop: 1.2 }), x, 2.2, 0, T);
for (const x of [0.4, 1.6, 2.8]) at(washiLamp({ drop: 1.1, r: 0.16 }), x, -3.3, 0, T);
for (const x of [-4.6, -2.4]) at(washiLamp({ drop: 1.3 }), x, -1.6, 0, T);
at(washiLamp({ drop: 0.9 }), 4.2, 0.4, 0, T);
at(kakejiku({ text: '一期一会' }), -5.88, 1.8, Math.PI / 2, 1.7);
at(umbrellaStand({ n: 2 }), -1.2, 3.5);
const lamps = [[-1.8, 2.0, 2.2], [1.6, 2.0, -3.0], [-3.5, 1.8, -1.6], [4.0, 2.0, 0.4]].map(([x, y, z]) => { const l = new THREE.PointLight(0xffc27a, 4, 8, 1.4); l.position.set(x, y, z); scene.add(l); return l; });

// ---------- the front: lattice over the windows, the noren, the sign, a tiled eave, the roof ----------
const outside = new THREE.Group(); scene.add(outside);
const out = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; outside.add(o); return o; };
for (const [x0, x1] of [[-5.4, -1.3], [1.3, 5.4]]) for (let x = x0 + 0.05; x < x1; x += 0.09) out(box(0.035, 1.85, 0.05, M(0x5a3f2e)), x, 4.13, 0, 0.75 + 0.925);
const sign = mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: signTexture('喫茶 あめつち', { w: 512, h: 128, font: 'bold 60px serif', bg: '#5a3f2e', fg: '#f2ede2' }) }), 0, 2.55, 4.14); outside.add(sign);
const hisashi = roof({ kind: 'gable', w: 12.4, d: 1.8, h: 0.32, material: 'ichimonji', ridge: false }); out(hisashi, 0, 4.1, 0, 2.75);
const mainRoof = roof({ kind: 'gable', w: 12.8, d: 9.6, h: 2.0 }); mainRoof.position.y = T; scene.add(mainRoof);
out(andon({ text: '珈琲' }), 1.2, 4.6);
out(endai({ umbrella: false, length: 1.6 }), -3.4, 4.9);
// the noren: three strips that sway at the door
const noren = new THREE.Group(); noren.position.set(0, 2.3, 4.2); noren.userData.dynamic = true; scene.add(noren);
{ const tex = signTexture('あめつち', { w: 256, h: 192, font: 'bold 64px serif', bg: '#2f4a6b', fg: '#f2ede2' });
  for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.85, 1, 3), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 })); st.geometry.translate(0, -0.425, 0); const uv = st.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 3); st.position.x = (k - 1) * 0.4; noren.add(st); } }
// the neighbours, and across the alley a low wall with a tiled cap and bamboo behind
out(machiya({ shop: 'home', d: 9 }), -8.9, -0.5); out(machiya({ shop: 'sweets', d: 9, lattice: 'bengara' }), 8.9, -0.5);
function tiledWall(len, h = 2.0) { const g = new THREE.Group(); g.add(box(len, h, 0.4, M(0xe9e1d0), 0, h / 2, 0)); g.add(box(len, 0.5, 0.42, M(0x5a3f2e), 0, 0.25, 0)); const cap = roof({ kind: 'gable', w: len, d: 0.9, h: 0.25, onigawara: false }); cap.position.y = h; g.add(cap); return g; }
out(tiledWall(30), 0, 10.2);
const across = bamboo({ w: 28, d: 1.6, n: 70, h: 6, seed: 4 }); across.position.set(0, 0, 11); scene.add(across);

// ---------- the courtyard garden (坪庭) behind the glass ----------
const garden = new THREE.Group(); scene.add(garden);
const gp = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; garden.add(o); return o; };
gp(tiledWall(12.4, 2.6), 0, -9.7); gp(tiledWall(5.6, 2.6), -6.2, -6.9, Math.PI / 2); gp(tiledWall(5.6, 2.6), 6.2, -6.9, Math.PI / 2);
const gravel = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.4).rotateX(-Math.PI / 2), wet.add(new THREE.MeshStandardMaterial({ color: 0xc9c4b6, roughness: 1 }))); gravel.position.set(0, 0.02, -6.9); garden.add(gravel);
for (const [x, z, w, d] of [[-3.5, -6, 3.4, 2.2], [3.5, -8.2, 3.0, 2.0], [-0.4, -8.6, 3.2, 1.4]]) gp(mossPatch({ w, d, seed: Math.abs(Math.round(x * 3)) + 2 }), x, z);
for (let k = 0; k < 5; k++) { const st = mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.1, 9), M(0x8a867c, { flatShading: true }), -1.5 + k * 0.9, 0.06, -4.7 - (k % 2) * 0.35); garden.add(st); } // stepping stones
gp(toro({ h: 1.6 }), -3.6, -7.6);
const basin = gp(tsukubai(), 2.4, -6.4, -0.4);
const BS = new THREE.Vector3(2.4, 0.4, -6.4);
const trees = new THREE.Group(); scene.add(trees);
const maple = momiji({ seed: 4 }); maple.position.set(-0.6, 0, -8.2); maple.scale.setScalar(0.9); trees.add(maple);
const cam2 = tsubaki({ seed: 3, size: 0.8 }); cam2.position.set(4.8, 0, -8.4); trees.add(cam2);
const gbamboo = bamboo({ w: 2.2, d: 1.2, n: 12, h: 5, seed: 7 }); gbamboo.position.set(-5.0, 0, -8.6); scene.add(gbamboo);
bakeStatic(inside); bakeStatic(outside); bakeStatic(garden);

// ---------- things on the tables, steam ----------
const steam = new Steam(scene, { max: 160 });
const put = (o, x, z, y, yaw = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; scene.add(o); if (o.userData.hot) steam.add(o); return o; };
const LT = DT + 0.34, BT = gbar.userData.top, PT = 0.58;
put(cup({ kind: 'chawan' }), -4.75, -1.5, LT); put(cup({ kind: 'yunomi' }), -4.45, -1.75, LT); put(plate({ food: 'dora' }), -4.6, -1.35, LT);
put(cup({ kind: 'yunomi', color: 0x2f4a6b }), -2.4, -1.75, LT); put(book({ color: 0x5a3f2e }), -2.4, -1.45, LT);
const lap = put(laptop({ screen: 'design' }), 0.0, -3.5, BT, 0); put(cup({ kind: 'mug', color: 0xb08a6a }), 0.42, -3.45, BT);
put(notebook({ color: 0xe2a9a0 }), 2.4, -3.5, BT); put(cup({ kind: 'chawan', color: 0x6b4a35 }), 2.8, -3.45, BT);
put(notebook(), -3.0, 2.0, PT); put(cup({ kind: 'yunomi' }), -2.65, 1.95, PT); put(book({ color: 0xe8e2d4 }), -0.6, 2.4, PT, Math.PI / 2); put(cup({ kind: 'yunomi', color: 0x3a3430 }), -0.25, 2.45, PT);
put(cup({ kind: 'mug', color: 0xc9a07a }), -1.8, 2.5, PT); put(plate({ food: 'toast' }), -1.5, 2.45, PT);

// ---------- people ----------
const weather = new Weather({ start: 'drizzle' });
const sound = new Ambience();
let doorT = 0; const ring = () => { doorT = 1.6; sound.bell(); };
const agents = [];
const agent = (role, route, o = {}) => { const a = new Agent(scene, role, route, { heightAt, onStep: (s) => s.call?.(), ...o }); people.push(a); agents.push(a); return a; };
const sitter = (role, x, z, face, seat, acts, phase = 0) => agent(role, [{ jump: [x, z] }, ...acts.map(([m, d]) => ({ do: m, dur: d, face, lift: lift(seat) }))], { phase });
const CH = 0.38, ZB = DT + 0.07;
sitter('kimonoWoman', -4.6, -0.95, FACE.up, ZB, [['sitChat', 8], ['sitSip', 5], ['sitChat', 6]], 1);
sitter('kimonoWoman2', -4.6, -2.25, FACE.down, ZB, [['sitSip', 5], ['sitChat', 9]], 2);
sitter('reader', -2.4, -0.95, FACE.up, ZB, [['sitRead', 15], ['sitSip', 4], ['sitThink', 5]], 3);
const mac = sitter('macWorker', 0.0, -2.92, FACE.up, CH, [['sitType', 14], ['sitThink', 6], ['sitSip', 4], ['sitType', 9]], 4);
sitter('studentA', 2.4, -2.92, FACE.up, CH, [['sitWrite', 12], ['sitThink', 4], ['sitStretch', 3]], 5);
sitter('designer', -3.0, 1.62, FACE.down, CH, [['sitWrite', 10], ['sitSip', 4], ['sitThink', 5]], 6);
sitter('kimonoMan', -1.8, 2.78, FACE.up, CH, [['sitSip', 6], ['sitThink', 6]], 7);
sitter('oldman', -0.6, 2.78, FACE.up, CH, [['sitRead', 14], ['sitSip', 4]], 8);
// the staff: pour-over at the counter, and carrying trays to the tables
agent('teaStaff', [{ jump: [5.2, -0.4] }, { do: 'pour', dur: 8, face: FACE.west }, { to: [5.2, 1.9] }, { do: 'idle', dur: 4, face: FACE.west }, { to: [5.2, -0.4] }]);
agent('teaStaff', [{ jump: [3.2, 0.6] }, { do: 'hold', dur: 3, face: FACE.west }, { to: [-1.0, 0.4] }, { to: [-1.0, -0.5] }, { do: 'hold', dur: 3, face: FACE.west }, { to: [1.0, -2.2] }, { do: 'hold', dur: 2.5, face: FACE.up }, { to: [3.2, 0.6] }], { speed: 0.9, phase: 2 });
// someone in from the rain: under an umbrella along the alley, in through the noren, umbrella in the stand,
// an order at the counter, a seat at the plank table, and back out
const comer = agent('rainComer', [
  { jump: [-14, 6.6] }, { to: [0, 5.4] }, { call: ring }, { to: [0, 3.4] }, { call: () => (comer.p.userData.indoors = true) },
  { to: [-1.0, 3.3] }, { do: 'hold', dur: 1.5, face: FACE.west }, { to: [3.2, 1.4] }, { do: 'idle', dur: 4, face: FACE.east },
  { to: [-0.6, 1.0] }, { to: [-0.6, 1.62] }, { do: 'sitSip', dur: 35, face: FACE.down, lift: lift(CH) }, { do: 'sitThink', dur: 10, face: FACE.down, lift: lift(CH) },
  { to: [0, 3.4] }, { call: ring }, { to: [0, 5.4] }, { call: () => (comer.p.userData.indoors = false) }, { to: [14, 6.6] }, { hide: 25 },
], { delay: 3, speed: 0.85 });
// passers-by in the alley
const umb = [comer];
for (const [role, x0, x1, z, d] of [['umbrellaWoman', 14, -14, 7.8, 6], ['rainComer', -14, 14, 7.0, 15], ['takuhatsu', 14, -14, 8.4, 30], ['kimonoMan', -14, 14, 7.4, 40]]) { const a = agent(role, [{ jump: [x0, z] }, { to: [x1, z] }, { hide: 10 }], { delay: d, speed: role === 'takuhatsu' ? 0.6 : 0.85 }); umb.push(a); }
// the café cat asleep on the tatami
const kitty = cat({ color: 0x3a3a3a, mode: 'sleep' }); kitty.position.set(-5.3, DT, -0.5); kitty.rotation.y = 0.8; scene.add(kitty); life.push(kitty);

// ---------- rain: over the garden and the alley ----------
const rain = new Rain(scene, { zones: [[-6, 6, -9.5, -4.3, 0], [-15, 15, 4.9, 11, 0]], top: 7, count: 2200, splashes: 120 });
rain.dripLine([-6.2, 2.45, 5.0], [6.2, 2.45, 5.0], 0, 20); // from the tiled eave
rain.dripLine([-6.2, 3.0, -4.6], [6.2, 3.0, -4.6], 0, 16); // from the roof over the garden side
shop.updateMatrixWorld(true);
const panes = [];
for (const side of ['front', 'back']) { const wg = shop.userData.walls[side]; for (const p of wg.userData.panes) { const c = new THREE.Vector3((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0); wg.localToWorld(c); panes.push({ center: c, normal: wg.userData.normal.clone(), w: p.x1 - p.x0, h: p.y1 - p.y0 }); } }
const drops = new WindowDrops(scene, panes);
// ripples on the basin
const ripples = Array.from({ length: 4 }, (_, i) => { const r = mesh(new THREE.RingGeometry(0.03, 0.05, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8f0f4, transparent: true, opacity: 0.6, depthWrite: false })); r.position.copy(BS).y += 0.0; r.userData.t = i / 4; scene.add(r); return r; });
const petals = new Falling(scene, { area: [-6, 6, -9.5, -4.2], top: 5 });

// ---------- panel and loop ----------
const $ = (id) => document.getElementById(id);
const WJA = { clear: '晴れ', cloudy: 'くもり', drizzle: '小雨', rain: '本降り', after: '雨上がり' };
for (const b of $('weather').children) b.onclick = () => { weather.hold(b.dataset.v); [...$('weather').children].forEach((x) => x.classList.toggle('on', x === b)); };
let drift = false, driftT = 0, driftI = 0;
const DRIFT = [[[1.6, 1.6, -0.6], [0, 0.9, -7.5]], [[-0.6, 2.3, 1.2], [-3.8, 0.5, -1.8]], [[4.6, 1.6, 8.9], [-1.2, 1.7, 4]], [[1.4, 2.2, 1.6], [4.6, 1.1, -0.2]], [[-1.0, 1.4, -2.2], [-4.6, 0.6, -1.6]]];
$('drift').onclick = () => { drift = !drift; driftT = 0; $('drift').classList.toggle('on', drift); };
$('sound').onclick = () => { const on = sound.toggle(); $('sound').textContent = on ? '音 · ON' : '音 · OFF'; $('sound').classList.toggle('on', on); };
const sky = new THREE.Color(), grey = new THREE.Color('#8f98a3');
let uiT = 0;
steps.push((t, dt) => {
  weather.update(dt);
  const r = weather.rain, look = world.look, L = LOOKS[look];
  const dim = 1 - 0.5 * weather.cloud;
  world.hemi.intensity = L.hemi[0] * (0.6 + 0.4 * dim); world.sun.intensity = L.sun[0] * dim;
  sky.set(L.sky ?? '#e8eef2').lerp(grey, look === 'night' ? 0.15 : weather.cloud * 0.55); scene.background.copy(sky);
  const dark = Math.min(1, { morning: 0.25, day: 0, dusk: 0.6, night: 1 }[look] + weather.cloud * 0.35);
  setGlow(dark); setLamps(dark); lamps.forEach((l) => (l.intensity = 3 + dark * 12));
  rain.update(t, dt, r); drops.update(dt, r); wet.update(weather.wet); pud.update(weather.wet); petals.update(t, dt);
  steam.update(t, dt); sound.update(dt, r);
  doorT = Math.max(0, doorT - dt);
  noren.children.forEach((c, k) => { c.rotation.x = Math.sin(t * 1.6 + k) * 0.06 + (doorT > 0 ? 0.6 : 0); });
  for (const a of umb) a.p.userData.umbrella = !a.p.userData.indoors && r > 0.15;
  lap.userData.typing = mac.p.userData.mode === 'sitType'; lap.userData.update(t, dt);
  // the basin: rain makes rings on it
  ripples.forEach((rp) => { rp.userData.t = (rp.userData.t + dt * 0.9) % 1; const k = rp.userData.t; rp.scale.setScalar(0.5 + k * 4); rp.material.opacity = (1 - k) * 0.6 * Math.min(1, r * 2); rp.position.set(BS.x + Math.sin(rp.id * 3.1) * 0.12, BS.y - 0.01, BS.z + Math.cos(rp.id * 1.7) * 0.12); });
  if (drift && ((driftT -= dt) <= 0)) { driftT = 14; const [p, q] = DRIFT[driftI++ % DRIFT.length]; world.cam(v3(...p), v3(...q), 7); }
  cutaway(shop, camera);
  across.visible = camera.position.y < 5 && camera.position.z < 10;
  mainRoof.visible = camera.position.y < T + 0.5 || (camera.position.z > 9 && camera.position.y < 6);
  if ((uiT -= dt) <= 0) { uiT = 0.5; $('weatherLine').textContent = `いまの天気：${WJA[weather.state]}${weather.mode === 'auto' ? '（自動で移り変わります）' : ''}`; }
});
world.start();
window.__cafe = { weather, rain, steam, shop, sound };

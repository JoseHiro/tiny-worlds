// Koto — scene A+B (koto/DESIGN.md §7.5): the sloping approach street lined with shops, the stone steps, and the
// temple precinct behind its gate. One diorama block; everything that never moves is merged by material.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clock } from '../../sealife/src/kit.js';
import { mat, mesh, box } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { roof } from '../../town/src/roofs.js';
import { machiya, hondo, KOTO, M } from '../../town/src/koto.js';
import { sanmon, gojunoto, shoro, temizuya, karesansui, pondBridge, ishidan, ishigaki, bochi } from '../../town/src/koto-temples.js';
import { chaya, miyageya, kura, ryokan, kominkaCafe } from '../../town/src/koto-town.js';
import { toro, andon, chochin, michishirube, takegaki, setLamps, cat, pigeon, sagi, tobi } from '../../town/src/koto-props.js';
import { rickshaw } from '../../town/src/koto-ride.js';
import { sakura, momiji, matsu, ume, tsubaki, bamboo, mossPatch, Falling, setSeason, onSeason, SEASONS } from '../../town/src/seasons.js';
import { Agent, worshipRoute, strollRoute, sweepRoute, group, still, yawTo, FACE, v3 } from './people.js';

const $ = (id) => document.getElementById(id);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(SEASONS.spring.sky);
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 700);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = 1.48;
controls.minDistance = 4;
controls.maxDistance = 300;

const hemi = new THREE.HemisphereLight('#fffaf0', '#c9c4b4', 1.4);
const sun = new THREE.DirectionalLight('#fff4e0', 2.5);
sun.position.set(40, 60, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 200 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.target.position.set(0, 0, -10);
scene.add(hemi, sun, sun.target);

// ---------- the ground: a slab with a cut-away soil edge, the street sloping up to the terrace ----------
let look = 'day';
const X0 = -28, X1 = 28, Z0 = -56, Z1 = 36, TERRACE = 3.5;
const Hs = (z) => 2.4 * (1 - z / 34); // the street: 0 at the foot (z 34), 2.4 at the steps (z 0)
const STEP = { z0: -0.2, rise: 0.18, run: 0.42, n: 6 };
// where a walker's feet are: street, the stone steps, the terrace (and the gate's stone floor)
function heightAt(x, z) {
  if (z > STEP.z0 + STEP.run / 2) return Hs(z);
  const k = Math.round((STEP.z0 - z) / STEP.run);
  if (k < STEP.n) return Hs(STEP.z0) + STEP.rise * (k + 1);
  if (Math.abs(x) < 7 && z < -3.5 && z > -11.5) return TERRACE + 0.5;
  return TERRACE;
}
const soil = mat(0x8a6a4a, { roughness: 1 }), grass = new THREE.MeshStandardMaterial({ color: SEASONS.spring.grass, roughness: 1 });
function slab(x0, x1, z0, z1, top, seg = 1) {
  const geo = new THREE.BoxGeometry(x1 - x0, 1, z1 - z0, 1, 1, seg);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (x0 + x1) / 2, z = p.getZ(i) + (z0 + z1) / 2; p.setXYZ(i, x, p.getY(i) > 0 ? top(z) : -1.6, z); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, [soil, soil, grass, soil, soil, soil]);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
slab(X0, X1, -3, Z1, Hs, 24);
slab(X0, X1, Z0, -3, () => TERRACE);
onSeason((name, S) => { grass.color.set(S.grass); if (look === 'day') scene.background.set(S.sky); });

// stone paving (石畳), and the raked gravel of the precinct
const paving = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#9d968a'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -24 : 0; x < 256; x += 48) { g.fillStyle = `hsl(35, 8%, ${62 + ((x * 7 + y * 3) % 9)}%)`; g.fillRect(x + 2, y + 2, 44, 28); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
})();
function paved(w, len, place, { y = (z) => 0, segs = 1 } = {}) {
  const t = paving.clone(); t.needsUpdate = true; t.repeat.set(w / 3, len / 3);
  const geo = new THREE.PlaneGeometry(w, len, 1, segs).rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  place(m);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, y(p.getZ(i) + m.position.z));
  geo.computeVertexNormals();
  m.receiveShadow = true; scene.add(m);
  return m;
}
paved(6.2, Z1 - STEP.z0, (m) => m.position.set(0, 0, (Z1 + STEP.z0) / 2), { y: (z) => Hs(z) + 0.03, segs: 24 }); // the street
paved(3.2, 24.5, (m) => m.position.set(0, 0, -11.6 - 12.25), { y: () => TERRACE + 0.03 }); // the precinct path, gate to hall
paved(2.0, 5.2, (m) => { m.position.set(4.2, 0, -14.6); }, { y: () => TERRACE + 0.025 }).rotation.y = Math.PI / 2; // a branch to the font
const gravel = new THREE.Mesh(new THREE.PlaneGeometry(26, 27).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 1 }));
gravel.position.set(0, TERRACE + 0.015, -24.5); gravel.receiveShadow = true; scene.add(gravel);

// ---------- A: the street of shops ----------
const town = new THREE.Group(); scene.add(town);
const life = []; // things with update(t, dt)
const at = (obj, x, z, yaw = 0, y = null) => { obj.position.set(x, y ?? heightAt(x, z), z); obj.rotation.y = yaw; town.add(obj); return obj; };
// shops along each side: [make, frontage, depth, how far the shop front reaches out]
const LEFT = [
  [() => machiya({ shop: 'sweets', d: 9 }), 5.4, 9, 0.6], [() => miyageya(), 5.4, 8, 1.7], [() => chaya(), 6, 5, 1.7],
  [() => machiya({ shop: 'tea', d: 9, lattice: 'bengara' }), 5.4, 9, 0.6], [() => kura(), 5, 8, 1.3], [() => machiya({ shop: 'home', d: 9 }), 5.4, 9, 0.6],
];
const RIGHT = [
  [() => miyageya(), 5.4, 8, 1.7], [() => kominkaCafe(), 8, 7, 2.4], [() => machiya({ shop: 'craft', d: 9, lattice: 'bengara' }), 5.4, 9, 0.6],
  [() => ryokan({ name: '旅館 こまち' }), 10, 8, 0.9], [() => machiya({ shop: 'sweets', d: 9 }), 5.4, 9, 0.6],
];
const shops = [];
for (const [side, list, z0] of [[-1, LEFT, 34.6], [1, RIGHT, 35.4]]) {
  let z = z0;
  for (const [make, w, d, out] of list) {
    const b = make(); const zc = z - w / 2;
    at(b, side * (3.3 + d / 2 + out), zc, side < 0 ? Math.PI / 2 : -Math.PI / 2);
    shops.push({ b, side, z: zc });
    z -= w + 0.25;
  }
}
at(michishirube({ lines: [['←', '本堂・五重塔'], ['→', '竹林の小径']] }), 3.7, 34.5, -Math.PI / 2);
at(michishirube({ kind: 'stone', lines: [['', '光明寺']] }), -3.6, 33.8, Math.PI / 2);
for (const z of [30, 18, 6]) at(andon({ text: '甘味' }), -3.5, z - 0.3, Math.PI / 2);
for (const z of [26, 12]) { const c = chochin({ text: '参道', size: 1.0 }); at(c, 3.6, z, -Math.PI / 2, Hs(z) + 2.7); life.push(c); }
// behind the shops: gardens, trees, a bamboo thicket on the left
const nature = new THREE.Group(); scene.add(nature);
const plant = (obj, x, z, yaw = 0) => { obj.position.set(x, heightAt(x, z), z); obj.rotation.y = yaw; nature.add(obj); return obj; };
plant(bamboo({ w: 10, d: 16, n: 110, h: 9, seed: 5 }), -22.5, 22);
[[22, 30, 'sakura', 1], [23, 18, 'momiji', 2], [21.5, 6, 'matsu', 3], [-21, 8, 'sakura', 4], [-22, 2, 'ume', 1], [15.5, 27, 'tsubaki', 2], [-16, 30, 'tsubaki', 3]].forEach(([x, z, k, s]) => plant(k === 'sakura' ? sakura({ seed: s }) : k === 'momiji' ? momiji({ seed: s }) : k === 'matsu' ? matsu({ seed: s, lean: 0.4 }) : k === 'ume' ? ume({ seed: s }) : tsubaki({ seed: s }), x, z, s));

// ---------- the steps and the stone wall under the terrace ----------
at(ishidan({ n: STEP.n, w: 4.2, rise: STEP.rise, run: STEP.run }), 0, STEP.z0, 0, Hs(STEP.z0));
for (const s of [1, -1]) at(ishigaki({ length: 25.6, height: 1.0 }), s * 15.0, -2.75, 0, Hs(-3) - 0.1);
for (const s of [1, -1]) at(toro({ h: 1.6 }), s * 2.9, 0.6);

// ---------- B: the precinct ----------
const T = TERRACE;
at(sanmon(), 0, -7.5, 0, T);
function tsuiji(len) { // the earthen wall either side of the gate, capped with tiles
  const g = new THREE.Group();
  g.add(box(len, 2.2, 0.5, M(KOTO.earth), 0, 1.1, 0));
  for (const y of [1.35, 1.7]) g.add(box(len, 0.05, 0.52, M(KOTO.plaster), 0, y, 0));
  const cap = roof({ kind: 'gable', w: len, d: 1.0, h: 0.28, onigawara: false }); cap.position.y = 2.2; g.add(cap);
  return g;
}
for (const s of [1, -1]) at(tsuiji(20.5), s * 17.75, -7.5, 0, T);
for (const s of [1, -1]) at(tsuiji(47), s * 27.6, -31.5, Math.PI / 2, T);
at(temizuya(), 7, -14.6, -Math.PI / 2, T);
const bell = at(shoro(), -13, -15, Math.PI / 2, T); life.push(bell);
at(gojunoto(), 15, -30, 0, T);
at(hondo(), 0, -45, 0, T);
at(karesansui({ w: 11, d: 7 }), -15, -29.5, 0, T);
const pond = at(pondBridge({ w: 10, d: 8 }), -16, -45.5, 0, T); life.push(pond);
at(bochi({ n: 6 }), 20, -49, 0, T);
for (const z of [-14, -20, -26, -32]) for (const s of [1, -1]) at(toro(), s * 2.8, z, 0, T);
at(takegaki({ kind: 'koetsu', length: 6 }), -15, -24.6, 0, T);
plant(bamboo({ w: 40, d: 4, n: 90, h: 10, seed: 9 }), 0, -54);
[[-6, -11, 'sakura', 5, true], [6.5, -10.5, 'sakura', 6], [-22, -40, 'momiji', 4], [-9, -50, 'momiji', 5], [9.5, -50, 'momiji', 6], [-22, -26, 'matsu', 7], [12, -14, 'ume', 2], [22, -38, 'sakura', 7], [-23, -16, 'momiji', 7], [23, -20, 'tsubaki', 5]].forEach(([x, z, k, s, w]) => plant(k === 'sakura' ? sakura({ seed: s, weeping: !!w }) : k === 'momiji' ? momiji({ seed: s }) : k === 'matsu' ? matsu({ seed: s, lean: 0.7 }) : k === 'ume' ? ume({ seed: s }) : tsubaki({ seed: s }), x, z, s));
for (const [x, z] of [[-9, -22], [-21, -33], [10, -40], [-5, -40]]) plant(mossPatch({ seed: x }), x, z);

// building updates (noren, the bell, koi, lanterns) — collected before everything static is merged
town.traverse((o) => { if (o.userData.update && o.userData.kind === 'building' && !life.includes(o)) life.push(o); });
bakeStatic(town);

// ---------- animals ----------
const animals = new THREE.Group(); scene.add(animals);
const put = (a, x, z, yaw = 0, y = null) => { a.position.set(x, y ?? heightAt(x, z), z); a.rotation.y = yaw; animals.add(a); life.push(a); return a; };
for (let k = 0; k < 9; k++) put(pigeon({ seed: k }), -3 + (k % 5) * 1.4 + (k > 4 ? 0.6 : 0), -33.6 - (k > 4 ? 1.1 : 0) - (k % 2) * 0.4, k * 0.9);
put(cat({ mode: 'sleep' }), 5.2, -2.9, 0.4, Hs(-3) + 1.05);
put(cat({ color: 0x3a3a3a, mode: 'sit' }), -3.8, 9.5, 0, Hs(9.5) + 0.12);
put(sagi(), -13.8, -44.6, 2.4, T - 0.2);
const kite = put(tobi(), 0, 0, 0, 0); kite.userData.radius = 34; kite.userData.height = 30;

// ---------- people ----------
const people = [];
const agent = (role, route, o = {}) => { const a = new Agent(scene, role, route, { heightAt, ...o }); people.push(a); return a; };
const followMe = agent('kimonoWoman', worshipRoute(1.9, { garden: true }), { speed: 0.9 });
agent('kimonoMan', worshipRoute(2.3), { speed: 0.9, delay: 0.5, phase: 1 });
agent('kimonoWoman2', worshipRoute(2.6, { pagoda: false, j: 0.8 }), { speed: 0.85, delay: 18 });
agent('visitor', worshipRoute(1.7, { wash: false, j: -0.9 }), { speed: 1.1, delay: 9 });
agent('furisode', worshipRoute(2.0, { garden: true, j: 1.2 }), { speed: 0.8, delay: 30 });
agent('umbrellaWoman', worshipRoute(2.5, { pagoda: false }), { speed: 0.85, delay: 44 });
agent('senior', worshipRoute(1.8, { pagoda: false, j: -0.4 }), { speed: 0.6, delay: 4 });
agent('obaachan', worshipRoute(2.2, { pagoda: false }), { speed: 0.6, delay: 60 });
// the school trip: the teacher's flag first, the class in pairs behind
people.push(...group(scene, ['teacher', 'schoolGirl', 'schoolGirl', 'schoolBoy', 'schoolBoy', 'schoolGirl', 'schoolBoy'], worshipRoute(1.7, { wash: false, j: -1.6 }), { heightAt, speed: 1.0, delay: 12 }));
// strollers along the shops
agent('kimonoWoman', strollRoute(2.1, [[29, -1], [19, 1], [8, -1]]), { delay: 2, speed: 0.8, phase: 2 });
agent('yukataGirl', strollRoute(1.8, [[24, 1], [13, -1]]), { delay: 7, speed: 0.9 });
agent('visitor', strollRoute(2.4, [[27, 1], [16, -1], [5, 1]]), { delay: 22, speed: 1.0 });
agent('kimonoKid', strollRoute(1.9, [[21, -1]]), { delay: 26, speed: 0.9 });
agent('tourist', strollRoute(2.2, [[31, 1], [10, -1]]), { delay: 36, speed: 1.0 });
// temple people
agent('monkBroom', sweepRoute(-2.2, -13, -31), { speed: 0.5 });
const stills = [];
stills.push(still(scene, 'monk', 'hold', [-10.4, T, -13.6], FACE.west));
stills.push(still(scene, 'gardener', 'photo', [-20.6, T, -25.2], FACE.west));
for (const [k, x] of [[0, -16], [1, -14.2]]) stills.push(still(scene, k ? 'kimonoMan' : 'kimonoWoman2', 'sit', [x, T + 0.32, -33.4], FACE.down));
// at the tea house: two on the benches, the waitress with her tray
const ch = shops.find((s) => s.b.userData.building === 'chaya');
const seatAt = (b, [lx, ly, lz]) => new THREE.Vector3(lx, ly, lz).applyMatrix4(b.matrixWorld);
{ ch.b.updateMatrixWorld(true); const yaw = ch.b.rotation.y - Math.PI / 2;
  for (const [i, s] of ch.b.userData.seats.entries()) { const p = seatAt(ch.b, s); stills.push(still(scene, i ? 'yukataGirl' : 'kimonoWoman', 'sit', [p.x, p.y - 0.3, p.z], yaw)); }
  const w = seatAt(ch.b, [2.2, 0.1, 3.6]); stills.push(still(scene, 'teaStaff', 'idle', [w.x, w.y, w.z], ch.b.rotation.y - Math.PI / 2)); }
// two neighbours talking in front of the house at the top
{ const h = shops.at(5); stills.push(still(scene, 'obaachan', 'idle', [-3.0, Hs(h.z - 0.6), h.z - 0.6], yawTo(0.4, 1))); stills.push(still(scene, 'senior', 'idle', [-2.6, Hs(h.z + 0.6), h.z + 0.6], yawTo(-0.4, -1))); }

// the rickshaw: up the left lane, round at the top, down the right lane, round at the foot
const rk = rickshaw({ riders: ['kimonoWoman', 'kimonoMan'] }); scene.add(rk);
const RK = { x: 0.8, top: 3.5, foot: 33, v: 1.5 };
const rkLen = 2 * (RK.foot - RK.top) + 2 * Math.PI * RK.x;
function rickshawAt(s) {
  s = ((s % rkLen) + rkLen) % rkLen;
  const L = RK.foot - RK.top, C = Math.PI * RK.x;
  if (s < L) return [-RK.x, RK.foot - s, FACE.up];
  if ((s -= L) < C) { const a = s / RK.x; return [-RK.x * Math.cos(a), RK.top - RK.x * Math.sin(a), FACE.up - a]; }
  if ((s -= C) < L) return [RK.x, RK.top + s, FACE.down];
  s -= L; const a = s / RK.x; return [RK.x * Math.cos(a), RK.foot + RK.x * Math.sin(a), FACE.down - a];
}
let rkS = 4;
// petals, leaves and snow over the street and the precinct
const falls = [new Falling(scene, { area: [-12, 12, 0, 36], top: 10 }), new Falling(scene, { area: [-26, 26, -54, -6], top: 12 })];

// ---------- views, seasons, dusk ----------
const VIEWS = {
  all: ['全体', v3(70, 62, 78), v3(0, 2, -9)],
  street: ['参道', v3(0.5, 8.5, 42), v3(0, 3.2, 14)],
  gate: ['山門', v3(1.5, 9.5, 12), v3(0, 5.5, -7)],
  precinct: ['境内', v3(26, 18, -6), v3(0, 4, -30)],
  hall: ['本堂', v3(11, 11, -13), v3(0, 7, -42)],
  pagoda: ['五重塔', v3(25, 8, -5.5), v3(13, 9, -30)],
  garden: ['庭', v3(-7, 7.5, -21), v3(-16, 4, -32)],
};
let fly = null, following = false;
function goView(k) {
  following = false; $('follow').classList.remove('on');
  const [, p, t] = VIEWS[k];
  fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: p.clone(), t1: t.clone() };
  [...$('views').children].forEach((b) => b.classList.toggle('on', b.dataset.v === k));
}
for (const [k, [ja]] of Object.entries(VIEWS)) { const b = document.createElement('button'); b.textContent = ja; b.dataset.v = k; b.onclick = () => goView(k); $('views').appendChild(b); }
camera.position.copy(VIEWS.all[1]); controls.target.copy(VIEWS.all[2]);
$('views').children[0].classList.add('on');
for (const [k, S] of Object.entries(SEASONS)) { const b = document.createElement('button'); b.textContent = S.ja; b.dataset.v = k; b.onclick = () => { setSeason(k); [...$('seasons').children].forEach((x) => x.classList.toggle('on', x === b)); }; $('seasons').appendChild(b); }
$('seasons').children[0].classList.add('on');
function applyLook() {
  const dusk = look === 'dusk';
  hemi.intensity = dusk ? 0.9 : 1.4; hemi.color.set(dusk ? '#ffd9c0' : '#fffaf0'); hemi.groundColor.set(dusk ? '#7a6a7a' : '#c9c4b4');
  sun.intensity = dusk ? 1.1 : 2.5; sun.color.set(dusk ? '#ff9a5a' : '#fff4e0');
  sun.position.set(dusk ? 70 : 40, dusk ? 22 : 60, dusk ? 10 : 30);
  scene.background.set(dusk ? '#d9a88a' : SEASONS[seasonNow()].sky);
  setLamps(dusk ? 1 : 0);
  [...$('time').children].forEach((b) => b.classList.toggle('on', b.dataset.v === look));
}
const seasonNow = () => [...$('seasons').children].find((b) => b.classList.contains('on'))?.dataset.v ?? 'spring';
for (const b of $('time').children) b.onclick = () => { look = b.dataset.v; applyLook(); };
$('follow').onclick = () => { following = !following; $('follow').classList.toggle('on', following); fly = null; [...$('views').children].forEach((b) => b.classList.remove('on')); };

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const timer = new THREE.Clock();
let uiT = 0;
function step(t, dt) {
  clock.uTime.value = t;
  for (const o of life) o.userData.update(t, dt);
  for (const a of people) a.update(t, dt);
  for (const s of stills) s.update(t);
  for (const f of falls) f.update(t, dt);
  // the rickshaw: it stops a moment at the top for its passengers to look at the gate
  const pause = ((rkS % rkLen) + rkLen) % rkLen, L = RK.foot - RK.top;
  const atTop = pause > L - 0.05 && pause < L + 0.1 && (rk.userData.wait = (rk.userData.wait ?? 0) + dt) < 4;
  if (!atTop) { if (pause > L + 0.1) rk.userData.wait = 0; rkS += RK.v * dt; }
  const [x, z, yaw] = rickshawAt(rkS);
  rk.position.set(x, Hs(z) + 0.02, z); rk.rotation.y = yaw;
  rk.userData.speed = atTop ? 0 : RK.v;
  rk.userData.update(t, dt);
}
renderer.setAnimationLoop(() => {
  const dt = Math.min(timer.getDelta(), 0.05), t = timer.elapsedTime;
  step(t, dt);
  if ((uiT -= dt) <= 0) { uiT = 0.4; if (following) $('followLine').textContent = followMe.label; }
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.6);
    const k = fly.t * fly.t * (3 - 2 * fly.t);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    controls.target.lerpVectors(fly.t0, fly.t1, k);
    if (fly.t >= 1) fly = null;
  } else if (following) {
    const p = followMe.p.position;
    camera.position.lerp(v3(p.x + 6, p.y + 5.5, p.z + 8), Math.min(1, dt * 1.5));
    controls.target.lerp(v3(p.x, p.y + 0.9, p.z), Math.min(1, dt * 2.5));
  }
  controls.update();
  renderer.render(scene, camera);
});

// debug: one frame at a fixed size (the preview pane is narrow); advance the people in time
window.__koto = {
  renderer, scene, camera, controls, people, followMe, goView, VIEWS, setSeason, heightAt,
  setLook: (k) => { look = k; applyLook(); },
  view(k) { const [, p, t] = VIEWS[k]; fly = null; following = false; camera.position.copy(p); controls.target.copy(t); controls.update(); },
  follow() { following = true; const p = followMe.p.position; camera.position.set(p.x + 6, p.y + 5.5, p.z + 8); controls.target.set(p.x, p.y + 0.9, p.z); controls.update(); },
  advance(sec) { const t0 = timer.elapsedTime; for (let k = 0; k < sec * 20; k++) step(t0 + k / 20, 1 / 20); },
  snapshot(w = 1440, h = 900) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera); const url = renderer.domElement.toDataURL('image/jpeg', 0.88); resize(); return url; },
  info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, heapMB: (performance.memory?.usedJSHeapSize ?? 0) / 1e6 | 0 }),
};

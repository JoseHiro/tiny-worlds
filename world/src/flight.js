// In flight (world/DESIGN.md §3): about 45 seconds from one tiny world to the next. The aircraft stays put and the
// world slides under it: the departure city falls away, the climb goes through the clouds, the cruise passes islands
// over a sea of cloud (with one shot through a cabin window), and the descent comes down over the reef to the
// destination. Then the page hands over: to road/?leg=out for Naha (the landing is shown there), airport/ for home.
// The 外 / 機内 switch shows the cabin (world/CABIN.md) on the same clock: built the first time it is asked for.
// ?from=HND&to=OKA&flight=MA 237 (&story=hana, &stay=1 to keep the page at the end, &cabin=1 to start inside)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { airplane, LIVERIES } from '../../airport/src/parts.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { CITIES, LIVERY_KEYS } from './places.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const FROM = CITIES[q.get('from')] ? q.get('from') : 'HND';
const TO = CITIES[q.get('to')] && q.get('to') !== FROM ? q.get('to') : FROM === 'OKA' ? 'HND' : 'OKA';
const FLIGHT = q.get('flight') || (FROM === 'HND' ? 'MA 237' : 'MA 238');
const name = (c) => L([CITIES[c][0], CITIES[c][1]]);
const NEXT = TO === 'OKA' ? `../road/?leg=out&flight=${encodeURIComponent(FLIGHT)}` : TO === 'HND' ? '../airport/' : './';

const T = 46, V = 55; // seconds, ground speed (world units a second; the airport's aircraft is about 13 long)
const smooth = THREE.MathUtils.smootherstep, lerp = THREE.MathUtils.lerp, vec = (x, y, z) => new THREE.Vector3(x, y, z);
const altAt = (t) => lerp(4, 95, smooth(t, 0, 11)) - lerp(0, 87, smooth(t, 33, T)); // climb, cruise, descent
const ARRIVE_X = V * T; // where the aircraft is when the page hands over

// ---------- renderer, scene ----------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
$('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#8fbfd8'); gr.addColorStop(0.55, '#cfe3ea'); gr.addColorStop(1, '#eef1ec');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
scene.fog = new THREE.Fog('#dfe9ec', 500, 2600);
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 4000);
scene.add(new THREE.HemisphereLight('#fffaf0', '#9fb8c0', 1.5));
const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
sun.position.set(-300, 500, 200);
scene.add(sun);

// everything on the ground and in the clouds lives in `world`, which slides west (-X) as the aircraft flies east
const world = new THREE.Group();
scene.add(world);
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...o });

// ---------- the sea ----------
const sea = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000).rotateX(-Math.PI / 2), M('#4aa7c6', { roughness: 0.35, metalness: 0.05 }));
scene.add(sea); // the sea doesn't move: it looks the same everywhere

// ---------- land: a low faceted island with a sandy rim and a reef around it ----------
function island(r, { seed = 1, h = 8, green = '#a9c98a', reef = true } = {}) {
  const g = new THREE.Group();
  const rnd = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(seed * 977 + 1);
  const geo = new THREE.CylinderGeometry(r, r * 1.12, h, 18, 1);
  const p = geo.attributes.position;
  const ph = rnd() * 6.28; // the outline wobbles with the angle, so vertices shared by the top and the side stay together
  for (let k = 0; k < p.count; k++) { const a = Math.atan2(p.getZ(k), p.getX(k)), w = 1 + 0.14 * Math.sin(3 * a + ph) + 0.07 * Math.sin(7 * a + ph * 2); p.setX(k, p.getX(k) * w); p.setZ(k, p.getZ(k) * w * 0.8); }
  geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, M(green)); land.position.y = h / 2 - 1.5; g.add(land);
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.2, r * 1.22, 1.2, 18), M('#f2e6c9')); sand.scale.z = 0.8; sand.position.y = -0.2; g.add(sand);
  if (reef) { const rf = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.9, r * 1.9, 0.4, 24), M('#7fe3d6', { transparent: true, opacity: 0.8, roughness: 0.3 })); rf.scale.z = 0.8; rf.position.y = -0.1; g.add(rf); }
  return g;
}
// a town: blocks on the land (one instanced mesh), a runway and a terminal
function town(kind, x0, arriving = false) {
  const g = new THREE.Group();
  const naha = kind === 'naha';
  const base = naha ? island(420, { seed: 7, h: 4, green: '#b7d39a' }) : (() => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(1800, 3, 1600), M('#b9cf98')); l.position.set(-500, -0.4, -200); // the mainland, the sea opens to the east
    const s = new THREE.Mesh(new THREE.BoxGeometry(1810, 1.6, 1610), M('#e9dcc0')); s.position.set(-500, -1.2, -200);
    const o = new THREE.Group(); o.add(l, s); return o;
  })();
  g.add(base);
  // the airport: runway along X at z = 0, its terminal to the north
  const strip = new THREE.Mesh(new THREE.BoxGeometry(360, 0.6, 16), M('#4d535c')); strip.position.set(0, 1.5, 0); g.add(strip);
  for (let k = -8; k <= 8; k++) { const d = new THREE.Mesh(new THREE.BoxGeometry(10, 0.7, 1), M('#f4efe4')); d.position.set(k * 20, 1.6, 0); g.add(d); }
  const apron = new THREE.Mesh(new THREE.BoxGeometry(200, 0.5, 50), M('#cfcac0')); apron.position.set(10, 1.4, -45); g.add(apron);
  const term = new THREE.Mesh(new THREE.BoxGeometry(120, 10, 22), M(naha ? '#f1ede4' : '#ece7dc')); term.position.set(10, 6, -78); g.add(term);
  const band = new THREE.Mesh(new THREE.BoxGeometry(122, 3, 23), M('#2c3a57')); band.position.set(10, 12, -78); g.add(band);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 34, 8), M('#f1ede4')); tower.position.set(90, 18, -70); g.add(tower);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(7, 5, 6, 8), M('#7fc4cf', { roughness: 0.2 })); cab.position.set(90, 37, -70); g.add(cab);
  // the city beyond: boxes, white and cream (Naha gets red-tiled low houses)
  const N = naha ? 160 : 320, rnd = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(naha ? 11 : 5);
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M('#ffffff'), N);
  const O = new THREE.Object3D(), C = new THREE.Color(), pal = naha ? ['#f4efe4', '#efe6d6', '#c4573a', '#e9e2d3'] : ['#f1ede4', '#e2ddd3', '#cfd6dc', '#e9dcc4', '#bfc8cf'];
  for (let i = 0; i < N; i++) {
    let x, z;
    do { x = (rnd() - 0.5) * (naha ? 700 : 1500) - (naha ? 0 : 400); z = -120 - rnd() * (naha ? 220 : 700); } while (naha && Math.hypot(x, z * 1.25) > 390);
    const w = 8 + rnd() * 14, h = naha ? 4 + rnd() * 8 : 6 + rnd() * rnd() * 46;
    O.position.set(x, 1, z); O.scale.set(w, h, 8 + rnd() * 14); O.updateMatrix();
    blocks.setMatrixAt(i, O.matrix);
    blocks.setColorAt(i, C.set(pal[i % pal.length]));
  }
  g.add(blocks);
  g.position.x = x0;
  if (arriving) g.scale.x = -1; // turned round, so the approach comes in over the sea
  return g;
}

const fromTown = town(FROM === 'OKA' ? 'naha' : 'tokyo', 0);
const toTown = town(TO === 'OKA' ? 'naha' : 'tokyo', ARRIVE_X + 560, true);
world.add(fromTown, toTown);
// islands passed on the way (Kyushu's south, the Amami islands: just shapes)
for (const [x, z, r, s] of [[1100, 380, 160, 2], [1450, -420, 90, 3], [1750, 260, 60, 4], [1980, -300, 120, 5], [2250, 520, 70, 6]]) {
  const o = island(r, { seed: s }); o.position.set(x, 0, z); world.add(o);
}

// ---------- clouds: puffs in a layer, recycled as they slide behind ----------
const PUFFS = 460, SPAN = 3200;
const clouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), M('#ffffff', { roughness: 1 }), PUFFS);
const puffs = [];
{
  const rnd = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(3);
  for (let c = 0; c < PUFFS / 5; c++) { // clusters of five
    const cx = rnd() * SPAN, cz = (rnd() - 0.5) * 1800, cy = 50 + rnd() * 10, s = 14 + rnd() * 16;
    for (let k = 0; k < 5; k++) puffs.push({ x: cx + (k - 2) * s * 0.9, y: cy + Math.sin(k * 2.3) * 2, z: cz + Math.sin(k * 1.7) * s * 0.5, s: s * (k === 2 ? 1.3 : 0.75 + rnd() * 0.3) });
  }
}
scene.add(clouds);
const O = new THREE.Object3D();
function placeClouds(fx) {
  puffs.forEach((p, i) => {
    O.position.set(((p.x - fx) % SPAN + SPAN * 1.5) % SPAN - SPAN * 0.35, p.y, p.z);
    O.scale.set(p.s * 1.4, p.s * 0.55, p.s);
    O.updateMatrix();
    clouds.setMatrixAt(i, O.matrix);
  });
  clouds.instanceMatrix.needsUpdate = true;
}

// ---------- the aircraft ----------
const n = Number(FLIGHT.replace(/\D/g, '')) || 237;
const plane = new THREE.Group(), pitch = new THREE.Group(), LIVERY = LIVERIES[LIVERY_KEYS[n % LIVERY_KEYS.length]], model = airplane(LIVERY);
pitch.add(model); plane.add(pitch); scene.add(plane);
const wheels = model.userData.wheels ?? [];

// ---------- the shots: [from second, eye and target relative to the aircraft] ----------
const NOQ = new THREE.Quaternion();
const SHOTS = [
  { t: 0, cap: ['離陸、上昇中', 'Climbing out'], cam: (u) => [vec(lerp(-34, -46, u), lerp(5, 12, u), lerp(16, 26, u)), vec(14, -2, 0)] },
  { t: 9, cap: ['雲の上へ', 'Above the clouds'], cam: (u) => [vec(lerp(70, -20, u), 4, 64), vec(0, -4, 0)] },
  { t: 17, cap: ['窓の外', 'From a window seat'], window: true, cam: () => [vec(-1.5, 1.4, 2.6), vec(10, -8, 40)] },
  { t: 24, cap: ['巡航中', 'Cruising'], cam: (u) => [vec(lerp(-70, -55, u), 28, lerp(-36, -20, u)), vec(40, -18, 0)] },
  { t: 33, cap: ['降下を始めます', 'Starting the descent'], cam: (u) => [vec(lerp(70, 40, u), -5, -22), vec(0, 0, 0)] },
  { t: 40, cap: (to) => [`まもなく${to[0]}`, `${to[1]} ahead`], cam: (u) => [vec(-34, 9, lerp(-14, -8, u)), vec(140, -20, 0)] },
];
const shotAt = (t) => SHOTS.findLast((s) => t >= s.t);

// ---------- the panel ----------
const toRad = Math.PI / 180, [, , la1, lo1] = CITIES[FROM], [, , la2, lo2] = CITIES[TO];
const KM = Math.round(6371 * 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) * toRad / 2) ** 2 + Math.cos(la1 * toRad) * Math.cos(la2 * toRad) * Math.sin((lo2 - lo1) * toRad / 2) ** 2)));
function words() {
  $('eyebrow').textContent = `${FLIGHT} · Tiny Worlds`;
  $('title').innerHTML = `${name(FROM)} → ${name(TO)}<span>.</span>`;
  $('from').textContent = FROM; $('to').textContent = TO;
  $('note').textContent = q.get('story') === 'hana' ? L(['ハナの一家も乗っています', 'Hana’s family is on board']) : '';
  $('go').textContent = L(TO === 'OKA' ? ['那覇空港に着陸 → 道の世界へ', 'Land at Naha → on to the road'] : TO === 'HND' ? ['ミニ空港に着陸 → 空港の世界へ', 'Land at Mini Airport → into the airport'] : ['世界地図へ', 'To the world map']);
}
words();
onLang(words);
$('go').href = NEXT;

// ---------- the cabin (built once, the first time it is shown; kept after that) ----------
let cabin = null, inside = false, cview = q.get('story') === 'hana' ? 'hana' : 'all';
async function buildCabin() {
  const [{ DETAIL, moodLight }, kitMod] = await Promise.all([import('./cabin/common.js'), import('./cabin/kit.js')]);
  Object.assign(DETAIL, { round: 1, curve: 0.5 }); // a hundred seats: fewer curve segments
  const cs = new THREE.Scene();
  cs.background = scene.background; // the cabin floats in the same sky
  const hemi = new THREE.HemisphereLight(0xfffaf0, 0xcdbfa8, 1.5), csun = new THREE.DirectionalLight(0xfff3e0, 2.2);
  csun.position.set(8, 30, 10);
  csun.castShadow = true;
  csun.shadow.mapSize.set(2048, 2048);
  Object.assign(csun.shadow.camera, { left: -30, right: 30, top: 12, bottom: -12, near: 1, far: 80 });
  csun.shadow.bias = -0.0004; csun.shadow.normalBias = 0.03;
  cs.add(hemi, csun);
  renderer.shadowMap.enabled = true; // only the cabin's sun casts shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const kit = kitMod.cabinKit({ livery: LIVERY, homeward: TO !== 'OKA' });
  cs.add(kit);
  const cam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 400);
  const controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.08;
  controls.minDistance = 2; controls.maxDistance = 90;
  controls.enabled = false;
  cabin = { scene: cs, kit, cam, controls, hemi, sun: csun, moodLight, VIEWS: kitMod.VIEWS, phaseAt: kitMod.phaseAt, beltsOn: kitMod.beltsOn, fly: null };
  controls.addEventListener('start', () => { cabin.fly = null; });
  kit.userData.update(t, 1 / 60, at);
  setCabinView(cview, true);
}
function setCabinView(name, instant = false) {
  cview = name;
  const v = cabin.VIEWS[name];
  if (instant) { cabin.cam.position.set(...v.pos); cabin.controls.target.set(...v.target); cabin.controls.update(); }
  else cabin.fly = { k: 0, p0: cabin.cam.position.clone(), t0: cabin.controls.target.clone(), p1: new THREE.Vector3(...v.pos), t1: new THREE.Vector3(...v.target) };
  modeLabels();
}
let building = null;
async function setInside(on) {
  if (on && !cabin) { building ??= buildCabin(); await building; }
  inside = on;
  if (cabin) cabin.controls.enabled = on;
  $('views').hidden = $('belt').hidden = !on;
  modeLabels();
}
function modeLabels() {
  for (const b of $('mode').children) b.classList.toggle('on', (b.dataset.v === 'cabin') === inside);
  if (cabin) $('views').innerHTML = Object.entries(cabin.VIEWS).map(([k, v]) => `<button data-v="${k}" class="${k === cview ? 'on' : ''}">${L(v.label)}</button>`).join('');
}
$('mode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setInside(b.dataset.v === 'cabin'); });
$('views').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setCabinView(b.dataset.v); });
addEventListener('keydown', (e) => { if (e.key === 'c' || e.key === 'C') setInside(!inside); });
onLang(modeLabels);

// ---------- the clock ----------
let t = 0, ended = false, at = 0;
$('skip').onclick = () => { t = Math.max(t, 40); };
function tick(dt) {
  t = Math.min(T, t + dt);
  at += dt;
  // the cabin keeps time even while hidden, so switching in shows the right moment
  if (cabin) {
    cabin.kit.userData.update(t, dt, at);
    if (inside) {
      cabin.moodLight(cabin.hemi, cabin.sun);
      if (cabin.fly) {
        const f = cabin.fly;
        f.k = Math.min(1, f.k + dt / 1.2);
        const k = f.k * f.k * (3 - 2 * f.k);
        cabin.cam.position.lerpVectors(f.p0, f.p1, k);
        cabin.controls.target.lerpVectors(f.t0, f.t1, k);
        if (f.k >= 1) cabin.fly = null;
      }
      cabin.controls.update();
      $('belt').classList.toggle('on', cabin.beltsOn(t));
    }
  }
  const alt = altAt(t);
  plane.position.set(0, alt, 0);
  pitch.rotation.z = t < 11 ? 0.12 * (1 - smooth(t, 6, 11)) + 0.04 : t > 33 ? -0.05 * Math.sin(Math.PI * smooth(t, 33, T)) : 0;
  pitch.rotation.x = Math.sin(t * 0.7) * 0.015;
  for (const w of wheels) w.visible = t < 4;
  world.position.x = -V * t;
  placeClouds(V * t);
  const sh = shotAt(t), next = SHOTS[SHOTS.indexOf(sh) + 1], u = (t - sh.t) / ((next?.t ?? T) - sh.t);
  const [eye, look] = sh.cam(u);
  camera.position.copy(eye).applyQuaternion(sh.window ? pitch.quaternion : NOQ).add(plane.position); // the window shot pitches with the cabin
  camera.lookAt(look.add(plane.position));
  $('window').classList.toggle('on', !!sh.window && !inside);
  const cap = inside ? cabin.phaseAt(t) : typeof sh.cap === 'function' ? sh.cap(CITIES[TO]) : sh.cap;
  $('phase').textContent = L(cap);
  $('plane').style.left = `${(t / T) * 100}%`;
  $('left').textContent = L([`残り ${Math.round(KM * (1 - t / T)).toLocaleString()} km`, `${Math.round(KM * (1 - t / T)).toLocaleString()} km to go`]);
  if (t >= T && !ended) {
    ended = true;
    $('go').hidden = false;
    if (!q.get('stay')) { $('fade').style.opacity = 1; setTimeout(() => { location.href = NEXT; }, 1400); }
  }
}
const render = () => (inside ? renderer.render(cabin.scene, cabin.cam) : renderer.render(scene, camera));

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  for (const c of [camera, cabin?.cam].filter(Boolean)) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
}
addEventListener('resize', resize);
resize();

const clk = new THREE.Clock();
renderer.setAnimationLoop(() => { tick(Math.min(clk.getDelta(), 0.05)); render(); });
window.__flight = { renderer, scene, camera, tick, render, setT: (s) => { t = s; tick(0); render(); }, T, setInside, setCabinView, get cabin() { return cabin; } };
modeLabels();
if (q.get('cabin') === '1') setInside(true);

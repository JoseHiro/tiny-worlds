// Naha — water prototype. One cut-open block of sea: beach, lagoon, reef, drop-off.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BLOCK, seabed, bedTexture, cutFaces, bedHeight } from './terrain.js';
import { Ripples, waterSurface, waterCutMaterial, earthCutMaterial, withCaustics, causticsInject, shared } from './water.js';
import { Reef, reefScape } from '../../sealife/src/reef.js';
import { person, PALETTE, mat } from '../../airport/src/parts.js';
import { populate, CLIP } from './sealife.js';
import { Spray, waveHeight } from './waves.js';
import { beachHouse, souvenirShop } from '../../town/src/buildings.js';
import { SeaStory } from './story.js';

const $ = (id) => document.getElementById(id);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.localClippingEnabled = true; // sea life is clipped to the block
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9f1ee');
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 600);
camera.position.set(62, 52, 74);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, -2.5, -1);
controls.enableDamping = true;
controls.maxPolarAngle = 1.45;
controls.minDistance = 8;
controls.maxDistance = 260;

const hemi = new THREE.HemisphereLight('#fffaf0', '#c9d6cf', 1.4);
const sun = new THREE.DirectionalLight('#fff4e0', 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);

// ---------- land and sea ----------

const bedMat = withCaustics(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
const bed = seabed(bedMat);
scene.add(bed);
const faces = cutFaces(earthCutMaterial(), waterCutMaterial());
scene.add(faces);

const ripples = new Ripples(renderer);
const refractRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
const water = waterSurface({ ripples, bedTex: bedTexture(), refractTex: refractRT.texture });
scene.add(water);

// ---------- scale props: reef, fish, beach ----------

const props = new THREE.Group();
scene.add(props);
let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// the reef (the shared kit in ../sealife/src/reef.js), placed by zone from the seabed's depth
const zsAt = (x, z) => z + Math.sin(x * 0.07) * 2.6 + Math.sin(x * 0.19 + 1.3) * 0.8; // (terrain.js's wavy reef line)
function zoneAt(x, z) {
  const h = bedHeight(x, z), zs = zsAt(x, z);
  if (h > -0.4) return null; // too shallow (the wash zone)
  if (zs > -5.5) return 'lagoon';
  if (zs > -15) return 'flat';
  if (zs > -17.5) return 'crest';
  if (zs > -25 && h > -8.8) return 'slope';
  return null;
}
const reef = new Reef({ extras: [causticsInject], clip: CLIP, seed: 11, top: -0.1 });
const avoid = [[-18, -10, 1.3], [21, -11.5, 1.3], [-36, -12, 1.3], [-11, -14, 1.6], [3, -13.5, 1.8], [-31, 1, 4.2], [-4, 7, 3], [12, -9, 1.2]]; // anemones, the moray, the whitetip's bed, the garden eels, Hana's water, the squid
const coralSpots = reefScape(reef, { bounds: [-44.5, 44.5, -29.5, 14], zoneAt, ground: bedHeight, avoid, seed: 5 }); // bommies: where the chromis gather
const reefGroup = reef.build(props);

// beach: palms, parasols, loungers, people
function palm(x, z, lean) {
  const g = new THREE.Group();
  const trunkMat = mat(0x9c7a55);
  let p = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.012, 0.19 - i * 0.012, 0.8, 7), trunkMat);
    seg.position.set(p.x + lean * i * 0.07, p.y + 0.4, p.z);
    seg.rotation.z = -lean * 0.12;
    seg.castShadow = true;
    g.add(seg);
    p = new THREE.Vector3(seg.position.x + lean * 0.05, p.y + 0.78, p.z);
  }
  const leafMat = mat(0x4f9a5a, { side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.4, 4, 1, true).rotateZ(Math.PI / 2).translate(1.2, 0, 0), leafMat);
    leaf.position.copy(p);
    leaf.rotation.set(0, (i / 7) * Math.PI * 2, -0.35 - rnd() * 0.2);
    leaf.scale.set(1, 1, 0.35);
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.position.set(x, bedHeight(x, z), z);
  return g;
}
function parasol(x, z, color) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), mat(PALETTE.white)).translateY(1.1));
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.45, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), mat(i % 2 ? PALETTE.white : color, { side: THREE.DoubleSide }));
    s.position.y = 2.1;
    s.castShadow = true;
    g.add(s);
  }
  const lounger = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.55), mat(PALETTE.white));
  lounger.position.set(0.9, 0.28, 0.6);
  lounger.castShadow = true;
  g.add(lounger);
  g.position.set(x, bedHeight(x, z), z);
  return g;
}
[[-34, 24, 0.6], [-27, 26, -0.4], [-12, 25, 0.5], [3, 27, -0.6], [21, 25, 0.4], [36, 24, -0.5], [-40, 27, 0.3]].forEach(([x, z, l]) => props.add(palm(x, z, l)));
[[-20, 21.5, PALETTE.orange], [-6, 21, PALETTE.teal], [16, 20.5, PALETTE.yellow]].forEach(([x, z, c]) => props.add(parasol(x, z, c)));
// the beach house (海の家) and the souvenir shop, open toward the sea
const bh = beachHouse();
bh.position.set(27, bedHeight(27, 25), 25.2); bh.rotation.y = Math.PI;
props.add(bh);
const shop = souvenirShop({ name: '浜のおみやげ 紅や' });
shop.scale.setScalar(0.8); shop.position.set(9, bedHeight(9, 26), 26); shop.rotation.y = Math.PI;
props.add(shop);
const beachPeople = [];
const addPerson = (role, x, z, y, look, mode) => {
  const p = person(role, { mode });
  p.position.set(x, y ?? bedHeight(x, z), z);
  p.rotation.y = look;
  if (p.userData.suitcase) p.userData.suitcase.visible = false;
  props.add(p);
  beachPeople.push(p);
  return p;
};
addPerson('child', -8, 19.5, undefined, Math.PI / 2, 'idle');
addPerson('woman', -5.6, 21.6, undefined, Math.PI / 2, 'idle');
// a swimmer in a rubber ring, bobbing in the lagoon
const swimmer = addPerson('swimKid', -4, 9, -0.75, Math.PI / 2, 'idle');
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 10, 24), mat(PALETTE.orange));
ring.rotation.x = Math.PI / 2;
ring.position.set(-4, 0.05, 9);
props.add(ring);

// ---------- sea life (the shared library in ../sealife) ----------

const sea = populate(scene, { swimmer, coralSpots });
const spray = new Spray(scene, { clip: CLIP }); // white drops off the waves breaking on the reef edge

// ---------- interaction: click the water to make ripples ----------

const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hit = ray.ray.intersectPlane(plane, new THREE.Vector3());
  if (!hit || Math.abs(hit.x) > BLOCK.w / 2 || Math.abs(hit.z) > BLOCK.d / 2) return;
  ripples.drop((hit.x + BLOCK.w / 2) / BLOCK.w, (BLOCK.d / 2 - hit.z) / BLOCK.d, 0.025, 0.9);
  sea.startle(hit.setY(-0.5)); // fish nearby scatter, garden eels duck
});

// ---------- tuning panel ----------

const LOOKS = {
  day: { bg: '#e9f1ee', sun: [0.45, 0.8, 0.35], sunColor: '#fff4e0', sunI: 2.6, hemi: 1.4, sky: '#c4e8ef' },
  dusk: { bg: '#f1d3b8', sun: [-0.8, 0.35, 0.25], sunColor: '#ffb57a', sunI: 2.2, hemi: 0.9, sky: '#ffd9b8' },
};
let look = 'day';
function applyLook() {
  const L = LOOKS[look];
  scene.background.set(L.bg);
  sun.position.set(...L.sun).normalize().multiplyScalar(120);
  sun.color.set(L.sunColor);
  sun.intensity = L.sunI;
  hemi.intensity = L.hemi;
  water.material.uniforms.sunDir.value.set(...L.sun).normalize();
  water.material.uniforms.sunColor.value.set(L.sunColor);
  water.material.uniforms.cSky.value.set(L.sky);
}
applyLook();
const slider = (id, fn) => { const el = $(id); const go = () => fn(Number(el.value)); el.addEventListener('input', go); go(); };
slider('wave', (v) => { shared.uWave.value = v; });
slider('clarity', (v) => { water.material.uniforms.uClarity.value = v; });
slider('caustic', (v) => { shared.uCaustic.value = v; });
$('look').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  look = b.dataset.v;
  $('look').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  applyLook();
});

// ---------- where to look: camera presets, and what is passing ----------

const VIEWS = {
  all: { pos: [62, 52, 74], target: [0, -2.5, -1] },
  lagoon: { pos: [-27.5, 3.2, 7], target: [-30.5, -0.9, 1] }, // the garden eels and the rays
  reef: { pos: [-16.2, 2.2, -6], target: [-18, -1.1, -10.2] }, // a clownfish family's anemone
  outside: { pos: [-4, 3, 2], target: [0, -4, -27] },
  cut: { pos: [0, -3, -68], target: [0, -4, -26], glass: 0.32 }, // through the ocean-side cut face, like aquarium glass
};
let fly = null;
function goView(k) {
  const v = VIEWS[k];
  fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...v.pos), t1: new THREE.Vector3(...v.target), a0: shared.uCutAlpha.value, a1: v.glass ?? 0.86 };
  $('views').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === k));
}
$('views').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) goView(b.dataset.v); });
let uiT = 0;
const c = sea.counts;
$('seaCount').textContent = `浅瀬 ${c.lagoon} · サンゴ礁 ${c.reef} · 外洋 ${c.outside} · 空 ${c.surface}`;
function showEvents() {
  const now = sea.happening();
  $('event').textContent = now.length ? now.join(' · ') : '外洋を通るもの：イルカの群れ（ときどき）、ジンベエザメ（まれ）';
  $('event').classList.toggle('live', now.length > 0);
}

// ---------- loop ----------

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const pr = renderer.getPixelRatio();
  refractRT.setSize(Math.floor(w * pr), Math.floor(h * pr));
  water.material.uniforms.uRes.value.set(w * pr, h * pr);
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let dropT = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  shared.uTime.value = t;
  // the sea is never still: a few soft drops, and the swimmer's own ripples
  dropT -= dt;
  if (dropT <= 0) {
    dropT = 0.35 + Math.random() * 0.5;
    ripples.drop(Math.random(), 0.25 + Math.random() * 0.75, 0.012 + Math.random() * 0.01, 0.12);
  }
  if (Math.random() < dt * 1.2) ripples.drop((swimmer.position.x + BLOCK.w / 2) / BLOCK.w, (BLOCK.d / 2 - swimmer.position.z) / BLOCK.d, 0.012, 0.25);
  ripples.step(2);

  // the swimmer rides the waves
  const bob = waveHeight(swimmer.position.x, swimmer.position.z, t, shared.uWave.value) + Math.sin(t * 1.4) * 0.02;
  swimmer.position.y = -0.75 + bob;
  ring.position.set(swimmer.position.x, 0.05 + bob, swimmer.position.z); // the ring goes where its swimmer goes
  ring.visible = swimmer.visible;
  ring.rotation.set(Math.PI / 2 + (waveHeight(-4, 9.4, t, shared.uWave.value) - waveHeight(-4, 8.6, t, shared.uWave.value)) * 0.8, 0, 0);
  spray.update(t, dt, shared.uWave.value, renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
  for (const p of beachPeople) p.userData.update(t);
  sea.update(t, dt);
  bh.userData.update(t);
  story.update(t, dt);
  if ((uiT -= dt) <= 0) { uiT = 0.5; showEvents(); }

  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.6);
    const k = fly.t * fly.t * (3 - 2 * fly.t);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    controls.target.lerpVectors(fly.t0, fly.t1, k);
    shared.uCutAlpha.value = THREE.MathUtils.lerp(fly.a0, fly.a1, k);
    if (fly.t >= 1) fly = null;
  } else if (followCam) { // the story follows a swimmer
    const p = followCam.obj.position;
    camera.position.lerp(p.clone().add(followCam.offset), Math.min(1, dt * 1.8));
    controls.target.lerp(vec3(p.x, Math.max(p.y, -0.5), p.z), Math.min(1, dt * 2.4));
  }
  controls.update();
  draw();
});

// two passes: everything but the water into the refraction target, then the whole scene
function draw() {
  water.visible = false;
  for (const m of faces.children) if (m.userData.water) m.visible = false;
  renderer.setRenderTarget(refractRT);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  water.visible = true;
  for (const m of faces.children) if (m.userData.water) m.visible = true;
  renderer.render(scene, camera);
}

// debug: render one frame at a fixed size (the preview pane is narrow) and return it
function snapshot(w = 1440, h = 900) {
  renderer.setSize(w, h, false);
  refractRT.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  draw();
  const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
  resize();
  return url;
}

// ---------- Hana's day at the sea ----------
const vec3 = (x, y, z) => new THREE.Vector3(x, y, z);
let followCam = null;
function flyCam(pos, target) { followCam = null; fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), a0: shared.uCutAlpha.value, a1: 0.86 }; }
const story = new SeaStory({
  scene, sea, swimmer, ring, bedHeight, beachHouse: bh, shop, parasol: vec3(-20, 0, 21.5),
  say: (s) => { $('storyLine').textContent = s; },
  done: (link) => { const a = $('tripLink'); a.href = link.href; a.textContent = link.label; a.hidden = false; },
  cam: flyCam,
  follow: (obj, offset) => { followCam = obj ? { obj, offset } : null; },
});
$('hanaDay').addEventListener('click', () => { $('tripLink').hidden = true; story.start(); });
if (new URLSearchParams(location.search).get('from') === 'road') { $('tripLink').hidden = true; story.start(); }

window.__naha = { renderer, scene, camera, controls, ripples, water, snapshot, sea, goView, VIEWS, story,
  // (debug) put the camera where the story wants it right now
  settle() {
    if (fly) { camera.position.copy(fly.p1); controls.target.copy(fly.t1); fly = null; }
    else if (followCam) { const p = followCam.obj.position; camera.position.copy(p).add(followCam.offset); controls.target.set(p.x, Math.max(p.y, -0.5), p.z); }
    swimmer.position.y = -0.75; ring.position.set(swimmer.position.x, 0.05, swimmer.position.z); ring.visible = swimmer.visible;
    controls.update();
  },
  advance(sec) { for (let k = 0; k < sec * 30; k++) { const tt = performance.now() / 1000 + k / 30; shared.uTime.value = tt; sea.update(tt, 1 / 30); story.update(tt, 1 / 30); } }, setLook: (k) => { look = k; applyLook(); } };

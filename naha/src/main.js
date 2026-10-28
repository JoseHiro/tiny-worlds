// Naha — water prototype. One cut-open block of sea: beach, lagoon, reef, drop-off.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BLOCK, seabed, bedTexture, cutFaces, bedHeight } from './terrain.js';
import { Ripples, waterSurface, waterCutMaterial, earthCutMaterial, withCaustics, shared } from './water.js';
import { person, PALETTE, mat } from '../../airport/src/parts.js';
import { populate } from './sealife.js';

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

// corals: blobs, branches and tables on the reef flat
const coralColors = ['#f59ab0', '#9b7fd1', '#ff9f6b', '#f2c94c', '#7fd6c2', '#e86a8a'].map((c) => new THREE.Color(c));
const blob = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.45, 1), withCaustics(new THREE.MeshStandardMaterial({ roughness: 0.8 })), 260);
const branch = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.1, 0.9, 6), withCaustics(new THREE.MeshStandardMaterial({ roughness: 0.7 })), 600);
const table = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.9, 0.25, 0.18, 10), withCaustics(new THREE.MeshStandardMaterial({ roughness: 0.8 })), 70);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), eul = new THREE.Euler();
let nb = 0, nbr = 0, nt = 0;
const coralSpots = []; // coral heads, where the chromis gather
for (let k = 0; k < 520 && (nb < 260 || nbr < 600 || nt < 70); k++) {
  const x = -42 + rnd() * 84, z = -19 + rnd() * 15;
  const h = bedHeight(x, z);
  if (h > -1.0 || h < -2.6) continue;
  const c = coralColors[Math.floor(rnd() * coralColors.length)];
  const kind = rnd();
  if (kind < 0.35 && nb < 260) {
    const s = 0.4 + rnd() * 0.7;
    blob.setMatrixAt(nb, m4.compose(new THREE.Vector3(x, h + s * 0.3, z), q.identity(), sc.set(s, s * 0.7, s)));
    blob.setColorAt(nb++, c);
  } else if (kind < 0.85 && nbr < 594) {
    coralSpots.push([x, z]);
    for (let j = 0; j < 6; j++) { // a little bush of branches
      eul.set((rnd() - 0.5) * 0.9, rnd() * 6, (rnd() - 0.5) * 0.9);
      q.setFromEuler(eul);
      branch.setMatrixAt(nbr, m4.compose(new THREE.Vector3(x + (rnd() - 0.5) * 0.4, h + 0.4, z + (rnd() - 0.5) * 0.4), q, sc.set(1, 0.7 + rnd() * 0.6, 1)));
      branch.setColorAt(nbr++, c);
    }
  } else if (nt < 70 && rnd() < 0.4) {
    table.setMatrixAt(nt, m4.compose(new THREE.Vector3(x, h + 0.55, z), q.identity(), sc.setScalar(0.5 + rnd() * 0.5)));
    table.setColorAt(nt++, c);
  }
}
blob.count = nb; branch.count = nbr; table.count = nt;
for (const im of [blob, branch, table]) { im.castShadow = true; im.receiveShadow = true; props.add(im); }

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
[[-20, 21.5, PALETTE.orange], [-6, 21, PALETTE.teal], [12, 21.5, PALETTE.yellow]].forEach(([x, z, c]) => props.add(parasol(x, z, c)));
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
const swimmer = addPerson('child', -4, 9, -0.75, Math.PI / 2, 'idle');
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 10, 24), mat(PALETTE.orange));
ring.rotation.x = Math.PI / 2;
ring.position.set(-4, 0.05, 9);
props.add(ring);

// ---------- sea life (the shared library in ../sealife) ----------

const sea = populate(scene, { swimmer, coralSpots });

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
slider('wave', (v) => { water.material.uniforms.uWave.value = v; });
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

  const bob = Math.sin(t * 1.4) * 0.06;
  swimmer.position.y = -0.75 + bob;
  ring.position.y = 0.05 + bob;
  for (const p of beachPeople) p.userData.update(t);
  sea.update(t, dt);
  if ((uiT -= dt) <= 0) { uiT = 0.5; showEvents(); }

  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.6);
    const k = fly.t * fly.t * (3 - 2 * fly.t);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    controls.target.lerpVectors(fly.t0, fly.t1, k);
    shared.uCutAlpha.value = THREE.MathUtils.lerp(fly.a0, fly.a1, k);
    if (fly.t >= 1) fly = null;
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

window.__naha = { renderer, scene, camera, controls, ripples, water, snapshot, sea, goView, VIEWS, setLook: (k) => { look = k; applyLook(); } };

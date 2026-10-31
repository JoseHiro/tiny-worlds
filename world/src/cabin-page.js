// The cabin on its own (world/CABIN.md §8 step 3): the whole kit, playing the flight's timetable.
// ?t=30 starts at that second, ?view=hana picks a camera, ?paused=1 holds still.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { DETAIL, moodLight } from './cabin/common.js';
import { cabinKit, T, phaseAt, beltsOn, VIEWS } from './cabin/kit.js';

Object.assign(DETAIL, { round: 1, curve: 0.5 }); // a hundred seats: fewer curve segments

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e2d5);
const hemi = new THREE.HemisphereLight(0xfffaf0, 0xcdbfa8, 1.5);
const sun = new THREE.DirectionalLight(0xfff3e0, 2.2);
sun.position.set(8, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 12, bottom: -12, near: 1, far: 80 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(hemi, sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xddd4c4, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -3.6; ground.receiveShadow = true;
scene.add(ground);

const kit = cabinKit();
scene.add(kit);

// ---------- cameras ----------
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.08;
controls.minDistance = 2; controls.maxDistance = 90;
let view = VIEWS[q.get('view')] ? q.get('view') : 'all';
let fly = null;
function setView(name, instant = false) {
  view = name;
  const v = VIEWS[name];
  if (instant) { camera.position.set(...v.pos); controls.target.set(...v.target); }
  else fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...v.pos), t1: new THREE.Vector3(...v.target) };
  labels();
}
$('views').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });
controls.addEventListener('start', () => { fly = null; });

// ---------- time ----------
let t = Math.min(T, Math.max(0, +(q.get('t') ?? 0)));
let playing = q.get('paused') !== '1', speed = 1;
$('time').max = T;
$('time').addEventListener('input', (e) => { t = +e.target.value; });
$('play').addEventListener('click', () => { playing = !playing; labels(); });
$('speed').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { speed = +b.dataset.v; labels(); } });

function labels() {
  $('views').innerHTML = Object.entries(VIEWS).map(([k, v]) => `<button data-v="${k}" class="${k === view ? 'on' : ''}">${L(v.label)}</button>`).join('');
  $('play').textContent = playing ? '❚❚' : '▶';
  for (const b of $('speed').children) b.classList.toggle('on', +b.dataset.v === speed);
}
onLang(labels);
setView(view, true);


function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let shownPhase = null;
const clock = new THREE.Clock();
let at = 0;
function frame(dt) {
  at += dt;
  if (playing) { t += dt * speed; if (t > T) t = 0; }
  kit.userData.update(t, dt, at);
  moodLight(hemi, sun);
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.2);
    const k = fly.t * fly.t * (3 - 2 * fly.t);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    controls.target.lerpVectors(fly.t0, fly.t1, k);
    if (fly.t >= 1) fly = null;
  }
  controls.update();
  $('time').value = t;
  $('clock').textContent = `${Math.floor(t)}s / ${T}s`;
  $('belt').classList.toggle('on', beltsOn(t));
  const ph = L(phaseAt(t));
  if (ph !== shownPhase) { shownPhase = ph; $('phase').textContent = ph; }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(() => frame(Math.min(clock.getDelta(), 0.05)));

// console hooks: __cabinKit.at(30) jumps there (running 3 s so things settle); .stats(); .snapshot(w, h) → data URL
window.__cabinKit = {
  kit, renderer, scene, camera, controls, setView,
  at(s, settle = 3) { t = s - settle; for (let i = 0; i < settle * 30; i++) frame(1 / 30); t = s; frame(1 / 30); return t; },
  stats() { const i = renderer.info; return { geometries: i.memory.geometries, textures: i.memory.textures, calls: i.render.calls, triangles: i.render.triangles }; },
  snapshot(w = 1200, h = 760) {
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/jpeg', 0.88);
    resize();
    return url;
  },
};

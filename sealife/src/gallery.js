// Sea-life catalog: one renderer, one small scene per card (scissor viewports), plus an aquarium.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeCreature, School, Cruise, clock } from './kit.js';
import { SPECIES } from './species.js';

const BG = new THREE.Color('#d9eef0');

function stageFor(build, { wide = false, view = [1, 0.45, 1.25] } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#f4fbff', '#9fc3c4', 1.6));
  const sun = new THREE.DirectionalLight('#fffaf0', 2.2);
  sun.position.set(3, 10, 4);
  scene.add(sun);
  const { obj, radius, update } = build(scene);
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.05, 400);
  const dir = new THREE.Vector3(...view).normalize();
  camera.position.copy(dir.multiplyScalar(radius / Math.sin(THREE.MathUtils.degToRad(15)) * (wide ? 0.42 : 0.75)));
  camera.lookAt(0, 0, 0);
  return { scene, camera, obj, update, radius };
}

// one creature swimming on the spot, slowly turning so you see every side
function single(key) {
  return (scene) => {
    const spec = SPECIES[key]();
    const mesh = makeCreature(spec);
    const pivot = new THREE.Group();
    pivot.add(mesh);
    scene.add(pivot);
    const r = spec.geometry.boundingSphere.radius;
    return { obj: mesh, radius: r * 1.1, update: (t, dt, spin) => { if (spin) pivot.rotation.y += dt * 0.35; mesh.position.y = Math.sin(t * 1.3) * r * 0.04; } };
  };
}

// all five together: a school of tangs, cruising rays, sharks, a turtle, and the whale shark passing
function aquarium(scene) {
  scene.fog = new THREE.Fog(BG, 22, 70);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#efe3c4', roughness: 1 }));
  floor.position.y = -6;
  scene.add(floor);
  const updates = [];
  const tangs = makeCreature(SPECIES.blueTang(), { count: 60 });
  scene.add(tangs);
  const school = new School(tangs, { center: new THREE.Vector3(-2, -2, 0), size: new THREE.Vector3(9, 3, 7), speed: 1.3, radius: 1.0 });
  updates.push((t, dt) => school.update(dt));
  const add = (key, opts) => {
    const m = makeCreature(SPECIES[key]());
    scene.add(m);
    const c = new Cruise(m, { center: new THREE.Vector3(0, 0, 0), ...opts });
    updates.push((t, dt) => c.update(dt));
    return m;
  };
  add('manta', { rx: 12, rz: 7, y: 0.5, speed: 2.2, eight: true });
  const shark = add('blacktipShark', { rx: 9, rz: 5, y: -3, speed: 2.4, phase: 2 });
  add('blacktipShark', { rx: 10, rz: 6, y: -3.6, speed: 2.1, phase: 4.5 });
  add('greenTurtle', { rx: 6, rz: 4, y: -1.0, speed: 0.9, phase: 1, bob: 0.6 });
  add('whaleShark', { rx: 20, rz: 12, y: 2.8, speed: 1.4, phase: 3.6, bob: 0.2 });
  school.threats.push(shark); // the tangs scatter when the shark comes by
  return { obj: scene, radius: 16, update: (t, dt) => updates.forEach((f) => f(t, dt)) };
}

const ITEMS = [
  { name: '水槽（代表5種）', en: 'Aquarium · the five reference species', note: 'ナンヨウハギ60匹の群れ（ツマグロが来ると散る）· マンタは8の字 · ツマグロ2匹 · アオウミガメ · ジンベエザメが外側をゆっくり', wide: true, build: aquarium, view: [1, 0.55, 1.2] },
  { name: 'ナンヨウハギ', en: 'Blue tang', note: '0.45 · 青い体に黒い模様、黄色い尾 · くねり泳ぎ（速い）· 群れ · サンゴ礁', build: single('blueTang') },
  { name: 'マンタ', en: 'Manta ray', note: '幅3.4 · 背は黒、腹は白、肩に白い模様、頭びれ · 羽ばたき（ゆっくり）· 外洋〜礁の縁', build: single('manta'), view: [0.8, 0.9, 1.1] },
  { name: 'ツマグロ', en: 'Blacktip reef shark', note: '1.6 · 灰色、ひれの先が黒 · くねり泳ぎ · 浅瀬を巡回', build: single('blacktipShark') },
  { name: 'ジンベエザメ', en: 'Whale shark', note: '8.5 · 紺灰色に白い斑点、背に3本の隆起線、横長の口 · ゆっくりくねる · 外洋（まれな見せ場）', build: single('whaleShark') },
  { name: 'アオウミガメ', en: 'Green sea turtle', note: '1.2 · 甲羅の模様（中央5枚＋左右4枚）· 前ひれで羽ばたく · 浅瀬〜礁', build: single('greenTurtle'), view: [0.9, 0.7, 1.1] },
];

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;

const grid = document.getElementById('grid');
const stages = ITEMS.map((item) => {
  const card = document.createElement('div');
  card.className = 'card' + (item.wide ? ' wide' : '');
  card.innerHTML = `<div class="view"></div><div class="meta"><b>${item.name}</b> <span>${item.en}</span><small>${item.note}</small></div>`;
  grid.appendChild(card);
  const st = { item, view: card.querySelector('.view'), ...stageFor(item.build, item) };
  st.scene.background = item.wide ? BG : null;
  card.addEventListener('click', () => openDetail(st));
  return st;
});

// detail view with orbit controls
const detailEl = document.getElementById('detail');
const detailView = document.getElementById('detailView');
let detail = null, detailCam = null, controls = null;
function openDetail(st) {
  detail = st;
  detailCam = st.camera.clone();
  controls = new OrbitControls(detailCam, detailView);
  controls.enableDamping = true;
  controls.autoRotate = !st.item.wide;
  controls.autoRotateSpeed = 0.8;
  document.getElementById('dName').textContent = `${st.item.name} · ${st.item.en}`;
  document.getElementById('dNote').textContent = st.item.note;
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
  const jobs = detail ? [[detail, detailView, detailCam]] : stages.map((s) => [s, s.view, s.camera]);
  for (const [st, view, cam] of jobs) {
    const r = view.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H || r.width === 0) continue;
    st.update(t, dt, !detail);
    if (detail) controls.update();
    cam.aspect = r.width / r.height;
    cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(st.scene, cam);
  }
});

// debug: render a card's scene at a fixed size (the preview pane is narrow)
window.__sealife = {
  stages,
  shot(i, w = 1200, h = 760, advance = 0) {
    const st = stages[i];
    for (let k = 0; k < advance * 30; k++) { clock.uTime.value += 1 / 30; st.update(clock.uTime.value, 1 / 30, true); }
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setSize(w, h, false);
    r.toneMapping = THREE.NeutralToneMapping;
    r.setClearColor(BG);
    const cam = st.camera.clone();
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    r.render(st.scene, cam);
    const url = r.domElement.toDataURL('image/jpeg', 0.9);
    r.dispose();
    let img = document.getElementById('shot');
    if (!img) { img = document.createElement('img'); img.id = 'shot'; Object.assign(img.style, { position: 'fixed', left: 0, top: 0, width: '100%', zIndex: 99 }); img.onclick = () => img.remove(); document.body.appendChild(img); }
    img.src = url;
    return 'ok';
  },
};

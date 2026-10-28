// Roads & towns catalog: one renderer, one small scene per card (scissor viewports), and sample scenes.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clock } from '../../sealife/src/kit.js';
import { tile, Network, Traffic, Signals, TILE } from './roads.js';
import { minivan, MINIVAN_COLORS } from './vehicles.js';
import { trafficLight, lampSet, showLamps, junctionLights } from './gear.js';
import { convenienceStore } from './buildings.js';
import { caneField } from './nature.js';

const BG = new THREE.Color('#e7efe9');
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function stage(build, { view = [1, 0.7, 1.1], fill = 0.62, shadows = false } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fffaf0', '#b9c9b4', 1.5));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.4);
  sun.position.set(14, 26, 10);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
    sun.shadow.bias = -0.0005;
  }
  scene.add(sun);
  const built = build(scene);
  const box = new THREE.Box3().setFromObject(built.obj);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const target = built.target ?? sphere.center;
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 500);
  camera.position.copy(V(...view).normalize().multiplyScalar((sphere.radius / Math.sin(THREE.MathUtils.degToRad(15))) * fill)).add(target);
  camera.lookAt(target);
  return { scene, camera, target, update: built.update ?? (() => {}), obj: built.obj, built };
}

// ---------- cards ----------

const spin = (obj, speed = 0.3) => (t, dt, still) => { if (!still) obj.rotation.y += dt * speed; };
const one = (make, { spinIt = true, update } = {}) => (scene) => {
  const o = make();
  const pivot = new THREE.Group();
  pivot.add(o);
  scene.add(pivot);
  const s = spinIt ? spin(pivot) : () => {};
  return { obj: pivot, update: (t, dt, still) => { s(t, dt, still); update?.(o, t, dt); o.userData.update?.(t, dt); } };
};
const ground = (scene, size, color = 0xa9c98a) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 1 })); m.position.y = -0.06; m.receiveShadow = true; scene.add(m); return m; };

// a junction alone, with its lights cycling
function crossCard(scene) {
  const ctrl = new Signals();
  const t = tile('cross', { signals: ctrl });
  const lights = junctionLights(t, ctrl);
  scene.add(t);
  return { obj: t, update: (time, dt) => { ctrl.update(dt); lights.update(time); } };
}
// the minivan: drives on the spot, the sliding door opens and closes, the turn signal blinks
function vanCard(scene) {
  const v = minivan();
  scene.add(v);
  return { obj: v, update: (t, dt, still) => {
    if (!still) v.rotation.y += dt * 0.3;
    const k = t % 10;
    v.userData.doorOpen = k > 4 && k < 7.5;
    v.userData.blink = k < 3 ? 'L' : null;
    v.userData.braking = k > 3 && k < 8;
    v.userData.speed = k < 3 ? 2 : 0;
    v.userData.update(dt);
  } };
}
function vanColors(scene) {
  const g = new THREE.Group();
  Object.values(MINIVAN_COLORS).forEach((c, i) => { const v = minivan({ color: c, rental: i === 0 }); v.position.set((i - 2.5) * 1.5, 0, 0); v.rotation.y = -Math.PI / 2; g.add(v); });
  scene.add(g);
  return { obj: g };
}
function lightCard(scene) {
  const set = lampSet();
  const l = trafficLight(set);
  scene.add(l);
  const ctrl = new Signals({ green: 4, yellow: 1.6, red: 1 });
  return { obj: l, update: (t, dt, still) => {
    if (!still) l.rotation.y += dt * 0.3;
    ctrl.update(dt);
    const st = ctrl.state('ew');
    showLamps(set, st, st === 'green' ? 'walk' : 'stop', t);
  } };
}

// ---------- the sample: a ring road round a signalled crossroads, with traffic, a store and cane fields ----------
function intersectionSample(scene) {
  ground(scene, 90);
  const net = new Network();
  const ctrl = new Signals({ green: 9 });
  const layout = [
    ['curve', -1, -1, 3], ['tee', 0, -1, 0], ['curve', 1, -1, 0],
    ['tee', -1, 0, 3], ['cross', 0, 0, 0], ['tee', 1, 0, 1],
    ['curve', -1, 1, 2], ['tee', 0, 1, 2], ['curve', 1, 1, 1],
  ];
  const tiles = new THREE.Group();
  let lights = null;
  for (const [kind, gx, gz, turns] of layout) {
    const t = tile(kind, { at: [gx, gz], turns, signals: kind === 'cross' ? ctrl : null });
    if (kind === 'cross') lights = junctionLights(t, ctrl);
    tiles.add(net.add(t));
  }
  scene.add(tiles);
  // a convenience store south of the ring, cane fields to the north
  const store = convenienceStore();
  store.position.set(-3, 0, TILE * 1.5 + 6.2);
  store.rotation.y = Math.PI; // its front faces the ring road (−Z)
  scene.add(store);
  const fields = [-1, 0, 1].map((gx) => { const f = caneField({ seed: gx + 5 }); f.position.set(gx * TILE, 0, -TILE * 2); scene.add(f); return f; });
  // traffic: rental minivans and other colours, spread round the network
  const traffic = new Traffic(net);
  const colors = Object.values(MINIVAN_COLORS);
  const starts = net.paths.filter((p) => !p.turn && !p.signal);
  for (let i = 0; i < 9; i++) {
    const v = minivan({ color: colors[i % colors.length], rental: i % 3 === 0 });
    scene.add(v);
    traffic.add(v, starts[(i * 5) % starts.length], 1 + (i % 3) * 3);
  }
  return {
    obj: tiles, target: V(0, 0, 2), traffic, ctrl,
    update: (t, dt) => {
      ctrl.update(dt);
      lights.update(t);
      traffic.update(dt);
      store.userData.update(t, dt, Math.sin(t * 0.8) > 0.4);
      fields.forEach((f) => f.userData.update(t));
    },
  };
}

const ITEMS = [
  { group: 'sample', wide: true, name: '見本：交差点と環状の道', en: 'Sample · a crossroads inside a ring road', note: '信号の交差点（車は赤で止まり、前の車との間をあける）· T字路とカーブでつながる環状の道 · レンタカー（わナンバー）のミニバン9台 · 道の南にコンビニ、北にサトウキビ畑', build: intersectionSample, view: [0.9, 1.0, 1.15], fill: 0.5, shadows: true },
  { group: 'road', name: '直線（2車線）', en: 'Straight · 2 lanes', note: '長さ12 · 車道5.2＋歩道1.5×2 · 白の破線の中央線、外側線、縁石、草の路肩', build: one(() => tile('straight')) },
  { group: 'road', name: 'カーブ', en: 'Curve', note: '半径6（中心線）· 内側と外側に歩道 · 破線は曲線に沿う', build: one(() => tile('curve')) },
  { group: 'road', name: 'T字路', en: 'T-junction', note: '3方向 · 角の歩道は丸く · 横断歩道と停止線', build: one(() => tile('tee')) },
  { group: 'road', name: '十字路（信号）', en: 'Crossroads with lights', note: '4方向 · 信号4基（各方向の左奥の角）· 東西→南北の順に青', build: crossCard },
  { group: 'road', name: '坂', en: 'Slope', note: '長さ12で1.5上がる · 前後の道となめらかにつながる（海が見えてくる坂に使う）', build: one(() => tile('straight', { rise: 1.5 })) },
  { group: 'car', name: 'ミニバン（レンタカー）', en: 'Minivan · rental', note: '2.4 × 1.05 × 1.4 · わナンバー · 左のスライドドアが開く · ウインカー、ブレーキランプ、回る車輪', build: vanCard },
  { group: 'car', name: 'ミニバンの色', en: 'Minivan colours', note: 'パール（レンタカー）、銀、紺、ワイン、水色、黒', build: vanColors, view: [0.3, 0.5, 1.2], fill: 0.8 },
  { group: 'gear', name: '信号機', en: 'Traffic light', note: '高さ4.4 · 横3灯（左から青・黄・赤）、ひさし付き · 歩行者用信号と押しボタン', build: lightCard, view: [1.2, 0.35, 0.5], fill: 0.85 },
  { group: 'building', name: 'コンビニ', en: 'Convenience store', note: '12 × 9 × 3.6 · 横長の色帯の看板（架空の店名）、ガラスの正面と自動ドア、棚と冷蔵ケース、屋上の室外機、駐車場5台、のぼり旗、道ばたの看板柱', build: one(() => convenienceStore(), { spinIt: false }), view: [0.6, 0.6, 1.2] },
  { group: 'nature', name: 'サトウキビ畑', en: 'Sugar-cane field', note: '1区画12 × 12 · 赤土の畝 · 高さ約2.5 · 風が通ると波のように揺れる（全部で1回の描画）', build: one(() => caneField(), { spinIt: false }), view: [1, 0.55, 1.0] },
];
const GROUPS = [['all', 'すべて'], ['sample', '見本'], ['road', '道'], ['car', '車'], ['gear', '設備'], ['building', '建物'], ['nature', '自然']];

// ---------- page ----------

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const grid = document.getElementById('grid');
const tabs = document.getElementById('tabs');
for (const [id, ja] of GROUPS) {
  const b = document.createElement('button');
  b.textContent = `${ja} ${id === 'all' ? ITEMS.length : ITEMS.filter((i) => i.group === id).length}`;
  b.dataset.tab = id;
  b.addEventListener('click', () => show(id));
  tabs.appendChild(b);
}
const stages = ITEMS.map((item) => {
  const card = document.createElement('div');
  card.className = 'card' + (item.wide ? ' wide' : '');
  card.innerHTML = `<div class="view"></div><div class="meta"><b>${item.name}</b> <span>${item.en}</span><small>${item.note}</small></div>`;
  grid.appendChild(card);
  const st = { item, card, view: card.querySelector('.view'), ...stage(item.build, item) };
  if (item.wide) st.scene.background = BG;
  card.addEventListener('click', () => openDetail(st));
  return st;
});
function show(id) {
  for (const s of stages) s.card.style.display = id === 'all' || s.item.group === id ? '' : 'none';
  for (const b of tabs.children) b.classList.toggle('on', b.dataset.tab === id);
  try { localStorage.setItem('town.tab', id); } catch {}
}
let first = 'all';
try { first = localStorage.getItem('town.tab') || 'all'; } catch {}
show(GROUPS.some(([id]) => id === first) ? first : 'all');

const detailEl = document.getElementById('detail');
const detailView = document.getElementById('detailView');
let detail = null, detailCam = null, controls = null;
function openDetail(st) {
  detail = st;
  detailCam = st.camera.clone();
  controls = new OrbitControls(detailCam, detailView);
  controls.target.copy(st.target);
  controls.enableDamping = true;
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
    st.update(t, dt, !!detail);
    if (detail) controls.update();
    cam.aspect = r.width / r.height;
    cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(st.scene, cam);
  }
});

// debug: render a card at a fixed size into an overlay (the preview pane is narrow); the extra renderer is disposed
window.__town = {
  stages,
  shot(i, { w = 1200, h = 760, advance = 0, pos = null, target = null } = {}) {
    const st = stages[i];
    for (let k = 0; k < advance * 30; k++) { clock.uTime.value += 1 / 30; st.update(clock.uTime.value, 1 / 30, true); }
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setSize(w, h, false);
    r.toneMapping = THREE.NeutralToneMapping;
    r.shadowMap.enabled = true;
    r.setClearColor(BG);
    const cam = st.camera.clone();
    if (pos) { cam.position.set(...pos); cam.lookAt(...(target ?? st.target.toArray())); }
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    r.render(st.scene, cam);
    const url = r.domElement.toDataURL('image/jpeg', 0.9);
    r.dispose();
    r.forceContextLoss();
    let img = document.getElementById('shot');
    if (!img) { img = document.createElement('img'); img.id = 'shot'; Object.assign(img.style, { position: 'fixed', left: 0, top: 0, width: '100%', zIndex: 99 }); img.onclick = () => img.remove(); document.body.appendChild(img); }
    img.src = url;
    return 'ok';
  },
};

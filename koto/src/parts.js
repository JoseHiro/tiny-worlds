// Koto parts catalog: roofs, the townhouse, the main hall, torii, kimono people, cherry and maple — and a short
// approach street putting them together. One renderer, one small scene per card (built when it comes near).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clock } from '../../sealife/src/kit.js';
import { person } from '../../airport/src/parts.js';
import { roof } from '../../town/src/roofs.js';
import { machiya, hondo, torii, senbonTorii, KOTO } from '../../town/src/koto.js';
import { sakura, momiji, Falling, setSeason, onSeason, SEASONS } from '../../town/src/seasons.js';

const BG = new THREE.Color('#eceee9');
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const grounds = []; // ground materials that follow the season

// a stone-paved ground (石畳) texture, shared
const paving = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#b5ad9f'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -24 : 0; x < 256; x += 48) {
    g.fillStyle = `hsl(35, 8%, ${62 + ((x * 7 + y * 3) % 9)}%)`; g.fillRect(x + 2, y + 2, 44, 28);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
function ground(scene, w, d, { stone = false, y = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: stone ? '#ffffff' : SEASONS.spring.grass, roughness: 1, map: stone ? (() => { const t = paving.clone(); t.needsUpdate = true; t.repeat.set(w / 4, d / 4); return t; })() : null }));
  m.position.y = y; m.receiveShadow = true;
  scene.add(m);
  if (!stone) grounds.push(m.material);
  return m;
}
onSeason((name, S) => grounds.forEach((m) => m.color.set(S.grass)));

function stage(build, { view = [1, 0.6, 1.1], fill = 0.95, shadows = false } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fffaf0', '#c9c4b4', 1.4));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.3);
  sun.position.set(12, 22, 9);
  if (shadows) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 }); sun.shadow.bias = -0.0005; }
  scene.add(sun);
  const built = build(scene);
  const sphere = new THREE.Box3().setFromObject(built.obj).getBoundingSphere(new THREE.Sphere());
  const target = built.target ?? sphere.center, radius = built.radius ?? sphere.radius;
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 600);
  camera.position.copy(vec(...view).normalize().multiplyScalar((radius / Math.sin(THREE.MathUtils.degToRad(15))) * fill)).add(target);
  camera.lookAt(target);
  return { scene, camera, target, update: built.update ?? (() => {}), obj: built.obj, built };
}
// a few things side by side, turning slowly unless still
function show(make, { spin = true, spacing = 0, update } = {}) {
  return (scene) => {
    const made = [].concat(make());
    const pivot = new THREE.Group();
    made.forEach((o, i) => { if (spacing) o.position.x += (i - (made.length - 1) / 2) * spacing; pivot.add(o); });
    scene.add(pivot);
    const moving = []; pivot.traverse((o) => { if (o !== pivot && o.userData.update) moving.push(o); });
    return { obj: pivot, update: (t, dt, still) => { if (spin && !still) pivot.rotation.y += dt * 0.2; update?.(made, t, dt); moving.forEach((o) => o.userData.update(t, dt)); } };
  };
}

// ---------- cards ----------
function kimonoCard(scene) {
  ground(scene, 8, 3, { stone: true });
  const roles = ['kimonoWoman', 'kimonoWoman2', 'kimonoMan', 'yukataGirl', 'kimonoWoman'];
  const g = new THREE.Group();
  const ps = roles.map((r, i) => { const p = person(r, { mode: i % 2 ? 'walk' : 'idle' }); p.position.set((i - 2) * 1.1, 0, 0); p.userData.phase = i; g.add(p); return p; });
  scene.add(g);
  return { obj: g, radius: 3, target: vec(0, 0.7, 0), update: (t) => ps.forEach((p) => p.userData.update(t)) };
}
function treesCard(scene) {
  ground(scene, 14, 8);
  const trees = [sakura({ seed: 1 }), sakura({ seed: 2, weeping: true }), momiji({ seed: 1 }), momiji({ seed: 3 })];
  trees.forEach((t, i) => { t.position.set((i - 1.5) * 3.4, 0, 0); scene.add(t); });
  const f = new Falling(scene, { area: [-7, 7, -3, 3], top: 4.5 });
  const g = new THREE.Group(); trees.forEach((t) => g.attach(t)); scene.add(g);
  return { obj: g, radius: 7, target: vec(0, 1.8, 0), update: (t, dt) => f.update(t, dt) };
}
function senbonCard(scene) {
  // a stone path climbing a slope in an S, roofed by the gates
  const path = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; path.push([Math.sin(t * Math.PI * 1.2) * 3, t * 3.2, -9 + t * 18]); }
  const s = senbonTorii({ path });
  scene.add(s);
  // the hillside under it
  const hill = new THREE.Mesh(new THREE.PlaneGeometry(16, 22, 16, 22).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: KOTO.moss, roughness: 1, flatShading: true }));
  const p = hill.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, (p.getZ(i) + 9) / 18 * 3.2 - 0.05 + Math.sin(p.getX(i) * 1.3) * 0.1); hill.geometry.computeVertexNormals();
  scene.add(hill);
  const walk = new THREE.Mesh(new THREE.TubeGeometry(s.userData.curve, 60, 0.01, 3), new THREE.MeshBasicMaterial({ visible: false })); void walk;
  const people = ['kimonoWoman', 'kimonoMan'].map((r, i) => { const pp = person(r, { mode: 'walk' }); scene.add(pp); return pp; });
  return { obj: s, radius: 9, target: vec(0, 1.8, 0), update: (t) => people.forEach((pp, i) => { const k = ((t * 0.035 + i * 0.12) % 1); const P = s.userData.curve.getPointAt(k), T = s.userData.curve.getTangentAt(k); pp.position.copy(P); pp.rotation.y = Math.atan2(-T.z, T.x); pp.userData.update(t); }) };
}
// the sample: a short approach street (参道) — townhouses both sides, a torii, the hall at the top, trees, people
function sandoSample(scene) {
  ground(scene, 60, 60);
  ground(scene, 6, 34, { stone: true, y: 0.01 }).position.z = 2;
  const shops = ['sweets', 'tea', 'craft', 'home'];
  for (let i = 0; i < 4; i++) for (const s of [1, -1]) {
    const m = machiya({ shop: shops[(i + (s > 0 ? 0 : 2)) % 4], lattice: (i + s) % 3 ? 'wood' : 'bengara' });
    m.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; m.position.set(s * 8.6, 0, 12 - i * 5.6); scene.add(m);
  }
  const t = torii(); t.scale.setScalar(1.4); t.position.set(0, 0, -6.5); scene.add(t);
  const h = hondo(); h.scale.setScalar(0.85); h.position.set(0, 0, -18); scene.add(h);
  [[-4.5, -8, 'sakura'], [4.6, -8.5, 'momiji'], [-6, -12, 'momiji'], [6, -12.5, 'sakura', true]].forEach(([x, z, k, w]) => { const tr = k === 'sakura' ? sakura({ seed: Math.abs(x) | 0, weeping: !!w }) : momiji({ seed: 2 }); tr.position.set(x, 0, z); scene.add(tr); });
  const roles = ['kimonoWoman', 'kimonoMan', 'kimonoWoman2', 'yukataGirl', 'tourist', 'kimonoWoman', 'senior', 'kimonoWoman2'];
  const walkers = roles.map((r, i) => { const p = person(r, { mode: 'walk' }); p.userData.phase = i; p.userData.lane = (i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.5); p.userData.k = i / roles.length; scene.add(p); return p; });
  const f = new Falling(scene, { area: [-9, 9, -16, 18], top: 7 });
  const updates = [];
  scene.traverse((o) => { if (o.userData?.update && o.userData.kind === 'building') updates.push(o); });
  return { obj: scene, radius: 20, target: vec(0, 1.5, -2), update: (tt, dt) => {
    f.update(tt, dt);
    updates.forEach((o) => o.userData.update(tt, dt));
    walkers.forEach((p, i) => { p.userData.k = (p.userData.k + dt * 0.012 * (i % 2 ? 1 : -1) + 1) % 1; const z = 17 - p.userData.k * 22; p.position.set(p.userData.lane, 0.02, z); p.rotation.y = i % 2 ? Math.PI / 2 : -Math.PI / 2; p.userData.update(tt); });
  } };
}

const C = (group, name, en, note, build, opts = {}) => ({ group, name, en, note, build, ...opts });
const ITEMS = [
  C('sample', '見本：参道', 'Sample · an approach street', '石畳の参道の両側に京町家（和菓子・お茶・扇子の店、住まい）、朱の鳥居、その奥に本堂 · 桜としだれ桜、楓 · 着物の人が行き交う · 季節で花・葉・地面が変わり、花びら・落ち葉・雪が舞う', sandoSample, { wide: true, view: [0.12, 0.5, 1], fill: 0.62, shadows: true }),
  C('roof', '屋根の4つの形', 'Roof kinds', '切妻（瓦）· 寄棟（檜皮）· 入母屋（銅板、反りと隅の跳ね上がり）· 宝形（瓦、宝珠）· 瓦の列は屋根面の波で、棟と鬼瓦、隅棟つき', show(() => [roof({ kind: 'gable', w: 5, d: 4, h: 1.8 }), roof({ kind: 'hip', w: 5, d: 4, h: 1.6, material: 'hiwada' }), roof({ kind: 'irimoya', w: 5.6, d: 4.4, h: 2.4, sori: 0.25, corner: 0.5, material: 'copper' }), roof({ kind: 'hogyo', w: 4, d: 4, h: 2.0, sori: 0.2, corner: 0.3 })], { spacing: 6.2, spin: false }), { view: [0.25, 0.55, 1.1], fill: 0.55 }),
  C('building', '京町家', 'Kyo-machiya', '間口5.4 × 奥行11 · 千本格子、虫籠窓、犬矢来、一文字瓦の庇、暖簾（揺れる）、ばったり床几、鍾馗さん · 和菓子・お茶・扇子の店と住まい、格子は焦茶か弁柄', show(() => ['sweets', 'tea', 'craft', 'home'].map((s, i) => machiya({ shop: s, lattice: i === 1 ? 'bengara' : 'wood' })), { spacing: 5.8, spin: false }), { view: [0.3, 0.4, 1.2], fill: 0.7 }),
  C('building', '本堂', 'Main hall', '14 × 11 · 石の基壇と縁側、柱と組物、垂木、入母屋の大屋根（反り）、向拝、木の階段、擬宝珠の欄干、賽銭箱、大提灯', show(() => hondo(), { spin: false }), { view: [0.55, 0.45, 1.1] }),
  C('shrine', '鳥居', 'Torii', '明神鳥居（朱、反った笠木、額）· 石の明神鳥居 · 神明鳥居（素木、まっすぐ）', show(() => [torii(), torii({ color: 'stone' }), torii({ type: 'shinmei', color: 'wood' })], { spacing: 5.5, spin: false }), { view: [0.2, 0.3, 1.2], fill: 0.6 }),
  C('shrine', '千本鳥居', 'A thousand torii', '小さな朱の鳥居が坂道に続くトンネル（全部で5回の描画）· 一基ずつ少し違う · 着物の人が上る', senbonCard, { view: [1, 0.6, 0.5], fill: 0.85 }),
  C('people', '着物の人', 'People in kimono', '小紋（桜・菊の柄）と帯のお太鼓、半衿、袂（揺れる袖）、まとめ髪とかんざし、草履 · 羽織の男性 · 浴衣の子ども · 歩幅は小さく', kimonoCard, { view: [0.25, 0.3, 1.2], fill: 0.6 }),
  C('nature', '桜・しだれ桜・楓', 'Cherry · weeping cherry · maple', '季節で色が変わる：春は桜色と若葉、初夏は緑、秋は紅葉、冬は枝だけ · 花びら・落ち葉・雪が舞う', treesCard, { view: [0.3, 0.35, 1.2], fill: 0.7 }),
];
const GROUPS = [['all', 'すべて'], ['sample', '見本'], ['roof', '屋根'], ['building', '建物'], ['shrine', '神社'], ['people', '人'], ['nature', '自然']];

// ---------- page ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const grid = document.getElementById('grid'), tabs = document.getElementById('tabs'), seasonsNav = document.getElementById('seasons');
for (const [id, ja] of GROUPS) { const b = document.createElement('button'); b.textContent = `${ja} ${id === 'all' ? ITEMS.length : ITEMS.filter((i) => i.group === id).length}`; b.dataset.tab = id; b.onclick = () => showTab(id); tabs.appendChild(b); }
for (const [id, S] of Object.entries(SEASONS)) { const b = document.createElement('button'); b.textContent = S.ja; b.dataset.season = id; b.onclick = () => { setSeason(id); [...seasonsNav.children].forEach((x) => x.classList.toggle('on', x === b)); }; seasonsNav.appendChild(b); }
seasonsNav.children[0].classList.add('on');
const cards = ITEMS.map((item) => {
  const card = document.createElement('div');
  card.className = 'card' + (item.wide ? ' wide' : '');
  card.innerHTML = `<div class="view"></div><div class="meta"><b>${item.name}</b> <span>${item.en}</span><small>${item.note}</small></div>`;
  grid.appendChild(card);
  const c = { item, card, view: card.querySelector('.view'), st: null };
  card.onclick = () => openDetail(c);
  return c;
});
const ready = (c) => (c.st ??= (() => { const st = stage(c.item.build, c.item); st.scene.background = c.item.wide ? BG : null; return st; })());
function showTab(id) { cards.forEach((c) => (c.card.style.display = id === 'all' || c.item.group === id ? '' : 'none')); [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.tab === id)); }
showTab('all');
const detailEl = document.getElementById('detail'), detailView = document.getElementById('detailView');
let detail = null, detailCam = null, controls = null;
function openDetail(c) { const st = ready(c); detail = c; detailCam = st.camera.clone(); controls = new OrbitControls(detailCam, detailView); controls.target.copy(st.target); controls.enableDamping = true; document.getElementById('dName').textContent = `${c.item.name} · ${c.item.en}`; document.getElementById('dNote').textContent = c.item.note; detailEl.classList.add('open'); }
function closeDetail() { if (!detail) return; controls.dispose(); detail = null; detailEl.classList.remove('open'); }
document.getElementById('close').onclick = closeDetail;
addEventListener('keydown', (e) => e.key === 'Escape' && closeDetail());
const resize = () => renderer.setSize(innerWidth, innerHeight, false);
addEventListener('resize', resize); resize();
const timer = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(timer.getDelta(), 0.05), t = timer.elapsedTime;
  clock.uTime.value = t;
  const H = canvas.clientHeight;
  renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
  const jobs = detail ? [[detail, detailView, true]] : cards.map((c) => [c, c.view, false]);
  for (const [c, view, inDetail] of jobs) {
    const r = view.getBoundingClientRect();
    if (r.bottom < -300 || r.top > H + 300 || r.width === 0) continue;
    const st = ready(c);
    if (r.bottom < 0 || r.top > H) continue;
    const cam = inDetail ? detailCam : st.camera;
    st.update(t, dt, inDetail);
    if (inDetail) controls.update();
    cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height); renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(st.scene, cam);
  }
});

// debug: a contact sheet of cards at a fixed size (the preview pane is narrow); the extra renderer is disposed
window.__koto = {
  cards, ready, setSeason,
  sheet(ids, { cols = 2, W = 600, Hh = 400, advance = 1 } = {}) {
    const rows = Math.ceil(ids.length / cols), cv = document.createElement('canvas'); cv.width = W * cols; cv.height = Hh * rows;
    const ctx = cv.getContext('2d'); ctx.font = '18px sans-serif';
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, Hh, false); r.toneMapping = THREE.NeutralToneMapping; r.shadowMap.enabled = true; r.setClearColor(BG);
    ids.forEach((i, n) => { const st = ready(cards[i]); for (let k = 0; k < advance * 30; k++) { clock.uTime.value += 1 / 30; st.update(clock.uTime.value, 1 / 30, true); } const cam = st.camera.clone(); cam.aspect = W / Hh; cam.updateProjectionMatrix(); r.render(st.scene, cam); ctx.drawImage(r.domElement, (n % cols) * W, Math.floor(n / cols) * Hh); ctx.fillStyle = '#000'; ctx.fillText(i + ' ' + cards[i].item.name, (n % cols) * W + 6, Math.floor(n / cols) * Hh + 20); });
    r.dispose(); r.forceContextLoss();
    let img = document.getElementById('shot'); if (!img) { img = document.createElement('img'); img.id = 'shot'; Object.assign(img.style, { position: 'fixed', left: 0, top: 0, width: '100%', zIndex: 999 }); img.onclick = () => img.remove(); document.body.appendChild(img); }
    img.src = cv.toDataURL('image/jpeg', 0.88);
    return new Promise((res) => (img.onload = () => res('ok')));
  },
};

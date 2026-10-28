// Café parts catalog (cafe/DESIGN.md §3–§5): the shell, the counter and its machines, seats and tables, lamps and
// plants, cups with steam, laptops and books, the café's people, and a rainy window. One renderer, cards built lazily.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clock } from '../../sealife/src/kit.js';
import { person } from '../../airport/src/parts.js';
import { cat } from '../../town/src/koto-props.js';
import { CAFE, setGlow, shell, counter, espressoMachine, grinder, pourOver, register, pastryCase, menuBoard, wallShelf, windowBar, stool, chair, roundTable, longTable, sofa, armchair, rug, lowTable, pendant, floorLamp, candle, stringLights, plant, bookshelf, door, awning, bladeSign, aFrame, umbrellaStand, coatRack, ceilingFan, recordPlayer } from './furniture.js';
import { cup, laptop, book, notebook, tablet, phone, plate, Steam } from './things.js';
import { Rain, WindowDrops } from './rain.js';

const BG = new THREE.Color('#ece6dc');
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const floor = (scene, w, d, c = 0xb0855a) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })); m.receiveShadow = true; scene.add(m); return m; };
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
function cupsCard(scene) {
  floor(scene, 3, 1.6, 0xc49a6c);
  const steam = new Steam(scene, { max: 80 });
  const g = new THREE.Group();
  [['latte', 'heart'], ['latte', 'leaf'], ['cappuccino'], ['espresso'], ['mug', null, CAFE.sage], ['tea'], ['iced']].forEach(([k, art, color], i) => { const c = cup({ kind: k, art: art ?? 'heart', color: color ?? CAFE.white }); c.position.set((i - 3) * 0.24, 0, 0); g.add(c); if (c.userData.hot) steam.add(c); });
  [plate({ food: 'roll' }), plate({ food: 'cake' }), plate({ food: 'croissant' })].forEach((p, i) => { p.position.set((i - 1) * 0.3, 0, 0.3); g.add(p); });
  scene.add(g);
  return { obj: g, radius: 0.9, target: vec(0, 0.05, 0.1), update: (t, dt) => steam.update(t, dt) };
}
function deskCard(scene) {
  floor(scene, 3, 1.6, 0xc49a6c);
  const items = [laptop({ screen: 'code' }), laptop({ screen: 'sheet' }), laptop({ screen: 'design' }), laptop({ screen: 'call' }), tablet(), book(), notebook(), phone()];
  const g = new THREE.Group();
  items.forEach((o, i) => { o.position.set((i % 4 - 1.5) * 0.42, 0, Math.floor(i / 4) * 0.4 - 0.1); o.userData.typing = true; g.add(o); });
  scene.add(g);
  return { obj: g, radius: 1.0, target: vec(0, 0.08, 0.1), update: (t, dt) => items.forEach((o) => o.userData.update?.(t, dt)) };
}
function peopleCard(roles, modes) {
  return (scene) => {
    floor(scene, roles.length * 1.0 + 1, 2.2, 0xc49a6c);
    const g = new THREE.Group();
    const ps = roles.map((r, i) => { const p = person(r, { mode: modes[i % modes.length] }); p.position.set((i - (roles.length - 1) / 2) * 0.95, modes[i % modes.length].startsWith('sit') ? 0.43 : 0, 0); p.userData.phase = i; if (modes[i % modes.length].startsWith('sit')) { const s = stool(); s.position.copy(p.position).setY(0); g.add(s); } g.add(p); return p; });
    scene.add(g);
    return { obj: g, radius: roles.length * 0.48 + 0.5, target: vec(0, 0.75, 0), update: (t) => ps.forEach((p) => p.userData.update(t)) };
  };
}
function windowCard(scene) {
  const sh = shell({ w: 4, d: 2.6, h: 2.8, openings: { front: [[-1.6, 1.6, 'window']] } });
  sh.userData.walls.back.visible = sh.userData.walls.left.visible = sh.userData.walls.right.visible = false; sh.userData.ceiling.visible = false;
  scene.add(sh);
  const bar = windowBar({ len: 3.2 }); bar.position.set(0, 0, 1.0); sh.add(bar);
  const p = person('macWorker', { mode: 'sitType' }); p.position.set(0, 0.43, 0.5); p.rotation.y = -Math.PI / 2; sh.add(p);
  const st = stool(); st.position.set(0, 0, 0.5); sh.add(st);
  const lp = laptop({ screen: 'code' }); lp.position.set(0, bar.userData.top, 1.0); lp.rotation.y = Math.PI; lp.userData.typing = true; sh.add(lp);
  const ground = floor(scene, 6, 3, 0x5a5d62); ground.position.set(0, -0.01, 2.6);
  sh.updateMatrixWorld(true);
  const wg = sh.userData.walls.front, pn = wg.userData.panes[0], c = vec((pn.x0 + pn.x1) / 2, (pn.y0 + pn.y1) / 2, 0); wg.localToWorld(c);
  const drops = new WindowDrops(scene, [{ center: c, normal: vec(0, 0, 1), w: pn.x1 - pn.x0, h: pn.y1 - pn.y0 }]);
  const rain = new Rain(scene, { zones: [[-3, 3, 1.5, 4, 0]], top: 4, count: 600, splashes: 30 });
  return { obj: sh, radius: 2.2, target: vec(0, 1.3, 1.1), update: (t, dt) => { drops.update(dt, 1); rain.update(t, dt, 1); p.userData.update(t); lp.userData.update(t, dt); } };
}
const C = (group, name, en, note, build, opts = {}) => ({ group, name, en, note, build, ...opts });
const ITEMS = [
  C('room', '店の殻', 'The shop shell', 'ドールハウスのように近い壁が消える · 板張りの床、しっくい白とセージの腰壁、レンガの一面、黒い窓枠と透明なガラス、窓台、ドアの開口、天井の梁', show(() => { const sh = shell({ w: 8, d: 6, h: 3, openings: { front: [[-3.4, -0.6, 'window'], [0.6, 1.7, 'door']], right: [[-2, 1.5, 'window']] } }); sh.userData.walls.right.visible = false; sh.userData.ceiling.visible = false; sh.userData.walls.front.position.z += 1.2; return sh; }, { spin: false }), { view: [0.6, 0.8, 1], fill: 0.8 }),
  C('room', '雨の窓', 'A rainy window', '窓際の席でノートPCに向かう人 · ガラスに雨粒がつき、すじを引いてつたう · 外は雨の線と水たまりの輪', windowCard, { view: [0.05, 0.12, 1], fill: 0.62 }),
  C('counter', 'カウンターとマシン', 'Counter and machines', 'カウンター（オークのスラット、大理石の天板）· エスプレッソマシン（セージ色、カップウォーマー）· グラインダー · ハンドドリップのスタンドと細口ケトル · レジのタブレットとチップの瓶', show(() => { const c = counter({ len: 3 }), e = espressoMachine(), gr = grinder(), po = pourOver(), r = register(); e.position.set(-0.6, c.userData.top, 0); gr.position.set(-1.3, c.userData.top, 0); po.position.set(0.6, c.userData.top, 0); r.position.set(1.25, c.userData.top, 0.1); return [c, e, gr, po, r]; }, { spin: false }), { view: [0.3, 0.4, 1], fill: 0.75 }),
  C('counter', 'ケース・メニュー・棚', 'Pastry case, menu, shelves', '中が光るペストリーケース（北欧・和・バルセロナの3種）· 手書き風の黒板メニュー · マグと豆の棚', show(() => { const a = pastryCase(), b = pastryCase({ items: 'wa' }), c = pastryCase({ items: 'barcelona' }), m = menuBoard(), s = wallShelf(); a.position.x = -1.6; c.position.x = 1.6; m.position.set(0, 2.1, -0.5); s.position.set(0, 1.5, -0.5); return [a, b, c, m, s]; }, { spin: false }), { view: [0.2, 0.35, 1], fill: 0.7 }),
  C('seat', '椅子・スツール・テーブル', 'Chairs, stools, tables', '曲げ木の椅子 · Y字の背の椅子 · 籐のビストロチェア · 高いスツール · 大理石の丸テーブル · 長い相席テーブル · 窓際のカウンター', show(() => { const it = [chair(), chair({ kind: 'wishbone', color: CAFE.oak }), chair({ kind: 'bistro', color: 0x2a2a2c }), stool(), roundTable(), longTable({ len: 1.8 }), windowBar({ len: 1.6 })]; it.forEach((o, i) => (o.position.x = (i - 3) * 1.1)); it[5].position.x += 0.5; it[6].position.x += 1.0; return it; }, { spin: false }), { view: [0.1, 0.35, 1], fill: 0.36 }),
  C('seat', 'ソファの一角', 'The sofa corner', '布のソファ（クッションとからし色の枕）· テラコッタのアームチェア · ローテーブル · ラグ · 本棚 · フロアランプ · レコードプレーヤー（回る）', show(() => { const s = sofa(), a = armchair(), r = rug(), t = lowTable(), b = bookshelf(), l = floorLamp(), rp = recordPlayer(); a.position.set(1.6, 0, 0.5); a.rotation.y = -0.6; t.position.set(0, 0, 0.9); b.position.set(-1.9, 0, -0.2); l.position.set(1.4, 0, -0.5); rp.position.set(0.1, 0.34, 0.9); r.position.set(0.2, 0, 0.7); return [s, a, r, t, b, l, rp]; }, { spin: false }), { view: [0.4, 0.5, 1], fill: 0.75 }),
  C('light', '照明・キャンドル・植物', 'Lamps, candles, plants', 'ペンダント（ガラスの球・円すい・重ねた笠）· ストリングライト · キャンドル（炎が揺れる）· 天井扇（回る）· ウンベラータ、モンステラ、吊るしたポトス、窓辺の小鉢', show(() => { const it = [pendant({ drop: 0.4 }), pendant({ kind: 'cone', drop: 0.4, color: CAFE.sage }), pendant({ kind: 'layered', drop: 0.4 }), ceilingFan()]; it.forEach((o, i) => o.position.set((i - 1.5) * 0.9, 2.4, 0)); const s = stringLights([[-1.6, 1.6, -0.6], [1.6, 1.6, -0.6]]); const c = [candle(), candle({ jar: false })]; c.forEach((o, i) => o.position.set(-0.3 + i * 0.6, 0, 0.6)); const p = [plant(), plant({ kind: 'monstera' }), plant({ kind: 'hanging' }), plant({ kind: 'small' })]; p[0].position.set(-1.8, 0, 0); p[1].position.set(1.8, 0, 0); p[2].position.set(0.9, 2.3, 0.6); p[3].position.set(0, 0, 0.6); return [...it, s, ...c, ...p]; }, { spin: false }), { view: [0.2, 0.3, 1], fill: 0.7 }),
  C('light', '入口と外まわり', 'Door and outside', 'ガラスと木のドア（開くとベルが揺れる）· 傘立て · コート掛け · ストライプのひさし · 吊り看板 · 黒板の立て看板', show(() => { const d = door(), u = umbrellaStand(), c = coatRack(), a = awning({ w: 2.4 }), b = bladeSign(), f = aFrame(); u.position.x = 1.0; c.position.x = 1.7; a.position.set(-0.2, 2.8, 0); b.position.set(-1.8, 2.6, 0); f.position.set(-1.3, 0, 0.9); d.userData.open = 1; return [d, u, c, a, b, f]; }, { spin: false, update: (m, t, dt) => { m[0].userData.open = Math.sin(t * 0.6) > 0 ? 1 : 0; m[0].userData.update(t, dt); } }), { view: [0.3, 0.3, 1], fill: 0.7 }),
  C('thing', 'カップと湯気', 'Cups and steam', 'ラテ（ハート・リーフ）· カプチーノ · エスプレッソ · マグ · 紅茶 · アイスラテ（層と氷）· シナモンロール、ケーキ、クロワッサン · 湯気がふわっと上る', cupsCard, { view: [0.1, 0.6, 1] }),
  C('thing', 'ノートPCと勉強道具', 'Laptops and study things', '銀色の薄いノートPC（画面：コード・表・デザイン・ビデオ通話、打つとスクロール）· タブレットとペン · 開いた本 · ノートと蛍光ペン · スマホ', deskCard, { view: [0.1, 0.8, 1] }),
  C('people', 'バリスタと働く人', 'Baristas and workers', 'バリスタ（デニムのエプロン、注ぐ）· 若いバリスタ（キャップ、拭く）· ノートPCの人（眼鏡、打つ）· ビデオ通話の人（ヘッドホン）· デザイナー（ベレー帽、考える）', peopleCard(['barista', 'barista2', 'macWorker', 'callWorker', 'designer'], ['pour', 'wipe', 'sitType', 'sitChat', 'sitThink']), { view: [0.25, 0.3, 1], fill: 0.62 }),
  C('people', '勉強・読書・おしゃべり', 'Study, reading, talking', '学生（書く・伸び）· 読書の人（ページをめくる）· おしゃべりの人（カップを口へ）· 新聞のおじいさん（ハンチング）· 親子（雨合羽の子ども）· 雨で駆け込む人（傘）· 店の猫', (scene) => { const r = peopleCard(['studentA', 'studentB', 'reader', 'chatA', 'oldman', 'parent', 'rainKid', 'rainComer'], ['sitWrite', 'sitStretch', 'sitRead', 'sitSip', 'sitRead', 'sitChat', 'idle', 'walk'])(scene); r.radius += 0.6; const k = cat({ mode: 'sleep' }); k.position.set(4.4, 0, 0.6); r.obj.add(k); const u = r.update; return { ...r, update: (t, dt) => { u(t, dt); k.userData.update(t); } }; }, { view: [0.25, 0.3, 1], fill: 0.6 }),
];
const GROUPS = [['all', 'すべて'], ['room', '店'], ['counter', 'カウンター'], ['seat', '席'], ['light', '照明・入口'], ['thing', '小物'], ['people', '人']];

// ---------- page ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const grid = document.getElementById('grid'), tabs = document.getElementById('tabs'), seasonsNav = document.getElementById('seasons');
for (const [id, ja] of GROUPS) { const b = document.createElement('button'); b.textContent = `${ja} ${id === 'all' ? ITEMS.length : ITEMS.filter((i) => i.group === id).length}`; b.dataset.tab = id; b.onclick = () => showTab(id); tabs.appendChild(b); }
{ // evening: the bulbs, candles and the pastry case brighten
  const b = document.createElement('button'); b.textContent = '夕方の灯り';
  b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); setGlow(on ? 1 : 0); };
  seasonsNav.appendChild(b);
}
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
window.__cafeParts = {
  cards, ready,
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

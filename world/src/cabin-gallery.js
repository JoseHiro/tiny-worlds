// In-flight parts catalogue (world/CABIN.md §5): one renderer, one scene per card, scissor viewports.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { person } from '../../airport/src/parts.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { CP, setMood, tickMood, tickScreens, moodLight, mood, geoCount } from './cabin/common.js';
import * as S from './cabin/seats.js';
import * as F from './cabin/shell.js';
import * as G from './cabin/service.js';
import * as P from './cabin/props.js';

const LOOK = { px: 0, nx: Math.PI, nz: Math.PI / 2, pz: -Math.PI / 2 };
const at = (o, x, z, y = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
const set = (o, s) => Object.assign(o.userData.state, s);
// a seated person (or lying, for a flat bed) at a seat of a part placed in `parent`
function sitter(parent, part, i, role, mode, opts = {}) {
  const p = person(role, { mode, seed: opts.seed });
  const seat = part.userData.seats[i].clone().applyMatrix4(part.matrix);
  p.position.copy(seat);
  p.rotation.y = part.rotation.y;
  p.userData.phase = opts.phase ?? Math.random() * 10;
  if (p.userData.suitcase) p.userData.suitcase.visible = false;
  parent.add(p);
  return p;
}
// where a meal tray sits on the tray table of seat i of the row `front` (the table folds down toward the row behind)
const onTray = (front, i) => front.userData.seats[i].clone().applyMatrix4(front.matrix).add(new THREE.Vector3(-0.47, 0.555, 0));
const updateAll = (g, list) => { const prev = g.userData.update; g.userData.update = (t, dt) => { prev?.(t, dt); for (const o of list) o.userData.update(t, dt); }; };

// ---------- overview: a 16-long slice with all three classes ----------
function sampleCabin() {
  const g = new THREE.Group();
  const live = [];
  const add = (o) => { g.add(o); o.updateMatrix(); if (o.userData.update) live.push(o); return o; };
  const sec = add(F.section(16));
  set(sec, { shades: 0 });
  // business: two rows of 1-2-1 pods; window pods turn toward the window
  const pods = [];
  for (const x of [6.4, 4.2]) {
    pods.push(add(at(S.businessPod(), x, -2.28, 0, 0.35)));
    pods.push(add(at(S.businessPod(), x, -0.43)));
    pods[pods.length - 1].scale.z = -1;
    pods.push(add(at(S.businessPod(), x, 0.43)));
    pods.push(add(at(S.businessPod(), x, 2.28, 0, -0.35)));
    pods[pods.length - 1].scale.z = -1;
  }
  for (const p of pods) p.updateMatrix();
  const flat = pods[0];
  set(flat, { recline: 1, door: 1 });
  const sleeper = person('business', { mode: 'lie', seed: 5 });
  sleeper.position.copy(flat.userData.bed.clone().applyMatrix4(flat.matrix));
  sleeper.rotation.set(0, flat.rotation.y, Math.PI / 2); // on its back, head toward the pillow
  g.add(sleeper); live.push(sleeper);
  live.push(sitter(g, pods[2], 0, 'woman', 'sitWatch'), sitter(g, pods[5], 0, 'senior', 'sitRead'), sitter(g, pods[7], 0, 'business', 'sitType'));
  add(P.laptop()).position.copy(pods[7].userData.seats[0].clone().applyMatrix4(pods[7].matrix)).add(new THREE.Vector3(0.3, 0.5, 0));
  add(at(F.divider({ accent: CP.gold }), 2.55, 0)).userData.state.open = 0.8;
  // premium economy: 2-3-2, two rows
  const prem = [];
  for (const x of [1.6, 0.6]) for (const [n, z] of [[2, -2.1], [3, 0], [2, 2.1]]) prem.push(add(at(S.premRow({ n }), x, z)));
  set(prem[0], { recline0: 1, legrest0: 1 });
  live.push(sitter(g, prem[0], 0, 'woman', 'sitSleep'), sitter(g, prem[1], 1, 'passenger', 'sitWatch'), sitter(g, prem[4], 0, 'backpacker', 'sitStretch'), sitter(g, prem[5], 1, 'senior', 'sitSleep'));
  add(at(P.blanket({ spread: true }), 0, 0)).position.copy(prem[0].userData.seats[0].clone().applyMatrix4(prem[0].matrix)).add(new THREE.Vector3(0.05, 0.42, 0));
  add(at(F.divider({ accent: PALETTE_TEAL }), -0.2, 0)).userData.state.open = 0.3;
  // economy: a bulkhead with a bassinet, then 3-3-3 rows
  for (const z of [-2.25, 0, 2.25]) { const b = add(at(S.bulkhead({ screen: 'map' }), -0.55, z)); set(b, { baby: z === 0 }); }
  const rows = [];
  for (let r = 0; r < 7; r++) {
    const x = -1.15 - r * 0.85;
    rows.push([-2.25, 0, 2.25].map((z) => add(at(S.ecoTriple(), x, z))));
  }
  // meal service halfway down: trays down, meals out
  const eat = [[2, 0, 0, 'passenger'], [2, 0, 1, 'woman'], [2, 1, 2, 'business'], [3, 2, 0, 'senior'], [3, 2, 1, 'backpacker']];
  for (const [r, b, i, role] of eat) {
    const ahead = rows[r - 1][b];
    set(ahead, { ['tray' + i]: 1 });
    const meal = add(G.mealTray());
    meal.position.copy(onTray(ahead, i));
    set(meal, { lid: 1 });
    live.push(sitter(g, rows[r][b], i, role, 'sitEat'));
  }
  const hana = sitter(g, rows[4][0], 0, 'child', 'sitWindow', { seed: 3 });
  live.push(hana, sitter(g, rows[4][0], 1, 'woman', 'sitRead'), sitter(g, rows[4][0], 2, 'passenger', 'sitSleep'));
  const bearP = P.bear();
  bearP.position.set(0.18, 0.42, 0.06); bearP.rotation.y = -0.6; hana.add(bearP);
  live.push(sitter(g, rows[1][1], 1, 'backpacker', 'sitWatch'), sitter(g, rows[5][2], 2, 'business', 'sitSleep'), sitter(g, rows[6][1], 0, 'woman', 'sitWatch'), sitter(g, rows[0][2], 0, 'senior', 'sitRead'));
  set(rows[5][2], { recline2: 1 });
  // the drinks round in the left aisle, meals in the right one
  const drinks = add(at(G.trolley({ kind: 'drinks' }), -4.2, -1.15));
  set(drinks, { open: 1 });
  const fa1 = at(person('attendant', { mode: 'serve' }), -4.75, -1.15, 0, LOOK.nz); g.add(fa1); live.push(fa1);
  const meals = add(at(G.trolley({ kind: 'meals' }), -2.6, 1.15, 0, Math.PI));
  set(meals, { open: 1 });
  const fa2 = at(person('attendant', { mode: 'serve', seed: 9 }), -2.0, 1.15, 0, LOOK.pz); g.add(fa2); live.push(fa2);
  // bins over the seats (business has side bins only)
  for (const s of [-1, 1]) add(at(F.bins(10, { kind: 'side', side: s }), -3, 0));
  add(at(F.bins(10, { kind: 'center' }), -3, 0));
  for (const s of [-1, 1]) add(at(F.bins(6, { kind: 'side', side: s }), 5, 0));
  updateAll(g, live);
  return g;
}
const PALETTE_TEAL = 0x4f9d8f;

// ---------- cards ----------
function eatingRow() {
  const g = new THREE.Group();
  const front = at(S.ecoTriple(), 0.85, 0), row = at(S.ecoTriple(), 0, 0);
  g.add(front, row);
  front.updateMatrix(); row.updateMatrix();
  set(front, { tray0: 1, tray1: 1, tray2: 1 });
  const live = [front, row];
  ['sitEat', 'sitWatch', 'sitSleep'].forEach((m, i) => live.push(sitter(g, row, i, ['woman', 'passenger', 'business'][i], m)));
  const meal = G.mealTray();
  meal.position.copy(onTray(front, 0));
  set(meal, { lid: 1 });
  g.add(meal);
  live.splice(2, 0, meal);
  updateAll(g, live);
  g.userData.modes = live.slice(3);
  return g;
}
function crewPair() {
  const g = new THREE.Group();
  const cart = at(G.trolley({ kind: 'drinks' }), 0.2, 0);
  set(cart, { open: 1 });
  const a = at(person('attendant', { mode: 'push' }), -0.45, 0, 0, LOOK.px);
  const b = at(person('attendant', { mode: 'serve', seed: 9 }), 0.85, 0.3, 0, LOOK.nz);
  g.add(cart, a, b);
  updateAll(g, [cart, a, b]);
  return g;
}
function deckWithPilots() {
  const d = G.flightDeck();
  const ps = d.userData.seats.map((p, i) => { const x = person('pilot', { mode: i ? 'sit' : 'sitSip', seed: 20 + i }); x.position.copy(p); d.add(x); return x; });
  updateAll(d, ps);
  return d;
}
function lavWithQueue() {
  const g = new THREE.Group();
  const lav = G.lavatory();
  g.add(lav);
  const q = at(person('child', { mode: 'idle', seed: 4 }), lav.userData.queue.x, lav.userData.queue.z, 0, LOOK.nx);
  const q2 = at(person('woman', { mode: 'idle', seed: 8 }), lav.userData.queue.x + 0.5, lav.userData.queue.z, 0, LOOK.nx);
  g.add(q, q2);
  updateAll(g, [lav, q, q2]);
  g.userData.lav = lav;
  return g;
}
function propsSet() {
  const g = new THREE.Group();
  const items = [P.blanket(), P.blanket({ spread: true }), P.pillow(), P.headphones(), P.eyeMask(), P.laptop(), P.book(), P.book(0x2c6fb0), P.phone(), P.bottle(), P.amenityKit(), P.shoes(), P.backpack(), P.menuCard(), P.bear()];
  items.forEach((o, i) => { o.position.set((i % 5 - 2) * 0.45, i === 1 ? 0.06 : 0, (Math.floor(i / 5) - 1) * 0.45); g.add(o); });
  updateAll(g, items.filter((o) => o.userData.update));
  return g;
}
function poseLine() {
  const g = new THREE.Group();
  const modes = ['sitSleep', 'sitEat', 'sitWatch', 'sitWindow', 'sitRead', 'sitType'];
  const live = modes.map((m, i) => { const p = person(['senior', 'woman', 'passenger', 'child', 'business', 'backpacker'][i], { mode: m, seed: 30 + i }); p.position.z = (i - 2.5) * 0.55; if (p.userData.suitcase) p.userData.suitcase.visible = false; g.add(p); return p; });
  updateAll(g, live);
  return g;
}
const demoCycle = (t, period = 6) => (Math.sin((t * Math.PI * 2) / period) + 1) / 2 > 0.5 ? 1 : 0;

const ITEMS = [
  { group: 'overview', tag: 'Overview', wide: true, build: sampleCabin, view: [0.35, 1.6, 0.9], zoom: 0.6,
    name: ['3クラスの見本（16の区間）', 'Three classes in a 16-long slice'],
    note: ['ビジネス個室（1人は横になって眠る）→ プレエコ → エコノミー。飲み物とミールのカートが通路に。照明は上の「照明」で切り替え', 'Business pods (one asleep flat) → premium economy → economy. Drinks and meal trolleys in the aisles. Change the light with "Mood" above.'] },
  { group: 'seats', tag: 'S1 · Business', build: () => S.businessPod(), view: [0.9, 1.1, 1.1],
    name: ['ビジネス個室', 'Business pod'], note: ['1.9×0.82 · フルフラット · スライドドア · 読書灯 · 寝るとブランケットと枕', '1.9 × 0.82 · lies flat · sliding door · reading lamp · blanket and pillow when flat'],
    demo: (o, t) => set(o, { recline: demoCycle(t, 8), door: demoCycle(t + 2, 8) }),
    toggles: [{ label: ['フルフラット', 'Lie flat'], key: 'recline' }, { label: ['ドアを閉める', 'Close the door'], key: 'door' }] },
  { group: 'seats', tag: 'S2 · Premium', build: () => S.premRow({ n: 3 }), view: [-1, 0.9, 0.9],
    name: ['プレミアムエコノミー（3連）', 'Premium economy (three)'], note: ['幅0.58 · レッグレスト · 肘掛けにカクテルテーブル · ティール', 'Seat 0.58 wide · leg rest · cocktail table in the armrest · teal'],
    demo: (o, t) => set(o, { recline1: demoCycle(t, 7), legrest1: demoCycle(t, 7) }),
    toggles: [{ label: ['リクライニング', 'Recline'], key: ['recline0', 'recline1', 'recline2'] }, { label: ['レッグレスト', 'Leg rest'], key: ['legrest0', 'legrest1', 'legrest2'] }] },
  { group: 'seats', tag: 'S3 · Economy', build: () => S.ecoTriple(), view: [-1, 0.8, 0.8],
    name: ['エコノミー（3連）', 'Economy (three)'], note: ['幅0.5 · ピッチ0.85 · 背面に画面（地図・映画）· テーブル · ポケット', 'Seat 0.5 · pitch 0.85 · seat-back screens (map, films) · tray table · pocket'],
    demo: (o, t) => set(o, { tray0: demoCycle(t, 6), tray2: demoCycle(t + 3, 6), recline1: demoCycle(t + 1, 6) }),
    toggles: [{ label: ['テーブルを出す', 'Tray tables down'], key: ['tray0', 'tray1', 'tray2'] }, { label: ['リクライニング', 'Recline'], key: ['recline0', 'recline1', 'recline2'] }] },
  { group: 'seats', tag: 'S3 · Meal time', build: eatingRow, view: [-1, 1.0, 0.7],
    name: ['エコノミーの食事', 'Economy at meal time'], note: ['前の席のテーブルにトレー · 食べる・映画・眠る', 'A tray on the table in front · eating, watching, asleep'] },
  { group: 'seats', tag: 'S4 · Bulkhead', build: () => S.bulkhead(), view: [-1, 0.8, 0.6],
    name: ['前方壁とバシネット', 'Bulkhead with a bassinet'], note: ['大きい運航マップ · 赤ちゃんのベッド（寝ている）', 'A big moving map · a baby asleep in the bassinet'],
    toggles: [{ label: ['赤ちゃん', 'Baby'], key: 'baby', on: true }] },
  { group: 'seats', tag: 'S5 · Crew', build: () => S.jumpSeat(), view: [1, 0.8, 0.8],
    name: ['乗務員の補助席', 'Crew jump seat'], note: ['壁付け · 座面が下りる · ハーネス', 'Wall-mounted · the seat drops down · harness'],
    demo: (o, t) => set(o, { open: demoCycle(t, 5) }), toggles: [{ label: ['座面を下ろす', 'Seat down'], key: 'open', on: true }] },

  { group: 'frame', tag: 'F1 · Section', build: () => F.section(5), view: [0.6, 1.2, 1.0], wide: true, zoom: 0.55,
    name: ['胴体の輪切り', 'Fuselage section'], note: ['半径3.4 · 窓の少し上（1.75）で切る · 窓ごとに日よけ · 通路2本と床の誘導灯', 'Radius 3.4 · cut at 1.75, just above the windows · a shade per window · two aisles and floor-path lights'],
    demo: (o, t) => { o.userData.setShade(Math.floor(t * 1.5) % o.userData.shadeCount, demoCycle(t, 4)); }, toggles: [{ label: ['日よけを全部下ろす', 'Pull all the shades'], key: 'shades' }] },
  { group: 'frame', tag: 'F2 · Bins', build: () => { const g = new THREE.Group(); const a = F.bins(3, { side: 1 }), b = F.bins(3, { kind: 'center' }); g.add(a, b); g.userData.state = {}; updateAll(g, [a, b]); g.userData.parts = [a, b]; return g; }, view: [-1, 1.0, 0.9],
    name: ['荷物棚（窓側・中央）', 'Overhead bins (side and centre)'], note: ['半透明 · 扉が上がる · 縁にムードライト', 'Translucent · the doors lift · a mood-light strip along the edge'],
    demo: (o, t) => o.userData.parts.forEach((p) => set(p, { open: demoCycle(t, 6) })), toggles: [{ label: ['扉を開ける', 'Open'], each: 'open' }] },
  { group: 'frame', tag: 'F3 · Door', build: () => F.cabinDoor(), view: [0.4, 0.7, 1],
    name: ['ドア（L1）', 'Door (L1)'], note: ['のぞき窓 · 取っ手 · 赤いアーミングレバー · 非常口サイン', 'Porthole · handle · red arming lever · EXIT sign'],
    toggles: [{ label: ['アーム', 'Armed'], key: 'armed', on: true }] },
  { group: 'frame', tag: 'F4 · Divider', build: () => F.divider({ accent: CP.gold }), view: [1, 0.7, 0.6],
    name: ['仕切り壁とカーテン', 'Class divider and curtains'], note: ['通路ごとにひだのカーテン · クラスの差し色の帯', 'A pleated curtain in each aisle · a band in the class colour'],
    demo: (o, t) => set(o, { open: demoCycle(t, 6) }), toggles: [{ label: ['カーテンを開ける', 'Open the curtains'], key: 'open' }] },

  { group: 'service', tag: 'G1 · Galley', build: () => G.galley(), view: [1, 0.8, 0.5],
    name: ['ギャレー', 'Galley'], note: ['カート4台 · オーブン3（温めると光る）· コーヒー2 · 湯沸かし · 作業台に流し・カップ・トレー', 'Four trolleys · three ovens (glow when on) · two coffee makers · boiler · sink, cups and trays on the worktop'],
    demo: (o, t) => set(o, { ovens: demoCycle(t, 6) }), toggles: [{ label: ['オーブン', 'Ovens on'], key: 'ovens' }] },
  { group: 'service', tag: 'G2 · Trolley', build: () => G.trolley({ kind: 'drinks' }), view: [1, 0.9, 0.8],
    name: ['飲み物カート', 'Drinks trolley'], note: ['0.62×0.26 · 天板にボトル・缶・カップ・氷 · 引き出し', '0.62 × 0.26 · bottles, cans, cups and ice on top · a drawer'],
    demo: (o, t) => set(o, { open: demoCycle(t, 5) }), toggles: [{ label: ['引き出し', 'Drawer'], key: 'open' }] },
  { group: 'service', tag: 'G3 · Trolley', build: () => G.trolley({ kind: 'meals' }), view: [1, 0.9, 0.8],
    name: ['ミールカート', 'Meal trolley'], note: ['端の扉が開くと中にトレーが10段', 'The end door opens on ten trays'],
    demo: (o, t) => set(o, { open: demoCycle(t, 5) }), toggles: [{ label: ['扉を開ける', 'Open'], key: 'open' }] },
  { group: 'service', tag: 'G4 · Meal', build: () => G.mealTray(), view: [0.6, 1.2, 0.8],
    name: ['ミールトレー（エコノミー）', 'Meal tray (economy)'], note: ['カレーとごはん（アルミのふた）· サラダ · パン · デザート · コーヒー', 'Curry and rice under foil · salad · bread roll · dessert · coffee'],
    demo: (o, t) => set(o, { lid: demoCycle(t, 5) }), toggles: [{ label: ['ふたを開ける', 'Lift the lid'], key: 'lid' }] },
  { group: 'service', tag: 'G5 · Meal', build: () => G.bizMeal(), view: [0.6, 1.2, 0.8],
    name: ['ビジネスの食事', 'Business dinner'], note: ['テーブルクロス · 皿 · パン皿 · ワイングラス · ナプキン', 'Tablecloth · plate · bread plate · wine glass · napkin'] },
  { group: 'service', tag: 'L1 · Lavatory', build: lavWithQueue, view: [1, 1.1, 0.7],
    name: ['トイレと列', 'Lavatory and the queue'], note: ['0.95角 · 折れ戸 · 使用中は赤', '0.95 square · bi-fold door · lamp turns red when occupied'],
    demo: (o, t) => set(o.userData.lav, { occupied: demoCycle(t, 6) === 1, door: 1 }), toggles: [{ label: ['使用中', 'Occupied'], lav: 'occupied' }] },
  { group: 'service', tag: 'C1 · Flight deck', build: deckWithPilots, view: [-1, 1.0, 0.7],
    name: ['コックピット', 'Flight deck'], note: ['画面6枚 · 操縦かん · スラストレバー · 窓は空の色 · 天井パネル（断面より上）· 機長はコーヒー', 'Six displays · yokes · thrust levers · windows take the sky colour · overhead panel above the cut · coffee for the captain'],
    toggles: [{ label: ['天井パネル', 'Overhead panel'], key: 'overhead', on: true }] },

  { group: 'props', tag: 'Props', build: propsSet, view: [0.6, 1.3, 0.9],
    name: ['小物', 'Small things'], note: ['ブランケット（たたむ／かける）· 枕 · ヘッドホン · アイマスク · PC · 本 · スマホ · 水 · ポーチ · 靴 · リュック · メニュー · ハナのクマ', 'Blanket (folded / spread) · pillow · headphones · eye mask · laptop · books · phone · water · amenity kit · shoes · backpack · menu · Hana\'s bear'] },

  { group: 'people', tag: 'People · Poses', build: poseLine, view: [1, 0.6, 0.3],
    name: ['機内のポーズ', 'In-flight poses'], note: ['新：眠る · 食べる · 画面を見る · 窓の外を見る　既存：読む · PC', 'New: asleep · eating · watching · at the window. Already there: reading · laptop'] },
  { group: 'people', tag: 'People · Crew', build: crewPair, view: [1, 0.8, 0.9],
    name: ['客室乗務員', 'Cabin crew'], note: ['新：カートを押す · 手渡す', 'New: pushing a trolley · handing over'] },
];

const GROUPS = { all: ['すべて', 'All'], overview: ['見本', 'Overview'], seats: ['座席', 'Seats'], frame: ['骨組み', 'Frame'], service: ['ギャレー・トイレ・操縦室', 'Galley, lav, deck'], props: ['小物', 'Props'], people: ['人', 'People'] };
const MOOD_NAMES = { boarding: ['搭乗', 'Boarding'], cruise: ['巡航', 'Cruise'], night: ['夜', 'Night'], dawn: ['朝', 'Dawn'] };

// ---------- renderer and stages ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
const VIEW_DIR = new THREE.Vector3(1, 0.7, 1.1).normalize();

function makeStage(item) {
  const obj = item.build();
  const scene = new THREE.Scene();
  const pivotG = new THREE.Group();
  scene.add(pivotG);
  const bounds = new THREE.Box3().setFromObject(obj);
  const center = bounds.getCenter(new THREE.Vector3());
  obj.position.x -= center.x; obj.position.z -= center.z;
  pivotG.add(obj);
  const size = bounds.getSize(new THREE.Vector3());
  const R = Math.max(size.x, size.z) / 2 * 1.05 + 0.15;
  const target = new THREE.Vector3(0, Math.min(size.y, 1.8) * 0.4, 0);
  const hemi = new THREE.HemisphereLight(0xfffaf0, 0xcdbfa8, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.2);
  sun.position.set(R * 0.9, R * 2.2, R * 0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -R * 1.3, right: R * 1.3, top: R * 1.3, bottom: -R * 1.3, near: 0.1, far: R * 6 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(R * 1.3, 48), new THREE.MeshStandardMaterial({ color: 0xddd4c4, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = Math.min(0, bounds.min.y) - 0.01; ground.receiveShadow = true;
  scene.add(ground);
  const camera = new THREE.PerspectiveCamera(28, 4 / 3, 0.02, R * 40);
  const radius = Math.max(R, Math.min(size.y, 2));
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(14)) * (item.zoom ?? (item.wide ? 0.62 : 0.72));
  const dir = item.view ? new THREE.Vector3(...item.view).normalize() : VIEW_DIR;
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.lookAt(target);
  const updaters = [];
  obj.traverse((o) => { if (o.userData.update && !updaters.includes(o.userData)) updaters.push(o.userData); });
  // a part whose parent group already updates it should not update twice
  const owned = new Set();
  obj.traverse((o) => { if (o !== obj && o.userData.update && hasUpdatingAncestor(o, obj)) owned.add(o.userData); });
  return { scene, pivot: pivotG, obj, camera, target, updaters: updaters.filter((u) => !owned.has(u)), spin: !item.wide, demo: true, lights: { hemi, sun } };
}
function hasUpdatingAncestor(o, root) {
  for (let p = o.parent; p; p = p.parent) { if (p.userData.update) return true; if (p === root) break; }
  return false;
}

const grid = document.getElementById('grid');
const stages = ITEMS.map((item, i) => {
  const card = document.createElement('div');
  card.className = 'card' + (item.wide ? ' wide' : '');
  card.dataset.group = item.group;
  card.innerHTML = '<div class="view"></div><div class="meta"><span class="tag"></span><b></b><small></small></div>';
  grid.appendChild(card);
  const stage = { item, card, view: card.querySelector('.view'), ...makeStage(item) };
  stage.pivot.rotation.y = i * 0.6;
  card.addEventListener('click', () => openDetail(stage));
  return stage;
});
function labelCards() {
  for (const s of stages) {
    s.card.querySelector('.tag').textContent = s.item.tag;
    s.card.querySelector('b').textContent = L(s.item.name);
    s.card.querySelector('small').textContent = L(s.item.note);
  }
  filters.innerHTML = Object.entries(GROUPS).map(([k, l]) => `<button data-g="${k}" class="${k === group ? 'on' : ''}">${L(l)}</button>`).join('');
  moods.innerHTML = `<span>${L(['照明', 'Mood'])}</span>` + Object.entries(MOOD_NAMES).map(([k, l]) => `<button data-m="${k}" class="${k === mood.name ? 'on' : ''}">${L(l)}</button>`).join('');
  if (detail) fillDetail(detail);
}

// ---------- filters and mood ----------
const filters = document.getElementById('filters');
const moods = document.getElementById('moods');
let group = GROUPS[location.hash.slice(1)] ? location.hash.slice(1) : 'all';
const applyFilter = () => { for (const s of stages) s.card.style.display = group === 'all' || s.item.group === group ? '' : 'none'; };
filters.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; group = b.dataset.g; labelCards(); applyFilter(); });
moods.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; setMood(b.dataset.m); labelCards(); });

// ---------- detail view ----------
const detailEl = document.getElementById('detail');
const detailView = document.getElementById('detailView');
let detail = null, detailCam = null, controls = null;

function fillDetail(stage) {
  const { item } = stage;
  document.getElementById('dTag').textContent = item.tag;
  document.getElementById('dName').textContent = L(item.name);
  document.getElementById('dNote').textContent = L(item.note);
  const btns = document.getElementById('dBtns');
  btns.innerHTML = '';
  const add = (label, isOn, flip) => {
    const b = document.createElement('button');
    b.textContent = L(label);
    b.classList.toggle('on', isOn());
    b.onclick = () => { flip(); b.classList.toggle('on', isOn()); };
    btns.appendChild(b);
  };
  add(['自動回転', 'Auto-rotate'], () => controls.autoRotate, () => { controls.autoRotate = !controls.autoRotate; });
  if (item.demo) add(['デモ', 'Demo'], () => stage.demo, () => { stage.demo = !stage.demo; });
  for (const tg of item.toggles ?? []) {
    tg.value ??= tg.on ? 1 : 0;
    add(tg.label, () => !!tg.value, () => {
      stage.demo = false;
      tg.value = tg.value ? 0 : 1;
      const o = stage.obj;
      if (tg.each) o.userData.parts.forEach((p) => set(p, { [tg.each]: tg.value }));
      else if (tg.lav) set(o.userData.lav, { occupied: !!tg.value, door: 1 });
      else for (const k of [tg.key].flat()) o.userData.state[k] = typeof o.userData.state[k] === 'boolean' ? !!tg.value : tg.value;
    });
  }
  if (stage.obj.userData.modes) {
    for (const m of ['sitEat', 'sitWatch', 'sitSleep', 'sitRead']) add([m, m], () => stage.obj.userData.modes.every((p) => p.userData.mode === m), () => stage.obj.userData.modes.forEach((p) => { p.userData.mode = m; }));
  }
}
function openDetail(stage) {
  detail = stage;
  detailCam = stage.camera.clone();
  controls = new OrbitControls(detailCam, detailView);
  controls.target.copy(stage.target);
  controls.enableDamping = true;
  controls.autoRotate = !stage.item.wide;
  controls.autoRotateSpeed = 0.8;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.update();
  fillDetail(stage);
  detailEl.classList.add('open');
}
function closeDetail() {
  if (!detail) return;
  controls.dispose();
  detail = null;
  detailEl.classList.remove('open');
}
document.getElementById('close').addEventListener('click', closeDetail);
addEventListener('keydown', (e) => e.key === 'Escape' && closeDetail());
onLang(labelCards);
labelCards();
applyFilter();

// ---------- loop ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', resize);
resize();

function step(stage, t, dt) {
  moodLight(stage.lights.hemi, stage.lights.sun);
  if (stage.demo && stage.item.demo) stage.item.demo(stage.obj, t);
  for (const ud of stage.updaters) ud.update(t, dt);
}
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  tickMood(dt);
  tickScreens(t);
  const H = canvas.clientHeight;
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  const jobs = detail ? [[detail, detailView, detailCam]] : stages.map((s) => [s, s.view, s.camera]);
  for (const [stage, view, cam] of jobs) {
    const r = view.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H || r.width === 0) continue;
    if (!detail && stage.spin) stage.pivot.rotation.y += dt * 0.25;
    step(stage, t, dt);
    if (detail) controls.update();
    cam.aspect = r.width / r.height;
    cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(stage.scene, cam);
  }
}
renderer.setAnimationLoop(frame);

// console hooks: __cabin.shot(i) renders card i at 1200×760 into an overlay image (click to close);
// __cabin.stats() counts geometries and draw calls
window.__cabin = {
  stages, renderer, setMood,
  shot(i, { w = 1200, h = 760, pos = null, target = null, advance = 2 } = {}) {
    const stage = stages[i];
    const cam = stage.camera.clone();
    if (pos) { cam.position.set(...pos); cam.lookAt(...target); }
    cam.aspect = w / h; cam.updateProjectionMatrix();
    for (let k = 0; k < advance * 30; k++) { tickMood(1 / 30); step(stage, 4 + k / 30, 1 / 30); }
    tickScreens(5);
    const old = renderer.getRenderTarget();
    const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    renderer.setScissorTest(false);
    renderer.setRenderTarget(rt);
    renderer.setViewport(0, 0, w, h);
    renderer.setClearColor(0xf1ece3, 1);
    renderer.clear();
    renderer.render(stage.scene, cam);
    const px = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    renderer.setRenderTarget(old);
    renderer.setClearColor(0x000000, 0);
    rt.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const img = c.getContext('2d').createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    c.getContext('2d').putImageData(img, 0, 0);
    let el = document.getElementById('shot');
    if (!el) { el = document.createElement('img'); el.id = 'shot'; Object.assign(el.style, { position: 'fixed', left: 0, top: 0, width: '100%', zIndex: 99, background: '#000' }); el.onclick = () => el.remove(); document.body.appendChild(el); }
    el.src = c.toDataURL('image/jpeg', 0.9);
    return 'ok';
  },
  stats() { return { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, cachedGeos: geoCount(), calls: renderer.info.render.calls }; },
};

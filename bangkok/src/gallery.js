// Night-market parts catalogue (bangkok/DESIGN.md §5–7): one renderer, one scene per card, scissor viewports.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { BK, tickFx, geoCount, liveAll, addTo } from './common.js';
import * as K from './stalls.js';
import * as F from './foods.js';
import * as S from './street.js';
import * as W from './vehicles.js';
import * as Kit from './kit.js';
import './people.js';

const { at, who, TO_CUSTOMER, TO_VENDOR } = Kit;
const row = (parts, gap) => { const g = new THREE.Group(); parts.forEach((o, i) => g.add(at(o, (i - (parts.length - 1) / 2) * gap, 0))); return liveAll(g); };
const pair = (a, b, gap = 0.35) => row([a, b], gap);
// small things in a few rows (a long single row frames too thin)
const grid = (parts, gap, cols = 4) => { const g = new THREE.Group(); const rows = Math.ceil(parts.length / cols); parts.forEach((o, i) => g.add(at(o, ((i % cols) - (cols - 1) / 2) * gap, (Math.floor(i / cols) - (rows - 1) / 2) * gap))); return liveAll(g); };
const set = (o, s) => Object.assign(o.userData.state, s);

// ---------- complete stalls (the overview; the stalls themselves are in kit.js) ----------
function padThaiStall() { // Noi and her father at the wok, two customers waiting, a table in front
  const g = Kit.padThai({ vendor: null });
  g.add(at(who('noi', 'wok', 3), 0.95, -0.6, 0, TO_CUSTOMER), at(who('noiDad', 'idle', 5), -0.1, -0.6, 0, TO_CUSTOMER));
  g.add(at(who('tourist', 'idle', 7), -0.1, 0.75, 0, TO_VENDOR), at(who('thaiStudent', 'idle', 8), 0.4, 0.8, 0, TO_VENDOR));
  const seat = at(K.seating(), 0.3, 2.0);
  g.add(seat);
  [[0, 'passenger'], [1, 'woman']].forEach(([i, role]) => {
    const s = seat.userData.seats[i];
    g.add(at(who(role, 'sitEat', 10 + i), 0.3 + s.x * 0.92, 2.0 + s.z * 0.92, 0, s.yaw));
    g.add(at(F.padThaiDish(), 0.3 + s.x * 0.45, 2.0 + s.z * 0.45, 0.51));
  });
  g.add(at(F.thaiTeaCup(), 0.15, 2.05, 0.51));
  return liveAll(g);
}
function overview() {
  return row([padThaiStall(), Kit.mooPing(), Kit.fruit(), Kit.somTam(), Kit.noodle(), Kit.tea()], 2.3);
}

// ---------- cards ----------
const dish = (display, served, gap = 0.4) => pair(display, served, gap);
const vendors = () => {
  const g = new THREE.Group();
  [['noi', 'wok'], ['noiDad', 'idle'], ['wokCook', 'wok'], ['griller', 'fan'], ['somtamAunty', 'pound'], ['noodleMan', 'shake'], ['fruitSeller', 'chop'], ['teaVendor', 'pour'], ['motoTaxi', 'idle'], ['thaiStudent', 'walk']].forEach(([r, m], i) => { const p = at(who(r, m, 20 + i), 0, (i - 4.5) * 0.55); p.rotation.y = 0; g.add(p); });
  return liveAll(g);
};
const containers = () => grid([F.plate(), F.bowl(), F.bananaLeaf(), F.foamBox(), F.bagDrink(), F.cupDrink(0xf2a0b8), F.riceBag(), F.kratip()], 0.3);
const propsK = () => grid([K.calculator(), K.cashBox(), K.foamBoxes(), K.bin(), at(K.bagBunch(), 0, 0, 0.3), K.fan(), K.menuBoard(), K.gasCylinder()], 0.45);

// ---------- street (B1–B10) ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function yaowarat() { // a row of shophouses with their signs, the pavement, a pole and its wires, two carts out front
  const g = new THREE.Group();
  const shops = [['gold', 4, 0, [['gold', 1.0, 3.4], ['bank', -0.9, 5.8]]], ['eatery', 5, 1, [['restaurant', 0.8, 3.5], ['shark', -0.8, 6.0]]], ['pharmacy', 3, 2, [['medicine', 0.9, 3.3]]], ['goods', 4, 3, [['tea', 0.9, 3.6], ['hotel', -0.9, 5.9]]], ['mart', 3, 4, []]];
  let x = -6;
  for (const [shop, floors, i, signs] of shops) { g.add(at(S.shophouse({ shop, floors, w: 3.0, color: S.FACADES[i], seed: 10 + i, signs }), x, 0)); x += 3.0; }
  g.add(at(S.sidewalk({ len: 15, d: 2.2 }), 0, 1.1));
  const p1 = at(S.pole(), -5.2, 2.0), p2 = at(S.pole({ transformer: false }), 3.8, 2.0);
  g.add(p1, p2);
  g.add(S.wires(V(-5.2, 6.1, 2.0), V(3.8, 6.1, 2.0), { n: 8, sag: 0.8 }));
  g.add(S.wires(V(-7.5, 5.6, 2.0), V(-5.2, 5.6, 2.0), { n: 5, sag: 0.3, seed: 2 }), S.wires(V(3.8, 5.6, 2.0), V(7.5, 5.6, 2.0), { n: 5, sag: 0.4, seed: 3 }));
  g.add(at(K.cart({ sign: 'chestnut' }), -3.2, 1.3, 0.14), at(K.cart({ sign: 'kuayjub', gas: 0x3a7fd0 }), 0.5, 1.3, 0.14));
  g.add(at(F.chestnutWok(), -2.9, 1.3, 0.8));
  g.add(at(S.spiritHouse(), 5.3, 0.6, 0.14));
  return liveAll(g);
}
function tents() { // from above the tent roofs make the market's colour grid
  const g = new THREE.Group();
  BK.tents.concat(BK.tents.slice(0, 1)).forEach((c, i) => g.add(at(S.tent({ colors: c, table: true }), (i % 3 - 1) * 2.45, (Math.floor(i / 3) - 0.5) * 2.45)));
  return g;
}
function stageWithBand() {
  const st = S.stage();
  const p = who('musician', 'sit', 40);
  p.position.set(-0.1, st.userData.floor, 0); p.rotation.y = TO_CUSTOMER;
  st.add(p);
  return liveAll(st);
}
function strings() {
  const g = new THREE.Group();
  for (const x of [-1.6, 1.6]) post(g, x);
  g.add(S.bulbString(V(-1.6, 2.2, 0), V(1.6, 2.2, 0), { n: 18, sag: 0.4 }));
  g.add(S.bulbString(V(-1.6, 1.8, 0.4), V(1.6, 1.8, 0.4), { n: 18, sag: 0.3, colors: [BK.neonPink, BK.bulb, BK.neonBlue, BK.neonGreen, BK.gold] }));
  return g;
}
function post(g, x) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.3, 6), new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 0.6 })); m.position.set(x, 1.15, 0.2); g.add(m); }

// ---------- vehicles ----------
// a stretch of road with traffic going both ways; vehicles wrap round at the ends
function road() {
  const g = new THREE.Group();
  const L = 16;
  const asphalt = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, 5), new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.95 }));
  asphalt.position.y = 0.02; asphalt.receiveShadow = true; g.add(asphalt);
  for (let x = -L / 2 + 0.5; x < L / 2; x += 1.6) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.005, 0.1), new THREE.MeshStandardMaterial({ color: 0xf2e6b0 })); d.position.set(x, 0.045, 0); g.add(d); }
  const traffic = [
    [W.tuktuk(W.TUK_LIVERIES.blue), -1.2, 2.2], [W.taxi('pink'), -1.25, 1.8], [W.motoTaxi(), -0.7, 2.6], [W.tuktuk(W.TUK_LIVERIES.red), -1.2, 2.0],
    [W.taxi('greenYellow'), 1.25, -1.9], [W.scooter({ color: 0xf2b84b, rider: 'thaiStudent' }), 0.7, -2.4], [W.tuktuk(W.TUK_LIVERIES.green), 1.2, -2.1], [W.sidecarStall({ food: 'fruit' }), 1.6, -1.2],
  ];
  traffic.forEach(([v, z, speed], i) => { v.position.set(-L / 2 + ((i * 4.1) % L), 0.04, z); if (speed < 0) v.rotation.y = Math.PI; v.userData.speed = Math.abs(speed); v.userData.v = speed; g.add(v); });
  g.userData.update = (t, dt = 1 / 60) => {
    for (const [v] of traffic) {
      v.position.x += v.userData.v * dt;
      if (v.position.x > L / 2) v.position.x -= L; else if (v.position.x < -L / 2) v.position.x += L;
      v.userData.update(t, dt);
    }
  };
  return g;
}
const moving = (v, speed = 1.5) => { v.userData.speed = speed; return v; };
// vehicles side by side (across Z), so long ones don't overlap
const abreast = (parts, gap) => { const g = new THREE.Group(); parts.forEach((o, i) => g.add(at(o, 0, (i - (parts.length - 1) / 2) * gap))); return liveAll(g); };

const ITEMS = [
  { group: 'overview', tag: 'Overview', wide: true, build: overview, view: [0.15, 0.85, 1.0], zoom: 0.5,
    name: ['屋台の見本（6軒）', 'Six stalls'], note: ['パッタイ（ノーイと父、鍋の炎、行列、客席）· ムーピン · 果物 · ソムタム · 麺 · タイティー', 'Pad thai (Noi and her father, wok fire, a queue, a table) · moo ping · fruit · som tam · noodles · Thai tea'] },

  { group: 'stall', tag: 'K1 · Cart', build: () => K.cart(), name: ['ステンレスの屋台車', 'Stainless cart (rot khen)'], note: ['1.2×0.6 · 台の高さ0.66 · ガラスのケース · 車輪2つ · ガスボンベ · 光る看板（文字は1枚のアトラス）', '1.2 × 0.6 · counter 0.66 · glass case · two wheels · gas bottle · lit sign (all lettering on one atlas)'] },
  { group: 'stall', tag: 'K2 · Table', build: () => K.foldTable(), name: ['折りたたみテーブル', 'Folding table'], note: ['チェックのビニールクロス', 'Checked vinyl cloth'] },
  { group: 'stall', tag: 'K3 · Parasol', build: () => row([K.parasol(), K.parasol({ colors: [BK.stoolBlue, 0xf4f0e8] }), K.parasol({ colors: [0xf2b84b] })], 2.1), name: ['パラソル', 'Parasols'], note: ['縞と無地 · 半径1.0 · 高さ2.1', 'Striped and plain · radius 1.0 · 2.1 tall'] },
  { group: 'stall', tag: 'K4 · Grill', build: () => { const g = K.grill(); for (let i = 0; i < 7; i++) g.add(at(F.moopingSkewer(), 0, -0.1 + i * 0.033, g.userData.grate + 0.01)); return g; }, name: ['炭火のコンロ', 'Charcoal grill'], note: ['光る炭（ゆらぐ）· 網 · 煙', 'Glowing coals (they flicker) · grate · smoke'] },
  { group: 'stall', tag: 'K5 · Wok', build: () => K.wokStove({ food: F.padThaiHeap(0.1) }), name: ['中華鍋のコンロ', 'Wok stove'], note: ['青いガスの炎 · 鍋をあおると炎が上がる', 'Blue gas ring · the fire leaps when the wok is tossed'], demo: (o, t) => set(o, { toss: Math.sin(t * 0.8) > 0 ? 1 : 0 }), toggles: [{ label: ['鍋をあおる', 'Toss'], key: 'toss' }] },
  { group: 'stall', tag: 'K6 · Pot', build: () => K.stockPot(), name: ['寸胴鍋', 'Stock pot'], note: ['湯気 · レードル · ガスの台', 'Steam · ladle · on a gas stand'] },
  { group: 'stall', tag: 'K7 · Griddle', build: () => { const g = K.griddle(); g.add(at(F.hoyTod(), -0.1, 0, g.userData.top), at(F.roti(), 0.14, 0.02, g.userData.top)); return g; }, name: ['鉄板', 'Griddle'], note: ['ホイトードとロティ', 'Hoy tod and roti'] },
  { group: 'stall', tag: 'K8 · Ice', build: () => { const g = K.iceCase(); g.add(F.fruitRows(g.userData.ice)); return g; }, name: ['氷のショーケース', 'Ice case'], note: ['砕いた氷（インスタンス）· 果物の棒', 'Crushed ice (instanced) · fruit sticks'] },
  { group: 'stall', tag: 'K9 · Seating', build: () => { const s = K.seating(); const ps = s.userData.seats.slice(0, 3).map((q, i) => { const p = at(who(['passenger', 'woman', 'backpacker'][i], 'sitEat', 30 + i), q.x * 0.92, q.z * 0.92, 0, q.yaw); s.add(p); s.add(at([F.padThaiDish, F.kapraoDish, F.noodleSoup][i](), q.x * 0.45, q.z * 0.45, 0.51)); return p; }); return liveAll(s); }, name: ['客席', 'A table to eat at'], note: ['赤と青の丸椅子 · 金属のテーブル · 調味料4点 · 箸立て · ティッシュ', 'Red and blue stools · steel table · the four condiments · chopsticks · tissues'] },
  { group: 'stall', tag: 'K10 · Props', build: propsK, name: ['小物', 'Small things'], note: ['電卓 · お金の箱 · 発泡の容器 · ゴミ箱 · 袋の束 · 扇風機（回る）· メニュー · ガスボンベ', 'Calculator · cash box · foam boxes · bin · bags · fan (turns) · menu · gas bottle'] },
  { group: 'stall', tag: 'Containers', build: containers, name: ['器', 'Containers'], note: ['皿（緑の縁）· どんぶり · バナナの葉 · 発泡の箱 · 袋の飲み物 · カップ · もち米の袋と籠', 'Plate (green rim) · bowl · banana leaf · foam box · drink in a bag · cup · sticky rice bag and basket'] },

  { group: 'grill', tag: 'F1', build: () => dish(row([F.moopingSkewer(), F.moopingSkewer()], 0.04), F.moopingDish()), name: ['ムーピン（豚の串焼き）', 'Moo ping'], note: ['หมูปิ้ง · 照りのある串 · 袋のもち米', 'หมูปิ้ง · glazed pork skewers · sticky rice in a bag'] },
  { group: 'grill', tag: 'F2', build: () => F.gaiYang(), name: ['ガイヤーン', 'Gai yang'], note: ['ไก่ย่าง · 開いた鶏を竹で挟む', 'ไก่ย่าง · a flattened chicken in split bamboo'] },
  { group: 'grill', tag: 'F3', build: () => F.satayDish(), name: ['サテ', 'Satay'], note: ['สะเต๊ะ · 黄色い串 · ピーナツソース · きゅうりの甘酢', 'สะเต๊ะ · turmeric skewers · peanut sauce · cucumber relish'] },
  { group: 'grill', tag: 'F4', build: () => F.seafoodDisplay(), name: ['海鮮焼き', 'Grilled seafood'], note: ['ปลาเผา · 塩をまぶした魚（口にレモングラス）· 手長エビ · イカ', 'ปลาเผา · salt-crusted fish with lemongrass · river prawns · squid'] },
  { group: 'grill', tag: 'F5', build: () => dish(F.fryer(), F.lukChin()), name: ['ルークチン', 'Luk chin'], note: ['ลูกชิ้น · 揚げ鍋 · 3色のつみれの串', 'ลูกชิ้น · the fryer · meatball skewers in three colours'] },
  { group: 'grill', tag: 'F6', build: () => dish(F.friedChicken(), F.insects()), name: ['揚げ物・虫', 'Fried chicken, fried insects'], note: ['ไก่ทอด・แมลงทอด · カオサンの名物', 'ไก่ทอด・แมลงทอด · a Khao San favourite'] },
  { group: 'grill', tag: 'F7', build: () => F.chestnutWok(), name: ['焼き栗（ヤワラート）', 'Roast chestnuts (Yaowarat)'], note: ['เกาลัดคั่ว · 黒い砂の大鍋 · へらが回る', 'เกาลัดคั่ว · a big pan of black sand · the paddle stirs'] },

  { group: 'wok', tag: 'F8', build: () => F.padThaiDish(), name: ['パッタイ', 'Pad thai'], note: ['ผัดไทย · 麺 · エビ · 卵 · もやし · ニラ · ピーナツ · ライム', 'ผัดไทย · noodles · shrimp · egg · sprouts · chives · peanuts · lime'] },
  { group: 'wok', tag: 'F9', build: () => F.kapraoDish(), name: ['パッガパオ', 'Pad kaprao'], note: ['ผัดกะเพรา · ご飯 · ひき肉とバジル · 目玉焼き', 'ผัดกะเพรา · rice · pork with holy basil · fried egg'] },
  { group: 'wok', tag: 'F10', build: () => F.hoyTodDish(), name: ['ホイトード', 'Hoy tod'], note: ['หอยทอด · 牡蠣のお好み焼き · もやし', 'หอยทอด · oyster omelette · bean sprouts'] },
  { group: 'wok', tag: 'F11', build: () => F.roti(), name: ['ロティ', 'Roti'], note: ['โรตี · バナナ · 練乳とチョコの線', 'โรตี · banana · condensed milk and chocolate'] },
  { group: 'wok', tag: 'F12', build: () => F.khanomKrok(), name: ['カノムクロック', 'Khanom krok'], note: ['ขนมครก · くぼみの鉄板 · 湯気', 'ขนมครก · the dimpled pan · steam'] },

  { group: 'rice', tag: 'F13', build: () => dish(F.chickenRail(), F.khaoManGaiDish(), 0.45), name: ['カオマンガイ', 'Khao man gai'], note: ['ข้าวมันไก่ · 吊るしたゆで鶏 · ご飯 · きゅうり · たれ', 'ข้าวมันไก่ · poached chickens on hooks · rice · cucumber · sauce'] },
  { group: 'rice', tag: 'F14', build: () => dish(F.porkLeg(), F.khaoKhaMooDish(), 0.5), name: ['カオカームー', 'Khao kha moo'], note: ['ข้าวขาหมู · 豚足の煮込み · 煮卵 · 高菜', 'ข้าวขาหมู · braised pork leg · stewed egg · pickled greens'] },
  { group: 'rice', tag: 'F15', build: () => dish(F.noodleBundles(), F.noodleSoup(), 0.45), name: ['クイッティアオ', 'Kuay tiew'], note: ['ก๋วยเตี๋ยว · 麺の束 · スープ · つみれ · もやし', 'ก๋วยเตี๋ยว · noodle bundles · soup · meatballs · sprouts'] },
  { group: 'rice', tag: 'F16', build: () => F.kuayJub(), name: ['クイジャップ', 'Kuay jub'], note: ['ก๋วยจั๊บ · 胡椒のスープ · 巻いた麺 · 揚げた豚', 'ก๋วยจั๊บ · peppery broth · rolled noodles · crispy pork'] },
  { group: 'rice', tag: 'F17', build: () => F.tomYum(), name: ['トムヤムクン', 'Tom yum goong'], note: ['ต้มยำกุ้ง · 煙突の火鍋 · エビ · きのこ · 湯気', 'ต้มยำกุ้ง · a chimney hot pot · shrimp · mushrooms · steam'] },
  { group: 'rice', tag: 'F18', build: () => dish(F.mortar(), F.somTamDish(), 0.4), name: ['ソムタム', 'Som tam'], note: ['ส้มตำ · 木のすり鉢（棒が動く）· 青パパイヤ · もち米の籠', 'ส้มตำ · wooden mortar (the pestle pounds) · green papaya · sticky rice basket'] },

  { group: 'sweet', tag: 'F19', build: () => dish(F.mangoPile(), F.mangoStickyRice(), 0.45), name: ['マンゴーもち米', 'Mango sticky rice'], note: ['ข้าวเหนียวมะม่วง · マンゴーの山 · もち米 · ココナツミルク', 'ข้าวเหนียวมะม่วง · a heap of mangoes · sticky rice · coconut cream'] },
  { group: 'sweet', tag: 'F20', build: () => F.fruitBag(), name: ['果物の袋', 'Fruit in a bag'], note: ['ผลไม้ · スイカ・パイナップル · 竹串', 'ผลไม้ · watermelon, pineapple · a bamboo pick'] },
  { group: 'sweet', tag: 'F21', build: () => dish(F.coconutPile(), F.coconutIceCream(), 0.45), name: ['ココナツ', 'Coconuts'], note: ['มะพร้าว · 切ってストロー · ココナツアイス', 'มะพร้าว · cut open with a straw · coconut ice cream'] },
  { group: 'sweet', tag: 'F22', build: () => dish(F.durian(), F.durianTray(), 0.35), name: ['ドリアン', 'Durian'], note: ['ทุเรียน · とげ（インスタンス）· 黄色い実のパック', 'ทุเรียน · spikes (instanced) · a pack of golden pods'] },
  { group: 'sweet', tag: 'F23', build: () => row([F.teaPour(), F.thaiTeaCup(), F.thaiTeaBag()], 0.18), name: ['タイティー', 'Thai iced tea'], note: ['ชาเย็น · 高い所から注ぐ · カップと袋', 'ชาเย็น · poured from high · in a cup and in a bag'] },
  { group: 'sweet', tag: 'F24', build: () => F.pinkMilk(), name: ['ノムイェン', 'Pink milk'], note: ['นมเย็น', 'นมเย็น'] },
  { group: 'sweet', tag: 'F25', build: () => F.thaiSweets(), name: ['タイのお菓子', 'Thai sweets'], note: ['ขนมไทย · カノムチャン · ピンクの玉 · フォイトーン', 'ขนมไทย · layered khanom chan · pink balls · golden threads'] },
  { group: 'sweet', tag: 'F26', build: () => F.nestBottles(), name: ['ツバメの巣の飲み物', "Bird's nest drinks"], note: ['รังนก · 小瓶がずらり（ヤワラート）', 'รังนก · rows of little bottles (Yaowarat)'] },

  { group: 'street', tag: 'Overview', wide: true, build: yaowarat, view: [0.25, 0.55, 1.0], zoom: 0.55,
    name: ['ヤワラートの並び', 'A row in Yaowarat'], note: ['ショップハウス5軒（金の店・食堂・薬局・商店・ミニマート）· 縦の看板 · 歩道 · 電柱と電線 · 屋台車 · 祠', 'Five shophouses (gold shop, restaurant, pharmacy, shop, mini mart) · vertical signs · pavement · poles and wires · carts · a spirit house'] },
  { group: 'street', tag: 'B1 · Shophouse', build: () => S.shophouse({ signs: [['tea', 0.9, 3.6]] }), view: [0.5, 0.5, 1], zoom: 0.72, name: ['ショップハウス', 'Shophouse'], note: ['4階 · 1階は店（シャッターが上がる）· 窓の格子 · エアコン · ベランダに洗濯物と鉢 · 屋上の青い水タンク', 'Four floors · a shop below (the shutter rolled up) · window grilles · air-conditioners · washing and plants on the balcony · a blue water tank on the roof'] },
  { group: 'street', tag: 'B2 · Gold shop', build: () => S.shophouse({ shop: 'gold', floors: 3, color: S.FACADES[3], seed: 4, signs: [['gold', 1.0, 3.3]] }), view: [0.3, 0.45, 1], zoom: 0.72, name: ['金の店', 'Gold shop'], note: ['真っ赤な店内 · ガラスの台に金が光る · 奥に金の壁', 'All red inside · gold glowing in glass counters · a gold wall at the back'] },
  { group: 'street', tag: 'B3 · Signs', build: () => row(['gold', 'restaurant', 'shark', 'medicine', 'hotel', 'noodle'].map((k, i) => S.vSign(k, { neon: [BK.neonPink, BK.neonBlue, BK.neonGreen][i % 3] })), 0.5), view: [1, 0.4, 0.4], name: ['縦の看板', 'Vertical signs'], note: ['建物から通りへ突き出す · 両面に漢字（別のアトラス1枚）· ネオンの縁', 'They stick out over the street · lettered on both faces (one more atlas) · neon outline'] },
  { group: 'street', tag: 'B4 · Wires', build: () => { const g = new THREE.Group(); g.add(at(S.pole(), -3, 0), at(S.pole({ transformer: false }), 3, 0)); g.add(S.wires(V(-3, 6.1, 0), V(3, 6.1, 0), { n: 9, sag: 0.8 })); return g; }, view: [0.2, 0.5, 1], zoom: 0.8, name: ['電柱と電線', 'Poles and wires'], note: ['コンクリートの電柱 · 変圧器 · 巻いた線の束 · たるんだ電線（9本）', 'Concrete poles · a transformer · coils of spare cable · nine sagging wires'] },
  { group: 'street', tag: 'Bulbs', build: strings, view: [0.2, 0.4, 1], name: ['電球のひも', 'Strings of bulbs'], note: ['暖色と色つき · 1本のひもが1回の描画（インスタンス）· 夜でも明るい', 'Warm and coloured · one draw per string (instanced) · always bright'] },
  { group: 'street', tag: 'B5 · Arch', build: () => S.arch(), view: [0.2, 0.35, 1], name: ['夜市のアーチ', 'Night-market arch'], note: ['赤い柱 · 「ตลาดนัด 夜市」の看板 · 電球の縁取り · 赤い提灯2つ', 'Red posts · the "night market" sign · rows of bulbs · two red lanterns'] },
  { group: 'street', tag: 'B6 · Tents', build: tents, view: [0.3, 1.4, 0.8], name: ['テント（色の格子）', 'Tents (the colour grid)'], note: ['2.4角 · 縞の屋根とひさし · LEDの棒 · 上から見ると色の格子', '2.4 square · striped roof and valance · an LED bar · a grid of colour from above'] },
  { group: 'street', tag: 'B7 · Mini mart', build: () => S.shophouse({ shop: 'mart', floors: 3, color: S.FACADES[4], seed: 6 }), view: [0.3, 0.45, 1], zoom: 0.72, name: ['ミニマート', 'Mini mart'], note: ['明るい店内 · ガラスの戸 · オレンジ・緑・赤の帯 · 棚にお菓子と飲み物', 'Bright inside · glass doors · orange, green and red stripes · shelves of snacks and drinks'] },
  { group: 'street', tag: 'B8 · Spirit house', build: () => S.spiritHouse(), view: [0.5, 0.6, 1], name: ['祠（サーンプラプーム）', 'Spirit house'], note: ['柱の上の小さな家 · 赤い炭酸のお供え · マリーゴールドの花輪 · 線香 · 小さな灯り', 'A little house on a post · red soda offerings · marigold garlands · incense · a small light'] },
  { group: 'street', tag: 'B9 · Pavement', build: () => S.sidewalk(), view: [0.4, 0.8, 1], name: ['歩道', 'Pavement'], note: ['タイル · 赤白の縁石 · マンホール · 排水の格子', 'Tiles · red-and-white kerb · manhole · drain'] },
  { group: 'street', tag: 'B10 · Stage', build: stageWithBand, view: [0.3, 0.5, 1], name: ['路地の舞台', 'Little stage'], note: ['ギターの人 · スピーカー · マイク · 色電球', 'A guitarist · speakers · a mic · coloured bulbs'] },

  { group: 'cars', tag: 'Overview', wide: true, build: road, view: [0.2, 0.8, 1.0], zoom: 0.5,
    name: ['通りを走る車', 'Traffic'], note: ['トゥクトゥク3台 · タクシー2台 · バイクタクシー · スクーター · サイドカーの屋台 · 両方向に流れる', 'Three tuk-tuks · two taxis · a motorbike taxi · a scooter · a sidecar stall · both ways'] },
  { group: 'cars', tag: 'Tuk-tuk', build: () => abreast(Object.values(W.TUK_LIVERIES).map((l) => moving(W.tuktuk(l), 1.2)), 1.35), view: [1, 0.6, 0.9], name: ['トゥクトゥク（3色）', 'Tuk-tuks (three liveries)'], note: ['2.1×1.05 · 運転席と後ろのベンチ · 屋根の縁で電球が流れる · 前に「ตุ๊กตุ๊ก」', '2.1 × 1.05 · driver up front, a bench behind · bulbs chasing round the roof · "ตุ๊กตุ๊ก" on the front'] },
  { group: 'cars', tag: 'Taxi', build: () => moving(W.taxi('pink')), view: [1, 0.6, 0.8], name: ['タクシー（ピンク）', 'Taxi (pink)'], note: ['屋根に「TAXI-METER」· 窓の赤いランプ＝空車', '"TAXI-METER" on the roof · the red lamp in the windscreen means free'], toggles: [{ label: ['空車', 'Free'], key: 'vacant', on: true }] },
  { group: 'cars', tag: 'Taxi', build: () => moving(W.taxi('greenYellow')), view: [1, 0.6, 0.8], name: ['タクシー（緑と黄）', 'Taxi (green and yellow)'], note: ['上が緑、下が黄色', 'Green on top, yellow below'] },
  { group: 'cars', tag: 'Motorbike', build: () => abreast([moving(W.motoTaxi()), moving(W.scooter())], 0.8), view: [1, 0.5, 0.9], name: ['バイクタクシー・スクーター', 'Motorbike taxi, scooter'], note: ['オレンジのベストの運転手と学生 · 空のスクーター', 'A rider in the orange vest with a student behind · an empty scooter'] },
  { group: 'cars', tag: 'Sidecar stall', build: () => abreast([moving(W.sidecarStall()), moving(W.sidecarStall({ food: 'fruit', color: 0x2f8a4a }))], 1.9), view: [0.6, 0.7, 1], name: ['サイドカーの屋台', 'Sidecar stalls'], note: ['バイクの横に屋台の台 · ガラスのケース · パラソル · つみれと揚げ鍋／果物', 'A food box on a platform beside the bike · glass case · parasol · meatballs and the fryer / fruit'] },

  { group: 'people', tag: 'People', wide: true, build: vendors, view: [1, 0.55, 0.25], zoom: 0.55, name: ['屋台の人たち', 'Vendors and the street'], note: ['ノーイと父 · 鍋 · 焼き手（うちわ）· ソムタム（叩く）· 麺屋（ざる）· 果物屋（切る）· タイティー（注ぐ）· バイクタクシー · 学生', 'Noi and her father · wok cook · griller (fanning) · som tam (pounding) · noodles (shaking) · fruit (chopping) · Thai tea (pouring) · motorbike taxi · student'] },
];
const GROUPS = { all: ['すべて', 'All'], overview: ['見本', 'Stalls'], stall: ['屋台の部品', 'Stall parts'], grill: ['焼く・揚げる', 'Grilled, fried'], wok: ['鍋・鉄板', 'Wok, griddle'], rice: ['ご飯・麺・スープ', 'Rice, noodles, soup'], sweet: ['甘い物・果物・飲み物', 'Sweets, fruit, drinks'], street: ['建物・通り', 'Street'], cars: ['車', 'Vehicles'], people: ['人', 'People'] };
const LIGHTS = {
  day: { label: ['昼', 'Day'], hemi: [0xfffaf0, 0xcdbfa8, 1.5], sun: [0xfff3e0, 2.2], bg: 0xf1ece3 },
  dusk: { label: ['夕方', 'Dusk'], hemi: [0xffc8a0, 0x6a5a7a, 0.95], sun: [0xff9a5a, 1.3], bg: 0xe9c9b0 },
  night: { label: ['夜', 'Night'], hemi: [0x7a88d0, 0x2a2440, 0.7], sun: [0x9aaeff, 0.5], bg: 0x2a2f48 },
};
let light = 'day';

// ---------- renderer and stages ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
const VIEW_DIR = new THREE.Vector3(1, 0.9, 1.1).normalize();

function makeStage(item) {
  const obj = item.build();
  const scene = new THREE.Scene();
  const pv = new THREE.Group();
  scene.add(pv);
  // frame the solid parts only (steam sprites and flames would make the box far too big)
  const bounds = new THREE.Box3();
  obj.updateMatrixWorld(true);
  obj.traverse((o) => { if (o.isMesh && !o.isSprite && o.material.blending !== THREE.AdditiveBlending) bounds.expandByObject(o, false); });
  const center = bounds.getCenter(new THREE.Vector3());
  obj.position.x -= center.x; obj.position.z -= center.z;
  pv.add(obj);
  const size = bounds.getSize(new THREE.Vector3());
  const R = Math.max(size.x, size.z) / 2 * 1.05 + Math.max(0.05, size.y * 0.1);
  const target = new THREE.Vector3(0, size.y * 0.38, 0);
  const hemi = new THREE.HemisphereLight();
  const sun = new THREE.DirectionalLight();
  sun.position.set(R * 0.9, R * 2.2 + 1, R * 0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -R * 1.3, right: R * 1.3, top: R * 1.3, bottom: -R * 1.3, near: 0.01, far: R * 6 + 4 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.01;
  scene.add(hemi, sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(R * 1.3, 48), new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.001; ground.receiveShadow = true;
  scene.add(ground);
  const camera = new THREE.PerspectiveCamera(28, 4 / 3, 0.01, R * 40 + 10);
  const radius = Math.max(R, size.y * 0.7);
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(14)) * (item.zoom ?? (item.wide ? 0.62 : 0.95));
  camera.position.copy(target).addScaledVector(item.view ? new THREE.Vector3(...item.view).normalize() : VIEW_DIR, dist);
  camera.lookAt(target);
  const updaters = [];
  const walk = (o) => { for (const c of o.children) { if (c.userData.update) updaters.push(c.userData); else walk(c); } };
  if (obj.userData.update) updaters.push(obj.userData); else walk(obj);
  return { scene, pivot: pv, obj, camera, target, updaters, spin: !item.wide, demo: true, hemi, sun, ground };
}
function applyLight(s) {
  const l = LIGHTS[light];
  s.hemi.color.set(l.hemi[0]); s.hemi.groundColor.set(l.hemi[1]); s.hemi.intensity = l.hemi[2];
  s.sun.color.set(l.sun[0]); s.sun.intensity = l.sun[1];
  s.ground.material.color.set(light === 'night' ? 0x3a3f52 : 0xd8d0c2);
}

const gridEl = document.getElementById('grid');
const stages = ITEMS.map((item, i) => {
  const card = document.createElement('div');
  card.className = 'card' + (item.wide ? ' wide' : '');
  card.innerHTML = '<div class="view"></div><div class="meta"><span class="tag"></span><b></b><small></small></div>';
  gridEl.appendChild(card);
  const stage = { item, card, view: card.querySelector('.view'), ...makeStage(item) };
  stage.pivot.rotation.y = i * 0.6;
  applyLight(stage);
  card.addEventListener('click', () => openDetail(stage));
  return stage;
});

const filters = document.getElementById('filters'), lights = document.getElementById('lights');
let group = GROUPS[location.hash.slice(1)] ? location.hash.slice(1) : 'all';
function labelCards() {
  for (const s of stages) {
    s.card.querySelector('.tag').textContent = s.item.tag;
    s.card.querySelector('b').textContent = L(s.item.name);
    s.card.querySelector('small').textContent = L(s.item.note);
  }
  filters.innerHTML = Object.entries(GROUPS).map(([k, l]) => `<button data-g="${k}" class="${k === group ? 'on' : ''}">${L(l)}</button>`).join('');
  lights.innerHTML = `<span>${L(['明かり', 'Light'])}</span>` + Object.entries(LIGHTS).map(([k, l]) => `<button data-l="${k}" class="${k === light ? 'on' : ''}">${L(l.label)}</button>`).join('');
  if (detail) fillDetail(detail);
}
const applyFilter = () => { for (const s of stages) s.card.style.display = group === 'all' || s.item.group === group ? '' : 'none'; };
filters.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; group = b.dataset.g; labelCards(); applyFilter(); });
lights.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  light = b.dataset.l;
  document.body.classList.toggle('night', light === 'night');
  for (const s of stages) applyLight(s);
  labelCards();
});

// ---------- detail view ----------
const detailEl = document.getElementById('detail'), detailView = document.getElementById('detailView');
let detail = null, detailCam = null, controls = null;
function fillDetail(stage) {
  const { item } = stage;
  document.getElementById('dTag').textContent = item.tag;
  document.getElementById('dName').textContent = L(item.name);
  document.getElementById('dNote').textContent = L(item.note);
  const btns = document.getElementById('dBtns');
  btns.innerHTML = '';
  const add = (label, isOn, flip) => { const b = document.createElement('button'); b.textContent = L(label); b.classList.toggle('on', isOn()); b.onclick = () => { flip(); b.classList.toggle('on', isOn()); }; btns.appendChild(b); };
  add(['自動回転', 'Auto-rotate'], () => controls.autoRotate, () => { controls.autoRotate = !controls.autoRotate; });
  for (const tg of item.toggles ?? []) {
    tg.value ??= tg.on ? 1 : 0;
    add(tg.label, () => !!tg.value, () => { stage.demo = false; tg.value = tg.value ? 0 : 1; stage.obj.userData.state[tg.key] = tg.value; });
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
function closeDetail() { if (!detail) return; controls.dispose(); detail = null; detailEl.classList.remove('open'); }
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
  if (stage.demo && stage.item.demo) stage.item.demo(stage.obj, t);
  for (const ud of stage.updaters) ud.update(t, dt);
}
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  tickFx(t);
  const H = canvas.clientHeight;
  renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
  const jobs = detail ? [[detail, detailView, detailCam]] : stages.map((s) => [s, s.view, s.camera]);
  for (const [stage, view, cam] of jobs) {
    const r = view.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H || r.width === 0) continue;
    if (!detail && stage.spin) stage.pivot.rotation.y += dt * 0.25;
    step(stage, t, dt);
    if (detail) controls.update();
    cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(stage.scene, cam);
  }
});

// console hooks: __market.sheet(from, to) renders cards into a contact sheet (click to close); .stats()
window.__market = {
  stages, renderer,
  setLight(l) { lights.querySelector(`[data-l=${l}]`).click(); },
  sheet(from = 0, to = stages.length, { w = 400, h = 300, cols = 4, pos = null, target = null } = {}) {
    const list = stages.slice(from, to);
    const c = document.createElement('canvas'); c.width = w * Math.min(cols, list.length); c.height = h * Math.ceil(list.length / cols);
    const x = c.getContext('2d');
    const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const px = new Uint8Array(w * h * 4);
    renderer.setScissorTest(false);
    list.forEach((s, i) => {
      s.pivot.rotation.y = 0;
      for (let k = 0; k < 30; k++) { tickFx(2 + k / 30); step(s, 2 + k / 30, 1 / 30); }
      const cam = s.camera.clone(); if (pos) { cam.position.set(...pos); cam.lookAt(...target); }
      cam.aspect = w / h; cam.updateProjectionMatrix();
      renderer.setRenderTarget(rt); renderer.setViewport(0, 0, w, h); renderer.setClearColor(LIGHTS[light].bg, 1); renderer.clear(); renderer.render(s.scene, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
      const img = x.createImageData(w, h);
      for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      x.putImageData(img, (i % cols) * w, Math.floor(i / cols) * h);
      x.fillStyle = light === 'night' ? '#fff' : '#000'; x.font = '13px sans-serif'; x.fillText(`${from + i} ${s.item.tag} ${L(s.item.name)}`, (i % cols) * w + 6, Math.floor(i / cols) * h + 16);
    });
    renderer.setRenderTarget(null); renderer.setClearColor(0, 0); rt.dispose();
    let el = document.getElementById('shot');
    if (!el) { el = document.createElement('img'); el.id = 'shot'; Object.assign(el.style, { position: 'fixed', left: 0, top: 0, width: '100%', zIndex: 99, background: '#000' }); el.onclick = () => el.remove(); document.body.appendChild(el); }
    el.src = c.toDataURL('image/jpeg', 0.88);
    return 'ok';
  },
  stats() { const i = renderer.info; return { geometries: i.memory.geometries, textures: i.memory.textures, cachedGeos: geoCount() }; },
};

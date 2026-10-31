// Whole stalls (bangkok/DESIGN.md §5, step 3 of §11): a base (cart or table) + a roof (parasol or tent) + cooking kit
// + food + the vendor. The customer side is +Z, the vendor stands at −Z facing the customers.
// Every stall's userData: kind, front ([x, z] where the first customer stands), vendor (the person), open(on, t)
// (fire, steam and the vendor's work start when the stall opens).
import * as THREE from 'three';
import { person } from '../../airport/src/parts.js';
import { BK, liveAll, addTo } from './common.js';
import * as K from './stalls.js';
import * as F from './foods.js';
import { tent as tentRoof } from './street.js';
import './people.js';

export const at = (o, x, z, y = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
export const who = (role, mode, seed = 1) => { const p = person(role, { mode, seed }); p.userData.phase = seed; if (p.userData.suitcase) p.userData.suitcase.visible = false; return p; };
// a character faces +X at yaw 0: vendors look across the counter to +Z, customers back toward −Z
export const TO_CUSTOMER = -Math.PI / 2, TO_VENDOR = Math.PI / 2;
const T = 0.57, C = 0.66; // a folding table's top, a cart's counter

// the vendor, and what opening the stall does: steam on, the wok tossed now and then, the vendor at work
function finish(g, kind, vendor, work, { front = [0, 0.8] } = {}) {
  const fx = [], woks = [];
  g.traverse((o) => { if (o.userData.kind === 'puffs') fx.push(o); if (o.userData.kind === 'wok') woks.push(o); });
  let isOpen = true;
  const ph = g.id * 1.7;
  g.userData.kind = 'stall'; g.userData.type = kind; g.userData.front = front; g.userData.vendor = vendor;
  g.userData.open = (on) => {
    isOpen = on;
    for (const p of fx) p.userData.on = on ? 1 : 0;
    if (vendor) vendor.userData.mode = on ? work : 'idle';
  };
  liveAll(g);
  const run = g.userData.update;
  g.userData.update = (t, dt) => {
    for (const w of woks) w.userData.state.toss = isOpen && Math.sin(t * 0.9 + ph) > -0.2 ? 1 : 0;
    run(t, dt);
  };
  return g;
}
const vendorAt = (g, role, mode, x = 0, z = -0.6, seed = 1) => (role ? g.add(at(who(role, mode, seed), x, z, 0, TO_CUSTOMER)).children.at(-1) : null);

// ---------- carts ----------
// pad thai: the wok, plates ready in the case, bowls of shrimp, egg and sprouts. vendor: null leaves room for Noi.
export function padThai({ vendor = 'wokCook', parasol = true } = {}) {
  const g = new THREE.Group();
  const c = g.add(K.cart({ sign: 'padthai' })).children.at(-1);
  g.add(at(K.wokStove({ food: F.padThaiHeap(0.1) }), 0.95, -0.15));
  if (parasol) g.add(at(K.parasol({ colors: [BK.red, 0xf4f0e8], r: 1.1 }), 0.3, -0.45));
  const [cx, cy0] = c.userData.case;
  for (let i = 0; i < 3; i++) g.add(at(F.padThaiDish(), cx - 0.18 + i * 0.18, 0, cy0 + 0.01));
  for (let i = 0; i < 3; i++) g.add(at(F.bowl(0.06, { broth: [0xf08a5a, 0xf2e8c8, 0xf2d880][i], band: 0x3a7fd0 }), 0.15 + i * 0.14, 0.12, C));
  g.add(at(K.bagBunch(), 0.55, 0.28, 1.0));
  return finish(g, 'padthai', vendorAt(g, vendor, 'wok', 0.95, -0.6, 3), 'wok', { front: [0.5, 0.75] });
}
export function fruit({ color = 0x4f9d6a } = {}) {
  const g = new THREE.Group();
  const c = g.add(K.cart({ sign: 'fruit', gas: color })).children.at(-1);
  const ice = at(K.iceCase({ w: 0.62, d: 0.46 }), c.userData.caseFloor[0], 0, c.userData.caseFloor[1]);
  g.add(ice);
  const rows = F.fruitRows(ice.userData.ice);
  rows.position.set(c.userData.caseFloor[0], c.userData.caseFloor[1], 0);
  g.add(rows);
  for (let i = 0; i < 3; i++) g.add(at(F.fruitBag(), 0.15 + i * 0.13, 0.12, C));
  g.add(at(K.parasol({ colors: [color, 0xf4f0e8], r: 1.0 }), 0.2, -0.45));
  return finish(g, 'fruit', vendorAt(g, 'fruitSeller', 'chop', 0.3, -0.6, 6), 'chop');
}
export function noodle() {
  const g = new THREE.Group();
  const c = g.add(K.cart({ sign: 'kuaytiew', gas: 0x3a7fd0 })).children.at(-1);
  g.add(at(F.noodleBundles(), c.userData.case[0], 0, c.userData.case[1] + 0.01));
  g.add(at(K.stockPot({ stand: false, r: 0.13, h: 0.24 }), 0.22, -0.05, C), at(K.stockPot({ stand: false, r: 0.11, h: 0.22, broth: 0x9a6a3a }), 0.48, -0.05, C));
  g.add(at(F.noodleSoup(), 0.35, 0.22, C));
  g.add(at(K.parasol({ colors: [0xe8673c, 0xf4f0e8], r: 1.05 }), 0.2, -0.45));
  return finish(g, 'noodle', vendorAt(g, 'noodleMan', 'shake', 0.3, -0.6, 9), 'shake');
}
export function kuayJub() {
  const g = new THREE.Group();
  g.add(K.cart({ sign: 'kuayjub', gas: 0x3a7fd0 }));
  g.add(at(K.stockPot({ stand: false, r: 0.15, h: 0.26, broth: 0x8a5a34 }), 0.3, -0.05, C));
  for (let i = 0; i < 3; i++) g.add(at(F.kuayJub(), -0.45 + i * 0.2, 0.05, C + 0.23));
  g.add(at(K.parasol({ colors: [0xf4f0e8, 0x1c2232], r: 1.0 }), 0.2, -0.45));
  return finish(g, 'kuayjub', vendorAt(g, 'noodleMan', 'shake', 0.3, -0.6, 19), 'shake');
}
export function chestnut() {
  const g = new THREE.Group();
  g.add(K.cart({ sign: 'chestnut' }));
  g.add(at(F.chestnutWok(), 0.3, -0.02, C + 0.14));
  for (let i = 0; i < 4; i++) g.add(at(F.foamBox(0.1, 0.08), -0.5 + i * 0.13, 0.05, C + 0.23));
  return finish(g, 'chestnut', vendorAt(g, 'wokCook', 'wok', 0.3, -0.6, 13), 'wok');
}
export function khaoManGai() {
  const g = new THREE.Group();
  const c = g.add(K.cart({ sign: 'khaomangai', gas: 0x3a7fd0 })).children.at(-1);
  g.add(at(F.chickenRail(), c.userData.case[0], 0, c.userData.case[1] + 0.2));
  g.add(at(F.khaoManGaiDish(), 0.3, 0.12, C), at(K.stockPot({ stand: false, r: 0.11, h: 0.2 }), 0.45, -0.12, C));
  g.add(at(K.parasol({ colors: [0xf4f0e8, BK.red], r: 1.0 }), 0.2, -0.45));
  return finish(g, 'khaomangai', vendorAt(g, 'noodleMan', 'chop', 0.3, -0.6, 21), 'chop');
}
export function roti() {
  const g = new THREE.Group();
  g.add(K.cart({ sign: 'roti', gas: 0x4f9d6a }));
  const gr = at(K.griddle({ w: 0.4, d: 0.3 }), 0.35, -0.02, 0);
  gr.scale.y = 1.1; g.add(gr);
  g.add(at(F.roti(), 0.35, 0, 0.67));
  for (let i = 0; i < 3; i++) g.add(at(F.foamBox(0.1, 0.08), -0.5 + i * 0.14, 0.05, C + 0.23));
  return finish(g, 'roti', vendorAt(g, 'wokCook', 'wok', 0.3, -0.6, 23), 'wok');
}
export function nest() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 0.8, cloth: [0xd9342b, 0xe8b64a] }), 0, 0));
  g.add(at(F.nestBottles(), 0, 0.02, T));
  return finish(g, 'nest', vendorAt(g, 'teaVendor', 'idle', 0, -0.5, 25), 'idle');
}

// ---------- tables ----------
export function mooPing({ satay = false } = {}) {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 0.7, cloth: [0x3a7fd0, 0xf4f0e8] }), 0, 0.1));
  const gr = at(K.grill({ len: 0.7 }), 0, -0.25);
  g.add(gr);
  for (let i = 0; i < 9; i++) g.add(at(F.moopingSkewer(), -0.02, -0.36 + i * 0.026, gr.userData.grate + 0.01));
  if (satay) g.add(at(F.satayDish(), -0.15, 0.15, T));
  else { g.add(at(F.kratip(), -0.25, 0.15, T), at(F.kratip(), -0.13, 0.15, T)); for (let i = 0; i < 5; i++) g.add(at(F.riceBag(), 0.05 + (i % 3) * 0.08, 0.1 + Math.floor(i / 3) * 0.08, T)); }
  g.add(at(K.parasol({ colors: [satay ? 0xf2b84b : BK.stoolBlue, 0xf4f0e8], r: 0.95 }), 0, -0.6));
  return finish(g, satay ? 'satay' : 'mooping', vendorAt(g, 'griller', 'fan', 0, -0.7, 4), 'fan');
}
export function seafood() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 0.9, cloth: [0x2c5aa0, 0xf4f0e8] }), 0, 0.1));
  const ice = at(K.iceCase({ w: 0.6, d: 0.36 }), -0.1, 0.12, T);
  g.add(ice, at(F.seafoodDisplay(), -0.1, 0.12, T + ice.userData.ice));
  const gr = at(K.grill({ len: 0.6 }), 0.1, -0.3);
  g.add(gr, at(F.saltFish(), 0.1, -0.3, gr.userData.grate));
  g.add(at(K.parasol({ colors: [0x2c5aa0], r: 1.0 }), 0, -0.6));
  return finish(g, 'seafood', vendorAt(g, 'griller', 'fan', 0.1, -0.75, 14), 'fan');
}
export function somTam() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 0.8, cloth: [0xf2b84b, 0xf4f0e8] }), 0, 0));
  g.add(at(F.mortar(), 0.05, -0.05, T));
  g.add(at(F.somTamDish(), -0.22, 0.1, T));
  for (let i = 0; i < 3; i++) g.add(at(F.mango(false), 0.25 + i * 0.05, 0.12, T));
  g.add(at(F.kratip(), 0.3, -0.12, T));
  g.add(at(K.parasol({ colors: [0xf2b84b], r: 0.95 }), 0, -0.55));
  return finish(g, 'somtam', vendorAt(g, 'somtamAunty', 'pound', 0.05, -0.55, 2), 'pound');
}
export function tea() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 0.7, cloth: [0xe8673c, 0xf4f0e8] }), 0, 0));
  g.add(at(F.teaPour(), 0.0, 0.05, T));
  for (let i = 0; i < 4; i++) g.add(at(i % 2 ? F.thaiTeaBag() : F.thaiTeaCup(), -0.25 + i * 0.07, 0.15, T));
  g.add(at(F.pinkMilk(), 0.25, 0.15, T));
  return finish(g, 'tea', vendorAt(g, 'teaVendor', 'pour', 0.0, -0.45, 12), 'pour');
}
export function fried() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 0.9, cloth: [0xe8673c, 0xf2b84b] }), 0, 0));
  g.add(at(F.fryer(), 0.25, -0.08, T), at(F.lukChin(), 0.25, 0.14, T), at(F.friedChicken(), -0.2, 0.05, T));
  g.add(at(K.parasol({ colors: [0xe8673c], r: 1.0 }), 0, -0.55));
  return finish(g, 'fried', vendorAt(g, 'griller', 'shake', 0.2, -0.55, 16), 'shake');
}

// ---------- stalls under a market tent (the lane): a 2.4 tent, a long steel table, the goods on it ----------
// goods: a function that fills the table (local x along it, top at y); the vendor stands behind at −Z
const TENT_GOODS = {
  mango: [(g, y) => { g.add(at(F.mangoPile(), -0.4, 0, y), at(F.mangoStickyRice(), 0.2, 0.1, y), at(F.mangoStickyRice(), 0.45, 0.05, y)); }, 'fruitSeller', 'idle'],
  coconut: [(g, y) => { g.add(at(F.coconutPile(), -0.4, 0, y), at(F.coconutIceCream(), 0.25, 0.1, y), at(F.coconutIceCream(), 0.45, 0.05, y)); }, 'fruitSeller', 'chop'],
  durian: [(g, y) => { g.add(at(F.durian(), -0.4, 0, y), at(F.durian(), -0.15, -0.05, y), at(F.durianTray(), 0.3, 0.05, y)); }, 'fruitSeller', 'chop'],
  sweets: [(g, y) => { g.add(at(F.thaiSweets(), -0.25, 0, y), at(F.khanomKrok(), 0.35, 0, y)); }, 'somtamAunty', 'idle'],
  insects: [(g, y) => { g.add(at(F.insects(), -0.3, 0, y), at(F.friedChicken(), 0.3, 0, y)); }, 'griller', 'idle'],
  hoytod: [(g, y) => { const gr = at(K.griddle({ w: 0.5, d: 0.34 }), 0.1, -0.05, y - 0.6); g.add(gr, at(F.hoyTod(), 0.1, -0.05, y + 0.015), at(F.hoyTodDish(), -0.45, 0.05, y)); }, 'wokCook', 'wok'],
  kaprao: [(g, y) => { g.add(at(K.wokStove({ food: F.padThaiHeap(0.08) }), 0.3, -0.2, y - 0.56)); g.add(at(F.kapraoDish(), -0.3, 0.05, y), at(F.kapraoDish(), -0.55, 0.05, y)); }, 'wokCook', 'wok'],
  tomyum: [(g, y) => { g.add(at(K.stockPot({ stand: false, r: 0.14, h: 0.22, broth: 0xe8673c }), 0.35, -0.05, y), at(F.tomYum(), -0.2, 0.05, y)); }, 'noodleMan', 'shake'],
  drinks: [(g, y) => { for (let i = 0; i < 6; i++) g.add(at([F.thaiTeaCup, F.pinkMilk, F.thaiTeaBag][i % 3](), -0.5 + i * 0.18, 0.05, y)); g.add(at(F.teaPour(), 0.0, -0.15, y)); }, 'teaVendor', 'pour'],
  porkLeg: [(g, y) => { g.add(at(F.porkLeg(), -0.3, -0.05, y), at(F.khaoKhaMooDish(), 0.25, 0.05, y)); }, 'noodleMan', 'chop'],
  khanomkrok: [(g, y) => { g.add(at(F.khanomKrok(), -0.1, 0, y), at(F.khanomKrok({ rows: 2, cols: 5 }), 0.45, 0, y)); }, 'somtamAunty', 'idle'],
  satay: [(g, y) => { const gr = at(K.grill({ len: 0.6 }), 0.25, -0.25, 0); g.add(gr, at(F.satayDish(), -0.3, 0.05, y)); }, 'griller', 'fan'],
};
export const TENT_KINDS = Object.keys(TENT_GOODS);
export function tentStall(goods = 'mango', { colors = BK.tents[0] } = {}) {
  const g = new THREE.Group();
  g.add(tentRoof({ colors, table: true }));
  const [fill, role, work] = TENT_GOODS[goods];
  fill(g, 0.52);
  return finish(g, goods, vendorAt(g, role, work, 0.1, -0.75, goods.length * 3), work, { front: [0, 0.75] });
}

// ---------- the kit by name ----------
export const STALLS = { padthai: padThai, fruit, noodle, kuayjub: kuayJub, chestnut, khaomangai: khaoManGai, roti, nest, mooping: mooPing, satay: () => mooPing({ satay: true }), seafood, somtam: somTam, tea, fried };

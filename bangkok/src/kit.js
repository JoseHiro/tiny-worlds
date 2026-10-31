// Whole stalls (bangkok/DESIGN.md §5, step 3 of §11): a base (cart or table) + a roof (parasol or tent) + cooking kit
// + food + the vendor. The customer side is +Z, the vendor stands at −Z facing the customers.
// Every stall's userData: kind, front ([x, z] where the first customer stands), vendor (the person), open(on, t)
// (fire, steam and the vendor's work start when the stall opens).
import * as THREE from 'three';
import { person } from '../../airport/src/parts.js';
import { BK, liveAll, addTo } from './common.js';
import * as K from './stalls.js';
import * as F from './foods.js';
import * as X from './clutter.js';
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

// ---------- what fills a stall (DESIGN.md §12.2) ----------
// a basket of kind heaped up (w × d, colour), a tray heaped, and the things every stall has round it
const inBasket = (kind, n, { w = 0.24, d = 0.2, h = 0.08, color = 0xd9342b, heap = 0.08, seed = 1 } = {}) => { const b = X.basket({ w, d, h, color }); b.add(at(X.fruitHeap(kind, n, w - 0.02, d - 0.02, heap, seed), 0, 0, b.userData.top)); return b; };
const onTray = (kind, n, { w = 0.3, d = 0.22, heap = 0.05, seed = 1 } = {}) => { const t = X.tray(w, d); t.add(at(X.fruitHeap(kind, n, w - 0.02, d - 0.02, heap, seed), 0, 0, 0.01)); return t; };
// bulb: [x, z, y] under the roof; prices: [[which, x, z, y], …] on sticks; feet: [[obj, x, z, ry], …] on the ground
function dress(g, { bulb, prices = [], feet = [] } = {}) {
  if (bulb) g.add(at(X.bareBulb({ drop: 0.25 }), bulb[0], bulb[1], bulb[2]));
  for (const [i, x, z, y, stick = 0.1] of prices) g.add(at(X.price(i, { w: 0.12, stick }), x, z, y));
  for (const [o, x, z, ry = 0] of feet) g.add(at(o, x, z, 0, ry));
}

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
  g.add(at(inBasket('egg', 16, { color: 0x3a7fd0, w: 0.2, d: 0.16, seed: 2 }), 0.42, -0.14, C), at(onTray('shrimp', 14, { w: 0.2, d: 0.14 }), 0.16, -0.14, C));
  dress(g, { prices: [[1, 0.0, 0.27, C]], feet: [[X.foamStack(3), -0.75, -0.1, 0.2], [inBasket('lime', 20, { color: 0x4f9d6a, w: 0.3, d: 0.22, h: 0.14 }), -0.3, -0.6]] });
  return finish(g, 'padthai', vendorAt(g, vendor, 'wok', 0.95, -0.6, 3), 'wok', { front: [0.5, 0.75] });
}
// fruit (DESIGN.md §12.4): the ice case packed with cut fruit in colour rows, bags of it on the shelf above, baskets of
// whole fruit heaped on the counter, more hung from the parasol, crates of watermelons and pineapples at its foot
export function fruit({ color = 0x4f9d6a } = {}) {
  const g = new THREE.Group();
  const c = g.add(K.cart({ sign: 'fruit', gas: color })).children.at(-1);
  const [fx, fy] = c.userData.caseFloor;
  const ice = at(K.iceCase({ w: 0.62, d: 0.46 }), fx, 0, fy);
  g.add(ice);
  g.add(at(X.fruitSticks([[0xe8505a, 0x4f8a3a], [0xf6d04a, null], [0xd8ecb0, 0x9fc06a], [0xf08a3a, null], [0xf6b93a, null], [0xf8f0e0, 0xe0407a]], 7, 0.58, 0.42), fx, 0, fy + ice.userData.ice));
  const bags = [0xe8505a, 0xf6d04a, 0xf08a3a, 0xd8ecb0, 0xf6b93a, 0xe0407a];
  for (let i = 0; i < 6; i++) g.add(at(F.fruitBag(), fx - 0.24 + i * 0.095, 0, c.userData.case[1] + 0.01));
  // the cooking half of the counter: four baskets of whole fruit
  [['dragon', 0xf2b84b, 7], ['rambutan', 0x3a7fd0, 40], ['mangosteen', 0x4f9d6a, 22], ['mango', 0xd9342b, 10]].forEach(([kind, bc, n], i) => {
    const b = at(X.basket({ w: 0.27, d: 0.22, h: 0.08, color: bc }), 0.18 + (i % 2) * 0.29, -0.12 + Math.floor(i / 2) * 0.24, C);
    b.add(at(X.fruitHeap(kind, n, 0.26, 0.2, 0.08, i + 3), 0, 0, b.userData.top));
    g.add(b);
  });
  g.add(at(X.price(0, { w: 0.12, stick: 0.12 }), 0.18, 0.22, C + 0.04), at(X.price(2, { w: 0.12, stick: 0.1 }), 0.46, 0.22, C + 0.04), at(X.price(1), fx, 0.262, fy + 0.3));
  // the parasol; bags of cut fruit hung on a rail beside the sign
  g.add(at(K.parasol({ colors: [color, 0xf4f0e8], r: 1.15 }), 0.2, -0.45));
  const side = at(new THREE.Group(), 0.82, 0.05, 0, Math.PI / 2); side.add(X.rail(0.5, 1.55), X.hungBags(4, 0.45, 1.55, bags, { drop: 0.1, size: 0.05 })); g.add(side);
  g.add(at(X.bareBulb({ drop: 0.25 }), 0.25, 0.15, 1.95));
  // at its foot: watermelons and pineapples in crates, a cooler
  const w = at(X.crate(0x4f9d6a, { w: 0.5, d: 0.36, h: 0.2 }), -0.85, 0.35, 0, 0.2); w.add(at(X.fruitHeap('watermelon', 5, 0.48, 0.34, 0.14, 11), 0, 0, 0.1)); g.add(w);
  const p = at(X.crate(0xd9342b, { w: 0.42, d: 0.32, h: 0.16 }), 0.9, 0.4, 0, -0.3); p.add(at(X.fruitHeap('pineapple', 8, 0.4, 0.3, 0.1, 12), 0, 0, 0.08)); g.add(p);
  g.add(at(X.cooler(0x3a7fd0), -0.1, -0.75, 0, 0.1));
  return finish(g, 'fruit', vendorAt(g, 'fruitSeller', 'chop', 0.3, -0.6, 6), 'chop');
}
export function noodle() {
  const g = new THREE.Group();
  const c = g.add(K.cart({ sign: 'kuaytiew', gas: 0x3a7fd0 })).children.at(-1);
  g.add(at(F.noodleBundles(), c.userData.case[0], 0, c.userData.case[1] + 0.01));
  g.add(at(K.stockPot({ stand: false, r: 0.13, h: 0.24 }), 0.22, -0.05, C), at(K.stockPot({ stand: false, r: 0.11, h: 0.22, broth: 0x9a6a3a }), 0.48, -0.05, C));
  g.add(at(F.noodleSoup(), 0.35, 0.22, C));
  g.add(at(K.parasol({ colors: [0xe8673c, 0xf4f0e8], r: 1.05 }), 0.2, -0.45));
  g.add(at(X.stacks('bowl', [[-0.45, 0], [-0.3, 0], [-0.15, 0]], 6, 0xf4f0e8), 0, 0, 1.11));
  g.add(at(inBasket('meatball', 30, { color: 0x4f9d6a, w: 0.22, d: 0.18, seed: 4 }), 0.05, 0.18, C));
  dress(g, { bulb: [0.2, 0.15, 1.98], prices: [[2, 0.55, 0.27, C]], feet: [[X.stoolStack(5, 0x3a7fd0), -0.85, 0.1], [X.bucket(), 0.8, -0.3], [X.crate(0x4f9d6a), -0.3, -0.62, 0.2]] });
  return finish(g, 'noodle', vendorAt(g, 'noodleMan', 'shake', 0.3, -0.6, 9), 'shake');
}
export function kuayJub() {
  const g = new THREE.Group();
  g.add(K.cart({ sign: 'kuayjub', gas: 0x3a7fd0 }));
  g.add(at(K.stockPot({ stand: false, r: 0.15, h: 0.26, broth: 0x8a5a34 }), 0.3, -0.05, C));
  for (let i = 0; i < 3; i++) g.add(at(F.kuayJub(), -0.45 + i * 0.2, 0.05, C + 0.23));
  g.add(at(K.parasol({ colors: [0xf4f0e8, 0x1c2232], r: 1.0 }), 0.2, -0.45));
  g.add(at(X.rail(1.1, 1.6), 0, 0.36), at(X.hungBags(6, 1.0, 1.6, [0xe8c890, 0xd8b070], { drop: 0.06, size: 0.045 }), 0, 0.36));
  g.add(at(X.stacks('bowl', [[0.05, 0.17], [0.55, 0.18]], 7, 0xf4f0e8), 0, 0, C));
  dress(g, { bulb: [0.2, 0.15, 1.98], prices: [[2, -0.5, 0.27, C + 0.23]], feet: [[X.stoolStack(4), 0.85, 0.15], [X.foamStack(4), -0.8, -0.2]] });
  return finish(g, 'kuayjub', vendorAt(g, 'noodleMan', 'shake', 0.3, -0.6, 19), 'shake');
}
export function chestnut() {
  const g = new THREE.Group();
  g.add(K.cart({ sign: 'chestnut' }));
  g.add(at(F.chestnutWok(), 0.3, -0.02, C + 0.14));
  for (let i = 0; i < 4; i++) g.add(at(F.foamBox(0.1, 0.08), -0.5 + i * 0.13, 0.05, C + 0.23));
  g.add(at(inBasket('chestnut', 60, { color: 0xd9342b, w: 0.3, d: 0.22, heap: 0.1, seed: 5 }), -0.27, 0, C + 0.01));
  g.add(at(K.parasol({ colors: [BK.red, 0xe8b64a], r: 1.05 }), 0.2, -0.45));
  dress(g, { bulb: [0.2, 0.15, 1.98], prices: [[3, -0.27, 0.27, C + 0.23], [7, 0.55, 0.27, C]], feet: [[X.sack(0xd8c8a0, 0x5a2e18), -0.8, 0.1], [X.sack(0xd8c8a0, 0x5a2e18), -0.75, -0.35]] });
  return finish(g, 'chestnut', vendorAt(g, 'wokCook', 'wok', 0.3, -0.6, 13), 'wok');
}
export function khaoManGai() {
  const g = new THREE.Group();
  const c = g.add(K.cart({ sign: 'khaomangai', gas: 0x3a7fd0 })).children.at(-1);
  g.add(at(F.chickenRail(), c.userData.case[0], 0, c.userData.case[1] + 0.2));
  g.add(at(F.khaoManGaiDish(), 0.3, 0.12, C), at(K.stockPot({ stand: false, r: 0.11, h: 0.2 }), 0.45, -0.12, C));
  g.add(at(K.parasol({ colors: [0xf4f0e8, BK.red], r: 1.0 }), 0.2, -0.45));
  g.add(at(X.stacks('bowl', [[0.05, 0.2], [0.18, 0.22]], 6, 0xf4f0e8), 0, 0, C), at(inBasket('lime', 14, { color: 0x3a7fd0, w: 0.16, d: 0.14, seed: 6 }), 0.5, 0.18, C));
  dress(g, { bulb: [0.2, 0.15, 1.98], prices: [[3, -0.27, 0.27, C + 0.45]], feet: [[X.foamStack(5), 0.85, -0.1], [X.cooler(0xf4f0e8), -0.75, -0.3, 0.2]] });
  return finish(g, 'khaomangai', vendorAt(g, 'noodleMan', 'chop', 0.3, -0.6, 21), 'chop');
}
export function roti() {
  const g = new THREE.Group();
  g.add(K.cart({ sign: 'roti', gas: 0x4f9d6a }));
  const gr = at(K.griddle({ w: 0.4, d: 0.3 }), 0.35, -0.02, 0);
  gr.scale.y = 1.1; g.add(gr);
  g.add(at(F.roti(), 0.35, 0, 0.67));
  for (let i = 0; i < 3; i++) g.add(at(F.foamBox(0.1, 0.08), -0.5 + i * 0.14, 0.05, C + 0.23));
  g.add(at(inBasket('banana', 14, { color: 0xf2b84b, w: 0.24, d: 0.18, seed: 7 }), -0.27, 0, C + 0.01), at(inBasket('egg', 14, { color: 0x3a7fd0, w: 0.16, d: 0.14, seed: 8 }), 0.05, 0.17, C));
  g.add(at(X.stacks('cup', [[0.6, 0.2], [0.6, 0.1]], 4, 0xd9342b), 0, 0, C));
  g.add(at(K.parasol({ colors: [0xf09a9a, 0xf4f0e8], r: 1.0 }), 0.2, -0.45));
  dress(g, { bulb: [0.2, 0.15, 1.98], prices: [[1, -0.1, 0.27, C + 0.23]], feet: [[X.cooler(0xf09a9a), -0.8, 0, 0.3]] });
  return finish(g, 'roti', vendorAt(g, 'wokCook', 'wok', 0.3, -0.6, 23), 'wok');
}
export function nest() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 0.8, cloth: [0xd9342b, 0xe8b64a] }), 0, 0));
  g.add(at(F.nestBottles(), 0, 0.02, T));
  g.add(at(X.foldedStacks([[-0.25, 0.15], [0.0, 0.17], [0.25, 0.15]], [0xd9342b, 0xe8b64a, 0xd9342b], { max: 5, seed: 9 }), 0, 0, T));
  dress(g, { prices: [[7, 0, 0.29, T]], feet: [[X.cooler(0xd9342b), 0.55, -0.4]] });
  return finish(g, 'nest', vendorAt(g, 'teaVendor', 'idle', 0, -0.5, 25), 'idle');
}

// ---------- tables ----------
// moo ping and satay (DESIGN.md §12.3): a long charcoal grill packed edge to edge with skewers, smoke rolling off it
// and the coals glowing; on the table trays of raw skewers waiting and a heap of glazed ones, sticky rice in baskets
// and bags; bags of rice hung from a rail at the front; charcoal, a cooler and stacked boxes underneath
export function mooPing({ satay = false } = {}) {
  const g = new THREE.Group();
  const cooked = satay ? [0xd8a030, 0xc89028, 0xe0a83a] : [0x8a4a22, 0x7a3e1c, 0x9a5426, 0x6e3418], raw = satay ? [0xf2d080] : [0xe8a8a0, 0xf0b4aa];
  g.add(at(K.foldTable({ w: 1.15, d: 0.55, cloth: [satay ? 0xf2b84b : 0x3a7fd0, 0xf4f0e8] }), 0, 0.12));
  const gr = at(K.grill({ len: 1.05 }), 0, -0.3);
  g.add(gr, at(X.skewerRow(34, 0.98, { colors: cooked, shape: satay ? 'chunk' : 'chunk', size: satay ? 0.02 : 0.026 }), 0, -0.3, gr.userData.grate + 0.004));
  // the table: raw ones waiting in a tray (two layers), cooked ones heaped, rice
  const t1 = at(X.tray(0.36, 0.26), -0.36, 0.08, T); g.add(t1);
  for (const [k, y] of [[0, 0], [1, 0.02]]) t1.add(at(X.skewerRow(10, 0.3, { colors: raw, size: 0.024 }), k * 0.012, y + 0.012, -0.01 + k * 0.02));
  const t2 = at(X.tray(0.32, 0.24), 0.02, 0.1, T); g.add(t2);
  for (let k = 0; k < 3; k++) { const r = at(X.skewerRow(8, 0.26, { colors: cooked, size: 0.024 }), (k - 1) * 0.01, 0.012 + k * 0.022, (k - 1) * 0.03); r.rotation.y = (k - 1) * 0.15; t2.add(r); }
  if (satay) { g.add(at(F.satayDish(), 0.38, 0.12, T)); for (let i = 0; i < 3; i++) g.add(at(F.bowl(0.05, { broth: 0xc87a2a, band: 0xf2b84b }), 0.3 + i * 0.1, 0.27, T)); }
  else { const b = at(X.basket({ w: 0.24, d: 0.2, h: 0.09, color: 0x4f9d6a }), 0.38, 0.1, T); g.add(b); for (let i = 0; i < 6; i++) b.add(at(F.riceBag(), -0.07 + (i % 3) * 0.07, -0.04 + Math.floor(i / 3) * 0.08, 0.02)); g.add(at(F.kratip(), 0.38, 0.3, T), at(F.kratip(), 0.48, 0.28, T)); }
  g.add(at(X.price(satay ? 4 : 0, { w: 0.13, stick: 0.12 }), 0.02, 0.24, T + 0.04), at(X.price(5, { w: 0.15 }), -0.3, 0.398, T - 0.06));
  // the front: a rail with bags of sticky rice (moo ping) or of peanut sauce (satay), and the bulb
  g.add(at(X.rail(1.1, 1.72), 0, 0.37));
  g.add(at(X.hungBags(7, 1.0, 1.72, satay ? [0xc87a2a, 0xe0a050] : [0xf4f0e8, 0xf2ece0, 0xe8823a], { drop: 0.06, size: 0.04 }), 0, 0.37));
  g.add(at(K.parasol({ colors: [satay ? 0xf2b84b : BK.stoolBlue, 0xf4f0e8], r: 1.15 }), 0, -0.62));
  g.add(at(X.bareBulb({ drop: 0.28 }), 0, -0.1, 1.98));
  // underneath and behind: charcoal, a cooler, stacked foam boxes
  g.add(at(X.sack(), -0.72, -0.62), at(X.cooler(0xd9342b), 0.72, -0.55, 0, 0.3), at(X.foamStack(3), 0.25, 0.12, 0.02, 0.1));
  return finish(g, satay ? 'satay' : 'mooping', vendorAt(g, 'griller', 'fan', 0, -0.75, 4), 'fan');
}
export function seafood() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 1.3, cloth: [0x2c5aa0, 0xf4f0e8] }), 0, 0.1));
  const ice = at(K.iceCase({ w: 0.6, d: 0.36 }), -0.2, 0.12, T);
  g.add(ice, at(F.seafoodDisplay(), -0.2, 0.12, T + ice.userData.ice), at(X.fruitHeap('shrimp', 16, 0.2, 0.3, 0.03, 13), -0.42, 0.12, T + ice.userData.ice));
  const gr = at(K.grill({ len: 0.6 }), 0.1, -0.3);
  g.add(gr, at(F.saltFish(), 0.1, -0.3, gr.userData.grate));
  g.add(at(K.parasol({ colors: [0x2c5aa0], r: 1.0 }), 0, -0.6));
  g.add(at(inBasket('crab', 6, { color: 0x3a7fd0, w: 0.26, d: 0.2, seed: 10 }), 0.48, 0.14, T), at(inBasket('shell', 24, { color: 0x4f9d6a, w: 0.22, d: 0.18, seed: 11 }), 0.48, -0.08, T));
  dress(g, { bulb: [0, -0.1, 1.98], prices: [[7, -0.1, 0.32, T + 0.06], [3, 0.48, 0.27, T]], feet: [[X.cooler(0x2c5aa0), -0.7, -0.5, 0.2], [X.bucket(0x3a7fd0), 0.75, -0.55], [inBasket('crab', 8, { color: 0xd9342b, w: 0.34, d: 0.26, h: 0.14, seed: 12 }), 0.75, 0.25]] });
  return finish(g, 'seafood', vendorAt(g, 'griller', 'fan', 0.1, -0.75, 14), 'fan');
}
export function somTam() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 1.2, cloth: [0xf2b84b, 0xf4f0e8] }), 0, 0));
  g.add(at(F.mortar(), 0.05, -0.05, T));
  [['papaya', 6, 0x4f9d6a], ['tomato', 18, 0xd9342b], ['lime', 20, 0x3a7fd0], ['chili', 40, 0xf2b84b], ['bean', 30, 0xd9342b]].forEach(([k, n, c], i) => g.add(at(inBasket(k, n, { color: c, w: 0.2, d: 0.16, h: 0.07, heap: 0.05, seed: 20 + i }), -0.5 + (i % 3) * 0.22 + (i > 2 ? 0.66 : 0), i > 2 ? -0.1 : 0.15, T)));
  g.add(at(F.somTamDish(), -0.22, 0.1, T));
  for (let i = 0; i < 3; i++) g.add(at(F.mango(false), 0.25 + i * 0.05, 0.12, T));
  g.add(at(F.kratip(), 0.3, -0.12, T));
  g.add(at(K.parasol({ colors: [0xf2b84b], r: 0.95 }), 0, -0.55));
  dress(g, { bulb: [0, -0.1, 1.95], prices: [[2, -0.22, 0.25, T]], feet: [[inBasket('papaya', 10, { color: 0x3a7fd0, w: 0.4, d: 0.3, h: 0.18, seed: 26 }), 0.7, -0.4, 0.3], [X.bucket(0xd9342b), -0.7, -0.4]] });
  return finish(g, 'somtam', vendorAt(g, 'somtamAunty', 'pound', 0.05, -0.55, 2), 'pound');
}
export function tea() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 1.0, cloth: [0xe8673c, 0xf4f0e8] }), 0, 0));
  g.add(at(F.teaPour(), 0.0, 0.05, T));
  [0xe8823a, 0xf2a0b8, 0x5fae6a].forEach((c, i) => g.add(at(X.tank(c), -0.32 + i * 0.32, -0.15, T)));
  g.add(at(X.stacks('cup', [[0.4, 0.15], [0.4, 0.05]], 8, 0xf4f0e8), 0, 0, T));
  g.add(at(K.parasol({ colors: [0xe8673c, 0xf4f0e8], r: 1.0 }), 0, -0.55));
  g.add(at(X.rail(1.0, 1.55), 0, 0.3), at(X.hungBags(6, 0.9, 1.55, [0xe8823a, 0xf2a0b8, 0x5fae6a], { drop: 0.06, size: 0.045 }), 0, 0.3));
  for (let i = 0; i < 4; i++) g.add(at(i % 2 ? F.thaiTeaBag() : F.thaiTeaCup(), -0.25 + i * 0.07, 0.15, T));
  g.add(at(F.pinkMilk(), 0.25, 0.15, T));
  dress(g, { bulb: [0, -0.1, 1.95], prices: [[1, 0.25, 0.25, T]], feet: [[X.cooler(0x3a7fd0), 0.6, -0.45, 0.2], [X.stoolStack(3, 0x3a7fd0), -0.65, -0.4]] });
  return finish(g, 'tea', vendorAt(g, 'teaVendor', 'pour', 0.0, -0.45, 12), 'pour');
}
export function fried() {
  const g = new THREE.Group();
  g.add(at(K.foldTable({ w: 1.2, cloth: [0xe8673c, 0xf2b84b] }), 0, 0));
  g.add(at(F.fryer(), 0.35, -0.08, T), at(F.lukChin(), 0.35, 0.14, T), at(F.friedChicken(), -0.05, -0.05, T));
  g.add(at(onTray('roll', 22, { seed: 30 }), -0.38, 0.1, T), at(onTray('fried', 20, { w: 0.24, seed: 31 }), -0.05, 0.14, T), at(onTray('meatball', 30, { w: 0.2, d: 0.16, seed: 32 }), -0.42, -0.14, T));
  g.add(at(X.rail(1.2, 1.55), 0, 0.3), at(X.hungBags(7, 1.1, 1.55, [0xd8b878, 0xc8a060], { drop: 0.06, size: 0.045 }), 0, 0.3));
  g.add(at(K.parasol({ colors: [0xe8673c], r: 1.0 }), 0, -0.55));
  dress(g, { bulb: [0, -0.1, 1.95], prices: [[1, -0.38, 0.24, T], [5, 0.0, 0.29, T]], feet: [[K.gasCylinder(0xd9342b), 0.65, -0.45], [X.foamStack(4), -0.7, -0.35]] });
  return finish(g, 'fried', vendorAt(g, 'griller', 'shake', 0.2, -0.55, 16), 'shake');
}

// ---------- stalls under a market tent (the lane): a 2.4 tent, a long steel table, the goods on it ----------
// goods: a function that fills the table (local x along it, top at y); the vendor stands behind at −Z
const TENT_GOODS = {
  mango: [(g, y) => { g.add(at(F.mangoPile(), -0.55, -0.05, y), at(inBasket('mango', 22, { color: 0x4f9d6a, w: 0.3, d: 0.24, seed: 40 }), -0.2, 0.0, y)); for (let i = 0; i < 4; i++) g.add(at(F.mangoStickyRice(), 0.12 + (i % 2) * 0.26, -0.08 + Math.floor(i / 2) * 0.2, y)); g.add(at(X.price(2, { stick: 0.12 }), 0.5, 0.15, y)); }, 'fruitSeller', 'idle'],
  coconut: [(g, y) => { g.add(at(F.coconutPile(), -0.5, 0, y), at(inBasket('coconut', 8, { color: 0xf2b84b, w: 0.3, d: 0.24, seed: 41 }), -0.1, 0, y), at(F.coconutIceCream(), 0.25, 0.1, y), at(F.coconutIceCream(), 0.45, 0.05, y), at(X.stacks('cup', [[0.6, -0.1]], 8), 0, 0, y), at(X.price(1, { stick: 0.12 }), 0.3, -0.1, y)); g.add(at(inBasket('coconut', 10, { color: 0x3a7fd0, w: 0.42, d: 0.32, h: 0.16, seed: 42 }), -0.85, 0.75)); }, 'fruitSeller', 'chop'],
  durian: [(g, y) => { g.add(at(inBasket('durian', 5, { color: 0xd9342b, w: 0.36, d: 0.28, heap: 0.1, seed: 43 }), -0.45, 0, y), at(F.durian(), -0.05, -0.05, y), at(F.durianTray(), 0.25, 0.05, y), at(F.durianTray(), 0.5, 0.05, y), at(X.price(7, { stick: 0.12 }), 0.38, -0.12, y)); g.add(at(inBasket('durian', 6, { color: 0x4f9d6a, w: 0.42, d: 0.32, h: 0.16, seed: 44 }), 0.85, 0.75)); }, 'fruitSeller', 'chop'],
  sweets: [(g, y) => { g.add(at(onTray('sweet', 40, { seed: 45 }), -0.5, 0, y), at(onTray('ball', 40, { seed: 46 }), -0.15, 0, y), at(F.thaiSweets(), 0.2, 0, y), at(F.khanomKrok(), 0.5, 0, y), at(X.price(0, { stick: 0.12 }), -0.3, 0.17, y)); g.add(at(X.rail(1.8, 2.05, { posts: false }), 0, 1.0), at(X.hungBags(9, 1.7, 2.05, [0xf09ab0, 0x5fae6a, 0xf2d040, 0xf4f0e8], { drop: 0.1, size: 0.045 }), 0, 1.0)); }, 'somtamAunty', 'idle'],
  insects: [(g, y) => { g.add(at(onTray('insect', 60, { seed: 47 }), -0.55, 0, y), at(onTray('insect', 50, { seed: 48 }), -0.2, 0, y), at(onTray('fried', 20, { seed: 49 }), 0.15, 0, y), at(F.friedChicken(), 0.5, 0, y), at(X.price(1, { stick: 0.12 }), -0.38, 0.17, y)); }, 'griller', 'idle'],
  hoytod: [(g, y) => { const gr = at(K.griddle({ w: 0.5, d: 0.34 }), 0.1, -0.05, y - 0.6); g.add(gr, at(F.hoyTod(), 0.1, -0.05, y + 0.015), at(F.hoyTodDish(), -0.45, 0.05, y), at(inBasket('shell', 30, { color: 0x3a7fd0, seed: 50 }), 0.55, 0.05, y), at(inBasket('egg', 14, { color: 0xf2b84b, w: 0.16, d: 0.14, seed: 51 }), -0.65, -0.12, y), at(X.price(2, { stick: 0.12 }), -0.3, 0.17, y)); }, 'wokCook', 'wok'],
  kaprao: [(g, y) => { g.add(at(K.wokStove({ food: F.padThaiHeap(0.08) }), 0.3, -0.2, y - 0.56)); g.add(at(F.kapraoDish(), -0.3, 0.05, y), at(F.kapraoDish(), -0.55, 0.05, y), at(inBasket('chili', 40, { color: 0x4f9d6a, w: 0.16, d: 0.14, seed: 52 }), -0.05, 0.1, y), at(inBasket('egg', 14, { color: 0x3a7fd0, w: 0.16, d: 0.14, seed: 53 }), 0.65, 0.1, y), at(X.price(2, { stick: 0.12 }), -0.42, -0.12, y)); }, 'wokCook', 'wok'],
  tomyum: [(g, y) => { g.add(at(K.stockPot({ stand: false, r: 0.14, h: 0.22, broth: 0xe8673c }), 0.35, -0.05, y), at(F.tomYum(), -0.2, 0.05, y), at(onTray('shrimp', 18, { w: 0.22, d: 0.16, seed: 54 }), -0.55, 0.05, y), at(inBasket('lime', 16, { color: 0x4f9d6a, w: 0.14, d: 0.12, seed: 55 }), 0.65, 0.1, y), at(inBasket('chili', 30, { color: 0xd9342b, w: 0.14, d: 0.12, seed: 56 }), 0.65, -0.1, y), at(X.price(3, { stick: 0.12 }), 0.05, 0.17, y)); }, 'noodleMan', 'shake'],
  drinks: [(g, y) => { [0xe8823a, 0xf2a0b8, 0x5fae6a, 0x5ce1ff].forEach((c, i) => g.add(at(X.tank(c), -0.6 + i * 0.25, -0.1, y))); g.add(at(F.teaPour(), 0.45, -0.1, y), at(X.stacks('cup', [[0.6, 0.12], [0.5, 0.12]], 8), 0, 0, y)); for (let i = 0; i < 4; i++) g.add(at([F.thaiTeaCup, F.pinkMilk, F.thaiTeaBag][i % 3](), -0.5 + i * 0.18, 0.13, y)); g.add(at(X.rail(1.8, 2.05, { posts: false }), 0, 1.0), at(X.hungBags(9, 1.7, 2.05, [0xe8823a, 0xf2a0b8, 0x5fae6a, 0x5ce1ff], { drop: 0.1, size: 0.05 }), 0, 1.0)); }, 'teaVendor', 'pour'],
  porkLeg: [(g, y) => { g.add(at(F.porkLeg(), -0.3, -0.05, y), at(F.porkLeg(), -0.55, 0.05, y), at(F.khaoKhaMooDish(), 0.25, 0.05, y), at(inBasket('egg', 14, { color: 0xf2b84b, w: 0.16, d: 0.14, seed: 57 }), 0.55, -0.05, y), at(X.stacks('bowl', [[0.0, 0.1]], 6), 0, 0, y), at(X.price(3, { stick: 0.12 }), 0.4, 0.17, y)); }, 'noodleMan', 'chop'],
  khanomkrok: [(g, y) => { g.add(at(F.khanomKrok(), -0.1, 0, y), at(F.khanomKrok({ rows: 2, cols: 5 }), 0.45, 0, y), at(onTray('ball', 30, { w: 0.22, d: 0.16, seed: 58 }), -0.55, 0, y), at(X.price(1, { stick: 0.12 }), 0.2, 0.17, y)); }, 'somtamAunty', 'idle'],
  satay: [(g, y) => { const gr = at(K.grill({ len: 0.7 }), 0.25, -0.25, 0); g.add(gr, at(X.skewerRow(24, 0.66, { colors: [0xd8a030, 0xc89028, 0xe0a83a], size: 0.02 }), 0.25, -0.25, gr.userData.grate + 0.004), at(F.satayDish(), -0.3, 0.05, y)); const t = at(X.tray(0.3, 0.2), -0.6, 0.0, y); t.add(at(X.skewerRow(9, 0.26, { colors: [0xf2d080], size: 0.02 }), 0, 0.012, 0)); g.add(t, at(X.price(4, { stick: 0.12 }), -0.05, 0.17, y)); }, 'griller', 'fan'],
  // things that aren't food (DESIGN.md §12.5): toys, accessories, records
  toys: [(g, y) => { g.add(at(X.plushHeap(26, 0.9, 0.36, 0.14), -0.25, 0, y), at(X.glowToys(16, 0.5), 0.5, 0.05, y), at(X.price(0, { stick: 0.12 }), 0.15, 0.17, y)); g.add(at(X.balloons(7), 0.95, 0.9, 1.2), at(X.rail(0.01, 1.2), 0.95, 0.9)); /* (balloons tied to a post) */ g.add(at(X.plushHeap(14, 0.5, 0.4, 0.2, 7), -0.85, 0.8)); }, 'bkGirl', 'idle'],
  accessories: [(g, y) => { g.add(at(X.pegBoard({ w: 1.7, h: 0.75 }), 0, -1.08, 1.05), at(X.glassesTower(), 0.95, 0.85), at(X.price(4, { stick: 0.12 }), 0.4, 0.17, y)); const tilt = at(X.pegBoard({ w: 0.7, h: 0.3, cols: 10, rows: 4, item: [0.025, 0.025, 0.01], colors: [0xe8b64a, 0xf4f0e8, 0xd9342b, 0x5ce1ff, 0xf09ab0], board: 0x1c2232 }), -0.3, 0.0, y); tilt.rotation.x = -1.1; g.add(tilt); g.add(at(X.pegBoard({ w: 0.5, h: 0.3, cols: 6, rows: 2, item: [0.06, 0.1, 0.012], board: 0xf4f0e8 }), 0.4, -0.05, y)); }, 'bkWorker', 'idle'],
  records: [(g, y) => { g.add(at(X.recordCrate(0x8a6a4a, 1), -0.5, 0, y), at(X.recordCrate(0x3a7fd0, 2), -0.1, 0, y), at(X.radio(), 0.3, -0.05, y), at(X.radio(0x2f7a4a), 0.6, 0.0, y), at(X.price(3, { stick: 0.12 }), 0.3, 0.17, y)); g.add(at(X.recordCrate(0xd9342b, 3), -0.85, 0.8), at(X.recordCrate(0x4f9d6a, 4), 0.85, 0.8)); g.add(at(X.pegBoard({ w: 1.2, h: 0.4, cols: 4, rows: 1, item: [0.26, 0.26, 0.008], board: 0x1c2232, colors: [0xd9342b, 0xf2b84b, 0x5ce1ff, 0xf09ab0] }), 0, -1.08, 1.35)); }, 'bkUncle', 'idle'],
  // clothes (DESIGN.md §12.5): T-shirts on a rail across the back, dresses on the sides, folded stacks on the table,
  // a hat stand and flip-flops at the front, a price card
  clothes: [(g, y) => {
    const tees = [0xf4f0e8, 0x1c2232, 0xd9342b, 0xf2b84b, 0x3a7fd0, 0x4f9d6a, 0xf09a9a, 0x8a5aa0, 0xe8673c, 0x5ce1ff];
    g.add(at(X.rail(2.1, 2.0, { posts: false }), 0, -1.05), at(X.hungClothes('shirt', 11, 2.0, 1.98, tees, 3), 0, -1.05));
    for (const s of [-1, 1]) { const r = at(new THREE.Group(), s * 1.08, 0.0, 0, Math.PI / 2); r.add(X.rail(1.6, 1.95, { posts: false }), X.hungClothes('dress', 7, 1.5, 1.93, [0xf09a9a, 0xf4f0e8, 0x2c5aa0, 0xf2b84b, 0x8a5aa0, 0x4f9d6a, 0xd9342b], 5 + s)); g.add(r); }
    g.add(at(X.foldedStacks([[-0.6, -0.08], [-0.3, -0.08], [0, -0.08], [0.3, -0.08], [0.6, -0.08], [-0.45, 0.16], [-0.15, 0.16], [0.15, 0.16], [0.45, 0.16]], tees), 0, 0, y));
    g.add(at(X.price(5, { w: 0.2, stick: 0.18 }), 0.05, 0.2, y), at(X.price(4, { w: 0.14, stick: 0.12 }), -0.7, 0.2, y));
    g.add(at(X.hatStand(), 0.95, 0.85), at(X.sandals(2, 4), -0.65, 0.95));
  }, 'bkAuntie', 'idle'],
};
export const TENT_KINDS = Object.keys(TENT_GOODS);
export function tentStall(goods = 'mango', { colors = BK.tents[0] } = {}) {
  const g = new THREE.Group();
  g.add(tentRoof({ colors, table: true }));
  g.add(at(X.bareBulb({ drop: 0.2 }), 0.5, 0.2, 2.25));
  const [fill, role, work] = TENT_GOODS[goods];
  const cloth = K.foldTable({ w: 1.6, d: 1.12, h: 0.512, cloth: [colors[0], 0xf4f0e8] }); // (only its cloth shows, over the steel top)
  cloth.children.filter((m) => m.geometry.type === 'CylinderGeometry').forEach((m) => m.removeFromParent()); g.add(cloth);
  const n0 = g.children.length;
  fill(g, 0.52);
  // what lies on the table is set out a size up and across its whole depth (the table is deep: 1.6 × 1.1)
  for (const o of g.children.slice(n0)) if (o.position.y >= 0.51) { o.scale.multiplyScalar(1.3); o.position.z *= 2.0; }
  return finish(g, goods, vendorAt(g, role, work, 0.1, -0.75, goods.length * 3), work, { front: [0, 0.75] });
}

// ---------- the kit by name ----------
export const STALLS = { padthai: padThai, fruit, noodle, kuayjub: kuayJub, chestnut, khaomangai: khaoManGai, roti, nest, mooping: mooPing, satay: () => mooPing({ satay: true }), seafood, somtam: somTam, tea, fried };

// The food (bangkok/DESIGN.md §6, F1–F26): each dish served (plate, bowl, bag, cup) and the stall's display of it
// (on the grill, in the case, piled up). Everything sits on y = 0 and is a little larger than life so it reads
// from above. Small repeated bits (noodles, sprouts, peanuts, ice) are instanced.
import * as THREE from 'three';
import { PALETTE, M, mat, bx, rb, cy, sp, cn, put, pivot, group, bits, mound, rng, BOX, CYL, SPH, CONE, puffs, liveAll, addTo } from './common.js';

// ---------- cached shapes for bits ----------
const G = {};
const once = (k, make) => (G[k] ??= make());
const NOODLE = () => once('noodle', () => new THREE.TorusGeometry(0.022, 0.0035, 4, 8, Math.PI * 1.2));
const THIN = () => once('thin', () => new THREE.TorusGeometry(0.03, 0.002, 3, 8, Math.PI));
const SPROUT = () => once('sprout', () => new THREE.CylinderGeometry(0.0025, 0.0025, 0.035, 4));
const SHRIMP = () => once('shrimp', () => new THREE.TorusGeometry(0.016, 0.008, 6, 10, Math.PI * 1.4));
const CRUMB = () => BOX(0.008, 0.006, 0.008);
const LEAFLET = () => BOX(0.022, 0.002, 0.012);
const BALL = (r) => SPH(r, 8, 6);
const WEDGE = () => once('wedge', () => new THREE.SphereGeometry(0.022, 8, 5, 0, Math.PI / 2, 0, Math.PI / 2));

// a curried colour palette for the dishes
const C = {
  rice: 0xf7f3ea, sticky: 0xf2ece0, noodle: 0xe8d6a8, padthai: 0xc98a4a, brownGlaze: 0x8a4a22, grilled: 0xa8642e,
  egg: 0xfbf7ee, yolk: 0xf2b23a, basil: 0x3f7a2e, chili: 0xd9342b, lime: 0x8fc04a, peanut: 0xd8b07a, sprout: 0xf2ecd6,
  shrimp: 0xf08a5a, chicken: 0xf2e2bc, pork: 0x6b3a22, broth: 0xd9b98a, tomyum: 0xe8642e, papaya: 0xb8d88a,
  mango: 0xf6b93a, coconut: 0xf6f1e2, watermelon: 0xe8505a, pineapple: 0xf6d04a, guava: 0xd8ecb0, papayaRipe: 0xf08a3a,
  thaiTea: 0xe8823a, pink: 0xf2a0b8,
};
const food = (c) => M.food(c);

// ---------- containers (§6.5) ----------
// melamine plate with a green rim; top at 0.022
export function plate(r = 0.12, rim = 0x4f9d6a) {
  const g = new THREE.Group();
  cy(g, r + 0.004, r * 0.8, 0.012, M.plastic(rim), 0, 0.006, 0, 20);
  cy(g, r - 0.006, r * 0.75, 0.02, M.plastic(0xfbfaf6), 0, 0.012, 0, 20);
  g.userData.top = 0.022;
  return g;
}
// a soup bowl with a flower band; liquid at userData.liquid
export function bowl(r = 0.09, { broth = C.broth, band = 0xd9342b } = {}) {
  const g = new THREE.Group();
  put(g, CYL(r, r * 0.6, 0.075, 18, true), mat(0xfbfaf6, { roughness: 0.4, side: THREE.DoubleSide }), 0, 0.045, 0);
  cy(g, r * 0.6, r * 0.6, 0.008, M.plastic(0xfbfaf6), 0, 0.004, 0, 14);
  put(g, CYL(r * 0.965, r * 0.93, 0.014, 18, true), mat(band, { roughness: 0.45, side: THREE.DoubleSide }), 0, 0.066, 0); // the band: a ring, not a lid
  cy(g, r * 0.92, r * 0.92, 0.004, M.food(broth, { roughness: 0.15 }), 0, 0.062, 0, 18);
  g.userData.liquid = 0.064;
  return g;
}
export function bananaLeaf(w = 0.24, d = 0.18) { const g = new THREE.Group(); rb(g, w, 0.006, d, 0.04, M.leaf, 0, 0.003, 0); bx(g, w * 0.9, 0.007, 0.006, mat(0x6fa84a), 0, 0.004, 0); g.userData.top = 0.006; return g; }
export function foamBox(w = 0.16, d = 0.14) {
  const g = new THREE.Group();
  rb(g, w, 0.04, d, 0.008, M.white, 0, 0.02, 0);
  const lid = pivot(g, 0, 0.04, -d / 2);
  rb(lid, w, 0.012, d, 0.006, M.white, 0, 0.006, d / 2);
  lid.rotation.x = -1.9;
  g.userData.top = 0.04;
  return g;
}
// a drink in a plastic bag with a straw and a loop handle (how Bangkok carries iced drinks)
export function bagDrink(color = C.thaiTea) {
  const g = new THREE.Group();
  sp(g, 0.05, M.clear(color, 0.85), 0, 0.075, 0).scale.set(1, 1.5, 1);
  bits(g, BOX(0.022, 0.02, 0.022), M.clear(0xffffff, 0.6), [[0.01, 0.13, 0, 0.3, 0.2, 0], [-0.015, 0.125, 0.01, 0.1, 0.6, 0.3]]);
  cy(g, 0.012, 0.03, 0.03, M.clear(0xffffff, 0.5), 0, 0.165, 0, 8);
  cy(g, 0.004, 0.004, 0.18, M.plastic(0xd9342b), 0.012, 0.19, 0, 5).rotation.z = -0.15;
  const loop = put(g, new THREE.TorusGeometry(0.03, 0.003, 4, 12), M.clear(0xffffff, 0.7), 0, 0.2, 0);
  loop.rotation.y = Math.PI / 2;
  return g;
}
// an iced drink in a plastic cup; cream floats on top of Thai tea
export function cupDrink(color = C.thaiTea, { cream = false } = {}) {
  const g = new THREE.Group();
  put(g, CYL(0.04, 0.03, 0.12, 12, true), M.clear(0xffffff, 0.35), 0, 0.06, 0);
  cy(g, 0.037, 0.029, cream ? 0.08 : 0.1, M.food(color, { roughness: 0.2 }), 0, cream ? 0.042 : 0.052, 0, 12);
  if (cream) cy(g, 0.038, 0.037, 0.022, M.food(0xf6e8d0, { roughness: 0.2 }), 0, 0.093, 0, 12);
  bits(g, BOX(0.022, 0.02, 0.022), M.clear(0xffffff, 0.65), [[0.01, 0.108, 0.008, 0.3, 0.2, 0], [-0.012, 0.106, -0.006, 0.1, 0.6, 0.3]]);
  cy(g, 0.004, 0.004, 0.18, M.plastic(0x3a7fd0), 0.01, 0.15, 0, 5).rotation.z = -0.12;
  return g;
}
// sticky rice in a little tied plastic bag, and in a woven basket (kratip)
export function riceBag() { const g = new THREE.Group(); sp(g, 0.035, M.clear(C.sticky, 0.9), 0, 0.03, 0).scale.set(1.2, 0.8, 1); cn(g, 0.012, 0.03, M.clear(0xffffff, 0.6), 0, 0.065, 0, 6); return g; }
export function kratip() { const g = new THREE.Group(); cy(g, 0.05, 0.045, 0.09, M.food(0xc49a5a), 0, 0.045, 0, 10); cy(g, 0.055, 0.05, 0.03, M.food(0xb08850), 0, 0.1, 0, 10); return g; }
// a bamboo skewer along X with things threaded on it
export function skewer(items, { len = 0.22, color = C.brownGlaze, size = 0.022, shape = 'chunk' } = {}) {
  const g = new THREE.Group();
  cy(g, 0.0035, 0.0035, len, M.bamboo, 0, 0, 0, 4).rotation.z = Math.PI / 2;
  const geo = shape === 'ball' ? BALL(size) : shape === 'strip' ? BOX(size * 1.6, size * 0.5, size * 1.3) : BOX(size * 1.1, size * 0.9, size);
  bits(g, geo, M.shiny(color), Array.from({ length: items }, (_, i) => [len / 2 - 0.03 - i * size * 1.3, 0, 0, i * 0.7, 0, i * 0.3]));
  return g;
}

// ---------- 6.1 grilled and fried ----------
// F1 moo ping: pork skewers on the grill, a bag of sticky rice
export function moopingSkewer() { return skewer(4, { color: C.brownGlaze, size: 0.024 }); }
export function moopingDish() {
  const g = new THREE.Group();
  g.add(bananaLeaf(0.24, 0.16));
  for (let i = 0; i < 3; i++) addTo(g, moopingSkewer()).position.set(0, 0.02, -0.04 + i * 0.035);
  addTo(g, riceBag()).position.set(0.06, 0.006, 0.06);
  return g;
}
// F2 gai yang: a flattened chicken clamped in split bamboo
export function gaiYang() {
  const g = new THREE.Group();
  sp(g, 0.09, M.shiny(C.grilled), 0, 0, 0).scale.set(1, 0.25, 0.75);
  for (const s of [-1, 1]) { sp(g, 0.035, M.shiny(0x9a5428), 0.08, 0.005, s * 0.06).scale.set(1.4, 0.5, 0.7); }
  for (const z of [-0.025, 0.025]) { const b = cy(g, 0.005, 0.005, 0.42, M.bamboo, -0.05, 0.02, z, 4); b.rotation.z = Math.PI / 2; }
  return g;
}
// F3 satay: yellow skewers, peanut sauce, cucumber relish
export function satayDish() {
  const g = new THREE.Group();
  g.add(plate(0.12));
  for (let i = 0; i < 4; i++) addTo(g, skewer(3, { color: 0xd9a03a, shape: 'strip', size: 0.022 })).position.set(-0.01, 0.034, -0.05 + i * 0.03);
  const s1 = g.add(bowl(0.03, { broth: 0xb8652e, band: 0xfbfaf6 })).children.at(-1); s1.position.set(0.05, 0.02, 0.07);
  const s2 = g.add(bowl(0.03, { broth: 0xd8e8b0, band: 0xfbfaf6 })).children.at(-1); s2.position.set(-0.04, 0.02, 0.075);
  bits(g, CRUMB(), food(C.chili), [[-0.04, 0.09, 0.07], [-0.03, 0.09, 0.08], [-0.05, 0.09, 0.08]]);
  return g;
}
// F4 seafood: a salt-crusted fish with lemongrass in its mouth, river prawns, a squid
export function saltFish() {
  const g = new THREE.Group();
  sp(g, 0.1, M.food(0xf4f2ea, { roughness: 0.95 }), 0, 0.035, 0).scale.set(1, 0.35, 0.4);
  const tail = cn(g, 0.04, 0.07, M.food(0xdcd6c8), -0.12, 0.035, 0, 4); tail.rotation.z = Math.PI / 2;
  for (let i = 0; i < 3; i++) { const l = cy(g, 0.004, 0.004, 0.1, M.food(0x9fc070), 0.12 + i * 0.01, 0.04 + i * 0.004, (i - 1) * 0.01, 4); l.rotation.z = Math.PI / 2 - 0.2; }
  sp(g, 0.008, M.ink, 0.075, 0.05, 0.022);
  return g;
}
export function prawn() {
  const g = new THREE.Group();
  sp(g, 0.04, M.shiny(0xf0703a), 0.05, 0.03, 0).scale.set(1.3, 0.8, 0.8); // the head
  const body = put(g, new THREE.TorusGeometry(0.05, 0.022, 8, 12, Math.PI * 0.9), M.shiny(0xf28a4a), -0.02, 0.03, 0);
  body.rotation.set(Math.PI / 2, 0, Math.PI * 0.5);
  for (const s of [-1, 1]) { const cl = cy(g, 0.005, 0.004, 0.16, M.food(0x3a6aa0), 0.14, 0.03, s * 0.03, 4); cl.rotation.z = Math.PI / 2; cl.rotation.y = s * 0.3; }
  return g;
}
export function squid() {
  const g = new THREE.Group();
  sp(g, 0.035, M.food(0xf6ece2), 0, 0.025, 0).scale.set(2.4, 0.6, 1);
  bits(g, CYL(0.004, 0.003, 0.08, 4), M.food(0xf0d8d0), Array.from({ length: 6 }, (_, i) => [-0.12, 0.02, (i - 2.5) * 0.008, 0, 0, Math.PI / 2 + (i - 2.5) * 0.08]));
  return g;
}
export function seafoodDisplay() {
  const g = new THREE.Group();
  addTo(g, saltFish()).position.set(-0.06, 0, -0.06);
  addTo(g, prawn()).position.set(0.12, 0, 0.06);
  addTo(g, prawn()).position.set(-0.06, 0, 0.1);
  addTo(g, squid()).position.set(0.12, 0, -0.08);
  return g;
}
// F5 luk chin: meatballs on skewers (white, brown, pink) and a pot of hot oil
export function lukChin() {
  const g = new THREE.Group();
  [0xf4ede0, 0x8a5a3a, 0xf2a8a8].forEach((c, i) => addTo(g, skewer(4, { shape: 'ball', color: c, size: 0.018 })).position.set(0, 0.02, -0.04 + i * 0.04));
  return g;
}
export function fryer() {
  const g = new THREE.Group();
  put(g, CYL(0.14, 0.11, 0.1, 16, true), mat(0x2a2b30, { metalness: 0.4, side: THREE.DoubleSide }), 0, 0.05, 0);
  cy(g, 0.135, 0.135, 0.004, M.food(0xd8a040, { roughness: 0.1 }), 0, 0.085, 0, 16);
  bits(g, BALL(0.006), M.clear(0xfff2c0, 0.7), mound(12, 0.11, 0, 6, 0.09));
  return g;
}
// F6 fried things: a heap of fried chicken; a tray of fried insects (Khao San)
export function friedChicken() {
  const g = new THREE.Group();
  g.add(foamBox(0.18, 0.14));
  bits(g, SPH(0.022, 6, 4), M.food(0xc9802e), mound(16, 0.06, 0.04, 3, 0.05));
  return g;
}
export function insects() {
  const g = new THREE.Group();
  bx(g, 0.3, 0.02, 0.2, M.steel, 0, 0.01, 0);
  bits(g, BOX(0.022, 0.008, 0.008), M.shiny(0x5a3a1a), mound(70, 0.12, 0.03, 9, 0.025));
  bits(g, BOX(0.012, 0.002, 0.002), M.food(0x4a2a12), mound(60, 0.1, 0.03, 20, 0.03)); // legs
  return g;
}
// F7 roasted chestnuts in black sand, with the paddle
export function chestnutWok() {
  const g = new THREE.Group();
  const w = put(g, new THREE.SphereGeometry(0.3, 18, 8, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), mat(0x24252a, { metalness: 0.4, side: THREE.DoubleSide }), 0, 0.3, 0);
  cy(g, 0.27, 0.27, 0.02, M.food(0x1d1d20, { roughness: 1 }), 0, 0.075, 0, 18);
  bits(g, SPH(0.018, 7, 5), M.shiny(0x7a3a1a), mound(30, 0.24, 0.02, 4, 0.085));
  bits(g, CRUMB(), M.food(0x141416), mound(60, 0.25, 0.02, 5, 0.084));
  const pad = pivot(g, 0.05, 0.12, 0);
  bx(pad, 0.02, 0.08, 0.12, M.wood, 0, 0, 0);
  cy(pad, 0.008, 0.008, 0.4, M.wood, 0, 0.22, 0, 5);
  pad.rotation.z = -0.4;
  g.userData.update = (t) => { pad.rotation.y = Math.sin(t * 2) * 0.8; };
  return g;
}

// ---------- 6.2 wok and griddle ----------
// F8 pad thai: noodles, shrimp, egg, sprouts, chives, peanuts, a lime wedge
export function padThaiHeap(r = 0.08) {
  const g = new THREE.Group();
  bits(g, NOODLE(), M.shiny(C.padthai), mound(55, r, 0.04, 1));
  bits(g, SHRIMP(), M.shiny(C.shrimp), mound(4, r * 0.7, 0.045, 2, 0.01));
  bits(g, BOX(0.02, 0.006, 0.015), food(0xf2d880), mound(6, r * 0.8, 0.04, 3)); // scrambled egg
  bits(g, LEAFLET(), food(0x5a9a3a), mound(8, r * 0.9, 0.035, 5));
  return g;
}
export function padThaiDish() {
  const g = new THREE.Group();
  g.add(plate(0.12));
  addTo(g, padThaiHeap()).position.y = 0.022;
  bits(g, SPROUT(), food(C.sprout), mound(10, 0.025, 0.01, 4, 0.03).map((p) => [p[0] + 0.07, p[1], p[2] - 0.05, p[3], p[4], Math.PI / 2]));
  bits(g, CRUMB(), food(C.peanut), mound(14, 0.04, 0.01, 6, 0.07));
  put(g, WEDGE(), food(C.lime), 0.08, 0.03, 0.05);
  return g;
}
// F9 pad kaprao: rice, stir-fried pork with holy basil, a fried egg on top
export function friedEgg() {
  const g = new THREE.Group();
  cy(g, 0.05, 0.052, 0.008, M.food(C.egg, { roughness: 0.4 }), 0, 0.004, 0, 12).scale.set(1, 1, 0.85);
  bx(g, 0.07, 0.004, 0.012, food(0xd8a050), 0.0, 0.006, 0.04);
  put(g, new THREE.SphereGeometry(0.02, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.shiny(C.yolk), 0.005, 0.008, 0);
  return g;
}
export function kapraoDish() {
  const g = new THREE.Group();
  g.add(plate(0.12));
  sp(g, 0.055, food(C.rice), -0.03, 0.03, 0).scale.set(1, 0.55, 1);
  bits(g, BOX(0.012, 0.01, 0.012), M.shiny(0x7a4a2a), mound(28, 0.05, 0.02, 7, 0.024).map((p) => [p[0] + 0.045, p[1], p[2], p[3], p[4], p[5]]));
  bits(g, LEAFLET(), food(C.basil), mound(8, 0.045, 0.025, 8, 0.03).map((p) => [p[0] + 0.045, p[1], p[2], p[3], p[4], p[5]]));
  bits(g, CYL(0.005, 0.005, 0.003, 6), food(C.chili), mound(5, 0.04, 0.02, 9, 0.035).map((p) => [p[0] + 0.045, p[1], p[2]]));
  addTo(g, friedEgg()).position.set(-0.03, 0.058, 0);
  return g;
}
// F10 hoy tod: oyster omelette on the griddle and on a plate
export function hoyTod() {
  const g = new THREE.Group();
  sp(g, 0.07, M.shiny(0xe8b84a), 0, 0.006, 0).scale.set(1.2, 0.18, 1);
  bits(g, SPH(0.012, 6, 4), food(0xc9b8a8), mound(7, 0.06, 0.004, 11, 0.012));
  bits(g, LEAFLET(), food(0x5a9a3a), mound(6, 0.06, 0.004, 12, 0.016));
  return g;
}
export function hoyTodDish() {
  const g = new THREE.Group();
  g.add(plate(0.12));
  addTo(g, hoyTod()).position.set(0, 0.024, 0.01);
  bits(g, SPROUT(), food(C.sprout), mound(14, 0.04, 0.008, 13, 0.024).map((p) => [p[0] - 0.05, p[1], p[2] - 0.06, p[3], p[4], Math.PI / 2]));
  return g;
}
// F11 roti: a square folded pancake with banana, condensed milk and chocolate lines
export function roti() {
  const g = new THREE.Group();
  bx(g, 0.2, 0.004, 0.2, food(0xfbf7ee), 0, 0.002, 0); // paper
  rb(g, 0.13, 0.016, 0.13, 0.01, M.shiny(0xe8b860), 0, 0.012, 0);
  bits(g, BOX(0.025, 0.01, 0.025), food(0xf6e08a), mound(9, 0.05, 0, 14, 0.022));
  const zig = (c, dz) => bits(g, BOX(0.03, 0.003, 0.004), M.shiny(c), Array.from({ length: 6 }, (_, i) => [-0.06 + i * 0.024, 0.028, dz + (i % 2 ? 0.01 : -0.01), 0, i % 2 ? 0.7 : -0.7, 0]));
  zig(0xfbf7ee, -0.03); zig(0x5a3018, 0.025);
  return g;
}
// F12 khanom krok: a cast-iron pan of little coconut cups
export function khanomKrok({ rows = 3, cols = 6 } = {}) {
  const g = new THREE.Group();
  const w = cols * 0.06 + 0.03, d = rows * 0.06 + 0.03;
  bx(g, w, 0.04, d, M.iron, 0, 0.02, 0);
  const pts = [], tops = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const x = -w / 2 + 0.045 + i * 0.06, z = -d / 2 + 0.045 + j * 0.06; pts.push([x, 0.042, z]); if ((i + j) % 3) tops.push([x + 0.006, 0.05, z]); }
  bits(g, once('krok', () => new THREE.SphereGeometry(0.024, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), food(0xf6eedc), pts);
  bits(g, CRUMB(), food(0x5a9a3a), tops);
  addTo(g, puffs('steam', { n: 3, rise: 0.35, size: 0.16, spread: w * 0.6, seed: 12 })).position.y = 0.05;
  return liveAll(g);
}

// ---------- 6.3 rice, noodles, soups ----------
// F13 khao man gai: poached chickens hanging in the case, and the plate
export function hangingChicken() {
  const g = new THREE.Group();
  cy(g, 0.003, 0.003, 0.06, M.steel, 0, -0.03, 0, 4);
  sp(g, 0.055, M.shiny(0xf2e0b0), 0, -0.11, 0).scale.set(0.8, 1.2, 0.7);
  for (const s of [-1, 1]) sp(g, 0.022, M.shiny(0xeed8a8), 0.02, -0.17, s * 0.025).scale.set(1, 1.6, 1);
  return g;
}
// poached chickens on a steel rail, as they hang in the cart's glass case
export function chickenRail(n = 3) {
  const g = new THREE.Group();
  const h = 0.36;
  const bar = cy(g, 0.006, 0.006, n * 0.13 + 0.06, M.steel, 0, h, 0, 6); bar.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) cy(g, 0.006, 0.006, h, M.steel, s * (n * 0.065 + 0.03), h / 2, 0, 6);
  for (let i = 0; i < n; i++) addTo(g, hangingChicken()).position.set((i - (n - 1) / 2) * 0.13, h, 0);
  return g;
}
export function khaoManGaiDish() {
  const g = new THREE.Group();
  g.add(plate(0.12));
  sp(g, 0.06, food(0xf6eed0), -0.02, 0.028, 0).scale.set(1, 0.55, 1);
  bits(g, BOX(0.06, 0.012, 0.02), M.shiny(C.chicken), Array.from({ length: 5 }, (_, i) => [0.035, 0.05 + i * 0.002, -0.04 + i * 0.02, 0, 0.2, 0.15]));
  bits(g, CYL(0.012, 0.012, 0.004, 8), food(0x9fd07a), [[0.07, 0.026, 0.06, 0, 0, 0.2], [0.08, 0.028, 0.045, 0, 0, 0.2], [0.06, 0.03, 0.075, 0, 0, 0.2]]);
  const sauce = cy(g, 0.022, 0.016, 0.02, M.plastic(0xfbfaf6), -0.09, 0.034, 0.07, 10);
  cy(sauce, 0.02, 0.02, 0.004, food(0x5a3a1a), 0, 0.008, 0, 10);
  return g;
}
// F14 khao kha moo: braised pork leg, halved eggs, pickled greens
export function porkLeg() { const g = new THREE.Group(); sp(g, 0.09, M.shiny(C.pork), 0, 0.06, 0).scale.set(1.5, 0.75, 0.8); cy(g, 0.025, 0.03, 0.08, M.shiny(0x5a2a16), 0.15, 0.06, 0, 8).rotation.z = Math.PI / 2; return g; }
export function khaoKhaMooDish() {
  const g = new THREE.Group();
  g.add(plate(0.12));
  sp(g, 0.055, food(C.rice), -0.03, 0.028, 0).scale.set(1, 0.55, 1);
  bits(g, BOX(0.04, 0.012, 0.025), M.shiny(C.pork), mound(6, 0.04, 0.012, 15, 0.034).map((p) => [p[0] + 0.045, p[1], p[2], p[3] * 0.2, p[4], p[5] * 0.2]));
  for (const z of [-0.06, -0.03]) { const e = put(g, new THREE.SphereGeometry(0.018, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.shiny(0x8a5a2a), 0.06, 0.024, z); put(e, CYL(0.009, 0.009, 0.002, 8), food(C.yolk), 0, 0.001, 0); }
  bits(g, LEAFLET(), food(0x7a9a3a), mound(7, 0.03, 0.01, 16, 0.025).map((p) => [p[0] - 0.06, p[1], p[2] + 0.06, p[3], p[4], p[5]]));
  return g;
}
// F15 kuay tiew: noodle soup; noodle bundles for the shelf
export function noodleSoup({ broth = C.broth, noodle = C.noodle } = {}) {
  const g = new THREE.Group();
  g.add(bowl(0.09, { broth }));
  bits(g, THIN(), M.food(noodle, { roughness: 0.4 }), mound(16, 0.06, 0.01, 17, 0.064));
  bits(g, BALL(0.014), food(0xd8c8b8), [[0.03, 0.07, 0.02], [-0.03, 0.07, 0.03], [0.0, 0.07, -0.035]]);
  bits(g, SPROUT(), food(C.sprout), mound(8, 0.05, 0.004, 18, 0.07).map((p) => [p[0], p[1], p[2], p[3], p[4], Math.PI / 2]));
  bits(g, CYL(0.004, 0.004, 0.003, 6), food(0x6fae4a), mound(14, 0.06, 0.004, 19, 0.072)); // spring onion
  return g;
}
export function noodleBundles() {
  const g = new THREE.Group();
  [[0xf6eedc, -0.12], [0xf2d870, 0], [0xe8e2d0, 0.12]].forEach(([c, x]) => {
    const b = group(g, x, 0, 0);
    bits(b, THIN(), M.food(c, { roughness: 0.45 }), mound(18, 0.045, 0.03, Math.round(x * 100) + 30));
  });
  return g;
}
// F16 kuay jub: peppery broth with rolled noodles and crispy pork
export function kuayJub() {
  const g = new THREE.Group();
  g.add(bowl(0.09, { broth: 0x9a6a3a, band: 0x3a7fd0 }));
  bits(g, once('roll', () => new THREE.TorusGeometry(0.012, 0.005, 5, 8, Math.PI * 1.6)), food(0xf6f0e2), mound(9, 0.06, 0.004, 21, 0.066));
  bits(g, BOX(0.025, 0.012, 0.02), M.shiny(0xc98a4a), [[0.03, 0.072, -0.02, 0, 0.4, 0], [-0.025, 0.072, 0.03, 0, 1.1, 0]]);
  bits(g, CRUMB(), M.ink, mound(10, 0.06, 0.002, 22, 0.068));
  return g;
}
// F17 tom yum goong in a hot pot with a chimney
export function tomYum() {
  const g = new THREE.Group();
  put(g, new THREE.TorusGeometry(0.1, 0.035, 8, 18), mat(0xc9ccd1, { metalness: 0.6 }), 0, 0.05, 0).rotation.x = Math.PI / 2;
  cy(g, 0.1, 0.07, 0.05, M.steel, 0, 0.025, 0, 16);
  cy(g, 0.12, 0.12, 0.004, M.food(C.tomyum, { roughness: 0.15 }), 0, 0.075, 0, 18);
  cy(g, 0.035, 0.04, 0.14, M.steel, 0, 0.12, 0, 10);
  bits(g, SHRIMP(), M.shiny(C.shrimp), [[0.08, 0.08, 0.02, 1.4, 0, 0], [-0.07, 0.08, 0.05, 1.4, 1, 0], [0.02, 0.08, -0.09, 1.4, 2, 0]]);
  bits(g, SPH(0.012, 6, 4), food(0xd8c8a8), [[0.06, 0.078, -0.06], [-0.08, 0.078, -0.03], [-0.03, 0.078, 0.09]]);
  bits(g, LEAFLET(), food(0x4f8a3a), mound(10, 0.11, 0.003, 23, 0.078));
  addTo(g, puffs('steam', { n: 4, rise: 0.4, size: 0.16, spread: 0.14, seed: 24 })).position.y = 0.1;
  return liveAll(g);
}
// F18 som tam: the wooden mortar and pestle; the plate with sticky rice
export function mortar() {
  const g = new THREE.Group();
  put(g, CYL(0.09, 0.06, 0.16, 14, true), mat(0x9a6a3a, { roughness: 0.85, side: THREE.DoubleSide }), 0, 0.08, 0);
  cy(g, 0.06, 0.06, 0.01, M.wood, 0, 0.005, 0, 12);
  bits(g, BOX(0.03, 0.003, 0.004), food(C.papaya), mound(20, 0.07, 0.01, 25, 0.13));
  const pestle = pivot(g, 0.02, 0.14, 0);
  cy(pestle, 0.015, 0.025, 0.24, M.wood, 0, 0.1, 0, 8);
  pestle.rotation.z = 0.25;
  g.userData.update = (t) => { pestle.position.y = 0.14 + Math.max(0, Math.sin(t * 7)) * 0.08; };
  return g;
}
export function somTamDish() {
  const g = new THREE.Group();
  g.add(plate(0.12));
  bits(g, BOX(0.045, 0.004, 0.005), food(C.papaya), mound(60, 0.07, 0.035, 26, 0.024));
  bits(g, once('tomato', () => new THREE.SphereGeometry(0.016, 8, 6, 0, Math.PI)), M.shiny(0xe8403a), mound(4, 0.06, 0.03, 27, 0.03));
  bits(g, CYL(0.005, 0.005, 0.05, 5), food(0x4f8a3a), mound(4, 0.06, 0.02, 28, 0.035).map((p) => [p[0], p[1], p[2], 0, p[4], Math.PI / 2]));
  bits(g, CRUMB(), food(C.peanut), mound(12, 0.05, 0.03, 29, 0.04));
  addTo(g, kratip()).position.set(0.15, 0, 0.02);
  return g;
}

// ---------- 6.4 sweets, fruit, drinks ----------
// F19 mango sticky rice; a heap of mangoes for the stall
export function mango(ripe = true) { const g = new THREE.Group(); sp(g, 0.045, M.shiny(ripe ? 0xf6b93a : 0x9fc04a), 0, 0.035, 0).scale.set(1.35, 0.8, 0.95); cy(g, 0.003, 0.003, 0.012, M.food(0x4a3a2a), 0.06, 0.06, 0, 4); return g; }
export function mangoPile() {
  const g = new THREE.Group();
  const rnd = rng(30);
  for (let i = 0; i < 14; i++) { const m = g.add(mango(rnd() > 0.15)).children.at(-1); const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 0.15; m.position.set(Math.cos(a) * d, (0.15 - d) * 0.5, Math.sin(a) * d); m.rotation.y = rnd() * 6; }
  return g;
}
export function mangoStickyRice() {
  const g = new THREE.Group();
  g.add(plate(0.12));
  sp(g, 0.055, food(0xf6f1e4), -0.035, 0.03, 0).scale.set(1, 0.55, 1.2);
  bits(g, once('slice', () => new THREE.SphereGeometry(0.03, 10, 6, 0, Math.PI, 0, Math.PI / 2)), M.shiny(C.mango), Array.from({ length: 4 }, (_, i) => [0.04, 0.024, -0.05 + i * 0.033, 0, Math.PI / 2, 0]));
  sp(g, 0.03, M.shiny(0xf8f4e8), -0.035, 0.05, 0).scale.set(1.3, 0.2, 1.4); // coconut cream
  bits(g, CRUMB(), food(0xe8c84a), mound(14, 0.03, 0.005, 31, 0.058).map((p) => [p[0] - 0.035, p[1], p[2]]));
  return g;
}
// F20 the fruit cart: fruit sticks on ice; a bag of cut fruit with a skewer
export function fruitStick(c, rind = null) {
  const g = new THREE.Group();
  bx(g, 0.11, 0.035, 0.035, M.shiny(c), 0, 0.018, 0);
  if (rind) bx(g, 0.11, 0.012, 0.036, M.food(rind), 0, 0.006, 0);
  return g;
}
export const FRUITS = [[C.watermelon, 0x4f8a3a], [C.pineapple, null], [C.guava, 0x9fc06a], [C.papayaRipe, null]];
export function fruitRows(ice) {
  const g = new THREE.Group();
  FRUITS.forEach(([c, r], i) => { for (let k = 0; k < 6; k++) addTo(g, fruitStick(c, r)).position.set(-0.2 + i * 0.13, ice + 0.002, -0.12 + k * 0.045); }); // a row of each fruit, side by side
  return g;
}
export function fruitBag() {
  const g = new THREE.Group();
  sp(g, 0.05, M.clear(0xffffff, 0.45), 0, 0.06, 0).scale.set(1, 1.4, 0.8);
  bits(g, BOX(0.03, 0.02, 0.02), M.shiny(C.watermelon), mound(4, 0.025, 0.04, 32, 0.03));
  bits(g, BOX(0.03, 0.02, 0.02), M.shiny(C.pineapple), mound(4, 0.025, 0.04, 33, 0.05));
  cy(g, 0.003, 0.003, 0.16, M.bamboo, 0.01, 0.12, 0, 4).rotation.z = -0.2;
  return g;
}
// F21 coconuts: green, the top cut off, a straw; coconut ice cream in a half shell
export function coconut(cut = true) {
  const g = new THREE.Group();
  sp(g, 0.07, M.food(0x6fa83a, { roughness: 0.6 }), 0, 0.065, 0).scale.set(1, 1.05, 1);
  if (cut) {
    cn(g, 0.05, 0.05, M.food(0xf6f0dc), 0, 0.14, 0, 8);
    cy(g, 0.003, 0.003, 0.12, M.plastic(0xd9342b), 0.01, 0.2, 0, 5).rotation.z = -0.2;
  }
  return g;
}
export function coconutPile() { const g = new THREE.Group(); const rnd = rng(34); for (let i = 0; i < 9; i++) { const c = g.add(coconut(i === 0)).children.at(-1); const a = (i / 8) * 6.28; c.position.set(i ? Math.cos(a) * 0.13 : 0, i ? 0 : 0.08, i ? Math.sin(a) * 0.13 : 0); c.rotation.z = (rnd() - 0.5) * 0.4; } return g; }
export function coconutIceCream() {
  const g = new THREE.Group();
  put(g, new THREE.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x8a5a2a, { side: THREE.DoubleSide, roughness: 0.9 }), 0, 0.07, 0);
  cy(g, 0.066, 0.066, 0.004, food(0xf6f0dc), 0, 0.068, 0, 14);
  bits(g, SPH(0.03, 10, 7), food(0xfaf6ec), [[0.02, 0.085, 0.01], [-0.025, 0.082, -0.012]]);
  bits(g, CRUMB(), food(C.peanut), mound(8, 0.04, 0.02, 35, 0.1));
  bits(g, BOX(0.012, 0.008, 0.012), food(0xf2c84a), [[0.0, 0.11, 0.0], [0.01, 0.105, -0.02]]); // jackfruit, corn
  return g;
}
// F22 durian: spiky; an opened tray of yellow lobes
export function durian() {
  const g = new THREE.Group();
  const body = sp(g, 0.11, M.food(0x8aa83a, { roughness: 0.8 }), 0, 0.1, 0); body.scale.set(1, 1.15, 0.95);
  const ico = new THREE.IcosahedronGeometry(0.11, 1);
  const p = ico.attributes.position, seen = new Set(), pts = [];
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = v.toArray().map((n) => n.toFixed(3)).join(); if (seen.has(k)) continue; seen.add(k); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); const e = new THREE.Euler().setFromQuaternion(q); pts.push([v.x, 0.1 + v.y * 1.15, v.z * 0.95, e.x, e.y, e.z]); }
  bits(g, CONE(0.014, 0.035, 4), M.food(0x7a9a2e), pts);
  cy(g, 0.012, 0.015, 0.05, M.food(0x6b5a3a), 0, 0.24, 0, 6);
  return g;
}
export function durianTray() {
  const g = new THREE.Group();
  bx(g, 0.18, 0.01, 0.12, M.white, 0, 0.005, 0);
  bits(g, SPH(0.035, 10, 7), M.shiny(0xf2d060), [[-0.045, 0.03, 0], [0.04, 0.03, 0.005, 0, 0.4, 0]]);
  put(g, BOX(0.18, 0.004, 0.12), M.clear(0xffffff, 0.3), 0, 0.07, 0);
  return g;
}
// F23–24 iced drinks: Thai tea (orange, cream on top), pink milk
export const thaiTeaCup = () => cupDrink(C.thaiTea, { cream: true });
export const thaiTeaBag = () => bagDrink(C.thaiTea);
export const pinkMilk = () => cupDrink(C.pink);
// the vendor pours tea from high up into the cup: a long orange stream
export function teaPour() {
  const g = new THREE.Group();
  const jug = cy(g, 0.04, 0.035, 0.1, M.steel, 0.02, 0.4, 0, 10);
  cy(jug, 0.004, 0.004, 0.08, M.steel, 0.04, 0.05, 0, 4).rotation.z = -0.8;
  const stream = cy(g, 0.006, 0.004, 0.28, M.clear(C.thaiTea, 0.85), 0.0, 0.22, 0, 5);
  addTo(g, cupDrink(C.thaiTea)).position.set(0, 0, 0);
  g.userData.update = (t) => { stream.scale.y = 0.85 + Math.sin(t * 9) * 0.1; };
  return g;
}
// F25 Thai sweets: a tray of small colourful pieces (layered khanom chan, pink balls, golden threads)
export function thaiSweets() {
  const g = new THREE.Group();
  bx(g, 0.3, 0.012, 0.2, M.plastic(0xd9342b), 0, 0.006, 0);
  const pts = (n, i0) => Array.from({ length: n }, (_, i) => [-0.12 + (i % 5) * 0.06, 0.025, -0.07 + i0 * 0.07]);
  bits(g, BOX(0.04, 0.03, 0.04), food(0x7fc08a), pts(5, 0));
  bits(g, BOX(0.041, 0.008, 0.041), food(0xf6f0e2), pts(5, 0).map(([x, y, z]) => [x, y + 0.005, z]));
  bits(g, BALL(0.018), M.shiny(0xf2a0b8), pts(5, 1));
  bits(g, once('thread', () => new THREE.TorusGeometry(0.015, 0.006, 5, 10)), M.shiny(0xf2c03a), pts(5, 2).map(([x, y, z]) => [x, y - 0.008, z, Math.PI / 2, 0, 0]));
  return g;
}
// F26 bird's nest and herbal drinks: rows of little bottles (Yaowarat)
export function nestBottles() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) pts.push([-0.15 + i * 0.06, 0.04, -0.06 + j * 0.06]);
  bits(g, CYL(0.022, 0.022, 0.08, 10), M.clear(0xf6e8c8, 0.75), pts);
  bits(g, CYL(0.023, 0.023, 0.015, 10), M.plastic(0xe8b64a), pts.map(([x, , z]) => [x, 0.088, z]));
  bits(g, BOX(0.045, 0.03, 0.002), M.plastic(0xd9342b), pts.map(([x, , z]) => [x, 0.045, z + 0.023]));
  return g;
}

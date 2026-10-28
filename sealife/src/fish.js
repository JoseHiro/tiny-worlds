// Fish (DESIGN.md §2.3) beyond the reference blue tang.
// Stripes and bands are thin slices standing proud of the body (bands()); fin edges are a slightly bigger,
// thinner fin of the edge colour behind the fin (rimmed()), so patterns read from far away.
import * as THREE from 'three';
import { part, assemble, ellipsoid, fin, body, eyes, countershade, bands, spotsOn, seeded, tube } from './kit.js';

const L2 = (ja, en) => ({ ja, en });

// a fin with an edge: the edge colour is the same outline grown by `grow`, thinner, behind
function rimmed(pts, color, rim, t, grow, opts) {
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const big = pts.map(([x, y]) => [cx + (x - cx) * (1 + grow), cy + (y - cy) * (1 + grow)]);
  return [part(fin(big, t * 0.6), rim, opts), part(fin(pts, t), color, opts)];
}
const pair = (geo, color, [x, y, z], rot = [0, 0, 0]) => [
  part(geo, color, { pos: [x, y, z], rot }),
  part(geo, color, { pos: [x, y, -z], rot: [-rot[0], -rot[1], rot[2]] }),
];
// radius of a body() profile [[r, x], ...] at x, once it is translated by `shift`
const radiusAt = (prof, shift) => (x) => {
  const y = x - shift;
  for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) {
    const [r0, y0] = prof[i - 1], [r1, y1] = prof[i];
    return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return 0;
};
const pectoral = (L, color, x, y, z) => pair(fin([[0, 0], [-0.16 * L, 0.06 * L], [-0.13 * L, -0.04 * L]], 0.012 * L), color, [x, y, z], [0, 0.35, 0]);

// ---------- カクレクマノミ (clownfish) ----------
export function clownfish() {
  const L = 0.25, rx = 0.115, ry = 0.068, rz = 0.04;
  const orange = '#f26b1d', white = '#fbfaf5', black = '#16171c';
  const parts = [
    part(ellipsoid(rx, ry, rz, 20), orange),
    ...bands(rx, ry, rz, [[0.06, 0.03, black, 1.05], [0.06, 0.02, white, 1.08], [-0.005, 0.034, black, 1.05], [-0.005, 0.024, white, 1.08], [-0.085, 0.026, black, 1.1], [-0.085, 0.016, white, 1.14]]),
    ...rimmed([[0.04, 0], [0.02, 0.05], [-0.05, 0.05], [-0.09, 0.02], [-0.09, 0]], orange, black, 0.01, 0.08, { pos: [0, ry * 0.8, 0] }), // dorsal
    ...rimmed([[0.01, 0], [-0.04, -0.035], [-0.075, -0.02], [-0.07, 0]], orange, black, 0.01, 0.1, { pos: [-0.01, -ry * 0.8, 0] }), // anal
    ...rimmed([[0, 0], [-0.07, 0.055], [-0.085, 0], [-0.07, -0.055]], orange, black, 0.01, 0.07, { pos: [-0.1, 0, 0] }), // round tail
    ...pectoral(L, orange, 0.03, -0.02, rz * 0.8),
    ...eyes(0.075, 0.018, 0.033, 0.011),
  ];
  return {
    id: 'clownfish', name: L2('カクレクマノミ', 'Clownfish'), size: L, habitat: ['reef'], water: ['tropical'],
    note: '0.25 · 丸っこい体、丸いひれ · オレンジに白い帯3本（黒い縁取り）· イソギンチャクから離れない家族',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.035, freq: 8, waves: 0.5, nose: rx, len: L },
  };
}

// ---------- チョウチョウウオ (butterflyfish) ----------
export function butterflyfish() {
  const L = 0.35, rx = 0.13, ry = 0.115, rz = 0.032;
  const yellow = '#f6c93a', black = '#18191e';
  const parts = [
    part(ellipsoid(rx, ry, rz, 20), (p) => (p.y > 0.06 && p.x < -0.02 ? '#efb52a' : yellow)),
    part(ellipsoid(0.05, 0.022, 0.018), yellow, { pos: [0.14, -0.01, 0] }), // pointed snout
    ...bands(rx, ry, rz, [[0.085, 0.028, black, 1.05]]), // the band that hides the eye
    ...rimmed([[0.06, 0], [0.0, 0.07], [-0.12, 0.05], [-0.15, 0.0]], yellow, black, 0.008, 0.04, { pos: [0, ry * 0.75, 0] }),
    ...rimmed([[0.02, 0], [-0.1, -0.06], [-0.15, -0.01]], yellow, black, 0.008, 0.04, { pos: [0, -ry * 0.75, 0] }),
    part(fin([[0, 0], [-0.07, 0.05], [-0.075, -0.05]], 0.008), '#f2e7c2', { pos: [-0.13, 0, 0] }), // pale tail
    part(ellipsoid(0.02, 0.02, rz * 0.7), black, { pos: [-0.1, 0.07, 0] }), // the false eye-spot near the tail
    ...pectoral(L, '#f2e7c2', 0.04, -0.02, rz * 0.9),
    ...eyes(0.085, 0.035, 0.03, 0.01),
  ];
  return {
    id: 'butterflyfish', name: L2('チョウチョウウオ', 'Butterflyfish'), size: L, habitat: ['reef'], water: ['tropical'],
    note: '0.35 · 円盤形、口先がとがる · 黄に黒い帯（目を隠す）と尾の近くの目玉模様 · ペアでサンゴをつつく',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.03, freq: 6, waves: 0.5, nose: 0.17, len: L },
  };
}

// ---------- ツノダシ (Moorish idol) ----------
export function moorishIdol() {
  const L = 0.4, rx = 0.12, ry = 0.13, rz = 0.028;
  const white = '#f6f3e8', black = '#17181c', yellow = '#f4c63c';
  const parts = [
    part(ellipsoid(rx, ry, rz, 20), (p) => (p.x < -0.04 && p.y > -0.02 ? yellow : white)),
    part(ellipsoid(0.06, 0.02, 0.016), '#e8b884', { pos: [0.14, -0.02, 0] }), // tube snout
    part(ellipsoid(0.015, 0.012, 0.012, 8), black, { pos: [0.198, -0.02, 0] }),
    ...bands(rx, ry, rz, [[0.045, 0.06, black, 1.05], [-0.075, 0.035, black, 1.05]]),
    part(fin([[0.04, 0], [-0.02, 0.12], [-0.2, 0.22], [-0.24, 0.215], [-0.06, 0.08], [-0.04, 0]], 0.008), white, { pos: [0, ry * 0.7, 0] }), // the long trailing banner
    part(fin([[0.02, 0], [-0.08, -0.08], [-0.1, -0.06], [-0.07, 0]], 0.008), black, { pos: [0, -ry * 0.75, 0] }),
    part(fin([[0, 0], [-0.06, 0.05], [-0.05, 0], [-0.06, -0.05]], 0.008), black, { pos: [-0.115, 0, 0] }),
    part(ellipsoid(0.012, 0.012, 0.03, 6), yellow, { pos: [0.12, 0.0, 0] }), // the yellow saddle on the snout
    ...eyes(0.07, 0.03, 0.025, 0.01),
  ];
  return {
    id: 'moorishIdol', name: L2('ツノダシ', 'Moorish idol'), size: L, habitat: ['reef'], water: ['tropical'],
    note: '0.4 · 円盤形、背びれが長く伸びる · 白・黒・黄の縦帯 · 2〜3匹でゆったり',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.03, freq: 4.5, waves: 0.5, nose: 0.19, len: L },
  };
}

// ---------- ブダイ (parrotfish) ----------
export function parrotfish() {
  const L = 0.7;
  const green = new THREE.Color('#2aa597'), pink = new THREE.Color('#e88aa8'), c = new THREE.Color();
  const torso = body([[0, 0], [0.04, 0.03], [0.1, 0.12], [0.15, 0.3], [0.155, 0.42], [0.13, 0.55], [0.08, 0.62], [0, 0.64]], 18).translate(-0.3, 0, 0).scale(1, 1.05, 0.68);
  const mottled = (p) => c.copy(green).lerp(pink, THREE.MathUtils.smoothstep(Math.sin(p.x * 31 + p.y * 17) * Math.sin(p.y * 23 - p.z * 9) + 0.15, 0, 0.5) * 0.85);
  const parts = [
    part(torso, mottled),
    part(ellipsoid(0.05, 0.04, 0.04), '#cfe9e0', { pos: [0.31, -0.015, 0] }), // the beak
    part(new THREE.BoxGeometry(0.02, 0.006, 0.07), '#2b3a3a', { pos: [0.355, -0.015, 0] }),
    part(fin([[0.08, 0], [-0.34, 0], [-0.32, 0.05], [0.06, 0.05]], 0.012), '#3c7fb0', { pos: [-0.02, 0.13, 0] }),
    part(fin([[0.0, 0], [-0.2, 0], [-0.2, -0.05], [-0.02, -0.04]], 0.012), '#3c7fb0', { pos: [-0.05, -0.13, 0] }),
    part(fin([[0.02, 0], [-0.1, 0.11], [-0.07, 0.0], [-0.1, -0.11]], 0.014), '#3c7fb0', { pos: [-0.32, 0, 0] }), // lyre tail
    ...pectoral(L, '#77c9bd', 0.12, -0.02, 0.07),
    ...eyes(0.23, 0.04, 0.062, 0.014),
  ];
  return {
    id: 'parrotfish', name: L2('ブダイ', 'Parrotfish'), size: L, habitat: ['reef'], water: ['tropical'],
    note: '0.7 · ずんぐり、くちばし状の口 · 青緑とピンクのまだら · サンゴをかじる（白い砂が出る）',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.05, freq: 3.5, waves: 0.5, nose: 0.34, len: L },
  };
}

// ---------- デバスズメダイ / ルリスズメダイ (damselfish) ----------
function damsel({ id, ja, en, color, tail, note }) {
  const L = 0.18, rx = 0.08, ry = 0.05, rz = 0.022;
  const parts = [
    part(ellipsoid(rx, ry, rz, 14), color),
    part(fin([[0.04, 0.01], [-0.075, -0.01], [-0.08, 0.035], [0.02, 0.045]], 0.006), color, { pos: [0, ry * 0.6, 0] }),
    part(fin([[0.0, 0.005], [-0.065, 0.0], [-0.065, -0.035]], 0.006), color, { pos: [0, -ry * 0.6, 0] }),
    part(fin([[0, 0], [-0.05, 0.035], [-0.035, 0], [-0.05, -0.035]], 0.006), tail, { pos: [-0.075, 0, 0] }),
    ...eyes(0.05, 0.012, 0.018, 0.008),
  ];
  return {
    id, name: L2(ja, en), size: L, habitat: ['reef'], water: ['tropical'], note,
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.02, freq: 11, waves: 0.5, nose: rx, len: L },
  };
}
export const damselGreen = () => damsel({ id: 'damselGreen', ja: 'デバスズメダイ', en: 'Blue-green chromis', color: '#8ee3e6', tail: '#9fe8e2', note: '0.18 · 小さな楕円 · 水色 · 枝サンゴの上に群れ、近づくとサンゴに逃げ込む' });
export const damselBlue = () => damsel({ id: 'damselBlue', ja: 'ルリスズメダイ', en: 'Sapphire devil', color: '#2f6ee8', tail: '#f2c94c', note: '0.18 · 小さな楕円 · 瑠璃色、尾は黄（オス）· サンゴの近くで小さな群れ' });

// ---------- ハリセンボン (porcupinefish) ----------
export function porcupinefish() {
  const L = 0.5, r = 0.17;
  const parts = [
    part(ellipsoid(r * 1.25, r, r * 0.95, 18), countershade('#c9a86a', '#f1ead6', -0.04, 0.03)),
    ...spotsOn(r * 1.25, r, r * 0.95, 26, '#3a2e22', { r: 0.018, seed: 9, keep: (x, y) => y > -0.03 }),
    part(fin([[0, 0], [-0.1, 0.07], [-0.08, 0], [-0.1, -0.07]], 0.01), '#c9a86a', { pos: [-0.2, 0, 0] }),
    ...pair(fin([[0, 0], [-0.06, 0.05], [-0.05, -0.04]], 0.01), '#d9c08a', [0.05, -0.02, r * 0.9], [0, 0.3, 0]),
    ...eyes(0.13, 0.06, 0.1, 0.03), // big eyes (its look)
  ];
  // spines lying back along the body (they stand up when it puffs)
  const rnd = seeded(4);
  for (let i = 0; i < 46; i++) {
    const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1);
    const x = Math.cos(u) * Math.sin(v) * r * 1.25, y = Math.cos(v) * r, z = Math.sin(u) * Math.sin(v) * r * 0.95;
    if (x > 0.15) continue;
    parts.push(part(new THREE.ConeGeometry(0.008, 0.06, 4).rotateZ(Math.PI / 2 + 0.25), '#e8ddc0', { pos: [x - 0.015, y * 1.02, z * 1.02], rot: [Math.atan2(z, y) * 0, 0, 0] }));
  }
  return {
    id: 'porcupinefish', name: L2('ハリセンボン', 'Porcupinefish'), size: L, habitat: ['reef'], water: ['tropical'],
    note: '0.5 · 丸い体、寝ているとげ · 黄土色に黒い斑点、大きな目 · ゆっくり泳ぐ。驚くとふくらむ',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.025, freq: 5, waves: 0.4, nose: 0.2, len: L },
  };
}

// ---------- ハタ (grouper) ----------
export function grouper() {
  const L = 0.8;
  const prof = [[0, 0], [0.05, 0.04], [0.1, 0.14], [0.16, 0.35], [0.17, 0.5], [0.15, 0.62], [0.1, 0.7], [0, 0.74]];
  const torso = body(prof, 18).translate(-0.36, 0, 0).scale(1, 1, 0.75);
  const rad = radiusAt(prof, -0.36);
  const parts = [
    part(torso, countershade('#a5452f', '#d58a6c', -0.04, 0.06)),
    part(ellipsoid(0.1, 0.035, 0.09), '#97402c', { pos: [0.3, -0.07, 0] }), // big lower jaw
    part(fin([[0.1, 0], [-0.34, 0], [-0.32, 0.07], [0.06, 0.06]], 0.014), '#8f3a28', { pos: [-0.02, 0.15, 0] }),
    part(fin([[0.0, 0], [-0.2, 0], [-0.2, -0.07]], 0.014), '#8f3a28', { pos: [-0.08, -0.14, 0] }),
    part(fin([[0.02, 0], [-0.1, 0.1], [-0.13, 0], [-0.1, -0.1]], 0.016), '#8f3a28', { pos: [-0.36, 0, 0] }), // rounded tail
    ...pectoral(L, '#b8573c', 0.12, -0.03, 0.1),
    ...eyes(0.27, 0.06, 0.07, 0.014),
  ];
  const rnd = seeded(13);
  for (let i = 0; i < 60; i++) {
    const x = -0.28 + rnd() * 0.56, th = (rnd() - 0.5) * 3.4;
    const rr = rad(x);
    if (rr < 0.05) continue;
    parts.push(part(ellipsoid(0.013, 0.013, 0.013, 6), '#f3e9dd', { pos: [x, Math.cos(th) * rr * 0.99, Math.sin(th) * rr * 0.75 * 0.99] }));
  }
  return {
    id: 'grouper', name: L2('ハタ', 'Grouper'), size: L, habitat: ['reef', 'rock'], water: ['tropical', 'temperate'],
    note: '0.8 · 大きな口、がっしり · 赤茶に白い斑点 · 岩の陰にじっとしている',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.05, freq: 2.5, waves: 0.5, nose: 0.38, len: L },
  };
}

// ---------- ウツボ (moray eel) ----------
export function moray() {
  const L = 1.1;
  const brown = new THREE.Color('#6b4f22'), yellow = new THREE.Color('#d8b84a'), c = new THREE.Color();
  const net = (p) => c.copy(brown).lerp(yellow, THREE.MathUtils.smoothstep(Math.abs(Math.sin(p.x * 46 + p.y * 30)) * Math.abs(Math.sin(p.x * 30 - p.z * 40)), 0.55, 0.8));
  const prof = [[0, 0], [0.012, 0.08], [0.035, 0.35], [0.05, 0.7], [0.055, 0.9], [0.05, 1.0], [0.03, 1.06], [0, 1.1]];
  const torso = body(prof, 12).translate(-0.55, 0, 0).scale(1, 1.15, 0.8);
  const rad = radiusAt(prof, -0.55);
  const ridge = [];
  for (let x = -0.52; x <= 0.36; x += 0.08) ridge.push([x, rad(x) * 1.15 + 0.004, 0]);
  const parts = [
    part(torso, net),
    part(tube(ridge, 0.006, 0.014, 4), '#5b431c'), // the fin ridge along the back
    part(ellipsoid(0.06, 0.015, 0.035), '#5b431c', { pos: [0.48, -0.04, 0], rot: [0, 0, -0.25] }), // open lower jaw
    part(ellipsoid(0.05, 0.02, 0.04), '#a8323a', { pos: [0.47, -0.02, 0] }), // inside of the mouth
    ...eyes(0.49, 0.035, 0.035, 0.009),
  ];
  return {
    id: 'moray', name: L2('ウツボ', 'Moray eel'), size: L, habitat: ['rock', 'reef'], water: ['tropical', 'temperate'],
    note: '1.1 · 細長い体、口を開け閉め · 茶に黄の網目 · 岩の穴から顔だけ出す。近づくと引っ込む',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.12, freq: 2.2, waves: 1.3, nose: 0.55, len: L },
  };
}

// ---------- チンアナゴ (garden eel) — stands up out of the sand, origin at the sand line ----------
export function gardenEel() {
  const L = 0.5;
  const rnd = seeded(8);
  const parts = [
    ...Array.from({ length: 14 }, (_, i) => { const a = rnd() * 6.28, y = 0.04 + i * 0.026; return part(ellipsoid(0.006, 0.006, 0.006, 5), '#202227', { pos: [Math.cos(a) * 0.012 + (y > 0.35 ? (y - 0.35) * 0.3 : 0), y, Math.sin(a) * 0.012] }); }),
    part(tube([[0, -0.06, 0], [0, 0.1, 0], [0.005, 0.3, 0], [0.03, 0.42, 0], [0.06, 0.47, 0]], 0.013, 0.011, 7), '#f1efe6'),
    part(ellipsoid(0.028, 0.016, 0.014), '#f1efe6', { pos: [0.075, 0.475, 0], rot: [0, 0, -0.35] }), // head
    part(ellipsoid(0.008, 0.008, 0.005, 6), '#14161c', { pos: [0.083, 0.485, 0.011] }),
    part(ellipsoid(0.008, 0.008, 0.005, 6), '#14161c', { pos: [0.083, 0.485, -0.011] }),
  ];
  return {
    id: 'gardenEel', name: L2('チンアナゴ', 'Garden eel'), size: L, habitat: ['sand'], water: ['tropical'], upright: true,
    note: '0.5 · 細い棒状、小さな頭 · 白に黒い点 · 砂地に何十本も立って揺れる。近づくと一斉に引っ込む',
    geometry: assemble(parts),
    swim: { mode: 'sway', amp: 0.05, freq: 1.3, waves: 0.35, z0: 0, len: L },
  };
}

// ---------- タツノオトシゴ (seahorse) — upright ----------
export function seahorse() {
  const ochre = '#d8a34a';
  const spine = [[0.0, 0.12, 0], [0.03, 0.06, 0], [0.035, 0.0, 0], [0.015, -0.06, 0], [-0.02, -0.1, 0], [-0.045, -0.13, 0], [-0.03, -0.165, 0], [0.0, -0.16, 0], [0.005, -0.135, 0]];
  const parts = [
    part(tube(spine, 0.032, 0.005, 8), (p) => (Math.sin(p.y * 160) > 0.6 ? '#c08a34' : ochre)), // body with rings, curled tail
    part(ellipsoid(0.03, 0.028, 0.022), ochre, { pos: [0.005, 0.135, 0] }), // head
    part(new THREE.CylinderGeometry(0.008, 0.012, 0.06, 6).rotateZ(-Math.PI / 2 + 0.25), ochre, { pos: [0.05, 0.125, 0] }), // snout
    part(new THREE.ConeGeometry(0.012, 0.03, 5), '#c08a34', { pos: [-0.005, 0.165, 0] }), // the coronet
    part(fin([[0, 0], [-0.03, 0.02], [-0.03, -0.02]], 0.004), '#f0d48c', { pos: [0.01, 0.02, 0] }), // the fluttering dorsal
    ...eyes(0.02, 0.14, 0.018, 0.006),
  ];
  return {
    id: 'seahorse', name: L2('タツノオトシゴ', 'Seahorse'), size: 0.3, habitat: ['lagoon'], water: ['tropical', 'temperate'], upright: true,
    note: '0.3 · S字の体、尾を巻く · 黄土色 · 海草に尾を巻いて揺れる',
    geometry: assemble(parts),
    swim: { mode: 'sway', amp: 0.015, freq: 1.4, waves: 0.2, z0: -0.16, len: 0.3 },
  };
}

// ---------- ハコフグ (boxfish, juvenile colours) ----------
export function boxfish() {
  const L = 0.35;
  const box = new THREE.BoxGeometry(0.24, 0.14, 0.13, 4, 3, 3);
  { // round the box a little
    const p = box.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = 1 - 0.18 * (Math.abs(v.y / 0.07) * Math.abs(v.z / 0.065)) ** 2;
      p.setXYZ(i, v.x * (1 - 0.1 * (v.y / 0.07) ** 2), v.y * k, v.z * k);
    }
    box.computeVertexNormals();
  }
  const parts = [
    part(box, '#f5cf2e'),
    part(ellipsoid(0.02, 0.045, 0.045), '#f5cf2e', { pos: [0.115, -0.005, 0] }), // face
    part(ellipsoid(0.01, 0.009, 0.013, 6), '#e0905a', { pos: [0.135, -0.025, 0] }), // little mouth
    ...spotsOn(0.12, 0.07, 0.065, 30, '#1b1b1f', { r: 0.009, seed: 21 }),
    part(fin([[0, 0], [-0.06, 0.045], [-0.07, 0], [-0.06, -0.045]], 0.008), '#f5cf2e', { pos: [-0.12, 0, 0] }),
    ...pair(fin([[0, 0], [-0.04, 0.03], [-0.035, -0.02]], 0.006), '#f9e38a', [0.05, -0.01, 0.068]),
    ...eyes(0.095, 0.035, 0.05, 0.012),
  ];
  return {
    id: 'boxfish', name: L2('ハコフグ', 'Boxfish'), size: L, habitat: ['reef', 'lagoon'], water: ['tropical'],
    note: '0.35 · 四角い箱の体 · 黄に黒い点（子ども）· ゆっくりホバリング',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.025, freq: 7, waves: 0.3, nose: 0.0, len: 0.17 },
  };
}

// ---------- ギンガメアジ (bigeye trevally) ----------
export function trevally() {
  const L = 0.6;
  const parts = [
    part(body([[0, 0], [0.04, 0.03], [0.09, 0.12], [0.12, 0.28], [0.115, 0.4], [0.08, 0.5], [0.03, 0.54], [0, 0.56]], 16).translate(-0.27, 0, 0).scale(1, 1.15, 0.5), countershade('#6f849a', '#e9eef0', 0.03, 0.04)),
    part(ellipsoid(0.02, 0.016, 0.06, 6), '#2a2f36', { pos: [0.17, 0.05, 0] }), // dark gill spot
    part(fin([[0.06, 0], [-0.2, 0], [-0.04, 0.09]], 0.008), '#5d7085', { pos: [-0.04, 0.12, 0] }),
    part(fin([[0.02, 0], [-0.18, 0], [-0.04, -0.07]], 0.008), '#8597a8', { pos: [-0.05, -0.12, 0] }),
    part(fin([[0.03, 0], [-0.1, 0.13], [-0.05, 0.0], [-0.1, -0.13]], 0.01), '#5d7085', { pos: [-0.27, 0, 0] }), // forked tail
    ...pectoral(L, '#9aa9b6', 0.1, -0.02, 0.05),
    ...eyes(0.2, 0.03, 0.045, 0.016),
  ];
  return {
    id: 'trevally', name: L2('ギンガメアジ', 'Bigeye trevally'), size: L, habitat: ['ocean', 'reef'], water: ['tropical'],
    note: '0.6 · 流線形 · 銀、背は青灰、えらに黒い点 · 大群で渦を巻く「魚の竜巻」',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.05, freq: 5, waves: 0.6, nose: 0.29, len: L },
  };
}

// ---------- イワシ (sardine) ----------
export function sardine() {
  const L = 0.2;
  const parts = [
    part(body([[0, 0], [0.012, 0.02], [0.02, 0.07], [0.022, 0.12], [0.017, 0.16], [0.008, 0.185], [0, 0.19]], 10).translate(-0.09, 0, 0).scale(1, 1.15, 0.7), countershade('#3d6a9c', '#e8edf0', 0.004, 0.006)),
    ...[0.04, 0.02, 0.0, -0.02].map((x) => part(ellipsoid(0.004, 0.004, 0.016, 5), '#24324a', { pos: [x, 0.004, 0] })), // the row of dark spots
    part(fin([[0.01, 0], [-0.035, 0.03], [-0.02, 0], [-0.035, -0.03]], 0.004), '#5c7d9e', { pos: [-0.09, 0, 0] }),
    ...eyes(0.075, 0.004, 0.012, 0.005),
  ];
  return {
    id: 'sardine', name: L2('イワシ', 'Sardine'), size: L, habitat: ['ocean'], water: ['temperate', 'tropical'],
    note: '0.2 · 細身 · 銀に青い背、黒い点の列 · 球状の大群（ベイトボール）。大きな魚が来ると形が変わる',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.018, freq: 12, waves: 0.6, nose: 0.1, len: L },
  };
}

// ---------- マグロ (tuna) ----------
export function tuna() {
  const L = 1.2;
  const parts = [
    part(body([[0, 0], [0.03, 0.05], [0.08, 0.18], [0.13, 0.42], [0.14, 0.6], [0.12, 0.85], [0.07, 1.0], [0.03, 1.07], [0, 1.1]], 18).translate(-0.55, 0, 0).scale(1, 1.0, 0.85), countershade('#1d2f57', '#d9dfe4', 0.0, 0.03)),
    part(new THREE.BoxGeometry(0.5, 0.012, 0.21), '#c9d3db', { pos: [0.05, -0.02, 0] }), // a silver stripe on the flank
    part(fin([[0.06, 0], [-0.12, 0], [-0.05, 0.14]], 0.012), '#1d2f57', { pos: [0.1, 0.12, 0] }),
    part(fin([[0.03, 0], [-0.08, 0], [-0.06, 0.1]], 0.01), '#e7c247', { pos: [-0.15, 0.1, 0] }),
    part(fin([[0.03, 0], [-0.08, 0], [-0.06, -0.1]], 0.01), '#e7c247', { pos: [-0.15, -0.1, 0] }),
    ...[0, 1, 2, 3, 4].flatMap((i) => [ // the yellow finlets
      part(fin([[0.01, 0], [-0.02, 0], [-0.02, 0.025]], 0.006), '#f2cf48', { pos: [-0.25 - i * 0.045, 0.08 - i * 0.012, 0] }),
      part(fin([[0.01, 0], [-0.02, 0], [-0.02, -0.025]], 0.006), '#f2cf48', { pos: [-0.25 - i * 0.045, -0.08 + i * 0.012, 0] }),
    ]),
    part(fin([[0.02, 0], [-0.1, 0.26], [-0.05, 0.0], [-0.1, -0.26]], 0.012), '#1d2f57', { pos: [-0.53, 0, 0] }), // tall crescent tail
    ...pair(fin([[0, 0], [-0.24, 0.02], [-0.22, -0.02]], 0.01), '#1d2f57', [0.25, 0.0, 0.11], [0, 0.25, -0.2]),
    ...eyes(0.42, 0.03, 0.085, 0.022),
  ];
  return {
    id: 'tuna', name: L2('マグロ', 'Tuna'), size: L, habitat: ['ocean'], water: ['tropical', 'temperate'],
    note: '1.2 · 紡錘形、三日月の尾、黄色い小離鰭 · 背は紺、腹は銀 · 外洋を速く群れで',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.09, freq: 6, waves: 0.4, nose: 0.55, len: L },
  };
}

export const FISH = { clownfish, butterflyfish, moorishIdol, parrotfish, damselGreen, damselBlue, porcupinefish, grouper, moray, gardenEel, seahorse, boxfish, trevally, sardine, tuna };

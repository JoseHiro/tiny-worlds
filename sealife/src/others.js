// Big animals (DESIGN.md §2.4), small creatures of the bottom (§2.5) and the sea surface (§2.6).
// Things that sit on the bottom or stand up have `upright: true` and their origin on the floor.
import * as THREE from 'three';
import { part, assemble, ellipsoid, fin, body, eyes, countershade, spotsOn, seeded, tube } from './kit.js';

const L2 = (ja, en) => ({ ja, en });
const scaled = (pts, L) => pts.map(([x, y]) => [x * L, y * L]);
const flukes = (L, w) => fin(scaled([[0.05, 0], [-0.08, w * 0.8], [-0.14, w], [-0.1, w * 0.4], [-0.08, 0], [-0.1, -w * 0.4], [-0.14, -w], [-0.08, -w * 0.8]], L), 0.012 * L).rotateX(Math.PI / 2);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), UP = new THREE.Vector3(0, 1, 0);
const pointing = (dir) => { _e.setFromQuaternion(_q.setFromUnitVectors(UP, dir.clone().normalize())); return [_e.x, _e.y, _e.z]; };

// ---------- タイマイ (hawksbill turtle) ----------
export function hawksbill() {
  const shell = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.47, 0.2, 0.38);
  const amber = new THREE.Color('#b9782f'), dark = new THREE.Color('#4a2a15'), c = new THREE.Color();
  const tortoise = (p) => c.copy(amber).lerp(dark, THREE.MathUtils.smoothstep(Math.sin(p.x * 22 + Math.sin(p.z * 18) * 2) * Math.sin(p.z * 15 + p.x * 6), 0.1, 0.6));
  const skin = '#a88d62', paddle = '#7d6440';
  const flipper = fin([[0.09, 0], [-0.06, 0], [-0.26, 0.29], [-0.35, 0.46], [-0.27, 0.47], [-0.1, 0.32], [0.04, 0.13]], 0.026).rotateX(Math.PI / 2);
  const rear = fin([[0.05, 0], [-0.04, 0], [-0.17, 0.15], [-0.08, 0.18]], 0.022).rotateX(Math.PI / 2);
  const mirror = (g) => g.clone().scale(1, 1, -1);
  const parts = [
    part(shell, tortoise),
    part(ellipsoid(0.44, 0.05, 0.35), '#e3cf98', { pos: [0, -0.01, 0] }),
    part(ellipsoid(0.12, 0.085, 0.09), skin, { pos: [0.56, 0.04, 0] }), // narrow head
    part(ellipsoid(0.05, 0.03, 0.035), '#8d7250', { pos: [0.66, 0.015, 0], rot: [0, 0, -0.4] }), // hawk's beak
    part(new THREE.CylinderGeometry(0.07, 0.085, 0.14, 10).rotateZ(Math.PI / 2), skin, { pos: [0.45, 0.02, 0] }),
    part(flipper, paddle, { pos: [0.25, -0.02, 0.26] }),
    part(mirror(flipper), paddle, { pos: [0.25, -0.02, -0.26] }),
    part(rear, paddle, { pos: [-0.36, -0.03, 0.17] }),
    part(mirror(rear), paddle, { pos: [-0.36, -0.03, -0.17] }),
    ...eyes(0.62, 0.07, 0.07, 0.018),
  ];
  // the saw-toothed back edge of the shell
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.62 + i * 0.095);
    parts.push(part(new THREE.ConeGeometry(0.03, 0.06, 4).rotateZ(Math.PI / 2), '#8a5525', { pos: [Math.cos(a) * 0.48, 0.0, Math.sin(a) * 0.39], rot: [0, -a + Math.PI, 0] }));
  }
  return {
    id: 'hawksbill', name: L2('タイマイ', 'Hawksbill turtle'), size: 1.0, habitat: ['reef'], water: ['tropical'],
    note: '1.0 · 甲羅のふちがギザギザ、くちばし状の口 · べっこう模様 · サンゴ礁でカイメンを食べる',
    geometry: assemble(parts),
    swim: { mode: 'flap', amp: 0.24, freq: 1.4, waves: 0.4, z0: 0.28, len: 0.45 },
  };
}

// ---------- ハンドウイルカ (bottlenose dolphin) ----------
export function dolphin() {
  const L = 2.2;
  const grey = '#7c8996';
  const parts = [
    part(body(scaled([[0, 0], [0.02, 0.05], [0.06, 0.25], [0.1, 0.5], [0.11, 0.62], [0.095, 0.78], [0.065, 0.86], [0.035, 0.9], [0.025, 0.97], [0, 1]], L), 20).translate(-L / 2, 0, 0).scale(1, 1, 0.9), countershade(grey, '#e6e8ea', -0.03 * L, 0.03 * L)),
    part(ellipsoid(0.08 * L, 0.06 * L, 0.06 * L), grey, { pos: [0.33 * L, 0.025 * L, 0] }), // the melon
    part(fin(scaled([[0.07, 0], [-0.06, 0], [-0.09, 0.1], [-0.05, 0.06]], L), 0.012 * L), grey, { pos: [-0.02 * L, 0.09 * L, 0] }), // curved dorsal
    part(flukes(L, 0.13), grey, { pos: [-0.46 * L, 0, 0] }),
    ...[1, -1].map((s) => part(fin(scaled([[0.04, 0], [-0.05, 0], [-0.09, -0.09]], L), 0.01 * L), grey, { pos: [0.24 * L, -0.06 * L, s * 0.06 * L], rot: [s * -0.9, 0, 0] })),
    ...eyes(0.36 * L, 0.0, 0.07 * L, 0.008 * L),
  ];
  return {
    id: 'dolphin', name: L2('ハンドウイルカ', 'Bottlenose dolphin'), size: L, habitat: ['ocean'], water: ['tropical', 'temperate'],
    note: '2.2 · 流線形、くちばし、背びれ · 灰色、腹は白 · 外洋を群れで。水面をジャンプ（見せ場）',
    geometry: assemble(parts),
    swim: { mode: 'vbend', amp: 0.22, freq: 2.2, waves: 0.5, nose: L / 2, len: L },
  };
}

// ---------- ジュゴン (dugong) ----------
export function dugong() {
  const L = 2.5;
  const top = '#8c8276';
  const parts = [
    part(body(scaled([[0, 0], [0.03, 0.05], [0.1, 0.25], [0.15, 0.5], [0.155, 0.65], [0.125, 0.82], [0.09, 0.92], [0.06, 0.97], [0, 0.99]], L), 20).translate(-L / 2, 0, 0).scale(1, 0.9, 1), countershade(top, '#b8afa3', -0.03 * L, 0.04 * L)),
    part(ellipsoid(0.07 * L, 0.06 * L, 0.07 * L), '#a59a8b', { pos: [0.45 * L, -0.04 * L, 0], rot: [0, 0, -0.5] }), // the down-turned snout
    part(ellipsoid(0.04 * L, 0.012 * L, 0.05 * L), '#6e655a', { pos: [0.49 * L, -0.085 * L, 0] }), // the bristly lip pad
    part(flukes(L, 0.17), top, { pos: [-0.47 * L, 0, 0] }),
    ...[1, -1].map((s) => part(ellipsoid(0.07 * L, 0.012 * L, 0.03 * L), top, { pos: [0.27 * L, -0.07 * L, s * 0.13 * L], rot: [s * -0.5, s * 0.6, 0] })),
    ...eyes(0.4 * L, 0.03 * L, 0.075 * L, 0.006 * L),
  ];
  return {
    id: 'dugong', name: L2('ジュゴン', 'Dugong'), size: L, habitat: ['lagoon'], water: ['tropical'],
    note: '2.5 · ずんぐり、下向きの丸い鼻、イルカのような尾 · 灰褐色 · 浅い海草の原っぱでゆっくり食事',
    geometry: assemble(parts),
    swim: { mode: 'vbend', amp: 0.18, freq: 1.0, waves: 0.4, nose: L / 2, len: L },
  };
}

// ---------- ザトウクジラ (humpback whale, for other seas) ----------
export function humpback() {
  const L = 10;
  const top = '#24272d', belly = '#d9d5cc';
  const parts = [
    part(body(scaled([[0, 0], [0.02, 0.06], [0.06, 0.2], [0.1, 0.4], [0.11, 0.55], [0.1, 0.75], [0.075, 0.88], [0.045, 0.96], [0, 1]], L), 26).translate(-L / 2, 0, 0).scale(1, 0.9, 1), countershade(top, belly, -0.05 * L, 0.02 * L)),
    // the long white flippers
    ...[1, -1].map((s) => part(fin(scaled([[0.03, 0], [-0.03, 0], [-0.12, -0.3], [-0.09, -0.31]], L), 0.01 * L), countershade('#3a3e45', '#eeeae2', 0.0, 0.02 * L), { pos: [0.22 * L, -0.06 * L, s * 0.09 * L], rot: [s * -1.15, s * 0.2, 0] })),
    part(fin(scaled([[0.03, 0], [-0.04, 0], [-0.04, 0.03]], L), 0.012 * L), top, { pos: [-0.2 * L, 0.06 * L, 0] }), // the small hump fin
    part(flukes(L, 0.14), countershade(top, belly, 0, 0.004 * L), { pos: [-0.46 * L, 0, 0] }),
    ...eyes(0.36 * L, -0.03 * L, 0.085 * L, 0.006 * L),
  ];
  // throat grooves: pale lines under the head
  for (let i = -3; i <= 3; i++) parts.push(part(new THREE.BoxGeometry(0.3 * L, 0.003 * L, 0.004 * L), '#8f8a82', { pos: [0.28 * L, -0.085 * L + Math.abs(i) * 0.004 * L, i * 0.018 * L] }));
  // tubercles: knobs on the head
  const rnd = seeded(31);
  for (let i = 0; i < 24; i++) parts.push(part(ellipsoid(0.008 * L, 0.006 * L, 0.008 * L, 6), '#33373e', { pos: [(0.36 + rnd() * 0.12) * L, (0.035 + rnd() * 0.02) * L - (rnd() * 0.012 * L), (rnd() - 0.5) * 0.08 * L] }));
  return {
    id: 'humpback', name: L2('ザトウクジラ', 'Humpback whale'), size: L, habitat: ['ocean'], water: ['temperate', 'cold', 'tropical'],
    note: '10 · 長い白い胸びれ、頭にこぶ、のどの溝 · 黒と白 · 外洋で潮吹き、ジャンプ（他の海用）',
    geometry: assemble(parts),
    swim: { mode: 'vbend', amp: 0.6, freq: 0.5, waves: 0.4, nose: L / 2, len: L },
  };
}

// ---------- タコ (octopus) — on the floor ----------
export function octopus() {
  const red = '#b65a3c', pale = '#e6b39a';
  const parts = [
    part(ellipsoid(0.14, 0.16, 0.13), (p) => (Math.sin(p.x * 60) * Math.sin(p.z * 60) > 0.6 ? '#9c4630' : red), { pos: [-0.08, 0.2, 0], rot: [0, 0, 0.55] }), // the mantle, tipped back
    part(ellipsoid(0.1, 0.08, 0.1), red, { pos: [0.02, 0.08, 0] }), // the head
    ...[1, -1].map((s) => part(ellipsoid(0.03, 0.035, 0.025), '#d9a78e', { pos: [0.06, 0.12, s * 0.06] })),
    ...[1, -1].map((s) => part(ellipsoid(0.012, 0.012, 0.008, 6), '#14161c', { pos: [0.078, 0.125, s * 0.075] })),
  ];
  // eight arms, each centred in its own slot of the walk shader (atan2(z, x) in eight slots)
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI + (i + 0.5) * (Math.PI / 4), cx = Math.cos(a), cz = Math.sin(a);
    const pts = [[0.03, 0.04], [0.12, -0.02], [0.24, -0.04], [0.34, -0.03], [0.42, 0.02], [0.44, 0.06]].map(([r, y]) => [cx * r, y, cz * r]);
    parts.push(part(tube(pts, 0.035, 0.006, 6), (p) => (p.y < -0.03 ? pale : red)));
  }
  return {
    id: 'octopus', name: L2('タコ', 'Octopus'), size: 0.6, habitat: ['rock', 'reef'], water: ['tropical', 'temperate'], upright: true,
    note: '0.6 · 丸い頭と8本の腕 · 赤茶（色が変わる）· 岩の上を歩く、噴射して逃げる',
    geometry: assemble(parts).translate(0, 0.06, 0), // lifted so the arms rest on the floor
    swim: { mode: 'walk', amp: 0.04, freq: 2.0, waves: 8, z0: 0.08, len: 0.08 },
  };
}

// ---------- アオリイカ (bigfin reef squid) ----------
export function squid() {
  const tan = '#d8c09a';
  const parts = [
    part(body([[0.06, 0], [0.075, 0.08], [0.07, 0.22], [0.045, 0.32], [0, 0.36]], 14).translate(-0.12, 0, 0).scale(1, 0.85, 1), (p) => (Math.sin(p.x * 70) * Math.sin(p.z * 80) > 0.7 ? '#b38f63' : tan)), // mantle, pointed end forward
    part(ellipsoid(0.17, 0.005, 0.13, 20), '#e6d6b9', { pos: [0.06, -0.005, 0] }), // the fin skirt along both sides
    part(ellipsoid(0.04, 0.045, 0.05), tan, { pos: [-0.14, 0, 0] }), // head
    ...[1, -1].map((s) => part(ellipsoid(0.02, 0.02, 0.012, 8), '#2a6f6a', { pos: [-0.13, 0.01, s * 0.045] })),
  ];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, y = Math.cos(a) * 0.025, z = Math.sin(a) * 0.025;
    parts.push(part(tube([[-0.16, y, z], [-0.22, y * 1.6, z * 1.6], [-0.28, y * 1.4, z * 1.4]], 0.01, 0.002, 5), '#cdb48c'));
  }
  return {
    id: 'squid', name: L2('アオリイカ', 'Bigfin reef squid'), size: 0.5, habitat: ['reef', 'lagoon'], water: ['tropical', 'temperate'],
    note: '0.5 · 胴のまわりに大きなひれ、腕 · 半透明の薄茶に点 · 横に並んでホバリング、噴射',
    geometry: assemble(parts),
    surface: { opacity: 0.88 },
    swim: { mode: 'jet', amp: 0.6, freq: 2.5, waves: 1.0, z0: 0.07, len: 0.3 },
  };
}

// ---------- クラゲ (moon jelly / spotted jelly) — bell up, origin at the bell rim ----------
export function moonJelly() {
  const parts = [
    part(new THREE.SphereGeometry(1, 26, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.2, 0.1, 0.2), '#dfeef7'),
    ...[0, 1, 2, 3].map((i) => part(new THREE.TorusGeometry(0.035, 0.008, 6, 16).rotateX(Math.PI / 2), '#d28bc0', { pos: [Math.cos(i * Math.PI / 2 + 0.78) * 0.06, 0.075, Math.sin(i * Math.PI / 2 + 0.78) * 0.06] })), // the four rings
  ];
  for (let i = 0; i < 4; i++) { // oral arms
    const a = i * Math.PI / 2;
    parts.push(part(tube([[0, 0, 0], [Math.cos(a) * 0.03, -0.08, Math.sin(a) * 0.03], [Math.cos(a) * 0.02, -0.16, Math.sin(a) * 0.04]], 0.018, 0.006, 5), '#e9dfee'));
  }
  for (let i = 0; i < 36; i++) { // the fringe
    const a = (i / 36) * Math.PI * 2;
    parts.push(part(new THREE.CylinderGeometry(0.0015, 0.0015, 0.08, 3), '#f2f6fa', { pos: [Math.cos(a) * 0.195, -0.04, Math.sin(a) * 0.195] }));
  }
  return {
    id: 'moonJelly', name: L2('ミズクラゲ', 'Moon jelly'), size: 0.4, habitat: ['lagoon', 'ocean'], water: ['tropical', 'temperate', 'cold'],
    note: '0.4 · 半透明のかさ、四つ葉の輪、短い触手 · 白に薄紫 · 拍動しながら漂う',
    geometry: assemble(parts),
    surface: { opacity: 0.55, emissive: 0.12 },
    swim: { mode: 'pulse', amp: 0.22, freq: 1.6, waves: 0.5, z0: 0.0, len: 0.12 },
  };
}
export function spottedJelly() {
  const parts = [
    part(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.16, 0.13, 0.16), '#a98b5c'),
    ...spotsOn(0.16, 0.13, 0.16, 26, '#f5efe0', { r: 0.012, seed: 17, keep: (x, y) => y > 0.01 }),
  ];
  for (let i = 0; i < 8; i++) { // thick oral arms with club ends
    const a = (i / 8) * Math.PI * 2, r = 0.04;
    parts.push(part(tube([[Math.cos(a) * r, 0, Math.sin(a) * r], [Math.cos(a) * r * 1.2, -0.09, Math.sin(a) * r * 1.2], [Math.cos(a) * r, -0.17, Math.sin(a) * r]], 0.018, 0.012, 5), '#c9b48b'));
    parts.push(part(ellipsoid(0.02, 0.03, 0.02, 8), '#ece2c8', { pos: [Math.cos(a) * r, -0.19, Math.sin(a) * r] }));
  }
  return {
    id: 'spottedJelly', name: L2('タコクラゲ', 'Spotted lagoon jelly'), size: 0.4, habitat: ['lagoon'], water: ['tropical'],
    note: '0.4 · 丸いかさ、先が太い8本の口腕 · 茶色に白い斑点 · 浅い入江で拍動しながら漂う',
    geometry: assemble(parts),
    surface: { opacity: 0.85 },
    swim: { mode: 'pulse', amp: 0.18, freq: 1.4, waves: 0.4, z0: 0.0, len: 0.13 },
  };
}

// ---------- ウミウシ (nudibranch) — on the floor ----------
export function nudibranch() {
  const parts = [
    part(ellipsoid(0.08, 0.008, 0.038), '#f39a2b', { pos: [0, 0.01, 0] }), // orange skirt
    part(ellipsoid(0.072, 0.022, 0.03), '#2a4ad0', { pos: [0, 0.022, 0] }), // blue body
    part(new THREE.BoxGeometry(0.11, 0.004, 0.006), '#f4f0e6', { pos: [0, 0.043, 0] }), // a white line down the back
    ...[1, -1].map((s) => part(new THREE.ConeGeometry(0.007, 0.03, 6), '#f39a2b', { pos: [0.05, 0.05, s * 0.012] })), // rhinophores
  ];
  for (let i = 0; i < 7; i++) { // the gill tuft
    const a = (i / 7) * Math.PI * 2;
    parts.push(part(new THREE.ConeGeometry(0.005, 0.025, 4), '#f39a2b', { pos: [-0.05 + Math.cos(a) * 0.01, 0.05, Math.sin(a) * 0.01], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }));
  }
  return {
    id: 'nudibranch', name: L2('ウミウシ', 'Nudibranch'), size: 0.15, habitat: ['reef', 'rock'], water: ['tropical', 'temperate'], upright: true,
    note: '0.15 · 色鮮やかなナメクジ形、2本の触角と背中のえら · 青にオレンジの縁 · ゆっくり這う',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.006, freq: 1.5, waves: 0.6, nose: 0.08, len: 0.16 },
  };
}

// ---------- アオヒトデ (blue sea star) — on the floor ----------
export function seaStar() {
  const blue = '#3a6fd8';
  const parts = [part(ellipsoid(0.04, 0.02, 0.04), blue, { pos: [0, 0.015, 0] })];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3, c = Math.cos(a), s = Math.sin(a);
    parts.push(part(tube([[c * 0.02, 0.015, s * 0.02], [c * 0.1, 0.013, s * 0.1], [c * 0.17, 0.01, s * 0.17]], 0.022, 0.014, 6), (p) => (Math.sin(p.x * 120) * Math.sin(p.z * 120) > 0.8 ? '#2b55b0' : blue)));
  }
  return {
    id: 'seaStar', name: L2('アオヒトデ', 'Blue sea star'), size: 0.35, habitat: ['lagoon', 'reef'], water: ['tropical'], upright: true,
    note: '0.35 · 星形、丸い腕 · 鮮やかな青 · ほぼ動かない',
    geometry: assemble(parts),
    swim: { mode: 'sway', amp: 0.004, freq: 0.6, waves: 0.2, z0: 0, len: 0.05 },
  };
}

// ---------- ナマコ (sea cucumber) — on the floor ----------
export function seaCucumber() {
  const parts = [
    part(body([[0, 0], [0.035, 0.02], [0.05, 0.1], [0.05, 0.25], [0.04, 0.32], [0, 0.35]], 12).translate(-0.17, 0, 0).scale(1, 0.75, 1), '#26231f', { pos: [0, 0.035, 0] }),
    ...spotsOn(0.16, 0.037, 0.05, 30, '#3a352e', { r: 0.008, seed: 23, keep: (x, y) => y > 0, at: [0, 0.035, 0] }),
  ];
  return {
    id: 'seaCucumber', name: L2('ナマコ', 'Sea cucumber'), size: 0.35, habitat: ['lagoon', 'sand'], water: ['tropical', 'temperate'], upright: true,
    note: '0.35 · 黒い筒、小さないぼ · 黒 · 砂の上でほとんど動かない',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.008, freq: 0.5, waves: 0.4, nose: 0.17, len: 0.35 },
  };
}

// ---------- ガンガゼ (long-spined urchin) — on the floor ----------
export function urchin() {
  const parts = [part(ellipsoid(0.07, 0.055, 0.07), '#2a1f2e', { pos: [0, 0.05, 0] })];
  const rnd = seeded(41), d = new THREE.Vector3();
  for (let i = 0; i < 56; i++) {
    d.set(rnd() * 2 - 1, rnd() * 0.9 + 0.1, rnd() * 2 - 1).normalize();
    const len = 0.1 + rnd() * 0.06;
    parts.push(part(new THREE.ConeGeometry(0.004, len, 4).translate(0, len / 2, 0), '#1b1620', { pos: [d.x * 0.06, 0.05 + d.y * 0.045, d.z * 0.06], rot: pointing(d) }));
  }
  return {
    id: 'urchin', name: L2('ガンガゼ', 'Long-spined urchin'), size: 0.3, habitat: ['reef', 'rock'], water: ['tropical'], upright: true,
    note: '0.3 · とげの玉（長いとげ）· 黒紫 · 動かない、とげがゆっくり揺れる',
    geometry: assemble(parts),
    swim: { mode: 'sway', amp: 0.012, freq: 0.8, waves: 0.2, z0: 0.06, len: 0.12 },
  };
}

// ---------- シャコガイ (giant clam) — on the floor, opening up ----------
export function giantClam() {
  const shell = new THREE.SphereGeometry(1, 28, 12);
  { // fluted ridges and a wavy rim
    const p = shell.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const flute = 1 + 0.1 * Math.abs(Math.sin(v.x * 9));
      const y = v.y > 0.55 ? 0.55 + (v.y - 0.55) * 0.15 : v.y; // a broad, open top
      const rim = v.y > 0.5 ? 0.04 * Math.abs(Math.sin(v.x * 14)) : 0; // zig-zag lips
      p.setXYZ(i, v.x * 0.3, y * 0.2 + rim, v.z * 0.2 * flute);
    }
    shell.computeVertexNormals();
  }
  const blue = new THREE.Color('#2f7bd6'), purple = new THREE.Color('#6a3ec4'), c = new THREE.Color();
  const parts = [
    part(shell, (p) => (Math.abs(Math.sin(p.x * 9)) > 0.85 ? '#c9c2b0' : '#e3ddcd'), { pos: [0, 0.16, 0] }),
    part(ellipsoid(0.25, 0.03, 0.11, 20), (p) => c.copy(blue).lerp(purple, 0.5 + 0.5 * Math.sin(p.x * 30)).lerp(new THREE.Color('#9fe3f0'), Math.sin(p.x * 70) * Math.sin(p.z * 90) > 0.7 ? 0.8 : 0), { pos: [0, 0.275, 0] }), // the mantle between the lips
  ];
  return {
    id: 'giantClam', name: L2('シャコガイ', 'Giant clam'), size: 0.6, habitat: ['reef', 'lagoon'], water: ['tropical'], upright: true,
    note: '0.6 · 波打つ殻、口から青や紫の外套膜 · 殻が少し開閉',
    geometry: assemble(parts),
    swim: { mode: 'open', amp: 0.02, freq: 0.5, waves: 0, z0: 0, len: 0.3 },
  };
}

// ---------- ヤドカリ / カニ — walkers on the floor ----------
export function hermitCrab() {
  const shell = [];
  for (let i = 0; i < 5; i++) { // a cone of shrinking whorls
    const r = 0.055 * (1 - i * 0.17);
    shell.push(part(ellipsoid(r, r * 0.9, r), i % 2 ? '#c9b08c' : '#e6d6b8', { pos: [-0.02 - i * 0.032, 0.06 + i * 0.02, 0] }));
  }
  const red = '#d0563a';
  const parts = [
    ...shell,
    part(ellipsoid(0.03, 0.025, 0.035), red, { pos: [0.04, 0.035, 0] }),
    part(ellipsoid(0.03, 0.02, 0.02), '#e06a45', { pos: [0.075, 0.035, 0.025] }), // the big claw
    part(ellipsoid(0.02, 0.014, 0.014), '#e06a45', { pos: [0.07, 0.03, -0.025] }),
    ...[1, -1].map((s) => part(tube([[0.05, 0.05, s * 0.01], [0.065, 0.085, s * 0.015]], 0.004, 0.003, 4), red)),
    ...[1, -1].map((s) => part(ellipsoid(0.007, 0.007, 0.007, 6), '#14161c', { pos: [0.066, 0.09, s * 0.015] })),
  ];
  for (const s of [1, -1]) for (let i = 0; i < 2; i++) parts.push(part(tube([[0.04 - i * 0.02, 0.03, s * 0.025], [0.06 - i * 0.03, 0.025, s * 0.06], [0.07 - i * 0.04, -0.002, s * 0.075]], 0.006, 0.003, 4), red));
  return {
    id: 'hermitCrab', name: L2('ヤドカリ', 'Hermit crab'), size: 0.15, habitat: ['sand', 'lagoon'], water: ['tropical', 'temperate'], upright: true,
    note: '0.15 · 巻き貝の殻、赤い脚と片方大きなはさみ · 波打ち際を歩く、驚くと殻に入る',
    geometry: assemble(parts),
    swim: { mode: 'walk', amp: 0.008, freq: 5, waves: 12, z0: 0.025, len: 0.025 },
  };
}
export function crab() {
  const red = '#c5503a';
  const parts = [
    part(ellipsoid(0.065, 0.028, 0.095), countershade(red, '#e9c2a8', 0.03, 0.01), { pos: [0, 0.045, 0] }), // carapace, wide
    ...[1, -1].map((s) => part(tube([[0.05, 0.045, s * 0.04], [0.09, 0.05, s * 0.07], [0.12, 0.05, s * 0.06]], 0.009, 0.007, 5), red)),
    ...[1, -1].map((s) => part(ellipsoid(0.03, 0.018, 0.016), '#d9643f', { pos: [0.135, 0.05, s * 0.055] })), // the claws
    ...[1, -1].map((s) => part(ellipsoid(0.008, 0.008, 0.008, 6), '#14161c', { pos: [0.06, 0.08, s * 0.025] })),
    ...[1, -1].map((s) => part(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 4), red, { pos: [0.06, 0.068, s * 0.025] })),
  ];
  for (const s of [1, -1]) for (let i = 0; i < 4; i++) {
    const x = 0.03 - i * 0.025;
    parts.push(part(tube([[x, 0.04, s * 0.07], [x * 1.3, 0.07, s * 0.13], [x * 1.6, 0.0, s * 0.17]], 0.007, 0.003, 4), red));
  }
  return {
    id: 'crab', name: L2('カニ', 'Crab'), size: 0.2, habitat: ['sand', 'rock'], water: ['tropical', 'temperate', 'cold'], upright: true, sideways: true,
    note: '0.2 · 横長の甲羅とはさみ、4対の脚 · 赤 · 横歩き、穴に入る',
    geometry: assemble(parts),
    swim: { mode: 'walk', amp: 0.012, freq: 6, waves: 16, z0: 0.035, len: 0.035 },
  };
}

// ---------- イソギンチャク (magnificent anemone — the clownfish's home) — on the floor ----------
export function anemone() {
  const parts = [
    part(new THREE.CylinderGeometry(0.15, 0.17, 0.1, 18).translate(0, 0.05, 0), '#8c2f5e'), // the column
    part(ellipsoid(0.16, 0.02, 0.16, 18), '#c9b07a', { pos: [0, 0.1, 0] }),
  ];
  const rnd = seeded(55);
  for (let i = 0; i < 80; i++) {
    const a = rnd() * Math.PI * 2, r = 0.02 + Math.sqrt(rnd()) * 0.15, len = 0.11 + rnd() * 0.07, lean = r / 0.17;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    parts.push(part(tube([[x, 0.1, z], [x * (1 + lean * 0.4), 0.1 + len * 0.6, z * (1 + lean * 0.4)], [x * (1 + lean * 0.7), 0.1 + len, z * (1 + lean * 0.7)]], 0.013, 0.009, 5), (p) => (p.y > 0.1 + len * 0.85 ? '#a8d36a' : '#dcc58a')));
  }
  return {
    id: 'anemone', name: L2('イソギンチャク', 'Magnificent sea anemone'), size: 0.5, habitat: ['reef'], water: ['tropical'], upright: true,
    note: '0.5 · 触手のかたまり（先が緑）、紫の胴 · 揺れる（クマノミの家）',
    geometry: assemble(parts),
    swim: { mode: 'sway', amp: 0.05, freq: 1.0, waves: 0.25, z0: 0.1, len: 0.18 },
  };
}

// ---------- カモメ (gull) and トビウオ (flying fish) — above the water ----------
export function gull() {
  const grey = '#9aa5ae';
  const wing = (s) => part(fin([[0.06, 0], [0.03, 0.3], [-0.02, 0.48], [-0.07, 0.45], [-0.08, 0.2], [-0.06, 0]], 0.012).rotateX(s * Math.PI / 2), (p) => (Math.abs(p.z) > 0.36 ? '#22252b' : grey), { pos: [0, 0.03, s * 0.04] });
  const parts = [
    part(ellipsoid(0.15, 0.055, 0.055), '#f6f5f0'),
    part(ellipsoid(0.05, 0.045, 0.045), '#f6f5f0', { pos: [0.15, 0.04, 0] }),
    part(new THREE.ConeGeometry(0.012, 0.055, 5).rotateZ(-Math.PI / 2), '#f0c23a', { pos: [0.215, 0.035, 0] }),
    part(fin([[0, 0], [-0.1, 0.035], [-0.1, -0.035]], 0.008).rotateX(Math.PI / 2), '#f6f5f0', { pos: [-0.13, 0.01, 0] }), // tail
    wing(1), wing(-1),
    ...eyes(0.17, 0.055, 0.035, 0.007),
  ];
  return {
    id: 'gull', name: L2('カモメ', 'Gull'), size: 0.45, habitat: ['surface'], water: ['tropical', 'temperate', 'cold'],
    note: '翼を広げて1.0 · 白い体、灰色の翼、黒い翼の先、黄色いくちばし · 浜や船の周りを飛ぶ',
    geometry: assemble(parts),
    swim: { mode: 'flap', amp: 0.2, freq: 3.2, waves: 0.4, z0: 0.06, len: 0.42 },
  };
}
export function flyingFish() {
  const L = 0.4;
  const wing = (s) => part(fin([[0, 0], [-0.08, 0.2], [-0.18, 0.22], [-0.12, 0.05]], 0.004).rotateX(s * Math.PI / 2), '#9fcbe8', { pos: [0.08, 0.01, s * 0.02] });
  const parts = [
    part(body([[0, 0], [0.015, 0.03], [0.028, 0.12], [0.03, 0.24], [0.022, 0.32], [0, 0.36]], 10).translate(-0.18, 0, 0).scale(1, 1.1, 0.95), countershade('#2b4f8f', '#e8edf2', 0.0, 0.008)),
    wing(1), wing(-1),
    part(fin([[0.02, 0], [-0.09, 0.06], [-0.05, 0], [-0.12, -0.08]], 0.005), '#2b4f8f', { pos: [-0.17, 0, 0] }), // lower lobe longer
    ...eyes(0.14, 0.008, 0.024, 0.008),
  ];
  return {
    id: 'flyingFish', name: L2('トビウオ', 'Flying fish'), size: L, habitat: ['surface', 'ocean'], water: ['tropical', 'temperate'],
    note: '0.4 · 細身、大きく広がる胸びれ · 背は青、腹は銀 · まれに水面を滑空',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.02, freq: 9, waves: 0.5, nose: 0.18, len: L },
  };
}

export const OTHERS = { hawksbill, dolphin, dugong, humpback, octopus, squid, moonJelly, spottedJelly, nudibranch, seaStar, seaCucumber, urchin, giantClam, hermitCrab, crab, anemone, gull, flyingFish };

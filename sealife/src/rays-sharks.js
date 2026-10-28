// Rays and sharks (DESIGN.md §2.1, §2.2) beyond the reference manta, blacktip and whale shark.
import * as THREE from 'three';
import { part, assemble, ellipsoid, fin, body, eyes, countershade, inside, seeded } from './kit.js';

const L2 = (ja, en) => ({ ja, en });

// ---------- マダラトビエイ (spotted eagle ray) ----------
export function eagleRay() {
  const pts = [[0.42, 0], [0.22, 0.42], [-0.2, 0.9], [-0.14, 0.5], [-0.42, 0.08], [-0.42, -0.08], [-0.14, -0.5], [-0.2, -0.9], [0.22, -0.42]];
  const sh = new THREE.Shape();
  sh.moveTo(...pts[0]);
  sh.quadraticCurveTo(0.3, 0.3, -0.2, 0.9);
  sh.quadraticCurveTo(-0.16, 0.45, -0.42, 0.08);
  sh.lineTo(-0.42, -0.08);
  sh.quadraticCurveTo(-0.16, -0.45, -0.2, -0.9);
  sh.quadraticCurveTo(0.3, -0.3, 0.42, 0);
  const t = 0.04;
  const wings = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.02, bevelSegments: 1, curveSegments: 14 }).rotateX(Math.PI / 2).translate(0, t / 2, 0);
  const top = '#24365a', shade = countershade(top, '#f2f0ea', 0, 0.015);
  const parts = [
    part(wings, shade),
    part(ellipsoid(0.42, 0.1, 0.2), shade),
    part(ellipsoid(0.2, 0.075, 0.1), shade, { pos: [0.45, -0.01, 0] }), // the duck-bill head
    part(new THREE.CylinderGeometry(0.004, 0.018, 2.3, 5).rotateZ(Math.PI / 2), top, { pos: [-1.55, 0, 0] }), // very long tail
    ...eyes(0.42, 0.05, 0.1, 0.018),
  ];
  // white spots on the back, inside the wing outline
  const rnd = seeded(7);
  for (let i = 0; i < 260 && parts.length < 75; i++) {
    const x = -0.4 + rnd() * 0.8, z = (rnd() - 0.5) * 1.7;
    if (!inside(pts, x, z) || Math.abs(z) < 0.12) continue;
    parts.push(part(ellipsoid(0.022, 0.006, 0.022, 6), '#f4f3ee', { pos: [x, t / 2 + 0.006, z] }));
  }
  return {
    id: 'eagleRay', name: L2('マダラトビエイ', 'Spotted eagle ray'), size: 1.8, habitat: ['reef', 'ocean'], water: ['tropical'],
    note: '幅1.8 · 尖った翼、くちばしのような頭、とても長い尾 · 紺に白い斑点 · 2〜5匹で礁の上を滑空',
    geometry: assemble(parts),
    swim: { mode: 'flap', amp: 0.32, freq: 1.6, waves: 0.8, z0: 0.18, len: 0.72 },
  };
}

// ---------- アカエイ / ヤッコエイ (stingrays: round discs that lie on the sand) ----------
function stingray({ id, ja, en, size, top, spots, note }) {
  const r = size / 2;
  const disc = new THREE.SphereGeometry(1, 28, 10).scale(r * 0.92, 0.07 * size, r);
  const parts = [
    part(disc, countershade(top, '#efe6d8', -0.005, 0.01)),
    part(ellipsoid(r * 0.45, 0.06 * size, r * 0.35), top, { pos: [0.02, 0.03 * size, 0] }), // the body under the disc
    part(new THREE.CylinderGeometry(0.004, 0.022 * size, size * 0.95, 5).rotateZ(Math.PI / 2), top, { pos: [-r - size * 0.42, 0, 0] }), // tail
    part(new THREE.ConeGeometry(0.008, 0.07 * size, 4).rotateZ(Math.PI / 2), '#ddd5c0', { pos: [-r - size * 0.2, 0.012, 0] }), // the spine
    // eyes on top, on little bumps
    part(ellipsoid(0.03 * size, 0.025 * size, 0.03 * size), top, { pos: [r * 0.38, 0.065 * size, 0.09 * size] }),
    part(ellipsoid(0.03 * size, 0.025 * size, 0.03 * size), top, { pos: [r * 0.38, 0.065 * size, -0.09 * size] }),
    part(ellipsoid(0.014 * size, 0.014 * size, 0.014 * size, 8), '#14161c', { pos: [r * 0.4, 0.085 * size, 0.09 * size] }),
    part(ellipsoid(0.014 * size, 0.014 * size, 0.014 * size, 8), '#14161c', { pos: [r * 0.4, 0.085 * size, -0.09 * size] }),
  ];
  if (spots) {
    const rnd = seeded(5);
    for (let i = 0; i < 60; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.85;
      const x = Math.cos(a) * d * 0.92, z = Math.sin(a) * d;
      const y = 0.07 * size * Math.sqrt(Math.max(0, 1 - (x / (r * 0.92)) ** 2 - (z / r) ** 2));
      parts.push(part(ellipsoid(0.03 * size, 0.008, 0.03 * size, 6), spots, { pos: [x, y + 0.002, z] }));
    }
  }
  return {
    id, name: L2(ja, en), size, habitat: ['sand', 'lagoon'], water: ['tropical', 'temperate'], note,
    geometry: assemble(parts),
    swim: { mode: 'flap', amp: 0.05 * size, freq: 2.2, waves: 1.6, z0: 0.1 * size, len: r * 0.9 },
  };
}
export const stingrayRed = () => stingray({ id: 'stingrayRed', ja: 'アカエイ', en: 'Red stingray', size: 1.0, top: '#9c7650', note: '幅1.0 · 丸い平たい体、尾にとげ · 砂色 · 砂地にじっと伏せ、近づくとふわっと移動' });
export const stingrayBlue = () => stingray({ id: 'stingrayBlue', ja: 'ヤッコエイ', en: 'Blue-spotted stingray', size: 0.8, top: '#b98a3e', spots: '#3d86e8', note: '幅0.8 · 丸い平たい体 · 黄土色に青い斑点 · 砂地やサンゴの下に伏せる' });

// ---------- sharks: one builder for the slim reef sharks and the big ones ----------
function shark({ L, prof, color, belly = '#f1efe9', line = -0.03, dorsal, second = true, pect, tail, tips = null, tipColor, head = null, gills = 0, eye = null, ...rest }) {
  const torso = body(prof.map(([r, x]) => [r * L, x * L]), 22).translate(-L / 2, 0, 0).scale(1, 0.95, 0.85);
  const parts = [
    part(torso, countershade(color, belly, line * L, 0.025 * L)),
    part(fin(dorsal.map(([x, y]) => [x * L, y * L]), 0.012 * L), color, { pos: [0.03 * L, 0.07 * L, 0] }),
    part(fin(pect.map(([x, y]) => [x * L, y * L]), 0.01 * L), color, { pos: [0.18 * L, -0.05 * L, 0.06 * L], rot: [-1.0, 0, 0] }),
    part(fin(pect.map(([x, y]) => [x * L, y * L]), 0.01 * L), color, { pos: [0.18 * L, -0.05 * L, -0.06 * L], rot: [1.0, 0, 0] }),
    part(fin(tail.map(([x, y]) => [x * L, y * L]), 0.012 * L), color, { pos: [-0.47 * L, 0, 0] }),
  ];
  if (second) parts.push(part(fin([[0.025 * L, 0], [-0.03 * L, 0], [-0.03 * L, 0.05 * L]], 0.009 * L), color, { pos: [-0.28 * L, 0.04 * L, 0] }));
  // pale or dark tips: small caps over the dorsal and the tail's top lobe
  if (tips) for (const [pts, pos, rot] of tips) parts.push(part(fin(pts.map(([x, y]) => [x * L, y * L]), 0.016 * L), tipColor, { pos: pos.map((v) => v * L), rot }));
  for (let i = 0; i < gills; i++) {
    for (const s of [1, -1]) parts.push(part(new THREE.BoxGeometry(0.004 * L, 0.06 * L, 0.004 * L), '#4a4f58', { pos: [(0.27 - i * 0.022) * L, -0.005 * L, s * 0.073 * L], rot: [0, 0, 0.12] }));
  }
  if (head) parts.push(...head(L));
  if (eye) parts.push(...eyes(...eye.map((v) => v * L)));
  return { geometry: assemble(parts), size: L, ...rest };
}

// ---------- ネムリブカ (whitetip reef shark) ----------
export function whitetipShark() {
  const L = 1.6;
  const s = shark({
    L, color: '#8a8f93',
    prof: [[0, 0], [0.03, 0.06], [0.06, 0.25], [0.09, 0.55], [0.1, 0.7], [0.095, 0.85], [0.075, 0.95], [0.04, 0.995], [0, 1]], // blunt, rounded head
    dorsal: [[0.08, 0], [-0.07, 0], [-0.07, 0.15]],
    pect: [[0.07, 0], [-0.06, 0], [-0.1, -0.15]],
    tail: [[0.03, 0], [-0.2, 0.17], [-0.15, 0.01], [-0.12, -0.09]],
    tips: [
      [[[-0.035, 0.1], [-0.068, 0.1], [-0.07, 0.15]], [0.03, 0.07, 0]],
      [[[-0.165, 0.13], [-0.2, 0.17], [-0.19, 0.12]], [-0.47, 0, 0]],
    ],
    tipColor: '#f4f2ec',
    eye: [0.4, 0.03, 0.055, 0.012],
  });
  return {
    ...s, id: 'whitetip', name: L2('ネムリブカ', 'Whitetip reef shark'), habitat: ['reef'], water: ['tropical'],
    note: '1.6 · 細身、頭が丸い · 灰、ひれの先が白 · 昼はサンゴの下で休む、夕方から泳ぐ',
    swim: { mode: 'bend', amp: 0.15, freq: 2.2, waves: 0.7, nose: L / 2, len: L },
  };
}

// ---------- シュモクザメ (scalloped hammerhead) ----------
export function hammerhead() {
  const L = 2.6;
  const s = shark({
    L, color: '#857f71', line: -0.02,
    prof: [[0, 0], [0.025, 0.06], [0.055, 0.3], [0.08, 0.6], [0.085, 0.75], [0.07, 0.9], [0.04, 0.97], [0.02, 1]],
    dorsal: [[0.06, 0], [-0.07, 0], [-0.06, 0.17]], // tall
    pect: [[0.06, 0], [-0.05, 0], [-0.09, -0.12]],
    tail: [[0.03, 0], [-0.22, 0.17], [-0.15, 0.01], [-0.12, -0.08]],
    head: (L) => [
      part(ellipsoid(0.06 * L, 0.016 * L, 0.16 * L, 18), countershade('#857f71', '#ece8de', -0.004 * L, 0.006 * L), { pos: [0.47 * L, -0.005 * L, 0] }), // the hammer
      ...eyes(0.47 * L, 0, 0.16 * L, 0.009 * L),
    ],
  });
  return {
    ...s, id: 'hammerhead', name: L2('シュモクザメ', 'Scalloped hammerhead'), habitat: ['ocean'], water: ['tropical', 'temperate'],
    note: '2.6 · T字形の頭（目は両端）、高い背びれ · 灰褐色 · 外洋の深場を群れで',
    swim: { mode: 'bend', amp: 0.22, freq: 1.9, waves: 0.7, nose: L / 2, len: L },
  };
}

// ---------- ホホジロザメ (great white, for colder seas) ----------
export function greatWhite() {
  const L = 4.2;
  const s = shark({
    L, color: '#6f7780', line: -0.005, second: true,
    prof: [[0, 0], [0.03, 0.05], [0.08, 0.25], [0.13, 0.55], [0.135, 0.68], [0.11, 0.85], [0.07, 0.95], [0.03, 0.99], [0, 1]], // stout, pointed snout
    dorsal: [[0.06, 0], [-0.06, 0], [-0.05, 0.13]],
    pect: [[0.07, 0], [-0.04, 0], [-0.12, -0.16]],
    tail: [[0.03, 0], [-0.17, 0.17], [-0.12, 0.0], [-0.17, -0.15]], // almost symmetric crescent
    gills: 5,
    head: (L) => [
      part(new THREE.BoxGeometry(0.1 * L, 0.006 * L, 0.11 * L), '#3b3f46', { pos: [0.4 * L, -0.06 * L, 0], rot: [0, 0, 0.12] }), // mouth line
      ...eyes(0.42 * L, 0.02 * L, 0.055 * L, 0.008 * L),
    ],
  });
  return {
    ...s, id: 'greatWhite', name: L2('ホホジロザメ', 'Great white shark'), habitat: ['ocean'], water: ['temperate', 'cold'],
    note: '4.2 · がっしり、尖った鼻、5本のえらあな · 背は灰、腹は白（くっきり分かれる）· 温帯〜寒帯の外洋（他の海用）',
    swim: { mode: 'bend', amp: 0.35, freq: 1.3, waves: 0.6, nose: L / 2, len: L },
  };
}

// ---------- コバンザメ (remora — rides along under the whale shark) ----------
export function remora() {
  const L = 0.5;
  const parts = [
    part(body([[0, 0], [0.02, 0.05], [0.035, 0.2], [0.04, 0.35], [0.035, 0.45], [0, 0.5]], 12).translate(-0.25, 0, 0).scale(1, 0.8, 1.1), countershade('#4b4f55', '#9aa0a6', 0, 0.01)),
    part(ellipsoid(0.08, 0.008, 0.025, 10), '#b9b1a0', { pos: [0.12, 0.03, 0] }), // the sucker disc
    part(new THREE.BoxGeometry(0.4, 0.01, 0.07), '#d8d8d4', { pos: [-0.02, 0, 0] }), // pale side stripe (shows on both sides)
    part(fin([[0.02, 0], [-0.1, 0.05], [-0.07, 0], [-0.1, -0.05]], 0.006), '#4b4f55', { pos: [-0.23, 0, 0] }),
    part(fin([[0, 0], [-0.16, 0], [-0.15, 0.025]], 0.005), '#4b4f55', { pos: [-0.04, 0.028, 0] }),
    ...eyes(0.18, 0.012, 0.03, 0.007),
  ];
  return {
    id: 'remora', name: L2('コバンザメ', 'Remora'), size: L, habitat: ['ocean'], water: ['tropical', 'temperate'],
    note: '0.5 · 細身、頭の上に吸盤 · 黒灰に白い帯 · ジンベエザメやマンタにくっついて旅する',
    geometry: assemble(parts),
    swim: { mode: 'bend', amp: 0.03, freq: 4, waves: 0.6, nose: 0.25, len: L },
  };
}

export const RAYS_SHARKS = { eagleRay, stingrayRed, stingrayBlue, whitetipShark, hammerhead, greatWhite, remora };

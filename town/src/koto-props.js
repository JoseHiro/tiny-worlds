// Small things of the old capital's streets and precincts (koto/DESIGN.md §3.2, §3.4, §4 animals):
// stone lanterns, guardian lions and foxes, votive plaques, fortune knots, stone fences, sacred rope, paper lanterns,
// bamboo fences, a tea-house bench with its parasol, signposts, the round post box, a well, a stone gutter — and the cat,
// pigeons, a heron, a kite and a squirrel. Lamps share one glowing material: setLamps(0…1) lights them all at dusk.
import * as THREE from 'three';
import { mat, mesh, box, cyl } from '../../airport/src/parts.js';
import { roof } from './roofs.js';
import { KOTO, M, finish } from './koto.js';
import { signTexture } from './buildings.js';

// paper and fire glow: one material for all lamps, one per lantern design (its text drawn on)
export const LAMP = new THREE.MeshStandardMaterial({ color: 0xf6ead0, emissive: 0xffb35c, emissiveIntensity: 0.12, roughness: 0.8 });
const lampMats = new Set([LAMP]);
export function setLamps(k) { for (const m of lampMats) m.emissiveIntensity = 0.12 + k * 1.5; }
const stone = () => M(KOTO.stone, { flatShading: true });
const prop = (g, kind, extra) => { finish(g, kind, extra); g.userData.kind = 'prop'; g.userData.prop = kind; return g; };

// ---------- 石灯籠: kasuga (tall, a six-sided roof) or yukimi (low, wide roof on three legs) ----------
export function toro({ kind = 'kasuga', h = 2.0 } = {}) {
  const g = new THREE.Group(), s = stone();
  if (kind === 'yukimi') {
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; const l = cyl(0.06, 0.08, 0.6, s, Math.cos(a) * 0.35, 0.3, Math.sin(a) * 0.35, 6); l.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); g.add(l); }
    g.add(cyl(0.3, 0.3, 0.1, s, 0, 0.62, 0, 6));
    g.add(box(0.4, 0.3, 0.4, LAMP, 0, 0.82, 0));
    g.add(mesh(new THREE.ConeGeometry(0.85, 0.35, 6), s, 0, 1.15, 0));
    g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), s, 0, 1.38, 0));
    return prop(g, 'toro', { light: [0, 0.82, 0] });
  }
  const k = h / 2;
  g.add(cyl(0.38 * k, 0.42 * k, 0.2 * k, s, 0, 0.1 * k, 0, 6)); // base
  g.add(cyl(0.1 * k, 0.12 * k, 0.8 * k, s, 0, 0.6 * k, 0, 10)); // the post
  g.add(cyl(0.32 * k, 0.24 * k, 0.15 * k, s, 0, 1.07 * k, 0, 6));
  g.add(cyl(0.22 * k, 0.22 * k, 0.32 * k, s, 0, 1.3 * k, 0, 6)); // the fire box…
  for (let j = 0; j < 2; j++) { const win = box(0.2 * k, 0.18 * k, 0.46 * k, LAMP, 0, 1.3 * k, 0); win.rotation.y = j * Math.PI / 2; g.add(win); } // …and its windows
  g.add(mesh(new THREE.ConeGeometry(0.48 * k, 0.32 * k, 6), s, 0, 1.6 * k, 0));
  g.add(mesh(new THREE.SphereGeometry(0.09 * k, 8, 6), s, 0, 1.8 * k, 0));
  return prop(g, 'toro', { light: [0, 1.3 * k, 0] });
}

// ---------- 狛犬・狐: one of a guardian pair on its pedestal (side 1 = 阿 mouth open, -1 = 吽) ----------
export function komainu({ kind = 'lion', side = 1 } = {}) {
  const g = new THREE.Group(), s = stone(), m = M(kind === 'fox' ? 0xe8e4da : 0x9a968c, { roughness: 0.9 });
  g.add(box(0.8, 0.8, 0.8, s, 0, 0.4, 0)); g.add(box(0.9, 0.1, 0.9, s, 0, 0.85, 0));
  const y = 0.9;
  const body = mesh(new THREE.SphereGeometry(0.22, 12, 10), m, -0.05, y + 0.3, 0); body.scale.set(1.2, 1.4, 0.9); g.add(body);
  for (const z of [0.12, -0.12]) g.add(cyl(0.06, 0.06, 0.3, m, 0.15, y + 0.15, z, 6));
  const head = mesh(new THREE.SphereGeometry(kind === 'fox' ? 0.15 : 0.2, 12, 10), m, 0.1, y + 0.68, 0); g.add(head);
  if (kind === 'fox') {
    const snout = mesh(new THREE.ConeGeometry(0.07, 0.22, 8), m, 0.28, y + 0.64, 0); snout.rotation.z = -Math.PI / 2; g.add(snout);
    for (const z of [0.08, -0.08]) g.add(mesh(new THREE.ConeGeometry(0.05, 0.16, 4), m, 0.06, y + 0.86, z));
    const tail = mesh(new THREE.CapsuleGeometry(0.07, 0.35, 4, 8), m, -0.3, y + 0.45, 0); tail.rotation.z = 0.5; g.add(tail);
    g.add(mesh(new THREE.ConeGeometry(0.2, 0.18, 10, 1, true).rotateZ(Math.PI), M(0xc8283a, { side: THREE.DoubleSide }), 0.08, y + 0.48, 0)); // the red bib
    g.add(box(0.12, 0.04, 0.04, M(0xc9a24a), 0.3, y + 0.6, 0)); // a key (or a jewel) in its mouth
  } else {
    const mane = mesh(new THREE.SphereGeometry(0.24, 10, 8), mat(0x8a867c, { roughness: 1, flatShading: true }), 0.0, y + 0.66, 0); g.add(mane);
    g.add(box(0.12, side > 0 ? 0.08 : 0.03, 0.14, M(0x5a564e), 0.28, y + 0.6, 0)); // the mouth: open (阿) or shut (吽)
    const tail = mesh(new THREE.DodecahedronGeometry(0.12, 0), m, -0.32, y + 0.55, 0); g.add(tail);
  }
  return prop(g, kind === 'fox' ? 'kitsune' : 'komainu', { side });
}
export function guardianPair({ kind = 'lion', gap = 4 } = {}) {
  const g = new THREE.Group();
  for (const s of [1, -1]) { const k = komainu({ kind, side: s }); k.position.x = s * gap / 2; k.rotation.y = -Math.PI / 2 + s * 0.35; g.add(k); }
  g.userData = { kind: 'prop', prop: 'guardianPair' };
  return g;
}

// ---------- 絵馬掛け: a little roofed rack hung thick with wooden plaques ----------
export function emaRack({ w = 2.2 } = {}) {
  const g = new THREE.Group(), wood = M(KOTO.plainWood);
  for (const x of [-w / 2, w / 2]) g.add(box(0.1, 1.8, 0.1, wood, x, 0.9, 0));
  for (const y of [1.05, 1.5]) g.add(box(w, 0.05, 0.06, wood, 0, y, 0));
  const tones = [0xe0c896, 0xd8bc88, 0xe8d4a8].map((c) => M(c));
  const ink = M(0x3a2c22);
  for (const y of [0.9, 1.35]) for (let x = -w / 2 + 0.15; x < w / 2 - 0.05; x += 0.13) for (const z of [0.04, -0.04]) {
    const p = box(0.15, 0.11, 0.015, tones[Math.round(x * 13 + y) & 1 ? 1 : (Math.round(x * 7) % 3 + 3) % 3], x + (z > 0 ? 0 : 0.06), y + (Math.sin(x * 9) * 0.02), z);
    p.rotation.z = Math.sin(x * 17 + y) * 0.12; g.add(p);
    if (z > 0) g.add(box(0.08, 0.015, 0.016, ink, x, y + 0.01, z + 0.002));
  }
  const R = roof({ kind: 'gable', w: w + 0.5, d: 0.8, h: 0.3, material: 'copper', onigawara: false }); R.position.y = 1.8; g.add(R);
  return prop(g, 'emaRack');
}

// ---------- おみくじ結び所: strings between posts, tied with white paper slips ----------
export function omikujiRack({ w = 2 } = {}) {
  const g = new THREE.Group(), wood = M(KOTO.plainWood), white = M(0xfafaf6, { roughness: 0.9 });
  for (const x of [-w / 2, w / 2]) g.add(box(0.08, 1.5, 0.08, wood, x, 0.75, 0));
  for (const y of [0.8, 1.05, 1.3]) {
    g.add(box(w, 0.015, 0.015, M(0x8a7a5a), 0, y, 0));
    for (let x = -w / 2 + 0.08; x < w / 2 - 0.05; x += 0.055 + (Math.sin(x * 31 + y) + 1) * 0.02) { const k = box(0.03, 0.07, 0.03, white, x, y - 0.015, 0); k.rotation.z = Math.sin(x * 9) * 0.3; g.add(k); }
  }
  return prop(g, 'omikujiRack');
}

// ---------- 玉垣: a low stone fence · 注連縄: a sacred rope with paper streamers, between two points ----------
export function tamagaki({ length = 8, h = 0.9 } = {}) {
  const g = new THREE.Group(), s = stone();
  for (let x = -length / 2; x <= length / 2 + 0.01; x += 0.9) { g.add(box(0.18, h, 0.18, s, x, h / 2, 0)); g.add(mesh(new THREE.ConeGeometry(0.14, 0.12, 4).rotateY(Math.PI / 4), s, x, h + 0.06, 0)); }
  for (const y of [h * 0.35, h * 0.8]) g.add(box(length, 0.1, 0.1, s, 0, y, 0));
  return prop(g, 'tamagaki');
}
export function shimenawa({ w = 3, sag = 0.3, thick = 0.1 } = {}) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-w / 2, 0, 0), new THREE.Vector3(0, -sag, 0), new THREE.Vector3(w / 2, 0, 0)]);
  g.add(mesh(new THREE.TubeGeometry(curve, 20, thick, 8), M(0xc9b07a)));
  const white = M(0xffffff, { roughness: 0.9 });
  for (const t of [0.2, 0.4, 0.6, 0.8]) { const p = curve.getPointAt(t); for (let k = 0; k < 4; k++) g.add(box(0.13, 0.1, 0.01, white, p.x + (k % 2 ? 0.05 : -0.05), p.y - thick - 0.06 - k * 0.09, 0.04)); }
  return prop(g, 'shimenawa');
}

// ---------- 行灯 (a standing paper lamp with a shop name) and 提灯 (a hanging round lantern) ----------
const textLamp = new Map();
function lampWithText(text, { bg = '#f6ead0', fg = '#2a2018', font = 'bold 72px serif', w = 128, h = 256, vertical = true } = {}) {
  const key = [text, bg, fg].join('|');
  if (textLamp.has(key)) return textLamp.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (vertical) [...text].forEach((ch, i, a) => x.fillText(ch, w / 2, h / 2 + (i - (a.length - 1) / 2) * (h / (a.length + 1)))); else x.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffb35c, emissiveMap: t, emissiveIntensity: 0.12, roughness: 0.8 });
  lampMats.add(m); textLamp.set(key, m);
  return m;
}
export function andon({ text = '御料理' } = {}) {
  const g = new THREE.Group(), wood = M(KOTO.wood);
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(box(0.05, 1.2, 0.05, wood, x * 0.2, 0.6, z * 0.2));
  const paper = lampWithText(text);
  g.add(box(0.36, 0.6, 0.36, paper, 0, 0.8, 0));
  g.add(box(0.5, 0.05, 0.5, wood, 0, 1.13, 0)); g.add(box(0.44, 0.05, 0.44, wood, 0, 0.12, 0));
  return prop(g, 'andon');
}
export function chochin({ color = 'red', text = '祇園', size = 1 } = {}) {
  const g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(0.06 + Math.sin(t * Math.PI) * 0.18, -t * 0.55)); }
  const body = color === 'red' ? lampWithText(text, { bg: '#c8283a', fg: '#1d1f23', font: 'bold 64px serif', w: 256, h: 128, vertical: false }) : lampWithText(text, { bg: '#f6ead0', fg: '#2a2018', font: 'bold 64px serif', w: 256, h: 128, vertical: false });
  g.add(mesh(new THREE.LatheGeometry(prof, 14), body));
  g.add(cyl(0.08, 0.08, 0.06, M(0x1d1f23), 0, 0, 0, 10)); g.add(cyl(0.08, 0.08, 0.06, M(0x1d1f23), 0, -0.56, 0, 10));
  g.add(cyl(0.01, 0.01, 0.2, M(0x1d1f23), 0, 0.12, 0, 4));
  g.scale.setScalar(size);
  g.userData.dynamic = true; // it swings a little
  prop(g, 'chochin');
  g.userData.update = (t) => { g.rotation.z = Math.sin(t * 1.3 + g.id) * 0.04; };
  return g;
}

// ---------- 竹垣: kenninji (tight upright bamboo), koetsu (low, diagonal lattice, curved top), yotsume (open grid) ----------
const bambooM = () => M(0xb8a46a, { roughness: 0.8 }), cordM = () => M(0x2a2018);
export function takegaki({ kind = 'kenninji', length = 4, h = 1.8 } = {}) {
  const g = new THREE.Group(), b = bambooM(), post = M(0x7a5a40);
  for (const x of [-length / 2, length / 2]) g.add(cyl(0.07, 0.07, h + 0.1, post, x, (h + 0.1) / 2, 0, 8));
  if (kind === 'kenninji') {
    g.add(box(length, h, 0.04, M(0xa8945a, { roughness: 0.85 }), 0, h / 2, 0));
    for (let x = -length / 2 + 0.05; x < length / 2; x += 0.07) g.add(box(0.05, h, 0.03, b, x, h / 2, 0.025)); // the split bamboo faces
    for (const y of [h * 0.2, h * 0.5, h * 0.8]) for (const z of [0.07, -0.07]) { const r = cyl(0.025, 0.025, length, b, 0, y, z, 6); r.rotation.z = Math.PI / 2; g.add(r); }
    for (const y of [h * 0.2, h * 0.5, h * 0.8]) for (let x = -length / 2 + 0.3; x < length / 2; x += 0.6) g.add(box(0.03, 0.06, 0.18, cordM(), x, y, 0));
  } else if (kind === 'koetsu') {
    const hh = h * 0.6;
    for (let x = -length / 2; x < length / 2; x += 0.2) for (const d of [1, -1]) { const s = box(0.025, hh * 1.25, 0.025, b, x + 0.1, hh / 2, d * 0.01); s.rotation.z = d * 0.6; g.add(s); }
    const top = new THREE.CatmullRomCurve3([new THREE.Vector3(-length / 2, hh * 1.2, 0), new THREE.Vector3(0, hh * 1.05, 0), new THREE.Vector3(length / 2, hh * 0.6, 0)]);
    g.add(mesh(new THREE.TubeGeometry(top, 16, 0.08, 6), M(0x9a8650)));
  } else {
    for (let x = -length / 2; x <= length / 2 + 0.01; x += 0.3) g.add(cyl(0.022, 0.022, h * 0.6, b, x, h * 0.3, 0, 6));
    for (const y of [h * 0.12, h * 0.3, h * 0.48]) { const r = cyl(0.022, 0.022, length, b, 0, y, 0.03, 6); r.rotation.z = Math.PI / 2; g.add(r); }
  }
  return prop(g, 'takegaki', { fence: kind });
}

// ---------- 縁台 with red felt (緋毛氈) and the tea-house parasol (野点傘) ----------
export function endai({ umbrella = true, length = 1.8 } = {}) {
  const g = new THREE.Group(), wood = M(KOTO.oldWood);
  g.add(box(length, 0.08, 0.6, wood, 0, 0.45, 0));
  for (const x of [-length / 2 + 0.1, length / 2 - 0.1]) for (const z of [0.22, -0.22]) g.add(box(0.07, 0.42, 0.07, wood, x, 0.21, z));
  g.add(box(length + 0.05, 0.02, 0.66, M(0xc8283a, { roughness: 1 }), 0, 0.5, 0));
  for (const z of [0.33, -0.33]) g.add(box(length + 0.05, 0.12, 0.01, M(0xc8283a, { roughness: 1 }), 0, 0.45, z));
  if (umbrella) { const u = wagasa({ color: 0xc8283a, r: 1.4 }); u.position.set(-length / 2 - 0.3, 0, -0.3); g.add(u); }
  return prop(g, 'endai', { seats: [[-length / 4, 0.5, 0], [length / 4, 0.5, 0]] });
}
// an open paper umbrella on its pole (野点傘 when big, a 和傘 when small — people carry their own, see person carry)
export function wagasa({ color = 0xc8283a, r = 1.4, pole = 2.4 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.03, 0.035, pole, M(0x8a6a4a), 0, pole / 2, 0, 6));
  g.add(mesh(new THREE.ConeGeometry(r, r * 0.35, 20, 1, true), M(color, { side: THREE.DoubleSide, roughness: 0.75 }), 0, pole, 0));
  for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; const rib = box(0.01, 0.01, r, M(0xe8d4a8), Math.cos(a) * r / 2, pole - r * 0.18, Math.sin(a) * r / 2); rib.rotation.y = -a + Math.PI / 2; rib.rotation.x = 0.33; g.add(rib); }
  g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), M(0x2a2018), 0, pole + r * 0.18, 0));
  g.userData = { kind: 'prop', prop: 'wagasa' };
  return g;
}

// ---------- 道標: a wooden signpost with arrows, or a carved stone one ----------
export function michishirube({ kind = 'wood', lines = [['←', '清水寺'], ['→', '竹林の小径']] } = {}) {
  const g = new THREE.Group();
  if (kind === 'stone') {
    g.add(box(0.3, 1.4, 0.3, stone(), 0, 0.7, 0));
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 1.1), lampWithText(lines[0][1] + 'みち', { bg: '#a9a59a', fg: '#4a463e', font: 'bold 54px serif' })); t.position.set(0, 0.75, 0.152); t.material.emissiveIntensity = 0; g.add(t);
    return prop(g, 'michishirube');
  }
  g.add(box(0.12, 2.2, 0.12, M(KOTO.oldWood), 0, 1.1, 0));
  lines.forEach(([arrow, name], i) => {
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.26, 0.04), [M(KOTO.plainWood), M(KOTO.plainWood), M(KOTO.plainWood), M(KOTO.plainWood), new THREE.MeshStandardMaterial({ map: signTexture(arrow === '←' ? `← ${name}` : `${name} →`, { w: 512, h: 96, font: 'bold 56px serif', bg: '#d8c4a0', fg: '#2a2018' }) }), M(KOTO.plainWood)]);
    board.position.set(arrow === '←' ? -0.5 : 0.5, 1.9 - i * 0.34, 0.07); g.add(board);
  });
  return prop(g, 'michishirube');
}

// ---------- 丸ポスト (the old round red post box) · 井戸 (a well with a pulley) · a stone gutter with water ----------
export function maruPost() {
  const g = new THREE.Group(), red = M(0xc8283a, { roughness: 0.5 });
  g.add(cyl(0.25, 0.25, 1.1, red, 0, 0.55, 0, 18));
  g.add(mesh(new THREE.SphereGeometry(0.27, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 1.1, 0));
  g.add(cyl(0.28, 0.28, 0.04, red, 0, 1.1, 0, 18));
  g.add(box(0.03, 0.05, 0.2, M(0x1d1f23), 0.25, 0.92, 0));
  g.add(cyl(0.2, 0.22, 0.1, M(0x3a3f4a), 0, 0.05, 0, 14));
  return prop(g, 'maruPost');
}
export function ido() {
  const g = new THREE.Group(), s = stone(), wood = M(KOTO.oldWood);
  g.add(mesh(new THREE.CylinderGeometry(0.6, 0.62, 0.7, 16, 1, true), M(KOTO.stone, { side: THREE.DoubleSide }), 0, 0.35, 0));
  g.add(mesh(new THREE.TorusGeometry(0.61, 0.06, 6, 20).rotateX(Math.PI / 2), s, 0, 0.7, 0));
  g.add(mesh(new THREE.CircleGeometry(0.58, 16).rotateX(-Math.PI / 2), M(0x1e2a2a), 0, 0.3, 0));
  for (const x of [-0.65, 0.65]) g.add(box(0.1, 1.9, 0.1, wood, x, 0.95, 0));
  g.add(box(1.4, 0.1, 0.1, wood, 0, 1.85, 0));
  const pulley = cyl(0.1, 0.1, 0.05, M(0x5a4636), 0, 1.7, 0, 12); pulley.rotation.x = Math.PI / 2; g.add(pulley);
  g.add(cyl(0.008, 0.008, 0.9, M(0x8a7a5a), 0.1, 1.25, 0, 4));
  g.add(cyl(0.14, 0.12, 0.22, M(KOTO.plainWood), 0.1, 0.82, 0, 10));
  g.add(box(1.0, 0.04, 0.6, wood, 0, 0.74, 0)); // a lid half on
  return prop(g, 'ido');
}
export function mizo({ length = 6, w = 0.5 } = {}) {
  const g = new THREE.Group(), s = stone();
  for (const z of [w / 2 + 0.1, -w / 2 - 0.1]) g.add(box(length, 0.2, 0.2, s, 0, 0.0, z));
  g.add(box(length, 0.05, w, M(0x3f5a48), 0, -0.25, 0));
  const water = box(length, 0.02, w, new THREE.MeshStandardMaterial({ color: 0x8fb8b8, roughness: 0.1, transparent: true, opacity: 0.6 }), 0, -0.1, 0); water.userData.keep = true; g.add(water);
  for (let x = -length / 2 + 1; x < length / 2; x += 2.5) g.add(box(0.5, 0.08, w + 0.4, s, x, 0.1, 0)); // little stone bridges to the doors
  return prop(g, 'mizo');
}
// 盛り塩: a cone of salt on a dish by the door
export function moriJio() {
  const g = new THREE.Group();
  g.add(cyl(0.12, 0.1, 0.03, M(0xf2ede2), 0, 0.015, 0, 12));
  g.add(mesh(new THREE.ConeGeometry(0.07, 0.14, 4).rotateY(Math.PI / 4), M(0xffffff), 0, 0.1, 0));
  g.userData = { kind: 'prop', prop: 'moriJio' };
  return g;
}

// ---------- animals: a cat, pigeons, a heron, a kite overhead, a squirrel. Each has update(t). ----------
export function cat({ color = 0xe8a050, mode = 'sit' } = {}) {
  const g = new THREE.Group(), m = M(color, { roughness: 0.9 }), w = M(0xf6f2ea);
  const body = mesh(new THREE.SphereGeometry(0.13, 12, 8), m, 0, 0.16, 0); body.scale.set(1.7, 1, 1); g.add(body);
  const head = mesh(new THREE.SphereGeometry(0.1, 12, 10), m, 0.22, 0.27, 0); g.add(head);
  for (const z of [0.05, -0.05]) g.add(mesh(new THREE.ConeGeometry(0.035, 0.07, 4), m, 0.22, 0.37, z));
  g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), w, 0.29, 0.24, 0));
  const tail = new THREE.Group(); tail.position.set(-0.2, 0.18, 0);
  const tl = mesh(new THREE.CapsuleGeometry(0.025, 0.22, 3, 6), m, 0, 0.12, 0); tail.add(tl); g.add(tail);
  const legs = [];
  for (const [x, z] of [[0.12, 0.06], [0.12, -0.06], [-0.12, 0.06], [-0.12, -0.06]]) { const l = mesh(new THREE.CapsuleGeometry(0.025, 0.08, 3, 6), m, x, 0.06, z); legs.push(l); g.add(l); }
  g.userData = { kind: 'animal', animal: 'cat', mode };
  g.userData.update = (t) => {
    const md = g.userData.mode;
    tail.rotation.x = Math.sin(t * 1.5 + g.id) * 0.4;
    if (md === 'sleep') { body.scale.set(1.5, 0.7 + Math.sin(t * 1.2) * 0.03, 1.2); head.position.set(0.17, 0.14, 0.05); tail.rotation.z = 1.4; legs.forEach((l) => (l.visible = false)); }
    else if (md === 'walk') { body.scale.set(1.7, 1, 1); head.position.set(0.22, 0.27, 0); legs.forEach((l, i) => (l.position.x = (i < 2 ? 0.12 : -0.12) + Math.sin(t * 8 + i * Math.PI * (i % 2 ? 1 : 0.5)) * 0.03)); }
    else { body.scale.set(1.1, 1.3, 1); body.position.set(-0.04, 0.18, 0); head.position.set(0.08, 0.37, 0); head.rotation.y = Math.sin(t * 0.4 + g.id) * 0.5; }
  };
  return g;
}
export function pigeon({ seed = 1 } = {}) {
  const g = new THREE.Group(), m = M(0x8a8f9a), n = M(0x6f8a7a, { metalness: 0.3 });
  const b = mesh(new THREE.SphereGeometry(0.07, 10, 8), m, 0, 0.09, 0); b.scale.set(1.5, 1, 1); g.add(b);
  const head = new THREE.Group(); head.position.set(0.09, 0.14, 0);
  head.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), n)); head.add(mesh(new THREE.ConeGeometry(0.01, 0.03, 4).rotateZ(-Math.PI / 2), M(0xe8673c), 0.04, 0, 0));
  g.add(head);
  g.userData = { kind: 'animal', animal: 'pigeon' };
  g.userData.update = (t) => { const k = Math.max(0, Math.sin(t * 3 + seed * 1.7)); head.position.x = 0.09 + k * 0.04; head.position.y = 0.14 - k * 0.08; }; // pecking
  return g;
}
export function sagi() { // a white heron standing in the shallows
  const g = new THREE.Group(), w = M(0xf6f4ee), y = M(0xe8b84a);
  const b = mesh(new THREE.SphereGeometry(0.14, 12, 8), w, 0, 0.62, 0); b.scale.set(1.7, 1, 0.9); g.add(b);
  const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0.18, 0.66, 0), new THREE.Vector3(0.24, 0.85, 0), new THREE.Vector3(0.2, 1.0, 0)]);
  g.add(mesh(new THREE.TubeGeometry(neck, 8, 0.035, 5), w));
  g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), w, 0.22, 1.02, 0));
  g.add(mesh(new THREE.ConeGeometry(0.018, 0.18, 4).rotateZ(-Math.PI / 2), y, 0.34, 1.01, 0));
  for (const z of [0.04, -0.04]) g.add(cyl(0.008, 0.008, 0.5, M(0x2a2a2a), 0, 0.25, z, 4));
  g.userData = { kind: 'animal', animal: 'sagi' };
  g.userData.update = (t) => { g.rotation.y = Math.floor(t / 4 + g.id) % 3 * 0.4; };
  return g;
}
export function tobi() { // a black kite circling high above
  const g = new THREE.Group(), m = M(0x5a4636);
  const body = new THREE.Group(); g.add(body);
  const b = mesh(new THREE.SphereGeometry(0.12, 8, 6), m); b.scale.set(2.2, 0.6, 0.7); body.add(b);
  const wings = [1, -1].map((s) => { const wg = new THREE.Group(); const w = box(0.4, 0.02, 0.9, m, 0, 0, s * 0.45); wg.add(w); body.add(wg); return [wg, s]; });
  body.add(box(0.25, 0.02, 0.2, m, -0.32, 0, 0)); // the forked tail
  g.userData = { kind: 'animal', animal: 'tobi', radius: 8, height: 14 };
  g.userData.update = (t) => {
    const a = t * 0.18 + g.id, R = g.userData.radius;
    body.position.set(Math.cos(a) * R, g.userData.height + Math.sin(t * 0.5) * 0.6, Math.sin(a) * R);
    body.rotation.set(0.35, -a - Math.PI / 2, 0);
    for (const [wg, s] of wings) wg.rotation.x = s * Math.sin(t * 2) * 0.12;
  };
  return g;
}
export function risu() { // a squirrel that hops and stops
  const g = new THREE.Group(), m = M(0x8a6a4a), hop = new THREE.Group(); g.add(hop);
  const b = mesh(new THREE.SphereGeometry(0.06, 10, 8), m, 0, 0.08, 0); b.scale.set(1.4, 1, 1); hop.add(b);
  hop.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), m, 0.08, 0.13, 0));
  const tail = mesh(new THREE.CapsuleGeometry(0.035, 0.12, 3, 6), M(0x9a7a5a), -0.08, 0.16, 0); tail.rotation.z = -0.4; hop.add(tail);
  g.userData = { kind: 'animal', animal: 'risu' };
  g.userData.update = (t) => { const p = (t * 1.5 + g.id) % 3; hop.position.y = p < 1 ? Math.abs(Math.sin(p * Math.PI * 3)) * 0.08 : 0; };
  return g;
}

// ---------- 石橋: a low granite bridge, gently arched, with stone rails (span along Z) ----------
export function ishibashi({ span = 5, w = 3.4, rise = 0.28 } = {}) {
  const g = new THREE.Group(), s = M(0x9a968c, { roughness: 0.8 });
  const arc = (t) => rise * Math.sin(Math.PI * t), n = 8;
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n, z0 = -span / 2 + t0 * span, z1 = -span / 2 + t1 * span;
    const seg = box(w, 0.3, Math.hypot(z1 - z0, arc(t1) - arc(t0)) + 0.02, s, 0, (arc(t0) + arc(t1)) / 2, (z0 + z1) / 2);
    seg.rotation.x = -Math.atan2(arc(t1) - arc(t0), z1 - z0); g.add(seg);
    for (const sx of [1, -1]) {
      const rail = box(0.16, 0.12, Math.hypot(z1 - z0, arc(t1) - arc(t0)) + 0.02, s, sx * (w / 2 - 0.1), (arc(t0) + arc(t1)) / 2 + 0.55, (z0 + z1) / 2);
      rail.rotation.x = seg.rotation.x; g.add(rail);
    }
  }
  for (const sx of [1, -1]) for (const z of [-span / 2, -span / 4, 0, span / 4, span / 2]) g.add(box(0.2, 0.55, 0.2, s, sx * (w / 2 - 0.1), arc(z / span + 0.5) + 0.32, z));
  return prop(g, 'ishibashi', { deck: (z) => arc(Math.min(1, Math.max(0, z / span + 0.5))) + 0.15 });
}

// ---------- 川 (a shallow town canal like 白川): stone walls, a pebbly bed, water that flows (along X) ----------
const flowTex = (() => { let t; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#5f8a8a'; x.fillRect(0, 0, 256, 64); x.strokeStyle = 'rgba(220,240,240,0.35)'; x.lineWidth = 2; for (let k = 0; k < 40; k++) { const y = (k * 37) % 64, x0 = (k * 71) % 256; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + 18 + (k % 5) * 6, y); x.stroke(); } t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }; })();
export function kawa({ length = 44, w = 4, depth = 0.9, water = 0.45 } = {}) {
  const g = new THREE.Group();
  const tones = [0x8f8b82, 0x9a968c, 0x86827a, 0xa39f94].map((c) => M(c, { flatShading: true, roughness: 0.95 }));
  for (const sz of [1, -1]) for (let row = 0; row < 2; row++) for (let x = -length / 2 + (row ? 0.3 : 0); x < length / 2 - 0.2; x += 0.62) {
    const b = box(0.6, depth / 2 - 0.02, 0.4, tones[(Math.round(x * 3) + row + (sz > 0 ? 1 : 0)) & 3], x + 0.3, -depth + depth / 4 + row * depth / 2, sz * (w / 2 - 0.2));
    b.rotation.y = Math.sin(x * 7) * 0.04; g.add(b);
  }
  for (const sz of [1, -1]) g.add(box(length, 0.1, 0.5, M(0xa9a59a), 0, 0.0, sz * (w / 2 - 0.15))); // the coping stones
  g.add(box(length, 0.05, w - 0.8, M(0x6f6a5a, { roughness: 1 }), 0, -depth, 0)); // the bed
  for (let k = 0; k < 40; k++) g.add(mesh(new THREE.DodecahedronGeometry(0.08 + (k % 3) * 0.04, 0), tones[k & 3], -length / 2 + ((k * 37) % 100) / 100 * length, -depth + 0.05, ((k * 53) % 100) / 100 * (w - 1.2) - (w - 1.2) / 2));
  const t = flowTex().clone(); t.needsUpdate = true; t.repeat.set(length / 6, 1);
  const water3 = new THREE.Mesh(new THREE.PlaneGeometry(length, w - 0.8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, color: 0xbfe0e0, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.78 }));
  water3.position.y = -depth + water; water3.userData.keep = true; g.add(water3);
  for (const sx of [1, -1]) { const end = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.8, water), new THREE.MeshStandardMaterial({ color: 0x5f8a8a, transparent: true, opacity: 0.6 })); end.position.set(sx * length / 2, -depth + water / 2, 0); end.rotation.y = sx * Math.PI / 2; end.userData.keep = true; g.add(end); } // the cut faces
  prop(g, 'kawa', { surface: -depth + water });
  g.userData.update = (time, dt = 0) => { t.offset.x -= dt * 0.08; };
  return g;
}

// ---------- 踏切: a level crossing post — crossbuck, two red lamps that blink in turn, a striped barrier arm ----------
// set(closed 0…1, t): lamps blink while closed > 0; the arm comes down as closed → 1. The arm reaches `arm` along +X.
export function fumikiri({ arm = 2.6 } = {}) {
  const g = new THREE.Group();
  const stripe = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const x = c.getContext('2d'); for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? '#1d1f23' : '#f2c94c'; x.fillRect(k * 8, 0, 8, 8); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const striped = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.6 });
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8), striped, 0, 1.6, 0));
  for (const r of [0.6, -0.6]) { const b = box(1.1, 0.14, 0.03, M(0xf6f4ee), 0, 3.0, 0.05); b.rotation.z = r; g.add(b); } // the crossbuck (×)
  g.add(box(0.9, 0.06, 0.06, M(0x1d1f23), 0, 2.45, 0.05));
  const lamps = [-1, 1].map((s) => { const m = new THREE.MeshStandardMaterial({ color: 0x5a1a1a, emissive: 0xff2a1a, emissiveIntensity: 0, roughness: 0.4 }); g.add(cyl(0.13, 0.13, 0.06, M(0x1d1f23), s * 0.38, 2.45, 0.08, 14)).children.at(-1).rotation.x = Math.PI / 2; const l = mesh(new THREE.CircleGeometry(0.1, 14), m, s * 0.38, 2.45, 0.12); g.add(l); return m; });
  g.add(box(0.3, 0.25, 0.25, M(0x2a2d33), 0, 0.9, -0.15)); // the mechanism box
  const pivot = new THREE.Group(); pivot.position.set(0.15, 0.95, 0.1); pivot.userData.dynamic = true;
  const a = mesh(new THREE.BoxGeometry(arm, 0.08, 0.06).translate(arm / 2, 0, 0), striped); pivot.add(a); g.add(pivot);
  for (const m of lamps) m.userData.dynamic = true;
  prop(g, 'fumikiri');
  g.userData.set = (closed, t) => {
    pivot.rotation.z = (1 - closed) * 1.45; // up (open) → down
    const on = closed > 0 ? Math.floor(t * 2.6) % 2 : -1;
    lamps.forEach((m, i) => (m.emissiveIntensity = on === i ? 2.4 : 0));
  };
  g.userData.set(0, 0);
  return g;
}
// a beach parasol and a mat
export function parasol({ color = 0xe8673c, mat2 = 0x3fc1c9 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.025, 0.025, 2.1, M(0xf6f4ee), 0, 1.05, 0, 6));
  const c = document.createElement('canvas'); c.width = 128; c.height = 8; const x = c.getContext('2d'); for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? '#f6f4ee' : '#' + new THREE.Color(color).getHexString(); x.fillRect(k * 16, 0, 16, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  g.add(mesh(new THREE.ConeGeometry(1.2, 0.4, 16, 1, true), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 }), 0, 2.0, 0));
  g.add(box(1.8, 0.02, 1.0, M(mat2, { roughness: 1 }), 0.3, 0.01, 0.9));
  g.userData = { kind: 'prop', prop: 'parasol' };
  return g;
}

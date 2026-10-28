// Temple and shrine buildings for the old capital (koto/DESIGN.md §3.1–3.2), beyond the main hall and torii in koto.js:
// the two-storey gate (山門), the five-storey pagoda (五重塔), the bell tower (鐘楼), the purification font (手水舎),
// a shrine's worship hall (拝殿, 流造), the amulet office (社務所), the great Buddha (大仏), a dry garden (枯山水),
// a pond with an arched bridge (池と太鼓橋), stone steps and walls (石段・石垣), a corner of old graves and a little
// roadside shrine (祠).
// Front faces +Z, ground y = 0, origin at the footprint centre.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, box, cyl } from '../../airport/src/parts.js';
import { roof } from './roofs.js';
import { KOTO, M, finish, torii } from './koto.js';
import { signTexture } from './buildings.js';
import { toro } from './koto-props.js';

const stoneM = () => M(KOTO.stone, { flatShading: true });
const bronze = () => mat(0x5f8a7a, { roughness: 0.55, metalness: 0.35 });
// a cluster of brackets (組物) on top of a column
const kumimono = (g, m, x, y, z, s = 1) => {
  g.add(box(0.6 * s, 0.16 * s, 0.6 * s, m, x, y + 0.08 * s, z));
  g.add(box(0.45 * s, 0.14 * s, 0.95 * s, m, x, y + 0.23 * s, z));
  g.add(box(0.95 * s, 0.14 * s, 0.45 * s, m, x, y + 0.37 * s, z));
};

// ---------- 山門 (a two-storey gate): three bays, guardian kings in the side bays, a skirt roof, a balcony, a big irimoya roof ----------
export function sanmon({ w = 12, d = 6, color = 'wood' } = {}) {
  const g = new THREE.Group();
  const body = M(color === 'shu' ? KOTO.shu : KOTO.oldWood), dark = M(KOTO.wood), plaster = M(KOTO.plaster);
  const B = 0.5, H1 = 3.2, H2 = 2.2;
  g.add(box(w + 2, B, d + 2, stoneM(), 0, B / 2, 0));
  const xs = [-w / 2, -w / 6, w / 6, w / 2], zs = [-d / 2, 0, d / 2];
  for (const x of xs) for (const z of zs) { g.add(cyl(0.22, 0.24, H1, body, x, B + H1 / 2, z, 12)); kumimono(g, body, x, B + H1, z); }
  // 仁王: a guardian behind a lattice in each side bay
  for (const [a, b] of [[xs[0], xs[1]], [xs[2], xs[3]]]) {
    const cx = (a + b) / 2, bw = b - a - 0.5;
    g.add(box(bw, H1 * 0.85, 1.6, M(0x2a2018), cx, B + H1 * 0.425, 0));
    g.add(mesh(new THREE.CapsuleGeometry(0.42, 1.1, 4, 10), M(0x9a5a3a), cx, B + 1.2, 0.45));
    g.add(mesh(new THREE.SphereGeometry(0.3, 10, 8), M(0x9a5a3a), cx, B + 2.25, 0.45));
    for (let x = -bw / 2; x <= bw / 2 + 0.01; x += 0.16) g.add(box(0.05, H1 * 0.85, 0.06, body, cx + x, B + H1 * 0.425, 0.84));
  }
  g.add(box(w + 0.8, 0.3, d + 0.8, dark, 0, B + H1 + 0.6, 0));
  const r1 = roof({ kind: 'hip', w: w + 3, d: d + 3, h: 1.3, sori: 0.18, corner: 0.5, ridge: false });
  r1.position.y = B + H1 + 0.75; g.add(r1);
  // the upper storey with a balcony and railing all round
  const Y2 = B + H1 + 1.55, uw = w - 1.4, ud = d - 1.2;
  g.add(box(uw + 1.6, 0.14, ud + 1.6, dark, 0, Y2, 0));
  g.add(box(uw, H2 * 0.5, ud, M(KOTO.oldWood), 0, Y2 + H2 * 0.25, 0));
  g.add(box(uw, H2 * 0.5, ud, plaster, 0, Y2 + H2 * 0.75, 0));
  for (let x = -uw / 2; x <= uw / 2 + 0.01; x += uw / 4) for (const z of [-ud / 2, ud / 2]) { g.add(cyl(0.16, 0.17, H2, body, x, Y2 + H2 / 2, z, 10)); kumimono(g, body, x, Y2 + H2, z, 0.8); }
  for (const s of [1, -1]) {
    g.add(box(uw + 1.5, 0.07, 0.08, body, 0, Y2 + 0.62, s * (ud / 2 + 0.75)));
    g.add(box(0.08, 0.07, ud + 1.5, body, s * (uw / 2 + 0.75), Y2 + 0.62, 0));
    for (let x = -uw / 2 - 0.7; x <= uw / 2 + 0.71; x += 0.7) g.add(box(0.07, 0.6, 0.07, body, x, Y2 + 0.33, s * (ud / 2 + 0.75)));
  }
  const gaku = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: signTexture('山門', { w: 256, h: 128, font: 'bold 84px serif', bg: '#1d1f23', fg: '#c9a24a' }), roughness: 0.7 }));
  gaku.position.set(0, Y2 + H2 * 0.7, ud / 2 + 0.02); g.add(gaku); // the name plaque
  g.add(box(uw + 1.2, 0.28, ud + 1.2, dark, 0, Y2 + H2 + 0.55, 0));
  const R = roof({ kind: 'irimoya', w: w + 3.4, d: d + 3.4, h: 2.9, sori: 0.22, corner: 0.7 });
  R.position.y = Y2 + H2 + 0.7; g.add(R);
  return finish(g, 'sanmon');
}

// ---------- 五重塔: five storeys, each smaller, deep eaves, and the bronze spire with nine rings (相輪) ----------
export function gojunoto({ tiers = 5, base = 4.4 } = {}) {
  const g = new THREE.Group();
  const shu = M(KOTO.shu, { roughness: 0.6 }), plaster = M(KOTO.plaster), dark = M(KOTO.wood);
  g.add(box(base + 3.4, 0.6, base + 3.4, stoneM(), 0, 0.3, 0));
  let y = 0.6;
  for (let i = 0; i < tiers; i++) {
    const s = base - i * 0.36, hb = i === 0 ? 2.3 : 1.6;
    g.add(box(s, hb, s, plaster, 0, y + hb / 2, 0));
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(cyl(0.13, 0.14, hb, shu, x * s / 2, y + hb / 2, z * s / 2, 8));
    for (const yy of [y + 0.1, y + hb - 0.12]) g.add(box(s + 0.06, 0.16, s + 0.06, shu, 0, yy, 0));
    for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { // a door on each side, with studs
      const dr = box(s * 0.32, hb * 0.6, 0.06, shu, Math.sin(r) * (s / 2 + 0.02), y + hb * 0.42, Math.cos(r) * (s / 2 + 0.02)); dr.rotation.y = r; g.add(dr);
    }
    if (i > 0) for (const s2 of [1, -1]) { g.add(box(s + 0.9, 0.06, 0.06, shu, 0, y + 0.42, s2 * (s / 2 + 0.4))); g.add(box(0.06, 0.06, s + 0.9, shu, s2 * (s / 2 + 0.4), y + 0.42, 0)); } // a little railing
    g.add(box(s + 0.8, 0.26, s + 0.8, shu, 0, y + hb + 0.13, 0)); // brackets
    g.add(box(s + 1.7, 0.12, s + 1.7, dark, 0, y + hb + 0.32, 0)); // rafters
    const R = roof({ kind: 'hogyo', w: s + 2.9, d: s + 2.9, h: 0.95, sori: 0.4, corner: 0.6, ridge: false });
    R.position.y = y + hb + 0.36; g.add(R);
    y += hb + 0.36 + 0.55;
  }
  // 相輪: the base, nine rings, the water-flame and the jewel
  const brz = bronze(), gold = mat(KOTO.gold, { metalness: 0.6, roughness: 0.35 });
  y += 0.35;
  g.add(box(0.9, 0.35, 0.9, brz, 0, y, 0));
  g.add(cyl(0.06, 0.08, 3.6, brz, 0, y + 1.9, 0, 8));
  for (let k = 0; k < 9; k++) g.add(cyl(0.3 - k * 0.012, 0.3 - k * 0.012, 0.07, brz, 0, y + 0.55 + k * 0.24, 0, 12));
  for (const r of [0, Math.PI / 2]) { const f = box(0.55, 0.5, 0.03, brz, 0, y + 3.0, 0); f.rotation.y = r; g.add(f); }
  g.add(mesh(new THREE.SphereGeometry(0.14, 10, 8), gold, 0, y + 3.45, 0));
  g.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), gold, 0, y + 3.7, 0));
  return finish(g, 'gojunoto', { height: y + 3.8 });
}

// ---------- 鐘楼: a stone base, four splayed posts, the bronze bell and the log that strikes it ----------
export function shoro() {
  const g = new THREE.Group();
  const wood = M(KOTO.oldWood), brz = mat(0x4f5f55, { roughness: 0.5, metalness: 0.4 });
  g.add(box(4.6, 1.0, 4.6, stoneM(), 0, 0.5, 0));
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const p = cyl(0.17, 0.2, 3.6, wood, x * 1.55, 2.8, z * 1.55, 10); p.rotation.set(z * -0.05, 0, x * 0.05); g.add(p); }
  for (const yy of [2.0, 4.5]) for (const s of [1, -1]) { g.add(box(3.5, 0.18, 0.18, wood, 0, yy, s * 1.5)); g.add(box(0.18, 0.18, 3.5, wood, s * 1.5, yy, 0)); }
  g.add(box(3.2, 0.24, 0.3, wood, 0, 4.4, 0));
  const prof = [[0, 3.95], [0.32, 3.95], [0.42, 3.85], [0.48, 3.4], [0.52, 2.9], [0.6, 2.75], [0.62, 2.7], [0, 2.7]].map(([r, h]) => new THREE.Vector2(r, h));
  const bell = mesh(new THREE.LatheGeometry(prof, 20), brz);
  g.add(bell);
  g.add(cyl(0.08, 0.08, 0.3, brz, 0, 4.1, 0, 8));
  for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) { const a = (k / 4) * Math.PI * 2 + 0.4; g.add(mesh(new THREE.SphereGeometry(0.035, 6, 4), brz, Math.cos(a) * 0.45, 3.6 - j * 0.12, Math.sin(a) * 0.45)); } // the knobs
  const log = new THREE.Group(); log.position.set(0, 3.95, 0.4);
  const beam = cyl(0.13, 0.13, 1.4, M(KOTO.plainWood), 0, -0.75, 0, 10); beam.rotation.x = Math.PI / 2; beam.position.z = 0.5; log.add(beam);
  for (const z of [0, 1.0]) log.add(cyl(0.01, 0.01, 0.75, M(0xd8c49a), 0, -0.37, z, 4));
  log.userData.dynamic = true;
  g.add(log);
  const R = roof({ kind: 'irimoya', w: 5.6, d: 5.6, h: 2.3, sori: 0.25, corner: 0.55 });
  R.position.y = 4.75; g.add(R);
  finish(g, 'shoro');
  // ring(k): the log is pulled back (k → 1) and swings into the bell
  g.userData.update = (t) => { log.rotation.x = -0.35 * Math.max(0, Math.sin(t * 0.6)) ** 4; };
  return g;
}

// ---------- 手水舎: four posts, a small roof, a stone basin with water from a dragon, bamboo ladles ----------
export function temizuya() {
  const g = new THREE.Group();
  const wood = M(KOTO.plainWood), stone = stoneM();
  g.add(box(3.4, 0.12, 2.6, stone, 0, 0.06, 0));
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(cyl(0.1, 0.11, 2.4, wood, x * 1.3, 1.3, z * 0.95, 8));
  for (const s of [1, -1]) g.add(box(2.9, 0.14, 0.14, wood, 0, 2.5, s * 0.95));
  g.add(box(1.8, 0.7, 0.9, stone, 0, 0.47, 0));
  g.add(box(1.6, 0.02, 0.7, new THREE.MeshStandardMaterial({ color: 0x5f8f9a, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }), 0, 0.81, 0));
  for (let k = 0; k < 4; k++) { // 柄杓 lying across a bamboo rack
    g.add(cyl(0.012, 0.012, 0.5, M(0xc9b07a), -0.6 + k * 0.4, 0.86, 0.38, 4)).children.at(-1).rotation.x = Math.PI / 2;
    g.add(cyl(0.06, 0.05, 0.08, M(0xc9b07a), -0.6 + k * 0.4, 0.88, 0.15, 8));
  }
  g.add(box(1.7, 0.04, 0.04, M(0x8fb06a), 0, 0.84, 0.42));
  const dragon = mesh(new THREE.CapsuleGeometry(0.1, 0.35, 4, 8), bronze(), 0, 1.1, -0.35); dragon.rotation.x = 1.0; g.add(dragon);
  g.add(cyl(0.015, 0.015, 0.3, new THREE.MeshStandardMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.6 }), 0, 0.93, -0.18, 5));
  const R = roof({ kind: 'irimoya', w: 3.8, d: 3.0, h: 1.3, sori: 0.22, corner: 0.35, material: 'copper' });
  R.position.y = 2.6; g.add(R);
  return finish(g, 'temizuya');
}

// ---------- 拝殿 (流造): a vermilion hall whose front roof slope runs on over the steps; bell, rope, offering box, sacred rope ----------
export function haiden({ w = 8, d = 6 } = {}) {
  const g = new THREE.Group();
  const shu = M(KOTO.shu, { roughness: 0.6 }), white = M(KOTO.plaster), dark = M(KOTO.wood);
  const P = 0.7, HC = 3.0;
  g.add(box(w + 2, P, d + 1.6, stoneM(), 0, P / 2, -0.3));
  g.add(box(w + 0.8, 0.14, d + 0.6, M(KOTO.oldWood), 0, P + 0.07, 0));
  g.add(box(w, HC, d, white, 0, P + HC / 2, 0));
  for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 4) for (const z of [d / 2, -d / 2]) g.add(cyl(0.16, 0.17, HC, shu, x, P + HC / 2, z, 10));
  for (const z of [d / 2, -d / 2]) for (const yy of [P + 0.4, P + HC - 0.1]) g.add(box(w + 0.2, 0.16, 0.18, shu, 0, yy, z));
  for (let x = -w / 2 + w / 8; x < w / 2; x += w / 4) { // lattice doors on the front
    g.add(box(w / 4 - 0.3, HC - 0.6, 0.05, M(0x3a2c22), x, P + HC / 2 + 0.1, d / 2 + 0.03));
    for (let k = -0.7; k <= 0.71; k += 0.14) g.add(box(0.03, HC - 0.6, 0.06, shu, x + k, P + HC / 2 + 0.1, d / 2 + 0.06));
  }
  for (const x of [-w / 2, w / 2]) g.add(cyl(0.15, 0.16, HC, shu, x, P + HC / 2, d / 2 + 2.2, 10)); // the front posts under the long slope
  g.add(box(w + 0.3, 0.2, 0.2, shu, 0, P + HC - 0.05, d / 2 + 2.2));
  const R = roof({ kind: 'nagare', w: w + 2.4, d: d + 5.2, h: 2.6, sori: 0.18, corner: 0.2, material: 'copper' });
  R.position.set(0, P + HC + 0.15, 1.2); g.add(R);
  for (let k = 0; k < 4; k++) g.add(box(3.0, 0.15, 0.4, M(KOTO.oldWood), 0, 0.08 + k * (P / 4), d / 2 + 1.9 - k * 0.35));
  g.add(box(2.0, 0.6, 0.7, dark, 0, P + 0.45, d / 2 + 1.0)); // 賽銭箱
  for (let x = -0.9; x <= 0.91; x += 0.15) g.add(box(0.05, 0.04, 0.72, M(0x1d1f23), x, P + 0.77, d / 2 + 1.0));
  // 鈴 and its rope: three bells, red-and-white ropes
  for (const x of [-1.2, 0, 1.2]) {
    g.add(mesh(new THREE.SphereGeometry(0.2, 12, 10), mat(KOTO.gold, { metalness: 0.7, roughness: 0.3 }), x, P + HC - 0.45, d / 2 + 1.6));
    for (let k = 0; k < 6; k++) g.add(cyl(0.045, 0.045, 0.3, M(k % 2 ? 0xf2ede2 : 0xc8283a), x, P + HC - 0.8 - k * 0.3, d / 2 + 1.6, 6));
  }
  // 注連縄 with paper streamers (紙垂)
  const rope = new THREE.CatmullRomCurve3([new THREE.Vector3(-w / 2, P + HC - 0.25, d / 2 + 2.25), new THREE.Vector3(0, P + HC - 0.6, d / 2 + 2.25), new THREE.Vector3(w / 2, P + HC - 0.25, d / 2 + 2.25)]);
  g.add(mesh(new THREE.TubeGeometry(rope, 24, 0.12, 8), M(0xc9b07a)));
  for (const t of [0.2, 0.4, 0.6, 0.8]) { const p = rope.getPointAt(t); shide(g, p.x, p.y - 0.12, p.z + 0.1); }
  return finish(g, 'haiden');
}
// a zig-zag paper streamer
export function shide(g, x, y, z, s = 1) {
  const white = M(0xffffff, { roughness: 0.9 });
  for (let k = 0; k < 4; k++) g.add(box(0.14 * s, 0.11 * s, 0.01, white, x + (k % 2 ? 0.05 : -0.05) * s, y - k * 0.1 * s, z));
}

// ---------- 社務所: a small white office with a window counter and shelves of amulets ----------
export function shamusho({ w = 4, d = 3 } = {}) {
  const g = new THREE.Group();
  g.add(box(w, 0.2, d, stoneM(), 0, 0.1, 0));
  g.add(box(w, 2.5, d, M(KOTO.plaster), 0, 1.45, 0));
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) g.add(box(0.16, 2.5, 0.16, M(KOTO.plainWood), x, 1.45, z));
  g.add(box(w * 0.7, 1.0, 0.05, M(0x3a2c22), 0, 1.55, d / 2 + 0.02)); // the open window
  g.add(box(w * 0.75, 0.08, 0.5, M(KOTO.plainWood), 0, 1.0, d / 2 + 0.2)); // the counter
  const cols = [0xc8283a, 0x2f4a6b, 0xe9a3b4, 0x4f6b3a, 0xc9a24a, 0xf2ede2];
  for (let k = 0; k < 14; k++) g.add(box(0.12, 0.18, 0.03, M(cols[k % cols.length]), -w * 0.3 + (k % 7) * 0.2, 1.15 + Math.floor(k / 7) * 0.24, d / 2 + 0.3 - Math.floor(k / 7) * 0.15)); // お守り
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: signTexture('お守り・御朱印', { w: 512, h: 128, font: 'bold 64px serif', bg: '#f2ede2', fg: '#2a2018' }) }));
  sign.position.set(0, 2.3, d / 2 + 0.03); g.add(sign);
  const R = roof({ kind: 'gable', w: w + 1.2, d: d + 1.4, h: 1.2, sori: 0.1, material: 'copper' });
  R.position.y = 2.7; g.add(R);
  return finish(g, 'shamusho');
}

// ---------- 大仏 (露坐): a seated bronze Buddha in the open air on a stone base ----------
export function daibutsu() {
  const g = new THREE.Group();
  const brz = mat(0x5f8a7a, { roughness: 0.6, metalness: 0.3 }), stone = stoneM();
  g.add(box(9, 1.0, 8, stone, 0, 0.5, 0));
  g.add(box(8, 0.5, 7, stone, 0, 1.25, 0));
  const B = 1.5;
  const S = (rx, ry, rz, x, y, z, rot = 0) => { const m = mesh(new THREE.SphereGeometry(1, 24, 16), brz, x, y, z); m.scale.set(rx, ry, rz); m.rotation.x = rot; return m; };
  g.add(S(3.4, 1.0, 2.4, 0, B + 0.8, 0.3)); // crossed legs
  g.add(S(2.1, 2.9, 1.6, 0, B + 3.1, -0.3, -0.06)); // the body in its robe
  g.add(S(2.4, 1.1, 1.5, 0, B + 4.7, -0.3)); // shoulders
  g.add(S(0.9, 0.35, 0.7, 0, B + 1.75, 1.35)); // hands in the lap (定印)
  for (const s of [1, -1]) g.add(S(0.7, 1.6, 0.7, s * 1.95, B + 3.2, 0.25, 0.2)); // the arms within the sleeves
  const headY = B + 6.35;
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.6, 16), brz, 0, B + 5.6, -0.25)); // neck
  g.add(S(1.25, 1.4, 1.2, 0, headY, -0.15));
  for (const s of [1, -1]) g.add(S(0.25, 0.75, 0.15, s * 1.2, headY - 0.35, -0.15)); // long ears
  g.add(S(0.62, 0.55, 0.62, 0, headY + 1.35, -0.25)); // 肉髻
  // 螺髪: the curls, merged into one geometry
  const curls = [], curl = new THREE.SphereGeometry(0.11, 5, 4);
  for (let i = 0; i < 200; i++) {
    const u = (i + 0.5) / 200, th = Math.acos(1 - u * 1.1), ph = i * 2.39996;
    if (Math.sin(th) * Math.sin(ph) > 0.6 && th > 0.9) continue; // leave the brow open
    const p = new THREE.Vector3(Math.sin(th) * Math.cos(ph) * 1.27, Math.cos(th) * 1.42, Math.sin(th) * Math.sin(ph) * 1.22);
    curls.push(curl.clone().translate(p.x, headY + p.y, -0.15 + p.z));
  }
  g.add(new THREE.Mesh(mergeGeometries(curls), brz));
  const dark = M(0x2f3f38);
  for (const s of [1, -1]) g.add(box(0.36, 0.05, 0.05, dark, s * 0.42, headY + 0.05, 1.03)); // half-closed eyes
  g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0xc9a24a, { metalness: 0.6 }), 0, headY + 0.45, 1.05)); // 白毫
  g.add(box(0.3, 0.04, 0.04, dark, 0, headY - 0.6, 1.0)); // the mouth
  // the incense burner in front
  g.add(cyl(0.6, 0.45, 0.6, mat(0x3a3f3a, { metalness: 0.4, roughness: 0.5 }), 0, 0.3, 5.6, 14));
  g.add(cyl(0.65, 0.65, 0.08, mat(0x3a3f3a, { metalness: 0.4 }), 0, 0.62, 5.6, 14));
  return finish(g, 'daibutsu', { height: headY + 2 });
}

// ---------- 枯山水: raked white gravel, rocks with rings around them, moss islands, a veranda to sit and look ----------
export function karesansui({ w = 12, d = 8, seed = 2 } = {}) {
  const g = new THREE.Group();
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const rocks = [[-3.2, -0.6, 0.9], [-2.4, 0.6, 0.5], [1.5, -1.2, 0.8], [3.6, 1.2, 0.6], [0.2, 1.8, 0.4]].map(([x, z, k]) => [x * w / 12, z * d / 8, k]);
  // the raked pattern: straight rows, rings around each rock
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * d / w);
  const x2 = c.getContext('2d'), sx = c.width / w;
  x2.fillStyle = '#e9e6dc'; x2.fillRect(0, 0, c.width, c.height);
  x2.strokeStyle = '#c9c4b6'; x2.lineWidth = 2;
  for (let y = 4; y < c.height; y += 7) { x2.beginPath(); x2.moveTo(0, y); x2.lineTo(c.width, y); x2.stroke(); }
  for (const [x, z, k] of rocks) {
    const cx = (x + w / 2) * sx, cz = (z + d / 2) * sx, R0 = k * sx * 1.2;
    x2.fillStyle = '#e9e6dc'; x2.beginPath(); x2.arc(cx, cz, R0 + 7 * 6, 0, 7); x2.fill();
    for (let j = 0; j < 6; j++) { x2.beginPath(); x2.arc(cx, cz, R0 + j * 7, 0, 7); x2.stroke(); }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const gravel = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  gravel.position.y = 0.04; gravel.receiveShadow = true; g.add(gravel);
  // the edging and the rocks
  const stone = stoneM(), rockM = mat(0x6f6c66, { roughness: 1, flatShading: true });
  for (const sgn of [1, -1]) { g.add(box(w + 0.4, 0.12, 0.2, stone, 0, 0.06, sgn * (d / 2 + 0.1))); g.add(box(0.2, 0.12, d, stone, sgn * (w / 2 + 0.1), 0.06, 0)); }
  for (const [x, z, k] of rocks) {
    const n = 1 + (k > 0.6 ? 2 : 0);
    for (let j = 0; j < n; j++) {
      const m = mesh(new THREE.DodecahedronGeometry(k * (j ? 0.55 : 1), 0), rockM, x + (j ? (r() - 0.5) * k * 1.6 : 0), k * 0.35, z + (j ? (r() - 0.5) * k * 1.2 : 0));
      m.scale.set(1, 0.6 + r() * 0.9, 0.8); m.rotation.set(r(), r() * 3, r() * 0.3); g.add(m);
    }
    const moss = mesh(new THREE.SphereGeometry(k * 1.15, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(KOTO.moss, { roughness: 1 }), x, 0.02, z); moss.scale.y = 0.15; g.add(moss);
  }
  // the veranda (縁側) along the back
  g.add(box(w, 0.12, 1.4, M(KOTO.oldWood), 0, 0.55, -d / 2 - 0.9));
  for (let x = -w / 2 + 0.3; x <= w / 2; x += 2) g.add(box(0.14, 0.5, 0.14, M(KOTO.wood), x, 0.25, -d / 2 - 0.3));
  g.add(box(w, 0.08, 0.08, M(KOTO.wood), 0, 0.5, -d / 2 - 0.25));
  return finish(g, 'karesansui', { seat: [0, 0.6, -d / 2 - 0.9] });
}

// ---------- 池と太鼓橋: a pond with a stone rim, water lilies, koi, and a vermilion arched bridge ----------
export function pondBridge({ w = 10, d = 8 } = {}) {
  const g = new THREE.Group();
  const shape = new THREE.Shape(); const N = 40;
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, rr = 1 + 0.08 * Math.sin(a * 3) + 0.05 * Math.cos(a * 5); const p = [Math.cos(a) * w / 2 * rr, Math.sin(a) * d / 2 * rr]; i ? shape.lineTo(...p) : shape.moveTo(...p); }
  const bed = mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), M(0x3f5a48, { roughness: 1 }), 0, -0.25, 0); g.add(bed);
  const water = mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6f9a8a, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }), 0, -0.04, 0);
  water.userData.keep = true; g.add(water);
  const rim = [], pts = shape.getSpacedPoints(46);
  const stone = stoneM();
  for (const p of pts) { const m = mesh(new THREE.DodecahedronGeometry(0.28, 0), stone, p.x, 0.02, -p.y); m.scale.set(1, 0.55, 1); m.rotation.y = p.x * 3; rim.push(m); g.add(m); }
  // lilies
  const pad = M(0x4f7f3a, { side: THREE.DoubleSide });
  for (let k = 0; k < 14; k++) { const a = k * 2.4, rr = 0.45 + (k % 4) * 0.12; const x = Math.cos(a) * w / 2 * rr * 0.9, z = Math.sin(a) * d / 2 * rr * 0.9; if (Math.abs(x) < 1.4) continue; g.add(mesh(new THREE.CircleGeometry(0.28, 10, 0.3, Math.PI * 1.8).rotateX(-Math.PI / 2), pad, x, -0.02, z)); if (k % 3 === 0) g.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), M(0xf2b8c8), x, 0.02, z)); }
  // the arched bridge along Z (over the pond's short side), deck bent on an arc
  const L = d + 1.6, H = 1.3, shu = M(KOTO.shu, { roughness: 0.6 }), deck = M(KOTO.oldWood);
  const arc = (t) => H * Math.sin(Math.PI * t);
  const n = 16;
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n, z0 = -L / 2 + t0 * L, z1 = -L / 2 + t1 * L;
    const seg = box(1.6, 0.12, Math.hypot(z1 - z0, arc(t1) - arc(t0)) + 0.02, deck, 0, (arc(t0) + arc(t1)) / 2 + 0.06, (z0 + z1) / 2);
    seg.rotation.x = -Math.atan2(arc(t1) - arc(t0), z1 - z0); g.add(seg);
    for (const s of [1, -1]) {
      const rail = box(0.08, 0.08, Math.hypot(z1 - z0, arc(t1) - arc(t0)) + 0.02, shu, s * 0.8, (arc(t0) + arc(t1)) / 2 + 0.75, (z0 + z1) / 2);
      rail.rotation.x = seg.rotation.x; g.add(rail);
      if (k % 2 === 0) g.add(box(0.09, 0.7, 0.09, shu, s * 0.8, arc(t0) + 0.4, z0));
    }
  }
  for (const s of [1, -1]) for (const z of [-L / 2, L / 2]) { g.add(box(0.12, 0.9, 0.12, shu, s * 0.8, 0.45, z)); g.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(KOTO.gold, { metalness: 0.5, roughness: 0.4 }), s * 0.8, 0.98, z)); }
  for (const z of [-L / 2 + 1, L / 2 - 1]) g.add(box(1.4, arc(0.5 + (z > 0 ? 0.4 : -0.4)), 0.2, shu, 0, arc(0.1) / 2, z)); // piers
  const lamp = toro(); lamp.position.set(w / 2 * 0.6, 0, d / 2 * 0.75); g.add(lamp);
  finish(g, 'pondBridge');
  // koi swimming slow loops
  const koiCols = [0xe8673c, 0xf2ede2, 0xd9482b, 0x2a2a2a, 0xf2c94c];
  const koi = koiCols.map((c, i) => {
    const f = new THREE.Group();
    const b = mesh(new THREE.SphereGeometry(0.16, 10, 6), M(c)); b.scale.set(1.8, 0.45, 0.6); f.add(b);
    const tail = mesh(new THREE.ConeGeometry(0.1, 0.22, 4), M(c)); tail.rotation.z = Math.PI / 2; tail.position.x = -0.35; tail.scale.z = 0.3; f.add(tail);
    f.userData = { r: 1.2 + i * 0.45, w: 0.18 + i * 0.03, ph: i * 1.3, tail, dynamic: true };
    g.add(f); return f;
  });
  g.userData.update = (t) => koi.forEach((f) => { const u = f.userData, a = t * u.w + u.ph; f.position.set(Math.cos(a) * u.r * w / 8, -0.12, Math.sin(a) * u.r * d / 10); f.rotation.y = Math.atan2(-Math.cos(a) * d, -Math.sin(a) * w * 1.25); u.tail.rotation.y = Math.sin(t * 6 + u.ph) * 0.5; });
  return g;
}

// ---------- 石段 and 石垣: mossy stone steps and a dry-stone wall ----------
export function ishidan({ n = 10, w = 3, rise = 0.18, run = 0.42, moss = true } = {}) {
  const g = new THREE.Group();
  const stone = stoneM(), mossM = M(KOTO.moss, { roughness: 1 });
  for (let k = 0; k < n; k++) {
    g.add(box(w, rise, run + 0.04, stone, 0, rise * (k + 0.5), -k * run));
    if (moss) for (const s of [1, -1]) if ((k * 7 + (s > 0 ? 3 : 0)) % 4) g.add(box(0.3 + (k % 3) * 0.1, 0.03, run * 0.8, mossM, s * (w / 2 - 0.2), rise * (k + 1) + 0.01, -k * run));
  }
  for (const s of [1, -1]) g.add(box(0.3, rise * n * 0.5, run * n, stone, s * (w / 2 + 0.15), rise * n * 0.25, -run * (n - 1) / 2)); // the side kerbs
  return finish(g, 'ishidan', { top: [0, rise * n, -run * (n - 1)] });
}
export function ishigaki({ length = 8, height = 1.8 } = {}) {
  const g = new THREE.Group();
  const tones = [0x9a968c, 0xa9a59a, 0x8f8b82, 0xb3aea2].map((c) => mat(c, { roughness: 1, flatShading: true }));
  let row = 0;
  for (let y = 0.25; y < height; y += 0.42, row++) {
    const inset = (y / height) * 0.35; // the wall leans back as it rises
    for (let x = -length / 2 + (row % 2 ? 0.3 : 0); x < length / 2; x += 0.62) {
      const m = mesh(new THREE.DodecahedronGeometry(0.33, 0), tones[(row * 3 + Math.round(x * 5)) & 3], x + 0.3, y, -inset);
      m.scale.set(1, 0.68, 0.7); m.rotation.y = x * 2.1; g.add(m);
    }
  }
  g.add(box(length, 0.15, 0.6, M(KOTO.moss, { roughness: 1 }), 0, height + 0.05, -0.55)); // moss along the top
  return finish(g, 'ishigaki');
}

// ---------- the corner of a temple graveyard (背景): five-ring stone towers and wooden tablets ----------
export function bochi({ n = 6 } = {}) {
  const g = new THREE.Group();
  const stone = M(0x9a968c, { roughness: 0.9 }), wood = M(0xc9b48a);
  for (let i = 0; i < n; i++) {
    const x = (i % 3) * 1.4 - 1.4, z = Math.floor(i / 3) * -1.6;
    g.add(box(1.0, 0.25, 1.0, stone, x, 0.125, z));
    if (i % 2) { // 五輪塔
      g.add(box(0.5, 0.4, 0.5, stone, x, 0.45, z)); g.add(mesh(new THREE.SphereGeometry(0.27, 10, 8), stone, x, 0.85, z));
      g.add(mesh(new THREE.ConeGeometry(0.4, 0.3, 4).rotateY(Math.PI / 4), stone, x, 1.25, z)); g.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), stone, x, 1.5, z));
    } else { g.add(box(0.42, 1.0, 0.32, stone, x, 0.75, z)); g.add(box(0.55, 0.12, 0.45, stone, x, 0.3, z)); }
    for (let k = 0; k < 3; k++) { const t = box(0.1, 1.4 + k * 0.1, 0.02, wood, x + 0.3 + k * 0.08, 0.7, z - 0.45); t.rotation.z = -0.05 * k; g.add(t); } // 卒塔婆
  }
  return finish(g, 'bochi');
}

// ---------- 祠: a little roadside shrine in a vermilion fence, with a small torii and lanterns ----------
export function hokora() {
  const g = new THREE.Group();
  const shu = M(KOTO.shu, { roughness: 0.6 }), stone = stoneM(), wood = M(KOTO.plainWood);
  g.add(box(3.2, 0.25, 2.6, stone, 0, 0.125, -0.2));
  g.add(box(1.4, 0.55, 1.1, stone, 0, 0.5, -0.6)); // the base
  g.add(box(0.9, 0.75, 0.8, wood, 0, 1.15, -0.6));
  g.add(box(0.7, 0.55, 0.04, M(0x3a2c22), 0, 1.15, -0.18));
  for (let k = -0.3; k <= 0.31; k += 0.1) g.add(box(0.025, 0.55, 0.05, shu, k, 1.15, -0.16));
  const R = roof({ kind: 'nagare', w: 1.4, d: 1.7, h: 0.5, sori: 0.15, material: 'copper', onigawara: false }); R.position.set(0, 1.55, -0.35); g.add(R);
  // the vermilion fence (玉垣) round three sides, open at the front
  for (const [x0, z0, x1, z1] of [[-1.5, -1.45, 1.5, -1.45], [-1.5, -1.45, -1.5, 0.9], [1.5, -1.45, 1.5, 0.9]]) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.32);
    for (let k = 0; k <= n; k++) g.add(box(0.07, 0.75, 0.07, shu, x0 + (x1 - x0) * k / n, 0.62, z0 + (z1 - z0) * k / n));
    const rail = box(x1 === x0 ? 0.08 : len, 0.07, x1 === x0 ? len : 0.08, shu, (x0 + x1) / 2, 0.92, (z0 + z1) / 2); g.add(rail);
  }
  const t = torii({ w: 1.3, h: 1.7 }); t.position.z = 1.0; g.add(t);
  for (const x of [-0.75, 0.75]) g.add(box(0.12, 0.3, 0.12, M(0xc9c4b4), x, 0.4, 0.1)); // offering stands
  for (const x of [-0.75, 0.75]) g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), M(0xf2ede2), x, 0.6, 0.1));
  shide(g, 0, 1.0, -0.12, 0.6);
  return finish(g, 'hokora');
}

// Town buildings of the old capital (koto/DESIGN.md §3.3), besides the townhouse in koto.js: a tea house (茶屋),
// a souvenir shop (土産物屋), a geisha house (お茶屋), a storehouse (蔵), an inn (旅館), an old-house café (古民家カフェ),
// a bathhouse (銭湯), a Kamakura western house (洋館), a little station (駅舎) and a rickshaw stand (人力車の詰所).
// Front faces +Z, ground y = 0, origin at the footprint centre.
import * as THREE from 'three';
import { mat, mesh, box, cyl } from '../../airport/src/parts.js';
import { roof } from './roofs.js';
import { KOTO, M, finish, machiya } from './koto.js';
import { signTexture } from './buildings.js';
import { endai, chochin, andon, moriJio, wagasa } from './koto-props.js';
import { bicycle } from './vehicles.js';

const stone = () => M(KOTO.stone, { flatShading: true });
const plane = (w, h, tex) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
// a noren: strips that sway (dynamic, so they are not baked)
function noren(g, text, color, x, y, z, { w = 1.4, h = 0.9, n = 3 } = {}) {
  const tex = signTexture(text, { w: 256, h: 192, font: 'bold 80px serif', bg: color, fg: '#f2ede2' });
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.userData.dynamic = true;
  for (let k = 0; k < n; k++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w / n - 0.02, h, 1, 3), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
    s.geometry.translate(0, -h / 2, 0);
    const uv = s.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / n);
    s.position.x = (k - (n - 1) / 2) * (w / n); grp.add(s);
  }
  g.add(grp);
  g.add(box(w + 0.1, 0.04, 0.04, M(KOTO.wood), x, y + 0.02, z));
  return grp;
}
const swayAll = (list) => (t) => list.forEach((grp, j) => grp.children.forEach((c, k) => { c.rotation.x = Math.sin(t * 1.7 + k + j) * 0.07; }));
// slatted lattice in front of a dark panel
function koshi(g, w, h, x, y, z, m, step = 0.075) {
  g.add(box(w, h, 0.05, M(0x3a2c22), x, y, z - 0.06));
  for (let k = -w / 2 + 0.04; k <= w / 2; k += step) g.add(box(0.035, h, 0.05, m, x + k, y, z + 0.02));
}

// ---------- 茶屋・甘味処: one storey, open front, benches with red felt, a parasol, a dango sign ----------
export function chaya({ w = 6, d = 5, name = '甘味処' } = {}) {
  const g = new THREE.Group(), wood = M(KOTO.oldWood);
  g.add(box(w + 1.6, 0.1, d + 1.6, stone(), 0, 0.05, 0.4));
  g.add(box(w, 2.6, 0.15, M(KOTO.earth), 0, 1.4, -d / 2));
  for (const s of [1, -1]) g.add(box(0.15, 2.6, d, M(KOTO.earth), s * w / 2, 1.4, 0));
  for (const x of [-w / 2, -w / 6, w / 6, w / 2]) g.add(box(0.16, 2.6, 0.16, wood, x, 1.4, d / 2));
  g.add(box(w, 0.2, 0.2, wood, 0, 2.6, d / 2));
  g.add(box(w - 0.3, 1.0, 0.6, wood, 0, 0.5, -d / 2 + 0.6)); // the counter inside
  for (let k = 0; k < 6; k++) g.add(cyl(0.12, 0.12, 0.15, M([0xf2ede2, 0x4f6b3a, 0xe9a3b4][k % 3]), -w / 2 + 0.8 + k * 0.8, 1.08, -d / 2 + 0.6, 10)); // sweets on the counter
  for (const x of [-w / 4, w / 4]) { const b = endai({ umbrella: false, length: 1.6 }); b.position.set(x, 0.1, d / 2 + 0.8); g.add(b); }
  const sign = plane(1.4, 0.44, signTexture(name, { w: 512, h: 160, font: 'bold 96px serif', bg: '#2a2018', fg: '#f2ede2' })); sign.position.set(w / 3, 2.2, d / 2 + 0.12); g.add(sign);
  const dango = new THREE.Group(); dango.position.set(w / 2 + 0.5, 0.1, d / 2 + 0.6); // the big dango sign
  dango.add(box(0.06, 1.8, 0.06, M(0x8a6a4a), 0, 0.9, 0));
  [0xf2c4cf, 0xf2ede2, 0x8fb06a].forEach((c, k) => dango.add(mesh(new THREE.SphereGeometry(0.17, 12, 10), M(c), 0, 1.3 + k * 0.3, 0)));
  g.add(dango);
  const R = roof({ kind: 'hip', w: w + 2.2, d: d + 2.4, h: 1.7, material: 'hiwada' }); R.position.set(0, 2.7, 0.2); g.add(R);
  const nr = noren(g, '甘味', '#7a2f3a', 0, 2.55, d / 2 + 0.1, { w: 2.2, h: 0.6, n: 4 });
  const u = wagasa({ color: 0xc8283a, r: 1.5 }); u.userData.dynamic = true; u.position.set(-w / 2 - 0.6, 0.1, d / 2 + 1.1); g.add(u);
  finish(g, 'chaya', { seats: [[-w / 4, 0.6, d / 2 + 0.8], [w / 4, 0.6, d / 2 + 0.8]] });
  g.userData.update = swayAll([nr]);
  return g;
}

// ---------- 土産物屋: a townhouse whose ground floor is a shop, with tables of fans, umbrellas, sweets and pickles ----------
export function miyageya({ w = 5.4, d = 8 } = {}) {
  const g = new THREE.Group();
  const house = machiya({ w, d, shop: 'craft' }); g.add(house);
  const goods = new THREE.Group();
  const wood = M(KOTO.oldWood);
  const table = (x, items) => {
    goods.add(box(1.4, 0.06, 0.7, wood, x, 0.7, 0)); for (const [dx, dz] of [[0.6, 0.28], [0.6, -0.28], [-0.6, 0.28], [-0.6, -0.28]]) goods.add(box(0.05, 0.7, 0.05, wood, x + dx, 0.35, dz));
    goods.add(box(1.4, 0.02, 0.72, M(0xc8283a, { roughness: 1 }), x, 0.74, 0));
    items(x);
  };
  table(-1.1, (x) => { for (let k = 0; k < 6; k++) { const f = mesh(new THREE.CircleGeometry(0.2, 10, 0, Math.PI), M([0xe9a3b4, 0x2f4a6b, 0xc9a24a][k % 3], { side: THREE.DoubleSide }), x - 0.5 + (k % 3) * 0.5, 0.78, k < 3 ? 0.15 : -0.15); f.rotation.x = -1.2; goods.add(f); } }); // 扇子 fanned open
  table(0.6, (x) => { for (let k = 0; k < 8; k++) goods.add(box(0.28, 0.08, 0.18, M([0xf2ede2, 0x8fb06a, 0xe9c48a, 0xc9a24a][k % 4]), x - 0.5 + (k % 4) * 0.33, 0.8, k < 4 ? 0.15 : -0.17)); }); // boxes of sweets
  for (let k = 0; k < 3; k++) { const u = mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.9, 10), M([0xc8283a, 0x2f4a6b, 0xe9a3b4][k]), 2.1 + k * 0.12, 0.45, 0.1 - k * 0.1); u.rotation.z = 0.1 - k * 0.1; goods.add(u); } // closed umbrellas in a stand
  goods.add(cyl(0.2, 0.2, 0.4, M(KOTO.wood), 2.2, 0.2, 0, 10));
  for (let k = 0; k < 3; k++) goods.add(cyl(0.22, 0.25, 0.35, M(0x8a6a4a), -2.2 + k * 0.01, 0.18, -0.35 + k * 0.01, 12)); // pickle tubs
  const tag = plane(0.4, 0.25, signTexture('¥500', { w: 128, h: 80, font: 'bold 48px serif', bg: '#f6f2ea', fg: '#c8283a' })); tag.position.set(0.6, 0.95, 0.36); goods.add(tag);
  goods.position.z = d / 2 + 0.9;
  g.add(goods);
  finish(goods, 'goods');
  g.userData = { kind: 'building', building: 'miyageya', update: house.userData.update };
  return g;
}

// ---------- お茶屋 (a geisha house): red-brown lattice, bamboo blinds and a railing upstairs, crested lanterns ----------
export function ochaya({ w = 6, d = 10, name = '一力' } = {}) {
  const g = new THREE.Group();
  const bengara = M(KOTO.bengara), wood = M(KOTO.wood), H1 = 3.0, H2 = 2.3, front = d / 2;
  g.add(box(w, 0.12, d + 0.6, stone(), 0, 0.06, 0.3));
  g.add(box(w - 0.1, H1 + H2, d - 0.4, M(0x8e5a3a), 0, (H1 + H2) / 2 + 0.12, -0.2));
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) g.add(box(0.2, H1 + H2, 0.2, wood, x, (H1 + H2) / 2 + 0.12, front));
  koshi(g, w * 0.62, H1 - 0.6, -w / 2 + 0.25 + w * 0.31, (H1 - 0.6) / 2 + 0.5, front, bengara, 0.09);
  g.add(box(w - w * 0.62 - 0.6, H1 - 0.3, 0.05, M(0x2a2018), w / 2 - 0.25 - (w - w * 0.62 - 0.6) / 2, (H1 - 0.3) / 2 + 0.12, front - 0.1));
  // 駒寄せ: a low fence of posts along the front
  for (let x = -w / 2 + 0.2; x < w / 2 - 1.5; x += 0.3) g.add(box(0.06, 0.6, 0.06, bengara, x, 0.42, front + 0.5));
  g.add(box(w - 1.6, 0.06, 0.08, bengara, -0.7, 0.72, front + 0.5));
  const hisashi = roof({ kind: 'gable', w: w + 0.1, d: 1.8, h: 0.35, material: 'ichimonji', ridge: false }); hisashi.position.set(0, H1 + 0.05, front); g.add(hisashi);
  // upstairs: a railing and blinds (簾)
  g.add(box(w - 0.2, H2, 0.12, M(KOTO.plaster), 0, H1 + H2 / 2 + 0.12, front - 0.5));
  g.add(box(w - 0.6, H2 * 0.7, 0.03, M(0xc9b07a, { roughness: 1 }), 0, H1 + H2 * 0.55 + 0.12, front - 0.1));
  for (let y = H1 + 0.6; y < H1 + H2 * 0.9; y += 0.06) g.add(box(w - 0.6, 0.008, 0.035, M(0x9a8650), 0, y, front - 0.08));
  g.add(box(w - 0.4, 0.07, 0.07, bengara, 0, H1 + 0.95, front + 0.05));
  for (let x = -w / 2 + 0.3; x <= w / 2 - 0.3; x += 0.25) g.add(box(0.035, 0.5, 0.035, bengara, x, H1 + 0.7, front + 0.05));
  const main = roof({ kind: 'gable', w: w + 0.2, d: d + 1.0, h: 2.0 }); main.position.set(0, H1 + H2 + 0.12, -0.2); g.add(main);
  const lamps = [];
  for (const x of [-w / 2 + 0.6, w / 2 - 0.6]) { const c = chochin({ color: 'white', text: name, size: 1.1 }); c.position.set(x, H1 - 0.15, front + 0.75); g.add(c); lamps.push(c); }
  const nr = noren(g, name, '#2a2018', w / 2 - 1.05, H1 - 0.2, front + 0.1, { w: 1.2, h: 0.8, n: 2 });
  finish(g, 'ochaya');
  g.userData.update = (t) => { swayAll([nr])(t); lamps.forEach((c) => c.userData.update(t)); };
  return g;
}

// ---------- 蔵・酒蔵: white plaster, a namako-tiled base, a heavy door, a cedar ball (杉玉) and barrels ----------
const namako = (() => { let tex; return () => { if (tex) return tex; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#3a3e44'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#f2ede2'; x.lineWidth = 7; for (let k = -128; k < 256; k += 32) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 128, 128); x.stroke(); x.beginPath(); x.moveTo(k, 128); x.lineTo(k + 128, 0); x.stroke(); } tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; return tex; }; })();
export function kura({ w = 5, d = 8, sake = true } = {}) {
  const g = new THREE.Group(), white = M(KOTO.plaster, { roughness: 0.95 }), H = 5.2;
  g.add(box(w + 0.4, 0.3, d + 0.4, stone(), 0, 0.15, 0));
  g.add(box(w, H, d, white, 0, 0.3 + H / 2, 0));
  const nt = namako().clone(); nt.repeat.set(w / 1.2, 1.4 / 1.2); nt.needsUpdate = true;
  const nm = new THREE.MeshStandardMaterial({ map: nt, roughness: 0.6 });
  for (const s of [1, -1]) { g.add(mesh(new THREE.PlaneGeometry(w, 1.4), nm, 0, 1.0, s * (d / 2 + 0.01))).children.at(-1).rotation.y = s > 0 ? 0 : Math.PI; }
  for (const s of [1, -1]) { const p = mesh(new THREE.PlaneGeometry(d, 1.4), nm, s * (w / 2 + 0.01), 1.0, 0); p.rotation.y = s * Math.PI / 2; g.add(p); }
  g.add(box(1.6, 2.4, 0.3, M(0x3a3e44), 0, 1.5, d / 2 + 0.1)); // the thick door
  g.add(box(1.0, 1.9, 0.05, M(0x2a2018), 0, 1.25, d / 2 + 0.27));
  for (const y of [3.6]) g.add(box(0.9, 0.7, 0.2, M(0x3a3e44), 0, y, d / 2 + 0.05)); // a small window, shuttered
  const hs = roof({ kind: 'gable', w: 2.2, d: 1.2, h: 0.3, ridge: false }); hs.position.set(0, 2.85, d / 2 + 0.5); g.add(hs); // a hood over the door
  const R = roof({ kind: 'gable', w: d + 1.2, d: w + 1.0, h: 2.0 }); R.rotation.y = Math.PI / 2; R.position.y = 0.3 + H; g.add(R); // gable end to the street (妻入り)
  if (sake) {
    g.add(mesh(new THREE.SphereGeometry(0.45, 10, 8), M(0x5f7a3a, { roughness: 1, flatShading: true }), w / 2 - 0.6, 3.2, d / 2 + 0.7)); // 杉玉
    g.add(cyl(0.02, 0.02, 0.5, M(0x2a2018), w / 2 - 0.6, 3.75, d / 2 + 0.7, 4));
    for (let k = 0; k < 3; k++) { const b = cyl(0.38, 0.38, 0.75, M(0xc9b07a), -w / 2 + 0.5 + k * 0.8, 0.68, d / 2 + 0.7, 14); g.add(b); g.add(cyl(0.39, 0.39, 0.06, M(0x3a3f4a), -w / 2 + 0.5 + k * 0.8, 0.5, d / 2 + 0.7, 14)); g.add(cyl(0.39, 0.39, 0.06, M(0x3a3f4a), -w / 2 + 0.5 + k * 0.8, 0.85, d / 2 + 0.7, 14)); }
  }
  return finish(g, 'kura');
}

// ---------- 旅館・料亭: an earthen wall with a roofed gate, a stone path just watered, a two-storey wing with shoji ----------
export function ryokan({ w = 10, d = 8, name = '旅館 さくら' } = {}) {
  const g = new THREE.Group(), wood = M(KOTO.wood), white = M(KOTO.plaster);
  // the wall (築地塀) along the front, tile-capped, with a gate in the middle
  for (const s of [1, -1]) {
    const len = w / 2 - 1.1, x = s * (1.1 + len / 2);
    g.add(box(len, 1.9, 0.4, M(KOTO.earth), x, 0.95, d / 2));
    for (const yy of [1.2, 1.5]) g.add(box(len, 0.04, 0.42, white, x, yy, d / 2));
    const cap = roof({ kind: 'gable', w: len, d: 0.9, h: 0.25, onigawara: false }); cap.position.set(x, 1.9, d / 2); g.add(cap);
  }
  for (const x of [-1.05, 1.05]) g.add(box(0.24, 2.8, 0.24, wood, x, 1.4, d / 2));
  g.add(box(2.4, 0.2, 0.3, wood, 0, 2.6, d / 2));
  const gr = roof({ kind: 'gable', w: 3.4, d: 1.6, h: 0.6, sori: 0.1 }); gr.position.set(0, 2.75, d / 2); g.add(gr);
  // the wet stone path and the inn behind
  for (let k = 0; k < 6; k++) g.add(box(0.9, 0.05, 0.6, M(0x7f7b72, { roughness: 0.25 }), (k % 2 ? 0.15 : -0.15), 0.03, d / 2 - 0.6 - k * 0.75));
  g.add(box(w - 1, 0.1, d - 2.5, M(0xa9b48a), 0, 0.05, -0.8)); // a mossy garden floor
  const iw = w - 2, id = 4, H1 = 2.8, H2 = 2.3, z0 = -d / 2 + id / 2 + 0.2;
  g.add(box(iw, H1, id, white, 0, H1 / 2 + 0.1, z0));
  g.add(box(iw, H2, id - 0.6, white, 0, H1 + H2 / 2 + 0.1, z0 - 0.3));
  const shoji = new THREE.MeshStandardMaterial({ color: 0xfaf6ea, emissive: 0xffd9a0, emissiveIntensity: 0.05, roughness: 0.9 });
  for (const [y, zf] of [[H1 * 0.5, z0 + id / 2], [H1 + H2 * 0.5, z0 - 0.3 + (id - 0.6) / 2]]) for (let x = -iw / 2 + 0.6; x < iw / 2 - 0.4; x += 1.0) {
    g.add(box(0.92, 1.4, 0.04, shoji, x + 0.45, y + 0.1, zf + 0.03));
    for (let k = 0; k < 4; k++) g.add(box(0.92, 0.02, 0.05, wood, x + 0.45, y - 0.55 + k * 0.33 + 0.1, zf + 0.04));
    for (let k = 0; k < 3; k++) g.add(box(0.02, 1.4, 0.05, wood, x + 0.15 + k * 0.3, y + 0.1, zf + 0.04));
  }
  const hs = roof({ kind: 'hip', w: iw + 1.4, d: id + 1.4, h: 0.9, ridge: false }); hs.position.set(0, H1 + 0.1, z0); g.add(hs);
  const R = roof({ kind: 'irimoya', w: iw + 1.2, d: id + 0.6, h: 1.8, sori: 0.08, corner: 0.15 }); R.position.set(0, H1 + H2 + 0.1, z0 - 0.3); g.add(R);
  const a = andon({ text: name.replace(' ', '') }); a.position.set(1.6, 0, d / 2 + 0.6); g.add(a);
  for (const x of [-1.4, 1.4]) { const s = moriJio(); s.position.set(x, 0, d / 2 + 0.35); g.add(s); }
  // a pine leaning over the wall would be added by the scene; the inn's sign board:
  const sign = plane(1.6, 0.42, signTexture(name, { w: 512, h: 128, font: 'bold 64px serif', bg: '#5a3f2e', fg: '#f2ede2' })); sign.position.set(0, 2.25, d / 2 + 0.17); g.add(sign);
  return finish(g, 'ryokan');
}

// ---------- 古民家カフェ: a thatched hip-roofed farmhouse with a veranda, a chalkboard and a bicycle ----------
export function kominkaCafe({ w = 8, d = 7 } = {}) {
  const g = new THREE.Group(), wood = M(KOTO.oldWood);
  g.add(box(w + 0.6, 0.4, d + 0.6, stone(), 0, 0.2, 0));
  g.add(box(w, 2.6, d, M(KOTO.earth), 0, 1.7, 0));
  for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 4) g.add(box(0.18, 2.6, 0.18, M(KOTO.wood), x, 1.7, d / 2));
  for (let x = -w / 2 + w / 8; x < w / 2; x += w / 4) { g.add(box(w / 4 - 0.3, 2.0, 0.05, M(0xfaf6ea), x, 1.45, d / 2 + 0.02)); for (let k = -0.7; k <= 0.71; k += 0.35) g.add(box(0.03, 2.0, 0.06, M(KOTO.wood), x + k, 1.45, d / 2 + 0.04)); }
  g.add(box(w + 0.4, 0.1, 1.2, wood, 0, 0.6, d / 2 + 0.6)); // 縁側
  const R = roof({ kind: 'hip', w: w + 2.4, d: d + 2.6, h: 3.2, material: 'hiwada' }); R.position.y = 3.0; g.add(R);
  const board = new THREE.Group(); board.position.set(-w / 2 + 0.6, 0, d / 2 + 1.9);
  for (const s of [1, -1]) { const l = box(0.05, 1.1, 0.05, M(KOTO.wood), 0, 0.55, s * 0.18); l.rotation.x = s * 0.18; board.add(l); }
  const bt = plane(0.6, 0.8, signTexture('CAFE', { w: 192, h: 256, font: 'bold 48px sans-serif', bg: '#2a2f2a', fg: '#f2ede2', sub: '抹茶ラテ' })); bt.position.set(0, 0.7, 0.12); bt.rotation.x = -0.18; board.add(bt);
  g.add(board);
  finish(g, 'kominkaCafe', { seats: [[-1, 0.65, d / 2 + 0.6], [1, 0.65, d / 2 + 0.6]] });
  const b = bicycle({ color: 0x8fb06a, role: null }); b.position.set(w / 2 + 0.8, 0, d / 2 + 1.0); b.rotation.y = 0.3; g.add(b);
  return g;
}

// ---------- 銭湯: a curved gable porch (唐破風), a tall chimney, the ゆ noren ----------
export function sento({ w = 8, d = 10 } = {}) {
  const g = new THREE.Group(), wood = M(KOTO.wood);
  g.add(box(w + 0.4, 0.2, d + 0.4, stone(), 0, 0.1, 0));
  g.add(box(w, 4.0, d, M(KOTO.plaster), 0, 2.2, 0));
  g.add(box(w, 1.0, d + 0.02, M(0x7a5a40), 0, 0.7, 0));
  const R = roof({ kind: 'irimoya', w: w + 1.6, d: d + 1.6, h: 2.6, sori: 0.12, corner: 0.2 }); R.position.y = 4.2; g.add(R);
  // 唐破風: an arched roof over the entrance, built from a bent slab
  const kw = 3.6, kd = 2.2;
  const prof = new THREE.Shape(); const n = 20;
  for (let i = 0; i <= n; i++) { const t = i / n, x = -kw / 2 + t * kw, y = 0.55 * Math.sin(Math.PI * t) ** 0.7 - 0.12 * Math.sin(Math.PI * t * 2) ** 2 * 0; i ? prof.lineTo(x, y) : prof.moveTo(x, y); }
  for (let i = n; i >= 0; i--) { const t = i / n, x = -kw / 2 + t * kw, y = 0.55 * Math.sin(Math.PI * t) ** 0.7 - 0.18; prof.lineTo(x, y); }
  const kara = mesh(new THREE.ExtrudeGeometry(prof, { depth: kd, bevelEnabled: false }), M(KOTO.kawara, { roughness: 0.7 }), 0, 3.3, d / 2 - 0.3); g.add(kara);
  for (const x of [-kw / 2 + 0.3, kw / 2 - 0.3]) g.add(box(0.2, 3.2, 0.2, wood, x, 1.7, d / 2 + kd - 0.5));
  g.add(box(kw, 0.25, 0.25, wood, 0, 3.25, d / 2 + kd - 0.5));
  g.add(box(2.6, 2.6, 0.05, M(0x2a2018), 0, 1.4, d / 2 + 0.02));
  const nr = noren(g, 'ゆ', '#2f4a6b', 0, 2.7, d / 2 + 0.2, { w: 2.0, h: 1.0, n: 2 });
  g.add(cyl(0.45, 0.6, 14, M(0x8a5a3a), w / 2 - 1.2, 7, -d / 2 + 1.2, 12)); // the chimney
  for (const y of [5, 9, 13]) g.add(cyl(0.5, 0.5, 0.15, M(0x3a3f4a), w / 2 - 1.2, y, -d / 2 + 1.2, 12));
  finish(g, 'sento');
  g.userData.update = swayAll([nr]);
  return g;
}

// ---------- 洋館 (Kamakura): clapboard walls, a steep gable, a bay window, pale blue and white ----------
export function yokan({ w = 8, d = 8 } = {}) {
  const g = new THREE.Group(), blue = M(0xa9c4cc), white = M(0xf6f4ee);
  g.add(box(w + 0.4, 0.5, d + 0.4, stone(), 0, 0.25, 0));
  g.add(box(w, 5.4, d, blue, 0, 3.2, 0));
  for (let y = 0.7; y < 5.8; y += 0.24) for (const s of [1, -1]) g.add(box(w + 0.03, 0.03, 0.02, M(0x8aaab4), 0, y, s * (d / 2 + 0.01))); // clapboard lines
  const win = (x, y, z, ry = 0) => { const f = box(0.9, 1.4, 0.08, white, x, y, z); f.rotation.y = ry; g.add(f); const gl = box(0.7, 1.2, 0.05, M(0x3a4a5a, { roughness: 0.2, metalness: 0.3 }), x, y, z + 0.03); gl.rotation.y = ry; g.add(gl); };
  for (const x of [-2.4, 2.4]) { win(x, 4.4, d / 2 + 0.04); }
  win(2.4, 1.8, d / 2 + 0.04);
  // the bay window
  g.add(box(2.4, 1.9, 0.9, white, -2.2, 1.85, d / 2 + 0.45));
  for (const x of [-2.9, -2.2, -1.5]) g.add(box(0.5, 1.2, 0.04, M(0x3a4a5a, { roughness: 0.2, metalness: 0.3 }), x, 1.95, d / 2 + 0.92));
  g.add(box(2.6, 0.12, 1.1, white, -2.2, 2.85, d / 2 + 0.45));
  g.add(box(1.1, 2.2, 0.06, M(0x5a3f2e), 0.4, 1.6, d / 2 + 0.04)); // the door
  g.add(box(1.6, 0.1, 0.9, white, 0.4, 2.9, d / 2 + 0.45));
  const R = roof({ kind: 'gable', w: d + 1, d: w + 1, h: 3.4, material: 'ichimonji', onigawara: false }); R.rotation.y = Math.PI / 2; R.position.y = 5.9; g.add(R);
  const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, 3.3)]);
  for (const s of [1, -1]) { const t = mesh(new THREE.ShapeGeometry(tri), M(0xa9c4cc, { side: THREE.DoubleSide }), 0, 5.9, s * (d / 2)); g.add(t); }
  win(0, 7.0, d / 2 + 0.04);
  g.add(box(0.7, 1.6, 0.7, M(0x8a5a3a), w / 2 - 1.4, 8.0, -1)); // the chimney
  return finish(g, 'yokan');
}

// ---------- 駅舎 (a little station on a single track): the waiting room, a platform, a name board, a bench ----------
export function eki({ name = 'こまち', en = 'Komachi', length = 16 } = {}) {
  const g = new THREE.Group(), wood = M(KOTO.oldWood);
  g.add(box(length, 0.9, 3, M(0x9a968c), 0, 0.45, 0)); // the platform
  g.add(box(length, 0.06, 0.25, M(0xf2c94c), 0, 0.92, 1.35)); // the edge line
  g.add(box(5, 2.6, 2.4, M(0xe9e2cf), -length / 2 + 3, 2.2, -0.1));
  g.add(box(5.2, 0.15, 2.6, wood, -length / 2 + 3, 0.95, -0.1));
  for (const x of [-1.5, 0, 1.5]) g.add(box(1.0, 1.2, 0.04, M(0x3a4a5a, { roughness: 0.2 }), -length / 2 + 3 + x, 2.4, 1.11));
  const R = roof({ kind: 'gable', w: 6, d: 3.6, h: 1.0, material: 'ichimonji' }); R.position.set(-length / 2 + 3, 3.5, -0.1); g.add(R);
  for (let x = -length / 2 + 6.5; x < length / 2 - 1; x += 3) g.add(box(0.12, 2.4, 0.12, wood, x, 2.1, -0.6));
  const shelter = roof({ kind: 'gable', w: length - 7, d: 2.6, h: 0.35, material: 'ichimonji', ridge: false }); shelter.position.set(3.2, 3.3, -0.3); g.add(shelter);
  // the station name board (駅名標) and a bench
  const nb = new THREE.Group(); nb.position.set(2, 0.9, 0.6);
  for (const x of [-0.9, 0.9]) nb.add(box(0.08, 1.6, 0.08, M(0x3a3f4a), x, 0.8, 0));
  const t = plane(2.0, 0.7, signTexture(name, { w: 512, h: 180, font: 'bold 84px sans-serif', bg: '#ffffff', fg: '#1c2232', sub: en })); t.position.y = 1.4; nb.add(t);
  nb.add(box(2.0, 0.08, 0.04, M(0x3f8a4a), 0, 1.0, 0.01));
  g.add(nb);
  g.add(box(1.8, 0.08, 0.45, wood, 5.5, 1.35, -0.8)); for (const x of [4.8, 6.2]) g.add(box(0.08, 0.45, 0.4, M(0x3a3f4a), x, 1.12, -0.8));
  for (let x = -length / 2; x < length / 2; x += 0.5) g.add(box(0.06, 1.0, 0.06, M(0xe8e4da), x, 1.4, -1.45)); // the back fence
  g.add(box(length, 0.06, 0.06, M(0xe8e4da), 0, 1.85, -1.45));
  return finish(g, 'eki', { platformY: 0.9, edgeZ: 1.5 });
}

// ---------- 人力車の詰所: a small hut, a bench, a parked rickshaw's place and a banner ----------
export function rickshawHut() {
  const g = new THREE.Group(), wood = M(KOTO.oldWood);
  g.add(box(3, 2.4, 2, M(KOTO.earth), 0, 1.2, -0.6));
  g.add(box(2.2, 1.8, 0.05, M(0x2a2018), 0, 1.0, 0.42));
  const R = roof({ kind: 'gable', w: 3.6, d: 3.0, h: 0.8, material: 'ichimonji' }); R.position.set(0, 2.4, -0.4); g.add(R);
  g.add(box(1.8, 0.08, 0.45, wood, -0.4, 0.45, 1.2)); for (const x of [-1.1, 0.3]) g.add(box(0.08, 0.45, 0.4, wood, x, 0.22, 1.2));
  const ban = new THREE.Group(); ban.position.set(1.8, 0, 1.0);
  ban.add(cyl(0.03, 0.03, 2.6, M(0xd8d3c8), 0, 1.3, 0, 6)); ban.add(box(0.6, 0.03, 0.03, M(0xd8d3c8), 0.3, 2.55, 0));
  const fl = plane(0.55, 1.9, signTexture('人\n力\n車', { w: 96, h: 320, font: 'bold 64px serif', bg: '#c8283a', fg: '#ffffff' })); fl.position.set(0.3, 1.6, 0); ban.add(fl);
  g.add(ban);
  return finish(g, 'rickshawHut', { park: [0, 0, 2.8] });
}

// Old-capital buildings (koto/DESIGN.md §3): the townhouse (京町家), the temple main hall (本堂), torii and the
// tunnel of a thousand torii (千本鳥居). Front faces +Z, ground y = 0, origin at the footprint centre.
import * as THREE from 'three';
import { mat, mesh, box, cyl } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { roof } from './roofs.js';
import { signTexture } from './buildings.js';

// 和の色 (§1.1)
export const KOTO = {
  wood: 0x5a3f2e, oldWood: 0x7a5a40, plainWood: 0xd8c4a0, plaster: 0xf2ede2, earth: 0xc9a87c, bengara: 0x8e3b2e,
  kawara: 0x6d7178, copper: 0x5f9a8a, shu: 0xd9482b, gold: 0xc9a24a, ai: 0x2f4a6b, stone: 0xa9a59a, moss: 0x6f8f4a,
};
export const M = (c, o = {}) => mat(c, { roughness: 0.85, ...o });
export const finish = (g, kind, extra = {}) => { const ud = { kind: 'building', building: kind, ...extra }; bakeStatic(g); g.userData = { ...g.userData, ...ud }; return g; };

// ---------- 京町家 (a narrow, deep townhouse) ----------
// shop: 'sweets' | 'tea' | 'craft' | 'home' · lattice: 'wood' | 'bengara' (red-brown)
const SHOPS = { sweets: ['和菓子', '#2f4a6b'], tea: ['お茶', '#4f6b3a'], craft: ['扇子', '#7a2f3a'], home: null };
export function machiya({ w = 5.4, d = 11, shop = 'sweets', lattice = 'wood' } = {}) {
  const g = new THREE.Group();
  const H1 = 2.9, H2 = 2.1, front = d / 2;
  const wood = M(lattice === 'bengara' ? KOTO.bengara : KOTO.wood), plaster = M(KOTO.plaster, { roughness: 0.95 }), earth = M(KOTO.earth, { roughness: 1 });
  g.add(box(w, 0.12, d + 0.6, M(KOTO.stone), 0, 0.06, 0.3)); // the stone strip it stands on
  // the box of the house: earth walls at the sides, posts at the corners
  g.add(box(w - 0.1, H1 + H2, d - 0.4, earth, 0, (H1 + H2) / 2 + 0.12, -0.2));
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) for (const z of [front, -front + 0.2]) g.add(box(0.2, H1 + H2, 0.2, wood, x, (H1 + H2) / 2 + 0.12, z));
  g.add(box(w, 0.18, 0.24, wood, 0, H1 + 0.1, front)); // the beam between the floors
  // ground floor front: 千本格子 (fine lattice) on the left, the doorway with a noren on the right
  const latW = w * 0.6, latX = -w / 2 + 0.2 + latW / 2;
  g.add(box(latW, H1 - 0.5, 0.06, M(0x3a2c22), latX, (H1 - 0.5) / 2 + 0.45, front - 0.08)); // the dark room behind
  for (let x = -latW / 2 + 0.04; x <= latW / 2; x += 0.075) g.add(box(0.035, H1 - 0.55, 0.05, wood, latX + x, (H1 - 0.5) / 2 + 0.45, front + 0.02));
  for (const y of [0.45, H1 - 0.05]) g.add(box(latW, 0.08, 0.1, wood, latX, y, front + 0.03));
  // 犬矢来: the curved bamboo fence along the foot of the lattice
  const iny = new THREE.Group();
  iny.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, latW, 16, 1, true, 0, Math.PI / 2).rotateZ(Math.PI / 2), M(0xa58a5a, { side: THREE.DoubleSide })));
  for (let x = -latW / 2 + 0.05; x < latW / 2; x += 0.09) { const rib = mesh(new THREE.TorusGeometry(0.5, 0.012, 3, 8, Math.PI / 2), M(0x8a7048)); rib.rotation.y = Math.PI / 2; rib.position.x = x; iny.add(rib); }
  iny.position.set(latX, 0.12, front - 0.5);
  iny.rotation.x = 0; iny.scale.set(1, 1.1, 1);
  g.add(iny);
  // the doorway
  const doorX = w / 2 - 0.2 - (w - latW - 0.4) / 2;
  g.add(box(w - latW - 0.5, H1 - 0.3, 0.05, M(0x2a2018), doorX, (H1 - 0.3) / 2 + 0.12, front - 0.1));
  const noren = new THREE.Group();
  const s = SHOPS[shop];
  if (s) {
    const tex = signTexture(s[0], { w: 256, h: 192, font: 'bold 80px serif', bg: s[1], fg: '#f2ede2' });
    for (let k = 0; k < 3; k++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.1, 1, 4), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
      strip.geometry.translate(0, -0.55, 0);
      // each strip shows its third of the cloth
      const uv = strip.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 3);
      strip.position.set((k - 1) * 0.44, 0, 0);
      noren.add(strip);
    }
    noren.position.set(doorX, H1 - 0.15, front + 0.12);
    noren.userData.dynamic = true;
    g.add(noren);
    g.add(box(1.5, 0.04, 0.04, wood, doorX, H1 - 0.13, front + 0.12)); // the rod
  }
  // 一文字瓦の庇: the straight tiled eave over the ground floor
  const hisashi = roof({ kind: 'gable', w: w + 0.1, d: 1.8, h: 0.35, material: 'ichimonji', ridge: false });
  hisashi.position.set(0, H1 + 0.05, front);
  g.add(hisashi);
  g.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), M(0x8e5a3a), w / 2 - 0.5, H1 + 0.32, front + 0.45)); // 鍾馗さん (a little guardian figure)
  // first floor: plaster with 虫籠窓 (slatted windows)
  g.add(box(w - 0.3, H2, 0.12, plaster, 0, H1 + H2 / 2 + 0.12, front - 0.35));
  for (const x of [-w * 0.28, 0, w * 0.28]) {
    g.add(box(0.95, 0.55, 0.06, M(0x2a2018), x, H1 + H2 * 0.55 + 0.12, front - 0.27));
    for (let k = -0.38; k <= 0.39; k += 0.095) g.add(box(0.05, 0.55, 0.08, plaster, x + k, H1 + H2 * 0.55 + 0.12, front - 0.25));
  }
  // the main roof: a straight gable, ridge along the street (平入り)
  const main = roof({ kind: 'gable', w: w + 0.2, d: d + 1.0, h: 2.0, material: 'kawara' });
  main.position.set(0, H1 + H2 + 0.12, -0.2);
  g.add(main);
  if (shop === 'sweets' || shop === 'tea') { // ばったり床几 (a fold-down bench) and a sign board
    g.add(box(1.4, 0.06, 0.4, wood, latX, 0.5, front + 0.35));
    g.add(box(0.06, 0.4, 0.06, wood, latX - 0.6, 0.3, front + 0.5)); g.add(box(0.06, 0.4, 0.06, wood, latX + 0.6, 0.3, front + 0.5));
  }
  finish(g, 'machiya', { shop });
  g.userData.update = (t) => noren.children.forEach((c, k) => { c.rotation.x = Math.sin(t * 1.7 + k) * 0.07; });
  return g;
}

// ---------- 本堂 (a temple main hall): a stone platform, a veranda, columns, brackets, an irimoya roof, the porch ----------
export function hondo({ w = 14, d = 11, material = 'kawara' } = {}) {
  const g = new THREE.Group();
  const wood = M(KOTO.wood), plaster = M(KOTO.plaster), stone = M(KOTO.stone, { flatShading: true });
  const P = 0.9, HC = 4.4; // platform height, column height
  g.add(box(w + 5, P, d + 5, stone, 0, P / 2, 0));
  g.add(box(w + 2.6, 0.18, d + 2.6, M(KOTO.oldWood), 0, P + 0.09, 0)); // the veranda
  // the walls: plaster above, wood below; on the front, rows of wooden doors
  g.add(box(w, HC * 0.45, d, plaster, 0, P + HC * 0.775, 0));
  g.add(box(w, HC * 0.55, d, M(KOTO.oldWood), 0, P + HC * 0.275, 0));
  for (let x = -w / 2 + 1; x < w / 2; x += 2) {
    g.add(box(1.7, HC * 0.62, 0.08, M(0x3a2c22), x, P + HC * 0.33, d / 2 + 0.04));
    for (let y = 0.3; y < HC * 0.62; y += 0.22) g.add(box(1.7, 0.03, 0.1, wood, x, P + y, d / 2 + 0.06));
  }
  // columns all round, with bracket clusters (組物) on top
  const cols = [];
  for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 7) cols.push([x, d / 2], [x, -d / 2]);
  for (let z = -d / 2 + d / 5; z < d / 2 - 0.01; z += d / 5) cols.push([w / 2, z], [-w / 2, z]);
  for (const [x, z] of cols) {
    g.add(cyl(0.22, 0.24, HC, wood, x, P + HC / 2, z, 12));
    g.add(box(0.7, 0.18, 0.7, wood, x, P + HC + 0.09, z));
    g.add(box(0.5, 0.16, 1.0, wood, x, P + HC + 0.26, z));
    g.add(box(1.0, 0.16, 0.5, wood, x, P + HC + 0.42, z));
  }
  g.add(box(w + 0.6, 0.3, d + 0.6, wood, 0, P + HC + 0.65, 0)); // the beam the roof sits on
  // rafters (垂木) showing under the eaves
  for (let x = -w / 2 - 1.6; x <= w / 2 + 1.6; x += 0.35) for (const s of [1, -1]) g.add(box(0.1, 0.1, 2.0, wood, x, P + HC + 0.85, s * (d / 2 + 1.0)));
  // the roof
  const R = roof({ kind: 'irimoya', w: w + 5, d: d + 5, h: 5.6, sori: 0.22, corner: 0.7, material });
  R.position.set(0, P + HC + 0.9, 0);
  g.add(R);
  // 向拝: the porch roof reaching out over the front steps, on two columns
  for (const x of [-2.2, 2.2]) g.add(cyl(0.18, 0.2, HC - 0.4, wood, x, P + (HC - 0.4) / 2, d / 2 + 3.0, 10));
  const porch = roof({ kind: 'gable', w: 3.2, d: 6.2, h: 1.2, sori: 0.2, material });
  porch.rotation.y = Math.PI / 2; porch.position.set(0, P + HC - 0.25, d / 2 + 2.2);
  g.add(porch);
  // the steps up, the railing with 擬宝珠 (onion knobs), the offering box, a big lantern
  for (let k = 0; k < 6; k++) g.add(box(4.2, 0.16, 0.42, M(KOTO.oldWood), 0, 0.08 + k * (P / 6), d / 2 + 2.9 - k * 0.38));
  for (const side of [-1, 1]) {
    for (let x = -w / 2 - 1.2; x <= w / 2 + 1.2; x += 1.6) if (Math.abs(x) > 2.4) g.add(box(0.12, 0.7, 0.12, wood, x, P + 0.53, side * (d / 2 + 1.25)));
    g.add(box(w + 2.5, 0.08, 0.1, wood, 0, P + 0.82, side * (d / 2 + 1.25)));
    for (const x of [-w / 2 - 1.2, w / 2 + 1.2]) g.add(mesh(new THREE.SphereGeometry(0.11, 10, 8), M(KOTO.gold, { metalness: 0.5, roughness: 0.4 }), x, P + 0.98, side * (d / 2 + 1.25)));
  }
  g.add(box(1.6, 0.6, 0.7, wood, 0, P + 0.48, d / 2 + 0.8)); // 賽銭箱
  for (let x = -0.7; x <= 0.71; x += 0.14) g.add(box(0.05, 0.04, 0.72, M(0x2a2018), x, P + 0.8, d / 2 + 0.8));
  const lantern = cyl(0.55, 0.55, 1.4, M(0xf2e2c8, { emissive: 0xffc070, emissiveIntensity: 0.08 }), 0, P + HC - 1.1, d / 2 + 1.6, 16);
  g.add(lantern);
  g.add(box(1.2, 0.12, 1.2, M(0x1c1d21), 0, P + HC - 0.35, d / 2 + 1.6)); g.add(box(1.2, 0.12, 1.2, M(0x1c1d21), 0, P + HC - 1.85, d / 2 + 1.6));
  return finish(g, 'hondo');
}

// ---------- 鳥居 ----------
// type: 'myojin' (curved top, the familiar vermilion one) | 'shinmei' (straight, plain) · color: 'shu' | 'stone' | 'wood'
export function torii({ type = 'myojin', color = 'shu', w = 3.6, h = 4.2 } = {}) {
  const g = new THREE.Group();
  const body = M(color === 'shu' ? KOTO.shu : color === 'stone' ? KOTO.stone : KOTO.plainWood, { roughness: 0.6 });
  const black = M(0x1d1f23, { roughness: 0.6 });
  const r = w * 0.05;
  for (const s of [1, -1]) {
    const p = cyl(r * 0.9, r, h, body, s * w / 2, h / 2, 0, 16); p.rotation.z = s * 0.03; g.add(p); // a slight lean inward
    if (color === 'shu') g.add(cyl(r * 1.15, r * 1.2, h * 0.08, black, s * w / 2, h * 0.04, 0, 16)); // 根巻
  }
  if (type === 'myojin') {
    g.add(box(w + w * 0.3, h * 0.07, r * 1.6, body, 0, h * 0.72, 0)); // 貫, poking out past the pillars
    g.add(box(r * 1.2, h * 0.12, r * 1.3, body, 0, h * 0.82, 0)); // 額束
    g.add(box(w * 0.18, h * 0.12, 0.06, black, 0, h * 0.82, r * 0.7)); // the name plaque
    // 笠木 + 島木: a curved beam with upturned ends, black on top of vermilion
    const span = w / 2 + w * 0.28, n = 14;
    for (let k = 0; k < n; k++) {
      const x0 = -span + (k / n) * span * 2, x1 = -span + ((k + 1) / n) * span * 2;
      const lift = (x) => 0.18 * (Math.abs(x) / span) ** 2.4;
      const seg = (y, th, m) => { const b = box(Math.hypot(x1 - x0, lift(x1) - lift(x0)) + 0.01, th, r * 2.2, m, (x0 + x1) / 2, y + (lift(x0) + lift(x1)) / 2, 0); b.rotation.z = Math.atan2(lift(x1) - lift(x0), x1 - x0); g.add(b); };
      seg(h * 0.92, h * 0.05, body);
      seg(h * 0.97, h * 0.06, black);
    }
  } else {
    g.add(box(w + 0.1, h * 0.06, r * 1.4, body, 0, h * 0.74, 0));
    const top = cyl(r * 1.1, r * 1.1, w + w * 0.3, body, 0, h * 0.95, 0, 12); top.rotation.z = Math.PI / 2; g.add(top);
  }
  return finish(g, 'torii', { type });
}

// ---------- 千本鳥居: many small vermilion torii close together along a path (instanced: 6 draw calls) ----------
// path: points [[x, y, z], …] (the ground under the walkway) · spacing: between gates · w × h: one gate
export function senbonTorii({ path, spacing = 0.62, w = 1.7, h = 2.5 } = {}) {
  const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
  const n = Math.floor(curve.getLength() / spacing);
  const r = 0.085;
  const shu = M(KOTO.shu, { roughness: 0.55 }), black = M(0x1d1f23, { roughness: 0.6 });
  // one gate's pieces, each a shape drawn n (or 2n) times
  const kasagi = (() => { const g = new THREE.BoxGeometry(w + 0.6, 0.12, 0.2, 8, 1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.06 * (Math.abs(p.getX(i)) / ((w + 0.6) / 2)) ** 2); g.computeVertexNormals(); return g; })();
  const parts = [
    { geo: new THREE.CylinderGeometry(r * 0.9, r, h, 10).translate(0, h / 2, 0), m: shu, offs: [-w / 2, w / 2] },
    { geo: new THREE.CylinderGeometry(r * 1.2, r * 1.25, 0.25, 10).translate(0, 0.125, 0), m: black, offs: [-w / 2, w / 2] },
    { geo: new THREE.BoxGeometry(w + 0.3, 0.1, 0.14).translate(0, h * 0.74, 0), m: shu, offs: [0] },
    { geo: kasagi.clone().translate(0, h * 0.94, 0), m: shu, offs: [0] },
    { geo: kasagi.clone().scale(1, 1.1, 1.05).translate(0, h * 0.99, 0), m: black, offs: [0] },
  ];
  const g = new THREE.Group();
  const o = new THREE.Object3D(), P = new THREE.Vector3(), Tn = new THREE.Vector3();
  for (const pt of parts) {
    const im = new THREE.InstancedMesh(pt.geo, pt.m, n * pt.offs.length);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      curve.getPointAt(t, P); curve.getTangentAt(t, Tn);
      const yaw = Math.atan2(-Tn.z, Tn.x) + Math.PI / 2; // the gate stands across the path
      for (const off of pt.offs) {
        o.position.set(P.x + Math.cos(yaw) * off * 1, P.y, P.z - Math.sin(yaw) * off);
        o.rotation.set(0, yaw, 0);
        o.scale.setScalar(1 + ((i * 7) % 5) * 0.012); // gates were given by different people: not quite the same
        o.updateMatrix();
        im.setMatrixAt(k++, o.matrix);
      }
    }
    im.castShadow = true; im.receiveShadow = true;
    g.add(im);
  }
  g.userData = { kind: 'senbonTorii', count: n, curve };
  return g;
}

// Things to do at the festival (snowfest/DESIGN.md §5, added after the first film: "いろんなアクティビティがあるといいね",
// and big enough to read from far off): a big-air snowboard ramp with a rider flipping off the kicker, an ice rink with
// skaters going round, a snowball fight between two snow forts, children sledding down the ice slide, dancers on the
// stage, a child rolling a snowball that grows, and crowds watching. The crowds stand still, so each is baked into one
// mesh (one draw call for dozens of people).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kits, group, G, C, IKit, MAT } from './kit.js';
import { strut } from './build.js';
import { winter, walk, ROLES } from './people.js';

let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const HATS = ['beanie', 'earmuffs', 'hood'], HATCOLS = [0xfbfaf6, 0xf08ac0, 0xe8483f, 0x3f6fd6, 0xf2c230, 0x4fb39a];
const someone = (o = {}) => winter({ coat: pick(C.coats), hat: pick(HATS), hatCol: pick(HATCOLS), scarf: pick(C.coats), hair: pick([0x3a2a20, 0x6b4a30, 0x2a2018, 0xd9b26a]), ...o });

// ---- a crowd baked into one mesh: [x, z, ry, kid?] each, standing (some with an arm up, cheering)
const crowdMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
export function crowd(spots) {
  const parts = [], inv = new THREE.Matrix4(), M = new THREE.Matrix4(), col = new THREE.Color();
  for (const [x, z, ry, kid] of spots) {
    const p = someone({ kid }); p.position.set(x, 0, z); p.rotation.y = ry;
    if (rnd() < 0.35) p.userData.arms[rnd() < 0.5 ? 0 : 1].rotation.x = -2.6; // (cheering)
    p.updateMatrixWorld(true);
    p.traverse((m) => { if (!m.isMesh) return; const g = m.geometry.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); g.applyMatrix4(m.matrixWorld); col.copy(m.material.color); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts.push(g); });
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), crowdMat); parts.forEach((g) => g.dispose()); mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
// rows of people: n in a line from (x0, z0) to (x1, z1), all facing ry, a second row behind if rows = 2
export function rowsOf(x0, z0, x1, z1, n, ry, rows = 1) {
  const s = []; const bx = Math.sin(ry), bz = Math.cos(ry);
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0.5; s.push([x0 + (x1 - x0) * u + (rnd() - 0.5) * 0.15 - bx * r * 0.42, z0 + (z1 - z0) * u + (rnd() - 0.5) * 0.15 - bz * r * 0.42, ry + (rnd() - 0.5) * 0.4, rnd() < 0.2]); }
  return s;
}

// ---- big air: a scaffold tower, a long snow in-run, the kicker, a gap, the landing slope; a rider flips over the gap
const RUN = [[0, 4.6], [0.6, 4.6], [4.2, 1.0], [4.9, 1.35], [6.6, 1.55], [9.6, 0.12], [11, 0.0]]; // [x, height] along the ramp
const hAt = (x) => { for (let i = 1; i < RUN.length; i++) if (x <= RUN[i][0]) { const [x0, h0] = RUN[i - 1], [x1, h1] = RUN[i]; return h0 + (h1 - h0) * (x - x0) / (x1 - x0); } return 0; };
export function bigAir() {
  const k = kits('snow', 'metal', 'toy'), W = 1.3;
  // the scaffold under the in-run: posts down to the ground and braces
  for (let x = 0; x <= 4.2; x += 0.7) { const h = hAt(x); for (const z of [-W / 2, W / 2]) strut(k.metal, [x, 0, z], [x, h - 0.05, z], 0.04, 0x9aa0aa); if (x > 0) strut(k.metal, [x - 0.7, 0.1, -W / 2], [x, hAt(x) - 0.1, W / 2], 0.02, 0x9aa0aa); }
  k.toy.box(1.0, 0.1, W + 0.3, 0x6b4a34, 0.3, 4.62, 0, { r: 0.02 }); // the start deck
  for (const z of [-W / 2 - 0.15, W / 2 + 0.15]) { k.toy.add(G.cyl8, 0xe8483f, 0.3, 5.0, z, { s: [0.025, 0.8, 0.025] }); k.toy.box(1.0, 0.04, 0.04, 0xe8483f, 0.3, 5.35, z, { r: 0 }); }
  // the snow surface: a strip following the profile, with side walls
  const pos = [], idx = []; const xs = []; for (let x = 0; x <= 11; x += 0.1) xs.push(x);
  xs.forEach((x) => { const h = hAt(x); pos.push(x, h, -W / 2, x, h, W / 2, x, Math.min(h, 0.0) - 0.0, -W / 2, x, 0, W / 2); });
  for (let i = 0; i < xs.length - 1; i++) { const a = i * 4, b = a + 4; idx.push(a, a + 1, b, b, a + 1, b + 1); idx.push(a, b, a + 2, a + 2, b, b + 2); idx.push(a + 1, a + 3, b + 1, b + 1, a + 3, b + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  k.snow.add(g, 0xf2f6fc);
  k.snow.box(2.6, 1.4, W + 0.4, 0xe4ebf5, 6.0, 0.7, 0, { r: 0.2 }); // the landing hill's body
  for (const [x, col] of [[4.5, 0x3f6fd6], [6.8, 0xe8483f], [9.0, 0xf2c230]]) for (const z of [-W / 2 - 0.1, W / 2 + 0.1]) { k.toy.add(G.cyl8, 0xfbfaf6, x, hAt(x) + 0.35, z, { s: [0.02, 0.7, 0.02] }); k.toy.box(0.02, 0.22, 0.3, col, x, hAt(x) + 0.6, z + (z > 0 ? -0.15 : 0.15), { r: 0 }); }
  const grp = group(k); grp.name = 'bigAir'; grp.userData.t0 = 0; // (t0: when a run starts; the film sets it so a flip lands in its shot)
  // the rider: a snowboarder in a bright jacket and helmet, on a board
  const rider = new THREE.Group(), body = winter({ coat: 0xf2c230, hat: 'beanie', hatCol: 0x2a2f40, scarf: 0x2a2f40 }); body.rotation.y = Math.PI / 2; body.userData.arms[0].rotation.z = 1.2; body.userData.arms[1].rotation.z = -1.2;
  const board = new THREE.Mesh(G.cap, new THREE.MeshStandardMaterial({ color: 0xe8483f, roughness: 0.4 })); board.scale.set(0.06, 0.18, 0.02); board.rotation.set(Math.PI / 2, 0, Math.PI / 2); board.position.y = 0.02;
  rider.add(body, board); rider.traverse((o) => (o.castShadow = true)); grp.add(rider);
  grp.userData.update = (t) => {
    const u = ((((t - grp.userData.t0) / 6.5) % 1) + 1) % 1; rider.visible = u < 0.88; rider.rotation.set(0, 0, 0);
    if (u < 0.42) { const x = 0.6 + (4.9 - 0.6) * (u / 0.42) ** 1.6; rider.position.set(x, hAt(x), 0); rider.rotation.z = -Math.atan2(hAt(x + 0.1) - hAt(x), 0.1); }
    else if (u < 0.64) { const v = (u - 0.42) / 0.22, x = 4.9 + (7.6 - 4.9) * v; rider.position.set(x, 1.35 + (hAt(7.6) - 1.35) * v + Math.sin(v * Math.PI) * 1.9, 0); rider.rotation.z = -v * Math.PI * 2; rider.rotation.x = Math.sin(v * Math.PI) * 0.5; } // (a full flip over the gap)
    else { const v = Math.min(1, (u - 0.64) / 0.24), x = 7.6 + (10.6 - 7.6) * (1 - (1 - v) ** 2); rider.position.set(x, hAt(x), 0); rider.rotation.z = -Math.atan2(hAt(x + 0.1) - hAt(x), 0.1); }
  };
  return grp;
}

// ---- the ice rink: a sheet of ice inside low boards with banners, skaters going round, leaning in
export function rink(w = 6, d = 2.4) {
  const k = kits('toy');
  const ice = new IKit(); ice.box(w, 0.06, d, 0xcfeaff, 0, 0.03, 0, { r: 0.4, seg: 2 }); const sheet = ice.mesh(MAT.shiny, { cast: false });
  for (const [x, z, l, rot] of [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]]) { k.toy.box(l, 0.28, 0.08, 0xfbfaf6, x, 0.14, z, { ry: rot, r: 0.03 }); k.toy.box(l * 0.9, 0.12, 0.02, C.coats[Math.floor(rnd() * 6)], x, 0.16, z + (rot ? 0 : Math.sign(z) * 0.05), { ry: rot, r: 0 }); }
  const g = group(k); g.add(sheet);
  const skaters = Array.from({ length: 7 }, (_, i) => { const p = someone({ kid: i % 3 === 2 }); g.add(p); return { p, ph: i / 7, r: 0.75 + (i % 3) * 0.12 }; });
  g.userData.update = (t) => skaters.forEach(({ p, ph, r }, i) => {
    const a = (t * 0.32 + ph) * Math.PI * 2, x = Math.cos(a) * (w / 2 - 0.5) * r, z = Math.sin(a) * (d / 2 - 0.35) * r;
    p.position.set(x, 0.06, z); p.rotation.set(0, Math.atan2(-Math.sin(a) * (w / 2), Math.cos(a) * (d / 2)) + Math.PI, 0); p.rotation.z = 0.15;
    const s = Math.sin(t * 4 + i) * 0.6; p.userData.swing[0].rotation.x = s; p.userData.swing[1].rotation.x = -s; p.userData.arms[0].rotation.z = 0.9; p.userData.arms[1].rotation.z = -0.9;
  });
  return g;
}

// ---- a snowball fight: two little snow forts, three children behind each, snowballs looping between them
export function snowballFight(gap = 3.6) {
  const k = kits('snow');
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.snow.box(0.5, 0.32, 0.34, 0xf2f6fc, s * gap / 2, 0.16, (i - 1) * 0.52, { ry: Math.PI / 2, r: 0.1 });
  const g = group(k);
  const kids = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const p = someone({ kid: true }); p.position.set(s * (gap / 2 + 0.45), 0, (i - 1) * 0.55); p.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(p); kids.push({ p, s, ph: rnd() }); }
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const balls = kids.map(() => { const b = new THREE.Mesh(G.ball, ballMat); b.scale.setScalar(0.06); b.castShadow = true; g.add(b); return b; });
  g.userData.update = (t) => kids.forEach(({ p, s, ph }, i) => {
    const u = (t * 0.55 + ph) % 1, b = balls[i];
    p.userData.arms[1].rotation.x = u < 0.15 ? -2.8 * (u / 0.15) : u < 0.25 ? -2.8 + 2.8 * ((u - 0.15) / 0.1) : 0; // wind up and throw
    p.position.y = u > 0.6 ? Math.max(0, -Math.sin((u - 0.6) * 9)) * 0 : 0; p.scale.y = 0.72 * (u > 0.55 && u < 0.75 ? 0.82 : 1); // (ducking behind the fort)
    if (u > 0.15 && u < 0.55) { const v = (u - 0.15) / 0.4, x0 = s * (gap / 2 + 0.4), x1 = -s * (gap / 2 + 0.3); b.visible = true; b.position.set(x0 + (x1 - x0) * v, 0.45 + Math.sin(v * Math.PI) * 0.9, p.position.z + Math.sin(v * 3 + i) * 0.2); }
    else b.visible = false;
  });
  return g;
}

// ---- a child rolling a snowball along that grows as it goes, then starts again
export function snowmanBuilder(len = 2.2) {
  const g = new THREE.Group(), kid = someone({ kid: true }), mat = new THREE.MeshStandardMaterial({ color: 0xf4f8fd, roughness: 0.9 });
  const ball = new THREE.Mesh(G.ball, mat); ball.castShadow = true; g.add(kid, ball); kid.rotation.y = Math.PI / 2;
  g.userData.update = (t) => { const u = (t / 9) % 1, r = 0.08 + u * 0.26, x = u * len; ball.scale.setScalar(r); ball.position.set(x + 0.22 + r, r, 0); ball.rotation.z = -x / r; kid.position.set(x, 0, 0); walk(kid, t * 0.6, true); for (const a of kid.userData.arms) a.rotation.x = -1.4; };
  return g;
}

// ---- a child on a sled sliding down the ice slide (in the slide's own frame: the run goes from the top toward +z)
export function slideRider() {
  const g = new THREE.Group(), kid = someone({ kid: true }), sled = new THREE.Mesh(G.cap, new THREE.MeshStandardMaterial({ color: 0x3f6fd6, roughness: 0.4 }));
  sled.scale.set(0.06, 0.12, 0.035); sled.rotation.set(Math.PI / 2, 0, 0); sled.position.y = 0.03; for (const h of kid.userData.swing) h.rotation.x = -Math.PI / 2 + 0.2; kid.position.y = -0.06;
  const r = new THREE.Group(); r.add(kid, sled); r.traverse((o) => (o.castShadow = true)); g.add(r);
  const ang = Math.atan2(2.0, 3.6);
  g.userData.update = (t) => { const u = (t / 4) % 1; r.visible = u < 0.8; const v = Math.min(1, u / 0.55); const z = -1.5 + v ** 1.8 * 4.4; const y = z < 2.1 ? 2.05 - (z + 1.5) * Math.tan(ang) : 0.22; r.position.set(0, Math.max(0.22, y), z); r.rotation.x = z < 2.1 ? ang : 0; for (const a of kid.userData.arms) a.rotation.x = -2.6; };
  return g;
}

// ---- dancers for the stage: arms up and down, bobbing, turning
export function dancers(n = 2) {
  const g = new THREE.Group(), ds = Array.from({ length: n }, (_, i) => { const p = winter({ coat: [0x3f6fd6, 0xf08ac0, 0x4fb39a][i % 3], hat: 'beanie', hatCol: 0xfbfaf6, scarf: 0xfbfaf6 }); p.position.x = (i - (n - 1) / 2) * 1.6; g.add(p); return p; });
  g.userData.update = (t) => ds.forEach((p, i) => { const b = t * 4 + i * 1.5; p.position.y = Math.abs(Math.sin(b)) * 0.06; p.userData.arms[0].rotation.x = -1.6 - Math.sin(b) * 1.0; p.userData.arms[1].rotation.x = -1.6 + Math.sin(b) * 1.0; p.rotation.y = Math.sin(t * 0.9 + i) * 0.6; });
  return g;
}

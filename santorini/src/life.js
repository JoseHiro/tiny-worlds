// What moves in the village (santorini/DESIGN.md §4): the traveller in a white dress taking pictures of the dome; a couple
// at the café; diners at the harbour; a donkey and its man up and down the steps; a cat on the terrace wall flicking its
// tail; the catamaran round the bay with a white wake; fishing boats riding the swell at the pier; the windmill's sails;
// the bells now and then; gulls over the cliff. All from the clock.
import * as THREE from 'three';
import { chibi } from '../../fuji/src/people.js';
import { at, facing, rim, HARBOR } from './land.js';
import { waveY } from './sea.js';
import { slot } from './village.js';

const mats = new Map(), m = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.68, side: THREE.DoubleSide })); return mats.get(c); };
const ball = new THREE.SphereGeometry(1, 14, 10), cap = new THREE.CapsuleGeometry(1, 1, 4, 10), cube = new THREE.BoxGeometry(1, 1, 1), rod = new THREE.CylinderGeometry(1, 1, 1, 8), cone = new THREE.ConeGeometry(1, 1, 16);
const put = (g, geo, col, x, y, z, s, r = [0, 0, 0]) => { const o = new THREE.Mesh(geo, m(col)); o.position.set(x, y, z); Array.isArray(s) ? o.scale.set(...s) : o.scale.setScalar(s); o.rotation.set(...r); o.castShadow = true; g.add(o); return o; };
const SKIN = 0xf3c9a5;

function sitter(opts) {
  const p = chibi(opts), g = new THREE.Group();
  for (const h of p.userData.swing) h.rotation.x = -Math.PI / 2 + 0.15;
  p.position.y = -0.1; g.add(p); g.userData.p = p;
  return g;
}
// a dress: a white bell from the waist down, arms bare
function dress(p, col) {
  put(p, cone, col, 0, 0.13, 0, [0.12, 0.2, 0.11]);
  for (const a of p.userData.arms) a.children[0].material = m(SKIN);
}
const triangle = (pts) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.computeVertexNormals(); return g; };

export function life(scene, loop, town) {
  // the traveller at the top, camera up to the dome
  const ha = -102.3, hf = slot(ha, 6.3, rim(ha) + 0.06);
  const hero = chibi({ top: 0xfbfaf6, legs: SKIN, hair: 0x6b4a30, skin: SKIN, hat: 0xe8cf8a, long: true });
  dress(hero, 0xfbfaf6); put(hero, ball, 0x2f7fd6, 0, 0.475, -0.005, [0.168, 0.02, 0.16]); // (the hat's blue band)
  for (const a of hero.userData.arms) a.rotation.x = -1.35;
  const cam = put(hero, cube, 0x25304f, 0, 0.35, 0.2, [0.13, 0.08, 0.06]); put(hero, rod, 0x3a4560, 0, 0.35, 0.24, [0.025, 0.04, 0.025], [Math.PI / 2, 0, 0]);
  hero.position.set(...hf.P(0, 0, 0)); hero.rotation.y = hf.ry - 0.12; scene.add(hero);

  // a cat on the terrace wall beside her
  const cat = new THREE.Group(), cf = slot(-100.2, 6.02, rim(-100.2) + 0.16); cat.position.set(...cf.P(0, 0, 0)); cat.rotation.y = cf.ry + 2.2; scene.add(cat);
  put(cat, cap, 0xf2efe8, 0, 0.07, 0, [0.05, 0.07, 0.05], [Math.PI / 2, 0, 0]); put(cat, ball, 0xf2efe8, 0, 0.13, 0.08, 0.055);
  for (const s of [-1, 1]) { put(cat, cone, 0xe0a070, s * 0.03, 0.19, 0.08, [0.018, 0.04, 0.018]); put(cat, ball, 0x25304f, s * 0.02, 0.14, 0.13, 0.008); }
  put(cat, ball, 0xe0a070, 0, 0.1, -0.03, [0.05, 0.035, 0.05]);
  const tail = new THREE.Group(); tail.position.set(0, 0.07, -0.08); cat.add(tail); put(tail, cap, 0xe0a070, 0, 0.06, -0.02, [0.014, 0.08, 0.014], [-0.5, 0, 0]);

  // a couple at the café, sitting with their backs to us, facing the sea
  for (const [lx, top, hair] of [[-0.4, 0x2f7fd6, 0x2a2018], [0.4, 0xe83d8c, 0xd9b26a]]) {
    const f = slot(-88, 6.45, rim(-88)), s = sitter({ top, hair, legs: 0x3c4778 }); s.position.set(...f.P(lx, 0.14, -0.22)); s.rotation.y = f.ry; scene.add(s);
  }
  // diners at the harbour tables
  for (const [da, top] of [[-3.6, 0xf08a24], [1.6, 0x5bc0eb], [3.6, 0xfbfaf6]]) {
    const f = slot(HARBOR + da, 0.4, 0.22), s = sitter({ top, hair: 0x3a2a20, legs: 0x3c4778, hat: da > 0 ? 0xe8d5a0 : null }); s.position.set(...f.P(-0.2, 0.12, 0)); s.rotation.y = f.ry + Math.PI / 2; scene.add(s);
  }

  // the donkey and its man, up and down the steps
  const donkey = new THREE.Group(); scene.add(donkey);
  put(donkey, cap, 0x8a7a6a, 0, 0.2, 0, [0.07, 0.13, 0.075], [0, 0, Math.PI / 2]);
  const head = new THREE.Group(); head.position.set(0.15, 0.25, 0); donkey.add(head);
  put(head, cap, 0x8a7a6a, 0.05, 0.03, 0, [0.04, 0.06, 0.04], [0, 0, -0.9]); put(head, ball, 0xd9cfc0, 0.1, -0.01, 0, [0.04, 0.035, 0.035]);
  for (const s of [-1, 1]) put(head, cap, 0x8a7a6a, 0.02, 0.1, s * 0.025, [0.012, 0.04, 0.012], [s * 0.3, 0, 0.2]);
  put(donkey, cube, 0xe83d8c, 0, 0.29, 0, [0.12, 0.03, 0.15]); // (a pink saddle cloth)
  const dlegs = [[0.08, 0.04], [0.08, -0.04], [-0.08, 0.04], [-0.08, -0.04]].map(([x, z]) => { const l = new THREE.Group(); l.position.set(x, 0.16, z); donkey.add(l); put(l, cap, 0x6e6052, 0, -0.07, 0, [0.018, 0.06, 0.018]); return l; });
  const man = chibi({ top: 0xf4f1e8, legs: 0x3c4778, hair: 0x2a2018, skin: 0xd9a37a, hat: 0x2a2018 }); scene.add(man);
  const PATH = town.path, segs = []; let total = 0;
  for (let i = 1; i < PATH.length; i++) { const [x0, y0, z0] = PATH[i - 1], [x1, y1, z1] = PATH[i], l = Math.hypot(x1 - x0, z1 - z0); segs.push({ i, l, s: total }); total += l; }
  const along = (s, out) => { s = Math.max(0, Math.min(total - 1e-4, s)); let k = 0; while (k < segs.length - 1 && segs[k + 1].s <= s) k++; const sg = segs[k], u = (s - sg.s) / sg.l, a = PATH[sg.i - 1], b = PATH[sg.i]; out.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u); return Math.atan2(-(b[2] - a[2]), b[0] - a[0]); };

  // the catamaran round the bay: two white hulls, a deck, a tall white sail, and a few people aboard
  const cat2 = new THREE.Group(); scene.add(cat2);
  for (const s of [-1, 1]) put(cat2, cap, 0xfbfaf6, 0, 0.06, s * 0.3, [0.09, 1.2, 0.1], [0, 0, Math.PI / 2]);
  put(cat2, cube, 0xf1ece0, -0.05, 0.14, 0, [1.05, 0.05, 0.68]); put(cat2, cube, 0x2f7fd6, -0.35, 0.22, 0, [0.4, 0.12, 0.5]);
  put(cat2, rod, 0xd9d4c8, 0.1, 1.0, 0, [0.018, 1.7, 0.018]);
  const sail = new THREE.Mesh(triangle([0.12, 0.25, 0, 0.12, 1.8, 0, -0.62, 0.27, 0]), m(0xfdfbf4)); sail.castShadow = true; cat2.add(sail);
  const jib = new THREE.Mesh(triangle([0.14, 1.6, 0, 0.14, 0.24, 0, 0.66, 0.2, 0]), m(0xfdfbf4)); jib.castShadow = true; cat2.add(jib);
  for (const [x, z, top] of [[-0.3, 0.24, 0xe83d8c], [-0.32, -0.22, 0xfbfaf6], [0.28, 0.2, 0xf6d98a]]) { const s = sitter({ top, hair: 0x6b4a30, legs: 0x3c4778 }); s.position.set(x, 0.17, z); s.rotation.y = z > 0 ? 0 : Math.PI; s.scale.setScalar(0.8); cat2.add(s); }
  const BAY = { x: 3.8, z: 3.6, rx: 8.2, rz: 4.6, v: 0.5 }, per = (2 * Math.PI * Math.sqrt((BAY.rx ** 2 + BAY.rz ** 2) / 2)) / BAY.v;
  // the wake: soft white puffs behind it
  const soft = document.createElement('canvas'); soft.width = soft.height = 64;
  { const g = soft.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.55, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }
  const PUFFS = 70, wake = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2faff, map: new THREE.CanvasTexture(soft), transparent: true, opacity: 0.32, depthWrite: false }), PUFFS);
  wake.frustumCulled = false; wake.renderOrder = 1; scene.add(wake);
  const trail = []; let next = 0;

  // fishing boats at the pier: white, a blue band, a red rail, a little wheelhouse
  const kaiki = [[-1.4, -1.35, 0.3], [3.0, -1.2, -0.25], [-0.6, -2.7, 0.9]].map(([da, d, turn]) => {
    const g = new THREE.Group(), a = HARBOR + da, [x, z] = at(a, d); g.position.set(x, 0, z); g.rotation.y = facing(a) + Math.PI / 2 + turn; scene.add(g);
    put(g, cap, 0xfbfaf6, 0, 0.05, 0, [0.12, 0.42, 0.16], [0, 0, Math.PI / 2]); put(g, cap, 0x2f7fd6, 0, 0.02, 0, [0.125, 0.43, 0.165], [0, 0, Math.PI / 2]);
    put(g, cube, 0xc24a3a, 0, 0.13, 0, [0.62, 0.025, 0.25]); put(g, cube, 0xfbfaf6, -0.12, 0.22, 0, [0.18, 0.16, 0.16]); put(g, cube, 0x2f7fd6, -0.12, 0.31, 0, [0.21, 0.025, 0.19]);
    return { g, x, z, ph: da };
  });

  // gulls over the cliff: a body and two wings, instanced
  const N = 12, gm = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.8, side: THREE.DoubleSide });
  const gBody = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5).scale(0.1, 0.035, 0.04), gm, N);
  const wingG = (s) => triangle([0.04, 0, 0, -0.06, 0, 0, -0.03, 0, s * 0.24]);
  const gWings = [wingG(1), wingG(-1)].map((g) => new THREE.InstancedMesh(g, gm, N));
  for (const o of [gBody, ...gWings]) { o.frustumCulled = false; scene.add(o); }
  const gulls = Array.from({ length: N }, (_, i) => ({ c: [[-2, -3], [-9, 0], [6, -4]][i % 3], r: 2 + (i % 5) * 0.8, y: 5 + (i % 6) * 0.7, w: (0.35 + (i % 4) * 0.08) * (i % 2 ? 1 : -1), ph: i * 1.7 }));

  const M = new THREE.Matrix4(), W2 = new THREE.Matrix4(), P = new THREE.Vector3(), P2 = new THREE.Vector3(), Q = new THREE.Quaternion(), R = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  loop.push((t) => {
    // the windmill and the bells
    town.sails.rotation.z = -t * 0.9;
    const ring = Math.max(0, Math.sin(t * 0.18)) ** 30;
    town.bells.forEach((b, i) => { b.rotation.z = Math.sin(t * 5 + i * 1.3) * 0.5 * ring; });
    // the traveller lifts the camera now and then, and lowers it to look
    const shoot = 0.5 + 0.5 * Math.sin(t * 0.35);
    for (const a of hero.userData.arms) a.rotation.x = -0.4 - shoot * 0.95;
    cam.position.y = 0.24 + shoot * 0.11; cam.position.z = 0.14 + shoot * 0.06;
    tail.rotation.y = Math.sin(t * 1.6) * 0.6; tail.rotation.x = Math.sin(t * 0.8) * 0.2;
    // the donkey: up the steps, a rest, and down again (about two minutes round)
    const T = 120, u = (t % T) / T, s = u < 0.45 ? (u / 0.45) * total : u < 0.5 ? total : u < 0.95 ? (1 - (u - 0.5) / 0.45) * total : 0;
    const moving = (u < 0.45 || (u > 0.5 && u < 0.95)), up = u < 0.5;
    let yaw = along(s, P); donkey.position.copy(P); donkey.rotation.y = up ? yaw : yaw + Math.PI;
    dlegs.forEach((l, i) => { l.rotation.z = moving ? Math.sin(t * 9 + (i % 2) * Math.PI + (i > 1 ? 1.5 : 0)) * 0.5 : 0; });
    head.rotation.z = Math.sin(t * 1.3) * 0.1;
    yaw = along(s + (up ? 0.45 : -0.45), P2); man.position.copy(P2); man.rotation.y = (up ? yaw : yaw + Math.PI) + Math.PI / 2;
    const sw = moving ? Math.sin(t * 9) * 0.5 : 0; man.userData.swing[0].rotation.x = sw; man.userData.swing[1].rotation.x = -sw; man.userData.arms[0].rotation.x = -sw * 0.6; man.userData.arms[1].rotation.x = sw * 0.6;
    // the catamaran
    const a = ((t / per) % 1) * Math.PI * 2;
    cat2.position.set(BAY.x + Math.cos(a) * BAY.rx, 0, BAY.z + Math.sin(a) * BAY.rz); cat2.position.y = waveY(cat2.position.x, cat2.position.z, t);
    const dx = -Math.sin(a) * BAY.rx, dz = Math.cos(a) * BAY.rz;
    cat2.rotation.set(Math.sin(t * 1.3) * 0.02, Math.atan2(-dz, dx), 0.03);
    if (t >= next) { next = t + 0.16; cat2.updateMatrixWorld(); P.set(-0.75, 0, 0).applyMatrix4(cat2.matrixWorld); trail.push({ x: P.x, z: P.z, t, yaw: cat2.rotation.y }); if (trail.length > PUFFS) trail.shift(); }
    for (let i = 0; i < PUFFS; i++) {
      const p = trail[i], age = p ? t - p.t : 99, fade = Math.max(0, 1 - age / 9), sc = age < 9 ? 0.1 + age * 0.08 : 0;
      Q.setFromAxisAngle(AY, p?.yaw ?? 0);
      M.compose(P.set(p?.x ?? 0, p ? waveY(p.x, p.z, t) + 0.015 : 0, p?.z ?? 0), Q, S.set(0.3 * fade, 1, sc * fade)); wake.setMatrixAt(i, M);
    }
    wake.instanceMatrix.needsUpdate = true;
    // the fishing boats on the swell
    for (const b of kaiki) { const h = waveY(b.x, b.z, t), fx = waveY(b.x + 0.4, b.z, t) - waveY(b.x - 0.4, b.z, t); b.g.position.y = h; b.g.rotation.z = fx * 0.8 + Math.sin(t * 1.2 + b.ph) * 0.03; b.g.rotation.x = Math.sin(t * 0.9 + b.ph) * 0.03; }
    // the gulls
    gulls.forEach((b, i) => {
      const ga = t * b.w + b.ph;
      P.set(b.c[0] + Math.cos(ga) * b.r, b.y + Math.sin(t * 0.6 + b.ph) * 0.35, b.c[1] + Math.sin(ga) * b.r * 0.7);
      Q.setFromEuler(E.set(0, Math.atan2(-Math.cos(ga) * 0.7 * Math.sign(b.w), -Math.sin(ga) * Math.sign(b.w)), Math.sign(b.w) * 0.3));
      M.compose(P, Q, one); gBody.setMatrixAt(i, M);
      const beat = Math.sin(t * 6 + b.ph) * 0.45 * (Math.sin(t * 0.7 + b.ph) > 0 ? 1 : 0.15); // (flapping, then gliding)
      [1, -1].forEach((s, k) => { W2.makeRotationFromQuaternion(R.setFromAxisAngle(AX, -s * beat)); gWings[k].setMatrixAt(i, W2.premultiply(M)); });
    });
    gBody.instanceMatrix.needsUpdate = true; for (const w of gWings) w.instanceMatrix.needsUpdate = true;
  });
  return { hero, cat: cat2, donkey };
}

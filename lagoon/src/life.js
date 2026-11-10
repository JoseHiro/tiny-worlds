// What moves in the lagoon (lagoon/DESIGN.md §4): our boat riding at anchor with the traveller on its bow and the boatman
// at its tiller; another boat moored beside it; two tour boats under their blue roofs going round the lagoon with a white
// wake; a kayak; snorkellers bobbing by the right-hand cliff; swiftlets wheeling round the tops. All from the clock.
import * as THREE from 'three';
import { chibi } from '../../fuji/src/people.js';
import { longtail, flutter, sheer, LEN } from './boat.js';
import { waveY } from './water.js';

const X = (u) => -LEN / 2 + u * LEN;
export const HERO = { x: -1.3, z: 7.6, yaw: Math.PI / 2 + 0.1 }; // (its nose toward the far cliffs, a little to the left)
const mats = new Map(), m = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.68 })); return mats.get(c); };
const ball = new THREE.SphereGeometry(1, 14, 10), cap = new THREE.CapsuleGeometry(1, 1, 4, 10), cube = new THREE.BoxGeometry(1, 1, 1), rod = new THREE.CylinderGeometry(1, 1, 1, 8);
const put = (g, geo, col, x, y, z, s, r = [0, 0, 0]) => { const o = new THREE.Mesh(geo, m(col)); o.position.set(x, y, z); Array.isArray(s) ? o.scale.set(...s) : o.scale.setScalar(s); o.rotation.set(...r); o.castShadow = true; g.add(o); return o; };

// someone sitting: the legs out in front, a little lean (back: + leans back)
function sitter(opts, { back = 0, armsBack = 0 } = {}) {
  const p = chibi(opts), outer = new THREE.Group();
  for (const h of p.userData.swing) h.rotation.x = -Math.PI / 2 + 0.15;
  for (const a of p.userData.arms) a.rotation.x = armsBack;
  p.rotation.x = -back; p.position.y = -0.1;
  outer.add(p); outer.userData.p = p;
  return outer;
}
// arms and legs bare (a swimsuit): their sleeves and trousers in skin
function bare(p, skin) {
  for (const a of p.userData.arms) a.children[0].material = m(skin);
  for (const h of p.userData.swing) for (const c of h.children) c.material = m(skin);
}

export function life(scene, loop) {
  const boats = [];
  // our boat, and the traveller on its bow looking up at the sun
  const hero = longtail(); hero.group.position.set(HERO.x, 0, HERO.z); hero.group.rotation.y = HERO.yaw; scene.add(hero.group); boats.push({ b: hero, ph: 0, spin: 0 });
  const SKIN = 0xf3c9a5, SUIT = 0xf08a24;
  const tr = sitter({ top: SUIT, legs: SKIN, hair: 0x6b4a30, skin: SKIN, long: true }, { back: 0.28, armsBack: 0.7 });
  const tp = tr.userData.p; bare(tp, SKIN);
  put(tp, ball, SUIT, 0, 0.13, 0, [0.09, 0.045, 0.075]); // (the bottom of the swimsuit)
  put(tp, cube, 0x25304f, 0, 0.415, 0.143, [0.15, 0.036, 0.02]); // the sunglasses
  put(tp, cube, 0x25304f, 0, 0.43, 0.135, [0.17, 0.008, 0.02]);
  const u = 0.74; tr.position.set(X(u), sheer(u) - 0.025, -0.06); tr.rotation.y = -0.3; hero.group.add(tr); // (on the left of the bow, turned to the right, face up to the sun)
  // the boatman at the tiller, in a straw hat
  const bm = sitter({ top: 0xf4f1e8, legs: 0x3c4778, hair: 0x2a2018, skin: 0xd9a37a, hat: 0xe8d5a0 }, { armsBack: -0.9 });
  bm.position.set(X(0.07), 0.16, 0.15); bm.rotation.y = Math.PI / 2 + 0.3; hero.group.add(bm); // (to one side of the tiller)
  put(hero.group, cube, 0x8c4128, X(0.07), 0.07, 0.15, [0.16, 0.14, 0.2]); // (his box seat)

  // a second boat moored alongside, its boatman leaning back, asleep
  const two = longtail(); two.group.position.set(6.4, 0, 9.6); two.group.rotation.y = Math.PI / 2 - 0.5; scene.add(two.group); boats.push({ b: two, ph: 1.7, spin: 0 });
  const sl = sitter({ top: 0x5bc0eb, legs: 0x3c4778, hair: 0x1d1a18, skin: 0xd9a37a, hat: 0xe8d5a0 }, { back: 0.7, armsBack: 0.4 });
  sl.position.set(X(0.4), 0.17, 0); sl.rotation.y = Math.PI / 2; two.group.add(sl);

  // the tour boats round the lagoon, with passengers in orange life jackets
  const LOOP = { x: 0.2, z: -2, rx: 6.6, rz: 4.6, v: 0.55 }, per = (2 * Math.PI * Math.sqrt((LOOP.rx ** 2 + LOOP.rz ** 2) / 2)) / LOOP.v;
  const tours = [0, 0.5].map((at, k) => {
    const b = longtail(true); scene.add(b.group);
    const tops = [[0xf08a24, 0x2a2018], [0xf08a24, 0x6b4a30], [0xf08a24, 0xd9b26a]];
    [0.24, 0.4, 0.56].forEach((uu, i) => { for (const s of [-1, 1]) { if ((i + k + (s > 0)) % 3 === 2) continue; const p = sitter({ top: tops[(i + k) % 3][0], hair: tops[(i + s + 3) % 3][1], legs: 0x3c4778, hat: i === 1 && s > 0 ? 0xfdfbf4 : null }); p.position.set(X(uu) - 0.06, 0.18, s * 0.11); p.rotation.y = Math.PI / 2; p.scale.setScalar(0.9); b.group.add(p); } });
    const man = sitter({ top: 0xf4f1e8, legs: 0x3c4778, hair: 0x2a2018, skin: 0xd9a37a, hat: 0xe8d5a0 }, { armsBack: -0.9 }); man.position.set(X(0.07), 0.16, 0); man.rotation.y = Math.PI / 2 + 0.3; b.group.add(man);
    const t = { b, at, ph: 3 + k, spin: 9, trail: [], next: 0 }; boats.push(t);
    return t;
  });
  // the wake: white puffs dropped behind each tour boat that spread and fade (one instanced mesh)
  const soft = document.createElement('canvas'); soft.width = soft.height = 64;
  { const g = soft.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.55, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }
  const PUFFS = 70, wake = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xeafffb, map: new THREE.CanvasTexture(soft), transparent: true, opacity: 0.3, depthWrite: false }), PUFFS * tours.length);
  wake.frustumCulled = false; wake.renderOrder = 1; scene.add(wake);

  // a red kayak with two paddlers, round a small loop on the left
  const kayak = new THREE.Group(); scene.add(kayak);
  put(kayak, cap, 0xe8483f, 0, 0.03, 0, [0.09, 0.85, 0.12], [0, 0, Math.PI / 2]);
  put(kayak, cap, 0x25304f, 0, 0.08, 0, [0.06, 0.42, 0.07], [0, 0, Math.PI / 2]);
  const paddles = [-0.22, 0.22].map((x, i) => {
    const p = sitter({ top: [0xffd23f, 0x5fc4f0][i], hair: [0x2a2018, 0xd9b26a][i], legs: 0x3c4778, hat: i ? null : 0xfdfbf4 }); p.position.set(x, 0.0, 0); p.rotation.y = Math.PI / 2; p.scale.setScalar(0.85); kayak.add(p);
    for (const a of p.userData.p.userData.arms) a.rotation.x = -1.2;
    const pd = new THREE.Group(); pd.position.set(x + 0.12, 0.24, 0); kayak.add(pd);
    put(pd, rod, 0xd9d4c8, 0, 0, 0, [0.008, 0.62, 0.008], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) put(pd, cube, 0x2f55c4, 0, 0, s * 0.3, [0.008, 0.07, 0.11]);
    return pd;
  });

  // the snorkellers: face down in orange vests, a snorkel up, fins kicking; now and then one lifts a head and waves
  const snorkel = [[7.6, 1.4, 0.4], [8.4, 2.6, 2.1], [6.6, 3.3, 4], [8.8, 0.2, 1.1]].map(([x, z, ph]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ph * 1.3; scene.add(g);
    put(g, cap, 0xf08a24, 0, 0.0, 0, [0.075, 0.12, 0.06], [Math.PI / 2, 0, 0]);
    const head = put(g, ball, 0xf3c9a5, 0, 0.01, 0.2, 0.075); put(g, ball, 0x3a2a20, 0, 0.04, 0.19, [0.078, 0.06, 0.076]);
    put(g, cube, 0x5fc4f0, 0, -0.01, 0.27, [0.1, 0.05, 0.02]);
    put(g, rod, 0xffd23f, 0.06, 0.08, 0.2, [0.008, 0.14, 0.008]);
    const fins = [-1, 1].map((s) => put(g, cube, 0x2f55c4, s * 0.04, -0.02, -0.26, [0.05, 0.012, 0.12]));
    const arm = put(g, cap, 0xf3c9a5, 0.08, 0.04, 0.12, [0.022, 0.06, 0.022]);
    return { g, fins, arm, head, ph };
  });

  // swiftlets round the cliff tops: a body and two wings, instanced
  const SW = 16, swMat = new THREE.MeshStandardMaterial({ color: 0x2b3448, roughness: 0.9, side: THREE.DoubleSide });
  const swBody = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5).scale(0.09, 0.03, 0.035), swMat, SW);
  const wingG = (s) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0.04, 0, 0, -0.05, 0, 0, -0.06, 0, s * 0.2], 3)); g.computeVertexNormals(); return g; };
  const swWings = [wingG(1), wingG(-1)].map((g) => new THREE.InstancedMesh(g, swMat, SW));
  for (const o of [swBody, ...swWings]) { o.frustumCulled = false; scene.add(o); }
  const birds = Array.from({ length: SW }, (_, i) => ({ c: [[2, -10], [-9, -6], [10, -5]][i % 3], r: 2.5 + (i % 5) * 0.9, y: 7 + (i % 7) * 0.8, w: (0.5 + (i % 4) * 0.15) * (i % 2 ? 1 : -1), ph: i * 1.9 }));

  const M = new THREE.Matrix4(), W2 = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), R = new THREE.Quaternion(), E = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3();
  loop.push((t, dt) => {
    for (const o of boats) { // riding the small waves
      const g = o.b.group;
      if (o.at === undefined) { // (on the swell: up and down with it, and tipped by how it slopes under the boat)
        const x = g.position.x, z = g.position.z, h = waveY(x, z, t), fx = waveY(x + 0.6, z, t) - waveY(x - 0.6, z, t), fz = waveY(x, z + 0.6, t) - waveY(x, z - 0.6, t);
        g.position.y = h; g.rotation.x = -fx * 0.5 + Math.sin(t * 1.1 + o.ph) * 0.01; g.rotation.z = fz * 0.5;
      }
      flutter(o.b, t + o.ph, o.spin);
    }
    tours.forEach((o, k) => { // round the loop, nose along it
      const a = ((t / per + o.at) % 1) * Math.PI * 2, g = o.b.group;
      g.position.set(LOOP.x + Math.cos(a) * LOOP.rx, 0, LOOP.z + Math.sin(a) * LOOP.rz); g.position.y = waveY(g.position.x, g.position.z, t);
      const dx = -Math.sin(a) * LOOP.rx, dz = Math.cos(a) * LOOP.rz;
      g.rotation.set(Math.sin(t * 1.7 + k) * 0.02, Math.atan2(-dz, dx), -0.04);
      if (t >= o.next) { o.next = t + 0.16; g.updateMatrixWorld(); P.set(-LEN / 2 - 0.55, 0, 0).applyMatrix4(g.matrixWorld); o.trail.push({ x: P.x, z: P.z, t, yaw: g.rotation.y }); if (o.trail.length > PUFFS) o.trail.shift(); }
      for (let i = 0; i < PUFFS; i++) { // (each puff long along the boat's way when dropped, spreading sideways as it ages)
        const p = o.trail[i], age = p ? t - p.t : 99, fade = Math.max(0, 1 - age / 9), s = age < 9 ? 0.08 + age * 0.07 : 0;
        Q.setFromAxisAngle(AY, p?.yaw ?? 0);
        M.compose(P.set(p?.x ?? 0, p ? waveY(p.x, p.z, t) + 0.015 : 0, p?.z ?? 0), Q, S.set(0.22 * fade, 1, s * fade));
        wake.setMatrixAt(k * PUFFS + i, M);
      }
    });
    wake.instanceMatrix.needsUpdate = true;
    // the kayak
    const ka = t * 0.07, kc = [-5.6, -1.2];
    kayak.position.set(kc[0] + Math.cos(ka) * 2.4, 0, kc[1] + Math.sin(ka) * 1.6); kayak.position.y = waveY(kayak.position.x, kayak.position.z, t);
    kayak.rotation.y = Math.atan2(-Math.cos(ka) * 1.6, -Math.sin(ka) * 2.4);
    paddles.forEach((pd, i) => { pd.rotation.x = Math.sin(t * 2.6 + i * 0.6) * 0.6; pd.rotation.z = Math.cos(t * 2.6 + i * 0.6) * 0.12; });
    // the snorkellers
    for (const s of snorkel) {
      s.g.position.y = waveY(s.g.position.x, s.g.position.z, t) + Math.sin(t * 1.4 + s.ph) * 0.008;
      s.fins.forEach((f, i) => { f.rotation.x = Math.sin(t * 5 + s.ph + i * Math.PI) * 0.4; });
      const wave = Math.max(0, Math.sin(t * 0.25 + s.ph * 2)) ** 18;
      s.arm.rotation.z = -wave * 2.6 + Math.sin(t * 8) * wave * 0.4; s.arm.position.y = 0.04 + wave * 0.08;
    }
    // our traveller now and then puts a hand up to her hair
    tp.userData.arms[1].rotation.x = 0.7 - Math.max(0, Math.sin(t * 0.21)) ** 14 * 3.2;
    // the swiftlets
    birds.forEach((b, i) => {
      const a = t * b.w + b.ph;
      P.set(b.c[0] + Math.cos(a) * b.r, b.y + Math.sin(t * 0.8 + b.ph) * 0.4, b.c[1] + Math.sin(a) * b.r * 0.7);
      Q.setFromEuler(E.set(0, Math.atan2(-Math.cos(a) * 0.7 * Math.sign(b.w), -Math.sin(a) * Math.sign(b.w)), Math.sign(b.w) * 0.35));
      M.compose(P, Q, one); swBody.setMatrixAt(i, M);
      const beat = Math.sin(t * 22 + b.ph) * 0.7;
      [1, -1].forEach((s, k) => { W2.makeRotationFromQuaternion(R.setFromAxisAngle(AX, -s * beat)); swWings[k].setMatrixAt(i, W2.premultiply(M)); });
    });
    swBody.instanceMatrix.needsUpdate = true; for (const w of swWings) w.instanceMatrix.needsUpdate = true;
  });
  return { hero, tours: tours.map((o) => o.b.group), kayak };
}

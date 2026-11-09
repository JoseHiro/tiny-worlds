// The little people (fuji/DESIGN.md §2, §4): two and a half heads tall, round, with dots for eyes and a blush. The clerk
// nods at the till; two shoppers come over and go in and out by turns; a tourist photographs the mountain; a cat sits on a
// wheel stop and flicks its tail. All from the clock, so it comes round again.
import * as THREE from 'three';
import { DOOR, FRONT, FLOOR } from './shop.js';
import { LOT } from './lot.js';

const mats = new Map(), mat = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.68 })); return mats.get(c); };
const ballG = new THREE.SphereGeometry(1, 16, 12), capG = new THREE.CapsuleGeometry(1, 1, 4, 12);
const add = (g, geo, col, x, y, z, s, shadow = true) => { const m = new THREE.Mesh(geo, mat(col)); m.position.set(x, y, z); Array.isArray(s) ? m.scale.set(...s) : m.scale.setScalar(s); m.castShadow = shadow; g.add(m); return m; };

// a person faces +z, feet at y = 0, 0.58 tall
export function chibi({ top = 0x5bc0eb, legs = 0x3c4778, hair = 0x3a2a20, skin = 0xf6d3b8, hat = null, pack = null, long = false } = {}) {
  const g = new THREE.Group();
  const swing = [-1, 1].map((s) => { const hip = new THREE.Group(); hip.position.set(s * 0.05, 0.13, 0); add(hip, capG, legs, 0, -0.055, 0, [0.036, 0.04, 0.036]); add(hip, ballG, 0x31384a, 0, -0.112, 0.012, [0.042, 0.022, 0.056]); g.add(hip); return hip; });
  add(g, capG, top, 0, 0.2, 0, [0.095, 0.05, 0.08]);
  const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * 0.1, 0.27, 0); add(a, capG, top, 0, -0.05, 0, [0.03, 0.04, 0.03]); add(a, ballG, skin, 0, -0.11, 0, 0.032); g.add(a); return a; });
  add(g, ballG, skin, 0, 0.42, 0, [0.155, 0.145, 0.145]); // the big head
  add(g, ballG, hair, 0, 0.45, -0.018, [0.162, 0.135, 0.15]);
  add(g, ballG, skin, 0, 0.405, 0.04, [0.138, 0.112, 0.112], false); // (the face, over the hair)
  for (const s of [-1, 1]) { add(g, ballG, 0x25304f, s * 0.056, 0.41, 0.142, [0.015, 0.02, 0.008], false); add(g, ballG, 0xf7a8a8, s * 0.092, 0.375, 0.122, [0.024, 0.015, 0.01], false); }
  if (long) add(g, ballG, hair, 0, 0.34, -0.09, [0.12, 0.13, 0.07]);
  if (hat) { add(g, ballG, hat, 0, 0.5, -0.005, [0.158, 0.09, 0.15]); add(g, ballG, hat, 0, 0.47, 0.13, [0.09, 0.015, 0.07]); }
  if (pack) add(g, ballG, pack, 0, 0.22, -0.12, [0.085, 0.1, 0.06]);
  g.userData = { swing, arms };
  return g;
}
// walk cycle: legs and arms swing with distance covered
const pace = (p, walked, moving) => { const a = moving ? Math.sin(walked * 22) * 0.6 : 0; p.userData.swing[0].rotation.x = a; p.userData.swing[1].rotation.x = -a; p.userData.arms[0].rotation.x = -a * 0.7; p.userData.arms[1].rotation.x = a * 0.7; };

// a route: [x, z, secondsToWaitHere]; returns where someone is at time t (walks at `v`)
function route(points, v = 0.55) {
  const legs = []; let T = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, z, wait = 0] = points[i], [nx, nz] = points[(i + 1) % points.length];
    if (wait) { legs.push({ t0: T, t1: T + wait, x, z }); T += wait; }
    const len = Math.hypot(nx - x, nz - z);
    if (len) { legs.push({ t0: T, t1: T + len / v, x, z, nx, nz, len }); T += len / v; }
  }
  const at = (t, out) => {
    t = ((t % T) + T) % T;
    const l = legs.find((e) => t < e.t1) ?? legs.at(-1), u = (t - l.t0) / (l.t1 - l.t0);
    if (!l.len) { out.x = l.x; out.z = l.z; out.moving = false; return out; }
    out.x = l.x + (l.nx - l.x) * u; out.z = l.z + (l.nz - l.z) * u; out.yaw = Math.atan2(l.nx - l.x, l.nz - l.z); out.moving = true; out.walked = u * l.len;
    return out;
  };
  return { at, T };
}

export function people(scene, life, shop) {
  // the clerk, at the till, in the shop's blue
  const clerk = chibi({ top: 0x2f55c4, hair: 0x2a2018 }); clerk.position.set(1.5, FLOOR, -1.16); scene.add(clerk);
  add(clerk, ballG, 0xfdfbf4, 0, 0.2, 0.078, [0.05, 0.05, 0.012], false);

  // the shoppers, in by the door and out again
  const walkers = [
    { p: chibi({ top: 0xf7a8b8, legs: 0x4c6fd1, hair: 0x2a2018, long: true }), r: route([[-6.2, 3.4], [DOOR, 2.1], [DOOR, -0.8], [-1.05, -0.8, 5], [DOOR, -0.8], [DOOR, 2.1], [5.8, 3.4], [5.8, 3.4, 1], [-6.2, 3.4, 0]]), ph: 0 },
    { p: chibi({ top: 0xffc857, legs: 0x5c6680, hair: 0x6b5a48, hat: 0x3e6a6a }), r: route([[5.4, 3.5], [DOOR + 0.1, 2.2], [DOOR + 0.1, -0.85], [-0.55, -0.85, 4], [DOOR + 0.1, -0.85], [DOOR + 0.1, 2.2], [-5.8, 3.6], [-5.8, 3.6, 2], [5.4, 3.5, 0]]), ph: 7 },
  ];
  for (const w of walkers) { w.at = {}; scene.add(w.p); }

  // the tourist, with a backpack and a phone held up to the mountain
  const t = chibi({ top: 0xe8483f, legs: 0x3c4778, hair: 0x1d1a18, hat: 0xfdfbf4, pack: 0x4a7a72 }); t.position.set(-1.8, LOT, 3.1); t.rotation.y = Math.PI + 0.1; scene.add(t);
  for (const a of t.userData.arms) a.rotation.x = -2.2;
  const phone = new THREE.Group(); phone.position.set(0, 0.34, 0.2); t.add(phone);
  add(phone, new THREE.BoxGeometry(1, 1, 1), 0x25304f, 0, 0, 0, [0.075, 0.12, 0.012], false);
  const flash = new THREE.Mesh(ballG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); flash.scale.setScalar(0.035); flash.position.set(0, 0.045, 0.012); phone.add(flash);

  // the cat, on a wheel stop, its back to the car park, looking at the mountain too
  const cat = new THREE.Group(); cat.position.set(-3.2, LOT + 0.09, 0.56); scene.add(cat);
  const C = 0xf2a65a;
  add(cat, ballG, C, 0, 0.07, 0, [0.075, 0.07, 0.06]); add(cat, ballG, C, 0, 0.15, 0.02, 0.06);
  for (const s of [-1, 1]) { const ear = add(cat, new THREE.ConeGeometry(1, 1, 6), C, s * 0.033, 0.215, 0.02, [0.02, 0.035, 0.02]); ear.rotation.z = -s * 0.2; }
  const tail = new THREE.Group(); tail.position.set(0.06, 0.03, -0.03); cat.add(tail);
  const tailM = add(tail, capG, 0xd98c42, 0.045, 0.02, 0, [0.014, 0.06, 0.014]); tailM.rotation.z = -1.1;
  cat.rotation.y = Math.PI + 0.3;

  life.push((time, dt) => {
    let near = false;
    for (const w of walkers) {
      const s = w.r.at(time + w.ph, w.at);
      w.p.position.set(s.x, s.z < 0.3 ? FLOOR : LOT, s.z);
      if (s.moving) w.p.rotation.y = s.yaw; else w.p.rotation.y = Math.PI * 0.5 * (w.ph ? 1 : -1) + Math.PI / 2; // (facing the shelves)
      pace(w.p, s.walked ?? 0, s.moving);
      if (Math.abs(s.x - DOOR) < 0.7 && Math.abs(s.z - FRONT) < 0.85) near = true;
    }
    shop.update(dt, near);
    clerk.rotation.x = Math.max(0, Math.sin(time * 0.5)) ** 12 * 0.32; // (a small bow, now and then)
    flash.material.opacity = ((time * 0.2) % 1) < 0.035 ? 1 : 0;
    tail.rotation.z = Math.sin(time * 1.7) * 0.45;
  });
}

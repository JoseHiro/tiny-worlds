// People and animals of Venice (venice/DESIGN.md §1.8, §1.9): fuji's chibi (2.5 heads, 0.58 tall) in light clothes;
// the gondolier in his striped shirt and straw hat with a red ribbon; a singer and an accordion player; café musicians;
// a waiter with a tray; a market seller; a glassblower with a glowing gather on his pipe; a painter at an easel; a child
// with a ball; residents with a shopping bag or a dog; masked figures in cloaks; a couple. And pigeons (walking,
// pecking, a flock taking off and wheeling), gulls, a sleeping cat, a dog.
import * as THREE from 'three';
import { chibi } from '../../fuji/src/people.js';
import { G, C } from './kit.js';

const mats = new Map(), m = (c, rough = 0.8, extra = {}) => { const key = c + ':' + rough + JSON.stringify(extra); if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: rough, ...extra })); return mats.get(key); };
export const put = (g, geo, col, x, y, z, s, r = [0, 0, 0], rough, extra) => { const o = new THREE.Mesh(geo, m(col, rough, extra)); o.position.set(x, y, z); Array.isArray(s) ? o.scale.set(...s) : o.scale.setScalar(s); o.rotation.set(...r); o.castShadow = true; g.add(o); return o; };
export const walk = (p, t, on = true, ph = 0) => { const a = on ? Math.sin(t * 7 + ph) * 0.55 : 0; p.userData.swing[0].rotation.x = a; p.userData.swing[1].rotation.x = -a; p.userData.arms[0].rotation.x = -a * 0.7; p.userData.arms[1].rotation.x = a * 0.7; };

const SHIRTS = [0xf4efe4, 0x6fb0e0, 0xf08a7a, 0xf2c230, 0x8fd0b0, 0xe8a0c8, 0x3f6fd6, 0xffffff];
// a person in summer clothes: hat 'sun' (straw), 'cap', 'panama' or null; extra: 'camera' | 'map' | 'bag' | 'pack'
export function summer({ top = SHIRTS[0], legs = 0x3c4778, hat = null, hatCol = 0xe8d39a, hair = 0x3a2a20, skin = 0xf6d3b8, extra = null, long = false, kid = false, dress = false } = {}) {
  const p = chibi({ top, legs: dress ? top : legs, hair, skin, long });
  if (dress) put(p, G.cone, top, 0, 0.12, 0, [0.12, 0.2, 0.11]);
  if (hat === 'sun') { put(p, G.cyl, hatCol, 0, 0.53, -0.01, [0.24, 0.012, 0.23], [0.06, 0, 0], 0.9); put(p, G.half, hatCol, 0, 0.53, -0.01, [0.15, 0.1, 0.15], [0, 0, 0], 0.9); put(p, G.cyl, 0xd8383a, 0, 0.55, -0.01, [0.152, 0.025, 0.152]); }
  else if (hat === 'cap') { put(p, G.half, hatCol, 0, 0.5, -0.01, [0.165, 0.11, 0.16]); put(p, G.cyl, hatCol, 0, 0.5, 0.12, [0.1, 0.01, 0.08]); }
  else if (hat === 'panama') { put(p, G.cyl, hatCol, 0, 0.55, -0.01, [0.19, 0.01, 0.18]); put(p, G.cyl, hatCol, 0, 0.6, -0.01, [0.13, 0.1, 0.12]); put(p, G.cyl, 0x2f2a2a, 0, 0.57, -0.01, [0.132, 0.025, 0.122]); }
  if (extra === 'camera') put(p, G.ball, 0x25304f, 0, 0.2, 0.1, [0.05, 0.035, 0.03]);
  if (extra === 'map') put(p.userData.arms[1], G.plane, 0xf4ecd6, 0, -0.12, 0.06, [0.14, 0.1, 1], [-0.6, 0, 0]);
  if (extra === 'bag') put(p.userData.arms[0], G.cap, 0xc9a26a, 0, -0.16, 0, [0.05, 0.05, 0.03]);
  if (extra === 'pack') put(p, G.ball, 0xe8673c, 0, 0.22, -0.1, [0.08, 0.1, 0.06]);
  if (kid) p.scale.setScalar(0.72);
  return p;
}
// the gondolier: a striped shirt (red or navy and white), dark trousers, a straw boater with a ribbon, an oar
export function gondolier({ stripe = C.poleRed } = {}) {
  const p = chibi({ top: 0xffffff, legs: 0x23263a, hair: 0x2a2018 });
  for (const y of [0.16, 0.2, 0.24]) put(p, G.torus, stripe, 0, y, 0, [0.09, 0.08, 0.025], [Math.PI / 2, 0, 0]);
  for (const a of p.userData.arms) put(a, G.torus, stripe, 0, -0.04, 0, [0.032, 0.032, 0.012], [Math.PI / 2, 0, 0]);
  put(p, G.cyl, 0xe8d39a, 0, 0.55, -0.01, [0.2, 0.012, 0.19], [0, 0, 0], 0.9); put(p, G.cyl, 0xe8d39a, 0, 0.59, -0.01, [0.13, 0.08, 0.12], [0, 0, 0], 0.9); put(p, G.cyl, stripe, 0, 0.575, -0.01, [0.132, 0.025, 0.122]);
  const oar = new THREE.Group(); put(oar, G.cyl8, 0xc9965a, 0, 0, 0, [0.014, 1.5, 0.014]); put(oar, G.cap, 0xc9965a, 0, -0.78, 0, [0.04, 0.09, 0.012]);
  oar.position.set(0.12, 0.2, 0.1); oar.rotation.set(0.55, 0, 0.15); p.add(oar);
  p.userData.oar = oar;
  // rowing: lean in and push, swing back
  p.userData.row = (t) => { const s = Math.sin(t * 2.2); oar.rotation.x = 0.55 + s * 0.25; p.userData.arms[0].rotation.x = p.userData.arms[1].rotation.x = -1.0 + s * 0.35; p.rotation.x = s * 0.06; };
  p.userData.update = (t) => p.userData.row(t);
  return p;
}
export const accordion = () => { const p = summer({ top: 0x2f3445, hat: 'panama', hatCol: 0xf4efe4 }); const a = new THREE.Group(); put(a, G.cap, 0xd8383a, 0, 0, 0, [0.07, 0.05, 0.05], [0, 0, Math.PI / 2], 0.4); for (const s of [-1, 1]) put(a, G.cyl, 0xfbfaf6, s * 0.08, 0, 0, [0.05, 0.02, 0.05], [0, 0, Math.PI / 2]); a.position.set(0, 0.22, 0.12); p.add(a); p.userData.update = (t) => { a.scale.x = 1 + Math.sin(t * 3) * 0.25; for (const r of p.userData.arms) r.rotation.x = -1.1; p.userData.arms[0].rotation.z = 0.3 + Math.sin(t * 3) * 0.2; p.userData.arms[1].rotation.z = -0.3 - Math.sin(t * 3) * 0.2; }; return p; };
export const singer = () => { const p = summer({ top: 0xfbfaf6, legs: 0x23263a, hat: null, hair: 0x2a2018 }); put(p, G.ball, 0xd8383a, 0, 0.29, 0.07, [0.04, 0.025, 0.02]); p.userData.update = (t) => { p.userData.arms[0].rotation.z = -1.2 - Math.sin(t * 1.5) * 0.4; p.userData.arms[1].rotation.x = -0.6; p.rotation.y = Math.sin(t * 0.7) * 0.3; }; return p; };

// the cast for the catalogue (each a Group, front +z, with userData.update)
export const ROLES = {
  tourists: () => [
    summer({ top: SHIRTS[1], hat: 'sun', extra: 'camera' }), summer({ top: SHIRTS[2], hat: 'cap', hatCol: 0xfbfaf6, extra: 'map' }), summer({ top: SHIRTS[4], dress: true, long: true, hair: 0x6b4a30, hat: 'sun', hatCol: 0xf4e4c4 }),
    summer({ top: SHIRTS[3], extra: 'pack', hair: 0xd9b26a }), summer({ top: SHIRTS[5], dress: true, long: true, hair: 0x2a2018, extra: 'bag' }), summer({ top: SHIRTS[6], hat: 'panama', hatCol: 0xf4efe4, extra: 'camera', legs: 0xc9b48a }),
  ].map((p, i) => { p.userData.update = (t) => walk(p, t, true, i); return p; }),
  boat: () => [gondolier(), gondolier({ stripe: C.ink }), singer(), accordion()],
  cafe: () => {
    const waiter = summer({ top: 0xfbfaf6, legs: 0x23263a, hair: 0x2a2018 }); put(waiter, G.ball, 0x23263a, 0, 0.2, 0.01, [0.1, 0.06, 0.085]); const tray = put(waiter.userData.arms[1], G.cyl, 0xd0d4dc, 0, -0.12, 0.08, [0.1, 0.01, 0.1], [0, 0, 0], 0.3, { metalness: 0.6 }); put(waiter.userData.arms[1], G.cyl, 0xe8673c, 0.03, -0.09, 0.08, [0.02, 0.05, 0.02]);
    waiter.userData.update = (t) => { walk(waiter, t, true); waiter.userData.arms[1].rotation.x = -1.4; waiter.userData.arms[1].rotation.z = -0.4; };
    const violin = summer({ top: 0xfbfaf6, legs: 0x23263a, hair: 0x6b4a30 }); const v = put(violin, G.cap, 0x9a4a24, 0.1, 0.33, 0.06, [0.035, 0.05, 0.015], [0, 0, 0.8], 0.4); const bow = put(violin.userData.arms[0], G.cyl8, 0xd9c9a3, 0, -0.12, 0.08, [0.006, 0.24, 0.006], [0, 0, 1.3]);
    violin.userData.update = (t) => { violin.userData.arms[1].rotation.set(-1.6, 0, -0.6); violin.userData.arms[0].rotation.set(-1.3, 0, 0.6 + Math.sin(t * 5) * 0.3); };
    const pianist = summer({ top: 0x23263a, legs: 0x23263a, hair: 0xb8b0a6 }); pianist.userData.update = (t) => { pianist.userData.arms[0].rotation.x = -1.2 + Math.sin(t * 6) * 0.15; pianist.userData.arms[1].rotation.x = -1.2 + Math.sin(t * 6 + 1) * 0.15; };
    return [waiter, violin, pianist];
  },
  workers: () => {
    const seller = summer({ top: 0x6fb0e0, hair: 0x6b4a30 }); put(seller, G.cyl8, 0xfbfaf6, 0, 0.15, 0.09, [0.09, 0.22, 0.02]); seller.userData.update = (t) => { seller.userData.arms[1].rotation.x = -1 + Math.sin(t * 2) * 0.3; };
    const glass = summer({ top: 0x8a7a6e, hair: 0x2a2018 }); put(glass, G.cyl8, 0x5a4a40, 0, 0.15, 0.09, [0.09, 0.22, 0.02]);
    const pipe = new THREE.Group(); put(pipe, G.cyl8, 0x5a6070, 0, 0, 0, [0.01, 0.7, 0.01], [0, 0, 0], 0.4, { metalness: 0.6 }); put(pipe, G.ball, 0xff8a3a, 0, 0.37, 0, 0.05, [0, 0, 0], 0.3, { emissive: 0xff6a1a, emissiveIntensity: 1.4 }); pipe.position.set(0.05, 0.22, 0.2); pipe.rotation.x = 1.2; glass.add(pipe);
    glass.userData.update = (t) => { pipe.rotation.y = t * 2; glass.userData.arms[0].rotation.x = glass.userData.arms[1].rotation.x = -1.0; };
    const painter = summer({ top: 0xe8a0c8, hat: 'panama', hatCol: 0x2f3445, hair: 0xb8b0a6 }); const easel = new THREE.Group(); for (const s of [-1, 1]) put(easel, G.cyl8, 0x8a5a3a, s * 0.08, 0.25, 0, [0.008, 0.5, 0.008], [0.15, 0, -s * 0.12]); put(easel, G.plane, 0xfbfaf6, 0, 0.35, 0.03, [0.22, 0.17, 1], [-0.15, Math.PI, 0]); put(easel, G.plane, 0x46b3a4, 0, 0.33, 0.025, [0.18, 0.06, 1], [-0.15, Math.PI, 0]); easel.position.set(0, 0, 0.3); painter.add(easel);
    painter.userData.update = (t) => { painter.userData.arms[0].rotation.set(-1.2, 0, Math.sin(t * 3) * 0.3); };
    return [seller, glass, painter];
  },
  locals: () => {
    const kid = summer({ top: 0xf2c230, kid: true, hair: 0x6b4a30 }); const ball = put(kid, G.ball, 0xfbfaf6, 0, 0.06, 0.25, 0.08); kid.userData.update = (t) => { walk(kid, t, true); ball.position.z = 0.25 + Math.abs(Math.sin(t * 3.5)) * 0.15; ball.position.y = 0.06 + Math.abs(Math.sin(t * 3.5)) * 0.1; };
    const nonna = summer({ top: 0x8a6fb0, dress: true, hair: 0xd8d4cc, extra: 'bag' }); nonna.userData.update = (t) => walk(nonna, t * 0.6, true);
    const man = summer({ top: 0x4f8a6a, hat: 'cap', hatCol: 0x3a3f4f, legs: 0x8a7a5a }); const d = dog(); d.position.set(0.3, 0, 0.2); man.add(d); man.userData.update = (t) => { walk(man, t, true); d.userData.update(t); };
    return [kid, nonna, man];
  },
  masks: () => [[0xfbfaf6, 0xd8383a, 0xd9b04a], [0xd9b04a, 0x24345f, 0xe8a0c8], [0x2a2018, 0x6a2a6a, 0xfbfaf6]].map(([mask, cloak, trim], i) => {
    const p = chibi({ top: cloak, legs: cloak, hair: 0x2a2018 });
    put(p, G.cone, cloak, 0, 0.22, 0, [0.16, 0.36, 0.15], [0, 0, 0], 0.6); // the cloak
    put(p, G.ball, mask, 0, 0.42, 0.06, [0.13, 0.13, 0.1], [0, 0, 0], 0.3, i === 1 ? { metalness: 0.7 } : {}); // the mask over the face
    for (const s of [-1, 1]) put(p, G.ball, 0x1e2433, s * 0.05, 0.43, 0.15, [0.025, 0.018, 0.01]);
    put(p, G.cyl, cloak, 0, 0.55, 0, [0.2, 0.02, 0.2]); put(p, G.cyl, cloak, 0, 0.6, 0, [0.12, 0.1, 0.12]); // a tricorn-ish hat
    for (let f = 0; f < 3; f++) put(p, G.cap, trim, -0.06 + f * 0.05, 0.72, -0.03, [0.02, 0.07, 0.01], [0, 0, -0.4 + f * 0.4]); // feathers
    p.userData.update = (t) => { p.rotation.y = Math.sin(t * 0.6 + i) * 0.5; p.userData.arms[1].rotation.x = -0.4 + Math.sin(t * 0.6 + i) * 0.3; };
    return p;
  }),
  couple: () => { const g = new THREE.Group(); const a = summer({ top: 0x3f6fd6, hat: 'panama', hatCol: 0xf4efe4 }), b = summer({ top: 0xf08a7a, dress: true, long: true, hair: 0x6b4a30, hat: 'sun', hatCol: 0xf4e4c4 }); a.position.x = -0.13; b.position.x = 0.13; g.add(a, b); a.userData.arms[0].rotation.z = 0.5; b.userData.arms[1].rotation.z = -0.5; g.userData.update = (t) => { walk(a, t, true); walk(b, t, true, Math.PI); }; return g; },
};

// ---- animals ----
const PIG = 0x8a8fa0;
const LOWB = new THREE.IcosahedronGeometry(1, 1), LOWC = new THREE.ConeGeometry(1, 1, 5);
const lowPut = (g, geo, col, x, y, z, s, r, rough, extra) => { const o = put(g, geo === G.ball ? LOWB : geo === G.cone ? LOWC : geo, col, x, y, z, s, r, rough, extra); o.castShadow = false; return o; };
function pigeonBody(g) { const put = lowPut;
  put(g, G.ball, PIG, 0, 0.06, 0, [0.04, 0.038, 0.06], [0, 0, 0], 0.7); put(g, G.ball, 0x6f7a8a, 0, 0.095, 0.045, 0.024, [0, 0, 0], 0.4, { metalness: 0.3 }); put(g, G.ball, 0x5f9a8a, 0, 0.075, 0.04, [0.028, 0.02, 0.02], [0, 0, 0], 0.3, { metalness: 0.5 });
  put(g, G.cone, 0x3a3f4f, 0, 0.09, 0.075, [0.006, 0.02, 0.006], [Math.PI / 2, 0, 0]); put(g, G.cap, 0x6f7480, 0, 0.065, -0.07, [0.02, 0.03, 0.008], [-Math.PI / 2 + 0.3, 0, 0]);
  const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.035, 0.075, 0); put(w, G.ball, 0x9aa0b0, s * 0.03, 0, -0.01, [0.04, 0.008, 0.035]); g.add(w); return w; });
  return wings;
}
// a flock that walks and pecks, then (every `every` seconds, or on flush()) bursts up, wheels round and settles
export function pigeons(n = 24, { r = 1.6, every = 9 } = {}) {
  const g = new THREE.Group(), birds = [], rnd = ((s) => () => ((s = (s * 16807) % 2147483647) / 2147483647))(7);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group(), wings = pigeonBody(b), home = [(rnd() - 0.5) * 2 * r, (rnd() - 0.5) * 2 * r * 0.7];
    b.position.set(home[0], 0, home[1]); b.rotation.y = rnd() * 6.28; g.add(b);
    birds.push({ b, wings, home, ph: rnd() * 6, wr: 1.4 + rnd() * 1.6, wh: 1.2 + rnd() * 1.4, dir: rnd() > 0.5 ? 1 : -1 });
  }
  let t0 = -99;
  g.userData.flush = (t) => { t0 = t; };
  g.userData.update = (t) => {
    if (every && t - t0 > every) t0 = t;
    const u = t - t0, F = 4.2; // seconds in the air
    for (const q of birds) {
      const { b, wings } = q;
      if (u >= 0 && u < F) {
        const k = Math.sin((u / F) * Math.PI), a = q.ph + u * 1.4 * q.dir;
        b.position.set(q.home[0] * (1 - k) + Math.cos(a) * q.wr * k, k * q.wh + Math.sin(u * 5 + q.ph) * 0.05 * k, q.home[1] * (1 - k) + Math.sin(a) * q.wr * k);
        b.rotation.set(0, -a * q.dir + (q.dir > 0 ? Math.PI : 0), 0);
        const flap = Math.sin(t * 28 + q.ph) * 0.9 * (0.3 + k); wings[0].rotation.z = flap; wings[1].rotation.z = -flap;
      } else {
        b.position.set(q.home[0], 0, q.home[1]); wings[0].rotation.z = wings[1].rotation.z = 0;
        b.rotation.x = Math.max(0, Math.sin(t * 2.5 + q.ph * 3)) ** 6 * 0.6; // pecking
      }
    }
  };
  return g;
}
export function gull() { // a gull wheeling (in its own little circle) with a slow wingbeat
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  put(b, G.ball, 0xfbfaf6, 0, 0, 0, [0.06, 0.05, 0.12]); put(b, G.ball, 0xfbfaf6, 0, 0.03, 0.1, 0.045); put(b, G.cone, 0xf2c230, 0, 0.025, 0.16, [0.012, 0.05, 0.012], [Math.PI / 2, 0, 0]);
  const wings = [-1, 1].map((s) => { const w = new THREE.Group(); put(w, G.ball, 0xb8c0cc, s * 0.13, 0, 0, [0.14, 0.01, 0.05]); put(w, G.ball, 0x3a3f4f, s * 0.25, 0, -0.01, [0.04, 0.008, 0.03]); b.add(w); return w; });
  g.userData.update = (t) => { const a = t * 0.6; b.position.set(Math.cos(a) * 0.8, 1.2 + Math.sin(t * 0.9) * 0.1, Math.sin(a) * 0.8); b.rotation.set(0, -a, 0.3); const f = Math.sin(t * 4) * 0.4; wings[0].rotation.z = f; wings[1].rotation.z = -f; };
  return g;
}
export function cat() { // an orange cat curled asleep on a step, its side rising and falling
  const g = new THREE.Group(), body = put(g, G.ball, 0xe89a4a, 0, 0.06, 0, [0.12, 0.065, 0.09]);
  put(g, G.ball, 0xe89a4a, 0.09, 0.07, 0.04, 0.055); for (const s of [-1, 1]) put(g, G.cone, 0xe89a4a, 0.09 + s * 0.025, 0.12, 0.04, [0.018, 0.035, 0.012]);
  put(g, G.torus, 0xd8843a, -0.02, 0.03, 0.04, [0.09, 0.09, 0.06], [Math.PI / 2, 0, 0]);
  g.userData.update = (t) => { body.scale.y = 0.065 * (1 + Math.sin(t * 1.5) * 0.06); };
  return g;
}
export function dog() { // a small dog trotting
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b); const F = 0xc9a26a;
  put(b, G.cap, F, 0, 0.09, 0, [0.04, 0.07, 0.04], [Math.PI / 2, 0, 0]); put(b, G.ball, F, 0, 0.13, 0.08, 0.04); put(b, G.ball, 0x3a2a20, 0, 0.12, 0.12, 0.012);
  for (const s of [-1, 1]) put(b, G.ball, 0x8a6a4a, s * 0.03, 0.16, 0.07, [0.012, 0.03, 0.02]);
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => put(b, G.cyl8, F, sx * 0.025, 0.035, sz * 0.045, [0.01, 0.07, 0.01]));
  const tail = put(b, G.cyl8, F, 0, 0.13, -0.08, [0.008, 0.06, 0.008], [-0.6, 0, 0]);
  g.userData.update = (t) => { legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 12 + (i % 2) * Math.PI) * 0.5)); tail.rotation.z = Math.sin(t * 10) * 0.6; };
  return g;
}

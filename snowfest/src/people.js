// People in winter, and the animals (snowfest/DESIGN.md §1.7): fuji's chibi (2.5 heads, 0.58 tall) in a puffy down jacket,
// a knit hat with a bobble or earmuffs, a scarf, boots; children with a sled or a snowball; a stall cook in a headband and
// apron; a plough worker in a helmet and a reflective vest; someone on the stage with a microphone; a photographer; a
// couple hand in hand. And an Ezo squirrel, a crow, sparrows.
import * as THREE from 'three';
import { chibi } from '../../fuji/src/people.js';
import { G, C } from './kit.js';

const mats = new Map(), m = (c, rough = 0.85) => { const key = c + ':' + rough; if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: rough })); return mats.get(key); };
const put = (g, geo, col, x, y, z, s, r = [0, 0, 0], rough) => { const o = new THREE.Mesh(geo, m(col, rough)); o.position.set(x, y, z); Array.isArray(s) ? o.scale.set(...s) : o.scale.setScalar(s); o.rotation.set(...r); o.castShadow = true; g.add(o); return o; };

// a person bundled up: coat colour, hat ('beanie' | 'earmuffs' | 'hood' | null), scarf colour
export function winter({ coat = C.coats[0], legs = 0x3c4778, hat = 'beanie', hatCol = 0xfbfaf6, scarf = 0xf2c230, hair = 0x3a2a20, skin = 0xf6d3b8, kid = false } = {}) {
  const p = chibi({ top: coat, legs, hair, skin });
  put(p, G.ball, coat, 0, 0.2, 0, [0.13, 0.115, 0.115], [0, 0, 0], 0.95); // the puffy jacket over the body
  put(p, G.torus, coat, 0, 0.2, 0, [0.125, 0.125, 0.035], [Math.PI / 2, 0, 0], 0.95); // a quilted seam round it
  for (const a of p.userData.arms) put(a, G.ball, coat, 0, -0.05, 0, [0.042, 0.06, 0.042]);
  for (const h of p.userData.swing) put(h, G.ball, 0x5a4232, 0, -0.1, 0.01, [0.048, 0.04, 0.06]); // boots
  put(p, G.torus, scarf, 0, 0.29, 0, [0.085, 0.085, 0.1], [Math.PI / 2, 0, 0]); put(p, G.cyl8, scarf, 0.05, 0.24, 0.085, [0.025, 0.1, 0.012]);
  if (hat === 'beanie') { put(p, G.half, hatCol, 0, 0.47, -0.01, [0.168, 0.14, 0.16]); put(p, G.ball, hatCol === 0xfbfaf6 ? C.coats[1] : 0xfbfaf6, 0, 0.62, -0.01, 0.045); put(p, G.torus, hatCol, 0, 0.47, -0.01, [0.16, 0.15, 0.06], [Math.PI / 2, 0, 0]); }
  else if (hat === 'earmuffs') { for (const s of [-1, 1]) put(p, G.ball, hatCol, s * 0.155, 0.42, -0.01, [0.04, 0.055, 0.055]); put(p, G.torus, 0x9aa0aa, 0, 0.46, -0.01, [0.16, 0.16, 0.08], [0, 0, 0]).scale.set(0.16, 0.13, 0.05); }
  else if (hat === 'hood') { put(p, G.half, coat, 0, 0.45, -0.04, [0.18, 0.19, 0.16]); put(p, G.torus, 0xf4efe4, 0, 0.43, 0.02, [0.165, 0.16, 0.05], [0.15, 0, 0]); }
  if (kid) p.scale.setScalar(0.72);
  return p;
}
const walk = (p, t, on = true, ph = 0) => { const a = on ? Math.sin(t * 7 + ph) * 0.55 : 0; p.userData.swing[0].rotation.x = a; p.userData.swing[1].rotation.x = -a; p.userData.arms[0].rotation.x = -a * 0.7; p.userData.arms[1].rotation.x = a * 0.7; };
export { walk };

// the cast for the catalogue (each a Group, front +z, with userData.update)
export const ROLES = {
  tourists: () => C.coats.map((coat, i) => { const p = winter({ coat, hat: ['beanie', 'earmuffs', 'hood', 'beanie', 'earmuffs', 'beanie'][i], hatCol: [0xfbfaf6, 0xf08ac0, null, 0xd8383a, 0x3f6fd6, 0xf2c230][i], scarf: C.coats[(i + 2) % 6], hair: [0x3a2a20, 0x6b4a30, 0x2a2018, 0xd9b26a, 0x3a2a20, 0x6b4a30][i] }); p.userData.update = (t) => walk(p, t, true, i); return p; }),
  kids: () => {
    const sled = new THREE.Group(), a = winter({ coat: 0xf2c230, hat: 'beanie', hatCol: 0xe8483f, kid: true }); sled.add(a);
    const s = new THREE.Group(); put(s, G.cap, 0xe8483f, 0, 0.025, 0, [0.05, 0.1, 0.03], [0, 0, Math.PI / 2], 0.4); put(s, G.cyl8, 0xfbfaf6, 0.2, 0.1, 0, [0.006, 0.36, 0.006], [0, 0, 1.2]); s.position.set(-0.3, 0, 0); sled.add(s);
    sled.userData.update = (t) => walk(a, t, true); a.rotation.y = -Math.PI / 2;
    const b = winter({ coat: 0x4fb39a, hat: 'beanie', hatCol: 0xfbfaf6, kid: true }); const ball = put(b, G.ball, C.snow, 0.1, 0.3, 0.1, 0.05);
    b.userData.update = (t) => { const u = (t * 0.7) % 1; b.userData.arms[1].rotation.x = -2.6 * Math.sin(u * Math.PI); ball.visible = u < 0.5; };
    const c = winter({ coat: 0xf08ac0, hat: 'earmuffs', hatCol: 0xfbfaf6, kid: true }); put(c, G.ball, C.snow, 0, 0.06, 0.25, 0.09); c.userData.update = (t) => { c.userData.arms[0].rotation.x = c.userData.arms[1].rotation.x = -0.9 + Math.sin(t * 3) * 0.2; };
    return [sled, b, c];
  },
  cook: () => { const p = winter({ coat: 0xfbfaf6, hat: null, scarf: 0xfbfaf6, hair: 0x2a2018, skin: 0xe8b890 }); put(p, G.torus, C.noren, 0, 0.47, 0, [0.155, 0.155, 0.05], [Math.PI / 2, 0, 0]); put(p, G.cyl8, 0x2f55c4, 0, 0.15, 0.1, [0.1, 0.22, 0.02]); p.userData.update = (t) => { p.userData.arms[1].rotation.x = -1.1 + Math.sin(t * 5) * 0.4; }; return p; },
  worker: () => { const p = winter({ coat: 0x2f55c4, hat: null, scarf: 0x2f55c4 }); put(p, G.half, 0xf2c230, 0, 0.46, 0, [0.17, 0.14, 0.17], [0, 0, 0], 0.35); for (const y of [0.17, 0.25]) put(p, G.torus, 0xc8ff3a, 0, y, 0, [0.125, 0.125, 0.03], [Math.PI / 2, 0, 0], 0.4); const shovel = new THREE.Group(); put(shovel, G.cyl8, 0x8a5a3a, 0, 0.2, 0, [0.012, 0.42, 0.012]); put(shovel, G.cap, 0xe8483f, 0, -0.02, 0.04, [0.08, 0.04, 0.02], [0.3, 0, 0], 0.4); shovel.position.set(0.12, 0.08, 0.15); p.add(shovel); p.userData.update = (t) => { shovel.rotation.x = -0.4 + Math.sin(t * 2.5) * 0.4; p.userData.arms[0].rotation.x = p.userData.arms[1].rotation.x = -0.8 + Math.sin(t * 2.5) * 0.3; }; return p; },
  performer: () => { const p = winter({ coat: 0xe8483f, hat: 'beanie', hatCol: 0xfbfaf6, scarf: 0xfbfaf6 }); put(p.userData.arms[1], G.cyl8, 0x2a2f40, 0, -0.14, 0.03, [0.012, 0.07, 0.012]); put(p.userData.arms[1], G.ball, 0x5a6070, 0, -0.1, 0.06, 0.02); p.userData.update = (t) => { p.userData.arms[1].rotation.x = -1.9; p.userData.arms[0].rotation.z = -2.2 + Math.sin(t * 4) * 0.5; p.rotation.y = Math.sin(t * 0.8) * 0.4; }; return p; },
  photographer: () => { const p = winter({ coat: 0x7a5ad6, hat: 'earmuffs', hatCol: 0xfbfaf6, scarf: 0xf2c230 }); const cam = put(p, G.ball, 0x25304f, 0, 0.36, 0.17, [0.07, 0.045, 0.035]); p.userData.update = (t) => { const up = Math.sin(t * 0.5) > 0; for (const a of p.userData.arms) a.rotation.x = up ? -1.45 : -0.5; cam.position.set(0, up ? 0.4 : 0.22, up ? 0.17 : 0.13); }; return p; },
  couple: () => { const g = new THREE.Group(); const a = winter({ coat: 0x4fb39a, hat: 'beanie', hatCol: 0xf2c230, scarf: 0xe8483f }), b = winter({ coat: 0xf08ac0, hat: 'earmuffs', hatCol: 0xfbfaf6, scarf: 0xfbfaf6, hair: 0x6b4a30 }); a.position.x = -0.13; b.position.x = 0.13; g.add(a, b); a.userData.arms[0].rotation.z = 0.5; b.userData.arms[1].rotation.z = -0.5; g.userData.update = (t) => { walk(a, t, true); walk(b, t, true, Math.PI); a.userData.arms[0].rotation.x = b.userData.arms[1].rotation.x = 0; }; return g; },
};

// ---- animals ----
export function ezoSquirrel() { // grey-brown with tufted ears, a big tail; hops and stops
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const F = 0x8a7a6e;
  put(body, G.ball, F, 0, 0.09, 0, [0.06, 0.08, 0.055]); put(body, G.ball, F, 0, 0.18, 0.03, 0.05); put(body, G.ball, 0xf4efe4, 0, 0.1, 0.045, [0.035, 0.05, 0.02]);
  for (const s of [-1, 1]) { put(body, G.cone, F, s * 0.025, 0.24, 0.02, [0.012, 0.04, 0.01]); put(body, G.ball, C.ink, s * 0.02, 0.19, 0.075, 0.008); }
  put(body, G.cap, F, 0, 0.16, -0.08, [0.04, 0.09, 0.035], [0.3, 0, 0]);
  g.userData.update = (t) => { const u = (t * 0.6) % 1; body.position.y = u < 0.3 ? Math.sin((u / 0.3) * Math.PI) * 0.08 : 0; body.position.z = u < 0.3 ? (u / 0.3) * 0.15 - 0.075 : 0.075 - ((u - 0.3) / 0.7) * 0.15; };
  return g;
}
export function crow() { // a crow that hops and pecks
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b); const K = 0x2f3550;
  put(b, G.ball, K, 0, 0.1, 0, [0.06, 0.06, 0.11], [0, 0, 0], 0.45); put(b, G.ball, K, 0, 0.16, 0.09, 0.045, [0, 0, 0], 0.45); put(b, G.cone, 0x5a6070, 0, 0.155, 0.15, [0.014, 0.06, 0.014], [Math.PI / 2, 0, 0]); put(b, G.cone, K, 0, 0.11, -0.13, [0.035, 0.09, 0.012], [-Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) { put(b, G.ball, 0x3f4664, s * 0.055, 0.11, -0.01, [0.015, 0.045, 0.09], [0.1, 0, 0], 0.45); put(b, G.ball, 0xfbfaf6, s * 0.022, 0.175, 0.125, 0.008); put(b, G.cyl8, 0x5a6070, s * 0.02, 0.025, 0, [0.006, 0.05, 0.006]); }
  g.userData.update = (t) => { b.rotation.x = Math.max(0, Math.sin(t * 2)) ** 6 * 0.7; };
  return g;
}
export function sparrows(n = 4) { // round little sparrows puffed up against the cold
  const g = new THREE.Group(), bs = [];
  for (let i = 0; i < n; i++) { const b = new THREE.Group(); b.position.set((i - n / 2) * 0.12, 0, (i % 2) * 0.08); put(b, G.ball, 0x9a7a5a, 0, 0.04, 0, 0.04); put(b, G.ball, 0x6b4a34, 0, 0.065, 0.02, 0.025); put(b, G.ball, 0xf4efe4, 0, 0.03, 0.025, [0.03, 0.025, 0.02]); g.add(b); bs.push(b); }
  g.userData.update = (t) => bs.forEach((b, i) => { b.rotation.x = Math.max(0, Math.sin(t * 3 + i * 2)) ** 8 * 0.6; b.position.y = Math.max(0, Math.sin(t * 1.3 + i)) ** 20 * 0.05; });
  return g;
}

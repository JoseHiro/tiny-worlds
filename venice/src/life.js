// What moves in Venice (venice/DESIGN.md §1.8): gondolas going round the Grand Canal (one with a serenade), a water taxi
// throwing its wake, the water bus along the lagoon stopping at its pontoon, the ambulance boat now and then, a work boat
// up and down a side canal, the standing ferry crossing the Grand Canal; people strolling the waterfront and the square,
// the café's musicians and its waiter, a glassblower, a painter on the quay, children with a ball, masked figures, crowds
// on the great bridge; the pigeons that all take off together, gulls. All from the clock.
import * as THREE from 'three';
import { gondola, vaporetto, waterTaxi, workBoat, ambulance } from './boats.js';
import { summer, walk, ROLES, pigeons, gull } from './people.js';
import { wake } from './water.js';
import { LAND, bake } from './kit.js';
import { GC, GC_W, HALF, lagoonZ, CAMPI } from './town.js';

let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const tri = (u) => 1 - Math.abs(1 - 2 * (u % 1));

// a path through points: at(s) gives the position and heading at distance s along it (looping if closed)
function path(pts, closed = true) {
  const P = pts.map(([x, z]) => new THREE.Vector2(x, z)), cum = [0];
  for (let i = 1; i < P.length + (closed ? 1 : 0); i++) cum.push(cum[i - 1] + P[i % P.length].distanceTo(P[i - 1]));
  const L = cum.at(-1);
  return {
    L,
    at(s, out = {}) {
      s = closed ? ((s % L) + L) % L : Math.max(0, Math.min(L, s));
      let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
      const a = P[(i - 1) % P.length], b = P[i % P.length], u = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      out.x = a.x + (b.x - a.x) * u; out.z = a.y + (b.y - a.y) * u; out.yaw = Math.atan2(-(b.y - a.y), b.x - a.x); // (boats face +x)
      return out;
    },
  };
}
// a loop round the Grand Canal: down one side, a turn in the lagoon, back up the other, a turn at the east end
function canalLoop(off) {
  const side = (s) => GC.filter((_, i) => i % 4 === 0).map((p, i, a) => { const q = a[Math.min(a.length - 1, i + 1)], r = a[Math.max(0, i - 1)], tx = q.x - r.x, tz = q.y - r.y, l = Math.hypot(tx, tz) || 1; return [p.x - (tz / l) * off * s, p.y + (tx / l) * off * s]; });
  const down = side(1), up = side(-1).reverse();
  return path([...down, ...up]);
}

export function life(scene, loop, T) {
  const add = (o, x, z, ry = 0, y = LAND) => { o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o; };
  const fns = [];
  // ---- boats on loops
  const boats = [];
  const onPath = (b, p, speed, at, { hide = true, wakeK = 1 } = {}) => {
    const w = wake({ len: b.userData.len * 1.2, spread: b.userData.len * 0.25 }); w.position.x = -b.userData.len / 2; b.add(w); scene.add(b);
    const o = {}; const ln = { b, p, speed, at };
    boats.push(ln);
    fns.push((t) => { p.at(t * speed + at * p.L, o); b.position.set(o.x, 0, o.z); b.rotation.y = o.yaw; b.visible = !hide || (Math.abs(o.x) < HALF - 0.8 && Math.abs(o.z) < HALF - 0.8); b.userData.update?.(t); w.userData.update(t, wakeK); });
    return ln;
  };
  const inner = canalLoop(0.75), outer = canalLoop(1.15);
  onPath(gondola({ serenade: true }), inner, 0.32, 0.1, { wakeK: 0.5 });
  onPath(gondola({ passengers: 2 }), inner, 0.32, 0.135, { wakeK: 0.5 });
  onPath(gondola({ passengers: 1 }), inner, 0.32, 0.17, { wakeK: 0.5 });
  onPath(gondola({ passengers: 2 }), inner, 0.32, 0.55, { wakeK: 0.5 });
  onPath(waterTaxi(), outer, 1.5, 0.3, { wakeK: 1.2 });
  onPath(workBoat(), path([[-1.4, -4.2], [-1.4, 14.5]]), 0.35, 0.2, { wakeK: 0.6 });
  // the water bus: along the lagoon, stopping at the pontoon (x 4.4) for a while each way
  { const vb = vaporetto(), w = wake({ len: 4.6, spread: 1.0 }); w.position.x = -2; vb.add(w); scene.add(vb); const zl = lagoonZ(4.4) + 2.0;
    const T = 40; fns.push((t) => { const u = ((t + 37) % T) / T; let x, dir; // (at the pontoon from t = 19 to 23: the film's water-bus shot)
      if (u < 0.4) { x = -18 + (u / 0.4) * 22.4; dir = 1; } else if (u < 0.5) { x = 4.4; dir = 1; } else if (u < 0.9) { x = 4.4 + ((u - 0.5) / 0.4) * 14; dir = 1; } else { x = 40; dir = 1; }
      const slow = u < 0.4 ? Math.min(1, (0.4 - u) * 12) : u < 0.5 ? 0 : Math.min(1, (u - 0.5) * 12);
      vb.position.set(x, 0, zl); vb.rotation.y = dir > 0 ? 0 : Math.PI; vb.visible = Math.abs(x) < HALF + 1; vb.userData.update(t); w.userData.update(t, slow); }); }
  // the ambulance boat, now and then, fast along the outer lagoon
  { const a = ambulance(), w = wake({ len: 3, spread: 0.8 }); w.position.x = -1.3; a.add(w); scene.add(a); fns.push((t) => { const u = (t % 30) / 30; const x = -20 + u * 3 * 40; a.position.set(-x, 0, 14.0); a.rotation.y = Math.PI; a.visible = Math.abs(x) < HALF; a.userData.update(t); w.userData.update(t, 1.3); }); }
  // the ferry, across the Grand Canal and back
  { const f = gondola({ ferry: true }); scene.add(f); const [x0, z0, x1, z1] = [-11.2, 1.2, -7.6, 0.6]; fns.push((t) => { const u = (t / 16) % 1, k = Math.min(1, Math.max(0, (tri(u) - 0.1) / 0.8)), e = k * k * (3 - 2 * k); f.position.set(x0 + (x1 - x0) * e, 0, z0 + (z1 - z0) * e); f.rotation.y = Math.atan2(-(z1 - z0), x1 - x0) + (u > 0.5 ? Math.PI : 0); f.userData.update(t); }); }

  // ---- people
  const people = [];
  const lines = [ // strollers: back and forth along a line
    [-4.6, 10.4, 3.6, 10.4], [5.2, 10.6, 9.6, 10.6], [1.8, 3.0, 9.0, 3.0], [2.4, 8.4, 8.8, 6.0], [7.4, 4.4, 7.6, 9.4],
    [-14.2, 10.4, -8.2, 10.4], [-0.6, -3.6, -0.6, 9.2], [2.4, -10.2, 7.8, -10.6], [-14.0, -1.2, -11.6, -1.2], [-6.2, -12.2, -2.8, -12.4],
  ];
  const SH = [0x6fb0e0, 0xf08a7a, 0x8fd0b0, 0xf2c230, 0xe8a0c8, 0x3f6fd6, 0xfbfaf6, 0xb8d870];
  lines.forEach(([x0, z0, x1, z1], i) => {
    const p = summer({ top: SH[i % 8], hat: ['sun', null, 'cap', 'panama', null][i % 5], hatCol: [0xe8d39a, 0xfbfaf6, 0xe8673c, 0xf4efe4][i % 4], long: i % 3 === 1, dress: i % 4 === 1, hair: [0x3a2a20, 0x6b4a30, 0xd9b26a, 0x2a2018][i % 4], extra: ['camera', null, 'map', 'bag', 'pack'][i % 5] });
    scene.add(p); const len = Math.hypot(x1 - x0, z1 - z0), per = (len / 0.45) * 2, ph = rnd();
    people.push((t) => { const u = (t / per + ph) % 1, k = tri(u), back = u > 0.5; p.position.set(x0 + (x1 - x0) * k, LAND, z0 + (z1 - z0) * k); p.rotation.y = Math.atan2(x1 - x0, z1 - z0) + (back ? Math.PI : 0); walk(p, t, true, i); });
  });
  // the café's music and its waiter, on the square
  const [waiter, violin, pianist] = ROLES.cafe();
  add(violin, 3.6, 3.0, Math.PI / 2); add(pianist, 3.25, 3.6, Math.PI / 2 + 0.3);
  add(waiter, 4.8, 3.4, 0); people.push((t) => { violin.userData.update(t); pianist.userData.update(t); const u = (t / 9) % 1, k = tri(u); waiter.position.set(4.0 + k * 2.2, LAND, 2.6 + k * 4.0); waiter.rotation.y = Math.atan2(2.2, 4.0) + (u > 0.5 ? Math.PI : 0); waiter.userData.update(t); });
  const [seller, glass, painter] = ROLES.workers();
  add(seller, CAMPI.market[0] + 1.2, CAMPI.market[1] + 0.6, 0.2); add(glass, CAMPI.well[0] + 1.4, CAMPI.well[1] + 1.6, 0.6 + Math.PI); add(painter, 0.2, 10.5, Math.PI - 0.3);
  people.push((t) => { seller.userData.update(t); glass.userData.update(t); painter.userData.update(t); });
  const [kid, nonna, dogman] = ROLES.locals();
  add(kid, -12.8, -2.0, 0.5); people.push((t) => { const u = (t / 5) % 1, k = tri(u); kid.position.set(-13.6 + k * 1.8, LAND, -2.4 + k * 0.6); kid.rotation.y = u > 0.5 ? -1.2 : 1.9; kid.userData.update(t); });
  scene.add(nonna, dogman); people.push((t) => { const u = (t / 30) % 1, k = tri(u); nonna.position.set(-5.8 + k * 3.0, LAND, -11.6); nonna.rotation.y = u > 0.5 ? -Math.PI / 2 : Math.PI / 2; nonna.userData.update(t); const v = (t / 24 + 0.3) % 1, j = tri(v); dogman.position.set(6.2 + j * 6.0, LAND, 10.5); dogman.rotation.y = v > 0.5 ? -Math.PI / 2 : Math.PI / 2; dogman.userData.update(t); });
  ROLES.masks().forEach((m, i) => { add(m, 6.6 + i * 0.6, 7.6 + (i % 2) * 0.4, Math.PI * 0.8); people.push((t) => m.userData.update(t)); });
  const couple = add(ROLES.couple(), 8.8, 9.4, Math.PI); people.push(() => {});
  // crowds that only stand about: on the great bridge, in the square, along the waterfront (baked into a few meshes)
  { const g = new THREE.Group();
    const spot = (x, z, ry) => { const p = summer({ top: SH[Math.floor(rnd() * 8)], hat: ['sun', null, 'cap', null, 'panama'][Math.floor(rnd() * 5)], hatCol: [0xe8d39a, 0xfbfaf6, 0xe8673c][Math.floor(rnd() * 3)], long: rnd() < 0.4, dress: rnd() < 0.25, hair: [0x3a2a20, 0x6b4a30, 0xd9b26a, 0x2a2018][Math.floor(rnd() * 4)], extra: rnd() < 0.3 ? 'camera' : null }); p.position.set(x, LAND, z); p.rotation.y = ry; if (rnd() < 0.35) p.userData.arms[1].rotation.x = -1.4; g.add(p); };
    for (let i = 0; i < 14; i++) spot(2 + rnd() * 8, 2.4 + rnd() * 6.4, rnd() * 6.28); // the square
    for (let i = 0; i < 8; i++) spot(-4 + rnd() * 16, 10.0 + rnd() * 0.6, Math.PI + (rnd() - 0.5)); // the waterfront, looking out
    for (let i = 0; i < 4; i++) spot(CAMPI.market[0] + 0.8 + i * 1.1, CAMPI.market[1] + 2.6, Math.PI + 0.3); // shoppers
    scene.add(bake(g)); }
  // on the great bridge: people at the parapet, looking along the canal (placed on the bridge's own hump)
  const bb = T.big;
  if (bb) { const g = new THREE.Group(); g.position.set(bb.x, 0, bb.z); g.rotation.y = bb.ry; for (let i = 0; i < 8; i++) { const u = (i % 4 - 1.5) * 0.8, s = i < 4 ? 1 : -1; const p = summer({ top: SH[i % 8], hat: i % 2 ? 'sun' : null, extra: i % 3 ? 'camera' : null }); p.position.set(u, LAND - 0.12 + bb.top(u), s * 1.03); p.rotation.y = s > 0 ? 0 : Math.PI; if (i % 3) p.userData.arms[1].rotation.x = -1.5; g.add(p); } scene.add(bake(g)); }
  // ---- birds: the pigeons on the square (and a flock by the market), gulls over the lagoon
  const flock = add(pigeons(32, { r: 2.2, every: 11 }), 6.4, 5.4, 0); const flock2 = add(pigeons(10, { r: 1.0, every: 8 }), CAMPI.market[0] + 2.4, CAMPI.market[1] + 2.0, 0);
  const gulls = [[2, 13], [9, 12.5], [-9, 12.6]].map(([x, z]) => add(gull(), x, z, 0, 0.4));
  fns.push((t) => { flock.userData.update(t); flock2.userData.update(t + 3); gulls.forEach((g, i) => g.userData.update(t * (0.8 + i * 0.15) + i * 4)); });

  // (t0: the film sets it so its own clock starts at 0 and the boats are where its shots expect them)
  loop.push((t) => { ret.t = t; const tt = t - ret.t0; for (const f of fns) f(tt); for (const f of people) f(tt); });
  const ret = { boats, flock, t: 0, t0: 0 };
  return ret;
}

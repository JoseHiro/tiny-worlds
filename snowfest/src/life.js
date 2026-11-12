// What moves in the town (snowfest/DESIGN.md §5): the tram and the sasara tram along the north road, a plough truck and a
// taxi on the south road, a bus and a car on the cross streets, the rotary blower at work up north; visitors strolling the
// park and the pavements, queues at the stalls, cooks at their pots, a singer on the stage, a photographer, children by the
// slide, a worker shovelling; a squirrel, a crow, sparrows. All from the clock.
import * as THREE from 'three';
import { tram, sasara, plough, rotary, car, bus } from './ride.js';
import { winter, walk, ROLES, ezoSquirrel, crow, sparrows } from './people.js';
import { C } from './kit.js';
import { HALF, R1 } from './town.js';

let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const tri = (u) => 1 - Math.abs(1 - 2 * (u % 1)); // 0 → 1 → 0

export function life(scene, loop) {
  const add = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; scene.add(o); return o; };
  // ---- traffic: each runs along a line, wrapping off the board's edge (hidden while it's off)
  const L = HALF * 2 + 6;
  const lanes = [
    { v: tram(), z: -R1, dir: 1, speed: 1.1, at: 0.57 }, { v: sasara(), z: -R1, dir: 1, speed: 1.1, at: 0.45 },
    { v: plough(), z: R1 + 0.45, dir: 1, speed: 0.8, at: 0.71 }, { v: car({ taxi: true }), z: R1 - 0.45, dir: -1, speed: 1.6, at: 0.6 },
    { v: bus(), x: -R1 + 0.45, dir: 1, speed: 1.2, at: 0.3 }, { v: car({ color: 0xe8483f }), x: R1 - 0.45, dir: -1, speed: 1.5, at: 0.1 },
  ];
  for (const l of lanes) scene.add(l.v);
  add(car({ color: 0x4fb39a, buried: true }), -R1 - 0.45, -12.5, Math.PI / 2); // a car left parked overnight
  const blower = add(rotary(), R1 + 0.45, -11, -Math.PI / 2); // (working its way up the cross street)

  // ---- people
  const people = [];
  // strollers: back and forth along a line, turning at the ends
  const lines = [[-14, -1.75, -7.4, -1.75], [6.6, -0.6, 11.0, -0.6], [-14, 7.1, -6.4, 7.1], [-3.4, 7.1, 3.6, 7.1], [6.4, 7.1, 14, 7.1], [-14, -7.4, -6.4, -7.4], [6.4, -7.4, 14, -7.4], [-13.5, 12.6, -6.6, 12.6], [6.6, 12.9, 14, 12.9]];
  lines.forEach(([x0, z0, x1, z1], i) => {
    const p = winter({ coat: C.coats[i % 6], hat: ['beanie', 'earmuffs', 'hood'][i % 3], hatCol: [0xfbfaf6, 0xf08ac0, 0xe8483f, 0x3f6fd6, 0xf2c230][i % 5], scarf: C.coats[(i + 3) % 6], hair: [0x3a2a20, 0x6b4a30, 0x2a2018, 0xd9b26a][i % 4] });
    scene.add(p); const len = Math.hypot(x1 - x0, z1 - z0), per = (len / 0.5) * 2, ph = rnd();
    people.push((t) => { const u = (t / per + ph) % 1, k = tri(u), back = u > 0.5; p.position.set(x0 + (x1 - x0) * k, 0, z0 + (z1 - z0) * k); p.rotation.y = Math.atan2(x1 - x0, z1 - z0) + (back ? Math.PI : 0); walk(p, t, true, i); });
  });
  // queues at the stalls, and cooks behind three of the counters
  for (const [x, z, ry] of [[-13, -1.6, Math.PI], [-12.6, -1.1, Math.PI], [-10.5, -1.7, Math.PI], [9.5, 1.7, 0], [11.7, 1.6, 0]]) { const p = add(winter({ coat: C.coats[Math.floor(rnd() * 6)], hat: 'beanie', hatCol: 0xfbfaf6 }), x, z, ry); people.push((t) => { p.rotation.y = ry + Math.sin(t * 0.4 + x) * 0.3; }); }
  for (const [x, z, ry] of [[-13, -3.4, 0], [-8, -3.4, 0], [9.5, 3.5, Math.PI]]) { const c = add(ROLES.cook(), x, z, ry); people.push((t) => c.userData.update(t + x)); }
  // the stage: a singer; in front of the castle, a photographer and a couple
  const singer = add(ROLES.performer(), 0, 2.85, 0); singer.position.y = 0.6; people.push((t) => singer.userData.update(t));
  const photo = add(ROLES.photographer(), 3.7, 3.0, Math.PI + 0.4); people.push((t) => photo.userData.update(t));
  const couple = add(ROLES.couple(), -3.8, 2.9, Math.PI - 0.3); couple.userData.update(0); people.push(() => {});
  // children by the slide; a worker shovelling by the south road
  const [sled, thrower, hugger] = ROLES.kids(); add(sled, -12.2, 3.6, -0.4); add(thrower, -7.0, 2.2, -2.2); add(hugger, -12.0, -1.6, 0.6);
  people.push((t) => { sled.userData.update(t); thrower.userData.update(t); hugger.userData.update(t); });
  const worker = add(ROLES.worker(), 4.2, 6.6, -2.4); people.push((t) => worker.userData.update(t));
  // animals: a squirrel under the firs, a crow on the pavement, sparrows by the bench
  const sq = add(ezoSquirrel(), -14.0, -8.4, 0.5); const cr = add(crow(), 12.2, 6.9, -1.2); const sp = add(sparrows(4), 9.2, 12.0, 0.3);
  people.push((t) => { sq.userData.update(t); cr.userData.update(t); sp.userData.update(t); });

  loop.push((t) => {
    for (const l of lanes) {
      const s = ((t * l.speed / L + l.at) % 1) * L - L / 2, along = s * l.dir, v = l.v;
      if (l.z !== undefined) { v.position.set(along, 0, l.z); v.rotation.y = l.dir > 0 ? 0 : Math.PI; }
      else { v.position.set(l.x, 0, along); v.rotation.y = l.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
      v.visible = Math.abs(along) < HALF - 1.6;
      v.userData.update?.(t);
    }
    blower.position.z = -11 + Math.sin(t * 0.08) * 3; blower.userData.update(t);
    for (const f of people) f(t);
  });
  const ret = { lanes, singer, t: 0 }; loop.push((t) => (ret.t = t)); // (the film reads the clock to line the traffic up)
  return ret;
}

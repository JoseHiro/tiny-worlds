// Naha's sea life, placed by zone (DESIGN.md §3, sealife/DESIGN.md §3):
//  lagoon  — sand flats behind the reef (shallow, ~0.6–1.2 deep): rays, garden eels, a blacktip, the turtle
//  reef    — the reef flat (~1.3–1.6 deep, coral heads): homes, pairs, small schools, things on the bottom
//  outside — beyond the drop-off (~9 deep): manta, eagle rays, the trevally tornado, a bait ball
//  events  — a dolphin pod and, rarely, the whale shark pass through the block (in and out through the cut faces)
import * as THREE from 'three';
import { makeCreature, School, Cruise, Wander, Burrows, clock, seeded } from '../../sealife/src/kit.js';
import { SPECIES } from '../../sealife/src/species.js';
import { BLOCK, bedHeight } from './terrain.js';
import { causticsInject, shared } from './water.js';

clock.uTime = shared.uTime; // one clock for the water and the swimming

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TOP = -0.22; // nothing swims higher than this (the dolphins leap on purpose)
const mid = (x, z, f = 0.5) => THREE.MathUtils.lerp(bedHeight(x, z), TOP, f);
const floor = (lift = 0) => (x, z) => bedHeight(x, z) + lift;
// the seabed zone at (x, z), from its depth
const zoneAt = (x, z) => { const h = bedHeight(x, z); return h > 0 ? 'beach' : h > -1.15 ? 'lagoon' : h > -2.2 ? 'reef' : 'outside'; };

// keep everything inside the block: what pokes out past a cut face is clipped away
export const CLIP = [V(1, 0, 0), V(-1, 0, 0), V(0, 0, 1), V(0, 0, -1)].map((n) => new THREE.Plane(n, n.x ? BLOCK.w / 2 : BLOCK.d / 2));

export function populate(parent, { swimmer, coralSpots = [] } = {}) {
  const group = new THREE.Group();
  parent.add(group);
  const updates = [];
  const rnd = seeded(2024);
  const tap = { position: V(1e4, 0, 1e4), t: 0 }; // a click on the water startles what is near
  const counts = { lagoon: 0, reef: 0, outside: 0, surface: 0, events: 0 };

  const make = (key, opts = {}, zone = null) => {
    const m = makeCreature(SPECIES[key](), { extras: [causticsInject], ...opts });
    m.material.clippingPlanes = CLIP;
    group.add(m);
    if (zone) counts[zone] += opts.count ?? 1;
    return m;
  };
  const wander = (key, zone, opts) => {
    const spec = SPECIES[key]();
    const m = makeCreature(spec, { extras: [causticsInject] });
    m.material.clippingPlanes = CLIP;
    group.add(m);
    counts[zone]++;
    const w = new Wander(m, { sideways: !!spec.sideways, ...opts });
    m.userData.wander = w; // (a story can steer it: home, radius, speed)
    updates.push((t, dt) => w.update(dt));
    return m;
  };
  const cruise = (key, zone, opts) => { const m = make(key, {}, zone); const c = new Cruise(m, opts); updates.push((t, dt) => c.update(dt)); return m; };
  const school = (key, zone, n, opts) => { const m = make(key, { count: n }, zone); const s = new School(m, opts); updates.push((t, dt) => s.update(dt)); return s; };
  const put = (key, zone, x, z, ry = 0, lift = 0) => { const m = make(key, {}, zone); m.position.set(x, bedHeight(x, z) + lift, z); m.rotation.y = ry; return m; };
  // random points in a zone (rejection sampling on the depth)
  const spotIn = (zone, [xa, xb] = [-42, 42], [za, zb] = [-29, 18]) => {
    for (let i = 0; i < 400; i++) {
      const x = THREE.MathUtils.lerp(xa, xb, rnd()), z = THREE.MathUtils.lerp(za, zb, rnd());
      if (zoneAt(x, z) === zone) return [x, z];
    }
    return [xa, za];
  };
  // the wet sand line at x (where the seabed crosses `h`)
  const shoreZ = (x, h = 0.04) => { for (let z = 20; z > 0; z -= 0.1) if (bedHeight(x, z) < h) return z; return 14; };

  // ---------- lagoon ----------
  const sharks = [
    cruise('blacktipShark', 'lagoon', { center: V(-8, 0, 3.2), rx: 24, rz: 2.4, y: -0.47, speed: 1.4, bob: 0.03 }),
    cruise('blacktipShark', 'lagoon', { center: V(18, 0, 2.6), rx: 14, rz: 2.0, y: -0.5, speed: 1.2, phase: 2, bob: 0.03 }),
  ];
  const rays = [
    wander('stingrayRed', 'lagoon', { home: V(-22, 0, 2), radius: 5, speed: 0.3, pause: [5, 12], ground: floor(0.06) }),
    wander('stingrayBlue', 'lagoon', { home: V(-31, 0, 0.5), radius: 3.2, speed: 0.35, pause: [3, 8], ground: floor(0.05) }),
    wander('stingrayBlue', 'lagoon', { home: V(9, 0, 1), radius: 4, speed: 0.3, pause: [4, 9], ground: floor(0.05) }),
  ];
  const startle = [...sharks, ...rays, swimmer, tap].filter(Boolean);
  // a garden eel colony on the open sand: they duck when the rays, a shark, the swimmer or a click come near
  const eelSpots = [];
  for (let i = 0; i < 56; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 3.2; const x = -31 + Math.cos(a) * r, z = 1 + Math.sin(a) * r * 0.7; eelSpots.push(V(x, bedHeight(x, z), z)); }
  const eels = make('gardenEel', { count: eelSpots.length }, 'lagoon');
  const burrows = new Burrows(eels, { spots: eelSpots, depth: 0.56, threats: startle, reach: 1.4 });
  updates.push((t, dt) => burrows.update(dt));
  // the turtle Hana meets, grazing near the swimmer
  const turtle = wander('greenTurtle', 'lagoon', { home: V(-6, mid(-6, 5, 0.45), 5), radius: 6, y: [-0.05, 0.05], speed: 0.35, pause: [2, 6] });
  for (let i = 0; i < 2; i++) { const [x, z] = spotIn('lagoon', [-20, 30], [-4, 8]); wander('boxfish', 'lagoon', { home: V(x, mid(x, z), z), radius: 2, y: [-0.1, 0.1], speed: 0.2, pause: [1, 3] }); }
  for (let i = 0; i < 5; i++) { const [x, z] = spotIn('lagoon', [-10, 40], [-3, 9]); wander('spottedJelly', 'lagoon', { home: V(x, mid(x, z, 0.65), z), radius: 2, y: [-0.05, 0.05], speed: 0.05, pause: [0, 1] }); }
  for (let i = 0; i < 9; i++) { const [x, z] = spotIn('lagoon'); put('seaStar', 'lagoon', x, z, rnd() * 6); }
  for (let i = 0; i < 8; i++) { const [x, z] = spotIn('lagoon'); put('seaCucumber', 'lagoon', x, z, rnd() * 6); }
  // the water's edge: hermit crabs and crabs on the wet sand
  for (let i = 0; i < 6; i++) { const x = -38 + i * 14 + rnd() * 4, z = shoreZ(x); wander('hermitCrab', 'lagoon', { home: V(x, 0, z), radius: 1.2, speed: 0.08, pause: [1, 4], ground: floor() }); }
  for (let i = 0; i < 3; i++) { const x = -26 + i * 22, z = shoreZ(x, 0.15); wander('crab', 'lagoon', { home: V(x, 0, z), radius: 1.0, speed: 0.12, pause: [1, 3], ground: floor() }); }

  // ---------- reef ----------
  const reefThreats = [...sharks, swimmer, tap].filter(Boolean);
  // clownfish families at home in their anemones
  for (const [x, z] of [[-18, -10], [21, -11.5], [-36, -12]]) {
    put('anemone', 'reef', x, z, rnd() * 6);
    const n = 2 + Math.round(rnd());
    for (let i = 0; i < n; i++) wander('clownfish', 'reef', { home: V(x, bedHeight(x, z) + 0.3, z), radius: 0.22, y: [-0.04, 0.1], speed: 0.22, pause: [0.2, 1.2] });
  }
  school('blueTang', 'reef', 26, { center: V(-6, mid(-6, -11), -11), size: V(7, 0.5, 4), speed: 0.9, radius: 0.8 }).threats.push(...reefThreats);
  school('blueTang', 'reef', 18, { center: V(31, mid(31, -12), -12), size: V(5, 0.5, 3.5), speed: 0.9, radius: 0.8 }).threats.push(...reefThreats);
  // chromis clouds over the coral heads (they duck when a shark or a click comes)
  const heads = coralSpots.length ? coralSpots : Array.from({ length: 6 }, () => spotIn('reef'));
  for (let i = 0; i < 4; i++) {
    const [x, z] = heads[Math.floor(rnd() * heads.length)];
    school(i === 3 ? 'damselBlue' : 'damselGreen', 'reef', i === 3 ? 10 : 22, { center: V(x, bedHeight(x, z) + 0.75, z), size: V(1.4, 0.35, 1.4), speed: 0.35, radius: 0.35 }).threats.push(tap, ...sharks);
  }
  const reefFish = [['butterflyfish', 2, 0.9, 0.4], ['butterflyfish', 2, 0.9, 0.4], ['butterflyfish', 2, 0.9, 0.4], ['moorishIdol', 2, 1.4, 0.35], ['moorishIdol', 3, 1.4, 0.35], ['parrotfish', 1, 4, 0.5], ['parrotfish', 1, 4, 0.5], ['parrotfish', 1, 4, 0.5]];
  for (const [key, n, radius, speed] of reefFish) {
    const [x, z] = spotIn('reef');
    for (let i = 0; i < n; i++) wander(key, 'reef', { home: V(x, mid(x, z, 0.4), z), radius, y: [-0.12, 0.12], speed, pause: [0.5, 2.5] });
  }
  for (let i = 0; i < 2; i++) {
    const [x, z] = spotIn('reef');
    const p = wander('porcupinefish', 'reef', {
      home: V(x, mid(x, z, 0.45), z), radius: 2, y: [-0.1, 0.1], speed: 0.3, pause: [1, 3], threats: reefThreats, flee: 2.2,
      onAlarm: (on, dt) => p.scale.setScalar(THREE.MathUtils.lerp(p.scale.x, on ? 1.7 : 1, Math.min(1, dt * (on ? 6 : 1)))),
    });
  }
  { // a grouper by a coral head, and a moray peeking out of the reef nearby
    const [x, z] = [-11, -14];
    wander('grouper', 'reef', { home: V(x + 1.5, bedHeight(x + 1.5, z) + 0.35, z), radius: 1, y: [0, 0.05], speed: 0.2, pause: [3, 8] });
    const moray = make('moray', {}, 'reef');
    const base = V(x, bedHeight(x, z) - 0.2, z), out = V(0.5, 0.85, 0.2).normalize();
    moray.rotation.set(0, Math.atan2(-out.z, out.x), Math.asin(out.y) * 0.9, 'YZX');
    let k = 1;
    updates.push((t, dt) => {
      const scared = reefThreats.some((o) => o.position.distanceTo(base) < 2.5);
      k += ((scared ? 0 : 0.75 + 0.25 * Math.sin(t * 0.4)) - k) * Math.min(1, dt * (scared ? 5 : 0.8));
      moray.position.copy(base).addScaledVector(out, -0.55 + k * 0.4);
    });
  }
  { // a whitetip resting on the bottom (in the day it sleeps under the coral)
    const [x, z] = [3, -13.5];
    wander('whitetipShark', 'reef', { home: V(x, 0, z), radius: 1.2, speed: 0.12, pause: [8, 20], ground: floor(0.12) });
  }
  cruise('hawksbill', 'reef', { center: V(-12, 0, -11), rx: 16, rz: 2.4, y: -0.62, speed: 0.6, bob: 0.06, phase: 1 });
  for (let i = 0; i < 3; i++) wander('squid', 'reef', { home: V(12 + i * 0.6, mid(12, -9, 0.55), -9), radius: 0.3, y: [-0.03, 0.03], speed: 0.15, pause: [0.5, 2] });
  for (let i = 0; i < 5; i++) { const [x, z] = spotIn('reef'); put('giantClam', 'reef', x, z, rnd() * 6, -0.04); }
  for (let i = 0; i < 12; i++) { const [x, z] = spotIn('reef'); put('urchin', 'reef', x, z, rnd() * 6); }
  for (let i = 0; i < 4; i++) { const [x, z] = spotIn('reef'); wander('nudibranch', 'reef', { home: V(x, 0, z), radius: 0.6, speed: 0.04, pause: [1, 5], ground: floor() }); }
  { const [x, z] = spotIn('reef', [-40, -20]); wander('octopus', 'reef', { home: V(x, 0, z), radius: 1.5, speed: 0.15, pause: [2, 7], ground: floor() }); }

  // ---------- outside the drop-off ----------
  const OZ = -26.6; // the middle of the deep strip
  cruise('manta', 'outside', { center: V(0, 0, OZ), rx: 30, rz: 1.9, y: -3.2, speed: 1.9, eight: true, bob: 0.4 });
  for (let i = 0; i < 3; i++) cruise('eagleRay', 'outside', { center: V(0, 0, OZ), rx: 28, rz: 1.5, y: -2.0, speed: 1.5, phase: 2 + i * 0.05, bob: 0.2, offset: [0, i * 0.35, i * 0.6 - 0.6] });
  school('trevally', 'outside', 90, { center: V(-15, -4.6, OZ), size: V(4, 6, 3.4), speed: 1.5, radius: 0.75, swirl: 1.4, ring: 1.25 });
  const tuna = [0, 1, 2].map((i) => cruise('tuna', 'outside', { center: V(16, 0, OZ), rx: 2.6, rz: 1.5, y: -4.2, speed: 3.0, phase: i * 0.6, bob: 0.3, offset: [0, i * 0.5 - 0.5, 0] }));
  school('sardine', 'outside', 170, { center: V(16, -4.2, OZ), size: V(3, 3, 2.6), speed: 1.2, radius: 0.3, ball: 1.4 }).threats.push(...tuna);
  for (let i = 0; i < 6; i++) wander('moonJelly', 'outside', { home: V(-12 + i * 5, -1.3 - (i % 3) * 0.7, OZ), radius: 1.2, y: [-0.3, 0.3], speed: 0.05, pause: [0, 1] });
  // gulls over the water's edge
  for (let i = 0; i < 4; i++) cruise('gull', 'surface', { center: V(-6 + i * 4, 0, 6), rx: 14 + i * 3, rz: 5 + i, y: 6 + i * 0.6, speed: 3, phase: i * 1.7, bob: 0.4 });

  // ---------- events: things that pass through ----------
  const events = [];
  // a pod moving along the deep strip from one cut face to the other; `leap` makes them jump
  function passer(keys, { y, speed, leap = 0, every, first, label, spacing = 2.2 }) {
    const pod = new THREE.Group();
    group.add(pod);
    const members = keys.map((key, i) => {
      const m = make(key);
      m.position.set(-i * spacing, (i % 2) * -0.4, (i % 3 - 1) * 0.9);
      m.userData.base = m.position.clone();
      pod.add(m);
      return m;
    });
    const e = { label, wait: first, run: -1, dir: 1, pod };
    pod.visible = false;
    const len = BLOCK.w + 30 + keys.length * spacing;
    updates.push((t, dt) => {
      if (e.run < 0) {
        e.wait -= dt;
        if (e.wait <= 0) { e.run = 0; e.dir = rnd() < 0.5 ? 1 : -1; pod.visible = true; }
        return;
      }
      e.run += dt * speed;
      const x = -e.dir * (BLOCK.w / 2 + 12) + e.dir * e.run;
      pod.position.set(x, y, OZ + Math.sin(e.run * 0.05) * 0.6);
      pod.rotation.y = e.dir > 0 ? 0 : Math.PI;
      members.forEach((m, i) => {
        if (!leap) return;
        const ph = e.run * 0.45 - i * 0.7;
        const s = Math.max(0, Math.sin(ph)), up = leap * s ** 3;
        m.position.y = m.userData.base.y + up;
        m.rotation.z = Math.sin(ph) > 0 ? Math.cos(ph) * 0.9 * Math.min(1, s * 3) : 0; // nose up, then down
      });
      if (e.run > len) { e.run = -1; e.wait = every[0] + rnd() * (every[1] - every[0]); pod.visible = false; }
    });
    events.push(e);
    counts.events += keys.length;
    return e;
  }
  const dolphins = passer(['dolphin', 'dolphin', 'dolphin', 'dolphin', 'dolphin'], { y: -0.9, speed: 4.5, leap: 1.6, every: [45, 75], first: 6, label: 'イルカの群れが外洋を通ります' });
  const whale = passer(['whaleShark'], { y: -4.6, speed: 1.4, every: [120, 200], first: 25, label: 'ジンベエザメが外洋をゆっくり横切ります' });
  for (const [x, z] of [[1.6, 0.45], [0.8, -0.5]]) { const r = make('remora'); r.position.set(x, -0.62, z); whale.pod.children[0].add(r); }
  counts.events += 2;

  return {
    group, counts, events, turtle,
    startle(p) { tap.position.set(p.x, Math.max(p.y, bedHeight(p.x, p.z) + 0.3), p.z); tap.t = 2.5; },
    // what is passing now (for the panel)
    happening: () => events.filter((e) => e.run >= 0 && e.run > 8 && e.run < BLOCK.w + 10).map((e) => e.label),
    update(t, dt) {
      if (tap.t > 0 && (tap.t -= dt) <= 0) tap.position.set(1e4, 0, 1e4);
      for (const f of updates) f(t, dt);
    },
  };
}

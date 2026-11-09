// The road's traffic (fuji/DESIGN.md §4): round little vehicles keeping to the left in both directions, out of one tunnel
// and into the other. All from the clock, so they never catch each other up. A vehicle's nose is +x; one mesh for its
// body and one for its lamps, so the lamps glow at dusk.
import * as THREE from 'three';
import { Kit, toy, lit } from './kit.js';

const GLASS = 0x3f4d6e, TYRE = 0x2d3346, HUB = 0xe8e6e0;
const wheels = (c, xs, b = 0.31) => { for (const a of xs) for (const s of [-b, b]) { c.add(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 14).rotateX(Math.PI / 2), TYRE, a, 0.13, s); c.add(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10).rotateX(Math.PI / 2), HUB, a, 0.13, s); } };
const SHAPES = {
  kei(c, col) { // tall, short, round
    c.box(1.04, 0.3, 0.62, col, 0, 0.27, 0, { r: 0.12 });
    c.box(0.72, 0.3, 0.58, col, -0.1, 0.52, 0, { r: 0.12 });
    c.box(0.3, 0.2, 0.595, GLASS, 0.1, 0.54, 0, { r: 0.05 }); c.box(0.3, 0.2, 0.595, GLASS, -0.27, 0.54, 0, { r: 0.05 });
    c.box(0.03, 0.2, 0.46, GLASS, 0.255, 0.54, 0, { r: 0.012 });
    c.box(0.76, 0.05, 0.6, 0xfdfbf4, -0.1, 0.68, 0, { r: 0.02 });
    wheels(c, [-0.32, 0.32]);
    return [0.52, -0.52, 0.3];
  },
  taxi(c, col) { // a little saloon, with the lamp on its roof
    c.box(1.2, 0.26, 0.62, col, 0, 0.25, 0, { r: 0.1 });
    c.box(0.62, 0.24, 0.56, col, -0.05, 0.46, 0, { r: 0.09 });
    c.box(0.54, 0.16, 0.575, GLASS, -0.05, 0.47, 0, { r: 0.04 });
    c.box(0.18, 0.08, 0.1, 0xfff5d5, -0.05, 0.62, 0, { r: 0.02 });
    wheels(c, [-0.37, 0.37]);
    return [0.6, -0.6, 0.26];
  },
  van(c, col) { // a tall delivery van, a stripe of the shop's blue down its side
    c.box(1.28, 0.62, 0.64, col, 0, 0.47, 0, { r: 0.1 });
    c.box(1.3, 0.09, 0.65, 0x2f55c4, 0, 0.38, 0, { r: 0.02 });
    c.box(0.26, 0.22, 0.655, GLASS, 0.42, 0.62, 0, { r: 0.04 });
    c.box(0.03, 0.22, 0.5, GLASS, 0.635, 0.62, 0, { r: 0.012 });
    wheels(c, [-0.4, 0.4], 0.32);
    return [0.64, -0.64, 0.28];
  },
  truck(c, col) { // a small farm truck, with a load under a sheet
    c.box(0.46, 0.5, 0.62, col, 0.42, 0.41, 0, { r: 0.1 });
    c.box(0.2, 0.2, 0.63, GLASS, 0.48, 0.52, 0, { r: 0.04 });
    c.box(0.8, 0.09, 0.62, 0xc9c6c4, -0.24, 0.27, 0, { r: 0.02 });
    c.box(0.72, 0.28, 0.54, 0x8fb39a, -0.24, 0.44, 0, { r: 0.1 });
    wheels(c, [-0.38, 0.42]);
    return [0.65, -0.64, 0.26];
  },
};

// one vehicle, as a group. `lamps`: lit, for driving at dusk; off, for a parked one
export function vehicle(kind, col, lamps = true) {
  const G = new THREE.Group(), c = new Kit(), g = new Kit(), [nose, tail, y] = SHAPES[kind](c, col);
  for (const b of [-0.2, 0.2]) {
    (lamps ? g : c).ball(0.05, 0xfff0c0, nose, y, b, lamps ? { glow: 1.7 } : {});
    (lamps ? g : c).ball(0.035, 0xe8483f, tail, y, b, lamps ? { glow: 1.3 } : {});
  }
  const m = c.bake(toy()); m.castShadow = m.receiveShadow = true; G.add(m);
  if (g.parts.length) G.add(g.bake(lit()));
  return G;
}

const END = 8.15; // where the tunnels swallow them
const LANES = [
  { z: 4.92, dir: 1, v: 1.35, cars: [['kei', 0xf7a8b8, 0], ['van', 0xf4f1ea, 7.5], ['taxi', 0xffc857, 13]] }, // (keeping left: eastbound on the shop's side)
  { z: 5.98, dir: -1, v: 1.6, cars: [['truck', 0x5bc0eb, 2], ['kei', 0xfdfbf4, 9], ['taxi', 0x3e6a6a, 15.5]] },
];

export function traffic(scene, y, life) {
  const span = END * 2 + 5; // (a little longer than the road: a gap inside the tunnel before each comes back)
  const all = LANES.flatMap((lane) => lane.cars.map(([kind, col, at]) => { const v = vehicle(kind, col); v.rotation.y = lane.dir > 0 ? 0 : Math.PI; v.position.z = lane.z; scene.add(v); return { v, lane, at }; }));
  life.push((t) => {
    for (const { v, lane, at } of all) {
      const u = ((t * lane.v + at) % span + span) % span - END; // from -END on, along its direction
      v.visible = u < END;
      v.position.x = u * lane.dir;
      v.position.y = y + Math.abs(Math.sin(t * 9 + at)) * 0.006; // (the small bounce of a small car)
    }
  });
}

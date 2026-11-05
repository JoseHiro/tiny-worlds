// The people on the platforms (rails/DESIGN.md §5): tiny model-railway figures, all drawn by four InstancedMeshes
// (trousers, coat, face, hair). On each side of an island platform they queue in lines at the door marks; the lines grow while no train is in
// and melt into the train while it stands at the platform.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLAT } from './track.js';
import { CAR } from './trains.js';
import { platformAt } from './timetable.js';

const COATS = [0x2a2f3a, 0x23262c, 0x3a4150, 0x4a4f59, 0xf2efe8, 0x6b5a48, 0x2f3e57, 0x8a8f96, 0xc9b48a, 0x1d1f23, 0x5a6270, 0xe2a9a0];
const HAIR = [0x1d1a18, 0x2a2018, 0x3a2a20, 0x1d1a18, 0x6b6560];
const H = 0.044; // a figure's height
const DEPTH = [0.039, 0.026, 0.013]; // a queue: from the platform edge inwards
const rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export class Crowd {
  constructor(scene, cap) {
    // a figure faces +x: trousers, a coat with a bag at the hip, a face, and hair over the back and top of the head
    const parts = {
      legs: [mergeGeometries([-1, 1].map((s) => new THREE.CylinderGeometry(0.0028, 0.0026, 0.016, 4, 1, true).translate(0, 0.008, s * 0.0034))), 0x2a2d33],
      coat: [mergeGeometries([new THREE.CapsuleGeometry(0.0068, 0.012, 2, 6).translate(0, 0.0245, 0), new THREE.BoxGeometry(0.006, 0.008, 0.004).translate(-0.001, 0.02, -0.008)]), null],
      head: [new THREE.SphereGeometry(0.0068, 8, 6).translate(0, H - 0.0072, 0), null],
      hair: [mergeGeometries([new THREE.SphereGeometry(0.0074, 8, 2, 0, Math.PI * 2, 0, Math.PI * 0.3), new THREE.SphereGeometry(0.0074, 5, 4, Math.PI * 1.5, Math.PI, 0, Math.PI * 0.62)]).translate(-0.0006, H - 0.0068, 0), null], // (a cap on top, down to the neck at the back)
    };
    this.ims = {};
    for (const [k, [geo, color]] of Object.entries(parts)) {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: color ?? 0xffffff, roughness: 0.75 }), cap);
      im.castShadow = k !== 'hair'; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); this.ims[k] = im;
    }
    const c = new THREE.Color(), SKIN = [0xf1c7a5, 0xe8b48f, 0xf6d3b8, 0xd9a07a];
    for (const im of Object.values(this.ims)) im.count = 0; // (nobody until the first frame; colours are set for all)
    for (let i = 0; i < cap; i++) {
      this.ims.coat.setColorAt(i, c.setHex(COATS[Math.floor(rand(i) * COATS.length)]));
      this.ims.head.setColorAt(i, c.setHex(SKIN[Math.floor(rand(i + 0.3) * SKIN.length)]));
      this.ims.hair.setColorAt(i, c.setHex(HAIR[Math.floor(rand(i + 0.5) * HAIR.length)]));
    }
    this.cap = cap; this.sides = []; this.m = new THREE.Matrix4(); this.p = new THREE.Vector3(); this.q = new THREE.Quaternion(); this.one = new THREE.Vector3(1, 1, 1); this.a = [0, 0, 0, 0];
  }
  // one side of a platform: the line, its run, the stop event, which side (±1) of the path, how many it holds at most
  addSide(line, run, ev, side, { full = 1 } = {}) {
    const slots = [];
    for (let car = 0; car < CAR.cars; car++) for (const dx of [-0.25, 0.25]) for (const [r, d] of DEPTH.entries()) {
      const along = (car - (CAR.cars - 1) / 2) * (CAR.len + CAR.gap) + dx * CAR.len;
      slots.push({ along: along + (rand(slots.length * 3 + ev.s) - 0.5) * 0.006, d: side * (d - (rand(slots.length + ev.s) - 0.5) * 0.004), r, key: rand(slots.length * 7 + ev.s * 13) });
    }
    slots.sort((a, b) => a.r - b.r || a.key - b.key); // front of each queue first
    this.sides.push({ line, run, ev, slots, full });
  }
  update(time, t) {
    const { m, p, q, one, a } = this;
    let n = 0;
    for (const sd of this.sides) {
      const pl = platformAt(sd.run, sd.ev, time), max = sd.slots.length * sd.full;
      const atArrival = Math.min(max, max * (pl.wait / sd.run.headway) * 1.15); // how many had gathered by the time it came in
      const count = Math.round(pl.standing ? atArrival * (1 - Math.min(1, pl.u / 0.7)) : Math.min(max, atArrival * (pl.since / pl.wait)));
      const path = sd.line.path;
      for (let i = 0; i < count && n < this.cap; i++, n++) {
        const sl = sd.slots[i];
        path.at(sd.ev.s + sl.along, sl.d, a);
        const y = path.y(sd.ev.s + sl.along) + PLAT.top + Math.max(0, Math.sin(t * 5 + i * 1.7)) * 0.0006;
        q.setFromAxisAngle(p.set(0, 1, 0), Math.atan2(-a[3], a[2]) + (sl.d > 0 ? -Math.PI / 2 : Math.PI / 2));
        m.compose(p.set(a[0], y, a[1]), q, one);
        for (const im of Object.values(this.ims)) im.setMatrixAt(n, m);
      }
    }
    for (const im of Object.values(this.ims)) { im.count = n; im.instanceMatrix.needsUpdate = true; }
  }
}

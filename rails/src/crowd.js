// The people on the platforms (rails/DESIGN.md §5): tiny model-railway figures, all drawn by six InstancedMeshes
// (two legs, coat, face, hair). On each side of an island platform they come up the stairs and walk to the door marks,
// queue there while no train is in, and step aboard while one stands; and out of every train that stops a crowd pours
// out of the doors and walks off down the stairs. All of it follows the clock, like the trains. Each figure keeps its
// own instance and its own colours whoever else comes and goes (else the colours would hop from one to the next).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLAT, STAIR } from './track.js';
import { CAR } from './trains.js';

const COATS = [0x2a2f3a, 0x23262c, 0x3a4150, 0x4a4f59, 0xf2efe8, 0x6b5a48, 0x2f3e57, 0x8a8f96, 0xc9b48a, 0x1d1f23, 0x5a6270, 0xe2a9a0];
const HAIR = [0x1d1a18, 0x2a2018, 0x3a2a20, 0x1d1a18, 0x6b6560];
const SKIN = [0xf1c7a5, 0xe8b48f, 0xf6d3b8, 0xd9a07a];
const H = 0.044, HIP = 0.016; // a figure's height, its hips
const DEPTH = [0.039, 0.026, 0.013]; // a queue: from the platform edge inwards
const WALK = 0.005; // walking pace, map units a game second (a brisk rush-hour step, a body length a real second and more)
const STRIDE = 0.011;
const BIG = new Set(['shinjuku', 'tokyo', 'shibuya', 'ikebukuro', 'shinagawa', 'ueno', 'akihabara']); // more get off here
const rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mod = (a, b) => ((a % b) + b) % b;
const QUEUE = CAR.cars * 2 * DEPTH.length;

export class Crowd {
  // `sides`: [{ line, run, ev, side }] — every stop event where people wait, and the side of the path its trains stand on
  constructor(scene, sides) {
    // a figure faces +x: legs hung from the hips (each its own mesh, so they swing), a coat with a bag at the hip, a face,
    // and hair over the back and top of the head
    const leg = (s) => new THREE.CylinderGeometry(0.0028, 0.0026, HIP, 4, 1, true).translate(0, -HIP / 2, s * 0.0034);
    const parts = {
      legL: [leg(-1), 0x2a2d33], legR: [leg(1), 0x2a2d33],
      coat: [mergeGeometries([new THREE.CapsuleGeometry(0.0068, 0.012, 2, 6).translate(0, 0.0245, 0), new THREE.BoxGeometry(0.006, 0.008, 0.004).translate(-0.001, 0.02, -0.008)]), null],
      head: [new THREE.SphereGeometry(0.0068, 8, 6).translate(0, H - 0.0072, 0), null],
      hair: [mergeGeometries([new THREE.SphereGeometry(0.0074, 8, 2, 0, Math.PI * 2, 0, Math.PI * 0.3), new THREE.SphereGeometry(0.0074, 5, 4, Math.PI * 1.5, Math.PI, 0, Math.PI * 0.62)]).translate(-0.0006, H - 0.0068, 0), null], // (a cap on top, down to the neck at the back)
    };
    this.sides = sides.map((sd, k) => this.#side(sd, k));
    const cap = this.sides.reduce((n, sd) => n + sd.slots.length + sd.off.length + sd.pass.length, 0);
    this.ims = {};
    for (const [k, [geo, color]] of Object.entries(parts)) {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: color ?? 0xffffff, roughness: 0.75 }), cap);
      im.castShadow = k !== 'hair'; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); this.ims[k] = im;
      im.count = 0; // (nobody until the first frame)
      if (!color) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    }
    this.cap = cap; this.m = new THREE.Matrix4(); this.l = new THREE.Matrix4(); this.p = new THREE.Vector3(); this.q = new THREE.Quaternion(); this.one = new THREE.Vector3(1, 1, 1); this.up = new THREE.Vector3(0, 1, 0); this.z = new THREE.Vector3(0, 0, 1);
    this.a = [0, 0, 0, 0]; this.b = [0, 0, 0, 0];
    this.pal = { coat: COATS.map((c) => new THREE.Color(c)), head: SKIN.map((c) => new THREE.Color(c)), hair: HAIR.map((c) => new THREE.Color(c)) };
  }
  #side({ line, run, ev, side }, k) {
    const slots = [], doors = [];
    for (let car = 0; car < CAR.cars; car++) for (const dx of [-0.25, 0.25]) {
      const along = (car - (CAR.cars - 1) / 2) * (CAR.len + CAR.gap) + dx * CAR.len;
      doors.push(along);
      for (const [r, d] of DEPTH.entries()) slots.push({ along: along + (rand(slots.length * 3 + ev.s) - 0.5) * 0.006, d: side * (d - (rand(slots.length + ev.s) - 0.5) * 0.004), r, key: rand(slots.length * 7 + ev.s * 13) });
    }
    slots.sort((a, b) => a.r - b.r || a.key - b.key); // front of each queue first
    slots.forEach((sl, i) => { sl.id = k * 97 + i; sl.walk = Math.hypot(sl.along - stair(sl.along), sl.d) / WALK; });
    // the ones getting off: out of a door, a step in from the edge, then off to the nearer stairs, one after another
    const dwell = ev.dep - ev.arr, n = BIG.has(ev.key) ? 30 : 16, off = [];
    for (let j = 0; j < n; j++) {
      const along = doors[j % doors.length] + (rand(j * 5 + ev.s) - 0.5) * 0.02, inn = side * (0.022 + rand(j + ev.s * 3) * 0.014), to = stair(along) + Math.sign(along) * (rand(j * 11) - 0.5) * 0.02;
      const t0 = 2 + (Math.floor(j / doors.length) + rand(j * 3 + ev.s)) * Math.min(6, dwell * 0.15), l1 = Math.abs(side * 0.046 - inn), l2 = Math.hypot(to - along, inn);
      off.push({ id: k * 97 + 40 + j, along, inn, to, t0, l1, len: l1 + l2 });
    }
    // and a few changing trains: up one stairs, along the middle of the platform, down the other, all the time
    const pass = Array.from({ length: BIG.has(ev.key) ? 5 : 3 }, (_, j) => ({ id: k * 97 + 70 + j, d: side * (0.004 + rand(j * 13 + ev.s) * 0.004), dir: j % 2 ? 1 : -1, ph: rand(j * 17 + ev.s * 5) }));
    return { line, run, ev, side, slots, off, pass };
  }
  // one figure: at (along, d) on the side's platform, facing (dAlong, dD), legs swung by `stride`, sunk `down` into the stairs
  #put(sd, n, along, d, fa, fd, walked, down = 0) {
    const { m, l, p, q, one, up, z, a, b } = this, path = sd.line.path, s = sd.ev.s + along;
    path.at(s, d, a);
    let yaw;
    if (fa === 0 && fd === 0) yaw = Math.atan2(-a[3], a[2]) + (d > 0 ? -Math.PI / 2 : Math.PI / 2); // (standing: facing the track)
    else { path.at(s + fa * 0.01, d + fd * 0.01, b); yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0]); }
    const ph = walked / STRIDE * Math.PI, swing = walked ? Math.sin(ph) * 0.55 : 0;
    const y = path.y(s) + PLAT.top + (walked ? Math.abs(Math.cos(ph)) * 0.0009 : 0) - down;
    m.compose(p.set(a[0], y, a[1]), q.setFromAxisAngle(up, yaw), one);
    this.ims.coat.setMatrixAt(n, m); this.ims.head.setMatrixAt(n, m); this.ims.hair.setMatrixAt(n, m);
    for (const [k, sw] of [['legL', swing], ['legR', -swing]]) { l.compose(p.set(0, HIP, 0), q.setFromAxisAngle(z, sw), one); this.ims[k].setMatrixAt(n, l.premultiply(m)); }
  }
  #dress(n, id) {
    const { coat, head, hair } = this.ims, pal = this.pal;
    coat.setColorAt(n, pal.coat[Math.floor(rand(id) * pal.coat.length)]);
    head.setColorAt(n, pal.head[Math.floor(rand(id + 0.3) * pal.head.length)]);
    hair.setColorAt(n, pal.hair[Math.floor(rand(id + 0.5) * pal.hair.length)]);
  }
  update(time) {
    let n = 0;
    for (const sd of this.sides) {
      const { run, ev, slots, off } = sd, Hw = run.headway, dwell = ev.dep - ev.arr, wait = Hw - dwell;
      const since = mod(time - ev.arr, Hw), standing = since < dwell; // (since the last train came in)
      const max = slots.length, gathered = Math.min(max, max * (wait / Hw) * 1.15); // how many have gathered by the time a train comes
      // the queue: walking in from the stairs while no train is in, stepping aboard (front rows first) while one stands
      const boarded = standing ? gathered * Math.min(1, since / (dwell * 0.7)) : 0, w = since - dwell;
      for (let i = 0; i < gathered && n < this.cap; i++) {
        const sl = slots[i];
        if (standing) {
          if (i < Math.floor(boarded)) continue;
          const f = i === Math.floor(boarded) ? boarded - i : 0; // (the one at the door now: a step to the edge)
          this.#put(sd, n, sl.along, sl.d + Math.sign(sl.d) * f * (0.05 - Math.abs(sl.d)), 0, f ? Math.sign(sl.d) : 0, f * 0.02);
        } else {
          const at = ((i + 0.5) / gathered) * wait, from = Math.max(0, at - sl.walk); // (in place at `at`, having walked from the stairs)
          if (w < from) continue;
          const u = Math.min(1, (w - from) / (at - from || 1)), st = stair(sl.along);
          if (u < 1) this.#put(sd, n, st + (sl.along - st) * u, sl.d * u, sl.along - st, sl.d, u * sl.walk * WALK, Math.max(0, 0.15 - u) * 0.2);
          else this.#put(sd, n, sl.along, sl.d, 0, 0, 0);
        }
        this.#dress(n++, sl.id);
      }
      // the ones getting off: from the doors to the stairs, and down
      for (const o of off) {
        if (n >= this.cap) break;
        const d = (since - o.t0) * WALK;
        if (d < 0 || d > o.len) continue;
        const edge = sd.side * 0.046;
        if (d < o.l1) this.#put(sd, n, o.along, edge + (o.inn - edge) * (d / o.l1), 0, o.inn - edge, d);
        else { const u = (d - o.l1) / (o.len - o.l1); this.#put(sd, n, o.along + (o.to - o.along) * u, o.inn * (1 - u), o.to - o.along, -o.inn, d, Math.max(0, u - 0.85) * 0.2); }
        this.#dress(n++, o.id);
      }
      for (const o of sd.pass) {
        if (n >= this.cap) break;
        const T = (2 * STAIR) / WALK, u = mod(time / T + o.ph, 1), sink = Math.max(0, 0.12 - u, u - 0.88) * 0.25;
        this.#put(sd, n, o.dir * STAIR * (2 * u - 1), o.d, o.dir, 0, u * T * WALK, sink);
        this.#dress(n++, o.id);
      }
    }
    for (const im of Object.values(this.ims)) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }
}

// where people come up from and go down to: the end of the nearer stairs' well facing them (out past its side walls)
const stair = (along) => { const k = Math.sign(along || 1) * STAIR; return k + Math.max(-0.03, Math.min(0.03, along - k)); };

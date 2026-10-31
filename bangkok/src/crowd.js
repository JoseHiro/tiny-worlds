// The night market's customers (bangkok/DESIGN.md §8): people walk a route like everywhere else (koto/src/people.js),
// with two more kinds of step. { queue: Q } joins the line in front of a stall, shuffles forward and is served when
// the stall is open; { seat: S, dur } takes a free stool at one of the plastic tables, eats, and leaves it again.
import * as THREE from 'three';
import { Agent, yawTo } from '../../koto/src/people.js';
import { SKINS, HAIRS } from '../../airport/src/looks.js';
import { rng } from './common.js';

// the line in front of a stall: spot is where the first customer stands, step how far back each next one stands
export class Queue {
  constructor({ spot, step, face, serve = 3.5, max = 4, ready = () => true }) { Object.assign(this, { spot, step, face, serve, max, ready, list: [] }); }
  join(a) { if (this.list.length >= this.max) return false; this.list.push(a); return true; }
  leave(a) { const i = this.list.indexOf(a); if (i >= 0) this.list.splice(i, 1); }
  slot(k) { return [this.spot[0] + this.step[0] * k, this.spot[1] + this.step[1] * k]; }
}

// stools round the tables: each chair is { x, z, yaw (facing the table), via (where to come from), out (just beside
// the stool), dish (shown while someone eats), by (who sits there), reserved (only for the story's people) }
export class Seats {
  constructor() { this.chairs = []; }
  add(chair) { this.chairs.push({ by: null, reserved: false, ...chair }); return this; }
  claim(a, only = null) {
    const free = this.chairs.filter((c) => !c.by && (only ? only.includes(c) : !c.reserved));
    if (!free.length) return null;
    const c = free[(a.seed ?? 0) % free.length];
    c.by = a;
    return c;
  }
  release(c) { if (c) c.by = null; }
}

export class Shopper extends Agent {
  constructor(scene, role, route, opts = {}) {
    super(scene, role, route, { onStep: (s) => s.call?.(), ...opts }); // (a step's call runs as it begins)
    this.who = opts.who ?? null; this.seed = opts.seed ?? 0; this.chair = null; this.leg = 0;
  }
  walk(x, z, dt) {
    const P = this.p.position, dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz), step = this.speed * dt;
    this.p.userData.mode = 'walk';
    if (d <= step) { this.place(x, z); return true; }
    this.place(P.x + (dx / d) * step, P.z + (dz / d) * step); this.p.rotation.y = yawTo(dx, dz);
    return false;
  }
  update(t, dt) {
    const s = this.route[this.i];
    if (this.t < 0 || !(s.queue || s.seat)) return super.update(t, dt);
    if (this.entered !== this.i) {
      this.entered = this.i; this.onStep?.(s); this.leg = 0; this.t = 0;
      if (s.queue && !s.queue.join(this)) return this.next(); // the line is too long: walk on
      if (s.seat && !(this.chair = s.seat.claim(this, s.only))) return this.next(); // no free stool
    }
    if (s.label) this.label = s.label;
    const ud = this.p.userData;
    if (s.queue) {
      const Q = s.queue, k = Q.list.indexOf(this), [x, z] = Q.slot(k);
      if (this.walk(x, z, dt)) {
        ud.mode = 'idle'; this.p.rotation.y = Q.face;
        if (k === 0 && Q.ready() && (this.t += dt) > Q.serve) { Q.leave(this); this.next(); }
      }
    } else {
      const c = this.chair;
      if (this.leg === 0) { if (this.walk(...c.via, dt)) this.leg = 1; }
      else if (this.leg === 1) { if (this.walk(...c.out, dt)) this.leg = 2; }
      else if (this.leg === 2) {
        this.place(c.x, c.z); this.p.rotation.y = c.yaw; ud.mode = s.do ?? 'sitEat';
        if (c.dish) c.dish.visible = true;
        if ((this.t += dt) >= (typeof s.dur === 'function' ? (s.dur() ? 0 : Infinity) : s.dur)) { this.leg = 3; if (c.dish) c.dish.visible = false; }
      } else if (this.leg === 3) { if (this.walk(...c.out, dt)) this.leg = 4; }
      else if (this.walk(...c.via, dt)) { s.seat.release(c); this.chair = null; this.next(); }
    }
    ud.update(t);
  }
  // leave any line or stool (when the story restarts and the figure is taken away)
  quit(queues) { for (const q of queues) q.leave(this); if (this.chair) { this.chair.by = null; if (this.chair.dish) this.chair.dish.visible = false; } this.remove(); }
}

// The throng (DESIGN.md §8): the hundreds of people who fill the pavements and the lane at night, besides the walkers
// above. They are drawn as a handful of instanced meshes (legs, body, arms, head, hair, eyes: one draw call each, the
// figure of airport/src/parts.js simplified), so a packed street costs a few draw calls and one set of geometry.
// Each walks a belt (a polyline; open belts start again at their far end out of sight, closed ones loop), keeps behind
// whoever is ahead on it, and steps aside round anyone in `others` (the walkers, the lines at the stalls). Now and then
// one stops to look at something (browse(x, z): the point they turn to), and the people behind bunch up.
const geo = (g, y) => g.translate(0, y, 0);
const PARTS = { // geometry with its pivot at the origin; where it hangs on the figure (y, z)
  leg: geo(new THREE.CapsuleGeometry(0.07, 0.18, 3, 8), -0.16),
  body: new THREE.CapsuleGeometry(0.17, 0.16, 4, 10),
  arm: geo(new THREE.CapsuleGeometry(0.055, 0.16, 3, 8), -0.13),
  head: new THREE.SphereGeometry(0.25, 14, 10),
  hair: new THREE.SphereGeometry(0.272, 18, 10, 0, Math.PI * 2, 0, 1.35).translate(-0.02, 0.0, 0),
  eye: new THREE.SphereGeometry(0.026, 6, 4),
};
const M = new THREE.Matrix4(), P = new THREE.Matrix4(), Q = new THREE.Matrix4(), R = new THREE.Matrix4(), swing = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
const TOPS = [0xf4f0e8, 0xf4f0e8, 0xe8673c, 0x2c3a57, 0xf09a9a, 0x5f7f9a, 0xf2b84b, 0x8a5aa0, 0x4f9d6a, 0xd9342b, 0x1c2232, 0x9db59a, 0x3a7fd0, 0xe8d890];
const LEGS = [0x2c3a57, 0x1c2232, 0x3a3f4a, 0xc9b48a, 0x3a5a8a, 0x6b6259, 0xf4f0e8];
const HAIR = [HAIRS.ink, HAIRS.ink, HAIRS.ink, HAIRS.dark, HAIRS.dark, HAIRS.brown, HAIRS.chestnut, HAIRS.honey, HAIRS.blonde, HAIRS.grey];
export class Throng {
  // belts: [{ pts: [[x, z], …], closed?, n (how many on it), hide?: (x, z) => bool (out of sight: drawn as nothing), browse? }]
  constructor(scene, belts, { heightAt = () => 0, others = [], seed = 5 } = {}) {
    const rnd = rng(seed), white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.04 });
    this.heightAt = heightAt; this.others = others; this.belts = []; this.all = [];
    for (const b of belts) {
      const pts = b.closed ? [...b.pts, b.pts[0]] : b.pts, seg = [];
      let len = 0;
      for (let i = 0; i < pts.length - 1; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], l = Math.hypot(x1 - x0, z1 - z0); seg.push({ x0, z0, dx: (x1 - x0) / l, dz: (z1 - z0) / l, s0: len, l }); len += l; }
      const belt = { seg, len, hide: b.hide, browse: b.browse, people: [] };
      for (let i = 0; i < b.n; i++) { // spread along the belt, a little unevenly; each a different speed and look
        const f = { belt, s: ((i + rnd() * 0.6) / b.n) * len, v0: 0.55 + rnd() * 0.35, v: 0, side: (rnd() - 0.5) * (b.spread ?? 0.12), dodge: 0, stop: 0, rnd, ph: rnd() * 6, x: 0, z: 0, yaw: 0 };
        f.look = [TOPS[(rnd() * TOPS.length) | 0], LEGS[(rnd() * LEGS.length) | 0], SKINS[Math.min(4, (rnd() * rnd() * 5) | 0)], HAIR[(rnd() * HAIR.length) | 0]];
        belt.people.push(f); this.all.push(f);
      }
      this.belts.push(belt);
    }
    const n = this.all.length, im = (g, k) => { const m = new THREE.InstancedMesh(g, white, n * k); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return m; };
    this.mesh = { leg: im(PARTS.leg, 2), body: im(PARTS.body, 1), arm: im(PARTS.arm, 2), head: im(PARTS.head, 1), hair: im(PARTS.hair, 1), eye: im(PARTS.eye, 2) };
    this.mesh.eye.castShadow = false;
    const c = new THREE.Color();
    this.all.forEach(({ look: [top, legs, skin, hair] }, i) => {
      for (const k of [0, 1]) { this.mesh.leg.setColorAt(i * 2 + k, c.set(legs)); this.mesh.arm.setColorAt(i * 2 + k, c.set(top)); this.mesh.eye.setColorAt(i * 2 + k, c.set(0x1d1f23)); }
      this.mesh.body.setColorAt(i, c.set(top)); this.mesh.head.setColorAt(i, c.set(skin)); this.mesh.hair.setColorAt(i, c.set(hair));
    });
    this.update(0, 0);
  }
  at(belt, s) { // [x, z, dx, dz] at distance s along the belt
    s = ((s % belt.len) + belt.len) % belt.len;
    const g = belt.seg.find((q) => s < q.s0 + q.l) ?? belt.seg.at(-1), u = s - g.s0;
    return [g.x0 + g.dx * u, g.z0 + g.dz * u, g.dx, g.dz];
  }
  update(t, dt) {
    const busy = this.others.filter((a) => a.p.visible).map((a) => a.p.position);
    for (const belt of this.belts) {
      const list = belt.people, n = list.length;
      for (let i = 0; i < n; i++) {
        const f = list[i], ahead = list[(i + 1) % n], gap = ((ahead.s - f.s) % belt.len + belt.len) % belt.len;
        let want = f.v0;
        if (n > 1 && gap < 1.4) want = Math.min(want, Math.max(0, (gap - 0.55) * 1.2)); // close behind someone: their pace
        // someone standing in the way (a line at a stall): slow down and step round them
        const [x, z, dx, dz] = this.at(belt, f.s);
        let block = 0;
        for (const p of busy) {
          const ax = p.x - x, az = p.z - z, fwd = ax * dx + az * dz, lat = -ax * dz + az * dx - f.side - f.dodge;
          if (fwd > -0.2 && fwd < 1.1 && Math.abs(lat) < 0.5) { block = lat > 0 ? -1 : 1; want = Math.min(want, 0.25); }
        }
        f.dodge += ((block ? block * 0.36 : 0) - f.dodge) * Math.min(1, dt * 2.5);
        if (belt.browse && f.stop <= 0 && f.v > 0.3 && f.rnd() < dt * 0.05) f.stop = 1.5 + f.rnd() * 3; // something catches their eye
        if (f.stop > 0) { f.stop -= dt; want = 0; }
        f.v += (want - f.v) * Math.min(1, dt * 3);
        f.s = (f.s + f.v * dt) % belt.len;
        f.ph += f.v * dt * 7;
        const off = f.side + f.dodge;
        f.x = x - dz * off; f.z = z + dx * off;
        let yaw = yawTo(dx, dz);
        if (f.stop > 0) { const [bx, bz] = belt.browse(f.x, f.z); yaw = yawTo(bx - f.x, bz - f.z); }
        const turn = Math.atan2(Math.sin(yaw - f.yaw), Math.cos(yaw - f.yaw));
        f.yaw += turn * Math.min(1, dt * 5);
      }
    }
    const m = this.mesh;
    this.all.forEach((f, i) => {
      if (f.belt.hide?.(f.x, f.z)) { for (const k of [0, 1]) { m.leg.setMatrixAt(i * 2 + k, zero); m.arm.setMatrixAt(i * 2 + k, zero); m.eye.setMatrixAt(i * 2 + k, zero); } for (const k of ['body', 'head', 'hair']) m[k].setMatrixAt(i, zero); return; }
      const a = Math.sin(f.ph) * Math.min(1, f.v / 0.5), bob = Math.abs(Math.cos(f.ph)) * 0.025 * Math.min(1, f.v / 0.5);
      M.makeRotationY(f.yaw).setPosition(f.x, this.heightAt(f.x, f.z) + bob, f.z);
      for (const [k, s] of [[0, 1], [1, -1]]) {
        m.leg.setMatrixAt(i * 2 + k, P.multiplyMatrices(M, Q.makeTranslation(0, 0.32, s * 0.08)).multiply(swing.makeRotationZ(a * 0.5 * s)));
        m.arm.setMatrixAt(i * 2 + k, P.multiplyMatrices(M, Q.makeTranslation(0, 0.72, s * 0.21)).multiply(swing.makeRotationZ(-a * 0.4 * s)));
        m.eye.setMatrixAt(i * 2 + k, P.multiplyMatrices(M, Q.makeTranslation(0.238, 1.04, s * 0.085)));
      }
      m.body.setMatrixAt(i, P.multiplyMatrices(M, Q.makeTranslation(0, 0.55, 0)));
      m.head.setMatrixAt(i, P.multiplyMatrices(M, Q.makeTranslation(0, 1.0, 0)));
      m.hair.setMatrixAt(i, P.multiplyMatrices(M, Q.makeTranslation(0, 1.0, 0)).multiply(R.makeRotationZ(0.5)));
    });
    for (const k in m) m[k].instanceMatrix.needsUpdate = true;
  }
}

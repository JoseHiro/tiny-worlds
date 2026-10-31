// The night market's customers (bangkok/DESIGN.md §8): people walk a route like everywhere else (koto/src/people.js),
// with two more kinds of step. { queue: Q } joins the line in front of a stall, shuffles forward and is served when
// the stall is open; { seat: S, dur } takes a free stool at one of the plastic tables, eats, and leaves it again.
import { Agent, yawTo } from '../../koto/src/people.js';

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

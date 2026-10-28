// Roads & towns — road tiles, the lane network they make, and simple traffic (town/DESIGN.md §1.3, §2.1, §0).
// A tile is 12 × 12. Each tile builds its surface (asphalt, raised sidewalks, verges, markings) and the lane
// paths across it; placed side by side, the paths join into one network. Traffic drives on the left.
import * as THREE from 'three';
import { mat, mesh, box } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';

export const TILE = 12, LANE = 2.6, WALK = 1.5, CURB = 0.12;
export const H = TILE / 2, R0 = LANE, R1 = LANE + WALK; // carriageway half width, outer edge of the sidewalk
const COL = { asphalt: 0x50545b, walk: 0xddd6c8, grass: 0x9fc47c, white: 0xf4f0e8, yellow: 0xf2b84b };
export const M = {
  asphalt: mat(COL.asphalt, { roughness: 0.95 }),
  walk: mat(COL.walk, { roughness: 0.9 }),
  grass: mat(COL.grass, { roughness: 1 }),
  white: mat(COL.white, { roughness: 0.7 }),
  yellow: mat(COL.yellow, { roughness: 0.7 }),
};

// ports: where a tile's road meets its neighbour (local, before the tile turns)
export const PORTS = { N: new THREE.Vector2(0, -H), E: new THREE.Vector2(H, 0), S: new THREE.Vector2(0, H), W: new THREE.Vector2(-H, 0) };
const KINDS = { straight: ['W', 'E'], curve: ['W', 'S'], tee: ['W', 'E', 'S'], cross: ['W', 'E', 'N', 'S'] };

// ---------- surface pieces ----------

export const raised = (shape, m, h) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 12 }).rotateX(Math.PI / 2);
  g.translate(0, h, 0);
  return mesh(g, m);
};
// shapes are drawn in (x, z) with Shape's y as z; rotateX(+π/2) maps shape y → +z
export const rect = (x0, z0, x1, z1) => { const s = new THREE.Shape(); s.moveTo(x0, z0); s.lineTo(x1, z0); s.lineTo(x1, z1); s.lineTo(x0, z1); s.closePath(); return s; };
// the corner of a junction in quadrant (sx, sz): an L of sidewalk with a rounded kerb, and the verge behind it
function corner(sx, sz, r = 1.2) {
  const P = (a, b) => [sx * a, sz * b];
  const walk = new THREE.Shape();
  walk.moveTo(...P(R0, H));
  walk.lineTo(...P(R0, R0 + r));
  for (let i = 1; i <= 8; i++) { const a = Math.PI + (i / 8) * (Math.PI / 2); walk.lineTo(...P(R0 + r + Math.cos(a) * r, R0 + r + Math.sin(a) * r)); }
  walk.lineTo(...P(H, R0));
  walk.lineTo(...P(H, R1));
  walk.lineTo(...P(R1, R1));
  walk.lineTo(...P(R1, H));
  walk.closePath();
  return { walk, grass: rect(...P(R1, R1), ...P(H, H)) };
}

// ---------- markings ----------

export const stripe = (g, w, d, x, z, ry = 0, m = M.white) => { const b = mesh(new THREE.BoxGeometry(w, 0.012, d, Math.ceil(w), 1, 1), m, x, 0.006, z); b.rotation.y = ry; b.castShadow = false; g.add(b); };
// a straight strip along x, subdivided so a slope can bend it
export const strip = (x0, z0, x1, z1, h, m) => mesh(new THREE.BoxGeometry(x1 - x0, h, Math.abs(z1 - z0), 12, 1, 1), m, (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
// dashed centre line along an arm, from distance a to b out from the tile centre in direction (dx, dz)
export function dashes(g, dx, dz, a, b) {
  for (let s = a + 0.5; s < b - 0.4; s += 2) stripe(g, Math.abs(dx) ? 1.0 : 0.12, Math.abs(dz) ? 1.0 : 0.12, dx * (s + 0.5), dz * (s + 0.5));
}
// zebra crossing across the arm going out in direction (dx, dz), and the stop line before it on the incoming lane
function crossing(g, dx, dz) {
  for (let k = -R0 + 0.45; k <= R0 - 0.4; k += 0.75) stripe(g, dx ? 1.2 : 0.42, dx ? 0.42 : 1.2, dx * 4.9 + (dx ? 0 : k), dz * 4.9 + (dz ? 0 : k));
  // traffic coming in on this arm heads (−dx, −dz); its lane is on its left, (−dz, dx)
  stripe(g, dx ? 0.3 : R0 - 0.2, dx ? R0 - 0.2 : 0.3, dx * 5.85 - dz * R0 / 2, dz * 5.85 + dx * R0 / 2);
}

// ---------- lane paths ----------

export const LEFT = (d) => new THREE.Vector2(d.y, -d.x); // left of a heading (x, z) — we drive on the left
function lanePath(a, b) {
  // centre line from port a to port b (straight, or a quarter circle round the shared tile corner), offset to the left lane
  const A = PORTS[a], B = PORTS[b];
  const pts = [];
  const n = 24;
  const opposite = A.x === -B.x && A.y === -B.y;
  const c = A.clone().add(B); // corner centre for turns
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let p, d;
    if (opposite) { p = A.clone().lerp(B, t); d = B.clone().sub(A).normalize(); }
    else {
      const a0 = Math.atan2(A.y - c.y, A.x - c.x), a1 = Math.atan2(B.y - c.y, B.x - c.x);
      let da = a1 - a0;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      const ang = a0 + da * t;
      p = new THREE.Vector2(c.x + Math.cos(ang) * H, c.y + Math.sin(ang) * H);
      d = new THREE.Vector2(-Math.sin(ang), Math.cos(ang)).multiplyScalar(Math.sign(da));
    }
    pts.push(p.add(LEFT(d).multiplyScalar(LANE / 2)));
  }
  // which way does it turn? (cross product of in and out headings; +z is right of +x)
  const din = A.clone().negate().normalize(), dout = B.clone().normalize();
  const cr = din.x * dout.y - din.y * dout.x;
  return { pts, turn: opposite ? null : cr > 0 ? 'R' : 'L', from: a };
}

export class Path {
  constructor(pts, { turn = null, signal = null } = {}) {
    this.pts = pts;
    this.turn = turn;
    this.signal = signal;
    this.conflicts = []; // lanes in the same tile that cross or merge with this one
    this.clearAt = new Map(); // conflicting lane → distance along it after which a car there is out of the way
    this.priority = turn === null ? 3 : turn === 'L' ? 2 : 1; // straight on, then left (the easy turn), then right
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.len = this.cum.at(-1);
  }
  get start() { return this.pts[0]; }
  get end() { return this.pts.at(-1); }
  at(s, pos, tan) {
    s = Math.min(Math.max(s, 0), this.len);
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < s) i++;
    const k = (s - this.cum[i - 1]) / Math.max(1e-6, this.cum[i] - this.cum[i - 1]);
    pos.lerpVectors(this.pts[i - 1], this.pts[i], k);
    tan.subVectors(this.pts[i], this.pts[i - 1]).normalize();
    return pos;
  }
}

// ---------- signals (one controller per signalled junction) ----------

export class Signals {
  // phases: east–west green, yellow, all red, north–south green, yellow, all red
  constructor({ green = 10, yellow = 2.2, red = 1.6, offset = 0 } = {}) {
    this.plan = [['ew', 'green', green], ['ew', 'yellow', yellow], [null, 'red', red], ['ns', 'green', green], ['ns', 'yellow', yellow], [null, 'red', red]];
    this.cycle = this.plan.reduce((a, p) => a + p[2], 0);
    this.t = offset;
    this.listeners = [];
  }
  phase() {
    let t = this.t % this.cycle;
    for (const p of this.plan) { if (t < p[2]) return p; t -= p[2]; }
    return this.plan[0];
  }
  state(group) { const [g, s] = this.phase(); return g === group ? s : 'red'; }
  update(dt) { const before = this.phase(); this.t += dt; if (this.phase() !== before) this.listeners.forEach((f) => f(this)); }
}

// ---------- tiles ----------

// kind: straight | curve | tee | cross; turns: quarter turns clockwise (seen from above); rise: height gained along a straight (a slope)
export function tile(kind, { at = [0, 0], turns = 0, y = 0, rise = 0, signals = null, verge = true } = {}) {
  const g = new THREE.Group();
  const ports = KINDS[kind];
  // asphalt over the whole tile, then sidewalks and verges on top of it where there's no road
  g.add(mesh(new THREE.PlaneGeometry(TILE, TILE, 12, 12).rotateX(-Math.PI / 2), M.asphalt)); // (subdivided, so a slope can bend it)
  const add = (shape, walk = true) => g.add(walk ? raised(shape, M.walk, CURB) : raised(shape, M.grass, CURB - 0.02));
  if (kind === 'straight') {
    for (const s of [1, -1]) { g.add(strip(-H, s * R0, H, s * R1, CURB, M.walk)); if (verge) g.add(strip(-H, s * R1, H, s * H, CURB - 0.02, M.grass)); }
    dashes(g, 1, 0, -H, H);
    for (const s of [1, -1]) stripe(g, TILE, 0.1, 0, s * (R0 - 0.18));
  } else if (kind === 'curve') {
    // round the SW corner (−H, H): road between radius H−R0 and H+R0
    const c = new THREE.Vector2(-H, H);
    const ring = (r0, r1) => {
      const s = new THREE.Shape();
      s.moveTo(c.x + r0, c.y);
      s.absarc(c.x, c.y, r0, 0, -Math.PI / 2, true);
      s.lineTo(c.x, c.y - r1);
      s.absarc(c.x, c.y, r1, -Math.PI / 2, 0, false);
      s.closePath();
      return s;
    };
    add(ring(H - R1, H - R0)); add(ring(H + R0, H + R1));
    if (verge) {
      const inner = new THREE.Shape(); inner.moveTo(c.x, c.y); inner.lineTo(c.x + H - R1, c.y); inner.absarc(c.x, c.y, H - R1, 0, -Math.PI / 2, true); inner.closePath();
      add(inner, false);
      const outer = new THREE.Shape(); outer.moveTo(c.x + H + R1, c.y); outer.lineTo(H, H); outer.lineTo(H, -H); outer.lineTo(-H, -H); outer.lineTo(c.x, c.y - H - R1); outer.absarc(c.x, c.y, H + R1, -Math.PI / 2, 0, false); outer.closePath();
      add(outer, false);
    }
    for (let a = 0.06; a < Math.PI / 2; a += 0.17) stripe(g, 0.12, 0.9, c.x + Math.cos(-a) * H, c.y + Math.sin(-a) * H, a);
  } else {
    // junctions: corner Ls where two arms meet, a straight sidewalk where an arm is missing
    const has = (p) => ports.includes(p);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const armX = has(sx > 0 ? 'E' : 'W'), armZ = has(sz > 0 ? 'S' : 'N');
      if (armX && armZ) { const { walk, grass } = corner(sx, sz); add(walk); if (verge) add(grass, false); }
    }
    if (!has('N')) { add(rect(-H, -R1, H, -R0)); if (verge) add(rect(-H, -H, H, -R1), false); }
    for (const p of ports) {
      const d = PORTS[p].clone().normalize();
      crossing(g, d.x, d.y);
    }
  }
  const local = [];
  for (const a of ports) for (const b of ports) {
    if (a === b) continue;
    const lp = lanePath(a, b);
    local.push({ pts: lp.pts, turn: lp.turn, group: signals && kind === 'cross' ? (a === 'E' || a === 'W' ? 'ew' : 'ns') : null });
  }
  return finishTile(g, kind, local, { at, turns, y, rise, signals });
}

// Bend for a slope, bake, place and turn the tile, and turn its local lanes into world paths that know
// which other lanes they cross. local: [{ pts: [Vector2 (x, z) | Vector3], turn, group, priority, busOnly, stop }]
export function finishTile(g, kind, local, { at = [0, 0], turns = 0, y = 0, rise = 0, signals = null } = {}) {
  const lift = (x) => rise * THREE.MathUtils.smoothstep(x, -H, H);
  if (rise) for (const m of g.children) { // bend everything up the slope (smooth at both ends)
    if (!m.geometry) continue;
    const pos = m.geometry.attributes.position;
    m.updateMatrix();
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrix);
      pos.setY(i, pos.getY(i) + lift(v.x) / Math.max(1e-6, m.scale.y));
    }
    m.geometry.computeVertexNormals();
  }
  g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
  bakeStatic(g);
  g.position.set(at[0] * TILE, y, at[1] * TILE);
  g.rotation.y = -turns * Math.PI / 2;
  g.updateMatrixWorld(true);
  const paths = local.map((l) => {
    const pts = l.pts.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p.x, 0.02 + lift(p.x), p.y)).applyMatrix4(g.matrixWorld));
    const path = new Path(pts, { turn: l.turn ?? null, signal: l.group && signals ? { ctrl: signals, group: l.group } : null });
    if (l.priority) path.priority = l.priority;
    if (l.busOnly) path.busOnly = true;
    if (l.stop != null) path.stop = l.stop;
    return path;
  });
  linkConflicts(paths);
  g.userData = { kind: 'tile', type: kind, paths, signals };
  return g;
}

// which lanes cross or merge inside a tile (lanes from the same entry just follow each other), and for each,
// how far along the other lane the shared zone ends: a car past it is no longer in the way
export function linkConflicts(paths) {
  for (const a of paths) for (const b of paths) {
    if (a === b || a.start.distanceTo(b.start) < 0.1) continue;
    let end = -1;
    b.pts.forEach((q, j) => { if (a.pts.some((p) => p.distanceTo(q) < 1.7)) end = b.cum[j]; });
    if (end < 0) continue;
    a.conflicts.push(b);
    a.clearAt.set(b, b.end.distanceTo(a.end) < 0.1 ? b.len - 3 : end); // merging lanes: past the merge you just follow
  }
}

// ---------- the network ----------

const key = (v) => `${Math.round(v.x * 10)},${Math.round(v.z * 10)}`; // lane ends sit on tenths (ports at ±6, lanes at ±1.3)
export class Network {
  constructor() { this.paths = []; this.byStart = new Map(); }
  add(t) {
    for (const p of t.userData.paths) {
      this.paths.push(p);
      const k = key(p.start);
      if (!this.byStart.has(k)) this.byStart.set(k, []);
      this.byStart.get(k).push(p);
    }
    return t;
  }
  after(p) { return this.byStart.get(key(p.end)) ?? []; }
}

// ---------- traffic: follow the lanes, keep a gap, stop at red lights ----------

const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3();
export class Traffic {
  constructor(net, { speed = 4.2 } = {}) { this.net = net; this.cars = []; this.speed = speed; this.n = 0; }
  // bus: takes bus bays and stops at them (dwell seconds)
  add(obj, path, s = 0, { speed = this.speed * (0.85 + Math.random() * 0.25), len = 2.4, bus = false, dwell = 6 } = {}) {
    const c = { obj, path, s, v: speed * 0.5, vmax: speed, len, bus, dwell, stopped: 0, served: null, next: null, id: this.n++, fwd: new THREE.Vector3(1, 0, 0), braking: false };
    this.cars.push(c);
    this.place(c);
    return c;
  }
  pickNext(c) { return this.pickAfter(c.path, c); }
  pickAfter(path, c) {
    let opts = this.net.after(path).filter((p) => !p.busOnly || c.bus);
    if (!opts.length) return this.wrap?.(path) ?? null; // an open road's end: samples can send cars back to the start
    if (c.bus && opts.some((p) => p.busOnly)) return opts.find((p) => p.busOnly); // buses always call at the stop
    // mostly straight on, sometimes turn
    const straight = opts.filter((p) => !p.turn);
    return straight.length && Math.random() < 0.55 ? straight[0] : opts[Math.floor(Math.random() * opts.length)];
  }
  // before entering a junction: can we get in — and, when another junction follows straight after,
  // through that one too? (otherwise we'd stop inside the first and block it)
  blockedAhead(c, left) {
    if (this.mustYield(c, c.next, left)) return true;
    const E2 = c.next2;
    if (!E2 || !E2.conflicts.length) return false;
    if (E2.signal && E2.signal.ctrl.state(E2.signal.group) !== 'green') return true;
    return this.mustYield(c, E2, left + c.next.len);
  }
  mustYield(c, E, myLeft) {
    const out = _t.subVectors(E.end, E.pts.at(-2)).normalize();
    for (const o of this.cars) {
      if (o === c) continue;
      // don't block the box: a queue standing in the exit lane means wait outside the junction
      if (o.v < 0.6) {
        _d.subVectors(o.obj.position, E.end);
        const along = _d.dot(out), side = Math.abs(_d.x * out.z - _d.z * out.x);
        if (side < 1.0 && along > -1.5 && along < c.len + 0.8) return true;
      }
      for (const P of E.conflicts) {
        if (o.path === P && o.s - o.len / 2 < E.clearAt.get(P)) return true; // someone is (still) in the way
        if (o.next === P && !o.waiting && !o.holding && !(o.lead && o.gap < 2)) { // (a car stuck in a queue isn't coming yet)
          const oLeft = o.path.len - o.s;
          if (oLeft > 7) continue;
          if (P.priority > E.priority) return true;
          if (P.priority === E.priority && (oLeft < myLeft - 0.5 || (Math.abs(oLeft - myLeft) <= 0.5 && o.id < c.id))) return true;
        }
      }
    }
    return false;
  }
  place(c) {
    c.path.at(c.s, _p, _t);
    c.obj.position.copy(_p);
    c.fwd.copy(_t);
    c.obj.rotation.set(0, Math.atan2(-_t.z, _t.x), Math.atan2(_t.y, Math.hypot(_t.x, _t.z)), 'YZX');
  }
  update(dt) {
    const cars = this.cars;
    // who is in front of whom
    for (const c of cars) {
      c.lead = null; c.gap = Infinity;
      for (const o of cars) {
        if (o === c) continue;
        _d.subVectors(o.obj.position, c.obj.position);
        const ahead = _d.dot(c.fwd);
        if (ahead <= 0 || ahead > 12) continue;
        const side = Math.abs(_d.x * c.fwd.z - _d.z * c.fwd.x);
        if (side > 1.15) continue;
        if (o.fwd.dot(c.fwd) < -0.5) continue; // oncoming traffic passes
        const gap = ahead - (c.len + o.len) / 2;
        if (gap < c.gap) { c.gap = gap; c.lead = o; }
      }
    }
    for (const c of cars) if (c.lead && c.lead.lead === c && c.id < c.lead.id) { c.lead = null; c.gap = Infinity; } // two blocking each other: lower id goes
    for (const c of cars) {
      c.next ??= this.pickNext(c);
      if (c.next && c.next2 === undefined) c.next2 = this.pickAfter(c.next, c);
      const left = c.path.len - c.s;
      let want = c.vmax * (c.path.turn ? 0.5 : 1);
      if (c.next?.turn) want = Math.min(want, c.vmax * 0.5 + left * 0.35);
      // a bus calls at its stop: pull up, wait, go
      if (c.bus && c.path.stop != null && c.served !== c.path) {
        const d = c.path.stop - c.s;
        if (d < 0.15 && c.v < 0.2) { c.stopped += dt; want = 0; if (c.stopped > c.dwell) { c.served = c.path; c.stopped = 0; } }
        else want = Math.min(want, Math.sqrt(2 * 4 * Math.max(0, d)));
        c.obj.userData.doorOpen = c.stopped > 0.6 && c.stopped < c.dwell - 0.8;
      }
      // pulling out of a bay: give way to traffic coming along the road
      const rj = c.path.rejoin;
      const nose = rj ? rj.sSelf - c.len / 2 - 0.3 : 0; // hold with the front short of the merge
      if (rj && c.s < nose + 0.5 && c.s > nose - 8) {
        const coming = this.cars.some((o) => o !== c && ((o.path === rj.other && o.s > rj.sOther - 10 && o.s < rj.sOther + (o.len + c.len) / 2) || (o.next === rj.other && o.path.len - o.s < 10 - rj.sOther)));
        if (coming) { want = Math.min(want, Math.sqrt(2 * 5 * Math.max(0, nose - c.s))); c.holding = true; }
      }
      // the light ahead (only when not already in the junction)
      c.waiting = false;
      if (c.next?.signal && !c.path.signal) {
        const st = c.next.signal.ctrl.state(c.next.signal.group);
        const stopAt = left - c.len / 2 - 0.25;
        if (st === 'red' || (st === 'yellow' && stopAt > 2.5)) { want = Math.min(want, Math.sqrt(Math.max(0, 2 * 5 * Math.max(0, stopAt)))); c.waiting = stopAt < 4; }
      }
      // right of way: don't enter a lane that crosses one with a car in it, or one a car with priority is about to take
      c.holding = false;
      if (c.next && left < 7 && c.next.conflicts.length && (c.path.conflicts.length ? this.mustYield(c, c.next, left) : this.blockedAhead(c, left))) {
        const stopAt = left - c.len / 2 - 0.25;
        want = Math.min(want, Math.sqrt(2 * 5 * Math.max(0, stopAt)));
        c.holding = true;
      }
      if (c.lead) want = Math.min(want, Math.sqrt(2 * 5 * Math.max(0, c.gap - 0.9)), c.gap < 0.9 ? 0 : Infinity);
      const dv = THREE.MathUtils.clamp(want - c.v, -7 * dt, 2.8 * dt);
      c.braking = dv < -0.5 * dt || (c.v < 0.05 && want < 0.05);
      c.v = Math.max(0, c.v + dv);
      c.s += c.v * dt;
      while (c.s >= c.path.len) {
        // jumping to an unconnected lane (an open road's end sending cars back round): check again now
        const jump = c.next && c.next.start.distanceTo(c.path.end) > 0.5;
        if (jump && this.wrap) { c.next = this.wrap(c.path); c.next2 = undefined; }
        if (jump && c.next) c.teleported = true; // (a world can fade it in)
        if (!c.next) { c.s = c.path.len; c.v = 0; break; }
        c.s -= c.path.len;
        c.path = c.next;
        c.served = null; // a bus calls again next time round
        c.next = c.next2 ?? this.pickNext(c);
        c.next2 = c.next ? this.pickAfter(c.next, c) : null;
      }
      this.place(c);
      const ud = c.obj.userData;
      ud.speed = c.v;
      ud.braking = c.braking;
      ud.blink = c.path.turn ?? (c.next?.turn && left < 9 ? c.next.turn : null);
      ud.update?.(dt);
    }
  }
}

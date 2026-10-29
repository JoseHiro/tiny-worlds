// Airport simulation: flights, ground support vehicles, ground crew, landside traffic.
// Time unit: 1 simulated second = 1 minute on the airport clock.
import * as THREE from 'three';
import * as P from './parts.js';
import * as L from './layout.js';

const { v } = L;

const approach = (cur, target, step) => (cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step));
const headingOf = (dx, dz) => Math.atan2(-dz, dx); // rotation.y that points +X along (dx, dz)
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const lerpAngle = (a, b, t) => a + wrap(b - a) * t;
const fwd = (h) => ({ x: Math.cos(h), z: -Math.sin(h) });
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const NORTH = headingOf(0, 1); // toward the terminal
const SOUTH = headingOf(0, -1);

export const fmtClock = (min) => {
  const m = Math.floor(min) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// Arc-length cursor along a rounded polyline.
class Track {
  constructor(points, radius) {
    this.path = L.roundedPath(points, radius);
    this.len = this.path.getLength();
    this.s = 0;
  }
  get remaining() { return this.len - this.s; }
  get done() { return this.s >= this.len - 1e-4; }
  sample() {
    const t = THREE.MathUtils.clamp(this.s / this.len, 0, 1);
    return { p: this.path.getPoint(t), tan: this.path.getTangent(t) };
  }
}

// Turnaround timeline (seconds after the aircraft stops on stand)
export const TURN = { deboard: 9, clean: 17, board: 29, bridgeOff: 31, ready: 35 };

const CITIES = [
  ['札幌', 'CTS', 'Sapporo'], ['仙台', 'SDJ', 'Sendai'], ['大阪', 'ITM', 'Osaka'], ['福岡', 'FUK', 'Fukuoka'], ['那覇', 'OKA', 'Naha'],
  ['広島', 'HIJ', 'Hiroshima'], ['ソウル', 'ICN', 'Seoul'], ['台北', 'TPE', 'Taipei'], ['上海', 'PVG', 'Shanghai'], ['香港', 'HKG', 'Hong Kong'],
];
const LIVERY_KEYS = ['sunrise', 'lagoon', 'midnight'];
let flightSeq = 0;

// ---------- flights ----------

class Flight {
  // opts (a return flight): number, from, to, liveryKey, returnStory
  constructor(world, stand, opts = {}) {
    this.world = world;
    this.stand = stand;
    this.id = ++flightSeq;
    this.number = opts.number ?? `MA ${100 + ((this.id * 137) % 880)}`;
    const a = pick(CITIES);
    let b = pick(CITIES);
    while (b === a) b = pick(CITIES);
    this.from = opts.from ?? a;
    this.to = opts.to ?? b;
    this.returnStory = opts.returnStory ?? null;
    this.root = new THREE.Group();
    this.pitchGroup = new THREE.Group();
    this.liveryKey = opts.liveryKey ?? LIVERY_KEYS[this.id % LIVERY_KEYS.length];
    this.model = P.airplane(P.LIVERIES[this.liveryKey]);
    this.root.add(this.pitchGroup);
    this.pitchGroup.add(this.model);
    this.root.userData.flight = this;
    world.scene.add(this.root);
    this.state = 'approach';
    this.v = 0;
    this.alt = 0;
    this.pitch = 0;
    this.heading = 0;
    this.t = 0;
    this.svc = {};
    this.track = null;
    this.hasRunway = false;
    this.holding = false;
  }

  get onGround() { return !['approach', 'gone'].includes(this.state) && this.alt < 0.5; }

  get status() {
    switch (this.state) {
      case 'approach': return '着陸進入';
      case 'landing': return '着陸滑走';
      case 'taxiIn': return this.track.remaining < 26 ? 'スポットイン' : 'タキシング';
      case 'parked':
        if (this.t < TURN.deboard) return '降機中';
        if (this.t < TURN.clean) return '清掃・機内食';
        if (this.t < TURN.board) return '搭乗中';
        return this.waiting ? '出発待ち' : '出発準備';
      case 'pushback': return 'プッシュバック';
      case 'engineStart': return 'エンジン始動';
      case 'taxiOut': return this.holding ? '離陸待ち' : 'タキシング';
      case 'lineup': return '滑走路進入';
      case 'takeoff': return this.alt > 0 ? '上昇中' : '離陸滑走';
      default: return '';
    }
  }

  get phase() { // for UI colouring
    if (['approach', 'landing', 'taxiIn'].includes(this.state)) return 'arriving';
    if (this.state === 'parked') return 'turnaround';
    return 'departing';
  }

  pose(x, z, h) {
    this.heading = h;
    this.root.position.set(x, this.alt, z);
    this.root.rotation.y = h;
    this.pitchGroup.rotation.z = this.pitch;
  }

  drive(dt, target, decel = 3, reverse = false) {
    this.v = approach(this.v, target, (target > this.v ? 1.4 : decel) * dt);
    this.track.s = Math.min(this.track.len, this.track.s + this.v * dt);
    const { p, tan } = this.track.sample();
    this.pose(p.x, p.z, headingOf(tan.x, tan.z) + (reverse ? Math.PI : 0));
    this.model.userData.speed = reverse ? -this.v : this.v;
  }

  park() {
    const W = this.world;
    this.state = 'parked';
    this.t = 0;
    this.v = 0;
    this.model.userData.speed = 0;
    this.arrivedAt = W.clock;
    this.std = W.clock + 50;
    this.stand.bridge.target = 1;
    W.log('arrivedStand', { n: this.number, stand: this.stand.id });
    W.crewOut(this.stand);
  }

  update(dt) {
    const W = this.world;
    switch (this.state) {
      case 'approach': {
        this.v = 14;
        const x = this.root.position.x + this.v * dt;
        this.alt = Math.max(0, (L.TOUCHDOWN_X - x) * 0.19);
        this.pitch = this.alt < 3 ? 0.085 : 0.045;
        this.pose(x, L.RUNWAY.z, 0);
        if (x >= L.TOUCHDOWN_X) {
          this.alt = 0;
          this.track = new Track(L.routes.arrival(this.stand), 5);
          this.state = 'landing';
          W.stats.arrivals++;
          W.log('landed', { n: this.number, from: this.from });
        }
        break;
      }
      case 'landing':
      case 'taxiIn': {
        const rolling = this.state === 'landing';
        let target = rolling ? 4.6 : 4.2;
        target = Math.min(target, Math.sqrt(2 * 1.1 * this.track.remaining) + 0.12);
        if (W.planeBlocked(this)) target = 0;
        this.pitch = approach(this.pitch, 0, 0.07 * dt);
        this.drive(dt, target, rolling ? 2.4 : 3);
        if (rolling && this.root.position.z > L.RUNWAY.z + 4.5) {
          this.state = 'taxiIn';
          W.releaseRunway(this);
        }
        if (this.track.done) this.park();
        break;
      }
      case 'parked': this.turnaround(dt); break;
      case 'pushback': {
        const target = Math.min(1.5, Math.sqrt(2 * 0.6 * this.track.remaining) + 0.05);
        this.drive(dt, target, 1.2, true);
        const tug = this.stand.vehicles.tug;
        const f = fwd(this.heading);
        const reach = 7 + 3.45;
        tug.obj.position.set(this.root.position.x + f.x * reach, 0, this.root.position.z + f.z * reach);
        tug.heading = this.heading + Math.PI;
        tug.v = this.v;
        tug.place();
        if (this.track.done) {
          this.state = 'engineStart';
          this.t = 0;
          tug.attached = null;
          tug.v = 0;
          tug.go(L.gse.tugBack(this.stand, tug.homeX), () => { tug.state = 'home'; });
          this.stand.flight = null;
        }
        break;
      }
      case 'engineStart':
        this.t += dt;
        this.model.userData.speed = 0;
        if (this.t > 3) {
          this.state = 'taxiOut';
          this.track = new Track(L.routes.taxiOut(this.stand), 5);
        }
        break;
      case 'taxiOut': {
        let target = 4.2;
        const p = this.root.position;
        this.holding = false;
        if (!this.hasRunway && p.x < L.TAXI.west + 6) {
          if (W.requestRunway(this)) {
            this.hasRunway = true;
            W.log('cleared', { n: this.number });
          } else {
            const toHold = Math.max(0, p.z - L.HOLD_Z);
            target = Math.min(target, Math.sqrt(2 * 1.4 * toHold));
            this.holding = toHold < 0.4;
          }
        }
        target = Math.min(target, Math.sqrt(2 * 1.2 * this.track.remaining) + 0.1);
        if (W.planeBlocked(this)) target = 0;
        this.drive(dt, target);
        if (this.track.done) { this.state = 'lineup'; this.t = 0; }
        break;
      }
      case 'lineup':
        this.t += dt;
        if (this.t > 1.5) this.state = 'takeoff';
        break;
      case 'takeoff': {
        this.v = Math.min(24, this.v + 2.8 * dt);
        const x = this.root.position.x + this.v * dt;
        if (this.v > 12.5) this.alt += THREE.MathUtils.clamp((this.v - 12.5) * 0.35, 0, 4.5) * dt;
        this.pitch = this.alt > 0 ? Math.min(0.16, 0.07 + this.alt * 0.015) : this.v > 11.5 ? 0.06 : 0;
        this.pose(x, L.RUNWAY.z, 0);
        this.model.userData.speed = this.alt > 0.5 ? 0 : this.v;
        if (this.alt > 3 && this.hasRunway) {
          this.hasRunway = false;
          W.releaseRunway(this);
          W.stats.departures++;
          W.log('tookOff', { n: this.number, to: this.to });
        }
        if (x > 300) this.state = 'gone';
        break;
      }
    }
  }

  turnaround(dt) {
    const W = this.world;
    const s = this.stand;
    const { fuel, baggage, tug } = s.vehicles;
    const sv = this.svc;
    this.t += dt;

    if (!sv.bag && this.t > 2 && baggage.state === 'home') {
      sv.bag = 'out';
      W.bags?.trainLeaving(s, baggage); // bags sorted for this stand go onto the carts
      baggage.go(L.gse.baggageOut(s, baggage.homeX), () => {
        sv.bag = 'working';
        sv.bagUntil = Math.max(this.t + 12, TURN.board - 1);
        W.bags?.trainAtPlane(s, this, baggage);
      });
    }
    if (sv.bag === 'working' && this.t > sv.bagUntil) {
      sv.bag = 'done';
      W.bags?.trainLeftPlane(s);
      baggage.go(L.gse.baggageBack(s, baggage.homeX), () => {
        baggage.state = 'home';
        W.bags?.trainHome(s, baggage); // arrived bags head for the reclaim carousel
      });
    }
    if (!sv.fuel && this.t > 4 && fuel.state === 'home') {
      sv.fuel = 'out';
      fuel.go(L.gse.fuelOut(s, fuel.homeX), () => {
        sv.fuel = 'working';
        sv.fuelUntil = this.t + 14;
      });
    }
    if (sv.fuel === 'working' && this.t > sv.fuelUntil) {
      sv.fuel = 'done';
      fuel.go(L.gse.fuelBack(s, fuel.homeX), () => { fuel.state = 'home'; });
    }
    if (!sv.tug && this.t > 22 && tug.state === 'home') {
      sv.tug = 'out';
      tug.go(L.gse.tugOut(s, tug.homeX), () => { sv.tug = 'ready'; }, SOUTH);
    }
    // the bridge stays on while passengers are still walking to the aircraft (up to 15 s extra)
    const boarding = W.pax?.boardingPending(s) && this.t < TURN.bridgeOff + (W.pax.vipPending(s) ? 80 : 15);
    if (this.t > TURN.bridgeOff && !sv.bridgeOff && !boarding) {
      sv.bridgeOff = true;
      s.bridge.target = 0;
      W.crewBack(s);
    }
    // safety net: a tug that is "ready" but not at the nose gets sent back to its spot
    if (sv.tug === 'ready' && !tug.track && tug.obj.position.distanceTo(L.STAND_SPOTS.tug(s)) > 0.5) {
      sv.tug = 'out';
      tug.go([L.STAND_SPOTS.tug(s)], () => { sv.tug = 'ready'; }, SOUTH);
    }
    const servicesDone = sv.fuel === 'done' && sv.bag === 'done' && s.bridge.extend < 0.01 && !s.mechBusy;
    const tugReady = sv.tug === 'ready' && tug.endHeading === null && !tug.track;
    this.waiting = this.t >= TURN.ready && !(servicesDone && tugReady && W.pushbackClear(this));
    if (this.t >= TURN.ready && !this.waiting) {
      this.state = 'pushback';
      this.track = new Track(L.routes.pushback(s), 5);
      tug.attached = this;
      tug.state = 'busy';
      this.offBlock = W.clock;
      if (this.offBlock <= this.std + 5) W.stats.onTime++;
      W.stats.pushbacks++;
      W.log('pushback', { n: this.number });
    }
  }

  services() {
    const sv = this.svc, b = this.stand.bridge;
    const st = (x) => (x === 'working' ? 'on' : x === 'done' ? 'done' : x ? 'move' : 'wait');
    return [
      ['bridge', this.state === 'parked' ? (b.extend > 0.99 ? 'on' : sv.bridgeOff ? 'done' : 'move') : 'wait'],
      ['fuel', st(sv.fuel)],
      ['bags', st(sv.bag)],
      ['tug', sv.tug === 'ready' ? 'on' : sv.tug ? 'move' : 'wait'],
    ];
  }

  dispose() {
    this.world.scene.remove(this.root);
    this.root.traverse((o) => o.geometry?.dispose());
  }
}

// ---------- ground support vehicles ----------

let vehicleSeq = 0;

class Vehicle {
  constructor(world, model, kind, homeX) {
    this.world = world;
    this.id = ++vehicleSeq;
    this.kind = kind;
    this.ud = model.userData;
    this.homeX = homeX;
    if (kind === 'baggage') {
      const parts = [...model.children];
      for (const c of parts) world.scene.add(c);
      this.obj = parts[0];
      this.trailers = parts.slice(1);
    } else {
      world.scene.add(model);
      this.obj = model;
      this.trailers = [];
    }
    this.half = kind === 'fuel' ? 2.3 : kind === 'tug' ? 1.4 : 0.7;
    this.speed = kind === 'tug' ? 5 : 4.6;
    this.heading = NORTH;
    this.state = 'home';
    this.v = 0;
    this.track = null;
    this.endHeading = null;
    this.attached = null;
    this.obj.position.set(homeX, 0, L.DEPOT.homeZ);
    const f = fwd(this.heading);
    this.crumbs = [];
    for (let d = 10; d >= 0; d -= 0.2) this.crumbs.push({ x: homeX - f.x * d, z: L.DEPOT.homeZ - f.z * d });
    this.place();
  }

  go(points, onArrive, endHeading = null) {
    const start = v(this.obj.position.x, this.obj.position.z);
    this.track = new Track([start, ...points], 2.4);
    this.onArrive = onArrive;
    this.endHeading = endHeading;
    this.state = 'busy';
  }

  update(dt) {
    if (this.attached) return; // the aircraft drives us during pushback
    if (this.track) {
      let target = Math.min(this.speed, Math.sqrt(2 * 2.4 * this.track.remaining) + 0.25);
      if (this.world.vehicleBlocked(this)) target = 0;
      this.v = approach(this.v, target, (target > this.v ? 2.4 : 6) * dt);
      this.track.s = Math.min(this.track.len, this.track.s + this.v * dt);
      const { p, tan } = this.track.sample();
      this.obj.position.set(p.x, 0, p.z);
      this.heading = lerpAngle(this.heading, headingOf(tan.x, tan.z), 1 - Math.exp(-9 * dt));
      if (this.track.done) {
        this.track = null;
        this.v = 0;
        const cb = this.onArrive;
        this.onArrive = null;
        cb?.();
      }
    } else if (this.endHeading !== null) {
      this.heading = lerpAngle(this.heading, this.endHeading, 1 - Math.exp(-3.5 * dt));
      if (Math.abs(wrap(this.endHeading - this.heading)) < 0.01) {
        this.heading = this.endHeading;
        this.endHeading = null;
      }
    }
    this.place();
  }

  place() {
    this.obj.rotation.y = this.heading;
    this.ud.speed = this.v;
    if (!this.trailers.length) return;
    const p = this.obj.position;
    const last = this.crumbs.at(-1);
    if (Math.hypot(p.x - last.x, p.z - last.z) > 0.1) {
      this.crumbs.push({ x: p.x, z: p.z });
      if (this.crumbs.length > 300) this.crumbs.shift();
    }
    this.trailers.forEach((tr, i) => {
      const d = 1.75 + i * 1.65;
      const a = this.pointBack(d), b = this.pointBack(d - 0.6);
      tr.position.set(a.x, 0, a.z);
      tr.rotation.y = headingOf(b.x - a.x, b.z - a.z);
    });
  }

  // point `d` units back along the breadcrumb trail
  pointBack(d) {
    let px = this.obj.position.x, pz = this.obj.position.z, acc = 0;
    for (let i = this.crumbs.length - 1; i >= 0; i--) {
      const c = this.crumbs[i];
      const seg = Math.hypot(px - c.x, pz - c.z);
      if (seg > 1e-6 && acc + seg >= d) {
        const t = (d - acc) / seg;
        return { x: px + (c.x - px) * t, z: pz + (c.z - pz) * t };
      }
      acc += seg;
      px = c.x;
      pz = c.z;
    }
    return { x: px, z: pz };
  }

  bodies() { return [this.obj, ...this.trailers]; }
}

// ---------- people ----------

class Walker {
  constructor(world, person, x, z, heading = 0) {
    this.world = world;
    this.obj = person;
    this.ud = person.userData;
    this.heading = heading;
    this.track = null;
    this.endHeading = null;
    person.position.set(x, 0, z);
    person.rotation.y = heading;
    world.scene.add(person);
  }

  walk(points, onArrive, { speed = 1.2, endHeading = null } = {}) {
    const start = this.obj.position.clone();
    this.track = new Track([start, ...points], 0.8);
    this.onArrive = onArrive;
    this.speed = speed;
    this.endHeading = endHeading;
    this.ud.mode = 'walk';
    this.obj.visible = true;
  }

  // a list of steps, one after another: { to: [points], face? } walks there, { do: mode, dur, face? } works in place
  run(steps, onDone) {
    this.steps = steps.slice();
    this.stepsDone = onDone;
    this.nextStep();
  }

  nextStep() {
    const s = this.steps?.shift();
    if (!s) { const cb = this.stepsDone; this.steps = this.stepsDone = null; cb?.(); return; }
    if (s.to) this.walk(s.to, () => this.nextStep(), { speed: s.speed ?? 1.4, endHeading: s.face ?? null });
    else { this.ud.mode = s.do; this.hold = s.dur; if (s.face !== undefined) this.endHeading = s.face; }
  }

  update(dt) {
    if (this.hold != null && !this.track && (this.hold -= dt) <= 0) { this.hold = null; this.ud.mode = 'idle'; this.nextStep(); }
    if (this.track) {
      this.track.s = Math.min(this.track.len, this.track.s + this.speed * dt);
      const { p, tan } = this.track.sample();
      this.obj.position.copy(p);
      if (Math.abs(tan.x) + Math.abs(tan.z) > 1e-3) this.heading = lerpAngle(this.heading, headingOf(tan.x, tan.z), 1 - Math.exp(-10 * dt));
      if (this.track.done) {
        this.track = null;
        this.ud.mode = 'idle';
        const cb = this.onArrive;
        this.onArrive = null;
        cb?.();
      }
    } else if (this.endHeading !== null) {
      this.heading = lerpAngle(this.heading, this.endHeading, 1 - Math.exp(-4 * dt));
    }
    this.obj.rotation.y = this.heading;
  }
}

// ---------- landside traffic ----------

const CAR_COLORS = [P.PALETTE.sky, P.PALETTE.white, P.PALETTE.red, P.PALETTE.teal, P.PALETTE.navy, P.PALETTE.grey, P.PALETTE.orange, P.PALETTE.green];

class RoadUser {
  constructor(world, model, kind) {
    this.world = world;
    this.obj = model;
    this.ud = model.userData;
    this.kind = kind;
    this.half = kind === 'bus' ? 2.8 : 1.05;
    this.maxSpeed = kind === 'bus' ? 4.2 : 6;
    this.active = false;
    model.visible = false;
    world.scene.add(model);
  }

  // stopX: where to pull over (departures: by the check-in doors on the deck; arrivals:
  // wherever a passenger is waiting — given by the caller). null = drive straight through.
  start(route, stopX = route.name === 'departures' ? -57 + Math.random() * 22 : null) {
    this.route = route;
    this.s = 0;
    this.v = this.maxSpeed * 0.8;
    this.active = true;
    this.stopped = 0;
    this.obj.visible = true;
    this.stopX = stopX;
    route.users.push(this);
  }

  atStopStretch(p) {
    if (this.route.name === 'departures') return p.y > L.DECK.y - 0.1 && p.x < L.DECK.x1;
    if (this.route.name === 'arrivals') return p.z < L.CURB.z + 1 && p.x < 62;
    return false;
  }

  update(dt) {
    const r = this.route;
    let target = this.maxSpeed;
    const p = this.obj.position;
    const h = this.obj.rotation.y, fx = Math.cos(h), fz = -Math.sin(h);
    let gap = Infinity;
    for (const o of this.world.roadUsers()) { // anyone on any route right ahead of us
      if (o === this) continue;
      const q = o.obj.position;
      if (Math.abs(q.y - p.y) > 1) continue;
      const dx = q.x - p.x, dz = q.z - p.z;
      const along = dx * fx + dz * fz;
      if (along > 0 && Math.abs(dx * fz - dz * fx) < 1.3) gap = Math.min(gap, along - o.half - this.half);
    }
    if (gap < 1.4) target = 0;
    else target = Math.min(target, (gap - 1.4) * 1.6);

    if (this.stopX !== null && this.atStopStretch(p)) {
      const d = p.x - this.stopX;
      target = Math.min(target, Math.sqrt(2 * 3 * Math.max(0, d)));
      if (d < 0.2 && this.v < 0.3) {
        this.stopped += dt;
        if (this.stopped > 0.3 && !this.dropped) {
          this.dropped = true;
          const n = this.kind === 'bus' ? 3 : 1 + (Math.random() < 0.35 ? 1 : 0);
          if (r.name === 'departures') for (let i = 0; i < n; i++) this.world.dropOff(p.x + (i - (n - 1) / 2) * 0.9);
          else if (this.world.pax) this.world.pax.vehicleArrived(this.kind, p.x); // the waiting passengers get in
          else this.world.pickUp(p.x);
        }
        if (this.stopped > (this.kind === 'bus' ? 5 : 2.6)) this.stopX = null;
      }
    }
    this.v = approach(this.v, target, (target > this.v ? 2.5 : 7) * dt);
    this.s += this.v * dt;
    const t = Math.min(1, this.s / r.len);
    const pt = r.path.getPoint(t), tan = r.path.getTangent(t);
    p.set(pt.x, pt.y, pt.z);
    this.obj.rotation.y = headingOf(tan.x, tan.z);
    this.ud.speed = this.v;
    const edge = Math.min(this.s, r.len - this.s);
    this.obj.scale.setScalar(THREE.MathUtils.clamp(edge / 2.5, 0.001, 1)); // grow in / shrink out at the slab edge
    if (this.s >= r.len) {
      this.active = false;
      this.dropped = false;
      this.obj.visible = false;
      r.users.splice(r.users.indexOf(this), 1);
    }
  }
}

// ---------- world ----------

export class World {
  constructor(scene, scenery) {
    this.scene = scene;
    this.time = 0;
    this.clock = 14 * 60 + 5;
    this.flights = [];
    this.vehicles = [];
    this.walkers = [];
    this.events = [];
    this.stats = { arrivals: 0, departures: 0, onTime: 0, pushbacks: 0 };
    this.runwayOwner = null;
    this.spawnTimer = 14;
    this.returns = []; // flights out and due back: { due, opts }
    this.onFlightAdded = () => {};
    this.onFlightRemoved = () => {};

    this.stands = L.STANDS.map((s, i) => {
      const stand = { ...s, index: i, flight: null, bridge: scenery.bridges[i] };
      stand.vehicles = {
        fuel: this.addVehicle(P.fuelTruck(), 'fuel', L.DEPOT.slots.fuel[i]),
        baggage: this.addVehicle(P.baggageTrain({ bags: false }), 'baggage', L.DEPOT.slots.baggage[i]),
        tug: this.addVehicle(P.pushbackTug(), 'tug', L.DEPOT.slots.tug[i]),
      };
      const m = L.STAND_SPOTS.marshaller(stand);
      stand.marshaller = this.addWalker(P.person('marshaller'), m.x, m.z, SOUTH);
      const door = L.STAND_SPOTS.crewDoor(stand);
      stand.crew = [P.person('crew'), P.person('crew')].map((pp) => {
        const w = this.addWalker(pp, door.x, door.z, SOUTH);
        pp.visible = false;
        return w;
      });
      const md = L.STAND_SPOTS.mechDoor(stand);
      stand.mech = this.addWalker(P.person('lineMech'), md.x, md.z, SOUTH);
      stand.mech.obj.visible = false;
      return stand;
    });

    this.setupLandside();

    // Open on a busy afternoon: one turnaround well under way, one just started,
    // a departure taxiing out and an arrival on final.
    this.spawnParked(this.stands[0], 13);
    this.spawnParked(this.stands[2], 1.5);
    this.spawnParked(this.stands[4], 24);
    this.spawnDeparture(this.stands[1]);
    this.spawnArrival(this.stands[3], L.TOUCHDOWN_X - 110);
  }

  addVehicle(model, kind, homeX) {
    const veh = new Vehicle(this, model, kind, homeX);
    this.vehicles.push(veh);
    return veh;
  }

  addWalker(person, x, z, heading) {
    const w = new Walker(this, person, x, z, heading);
    w.ud.phase = Math.random() * 10;
    this.walkers.push(w);
    return w;
  }

  addFlight(stand, opts) {
    const f = new Flight(this, stand, opts);
    this.flights.push(f);
    this.onFlightAdded(f);
    return f;
  }

  spawnArrival(stand, x = L.TOUCHDOWN_X - 140, opts = {}) {
    const f = this.addFlight(stand, opts);
    stand.flight = f;
    this.runwayOwner = f;
    f.alt = (L.TOUCHDOWN_X - x) * 0.19;
    f.pose(x, L.RUNWAY.z, 0);
    return f;
  }

  spawnParked(stand, t) {
    const f = this.addFlight(stand);
    stand.flight = f;
    f.pose(stand.x, L.PARK_Z, NORTH);
    f.state = 'parked';
    f.t = t;
    f.arrivedAt = this.clock - t;
    f.std = f.arrivedAt + 42;
    stand.bridge.target = stand.bridge.extend = 1;
    stand.bridge.layout();
    this.crewOut(stand, true);
  }

  spawnDeparture(stand) {
    const f = this.addFlight(stand);
    f.state = 'engineStart';
    f.t = 1;
    f.pose(stand.x + 10, L.TAXI.z, Math.PI);
    f.std = f.offBlock = this.clock;
  }

  // ----- crew -----

  crewOut(stand, instant = false) {
    if (!instant) this.walkaround(stand);
    const spots = [L.STAND_SPOTS.crewNose(stand), L.STAND_SPOTS.crewHold(stand)];
    stand.crew.forEach((w, i) => {
      const spot = spots[i];
      if (instant) {
        w.obj.visible = true;
        w.obj.position.copy(spot);
        w.heading = NORTH;
        w.ud.mode = 'idle';
      } else {
        w.walk([v(spot.x, L.LANE.east - 1.6), spot], null, { speed: 1.3, endHeading: i ? Math.PI : NORTH });
      }
    });
  }

  // the line mechanic's walk-round (DESIGN.md §12.2): west engine, west main gear, the tail, then back in.
  // The aircraft stays on blocks until he is clear (Flight.turnaround checks stand.mechBusy).
  walkaround(stand) {
    const x = stand.x, z = L.PARK_Z, side = x - 5.5, door = L.STAND_SPOTS.mechDoor(stand), EAST = 0;
    const m = stand.mech;
    stand.mechBusy = true;
    m.obj.position.copy(door);
    m.run([
      { to: [v(side, L.LANE.east - 1.6), v(side, z + 3), v(x - 2.35, z + 3)], face: SOUTH }, { do: 'inspect', dur: 2.5 }, // the intake
      { to: [v(x - 1.95, z - 0.4)], face: EAST }, { do: 'kneel', dur: 3 }, // the main wheels
      { to: [v(x - 1.4, z - 7.9)], face: NORTH }, { do: 'look', dur: 2 }, // up at the tail
      { to: [v(side, z - 7.9), v(side, L.LANE.east - 1.6), door] },
    ], () => { m.obj.visible = false; stand.mechBusy = false; });
  }

  crewBack(stand) {
    const door = L.STAND_SPOTS.crewDoor(stand);
    for (const w of stand.crew) {
      w.walk([v(door.x, L.LANE.east - 1.6), door], () => { w.obj.visible = false; }, { speed: 1.3 });
    }
  }

  // ----- landside -----

  setupLandside() {
    const mk = (name, points) => {
      const path = L.roundedPath(points, 4);
      return { name, path, len: path.getLength(), users: [], timer: Math.random() * 2 };
    };
    this.roads = [mk('departures', L.roadRoutes.departures), mk('arrivals', L.roadRoutes.arrivals), mk('eastbound', L.roadRoutes.eastbound)];
    this.roadPool = [];
    for (let i = 0; i < 22; i++) this.roadPool.push(new RoadUser(this, P.car({ color: CAR_COLORS[i % CAR_COLORS.length] }), 'car'));
    for (let i = 0; i < 2; i++) this.roadPool.push(new RoadUser(this, P.apronBus({ accent: P.PALETTE.teal }), 'bus'));
    for (let i = 0; i < 4; i++) this.roadPool.push(new RoadUser(this, P.car({ color: P.PALETTE.yellow, taxi: true }), 'taxi'));
    this.pickups = []; // passengers waiting at the arrivals curb (pax.js tickets)
    this.busTimer = 0;
    // pre-populate the roads so the first frame already has traffic
    for (const r of this.roads) {
      for (let k = 0; k < 3; k++) {
        const u = this.roadPool.find((x) => !x.active && x.kind === 'car');
        u.start(r);
        u.s = r.len * (0.15 + k * 0.28);
        u.stopX = null;
      }
    }

    this.pedPool = [];
    this.peds = [];
    for (let i = 0; i < 6; i++) { // people waiting at the 1F pick-up curb
      const w = this.addWalker(P.person(pick(P.PASSENGER_TYPES)), 18 + Math.random() * 40, (L.CURB.sidewalk[0] + L.CURB.sidewalk[1]) / 2 - 0.4, NORTH);
      w.ud.mode = 'idle';
    }
    this.strollTimer = 1;
  }

  roadUsers() {
    return this.roadPool.filter((u) => u.active);
  }

  getPed() {
    const type = pick(P.PASSENGER_TYPES);
    let w = this.pedPool.find((p) => !p.obj.visible && p.type === type);
    if (!w) {
      w = this.addWalker(P.person(type), 0, 0, 0);
      w.type = type;
      this.pedPool.push(w);
    }
    w.obj.visible = true;
    return w;
  }

  // departures: out of the car on the elevated deck, into the 2F check-in hall
  dropOff(x) {
    if (this.pax) return this.pax.spawnDeparture(x);
    const w = this.getPed();
    const y = L.DECK.y;
    w.obj.position.set(x, y, L.DECK.z0 + 1.4);
    w.heading = SOUTH;
    const door = L.DOORS.f2.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
    w.walk([v(x, L.DECK.z0 + 0.6, y), v(door, L.DECK.z0 + 0.6, y), v(door, L.TERMINAL.z1 - 0.6, y)], () => { w.obj.visible = false; }, { speed: 1.1 });
  }

  // arrivals: someone comes out of the 1F lobby and gets into the waiting car
  pickUp(x) {
    const w = this.getPed();
    const door = L.DOORS.f1.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
    w.obj.position.set(door, 0, L.TERMINAL.z1 + 0.3);
    w.heading = NORTH;
    w.walk([v(door, L.CURB.sidewalk[0] - 0.4), v(x, L.CURB.sidewalk[0] - 0.4), v(x, L.CURB.lane[0] + 0.1)], () => { w.obj.visible = false; }, { speed: 1.3 });
  }

  // people leaving the lobby for the bus stop / taxi rank further along the curb
  stroll() {
    const w = this.getPed();
    const a = pick(L.DOORS.f1);
    w.obj.position.set(a, 0, L.TERMINAL.z1 + 0.3);
    const to = 20 + Math.random() * 36;
    w.walk([v(a, L.CURB.sidewalk[0] - 0.5), v(to, L.CURB.sidewalk[0] - 0.5), v(to + 0.5, L.CURB.sidewalk[0] + 0.4)], () => { w.obj.visible = false; }, { speed: 1.0 + Math.random() * 0.3 });
  }

  updateRoads(dt) {
    this.busTimer -= dt;
    for (const r of this.roads) {
      r.timer -= dt;
      const entryClear = !r.users.some((u) => u.s < 6);
      if (r.timer <= 0 && entryClear) {
        let kind = 'car', stopX;
        if (r.name === 'arrivals') { // send what the waiting passengers need
          const open = this.pickups.filter((t) => t.open && !t.sent);
          const car = open.find((t) => t.kind === 'car');
          const taxi = open.find((t) => t.kind === 'taxi');
          const bus = open.some((t) => t.kind === 'bus') && this.busTimer <= 0;
          if (car) { car.sent = true; stopX = car.x; }
          else if (taxi && this.roadPool.some((x) => !x.active && x.kind === 'taxi')) { taxi.sent = true; kind = 'taxi'; stopX = taxi.x; }
          else if (bus) { kind = 'bus'; stopX = L.BUS_X; this.busTimer = 18; for (const t of open) if (t.kind === 'bus') t.sent = true; }
        }
        const u = this.roadPool.find((x) => !x.active && x.kind === kind) ?? this.roadPool.find((x) => !x.active && x.kind === 'car');
        if (u) u.start(r, r.name === 'departures' ? undefined : stopX ?? null);
        r.timer = (r.name === 'arrivals' ? 1.5 : 2.2) + Math.random() * 3;
      }
      for (const u of [...r.users]) u.update(dt);
    }
    // tickets whose vehicle drove past without them (e.g. someone else got in) go back in the queue
    for (const t of this.pickups) if (t.sent && !t.board && !this.roadUsers().some((u) => Math.abs((u.stopX ?? -999) - t.x) < 2.5)) t.sent = false;
    this.strollTimer -= dt;
    if (this.strollTimer <= 0) {
      this.stroll();
      this.strollTimer = 3 + Math.random() * 4;
    }
  }

  // ----- traffic rules -----

  requestRunway(f) {
    if (this.runwayOwner && this.runwayOwner !== f) return false;
    this.runwayOwner = f;
    return true;
  }

  releaseRunway(f) {
    if (this.runwayOwner === f) this.runwayOwner = null;
  }

  // anything on the ground in front of an aircraft (direction of travel)
  planeBlocked(me) {
    const p = me.root.position;
    const f = fwd(me.heading);
    const ahead = (q, range, latMax) => {
      const dx = q.x - p.x, dz = q.z - p.z;
      const along = dx * f.x + dz * f.z;
      return along > 0 && along < range && Math.abs(dx * f.z - dz * f.x) < latMax;
    };
    for (const o of this.flights) if (o !== me && o.onGround && ahead(o.root.position, 18, 7)) return true;
    for (const veh of this.vehicles) if (!veh.attached && ahead(veh.obj.position, 11, 5)) return true;
    return false;
  }

  vehicleBlocked(me) {
    const sees = (a, b) => { // does vehicle a have vehicle b right in front?
      const p = a.obj.position, f = fwd(a.heading);
      return b.bodies().some((o) => {
        const dx = o.position.x - p.x, dz = o.position.z - p.z;
        const along = dx * f.x + dz * f.z;
        return along > 0 && along < a.half + 2.6 && Math.abs(dx * f.z - dz * f.x) < 1.5;
      });
    };
    for (const o of this.vehicles) {
      if (o === me || !sees(me, o)) continue;
      if (o.track && sees(o, me) && me.id < o.id) continue; // mutual stand-off: lower id goes first
      return true;
    }
    return false;
  }

  pushbackClear(me) {
    const sx = me.stand.x;
    return !this.flights.some((o) => {
      if (o === me || !['taxiIn', 'pushback', 'engineStart', 'taxiOut'].includes(o.state)) return false;
      const p = o.root.position;
      return p.z < -12 && p.x > sx - 9 && p.x < sx + 30;
    });
  }

  trySpawnArrival() {
    if (this.runwayOwner || this.flights.some((f) => f.state === 'approach')) return false;
    const free = this.stands.filter((s) => !s.flight);
    if (!free.length) return false;
    const due = this.returns.find((r) => r.due <= this.time); // a return flight takes the next slot
    if (due) this.returns.splice(this.returns.indexOf(due), 1);
    this.spawnArrival(pick(free), undefined, due?.opts);
    return true;
  }

  // events are stored as a key + params; the page words them in the current language
  log(key, params) {
    this.events.unshift({ time: fmtClock(this.clock), clock: this.clock, key, params });
    this.events.length = Math.min(this.events.length, 7);
  }

  update(dt) {
    this.time += dt;
    this.clock += dt;
    this.spawnTimer -= dt;
    // quieter in the small hours: fewer arrivals between midnight and 5am
    const h = (this.clock / 60) % 24;
    if (this.spawnTimer <= 0) this.spawnTimer = this.trySpawnArrival() ? (9 + Math.random() * 8) * (h < 5 ? 3 : 1) : 1;

    for (const f of this.flights) f.update(dt);
    for (const f of this.flights.filter((x) => x.state === 'gone')) {
      // every departure comes back later as the next-numbered flight, same aircraft
      const n = Number(f.number.replace(/\D/g, ''));
      this.returns.push({
        due: this.time + 150 + Math.random() * 60 + (f.storyReturn === 'kenji' ? 90 : 0), // Kenji's flight home runs late
        opts: { number: `MA ${n % 2 ? n + 1 : n - 1}`, from: f.to, to: f.from, liveryKey: f.liveryKey, returnStory: f.storyReturn ?? null },
      });
      this.flights.splice(this.flights.indexOf(f), 1);
      this.onFlightRemoved(f);
      f.dispose();
    }
    for (const veh of this.vehicles) veh.update(dt);
    for (const w of this.walkers) w.update(dt);
    for (const s of this.stands) {
      const f = s.flight;
      s.marshaller.ud.mode = f && f.state === 'taxiIn' && f.track.remaining < 30 ? 'signal' : 'idle';
    }
    this.updateRoads(dt);

    const t = this.time;
    for (const f of this.flights) f.model.userData.update(t, dt);
    for (const veh of this.vehicles) veh.ud.update(t, dt);
    for (const w of this.walkers) if (w.obj.visible) w.ud.update(t);
    for (const r of this.roads) for (const u of r.users) u.ud.update(t, dt);
  }
}

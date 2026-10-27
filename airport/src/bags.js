// Checked baggage, tracked bag by bag.
//
// Outbound: desk scale → collector belt (2F) → down to the sorting hall (1F) → sorter →
//   the make-up chute for its stand → loaded onto that stand's baggage train when it
//   leaves for the aircraft → into the hold (counted on the flight).
// Inbound: in the hold → unloaded onto the train at the aircraft → when the train is back,
//   fed onto the reclaim carousel → circulates until its owner lifts it off.
import * as THREE from 'three';
import { luggage, BAG_COLORS } from './interior.js';
import { compactRig } from './merge.js';
import * as L from './layout.js';

const KINDS = ['hard', 'hard', 'soft', 'box'];
const CART_SLOTS = 12;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const pathOf = (pts) => {
  const p = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) p.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  return p;
};

function cartSlot(k) { // local position on a baggage cart: 3 × 2, two layers
  return new THREE.Vector3(-0.42 + (k % 3) * 0.42, 0.4 + Math.floor(k / 6) * 0.27, Math.floor(k / 3) % 2 ? -0.2 : 0.2);
}

export class BagSystem {
  constructor(scene, world, terminal) {
    this.scene = scene;
    this.world = world;
    this.terminal = terminal;
    this.rooms = terminal.rooms;
    this.bags = new Set();
    this.beds = { A: [], B: [] }; // bags waiting in each make-up chute
    this.jobs = new Map(); // stand → loading/unloading at the aircraft
    this.feedQueue = [];
    this.stats = { checkedIn: 0, loaded: 0, unloaded: 0, onBelt: 0, claimed: 0 };
    world.bags = this;
  }

  make(kind, color) {
    const mesh = compactRig(luggage(kind, color, { lying: kind === 'hard' }));
    mesh.userData.dynamic = true;
    this.scene.add(mesh);
    const bag = { mesh, kind, color, state: 'new', t: 0 };
    this.bags.add(bag);
    return bag;
  }

  remove(bag) {
    bag.mesh.removeFromParent();
    bag.mesh.traverse((o) => o.geometry?.dispose());
    this.bags.delete(bag);
  }

  follow(bag, path, speed, state, onEnd) {
    bag.path = path;
    bag.len = path.getLength();
    bag.s = 0;
    bag.speed = speed;
    bag.state = state;
    bag.onEnd = onEnd;
    bag.mesh.visible = true;
  }

  hop(bag, to, onEnd, { time = 0.6, arc = 0.6 } = {}) {
    const from = new THREE.Vector3();
    bag.mesh.getWorldPosition(from);
    this.scene.attach(bag.mesh);
    bag.state = 'hop';
    bag.from = from;
    bag.to = to.clone();
    bag.t = 0;
    bag.time = time;
    bag.arc = arc;
    bag.onEnd = onEnd;
    bag.mesh.visible = true;
  }

  // ---------- outbound ----------

  checkIn(hall, desk, stand, color) {
    const ci = this.rooms.checkIn[hall], a = ci.userData.anchors;
    const scale = a.scales[desk].clone().add(ci.position);
    const by = ci.position.y + a.belt.y, bz = ci.position.z + a.belt.z;
    const bag = this.make(color === undefined ? pick(KINDS) : 'hard', color ?? pick(BAG_COLORS));
    bag.stand = stand;
    bag.mesh.rotation.y = Math.PI / 2;
    this.stats.checkedIn++;
    const path = pathOf([
      scale.clone().setY(scale.y + 0.02),
      new THREE.Vector3(scale.x, by, scale.z - 0.6),
      new THREE.Vector3(scale.x, by, bz),
      new THREE.Vector3(ci.position.x + a.belt.west, by, bz),
    ]);
    bag.state = 'scale';
    bag.mesh.position.copy(scale);
    bag.t = 0;
    bag.next = () => this.follow(bag, path, 0.6, 'belt2F', () => this.dropToSorting(bag));
  }

  dropToSorting(bag) {
    bag.mesh.visible = false; // through the floor
    bag.state = 'drop';
    bag.t = 0;
  }

  intoSorting(bag) {
    const s = this.rooms.sorting, a = s.userData.anchors;
    const bed = this.world.stands.indexOf(bag.stand) % 2 ? 'B' : 'A';
    const local = bed === 'A' ? a.pathA : a.pathB;
    const pts = local.curves.flatMap((c, i) => (i ? [c.v2] : [c.v1, c.v2])).map((p) => p.clone().add(s.position));
    this.follow(bag, pathOf(pts), 0.7, 'sorting', () => {
      bag.state = 'chute';
      this.beds[bed].push(bag);
      this.packBed(bed);
    });
    bag.bed = bed;
  }

  packBed(bed) {
    const s = this.rooms.sorting, a = s.userData.anchors;
    const base = (bed === 'A' ? a.bedA : a.bedB).clone().add(s.position);
    this.beds[bed].forEach((b, i) => {
      b.mesh.position.set(base.x - 0.5 + (i % 3) * 0.5, base.y + 0.1 + Math.floor(i / 9) * 0.25, base.z - 0.6 + (Math.floor(i / 3) % 3) * 0.55);
    });
  }

  // the stand's baggage train is leaving the depot for the aircraft: load its chute bags
  trainLeaving(stand, train) {
    const bed = this.world.stands.indexOf(stand) % 2 ? 'B' : 'A';
    const mine = this.beds[bed].filter((b) => b.stand === stand).slice(0, CART_SLOTS * train.trailers.length);
    this.beds[bed] = this.beds[bed].filter((b) => !mine.includes(b));
    this.packBed(bed);
    train.cartLoad = train.cartLoad ?? [];
    for (const b of mine) this.putOnCart(b, train);
  }

  putOnCart(bag, train) {
    const k = train.cartLoad.length;
    const cart = train.trailers[Math.floor(k / CART_SLOTS) % train.trailers.length];
    cart.add(bag.mesh);
    bag.mesh.position.copy(cartSlot(k % CART_SLOTS));
    bag.mesh.rotation.set(0, Math.PI / 2, 0);
    bag.mesh.visible = true;
    bag.state = 'cart';
    train.cartLoad.push(bag);
  }

  slotWorld(train, k) {
    const cart = train.trailers[Math.floor(k / CART_SLOTS) % train.trailers.length];
    return cart.localToWorld(cartSlot(k % CART_SLOTS));
  }

  // ---------- at the aircraft ----------

  holdDoor(stand) { return new THREE.Vector3(stand.x + 0.95, 1.15, L.PARK_Z - 3.5); }

  trainAtPlane(stand, flight, train) {
    train.cartLoad = train.cartLoad ?? [];
    this.jobs.set(stand, { flight, train, timer: 0.8 });
  }

  trainLeftPlane(stand) { this.jobs.delete(stand); }

  stepJob(stand, job, dt) {
    job.timer -= dt;
    if (job.timer > 0) return;
    job.timer = 0.55;
    const { train, flight } = job;
    const out = train.cartLoad.find((b) => !b.inbound);
    if (out) { // load outbound bags first, then the cart has room for the inbound ones
      train.cartLoad.splice(train.cartLoad.indexOf(out), 1);
      this.hop(out, this.holdDoor(stand), () => {
        this.remove(out);
        flight.bagsLoaded = (flight.bagsLoaded ?? 0) + 1;
        this.stats.loaded++;
      });
      return;
    }
    const inb = (flight.inboundBags ?? []).find((b) => b.state === 'hold');
    if (inb && train.cartLoad.length < CART_SLOTS * train.trailers.length) {
      inb.mesh.position.copy(this.holdDoor(stand));
      const k = train.cartLoad.length;
      train.cartLoad.push(inb);
      inb.inbound = true;
      inb.state = 'unloading';
      this.hop(inb, this.slotWorld(train, k), () => {
        const cart = train.trailers[Math.floor(k / CART_SLOTS) % train.trailers.length];
        cart.attach(inb.mesh);
        inb.mesh.position.copy(cartSlot(k % CART_SLOTS));
        inb.state = 'cart';
        flight.bagsUnloaded = (flight.bagsUnloaded ?? 0) + 1;
        this.stats.unloaded++;
      });
    }
  }

  // ---------- inbound ----------

  inbound(flight) { // a bag in the hold of an arriving aircraft
    const bag = this.make(pick(KINDS), pick(BAG_COLORS));
    bag.state = 'hold';
    bag.mesh.visible = false;
    (flight.inboundBags ??= []).push(bag);
    return bag;
  }

  // the train is back at the depot: inbound bags go to the reclaim carousel
  trainHome(stand, train) {
    for (const b of (train.cartLoad ?? []).filter((x) => x.inbound)) {
      b.mesh.visible = false;
      this.scene.attach(b.mesh);
      b.state = 'toClaim';
      this.feedQueue.push(b);
    }
    train.cartLoad = (train.cartLoad ?? []).filter((x) => !x.inbound);
  }

  carouselInfo() {
    const claim = this.rooms.claim, c = claim.userData.anchors.carousel;
    const origin = c.position.clone().add(claim.position);
    const loop = c.userData.loop;
    return { origin, loop, len: loop.getLength(), speed: c.userData.speed };
  }

  feed(bag) {
    const { origin, loop } = this.carouselInfo();
    const start = loop.getPointAt(0.12).add(origin); // where the feed chute meets the far straight
    const top = new THREE.Vector3(origin.x + 0.0, origin.y + 1.4, origin.z - 2.7);
    bag.mesh.position.copy(top);
    this.hop(bag, start.setY(origin.y + 0.39), () => { bag.state = 'belt'; bag.u = 0.12; this.stats.onBelt++; bag.beltTime = 0; }, { time: 1.1, arc: 0.1 });
  }

  beltPos(bag) {
    const { origin, loop } = this.carouselInfo();
    return loop.getPointAt(bag.u).add(origin);
  }

  claim(bag) {
    this.stats.claimed++;
    this.stats.onBelt--;
    this.remove(bag);
  }

  // ---------- frame ----------

  update(t, dt) {
    if (this.rooms.sorting.userData.anchors) this.rooms.sorting.userData.anchors.arm.userData.push = 0;
    const s = this.rooms.sorting, sa = s.userData.anchors;
    this.feedTimer = (this.feedTimer ?? 0) - dt;
    if (this.feedTimer <= 0 && this.feedQueue.length) {
      this.feedTimer = 1.4;
      this.feed(this.feedQueue.shift());
    }
    for (const [stand, job] of this.jobs) this.stepJob(stand, job, dt);
    const car = this.carouselInfo();
    for (const bag of [...this.bags]) {
      const m = bag.mesh;
      switch (bag.state) {
        case 'scale':
          m.visible = this.terminal.mode === 'f2';
          bag.t += dt;
          if (bag.t > 1.2) bag.next();
          break;
        case 'belt2F':
        case 'sorting': {
          // like the passengers: only show what the current cutaway shows
          const mode = this.terminal.mode;
          m.visible = mode === 'f2' || (mode === 'f1' && bag.state === 'sorting');
          bag.s += bag.speed * dt;
          const u = Math.min(1, bag.s / bag.len);
          m.position.copy(bag.path.getPointAt(u));
          if (bag.state === 'sorting' && bag.bed === 'A' && Math.abs(m.position.x - (s.position.x + sa.armX)) < 0.5 && m.position.z < s.position.z - 3.2) sa.arm.userData.push = 1;
          if (u >= 1) bag.onEnd();
          break;
        }
        case 'drop':
          bag.t += dt;
          if (bag.t > 2.5) this.intoSorting(bag);
          break;
        case 'hop': {
          bag.t += dt / bag.time;
          const k = Math.min(1, bag.t);
          m.position.lerpVectors(bag.from, bag.to, k);
          m.position.y += Math.sin(k * Math.PI) * bag.arc;
          if (k >= 1) bag.onEnd();
          break;
        }
        case 'belt': {
          bag.u = (bag.u + (car.speed * dt) / car.len) % 1;
          bag.beltTime += dt;
          const p = car.loop.getPointAt(bag.u).add(car.origin);
          const tan = car.loop.getTangentAt(bag.u);
          m.position.set(p.x, car.origin.y + 0.39, p.z);
          m.visible = this.terminal.mode !== 'exterior';
          m.rotation.y = Math.atan2(-tan.z, tan.x);
          if (bag.beltTime > 240) { this.stats.onBelt--; this.remove(bag); } // nobody came: off to lost & found
          break;
        }
      }
    }
  }

  get inTransit() {
    let n = 0;
    for (const b of this.bags) if (b.state !== 'hold') n++;
    return n;
  }
}

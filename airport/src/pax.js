// Passengers that belong to flights and walk the whole terminal.
//
// Departures: dropped off on the 2F deck → check-in (bag goes) → security → a lounge →
//   the concourse to their gate → wait for boarding → bridge → aboard (counted on the flight).
// Arrivals: off the aircraft through the bridge → 2F arrivals corridor → escalator →
//   1F → baggage claim (wait, lift the bag) → out to the pick-up curb. A few never see
//   their bag and go to the baggage service desk first.
import * as THREE from 'three';
import * as P from './parts.js';
import { routine } from './interior.js';
import { TURN } from './sim.js';
import * as L from './layout.js';

const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const F2 = L.FLOOR.f2 + 0.02; // 2F walking height (rooms sit 0.02 above the slab)
const F1 = L.FLOOR.f1 + 0.04;
const LOOK = { px: 0, nx: Math.PI, pz: -Math.PI / 2, nz: Math.PI / 2 };

export class PaxSystem {
  constructor(scene, world, terminal) {
    this.scene = scene;
    this.world = world;
    this.terminal = terminal;
    this.rooms = terminal.rooms;
    this.crowd = [];
    this.actors = new Set();
    this.pool = new Map();
    this.claims = new Map(); // check-in desk / belt-spot occupancy
    this.stats = { departing: 0, arriving: 0, boarded: 0, deplaned: 0 };
    this.deboardTimer = 0;
    world.pax = this;
  }

  // world-space copy of a kit anchor
  at(kit, p) { return p.clone().add(kit.position); }

  person(type) {
    const list = this.pool.get(type) ?? [];
    const p = list.pop() ?? P.person(type);
    p.visible = true;
    p.userData.phase = Math.random() * 10;
    return p;
  }

  release(a, type) {
    a.p.visible = false;
    a.p.removeFromParent();
    if (!this.pool.has(type)) this.pool.set(type, []);
    this.pool.get(type).push(a.p);
    this.crowd.splice(this.crowd.indexOf(a), 1);
    this.actors.delete(a);
  }

  run(type, steps, onDone, init, speed = 1.15) {
    const a = routine(this.scene, type, steps, {
      crowd: this.crowd, loop: false, speed: speed ?? 1.15, person: this.person(type), init,
      onDone: (x) => { onDone?.(x); this.release(x, type); },
    });
    this.actors.add(a);
    return a;
  }

  claim(key, n) { // least-used slot among n for `key`
    const c = this.claims.get(key) ?? new Array(n).fill(0);
    this.claims.set(key, c);
    let best = 0;
    for (let i = 1; i < n; i++) if (c[i] < c[best]) best = i;
    c[best]++;
    return best;
  }
  unclaim(key, i) { const c = this.claims.get(key); if (c) c[i] = Math.max(0, c[i] - 1); }

  // ---------- departures ----------

  // boarding runs from the end of deboarding until the bridge starts to pull back
  boardingOpen(stand) {
    const f = stand.flight;
    return !!f && f.state === 'parked' && f.t > TURN.deboard + 2 && stand.bridge.target === 1 && stand.bridge.extend > 0.99;
  }

  // someone has left their seat for this gate's aircraft and isn't aboard yet
  // (or a VIP — a story passenger running late — is still on the way)
  boardingPending(stand) {
    for (const a of this.actors) if (a.stand === stand && (a.stage === 'boarding' || (a.vip && a.stage !== 'aboard'))) return true;
    return false;
  }
  vipPending(stand) {
    for (const a of this.actors) if (a.stand === stand && a.vip && a.stage !== 'aboard') return true;
    return false;
  }

  // options: type, stand, speed, priority (skips the queues and the lounge — a late passenger),
  // xrayHold (extra seconds at the X-ray), choice { lane, gate, second, seat, gx } to keep a
  // group together, init(actor) to attach story listeners
  spawnDeparture(x, opt = {}) {
    const ch = opt.choice ?? {};
    if (!opt.story && (this.stats.departing > 60 || Math.random() > 0.7)) return null;
    const R = this.rooms;
    const type = opt.type ?? pick(P.PASSENGER_TYPES);
    const stand = opt.stand ?? pick(this.world.stands);
    const gi = this.world.stands.indexOf(stand);
    const gate = R.gates[gi];
    const ga = gate.userData.anchors;
    const hall = Math.abs(R.checkIn[0].position.x - x) < Math.abs(R.checkIn[1].position.x - x) ? 0 : 1;
    const ci = R.checkIn[hall];
    const ca = ci.userData.anchors;
    const entry = ca.entries.map((e) => this.at(ci, e)).reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
    const y = F2;
    const lift = (p) => p.clone().setY(y);
    const deck = L.DECK;
    const steps = [];
    const go = (p, extra = {}) => steps.push({ to: lift(p), ...extra });
    const fast = !!opt.priority;

    // deck → check-in hall → queue → desk (the bag is checked in) → out east
    go(V(x, deck.z0 + 1.4), { bag: true, act: 'arrive' });
    go(V(x, deck.z0 + 0.5));
    go(V(entry.x, deck.z0 + 0.5));
    go(entry, { act: 'checkin' });
    go(this.at(ci, ca.toQueue));
    if (!fast) for (const q of ca.queue) go(this.at(ci, q));
    const deskKey = `desk${hall}`;
    steps.push({ to: (a) => { a.desk = this.claim(deskKey, ca.desks.length); return lift(this.at(ci, ca.desks[a.desk]).add(V(0, 0.9))); } });
    // at the desk: the suitcase goes on the scale and becomes a tracked bag for this stand
    steps.push({ to: (a) => lift(this.at(ci, ca.desks[a.desk])), wait: fast ? 3 : 6, look: LOOK.nz, bag: false, act: 'desk',
      then: (a) => this.world.bags?.checkIn(hall, a.desk, stand, type === 'passenger' ? P.PALETTE.orange : undefined) });
    steps.push({ to: (a) => lift(this.at(ci, ca.desks[a.desk]).add(V(0.6, 0.5))), then: (a) => this.unclaim(deskKey, a.desk) });
    for (const p of ca.toExit) go(this.at(ci, p));
    go(this.at(ci, ca.exitE));
    if (hall === 0) { // walk through the second hall
      // (the two halls share a wall: one hall's exit is already inside the next, so no entry step)
      const cb = R.checkIn[1], cba = cb.userData.anchors;
      for (const p of cba.through) go(this.at(cb, p));
      go(this.at(cb, cba.exitE));
    }
    // security: same lane script as the room kit, in world space
    const sec = R.security, sa = sec.userData.anchors;
    go(this.at(sec, sa.entryW), { act: 'security' });
    let lane = sa.steps(ch.lane ?? Math.floor(Math.random() * sa.lanes), ch.gate ?? Math.floor(Math.random() * sa.gates), !opt.story && Math.random() < 0.25);
    if (fast) lane = lane.slice(sa.queueLen); // priority lane: no queue
    for (const st of lane) {
      const s2 = { ...st, to: lift(this.at(sec, st.to)) };
      if (st.mode === 'hold' && !steps.some((q) => q.act === 'xray')) s2.act = 'xray';
      if (opt.xrayHold && s2.act === 'xray') s2.wait += opt.xrayHold;
      steps.push(s2);
    }
    steps[steps.length - 1].act = 'cleared';
    // a lounge until the gate calls
    const l0 = R.lounges[0], la0 = l0.userData.anchors;
    const useSecond = ch.second ?? Math.random() < 0.5;
    const lounge = useSecond ? R.lounges[1] : l0, la = lounge.userData.anchors;
    go(this.at(l0, la0.entryW));
    if (useSecond) go(this.at(l0, la0.exitE));
    if (!fast) steps.push({ to: lift(this.at(lounge, pick(la.waitSpots))), until: () => !!stand.flight, act: 'lounge', mode: Math.random() < 0.3 ? 'hold' : 'idle', look: pick([LOOK.nz, LOOK.px, LOOK.nx]) });
    go(this.at(lounge, la.toNorth), { act: 'toGate' });
    go(this.at(lounge, la.exitN));
    // concourse → gate room
    const cz = (L.BANDS.concourse[0] + L.BANDS.concourse[1]) / 2;
    const gEntry = this.at(gate, ga.entryS);
    go(V(this.at(lounge, la.exitN).x, cz));
    go(V(gEntry.x, cz));
    go(gEntry, { act: 'gate' });
    const seat = ch.seat !== undefined ? ga.freeSeats[ch.seat % ga.freeSeats.length] : pick(ga.freeSeats);
    if (!fast) {
      go(this.at(gate, seat).add(V(0, -0.6)));
      steps.push({ to: lift(this.at(gate, seat)), until: () => this.boardingOpen(stand), mode: 'sit', look: LOOK.nz });
      go(this.at(gate, seat).add(V(0, -0.6)), { act: 'boarding', then: (a) => { a.stand = stand; a.stage = 'boarding'; } });
      go(V(this.at(gate, ga.lineStart).x - 4.2, this.at(gate, seat).z - 0.6));
    }
    go(this.at(gate, ga.lineStart));
    go(this.at(gate, ga.lineEnd), fast ? { act: 'boarding', then: (a) => { a.stage = 'boarding'; } } : {});
    const gx = ch.gx !== undefined ? ga.gx[ch.gx] : pick(ga.gx);
    go(this.at(gate, V(gx, -1.7)));
    steps.push({ to: lift(this.at(gate, V(gx, -2.4))), wait: 0.8, look: LOOK.nz });
    go(this.at(gate, V(gx, -3.6)));
    go(this.at(gate, V(4.5, -4.9)));
    // door → across the arrivals corridor → down the jet bridge → aboard
    const door = this.at(gate, ga.door);
    steps.push({ to: lift(door), until: () => this.boardingOpen(stand) });
    const b = stand.bridge;
    steps.push({ to: V(b.pivot.x, L.FLOOR.f2, b.pivot.z + 0.6) });
    steps.push({ to: V(b.pivot.x, L.FLOOR.f2, b.pivot.z) });
    steps.push({ to: V(b.docked.x, 1.42, b.docked.z) });
    steps.push({ to: V(b.docked.x + 0.9, 1.42, b.docked.z), act: 'aboard', then: (a) => {
      a.stage = 'aboard';
      a.flight = stand.flight;
      const f = stand.flight;
      if (f) f.boarded = (f.boarded ?? 0) + 1;
      this.stats.boarded++;
    } });

    this.stats.departing++;
    return this.run(type, steps, () => { this.stats.departing--; }, (a) => {
      a.kind = 'departure';
      a.type = type;
      a.stand = stand;
      if (fast) a.vip = true;
      opt.init?.(a);
    }, opt.speed);
  }

  // ---------- arrivals ----------

  // options: type, lost (no bag on this flight), delivery (wait at the service desk for the
  // next flight to bring it), meet (go to the arrivals lobby and meet the "ミドリさん" sign), init
  spawnArrival(stand, opt = {}) {
    const R = this.rooms;
    const W = this.world;
    const type = opt.type ?? pick(P.PASSENGER_TYPES);
    const flight = stand.flight;
    const b = stand.bridge;
    const steps = [];
    const go = (x, z, y, extra = {}) => steps.push({ to: V(x, z, y), ...extra });
    go(b.docked.x + 0.9, b.docked.z, 1.42, { bag: false, act: 'deplane' });
    go(b.docked.x, b.docked.z, 1.42);
    go(b.pivot.x, b.pivot.z, L.FLOOR.f2, { act: 'corridor' });
    const cz = L.ESCALATOR.z - 0.6;
    go(b.pivot.x, cz, F2);
    // along the corridor, down the escalator
    const top = L.ESCALATOR.topX;
    go(top - 1.0, L.ESCALATOR.z, F2);
    go(top - 0.2, L.ESCALATOR.z, F2, { act: 'escalator' });
    go(top + 5.4, L.ESCALATOR.z, F1, { speed: 0.9 });
    go(top + 6.2, L.ESCALATOR.z, F1);
    // 1F back-of-house → baggage claim
    const claim = R.claim, a = claim.userData.anchors;
    const at = (p) => this.at(claim, p).setY(F1);
    const lz = (L.BANDS.concourse[0] + L.BANDS.concourse[1]) / 2;
    go(50.6, L.ESCALATOR.z, F1);
    go(50.6, lz, F1);
    go(at(a.entryN).x, lz, F1);
    steps.push({ to: at(a.entryN), act: 'toClaim' });
    steps.push({ to: at(a.aisle) });
    steps.push({ to: at(a.aisleS) });
    // this passenger's checked bag is in the hold; a few bags missed the flight
    const lost = opt.lost ?? Math.random() < 0.06;
    const bag = lost || !flight ? null : W.bags?.inbound(flight);
    const bags = W.bags;
    const mine = (x) => {
      if (!bag) return W.time - x.t0 > 14; // lost: wait a while, then give up
      if (W.time - x.t0 > 150) return true; // safety
      if (bag.state !== 'belt') return false;
      const p = bags.beltPos(bag);
      return Math.hypot(p.x - x.p.position.x, p.z - x.p.position.z) < 1.3;
    };
    steps.push({ to: (x) => { x.spot = this.claim('belt', a.belt.length); const s = a.belt[x.spot]; return at(s.at.clone().setZ(s.at.x < -5.5 ? s.at.z : 1.8)); } });
    steps.push({ to: (x) => at(a.belt[x.spot].at), until: mine, act: 'waitBag', then: (x) => { x.t0 = W.time; x.p.rotation.y = a.belt[x.spot].look; } });
    if (lost) {
      steps.push({ to: (x) => at(a.belt[x.spot].at.clone().setZ(1.9)), act: 'lostBag', then: (x) => this.unclaim('belt', x.spot) });
      steps.push({ to: at(a.service), wait: 9, look: LOOK.nz, act: 'service', then: (x) => { x.arrivalsAt = W.stats.arrivals; x.t1 = W.time; } });
      if (opt.delivery) { // stay until the next aircraft has landed and its bags are out
        steps.push({ to: at(a.service), until: (x) => W.stats.arrivals > x.arrivalsAt && W.time - x.t1 > 30, look: LOOK.nz, act: 'delivery' });
        steps.push({ to: at(a.service), wait: 3, mode: 'hold', look: LOOK.nz, act: 'bagDelivered' });
      }
    } else {
      steps.push({ to: (x) => at(a.belt[x.spot].at), wait: 1.4, mode: 'lift', bag: true, act: 'gotBag', then: () => { if (bag?.state === 'belt') bags.claim(bag); } });
      steps.push({ to: (x) => at(a.belt[x.spot].at.clone().setZ(1.9)), then: (x) => this.unclaim('belt', x.spot) });
    }
    steps.push({ to: at(a.toExit) });
    steps.push({ to: at(a.exitS), act: 'exit' });
    if (opt.meet) { // round to the arrivals lobby, where someone holds up a name board
      const lobby = R.lobby, lat = (x, z) => this.at(lobby, V(x, z)).setY(F1);
      go(at(a.exitS).x, L.TERMINAL.z1 + 0.8, 0);
      steps.push({ to: lat(-2, 6.0).setY(0) });
      steps.push({ to: lat(-2, 3.0) });
      steps.push({ to: lat(0.9, -0.5) });
      steps.push({ to: lat(0.9, -0.5), wait: 6, mode: 'hold', look: LOOK.nx, act: 'reunion' });
      steps.push({ to: lat(4, 3.0) });
      steps.push({ to: lat(4, 6.0).setY(0) });
    }
    const out = 20 + Math.random() * 36;
    const last = steps.at(-1).to;
    go(typeof last === 'function' ? at(a.exitS).x : last.x, L.CURB.sidewalk[0] - 0.6, 0);
    go(out, L.CURB.sidewalk[0] - 0.6, 0, { act: 'curb' });
    go(out + 0.4, L.CURB.sidewalk[0] + 0.3, 0);
    this.stats.arriving++;
    return this.run(type, steps, () => { this.stats.arriving--; }, (x) => {
      x.kind = 'arrival';
      x.type = type;
      x.flight = flight;
      x.from = flight?.from;
      opt.init?.(x);
    }, opt.speed);
  }

  update(t, dt) {
    // aircraft on stand with the bridge on: let the passengers off, one at a time
    this.deboardTimer -= dt;
    if (this.deboardTimer <= 0) {
      this.deboardTimer = 0.9;
      for (const s of this.world.stands) {
        const f = s.flight;
        if (!f || f.state !== 'parked' || s.bridge.extend < 0.99 || f.t > TURN.deboard + 2) continue;
        f.paxIn ??= 5 + Math.floor(Math.random() * 5);
        f.deplaned ??= 0;
        if (f.deplaned < f.paxIn) {
          f.deplaned++;
          this.stats.deplaned++;
          this.spawnArrival(s);
        }
      }
    }
    // only draw the people the current cutaway shows
    const mode = this.terminal.mode, T = L.TERMINAL;
    for (const a of [...this.actors]) {
      a.update(t, dt);
      const p = a.p.position;
      const inside = p.x > T.x0 && p.x < T.x1 && p.z > T.z0 && p.z < T.z1;
      a.p.visible = !inside || mode === 'f2' || (mode === 'f1' && p.y < 2);
    }
  }
}

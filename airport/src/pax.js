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
import { welcomeBoard } from './rooms.js';
import { TURN } from './sim.js';
import * as L from './layout.js';

const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const F2 = L.FLOOR.f2 + 0.02; // 2F walking height (rooms sit 0.02 above the slab)
const F1 = L.FLOOR.f1 + 0.04;
const LOOK = { px: 0, nx: Math.PI, pz: -Math.PI / 2, nz: Math.PI / 2 };
const INTL = new Set(['ICN', 'TPE', 'PVG', 'HKG']);
const NAMES = {
  ja: ['サクラ', 'ユウキ', 'ハルト', 'アオイ', 'リク', 'メイ', 'ソウタ', 'ユイ', 'タケシ', 'ナオミ'],
  en: ['Emma', 'Liam', 'Mina', 'Jun', 'Wei', 'Ji-ho', 'Lucas', 'Chloe', 'Arjun', 'Lena'],
};

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
    a.cleanup?.();
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
    const spotKey = `lounge${useSecond ? 1 : 0}`;
    if (!fast) steps.push({ to: (a) => { a.spot = this.claim(spotKey, la.waitSpots.length); return lift(this.at(lounge, la.waitSpots[a.spot])); }, until: () => !!stand.flight, act: 'lounge', mode: Math.random() < 0.3 ? 'hold' : 'idle', look: pick([LOOK.nz, LOOK.px, LOOK.nx]) });
    go(this.at(lounge, la.toNorth), { act: 'toGate', then: (a) => { if (a.spot !== undefined) this.unclaim(spotKey, a.spot); } });
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
      this.world.cabins?.board(stand.flight, a); // gets a seat; the cabin view walks them to it
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
  // next flight to bring it), greeter ({ type, board } or true / false: someone meets them), init
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
    // 1F: immigration (international flights queue at the booths, domestic walk past)
    const imm = R.immigration, ia = imm.userData.anchors;
    const iat = (p) => this.at(imm, p).setY(F1);
    const intl = !!flight && INTL.has(flight.from[1]);
    const japanese = !intl || Math.random() < 0.5;
    go(52.6, L.ESCALATOR.z, F1);
    go(52.6, imm.position.z, F1);
    steps.push({ to: iat(ia.entryE), act: intl ? 'immigration' : 'domestic' });
    const booth = (japanese ? 0 : 2) + Math.floor(Math.random() * 2);
    for (const st of ia.steps(intl, booth)) steps.push({ ...st, to: iat(st.to) });
    // → baggage claim
    const claim = R.claim, a = claim.userData.anchors;
    const at = (p) => this.at(claim, p).setY(F1);
    const lz = (L.BANDS.concourse[0] + L.BANDS.concourse[1]) / 2;
    const out = steps.at(-1).to;
    go(out.x - 1.4, out.z, F1);
    go(out.x - 1.4, lz, F1);
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
    // out through the arrivals doors into the hall
    steps.push({ to: at(V(3.0, 1.9)) });
    steps.push({ to: at(V(3.4, 0.0)) });
    steps.push({ to: at(V(7.9, 0.0)), act: 'exit' });
    const lobby = R.lobby, la = lobby.userData.anchors;
    const lat = (p) => this.at(lobby, p).setY(F1);
    steps.push({ to: lat(la.doorIn) });
    steps.push({ to: lat(la.aisleIn), act: 'arrivalsHall' });
    // opt.greeterActor: someone already waiting in the hall (a story greeter who came early)
    const greeterOpt = opt.ticket ? false : opt.greeterActor ? true : opt.greeter ?? (Math.random() < 0.3);
    let ticket = opt.ticket ?? null; // travelling with someone who has the ride sorted
    if (ticket) {
      steps.push({ to: lat(la.aisleEnd) });
    } else if (greeterOpt) {
      // someone is waiting: meet at the end of the aisle, then off to the pick-up curb together
      // (step out of the aisle to wait, so the people behind can get past)
      ticket = opt.greeterActor?.rideTicket ?? this.ticket('car');
      steps.push({ to: lat(la.aisleEnd) });
      steps.push({ to: (x) => lat(la.aisleEnd.clone().add(V(1.6, x.meetSide * 1.1))), until: (x) => x.greeter?.atMeet, look: 0, act: 'meeting', then: (x) => { x.atMeet = true; } });
      steps.push({ to: (x) => lat(la.aisleEnd.clone().add(V(1.6, x.meetSide * 1.1))), wait: 3, mode: 'hold', look: 0, act: 'reunion' });
    } else {
      steps.push({ to: lat(la.aisleEnd) });
      ticket = this.ticket(Math.random() < 0.5 ? 'taxi' : 'bus');
    }
    const exit = la.exits[ticket.kind === 'taxi' ? 1 : 0];
    steps.push({ to: lat(la.toExits[ticket.kind === 'taxi' ? 1 : 0]) });
    steps.push({ to: lat(exit), then: () => { ticket.open = true; } });
    this.curbSteps(ticket, opt.rideOffset ?? 0).forEach((st) => steps.push(st));

    this.stats.arriving++;
    const actor = this.run(type, steps, () => { this.stats.arriving--; }, (x) => {
      x.kind = 'arrival';
      x.type = type;
      x.flight = flight;
      x.from = flight?.from;
      x.ticket = ticket;
      x.meetSide = Math.random() < 0.5 ? -1 : 1;
      x.name = pick(intl && !japanese ? NAMES.en : NAMES.ja);
      if (flight) W.cabins?.deplane(flight, x); // their seat empties in the cabin view
      if (opt.greeterActor) x.greeter = opt.greeterActor;
      opt.init?.(x);
    }, opt.speed);
    if (greeterOpt && !opt.greeterActor) this.spawnGreeter(actor, ticket, typeof opt.greeter === 'object' ? opt.greeter : {});
    return actor;
  }

  // ---------- greeters & pick-up ----------

  // a pick-up: 'car' (its own stop on the curb), 'taxi' (the rank), 'bus' (the bus stop)
  ticket(kind) {
    const t = { kind, x: kind === 'car' ? 16 + Math.random() * 40 : kind === 'taxi' ? L.RANK_X : L.BUS_X, open: false, board: false };
    this.world.pickups.push(t);
    return t;
  }

  // walk from the lobby exit to where the ride stops, wait for it, get in
  curbSteps(ticket, offset) {
    const sw = L.CURB.sidewalk[0] - 0.5, lane = L.CURB.lane[0] + 0.3;
    const x = ticket.x + offset + (ticket.kind === 'bus' ? Math.random() * 2 - 1 : 0);
    return [
      { to: V(x, sw - 0.6) },
      { to: V(x, sw), until: () => ticket.board, act: ticket.kind === 'car' ? 'waitCar' : ticket.kind === 'taxi' ? 'waitTaxi' : 'waitBus', look: Math.PI / 2 },
      { to: V(x, lane), act: 'curb' },
    ];
  }

  // someone from the city comes to meet an arriving passenger
  // pax may be a stand-in object ({ activity, done, meetSide }) when the greeter comes before
  // the passenger exists (a delayed flight); offset spreads a second greeter at the meeting
  spawnGreeter(pax, ticket, { type, board, offset = 0 } = {}) {
    const R = this.rooms, lobby = R.lobby, la = lobby.userData.anchors;
    const lat = (p) => this.at(lobby, p).setY(F1);
    const gtype = type ?? pick(['woman', 'business', 'child', 'senior', 'passenger']);
    const slot = this.claim('greet', la.slots.length);
    const s = la.slots[slot];
    const side = Math.sign(s.at.z);
    const startX = 20 + Math.random() * 30;
    const steps = [
      { to: V(startX, L.CURB.sidewalk[0] - 0.4), bag: false },
      { to: lat(la.exits[0]) },
      { to: lat(la.toExits[0]) },
      // reach the spot from a walkway just behind the waiting line (and, on the north side,
      // round the end of the railings) so nobody walks through people already waiting
      ...(side < 0 ? [{ to: lat(V(-1.0, 0)) }] : []),
      { to: lat(V(-1.0, side * 2.8)) },
      { to: lat(V(s.at.x, side * 2.8)) },
      { to: lat(s.at), until: () => pax.done || pax.activity === 'meeting', mode: 'hold', look: s.look, act: 'greeting' },
      { to: lat(V(s.at.x, side * 2.8)) },
      { to: lat(V(-1.0, side * 2.8)) },
      { to: () => lat(la.aisleEnd.clone().add(V(2.3 + offset, pax.meetSide * 1.1 + offset * 0.4))), look: Math.PI, then: (g) => { g.atMeet = true; this.unclaim('greet', slot); } },
      { to: () => lat(la.aisleEnd.clone().add(V(2.3 + offset, pax.meetSide * 1.1 + offset * 0.4))), wait: 3, mode: 'hold', look: Math.PI },
      { to: lat(la.toExits[0]).add(V(0.6, 0)) },
      { to: lat(la.exits[0]).add(V(0.6, 0)) },
      ...this.curbSteps(ticket, 0.7 + offset),
    ];
    const g = this.run(gtype, steps, null, (x) => {
      x.kind = 'greeter';
      x.type = gtype;
      x.meets = pax;
      pax.greeter = x;
    }, 1.1);
    const text = board ?? pax.name ?? 'Welcome';
    g.board = welcomeBoard(text);
    g.p.add(g.board);
    g.cleanup = () => g.board.removeFromParent();
    g.rideTicket = ticket;
    return g;
  }

  // a car / taxi / bus has stopped at x on the arrivals curb
  vehicleArrived(kind, x) {
    const P = this.world.pickups;
    let hit = null;
    if (kind === 'bus') {
      for (const t of P) if (t.kind === 'bus' && t.open) { t.board = true; hit = t; }
    } else {
      hit = P.find((t) => t.kind === kind && t.open && !t.board && Math.abs(t.x - x) < 2.5);
      if (hit) hit.board = true;
    }
    this.world.pickups = P.filter((t) => !t.board);
    return !!hit;
  }

  update(t, dt) {
    // aircraft on stand with the bridge on: let the passengers off, one at a time
    this.deboardTimer -= dt;
    if (this.deboardTimer <= 0) {
      this.deboardTimer = 0.9;
      for (const s of this.world.stands) {
        const f = s.flight;
        if (!f || f.state !== 'parked' || s.bridge.extend < 0.99 || f.t > TURN.deboard + 2) continue;
        this.world.cabins?.get(f); // the seat map decides how many tracked passengers are aboard
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

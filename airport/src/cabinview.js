// Cabin view (DESIGN.md §9, option A): a person-scale cabin shown in a small window,
// kept in step with the real flight — who is aboard, in which seat, boarding or leaving.
//
// CabinBook  — per-flight seat map (f.cabin): tracked passengers by seat + filler passengers
// CabinView  — renders the selected flight's cabin into a corner of the main canvas
import * as THREE from 'three';
import { cabinKit, seatPos, rowX, CABIN, LETTERS } from './cabin.js';
import { person, LIVERIES } from './parts.js';
import { routine } from './interior.js';
import { TURN } from './sim.js';

const SEATS = [];
for (let r = 1; r <= CABIN.rows; r++) for (const l of LETTERS) SEATS.push({ row: r, letter: l, key: `${r}${l}` });
const indexOf = (key) => SEATS.findIndex((s) => s.key === key);
const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const RESERVED = new Set(['12A', '12B', '12C', '2C']); // story seats stay free for their owners

export class CabinBook {
  constructor(world) {
    this.world = world;
    world.cabins = this;
  }

  get(f) {
    if (f.cabin) return f.cabin;
    const paxIn = (f.paxIn ??= 5 + Math.floor(Math.random() * 5));
    const order = shuffle(SEATS.map((_, i) => i));
    const inbound = order.slice(0, paxIn).sort((a, b) => SEATS[a].row - SEATS[b].row); // front leaves first
    const loadIn = 0.6 + Math.random() * 0.3, loadOut = 0.55 + Math.random() * 0.3;
    const inFill = order.slice(paxIn).filter(() => Math.random() < loadIn);
    const outFill = shuffle(SEATS.map((_, i) => i).filter((i) => !RESERVED.has(SEATS[i].key))).filter(() => Math.random() < loadOut);
    f.cabin = {
      occ: inbound.map((i) => ({ seat: i, inbound: true, state: 'seated', type: null })),
      inFill: new Set(inFill), outFill: new Set(outFill),
    };
    return f.cabin;
  }

  // an arriving passenger stands up and leaves the aircraft (front rows first)
  deplane(f, actor) {
    const c = this.get(f);
    const o = c.occ.find((x) => x.inbound && x.state === 'seated');
    if (!o) return;
    o.state = 'leaving';
    o.type = actor.type;
    o.actor = actor;
    o.at = this.world.time;
    actor.seat = SEATS[o.seat].key;
  }

  // a departing passenger steps aboard and walks to a seat
  board(f, actor) {
    if (!f) return;
    const c = this.get(f);
    const taken = new Set(c.occ.filter((x) => !x.inbound || x.state !== 'gone').map((x) => x.seat));
    let i = actor.preferSeat ? indexOf(actor.preferSeat) : -1;
    if (i < 0 || taken.has(i)) {
      const free = SEATS.map((_, k) => k).filter((k) => !taken.has(k) && !c.outFill.has(k) && !RESERVED.has(SEATS[k].key));
      i = free.length ? free[Math.floor(Math.random() * free.length)] : -1;
    }
    if (i < 0) return;
    c.outFill.delete(i);
    c.occ.push({ seat: i, inbound: false, state: 'boarding', type: actor.type, actor, at: this.world.time });
    actor.seat = SEATS[i].key;
  }

  // how full the filler seats are for where the flight is in its day
  fillers(f) {
    const c = this.get(f);
    const show = new Set();
    const t = f.t ?? 0;
    if (['approach', 'landing', 'taxiIn'].includes(f.state)) for (const i of c.inFill) show.add(i);
    else if (f.state === 'parked') {
      const off = TURN.deboard + 2;
      if (t < off) { // deboarding: rows empty from the front
        const cut = (t / off) * CABIN.rows;
        for (const i of c.inFill) if (SEATS[i].row > cut) show.add(i);
      } else { // boarding: rows fill from the back
        const k = Math.min(1, Math.max(0, (t - off) / (TURN.board - off)));
        const cut = CABIN.rows - k * CABIN.rows;
        for (const i of c.outFill) if (SEATS[i].row >= cut) show.add(i);
      }
    } else for (const i of c.outFill) show.add(i);
    return show;
  }

  seatedCount(f) {
    const c = this.get(f);
    return this.fillers(f).size + c.occ.filter((o) => o.state === 'seated' || o.state === 'boarding').length;
  }

  update() {
    const now = this.world.time;
    for (const f of this.world.flights) {
      if (!f.cabin) continue;
      const deplaned = f.state !== 'parked' ? !['approach', 'landing', 'taxiIn'].includes(f.state) : f.t > TURN.deboard + 3;
      for (const o of f.cabin.occ) {
        if (o.inbound && o.state === 'seated' && deplaned) o.state = 'gone'; // everyone off by now
        if (o.state === 'boarding' && now - o.at > 14) o.state = 'seated';
        if (o.state === 'leaving' && now - o.at > 12) o.state = 'gone';
      }
    }
  }
}

export class CabinView {
  constructor(renderer, frame, viewport, world, book) {
    this.renderer = renderer;
    this.frame = frame;
    this.viewport = viewport;
    this.world = world;
    this.book = book;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe9e2d6);
    this.scene.add(new THREE.HemisphereLight(0xfff8ee, 0xc9b99f, 1.5));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
    sun.position.set(8, 30, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
    this.scene.add(sun);
    this.camera = new THREE.PerspectiveCamera(32, 1.6, 0.5, 200);
    this.target = V(3, 0, 2.6);
    this.kits = {};
    this.kit = null;
    this.flight = null;
    this.proxies = new Map();
    this.crowd = [];
    this.focus = null; // occupant to keep in frame
  }

  kitFor(f) {
    const key = f.liveryKey ?? 'sunrise';
    if (!this.kits[key]) this.kits[key] = cabinKit({ livery: LIVERIES[key], load: 1, ambient: false });
    return this.kits[key];
  }

  show(f) {
    if (f === this.flight) return;
    this.clear();
    this.flight = f;
    if (!f) { this.frame.hidden = true; return; }
    this.frame.hidden = false;
    this.kit = this.kitFor(f);
    this.scene.add(this.kit);
  }

  clear() {
    for (const a of this.proxies.values()) a.p.removeFromParent();
    this.proxies.clear();
    this.crowd = [];
    if (this.kit) this.scene.remove(this.kit);
    this.kit = null;
  }

  // a proxy character in the cabin for one tracked occupant
  proxy(o) {
    const inner = this.kit.userData.cabin;
    const seat = seatPos(SEATS[o.seat].row, SEATS[o.seat].letter);
    const aisleX = rowX(SEATS[o.seat].row) + 0.45;
    const door = V(CABIN.door.x, CABIN.door.z - 0.6), door2 = V(CABIN.door.x - 0.3, 0);
    const look = Math.sign(seat.z) < 0 ? Math.PI / 2 : -Math.PI / 2;
    const type = o.type ?? 'passenger';
    let steps;
    if (o.state === 'boarding') {
      steps = [
        { to: door, bag: true }, { to: door2 }, { to: V(aisleX, 0) },
        { to: V(aisleX, 0), wait: 1.6, mode: 'lift', look, bag: false },
        { to: V(aisleX, seat.z) }, { to: seat.clone(), until: () => false, mode: 'sit', look: 0 },
      ];
    } else if (o.state === 'leaving') {
      steps = [
        { to: seat.clone(), wait: 0.8, mode: 'sit', look: 0, bag: false }, { to: V(aisleX, seat.z) },
        { to: V(aisleX, 0), wait: 1.4, mode: 'lift', look, bag: true }, { to: door2 }, { to: door },
      ];
    } else {
      steps = [{ to: seat.clone(), until: () => o.state === 'leaving', mode: 'sit', look: 0, bag: false }];
    }
    const a = routine(inner, type, steps, {
      crowd: this.crowd, loop: false, speed: 1.0,
      onDone: (x) => { x.p.visible = false; },
    });
    a.occ = o;
    a.kindOf = o.state;
    return a;
  }

  update(t, dt) {
    const f = this.flight;
    if (!f || !this.kit) return;
    if (f.state === 'gone' || !this.world.flights.includes(f)) return this.show(null);
    const c = this.book.get(f);
    // fillers
    const show = this.book.fillers(f);
    for (let i = 0; i < SEATS.length; i++) {
      const tracked = c.occ.some((o) => o.seat === i && o.state !== 'gone');
      this.kit.userData.setFiller(i, show.has(i) && !tracked);
    }
    // tracked occupants: create, re-script when their state changes, drop when gone
    for (const o of c.occ) {
      let a = this.proxies.get(o);
      if (o.state === 'gone') { if (a) { a.p.removeFromParent(); this.proxies.delete(o); } continue; }
      if (a && a.kindOf === 'seated' && o.state === 'leaving') { a.p.removeFromParent(); this.proxies.delete(o); a = null; }
      if (!a) {
        const late = this.world.time - (o.at ?? 0);
        if (o.state === 'boarding' && late > 12) o.state = 'seated';
        if (o.state === 'leaving' && late > 9) continue;
        this.proxies.set(o, this.proxy(o));
      }
    }
    for (const a of this.proxies.values()) a.update(t, dt);
    this.kit.userData.update(t, dt);
    for (const s of this.kit.userData.signs) s.userData.on = !['parked'].includes(f.state) || f.t > TURN.bridgeOff;
    // camera: keep the followed occupant (or the door area) in frame
    let fx = 3;
    const fo = this.focus && c.occ.find((o) => o.actor === this.focus);
    if (fo) fx = this.proxies.get(fo)?.p.position.x ?? rowX(SEATS[fo.seat].row);
    else {
      const moving = [...this.proxies.values()].find((a) => a.p.userData.mode === 'walk' || a.p.userData.mode === 'lift');
      if (moving) fx = moving.p.position.x;
    }
    fx = Math.min(8, Math.max(-6, fx));
    this.target.x += (fx - this.target.x) * Math.min(1, dt * 2);
    this.camera.position.set(this.target.x + 4.5, this.target.y + 8.5, this.target.z + 9.5);
    this.camera.lookAt(this.target);
  }

  render() {
    if (!this.flight || this.frame.hidden) return;
    const r = this.viewport.getBoundingClientRect();
    const H = this.renderer.domElement.clientHeight;
    if (r.width < 2) return;
    const R = this.renderer;
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    R.autoClear = false;
    R.setScissorTest(true);
    R.setViewport(r.left, H - r.bottom, r.width, r.height);
    R.setScissor(r.left, H - r.bottom, r.width, r.height);
    R.clear(true, true, false);
    R.render(this.scene, this.camera);
    R.setScissorTest(false);
    R.setViewport(0, 0, R.domElement.clientWidth, H);
    R.autoClear = true;
  }

  get seatsTotal() { return SEATS.length; }
}

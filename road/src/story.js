// Hana's family on the Naha road (town/DESIGN.md §3.1).
//  out:  arrive at Naha Airport → the rental-car shuttle → pick up the van → drive → the beach car park → "to the sea"
//  back: from the beach with a souvenir bag → drive back → return the van → shuttle → the airport → "to the flight home"
// Vehicles drive in the shared traffic while they're on the road; pulling in and out is scripted along short curves.
import * as THREE from 'three';
import { person, mat, box } from '../../airport/src/parts.js';
import * as V from '../../town/src/vehicles.js';

const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const FAMILY = [['child', 'ハナ', 'Hana'], ['woman', 'ママ', 'Mum'], ['business', 'パパ', 'Dad']];

export class Story {
  constructor(o) {
    Object.assign(this, o);
    this.step = null;
    this.wait = 0;
    this.walkers = [];
    this.moves = [];
    // the family (hidden until they appear), Hana carries the souvenir bag on the way home
    this.family = FAMILY.map(([type], n) => {
      const p = person(type, { mode: 'idle' });
      p.userData.phase = n;
      p.visible = false;
      this.scene.add(p);
      return p;
    });
    [this.hana] = this.family;
    this.bag = box(0.24, 0.28, 0.1, mat(0xe8673c), 0.06, 0.42, -0.27);
    this.bag.visible = false;
    this.hana.add(this.bag);
    this.tag = this.label('ハナの一家', "Hana's family");
    this.shuttle = V.routeBus({ accent: 0xd23a2a, to: 'でいごレンタカー' });
    this.shuttle.visible = false;
    this.scene.add(this.shuttle);
  }
  label(ja, en) {
    const d = document.createElement('div');
    d.className = 'tag';
    d.innerHTML = `${ja}<small>${en}</small>`;
    const o = new this.labels(d);
    o.position.set(0, 2.6, 0);
    return o;
  }

  // ---------- helpers ----------
  say(ja) { this.text(ja); }
  laneOf(i, east, outer = true) {
    const ps = this.lanesOf(i).filter((p) => !p.busOnly && (p.end.x > p.start.x) === east);
    ps.sort((a, b) => Math.abs(b.start.z) - Math.abs(a.start.z)); // outer lane first
    return outer ? ps[0] : ps.at(-1);
  }
  car(obj) { return this.traffic.cars.find((c) => c.obj === obj); }
  leave(obj) { const k = this.traffic.cars.findIndex((c) => c.obj === obj); if (k >= 0) this.traffic.cars.splice(k, 1); }
  join(obj, path, s) { const c = this.traffic.add(obj, path, s, { len: obj.userData.len ?? 2.4, speed: 4.2 }); c.story = true; return c; }
  // is the lane clear around s (nobody on it near there, nobody about to arrive)?
  clear(path, s, ahead = 8, behind = 10) {
    return this.traffic.cars.every((c) => {
      if (c.obj === this.focusObj) return true;
      if (c.path === path) return c.s < s - behind || c.s > s + ahead;
      if (c.next === path) return c.path.len - c.s > behind - s;
      return true;
    });
  }
  show(people, at, spread = 0.7) { people.forEach((p, n) => { p.visible = true; p.position.copy(at).add(vec((n - 1) * spread * 0.6, 0, (n - 1) * spread)); p.userData.mode = 'idle'; }); }
  hide(people) { people.forEach((p) => (p.visible = false)); }
  // walk the people along points (each a little behind the one before); then()
  walk(people, pts, then, speed = 1.3) {
    people.forEach((p, n) => this.walkers.push({ p, pts: pts.map((q) => q.clone().add(vec(0, 0, (n - 1) * 0.55))), k: 0, delay: n * 0.45, speed, then: n === people.length - 1 ? then : null }));
  }
  // drive a vehicle along a smooth curve through pts in `dur` seconds (heading along the curve); then()
  drive(obj, pts, dur, then, { reverse = false } = {}) {
    obj.visible = true;
    this.moves.push({ obj, curve: new THREE.CatmullRomCurve3(pts), t: 0, dur, then, reverse });
  }
  ground(p) { p.y = this.roadY(p.x) + 0.02; return p; }

  // ---------- the legs ----------
  start(leg) {
    this.leg = leg;
    this.walkers = []; this.moves = [];
    for (const v of [this.familyVan, this.shuttle]) { this.leave(v); v.userData.doorOpen = false; }
    this.hide(this.family);
    this.bag.visible = leg === 'back';
    this.familyVan.add(this.tag);
    this.focusObj = null;
    if (leg === 'out') this.outArrive(); else this.backStart();
  }

  outArrive() {
    // the van waits in its bay at the rental office; the shuttle waits at the stop outside arrivals
    const bay = this.lot.userData.bays[3];
    this.familyVan.position.copy(bay.pos).add(this.lot.position); this.familyVan.rotation.set(0, bay.ry, 0);
    const lane = this.laneOf(0, true);
    this.shuttleLane = lane;
    lane.at(4.5, this.shuttle.position, new THREE.Vector3());
    this.shuttle.rotation.set(0, 0, 0);
    this.shuttle.visible = true;
    this.say('ハナの一家が那覇空港に到着。レンタカー会社の送迎バスに乗ります');
    this.show(this.family, vec(-20.6, 0.12, -8));
    this.focusObj = this.hana;
    this.walk(this.family, [vec(-20.6, 0.12, -8), vec(-12, 0.12, -9), vec(-3.5, 0.12, -7.9)], () => {
      this.shuttle.userData.doorOpen = true;
      this.walk(this.family, [vec(-3.5, 0.12, -7.9), vec(-2.3, 0.12, -6.1)], () => {
        this.hide(this.family);
        this.after(1.6, () => {
          this.shuttle.userData.doorOpen = false;
          this.after(0.8, () => { this.join(this.shuttle, lane, 4.5); this.focusObj = this.shuttle; this.say('送迎バスで、レンタカー営業所へ'); this.step = 'shuttle'; });
        });
      });
    });
  }
  outShuttleArrives() {
    // off the road, into the office forecourt
    this.leave(this.shuttle);
    const p = this.shuttle.position.clone();
    this.drive(this.shuttle, [p, vec(p.x + 3, 0, -6.3), vec(49, 0, -9.0), vec(46, 0, -9.6)], 3.2, () => {
      this.shuttle.userData.doorOpen = true;
      this.show(this.family, vec(47, 0.12, -10.6));
      this.focusObj = this.hana;
      this.say('営業所で手続き。わナンバーのミニバンを受け取ります');
      this.walk(this.family, [vec(47, 0.12, -10.6), vec(49.5, 0.12, -11.2)], () => {
        this.hide(this.family);
        this.after(2.5, () => {
          const van = this.familyVan.position.clone();
          this.show(this.family, vec(49.5, 0.12, -11.2));
          this.walk(this.family, [vec(49.5, 0.12, -11.2), vec(41, 0.12, -19), vec(van.x + 1.2, 0.12, -19.2), vec(van.x + 0.8, 0.12, van.z + 1.3)], () => {
            this.familyVan.userData.doorOpen = true;
            this.after(1.2, () => { this.hide(this.family); this.familyVan.userData.doorOpen = false; this.shuttle.userData.doorOpen = false; this.after(1, () => this.outLeaveLot()); });
          });
        });
      });
    });
  }
  outLeaveLot() {
    this.focusObj = this.familyVan;
    this.say('出発！ まずは国道を東へ');
    const v = this.familyVan.position.clone();
    const lane = this.laneOf(4, true);
    this.drive(this.familyVan, [v, vec(v.x + 0.2, 0, -19.4), vec(40, 0, -19.2), vec(44.5, 0, -14), vec(46, 0, -8.4)], 5, () => {
      // wait at the kerb for a gap, then pull out into the outer lane
      this.waitFor(() => this.clear(lane, 6, 6, 14), () => {
        this.drive(this.familyVan, [this.familyVan.position.clone(), vec(47.5, 0, -6), lane.at(6, new THREE.Vector3(), new THREE.Vector3()).clone()], 1.6, () => { this.join(this.familyVan, lane, 6); this.step = 'drive'; });
      });
    });
  }
  outPark() {
    this.leave(this.familyVan);
    const bay = this.beachLot.userData.bays[this.familyBay];
    const b = bay.pos.clone().add(this.beachLot.position);
    const p = this.familyVan.position.clone();
    this.say('ビーチの駐車場に着きました');
    this.waitFor(() => this.traffic.cars.every((c) => !(c.path.end.x < c.path.start.x && Math.abs(c.obj.position.x - p.x) < 12 && c.obj.position.z > 0)), () => {
      this.drive(this.familyVan, [p, vec(p.x + 2.5, 0, 3), vec(b.x + 3.5, 0, 9), vec(b.x + 3, 0, b.z + 4.5), vec(b.x + 0.3, 0, b.z + 3.2), vec(b.x, 0, b.z)], 6, () => {
        this.familyVan.userData.doorOpen = true;
        this.show(this.family, vec(b.x + 0.9, 0.12, b.z + 1.4));
        this.focusObj = this.hana;
        this.say('ハナの一家がビーチに到着！ 浜への小道を歩いて、海へ');
        this.walk(this.family, [vec(b.x + 0.9, 0.12, b.z + 1.4), vec(b.x + 4, 0.12, b.z - 2), vec(300, 0.12, 6), vec(308, 0.12, 8)], () => {
          this.familyVan.userData.doorOpen = false;
          this.step = 'end';
          this.done({ href: '../naha/?from=road', label: '那覇の海へ →' });
        });
      });
    });
  }

  backStart() {
    const bay = this.beachLot.userData.bays[this.familyBay];
    const b = bay.pos.clone().add(this.beachLot.position);
    this.familyVan.position.copy(b); this.familyVan.rotation.set(0, bay.ry, 0);
    this.shuttle.visible = false;
    this.say('海で遊んだ帰り道。ハナはお土産の袋を持って、空港へ');
    this.show(this.family, vec(308, 0.12, 8));
    this.focusObj = this.hana;
    this.walk(this.family, [vec(308, 0.12, 8), vec(300, 0.12, 6), vec(b.x + 4, 0.12, b.z - 2), vec(b.x + 0.9, 0.12, b.z + 1.4)], () => {
      this.familyVan.userData.doorOpen = true;
      this.after(1.2, () => {
        this.hide(this.family);
        this.familyVan.userData.doorOpen = false;
        this.focusObj = this.familyVan;
        const lane = this.laneOf(23, false);
        const start = lane.at(1, new THREE.Vector3(), new THREE.Vector3()).clone();
        this.drive(this.familyVan, [b.clone(), vec(b.x, 0, b.z + 3.5), vec(b.x + 3.5, 0, b.z + 3), vec(start.x + 1.5, 0, 6.5)], 4.5, () => {
          this.waitFor(() => this.clear(lane, 1, 6, 16), () => this.drive(this.familyVan, [this.familyVan.position.clone(), vec(start.x + 0.8, 0, 3.4), start], 1.6, () => { this.join(this.familyVan, lane, 1); this.step = 'driveBack'; this.say('西へ、来た道を空港へ戻ります'); }));
        });
      });
    });
  }
  backReturnVan() {
    this.leave(this.familyVan);
    const p = this.familyVan.position.clone();
    const bay = this.lot.userData.bays[3];
    const b = bay.pos.clone().add(this.lot.position);
    this.say('営業所で車を返します（中央分離帯の切れ目で右折）');
    // turn right across the eastbound lanes through the gap in the median, when they're clear
    this.waitFor(() => this.traffic.cars.every((c) => !(c.path.end.x > c.path.start.x && c.obj.position.x > 30 && c.obj.position.x < 52 && c.obj.position.z < 0)), () => {
      this.drive(this.familyVan, [p, vec(47.5, 0, 0.5), vec(46.5, 0, -7), vec(41, 0, -18.8), vec(b.x + 0.6, 0, -19.3), b], 6.5, () => {
        this.familyVan.rotation.y = bay.ry;
        this.familyVan.userData.doorOpen = true;
        this.show(this.family, vec(b.x + 0.8, 0.12, b.z + 1.3));
        this.focusObj = this.hana;
        // the shuttle is waiting in front of the office
        this.shuttle.position.set(46, 0, -9.6); this.shuttle.rotation.set(0, Math.PI, 0); this.shuttle.visible = true;
        this.walk(this.family, [vec(b.x + 0.8, 0.12, b.z + 1.3), vec(41, 0.12, -19), vec(47.5, 0.12, -11), vec(46.8, 0.12, -10.6)], () => {
          this.familyVan.userData.doorOpen = false;
          this.shuttle.userData.doorOpen = true;
          this.after(1.0, () => {
            this.hide(this.family);
            this.shuttle.userData.doorOpen = false;
            this.focusObj = this.shuttle;
            this.say('送迎バスで空港へ');
            const lane = this.laneOf(3, false);
            const start = lane.at(3, new THREE.Vector3(), new THREE.Vector3()).clone();
            this.waitFor(() => this.traffic.cars.every((c) => !(c.path.end.x > c.path.start.x && c.obj.position.x > 30 && c.obj.position.x < 52 && c.obj.position.z < 0)) && this.clear(lane, 3, 8, 14), () => {
              this.drive(this.shuttle, [this.shuttle.position.clone(), vec(44.5, 0, -6), vec(43.5, 0, 0.2), vec(start.x + 1.5, 0, start.z - 0.2), start], 4.2, () => { this.join(this.shuttle, lane, 3); this.step = 'shuttleBack'; });
            });
          });
        });
      });
    });
  }
  backAtAirport() {
    this.leave(this.shuttle);
    this.shuttle.userData.doorOpen = true;
    this.show(this.family, vec(-1, 0.12, 6.4));
    this.focusObj = this.hana;
    this.say('那覇空港に戻ってきました。帰りの便に乗ります');
    this.walk(this.family, [vec(-1, 0.12, 6.4), vec(-1.5, 0.12, 8.4), vec(-12, 0.12, 9), vec(-19.6, 0.12, 8)], () => {
      this.hide(this.family);
      this.shuttle.userData.doorOpen = false;
      this.step = 'end';
      this.done({ href: '../airport/', label: '空港の世界へ（ハナの帰りの便）→' });
    });
  }

  // ---------- time ----------
  after(sec, fn) { this.timers = this.timers ?? []; this.timers.push({ t: sec, fn }); }
  waitFor(cond, fn) { this.conds = this.conds ?? []; this.conds.push({ cond, fn }); }
  update(t, dt) {
    for (const tm of (this.timers ?? []).splice(0)) { tm.t -= dt; if (tm.t <= 0) tm.fn(); else this.timers.push(tm); }
    for (const c of (this.conds ?? []).splice(0)) { if (c.cond()) c.fn(); else this.conds.push(c); }
    // walking
    for (const w of this.walkers.slice()) {
      const p = w.p;
      if ((w.delay -= dt) > 0) { p.userData.mode = 'idle'; continue; }
      const goal = w.pts[Math.min(w.k + 1, w.pts.length - 1)];
      const d = goal.clone().sub(p.position).setY(0);
      if (d.length() < 0.06 || w.k >= w.pts.length - 1) {
        if (w.k < w.pts.length - 2) { w.k++; continue; }
        p.position.x = goal.x; p.position.z = goal.z;
        p.userData.mode = 'idle';
        this.walkers.splice(this.walkers.indexOf(w), 1);
        w.then?.();
        continue;
      }
      p.userData.mode = 'walk';
      p.rotation.y = Math.atan2(-d.z, d.x);
      p.position.addScaledVector(d.normalize(), Math.min(d.length(), w.speed * dt));
      p.position.y = Math.max(0.12, this.roadY(p.position.x) + 0.12);
    }
    for (const p of this.family) if (p.visible) p.userData.update(t);
    // scripted driving
    for (const m of this.moves.slice()) {
      m.t = Math.min(1, m.t + dt / m.dur);
      const k = THREE.MathUtils.smoothstep(m.t, 0, 1);
      const pos = m.curve.getPointAt(k), tan = m.curve.getTangentAt(Math.min(0.999, k + 0.001));
      m.obj.position.set(pos.x, this.roadY(pos.x), pos.z);
      m.obj.rotation.set(0, Math.atan2(-tan.z, tan.x), 0);
      m.obj.userData.speed = m.curve.getLength() / m.dur * (1 - Math.abs(2 * m.t - 1));
      m.obj.userData.braking = m.t > 0.75;
      if (m.t >= 1) { this.moves.splice(this.moves.indexOf(m), 1); m.obj.userData.speed = 0; m.then?.(); }
    }
    for (const v of [this.familyVan, this.shuttle]) if (!this.car(v)) v.userData.update(dt);
    // on the road: watch for the turn-offs
    const van = this.car(this.familyVan), bus = this.car(this.shuttle);
    const tileOf = (c) => Math.round(c.obj.position.x / 12);
    if (this.step === 'shuttle' && bus && tileOf(bus) === 4 && bus.obj.position.x > 44) { this.step = null; this.outShuttleArrives(); }
    if (this.step === 'drive' && van && van.obj.position.x > 281 && van.path.end.x > van.path.start.x) { this.step = null; this.outPark(); }
    if (this.step === 'driveBack' && van && van.obj.position.x < 50 && van.obj.position.x > 44) { this.step = null; this.backReturnVan(); }
    if (this.step === 'shuttleBack' && bus && bus.obj.position.x < 1) { this.step = null; this.backAtAirport(); }
  }
  // what the drive camera follows
  focus() {
    const o = this.focusObj;
    if (!o) return null;
    const onFoot = o.userData.kind === 'person';
    return { pos: o.position.clone(), fwd: vec(Math.cos(o.rotation.y), 0, -Math.sin(o.rotation.y)), onFoot };
  }
}

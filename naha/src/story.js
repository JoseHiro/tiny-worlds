// Hana's day at the sea (naha/DESIGN.md §6, after the drive in road/):
//  the family reaches the parasol → Hana floats out in her ring and the turtle comes to her → Dad snorkels out to the
//  reef and finds the clownfish family → shaved ice at the beach house → a bingata bag from the souvenir shop →
//  back to the car ("the way home" → road/?leg=back).
import * as THREE from 'three';
import { person, mat, box, cyl, mesh } from '../../airport/src/parts.js';

const vec = (x, y, z) => new THREE.Vector3(x, y, z);

export class SeaStory {
  // o: scene, sea (populate result), swimmer, ring, bedHeight, beachHouse, shop, parasol (Vector3), say(text), done(link), cam(pos, target), follow(obj, offset)
  constructor(o) {
    Object.assign(this, o);
    this.walkers = []; this.timers = []; this.conds = []; this.swims = [];
    this.family = ['swimKid', 'swimMum', 'swimDad'].map((role, n) => { const p = person(role, { mode: 'idle' }); p.userData.phase = n * 2; p.visible = false; this.scene.add(p); return p; });
    [this.hana, this.mum, this.dad] = this.family;
    // Dad's snorkel and mask (on his head; he lies face down to swim)
    this.snorkel = new THREE.Group();
    this.snorkel.add(box(0.1, 0.12, 0.34, mat(0x2a6f9a, { transparent: true, opacity: 0.85 }), 0.24, 1.33, 0));
    this.snorkel.add(cyl(0.025, 0.025, 0.5, mat(0xf2b84b), 0.02, 1.55, 0.2, 6));
    this.snorkel.visible = false;
    this.dad.add(this.snorkel);
    // shaved ice (strawberry) and the bingata bag, in Hana's hand when she has them
    this.ice = new THREE.Group();
    this.ice.add(cyl(0.07, 0.05, 0.1, mat(0xf4f2ec), 0, 0, 0, 10));
    this.ice.add(mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe8486a, { roughness: 0.7 }), 0, 0.04, 0));
    this.ice.position.set(0.2, 0.55, -0.2); this.ice.visible = false;
    this.hana.add(this.ice);
    this.bag = new THREE.Group();
    this.bag.add(box(0.26, 0.3, 0.1, mat(0xe8673c), 0, 0, 0));
    this.bag.add(box(0.27, 0.06, 0.11, mat(0x2fa58f), 0, 0.06, 0)); // the bingata pattern band
    this.bag.position.set(0.06, 0.42, -0.27); this.bag.visible = false;
    this.hana.add(this.bag);
    this.running = false;
  }

  // ---------- helpers ----------
  after(sec, fn) { this.timers.push({ t: sec, fn }); }
  waitFor(cond, fn) { this.conds.push({ cond, fn }); }
  show(p, at) { p.visible = true; p.position.copy(at); this.stand(p); }
  hide(p) { p.visible = false; }
  stand(p) { p.rotation.set(0, p.rotation.y, 0); p.userData.mode = 'idle'; p.position.y = this.ground(p.position); }
  ground(v) { return Math.max(this.bedHeight(v.x, v.z), -0.6) + 0.12; }
  walk(people, pts, then, speed = 1.2) {
    people.forEach((p, n) => this.walkers.push({ p, pts: pts.map((q) => q.clone().add(vec((n - 1) * 0.5, 0, (n - 1) * 0.35))), k: 0, delay: n * 0.4, speed, then: n === people.length - 1 ? then : null }));
  }
  // move a swimming thing across the water (the ring, or Dad face down), then()
  swim(obj, pts, speed, then, { y = null } = {}) { this.swims.push({ obj, pts, k: 0, speed, then, y }); }

  start() {
    this.running = true;
    this.walkers = []; this.timers = []; this.conds = []; this.swims = [];
    this.ice.visible = false; this.bag.visible = false; this.snorkel.visible = false;
    this.ringHome = this.swimmer.position.clone();
    this.swimmer.visible = false; // Hana takes the ring today
    const from = vec(-14, 0, 29.5), spot = this.parasol.clone().add(vec(1.4, 0, 1.2));
    this.family.forEach((p, n) => this.show(p, from.clone().add(vec(n * 0.6, 0, 0))));
    this.say('ハナの一家が浜に到着。パラソルの下に荷物を置きます');
    this.cam(vec(-4, 9, 40), vec(-14, 0, 23));
    this.follow(null);
    this.walk(this.family, [from, vec(-15, 0, 26), spot], () => this.after(1.5, () => this.ringOut()));
  }

  ringOut() {
    // Hana runs down to the water with her ring, wades in, and floats out
    this.say('ハナは浮き輪で浅瀬へ。水が透き通っていて、足もとの砂まで見えます');
    const shore = vec(-7, 0, 14.5);
    this.walk([this.hana], [this.hana.position.clone(), vec(-8, 0, 17), shore], () => {
      this.hide(this.hana);
      this.swimmer.position.set(shore.x, -0.75, shore.z - 1);
      this.swimmer.visible = true;
      this.follow(this.swimmer, vec(5, 5, 8));
      this.swim(this.swimmer, [vec(-6, 0, 11), vec(-4.5, 0, 7.5), vec(-3, 0, 5.5)], 0.55, () => this.turtleComes());
    }, 1.6);
  }

  turtleComes() {
    const t = this.sea.turtle, w = t.userData.wander;
    this.say('あれ？ 何か大きな影が近づいてきます…');
    this.saved = { home: w.home.clone(), radius: w.radius, speed: w.speed };
    w.home.set(this.swimmer.position.x + 1.2, w.home.y, this.swimmer.position.z - 0.8);
    w.radius = 1.4; w.speed = 0.5; w.wait = 0; w.target = w.pick();
    this.waitFor(() => t.position.distanceTo(vec(this.swimmer.position.x, t.position.y, this.swimmer.position.z)) < 3, () => {
      this.say('ウミガメがハナのすぐそばに！ ゆっくり羽ばたいて、ハナのまわりを泳いでいます');
      this.cam(this.swimmer.position.clone().add(vec(3.2, 2.6, 4.2)), this.swimmer.position.clone().add(vec(0.6, -0.6, -0.4)));
      this.follow(null);
      this.after(9, () => this.snorkel1());
    });
  }

  snorkel1() {
    // Dad puts on the mask and snorkels out to the reef
    this.say('パパはシュノーケルを着けて、サンゴ礁へ');
    this.snorkel.visible = true;
    this.walk([this.dad], [this.dad.position.clone(), vec(-15, 0, 18), vec(-15.5, 0, 14.5)], () => {
      this.dad.userData.mode = 'idle';
      this.dad.rotation.set(0, Math.PI / 2, -Math.PI / 2, 'YXZ'); // face down, head toward the reef (−Z)
      this.follow(this.dad, vec(6, 8, 10));
      this.swim(this.dad, [vec(-15.5, 0, 12), vec(-16, 0, 2), vec(-16.2, 0, -7.4)], 1.4, () => {
        this.say('クマノミの一家を見つけた！ イソギンチャクの中から顔を出しています');
        this.follow(null);
        this.cam(vec(-21.2, 1.9, -6.6), vec(-17.8, -1.1, -9.8)); // from the side: the anemone in front, Dad floating beyond
        this.after(10, () => this.backToBeach());
      }, { y: -0.12 });
    });
  }

  backToBeach() {
    this.say('そろそろ海から上がって、海の家へ');
    this.cam(vec(4, 10, 34), vec(-4, 0, 16));
    // the turtle goes back to its own wandering
    const w = this.sea.turtle.userData.wander;
    if (this.saved) { w.home.copy(this.saved.home); w.radius = this.saved.radius; w.speed = this.saved.speed; }
    let back = 0;
    const both = () => { if (++back === 2) this.iceTime(); };
    this.swim(this.swimmer, [this.swimmer.position.clone(), vec(-6, 0, 11), vec(-7, 0, 13.6)], 0.8, () => {
      this.swimmer.visible = false;
      this.show(this.hana, vec(-7, 0, 14.6));
      both();
    });
    this.swim(this.dad, [this.dad.position.clone(), vec(-16, 0, 4), vec(-14, 0, 14)], 1.8, () => {
      this.snorkel.visible = false;
      this.dad.rotation.set(0, 0, 0);
      this.show(this.dad, vec(-14, 0, 15));
      both();
    }, { y: -0.12 });
  }

  iceTime() {
    const bh = this.beachHouse;
    const counter = bh.localToWorld(bh.userData.counter.clone());
    this.say('海の家でかき氷。ハナはいちご味');
    this.cam(counter.clone().add(vec(4.5, 2.3, -9.5)), counter.clone().add(vec(0, 1.1, 0))); // under the eaves, from the sea side
    this.walk(this.family, [vec(-10, 0, 18.5), vec(10, 0, 19.5), counter.clone().add(vec(0, 0, -1.2)), counter], () => {
      this.after(2.5, () => {
        this.ice.visible = true;
        this.say('かき氷を食べながら、ハナは「カメさんと泳いだ！」とママに話しています');
        this.after(6, () => this.shopTime());
      });
    }, 1.1);
  }

  shopTime() {
    const front = this.shop.localToWorld(vec(0, 0, 4.2));
    this.say('お土産屋で、紅型の布の袋を買いました');
    this.cam(front.clone().add(vec(4, 6, -10)), front.clone().add(vec(0, 1, 2)));
    this.walk(this.family, [this.family[2].position.clone(), front.clone().add(vec(0, 0, -1.5)), front], () => {
      this.after(3, () => {
        this.ice.visible = false;
        this.bag.visible = true;
        this.say('ハナは紅型の袋を大事に抱えて、車へ戻ります');
        this.after(2, () => this.leave());
      });
    }, 1.1);
  }

  leave() {
    this.cam(vec(0, 12, 42), vec(-8, 0, 26));
    this.walk(this.family, [this.family[2].position.clone(), vec(-8, 0, 28), vec(-14, 0, 29.5), vec(-16, 0, 31)], () => {
      this.family.forEach((p) => this.hide(p));
      this.swimmer.position.copy(this.ringHome); this.swimmer.visible = true; // someone else's child takes to the water
      this.running = false;
      this.say('ハナの一家は車に戻りました。帰り道へ');
      this.done({ href: '../road/?leg=back', label: '帰り道へ（海 → 空港）→' });
    });
  }

  // ---------- each frame ----------
  update(t, dt) {
    for (const tm of this.timers.splice(0)) { tm.t -= dt; if (tm.t <= 0) tm.fn(); else this.timers.push(tm); }
    for (const c of this.conds.splice(0)) { if (c.cond()) c.fn(); else this.conds.push(c); }
    for (const w of this.walkers.slice()) {
      const p = w.p;
      if ((w.delay -= dt) > 0) continue;
      const goal = w.pts[Math.min(w.k + 1, w.pts.length - 1)];
      const d = goal.clone().sub(p.position).setY(0);
      if (d.length() < 0.06 || w.k >= w.pts.length - 1) {
        if (w.k < w.pts.length - 2) { w.k++; continue; }
        p.position.x = goal.x; p.position.z = goal.z;
        this.stand(p);
        this.walkers.splice(this.walkers.indexOf(w), 1);
        w.then?.();
        continue;
      }
      p.userData.mode = 'walk';
      p.rotation.y = Math.atan2(-d.z, d.x);
      p.position.addScaledVector(d.normalize(), Math.min(d.length(), w.speed * dt));
      p.position.y = this.ground(p.position);
    }
    for (const s of this.swims.slice()) {
      const goal = s.pts[Math.min(s.k + 1, s.pts.length - 1)];
      const d = goal.clone().sub(s.obj.position).setY(0);
      if (d.length() < 0.08) {
        if (s.k < s.pts.length - 2) { s.k++; continue; }
        this.swims.splice(this.swims.indexOf(s), 1);
        s.then?.();
        continue;
      }
      s.obj.position.addScaledVector(d.normalize(), Math.min(d.length(), s.speed * dt));
      if (s.y != null) {
        s.obj.position.y = s.y + Math.sin(t * 2) * 0.03;
        s.obj.rotation.y = Math.atan2(-d.z, d.x); // (Dad: head first, face down)
      }
    }
    for (const p of this.family) if (p.visible) p.userData.update(t);
    if (this.dad.visible && this.snorkel.visible && this.dad.rotation.z !== 0) { // a gentle flutter kick
      this.dad.rotation.order = 'YXZ';
      this.dad.rotation.z = -Math.PI / 2 + Math.sin(t * 5) * 0.04;
    }
  }
}

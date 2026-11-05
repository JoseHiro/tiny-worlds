// The trains (rails/DESIGN.md §1.1, §8): chibi four-car sets, every car of every line drawn by one InstancedMesh per
// part — stainless body, window band, line-colour band and doors, roof, underframe, and the two cab faces. A Line ties
// a path to its runs (one per direction) and puts its trains on the track each frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RAIL_TOP, smooth } from './track.js';
import { trainAt } from './timetable.js';

export const CAR = { len: 0.19, gap: 0.012, w: 0.062, cars: 4 };
export const TRAIN_LEN = CAR.cars * CAR.len + (CAR.cars - 1) * CAR.gap;
const STAINLESS = 0xd5d9de;
const L = CAR.len, W = CAR.w, B = RAIL_TOP + 0.003; // (the car's underside sits just over the rails)

// the parts in car space: x along the car, y up from the rail top, z across
const at = (g, x, y, z) => g.translate(x, y, z);
const merge = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g))); // (the rounded boxes have no index)
const PARTS = {
  under: { color: 0x34373e, geo: () => merge([at(new THREE.BoxGeometry(L * 0.86, 0.013, W * 0.8), 0, B + 0.0065, 0), ...[-1, 1].map((s) => at(new THREE.BoxGeometry(0.04, 0.012, W * 0.7), s * L * 0.3, B + 0.004, 0))]) },
  body: { color: STAINLESS, metal: 0.55, rough: 0.35, geo: () => at(new RoundedBoxGeometry(L, 0.06, W, 2, 0.01), 0, B + 0.042, 0) },
  windows: { color: 0x2b3442, rough: 0.2, geo: () => merge([at(new THREE.BoxGeometry(L * 0.9, 0.017, W + 0.002), 0, B + 0.055, 0)]) },
  roof: { color: 0x9aa0a8, geo: () => merge([at(new THREE.BoxGeometry(L * 0.97, 0.01, W * 0.86), 0, B + 0.073, 0), at(new THREE.BoxGeometry(0.05, 0.008, W * 0.5), 0, B + 0.081, 0)]) },
  // the line colour: a band under the windows (Chūō, Sōbu) or the doors, two a side (Yamanote's E235)
  band: { tint: 'band', geo: () => at(new THREE.BoxGeometry(L * 0.94, 0.007, W + 0.003), 0, B + 0.042, 0) },
  doors: { tint: 'doors', geo: () => merge([-1, 1].flatMap((x) => [-1, 1].map((z) => at(new THREE.BoxGeometry(0.028, 0.044, 0.002), x * L * 0.24, B + 0.04, z * (W / 2 + 0.0008))))) },
  // a cab face: a black mask and a line-colour chin, built at the +x end
  mask: { color: 0x15181d, rough: 0.25, cab: true, geo: () => at(new THREE.BoxGeometry(0.008, 0.034, W * 0.92), L / 2 + 0.001, B + 0.052, 0) },
  chin: { tint: 'band', cab: true, geo: () => at(new THREE.BoxGeometry(0.008, 0.016, W * 0.94), L / 2 + 0.001, B + 0.026, 0) },
};

export class Fleet {
  constructor(scene, cars) {
    this.meshes = {};
    for (const [k, p] of Object.entries(PARTS)) {
      const m = new THREE.MeshStandardMaterial({ color: p.tint ? 0xffffff : p.color, roughness: p.rough ?? 0.55, metalness: p.metal ?? 0.05 });
      const im = new THREE.InstancedMesh(p.geo(), m, p.cab ? cars * 2 : cars);
      im.castShadow = !p.cab; im.receiveShadow = true; im.frustumCulled = false; im.count = 0; // (nothing until the first frame)
      if (p.tint) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(im.instanceMatrix.count * 3), 3);
      im.userData.cab = !!p.cab; im.userData.tint = p.tint;
      scene.add(im); this.meshes[k] = im;
    }
    this.cap = cars; this.who = []; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(0, 0, 0, 'YZX'); this.col = new THREE.Color();
    this.v = new THREE.Vector3(); this.one = new THREE.Vector3(1, 1, 1); this.flip = new THREE.Matrix4().makeRotationY(Math.PI); this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
  }
  begin() { this.n = 0; this.c = 0; }
  // which train a car belongs to (for clicking one), by instance number
  whose(i) { return this.who[i]; }
  // one car at (x, y, z) heading `yaw` (radians, car +x along it), pitched, in a line's look ({ band, doors, face });
  // cab: 1 face forward, −1 face back, 0 none
  car(x, y, z, yaw, pitch, look, cab, id) {
    if (this.n >= this.cap) return;
    this.who[this.n] = id;
    this.e.set(0, yaw, pitch); this.q.setFromEuler(this.e); this.v.set(x, y, z);
    this.m.compose(this.v, this.q, this.one);
    for (const im of Object.values(this.meshes)) if (!im.userData.cab) {
      const c = im.userData.tint === 'doors' ? look.doors : im.userData.tint ? look.band : 0;
      im.setMatrixAt(this.n, c === null ? this.zero : this.m); // (no band: hidden)
      if (c) im.setColorAt(this.n, this.col.setHex(c));
    }
    if (cab) {
      const cm = cab > 0 ? this.m : this.m.clone().multiply(this.flip);
      for (const im of Object.values(this.meshes)) if (im.userData.cab) { im.setMatrixAt(this.c, cm); if (im.userData.tint) im.setColorAt(this.c, this.col.setHex(look.face)); }
      this.c++;
    }
    this.n++;
  }
  end() {
    for (const im of Object.values(this.meshes)) {
      im.count = im.userData.cab ? this.c : this.n;
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }
}

// A line: a path, its colour, its runs, and which stretch of it is in sight (a shuttle's ends go into tunnels).
// `xover` [a, b]: trains leaving the start terminal stay on the track they came in on until a, then cross by b.
export class Line {
  constructor(path, { color, runs, seen = [0, path.length], xover = null, doors = false }) {
    Object.assign(this, { path, color, runs, seen, xover });
    this.look = doors ? { band: null, doors: color, face: color } : { band: color, doors: 0xb9bec5, face: color };
    this.st = {}; this.a = [0, 0, 0, 0]; this.b = [0, 0, 0, 0];
    this.ids = runs.map((run, r) => Array.from({ length: run.n }, (_, k) => ({ line: this, run, r, k })));
  }
  side(s, dir) {
    if (this.xover && dir > 0 && s < this.xover[1]) return 1 - 2 * smooth(this.xover[0], this.xover[1], s);
    return -dir;
  }
  // where on the map a point `s` along the train lies (the track it is on at that point)
  place(s, dir, out) {
    const p = this.path;
    return p.at(s, p.track(s, this.side(s, dir)), out);
  }
  draw(fleet, time) {
    const p = this.path, step = CAR.len + CAR.gap;
    this.runs.forEach((run, r) => { for (let k = 0; k < run.n; k++) {
      const st = trainAt(run, k, time, this.st);
      for (let j = 0; j < CAR.cars; j++) {
        const s = st.s + st.dir * ((CAR.cars - 1) / 2 - j) * step; // car 0 leads
        if (!p.closed && (s < this.seen[0] || s > this.seen[1])) continue;
        const f = this.place(s + 0.07 * st.dir, st.dir, this.a), b = this.place(s - 0.07 * st.dir, st.dir, this.b);
        const yaw = Math.atan2(-(f[1] - b[1]), f[0] - b[0]);
        const yf = p.y(s + 0.07 * st.dir), yr = p.y(s - 0.07 * st.dir);
        fleet.car((f[0] + b[0]) / 2, (yf + yr) / 2, (f[1] + b[1]) / 2, yaw, Math.atan2(yf - yr, 0.14), this.look, j === 0 ? 1 : j === CAR.cars - 1 ? -1 : 0, this.ids[r][k]);
      }
    } });
  }
  // the middle of train k of run r at `time`: [x, y, z]
  centre(r, k, time, out = [0, 0, 0]) {
    const st = trainAt(this.runs[r], k, time, this.st), a = this.place(st.s, st.dir, this.a);
    out[0] = a[0]; out[1] = this.path.y(st.s); out[2] = a[1];
    return out;
  }
}

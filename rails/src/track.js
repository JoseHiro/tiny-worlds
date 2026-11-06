// Track (rails/DESIGN.md §3): a smooth path through points on the map, a double track along it that splays apart round
// the island platform at each station, and the geometry laid along it — the bank or the viaduct deck, ballast, rails,
// sleepers and piers. Trains run on the LEFT (Japan): going up the path a train is on the −side, coming back on the +side.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const GAUGE = 0.045; // half the distance between the two tracks on plain line
export const PLAT = { len: 0.85, half: 0.05, top: 0.065 }; // the island platform (relative to the rail bed)
const SPLAY = PLAT.half + 0.035 - GAUGE; // how much each track moves out round a platform

// a path along points [[x, z], …]: evenly sampled so sample(s) is quick
export class Path {
  constructor(pts, { closed = false, step = 0.02 } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
    curve.arcLengthDivisions = Math.max(200, pts.length * 40);
    this.closed = closed;
    this.length = curve.getLength();
    const n = (this.n = Math.ceil(this.length / step));
    this.step = this.length / n;
    this.d = new Float32Array((n + 1) * 4);
    const p = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      curve.getPointAt(Math.min(1, i / n), p); curve.getTangentAt(Math.min(1, i / n), t);
      const l = Math.hypot(t.x, t.z) || 1;
      this.d.set([p.x, p.z, t.x / l, t.z / l], i * 4);
    }
    this.stations = []; // arc positions of platform centres (set by the line)
    this.y = () => 0; // the rail-bed height along the path
  }
  wrap(s) { return this.closed ? ((s % this.length) + this.length) % this.length : Math.min(this.length, Math.max(0, s)); }
  // [x, z, tx, tz] at arc position s, then moved `d` to the right of the direction of travel up the path
  at(s, d = 0, out = [0, 0, 0, 0]) {
    const f = this.wrap(s) / this.step, i = Math.min(this.n - 1, Math.floor(f)), k = f - i, a = i * 4, D = this.d;
    let tx = D[a + 2] + (D[a + 6] - D[a + 2]) * k, tz = D[a + 3] + (D[a + 7] - D[a + 3]) * k;
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    out[0] = D[a] + (D[a + 4] - D[a]) * k - tz * d; out[1] = D[a + 1] + (D[a + 5] - D[a + 1]) * k + tx * d;
    out[2] = tx; out[3] = tz;
    return out;
  }
  // the arc position nearest a point
  nearest(x, z) {
    let best = 0, bd = Infinity;
    for (let i = 0; i <= this.n; i++) { const dx = this.d[i * 4] - x, dz = this.d[i * 4 + 1] - z, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; best = i; } }
    return best * this.step;
  }
  dist(a, b) { const d = Math.abs(a - b); return this.closed ? Math.min(d, this.length - d) : d; }
  // 0 on plain line, 1 alongside a platform
  splay(s) {
    let w = 0;
    for (const c of this.stations) w = Math.max(w, 1 - smooth(PLAT.len / 2 + 0.06, PLAT.len / 2 + 0.55, this.dist(s, c)));
    return w;
  }
  // the lateral offset of one track (side −1 or +1)
  track(s, side) { return side * (GAUGE + SPLAY * this.splay(s)); }
}

// ---------- geometry laid along a path ----------
// a flat strip between lateral offsets dl(s) and dr(s) at height y(s), from s0 to s1, facing up
export function strip(path, s0, s1, dl, dr, y, step = 0.03) {
  const n = Math.max(1, Math.ceil((s1 - s0) / step)), pos = [], uv = [], idx = [];
  const a = [0, 0, 0, 0], b = [0, 0, 0, 0];
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n, h = y(s);
    path.at(s, dl(s), a); path.at(s, dr(s), b);
    pos.push(a[0], h, a[1], b[0], h, b[1]); uv.push(s, 0, s, 1);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  return finish(pos, uv, idx);
}
// a vertical wall at lateral offset d(s) from height top(s) down to bot(s); `face` +1 looks to the right, −1 to the left
export function wall(path, s0, s1, d, top, bot, face, step = 0.03) {
  const n = Math.max(1, Math.ceil((s1 - s0) / step)), pos = [], uv = [], idx = [];
  const a = [0, 0, 0, 0];
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    path.at(s, d(s), a);
    pos.push(a[0], top(s), a[1], a[0], bot(s), a[1]); uv.push(s, 1, s, 0);
    if (i) { const k = i * 2; if (face > 0) idx.push(k - 2, k - 1, k, k, k - 1, k + 1); else idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  return finish(pos, uv, idx);
}
// a raised slab: top strip and both side walls
export function slab(path, s0, s1, dl, dr, top, bot, step) {
  return mergeGeometries([strip(path, s0, s1, dl, dr, top, step), wall(path, s0, s1, dl, top, bot, -1, step), wall(path, s0, s1, dr, top, bot, 1, step)]);
}
function finish(pos, uv, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------- the track itself ----------
const TRACK = {
  bank: new THREE.MeshStandardMaterial({ color: 0xb7aa98, roughness: 0.95 }),
  deck: new THREE.MeshStandardMaterial({ color: 0xcfcac2, roughness: 0.85 }),
  ballast: new THREE.MeshStandardMaterial({ color: 0x9a8f84, roughness: 1 }),
  rail: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.35, metalness: 0.7 }),
  sleeper: new THREE.MeshStandardMaterial({ color: 0x6b5a4a, roughness: 0.9 }),
  platform: new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.85 }),
  edge: new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.7 }), // the yellow tactile strip
  roof: new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.6 }),
  post: new THREE.MeshStandardMaterial({ color: 0x7d838c, roughness: 0.5, metalness: 0.3 }),
  well: new THREE.MeshStandardMaterial({ color: 0x2e3136, roughness: 0.9 }),
};
export const RAIL_TOP = 0.022; // above the bed

// Lay a double track along `path` from s0 to s1, on a low bank — or, where `open(s)`, on a deck with nothing under it
// (a viaduct, a bridge), standing on piers where `pier(s)`. Returns a group of a few meshes (one per material);
// sleepers and piers are instanced.
export function layTrack(path, { s0 = 0, s1 = path.length, open = () => false, pier = () => false } = {}) {
  const g = new THREE.Group(), y = path.y, sides = [-1, 1];
  const outer = (side) => (s) => path.track(s, side) + side * 0.06;
  const bed = slab(path, s0, s1, outer(-1), outer(1), y, (s) => (open(s) ? y(s) - 0.025 : 0));
  g.add(shade(new THREE.Mesh(bed, TRACK.bank)));
  const ballast = [], rails = [];
  for (const side of sides) {
    const c = (s) => path.track(s, side);
    ballast.push(slab(path, s0, s1, (s) => c(s) - 0.036, (s) => c(s) + 0.036, (s) => y(s) + 0.008, y));
    for (const r of [-0.017, 0.017]) rails.push(slab(path, s0, s1, (s) => c(s) + r - 0.003, (s) => c(s) + r + 0.003, (s) => y(s) + RAIL_TOP, (s) => y(s) + 0.012, 0.04));
  }
  g.add(shade(new THREE.Mesh(mergeGeometries(ballast), TRACK.ballast)));
  g.add(shade(new THREE.Mesh(mergeGeometries(rails), TRACK.rail)));
  // sleepers every 0.03 under each track
  const every = 0.03, n = Math.floor((s1 - s0) / every), sl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.005, 0.054), TRACK.sleeper, n * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), a = [0, 0, 0, 0];
  let k = 0;
  for (let i = 0; i < n; i++) for (const side of sides) {
    const s = s0 + (i + 0.5) * every; path.at(s, path.track(s, side), a);
    q.setFromAxisAngle(up, Math.atan2(-a[3], a[2])); p.set(a[0], y(s) + 0.0105, a[1]);
    sl.setMatrixAt(k++, m.compose(p, q, one));
  }
  sl.receiveShadow = true; g.add(sl);
  // piers every 0.4 under the deck
  const at = []; for (let s = s0 + 0.2; s < s1; s += 0.4) if (pier(s)) at.push(s);
  if (at.length) {
    const piers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1, 0.16).translate(0, 0.5, 0), TRACK.deck, at.length);
    at.forEach((s, i) => {
      path.at(s, 0, a); q.setFromAxisAngle(up, Math.atan2(-a[3], a[2])); p.set(a[0], 0, a[1]);
      piers.setMatrixAt(i, m.compose(p, q, new THREE.Vector3(1, y(s) - 0.025, 1 + 2 * path.splay(s))));
    });
    piers.castShadow = piers.receiveShadow = true; g.add(piers);
  }
  return g;
}

// the island platform at arc position c, with its canopy (between the two tracks, which splay round it)
export function layPlatform(path, c) {
  const g = new THREE.Group(), y = path.y, s0 = c - PLAT.len / 2, s1 = c + PLAT.len / 2;
  const top = (s) => y(s) + PLAT.top;
  g.add(shade(new THREE.Mesh(slab(path, s0, s1, () => -PLAT.half, () => PLAT.half, top, y, 0.05), TRACK.platform)));
  g.add(shade(new THREE.Mesh(mergeGeometries([-1, 1].map((sd) => strip(path, s0 + 0.01, s1 - 0.01, () => sd * PLAT.half - 0.006, () => sd * PLAT.half - 0.002, (s) => top(s) + 0.0006, 0.05))), TRACK.edge)));
  // the canopy over the middle two-thirds, on a row of posts
  const r0 = c - PLAT.len * 0.33, r1 = c + PLAT.len * 0.33;
  g.add(shade(new THREE.Mesh(slab(path, r0, r1, () => -PLAT.half + 0.006, () => PLAT.half - 0.006, (s) => top(s) + 0.085, (s) => top(s) + 0.08, 0.05), TRACK.roof)));
  const posts = [], a = [0, 0, 0, 0];
  for (let s = r0 + 0.04; s < r1; s += 0.14) { path.at(s, 0, a); posts.push(new THREE.CylinderGeometry(0.0035, 0.0035, 0.08, 6).translate(a[0], top(s) + 0.04, a[1])); }
  g.add(shade(new THREE.Mesh(mergeGeometries(posts), TRACK.post)));
  // two stairs down to the concourse, STAIR either side of the middle: a dark well between two low walls
  const well = [], walls = [], W = 0.013, D = 0.035;
  for (const k of [-1, 1]) {
    const s = c + k * STAIR, ang = () => Math.atan2(-a[3], a[2]);
    path.at(s, 0, a); well.push(new THREE.BoxGeometry(D * 2, 0.002, W * 2).rotateY(ang()).translate(a[0], top(s) + 0.0004, a[1]));
    for (const d of [-W, W]) { path.at(s, d, a); walls.push(new THREE.BoxGeometry(D * 2, 0.014, 0.003).rotateY(ang()).translate(a[0], top(s) + 0.007, a[1])); }
  }
  g.add(new THREE.Mesh(mergeGeometries(well), TRACK.well), shade(new THREE.Mesh(mergeGeometries(walls), TRACK.post)));
  return g;
}
export const STAIR = 0.2; // the stairs: this far either side of a platform's middle

function shade(o) { o.castShadow = o.receiveShadow = true; return o; }

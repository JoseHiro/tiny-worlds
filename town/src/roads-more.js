// Roads & towns — the rest of the road kit (town/DESIGN.md §2.1): 4 lanes, a taper from 4 to 2, a roundabout,
// a big curve, bridges and elevated roads, a tunnel, a bus bay, an alley, a farm road, parking, a river.
// Built from the same pieces as roads.js and finished by finishTile(), so their lanes join the same network.
import * as THREE from 'three';
import { mat, mesh, box, cyl } from '../../airport/src/parts.js';
import { TILE, H, R0, R1, CURB, LANE, M, raised, rect, stripe, strip, dashes, LEFT, tile, finishTile } from './roads.js';
import { trafficLight, lampSet, showLamps } from './gear.js';

const smooth = THREE.MathUtils.smoothstep;
const V2 = (x, z) => new THREE.Vector2(x, z);
const poly = (pts) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const p of pts.slice(1)) s.lineTo(...p); s.closePath(); return s; };
const walkUp = (g, shape) => g.add(raised(shape, M.walk, CURB));
const grassUp = (g, shape) => g.add(raised(shape, M.grass, CURB - 0.02));
const asphalt = (w, d, x = 0, z = 0) => mesh(new THREE.PlaneGeometry(w, d, Math.ceil(w), 2).rotateX(-Math.PI / 2), M.asphalt, x, 0, z);
// a lane through sample points (x, z), as local pts for finishTile
const lane = (f, n = 24) => Array.from({ length: n + 1 }, (_, i) => f(i / n));

// ---------- 4車線（中央分離帯）: 12 long, 16 wide (lanes ±2.05 inner, ±4.65 outer) ----------
export const LANES4 = { inner: 0.75 + LANE / 2, outer: 0.75 + LANE * 1.5, edge: 0.75 + LANE * 2 };
// crossing: a Signals controller → a signalled pedestrian crossing across the middle (cars stop at red; people cross on 'ns')
// medianGap: no median (a break where cars may turn across, e.g. into a rental-car office)
export function straight4({ crossing = null, medianGap = false, ...opts } = {}) {
  const g = new THREE.Group();
  const E = LANES4.edge, X = 1.4; // half-width of the crossing's gap in the median
  g.add(asphalt(TILE, E * 2));
  const median = (x0, x1) => {
    g.add(strip(x0, -0.75, x1, 0.75, CURB + 0.05, M.walk));
    g.add(strip(x0 + 0.15, -0.6, x1 - 0.15, 0.6, CURB + 0.08, M.grass));
    const shrub = mat(0x5f9446, { roughness: 1 });
    for (let x = x0 + 1; x < x1 - 0.5; x += 2.5) g.add(mesh(new THREE.SphereGeometry(0.42, 10, 8).scale(1, 0.7, 1), shrub, x, 0.4, 0));
  };
  if (crossing) { median(-H, -X); median(X, H); }
  else if (!medianGap) median(-H, H);
  for (const s of [1, -1]) {
    g.add(strip(-H, s * E, H, s * (E + 1.5), CURB, M.walk));
    g.add(strip(-H, s * (E + 1.5), H, s * 8, CURB - 0.02, M.grass));
    stripe(g, TILE, 0.1, 0, s * (E - 0.18));
    if (!medianGap) for (const [a, b] of crossing ? [[-H, -X], [X, H]] : [[-H, H]]) stripe(g, b - a, 0.1, (a + b) / 2, s * 0.92);
    else stripe(g, TILE, 0.12, 0, s * 0.12, 0, M.yellow); // a yellow centre line where the median breaks
    for (let x = -5; x < 6; x += 2) if (!crossing || Math.abs(x) > 2.5) stripe(g, 1.0, 0.1, x, s * (0.75 + LANE)); // lane divider
  }
  const local = [];
  if (crossing) {
    for (let z = -E + 0.45; z < E; z += 0.8) stripe(g, 2.2, 0.42, 0, z); // zebra across the whole road
    stripe(g, 0.3, E - 0.75, -X - 0.15, -(E + 0.75) / 2); // stop lines before it, on each side's lanes
    stripe(g, 0.3, E - 0.75, X + 0.15, (E + 0.75) / 2);
    // lanes in two halves: the second half carries the signal, so cars stop at the line
    for (const z of [LANES4.inner, LANES4.outer]) {
      local.push({ pts: lane((t) => V2(-H + t * (H - X), -z), 8) }, { pts: lane((t) => V2(-X + t * (H + X), -z), 12), group: 'ew' });
      local.push({ pts: lane((t) => V2(H - t * (H - X), z), 8) }, { pts: lane((t) => V2(X - t * (H + X), z), 12), group: 'ew' });
    }
    // a light for each direction on its far-left corner, with lamps shared by both
    const set = lampSet();
    for (const [x, z, ry] of [[X + 0.6, -(E + 0.9), Math.PI], [-X - 0.6, E + 0.9, 0]]) {
      const l = trafficLight(set, { arm: E - 1.2 });
      l.position.set(x, CURB, z); l.rotation.y = ry;
      g.add(l);
    }
    g.userData.crossingLamps = set;
  } else {
    for (const z of [LANES4.inner, LANES4.outer]) {
      local.push({ pts: lane((t) => V2(-H + t * TILE, -z)) });
      local.push({ pts: lane((t) => V2(H - t * TILE, z)) });
    }
  }
  const lamps = g.userData.crossingLamps;
  const t = finishTile(g, 'straight4', local, { ...opts, signals: crossing });
  if (crossing) t.userData.updateLights = (time) => { const car = crossing.state('ew'), walk = crossing.state('ns'); showLamps(lamps, car, walk === 'green' ? 'walk' : walk === 'yellow' ? 'blink' : 'stop', time); };
  return t;
}

// ---------- 4→2 車線のすりつけ: 4 lanes at the west end, 2 at the east ----------
export function taper(opts = {}) {
  const g = new THREE.Group();
  const k = (x) => smooth(x, -4, 4);
  const edge = (x) => THREE.MathUtils.lerp(LANES4.edge, R0, k(x));
  const med = (x) => THREE.MathUtils.lerp(0.75, 0, k(x));
  g.add(asphalt(TILE, 16));
  const xs = Array.from({ length: 13 }, (_, i) => -H + i);
  for (const s of [1, -1]) {
    walkUp(g, poly([...xs.map((x) => [x, s * edge(x)]), ...xs.slice().reverse().map((x) => [x, s * (edge(x) + 1.5)])]));
    grassUp(g, poly([...xs.map((x) => [x, s * (edge(x) + 1.5)]), [H, s * 8], [-H, s * 8]]));
    for (let i = 0; i < xs.length - 1; i++) { // edge line following the kerb
      const a = xs[i], b = xs[i + 1], za = s * (edge(a) - 0.18), zb = s * (edge(b) - 0.18);
      stripe(g, Math.hypot(1, zb - za), 0.1, (a + b) / 2, (za + zb) / 2, -Math.atan2(zb - za, 1));
    }
  }
  walkUp(g, poly([...xs.filter((x) => x <= 4).map((x) => [x, med(x)]), ...xs.filter((x) => x <= 4).reverse().map((x) => [x, -med(x)])]));
  dashes(g, 1, 0, 2, H);
  const zIn = (z0, z1) => (t) => { const x = -H + t * TILE; return V2(x, THREE.MathUtils.lerp(z0, z1, k(x))); };
  const local = [
    { pts: lane(zIn(-LANES4.outer, -R0 / 2)), priority: 1 }, // the outer lane ends and merges
    { pts: lane(zIn(-LANES4.inner, -R0 / 2)) },
    { pts: lane((t) => { const x = H - t * TILE; return V2(x, THREE.MathUtils.lerp(LANES4.outer, R0 / 2, k(x))); }) },
    { pts: lane((t) => { const x = H - t * TILE; return V2(x, THREE.MathUtils.lerp(LANES4.inner, R0 / 2, k(x))); }) },
  ];
  return finishTile(g, 'taper', local, opts);
}

// ---------- ロータリー: 3 × 3 cells (36), centred on a cell; arms meet the neighbours' ports ----------
// one lane round a planted island, clockwise seen from above (we drive on the left)
export function roundabout({ ring = 8, ...opts } = {}) {
  const g = new THREE.Group();
  const S = TILE * 1.5, rIn = ring - LANE, rOut = ring + LANE;
  g.add(mesh(new THREE.PlaneGeometry(S * 2, S * 2, 24, 24).rotateX(-Math.PI / 2), M.asphalt));
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    // quadrant pieces in (+,+) then mirrored
    const P = (x, z) => [sx * x, sz * z];
    const zc = (r, z) => Math.sqrt(r * r - z * z);
    const pts = [];
    pts.push(P(R0, S), P(R0, zc(rOut, R0)));
    for (let i = 1; i < 12; i++) { const a = THREE.MathUtils.lerp(Math.atan2(zc(rOut, R0), R0), Math.atan2(R0, zc(rOut, R0)), i / 12); pts.push(P(Math.cos(a) * rOut, Math.sin(a) * rOut)); }
    pts.push(P(zc(rOut, R0), R0), P(S, R0), P(S, R1), P(zc(rOut + 1.5, R1), R1));
    for (let i = 1; i < 12; i++) { const a = THREE.MathUtils.lerp(Math.atan2(R1, zc(rOut + 1.5, R1)), Math.atan2(zc(rOut + 1.5, R1), R1), i / 12); pts.push(P(Math.cos(a) * (rOut + 1.5), Math.sin(a) * (rOut + 1.5))); }
    pts.push(P(R1, zc(rOut + 1.5, R1)), P(R1, S));
    walkUp(g, poly(pts));
    const gpts = [P(R1, S), P(R1, zc(rOut + 1.5, R1))];
    for (let i = 1; i < 12; i++) { const a = THREE.MathUtils.lerp(Math.atan2(zc(rOut + 1.5, R1), R1), Math.atan2(R1, zc(rOut + 1.5, R1)), i / 12); gpts.push(P(Math.cos(a) * (rOut + 1.5), Math.sin(a) * (rOut + 1.5))); }
    gpts.push(P(zc(rOut + 1.5, R1), R1), P(S, R1), P(S, S));
    grassUp(g, poly(gpts));
  }
  // the island: a kerbed disc of grass and shrubs
  g.add(mesh(new THREE.CylinderGeometry(rIn, rIn, CURB + 0.06, 40), M.walk, 0, (CURB + 0.06) / 2, 0));
  g.add(mesh(new THREE.CylinderGeometry(rIn - 0.4, rIn - 0.4, CURB + 0.1, 40), M.grass, 0, (CURB + 0.1) / 2, 0));
  const shrub = mat(0x5f9446, { roughness: 1 }), flower = mat(0xe86a8a, { roughness: 1 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(0.5, 10, 8).scale(1, 0.7, 1), i % 2 ? flower : shrub, Math.cos(a) * (rIn - 1.2), 0.45, Math.sin(a) * (rIn - 1.2))); }
  // give-way lines at each entry, ring edge lines
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; if (i % 2) stripe(g, 0.12, 0.6, Math.cos(a) * (rOut - 0.2), Math.sin(a) * (rOut - 0.2), -a + Math.PI / 2); }
  // lanes: from each arm, into the ring (turning left), round clockwise, out at each other arm
  const arms = { E: V2(1, 0), S: V2(0, 1), W: V2(-1, 0), N: V2(0, -1) };
  const local = [];
  const ang = (v) => Math.atan2(v.y, v.x);
  for (const [a, da] of Object.entries(arms)) for (const [b, db] of Object.entries(arms)) {
    if (a === b) continue;
    const inLeft = LEFT(da.clone().negate()).multiplyScalar(LANE / 2), outLeft = LEFT(db).multiplyScalar(LANE / 2);
    const p0 = da.clone().multiplyScalar(S).add(inLeft), p1 = da.clone().multiplyScalar(rOut + 2).add(inLeft);
    const q1 = db.clone().multiplyScalar(rOut + 2).add(outLeft), q0 = db.clone().multiplyScalar(S).add(outLeft);
    let t0 = ang(da) + 0.45, t1 = ang(db) - 0.45;
    while (t1 <= t0) t1 += Math.PI * 2;
    const key = [new THREE.Vector3(p0.x, 0, p0.y), new THREE.Vector3(p1.x, 0, p1.y)];
    for (let i = 0; i <= 10; i++) { const t = THREE.MathUtils.lerp(t0, t1, i / 10); key.push(new THREE.Vector3(Math.cos(t) * ring, 0, Math.sin(t) * ring)); }
    key.push(new THREE.Vector3(q1.x, 0, q1.y), new THREE.Vector3(q0.x, 0, q0.y));
    const curve = new THREE.CatmullRomCurve3(key);
    const n = Math.round((t1 - t0) * 10) + 20;
    local.push({ pts: curve.getSpacedPoints(n).map((p) => V2(p.x, p.z)), turn: 'L', priority: 2 });
  }
  return finishTile(g, 'roundabout', local, opts);
}

// ---------- 大きなカーブ: 2 × 2 cells, centre-line radius 18 round the SW corner; from the west edge to the south edge ----------
export function curveBig(opts = {}) {
  const g = new THREE.Group();
  const S = TILE, R = 18, c = V2(-S, S);
  g.add(mesh(new THREE.PlaneGeometry(S * 2, S * 2, 24, 24).rotateX(-Math.PI / 2), M.asphalt));
  const ring = (r0, r1) => { const s = new THREE.Shape(); s.moveTo(c.x + r0, c.y); s.absarc(c.x, c.y, r0, 0, -Math.PI / 2, true); s.lineTo(c.x, c.y - r1); s.absarc(c.x, c.y, r1, -Math.PI / 2, 0, false); s.closePath(); return s; };
  walkUp(g, ring(R - R1, R - R0)); walkUp(g, ring(R + R0, R + R1));
  const inner = new THREE.Shape(); inner.moveTo(c.x, c.y); inner.lineTo(c.x + R - R1, c.y); inner.absarc(c.x, c.y, R - R1, 0, -Math.PI / 2, true); inner.closePath();
  grassUp(g, inner);
  const outer = new THREE.Shape(); outer.moveTo(c.x + R + R1, c.y); outer.lineTo(S, S); outer.lineTo(S, -S); outer.lineTo(-S, -S); outer.lineTo(c.x, c.y - R - R1); outer.absarc(c.x, c.y, R + R1, -Math.PI / 2, 0, false); outer.closePath();
  grassUp(g, outer);
  for (let a = 0.03; a < Math.PI / 2; a += 0.11) stripe(g, 0.12, 0.9, c.x + Math.cos(-a) * R, c.y + Math.sin(-a) * R, a);
  // guardrail along the outside of the bend
  const rail = mat(0xf0f0ec, { metalness: 0.4, roughness: 0.4 }), post = mat(0x9aa0a6);
  for (let a = 0.02; a < Math.PI / 2; a += 0.06) {
    const r = R + R1 - 0.25, x = c.x + Math.cos(-a) * r, z = c.y + Math.sin(-a) * r;
    g.add(box(0.08, 0.6, 0.08, post, x, 0.42, z));
    const seg = box(0.06, 0.18, r * 0.062, rail, x, 0.62, z); seg.rotation.y = a; g.add(seg);
  }
  // heading east at the west edge our lane is on the outside of the bend (r + 1.3); coming back it is inside
  const arcLane = (r, a0, a1) => lane((t) => { const a = THREE.MathUtils.lerp(a0, a1, t); return V2(c.x + Math.cos(-a) * r, c.y + Math.sin(-a) * r); }, 36);
  const local = [{ pts: arcLane(R + LANE / 2, Math.PI / 2, 0) }, { pts: arcLane(R - LANE / 2, 0, Math.PI / 2) }];
  return finishTile(g, 'curveBig', local, opts);
}

// ---------- 橋・高架 (a straight on a deck), with railings and piers; height = how far the ground is below ----------
export function bridge({ height = 2.2, piers = true, ...opts } = {}) {
  const t = tile('straight', { ...opts, verge: false });
  const concrete = mat(0xc9c5bc, { roughness: 0.9 }), dark = mat(0x9b978f);
  t.add(box(TILE, 0.5, R1 * 2 + 0.3, concrete, 0, -0.28, 0)); // (its top just under the road, so they don't flicker)
  const rail = mat(0xe8e6e0, { roughness: 0.6 });
  for (const s of [1, -1]) {
    t.add(box(TILE, 0.5, 0.18, concrete, 0, CURB + 0.25, s * (R1 + 0.06)));
    for (let x = -H + 0.5; x < H; x += 1.0) t.add(box(0.08, 0.5, 0.08, rail, x, CURB + 0.75, s * (R1 + 0.06)));
    t.add(box(TILE, 0.08, 0.12, rail, 0, CURB + 1.02, s * (R1 + 0.06)));
  }
  if (piers) {
    t.add(box(1.0, height - 0.5, 1.6, dark, 0, -0.5 - (height - 0.5) / 2, 0));
    t.add(box(0.8, 0.4, R1 * 2, dark, 0, -0.7, 0));
  }
  return t;
}

// ---------- トンネル: a straight under a hill, with portals at both ends and lights in the roof ----------
export function tunnel(opts = {}) {
  const t = tile('straight', opts);
  const r = R1 + 0.4;
  const lining = mat(0xd8d3c8, { roughness: 0.9, side: THREE.DoubleSide });
  const shell = mesh(new THREE.CylinderGeometry(r, r, TILE, 28, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), lining);
  t.add(shell);
  for (let x = -5; x <= 5; x += 2.5) t.add(box(0.8, 0.06, 0.25, mat(0xfff1c8, { emissive: 0xfff1c8, emissiveIntensity: 1.6 }), x, r - 0.12, -1.0));
  // the hill over it
  const hill = mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(H + 0.2, r + 1.6, H + 4), mat(0x8fb86e, { roughness: 1, flatShading: true }));
  hill.material.side = THREE.FrontSide;
  t.add(hill);
  // portals: a concrete face with the arch cut out
  for (const x of [-H, H]) {
    const face = new THREE.Shape(); face.moveTo(-H - 1.2, 0); face.lineTo(H + 1.2, 0); face.lineTo(H + 1.2, r + 1.8); face.lineTo(-H - 1.2, r + 1.8); face.closePath();
    const hole = new THREE.Path(); hole.moveTo(-r, 0); hole.absarc(0, 0, r, Math.PI, 0, true); hole.lineTo(r, 0); hole.closePath();
    face.holes.push(hole);
    const p = mesh(new THREE.ExtrudeGeometry(face, { depth: 0.5, bevelEnabled: false }).rotateY(Math.PI / 2), mat(0xbab5aa, { roughness: 0.9 }));
    p.position.x = x - 0.25;
    t.add(p);
  }
  return t;
}

// ---------- バス停の切り込み: a straight whose kerb steps back on the left for buses to pull in ----------
export function busBay(opts = {}) {
  const g = new THREE.Group();
  const D = 2.0; // how far the bay goes in
  g.add(asphalt(TILE, TILE));
  g.add(strip(-H, R0, H, R1, CURB, M.walk));
  g.add(strip(-H, R1, H, H, CURB - 0.02, M.grass));
  // the bay side (−z, our left when heading east)
  const kerb = [[-H, -R0], [-4.6, -R0], [-3.1, -R0 - D], [3.1, -R0 - D], [4.6, -R0], [H, -R0]];
  const back = [[H, -R1], [4.7, -R1], [3.3, -H], [-3.3, -H], [-4.7, -R1], [-H, -R1]];
  walkUp(g, poly([...kerb, ...back]));
  grassUp(g, poly([[H, -R1], [H, -H], [3.3, -H], [4.7, -R1]]));
  grassUp(g, poly([[-H, -R1], [-4.7, -R1], [-3.3, -H], [-H, -H]]));
  dashes(g, 1, 0, -H, H);
  stripe(g, TILE, 0.1, 0, R0 - 0.18);
  for (const [a, b] of [[-H, -4.6], [4.6, H]]) stripe(g, b - a, 0.1, (a + b) / 2, -(R0 - 0.18));
  stripe(g, 6.2, 0.1, 0, -(R0 + D - 0.18));
  const bump = (x) => smooth(x, -5.2, -2.6) * (1 - smooth(x, 2.6, 5.2));
  const local = [
    { pts: lane((t) => V2(-H + t * TILE, -R0 / 2)) },
    { pts: lane((t) => V2(H - t * TILE, R0 / 2)) },
    { pts: lane((t) => { const x = -H + t * TILE; return V2(x, -R0 / 2 - D * bump(x)); }, 36), busOnly: true, priority: 1, stop: 6.6 },
  ];
  const t = finishTile(g, 'busBay', local, opts);
  // where the bay lane rejoins the road: a bus pulling out gives way to traffic coming up behind
  const [main, , bay] = t.userData.paths;
  const j = bay.pts.findIndex((p, i) => i > bay.pts.length / 2 && main.pts.some((q) => q.distanceTo(p) < 0.3));
  const k = main.pts.reduce((best, q, i) => (q.distanceTo(bay.pts[j]) < main.pts[best].distanceTo(bay.pts[j]) ? i : best), 0);
  bay.rejoin = { other: main, sSelf: bay.cum[j], sOther: main.cum[k] };
  t.userData.stopAt = new THREE.Vector3(0.6, CURB, -R0 - D - 0.9); // where the bus stop sign and shelter go (local)
  return t;
}

// ---------- 路地: a narrow paved lane between block walls, for people (no cars) ----------
export function alley(opts = {}) {
  const g = new THREE.Group();
  const W = 3.5;
  g.add(strip(-H, -W / 2, H, W / 2, 0.04, mat(0xcfcac0, { roughness: 0.95 })));
  for (const s of [1, -1]) g.add(strip(-H, s * (W / 2 - 0.25), H, s * W / 2, 0.06, mat(0x8f8b84)));
  for (let x = -4.5; x <= 4.5; x += 3) g.add(box(0.5, 0.07, 0.4, mat(0x6d6a65, { metalness: 0.4 }), x, 0.05, W / 2 - 0.12)); // drain covers
  g.add(strip(-H, W / 2, H, H, 0.02, M.grass));
  g.add(strip(-H, -H, H, -W / 2, 0.02, M.grass));
  return finishTile(g, 'alley', [], opts);
}

// ---------- 農道: a gravel farm track (it still joins the 2-lane network: lanes at ±1.3) ----------
export function farmRoad(opts = {}) {
  const g = new THREE.Group();
  g.add(strip(-H, -H, H, H, 0.02, M.grass));
  g.add(strip(-H, -2.2, H, 2.2, 0.035, mat(0xcdb894, { roughness: 1 })));
  for (const z of [-1.9, -0.7, 0.7, 1.9]) g.add(strip(-H, z - 0.25, H, z + 0.25, 0.04, mat(0xb39e78, { roughness: 1 }))); // ruts
  g.add(strip(-H, -0.3, H, 0.3, 0.06, mat(0x8fb86e, { roughness: 1 }))); // grass down the middle
  const local = [{ pts: lane((t) => V2(-H + t * TILE, -R0 / 2)) }, { pts: lane((t) => V2(H - t * TILE, R0 / 2)) }];
  return finishTile(g, 'farmRoad', local, opts);
}

// ---------- 駐車場: rows of bays either side of an aisle; returns bays to put cars in ----------
export function parkingLot({ cols = 6, rows = 2, bay = 1.5, depth = 3.0, aisle = 5.2 } = {}) {
  const g = new THREE.Group();
  const w = cols * bay + 1.2, d = rows * depth + (rows > 1 ? aisle : 2) + 1.2;
  g.add(box(w, 0.04, d, mat(0x5a5e65, { roughness: 0.95 }), 0, 0.02, 0));
  const white = mat(0xf4f0e8), stop = mat(0xd8d2c4);
  const bays = [];
  for (let r = 0; r < rows; r++) {
    const s = r === 0 ? -1 : 1, zc = s * (aisle / 2 + depth / 2);
    for (let i = 0; i <= cols; i++) g.add(box(0.07, 0.012, depth, white, -cols * bay / 2 + i * bay, 0.045, zc));
    g.add(box(cols * bay, 0.012, 0.07, white, 0, 0.045, zc + s * depth / 2));
    for (let i = 0; i < cols; i++) {
      const x = -cols * bay / 2 + (i + 0.5) * bay;
      g.add(box(0.7, 0.1, 0.14, stop, x, 0.09, zc + s * (depth / 2 - 0.3)));
      bays.push({ pos: new THREE.Vector3(x, 0, zc), ry: s > 0 ? -Math.PI / 2 : Math.PI / 2 }); // nose toward the wheel stop
    }
  }
  const lamp = mat(0xfff1c8, { emissive: 0xfff1c8, emissiveIntensity: 0.8 });
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) { g.add(cyl(0.06, 0.08, 4.2, mat(0x9aa0a6), x, 2.1, 0, 8)); g.add(box(0.8, 0.12, 0.3, lamp, x + (x < 0 ? 0.35 : -0.35), 4.2, 0)); }
  g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
  g.userData = { kind: 'parking', bays };
  return g;
}

// ---------- 川: a river across a tile, with grassy banks (for bridges) ----------
export function river({ w = TILE, d = TILE, width = 6, depth = 1.6 } = {}) {
  const g = new THREE.Group();
  const bank = mat(0x9fc47c, { roughness: 1, flatShading: true });
  const prof = [[-d / 2, 0], [-width / 2 - 1.2, 0], [-width / 2, -depth], [width / 2, -depth], [width / 2 + 1.2, 0], [d / 2, 0]];
  const sh = poly(prof.map(([z, y]) => [z, y]).concat([[d / 2, -depth - 0.4], [-d / 2, -depth - 0.4]]));
  const ground = mesh(new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }).translate(0, 0, -w / 2).rotateY(Math.PI / 2), bank);
  g.add(ground);
  const water = mesh(new THREE.PlaneGeometry(w, width + 1.6).rotateX(-Math.PI / 2), mat(0x3f9fb8, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }), 0, -depth + 0.55, 0);
  g.add(water);
  g.userData = { kind: 'river' };
  return g;
}

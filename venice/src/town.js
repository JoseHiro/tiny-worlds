// The town on its square board (venice/DESIGN.md §1.1, §4). The Grand Canal comes in from the east edge, sweeps west
// under the great stone bridge, bends south and runs out into the lagoon along the south edge. Side canals cut the land
// into islands. South-east, by the lagoon: the great square with the domed church at its head, the bell tower at its
// corner, the arcade, the palace by the little square that opens on the water, the two columns. Elsewhere houses line
// the canals (fronts straight out of the water on the Grand Canal, quays along the side canals), with small squares:
// a market by the bridge, a square with a well and a glass furnace, another with a café and the masks.
// Units: a person is 0.58 tall. x east, z south (toward the viewer). Water at y = 0, land at LAND.
import * as THREE from 'three';
import { IKit, MAT, G, C, WALLS, LAND, bake } from './kit.js';
import { house, campanile, basilica, palace, arcade, columns, stoneBridge, woodBridge, bigBridge, sighsBridge, pole } from './house.js';
import { wellhead, lantern, signpost, cafeTable, bandstand, marketStall, maskStand, gelato, furnace, washing, handcart, bench, postBox, planters, bricola, pontoon, gondolaPier } from './props.js';
import { waterMat } from './water.js';
import { motorBoat, gondola } from './boats.js';
import { summer } from './people.js';

export const HALF = 15;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V2 = (x, z) => new THREE.Vector2(x, z);

// ---- the water's shape ----
// the Grand Canal: a smooth line through these points, 3.6 wide
const GC_PTS = [[16.5, -9.2], [11, -9], [6, -7.2], [1, -6.3], [-4, -6.5], [-8.2, -4], [-9.6, 0.5], [-8.6, 5.5], [-7.2, 9], [-6.8, 12.5], [-6.8, 17]];
export const GC_W = 3.6;
const curve = new THREE.CatmullRomCurve3(GC_PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
export const GC = curve.getSpacedPoints(400).map((p) => V2(p.x, p.z)); // (the centre line, evenly spaced)
// side canals: straight, 1.4 wide
export const RIO_W = 1.4;
export const RIOS = [
  { a: [1, -16], b: [1, -7.4] }, // north: between the two northern islands
  { a: [1, -12.2], b: [16, -12.2] }, // north-east
  { a: [-16, 4.5], b: [-9.5, 4.5] }, // west
  { a: [-1.4, -4.6], b: [-1.4, 16] }, // between the canal's last reach and the great square
  { a: [-16, -9.8], b: [-7.6, -9.8] }, // north-west
];
export const lagoonZ = (x) => 11.2 + Math.sin(x * 0.45) * 0.25;
const segDist = (px, pz, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
export function gcNear(x, z) { // distance to the Grand Canal's centre line, the nearest point's index
  let best = 1e9, bi = 0;
  for (let i = 0; i < GC.length; i += 2) { const d = (GC[i].x - x) ** 2 + (GC[i].y - z) ** 2; if (d < best) { best = d; bi = i; } }
  return [Math.sqrt(best), bi];
}
// how far a point is inside the land (negative: in the water)
export function landDepth(x, z) {
  let d = gcNear(x, z)[0] - GC_W / 2;
  for (const r of RIOS) d = Math.min(d, segDist(x, z, r.a, r.b) - RIO_W / 2);
  d = Math.min(d, lagoonZ(x) - z);
  return d;
}
export const isLand = (x, z) => landDepth(x, z) > 0;

// ---- places kept free of houses: [x0, z0, x1, z1] ----
export const PLAZA = [0.2, -1.4, 15.6, 11.4]; // the great square, the church, the palace, the little square
export const CAMPI = { market: [3.2, -11.2, 8.6, -8.2], well: [-14.6, -3.4, -11.0, 0.6], cafe: [-6.6, -13.6, -2.2, -11.0] };
const RESERVED = [PLAZA, ...Object.values(CAMPI)];
const reservedAt = (x, z, pad = 0) => RESERVED.some(([x0, z0, x1, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad);

// an occupancy grid for placing things without overlaps (0.25 cells)
const OCC = new Uint8Array(124 * 124), cell = (v) => Math.floor((v + HALF + 0.5) * 4);
const occ = (x, z) => { const i = cell(x), j = cell(z); return i < 0 || j < 0 || i >= 124 || j >= 124 ? 1 : OCC[j * 124 + i]; };
const mark = (x, z) => { const i = cell(x), j = cell(z); if (i >= 0 && j >= 0 && i < 124 && j < 124) OCC[j * 124 + i] = 1; };
// sample a rotated rectangle (w across, d deep, facing `ry`), call f at each point; frontSlack lets the front stand in water
function footprint(x, z, w, d, ry, f, frontSlack = 0) {
  const ax = Math.cos(ry), az = -Math.sin(ry), fx = Math.sin(ry), fz = Math.cos(ry);
  for (let u = -w / 2 + 0.1; u <= w / 2 - 0.1 + 1e-6; u += 0.22) for (let v = -d / 2 + 0.1; v <= d / 2 - 0.1 - frontSlack + 1e-6; v += 0.22) if (f(x + ax * u + fx * v, z + az * u + fz * v) === false) return false;
  return true;
}
const fits = (x, z, w, d, ry, slack) => footprint(x, z, w, d, ry, (px, pz) => (Math.abs(px) < HALF - 0.3 && Math.abs(pz) < HALF - 0.3 && landDepth(px, pz) > 0.02 && !reservedAt(px, pz) && !occ(px, pz)) || false, slack);
const claim = (x, z, w, d, ry, pad = 0.12) => footprint(x, z, w + pad * 2, d + pad * 2, ry, (px, pz) => { mark(px, pz); });
const claimRect = ([x0, z0, x1, z1]) => { for (let x = x0; x <= x1; x += 0.2) for (let z = z0; z <= z1; z += 0.2) mark(x, z); };

const SIZES = { palazzo: [3.0, 2.2], medium: [2.2, 1.8], narrow: [1.2, 1.6], corner: [1.8, 1.8], warehouse: [2.6, 2.0] };
const pick = (weights) => { let r = rnd() * weights.reduce((s, [, w]) => s + w, 0); for (const [k, w] of weights) if ((r -= w) <= 0) return k; return weights[0][0]; };

// ---- the board: land and canal beds as one height field, the water over it, the board's cut sides ----
function ground(root) {
  const N = 240, W = HALF * 2, g = new THREE.PlaneGeometry(W, W, N, N).rotateX(-Math.PI / 2), p = g.attributes.position, n = p.count;
  const cols = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), d = landDepth(x, z);
    p.setY(i, d > 0 ? LAND : -0.62);
    const inPlaza = x > PLAZA[0] && x < PLAZA[2] && z > PLAZA[1] && z < PLAZA[3];
    if (d <= 0) c.set(0x1f4a44);
    else if (d < 0.3) c.set(C.stone); // the white stone edge of every quay
    else if (inPlaza) { const sx = ((x - 0.2) * 0.5) % 1, sz = ((z + 1.4) * 0.5) % 1; c.set(sx < 0.06 || sz < 0.06 ? 0xefe9de : 0xc4bcae); } // (the square's pale stripes)
    else c.set(C.paving);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, MAT.stone); m.receiveShadow = true; root.add(m);
  // the board's base and its four cut sides: water-green where the water runs off the edge, stone where land does
  const k = new IKit(); k.box(W + 0.5, 0.45, W + 0.5, 0xd9c9a8, 0, -0.95, 0, { r: 0.18 }); root.add(k.mesh(MAT.plain, { cast: false }));
  const sides = new THREE.Group();
  for (const [sx, sz, ry] of [[0, HALF, 0], [0, -HALF, Math.PI], [HALF, 0, Math.PI / 2], [-HALF, 0, -Math.PI / 2]]) {
    const sg = new THREE.PlaneGeometry(W, 1, N, 1), sp = sg.attributes.position, sc = new Float32Array(sp.count * 3);
    for (let i = 0; i < sp.count; i++) {
      const u = sp.getX(i), top = sp.getY(i) > 0;
      const wx = sx + Math.cos(ry) * u, wz = sz - Math.sin(ry) * u, land = landDepth(wx, wz) > 0;
      sp.setY(i, top ? (land ? LAND : 0) : -0.75);
      c.set(top ? (land ? C.stone : 0x3fa79a) : (land ? 0x9a8f80 : 0x1f5f58)); sc.set([c.r, c.g, c.b], i * 3);
    }
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3)); sg.computeVertexNormals();
    const s = new THREE.Mesh(sg, MAT.plain); s.position.set(sx, 0, sz); s.rotation.y = ry; sides.add(s);
  }
  root.add(sides);
}
// the water: one sheet over the whole board, the lagoon's colour where it's lagoon, with the houses' colours near the banks
function water(scene, houses) {
  const N = 150, W = HALF * 2, mk = (kind, keep) => {
    const g = new THREE.PlaneGeometry(W, W, N, N).rotateX(-Math.PI / 2), p = g.attributes.position, n = p.count;
    const edge = new Float32Array(n), tint = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let best = 2.2, col = null;
      for (const h of houses) { const d = Math.hypot(x - h.fx, z - h.fz); if (d < best) { best = d; col = h.col; } }
      if (col !== null) { edge[i] = Math.max(0, 1 - best / 2.2); c.set(col); tint.set([c.r, c.g, c.b], i * 3); }
    }
    g.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1)); g.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
    // keep only the triangles of this kind of water (lagoon: south of the shore line; canal: the rest)
    const idx = g.index.array, out = [];
    for (let t = 0; t < idx.length; t += 3) { const a = idx[t]; const x = (p.getX(a) + p.getX(idx[t + 1]) + p.getX(idx[t + 2])) / 3, z = (p.getZ(a) + p.getZ(idx[t + 1]) + p.getZ(idx[t + 2])) / 3; if (keep(x, z)) out.push(idx[t], idx[t + 1], idx[t + 2]); }
    g.setIndex(out);
    const m = new THREE.Mesh(g, waterMat(kind)); m.receiveShadow = true; scene.add(m); return m;
  };
  const lag = (x, z) => z > lagoonZ(x) - 0.6 && gcNear(x, z)[0] > GC_W / 2 + 0.3;
  mk('lagoon', lag);
  mk('canal', (x, z) => !lag(x, z) && gcNear(x, z)[0] <= GC_W / 2 + 0.6);
  mk('side', (x, z) => !lag(x, z) && gcNear(x, z)[0] > GC_W / 2 + 0.6);
}

export function town(scene) {
  const stat = new THREE.Group(); // everything that never moves (baked at the end)
  const moving = []; // things with userData.update
  const houses = []; // { fx, fz, col } the middle of each front, for the reflections
  const put = (o, x, z, ry = 0, y = LAND) => { o.position.set(x, y, z); o.rotation.y = ry; (o.userData.update ? (scene.add(o), moving.push(o)) : stat.add(o)); return o; };
  ground(stat);

  // ---- the great square ----
  claimRect(PLAZA); for (const r of Object.values(CAMPI)) claimRect(r);
  put(basilica(), 5.6, 0.6, 0);
  put(campanile(), 10.2, 3.4, 0);
  put(arcade(5.5), 1.4, 5.6, Math.PI / 2); // the west side, facing east into the square
  put(arcade(4.2), 3.6, 9.6, Math.PI); // the south side, facing north
  put(palace(), 12.6, 8.7, 0); // facing the lagoon, its side on the little square
  put(columns(), 7.6, 10.4, 0);
  put(bandstand(), 3.4, 3.4, Math.PI / 2);
  for (const [x, z] of [[4.4, 2.5], [5.4, 2.6], [4.6, 4.3], [5.6, 4.4], [4.9, 6.0], [6.0, 6.2], [2.9, 7.4], [4.1, 7.6]]) put(cafeTable(rnd() < 0.5 ? 0xf4efe4 : 0xa8202c), x, z, rnd() * 3);
  for (const [x, z] of [[8.4, 6.4], [6.4, 8.4], [9.6, 5.2]]) put(lantern(false), x, z, 0);
  put(maskStand(), 8.6, 1.5, -0.3); put(gelato(), 12.0, 4.4, -Math.PI / 2);
  // the waterfront promenade along the lagoon, its lamps and benches
  for (let x = -5; x < 14; x += 3.2) if (isLand(x, 10.6)) put(lantern(false), x, lagoonZ(x) - 0.5, Math.PI);
  for (const x of [-3.6, 6.0]) put(bench(), x, lagoonZ(x) - 1.0, Math.PI);

  // ---- the little squares ----
  { const [x0, z0, x1, z1] = CAMPI.market; put(marketStall('fruit'), x0 + 1.2, z0 + 1.5, 0.2); put(marketStall('fish'), x0 + 3.0, z0 + 1.3, -0.1); put(marketStall('fruit'), x1 - 1.1, z0 + 1.6, -0.3); put(handcart(), x0 + 2.2, z1 - 0.5, 1.2); }
  { const [x0, z0, x1, z1] = CAMPI.well; put(wellhead(), (x0 + x1) / 2, (z0 + z1) / 2, 0); put(furnace(), x0 + 0.7, z0 + 0.7, 0.6); put(planters(), x1 - 0.6, z1 - 0.4, Math.PI); put(signpost(), x1 - 0.4, z0 + 0.4, -0.6); put(bench(), x0 + 0.8, z1 - 0.5, Math.PI); }
  { const [x0, z0, x1, z1] = CAMPI.cafe; for (const [x, z] of [[x0 + 1, z0 + 1.1], [x0 + 2.2, z0 + 1.6], [x0 + 1.4, z1 - 0.7]]) put(cafeTable(0x3f7a5a), x, z, rnd() * 3); put(maskStand(), x1 - 0.5, z0 + 0.8, -Math.PI / 2); put(wellhead(), x1 - 1.2, z1 - 0.9, 0); put(postBox(), x0 + 0.2, z1 - 0.2, 0); }

  // ---- bridges ----
  const bridges = []; let big = null;
  const bridgeAt = (b, x, z, ry, reach) => { put(b, x, z, ry, LAND - 0.12); // (its ends meet the quays)
    bridges.push([x, z]); const ax = Math.cos(ry), az = -Math.sin(ry); for (let u = -reach; u <= reach; u += 0.2) for (let v = -0.9; v <= 0.9; v += 0.2) mark(x + ax * u - az * v, z + az * u + ax * v); };
  { const [, i] = gcNear(3.2, -6.4), a = GC[i], b = GC[Math.min(GC.length - 1, i + 4)]; const ang = Math.atan2(b.y - a.y, b.x - a.x); const bg = bigBridge(), ry = -ang + Math.PI / 2; bridgeAt(bg, a.x, a.y, ry, 4.4); big = { x: a.x, z: a.y, ry, top: bg.userData.top }; }
  { const [, i] = gcNear(-9.0, 6.6), a = GC[i], b = GC[Math.min(GC.length - 1, i + 4)]; const ang = Math.atan2(b.y - a.y, b.x - a.x); bridgeAt(woodBridge(4.4), a.x, a.y, -ang + Math.PI / 2, 3.6); }
  bridgeAt(stoneBridge(1.6), 1, -13.6, 0, 1.8);
  bridgeAt(stoneBridge(1.6), 6.5, -12.2, Math.PI / 2, 1.8);
  bridgeAt(stoneBridge(1.6), -12.8, 4.5, Math.PI / 2, 1.8);
  bridgeAt(stoneBridge(1.6), -1.4, 0.6, 0, 1.8);
  bridgeAt(stoneBridge(1.6), -1.4, 10.0, 0, 1.8);
  bridgeAt(stoneBridge(1.6), -11.5, -9.8, Math.PI / 2, 1.8);
  { const s = sighsBridge(); put(s, -1.4, 6.4, 0, -0.25); for (let x = -3; x <= 0.2; x += 0.2) for (let z = 5.6; z <= 7.2; z += 0.2) mark(x, z); }

  // ---- houses ----
  const addHouse = (kind, x, z, ry, front = true) => {
    const [w, d] = SIZES[kind], col = WALLS[Math.floor(rnd() * WALLS.length)];
    const h = house(kind, { col, seed: Math.floor(rnd() * 1000) }); h.position.set(x, -0.25, z); h.rotation.y = ry; stat.add(h);
    claim(x, z, w, d, ry);
    if (front) houses.push({ fx: x + Math.sin(ry) * d / 2, fz: z + Math.cos(ry) * d / 2, col });
    return h;
  };
  // along the Grand Canal: fronts straight out of the water, facing it
  for (const side of [-1, 1]) for (let i = 4; i < GC.length - 4;) {
    const a = GC[i], b = GC[i + 2], tx = b.x - a.x, tz = b.y - a.y, l = Math.hypot(tx, tz), nx = -tz / l * side, nz = tx / l * side;
    const kind = pick([['palazzo', 4], ['medium', 3], ['narrow', 2], ['warehouse', 1]]), [w, d] = SIZES[kind];
    const off = GC_W / 2 + d / 2 - 0.12, x = a.x + nx * off, z = a.y + nz * off, ry = Math.atan2(-nx, -nz);
    if (fits(x, z, w, d, ry, 0.3)) { addHouse(kind, x, z, ry); i += Math.max(2, Math.round((w + 0.08) / (curve.getLength() / 400))); }
    else i += 2;
  }
  // along the side canals: a quay in front on one side, fronts out of the water on the other
  RIOS.forEach((r, ri) => {
    const [ax, az] = r.a, [bx, bz] = r.b, L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
    for (const side of [-1, 1]) {
      const quay = (ri + (side > 0 ? 1 : 0)) % 2 === 0;
      for (let s = 0.6; s < L - 0.6;) {
        const kind = pick([['medium', 3], ['narrow', 4], ['corner', 2]]), [w, d] = SIZES[kind];
        const nx = -tz * side, nz = tx * side, off = RIO_W / 2 + d / 2 + (quay ? 0.9 : -0.1);
        const x = ax + tx * (s + w / 2) + nx * off, z = az + tz * (s + w / 2) + nz * off, ry = Math.atan2(-nx, -nz);
        if (fits(x, z, w, d, ry, quay ? 0 : 0.25)) { addHouse(kind, x, z, ry); s += w + 0.06; } else s += 0.4;
      }
    }
  });
  // along the lagoon, west of the canal's mouth and between it and the square: a promenade, then houses
  for (let x = -14.6; x < 0; x += 0.4) {
    const kind = pick([['palazzo', 2], ['medium', 3], ['narrow', 2]]), [w, d] = SIZES[kind], z = lagoonZ(x + w / 2) - 1.0 - d / 2;
    if (fits(x + w / 2, z, w, d, 0, 0)) { addHouse(kind, x + w / 2, z, 0); x += w - 0.34; }
  }
  // and fill what land is left: houses facing whichever way is open
  for (let z = -14.2; z < 13; z += 0.7) for (let x = -14.2; x < 14.5; x += 0.7) {
    if (!isLand(x, z) || occ(x, z) || reservedAt(x, z)) continue;
    const kind = pick([['narrow', 3], ['medium', 2], ['corner', 1]]), [w, d] = SIZES[kind];
    for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) if (fits(x, z, w, d, ry, 0)) { addHouse(kind, x, z, ry, false); break; }
  }

  // ---- by the water: poles in front of the palazzi, boats tied up, the lagoon's posts, the pontoon, the gondola pier ----
  const pk = { plain: new IKit(), gold: new IKit() };
  houses.forEach((h, i) => { if (i % 3 || landDepth(h.fx, h.fz) > 0.4) return; const col = [C.poleBlue, C.poleRed, C.shutter][i % 3]; for (const s of [-0.35, 0.35]) { const [x, z] = [h.fx + s, h.fz + 0.3]; if (landDepth(x, z) < -0.25 && gcNear(x, z)[0] > 0.9) pole(pk, x, z, col, 1.3); } });
  for (const k in pk) { const m = pk[k].mesh(MAT[k]); if (m) stat.add(m); }
  for (const [x, z] of [[-2, 13.4], [4, 14.2], [10, 13.6], [-12, 13.8], [14, 14.4]]) put(bricola(), x, z, rnd() * 3, 0);
  put(pontoon(), 4.4, lagoonZ(4.4) + 0.95, 0, 0);
  put(gondolaPier(4), -10.6, lagoonZ(-10.6) + 0.2, Math.PI / 2, 0);
  const moored = [];
  for (let i = 0; i < 4; i++) { const g = gondola({ crew: false }); g.position.set(-12.0 + i * 0.68, 0, lagoonZ(-12) + 1.5); g.rotation.y = -Math.PI / 2; scene.add(g); moving.push(g); moored.push(g); }
  for (const [x, z, ry, col] of [[1.9, -10.5, Math.PI / 2, 0x3f8f9a], [-0.5, 3.2, -Math.PI / 2, 0x5a7ad6], [-14.2, 5.2, 0, 0xc9965a], [9.5, -11.6, 0, 0x4f9a6a]]) { const b = motorBoat(col); b.position.set(x, 0, z); b.rotation.y = ry; scene.add(b); moving.push(b); }

  // ---- washing over the alleys, lamps on the walls ----
  for (const [x, z, ry] of [[-6.2, -8.2, 0.3], [9.2, -14.0, 0], [-12.6, 8.6, 1.2], [-3.2, -1.2, 1.57]]) { const w = washing(1.6, 2.6); w.position.set(x, LAND, z); w.rotation.y = ry; scene.add(w); moving.push(w); }

  scene.add(bake(stat));
  water(scene, houses);
  return { moving, houses, bridges, big };
}

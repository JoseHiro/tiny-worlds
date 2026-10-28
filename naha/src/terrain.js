// Naha sea — the seabed and the cut-open block it sits in.
// The block is 90 (x) × 60 (z). North (−Z) is the open ocean, south (+Z) the beach.
// Water surface at y = 0.
import * as THREE from 'three';

export const BLOCK = { w: 90, d: 60, base: -11 };
export const x0 = -BLOCK.w / 2, z0 = -BLOCK.d / 2;

const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

// Height of the seabed / beach at (x, z).
export function bedHeight(x, z) {
  const zs = z + Math.sin(x * 0.07) * 2.6 + Math.sin(x * 0.19 + 1.3) * 0.8; // wavy shoreline and reef edge
  // beach (dry) → shore slope → lagoon → reef flat → drop-off → deep
  let h;
  if (zs > 18) h = 0.3 + (zs - 18) * 0.06;
  else if (zs > 12) h = THREE.MathUtils.lerp(-0.55, 0.3, smooth(12, 18, zs));
  else if (zs > -6) h = THREE.MathUtils.lerp(-1.25, -0.55, smooth(-6, 12, zs));
  else if (zs > -16) h = -1.25 - smooth(-6, -16, zs) * 0.35;
  else h = THREE.MathUtils.lerp(-9.2, -1.6, smooth(-24, -16, zs));
  // sand ripples in the lagoon, lumpy rock on the reef, a channel through the reef
  if (zs > -6 && zs < 12) h += Math.sin(x * 0.9 + z * 0.3) * 0.03;
  if (zs <= -6 && zs > -18) h += (Math.sin(x * 0.55) * Math.cos(z * 0.7) + Math.sin(x * 1.3 + z * 0.9) * 0.5) * 0.18;
  const channel = Math.exp(-((x - 14) ** 2) / 18);
  if (zs < 2 && zs > -20) h -= channel * 0.9 * smooth(2, -8, zs);
  return h;
}

// Seabed colour by height and zone.
const C = {
  dry: new THREE.Color('#f6ead0'), wet: new THREE.Color('#e7d4aa'), sand: new THREE.Color('#ecdcb6'),
  reef: new THREE.Color('#cdb894'), rock: new THREE.Color('#a99a7c'), deep: new THREE.Color('#9fa595'),
};
function bedColor(x, z, h, out) {
  if (h > 0.35) return out.copy(C.dry);
  if (h > 0.02) return out.copy(C.wet).lerp(C.dry, (h - 0.02) / 0.33);
  if (h > -1.0) return out.copy(C.sand);
  if (h > -2.2) {
    const n = Math.sin(x * 0.8) * Math.sin(z * 0.6) * 0.5 + 0.5;
    return out.copy(C.reef).lerp(C.rock, n * 0.6);
  }
  return out.copy(C.rock).lerp(C.deep, Math.min(1, (-h - 2.2) / 5));
}

export function seabed(material) {
  const nx = 180, nz = 120;
  const geo = new THREE.PlaneGeometry(BLOCK.w, BLOCK.d, nx, nz).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = bedHeight(x, z);
    pos.setY(i, h);
    bedColor(x, z, h, c);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}

// Seabed heights as a texture, for the water shader (water depth at any point).
export function bedTexture(n = 256) {
  const data = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = x0 + (i / (n - 1)) * BLOCK.w;
    const z = -z0 - (j / (n - 1)) * BLOCK.d; // v = 0 at the south edge (matches the water plane uv)
    data[j * n + i] = bedHeight(x, z);
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.FloatType);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// The cut faces of the block: earth below the seabed, and the water's cross-section above it.
// profile(t) gives the seabed height along the edge; `along` maps t to world (x, z).
function edgeShapes(samples, profile) {
  const earth = new THREE.Shape();
  earth.moveTo(samples[0], BLOCK.base);
  for (const s of samples) earth.lineTo(s, profile(s));
  earth.lineTo(samples.at(-1), BLOCK.base);
  const water = [];
  let run = null;
  for (const s of samples) {
    const h = profile(s);
    if (h < 0) { (run ??= []).push([s, h]); }
    else if (run) { water.push(run); run = null; }
  }
  if (run) water.push(run);
  const waterShapes = water.filter((r) => r.length > 1).map((r) => {
    const sh = new THREE.Shape();
    sh.moveTo(r[0][0], 0);
    for (const [s, h] of r) sh.lineTo(s, h);
    for (let i = r.length - 1; i >= 1; i--) sh.lineTo(r[i][0], 0); // the top edge, in steps, so it can follow the waves
    return sh;
  });
  return { earth, waterShapes };
}

export function cutFaces(earthMat, waterMat) {
  const g = new THREE.Group();
  const steps = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  const add = (shape, mat, place) => {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 1), mat);
    place(m);
    g.add(m);
    return m;
  };
  // west / east faces: the shape's x is world z
  for (const sx of [x0, -x0]) {
    const zs = steps(z0, -z0, 160);
    const { earth, waterShapes } = edgeShapes(zs, (z) => bedHeight(sx, z));
    const place = (m) => { m.rotation.y = -Math.PI / 2; m.position.x = sx; };
    add(earth, earthMat, place);
    for (const w of waterShapes) add(w, waterMat, place).userData.water = true;
  }
  // north / south faces: the shape's x is world x
  for (const sz of [z0, -z0]) {
    const xs = steps(x0, -x0, 200);
    const { earth, waterShapes } = edgeShapes(xs, (x) => bedHeight(x, sz));
    const place = (m) => { m.position.z = sz; };
    add(earth, earthMat, place);
    for (const w of waterShapes) add(w, waterMat, place).userData.water = true;
  }
  // underside
  const bottom = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK.w, BLOCK.d).rotateX(Math.PI / 2), earthMat);
  bottom.position.y = BLOCK.base;
  g.add(bottom);
  return g;
}

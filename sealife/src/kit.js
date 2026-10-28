// Sea-life kit: shared by every creature and every sea world.
//  - assemble(): coloured parts → one geometry (vertex colours), so a whole school is one draw call
//  - swimMaterial(): bends the body in the vertex shader (no skeleton): lateral wave, wing flap, vertical wave
//  - School (boids) and Cruise (looping paths) behaviours
// Conventions: a creature's nose points +X, up is +Y, its middle is at the origin.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- building ----------

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

// A part: geometry + colour (a colour, or (worldPos) => colour) + placement.
export function part(geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  _e.set(...rot);
  _q.setFromEuler(_e);
  return { geo, color, m: new THREE.Matrix4().compose(_p.set(...pos), _q, _s.set(...scale)) };
}

const _c = new THREE.Color(), _v = new THREE.Vector3();
export function assemble(parts) {
  const geos = parts.map(({ geo, color, m }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(m);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      if (typeof color === 'function') _c.set(color(_v.fromBufferAttribute(pos, i)));
      else _c.set(color);
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  const merged = mergeGeometries(geos);
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

// shapes used a lot
export const ellipsoid = (rx, ry, rz, seg = 16) => new THREE.SphereGeometry(1, seg, Math.max(8, seg * 0.6)).scale(rx, ry, rz);
// a flat fin from (x, y) points in the XY plane, `t` thick
export function fin(points, t = 0.02) {
  const sh = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }).translate(0, 0, -t / 2);
}
// a body of revolution along X: profile [[radius, x], ...] from tail to nose
export function body(profile, seg = 20) {
  return new THREE.LatheGeometry(profile.map(([r, x]) => new THREE.Vector2(r, x)), seg).rotateZ(-Math.PI / 2);
}
// two eyes: black with a small highlight, on the sides at (x, y, ±z)
export function eyes(x, y, z, r) {
  return [
    part(ellipsoid(r, r, r * 0.6, 10), '#14161c', { pos: [x, y, z] }),
    part(ellipsoid(r, r, r * 0.6, 10), '#14161c', { pos: [x, y, -z] }),
    part(ellipsoid(r * 0.32, r * 0.32, r * 0.2, 6), '#ffffff', { pos: [x + r * 0.35, y + r * 0.35, z + Math.sign(z) * r * 0.45] }),
    part(ellipsoid(r * 0.32, r * 0.32, r * 0.2, 6), '#ffffff', { pos: [x + r * 0.35, y + r * 0.35, -z - Math.sign(z) * r * 0.45] }),
  ];
}
// colour that changes from back to belly
export const countershade = (top, belly, y0 = 0, soft = 0.05) => {
  const a = new THREE.Color(top), b = new THREE.Color(belly), out = new THREE.Color();
  return (p) => out.copy(b).lerp(a, THREE.MathUtils.smoothstep(p.y, y0 - soft, y0 + soft));
};

// ---------- motion ----------

// a few more shapes and placement helpers

// thin slices standing proud of an ellipsoid body (rx, ry, rz) — stripes and bands: [[x, width, colour], ...]
export function bands(rx, ry, rz, list, { y = 0, puff = 1.05 } = {}) {
  return list.map(([x, w, color, k2 = puff]) => {
    const k = Math.sqrt(Math.max(0.02, 1 - (x / rx) ** 2));
    return part(ellipsoid(w / 2, ry * k * k2, rz * k * (k2 + 0.02), 14), color, { pos: [x, y, 0] });
  });
}
// a repeatable random sequence (patterns look the same every time)
export const seeded = (seed = 1) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
// spots on an ellipsoid's surface; `keep(x, y, z)` can veto a spot
export function spotsOn(rx, ry, rz, n, color, { r = 0.02, seed = 3, keep = () => true, at = [0, 0, 0] } = {}) {
  const rnd = seeded(seed), out = [];
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1);
    const x = Math.cos(u) * Math.sin(v) * rx, y = Math.cos(v) * ry, z = Math.sin(u) * Math.sin(v) * rz;
    if (!keep(x, y, z)) continue;
    out.push(part(ellipsoid(r, r, r, 6), color, { pos: [x * 0.99 + at[0], y * 0.99 + at[1], z * 0.99 + at[2]] }));
  }
  return out;
}
// a tapered tube through points [[x, y, z], ...] from root radius r0 to tip radius r1
export function tube(points, r0, r1 = r0 * 0.3, seg = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const n = Math.max(4, points.length * 4);
  const g = new THREE.TubeGeometry(curve, n, 1, seg, false);
  const pos = g.attributes.position, c = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    curve.getPointAt(i / n, c);
    const r = THREE.MathUtils.lerp(r0, r1, i / n);
    for (let j = 0; j <= seg; j++) {
      const k = i * (seg + 1) + j;
      q.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, q.x, q.y, q.z);
    }
  }
  g.computeVertexNormals();
  return g;
}
// is (x, y) inside the polygon pts [[x, y], ...]?
export function inside(pts, x, y) {
  let o = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) o = !o;
  }
  return o;
}

// bend: fish and sharks · flap: rays, turtles, birds · vbend: dolphins and whales
// pulse: jellyfish · sway: things standing up (garden eels, anemones) · walk: crabs, octopus
// jet: squid (mantle squeezes, side fins ripple) · open: clams
export const MODES = { bend: 0, flap: 1, vbend: 2, pulse: 3, sway: 4, walk: 5, jet: 6, open: 7 };
export const clock = { uTime: { value: 0 } };

// swim: { mode, amp, freq, waves, nose, len, z0 } — see the shader below
// extras: other shader injections (e.g. a world's caustics), each (shader) => void
export function swimMaterial(swim, { extras = [], roughness = 0.55, side = THREE.DoubleSide, opacity = 1, emissive = 0 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, side, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  if (emissive) { mat.emissive.set('#ffffff'); mat.emissiveIntensity = emissive; }
  const u = {
    uMode: { value: MODES[swim.mode ?? 'bend'] }, uAmp: { value: swim.amp ?? 0.1 }, uFreq: { value: swim.freq ?? 4 },
    uWaves: { value: swim.waves ?? 0.6 }, uNose: { value: swim.nose ?? 0.5 }, uLen: { value: swim.len ?? 1 },
    uZ0: { value: swim.z0 ?? 0 }, uPhase: { value: 0 },
  };
  mat.userData.swim = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, clock);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', /* glsl */ `#include <common>
        uniform float uTime, uMode, uAmp, uFreq, uWaves, uNose, uLen, uZ0, uPhase;
        #ifdef USE_INSTANCING
          attribute float aPhase;
        #else
          const float aPhase = 0.0;
        #endif
        vec3 swim(vec3 p) {
          float ph = uTime * uFreq + uPhase + aPhase;
          if (uMode < 0.5) {            // lateral wave: grows toward the tail
            float s = clamp((uNose - p.x) / uLen, 0.0, 1.0);
            p.z += uAmp * s * s * sin(ph - s * uWaves * 6.2832);
          } else if (uMode < 1.5) {     // wing flap: grows toward the wing tips
            float a = max(0.0, abs(p.z) - uZ0) / uLen;
            p.y += uAmp * pow(a, 1.4) * sin(ph - a * uWaves * 3.1416);
            p.y += uAmp * 0.08 * sin(ph * 0.5 + p.x);
          } else if (uMode < 2.5) {     // vertical wave (dolphins, whales)
            float s = clamp((uNose - p.x) / uLen, 0.0, 1.0);
            p.y += uAmp * s * s * sin(ph - s * uWaves * 6.2832);
          } else if (uMode < 3.5) {     // pulse: the bell squeezes, what hangs below trails
            float c = uAmp * pow(max(0.0, sin(ph)), 2.0);
            float k = smoothstep(uZ0 - 0.1 * uLen, uZ0 + 0.6 * uLen, p.y);
            p.xz *= 1.0 - c * k;
            p.y += c * k * 0.3 * uLen;
            float d = max(0.0, uZ0 - p.y) / uLen;
            p.x += uAmp * 0.3 * uLen * d * sin(ph - d * uWaves * 6.2832);
            p.z += uAmp * 0.3 * uLen * d * cos(ph * 0.8 - d * uWaves * 6.2832);
          } else if (uMode < 4.5) {     // sway: grows with height above uZ0
            float s = clamp((p.y - uZ0) / uLen, 0.0, 1.0);
            p.x += uAmp * s * s * sin(ph - s * uWaves * 6.2832);
            p.z += uAmp * 0.6 * s * s * cos(ph * 0.73 - s * uWaves * 6.2832 + 1.3);
          } else if (uMode < 5.5) {     // walk: legs below uZ0, in uWaves angular slots, step in two sets
            float d = clamp((uZ0 - p.y) / uLen, 0.0, 1.0);
            float leg = floor((atan(p.z, p.x) + 3.1416) / 6.2832 * uWaves);
            float par = mod(leg, 2.0) * 3.1416;
            p.x += uAmp * d * sin(ph + par);
            p.y += uAmp * 0.7 * d * max(0.0, cos(ph + par));
            p.y += uAmp * 0.08 * sin(ph * 2.0);
          } else if (uMode < 6.5) {     // jet: the mantle (|z| < uZ0) squeezes, the side fins ripple
            float f = step(uZ0, abs(p.z));
            float k = uAmp * 0.3 * pow(max(0.0, sin(ph)), 3.0) * (1.0 - f);
            p.yz *= 1.0 - k;
            p.y += f * uAmp * (abs(p.z) - uZ0) * sin(ph * 2.0 - p.x / uLen * uWaves * 6.2832);
          } else {                      // open: the halves (±z) part at the top
            p.z += sign(p.z) * uAmp * (0.5 + 0.5 * sin(ph)) * clamp(p.y / uLen, 0.0, 1.0);
          }
          return p;
        }`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = swim(transformed);');
    for (const f of extras) f(sh);
  };
  return mat;
}

// A creature as a mesh (count = 1) or an instanced mesh with a random swim phase each.
export function makeCreature(spec, { count = 1, extras = [] } = {}) {
  const mat = swimMaterial(spec.swim, { extras, ...spec.surface });
  let mesh;
  if (count === 1) mesh = new THREE.Mesh(spec.geometry, mat);
  else {
    mesh = new THREE.InstancedMesh(spec.geometry, mat, count);
    mesh.geometry = spec.geometry.clone();
    mesh.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(Float32Array.from({ length: count }, () => Math.random() * 6.28), 1));
    mesh.frustumCulled = false;
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.spec = spec;
  return mesh;
}

// ---------- behaviours ----------

const _dummy = new THREE.Object3D();

// Boids: separation, alignment, cohesion, kept inside a box; `threats` make them scatter.
export class School {
  // swirl: circle the centre's vertical axis at `ring` radius (a fish tornado) · ball: pull to the centre (a bait ball)
  constructor(mesh, { center, size, speed = 1, radius = 1.2, swirl = 0, ring = 2, ball = 0 } = {}) {
    Object.assign(this, { swirl, ring, ball });
    this.mesh = mesh;
    this.center = center.clone();
    this.size = size.clone();
    this.speed = speed;
    this.radius = radius;
    this.threats = [];
    const n = mesh.count;
    this.p = Array.from({ length: n }, () => center.clone().add(new THREE.Vector3((Math.random() - 0.5) * size.x * 0.5, (Math.random() - 0.5) * size.y * 0.5, (Math.random() - 0.5) * size.z * 0.5)));
    this.v = Array.from({ length: n }, () => new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.2, Math.random() - 0.5).setLength(speed));
    this.scale = Array.from({ length: n }, () => 0.85 + Math.random() * 0.3);
  }

  update(dt) {
    const { p, v, radius } = this;
    const n = p.length;
    const sep = new THREE.Vector3(), ali = new THREE.Vector3(), coh = new THREE.Vector3(), d = new THREE.Vector3(), acc = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      sep.set(0, 0, 0); ali.set(0, 0, 0); coh.set(0, 0, 0);
      let k = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        d.subVectors(p[i], p[j]);
        const dist = d.length();
        if (dist < radius) {
          k++;
          ali.add(v[j]);
          coh.add(p[j]);
          if (dist < radius * 0.4) sep.addScaledVector(d, 1 / Math.max(dist * dist, 0.01));
        }
      }
      acc.set(0, 0, 0);
      if (k) {
        ali.divideScalar(k).sub(v[i]).multiplyScalar(1.2);
        coh.divideScalar(k).sub(p[i]).multiplyScalar(0.6);
        acc.add(ali).add(coh);
      }
      acc.addScaledVector(sep, 0.35);
      // stay in the box (soft walls), flatten vertical drift
      for (const ax of ['x', 'y', 'z']) {
        const off = p[i][ax] - this.center[ax], half = this.size[ax] / 2;
        if (Math.abs(off) > half * 0.8) acc[ax] -= Math.sign(off) * (Math.abs(off) - half * 0.8) * 3;
      }
      acc.y -= v[i].y * 0.8;
      if (this.swirl) {
        d.subVectors(p[i], this.center).setY(0);
        const r = Math.max(d.length(), 0.01);
        acc.x += (-d.z / r) * this.swirl + (d.x / r) * (this.ring - r) * 1.5;
        acc.z += (d.x / r) * this.swirl + (d.z / r) * (this.ring - r) * 1.5;
      }
      if (this.ball) acc.addScaledVector(d.subVectors(this.center, p[i]), this.ball);
      for (const t of this.threats) {
        d.subVectors(p[i], t.position ?? t);
        const dist = d.length();
        if (dist < 4) acc.addScaledVector(d.normalize(), (4 - dist) * 4);
      }
      v[i].addScaledVector(acc, dt);
      const sp = v[i].length();
      const want = THREE.MathUtils.clamp(sp, this.speed * 0.7, this.speed * 2.2);
      v[i].setLength(want);
      p[i].addScaledVector(v[i], dt);
      _dummy.position.copy(p[i]);
      _dummy.rotation.set(0, Math.atan2(-v[i].z, v[i].x), Math.asin(THREE.MathUtils.clamp(v[i].y / want, -1, 1)) * 0.8, 'YZX');
      _dummy.scale.setScalar(this.scale[i]);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// A big creature cruising a closed path (ellipse, or figure of eight), banking into turns.
export class Cruise {
  // jump: height of leaps (dolphins, flying fish), `jumps` per lap; offset: a fixed shift (for pods that follow one path)
  constructor(obj, { center, rx = 10, rz = 6, y = 0, speed = 1, eight = false, bob = 0.3, phase = 0, jump = 0, jumps = 2, offset = [0, 0, 0] } = {}) {
    Object.assign(this, { obj, center: center.clone(), rx, rz, y, speed, eight, bob, jump, jumps, offset });
    this.a = phase;
  }
  at(a) {
    const x = Math.cos(a) * this.rx;
    const z = this.eight ? Math.sin(2 * a) * this.rz : Math.sin(a) * this.rz;
    const leap = this.jump ? this.jump * Math.max(0, Math.sin(a * this.jumps)) ** 6 : 0;
    const [ox, oy, oz] = this.offset;
    return new THREE.Vector3(this.center.x + x + ox, this.center.y + this.y + Math.sin(a * 2) * this.bob + leap + oy, this.center.z + z + oz);
  }
  update(dt) {
    const len = Math.max(this.rx, this.rz) * 2 * Math.PI;
    this.a += (this.speed * dt * 2 * Math.PI) / len;
    const p = this.at(this.a), ahead = this.at(this.a + 0.02), ahead2 = this.at(this.a + 0.06);
    const dir = ahead.clone().sub(p);
    const turn = new THREE.Vector3().subVectors(ahead2, ahead).normalize().cross(dir.clone().normalize()).y;
    this.obj.position.copy(p);
    this.obj.rotation.set(-turn * 6, Math.atan2(-dir.z, dir.x), Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), 'YZX');
  }
}

// A creature that potters about a home spot: swims (or walks) to a random point nearby, pauses, picks another.
// threats within `flee` make it dash away (or, with onAlarm, do its own thing — a pufferfish puffs up).
export class Wander {
  constructor(obj, { home, radius = 1, y = [0, 0], speed = 0.3, turn = 2.5, pause = [0.3, 1.5], threats = [], flee = 0, sideways = false, onAlarm = null } = {}) {
    Object.assign(this, { obj, home: home.clone(), radius, y, speed, turn, pause, threats, flee, sideways, onAlarm });
    this.yaw = Math.random() * Math.PI * 2;
    this.wait = Math.random() * pause[1];
    this.alarm = 0;
    this.target = this.pick();
    obj.position.copy(this.pick());
  }
  pick() {
    const a = Math.random() * Math.PI * 2, r = this.radius * Math.sqrt(Math.random());
    return new THREE.Vector3(this.home.x + Math.cos(a) * r, this.home.y + THREE.MathUtils.lerp(this.y[0], this.y[1], Math.random()), this.home.z + Math.sin(a) * r);
  }
  update(dt) {
    const o = this.obj, pos = o.position;
    let speed = this.speed;
    if (this.flee) {
      for (const t of this.threats) {
        const tp = t.position ?? t;
        if (pos.distanceTo(tp) < this.flee) {
          if (this.alarm <= 0) {
            const away = pos.clone().sub(tp).setY(0).setLength(this.radius);
            this.target = this.home.clone().add(away).setY(pos.y);
            this.wait = 0;
          }
          this.alarm = 3;
        }
      }
    }
    if (this.alarm > 0) { this.alarm -= dt; speed *= this.onAlarm ? 0.3 : 3; }
    this.onAlarm?.(this.alarm > 0, dt);
    if (this.wait > 0) { this.wait -= dt; return; }
    const to = _p.subVectors(this.target, pos);
    if (Math.hypot(to.x, to.z) < Math.max(0.04, speed * 0.25)) {
      this.wait = THREE.MathUtils.lerp(this.pause[0], this.pause[1], Math.random());
      this.target = this.pick();
      return;
    }
    let want = Math.atan2(-to.z, to.x), diff = want - this.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.yaw += diff * Math.min(1, this.turn * dt);
    const go = speed * dt * Math.max(0.2, Math.cos(diff));
    pos.x += Math.cos(this.yaw) * go;
    pos.z -= Math.sin(this.yaw) * go;
    pos.y += THREE.MathUtils.clamp(to.y, -speed * dt * 0.5, speed * dt * 0.5);
    o.rotation.set(0, this.yaw + (this.sideways ? Math.PI / 2 : 0), 0);
  }
}

// Burrowers in the sand (garden eels): an instanced mesh standing on `spots`; they sink when a threat comes near.
export class Burrows {
  constructor(mesh, { spots, depth = 0.5, threats = [], reach = 2 } = {}) {
    Object.assign(this, { mesh, spots, depth, threats, reach });
    this.out = spots.map(() => 1);
    this.hide = spots.map(() => 0);
    this.yaw = spots.map(() => Math.random() * Math.PI * 2);
    this.size = spots.map(() => 0.8 + Math.random() * 0.35);
  }
  update(dt) {
    this.spots.forEach((s, i) => {
      for (const t of this.threats) if (s.distanceTo(t.position ?? t) < this.reach) this.hide[i] = 2.5 + Math.random() * 2.5 + s.distanceTo(t.position ?? t) * 0.3;
      this.hide[i] -= dt;
      const want = this.hide[i] > 0 ? 0 : 1;
      this.out[i] += (want - this.out[i]) * Math.min(1, dt * (want ? 0.9 : 7));
      _dummy.position.set(s.x, s.y - (1 - this.out[i]) * this.depth * this.size[i], s.z);
      _dummy.rotation.set(0, this.yaw[i], 0);
      _dummy.scale.setScalar(this.size[i]);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

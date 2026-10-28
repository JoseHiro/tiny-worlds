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

export const MODES = { bend: 0, flap: 1, vbend: 2 };
export const clock = { uTime: { value: 0 } };

// swim: { mode, amp, freq, waves, nose, len, z0 } — see the shader below
// extras: other shader injections (e.g. a world's caustics), each (shader) => void
export function swimMaterial(swim, { extras = [], roughness = 0.55, side = THREE.DoubleSide } = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, side });
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
          } else {                      // vertical wave (dolphins, whales)
            float s = clamp((uNose - p.x) / uLen, 0.0, 1.0);
            p.y += uAmp * s * s * sin(ph - s * uWaves * 6.2832);
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
  const mat = swimMaterial(spec.swim, { extras });
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
  constructor(mesh, { center, size, speed = 1, radius = 1.2 } = {}) {
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
  constructor(obj, { center, rx = 10, rz = 6, y = 0, speed = 1, eight = false, bob = 0.3, phase = 0 } = {}) {
    Object.assign(this, { obj, center: center.clone(), rx, rz, y, speed, eight, bob });
    this.a = phase;
  }
  at(a) {
    const x = Math.cos(a) * this.rx;
    const z = this.eight ? Math.sin(2 * a) * this.rz : Math.sin(a) * this.rz;
    return new THREE.Vector3(this.center.x + x, this.center.y + this.y + Math.sin(a * 2) * this.bob, this.center.z + z);
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

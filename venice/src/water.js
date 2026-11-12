// The water of Venice (venice/DESIGN.md §1.3, §2 1–4): the Grand Canal a bright jade, the side canals a darker green,
// the lagoon blue and paler towards the distance. One material with three looks: little waves in the normals, sparkles
// where the sun catches them, and (`tint`) the warm colours of the houses lying in it near the banks, swaying.
// Wakes: a white V spreading behind a boat and fading, one mesh of quads per boat.
import * as THREE from 'three';
import { clock } from './kit.js';

export const WATER = {
  canal: { deep: 0x2c8a86, shallow: 0x46b3a4, wave: 0.55, scale: 1 },
  side: { deep: 0x1f5f58, shallow: 0x2f7f74, wave: 0.3, scale: 1.4 },
  lagoon: { deep: 0x2a7fae, shallow: 0x4aa9c8, wave: 0.8, scale: 0.7 },
};
const mats = {};
// kind: 'canal' | 'side' | 'lagoon'
export function waterMat(kind = 'canal') {
  if (mats[kind]) return mats[kind];
  const w = WATER[kind];
  const m = new THREE.MeshStandardMaterial({ color: w.shallow, roughness: 0.12, metalness: 0.05 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = clock.uTime;
    sh.uniforms.uDeep = { value: new THREE.Color(w.deep) }; sh.uniforms.uShallow = { value: new THREE.Color(w.shallow) };
    sh.uniforms.uWave = { value: w.wave }; sh.uniforms.uScale = { value: w.scale };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; attribute float aEdge; attribute vec3 aTint; varying float vEdge; varying vec3 vTint;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vEdge = aEdge; vTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying float vEdge; varying vec3 vTint; uniform float uTime, uWave, uScale; uniform vec3 uDeep, uShallow;
      float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec2 waves(vec2 p) { // the slope of a few small travelling waves
        vec2 s = vec2(0.0);
        s += vec2(0.8, 0.3) * cos(dot(p, vec2(3.1, 1.2)) + uTime * 1.7) * 0.5;
        s += vec2(-0.4, 0.9) * cos(dot(p, vec2(-1.7, 3.6)) + uTime * 2.1) * 0.4;
        s += vec2(0.6, -0.7) * cos(dot(p, vec2(5.3, -4.1)) + uTime * 2.9) * 0.25;
        s += vec2(0.2, 0.9) * cos(dot(p, vec2(8.7, 7.9)) + uTime * 3.7) * 0.15;
        return s; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec2 p = vWP.xz * uScale; float n = 0.5 + 0.5 * sin(p.x * 0.7 + sin(p.y * 0.5 + uTime * 0.2) * 1.5);
          diffuseColor.rgb = mix(uDeep, uShallow, 0.55 + 0.35 * n);
          // the houses' colours lying in the water near a bank (aEdge 1 at the bank, aTint their colour), broken up by the waves
          float sway = 0.5 + 0.5 * sin(vWP.x * 9.0 + vWP.z * 9.0 + uTime * 1.6 + sin(vWP.z * 3.0 + uTime) * 2.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vTint * 0.8, vEdge * (0.25 + 0.3 * sway) * step(0.01, dot(vTint, vec3(1.0)))); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 s = waves(vWP.xz * uScale * 2.0) * uWave * 0.22; normal = normalize(normal + (viewMatrix * vec4(-s.x, 0.0, -s.y, 0.0)).xyz); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec2 q = vWP.xz * 30.0, c = floor(q), f = fract(q) - 0.5; float h = h1(c);
          float dot_ = 1.0 - smoothstep(0.12, 0.38, length(f * vec2(1.0, 2.2))); // (a soft little glint, not a square)
          float tw = step(0.993, h) * max(0.0, sin(uTime * 3.0 + h * 60.0)) * dot_;
          totalEmissiveRadiance += vec3(1.0, 0.97, 0.88) * tw * 1.1 * uWave; }`);
  };
  m.customProgramCacheKey = () => 'vwater' + kind;
  return (mats[kind] = m);
}
// a flat sheet of water w × d at y = 0 (with no tints: the plain colour)
export function waterSheet(w, d, kind = 'canal', seg = 1) {
  const g = new THREE.PlaneGeometry(w, d, seg, seg).rotateX(-Math.PI / 2);
  const n = g.attributes.position.count;
  g.setAttribute('aEdge', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.Mesh(g, waterMat(kind)); m.receiveShadow = true;
  return m;
}
// a sheet with house colours along one bank (the far, -z edge), to show the reflections: cols, a colour per stretch
export function tintedSheet(w, d, kind, cols) {
  const nx = cols.length * 4, nz = 8, g = new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2), p = g.attributes.position, n = p.count;
  const edge = new Float32Array(n), tint = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), u = (x + w / 2) / w, v = (z + d / 2) / d;
    edge[i] = Math.max(0, 1 - v * 2.2);
    c.set(cols[Math.min(cols.length - 1, Math.floor(u * cols.length))]); tint[i * 3] = c.r; tint[i * 3 + 1] = c.g; tint[i * 3 + 2] = c.b;
  }
  g.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1)); g.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
  const m = new THREE.Mesh(g, waterMat(kind)); m.receiveShadow = true; return m;
}

// a wake: two white arms spreading back from a boat's stern, fading; call update(speed) each frame with the boat
export function wake({ len = 2.4, spread = 0.5, n = 14 } = {}) {
  const pos = new Float32Array(n * 2 * 4 * 3), alpha = new Float32Array(n * 2 * 4), idx = [];
  for (let q = 0; q < n * 2; q++) { const b = q * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(alpha, 1)); g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(1.0, 1.0, 1.0, vA); }',
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 2;
  // (laid out in the boat's own frame: the stern at x = 0, the arms trailing to -x)
  m.userData.update = (t, strength = 1) => {
    let v = 0;
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, w0 = 0.04 + u0 * 0.08, w1 = 0.04 + u1 * 0.08;
      const ripple = (u) => Math.sin(u * 18 - t * 6) * 0.02 * u;
      const pts = [[-u0 * len, s * (u0 * spread + ripple(u0))], [-u1 * len, s * (u1 * spread + ripple(u1))], [-u1 * len, s * (u1 * spread + w1 + ripple(u1))], [-u0 * len, s * (u0 * spread + w0 + ripple(u0))]];
      for (const [k, [x, z]] of pts.entries()) { pos[v * 3] = x; pos[v * 3 + 1] = 0.012; pos[v * 3 + 2] = z; alpha[v] = (1 - (k === 1 || k === 2 ? u1 : u0)) * 0.75 * strength; v++; }
    }
    g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true;
  };
  m.userData.update(0);
  return m;
}

// Naha sea — waves (DESIGN.md §6.7). A fringing reef: swell from the open sea (north, −Z) steepens over the
// drop-off, breaks along the reef edge, the lagoon behind it is calm, and small waves wash up the beach.
// The same model is written twice: in GLSL for the water (surface, cut faces) and in JS for what floats
// on it and for the spray. Keep the two in step.
import * as THREE from 'three';

// along-shore wobble of the coastline and the reef edge (same as terrain.js), and the channel through the reef
const zsOf = (x, z) => z + Math.sin(x * 0.07) * 2.6 + Math.sin(x * 0.19 + 1.3) * 0.8;
const chanOf = (x) => Math.exp(-((x - 14) ** 2) / 18);
const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const fract = (v) => v - Math.floor(v);

export const OMEGA = 1.05; // a wave every ~6 s

// the wave's phase along its path: waves get shorter where the water is shallow (behind the reef edge)
const phaseAt = (zs) => { const a = Math.min(4, Math.max(0, zs + 16)); return 0.7 * zs + 0.7 * (a * a) / 8 + 0.7 * Math.max(0, zs + 12); };
// height of the swell by zone: open sea → building over the drop-off → broken on the reef → lagoon → shore
function ampAt(zs, ch) {
  let a = lerp(0.22, lerp(0.38, 0.26, ch), smooth(-22, -16.5, zs));
  a = lerp(a, lerp(0.05, 0.1, ch), smooth(-16, -11, zs));
  a = lerp(a, 0.11, smooth(9, 13, zs));
  return a;
}
// how steep-fronted the wave is (it peaks and leans forward before breaking, and again at the shore)
const skewAt = (zs, ch) => smooth(-21, -16.5, zs) * smooth(-11, -15, zs) * (1 - 0.7 * ch) + 0.5 * smooth(10, 13, zs);
// where waves break: the reef edge, but not over the deep channel
const breakAt = (zs, ch) => smooth(-18.5, -16.5, zs) * smooth(-10.5, -14.5, zs) * (1 - ch);

function shape(x, zs, ch, t) {
  const ph = phaseAt(zs) - OMEGA * t + Math.sin(x * 0.045) * 0.6;
  const sk = skewAt(zs, ch);
  const psi = ph - sk * 0.6 * Math.sin(ph);
  return { ph, psi, sk };
}

// water height at (x, z) — `wave` is the panel's wave-height knob
export function waveHeight(x, z, t, wave = 1) {
  const zs = zsOf(x, z), ch = chanOf(x);
  const { ph, psi, sk } = shape(x, zs, ch, t);
  const u = 0.5 + 0.5 * Math.sin(psi), pe = 1 + 2 * sk;
  const s = 2 * (u ** pe - lerp(0.5, 0.3125, sk));
  const sets = 0.78 + 0.22 * Math.sin(ph * 0.19 + x * 0.03);
  const chop = Math.sin(x * 0.9 + t * 1.7) * 0.012 + Math.sin((x - z) * 1.9 - t * 2.3) * 0.006 + Math.sin(z * 1.3 - t * 1.4) * 0.01;
  return (ampAt(zs, ch) * s * sets + chop) * wave;
}
// is a wave breaking right here, right now? 0..1 (1 = on the crest of a breaking wave)
export function breaking(x, z, t, wave = 1) {
  const zs = zsOf(x, z), ch = chanOf(x);
  const bz = breakAt(zs, ch);
  if (bz <= 0) return 0;
  const { psi } = shape(x, zs, ch, t);
  const d = fract((Math.PI / 2 - psi) / (Math.PI * 2));
  return bz * Math.exp(-d * 9) * Math.min(1, wave * 1.1);
}

export const WAVES_GLSL = /* glsl */ `
  float wZs(vec2 p) { return p.y + sin(p.x * 0.07) * 2.6 + sin(p.x * 0.19 + 1.3) * 0.8; }
  float wChan(float x) { return exp(-(x - 14.0) * (x - 14.0) / 18.0); }
  float wPhase(float zs) { float a = clamp(zs + 16.0, 0.0, 4.0); return 0.7 * zs + 0.7 * a * a / 8.0 + 0.7 * max(0.0, zs + 12.0); }
  float wAmp(float zs, float ch) {
    float a = mix(0.22, mix(0.38, 0.26, ch), smoothstep(-22.0, -16.5, zs));
    a = mix(a, mix(0.05, 0.1, ch), smoothstep(-16.0, -11.0, zs));
    return mix(a, 0.11, smoothstep(9.0, 13.0, zs));
  }
  float wSkew(float zs, float ch) { return smoothstep(-21.0, -16.5, zs) * smoothstep(-11.0, -15.0, zs) * (1.0 - 0.7 * ch) + 0.5 * smoothstep(10.0, 13.0, zs); }
  float wBreak(float zs, float ch) { return smoothstep(-18.5, -16.5, zs) * smoothstep(-10.5, -14.5, zs) * (1.0 - ch); }
  float waveH(vec2 p, float t) {
    float zs = wZs(p), ch = wChan(p.x);
    float ph = wPhase(zs) - ${OMEGA.toFixed(3)} * t + sin(p.x * 0.045) * 0.6;
    float sk = wSkew(zs, ch);
    float psi = ph - sk * 0.6 * sin(ph);
    float u = 0.5 + 0.5 * sin(psi);
    float s = 2.0 * (pow(u, 1.0 + 2.0 * sk) - mix(0.5, 0.3125, sk));
    float sets = 0.78 + 0.22 * sin(ph * 0.19 + p.x * 0.03);
    float chop = sin(p.x * 0.9 + t * 1.7) * 0.012 + sin((p.x - p.y) * 1.9 - t * 2.3) * 0.006 + sin(p.y * 1.3 - t * 1.4) * 0.01;
    return (wAmp(zs, ch) * s * sets + chop) * uWave;
  }
  // white water: on and behind a breaking crest, and a thin leftover over the reef flat
  float waveFoam(vec2 p, float t) {
    float zs = wZs(p), ch = wChan(p.x);
    float ph = wPhase(zs) - ${OMEGA.toFixed(3)} * t + sin(p.x * 0.045) * 0.6;
    float psi = ph - wSkew(zs, ch) * 0.6 * sin(ph);
    float d = fract((1.5708 - psi) / 6.2832); // 0 on the crest, growing seaward
    float bz = wBreak(zs, ch);
    float white = bz * (exp(-d * 10.0) + exp(-d * 2.6) * 0.5 + exp(-(1.0 - d) * 28.0) * 0.6);
    float left = smoothstep(-16.5, -15.0, zs) * smoothstep(-5.0, -12.0, zs) * 0.2 * (1.0 - ch);
    white += smoothstep(10.5, 12.5, zs) * (exp(-d * 7.0) * 0.8 + exp(-d * 2.5) * 0.3); // the little shore break
    return clamp((white + left) * min(1.0, uWave * 1.1), 0.0, 1.0);
  }
  // soft value noise, to break the foam into patches
  float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float wNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
`;

// ---------- spray: white drops thrown up where a wave is breaking ----------

const MAX = 400;
export class Spray {
  constructor(parent, { area = [-45, 45, -24, -8], clip = [] } = {}) {
    this.area = area;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.vel = new Float32Array(MAX * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('life', new THREE.BufferAttribute(this.life, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, clippingPlanes: clip, clipping: true,
      uniforms: { uScale: { value: 300 } },
      vertexShader: /* glsl */ `
        attribute float life; uniform float uScale; varying float vL;
        #include <clipping_planes_pars_vertex>
        void main() {
          vL = life;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = life > 0.0 ? uScale * (0.08 + 0.1 * (1.0 - life)) / -mvPosition.z : 0.0;
          gl_Position = projectionMatrix * mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: /* glsl */ `
        varying float vL;
        #include <clipping_planes_pars_fragment>
        void main() {
          #include <clipping_planes_fragment>
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5 || vL <= 0.0) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, smoothstep(0.5, 0.2, r) * min(1.0, vL * 2.0) * 0.85);
        }`,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    parent.add(this.points);
    this.next = 0;
  }
  update(t, dt, wave, pixelScale) {
    this.mat.uniforms.uScale.value = pixelScale;
    const [xa, xb, za, zb] = this.area;
    // look for breaking crests and throw drops off them
    const tries = Math.round(140 * Math.min(2, wave));
    for (let k = 0; k < tries; k++) {
      const x = xa + Math.random() * (xb - xa), z = za + Math.random() * (zb - za);
      const b = breaking(x, z, t, wave);
      if (b < 0.6 || Math.random() > b * 0.5) continue;
      const i = this.next++ % MAX;
      this.pos.set([x, waveHeight(x, z, t, wave) + 0.05, z], i * 3);
      this.vel.set([(Math.random() - 0.5) * 0.6, 1.0 + Math.random() * 1.4 * wave, 0.6 + Math.random() * 1.2], i * 3);
      this.life[i] = 1;
    }
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt * 1.1;
      this.vel[i * 3 + 1] -= 4.5 * dt;
      for (let a = 0; a < 3; a++) this.pos[i * 3 + a] += this.vel[i * 3 + a] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.life.needsUpdate = true;
  }
}

// The weather (snowfest/DESIGN.md §1.2): snow drifting down on a sunny day — one Points object, all the motion in the
// vertex shader (each flake falls, sways, wraps round to the top), so it costs one draw call and no updates from JS.
// Now and then a flake turns to the sun and glints.
import * as THREE from 'three';
import { clock } from './kit.js';

let flakeTex = null;
const flake = () => flakeTex ??= (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();

export function snowfall({ w = 30, d = 30, h = 16, n = 2500, size = 0.09, speed = 0.55, wind = 0.25 } = {}) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * w; pos[i * 3 + 1] = Math.random() * h; pos[i * 3 + 2] = (Math.random() - 0.5) * d; seed[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: clock.uTime, uH: { value: h }, uW: { value: w }, uD: { value: d }, uSize: { value: size }, uSpeed: { value: speed }, uWind: { value: wind }, uMap: { value: flake() }, uPx: { value: 800 } },
    vertexShader: `attribute float aSeed; uniform float uTime, uH, uW, uD, uSize, uSpeed, uWind, uPx; varying float vGlint, vA;
      void main() {
        vec3 p = position; float t = uTime * uSpeed * (0.7 + aSeed * 0.6);
        p.y = mod(p.y - t, uH);
        p.x = mod(p.x + uWind * uTime + sin(uTime * 0.9 + aSeed * 40.0) * 0.3 + uW * 0.5, uW) - uW * 0.5;
        p.z += cos(uTime * 0.7 + aSeed * 30.0) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.6 + aSeed * 0.8) * uPx / -mv.z;
        vGlint = step(0.97, fract(aSeed * 13.0 + uTime * 0.3)); vA = smoothstep(0.0, 1.0, p.y) * smoothstep(uH, uH - 1.5, p.y);
      }`,
    fragmentShader: `uniform sampler2D uMap; varying float vGlint, vA;
      void main() { vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.0) * (1.0 + vGlint * 1.5), c.a * 0.9 * vA); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  pts.onBeforeRender = (r) => { mat.uniforms.uPx.value = r.getDrawingBufferSize(V2).y / r.getPixelRatio() * 0.9; };
  return pts;
}
const V2 = new THREE.Vector2();

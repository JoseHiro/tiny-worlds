// The ground (bangkok/DESIGN.md §13): worn asphalt on the road, tiled pavements, the lane's concrete slabs, and at
// night pools of coloured light on all of them under the signs, lanterns and stall bulbs (the road looks wet).
// Each surface is one canvas texture made once (UVs in world units, so tiles stay square), the pools one draw call.
import * as THREE from 'three';
import { rng } from './common.js';

const tex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
};
const specks = (x, w, h, n, colors, size, rnd) => { for (let i = 0; i < n; i++) { x.fillStyle = colors[(rnd() * colors.length) | 0]; const s = size * (0.5 + rnd()); x.fillRect(rnd() * w, rnd() * h, s, s); } };
const blob = (x, cx, cy, r, color, rnd) => { x.fillStyle = color; x.beginPath(); for (let a = 0; a <= 12; a++) { const t = (a / 12) * Math.PI * 2, rr = r * (0.7 + rnd() * 0.5); x.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.8); } x.fill(); };
const crack = (x, cx, cy, len, rnd, color = 'rgba(15,16,20,0.7)') => { x.strokeStyle = color; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx, cy); let a = rnd() * 6.28; for (let i = 0; i < 8; i++) { a += (rnd() - 0.5) * 1.2; cx += Math.cos(a) * len / 8; cy += Math.sin(a) * len / 8; x.lineTo(cx, cy); } x.stroke(); };

// ---------- asphalt: 32 × 8.2 units (64 px a unit), across the road from kerb to kerb ----------
export const ROAD = { len: 32, d: 8.2 };
const ASPHALT = () => tex(2048, 525, (x, w, h) => {
  const rnd = rng(71), px = w / ROAD.len, Z = (z) => (z + ROAD.d / 2) * px; // z → canvas y
  x.fillStyle = '#383a40'; x.fillRect(0, 0, w, h);
  specks(x, w, h, 90000, ['#2c2e33', '#44464d', '#4c4e55', '#303237', '#3e4046'], 2.2, rnd); // the grain
  // the lanes: a darker oily stripe down the middle of each, lighter polished wheel tracks either side
  for (const zc of [-2.3, -1.3, 1.3, 2.3]) {
    x.fillStyle = 'rgba(20,20,24,0.28)'; x.fillRect(0, Z(zc) - 0.18 * px, w, 0.36 * px);
    x.fillStyle = 'rgba(120,122,130,0.07)'; for (const s of [-1, 1]) x.fillRect(0, Z(zc + s * 0.5) - 0.12 * px, w, 0.24 * px);
  }
  // patches of newer tarmac, dug up and filled again
  for (let i = 0; i < 9; i++) { const pw = (1 + rnd() * 3) * px, ph = (0.6 + rnd() * 1.6) * px, px0 = rnd() * (w - pw), py = Z(-3.4) + rnd() * (Z(3.4) - Z(-3.4) - ph); x.fillStyle = rnd() < 0.5 ? 'rgba(25,26,30,0.55)' : 'rgba(80,82,88,0.25)'; x.fillRect(px0, py, pw, ph); x.strokeStyle = 'rgba(15,15,18,0.6)'; x.lineWidth = 2; x.strokeRect(px0, py, pw, ph); }
  // oil drips and stains, cracks
  for (let i = 0; i < 40; i++) blob(x, rnd() * w, Z(-3.5) + rnd() * 7 * px, (0.1 + rnd() * 0.35) * px, `rgba(12,12,16,${0.2 + rnd() * 0.3})`, rnd);
  for (let i = 0; i < 30; i++) crack(x, rnd() * w, Z(-3.6) + rnd() * 7.2 * px, (0.5 + rnd() * 1.5) * px, rnd);
  // the gutters along both kerbs: a strip of concrete, darker where water runs, a drain grate now and then
  for (const s of [-1, 1]) {
    const y0 = s < 0 ? 0 : Z(3.6);
    x.fillStyle = '#6a675f'; x.fillRect(0, y0, w, 0.5 * px);
    specks(x, w, 0.5 * px, 6000, ['#5a5850', '#77746b', '#625f57'], 2, rnd);
    x.fillStyle = 'rgba(25,25,30,0.35)'; x.fillRect(0, s < 0 ? 0.32 * px : y0 + 0.02 * px, w, 0.16 * px);
    for (let gx = 3; gx < ROAD.len; gx += 8) { const X0 = gx * px, Y0 = y0 + 0.08 * px; x.fillStyle = '#1a1b1f'; x.fillRect(X0, Y0, 0.8 * px, 0.34 * px); x.fillStyle = '#4a4c52'; for (let k = 1; k < 8; k++) x.fillRect(X0 + k * 0.1 * px, Y0, 3, 0.34 * px); }
  }
  // two manhole covers
  for (const [mx, mz] of [[6, -1.8], [22, 1.6]]) { x.fillStyle = '#26272b'; x.beginPath(); x.arc(mx * px, Z(mz), 0.36 * px, 0, 7); x.fill(); x.strokeStyle = '#55575e'; x.lineWidth = 3; for (let r = 0.12; r < 0.36; r += 0.08) { x.beginPath(); x.arc(mx * px, Z(mz), r * px, 0, 7); x.stroke(); } }
});
// ---------- pavement tiles: 4 × 4 units, 0.5 tiles, each a slightly different grey, some cracked or stained ----------
const TILES = () => tex(512, 512, (x, w) => {
  const rnd = rng(72), t = w / 8;
  const greys = ['#b8b4ac', '#aca8a0', '#c0bcb2', '#a6a29a', '#b2aea4', '#9c988f'];
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    x.fillStyle = greys[(rnd() * greys.length) | 0]; x.fillRect(i * t, j * t, t, t);
    x.save(); x.translate(i * t, j * t); specks(x, t, t, 160, ['rgba(60,55,50,0.10)', 'rgba(255,255,255,0.08)'], 2, rnd); x.restore();
    if (rnd() < 0.08) crack(x, i * t + rnd() * t, j * t + rnd() * t, t * 0.8, rnd, 'rgba(40,38,34,0.6)');
    if (rnd() < 0.1) { x.fillStyle = `rgba(70,62,52,${0.15 + rnd() * 0.2})`; x.fillRect(i * t + 2, j * t + 2, t - 4, t - 4); } // a worn, darker tile
  }
  x.strokeStyle = 'rgba(70,66,60,0.75)'; x.lineWidth = 3; // the grout
  for (let k = 0; k <= 8; k++) { x.beginPath(); x.moveTo(k * t, 0); x.lineTo(k * t, w); x.stroke(); x.beginPath(); x.moveTo(0, k * t); x.lineTo(w, k * t); x.stroke(); }
  for (let i = 0; i < 18; i++) blob(x, rnd() * w, rnd() * w, 3 + rnd() * 9, `rgba(40,36,32,${0.25 + rnd() * 0.3})`, rnd); // gum and drips
});
// ---------- the lane's concrete: 4 × 4 units, slabs 2 × 2 with joints, stains and damp patches ----------
const CONCRETE = () => tex(512, 512, (x, w) => {
  const rnd = rng(73), u = w / 4;
  x.fillStyle = '#8c887f'; x.fillRect(0, 0, w, w);
  specks(x, w, w, 30000, ['#7e7a71', '#99958c', '#85817a', '#928e85'], 2, rnd);
  for (let i = 0; i < 6; i++) blob(x, rnd() * w, rnd() * w, (0.2 + rnd() * 0.6) * u, `rgba(60,56,50,${0.12 + rnd() * 0.15})`, rnd); // damp
  for (let i = 0; i < 14; i++) blob(x, rnd() * w, rnd() * w, (0.04 + rnd() * 0.12) * u, `rgba(40,34,28,${0.2 + rnd() * 0.3})`, rnd); // drips from the stalls
  for (let i = 0; i < 8; i++) crack(x, rnd() * w, rnd() * w, (0.4 + rnd() * 0.8) * u, rnd, 'rgba(50,46,40,0.6)');
  x.strokeStyle = 'rgba(45,42,38,0.8)'; x.lineWidth = 3; for (const k of [0, 2, 4]) { x.beginPath(); x.moveTo(k * u, 0); x.lineTo(k * u, w); x.stroke(); x.beginPath(); x.moveTo(0, k * u); x.lineTo(w, k * u); x.stroke(); }
});
let made = null;
export const surfaces = () => (made ??= {
  road: new THREE.MeshStandardMaterial({ map: ASPHALT(), roughness: 0.62, metalness: 0.05 }),
  tiles: new THREE.MeshStandardMaterial({ map: TILES(), roughness: 0.8 }),
  concrete: new THREE.MeshStandardMaterial({ map: CONCRETE(), roughness: 0.85 }),
});
// a flat w × d plane at (x, y, z) whose texture repeats every `unit` world units (so tiles keep their size)
export function patch(material, w, d, x, y, z, unit = 4, unitZ = unit) {
  const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + x) / unit, 0.5 - (p.getZ(i) + z) / unitZ);
  const m = new THREE.Mesh(g, material); m.position.set(x, y, z); m.receiveShadow = true;
  return m;
}

// ---------- pools of light on the ground: flat soft discs, additive, one instanced draw ----------
// pts: [[x, y, z, colour, radius, when it comes on (0…1 of dark), stretch?], …]; returns the uniforms (uK: how dark it is)
export function lightPools(scene, pts) {
  const geo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const on = new Float32Array(pts.length);
  const material = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    vertexShader: `attribute float aOn; uniform float uK; varying vec2 vUv; varying vec3 vC; varying float vA;
      void main() { vUv = uv * 2.0 - 1.0; vC = instanceColor; vA = smoothstep(aOn, aOn + 0.15, uK);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vC; varying float vA;
      void main() { float r = length(vUv); if (r > 1.0) discard; float a = (1.0 - r) * (1.0 - r); gl_FragColor = vec4(vC * a * vA * 0.42, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const im = new THREE.InstancedMesh(geo, material, pts.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  pts.forEach(([x, y, z, color, r, k, sx = 1], i) => {
    o.position.set(x, y, z); o.scale.set(r * sx, 1, r); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    im.setColorAt(i, c.set(color).convertLinearToSRGB()); on[i] = k;
  });
  geo.setAttribute('aOn', new THREE.InstancedBufferAttribute(on, 1));
  im.frustumCulled = false; im.renderOrder = 1; im.castShadow = im.receiveShadow = false;
  scene.add(im);
  return material.uniforms;
}

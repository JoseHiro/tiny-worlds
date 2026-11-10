// The lagoon's water (lagoon/DESIGN.md §1.4, §2.6): one clear sheet the shape of the board, so the sand, the coral and the
// fish show through, clearer looking straight down and less so at a glancing look. Low swells roll across it (the boats
// ride them: waveY) and small ripples are drawn into the normal, so the low sun breaks into glints. Its colour comes from
// where it is: emerald in the middle, deeper blue-green toward the front, dark where the cliffs' green is mirrored at their
// feet, with a little foam where it laps them. Round the edge the cross-section shows, like glass; under it the board.
import * as THREE from 'three';
import { TOWERS, FLOOR } from './cliffs.js';

export const W = 34, D = 32;
const R = 2.2;
const roundRect = (w, d, r) => { const s = new THREE.Shape(), x = -w / 2, y = -d / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };

// the swells: [direction, wavenumber, speed, height]. The same in JS (for what floats) and in the shader.
const SWELLS = [[0.4, 0.85, 1.1, 0.04], [2.2, 1.25, 1.4, 0.025], [-0.9, 1.7, 1.8, 0.016]];
export const waveY = (x, z, t) => SWELLS.reduce((h, [a, k, w, A]) => h + A * Math.sin((Math.cos(a) * x + Math.sin(a) * z) * k - t * w), 0);
const f = (x) => x.toFixed(4);
const SW = `
    float swellH(vec2 p, float t, out vec2 d) { float h = 0.0, ph; d = vec2(0.0);
      ${SWELLS.map(([a, k, w, A]) => `ph = dot(vec2(${f(Math.cos(a))}, ${f(Math.sin(a))}), p) * ${f(k)} - t * ${f(w)}; h += ${f(A)} * sin(ph); d += vec2(${f(Math.cos(a) * k * A)}, ${f(Math.sin(a) * k * A)}) * cos(ph);`).join('\n      ')}
      return h; }`;

export function water(scene, life, sunDir) {
  const shape = roundRect(W, D, R);
  const top = new THREE.PlaneGeometry(W, D, 170, 160).rotateX(-Math.PI / 2);
  const towers = TOWERS.map(([x, z, rx, rz]) => new THREE.Vector4(x, z, (rx + rz) / 2, 0));
  const uniforms = { uTime: { value: 0 }, uTowers: { value: towers }, uSun: { value: sunDir } };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.0, color: 0xffffff, transparent: true }); /* (the light's own highlight soft and wide; the sharp glints are drawn below) */
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; uniform float uTime;\n${SW}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec2 d; vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz; transformed.y += swellH(wp.xz, uTime, d); }\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP; uniform float uTime; uniform vec4 uTowers[${towers.length}]; uniform vec3 uSun;
        ${SW}
        // ripples: a few small waves running different ways; returns the slope (d/dx, d/dz)
        vec2 slope(vec2 p) {
          vec2 s = vec2(0.0);
          for (int i = 0; i < 7; i++) {
            float fi = float(i), a = fi * 2.399 + 0.6, k = 2.4 + fi * 1.35, w = 0.9 + fi * 0.33;
            vec2 d = vec2(cos(a), sin(a));
            s += d * k * cos(dot(d, p) * k + uTime * w + fi * 1.7) * (0.028 / (1.0 + fi * 0.35));
          }
          vec2 big; swellH(p, uTime, big);
          return s + big;
        }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        { vec2 q = abs(vWP.xz) - vec2(${(W / 2 - R).toFixed(2)}, ${(D / 2 - R).toFixed(2)}); if (length(max(q, 0.0)) > ${R.toFixed(2)}) discard; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float near = 99.0;
        for (int i = 0; i < ${towers.length}; i++) near = min(near, length(vWP.xz - uTowers[i].xy) - uTowers[i].z);
        vec3 emerald = vec3(0.0, 0.5, 0.47), front = vec3(0.0, 0.3, 0.42), mirror = vec3(0.03, 0.2, 0.17);
        vec3 col = mix(emerald, front, smoothstep(-4.0, 15.0, vWP.z));
        float edge = 1.0 - smoothstep(0.0, 3.2, near);
        col = mix(col, mirror, edge * 0.75);
        // the foam where it laps the cliffs: a ring that comes and goes with the swell
        float lap = (1.0 - smoothstep(-0.9, 0.15, near)) * (0.55 + 0.45 * sin(uTime * 1.6 + vWP.x * 0.7 + vWP.z * 0.5));
        float foam = lap * smoothstep(0.35, 0.65, fract(sin(dot(floor(vWP.xz * 9.0), vec2(12.9898, 78.233))) * 43758.5453) * 0.6 + lap * 0.5);
        col = mix(col, vec3(0.95, 1.0, 0.98), foam);
        diffuseColor.rgb = col;
        { vec3 V = normalize(cameraPosition - vWP); float look = 1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0);
          diffuseColor.a = clamp(mix(0.28, 0.9, pow(look, 2.2)) + edge * 0.35 + foam, 0.0, 0.95); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 s = slope(vWP.xz); normal = normalize((viewMatrix * vec4(normalize(vec3(-s.x, 1.0, -s.y)), 0.0)).xyz); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 V = normalize(cameraPosition - vWP); float fr = pow(1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0), 4.0);
          totalEmissiveRadiance += vec3(0.55, 0.8, 0.85) * fr * 0.12 + diffuseColor.rgb * vec3(0.05, 0.3, 0.3);
          // the glints: the sun where it is seen (low in the gap), caught by the ripples, finer ripples breaking it into
          // points. Far off a glint is smaller than a pixel and the bloom makes it a square, so they fade with distance.
          vec2 s = slope(vWP.xz) + slope(vWP.xz * 3.1 + 7.0) * 0.7; vec3 N = normalize(vec3(-s.x, 1.0, -s.y));
          float g = pow(max(dot(reflect(-V, N), uSun), 0.0), 700.0) * (1.0 - smoothstep(12.0, 28.0, length(cameraPosition - vWP)));
          totalEmissiveRadiance += vec3(1.0, 0.97, 0.88) * min(g * 2.2, 1.6); diffuseColor.a = max(diffuseColor.a, min(g * 2.0, 1.0)); }`);
  };
  const sheet = new THREE.Mesh(top, mat); sheet.receiveShadow = true; scene.add(sheet);

  // round the edge: the water's cross-section, like glass, clear blue going deeper (walls only, so you look in from the side)
  const ring = shape.getPoints(12), pos = [], col = [], a = new THREE.Color('#3fd8cc'), b = new THREE.Color('#0a6a88');
  for (let i = 0; i < ring.length; i++) {
    const p0 = ring[i], p1 = ring[(i + 1) % ring.length]; // (the shape's y is the world's -z)
    for (const [x, z, y] of [[p0.x, -p0.y, 0], [p0.x, -p0.y, FLOOR], [p1.x, -p1.y, 0], [p1.x, -p1.y, 0], [p0.x, -p0.y, FLOOR], [p1.x, -p1.y, FLOOR]]) { pos.push(x, y - 0.005, z); const k = a.clone().lerp(b, y / FLOOR); col.push(k.r, k.g, k.b); }
  }
  const sideG = new THREE.BufferGeometry(); sideG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sideG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); sideG.computeVertexNormals();
  const side = new THREE.Mesh(sideG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, emissive: 0x0b6f80, emissiveIntensity: 0.3, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }));
  side.renderOrder = 2; scene.add(side);
  const boardG = new THREE.ExtrudeGeometry(roundRect(W + 0.6, D + 0.6, 2.5), { depth: 0.55, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, curveSegments: 12 }).rotateX(Math.PI / 2).translate(0, FLOOR - 0.02, 0);
  const board = new THREE.Mesh(boardG, new THREE.MeshStandardMaterial({ color: 0xecd9b8, roughness: 0.8 })); board.receiveShadow = true; scene.add(board);

  life.push((t) => { uniforms.uTime.value = t; });
  return sheet;
}

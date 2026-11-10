// The limestone cliffs (lagoon/DESIGN.md §1.3, §4): each a tall column standing straight out of the water, bitten in at the
// waterline (the notch), bulging a little higher up and rounded off into a dome on top, its outline broken by angle so no
// two look alike. All of them are one mesh. The rock's pale grey and cream, its rain streaks, rust stains and the green
// that hangs down from the top are painted by the shader from where a point is and which way it faces; the trees on top
// are round clumps, all in one more mesh.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit, toy } from '../../fuji/src/kit.js';

export const FLOOR = -1.4; // (the bottom of the water, where the board starts)
// [x, z, radius across, radius deep, height, turn]. The gap between the left-hand ones and the back is where the sun is.
export const TOWERS = [
  [-12.9, 12.4, 2.9, 2.6, 6, 0.5], [-13.8, 5.4, 3.4, 3.9, 9, -0.2], [-14.2, -0.6, 3.2, 3.4, 10, 0.6], [-11.6, -5.2, 3.6, 3.6, 11.5, 0.3],
  [-4.4, -12.7, 3.9, 3.3, 12, 0.1], [3, -13.1, 4.6, 3.4, 11.5, -0.15], [10, -10.9, 4.2, 3.6, 13.5, 0.4],
  [12.8, -2.6, 4.4, 5.4, 14.5, 0.1], [13.6, 6, 3.6, 4, 10, -0.3], [12.7, 12.6, 2.9, 2.6, 6.5, 0.2],
];
const rnd = (i) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };

// the surface of tower t: a sheer wall, bitten in at the waterline, up to `wall`; above it a green slope leaning in to a
// peak off the middle. at(a, y): the point at angle a and height y (out: past the surface by that share)
function shape(t, i) {
  const [cx, cz, rx, rz, h, turn] = t, s = i * 1.7 + 0.4, wall = h * (0.5 + rnd(i + 3) * 0.16), la = rnd(i + 9) * Math.PI * 2, lean = 0.35;
  const outline = (a, y, v) => 1 + (0.08 * Math.sin(3 * a + s) + 0.05 * Math.sin(5 * a + 2 * s + y * 0.25) + 0.035 * Math.sin(9 * a + y * 0.4 + s * 3)) * (1 + v * 1.6) + 0.022 * Math.sin(23 * a + s * 5 + y * 0.1) + 0.015 * Math.sin(41 * a + y * 0.7);
  const profile = (y) => (y < 0 ? 0.97 : y < 0.75 ? 1 - 0.14 * Math.sin((Math.PI * y) / 0.75) : 0.97 + 0.04 * Math.sin(y * 0.55 + s) + 0.05 * THREE.MathUtils.smoothstep(y, wall * 0.6, wall));
  const at = (a, y, out = new THREE.Vector3(), more = 1) => {
    const v = y > wall ? (y - wall) / (h - wall) : 0, f = Math.pow(1 - v, 0.62) * (1 - v * 0.08) + 0.0005;
    const k = outline(a, y, v) * profile(Math.min(y, wall)) * f * more, lx = Math.cos(a) * rx * k + Math.cos(la) * rx * lean * v ** 1.5, lz = Math.sin(a) * rz * k + Math.sin(la) * rz * lean * v ** 1.5;
    return out.set(cx + lx * Math.cos(turn) - lz * Math.sin(turn), y, cz + lx * Math.sin(turn) + lz * Math.cos(turn));
  };
  const rows = [];
  for (let j = 0; j <= 3; j++) rows.push(FLOOR + (j / 3) * (0 - FLOOR));
  for (let j = 1; j <= 6; j++) rows.push((j / 6) * 0.75); // (the notch, finely)
  for (let j = 1; j <= 14; j++) rows.push(0.75 + (j / 14) * (wall - 0.75));
  for (let j = 1; j <= 16; j++) rows.push(wall + (1 - (1 - j / 16) ** 1.3) * (h - wall));
  return { at, rows, h, wall };
}

function tower(t, i) {
  const { at, rows, h } = shape(t, i), A = 80, R = rows.length;
  const pos = new Float32Array(A * R * 3), up = new Float32Array(A * R), v = new THREE.Vector3();
  rows.forEach((y, j) => { for (let k = 0; k < A; k++) { at((k / A) * Math.PI * 2, y, v); pos.set([v.x, v.y, v.z], (j * A + k) * 3); up[j * A + k] = y / h; } });
  const idx = [];
  for (let j = 0; j < R - 1; j++) for (let k = 0; k < A; k++) { const a = j * A + k, b = j * A + ((k + 1) % A), c = a + A, d = b + A; idx.push(a, c, b, b, c, d); } // (round the loop: no seam)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aUp', new THREE.BufferAttribute(up, 1)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const NOISE = `
  float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`;

export function cliffs(scene) {
  const geo = mergeGeometries(TOWERS.map(tower));
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aUp; varying float vUp; varying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvUp = aUp; vWP = (modelMatrix * vec4(position, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying float vUp; varying vec3 vWP; varying vec3 vWN;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 p = vWP; vec3 n = normalize(vWN);
        vec3 st = vec3(p.x * 2.2, p.y * 0.16, p.z * 2.2); // (stretched tall: the streaks run down the wall)
        vec3 rock = mix(vec3(0.88, 0.83, 0.72), vec3(0.95, 0.91, 0.8), n3(p * 0.6));
        rock = mix(rock, vec3(0.55, 0.52, 0.47), smoothstep(0.58, 0.72, n3(st)) * 0.8);
        rock = mix(rock, vec3(0.8, 0.55, 0.3), smoothstep(0.62, 0.74, n3(st * 0.7 + 7.0)) * (1.0 - vUp * 0.4));
        rock = mix(rock, vec3(0.38, 0.36, 0.33), smoothstep(0.66, 0.78, n3(st * 1.6 + 3.0)) * 0.65);
        rock = mix(rock, vec3(0.28, 0.27, 0.25), 1.0 - smoothstep(0.15, 0.8, p.y)); // (the notch and the waterline, dark)
        float g = vUp * 0.6 + smoothstep(0.15, 0.5, n.y) * 0.9 + (n3(vec3(p.x * 0.9, p.y * 0.07, p.z * 0.9) + 11.0) - 0.5) * 0.7 + (n3(st * 0.8 + 21.0) - 0.5) * 0.3;
        float green = smoothstep(0.62, 0.7, g) * smoothstep(0.6, 1.2, p.y);
        vec3 leaf = mix(vec3(0.17, 0.4, 0.21), vec3(0.5, 0.71, 0.24), n3(p * 1.7 + 5.0));
        diffuseColor.rgb = mix(rock, leaf, green);
        diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(-0.35, 0.25, dot(n, normalize(vec3(-0.6, 0.5, -0.62))))); // (turned from the sun: backlit, darker, as in the photo)
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.55, 0.5), (1.0 - smoothstep(-0.6, 0.0, p.y)) * 0.8);`);
  };
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; scene.add(m);

  // the trees: small round clumps all over the slopes, thicker toward the peak (the green down the walls is the shader's)
  const kit = new Kit(), ico = new THREE.IcosahedronGeometry(1, 1), v = new THREE.Vector3();
  const greens = [0x2f6b3a, 0x3f7d2f, 0x5c9a35, 0x8fbf3f, 0x4f8a2e, 0x6fa83a];
  TOWERS.forEach((t, i) => {
    const { at, wall, h } = shape(t, i), n = Math.round((t[2] + t[3]) * 15);
    for (let k = 0; k < n; k++) {
      const a = rnd(i * 97 + k) * Math.PI * 2, y = wall + Math.pow(rnd(i * 31 + k * 3), 0.7) * (h - wall) * 0.97;
      at(a, y, v);
      const s = 0.28 + rnd(k * 7 + i) * 0.36;
      kit.add(ico, greens[(k + i) % greens.length], v.x, v.y + s * 0.2, v.z, { s: [s, s * 0.8, s] });
    }
  });
  const trees = kit.bake(toy()); trees.castShadow = trees.receiveShadow = true; scene.add(trees);
  ico.dispose();
  return m;
}

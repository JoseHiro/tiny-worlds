// Under the water (lagoon/DESIGN.md §4): the sand floor you see through the clear water — pale bars where it is shallow,
// deeper hollows, rubble rising toward each cliff's foot — tinted by the water above it, with caustics playing over it.
// Coral and rocks grow along the cliffs' feet (one mesh). The floor is cut to the board's rounded corners.
import * as THREE from 'three';
import { Kit, toy } from '../../fuji/src/kit.js';
import { TOWERS, FLOOR } from './cliffs.js';

const W = 34, D = 32, R = 2.2;
const rnd = (i) => { const x = Math.sin(i * 78.233 + 1.3) * 43758.5453; return x - Math.floor(x); };
const nearCliff = (x, z) => { let d = 99; for (const [cx, cz, rx, rz] of TOWERS) d = Math.min(d, Math.hypot(x - cx, z - cz) - (rx + rz) / 2); return d; };
// the floor's height at (x, z): never above -0.3, so the boats still float over water
export function floorY(x, z) {
  let y = -1.25;
  for (const [bx, bz, sx, sz, h] of [[3, 4, 18, 9, 0.7], [-6, 7, 10, 14, 0.55], [7.5, 1.8, 6, 8, 0.6], [-2, -6, 20, 8, 0.35]]) y += h * Math.exp(-((x - bx) ** 2) / sx - ((z - bz) ** 2) / sz);
  y += 0.75 * Math.exp(-Math.max(0, nearCliff(x, z)) / 1.6); // (rubble at the cliffs' feet)
  y += Math.sin(x * 1.3 + z * 0.4) * 0.03 + Math.sin(z * 1.7 - x * 0.6) * 0.025; // (ripples in the sand)
  return Math.min(-0.3, Math.max(FLOOR + 0.02, y));
}

export function seabed(scene, loop) {
  const g = new THREE.PlaneGeometry(W - 0.1, D - 0.1, 120, 112).rotateX(-Math.PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, floorY(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const u = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = u.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; uniform float uTime;
        float caustic(vec2 p) { float c = 0.0; for (int i = 0; i < 3; i++) { float fi = float(i); vec2 q = p * (1.3 + fi * 0.7) + vec2(uTime * (0.35 + fi * 0.1), -uTime * 0.27); c += abs(sin(q.x + sin(q.y * 1.3)) * sin(q.y + sin(q.x * 1.1 + fi))); } return pow(1.0 - c / 3.0, 5.0); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        { vec2 q = abs(vWP.xz) - vec2(${(W / 2 - R).toFixed(2)}, ${(D / 2 - R).toFixed(2)}); if (length(max(q, 0.0)) > ${R.toFixed(2)}) discard; }`) // (the board's rounded corners)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float deep = clamp(-vWP.y / 1.3, 0.0, 1.0);
        vec3 sand = mix(vec3(0.95, 0.9, 0.76), vec3(0.86, 0.8, 0.66), sin(vWP.x * 3.1) * sin(vWP.z * 2.7) * 0.5 + 0.5);
        diffuseColor.rgb = mix(sand * vec3(0.7, 1.0, 0.95), vec3(0.0, 0.42, 0.5), smoothstep(0.15, 1.0, deep));`) // (the water over it takes the red out, more the deeper)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.75, 1.0, 0.95) * caustic(vWP.xz * 1.1) * (1.0 - deep * 0.6) * 0.5;`);
  };
  const floor = new THREE.Mesh(g, mat); floor.receiveShadow = true; scene.add(floor);

  // coral along the cliffs' feet and in a garden on the right, where the snorkellers are
  const kit = new Kit(), ball = new THREE.SphereGeometry(1, 12, 9), stick = new THREE.CylinderGeometry(0.5, 0.7, 1, 6), fan = new THREE.CircleGeometry(1, 12);
  const PINK = [0xff8fa3, 0xff6f91], PURPLE = [0x9b7fd4, 0xb59ce6], ORANGE = [0xffa45c, 0xff8a3d], YELLOW = [0xffd86b, 0xf6c445], TEAL = [0x5fd0c4, 0x3fb8b0];
  const spots = [];
  TOWERS.forEach(([cx, cz, rx, rz], i) => { for (let k = 0; k < 16; k++) { const a = rnd(i * 41 + k) * Math.PI * 2, r = (rx + rz) / 2 + 0.4 + rnd(i * 7 + k * 3) * 1.6; spots.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } });
  for (let k = 0; k < 46; k++) spots.push([6.2 + (rnd(k * 5) - 0.5) * 5, 1.8 + (rnd(k * 9) - 0.5) * 5]);
  spots.forEach(([x, z], k) => {
    if (Math.abs(x) > W / 2 - 0.8 || Math.abs(z) > D / 2 - 0.8) return;
    const y = floorY(x, z), kind = k % 5, s = 0.6 + rnd(k * 13) * 0.7;
    if (kind === 0) kit.add(ball, YELLOW[k % 2], x, y + 0.05 * s, z, { s: [0.2 * s, 0.13 * s, 0.2 * s] }); // brain coral
    else if (kind === 1) for (let b = 0; b < 5; b++) { const a = b * 1.26 + k, l = 0.18 * s; kit.add(stick, PINK[b % 2], x + Math.cos(a) * 0.05, y + l * 0.45, z + Math.sin(a) * 0.05, { s: [0.035 * s, l, 0.035 * s], rx: Math.sin(a) * 0.5, rz: Math.cos(a) * 0.5 }); kit.ball(0.03 * s, PINK[1], x + Math.cos(a) * (0.05 + l * 0.45), y + l * 0.88, z + Math.sin(a) * (0.05 + l * 0.45)); } // branching
    else if (kind === 2) kit.add(fan, PURPLE[k % 2], x, y + 0.17 * s, z, { s: 0.17 * s, ry: rnd(k) * 3 }); // sea fan
    else if (kind === 3) for (let b = 0; b < 3; b++) kit.add(stick, ORANGE[b % 2], x + (b - 1) * 0.06, y + 0.06 * s, z + (b % 2) * 0.05, { s: [0.045 * s, 0.12 * s, 0.045 * s] }); // tubes
    else kit.add(ball, k % 3 ? 0x9a978c : TEAL[k % 2], x, y + 0.03, z, { s: [0.24 * s, 0.11 * s, 0.18 * s], ry: k }); // a rock, or a soft coral
  });
  const coral = kit.bake(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide })); coral.receiveShadow = true; scene.add(coral);
  for (const x of [ball, stick, fan]) x.dispose();

  loop.push((t) => { u.uTime.value = t; });
}

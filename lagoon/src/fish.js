// The fish (lagoon/DESIGN.md §4): schools going round under the boats, each fish a little apart from its neighbours and
// wagging as it swims; yellow butterflyfish, blue tangs, striped sergeants, green parrotfish, silver sardines in a
// tight ball, and one small blacktip shark cruising slowly. All the fish are one instanced mesh, coloured per fish.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { floorY } from './seabed.js';

// a fish, nose +x: a body darker on the back and pale underneath, and a tail
function fishGeo() {
  const body = new THREE.SphereGeometry(1, 12, 8).scale(0.11, 0.055, 0.028).toNonIndexed(); body.deleteAttribute('uv'); // (only position and normal, like the tail and fin)
  const tail = new THREE.BufferGeometry(); tail.setAttribute('position', new THREE.Float32BufferAttribute([-0.09, 0, 0, -0.17, 0.05, 0, -0.17, -0.05, 0, -0.09, 0, 0, -0.17, -0.05, 0, -0.17, 0.05, 0], 3)); tail.computeVertexNormals();
  const fin = new THREE.BufferGeometry(); fin.setAttribute('position', new THREE.Float32BufferAttribute([0.04, 0.045, 0, -0.05, 0.045, 0, -0.03, 0.085, 0, 0.04, 0.045, 0, -0.03, 0.085, 0, -0.05, 0.045, 0], 3)); fin.computeVertexNormals();
  const g = mergeGeometries([body, tail, fin]), p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = 0.65 + 0.35 * (1 - (p.getY(i) + 0.06) / 0.15) + (Math.abs(p.getX(i) - 0.02) < 0.012 || Math.abs(p.getX(i) + 0.04) < 0.012 ? -0.25 : 0); c.set([k, k, k], i * 3); } // (the back darker, the belly paler, two faint bands)
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
// [centre x, z, radius x, z, depth, speed, how many, colours, size, spread]
const SCHOOLS = [
  [6.4, 1.8, 2.4, 1.8, -0.45, 0.45, 18, [0xffd23f, 0xffe066], 0.9, 0.5], // butterflyfish over the coral garden
  [0, 2, 5.5, 3.5, -0.7, 0.6, 22, [0x3f7fe0, 0x5f9ff0], 1, 0.6], // blue tangs, a wide loop
  [-5, 4, 2.6, 3.2, -0.55, -0.5, 16, [0xe8e6a0, 0xd8d690], 0.8, 0.45], // sergeant majors (pale yellow, banded)
  [2, -6, 4.5, 2.4, -0.8, -0.4, 10, [0x4fc8a0, 0x7fd88a], 1.5, 0.6], // parrotfish
  [-2, -1, 1.6, 1.4, -0.85, 0.9, 46, [0xd8e4ec, 0xc0d0dc], 0.6, 0.28], // a ball of sardines
  [9.5, -6, 1.6, 2.2, -0.5, 0.5, 10, [0xff8a3d, 0xffffff], 0.85, 0.4], // clownish orange ones at the cliff foot
];
const rnd = (i) => { const x = Math.sin(i * 91.17 + 0.7) * 43758.5453; return x - Math.floor(x); };

export function fish(scene, loop) {
  const list = [];
  SCHOOLS.forEach(([cx, cz, rx, rz, y, v, n, cols, size, spread], s) => { for (let i = 0; i < n; i++) list.push({ cx, cz, rx, rz, y, v, size: size * (0.85 + rnd(s * 50 + i) * 0.3), col: cols[i % 2], off: [(rnd(i * 3 + s) - 0.5) * spread * 2, (rnd(i * 5 + s) - 0.5) * spread * 0.5, (rnd(i * 7 + s) - 0.5) * spread * 2], lag: rnd(i * 11 + s) * 0.5, ph: rnd(i + s * 9) * 6 }); });
  const mesh = new THREE.InstancedMesh(fishGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, side: THREE.DoubleSide }), list.length);
  const c = new THREE.Color(); list.forEach((f, i) => mesh.setColorAt(i, c.set(f.col)));
  mesh.frustumCulled = false; scene.add(mesh);

  // the blacktip: grey above, white below, black tips to its fins
  const shark = new THREE.Group(); scene.add(shark);
  const grey = new THREE.MeshStandardMaterial({ color: 0x8a96a0, roughness: 0.6 }), black = new THREE.MeshStandardMaterial({ color: 0x2b3448, roughness: 0.6 }), white = new THREE.MeshStandardMaterial({ color: 0xeef2f2, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), grey); body.scale.set(0.45, 0.09, 0.1); shark.add(body);
  const belly = new THREE.Mesh(body.geometry, white); belly.scale.set(0.4, 0.06, 0.085); belly.position.y = -0.03; shark.add(belly);
  const tri = (pts, m) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.computeVertexNormals(); const o = new THREE.Mesh(g, m); o.material.side = THREE.DoubleSide; return o; };
  shark.add(tri([0.06, 0.07, 0, -0.1, 0.07, 0, -0.06, 0.22, 0], grey), tri([-0.03, 0.18, 0, -0.06, 0.22, 0, -0.08, 0.17, 0], black));
  for (const s of [-1, 1]) shark.add(tri([0.08, -0.03, s * 0.06, -0.04, -0.04, s * 0.06, -0.06, -0.08, s * 0.24], grey));
  const tail = new THREE.Group(); tail.position.x = -0.42; shark.add(tail);
  tail.add(tri([0, 0, 0, -0.18, 0.2, 0, -0.1, 0, 0], grey), tri([0, 0, 0, -0.1, 0, 0, -0.14, -0.13, 0], grey), tri([-0.14, 0.15, 0, -0.18, 0.2, 0, -0.13, 0.19, 0], black));
  for (const o of shark.children) o.castShadow = false;

  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3();
  loop.push((t) => {
    list.forEach((f, i) => {
      const a = (t - f.lag) * f.v / ((f.rx + f.rz) / 2) + f.ph * 0.15, sg = Math.sign(f.v);
      const x = f.cx + Math.cos(a) * (f.rx + f.off[0]), z = f.cz + Math.sin(a) * (f.rz + f.off[2]);
      const y = Math.max(floorY(x, z) + 0.12, Math.min(-0.18, f.y + f.off[1] + Math.sin(t * 0.7 + f.ph) * 0.06));
      const dx = -Math.sin(a) * f.rx * sg, dz = Math.cos(a) * f.rz * sg;
      Q.setFromEuler(E.set(0, Math.atan2(-dz, dx) + Math.sin(t * 9 + f.ph) * 0.18, 0)); // (the wag)
      M.compose(P.set(x, y, z), Q, S.setScalar(f.size)); mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true;
    const a = t * 0.05;
    const sx = -1 + Math.cos(a) * 6.5, sz = -1 + Math.sin(a) * 5;
    shark.position.set(sx, Math.max(floorY(sx, sz) + 0.2, -0.95 + Math.sin(t * 0.4) * 0.05), sz);
    shark.rotation.y = Math.atan2(-Math.cos(a) * 5, -Math.sin(a) * 6.5) + Math.sin(t * 2.2) * 0.06;
    tail.rotation.y = Math.sin(t * 2.2) * 0.35;
  });
}

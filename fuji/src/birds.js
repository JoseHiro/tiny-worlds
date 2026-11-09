// The birds (fuji/DESIGN.md §4): small flocks in a loose V drifting across the sky in front of the mountain, beating and
// gliding by turns. Three InstancedMeshes (body and two wings), and all from the clock.
import * as THREE from 'three';

const wing = (s) => { // a soft triangle out from the shoulder along ±z
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0.07, 0, 0, -0.08, 0, 0, -0.03, 0, s * 0.3, 0.07, 0, 0, -0.03, 0, s * 0.3, -0.08, 0, 0], 3));
  g.computeVertexNormals();
  return g;
};
// [height, depth, speed (a sign for its way), start, how many]
const FLOCKS = [[5.7, -4.6, 0.62, -4, 7], [7.2, -3.6, 0.46, 9, 5], [4.7, -2.4, -0.55, 3, 5]];
const SPAN = 34;

export function birds(scene, life) {
  const list = FLOCKS.flatMap(([y, z, v, at], f) => Array.from({ length: FLOCKS[f][4] }, (_, i) => { const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; return { y: y + row * 0.05 * side, z: z + row * 0.2 * side, v, at, back: row * 0.34, ph: f * 2.1 + i * 0.7 }; }));
  const mat = new THREE.MeshStandardMaterial({ color: 0x3c4778, roughness: 0.9, side: THREE.DoubleSide });
  const body = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6).scale(0.13, 0.045, 0.05), mat, list.length);
  const wings = [wing(1), wing(-1)].map((g) => new THREE.InstancedMesh(g, mat, list.length));
  for (const m of [body, ...wings]) { m.frustumCulled = false; scene.add(m); }
  const M = new THREE.Matrix4(), W = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), R = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  life.push((t) => {
    list.forEach((b, i) => {
      const dir = Math.sign(b.v), u = ((Math.abs(b.v) * t + b.at) % SPAN + SPAN) % SPAN - SPAN / 2 - b.back; // (those at the back of the V, a little behind)
      P.set(u * dir, b.y + Math.sin(t * 0.7 + b.ph) * 0.08, b.z);
      Q.setFromAxisAngle(Y, dir > 0 ? 0 : Math.PI);
      M.compose(P, Q, one); body.setMatrixAt(i, M);
      const beat = Math.sin(t * 0.55 + b.ph) > -0.2 ? Math.sin(t * 11 + b.ph) * 0.62 : 0.12; // (a run of beats, then a glide)
      [1, -1].forEach((s, k) => { W.makeRotationFromQuaternion(R.setFromAxisAngle(X, -s * beat)); wings[k].setMatrixAt(i, W.premultiply(M)); });
    });
    body.instanceMatrix.needsUpdate = true; for (const w of wings) w.instanceMatrix.needsUpdate = true;
  });
}

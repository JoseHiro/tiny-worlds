// Roads & towns — roadside nature (town/DESIGN.md §2.5). Plants are one merged shape drawn many times
// (InstancedMesh), bent in the vertex shader by the sea-life kit's "sway" — so a whole field is one draw call.
import * as THREE from 'three';
import { part, assemble, tube, seeded, swimMaterial } from '../../sealife/src/kit.js';
import { mat, mesh } from '../../airport/src/parts.js';
import { TILE } from './roads.js';

// one cane plant: a jointed stalk and long arching leaves from the top third
let caneGeo = null;
function canePlant() {
  if (caneGeo) return caneGeo; // shared by every field
  const rnd = seeded(12);
  const parts = [];
  for (const [dx, dz, h] of [[0, 0, 2.5], [0.08, 0.05, 2.2], [-0.06, 0.07, 2.35]]) {
    parts.push(part(tube([[dx, 0, dz], [dx + 0.02, h * 0.5, dz], [dx + 0.05, h, dz + 0.02]], 0.035, 0.025, 5), (p) => (Math.sin(p.y * 9) > 0.93 ? '#a9b56a' : '#8fa65a')));
    for (let i = 0; i < 6; i++) {
      const a = rnd() * Math.PI * 2, y = h * (0.55 + i * 0.07), reach = 0.7 + rnd() * 0.5;
      const ca = Math.cos(a), sa = Math.sin(a);
      parts.push(part(tube([[dx, y, dz], [dx + ca * reach * 0.5, y + 0.35, dz + sa * reach * 0.5], [dx + ca * reach, y + 0.1, dz + sa * reach], [dx + ca * reach * 1.25, y - 0.35, dz + sa * reach * 1.25]], 0.035, 0.008, 3), i < 2 ? '#c2b56a' : '#6fa04c'));
    }
  }
  caneGeo = assemble(parts);
  return caneGeo;
}

// a field filling one tile (or w × d), rows along x; gusts of wind roll across it from −x
export function caneField({ w = TILE, d = TILE, rows = 0.9, step = 0.5, seed = 3 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'nature', nature: 'caneField' };
  // Okinawa's red soil, with furrows
  const soil = mat(0xa45a3c, { roughness: 1 });
  g.add(mesh(new THREE.BoxGeometry(w, 0.1, d), soil, 0, 0.05, 0));
  for (let z = -d / 2 + rows / 2; z < d / 2; z += rows) g.add(mesh(new THREE.BoxGeometry(w - 0.2, 0.08, 0.3), mat(0x8d4a30, { roughness: 1 }), 0, 0.12, z));
  const spots = [];
  const rnd = seeded(seed);
  for (let z = -d / 2 + rows / 2; z < d / 2; z += rows) for (let x = -w / 2 + step / 2; x < w / 2; x += step) {
    if (rnd() < 0.06) continue;
    spots.push([x + (rnd() - 0.5) * 0.15, z + (rnd() - 0.5) * 0.12, 0.8 + rnd() * 0.35, rnd() * 6.28]);
  }
  const m = swimMaterial({ mode: 'sway', amp: 0.28, freq: 1.25, waves: 0.18, z0: 0.3, len: 2.4 }, { roughness: 0.85 });
  const field = new THREE.InstancedMesh(canePlant(), m, spots.length);
  const geo = field.geometry = canePlant().clone(); // per-field geometry only for the phase attribute
  // the wind's phase follows x, so a gust visibly travels across the field; a little randomness per plant
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(Float32Array.from(spots, ([x, , , r]) => -x * 0.45 + r * 0.08), 1));
  const o = new THREE.Object3D();
  spots.forEach(([x, z, s, r], i) => { o.position.set(x, 0.1, z); o.rotation.set(0, r, 0); o.scale.set(1, s, 1); o.updateMatrix(); field.setMatrixAt(i, o.matrix); });
  field.castShadow = true;
  field.receiveShadow = true;
  g.add(field);
  // gusts: the sway grows and fades
  g.userData.update = (t) => { m.userData.swim.uAmp.value = 0.18 + 0.14 * Math.max(0, Math.sin(t * 0.35)) ** 2; };
  g.userData.count = spots.length;
  return g;
}

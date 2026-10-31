// Draw-call reduction: merge meshes that never move relative to each other.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const mergeable = (o) => o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && o.visible && o.children.length === 0;

function prepare(geo, matrix, keepColor = false) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', ...(keepColor ? ['color'] : [])].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  g.applyMatrix4(matrix);
  return g;
}

function mergeInto(parent, meshes, matrixOf) {
  const byMat = new Map();
  for (const m of meshes) {
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(m);
  }
  for (const [material, list] of byMat) {
    if (list.length < 2) continue;
    const merged = mergeGeometries(list.map((m) => prepare(m.geometry, matrixOf(m), material.vertexColors))); // (vertex colours: baked instance colours)
    if (!merged) continue;
    const out = new THREE.Mesh(merged, material);
    out.castShadow = list.some((m) => m.castShadow);
    out.receiveShadow = list.some((m) => m.receiveShadow);
    parent.add(out);
    for (const m of list) m.removeFromParent();
  }
}

// Within every group of a character, merge the direct mesh children (limbs keep animating).
export function compactRig(root) {
  const groups = [];
  root.traverse((o) => { if (!o.isMesh) groups.push(o); });
  for (const g of groups) {
    const meshes = g.children.filter(mergeable);
    if (meshes.length > 1) {
      for (const m of meshes) m.updateMatrix();
      mergeInto(g, meshes, (m) => m.matrix);
    }
  }
  return root;
}

// Merge every static mesh below `root` into a few meshes (one per material), baked
// in root space. Materials are shared, so animated materials (screens, belts) still work.
// Left alone: anything that moves — characters, vehicles, and objects marked
// userData.dynamic (moving sub-parts such as gate flaps, trays, bags).
const MOVING_KINDS = new Set(['person', 'airplane', 'car', 'bus', 'fuel', 'tug', 'baggage']);
export function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const meshes = [];
  const walk = (o, locked) => {
    const lock = locked || (o !== root && (o.userData?.dynamic || o.userData?.keep || MOVING_KINDS.has(o.userData?.kind)));
    if (o.isMesh && !lock && mergeable(o)) meshes.push(o);
    for (const c of o.children) walk(c, lock);
  };
  walk(root, false);
  const m4 = new THREE.Matrix4();
  mergeInto(root, meshes, (m) => m4.multiplyMatrices(inv, m.matrixWorld).clone());
  return root;
}

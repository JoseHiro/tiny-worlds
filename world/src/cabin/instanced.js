// Instancing for the whole cabin (world/CABIN.md §6): every seat of a kind, every meal tray, every pod is one
// set of InstancedMeshes, and the filler passengers are three more. Moving parts still move per instance:
// a template part is posed with that instance's state and its meshes' matrices are copied out.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE, SCREENS, mat } from './common.js';
import { SKINS } from '../../../airport/src/looks.js';

const SCREEN_MATS = new Map(Object.entries(SCREENS).map(([k, m]) => [m, k]));
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const MIRROR = new THREE.Matrix4().makeScale(1, 1, -1);

// the nearest moving ancestor (a pivot) of a mesh, or the root; `keep` anywhere on the way stops merging
function layerOf(m, root) {
  let keep = !!m.userData.keep, p = m.parent;
  while (p !== root && !p.userData.dynamic) { keep ||= !!p.userData.keep; p = p.parent; }
  return { layer: p, keep };
}
function prepare(geo, matrix) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  return g.applyMatrix4(matrix);
}
// merge the template's meshes that move together and share a material (screens and kept meshes stay apart)
function bake(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.children.length || SCREEN_MATS.has(o.material)) return;
    const { layer, keep } = layerOf(o, root);
    if (keep) return;
    const key = layer.uuid + o.material.uuid;
    if (!groups.has(key)) groups.set(key, { layer, list: [] });
    groups.get(key).list.push(o);
  });
  for (const { layer, list } of groups.values()) {
    if (list.length < 2) continue;
    const inv = layer.matrixWorld.clone().invert();
    const geo = mergeGeometries(list.map((m) => prepare(m.geometry, inv.clone().multiply(m.matrixWorld))));
    const merged = new THREE.Mesh(geo, list[0].material);
    layer.add(merged);
    for (const m of list) m.removeFromParent();
  }
  root.updateMatrixWorld(true);
}
const shown = (o, root) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };

// One handedness of instances (a mirrored placement needs its own set: see Instances).
class InstSet {
  constructor(make, places, mirror) {
    this.t = make();
    bake(this.t);
    this.places = mirror ? places.map((m) => MIRROR.clone().multiply(m)) : places;
    this.group = new THREE.Group();
    if (mirror) this.group.scale.z = -1; // the mesh matrix flips, so three culls the right faces
    const n = places.length;
    const make1 = (geo, material) => {
      const im = new THREE.InstancedMesh(geo, material, n);
      im.castShadow = im.receiveShadow = true;
      im.frustumCulled = false;
      this.group.add(im);
      return im;
    };
    this.slots = [];
    let sIdx = 0;
    this.t.traverse((o) => {
      if (!o.isMesh) return;
      if (SCREEN_MATS.has(o.material)) this.slots.push({ m: o, screen: sIdx++, by: Object.fromEntries(Object.entries(SCREENS).map(([k, sm]) => [k, make1(o.geometry, sm)])) });
      else this.slots.push({ m: o, im: make1(o.geometry, o.material) });
    });
    this.screens = places.map(() => Array(sIdx).fill('map'));
    this.hidden = places.map(() => false);
  }
  write(i, state) {
    const ud = this.t.userData;
    if (ud.pose) ud.pose(state, 0);
    this.t.updateMatrixWorld(true);
    const m4 = new THREE.Matrix4();
    for (const s of this.slots) {
      const on = !this.hidden[i] && shown(s.m, this.t);
      if (on) m4.multiplyMatrices(this.places[i], s.m.matrixWorld);
      if (s.im) { s.im.setMatrixAt(i, on ? m4 : ZERO); s.im.instanceMatrix.needsUpdate = true; continue; }
      for (const [k, im] of Object.entries(s.by)) { im.setMatrixAt(i, on && this.screens[i][s.screen] === k ? m4 : ZERO); im.instanceMatrix.needsUpdate = true; }
    }
  }
}

// Instances of a stateful part (common.js) at the given placements (Matrix4 each; a mirrored one is fine).
// set(i, {key: value}) eases instance i toward that state; show(i, bool); screen(i, j, 'map' | 'movie' | …).
export class Instances {
  constructor(make, places) {
    this.group = new THREE.Group();
    const flip = places.map((m) => m.determinant() < 0);
    this.sets = [false, true].map((mir) => {
      const idx = places.map((_, i) => i).filter((i) => flip[i] === mir);
      if (!idx.length) return null;
      const set = new InstSet(make, idx.map((i) => places[i]), mir);
      this.group.add(set.group);
      return { set, idx };
    }).filter(Boolean);
    this.where = places.map((_, i) => { for (const s of this.sets) { const j = s.idx.indexOf(i); if (j >= 0) return [s.set, j]; } return null; });
    const init = { ...(this.sets[0].set.t.userData.state ?? {}) };
    this.want = places.map(() => ({ ...init }));
    this.cur = places.map(() => ({ ...init }));
    this.active = new Set(places.map((_, i) => i));
  }
  get count() { return this.want.length; }
  set(i, s) {
    const w = this.want[i];
    for (const k in s) if (w[k] !== s[k]) { w[k] = s[k]; this.active.add(i); }
  }
  show(i, on) { const [set, j] = this.where[i]; if (set.hidden[j] !== !on) { set.hidden[j] = !on; this.active.add(i); } }
  screen(i, k, kind) { const [set, j] = this.where[i]; if (set.screens[j][k] !== kind) { set.screens[j][k] = kind; this.active.add(i); } }
  update(dt) {
    const k = Math.min(1, dt * 3.5);
    for (const i of this.active) {
      const w = this.want[i], c = this.cur[i];
      let done = true;
      for (const key in w) {
        if (typeof w[key] !== 'number') { c[key] = w[key]; continue; }
        const d = w[key] - c[key];
        if (Math.abs(d) < 0.002) c[key] = w[key]; else { c[key] += d * k; done = false; }
      }
      const [set, j] = this.where[i];
      set.write(j, c);
      if (done) this.active.delete(i);
    }
  }
}

// ---------- filler passengers ----------
// Body, head and hair: three InstancedMeshes for everyone. spots: [{ m: Matrix4 (seat, facing +X) }].
// pose(i, 'up' | 'lean' | 'sleep' | 'lie' | 'gone').
const POSES = {
  up: { body: [-0.02, 0.56, 0, 0, 0], head: [-0.02, 0.98, 0, 0, 0], hair: [-0.05, 1.0, 0, 0, 0] },
  lean: { body: [-0.07, 0.55, 0, 0.2, 0], head: [-0.17, 0.95, 0, 0.2, 0], hair: [-0.2, 0.97, 0, 0.2, 0] },
  sleep: { body: [-0.07, 0.55, 0, 0.22, 0], head: [-0.16, 0.9, 0.12, 0.25, 0.45], hair: [-0.19, 0.92, 0.13, 0.25, 0.45] },
  lie: { body: [-0.2, 0.62, 0, Math.PI / 2, 0], head: [-0.62, 0.66, 0, Math.PI / 2, 0], hair: [-0.66, 0.68, 0, Math.PI / 2, 0] },
};
export class Crowd {
  constructor(spots) {
    const n = spots.length;
    this.spots = spots;
    this.group = new THREE.Group();
    const make = (geo, material) => { const im = new THREE.InstancedMesh(geo, material, n); im.castShadow = true; im.frustumCulled = false; this.group.add(im); return im; };
    this.body = make(new THREE.CapsuleGeometry(0.17, 0.16, 4, 10), mat(0xffffff));
    this.head = make(new THREE.SphereGeometry(0.25, 14, 10), mat(0xffffff));
    this.hair = make(new THREE.SphereGeometry(0.265, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff, { roughness: 0.75 }));
    const tops = [PALETTE.sky, PALETTE.navy, PALETTE.teal, PALETTE.orange, PALETTE.pink, PALETTE.green, PALETTE.yellow, PALETTE.grey, PALETTE.red, PALETTE.cream].map((c) => new THREE.Color(c));
    const hairs = [0x1d1f23, 0x2a2018, 0x4a3426, 0x6b4a35, 0xb08a5a, 0xb9b6b0, 0x1d1f23].map((c) => new THREE.Color(c));
    const skins = SKINS.map((c) => new THREE.Color(c));
    spots.forEach((_, i) => {
      this.body.setColorAt(i, tops[(i * 7 + 3) % tops.length]);
      this.head.setColorAt(i, skins[(i * 5) % skins.length]);
      this.hair.setColorAt(i, hairs[(i * 3) % hairs.length]);
    });
    this.poses = spots.map(() => null);
    spots.forEach((_, i) => this.pose(i, 'up'));
  }
  pose(i, name) {
    if (this.poses[i] === name) return;
    this.poses[i] = name;
    const P = POSES[name];
    const part = (im, [x, y, z, rz, rx]) => {
      if (!P) { im.setMatrixAt(i, ZERO); } else {
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1));
        im.setMatrixAt(i, this.spots[i].m.clone().multiply(m));
      }
      im.instanceMatrix.needsUpdate = true;
    };
    part(this.body, P?.body ?? []); part(this.head, P?.head ?? []); part(this.hair, P?.hair ?? []);
  }
}

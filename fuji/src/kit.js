// The toy box (fuji/DESIGN.md §5): everything that doesn't move goes into a Kit and comes out as one mesh with vertex
// colours, so the whole shop is a handful of draw calls. Boxes are rounded unless asked otherwise; a label is a canvas
// painted once and kept by its key.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const c = new THREE.Color(), e = new THREE.Euler(), q = new THREE.Quaternion(), M = new THREE.Matrix4(), P = new THREE.Vector3(), S = new THREE.Vector3();

export class Kit {
  parts = [];
  // a geometry, coloured, placed; `ry`, `rx`, `rz` turn it, `s` scales it (a number or [x, y, z])
  add(geo, color, x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, s = 1, glow = 1 } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    q.setFromEuler(e.set(rx, ry, rz));
    g.applyMatrix4(M.compose(P.set(x, y, z), q, Array.isArray(s) ? S.set(...s) : S.setScalar(s)));
    c.set(color).multiplyScalar(glow);
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    this.parts.push(g);
    return this;
  }
  // a box standing with its centre at (x, y, z)
  box(w, h, d, color, x, y, z, { r = Math.min(w, h, d) * 0.22, ...o } = {}) {
    return this.add(r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), color, x, y, z, o);
  }
  // a post from y0 up to y1
  post(r0, r1, y0, y1, color, x, z, o = {}) { return this.add(new THREE.CylinderGeometry(r1, r0, y1 - y0, 12), color, x, (y0 + y1) / 2, z, o); }
  ball(r, color, x, y, z, o = {}) { return this.add(new THREE.SphereGeometry(r, 14, 10), color, x, y, z, o); }
  // a tube along points
  tube(points, r, color, seg = 24) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return this.add(new THREE.TubeGeometry(curve, seg, r, 7), color);
  }
  bake(mat) {
    const mesh = new THREE.Mesh(mergeGeometries(this.parts), mat);
    this.parts.forEach((g) => g.dispose()); this.parts = [];
    return mesh;
  }
}
export const toy = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 });
export const lit = () => new THREE.MeshBasicMaterial({ vertexColors: true }); // (lights and screens: they glow whatever falls on them)

// a label: draw(ctx, w, h) on a canvas, kept by its key
const labels = new Map();
export function label(key, w, h, draw) {
  if (labels.has(key)) return labels.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  labels.set(key, t);
  return t;
}
// a flat picture at (x, y, z); it faces +z unless turned
export function picture(tex, w, h, x, y, z, { ry = 0, rx = 0, glow = 1, transparent = false, basic = true } = {}) {
  const mat = basic ? new THREE.MeshBasicMaterial({ map: tex, transparent, depthWrite: !transparent }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, transparent });
  if (basic) mat.color.setScalar(glow);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, 0);
  return m;
}
export const FONT = '"Hiragino Maru Gothic ProN", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif';

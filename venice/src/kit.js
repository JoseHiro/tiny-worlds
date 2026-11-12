// Venice's toy box (venice/DESIGN.md §2, §3, §6). The snow town's IKit (rounded boxes kept indexed, merged into one mesh
// per material) and its shared shapes, with Venice's own few materials: `wall` (plaster in warm earth colours, mottled,
// a patch of brick showing here and there, green weed and a wet dark band at the waterline), `stone` (white Istrian
// stone, grey paving), `roof` (terracotta in courses), `plain`, `shiny` (lacquer, varnish), `metal`, `gold`, `glass`,
// `glow`, `velvet`. Water is in water.js. The water's surface is y = 0 everywhere; land and quays stand at LAND.
import * as THREE from 'three';
import { IKit as SnowKit, rounded, G, clock } from '../../snowfest/src/kit.js';
export { rounded, G, clock };
// a lighter kit for a whole town of houses: small pieces (window frames, sills, shutters) are plain boxes, the rest
// rounded with one segment unless asked; balls are low icospheres (a town has thousands of flowers)
export const LOW = { ball: new THREE.IcosahedronGeometry(1, 1) };
export class IKit extends SnowKit {
  box(w, h, d, color, x, y, z, o = {}) {
    if (o.r === undefined && Math.min(w, h, d) < 0.08) o = { ...o, r: 0 };
    return super.box(w, h, d, color, x, y, z, { seg: 1, ...o });
  }
  ball(r, color, x, y, z, o = {}) { return this.add(LOW.ball, color, x, y, z, { ...o, s: o.s ?? r }); }
}

export const H = 0.58, FLOOR = 0.78, LAND = 0.32; // a person's height, a storey, the top of the quays above the water

const NOISE = `float h1(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h1(i), h1(i + vec3(1,0,0)), f.x), mix(h1(i + vec3(0,1,0)), h1(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h1(i + vec3(0,0,1)), h1(i + vec3(1,0,1)), f.x), mix(h1(i + vec3(0,1,1)), h1(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
function worldBits(sh) {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
    .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      { mat4 mm = modelMatrix;
        #ifdef USE_INSTANCING
          mm = modelMatrix * instanceMatrix;
        #endif
        vWP = (mm * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(mm) * objectNormal); }`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform float uTime; ${NOISE}`);
}
const custom = (key, opts, frag) => {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, ...opts });
  m.onBeforeCompile = (sh) => { sh.uniforms.uTime = clock.uTime; worldBits(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${frag}`); };
  m.customProgramCacheKey = () => key;
  return m;
};
// plaster: a soft mottle, a few patches where it has fallen off and the brick shows, weed and wet at the waterline
const WALL = `
  { float side = 1.0 - smoothstep(0.5, 0.8, abs(vWN.y));
    diffuseColor.rgb *= 0.9 + 0.16 * vn(vWP * 2.2) + 0.05 * h1(floor(vWP * 40.0));
    float patchy = smoothstep(0.78, 0.82, vn(vWP * vec3(1.6, 2.4, 1.6) + 7.0)) * side * step(0.6, vWP.y);
    vec2 bw = vec2((abs(vWN.x) > 0.5 ? vWP.z : vWP.x) * 9.0, vWP.y * 18.0); bw.x += step(1.0, mod(bw.y, 2.0)) * 0.5;
    float mortar = max(step(0.88, fract(bw.x)), step(0.84, fract(bw.y)));
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.62, 0.3, 0.2), vec3(0.85, 0.78, 0.68), mortar), patchy);
    float weed = (1.0 - smoothstep(0.12, 0.3, vWP.y + vn(vWP * 6.0) * 0.06)) * side;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.33, 0.2), weed * 0.75);
    diffuseColor.rgb *= 1.0 - (1.0 - smoothstep(-0.05, 0.08, vWP.y)) * 0.35; }`;
// stone: a little grain; flat paving facing up gets the joints of big square slabs
const STONE = `
  { diffuseColor.rgb *= 0.94 + 0.08 * vn(vWP * 3.0) + 0.04 * h1(floor(vWP * 30.0));
    float up = smoothstep(0.8, 0.95, vWN.y); vec2 q = fract(vWP.xz * 1.6);
    diffuseColor.rgb *= 1.0 - up * 0.18 * max(step(0.94, q.x), step(0.94, q.y));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.34, 0.22), (1.0 - smoothstep(0.1, 0.26, vWP.y)) * (1.0 - up) * 0.7); }`;
// roof tiles in courses running down the slope
const ROOF = `
  { float c = fract(vWP.y * 26.0 + (vWN.x + vWN.z) * 0.0); float r = fract((abs(vWN.x) > abs(vWN.z) ? vWP.z : vWP.x) * 14.0);
    diffuseColor.rgb *= 0.86 + 0.14 * smoothstep(0.0, 0.5, c) + 0.06 * step(0.5, r) + 0.1 * (vn(vWP * 4.0) - 0.5); }`;

export const MAT = {
  wall: custom('vwall', { roughness: 0.92 }, WALL),
  stone: custom('vstone', { roughness: 0.8 }, STONE),
  roof: custom('vroof', { roughness: 0.85 }, ROOF),
  plain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }), // (two-sided: the lofted hulls)
  shiny: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, side: THREE.DoubleSide }),
  metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.55 }),
  gold: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.85 }),
  glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.35 }),
  clear: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  velvet: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
};

// a group from several kits: { wall: kit, stone: kit, ... } → one mesh per material
export function group(kits) {
  const g = new THREE.Group();
  for (const [k, kit] of Object.entries(kits)) { const m = kit.mesh(MAT[k], { cast: k !== 'glow' && k !== 'clear' }); if (m) g.add(m); }
  return g;
}
export const kits = (...names) => Object.fromEntries(names.map((n) => [n, new IKit()]));

// ---- shapes made once ----
const cache = new Map();
export const shape = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
// an arch (round or pointed) standing on y = 0, w wide, h to the top, `depth` thick, centred on z
export const archGeo = (w, h, depth = 0.04, pointed = false) => shape(`arch${w},${h},${depth},${pointed}`, () => {
  const s = new THREE.Shape(), r = w / 2, sp = h - (pointed ? w * 0.7 : r);
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, sp);
  if (pointed) { s.quadraticCurveTo(r, sp + w * 0.42, 0, h); s.quadraticCurveTo(-r, sp + w * 0.42, -r, sp); }
  else s.absarc(0, sp, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 5 }).translate(0, 0, -depth / 2);
});
// a triangular prism for a roof: w across the ridge, h high, d long (along z)
export const prismGeo = (w, h, d) => shape(`prism${w},${h},${d}`, () => {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
});
// a hipped roof: a four-sided pyramid stretched to w × d, h high
export const hipGeo = shape('hip', () => new THREE.CylinderGeometry(0.001, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0));
// a bridge or vault: a slab w long, `rise` high in the middle, with an arch of `span` cut underneath, `width` across
export const bridgeGeo = (w, rise, span, thick, width) => shape(`bridge${w},${rise},${span},${thick},${width}`, () => {
  const s = new THREE.Shape(), top = (x) => rise * (1 - (2 * x / w) ** 2) + thick;
  s.moveTo(-w / 2, 0);
  for (let i = 0; i <= 24; i++) { const x = -w / 2 + (i / 24) * w; s.lineTo(x, top(x)); }
  s.lineTo(w / 2, 0); s.lineTo(span / 2, 0);
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; s.lineTo(Math.cos(a) * span / 2, Math.sin(a) * Math.min(rise + thick * 0.4, span / 2)); }
  s.lineTo(-w / 2, 0);
  return new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 }).translate(0, 0, -width / 2);
});
// a hull: lofted rings from bow to stern. length, beam, depth; `sheer` lifts the ends; `pointy` sharpens the bow (+x)
export function hullGeo(len, beam, depth, { sheer = 0.1, pointy = 0.6, n = 22, ring = 12 } = {}) {
  return shape(`hull${len},${beam},${depth},${sheer},${pointy}`, () => {
    const pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = (u - 0.5) * len, e = Math.abs(u - 0.5) * 2;
      const w = (beam / 2) * Math.pow(Math.max(0, 1 - Math.pow(e, u > 0.5 ? 2 + pointy * 2 : 2.4)), 0.5);
      const rim = depth + sheer * Math.pow(e, 3);
      for (let j = 0; j <= ring; j++) {
        const a = (j / ring) * Math.PI; // round the bottom from one rim to the other
        pos.push(x, rim - Math.sin(a) * (depth * (1 - e * 0.3)) + (1 - Math.sin(a)) * 0, Math.cos(a) * w);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j, b = a + ring + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    // the deck: a strip across the top of each ring
    const base = pos.length / 3;
    for (let i = 0; i <= n; i++) { const r0 = i * (ring + 1), r1 = r0 + ring; pos.push(pos[r0 * 3], pos[r0 * 3 + 1], pos[r0 * 3 + 2], pos[r1 * 3], pos[r1 * 3 + 1], pos[r1 * 3 + 2]); }
    for (let i = 0; i < n; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  });
}

// colours (DESIGN.md §3)
export const C = {
  ochre: 0xe2b867, terracotta: 0xd27a4f, salmon: 0xec9b85, red: 0xb8513f, cream: 0xf1e2c4, sage: 0xb9cfa6,
  roof: 0xc7643f, shutter: 0x3f7a5a, brick: 0xb5533c, copper: 0x6fa594, gold: 0xd9b04a, stone: 0xf4efe6, paving: 0xb7b0a6,
  gondola: 0x1e2433, ink: 0x24345f, poleBlue: 0x2f6fd6, poleRed: 0xd8383a, geranium: 0xe0384a, leaf: 0x4f8a4a, glassDark: 0x2c3a4f,
  wood: 0x8a5a3a, varnish: 0xb7773f, white: 0xfbfaf6, pink: 0xf0b7b0, yellow: 0xf2c230,
};
export const WALLS = [C.ochre, C.terracotta, C.salmon, C.red, C.cream, C.sage];

// ---- baking: everything that never moves under `root`, merged into one mesh per material (the town's draw calls stay
// few). Meshes on one of MAT's materials merge on that material; plain coloured ones (the chibi people) get their colour
// written into the vertices and merge on MAT.paint; anything else (glowing, see-through, lights) is kept as it is.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
MAT.paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
export function bake(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map(), keep = [], col = new THREE.Color(), mats = new Set(Object.values(MAT));
  root.traverse((o) => {
    if (o.isLight) { keep.push(o); return; }
    if (!o.isMesh) return;
    const m = o.material;
    let key = null;
    if (mats.has(m)) key = m;
    else if (m.isMeshStandardMaterial && !m.transparent && m.emissiveIntensity * (m.emissive.r + m.emissive.g + m.emissive.b) < 0.01 && !m.map) key = MAT.paint;
    if (!key) { keep.push(o); return; }
    const g = o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    if (key === MAT.paint || !g.attributes.color) { col.copy(m.color ?? col.set(0xffffff)); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    g.applyMatrix4(o.matrixWorld);
    if (o.matrixWorld.determinant() < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } }
    (buckets.get(key) ?? buckets.set(key, []).get(key)).push(g);
  });
  const out = new THREE.Group();
  for (const [mat, gs] of buckets) {
    for (let i = 0; i < gs.length; i += 4000) { // (a few big meshes rather than one enormous one)
      const part = gs.slice(i, i + 4000), m = new THREE.Mesh(mergeGeometries(part), mat);
      part.forEach((g) => g.dispose()); m.castShadow = mat !== MAT.glow && mat !== MAT.clear; m.receiveShadow = true; out.add(m);
    }
  }
  for (const o of keep) { o.updateMatrixWorld(true); const c = o.clone(); o.matrixWorld.decompose(c.position, c.quaternion, c.scale); out.add(c); }
  return out;
}

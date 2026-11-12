// The snow town's toy box and materials (snowfest/DESIGN.md §2, §6). IKit is fuji's Kit kept indexed (as in Blue domes):
// rounded boxes share their corners' vertices, so a town of them stays light. The materials are few and shared: `toy`
// (painted things, with snow settling on every face that looks up), `snow` (sculpted and heaped snow, with sparkles),
// `ice` (clear, its edges catching the light), `glow` (lamps, neon, lit windows), `glass` (shiny, a little sky in it).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit } from '../../fuji/src/kit.js';

export const clock = { uTime: { value: 0 } };

const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), E4 = new THREE.Euler(), P4 = new THREE.Vector3(), S4 = new THREE.Vector3(), C4 = new THREE.Color();
export const rounded = (w, h, d, seg, r) => { const g = new RoundedBoxGeometry(w, h, d, seg, r); g.deleteAttribute('uv'); const m = mergeVertices(g, 1e-5); g.dispose(); return m; };
export class IKit extends Kit {
  add(geo, color, x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, s = 1 } = {}) {
    const g = geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(M4.compose(P4.set(x, y, z), Q4.setFromEuler(E4.set(rx, ry, rz)), Array.isArray(s) ? S4.set(...s) : S4.setScalar(s)));
    C4.set(color); const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = C4.r; a[i * 3 + 1] = C4.g; a[i * 3 + 2] = C4.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    if (!g.index) g.setIndex([...Array(n).keys()]);
    this.parts.push(g); return this;
  }
  box(w, h, d, color, x, y, z, { r = Math.min(w, h, d) * 0.22, seg = 2, ...o } = {}) { return this.add(r > 0 ? rounded(w, h, d, seg, r) : new THREE.BoxGeometry(w, h, d), color, x, y, z, o); }
  ball(r, color, x, y, z, o = {}) { return this.add(G.ball, color, x, y, z, { ...o, s: o.s ?? r }); }
  // a mesh of everything added, on one of the materials below (empty kits give null)
  mesh(mat, { cast = true, receive = true } = {}) {
    if (!this.parts.length) return null;
    const m = new THREE.Mesh(mergeGeometries(this.parts), mat); this.parts.forEach((g) => g.dispose()); this.parts = [];
    m.castShadow = cast; m.receiveShadow = receive; return m;
  }
}
// shapes, made once
export const G = {
  ball: new THREE.SphereGeometry(1, 14, 10), lump: new THREE.SphereGeometry(1, 9, 7), cyl: new THREE.CylinderGeometry(1, 1, 1, 18), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 18), cone6: new THREE.ConeGeometry(1, 1, 6), torus: new THREE.TorusGeometry(1, 0.3, 8, 20), half: new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2),
  cap: new THREE.CapsuleGeometry(1, 1, 4, 10), arch: new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), vault: new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2),
  plane: new THREE.PlaneGeometry(1, 1),
};

// ---- materials ----
const NOISE = `float h1(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }`;
function worldBits(sh) {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
    .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      { mat4 mm = modelMatrix;
        #ifdef USE_INSTANCING
          mm = modelMatrix * instanceMatrix;
        #endif
        vWP = (mm * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(mm) * objectNormal); }`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform float uTime; uniform float uCap; ${NOISE}`);
}
// sparkles: a few points of the snow catch the sun and twinkle
const SPARKLE = `
  { float h = h1(floor(vWP * 46.0)); float up = smoothstep(0.2, 0.9, vWN.y);
    float tw = step(0.993, h) * (0.4 + 0.6 * sin(uTime * 3.0 + h * 80.0)) * up * SNOWY;
    totalEmissiveRadiance += vec3(1.0, 0.98, 0.92) * max(tw, 0.0) * 2.2; }`;
// painted things with snow on top: every face looking up goes white, a soft edge where it meets the paint
export function toyMat({ roughness = 0.72, cap = 1, metal = 0 } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: metal });
  m.userData.cap = cap;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = clock.uTime; sh.uniforms.uCap = { value: cap }; worldBits(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float snowy = smoothstep(0.62, 0.8, vWN.y + (h1(floor(vWP * 22.0)) - 0.5) * 0.12) * uCap;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.91, 0.98), snowy);
        #define SNOWY snowy`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SPARKLE}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.85, snowy);');
  };
  m.customProgramCacheKey = () => 'toy' + cap;
  return m;
}
// snow itself: sculpted, heaped, packed. Soft, a little blue in the shade, sparkling
export function snowMat({ roughness = 0.88 } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = clock.uTime; sh.uniforms.uCap = { value: 1 }; worldBits(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.96 + 0.06 * h1(floor(vWP * 30.0)); /* (a grain) */
        #define SNOWY 1.0`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${SPARKLE}`);
  };
  m.customProgramCacheKey = () => 'snow';
  return m;
}
// ice: clear, tinted, its rim bright where you look across it, a few bubbles inside
export function iceMat({ color = 0x9fdcff, opacity = 0.72 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.06, metalness: 0.1, transparent: true, opacity, envMapIntensity: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = clock.uTime; sh.uniforms.uCap = { value: 0 }; worldBits(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 V = normalize(cameraPosition - vWP); float rim = pow(1.0 - abs(dot(normalize(vWN), V)), 2.5);
          totalEmissiveRadiance += vec3(0.7, 0.9, 1.0) * rim * 1.4 + diffuseColor.rgb * 0.05; diffuseColor.rgb *= 0.8; /* (a deeper body, a bright rim) */
          diffuseColor.a = clamp(diffuseColor.a + rim * 0.4, 0.0, 0.95);
          float b = step(0.985, h1(floor(vWP * 30.0))); totalEmissiveRadiance += vec3(1.0) * b * 0.5; }`);
  };
  m.customProgramCacheKey = () => 'ice';
  return m;
}
export const glowMat = () => new THREE.MeshBasicMaterial({ vertexColors: true });
export const glassMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.3 });

// the shared ones (one of each for the whole page)
export const MAT = { toy: toyMat(), plain: toyMat({ cap: 0 }), shiny: toyMat({ roughness: 0.3, cap: 1 }), metal: toyMat({ roughness: 0.4, metal: 0.5, cap: 1 }), snow: snowMat(), ice: iceMat(), iceBlue: iceMat({ color: 0x5fb8ff, opacity: 0.75 }), icePink: iceMat({ color: 0xff9fd0, opacity: 0.72 }), glow: glowMat(), glass: glassMat() };

// a group from several kits: { toy: kit, snow: kit, ... } → meshes on those materials
export function group(kits) {
  const g = new THREE.Group();
  for (const [k, kit] of Object.entries(kits)) { const m = kit.mesh(MAT[k], { cast: k !== 'glow' && !k.startsWith('ice') }); if (m) g.add(m); }
  return g;
}
export const kits = (...names) => Object.fromEntries(names.map((n) => [n, new IKit()]));

// colours (DESIGN.md §3)
export const C = {
  snow: 0xeef4fb, snowShade: 0x9fb2d6, packed: 0xd9dfe8, ice: 0xbfe9ff, road: 0x3a3f4f, brick: 0xb5533c, copper: 0x6fa594, tower: 0xe8673c,
  board: 0xf4efe4, conifer: 0x2f5a48, lamp: 0xffb86b, noren: 0xd8383a, tram: 0x3f8f5a, plow: 0xf2c230, ink: 0x25304f, wood: 0x8a5a3a, woodLight: 0xc9965a,
  coats: [0xe8483f, 0x3f6fd6, 0xf2c230, 0x4fb39a, 0xf08ac0, 0x7a5ad6], concrete: 0xc8c4bc, glass: 0x6f8fb8, neonPink: 0xff6fa8, neonBlue: 0x6fd0ff, white: 0xfbfaf6,
};

// The caldera's sea (santorini/DESIGN.md §1.6, §2.6): one sheet over the board, like the lagoon's (lagoon/src/water.js) but
// deep blue. Its colour comes from how far it is from the shore: a deep cobalt out in the bay, a brighter blue near the
// cliffs, turquoise in the harbour's shallows, which are clear enough to see the pale stones. Low swells roll across it (the
// boats ride them: waveY), ripples are drawn into the normal so the high sun breaks into glints, and a little foam laps the
// cliffs' foot and the island.
import * as THREE from 'three';
import { W, D, C, RC, ISLE, HARBOR, CLIP } from './land.js';

const SWELLS = [[0.5, 0.8, 1.0, 0.035], [2.3, 1.2, 1.3, 0.022], [-1.0, 1.7, 1.7, 0.014]];
export const waveY = (x, z, t) => SWELLS.reduce((h, [a, k, w, A]) => h + A * Math.sin((Math.cos(a) * x + Math.sin(a) * z) * k - t * w), 0);
const f = (x) => x.toFixed(4);
const SW = `
    float swellH(vec2 p, float t, out vec2 d) { float h = 0.0, ph; d = vec2(0.0);
      ${SWELLS.map(([a, k, w, A]) => `ph = dot(vec2(${f(Math.cos(a))}, ${f(Math.sin(a))}), p) * ${f(k)} - t * ${f(w)}; h += ${f(A)} * sin(ph); d += vec2(${f(Math.cos(a) * k * A)}, ${f(Math.sin(a) * k * A)}) * cos(ph);`).join('\n      ')}
      return h; }`;

export function sea(scene, life, sunDir) {
  const top = new THREE.PlaneGeometry(W, D, 170, 160).rotateX(-Math.PI / 2);
  const uniforms = { uTime: { value: 0 }, uSun: { value: sunDir } };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.0, color: 0xffffff, transparent: true });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; uniform float uTime;\n${SW}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec2 d; vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz; transformed.y += swellH(wp.xz, uTime, d); }\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP; uniform float uTime; uniform vec3 uSun;
        ${SW}
        vec2 slope(vec2 p) {
          vec2 s = vec2(0.0);
          for (int i = 0; i < 7; i++) {
            float fi = float(i), a = fi * 2.399 + 0.6, k = 2.4 + fi * 1.35, w = 0.9 + fi * 0.33;
            vec2 d = vec2(cos(a), sin(a));
            s += d * k * cos(dot(d, p) * k + uTime * w + fi * 1.7) * (0.028 / (1.0 + fi * 0.35));
          }
          vec2 big; swellH(p, uTime, big);
          return s + big;
        }
        /* out from the shore, as in land.js dOf */
        float shore(vec2 p) { vec2 q = p - vec2(${f(C[0])}, ${f(C[1])}); float a = atan(q.y, q.x);
          return length(q) - ${f(RC)} + 0.35 * sin(12.0 * a) + 0.2 * sin(30.0 * a + 1.0) + 0.12 * sin(75.0 * a + 2.0); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${CLIP}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float d = shore(vWP.xz);
        vec2 q = vWP.xz - vec2(${f(C[0])}, ${f(C[1])});
        float ang = degrees(atan(q.y, q.x)); if (ang > 0.0) ang -= 360.0;
        float hb = (1.0 - smoothstep(4.0, 9.0, abs(ang - (${f(HARBOR)})))) * smoothstep(-5.5, -2.0, d); /* (the harbour's shallows) */
        float e = length((vWP.xz - vec2(${f(ISLE.x)}, ${f(ISLE.z)})) / vec2(${f(ISLE.rx)}, ${f(ISLE.rz)}));
        vec3 deep = vec3(0.004, 0.05, 0.22), mid = vec3(0.01, 0.16, 0.5), shallow = vec3(0.02, 0.5, 0.6);
        vec3 col = mix(deep, mid, smoothstep(-7.0, -0.5, d) * 0.85 + (1.0 - smoothstep(1.0, 1.6, e)) * 0.2);
        col = mix(col, shallow, hb);
        float lap = (smoothstep(-0.55, 0.05, d) + (1.0 - smoothstep(0.9, 1.12, e))) * (0.55 + 0.45 * sin(uTime * 1.5 + vWP.x * 0.7 + vWP.z * 0.5)); /* (the foam at the cliffs' foot and round the island) */
        float foam = min(lap, 1.0) * smoothstep(0.35, 0.65, fract(sin(dot(floor(vWP.xz * 9.0), vec2(12.9898, 78.233))) * 43758.5453) * 0.6 + min(lap, 1.0) * 0.45);
        foam *= 1.0 - hb * 0.75; /* (calm in the harbour) */
        col = mix(col, vec3(0.92, 0.97, 1.0), foam);
        diffuseColor.rgb = col;
        { vec3 V = normalize(cameraPosition - vWP); float look = 1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0);
          diffuseColor.a = clamp(mix(0.72, 0.95, pow(look, 1.5)) - hb * 0.42 + foam, 0.0, 0.97); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 s = slope(vWP.xz); normal = normalize((viewMatrix * vec4(normalize(vec3(-s.x, 1.0, -s.y)), 0.0)).xyz); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 V = normalize(cameraPosition - vWP); float fr = pow(1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0), 4.0);
          totalEmissiveRadiance += vec3(0.35, 0.6, 0.95) * fr * 0.1 + diffuseColor.rgb * vec3(0.05, 0.15, 0.3);
          vec2 s = slope(vWP.xz) + slope(vWP.xz * 3.1 + 7.0) * 0.7; vec3 N = normalize(vec3(-s.x, 1.0, -s.y));
          float g = pow(max(dot(reflect(-V, N), uSun), 0.0), 600.0) * (1.0 - smoothstep(14.0, 30.0, length(cameraPosition - vWP)));
          totalEmissiveRadiance += vec3(1.0, 0.98, 0.92) * min(g * 2.0, 1.5); diffuseColor.a = max(diffuseColor.a, min(g * 2.0, 1.0)); }`);
  };
  const sheet = new THREE.Mesh(top, mat); sheet.receiveShadow = true; scene.add(sheet);
  life.push((t) => { uniforms.uTime.value = t; });
  return sheet;
}

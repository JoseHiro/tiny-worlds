// Naha sea — the water: a GPU ripple height field, the surface shader (refraction,
// depth colour, fresnel, sun glint, shore foam), the cut-face shader, and caustics
// that any underwater material can take on.
import * as THREE from 'three';
import { BLOCK } from './terrain.js';

const N = 256; // ripple grid

// Small swell that is always there, in world xz (shared by the vertex and fragment shaders).
const SWELL = /* glsl */ `
  float swell(vec2 p, float t) {
    return sin(p.x * 0.35 + t * 1.1) * 0.05 + sin(p.y * 0.5 - t * 0.9) * 0.04
         + sin((p.x + p.y) * 0.8 + t * 1.7) * 0.02 + sin((p.x - p.y) * 1.9 - t * 2.3) * 0.008;
  }
`;

// The classic "water turbulence" caustic: bright moving web lines.
export const CAUSTICS = /* glsl */ `
  float caustics(vec2 p, float t) {
    vec2 q = mod(p * 6.28318, 6.28318) - 250.0;
    vec2 i = q;
    float c = 1.0, inten = 0.005;
    for (int n = 0; n < 4; n++) {
      float tt = t * (1.0 - (3.5 / float(n + 1)));
      i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / length(vec2(q.x / (sin(i.x + tt) / inten), q.y / (cos(i.y + tt) / inten)));
    }
    c /= 4.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 8.0);
  }
`;

export const shared = {
  uTime: { value: 0 },
  uCaustic: { value: 1.0 },
};

// Give a standard material the caustic light pattern wherever it is under water.
export function withCaustics(material) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime;
    sh.uniforms.uCaustic = shared.uCaustic;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nuniform float uCaustic;\n${CAUSTICS}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float dep = -vWPos.y;
        if (dep > 0.0) {
          float c = caustics(vWPos.xz * 0.09, uTime * 0.6) + 0.5 * caustics(vWPos.xz * 0.21 + 3.1, uTime * 0.8);
          float fade = clamp(1.3 - dep * 0.13, 0.15, 1.0);
          gl_FragColor.rgb += vec3(0.85, 1.0, 0.98) * c * 0.55 * uCaustic * fade * smoothstep(0.0, 0.15, dep);
          gl_FragColor.rgb *= mix(vec3(1.0), vec3(0.78, 0.95, 0.97), clamp(dep * 0.12, 0.0, 0.6)); // blue-green cast with depth
        }`);
  };
  material.needsUpdate = true;
  return material;
}

// ---------- ripple simulation (ping-pong render targets) ----------

export class Ripples {
  constructor(renderer) {
    this.renderer = renderer;
    const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.a = new THREE.WebGLRenderTarget(N, N, opts);
    this.b = new THREE.WebGLRenderTarget(N, N, opts);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tPrev: { value: null }, texel: { value: new THREE.Vector2(1 / N, 1 / N) }, drop: { value: new THREE.Vector4(0, 0, 0, 0) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */ `
        uniform sampler2D tPrev; uniform vec2 texel; uniform vec4 drop; varying vec2 vUv;
        void main() {
          vec4 s = texture2D(tPrev, vUv);
          float avg = (texture2D(tPrev, vUv + vec2(texel.x, 0.0)).r + texture2D(tPrev, vUv - vec2(texel.x, 0.0)).r
                     + texture2D(tPrev, vUv + vec2(0.0, texel.y)).r + texture2D(tPrev, vUv - vec2(0.0, texel.y)).r) * 0.25;
          s.g += (avg - s.r) * 2.0;
          s.g *= 0.985;
          s.r += s.g;
          if (drop.z > 0.0) {
            float d = length((vUv - drop.xy) * vec2(${(BLOCK.w / BLOCK.d).toFixed(3)}, 1.0)) / drop.z;
            if (d < 1.0) s.r += drop.w * (cos(d * 3.14159) * 0.5 + 0.5);
          }
          s.r *= 0.998;
          gl_FragColor = s;
        }`,
    });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
    this.camera = new THREE.Camera();
    this.drops = [];
  }

  get texture() { return this.a.texture; }

  // uv in [0,1]², radius in uv units (of the shorter side), strength in height units
  drop(u, v, radius = 0.02, strength = 0.5) { this.drops.push([u, v, radius, strength]); }

  step(iterations = 2) {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    for (let i = 0; i < iterations; i++) {
      const d = i === 0 ? this.drops.shift() : null;
      this.mat.uniforms.drop.value.set(...(d ?? [0, 0, 0, 0]));
      this.mat.uniforms.tPrev.value = this.a.texture;
      r.setRenderTarget(this.b);
      r.render(this.scene, this.camera);
      [this.a, this.b] = [this.b, this.a];
    }
    r.setRenderTarget(prev);
  }
}

// ---------- the water surface ----------

export function waterSurface({ ripples, bedTex, refractTex }) {
  const geo = new THREE.PlaneGeometry(BLOCK.w, BLOCK.d, 270, 180).rotateX(-Math.PI / 2);
  const uniforms = {
    uTime: shared.uTime,
    tHeight: { value: ripples.texture },
    tBed: { value: bedTex },
    tRefract: { value: refractTex },
    uRes: { value: new THREE.Vector2(1, 1) },
    uWave: { value: 1.0 },
    uClarity: { value: 0.6 },
    uRipple: { value: 0.35 },
    cShallow: { value: new THREE.Color('#5fe2d6') },
    cMid: { value: new THREE.Color('#1cb0c4') },
    cDeep: { value: new THREE.Color('#0d5486') },
    cSky: { value: new THREE.Color('#c4e8ef') },
    sunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
    sunColor: { value: new THREE.Color('#fff6e4') },
  };
  const toUv = /* glsl */ `
    vec2 toUv(vec2 p) { return vec2((p.x + ${(BLOCK.w / 2).toFixed(1)}) / ${BLOCK.w.toFixed(1)}, (${(BLOCK.d / 2).toFixed(1)} - p.y) / ${BLOCK.d.toFixed(1)}); }
  `;
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform sampler2D tHeight; uniform float uTime, uWave, uRipple;
      varying vec3 vW; varying vec4 vClip;
      ${SWELL}
      ${toUv}
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y += texture2D(tHeight, toUv(w.xz)).r * uRipple + swell(w.xz, uTime) * uWave;
        vW = w.xyz;
        vClip = projectionMatrix * viewMatrix * w;
        gl_Position = vClip;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tHeight, tBed, tRefract;
      uniform float uTime, uWave, uClarity, uRipple;
      uniform vec3 cShallow, cMid, cDeep, cSky, sunDir, sunColor;
      varying vec3 vW; varying vec4 vClip;
      ${SWELL}
      ${toUv}
      float H(vec2 p) { return texture2D(tHeight, toUv(p)).r * uRipple + swell(p, uTime) * uWave; }
      void main() {
        float e = 0.3;
        vec3 n = normalize(vec3(-(H(vW.xz + vec2(e, 0.0)) - H(vW.xz - vec2(e, 0.0))) / (2.0 * e), 1.0,
                                -(H(vW.xz + vec2(0.0, e)) - H(vW.xz - vec2(0.0, e))) / (2.0 * e)));
        float bed = texture2D(tBed, toUv(vW.xz)).r;
        float depth = max(0.0, vW.y - bed);
        vec3 V = normalize(cameraPosition - vW);

        // what's under the surface, bent by the waves (more bending over deeper water)
        vec2 suv = vClip.xy / vClip.w * 0.5 + 0.5;
        vec2 off = n.xz * (0.012 + 0.03 * clamp(depth * 0.25, 0.0, 1.0));
        vec3 under = texture2D(tRefract, suv + off).rgb;

        // light through the water: red is absorbed first, so the sand turns turquoise and
        // deeper water fades to the water's own scattered colour (clear, not milky)
        vec3 waterCol = mix(cShallow, cMid, smoothstep(0.3, 2.2, depth));
        waterCol = mix(waterCol, cDeep, smoothstep(2.0, 8.0, depth));
        vec3 k = vec3(0.62, 0.17, 0.11) * mix(1.7, 0.55, uClarity);
        vec3 T = exp(-k * depth);
        vec3 scatter = waterCol * (1.0 - exp(-depth * mix(0.45, 0.16, uClarity)));
        vec3 col = under * T + scatter;

        // sky reflection, sun glint
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
        col = mix(col, cSky, fres * 0.35);
        vec3 R = reflect(-sunDir, n);
        col += sunColor * pow(max(dot(R, V), 0.0), 220.0) * 1.6;

        // foam where the water thins out over the sand, and a soft line along the reef edge
        float wob = sin(uTime * 1.6 + vW.x * 1.1 + vW.z * 0.6) * 0.5 + 0.5;
        float foam = smoothstep(0.32, 0.02, depth) * (0.55 + 0.45 * wob);
        float reef = smoothstep(0.35, 0.0, abs(bed + 1.55)) * smoothstep(-1.2, -1.9, bed) * 0.35 * (0.5 + 0.5 * sin(uTime * 0.9 + vW.x * 0.7));
        col = mix(col, vec3(1.0), clamp(foam * 0.75 + reef, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.water = true;
  return mesh;
}

// The water seen from the side, where the block is cut.
export function waterCutMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      cShallow: { value: new THREE.Color('#7fe3d6') },
      cDeep: { value: new THREE.Color('#13557f') },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 cShallow, cDeep; varying vec3 vW;
      void main() {
        float d = -vW.y;
        vec3 col = mix(cShallow, cDeep, smoothstep(0.0, 9.0, d));
        // light shafts coming down from the surface
        float rays = pow(max(0.0, sin(vW.x * 0.9 + vW.z * 0.9 + sin(uTime * 0.4) * 2.0)), 6.0) * exp(-d * 0.35) * 0.25;
        col += vec3(0.8, 1.0, 1.0) * rays;
        col = mix(col, vec3(1.0), smoothstep(0.12, 0.0, d) * 0.6); // bright line at the surface
        gl_FragColor = vec4(col, 0.86);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

// Layered earth on the cut faces: sand, then rock bands.
export function earthCutMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        float y = vW.y + sin(vW.x * 0.4 + vW.z * 0.4) * 0.15;
        vec3 col = y > -1.6 ? vec3(0.93, 0.85, 0.68) : y > -3.4 ? vec3(0.84, 0.75, 0.58) : y > -6.5 ? vec3(0.69, 0.6, 0.48) : vec3(0.52, 0.44, 0.37);
        float speck = fract(sin(dot(floor(vW.xy * 6.0 + vW.zz * 6.0), vec2(12.9898, 78.233))) * 43758.5453);
        col *= 0.94 + speck * 0.08;
        gl_FragColor = vec4(col, 1.0); // colours above are already display (sRGB) values
      }`,
  });
}

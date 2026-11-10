// The caldera's land (santorini/DESIGN.md §1.3, §3): one height field over the whole board, from the sea floor up the cliff
// to the rim. The shore is an arc round the caldera's middle (C), so the land wraps the back and the left and the sea fills
// the front. Out from the shore (d): a steep face of layered rock, then five terraces where the village stands, then the
// flat top. A quay is cut at the harbour's foot, and the dark volcano island stands in the bay. Round the board's edge the
// cut shows the layers, and under it the wooden board.
import * as THREE from 'three';

export const W = 34, D = 32, FLOOR = -2.2, C = [4, 10], RC = 16, ROUND = 2.2;
export const ISLE = { x: 5, z: 4.6, rx: 3.0, rz: 2.0 };
export const HARBOR = -158; // (its angle round C, in degrees)
export const ROWS = 5, ROW = 0.8, FACE = 2; // (the terraces: how many, how deep each; the rock face below them)

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rad = Math.PI / 180;
// the angle round C in degrees, from -360 to 0 (so the land, from the back right round to the front left, runs on)
export const angle = (x, z) => { let a = Math.atan2(z - C[1], x - C[0]) / rad; if (a > 0) a -= 360; return a; };
// the shore's wobble, by angle (whole turns, so it meets itself)
export const wig = (a) => { const r = a * rad; return 0.35 * Math.sin(12 * r) + 0.2 * Math.sin(30 * r + 1) + 0.12 * Math.sin(75 * r + 2); };
export const dOf = (x, z) => Math.hypot(x - C[0], z - C[1]) - RC + wig(angle(x, z));
// the rim's height: highest at the back, lower round the front left
export const rim = (a) => 8 - 5 * sm(-140, -205, a);
export const faceTop = (a) => rim(a) * 0.45;
// a point in the cliff's own frame: angle a round C and distance d out from the shore
export const at = (a, d) => { const r = RC + d - wig(a); return [C[0] + r * Math.cos(a * rad), C[1] + r * Math.sin(a * rad)]; };
// the way that faces the sea from there (a yaw: local +z toward C)
export const facing = (a) => Math.atan2(-Math.cos(a * rad), -Math.sin(a * rad));
// the height of terrace i (0 at the face's top)
export const terraceY = (a, i) => faceTop(a) + (rim(a) - faceTop(a)) * Math.min(i, ROWS) / ROWS;

// where the village is (its terraces): 1 from the back right round to the front left, fading at the ends
export const vill = (a) => sm(-192, -180, a) * (1 - sm(-63, -57, a));
export function profile(d, a) {
  const H = rim(a), R = faceTop(a);
  if (d < 0) return Math.max(FLOOR + 0.15, d * 1.1); // (the sea floor falls away fast: the caldera is deep)
  if (d < FACE) return R * Math.pow(d / FACE, 0.7);
  if (d < FACE + ROWS * ROW) {
    const u = (d - FACE) / ROW, i = Math.floor(u), v = vill(a);
    const steps = (i + sm(0.55, 1, u - i)) / ROWS, slope = Math.pow(u / ROWS, 0.75); // (terraces in the village, a rough slope beyond it)
    return R + (H - R) * (steps * v + slope * (1 - v));
  }
  return H + Math.min(0.8, (d - FACE - ROWS * ROW) * 0.08);
}
// the island: 1 inside, falling off round it
export const isle = (x, z) => Math.hypot((x - ISLE.x) / ISLE.rx, (z - ISLE.z) / ISLE.rz);

export function terrain(x, z) {
  const a = angle(x, z), d = dOf(x, z);
  let y = profile(d, a);
  // the harbour: shallow water and a flat quay at the cliff's foot
  const w = 1 - sm(4, 8, Math.abs(a - HARBOR));
  if (w > 0) {
    if (d < 0) y += (Math.max(y, -0.5 + d * 0.1) - y) * w;
    const m = w * (1 - sm(0.9, 1.4, d)) * sm(-0.8, -0.4, d);
    y += (0.22 - y) * m;
  }
  // the volcano island: low, lumpy, dark
  const e = isle(x, z);
  if (e < 2.2) {
    const k = Math.max(0, 1 - e * e), bumps = 0.3 * Math.sin(x * 2.3 + 1) * Math.cos(z * 1.9) + 0.18 * Math.sin(x * 4.1 - z * 3.3) + 0.1 * Math.sin(x * 7.3 + z * 6.1);
    const crater = 0.45 * Math.exp(-((x - ISLE.x - 0.7) ** 2 + (z - ISLE.z + 0.3) ** 2) / 0.35);
    const lump = e < 1 ? 1.1 * Math.pow(k, 0.6) + bumps * Math.pow(k, 0.5) - crater + 0.05 : -(e - 1) * 1.6 + 0.05;
    y = Math.max(y, lump);
  }
  return y;
}

const roundRect = (w, d, r) => { const s = new THREE.Shape(), x = -w / 2, y = -d / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
export { roundRect };
export const CLIP = `{ vec2 q = abs(vWP.xz) - vec2(${(W / 2 - ROUND).toFixed(2)}, ${(D / 2 - ROUND).toFixed(2)}); if (length(max(q, 0.0)) > ${ROUND.toFixed(2)} + 0.001) discard; }`;
export const NOISE = `
  float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`;

// the ground's material: its colour from where it is (aD: out from the shore; aI: on the island; aS: the board's cut)
function groundMat(side) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, side });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aD; attribute float aI; attribute float aS; attribute float aV; varying vec3 vWP; varying vec3 vWN; varying float vD; varying float vI; varying float vS; varying float vV;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vD = aD; vI = aI; vS = aS; vV = aV;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN; varying float vD; varying float vI; varying float vS; varying float vV;
        ${NOISE}
        vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
        // the caldera's layers: red-brown, dark grey, pale tuff, rust, wavering
        vec3 strata(vec3 p) {
          float yy = p.y + 0.45 * sin(p.x * 0.45 + p.z * 0.35) + 0.22 * sin(p.x * 1.3 - p.z * 0.9) + (n3(p * vec3(0.9, 0.4, 0.9)) - 0.5) * 0.7;
          float b = fract(yy * 0.85), b2 = fract(yy * 2.1 + 0.3);
          vec3 c = mix(vec3(0.5, 0.27, 0.21), vec3(0.42, 0.24, 0.2), n3(p * 1.7)); /* (red-brown, mostly) */
          c = mix(c, vec3(0.27, 0.25, 0.25), smoothstep(0.12, 0.2, b) * (1.0 - smoothstep(0.3, 0.38, b)) * 0.9); /* (a dark grey layer) */
          c = mix(c, vec3(0.78, 0.7, 0.58), smoothstep(0.52, 0.58, b) * (1.0 - smoothstep(0.62, 0.7, b)) * 0.8); /* (a thin pale tuff) */
          c = mix(c, vec3(0.62, 0.36, 0.24), smoothstep(0.8, 0.95, b2) * 0.5); /* (fine rusty lines) */
          c *= 0.78 + 0.34 * n3(p * vec3(5.0, 0.6, 5.0)); /* (streaks down the face) */
          c = mix(c, vec3(0.8, 0.72, 0.6), smoothstep(0.65, 1.0, p.y / ${(8 * 0.45).toFixed(2)}) * 0.35); /* (paler toward the top) */
          return mix(vec3(0.18, 0.17, 0.18), c, smoothstep(0.05, 0.7, p.y)); /* (black rock at the foot) */
        }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${CLIP}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float steep = 1.0 - smoothstep(0.5, 0.78, vWN.y);
        vec3 col;
        vec3 earth = mix(vec3(0.8, 0.69, 0.54), vec3(0.62, 0.6, 0.4), smoothstep(0.5, 0.72, n3(vWP * 0.6)));
        vec3 lava = mix(mix(vec3(0.17, 0.15, 0.15), vec3(0.3, 0.27, 0.26), n3(vWP * 2.6)), vec3(0.42, 0.22, 0.16), smoothstep(0.55, 0.75, n3(vWP * 1.1 + 4.0)));
        if (vS > 0.5) col = vWP.y > 0.0 ? strata(vWP) : mix(vec3(0.3, 0.28, 0.3), vec3(0.18, 0.18, 0.22), smoothstep(0.0, -2.0, vWP.y));
        else if (vI < 1.0) col = lava; /* (the volcano island: dark, with rusty patches) */
        else if (vWP.y < -0.03) col = mix(mix(vec3(0.88, 0.85, 0.76), vec3(0.3, 0.29, 0.32), smoothstep(-0.25, -1.4, vWP.y)), lava, 1.0 - smoothstep(1.0, 2.2, vI)); /* (the sea floor: pale in the shallows, dark round the island) */
        else if (vD < ${FACE.toFixed(1)} + 0.05) col = mix(strata(vWP), vec3(0.93, 0.9, 0.84), (1.0 - steep) * step(vWP.y, 0.6)); /* (the face; the quay paved) */
        else if (vD < ${(FACE + ROWS * ROW + 0.25).toFixed(2)}) col = mix(mix(earth, strata(vWP), steep), mix(vec3(0.94, 0.91, 0.85), vec3(0.97, 0.96, 0.93), steep), vV); /* (the village: paving and white walls; beyond it rough slope) */
        else col = mix(earth, vec3(0.94, 0.91, 0.85), vV * (1.0 - smoothstep(0.6, 1.8, vD - ${(FACE + ROWS * ROW).toFixed(1)}))); /* (paved along the top of the village) */
        diffuseColor.rgb = lin(col);`);
  };
  return mat;
}

export function land(scene) {
  const NX = 300, NZ = 280;
  const g = new THREE.PlaneGeometry(W, D, NX, NZ).rotateX(-Math.PI / 2);
  const p = g.attributes.position, n = p.count, aD = new Float32Array(n), aI = new Float32Array(n), aV = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, terrain(x, z)); aD[i] = dOf(x, z); aI[i] = isle(x, z); aV[i] = vill(angle(x, z));
  }
  g.setAttribute('aD', new THREE.BufferAttribute(aD, 1)); g.setAttribute('aI', new THREE.BufferAttribute(aI, 1)); g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aV', new THREE.BufferAttribute(aV, 1));
  g.computeVertexNormals();
  const ground = new THREE.Mesh(g, groundMat(THREE.FrontSide)); ground.receiveShadow = true; ground.castShadow = true; scene.add(ground);

  // round the edge: the cut through the land (layers) and, where it is sea, the water's cross-section over the sea floor
  const ring = [], pts = roundRect(W, D, ROUND).getPoints(16);
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], k = Math.max(1, Math.ceil(a.distanceTo(b) / 0.1)); for (let j = 0; j < k; j++) ring.push([a.x + (b.x - a.x) * j / k, -(a.y + (b.y - a.y) * j / k)]); }
  const pos = [], dd = [], wpos = [], wcol = [], top = new THREE.Color('#5fb8e8'), deep = new THREE.Color('#0b2f78');
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length], t0 = terrain(x0, z0), t1 = terrain(x1, z1), d0 = dOf(x0, z0), d1 = dOf(x1, z1);
    for (const [x, z, y, d] of [[x0, z0, t0, d0], [x0, z0, FLOOR, d0], [x1, z1, t1, d1], [x1, z1, t1, d1], [x0, z0, FLOOR, d0], [x1, z1, FLOOR, d1]]) { pos.push(x, y, z); dd.push(d); }
    if (t0 < 0 || t1 < 0) for (const [x, z, y, b] of [[x0, z0, 0, 0], [x0, z0, Math.min(0, t0), t0], [x1, z1, 0, 0], [x1, z1, 0, 0], [x0, z0, Math.min(0, t0), t0], [x1, z1, Math.min(0, t1), t1]]) {
      wpos.push(x, y - 0.005, z); const c = top.clone().lerp(deep, Math.min(1, -y / 1.8)); wcol.push(c.r, c.g, c.b);
    }
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('aD', new THREE.Float32BufferAttribute(dd, 1));
  sg.setAttribute('aI', new THREE.Float32BufferAttribute(new Float32Array(dd.length).fill(9), 1)); sg.setAttribute('aV', new THREE.Float32BufferAttribute(new Float32Array(dd.length), 1)); sg.setAttribute('aS', new THREE.Float32BufferAttribute(new Float32Array(dd.length).fill(1), 1)); sg.computeVertexNormals();
  const cut = new THREE.Mesh(sg, groundMat(THREE.DoubleSide)); cut.receiveShadow = true; scene.add(cut);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3)); wg.setAttribute('color', new THREE.Float32BufferAttribute(wcol, 3)); wg.computeVertexNormals();
  const glass = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, emissive: 0x0b3f90, emissiveIntensity: 0.35, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  glass.renderOrder = 2; scene.add(glass);

  const boardG = new THREE.ExtrudeGeometry(roundRect(W + 0.6, D + 0.6, ROUND + 0.3), { depth: 0.55, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, curveSegments: 12 }).rotateX(Math.PI / 2).translate(0, FLOOR - 0.02, 0);
  const board = new THREE.Mesh(boardG, new THREE.MeshStandardMaterial({ color: 0xecd9b8, roughness: 0.8 })); board.receiveShadow = true; scene.add(board);
  return ground;
}

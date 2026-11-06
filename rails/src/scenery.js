// The layout's board and its morning (rails/DESIGN.md §2.2, §6): a pale sky with a little haze, a low sun from the
// east-south-east whose shadow box follows the camera, the walnut-framed board, and the town on it — every building one
// instance of one box (windows drawn by the shader from world position, so they keep their size), trees likewise.
import * as THREE from 'three';

export const SKY = 0xcfe3f2;

export function morning(stage, { exposure = 1.05 } = {}) {
  const { scene, renderer, camera, controls } = stage;
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 60, 160);
  renderer.toneMappingExposure = exposure;
  camera.far = 140; camera.near = 0.005; camera.updateProjectionMatrix();
  controls.maxDistance = 55; controls.maxPolarAngle = 1.45;
  scene.add(new THREE.HemisphereLight(0xdbe9f6, 0x8a7d6a, 1.1));
  const sun = new THREE.DirectionalLight(0xffe3bc, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.004;
  scene.add(sun, sun.target);
  const dir = new THREE.Vector3(0.82, 0.42, 0.38).normalize(); // east-south-east, low
  // the shadow box: centred where the camera looks, as wide as the view needs
  stage.life.push(() => {
    const d = camera.position.distanceTo(controls.target), r = Math.min(24, Math.max(0.8, d * 0.75));
    const near = Math.min(0.25, Math.max(0.004, d * 0.006)); // (close up the near plane comes in; far off it goes out, or the ground flickers)
    if (Math.abs(camera.near - near) > near * 0.2) { camera.near = near; camera.updateProjectionMatrix(); }
    sun.target.position.copy(controls.target); sun.position.copy(controls.target).addScaledVector(dir, 40);
    const c = sun.shadow.camera;
    if (c.right !== r) { c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 1; c.far = 90; c.updateProjectionMatrix(); }
  });
  return sun;
}

// the board: the town's ground on a walnut frame
export function board({ x0, x1, z0, z1 }, ground = 0xcdcac3) {
  const g = new THREE.Group(), w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: ground, roughness: 0.95 }));
  top.position.set(cx, 0, cz); top.receiveShadow = true; g.add(top);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.7, d + 0.5), new THREE.MeshStandardMaterial({ color: 0x5a3e2b, roughness: 0.6 }));
  frame.position.set(cx, -0.38, cz); frame.receiveShadow = true; g.add(frame); // (its top a little below the ground)
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.62, 0.06, d + 0.62), new THREE.MeshStandardMaterial({ color: 0x3e2a1d, roughness: 0.5 }));
  lip.position.set(cx, -0.75, cz); g.add(lip);
  return g;
}

// flat shapes on the ground: parks, water, roads — [[x, z], …] outlines, a little above the board so they don't flicker
export function patch(pts, color, y = 0.002) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: color === WATER ? 0.25 : 0.95, metalness: color === WATER ? 0.1 : 0 }));
  m.position.y = y; m.receiveShadow = true;
  return m;
}
export const WATER = 0x6fa8c8, GREEN = 0x7fa65a;

// The buildings: [{ x, z, w, d, h, yaw, color, kind, roof, y }] (y: standing on something, as rooftop plant does). One storey is FLOOR high. The kinds, each with its own
// face drawn by the shader from world position: HOUSE (a few small windows; `roof` puts a pitched roof of that colour on
// it), FLATS (a balcony along every floor), OFFICE (ribbon windows), GLASS (a curtain wall), PLAIN (none: rooftop plant).
// The pattern fades to its average where it gets finer than a pixel or two, so far-off façades don't shimmer.
export const FLOOR = 0.019;
export const HOUSE = 0, FLATS = 1, OFFICE = 2, GLASS = 3, PLAIN = 4;
export function buildings(list) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aKind; varying float vKind; varying vec3 vWp; varying vec3 vWn;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvKind = aKind; vWp = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vKind; varying vec3 vWp; varying vec3 vWn;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float glassy = 0.0;
        if (abs(vWn.y) < 0.5) {
          vec3 base = diffuseColor.rgb, pane = vec3(0.30, 0.37, 0.44) + 0.1 * base, col = base; float avg = 0.0;
          float u = abs(vWn.x) > abs(vWn.z) ? vWp.z : vWp.x;
          float fy = fract(vWp.y / ${FLOOR}), ground = step(vWp.y, ${FLOOR});
          float fine = clamp(2.2 - 2.4 * fwidth(vWp.y) / ${FLOOR}, 0.0, 1.0); // (1 close up; 0 once a storey is under about a pixel)
          if (vKind < 0.5) { // a house: small windows
            float fu = fract(u / 0.028), w = step(0.4, fy) * step(fy, 0.8) * step(0.3, fu) * step(fu, 0.7);
            col = mix(base, pane, w * 0.85); avg = 0.14;
          } else if (vKind < 1.5) { // flats: a pale balcony front along each floor, dark windows behind
            float fu = fract(u / 0.024), rail = step(fy, 0.3), w = (1.0 - rail) * step(0.4, fy) * step(fy, 0.92) * step(0.12, fu) * step(fu, 0.88);
            col = mix(mix(base, vec3(0.93, 0.92, 0.9), rail * 0.55), pane * 0.9, w * 0.8); avg = 0.35;
          } else if (vKind < 2.5) { // offices: a band of windows on every floor, thin mullions
            float fu = fract(u / 0.013), w = step(0.32, fy) * step(fy, 0.86) * step(0.12, fu);
            col = mix(base, pane, w * 0.85); avg = 0.45;
          } else if (vKind < 3.5) { // a glass tower: the wall all glass, a thin frame at every floor and every few panes
            float fu = fract(u / 0.012), frame = max(step(fy, 0.08), step(fu, 0.08));
            col = mix(base * (0.78 + 0.22 * smoothstep(0.0, 1.2, vWp.y)), vec3(0.82, 0.84, 0.86), frame * 0.5); avg = 0.0; glassy = 1.0;
          }
          if (vKind > 0.5 && vKind < 2.5) col = mix(col, vec3(0.22, 0.24, 0.26) + 0.2 * base, ground * step(0.15, fy) * 0.7); // (shop fronts on the street)
          diffuseColor.rgb = mix(mix(base, pane, avg * 0.75), col, fine);
        } else diffuseColor.rgb *= vKind > 2.5 && vKind < 3.5 ? 0.62 : 0.82; // (the roofs: concrete and plant)`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, glassy);');
  };
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(new Float32Array(list.map((b) => b.kind ?? (b.h > 0.35 ? GLASS : OFFICE))), 1));
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3();
  list.forEach((b, i) => { im.setMatrixAt(i, m.compose(p.set(b.x, b.y ?? 0, b.z), q.setFromAxisAngle(up, b.yaw ?? 0), s.set(b.w, b.h, b.d))); im.setColorAt(i, c.setHex(b.color)); });
  im.castShadow = im.receiveShadow = true;
  g.add(im);
  // the houses' pitched roofs: a prism along the longer side
  const houses = list.filter((b) => b.roof);
  if (houses.length) {
    const prism = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0.25, 0).scale(1, 1 / 0.75, 1 / 0.866); // (1 × 1 × 1, the ridge along x)
    const roofs = new THREE.InstancedMesh(prism, new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), houses.length);
    houses.forEach((b, i) => {
      const long = b.w >= b.d, rh = Math.min(b.w, b.d) * 0.3;
      roofs.setMatrixAt(i, m.compose(p.set(b.x, b.h, b.z), q.setFromAxisAngle(up, (b.yaw ?? 0) + (long ? 0 : Math.PI / 2)), s.set((long ? b.w : b.d) * 1.04, rh, (long ? b.d : b.w) * 1.08)));
      roofs.setColorAt(i, c.setHex(b.roof));
    });
    roofs.castShadow = roofs.receiveShadow = true;
    g.add(roofs);
  }
  return g;
}

// trees: [{ x, z, s }] — a round crown on a short trunk
export function trees(list) {
  const g = new THREE.Group();
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 1).translate(0, 0.09, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), list.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.01, 0.05, 5).translate(0, 0.025, 0), new THREE.MeshStandardMaterial({ color: 0x6b4a35 }), list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), greens = [0x5d8a45, 0x6f9a4f, 0x4f7a3c, 0x7fa65a];
  list.forEach((t, i) => { const s = t.s ?? 1; m.compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(s, s, s)); crown.setMatrixAt(i, m); trunk.setMatrixAt(i, m); crown.setColorAt(i, c.setHex(greens[i % greens.length])); });
  crown.castShadow = crown.receiveShadow = trunk.castShadow = true;
  g.add(crown, trunk);
  return g;
}

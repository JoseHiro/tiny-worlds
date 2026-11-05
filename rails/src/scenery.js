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
export function board({ x0, x1, z0, z1 }, ground = 0xd8d2c6) {
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

// the buildings: [{ x, z, w, d, h, yaw, color }]
export function buildings(list) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWp = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (abs(vWn.y) < 0.5) {
          float u = abs(vWn.x) > abs(vWn.z) ? vWp.z : vWp.x;
          float fy = fract(vWp.y / 0.045), fu = fract(u / 0.032);
          float win = step(0.3, fy) * step(fy, 0.78) * step(0.18, fu) * step(fu, 0.82) * step(0.035, vWp.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.42, 0.5) + 0.12 * diffuseColor.rgb, win * 0.78);
        } else diffuseColor.rgb *= 0.86;`);
  };
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((b, i) => { im.setMatrixAt(i, m.compose(new THREE.Vector3(b.x, 0, b.z), q.setFromAxisAngle(up, b.yaw ?? 0), new THREE.Vector3(b.w, b.h, b.d))); im.setColorAt(i, c.setHex(b.color)); });
  im.castShadow = im.receiveShadow = true;
  return im;
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

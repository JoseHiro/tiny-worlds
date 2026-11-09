// Mt Fuji (fuji/DESIGN.md §1.3, §2): a lathe with long gentle skirts and a soft, slightly dented top, squashed front to
// back so it stands behind the shop like painted scenery. The snow line, its gullies and the dusk's pink are drawn by the
// shader from position, so the edge stays crisp without many vertices. Round its foot, the dark trees; above, the clouds.
import * as THREE from 'three';
import { Kit, toy } from './kit.js';

export const PEAK = 4.9;
const RADIUS = 7.4, SQUASH = 0.42;

export function mountain() {
  const pts = [];
  for (let i = 0; i <= 44; i++) { const u = i / 44; pts.push(new THREE.Vector2(0.74 + (RADIUS - 0.74) * Math.pow(1 - u, 1.72), u * PEAK)); }
  pts.push(new THREE.Vector2(0.66, PEAK + 0.07), new THREE.Vector2(0.52, PEAK + 0.08), new THREE.Vector2(0.36, PEAK + 0.02), new THREE.Vector2(0.001, PEAK - 0.04)); // (the top: a soft rim round a shallow crater)
  const geo = new THREE.LatheGeometry(pts, 128);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), up = y / PEAK;
    const k = 1 + (Math.sin(a * 5 + 1) * 0.012 + Math.sin(a * 11) * 0.008) * (0.3 + up); // (a little uneven, like something shaped by hand)
    p.setXYZ(i, x * k, y, z * k * SQUASH);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float up = vP.y / ${PEAK.toFixed(2)}, a = atan(vP.z / ${SQUASH.toFixed(2)}, vP.x);
        vec3 foot = mix(vec3(0.045, 0.063, 0.19), vec3(0.117, 0.13, 0.35), smoothstep(0.0, 0.42, up));
        float gully = pow(abs(sin(a * 8.0 + 0.6)), 7.0) * 0.17 + pow(abs(sin(a * 19.0)), 9.0) * 0.08; // (the snow runs further down the gullies)
        float line = 0.52 + sin(a * 4.0) * 0.012 + sin(a * 13.0 + 1.0) * 0.012 - gully;
        float snow = smoothstep(line - 0.006, line + 0.006, up);
        float shade = pow(abs(sin(a * 8.0 + 0.6 + up * 0.8)), 16.0) * (1.0 - smoothstep(0.55, 0.95, up)); // (shadowed streaks down the snow)
        float pink = smoothstep(0.45, 0.93, up + vP.x * 0.03);
        vec3 white = mix(vec3(1.0, 0.92, 0.89), vec3(1.0, 0.5, 0.56), pink);
        white = mix(white, vec3(0.56, 0.54, 0.84), shade * 0.55);
        diffuseColor.rgb = mix(foot, white, snow);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * snow * (0.36 + pink * 0.34); // (the last of the sun)`);
  };
  const m = new THREE.Mesh(geo, mat);
  m.position.set(0.8, 0, -6.1); m.receiveShadow = true;
  return m;
}

// the dark trees that hide the mountain's foot, and the village behind the shop
export function foot(kit) {
  const greens = [0x3e6a6a, 0x4a7a72, 0x355c60, 0x578676];
  const r = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const ico = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 74; i++) {
    const x = -8.1 + (i / 73) * 16.2, z = -3.25 - r(i) * 0.75, s = 0.34 + r(i + 40) * 0.34;
    kit.add(ico, greens[i % 4], x, s * 0.72, z, { s: [s, s * 0.96, s] });
  }
  for (const [x, z, w, d, h, wall, roof] of [[-6.1, -2.7, 1.2, 0.9, 0.62, 0xf2e6d2, 0x5c6f96], [-4.7, -3.15, 0.95, 0.8, 0.54, 0xe7d7c4, 0x9a6d62]]) {
    kit.box(w, h, d, wall, x, 0.12 + h / 2, z, { r: 0.05 });
    const roofGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
    kit.add(roofGeo, roof, x, 0.12 + h + 0.13, z, { s: [w * 1.14, 0.42, d * 1.3] });
    kit.box(0.2, 0.2, 0.02, 0xffe6b0, x + w * 0.2, 0.12 + h * 0.58, z + d / 2 + 0.005, { r: 0.02 });
  }
}

// the clouds: soft flat puffs, pink underneath. They drift, and come round again.
export function clouds(scene, life) {
  const kit = new Kit(), puff = (x, y, z, w, color) => {
    for (let i = 0; i < 5; i++) { const u = (i - 2) / 2, s = (1 - Math.abs(u) * 0.55) * w * 0.25; kit.ball(1, color, x + u * w * 0.38, y + s * 0.1, z, { s: [s * 1.5, s * 0.55, s] }); }
  };
  // [x, y, z, width, colour]
  const sky = [[-5.4, 4.9, -7, 3.6, 0xf7c2c6], [-3.1, 6.6, -7.5, 1.5, 0xffdcd2], [3.3, 7.7, -8, 2.2, 0xf9d7d6], [7.2, 6, -7.6, 1.8, 0xf7c2c6], [-7.6, 7.5, -8, 1.8, 0xe5dcef]];
  const items = sky.map(([x, y, z, w, col]) => { puff(0, 0, 0, w, col); const m = kit.bake(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.0, flatShading: false })); m.position.set(x, y, z); m.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.75;'); }; scene.add(m); return { m, x, v: 0.02 + w * 0.006 }; });
  life.push((t) => { for (const c of items) { const span = 20; c.m.position.x = ((c.x + t * c.v + span / 2) % span + span) % span - span / 2; } });
}

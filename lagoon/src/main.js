// Longtail lagoon (lagoon/DESIGN.md): the cliffs, the water, the boats, on the room's stage. The morning sun stands low in
// the gap between the left-hand cliffs, so they are dark against it and the big cliff on the right takes the light.
import * as THREE from 'three';
import { createStage, v3 } from '../../room/src/stage.js';
import { label } from '../../fuji/src/kit.js';
import { cliffs } from './cliffs.js';
import { water } from './water.js';
import { life, HERO } from './life.js';
import { seabed } from './seabed.js';
import { fish } from './fish.js';

// each view: its name, then eye and target wide, then eye and target tall (9:16)
const VIEWS = {
  photo: [['写真の角度', 'As in the photo'], [-1.165, 1.05, 9.45], [-5.3, 3.15, -10.6], [-1.165, 1.05, 9.45], [-5.3, 3.35, -10.6]], // (on the boat, behind the traveller, at her height)
  all: [['全体', 'Whole lagoon'], [24, 22, 34], [0, 1, 0], [30, 30, 46], [0, 2, 0]],
  bow: [['舳先', 'The bow'], [0.9, 0.85, 5.6], [-1.3, 0.55, 6.6], [1.5, 1.1, 5.2], [-1.3, 0.7, 6.6]],
  cliff: [['崖の足', 'Under the cliff'], [3.2, 0.55, 4.6], [9.5, 1.6, -0.5], [2.6, 0.7, 6.2], [9.5, 2.4, -0.5]],
};
const tall = () => innerHeight > innerWidth;
const views = Object.fromEntries(Object.entries(VIEWS).map(([k, [name]]) => [k, [name, v3(0, 0, 0), v3(0, 0, 0)]]));
const fit = () => { const n = tall() ? 3 : 1; for (const k in VIEWS) { views[k][1].set(...VIEWS[k][n]); views[k][2].set(...VIEWS[k][n + 1]); } };
fit();
const stage = createStage({ views, view: 'photo', bloom: 0.32 });
const { scene, renderer, camera, controls, life: loop } = stage;
camera.fov = 50; camera.far = 260; camera.near = 0.05; camera.updateProjectionMatrix();
controls.minDistance = 0.8; controls.maxDistance = 70; controls.maxPolarAngle = 1.78; // (the photo looks up at the cliffs from the water)
const start = new URLSearchParams(location.search).get('view');
stage.go(views[start] ? start : 'photo', true);
let wasTall = tall();
addEventListener('resize', () => { if (tall() === wasTall) return; wasTall = tall(); fit(); stage.go(document.querySelector('#views button.on')?.dataset.v ?? 'photo', true); });

// the sky: pale blue, whiter low down; the haze takes the far cliffs a little
scene.background = label('lagoon-sky', 4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [u, c] of [[0, '#6fb8e4'], [0.35, '#8ec9ea'], [0.62, '#c4e5f1'], [0.8, '#e4f3f6'], [1, '#eaf6f4']]) gr.addColorStop(u, c);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0xd6eef3, 45, 150);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;

// the sun: low in the gap on the left, behind the cliffs. A picture of its glow and rays, and the light from it.
const SUN = v3(-0.6, 0.5, -0.62).normalize(); // (the light: higher than the sun looks, so the lagoon isn't all in shadow)
const sunTex = label('lagoon-sun', 512, 512, (g, w, h) => {
  const c = w / 2, r = g.createRadialGradient(c, c, 0, c, c, c);
  for (const [u, col] of [[0, 'rgba(255,255,250,1)'], [0.05, 'rgba(255,252,235,1)'], [0.12, 'rgba(255,240,190,0.75)'], [0.35, 'rgba(255,230,170,0.22)'], [1, 'rgba(255,230,170,0)']]) r.addColorStop(u, col);
  g.fillStyle = r; g.fillRect(0, 0, w, h);
  g.translate(c, c); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { // the rays
    g.rotate((Math.PI * 2) / 14 + (i % 3) * 0.05);
    const len = c * (i % 2 ? 0.55 : 0.95), gr = g.createLinearGradient(0, 0, len, 0);
    gr.addColorStop(0, 'rgba(255,248,220,0.55)'); gr.addColorStop(1, 'rgba(255,248,220,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -4); g.lineTo(len, 0); g.lineTo(0, 4); g.fill();
  }
});
const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
sun.scale.setScalar(52); sun.renderOrder = -1; scene.add(sun);
export const SUN_SEEN = v3(-0.375, 0.16, -0.927).normalize(); // (where the sun looks to be: low on the shoulder of the left-hand cliff)
const placeSun = () => sun.position.copy(views.photo[1]).addScaledVector(SUN_SEEN, 140);
placeSun();

scene.add(new THREE.HemisphereLight(0xe2eff0, 0x4aa59a, 0.9));
const key = new THREE.DirectionalLight(0xfff0d2, 3.0);
key.position.copy(SUN).multiplyScalar(40); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
Object.assign(key.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
scene.add(key, key.target);

cliffs(scene);
water(scene, loop, SUN_SEEN);
seabed(scene, loop);
fish(scene, loop);
const world = life(scene, loop);

stage.start();
window.__lagoon = { stage, world, HERO, sun };

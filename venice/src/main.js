// Venice (venice/DESIGN.md): the canal town on the room's stage. Day only: an afternoon sun from the south-west, a clear
// sky going a warm pale at the horizon, small clouds, the water glinting.
import * as THREE from 'three';
import { createStage, v3 } from '../../room/src/stage.js';
import { label } from '../../fuji/src/kit.js';
import { clock } from './kit.js';
import { town } from './town.js';
import { life } from './life.js';

// each view: its name, then eye and target wide, then eye and target tall (9:16)
const VIEWS = {
  canal: [['大運河', 'Grand Canal'], [8.8, 3.4, -8.0], [-6.0, 0.6, -5.4], [9.2, 4.0, -8.2], [-6.0, 0.4, -5.0]],
  all: [['全体', 'Whole town'], [21, 21, 29], [0, 0.5, 0.5], [27, 30, 40], [0, 1, 0.5]],
  square: [['大広場', 'The square'], [5.0, 6.4, 13.4], [6.4, 1.2, 3.6], [5.0, 7.2, 15.0], [6.4, 1.6, 3.6]],
  gondola: [['ゴンドラ', 'Gondolas'], [-7.0, 2.8, 11.4], [-9.4, 0.4, 1.6], [-7.0, 3.2, 12.4], [-9.4, 0.6, 1.6]],
  lagoon: [['ラグーン', 'Lagoon'], [9.0, 3.0, 18.6], [4.0, 1.6, 6.5], [9.4, 3.6, 20.0], [4.0, 2.0, 6.5]],
};
const tall = () => innerHeight > innerWidth;
const views = Object.fromEntries(Object.entries(VIEWS).map(([k, [name]]) => [k, [name, v3(0, 0, 0), v3(0, 0, 0)]]));
const fit = () => { const n = tall() ? 3 : 1; for (const k in VIEWS) { views[k][1].set(...VIEWS[k][n]); views[k][2].set(...VIEWS[k][n + 1]); } };
fit();
const stage = createStage({ views, view: 'canal', bloom: 0.2 });
const { scene, renderer, camera, controls, life: loop } = stage;
camera.fov = 45; camera.far = 260; camera.near = 0.05; camera.updateProjectionMatrix();
controls.minDistance = 0.6; controls.maxDistance = 70; controls.maxPolarAngle = 1.52;
const start = new URLSearchParams(location.search).get('view');
stage.go(views[start] ? start : 'canal', true);
let wasTall = tall();
addEventListener('resize', () => { if (tall() === wasTall) return; wasTall = tall(); fit(); stage.go(document.querySelector('#views button.on')?.dataset.v ?? 'canal', true); });

scene.background = label('venice-sky', 4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [u, c] of [[0, '#3f86dc'], [0.35, '#6aa8e8'], [0.62, '#b6d6f0'], [0.8, '#eadfd6'], [1, '#f6ece2']]) gr.addColorStop(u, c);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0xeadfd6, 60, 180);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;

const cloudTex = label('venice-cloud', 256, 128, (g, w, h) => { for (const [x, y, r] of [[70, 80, 40], [120, 64, 52], [175, 78, 40], [100, 90, 34], [150, 92, 34]]) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
const clouds = [[-60, 26, -90, 34], [10, 34, -110, 44], [70, 24, -80, 30], [-30, 30, 90, 30], [60, 28, 100, 34]].map(([x, y, z, s]) => { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, fog: false, transparent: true, depthWrite: false, opacity: 0.9 })); c.position.set(x, y, z); c.scale.set(s, s / 2, 1); c.renderOrder = -1; scene.add(c); return c; });

// the light: an afternoon sun from the south-west (warm, the fronts facing it glowing), the blue sky filling the shade
const SUN = v3(-0.55, 0.6, 0.58).normalize();
scene.add(new THREE.HemisphereLight(0xd6e6ff, 0xc9b39a, 1.25));
const key = new THREE.DirectionalLight(0xffe8cc, 2.7);
key.position.copy(SUN).multiplyScalar(45); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
Object.assign(key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 100 });
scene.add(key, key.target);

const T = town(scene);
const world = life(scene, loop, T);
loop.push((t, dt) => { clock.uTime.value = t; for (const m of T.moving) m.userData.update?.(t, dt); for (const c of clouds) { c.position.x += dt * 0.3; if (c.position.x > 120) c.position.x = -120; } });

stage.start();
window.__venice = { stage, world, town: T };

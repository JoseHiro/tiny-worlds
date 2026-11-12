// Snow festival (snowfest/DESIGN.md): the square town on the room's stage. Day only: a low winter sun from the south, a
// clear sky going pale at the horizon, small clouds, snow drifting down and glinting.
import * as THREE from 'three';
import { createStage, v3 } from '../../room/src/stage.js';
import { label } from '../../fuji/src/kit.js';
import { clock } from './kit.js';
import { town } from './town.js';
import { life } from './life.js';
import { snowfall } from './weather.js';

// each view: its name, then eye and target wide, then eye and target tall (9:16)
const VIEWS = {
  castle: [['雪の城', 'The snow castle'], [2.6, 1.9, 10.2], [-0.2, 2.6, -1.4], [2.4, 2.0, 11.4], [-0.2, 3.0, -1.4]],
  all: [['全体', 'Whole town'], [21, 21, 29], [0, 0.5, 0.5], [27, 30, 40], [0, 1, 0.5]],
  stalls: [['屋台', 'The stalls'], [-8.4, 1.25, 0.6], [-12.4, 0.9, -3.0], [-8.2, 1.4, 1.2], [-12.4, 1.1, -3.0]],
  ice: [['氷の通り', 'Ice promenade'], [1.8, 1.0, 16.6], [-2.2, 0.9, 13.0], [1.6, 1.2, 17.4], [-2.0, 1.2, 12.6]],
  tower: [['鉄塔から', 'From the tower'], [11.6, 8.6, 2.4], [-1, 1.5, -0.8], [11.6, 8.8, 2.6], [-1, 1.2, -0.8]],
};
const tall = () => innerHeight > innerWidth;
const views = Object.fromEntries(Object.entries(VIEWS).map(([k, [name]]) => [k, [name, v3(0, 0, 0), v3(0, 0, 0)]]));
const fit = () => { const n = tall() ? 3 : 1; for (const k in VIEWS) { views[k][1].set(...VIEWS[k][n]); views[k][2].set(...VIEWS[k][n + 1]); } };
fit();
const stage = createStage({ views, view: 'castle', bloom: 0.25 });
const { scene, renderer, camera, controls, life: loop } = stage;
camera.fov = 45; camera.far = 260; camera.near = 0.05; camera.updateProjectionMatrix();
controls.minDistance = 0.6; controls.maxDistance = 70; controls.maxPolarAngle = 1.55;
const start = new URLSearchParams(location.search).get('view');
stage.go(views[start] ? start : 'castle', true);
let wasTall = tall();
addEventListener('resize', () => { if (tall() === wasTall) return; wasTall = tall(); fit(); stage.go(document.querySelector('#views button.on')?.dataset.v ?? 'castle', true); });

scene.background = label('snow-sky', 4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [u, c] of [[0, '#3f7fd6'], [0.35, '#6fa6e6'], [0.62, '#b8d6f2'], [0.8, '#dcecfa'], [1, '#eef5fc']]) gr.addColorStop(u, c);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0xdcecfa, 55, 170);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;

const cloudTex = label('snow-cloud', 256, 128, (g, w, h) => { for (const [x, y, r] of [[70, 80, 40], [120, 64, 52], [175, 78, 40], [100, 90, 34], [150, 92, 34]]) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
const clouds = [[-60, 26, -90, 34], [10, 34, -110, 44], [70, 24, -80, 30], [-30, 30, 90, 30], [60, 28, 100, 34]].map(([x, y, z, s]) => { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, fog: false, transparent: true, depthWrite: false, opacity: 0.9 })); c.position.set(x, y, z); c.scale.set(s, s / 2, 1); c.renderOrder = -1; scene.add(c); return c; });

// the light: a low sun from the south (long shadows, a little warm), the blue sky filling the shade (so the snow's shadows go blue)
const SUN = v3(-0.35, 0.5, 0.79).normalize();
scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x8fa4cc, 1.25));
const key = new THREE.DirectionalLight(0xfff2e0, 2.6);
key.position.copy(SUN).multiplyScalar(45); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
Object.assign(key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 100 });
scene.add(key, key.target);

const t0 = town(scene);
const world = life(scene, loop);
const snow = snowfall({ w: 30, d: 30, h: 14, n: 3000, size: 0.09 }); scene.add(snow);
loop.push((t, dt) => { clock.uTime.value = t; for (const m of t0.moving) m.userData.update?.(t, dt); for (const c of clouds) { c.position.x += dt * 0.3; if (c.position.x > 120) c.position.x = -120; } });

stage.start();
window.__snowfest = { stage, world, town: t0 };

// Blue domes (santorini/DESIGN.md): the caldera, the village, the sea, on the room's stage. Day only: a high sun from the
// front left, a deep blue sky going pale at the horizon, a few small clouds drifting.
import * as THREE from 'three';
import { createStage, v3 } from '../../room/src/stage.js';
import { label } from '../../fuji/src/kit.js';
import { land, at, rim, HARBOR } from './land.js';
import { sea } from './sea.js';
import { village } from './village.js';
import { life } from './life.js';

const P = (a, d, y) => { const [x, z] = at(a, d); return [x, y, z]; };
// each view: its name, then eye and target wide, then eye and target tall (9:16)
const VIEWS = {
  postcard: [['絵はがき', 'Postcard'], P(-101.8, 8.6, 11.6), P(-99.4, -1, 3.4), P(-101.5, 9.0, 12.4), P(-99.5, -1, 3.0)], // (behind the church: the bell tower and the dome against the bay, the island beyond)
  all: [['全体', 'Whole caldera'], [22, 19, 30], [0, 2.6, -3.5], [28, 27, 42], [0, 3, -3]],
  harbor: [['港', 'The harbour'], P(HARBOR + 7, -7.5, 1.3), P(HARBOR - 1, 0.5, 1.4), P(HARBOR + 7, -9.5, 1.6), P(HARBOR - 1, 0.5, 1.9)],
  mill: [['風車', 'The windmill'], P(-63, 7.4, rim(-63) + 1.3), P(-98, 2.5, 4.5), P(-62, 7.8, rim(-62) + 1.6), P(-96, 2.5, 4)],
};
const FOV = { postcard: [38, 44] }; // (the postcard a little long, as a photo would be; the rest at 45)
const tall = () => innerHeight > innerWidth;
const views = Object.fromEntries(Object.entries(VIEWS).map(([k, [name]]) => [k, [name, v3(0, 0, 0), v3(0, 0, 0)]]));
const fit = () => { const n = tall() ? 3 : 1; for (const k in VIEWS) { views[k][1].set(...VIEWS[k][n]); views[k][2].set(...VIEWS[k][n + 1]); } };
fit();
const stage = createStage({ views, view: 'postcard', bloom: 0.22 });
const { scene, renderer, camera, controls, life: loop } = stage;
camera.fov = 38; camera.far = 260; camera.near = 0.05; camera.updateProjectionMatrix();
controls.minDistance = 0.8; controls.maxDistance = 70; controls.maxPolarAngle = 1.62;
const start = new URLSearchParams(location.search).get('view');
stage.go(views[start] ? start : 'postcard', true);
loop.push((t, dt) => { if (stage.filming) return; const k = document.querySelector('#views button.on')?.dataset.v, f = FOV[k]?.[tall() ? 1 : 0] ?? 45; if (Math.abs(camera.fov - f) > 0.01) { camera.fov += (f - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); } });
let wasTall = tall();
addEventListener('resize', () => { if (tall() === wasTall) return; wasTall = tall(); fit(); stage.go(document.querySelector('#views button.on')?.dataset.v ?? 'postcard', true); });

// the sky: deep blue up high, pale toward the horizon
scene.background = label('santorini-sky', 4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [u, c] of [[0, '#1f6fd0'], [0.3, '#3f8fe0'], [0.55, '#86c0ee'], [0.75, '#d6ecfa'], [1, '#e8f4fb']]) gr.addColorStop(u, c);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0xcfe6f8, 50, 160);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;

// a few small clouds, far off, drifting
const cloudTex = label('santorini-cloud', 256, 128, (g, w, h) => {
  for (const [x, y, r] of [[70, 80, 40], [120, 64, 52], [175, 78, 40], [100, 90, 34], [150, 92, 34]]) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
});
const clouds = [[-60, 26, 80, 30], [10, 34, 110, 40], [70, 22, 90, 26], [-20, 40, -110, 36], [50, 30, -100, 30]].map(([x, y, z, s]) => {
  const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, fog: false, transparent: true, depthWrite: false, opacity: 0.9 }));
  c.position.set(x, y, z); c.scale.set(s, s / 2, 1); c.renderOrder = -1; scene.add(c); return c;
});
loop.push((t, dt) => { for (const c of clouds) { c.position.x += dt * 0.25; if (c.position.x > 120) c.position.x = -120; } });

// the light: a high sun from the front left; the sky's and the sea's blue fill the shadows
const SUN = v3(-0.45, 0.8, 0.5).normalize();
scene.add(new THREE.HemisphereLight(0xd6e8ff, 0x5a7fb8, 1.15));
const key = new THREE.DirectionalLight(0xfff6e6, 2.7);
key.position.copy(SUN).multiplyScalar(40); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
Object.assign(key.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
scene.add(key, key.target);

land(scene);
sea(scene, loop, SUN);
const town = village(scene);
const world = life(scene, loop, town);

stage.start();
window.__santorini = { stage, world, town };

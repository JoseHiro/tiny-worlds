// Fuji Mart (fuji/DESIGN.md): the shop at dusk, on one board, on the room's stage. The sky is a plain gradient behind it.
import * as THREE from 'three';
import { createStage, v3 } from '../../room/src/stage.js';
import { Kit, toy, label } from './kit.js';
import { mountain, foot, clouds } from './mountain.js';
import { shop } from './shop.js';
import { lot } from './lot.js';
import { people } from './people.js';

// each view: its name, then eye and target wide, then eye and target tall (9:16: further back, so the shop still fits across)
const VIEWS = {
  photo: [['写真の角度', 'As in the photo'], [0.2, 1.45, 20], [0.2, 2.35, -2], [0.15, 1.7, 26.5], [0.15, 3.2, -2]],
  all: [['全体', 'Whole board'], [13, 10, 18.5], [0, 1.5, -1.5], [17, 13, 25], [0, 1.6, -1.5]],
  front: [['店の前', 'At the door'], [-2.5, 0.68, 3.7], [-0.7, 0.72, -0.5], [-1.5, 0.8, 8], [-0.9, 1, -0.5]],
  inside: [['店の中', 'Inside'], [0.85, 0.92, 2.5], [0.75, 0.56, -1.2], [1, 1, 6], [0.9, 0.75, -1.2]],
};
const tall = () => innerHeight > innerWidth;
const views = Object.fromEntries(Object.entries(VIEWS).map(([k, [name]]) => [k, [name, v3(0, 0, 0), v3(0, 0, 0)]]));
const fit = () => { const n = tall() ? 3 : 1; for (const k in VIEWS) { views[k][1].set(...VIEWS[k][n]); views[k][2].set(...VIEWS[k][n + 1]); } };
fit();
const stage = createStage({ views, view: 'photo', bloom: 0.18 });
const { scene, renderer, camera, controls, life } = stage;
camera.far = 90; camera.near = 0.05; camera.updateProjectionMatrix();
controls.minDistance = 0.8; controls.maxDistance = 44; controls.maxPolarAngle = 1.53;
stage.go(views[new URLSearchParams(location.search).get('view')] ? new URLSearchParams(location.search).get('view') : 'photo', true); // (again: the stage's first go was held to its own, closer limit)
// turning the phone: the same view, from where it fits
let wasTall = tall();
addEventListener('resize', () => { if (tall() === wasTall) return; wasTall = tall(); fit(); stage.go(document.querySelector('#views button.on')?.dataset.v ?? 'photo', true); });

// the dusk: a sky behind everything, pale light from it, and a soft low light from the front left so the toys read
scene.background = label('sky', 4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [u, c] of [[0, '#6f8fc0'], [0.42, '#8f9ed0'], [0.66, '#c3aed4'], [0.86, '#f6c3b4'], [1, '#f8d3bd']]) gr.addColorStop(u, c);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;
scene.add(new THREE.HemisphereLight(0xc6d2f2, 0x6c6890, 1.75));
const key = new THREE.DirectionalLight(0xffdccb, 1.5);
key.position.set(-9, 11, 13); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 45 }); scene.add(key, key.target); key.target.position.set(0, 0, -1);

// the world
scene.add(mountain());
const trees = new Kit(); foot(trees); const tm = trees.bake(toy()); tm.castShadow = tm.receiveShadow = true; scene.add(tm);
clouds(scene, life);
lot(scene);
const s = shop(scene, life);
people(scene, life, s);

stage.start();

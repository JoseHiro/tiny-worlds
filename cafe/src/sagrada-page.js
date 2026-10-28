// A preview of the Sagrada Família (cafe/SAGRADA.md §7 step 1–2): the towers and the body at true scale with people,
// seen from Plaça de Gaudí, from the Passion side and from above, before it goes behind the Barcelona terrace.
import * as THREE from 'three';
import { person } from '../../airport/src/parts.js';
import { createWorld, v3 } from '../../koto/src/world.js';
import { SAGRADA_SCALE, basilica, towers, gloryWorks, setNight } from './sagrada.js';

const S = SAGRADA_SCALE;
const VIEWS = {
  plaza: ['ガウディ広場から', v3(205, 22, 22), v3(0, 58, -4)],
  all: ['全体', v3(170, 150, 190), v3(0, 40, 0)],
  passion: ['受難の側', v3(-150, 24, -60), v3(0, 52, 0)],
  glory: ['栄光（工事中）', v3(40, 40, 140), v3(0, 30, 30)],
  top: ['上から', v3(30, 300, 40), v3(0, 0, 0)],
  near: ['生誕の塔を見上げる', v3(42, 3, 30), v3(24, 60, 0)],
};
const world = createWorld({ views: VIEWS, shadow: 120, target: [0, 0, 0], look: 'day' });
const { scene, camera, life, steps } = world;
camera.far = 2000; camera.updateProjectionMatrix();
world.controls.maxDistance = 900;

// the street grid around the block (Eixample), the plaza with its pond on the Nativity side
world.slab(-140, 200, -130, 140, () => 0, 1, 1, new THREE.MeshStandardMaterial({ color: 0xc8c2b6, roughness: 1 }));
const ground = (w, d, x, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })); m.position.set(x, 0.02, z); m.receiveShadow = true; scene.add(m); return m; };
ground(26, 260, 70, 0, 0x4a4d52); // Carrer de la Marina
ground(26, 260, -70, 0, 0x4a4d52); // Carrer de Sardenya
ground(340, 22, 30, 75, 0x4a4d52); // Carrer de Mallorca
ground(340, 22, 30, -75, 0x4a4d52); // Carrer de Provença
ground(90, 110, 130, 0, 0x8fb06a); // Plaça de Gaudí
const pond = ground(46, 30, 128, 6, 0x5f8a9a); pond.material.roughness = 0.08; pond.material.metalness = 0.3; pond.position.y = 0.05;

// the basilica at true scale
const b = new THREE.Group(); b.scale.setScalar(S); scene.add(b);
b.add(basilica());
const t = towers(); b.add(t);
const works = gloryWorks(); b.add(works); life.push(works);
// people for scale, on the plaza
for (let i = 0; i < 8; i++) { const p = person(['tourist', 'visitor', 'woman', 'kimonoWoman', 'senior', 'child'][i % 6], { mode: i % 3 ? 'idle' : 'look' }); p.position.set(96 + (i % 4) * 3, 0, 20 + Math.floor(i / 4) * 4); p.rotation.y = Math.PI; scene.add(p); life.push({ userData: { update: (tt) => p.userData.update(tt) } }); }

// heights, for checking against the sources
document.getElementById('towerLine').textContent = 'イエス 172.5 m · マリア 138 m · 福音書記者 135 m · 使徒 98.5〜112 m（14本）';
steps.push(() => setNight(world.look === 'night' ? 1 : world.look === 'dusk' ? 0.4 : 0));
world.start();
window.__sagrada = { b, towers: t };

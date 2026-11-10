// "Blue domes": the Santorini village, 9:16, about 45 seconds and no story (santorini/DESIGN.md §0): down from above like a
// drone, the postcard (the dome and the bell tower against the bay), the white houses stacked down the cliff, the windmill,
// alongside the catamaran, the harbour, the donkey on the steps, the caldera's layered cliff from the water, then a pull
// back over the board with the name. English lower thirds (naha.js's say). Open santorini/ (on the film server) and run
// (await import('/film/santorini.js')).run(); run(true) for the first and last frames only. thumb() makes the top page's
// picture (santorini/thumb.jpg, 1320 × 840).
import * as THREE from 'three';
import { film, nameCard } from './film.js';
import { say } from './naha.js';
import { at, rim, HARBOR } from '../santorini/src/land.js';

const S = () => window.__santorini, R = () => S().stage;
const card = nameCard(10, 'Blue domes.', { shadow: 'rgba(6,40,110,0.6)' });
const P = (a, d, y) => { const [x, z] = at(a, d); return [x, y, z]; };
const beside = (get, [ox, oy, oz], [tx, ty, tz] = [0, 0.4, 0]) => (u, p, t) => { const g = get(); g.updateMatrixWorld(); p.set(ox, oy, oz).applyMatrix4(g.matrixWorld); t.set(tx, ty, tz).applyMatrix4(g.matrixWorld); };
const POSTCARD = [P(-101.5, 9.0, 12.4), P(-99.5, -1, 3.0)];

export const SHOTS = [
  { dur: 5, cam: { from: [[0.5, 46, 24], [0, 1, -4]], to: [[0.5, 30, 17], [0, 1.5, -4]] }, draw: say('BUILT WITH CLAUDE', 'A village in Santorini') },
  { dur: 5.5, cam: { from: [P(-101.8, 10.2, 13.6), POSTCARD[1]], to: POSTCARD }, draw: say('BLUE DOMES', 'Over the deep blue Aegean') },
  { dur: 5, cam: { from: [P(-128, 9, 14.5), P(-100, 2.5, 5.2)], to: [P(-124, 8.4, 13.2), P(-97, 2.5, 5.0)] }, draw: say('WHITE HOUSES', 'Stacked down the cliff') },
  { dur: 4.5, cam: { from: [P(-60, 9.2, rim(-60) + 1.6), P(-70, 5.6, rim(-70) + 1.2)], to: [P(-61, 8.2, rim(-61) + 1.2), P(-69, 5.6, rim(-69) + 1.3)] }, draw: say('THE WINDMILL', 'Up on the ridge') },
  { dur: 5, cam: { fn: beside(() => S().world.cat, [-1.4, 1.1, 2.8], [0.2, 0.6, 0]) }, draw: say('THE CATAMARAN', 'Round the caldera') },
  { dur: 5, cam: { from: [P(HARBOR + 7, -8, 1.4), P(HARBOR - 1, 0.5, 1.4)], to: [P(HARBOR + 5, -5.5, 1.0), P(HARBOR - 1, 0.5, 1.0)] }, draw: say('THE HARBOUR', 'Lunch by the water') },
  { dur: 4.5, cam: { fn: beside(() => S().world.donkey, [-1.6, 2.2, 3.4], [0.2, 0.2, 0]) }, draw: say('THE STEPS', 'A donkey takes the long way up') },
  { dur: 4.5, cam: { from: [P(-124, -10.5, 1.4), P(-118, 1.5, 4.2)], to: [P(-114, -10, 1.6), P(-110, 1.5, 4.4)] }, draw: say('THE CALDERA', 'A volcano, layer on layer') },
  { dur: 6.5, cam: { from: POSTCARD, to: [[16, 30, 34], [0, 2, -3]] }, draw: card },
];

export async function run(preview = false) {
  const r = R();
  r.filming = true; r.px = 1920;
  r.renderer.setPixelRatio(1); r.composer.setPixelRatio(1); r.composer.setSize(1080, 1920);
  document.querySelector('.brand').style.display = 'none';
  window.__koto = { renderer: r.renderer, camera: r.camera, scene: r.scene, tick: r.tick, render: r.render, people: [] };
  return film({ name: preview ? 'santorini' : 'santorini1', shots: SHOTS, fov: 46, near: 0.05, far: 260, preview });
}

// the top page's picture: the postcard, wide, "Made with Claude Opus 5.5" across the foot
export async function thumb(eye = P(-102.2, 8.8, 11.9), look = P(-99.2, -1.5, 3.6)) {
  const r = R(), W = 1320, H = 840;
  r.filming = true; r.renderer.setAnimationLoop(null);
  r.renderer.setPixelRatio(1); r.renderer.setSize(W, H, false); r.composer.setPixelRatio(1); r.composer.setSize(W, H);
  r.camera.aspect = W / H; r.camera.fov = 36; r.camera.updateProjectionMatrix();
  for (let i = 0; i < 40; i++) r.tick(1 / 30);
  r.camera.position.set(...eye); r.camera.lookAt(new THREE.Vector3(...look));
  r.render();
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.drawImage(r.renderer.domElement, 0, 0);
  const sh = g.createLinearGradient(0, H - 300, 0, H); sh.addColorStop(0, 'rgba(8,30,80,0)'); sh.addColorStop(1, 'rgba(8,30,80,0.62)');
  g.fillStyle = sh; g.fillRect(0, H - 300, W, 300);
  g.fillStyle = '#e8673c'; g.beginPath(); g.arc(74, 652, 10, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,20,60,0.55)'; g.shadowBlur = 14;
  g.font = '600 30px "Avenir Next", "Helvetica Neue", sans-serif'; g.letterSpacing = '6px'; g.fillText('MADE WITH', 100, 663);
  g.letterSpacing = '0px'; g.font = 'italic 400 104px "Hoefler Text", Georgia, serif'; g.fillText('Claude Opus 5.5', 64, 778);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
  await fetch('/__film/santorini-thumb/thumb', { method: 'POST', body: blob });
  return 'film/out/santorini-thumb/thumb.jpg';
}

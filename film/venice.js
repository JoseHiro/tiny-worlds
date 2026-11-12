// "Venice": the canal town, 9:16, about 45 seconds and no story (venice/DESIGN.md §7). It opens out of the white that the
// flight from Mini Airport ends in (film/flyin.js: run('VCE', 'VENICE')), then every shot from a good way off and up: down
// over the board, the Grand Canal's S, the great bridge, the square as the pigeons all take off, the water bus at its
// pontoon, alongside the serenade gondola, the water taxi's wake, round the bell tower, and the pull-back with the name.
// Open venice/ on the film server and run (await import('/film/venice.js')).run(); run(true) for first and last frames.
// The town's clock is wound to 0 as the film starts (life.js t0), so the water bus and the pigeons keep to the shots.
import * as THREE from 'three';
import { film, nameCard } from './film.js';
import { say as sayNaha } from './naha.js';

// the lower thirds, with a soft wash under them (the water and the white stone are pale)
const say = (kick, text) => { const d = sayNaha(kick, text); return (g, u, W, H, ts) => { const a = Math.min(1, Math.max(0, (ts - 0.25) / 0.5)) * Math.min(1, (1 - u) * 8); const sc = g.createLinearGradient(0, H - 760, 0, H); sc.addColorStop(0, 'rgba(10,40,60,0)'); sc.addColorStop(0.5, `rgba(10,40,60,${0.38 * a})`); sc.addColorStop(1, `rgba(10,40,60,${0.52 * a})`); g.fillStyle = sc; g.fillRect(0, H - 760, W, 760); d(g, u, W, H, ts); }; };
const outOfWhite = (d) => (g, u, W, H, ts) => { d(g, u, W, H, ts); const a = 1 - Math.min(1, ts / 0.8); if (a > 0) { g.fillStyle = `rgba(255,255,255,${a * a * (3 - 2 * a)})`; g.fillRect(0, 0, W, H); } };

const S = () => window.__venice, R = () => S().stage;
const card = nameCard(12, 'Venice.', { shadow: 'rgba(10,50,80,0.6)' });
const boat = (i) => () => S().world.boats[i].b;
// beside a moving boat: eye and target in its own frame (+x ahead)
const beside = (get, [ox, oy, oz], [tx, ty, tz] = [0, 0.4, 0]) => (u, P, T) => { const g = get(); g.updateMatrixWorld(); P.set(ox, oy, oz).applyMatrix4(g.matrixWorld); T.set(tx, ty, tz).applyMatrix4(g.matrixWorld); };

export const SHOTS = [
  { dur: 5, cam: { from: [[0, 52, 30], [0, 0, 0]], to: [[10, 34, 32], [0, 1, 0]] }, draw: outOfWhite(say('BUILT WITH CLAUDE', 'A canal town like Venice')) },
  { dur: 5, cam: { from: [[19, 13, -12], [-4, 0, -4]], to: [[17, 11, -8], [-6, 0, -3]] }, draw: say('THE GRAND CANAL', 'Gondolas all the way down') },
  { dur: 5, cam: { from: [[10.5, 9.0, -11.0], [3, 1.0, -6.5]], to: [[9.0, 9.0, -2.0], [3, 1.0, -6.5]] }, draw: say('THE GREAT BRIDGE', 'Shops on a single arch') },
  { dur: 5, start: () => { const w = S().world; w.flock.userData.flush(w.t - w.t0 + 1.2); }, cam: { from: [[7, 11, 18], [6.4, 1, 4.5]], to: [[4.5, 9.5, 16], [6.4, 1.6, 4.5]] }, draw: say('THE SQUARE', 'Every pigeon, all at once') },
  { dur: 5, cam: { from: [[-3, 6.5, 21], [4.4, 0.5, 12]], to: [[0, 6, 20], [5, 0.5, 12]] }, draw: say('THE WATER BUS', 'Next stop: the square') },
  { dur: 5, cam: { fn: beside(boat(0), [-5.5, 6.0, 0.6], [2.4, 0.2, 0]) }, draw: say('A SERENADE', 'Accordion on the water') },
  { dur: 4.5, cam: { fn: beside(boat(4), [-7, 6.5, -0.6], [3.5, 0.0, 0]) }, draw: say('WATER TAXI', 'Full speed down the canal') },
  { dur: 5, cam: { fn(u, P, T) { const a = 0.15 + 0.7 * u; P.set(10.2 + Math.sin(a) * 11, 9.5, 3.4 + Math.cos(a) * 11); T.set(8.6, 3.6, 2.6); } }, draw: say('THE BELL TOWER', 'Over the whole town') },
  { dur: 6, cam: { from: [[10, 22, 28], [0, 1.5, 0]], to: [[16, 30, 34], [0, 1.5, 0]] }, draw: card },
];

export async function run(preview = false) {
  const r = R(), w = S().world;
  w.t0 = w.t; // (the town's clock starts again at 0 with the film)
  r.filming = true; r.px = 1920;
  r.renderer.setPixelRatio(1); r.composer.setPixelRatio(1); r.composer.setSize(1080, 1920);
  document.querySelector('.brand').style.display = 'none';
  window.__koto = { renderer: r.renderer, camera: r.camera, scene: r.scene, tick: r.tick, render: r.render, people: [] };
  return film({ name: preview ? 'venice' : 'venice1', shots: SHOTS, fov: 46, near: 0.05, far: 260, preview });
}

// the top page's picture: the board from the south-east, "Made with Claude Opus 5.5" across the foot
export async function thumb(eye = [19, 19, 27], look = [0, 1, 0.5]) {
  const r = R(), W = 1320, H = 840;
  r.filming = true; r.renderer.setAnimationLoop(null);
  r.renderer.setPixelRatio(1); r.renderer.setSize(W, H, false); r.composer.setPixelRatio(1); r.composer.setSize(W, H);
  r.camera.aspect = W / H; r.camera.fov = 38; r.camera.updateProjectionMatrix();
  for (let i = 0; i < 40; i++) r.tick(1 / 30);
  r.camera.position.set(...eye); r.camera.lookAt(new THREE.Vector3(...look));
  r.render();
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.drawImage(r.renderer.domElement, 0, 0);
  const sh = g.createLinearGradient(0, H - 300, 0, H); sh.addColorStop(0, 'rgba(10,40,60,0)'); sh.addColorStop(1, 'rgba(10,40,60,0.6)');
  g.fillStyle = sh; g.fillRect(0, H - 300, W, 300);
  g.fillStyle = '#e8673c'; g.beginPath(); g.arc(74, 652, 10, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,30,50,0.55)'; g.shadowBlur = 14;
  g.font = '600 30px "Avenir Next", "Helvetica Neue", sans-serif'; g.letterSpacing = '6px'; g.fillText('MADE WITH', 100, 663);
  g.letterSpacing = '0px'; g.font = 'italic 400 104px "Hoefler Text", Georgia, serif'; g.fillText('Claude Opus 5.5', 64, 778);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
  await fetch('/__film/venice-thumb/thumb', { method: 'POST', body: blob });
  return 'film/out/venice-thumb/thumb.jpg';
}
// a clean 9:16 frame at the pull-back angle for the post cover (film/cover.py adds the words, film/COVER.md)
export async function coverFrame(eye = [16, 30, 34], look = [0, 1.5, 0]) {
  const r = R(), W = 1080, H = 1920;
  r.filming = true; r.renderer.setAnimationLoop(null);
  r.renderer.setPixelRatio(1); r.renderer.setSize(W, H, false); r.composer.setPixelRatio(1); r.composer.setSize(W, H);
  r.camera.aspect = W / H; r.camera.fov = 46; r.camera.updateProjectionMatrix();
  for (let i = 0; i < 40; i++) r.tick(1 / 30);
  r.camera.position.set(...eye); r.camera.lookAt(new THREE.Vector3(...look)); r.render();
  const blob = await new Promise((res) => r.renderer.domElement.toBlob(res, 'image/jpeg', 0.92));
  await fetch('/__film/venice-coverframe/00000', { method: 'POST', body: blob });
  return 'film/out/venice-coverframe/00000.jpg';
}

// "Snow festival": the snowy town, 9:16, about 45 seconds and no story (snowfest/DESIGN.md §0): down from above like a
// drone, the snow castle and its stage, the little sculptures, the food stalls, alongside the tram and the sasara tram,
// the ice promenade, the town from the tower, the plough, then a pull back over the board with the name. English lower
// thirds (naha.js's say). Open snowfest/ (on the film server) and run (await import('/film/snowfest.js')).run(); run(true)
// for the first and last frames only. thumb() makes the top page's picture (snowfest/thumb.jpg, 1320 × 840).
// The traffic runs from the clock, so run() first winds each lane back to where it would be at t = 0 (the page has been
// running for a few seconds by then): the shots alongside the trams and the plough then find them where planned.
import * as THREE from 'three';
import { film, nameCard } from './film.js';
import { say as sayNaha } from './naha.js';
// the lower thirds, with a deeper wash under them: snow is paler than Okinawa's sand
const say = (kick, text) => { const d = sayNaha(kick, text); return (g, u, W, H, ts) => { const a = Math.min(1, Math.max(0, (ts - 0.25) / 0.5)) * Math.min(1, (1 - u) * 8); const sc = g.createLinearGradient(0, H - 760, 0, H); sc.addColorStop(0, 'rgba(14,30,64,0)'); sc.addColorStop(0.5, `rgba(14,30,64,${0.4 * a})`); sc.addColorStop(1, `rgba(14,30,64,${0.55 * a})`); g.fillStyle = sc; g.fillRect(0, H - 760, W, 760); d(g, u, W, H, ts); }; };

const S = () => window.__snowfest, R = () => S().stage;
const card = nameCard(11, 'Snow festival.', { shadow: 'rgba(20,50,100,0.6)' });
const ease = (u) => u * u * (3 - 2 * u);
const beside = (get, [ox, oy, oz], [tx, ty, tz] = [0, 0.4, 0]) => (u, P, T) => { const g = get(); g.updateMatrixWorld(); P.set(ox, oy, oz).applyMatrix4(g.matrixWorld); T.set(tx, ty, tz).applyMatrix4(g.matrixWorld); };
const lane = (i) => () => S().world.lanes[i].v;
const CASTLE = [[2.6, 1.9, 10.2], [-0.2, 2.6, -1.4]];

// every shot from a good way off and up (the user: close shots don't land; the pull-back over the board is the best angle)
export const SHOTS = [
  { dur: 5, cam: { from: [[0, 50, 28], [0, 0, 0]], to: [[10, 34, 32], [0, 1, 0]] }, draw: say('BUILT WITH CLAUDE', 'A snow festival in Hokkaido') },
  { dur: 5, cam: { from: [[9, 12, 19], [0, 1.5, -0.5]], to: [[5, 10.5, 17], [-1, 1.5, -0.5]] }, draw: say('THE SNOW CASTLE', 'A concert at its gate') },
  { dur: 5, cam: { from: [[-2.5, 11, 13], [-11, 1.5, 0]], to: [[-5.5, 10, 12], [-11, 1.8, 0]] }, draw: say('BIG AIR', 'A flip off the ramp') },
  { dur: 5, cam: { from: [[-3.5, 10, 13], [-11, 1, -4]], to: [[-6, 9, 11], [-12, 1, -5]] }, draw: say('FOOD STALLS', 'Ramen, corn, crab soup') },
  { dur: 5, cam: { from: [[17, 9.5, -0.5], [10.3, 0.5, -8.6]], to: [[15.5, 8.5, -2.5], [10.3, 0.5, -8.6]] }, draw: say('SKATING', 'Round and round the rink') },
  { dur: 5, cam: { from: [[-9, 9, -14], [-4, 0.5, -5]], to: [[-4, 9, -14], [1, 0.5, -5]] }, draw: say('THE TRAM', 'A brush tram sweeps the rails') },
  { dur: 5, cam: { from: [[15.5, 9, -6.5], [9.2, 0.5, 0.6]], to: [[13.5, 8, -5.5], [9.2, 0.5, 0.6]] }, draw: say('SNOWBALL FIGHT', 'Two forts, no mercy') },
  { dur: 4.5, cam: { from: [[0, 8.5, 25], [0, 1, 12]], to: [[4, 7.5, 24], [1, 1, 12]] }, draw: say('ICE SCULPTURES', 'All along the front') },
  { dur: 6, cam: { from: [[10, 22, 28], [0, 1.5, 0]], to: [[16, 30, 34], [0, 1.5, 0]] }, draw: card },
];

export async function run(preview = false) {
  const r = R(), w = S().world;
  for (const l of w.lanes) l.at = ((l.at - (w.t * l.speed) / (30 + 6)) % 1 + 1) % 1; // (as if the clock had just started: L = 36, see life.js)
  r.scene.getObjectByName('bigAir').userData.t0 = w.t + 9.8; // (a run that flips mid-way through the big-air shot, 10–15 s)
  r.filming = true; r.px = 1920;
  r.renderer.setPixelRatio(1); r.composer.setPixelRatio(1); r.composer.setSize(1080, 1920);
  document.querySelector('.brand').style.display = 'none';
  window.__koto = { renderer: r.renderer, camera: r.camera, scene: r.scene, tick: r.tick, render: r.render, people: [] };
  return film({ name: preview ? 'snowfest' : 'snowfest1', shots: SHOTS, fov: 46, near: 0.05, far: 260, preview });
}

// the top page's picture: the castle and the town behind it, "Made with Claude Opus 5.5" across the foot
export async function thumb(eye = [18, 20, 28], look = [0, 1, 0]) {
  const r = R(), W = 1320, H = 840;
  r.filming = true; r.renderer.setAnimationLoop(null);
  r.renderer.setPixelRatio(1); r.renderer.setSize(W, H, false); r.composer.setPixelRatio(1); r.composer.setSize(W, H);
  r.camera.aspect = W / H; r.camera.fov = 38; r.camera.updateProjectionMatrix();
  for (let i = 0; i < 40; i++) r.tick(1 / 30);
  r.camera.position.set(...eye); r.camera.lookAt(new THREE.Vector3(...look));
  r.render();
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.drawImage(r.renderer.domElement, 0, 0);
  const sh = g.createLinearGradient(0, H - 300, 0, H); sh.addColorStop(0, 'rgba(20,40,80,0)'); sh.addColorStop(1, 'rgba(20,40,80,0.6)');
  g.fillStyle = sh; g.fillRect(0, H - 300, W, 300);
  g.fillStyle = '#e8673c'; g.beginPath(); g.arc(74, 652, 10, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,20,60,0.55)'; g.shadowBlur = 14;
  g.font = '600 30px "Avenir Next", "Helvetica Neue", sans-serif'; g.letterSpacing = '6px'; g.fillText('MADE WITH', 100, 663);
  g.letterSpacing = '0px'; g.font = 'italic 400 104px "Hoefler Text", Georgia, serif'; g.fillText('Claude Opus 5.5', 64, 778);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
  await fetch('/__film/snowfest-thumb/thumb', { method: 'POST', body: blob });
  return 'film/out/snowfest-thumb/thumb.jpg';
}

// a clean 9:16 frame at the favourite angle (the pull-back over the board) for the post cover: film/cover.py adds the words
export async function coverFrame(eye = [16, 30, 34], look = [0, 1.5, 0]) {
  const r = R(), W = 1080, H = 1920;
  r.filming = true; r.renderer.setAnimationLoop(null);
  r.renderer.setPixelRatio(1); r.renderer.setSize(W, H, false); r.composer.setPixelRatio(1); r.composer.setSize(W, H);
  r.camera.aspect = W / H; r.camera.fov = 46; r.camera.updateProjectionMatrix();
  for (let i = 0; i < 40; i++) r.tick(1 / 30);
  r.camera.position.set(...eye); r.camera.lookAt(new THREE.Vector3(...look)); r.render();
  const blob = await new Promise((res) => r.renderer.domElement.toBlob(res, 'image/jpeg', 0.92));
  await fetch('/__film/snowfest-coverframe/00000', { method: 'POST', body: blob });
  return 'film/out/snowfest-coverframe/00000.jpg';
}

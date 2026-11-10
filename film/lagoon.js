// "Longtail lagoon": the Thai lagoon, 9:16, about 45 seconds and no story (lagoon/DESIGN.md §0): down from above like a
// drone, the photo's view from the stern, the ribbons on the bow, a tour boat going round, the clear water over the coral,
// the fish, the cliffs, the sun in the gap, then a pull back over the board with the name. English lower thirds (naha.js's
// say). Open lagoon/ (on the film server) and run (await import('/film/lagoon.js')).run(); run(true) for the first and
// last frames only. thumb() makes the top page's picture (lagoon/thumb.jpg, 1320 × 840).
import * as THREE from 'three';
import { film, nameCard } from './film.js';
import { say } from './naha.js';

const L = () => window.__lagoon, R = () => L().stage;
const card = nameCard(9, 'Longtail lagoon.', { shadow: 'rgba(6,60,90,0.55)' });
const ease = (u) => u * u * (3 - 2 * u);
// alongside a moving thing (a group): offset from it in its own frame, looking at it
const beside = (get, [ox, oy, oz], [tx, ty, tz] = [0, 0.4, 0]) => (u, P, T) => { const g = get(); g.updateMatrixWorld(); P.set(ox, oy, oz).applyMatrix4(g.matrixWorld); T.set(tx, ty, tz).applyMatrix4(g.matrixWorld); };
const PHOTO = [[-1.165, 1.05, 9.45], [-5.3, 3.35, -10.6]];

export const SHOTS = [
  { dur: 5, cam: { from: [[0.5, 46, 26], [0, 0, -1]], to: [[0.5, 30, 19], [0, 0, -1]] }, draw: say('BUILT WITH CLAUDE', 'A lagoon in Thailand') },
  { dur: 5, cam: { from: [[-1.05, 1.15, 10.6], PHOTO[1]], to: PHOTO }, draw: say('LONGTAIL BOAT', 'Into the limestone cliffs') },
  { dur: 4.5, cam: { fn: beside(() => L().world.hero.group, [0.1, 0.8, 2.1], [0.95, 0.65, 0]) }, draw: say('THE BOW', 'Ribbons for good luck') },
  { dur: 5, cam: { fn: beside(() => L().world.tours[0], [-0.6, 1.0, 2.6], [0.5, 0.35, 0]) }, draw: say('ROUND THE LAGOON', 'Under a blue roof') },
  { dur: 5, cam: { from: [[4.6, 3.4, 6.4], [6.3, -0.6, 1.8]], to: [[5.2, 2.2, 4.6], [6.4, -0.6, 1.6]] }, draw: say('CLEAR WATER', 'Coral right below') },
  { dur: 5, cam: { fn: (u, P, T) => { const e = ease(u); P.set(-0.4 - e * 0.8, 2.3 - e * 0.5, 2.6 - e * 0.6); T.set(-1.8, -0.85, -0.8); } }, draw: say('FISH', 'Sardines, tangs, a little shark') },
  { dur: 4.5, cam: { from: [[2.6, 0.5, 5.4], [11.5, 5.5, -3]], to: [[3.4, 0.45, 4.6], [11.5, 8, -3.5]] }, draw: say('THE CLIFFS', 'Sheer rock, green on top') },
  { dur: 4.5, cam: { from: [[-1.6, 0.7, 6.5], [-8, 2.6, -8]], to: [[-2.2, 0.62, 5.2], [-8.6, 3.2, -8]] }, draw: say('MORNING', 'The sun through the gap') },
  { dur: 6.5, cam: { from: PHOTO, to: [[16, 30, 34], [0, 1.5, -1]] }, draw: card },
];

export async function run(preview = false) {
  const r = R();
  r.filming = true; r.px = 1920;
  r.renderer.setPixelRatio(1); r.composer.setPixelRatio(1); r.composer.setSize(1080, 1920); // (at 1×: the bloom's targets at 2× would be four times the memory)
  document.querySelector('.brand').style.display = 'none';
  window.__koto = { renderer: r.renderer, camera: r.camera, scene: r.scene, tick: r.tick, render: r.render, people: [] };
  return film({ name: preview ? 'lagoon' : 'lagoon1', shots: SHOTS, fov: 50, near: 0.05, far: 260, preview });
}

// the top page's picture: the lagoon from above its mouth, toward the sun, "Made with Claude Opus 5.5" across the foot
export async function thumb(eye = [6.5, 7.5, 21], at = [-2.5, 2.2, -4]) {
  const r = R(), W = 1320, H = 840;
  r.filming = true; r.renderer.setAnimationLoop(null);
  r.renderer.setPixelRatio(1); r.renderer.setSize(W, H, false); r.composer.setPixelRatio(1); r.composer.setSize(W, H);
  r.camera.aspect = W / H; r.camera.fov = 42; r.camera.updateProjectionMatrix();
  for (let i = 0; i < 40; i++) r.tick(1 / 30); // (let the boats get under way)
  r.camera.position.set(...eye); r.camera.lookAt(new THREE.Vector3(...at));
  r.render();
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.drawImage(r.renderer.domElement, 0, 0);
  const sh = g.createLinearGradient(0, H - 300, 0, H); sh.addColorStop(0, 'rgba(4,40,56,0)'); sh.addColorStop(1, 'rgba(4,40,56,0.6)');
  g.fillStyle = sh; g.fillRect(0, H - 300, W, 300);
  g.fillStyle = '#e8673c'; g.beginPath(); g.arc(74, 652, 10, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,30,50,0.5)'; g.shadowBlur = 14;
  g.font = '600 30px "Avenir Next", "Helvetica Neue", sans-serif'; g.letterSpacing = '6px'; g.fillText('MADE WITH', 100, 663);
  g.letterSpacing = '0px'; g.font = 'italic 400 104px "Hoefler Text", Georgia, serif'; g.fillText('Claude Opus 5.5', 64, 778);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
  await fetch('/__film/lagoon-thumb/thumb', { method: 'POST', body: blob });
  return 'film/out/lagoon-thumb/thumb.jpg';
}

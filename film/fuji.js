// "Fuji Mart": the shop at dusk, 9:16, about 30 seconds and no story (fuji/DESIGN.md §0): the mountain and the birds, the
// doors, the till, the road, the tourist's view, then a pull back over the board with the name. Open fuji/ and run
// (await import('/film/fuji.js')).run(); run(true) for the first and last frames only. It has the room's stage, handed to film.js dressed as the koto one.
import { film } from './film.js';

const R = () => window.__room;
const SANS = '"Avenir Next", "Helvetica Neue", sans-serif';
const card = (g, u, W, H, ts) => { // the name in the sky
  const a = Math.min(1, Math.max(0, (ts - 1.8) / 0.8));
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#fdfbf4'; g.shadowColor = 'rgba(30,36,70,0.45)'; g.shadowBlur = 14;
  g.font = `600 24px ${SANS}`; g.letterSpacing = '6px'; g.fillText('TINY WORLDS · NO. 8', W / 2, 300);
  g.letterSpacing = '0px'; g.font = `italic 400 132px "Hoefler Text", Georgia, serif`; g.fillText('Fuji Mart.', W / 2, 430);
  g.font = `400 34px ${SANS}`; g.fillText('Made with Claude Opus 5.5', W / 2, 505);
  g.restore();
};

// (a close camera stays on the car park side of z = 4.2: further out, the road's traffic would drive through the lens)
export const SHOTS = [
  { dur: 5, cam: { from: [[0.15, 3.6, 30], [0.15, 4.4, -2]], to: [[0.15, 3.2, 25.5], [0.15, 3.9, -2]] }, cap: ['Dusk under Mt Fuji'] },
  { dur: 4, cam: { from: [[1.6, 1.5, 8], [0.8, 3.1, -6]], to: [[0.9, 1.5, 7.4], [0.8, 3.4, -6]] }, cap: ['The snow turns pink'] },
  { dur: 5, cam: { from: [[-0.35, 0.8, 4.15], [-0.9, 0.85, -0.5]], to: [[-0.5, 0.75, 3.3], [-0.9, 0.78, -0.5]] }, cap: ['The doors slide open'] },
  { dur: 5, cam: { from: [[1.05, 0.95, 4.15], [1.05, 0.68, -1.2]], to: [[1.2, 0.85, 3.2], [1.2, 0.6, -1.2]] }, cap: ['A small bow at the till'] },
  { dur: 4, cam: { from: [[0.9, 1, 14.5], [0.9, 0.95, 0]], to: [[0.3, 1, 14.5], [0.3, 0.95, 0]] }, cap: ['Little cars come and go'] },
  { dur: 4, cam: { from: [[-2.79, 0.4, 4.2], [0.8, 2.9, -6]], to: [[-2.72, 0.46, 4.0], [0.8, 3.05, -6]] }, cap: ['Everyone stops for this view'], capTop: true },
  { dur: 6, cam: { from: [[0.15, 3.2, 24], [0.15, 3.9, -2]], to: [[16, 13, 26], [0, 2.6, -1.5]] }, draw: card },
];

export async function run(preview = false) {
  const r = R();
  r.filming = true; r.px = 1920;
  r.renderer.setPixelRatio(1); r.composer.setPixelRatio(1); r.composer.setSize(1080, 1920); // (at 1×: the bloom's targets at 2× would be four times the memory)
  window.__koto = { renderer: r.renderer, camera: r.camera, scene: r.scene, tick: r.tick, render: r.render, people: [] };
  return film({ name: preview ? 'fuji' : 'fuji1', shots: SHOTS, fov: 30, far: 90, preview });
}

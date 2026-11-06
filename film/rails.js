// "Rush hour": Tokyo by rail, 9:16, about 60 seconds — the story "the first morning" (rails/DESIGN.md §9) shot by shot,
// each shot through the story's own camera (fixed on a platform, or riding beside Sora's train), then a pull back over
// the whole board with the name. Open rails/?story=1 and run (await import('/film/rails.js')).run(); run(true) for the
// first and last frames only. The rails world has the room's stage, so it is handed to film.js dressed as the koto one.
import { film } from './film.js';

const R = () => window.__room;
const SANS = '"Avenir Next", "Helvetica Neue", sans-serif';
const story = (u, P, T) => { // the story's camera (and the shadow and near plane follow it, as they follow the controls)
  const c = R().story.cam, cam = R().camera;
  P.copy(c.P); T.copy(c.T); R().controls.target.copy(T);
  const near = Math.min(0.25, Math.max(0.004, P.distanceTo(T) * 0.006));
  if (Math.abs(cam.near - near) > near * 0.2) { cam.near = near; cam.updateProjectionMatrix(); }
};
const card = (g, u, W, H, ts) => { // the name over the board
  const a = Math.min(1, Math.max(0, (ts - 1.4) / 0.8));
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#1f2430'; g.shadowColor = 'rgba(255,255,255,0.7)'; g.shadowBlur = 16;
  g.font = `600 24px ${SANS}`; g.letterSpacing = '6px'; g.fillText('TINY WORLDS · NO. 7', W / 2, 330);
  g.letterSpacing = '0px'; g.font = `italic 400 124px "Hoefler Text", Georgia, serif`; g.fillText('Rush hour.', W / 2, 460);
  g.font = `400 34px ${SANS}`; g.fillText('Tokyo by rail, 7:30 – 9:00', W / 2, 540);
  g.restore();
};

export const SHOTS = [
  { start: () => R().story.start(), dur: 6, cam: { fn: story }, cap: ['Sora’s first day at work'] },
  { at: 'オレンジの中央線', dur: 6, cam: { fn: story }, cap: ['The orange Chūō Line pulls in'] },
  { at: '四ツ谷へ', dur: 8, cam: { fn: story }, cap: ['East, beside the Sōbu Line'] },
  { at: '御茶ノ水。', dur: 6, cam: { fn: story }, cap: ['Ochanomizu, over the river'] },
  { at: '赤レンガ', dur: 6, cam: { fn: story }, cap: ['Tokyo Station'] },
  { at: '山手線に乗りかえ', dur: 7, cam: { fn: story }, cap: ['Change to the Yamanote Line'] },
  { at: '有楽町、新橋', dur: 8, cam: { fn: story }, cap: ['Past Tokyo Tower'] },
  { at: '品川。ここが', dur: 7, cam: { fn: story }, cap: ['Shinagawa. The new office'] },
  { at: '深呼吸', dur: 5, cam: { fn: story }, cap: ['“Here I go.”'] },
  { dur: 6, cam: { fn: (u, P, T) => { // up and away over the whole of Tokyo
    const c = R().story.cam, k = u * u * (3 - 2 * u);
    P.set(c.P.x + (2 - c.P.x) * k, c.P.y + (34 - c.P.y) * k, c.P.z + (26 - c.P.z) * k); T.set(c.T.x + (0.4 - c.T.x) * k, c.T.y * (1 - k), c.T.z + (1.2 - c.T.z) * k);
    R().controls.target.copy(T); const cam = R().camera, near = Math.min(0.25, Math.max(0.004, P.distanceTo(T) * 0.006)); cam.near = near; cam.updateProjectionMatrix();
  } }, draw: card },
];

export async function run(preview = false) {
  const r = R();
  r.filming = true; r.px = 1920;
  r.renderer.setPixelRatio(1); r.composer.setPixelRatio(1); r.composer.setSize(1080, 1920); // (at 1×: the bloom's targets at 2× would be four times the memory)
  window.__koto = { renderer: r.renderer, camera: r.camera, scene: r.scene, tick: r.tick, render: r.render, people: [] };
  return film({ name: preview ? 'rails' : 'rails1', shots: SHOTS, fov: 44, far: 140, preview });
}

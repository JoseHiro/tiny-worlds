// "Late commit": the engineer's room, 9:16, about 50 seconds — the story "the bug on a rainy night" (room/DESIGN.md §12)
// cut down to its moments: the red tests, the duck, the cat waking and walking over the keyboard and sitting in front of
// the screen, the pour-over, the last train in the rain, the one-line fix, lights out, the cat at the feet, the name.
// Open room/?story=1 and run (await import('/film/room.js')).run(); run(true) for the first and last frames only.
// The room has its own stage (room/src/stage.js), so it is handed to film.js dressed as the koto one.
import { film, FONT } from './film.js';

const R = () => window.__room;
const SANS = '"Avenir Next", "Helvetica Neue", sans-serif';
const move = (from, to) => ({ from, to });
const card = (g, u, W, H, ts) => { // the name over the dark room
  const a = Math.min(1, Math.max(0, (ts - 1.2) / 0.8));
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#fffaf2'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 18;
  g.font = `600 24px ${SANS}`; g.letterSpacing = '6px'; g.fillText('TINY WORLDS · NO. 6', W / 2, 330);
  g.letterSpacing = '0px'; g.font = `italic 400 120px "Hoefler Text", Georgia, serif`; g.fillText('Late commit.', W / 2, 460);
  g.font = `400 34px ${FONT}`; g.fillText('雨の夜、東京のワンルーム', W / 2, 530); g.font = `400 30px ${SANS}`; g.fillText('A rainy night in a Tokyo one-room flat', W / 2, 580);
  g.restore();
};

export const SHOTS = [
  { start: () => R().story.start(), dur: 4.5, cam: move([[3.0, 2.9, 3.8], [-0.2, 0.55, -0.3]], [[2.4, 2.4, 3.1], [-0.4, 0.6, -0.4]]), cap: ['雨の夜、23:40', 'A rainy night, 23:40'] },
  { at: 'テストが赤い', dur: 4, cam: move([[-0.2, 1.3, 0.75], [-1.15, 0.8, -0.45]], [[-0.3, 1.22, 0.6], [-1.15, 0.8, -0.45]]), cap: ['テストが、赤い', 'The tests are red'] },
  { at: 'アヒル', dur: 3, cam: move([[-0.7, 0.88, -0.02], [-1.13, 0.6, -0.2]], [[-0.76, 0.84, -0.06], [-1.13, 0.6, -0.2]]), cap: ['アヒルに説明してみる', 'Explaining it to the duck'] },
  { at: 'ベッドの猫', dur: 4, speed: 1.3, cam: move([[0.85, 1.25, 0.25], [0.85, 0.3, -0.95]], [[0.7, 1.2, 0.35], [0.4, 0.2, -0.5]]), cap: ['猫が、起きた', 'The cat wakes up'] },
  { at: 'キーボードの上', dur: 4, speed: 1.5, cam: move([[-0.3, 1.2, 0.6], [-1.05, 0.62, -0.35]], [[-0.35, 1.15, 0.5], [-1.05, 0.62, -0.45]]), cap: ['キーボードの上を、てくてく', 'Strolling across the keyboard'] },
  { at: 'そして画面の前', dur: 4, cam: move([[-0.35, 1.2, 0.55], [-1.12, 0.72, -0.42]], [[-0.42, 1.12, 0.45], [-1.12, 0.72, -0.42]]), cap: ['画面の前に、座りこむ', 'Right in front of the screen'] },
  { at: 'お湯を沸かして', skip: 1, dur: 4, speed: 1.5, cam: move([[-0.7, 1.05, 1.15], [-1.2, 0.65, 0.25]], [[-0.75, 1.0, 1.05], [-1.2, 0.65, 0.25]]), cap: ['もう一杯、ドリップで', 'Another cup, poured slowly'] },
  { at: '窓の外は雨', dur: 6, speed: 1.4, cam: move([[0.95, 1.25, 0.75], [0.35, 0.8, -1.2]], [[0.8, 1.15, 0.55], [0.45, 0.85, -1.3]]), cap: ['窓の外は雨。最終電車', 'Rain, and the last train'] },
  { at: 'ふと気づいて', dur: 4.5, speed: 2, cam: move([[-0.3, 1.22, 0.6], [-1.15, 0.8, -0.45]], [[-0.4, 1.15, 0.45], [-1.15, 0.8, -0.45]]), cap: ['1行なおして……通った！', 'One line… and they pass!'] },
  { at: '1:10', dur: 3.5, speed: 1.4, cam: move([[1.8, 2.0, 2.2], [-0.5, 0.5, -0.5]], [[1.6, 1.8, 2.0], [-0.5, 0.5, -0.5]]), cap: ['1:10。おやすみ', '1:10. Lights off'] },
  { at: 'ランプだけ', dur: 4, cam: move([[0.75, 1.7, 0.75], [0.6, 0.35, -1.0]], [[0.75, 1.6, 0.6], [0.6, 0.35, -1.0]]), cap: ['猫といっしょに', 'With the cat'] },
  { at: 'ランプを消す', dur: 5.5, cam: move([[1.9, 1.7, 1.3], [0.5, 0.45, -0.9]], [[3.2, 3.0, 3.9], [-0.1, 0.5, -0.3]]), draw: card },
];

export async function run(preview = false) {
  const r = R();
  r.filming = true; r.px = 1920;
  r.renderer.setPixelRatio(1); r.composer.setPixelRatio(1); r.composer.setSize(1080, 1920); // (at 1×: the bloom's targets at 2× would be four times the memory)
  window.__koto = { renderer: r.renderer, camera: r.camera, scene: r.scene, tick: r.tick, render: r.render, people: [] };
  return film({ name: preview ? 'room' : 'room1', shots: SHOTS, fov: 44, near: 0.02, far: 60, preview });
}

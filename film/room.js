// "Late commit": the engineer's room, 9:16, about 50 seconds — the story "the bug on a rainy night" (room/DESIGN.md §12)
// cut down to its moments: the red tests, the duck, the cat waking and walking over the keyboard and sitting in front of
// the screen, the pour-over, the last train in the rain, the one-line fix, lights out, the cat at the feet, the name.
// Open room/?story=1 and run (await import('/film/room.js')).run(); run(true) for the first and last frames only.
// The room has its own stage (room/src/stage.js), so it is handed to film.js dressed as the koto one.
import { film, nameCard } from './film.js';

const R = () => window.__room;
const move = (from, to) => ({ from, to }); // (the captions are English only: cap: [en] shows it alone, large)
const card = nameCard(6, 'Late commit.', { delay: 1.2, shadow: 'rgba(0,0,0,0.6)' }); // the name over the dark room (film.js: every film ends on it)

export const SHOTS = [
  { start: () => R().story.start(), dur: 4.5, cam: move([[3.0, 2.9, 3.8], [-0.2, 0.55, -0.3]], [[2.4, 2.4, 3.1], [-0.4, 0.6, -0.4]]), cap: ['A rainy night, 23:40'] },
  { at: 'テストが赤い', dur: 4, cam: move([[-0.2, 1.3, 0.75], [-1.15, 0.8, -0.45]], [[-0.3, 1.22, 0.6], [-1.15, 0.8, -0.45]]), cap: ['The tests are red'] },
  { at: 'アヒル', dur: 3, cam: move([[-0.7, 0.88, -0.02], [-1.13, 0.6, -0.2]], [[-0.76, 0.84, -0.06], [-1.13, 0.6, -0.2]]), cap: ['Explaining it to the duck'] },
  { at: 'ベッドの猫', dur: 4, speed: 1.3, cam: move([[0.85, 1.25, 0.25], [0.85, 0.3, -0.95]], [[0.7, 1.2, 0.35], [0.4, 0.2, -0.5]]), cap: ['The cat wakes up'] },
  { at: 'キーボードの上', dur: 4, speed: 1.5, cam: move([[-0.3, 1.2, 0.6], [-1.05, 0.62, -0.35]], [[-0.35, 1.15, 0.5], [-1.05, 0.62, -0.45]]), cap: ['Strolling across the keyboard'] },
  { at: 'そして画面の前', dur: 4, cam: move([[-0.35, 1.2, 0.55], [-1.12, 0.72, -0.42]], [[-0.42, 1.12, 0.45], [-1.12, 0.72, -0.42]]), cap: ['Right in front of the screen'] },
  { at: 'お湯を沸かして', skip: 1, dur: 4, speed: 1.5, cam: move([[-0.7, 1.05, 1.15], [-1.2, 0.65, 0.25]], [[-0.75, 1.0, 1.05], [-1.2, 0.65, 0.25]]), cap: ['Another cup, poured slowly'] },
  { at: '窓の外は雨', dur: 6, speed: 1.4, cam: move([[0.95, 1.25, 0.75], [0.35, 0.8, -1.2]], [[0.8, 1.15, 0.55], [0.45, 0.85, -1.3]]), cap: ['Rain, and the last train'] },
  { at: 'ふと気づいて', dur: 4.5, speed: 2, cam: move([[-0.3, 1.22, 0.6], [-1.15, 0.8, -0.45]], [[-0.4, 1.15, 0.45], [-1.15, 0.8, -0.45]]), cap: ['One line… and they pass!'] },
  { at: '1:10', dur: 3.5, speed: 1.4, cam: move([[1.8, 2.0, 2.2], [-0.5, 0.5, -0.5]], [[1.6, 1.8, 2.0], [-0.5, 0.5, -0.5]]), cap: ['1:10. Lights off'] },
  { at: 'ランプだけ', dur: 4, cam: move([[0.75, 1.7, 0.75], [0.6, 0.35, -1.0]], [[0.75, 1.6, 0.6], [0.6, 0.35, -1.0]]), cap: ['With the cat'] },
  { at: 'ランプを消す', dur: 5.5, cam: move([[1.9, 1.7, 1.3], [0.5, 0.45, -0.9]], [[3.2, 3.0, 3.9], [-0.1, 0.5, -0.3]]), draw: card },
];

export async function run(preview = false) {
  const r = R();
  r.filming = true; r.px = 1920;
  r.renderer.setPixelRatio(1); r.composer.setPixelRatio(1); r.composer.setSize(1080, 1920); // (at 1×: the bloom's targets at 2× would be four times the memory)
  window.__koto = { renderer: r.renderer, camera: r.camera, scene: r.scene, tick: r.tick, render: r.render, people: [] };
  return film({ name: preview ? 'room' : 'room1', shots: SHOTS, fov: 44, near: 0.02, far: 60, preview });
}

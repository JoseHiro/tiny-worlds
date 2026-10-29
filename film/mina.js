// "Mina's rainy day" as a 30-second vertical video: three short pieces, one per café, filmed from the story pages
// (cafe/*.html?story=N) and joined by film/make.sh. run(no) films chapter no; run(no, true) only its first and last
// frames, to check the shots.
import { film, FONT } from './film.js';
import { drawSketch } from '../cafe/src/things.js';

// the title over the first shot, and the chapter's place at the top of each piece
function title(g, u, W, H, ts) {
  const a = Math.min(1, ts / 0.5) * Math.min(1, (3.0 - ts) / 0.5);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(60, 40, 30, 0.35)'; g.shadowBlur = 24;
  g.fillStyle = '#fffaf0'; g.font = `700 104px ${FONT}`; g.fillText('雨の日のミナ', W / 2, 360);
  g.font = `400 40px ${FONT}`; g.fillText('Mina’s rainy day', W / 2, 460);
  g.restore();
}
const place = ([ja, en]) => (g, u, W, H, ts) => {
  const a = Math.min(1, ts / 0.4);
  g.save(); g.globalAlpha = a * 0.92; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `600 34px ${FONT}`; const w = g.measureText(`${ja} · ${en}`).width + 64;
  g.fillStyle = 'rgba(255, 250, 240, 0.8)'; g.beginPath(); g.roundRect((W - w) / 2, 150, w, 66, 33); g.fill();
  g.fillStyle = '#6a5444'; g.fillText(`${ja} · ${en}`, W / 2, 184);
  g.restore();
};
// the end: the four drawings of the day come up one by one over the night terrace, then おしまい
function sketches(g, u, W, H, ts) {
  g.save();
  g.fillStyle = `rgba(28, 30, 48, ${Math.min(0.55, ts * 0.5)})`; g.fillRect(0, 0, W, H);
  const S = 3.1, size = 128 * S, gap = 36, x0 = (W - 2 * size - gap) / 2, y0 = 560;
  for (let i = 0; i < 4; i++) {
    const t = Math.max(0, Math.min(1, (ts - 0.3 - i * 0.45) / 0.35));
    if (!t) continue;
    const pop = 1 + 0.12 * Math.sin(t * Math.PI), x = x0 + (i % 2) * (size + gap), y = y0 + Math.floor(i / 2) * (size + gap);
    g.save(); g.globalAlpha = t; g.translate(x + size / 2, y + size / 2); g.rotate([-0.05, 0.04, 0.03, -0.04][i]); g.scale(pop, pop); g.translate(-size / 2, -size / 2);
    g.shadowColor = 'rgba(0, 0, 0, 0.35)'; g.shadowBlur = 30; g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, size, size); g.shadowBlur = 0;
    g.scale(S, S); drawSketch(g, i + 1);
    g.restore();
  }
  const a = Math.max(0, Math.min(1, (ts - 2.4) / 0.5));
  g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fffaf0';
  g.font = `600 50px ${FONT}`; g.fillText('スケッチブックが、一冊ぶん埋まった。', W / 2, 1520);
  g.font = `400 32px ${FONT}`; g.fillText('A whole day of rain, in one sketchbook.', W / 2, 1590);
  g.font = `700 64px ${FONT}`; g.fillText('おしまい', W / 2, 1720);
  g.restore();
}
const both = (...fs) => (...a) => fs.forEach((f) => f(...a));

export const SHOTS = {
  1: [ // the Nordic café: drizzle on the cobbles, the cat into her lap, the sun comes out
    { at: 'あ、いい匂い', clear: 4, dur: 3.4, cam: { follow: [2.3, 1.35, 3.3], look: 1.1 }, draw: both(title, place(['北の街', 'up north'])) },
    { at: '猫が起きて', clear: 1.5, dur: 3.8, cam: { from: [[-3.3, 2.1, 3.3], [-5.6, 0.95, 4.25]], to: [[-3.85, 1.8, 3.65], [-5.6, 0.9, 4.25]] }, cap: ['猫が、ひざの上に', 'The café cat climbs into her lap'] },
    { at: '気がつくと雨', dur: 3.2, speed: 1.6, cam: { from: [[-5.6, 1.8, 8.8], [-5.6, 1.2, 4.2]], to: [[-5.6, 1.5, 7.0], [-5.6, 1.1, 4.2]] }, cap: ['雨が、やんだ', 'The rain stops'] },
  ],
  2: [ // the Japanese café: a sudden downpour, matcha on the tatami, off under a borrowed red umbrella
    { at: 'ぽつ、ぽつ', skip: 0.8, dur: 3.2, cam: { follow: [2.6, 1.7, 3.8], look: 1.0 }, cap: ['にわか雨！', 'A sudden downpour!'], draw: place(['古い町', 'an old town']) },
    { at: '小上がりで', skip: 0.4, dur: 3.6, cam: { from: [[-0.6, 2.0, 0.6], [-2.6, 0.5, -1.9]], to: [[-1.2, 1.6, -0.4], [-2.5, 0.6, -2.0]] }, cap: ['抹茶とどら焼き。……あまい', 'Matcha and dorayaki. …Sweet.'] },
    { at: '和傘に雨が', dur: 3.6, cam: { follow: [3.0, 1.7, 3.6], look: 1.1 }, cap: ['借りた赤い和傘で', 'Under a borrowed red umbrella'] },
  ],
  3: [ // Barcelona: the basilica in the pond after the rain, night on the towers, the sketchbook full
    { at: '池のほとりで', dur: 3.4, cam: { toward: [40, 9, 0], from: [6.0, 1.5, 0.8], to: [5.0, 1.4, 0.7] }, cap: ['雨上がりの聖堂', 'The basilica after the rain'], capTop: true, draw: place(['バルセロナ', 'Barcelona']) },
    { at: '夜。塔に灯り', skip: 0.5, dur: 3.0, cam: { from: [[118, 3.5, 30], [60, 30, 0]], to: [[117, 3.7, 29.4], [60, 38, 0]] }, cap: ['夜。塔に灯りがともる', 'Night. The towers light up'] },
    { at: 'ライトアップされた', skip: 1.5, dur: 4.6, cam: { from: [[117, 3.7, 29.4], [60, 38, 0]], to: [[116.5, 3.8, 29], [60, 40, 0]] }, draw: sketches },
  ],
};
export const run = (no, preview = false) => film({ name: `mina${no}`, shots: SHOTS[no], preview });

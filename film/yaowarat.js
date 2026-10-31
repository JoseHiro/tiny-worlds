// "Yaowarat": the Bangkok night market, 9:16, 30 seconds. Dusk on the road as the stalls open, a grill smoking, the
// neon signs coming on one after another, a tuk-tuk in the traffic, through the arch into the tent lane, the little
// stage, and up over the roofs once it is night. The evening's clock is taken in hand so the dusk→night of the page
// (two minutes) fits in the film without the people rushing.
// Open bangkok/ and run (await import('/film/yaowarat.js')).run(); run(true) for the first and last frames only.
import { film } from './film.js';

const M = () => window.__market;
const SANS = '"Avenir Next", "Helvetica Neue", sans-serif', JP = '"Hiragino Sans", sans-serif';
const ease = (t) => t * t * (3 - 2 * t);
const lerp3 = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);

// the evening's clock over a shot: t0 → t1 (seconds of the page's evening), whatever the world steps
const evening = (t0, t1 = t0) => (u) => { M().clock.t = t0 + (t1 - t0) * u; };
// a camera moving eased from → to, with the clock set as it goes
const move = (from, to, time) => ({ fn: (u, P, T) => { time?.(u); const e = ease(u); P.set(...lerp3(from[0], to[0], e)); T.set(...lerp3(from[1], to[1], e)); } });

// a small two-line tag in the top-left: English kicker over a Japanese line (as in film/runway.js)
const tag = (en, ja) => (g, u, W, H, ts) => {
  const a = Math.min(1, ts / 0.5, (1 - u) * 8);
  g.save(); g.globalAlpha = Math.max(0, a); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14;
  g.fillStyle = '#fffaf2'; g.font = `600 26px ${SANS}`; g.letterSpacing = '5px'; g.fillText(en.toUpperCase(), 80, 200);
  g.letterSpacing = '0px'; g.font = `600 58px ${JP}`; g.fillText(ja, 76, 276);
  g.restore();
};
// the closing card
const card = (g, u, W, H, ts) => {
  const a = Math.min(1, Math.max(0, (ts - 1) / 0.8));
  g.save(); g.globalAlpha = a;
  const shade = g.createLinearGradient(0, 120, 0, 680); // (a soft dusk behind the words, over the lit shophouses)
  shade.addColorStop(0, 'rgba(20, 24, 44, 0)'); shade.addColorStop(0.35, 'rgba(20, 24, 44, 0.55)'); shade.addColorStop(0.7, 'rgba(20, 24, 44, 0.55)'); shade.addColorStop(1, 'rgba(20, 24, 44, 0)');
  g.fillStyle = shade; g.fillRect(0, 120, W, 560); g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 16; g.fillStyle = '#fffaf2';
  g.font = `600 24px ${SANS}`; g.letterSpacing = '6px'; g.fillText('TINY WORLDS · NO. 5', W / 2, 300);
  g.letterSpacing = '0px'; g.font = `italic 400 112px "Hoefler Text", Georgia, serif`; g.fillText('Yaowarat.', W / 2, 420);
  g.font = `400 34px ${SANS}`; g.fillText('A night market in Bangkok, from dusk to night.', W / 2, 490);
  g.restore();
};

const tuk = () => M().traffic[0]; // the blue tuk-tuk, heading east in the inside lane

export const SHOTS = [
  // 1 · dusk, on the centre line at the west end (the traffic passes either side), looking down the road as the first stalls open
  { start: () => { M().setMode('auto'); M().clock.t = 0; }, dur: 4,
    cam: move([[-33, 1.4, 0], [6, 3.0, 0]], [[-29.5, 1.5, 0], [6, 3.2, 0]], evening(4, 9)),
    draw: tag('Dusk on Yaowarat Road', '夕方のヤワラート通り') },
  // 2 · a moo ping grill smoking on the south pavement
  { dur: 4, cam: move([[-16.4, 2.0, 6.4], [-21, 1.0, 5.0]], [[-17.6, 1.7, 6.2], [-21, 1.0, 5.0]], evening(9, 13)),
    draw: tag('The grills are lit', '屋台に火が入る') },
  // 3 · looking up the shophouses as the signs come on, west to east
  { dur: 4, cam: move([[-26, 1.6, 3.2], [-8, 5.2, -7.2]], [[-22, 1.6, 3.4], [2, 5.0, -7.2]], evening(16, 40)),
    draw: tag('Neon, one sign at a time', 'ネオンがひとつずつ灯る') },
  // 4 · alongside a tuk-tuk in the traffic
  { start: () => { const c = tuk().userData.car; c.x = -18; }, dur: 4,
    cam: { fn: (u, P, T) => { M().clock.t = 41 + 4 * u; const p = tuk().position; P.set(p.x - 3.2 - u * 0.6, 1.5, p.z + 3.4); T.set(p.x + 1.4, 1.0, p.z); } },
    draw: tag('Tuk-tuk', 'トゥクトゥクが走る') },
  // 5 · through the arch into the lane of tents
  { dur: 4.5, cam: move([[9, 2.6, 3.6], [9, 1.9, 28]], [[9, 2.5, 15], [9, 1.7, 32]], evening(45, 52)),
    draw: tag('Through the arch', 'アーチの奥は テントの路地') },
  // 6 · the stage at the end of the lane
  { dur: 4, cam: move([[7.6, 2.6, 28.5], [9, 1.3, 39.2]], [[8.4, 2.1, 32.5], [9, 1.2, 39.2]], evening(53, 57)),
    draw: tag('Live music', '路地の奥の 小さな舞台') },
  // 7 · night: up from the road over the roofs to the whole market, and the name
  { dur: 5.5, cam: move([[9, 3.5, 9], [3, 1.5, -3]], [[-8, 40, 40], [3, 0, 3]], evening(60, 66)), draw: card },
];

export const run = (preview = false) => film({ name: 'yaowarat', shots: SHOTS, fov: 46, near: 0.2, far: 400, preview });

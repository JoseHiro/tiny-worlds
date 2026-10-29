// "Café life" as a 30-second vertical video, in English: no story, just the three cafés going about their day —
// a drizzly morning up north, a downpour in the old town, Barcelona from afternoon into night. Filmed from the plain
// café pages (cafe/nordic.html, wa.html, barcelona.html) and joined by film/make.sh. run(no) films café no;
// run(no, true) only the first and last frame of each shot.
import { film, FONT } from './film.js';

const k = () => window.__koto, sky = (w, look) => () => { window.__cafe.weather.hold(w); if (look) k().setLook(look); };
const fade = (ts, d, a = 0.5) => Math.min(1, ts / a) * Math.min(1, (d - ts) / a);
// the title over the first shot; the café's name and the weather at the top of each piece
function title(g, u, W, H, ts) {
  const a = fade(ts, 3.2);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(40, 30, 25, 0.45)'; g.shadowBlur = 26; g.fillStyle = '#fffaf0';
  g.font = `700 92px ${FONT}`; g.fillText('Three tiny cafés', W / 2, 400);
  g.font = `400 44px ${FONT}`; g.fillText('on a rainy day', W / 2, 490);
  g.restore();
}
const place = (name, sub) => (g, u, W, H, ts) => {
  g.save(); g.globalAlpha = Math.min(1, ts / 0.4) * 0.94; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 40px ${FONT}`; const w = Math.max(g.measureText(name).width, 300) + 80;
  g.fillStyle = 'rgba(255, 250, 240, 0.85)'; g.beginPath(); g.roundRect((W - w) / 2, 140, w, 120, 36); g.fill();
  g.fillStyle = '#4a3a30'; g.fillText(name, W / 2, 180);
  g.fillStyle = '#8a7462'; g.font = `400 30px ${FONT}`; g.fillText(sub, W / 2, 226);
  g.restore();
};
// the end: a question to the viewer over the floodlit towers
function end(g, u, W, H, ts) {
  const a = Math.min(1, Math.max(0, (ts - 0.6) / 0.6));
  g.save(); g.fillStyle = `rgba(20, 22, 40, ${0.45 * a})`; g.fillRect(0, 0, W, H);
  g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fffaf0';
  g.shadowColor = 'rgba(0, 0, 0, 0.4)'; g.shadowBlur = 20;
  g.font = `700 70px ${FONT}`; g.fillText('Which café', W / 2, 820); g.fillText('would you sit in?', W / 2, 910);
  g.font = `400 36px ${FONT}`; g.fillText('1 · Stilla Kaffe    2 · Ametsuchi    3 · de la Plaça', W / 2, 1040);
  g.font = `600 34px ${FONT}`; g.globalAlpha = a * 0.85; g.fillText('Tiny Worlds', W / 2, 1640);
  g.restore();
};
const both = (...fs) => (...a) => fs.forEach((f) => f(...a));

export const SHOTS = {
  1: [ // Stilla Kaffe: the rain on the window, the long table, the baristas, the cat
    { skip: 10, start: sky('drizzle', 'morning'), dur: 3.4, cam: { from: [[-2.6, 1.9, 9.6], [-2.6, 1.4, 3.9]], to: [[-2.6, 1.75, 7.8], [-2.6, 1.35, 3.9]] }, draw: both(title, place('Stilla Kaffe', 'a drizzly morning up north')) },
    { skip: 2, dur: 3.0, cam: { from: [[0.2, 2.3, 2.9], [-2.4, 0.7, 0.2]], to: [[-0.3, 2.0, 2.4], [-2.4, 0.7, 0.2]] }, cap: ['Homework and lattes'] },
    { skip: 2, dur: 3.0, cam: { from: [[2.4, 2.1, 0.4], [2.6, 1.1, -4.2]], to: [[2.6, 1.9, -0.4], [2.6, 1.1, -4.2]] }, cap: ['Ordering at the counter'] },
  ],
  2: [ // Ametsuchi: the downpour in the alley, the tatami room, the little garden
    { skip: 10, start: sky('rain'), dur: 3.4, cam: { from: [[5.4, 1.7, 10.2], [-1.2, 1.6, 4]], to: [[4.4, 1.6, 8.8], [-1.2, 1.6, 4]] }, draw: place('Kissa Ametsuchi', 'a downpour in the old town') },
    { skip: 2, dur: 3.0, cam: { from: [[-0.4, 2.4, 1.6], [-3.6, 0.5, -1.8]], to: [[-0.9, 2.1, 0.9], [-3.6, 0.5, -1.8]] }, cap: ['Matcha on the tatami'] },
    { skip: 2, dur: 3.2, start: sky('drizzle', 'dusk'), cam: { from: [[1.6, 1.7, -0.4], [0, 0.8, -7.5]], to: [[1.3, 1.5, -1.4], [0, 0.8, -7.5]] }, cap: ['Rain in the garden'] },
  ],
  3: [ // Cafè de la Plaça: the terrace in the sun, the counter, night on the towers
    { skip: 4, start: sky('clear', 'day'), dur: 3.4, cam: { from: [[139, 2.2, 8.2], [60, 22, 0.5]], to: [[137.5, 2.0, 7.4], [60, 24, 0.5]] }, draw: place('Cafè de la Plaça', 'Barcelona, after the rain') },
    { skip: 2, dur: 3.0, start: () => k().setLook('dusk'), cam: { from: [[128, 3.5, 20], [140, 1.2, 8]], to: [[129, 3.0, 18], [140, 1.2, 8]] }, cap: ['Cortados at golden hour'] },
    { skip: 2, dur: 4.6, start: () => k().setLook('night'), cam: { from: [[118, 3.5, 30], [60, 30, 0]], to: [[117, 3.7, 29.4], [60, 38, 0]] }, draw: end },
  ],
};
export const run = (no, preview = false) => film({ name: `cafes${no}`, shots: SHOTS[no], preview });

// "Pocket" films: one café as a small object on a plain table, 9:16, the camera slowly going round it while life
// goes on inside (the walls toward the camera are cut away). English text, set like a museum label.
// Open the plain page (cafe/nordic.html, wa.html, barcelona.html, airport/) and run(key); run(key, true) for the
// first and last frames only.
import { film } from './film.js';

const k = () => window.__koto;
const SERIF = '"Hoefler Text", "Baskerville", Georgia, serif', SANS = '"Avenir Next", "Helvetica Neue", sans-serif';
const INK = '#2e2a26', SOFT = '#8a8178';
// the label: a small kicker, the name big in italic, a few lines; "Tiny Worlds" at the foot
const label = ({ kicker, name, lines }) => (g, u, W, H, ts) => {
  g.save(); g.globalAlpha = Math.min(1, ts / 0.8); g.textBaseline = 'alphabetic';
  g.fillStyle = SOFT; g.font = `600 24px ${SANS}`; g.letterSpacing = '4px'; g.fillText(kicker.toUpperCase(), 84, 210);
  g.letterSpacing = '0px'; g.fillStyle = INK; g.font = `italic 400 112px ${SERIF}`; g.fillText(name, 76, 330);
  g.fillStyle = SOFT; g.font = `400 32px ${SERIF}`; lines.forEach((l, i) => g.fillText(l, 84, 400 + i * 44));
  g.textAlign = 'center'; g.font = `600 22px ${SANS}`; g.letterSpacing = '5px'; g.fillText('TINY WORLDS', W / 2, H - 120);
  g.restore();
};
const set = (weather, look) => () => { window.__cafe.weather.hold(weather); k().setLook(look); };

export const POCKETS = {
  nordic: {
    bg: '#ece9e4', floor: [-1.62, 400],
    shots: [
      { start: set('drizzle', 'morning'), skip: 12, dur: 20, cam: { orbit: { center: [-1.2, -0.6, 2.0], radius: [128, 100], height: [84, 62], from: 0.8, to: -0.1 } }, draw: label({ kicker: 'Café studies · no. 1', name: 'Stilla Kaffe.', lines: ['A big corner café on a drizzly northern street.', 'Beans, buns, birches — and a cat on the sill.'] }) },
    ],
  },
  wa: {
    bg: '#ebe8e1', floor: [-1.62, 400],
    shots: [
      { start: set('rain', 'day'), skip: 12, dur: 20, cam: { orbit: { center: [0, -0.6, 0], radius: [124, 98], height: [80, 62], from: -0.8, to: 0.1 } }, draw: label({ kicker: 'Café studies · no. 2', name: 'Ametsuchi.', lines: ['A tea house in an old town, in a downpour.', 'Matcha on the tatami, rain in the garden.'] }) },
    ],
  },
  barcelona: {
    bg: '#ece9e4', floor: [-1.62, 4000], near: 150, far: 2500,
    shots: [
      { start: set('clear', 'day'), skip: 8, dur: 20, cam: { orbit: { center: [42, 30, -20], radius: [1000, 890], height: [560, 480], from: 1.15, to: 1.95 } }, draw: label({ kicker: 'Café studies · no. 3', name: 'de la Plaça.', lines: ['A terrace café on a square in Barcelona, across the', 'pond from the basilica; flats, shops and a tree-lined avenue.'] }) },
    ],
  },
  airport: {
    bg: '#ece9e4', floor: [-4.88, 4000], near: 200, far: 2500,
    shots: [
      { start: () => { window.__airport.setTod('day'); window.__airport.setView('f2'); }, skip: 6, dur: 20, cam: { orbit: { center: [0, -6, 14], radius: [700, 640], height: [720, 640], from: -0.25, to: 0.25 } }, draw: label({ kicker: 'Tiny Worlds · no. 4', name: 'Mini Airport.', lines: ['A small airport that keeps its own clock.', 'Planes, bags and travellers, all day long.'] }) },
    ],
  },
};
// the airport has a stage of its own: film it through the same hooks as the café pages
function stage() {
  const A = window.__airport;
  if (!A || window.__koto) return;
  A.composer.setPixelRatio(1); A.composer.setSize(1080, 1920);
  window.__koto = { renderer: A.renderer, scene: A.scene, camera: A.camera, tick: A.tick, render: A.render };
}
export const run = (key, preview = false) => { stage(); return film({ name: `pocket-${key}`, fov: 30, ...POCKETS[key], preview }); };

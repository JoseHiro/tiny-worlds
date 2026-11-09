// "Okinawa blue": the sea off Naha, 9:16, about 45 seconds and no story: straight down over the block and the reef edge
// like a drone, the beach, the turtle, the garden eels, the clownfish, dolphins leaping, the whale shark through the cut
// face, then a pull back with the name. Captions are a lower third of their own (say), not film.js's rounded box. Open naha/ and run (await import('/film/naha.js')).run(); run(true) for the first and last frames only.
import * as THREE from 'three';
import { film, nameCard } from './film.js';

const N = () => window.__naha;
const SANS = '"Avenir Next", "Helvetica Neue", sans-serif';
const glass = (a) => { N().shared.uCutAlpha.value = a; };
const pass = (i, along, dir = 1) => { const e = N().sea.events[i]; e.run = along; e.wait = 0; e.dir = dir; e.pod.visible = true; e.pod.position.x = -dir * 57 + dir * along; }; // (a passer already this far along its way)
const card = nameCard(2, 'Okinawa blue.'); // the name in the sky (film.js: every film ends on it)
const track = (i, ox, y, z, ty) => (u, P, T) => { const x = N().sea.events[i].pod.position.x; P.set(x + ox, y, z); T.set(x, ty, -26.6); }; // (alongside a passer)
const sky = () => { // a tropical sky behind the block (the page's is pale, for its panel)
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  const v = g.createLinearGradient(0, 0, 0, 512); v.addColorStop(0, '#2f9fe0'); v.addColorStop(0.6, '#8fd6f2'); v.addColorStop(1, '#d9f3f7');
  g.fillStyle = v; g.fillRect(0, 0, 256, 512);
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.filter = 'blur(7px)';
  for (const [x, y, w, h] of [[40, 90, 70, 12], [80, 80, 50, 14], [190, 170, 80, 12], [225, 160, 40, 12], [20, 250, 60, 8], [150, 300, 90, 8]]) { g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
// a lower third: a small spaced label over a short line, then the words, sliding up as they come in and fading at the end
// (bottom left, above the app's own buttons and caption, clear of its column of icons on the right)
const say = (kick, text) => (g, u, W, H, ts, dur = 4) => {
  const a = Math.min(1, Math.max(0, (ts - 0.25) / 0.5)) * Math.min(1, (1 - u) * 8), e = 1 - (1 - a) ** 3, x = 84, y = H - 470 + (1 - e) * 36;
  g.save(); g.globalAlpha = a; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const sc = g.createLinearGradient(0, H - 720, 0, H); sc.addColorStop(0, 'rgba(2,28,52,0)'); sc.addColorStop(0.55, 'rgba(2,28,52,0.38)'); sc.addColorStop(1, 'rgba(2,28,52,0.5)');
  g.fillStyle = sc; g.fillRect(0, H - 720, W, 720); // (a soft dark wash under the words: the sand and the lagoon are pale)
  g.shadowColor = 'rgba(2,30,60,0.55)'; g.shadowBlur = 22; g.shadowOffsetY = 3;
  g.font = `700 30px ${SANS}`; g.letterSpacing = '10px'; g.fillStyle = '#d6fbff'; g.fillText(kick, x, y);
  g.shadowBlur = 0; g.fillStyle = '#5fe8e0'; g.fillRect(x, y + 22, 64 * e, 4); // (the line draws itself out)
  g.shadowBlur = 22; g.letterSpacing = '0px'; g.font = `700 78px ${SANS}`; const fit = Math.min(78, 78 * 800 / g.measureText(text).width); g.font = `700 ${fit}px ${SANS}`; /* (narrower for long lines: clear of the app's icons on the right) */ g.fillStyle = '#ffffff'; g.fillText(text, x - 3, y + 104);
  g.restore();
};
// straight down from h over (x, z), turned so the block's long side runs up the screen (the beach on the right, the deep
// on the left): the eye sits a hair toward −x of its target, and lookAt takes that as which way is up
const drone = (x, z, h0, h1, dx = 0) => (u, P, T) => { const k = u * u * (3 - 2 * u), cx = x + dx * k; T.set(cx, -1, z); P.set(cx - 0.02, h0 + (h1 - h0) * k, z); };
const turtle = (u, P, T) => { const p = N().sea.turtle.position; P.set(p.x + 2.6, 1.5, p.z + 3.4); T.set(p.x, p.y + 0.1, p.z); };

export const SHOTS = [
  { start: () => glass(0.86), dur: 5, cam: { fn: drone(0, -1, 140, 104, 6) }, draw: say('BUILT WITH CLAUDE', 'The sea off Okinawa') },
  { dur: 4.5, cam: { fn: drone(-6, -19, 38, 28, 10) }, draw: say('THE REEF EDGE', 'Turquoise meets deep blue') },
  { dur: 4, cam: { from: [[-10, 3.2, 27], [-4, 0, 8]], to: [[-9, 2.4, 22], [-4, 0, 7]] }, draw: say('THE LAGOON', 'Water you can see through') },
  { dur: 4.5, cam: { fn: turtle }, draw: say('GREEN TURTLE', 'Comes in to graze') },
  { dur: 4, cam: { from: [[-27.5, 3.2, 7], [-30.5, -0.9, 1]], to: [[-28.5, 2.4, 5.5], [-30.5, -0.9, 1]] }, draw: say('GARDEN EELS', 'Swaying in the sand') },
  { start: () => { N().shared.uWave.value = 0.25; }, dur: 4, cam: { from: [[-15.5, 1.8, -8], [-18, -1, -10.2]], to: [[-16.2, 1.3, -8.8], [-18, -1, -10.2]] }, draw: say('CLOWNFISH', 'At home in the anemone') },
  { start: () => { N().shared.uWave.value = 1; pass(0, 56); }, dur: 5, cam: { fn: track(0, 2, 5, -15, -1.2) }, draw: say('OPEN SEA', 'A pod of dolphins') },
  { start: () => { pass(1, 48); glass(0.32); }, dur: 6, cam: { fn: track(1, 1, -3.6, -56, -4.6) }, draw: say('WHALE SHARK', 'Slowly passing by') },
  { start: () => glass(0.86), dur: 6, cam: { from: [[0, 14, 60], [0, -2, 4]], to: [[0, 108, 108], [0, 9, -6]] }, draw: card },
];

export async function run(preview = false) {
  const r = N();
  r.renderer.setPixelRatio(1); r.size(1080, 1920);
  r.scene.background = sky();
  const w = r.water.material.uniforms; // (for the film: a bluer, clearer sea than the page's soft pastel)
  w.cShallow.value.set('#22d6d0'); w.cMid.value.set('#0aa5cf'); w.cDeep.value.set('#064e94'); w.cSky.value.set('#7ccbea'); w.uClarity.value = 0.78;
  r.shared.uCaustic.value = 1.5;
  window.__koto = { renderer: r.renderer, camera: r.camera, scene: r.scene, tick: (dt) => { if (dt) r.step(dt); }, render: r.draw, people: [] };
  return film({ name: preview ? 'okinawa' : 'okinawa1', shots: SHOTS, fov: 32, near: 0.1, far: 600, preview });
}

// "Okinawa blue": the sea off Naha, 9:16, about 35 seconds and no story: the block of sea, the beach, the turtle, the
// garden eels, the clownfish, the reef edge, dolphins leaping, the whale shark through the cut face, then a pull back
// with the name. Open naha/ and run (await import('/film/naha.js')).run(); run(true) for the first and last frames only.
import * as THREE from 'three';
import { film } from './film.js';

const N = () => window.__naha;
const SANS = '"Avenir Next", "Helvetica Neue", sans-serif';
const glass = (a) => { N().shared.uCutAlpha.value = a; };
const pass = (i, along, dir = 1) => { const e = N().sea.events[i]; e.run = along; e.wait = 0; e.dir = dir; e.pod.visible = true; e.pod.position.x = -dir * 57 + dir * along; }; // (a passer already this far along its way)
const card = (g, u, W, H, ts) => { // the name in the pale sky
  const a = Math.min(1, Math.max(0, (ts - 1.8) / 0.8));
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(6,60,110,0.6)'; g.shadowBlur = 16;
  g.font = `600 24px ${SANS}`; g.letterSpacing = '6px'; g.fillText('TINY WORLDS · NO. 2', W / 2, 300);
  g.letterSpacing = '0px'; g.font = `italic 400 124px "Hoefler Text", Georgia, serif`; g.fillText('Okinawa blue.', W / 2, 430);
  g.font = `400 34px ${SANS}`; g.fillText('Made with Claude Opus 5.5', W / 2, 505);
  g.restore();
};
const track = (i, ox, y, z, ty) => (u, P, T) => { const x = N().sea.events[i].pod.position.x; P.set(x + ox, y, z); T.set(x, ty, -26.6); }; // (alongside a passer)
const sky = () => { // a tropical sky behind the block (the page's is pale, for its panel)
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  const v = g.createLinearGradient(0, 0, 0, 512); v.addColorStop(0, '#2f9fe0'); v.addColorStop(0.6, '#8fd6f2'); v.addColorStop(1, '#d9f3f7');
  g.fillStyle = v; g.fillRect(0, 0, 256, 512);
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.filter = 'blur(7px)';
  for (const [x, y, w, h] of [[40, 90, 70, 12], [80, 80, 50, 14], [190, 170, 80, 12], [225, 160, 40, 12], [20, 250, 60, 8], [150, 300, 90, 8]]) { g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const turtle = (u, P, T) => { const p = N().sea.turtle.position; P.set(p.x + 2.6, 1.5, p.z + 3.4); T.set(p.x, p.y + 0.1, p.z); };

export const SHOTS = [
  { start: () => glass(0.86), dur: 5, cam: { from: [[0, 92, 82], [0, -3, 0]], to: [[0, 68, 62], [0, -3, 2]] }, cap: ['The sea off Naha, Okinawa'] },
  { dur: 4, cam: { from: [[-10, 3.2, 27], [-4, 0, 8]], to: [[-9, 2.4, 22], [-4, 0, 7]] }, cap: ['Water you can see through'] },
  { dur: 4.5, cam: { fn: turtle }, cap: ['A turtle comes to graze'] },
  { dur: 4, cam: { from: [[-27.5, 3.2, 7], [-30.5, -0.9, 1]], to: [[-28.5, 2.4, 5.5], [-30.5, -0.9, 1]] }, cap: ['Garden eels in the sand'] },
  { start: () => { N().shared.uWave.value = 0.25; }, dur: 4, cam: { from: [[-15.5, 1.8, -8], [-18, -1, -10.2]], to: [[-16.2, 1.3, -8.8], [-18, -1, -10.2]] }, cap: ['Clownfish at home'] },
  { start: () => { N().shared.uWave.value = 1; }, dur: 4, cam: { from: [[-2, 8, -5], [0, -6, -30]], to: [[0, 5.5, -13], [0, -7, -30]] }, cap: ['The reef falls away to deep blue'] },
  { start: () => pass(0, 56), dur: 5, cam: { fn: track(0, 2, 5, -15, -1.2) }, cap: ['Dolphins passing'] },
  { start: () => { pass(1, 48); glass(0.32); }, dur: 6, cam: { fn: track(1, 1, -3.6, -56, -4.6) }, cap: ['And a whale shark, slowly'] },
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

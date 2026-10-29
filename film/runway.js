// "Runway 09": takeoffs and landings at the Mini Airport, 9:16, about 33 seconds. One arrival is followed from final
// approach to the stand (with the line mechanic's walk-round and the hangar on the way), then a departure is watched
// from the runway edge as it rolls, lifts off and climbs away into the evening.
// Open airport/ and run (await import('/film/runway.js')).run(); run(true) for the first and last frames only.
import * as THREE from 'three';
import { film } from './film.js';

const A = () => window.__airport;
const SANS = '"Avenir Next", "Helvetica Neue", sans-serif', JP = '"Hiragino Sans", sans-serif';
const flights = () => A().world.flights;
const at = (f) => f.root.position;
let lander = null, leaver = null, stand = null;

// a small two-line tag in the top-left: English kicker over a Japanese line; fades in and out with the shot
const tag = (en, ja) => (g, u, W, H, ts) => {
  const a = Math.min(1, ts / 0.5, (1 - u) * 8);
  g.save(); g.globalAlpha = Math.max(0, a); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 12;
  g.fillStyle = '#fffaf2'; g.font = `600 26px ${SANS}`; g.letterSpacing = '5px'; g.fillText(en.toUpperCase(), 80, 200);
  g.letterSpacing = '0px'; g.font = `600 58px ${JP}`; g.fillText(ja, 76, 276);
  g.restore();
};
// the closing card: the name, and what it was
const card = (g, u, W, H, ts) => {
  const a = Math.min(1, ts / 0.8);
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 14; g.fillStyle = '#fffaf2';
  g.font = `600 24px ${SANS}`; g.letterSpacing = '6px'; g.fillText('TINY WORLDS · NO. 4', W / 2, 300);
  g.letterSpacing = '0px'; g.font = `italic 400 112px "Hoefler Text", Georgia, serif`; g.fillText('Runway 09.', W / 2, 420);
  g.font = `400 34px ${SANS}`; g.fillText('Takeoffs and landings at the Mini Airport.', W / 2, 490);
  g.restore();
};

// eye P and target T around a flight: offset in the aircraft's own frame (x forward, y up, z to its right)
const around = (f, [fx, fy, fz], [lx, ly, lz] = [0, 1.5, 0]) => (P, T) => {
  const p = at(f), h = f.heading ?? 0, c = Math.cos(h), s = Math.sin(h);
  const w = (x, y, z) => [p.x + x * c + z * s, p.y + y, p.z - x * s + z * c];
  P.set(...w(fx, fy, fz)); T.set(...w(lx, ly, lz));
};
const lerp3 = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
const ease = (t) => t * t * (3 - 2 * t);

export const SHOTS = [
  // 1 · final approach, from the grass beside the threshold: the aircraft comes down at us and touches down
  { start: () => { A().setTod('day'); lander = null; },
    until: () => (lander = flights().find((f) => f.state === 'approach' && at(f).x > -152)),
    dur: 5, cam: { fn: (u, P, T) => { P.set(-71, 1.3, -21.5); T.copy(at(lander)).add(new THREE.Vector3(0, 1.4, 0)); } },
    draw: tag('Final approach', '着陸まで あと少し') },
  // 2 · the rollout, chased from behind and to the right
  { dur: 4.5, cam: { fn: (u, P, T) => around(lander, lerp3([-15, 4.5, 10], [-11, 3, 8], ease(u)), [6, 1.2, 0])(P, T) },
    draw: tag('Touchdown', '接地') },
  // 3 · at the stand: the line mechanic looks the aircraft over (DESIGN.md §12.2)
  { until: () => lander.state === 'parked' && lander.stand.mech.ud.mode === 'inspect',
    dur: 4, cam: { fn: (u, P, T) => { const s = lander.stand; P.set(...lerp3([s.x - 13, 9, 4], [s.x - 10.5, 5, 3], ease(u))); T.set(s.x - 2.2, 1.0, -1.8); } },
    draw: tag('Walk-round', '出発前の点検') },
  // 4 · meanwhile in the hangar
  { dur: 3.5, cam: { from: [[-79, 9.5, 19], [-98, 1.5, 3]], to: [[-83, 8, 16.5], [-98.5, 1.5, 3]] },
    draw: tag('Hangar 1', '格納庫では 整備中') },
  // 5 · evening: a departure rolls down the runway and lifts off right in front of us
  { start: () => { A().setTod('dusk'); leaver = null; },
    until: () => (leaver = flights().find((f) => f.state === 'takeoff' && at(f).x > -79.5)),
    dur: 6, cam: { fn: (u, P, T) => { P.set(-34, 0.9, -23.2); T.copy(at(leaver)).add(new THREE.Vector3(2, 1.6, 0)); } },
    draw: tag('Takeoff', '離陸') },
  // 6 · the climb, chased from below and behind
  { dur: 5, cam: { fn: (u, P, T) => around(leaver, lerp3([-14, -1.5, 7], [-22, -4, 10], ease(u)), [8, 1, 0])(P, T) },
    draw: tag('Climb out', '上昇') },
  // 7 · the whole field from high up as it flies off, and the name
  { dur: 5, cam: { from: [[-30, 42, 112], [5, 0, -12]], to: [[0, 46, 118], [15, 0, -14]] }, draw: card },
];

// the airport is filmed through the same hooks as the café pages (see film/pocket.js)
function stage() {
  const a = A();
  if (!a || window.__koto) return;
  a.composer.setPixelRatio(1); a.composer.setSize(1080, 1920);
  window.__koto = { renderer: a.renderer, scene: a.scene, camera: a.camera, tick: a.tick, render: a.render };
}
export const run = (preview = false) => { stage(); return film({ name: 'runway', shots: SHOTS, fov: 34, near: 0.4, far: 2000, preview }); };

// "Two views": the Mini Airport as a 9:16 split screen. Top: close up, quick cuts between everyday corners (check-in,
// security, the café, a turnaround, boarding at a gate, the hangar), and whenever an aircraft lands or takes off the top
// cuts to it and follows it. Bottom: the whole airport turning slowly, with a ring on the close-up, tags on the aircraft
// that are moving, and the clock and the day's counts. One world, one clock, filmed with two cameras each frame.
// Open airport/ and run (await import('/film/split.js')).run(); run(true) for the first and last frames of each scene.
import * as THREE from 'three';
import { airplane, LIVERIES } from '../airport/src/parts.js';

const A = () => window.__airport;
const SANS = '"Avenir Next", "Helvetica Neue", sans-serif';
const W = 1080, H = 1920, PH = H / 2, FPS = 30, LENGTH = 30;
const ease = (t) => t * t * (3 - 2 * t);
const lerp3 = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
const flights = () => A().world.flights;
const pos = (f) => f.root.position;

// eye and target around a flight: offset in the aircraft's own frame (x forward, y up, z to its right); see runway.js
const around = (f, [fx, fy, fz], [lx, ly, lz]) => {
  const p = pos(f), h = f.heading ?? 0, c = Math.cos(h), s = Math.sin(h);
  const w = (x, y, z) => [p.x + x * c + z * s, p.y + y, p.z - x * s + z * c];
  return [w(fx, fy, fz), w(lx, ly, lz)];
};

// the everyday corners, taken in turn: eye from → to, looking at a point; s is a stand picked when the cut starts
// the stand whose turnaround began most recently (services under way, nowhere near pushback), so it stays busy for the cut
const parked = () => A().world.stands.filter((s) => s.flight?.state === 'parked').sort((a, b) => (a.flight.t < 3) - (b.flight.t < 3) || a.flight.t - b.flight.t)[0] ?? A().world.stands[2];
const boarding = () => A().world.stands.filter((s) => s.flight?.state === 'parked').sort((a, b) => Math.abs(a.flight.t - 22) - Math.abs(b.flight.t - 22))[0] ?? A().world.stands[1];
const still = (look, from, to) => (s) => { const v = (x) => (typeof x === 'function' ? x(s) : x); const L = v(look), F = v(from), T = v(to); return (u) => [lerp3(F, T, ease(u)), L]; };
export const LIFE = [
  { en: 'Check-in', shot: still([-53.5, 3.4, 35], [-44, 11, 46.5], [-47.5, 8.5, 44]) },
  { en: 'Security', shot: still([-23.5, 3.4, 35], [-15, 10, 45.5], [-18, 8, 43.5]) },
  { en: 'Turnaround', pick: parked, shot: still((s) => [s.x + 1, 1.2, -3], (s) => [s.x + 15, 9, 9], (s) => [s.x + 12, 6.5, 5.5]) },
  { en: 'The café', shot: still([-8.5, 3.4, 35], [-1, 9.5, 45], [-3.5, 7.5, 43]) },
  { en: 'Boarding', pick: boarding, shot: still((s) => [s.x - 7.7, 3.4, 21.1], (s) => [s.x - 0.5, 11.5, 31], (s) => [s.x - 3, 9, 28.5]) },
  { en: 'Hangar 1', shot: still([-98.5, 1.2, 4], [-101.5, 10, 25], [-101.5, 8, 21]) },
];
const LIFE_DUR = 3, PLANE_DUR = 6;

// the runway, when something is happening on it: a chase down to touchdown, or a pass-by from the edge as one lifts off
function runwayCut(seen) {
  const lander = flights().find((f) => f.state === 'approach' && pos(f).x > -150 && !seen.has(f));
  if (lander) return { en: 'Landing', f: lander, shot: () => (u) => around(lander, lerp3([-16, 5, 11], [-12, 3, 9], ease(u)), [8, 0.8, 0]) };
  const leaver = flights().find((f) => (f.state === 'lineup' || (f.state === 'takeoff' && f.v < 4)) && !seen.has(f));
  if (leaver) {
    const x0 = -80 + 40, z = -30 + 8; // LINEUP_X, RUNWAY.z (airport/src/layout.js)
    return { en: 'Takeoff', f: leaver, shot: () => (u) => [[x0 - 4 * u, 1.1, z], [pos(leaver).x + 3, pos(leaver).y + 1.6, pos(leaver).z]] };
  }
  return null;
}

// traffic overhead, for the film only: aircraft circling the field at height, waiting for their turn or passing by.
// The models are built once and kept (materials are shared with the airport's own aircraft); they leave the scene after.
const SKY = [ // circle centre x, z, radius, height, speed (units/s, + anticlockwise), start angle, livery
  { cx: 10, cz: -15, r: 110, y: 20, v: 15, a0: 2.4, livery: 'lagoon' },
  { cx: 30, cz: -10, r: 75, y: 15, v: -13, a0: -0.6, livery: 'sunrise' },
  { cx: -20, cz: -15, r: 130, y: 26, v: 16, a0: 0.4, livery: 'midnight' },
];
let sky = null;
function flySky(t) {
  for (const [i, p] of SKY.entries()) {
    const a = p.a0 + (p.v / p.r) * t, s = Math.sign(p.v);
    const m = sky[i];
    m.position.set(p.cx + p.r * Math.cos(a), p.y, p.cz + p.r * Math.sin(a));
    // heading along the circle (sim convention: atan2(-dz, dx)), banked into the turn
    m.rotation.set(-s * 0.32, Math.atan2(-Math.cos(a) * s, -Math.sin(a) * s), 0, 'YXZ');
  }
}

// moving aircraft on the whole view get a small tag
const TAGS = { approach: 'Arriving', landing: 'Landed', takeoff: 'Departing', lineup: 'Departing', pushback: 'Pushback', };
const clockText = (min) => { const m = Math.floor(min) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

function tag(g, kicker, en, a) { // top-left of the top pane, in English
  g.save(); g.globalAlpha = a; g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 12; g.fillStyle = '#fffaf2';
  g.font = `600 24px ${SANS}`; g.letterSpacing = '5px'; g.fillText(kicker.toUpperCase(), 64, 92);
  g.letterSpacing = '0px'; g.font = `600 58px ${SANS}`; g.fillText(en, 60, 160);
  g.restore();
}
function board(g, clock, dep, arr) { // top-left of the bottom pane: the time, and today's counts
  g.save(); g.fillStyle = '#2e2a26'; g.font = `600 52px ${SANS}`; g.fillText(clockText(clock), 60, PH + 92);
  g.font = `600 22px ${SANS}`; g.letterSpacing = '4px'; g.fillStyle = '#6b6259';
  g.fillText(`${dep} DEPARTURES · ${arr} ARRIVALS`, 64, PH + 130);
  g.restore();
}
function title(g) { // foot of the bottom pane
  g.save(); g.textAlign = 'center'; g.fillStyle = '#2e2a26';
  g.font = `600 22px ${SANS}`; g.letterSpacing = '6px'; g.fillText('TINY WORLDS · NO. 4', W / 2, H - 150);
  g.letterSpacing = '0px'; g.font = `italic 400 76px "Hoefler Text", Georgia, serif`; g.fillText('Mini Airport.', W / 2, H - 80);
  g.restore();
}
function ring(g, x, y, k, label) { // where the close-up is, on the whole view
  g.save(); g.strokeStyle = '#fffaf2'; g.lineWidth = 5; g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 10;
  const r = 30 + Math.sin(k * Math.PI * 2) * 4;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fffaf2'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
  g.font = `600 30px ${SANS}`; g.textAlign = 'center'; g.fillText(label, x, y - r - 18);
  g.restore();
}
function pill(g, x, y, text, hot) { // a tag over a moving aircraft
  g.save(); g.font = `600 20px ${SANS}`; g.letterSpacing = '2px';
  const w = g.measureText(text.toUpperCase()).width + 22;
  g.fillStyle = hot ? '#e8553d' : 'rgba(46,42,38,0.78)';
  g.beginPath(); g.roundRect(x - w / 2, y - 52, w, 30, 15); g.fill();
  g.beginPath(); g.moveTo(x - 6, y - 23); g.lineTo(x + 6, y - 23); g.lineTo(x, y - 15); g.fill();
  g.fillStyle = '#fffaf2'; g.textAlign = 'center'; g.fillText(text.toUpperCase(), x + 1, y - 30);
  g.restore();
}

export async function run(preview = false) {
  const a = A(), w = a.world, { renderer, camera, composer } = a;
  renderer.setAnimationLoop(null);
  renderer.setPixelRatio(1); renderer.setSize(W, PH, false);
  composer.setPixelRatio(1); composer.setSize(W, PH);
  camera.fov = 32; camera.aspect = W / PH; camera.clearViewOffset();
  a.setTod('day');
  // start as a departure lines up: the takeoff comes first, then the next arrival lands behind it
  for (let i = 0; i < 6 * 20; i++) a.tick(1 / 20);
  for (let i = 0; i < 20 * 600 && !flights().some((f) => f.state === 'lineup'); i++) a.tick(1 / 20);
  // and a busy apron: an aircraft part-way through its turnaround on every empty stand but one (kept for the next arrival)
  w.stands.filter((s) => !s.flight).slice(1).forEach((s, i) => w.spawnParked(s, 2 + i * 6));
  for (let i = 0; i < 20; i++) a.tick(1 / 20);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const g = out.getContext('2d');
  const P = new THREE.Vector3();
  sky ??= SKY.map((p) => airplane(LIVERIES[p.livery]));
  for (const m of sky) a.scene.add(m);
  const shoot = (eye, look, near, far) => {
    camera.near = near; camera.far = far; camera.updateProjectionMatrix();
    camera.position.set(...eye); camera.lookAt(...look);
    a.setView('f2'); a.tick(0); a.render();
  };
  const onScreen = (v) => { P.copy(v).project(camera); return P.z < 1 && Math.abs(P.x) < 1.1 && Math.abs(P.y) < 1.1 ? [(P.x + 1) / 2 * W, PH + (1 - P.y) / 2 * PH] : null; };
  let n = 0, sent = [], time = 0, life = 0, cut = 0;
  const seen = new Set();
  while (time < LENGTH) {
    const plane = runwayCut(seen);
    const sc = plane ?? LIFE[life++ % LIFE.length];
    if (plane) seen.add(plane.f);
    const shot = sc.shot(sc.pick?.()), frames = (plane ? PLANE_DUR : LIFE_DUR) * FPS;
    for (let f = 0; f < frames; f++) {
      if (f || cut) { a.tick(1 / FPS); w.spawnTimer = Math.min(w.spawnTimer, 1.5); } // busier than usual: arrivals as soon as the runway allows
      if (preview && f && f !== frames - 1) continue;
      const u = f / (frames - 1), tt = (time + f / FPS) / LENGTH;
      // top: the close-up
      flySky(time + f / FPS);
      const [eye, look] = shot(u);
      shoot(eye, look, 0.3, 900);
      g.drawImage(renderer.domElement, 0, 0);
      // bottom: the whole airport, a slow quarter turn over the film
      const ang = -0.55 + tt * 0.9;
      shoot([Math.sin(ang) * 255, 190, 14 + Math.cos(ang) * 255], [0, -6, 8], 40, 1200);
      g.drawImage(renderer.domElement, 0, PH);
      for (const fl of flights()) {
        const label = TAGS[fl.state];
        if (!label || fl === sc.f) continue;
        const at = onScreen(new THREE.Vector3(pos(fl).x, pos(fl).y + 3, pos(fl).z));
        if (at && at[1] > PH + 160) pill(g, at[0], at[1], label, label === 'Arriving' || label === 'Departing');
      }
      const target = sc.f ? new THREE.Vector3(pos(sc.f).x, pos(sc.f).y + 1, pos(sc.f).z) : new THREE.Vector3(...look);
      const at = onScreen(target);
      if (at) ring(g, at[0], at[1], f / FPS / 1.6, sc.en);
      board(g, w.clock, w.stats.departures, w.stats.arrivals);
      // the seam, the labels
      g.fillStyle = '#fffaf2'; g.fillRect(0, PH - 3, W, 6);
      tag(g, plane ? 'On the runway' : 'A day at the airport', sc.en, Math.max(0, Math.min(1, (f / FPS) / 0.3, (frames - f) / FPS / 0.25)));
      title(g);
      const blob = await new Promise((r) => out.toBlob(r, 'image/jpeg', 0.92));
      const id = preview ? `${String(cut).padStart(2, '0')}-${f ? 'b' : 'a'}` : String(n++).padStart(5, '0');
      sent.push(fetch(`/__film/${preview ? 'split-preview' : 'split'}/${id}`, { method: 'POST', body: blob }));
      if (sent.length > 6) { await Promise.all(sent); sent = []; }
    }
    time += frames / FPS; cut++;
  }
  await Promise.all(sent);
  for (const m of sky) a.scene.remove(m);
  return { frames: n, cuts: cut };
}

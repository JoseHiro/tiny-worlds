// "Yaowarat, two views": the night market as a 9:16 split screen (as film/split.js does the airport). Top: close up,
// quick cuts along the evening — the road at dusk, a grill, the signs coming on, a scooter weaving through the traffic,
// the packed pavement, into the tent lane, a stall, the stage, and up over the roofs once it is night. Bottom: the
// whole market turning slowly, a ring on where the close-up is, the time and how many stalls are open. One world, one
// clock, filmed with two cameras each frame; the evening (two minutes on the page) is pressed into thirty seconds.
// Open bangkok/ and run (await import('/film/yaowarat-split.js')).run(); run(true) for the first and last frames of each cut.
import * as THREE from 'three';

const K = () => window.__koto, M = () => window.__market;
const SANS = '"Avenir Next", "Helvetica Neue", sans-serif', JP = '"Hiragino Sans", sans-serif';
const W = 1080, H = 1920, PH = H / 2, FPS = 30;
const ease = (t) => t * t * (3 - 2 * t);
const lerp3 = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
const move = (from, to) => (u) => { const e = ease(u); return [lerp3(from[0], to[0], e), lerp3(from[1], to[1], e)]; };

// the evening's clock against film time: dusk at the start, the signs coming on through the third cut, night by the lane
const CLOCK = [[0, 2], [6.5, 14], [10.5, 38], [30, 64]];
const clockAt = (s) => { const i = CLOCK.findIndex(([t]) => t > s); if (i < 0) return CLOCK.at(-1)[1]; const [t0, c0] = CLOCK[i - 1], [t1, c1] = CLOCK[i]; return c0 + ((c1 - c0) * (s - t0)) / (t1 - t0); };
const timeText = (t) => { const m = 18 * 60 + Math.round(t * 1.5); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; }; // (the page's evening: 18:00 → 19:30)

const bike = () => M().traffic[6]; // a scooter heading east, weaving
export const CUTS = [
  { en: 'Dusk on Yaowarat Road', ja: '夕方のヤワラート通り', dur: 3.5, cam: move([[-31, 1.9, 0.2], [6, 3.2, 0]], [[-27.5, 2.0, 0.2], [6, 3.4, 0]]) },
  { en: 'The grills are lit', ja: '屋台に火が入る', dur: 3, cam: move([[-17.4, 2.5, 5.7], [-21, 1.0, 4.7]], [[-18.4, 2.2, 5.5], [-21, 1.0, 4.7]]) },
  { en: 'Neon, one sign at a time', ja: 'ネオンがひとつずつ灯る', dur: 4, cam: move([[-26, 1.6, 3.0], [-8, 5.2, -7.2]], [[-22, 1.6, 3.0], [2, 5.0, -7.2]]) },
  { en: 'Nobody keeps to a lane', ja: '車線なんて気にしない', dur: 3.5, start: () => { bike().userData.car.x = -20; },
    cam: () => { const p = bike().position; return [[p.x - 3.6, 1.8, p.z + 1.7], [p.x + 4, 0.7, p.z]]; }, at: () => bike().position },
  { en: 'Shoulder to shoulder', ja: '歩道は人でいっぱい', dur: 3, cam: move([[-31, 3.1, 6.6], [-18, 0.9, 6.5]], [[-27.5, 3.0, 6.6], [-15, 0.9, 6.5]]) },
  { en: 'Through the arch', ja: 'アーチの奥は テントの路地', dur: 4, cam: move([[9, 2.6, 3.6], [9, 1.9, 28]], [[9, 2.5, 14], [9, 1.7, 32]]) },
  { en: 'Fried insects, anyone?', ja: '虫の揚げ物も', dur: 3, cam: move([[9.3, 1.95, 12.6], [6.4, 1.0, 14.5]], [[8.8, 1.8, 13.4], [6.4, 1.0, 14.5]]) },
  { en: 'Live music', ja: '路地の奥の 小さな舞台', dur: 3, cam: move([[7.8, 2.5, 29.5], [9, 1.3, 39.2]], [[8.4, 2.1, 32.5], [9, 1.2, 39.2]]) },
  { en: 'Night on Yaowarat', ja: '夜のヤワラート', dur: 3, cam: move([[-4, 3.2, 0.4], [10, 4, -2]], [[-22, 13, 0.4], [8, 1, 0]]) },
];

function tag(g, en, ja, a) { // top-left of the top pane
  g.save(); g.globalAlpha = a; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 14; g.fillStyle = '#fffaf2';
  g.font = `600 24px ${SANS}`; g.letterSpacing = '5px'; g.fillText('YAOWARAT · BANGKOK', 64, 92);
  g.letterSpacing = '0px'; g.font = `600 56px ${SANS}`; g.fillText(en, 60, 160);
  g.font = `600 34px ${JP}`; g.fillText(ja, 62, 212);
  g.restore();
}
function board(g, t, open, people) { // top-left of the bottom pane: the time, the stalls open, the people out
  g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 10; g.fillStyle = '#fffaf2';
  g.font = `600 52px ${SANS}`; g.fillText(timeText(t), 60, PH + 92);
  g.font = `600 22px ${SANS}`; g.letterSpacing = '4px'; g.fillStyle = '#e9e2f2';
  g.fillText(`${open} STALLS OPEN · ${people} PEOPLE`, 64, PH + 130);
  g.restore();
}
function title(g) { // foot of the bottom pane
  g.save(); g.textAlign = 'center'; g.fillStyle = '#fffaf2'; g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 16;
  g.font = `600 22px ${SANS}`; g.letterSpacing = '6px'; g.fillText('TINY WORLDS · NO. 5', W / 2, H - 150);
  g.letterSpacing = '0px'; g.font = `italic 400 76px "Hoefler Text", Georgia, serif`; g.fillText('Yaowarat.', W / 2, H - 80);
  g.restore();
}
function ring(g, x, y, k, label) { // where the close-up is, on the whole view
  g.save(); g.strokeStyle = '#fffaf2'; g.lineWidth = 5; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10;
  const r = 30 + Math.sin(k * Math.PI * 2) * 4;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fffaf2'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
  g.font = `600 30px ${SANS}`; g.textAlign = 'center'; g.fillText(label, x, y - r - 18);
  g.restore();
}

export async function run(preview = false) {
  const k = K(), m = M(), { renderer, camera, scene } = k;
  renderer.setAnimationLoop(null);
  renderer.setPixelRatio(1); renderer.setSize(W, PH, false);
  camera.aspect = W / PH; camera.clearViewOffset();
  m.setMode('auto'); m.clock.t = 0;
  for (let i = 0; i < 4 * 20; i++) { k.tick(1 / 20); m.clock.t = 0; } // (people out and about before the first frame)
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const g = out.getContext('2d');
  const P = new THREE.Vector3();
  const shoot = (eye, look, fov, near, far) => {
    camera.fov = fov; camera.near = near; camera.far = far; camera.updateProjectionMatrix();
    camera.position.set(...eye); camera.lookAt(...look);
    k.tick(0); renderer.render(scene, camera);
  };
  const onScreen = (v) => { P.copy(v).project(camera); return P.z < 1 && Math.abs(P.x) < 1.1 && Math.abs(P.y) < 1.1 ? [(P.x + 1) / 2 * W, PH + (1 - P.y) / 2 * PH] : null; };
  const LENGTH = CUTS.reduce((s, c) => s + c.dur, 0);
  let n = 0, sent = [], time = 0;
  for (const [ci, sc] of CUTS.entries()) {
    sc.start?.();
    const frames = Math.round(sc.dur * FPS);
    for (let f = 0; f < frames; f++) {
      const s = time + f / FPS;
      if (f || ci) k.tick(1 / FPS);
      m.clock.t = clockAt(s);
      if (preview && f && f !== frames - 1) continue;
      const u = f / (frames - 1), tt = s / LENGTH;
      // top: the close-up
      const [eye, look] = sc.cam(u);
      shoot(eye, look, 46, 0.2, 400);
      g.drawImage(renderer.domElement, 0, 0);
      // bottom: the whole market, a slow turn over the film
      const ang = -0.55 + tt * 0.5; // (from high up on the south-west side, as the page's overview: the street shows over the roofs)
      shoot([3 + Math.sin(ang) * 46, 64, 8 + Math.cos(ang) * 46], [3, 0, 6], 44, 20, 500);
      g.drawImage(renderer.domElement, 0, PH);
      const at = onScreen(sc.at ? sc.at().clone().setY(1) : new THREE.Vector3(...look));
      if (at) ring(g, at[0], at[1], f / FPS / 1.6, sc.en);
      const open = m.STALLS.filter((st) => st.open).length;
      const people = m.people.filter((a) => a.p.visible).length + m.throng.all.filter((p) => !p.belt.hide?.(p.x, p.z)).length;
      board(g, m.clock.t, open, people);
      // the seam, the labels
      g.fillStyle = '#fffaf2'; g.fillRect(0, PH - 3, W, 6);
      tag(g, sc.en, sc.ja, Math.max(0, Math.min(1, (f / FPS) / 0.3, (frames - f) / FPS / 0.25)));
      title(g);
      const blob = await new Promise((r) => out.toBlob(r, 'image/jpeg', 0.92));
      const id = preview ? `${String(ci).padStart(2, '0')}-${f ? 'b' : 'a'}` : String(n++).padStart(5, '0');
      sent.push(fetch(`/__film/${preview ? 'yaowarat-split-preview' : 'yaowarat-split1'}/${id}`, { method: 'POST', body: blob }));
      if (sent.length > 6) { await Promise.all(sent); sent = []; }
    }
    time += frames / FPS;
  }
  await Promise.all(sent);
  return { frames: n, seconds: time };
}

// "The first morning" (rails/DESIGN.md §9): Sora's first day at a new job — the Chūō Rapid from Shinjuku to Tokyo, the
// Yamanote outer loop on to Shinagawa. The trains are the timetable's own: the first Chūō train for Tokyo leaving
// Shinjuku after 7:41, and the first outer-loop train leaving Tokyo four minutes after it gets in. The story runs the
// clock itself (each beat from one time to another), moves Sora, and sets the camera — a fixed shot, or one riding
// along beside a train — easing from the last beat's camera into each new one. It hands its camera to the film too.
import * as THREE from 'three';
import { person, ROLE_LOOKS } from '../../airport/src/parts.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { nextDepartures, clock } from './timetable.js';
import { STATIONS, toXZ } from './geo.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (u) => u * u * (3 - 2 * u);
const mod = (a, b) => ((a % b) + b) % b;

Object.assign(ROLE_LOOKS, { sora: { top: 0x2f3a4f, legs: 0x2f3a4f, hat: 'hair', tie: 0x5f8fc0, backpack: 0x1d1f23, fixed: true } }); // a new suit for the first day

export function railsStory({ stage, net, scene, world }) {
  const chuo = net.lines.chuo, yam = net.lines.yamanote, cr = chuo.runs[0], yr = yam.runs[0];
  const ev = (run, key, dir) => run.events.find((e) => e.key === key && (dir === undefined || e.dir === dir));
  const which = (run, e, t) => mod(Math.round(mod(t - e.dep, run.T) / (run.T / run.n)), run.n); // the train that leaves e at t
  const after = (run, from, e, t0) => t0 + mod(e.arr - from.dep, run.T); // when that train reaches e

  // the timetable for the morning
  const shin = ev(cr, 'shinjuku', -1), dep1 = nextDepartures(cr, shin, 7 * 3600 + 41 * 60, 1)[0], k1 = which(cr, shin, dep1);
  const tYotsuya = after(cr, shin, ev(cr, 'yotsuya', -1), dep1), tOcha = after(cr, shin, ev(cr, 'ochanomizu', -1), dep1), arr1 = after(cr, shin, ev(cr, 'tokyo'), dep1);
  const ytok = ev(yr, 'tokyo'), dep2 = nextDepartures(yr, ytok, arr1 + 240, 1)[0], k2 = which(yr, ytok, dep2);
  const tHama = after(yr, ytok, ev(yr, 'hamamatsucho'), dep2), arr2 = after(yr, ytok, ev(yr, 'shinagawa'), dep2);

  // Sora, and where Sora stands: on a platform, `along` from its middle, `inset` in from the edge the train stops at
  const sora = person('sora', { seed: 7 }); sora.scale.setScalar(0.035); sora.visible = false; scene.add(sora);
  const a = [0, 0, 0, 0];
  const spot = (line, e, along, inset = 0.022) => {
    const side = Math.sign(line.side(e.s, e.dir)), p = line.path, s = e.s + along;
    p.at(s, side * (0.05 - inset), a);
    return { p: V(a[0], p.y(s) + 0.065, a[1]), yaw: Math.atan2(-a[3], a[2]) + (side > 0 ? -Math.PI / 2 : Math.PI / 2), along: Math.atan2(-a[3], a[2]) };
  };
  const put = (at, yaw = at.yaw, mode = 'idle') => { sora.visible = true; sora.position.copy(at.p); sora.rotation.set(0, yaw, 0); sora.userData.mode = mode; };
  const walk = (from, to, u) => { sora.visible = true; sora.position.lerpVectors(from.p, to.p, u); sora.rotation.set(0, Math.atan2(-(to.p.z - from.p.z), to.p.x - from.p.x), 0); sora.userData.mode = 'walk'; };
  const S1 = spot(chuo, shin, 0.12), T1 = spot(yam, ytok, -0.32), T2 = spot(yam, ytok, -0.12), Q1 = spot(yam, ev(yr, 'shinagawa'), -0.12), Q2 = spot(yam, ev(yr, 'shinagawa'), 0.36, 0.045);
  const behind = (at, back, up) => at.p.clone().add(V(-Math.cos(at.yaw) * back, up, Math.sin(at.yaw) * back)); // (behind someone facing the track)
  const stn = (k) => { const [x, z] = toXZ(STATIONS[k][3], STATIONS[k][4]); return V(x, 0.08, z); };

  // cameras: fixed [eye, target], or riding beside train k of a line's run r
  const c3 = [0, 0, 0];
  const fixed = (P, T) => () => [P, T];
  const ride = (line, r, k, off) => () => { line.centre(r, k, world.time, c3); const T = V(c3[0], c3[1] + 0.06, c3[2]); return [T.clone().add(off), T]; };
  const near = (k, d) => { const t = stn(k); return [t.clone().add(d), t]; };

  const BEATS = [
    { dur: 6, t: [dep1 - 170, dep1 - 70], cam: fixed(...near('shinjuku', V(1.2, 0.75, 1.0))), say: [`${clock(dep1 - 170)}、新宿。ソラは今日から新しい会社。`, `${clock(dep1 - 170)}, Shinjuku. Sora's first day at a new job.`],
      fn: () => put(S1) },
    { dur: 6, t: [dep1 - 70, dep1 + 6], cam: fixed(S1.p.clone().add(V(0.32, 0.16, 0.38)), S1.p.clone().add(V(0, 0.03, 0))), say: ['オレンジの中央線快速が入ってくる。ぎゅうぎゅうの車内へ、ひと押しで。', 'The orange Chūō Rapid pulls in. One small push, and Sora is aboard.'],
      fn: (u) => { put(S1); if (u > 0.82) sora.visible = false; } },
    { dur: 8, t: [dep1 + 6, tYotsuya + 20], cam: ride(chuo, 0, k1, V(0.55, 0.42, 0.75)), say: ['四ツ谷へ。となりを黄色い総武線が並んで走る。', 'On toward Yotsuya, the yellow Sōbu Line running alongside.'] },
    { dur: 6, t: [tOcha - 50, tOcha + 30], cam: fixed(...near('ochanomizu', V(0.5, 0.55, -1.25))), say: ['御茶ノ水。神田川の谷を、朝日が照らしている。', 'Ochanomizu. Morning sun on the Kanda River valley.'] },
    { dur: 6, t: [arr1 - 45, arr1 + 25], cam: fixed(...near('tokyo', V(-1.5, 0.75, 1.5))), say: [`${clock(arr1)}、東京。赤レンガの駅舎のとなりに着く。`, `${clock(arr1)}, Tokyo, beside the red-brick station.`] },
    { dur: 7, t: [dep2 - 100, dep2 + 6], cam: fixed(T2.p.clone().add(V(-0.5, 0.22, 0.25)), T2.p.clone().add(V(0, 0.03, 0))), say: ['山手線に乗りかえ。外回り、品川方面。', 'Change to the Yamanote Line: the outer loop, for Shinagawa.'],
      fn: (u) => { if (u < 0.45) walk(T1, T2, u / 0.45); else put(T2); if (u > 0.85) sora.visible = false; } },
    { dur: 8, t: [dep2 + 6, tHama + 25], cam: ride(yam, 0, k2, V(0.85, 0.45, 0.3)), say: ['有楽町、新橋、浜松町。窓の外に東京タワー。', 'Yūrakuchō, Shimbashi, Hamamatsuchō. Tokyo Tower out of the window.'] },
    { dur: 7, t: [arr2 - 35, arr2 + 45], cam: fixed(behind(Q1, 0.4, 0.3), Q1.p.clone().add(V(0, 0.03, 0))), say: [`${clock(arr2)}、品川。ここが新しい職場の駅。`, `${clock(arr2)}, Shinagawa: the station for the new office.`],
      fn: (u) => { if (u < 0.5) sora.visible = false; else walk(Q1, Q2, (u - 0.5) / 0.5); } },
    { dur: 5, t: [arr2 + 45, arr2 + 90], cam: fixed(Q2.p.clone().add(V(1.6, 1.3, 1.6)), Q2.p.clone()), say: ['深呼吸をひとつ。「いってきます」', 'One deep breath. “Here I go.”'], fn: () => put(Q2, Q2.along) },
  ];

  // ---------- running the beats ----------
  let beat = -1, bt = 0, line = null;
  const from = { P: V(0, 0, 0), T: V(0, 0, 0) }, cam = { P: V(0, 0, 0), T: V(0, 0, 0) };
  const say = (t) => { line = t; $('storyLine').textContent = L(t); };
  function go(i) {
    beat = i; bt = 0;
    if (i >= BEATS.length) { beat = -1; world.auto = true; sora.visible = false; stage.go('all'); $('storyBtn').textContent = L(['もう一度見る', 'Watch again']); say(['おしまい。ソラの新しい毎日が、品川から始まる。', 'The end. Sora’s new days begin at Shinagawa.']); return; }
    from.P.copy(stage.camera.position); from.T.copy(stage.controls.target);
    say(BEATS[i].say);
  }
  function start() { world.auto = false; go(0); $('storyBtn').textContent = L(['はじめから', 'From the start']); }
  const update = (t, dt) => {
    sora.userData.update?.(t, dt);
    if (beat < 0) return;
    const b = BEATS[beat]; bt += dt;
    const u = Math.min(1, bt / b.dur);
    world.time = b.t[0] + (b.t[1] - b.t[0]) * u;
    b.fn?.(u);
    const [P, T] = b.cam(), k = ease(Math.min(1, bt / 1.5)); // (the first second and a half: from the last camera into this one)
    cam.P.lerpVectors(from.P, P, k); cam.T.lerpVectors(from.T, T, k);
    if (!stage.filming) { stage.camera.position.copy(cam.P); stage.controls.target.copy(cam.T); }
    if (bt >= b.dur) go(beat + 1);
  };
  $('storyBtn').onclick = start;
  onLang(() => { if (line) $('storyLine').textContent = L(line); });
  if (new URLSearchParams(location.search).get('story')) start();
  return { start, update, cam, beat: () => beat, skip: (i) => go(i) };
}

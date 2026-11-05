// The network (rails/DESIGN.md §1, §3, §4): the Yamanote loop through its 30 stations, the Chūō Rapid from its terminus
// at Tokyo, and the Chūō-Sōbu Local from the east — the two sharing one corridor from Ochanomizu to Shinjuku, then
// leaving west into a tunnel at the board's edge. Where they cross the loop (Akihabara, north of Shinjuku) they climb
// onto a viaduct. Each line gets its timetable, platforms, name boards and the queues on its platforms.
import * as THREE from 'three';
import { STATIONS, LINES, YAMANOTE, toXZ } from './geo.js';
import { Path, layTrack, layPlatform, PLAT, smooth } from './track.js';
import { makeRun } from './timetable.js';
import { Line } from './trains.js';

export const BOARD = { x0: -10.2, x1: 11.5, z0: -13.9, z1: 14.4 };
const xz = (k) => toXZ(STATIONS[k][3], STATIONS[k][4]);
const BIG = new Set(['tokyo', 'shinjuku', 'shibuya', 'ikebukuro', 'shinagawa', 'ueno']);
const dwellOf = (k) => (BIG.has(k) ? 50 : 40); // a rush-hour stop; the big stations a little longer
const UP = 0.26, BASE = 0.03; // the viaduct over the loop, and the low bank everywhere else

// the shared corridor, from just east of Ochanomizu → Shinjuku → west, as points (x only ever falling); each line runs
// `off` to one side of it
function corridor(off) {
  const pts = [[5.4, -4.15], ...['ochanomizu', 'suidobashi', 'iidabashi', 'ichigaya', 'yotsuya', 'shinanomachi', 'sendagaya'].map(xz)];
  pts.push([-6.37, -0.66], [-6.63, -2.12], [-7.95, -4.62], [-9.2, -5.05], [-10.6, -5.3], [-12.4, -5.4]); // past Yoyogi and Shinjuku beside the loop, over it, Ōkubo, out
  const c = new Path(pts, { step: 0.05 }), out = [], a = [0, 0, 0, 0];
  for (let s = 0; s <= c.length; s += 0.25) out.push(c.at(s, off, a).slice(0, 2));
  return { pts: out, path: c };
}

export function buildNetwork() {
  // ---------- the Yamanote loop, clockwise ----------
  const loop = new Path(YAMANOTE.map(xz), { closed: true });
  loop.y = () => BASE;
  const ys = YAMANOTE.map((k) => [loop.nearest(...xz(k)), k]);
  loop.stations = ys.map(([s]) => s);

  // ---------- Chūō Rapid: from the buffers south of Tokyo, beside the loop to Kanda, then the corridor west ----------
  const [tx, tz] = xz('tokyo'), [kx, kz] = xz('kanda');
  const chuo = new Path([[tx - 0.62, tz + 0.5], [tx - 0.6, tz - 0.1], [kx - 0.5, kz - 0.05], [kx - 0.5, kz - 0.75], ...corridor(-0.18).pts.filter(([x]) => x < kx - 0.85)], { step: 0.02 });
  // (Tokyo a little north of the loop's platform, clear of its curve to Yūrakuchō; then north, and round into the corridor)
  // ---------- Chūō-Sōbu Local: from beyond the east edge, over the Sumida, Asakusabashi, over the loop at Akihabara ----------
  const [ax, az] = xz('akihabara');
  const sobu = new Path([[13.2, -3.25], [11.6, -3.3], [9.6, -3.5], ...['asakusabashi'].map(xz), [ax + 0.8, az - 0.04], [ax, az], ...corridor(0.18).pts], { step: 0.02 });

  // ---------- the stops, in the order each line calls ----------
  const at = (p, k) => p.nearest(...xz(k));
  // (the Chūō Rapid's Tokyo is just past the buffers, and its Ochanomizu a little west, off the curve)
  const chuoStops = [[0.72, 'tokyo', 240], [at(chuo, 'kanda'), 'kanda', 40], [chuo.nearest(4.15, -4.5), 'ochanomizu', 40],
    ...['yotsuya', 'shinjuku'].map((k) => [at(chuo, k), k, dwellOf(k)]), [chuo.length - 0.3, null, 300]];
  const sobuKeys = ['asakusabashi', 'akihabara', 'ochanomizu', 'suidobashi', 'iidabashi', 'ichigaya', 'yotsuya', 'shinanomachi', 'sendagaya', 'yoyogi', 'shinjuku', 'okubo'];
  const sobuStops = [[0.3, null, 300], ...sobuKeys.map((k) => [at(sobu, k), k, dwellOf(k)]), [sobu.length - 0.3, null, 300]];

  // up onto the viaduct where a line crosses the loop: wherever it comes within a whisker of the loop's middle. A
  // platform on the crossing (Akihabara) gets a longer flat top; one near a ramp moves along off it.
  const a = [0, 0, 0, 0], b = [0, 0, 0, 0];
  for (const [p, stops] of [[chuo, chuoStops], [sobu, sobuStops]]) {
    const over = [];
    for (let s = 0; s < p.length; s += 0.05) { p.at(s, 0, a); loop.at(loop.nearest(a[0], a[1]), 0, b); if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.06) over.push(s); }
    const humps = over.filter((s, i) => i === 0 || s - over[i - 1] > 0.5).map((c) => [c, 0.2]);
    for (const st of stops) for (const h of humps) {
      const d = st[0] - h[0];
      if (Math.abs(d) < 0.25) h[1] = PLAT.len / 2 + 0.05;
      else if (Math.abs(d) < h[1] + 0.42 + PLAT.len / 2) st[0] = h[0] + Math.sign(d) * (h[1] + 0.42 + PLAT.len / 2);
    }
    p.y = (s) => BASE + (UP - BASE) * Math.max(0, ...humps.map(([c, w]) => 1 - smooth(w, w + 0.42, Math.abs(s - c))));
  }
  chuo.stations = chuoStops.filter(([, k]) => k).map(([s]) => s);
  sobu.stations = sobuStops.filter(([, k]) => k).map(([s]) => s);

  // what of an open line is on the board: from where it comes out of one tunnel to where it goes into the other
  const edge = (p, x) => { let s = 0; for (; s < p.length; s += 0.02) if (Math.sign(p.at(s, 0, a)[0] - x) !== Math.sign(p.at(0, 0, b)[0] - x)) break; return s; };
  const west = BOARD.x0 + 0.55, east = BOARD.x1 - 0.55;

  const lines = {
    yamanote: new Line(loop, { color: LINES.yamanote.color, doors: true, runs: [
      makeRun(loop, ys.map(([s, k]) => [s, k, dwellOf(k)]), { dir: 1, headway: 150 }), // 外回り
      makeRun(loop, [...ys].reverse().map(([s, k]) => [s, k, dwellOf(k)]), { dir: -1, headway: 150 }), // 内回り
    ] }),
    chuo: new Line(chuo, { color: LINES.chuo.color, runs: [makeRun(chuo, chuoStops, { closed: false, headway: 120 })], seen: [0, edge(chuo, west)], xover: [chuoStops[0][0] + PLAT.len / 2 + 0.1, chuoStops[0][0] + PLAT.len / 2 + 0.6] }),
    sobu: new Line(sobu, { color: LINES.sobu.color, runs: [makeRun(sobu, sobuStops, { closed: false, headway: 180 })], seen: [edge(sobu, east), edge(sobu, west)] }),
  };
  for (const [k, l] of Object.entries(lines)) l.key = k;
  return { lines, loop, chuo, sobu, corridor: corridor(0).path };
}

// lay every line's track and platforms (open lines only on the board, buffers at Tokyo); `water(x, z)` makes a bridge
export function layNetwork(net, water) {
  const g = new THREE.Group(), a = [0, 0, 0, 0], b = [0, 0, 0, 0];
  const nearLoop = (x, z) => { net.loop.at(net.loop.nearest(x, z), 0, b); return Math.hypot(x - b[0], z - b[1]) < 0.3; };
  for (const line of Object.values(net.lines)) {
    const p = line.path, s0 = p.closed ? 0 : line.key === 'chuo' ? 0.18 : line.seen[0] - 0.6, s1 = p.closed ? p.length : line.seen[1] + 0.6;
    const open = (s) => p.y(s) > 0.07 || water(...p.at(s, 0, a).slice(0, 2));
    g.add(layTrack(p, { s0, s1, open, pier: (s) => p.y(s) > 0.07 && !water(...p.at(s, 0, a).slice(0, 2)) && !nearLoop(a[0], a[1]) }));
    for (const s of p.stations) g.add(layPlatform(p, s));
  }
  // buffer stops at the end of the Chūō Rapid's two tracks at Tokyo
  const c = net.chuo, stop = new THREE.MeshStandardMaterial({ color: 0xd9473b, roughness: 0.6 });
  for (const side of [-1, 1]) { c.at(0.22, c.track(0.22, side), a); const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.06), stop); m.position.set(a[0], c.y(0.22) + 0.035, a[1]); m.rotation.y = Math.atan2(-a[3], a[2]); m.castShadow = true; g.add(m); }
  return g;
}

// every stop event where people wait, with the platform side its trains stand on
export function* waitingSides(net) {
  for (const line of Object.values(net.lines)) for (const run of line.runs) for (const ev of run.events) {
    if (!ev.key) continue;
    yield { line, run, ev, side: Math.sign(line.side(ev.s, ev.dir)) };
  }
}

// [line, station key, prev, next, number] for every platform's name boards
export function boards(net) {
  const out = [];
  YAMANOTE.forEach((k, i) => out.push(['yamanote', k, YAMANOTE[(i + 29) % 30], YAMANOTE[(i + 1) % 30], i === 0 ? 1 : 31 - i]));
  const chuo = ['tokyo', 'kanda', 'ochanomizu', 'yotsuya', 'shinjuku'];
  chuo.forEach((k, i) => out.push(['chuo', k, chuo[i - 1] ?? null, chuo[i + 1] ?? 'nakano', i + 1]));
  const sobu = ['okubo', 'shinjuku', 'yoyogi', 'sendagaya', 'shinanomachi', 'yotsuya', 'ichigaya', 'iidabashi', 'suidobashi', 'ochanomizu', 'akihabara', 'asakusabashi'];
  sobu.forEach((k, i) => out.push(['sobu', k, sobu[i - 1] ?? 'higashinakano', sobu[i + 1] ?? 'ryogoku', 9 + i]));
  return out;
}

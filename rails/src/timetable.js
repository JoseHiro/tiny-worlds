// The timetable (rails/DESIGN.md §4). Everything follows the clock: a train's place is a function of the time alone, so
// the same minute always looks the same (the film can jump about) and the departure boards can show real times.
// Units: seconds of game time and map units (1 km = 2.0).
export const SPEED = 20; // game seconds per real second (an hour in three minutes)
export const START = 7.5 * 3600, END = 9 * 3600; // 7:30 → 9:00, then round again
export const VMAX = (70 / 3.6) * 0.002; // 70 km/h in map units a second
export const ACC = (3.0 / 3.6) * 0.002; // 3 km/h/s

const mod = (a, b) => ((a % b) + b) % b;
export const clock = (t) => { const m = Math.floor(t / 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };

// how long a run of d takes from standstill to standstill, and how far along it is after τ seconds
function runTime(d) {
  const ta = VMAX / ACC, da = VMAX * ta; // accelerating to full speed, then braking from it
  return d >= da ? 2 * ta + (d - da) / VMAX : 2 * Math.sqrt(d / ACC);
}
function runAt(d, tau) {
  const T = runTime(d), ta = Math.min(VMAX / ACC, T / 2), vt = ACC * ta;
  if (tau <= ta) return 0.5 * ACC * tau * tau;
  if (tau >= T - ta) { const r = T - tau; return d - 0.5 * ACC * r * r; }
  return 0.5 * ACC * ta * ta + vt * (tau - ta);
}

// A line direction as one repeating run. `stops` are [arc position, station key, dwell] in the order the train calls.
// A loop runs once round (closed); a shuttle runs out to the last stop and back (each end's dwell is its turn-round).
// The train at offset k of n is (k / n) of a cycle behind the first.
export function makeRun(path, stops, { closed = path.closed, dir = 1, headway = 150 } = {}) {
  const legs = [], events = [];
  let t = 0;
  // (a shuttle calls on the way out, then on the way back at the stops between the two ends)
  const list = closed ? stops.map((x) => [...x, dir]) : [...stops.map((x) => [...x, 1]), ...stops.slice(1, -1).reverse().map((x) => [...x, -1])];
  for (let i = 0; i < list.length; i++) {
    const [s, key, dwell, d] = list[i], next = list[(i + 1) % list.length];
    events.push({ key, dir: d, s, arr: t, dep: t + dwell });
    legs.push({ t0: t, s0: s, d: 0, dir: d, key });
    t += dwell;
    const dist = closed ? mod((next[0] - s) * d, path.length) || path.length : Math.abs(next[0] - s); // (a loop with one stop: all the way round)
    legs.push({ t0: t, s0: s, d: dist, dir: closed ? d : Math.sign(next[0] - s) });
    t += runTime(dist);
  }
  const n = Math.max(1, Math.round(t / headway));
  return { path, legs, events, T: t, n, headway: t / n, closed };
}

// the train k's state at game time `time`: arc position of its middle, direction, and whether it stands at a stop
export function trainAt(run, k, time, out = {}) {
  const tau = mod(time - (k * run.T) / run.n, run.T);
  let lo = 0, hi = run.legs.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (run.legs[mid].t0 <= tau) lo = mid; else hi = mid - 1; }
  const L = run.legs[lo];
  out.dir = L.dir; out.stop = L.d === 0 ? L.key : null;
  out.s = L.d === 0 ? L.s0 : L.s0 + L.dir * runAt(L.d, tau - L.t0);
  if (run.closed) out.s = mod(out.s, run.path.length);
  out.since = tau - L.t0; out.tau = tau;
  return out;
}

// at a stop event: how long since the last train left, and whether one is standing there now (and for how long)
export function platformAt(run, ev, time) {
  const H = run.headway, dwell = ev.dep - ev.arr;
  const sinceArr = mod(time - ev.arr, H);
  if (sinceArr < dwell) return { standing: true, u: sinceArr / dwell, since: 0, wait: H - dwell };
  return { standing: false, since: sinceArr - dwell, wait: H - dwell };
}

// the next departures from a stop event after `time` (for the departure boards)
export function nextDepartures(run, ev, time, count = 2) {
  const H = run.headway, first = time + mod(ev.dep - time, H);
  return Array.from({ length: count }, (_, i) => first + i * H);
}

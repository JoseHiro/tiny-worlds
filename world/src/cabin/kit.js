// The whole cabin (world/CABIN.md §3, §4): a wide-body cut open at window height, three classes, galleys,
// lavatories and the flight deck. update(t) plays the flight's timetable for flight time t (0 … T):
// belts, light, drinks and meals, night, the queue for the lavatory, turbulence, the descent.
// Seats, meal trays and filler passengers are instanced (instanced.js); only the crew, Hana's family and
// three people who get up are full characters.
import * as THREE from 'three';
import { person, PALETTE } from '../../../airport/src/parts.js';
import { CP, M, V, setMood, tickMood, tickScreens, bx } from './common.js';
import * as S from './seats.js';
import * as F from './shell.js';
import * as G from './service.js';
import { bear } from './props.js';
import { Instances, Crowd } from './instanced.js';
import { bakeStatic } from '../../../airport/src/merge.js';

export const T = 46;

// camera presets for the cabin: eye and target
export const VIEWS = {
  all: { label: ['全体', 'Whole'], pos: [3, 27, 25], target: [0, 0, 0] },
  biz: { label: ['ビジネス', 'Business'], pos: [12, 9, 10], target: [9.4, 0.4, 0] },
  mid: { label: ['ギャレー', 'Galley'], pos: [0.5, 7, 7.5], target: [2.8, 0.5, 0] },
  hana: { label: ['ハナの席', "Hana's row"], pos: [-8.5, 5.5, 4.5], target: [-11, 0.5, -2] },
  rear: { label: ['後方', 'Rear'], pos: [-12, 7, 8], target: [-15.5, 0.5, 0] },
  deck: { label: ['操縦室', 'Flight deck'], pos: [14.5, 7, 6.5], target: [18.8, 0.6, 0] },
};

// ---------- layout (nose +X, floor y 0, left −Z; the straight part runs x −18 … 18) ----------
export const LAYOUT = {
  biz: { rows: [13.6, 11.5, 9.4, 7.3, 5.2], first: 1, seats: [['A', -2.28, 0.35, false], ['D', -0.43, 0, true], ['G', 0.43, 0, false], ['K', 2.28, -0.35, true]] },
  prem: { rows: [1.1, 0.1, -0.9], first: 11, seats: [['A', -2.39], ['B', -1.81], ['D', -0.58], ['E', 0], ['F', 0.58], ['H', 1.81], ['K', 2.39]] },
  eco: { rows: Array.from({ length: 14 }, (_, r) => -2.6 - r * 0.85), first: 21, seats: [['A', -2.75], ['B', -2.25], ['C', -1.75], ['D', -0.5], ['E', 0], ['F', 0.5], ['G', 1.75], ['H', 2.25], ['K', 2.75]] },
  doors: [16.3, 2.5, -14.75],
  deck: 18.4,
  aisle: 1.15,
};
const PITCH = { prem: 1.0, eco: 0.85 };
const AISLE_OF = { A: 'L', B: 'L', C: 'L', D: 'L', E: 'L', F: 'R', G: 'R', H: 'R', K: 'R' };
const HANA = { '31A': ['child', 'hana'], '31B': ['woman', 'mum'], '31C': ['passenger', 'dad'] };
const LOOK = { px: 0, nx: Math.PI, nz: Math.PI / 2, pz: -Math.PI / 2 };

// a steady random number per key
const hash = (s, k = 0) => { let h = 2166136261 ^ k; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
const smooth = (k) => k * k * (3 - 2 * k);
const between = (t, a, b) => t >= a && t < b;
const placeM = (x, z, yaw = 0, mirror = false) => new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, mirror ? -1 : 1));

// ---------- the timetable (§4) ----------
export const PHASES = [
  [0, ['離陸・上昇：ベルト着用サインが点灯、全員着席', 'Take-off and climb: seat belts on, everyone seated']],
  [9, ['雲の上へ', 'Above the clouds']],
  [11, ['ポーン！ベルトサインが消える。立つ人、トイレへ向かう人', 'Ding! The belt sign goes off. People stand up; someone heads for the lavatory']],
  [14, ['飲み物サービス：カート2台が通路を後ろへ', 'Drinks: two trolleys work aft down the aisles']],
  [22, ['ミールサービス：後ろからミールカート。テーブルを出して食事', 'Meals: trolleys come forward from the back; tables down, dinner']],
  [30, ['夜の照明。眠る人、映画を見る人、トイレの列', 'Night lighting. Some sleep, some watch films, a queue for the lavatory']],
  [38, ['揺れ：ベルト着用サインが点灯', 'Turbulence: seat belts on']],
  [40.5, ['降下：日よけを上げ、テーブルと座席を戻す。乗務員が確認して着席', 'Descent: shades up, tables and seats upright. The crew check, then sit down']],
];
export const phaseAt = (t) => PHASES.filter(([t0]) => t >= t0).at(-1)[1];
export const beltsOn = (t) => t < 11 || t >= 38;
const moodAt = (t) => (t < 9 ? 'cruise' : t < 30 ? 'boarding' : t < 38 ? 'night' : 'dawn');

// a trolley working along a list of stops: from pts[0] through the stops to the last point
function cartRun(t, t0, t1, pts) {
  const N = pts.length - 1, d = (t1 - t0) / N;
  if (t <= t0) return { x: pts[0], moving: false };
  if (t >= t1) return { x: pts[N], moving: false, done: true };
  const k = Math.floor((t - t0) / d), f = (t - t0) / d - k;
  return { x: pts[k] + (pts[k + 1] - pts[k]) * smooth(Math.min(1, f / 0.35)), moving: f < 0.35 };
}
const reachedAt = (t0, t1, pts, i) => t0 + ((t1 - t0) / (pts.length - 1)) * (i - 1 + 0.35);

// keyframed movement: [t, x, z, mode, yaw]; between keys a person walks (or keeps `mode` if the key says how)
function track(keys) {
  return (t) => {
    let i = keys.length - 1;
    while (i > 0 && keys[i][0] > t) i--;
    const a = keys[i], b = keys[i + 1];
    if (!b || t < a[0]) return { x: a[1], z: a[2], mode: a[3], yaw: a[4] };
    const k = (t - a[0]) / (b[0] - a[0]);
    const dx = b[1] - a[1], dz = b[2] - a[2];
    if (Math.hypot(dx, dz) < 0.01) return { x: a[1], z: a[2], mode: a[3], yaw: a[4] };
    return { x: a[1] + dx * k, z: a[2] + dz * k, mode: 'walk', yaw: Math.atan2(-dz, dx) };
  };
}

// ---------- build ----------
// livery: the flight's aircraft colours ({ tail, engine }); homeward: the seat-back map runs OKA → HND
export function cabinKit({ livery = { tail: PALETTE.orange, engine: PALETTE.navy }, homeward = false } = {}) {
  const root = new THREE.Group(); // shakes in turbulence
  const g = new THREE.Group();
  root.add(g);
  const live = [];
  const add = (o, x = 0, z = 0, yaw = 0) => { o.position.set(x, 0, z); o.rotation.y = yaw; g.add(o); if (o.userData.update) live.push(o); return o; };

  // shell
  const { doors } = LAYOUT;
  const sec = add(F.section(36, { cheat: livery.tail, skip: doors.map((x) => [x - 0.6, x + 0.6]) }));
  add(F.cap('nose'), 18);
  add(F.cap('tail'), -18);
  add(F.airframe({ wingX: -3, finX: -21, livery }));
  const deck = add(G.flightDeck(), LAYOUT.deck);
  deck.userData.state.overhead = false; // it hangs above the cut
  for (const x of doors) { add(F.cabinDoor(), x, -3.14); add(F.cabinDoor(), x, 3.14, Math.PI); }
  // bulkheads: flight-deck wall (with its door ajar), rear wall
  for (const s of [-1, 1]) bx(g, 0.08, 1.7, 2.2, M.lining, 17.6, 0.85, s * 1.52);
  const cdoor = bx(g, 0.05, 1.66, 0.8, M.trim, 17.75, 0.83, 0.25);
  cdoor.rotation.y = 1.1;
  bx(g, 0.08, 1.7, 6.3, M.lining, -18.05, 0.85, 0);
  // galleys, lavatories, jump seats, dividers, bulkheads
  const galleys = [add(G.galley({ width: 1.6, bays: 3, ovens: 2 }), 17.5, -1.8, Math.PI), add(G.galley({ width: 1.6, bays: 3, ovens: 2 }), 4.05, 0, Math.PI), add(G.galley({ width: 3.0, bays: 6, ovens: 3 }), -18.0, 0)];
  const lav = {
    front: add(G.lavatory(), 17.0, 1.6, Math.PI), midL: add(G.lavatory(), 3.6, -2.2, Math.PI), midR: add(G.lavatory(), 3.6, 2.2, Math.PI),
    rearL: add(G.lavatory(), -15.85, -2.15), rearR: add(G.lavatory(), -15.85, 2.15),
  };
  const jumps = [[17.47, -0.72, Math.PI], [17.47, 0.72, Math.PI], [1.84, -2.1, 0], [1.84, 2.1, 0], [-17.95, -2.15, 0], [-17.95, 2.15, 0]].map(([x, z, r]) => add(S.jumpSeat(), x, z, r));
  const jumpSpot = (i) => { const j = jumps[i]; const p = j.userData.seats[0].clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), j.rotation.y).add(j.position); return [p.x, p.z, j.rotation.y]; };
  const standSpot = (i) => { const j = jumps[i]; const p = V(0.6, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), j.rotation.y).add(j.position); return [p.x, p.z]; };
  const dividers = [add(F.divider({ accent: CP.gold }), 4.15), add(F.divider({ accent: PALETTE.teal }), -1.55)];
  for (const [z, w] of [[-2.1, 1.16], [0, 1.74], [2.1, 1.16]]) add(S.bulkhead({ width: w, accent: CP.prem }), 1.75, z).userData.state.baby = false;
  for (const z of [-2.25, 0, 2.25]) { const b = add(S.bulkhead({ screen: 'map' }), -1.95, z); b.userData.state.baby = z === 0; }
  // bins (business: side only)
  for (const s of [-1, 1]) { add(F.bins(11, { side: s }), 10); add(F.bins(15.7, { side: s }), -6.25); }
  add(F.bins(15.7, { kind: 'center' }), -6.25);
  // belt signs on the walls in front of each cabin
  const beltMat = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xfff1c8, emissiveIntensity: 0.1 });
  for (const [x, z] of [[17.55, -1.2], [17.55, 1.2], [4.08, -1.9], [4.08, 1.9], [1.7, 0], [-2.0, 0], [-2.0, -2.25], [-2.0, 2.25]]) {
    bx(g, 0.03, 0.12, 0.34, M.white, x - 0.05, 1.5, z);
    bx(g, 0.012, 0.08, 0.13, beltMat, x - 0.068, 1.5, z - 0.08);
    bx(g, 0.012, 0.08, 0.13, M.glow(0xffd0d0, 0.5), x - 0.068, 1.5, z + 0.08);
  }

  // ---------- seats ----------
  const seats = [];
  const placesBy = { biz: [], prem: [], eco: [] };
  for (const cls of ['biz', 'prem', 'eco']) {
    const L = LAYOUT[cls];
    L.rows.forEach((x, r) => L.seats.forEach(([letter, z, yaw = 0, mirror = false]) => {
      const key = `${L.first + r}${letter}`;
      const m = placeM(x, z, yaw, mirror);
      const s = { cls, key, row: r, letter, x, z, yaw, m, idx: placesBy[cls].length, h: hash(key), h2: hash(key, 7), h3: hash(key, 13), aisle: AISLE_OF[letter] };
      s.pos = (cls === 'biz' ? V(0.02, -0.08) : V(0.02, 0)).applyMatrix4(m); // where the passenger sits (seats.js userData.seats)
      s.occ = !!HANA[key] || s.h3 < { biz: 0.7, prem: 0.86, eco: 0.82 }[cls];
      placesBy[cls].push(m);
      seats.push(s);
    }));
  }
  const bySeat = Object.fromEntries(seats.map((s) => [s.key, s]));
  for (const s of seats) if (s.cls !== 'biz') s.ahead = s.row > 0 ? bySeat[`${LAYOUT[s.cls].first + s.row - 1}${s.letter}`] : null;
  const inst = { biz: new Instances(S.businessPod, placesBy.biz), prem: new Instances(S.premSeat, placesBy.prem), eco: new Instances(S.ecoSeat, placesBy.eco) };
  for (const i of Object.values(inst)) g.add(i.group);
  // meal trays: one on the table in front of every economy and premium seat
  const mealSeats = seats.filter((s) => s.cls !== 'biz');
  const meals = new Instances(G.mealTray, mealSeats.map((s) => new THREE.Matrix4().makeTranslation(s.pos.x + PITCH[s.cls] - 0.48, 0.555, s.pos.z)));
  g.add(meals.group);
  meals.group.traverse((o) => { o.castShadow = false; });
  mealSeats.forEach((s, i) => { s.meal = i; meals.show(i, false); });
  // filler passengers: one instanced crowd for every seat (the seat's yaw, no mirror)
  const crowd = new Crowd(seats.map((s) => ({ m: new THREE.Matrix4().compose(s.pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw), new THREE.Vector3(1, 1, 1)) })));
  g.add(crowd.group);
  seats.forEach((s, i) => { s.ci = i; s.screenPref = ['map', 'movie', 'movieB'][Math.floor(s.h2 * 3)]; });

  // ---------- characters ----------
  const chars = [];
  const who = (role, seed, extra = {}) => { const p = person(role, { seed }); if (p.userData.suitcase) p.userData.suitcase.visible = false; p.userData.phase = seed; g.add(p); chars.push(p); Object.assign(p.userData, extra); return p; };
  const sitAt = (p, s, mode) => { p.position.copy(s.pos); p.rotation.y = s.yaw; p.userData.mode = mode; p.visible = true; };
  // pilots
  const pilots = [-0.5, 0.5].map((z, i) => { const p = who('pilot', 40 + i); p.position.set(LAYOUT.deck + 0.04, 0, z); p.userData.mode = 'sit'; return p; });
  // Hana's family in 31A–C; Hana holds her bear
  const family = Object.entries(HANA).map(([key, [role, id]]) => { const p = who(role, id === 'hana' ? 3 : id === 'mum' ? 8 : 12, { id, seat: bySeat[key] }); return p; });
  const bearP = bear(); bearP.position.set(0.18, 0.42, 0.06); bearP.rotation.y = -0.6; family[0].add(bearP);
  // three passengers who get up (lavatory trips), keyed in flight seconds
  const lavL = lav.rearL, lavR = lav.rearR;
  const lavPts = (l) => { const q = l.userData.queue.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), l.rotation.y).add(l.position); const n = l.userData.inside.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), l.rotation.y).add(l.position); return { q, n }; };
  const walk = (key, role, seed, aisleZ, l, [up, atQ, inT, outT, home]) => {
    const s = bySeat[key], { q, n } = lavPts(l);
    const gap = s.x + 0.42;
    const keys = [
      [0, s.pos.x, s.pos.z, 'SEAT', 0], [up, s.pos.x, s.pos.z, 'idle', 0], [up + 0.3, gap, s.pos.z, 'idle', 0], [up + 0.6, gap, aisleZ, 'idle', LOOK.nx],
      [atQ - 0.3, q.x, aisleZ, 'idle', LOOK.nx], [atQ, q.x, q.z, 'idle', LOOK.nx], [inT, q.x, q.z, 'idle', LOOK.nx], [inT + 0.25, n.x, n.z, 'HIDE', 0],
      [outT, n.x, n.z, 'HIDE', 0], [outT + 0.25, q.x, q.z, 'idle', 0], [outT + 0.5, q.x, aisleZ, 'idle', 0],
      [home - 0.6, gap, aisleZ, 'idle', 0], [home - 0.3, gap, s.pos.z, 'idle', 0], [home, s.pos.x, s.pos.z, 'SEAT', 0],
    ];
    return { p: who(role, seed, { seat: s }), at: track(keys), lav: l, inside: [inT + 0.2, outT + 0.05], seat: s };
  };
  const walkers = [
    walk('32C', 'backpacker', 51, -LAYOUT.aisle, lavL, [11.0, 14.0, 14.3, 15.9, 19.4]),
    walk('28G', 'senior', 52, LAYOUT.aisle, lavR, [30.8, 34.0, 34.3, 35.8, 38.5]),
    walk('26D', 'woman', 53, -LAYOUT.aisle, lavL, [32.0, 35.0, 35.3, 36.5, 38.9]),
  ];
  const special = new Set([...family.map((p) => p.userData.seat.key), ...walkers.map((w) => w.seat.key)]);

  // cabin crew: A works business; B, C bring drinks aft; D, E bring meals forward. See §4.
  const crew = ['A', 'B', 'C', 'D', 'E'].map((id, i) => who('attendant', 60 + i, { id }));
  const sitKey = (t, j) => { const [x, z, yaw] = jumpSpot(j); return [t, x, z, 'sit', yaw]; };
  const standKey = (t, j, mode = 'idle', yaw = 0) => { const [x, z] = standSpot(j); return [t, x, z, mode, yaw]; };
  const bizServe = (t0) => LAYOUT.biz.rows.flatMap((x, i) => [[t0 + i * 1.7, x + 0.3, -1.2, 'serve', i % 2 ? LOOK.pz : LOOK.nz], [t0 + i * 1.7 + 1.2, x + 0.3, -1.2, 'serve', i % 2 ? LOOK.pz : LOOK.nz]]);
  const A = track([
    sitKey(0, 0), sitKey(11.0, 0), standKey(11.4, 0), [11.8, 16.6, -1.75, 'pour', LOOK.px], [13.3, 16.6, -1.75, 'pour', LOOK.px],
    ...bizServe(14.0), [22.4, 16.6, -1.75, 'pour', LOOK.px], [24.6, 16.6, -1.75, 'pour', LOOK.px], ...bizServe(25.2),
    [33.6, 16.6, -1.75, 'idle', LOOK.px], [37.8, 16.6, -1.75, 'idle', LOOK.px], standKey(38.1, 0), sitKey(38.4, 0), sitKey(40.4, 0), standKey(40.7, 0), [41.0, 15.2, -1.2, 'idle', LOOK.nx], [42.6, 5.2, -1.2, 'idle', LOOK.px], [43.1, 5.2, -1.2, 'idle', LOOK.px],
    [44.5, 15.2, -1.2, 'idle', 0], standKey(44.9, 0), sitKey(45.2, 0),
  ]);
  // B and C: mid jump seats → drinks trolleys aft → rear galley → rear jump seats; D and E the other way round
  const side = (c) => (c === 'L' ? -1 : 1);
  const drinkStops = [2.6, ...LAYOUT.prem.rows.map((x) => x + 0.35), ...LAYOUT.eco.rows.map((x) => x + 0.35), -14.3];
  const mealStops = [-14.3, ...[...LAYOUT.eco.rows].reverse().map((x) => x + 0.3), ...[...LAYOUT.prem.rows].reverse().map((x) => x + 0.3), 2.2];
  // off the trolley: the trolley run itself (runFrom … parked) is drawn from the trolley, see update()
  const crewOff = (c, home, far, j0, j1, runFrom, parked) => {
    const s = side(c), face = (x) => (x > 0 ? LOOK.px : LOOK.nx);
    return track([
      sitKey(0, j0), sitKey(11.0, j0), standKey(11.3, j0), [11.7, home, s * 0.95, 'pour', face(home)], [runFrom, home, s * 0.95, 'pour', face(home)],
      [parked, far, s * 0.95, 'pour', face(far)], [38.0, far, s * 0.95, 'idle', far > 0 ? LOOK.px : LOOK.nx], standKey(38.3, j1), sitKey(38.6, j1), sitKey(40.6, j1), standKey(40.9, j1),
      [41.3, far > 0 ? 2.3 : -14.6, s * LAYOUT.aisle, 'idle', 0], [42.7, far > 0 ? -5.0 : -8.0, s * LAYOUT.aisle, 'idle', LOOK.nx], [43.1, far > 0 ? -5.0 : -8.0, s * LAYOUT.aisle, 'idle', LOOK.nx],
      [44.5, far > 0 ? 2.3 : -14.6, s * LAYOUT.aisle, 'idle', 0], standKey(44.9, j1), sitKey(45.2, j1),
    ]);
  };
  // trolleys: drinks 13.6–22 aft, then parked in the rear galley; meals 21.6–30 forward, parked in the middle galley
  const carts = {
    dL: add(G.trolley({ kind: 'drinks' })), dR: add(G.trolley({ kind: 'drinks' })),
    mL: add(G.trolley({ kind: 'meals' })), mR: add(G.trolley({ kind: 'meals' })),
  };
  for (const c of Object.values(carts)) { c.visible = false; c.userData.keep = true; }
  const crewSched = {
    B: { off: crewOff('L', 3.1, -16.6, 2, 4, 13.6, 22.6), cart: 'dL', c: 'L', run: [14, 22, drinkStops], park: [22, 22.6, -16.7], show: [13.6, 40], dir: -1 },
    C: { off: crewOff('R', 3.1, -16.6, 3, 5, 13.6, 22.6), cart: 'dR', c: 'R', run: [14, 22, drinkStops], park: [22, 22.6, -16.7], show: [13.6, 40], dir: -1 },
    D: { off: crewOff('L', -16.6, 3.1, 4, 2, 21.4, 30.6), cart: 'mL', c: 'L', run: [21.8, 30, mealStops], park: [30, 30.6, 3.2], show: [21.6, 40], dir: 1 },
    E: { off: crewOff('R', -16.6, 3.1, 5, 3, 21.4, 30.6), cart: 'mR', c: 'R', run: [21.8, 30, mealStops], park: [30, 30.6, 3.2], show: [21.6, 40], dir: 1 },
  };
  // when the meal trolley reaches each row on each side
  const servedAt = {};
  for (const c of ['L', 'R']) mealStops.slice(1, -1).forEach((x, i) => { servedAt[`${x.toFixed(2)}${c}`] = reachedAt(21.8, 30, mealStops, i + 1); });
  const mealTime = (s) => servedAt[`${(s.x + 0.3).toFixed(2)}${s.aisle}`];

  // ---------- per frame ----------
  const seatMode = (s, t, p) => {
    const id = p.userData.id;
    if (s.eating) return 'sitEat';
    if (between(t, 33.5, 38) && id !== 'dad') return id ? 'sitSleep' : 'sitWatch';
    if (id === 'hana') return t < 11 || t >= 38 ? 'sitWindow' : 'sitWatch';
    if (id === 'mum') return t >= 38 ? 'sit' : 'sitRead';
    return t >= 38 ? 'sit' : 'sitWatch';
  };
  function update(t, dt, at = t) {
    t = Math.max(0, Math.min(T, t));
    setMood(moodAt(t));
    tickMood(dt);
    tickScreens(at, homeward ? 1 - t / T : t / T);
    beltMat.emissiveIntensity = beltsOn(t) ? 1.6 : 0.1;
    // turbulence: a small shake
    const bump = between(t, 38, 40.5) ? Math.sin((t - 38) / 2.5 * Math.PI) : 0;
    root.rotation.x = bump * Math.sin(at * 19) * 0.004;
    root.rotation.z = bump * Math.sin(at * 13 + 1) * 0.003;
    root.position.y = bump * Math.sin(at * 23) * 0.02;
    // galleys heat the meals; lavatories show who is inside
    for (const gl of galleys) gl.userData.state.ovens = between(t, 17, 24) ? 1 : 0;
    const inside = (l) => walkers.some((w) => w.lav === l && between(t, ...w.inside));
    for (const l of Object.values(lav)) Object.assign(l.userData.state, { occupied: inside(l), door: 0 });
    // shades: closed at night, a few against the sun; all up for landing
    sec.userData.windows.forEach((w, i) => {
      const hw = hash(`w${i}`);
      sec.userData.setShade(i, (between(t, 30.5 + hw * 2, 40.2) && hw < 0.65) || (between(t, 12, 22) && hw < 0.12) ? 1 : 0);
    });
    // seats, meals, filler passengers
    for (const s of seats) {
      const sleeping = s.occ && s.h < 0.38 && between(t, 30.5 + s.h * 6, 39.5);
      const leaning = s.occ && s.h >= 0.38 && s.h < 0.55 && (between(t, 12, 21.5) || between(t, 31, 39.5));
      if (s.cls === 'biz') {
        inst.biz.set(s.idx, { recline: sleeping ? 1 : leaning ? 0.35 : 0, door: sleeping || (s.occ && s.h2 < 0.25 && between(t, 30, 39.5)) ? 1 : 0 });
        inst.biz.screen(s.idx, 0, !s.occ || sleeping ? 'off' : s.screenPref);
        crowd.pose(s.ci, !s.occ ? 'gone' : sleeping ? 'lie' : 'up');
        continue;
      }
      const I = inst[s.cls];
      const recl = sleeping ? 1 : leaning ? 0.7 : 0;
      I.set(s.idx, s.cls === 'prem' ? { recline0: recl, legrest0: recl } : { recline0: recl });
      // the meal: from when the trolley reaches the row until collected (front rows first)
      const served = mealTime(s);
      const on = s.occ && served !== undefined && between(t, served + 0.3, 33.4 + (s.x + 14) * 0.03);
      meals.show(s.meal, on);
      meals.set(s.meal, { lid: on && t > served + 1.4 ? 1 : 0 });
      s.eating = on;
      crowd.pose(s.ci, !s.occ || special.has(s.key) ? 'gone' : sleeping ? 'sleep' : leaning ? 'lean' : 'up');
    }
    for (const s of mealSeats) {
      // my table is down while the person behind me eats; my screen shows what they watch
      const behind = bySeat[`${LAYOUT[s.cls].first + s.row + 1}${s.letter}`];
      inst[s.cls].set(s.idx, { tray0: behind?.eating ? 1 : 0 });
      inst[s.cls].screen(s.idx, 0, behind?.occ ? (behind.h < 0.38 && between(t, 31 + behind.h * 6, 39.5) ? 'off' : behind.screenPref) : 'map');
    }
    for (const i of Object.values(inst)) i.update(dt);
    meals.update(dt);
    // people
    for (const p of family) sitAt(p, p.userData.seat, seatMode(p.userData.seat, t, p));
    for (const w of walkers) {
      const k = w.at(t);
      w.p.visible = k.mode !== 'HIDE';
      w.p.position.set(k.x, 0, k.z);
      w.p.rotation.y = k.yaw ?? 0;
      w.p.userData.mode = k.mode === 'SEAT' ? (w.seat.eating ? 'sitEat' : between(t, 30, 38) ? 'sitWatch' : 'sitRead') : k.mode === 'HIDE' ? 'idle' : k.mode;
    }
    const pos = (p, k) => { p.position.set(k.x, 0, k.z); p.rotation.y = k.yaw ?? 0; p.userData.mode = k.mode; };
    pos(crew[0], A(t));
    for (const id of ['B', 'C', 'D', 'E']) {
      const sc = crewSched[id], p = crew['ABCDE'.indexOf(id)], cart = carts[sc.cart], z = side(sc.c) * LAYOUT.aisle;
      cart.visible = between(t, ...sc.show);
      const [r0, r1, stops] = sc.run, [p0, p1, px] = sc.park;
      let cx, moving;
      if (t < r0) { cx = stops[0]; moving = false; cart.position.set(cx, 0, z); }
      else if (t < r1) { ({ x: cx, moving } = cartRun(t, r0, r1, stops)); cart.position.set(cx, 0, z); }
      else { const k = smooth(Math.min(1, (t - p0) / (p1 - p0))); cart.position.set(stops.at(-1) + (px - stops.at(-1)) * k, 0, z + (side(sc.c) * 0.45 - z) * k); moving = t < p1; cx = cart.position.x; }
      if (between(t, r0 - 0.4, p1)) { // working the trolley
        p.position.set(cart.position.x - sc.dir * 0.55, 0, cart.position.z);
        p.rotation.y = moving ? (sc.dir < 0 ? LOOK.nx : LOOK.px) : (sc.c === 'L' ? LOOK.nz : LOOK.pz);
        p.userData.mode = moving ? 'push' : 'serve';
      } else pos(p, sc.off(t));
    }
    for (const p of pilots) p.userData.mode = p === pilots[0] && Math.sin(at * 0.2) > 0.6 ? 'sitSip' : 'sit';
    for (const o of live) o.userData.update(at, dt);
    for (const p of chars) p.userData.update(at);
  }

  // everything that never moves becomes a few meshes (pivots, characters, trolleys and instances stay apart)
  for (const p of chars) p.userData.keep = true;
  bakeStatic(g);
  root.userData = { kind: 'cabinKit', update, seats, bySeat, inst, meals, crowd, crew, family, walkers, carts, lav, section: sec };
  update(0, 1 / 60);
  return root;
}

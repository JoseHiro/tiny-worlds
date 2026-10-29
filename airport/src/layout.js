// Airport layout v2: six stands, a two-storey terminal (departures 2F / arrivals 1F),
// an elevated departures drive. +X = east, +Z = south (landside).
//
//   z -40 ┌──────────────────────────────── grass ─────────────────────────────────┐
//   z -30 │ ══════════════════════════ runway 09/27 ════════════════════════════ │
//   z -19 │   ╚═══════════════════════ taxiway A ══════════════════════════╝      │
//   z  -4 │ hangar   ✈A1   ✈A2   ✈A3   ✈A4   ✈A5   ✈A6        GSE depot         │
//   z   9 │ ──────────────── service lanes (east ↓ / west ↑) ──────────────────── │
//   z  12 │        ┌═══ arrivals corridor R6 (2F) ════════ ⇣esc ┐   tower         │
//   z  21 │        │  gates R4 ×6 (2F)                         │                 │
//   z  32 │        │ R1  R1  R2  R3  R3   │ void → R7 R9 (1F)  │                 │
//   z  38 │        └───────────────────────────────────────────┘                 │
//   z  41 │   ramp ════════ elevated departures drive (2F) ════════ ramp         │
//   z  45 │          ─────── arrivals curb (1F) ───────                          │
//   z  50 │ ══════════════════════════════ road ═══════════════════════════════ │
//   z  66 └ fuel farm ─────────────────────────────────────────────── parking ───┘
import * as THREE from 'three';

export const SLAB = { x0: -110, x1: 110, z0: -40, z1: 69 };

export const RUNWAY = { z: -30, x0: -102, x1: 102, w: 7 };
export const TAXI = { z: -19, w: 3.6, west: -92, east: 92, mid: 0 };
export const HOLD_Z = -22.6; // departures stop here until the runway is theirs
export const TOUCHDOWN_X = -82;
export const LINEUP_X = -80;

export const APRON = { x0: -86, x1: 108, z0: -17.2, z1: 11.2 };
export const PARK_Z = -4; // parked aircraft centre → nose at z = 3, tail at z = -11
export const LANE = { east: 8.6, west: 10.3 }; // one-way service lanes

// Terminal: two floors of person-scale rooms (each room kit is 15 × 11).
export const FLOOR = { f1: 0, f2: 3.0, roof: 6.4 };
// room kits sit a hair above their floor plate so the two floor surfaces never z-fight
const RY1 = FLOOR.f1 + 0.04, RY2 = FLOOR.f2 + 0.02;
export const TERMINAL = { x0: -61, x1: 61, z0: 11.6, z1: 40.6 };
// corridor = arrivals only (2F, airside edge); concourse = departures walkway between the halls and the gates
export const BANDS = { corridor: [11.6, 15.6], gates: [15.6, 26.6], concourse: [26.6, 29.6], south: [29.6, 40.6] };
export const VOID = { x0: 14, x1: 61 }; // 2F south band has no floor here: the 1F halls show through
export const TOWER = { x: 76, z: 22 };
export const HANGAR = { x0: -108, x1: -88, z0: -8, z1: 14 }; // the maintenance hangar, door facing east (hangar.js)

export const STANDS = [-45, -27, -9, 9, 27, 45].map((x, i) => ({ id: `A${i + 1}`, x }));

// Room placement. Every room kit is 15 × 11, centred on (x, z), at floor height y.
const S = (BANDS.south[0] + BANDS.south[1]) / 2;
export const ROOMS = {
  gates: STANDS.map((s) => ({ stand: s.id, x: s.x - 7.7, z: (BANDS.gates[0] + BANDS.gates[1]) / 2, y: RY2 })),
  checkIn: [{ x: -53.5, z: S, y: RY2, label: 'A' }, { x: -38.5, z: S, y: RY2, label: 'B' }],
  security: { x: -23.5, z: S, y: RY2 },
  lounges: [{ x: -8.5, z: S, y: RY2 }, { x: 6.5, z: S, y: RY2 }],
  sorting: { x: -46, z: S, y: RY1 },
  claim: { x: 22, z: S, y: RY1 },
  lobby: { x: 40, z: S, y: RY1 },
  immigration: { x: 40, z: (BANDS.gates[0] + BANDS.gates[1]) / 2, y: RY1 }, // 1F, under the gates
};
// arrivals corridor east end → escalator down (toward +X) into the 1F back-of-house hall
export const ESCALATOR = { topX: 46.5, z: (BANDS.corridor[0] + BANDS.corridor[1]) / 2 };

// Ground-support equipment depot: vehicles park nose-north at z = -3.
export const DEPOT = {
  homeZ: -3,
  backZ: -12, // return lane behind the depot
  loopX: 106, // east edge where lanes turn back into the depot
  slots: {
    fuel: [62, 64.3, 66.6, 68.9, 71.2, 73.5],
    baggage: [76.4, 78.4, 80.4, 82.4, 84.4, 86.4],
    tug: [89, 91.6, 94.2, 96.8, 99.4, 102],
  },
};

// Landside
export const DECK = { y: FLOOR.f2, z0: 41.8, z1: 46.0, x0: -61, x1: 61, rampLen: 30 };
export const CURB = { z: 48.6, lane: [47.4, 49.8], sidewalk: [46.4, 47.4] };
export const ROAD = { west: 53, east: 55.6, z0: 51.4, z1: 57.2 };
export const RANK_X = 54, BUS_X = 24; // taxi rank and bus stop on the arrivals curb
export const DOORS = { f2: [-57.5, -50.5, -42.5, -35.5], f1: [26.2, 33, 39, 46] }; // f2 = check-in hall entrances
export const PARKING = { x0: 30, x1: 104, z0: 59.4, z1: 67.6 };
export const FUEL_FARM = { x0: -106, x1: -84, z0: 59.4, z1: 67.6 };

export const v = (x, z, y = 0) => new THREE.Vector3(x, y, z);

// Polyline with every corner replaced by a quadratic curve of (at most) `radius`.
export function roundedPath(points, radius) {
  const path = new THREE.CurvePath();
  let prev = points[0].clone();
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const r = Math.min(radius, a.distanceTo(b) / 2, b.distanceTo(c) / 2);
    const p1 = b.clone().add(a.clone().sub(b).setLength(r));
    const p2 = b.clone().add(c.clone().sub(b).setLength(r));
    if (prev.distanceTo(p1) > 1e-3) path.add(new THREE.LineCurve3(prev, p1));
    if (r > 1e-3) path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
    prev = p2;
  }
  const last = points.at(-1).clone();
  if (prev.distanceTo(last) > 1e-3) path.add(new THREE.LineCurve3(prev, last));
  return path;
}

// ---------- aircraft routes ----------

export const routes = {
  arrival: (s) => [v(TOUCHDOWN_X, RUNWAY.z), v(TAXI.east, RUNWAY.z), v(TAXI.east, TAXI.z), v(s.x, TAXI.z), v(s.x, PARK_Z)],
  pushback: (s) => [v(s.x, PARK_Z), v(s.x, TAXI.z), v(s.x + 10, TAXI.z)],
  taxiOut: (s) => [v(s.x + 10, TAXI.z), v(TAXI.west, TAXI.z), v(TAXI.west, RUNWAY.z), v(LINEUP_X, RUNWAY.z)],
};

// ---------- ground vehicle routes (start point = vehicle's current position) ----------

const colOut = (s) => s.x + 8.2; // southbound gap east of the stand
const colIn = (s) => s.x + 9.9; // northbound gap
const homeLoop = (homeX) => [v(DEPOT.loopX, LANE.east), v(DEPOT.loopX, DEPOT.backZ), v(homeX, DEPOT.backZ), v(homeX, DEPOT.homeZ)];
const leaveDepot = (homeX) => [v(homeX, LANE.west)];

export const STAND_SPOTS = {
  fuel: (s) => v(s.x + 5.2, PARK_Z + 2.7),
  baggage: (s) => v(s.x + 2.4, PARK_Z - 4),
  tug: (s) => v(s.x, PARK_Z + 7 + 3.45), // tow bar tip touches the nose gear
  marshaller: (s) => v(s.x + 2.8, PARK_Z + 8.6),
  crewDoor: (s) => v(s.x + 3.5, TERMINAL.z0 - 0.3),
  crewNose: (s) => v(s.x + 1.4, PARK_Z + 5.8),
  crewHold: (s) => v(s.x + 1.8, PARK_Z - 2.8),
  mechDoor: (s) => v(s.x - 5.5, TERMINAL.z0 - 0.3), // the line mechanic keeps to the west side (DESIGN.md §12.2)
};

export const gse = {
  fuelOut: (s, homeX) => [...leaveDepot(homeX), v(colOut(s), LANE.west), v(colOut(s), PARK_Z + 2.7), STAND_SPOTS.fuel(s)],
  fuelBack: (s, homeX) => [v(s.x + 3.6, PARK_Z + 4.9), v(colIn(s), PARK_Z + 4.9), v(colIn(s), LANE.east), ...homeLoop(homeX)],
  baggageOut: (s, homeX) => [...leaveDepot(homeX), v(colOut(s), LANE.west), v(colOut(s), PARK_Z - 4), STAND_SPOTS.baggage(s)],
  baggageBack: (s, homeX) => [v(s.x + 0.8, PARK_Z - 6.2), v(colIn(s), PARK_Z - 6.2), v(colIn(s), LANE.east), ...homeLoop(homeX)],
  tugOut: (s, homeX) => [...leaveDepot(homeX), v(s.x + 3.5, LANE.west), STAND_SPOTS.tug(s)],
  tugBack: (s, homeX) => [v(s.x + 0.5, TAXI.z + 3), v(s.x + 0.5, LANE.east), ...homeLoop(homeX)],
};

// ---------- landside ----------

const y2 = DECK.y;
const deckZ = (DECK.z0 + DECK.z1) / 2;
export const roadRoutes = {
  // departures: up the east ramp, along the elevated deck, down the west ramp
  departures: [
    v(114, ROAD.west), v(DECK.x1 + DECK.rampLen + 6, ROAD.west), v(DECK.x1 + DECK.rampLen, deckZ),
    v(DECK.x1, deckZ, y2), v(DECK.x0, deckZ, y2), v(DECK.x0 - DECK.rampLen, deckZ),
    v(DECK.x0 - DECK.rampLen - 6, ROAD.west), v(-114, ROAD.west),
  ],
  // arrivals pick-up curb on the ground floor
  arrivals: [v(114, ROAD.west), v(66, ROAD.west), v(60, CURB.z), v(14, CURB.z), v(8, ROAD.west), v(-114, ROAD.west)],
  eastbound: [v(-114, ROAD.east), v(114, ROAD.east)],
};

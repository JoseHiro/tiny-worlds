// Static world: the diorama slab, painted ground, buildings, lights, trees.
// Also the jet bridges (extended / retracted by the simulation).
// The terminal's interior and its cutaway modes live in terminal.js.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PALETTE, mat, mesh, rbox, box, cyl, car } from './parts.js';
import { bakeStatic } from './merge.js';
import { hangarScene, lightPools } from './hangar.js';
import * as L from './layout.js';

const { v } = L;

// Materials whose emissive glow follows the time of day: { material, day, night }.
export const glow = [];
export function glowMat(color, emissive, day, night, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: day, roughness: 0.5, ...opts });
  glow.push({ material: m, day, night });
  return m;
}

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// ---------- painted ground ----------

const PX = 16; // canvas pixels per world unit

function paintGround() {
  const W = (L.SLAB.x1 - L.SLAB.x0) * PX;
  const H = (L.SLAB.z1 - L.SLAB.z0) * PX;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const X = (x) => (x - L.SLAB.x0) * PX;
  const Z = (z) => (z - L.SLAB.z0) * PX;
  const rect = (x0, z0, x1, z1, color, r = 0) => {
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(X(x0), Z(z0), (x1 - x0) * PX, (z1 - z0) * PX, r * PX);
    g.fill();
  };
  const stroke = (pts, w, color, { dash, cap = 'butt' } = {}) => {
    g.strokeStyle = color;
    g.lineWidth = w * PX;
    g.lineCap = cap;
    g.lineJoin = 'round';
    g.setLineDash(dash ? dash.map((d) => d * PX) : []);
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(X(p.x), Z(p.z)) : g.moveTo(X(p.x), Z(p.z))));
    g.stroke();
    g.setLineDash([]);
  };
  const curve = (points, radius) => L.roundedPath(points, radius).getSpacedPoints(200);
  const text = (s, x, z, size, color, rot = 0, weight = 700) => {
    g.save();
    g.translate(X(x), Z(z));
    g.rotate(rot);
    g.fillStyle = color;
    g.font = `${weight} ${size * PX}px Inter, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(s, 0, 0);
    g.restore();
  };

  const C = {
    grass: '#b7cd96', grass2: '#afc68d', concrete: '#dcd6cb', joint: '#cec8bc', lane: '#d2ccc0',
    asphalt: '#596070', runway: '#4a4f5b', road: '#676c78', white: '#f6f3ec', yellow: '#efc04a',
    red: '#d65a45', plaza: '#e7e1d6', gravel: '#d3c8b2',
  };

  g.fillStyle = C.grass;
  g.fillRect(0, 0, W, H);
  for (let x = L.SLAB.x0; x < L.SLAB.x1; x += 8) rect(x, L.SLAB.z0, x + 4, L.SLAB.z1, C.grass2);

  // apron, hangar apron, depot, tower plaza
  rect(L.APRON.x0, L.APRON.z0, L.APRON.x1, L.APRON.z1, C.concrete, 1.2);
  rect(L.HANGAR.x0 - 2, L.HANGAR.z0 - 2, L.APRON.x0 + 1, L.HANGAR.z1 + 1, C.concrete, 1);
  rect(L.TOWER.x - 8, L.APRON.z1 - 1, L.TOWER.x + 8, L.TOWER.z + 8, C.concrete, 1);
  for (let x = L.APRON.x0 + 6; x < L.APRON.x1; x += 6) stroke([v(x, L.APRON.z0), v(x, L.APRON.z1)], 0.06, C.joint);
  for (let z = L.APRON.z0 + 6; z < L.APRON.z1; z += 6) stroke([v(L.APRON.x0, z), v(L.APRON.x1, z)], 0.06, C.joint);

  // service lanes
  rect(L.APRON.x0, L.LANE.east - 1.25, L.APRON.x1, L.LANE.west + 0.95, C.lane);
  for (const z of [L.LANE.east - 1.2, L.LANE.west + 0.9]) stroke([v(L.APRON.x0 + 1, z), v(L.APRON.x1 - 1, z)], 0.1, C.white);
  stroke([v(L.APRON.x0 + 1, (L.LANE.east + L.LANE.west) / 2), v(L.APRON.x1 - 1, (L.LANE.east + L.LANE.west) / 2)], 0.1, C.white, { dash: [1.2, 1.2] });
  for (const s of L.STANDS) {
    const x = s.x + 3.5;
    for (let i = 0; i < 6; i++) rect(x - 0.9, L.LANE.east - 1.1 + i * 0.6, x + 0.9, L.LANE.east - 0.85 + i * 0.6, C.white);
  }

  // taxiways, runway
  const taxiNet = [
    [v(L.TAXI.west, L.RUNWAY.z), v(L.TAXI.west, L.TAXI.z), v(L.TAXI.east, L.TAXI.z), v(L.TAXI.east, L.RUNWAY.z)],
    [v(L.TAXI.mid, L.TAXI.z), v(L.TAXI.mid, L.RUNWAY.z)],
  ];
  for (const pts of taxiNet) stroke(pts, L.TAXI.w, C.asphalt, { cap: 'round' });
  const rz = L.RUNWAY.z, hw = L.RUNWAY.w / 2;
  rect(L.RUNWAY.x0, rz - hw, L.RUNWAY.x1, rz + hw, C.runway, 0.4);
  for (const z of [rz - hw + 0.35, rz + hw - 0.35]) stroke([v(L.RUNWAY.x0 + 0.5, z), v(L.RUNWAY.x1 - 0.5, z)], 0.14, C.white);
  stroke([v(L.RUNWAY.x0 + 9, rz), v(L.RUNWAY.x1 - 9, rz)], 0.2, C.white, { dash: [3, 2] });
  for (const [x0, dir] of [[L.RUNWAY.x0 + 1, 1], [L.RUNWAY.x1 - 1, -1]]) {
    for (let i = 0; i < 10; i++) {
      const z = rz - hw + 0.8 + i * 0.6 + (i >= 5 ? 0.3 : 0);
      rect(Math.min(x0, x0 + dir * 3.6), z, Math.max(x0, x0 + dir * 3.6), z + 0.32, C.white);
    }
    const ax = x0 + dir * 15;
    for (const s of [-1, 1]) rect(Math.min(ax, ax + dir * 4), rz + s * 1.4 - 0.4, Math.max(ax, ax + dir * 4), rz + s * 1.4 + 0.4, C.white);
    for (const k of [22, 28, 34]) {
      const tx = x0 + dir * k;
      for (const s of [-1, 1]) for (const o of [0.9, 1.5]) rect(Math.min(tx, tx + dir * 2.4), rz + s * o - 0.13, Math.max(tx, tx + dir * 2.4), rz + s * o + 0.13, C.white);
    }
  }
  text('09', L.RUNWAY.x0 + 7, rz, 2.6, C.white, Math.PI / 2);
  text('27', L.RUNWAY.x1 - 7, rz, 2.6, C.white, -Math.PI / 2);

  // centrelines, lead-in lines, stands
  stroke(curve(taxiNet[0], 5), 0.14, C.yellow);
  stroke(taxiNet[1], 0.14, C.yellow);
  for (const s of L.STANDS) {
    stroke(curve([v(s.x + 14, L.TAXI.z), v(s.x, L.TAXI.z), v(s.x, L.PARK_Z + 7.3)], 5), 0.14, C.yellow);
    rect(s.x - 1.2, L.PARK_Z + 7.2, s.x + 1.2, L.PARK_Z + 7.45, C.white);
    text(s.id, s.x + 3.4, L.PARK_Z + 5.6, 1.5, C.yellow);
    g.strokeStyle = C.red;
    g.lineWidth = 0.12 * PX;
    g.setLineDash([0.6 * PX, 0.4 * PX]);
    g.strokeRect(X(s.x - 7.4), Z(L.PARK_Z - 7.6), 14.8 * PX, 14.6 * PX);
    g.setLineDash([]);
  }
  for (const x of [L.TAXI.west, L.TAXI.mid, L.TAXI.east]) {
    for (const [o, dash] of [[0, null], [0.3, null], [0.75, [0.5, 0.4]], [1.05, [0.5, 0.4]]]) {
      stroke([v(x - L.TAXI.w / 2, L.HOLD_Z - o), v(x + L.TAXI.w / 2, L.HOLD_Z - o)], 0.12, C.yellow, { dash });
    }
  }
  const slots = Object.values(L.DEPOT.slots).flat().sort((a, b) => a - b);
  for (const x of slots) stroke([v(x - 1.1, L.DEPOT.homeZ - 5.6), v(x - 1.1, L.DEPOT.homeZ + 2.4)], 0.08, C.white);
  text('GSE', 80, L.DEPOT.homeZ + 4.2, 1.4, C.white);

  // landside: plaza under the deck, arrivals curb, road, parking, fuel farm
  rect(L.TERMINAL.x0 - 2, L.TERMINAL.z1, L.TERMINAL.x1 + 2, L.CURB.lane[0], C.plaza);
  stroke(curve(L.roadRoutes.arrivals.slice(1, -1), 4), L.CURB.lane[1] - L.CURB.lane[0], C.road);
  rect(L.SLAB.x0, L.ROAD.z0, L.SLAB.x1, L.ROAD.z1, C.road);
  for (const z of [L.ROAD.z0 + 0.2, L.ROAD.z1 - 0.2]) stroke([v(L.SLAB.x0, z), v(L.SLAB.x1, z)], 0.12, C.white);
  stroke([v(L.SLAB.x0, (L.ROAD.west + L.ROAD.east) / 2), v(L.SLAB.x1, (L.ROAD.west + L.ROAD.east) / 2)], 0.12, C.white, { dash: [2, 1.6] });
  const deckZ = (L.DECK.z0 + L.DECK.z1) / 2;
  for (const sgn of [1, -1]) { // ramp footprints + their link to the road
    const x0 = sgn > 0 ? L.DECK.x1 : L.DECK.x0;
    stroke([v(x0, deckZ), v(x0 + sgn * L.DECK.rampLen, deckZ), v(x0 + sgn * (L.DECK.rampLen + 6), L.ROAD.west)], 3.6, C.road, { cap: 'round' });
  }
  text('ARRIVALS · PICK UP', 37, L.CURB.z, 0.9, C.white);
  for (let i = 0; i < 5; i++) rect(30 + i * 0.6, L.CURB.lane[0], 30.3 + i * 0.6, L.CURB.lane[1], C.white);
  rect(L.PARKING.x0, L.PARKING.z0, L.PARKING.x1, L.PARKING.z1, C.road, 0.6);
  for (let x = L.PARKING.x0 + 1; x <= L.PARKING.x1 - 1; x += 2.4) {
    stroke([v(x, L.PARKING.z0 + 0.3), v(x, L.PARKING.z0 + 2.6)], 0.08, C.white);
    stroke([v(x, L.PARKING.z1 - 2.6), v(x, L.PARKING.z1 - 0.3)], 0.08, C.white);
  }
  rect(L.FUEL_FARM.x0, L.FUEL_FARM.z0, L.FUEL_FARM.x1, L.FUEL_FARM.z1, C.gravel, 0.6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------- slab ----------

function slab(scene) {
  const w = L.SLAB.x1 - L.SLAB.x0, d = L.SLAB.z1 - L.SLAB.z0;
  const cx = (L.SLAB.x0 + L.SLAB.x1) / 2, cz = (L.SLAB.z0 + L.SLAB.z1) / 2;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: paintGround(), roughness: 0.95 }));
  top.rotation.x = -Math.PI / 2;
  top.position.set(cx, 0, cz);
  top.receiveShadow = true;
  scene.add(top);
  const layers = [[0.35, '#7da35c'], [1.6, '#8a6a4c'], [1.0, '#d6c39a'], [1.9, '#6f5a47']];
  let y = -0.01;
  for (const [h, color] of layers) {
    const m = mesh(new RoundedBoxGeometry(w, h, d, 2, 0.12), mat(color, { roughness: 1 }), cx, y - h / 2, cz);
    m.castShadow = false;
    scene.add(m);
    y -= h;
  }
}

// ---------- outbuildings ----------

function controlTower(group) {
  const { x, z } = L.TOWER;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(rbox(7, 3, 6, 0.2, mat(PALETTE.white), 0, 1.5, 0));
  g.add(box(7.02, 0.5, 6.02, glowMat(0x3a4a63, 0xffc983, 0, 0.7, { roughness: 0.2 }), 0, 2.0, 0));
  g.add(cyl(1.3, 1.5, 15, mat(PALETTE.white), 0, 10.5, 0, 20));
  g.add(cyl(1.8, 1.3, 1.0, mat(PALETTE.white), 0, 18.3, 0, 8));
  g.add(cyl(2.7, 2.1, 2.1, glowMat(0x2c3a57, 0x9fd2ff, 0.05, 0.9, { roughness: 0.1, metalness: 0.4 }), 0, 19.8, 0, 8));
  g.add(cyl(2.9, 2.9, 0.3, mat(PALETTE.orange), 0, 21.0, 0, 8));
  g.add(cyl(1.8, 2.7, 0.5, mat(PALETTE.white), 0, 21.4, 0, 8));
  g.add(cyl(0.06, 0.06, 2.4, mat(PALETTE.grey), 0.6, 22.8, 0, 6));
  group.add(g);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: PALETTE.red, emissive: PALETTE.red, emissiveIntensity: 2 }));
  beacon.position.set(x + 0.6, 24.1, z);
  const radar = new THREE.Group();
  radar.position.set(x - 2, 3.2, z);
  radar.add(cyl(0.15, 0.25, 1.2, mat(PALETTE.grey), 0, 0.6, 0, 8));
  const dish = rbox(0.3, 0.5, 2.4, 0.08, mat(PALETTE.white), 0, 1.35, 0);
  const spin = new THREE.Group();
  spin.add(dish);
  radar.add(spin);
  return { beacon, radar, spin };
}

// the maintenance hangar (hangar.js): its building and parked aircraft are baked with the statics; its people and lift move
function hangar(group, scene) {
  const { x0, x1, z0, z1 } = L.HANGAR;
  const pool = glowMat(0x000000, 0xffffff, 0, 0.6, { emissiveMap: lightPools(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const h = hangarScene({ lamp: glowMat(0xfff6dc, 0xfff6dc, 0.5, 2.4), pool });
  for (const o of [h.statics, h.group]) o.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  group.add(h.statics);
  scene.add(h.group);
  return h;
}

function fuelFarm(group) {
  const { x0, x1, z0, z1 } = L.FUEL_FARM;
  const cz = (z0 + z1) / 2;
  for (let i = 0; i < 3; i++) {
    const x = x0 + 4 + i * 7;
    group.add(cyl(2.8, 2.8, 3.6, mat(0xe9e6df, { metalness: 0.2 }), x, 1.8, cz, 28));
    group.add(cyl(2.83, 2.83, 0.4, mat(PALETTE.orange), x, 2.9, cz, 28));
    group.add(cyl(2.7, 2.8, 0.3, mat(PALETTE.grey), x, 3.75, cz, 28));
  }
}

// ---------- departures deck & ramps ----------

function deck(group) {
  const { x0, x1, z0, z1, y, rampLen } = L.DECK;
  const d = z1 - z0, cz = (z0 + z1) / 2;
  const concrete = mat(0xd9d3c8);
  const road = mat(0x676c78, { roughness: 0.9 });
  group.add(box(x1 - x0, 0.4, d, concrete, (x0 + x1) / 2, y - 0.2, cz));
  group.add(box(x1 - x0, 0.02, d - 1.6, road, (x0 + x1) / 2, y + 0.01, cz + 0.6)); // lane
  group.add(box(x1 - x0, 0.06, 1.2, mat(PALETTE.cream), (x0 + x1) / 2, y + 0.03, z0 + 0.6)); // kerb walk at the doors
  group.add(box(x1 - x0, 0.6, 0.15, mat(PALETTE.white), (x0 + x1) / 2, y + 0.3, z1 - 0.08)); // parapet
  group.add(box(x1 - x0, 0.06, 0.17, mat(PALETTE.orange), (x0 + x1) / 2, y + 0.6, z1 - 0.08));
  for (let x = x0 + 4; x <= x1 - 4; x += 10) group.add(cyl(0.35, 0.35, y - 0.4, mat(PALETTE.white), x, (y - 0.4) / 2, z1 - 1.0, 12));
  for (const sgn of [1, -1]) {
    const xs = sgn > 0 ? x1 : x0;
    const len = Math.hypot(rampLen, y);
    const ramp = new THREE.Group();
    ramp.position.set(xs, y, cz);
    ramp.rotation.order = 'YZX';
    ramp.rotation.set(sgn > 0 ? 0 : Math.PI, 0, -Math.atan2(y, rampLen));
    ramp.add(box(len, 0.4, 3.6, concrete, len / 2, -0.2, 0));
    ramp.add(box(len, 0.02, 2.8, road, len / 2, 0.01, 0));
    for (const s of [1, -1]) ramp.add(box(len, 0.5, 0.12, mat(PALETTE.white), len / 2, 0.25, s * 1.74));
    group.add(ramp);
    for (let k = 1; k <= 3; k++) {
      const h = y * (1 - k / 4);
      group.add(cyl(0.25, 0.25, h - 0.3, mat(PALETTE.white), xs + sgn * rampLen * (k / 4), (h - 0.3) / 2, cz, 10));
    }
  }
  const sign = (text, x) => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f2b84b';
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = '#1c2232';
    ctx.font = '700 64px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 30, 66);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.75), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
    m.position.set(x, 6.0, z1 + 0.05);
    group.add(m, cyl(0.08, 0.08, 6 - y, mat(PALETTE.grey), x - 2.6, y + (6 - y) / 2, z1 - 0.1, 6), cyl(0.08, 0.08, 6 - y, mat(PALETTE.grey), x + 2.6, y + (6 - y) / 2, z1 - 0.1, 6));
  };
  sign('出発 Departures  ↑', -45);
  sign('到着 Arrivals ↓ 1F', 37);
}

// ---------- jet bridge ----------

export class JetBridge {
  constructor(scene, stand) {
    const sx = stand.x;
    this.pivot = v(sx - 3.2, L.TERMINAL.z0 - 0.4);
    this.docked = v(sx - 1.95, L.PARK_Z + 5);
    this.parked = v(sx - 4.3, L.PARK_Z + 9.2);
    this.h0 = L.FLOOR.f2;
    this.extend = 0;
    this.target = 0;

    const white = mat(PALETTE.white);
    this.group = new THREE.Group();
    scene.add(this.group);
    this.group.add(cyl(0.35, 0.35, this.h0, mat(PALETTE.grey), this.pivot.x, this.h0 / 2, this.pivot.z, 10));
    this.group.add(cyl(0.95, 0.95, 1.35, white, this.pivot.x, this.h0 + 0.67, this.pivot.z, 20));

    const bodyGeo = new THREE.BoxGeometry(1, 1.2, 1.05).translate(0.5, 0.6, 0);
    const stripeGeo = new THREE.BoxGeometry(1, 0.32, 1.08).translate(0.5, 0.78, 0);
    this.tunnel = new THREE.Group();
    this.tunnel.rotation.order = 'YZX';
    this.tunnel.add(mesh(bodyGeo, white), mesh(stripeGeo, glowMat(0x2c3a57, 0xffd9a0, 0, 0.6, { roughness: 0.2 })));
    this.group.add(this.tunnel);

    this.cab = new THREE.Group();
    this.cab.add(rbox(1.5, 1.4, 1.5, 0.1, white, 0, 0.7, 0));
    this.cab.add(box(0.36, 1.25, 1.3, mat(PALETTE.ink), 0.9, 0.66, 0));
    this.cab.add(box(1.52, 0.1, 1.52, mat(PALETTE.orange), 0, 1.36, 0));
    this.group.add(this.cab);

    this.leg = new THREE.Group();
    for (const s of [1, -1]) this.leg.add(cyl(0.08, 0.08, 1, mat(PALETTE.grey), 0, 0.5, s * 0.35, 6));
    this.legWheels = rbox(0.5, 0.3, 1.0, 0.1, mat(PALETTE.ink), 0, 0.15, 0);
    this.group.add(this.leg, this.legWheels);
    this.layout();
  }

  update(dt) {
    const rate = 0.32;
    this.extend += THREE.MathUtils.clamp(this.target - this.extend, -rate * dt, rate * dt);
    this.layout();
  }

  // where a passenger steps between the cab and the aircraft door
  get cabDoor() { return v(this.docked.x + 0.6, this.docked.z, 1.42); }

  layout() {
    const e = THREE.MathUtils.smootherstep(this.extend, 0, 1);
    const end = this.parked.clone().lerp(this.docked, e);
    const dir = end.clone().sub(this.pivot);
    const dist = dir.length();
    dir.normalize();
    const start = this.pivot.clone().addScaledVector(dir, 0.9);
    const len = dist - 0.9 - 0.75;
    const hEnd = THREE.MathUtils.lerp(2.3, 1.42, e);
    const heading = Math.atan2(-dir.z, dir.x);
    this.tunnel.position.set(start.x, this.h0, start.z);
    this.tunnel.rotation.set(0, heading, Math.atan2(hEnd - this.h0, len));
    this.tunnel.scale.x = Math.hypot(len, hEnd - this.h0);
    const cabPos = start.clone().addScaledVector(dir, len + 0.75);
    this.cab.position.set(cabPos.x, hEnd, cabPos.z);
    this.cab.rotation.y = heading + (0 - heading) * e;
    const legPos = start.clone().addScaledVector(dir, len * 0.8);
    const legH = THREE.MathUtils.lerp(this.h0, hEnd, 0.8);
    this.leg.position.set(legPos.x, 0, legPos.z);
    this.leg.scale.y = legH;
    this.leg.rotation.y = heading;
    this.legWheels.position.set(legPos.x, 0, legPos.z);
    this.legWheels.rotation.y = heading;
  }
}

// ---------- lights, trees, props ----------

function lightsAndPoles(scene, group) {
  const m4 = new THREE.Matrix4();
  const place = (geo, material, pts) => {
    const im = new THREE.InstancedMesh(geo, material, pts.length);
    pts.forEach((p, i) => im.setMatrixAt(i, m4.makeTranslation(p.x, p.y ?? 0.1, p.z)));
    scene.add(im);
    return im;
  };
  const small = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const rz = L.RUNWAY.z, hw = L.RUNWAY.w / 2;
  const edge = [];
  for (let x = L.RUNWAY.x0 + 1; x <= L.RUNWAY.x1 - 1; x += 4) edge.push(v(x, rz - hw - 0.3), v(x, rz + hw + 0.3));
  place(small, glowMat(0xfff7e6, 0xfff1d6, 0.3, 3.0), edge);
  const thrW = [], thrE = [];
  for (let z = rz - hw + 0.4; z <= rz + hw - 0.4; z += 0.9) { thrW.push(v(L.RUNWAY.x0 + 0.3, z)); thrE.push(v(L.RUNWAY.x1 - 0.3, z)); }
  place(small, glowMat(0x7ee0a0, 0x45ff8a, 0.3, 3.2), thrW);
  place(small, glowMat(0xff8a7a, 0xff3b2a, 0.3, 3.2), thrE);
  const approach = [];
  for (let x = L.SLAB.x0 + 0.6; x < L.RUNWAY.x0 - 0.6; x += 1.2) approach.push({ x, y: 0.5, z: rz });
  for (let z = rz - 2.4; z <= rz + 2.4; z += 0.8) approach.push({ x: L.SLAB.x0 + 2.4, y: 0.5, z });
  place(small, glowMat(0xfff7e6, 0xfff1d6, 0.3, 3.4), approach);
  const taxi = [];
  for (let x = L.TAXI.west + 3; x <= L.TAXI.east - 3; x += 5) taxi.push(v(x, L.TAXI.z - L.TAXI.w / 2 - 0.25), v(x, L.TAXI.z + L.TAXI.w / 2 + 0.25));
  for (const x of [L.TAXI.west, L.TAXI.mid, L.TAXI.east]) for (let z = L.RUNWAY.z + hw + 1.5; z < L.TAXI.z - 2; z += 3) taxi.push(v(x - 2.05, z), v(x + 2.05, z));
  place(small, glowMat(0x7aa8ff, 0x3a7bff, 0.25, 3.0), taxi);

  const poleMat = mat(PALETTE.grey);
  const headMat = glowMat(0xf7f2e6, 0xfff0cc, 0.1, 3.0);
  // apron floodlights on the terminal roof edge, and two masts over the depot / hangar apron
  for (const s of L.STANDS) group.add(box(1.6, 0.3, 0.6, headMat, s.x, L.FLOOR.roof + 0.5, L.TERMINAL.z0 - 0.6));
  for (const [x, z] of [[80, -14], [-80, 10]]) {
    group.add(cyl(0.14, 0.18, 10, poleMat, x, 5, z, 8), box(1.6, 0.3, 0.6, headMat, x, 10, z));
  }
  for (let x = -100; x <= 100; x += 16) group.add(cyl(0.1, 0.12, 4.4, poleMat, x, 2.2, L.ROAD.z0 - 0.7, 8), box(0.7, 0.2, 0.4, headMat, x, 4.4, L.ROAD.z0 - 0.7));

  const sock = new THREE.Group();
  sock.position.set(6, 3.4, L.RUNWAY.z - 6.5);
  group.add(cyl(0.06, 0.06, 3.4, poleMat, 6, 1.7, L.RUNWAY.z - 6.5, 6));
  for (let i = 0; i < 4; i++) {
    const seg = mesh(new THREE.CylinderGeometry(0.3 - i * 0.05, 0.25 - i * 0.05, 0.5, 10, 1, true), mat(i % 2 ? PALETTE.white : PALETTE.orange, { side: THREE.DoubleSide }), 0.3 + i * 0.5, 0, 0);
    seg.rotation.z = -Math.PI / 2;
    sock.add(seg);
  }
  scene.add(sock);
  return { sock };
}

function trees(scene) {
  const rnd = seeded(42);
  const spots = [];
  const scatter = (x0, x1, z0, z1, n, avoid = () => false) => {
    let tries = 0;
    while (n > 0 && tries++ < n * 40) {
      const p = v(x0 + rnd() * (x1 - x0), z0 + rnd() * (z1 - z0));
      if (avoid(p) || spots.some((q) => q.distanceTo(p) < 1.7)) continue;
      spots.push(p);
      n--;
    }
  };
  scatter(L.SLAB.x0 + 1, L.SLAB.x1 - 1, L.SLAB.z0 + 0.8, L.SLAB.z0 + 4.5, 80, (p) => Math.abs(p.x - 6) < 3);
  scatter(L.SLAB.x0 + 1, L.HANGAR.x0 - 1.5, -24, 36, 16);
  scatter(-100, L.TERMINAL.x0 - 3, 14, 37, 22, (p) => p.x > -96 && p.x < -62 && p.z > 37);
  scatter(L.TOWER.x + 10, L.SLAB.x1 - 1, 12, 46, 18);
  scatter(L.TERMINAL.x1 + 4, L.TOWER.x - 10, 30, 37, 6);
  scatter(-80, 26, 55.6, 65, 40, (p) => p.x > L.FUEL_FARM.x0 - 1 && p.x < L.FUEL_FARM.x1 + 1);
  scatter(L.APRON.x1 + 1, L.SLAB.x1 - 1, -16, 8, 5);

  const n = spots.length;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.18, 1, 6), mat(PALETTE.brown), n);
  const round = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat(0xffffff, { flatShading: true }), n);
  const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.4, 7), mat(0xffffff, { flatShading: true }), n);
  const greens = ['#6fa865', '#5f9a5c', '#7fb46c', '#4f8a57', '#8cbf75'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let nr = 0, nc = 0;
  spots.forEach((p, i) => {
    const h = 0.9 + rnd() * 0.8, size = 0.9 + rnd() * 0.6;
    trunks.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, h / 2, p.z), q.identity(), s.set(1, h, 1)));
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6);
    if (rnd() < 0.65) {
      round.setMatrixAt(nr, m4.compose(new THREE.Vector3(p.x, h + size * 0.8, p.z), q, s.set(size, size * 1.1, size)));
      round.setColorAt(nr++, greens[Math.floor(rnd() * greens.length)]);
    } else {
      cone.setMatrixAt(nc, m4.compose(new THREE.Vector3(p.x, h + size * 1.1, p.z), q, s.set(size * 0.8, size, size * 0.8)));
      cone.setColorAt(nc++, greens[Math.floor(rnd() * greens.length)].clone().multiplyScalar(0.85));
    }
  });
  round.count = nr;
  cone.count = nc;
  for (const im of [trunks, round, cone]) {
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
  }
}

function parkedCars(group) {
  const rnd = seeded(11);
  const colors = [PALETTE.sky, PALETTE.white, PALETTE.red, PALETTE.teal, PALETTE.navy, PALETTE.grey, PALETTE.orange, PALETTE.green];
  const rows = [L.PARKING.z0 + 1.45, L.PARKING.z1 - 1.45];
  for (const [ri, z] of rows.entries()) {
    for (let x = L.PARKING.x0 + 2.2; x < L.PARKING.x1 - 1; x += 2.4) {
      if (rnd() < 0.35) continue;
      const c = car({ color: colors[Math.floor(rnd() * colors.length)] });
      c.userData.kind = 'static';
      c.position.set(x, 0, z);
      c.rotation.y = ri ? -Math.PI / 2 : Math.PI / 2;
      group.add(c);
    }
  }
}

export function buildScenery(scene) {
  slab(scene);
  const statics = new THREE.Group(); // everything that never moves → baked into a few meshes
  const tower = controlTower(statics);
  const hangarLife = hangar(statics, scene);
  fuelFarm(statics);
  deck(statics);
  const props = lightsAndPoles(scene, statics);
  parkedCars(statics);
  scene.add(statics);
  bakeStatic(statics);
  scene.add(tower.beacon, tower.radar);
  trees(scene);
  const bridges = L.STANDS.map((s) => new JetBridge(scene, s));

  return {
    bridges,
    update(t, dt) {
      tower.spin.rotation.y = t * 1.4;
      tower.beacon.material.emissiveIntensity = (t * 0.8) % 1 < 0.5 ? 2.4 : 0.2;
      props.sock.rotation.y = Math.sin(t * 0.7) * 0.25;
      props.sock.rotation.z = -0.15 + Math.sin(t * 2.3) * 0.05;
      for (const b of bridges) b.update(dt);
      hangarLife.update(t, dt);
    },
  };
}

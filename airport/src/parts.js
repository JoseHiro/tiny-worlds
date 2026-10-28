// Mini Airport — parts library.
// Every builder returns a THREE.Group that sits on y = 0 and faces +X.
// group.userData.update(t, dt) animates beacons / characters when present.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { compactRig } from './merge.js';

export const PALETTE = {
  white: 0xf4f0e8,
  cream: 0xe6dccb,
  navy: 0x2c3a57,
  ink: 0x1c2232,
  orange: 0xe8673c,
  yellow: 0xf2b84b,
  teal: 0x4f9d8f,
  sky: 0x8db6d6,
  grey: 0xa3a7ad,
  darkGrey: 0x4a4f59,
  tire: 0x24252a,
  glass: 0x33435c,
  skin: 0xf1c7a5,
  red: 0xd9473b,
  green: 0x5fae6a,
  pink: 0xf09a9a,
  brown: 0x6b4a3a,
};

export const LIVERIES = {
  sunrise: { body: PALETTE.white, tail: PALETTE.orange, engine: PALETTE.navy, logo: PALETTE.white },
  lagoon: { body: PALETTE.white, tail: PALETTE.teal, engine: PALETTE.teal, logo: PALETTE.yellow },
  midnight: { body: PALETTE.navy, tail: PALETTE.yellow, engine: PALETTE.white, logo: PALETTE.navy },
};

// ---------- helpers ----------

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.04, ...opts }));
  }
  return matCache.get(key);
}

export function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function rbox(w, h, d, r, material, x, y, z) {
  const radius = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material, x, y, z);
}

export function box(w, h, d, material, x, y, z) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
}

export function cyl(rTop, rBottom, h, material, x, y, z, seg = 16) {
  return mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), material, x, y, z);
}

function wheel(r, w, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const tire = mesh(new THREE.CylinderGeometry(r, r, w, 18), mat(PALETTE.tire, { roughness: 0.9 }));
  tire.rotation.x = Math.PI / 2;
  const hub = mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 12), mat(PALETTE.grey));
  hub.rotation.x = Math.PI / 2;
  g.add(tire, hub);
  g.userData.radius = r;
  return compactRig(g);
}

function beacon(color, x, y, z, { r = 0.07, rate = 1.2, phase = 0 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 });
  const s = mesh(new THREE.SphereGeometry(r, 12, 8), m, x, y, z);
  s.castShadow = false;
  s.userData.blink = { rate, phase };
  return s;
}

function blink(beacons, t) {
  for (const b of beacons) {
    const { rate, phase } = b.userData.blink;
    const on = rate === 0 || (t * rate + phase) % 1 < 0.16;
    b.material.emissiveIntensity = on ? 2.4 : 0.1;
  }
}

// Wheels spin when userData.speed (units/sec along +X) is non-zero.
function vehicleUpdate(g) {
  const ud = g.userData;
  ud.speed = 0;
  ud.update = (t, dt) => {
    blink(ud.beacons, t);
    if (ud.speed) for (const w of ud.wheels) w.rotation.z -= (ud.speed * dt) / w.userData.radius;
  };
}

function wingGeo(points, depth, sign) {
  const shape = new THREE.Shape(points.map(([a, b]) => new THREE.Vector2(a, b * sign)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1,
  });
  geo.rotateX(-Math.PI / 2); // span → -Z (sign = 1) or +Z (sign = -1)
  geo.translate(0, -depth / 2, 0);
  return geo;
}

// ---------- airliner ----------

export function airplane(livery = LIVERIES.sunrise) {
  const { body, tail, engine, logo } = livery;
  const g = new THREE.Group();
  const ud = (g.userData = { kind: 'airplane', wheels: [], beacons: [] });
  const Y = 1.75; // fuselage centreline

  // fuselage (lathe: tail at y=0 → nose at y=14, then laid along +X)
  const profile = [
    [0, 0], [0.18, 0.05], [0.5, 1.1], [0.8, 2.7], [0.92, 4], [0.92, 11.4],
    [0.84, 12.5], [0.62, 13.3], [0.3, 13.85], [0, 14],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const fus = mesh(new THREE.LatheGeometry(profile, 28), mat(body));
  fus.rotation.z = -Math.PI / 2;
  fus.position.set(-7, Y, 0);
  g.add(fus);

  // cheatline + windows
  const winMat = mat(PALETTE.glass, { roughness: 0.3 });
  const winGeo = new RoundedBoxGeometry(0.16, 0.22, 0.06, 2, 0.03);
  for (let x = -4.6; x <= 4.7; x += 0.42) {
    for (const s of [1, -1]) g.add(mesh(winGeo, winMat, x, Y + 0.28, s * 0.86));
  }
  const doorMat = mat(PALETTE.cream);
  for (const x of [5.0, -4.95]) {
    for (const s of [1, -1]) g.add(rbox(0.42, 0.78, 0.05, 0.06, doorMat, x, Y + 0.05, s * 0.86));
  }
  // cockpit windshield: panels laid on the nose surface (θ = angle from top)
  const radiusAt = (x) => {
    const y = x + 7;
    for (let i = 1; i < profile.length; i++) {
      const a = profile[i - 1], b = profile[i];
      if (y <= b.y) return a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
    }
    return 0;
  };
  // A slice of the nose lathe, slightly inflated, wrapping the upper front.
  // Lathe phi: world height ∝ -sin(phi), so the top of the fuselage is phi = 3π/2.
  const x0 = 5.75, x1 = 6.38, arc = 1.25;
  const band = [];
  for (let i = 0; i <= 6; i++) {
    const x = x0 + ((x1 - x0) * i) / 6;
    band.push(new THREE.Vector2(radiusAt(x) + 0.012, x + 7));
  }
  const shield = mesh(
    new THREE.LatheGeometry(band, 24, Math.PI * 1.5 - arc, arc * 2),
    mat(PALETTE.ink, { roughness: 0.15, metalness: 0.3, side: THREE.DoubleSide }),
  );
  shield.rotation.z = -Math.PI / 2;
  shield.position.set(-7, Y, 0);
  g.add(shield);
  // window frames: thin body-coloured mullions across the band
  for (const a of [0, 0.42, 0.85]) {
    for (const s of a ? [1, -1] : [1]) {
      const th = a * s; // angle from top toward ±Z
      const xm = (x0 + x1) / 2;
      const r = radiusAt(xm) + 0.02;
      const m = box(x1 - x0 + 0.04, 0.03, 0.035, mat(body), xm, Y + r * Math.cos(th), r * Math.sin(th));
      m.rotation.set(th, 0, -0.32);
      g.add(m);
    }
  }
  // lower sill so the band reads as windows, not a stripe
  for (const s of [1, -1]) {
    const th = (arc + 0.02) * s;
    const xm = (x0 + x1) / 2;
    const r = radiusAt(xm) + 0.02;
    const sill = box(x1 - x0 + 0.06, 0.035, 0.03, mat(body), xm, Y + r * Math.cos(th), r * Math.sin(th));
    sill.rotation.set(th, 0, -0.32);
    g.add(sill);
  }

  // wings, winglets, engines
  const wingPts = [[1.8, 0], [-1.2, 6.6], [-2.3, 6.6], [-1.9, 0]];
  for (const s of [1, -1]) {
    const wing = mesh(wingGeo(wingPts, 0.16, s), mat(body === PALETTE.navy ? PALETTE.white : PALETTE.cream));
    wing.position.set(0, Y - 0.45, 0);
    wing.rotation.x = 0.06 * s;
    const winglet = rbox(0.55, 0.7, 0.06, 0.03, mat(tail), -1.95, 0.32, -6.55 * s);
    winglet.rotation.z = -0.35;
    wing.add(winglet);
    const tip = beacon(s > 0 ? PALETTE.red : PALETTE.green, -1.6, 0.1, -6.65 * s, { rate: 0 });
    const strobe = beacon(0xffffff, -2.2, 0.1, -6.6 * s, { r: 0.05, rate: 1.1, phase: 0.5 });
    wing.add(tip, strobe);
    ud.beacons.push(tip, strobe);
    g.add(wing);

    const eng = new THREE.Group();
    eng.position.set(1.1, Y - 1.05, -2.35 * s);
    const nacelle = mesh(new THREE.CylinderGeometry(0.46, 0.36, 1.8, 20), mat(engine));
    nacelle.rotation.z = -Math.PI / 2;
    const intake = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 20), mat(PALETTE.ink));
    intake.rotation.z = -Math.PI / 2;
    intake.position.x = 0.9;
    const lip = mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24), mat(PALETTE.grey, { metalness: 0.5, roughness: 0.3 }));
    lip.rotation.y = Math.PI / 2;
    lip.position.x = 0.9;
    const pylon = box(1.0, 0.5, 0.12, mat(body), -0.15, 0.45, 0);
    eng.add(nacelle, intake, lip, pylon);
    g.add(eng);
  }

  // tail: fin + logo disc + stabilisers
  const finShape = new THREE.Shape([[-4.2, 0.75], [-6.2, 3.25], [-7.0, 3.25], [-6.9, 0.15]].map(([a, b]) => new THREE.Vector2(a, b)));
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 1 });
  finGeo.translate(0, 0, -0.08);
  const fin = mesh(finGeo, mat(tail), 0, Y, 0);
  g.add(fin);
  for (const s of [1, -1]) {
    const disc = mesh(new THREE.CircleGeometry(0.42, 24), mat(logo), -6.0, Y + 2.15, s * 0.125);
    if (s < 0) disc.rotation.y = Math.PI;
    disc.castShadow = false;
    g.add(disc);
    const stab = mesh(wingGeo([[-5.3, 0], [-6.6, 2.6], [-7.1, 2.6], [-6.9, 0]], 0.12, s), mat(tail));
    stab.position.set(0, Y + 0.25, 0);
    stab.rotation.x = 0.08 * s;
    g.add(stab);
  }

  // landing gear
  const strutMat = mat(PALETTE.grey, { metalness: 0.4, roughness: 0.35 });
  g.add(cyl(0.06, 0.06, Y - 0.6, strutMat, 5.6, (Y - 0.6) / 2 + 0.3, 0, 8));
  for (const z of [0.13, -0.13]) {
    const w = wheel(0.28, 0.18, 5.6, 0.28, z);
    ud.wheels.push(w);
    g.add(w);
  }
  for (const s of [1, -1]) {
    g.add(cyl(0.08, 0.08, Y - 0.75, strutMat, -0.4, (Y - 0.75) / 2 + 0.32, s * 1.2, 8));
    for (const dz of [-0.16, 0.16]) {
      const w = wheel(0.32, 0.22, -0.4, 0.32, s * 1.2 + dz);
      ud.wheels.push(w);
      g.add(w);
    }
  }

  const top = beacon(PALETTE.red, 0.2, Y + 0.94, 0, { rate: 0.9 });
  const bottom = beacon(PALETTE.red, 0.8, Y - 0.94, 0, { rate: 0.9, phase: 0.5 });
  g.add(top, bottom);
  ud.beacons.push(top, bottom);

  vehicleUpdate(g);
  return compactRig(g);
}

// ---------- road vehicles ----------

function lights(g, frontX, backX, y, zs) {
  const head = mat(0xfff4d6, { emissive: 0xfff1c8, emissiveIntensity: 0.8 });
  const rear = mat(PALETTE.red, { emissive: PALETTE.red, emissiveIntensity: 0.6 });
  for (const z of zs) {
    g.add(box(0.04, 0.1, 0.2, head, frontX, y, z));
    g.add(box(0.04, 0.1, 0.18, rear, backX, y, z));
  }
}

export function car({ color = PALETTE.sky, followMe = false, taxi = false } = {}) {
  const g = new THREE.Group();
  const ud = (g.userData = { kind: 'car', wheels: [], beacons: [] });
  const paint = mat(followMe ? PALETTE.yellow : color);
  g.add(rbox(2.1, 0.5, 1.0, 0.16, paint, 0, 0.46, 0));
  g.add(rbox(1.15, 0.42, 0.9, 0.14, mat(PALETTE.glass, { roughness: 0.25 }), -0.12, 0.86, 0));
  g.add(rbox(1.05, 0.08, 0.92, 0.04, paint, -0.14, 1.07, 0));
  lights(g, 1.05, -1.05, 0.5, [0.3, -0.3]);
  for (const x of [0.66, -0.66]) {
    for (const z of [0.46, -0.46]) {
      const w = wheel(0.22, 0.18, x, 0.22, z);
      ud.wheels.push(w);
      g.add(w);
    }
  }
  if (taxi) { // roof light + checker band
    g.add(rbox(0.36, 0.14, 0.2, 0.04, mat(PALETTE.white, { emissive: 0xfff0c0, emissiveIntensity: 0.4 }), -0.14, 1.18, 0));
    for (let i = 0; i < 6; i++) for (const s of [1, -1]) g.add(box(0.16, 0.06, 0.02, mat(i % 2 ? PALETTE.ink : PALETTE.white), -0.75 + i * 0.3, 0.6, s * 0.505));
  }
  if (followMe) {
    // checkered roof sign
    const sign = new THREE.Group();
    sign.position.set(-0.14, 1.24, 0);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        sign.add(box(0.16, 0.22, 0.02, mat((i + j) % 2 ? PALETTE.ink : PALETTE.white), (i - 1.5) * 0.16, 0, (j ? 1 : -1) * 0.1));
      }
    }
    sign.add(box(0.64, 0.22, 0.18, mat(PALETTE.yellow), 0, 0, 0));
    g.add(sign);
    for (const z of [0.28, -0.28]) {
      const b = beacon(0xffa31a, -0.14, 1.42, z, { r: 0.06, rate: 1.6, phase: z > 0 ? 0 : 0.5 });
      ud.beacons.push(b);
      g.add(b);
    }
  }
  vehicleUpdate(g);
  return compactRig(g);
}

export function apronBus({ accent = PALETTE.orange } = {}) {
  const g = new THREE.Group();
  const ud = (g.userData = { kind: 'bus', wheels: [], beacons: [] });
  const shell = mat(PALETTE.white);
  const glass = mat(PALETTE.glass, { roughness: 0.25 });
  const L = 5.6, W = 1.55;
  g.add(rbox(L, 0.55, W, 0.14, shell, 0, 0.5, 0));
  g.add(rbox(L - 0.08, 0.78, W - 0.04, 0.12, glass, 0, 1.1, 0));
  g.add(rbox(L, 0.2, W, 0.1, shell, 0, 1.56, 0));
  g.add(rbox(1.2, 0.16, 0.9, 0.06, mat(PALETTE.cream), -0.8, 1.72, 0));
  g.add(box(L + 0.02, 0.1, W + 0.02, mat(accent), 0, 0.68, 0));
  for (let x = -L / 2 + 0.25; x <= L / 2 - 0.2; x += 0.9) g.add(box(0.1, 0.78, W + 0.01, shell, x, 1.1, 0));
  // doors on +Z side
  for (const x of [-1.7, 0.1, 1.85]) {
    g.add(box(0.82, 1.12, 0.03, mat(accent), x, 0.95, W / 2 + 0.01));
    g.add(box(0.68, 1.0, 0.03, mat(PALETTE.glass, { roughness: 0.2 }), x, 0.97, W / 2 + 0.025));
    g.add(box(0.02, 1.0, 0.03, mat(PALETTE.grey), x, 0.97, W / 2 + 0.04));
  }
  lights(g, L / 2 + 0.01, -L / 2 - 0.01, 0.45, [0.55, -0.55]);
  for (const x of [1.95, -1.95]) {
    for (const z of [0.7, -0.7]) {
      const w = wheel(0.3, 0.2, x, 0.3, z);
      ud.wheels.push(w);
      g.add(w);
    }
  }
  const b = beacon(0xffa31a, 2.2, 1.72, 0, { r: 0.07, rate: 1.4 });
  ud.beacons.push(b);
  g.add(b);
  vehicleUpdate(g);
  return compactRig(g);
}

export function fuelTruck() {
  const g = new THREE.Group();
  const ud = (g.userData = { kind: 'fuel', wheels: [], beacons: [] });
  g.add(box(4.4, 0.25, 1.2, mat(PALETTE.darkGrey), 0, 0.42, 0));
  g.add(rbox(1.15, 1.15, 1.45, 0.16, mat(PALETTE.white), 1.65, 1.08, 0));
  g.add(rbox(0.06, 0.45, 1.25, 0.03, mat(PALETTE.glass, { roughness: 0.2 }), 2.22, 1.35, 0));
  for (const s of [1, -1]) g.add(box(0.55, 0.4, 0.04, mat(PALETTE.glass), 1.75, 1.35, s * 0.72));
  const tank = mesh(new THREE.CapsuleGeometry(0.68, 2.2, 6, 20), mat(0xd9dde2, { metalness: 0.45, roughness: 0.3 }));
  tank.rotation.z = Math.PI / 2;
  tank.position.set(-0.6, 1.25, 0);
  g.add(tank);
  for (const x of [-1.6, 0.4]) {
    const band = mesh(new THREE.TorusGeometry(0.69, 0.04, 8, 28), mat(PALETTE.orange));
    band.rotation.y = Math.PI / 2;
    band.position.set(x, 1.25, 0);
    g.add(band);
  }
  const reel = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16), mat(PALETTE.ink));
  reel.rotation.x = Math.PI / 2;
  reel.position.set(-2.3, 0.85, 0);
  g.add(reel);
  g.add(box(0.5, 0.06, 1.0, mat(PALETTE.grey), -0.6, 1.98, 0));
  lights(g, 2.23, -2.21, 0.6, [0.5, -0.5]);
  for (const x of [1.6, -0.9, -1.75]) {
    for (const z of [0.62, -0.62]) {
      const w = wheel(0.3, 0.22, x, 0.3, z);
      ud.wheels.push(w);
      g.add(w);
    }
  }
  const b = beacon(0xffa31a, 1.65, 1.76, 0, { rate: 1.5 });
  ud.beacons.push(b);
  g.add(b);
  vehicleUpdate(g);
  return compactRig(g);
}

export function pushbackTug() {
  const g = new THREE.Group();
  const ud = (g.userData = { kind: 'tug', wheels: [], beacons: [] });
  g.add(rbox(2.6, 0.55, 1.6, 0.14, mat(PALETTE.navy), 0, 0.5, 0));
  g.add(box(2.62, 0.08, 1.62, mat(PALETTE.yellow), 0, 0.42, 0));
  g.add(rbox(0.8, 0.55, 0.7, 0.1, mat(PALETTE.glass, { roughness: 0.2 }), -0.55, 1.05, 0.38));
  g.add(rbox(0.86, 0.07, 0.76, 0.03, mat(PALETTE.navy), -0.55, 1.35, 0.38));
  // tow bar
  g.add(box(2.2, 0.08, 0.08, mat(PALETTE.yellow), 2.3, 0.35, 0));
  g.add(cyl(0.08, 0.08, 0.1, mat(PALETTE.ink), 3.4, 0.35, 0, 10));
  lights(g, 1.31, -1.31, 0.55, [0.55, -0.55]);
  for (const x of [0.85, -0.85]) {
    for (const z of [0.78, -0.78]) {
      const w = wheel(0.3, 0.24, x, 0.3, z);
      ud.wheels.push(w);
      g.add(w);
    }
  }
  const b = beacon(0xffa31a, -0.55, 1.46, 0.38, { rate: 1.5 });
  ud.beacons.push(b);
  g.add(b);
  vehicleUpdate(g);
  return compactRig(g);
}

const BAG_COLORS = [PALETTE.orange, PALETTE.navy, PALETTE.teal, PALETTE.yellow, PALETTE.red, PALETTE.sky, PALETTE.brown];

function baggageCart(seed, { bags = true } = {}) {
  const g = new THREE.Group();
  g.add(box(1.3, 0.1, 0.85, mat(PALETTE.grey), 0, 0.34, 0));
  for (const s of [1, -1]) g.add(box(1.3, 0.04, 0.04, mat(PALETTE.darkGrey), 0, 0.75, s * 0.42));
  for (const x of [-0.63, 0.63]) for (const s of [1, -1]) g.add(box(0.04, 0.42, 0.04, mat(PALETTE.darkGrey), x, 0.56, s * 0.42));
  g.add(box(1.36, 0.04, 0.9, mat(PALETTE.cream), 0, 0.98, 0)); // canopy
  g.add(box(0.5, 0.04, 0.04, mat(PALETTE.darkGrey), 0.88, 0.25, 0)); // hitch
  let k = seed;
  const rand = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < (bags ? 5 : 0); i++) {
    const w = 0.3 + rand() * 0.15, h = 0.22 + rand() * 0.18, d = 0.18 + rand() * 0.1;
    const bag = rbox(w, h, d, 0.04, mat(BAG_COLORS[Math.floor(rand() * BAG_COLORS.length)]),
      -0.45 + (i % 3) * 0.45, 0.39 + h / 2, i < 3 ? 0.18 : -0.2);
    bag.rotation.y = (rand() - 0.5) * 0.4;
    g.add(bag);
  }
  g.userData.wheels = [];
  for (const x of [0.45, -0.45]) {
    for (const z of [0.36, -0.36]) {
      const w = wheel(0.14, 0.1, x, 0.14, z);
      g.userData.wheels.push(w);
      g.add(w);
    }
  }
  return compactRig(g);
}

// bags = false: empty carts (the airport puts real, tracked bags on them)
export function baggageTrain({ carts = 2, bags = true } = {}) {
  const g = new THREE.Group();
  const ud = (g.userData = { kind: 'baggage', wheels: [], beacons: [] });
  const tractor = new THREE.Group();
  tractor.add(rbox(1.3, 0.38, 0.85, 0.1, mat(PALETTE.yellow), 0, 0.42, 0));
  tractor.add(rbox(0.3, 0.3, 0.5, 0.06, mat(PALETTE.ink), -0.25, 0.75, 0)); // seat
  tractor.add(cyl(0.03, 0.03, 0.35, mat(PALETTE.ink), 0.25, 0.75, 0, 6)); // steering column
  for (const x of [-0.5, 0.35]) for (const s of [1, -1]) tractor.add(cyl(0.03, 0.03, 0.75, mat(PALETTE.darkGrey), x, 0.98, s * 0.38, 6));
  tractor.add(rbox(1.05, 0.06, 0.9, 0.03, mat(PALETTE.yellow), -0.08, 1.37, 0));
  lights(tractor, 0.66, -0.66, 0.45, [0.28, -0.28]);
  for (const x of [0.4, -0.4]) {
    for (const z of [0.42, -0.42]) {
      const w = wheel(0.2, 0.16, x, 0.2, z);
      ud.wheels.push(w);
      tractor.add(w);
    }
  }
  const b = beacon(0xffa31a, -0.08, 1.45, 0, { r: 0.06, rate: 1.5 });
  ud.beacons.push(b);
  tractor.add(b);
  g.add(tractor);
  for (let i = 0; i < carts; i++) {
    const c = baggageCart(17 + i * 31, { bags });
    c.position.x = -1.75 - i * 1.65;
    ud.wheels.push(...c.userData.wheels);
    g.add(c);
  }
  vehicleUpdate(g);
  return compactRig(g);
}

// ---------- characters ----------

const ROLES = {
  crew: { top: PALETTE.navy, vest: PALETTE.orange, legs: PALETTE.navy, hat: 'helmet' },
  marshaller: { top: PALETTE.navy, vest: PALETTE.yellow, legs: PALETTE.ink, hat: 'helmet', wands: true },
  pilot: { top: PALETTE.navy, legs: PALETTE.navy, hat: 'cap', stripes: true },
  attendant: { top: PALETTE.teal, legs: PALETTE.navy, hat: 'bun', scarf: PALETTE.orange },
  passenger: { top: PALETTE.sky, legs: PALETTE.darkGrey, hat: 'hair', suitcase: PALETTE.orange },
  woman: { top: PALETTE.pink, legs: PALETTE.skin, skirt: PALETTE.navy, hat: 'long', handbag: PALETTE.orange, shoes: PALETTE.red },
  backpacker: { top: PALETTE.green, legs: PALETTE.darkGrey, hat: 'baseball', capColor: PALETTE.orange, backpack: PALETTE.teal, bedroll: PALETTE.yellow },
  business: { top: PALETTE.navy, legs: PALETTE.navy, hat: 'hair', tie: PALETTE.red, briefcase: PALETTE.brown },
  child: { top: PALETTE.yellow, legs: PALETTE.sky, hat: 'baseball', capColor: PALETTE.red, backpack: PALETTE.orange, scale: 0.72 },
  senior: { top: PALETTE.cream, legs: PALETTE.grey, hat: 'grey', cane: PALETTE.brown, pace: 0.6 },
  // terminal staff
  agent: { top: PALETTE.navy, legs: PALETTE.navy, hat: 'bun', scarf: PALETTE.orange },
  agentM: { top: PALETTE.navy, legs: PALETTE.navy, hat: 'hair', tie: PALETTE.orange },
  security: { top: PALETTE.navy, vest: PALETTE.sky, legs: PALETTE.ink, hat: 'hair' },
  gateAgent: { top: PALETTE.teal, legs: PALETTE.navy, hat: 'bun', scarf: PALETTE.yellow },
  handler: { top: PALETTE.navy, vest: PALETTE.orange, legs: PALETTE.darkGrey, hat: 'baseball', capColor: PALETTE.navy },
  barista: { top: PALETTE.white, vest: PALETTE.brown, legs: PALETTE.ink, hat: 'baseball', capColor: PALETTE.brown },
  serviceAgent: { top: PALETTE.navy, legs: PALETTE.navy, hat: 'long', scarf: PALETTE.red },
  officer: { top: PALETTE.navy, legs: PALETTE.ink, hat: 'cap', tie: PALETTE.sky }, // immigration
  // town people (town/DESIGN.md §2.6)
  clerk: { top: PALETTE.white, vest: PALETTE.teal, legs: PALETTE.navy, hat: 'hair' },
  police: { top: PALETTE.sky, vest: PALETTE.navy, legs: PALETTE.navy, hat: 'cap', tie: PALETTE.navy },
  worker: { top: PALETTE.navy, vest: PALETTE.yellow, legs: PALETTE.darkGrey, hat: 'helmet' },
  student: { top: PALETTE.white, legs: PALETTE.navy, hat: 'hair', backpack: PALETTE.navy, tie: PALETTE.red },
  farmer: { top: PALETTE.cream, legs: PALETTE.darkGrey, hat: 'straw', pace: 0.8 },
  jogger: { top: PALETTE.orange, legs: PALETTE.ink, hat: 'baseball', capColor: PALETTE.white, pace: 1.7 },
  kariyushi: { top: PALETTE.sky, legs: PALETTE.cream, hat: 'grey', pace: 0.8 }, // an islander in a kariyushi shirt
  tourist: { top: PALETTE.pink, legs: PALETTE.white, hat: 'straw', handbag: PALETTE.yellow },
  rider: { top: PALETTE.red, legs: PALETTE.navy, hat: 'bike', capColor: PALETTE.white },
  busDriver: { top: PALETTE.sky, legs: PALETTE.navy, hat: 'cap', tie: PALETTE.navy },
  // at the beach (naha): swimwear
  swimKid: { top: PALETTE.orange, legs: PALETTE.skin, hat: 'baseball', capColor: PALETTE.yellow, scale: 0.72 },
  swimMum: { top: PALETTE.pink, legs: PALETTE.skin, hat: 'straw' },
  swimDad: { top: PALETTE.teal, legs: PALETTE.navy, hat: 'hair' },
  // the old capital (koto): kimono — a long robe instead of trousers, an obi, hanging sleeves, small steps
  kimonoWoman: { robe: 0xe9a3b4, pattern: 'sakura', obi: 0xc9a24a, otaiko: true, hat: 'updo', kanzashi: 0xd9482b, shoes: 0xc94a3a, stride: 0.3, pace: 0.8 },
  kimonoWoman2: { robe: 0x6f8fb8, pattern: 'kiku', obi: 0xf2ede2, otaiko: true, hat: 'updo', kanzashi: 0xf2c94c, shoes: 0x2f4a6b, stride: 0.3, pace: 0.8 },
  kimonoMan: { robe: 0x3a3f4a, pattern: 'plain', obi: 0x8e7a5a, haori: 0x1f2228, hat: 'hair', shoes: 0x2a2018, stride: 0.38, pace: 0.85 },
  yukataGirl: { robe: 0xf2ede2, pattern: 'stripe', obi: 0xd9482b, otaiko: true, hat: 'updo', kanzashi: 0xe9a3b4, shoes: 0x8a6a4a, stride: 0.3, scale: 0.72 },
  furisode: { robe: 0xc8283a, pattern: 'kiku', obi: 0xc9a24a, otaiko: true, longSleeve: true, hat: 'updo', kanzashi: 0xf2ede2, shoes: 0xc9a24a, stride: 0.28, pace: 0.75 },
  kimonoKid: { robe: 0xe8673c, pattern: 'sakura', obi: 0xf2c94c, otaiko: true, hat: 'updo', kanzashi: 0xd9482b, shoes: 0xc8283a, stride: 0.32, scale: 0.7 },
  // 舞妓さん: the long hanging obi (だらり), tall clogs (おこぼ), the big hairdo with flower pins — shown plainly, without white make-up
  maiko: { robe: 0x7a2f5a, pattern: 'sakura', obi: 0x1f2a3a, darari: true, okobo: true, hat: 'maiko', kanzashi: 0xf2a3c4, collarColor: 0xc8283a, stride: 0.2, pace: 0.6, longSleeve: true },
  baaKimono: { robe: 0x8a7aa8, pattern: 'kiku', obi: 0xc9b48a, otaiko: true, hat: 'grey', shoes: 0x5a4a5a, stride: 0.3, pace: 0.65 }, // Hana's grandmother in a wisteria kimono
  // café people (cafe/DESIGN.md §5)
  barista: { top: 0xf2ede2, apron: 0x4a5f7a, legs: 0x3a3f4a, hat: 'bun', hair: 0x6b4a35, shoes: 0x6b4a35 },
  barista2: { top: 0x2a2a2c, apron: 0x8a5a3a, legs: 0x3a3f4a, hat: 'baseball', capColor: 0x2a2a2c },
  macWorker: { top: 0x8a9aa8, legs: 0x2f3e57, hat: 'hair', glasses: true, carry: 'mug' },
  callWorker: { top: 0x2f3e57, legs: 0x3a3f4a, hat: 'long', hair: 0x2a2018, headphones: 0xf2ede2, carry: 'mug' },
  designer: { top: 0xd9a441, legs: 0x3a3f4a, hat: 'beret', capColor: 0xc9714a, hair: 0x2a2018, carry: 'mug' },
  studentA: { top: 0xe2a9a0, legs: 0x2f3e57, hat: 'bob', backpack: 0x9db59a },
  studentB: { top: 0xf6f1e6, legs: 0x5a6b7a, hat: 'hair', glasses: true, headphones: 0x2a2a2c },
  reader: { top: 0x9db59a, legs: 0x6b5a48, hat: 'long', hair: 0x6b4a35, glasses: true, carry: 'mug' },
  chatA: { top: 0xc9714a, legs: 0x2f3e57, hat: 'long', hair: 0x2a2018, carry: 'mug' },
  chatB: { top: 0xf3ead8, legs: 0x6b5a48, hat: 'bun', hair: 0x8a6a4a, carry: 'mug' },
  oldman: { top: 0x7a6a58, legs: 0x4a4038, hat: 'flatcap', capColor: 0x6b5a48, pace: 0.6, carry: 'mug' },
  parent: { top: 0x2f3e57, legs: 0x6b5a48, hat: 'long', hair: 0x4a3426, carry: 'mug' },
  rainKid: { top: 0xf2c94c, legs: 0x2f3e57, hat: 'rainhat', capColor: 0xf2c94c, scale: 0.7, shoes: 0xf2c94c },
  rainComer: { top: 0x5f6b5a, legs: 0x2f3e57, hat: 'hair', carry: 'umbrella' },
  regular: { top: 0xc9714a, legs: 0x3a3f4a, hat: 'hair', glasses: true, carry: 'mug' },
  // Mina, the travelling illustrator (cafe/DESIGN.md §12): a blue raincoat, a brown bob, a sketchbook in her bag
  mina: { top: 0x5f7f9a, legs: 0x3a3f4a, hat: 'bob', hair: 0x6b4a35, backpack: 0xc9a07a, carry: 'umbrella', shoes: 0x8a5a3a },
  minaIn: { top: 0x5f7f9a, legs: 0x3a3f4a, hat: 'bob', hair: 0x6b4a35, backpack: 0xc9a07a, carry: 'mug', shoes: 0x8a5a3a },
  minaBare: { top: 0x5f7f9a, legs: 0x3a3f4a, hat: 'bob', hair: 0x6b4a35, backpack: 0xc9a07a, shoes: 0x8a5a3a }, // her umbrella left behind
  minaWagasa: { top: 0x5f7f9a, legs: 0x3a3f4a, hat: 'bob', hair: 0x6b4a35, backpack: 0xc9a07a, carry: 'wagasa', shoes: 0x8a5a3a },
  okami: { robe: 0x5a4a5a, pattern: 'plain', obi: 0xc9b48a, otaiko: true, hat: 'updo', shoes: 0x2a2018, stride: 0.3, pace: 0.7 }, // the mistress of a teahouse (女将)
  // monks, shrine priest and shrine maiden
  monkBroom: { robe: 0x6b5a48, pattern: 'plain', obi: 0x6b5a48, hat: 'bald', shoes: 0xf2ede2, carry: 'broom', stride: 0.35, pace: 0.6 }, // a monk in work clothes (作務衣) sweeping
  monk: { robe: 0x1f2228, pattern: 'plain', obi: 0x1f2228, kesa: 0x8e6a3a, hat: 'bald', shoes: 0xf2ede2, stride: 0.35, pace: 0.75 },
  takuhatsu: { robe: 0x1f2228, pattern: 'plain', obi: 0x1f2228, kesa: 0x5a4636, hat: 'ajiro', shoes: 0xf2ede2, carry: 'bowl', stride: 0.35, pace: 0.6 },
  kannushi: { robe: 0xf6f4ee, pattern: 'plain', obi: 0xf6f4ee, hakama: 0x7fb6c4, hat: 'eboshi', shoes: 0x1d1f23, stride: 0.35, pace: 0.7 },
  miko: { robe: 0xfafaf6, pattern: 'plain', obi: 0xfafaf6, hakama: 0xc8283a, hat: 'long', hair: 0x1d1f23, hairTie: true, shoes: 0xfafaf6, carry: 'broom', stride: 0.35, pace: 0.8 },
  // working people
  shafu: { top: 0x2f4a6b, collar: 0xf2ede2, legs: 0x1d1f23, hat: 'hachimaki', shoes: 0x1d1f23, pace: 1.3 }, // the rickshaw puller: happi, tight trousers, split-toe boots
  sendo: { top: 0x2f4a6b, collar: 0xf2ede2, legs: 0x3a3f4a, hat: 'sugegasa', shoes: 0x1d1f23 }, // the boatman
  teaStaff: { top: 0x6b5a48, apron: 0x2f4a6b, legs: 0x6b5a48, hat: 'sankaku', shoes: 0x1d1f23, carry: 'tray' },
  gardener: { top: 0x2f4a6b, collar: 0xf2ede2, legs: 0x3a3f4a, hat: 'hachimaki', shoes: 0x1d1f23, carry: 'shears' },
  // school trip, visitors, locals
  schoolBoy: { top: 0x1d1f23, legs: 0x1d1f23, hat: 'hair', buttons: true, backpack: 0x2f4a6b, scale: 0.85 },
  schoolGirl: { top: 0xf6f4ee, sailor: 0x2c3a57, skirt: 0x2c3a57, legs: PALETTE.skin, hat: 'bob', backpack: 0x2c3a57, scale: 0.85 },
  teacher: { top: 0x8a8f96, legs: 0x2c3a57, hat: 'hair', tie: 0x2f4a6b, carry: 'flag' },
  visitor: { top: 0x2fa58f, legs: 0xc9b48a, hat: 'baseball', capColor: 0xe8673c, backpack: 0x3a3f4a, carry: 'camera' },
  obaachan: { top: 0xf6f4ee, legs: 0x6b5a48, hat: 'grey', carry: 'basket', pace: 0.55, stride: 0.35 }, // a white 割烹着 apron-smock
  jinbeiKid: { top: 0x6f8fb8, legs: 0x6f8fb8, hat: 'hair', collar: 0x2f4a6b, scale: 0.7, carry: 'uchiwa' },
  umbrellaWoman: { robe: 0x2f4a6b, pattern: 'kiku', obi: 0xc9a24a, otaiko: true, hat: 'updo', kanzashi: 0xc9a24a, shoes: 0x2a2018, stride: 0.3, pace: 0.75, carry: 'wagasa' },
};
// things carried in the right hand (s = 1 arm); the arm holds still while the other swings
// how far forward the carrying arm is held
const HOLD = { umbrella: 0.6, mug: 0.25, wagasa: 0.6, uchiwa: 1.1, broom: 0.5, bowl: 1.2, tray: 1.3, shears: 0.4, flag: 0.9, camera: 1.3, basket: 0.25 };
const KOTO_GOLD = 0xc9a24a;
function carryItem(kind) {
  const g = new THREE.Group();
  const wood = mat(0x8a6a4a), paper = mat(0xf6f2ea);
  if (kind === 'wagasa') { // an open paper umbrella held over the head
    g.add(cyl(0.012, 0.012, 1.0, wood, 0, 0.45, 0, 5));
    g.add(mesh(new THREE.ConeGeometry(0.55, 0.2, 16, 1, true), mat(0xc8283a, { side: THREE.DoubleSide, roughness: 0.8 }), 0, 0.95, 0));
  } else if (kind === 'uchiwa') { g.add(cyl(0.01, 0.01, 0.12, wood, 0, 0.06, 0, 4)); g.add(mesh(new THREE.CircleGeometry(0.09, 12).rotateY(Math.PI / 2), mat(0x7fb6c4, { side: THREE.DoubleSide }), 0, 0.2, 0)); }
  else if (kind === 'broom') { g.add(cyl(0.012, 0.012, 1.1, mat(0xc9b07a), 0.05, -0.05, 0, 5)); g.add(mesh(new THREE.ConeGeometry(0.12, 0.35, 8), mat(0x8a7a4a), 0.05, -0.65, 0)); }
  else if (kind === 'bowl') { g.add(cyl(0.07, 0.05, 0.06, mat(0x1d1f23), 0.06, 0.02, 0, 10)); }
  else if (kind === 'tray') { g.add(box(0.22, 0.02, 0.3, mat(0x2a2018), 0.1, 0.02, 0)); g.add(cyl(0.035, 0.03, 0.06, mat(0x7fa05a), 0.1, 0.06, 0.07, 8)); for (let k = 0; k < 3; k++) g.add(mesh(new THREE.SphereGeometry(0.022, 6, 4), mat([0xf2c4cf, 0xf2ede2, 0x8fb06a][k]), 0.1, 0.05, -0.05 - k * 0.04)); }
  else if (kind === 'shears') { for (const s of [1, -1]) { const b = box(0.02, 0.3, 0.02, mat(0x8a8f96, { metalness: 0.5 }), 0.06, -0.12, s * 0.02); b.rotation.x = s * 0.2; g.add(b); } }
  else if (kind === 'flag') { g.add(cyl(0.01, 0.01, 0.9, mat(0xc9ccd1), 0, 0.4, 0, 4)); g.add(box(0.02, 0.18, 0.26, mat(0xf2c94c), 0, 0.75, 0.14)); }
  else if (kind === 'camera') { g.add(box(0.08, 0.06, 0.12, mat(0x1d1f23), 0.06, 0.02, 0)); g.add(cyl(0.025, 0.025, 0.05, mat(0x3a3f4a), 0.11, 0.02, 0, 8)).children.at(-1).rotation.z = Math.PI / 2; }
  else if (kind === 'basket') { g.add(cyl(0.1, 0.08, 0.1, mat(0xb89a6a), 0, -0.1, 0, 10)); g.add(mesh(new THREE.TorusGeometry(0.08, 0.008, 4, 10, Math.PI), mat(0xb89a6a), 0, -0.05, 0)); }
  else if (kind === 'umbrella') { // a western umbrella, open
    g.add(cyl(0.012, 0.012, 1.0, mat(0x2a2a2c), 0, 0.45, 0, 5));
    g.add(mesh(new THREE.SphereGeometry(0.55, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), mat(0x2f3e57, { side: THREE.DoubleSide, roughness: 0.6 }), 0, 0.72, 0));
  } else if (kind === 'mug') { g.add(cyl(0.045, 0.04, 0.09, mat(0xf6f1e6), 0.03, 0.02, 0, 10)); g.add(mesh(new THREE.TorusGeometry(0.025, 0.008, 4, 8), mat(0xf6f1e6), 0.03, 0.02, 0.05)); }
  void paper;
  return g;
}

// robe patterns, drawn once each on a canvas and shared
const robeTex = new Map();
function robeMat(color, pattern) {
  const key = color + pattern;
  if (robeTex.has(key)) return robeTex.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#' + new THREE.Color(color).getHexString(); g.fillRect(0, 0, 128, 128);
  if (pattern === 'sakura' || pattern === 'kiku') { // little flowers scattered over the cloth
    const petals = pattern === 'sakura' ? 5 : 12;
    for (const [x, y, r, col] of [[24, 30, 11, '#fff4f6'], [86, 22, 8, '#f6c4cf'], [60, 72, 13, '#fff4f6'], [18, 100, 9, '#f2c94c'], [104, 98, 11, '#fff4f6'], [100, 58, 6, '#f6c4cf']]) {
      g.fillStyle = col;
      for (let k = 0; k < petals; k++) { const a = (k / petals) * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * (pattern === 'kiku' ? 0.18 : 0.38), a, 0, 7); g.fill(); }
      g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(x, y, r * 0.2, 0, 7); g.fill();
    }
  } else if (pattern === 'stripe') { // yukata: indigo stripes and a few dots
    g.fillStyle = '#2f4a6b';
    for (let x = 0; x < 128; x += 16) g.fillRect(x, 0, 4, 128);
    for (const [x, y] of [[40, 30], [90, 80], [60, 110]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 });
  robeTex.set(key, m);
  return m;
}

export const PASSENGER_TYPES = ['passenger', 'woman', 'backpacker', 'business', 'child', 'senior'];

export function person(role = 'crew', { mode = 'idle' } = {}) {
  const cfg = ROLES[role];
  const g = new THREE.Group();
  const ud = (g.userData = { kind: 'person', role, mode, beacons: [] });
  const body = new THREE.Group();
  g.add(body);

  const legs = [];
  for (const s of [1, -1]) {
    const hip = new THREE.Group();
    hip.position.set(0, 0.32, s * 0.08);
    hip.add(mesh(new THREE.CapsuleGeometry(0.07, 0.18, 4, 10), mat(cfg.legs), 0, -0.16, 0));
    hip.add(rbox(0.16, cfg.okobo ? 0.12 : 0.06, 0.1, 0.03, mat(cfg.shoes ?? (cfg.okobo ? 0xc9a87c : PALETTE.ink)), 0.03, cfg.okobo ? -0.3 : -0.29, 0)); // shoe (おこぼ: a tall wooden clog)
    legs.push(hip);
    body.add(hip);
  }

  if (cfg.robe) { // kimono: the robe hangs from the chest to the ankles; the legs move inside it
    const rm = robeMat(cfg.robe, cfg.pattern ?? 'plain');
    body.add(mesh(new THREE.CapsuleGeometry(0.17, 0.16, 6, 14), rm, 0, 0.55, 0));
    if (cfg.hakama) body.add(cyl(0.19, 0.24, 0.5, mat(cfg.hakama), 0, 0.3, 0, 18)); // 袴: pleated trousers-skirt, wider at the hem
    else body.add(mesh(new THREE.CylinderGeometry(0.175, 0.2, 0.5, 18), rm, 0, 0.3, 0));
    body.add(cyl(0.18, 0.18, 0.15, mat(cfg.hakama ?? cfg.obi), 0, 0.5, 0, 18)); // the obi
    if (cfg.otaiko) body.add(rbox(0.1, 0.18, 0.3, 0.03, mat(cfg.obi), -0.19, 0.52, 0)); // its bow at the back
    if (cfg.darari) { body.add(rbox(0.12, 0.2, 0.32, 0.03, mat(cfg.obi), -0.19, 0.55, 0)); for (const zz of [0.08, -0.08]) body.add(box(0.03, 0.5, 0.13, mat(cfg.obi), -0.21, 0.24, zz)); } // だらりの帯: long ends hanging to the hem
    if (cfg.haori) body.add(mesh(new THREE.CapsuleGeometry(0.182, 0.1, 6, 14), mat(cfg.haori), 0, 0.6, 0));
    if (cfg.kesa) { const k = box(0.36, 0.09, 0.4, mat(cfg.kesa), 0, 0.62, 0); k.rotation.x = 0.7; body.add(k); body.add(box(0.03, 0.24, 0.3, mat(cfg.kesa), 0.17, 0.6, 0.02)); } // 袈裟 over one shoulder
    for (const zz of [1, -1]) { const col = box(0.02, 0.2, 0.05, mat(cfg.collarColor ?? PALETTE.white), 0.168, 0.71, zz * 0.04); col.rotation.x = zz * 0.45; body.add(col); } // the crossed collar
  } else body.add(mesh(new THREE.CapsuleGeometry(0.17, 0.16, 6, 14), mat(cfg.top), 0, 0.55, 0));
  if (cfg.vest) {
    body.add(mesh(new THREE.CapsuleGeometry(0.177, 0.1, 6, 14), mat(cfg.vest), 0, 0.57, 0));
    body.add(box(0.02, 0.03, 0.3, mat(0xeeeeee, { emissive: 0x888888, emissiveIntensity: 0.4 }), 0.172, 0.55, 0));
  }
  if (cfg.skirt) body.add(cyl(0.15, 0.24, 0.26, mat(cfg.skirt), 0, 0.33, 0, 16));
  if (cfg.collar) for (const zz of [1, -1]) { const col = box(0.02, 0.3, 0.05, mat(cfg.collar), 0.168, 0.6, zz * 0.06); col.rotation.x = zz * 0.25; body.add(col); } // happi / jinbei lapels
  if (cfg.apron) body.add(box(0.03, 0.42, 0.3, mat(cfg.apron), 0.17, 0.4, 0)); // 前掛け
  if (cfg.sailor) { body.add(box(0.2, 0.03, 0.36, mat(cfg.sailor), -0.08, 0.76, 0)); for (const zz of [1, -1]) { const c = box(0.02, 0.2, 0.06, mat(cfg.sailor), 0.165, 0.7, zz * 0.06); c.rotation.x = zz * 0.4; body.add(c); } body.add(box(0.03, 0.06, 0.06, mat(PALETTE.red), 0.18, 0.62, 0)); } // sailor collar and scarf
  if (cfg.buttons) for (let k = 0; k < 4; k++) body.add(mesh(new THREE.SphereGeometry(0.014, 6, 4), mat(KOTO_GOLD, { metalness: 0.6 }), 0.172, 0.46 + k * 0.08, 0)); // 詰襟 buttons
  if (cfg.tie) {
    body.add(box(0.02, 0.2, 0.08, mat(PALETTE.white), 0.16, 0.66, 0)); // shirt front
    body.add(box(0.02, 0.17, 0.035, mat(cfg.tie), 0.172, 0.65, 0));
  }
  if (cfg.backpack) {
    const pack = new THREE.Group();
    pack.position.set(-0.2, 0.6, 0);
    pack.add(rbox(0.18, 0.34, 0.3, 0.07, mat(cfg.backpack), 0, 0, 0));
    pack.add(rbox(0.06, 0.14, 0.22, 0.03, mat(cfg.backpack), -0.1, -0.06, 0)); // front pocket
    if (cfg.bedroll) {
      const roll = cyl(0.07, 0.07, 0.34, mat(cfg.bedroll), 0, 0.22, 0, 12);
      roll.rotation.x = Math.PI / 2;
      pack.add(roll);
    }
    for (const s of [1, -1]) pack.add(box(0.36, 0.04, 0.04, mat(PALETTE.ink), 0.17, 0.12, s * 0.1)); // straps
    body.add(pack);
  }
  if (cfg.handbag) {
    body.add(rbox(0.16, 0.13, 0.06, 0.03, mat(cfg.handbag), 0.02, 0.42, -0.21));
    body.add(box(0.02, 0.3, 0.02, mat(cfg.handbag), 0.02, 0.62, -0.21)); // shoulder strap
  }
  if (cfg.scarf) body.add(mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 16), mat(cfg.scarf), 0, 0.77, 0)).children.at(-1).rotation.x = Math.PI / 2;

  const arms = [];
  for (const s of [1, -1]) {
    const sh = new THREE.Group();
    sh.position.set(0, 0.72, s * 0.21);
    sh.add(mesh(new THREE.CapsuleGeometry(0.055, 0.16, 4, 10), cfg.robe ? robeMat(cfg.robe, cfg.pattern ?? 'plain') : mat(cfg.top), 0, -0.13, 0));
    if (cfg.robe) { const L = cfg.longSleeve ? 0.46 : 0.26; sh.add(box(0.2, L, 0.04, cfg.haori ? mat(cfg.haori) : robeMat(cfg.robe, cfg.pattern ?? 'plain'), -0.03, -0.11 - L / 2, s * 0.03)); } // the hanging sleeve (袂; 振袖 long)
    if (cfg.carry && s > 0) { const it = carryItem(cfg.carry); it.position.set(0, -0.3, 0); sh.add(it); ud.item = it; }
    sh.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), mat(PALETTE.skin), 0, -0.28, 0));
    if (cfg.stripes) sh.add(mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.025, 10), mat(PALETTE.yellow, { metalness: 0.5 }), 0, -0.2, 0));
    if (cfg.wands) {
      const wand = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.34, 8),
        new THREE.MeshStandardMaterial({ color: PALETTE.orange, emissive: PALETTE.orange, emissiveIntensity: 1.2 }), 0.02, -0.44, 0);
      sh.add(wand);
    }
    if (cfg.briefcase && s < 0) {
      sh.add(rbox(0.28, 0.2, 0.07, 0.03, mat(cfg.briefcase), 0, -0.4, 0));
      sh.add(box(0.08, 0.04, 0.02, mat(PALETTE.ink), 0, -0.29, 0)); // handle
    }
    if (cfg.cane && s > 0) {
      sh.add(cyl(0.018, 0.018, 0.46, mat(cfg.cane), 0.04, -0.5, 0, 6));
      sh.add(box(0.1, 0.03, 0.03, mat(cfg.cane), 0.0, -0.28, 0));
    }
    arms.push(sh);
    body.add(sh);
  }

  const head = new THREE.Group();
  head.position.y = 1.0;
  head.scale.setScalar(1.25); // chibi proportions
  head.add(mesh(new THREE.SphereGeometry(0.2, 20, 14), mat(PALETTE.skin)));
  for (const s of [1, -1]) {
    head.add(mesh(new THREE.SphereGeometry(0.024, 8, 6), mat(PALETTE.ink, { roughness: 0.2 }), 0.18, 0.01, s * 0.07));
    const cheek = mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(PALETTE.pink), 0.165, -0.06, s * 0.11);
    cheek.scale.set(0.4, 0.6, 1);
    head.add(cheek);
  }
  const dome = (r, color, y = 0, thetaLen = Math.PI / 2) =>
    mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, thetaLen), mat(color), 0, y, 0);
  if (cfg.hat === 'helmet') {
    head.add(dome(0.215, PALETTE.white, 0.02));
    head.add(cyl(0.22, 0.22, 0.03, mat(PALETTE.white), 0.03, 0.03, 0, 18));
    for (const s of [1, -1]) {
      const muff = cyl(0.07, 0.07, 0.06, mat(PALETTE.ink), 0, -0.01, s * 0.2, 12);
      muff.rotation.x = Math.PI / 2;
      head.add(muff);
    }
  } else if (cfg.hat === 'cap') {
    head.add(dome(0.205, PALETTE.ink, 0.0));
    head.add(cyl(0.2, 0.19, 0.14, mat(PALETTE.white), 0, 0.17, 0, 18));
    head.add(cyl(0.2, 0.2, 0.03, mat(PALETTE.ink), 0, 0.11, 0, 18));
    head.add(rbox(0.14, 0.02, 0.24, 0.01, mat(PALETTE.ink), 0.2, 0.1, 0));
    head.add(box(0.02, 0.04, 0.08, mat(PALETTE.yellow, { metalness: 0.6 }), 0.2, 0.18, 0));
  } else if (cfg.hat === 'bun') {
    head.add(dome(0.212, cfg.hair ?? PALETTE.brown, 0.0, Math.PI * 0.55));
    head.add(mesh(new THREE.SphereGeometry(0.09, 12, 10), mat(cfg.hair ?? PALETTE.brown), -0.17, 0.12, 0));
  } else if (cfg.hat === 'long') {
    const hc = cfg.hair ?? PALETTE.brown;
    head.add(dome(0.214, hc, 0.0, Math.PI * 0.55));
    const back = mesh(new THREE.CapsuleGeometry(0.15, 0.16, 6, 14), mat(hc), -0.08, -0.1, 0);
    back.scale.set(0.8, 1, 1.3);
    head.add(back);
    if (cfg.hairTie) head.add(box(0.05, 0.06, 0.16, mat(0xf6f4ee), -0.2, -0.02, 0)); // the white paper tie (檀紙)
    const fringe = dome(0.216, hc, 0.0, Math.PI * 0.3);
    fringe.rotation.z = -0.5;
    head.add(fringe);
  } else if (cfg.hat === 'updo') { // hair put up for a kimono, with a hairpin
    head.add(dome(0.214, PALETTE.ink, 0.0, Math.PI * 0.55));
    head.add(mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(PALETTE.ink), -0.1, 0.2, 0));
    if (cfg.kanzashi) { head.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(cfg.kanzashi), -0.06, 0.24, 0.1)); head.add(box(0.015, 0.015, 0.16, mat(PALETTE.yellow, { metalness: 0.5 }), -0.08, 0.22, 0.06)); }
  } else if (cfg.hat === 'bald') { // a shaven head
    head.add(dome(0.203, 0xe0b898, 0.0, Math.PI * 0.5));
  } else if (cfg.hat === 'ajiro') { // 網代笠: a wide woven hat over the eyes
    head.add(dome(0.205, 0xe0b898, 0.0, Math.PI * 0.5));
    head.add(mesh(new THREE.ConeGeometry(0.42, 0.22, 20, 1, true), mat(0xc9a86a, { roughness: 1, side: THREE.DoubleSide }), 0, 0.12, 0));
  } else if (cfg.hat === 'sugegasa') { // 菅笠: a conical sedge hat
    head.add(dome(0.212, PALETTE.ink, 0.0, Math.PI * 0.5));
    head.add(mesh(new THREE.ConeGeometry(0.36, 0.2, 18, 1, true), mat(0xd8c48a, { roughness: 1, side: THREE.DoubleSide }), 0, 0.26, 0));
  } else if (cfg.hat === 'eboshi') { // a priest's tall black cap
    head.add(dome(0.212, PALETTE.ink, 0.0, Math.PI * 0.5));
    const e = mesh(new THREE.CapsuleGeometry(0.11, 0.18, 4, 10), mat(0x1d1f23, { roughness: 0.4 }), -0.04, 0.3, 0); e.scale.set(1, 1, 0.6); e.rotation.z = 0.3; head.add(e);
  } else if (cfg.hat === 'hachimaki') { // short hair and a twisted headband
    const hair = dome(0.212, PALETTE.ink, 0.0, Math.PI * 0.5); hair.rotation.z = 0.25; head.add(hair);
    head.add(mesh(new THREE.TorusGeometry(0.205, 0.022, 6, 20).rotateX(Math.PI / 2), mat(0xf6f4ee), 0, 0.07, 0));
    head.add(box(0.06, 0.05, 0.05, mat(0xf6f4ee), -0.21, 0.07, 0.04));
  } else if (cfg.hat === 'sankaku') { // a white headscarf tied at the back
    head.add(dome(0.214, 0xf6f4ee, 0.0, Math.PI * 0.52));
    head.add(mesh(new THREE.ConeGeometry(0.05, 0.1, 4).rotateZ(Math.PI / 2), mat(0xf6f4ee), -0.23, 0.08, 0));
  } else if (cfg.hat === 'bob') { // a bob
    head.add(dome(0.216, cfg.hair ?? PALETTE.ink, 0.0, Math.PI * 0.62));
    const back = mesh(new THREE.SphereGeometry(0.2, 14, 10), mat(cfg.hair ?? PALETTE.ink), -0.05, -0.04, 0); back.scale.set(0.9, 0.9, 1.08); head.add(back);
  } else if (cfg.hat === 'maiko') { // the maiko's swept-up hair with silk flowers and dangling pins
    head.add(dome(0.216, PALETTE.ink, 0.0, Math.PI * 0.56));
    for (const zz of [1, -1]) { const w = mesh(new THREE.SphereGeometry(0.11, 12, 8), mat(PALETTE.ink), -0.06, 0.12, zz * 0.17); w.scale.set(1, 0.8, 0.6); head.add(w); } // the side wings
    head.add(mesh(new THREE.SphereGeometry(0.13, 12, 10), mat(PALETTE.ink), -0.1, 0.25, 0)); // the top knot
    head.add(box(0.06, 0.05, 0.12, mat(0xc8283a), -0.06, 0.32, 0)); // the red silk in it
    for (let k = 0; k < 5; k++) head.add(mesh(new THREE.SphereGeometry(0.035, 6, 5), mat([cfg.kanzashi, 0xf6f4ee, 0xf2c94c][k % 3]), 0.02 - k * 0.02, 0.22 - (k % 2) * 0.04, 0.12 + k * 0.012)); // flower pins
    for (let k = 0; k < 3; k++) head.add(box(0.012, 0.12, 0.02, mat(0xf2c94c, { metalness: 0.5 }), 0.03, 0.1 - k * 0.0, 0.17 + k * 0.025)); // dangling strands
  } else if (cfg.hat === 'beret') {
    head.add(dome(0.212, cfg.hair ?? PALETTE.ink, 0.0, Math.PI * 0.55));
    const b2 = mesh(new THREE.SphereGeometry(0.2, 14, 8), mat(cfg.capColor)); b2.scale.set(1.05, 0.35, 1.05); b2.position.set(-0.02, 0.17, 0.02); b2.rotation.x = 0.25; head.add(b2);
  } else if (cfg.hat === 'flatcap') { // a flat cap (ハンチング)
    head.add(dome(0.21, 0xd9d6d0, 0.0, Math.PI * 0.5));
    const c2 = mesh(new THREE.SphereGeometry(0.22, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(cfg.capColor)); c2.scale.y = 0.45; c2.position.y = 0.08; head.add(c2);
    head.add(rbox(0.14, 0.02, 0.26, 0.01, mat(cfg.capColor), 0.2, 0.09, 0));
  } else if (cfg.hat === 'rainhat') { // a rain hat with a wide brim
    head.add(dome(0.215, cfg.capColor, 0.02));
    head.add(cyl(0.3, 0.3, 0.02, mat(cfg.capColor), 0, 0.05, 0, 18));
  } else if (cfg.hat === 'straw') { // a wide straw hat
    head.add(cyl(0.34, 0.34, 0.02, mat(0xe0c27a, { roughness: 0.9 }), 0, 0.12, 0, 20));
    head.add(dome(0.2, 0xe0c27a, 0.1));
    head.add(cyl(0.2, 0.2, 0.04, mat(PALETTE.red), 0, 0.14, 0, 18));
  } else if (cfg.hat === 'bike') { // a bicycle / scooter helmet
    head.add(dome(0.225, cfg.capColor, 0.02));
    head.add(box(0.05, 0.02, 0.3, mat(PALETTE.ink), 0.2, 0.06, 0));
  } else if (cfg.hat === 'baseball') {
    head.add(dome(0.214, cfg.capColor, 0.02));
    head.add(rbox(0.16, 0.025, 0.24, 0.012, mat(cfg.capColor), 0.2, 0.04, 0));
    head.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(cfg.capColor), 0, 0.235, 0));
  } else {
    const hair = dome(0.212, cfg.hat === 'grey' ? 0xd9d6d0 : cfg.hair ?? PALETTE.ink, 0.0, Math.PI * 0.5);
    hair.rotation.z = 0.25;
    head.add(hair);
    if (cfg.hat === 'grey') {
      for (const s of [1, -1]) { // glasses
        const lens = mesh(new THREE.TorusGeometry(0.038, 0.007, 6, 16), mat(PALETTE.ink), 0.19, 0.01, s * 0.075);
        lens.rotation.y = Math.PI / 2;
        head.add(lens);
      }
      head.add(box(0.01, 0.008, 0.07, mat(PALETTE.ink), 0.198, 0.02, 0));
    }
  }
  if (cfg.glasses && cfg.hat !== 'grey') {
    for (const s of [1, -1]) { const lens = mesh(new THREE.TorusGeometry(0.038, 0.007, 6, 16), mat(PALETTE.ink), 0.19, 0.01, s * 0.075); lens.rotation.y = Math.PI / 2; head.add(lens); }
    head.add(box(0.01, 0.008, 0.07, mat(PALETTE.ink), 0.198, 0.02, 0));
  }
  if (cfg.headphones) { // a band over the head, cups on the ears
    const band = mesh(new THREE.TorusGeometry(0.215, 0.018, 6, 18, Math.PI), mat(cfg.headphones)); band.rotation.y = Math.PI / 2; head.add(band);
    for (const s of [1, -1]) head.add(cyl(0.06, 0.06, 0.05, mat(cfg.headphones), 0, 0, s * 0.215, 12)).children.at(-1).rotation.x = Math.PI / 2;
  }
  body.add(head);

  if (cfg.suitcase) {
    const sc = new THREE.Group();
    sc.position.set(-0.05, 0, -0.38);
    sc.add(rbox(0.3, 0.4, 0.16, 0.05, mat(cfg.suitcase), 0, 0.26, 0));
    sc.add(cyl(0.012, 0.012, 0.28, mat(PALETTE.darkGrey), 0.0, 0.58, 0, 6));
    for (const x of [0.1, -0.1]) sc.add(cyl(0.03, 0.03, 0.03, mat(PALETTE.ink), x, 0.04, 0, 8)).children.at(-1).rotation.x = Math.PI / 2;
    g.add(sc);
    ud.suitcase = sc; // hidden once the bag is checked in
  }

  if (cfg.scale) g.scale.setScalar(cfg.scale);

  ud.update = (t) => {
    const m = ud.mode ?? 'idle';
    const phase = t * 7 * (cfg.pace ?? 1) + (ud.phase ?? 0);
    head.rotation.y = 0; head.rotation.z = 0; body.rotation.z = 0;
    if (m.startsWith('sit') && m !== 'sit') { // seated at a table: typing, sipping, reading, writing, thinking, a stretch
      for (const l of legs) l.rotation.z = Math.PI / 2;
      body.position.y = 0;
      const ph = ud.phase ?? 0;
      arms[0].rotation.x = arms[1].rotation.x = 0;
      if (m === 'sitType') {
        arms[0].rotation.z = 1.2 + Math.max(0, Math.sin(t * 13 + ph)) * 0.1; arms[1].rotation.z = 1.2 + Math.max(0, Math.sin(t * 11 + 1.7 + ph)) * 0.1;
        arms[0].rotation.x = 0.25; arms[1].rotation.x = -0.25; head.rotation.z = -0.12 + Math.sin(t * 0.3 + ph) * 0.04;
      } else if (m === 'sitSip') { // the cup to the mouth, slowly
        const k = (Math.sin(t * 0.8 + ph) + 1) / 2;
        arms[0].rotation.z = 1.2 + k * 1.15; arms[0].rotation.x = 0.35; arms[1].rotation.z = 0.7; head.rotation.z = k * 0.12;
      } else if (m === 'sitRead') {
        arms[0].rotation.z = arms[1].rotation.z = 1.05; arms[0].rotation.x = 0.4; arms[1].rotation.x = -0.4; head.rotation.z = -0.3;
        if (Math.sin(t * 0.25 + ph) > 0.97) arms[0].rotation.x = 0.9; // turning a page
      } else if (m === 'sitWrite') {
        arms[0].rotation.z = 1.05 + Math.sin(t * 6 + ph) * 0.05; arms[0].rotation.x = 0.3 + Math.sin(t * 9 + ph) * 0.06; arms[1].rotation.z = 0.95; arms[1].rotation.x = -0.35; head.rotation.z = -0.32;
      } else if (m === 'sitThink') { // chin on a hand, gazing
        arms[1].rotation.z = 2.0; arms[1].rotation.x = -0.55; arms[0].rotation.z = 0.9; arms[0].rotation.x = 0.3; head.rotation.z = 0.05; head.rotation.y = Math.sin(t * 0.3 + ph) * 0.35;
      } else if (m === 'sitStretch') {
        const k = Math.min(1, (Math.sin(t * 0.7 + ph) + 1.2) / 1.6);
        arms[0].rotation.x = -2.7 * k; arms[1].rotation.x = 2.7 * k; arms[0].rotation.z = arms[1].rotation.z = 0.3 * (1 - k); head.rotation.z = 0.25 * k;
      } else { arms[0].rotation.z = arms[1].rotation.z = 0.6; head.rotation.y = Math.sin(t * 0.5 + ph) * 0.4; } // sitChat
    } else if (m === 'pour' || m === 'wipe') { // the barista at work
      for (const l of legs) l.rotation.z = 0;
      body.position.y = 0; arms[0].rotation.x = arms[1].rotation.x = 0;
      if (m === 'pour') { arms[0].rotation.z = 1.3 + Math.sin(t * 1.4) * 0.15; arms[0].rotation.x = 0.35; arms[1].rotation.z = 1.25; arms[1].rotation.x = -0.35; head.rotation.z = -0.3; }
      else { arms[0].rotation.z = 1.0; arms[0].rotation.x = 0.3 + Math.sin(t * 4) * 0.4; arms[1].rotation.z = 0.2; head.rotation.z = -0.2; }
    } else if (m === 'bow' || m === 'pray' || m === 'photo' || m === 'look' || m === 'sweep') { // temple and shrine gestures
      for (const l of legs) l.rotation.z = 0;
      body.position.y = 0;
      arms[0].rotation.x = arms[1].rotation.x = 0;
      arms[0].rotation.z = arms[1].rotation.z = 0.05;
      if (m === 'bow') { body.rotation.z = -0.42; arms[0].rotation.z = arms[1].rotation.z = 0.25; } // 一礼
      else if (m === 'pray') { arms[0].rotation.z = arms[1].rotation.z = 1.25; arms[0].rotation.x = 1.0; arms[1].rotation.x = -1.0; head.rotation.z = -0.15; } // 合掌
      else if (m === 'photo') { arms[0].rotation.z = arms[1].rotation.z = 1.75; arms[0].rotation.x = 0.7; arms[1].rotation.x = -0.7; head.rotation.z = 0.2; }
      else if (m === 'look') { head.rotation.z = 0.5; head.rotation.y = Math.sin(t * 0.4 + (ud.phase ?? 0)) * 0.3; }
      else { arms[0].rotation.z = 0.45; arms[0].rotation.x = Math.sin(t * 3 + (ud.phase ?? 0)) * 0.45; body.rotation.z = -0.12; } // sweeping with a broom
    } else if (m === 'sit') {
      for (const l of legs) l.rotation.z = Math.PI / 2;
      arms[0].rotation.x = -0.05;
      arms[1].rotation.x = 0.05;
      arms[0].rotation.z = arms[1].rotation.z = 0.5;
      body.position.y = 0;
      head.rotation.y = Math.sin(t * 0.5 + (ud.phase ?? 0)) * 0.35;
    } else if (m === 'type') { // working at a desk: hands forward, small keystrokes
      for (const l of legs) l.rotation.z = 0;
      arms[0].rotation.x = arms[1].rotation.x = 0;
      arms[0].rotation.z = 1.15 + Math.max(0, Math.sin(t * 13 + (ud.phase ?? 0))) * 0.12;
      arms[1].rotation.z = 1.15 + Math.max(0, Math.sin(t * 11 + 1.7 + (ud.phase ?? 0))) * 0.12;
      body.position.y = 0;
      head.rotation.y = Math.sin(t * 0.4 + (ud.phase ?? 0)) * 0.15;
    } else if (m === 'hold' || m === 'lift' || m === 'armsUp') {
      for (const l of legs) l.rotation.z = 0;
      arms[0].rotation.x = arms[1].rotation.x = 0;
      body.position.y = 0;
      if (m === 'hold') { // holding a sign / tray in front
        arms[0].rotation.z = arms[1].rotation.z = 1.35 + Math.sin(t * 2 + (ud.phase ?? 0)) * 0.05;
      } else if (m === 'lift') { // lifting bags: arms swing between low and chest height
        const k = (Math.sin(t * 3 + (ud.phase ?? 0)) + 1) / 2;
        arms[0].rotation.z = arms[1].rotation.z = 0.5 + k * 1.0;
        body.position.y = -k * 0.03;
      } else { // body scanner pose
        arms[0].rotation.x = -2.7;
        arms[1].rotation.x = 2.7;
        arms[0].rotation.z = arms[1].rotation.z = 0;
      }
    } else if (m === 'walk') {
      const st = cfg.stride ?? 0.55; // kimono: small steps
      legs[0].rotation.z = Math.sin(phase) * st;
      legs[1].rotation.z = -Math.sin(phase) * st;
      arms[0].rotation.z = ud.item ? HOLD[cfg.carry] ?? 0.5 : -Math.sin(phase) * 0.45;
      arms[1].rotation.z = Math.sin(phase) * 0.45;
      arms[0].rotation.x = arms[1].rotation.x = 0;
      body.position.y = Math.abs(Math.cos(phase)) * 0.03;
    } else if (m === 'signal') {
      const sw = Math.sin(t * 4) * 0.35;
      arms[0].rotation.x = -(2.5 + sw);
      arms[1].rotation.x = 2.5 + sw;
      arms[0].rotation.z = arms[1].rotation.z = 0;
      legs[0].rotation.z = legs[1].rotation.z = 0;
      body.position.y = 0;
    } else {
      for (const l of legs) l.rotation.z = 0;
      arms[0].rotation.x = -0.08;
      arms[1].rotation.x = 0.08;
      arms[0].rotation.z = arms[1].rotation.z = Math.sin(t * 1.6) * 0.05;
      body.position.y = Math.sin(t * 1.6) * 0.008;
      head.rotation.y = Math.sin(t * 0.7 + (ud.phase ?? 0)) * 0.3;
    }
  };
  const baseUpdate = ud.update;
  if (ud.item) ud.update = (t) => {
    baseUpdate(t);
    if (ud.mode === 'idle' || ud.mode === 'walk') arms[0].rotation.z = HOLD[cfg.carry] ?? 0.5;
    ud.item.rotation.z = -arms[0].rotation.z;
    if (cfg.carry === 'mug') ud.item.visible = ud.mode === 'sitSip' || ud.mode === 'walk' || ud.mode === 'idle'; // otherwise it is on the table
    if (cfg.carry === 'umbrella') ud.item.visible = ud.umbrella !== false;
  };
  return compactRig(g);
}

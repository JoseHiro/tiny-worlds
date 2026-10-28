// Roads & towns — street equipment (town/DESIGN.md §2.2). First: the traffic light.
import * as THREE from 'three';
import { mat, mesh, box, cyl, rbox } from '../../airport/src/parts.js';
import { compactRig } from '../../airport/src/merge.js';
import { LANE, WALK } from './roads.js';

const pole = mat(0xb9bcc0, { roughness: 0.5, metalness: 0.3 });
const housing = mat(0x8e9298, { roughness: 0.6 });
const black = mat(0x1d1f23, { roughness: 0.7 });

// Lamp materials are shared by every light showing the same group at one junction, so switching is cheap.
const LAMP = { green: [0x0b3f33, 0x33ffc9], yellow: [0x4a3a10, 0xffc23a], red: [0x4a1414, 0xff3a2a] };
export function lampSet() {
  const make = ([c, e]) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 0, roughness: 0.35 });
  return { green: make(LAMP.green), yellow: make(LAMP.yellow), red: make(LAMP.red), walk: make(LAMP.green), stop: make(LAMP.red) };
}
// state: green | yellow | red · pedestrian: walk | blink | stop
export function showLamps(set, state, pedestrian, t) {
  for (const k of ['green', 'yellow', 'red']) set[k].emissiveIntensity = k === state ? 2.4 : 0;
  set.walk.emissiveIntensity = pedestrian === 'walk' || (pedestrian === 'blink' && Math.floor(t * 4) % 2) ? 2.0 : 0;
  set.stop.emissiveIntensity = pedestrian === 'stop' ? 2.0 : 0;
}

// ---------- 信号機 (Japanese: three lamps in a row, green · yellow · red from the driver's left) ----------
// The pole stands at the origin on the driver's left; the lamps face +X (the driver looks −X at them);
// the arm reaches over the road toward −Z, so green is nearest the pole.
export function trafficLight(set, { arm = 2.4, height = 4.4, pedestrian = true } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'trafficLight' };
  g.add(cyl(0.09, 0.11, height, pole, 0, height / 2, 0, 10));
  const hy = height - 0.15, hz = -(arm - 0.35);
  const armM = cyl(0.05, 0.06, arm, pole, 0, hy + 0.3, -arm / 2, 8);
  armM.rotation.x = Math.PI / 2;
  g.add(armM);
  g.add(box(0.04, 0.3, 0.04, pole, 0, hy + 0.17, hz)); // hanger
  g.add(box(0.26, 0.42, 1.18, housing, 0, hy, hz));
  g.add(box(0.03, 0.5, 1.3, housing, -0.15, hy, hz)); // back plate
  ['green', 'yellow', 'red'].forEach((k, i) => {
    const z = hz + (1 - i) * 0.38;
    const lamp = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16).rotateZ(Math.PI / 2), set[k]);
    lamp.position.set(0.14, hy, z);
    const hood = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 16, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), black);
    hood.position.set(0.21, hy + 0.01, z);
    g.add(lamp, hood);
  });
  if (pedestrian) {
    // for people crossing beside this traffic: the same way, at eye height, with a push button below
    const py = 2.5;
    g.add(box(0.24, 0.7, 0.36, housing, 0.14, py, 0));
    for (const [k, y] of [['stop', 0.16], ['walk', -0.16]]) {
      const l = mesh(new THREE.PlaneGeometry(0.24, 0.24), set[k]);
      l.position.set(0.265, py + y, 0);
      l.rotation.y = Math.PI / 2;
      g.add(l);
    }
    g.add(box(0.1, 0.18, 0.12, mat(0xf2c94c), 0.12, 1.15, 0));
  }
  return compactRig(g);
}

// Four lights at a crossroads tile: for each approach, on its far-left corner (as in Japan).
// Add to the tile group (local coordinates). Returns update(t) to call each frame.
export function junctionLights(tileGroup, ctrl) {
  const sets = { ew: lampSet(), ns: lampSet() };
  const R = LANE + WALK * 0.55;
  const approaches = [ // heading of the traffic, and its far-left corner
    { group: 'ew', h: [1, 0] }, { group: 'ew', h: [-1, 0] }, { group: 'ns', h: [0, 1] }, { group: 'ns', h: [0, -1] },
  ];
  for (const { group, h } of approaches) {
    const left = [h[1], -h[0]]; // we drive on the left
    const l = trafficLight(sets[group], { arm: R - LANE / 2 + 0.25 });
    l.position.set((h[0] + left[0]) * R, 0.12, (h[1] + left[1]) * R);
    l.rotation.y = Math.atan2(h[1], -h[0]); // lamps (+X) face back toward the driver
    tileGroup.add(l);
  }
  // time left in the current phase (for the blinking walk light)
  const remaining = () => { let t = ctrl.t % ctrl.cycle; for (const p of ctrl.plan) { if (t < p[2]) return p[2] - t; t -= p[2]; } return 0; };
  const update = (t) => {
    for (const grp of ['ew', 'ns']) {
      const st = ctrl.state(grp);
      showLamps(sets[grp], st, st === 'green' ? (remaining() < 3 ? 'blink' : 'walk') : 'stop', t);
    }
  };
  update(0);
  return { sets, update };
}

// ---------- the rest of the street (town/DESIGN.md §2.2) ----------
// Each piece stands on y = 0 at the origin, facing +X (toward the road / the driver) unless noted.

const metal = mat(0xb9bcc0, { roughness: 0.45, metalness: 0.35 });
const white = mat(0xf4f2ec, { roughness: 0.6 });
const red = mat(0xd9362b, { roughness: 0.5 });
const texCache = new Map();
// a canvas texture drawn by fn(ctx, w, h), cached by key (signs, timetables, vending fronts)
function canvasTex(key, w, h, fn) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}
const texMat = (key, w, h, fn, extra = {}) => mat(0xffffff, { map: canvasTex(key, w, h, fn), roughness: 0.55, ...extra });
const facePlane = (w, h, m, x, y, z, ry = Math.PI / 2) => { const p = mesh(new THREE.PlaneGeometry(w, h), m, x, y, z); p.rotation.y = ry; return p; };

// 案内標識: a blue (or green) direction sign over the road on a pole. lines: [[arrow, place, sub], ...]
export function guideSign({ lines = [['↑', '那覇市街', 'Naha City'], ['←', '那覇空港', 'Airport'], ['→', '海浜公園', 'Beach']], color = '#1f5fa8', width = 3.6, height = 2.2, arm = 3.2 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'guideSign' };
  const H0 = 5.2;
  g.add(cyl(0.12, 0.14, H0 + 0.4, metal, 0, (H0 + 0.4) / 2, 0, 10));
  const armM = cyl(0.07, 0.08, arm, metal, 0, H0, -arm / 2, 8); armM.rotation.x = Math.PI / 2; g.add(armM);
  const key = 'guide|' + color + '|' + lines.map((l) => l.join(',')).join('|');
  const face = texMat(key, 512, 320, (c, w, h) => {
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    lines.forEach(([arrow, place, sub], i) => {
      const y = 70 + i * 92;
      c.fillStyle = '#fff'; c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.fillText(arrow, 70, y + 18);
      c.textAlign = 'left'; c.font = 'bold 50px sans-serif'; c.fillText(place, 130, y + 6);
      c.font = 'bold 26px sans-serif'; c.fillText(sub, 132, y + 38);
    });
  });
  g.add(box(0.1, height, width, mat(0x8e9298), -0.06, H0 - height / 2 + 0.6, -arm + width / 2));
  g.add(facePlane(width, height, face, 0.0, H0 - height / 2 + 0.6, -arm + width / 2));
  return compactRig(g);
}

// 規制標識: stop (red inverted triangle), speed limit, no parking — on a short pole
export function roadSign(kind = 'stop', { speed = 40 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'roadSign', sign: kind };
  g.add(cyl(0.04, 0.04, 2.3, metal, 0, 1.15, 0, 8));
  const draw = {
    stop: (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#d9362b'; c.beginPath(); c.moveTo(8, 12); c.lineTo(w - 8, 12); c.lineTo(w / 2, h - 10); c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 8; c.stroke(); c.fillStyle = '#fff'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.fillText('止まれ', w / 2, 92); },
    speed: (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, 7); c.fill(); c.strokeStyle = '#d9362b'; c.lineWidth = 22; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 18, 0, 7); c.stroke(); c.fillStyle = '#1f5fa8'; c.font = 'bold 110px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(speed), w / 2, h / 2 + 6); },
    noParking: (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#1f5fa8'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, 7); c.fill(); c.strokeStyle = '#d9362b'; c.lineWidth = 20; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 16, 0, 7); c.stroke(); c.beginPath(); c.moveTo(w * 0.25, h * 0.25); c.lineTo(w * 0.75, h * 0.75); c.stroke(); },
  }[kind];
  const m = mat(0xffffff, { map: canvasTex('sign|' + kind + speed, 256, 256, draw), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 });
  g.add(facePlane(0.7, 0.7, m, 0.05, 2.0, 0));
  return compactRig(g);
}

// 街灯: a slim pole with the lamp out over the road (+X); light: on at night
export function streetLight({ height = 5, reach = 1.4 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'streetLight' };
  g.add(cyl(0.06, 0.1, height, metal, 0, height / 2, 0, 10));
  const armM = cyl(0.04, 0.04, reach, metal, reach / 2, height - 0.1, 0, 8); armM.rotation.z = Math.PI / 2; g.add(armM);
  const lamp = new THREE.MeshStandardMaterial({ color: 0xf6f1e0, emissive: 0xfff1c8, emissiveIntensity: 0.3 });
  g.add(rbox(0.6, 0.12, 0.26, 0.04, mat(0x8e9298), reach - 0.05, height - 0.04, 0));
  g.add(box(0.5, 0.03, 0.2, lamp, reach - 0.05, height - 0.11, 0));
  g.userData.setNight = (on) => { lamp.emissiveIntensity = on ? 2.4 : 0.3; };
  return compactRig(g);
}

// ガードレール: a white corrugated rail on posts, `length` along X
export function guardrail({ length = 6 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'guardrail' };
  const rail = mat(0xf0f0ec, { metalness: 0.4, roughness: 0.35 });
  for (let x = -length / 2; x <= length / 2 + 0.01; x += 2) g.add(box(0.1, 0.75, 0.1, mat(0x9aa0a6), x, 0.38, 0));
  for (const y of [0.55, 0.7]) g.add(box(length, 0.1, 0.05, rail, 0, y, 0.07));
  return compactRig(g);
}

// カーブミラー: an orange post with a round convex mirror
export function curveMirror() {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'curveMirror' };
  const orange = mat(0xe8673c, { roughness: 0.5 });
  g.add(cyl(0.05, 0.05, 2.7, orange, 0, 1.35, 0, 8));
  const rim = mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24), orange, 0.05, 2.7, 0); rim.rotation.y = Math.PI / 2; g.add(rim);
  const glassM = mat(0xcfe3ee, { metalness: 0.9, roughness: 0.05 });
  const m = mesh(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, 0.6), glassM, 0.02, 2.7, 0); m.rotation.z = -Math.PI / 2; g.add(m);
  g.add(box(0.1, 0.12, 0.6, orange, -0.05, 3.15, 0));
  return compactRig(g);
}

// 電柱: a concrete pole with cross-arm, insulators and a transformer; wires() hangs lines between poles
export function powerPole({ height = 7, transformer = true } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'powerPole', tops: [] };
  const concrete = mat(0xb8b4ab, { roughness: 0.9 });
  g.add(cyl(0.11, 0.17, height, concrete, 0, height / 2, 0, 10));
  g.add(box(0.12, 0.12, 1.8, mat(0x6f6a62), 0, height - 0.5, 0));
  for (const z of [-0.75, 0, 0.75]) { g.add(cyl(0.05, 0.05, 0.16, mat(0xe8e2d4), 0, height - 0.36, z, 8)); g.userData.tops.push(new THREE.Vector3(0, height - 0.28, z)); }
  if (transformer) { g.add(cyl(0.25, 0.25, 0.7, mat(0x9aa0a6, { metalness: 0.3 }), 0.32, height - 1.6, 0, 12)); g.add(box(0.3, 0.06, 0.06, mat(0x6f6a62), 0.16, height - 1.4, 0)); }
  for (let y = 2.5; y < height - 1; y += 0.45) g.add(box(0.03, 0.03, 0.24, mat(0x6f6a62), 0, y, (y * 10) % 2 > 1 ? 0.12 : -0.12)); // step bolts
  return compactRig(g);
}
// sagging wires between two poles (world positions of their tops), as one thin mesh
export function wires(a, b, { sag = 0.5, n = 12 } = {}) {
  const g = new THREE.Group();
  const black = mat(0x24262b, { roughness: 0.8 });
  for (let i = 0; i < a.length; i++) {
    const pts = Array.from({ length: n + 1 }, (_, k) => { const t = k / n; const p = a[i].clone().lerp(b[i], t); p.y -= sag * 4 * t * (1 - t); return p; });
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.018, 4, false), black));
  }
  g.userData = { kind: 'gear', gear: 'wires' };
  return g;
}

// バス停: the stop sign with a timetable, a roofed shelter with a bench (shelter along X, open toward +Z)
export function busStop({ name = '海浜公園前', shelter = true } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'busStop' };
  g.add(cyl(0.05, 0.05, 2.4, metal, -1.6, 1.2, 0.3, 8));
  const plate = texMat('bus|' + name, 256, 256, (c, w, h) => {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill();
    c.strokeStyle = '#2fa58f'; c.lineWidth = 14; c.stroke();
    c.fillStyle = '#1c2232'; c.textAlign = 'center'; c.font = 'bold 40px sans-serif'; c.fillText('バス', w / 2, 100);
    c.font = 'bold 30px sans-serif'; c.fillText(name, w / 2, 150); c.font = '20px sans-serif'; c.fillText('BUS STOP', w / 2, 186);
  }, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const p = mesh(new THREE.PlaneGeometry(0.62, 0.62), plate, -1.6, 2.3, 0.33); g.add(p);
  g.add(box(0.4, 0.55, 0.04, white, -1.6, 1.45, 0.34)); // timetable
  if (shelter) {
    const frame = mat(0x8e9298, { metalness: 0.4 });
    const roof = mat(0x2fa58f, { roughness: 0.5 });
    for (const x of [-1.2, 1.2]) g.add(box(0.08, 2.2, 0.08, frame, x, 1.1, -0.45));
    g.add(box(2.8, 0.1, 1.3, roof, 0, 2.25, -0.1));
    g.add(box(2.4, 1.6, 0.04, mat(0xcfe1e8, { transparent: true, opacity: 0.35, depthWrite: false }), 0, 1.2, -0.5));
    g.add(box(2.0, 0.08, 0.4, mat(0xc9b28a), 0, 0.48, -0.25));
    for (const x of [-0.8, 0.8]) g.add(box(0.06, 0.44, 0.06, frame, x, 0.24, -0.25));
  }
  return compactRig(g);
}

// 自動販売機: a glowing box of drinks (front faces +X)
export function vendingMachine({ color = '#d9362b' } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'vending' };
  g.add(box(0.75, 1.45, 0.95, mat(parseInt(color.slice(1), 16), { roughness: 0.45 }), 0, 0.72, 0));
  const front = texMat('vend|' + color, 256, 384, (c, w, h) => {
    c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, w, h);
    const cols = ['#e8673c', '#2fa58f', '#3a7fd0', '#f2b84b', '#d9465b', '#7a5a3a'];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { c.fillStyle = cols[(r + k) % cols.length]; c.fillRect(14 + k * 39, 18 + r * 52, 26, 40); c.fillStyle = '#1c2232'; c.fillRect(18 + k * 39, 62 + r * 52, 18, 5); }
    c.fillStyle = '#1c2232'; c.fillRect(30, 250, w - 60, 70); c.fillStyle = '#7fd6c2'; c.fillRect(150, 268, 60, 14);
  }, { emissive: 0xffffff, emissiveIntensity: 0.35 });
  front.emissiveMap = front.map;
  g.add(facePlane(0.85, 1.28, front, 0.378, 0.8, 0));
  g.add(box(0.2, 0.36, 0.95, mat(0x2a2d33), -0.48, 0.2, 0)); // the bin beside it
  return compactRig(g);
}

// ポスト・消火栓・ボラード
export function postBox() {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'postBox' };
  g.add(cyl(0.06, 0.06, 0.5, mat(0x3b3e44), 0, 0.25, 0, 8));
  g.add(box(0.4, 0.62, 0.45, red, 0, 0.8, 0));
  g.add(cyl(0.23, 0.23, 0.45, red, 0, 1.12, 0, 16).rotateX(Math.PI / 2));
  g.add(box(0.03, 0.05, 0.28, mat(0x1c1d21), 0.205, 0.95, 0));
  return compactRig(g);
}
export function hydrant() {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'hydrant' };
  g.add(cyl(0.13, 0.15, 0.7, red, 0, 0.35, 0, 12));
  g.add(mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 0.7, 0));
  for (const z of [-0.16, 0.16]) g.add(cyl(0.05, 0.05, 0.12, red, 0, 0.5, z, 8).rotateX(Math.PI / 2));
  return compactRig(g);
}
export function bollard() {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'bollard' };
  g.add(cyl(0.08, 0.08, 0.8, metal, 0, 0.4, 0, 12));
  g.add(cyl(0.085, 0.085, 0.08, mat(0xf2c94c), 0, 0.68, 0, 12));
  return compactRig(g);
}

// 横断歩道橋: a footbridge over the road (span along Z, stairs at both ends going down along X)
export function footbridge({ span = 11, height = 5 } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'footbridge' };
  const blue = mat(0x4f7fb0, { roughness: 0.55 }), deck = mat(0xc9c5bc);
  g.add(box(1.6, 0.25, span + 1.6, deck, 0, height, 0));
  for (const s of [1, -1]) {
    g.add(box(0.06, 1.0, span + 1.6, blue, s * 0.8, height + 0.6, 0));
    for (const z of [-span / 2, span / 2]) g.add(box(0.3, height, 0.3, blue, s * 0.6, height / 2, z));
  }
  for (const zs of [1, -1]) { // stairs down toward +X at each end
    const steps = 14;
    for (let i = 0; i < steps; i++) g.add(box(height / steps * 1.2, 0.12, 1.4, deck, 0.8 + (i + 0.5) * (height / steps) * 1.2, height - (i + 1) * (height / steps), zs * (span / 2 + 0.1)));
    g.add(box(0.12, height * 1.25, 0.12, blue, 0.8 + height * 1.2, height / 2, zs * (span / 2 + 0.85)));
  }
  return compactRig(g);
}

// 工事: cones, a blinking arrow board, a barrier, a sign — roadworks closing one lane (along X)
export function roadworks() {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'roadworks' };
  const cone = mat(0xe8673c), stripeW = mat(0xf4f2ec);
  for (let i = 0; i < 6; i++) {
    const x = -3 + i * 1.1, z = i < 2 ? 0.6 - i * 0.4 : -0.2;
    g.add(cyl(0.02, 0.16, 0.6, cone, x, 0.32, z, 10));
    g.add(cyl(0.11, 0.13, 0.08, stripeW, x, 0.38, z, 10));
    g.add(box(0.36, 0.04, 0.36, mat(0x2a2d33), x, 0.02, z));
  }
  const board = new THREE.Group();
  board.add(box(0.5, 1.2, 0.06, mat(0x2a2d33), 0, 0.6, 0));
  const arrow = new THREE.MeshStandardMaterial({ color: 0x4a3a10, emissive: 0xffc23a, emissiveIntensity: 2 });
  for (let k = 0; k < 4; k++) board.add(box(0.06, 0.08, 0.08, arrow, 0.03, 1.0 - k * 0.12, 0.12 - Math.abs(1.5 - k) * 0.05));
  board.position.set(-3.6, 0, 0.4);
  g.add(board);
  const bar = mat(0xf2c94c);
  for (let i = 0; i < 4; i++) g.add(box(0.25, 0.18, 0.06, i % 2 ? stripeW : bar, 3.425 + i * 0.25, 0.7, -0.2)); // barrier, striped
  g.add(box(0.06, 0.8, 0.06, mat(0x9aa0a6), 3.3, 0.4, -0.2)); g.add(box(0.06, 0.8, 0.06, mat(0x9aa0a6), 4.3, 0.4, -0.2));
  const sign = texMat('works', 256, 256, (c, w, h) => { c.fillStyle = '#f2c94c'; c.fillRect(0, 0, w, h); c.fillStyle = '#1c2232'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.fillText('工事中', w / 2, 110); c.font = 'bold 28px sans-serif'; c.fillText('ご迷惑をおかけします', w / 2, 170); });
  g.add(facePlane(0.9, 0.9, sign, 1.6, 1.0, -0.2)); g.add(box(0.04, 1.4, 0.04, mat(0x9aa0a6), 1.58, 0.7, -0.2));
  let t = 0;
  g.userData.update = (time, dt) => { t += dt; arrow.emissiveIntensity = Math.floor(t * 2) % 2 ? 2.4 : 0.1; };
  return compactRig(g);
}

// のぼり旗: a tall narrow banner on a pole that flutters (text runs down it)
export function banner({ text = '新発売', color = '#e8673c' } = {}) {
  const g = new THREE.Group();
  g.userData = { kind: 'gear', gear: 'banner' };
  g.add(cyl(0.025, 0.025, 2.1, mat(0xdcdcdc), 0, 1.05, 0, 6));
  g.add(box(0.03, 0.03, 0.48, mat(0xdcdcdc), 0, 2.02, 0.24));
  const cloth = texMat('nobori|' + text + color, 128, 512, (c, w, h) => { c.fillStyle = color; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 84px sans-serif'; c.textAlign = 'center'; [...text].forEach((ch, i) => c.fillText(ch, w / 2, 110 + i * 100)); }, { side: THREE.DoubleSide });
  const flag = new THREE.Group();
  const pl = mesh(new THREE.PlaneGeometry(0.46, 1.6, 4, 1), cloth, 0, 0, 0.24); pl.rotation.y = Math.PI / 2;
  flag.add(pl);
  flag.position.y = 1.2;
  flag.userData.dynamic = true;
  g.add(flag);
  g.userData.update = (t) => { flag.rotation.y = Math.sin(t * 2.3 + g.id) * 0.3; };
  return g;
}

// Roads & towns — street equipment (town/DESIGN.md §2.2). First: the traffic light.
import * as THREE from 'three';
import { mat, mesh, box, cyl } from '../../airport/src/parts.js';
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

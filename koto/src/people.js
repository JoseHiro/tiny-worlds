// People of scene A+B (koto/DESIGN.md §7.5): each walks a route of steps — walk to a point, do something (bow, wash,
// pray, take a photo…) facing some way, wait, or jump back to the foot of the street to start again.
import * as THREE from 'three';
import { person } from '../../airport/src/parts.js';

// the yaw that faces a person (nose +X) along (dx, dz)
export const yawTo = (dx, dz) => Math.atan2(-dz, dx);
export const FACE = { up: Math.PI / 2, down: -Math.PI / 2, east: 0, west: Math.PI }; // up = toward the temple (−Z)

export class Agent {
  // route: [{ jump: [x, z] } | { to: [x, z], label? } | { do: mode, dur, face, label? } | { hide: dur }] — loops
  // (hide: gone indoors for a while) · { until: () => bool, face?, label? }: wait (idle) until it is true
  constructor(scene, role, route, { heightAt, speed = 1.0, delay = 0, phase = 0 } = {}) {
    this.p = person(role, { mode: 'idle' });
    this.p.userData.phase = phase;
    this.route = route; this.heightAt = heightAt; this.speed = speed;
    this.i = 0; this.t = -delay; this.label = '';
    const first = route.find((s) => s.jump || s.to);
    this.place(...(first.jump ?? first.to));
    this.p.visible = delay <= 0;
    scene.add(this.p);
  }
  place(x, z) { this.p.position.set(x, this.heightAt(x, z), z); }
  update(t, dt) {
    if (this.t < 0) { this.t += dt; this.p.visible = this.t >= 0; if (this.t < 0) return; }
    const s = this.route[this.i], ud = this.p.userData;
    if (s.label) this.label = s.label;
    if (s.jump) { this.place(...s.jump); this.next(); }
    else if (s.until) { ud.mode = 'idle'; if (s.face !== undefined) this.p.rotation.y = s.face; if (s.until()) this.next(); }
    else if (s.hide !== undefined && typeof s.hide === 'function') { this.p.visible = false; if (s.hide()) { this.p.visible = true; this.next(); } return; }
    else if (s.hide !== undefined) { this.p.visible = false; this.t += dt; if (this.t >= s.hide) { this.p.visible = true; this.next(); } return; }
    else if (s.to) {
      const [x, z] = s.to, P = this.p.position, dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz), step = this.speed * dt;
      ud.mode = 'walk';
      if (d <= step) { this.place(x, z); this.next(); }
      else { this.place(P.x + (dx / d) * step, P.z + (dz / d) * step); this.p.rotation.y = yawTo(dx, dz); }
    } else {
      ud.mode = s.do;
      if (s.face !== undefined) this.p.rotation.y = s.face;
      this.t += dt;
      if (this.t >= s.dur) this.next();
    }
    ud.update(t);
  }
  next() { this.i = (this.i + 1) % this.route.length; this.t = 0; }
}

// ---------- routes ----------
// l: how far from the middle of the street this person keeps (keep left: up on −x, down on +x)
export function worshipRoute(l, { wash = true, pagoda = true, garden = false, j = 0 } = {}) {
  const r = [
    { jump: [-l, 35.5], label: '坂の下から参道を上る' },
    { to: [-l, 1.0] },
    { to: [-l * 0.45, -3.3], label: '石段を上る' },
    { do: 'bow', dur: 1.0, face: FACE.up, label: '山門の前で一礼' },
    { to: [-l * 0.35, -12], label: '山門をくぐる' },
  ];
  if (wash) r.push({ to: [4.7, -14.6 + j], label: '手水舎へ' }, { do: 'hold', dur: 2.6, face: FACE.east, label: '手水で手と口を清める' }, { to: [1.0, -18] });
  r.push(
    { to: [-l * 0.5, -35.6], label: '本堂へ' },
    { do: 'bow', dur: 1.1, face: FACE.up, label: '本堂の前で一礼' },
    { do: 'pray', dur: 2.8, face: FACE.up, label: 'お賽銭を入れて合掌' },
    { do: 'bow', dur: 1.1, face: FACE.up, label: 'もう一度一礼' },
  );
  if (pagoda) r.push({ to: [4.5, -34.6] }, { to: [8.2, -27.5 + j], label: '五重塔へ' }, { do: 'photo', dur: 2.4, face: yawTo(6.8, -2.5 - j), label: '五重塔の写真を撮る' }, { do: 'look', dur: 1.6, face: yawTo(6.8, -2.5 - j), label: '見上げる' });
  if (garden) r.push({ to: [0, -23] }, { to: [-11, -24.5], label: '庭へ' }, { do: 'look', dur: 2.5, face: yawTo(-4, -5), label: '枯山水を眺める' });
  r.push(
    { to: [l * 0.35, -12], label: '山門へ戻る' },
    { to: [l * 0.45, -3.3] },
    { to: [l, 1.0], label: '参道を下る' },
    { to: [l, 35.5] },
  );
  return r;
}
// a walk up the street looking at shops, and back down
export function strollRoute(l, stops) {
  const r = [{ jump: [-l, 35.5] }];
  for (const [z, side] of stops) { r.push({ to: [-l, z] }, { to: [-2.4 * side, z] }, { do: 'idle', dur: 2 + (z % 3), face: side > 0 ? FACE.west : FACE.east }, { to: [-l, z - 0.5] }); }
  r.push({ to: [-l, 2.0] }, { do: 'look', dur: 1.5, face: FACE.up }, { to: [l, 2.0] }, { to: [l, 35.5] });
  return r;
}
// a monk sweeping the path: a few strokes, a few steps
export function sweepRoute(x, z0, z1) {
  const r = [];
  for (let z = z0; z > z1; z -= 2.5) r.push({ to: [x, z] }, { do: 'sweep', dur: 5, face: FACE.down });
  for (let z = z1; z < z0; z += 2.5) r.push({ to: [x + 0.6, z] }, { do: 'sweep', dur: 5, face: FACE.up });
  return r;
}

// a group following its leader along the same route, a little behind each other
export function group(scene, roles, route, opts) {
  return roles.map((role, k) => new Agent(scene, role, route.map((s) => (s.to ? { ...s, to: [s.to[0] + (k % 2 ? 0.45 : 0), s.to[1]] } : s.jump ? { ...s, jump: [s.jump[0] + (k % 2 ? 0.45 : 0), s.jump[1]] } : s)), { ...opts, delay: (opts.delay ?? 0) + k * 0.75 + (k % 2 ? 0 : 0.2), phase: k }));
}

// someone sitting or standing still, facing yaw
export function still(scene, role, mode, [x, y, z], yaw) {
  const p = person(role, { mode });
  p.position.set(x, y, z); p.rotation.y = yaw; p.userData.phase = x * 3 + z;
  scene.add(p);
  return { update: (t) => p.userData.update(t), p };
}
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

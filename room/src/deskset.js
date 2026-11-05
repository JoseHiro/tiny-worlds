// The desk corner as one set (room/DESIGN.md §4.1, §5, §6): the desk and all on it, the chair with the hoodie, the
// person at the keyboard, the PC, the shelf and the neon on the wall behind, and the desk's own lights. Its frame:
// the wall behind the desk is the plane z = 0, the room is +z, the desk is centred on x = 0. Used by the sample and the room.
import * as THREE from 'three';
import { mat, mesh, box, rbox, person } from '../../airport/src/parts.js';
import { MugSteam } from './steam.js';
import { Screens } from './screens.js';
import { DESK, desk, deskMat, monitor, monitorArm, lightBar, keyboard, mouse, laptopOnStand, mug, rubberDuck, pothos, headphones, speaker, note, notebookAndPen, phoneStand, officeChair, pcTower, neonSign } from './desk.js';

// the night at the desk: mostly typing; a sip of coffee, a think, a stretch now and then
export const NIGHT = [['sitType', 16], ['sitSip', 4], ['sitType', 12], ['sitThink', 6], ['sitType', 14], ['sitStretch', 3]];
export const ME = 0.74; // (the room's things are true to size, so the chibi figure is taken down a little or its head hides the screens)

export function deskSet(scene) {
  const g = new THREE.Group();
  const at = (o, x, y, z, yaw = 0, parent = g) => { o.position.set(x, y, z); o.rotation.y = yaw; parent.add(o); return o; };

  // ---------- the desk ----------
  const D = at(new THREE.Group(), 0, 0, DESK.d / 2 + 0.03);
  D.add(desk());
  const T = DESK.h, top = (o, x, z, yaw = 0, y = 0) => at(o, x, T + y, z, yaw, D);
  top(deskMat(), -0.02, 0.09);
  const screens = new Screens();
  const kb = top(keyboard(), -0.04, 0.1, 0, 0.004);
  screens.onKey = (ch) => kb.userData.press(ch);
  top(mouse(), 0.22, 0.11, -0.1, 0.004);
  const main = top(monitor(screens, 'main', 0.56, 0.315), 0, -0.11, 0, 0.33);
  const tall = top(monitor(screens, 'tall', 0.177, 0.315), -0.42, -0.08, 0.38, 0.33);
  main.rotation.x = -0.05;
  top(monitorArm([[0.1, 0.33, 0.1], [-0.33, 0.33, 0.13]]), -0.1, -0.235);
  const bar = top(lightBar(), 0, -0.122, 0, 0.33 + 0.168);
  top(laptopOnStand(screens), 0.36, -0.02, -0.55);
  const cup = top(mug(), 0.37, 0.19);
  top(rubberDuck(), -0.26, -0.03, 0.5);
  top(pothos(), -0.47, 0.14);
  top(headphones(), 0.47, -0.2);
  top(notebookAndPen(), -0.31, 0.18, 0.35);
  top(phoneStand(), 0.17, -0.12, -0.2);
  const n1 = note(0xffe066), n2 = note(0xff9fb2, 2); n1.position.set(-0.24, -0.13, 0.0066); n1.rotation.z = 0.08; n2.position.set(-0.19, -0.135, 0.0067); n2.rotation.z = -0.12; main.add(n1, n2);
  at(box(0.44, 0.006, 0.004, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9b6cff).multiplyScalar(2) })), 0, 0.17, -0.035, 0, main); // the LED strip behind the monitor

  // ---------- under and around the desk ----------
  const pc = at(pcTower(), 0.27, 0, 0.3); // (glass side to the room, fans to the front)
  at(officeChair(), -0.03, 0, 0.82, Math.PI + 0.08);
  const me = person('coder', { mode: 'sitType' }); me.scale.setScalar(ME); at(me, -0.03, 0.36 - 0.26 * ME, 0.82, Math.PI / 2 + 0.08);
  // a shelf on the wall over the right of the desk: books, a speaker, a little figure; and the neon on the left
  const shelf = at(new THREE.Group(), 0.5, 1.22, 0.1);
  shelf.add(box(0.5, 0.018, 0.16, mat(0x6b4a35, { roughness: 0.6 }), 0, 0, 0));
  for (const s of [-1, 1]) shelf.add(box(0.012, 0.05, 0.08, mat(0x1e1f23), s * 0.2, -0.03, -0.03));
  const BOOKS = [0x2f3e57, 0xc9714a, 0xefe3c8, 0x5f8f4a, 0x82aaff, 0x1e1f23, 0xd9a441, 0xb5452b];
  let bx = -0.23; BOOKS.forEach((c, i) => { const w = 0.022 + (i % 3) * 0.006, h = 0.15 + ((i * 5) % 4) * 0.015; shelf.add(box(w, h, 0.12, mat(c, { roughness: 0.8 }), bx + w / 2, 0.009 + h / 2, 0)); bx += w + 0.002; });
  const lean = box(0.024, 0.16, 0.12, mat(0x9fd6c2, { roughness: 0.8 }), bx + 0.03, 0.085, 0); lean.rotation.z = -0.3; shelf.add(lean);
  at(speaker(), 0.12, 0.009, 0.01, -0.2, shelf);
  const fig = at(new THREE.Group(), 0.2, 0.009, 0.02, -0.4, shelf);
  fig.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 16), mat(0x1e1f23), 0, 0.003, 0));
  fig.add(rbox(0.03, 0.04, 0.02, 0.008, mat(0xe8673c), 0, 0.026, 0)); fig.add(mesh(new THREE.SphereGeometry(0.022, 14, 10), mat(0xf1d2b6), 0, 0.066, 0));
  fig.add(mesh(new THREE.SphereGeometry(0.023, 14, 10, 0, Math.PI * 2, 0, 1.4), mat(0x2a2220), 0, 0.07, -0.002));
  at(neonSign(), -0.6, 1.36, 0.004);
  at(note(0xffe066), -0.86, 1.02, 0.002); at(note(0x9fd6c2, 2), -0.8, 0.98, 0.002);

  // ---------- the desk's light (§6): the light bar, the screens, the LEDs, the neon, the PC ----------
  const lamp = new THREE.SpotLight('#ffc98a', 2.1, 2.2, 1.05, 0.85, 1.6);
  bar.add(lamp); lamp.position.set(0, -0.01, 0.02); bar.add(lamp.target); lamp.target.position.set(0, -0.5, 0.28);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0005; lamp.shadow.radius = 4; lamp.shadow.camera.near = 0.02;
  // a screen's glow: a rect light on its face, shining out of it and a little down (a light shines along its −Z)
  const rect = (color, k, w, h, parent) => { const l = new THREE.RectAreaLight(color, k, w, h); l.position.z = 0.01; l.rotation.y = Math.PI; l.rotateX(-0.2); parent.add(l); return l; };
  const screenLights = [rect('#a9c6ff', 2.4, 0.56, 0.315, main), rect('#e9ecf2', 1.6, 0.177, 0.315, tall)];
  for (const l of screenLights) l.userData.k = l.intensity;
  // the LED strips: one up the wall behind the monitors, one under the back edge of the desk (both shine at the wall, −z)
  const mainY = T + 0.33, led = at(new THREE.RectAreaLight('#9b6cff', 14, 0.5, 0.06), 0, mainY + 0.17, 0.13); led.rotation.x = 0.78;
  const ledLow = at(new THREE.RectAreaLight('#ff6ca8', 6, 0.9, 0.04), 0, T - 0.03, 0.06); ledLow.rotation.x = -1.35;
  at(new THREE.PointLight('#ff6ca8', 0.25, 1.2, 1.5), -0.6, 1.36, 0.12);
  at(new THREE.PointLight('#8b6cff', 0.5, 0.5, 1.5), 0.27, 0.22, 0.3); // (inside the PC: lights it through the glass)
  scene.add(g);

  // ---------- what moves ----------
  const steam = new MugSteam(scene, cup);
  const strips = [bar.children[1].material]; // the light bar's glowing strip
  const set = { auto: true }; // auto: the night's round (NIGHT); off while the story moves the person itself
  // switch the desk off (0) or on (1): the screens and the light bar; the LEDs, the neon and the PC stay on
  set.power = (on) => { screens.power(on); lamp.intensity = on ? 2.1 : 0; for (const l of screenLights) l.intensity = on ? l.userData.k : 0; for (const m of strips) m.color.set(on ? new THREE.Color(0xffd8a8).multiplyScalar(2.2) : 0x222222); };
  let act = 0, actT = 0;
  const update = (t, dt, px) => {
    if (set.auto) { actT += dt; if (actT > NIGHT[act][1]) { actT = 0; act = (act + 1) % NIGHT.length; } me.userData.mode = NIGHT[act][0]; }
    me.userData.update(t);
    cup.visible = !['sitSip', 'walk', 'idle', 'pour'].includes(me.userData.mode); // (in the hand, or being refilled)
    steam.mat.uniforms.uOn.value = cup.visible ? 1 : 0;
    screens.paused = me.userData.mode !== 'sitType';
    screens.update(dt); kb.userData.update(dt); pc.userData.update(dt);
    steam.mat.uniforms.uScale.value = px * 1.4; steam.update(t, dt);
  };
  return Object.assign(set, { group: g, screens, me, cup, pc, update });
}

// The engineer's room (room/DESIGN.md §3): a Tokyo one-room flat on a rainy night, cut open on the viewer's side.
// The desk along the left wall (the person coding, the coffee steaming), the window in the back wall with the bed under
// it and the cat asleep on the duvet, the bookcase in the corner, the kitchen and the fridge by the door, the coffee
// cart between, the rug and the low table in the middle. Lit by the desk, the screens and LEDs, the lamp by the bed,
// the light under the kitchen cupboard and the city through the window.
import * as THREE from 'three';
import { bakeStatic } from '../../airport/src/merge.js';
import { mat, box, rbox } from '../../airport/src/parts.js';
import { WindowDrops } from '../../cafe/src/rain.js';
import { createStage, v3 } from './stage.js';
import { MugSteam } from './steam.js';
import { roomStory } from './story.js';
import { shell } from './surfaces.js';
import { deskSet } from './deskset.js';
import { outside } from './outside.js';
import { bed, sideTable, tableLamp, bookcase, whiteboard, kitchenette, fridge, coffeeCart, rug, lowTable, floorCushion, monstera, windowSet, aircon, cardboardBox, wallClock, sleepingCat } from './home.js';

const R = { x0: -1.4, x1: 1.4, z0: -1.4, z1: 1.6, h: 1.8 };
const WIN = { x0: 0.15, x1: 1.15, y0: 0.55, y1: 1.55 }, WC = { x: (WIN.x0 + WIN.x1) / 2, y: (WIN.y0 + WIN.y1) / 2 };
const stage = createStage({ views: {
  all: [['全体', 'The room'], v3(3.9, 3.4, 4.6), v3(-0.05, 0.45, 0.1)],
  desk: [['机', 'The desk'], v3(-0.25, 1.3, 0.6), v3(-1.3, 0.75, -0.3)],
  window: [['窓とベッド', 'Window & bed'], v3(0.75, 1.05, 0.75), v3(0.6, 0.75, -1.4)],
  kitchen: [['台所', 'Kitchen'], v3(0.25, 1.25, 1.75), v3(-1.2, 0.75, 0.7)],
  cat: [['猫', 'The cat'], v3(0.45, 0.95, -0.2), v3(0.95, 0.3, -1.0)],
} });
const { scene, life } = stage;
const room = shell({ ...R, holes: { back: [[WIN.x0, WIN.x1, WIN.y0, WIN.y1]] } }); scene.add(room);
const at = (o, x, y, z, yaw = 0, parent = room) => { o.position.set(x, y, z); o.rotation.y = yaw; parent.add(o); return o; };

// ---------- along the left wall: the desk, the coffee cart, the kitchen, the fridge ----------
const desk = deskSet(scene); desk.group.position.set(R.x0, 0, -0.45); desk.group.rotation.y = Math.PI / 2;
desk.group.updateMatrixWorld(true); scene.attach(desk.me); // (the person leaves the desk in the story: kept in room coordinates)
const cart = at(coffeeCart(), R.x0 + 0.17, 0, 0.25, Math.PI / 2);
at(kitchenette(), R.x0 + 0.21, 0, 0.81, Math.PI / 2);
at(fridge(), R.x0 + 0.21, 0, 1.4, Math.PI / 2);
const clock = at(wallClock(), R.x0 + 0.01, 1.58, 0.81, Math.PI / 2); // (over the kitchen cupboard)
clock.userData.set(23 + 40 / 60);

// ---------- along the back wall: the bookcase in the corner, the side table and lamp, the bed under the window ----------
at(bookcase(), -1.1, 0, R.z0 + 0.12);
at(whiteboard(), -0.45, 1.18, R.z0 + 0.01);
const side = at(sideTable(), -0.45, 0, R.z0 + 0.16);
const lamp = at(tableLamp(), -0.5, side.userData.top, R.z0 + 0.12);
const bd = at(bed(), 0.55, 0, R.z0 + 0.38);
at(windowSet({ w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0 }), WC.x, WC.y, R.z0 - 0.03);
at(aircon(), -1.05, 1.6, R.z0 + 0.08);
at(box(0.05, 0.07, 0.008, mat(0xf2efe8)), 1.3, 0.25, R.z0 + 0.004); // a socket
// the cat, asleep on the duvet near the foot of the bed
const neko = at(sleepingCat(), 0.95, bd.userData.top - 0.005, R.z0 + 0.42, -0.5, scene);

// ---------- the middle: the rug, the low table, a cushion; the monstera, a box from a delivery ----------
at(rug(), 0.3, 0, 0.35);
at(lowTable(), 0.35, 0.012, 0.3, 0.1);
at(floorCushion(), 0.4, 0.012, 0.78);
at(floorCushion(0xe2a9a0), 0.95, 0.012, 0.25, 0.6);
at(monstera(), 1.2, 0, -0.42);
at(cardboardBox(), 1.05, 0, 1.25, 0.3);
at(rbox(0.2, 0.08, 0.05, 0.02, mat(0x3a3f4a)), -0.2, 0.04, 1.5, 0.2); // slippers by the door
at(rbox(0.2, 0.08, 0.05, 0.02, mat(0x3a3f4a)), -0.1, 0.04, 1.47, -0.1);

// ---------- outside: the city in the rain, drops on the glass ----------
const out = outside(scene, { cx: WC.x, cy: WC.y, z: R.z0 - 0.06, x0: WIN.x0 - 0.4, x1: R.x1 - 0.22 });
const drops = new WindowDrops(scene, [{ center: new THREE.Vector3(WC.x, WC.y, R.z0 - 0.06), normal: new THREE.Vector3(0, 0, 1), w: WIN.x1 - WIN.x0 - 0.06, h: WIN.y1 - WIN.y0 - 0.06 }]);

// ---------- the light (§6) ----------
scene.add(new THREE.HemisphereLight('#36457a', '#1a1420', 0.5));
const bedLamp = new THREE.PointLight('#ffb070', 1.0, 2.4, 1.5); bedLamp.userData.k = 1.0; scene.add(bedLamp);
lamp.updateMatrixWorld(true); bedLamp.position.copy(lamp.localToWorld(new THREE.Vector3(...lamp.userData.lightAt)));
const under = new THREE.RectAreaLight('#ffd2a0', 4, 0.7, 0.05); under.position.set(R.x0 + 0.3, 1.05, 0.81); under.lookAt(R.x0 + 0.3, 0, 0.81); scene.add(under); // under the kitchen cupboard
const city = new THREE.RectAreaLight('#7f95c8', 1.4, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); city.position.set(WC.x, WC.y, R.z0 + 0.02); city.lookAt(WC.x, WC.y - 0.4, 1); scene.add(city); // the night through the window

// ---------- the story (§12) ----------
const drip = new THREE.Object3D(); drip.position.set(0.07, cart.userData.top + 0.12, -0.05); drip.userData.steamAt = [0, 0, 0]; cart.add(drip);
const brew = new MugSteam(scene, drip, { n: 30, rise: 0.14 });
const HOUR0 = 23 + 40 / 60;
const tale = roomStory({ stage, desk, sleeping: neko, scene, out, bedLamp, lampShade: lamp.userData.shade, clock, hour0: HOUR0 });
stage.story = tale; // (debug: __room.story.skip(i))

// ---------- what moves ----------
let hour = HOUR0;
life.push((t, dt) => {
  desk.update(t, dt, stage.px);
  tale.update(t, dt);
  brew.mat.uniforms.uOn.value = tale.brewing() ? 1 : 0; brew.mat.uniforms.uScale.value = stage.px * 1.4; brew.update(t, dt);
  neko.userData.update(t);
  out.update(t, dt);
  drops.update(dt, 0.8);
  if (tale.beat() < 0) { hour += dt / 60 / 6; clock.userData.set(hour); } // (an hour every six minutes; the story sets its own time)
});
bakeStatic(room); bakeStatic(desk.group);
stage.start();

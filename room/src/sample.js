// The desk sample (room/DESIGN.md §9-1): one corner of the room at night — the desk with everything on it, the chair,
// the PC, a shelf and the neon on the wall — to settle the cozy light before the rest of the room is built.
import * as THREE from 'three';
import { bakeStatic } from '../../airport/src/merge.js';
import { mat, rbox, box } from '../../airport/src/parts.js';
import { createStage, v3 } from './stage.js';
import { shell } from './surfaces.js';
import { deskSet } from './deskset.js';

const stage = createStage({ views: {
  corner: [['全体', 'The corner'], v3(1.55, 1.35, 1.55), v3(0, 0.72, -0.5)],
  desk: [['机', 'The desk'], v3(0.8, 1.2, 0.3), v3(0, 0.7, -0.62)],
  keys: [['キーボード', 'Keyboard'], v3(0.12, 0.78, -0.18), v3(-0.02, 0.56, -0.52)],
  pc: [['PC', 'The PC'], v3(0.85, 0.42, 0.25), v3(0.27, 0.2, -0.6)],
} });
const { scene, life } = stage;
const R = { x0: -1.1, x1: 1.0, z0: -0.92, z1: 0.9 };
const room = shell(R); scene.add(room);
room.add(box(0.05, 0.07, 0.008, mat(0xf2efe8), 0.62, 0.17, R.z0 + 0.004)); // a socket, a power strip on the floor
room.add(rbox(0.26, 0.03, 0.05, 0.008, mat(0xe9e6df), 0.2, 0.015, R.z0 + 0.1));
const set = deskSet(scene); set.group.position.z = R.z0;
scene.add(new THREE.HemisphereLight('#36457a', '#1a1420', 0.5));
const fill = new THREE.PointLight('#ffb070', 1.1, 3.4, 1.4); fill.position.set(1.2, 0.95, 1.1); scene.add(fill); // the lamp by the bed, off to the side
life.push((t, dt) => set.update(t, dt, stage.px));
bakeStatic(room); bakeStatic(set.group);
stage.start();

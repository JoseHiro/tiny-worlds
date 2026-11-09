// Everything in front of and round the shop (fuji/DESIGN.md §1.5): the board, the car park with its slanted lines, the
// crossing to the door, the shop's pole sign, the yellow guards, the big telegraph pole, the flats at the edge, a kei car.
import * as THREE from 'three';
import { Kit, toy, lit, label, picture, FONT } from './kit.js';
import { DOOR, mark } from './shop.js';
import { vehicle } from './traffic.js';

export const X0 = -8.6, X1 = 8.6, Z0 = -9.2, Z1 = 6.6;
export const LOT = 0.09; // the car park's surface

export function lot(scene) {
  const k = new Kit(), g = new Kit(), w = X1 - X0, d = Z1 - Z0, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
  // the board: two layers of pale wood, sage on top behind the shop
  k.box(w + 0.5, 0.42, d + 0.5, 0xecd9b8, cx, -0.34, cz, { r: 0.16 });
  k.box(w + 0.2, 0.28, d + 0.2, 0xb8a182, cx, -0.1, cz, { r: 0.1 });
  k.box(w, 0.12, d, 0x93a884, cx, 0.0, cz, { r: 0.05 });
  // the car park, the pavement along its front, the road
  k.box(w, 0.04, 6.9, 0x69738f, cx, 0.07, 0.65, { r: 0.015 });
  k.box(w, 0.05, 0.32, 0xc9c6c4, cx, 0.085, 4.15, { r: 0.018 });
  k.box(w, 0.04, 2.26, 0x484f66, cx, 0.065, 5.45, { r: 0.015 });
  for (let i = 0; i < 9; i++) k.box(0.9, 0.006, 0.07, 0xdedbd2, X0 + 1.1 + i * 1.9, 0.086, 5.45, { r: 0 });
  k.box(w - 0.1, 0.006, 0.05, 0xeeebe4, cx, 0.113, 4.15, { r: 0 });

  // the slanted bay lines, in pairs, like the photo's; the crossing to the door; the wheel stops
  const LINE = 0xeeebe4, y = LOT + 0.006;
  for (const x of [-6.7, -5.3, -3.9, -2.5, 0.7, 2.1, 3.5, 4.9, 6.3]) for (const s of [-1, 1]) {
    k.box(0.07, 0.01, 1.7, LINE, x + s * 0.2, y, 1.15, { r: 0, ry: -s * 0.2 });
    if (s < 0 && x !== 2.1) k.box(0.48, 0.09, 0.14, 0xb9b7b3, x + 0.7, LOT + 0.045, 0.56, { r: 0.04 });
  }
  for (let i = 0; i < 7; i++) k.box(1.42, 0.01, 0.13, LINE, DOOR, y, 0.46 + i * 0.25, { r: 0 });

  // the shop's sign on its pole: tall, white, the mark at the top
  k.post(0.05, 0.05, LOT, 1.0, 0x8d919c, -4.7, 1.9);
  k.box(0.62, 1.32, 0.16, 0xfdfbf4, -4.7, 1.55, 1.9, { r: 0.06 });
  k.box(0.7, 0.14, 0.28, 0x8d919c, -4.7, LOT + 0.07, 1.9, { r: 0.04 });
  const sign = label('polesign', 128, 272, (c, W, H) => {
    c.fillStyle = '#fdfbf4'; c.fillRect(0, 0, W, H);
    mark(c, W / 2, 70, 92);
    c.fillStyle = '#2f55c4'; c.beginPath(); c.roundRect(10, 134, W - 20, 122, 14); c.fill();
    c.fillStyle = '#fdfbf4'; c.font = `700 40px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('やま', W / 2, 172); c.font = `700 26px ${FONT}`; c.fillText('マート', W / 2, 220);
  });
  scene.add(picture(sign, 0.52, 1.14, -4.7, 1.55, 1.985, { glow: 1.14 }));

  // the yellow guards: an upside-down U, at the sign's foot and at the left end of the pavement
  const guard = (x, z, ry = 0) => {
    const a = Math.cos(ry), b = Math.sin(ry), at = (u, h) => [x + u * a, h, z - u * b];
    k.tube([at(-0.26, LOT), at(-0.26, 0.38), at(-0.2, 0.5), at(0, 0.54), at(0.2, 0.5), at(0.26, 0.38), at(0.26, LOT)], 0.03, 0xf6c445, 30);
  };
  guard(-4.7, 2.5); guard(-3.5, 0.25); guard(-2.75, 0.25);

  // the telegraph pole, in the left foreground: stout, a stripy skirt, an ad board, its arm and a transformer
  const px = -6.5, pz = 3.45;
  k.post(0.19, 0.12, LOT, 6.4, 0xb9b8b6, px, pz);
  k.ball(0.12, 0xb9b8b6, px, 6.4, pz);
  for (let i = 0; i < 6; i++) k.post(0.2 - i * 0.003, 0.2 - i * 0.003, LOT + 0.12 + i * 0.18, LOT + 0.3 + i * 0.18, i % 2 ? 0xf6c445 : 0x31384a, px, pz);
  k.box(0.14, 1.08, 0.04, 0xfdfbf4, px, 2.45, pz + 0.19, { r: 0.015 });
  k.box(0.1, 0.32, 0.03, 0x2f55c4, px, 2.75, pz + 0.21, { r: 0.008 });
  for (const [dy, len] of [[5.9, 1.3], [5.45, 0.95]]) k.box(len, 0.06, 0.07, 0x858a94, px, dy, pz, { r: 0.015 });
  k.post(0.13, 0.13, 4.5, 5.0, 0x8b929d, px + 0.33, pz);
  for (let i = 0; i < 9; i++) k.box(0.1, 0.018, 0.018, 0x5f6673, px + (i % 2 ? 0.14 : -0.14), 1.7 + i * 0.32, pz, { r: 0 });
  // its wires: up the street to the left and back over the fields, never across the mountain
  for (const [dx, dy] of [[-0.6, 5.9], [0.6, 5.9], [-0.42, 5.45], [0.42, 5.45]]) k.tube([[px + dx, dy, pz], [(px + dx + X0) / 2 - 0.2, dy - 0.28, (pz + -4) / 2], [X0 + 0.1, dy - 0.06, -4]], 0.011, 0x31384a, 18);
  for (const [dx, dy] of [[-0.6, 5.9], [-0.42, 5.45]]) k.tube([[px + dx, dy, pz], [X0 + 0.25, dy - 0.15, pz + 1.4]], 0.011, 0x31384a, 4);

  // the flats, cut off by the edge of the world, with balconies and a few lamps on
  const fx = 7.05, fz = -1.5, fw = 2.6, fd = 2.2, TILE = 0xa8866f;
  k.box(fw, 2.72, fd, TILE, fx, 0.12 + 1.36, fz, { r: 0.08 });
  k.box(fw + 0.14, 0.11, fd + 0.14, 0x7a6251, fx, 2.88, fz, { r: 0.04 });
  for (let f = 0; f < 3; f++) {
    const fy = 0.3 + f * 0.86;
    for (const x of [fx - 0.62, fx + 0.62]) {
      const on = (f === 1 && x < fx) || (f === 0 && x > fx) || (f === 2 && x > fx);
      (on ? g : k).box(0.82, 0.52, 0.02, on ? 0xffe2ad : 0x4a5570, x, fy + 0.24, fz + fd / 2 + 0.012, { r: 0.012, glow: on ? 1.2 : 1 });
      k.box(0.98, 0.26, 0.28, 0xefeae1, x, fy + 0.06, fz + fd / 2 + 0.16, { r: 0.03 });
      k.box(1.03, 0.03, 0.3, 0x8d919c, x, fy + 0.2, fz + fd / 2 + 0.16, { r: 0.01 });
    }
  }
  // the tunnels at either end of the road: the traffic comes out of one and goes into the other, under a grassy mound
  const CONCRETE = 0xc9c6c4, DARK = 0x171c30;
  for (const s of [-1, 1]) {
    const cx = s * 8.08;
    k.box(0.08, 0.9, 2.26, DARK, s * 8.6, 0.53, 5.45, { r: 0 }); // (the back, dark)
    k.box(1.04, 0.05, 2.26, DARK, cx, 0.98, 5.45, { r: 0 });
    for (const z of [4.34, 6.56]) { k.box(1.1, 0.96, 0.16, CONCRETE, cx, 0.56, z, { r: 0.03 }); k.box(1.04, 0.9, 0.02, DARK, cx, 0.53, z + (z < 5 ? 0.09 : -0.09), { r: 0 }); }
    k.box(1.18, 0.16, 2.48, CONCRETE, cx, 1.08, 5.45, { r: 0.05 });
    k.ball(1, 0x6f9a70, s * 8.15, 1.12, 5.45, { s: [0.72, 0.52, 1.5] });
    k.ball(0.26, 0x4a7a72, s * 8.28, 1.52, 4.92); k.ball(0.2, 0x578676, s * 8.05, 1.5, 5.98);
  }
  const parked = vehicle('kei', 0xa8dcc8, false); parked.position.set(2.8, LOT, 1.25); parked.rotation.y = Math.PI / 2 + 0.02; scene.add(parked);

  const mesh = k.bake(toy()); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
  scene.add(g.bake(lit()));
}

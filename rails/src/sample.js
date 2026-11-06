// The sample (rails/DESIGN.md §10.1): a starter-set oval of Yamanote track with one station, Shinjuku, on its near
// side. Three trains each way run to the timetable; the queues at the door marks grow and empty into them. A few blocks
// of town round it and the morning sun — the look and the scale to settle before the whole map.
import * as THREE from 'three';
import { person, ROLE_LOOKS } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { createStage, v3 } from '../../room/src/stage.js';
import { Path, layTrack, layPlatform, PLAT } from './track.js';
import { makeRun, SPEED, START, END, clock } from './timetable.js';
import { Fleet, Line, CAR } from './trains.js';
import { Crowd } from './crowd.js';
import { Signs } from './signs.js';
import { LINES, YAMANOTE } from './geo.js';
import { morning, board, buildings, trees, patch, GREEN } from './scenery.js';

const stage = createStage({ bloom: 0.12, views: {
  all: [['全体', 'Overview'], v3(1.2, 8.5, 13), v3(0, 0, 0.2)],
  platform: [['ホーム', 'Platform'], v3(0.42, 0.3, 0.95), v3(-0.08, 0.08, 1.6)],
  track: [['線路', 'Track'], v3(-3.4, 0.22, 2.05), v3(-0.4, 0.08, 1.6)],
} });
const { scene, life, camera } = stage;
morning(stage);
stage.go(new URLSearchParams(location.search).get('view') || 'all', true); // (again, now the camera may stand further off)
scene.add(board({ x0: -6, x1: 6, z0: -3.6, z1: 3.6 }));

// ---------- the oval, clockwise seen from above: the far straight east, round, the near straight west, round ----------
const R = 1.6, X = 3, pts = [];
for (let x = -X; x < X; x += 0.4) pts.push([x, -R]);
for (let a = -Math.PI / 2; a < Math.PI / 2; a += 0.2) pts.push([X + Math.cos(a) * R, Math.sin(a) * R]);
for (let x = X; x > -X; x -= 0.4) pts.push([x, R]);
for (let a = Math.PI / 2; a < Math.PI * 1.5; a += 0.2) pts.push([-X + Math.cos(a) * R, Math.sin(a) * R]);
const path = new Path(pts, { closed: true });
path.y = () => 0.03; // on a low bank
const sShinjuku = path.nearest(0, R);
path.stations = [sShinjuku];
const town = new THREE.Group(); scene.add(town);
town.add(layTrack(path), layPlatform(path, sShinjuku));

const stops = [[sShinjuku, 'shinjuku', 40]];
const outer = makeRun(path, stops, { dir: 1, headway: 210 }), inner = makeRun(path, stops, { dir: -1, headway: 210 });
const yamanote = new Line(path, { color: LINES.yamanote.color, runs: [outer, inner], doors: true });
const fleet = new Fleet(scene, (outer.n + inner.n) * CAR.cars);

// ---------- the station: name boards, the floating name, the queues, Sora waiting for the train ----------
const signs = new Signs(2), a = [0, 0, 0, 0];
const idx = YAMANOTE.indexOf('shinjuku');
for (const ds of [-0.27, 0.27]) {
  const b = signs.board('yamanote', 'shinjuku', YAMANOTE[idx - 1], YAMANOTE[idx + 1], idx === 0 ? 1 : 31 - idx);
  path.at(sShinjuku + ds, 0, a); b.position.set(a[0], path.y(sShinjuku) + PLAT.top, a[1]); b.rotation.y = Math.atan2(-a[3], a[2]);
  town.add(b);
}
const label = signs.label('shinjuku', ['yamanote', 'chuo', 'sobu']);
path.at(sShinjuku, 0, a); label.position.set(a[0], 0.75, a[1]); scene.add(label);
signs.draw();

const crowd = new Crowd(scene, [outer, inner].flatMap((run) => run.events.map((ev) => ({ line: yamanote, run, ev, side: -ev.dir }))));

Object.assign(ROLE_LOOKS, { sora: { top: 0x2f3a4f, legs: 0x2f3a4f, hat: 'hair', tie: 0x5f8fc0, backpack: 0x1d1f23, fixed: true } }); // a new suit for the first day
const sora = person('sora', { seed: 7 });
sora.scale.setScalar(0.035);
path.at(sShinjuku + 0.33, 0.012, a); sora.position.set(a[0], path.y(sShinjuku) + PLAT.top, a[1]); sora.rotation.y = Math.atan2(-a[3], a[2]) - Math.PI / 2; // facing the outer-loop track
scene.add(sora);

// ---------- the town round it ----------
const rnd = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);
const blocks = [], tr = [];
const tones = [0xeeeae2, 0xe6dccb, 0xdcd8d0, 0xf2efe8, 0xd9cbb5, 0xc9d1d6, 0xe8d8c8];
for (let ix = 0, x = -5.6; x <= 5.6; x += 0.34, ix++) for (let iz = 0, z = -3.3; z <= 3.3; z += 0.34, iz++) {
  if (ix % 4 === 0 || iz % 3 === 0) continue; // the streets
  const px = x + (rnd() - 0.5) * 0.08, pz = z + (rnd() - 0.5) * 0.08;
  const s = path.nearest(px, pz); path.at(s, 0, a);
  const off = Math.hypot(a[0] - px, a[1] - pz);
  const inside = Math.abs(px) < X + R && Math.abs(pz) < R && (Math.abs(px) < X || Math.hypot(Math.abs(px) - X, pz) < R);
  if (off < 0.42 || (off < 1.0 && Math.abs(px) < 1.3)) continue; // (and a clear space round the station)
  if (inside && Math.abs(px) < 1.6 && Math.abs(pz) < 0.9) { if (rnd() < 0.7) tr.push({ x: px, z: pz, s: 0.8 + rnd() * 0.6 }); continue; } // a little park in the middle
  const nearStation = Math.max(0, 1 - Math.hypot(px, pz - R - 0.6) / 3.2), west = px < -1 && pz > R ? 1.6 : 1;
  const h = (0.05 + rnd() * 0.1 + nearStation * nearStation * (0.15 + rnd() * 0.55)) * west;
  blocks.push({ x: px, z: pz, w: 0.2 + rnd() * 0.1, d: 0.2 + rnd() * 0.1, yaw: (rnd() - 0.5) * 0.06, h, color: h > 0.4 ? [0xc9d1d6, 0xb9c6cf, 0xdcd8d0][Math.floor(rnd() * 3)] : tones[Math.floor(rnd() * tones.length)] });
}
scene.add(buildings(blocks), trees(tr));
town.add(patch([[-1.7, -0.95], [1.7, -0.95], [1.7, 0.95], [-1.7, 0.95]], GREEN));
bakeStatic(town);

// ---------- the clock and the loop ----------
const clk = document.getElementById('clock');
const gameTime = (t) => START + ((t * SPEED) % (END - START));
life.push((t) => {
  const time = gameTime(t);
  fleet.begin(); yamanote.draw(fleet, time); fleet.end();
  crowd.update(time);
  sora.userData.update?.(t, 0);
  signs.face(camera);
  if (clk) clk.textContent = clock(time);
});
stage.start();

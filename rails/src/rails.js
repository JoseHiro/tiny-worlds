// Rush hour (rails/DESIGN.md): Tokyo's Yamanote loop with the Chūō Rapid and the Chūō-Sōbu Local across it, as a
// model railway on a walnut-framed board, on a weekday morning from 7:30 to 9:00. Every train runs to the timetable;
// the queues on every platform grow and empty into them. Click a train to ride along with it.
import * as THREE from 'three';
import { bakeStatic } from '../../airport/src/merge.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { createStage, v3 } from '../../room/src/stage.js';
import { PLAT } from './track.js';
import { SPEED, START, END, clock, trainAt } from './timetable.js';
import { Fleet, CAR } from './trains.js';
import { Crowd } from './crowd.js';
import { Signs } from './signs.js';
import { STATIONS, LINES, toXZ } from './geo.js';
import { buildNetwork, layNetwork, waitingSides, boards, BOARD } from './network.js';
import { buildTown, finishTown } from './town.js';
import { landmarks, towers, keep } from './landmarks.js';
import { morning, board } from './scenery.js';
import { railsStory } from './story.js';

// ---------- the views: the whole board, then close to the stations people know ----------
const near = (k, dx, dy, dz) => { const [x, z] = toXZ(STATIONS[k][3], STATIONS[k][4]); return [v3(x + dx, dy, z + dz), v3(x, 0.08, z)]; };
const VIEWS = {
  all: [['全体', 'Tokyo'], v3(9, 30, 33), v3(0.6, 0, 0.6)],
  shinjuku: [['新宿', 'Shinjuku'], ...near('shinjuku', 1.9, 1.5, 2.2)],
  tokyo: [['東京', 'Tokyo Sta.'], ...near('tokyo', -1.9, 1.3, 1.6)],
  ochanomizu: [['御茶ノ水', 'Ochanomizu'], ...near('ochanomizu', 0.9, 0.7, 1.4)],
  akihabara: [['秋葉原', 'Akihabara'], ...near('akihabara', 1.3, 0.9, 1.2)],
  shibuya: [['渋谷', 'Shibuya'], ...near('shibuya', 1.6, 1.1, 1.6)],
};
const stage = createStage({ views: VIEWS, bloom: 0.1 });
const { scene, life, camera, controls, renderer } = stage;
morning(stage);
stage.go(new URLSearchParams(location.search).get('view') in VIEWS ? new URLSearchParams(location.search).get('view') : 'all', true); // (again, now the camera may stand further off)
scene.add(board(BOARD));

// ---------- the network and the town ----------
const net = buildNetwork();
const town = buildTown(net, { keep: keep() });
const fixed = new THREE.Group(); // everything that never moves, baked into a few meshes
fixed.add(town.group, layNetwork(net, town.water), landmarks());
town.blocks.push(...towers());
finishTown(scene, town);

// name boards on every platform, a floating name over every station
const signs = new Signs(20), a = [0, 0, 0, 0];
for (const [line, key, prev, next, num] of boards(net)) {
  const p = net.lines[line].path, c = net.lines[line].runs[0].events.find((e) => e.key === key).s; // (where this line stops)
  for (const ds of [-0.27, 0.27]) { const b = signs.board(line, key, prev, next, num); p.at(c + ds, 0, a); b.position.set(a[0], p.y(c + ds) + PLAT.top, a[1]); b.rotation.y = Math.atan2(-a[3], a[2]); fixed.add(b); }
}
const calls = {};
for (const [line, key] of boards(net)) (calls[key] ??= []).push(line);
for (const [key, lines] of Object.entries(calls)) { const [x, z] = toXZ(STATIONS[key][3], STATIONS[key][4]), m = signs.label(key, lines); m.position.set(x, 0.75, z); scene.add(m); }
signs.draw();
scene.add(fixed); bakeStatic(fixed);

// ---------- the trains and the people waiting for them ----------
const lines = Object.values(net.lines);
const fleet = new Fleet(scene, lines.reduce((n, l) => n + l.runs.reduce((m, r) => m + r.n, 0), 0) * CAR.cars);
const crowd = new Crowd(scene, [...waitingSides(net)]);

// ---------- riding along: click a train ----------
const WHERE = { yamanote: [['外回り', 'Outer loop'], ['内回り', 'Inner loop']], chuo: [['新宿・中野方面', 'for Shinjuku, Nakano'], ['東京行', 'for Tokyo']], sobu: [['新宿・中野方面', 'for Shinjuku, Nakano'], ['秋葉原・千葉方面', 'for Akihabara, Chiba']] };
const rideBox = document.getElementById('ride');
let ride = null;
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), body = fleet.meshes.body;
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return; // (a drag, not a click)
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera); body.boundingSphere = null; // (the trains have moved since)
  const hit = ray.intersectObject(body)[0];
  ride = hit ? fleet.whose(hit.instanceId) : null;
  if (ride) { ride.last = null; if (camera.position.distanceTo(controls.target) > 4) stage.shot(camera.position.clone().lerp(controls.target, 0.85), controls.target.clone(), 1.2); }
  showRide(world.time);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') { ride = null; showRide(0); } });
function showRide(time) {
  if (!rideBox) return;
  rideBox.hidden = !ride;
  if (!ride) return;
  const { line, run, r, k } = ride, st = trainAt(run, k, time);
  const dirName = line.key === 'yamanote' ? WHERE.yamanote[r] : WHERE[line.key][st.dir > 0 ? 0 : 1];
  let next = st.stop;
  if (!next) { const i = run.legs.findIndex((l) => l.t0 > st.tau && l.key); next = (i >= 0 ? run.legs[i] : run.legs.find((l) => l.key))?.key; }
  rideBox.innerHTML = `<i style="background:#${new THREE.Color(LINES[line.key].color).getHexString()}"></i><b>${L(LINES[line.key].name)}</b> ${L(dirName)}<br>${next ? (st.stop ? L(['停車中：', 'Now at ']) : L(['次は ', 'Next: '])) + L([STATIONS[next][0], STATIONS[next][2]]) : ''}<span>${L(['Esc で降りる', 'Esc to get off'])}</span>`;
}

// ---------- the story (§9): it runs the clock while it plays ----------
const world = { time: START, auto: true };
const tale = railsStory({ stage, net, scene, world });
stage.story = tale; // (debug: __room.story.skip(i); the film reads its camera)

// ---------- the loop ----------
const clk = document.getElementById('clock');
const c = [0, 0, 0], prev = new THREE.Vector3(), now = new THREE.Vector3();
let shown = '';
life.push((t, dt) => {
  stage.t = t;
  tale.update(t, dt);
  if (world.auto) { world.time += dt * SPEED; if (world.time >= END) world.time = START; } // (after the story: on from where it left off)
  const time = world.time;
  fleet.begin(); for (const l of lines) l.draw(fleet, time); fleet.end();
  crowd.update(time);
  signs.face(camera);
  if (ride) { // keep the train in the middle of the view, the camera keeping its distance
    ride.line.centre(ride.r, ride.k, time, c); now.set(c[0], c[1] + 0.06, c[2]);
    if (ride.last) { camera.position.add(prev.subVectors(now, ride.last)); controls.target.add(prev); } else controls.target.lerp(now, 0.5);
    ride.last = (ride.last ?? new THREE.Vector3()).copy(now);
  }
  const label = clock(time);
  if (label !== shown) { shown = label; if (clk) clk.textContent = label; if (ride) showRide(time); }
});
onLang(() => showRide(world.time));
stage.start();

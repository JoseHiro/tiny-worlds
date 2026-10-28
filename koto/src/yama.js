// Koto — scene C+D (koto/DESIGN.md §7.7): a path through a bamboo grove, an Inari shrine at the foot of a hill, and
// the tunnel of a thousand vermilion torii climbing the hill — splitting in two for a stretch — to a tea house on top.
import * as THREE from 'three';
import { mat, box } from '../../airport/src/parts.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { torii, senbonTorii, KOTO } from '../../town/src/koto.js';
import { haiden, shamusho, temizuya, hokora } from '../../town/src/koto-temples.js';
import { chaya } from '../../town/src/koto-town.js';
import { toro, guardianPair, komainu, emaRack, omikujiRack, takegaki, endai, michishirube, pigeon, risu, tobi, cat } from '../../town/src/koto-props.js';
import { rickshaw } from '../../town/src/koto-ride.js';
import { momiji, sakura, bamboo, sugiForest, mossPatch, Falling } from '../../town/src/seasons.js';
import { Agent, group, still, yawTo, FACE } from './people.js';
import { createWorld, v3 } from './world.js';
import { story } from './story.js';

// ---------- the land: flat in front (the bamboo), a hill rising behind to 9 ----------
const X0 = -26, X1 = 26, Z0 = -40, Z1 = 40;
function H(x, z) {
  const t = Math.min(1, Math.max(0, (6 - z) / 40)), s = t * t * (3 - 2 * t);
  return s * (9 + 2.2 * (x / 26) ** 2 + 0.3 * Math.sin(x * 0.6) * Math.cos(z * 0.5));
}
const heightAt = (x, z) => H(x, z) + 0.04;
const curve = (pts) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, H(x, z) + 0.02, z)));
// sample a curve every `step` metres as [x, z] points, optionally shifted sideways (+ = to the right going along it)
function walk(c, { step = 1.6, side = 0, from = 0, to = 1 } = {}) {
  const n = Math.max(2, Math.ceil((c.getLength() * (to - from)) / step)), out = [], T = new THREE.Vector3();
  for (let i = 0; i <= n; i++) { const u = from + (to - from) * (i / n), p = c.getPointAt(u); c.getTangentAt(u, T); out.push([p.x - T.z * side, p.z + T.x * side]); }
  return out;
}
const lateral = (pts, d) => pts.map(([x, z], i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz); return [x - (tz / l) * d, z + (tx / l) * d]; });
const distTo = (pts) => (x, z) => { let m = 1e9; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return m; };

// the bamboo path (D), and the torii path up the hill (C): one tunnel, then two side by side, then one again
const D = curve([[-1.5, 40.5], [2.5, 34], [-2.5, 27], [2, 20], [0, 14]]);
const P = [[4.2, 4.5], [4.0, 0], [1.5, -5], [-2.0, -9.5], [-2.5, -13], [0.5, -17], [4.5, -21], [4.5, -25], [1.0, -29], [-1.5, -33.5]];
const pre = curve(P.slice(0, 4)), post = curve(P.slice(6));
const forkUp = curve(lateral(P.slice(3, 7), 1.05)), forkDown = curve(lateral(P.slice(3, 7), -1.05));
const dD = distTo(walk(D, { step: 1 })), dT = distTo([...walk(pre, { step: 1 }), ...walk(curve(P.slice(3, 7)), { step: 1 }), ...walk(post, { step: 1 })]);

const tunnelEye = pre.getPointAt(0.12), tunnelLook = pre.getPointAt(0.3);
const VIEWS = {
  all: ['全体', v3(62, 58, 72), v3(0, 3, 0)],
  bamboo: ['竹林', v3(-1.0, 2.4, 41.5), v3(2, 2.6, 32)],
  shrine: ['稲荷', v3(15, 11, 3), v3(-3, 1.5, 7)],
  tunnel: ['千本鳥居', v3(tunnelEye.x, H(tunnelEye.x, tunnelEye.z) + 1.0, tunnelEye.z), v3(tunnelLook.x, H(tunnelLook.x, tunnelLook.z) + 1.35, tunnelLook.z)],
  fork: ['分かれ道', v3(-9, 15, -8), v3(1, 4.5, -16)],
  top: ['山頂', v3(12, 15.5, -24), v3(-3, 9.5, -36)],
};
let followMe;
const world = createWorld({ views: VIEWS, shadow: 58, follow: { agent: () => followMe, idle: '', offset: [3.5, 4.5, 5.5] } });
const { scene, life, people, stills, steps } = world;
world.slab(X0, X1, Z0, Z1, (z, x) => H(x, z), 80, 52);

// a ribbon along a curve (the earth path, the tunnel floor)
function ribbon(c, w, color, { y = 0.03, n = 120 } = {}) {
  const pos = [], idx = [], T = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = c.getPointAt(u); c.getTangentAt(u, T);
    const nx = -T.z, nz = T.x, l = Math.hypot(nx, nz) || 1;
    for (const s of [-1, 1]) { const x = p.x + (nx / l) * s * w / 2, z = p.z + (nz / l) * s * w / 2; pos.push(x, H(x, z) + y, z); }
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m);
  return m;
}
ribbon(D, 2.4, 0xb8a888);
world.paved(24, 14, 0, 7, { y: () => 0.03 }); // the shrine square
for (const c of [pre, forkUp, forkDown, post]) ribbon(c, 1.5, 0x9a968c, { y: 0.025, n: 60 });

const town = new THREE.Group(); scene.add(town);
const at = (obj, x, z, yaw = 0, y = null) => { obj.position.set(x, y ?? H(x, z), z); obj.rotation.y = yaw; town.add(obj); return obj; };
const yawAlong = (c, u) => { const T = c.getTangentAt(u); return Math.atan2(-T.z, T.x); };

// ---------- D: the bamboo path ----------
for (const s of [1, -1]) for (let u = 0.02; u < 0.97; u += 3.1 / D.getLength()) {
  const p = D.getPointAt(u + 1.5 / D.getLength()), T = D.getTangentAt(u + 1.5 / D.getLength());
  const f = takegaki({ kind: p.z > 31 ? 'koetsu' : 'kenninji', length: 3.0, h: 1.5 });
  at(f, p.x - T.z * s * 1.6, p.z + T.x * s * 1.6, Math.atan2(-T.z, T.x), 0);
}
at(michishirube({ lines: [['→', '稲荷大社'], ['←', '竹林の小径']] }), 2.2, 39.2, -Math.PI / 2, 0);
const grove = bamboo({ w: 52, d: 26, n: 300, h: 9.5, seed: 12, avoid: (x, z) => dD(x, z + 27) < 2.1 || z + 27 < 15 });
grove.position.set(0, 0, 27); scene.add(grove);

// ---------- the shrine square ----------
at(torii({ w: 5.2, h: 6.6 }), 0, 13.5, 0, 0);
at(haiden(), -6, 2.8, 0, 0);
at(guardianPair({ kind: 'fox', gap: 3.6 }), -6, 11, 0, 0);
at(temizuya(), 6.2, 9.2, -Math.PI / 2, 0);
at(shamusho(), 9.6, 2.6, -Math.PI / 2, 0);
at(emaRack(), -11.5, 9, Math.PI / 2, 0);
at(omikujiRack(), 9.4, 12.4, -Math.PI / 2, 0);
for (const z of [11.5, 7.5]) for (const s of [1, -1]) at(toro({ h: 1.8 }), s * 2.6, z, 0, 0);
at(torii({ w: 2.4, h: 3.2 }), P[0][0], P[0][1] + 0.6, yawAlong(pre, 0) + Math.PI / 2); // the first gate of the tunnel

// ---------- C: the torii tunnel and its stone steps ----------
const tunnels = [senbonTorii({ path: P.slice(0, 4).map(([x, z]) => [x, H(x, z), z]) }), senbonTorii({ path: lateral(P.slice(3, 7), 1.05).map(([x, z]) => [x, H(x, z), z]), w: 1.45, h: 2.3 }),
  senbonTorii({ path: lateral(P.slice(3, 7), -1.05).map(([x, z]) => [x, H(x, z), z]), w: 1.45, h: 2.3 }), senbonTorii({ path: P.slice(6).map(([x, z]) => [x, H(x, z), z]) })];
tunnels.forEach((t) => scene.add(t));
const stoneStep = mat(0xa9a59a, { roughness: 0.9, flatShading: true });
for (const c of [pre, forkUp, forkDown, post]) for (let u = 0.01; u < 1; u += 0.55 / c.getLength()) { const p = c.getPointAt(u); at(box(1.25, 0.12, 0.42, stoneStep), p.x, p.z, yawAlong(c, u) + Math.PI / 2, p.y + 0.02); }
// by the path: little shrines with heaps of small offered torii, fox statues, a rack of plaques
function offerings(x, z, yaw) {
  const g = new THREE.Group(); g.add(hokora());
  for (let k = 0; k < 9; k++) { const t = torii({ w: 0.45 + (k % 3) * 0.2, h: 0.6 + (k % 4) * 0.2 }); t.position.set(-1.9 + (k % 3) * 0.45 - (k > 5 ? 0.3 : 0), 0, 1.2 - Math.floor(k / 3) * 0.55); t.rotation.y = (k % 2) * 0.15; g.add(t); }
  for (const s of [1, -1]) { const f = komainu({ kind: 'fox', side: s }); f.scale.setScalar(0.6); f.position.set(s * 1.1, 0, 1.6); f.rotation.y = -Math.PI / 2; g.add(f); }
  return at(g, x, z, yaw);
}
offerings(8.6, -18, -Math.PI / 2);
offerings(-8, -25, Math.PI / 2);
at(emaRack({ w: 1.6 }), 4.2, -32.5, -Math.PI / 2 - 0.4);
// the top: a tea house and its bench, a lantern, the view back over the grove
const tea = at(chaya({ name: 'お休み処' }), -8.5, -36.5, Math.PI / 2);
const bench = at(endai({ length: 1.6 }), 3.2, -36.5, -Math.PI / 2 + 0.3);
at(toro({ kind: 'yukimi' }), 5.4, -38.4);
// the forest: cedars all over the hill (away from the path and the square), maples and moss along the path
const cedars = [];
for (let z = 0.5; z > -39.5; z -= 3.2) for (let x = -25; x < 25.5; x += 3.3) {
  const jx = x + Math.sin(x * 12.9 + z * 7.1) * 1.2, jz = z + Math.cos(x * 4.7 - z * 9.3) * 1.2;
  if (dT(jx, jz) < 2.8 || (jz > -1.5 && Math.abs(jx) < 13) || (jz < -32 && jx > -14 && jx < 7.5) || Math.hypot(jx - 8.6, jz + 18) < 3 || Math.hypot(jx + 8, jz + 25) < 3) continue;
  cedars.push([jx, H(jx, jz), jz, 0.8 + ((x * 13 + z * 7) % 5) * 0.1]);
}
scene.add(sugiForest(cedars));
const nature = new THREE.Group(); scene.add(nature);
const plant = (o, x, z, yaw = 0) => { o.position.set(x, H(x, z), z); o.rotation.y = yaw; nature.add(o); return o; };
[[-6.5, -5], [7.2, -10], [-6, -16], [8, -27], [-5, -31.5], [12, 11], [-12.5, 13]].forEach(([x, z], i) => plant(momiji({ seed: i + 2 }), x, z, i));
[[-14, 11.5], [13.5, 4]].forEach(([x, z], i) => plant(sakura({ seed: i + 5 }), x, z));
[[-4, -7], [5, -14], [-5.5, -21], [7, -24], [-3.5, -28]].forEach(([x, z], i) => plant(mossPatch({ w: 2.4, d: 1.4, seed: i + 20 }), x, z, i));

town.traverse((o) => { if (o.userData.update && o.userData.kind === 'building' && !life.includes(o)) life.push(o); });
bakeStatic(town);

// ---------- animals ----------
const animals = new THREE.Group(); scene.add(animals);
const put = (a, x, z, yaw = 0, y = null) => { a.position.set(x, y ?? heightAt(x, z), z); a.rotation.y = yaw; animals.add(a); life.push(a); return a; };
for (let k = 0; k < 7; k++) put(pigeon({ seed: k }), -2 + (k % 4) * 1.3, 5 + Math.floor(k / 4) * 1.4, k);
put(risu(), -6, -34, 0.5); put(risu(), 9.5, -15, 2);
put(cat({ color: 0xf2ede2, mode: 'sleep' }), -5.8, -35.4, 1);
const kite = put(tobi(), 0, 0, 0, 0); kite.userData.radius = 30; kite.userData.height = 26;

// ---------- people ----------
const agent = (role, route, o = {}) => { const a = new Agent(scene, role, route, { heightAt, ...o }); people.push(a); return a; };
const toSteps = (pts, label) => pts.map(([x, z], i) => (i === 0 && label ? { to: [x, z], label } : { to: [x, z] }));
const rev = (c, o) => walk(c, o).reverse();
// up through the grove, worship, up the tunnel (right fork), look out from the top, down the left fork, home
function inariRoute(l, { wash = true, photo = true, j = 0 } = {}) {
  const r = [{ jump: walk(D, { side: -l })[0], label: '竹林の小径を歩く' }, ...toSteps(walk(D, { side: -l, step: 2 }).slice(1))];
  r.push({ to: [-0.6 * l, 13.9] }, { do: 'bow', dur: 1, face: FACE.up, label: '鳥居で一礼' });
  if (wash) r.push({ to: [4.9, 9.4 + j], label: '手水舎へ' }, { do: 'hold', dur: 2.5, face: FACE.east, label: '手水で清める' });
  r.push({ to: [-6 + j, 9.6], label: '拝殿へ' }, { do: 'bow', dur: 1, face: FACE.up }, { do: 'pray', dur: 2.6, face: FACE.up, label: '鈴を鳴らしてお参り' }, { do: 'bow', dur: 1, face: FACE.up });
  r.push({ to: [P[0][0] + 0.5, P[0][1] + 1.6], label: '千本鳥居へ' }, ...toSteps(walk(pre, { side: 0.3 }), '朱の鳥居のトンネルを上る'));
  if (photo) r.push({ do: 'photo', dur: 2.4, face: yawAlong(pre, 1) + Math.PI, label: '振り返って写真を撮る' });
  r.push(...toSteps(walk(forkUp), '分かれ道は右へ'), ...toSteps(walk(post, { side: 0.3 }), '山頂へ'));
  r.push({ to: [-0.5 + j, -36.2] }, { do: 'look', dur: 3.5, face: FACE.down, label: '山頂から竹林を見下ろす' });
  r.push(...toSteps(rev(post, { side: -0.3 }), '下りる'), ...toSteps(rev(forkDown), '帰りは左のトンネル'), ...toSteps(rev(pre, { side: -0.3 })));
  r.push({ to: [1.5, 8] }, { to: [0.6 * l, 13.9], label: '竹林を帰る' }, ...toSteps(walk(D, { side: l, step: 2 }).reverse()));
  return r;
}
followMe = agent('kimonoWoman', inariRoute(0.6), { speed: 0.85 });
agent('kimonoMan', inariRoute(0.55, { wash: false, j: 0.5 }), { speed: 0.85, delay: 1.0, phase: 1 });
agent('visitor', inariRoute(0.6, { j: -0.6 }), { speed: 1.0, delay: 16 });
agent('furisode', inariRoute(0.5, { photo: false, j: 0.8 }), { speed: 0.8, delay: 34 });
people.push(...group(scene, ['schoolGirl', 'schoolGirl', 'schoolBoy', 'schoolBoy'], inariRoute(0.6, { wash: false, j: -1.2 }), { heightAt, speed: 0.95, delay: 48 }));
// strollers in the grove: look up at the bamboo, take a picture, turn back at the shrine
function groveRoute(l, stops) {
  const pts = walk(D, { side: -l, step: 2 }), r = [{ jump: pts[0] }];
  pts.slice(1).forEach((p, i) => { r.push({ to: p }); if (stops.includes(i)) r.push({ do: i % 2 ? 'photo' : 'look', dur: 2.8, face: FACE.west + (i % 3) }); });
  r.push({ to: [0.6 * l, 14] }, ...toSteps(walk(D, { side: l, step: 2 }).reverse()));
  return r;
}
agent('umbrellaWoman', groveRoute(0.6, [4, 9]), { speed: 0.75, delay: 6 });
agent('tourist', groveRoute(0.65, [2, 7, 11]), { speed: 0.9, delay: 22 });
agent('yukataGirl', groveRoute(0.55, [6]), { speed: 0.85, delay: 40 });
// shrine people
agent('miko', [{ jump: [2.4, 12] }, { to: [2.4, 12] }, { do: 'sweep', dur: 5, face: FACE.down }, { to: [2.6, 9] }, { do: 'sweep', dur: 5, face: FACE.down }, { to: [2.4, 6] }, { do: 'sweep', dur: 5, face: FACE.up }, { to: [2.6, 9] }, { do: 'sweep', dur: 5, face: FACE.up }], { speed: 0.5 });
stills.push(still(scene, 'miko', 'idle', [8.5, 0.2, 2.6], FACE.west));
stills.push(still(scene, 'kannushi', 'idle', [-2.4, 0, 5.5], yawTo(1, 1)));
{ tea.updateMatrixWorld(true); for (const [i, s] of tea.userData.seats.entries()) { const p = new THREE.Vector3(...s).applyMatrix4(tea.matrixWorld); stills.push(still(scene, i ? 'obaachan' : 'senior', 'sit', [p.x, p.y - 0.3, p.z], tea.rotation.y - Math.PI / 2)); } }
{ bench.updateMatrixWorld(true); const p = new THREE.Vector3(0.4, 0.5, 0).applyMatrix4(bench.matrixWorld); stills.push(still(scene, 'kimonoWoman2', 'sit', [p.x, p.y - 0.3, p.z], bench.rotation.y - Math.PI / 2)); }

// the rickshaw: along the grove path to the shrine and back, stopping halfway for its passengers to look up
const rk = rickshaw({ riders: ['kimonoWoman', 'kimonoMan'], hood: 'down' }); scene.add(rk);
const RK = { L: D.getLength(), v: 1.5 };
let rkS = 2, rkWait = 0, rkStopped = false, rkD = 0;
const falls = new Falling(scene, { area: [-24, 24, -38, 38], top: 12 });
steps.push((t, dt) => {
  falls.update(t, dt);
  // s runs 0 → L (into the grove, side −0.5) and L → 2L (back out, side +0.5); a pause at the middle and at the shrine
  const cyc = rkS % (2 * RK.L), back = cyc > RK.L, d = back ? 2 * RK.L - cyc : cyc;
  const stopAt = [RK.L * 0.5, RK.L - 0.5];
  if (!back && !rkStopped && stopAt.some((x) => rkD < x && d >= x)) { rkStopped = true; rkWait = 0; }
  rkD = back ? 0 : d;
  if (rkStopped && (rkWait += dt) > 5) { rkStopped = false; rkS += 0.1; }
  if (!rkStopped) rkS += RK.v * dt;
  const u = Math.min(0.999, Math.max(0.001, d / RK.L)), p = D.getPointAt(u), T = D.getTangentAt(u), side = back ? 0.5 : -0.5;
  rk.position.set(p.x - T.z * side, 0.02, p.z + T.x * side);
  rk.rotation.y = Math.atan2(-T.z, T.x) + (back ? Math.PI : 0);
  rk.userData.speed = rkStopped ? 0 : RK.v;
  rk.userData.update(t, dt);
});
// ---------- the story, chapter 2: by rickshaw through the grove to the shrine, and a little way up the torii ----------
const srk = rickshaw({ riders: ['kimonoKid', 'baaKimono'], hood: 'down' }); srk.visible = false; scene.add(srk);
const ride = { on: false, s: 0, wait: 0, stopped: false, done: false, said: false };
let say = null;
steps.push((t, dt) => {
  if (!srk.visible) return;
  if (ride.on) {
    const mid = RK.L * 0.45;
    if (!ride.said && ride.s >= mid) { ride.said = true; ride.stopped = true; ride.wait = 0; say?.('車夫さん「この竹は高さが10メートルもあるんですよ」ふたりは竹を見上げます'); world.cam(v3(-3, 2.2, 22.5), v3(2.5, 7.5, 18)); }
    if (ride.stopped && (ride.wait += dt) > 6.5) { ride.stopped = false; world.track({ p: srk }, [3.5, 3.6, 6.5]); }
    if (!ride.stopped) ride.s = Math.min(RK.L - 0.6, ride.s + 1.4 * dt);
    if (ride.s >= RK.L - 0.6 && !ride.done) { ride.done = true; ride.on = false; }
  }
  const u = Math.max(0.002, ride.s / RK.L), p = D.getPointAt(u), T = D.getTangentAt(u);
  srk.position.set(p.x + T.z * 0.4, 0.02, p.z - T.x * 0.4); srk.rotation.y = Math.atan2(-T.z, T.x);
  srk.userData.speed = ride.on && !ride.stopped ? 1.4 : 0; srk.userData.update(t, dt);
});
const tale = story(world, { no: 2, heightAt, setup: () => { rk.visible = false; Object.assign(ride, { on: false, s: 0, wait: 0, stopped: false, done: false, said: false }); srk.visible = false; },
  route: (who) => {
    const o = who * 0.55, end = D.getPointAt(1);
    return [
      { jump: [0.9 + o, 38.6], say: '竹林の入り口。ここから人力車に乗ります', shot: [[5.5, 3.2, 44.5], [0, 1.3, 38]], call: () => { srk.visible = true; ride.s = 0.4; } },
      { do: 'idle', dur: 3, face: FACE.west },
      { hide: () => ride.done, say: '車夫さんの引く人力車で、竹林の小径へ', call: () => { ride.on = true; world.track({ p: srk }, [3.5, 3.6, 6.5]); } },
      { jump: [end.x + 1.0 + o, end.z + 0.6], say: '稲荷の大きな鳥居の前で降りました', shot: [[6, 4.2, 22], [0, 3, 12]], call: () => { srk.visible = false; } },
      { do: 'idle', dur: 2, face: FACE.up },
      { to: [0.2 + o, 14.0] }, { do: 'bow', dur: 1.3, face: FACE.up, say: '鳥居をくぐる前に一礼' },
      { to: [-6 + o, 9.6], say: '拝殿へ', shot: { track: [3.5, 4.2, 6.5] } },
      { do: 'bow', dur: 1.1, face: FACE.up }, { do: 'pray', dur: 3, face: FACE.up, say: '鈴を鳴らして、手を合わせます', shot: [[-1, 4.5, 15], [-6, 2.5, 6]] }, { do: 'bow', dur: 1.1, face: FACE.up },
      { to: [P[0][0] + 0.5 + o * 0.5, P[0][1] + 1.6], say: 'いよいよ千本鳥居へ', shot: { track: [3, 4, 6] } },
      ...walk(pre, { side: 0.3 - o * 0.6, to: 0.55 }).map((q, i) => (i === 1 ? { to: q, say: '朱の鳥居がどこまでも続きます', shot: { track: [0.15, 0.95, 3.2] } } : { to: q })),
      { do: 'photo', dur: 3, face: yawAlong(pre, 0.5) + Math.PI, say: '振り返って、鳥居のトンネルを写真に', shot: [VIEWS.tunnel[1].toArray(), VIEWS.tunnel[2].toArray()] },
      { do: 'look', dur: 2.5, face: yawAlong(pre, 0.5) + Math.PI },
      ...walk(pre, { side: -0.3 + o * 0.6, to: 0.55 }).reverse().map((q, i) => (i === 0 ? { to: q, say: '石段を下りて…', shot: { track: [3, 4, 6] } } : { to: q })),
      { to: [1.5, 9] }, { do: 'idle', dur: 2, face: FACE.down },
      { until: () => false, say: '「次は電車で海へ行こうか」', end: true },
    ];
  } });
say = (t) => { document.getElementById('storyLine').textContent = t; };
void tale;

world.start();

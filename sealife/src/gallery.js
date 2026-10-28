// Sea-life catalog: one renderer, one small scene per card (scissor viewports), plus aquariums.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeCreature, School, Cruise, Wander, Burrows, clock, assemble, part, tube, seeded } from './kit.js';
import { SPECIES, GROUPS } from './species.js';
import { Reef, REEF_KINDS, bommie } from './reef.js';

const BG = new THREE.Color('#d9eef0');
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function stageFor(build, { wide = false, view = [1, 0.45, 1.25] } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#f4fbff', '#9fc3c4', 1.6));
  const sun = new THREE.DirectionalLight('#fffaf0', 2.2);
  sun.position.set(3, 10, 4);
  scene.add(sun);
  const { obj, radius, update, target = V(0, 0, 0) } = build(scene);
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.02, 600);
  const dir = new THREE.Vector3(...view).normalize();
  camera.position.copy(dir.multiplyScalar(radius / Math.sin(THREE.MathUtils.degToRad(15)) * (wide ? 0.42 : 0.75))).add(target);
  camera.lookAt(target);
  return { scene, camera, obj, update, radius, target };
}

// one creature swimming on the spot, slowly turning so you see every side
function single(spec) {
  return (scene) => {
    const mesh = makeCreature(spec);
    const pivot = new THREE.Group();
    const c = spec.geometry.boundingSphere.center;
    mesh.position.set(-c.x, spec.upright ? 0 : -c.y, -c.z);
    pivot.add(mesh);
    scene.add(pivot);
    const r = spec.geometry.boundingSphere.radius;
    if (spec.upright) {
      const sand = new THREE.Mesh(new THREE.CircleGeometry(r * 1.3, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#efe3c4', roughness: 1 }));
      sand.position.y = -0.002;
      pivot.add(sand);
    }
    const target = V(0, spec.upright ? c.y * 0.8 : 0, 0);
    return { obj: mesh, radius: r * 1.1, target, update: (t, dt, spin) => { if (spin) pivot.rotation.y += dt * 0.35; if (!spec.upright) pivot.position.y = Math.sin(t * 1.3) * r * 0.04; } };
  };
}

// ---------- aquarium scenery ----------

const stdMat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...extra });
function sandFloor(scene, r, color = '#efe3c4') {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64).rotateX(-Math.PI / 2), stdMat(color, { flatShading: false }));
  scene.add(m);
  return m;
}
function rock(scene, [x, z], s, color = '#8d8577') {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0).scale(1.2, 0.7, 1), stdMat(color));
  m.position.set(x, s * 0.35, z);
  m.rotation.y = x * 3.1;
  scene.add(m);
  return m;
}
// simple corals as a backdrop (the Naha reef has its own)
function coral(scene, kind, [x, z], s = 1) {
  const g = new THREE.Group();
  if (kind === 'branch') {
    const rnd = seeded(Math.round(x * 100 + z * 7) + 999);
    const parts = [];
    for (let i = 0; i < 9; i++) {
      const a = rnd() * 6.28, lean = 0.2 + rnd() * 0.35, h = 0.35 + rnd() * 0.35;
      parts.push(part(tube([[0, 0, 0], [Math.cos(a) * lean * 0.3, h * 0.6, Math.sin(a) * lean * 0.3], [Math.cos(a) * lean, h, Math.sin(a) * lean]], 0.05, 0.03, 5), '#e48aa0'));
    }
    g.add(new THREE.Mesh(assemble(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })));
  } else if (kind === 'brain') {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 8, 0, 6.28, 0, Math.PI / 2), stdMat('#c9a35f')));
  } else if (kind === 'table') {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 0.08, 14), stdMat('#9fb07a'));
    top.position.y = 0.45;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.45, 8), stdMat('#8d9b6c'));
    stem.position.y = 0.22;
    g.add(top, stem);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}
// seagrass: blades that sway, drawn with the swim shader as an instanced "creature"
function seagrass(scene, center, r, n, seed = 2) {
  const blade = { geometry: assemble([part(new THREE.PlaneGeometry(0.035, 0.45, 1, 4).translate(0, 0.225, 0), '#5f9a4a')]), swim: { mode: 'sway', amp: 0.08, freq: 0.9, waves: 0.3, z0: 0, len: 0.45 } };
  const m = makeCreature(blade, { count: n });
  const rnd = seeded(seed), d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * r;
    d.position.set(center.x + Math.cos(a) * rr, 0, center.z + Math.sin(a) * rr);
    d.rotation.set(0, rnd() * 6.28, 0);
    d.scale.setScalar(0.7 + rnd() * 0.7);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
  }
  scene.add(m);
  return m;
}

// helpers to drop creatures into an aquarium
function kit(scene) {
  const updates = [];
  const add = (key, opts = {}) => { const m = makeCreature(SPECIES[key](), opts); scene.add(m); return m; };
  return {
    updates, add,
    school: (key, n, opts) => { const m = add(key, { count: n }); const s = new School(m, opts); updates.push((t, dt) => s.update(dt)); return s; },
    cruise: (key, opts) => { const m = add(key); const c = new Cruise(m, { center: V(0, 0, 0), ...opts }); updates.push((t, dt) => c.update(dt)); return m; },
    wander: (key, opts) => {
      const spec = SPECIES[key]();
      const m = makeCreature(spec);
      scene.add(m);
      const w = new Wander(m, { sideways: !!spec.sideways, ...opts });
      updates.push((t, dt) => w.update(dt));
      return m;
    },
    put: (key, [x, y, z], ry = 0, s = 1) => { const m = add(key); m.position.set(x, y, z); m.rotation.y = ry; m.scale.setScalar(s); return m; },
    run: (t, dt) => updates.forEach((f) => f(t, dt)),
  };
}

// the five reference species together
function aquariumReference(scene) {
  scene.fog = new THREE.Fog(BG, 22, 70);
  sandFloor(scene, 30).position.y = -6;
  const k = kit(scene);
  const tangs = k.school('blueTang', 60, { center: V(-2, -2, 0), size: V(9, 3, 7), speed: 1.3, radius: 1.0 });
  k.cruise('manta', { rx: 12, rz: 7, y: 0.5, speed: 2.2, eight: true });
  const shark = k.cruise('blacktipShark', { rx: 9, rz: 5, y: -3, speed: 2.4, phase: 2 });
  k.cruise('blacktipShark', { rx: 10, rz: 6, y: -3.6, speed: 2.1, phase: 4.5 });
  k.cruise('greenTurtle', { rx: 6, rz: 4, y: -1.0, speed: 0.9, phase: 1, bob: 0.6 });
  k.cruise('whaleShark', { rx: 20, rz: 12, y: 2.8, speed: 1.4, phase: 3.6, bob: 0.2 });
  tangs.threats.push(shark); // the tangs scatter when the shark comes by
  return { obj: scene, radius: 16, update: k.run };
}

// the coral reef: homes, pairs, small schools, and the things on the bottom
function aquariumReef(scene) {
  scene.fog = new THREE.Fog(BG, 14, 40);
  sandFloor(scene, 14);
  const k = kit(scene);
  [[-3.2, -1.5, 0.9], [3.6, 1.6, 0.8], [0.5, -3.2, 0.7], [-4.5, 2.4, 0.6], [4.6, -2.6, 0.75]].forEach(([x, z, s]) => rock(scene, [x, z], s));
  coral(scene, 'branch', [2, -1], 1.1); coral(scene, 'branch', [-1, 2.8], 0.9); coral(scene, 'brain', [-0.6, -1.4]); coral(scene, 'brain', [3, 2.9], 0.8);
  coral(scene, 'table', [-3.4, 1.2]); coral(scene, 'table', [1.4, 3.6], 0.8); coral(scene, 'branch', [-2.4, -3.4], 0.8);
  const shark = k.cruise('whitetipShark', { rx: 6.5, rz: 4.5, y: 1.3, speed: 1.2, phase: 1 });
  // a clownfish family at home in the anemone
  k.put('anemone', [-1.7, 0, 0.9]);
  for (let i = 0; i < 3; i++) k.wander('clownfish', { home: V(-1.7, 0.32, 0.9), radius: 0.22, y: [-0.06, 0.12], speed: 0.22, pause: [0.2, 1.2] });
  // chromis over the branch coral, scattering when the shark passes
  k.school('damselGreen', 36, { center: V(2, 0.9, -1), size: V(1.4, 0.7, 1.4), speed: 0.35, radius: 0.35 }).threats.push(shark);
  k.school('damselBlue', 10, { center: V(-1, 0.85, 2.8), size: V(1.0, 0.5, 1.0), speed: 0.3, radius: 0.3 });
  k.school('blueTang', 16, { center: V(0.5, 1.6, 0.5), size: V(5, 1.2, 4), speed: 0.9, radius: 0.8 }).threats.push(shark);
  for (let i = 0; i < 2; i++) k.wander('butterflyfish', { home: V(-0.6, 0.7, -1.4), radius: 0.8, y: [-0.1, 0.25], speed: 0.4, pause: [0.5, 2] });
  for (let i = 0; i < 2; i++) k.wander('moorishIdol', { home: V(1.4, 1.2, 3.2), radius: 1.2, y: [-0.2, 0.3], speed: 0.35, pause: [0.5, 2] });
  k.wander('parrotfish', { home: V(-0.6, 0.7, -1.4), radius: 2.2, y: [0, 0.6], speed: 0.5, pause: [1, 3] });
  k.wander('boxfish', { home: V(2.6, 1.0, 1.8), radius: 1.2, y: [0, 0.4], speed: 0.2, pause: [1, 3] });
  k.wander('grouper', { home: V(3.4, 0.55, 0.6), radius: 0.8, y: [0, 0.1], speed: 0.25, pause: [3, 7] });
  // the porcupinefish puffs up when the shark comes near
  const puffer = k.wander('porcupinefish', {
    home: V(0.8, 1.0, -2.4), radius: 1.4, y: [0, 0.5], speed: 0.3, pause: [1, 3], threats: [shark], flee: 2.4,
    onAlarm: (on, dt) => puffer.scale.setScalar(THREE.MathUtils.lerp(puffer.scale.x, on ? 1.7 : 1, Math.min(1, dt * (on ? 6 : 1)))),
  });
  // a moray in a hole in the rock: pulls back in when the shark comes by
  const moray = k.add('moray');
  const holeAt = V(3.6, 0.45, 1.6), out = V(-0.55, 0.15, -0.8).normalize();
  moray.rotation.set(0, Math.atan2(-out.z, out.x), 0.2);
  let mOut = 1;
  k.updates.push((t, dt) => {
    const want = moray.position.distanceTo(shark.position) < 3 ? 0 : 1;
    mOut += (want - mOut) * Math.min(1, dt * (want ? 0.6 : 5));
    moray.position.copy(holeAt).addScaledVector(out, -0.45 + mOut * 0.25 + Math.sin(t * 0.7) * 0.02);
  });
  k.cruise('hawksbill', { rx: 4.5, rz: 3, y: 2.1, speed: 0.6, phase: 4, bob: 0.3 });
  for (let i = 0; i < 3; i++) k.wander('squid', { home: V(-3.2 + i * 0.5, 1.9, -2.2), radius: 0.3, y: [0, 0.2], speed: 0.15, pause: [0.5, 2] });
  // the bottom
  k.put('giantClam', [0.2, 0, 1.4], 0.4);
  [[-0.1, -2.5], [4.0, -1.6], [-4.1, 3.2]].forEach(([x, z], i) => k.put('urchin', [x, 0, z], i));
  k.put('seaStar', [1.1, 0, -0.2], 0.5);
  k.put('seaCucumber', [-2.4, 0, -0.4], 1.2);
  k.wander('nudibranch', { home: V(0.6, 0, -3.1), radius: 0.5, speed: 0.04, pause: [1, 4] });
  k.wander('octopus', { home: V(-3.5, 0, -1.0), radius: 1.0, speed: 0.15, pause: [2, 6] });
  return { obj: scene, radius: 6.2, target: V(0, 0.6, 0), update: k.run };
}

// the sandy lagoon: garden eels, rays on the sand, seagrass, jellies, crabs
function aquariumLagoon(scene) {
  scene.fog = new THREE.Fog(BG, 14, 40);
  sandFloor(scene, 14, '#f2e8cf');
  const k = kit(scene);
  seagrass(scene, V(3.2, 0, 1.5), 2.4, 260);
  // the rays and the passing blacktip make the garden eels duck
  const ray = k.wander('stingrayBlue', { home: V(-2.0, 0.08, 0), radius: 2.2, y: [0, 0], speed: 0.35, pause: [3, 8] });
  const shark = k.cruise('blacktipShark', { rx: 6, rz: 3.5, y: 0.9, speed: 1.6, phase: 2.5 });
  k.wander('stingrayRed', { home: V(1.2, 0.1, -2.8), radius: 1.6, y: [0, 0], speed: 0.3, pause: [6, 12] });
  const eels = k.add('gardenEel', { count: 46 });
  const spots = [], rnd = seeded(77);
  for (let i = 0; i < 46; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 1.6; spots.push(V(-2.4 + Math.cos(a) * r, 0, -0.2 + Math.sin(a) * r * 0.8)); }
  const burrows = new Burrows(eels, { spots, depth: 0.55, threats: [ray, shark], reach: 1.1 });
  k.updates.push((t, dt) => burrows.update(dt));
  k.cruise('dugong', { center: V(3.2, 0, 1.5), rx: 3.5, rz: 2.2, y: 1.0, speed: 0.6, bob: 0.3, phase: 1 });
  k.wander('greenTurtle', { home: V(2.6, 0.7, -0.6), radius: 1.6, y: [0, 0.8], speed: 0.3, pause: [1, 4] });
  k.put('seahorse', [4.0, 0.3, 0.6], 1.2);
  k.wander('boxfish', { home: V(1.5, 0.8, 1.0), radius: 1.0, y: [0, 0.4], speed: 0.2, pause: [1, 3] });
  for (let i = 0; i < 4; i++) k.wander('spottedJelly', { home: V(-0.5 + i * 0.9, 2.2, 2.5 - i * 0.4), radius: 0.8, y: [-0.4, 0.4], speed: 0.06, pause: [0, 1] });
  for (let i = 0; i < 3; i++) k.wander('moonJelly', { home: V(-3.5 + i * 0.8, 2.8, -2.6), radius: 0.8, y: [-0.4, 0.4], speed: 0.05, pause: [0, 1] });
  for (let i = 0; i < 3; i++) k.wander('hermitCrab', { home: V(-0.4 + i * 0.4, 0, 3.4), radius: 0.6, speed: 0.07, pause: [1, 4] });
  for (let i = 0; i < 2; i++) k.wander('crab', { home: V(4.4, 0, -2.6), radius: 0.8, speed: 0.12, pause: [1, 3] });
  [[0.4, 1.2], [-4.2, 2.6], [2.0, -1.4]].forEach(([x, z], i) => k.put('seaStar', [x, 0, z], i * 2));
  [[-0.6, -2.6], [0.9, 2.4]].forEach(([x, z], i) => k.put('seaCucumber', [x, 0, z], i * 1.5));
  return { obj: scene, radius: 6.2, target: V(0, 0.6, 0), update: k.run };
}

// the open ocean beyond the drop-off: a fish tornado, a bait ball, dolphins, the whale shark with its remoras
function aquariumOcean(scene) {
  const deep = new THREE.Color('#b9dfe8');
  scene.fog = new THREE.Fog(deep, 30, 95);
  scene.background = deep;
  const SURF = 7;
  const surface = new THREE.Mesh(new THREE.CircleGeometry(60, 48).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#7fd0de', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  surface.position.y = SURF;
  scene.add(surface);
  const k = kit(scene);
  const tuna = [0, 1, 2, 3].map((i) => k.cruise('tuna', { center: V(7, 0, 0), rx: 3.2, rz: 2.6, y: 0, speed: 3.2, phase: i * 0.35, offset: [0, (i % 2) * 0.6 - 0.3, i * 0.3] }));
  k.school('sardine', 220, { center: V(7, 0, 0), size: V(3, 3, 3), speed: 1.2, radius: 0.32, ball: 1.4 }).threats.push(...tuna);
  k.school('trevally', 110, { center: V(-7, -0.5, 0), size: V(6, 6, 6), speed: 1.6, radius: 0.8, swirl: 1.4, ring: 1.6 });
  for (let i = 0; i < 4; i++) k.cruise('dolphin', { rx: 17, rz: 9, y: SURF - 1.4, speed: 4, phase: 0.6 + i * 0.07, jump: 3, jumps: 3, bob: 0.2, offset: [0, (i % 2) * -0.6, i * 0.9 - 1.3] });
  for (let i = 0; i < 3; i++) k.cruise('eagleRay', { rx: 9, rz: 6, y: 2.6, speed: 1.4, phase: 2 + i * 0.12, bob: 0.3, offset: [0, i * 0.3, i * 0.7 - 0.7] });
  for (let i = 0; i < 3; i++) k.cruise('hammerhead', { rx: 14, rz: 8, y: -4, speed: 1.5, phase: 4 + i * 0.22, bob: 0.2, offset: [0, i * 0.9, i * 1.6 - 1.6] });
  const ws = k.cruise('whaleShark', { rx: 13, rz: 10, y: 3.4, speed: 1.3, phase: 1.3, bob: 0.2 });
  for (const [x, z] of [[1.6, 0.45], [0.8, -0.5]]) { const r = makeCreature(SPECIES.remora()); r.position.set(x, -0.62, z); ws.add(r); }
  k.cruise('manta', { rx: 8, rz: 11, y: -1.5, speed: 1.6, phase: 3, eight: true });
  k.cruise('humpback', { rx: 34, rz: 22, y: 0, speed: 2.2, phase: 0.4, bob: 1 });
  for (let i = 0; i < 4; i++) k.cruise('gull', { center: V(-4, 0, 3), rx: 6 + i, rz: 4 + i * 0.5, y: SURF + 3 + i * 0.4, speed: 3, phase: i * 1.6, bob: 0.4 });
  for (let i = 0; i < 3; i++) k.cruise('flyingFish', { center: V(2, 0, -6), rx: 8, rz: 3, y: SURF - 0.4, speed: 4.5, phase: i * 0.2, jump: 1.2, jumps: 4, bob: 0, offset: [0, 0, i * 0.4] });
  for (let i = 0; i < 6; i++) k.wander('moonJelly', { home: V(-2 + (i % 3) * 1.6, 4 + (i % 2), -4 + i * 0.4), radius: 1, y: [-0.5, 0.5], speed: 0.06, pause: [0, 1] });
  return { obj: scene, radius: 15, target: V(0, 1.5, 0), update: k.run };
}

const AQUARIUMS = [
  { name: '水槽：代表5種', en: 'Aquarium · the five reference species', note: 'ナンヨウハギ60匹の群れ（ツマグロが来ると散る）· マンタは8の字 · ツマグロ2匹 · アオウミガメ · ジンベエザメが外側をゆっくり', build: aquariumReference, view: [1, 0.55, 1.2] },
  { name: '水槽：サンゴ礁', en: 'Aquarium · coral reef', note: 'イソギンチャクのクマノミ一家 · 枝サンゴの上のデバスズメダイ · ネムリブカが来ると群れが散り、ハリセンボンがふくらみ、ウツボが穴に引っ込む · タイマイ · アオリイカ · 底のシャコガイ、ガンガゼ、ウミウシ、タコ', build: aquariumReef, view: [1, 0.75, 1.1] },
  { name: '水槽：砂地と浅瀬', en: 'Aquarium · sandy lagoon', note: 'チンアナゴの原っぱ（エイやツマグロが来ると引っ込む）· 砂に伏せるアカエイとヤッコエイ · 海草とジュゴン · タコクラゲとミズクラゲ · ヤドカリとカニ', build: aquariumLagoon, view: [1, 0.75, 1.1] },
  { name: '水槽：外洋', en: 'Aquarium · open ocean', note: 'ギンガメアジの竜巻 · イワシのベイトボールをマグロが襲う · イルカのジャンプ · マダラトビエイとシュモクザメの群れ · コバンザメを連れたジンベエザメ · ザトウクジラ · 水面のカモメとトビウオ', build: aquariumOcean, view: [1, 0.35, 1.25] },
].map((a) => ({ ...a, wide: true, group: 'aquarium' }));

const ITEMS = [...AQUARIUMS];
for (const g of GROUPS) for (const key of g.keys) {
  const spec = SPECIES[key]();
  ITEMS.push({ key, group: g.id, name: spec.name.ja, en: spec.name.en, note: spec.note, build: single(spec), view: spec.upright ? [1, 0.8, 1.2] : key === 'manta' ? [0.8, 0.9, 1.1] : [1, 0.45, 1.25] });
}

// ---------- the reef kit (reef.js): each kind as a few colonies in its colours, and a bommie with its fish ----------
const REEF_NOTES = {
  staghorn: '幅1.0〜1.6 · 3段に分かれる枝、枝先が明るい · 茶・オリーブ・紫・ピンク', table: '直径1.6〜2.6 · 柱の上の平たい皿、縁が反る · 礁の縁', brain: '0.6〜1.0 · 迷路の溝の半球', boulder: '1.5〜3 · でこぼこの大きな塊（根の土台）',
  foliose: '幅0.8〜1.4 · 重なる薄い葉の渦', finger: '幅0.5〜0.9 · 太く短い指の集まり', mushroom: '0.25〜0.4 · 砂の上の円盤、放射状のひだ', leather: '0.5〜0.9 · ひだのある笠、ゆらゆら揺れる',
  softTree: '0.4〜0.8 · 小さな房の茂み、揺れる · ピンク・紫・黄', seaFan: '高さ1〜1.8 · 平らな扇の網目、流れに揺れる · 赤・橙・黄', barrel: '0.5〜0.9 · 樽型のカイメン', tubeSponge: '0.4〜0.8 · 管のカイメンの束',
  rock: '0.3〜1.2 · 角ばった岩', rubble: '崩れたサンゴのかけら', seagrass: '0.4〜0.6 · 細い葉、揺れる',
};
const sand = (scene, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ecdcb6', roughness: 1 })); m.position.y = -0.01; scene.add(m); return m; };
function reefCard(kind) {
  return (scene) => {
    const K = REEF_KINDS[kind], n = K.colors.length, reef = new Reef({ seed: kind.length });
    const step = Math.max(0.9, K.h * 1.4);
    K.colors.forEach((c, i) => reef.add(kind, (i - (n - 1) / 2) * step, 0, (i % 2) * 0.3, { color: i, variant: i % K.make.length, ry: i * 1.3, ...(kind === 'seaFan' ? { ry: Math.PI / 2 } : {}) }));
    const pivot = new THREE.Group();
    scene.add(pivot);
    reef.build(pivot);
    sand(pivot, n * step * 0.62 + 0.6);
    return { obj: pivot, radius: Math.max(n * step * 0.55, K.h * 1.2), target: V(0, K.h * 0.4, 0), update: (t, dt, spin) => { if (spin) pivot.rotation.y += dt * 0.15; } };
  };
}
function bommieCard(scene) {
  scene.fog = new THREE.Fog(BG, 14, 40);
  sand(scene, 9);
  const reef = new Reef({ seed: 9 }), r = seeded(4);
  bommie(reef, 0, 0, 0, 1.5, r);
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 2.4 + r() * 4; const k = ['staghorn', 'brain', 'finger', 'softTree', 'seagrass', 'rubble', 'mushroom', 'leather', 'table'][i % 9]; reef.add(k, Math.cos(a) * d, 0, Math.sin(a) * d); }
  reef.add('seaFan', -3.2, 0, -2.6, { ry: Math.PI / 2, size: 1.3 });
  reef.add('barrel', 3, 0, -2.2, { size: 1.1 });
  reef.build(scene);
  const updates = [];
  const chromis = makeCreature(SPECIES.damselGreen(), { count: 30 }); scene.add(chromis);
  const s = new School(chromis, { center: V(0, 2.2, 0), size: V(2.6, 0.8, 2.6), speed: 0.35, radius: 0.35 }); updates.push((t, dt) => s.update(dt));
  const tangs = makeCreature(SPECIES.blueTang(), { count: 8 }); scene.add(tangs);
  const s2 = new School(tangs, { center: V(1, 1.4, 1.5), size: V(6, 1, 5), speed: 0.8, radius: 0.8 }); updates.push((t, dt) => s2.update(dt));
  const turtle = makeCreature(SPECIES.greenTurtle()); scene.add(turtle);
  const c = new Cruise(turtle, { center: V(0, 0, 0), rx: 5.5, rz: 4, y: 2.6, speed: 0.7, bob: 0.3 }); updates.push((t, dt) => c.update(dt));
  return { obj: scene, radius: 6, target: V(0, 1, 0), update: (t, dt) => updates.forEach((f) => f(t, dt)) };
}
const REEF_ITEMS = [{ group: 'reef', wide: true, name: '水槽：サンゴの根', en: 'Aquarium · a bommie', note: 'ハマサンゴの土台にエダサンゴ・ノウサンゴ・テーブル・ソフトコーラルが乗った根 · デバスズメダイの群れ、ナンヨウハギ、ウミガメ', build: bommieCard, view: [1, 0.6, 1.1] },
  ...Object.entries(REEF_KINDS).map(([kind, K]) => ({ group: 'reef', name: K.ja, en: kind, note: REEF_NOTES[kind] ?? '', build: reefCard(kind), view: [1, 0.6, 1.2] }))];
ITEMS.push(...REEF_ITEMS);

// ---------- page ----------

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;

const grid = document.getElementById('grid');
const tabs = document.getElementById('tabs');
const TABS = [{ id: 'all', ja: 'すべて', n: ITEMS.length }, { id: 'aquarium', ja: '水槽', n: AQUARIUMS.length }, ...GROUPS.map((g) => ({ ...g, n: g.keys.length })), { id: 'reef', ja: 'サンゴ礁', n: REEF_ITEMS.length }];
for (const t of TABS) {
  const b = document.createElement('button');
  b.textContent = `${t.ja} ${t.n}`;
  b.dataset.tab = t.id;
  b.addEventListener('click', () => show(t.id));
  tabs.appendChild(b);
}
const stages = ITEMS.map((item) => {
  const card = document.createElement('div');
  card.className = 'card' + (item.wide ? ' wide' : '');
  card.dataset.group = item.group;
  card.innerHTML = `<div class="view"></div><div class="meta"><b>${item.name}</b> <span>${item.en}</span><small>${item.note}</small></div>`;
  grid.appendChild(card);
  const st = { item, card, view: card.querySelector('.view'), ...stageFor(item.build, item) };
  if (!st.scene.background && item.wide) st.scene.background = BG;
  card.addEventListener('click', () => openDetail(st));
  return st;
});
function show(id) {
  for (const s of stages) s.card.style.display = id === 'all' || s.item.group === id ? '' : 'none';
  for (const b of tabs.children) b.classList.toggle('on', b.dataset.tab === id);
  try { localStorage.setItem('sealife.tab', id); } catch {}
}
let first = 'all';
try { first = localStorage.getItem('sealife.tab') || 'all'; } catch {}
show(TABS.some((t) => t.id === first) ? first : 'all');

// detail view with orbit controls
const detailEl = document.getElementById('detail');
const detailView = document.getElementById('detailView');
let detail = null, detailCam = null, controls = null;
function openDetail(st) {
  detail = st;
  detailCam = st.camera.clone();
  controls = new OrbitControls(detailCam, detailView);
  controls.target.copy(st.target);
  controls.enableDamping = true;
  controls.autoRotate = !st.item.wide;
  controls.autoRotateSpeed = 0.8;
  document.getElementById('dName').textContent = `${st.item.name} · ${st.item.en}`;
  document.getElementById('dNote').textContent = st.item.note;
  detailEl.classList.add('open');
}
function closeDetail() { if (!detail) return; controls.dispose(); detail = null; detailEl.classList.remove('open'); }
document.getElementById('close').addEventListener('click', closeDetail);
addEventListener('keydown', (e) => e.key === 'Escape' && closeDetail());

function resize() { renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', resize);
resize();

const timer = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.elapsedTime;
  clock.uTime.value = t;
  const H = canvas.clientHeight;
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  const jobs = detail ? [[detail, detailView, detailCam]] : stages.map((s) => [s, s.view, s.camera]);
  for (const [st, view, cam] of jobs) {
    const r = view.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H || r.width === 0) continue;
    st.update(t, dt, !detail);
    if (detail) controls.update();
    cam.aspect = r.width / r.height;
    cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(st.scene, cam);
  }
});

// debug: render a card's scene at a fixed size (the preview pane is narrow)
window.__sealife = {
  stages,
  find: (key) => stages.findIndex((s) => s.item.key === key || s.item.name === key),
  shot(i, w = 1200, h = 760, advance = 0) {
    const st = stages[i];
    for (let k = 0; k < advance * 30; k++) { clock.uTime.value += 1 / 30; st.update(clock.uTime.value, 1 / 30, true); }
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setSize(w, h, false);
    r.toneMapping = THREE.NeutralToneMapping;
    r.setClearColor(BG);
    const cam = st.camera.clone();
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    r.render(st.scene, cam);
    const url = r.domElement.toDataURL('image/jpeg', 0.9);
    r.dispose();
    let img = document.getElementById('shot');
    if (!img) { img = document.createElement('img'); img.id = 'shot'; Object.assign(img.style, { position: 'fixed', left: 0, top: 0, width: '100%', zIndex: 99 }); img.onclick = () => img.remove(); document.body.appendChild(img); }
    img.src = url;
    return 'ok';
  },
};

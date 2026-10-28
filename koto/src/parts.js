// Koto parts catalog: roofs, temples and shrines, town buildings, street things, nature through the seasons, vehicles,
// people and animals — and a short approach street putting them together. One renderer, one small scene per card (built when it comes near).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clock } from '../../sealife/src/kit.js';
import { person } from '../../airport/src/parts.js';
import { roof } from '../../town/src/roofs.js';
import { machiya, hondo, torii, senbonTorii, KOTO } from '../../town/src/koto.js';
import { sakura, momiji, yanagi, ume, matsu, tsubaki, ajisai, fujidana, bamboo, mossPatch, Falling, setSeason, onSeason, SEASONS } from '../../town/src/seasons.js';
import { sanmon, gojunoto, shoro, temizuya, haiden, shamusho, daibutsu, karesansui, pondBridge, ishidan, ishigaki, bochi } from '../../town/src/koto-temples.js';
import { chaya, miyageya, ochaya, kura, ryokan, kominkaCafe, sento, yokan, eki, rickshawHut } from '../../town/src/koto-town.js';
import { toro, guardianPair, emaRack, omikujiRack, tamagaki, shimenawa, andon, chochin, takegaki, endai, michishirube, maruPost, ido, mizo, moriJio, setLamps, cat, pigeon, sagi, tobi, risu } from '../../town/src/koto-props.js';
import { rickshaw, tram, kawabune } from '../../town/src/koto-ride.js';
import { routeBus, bicycle } from '../../town/src/vehicles.js';
import { vendingMachine } from '../../town/src/gear.js';

const BG = new THREE.Color('#eceee9');
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const grounds = []; // ground materials that follow the season

// a stone-paved ground (石畳) texture, shared
const paving = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#b5ad9f'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -24 : 0; x < 256; x += 48) {
    g.fillStyle = `hsl(35, 8%, ${62 + ((x * 7 + y * 3) % 9)}%)`; g.fillRect(x + 2, y + 2, 44, 28);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
function ground(scene, w, d, { stone = false, y = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: stone ? '#ffffff' : SEASONS.spring.grass, roughness: 1, map: stone ? (() => { const t = paving.clone(); t.needsUpdate = true; t.repeat.set(w / 4, d / 4); return t; })() : null }));
  m.position.y = y; m.receiveShadow = true;
  scene.add(m);
  if (!stone) grounds.push(m.material);
  return m;
}
onSeason((name, S) => grounds.forEach((m) => m.color.set(S.grass)));

function stage(build, { view = [1, 0.6, 1.1], fill = 0.95, shadows = false } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fffaf0', '#c9c4b4', 1.4));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.3);
  sun.position.set(12, 22, 9);
  if (shadows) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 }); sun.shadow.bias = -0.0005; }
  scene.add(sun);
  const built = build(scene);
  const sphere = new THREE.Box3().setFromObject(built.obj).getBoundingSphere(new THREE.Sphere());
  const target = built.target ?? sphere.center, radius = built.radius ?? sphere.radius;
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 600);
  camera.position.copy(vec(...view).normalize().multiplyScalar((radius / Math.sin(THREE.MathUtils.degToRad(15))) * fill)).add(target);
  camera.lookAt(target);
  return { scene, camera, target, update: built.update ?? (() => {}), obj: built.obj, built };
}
// a few things side by side, turning slowly unless still
function show(make, { spin = true, spacing = 0, update } = {}) {
  return (scene) => {
    const made = [].concat(make());
    const pivot = new THREE.Group();
    made.forEach((o, i) => { if (spacing) o.position.x += (i - (made.length - 1) / 2) * spacing; pivot.add(o); });
    scene.add(pivot);
    const moving = []; pivot.traverse((o) => { if (o !== pivot && o.userData.update) moving.push(o); });
    return { obj: pivot, update: (t, dt, still) => { if (spin && !still) pivot.rotation.y += dt * 0.2; update?.(made, t, dt); moving.forEach((o) => o.userData.update(t, dt)); } };
  };
}

// ---------- cards ----------
function kimonoCard(scene) {
  ground(scene, 8, 3, { stone: true });
  const roles = ['kimonoWoman', 'kimonoWoman2', 'kimonoMan', 'yukataGirl', 'kimonoWoman'];
  const g = new THREE.Group();
  const ps = roles.map((r, i) => { const p = person(r, { mode: i % 2 ? 'walk' : 'idle' }); p.position.set((i - 2) * 1.1, 0, 0); p.userData.phase = i; g.add(p); return p; });
  scene.add(g);
  return { obj: g, radius: 3, target: vec(0, 0.7, 0), update: (t) => ps.forEach((p) => p.userData.update(t)) };
}
function treesCard(scene) {
  ground(scene, 14, 8);
  const trees = [sakura({ seed: 1 }), sakura({ seed: 2, weeping: true }), momiji({ seed: 1 }), momiji({ seed: 3 })];
  trees.forEach((t, i) => { t.position.set((i - 1.5) * 3.4, 0, 0); scene.add(t); });
  const f = new Falling(scene, { area: [-7, 7, -3, 3], top: 4.5 });
  const g = new THREE.Group(); trees.forEach((t) => g.attach(t)); scene.add(g);
  return { obj: g, radius: 7, target: vec(0, 1.8, 0), update: (t, dt) => f.update(t, dt) };
}
function senbonCard(scene) {
  // a stone path climbing a slope in an S, roofed by the gates
  const path = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; path.push([Math.sin(t * Math.PI * 1.2) * 3, t * 3.2, -9 + t * 18]); }
  const s = senbonTorii({ path });
  scene.add(s);
  // the hillside under it
  const hill = new THREE.Mesh(new THREE.PlaneGeometry(16, 22, 16, 22).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: KOTO.moss, roughness: 1, flatShading: true }));
  const p = hill.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, (p.getZ(i) + 9) / 18 * 3.2 - 0.05 + Math.sin(p.getX(i) * 1.3) * 0.1); hill.geometry.computeVertexNormals();
  scene.add(hill);
  const walk = new THREE.Mesh(new THREE.TubeGeometry(s.userData.curve, 60, 0.01, 3), new THREE.MeshBasicMaterial({ visible: false })); void walk;
  const people = ['kimonoWoman', 'kimonoMan'].map((r, i) => { const pp = person(r, { mode: 'walk' }); scene.add(pp); return pp; });
  return { obj: s, radius: 9, target: vec(0, 1.8, 0), update: (t) => people.forEach((pp, i) => { const k = ((t * 0.035 + i * 0.12) % 1); const P = s.userData.curve.getPointAt(k), T = s.userData.curve.getTangentAt(k); pp.position.copy(P); pp.rotation.y = Math.atan2(-T.z, T.x); pp.userData.update(t); }) };
}
// the sample: a short approach street (参道) — townhouses both sides, a torii, the hall at the top, trees, people
function sandoSample(scene) {
  ground(scene, 60, 60);
  ground(scene, 6, 34, { stone: true, y: 0.01 }).position.z = 2;
  const shops = ['sweets', 'tea', 'craft', 'home'];
  for (let i = 0; i < 4; i++) for (const s of [1, -1]) {
    const m = machiya({ shop: shops[(i + (s > 0 ? 0 : 2)) % 4], lattice: (i + s) % 3 ? 'wood' : 'bengara' });
    m.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; m.position.set(s * 8.6, 0, 12 - i * 5.6); scene.add(m);
  }
  const t = torii(); t.scale.setScalar(1.4); t.position.set(0, 0, -6.5); scene.add(t);
  const h = hondo(); h.scale.setScalar(0.85); h.position.set(0, 0, -18); scene.add(h);
  [[-4.5, -8, 'sakura'], [4.6, -8.5, 'momiji'], [-6, -12, 'momiji'], [6, -12.5, 'sakura', true]].forEach(([x, z, k, w]) => { const tr = k === 'sakura' ? sakura({ seed: Math.abs(x) | 0, weeping: !!w }) : momiji({ seed: 2 }); tr.position.set(x, 0, z); scene.add(tr); });
  const roles = ['kimonoWoman', 'kimonoMan', 'kimonoWoman2', 'yukataGirl', 'tourist', 'kimonoWoman', 'senior', 'kimonoWoman2'];
  const walkers = roles.map((r, i) => { const p = person(r, { mode: 'walk' }); p.userData.phase = i; p.userData.lane = (i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.5); p.userData.k = i / roles.length; scene.add(p); return p; });
  const f = new Falling(scene, { area: [-9, 9, -16, 18], top: 7 });
  const updates = [];
  scene.traverse((o) => { if (o.userData?.update && o.userData.kind === 'building') updates.push(o); });
  return { obj: scene, radius: 20, target: vec(0, 1.5, -2), update: (tt, dt) => {
    f.update(tt, dt);
    updates.forEach((o) => o.userData.update(tt, dt));
    walkers.forEach((p, i) => { p.userData.k = (p.userData.k + dt * 0.012 * (i % 2 ? 1 : -1) + 1) % 1; const z = 17 - p.userData.k * 22; p.position.set(p.userData.lane, 0.02, z); p.rotation.y = i % 2 ? Math.PI / 2 : -Math.PI / 2; p.userData.update(tt); });
  } };
}

// a row of people (or animals) facing the camera a little, each doing its own thing
function crowd(roles, { mode = 'idle', gap = 1.1, stone = true, w = 0 } = {}) {
  return (scene) => {
    ground(scene, w || roles.length * gap + 2, 3, { stone });
    const g = new THREE.Group();
    const ps = roles.map((r, i) => { const [role, md] = [].concat(r); const p = person(role, { mode: md ?? mode }); p.position.set((i - (roles.length - 1) / 2) * gap, 0, 0); p.userData.phase = i; g.add(p); return p; });
    scene.add(g);
    return { obj: g, radius: roles.length * gap * 0.5 + 0.6, target: vec(0, 0.75, 0), update: (t) => ps.forEach((p) => p.userData.update(t)) };
  };
}
// vehicles drive in place: wheels turn, the puller runs
function rideCard(make, { speed = 2, radius, gap = 3.4 } = {}) {
  return (scene) => {
    ground(scene, 14, 6, { stone: true });
    const made = [].concat(make());
    const g = new THREE.Group(); made.forEach((v, i) => { v.position.z = (i - (made.length - 1) / 2) * gap; v.userData.speed = speed; g.add(v); }); scene.add(g);
    return { obj: g, radius, update: (t, dt) => made.forEach((v) => (v.userData.kind === 'bus' || v.userData.kind === 'car' ? (v.userData.speed = speed, v.userData.update(dt)) : v.userData.update(t, dt))) };
  };
}
function waterCard(scene) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(22, 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6f9a8a, roughness: 0.15, metalness: 0.1 }));
  scene.add(w);
  const b = [kawabune({ kind: 'yakata' }), kawabune()]; b[0].position.set(-2, 0, -2); b[1].position.set(4, 0, 2.2); b[1].rotation.y = 0.4;
  const s = sagi(); s.position.set(-8, -0.25, 3.5); const y = yanagi({ seed: 2 }); y.position.set(-9, 0, -4.5);
  const g = new THREE.Group(); g.add(...b, s, y); scene.add(g);
  return { obj: g, radius: 9, target: vec(0, 1, 0), update: (t) => [...b, s].forEach((o) => o.userData.update(t)) };
}
function animalsCard(scene) {
  ground(scene, 8, 4, { stone: true });
  const c1 = cat({ mode: 'sit' }), c2 = cat({ color: 0x3a3a3a, mode: 'sleep' }), c3 = cat({ color: 0xf2ede2, mode: 'walk' });
  const ps = [0, 1, 2].map((i) => pigeon({ seed: i })), h = sagi(), r = risu(), k = tobi();
  k.userData.radius = 2.4; k.userData.height = 2.4;
  [[c1, -2.6, 0], [c2, -1.8, 0.6], [c3, -1.4, -0.6], [ps[0], -0.3, 0.2], [ps[1], 0.1, -0.3], [ps[2], 0.4, 0.4], [h, 1.6, 0], [r, 2.8, 0.3]].forEach(([o, x, z]) => o.position.set(x, 0, z));
  const all = [c1, c2, c3, ...ps, h, r, k], g = new THREE.Group(); g.add(...all); scene.add(g);
  return { obj: g, radius: 3.4, target: vec(0, 0.7, 0), update: (t) => all.forEach((o) => o.userData.update(t)) };
}
function bambooCard(scene) {
  ground(scene, 12, 12);
  const b = bamboo({ w: 10, d: 10, n: 120, h: 9 }); scene.add(b);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb5ad9f, roughness: 1 })); path.position.y = 0.02; scene.add(path);
  const f = takegaki({ kind: 'kenninji', length: 10, h: 1.4 }); f.position.x = -1.1; f.rotation.y = Math.PI / 2; scene.add(f);
  const f2 = takegaki({ kind: 'kenninji', length: 10, h: 1.4 }); f2.position.x = 1.1; f2.rotation.y = Math.PI / 2; scene.add(f2);
  const rk = rickshaw(); rk.rotation.y = Math.PI / 2; rk.position.z = 2; rk.userData.speed = 1.8; scene.add(rk);
  return { obj: b, radius: 7.5, target: vec(0, 3, 0), update: (t, dt) => { rk.userData.update(t, dt); rk.position.z = 4 - ((t * 0.9) % 8); } };
}

const C = (group, name, en, note, build, opts = {}) => ({ group, name, en, note, build, ...opts });
const ITEMS = [
  C('sample', '見本：参道', 'Sample · an approach street', '石畳の参道の両側に京町家（和菓子・お茶・扇子の店、住まい）、朱の鳥居、その奥に本堂 · 桜としだれ桜、楓 · 着物の人が行き交う · 季節で花・葉・地面が変わり、花びら・落ち葉・雪が舞う', sandoSample, { wide: true, view: [0.12, 0.5, 1], fill: 0.62, shadows: true }),
  C('roof', '屋根の4つの形', 'Roof kinds', '切妻（瓦）· 寄棟（檜皮）· 入母屋（銅板、反りと隅の跳ね上がり）· 宝形（瓦、宝珠）· 瓦の列は屋根面の波で、棟と鬼瓦、隅棟つき', show(() => [roof({ kind: 'gable', w: 5, d: 4, h: 1.8 }), roof({ kind: 'hip', w: 5, d: 4, h: 1.6, material: 'hiwada' }), roof({ kind: 'irimoya', w: 5.6, d: 4.4, h: 2.4, sori: 0.25, corner: 0.5, material: 'copper' }), roof({ kind: 'hogyo', w: 4, d: 4, h: 2.0, sori: 0.2, corner: 0.3 })], { spacing: 6.2, spin: false }), { view: [0.25, 0.55, 1.1], fill: 0.55 }),
  C('building', '京町家', 'Kyo-machiya', '間口5.4 × 奥行11 · 千本格子、虫籠窓、犬矢来、一文字瓦の庇、暖簾（揺れる）、ばったり床几、鍾馗さん · 和菓子・お茶・扇子の店と住まい、格子は焦茶か弁柄', show(() => ['sweets', 'tea', 'craft', 'home'].map((s, i) => machiya({ shop: s, lattice: i === 1 ? 'bengara' : 'wood' })), { spacing: 5.8, spin: false }), { view: [0.3, 0.4, 1.2], fill: 0.7 }),
  C('temple', '本堂', 'Main hall', '14 × 11 · 石の基壇と縁側、柱と組物、垂木、入母屋の大屋根（反り）、向拝、木の階段、擬宝珠の欄干、賽銭箱、大提灯', show(() => hondo(), { spin: false }), { view: [0.55, 0.45, 1.1] }),
  C('shrine', '鳥居', 'Torii', '明神鳥居（朱、反った笠木、額）· 石の明神鳥居 · 神明鳥居（素木、まっすぐ）', show(() => [torii(), torii({ color: 'stone' }), torii({ type: 'shinmei', color: 'wood' })], { spacing: 5.5, spin: false }), { view: [0.2, 0.3, 1.2], fill: 0.6 }),
  C('shrine', '千本鳥居', 'A thousand torii', '小さな朱の鳥居が坂道に続くトンネル（全部で5回の描画）· 一基ずつ少し違う · 着物の人が上る', senbonCard, { view: [1, 0.6, 0.5], fill: 0.85 }),
  C('temple', '山門', 'Two-storey gate', '12 × 6 · 3間の門、左右に仁王（格子の奥）、裳階の屋根、2階の縁と欄干、額、入母屋の大屋根', show(() => sanmon(), { spin: false }), { view: [0.5, 0.35, 1.1] }),
  C('temple', '五重塔', 'Five-storey pagoda', '高さ約18 · 上ほど小さい5つの層、深い軒と反り、朱の柱と白壁、相輪（九輪・水煙・宝珠）', show(() => gojunoto(), { spin: false }), { view: [0.5, 0.2, 1], fill: 1.25 }),
  C('temple', '鐘楼', 'Bell tower', '石の基壇、少し開いた4本の柱、入母屋の屋根、青銅の鐘（乳）、撞木が揺れる', show(() => shoro(), { spin: false }), { view: [0.6, 0.35, 1] }),
  C('temple', '手水舎', 'Purification font', '石の水盤と水面、龍の口から水、竹の台に柄杓、銅板の屋根', show(() => temizuya(), { spin: false }), { view: [0.6, 0.55, 1] }),
  C('temple', '大仏', 'Great Buddha', '露坐の青銅の大仏（座高約8）· 螺髪、肉髻、長い耳、白毫、定印の手 · 石の台座、前に香炉', show(() => daibutsu(), { spin: false }), { view: [0.35, 0.3, 1] }),
  C('temple', '枯山水', 'Dry garden', '白砂に砂紋（石のまわりは輪）、石組、苔の島、縁側から眺める', show(() => karesansui(), { spin: false }), { view: [0.3, 0.8, 1] }),
  C('temple', '池と太鼓橋', 'Pond and arched bridge', '石の縁の池、睡蓮、泳ぐ鯉、朱の太鼓橋と擬宝珠、雪見ではない春日灯籠', show(() => pondBridge(), { spin: false }), { view: [0.8, 0.6, 1], fill: 0.72 }),
  C('temple', '石段・石垣・墓地', 'Steps, stone wall, graves', '苔むした石段、少し傾いた野面積みの石垣、背景の五輪塔と卒塔婆', show(() => { const a = ishidan(), b = ishigaki(), c = bochi(); a.position.x = -5; b.position.set(1, 0, -1.6); c.position.set(6, 0, 0.8); return [a, b, c]; }, { spin: false }), { view: [0.4, 0.5, 1], fill: 0.75 }),
  C('shrine', '拝殿（流造）', 'Worship hall', '朱の柱と白壁、前に長く伸びる銅板の屋根（流造）、鈴と紅白の鈴緒、賽銭箱、注連縄と紙垂', show(() => haiden(), { spin: false }), { view: [0.55, 0.35, 1] }),
  C('shrine', '社務所', 'Amulet office', 'お守りが並ぶ窓口、「お守り・御朱印」の札', show(() => shamusho(), { spin: false }), { view: [0.4, 0.3, 1] }),
  C('shrine', '狛犬・狐・灯籠', 'Guardians and lanterns', '阿吽の狛犬、赤い前掛けの狐、春日灯籠と雪見灯籠（灯りがつく）', show(() => { const a = guardianPair({ gap: 2.4 }), b = guardianPair({ kind: 'fox', gap: 2.4 }), c = toro(), d = toro({ kind: 'yukimi' }); a.position.x = -3.4; b.position.x = 1.2; c.position.x = 4.2; d.position.x = 5.6; return [a, b, c, d]; }, { spin: false }), { view: [0.3, 0.3, 1], fill: 0.55 }),
  C('shrine', '絵馬・おみくじ・玉垣・注連縄', 'Plaques, fortunes, fence, rope', '絵馬がぎっしりの絵馬掛け、白い紙が結ばれたおみくじ、石の玉垣、注連縄と紙垂', show(() => { const a = emaRack(), b = omikujiRack(), c = tamagaki({ length: 5 }), d = shimenawa({ w: 3 }); a.position.x = -3.4; b.position.x = -0.6; c.position.set(3.4, 0, 0); d.position.set(0, 2.4, -1); return [a, b, c, d]; }, { spin: false }), { view: [0.25, 0.3, 1], fill: 0.6 }),
  C('building', '茶屋・甘味処', 'Tea house', '平屋、開けた店先、緋毛氈の縁台、野点傘、団子の看板、暖簾', show(() => chaya(), { spin: false }), { view: [0.45, 0.35, 1] }),
  C('building', '土産物屋', 'Souvenir shop', '町家の1階が店：扇子、和菓子の箱、和傘立て、漬物の樽、手書きの値札', show(() => miyageya(), { spin: false }), { view: [0.45, 0.3, 1] }),
  C('building', 'お茶屋（花街）', 'Teahouse of the geisha district', '弁柄格子、駒寄せ、2階の簾と欄干、紋入りの提灯（灯る）', show(() => ochaya(), { spin: false }), { view: [0.45, 0.3, 1] }),
  C('building', '蔵・酒蔵', 'Storehouse', '白い漆喰となまこ壁、厚い扉、妻入りの屋根、杉玉と樽', show(() => kura(), { spin: false }), { view: [0.5, 0.3, 1] }),
  C('building', '旅館・料亭', 'Inn', '瓦をのせた築地塀と門、打ち水の石畳、2階建ての障子、行灯の看板、盛り塩', show(() => ryokan(), { spin: false }), { view: [0.35, 0.5, 1] }),
  C('building', '古民家カフェ', 'Old-house café', '茅葺きの寄棟、障子、縁側、黒板の看板、自転車', show(() => kominkaCafe(), { spin: false }), { view: [0.45, 0.35, 1] }),
  C('building', '銭湯', 'Bathhouse', '唐破風の玄関、「ゆ」の暖簾、高い煙突', show(() => sento(), { spin: false }), { view: [0.6, 0.3, 1], fill: 1.1 }),
  C('building', '洋館', 'Western house', '鎌倉の洋館：下見板張り、急な三角屋根、出窓、煙突、水色と白', show(() => yokan(), { spin: false }), { view: [0.5, 0.3, 1] }),
  C('building', '駅舎・人力車の詰所', 'Station and rickshaw stand', '単線の小さな駅：待合、ホーム、駅名標、ベンチ · 人力車の詰所と幟', show(() => { const a = eki(), b = rickshawHut(); b.position.set(11.5, 0, 0.5); return [a, b]; }, { spin: false }), { view: [0.3, 0.45, 1], fill: 0.65 }),
  C('street', '行灯・提灯・道標', 'Lamps and signposts', '置き行灯（屋号）、赤と白の提灯（揺れる）、木の道標と石の道標 · 「灯り」で夕方の明かり', show(() => { const a = andon(), b = chochin({ text: '祇園' }), c = chochin({ color: 'white', text: '花見' }), d = michishirube(), e = michishirube({ kind: 'stone' }); a.position.x = -2.2; b.position.set(-0.8, 1.8, 0); c.position.set(0, 1.8, 0); d.position.x = 1.6; e.position.x = 3.2; return [a, b, c, d, e]; }, { spin: false }), { view: [0.2, 0.25, 1], fill: 0.72 }),
  C('street', '竹垣', 'Bamboo fences', '建仁寺垣（縦の竹）· 光悦垣（斜めの格子と曲がった笠）· 四つ目垣（すかし）', show(() => [takegaki(), takegaki({ kind: 'koetsu' }), takegaki({ kind: 'yotsume' })], { spacing: 4.6, spin: false }), { view: [0.2, 0.3, 1], fill: 0.7 }),
  C('street', '縁台・丸ポスト・井戸・側溝', 'Bench, post box, well, gutter', '緋毛氈の縁台と野点傘 · 丸ポスト · 井戸と釣瓶 · 町家の前の石の側溝 · 落ち着いた色の自販機', show(() => { const a = endai(), b = maruPost(), c = ido(), d = mizo({ length: 5 }), e = vendingMachine({ color: '#6b5a48' }), f = moriJio(); a.position.x = -3.6; b.position.x = -0.8; c.position.x = 1.0; d.position.set(0, 0, 2.2); e.position.set(3.2, 0, 0); f.position.set(-0.2, 0, 0.6); return [a, b, c, d, e, f]; }, { spin: false }), { view: [0.25, 0.45, 1] }),
  C('nature', '竹林と人力車', 'Bamboo grove', '高くまっすぐな竹（節つき）が揺れる（2回の描画で120本）· 建仁寺垣の小径を人力車が通る', bambooCard, { view: [0.5, 0.3, 1], fill: 1.15 }),
  C('nature', '柳・松・梅', 'Willow, pine, plum', '川辺の柳（長い枝が揺れる、冬は枝だけ）· 手入れされた松（常緑）· 梅（冬に白桃色の花）', show(() => [yanagi(), matsu(), ume()], { spacing: 4.4, spin: false }), { view: [0.25, 0.3, 1] }),
  C('nature', '椿・紫陽花・藤棚・苔', 'Camellia, hydrangea, wisteria, moss', '椿（冬〜春に赤い花）· 紫陽花（初夏に青紫）· 藤棚（春に紫の房）· 苔と羊歯', show(() => { const a = tsubaki(), b = ajisai(), c = ajisai({ seed: 2 }), d = fujidana(), e = mossPatch(); a.position.x = -4; b.position.set(-2.2, 0, 0.4); c.position.set(-1.4, 0, -0.5); d.position.x = 2.2; e.position.set(-1, 0, 2); return [a, b, c, d, e]; }, { spin: false }), { view: [0.3, 0.45, 1] }),
  C('ride', '人力車', 'Rickshaw', '黒塗りの車体、赤い膝掛け、大きな車輪、たたんだ幌 · 法被の車夫が引く · 幌を上げた形も', rideCard(() => [rickshaw(), rickshaw({ riders: ['maiko'], hood: 'up' })], { speed: 1.6 }), { view: [0.3, 0.4, 1] }),
  C('ride', '路面電車・市バス', 'Tram and city bus', '緑とクリームの2両の電車（パンタグラフ、行き先）· 緑の帯の市バス', rideCard(() => [tram(), routeBus({ accent: 0x3f8a4a, to: '清水道' })], { speed: 3, gap: 4.6 }), { view: [0.35, 0.35, 1] }),
  C('ride', '屋形船・小舟', 'River boats', '提灯の屋形船と小舟 · 船頭が棹で押す · 柳と鷺', waterCard, { view: [0.4, 0.45, 1], fill: 0.62 }),
  C('people', '振袖・舞妓さん', 'Furisode and maiko', '振袖（長い袖）· 舞妓さん：だらりの帯、おこぼ、髪に花かんざし（白塗りなしの控えめな表現）· 和傘の人 · 着物の子ども', crowd(['furisode', 'maiko', ['maiko', 'walk'], 'umbrellaWoman', 'kimonoKid']), { view: [0.25, 0.3, 1.2], fill: 0.6 }),
  C('people', '僧侶・神主・巫女', 'Monks, priest, shrine maiden', '黒い法衣と袈裟の僧侶 · 網代笠で托鉢する僧 · 白衣に浅葱の袴の神主（烏帽子）· 白衣に緋袴の巫女（竹ぼうき）', crowd(['monk', ['takuhatsu', 'walk'], 'kannushi', 'miko']), { view: [0.25, 0.3, 1.2], fill: 0.6 }),
  C('people', '働く人', 'Working people', '法被と鉢巻の車夫 · 菅笠の船頭 · 三角巾と前掛けの茶屋の店員（お盆に抹茶と団子）· 庭師（はさみ）', crowd([['shafu', 'walk'], 'sendo', 'teaStaff', 'gardener']), { view: [0.25, 0.3, 1.2], fill: 0.6 }),
  C('people', '修学旅行・観光・地元の人', 'School trip, visitors, locals', '旗を持った先生と詰襟・セーラー服の生徒 · カメラの観光客 · 割烹着のおばあちゃん · 甚平の子ども（うちわ）', crowd([['teacher', 'walk'], ['schoolBoy', 'walk'], ['schoolGirl', 'walk'], 'visitor', 'obaachan', 'jinbeiKid'], { gap: 1.0 }), { view: [0.25, 0.3, 1.2], fill: 0.6 }),
  C('animal', '猫・鳩・鷺・鳶・リス', 'Cat, pigeons, heron, kite, squirrel', '路地の猫（座る・眠る・歩く）· つつく鳩 · 鷺 · 上空を回る鳶 · 跳ねては止まるリス', animalsCard, { view: [0.3, 0.4, 1.2], fill: 0.7 }),
  C('people', '着物の人', 'People in kimono', '小紋（桜・菊の柄）と帯のお太鼓、半衿、袂（揺れる袖）、まとめ髪とかんざし、草履 · 羽織の男性 · 浴衣の子ども · 歩幅は小さく', kimonoCard, { view: [0.25, 0.3, 1.2], fill: 0.6 }),
  C('nature', '桜・しだれ桜・楓', 'Cherry · weeping cherry · maple', '季節で色が変わる：春は桜色と若葉、初夏は緑、秋は紅葉、冬は枝だけ · 花びら・落ち葉・雪が舞う', treesCard, { view: [0.3, 0.35, 1.2], fill: 0.7 }),
];
const GROUPS = [['all', 'すべて'], ['sample', '見本'], ['roof', '屋根'], ['temple', '寺'], ['shrine', '神社'], ['building', '町の建物'], ['street', '通り'], ['nature', '自然'], ['ride', '乗り物'], ['people', '人'], ['animal', '動物']];

// ---------- page ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const grid = document.getElementById('grid'), tabs = document.getElementById('tabs'), seasonsNav = document.getElementById('seasons');
for (const [id, ja] of GROUPS) { const b = document.createElement('button'); b.textContent = `${ja} ${id === 'all' ? ITEMS.length : ITEMS.filter((i) => i.group === id).length}`; b.dataset.tab = id; b.onclick = () => showTab(id); tabs.appendChild(b); }
for (const [id, S] of Object.entries(SEASONS)) { const b = document.createElement('button'); b.textContent = S.ja; b.dataset.season = id; b.onclick = () => { setSeason(id); [...seasonsNav.children].filter((x) => x.dataset.season).forEach((x) => x.classList.toggle('on', x === b)); }; seasonsNav.appendChild(b); }
seasonsNav.children[0].classList.add('on');
{ // dusk: light every lamp and lantern
  const b = document.createElement('button'); b.textContent = '灯り'; b.style.marginLeft = '12px';
  b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); setLamps(on ? 1 : 0); };
  seasonsNav.appendChild(b);
}
const cards = ITEMS.map((item) => {
  const card = document.createElement('div');
  card.className = 'card' + (item.wide ? ' wide' : '');
  card.innerHTML = `<div class="view"></div><div class="meta"><b>${item.name}</b> <span>${item.en}</span><small>${item.note}</small></div>`;
  grid.appendChild(card);
  const c = { item, card, view: card.querySelector('.view'), st: null };
  card.onclick = () => openDetail(c);
  return c;
});
const ready = (c) => (c.st ??= (() => { const st = stage(c.item.build, c.item); st.scene.background = c.item.wide ? BG : null; return st; })());
function showTab(id) { cards.forEach((c) => (c.card.style.display = id === 'all' || c.item.group === id ? '' : 'none')); [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.tab === id)); }
showTab('all');
const detailEl = document.getElementById('detail'), detailView = document.getElementById('detailView');
let detail = null, detailCam = null, controls = null;
function openDetail(c) { const st = ready(c); detail = c; detailCam = st.camera.clone(); controls = new OrbitControls(detailCam, detailView); controls.target.copy(st.target); controls.enableDamping = true; document.getElementById('dName').textContent = `${c.item.name} · ${c.item.en}`; document.getElementById('dNote').textContent = c.item.note; detailEl.classList.add('open'); }
function closeDetail() { if (!detail) return; controls.dispose(); detail = null; detailEl.classList.remove('open'); }
document.getElementById('close').onclick = closeDetail;
addEventListener('keydown', (e) => e.key === 'Escape' && closeDetail());
const resize = () => renderer.setSize(innerWidth, innerHeight, false);
addEventListener('resize', resize); resize();
const timer = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(timer.getDelta(), 0.05), t = timer.elapsedTime;
  clock.uTime.value = t;
  const H = canvas.clientHeight;
  renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
  const jobs = detail ? [[detail, detailView, true]] : cards.map((c) => [c, c.view, false]);
  for (const [c, view, inDetail] of jobs) {
    const r = view.getBoundingClientRect();
    if (r.bottom < -300 || r.top > H + 300 || r.width === 0) continue;
    const st = ready(c);
    if (r.bottom < 0 || r.top > H) continue;
    const cam = inDetail ? detailCam : st.camera;
    st.update(t, dt, inDetail);
    if (inDetail) controls.update();
    cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height); renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(st.scene, cam);
  }
});

// debug: a contact sheet of cards at a fixed size (the preview pane is narrow); the extra renderer is disposed
window.__koto = {
  cards, ready, setSeason,
  sheet(ids, { cols = 2, W = 600, Hh = 400, advance = 1 } = {}) {
    const rows = Math.ceil(ids.length / cols), cv = document.createElement('canvas'); cv.width = W * cols; cv.height = Hh * rows;
    const ctx = cv.getContext('2d'); ctx.font = '18px sans-serif';
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, Hh, false); r.toneMapping = THREE.NeutralToneMapping; r.shadowMap.enabled = true; r.setClearColor(BG);
    ids.forEach((i, n) => { const st = ready(cards[i]); for (let k = 0; k < advance * 30; k++) { clock.uTime.value += 1 / 30; st.update(clock.uTime.value, 1 / 30, true); } const cam = st.camera.clone(); cam.aspect = W / Hh; cam.updateProjectionMatrix(); r.render(st.scene, cam); ctx.drawImage(r.domElement, (n % cols) * W, Math.floor(n / cols) * Hh); ctx.fillStyle = '#000'; ctx.fillText(i + ' ' + cards[i].item.name, (n % cols) * W + 6, Math.floor(n / cols) * Hh + 20); });
    r.dispose(); r.forceContextLoss();
    let img = document.getElementById('shot'); if (!img) { img = document.createElement('img'); img.id = 'shot'; Object.assign(img.style, { position: 'fixed', left: 0, top: 0, width: '100%', zIndex: 999 }); img.onclick = () => img.remove(); document.body.appendChild(img); }
    img.src = cv.toDataURL('image/jpeg', 0.88);
    return new Promise((res) => (img.onload = () => res('ok')));
  },
};

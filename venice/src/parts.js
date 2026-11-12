// Venice parts catalogue (venice/DESIGN.md §2, §5): every material and part, card by card, before the town is put
// together. One renderer for the page, one small scene per card (built when it comes near), drawn with scissor
// viewports like the snow festival's catalogue. An afternoon sun from the south-west, a blue sky fill, stone or water.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { clock, IKit, MAT, G, C, WALLS, LAND, kits, group } from './kit.js';
import { house, HOUSE_KINDS, campanile, basilica, palace, arcade, columns, stoneBridge, woodBridge, bigBridge, sighsBridge, archWin, shutterWin, balcony, chimney, flowers, waterDoor, pole } from './house.js';
import { gondola, vaporetto, waterTaxi, workBoat, ambulance, motorBoat } from './boats.js';
import { ROLES, pigeons, gull, cat, dog } from './people.js';
import { wellhead, lantern, signpost, cafeTable, bandstand, marketStall, maskStand, gelato, furnace, washing, handcart, bench, postBox, planters, bricola, pontoon, gondolaPier } from './props.js';
import { waterSheet, tintedSheet, wake } from './water.js';

const BG = new THREE.Color('#e9eef4');
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

// a slab of grey paving with a white stone edge, its top at y = 0
function paving(scene, w, d) {
  const k = new IKit(); k.box(w, 0.3, d, C.paving, 0, -0.15, 0, { r: 0.06 }); k.box(w + 0.06, 0.08, d + 0.06, C.stone, 0, -0.26, 0, { r: 0.03 });
  const m = k.mesh(MAT.stone, { cast: false }); scene.add(m); return m;
}
function stage(build, { view = [1, 0.6, 1.1], fill = 0.95 } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#dceaff', '#c9b9a0', 1.3));
  const sun = new THREE.DirectionalLight('#fff0dc', 2.5); sun.position.set(-10, 12, 9); scene.add(sun); // (an afternoon sun from the south-west)
  const built = build(scene);
  const sphere = new THREE.Box3().setFromObject(built.obj).getBoundingSphere(new THREE.Sphere());
  const target = built.target ?? sphere.center, radius = built.radius ?? sphere.radius;
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.05, 400);
  camera.position.copy(vec(...view).normalize().multiplyScalar((radius / Math.sin(THREE.MathUtils.degToRad(15))) * fill)).add(target);
  camera.lookAt(target);
  return { scene, camera, target, update: built.update ?? (() => {}), obj: built.obj };
}
const movers = (g) => { const m = []; g.traverse((o) => o.userData.update && m.push(o)); return m; };
// a few things side by side, on paving (or standing in water), turning slowly unless still
function show(make, { spin = false, spacing = 0, groundW, groundD = 4, water = null, sink = 0 } = {}) {
  return (scene) => {
    const made = [].concat(make()), pivot = new THREE.Group();
    made.forEach((o, i) => { if (spacing) o.position.x += (i - (made.length - 1) / 2) * spacing; o.position.y -= sink; pivot.add(o); });
    scene.add(pivot);
    const box = new THREE.Box3().setFromObject(pivot), size = box.getSize(vec(0, 0, 0)), cx = (box.min.x + box.max.x) / 2;
    if (water) { const s = waterSheet(groundW ?? size.x + 3, Math.max(groundD, size.z + 3), water); s.position.x = cx; scene.add(s); }
    else { const p = paving(scene, groundW ?? size.x + 2, Math.max(groundD, size.z + 1.5)); p.position.x = cx; }
    const moving = movers(pivot);
    return { obj: pivot, update: (t, dt, still) => { if (spin && !still) pivot.rotation.y += dt * 0.2; moving.forEach((o) => o.userData.update(t, dt)); } };
  };
}
// boats crossing a strip of canal, looping, each with a wake
function boatCard(make, { speed = 0.8, gap = 5, len = 14, kind = 'canal' } = {}) {
  return (scene) => {
    scene.add(waterSheet(len, 5, kind));
    const bs = [].concat(make()), g = new THREE.Group();
    const wakes = bs.map((b) => { const w = wake({ len: b.userData.len * 1.1, spread: b.userData.len * 0.22 }); b.add(w); w.position.x = -b.userData.len / 2; return w; });
    bs.forEach((b, i) => { b.position.z = (i % 2 ? -0.9 : 0.9) * (bs.length > 1 ? 1 : 0); g.add(b); }); scene.add(g);
    return { obj: g, radius: len * 0.2, target: vec(0, 0.4, 0), update: (t) => bs.forEach((b, i) => { b.position.x = ((t * speed + i * gap) % len) - len / 2; b.userData.update?.(t); wakes[i].userData.update(t); }) };
  };
}

// the materials: one rounded block per material, in the order of DESIGN.md §2
function materialsCard(scene) {
  const g = new THREE.Group(); scene.add(g); paving(scene, 16, 8);
  const cell = (i) => [(i % 8) * 1.75 - 6.1, Math.floor(i / 8) * 1.8 - 2.7];
  // 1–4: water swatches (the canal, a side canal with house colours lying in it, the lagoon, a wake)
  ['canal', 'side', 'lagoon'].forEach((kind, i) => { const [x, z] = cell(i); const s = kind === 'side' ? tintedSheet(1.3, 1.3, kind, [C.ochre, C.salmon, C.red]) : waterSheet(1.3, 1.3, kind); s.position.set(x, 0.02, z); g.add(s); });
  { const [x, z] = cell(3); const s = waterSheet(1.3, 1.3, 'canal'); s.position.set(x, 0.02, z); g.add(s); const w = wake({ len: 1.1, spread: 0.3 }); w.position.set(x + 0.55, 0.02, z); g.add(w); g.userData.wake = w; }
  const k = kits('wall', 'stone', 'roof', 'plain', 'shiny', 'metal', 'gold', 'glass', 'clear', 'glow', 'velvet');
  const list = [ // [material, colour, shape]
    ['wall', C.ochre], ['wall', C.terracotta], ['stone', C.stone], ['stone', 0xe8e2d6, 'slab'], ['stone', C.paving, 'slab'], ['wall', C.brick], ['roof', C.roof, 'roof'], ['roof', C.copper, 'dome'],
    ['gold', C.gold, 'ball'], ['gold', C.gold, 'mosaic'], ['wall', 0xf2c8c0, 'diamond'], ['plain', C.shutter, 'shutter'], ['shiny', C.gondola], ['shiny', C.varnish], ['plain', C.poleBlue, 'pole'], ['plain', 0x5a4a3a, 'post'],
    ['wall', C.sage, 'weed'], ['clear', 0x6fd0c8, 'ball'], ['plain', 0xf4efe4, 'cloth'], ['velvet', 0xa8202c], ['metal', 0x2f3445, 'rail'], ['plain', C.geranium, 'flowers'], ['plain', C.leaf, 'ivy'], ['gold', 0xfbfaf6, 'mask'],
    ['plain', 0xf6c6d6, 'gelato'], ['glow', 0xff7a2a, 'ball'], ['stone', 0xd8cfbf, 'edge'],
  ];
  list.forEach(([m, col, sh = 'box'], j) => {
    const [x, z] = cell(j + 4), K = k[m];
    if (sh === 'box') K.box(0.9, 0.9, 0.9, col, x, 0.45, z, { r: 0.15 });
    else if (sh === 'slab') K.box(1.2, 0.08, 1.2, col, x, 0.04, z, { r: 0.02 });
    else if (sh === 'roof') K.add(G.cone, col, x, 0.35, z, { s: [0.75, 0.7, 0.75], ry: Math.PI / 4 });
    else if (sh === 'dome') K.add(G.half, col, x, 0, z, { s: 0.55 });
    else if (sh === 'ball') K.ball(0.4, col, x, 0.4, z);
    else if (sh === 'mosaic') { for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) (a + b) % 3 ? K.box(0.13, 0.13, 0.13, (a * b) % 4 ? col : 0x2f55c4, x - 0.35 + a * 0.14, 0.07 + b * 0.14, z, { r: 0.02 }) : null; }
    else if (sh === 'diamond') { k.wall.box(0.9, 0.9, 0.3, col, x, 0.45, z, { r: 0.05 }); for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) k.stone.box(0.1, 0.1, 0.02, C.white, x - 0.3 + a * 0.2 + (b % 2) * 0.1, 0.15 + b * 0.2, z + 0.16, { r: 0.01, rz: Math.PI / 4 }); }
    else if (sh === 'shutter') { for (let a = 0; a < 6; a++) K.box(0.6, 0.09, 0.05, col, x, 0.2 + a * 0.12, z, { r: 0.01, rx: 0.3 }); K.box(0.66, 0.8, 0.03, 0x2f5a44, x, 0.5, z - 0.04, { r: 0.01 }); }
    else if (sh === 'pole') pole(k, x, z, col, 1.0);
    else if (sh === 'post') { K.add(G.cyl8, col, x, 0.5, z, { s: [0.12, 1.0, 0.12] }); K.add(G.cyl8, 0x2f4a36, x, 0.12, z, { s: [0.125, 0.25, 0.125] }); }
    else if (sh === 'weed') k.wall.box(0.9, 0.9, 0.9, col, x, 0.0, z, { r: 0.12 });
    else if (sh === 'cloth') { for (let a = 0; a < 3; a++) K.box(0.25, 0.4, 0.02, [col, 0x6fb0e0, 0xf08ac0][a], x - 0.3 + a * 0.3, 0.6, z, { r: 0.01, rx: 0.15 * (a - 1) }); }
    else if (sh === 'rail') { for (let a = 0; a < 5; a++) K.add(G.cyl8, col, x - 0.4 + a * 0.2, 0.3, z, { s: [0.02, 0.6, 0.02] }); K.box(0.9, 0.04, 0.04, col, x, 0.6, z, { r: 0.01 }); }
    else if (sh === 'flowers') flowers(k, x, 0.1, z, 0.8);
    else if (sh === 'ivy') { k.wall.box(0.9, 0.9, 0.3, C.cream, x, 0.45, z - 0.2, { r: 0.05 }); for (let a = 0; a < 14; a++) K.ball(0.09, a % 3 ? col : 0x3f7a3a, x - 0.35 + (a * 0.37) % 0.7, 0.1 + (a * 0.23) % 0.8, z - 0.03); }
    else if (sh === 'mask') { K.add(G.ball, C.gold, x, 0.5, z, { s: [0.35, 0.26, 0.12] }); for (const s of [-1, 1]) k.plain.ball(0.06, 0x1e2433, x + s * 0.12, 0.53, z + 0.1); k.plain.add(G.cap, 0xd8383a, x + 0.2, 0.8, z, { s: [0.04, 0.2, 0.02], rz: -0.5 }); }
    else if (sh === 'gelato') [0xf6c6d6, 0xfff1b8, 0xb8e6c8, 0x8a5a3a].forEach((c, a) => K.add(G.half, c, x - 0.3 + (a % 2) * 0.6, 0.0, z - 0.25 + Math.floor(a / 2) * 0.5, { s: [0.28, 0.3, 0.22] }));
    else if (sh === 'edge') { K.box(1.2, 0.3, 1.2, C.paving, x, 0.15, z, { r: 0.04 }); K.box(1.24, 0.08, 0.2, col, x, 0.31, z + 0.5, { r: 0.03 }); }
  });
  g.add(group(k));
  return { obj: g, target: vec(0, 0.3, -0.3), radius: 7.5, update: (t) => g.userData.wake.userData.update(t) };
}
function streetCard(scene) { // a bit of the town: a canal between two rows of houses, a bridge, gondolas, a café, pigeons
  const g = new THREE.Group(); scene.add(g);
  const W = 14, cw = 2.6;
  g.add(tintedSheet(W, cw + 0.4, 'side', [C.ochre, C.salmon, C.red, C.cream, C.terracotta, C.sage]));
  const order = ['palazzo', 'narrow', 'medium', 'corner', 'narrow'];
  let x = -W / 2 + 0.2;
  order.forEach((kind, i) => { const h = house(kind, { col: WALLS[(i * 2) % 6], seed: i + 3 }); x += h.userData.w / 2; h.position.set(x, -0.25, -cw / 2 - h.userData.d / 2); g.add(h); x += h.userData.w / 2 + 0.05; });
  const k = kits('stone'); k.stone.box(W, LAND + 0.3, 3.0, C.paving, 0, (LAND - 0.3) / 2, cw / 2 + 1.5, { r: 0.04 }); k.stone.box(W, 0.08, 0.2, C.stone, 0, LAND, cw / 2 + 0.05, { r: 0.03 }); g.add(group(k));
  const b = stoneBridge(cw, 1.1); b.rotation.y = Math.PI / 2; b.position.set(2.5, 0, 0); g.add(b);
  const gd = gondola({ passengers: 2 }); gd.position.set(-2.5, 0, 0.2); g.add(gd);
  const gs = gondola({ serenade: true }); gs.position.set(4.6, 0, -0.3); gs.rotation.y = Math.PI; g.add(gs);
  for (const [px, pz] of [[-3.5, 2.6], [-1.6, 2.5]]) { const t = cafeTable(); t.position.set(px, LAND, pz); g.add(t); }
  const pg = pigeons(14, { r: 1.0, every: 7 }); pg.position.set(1.0, LAND, 2.6); g.add(pg);
  const tour = ROLES.tourists(); tour.slice(0, 3).forEach((p, i) => { p.position.set(4.5 + i * 0.6, LAND, 2.0 + (i % 2) * 0.5); p.rotation.y = -Math.PI / 2; g.add(p); });
  const ms = movers(g);
  return { obj: g, target: vec(0, 1.2, 0), radius: 7.6, update: (t) => ms.forEach((o) => o.userData.update(t)) };
}

const C_ = (group, name, en, note, build, opts = {}) => ({ group, name, en, note, build, ...opts });
const ITEMS = [
  C_('sample', '町の一角（見本）', 'A corner of the town', ['細い運河の両岸：館が5軒、石の橋、ゴンドラ（客とセレナーデ）、岸のカフェ、鳩、観光客 · 水に館の色が映る', 'A side canal: five houses, a stone bridge, gondolas (passengers and a serenade), a café on the quay, pigeons, visitors · the houses’ colours lie in the water'], streetCard, { wide: true, view: [0.35, 0.55, 1], fill: 0.8 }),
  C_('material', '素材 31 種', '31 materials', ['1段目：大運河の水・細い運河（館の色が映る）・ラグーン・引き波・漆喰（黄土）・漆喰（テラコッタ、はげてれんが）・白い石・大理石 / 2段目：石畳・赤れんが・瓦・緑青の銅・金・モザイク・ひし形の壁・よろい戸 / 3段目：ゴンドラの漆・ニスの木・縞の杭・古い杭・水際の藻・ムラーノのガラス・布・赤いビロード / 4段目：鉄・ゼラニウム・つた・仮面・ジェラート・窯の火・台の縁', 'Row 1: Grand Canal water, side canal (with houses mirrored), lagoon, wake, ochre plaster, terracotta plaster (flaking to brick), white stone, marble / row 2: paving, red brick, roof tiles, copper, gold, mosaic, diamond wall, shutters / row 3: gondola lacquer, varnish, striped pole, old post, weed at the waterline, Murano glass, cloth, red velvet / row 4: iron, geraniums, ivy, masks, gelato, the furnace, the board’s edge'], materialsCard, { wide: true, view: [0, 0.9, 1], fill: 0.62 }),
  C_('house', '大きな館（パラッツォ）', 'Palazzo', ['4階 · 水の玄関と石段 · 2階と3階の大広間に尖りアーチの5連窓とバルコニー · よろい戸 · じょうご煙突 3 本 · 水際に藻', 'Four storeys · a water door and steps · five pointed lights on balconies on the two hall floors · shutters · three funnel chimneys · weed at the waterline'], show(() => house('palazzo', { col: C.salmon, seed: 1 }), { water: 'canal', sink: 0.25 }), { view: [0.45, 0.3, 1] }),
  C_('house', '中くらいの館・細い家', 'Medium house, narrow house', ['3連のアーチ窓とバルコニー、花箱、屋根のテラス · 細い家：よろい戸の窓が縦に並ぶ', 'Three arched lights and a balcony, window boxes, a roof terrace · the narrow one: shuttered windows stacked up'], show(() => [house('medium', { col: C.ochre, seed: 2 }), house('narrow', { col: C.red, seed: 3 })], { spacing: 2.0, water: 'canal', sink: 0.25 }), { view: [0.4, 0.3, 1] }),
  C_('house', '角の家・倉庫', 'Corner shop, warehouse', ['下が店：窓、緑と白の日よけ · 倉庫：大きな水の扉、高い小窓、滑車の梁、切妻の屋根', 'A shop below: a window, a green-and-white awning · the warehouse: a wide water door, little high windows, a beam with a pulley, a gable roof'], show(() => [house('corner', { col: C.cream, seed: 4 }), house('warehouse', { col: C.terracotta, seed: 5 })], { spacing: 2.6, water: 'canal', sink: 0.25 }), { view: [0.4, 0.3, 1] }),
  C_('house', '壁の色 6 種', 'Six wall colours', ['黄土・テラコッタ・サーモン・くすんだ赤・クリーム・淡い緑 · 隣に同じ色を並べない', 'Ochre, terracotta, salmon, faded red, cream, pale green · never the same colour side by side'], show(() => WALLS.map((col, i) => house('narrow', { col, seed: 10 + i, sides: false })), { spacing: 1.3, water: 'side', sink: 0.25 }), { wide: true, view: [0.1, 0.25, 1], fill: 0.8 }),
  C_('house', '窓・バルコニー・煙突・水の玄関', 'Windows, balcony, chimneys, water door', ['尖りアーチ窓と丸アーチ窓（白い石の縁）· よろい戸の窓 · バルコニー · じょうご煙突 3 種 · 花箱 · 水の玄関と石段 · 縞の杭', 'Pointed and round arched windows (white stone frames) · a shuttered window · a balcony · three funnel chimneys · a window box · a water door and steps · striped poles'], show(() => { const k = kits('wall', 'stone', 'plain', 'glass', 'gold', 'roof'); k.wall.box(5.4, 2.2, 0.4, C.ochre, 0, 1.1, -0.2, { r: 0.04 }); archWin(k, -2.1, 1.1, 0.01, 0.3, 0.6); archWin(k, -1.5, 1.1, 0.01, 0.3, 0.55, { pointed: false }); shutterWin(k, -0.8, 1.1, 0.01, 0.32, 0.42); balcony(k, 0.3, 1.0, 0.01, 1.0); for (let i = 0; i < 3; i++) archWin(k, (i - 1) * 0.3 + 0.3, 1.05, 0.01, 0.22, 0.5, { sill: false }); flowers(k, 1.6, 1.1, 0.05, 0.5); waterDoor(k, 2.0, 0.01, 0.5, 0.7); [0, 1, 2].forEach((c) => chimney(k, -1.6 + c * 1.6, 2.2, -0.2, c, C.ochre)); pole(k, 2.6, 0.5, C.poleBlue, 1.3); pole(k, 2.9, 0.5, C.poleRed, 1.3); return group(k); }, { water: 'canal', sink: 0.25 }), { view: [0.2, 0.25, 1], fill: 0.85 }),
  C_('landmark', '鐘楼', 'Bell tower', ['赤れんがの高い塔に白い縦の筋 · 白い鐘の階のアーチと金の鐘 · れんがの段 · 緑青の尖り屋根 · てっぺんに金の天使（形だけ）· 台でいちばん高い', 'A tall red-brick tower with pale strips · a white belfry of arches, a gold bell · a brick attic · a green copper spire · a gold angel on top (just its shape) · the tallest thing on the board'], show(() => campanile(), { groundD: 3 }), { view: [0.4, 0.3, 1], fill: 0.9 }),
  C_('landmark', 'ドームの聖堂', 'Domed church', ['白い石 · 緑青のドーム 5 つと金の頂 · 正面に5つのアーチの扉、上に金のモザイク · 屋根の線に小さな尖りの破風', 'White stone · five green copper domes with gold finials · five arched doors with gold mosaic above · little pointed gables along the roofline'], show(() => basilica(), { groundD: 5 }), { view: [0.45, 0.4, 1] }),
  C_('landmark', '総督の館のような建物・回廊', 'Palace, arcade', ['1階は尖りアーチの回廊、2階は細かいアーチのロッジア、上の壁は桃色と白のひし形、屋根に白いレースの飾り · 広場を囲む回廊（下にカフェ）', 'An arcade of pointed arches, a loggia of little arches, a wall of pink and white diamonds, a white lace crest · the long arcade round the square (a café under it)'], show(() => { const a = palace(), b = arcade(4.5); b.position.set(0, 0, -3.2); return [a, b]; }, { groundD: 7 }), { wide: true, view: [0.35, 0.35, 1], fill: 0.85 }),
  C_('landmark', '2本の柱', 'The two columns', ['水辺の高い2本の柱 · 一方に翼のある獅子、一方に人の像（形だけ）', 'Two tall columns at the water’s edge · a winged lion on one, a figure on the other (just shapes)'], show(() => columns(), { groundD: 3 }), { view: [0.3, 0.3, 1] }),
  C_('bridge', '大きな石の橋（店つき）', 'Great stone bridge', ['大運河にかかる1つの大きなアーチ · 上に店が2列、赤い瓦、まん中にアーチの門 · 白い欄干', 'A single great arch over the Grand Canal · two rows of shops on it under red roofs, an arched portico in the middle · white balustrades'], show(() => bigBridge(), { water: 'canal', groundD: 5 }), { wide: true, view: [0.5, 0.35, 1], fill: 0.85 }),
  C_('bridge', '石の太鼓橋・木の橋', 'Stone bridge, wooden bridge', ['白い縁の小さな石の橋、低い段、鉄の手すり · 広い運河の木のアーチ橋（梁と手すり）', 'A little humped stone bridge with white edges, low steps, iron rails · a wide wooden arch bridge with beams and railings'], show(() => { const a = stoneBridge(2.2), b = woodBridge(4.4); a.position.set(-4.2, 0, 0); b.position.set(2.2, 0, 0); return [a, b]; }, { water: 'canal', groundD: 4 }), { wide: true, view: [0.4, 0.35, 1] }),
  C_('bridge', '屋根つきの橋', 'Covered bridge', ['細い運河の上、2つの壁をつなぐ白い渡り廊下 · 格子の小窓', 'A white covered walkway between two walls over a narrow canal · little barred windows'], show(() => sighsBridge(), { water: 'side', groundD: 3 }), { view: [0.3, 0.2, 1] }),
  C_('boat', 'ゴンドラ', 'Gondolas', ['黒く長い舟、両端が反り上がる · へさきに銀の櫛、赤いビロードの座席 · 縞のシャツと麦わら帽の船頭がこぐ · 客あり／セレナーデ（歌とアコーディオン、音符が浮かぶ）', 'Long and black, rising at both ends · a silver comb on the bow, a red velvet seat · a gondolier in a striped shirt and boater rowing · with passengers / a serenade (a singer, an accordion, notes floating up)'], boatCard(() => [gondola({ passengers: 2 }), gondola({ serenade: true })], { speed: 0.6, gap: 4.5, len: 9 }), { view: [0.35, 0.4, 1] }),
  C_('boat', '水上バス・水上タクシー', 'Water bus, water taxi', ['白に黄色の帯、屋根の客室に人がぎっしり、操舵室 · ニス塗りの木の高速艇、白い屋根、引き波を立てる', 'White with a yellow band, a cabin full of people, a wheelhouse · a varnished wooden launch with a white roof, throwing a wake'], boatCard(() => [vaporetto(), waterTaxi()], { speed: 1.0, gap: 6, len: 12 }), { view: [0.35, 0.4, 1] }),
  C_('boat', '荷舟・渡し舟・救急艇・小舟', 'Work boat, ferry, ambulance, motor boat', ['果物の木箱とガスボンベ、小さなクレーン · 立って乗る渡し舟 · 白に橙の帯、青い灯の救急艇 · 住民の小さなモーターボート', 'Crates of fruit, gas bottles, a little crane · a ferry gondola people stand in · the ambulance boat, white with an orange band and a blue light · a resident’s little boat'], boatCard(() => [workBoat(), gondola({ ferry: true }), ambulance(), motorBoat()], { speed: 0.9, gap: 3.6, len: 14.4 }), { wide: true, view: [0.25, 0.45, 1], fill: 0.85 }),
  C_('water', '杭の束・船着き場・ゴンドラの桟橋', 'Posts, pontoon, gondola pier', ['ラグーンの水路を示す3本束ねた古い杭 · 水上バスの浮き桟橋（黄色い縁、屋根）· 青い縞の杭の並ぶゴンドラの桟橋', 'Three old posts lashed together, marking the channel · the water-bus pontoon (a yellow edge, a shelter) · a gondola pier with blue-striped poles'], show(() => { const a = bricola(), b = pontoon(), c = gondolaPier(3); a.position.set(-3.2, 0, 0); c.position.set(3.0, 0, 0); return [a, b, c]; }, { water: 'lagoon', groundD: 5 }), { wide: true, view: [0.3, 0.45, 1] }),
  C_('prop', '井戸・ランタン・道しるべ・ポスト', 'Wellhead, lantern, signpost, post box', ['八角の石の井戸 · 壁の腕の鉄のランタン（灯る）と柱のランタン · 黄色い矢印の道しるべ（文字なし）· 赤いポスト', 'An octagonal stone wellhead · an iron lantern on a wall bracket (lit) and one on a post · a yellow arrow sign (no words) · a red post box'], show(() => [wellhead(), lantern(false), signpost(), postBox()], { spacing: 1.3 }), { view: [0.3, 0.35, 1] }),
  C_('prop', 'カフェ・楽団の台', 'Café, bandstand', ['丸いテーブルと椅子、クリームの日よけ傘 · 赤と白の日よけの小さな台、ピアノと譜面台', 'Round tables and chairs under cream umbrellas · a little stage under a red-and-white awning, a piano and music stands'], show(() => { const a = cafeTable(), b = cafeTable(0xa8202c), c = bandstand(); a.position.set(-2, 0, 0.3); b.position.set(-1.1, 0, -0.3); c.position.set(1, 0, 0); return [a, b, c]; }), { view: [0.3, 0.4, 1] }),
  C_('prop', '市場・仮面・ジェラート・ガラスの窯', 'Market, masks, gelato, furnace', ['白い天幕の果物の屋台と魚の屋台（氷の上）· 仮面の飾り棚 · パステルのジェラートのケース · ガラス職人のれんがの窯（口が赤く光る）', 'A fruit stall and a fish stall (on ice) under white awnings · a rack of masks · a case of pastel gelato · the glassblower’s brick furnace with its glowing mouth'], show(() => [marketStall('fruit'), marketStall('fish'), maskStand(), gelato(), furnace()], { spacing: 1.7 }), { wide: true, view: [0.2, 0.35, 1], fill: 0.85 }),
  C_('prop', '洗濯物・荷車・ベンチ・植木鉢', 'Washing, handcart, bench, planters', ['路地の上のひもに洗濯物が揺れる · 段を上り下りする荷車 · 木のベンチ · ゼラニウムの植木鉢', 'Washing swaying on a line over an alley · a handcart for the bridge steps · a wooden bench · pots of geraniums'], show(() => { const w = washing(2.0, 1.4), a = handcart(), b = bench(), c = planters(); a.position.set(-1.6, 0, 0.8); b.position.set(0, 0, 0.8); c.position.set(1.5, 0, 0.8); return [w, a, b, c]; }), { view: [0.25, 0.35, 1] }),
  C_('people', '観光客', 'Visitors', ['麦わら帽、キャップ、パナマ帽 · カメラ、地図、リュック、かばん · ワンピース · 6 人', 'Straw hats, caps, panamas · cameras, a map, a backpack, a bag · sundresses · six of them'], show(() => ROLES.tourists(), { spacing: 0.7 }), { view: [0.15, 0.25, 1], fill: 0.7 }),
  C_('people', '船頭・歌い手・アコーディオン', 'Gondoliers, singer, accordion', ['紅白と紺白の縞のシャツ、リボンの麦わら帽、櫂をこぐ · 赤い蝶ネクタイの歌い手 · アコーディオン弾き', 'Red-and-white and navy-and-white striped shirts, beribboned boaters, rowing · a singer with a red bow tie · an accordion player'], show(() => ROLES.boat(), { spacing: 0.9 }), { view: [0.15, 0.25, 1], fill: 0.7 }),
  C_('people', 'カフェ・働く人', 'Café and workers', ['盆を持つ給仕 · バイオリン弾き · ピアノ弾き · 市場の人（前掛け）· ガラス職人（竿の先の光る玉）· 画家（イーゼルに運河の絵）', 'A waiter with a tray · a violinist · a pianist · a market seller in an apron · a glassblower (a glowing gather on his pipe) · a painter (a canal on the easel)'], show(() => [...ROLES.cafe(), ...ROLES.workers()], { spacing: 0.85 }), { wide: true, view: [0.15, 0.25, 1], fill: 0.65 }),
  C_('people', '住民・仮面の人・カップル', 'Locals, masks, couple', ['ボールの子ども · 買い物袋のおばあさん · 犬の散歩 · 仮面の人 3 人（白・金・黒の仮面、マント、羽根）· 手をつないだ2人', 'A child with a ball · a grandmother with her shopping · a man walking his dog · three masked figures (white, gold, black masks, cloaks, feathers) · a couple hand in hand'], show(() => [...ROLES.locals(), ...ROLES.masks(), ROLES.couple()], { spacing: 0.85 }), { wide: true, view: [0.15, 0.25, 1], fill: 0.65 }),
  C_('animal', '鳩・カモメ・猫・犬', 'Pigeons, gull, cat, dog', ['広場の鳩の群れ：歩いてつつき、ときどき一斉に飛び立って旋回し、また降りる · 旋回するカモメ · 段の上で眠る猫 · 犬', 'A flock of pigeons: walking and pecking, now and then all taking off together, wheeling round and settling · a gull circling · a cat asleep on a step · a dog'], show(() => { const p = pigeons(24, { r: 1.4, every: 6 }), g = gull(), c = cat(), d = dog(); c.position.set(2.6, 0, 0.6); d.position.set(2.6, 0, -0.5); g.position.set(0, 0, 0); return [p, g, c, d]; }, { groundD: 5 }), { view: [0.25, 0.5, 1], fill: 0.5 }),
];
const GROUPS = [['all', ['すべて', 'All']], ['sample', ['見本', 'Sample']], ['material', ['素材', 'Materials']], ['house', ['館', 'Houses']], ['landmark', ['名所', 'Landmarks']], ['bridge', ['橋', 'Bridges']], ['boat', ['舟', 'Boats']], ['water', ['水辺', 'Waterside']], ['prop', ['小物', 'Props']], ['people', ['人', 'People']], ['animal', ['動物', 'Animals']]];

// ---------- page ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
const grid = document.getElementById('grid'), tabs = document.getElementById('tabs');
const tabLabel = (id, name) => `${L(name)} ${id === 'all' ? ITEMS.length : ITEMS.filter((i) => i.group === id).length}`;
for (const [id, name] of GROUPS) { const b = document.createElement('button'); b.textContent = tabLabel(id, name); b.dataset.tab = id; b.onclick = () => showTab(id); tabs.appendChild(b); }
const meta = (el, item) => { const [a, b] = L([[item.name, item.en], [item.en, item.name]]); el.innerHTML = `<b>${a}</b> <span>${b}</span><small>${L(item.note)}</small>`; };
const cards = ITEMS.map((item) => {
  const card = document.createElement('div'); card.className = 'card' + (item.wide ? ' wide' : '');
  card.innerHTML = '<div class="view"></div><div class="meta"></div>'; meta(card.querySelector('.meta'), item); grid.appendChild(card);
  const c = { item, card, view: card.querySelector('.view'), st: null }; card.onclick = () => openDetail(c); return c;
});
const ready = (c) => (c.st ??= (() => { const st = stage(c.item.build, c.item); st.scene.background = BG; return st; })());
function showTab(id) { cards.forEach((c) => (c.card.style.display = id === 'all' || c.item.group === id ? '' : 'none')); [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.tab === id)); }
showTab('all');
const detailEl = document.getElementById('detail'), detailView = document.getElementById('detailView');
let detail = null, detailCam = null, controls = null;
function openDetail(c) { const st = ready(c); detail = c; detailCam = st.camera.clone(); controls = new OrbitControls(detailCam, detailView); controls.target.copy(st.target); controls.enableDamping = true; detailText(); detailEl.classList.add('open'); }
function detailText() { if (!detail) return; document.getElementById('dName').textContent = L([`${detail.item.name} · ${detail.item.en}`, `${detail.item.en} · ${detail.item.name}`]); document.getElementById('dNote').textContent = L(detail.item.note); }
onLang(() => { for (const b of tabs.children) b.textContent = tabLabel(b.dataset.tab, GROUPS.find(([id]) => id === b.dataset.tab)[1]); for (const c of cards) meta(c.card.querySelector('.meta'), c.item); detailText(); });
function closeDetail() { if (!detail) return; controls.dispose(); detail = null; detailEl.classList.remove('open'); }
document.getElementById('close').onclick = closeDetail;
addEventListener('keydown', (e) => e.key === 'Escape' && closeDetail());
const resize = () => renderer.setSize(innerWidth, innerHeight, false);
addEventListener('resize', resize); resize();
const timer = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(timer.getDelta(), 0.05), t = timer.elapsedTime; clock.uTime.value = t;
  const H = canvas.clientHeight;
  renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
  const jobs = detail ? [[detail, detailView, true]] : cards.map((c) => [c, c.view, false]);
  for (const [c, view, inDetail] of jobs) {
    const r = view.getBoundingClientRect();
    if (r.bottom < -300 || r.top > H + 300 || r.width === 0) continue;
    const st = ready(c); if (r.bottom < 0 || r.top > H) continue;
    const cam = inDetail ? detailCam : st.camera;
    st.update(t, dt, inDetail); if (inDetail) controls.update();
    cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height); renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(st.scene, cam);
  }
});

// debug: a contact sheet of cards at a fixed size, posted to the film server (the extra renderer is disposed)
window.__venice = {
  cards, ready,
  async sheet(ids, { cols = 2, W = 600, Hh = 400, advance = 1, post = null } = {}) {
    const rows = Math.ceil(ids.length / cols), cv = document.createElement('canvas'); cv.width = W * cols; cv.height = Hh * rows;
    const ctx = cv.getContext('2d'); ctx.font = '18px sans-serif';
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, Hh, false); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.95;
    ids.forEach((i, n) => { const st = ready(cards[i]); for (let k = 0; k < advance * 30; k++) { clock.uTime.value += 1 / 30; st.update(clock.uTime.value, 1 / 30, true); } const cam = st.camera.clone(); cam.aspect = W / Hh; cam.updateProjectionMatrix(); r.render(st.scene, cam); ctx.drawImage(r.domElement, (n % cols) * W, Math.floor(n / cols) * Hh); ctx.fillStyle = '#000'; ctx.fillText(i + ' ' + cards[i].item.name, (n % cols) * W + 6, Math.floor(n / cols) * Hh + 20); });
    r.dispose(); r.forceContextLoss();
    if (post) { const b = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.88)); await fetch(post, { method: 'POST', body: b }); }
    return 'ok';
  },
};

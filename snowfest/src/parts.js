// Snow festival parts catalogue (snowfest/DESIGN.md §2, §5): every material and part, card by card, before the town is put
// together. One renderer for the page, one small scene per card (built when it comes near), drawn with scissor viewports
// like Koto's catalogue. A winter sun low in the south, a sky-blue fill, snow underfoot.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { clock, IKit, MAT, G, C, kits, group } from './kit.js';
import { snowCastle, owl, whale, foxes, squirrel, snowmen, little, LITTLE, iceSculpture, ICE_KINDS, iceSlide, iceWall, icicles } from './sculpt.js';
import { clockTower, brickHall, building, neonBuilding, izakaya, hotel, tvTower } from './build.js';
import { stall, STALLS, steam } from './stalls.js';
import { streetLamp, signal, busStop, vending, bench, fence, nobori, signboard, lightTree, conifer, acUnit, postBox, snowBank } from './street.js';
import { tram, sasara, plough, rotary, car, bus } from './ride.js';
import { ROLES, ezoSquirrel, crow, sparrows } from './people.js';
import { snowfall } from './weather.js';

const BG = new THREE.Color('#e4eef8');
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

// a slab of snow to stand things on (a few soft lumps round its edge)
function ground(scene, w, d, { road = false } = {}) {
  const k = new IKit();
  k.box(w, 0.3, d, C.snow, 0, -0.15, 0, { r: 0.12, seg: 2 });
  const m = k.mesh(MAT.snow, { cast: false }); scene.add(m);
  if (road) { const r = new IKit(); r.box(w, 0.02, 1.4, C.road, 0, 0.005, 0, { r: 0 }); for (let i = 0; i < 8; i++) r.box(0.4, 0.01, 0.08, 0xdfe6ef, -w / 2 + (i + 0.5) * w / 8, 0.02, 0, { r: 0 }); const rm = r.mesh(MAT.shiny, { cast: false }); scene.add(rm); }
  return m;
}
function stage(build, { view = [1, 0.6, 1.1], fill = 0.95 } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#d6e6ff', '#9fb2d6', 1.35));
  const sun = new THREE.DirectionalLight('#fff4e6', 2.4); sun.position.set(-8, 10, 14); scene.add(sun); // (a low winter sun from the south)
  const built = build(scene);
  const sphere = new THREE.Box3().setFromObject(built.obj).getBoundingSphere(new THREE.Sphere());
  const target = built.target ?? sphere.center, radius = built.radius ?? sphere.radius;
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.05, 400);
  camera.position.copy(vec(...view).normalize().multiplyScalar((radius / Math.sin(THREE.MathUtils.degToRad(15))) * fill)).add(target);
  camera.lookAt(target);
  return { scene, camera, target, update: built.update ?? (() => {}), obj: built.obj };
}
// a few things side by side on snow, turning slowly unless still
function show(make, { spin = false, spacing = 0, groundW, groundD = 4, road = false } = {}) {
  return (scene) => {
    const made = [].concat(make()), pivot = new THREE.Group();
    made.forEach((o, i) => { if (spacing) o.position.x += (i - (made.length - 1) / 2) * spacing; pivot.add(o); });
    scene.add(pivot);
    const box = new THREE.Box3().setFromObject(pivot), size = box.getSize(vec(0, 0, 0));
    const gr = ground(scene, groundW ?? size.x + 2, Math.max(groundD, size.z + 1.5), { road }); gr.position.x = (box.min.x + box.max.x) / 2;
    const moving = []; pivot.traverse((o) => { if (o.userData.update) moving.push(o); });
    return { obj: pivot, update: (t, dt, still) => { if (spin && !still) pivot.rotation.y += dt * 0.2; moving.forEach((o) => o.userData.update(t, dt)); } };
  };
}
// vehicles driving across a strip of road, looping
function rideCard(make, { speed = 1.5, gap = 4.5, len = 14 } = {}) {
  return (scene) => {
    ground(scene, len, 4, { road: true });
    const vs = [].concat(make()), g = new THREE.Group(); vs.forEach((v) => g.add(v)); scene.add(g);
    return { obj: g, radius: len * 0.38, target: vec(0, 0.8, 0), update: (t) => vs.forEach((v, i) => { v.position.x = ((t * speed + i * gap) % len) - len / 2; v.userData.update?.(t); }) };
  };
}

// the materials: one rounded block per material, in the order of DESIGN.md §2
function materialsCard(scene) {
  const g = new THREE.Group(); scene.add(g); ground(scene, 16, 7.5);
  const cell = (i, kitName, color, shape = 'box') => { const k = new IKit(), x = (i % 10) * 1.5 - 6.75, z = Math.floor(i / 10) * 2.1 - 2.1;
    if (shape === 'box') k.box(0.9, 0.9, 0.9, color, x, 0.45, z, { r: 0.18 }); else if (shape === 'ball') k.ball(0.5, color, x, 0.5, z); else if (shape === 'cone') k.add(G.cone, color, x, 0.6, z, { s: [0.25, 1.2, 0.25], rx: Math.PI }); else if (shape === 'slab') k.box(1.1, 0.08, 1.1, color, x, 0.04, z, { r: 0.02 }); else k.add(G.cone, color, x, 0.6, z, { s: [0.5, 1.2, 0.5] });
    const m = k.mesh(MAT[kitName]); m.castShadow = !kitName.startsWith('ice'); g.add(m); return m; };
  const list = [['snow', C.snow, 'ball'], ['snow', C.packed, 'slab'], ['snow', 0xf2f6fc, 'box'], ['snow', 0xc9d0dc, 'box'], ['ice', C.ice, 'box'], ['iceBlue', 0x8fd6ff, 'box'], ['ice', 0xe8f6ff, 'cone'], ['glass', 0xdfe9f4, 'box'], ['shiny', 0x8a8f9c, 'slab'], ['shiny', C.road, 'slab'],
    ['toy', C.brick, 'box'], ['toy', 0xf4efe4, 'box'], ['toy', C.copper, 'box'], ['metal', C.tower, 'box'], ['toy', C.concrete, 'box'], ['glass', C.glass, 'box'], ['glow', C.neonPink, 'box'], ['glow', 0xffe0a0, 'ball'], ['glow', 0xff6a4a, 'ball'], ['toy', C.white, 'box'],
    ['toy', C.wood, 'box'], [null], [null], [null], ['toy', C.coats[0], 'ball'], ['shiny', 0xe8483f, 'box'], ['toy', C.plow, 'box'], ['toy', C.conifer, 'tree'], ['toy', 0xecd9b8, 'box'], ['icePink', 0xffc4e4, 'box']];
  list.forEach(([k, col, sh], i) => { if (k) cell(i, k, col, sh); });
  const st = steam({ n: 6, h: 1.4, size: 0.4 }); st.position.set(1.5 * 1 - 6.75, 0.2, 2.1 * 2 - 2.1); g.add(st); // 22: steam
  const sf = snowfall({ w: 1.2, d: 1.2, h: 1.6, n: 120, size: 0.06 }); sf.position.set(1.5 * 2 - 6.75, 0, 2.1); g.add(sf); // 23: falling snow
  return { obj: g, target: vec(0, 0.4, 0), radius: 7.5, update: (t) => st.userData.update(t) };
}
function sampleCard(scene) { // a corner of the town: the castle, stalls, a lamp, a fir, people, snow falling
  const g = new THREE.Group(); scene.add(g); ground(scene, 22, 14, { road: false });
  const castle = snowCastle(); castle.position.set(-3, 0, -2.5); g.add(castle);
  STALLS.slice(0, 3).forEach((k, i) => { const s = stall(k); s.position.set(3 + i * 2.1, 0, 2.5); s.rotation.y = -0.2; g.add(s); });
  const lamp = streetLamp(); lamp.position.set(1.2, 0, 3.6); g.add(lamp);
  for (const [x, z] of [[6, -3], [7.5, -2], [8.6, -3.6]]) { const c = conifer(2.4 + (x % 2) * 0.6); c.position.set(x, 0, z); g.add(c); }
  const o = owl(); o.position.set(4.5, 0, -2.2); o.scale.setScalar(0.8); g.add(o);
  ROLES.tourists().slice(0, 4).forEach((p, i) => { p.position.set(-1 + i * 1.1, 0, 3.4 + (i % 2) * 0.6); p.rotation.y = Math.PI; g.add(p); });
  g.add(snowfall({ w: 22, d: 14, h: 10, n: 1200 }));
  const moving = []; g.traverse((o) => o.userData.update && moving.push(o));
  return { obj: g, target: vec(1, 1.8, 0), radius: 10, update: (t) => moving.forEach((o) => o.userData.update(t)) };
}

const C_ = (group, name, en, note, build, opts = {}) => ({ group, name, en, note, build, ...opts });
const ITEMS = [
  C_('sample', '町の一角（見本）', 'A corner of the town', ['雪の城、屋台、街灯、モミ、シマフクロウ、観光客、舞う雪 · 部品を並べたときの調子を見る', 'The castle, stalls, a lamp, firs, the owl, visitors and falling snow · how the parts look together'], sampleCard, { wide: true, view: [0.55, 0.5, 1], fill: 0.85 }),
  C_('material', '素材 30 種', '30 materials', ['上段：新雪・踏み固めた雪・雪像の雪・除雪の山・透明な氷・色の氷・つらら・霜のガラス・シャーベット・濡れた道 / 中段：れんが・白い板・銅屋根・鉄骨・コンクリート・ガラス・ネオン・電球・ちょうちん・テント / 下段：木・（湯気・舞う雪・きらめき）・ダウン・プラスチック・重機の黄・針葉樹・台の木・桃色の氷 · 上を向いた面には雪がのる', 'Top: fresh snow, packed snow, sculpted snow, plough heap, clear ice, tinted ice, icicle, frosted glass, slush, wet road / middle: brick, white boards, copper, steelwork, concrete, glass, neon, bulbs, lanterns, tent canvas / bottom: wood, (steam, falling snow, sparkle), down, plastic, machine yellow, fir, the board, pink ice · snow settles on every face that looks up'], materialsCard, { wide: true, view: [0, 0.75, 1], fill: 0.8 }),
  C_('sculpture', '雪の城（大雪像）', 'The snow castle', ['天守と円い塔4本、とがった雪の屋根、アーチの門と窓は深く彫る、胸壁、ドーム、旗がはためく · 前にステージ、スピーカー、照明のトラス', 'A keep and four round towers with pointed snow roofs, a deep-cut arched gate and windows, battlements, a dome, flags flapping · a stage in front, speakers, a lighting truss'], show(() => snowCastle(), { groundD: 9 }), { view: [0.45, 0.35, 1], fill: 0.85 }),
  C_('sculpture', 'シマフクロウ', 'Fish owl', ['丸い体、耳の羽、彫った大きな目、胸の羽の線、雪の切り株', 'A round body, ear tufts, big carved eyes, lines of breast feathers, a stump of snow'], show(() => owl()), { view: [0.4, 0.3, 1] }),
  C_('sculpture', 'クジラ', 'Whale', ['雪の波から跳ねるクジラ、のどの溝、ひれ、尾びれ、雪の潮吹き', 'Leaping from a wave of snow: throat grooves, flippers, flukes, a spout of snow'], show(() => whale()), { view: [0.6, 0.3, 1] }),
  C_('sculpture', 'キタキツネの親子・エゾリス', 'Foxes and a squirrel', ['座るキツネと子ギツネ、しっぽを足に巻く · 木の実を持つエゾリス', 'A fox and her cub sitting, tails round their feet · an Ezo squirrel holding a nut'], show(() => { const a = foxes(), b = squirrel(); b.position.x = 2.3; return [a, b]; }), { view: [0.3, 0.3, 1] }),
  C_('sculpture', '雪だるまの家族', 'Snowman family', ['バケツとニット帽、マフラー、にんじんの鼻、炭の目とボタン、枝の腕', 'A bucket and knit hats, scarves, carrot noses, coal eyes and buttons, twig arms'], show(() => snowmen()), { view: [0.3, 0.25, 1] }),
  C_('sculpture', '小雪像 12 種', '12 little sculptures', ['市民雪像：雪だるま、ウサギ、ペンギン、カニ、だるま、家、車、クマ、アザラシ、ネコ、星、ハート · それぞれ雪の台と名札', "Citizens' sculptures: snowman, rabbit, penguin, crab, daruma, house, car, bear, seal, cat, star, heart · each on a block with a name board"], show(() => LITTLE.map((k, i) => { const o = little(k); o.position.set((i % 6) * 1.2 - 3, 0, Math.floor(i / 6) * 1.4 - 0.7); return o; })), { wide: true, view: [0, 0.45, 1], fill: 0.75 }),
  C_('ice', '氷像 4 種', 'Ice sculptures', ['魚・花・鳥・ハート · 透きとおって縁が光る、中に小さな泡 · 氷の台の前に色のライト', 'Fish, flower, bird, heart · clear with bright rims and little bubbles inside · a coloured light in front of each block'], show(() => ICE_KINDS.map((k, i) => iceSculpture(k, ['ice', 'iceBlue', 'icePink', 'ice'][i])), { spacing: 1.4 }), { view: [0.2, 0.3, 1], fill: 0.8 }),
  C_('ice', '氷の滑り台', 'Ice slide', ['雪の階段で上って、氷の坂を滑る · 両側の雪の土手、赤い手すり', 'Up the snow steps, down the ice · snow banks either side, red rails'], show(() => iceSlide()), { view: [0.8, 0.45, 0.6] }),
  C_('ice', '氷の壁・つらら', 'Ice wall, icicles', ['透明な氷のブロックを積んだ壁 · 軒先のつらら（真ん中ほど長い）', 'A wall of clear blocks · icicles along an eave, longest in the middle'], show(() => { const a = iceWall(), b = icicles(2.2); b.position.set(0, 1.8, 0.4); return [a, b]; }), { view: [0.2, 0.2, 1] }),
  C_('building', '時計台のような塔', 'Clock tower', ['白い板張りの2階、縦長の窓、赤い屋根、玄関の上の小さな時計塔（4面の時計）', 'Two storeys of white boards, tall windows, a red roof, a little tower with four clock faces over the porch'], show(() => clockTower(), { groundD: 5 }), { view: [0.5, 0.35, 1] }),
  C_('building', 'れんがの庁舎のような建物', 'Red-brick hall', ['赤れんがの段、白い窓枠、八角の塔と銅のドーム、銅の屋根', 'Courses of red brick, white window frames, an octagonal tower with a copper dome, a copper roof'], show(() => brickHall(), { groundD: 5 }), { view: [0.4, 0.35, 1] }),
  C_('building', '町のビル 3 種', 'Town buildings', ['ガラスの事務所（屋上の機械）・ベランダのマンション・帯の看板の店 · 窓の灯りはまちまち', 'A glass office (units on the roof), flats with balconies, a store with a lit sign band · the windows lit here and there'], show(() => [0, 1, 2].map((k) => building(k)), { spacing: 3.6 }), { view: [0.3, 0.3, 1], fill: 0.85 }),
  C_('building', 'ネオンのビル・飲み屋', 'Neon block, izakaya', ['縦の看板と色の管（昼なので弱く光る）· 小さな飲み屋：明るい格子戸、赤いのれん、赤ちょうちん、裏の室外機', 'Vertical signs and coloured tubes (faint by day) · a little bar: a lit lattice door, a red noren, red lanterns, an AC unit out back'], show(() => { const a = neonBuilding(), b = izakaya(); b.position.x = 2.4; return [a, b]; }), { view: [0.3, 0.3, 1] }),
  C_('building', 'ホテル', 'Hotel', ['淡い色の高い建物、玄関のひさし、旗', 'A tall pale block, a canopy over the door, flags'], show(() => hotel()), { view: [0.4, 0.3, 1] }),
  C_('building', 'テレビ塔のような鉄塔', 'Lattice tower', ['内へ傾く4本の脚、筋交い、白い輪、ガラスの展望台、緑の電光時計、てっぺんの赤い灯', 'Four legs leaning in, cross braces, white rings, a glass observation deck, a green electric clock, a red light on the mast'], show(() => tvTower(), { groundD: 5 }), { view: [0.4, 0.25, 1], fill: 0.85 }),
  C_('stall', '屋台 6 種', 'Six food stalls', ['共通：白い三角のテント、木のカウンター、裸電球の列、湯気 · ラーメン（赤いのれん）・じゃがバター（のぼり）・焼きとうもろこし（網と炭）・カニ汁（屋根の大きなカニ）・ホットワイン（紙コップ）・スープカレー', 'Shared: a white tent, a wooden counter, a string of bulbs, steam · ramen (red noren), jaga-butter (banner), grilled corn (grill and coals), crab soup (a big crab on the roof), hot wine (paper cups), soup curry'], show(() => STALLS.map((k) => stall(k)), { spacing: 2.3 }), { wide: true, view: [0.15, 0.3, 1], fill: 0.75 }),
  C_('street', '街灯・縦の信号・バス停', 'Lamp, signal, bus stop', ['雪の帽子の街灯 · 北海道の縦型信号（雪が積もらない）と歩行者信号 · ガラスのバス停', 'A lamp with a hat of snow · a vertical Hokkaido traffic light (so snow can’t settle) and a walk signal · a glass bus shelter'], show(() => [streetLamp(), signal(), busStop()], { spacing: 2.2 }), { view: [0.3, 0.3, 1] }),
  C_('street', '自販機・ベンチ・ポスト・室外機', 'Vending machine, bench, post box', ['光る自販機 · 雪に埋まったベンチ · 雪をかぶったポストと室外機', 'A glowing vending machine · a bench buried to the seat · a post box and an AC unit under snow'], show(() => [vending(), bench(), postBox(), acUnit()], { spacing: 1.4 }), { view: [0.3, 0.35, 1] }),
  C_('street', '柵・のぼり・案内板', 'Fence, banners, signboard', ['雪ののる木の柵 · はためくのぼり（赤・青・黄）· 案内の地図', 'A wooden fence with snow along it · banners flapping (red, blue, yellow) · a guide map'], show(() => { const f = fence(3), a = nobori(C.noren), b = nobori(0x2f55c4), c = nobori(0xf2c230), s = signboard(); a.position.set(2.2, 0, 0); b.position.set(2.7, 0, 0.2); c.position.set(3.2, 0, 0); s.position.set(-2.6, 0, 0); return [f, a, b, c, s]; }), { view: [0.2, 0.3, 1] }),
  C_('street', '電飾の並木・モミ', 'Lit trees and firs', ['枝に電球を巻いた並木 · 段ごとに雪ののるモミ', 'Bare street trees wound with bulbs · firs with snow on every tier'], show(() => [lightTree(1), lightTree(4), conifer(2.6), conifer(2.0)], { spacing: 1.8 }), { view: [0.3, 0.25, 1] }),
  C_('street', '雪の壁（除雪の山）', 'Plough banks', ['除雪で道ばたに寄せた雪：かたまり、下ほど灰色', 'What the ploughs push to the roadside: lumps, greyer low down'], show(() => [snowBank(5, 0.7, 3), snowBank(3, 0.5, 8)], { spacing: 0, road: false }), { view: [0.2, 0.35, 1] }),
  C_('ride', '路面電車・ササラ電車', 'Tram, sasara tram', ['緑と白の電車（パンタグラフ、行き先の灯り）· ササラ電車：両端の竹のブラシが回って雪を飛ばす', 'A green-and-white tram (pantograph, lit destination) · the sasara tram: bamboo brushes spinning at both ends, flinging snow'], rideCard(() => [tram(), sasara()], { speed: 1.4, gap: 7 }), { view: [0.35, 0.35, 1] }),
  C_('ride', '除雪車・ロータリー', 'Plough, rotary blower', ['黄色い除雪トラック（縞の刃、回る警告灯）· ロータリー除雪車（前のドラム、雪を吹き上げる）', 'A yellow plough truck (striped blade, flashing beacon) · a rotary blower (the drum in front, a plume of snow)'], rideCard(() => [plough(), rotary()], { speed: 0.9, gap: 7 }), { view: [0.35, 0.35, 1] }),
  C_('ride', 'タクシー・車・バス', 'Taxi, cars, bus', ['屋根に雪のタクシー · 雪に埋まった車 · 緑の帯の市バス', 'A taxi with snow on its roof · a car buried in snow · a city bus with a green stripe'], show(() => { const a = car({ taxi: true }), b = car({ color: 0xe8483f, buried: true }), c = bus(); a.position.x = -3; c.position.x = 2.6; return [a, b, c]; }, { road: true }), { view: [0.3, 0.35, 1] }),
  C_('people', '観光客', 'Visitors', ['ふくらんだダウン、ニット帽とぼんぼん、耳あて、フード、マフラー、ブーツ · 6 色', 'Puffy down jackets, bobble hats, earmuffs, hoods, scarves, boots · six colours'], show(() => ROLES.tourists(), { spacing: 0.7 }), { view: [0.15, 0.25, 1], fill: 0.7 }),
  C_('people', '子ども', 'Children', ['そりを引く子 · 雪玉を投げる子 · 雪玉をかかえる子', 'Pulling a sled · throwing a snowball · hugging a snowball'], show(() => ROLES.kids(), { spacing: 0.9 }), { view: [0.15, 0.3, 1], fill: 0.6 }),
  C_('people', '働く人・ステージ・カップル', 'Workers, stage, couple', ['屋台の人（はちまき、前掛け）· 除雪の人（ヘルメット、反射ベスト、スコップ）· ステージの人（マイク）· 写真の人 · 手をつないだ2人', 'A stall cook (headband, apron) · a snow worker (helmet, reflective vest, shovel) · someone on stage with a mic · a photographer · a couple hand in hand'], show(() => [ROLES.cook(), ROLES.worker(), ROLES.performer(), ROLES.photographer(), ROLES.couple()], { spacing: 0.8 }), { view: [0.15, 0.25, 1], fill: 0.65 }),
  C_('animal', 'エゾリス・カラス・スズメ', 'Squirrel, crow, sparrows', ['跳ねては止まるエゾリス · つつくカラス · ふくらんだスズメ', 'An Ezo squirrel that hops and stops · a pecking crow · puffed-up sparrows'], show(() => [ezoSquirrel(), crow(), sparrows()], { spacing: 0.6 }), { view: [0.2, 0.35, 1], fill: 0.6 }),
  C_('weather', '舞う雪・湯気', 'Falling snow, steam', ['晴れ間に舞う雪（点1つの描画、ときどき光る）· 屋台の湯気（やわらかい板が上って消える）', 'Snow drifting on a sunny day (one draw of points, some glinting) · steam from the stalls (soft puffs that rise and fade)'], (scene) => { ground(scene, 8, 6); const g = new THREE.Group(); scene.add(g); const s = stall('ramen'); g.add(s); const f = snowfall({ w: 8, d: 6, h: 5, n: 800 }); g.add(f); return { obj: g, target: vec(0, 1.6, 0), radius: 3.6, update: (t) => s.userData.update(t) }; }, { view: [0.2, 0.2, 1] }),
];
const GROUPS = [['all', ['すべて', 'All']], ['sample', ['見本', 'Sample']], ['material', ['素材', 'Materials']], ['sculpture', ['雪像', 'Snow']], ['ice', ['氷', 'Ice']], ['building', ['建物', 'Buildings']], ['stall', ['屋台', 'Stalls']], ['street', ['通り', 'Street']], ['ride', ['乗り物', 'Rides']], ['people', ['人', 'People']], ['animal', ['動物', 'Animals']], ['weather', ['天気', 'Weather']]];

// ---------- page ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
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

// debug: a contact sheet of cards at a fixed size, posted to the film server if there is one (the extra renderer is disposed)
window.__snow = {
  cards, ready,
  async sheet(ids, { cols = 2, W = 600, Hh = 400, advance = 1, post = null } = {}) {
    const rows = Math.ceil(ids.length / cols), cv = document.createElement('canvas'); cv.width = W * cols; cv.height = Hh * rows;
    const ctx = cv.getContext('2d'); ctx.font = '18px sans-serif';
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, Hh, false); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.92;
    ids.forEach((i, n) => { const st = ready(cards[i]); for (let k = 0; k < advance * 30; k++) { clock.uTime.value += 1 / 30; st.update(clock.uTime.value, 1 / 30, true); } const cam = st.camera.clone(); cam.aspect = W / Hh; cam.updateProjectionMatrix(); r.render(st.scene, cam); ctx.drawImage(r.domElement, (n % cols) * W, Math.floor(n / cols) * Hh); ctx.fillStyle = '#000'; ctx.fillText(i + ' ' + cards[i].item.name, (n % cols) * W + 6, Math.floor(n / cols) * Hh + 20); });
    r.dispose(); r.forceContextLoss();
    if (post) { const b = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.88)); await fetch(post, { method: 'POST', body: b }); }
    return 'ok';
  },
};

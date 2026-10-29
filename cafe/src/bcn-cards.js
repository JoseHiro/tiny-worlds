// The Barcelona shelf of the café parts catalog (cafe/BARCELONA.md §3): the Eixample houses and a whole block, the
// shops and kiosks, the pond and the plaza, the street things and the people. parts.js adds these to its list.
import * as THREE from 'three';
import { person, box } from '../../airport/src/parts.js';
import { scooter, taxi } from '../../town/src/vehicles.js';
import { M } from './furniture.js';
import { Facades, building, block, TYPES, BW, setNight } from './eixample.js';
import { bakery, fruiteria, tapasBar, terrace, gelateria, pharmacy, souvenirs, flowerKiosk, newsKiosk, pondEdge, ducks, path, playground, mosaicBench, fountain, falquesLamp, planeTree, treeGrate, bikeDock, containers, easel, bollards } from './bcn.js';

const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const pave = (scene, w, d, x = 0, z = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xa8a297, roughness: 0.9 })); m.position.set(x, 0, z); m.receiveShadow = true; scene.add(m); return m; };
const updAll = (g) => { const list = []; g.traverse((o) => o.userData.update && list.push(o)); return (t, dt) => list.forEach((o) => o.userData.update(t, dt)); };
// a shop on a short piece of its building's wall
function onWall(...makers) {
  return (scene) => {
    const g = new THREE.Group(), n = makers.length;
    pave(scene, n * 3.4 + 2, 5, 0, 1.2);
    makers.forEach((mk, i) => { const x = (i - (n - 1) / 2) * 3.4; g.add(box(3.2, 4.2, 0.4, M(0xe8dcc4, { roughness: 0.95 }), x, 2.1, -0.2)); g.add(box(3.3, 0.35, 0.25, M(0xd4c3a3), x, 3.4, 0.1)); const s = mk(); s.position.x = x; g.add(s); });
    scene.add(g);
    return { obj: g, radius: n * 1.9 + 0.6, target: vec(0, 1.6, 0.6), update: updAll(g) };
  };
}
function houses(scene) { // one of each type, side by side
  const F = new Facades(), g = new THREE.Group(), keys = Object.keys(TYPES);
  keys.forEach((k, i) => building(F, new THREE.Matrix4().setPosition((i - (keys.length - 1) / 2) * (4 * BW + 0.4), 0, 0), { type: k, bays: 4, floors: 5, seed: i + 3, ground: ['blind', 'portal', 'vitrine', 'blind'], back: false }));
  g.add(F.build()); pave(scene, keys.length * 10 + 4, 8, 0, 3); scene.add(g);
  return { obj: g, radius: 30, target: vec(0, 10, 0) };
}
function blockCard(scene) {
  const F = new Facades(), g = new THREE.Group();
  const slots = block(F, { cx: 0, cz: 0, w: 46, d: 46, cham: 8, seed: 5 });
  for (const s of slots) { const v = [bakery, fruiteria, pharmacy, gelateria][Math.abs(Math.round(s.x * 3 + s.z)) % 4](); v.position.set(s.x, 0, s.z); v.rotation.y = s.yaw; g.add(v); }
  g.add(F.build()); pave(scene, 64, 64); scene.add(g);
  return { obj: g, radius: 40, target: vec(0, 6, 0) };
}
function pondCard(scene) {
  const sh = new THREE.Shape(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, r = 1 + 0.1 * Math.sin(a * 3) + 0.05 * Math.cos(a * 5); const p = [Math.cos(a) * 7 * r, Math.sin(a) * 4 * r]; i ? sh.lineTo(...p) : sh.moveTo(...p); }
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6f98a4, roughness: 0.1, metalness: 0.3 })); water.position.y = 0.06; g.add(water);
  g.add(pondEdge(sh)); const d = ducks(4, { rx: 4.5, rz: 2.2 }); g.add(d);
  pave(scene, 20, 13).material.color.set(0xd8c49a); scene.add(g);
  return { obj: g, radius: 9, target: vec(0, 0, 0), update: (t) => d.userData.update(t) };
}

export function bcnCards(C, show) {
  return [
    C('bcn-house', 'アシャンプラの家（6つの型）', 'Eixample houses (six types)', ['クリームの石（緑のよろい戸、木のトリブナ）· 黄土色（長いバルコニー）· 淡いピンク（曲線の手すり、ゼラニウム）· 赤レンガ（白い窓枠）· モデルニスモ（色タイルの帯、石のトリブナ、曲線の破風）· 新しめの白（ガラスの手すり）· 1階は通りの扉・シャッター、屋上に手すり・給水タンク・洗濯物', 'Cream stone (green shutters, wooden tribuna) · ochre (long balconies) · pale pink (curly railings, geraniums) · red brick (white frames) · modernista (a band of coloured tiles, a stone tribuna, a curved gable) · newer white (glass railings) · street doors and metal blinds below; parapets, water tanks and washing on the roofs'], houses, { wide: true, shadows: true, view: [0.2, 0.25, 1], fill: 0.62 }),
    C('bcn-house', '角を切り落とした区画', 'A chamfered block', ['セルダの区画：角を45°に切り落とした正方形。家が通りに沿って並び、角ごとに角の家（通りの名前の板）· 1階にお店 · 真ん中は中庭', 'Cerdà’s block: a square with its corners cut at 45°. Houses along each street, a corner house on every cut (with the street’s name plate) · shops on the ground floor · a courtyard in the middle'], blockCard, { wide: true, shadows: true, view: [1, 0.8, 1.2], fill: 0.62 }),
    C('bcn-shop', 'パン屋と果物屋', 'Bakery and fruit shop', ['FORN DE PA：棚にパンとバゲット、店先にロールパンのかご · FRUITES：店先に段々の木箱、色とりどりの果物と野菜、足もとにメロン', 'FORN DE PA: loaves and baguettes on the shelves, a basket of rolls outside · FRUITES: stepped crates out front, every colour of fruit and vegetable, melons on the ground'], onWall(bakery, fruiteria), { view: [0.15, 0.25, 1], fill: 0.8 }),
    C('bcn-shop', 'タパスのバルとテラス', 'Tapas bar and terrace', ['BAR · TAPES：窓に吊るした生ハム、棚のボトル、今日のタパスの黒板 · 赤いパラソルのテラス（大理石のテーブル、籐の椅子、ベルモットとタパス）', 'BAR · TAPES: hams hanging in the window, bottles on the shelf, a board of the day’s tapas · a terrace under red parasols (marble tables, rattan chairs, vermouth and tapas)'], (scene) => { const r = onWall(tapasBar)(scene); const t = terrace({ n: 2 }); t.position.set(0, 0, 2.6); r.obj.add(t); r.radius = 4.2; return r; }, { view: [0.4, 0.4, 1], fill: 0.8 }),
    C('bcn-shop', 'アイス屋と薬局', 'Gelateria and pharmacy', ['GELATS：パステルの店先、色とりどりのアイスのケース、入口の上に大きなコーン · FARMÀCIA：白い店先、通りに張り出した緑の十字（光る）', 'GELATS: a pastel front, a case of coloured tubs, a big cone over the door · FARMÀCIA: a white front and the green cross hanging out over the pavement (lit)'], onWall(gelateria, pharmacy), { view: [0.15, 0.25, 1], fill: 0.8 }),
    C('bcn-shop', 'お土産屋', 'Souvenir shop', ['RECORDS：トレンカディス（割れタイル）の柱、窓に塔の模型とマグ、Tシャツ · 店先で絵はがきの回転台がまわる', 'RECORDS: pillars of broken tiles (trencadís), little towers and mugs in the window, T-shirts · a postcard rack turning outside'], onWall(souvenirs), { view: [0.3, 0.3, 1], fill: 0.85 }),
    C('bcn-shop', '花と新聞のキオスク', 'Flower and newspaper kiosks', ['FLORS：緑の小屋のまわりに花のバケツの段 · PREMSA：壁いっぱいの雑誌、台の上に新聞', 'FLORS: tiers of flower buckets round a green hut · PREMSA: walls of magazines, newspapers on the counter'], show(() => [flowerKiosk(), newsKiosk()], { spacing: 4 }), { view: [0.5, 0.45, 1], fill: 0.8 }),
    C('bcn-plaza', '池とカモ', 'The pond and its ducks', ['ガウディ広場の池：ゆるい曲線、平らな石の縁、水草とスイレン（花も）· カモ（マガモのオスとメス）が列になって泳ぐ · 街では水面に聖堂が映る', 'The pond on Plaça de Gaudí: a soft curve, a flat stone coping, reeds and water lilies (some in flower) · mallards, drakes and ducks, paddle round in a line · in the city the basilica shows in the water'], pondCard, { view: [0.3, 0.6, 1], fill: 0.8 }),
    C('bcn-plaza', '小道・タイルのベンチ・水飲み', 'Paths, tiled bench, fountain', ['砂（さうろ）の曲がった小道と石の縁 · 割れタイルで覆われた波打つベンチ · 鉄の水飲み（4つの口、上に灯り）', 'A curving path of pale sand (sauló) with stone kerbs · a wavy bench covered in broken tiles · an iron drinking fountain (four spouts, a lamp on top)'], show(() => { const p = path([[-5, 1.5], [-2, -0.5], [1.5, 0.8], [5, -1]], 2.2); const b = mosaicBench({ len: 4 }); b.position.set(0, 0, -2.4); const f = fountain(); f.position.set(3.5, 0, 2.2); return [p, b, f]; }, { spin: false }), { view: [0.4, 0.5, 1], fill: 0.85, shadows: true }),
    C('bcn-plaza', '遊び場', 'Playground', ['赤いやわらかい床と低い柵 · すべり台 · ブランコ（ゆれる）· スプリングの馬', 'A soft red floor and a low fence · a slide · swings (swinging) · a spring rider'], show(() => playground(), { spin: false }), { view: [0.6, 0.6, 1], fill: 0.8, shadows: true }),
    C('bcn-street', '並木と街灯', 'Plane trees and lamps', ['プラタナス（まだらの幹、高く広い樹冠）と根元の鉄の格子 · ファルケスの街灯（石の台、鉄の柱、くるりと巻いた4本の腕＋てっぺんの5つめの灯り）· 車止めのボラード', 'A plane tree (mottled trunk, a high broad crown) in its iron grate · Falqués’s lamp (a stone foot, an iron column, four curling arms and a fifth light on top) · bollards'], show(() => { const t = planeTree({ seed: 2 }); const gr = treeGrate(); const l = falquesLamp(); l.position.x = 5; t.position.x = -3; gr.position.x = -3; const b = bollards(4, 1.2); b.position.set(1, 0, 2); return [t, gr, l, b]; }, { spin: false }), { view: [0.2, 0.3, 1], fill: 0.8, shadows: true }),
    C('bcn-street', '自転車・スクーター・ごみ箱', 'Bikes, scooters, bins', ['シェア自転車のステーション（赤い柱と画面、赤と白の自転車）· スクーター · 黒と黄色のタクシー · 分別の大きなコンテナ5色', 'A bike-share dock (a red post with a screen, red and white bikes) · scooters · a black-and-yellow taxi · the big sorting bins in five colours'], show(() => { const d = bikeDock({ n: 5 }); d.position.z = -1.8; const s = scooter({ color: 0xc8283a, rider: false }); s.position.set(-2.5, 0, 1.2); const t = taxi({ color: 0x1d1f23 }); t.position.set(1.5, 0, 1.6); const c = containers(); c.position.set(0, 0, -4.6); c.scale.setScalar(0.9); return [d, s, t, c]; }, { spin: false }), { view: [0.4, 0.5, 1], fill: 0.85, shadows: true }),
    C('bcn-people', 'ガイドと観光客', 'A guide and tourists', ['旗を持ったガイド · カメラの観光客（麦わら帽、キャップ）· 地図を見る人 · リュックの人', 'A guide with a flag · tourists with cameras (straw hat, cap) · someone with a map · a backpacker'], show(() => ['guide', 'touristA', 'touristB', 'touristC', 'touristD'].map((r, i) => { const p = person(r, { mode: i ? (i % 2 ? 'photo' : 'look') : 'walk' }); p.userData.phase = i; return p; }), { spacing: 1.0, spin: false, update: (m, t) => m.forEach((p) => p.userData.update(t)) }), { view: [0.25, 0.3, 1], fill: 0.62 }),
    C('bcn-people', '近所の人・音楽家・画家', 'Neighbours, a musician, a painter', ['パンの袋の人（バゲットがのぞく）· 果物の紙袋の人 · ギターを弾く人 · ベレー帽の画家とイーゼル（聖堂の絵）', 'Someone with a bag of bread (a baguette sticking out) · someone with fruit from the market · a guitarist · a painter in a beret at an easel (a picture of the basilica)'], show(() => { const ps = [['veiBread', 'walk'], ['veiBag', 'walk'], ['musician', 'idle'], ['painter', 'idle']].map(([r, m], i) => { const p = person(r, { mode: m }); p.position.x = (i - 1.5) * 1.1; p.userData.phase = i; return p; }); const e = easel(); e.position.set(2.4, 0, 0.6); e.rotation.y = -0.6; return [...ps, e]; }, { spin: false, update: (m, t) => m.slice(0, 4).forEach((p) => p.userData.update(t)) }), { view: [0.25, 0.3, 1], fill: 0.62 }),
  ];
}
export const BCN_GROUPS = [['bcn-house', ['バルセロナの家', 'Barcelona houses']], ['bcn-shop', ['バルセロナのお店', 'Barcelona shops']], ['bcn-plaza', ['広場と池', 'Plaza and pond']], ['bcn-street', ['通りの物', 'Street things']], ['bcn-people', ['街の人', 'People in town']]];
export { setNight };

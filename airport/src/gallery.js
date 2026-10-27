// Parts catalog: one renderer, one scene per card, drawn with scissor viewports.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as P from './parts.js';
import * as I from './interior.js';
import * as R from './rooms.js';
import * as C from './cabin.js';

function lineup() {
  const g = new THREE.Group();
  const place = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; g.add(o); return o; };
  place(P.airplane(), 0, 0);
  place(P.pushbackTug(), 10.3, 0, Math.PI);
  place(P.apronBus(), -3, 6.5);
  place(P.fuelTruck(), 4, 6.5);
  place(P.baggageTrain(), 1, -6.5);
  place(P.car(), -6, -6.5);
  place(P.car({ followMe: true }), 9, -6.5);
  ['pilot', 'attendant', 'crew', 'marshaller', 'passenger'].forEach((r, i) => {
    const p = place(P.person(r, { mode: r === 'marshaller' ? 'signal' : 'idle' }), 3.4 + i * 1.1, 3.6, -Math.PI / 2);
    p.userData.phase = i;
  });
  return g;
}

const ITEMS = [
  { tag: 'Overview', name: 'スケール比較', note: '全パーツを並べてサイズ感とトーンを確認', wide: true, build: lineup },
  { tag: 'Aircraft', name: '旅客機 · Sunrise', note: '全長14 / 翼幅13 · 尾翼・ウィングレットが差し色', build: () => P.airplane(P.LIVERIES.sunrise), livery: true },
  { tag: 'Aircraft', name: '旅客機 · Lagoon', note: '同じ機体にリバリーだけ差し替え', build: () => P.airplane(P.LIVERIES.lagoon), livery: true },
  { tag: 'Aircraft', name: '旅客機 · Midnight', note: '濃色ボディ版 · 夜景で映える', build: () => P.airplane(P.LIVERIES.midnight), livery: true },
  { tag: 'Ground', name: 'ランプバス', note: '乗客をターミナルと機体の間で運ぶ · ドア3枚', build: () => P.apronBus(), drive: 1.5 },
  { tag: 'Ground', name: '燃料車', note: 'タンク＋ホースリール · 3軸', build: () => P.fuelTruck(), drive: 1.2 },
  { tag: 'Ground', name: 'プッシュバック・タグ', note: '機体を押し出す低い牽引車 · トーバー付き', build: () => P.pushbackTug(), drive: 1 },
  { tag: 'Ground', name: '手荷物トレイン', note: 'トラクター＋カート2台 · 荷物の色はランダム', build: () => P.baggageTrain(), drive: 1.2 },
  { tag: 'Ground', name: 'フォローミーカー', note: '誘導車 · 市松模様の看板と回転灯', build: () => P.car({ followMe: true }), drive: 2 },
  { tag: 'Ground', name: '乗用車', note: '駐車場や送迎レーン用 · 色違いで量産', build: () => P.car({ color: P.PALETTE.sky }), drive: 2 },
  { tag: 'Character', name: 'パイロット', note: '白い制帽＋袖の金ライン', build: () => P.person('pilot'), modes: ['idle', 'walk'] },
  { tag: 'Character', name: '客室乗務員', note: 'ティールの制服＋オレンジのスカーフ', build: () => P.person('attendant'), modes: ['idle', 'walk'] },
  { tag: 'Character', name: 'グランドスタッフ', note: 'ヘルメット・イヤーマフ・反射ベスト', build: () => P.person('crew'), modes: ['idle', 'walk'] },
  { tag: 'Character', name: 'マーシャラー', note: '光るパドルで機体を誘導', build: () => P.person('marshaller', { mode: 'signal' }), modes: ['signal', 'idle', 'walk'] },
  { tag: 'Passengers', name: '乗客バリエーション', note: '6タイプを並べて歩かせたところ · 搭乗ゲートへ向かう列のイメージ', wide: true, build: crowd },
  { tag: 'Passenger', name: '旅行者', note: 'キャリーケースを引く定番の乗客', build: () => P.person('passenger', { mode: 'walk' }), modes: ['walk', 'idle'] },
  { tag: 'Passenger', name: '女性', note: 'ロングヘア・スカート・ショルダーバッグ', build: () => P.person('woman', { mode: 'walk' }), modes: ['walk', 'idle'] },
  { tag: 'Passenger', name: 'バックパッカー', note: 'キャップ＋寝袋付きの大きなリュック', build: () => P.person('backpacker', { mode: 'walk' }), modes: ['walk', 'idle'] },
  { tag: 'Passenger', name: 'ビジネスマン', note: 'スーツ・赤ネクタイ・ブリーフケース', build: () => P.person('business', { mode: 'walk' }), modes: ['walk', 'idle'] },
  { tag: 'Passenger', name: '子ども', note: '0.72倍スケール · キャップと小さなリュック', build: () => P.person('child', { mode: 'walk' }), modes: ['walk', 'idle'] },
  { tag: 'Passenger', name: 'シニア', note: '白髪・メガネ・杖 · ゆっくり歩く', build: () => P.person('senior', { mode: 'walk' }), modes: ['walk', 'idle'] },

  // ---- R1 チェックインホール ----
  { group: 'r1', tag: 'R1 · Room kit', name: 'チェックインホール（部屋キット）', note: '15×11 · 島型カウンター6席・行列・自動機4台・案内板・ベンチ · 壁は腰の高さで切った断面表示', wide: true, build: I.checkInHall, view: [1, 1.15, 1.1], zoom: 0.64 },
  { group: 'r1', tag: 'R1 · Counter', name: 'チェックインカウンター（島型）', note: '10.2×2.5 · 机の天板0.62 · 計量台 → シュート → 裏のベルト · 机ごとに番号サイン', build: () => I.checkInIsland(), view: [0.6, 0.9, 1.4] },
  { group: 'r1', tag: 'R1 · Counter', name: '係員（女性・男性）', note: 'ネイビーの制服＋オレンジのスカーフ／ネクタイ · 「入力」ポーズ', build: () => pair('agent', 'agentM', 'type'), modes: ['type', 'idle', 'walk'] },
  { group: 'r1', tag: 'R1 · Kiosk', name: '自動チェックイン機', note: '0.5×0.44×1.1 · 画面は利用者側へ傾く · 使用中は画面が明滅', build: () => { const k = I.kiosk(); k.userData.active = true; return k; } },
  { group: 'r1', tag: 'R1 · Queue', name: '行列ポール（3レーン）', note: '支柱0.55 · 1.3以内ごとに支柱 · 入口と出口だけ開いている', build: () => I.queueMaze({ lanes: 3, length: 5 }) },
  { group: 'r1', tag: 'R1 · Display', name: '出発案内板（FIDS）', note: '3.2×1.5 · 時刻・便名・行き先・ゲート・状況 · シミュレーションの便と連動予定', build: () => I.fids() },
  { group: 'r1', tag: 'R1 · Seating', name: 'ベンチ（4連）', note: '座面0.3 · 肘掛け付き · 「座る」ポーズと組み合わせ', build: () => benchWithPeople() },
  { group: 'r1', tag: 'R1 · Belt', name: 'ベルトコンベア', note: '天面0.45 · 幅0.55 · 黄色の縁 · 表面が流れる（仕分け場でも共通）', build: () => I.conveyor(4) },
  { group: 'r1', tag: 'R1 · Luggage', name: '手荷物（3種）', note: 'スーツケース・ダッフル・段ボール · 色は8色から · ベルト上は寝かせる', build: luggageSet },
  { group: 'r1', tag: 'R1 · Trolley', name: '手荷物カート', note: '押し手はオレンジ · 荷物を積んだ状態', build: () => I.trolley({ bags: [{ kind: 'hard', color: P.PALETTE.teal }, { kind: 'soft', color: P.PALETTE.orange }] }) },
  { group: 'r1', tag: 'R1 · Sign', name: '吊り下げ案内サイン', note: '黄色地＋黒文字 · 日本語＋英語＋矢印 · 天井2.6から吊る', build: () => I.hangingSign({ height: 2.0 }) },
  { group: 'r1', tag: 'R1 · Prop', name: '植栽', note: '白い鉢＋低ポリの葉 · 部屋の角に置く', build: () => I.planter() },

  // ---- R2 保安検査場 ----
  { group: 'r2', tag: 'R2 · Room kit', name: '保安検査場（部屋キット）', note: '行列 → 搭乗券ゲート → 検査レーン3本 → 出口 · 真ん中のレーンは探知機が鳴って再検査中', wide: true, build: R.securityHall, view: [1, 1.15, 1.1], zoom: 0.64 },
  { group: 'r2', tag: 'R2 · Lane', name: '検査レーン一式', note: '荷物台（ローラー）→ X線 → 受け取り台 · 横にゲート型探知機 · 奥に再検査台 · トレイがトンネルを通る', build: () => R.securityLane() },
  { group: 'r2', tag: 'R2 · Machine', name: 'X線検査機', note: '1.7×1.0×1.5 · 鉛のれん · 係員側にモニター · 上部ランプ', build: () => R.xrayMachine() },
  { group: 'r2', tag: 'R2 · Machine', name: 'ゲート型金属探知機', note: '内幅0.8 · 高さ2.1 · ランプ緑／警報で赤く点滅', build: () => { const d = R.metalDetector(); d.userData.alarm = true; return d; } },
  { group: 'r2', tag: 'R2 · Gate', name: '自動ゲート（搭乗券）', note: '幅1.3 · ガラスのフラップが開閉 · ゲートでも色違いで共通', build: () => R.eGate() },
  { group: 'r2', tag: 'R2 · Prop', name: 'トレイ・確認台', note: 'トレイ0.5×0.36（スマホと小物入り）· 搭乗券確認台', build: () => { const g = new THREE.Group(); const t = R.tray(); t.position.x = -0.5; g.add(t); const p = R.podium(); p.position.x = 0.5; g.add(p); return g; } },
  { group: 'r2', tag: 'R2 · Staff', name: '保安検査員', note: 'ネイビー＋スカイのベスト · 新ポーズ「両手を上げる」はボディスキャナー用', build: () => pair('security', 'passenger', 'armsUp'), modes: ['armsUp', 'idle', 'hold'] },

  // ---- R3 出発ラウンジ ----
  { group: 'r3', tag: 'R3 · Room kit', name: '出発ラウンジ（部屋キット）', note: 'カフェ（カウンター・テーブル4卓）· 売店 · トイレ · ベンチ · 行き交う人', wide: true, build: R.lounge, view: [1, 1.15, 1.1], zoom: 0.64 },
  { group: 'r3', tag: 'R3 · Café', name: 'カフェカウンター', note: '3×0.8 · エスプレッソ機（湯気）· ショーケース · メニュー板', build: () => R.cafeCounter() },
  { group: 'r3', tag: 'R3 · Café', name: 'カフェテーブル', note: '丸テーブル＋黄色い椅子2脚 · 座る位置を持つ', build: () => R.cafeTable() },
  { group: 'r3', tag: 'R3 · Shop', name: '売店の棚・レジ・看板', note: '棚2×1.4（商品は色の小箱）· レジ · 黄色い看板', build: () => { const g = new THREE.Group(); const s = R.shopShelf(); s.position.x = -1.2; g.add(s); const c = R.cashier(); c.position.set(1.4, 0, 0.6); g.add(c); return g; } },
  { group: 'r3', tag: 'R3 · Wall', name: 'トイレ入口', note: '男女の入口とピクトグラム（スカイ／ピンク）', build: () => R.restrooms() },
  { group: 'r3', tag: 'R3 · Staff', name: 'カフェ店員', note: '白シャツ＋茶色のエプロン＋キャップ', build: () => pair('barista', 'barista', 'type'), modes: ['type', 'idle'] },

  // ---- R4 搭乗ゲート ----
  { group: 'r4', tag: 'R4 · Room kit', name: '搭乗ゲート A1（部屋キット）', note: '2F · 窓の外に機体とブリッジ · ゲートカウンター · 自動改札2台 · 搭乗の列 · 窓に張り付く子ども', wide: true, build: R.gateLounge, view: [0.9, 1.0, 1.2], zoom: 0.75 },
  { group: 'r4', tag: 'R4 · Counter', name: 'ゲートカウンター', note: '2×0.7 · ティール · ゲート番号・便名・状況の表示', build: () => R.gateCounter() },
  { group: 'r4', tag: 'R4 · Door', name: 'ブリッジへの扉', note: '黒い枠＋「A1 ▸ 搭乗口」', build: () => R.bridgeDoor() },
  { group: 'r4', tag: 'R4 · Staff', name: 'ゲート係', note: 'ティールの制服＋黄色のスカーフ', build: () => pair('gateAgent', 'gateAgent', 'idle'), modes: ['idle', 'type', 'walk'] },

  // ---- R5 手荷物仕分け場 ----
  { group: 'r5', tag: 'R5 · Room kit', name: '手荷物仕分け場（部屋キット）', note: '1F · 上階から荷物が下りてくる → 本線 → 押し出しアームで便ごとに仕分け → シュート → カート → トラクター', wide: true, build: R.baggageHall, view: [1, 1.2, 1.1], zoom: 0.64 },
  { group: 'r5', tag: 'R5 · Belt', name: 'ベルトの経路（角はターンテーブル）', note: '点を並べるだけで経路ができる · 荷物はその経路をたどる', build: () => R.conveyorRun([new THREE.Vector3(-2, 0, -1), new THREE.Vector3(1.5, 0, -1), new THREE.Vector3(1.5, 0, 1.5)]) },
  { group: 'r5', tag: 'R5 · Machine', name: '押し出しアーム', note: '黄色 · 荷物が来ると振れて枝線へ押し出す', build: () => { const a = R.sorterArm(); a.userData.update = (t) => { a.userData.arm.rotation.y = -Math.max(0, Math.sin(t * 1.5)) * 1.2; }; return a; } },
  { group: 'r5', tag: 'R5 · Chute', name: '仕分けシュート', note: '1.6×2.0 · 傾いた金属の台 · 便名サイン', build: () => R.makeupChute() },
  { group: 'r5', tag: 'R5 · Staff', name: '仕分け作業員', note: 'オレンジのベスト＋ネイビーのキャップ · 新ポーズ「持ち上げる」', build: () => pair('handler', 'handler', 'lift'), modes: ['lift', 'idle', 'walk'] },

  // ---- R6 到着通路 ----
  { group: 'r6', tag: 'R6 · Room kit', name: '到着通路 → エスカレーター（部屋キット）', note: '2Fの専用通路（ガラスで仕切り）· 動く歩道 · エスカレーターで1Fへ', wide: true, build: R.arrivalsCorridor, view: [1, 0.9, 1.25], zoom: 0.66 },
  { group: 'r6', tag: 'R6 · Escalator', name: 'エスカレーター', note: '高さ3.0（1階分）· 30° · ガラスの手すり · 段が流れる', build: () => R.escalator() },
  { group: 'r6', tag: 'R6 · Walkway', name: '動く歩道', note: '長さ6 · 幅1.0 · ガラスの手すり', build: () => R.travelator(5) },
  { group: 'r6', tag: 'R6 · Wall', name: 'ガラスの仕切り', note: '高さ1.4 · ネイビーの枠 · 到着客と出発客を分ける', build: () => R.glassPartition(4) },

  // ---- R7 / R8 手荷物受取・サービス ----
  { group: 'r7', tag: 'R7 · Room kit', name: '手荷物受取＋手荷物サービス（部屋キット）', note: 'ターンテーブル · 荷物を待つ人・取る人 · カート置き場 · 右下に手荷物サービス（荷物が出てこなかった人）', wide: true, build: R.claimHall, view: [1, 1.15, 1.1], zoom: 0.64 },
  { group: 'r7', tag: 'R7 · Carousel', name: 'ターンテーブル', note: '7×2.8 · スラットと荷物が回る · 奥のシュートから荷物が出る', build: () => R.carousel(), view: [0.6, 1, 1.2] },
  { group: 'r7', tag: 'R7 · Sign', name: 'ターンテーブル案内', note: 'オレンジ · 番号・便名・出発地・状況', build: () => R.claimSign() },
  { group: 'r7', tag: 'R7 · Prop', name: 'カート置き場', note: 'カートを重ねて並べる', build: () => R.trolleyRack(5) },
  { group: 'r7', tag: 'R8 · Desk', name: '手荷物サービスカウンター', note: '赤 · 後ろに引き取り手のない荷物の棚', build: () => R.baggageServiceDesk() },

  // ---- R9 到着ロビー ----
  { group: 'r9', tag: '1F · Room kit', name: '入国審査（部屋キット）', note: '国際線は列 → ブース（日本人／外国人）→ 西の出口 · 国内線はガラスの仕切りの向こうを素通り', wide: true, build: R.immigrationHall, view: [1, 1.15, 1.1], zoom: 0.64 },
  { group: 'r9', tag: '1F · Booth', name: '入国審査ブース', note: '紺のカウンター＋ガラス · 審査官は内側に座る · 頭上に「日本人／外国人」', build: () => { const g = new THREE.Group(); const b = R.immigrationBooth(); g.add(b); const o = P.person('officer', { mode: 'type' }); o.position.copy(b.userData.officer); g.add(o); g.userData.update = (t) => o.userData.update(t); return g; } },
  { group: 'r9', tag: 'R9 · Room kit', name: '到着ロビー（部屋キット）', note: '西の壁に到着口の自動ドア · 柵で挟んだ通路 · 外側で出迎えの人が待つ · 案内所 · 南の出口から迎車レーンへ', wide: true, build: R.arrivalsLobby, view: [1, 1.15, 1.1], zoom: 0.64 },
  { group: 'r9', tag: 'R9 · Door', name: '到着口（自動ドア）', note: '幅2.4 · ガラス戸が左右に開く · 黄色の看板', build: () => R.arrivalDoors() },
  { group: 'r9', tag: 'R9 · Prop', name: '柵・出迎えボード', note: '金属の柵 · 手に持つ看板（名前入り）', build: () => { const g = new THREE.Group(); g.add(R.railing(2.4)); const p = P.person('woman', { mode: 'hold' }); p.position.z = 0.6; p.rotation.y = -Math.PI / 2; p.add(R.welcomeBoard('SORA!')); g.add(p); g.userData.update = (t) => p.userData.update(t); return g; } },
  { group: 'r9', tag: 'R9 · Desk', name: '案内所', note: '半円のカウンター · スカイの「i」', build: () => R.infoDesk() },

  // ---- 機内（人の縮尺、上半分を切り取った機体）----
  { group: 'cabin', tag: 'Cabin · Kit', name: '機内（3-3配列 × 18列）', note: '全長36 · 窓の高さで切った断面 · 前方ギャレー・後方トイレ・コックピット · 乗客が通路を進み、棚に荷物を上げて座る · 全員が座るとベルトサインが点く', wide: true, build: () => C.cabinKit(), view: [0.55, 1.25, 1.0], zoom: 0.62 },
  { group: 'cabin', tag: 'Cabin · Seat', name: '座席（3連）', note: '座面0.3 · ピッチ0.85 · 前3列はティール、他はネイビー · ヘッドレストに白いカバー', build: () => { const g = new THREE.Group(); const a = C.seatTriple({ color: P.PALETTE.teal }); a.position.x = 0.85; g.add(a, C.seatTriple()); return g; }, view: [1, 0.8, 0.9] },
  { group: 'cabin', tag: 'Cabin · Bins', name: '荷物棚', note: '座席の上 y 1.6〜2.0 · 半透明（断面表示で座席が隠れないように）· 扉が持ち上がる', build: () => { const b = C.overheadBins(4); b.userData.update = (t) => { const o = (Math.sin(t) + 1) / 2; b.children.forEach((c) => { if (c.userData.dynamic) c.rotation.x = o * 1.2; }); }; return b; } },
  { group: 'cabin', tag: 'Cabin · Galley', name: 'ギャレー', note: 'カート3台の収納 · コーヒーメーカー · オーブン', build: () => C.galleyBlock() },
  { group: 'cabin', tag: 'Cabin · Lav', name: 'トイレ', note: '空き表示が緑に光る', build: () => C.lavatory() },
  { group: 'cabin', tag: 'Cabin · Cockpit', name: 'コックピット', note: '操縦席2 · 光る計器 · 機長と副操縦士が座る', build: () => { const c = C.cockpit(); const ps = c.userData.seats.map((p) => { const x = P.person('pilot', { mode: 'sit' }); x.position.copy(p); c.add(x); return x; }); const up = c.userData.update; c.userData.update = (t) => { up(t); ps.forEach((x) => x.userData.update(t)); }; return c; }, view: [-0.8, 0.9, 1.0] },
  { group: 'cabin', tag: 'Cabin · Cart', name: 'サービスカート', note: '0.6×0.34 · オレンジの天板 · 飲み物', build: () => C.serviceCart() },
  { group: 'cabin', tag: 'Cabin · Sign', name: 'ベルト着用サイン', note: '天井の表示 · 点灯で着席の合図', build: () => { const b = C.beltSign(); b.position.y = 0.6; const up = b.userData.update; b.userData.update = (t) => { b.userData.on = Math.sin(t) > 0; up(); }; return b; } },
];

function pair(a, b, mode) {
  const g = new THREE.Group();
  [a, b].forEach((role, i) => {
    const p = P.person(role, { mode });
    p.position.z = i ? -0.45 : 0.45;
    p.userData.phase = i * 3;
    g.add(p);
  });
  g.userData.mode = mode;
  // the detail-view mode buttons set userData.mode on the group; pass it through
  g.userData.update = (t) => g.children.forEach((p) => { p.userData.mode = g.userData.mode; p.userData.update(t); });
  return g;
}

function benchWithPeople() {
  const b = I.bench();
  const people = [['woman', 0], ['business', 2]].map(([role, i]) => {
    const p = P.person(role, { mode: 'sit' });
    p.position.copy(b.userData.seats[i]);
    p.rotation.y = -Math.PI / 2;
    if (p.userData.suitcase) p.userData.suitcase.visible = false;
    b.add(p);
    return p;
  });
  b.userData.update = (t) => people.forEach((p) => p.userData.update(t));
  return b;
}

function luggageSet() {
  const g = new THREE.Group();
  const items = [['hard', P.PALETTE.orange, false], ['hard', P.PALETTE.navy, true], ['soft', P.PALETTE.teal, false], ['box', 0, false], ['hard', P.PALETTE.yellow, false]];
  items.forEach(([kind, color, lying], i) => {
    const b = I.luggage(kind, color, { lying });
    b.position.set((i - 2) * 0.55, 0, 0);
    g.add(b);
  });
  return g;
}

const GROUPS = { all: 'すべて', outside: '機体・車両・人', r1: 'R1 チェックイン', r2: 'R2 保安検査', r3: 'R3 ラウンジ', r4: 'R4 ゲート', r5: 'R5 仕分け', r6: 'R6 到着通路', r7: 'R7/R8 手荷物受取', r9: '入国・到着ロビー', cabin: '機内' };

function crowd() {
  const g = new THREE.Group();
  const order = ['business', 'woman', 'child', 'passenger', 'backpacker', 'senior', 'woman', 'passenger'];
  order.forEach((type, i) => {
    const p = P.person(type, { mode: 'walk' });
    p.position.set(-i * 0.85, 0, (i % 2 ? 0.35 : -0.35));
    p.userData.phase = i * 1.7;
    g.add(p);
  });
  return g;
}

const SWATCH_NAMES = ['white', 'cream', 'navy', 'ink', 'orange', 'yellow', 'teal', 'sky', 'grey', 'red', 'green'];
document.getElementById('swatches').innerHTML = SWATCH_NAMES.map((n) => {
  const hex = '#' + P.PALETTE[n].toString(16).padStart(6, '0');
  return `<span class="sw"><i style="background:${hex}"></i>${n}</span>`;
}).join('');

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;

const VIEW_DIR = new THREE.Vector3(1, 0.62, 1.15).normalize();

function makeStage(item) {
  const obj = item.build();
  const scene = new THREE.Scene();
  const pivot = new THREE.Group();
  scene.add(pivot);

  const bounds = new THREE.Box3().setFromObject(obj);
  const center = bounds.getCenter(new THREE.Vector3());
  obj.position.x -= center.x;
  obj.position.z -= center.z;
  pivot.add(obj);
  const size = bounds.getSize(new THREE.Vector3());
  const R = Math.max(size.x, size.z) / 2 * 1.05 + 0.3;
  const target = new THREE.Vector3(0, size.y * 0.42, 0);

  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xcdbfa8, 1.5));
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
  sun.position.set(R * 0.9, R * 2.2, R * 0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -R * 1.3, right: R * 1.3, top: R * 1.3, bottom: -R * 1.3, near: 0.1, far: R * 6 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.3, 64),
    new THREE.MeshStandardMaterial({ color: 0xddd4c4, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(28, 4 / 3, 0.1, R * 40);
  const radius = Math.max(R, size.y);
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(14)) * (item.zoom ?? (item.wide ? 0.62 : 0.72));
  const dir = item.view ? new THREE.Vector3(...item.view).normalize() : VIEW_DIR;
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.lookAt(target);

  const updaters = [];
  obj.traverse((o) => o.userData.update && updaters.push(o.userData));
  return { scene, pivot, obj, camera, target, updaters, spin: !item.wide };
}

const grid = document.getElementById('grid');
const stages = ITEMS.map((item, i) => {
  const card = document.createElement('div');
  card.className = 'card' + (item.wide ? ' wide' : '');
  card.dataset.group = item.group ?? 'outside';
  card.innerHTML = `<div class="view"></div><div class="meta"><span class="tag">${item.tag}</span><b>${item.name}</b><small>${item.note}</small></div>`;
  grid.appendChild(card);
  const stage = { item, view: card.querySelector('.view'), ...makeStage(item) };
  stage.pivot.rotation.y = i * 0.6;
  card.addEventListener('click', () => openDetail(stage));
  return stage;
});

// ---------- group filter ----------

const filters = document.getElementById('filters');
filters.innerHTML = Object.entries(GROUPS).map(([k, label]) => `<button data-g="${k}" class="${k === 'all' ? 'on' : ''}">${label}</button>`).join('');
filters.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  filters.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  for (const s of stages) s.view.parentElement.style.display = b.dataset.g === 'all' || s.view.parentElement.dataset.group === b.dataset.g ? '' : 'none';
});
if (location.hash && GROUPS[location.hash.slice(1)]) filters.querySelector(`[data-g=${location.hash.slice(1)}]`).click();

// ---------- detail view ----------

const detailEl = document.getElementById('detail');
const detailView = document.getElementById('detailView');
let detail = null;
let detailCam = null;
let controls = null;

function openDetail(stage) {
  detail = stage;
  detailCam = stage.camera.clone();
  controls = new OrbitControls(detailCam, detailView);
  controls.target.copy(stage.target);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.update();

  const { item } = stage;
  document.getElementById('dTag').textContent = item.tag;
  document.getElementById('dName').textContent = item.name;
  document.getElementById('dNote').textContent = item.note;

  const btns = document.getElementById('dBtns');
  btns.innerHTML = '';
  const addToggle = (label, isOn, onClick) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.classList.toggle('on', isOn());
    b.addEventListener('click', () => { onClick(); syncButtons(); });
    b._isOn = isOn;
    btns.appendChild(b);
  };
  const syncButtons = () => btns.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b._isOn()));

  addToggle('自動回転', () => controls.autoRotate, () => { controls.autoRotate = !controls.autoRotate; });
  if (item.drive) {
    addToggle('走行（タイヤ回転）', () => !!stage.obj.userData.speed, () => {
      stage.obj.userData.speed = stage.obj.userData.speed ? 0 : item.drive;
    });
  }
  for (const m of item.modes ?? []) {
    const labels = { idle: '待機', walk: '歩く', signal: '誘導' };
    addToggle(labels[m], () => stage.obj.userData.mode === m, () => { stage.obj.userData.mode = m; });
  }
  detailEl.classList.add('open');
}

// console hook for inspecting a part up close: __gallery.look([x,y,z], [tx,ty,tz])
// __gallery.shot('r2') renders that group's room kit at 1200×760 and overlays the image.
window.__gallery = {
  shot(group, advance = 0, w = 1200, h = 760, camPos = null, target = null) {
    const stage = stages.find((s) => s.item.group === group && s.item.wide);
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setSize(w, h, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.setClearColor(0xf1ece3);
    const cam = stage.camera.clone();
    if (camPos) { cam.position.set(...camPos); cam.lookAt(...target); }
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    stage.pivot.rotation.y = 0;
    // run the room forward so the shot shows people mid-routine
    stage.simT = stage.simT ?? 0;
    for (let i = 0; i < (advance ?? 0) * 20; i++) { stage.simT += 0.05; for (const ud of stage.updaters) ud.update(stage.simT, 0.05); }
    for (const ud of stage.updaters) ud.update(stage.simT + 4, 1 / 60);
    r.render(stage.scene, cam);
    const url = r.domElement.toDataURL('image/jpeg', 0.9);
    r.dispose();
    let img = document.getElementById('shot');
    if (!img) {
      img = document.createElement('img');
      img.id = 'shot';
      Object.assign(img.style, { position: 'fixed', left: 0, top: 0, width: '100%', zIndex: 99, background: '#000' });
      img.onclick = () => img.remove();
      document.body.appendChild(img);
    }
    img.src = url;
    return 'ok';
  },
  look(pos, target) {
    if (!detail) return 'open a card first';
    controls.autoRotate = false;
    detail.pivot.rotation.y = 0;
    detailCam.position.set(...pos);
    controls.target.set(...target);
    controls.update();
  },
};

function closeDetail() {
  if (!detail) return;
  controls.dispose();
  detail.obj.userData.speed = 0;
  detail = null;
  detailEl.classList.remove('open');
}
document.getElementById('close').addEventListener('click', closeDetail);
addEventListener('keydown', (e) => e.key === 'Escape' && closeDetail());

// ---------- render loop ----------

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const H = canvas.clientHeight;

  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  const jobs = detail ? [[detail, detailView, detailCam]] : stages.map((s) => [s, s.view, s.camera]);
  for (const [stage, view, cam] of jobs) {
    const r = view.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H || r.width === 0) continue;
    if (!detail && stage.spin) stage.pivot.rotation.y += dt * 0.25;
    for (const ud of stage.updaters) ud.update(t, dt);
    if (detail) controls.update();
    cam.aspect = r.width / r.height;
    cam.updateProjectionMatrix();
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    renderer.render(stage.scene, cam);
  }
});

// "The bug on a rainy night" (room/DESIGN.md §12): one night at the desk, told in beats. Each beat has a line under the
// picture ([ja, en]), a camera shot, and what happens through it (fn(u, dt) with u going 0 → 1). The person and the cat
// are moved here directly (along paths, with jumps for the cat); the room's lights and screens are switched by the beats.
// At the end the night skips to morning and everything is put back as it was.
import * as THREE from 'three';
import { cat } from '../../town/src/koto-props.js';
import { mat, mesh } from '../../airport/src/parts.js';
import { L, onLang } from '../../koto/src/i18n.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (u) => u * u * (3 - 2 * u);
const seg = (u, a, b) => Math.min(1, Math.max(0, (u - a) / (b - a))); // u's part between a and b, 0 → 1

// along a polyline at u (0 → 1, by length); the yaw a figure facing +x needs to face the way it goes
function along(pts, u) {
  const L0 = []; let tot = 0; for (let i = 1; i < pts.length; i++) { L0.push(pts[i].distanceTo(pts[i - 1])); tot += L0.at(-1); }
  let d = u * tot, i = 0; while (i < L0.length - 1 && d > L0[i]) { d -= L0[i]; i++; }
  const a = pts[i], b = pts[i + 1], k = L0[i] ? d / L0[i] : 0;
  return { p: a.clone().lerp(b, k), yaw: Math.atan2(-(b.z - a.z), b.x - a.x) };
}
const jump = (o, a, b, u, h = 0.22) => { o.position.lerpVectors(a, b, ease(u)); o.position.y += Math.sin(Math.PI * u) * h; o.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x); };

export function roomStory({ stage, desk, sleeping, scene, out, bedLamp, lampShade, clock, hour0 }) {
  const me = desk.me, screens = desk.screens;
  const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(me.quaternion); // (not me.rotation.y: attached from the turned desk, the yaw past π/2 is kept as x = z = π and a small y)
  const SEAT = { p: me.position.clone(), yaw: Math.atan2(-fwd.z, fwd.x) };
  const CAT_BED = { p: sleeping.position.clone(), yaw: sleeping.rotation.y };
  const awake = cat({ color: 0xc98a50, mode: 'sit' }); awake.scale.setScalar(0.5); awake.visible = false; scene.add(awake); // (a shade darker than the sleeping one: under the desk lamp it glows)
  const walk = (pts, u, mode = 'walk') => { const { p, yaw } = along(pts, u); me.position.copy(p); me.rotation.set(0, yaw, 0); me.userData.mode = mode; };
  const catWalk = (pts, u) => { const { p, yaw } = along(pts, u); awake.position.copy(p); awake.rotation.y = yaw; awake.userData.mode = 'walk'; };
  const sit = (mode) => { me.position.copy(SEAT.p); me.rotation.set(0, SEAT.yaw, 0); me.userData.mode = mode; };
  const stand = (p, yaw, mode = 'idle') => { me.position.copy(p); me.rotation.set(0, yaw, 0); me.userData.mode = mode; };
  const modes = (u, list) => { let m = list[0][1]; for (const [at, md] of list) if (u >= at) m = md; me.userData.mode = m; };
  const time = (h) => clock.userData.set(h);

  // the places (world): out of the chair, the cart, the window, the bed's side; the cat's floor and desk spots
  const UP = V(-0.42, 0, -0.18), CART = V(-0.86, 0, 0.3), WINDOW = V(0.05, 0, -0.5), BEDSIDE = V(0.2, 0, -0.5);
  const C = { floor: V(0.55, 0, -0.45), byDesk: V(-0.62, 0, 0.04), onDesk: V(-0.98, 0.555, -0.1), keysEnd: V(-1.0, 0.57, -0.66), screen: V(-1.17, 0.555, -0.45), down: V(-0.62, 0, 0.1), bedFoot: V(0.35, 0.3, -0.85), sill: V(0.72, 0.3, -1.22), feet: V(1.12, 0.295, -1.05) };

  const BEATS = [
    { dur: 6, shot: [V(2.6, 2.3, 2.9), V(-0.3, 0.5, -0.4)], say: ['23:40。雨。机でコードを書いている。猫はベッドで丸くなって眠っている。', '23:40. Rain. Code on the screen; the cat asleep in a ball on the bed.'],
      fn: (u) => { sit('sitType'); time(hour0 + u * 0.05); } },
    { dur: 10, shot: [V(-0.3, 1.2, 0.5), V(-1.15, 0.78, -0.45)], say: ['テストが赤い。何度直しても、まだ赤い。', 'The tests are red. Fix after fix, still red.'],
      start: () => screens.setTest('fail'), fn: (u) => modes(u, [[0, 'sitThink'], [0.3, 'sitType'], [0.7, 'sitThink']]) },
    { dur: 6, shot: [V(-0.75, 0.85, 0.2), V(-1.13, 0.6, -0.2)], say: ['アヒルに説明してみる。「ここで重複を消して……」', 'Explaining it to the duck. “So here I drop the duplicates…”'],
      fn: () => (me.userData.mode = 'sitChat') },
    { dur: 10, shot: [V(1.0, 1.5, 0.9), V(0.1, 0.3, -0.6)], say: ['ベッドの猫が目をさました。のびをして、机のほうへ。', 'The cat on the bed wakes, stretches, and heads for the desk.'],
      start: () => { sleeping.visible = false; awake.visible = true; awake.position.copy(CAT_BED.p); awake.rotation.y = CAT_BED.yaw; },
      fn: (u) => {
        me.userData.mode = 'sitThink';
        if (u < 0.15) awake.userData.mode = 'sit';
        else if (u < 0.3) { awake.userData.mode = 'walk'; jump(awake, CAT_BED.p, C.floor, seg(u, 0.15, 0.3)); }
        else if (u < 0.85) catWalk([C.floor, V(0.1, 0, -0.2), C.byDesk], seg(u, 0.3, 0.85));
        else jump(awake, C.byDesk, C.onDesk, seg(u, 0.85, 1), 0.35);
      } },
    { dur: 6, shot: [V(-0.35, 1.15, 0.5), V(-1.1, 0.68, -0.4)], say: ['キーボードの上を、ゆっくり歩いていく。', 'Across the keyboard, slowly.'],
      start: () => { keysDone = 0; }, fn: (u) => {
        catWalk([C.onDesk, C.keysEnd], u); me.userData.mode = 'sitChat';
        const n = Math.floor(u * 18); while (keysDone < n) { screens.key('aaaa;;;sdf  jjjjk'[keysDone % 17]); keysDone++; } // (paws on the keys)
      } },
    { dur: 6, shot: [V(-0.35, 1.15, 0.5), V(-1.12, 0.72, -0.42)], say: ['そして画面の前に座りこむ。……見えない。', 'Then sits down right in front of the screen. …Can’t see a thing.'],
      fn: (u) => { if (u < 0.35) catWalk([C.keysEnd, C.screen], u / 0.35); else { awake.userData.mode = 'sit'; awake.rotation.y = 0; } me.userData.mode = u < 0.5 ? 'sitThink' : 'sitRead'; } },
    { dur: 5, shot: [V(-0.35, 1.15, 0.5), V(-1.12, 0.72, -0.42)], say: ['なでて、そっと床におろす。', 'A stroke, and gently down to the floor.'],
      fn: (u) => { me.userData.mode = 'sitRead'; if (u > 0.55) { awake.userData.mode = 'walk'; jump(awake, C.screen, C.down, seg(u, 0.55, 0.85), 0.15); } if (u > 0.85) screens.extra = ''; } },
    { dur: 8, shot: [V(1.6, 1.6, 1.4), V(0.1, 0.4, -0.7)], say: ['猫はベッドに戻って、窓の外の雨を見ている。', 'Back on the bed, the cat watches the rain at the window.'],
      fn: (u) => {
        me.userData.mode = 'sitType';
        if (u < 0.6) catWalk([C.down, V(0.1, 0, -0.35), V(0.3, 0, -0.5)], u / 0.6);
        else if (u < 0.75) jump(awake, V(0.3, 0, -0.5), C.bedFoot, seg(u, 0.6, 0.75), 0.3);
        else if (u < 0.9) catWalk([C.bedFoot, C.sill], seg(u, 0.75, 0.9));
        else { awake.userData.mode = 'sit'; awake.rotation.y = Math.PI / 2; }
      } },
    { dur: 5, shot: [V(-0.1, 1.1, 0.5), V(-1.0, 0.65, -0.3)], say: ['マグが空になった。', 'The mug is empty.'],
      fn: (u) => { if (u < 0.7) me.userData.mode = 'sitSip'; else stand(UP, Math.PI * 0.75); } },
    { dur: 5, shot: [V(0.4, 1.3, 1.4), V(-1.0, 0.6, 0.3)], say: ['立ちあがって、コーヒーを淹れに。', 'Up, to make another coffee.'],
      fn: (u) => walk([UP, V(-0.55, 0, 0.15), CART], u) },
    { dur: 9, shot: [V(-0.3, 1.05, 0.75), V(-1.2, 0.65, 0.25)], say: ['お湯を沸かして、豆を挽いて、ゆっくりドリップ。', 'The kettle on, beans ground, a slow pour.'],
      start: () => (brewing = true), end: () => (brewing = false), fn: () => stand(CART, Math.PI, 'pour') },
    { dur: 10, shot: [V(0.85, 1.2, 0.6), V(0.35, 0.8, -1.2)], say: ['窓の外は雨。高架を最終電車が通っていく。', 'Rain outside. The last train goes by on the elevated line.'],
      start: () => out.train(), fn: (u) => { if (u < 0.35) walk([CART, V(-0.4, 0, 0.0), WINDOW], u / 0.35); else stand(WINDOW, 0.95, 'idle'); time(hour0 + 0.5 + u * 0.2); } },
    { dur: 6, shot: [V(0.6, 1.4, 0.9), V(-0.6, 0.5, -0.4)], say: ['机に戻る。', 'Back to the desk.'],
      fn: (u) => { if (u < 0.8) walk([WINDOW, V(-0.2, 0, -0.1), UP], u / 0.8); else sit('sitType'); } },
    { dur: 9, shot: [V(-0.3, 1.2, 0.5), V(-1.15, 0.78, -0.45)], say: ['ふと気づいて、1行だけ直す。……テストが通った。', 'Then it clicks. One line changed… the tests pass.'],
      fn: (u) => { modes(u, [[0, 'sitThink'], [0.25, 'sitType']]); if (u > 0.5 && screens.test === 'fail') screens.setTest('run'); if (u > 0.7 && screens.test === 'run') screens.setTest('pass'); } },
    { dur: 4, shot: [V(0.2, 1.3, 0.5), V(-0.8, 0.7, -0.4)], say: ['小さくガッツポーズ。のびを、ひとつ。', 'A small fist pump. One long stretch.'], fn: () => (me.userData.mode = 'sitStretch') },
    { dur: 5, shot: [V(1.4, 1.7, 1.5), V(-0.5, 0.5, -0.5)], say: ['1:10。モニターを消して、デスクライトも消す。', '1:10. Monitors off, the desk light off.'],
      start: () => time(hour0 + 1.5), fn: (u) => { me.userData.mode = 'sitThink'; if (u > 0.4 && screens.on) desk.power(false); } },
    { dur: 6, shot: [V(1.6, 1.4, 1.2), V(0.2, 0.4, -0.8)], say: ['ベッドへ。', 'To bed.'],
      fn: (u) => { if (u < 0.15) stand(UP, 0.5); else walk([UP, V(-0.1, 0, -0.3), BEDSIDE], seg(u, 0.15, 1)); if (u > 0.5) { awake.userData.mode = 'walk'; catWalk([C.sill, C.feet], seg(u, 0.5, 1)); } } },
    { dur: 6, shot: [V(1.7, 1.5, 0.9), V(0.5, 0.35, -1.0)], say: ['ランプだけ点けて、猫といっしょに横になる。', 'Just the lamp on, lying down with the cat.'],
      start: () => { lie(); awake.visible = false; sleeping.visible = true; sleeping.position.copy(C.feet); sleeping.rotation.y = 2.4; } },
    { dur: 6, shot: [V(2.2, 1.9, 2.2), V(0.3, 0.4, -0.7)], say: ['ランプを消す。雨の音だけ。', 'The lamp goes off. Only the rain.'],
      start: () => { bedLamp.intensity = 0; lampShade.emissiveIntensity = 0; } },
    { dur: 4, say: ['……朝まで。', '…Until morning.'], start: () => fade(true), end: () => { reset(); fade(false); } },
  ];
  let keysDone = 0, brewing = false;
  // in bed: on the back, head on the pillow, the duvet pulled up to the chest
  const blanket = mesh(new THREE.BoxGeometry(0.7, 0.07, 0.5, 8, 1, 6), mat(0x8fa3b8, { roughness: 1 })); blanket.visible = false; scene.add(blanket);
  { const p = blanket.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (Math.abs(z) > 0.2) p.setY(i, p.getY(i) - 0.05); p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 12) * 0.008); } blanket.geometry.computeVertexNormals(); }
  const lie = () => { me.position.set(0.86, 0.3 + 0.08, -0.95); me.rotation.set(0, 0, Math.PI / 2); me.userData.mode = 'lie'; blanket.position.set(0.5, 0.43, -0.95); blanket.visible = true; };
  const fade = (on) => { const f = $('fade'); if (f) f.style.opacity = on ? 1 : 0; };

  let beat = -1, bt = 0, line = null;
  const say = (t) => { line = t; $('storyLine').textContent = L(t); };
  function go(i) {
    BEATS[beat]?.end?.();
    beat = i; bt = 0;
    if (i >= BEATS.length) { beat = -1; desk.auto = true; screens.auto = true; $('storyBtn').textContent = L(['もう一度見る', 'Watch again']); say(['おしまい。雨の夜のバグは、猫とコーヒーと一行で直った。', 'The end. The rainy-night bug was fixed by a cat, a coffee and one line.']); return; }
    const b = BEATS[i];
    if (b.shot) stage.shot(b.shot[0], b.shot[1], 1.8);
    if (b.say) say(b.say);
    b.start?.();
  }
  function reset() {
    desk.power(true); screens.setTest(null); screens.extra = '';
    sit('sitType'); blanket.visible = false; bedLamp.intensity = bedLamp.userData.k; lampShade.emissiveIntensity = lampShade.userData.k;
    awake.visible = false; sleeping.visible = true; sleeping.position.copy(CAT_BED.p); sleeping.rotation.y = CAT_BED.yaw; time(hour0);
  }
  function start() { reset(); desk.auto = false; screens.auto = false; go(0); $('storyBtn').textContent = L(['はじめから', 'From the start']); }
  const update = (t, dt) => {
    awake.userData.update(t);
    if (beat < 0) return;
    const b = BEATS[beat]; bt += dt;
    b.fn?.(Math.min(1, bt / b.dur), dt);
    if (bt >= b.dur) go(beat + 1);
  };
  $('storyBtn').onclick = start;
  onLang(() => { if (line) $('storyLine').textContent = L(line); });
  if (new URLSearchParams(location.search).get('story')) start();
  return { start, update, brewing: () => brewing, beat: () => beat, skip: (i) => go(i) };
}

// The shop (fuji/DESIGN.md §1.4, §4): the corner shop from the photo with its corners rounded. A floor, walls and a roof
// you can look into through the glass; the shelves, the fridges and the till inside; the long lit fascia; the sliding
// doors, which open by themselves. It faces +z. The name and mark are made up (§0.A).
import * as THREE from 'three';
import { Kit, toy, lit, label, picture, FONT } from './kit.js';

export const FRONT = -0.42, BACK = -2.42, FLOOR = 0.1, CEIL = 1.3;
export const DOOR = -0.9; // the door's middle
const LEFT = -3.6, RIGHT = 3.6, GLASS_END = 2.1;
const r = (i) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };

// the small mark: a mountain with a cap of snow in a circle
export function mark(g, x, y, d, ring = '#2f55c4') {
  g.fillStyle = ring; g.beginPath(); g.arc(x, y, d / 2, 0, 7); g.fill();
  const u = d / 2;
  g.fillStyle = '#fdfbf4'; g.beginPath(); g.moveTo(x - u * 0.68, y + u * 0.42); g.lineTo(x - u * 0.13, y - u * 0.46); g.lineTo(x + u * 0.13, y - u * 0.46); g.lineTo(x + u * 0.68, y + u * 0.42); g.closePath(); g.fill();
  g.fillStyle = ring; g.beginPath(); g.moveTo(x - u * 0.46, y + u * 0.42); g.lineTo(x - u * 0.17, y - u * 0.02); g.quadraticCurveTo(x, y + u * 0.13, x + u * 0.17, y - u * 0.02); g.lineTo(x + u * 0.46, y + u * 0.42); g.closePath(); g.fill();
}

function fasciaTexture() {
  return label('fascia', 2048, 118, (g, W, H) => {
    g.fillStyle = '#fdfbf4'; g.fillRect(0, 0, W, H);
    const cell = W / 9;
    g.fillStyle = '#1b3ab0';
    for (let i = 0; i < 9; i++) { const x = i * cell; g.beginPath(); g.roundRect(x + 10, H * 0.25, cell - 20, H * 0.5, 8); g.fill(); }
    // the name, on a white panel a little left of the middle
    g.fillStyle = '#fdfbf4'; g.beginPath(); g.roundRect(cell * 3 - 8, 3, cell * 2.2, H - 6, 16); g.fill();
    g.strokeStyle = '#1b3ab0'; g.lineWidth = 3; g.stroke();
    mark(g, cell * 3 + 52, H / 2, 74, '#1b3ab0');
    g.fillStyle = '#1b3ab0'; g.font = `700 54px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('YAMA MART', cell * 3 + 100, H / 2 + 3);
    // on the right, the greens and the fruit
    for (const [i, col, txt, n] of [[5.25, '#3aa45a', '野菜', 1], [6.25, '#e8483f', 'くだもの', 2]]) {
      const x = i * cell;
      g.fillStyle = '#fdfbf4'; g.beginPath(); g.roundRect(x, H * 0.16, cell - 8, H * 0.68, 36); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(x + 42, H / 2, 25, 0, 7); g.fill();
      g.fillStyle = '#25304f'; g.font = `700 ${n === 1 ? 38 : 30}px ${FONT}`; g.textAlign = 'left'; g.fillText(txt, x + 76, H / 2 + 2);
    }
  });
}
const poster = (key, w, h, bg, draw) => label(key, w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); draw(g, w, h); });
const text = (g, s, x, y, size, col, weight = 700) => { g.fillStyle = col; g.font = `${weight} ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); };
function nobori(word) { // a tall red banner, the words running down it
  return poster('nobori' + word, 64, 256, '#e8483f', (g, w, h) => {
    g.fillStyle = '#fdfbf4'; g.fillRect(0, 0, w, 20);
    [...word].forEach((c, i, all) => text(g, c, w / 2, 26 + (h - 40) * ((i + 0.5) / all.length), 44, '#fff8e6'));
  });
}

export function shop(scene, life) {
  const k = new Kit(), g = new Kit(), group = new THREE.Group();
  const WALL = 0xd4d2d0, FRAME = 0x8d919c, TILE = 0xa8b6c9;
  // the pavement it stands on, floor, back, left end, ceiling, and the tiled right end
  k.box(RIGHT - LEFT + 0.6, 0.1, BACK * -1 + 0.8 + 0.1, 0xc9c6c4, 0, 0.05, -1.09, { r: 0.04 });
  k.box(RIGHT - LEFT, 0.02, 2, 0xf1ece0, 0, FLOOR, (FRONT + BACK) / 2, { r: 0 });
  k.box(RIGHT - LEFT, CEIL + 0.1, 0.08, WALL, 0, (CEIL + FLOOR) / 2 + 0.05, BACK, { r: 0.02 });
  k.box(0.1, CEIL + 0.1, 2, WALL, LEFT + 0.05, (CEIL + FLOOR) / 2 + 0.05, (FRONT + BACK) / 2, { r: 0.02 });
  k.box(RIGHT - GLASS_END, CEIL + 0.1, 2, TILE, (RIGHT + GLASS_END) / 2, (CEIL + FLOOR) / 2 + 0.05, (FRONT + BACK) / 2, { r: 0.03 });
  k.box(RIGHT - LEFT + 0.1, 0.1, 2.06, 0xe9e5dc, 0, CEIL + 0.03, (FRONT + BACK) / 2, { r: 0.02 });
  // the roof: the body, the grey upstand, two fans
  k.box(RIGHT - LEFT + 0.24, 0.13, 2.36, FRAME, 0, 1.83, (FRONT + BACK) / 2 + 0.03, { r: 0.05 });
  k.box(RIGHT - LEFT + 0.05, 0.4, 2.1, 0xc9cace, 0, 1.56, (FRONT + BACK) / 2, { r: 0.04 });
  for (const x of [-2.1, 1.6]) { k.box(0.5, 0.22, 0.34, 0xe3e2de, x, 2.0, -1.5, { r: 0.05 }); k.add(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), 0x6c7280, x, 2.11, -1.5); }

  // the tile lines on the right wall, painted once
  const tiles = label('tiles', 128, 128, (c, w, h) => { c.fillStyle = '#a8b6c9'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8c9bb0'; c.lineWidth = 3; for (let i = 0; i <= 8; i++) { const p = (i * w) / 8; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, h); c.moveTo(0, p); c.lineTo(w, p); c.stroke(); } });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(1.5, 1.25);
  group.add(picture(tiles, RIGHT - GLASS_END - 0.04, CEIL - FLOOR + 0.05, (RIGHT + GLASS_END) / 2, (CEIL + FLOOR) / 2, FRONT + 0.005, { basic: false }));

  // the window frames, the low cream wall under the windows on the left, the band over the door
  for (const x of [-3.52, -2.55, -1.5, -0.3, 0.75, 1.42, GLASS_END]) k.box(0.05, CEIL - FLOOR, 0.05, FRAME, x, (CEIL + FLOOR) / 2, FRONT, { r: 0.012 });
  k.box(GLASS_END - LEFT, 0.07, 0.07, FRAME, (GLASS_END + LEFT) / 2, CEIL - 0.03, FRONT, { r: 0.015 });
  k.box(GLASS_END - LEFT, 0.04, 0.05, FRAME, (GLASS_END + LEFT) / 2, FLOOR + 0.02, FRONT, { r: 0.012 });
  k.box(-1.5 - -3.52, 0.2, 0.06, 0xefe7d4, (-1.5 + -3.52) / 2, FLOOR + 0.1, FRONT, { r: 0.02 });
  k.box(0.68, 0.03, 0.03, FRAME, -2.03, 0.92, FRONT, { r: 0.01 });

  // ---------- inside ----------
  const tones = [0xf25f5c, 0xffc857, 0x7ac74f, 0x5bc0eb, 0xf8a5c2, 0xfdfbf4, 0xff9f68, 0x9b8cd8, 0x4c6fd1, 0xe9d8a6];
  const small = new THREE.BoxGeometry(1, 1, 1);
  let n = 0;
  const goods = (x0, x1, y, z, d = 0.1) => { for (let x = x0; x < x1; x += 0.075) { const h = 0.065 + r(n) * 0.055; k.add(small, tones[Math.floor(r(n + 0.5) * tones.length)], x, y + h / 2, z + (r(n + 0.2) - 0.5) * 0.02, { s: [0.062, h, d] }); n++; } };
  // two rows of shelves
  for (const z of [-1.1, -1.65]) for (const [x0, x1] of [[-3.25, -1.65], [-0.2, 1.1]]) {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    k.box(w + 0.04, 0.62, 0.05, 0xf4f1ea, cx, FLOOR + 0.31, z, { r: 0.012 });
    for (const y of [0.1, 0.28, 0.46, 0.64]) {
      k.box(w + 0.04, 0.018, 0.3, 0xfaf8f2, cx, FLOOR + y - 0.01, z, { r: 0 });
      goods(x0 + 0.03, x1 - 0.03, FLOOR + y, z + 0.09); goods(x0 + 0.03, x1 - 0.03, FLOOR + y, z - 0.09);
    }
    k.box(w + 0.06, 0.08, 0.34, 0x2f55c4, cx, FLOOR + 0.04, z, { r: 0.01 });
  }
  // onigiri on the front shelf: little triangles with a dark seaweed band
  const tri = new THREE.CylinderGeometry(0.052, 0.052, 0.03, 3).rotateX(Math.PI / 2);
  for (let i = 0; i < 9; i++) { const x = -3.15 + i * 0.13; k.add(tri, 0xfdfbf4, x, FLOOR + 0.53, -0.92, { rz: Math.PI / 6 }); k.box(0.03, 0.04, 0.034, 0x25304f, x, FLOOR + 0.5, -0.92, { r: 0 }); }
  // the fridges along the back: glass doors, bright, full of bottles
  k.box(5.3, 0.86, 0.26, 0xdfe2e6, -0.65, FLOOR + 0.43, BACK + 0.17, { r: 0.012 });
  g.box(5.1, 0.74, 0.02, 0xb8dcf2, -0.65, FLOOR + 0.43, BACK + 0.305, { r: 0, glow: 0.82 });
  for (let row = 0; row < 3; row++) k.box(5.1, 0.016, 0.1, 0xf4f1ea, -0.65, FLOOR + 0.095 + row * 0.24, BACK + 0.34, { r: 0 });
  const bottle = new THREE.CylinderGeometry(0.022, 0.026, 0.13, 7);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 90; i++) k.add(bottle, tones[Math.floor(r(i * 3 + row) * tones.length)], -3.14 + i * 0.056, FLOOR + 0.17 + row * 0.24, BACK + 0.33);
  for (let i = 0; i <= 9; i++) k.box(0.02, 0.76, 0.03, 0xaab0ba, -3.2 + i * 0.567, FLOOR + 0.43, BACK + 0.345, { r: 0.004 });
  // the till, on the right, with its coffee machine
  k.box(1.0, 0.27, 0.34, 0xf4f1ea, 1.55, FLOOR + 0.135, -0.82, { r: 0.03 });
  k.box(1.04, 0.035, 0.38, 0x2f55c4, 1.55, FLOOR + 0.28, -0.82, { r: 0.01 });
  k.box(0.16, 0.1, 0.14, 0x4b5364, 1.2, FLOOR + 0.345, -0.82, { r: 0.02 });
  g.box(0.12, 0.06, 0.01, 0x9ce8d8, 1.2, FLOOR + 0.35, -0.745, { r: 0, glow: 1.2 });
  k.box(0.2, 0.3, 0.18, 0x31384a, 1.9, FLOOR + 0.45, -0.82, { r: 0.03 });
  g.box(0.1, 0.05, 0.01, 0xffb27a, 1.9, FLOOR + 0.53, -0.725, { r: 0, glow: 1.2 });
  // the ceiling lights, in rows
  for (const z of [-0.8, -1.4, -2]) for (let i = 0; i < 6; i++) g.box(0.68, 0.015, 0.09, 0xfff5dd, -3.0 + i * 0.95, CEIL - 0.03, z, { r: 0, glow: 1.5 });

  // the door mat, and two little stone cones either side of it
  k.box(1.12, 0.012, 0.42, 0x4a5168, DOOR, 0.105, FRONT + 0.26, { r: 0 });
  const cone = new THREE.CylinderGeometry(0.05, 0.12, 0.2, 14);
  for (const x of [DOOR - 0.82, DOOR + 0.82]) { k.add(cone, 0xf0ece4, x, 0.2, 0.0); k.ball(0.052, 0xf0ece4, x, 0.3, 0.0); }

  // two vending machines and the bins, against the tile
  for (const [x, col] of [[2.62, 0xe8483f], [3.2, 0x2f7fd1]]) {
    k.box(0.52, 0.86, 0.34, col, x, 0.53, FRONT + 0.19, { r: 0.04 });
    g.box(0.4, 0.42, 0.012, 0xfff3d6, x, 0.72, FRONT + 0.365, { r: 0.008, glow: 1.25 });
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) k.box(0.05, 0.09, 0.012, tones[Math.floor(r(x * 9 + row * 7 + i) * tones.length)], x - 0.15 + i * 0.06, 0.59 + row * 0.13, FRONT + 0.375, { r: 0 });
    k.box(0.3, 0.08, 0.02, 0x31384a, x, 0.24, FRONT + 0.365, { r: 0.01 });
  }
  k.box(0.26, 0.42, 0.24, 0x7f8798, 1.82, 0.31, 0.02, { r: 0.05 });
  k.box(0.28, 0.05, 0.26, 0x5c6680, 1.82, 0.54, 0.02, { r: 0.02 });

  const body = k.bake(toy()); body.castShadow = body.receiveShadow = true; group.add(body);
  group.add(g.bake(lit()));

  // the fascia, one long picture
  group.add(picture(fasciaTexture(), RIGHT - LEFT - 0.02, 0.38, 0, 1.56, FRONT + 0.058, { glow: 0.97 }));
  // the side band of the fascia, plain, so it reads from an angle
  const end = new Kit(); end.box(0.01, 0.38, 2.04, 0xfdfbf4, RIGHT + 0.03, 1.56, (FRONT + BACK) / 2, { r: 0, glow: 1.1 }); end.box(0.01, 0.38, 2.04, 0xfdfbf4, LEFT - 0.03, 1.56, (FRONT + BACK) / 2, { r: 0, glow: 1.1 }); group.add(end.bake(lit()));

  // the banners and posters in the windows
  group.add(picture(nobori('おでん'), 0.24, 0.72, -2.95, 0.68, FRONT - 0.04, { glow: 1.0 }));
  group.add(picture(nobori('やきいも'), 0.24, 0.72, 0.12, 0.68, FRONT - 0.04, { glow: 1.0 }));
  group.add(picture(poster('banner', 512, 72, '#e8483f', (c, w, h) => text(c, 'いらっしゃいませ', w / 2, h / 2 + 2, 42, '#fff8e6')), 0.92, 0.13, -2.03, CEIL - 0.17, FRONT - 0.03, { glow: 1.08 }));
  group.add(picture(poster('atm', 96, 160, '#fdfbf4', (c, w, h) => { c.fillStyle = '#2f55c4'; c.fillRect(0, 0, w, 54); text(c, 'ATM', w / 2, 29, 32, '#fff'); text(c, '24', w / 2, 88, 40, '#2f55c4'); text(c, 'じかん', w / 2, 128, 24, '#2f55c4'); }), 0.17, 0.28, 0.42, 0.42, FRONT - 0.02, { glow: 1.05 }));
  group.add(picture(poster('wall', 96, 144, '#f7a8b8', (c, w, h) => { mark(c, w / 2, 56, 62); text(c, 'あたらしい', w / 2, 106, 15, '#25304f'); text(c, 'おにぎり', w / 2, 128, 20, '#25304f'); }), 0.22, 0.33, 2.3, 0.97, FRONT + 0.012, { glow: 1.02 }));

  // the glass (drawn after what's behind it), and the two doors
  const glass = new THREE.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.05, roughness: 0.1, metalness: 0.1, depthWrite: false });
  const pane = (a, b, y0 = FLOOR, y1 = CEIL - 0.05) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(b - a, y1 - y0), glass); m.position.set((a + b) / 2, (y0 + y1) / 2, FRONT); group.add(m); };
  pane(-3.52, -1.5, FLOOR + 0.2); pane(-0.3, GLASS_END);
  const W = 0.6, doors = [-1, 1].map((s) => {
    const d = new THREE.Group();
    const kd = new Kit(); kd.box(W, CEIL - FLOOR - 0.08, 0.035, FRAME, 0, 0, 0, { r: 0.012 });
    d.add(new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, CEIL - FLOOR - 0.16), new THREE.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.08, roughness: 0.1 })));
    d.children[0].position.z = 0.02;
    const fr = new Kit();
    fr.box(W, 0.04, 0.03, FRAME, 0, (CEIL - FLOOR - 0.12) / 2, 0, { r: 0.01 }); fr.box(W, 0.04, 0.03, FRAME, 0, -(CEIL - FLOOR - 0.12) / 2, 0, { r: 0.01 });
    fr.box(0.04, CEIL - FLOOR - 0.1, 0.03, FRAME, W / 2 - 0.02, 0, 0, { r: 0.01 }); fr.box(0.04, CEIL - FLOOR - 0.1, 0.03, FRAME, -W / 2 + 0.02, 0, 0, { r: 0.01 });
    d.add(fr.bake(toy()));
    d.position.set(DOOR + s * W / 2, (CEIL + FLOOR) / 2 - 0.03, FRONT + 0.01);
    d.userData.s = s; group.add(d); return d;
  });
  let open = 0;
  // `near`: is anyone at the door? the doors slide apart, and shut again behind them
  const update = (dt, near) => {
    open = THREE.MathUtils.clamp(open + (near ? dt * 1.6 : -dt * 1.1), 0, 1);
    const e = open * open * (3 - 2 * open);
    for (const d of doors) d.position.x = DOOR + d.userData.s * (W / 2 + e * (W - 0.08));
  };
  scene.add(group);

  // the shop's light: two warm lamps, and the glow it throws on the ground, drawn rather than lit
  for (const x of [-2.4, 0.6]) { const p = new THREE.PointLight(0xffe2b8, 1.5, 5.5, 1.8); p.position.set(x, CEIL - 0.22, -1.2); scene.add(p); }
  const pool = label('pool', 256, 256, (c, w, h) => { const gr = c.createRadialGradient(w / 2, 0, 0, w / 2, 0, h); gr.addColorStop(0, 'rgba(255,226,170,0.62)'); gr.addColorStop(0.55, 'rgba(255,214,150,0.2)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const glowOn = picture(pool, 9.4, 3.2, -0.6, 0.075, 1.8, { rx: -Math.PI / 2, transparent: true });
  glowOn.renderOrder = 1; scene.add(glowOn);
  return { update };
}

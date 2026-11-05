// Outside the window (room/DESIGN.md §0 F・G, §4.3): a Tokyo night in the rain — blocks of flats with their windows
// lit, a red light blinking on a roof, the elevated line with a train going by now and then, rain falling in front.
// All of it stands just behind the window wall and is only seen through the window.
import * as THREE from 'three';
import { canvasTex } from './surfaces.js';

const CITY = (w, h) => canvasTex(w, h, (x) => {
  const sky = x.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#141a2c'); sky.addColorStop(0.6, '#232a40'); sky.addColorStop(1, '#3a3440'); // (the low sky lit orange-grey by the city)
  x.fillStyle = sky; x.fillRect(0, 0, w, h);
  const rows = [[0.62, '#1d2232', 0.25, 14, 40], [0.48, '#151926', 0.5, 9, 70], [0.3, '#0e1119', 0.8, 6, 110]];
  for (const [base, col, lit, cell, bw] of rows) {
    let bx = -10;
    while (bx < w) {
      const W = bw * (0.6 + Math.random()), H = h * (1 - base) * (0.3 + Math.random() * 0.7) + h * 0.05, top = h - H;
      x.fillStyle = col; x.fillRect(bx, top, W, H);
      for (let yy = top + cell; yy < h - cell; yy += cell * 1.5) for (let xx = bx + cell * 0.6; xx < bx + W - cell; xx += cell * 1.3) {
        if (Math.random() > lit * 0.7) continue;
        x.fillStyle = Math.random() < 0.7 ? `rgba(255,${190 + Math.random() * 40},${120 + Math.random() * 50},${0.5 + Math.random() * 0.4})` : `rgba(${170 + Math.random() * 40},210,255,${0.4 + Math.random() * 0.4})`;
        x.fillRect(xx, yy, cell * 0.7, cell * 0.8);
      }
      bx += W + Math.random() * 8;
    }
  }
  // the viaduct of the elevated line across the lower part
  x.fillStyle = '#0a0c12'; x.fillRect(0, h * 0.74, w, h * 0.035); for (let px = 20; px < w; px += 90) x.fillRect(px, h * 0.74, 14, h * 0.26);
  x.fillStyle = 'rgba(255,220,170,0.6)'; for (let px = 40; px < w; px += 60) x.fillRect(px, h * 0.735, 3, 4); // its lamps
});

const STREAKS = () => canvasTex(256, 256, (x, w, h) => {
  x.clearRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const px = Math.random() * w, py = Math.random() * h, l = 10 + Math.random() * 24; x.strokeStyle = `rgba(200,215,235,${0.12 + Math.random() * 0.25})`; x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.lineTo(px - l * 0.08, py + l); x.stroke(); }
});

// cx, cy: the window's centre; z: the wall's outer face
export function outside(scene, { cx, cy, z, x0, x1, h = 1.6 }) { // x0…x1: kept inside the wall it hides behind (seen slantwise from the open side, anything further out shows past the wall's end)
  const w = x1 - x0, mx = (x0 + x1) / 2;
  const g = new THREE.Group(); scene.add(g);
  const city = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: CITY(1024, 512), toneMapped: false, color: 0xb8bcc8 }));
  city.position.set(mx, cy - 0.1, z - 0.5); g.add(city);
  // a red light on a roof, blinking
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false }));
  red.position.set(cx + 0.3, cy + 0.3, z - 0.47); g.add(red);
  // the train: four lit carriages that cross every half minute or so
  const train = new THREE.Group(); train.position.set(cx, cy - 0.32, z - 0.42); g.add(train);
  const body = new THREE.MeshBasicMaterial({ color: 0x2a3040 }), lit = new THREE.MeshBasicMaterial({ color: 0xfff1cf, toneMapped: false }), band = new THREE.MeshBasicMaterial({ color: 0x3fae5a });
  for (let k = 0; k < 4; k++) {
    const car = new THREE.Group(); car.position.x = k * 0.42; train.add(car);
    car.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.05), body));
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.052), lit); win.position.y = 0.012; car.add(win);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.053), band); b.position.y = -0.022; car.add(b); // the line's green band
  }
  // the rain: two sheets of streaks falling at different speeds
  const sheets = [0.18, 0.32].map((d, i) => {
    const t = STREAKS(); t.repeat.set(2 + i, 1.5 + i);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.3), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.8 - i * 0.25 }));
    m.position.set(mx, cy, z - d); g.add(m); return t;
  });
  let next = 4, run = -1;
  const update = (t, dt, rain = 1) => {
    red.visible = Math.sin(t * 2.2) > 0.2;
    if (run < 0 && (next -= dt) <= 0) { run = 0; next = 25 + Math.random() * 15; }
    if (run >= 0) { run += dt; train.position.x = cx - 2.4 + run * 0.55; if (run > 9) run = -1; }
    train.children.forEach((c) => (c.visible = Math.abs(train.position.x + c.position.x - mx) < w / 2 - 0.2)); // (only while it is behind the wall)
    train.visible = run >= 0;
    sheets.forEach((s, i) => { s.offset.y += dt * (1.6 + i * 0.9); s.offset.x += dt * 0.05; });
  };
  return { group: g, update, train: () => { run = 0; next = 30; } }; // (train(): one now, for the story)
}

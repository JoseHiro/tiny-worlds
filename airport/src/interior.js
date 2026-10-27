// Terminal interior parts, built at person scale (a character is 1.3 tall).
// Like parts.js: every builder sits on y = 0; "front" (the passenger side) faces +Z.
// group.userData.update(t, dt) animates screens / belts when present.
import * as THREE from 'three';
import { PALETTE, mat, mesh, rbox, box, cyl, person } from './parts.js';
import { bakeStatic } from './merge.js';

// Interior dimensions (see DESIGN.md §4). Tuned to the chibi characters:
// hips at 0.32, shoulders at 0.72, eyes at ~1.0.
export const DIM = {
  ceiling: 2.6,
  deskTop: 0.62,
  seat: 0.3,
  beltTop: 0.45,
  stanchion: 0.55,
};

export const metal = () => mat(0xc9ccd1, { metalness: 0.6, roughness: 0.3 });

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function screenMat(color, intensity = 0.9) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3 });
}

// ---------- luggage ----------

export const BAG_COLORS = [PALETTE.orange, PALETTE.navy, PALETTE.teal, PALETTE.yellow, PALETTE.red, PALETTE.sky, PALETTE.brown, PALETTE.green];

// kind: 'hard' (spinner suitcase), 'soft' (duffel), 'box' (taped carton). lying = on its back, as on a belt.
export function luggage(kind = 'hard', color = PALETTE.orange, { lying = false } = {}) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  if (kind === 'hard') {
    inner.add(rbox(0.34, 0.46, 0.2, 0.05, mat(color, { roughness: 0.45 }), 0, 0.27, 0));
    for (const x of [-0.08, 0.08]) inner.add(box(0.025, 0.4, 0.205, mat(color, { roughness: 0.3 }), x, 0.27, 0)); // ribs
    inner.add(rbox(0.14, 0.03, 0.05, 0.012, mat(PALETTE.ink), 0, 0.515, 0)); // handle
    inner.add(box(0.36, 0.02, 0.06, mat(PALETTE.white), 0, 0.3, 0.09)); // name tag strap
    for (const x of [-0.12, 0.12]) for (const z of [-0.07, 0.07]) inner.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(PALETTE.ink), x, 0.025, z));
    if (lying) { inner.rotation.x = -Math.PI / 2; inner.position.set(0, 0.1, 0.27); }
  } else if (kind === 'soft') {
    const body = mesh(new THREE.CapsuleGeometry(0.12, 0.26, 6, 12), mat(color, { roughness: 0.85 }), 0, 0.13, 0);
    body.rotation.z = Math.PI / 2;
    inner.add(body);
    inner.add(box(0.3, 0.015, 0.01, mat(PALETTE.ink), 0, 0.25, 0)); // zip
    const strap = mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 14, Math.PI), mat(PALETTE.ink), 0, 0.24, 0);
    inner.add(strap);
  } else {
    inner.add(rbox(0.34, 0.24, 0.28, 0.02, mat(0xc79a68, { roughness: 0.95 }), 0, 0.12, 0));
    inner.add(box(0.345, 0.012, 0.07, mat(0xe8d6b0), 0, 0.243, 0)); // tape
  }
  g.userData.kind = kind;
  return g;
}

// ---------- conveyor ----------

let beltImage = null;
function beltTexture() {
  if (!beltImage) {
    beltImage = canvasTexture(64, 64, (g, w, h) => {
      g.fillStyle = '#3d424d';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#4b515d';
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 6, h);
    });
  }
  const t = beltImage.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// Straight belt running along +X, top surface at `height`. userData.speed in units/sec.
export function conveyor(length, { width = 0.55, height = DIM.beltTop, legs = true, speed = 0.6 } = {}) {
  const g = new THREE.Group();
  const tex = beltTexture();
  tex.repeat.set(length / 0.3, 1);
  g.add(box(length, 0.05, width, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), 0, height - 0.025, 0));
  g.add(box(length, 0.14, width + 0.02, mat(PALETTE.darkGrey), 0, height - 0.12, 0));
  for (const s of [1, -1]) g.add(box(length, 0.1, 0.04, mat(PALETTE.yellow), 0, height + 0.02, s * (width / 2 + 0.02)));
  if (legs && height > 0.25) {
    const n = Math.max(2, Math.ceil(length / 1.5) + 1);
    for (let i = 0; i < n; i++) {
      const x = -length / 2 + 0.1 + (i * (length - 0.2)) / (n - 1);
      for (const s of [1, -1]) g.add(cyl(0.025, 0.025, height - 0.18, metal(), x, (height - 0.18) / 2, s * (width / 2 - 0.05), 6));
    }
  }
  g.userData = { kind: 'conveyor', length, height, speed, update: (t, dt) => { tex.offset.x -= (dt * g.userData.speed) / 0.3; } };
  return g;
}

// ---------- R1 check-in hall ----------

// Island of `desks` check-in positions. Passengers stand on +Z; agents and the
// collector belt are behind on -Z. userData.desks[i] gives the useful spots.
export function checkInIsland({ desks = 6, label = 'A', first = 1, accent = PALETTE.orange } = {}) {
  const g = new THREE.Group();
  const pitch = 1.6;
  const L = desks * pitch + 0.6;
  const ud = (g.userData = { kind: 'checkInIsland', desks: [], length: L, screens: [] });
  const white = mat(PALETTE.white);

  for (let i = 0; i < desks; i++) {
    const x = (i - (desks - 1) / 2) * pitch;
    // desk
    g.add(rbox(1.0, DIM.deskTop, 0.6, 0.06, white, x - 0.25, DIM.deskTop / 2, 0.2));
    g.add(box(1.04, 0.04, 0.66, mat(PALETTE.cream), x - 0.25, DIM.deskTop + 0.02, 0.2));
    g.add(box(1.0, 0.07, 0.02, mat(accent), x - 0.25, DIM.deskTop - 0.1, 0.51));
    // agent's monitor (back faces the passenger)
    g.add(cyl(0.02, 0.02, 0.16, metal(), x - 0.4, DIM.deskTop + 0.1, 0.12, 6));
    g.add(rbox(0.38, 0.26, 0.04, 0.02, mat(PALETTE.ink), x - 0.4, DIM.deskTop + 0.28, 0.12));
    const scr = mesh(new THREE.PlaneGeometry(0.34, 0.22), screenMat(0x9fd2e0, 0.5), x - 0.4, DIM.deskTop + 0.28, 0.097);
    scr.rotation.y = Math.PI;
    g.add(scr);
    ud.screens.push(scr);
    // boarding-pass printer + keyboard
    g.add(rbox(0.16, 0.08, 0.16, 0.02, mat(PALETTE.grey), x - 0.05, DIM.deskTop + 0.08, 0.3));
    g.add(box(0.28, 0.015, 0.1, mat(PALETTE.ink), x - 0.4, DIM.deskTop + 0.05, -0.02));
    // bag scale between desks
    g.add(rbox(0.52, 0.2, 0.62, 0.04, mat(PALETTE.grey), x + 0.52, 0.1, 0.2));
    g.add(box(0.46, 0.02, 0.56, metal(), x + 0.52, 0.21, 0.2));
    g.add(cyl(0.02, 0.02, 0.5, metal(), x + 0.78, 0.45, 0.48, 6));
    g.add(box(0.14, 0.08, 0.03, mat(PALETTE.ink), x + 0.78, 0.72, 0.48));
    g.add(box(0.1, 0.04, 0.005, screenMat(0xff9b5c, 0.9), x + 0.78, 0.72, 0.497));
    // scale → belt chute through the desk line
    g.add(box(0.46, 0.02, 0.5, mat(PALETTE.darkGrey), x + 0.52, 0.32, -0.38));
    ud.desks.push({
      agent: new THREE.Vector3(x - 0.3, 0, -0.42), // stands facing +Z
      passenger: new THREE.Vector3(x - 0.2, 0, 0.95), // stands facing -Z
      scale: new THREE.Vector3(x + 0.52, 0.22, 0.2),
      belt: new THREE.Vector3(x + 0.52, DIM.beltTop, -1.15),
    });
  }

  // collector belt and back wall
  const belt = conveyor(L, { width: 0.55 });
  belt.position.z = -1.15;
  g.add(belt);
  ud.belt = belt;
  g.add(box(L, 0.02, 0.9, mat(0x7c828c, { roughness: 0.9 }), 0, 0.01, -0.45)); // staff mat
  g.add(rbox(L, 2.0, 0.18, 0.04, white, 0, 1.0, -1.62));

  const hex = '#' + accent.toString(16).padStart(6, '0');
  // front: one number per desk, centred over it; back: the island's name
  const header = canvasTexture(2048, 128, (c, w, h) => {
    c.fillStyle = hex;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.font = '500 62px "JetBrains Mono", monospace';
    for (let i = 0; i < desks; i++) {
      const deskX = (i - (desks - 1) / 2) * pitch - 0.25;
      c.fillText(`${label}${String(first + i).padStart(2, '0')}`, ((deskX + L / 2) / L) * w, h / 2 + 4);
    }
  });
  const back = canvasTexture(2048, 128, (c, w, h) => {
    c.fillStyle = hex;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.font = '600 60px Inter, system-ui, sans-serif';
    c.fillText(`CHECK-IN  ${label}${String(first).padStart(2, '0')}–${String(first + desks - 1).padStart(2, '0')}`, w / 2, h / 2 + 2);
  });
  const sign = mesh(new THREE.BoxGeometry(L, 0.42, 0.22), [white, white, white, white,
    new THREE.MeshStandardMaterial({ map: header, roughness: 0.5 }), new THREE.MeshStandardMaterial({ map: back, roughness: 0.5 })], 0, 1.85, -1.6);
  g.add(sign);
  ud.update = (t, dt) => {
    belt.userData.update(t, dt);
    ud.screens.forEach((s, i) => { s.material.emissiveIntensity = 0.4 + 0.15 * Math.sin(t * 2 + i); });
  };
  return g;
}

// Self check-in kiosk; screen tilted toward the user on +Z.
export function kiosk({ accent = PALETTE.orange } = {}) {
  const g = new THREE.Group();
  g.add(rbox(0.5, 0.06, 0.44, 0.02, mat(PALETTE.darkGrey), 0, 0.03, 0));
  g.add(rbox(0.46, 0.92, 0.38, 0.08, mat(PALETTE.white), 0, 0.52, -0.02));
  for (const s of [1, -1]) g.add(box(0.02, 0.86, 0.36, mat(accent), s * 0.235, 0.52, -0.02));
  const head = new THREE.Group();
  head.position.set(0, 1.0, 0.02);
  head.rotation.x = 0.55;
  head.add(rbox(0.48, 0.06, 0.42, 0.03, mat(PALETTE.white), 0, 0, 0));
  const screen = mesh(new THREE.PlaneGeometry(0.4, 0.32), screenMat(0x7fd0c4, 0.7), 0, 0.032, 0);
  screen.rotation.x = -Math.PI / 2;
  head.add(screen);
  g.add(head);
  g.add(box(0.2, 0.02, 0.01, mat(PALETTE.ink), 0, 0.78, 0.175)); // printer slot
  g.add(box(0.12, 0.08, 0.01, mat(PALETTE.ink), 0.12, 0.66, 0.175)); // card reader
  g.userData = {
    kind: 'kiosk',
    user: new THREE.Vector3(0, 0, 0.55),
    active: false,
    update: (t) => { screen.material.emissiveIntensity = g.userData.active ? 1.1 + Math.sin(t * 6) * 0.2 : 0.55; },
  };
  return g;
}

// Serpentine queue: `lanes` lanes of `length` along +X, lanes stacked toward +Z.
// Entrance at (0, lane 0); userData.path is the walking line through it (local coords).
export function queueMaze({ lanes = 3, length = 5, gap = 1.0, color = PALETTE.navy } = {}) {
  const g = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, DIM.stanchion, 8);
  const baseGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.03, 14);
  const capGeo = new THREE.SphereGeometry(0.045, 10, 8);
  const tapeMat = mat(color);
  const posts = new Map();
  const post = (x, z) => {
    const key = `${x.toFixed(2)},${z.toFixed(2)}`;
    if (posts.has(key)) return;
    posts.set(key, true);
    g.add(mesh(postGeo, metal(), x, DIM.stanchion / 2, z), mesh(baseGeo, metal(), x, 0.015, z), mesh(capGeo, metal(), x, DIM.stanchion, z));
  };
  const tape = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(1, Math.ceil(len / 1.3));
    for (let i = 0; i < steps; i++) {
      const a = i / steps, b = (i + 1) / steps;
      const ax = x0 + (x1 - x0) * a, az = z0 + (z1 - z0) * a, bx = x0 + (x1 - x0) * b, bz = z0 + (z1 - z0) * b;
      post(ax, az);
      post(bx, bz);
      const t = box(Math.hypot(bx - ax, bz - az), 0.05, 0.012, tapeMat, (ax + bx) / 2, DIM.stanchion - 0.06, (az + bz) / 2);
      t.rotation.y = -Math.atan2(bz - az, bx - ax);
      t.castShadow = false;
      g.add(t);
    }
  };
  // lines between lanes; internal lines leave a turning gap at alternating ends
  for (let k = 0; k <= lanes; k++) {
    const z = k * gap;
    if (k === 0 || k === lanes) tape(0, z, length, z);
    else if (k % 2) tape(0, z, length - gap, z);
    else tape(gap, z, length, z);
  }
  // end caps (closed except the entrance and the exit)
  const exitAtEnd = lanes % 2 === 1;
  for (let i = 0; i < lanes; i++) {
    if (i !== 0) tape(0, i * gap, 0, (i + 1) * gap);
    if (!(i === lanes - 1 && exitAtEnd)) tape(length, i * gap, length, (i + 1) * gap);
  }
  if (!exitAtEnd) { /* exit at x = 0 on the last lane: leave that cap open */ }
  const path = [];
  for (let i = 0; i < lanes; i++) {
    const z = (i + 0.5) * gap;
    const [a, b] = i % 2 ? [length - 0.4, 0.4] : [0.4, length - 0.4];
    if (i === 0) path.push(new THREE.Vector3(-0.6, 0, z));
    path.push(new THREE.Vector3(a, 0, z), new THREE.Vector3(b, 0, z));
    if (i === lanes - 1) path.push(new THREE.Vector3(i % 2 ? -0.6 : length + 0.6, 0, z));
  }
  g.userData = { kind: 'queue', path, lanes, length, gap };
  return g;
}

// Flight information display. setRows([{time, flight, dest, gate, status}]) redraws it.
export function fids({ width = 3.2, height = 1.5, title = '出発 Departures', standing = true } = {}) {
  const g = new THREE.Group();
  const cw = 1024, ch = Math.round((1024 * height) / width);
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.4 });
  const bottom = standing ? 0.9 : 0;
  g.add(rbox(width + 0.16, height + 0.16, 0.12, 0.04, mat(PALETTE.ink), 0, bottom + height / 2, 0));
  const face = mesh(new THREE.PlaneGeometry(width, height), screen, 0, bottom + height / 2, 0.065);
  g.add(face);
  if (standing) for (const s of [1, -1]) g.add(cyl(0.05, 0.05, bottom, metal(), s * (width / 2 - 0.3), bottom / 2, 0, 8));

  const STATUS = { '搭乗中': '#4fd1b9', '遅延': '#ff8a5c', '欠航': '#ff5c5c', '定刻': '#f4f0e8', '到着': '#8fd0ff', '手続中': '#f2c46b' };
  g.userData = {
    kind: 'fids',
    setRows(rows, clock = '14:05') {
      const x = c.getContext('2d');
      x.fillStyle = '#18202f';
      x.fillRect(0, 0, cw, ch);
      x.fillStyle = '#f2b84b';
      x.fillRect(0, 0, cw, 70);
      x.fillStyle = '#1c2232';
      x.font = '600 38px Inter, system-ui, sans-serif';
      x.textBaseline = 'middle';
      x.fillText(title, 24, 37);
      x.font = '500 38px "JetBrains Mono", monospace';
      x.textAlign = 'right';
      x.fillText(clock, cw - 24, 37);
      x.textAlign = 'left';
      const cols = [24, 170, 360, 700, 800];
      x.font = '500 22px Inter, system-ui, sans-serif';
      x.fillStyle = '#8a93a8';
      ['時刻', '便名', '行き先', 'ゲート', '状況'].forEach((h, i) => x.fillText(h, cols[i], 100));
      const rowH = (ch - 125) / Math.max(rows.length, 6);
      rows.forEach((r, i) => {
        const y = 125 + rowH * (i + 0.5);
        if (i % 2) { x.fillStyle = '#1f293b'; x.fillRect(0, y - rowH / 2, cw, rowH); }
        x.font = '500 34px "JetBrains Mono", monospace';
        x.fillStyle = '#f4f0e8';
        x.fillText(r.time, cols[0], y);
        x.fillText(r.flight, cols[1], y);
        x.font = '600 34px Inter, system-ui, sans-serif';
        x.fillText(r.dest, cols[2], y);
        x.font = '500 34px "JetBrains Mono", monospace';
        x.fillText(r.gate, cols[3], y);
        x.font = '600 30px Inter, system-ui, sans-serif';
        x.fillStyle = STATUS[r.status] ?? '#f4f0e8';
        x.fillText(r.status, cols[4], y);
      });
      tex.needsUpdate = true;
    },
  };
  g.userData.setRows([
    { time: '14:20', flight: 'MA 237', dest: '那覇', gate: 'A1', status: '搭乗中' },
    { time: '14:35', flight: 'MA 374', dest: '札幌', gate: 'A2', status: '定刻' },
    { time: '14:50', flight: 'MA 511', dest: '台北', gate: 'A3', status: '手続中' },
    { time: '15:05', flight: 'MA 648', dest: '福岡', gate: 'A4', status: '遅延' },
    { time: '15:20', flight: 'MA 785', dest: 'ソウル', gate: 'A5', status: '定刻' },
    { time: '15:40', flight: 'MA 922', dest: '大阪', gate: 'A6', status: '定刻' },
  ]);
  return g;
}

// Linked airport seating; seats face +Z. userData.seats = local sitting spots (face +Z).
export function bench({ seats = 4, color = PALETTE.navy } = {}) {
  const g = new THREE.Group();
  const w = 0.52;
  const L = seats * w;
  g.add(box(L + 0.1, 0.06, 0.08, metal(), 0, 0.2, -0.05));
  for (const s of [1, -1]) {
    g.add(box(0.05, 0.2, 0.05, metal(), s * (L / 2 - 0.15), 0.1, -0.05));
    g.add(box(0.05, 0.02, 0.5, metal(), s * (L / 2 - 0.15), 0.01, -0.05));
  }
  const seatsOut = [];
  for (let i = 0; i < seats; i++) {
    const x = (i - (seats - 1) / 2) * w;
    g.add(rbox(w - 0.06, 0.07, 0.44, 0.03, mat(color), x, DIM.seat, 0));
    const back = rbox(w - 0.06, 0.4, 0.06, 0.03, mat(color), x, DIM.seat + 0.22, -0.22);
    back.rotation.x = -0.12;
    g.add(back);
    seatsOut.push(new THREE.Vector3(x, 0, 0.05));
  }
  for (let i = 0; i <= seats; i++) g.add(box(0.04, 0.12, 0.34, metal(), (i - seats / 2) * w, DIM.seat + 0.1, 0.02)); // armrests
  g.userData = { kind: 'bench', seats: seatsOut };
  return g;
}

// Luggage trolley pushed by passengers (handle at -X, pushes toward +X).
export function trolley({ bags = [] } = {}) {
  const g = new THREE.Group();
  const frame = mat(0xb7bcc4, { metalness: 0.5, roughness: 0.35 });
  g.add(box(0.7, 0.03, 0.42, frame, 0.05, 0.16, 0));
  g.add(box(0.03, 0.42, 0.42, frame, 0.39, 0.36, 0)); // front rack
  for (const z of [-0.2, 0.2]) {
    g.add(box(0.03, 0.66, 0.03, frame, -0.3, 0.45, z));
    g.add(box(0.7, 0.03, 0.03, frame, 0.05, 0.4, z));
  }
  g.add(cyl(0.025, 0.025, 0.46, mat(PALETTE.orange), -0.32, 0.78, 0, 8)).children.at(-1).rotation.x = Math.PI / 2; // handle
  for (const x of [-0.25, 0.32]) for (const z of [-0.17, 0.17]) {
    const w = cyl(0.06, 0.06, 0.04, mat(PALETTE.ink), x, 0.06, z, 10);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
  let y = 0.18;
  for (const b of bags) {
    const bag = luggage(b.kind, b.color, { lying: b.kind === 'hard' });
    bag.position.set(0.05, y, 0);
    if (b.kind === 'hard') bag.position.z = -0.27;
    g.add(bag);
    y += b.kind === 'hard' ? 0.22 : 0.24;
  }
  g.userData = { kind: 'trolley' };
  return g;
}

// Hanging wayfinding sign (yellow, as in most airports), seen from ±Z.
export function hangingSign({ text = 'チェックイン', sub = 'Check-in', arrow = '→', width = 2.4, color = PALETTE.yellow, height = DIM.ceiling } = {}) {
  const g = new THREE.Group();
  const tex = canvasTexture(1024, 192, (c, w, h) => {
    c.fillStyle = '#' + color.toString(16).padStart(6, '0');
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1c2232';
    c.textBaseline = 'middle';
    c.font = '700 84px Inter, system-ui, sans-serif';
    c.fillText(text, 36, 78);
    c.font = '500 44px Inter, system-ui, sans-serif';
    c.fillText(sub, 36, 150);
    c.font = '700 130px Inter, system-ui, sans-serif';
    c.textAlign = 'right';
    c.fillText(arrow, w - 30, 100);
  });
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 });
  const edge = mat(PALETTE.ink);
  const h = width * (192 / 1024);
  g.add(mesh(new THREE.BoxGeometry(width, h, 0.08), [edge, edge, edge, edge, face, face], 0, height - 0.45, 0));
  for (const s of [1, -1]) g.add(cyl(0.01, 0.01, 0.45 - h / 2, mat(PALETTE.grey), s * (width / 2 - 0.15), height - (0.45 - h / 2) / 2, 0, 4));
  g.userData = { kind: 'sign' };
  return g;
}

export function planter({ size = 1 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.3 * size, 0.24 * size, 0.42 * size, mat(PALETTE.white), 0, 0.21 * size, 0, 16));
  g.add(cyl(0.27 * size, 0.27 * size, 0.02, mat(PALETTE.brown), 0, 0.42 * size, 0, 16));
  const leaves = mesh(new THREE.IcosahedronGeometry(0.36 * size, 0), mat(0x5f9a5c, { flatShading: true }), 0, 0.72 * size, 0);
  leaves.scale.y = 1.25;
  g.add(leaves);
  return g;
}

// ---------- people with a routine ----------

// A character that loops through scripted steps:
//   { to: Vector3 | (actor) => Vector3, wait = 0, until: (actor) => bool, mode = 'idle', look, bag: true|false, speed, then: (actor) => {}, act: 'name' }
// `act` labels what the actor is doing from that stop on (actor.activity, actor.onAct).
// `until` holds the actor at that stop until the predicate turns true (e.g. "boarding has started").
// With loop = false the actor runs the script once and calls onDone(actor).
// `to` may be a function: it is resolved when the step begins (e.g. "the least busy desk").
// It walks in straight lines, does `mode` for `wait` seconds at each stop, then moves on;
// after the last step it reappears at the first. Actors sharing a `crowd` array queue up:
// they pause while someone is just ahead of them.
export function routine(parent, role, steps, { crowd = [], offset = 0, speed = 1.1, phase = Math.random() * 10, loop = true, onDone = null, person: given = null, init = null } = {}) {
  const p = given ?? person(role);
  p.userData.phase = phase;
  parent.add(p);
  const a = { p, i: 0, waiting: 0, blocked: 0, ignore: 0, target: null, until: null, done: false };
  crowd.push(a);
  init?.(a); // before the first step, so its markers reach the caller
  const resolve = () => { const st = steps[a.i]; a.target = typeof st.to === 'function' ? st.to(a) : st.to; };
  const bag = (v) => { if (v !== undefined && p.userData.suitcase) p.userData.suitcase.visible = v; };
  const arrive = (st) => {
    if (a.arrivedIdx === a.i) return; // each stop fires once (restart already arrives at step 0)
    a.arrivedIdx = a.i;
    bag(st.bag);
    st.then?.(a); // first, so markers see what the stop changed (e.g. the flight boarded)
    if (st.act) { a.activity = st.act; a.onAct?.(st.act, a); } // story / UI markers
    if (st.wait || st.until) {
      a.waiting = st.wait || 0;
      a.until = st.until ?? null;
      p.userData.mode = st.mode ?? 'idle';
      if (st.look !== undefined) p.rotation.y = st.look;
    }
  };
  const restart = () => { a.i = 0; a.arrivedIdx = -1; resolve(); p.position.copy(a.target); arrive(steps[0]); };
  const next = () => {
    if (!loop && a.i === steps.length - 1) {
      a.done = true;
      onDone?.(a);
      return;
    }
    a.i = (a.i + 1) % steps.length;
    a.arrivedIdx = -1;
    if (a.i === 0) restart(); else resolve();
  };
  restart();
  const tmp = new THREE.Vector3();
  const step = (t, dt) => {
    if (a.done) return;
    if (a.waiting > 0 || a.until) {
      a.waiting -= dt;
      p.userData.update(t);
      if (a.waiting > 0 || (a.until && !a.until(a))) return;
      a.until = null;
      a.waiting = 0;
      next();
      if (a.i === 0 || a.done) return;
    }
    const st = steps[a.i];
    tmp.subVectors(a.target, p.position);
    const dist = tmp.length();
    if (dist < 0.05) {
      arrive(st);
      if (!st.wait && !st.until) next();
      return;
    }
    tmp.normalize();
    // queueing: hold back while another actor stands right in front
    let blocked = null;
    if (a.ignore > 0) a.ignore -= dt;
    else for (const o of crowd) {
      if (o === a || o.done) continue;
      const dx = o.p.position.x - p.position.x, dz = o.p.position.z - p.position.z, dy = o.p.position.y - p.position.y;
      if (Math.abs(dy) > 0.5) continue;
      const along = dx * tmp.x + dz * tmp.z;
      if (along > 0 && along < 0.62 && Math.abs(dx * tmp.z - dz * tmp.x) < 0.35) { blocked = o; break; }
    }
    if (blocked) {
      a.blocked += dt;
      // never deadlock: squeeze past — quickly if the one in front is also stuck,
      // only after a long while if they are standing at a stop (that is a queue)
      const stopped = blocked.waiting > 0 || blocked.until;
      if (a.blocked > (stopped ? 14 : 4)) { a.ignore = 1.2; a.blocked = 0; }
      p.userData.mode = 'idle';
    } else {
      a.blocked = 0;
      const d = Math.min(dist, (st.speed ?? speed) * dt);
      p.position.addScaledVector(tmp, d);
      p.userData.mode = 'walk';
      if (Math.abs(tmp.x) + Math.abs(tmp.z) > 1e-3) p.rotation.y = Math.atan2(-tmp.z, tmp.x);
    }
    p.userData.update(t);
  };
  // fast-forward so a group of actors starts spread out along the script
  for (let s = 0; s < offset; s += 0.1) step(s, 0.1);
  a.update = step;
  return a;
}

// ---------- room shell (cutaway) ----------

let terrazzo = null;
function terrazzoTexture() {
  if (!terrazzo) {
    terrazzo = canvasTexture(512, 512, (c, w, h) => {
      c.fillStyle = '#ece6da';
      c.fillRect(0, 0, w, h);
      let s = 3;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const chips = ['#d7cebf', '#c9c2b4', '#e3a58b', '#b9c6cf', '#f7f3ea'];
      for (let i = 0; i < 1400; i++) {
        c.fillStyle = chips[i % chips.length];
        c.beginPath();
        c.arc(rnd() * w, rnd() * h, 1 + rnd() * 2.2, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = 'rgba(160,150,135,0.35)';
      c.lineWidth = 2;
      for (let x = 0; x <= w; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = 0; y <= h; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    });
    terrazzo.wrapS = terrazzo.wrapT = THREE.RepeatWrapping;
  }
  const t = terrazzo.clone();
  t.needsUpdate = true;
  return t;
}

// Floor + cutaway walls (cut at `wallH`) around a w × d room centred on the origin.
// `openings` lists wall gaps: { side: 'n'|'s'|'e'|'w', at, width }.
export function roomShell(w, d, { wallH = 0.7, accent = PALETTE.orange, glassSide = 's', openings = [] } = {}) {
  const g = new THREE.Group();
  const tex = terrazzoTexture();
  tex.repeat.set(w / 4, d / 4);
  const floor = mesh(new THREE.BoxGeometry(w, 0.12, d), [mat(PALETTE.cream), mat(PALETTE.cream), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), mat(PALETTE.cream), mat(PALETTE.cream), mat(PALETTE.cream)], 0, -0.06, 0);
  g.add(floor);
  g.add(box(w + 0.02, 0.04, 0.04, mat(accent), 0, 0.01, d / 2 + 0.01)); // accent edge on the front lip
  const sides = {
    n: { from: [-w / 2, -d / 2], to: [w / 2, -d / 2] },
    s: { from: [-w / 2, d / 2], to: [w / 2, d / 2] },
    w: { from: [-w / 2, -d / 2], to: [-w / 2, d / 2] },
    e: { from: [w / 2, -d / 2], to: [w / 2, d / 2] },
  };
  for (const [key, { from, to }] of Object.entries(sides)) {
    const horizontal = from[1] === to[1];
    const len = horizontal ? w : d;
    const gaps = openings.filter((o) => o.side === key).map((o) => [o.at - o.width / 2, o.at + o.width / 2]).sort((a, b) => a[0] - b[0]);
    let cursor = -len / 2;
    const segs = [];
    for (const [a, b] of gaps) { if (a > cursor) segs.push([cursor, a]); cursor = Math.max(cursor, b); }
    if (cursor < len / 2) segs.push([cursor, len / 2]);
    const glass = key === glassSide;
    for (const [a, b] of segs) {
      const mid = (a + b) / 2, L = b - a;
      const wall = glass
        ? box(horizontal ? L : 0.08, 0.3, horizontal ? 0.08 : L, mat(PALETTE.white), 0, 0.15, 0)
        : box(horizontal ? L : 0.2, wallH, horizontal ? 0.2 : L, mat(PALETTE.white), 0, wallH / 2, 0);
      wall.position.x = horizontal ? mid : from[0];
      wall.position.z = horizontal ? from[1] : mid;
      g.add(wall);
      if (!glass) {
        const cap = box(horizontal ? L : 0.22, 0.03, horizontal ? 0.22 : L, mat(PALETTE.ink), wall.position.x, wallH + 0.015, wall.position.z);
        g.add(cap); // the dark cut line reads as "section" like an architectural drawing
      } else {
        for (let p = a; p <= b + 1e-6; p += 1.2) { // mullion stubs of the cut curtain wall
          g.add(box(0.06, 0.6, 0.06, mat(PALETTE.grey), horizontal ? p : from[0], 0.3, horizontal ? from[1] : p));
        }
      }
    }
  }
  g.userData = { kind: 'room', w, d };
  return g;
}

// ---------- R1 room kit ----------

// A complete check-in hall at person scale, populated and animated, for designing
// the room in isolation before it goes into the terminal.
// ambient = false: no scripted passengers (the airport drives real ones through
// userData.anchors instead); staff and fixtures stay.
export function checkInHall({ ambient = true } = {}) {
  const W = 15, D = 11;
  const g = new THREE.Group();
  g.add(roomShell(W, D, { accent: PALETTE.orange, glassSide: 's', openings: [
    { side: 's', at: -4, width: 2 }, { side: 's', at: 3, width: 2 },
    { side: 'e', at: 1.3, width: 2.4 }, { side: 'w', at: 1.3, width: 2.4 }, // walk-through toward security
  ] }));

  const island = checkInIsland({ desks: 6, label: 'A', first: 1 });
  island.position.set(-1.2, 0, -3.1);
  g.add(island);

  // turned 180° so the entrance is on the hall side and the exit lane is next to the desks
  const maze = queueMaze({ lanes: 3, length: 6, gap: 0.95 });
  maze.position.set(1.0, 0, 1.25);
  maze.rotation.y = Math.PI;
  g.add(maze);
  const Y = new THREE.Vector3(0, 1, 0);

  const kiosks = [];
  for (let i = 0; i < 4; i++) {
    const k = kiosk();
    k.position.set(-6.4 + i * 0.85, 0, 3.0);
    k.rotation.y = Math.PI; // screens face the hall (−Z)… users stand on the entrance side
    g.add(k);
    kiosks.push(k);
  }
  // departures board on the east wall, benches facing it (kept north of the walk-through line)
  const board = fids({ width: 3.0, height: 1.4 });
  board.position.set(W / 2 - 0.35, 0, -2.0);
  board.rotation.y = -Math.PI / 2;
  g.add(board);
  const seated = [];
  for (const [x, z] of [[4.2, -3.3], [4.2, -1.1]]) {
    const b = bench({ seats: 4 });
    b.position.set(x, 0, z);
    b.rotation.y = Math.PI / 2;
    g.add(b);
    b.userData.seats.forEach((s) => s.applyAxisAngle(Y, Math.PI / 2).add(b.position));
    seated.push([z > -2 ? 'woman' : 'business', b.userData.seats[z > -2 ? 1 : 3]], [z > -2 ? 'child' : 'senior', b.userData.seats[z > -2 ? 2 : 0]]);
  }
  const sign = hangingSign({ text: '保安検査場', sub: 'Security', arrow: '↑', width: 2.6 });
  sign.position.set(5.2, 0, -3.9);
  g.add(sign);
  const sign2 = hangingSign({ text: 'チェックイン', sub: 'Check-in  A 01–06', arrow: '←', width: 2.6, color: PALETTE.yellow });
  sign2.position.set(-0.5, 0, 3.6);
  g.add(sign2);
  for (const [x, z] of [[6.7, -4.7], [-6.8, -4.7], [6.7, 4.6]]) {
    const p = planter();
    p.position.set(x, 0, z);
    g.add(p);
  }

  // people: agents at desks, a passenger at three desks, a queue, kiosk users, seated people
  const people = [];
  const add = (role, x, z, heading, mode = 'idle', opts = {}) => {
    const p = person(role, { mode });
    p.position.set(x, 0, z);
    p.rotation.y = heading;
    p.userData.phase = Math.random() * 10;
    if (opts.noBag && p.userData.suitcase) p.userData.suitcase.visible = false;
    g.add(p);
    people.push(p);
    return p;
  };
  // rotation.y for a character (who faces +X) to look toward +Z / −Z
  const LOOK_PZ = -Math.PI / 2, LOOK_NZ = Math.PI / 2;
  const desks = island.userData.desks.map((d) => ({ agent: d.agent.clone().add(island.position), passenger: d.passenger.clone().add(island.position) }));
  desks.forEach((d, i) => { if (i !== 4) add(i % 2 ? 'agentM' : 'agent', d.agent.x, d.agent.z, LOOK_PZ, 'type'); });

  // passengers: door → queue → a free desk (bag is checked in) → toward security
  const path = maze.userData.path.map((p) => p.clone().applyAxisAngle(Y, maze.rotation.y).add(maze.position));
  const open = [0, 1, 2, 3, 5];
  const claims = new Map(open.map((i) => [i, 0]));
  const claimDesk = () => {
    const best = open.reduce((a, b) => (claims.get(b) < claims.get(a) ? b : a));
    claims.set(best, claims.get(best) + 1);
    return best;
  };
  const crowd = [];
  const V3 = (x, z) => new THREE.Vector3(x, 0, z);
  const deskOf = (a) => desks[a.desk].passenger;
  const actors = (ambient ? ['passenger', 'senior', 'child', 'woman', 'business', 'backpacker', 'passenger', 'woman', 'business'] : []).map((type, i) => {
    return routine(g, type, [
      { to: V3(3, 5.8), bag: true },
      { to: V3(2.4, 2.6) },
      ...path.map((p) => ({ to: p })),
      { to: (a) => { a.desk = claimDesk(); return V3(deskOf(a).x, deskOf(a).z + 0.9); } },
      { to: (a) => deskOf(a).clone(), wait: 6, look: LOOK_NZ, bag: false },
      { to: (a) => V3(deskOf(a).x + 0.6, deskOf(a).z + 0.5), then: (a) => claims.set(a.desk, claims.get(a.desk) - 1) },
      { to: V3(2.4, -2.0) },
      { to: V3(2.4, 1.3) },
      { to: V3(8.2, 1.3) },
    ], { crowd, offset: 4 + i * 4.2 });
  });
  kiosks.slice(0, 2).forEach((k, i) => {
    k.userData.active = true;
    add(i ? 'senior' : 'passenger', k.position.x, k.position.z - 0.55, LOOK_PZ);
  });
  seated.forEach(([type, seat]) => add(type, seat.x, seat.z, 0, 'sit', { noBag: true }));

  g.userData = {
    kind: 'room',
    // local-space waypoints for passengers driven from outside
    anchors: {
      entries: [V3(-4, 5.9), V3(3, 5.9)],
      toQueue: V3(2.4, 2.6),
      queue: path,
      desks: open.map((i) => desks[i].passenger.clone()),
      toExit: [V3(2.4, -2.0), V3(2.4, 1.3)],
      // checked bags: scale plate at each open desk, then the collector belt behind the desks
      scales: open.map((i) => island.userData.desks[i].scale.clone().add(island.position)),
      belt: { z: island.position.z - 1.15, y: DIM.beltTop + 0.02, west: island.position.x - island.userData.length / 2 + 0.3 },
      exitE: V3(7.9, 1.3),
      entryW: V3(-7.9, 1.9),
      through: [V3(2.4, 1.9), V3(2.4, 1.3)],
    },
    update(t, dt) {
      island.userData.update(t, dt);
      for (const k of kiosks) k.userData.update(t);
      for (const p of people) p.userData.update(t);
      for (const a of actors) a.update(t, dt);
      // bags riding the collector belt (loop for the preview)
      const L = island.userData.length;
      bags.forEach((b, i) => {
        const x = ((t * 0.6 + i * (L / bags.length)) % L) - L / 2;
        b.position.set(island.position.x + x, island.position.y + 0.45, island.position.z - 1.15);
      });
    },
  };
  const bags = ['hard', 'soft', 'hard', 'box', 'hard'].map((kind, i) => {
    const b = luggage(kind, BAG_COLORS[i * 3 % BAG_COLORS.length], { lying: kind === 'hard' });
    b.rotation.y = Math.PI / 2;
    b.userData.dynamic = true;
    g.add(b);
    return b;
  });
  // a bag on the scale at the woman's desk
  const onScale = luggage('hard', PALETTE.red);
  onScale.position.copy(island.userData.desks[0].scale).add(island.position);
  g.add(onScale);
  return bakeStatic(g);
}

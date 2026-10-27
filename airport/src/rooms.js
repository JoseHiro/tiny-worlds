// Terminal rooms R2–R9: parts and room kits. Same conventions as interior.js:
// person scale (a character is 1.3 tall), builders sit on y = 0, the user side faces +Z.
import * as THREE from 'three';
import { PALETTE, mat, mesh, rbox, box, cyl, person, airplane, LIVERIES, baggageTrain } from './parts.js';
import { bakeStatic } from './merge.js';
import {
  DIM, metal, canvasTexture, screenMat, luggage, BAG_COLORS, conveyor, queueMaze, fids, bench, trolley,
  hangingSign, planter, roomShell, routine,
} from './interior.js';

const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const LOOK = { px: 0, nx: Math.PI, pz: -Math.PI / 2, nz: Math.PI / 2 }; // rotation.y for a character to face ±X / ±Z
const glass = () => mat(0xbfd8e6, { transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.1, depthWrite: false });

// Flat sign panel. lines: [[text, size (fraction of height), weight, mono?], ...]
export function textPanel({ w = 2, h = 0.5, bg = PALETTE.orange, fg = '#ffffff', lines = [], glow = 0.25, depth = 0.06, align = 'left' } = {}) {
  const H = 256, W = Math.round((256 * w) / h);
  const tex = canvasTexture(W, H, (c) => {
    c.fillStyle = hex(bg);
    c.fillRect(0, 0, W, H);
    c.fillStyle = fg;
    c.textBaseline = 'middle';
    c.textAlign = align;
    const total = lines.reduce((s, l) => s + l[1], 0);
    let y = (H - total * H) / 2;
    for (const [text, size, weight = 600, mono = false] of lines) {
      c.font = `${weight} ${size * H * 0.82}px ${mono ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif'}`;
      c.fillText(text, align === 'center' ? W / 2 : H * 0.18, y + (size * H) / 2);
      y += size * H;
    }
  });
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow });
  const edge = mat(PALETTE.ink);
  return mesh(new THREE.BoxGeometry(w, h, depth), [edge, edge, edge, edge, face, face]);
}

// ---------- room-kit helper ----------

function makeKit(W, D, shellOpts) {
  const g = new THREE.Group();
  g.add(roomShell(W, D, shellOpts));
  const updaters = [];
  const crowd = [];
  const k = {
    g,
    // a character following a looping script (see routine() in interior.js)
    flow(role, steps, opts = {}) {
      const a = routine(g, role, steps, { crowd, ...opts });
      updaters.push((t, dt) => a.update(t, dt));
      return a;
    },
    put(obj, x, z, ry = 0, y = 0) {
      obj.position.set(x, y, z);
      obj.rotation.y = ry;
      g.add(obj);
      if (obj.userData.update) updaters.push((t, dt) => obj.userData.update(t, dt));
      return obj;
    },
    who(role, x, z, look = 0, mode = 'idle', { noBag = false, y = 0 } = {}) {
      const p = person(role, { mode });
      p.position.set(x, y, z);
      p.rotation.y = look;
      p.userData.phase = Math.random() * 10;
      if (noBag && p.userData.suitcase) p.userData.suitcase.visible = false;
      g.add(p);
      updaters.push((t) => p.userData.update(t));
      return p;
    },
    // a character moving along a polyline forever (points are Vector3, y allowed)
    walker(role, pts, { speed = 1, mode = 'walk', noBag = false, offset = Math.random() } = {}) {
      const p = person(role, { mode });
      if (noBag && p.userData.suitcase) p.userData.suitcase.visible = false;
      p.userData.phase = Math.random() * 10;
      const path = new THREE.CurvePath();
      for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
      const len = path.getLength();
      let s = offset * len;
      g.add(p);
      updaters.push((t, dt) => {
        s = (s + speed * dt) % len;
        const u = s / len;
        p.position.copy(path.getPointAt(u));
        const tan = path.getTangentAt(u);
        if (Math.abs(tan.x) + Math.abs(tan.z) > 1e-3) p.rotation.y = Math.atan2(-tan.z, tan.x);
        p.userData.update(t);
      });
      return p;
    },
    tick(fn) { updaters.push(fn); },
    done() {
      bakeStatic(g);
      g.userData = { kind: 'room', update: (t, dt) => updaters.forEach((f) => f(t, dt)) };
      return g;
    },
  };
  return k;
}
const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);

// ======================================================================
// R2 保安検査場 — accent: sky
// ======================================================================

export function tray({ items = true, color = PALETTE.sky } = {}) {
  const g = new THREE.Group();
  g.add(rbox(0.5, 0.07, 0.36, 0.03, mat(color), 0, 0.035, 0));
  g.add(box(0.44, 0.02, 0.3, mat(0x6f9bbd), 0, 0.071, 0));
  if (items) {
    g.add(rbox(0.16, 0.03, 0.09, 0.01, mat(PALETTE.ink), -0.1, 0.09, 0.05)); // phone
    g.add(rbox(0.2, 0.08, 0.14, 0.03, mat(PALETTE.brown), 0.08, 0.11, -0.04)); // pouch
  }
  return g;
}

// Roller bed running along +X with its top at `height`.
export function rollerTable(length, { height = DIM.deskTop, width = 0.6 } = {}) {
  const g = new THREE.Group();
  g.add(box(length, 0.1, width + 0.08, mat(PALETTE.white), 0, height - 0.09, 0));
  const n = Math.floor(length / 0.12);
  const rollers = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, width, 8).rotateX(Math.PI / 2), metal(), n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) rollers.setMatrixAt(i, m4.makeTranslation(-length / 2 + 0.06 + i * 0.12, height - 0.025, 0));
  g.add(rollers);
  for (const s of [1, -1]) g.add(box(length, 0.05, 0.03, mat(PALETTE.sky), 0, height + 0.01, s * (width / 2 + 0.03)));
  for (const x of [-length / 2 + 0.15, length / 2 - 0.15]) for (const s of [1, -1]) g.add(box(0.05, height - 0.14, 0.05, metal(), x, (height - 0.14) / 2, s * (width / 2 - 0.05)));
  g.add(box(length - 0.2, 0.04, width, mat(PALETTE.grey), 0, 0.22, 0)); // tray return shelf
  return g;
}

export function xrayMachine() {
  const g = new THREE.Group();
  const white = mat(PALETTE.white);
  g.add(rbox(1.7, 0.55, 1.0, 0.06, white, 0, 0.275, 0)); // base
  for (const s of [1, -1]) g.add(rbox(1.7, 0.62, 0.18, 0.05, white, 0, 0.86, s * 0.41)); // tunnel walls
  g.add(rbox(1.74, 0.36, 1.04, 0.08, white, 0, 1.33, 0)); // roof
  g.add(box(1.76, 0.08, 1.06, mat(PALETTE.sky), 0, 1.12, 0));
  for (const x of [-0.86, 0.86]) for (let i = 0; i < 5; i++) { // lead curtains
    g.add(box(0.02, 0.5, 0.12, mat(PALETTE.ink, { roughness: 0.9 }), x, 0.88, -0.25 + i * 0.125));
  }
  const lamp = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), screenMat(0x6ff0a0, 1.2), 0.6, 1.57, 0);
  g.add(lamp);
  // operator console on the −Z side
  g.add(cyl(0.03, 0.03, 0.7, metal(), 0, 0.62, -0.75, 6));
  g.add(rbox(0.5, 0.32, 0.04, 0.02, mat(PALETTE.ink), 0, 1.05, -0.75));
  const scr = mesh(new THREE.PlaneGeometry(0.44, 0.27), screenMat(0x7fb6ff, 0.8), 0, 1.05, -0.772);
  scr.rotation.y = Math.PI;
  g.add(scr);
  g.userData = { kind: 'xray', update: (t) => { lamp.material.emissiveIntensity = 0.8 + 0.4 * Math.sin(t * 3); } };
  return g;
}

// Walk-through metal detector; passengers walk along ±X through it. alarm = red flash.
export function metalDetector() {
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    g.add(rbox(0.5, 1.95, 0.12, 0.04, mat(0xd4d8dd), 0, 0.975, s * 0.46));
    g.add(box(0.46, 1.6, 0.02, mat(PALETTE.sky), 0, 0.95, s * 0.39));
  }
  g.add(rbox(0.56, 0.18, 1.06, 0.05, mat(PALETTE.white), 0, 2.02, 0));
  const lamp = mesh(new THREE.BoxGeometry(0.3, 0.05, 0.08), screenMat(0x45e07a, 1), 0, 2.13, 0);
  g.add(lamp);
  g.userData = {
    kind: 'detector',
    alarm: false,
    update: (t) => {
      const red = g.userData.alarm && (t * 4) % 1 < 0.5;
      lamp.material.color.set(red ? 0xff4a3a : 0x45e07a);
      lamp.material.emissive.set(red ? 0xff4a3a : 0x45e07a);
    },
  };
  return g;
}

// Automated barrier (pre-security pass check and boarding gates). Passenger walks ±X.
export function eGate({ accent = PALETTE.sky } = {}) {
  const g = new THREE.Group();
  const flaps = [];
  for (const s of [1, -1]) {
    g.add(rbox(1.1, 0.95, 0.24, 0.06, mat(PALETTE.white), 0, 0.475, s * 0.52));
    g.add(box(1.12, 0.05, 0.26, mat(accent), 0, 0.96, s * 0.52));
    const flap = new THREE.Group();
    flap.userData.dynamic = true;
    flap.position.set(0.1, 0.55, s * 0.4);
    flap.add(mesh(new THREE.BoxGeometry(0.03, 0.55, 0.36), glass(), 0, 0, -s * 0.18));
    g.add(flap);
    flaps.push([flap, s]);
  }
  const reader = mesh(new THREE.BoxGeometry(0.2, 0.02, 0.16), screenMat(0x7fd0c4, 0.9), -0.3, 0.985, 0.52);
  g.add(reader);
  g.userData = {
    kind: 'egate',
    open: 0,
    update: (t, dt) => {
      const target = (t * 0.35 + g.position.z) % 1 < 0.45 ? 1 : 0; // cycles open/closed in previews
      g.userData.open += (target - g.userData.open) * Math.min(1, dt * 6);
      for (const [f, s] of flaps) f.rotation.y = s * g.userData.open * 1.4;
      reader.material.emissiveIntensity = target ? 1.4 : 0.6;
    },
  };
  return g;
}

export function podium({ accent = PALETTE.sky } = {}) {
  const g = new THREE.Group();
  g.add(rbox(0.7, 0.95, 0.5, 0.06, mat(PALETTE.white), 0, 0.475, 0));
  g.add(box(0.72, 0.06, 0.52, mat(accent), 0, 0.9, 0));
  g.add(box(0.2, 0.02, 0.14, screenMat(0xd8f0ff, 0.6), 0.1, 0.94, 0.08));
  return g;
}

// One complete screening lane. Bags travel +X along the belt; people walk +X through the detector at z = +1.
export function securityLane({ alarm = false } = {}) {
  const g = new THREE.Group();
  const load = rollerTable(2.2);
  load.position.x = -1.95;
  const exit = rollerTable(1.8);
  exit.position.x = 1.75;
  const xr = xrayMachine();
  const det = metalDetector();
  det.position.set(0.1, 0, 1.15);
  det.rotation.y = Math.PI / 2;
  det.userData.alarm = alarm;
  const recheck = rbox(1.4, DIM.deskTop, 0.7, 0.05, mat(PALETTE.white), 2.1, DIM.deskTop / 2, -1.05);
  g.add(load, exit, xr, det, recheck, box(1.42, 0.04, 0.72, mat(PALETTE.sky), 2.1, DIM.deskTop + 0.02, -1.05));
  const trays = [0, 1, 2, 3].map((i) => {
    const tr = tray({ items: i % 2 === 0 });
    tr.userData.dynamic = true;
    g.add(tr);
    return tr;
  });
  g.userData = {
    kind: 'securityLane',
    spots: { load: V(-2.2, 0.62), walk: V(-0.9, 1.15), detector: V(0.1, 1.15), collect: V(1.9, 0.62), operator: V(0, -0.98), officer: V(0.9, 1.6), recheck: V(2.1, -1.65) },
    update: (t, dt) => {
      xr.userData.update(t);
      det.userData.update(t);
      trays.forEach((tr, i) => {
        const x = ((t * 0.35 + i * 1.4) % 5.6) - 2.95;
        tr.position.set(x, DIM.deskTop, 0);
        tr.visible = x < -0.75 || x > 0.75; // hidden inside the tunnel
      });
    },
  };
  return g;
}

export function securityHall({ ambient = true } = {}) {
  const W = 15, D = 11;
  const k = makeKit(W, D, { accent: PALETTE.sky, glassSide: 'none', openings: [{ side: 'w', at: 1.3, width: 2.4 }, { side: 'e', at: 0, width: 3 }] });
  // queue → pass check e-gates → three lanes → exit east
  const maze = queueMaze({ lanes: 3, length: 4, gap: 0.95 });
  k.put(maze, -6.6, -1.4);
  const gatesZ = [-0.6, 0.6], gateX = -1.2;
  for (const z of gatesZ) k.put(eGate({ accent: PALETTE.sky }), gateX, z);
  k.put(podium(), gateX, 2.1, Math.PI / 2);
  k.who('security', gateX, 2.75, LOOK.nz);
  const lx = 2.7;
  const lanes = [-3.4, -0.3, 2.8].map((z, i) => k.put(securityLane({ alarm: i === 1 }), lx, z));
  lanes.forEach((ln) => {
    const s = ln.userData.spots;
    const at = (v) => [v.x + ln.position.x, v.z + ln.position.z];
    k.who('security', ...at(s.operator), LOOK.pz);
    k.who('security', ...at(s.officer), LOOK.nx);
  });
  // the alarm lane: an officer re-checks a bag
  k.who('security', lx + 2.1, -0.3 - 1.75, LOOK.pz, 'type');
  k.put(luggage('soft', PALETTE.teal), lx + 2.1, -0.3 - 1.05, 0, DIM.deskTop + 0.04);

  // the walk through the room, as waypoints (also used by the airport's passengers)
  const qp = maze.userData.path.map((p) => p.clone().add(maze.position));
  const steps = (lane, gate, armsUp = false) => {
    const lz = lanes[lane].position.z, gz = gatesZ[gate];
    return [
      ...qp.map((p) => ({ to: p })),
      { to: V(gateX - 1.0, gz) },
      { to: V(gateX, gz), wait: 0.8, look: LOOK.px },
      { to: V(-0.45, gz) },
      { to: V(-0.45, lz + 0.95) },
      { to: V(lx - 2.2, lz + 0.62), wait: 3.5, mode: 'hold', look: LOOK.nz },
      { to: V(lx - 1.0, lz + 1.15) },
      { to: V(lx + 0.1, lz + 1.15), wait: 1.2, mode: armsUp ? 'armsUp' : 'idle', look: LOOK.px },
      { to: V(lx + 1.0, lz + 1.15) },
      { to: V(lx + 1.9, lz + 0.62), wait: 2.5, mode: 'hold', look: LOOK.nz },
      { to: V(lx + 3.1, lz + 0.62) },
      { to: V(6.8, 0.75) },
      { to: V(7.9, 0.75) },
    ];
  };
  if (ambient) {
    ['passenger', 'woman', 'senior', 'business', 'child', 'backpacker', 'woman', 'passenger', 'business', 'child'].forEach((type, i) => {
      k.flow(type, [{ to: V(-7.9, 1.3), bag: false }, ...steps(i % 3, i % 2, i % 4 === 1)], { offset: i * 4.5, speed: 1.0 });
    });
  }
  k.put(hangingSign({ text: '保安検査場', sub: 'Security Check', arrow: '→', width: 2.6, color: PALETTE.yellow }), -5, -4.6);
  k.put(textPanel({ w: 2.2, h: 0.5, bg: PALETTE.sky, fg: '#1c2232', lines: [['液体は100mlまで', 0.45, 700], ['Liquids 100 ml max', 0.32, 500]] }), -4.5, 4.9, 0, 0.9);
  k.put(planter(), 6.7, 4.7);
  k.put(planter(), -6.8, 4.7);
  const room = k.done();
  room.userData.anchors = { entryW: V(-7.9, 1.3), steps, queueLen: qp.length, lanes: 3, gates: 2, exitE: V(7.9, 0.75) };
  return room;
}

// ======================================================================
// R3 出発ラウンジ（カフェ・売店・トイレ）— accent: yellow
// ======================================================================

export function cafeCounter() {
  const g = new THREE.Group();
  g.add(rbox(3, 0.85, 0.8, 0.06, mat(PALETTE.brown), 0, 0.425, 0));
  g.add(box(3.06, 0.05, 0.86, mat(PALETTE.white), 0, 0.875, 0));
  g.add(box(3, 0.08, 0.02, mat(PALETTE.yellow), 0, 0.7, 0.41));
  // espresso machine (back side, facing the barista on −Z)
  g.add(rbox(0.7, 0.42, 0.4, 0.05, metal(), -0.7, 1.11, -0.1));
  g.add(box(0.72, 0.06, 0.42, mat(PALETTE.yellow), -0.7, 1.33, -0.1));
  for (const x of [-0.85, -0.55]) g.add(cyl(0.03, 0.03, 0.12, mat(PALETTE.ink), x, 0.98, -0.32, 8));
  // pastry case
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.3, 0.5), glass(), 0.7, 1.05, 0.1));
  const buns = [PALETTE.orange, PALETTE.yellow, PALETTE.brown, PALETTE.pink];
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(buns[i % 4]), 0.42 + (i % 3) * 0.28, 0.95, i < 3 ? 0.0 : 0.2));
  g.add(cyl(0.04, 0.035, 0.1, mat(PALETTE.white), 0.1, 0.95, 0.25, 10)); // cup on the counter
  // steam puffs
  const puffs = [0, 1, 2].map((i) => {
    const p = mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), -0.7, 1.4, -0.1);
    p.castShadow = false;
    p.userData.dynamic = true;
    g.add(p);
    return p;
  });
  const menu = textPanel({ w: 2.6, h: 0.8, bg: PALETTE.ink, fg: '#f4f0e8', lines: [['CAFÉ  ', 0.34, 700], ['コーヒー 400 · ラテ 450', 0.24, 500], ['抹茶 480 · パン 300', 0.24, 500]] });
  menu.position.set(0, 1.85, -0.9);
  g.add(menu);
  g.add(box(3, 1.9, 0.12, mat(PALETTE.cream), 0, 0.95, -1.0));
  g.userData = {
    kind: 'cafe',
    barista: V(-0.6, -0.55),
    customer: V(0.6, 0.75),
    update: (t) => puffs.forEach((p, i) => {
      const k = (t * 0.6 + i / 3) % 1;
      p.position.y = 1.4 + k * 0.5;
      p.scale.setScalar(0.6 + k * 1.4);
      p.material.opacity = 0.5 * (1 - k);
    }),
  };
  return g;
}

export function cafeTable() {
  const g = new THREE.Group();
  g.add(cyl(0.36, 0.36, 0.04, mat(PALETTE.white), 0, 0.5, 0, 24));
  g.add(cyl(0.03, 0.03, 0.48, metal(), 0, 0.25, 0, 8));
  g.add(cyl(0.18, 0.2, 0.03, metal(), 0, 0.015, 0, 16));
  g.add(cyl(0.035, 0.03, 0.08, mat(PALETTE.white), 0.12, 0.56, 0.05, 10));
  const seats = [];
  for (const s of [1, -1]) {
    const x = s * 0.62;
    g.add(rbox(0.38, 0.05, 0.38, 0.02, mat(PALETTE.yellow), x, DIM.seat, 0));
    g.add(rbox(0.05, 0.38, 0.38, 0.02, mat(PALETTE.yellow), x + s * 0.18, DIM.seat + 0.2, 0));
    for (const dx of [-0.14, 0.14]) for (const dz of [-0.14, 0.14]) g.add(cyl(0.015, 0.015, DIM.seat, metal(), x + dx, DIM.seat / 2, dz, 6));
    seats.push({ pos: V(x, 0), look: s > 0 ? LOOK.nx : LOOK.px });
  }
  g.userData = { kind: 'cafeTable', seats };
  return g;
}

export function shopShelf({ seed = 1 } = {}) {
  const g = new THREE.Group();
  g.add(box(2, 1.4, 0.06, mat(PALETTE.white), 0, 0.7, -0.2));
  for (const s of [1, -1]) g.add(box(0.05, 1.4, 0.45, mat(PALETTE.white), s * 0.98, 0.7, 0));
  let r = seed * 97;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const colors = [PALETTE.orange, PALETTE.teal, PALETTE.yellow, PALETTE.red, PALETTE.sky, PALETTE.green, PALETTE.pink, PALETTE.navy];
  for (const y of [0.1, 0.5, 0.9]) {
    g.add(box(1.92, 0.03, 0.42, mat(PALETTE.cream), 0, y, 0));
    let x = -0.9;
    while (x < 0.85) {
      const w = 0.12 + rnd() * 0.14, h = 0.12 + rnd() * 0.2;
      g.add(rbox(w, h, 0.22, 0.015, mat(colors[Math.floor(rnd() * colors.length)]), x + w / 2, y + 0.015 + h / 2, 0.02));
      x += w + 0.03;
    }
  }
  return g;
}

export function shopFront({ name = 'MINI MART', width = 4.6, accent = PALETTE.yellow } = {}) {
  const g = new THREE.Group();
  const sign = textPanel({ w: width, h: 0.45, bg: accent, fg: '#1c2232', lines: [[name, 0.6, 700]], glow: 0.35 });
  sign.position.y = 2.25;
  g.add(sign);
  for (const s of [1, -1]) g.add(box(0.12, 2.48, 0.12, mat(PALETTE.ink), s * width / 2, 1.24, 0));
  return g;
}

export function cashier() {
  const g = new THREE.Group();
  g.add(rbox(1.4, 0.8, 0.6, 0.05, mat(PALETTE.white), 0, 0.4, 0));
  g.add(box(1.42, 0.05, 0.62, mat(PALETTE.yellow), 0, 0.82, 0));
  g.add(rbox(0.3, 0.2, 0.25, 0.03, mat(PALETTE.ink), -0.35, 0.95, -0.05));
  g.add(box(0.26, 0.15, 0.01, screenMat(0x9fd2e0, 0.6), -0.35, 0.97, 0.08));
  return g;
}

// Restroom block on a wall: two doorways with pictograms. Faces +Z.
export function restrooms() {
  const g = new THREE.Group();
  g.add(box(3.4, 2.2, 0.25, mat(PALETTE.white), 0, 1.1, 0));
  const pict = (color, skirt) => canvasTexture(128, 128, (c) => {
    c.fillStyle = hex(color);
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(64, 30, 14, 0, Math.PI * 2);
    c.fill();
    if (skirt) { c.beginPath(); c.moveTo(64, 48); c.lineTo(92, 96); c.lineTo(36, 96); c.fill(); }
    else c.fillRect(46, 48, 36, 48);
    c.fillRect(48, 94, 10, 26);
    c.fillRect(70, 94, 10, 26);
  });
  [[-0.9, PALETTE.sky, false], [0.9, PALETTE.pink, true]].forEach(([x, color, skirt]) => {
    g.add(box(0.9, 1.9, 0.27, mat(PALETTE.ink), x, 0.95, 0.01));
    const s = mesh(new THREE.PlaneGeometry(0.45, 0.45), new THREE.MeshStandardMaterial({ map: pict(color, skirt), emissive: 0xffffff, emissiveMap: pict(color, skirt), emissiveIntensity: 0.2 }), x, 2.0, 0.14);
    g.add(s);
  });
  return g;
}

export function lounge() {
  const W = 15, D = 11;
  const k = makeKit(W, D, { accent: PALETTE.yellow, glassSide: 'n', openings: [{ side: 'w', at: 1, width: 2.4 }, { side: 'e', at: 1, width: 2.4 }, { side: 'n', at: 0, width: 2.4 }] });
  // café (west)
  const cafe = k.put(cafeCounter(), -4.6, -3.6);
  k.who('barista', -4.6 + cafe.userData.barista.x, -3.6 + cafe.userData.barista.z, LOOK.pz, 'type');
  const sitters = ['senior', 'child', 'passenger', 'woman', 'backpacker', 'business'];
  const freeSeats = [];
  [[-5.6, -0.6], [-3.6, -0.6], [-5.6, 1.6], [-3.6, 1.6]].forEach(([x, z], i) => {
    const t = k.put(cafeTable(), x, z);
    t.userData.seats.forEach((s, j) => {
      const at = V(x + s.pos.x, z + s.pos.z);
      if ((i + j) % 3 !== 2) k.who(sitters[(i * 2 + j) % sitters.length], at.x, at.z, s.look, 'sit', { noBag: true });
      else freeSeats.push({ at, look: s.look });
    });
  });
  // café customers: order at the counter, sit a while, leave
  ['business', 'woman'].forEach((type, i) => {
    const seat = freeSeats[i % freeSeats.length];
    k.flow(type, [
      { to: V(-8.2, 1.0), bag: false },
      { to: V(-4.2 + i * 0.7, -1.9) },
      { to: V(-4.2 + i * 0.7, -2.7), wait: 4, look: LOOK.nz },
      { to: V(seat.at.x, seat.at.z + 0.7) },
      { to: seat.at, wait: 12, mode: 'sit', look: seat.look },
      { to: V(seat.at.x, seat.at.z + 0.7) },
      { to: V(-0.8, 0.4) },
      { to: V(8.2, 0.4) },
    ], { offset: i * 9 });
  });
  // shop (east)
  k.put(shopFront({ name: 'MINI MART · 売店' }), 3.9, -0.9);
  k.put(shopShelf({ seed: 2 }), 3.0, -4.6);
  k.put(shopShelf({ seed: 5 }), 5.3, -4.6);
  k.put(shopShelf({ seed: 9 }), 6.9, -2.6, -Math.PI / 2);
  k.put(cashier(), 2.4, -1.9, Math.PI / 2);
  k.who('agent', 1.9, -1.9, LOOK.px, 'type');
  k.who('senior', 5.6, -3.7, LOOK.nz, 'idle', { noBag: true });
  // shoppers: browse a shelf, pay, walk on
  ['child', 'woman', 'backpacker'].forEach((type, i) => {
    k.flow(type, [
      { to: V(8.2, 0.9), bag: false },
      { to: V(4.4 - i * 0.6, -0.4) },
      { to: V(3.0 + (i % 2) * 2.3, -3.8), wait: 4 + i, look: LOOK.nz },
      { to: V(3.0, -1.0) },
      { to: V(3.0, -1.9), wait: 3, mode: 'hold', look: LOOK.nx },
      { to: V(3.4, -0.2) },
      { to: V(-8.2, -0.2) },
    ], { offset: i * 8 });
  });
  // restrooms on the south wall, benches in the middle, people strolling through
  k.put(restrooms(), 3.6, D / 2 - 0.2, Math.PI);
  for (const z of [1.4, 3.0]) k.put(bench({ seats: 4 }), -0.4, z);
  k.who('passenger', -0.9, 1.45, LOOK.pz, 'sit', { noBag: true });
  k.who('backpacker', 0.1, 3.05, LOOK.pz, 'sit', { noBag: true });
  k.walker('business', [V(-7.4, 1), V(7.4, 1)], { speed: 1.1, noBag: true });
  k.walker('woman', [V(7.4, 0.4), V(-7.4, 0.4)], { speed: 0.9, noBag: true });
  k.walker('child', [V(-7.4, 4.0), V(2.3, 4.0), V(2.3, 4.9)], { speed: 1.3, noBag: true });
  k.put(hangingSign({ text: '搭乗口 A1–A6', sub: 'Gates A1–A6', arrow: '↑', width: 2.6 }), 0, -1.6);
  for (const [x, z] of [[-6.8, 4.7], [1.8, -4.7], [6.8, 4.7]]) k.put(planter({ size: 1.1 }), x, z);
  const room = k.done();
  room.userData.anchors = {
    entryW: V(-7.9, 1.0), exitE: V(7.9, 1.0), toNorth: V(0, 0.4), exitN: V(0, -5.9),
    // standing spots in the open parts of the room (south of the café tables, around the benches)
    waitSpots: [
      ...[-6.4, -5.6, -4.8, -4.0, -3.2, -2.4].flatMap((x) => [[x, 3.4], [x, 4.4]]),
      ...[1.4, 2.2, 3.0, 3.8, 4.6, 5.4, 6.2].flatMap((x) => [[x, 1.5], [x, 2.6], [x, 3.7]]),
    ].map(([x, z]) => V(x, z)),
  };
  return room;
}

// ======================================================================
// R4 搭乗ゲート — accent: teal
// ======================================================================

export function gateCounter({ gate = 'A1', flight = 'MA 237', dest = '那覇', status = '搭乗中' } = {}) {
  const g = new THREE.Group();
  g.add(rbox(2, 0.9, 0.7, 0.06, mat(PALETTE.white), 0, 0.45, 0));
  g.add(box(2.04, 0.06, 0.74, mat(PALETTE.teal), 0, 0.9, 0));
  g.add(box(2, 0.12, 0.02, mat(PALETTE.teal), 0, 0.62, 0.36));
  g.add(rbox(0.36, 0.24, 0.04, 0.02, mat(PALETTE.ink), -0.5, 1.12, -0.1));
  const sign = textPanel({ w: 1.6, h: 0.7, bg: PALETTE.teal, fg: '#ffffff', lines: [[gate, 0.38, 700, true], [`${flight}  ${dest}`, 0.28, 600], [status, 0.24, 700]], glow: 0.4 });
  sign.position.set(0.5, 1.75, -0.2);
  g.add(sign, cyl(0.04, 0.04, 1.4, metal(), 0.5, 0.7, -0.2, 8));
  g.userData = { kind: 'gateCounter', agent: V(-0.4, -0.65) };
  return g;
}

// Glass doorway to the jet bridge (in the airside wall). Faces +Z (the gate room).
export function bridgeDoor({ gate = 'A1' } = {}) {
  const g = new THREE.Group();
  for (const s of [1, -1]) g.add(box(0.14, 2.3, 0.2, mat(PALETTE.ink), s * 0.7, 1.15, 0));
  g.add(box(1.54, 0.14, 0.2, mat(PALETTE.ink), 0, 2.3, 0));
  const sign = textPanel({ w: 1.2, h: 0.36, bg: PALETTE.teal, fg: '#fff', lines: [[`${gate} ▸ 搭乗口`, 0.6, 700]], glow: 0.4, align: 'center' });
  sign.position.set(0, 2.6, 0.02);
  g.add(sign);
  return g;
}

export function gateLounge({ outside = true, gate = 'A1', ambient = true } = {}) {
  const W = 15, D = 11;
  const k = makeKit(W, D, { accent: PALETTE.teal, glassSide: 'n', openings: [{ side: 'n', at: 4.5, width: 1.3 }, { side: 's', at: 1.6, width: 2.4 }] });
  k.put(bridgeDoor({ gate }), 4.5, -D / 2 + 0.05);
  // counter, boarding gates, boarding queue
  const ctr = k.put(gateCounter({ gate }), 1.6, -3.0);
  k.who('gateAgent', 1.6 + ctr.userData.agent.x, -3.0 + ctr.userData.agent.z, LOOK.pz, 'type');
  const gx = [3.95, 5.05];
  for (const x of gx) k.put(eGate({ accent: PALETTE.teal }), x, -2.6, Math.PI / 2);
  k.who('gateAgent', 6.3, -2.6, LOOK.nx, 'idle');
  // boarding: line up, scan at a gate, walk out through the bridge door
  (ambient ? ['business', 'woman', 'child', 'passenger', 'senior', 'backpacker', 'woman'] : []).forEach((type, i) => {
    const x = gx[i % 2];
    k.flow(type, [
      { to: V(1.6, 5.8), bag: false },
      { to: V(4.5, 3.6) },
      { to: V(4.5, -1.2) },
      { to: V(x, -1.7) },
      { to: V(x, -2.4), wait: 0.8, look: LOOK.nz },
      { to: V(x, -3.6) },
      { to: V(4.5, -4.9) },
      { to: V(4.5, -5.9) },
    ], { offset: i * 3.2, speed: 0.9 });
  });
  // seating rows facing the window
  const seat = ['senior', 'backpacker', 'woman', 'business', 'passenger', 'child', 'woman'];
  let n = 0;
  const freeSeats = [];
  for (const z of [-1.4, 0.6, 2.6]) for (const x of [-4.8, -1.8]) {
    const b = k.put(bench({ seats: 4, color: PALETTE.navy }), x, z, Math.PI);
    b.userData.seats.forEach((s, j) => {
      if ((n + j) % 3 === 0) k.who(seat[(n + j) % seat.length], x - s.x, z - s.z, LOOK.nz, 'sit', { noBag: true });
      else freeSeats.push(V(x - s.x, z - s.z));
    });
    n++;
  }
  k.who('child', -3.2, -D / 2 + 0.55, LOOK.nz, 'idle', { noBag: true }); // nose to the glass, watching the plane
  k.who('woman', -2.5, -D / 2 + 0.7, LOOK.nz, 'idle', { noBag: true });
  const gateSign = textPanel({ w: 1.0, h: 1.0, bg: PALETTE.teal, fg: '#fff', lines: [[gate, 0.7, 700, true]], glow: 0.4, align: 'center' });
  gateSign.position.set(1.6, 2.1, -4.6);
  k.g.add(gateSign);
  const board = k.put(fids({ width: 2.4, height: 1.0, title: `${gate} · MA 237 那覇行き` }), -6.6, 4.4, Math.PI * 0.85);
  board.userData.setRows([
    { time: '14:20', flight: 'MA 237', dest: '那覇', gate: 'A1', status: '搭乗中' },
    { time: '15:10', flight: 'MA 785', dest: 'ソウル', gate: 'A1', status: '定刻' },
  ]);
  k.put(planter(), 6.8, 4.6);
  const room = k.done();
  room.userData.anchors = { entryS: V(1.6, 5.9), freeSeats, lineStart: V(4.5, 3.6), lineEnd: V(4.5, -1.2), gx, door: V(4.5, -5.9) };
  if (!outside) return room;

  // The gate is on 2F: lift the room onto a 1F block, park an aircraft on the apron
  // outside and connect it with a jet bridge from the door down to the cabin door.
  const F2 = 3.0;
  const g = new THREE.Group();
  room.position.y = F2;
  g.add(room);
  g.add(box(W, F2 - 0.12, D, mat(PALETTE.cream), 0, (F2 - 0.12) / 2, 0));
  g.add(box(W + 0.02, 0.9, D + 0.02, glass(), 0, 1.4, 0)); // 1F window band
  g.add(box(W + 6, 0.06, 18, mat(0xdcd6cb), 0, 0.03, -D / 2 - 9)); // apron
  const plane = airplane(LIVERIES.sunrise);
  plane.rotation.y = -Math.PI / 2; // nose toward the terminal (+Z)
  plane.position.set(5.6, 0, -D / 2 - 11);
  g.add(plane);
  const door = V(4.5, -D / 2 - 0.2, F2);
  const cabin = V(5.6 - 0.95, plane.position.z + 5, 1.42); // forward left door of the parked aircraft
  const run = new THREE.Vector3().subVectors(cabin, door);
  const tunnel = new THREE.Group();
  tunnel.rotation.order = 'YZX';
  tunnel.add(mesh(new THREE.BoxGeometry(1, 1.2, 1.05).translate(0.5, 0.6, 0), mat(PALETTE.white)));
  tunnel.add(mesh(new THREE.BoxGeometry(1, 0.3, 1.08).translate(0.5, 0.8, 0), mat(PALETTE.glass)));
  tunnel.position.copy(door);
  tunnel.rotation.set(0, Math.atan2(-run.z, run.x), Math.atan2(run.y, Math.hypot(run.x, run.z)));
  tunnel.scale.x = run.length();
  g.add(tunnel);
  const leg = cyl(0.1, 0.1, 2.2, mat(PALETTE.grey), cabin.x - run.x * 0.25, 1.1, cabin.z - run.z * 0.25, 8);
  g.add(leg);
  g.userData = { kind: 'room', update: (t, dt) => { room.userData.update(t, dt); plane.userData.update(t, dt); } };
  return g;
}

// ======================================================================
// R6 到着通路（2F）→ エスカレーター → 1F — accent: navy
// ======================================================================

let stepTex = null;
export function escalator({ rise = 3, width = 1.0 } = {}) {
  const g = new THREE.Group();
  const run = rise * Math.sqrt(3); // 30°
  const len = Math.hypot(run, rise);
  if (!stepTex) stepTex = canvasTexture(64, 64, (c) => {
    c.fillStyle = '#6a707b';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#f2b84b';
    c.fillRect(0, 0, 6, 64);
    c.fillStyle = '#585e69';
    for (let y = 0; y < 64; y += 8) c.fillRect(8, y, 56, 3);
  });
  const tex = stepTex.clone();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(len / 0.4, 1);
  tex.needsUpdate = true;
  const incline = new THREE.Group();
  incline.rotation.z = Math.atan2(rise, run);
  g.add(incline);
  incline.add(box(len, 0.06, width, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), len / 2, 0, 0));
  incline.add(box(len + 0.4, 0.5, width + 0.3, mat(PALETTE.grey), len / 2, -0.3, 0)); // truss
  for (const s of [1, -1]) {
    incline.add(mesh(new THREE.BoxGeometry(len, 0.85, 0.03), glass(), len / 2, 0.45, s * (width / 2 + 0.05)));
    incline.add(box(len + 0.3, 0.06, 0.08, mat(PALETTE.ink), len / 2, 0.9, s * (width / 2 + 0.05)));
    incline.add(box(len, 0.08, 0.1, mat(PALETTE.navy), len / 2, 0.02, s * (width / 2 + 0.08)));
  }
  g.add(box(1.0, 0.04, width + 0.2, metal(), -0.4, 0.02, 0)); // landing plates
  g.add(box(1.0, 0.04, width + 0.2, metal(), run + 0.4, rise + 0.02, 0));
  g.userData = {
    kind: 'escalator',
    rise,
    run,
    down: true,
    update: (t, dt) => { tex.offset.x += (g.userData.down ? 1 : -1) * dt * 0.5 / 0.4; },
  };
  return g;
}

// Moving walkway along +X.
export function travelator(length = 6, { width = 1.0 } = {}) {
  const g = new THREE.Group();
  const belt = conveyor(length, { width, height: 0.1, legs: false, speed: 0.8 });
  g.add(belt);
  for (const s of [1, -1]) {
    g.add(mesh(new THREE.BoxGeometry(length, 0.8, 0.03), glass(), 0, 0.5, s * (width / 2 + 0.06)));
    g.add(box(length + 0.4, 0.06, 0.08, mat(PALETTE.ink), 0, 0.92, s * (width / 2 + 0.06)));
  }
  for (const x of [-length / 2 - 0.3, length / 2 + 0.3]) g.add(box(0.6, 0.06, width + 0.2, metal(), x, 0.03, 0));
  g.userData = { kind: 'travelator', update: (t, dt) => belt.userData.update(t, dt) };
  return g;
}

export function glassPartition(length, { h = 1.4 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(length, h, 0.04), glass(), 0, h / 2, 0));
  g.add(box(length, 0.05, 0.08, mat(PALETTE.navy), 0, h, 0));
  g.add(box(length, 0.08, 0.08, mat(PALETTE.navy), 0, 0.04, 0));
  for (let x = -length / 2; x <= length / 2 + 1e-6; x += 1.5) g.add(box(0.05, h, 0.06, mat(PALETTE.navy), x, h / 2, 0));
  return g;
}

// 2F arrivals corridor with a moving walkway, then an escalator down to the 1F hall.
export function arrivalsCorridor() {
  const W = 15, D = 11, F2 = 3.0;
  const k = makeKit(W, D, { accent: PALETTE.navy, glassSide: 'none', openings: [{ side: 'w', at: -3.6, width: 2.4 }] });
  // 2F slab over the north half
  const slab = new THREE.Group();
  slab.position.y = F2;
  slab.add(box(W, 0.3, 4.6, mat(PALETTE.cream), 0, -0.15, -3.2));
  slab.add(box(W, 0.04, 0.04, mat(PALETTE.navy), 0, 0.01, -0.9));
  slab.add(box(W, 0.02, 4.0, mat(0xe3e8ee), 0, 0.01, -3.2)); // corridor floor (cool tone = "arrivals only")
  const partition = glassPartition(W - 0.4);
  partition.position.set(0, 0, -1.0);
  slab.add(partition);
  const back = glassPartition(W - 0.4, { h: 1.0 });
  back.position.set(0, 0, -5.4);
  slab.add(back);
  const walk = travelator(6);
  walk.position.set(-1.2, 0, -3.5);
  slab.add(walk);
  k.tick((t, dt) => walk.userData.update(t, dt));
  const sign = textPanel({ w: 3.2, h: 0.5, bg: PALETTE.yellow, fg: '#1c2232', lines: [['到着 ・手荷物受取 ↓', 0.5, 700], ['Arrivals · Baggage Claim', 0.3, 500]], glow: 0.3 });
  sign.position.set(4.6, 2.2, -2.6);
  slab.add(sign);
  for (const x of [-6, -2, 2, 6]) k.g.add(box(0.3, F2, 0.3, mat(PALETTE.white), x, F2 / 2, -0.95)); // columns
  k.g.add(slab);
  // escalator down from the end of the corridor to 1F
  const esc = escalator({ rise: F2 });
  esc.position.set(6.3 - esc.userData.run, 0, -1.9);
  esc.rotation.y = Math.PI; // top at the corridor end (x ≈ 6.7), runs down toward −X
  esc.position.x = 6.4;
  k.g.add(esc);
  k.tick((t, dt) => esc.userData.update(t, dt));
  // people: walking the corridor, standing on the walkway, riding down, arriving in the 1F hall
  const y2 = F2;
  k.walker('pilot', [V(-7.2, -3.0, y2), V(7.2, -3.0, y2)], { speed: 1.0 });
  k.walker('attendant', [V(-7.2, -2.4, y2), V(7.2, -2.4, y2)], { speed: 1.0, offset: 0.3 });
  for (let i = 0; i < 3; i++) k.walker(['woman', 'business', 'senior'][i], [V(-4.2, -3.5, y2 + 0.1), V(1.8, -3.5, y2 + 0.1)], { speed: 0.8, mode: 'idle', noBag: true, offset: i / 3 });
  const top = V(6.4 - 0.2, -1.9, y2), bottom = V(6.4 - esc.userData.run, -1.9, 0);
  for (let i = 0; i < 3; i++) k.walker(['backpacker', 'child', 'passenger'][i], [V(2.4, -3.0, y2), V(6.6, -3.0, y2), V(6.6, -1.9, y2), top, bottom, V(-0.8, -1.9), V(-0.8, 3.5), V(-6.8, 3.5)], { speed: 1.1, noBag: true, offset: i / 3 });
  // 1F below: a bit of the claim hall to show where the escalator lands
  k.put(hangingSign({ text: '手荷物受取', sub: 'Baggage Claim', arrow: '←', width: 2.4 }), -2.5, 1.6);
  k.put(planter(), -6.8, 4.6);
  k.put(planter(), 6.8, 4.6);
  for (const x of [-4.5, 1.5]) k.put(bench({ seats: 3 }), x, 4.2, Math.PI);
  return k.done();
}

// ======================================================================
// R5 手荷物仕分け場（BHS）— accent: yellow / grey
// ======================================================================

// Conveyor line through a list of points (XZ); turns get a round transfer plate.
export function conveyorRun(points, { height = DIM.beltTop, speed = 0.7 } = {}) {
  const g = new THREE.Group();
  const belts = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = a.distanceTo(b);
    const c = conveyor(len, { height, speed });
    c.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    c.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    g.add(c);
    belts.push(c);
    if (i < points.length - 1) g.add(cyl(0.36, 0.36, 0.06, mat(PALETTE.darkGrey), b.x, height - 0.03, b.z, 20));
  }
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(V(points[i - 1].x, points[i - 1].z, height), V(points[i].x, points[i].z, height)));
  g.userData = { kind: 'conveyorRun', path, update: (t, dt) => belts.forEach((c) => c.userData.update(t, dt)) };
  return g;
}

// Pusher arm that swings across the belt to divert a bag. Belt runs along ±X.
export function sorterArm() {
  const g = new THREE.Group();
  g.add(cyl(0.1, 0.12, 0.9, mat(PALETTE.yellow), 0, 0.45, 0, 12));
  const arm = new THREE.Group();
  arm.userData.dynamic = true;
  arm.position.y = 0.6;
  arm.add(box(0.9, 0.18, 0.06, mat(PALETTE.yellow), 0.45, 0, 0));
  arm.add(box(0.08, 0.2, 0.08, mat(PALETTE.ink), 0.9, 0, 0));
  g.add(arm);
  g.userData = { kind: 'sorter', arm, swing: 0, update: () => { arm.rotation.y = -g.userData.swing * 1.2; } };
  return g;
}

// Sloped make-up chute where sorted bags collect for one flight. Bags slide toward +Z.
export function makeupChute({ flight = 'MA 237', color = PALETTE.teal } = {}) {
  const g = new THREE.Group();
  const slide = box(1.6, 0.05, 2.0, metal(), 0, 0.42, 0);
  slide.rotation.x = 0.2;
  g.add(slide);
  for (const s of [1, -1]) g.add(box(0.05, 0.3, 2.0, mat(PALETTE.grey), s * 0.8, 0.55, 0));
  g.add(box(1.6, 0.3, 0.05, mat(PALETTE.grey), 0, 0.3, 1.0));
  for (const x of [-0.7, 0.7]) for (const z of [-0.9, 0.9]) g.add(box(0.06, 0.4, 0.06, metal(), x, 0.2, z));
  const sign = textPanel({ w: 1.4, h: 0.4, bg: color, fg: '#fff', lines: [[flight, 0.6, 700, true]], glow: 0.3, align: 'center' });
  sign.position.set(0, 1.25, -0.9);
  g.add(sign, cyl(0.03, 0.03, 0.9, metal(), 0, 0.75, -0.95, 6));
  g.userData = { kind: 'chute', bed: V(0, 0.55, 0.45) };
  return g;
}

export function baggageHall({ ambient = true } = {}) {
  const W = 15, D = 11, h = DIM.beltTop;
  const k = makeKit(W, D, { accent: PALETTE.yellow, glassSide: 'none', openings: [{ side: 'e', at: 2.6, width: 3.4 }] });
  // the drop belt from the check-in hall above comes down the west wall
  const drop = conveyor(3.4, { height: 0, legs: false, speed: 0.7 });
  drop.position.set(-6.0, 1.9, -3.8);
  drop.rotation.z = -0.55;
  k.g.add(drop);
  k.tick((t, dt) => drop.userData.update(t, dt));
  k.g.add(box(1.2, 0.6, 1.2, mat(PALETTE.grey), -7.1, 2.4, -3.8)); // hole in the ceiling slab
  const main = [V(-4.6, -3.8), V(3.6, -3.8), V(3.6, 0.8)];
  const line = k.put(conveyorRun(main), 0, 0);
  const arm = k.put(sorterArm(), 0.6, -4.45);
  // branch belts to two make-up chutes
  const branchA = k.put(conveyorRun([V(0.6, -3.8), V(0.6, -1.2)]), 0, 0);
  const chuteA = k.put(makeupChute({ flight: 'MA 237', color: PALETTE.teal }), 0.6, 0.3);
  const chuteB = k.put(makeupChute({ flight: 'MA 785', color: PALETTE.orange }), 3.6, 2.3);
  // carts at the chutes, handlers loading, and a tractor waiting at the door
  const cartModel = () => baggageTrain({ carts: 1 }).children[1];
  const cartA = k.put(cartModel(), -1.4, 0.9, Math.PI / 2);
  const cartB = k.put(cartModel(), 1.6, 3.4, 0);
  // handlers shuttle bags from chute to cart
  k.flow('handler', [{ to: V(-0.25, 1.35), wait: 2.2, mode: 'lift', look: LOOK.px }, { to: V(-0.85, 1.35), wait: 2.2, mode: 'lift', look: LOOK.nx }]);
  k.flow('handler', [{ to: V(2.75, 3.1), wait: 2.2, mode: 'lift', look: LOOK.px }, { to: V(2.2, 3.1), wait: 2.2, mode: 'lift', look: LOOK.nx }], { offset: 1.5 });
  k.who('handler', -2.4, -3.1, LOOK.nz, 'idle');
  const train = baggageTrain({ carts: 2 });
  train.position.set(6.0, 0, 2.6);
  train.rotation.y = Math.PI;
  k.g.add(train);
  k.tick((t, dt) => train.userData.update(t, dt));
  for (const [x, z, c] of [[-1.4, 0.9, 0], [1.6, 3.4, 3]]) for (let i = 0; i < 3; i++) {
    const b = luggage(['hard', 'soft', 'box'][i], BAG_COLORS[(i + c) % BAG_COLORS.length], { lying: i === 0 });
    b.position.set(x + (i - 1) * 0.42, 0.42, z);
    k.g.add(b);
  }
  // moving bags: down the drop belt, along the main line, sorted alternately into A or B
  const pathA = new THREE.CurvePath(), pathB = new THREE.CurvePath();
  const dropTop = V(-7.4, -3.8, 2.85), dropEnd = V(-4.6, -3.8, h);
  for (const p of [pathA, pathB]) p.add(new THREE.LineCurve3(dropTop, dropEnd));
  pathA.add(new THREE.LineCurve3(dropEnd, V(0.6, -3.8, h)));
  pathA.add(new THREE.LineCurve3(V(0.6, -3.8, h), V(0.6, -1.2, h)));
  pathA.add(new THREE.LineCurve3(V(0.6, -1.2, h), V(0.6, 0.4, 0.6)));
  for (const c of line.userData.path.curves) pathB.add(c);
  pathB.add(new THREE.LineCurve3(V(3.6, 0.8, h), V(3.6, 2.3, 0.6)));
  const bags = [];
  for (let i = 0; i < (ambient ? 8 : 0); i++) {
    const kind = ['hard', 'soft', 'hard', 'box'][i % 4];
    const b = luggage(kind, BAG_COLORS[(i * 3) % BAG_COLORS.length], { lying: kind === 'hard' });
    b.userData.dynamic = true;
    k.g.add(b);
    bags.push({ b, path: i % 2 ? pathB : pathA });
  }
  k.tick((t, dt) => {
    line.userData.update(t, dt);
    branchA.userData.update(t, dt);
    let swing = 0;
    bags.forEach(({ b, path }, i) => {
      const len = path.getLength();
      const s = (t * 0.7 + i * 2.1) % (len + 1.5);
      const u = Math.min(1, s / len);
      b.position.copy(path.getPointAt(u));
      b.visible = s < len;
      const p = b.position;
      if (path === pathA && Math.abs(p.x - 0.6) < 0.5 && p.z < -3.2) swing = 1; // the arm pushes A-bags off the line
    });
    swing = Math.max(swing, arm.userData.push ?? 0); // tracked bags (bags.js) also push the arm
    arm.userData.swing += (swing - arm.userData.swing) * 0.2;
    arm.userData.update();
  });
  k.put(textPanel({ w: 3, h: 0.5, bg: PALETTE.ink, fg: '#f2b84b', lines: [['手荷物仕分け場  BHS', 0.55, 700]], glow: 0.3 }), -3, D / 2 - 0.3, Math.PI, 1.8);
  const room = k.done();
  // local paths a bag follows to each make-up chute, the chute beds, and the pusher arm
  room.userData.anchors = { pathA, pathB, bedA: V(0.6, 0.75, 0.6), bedB: V(3.6, 2.75, 0.6), arm, armX: 0.6 };
  return room;
}

// ======================================================================
// R7 手荷物受取 / R8 手荷物サービス — accent: orange / red
// ======================================================================

// Stadium-shaped reclaim carousel along X. Slats and bags circulate; bags drop from a feed chute.
export function carousel({ length = 6, width = 2.6, bags = 9 } = {}) {
  const g = new THREE.Group();
  const r = width / 2 - 0.35;
  const straight = length - width;
  g.add(rbox(length + 0.2, 0.32, width + 0.2, 0.3, mat(PALETTE.grey), 0, 0.16, 0));
  g.add(rbox(straight + 0.9, 0.5, width - 1.3, 0.3, metal(), 0, 0.42, 0)); // centre island
  // loop path for slats and bags
  const shape = new THREE.Path();
  shape.moveTo(-straight / 2, -r);
  shape.lineTo(straight / 2, -r);
  shape.absarc(straight / 2, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-straight / 2, r);
  shape.absarc(-straight / 2, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  const loopPts = shape.getSpacedPoints(240);
  const loop = new THREE.CatmullRomCurve3(loopPts.map((p) => V(p.x, p.y, 0.36)), true);
  const loopLen = loop.getLength();
  const nSlats = Math.floor(loopLen / 0.3);
  const slats = new THREE.InstancedMesh(new RoundedBoxGeometryLite(0.32, 0.05, 0.62), mat(0x5a606b, { roughness: 0.7 }), nSlats);
  g.add(slats);
  // feed chute from the back wall onto the far straight
  const feed = box(0.9, 0.06, 1.8, metal(), 0, 0.95, -width / 2 - 0.6);
  feed.rotation.x = -0.45;
  g.add(feed);
  for (const s of [1, -1]) {
    const side = box(0.04, 0.25, 1.8, mat(PALETTE.grey), s * 0.45, 1.05, -width / 2 - 0.6);
    side.rotation.x = -0.45;
    g.add(side);
  }
  const bagObjs = [];
  for (let i = 0; i < bags; i++) {
    const kind = ['hard', 'soft', 'hard', 'box', 'hard'][i % 5];
    const b = luggage(kind, BAG_COLORS[(i * 5) % BAG_COLORS.length], { lying: kind === 'hard' });
    b.userData.dynamic = true;
    g.add(b);
    bagObjs.push(b);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  g.userData = {
    kind: 'carousel',
    loop,
    speed: 0.45,
    update: (t) => {
      const shift = (t * g.userData.speed) / loopLen;
      for (let i = 0; i < nSlats; i++) {
        const u = (i / nSlats + shift) % 1;
        const p = loop.getPointAt(u), tan = loop.getTangentAt(u);
        q.setFromAxisAngle(up, Math.atan2(-tan.z, tan.x));
        slats.setMatrixAt(i, m4.compose(p, q, one));
      }
      slats.instanceMatrix.needsUpdate = true;
      bagObjs.forEach((b, i) => {
        const u = (i / bags + shift) % 1;
        const p = loop.getPointAt(u), tan = loop.getTangentAt(u);
        b.position.set(p.x, 0.39, p.z);
        b.rotation.y = Math.atan2(-tan.z, tan.x) + (i % 2) * 0.4;
      });
    },
  };
  g.userData.update(0);
  return g;
}

// minimal rounded slat (a plain box reads fine at this size)
function RoundedBoxGeometryLite(w, h, d) { return new THREE.BoxGeometry(w, h, d); }

export function claimSign({ belt = 1, flight = 'MA 648', from = '福岡', status = '荷物到着中' } = {}) {
  const g = new THREE.Group();
  const p = textPanel({ w: 2.0, h: 0.8, bg: PALETTE.orange, fg: '#fff', lines: [[`${belt}`, 0.36, 700, true], [`${flight}  ${from}`, 0.28, 600], [status, 0.24, 600]], glow: 0.35 });
  p.position.y = 1.9;
  g.add(p, cyl(0.05, 0.05, 1.5, metal(), 0, 0.75, 0, 8));
  return g;
}

export function trolleyRack(n = 6) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const t = trolley();
    t.position.x = i * 0.32;
    g.add(t);
  }
  g.add(box(n * 0.32 + 0.6, 0.05, 0.6, mat(PALETTE.grey), (n - 1) * 0.16, 0.02, 0));
  return g;
}

export function baggageServiceDesk() {
  const g = new THREE.Group();
  g.add(rbox(2.4, 0.9, 0.7, 0.06, mat(PALETTE.white), 0, 0.45, 0));
  g.add(box(2.44, 0.06, 0.74, mat(PALETTE.red), 0, 0.9, 0));
  g.add(rbox(0.36, 0.24, 0.04, 0.02, mat(PALETTE.ink), -0.6, 1.1, -0.1));
  g.add(box(0.22, 0.01, 0.3, mat(PALETTE.white), 0.3, 0.935, 0.1)); // forms
  const sign = textPanel({ w: 2.4, h: 0.55, bg: PALETTE.red, fg: '#fff', lines: [['手荷物サービス', 0.5, 700], ['Baggage Service', 0.32, 500]], glow: 0.35 });
  sign.position.set(0, 2.1, -0.6);
  g.add(sign);
  // cage of unclaimed bags behind the desk
  g.add(box(2.4, 0.04, 0.6, metal(), 0, 0.5, -1.0), box(2.4, 0.04, 0.6, metal(), 0, 1.1, -1.0));
  for (const x of [-1.15, 1.15]) g.add(box(0.04, 1.4, 0.6, metal(), x, 0.7, -1.0));
  [-0.8, -0.3, 0.3, 0.8].forEach((x, i) => {
    const b = luggage(i % 2 ? 'soft' : 'hard', BAG_COLORS[(i * 3 + 1) % BAG_COLORS.length]);
    b.position.set(x, i < 2 ? 0.52 : 1.12, -1.0);
    g.add(b);
  });
  g.userData = { kind: 'serviceDesk', agent: V(0, -0.55), customer: V(0, 0.75) };
  return g;
}

export function claimHall({ ambient = true } = {}) {
  const W = 15, D = 11;
  const k = makeKit(W, D, { accent: PALETTE.orange, glassSide: 'none', openings: [{ side: 's', at: 4.2, width: 2.6 }, { side: 'n', at: -6, width: 2 }, { side: 'e', at: 0, width: 2.4 }] });
  const c1 = k.put(carousel({ length: 7, width: 2.8, bags: ambient ? 10 : 2 }), -1.6, -1.4);
  k.put(claimSign({ belt: 1 }), 3.2, -3.4);
  // waiting passengers around the belt; one lifting a bag off
  // arriving passengers: wait at the belt, spot their bag, lift it off, head for the exit
  const spots = [[-4.6, 0.65], [-3.2, 0.7], [-1.6, 0.75], [0.0, 0.7], [1.4, 0.65], [-5.95, -0.6], [2.75, -1.0]];
  (ambient ? ['woman', 'senior', 'business', 'child', 'passenger', 'woman', 'backpacker'] : []).forEach((type, i) => {
    const [x, z] = spots[i];
    const look = x < -5.5 ? LOOK.px : x > 2.5 ? LOOK.nx : LOOK.nz;
    k.flow(type, [
      { to: V(-6, -5.9), bag: false },
      { to: V(-6.4, -3.8) },
      { to: V(-6.4, x < -5.5 ? z : 1.8) }, // go round the carousel, not through it
      { to: V(x < -5.5 ? -6.4 : x, x < -5.5 ? z : 1.8) },
      { to: V(x, z), wait: 6 + (i % 3) * 2, look },
      { to: V(x, z), wait: 1.4, mode: 'lift', look, bag: true },
      { to: V(x, 2.0) },
      { to: V(4.2, 3.9) },
      { to: V(4.2, 5.9) },
    ], { offset: i * 3.4, speed: 1.0 });
  });
  k.put(trolleyRack(6), -6.4, 4.2, 0);
  const t = trolley({ bags: [{ kind: 'hard', color: PALETTE.navy }, { kind: 'soft', color: PALETTE.yellow }] });
  k.put(t, -0.5, 3.2, Math.PI);
  k.who('business', 0.05, 3.2, LOOK.nx, 'hold', { noBag: true });
  // R8 in the south-east corner
  const desk = k.put(baggageServiceDesk(), 5.0, 2.4, 0);
  k.who('serviceAgent', 5.0, 2.4 - 0.55, LOOK.pz, 'type');
  k.who('backpacker', 5.0, 3.15, LOOK.nz, 'idle', { noBag: true });
  k.put(hangingSign({ text: '出口 到着ロビー', sub: 'Exit · Arrivals Hall', arrow: '↓', width: 2.6 }), 4.2, 3.9);
  k.put(planter(), -6.8, -4.6);
  k.tick((tt, dt) => c1.userData.update(tt, dt));
  const room = k.done();
  // belt-side spots: [x, z, which way to face]
  const belt = [[-4.6, 0.65], [-3.9, 0.7], [-3.2, 0.7], [-2.4, 0.72], [-1.6, 0.75], [-0.8, 0.72], [0.0, 0.7], [0.7, 0.68], [1.4, 0.65], [-5.95, -0.6], [-5.95, -1.6], [2.75, -1.0], [2.75, -2.0]]
    .map(([x, z]) => ({ at: V(x, z), look: x < -5.5 ? LOOK.px : x > 2.5 ? LOOK.nx : LOOK.nz }));
  room.userData.anchors = { entryN: V(-6, -5.9), aisle: V(-6.4, -3.8), aisleS: V(-6.4, 1.8), belt, exitS: V(4.2, 5.9), toExit: V(4.2, 3.9), service: V(4.3, 3.3), carousel: c1 };
  return room;
}

// ======================================================================
// R9 到着ロビー — accent: cream
// ======================================================================

// Sliding glass exit doors with a portal frame. Doors open along ±X. Faces +Z (the lobby).
export function arrivalDoors({ width = 2.4 } = {}) {
  const g = new THREE.Group();
  for (const s of [1, -1]) g.add(box(0.25, 2.5, 0.35, mat(PALETTE.white), s * (width / 2 + 0.12), 1.25, 0));
  g.add(box(width + 0.5, 0.35, 0.35, mat(PALETTE.white), 0, 2.67, 0));
  const sign = textPanel({ w: width + 0.4, h: 0.5, bg: PALETTE.yellow, fg: '#1c2232', lines: [['到着口  Arrivals', 0.55, 700]], glow: 0.3, align: 'center' });
  sign.position.set(0, 3.1, 0.05);
  g.add(sign);
  const leaves = [1, -1].map((s) => {
    const leaf = mesh(new THREE.BoxGeometry(width / 2, 2.3, 0.04), glass(), s * width / 4, 1.15, 0);
    leaf.userData.dynamic = true;
    g.add(leaf);
    return [leaf, s];
  });
  g.userData = {
    kind: 'doors',
    open: 0,
    update: (t, dt) => {
      const target = Math.sin(t * 0.9) > -0.2 ? 1 : 0;
      g.userData.open += (target - g.userData.open) * Math.min(1, dt * 4);
      for (const [leaf, s] of leaves) leaf.position.x = s * (width / 4 + g.userData.open * width * 0.45);
    },
  };
  return g;
}

export function railing(length) {
  const g = new THREE.Group();
  g.add(box(length, 0.05, 0.06, metal(), 0, 0.85, 0));
  g.add(box(length, 0.03, 0.04, metal(), 0, 0.45, 0));
  for (let x = -length / 2; x <= length / 2 + 1e-6; x += 1.2) g.add(cyl(0.025, 0.025, 0.85, metal(), x, 0.425, 0, 6));
  return g;
}

// A hand-held welcome board; attach to a character in 'hold' pose.
export function welcomeBoard(text = 'Welcome!') {
  const p = textPanel({ w: 0.62, h: 0.32, bg: PALETTE.white, fg: '#1c2232', lines: [[text, 0.55, 700]], glow: 0.1, depth: 0.02, align: 'center' });
  p.position.set(0.42, 0.72, 0);
  p.rotation.y = Math.PI / 2;
  return p;
}

export function infoDesk() {
  const g = new THREE.Group();
  const ring = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.9, 32, 1, false, -Math.PI * 0.8, Math.PI * 1.6), mat(PALETTE.white), 0, 0.45, 0);
  g.add(ring);
  g.add(mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.06, 32, 1, false, -Math.PI * 0.8, Math.PI * 1.6), mat(PALETTE.sky), 0, 0.92, 0));
  const i = textPanel({ w: 0.7, h: 0.7, bg: PALETTE.sky, fg: '#fff', lines: [['i', 0.8, 700]], glow: 0.4, align: 'center' });
  i.position.set(0, 2.2, 0);
  g.add(i, cyl(0.04, 0.04, 1.3, metal(), 0, 1.5, 0, 8));
  g.userData = { kind: 'info', agent: V(0, -0.3) };
  return g;
}

// Arrivals hall. Passengers come in through the doors on the west wall and walk an aisle
// between two railings; greeters wait outside the railings; exits to the curb are south.
export function arrivalsLobby({ ambient = true } = {}) {
  const W = 15, D = 11;
  const k = makeKit(W, D, { accent: PALETTE.cream, glassSide: 's', openings: [{ side: 'w', at: 0, width: 2.4 }, { side: 's', at: -2, width: 3 }, { side: 's', at: 4, width: 3 }] });
  k.put(arrivalDoors(), -7.3, 0, Math.PI / 2);
  for (const z of [-1.5, 1.5]) k.put(railing(5), -4.5, z);
  // waiting spots outside the railings, facing the aisle
  const slots = [];
  for (let x = -6.4; x <= -2.4; x += 0.8) for (const s of [-1, 1]) slots.push({ at: V(x, s * 2.15), look: s < 0 ? LOOK.pz : LOOK.nz });
  if (ambient) {
    const greet = [['woman', 'SORA!'], ['child', 'おかえり'], ['business', 'Mr. Tanaka'], ['senior', 'ミドリさん'], ['passenger', 'Welcome']];
    greet.forEach(([type, text], i) => {
      const sl = slots[i * 2 + (i % 2)];
      const p = k.who(type, sl.at.x, sl.at.z, sl.look, 'hold', { noBag: true });
      p.add(welcomeBoard(text));
    });
    k.who('senior', -1.2, 0.5, LOOK.px, 'idle', { noBag: true }); // a reunion at the end of the aisle
    k.who('child', -0.7, 0.5, LOOK.nx, 'hold', { noBag: true });
    for (let i = 0; i < 4; i++) k.walker(['passenger', 'backpacker', 'woman', 'business'][i], [V(-7.9, 0), V(-1.6, 0), V(i % 2 ? 4 : -2, 3.0), V(i % 2 ? 4 : -2, 5.9)], { speed: 1.0, offset: i / 4 });
  }
  k.put(infoDesk(), 5.2, -2.6);
  k.who('agent', 5.2, -2.9, LOOK.pz, 'type');
  k.put(bench({ seats: 4 }), 2.2, 1.6);
  k.who('senior', 1.7, 1.65, LOOK.pz, 'sit');
  k.put(hangingSign({ text: 'タクシー・バス', sub: 'Taxi · Bus', arrow: '↓', width: 2.6 }), 4, 3.6);
  k.put(hangingSign({ text: '駐車場・お迎え', sub: 'Parking · Pick-up', arrow: '↓', width: 2.6 }), -2, 3.6);
  for (const [x, z] of [[-6.8, -4.6], [6.8, -4.6], [6.8, 4.6]]) k.put(planter({ size: 1.1 }), x, z);
  const room = k.done();
  room.userData.anchors = { doorIn: V(-7.9, 0), aisleIn: V(-6.6, 0), aisleEnd: V(-1.6, 0), slots, exits: [V(-2, 5.9), V(4, 5.9)], toExits: [V(-2, 3.0), V(4, 3.0)] };
  return room;
}

// ======================================================================
// 1F 入国審査（ゲート下ホール）— accent: navy
// ======================================================================

// One passport-control booth. Officer sits on −X; the passenger stands on +X.
export function immigrationBooth({ label = '日本人' } = {}) {
  const g = new THREE.Group();
  g.add(box(0.22, 0.95, 0.9, mat(PALETTE.navy), 0.32, 0.475, 0)); // counter
  g.add(box(0.3, 0.05, 0.94, mat(PALETTE.white), 0.32, 0.97, 0));
  for (const s of [-1, 1]) g.add(box(0.85, 0.95, 0.06, mat(PALETTE.navy), -0.05, 0.475, s * 0.45));
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.55, 0.88), glass(), 0.4, 1.28, 0)); // glass screen
  g.add(rbox(0.3, 0.2, 0.04, 0.02, mat(PALETTE.ink), 0.15, 1.1, -0.2).rotateY(Math.PI / 2));
  g.add(rbox(0.36, 0.08, 0.36, 0.03, mat(PALETTE.ink), -0.25, 0.3, 0)); // stool
  g.add(cyl(0.03, 0.03, 0.3, metal(), -0.25, 0.15, 0, 6));
  const sign = textPanel({ w: 0.9, h: 0.3, bg: label === '日本人' ? PALETTE.navy : PALETTE.teal, fg: '#fff', lines: [[label, 0.6, 700]], glow: 0.4, align: 'center' });
  sign.position.set(0.1, 2.0, 0);
  sign.rotation.y = Math.PI / 2;
  g.add(sign, cyl(0.02, 0.02, 0.6, metal(), 0.1, 2.45, 0, 4));
  g.userData = { kind: 'booth', officer: V(-0.22, 0), front: V(0.85, 0) };
  return g;
}

export function immigrationHall({ ambient = true } = {}) {
  const W = 15, D = 11;
  const k = makeKit(W, D, { accent: PALETTE.navy, glassSide: 'none', openings: [{ side: 'e', at: 0, width: 2.4 }, { side: 'w', at: -1.6, width: 6 }] });
  // domestic passengers walk straight through behind a glass wall on the north side
  const part = glassPartition(13.8);
  part.position.set(-0.4, 0, -3.5);
  k.g.add(part);
  // international: a queue, then four booths (two for Japanese passports, two for visitors)
  const maze = queueMaze({ lanes: 3, length: 5, gap: 0.95 });
  k.put(maze, 6.0, 1.6, Math.PI);
  const Y = new THREE.Vector3(0, 1, 0);
  const queue = maze.userData.path.map((p) => p.clone().applyAxisAngle(Y, Math.PI).add(maze.position));
  const booths = [-2.6, -1.0, 0.6, 2.2].map((z, i) => {
    const b = k.put(immigrationBooth({ label: i < 2 ? '日本人' : '外国人' }), -1.6, z);
    k.who('officer', -1.6 + b.userData.officer.x, z, LOOK.px, 'type');
    return { z, front: V(-1.6 + b.userData.front.x, z), lane: V(-1.6 + b.userData.front.x, z + 0.8), past: V(-3.4, z + 0.8), japanese: i < 2 };
  });
  k.put(hangingSign({ text: '入国審査', sub: 'Immigration', arrow: '←', width: 2.4 }), 3.6, -2.5);
  k.put(hangingSign({ text: '国内線 到着', sub: 'Domestic Arrivals', arrow: '←', width: 2.6 }), 3.2, -4.4);
  k.put(textPanel({ w: 2.0, h: 0.5, bg: PALETTE.navy, fg: '#fff', lines: [['パスポートをご用意ください', 0.42, 600], ['Passports ready, please', 0.3, 500]] }), 6.8, 3.6, -Math.PI / 2, 0.9);
  k.put(planter(), -6.8, 4.6);

  const anchors = {
    entryE: V(7.9, 0), queue, booths,
    exitIntl: V(-7.9, 0.4),
    domestic: [V(7.2, -4.3), V(-7.9, -4.3)],
  };
  // a passenger's walk through the hall (local), shared with the airport's passengers
  anchors.steps = (international, booth) => {
    if (!international) return anchors.domestic.map((p) => ({ to: p }));
    const b = booths[booth];
    return [
      ...queue.map((p) => ({ to: p })),
      { to: V(b.front.x + 0.6, b.front.z) },
      { to: b.front, wait: 3.5, look: LOOK.nx, mode: 'hold', act: 'passport' },
      { to: b.lane }, { to: b.past },
      { to: V(-5.2, 0.4) }, { to: anchors.exitIntl },
    ];
  };
  if (ambient) {
    ['backpacker', 'business', 'woman', 'passenger', 'senior', 'child'].forEach((type, i) => {
      k.flow(type, [{ to: anchors.entryE }, ...anchors.steps(true, i % 4)], { offset: i * 4, speed: 1.0 });
    });
    ['woman', 'business', 'passenger'].forEach((type, i) => {
      k.flow(type, [{ to: anchors.entryE }, ...anchors.steps(false)], { offset: i * 5, speed: 1.1 });
    });
  }
  const room = k.done();
  room.userData.anchors = anchors;
  return room;
}

// The cabin's frame (world/CABIN.md §5.2): a cut-open fuselage section, overhead bins with mood light,
// a door, and the wall-and-curtain between classes. Nose +X, floor y = 0, left −Z.
import * as THREE from 'three';
import { PALETTE, CP, M, mood, mat, bx, rb, cy, put, pivot, stateful } from './common.js';

export const SHELL = {
  R: 3.4, // outer radius
  RI: 3.22, // inner lining radius
  cy: 1.3, // the tube's centre above the floor
  cut: 1.75, // the dollhouse cut, just above the windows
  winY: 1.05,
  aisles: [-1.15, 1.15], aisleW: 0.7,
};
// inner wall half-width at height y
export const wallZ = (y, r = SHELL.RI) => Math.sqrt(r * r - (y - SHELL.cy) ** 2);

// a ring sector (cross-section from the cut on one side, under the floor, to the cut on the other) extruded along X
function ringGeo(r0, r1, length) {
  const arc = (r) => Math.acos((SHELL.cy - SHELL.cut) / r); // angle from straight down to the cut
  const pts = [];
  const n = 40;
  for (let i = 0; i <= n; i++) { const a = -arc(r1) + (2 * arc(r1) * i) / n; pts.push(new THREE.Vector2(r1 * Math.sin(a), SHELL.cy - r1 * Math.cos(a))); }
  for (let i = n; i >= 0; i--) { const a = -arc(r0) + (2 * arc(r0) * i) / n; pts.push(new THREE.Vector2(r0 * Math.sin(a), SHELL.cy - r0 * Math.cos(a))); }
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: length, bevelEnabled: false, curveSegments: 1 });
  geo.rotateY(Math.PI / 2).translate(-length / 2, 0, 0);
  return geo;
}

// ---------- F1 fuselage section ----------
// length along X; windows every `pitch`; each window has a shade (state.shades: 0 open … 1 closed, one number for all,
// or setShade(i, k) for one). Floor with carpet, aisle runners and the floor-path lights.
export function section(length = 6, { pitch = 0.85, livery = PALETTE.white, cheat = PALETTE.orange, windows = true, aisles = SHELL.aisles, skip = [] } = {}) {
  const g = new THREE.Group();
  const { R, RI, cut, winY } = SHELL;
  put(g, ringGeo(R - 0.05, R, length), mat(livery, { roughness: 0.5 }));
  put(g, ringGeo(RI - 0.04, RI, length), M.lining);
  // the cut edge reads like a section drawing: a dark band over the gap between skin and lining
  for (const s of [-1, 1]) bx(g, length, 0.03, R - RI + 0.06, M.ink, 0, cut, s * (wallZ(cut, (R + RI) / 2)));
  // a cheatline on the outside
  for (const s of [-1, 1]) {
    const band = bx(g, length, 0.16, 0.02, mat(cheat), 0, 0.6, s * (wallZ(0.6, R) + 0.005));
    band.castShadow = false;
  }
  // floor slab, carpet, aisle runners
  const fz = wallZ(0);
  bx(g, length, 0.14, 2 * fz, M.trim, 0, -0.07, 0);
  bx(g, length, 0.02, 2 * fz - 0.04, M.carpet, 0, 0.01, 0);
  for (const z of aisles) bx(g, length, 0.022, SHELL.aisleW - 0.08, M.runner, 0, 0.012, z);
  // floor-path lights along both edges of each aisle: one instanced mesh
  const per = Math.floor(length / 0.5);
  const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.012, 0.025), M.glow(0xfff1c8, 0.9), per * aisles.length * 2);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (const z of aisles) for (const e of [-1, 1]) for (let i = 0; i < per; i++) dots.setMatrixAt(k++, m4.makeTranslation(-length / 2 + 0.25 + i * 0.5, 0.024, z + e * (SHELL.aisleW / 2 - 0.02)));
  g.add(dots);
  // a dado rail under the windows
  for (const s of [-1, 1]) bx(g, length, 0.04, 0.05, M.panel, 0, 0.62, s * (wallZ(0.62) - 0.03));
  // windows with shades
  const shades = [];
  if (windows) {
    const wz = wallZ(winY) - 0.02;
    for (let x = -length / 2 + pitch / 2; x < length / 2; x += pitch) for (const s of [-1, 1]) {
      if (skip.some(([a, b]) => x + 0.2 > a && x + 0.2 < b)) continue; // no window where a door is
      const w = new THREE.Group();
      w.position.set(x + 0.2, winY, s * wz);
      w.rotation.x = s * -0.06; // the wall leans in a little
      g.add(w);
      rb(w, 0.36, 0.48, 0.04, 0.12, M.panel, 0, 0, 0);
      rb(w, 0.27, 0.38, 0.012, 0.1, mood.sky, 0, 0, -s * 0.022);
      const shade = bx(w, 0.27, 0.38, 0.012, M.white, 0, 0, -s * 0.03);
      shade.userData.dynamic = true;
      shades.push({ mesh: shade, want: 0, k: 0, x: x + 0.2, side: s });
    }
  }
  g.userData.kind = 'section';
  g.userData.length = length;
  g.userData.state = { shades: 0 };
  g.userData.setShade = (i, k) => { if (shades[i]) shades[i].want = k; };
  g.userData.shadeCount = shades.length;
  g.userData.windows = shades.map(({ x, side }) => ({ x, side }));
  let lastAll = 0;
  g.userData.update = (t, dt = 1 / 60) => {
    if (g.userData.state.shades !== lastAll) { lastAll = g.userData.state.shades; for (const s of shades) s.want = lastAll; }
    for (const s of shades) {
      s.k += (s.want - s.k) * Math.min(1, dt * 3);
      const k = Math.max(0.02, s.k);
      s.mesh.scale.y = k;
      s.mesh.position.y = 0.19 - 0.19 * k;
    }
  };
  return g;
}

// ---------- F2 overhead bins ----------
// kind 'side' (over the window seats, doors face the aisle) or 'center' (doors on both sides).
// Translucent so the seats show through from above; a mood-light strip along the lower edge.
export function bins(length = 4, { kind = 'side', side = 1 } = {}) {
  const g = new THREE.Group();
  const glass = mat(PALETTE.white, { transparent: true, opacity: 0.14, depthWrite: false });
  const doorMat = mat(PALETTE.white, { transparent: true, opacity: 0.3, depthWrite: false });
  const doors = [];
  const addDoors = (z0, face) => {
    for (let x = -length / 2 + 0.5; x < length / 2; x += 1.0) {
      const hinge = pivot(g, x, 2.16, z0);
      bx(hinge, 0.96, 0.38, 0.03, doorMat, 0, -0.19, 0);
      bx(hinge, 0.2, 0.025, 0.02, M.trim, 0, -0.34, face * 0.02); // the latch
      doors.push({ hinge, face });
    }
  };
  if (kind === 'side') {
    const z = side * 2.62;
    bx(g, length, 0.4, 0.8, glass, 0, 1.96, z);
    for (const e of [-1, 1]) bx(g, length, 0.03, 0.06, M.panel, 0, 1.76, z + e * 0.38); // only the rails are solid
    bx(g, length, 0.02, 0.025, mood.strip, 0, 1.745, z - side * 0.41);
    addDoors(z - side * 0.41, -side);
  } else {
    bx(g, length, 0.36, 1.3, glass, 0, 2.0, 0);
    for (const e of [-1, 1]) bx(g, length, 0.03, 0.06, M.panel, 0, 1.8, e * 0.63);
    for (const s of [-1, 1]) { bx(g, length, 0.02, 0.025, mood.strip, 0, 1.785, s * 0.66); addDoors(s * 0.66, s); }
  }
  stateful(g, { open: 0 }, (s) => { for (const d of doors) d.hinge.rotation.x = -d.face * s.open * 1.25; });
  g.userData.kind = 'bins';
  return g;
}

// ---------- F3 door ----------
// A Type A door in the left wall, seen from inside (faces +Z). armed: the slide lever across the window.
export function cabinDoor() {
  const g = new THREE.Group();
  for (const x of [-0.52, 0.52]) bx(g, 0.08, 1.72, 0.14, M.trim, x, 0.86, 0);
  bx(g, 1.12, 0.02, 0.5, M.trim, 0, 0.01, 0.2); // the sill
  rb(g, 0.96, 1.66, 0.09, 0.06, M.panel, 0, 0.85, -0.02);
  const port = cy(g, 0.1, 0.1, 0.03, mood.sky, 0, 1.28, 0.03, 20);
  port.rotation.x = Math.PI / 2;
  const ring = put(g, new THREE.TorusGeometry(0.11, 0.018, 8, 24), M.trim, 0, 1.28, 0.035);
  ring.castShadow = false;
  rb(g, 0.34, 0.07, 0.06, 0.02, M.steel, 0.18, 0.92, 0.05); // the handle
  bx(g, 0.2, 0.08, 0.01, mat(PALETTE.yellow), -0.2, 0.62, 0.03); // the instruction plate
  const lever = pivot(g, -0.3, 1.05, 0.06);
  bx(lever, 0.22, 0.04, 0.035, mat(PALETTE.red), 0.11, 0, 0);
  bx(g, 0.34, 0.11, 0.03, M.glow(0x45e07a, 1.2), 0, 1.62, 0.07); // EXIT
  bx(g, 0.24, 0.04, 0.032, M.white, 0, 1.62, 0.072);
  stateful(g, { armed: 1 }, (s) => { lever.rotation.z = (1 - s.armed) * 1.2; });
  g.userData.kind = 'door';
  return g;
}

// ---------- F4 divider and curtains ----------
// Wall panels across the cabin with a gap in each aisle; a pleated curtain hangs in each gap (open 0 → 1 bunches it).
export function divider({ aisles = SHELL.aisles, accent = PALETTE.teal, label = null } = {}) {
  const g = new THREE.Group();
  const h = 1.62, aw = SHELL.aisleW, fz = wallZ(0.8) - 0.05;
  const edges = [-fz, ...aisles.flatMap((z) => [z - aw / 2, z + aw / 2]), fz];
  for (let i = 0; i < edges.length; i += 2) {
    const [z0, z1] = [edges[i], edges[i + 1]], w = z1 - z0, zc = (z0 + z1) / 2;
    bx(g, 0.08, h, w, M.lining, 0, h / 2, zc);
    bx(g, 0.085, 0.07, w, mat(accent), 0, 1.25, zc);
    bx(g, 0.09, 0.2, w, M.trim, 0, 0.1, zc);
  }
  const curtains = aisles.map((z) => {
    bx(g, 0.04, 0.04, aw + 0.04, M.steel, 0, h, z);
    const n = 7, pleats = [];
    for (let i = 0; i < n; i++) {
      const p = bx(g, i % 2 ? 0.05 : 0.035, h - 0.08, aw / n + 0.01, M.fabric(PALETTE.navy), (i % 2) * 0.02, (h - 0.08) / 2 + 0.02, 0);
      p.userData.dynamic = true;
      pleats.push(p);
    }
    return { z, pleats };
  });
  stateful(g, { open: 0 }, (s) => {
    for (const c of curtains) c.pleats.forEach((p, i) => {
      const w = aw / c.pleats.length;
      p.position.z = c.z - aw / 2 + (i + 0.5) * w * (1 - s.open * 0.8);
      p.scale.z = 1 - s.open * 0.55;
    });
  });
  g.userData.kind = 'divider';
  return g;
}

// ---------- nose and tail ----------
// A lathe of the fuselage profile, kept below the cut (the same trick as the airport's cabin kit).
// kind 'nose' runs from x 0 forward (+X) to the tip; 'tail' from x 0 back (−X) and tapers higher up.
export function cap(kind = 'nose', { livery = PALETTE.white } = {}) {
  const g = new THREE.Group();
  const { R, cy: c, cut } = SHELL;
  const L = kind === 'nose' ? 6 : 9;
  const prof = [];
  for (let i = 0; i <= 16; i++) {
    const s = i / 16;
    const r = kind === 'nose' ? R * Math.sqrt(Math.max(0, 1 - s ** 2.2)) : R * (1 - s) + 0.5 * s;
    prof.push(new THREE.Vector2(Math.max(0.001, r), s * L));
  }
  const margin = Math.asin((cut - c) / R);
  const lathe = (pts, material) => {
    const m = put(g, new THREE.LatheGeometry(pts, 40, -margin, Math.PI + 2 * margin), material);
    m.rotation.z = kind === 'nose' ? -Math.PI / 2 : Math.PI / 2;
    m.position.set(0, c, 0);
    if (kind === 'tail') m.rotation.x = Math.PI; // keep the open side up after turning the axis to −X
    return m;
  };
  lathe(prof, mat(livery, { roughness: 0.5, side: THREE.DoubleSide }));
  lathe(prof.map((p) => new THREE.Vector2(Math.max(0.001, p.x - 0.16), p.y)), mat(CP.lining, { roughness: 0.8, side: THREE.BackSide }));
  return g;
}

// wings, engines and the fin, so from above the cabin still reads as an aircraft
export function airframe({ wingX = -2, finX = -24, livery = { tail: PALETTE.orange, engine: PALETTE.navy } } = {}) {
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    const shape = new THREE.Shape([[4, 0], [-4.5, 11], [-6.8, 11], [-4.5, 0]].map(([a, b]) => new THREE.Vector2(a, b * s)));
    const w = put(g, new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false }).rotateX(-Math.PI / 2), mat(PALETTE.cream), wingX, -1.2, 0);
    w.receiveShadow = true;
    const eng = put(g, new THREE.CylinderGeometry(1.25, 1.05, 4.6, 28).rotateZ(-Math.PI / 2), mat(livery.engine), wingX + 1.2, -2.0, s * 5.6);
    put(eng, new THREE.CylinderGeometry(0.8, 0.8, 0.05, 24).rotateZ(-Math.PI / 2), M.ink, 2.31, 0, 0);
    bx(g, 1.6, 0.9, 0.3, mat(PALETTE.cream), wingX + 0.6, -1.3, s * 5.6); // pylon
  }
  const fin = new THREE.Shape([[0, 0], [-5.5, 8], [-8, 8], [-7.5, 0]].map(([a, b]) => new THREE.Vector2(a, b)));
  put(g, new THREE.ExtrudeGeometry(fin, { depth: 0.4, bevelEnabled: false }).translate(0, 0, -0.2), mat(livery.tail), finX, 2.6, 0);
  for (const s of [1, -1]) {
    const tp = new THREE.Shape([[0, 0], [-2.5, 5], [-4, 5], [-3.2, 0]].map(([a, b]) => new THREE.Vector2(a, b * s)));
    put(g, new THREE.ExtrudeGeometry(tp, { depth: 0.25, bevelEnabled: false }).rotateX(-Math.PI / 2), mat(PALETTE.cream), finX - 1.5, 1.2, 0);
  }
  return g;
}

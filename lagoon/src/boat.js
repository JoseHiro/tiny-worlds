// The longtail boat (lagoon/DESIGN.md §1.5): a long narrow wooden hull, planked in bands of orange-brown, its bow sweeping up
// into a tall post wrapped in green cloth with ribbons and garlands tied below; at the stern a car engine on a pivot, its
// long shaft trailing a propeller in the water. Nose +x, the waterline at y = 0. Each kind is built once and its shapes
// shared by every boat of that kind; only the propeller and the ribbons' streamers move.
import * as THREE from 'three';
import { Kit, toy } from '../../fuji/src/kit.js';

export const LEN = 2.7;
const WIDTH = 0.3;
const PLANK = [0x9a4a2c, 0xd9803f, 0xc87038, 0xd9803f];
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// u from the stern (0) to the bow (1)
const half = (u) => WIDTH * (u < 0.45 ? 0.62 + 0.38 * Math.sin((u / 0.45) * Math.PI / 2) : Math.pow(Math.cos(((u - 0.45) / 0.55) * Math.PI / 2), 0.65) * 0.97 + 0.03);
export const sheer = (u) => 0.27 + 0.04 * (1 - u) + Math.pow(Math.max(0, (u - 0.66) / 0.34), 2.3) * 0.62;
const keel = (u) => -0.11 + Math.pow(Math.max(0, (u - 0.7) / 0.3), 2) * 0.42 + (u < 0.08 ? (0.08 - u) * 0.6 : 0);
const X = (u) => -LEN / 2 + u * LEN;

// the hull: rings across it joined stern to bow, each band of planks its own colour
function hull() {
  const N = 40, M = PLANK.length * 4, pos = [], col = [], c = new THREE.Color(); // (M: two strips a plank, up each side)
  const ring = (u) => { const pts = []; for (let j = 0; j <= M; j++) { const ph = (j / M) * Math.PI, cs = Math.cos(ph), w = half(u), s = sheer(u), k = keel(u); pts.push([X(u), s - (s - k) * Math.pow(Math.sin(ph), 0.55), -Math.sign(cs) * Math.pow(Math.abs(cs), 0.7) * w]); } return pts; };
  const tri = (a, b, d, j) => { for (const p of [a, b, d]) { pos.push(...p); c.set(PLANK[Math.floor(Math.min(j, M - 1 - j) / 2)]); /* (the top band, at the gunwale, is the dark one) */ col.push(c.r, c.g, c.b); } };
  for (let i = 0; i < N; i++) {
    const A = ring(i / N), B = ring((i + 1) / N);
    for (let j = 0; j < M; j++) { tri(A[j], B[j], A[j + 1], j); tri(A[j + 1], B[j], B[j + 1], j); }
  }
  const T = ring(0), mid = [X(0), (sheer(0) + keel(0)) / 2, 0]; // the transom, a flat board across the stern
  for (let j = 0; j < M; j++) tri(T[j + 1], mid, T[j], 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
// a flat strip inside the hull, from u0 to u1, at a height and a share of the width
function strip(u0, u1, y, share, color) {
  const pos = [], n = 16;
  for (let i = 0; i < n; i++) {
    const a = u0 + ((u1 - u0) * i) / n, b = u0 + ((u1 - u0) * (i + 1)) / n, ya = y(a), yb = y(b), wa = half(a) * share, wb = half(b) * share;
    pos.push(X(a), ya, -wa, X(a), ya, wa, X(b), yb, -wb, X(b), yb, -wb, X(a), ya, wa, X(b), yb, wb);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const c = new THREE.Color(color), cl = new Float32Array(pos.length); for (let i = 0; i < cl.length; i += 3) cl.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
  return g;
}

const RIBBON = [0xff7aa8, 0x5fc4f0, 0xffd23f, 0xe8483f, 0x7cc94a, 0xffffff];
export const POST = [X(1) - 0.02, sheer(1)]; // where the prow post stands

function build(canopy) {
  const kit = new Kit();
  kit.parts.push(hull(), strip(0.06, 0.66, () => 0.0, 0.84, 0xd9965a), strip(0.62, 0.95, (u) => sheer(u) - 0.025, 0.9, 0xd9965a)); // (the floor, and the bow deck up at the gunwale, where you sit)
  for (const s of [-1, 1]) kit.tube(Array.from({ length: 12 }, (_, i) => { const u = 0.01 + (i / 11) * 0.97; return [X(u), sheer(u) + 0.012, s * half(u) * 0.97]; }), 0.022, 0x7a3720, 40); // (the gunwales)
  for (const u of [0.22, 0.38, 0.54]) kit.box(0.12, 0.035, half(u) * 1.9, 0xd9965a, X(u), 0.17, 0, { r: 0.012 }); // (the benches)
  // the prow: a post rising from the bow, the green cloth on top, and the ribbons and garlands tied round below it
  const [px, py] = POST;
  kit.box(0.09, 0.3, 0.07, 0xa9562c, px, py + 0.1, 0, { rz: -0.18, r: 0.025 });
  kit.box(0.13, 0.11, 0.1, 0x7cc94a, px + 0.04, py + 0.25, 0, { rz: -0.18, r: 0.035 });
  kit.box(0.135, 0.025, 0.105, 0xfdfbf4, px + 0.035, py + 0.19, 0, { rz: -0.18, r: 0.01 });
  RIBBON.forEach((col, i) => kit.add(new THREE.TorusGeometry(0.06, 0.016, 6, 14).rotateX(Math.PI / 2), col, px - 0.008 - i * 0.004, py + 0.02 + i * 0.026, 0, { rz: -0.18, s: [1, 1, 0.85] }));
  for (let i = 0; i < 9; i++) kit.ball(0.025, [0xff7aa8, 0xffd23f, 0xffffff][i % 3], px - 0.07 + Math.cos(i * 0.7) * 0.01, py - 0.02 - i * 0.012, Math.sin(i * 0.7) * 0.07); // (a garland of flowers)
  // the engine and its long tail
  const ex = X(0) + 0.12;
  kit.box(0.08, 0.06, 0.08, 0x5d6170, ex, sheer(0) + 0.03, 0, { r: 0.015 });
  kit.box(0.26, 0.15, 0.16, 0xb8bcc4, ex - 0.02, sheer(0) + 0.13, 0, { r: 0.035 });
  kit.box(0.18, 0.05, 0.12, 0xe8483f, ex - 0.02, sheer(0) + 0.22, 0, { r: 0.02 });
  const TILT = 0.35, sy = sheer(0) - 0.1; // (the shaft runs down from the engine into the water behind)
  kit.add(new THREE.CylinderGeometry(0.016, 0.016, 1.25, 8).rotateZ(Math.PI / 2 + TILT), 0x8f949c, ex - 0.72, sy, 0);
  kit.add(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8).rotateZ(Math.PI / 2 - 0.12), 0x8f949c, ex + 0.24, sheer(0) + 0.2, 0); // (the tiller, forward)
  if (canopy) { // the sun roof: four posts and a blue cloth
    for (const u of [0.2, 0.6]) for (const s of [-1, 1]) kit.post(0.012, 0.012, 0.15, 0.78, 0xd9d4c8, X(u), s * half(u) * 0.85);
    kit.box(LEN * 0.46, 0.04, WIDTH * 1.95, 0x2f7fd0, X(0.4), 0.8, 0, { r: 0.02 });
    kit.box(LEN * 0.46, 0.06, 0.02, 0xfdfbf4, X(0.4), 0.77, WIDTH * 0.98, { r: 0.01 });
    kit.box(LEN * 0.46, 0.06, 0.02, 0xfdfbf4, X(0.4), 0.77, -WIDTH * 0.98, { r: 0.01 });
  }
  const m = kit.bake(mat);
  return { geo: m.geometry, tip: [ex - 0.72 - Math.cos(TILT) * 0.625, sy - Math.sin(TILT) * 0.625] };
}

const kinds = {}, mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
const propMat = new THREE.MeshStandardMaterial({ color: 0xd0d4da, roughness: 0.4, metalness: 0.5 });
const propG = new THREE.BoxGeometry(0.012, 0.16, 0.035);
const streamG = new THREE.PlaneGeometry(0.14, 0.022).translate(-0.07, 0, 0), streamMats = RIBBON.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide }));

// a boat: { group, prop, streamers }. canopy: a tour boat with its roof
export function longtail(canopy = false) {
  const k = (kinds[canopy] ??= build(canopy));
  const group = new THREE.Group(), body = new THREE.Mesh(k.geo, mat);
  body.castShadow = true; body.receiveShadow = true; group.add(body);
  const prop = new THREE.Group(); prop.position.set(k.tip[0], k.tip[1], 0); group.add(prop);
  for (const r of [0, Math.PI / 2]) { const b = new THREE.Mesh(propG, propMat); b.rotation.x = r; prop.add(b); }
  const streamers = RIBBON.slice(0, 4).map((_, i) => { const s = new THREE.Mesh(streamG, streamMats[i]); s.position.set(POST[0] - 0.02, POST[1] + 0.05 + i * 0.03, (i - 1.5) * 0.03); group.add(s); return s; });
  return { group, prop, streamers };
}
// the ribbons blow back off the post, and the propeller turns (spin: turns a second, 0 when it idles)
export function flutter(b, t, spin = 0, wind = 1) {
  b.streamers.forEach((s, i) => { s.rotation.y = Math.sin(t * 3.1 + i * 1.3) * 0.35 * wind; s.rotation.z = -0.5 + Math.sin(t * 2.3 + i) * 0.15; });
  b.prop.rotation.x = t * spin * Math.PI * 2;
}

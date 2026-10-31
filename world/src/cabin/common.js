// Shared bits for the in-flight cabin (world/CABIN.md): cached geometry, the cabin palette,
// the mood lighting and the seat-back screens. Every material and geometry here is made once.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PALETTE, mat } from '../../../airport/src/parts.js';

export { PALETTE, mat };
export const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);

// ---------- cached geometry ----------

const geos = new Map();
const cached = (key, make) => { if (!geos.has(key)) geos.set(key, make()); return geos.get(key); };
// DETAIL: the whole cabin repeats parts a hundred times, so its page asks for fewer curve segments
// (set before building; the catalogue keeps the full detail)
export const DETAIL = { round: 3, curve: 1 };
const seg = (s, min = 6) => Math.max(min, Math.round(s * DETAIL.curve));
export const BOX = (w, h, d) => cached(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const RBOX = (w, h, d, r) => cached(`r${w}|${h}|${d}|${r}|${DETAIL.round}`, () => new RoundedBoxGeometry(w, h, d, DETAIL.round, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
export const CYL = (rt, rb, h, s = 16) => cached(`c${rt}|${rb}|${h}|${seg(s)}`, () => new THREE.CylinderGeometry(rt, rb, h, seg(s)));
export const SPH = (r, w = 14, h = 10) => cached(`s${r}|${seg(w)}|${seg(h, 4)}`, () => new THREE.SphereGeometry(r, seg(w), seg(h, 4)));
export const geoCount = () => geos.size;

export function put(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const bx = (g, w, h, d, m, x, y, z) => put(g, BOX(w, h, d), m, x, y, z);
export const rb = (g, w, h, d, r, m, x, y, z) => put(g, RBOX(w, h, d, r), m, x, y, z);
export const cy = (g, rt, rbot, h, m, x, y, z, s = 16) => put(g, CYL(rt, rbot, h, s), m, x, y, z);
export const sp = (g, r, m, x, y, z) => put(g, SPH(r), m, x, y, z);
export const pivot = (parent, x = 0, y = 0, z = 0) => { const p = new THREE.Group(); p.position.set(x, y, z); p.userData.dynamic = true; parent.add(p); return p; };

// ---------- palette (CABIN.md §3: one accent per zone) ----------

export const CP = {
  lining: 0xefe8dc, // walls and bulkheads
  panel: 0xe2dbcf, // seat-back shells, galley fronts
  plastic: 0xd6d0c4,
  trim: 0x4a4f59,
  carpet: 0x46526a,
  runner: 0x6b4652, // the aisle carpet
  biz: PALETTE.navy, bizShell: 0xe9e1d2, gold: 0xc9a24a,
  prem: PALETTE.teal, premHead: PALETTE.cream,
  eco: PALETTE.navy, ecoHead: PALETTE.sky,
  galley: 0xdcd8d0, steel: 0xc9ccd1,
};
export const M = {
  lining: mat(CP.lining, { roughness: 0.8 }),
  panel: mat(CP.panel, { roughness: 0.6 }),
  plastic: mat(CP.plastic, { roughness: 0.55 }),
  trim: mat(CP.trim, { roughness: 0.6 }),
  ink: mat(PALETTE.ink),
  white: mat(PALETTE.white),
  steel: mat(CP.steel, { metalness: 0.6, roughness: 0.3 }),
  gold: mat(CP.gold, { metalness: 0.5, roughness: 0.35 }),
  carpet: mat(CP.carpet, { roughness: 1 }),
  runner: mat(CP.runner, { roughness: 1 }),
  rubber: mat(PALETTE.tire, { roughness: 0.9 }),
  fabric: (c) => mat(c, { roughness: 0.92 }),
  leather: (c) => mat(c, { roughness: 0.5 }),
  glow: (c, i = 1) => cachedGlow(c, i),
};
const glows = new Map();
function cachedGlow(c, i) {
  const k = c + '|' + i;
  if (!glows.has(k)) glows.set(k, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.3 }));
  return glows.get(k);
}

// ---------- mood lighting (CABIN.md §3) ----------
// One light-strip material and one window-sky material for the whole cabin; setMood() recolours both.

export const MOODS = {
  boarding: { strip: 0xfff4e0, sky: 0xbfe0f0, lamp: 1.0 },
  cruise: { strip: 0xcfe0ff, sky: 0x9cc8e8, lamp: 0.8 },
  night: { strip: 0x6f5fd0, sky: 0x1d2a4a, lamp: 0.35 },
  dawn: { strip: 0xffa06a, sky: 0xf6b98a, lamp: 0.7 },
};
export const mood = {
  name: 'cruise',
  strip: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xcfe0ff, emissiveIntensity: 1.4, roughness: 0.4 }),
  sky: new THREE.MeshStandardMaterial({ color: 0x9cc8e8, emissive: 0x9cc8e8, emissiveIntensity: 0.55, roughness: 0.1 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xfff1c8, emissiveIntensity: 0.8 }),
  cur: { strip: new THREE.Color(0xcfe0ff), sky: new THREE.Color(0x9cc8e8), lamp: 0.8 },
};
export function setMood(name) { if (MOODS[name]) mood.name = name; }
// a page's hemisphere and sun follow the mood: dim and bluish at night, warm at dawn
const DAY = new THREE.Color(0xfffaf0), TINT = new THREE.Color();
export function moodLight(hemi, sun, { hemiI = 1.5, sunI = 2.2 } = {}) {
  const k = mood.cur.lamp;
  hemi.intensity = hemiI * (0.35 + 0.65 * k);
  sun.intensity = sunI * (0.2 + 0.8 * k);
  hemi.color.copy(DAY).lerp(TINT.copy(mood.cur.strip), (1 - k) * 0.6);
}
// eases the colours toward the chosen mood; call once a frame
export function tickMood(dt) {
  const m = MOODS[mood.name], k = Math.min(1, dt * 1.5);
  mood.cur.strip.lerp(new THREE.Color(m.strip), k);
  mood.cur.sky.lerp(new THREE.Color(m.sky), k);
  mood.cur.lamp += (m.lamp - mood.cur.lamp) * k;
  mood.strip.emissive.copy(mood.cur.strip);
  mood.sky.color.copy(mood.cur.sky);
  mood.sky.emissive.copy(mood.cur.sky);
  mood.lamp.emissiveIntensity = mood.cur.lamp;
}

// ---------- seat-back screens: two canvases shared by every screen ----------
// map  — the moving map: sea, the islands, a dashed route and the aircraft at `progress`
// movie — a strip of four cartoon frames; the screens step through them (two offsets so not every seat matches)

function canvasTex(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { c, ctx: c.getContext('2d'), tex };
}
const screenOf = (tex) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1, roughness: 0.25 });

const MAP = canvasTex(256, 160);
const ISLANDS = [ // rough blobs: Honshu, Kyushu, Shikoku, the Ryukyu chain (x, y, rx, ry, rotation)
  [168, 46, 70, 15, -0.55], [96, 98, 17, 22, 0.2], [128, 92, 18, 7, -0.2], [214, 18, 18, 10, -0.3],
  [70, 128, 5, 3, 0.4], [56, 138, 4, 3, 0], [42, 148, 7, 3, 0.5], [30, 154, 4, 2, 0],
];
const ROUTE = [[196, 52], [150, 74], [100, 112], [44, 148]]; // HND → OKA
function routeAt(p) {
  const seg = Math.min(ROUTE.length - 2, Math.floor(p * (ROUTE.length - 1)));
  const k = p * (ROUTE.length - 1) - seg;
  const [a, b] = [ROUTE[seg], ROUTE[seg + 1]];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
}
export function drawMap(progress = 0.4) {
  const { ctx } = MAP;
  ctx.fillStyle = '#1d3f66'; ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
  for (let x = 0; x < 256; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 160); ctx.stroke(); }
  for (let y = 0; y < 160; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
  ctx.fillStyle = '#d8c79a';
  for (const [x, y, rx, ry, r] of ISLANDS) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.setLineDash([4, 4]); ctx.strokeStyle = '#f2b84b'; ctx.lineWidth = 2;
  ctx.beginPath(); ROUTE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
  for (const [x, y] of [ROUTE[0], ROUTE.at(-1)]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
  const [px, py, ang] = routeAt(progress);
  ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -7); ctx.lineTo(-3, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 138, 256, 22);
  ctx.fillStyle = '#fff'; ctx.font = '600 11px Inter, sans-serif';
  ctx.fillText(`HND → OKA   ${Math.round(1560 * (1 - progress))} km`, 8, 153);
  ctx.fillText('11,000 m', 186, 153);
  MAP.tex.needsUpdate = true;
}
drawMap();

const MOVIE = canvasTex(512, 128);
(function drawMovie() {
  const { ctx } = MOVIE;
  const frames = [
    ['#7fc3e8', '#5fae6a', '#f2b84b'], // a meadow at noon
    ['#f6b98a', '#4f9d8f', '#e8673c'], // the sea at sunset
    ['#1d2a4a', '#2c3a57', '#fff1c8'], // night, a moon
    ['#f09a9a', '#f4f0e8', '#d9473b'], // a cartoon cat
  ];
  frames.forEach(([sky, ground, sun], i) => {
    const x0 = i * 128;
    ctx.fillStyle = sky; ctx.fillRect(x0, 0, 128, 128);
    ctx.fillStyle = ground; ctx.beginPath(); ctx.ellipse(x0 + 64, 128, 90, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(x0 + 30 + i * 18, 36, 14, 0, Math.PI * 2); ctx.fill();
    if (i === 3) { // ears and eyes
      ctx.fillStyle = '#f4f0e8'; ctx.beginPath(); ctx.arc(x0 + 64, 76, 30, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x0 + 40, 60); ctx.lineTo(x0 + 46, 32); ctx.lineTo(x0 + 60, 50); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x0 + 88, 60); ctx.lineTo(x0 + 82, 32); ctx.lineTo(x0 + 68, 50); ctx.fill();
      ctx.fillStyle = '#1c2232'; ctx.fillRect(x0 + 52, 70, 5, 8); ctx.fillRect(x0 + 72, 70, 5, 8);
    }
  });
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 4; i++) ctx.fillRect(i * 128, 120, 128, 8);
  MOVIE.tex.wrapS = THREE.RepeatWrapping;
  MOVIE.tex.repeat.set(0.25, 1);
  MOVIE.tex.needsUpdate = true;
})();
const movieB = MOVIE.tex.clone(); // shares the image; its own offset
movieB.repeat.set(0.25, 1);

export const SCREENS = {
  map: screenOf(MAP.tex),
  movie: screenOf(MOVIE.tex),
  movieB: screenOf(movieB),
  off: mat(0x15181f, { roughness: 0.2 }),
  menu: mat(0x2c3a57, { emissive: 0x2c3a57, emissiveIntensity: 0.6 }),
};
let lastMap = -1;
// call once a frame: steps the films, redraws the map when the aircraft has moved a pixel
export function tickScreens(t, progress = (t * 0.01) % 1) {
  MOVIE.tex.offset.x = Math.floor(t / 2.5) % 4 * 0.25;
  movieB.offset.x = (Math.floor(t / 3.1) + 2) % 4 * 0.25;
  if (Math.abs(progress - lastMap) > 0.004) { lastMap = progress; drawMap(progress); }
}

// ---------- moving parts ----------
// A part keeps its wanted state in userData.state (numbers ease toward it, others switch at once);
// apply(cur, t) poses the part from the eased values.
export function stateful(g, init, apply) {
  const cur = { ...init };
  g.userData.state = { ...init };
  const prev = g.userData.update;
  g.userData.update = (t, dt = 1 / 60) => {
    prev?.(t, dt);
    const k = Math.min(1, dt * 3.5);
    for (const key in g.userData.state) {
      const want = g.userData.state[key];
      cur[key] = typeof want === 'number' ? cur[key] + (want - cur[key]) * k : want;
    }
    apply(cur, t);
  };
  apply(cur, 0);
  g.userData.pose = apply; // instanced copies pose the template with their own values (instanced.js)
  return g;
}

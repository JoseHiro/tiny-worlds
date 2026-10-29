// Faces and hair for everyone built by person() (airport/src/parts.js), in every world.
// A face is one small curved patch on the front of the head, painted on a canvas: eyes with a shine, brows in the
// hair colour, a mouth and blush. Each face has an open and a closed half side by side, so a blink only swaps which
// half the patch shows. Hair is built from shells round the head that leave the face open, plus a few extra shapes
// per style. Crowds get their own look from a seed: skin, hair style and colour, and the face.
import * as THREE from 'three';

export const SKINS = [0xf1c7a5, 0xf6d6bf, 0xdfa883, 0xc08458, 0x8e5c3c];
const SKIN_WEIGHTS = [45, 20, 18, 10, 7];
export const HAIRS = { ink: 0x1d1f23, dark: 0x2a2018, brown: 0x4a3426, chestnut: 0x6b4a35, honey: 0xb08a5a, blonde: 0xd9b878, ginger: 0xa8552e, grey: 0xb9b6b0, white: 0xe6e3dc };
const HAIR_PICK = ['ink', 'ink', 'dark', 'dark', 'brown', 'brown', 'chestnut', 'honey', 'blonde', 'ginger'];

export const FACES = ['round', 'lash', 'calm', 'happy', 'kid', 'elder'];
export const SHORT_STYLES = ['short', 'side', 'fringe', 'buzz', 'spiky', 'curly', 'afro', 'thin'];
export const LONG_STYLES = ['long', 'wavy', 'pony', 'twin', 'bob', 'bun', 'topbun'];

// ---------- the face patch ----------
const R = 0.2; // the head sphere
const PHI = 0.85, T0 = 0.95, TL = 1.3; // the patch: ±0.85 rad round the front, from just under the hairline to the chin
const S = 128; // one half of the atlas
// head-local (y up, z across; the face looks along +x) → pixels in one half
function px(y, z) {
  const th = Math.acos(THREE.MathUtils.clamp(y / R, -1, 1)), st = Math.sin(th);
  const a = Math.asin(THREE.MathUtils.clamp(z / (R * st), -1, 1));
  return [((PHI - a) / (2 * PHI)) * S, ((th - T0) / TL) * S];
}
const EYE_Y = 0, EYE_Z = 0.072, BROW_Y = 0.05, MOUTH_Y = -0.07, CHEEK_Y = -0.036, CHEEK_Z = 0.112;

const faceGeo = [0, 1].map((half) => {
  const g = new THREE.SphereGeometry(R + 0.0025, 14, 10, Math.PI - PHI, 2 * PHI, T0, TL);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + half) / 2);
  return g;
});

function drawFace(g, face, brow, closed, ox) {
  const ink = '#2a2420', P = (y, z) => { const [x, yy] = px(y, z); return [x + ox, yy]; };
  g.lineCap = 'round'; g.lineJoin = 'round';
  // blush
  g.fillStyle = face === 'kid' ? 'rgba(240,140,150,0.6)' : 'rgba(236,150,150,0.45)';
  for (const s of [1, -1]) { const [x, y] = P(CHEEK_Y, s * CHEEK_Z); g.beginPath(); g.ellipse(x, y, face === 'kid' ? 8 : 7, 4, 0, 0, 7); g.fill(); }
  // brows, in the hair colour (darkened a little so blonde brows still read)
  g.strokeStyle = '#' + new THREE.Color(brow).multiplyScalar(0.8).getHexString();
  g.lineWidth = face === 'calm' ? 2.8 : 2.2;
  for (const s of [1, -1]) {
    const [x, y] = P(BROW_Y, s * 0.072), w = 6;
    g.beginPath();
    if (face === 'calm') { g.moveTo(x - w, y + 0.5); g.lineTo(x + w, y + 0.5); }
    else if (face === 'elder') { g.moveTo(x - w, y + 1.5); g.quadraticCurveTo(x, y - 1.5, x + w, y + 1.5); }
    else { g.moveTo(x - w, y + 1); g.quadraticCurveTo(x, y - 2.5, x + w, y + 1); }
    g.stroke();
  }
  // eyes
  const shut = closed || face === 'happy' || face === 'elder';
  for (const s of [1, -1]) {
    const [x, y] = P(EYE_Y, s * EYE_Z);
    g.strokeStyle = ink; g.fillStyle = ink;
    if (shut) {
      g.lineWidth = 2.6; g.beginPath();
      if (closed && face !== 'happy' && face !== 'elder') { g.moveTo(x - 6, y); g.quadraticCurveTo(x, y + 5, x + 6, y); } // a blink: lids down
      else { g.moveTo(x - 6, y + 2); g.quadraticCurveTo(x, y - 5, x + 6, y + 2); } // smiling eyes ^ ^
      g.stroke();
      if (face === 'elder') { g.lineWidth = 1.2; g.strokeStyle = 'rgba(120,80,60,0.6)'; const o = s > 0 ? -1 : 1; g.beginPath(); g.moveTo(x + o * 8, y - 2); g.lineTo(x + o * 11, y - 3); g.moveTo(x + o * 8, y + 1); g.lineTo(x + o * 11, y + 2); g.stroke(); } // laughter lines
      continue;
    }
    const rx = face === 'kid' ? 8.5 : face === 'calm' ? 7 : 7.5, ry = face === 'kid' ? 11 : face === 'calm' ? 7.5 : 10;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(x - rx * 0.3, y - ry * 0.36, face === 'kid' ? 3.6 : 3, 0, 7); g.fill(); // the shine
    g.beginPath(); g.arc(x + rx * 0.35, y + ry * 0.4, 1.3, 0, 7); g.fill();
    if (face === 'lash') { // a lash flick at the outer corner
      g.strokeStyle = ink; g.lineWidth = 2; const o = s > 0 ? -1 : 1;
      g.beginPath(); g.moveTo(x + o * (rx - 1), y - ry * 0.55); g.lineTo(x + o * (rx + 3.5), y - ry * 0.95); g.stroke();
    }
  }
  // mouth
  const [mx, my] = P(MOUTH_Y, 0);
  g.strokeStyle = face === 'lash' ? '#b5524f' : '#7a3a32'; g.lineWidth = 2.2;
  if (face === 'happy' || face === 'kid') { // open, laughing
    g.fillStyle = '#8a3530'; g.beginPath(); g.moveTo(mx - 6, my - 2); g.quadraticCurveTo(mx, my + 9, mx + 6, my - 2); g.closePath(); g.fill();
    g.fillStyle = '#e88a8a'; g.beginPath(); g.ellipse(mx, my + 3.2, 3, 1.6, 0, 0, 7); g.fill();
  } else if (face === 'calm') { g.beginPath(); g.moveTo(mx - 4, my); g.quadraticCurveTo(mx, my + 1.5, mx + 4, my); g.stroke(); }
  else { g.beginPath(); g.moveTo(mx - 5, my - 1); g.quadraticCurveTo(mx, my + 4, mx + 5, my - 1); g.stroke(); }
}

const faceMats = new Map();
function faceMat(face, brow) {
  const key = face + brow;
  if (!faceMats.has(key)) {
    const c = document.createElement('canvas'); c.width = S * 2; c.height = S;
    const g = c.getContext('2d');
    drawFace(g, face, brow, false, 0);
    drawFace(g, face, brow, true, S);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    faceMats.set(key, new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 }));
  }
  return faceMats.get(key);
}
export function faceMesh(face = 'round', brow = HAIRS.dark) {
  const m = new THREE.Mesh(faceGeo[0], faceMat(face, brow));
  m.userData.blink = (shut) => (m.geometry = faceGeo[shut ? 1 : 0]);
  return m;
}

// ---------- hair ----------
const sph = (r, ps, pl, ts, tl, ws = 22, hs = 10) => new THREE.SphereGeometry(r, ws, hs, ps, pl, ts, tl);
// the crown down to the hairline (thF from the top), and the sides and back down to thB, open round the face
export function scalp(r, thF = 1.22, thB = 1.75, open = 0.92) {
  return [sph(r, 0, Math.PI * 2, 0, thF), sph(r, Math.PI + open, Math.PI * 2 - 2 * open, thF, thB - thF)];
}
const at = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => geo.scale(sx, sy, sz).rotateX(rx).rotateZ(rz).translate(x, y, z);

// adds a style to `head`; returns parts that move (pony tails) so person() can sway them
export function hair(head, style, color, { mat, mesh }) {
  const m = mat(color, { roughness: 0.75 });
  const add = (geo) => head.add(mesh(geo, m));
  const swings = [];
  const tail = (x, y, z, len, r, tilt = 0) => { // a tail hanging from a pivot
    const pv = new THREE.Group(); pv.position.set(x, y, z); pv.rotation.x = tilt;
    pv.add(mesh(new THREE.SphereGeometry(r * 0.75, 10, 8), m));
    pv.add(mesh(at(new THREE.CapsuleGeometry(r, len, 4, 10), 0, -len / 2 - r * 0.4, 0, 1, 1, 0.85), m));
    head.add(pv); swings.push(pv); return pv;
  };
  const bangs = (r, depth = 1.32, w = 1.05) => add(sph(r, Math.PI - w, 2 * w, 0.5, depth - 0.5));
  switch (style) {
    case 'short': // forehead showing, a little lift at the front
      scalp(0.211, 0.98, 1.72, 0.8).forEach(add);
      add(at(new THREE.SphereGeometry(0.1, 12, 8), 0.12, 0.15, -0.03, 1, 0.5, 1.4, 0, -0.6));
      break;
    case 'side': // a side parting, swept over
      scalp(0.211, 1.2, 1.72).forEach(add);
      add(at(new THREE.SphereGeometry(0.12, 12, 8), 0.1, 0.15, 0.05, 1.1, 0.45, 1.25, 0, -0.35));
      break;
    case 'fringe': scalp(0.213, 1.12, 1.8).forEach(add); bangs(0.217, 1.3); break; // straight bangs
    case 'buzz': scalp(0.204, 1.05, 1.62, 0.95).forEach(add); break;
    case 'thin': // a bald crown with hair left round the sides and back
      add(sph(0.206, Math.PI + 1.05, Math.PI * 2 - 2.1, 1.25, 0.55));
      break;
    case 'spiky': {
      scalp(0.21, 1.22, 1.72).forEach(add);
      for (let i = 0; i < 9; i++) { // tufts standing out of the crown, leaning the way they grow
        const a = (i / 8) * Math.PI * 2, tilt = i === 8 ? 0 : 0.6;
        add(new THREE.ConeGeometry(0.055, 0.15, 6).translate(0, 0.21, 0).rotateX(tilt * Math.sin(a)).rotateZ(-tilt * Math.cos(a) - 0.15));
      }
      break;
    }
    case 'curly': {
      scalp(0.212, 1.2, 1.75).forEach(add);
      for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2, ring = i % 2 ? 0.62 : 0.95; const th = ring; if (Math.cos(a) > 0.75 && ring > 0.9) continue; add(at(new THREE.SphereGeometry(0.068, 8, 6), -Math.cos(a) * Math.sin(th) * 0.205, Math.cos(th) * 0.205, Math.sin(a) * Math.sin(th) * 0.205)); }
      add(at(new THREE.SphereGeometry(0.075, 8, 6), 0, 0.215, 0));
      break;
    }
    case 'afro': add(at(new THREE.SphereGeometry(0.265, 18, 14), -0.065, 0.075, 0)); add(sph(0.212, 0, Math.PI * 2, 0, 1.2)); break;
    case 'long': {
      scalp(0.214, 1.12, 2.0, 0.85).forEach(add);
      add(at(new THREE.SphereGeometry(0.12, 12, 8), 0.12, 0.13, 0.06, 1, 0.5, 1.3, 0, -0.5)); // swept fringe
      add(at(new THREE.CapsuleGeometry(0.15, 0.2, 6, 14), -0.09, -0.13, 0, 0.75, 1, 1.3));
      break;
    }
    case 'wavy': {
      scalp(0.215, 1.12, 2.0, 0.85).forEach(add);
      bangs(0.218, 1.18, 0.8);
      add(at(new THREE.CapsuleGeometry(0.15, 0.16, 6, 14), -0.09, -0.11, 0, 0.75, 1, 1.3));
      for (let i = 0; i < 6; i++) { const z = (i / 5 - 0.5) * 0.36; add(at(new THREE.SphereGeometry(0.06, 8, 6), -0.06 - Math.abs(z) * 0.3, -0.27 + Math.abs(z) * 0.18, z)); } // the curled ends
      break;
    }
    case 'pony':
      scalp(0.213, 1.16, 1.76).forEach(add); bangs(0.216, 1.2, 0.75);
      add(at(new THREE.TorusGeometry(0.035, 0.014, 6, 12), -0.2, 0.09, 0, 1, 1, 1, 0, Math.PI / 2)); // the tie
      tail(-0.22, 0.09, 0, 0.2, 0.055);
      break;
    case 'twin':
      scalp(0.213, 1.12, 1.76).forEach(add); bangs(0.217, 1.3);
      for (const s of [1, -1]) tail(-0.04, 0.12, s * 0.21, 0.17, 0.05, s * -0.35);
      break;
    case 'bob':
      scalp(0.217, 1.12, 2.15, 0.82).forEach(add); bangs(0.22, 1.28);
      break;
    case 'bun':
      scalp(0.212, 1.16, 1.76).forEach(add); bangs(0.215, 1.2, 0.7);
      add(at(new THREE.SphereGeometry(0.09, 12, 10), -0.18, 0.11, 0));
      break;
    case 'topbun':
      scalp(0.212, 1.16, 1.76).forEach(add);
      add(at(new THREE.SphereGeometry(0.095, 12, 10), -0.03, 0.25, 0));
      break;
  }
  return swings;
}

// a moustache, or a full beard round the jaw
export function facialHair(head, kind, color, { mat, mesh }) {
  const m = mat(color, { roughness: 0.8 });
  if (kind === 'beard') head.add(mesh(sph(0.207, Math.PI - 1.15, 2.3, 2.02, 0.72, 18, 6), m));
  for (const s of [1, -1]) head.add(mesh(at(new THREE.SphereGeometry(0.03, 8, 6), 0.19, -0.048, s * 0.026, 0.45, 0.42, 1.1, s * 0.35), m));
}

// ---------- who looks like what ----------
let counter = 0;
const rand = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
const SHORT_HATS = new Set(['hair', undefined]);
// cfg is a role from parts.js; seed picks the crowd variation (none for roles marked fixed)
export function pickLook(cfg, seed = ++counter * 7919 + 13) {
  const r = rand(Math.abs(Math.floor(seed)) % 2147483646 + 1);
  for (let i = 0; i < 3; i++) r();
  const fixed = !!cfg.fixed, kid = (cfg.scale ?? 1) < 0.8;
  let skin = cfg.skin ?? SKINS[0];
  if (!fixed && cfg.skin == null) { let w = r() * 100; for (let i = 0; i < SKINS.length; i++) if ((w -= SKIN_WEIGHTS[i]) < 0) { skin = SKINS[i]; break; } }
  let style = null, color = cfg.hair ?? HAIRS.ink, beard = cfg.beard ?? null;
  const old = cfg.hat === 'grey';
  if (old) { style = fixed ? 'short' : pick(r, ['short', 'short', 'thin', 'side']); color = pick(r, [HAIRS.grey, HAIRS.white]); if (!fixed && !cfg.robe && r() < 0.3) beard = pick(r, ['beard', 'moustache']); }
  else if (SHORT_HATS.has(cfg.hat)) {
    style = cfg.style ?? (fixed || cfg.hair != null ? 'short' : kid ? pick(r, ['short', 'fringe', 'buzz', 'spiky']) : pick(r, ['short', 'short', 'side', 'side', 'fringe', 'buzz', 'spiky', 'curly', 'curly', 'afro']));
    if (cfg.hair == null && !fixed) color = cfg.robe ? pick(r, [HAIRS.ink, HAIRS.dark]) : HAIRS[pick(r, HAIR_PICK)];
    if (!fixed && !kid && !cfg.robe && style !== 'afro' && r() < 0.2) beard = pick(r, ['beard', 'moustache']);
  } else if (cfg.hat === 'long') {
    style = fixed || cfg.hair != null || cfg.hairTie ? 'long' : pick(r, kid ? ['twin', 'pony', 'bob', 'long'] : ['long', 'long', 'wavy', 'pony', 'bob', 'bun', 'topbun']);
    if (cfg.hair == null && !fixed) color = HAIRS[pick(r, HAIR_PICK)];
  }
  if (cfg.hair == null && (cfg.hat === 'bun' || cfg.hat === 'bob') && !fixed) color = HAIRS[pick(r, HAIR_PICK)];
  const soft = ['long', 'wavy', 'pony', 'twin', 'bob', 'bun', 'topbun'].includes(style ?? cfg.hat);
  const face = cfg.face ?? (kid ? 'kid' : old ? 'elder' : fixed ? (soft ? 'lash' : 'round') : cfg.tie ? pick(r, ['calm', 'round']) : pick(r, soft ? ['lash', 'lash', 'round', 'happy'] : ['round', 'round', 'calm', 'happy']));
  return { skin, style, color, face, beard, blink: 2.6 + r() * 2.4, phase: r() * 5 };
}

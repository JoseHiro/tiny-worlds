// The little models of the worlds in Japan, standing on the globe (world/DESIGN.md §2.1, remade 2026-11-12): each on
// a thin patch of its own ground instead of the old cream plinth, rounded like the dioramas inside, and taller as the
// landmark is greater: Fuji 4.5 > the pagoda 3.2 > the snow castle 2.8 > Mini Airport's tower 2.2 > Naha 1.8 (globe units,
// R = 100). Built at full size (no scale on the globe). Materials come from airport/src/parts.js's cache, shared.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { airplane, LIVERIES, mat } from '../../airport/src/parts.js';
import { palm } from '../../town/src/nature.js';

const TAU = Math.PI * 2;
const put = (g, geo, color, x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, opts } = {}) => {
  const m = new THREE.Mesh(geo, mat(color, opts)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
};
// shapes, made once and shared
const GEO = new Map();
const geo = (key, make) => { if (!GEO.has(key)) GEO.set(key, make()); return GEO.get(key); };
const rb = (w, h, d, r = Math.min(w, h, d) * 0.25) => geo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)));
const cylG = (rt, rb_, h, s = 16) => geo(`c${rt},${rb_},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb_, h, s));
const ballG = (r) => geo(`b${r}`, () => new THREE.SphereGeometry(r, 14, 10));
const coneG = (r, h, s = 12) => geo(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));

// a thin patch of ground, its edge wobbling a little, its rim rounded
function patch(g, r, color, seed = 1) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * TAU, k = r * (1 + 0.06 * Math.sin(a * 3 + seed) + 0.04 * Math.sin(a * 5 + seed * 2));
    i ? s.lineTo(Math.cos(a) * k, Math.sin(a) * k) : s.moveTo(Math.cos(a) * k, Math.sin(a) * k);
  }
  const e = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.08, bevelSegments: 2, curveSegments: 6 });
  e.rotateX(-Math.PI / 2);
  put(g, e, color, 0, 0.0, 0);
  return 0.18; // (the top of it)
}
// trees: a round one (colour), a conifer, one with snow on it
const tree = (g, x, z, y0, col = 0x6aa84f, s = 1) => { put(g, cylG(0.05 * s, 0.06 * s, 0.3 * s, 6), 0x8a6a4a, x, y0 + 0.15 * s, z); put(g, ballG(0.24 * s), col, x, y0 + 0.42 * s, z); };
const pine = (g, x, z, y0, s = 1, snow = false) => {
  put(g, coneG(0.26 * s, 0.6 * s, 8), 0x3f7a4f, x, y0 + 0.32 * s, z);
  put(g, coneG(0.19 * s, 0.45 * s, 8), snow ? 0xf4f7fb : 0x4a8a5a, x, y0 + 0.62 * s, z);
};

export const JAPAN = {
  tower() { // Mini Airport: a runway, the terminal, a low tower and an aircraft at its stand
    const g = new THREE.Group(), y = patch(g, 2.1, 0x9cc47a, 1);
    put(g, rb(3.6, 0.05, 0.6, 0.02), 0x59616e, 0, y + 0.03, 0.75, { ry: -0.12 });
    for (let i = -3; i <= 3; i++) put(g, rb(0.22, 0.02, 0.05, 0.01), 0xffffff, i * 0.45 * Math.cos(0.12), y + 0.06, 0.75 + i * 0.45 * Math.sin(0.12), { ry: -0.12 });
    put(g, rb(2.4, 0.04, 0.9, 0.02), 0x8d949e, 0.2, y + 0.02, -0.35); // the apron
    put(g, rb(1.5, 0.42, 0.5, 0.08), 0xf3efe6, 0.3, y + 0.23, -0.95);
    put(g, rb(1.52, 0.12, 0.52, 0.04), 0x7fc4cf, 0.3, y + 0.3, -0.95, { opts: { roughness: 0.2 } });
    put(g, rb(1.6, 0.06, 0.6, 0.03), 0xe8673c, 0.3, y + 0.46, -0.95);
    put(g, cylG(0.13, 0.17, 1.55, 12), 0xf1ede4, -1.15, y + 0.78, -0.55);
    put(g, cylG(0.34, 0.26, 0.32, 12), 0x7fc4cf, -1.15, y + 1.7, -0.55, { opts: { roughness: 0.2 } });
    put(g, cylG(0.38, 0.38, 0.1, 12), 0xe8673c, -1.15, y + 1.91, -0.55);
    put(g, cylG(0.02, 0.02, 0.25, 4), 0x9aa0aa, -1.15, y + 2.08, -0.55);
    const a = airplane(LIVERIES.sunrise); a.scale.setScalar(0.045); a.position.set(0.6, y + 0.05, -0.35); a.rotation.y = Math.PI / 2; g.add(a);
    return g;
  },
  fuji() { // Fuji Mart: the mountain in daylight, its snow running down the gullies, a lake, pines, the little shop
    const g = new THREE.Group(), y = patch(g, 2.35, 0x8fbf6e, 2);
    const H = 4.3, prof = (h) => 0.32 + 1.75 * Math.pow(1 - h / H, 1.7);
    put(g, new THREE.LatheGeometry(Array.from({ length: 14 }, (_, i) => new THREE.Vector2(prof((i / 13) * H), (i / 13) * H)), 40), 0x6e84ad, 0, y, -0.35);
    // the snow: a lathe remapped so its lower edge dips down the gullies
    const cap = new THREE.LatheGeometry(Array.from({ length: 8 }, (_, i) => new THREE.Vector2(1, i / 7)), 48), p = cap.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i));
      const low = 2.75 - 0.55 * Math.pow(Math.max(0, Math.sin(a * 7)), 3) - 0.2 * Math.pow(Math.max(0, Math.sin(a * 11 + 1)), 4);
      const h = low + (H - low) * t, r = prof(h) + 0.025;
      p.setXYZ(i, Math.cos(a) * r, h, Math.sin(a) * r);
    }
    cap.computeVertexNormals();
    put(g, cap, 0xf7f9fc, 0, y, -0.35);
    put(g, cylG(0.33, 0.33, 0.04, 20), 0xeef2f8, 0, y + H, -0.35);
    put(g, new THREE.CircleGeometry(0.75, 24).scale(1.4, 1, 1), 0x4fa9d6, -1.05, y + 0.02, 1.55, { rx: -Math.PI / 2, opts: { roughness: 0.15 } });
    for (const [x, z, s] of [[1.85, -0.6, 1], [1.65, 0.3, 0.8], [-1.9, 0.2, 0.9], [-1.8, -1.0, 1.1], [0.2, 1.95, 0.75]]) pine(g, x, z, y, s);
    // the shop: white, a blue band and an orange line, a lit window
    put(g, rb(0.78, 0.36, 0.44, 0.06), 0xf6f3ec, 1.15, y + 0.18, 1.55);
    put(g, rb(0.8, 0.09, 0.46, 0.03), 0x2f55c4, 1.15, y + 0.33, 1.55);
    put(g, rb(0.8, 0.03, 0.46, 0.01), 0xe8673c, 1.15, y + 0.39, 1.55);
    put(g, rb(0.5, 0.16, 0.02, 0.01), 0xfff2cc, 1.15, y + 0.15, 1.78, { opts: { emissive: 0xffe6a6, emissiveIntensity: 0.35 } });
    return g;
  },
  pagoda() { // Koto: a vermilion five-storey pagoda with upturned eaves, a torii, cherry and maple, a stone path
    const g = new THREE.Group(), y = patch(g, 2.0, 0x8fbf6e, 3);
    const eave = (r) => geo(`eave${r}`, () => new THREE.LatheGeometry([new THREE.Vector2(r * 1.02, 0.07), new THREE.Vector2(r * 0.9, 0), new THREE.Vector2(r * 0.6, 0.09), new THREE.Vector2(r * 0.3, 0.2), new THREE.Vector2(0.001, 0.24)], 4).rotateY(Math.PI / 4));
    let h = y;
    for (let k = 0; k < 5; k++) {
      const s = 1 - k * 0.1, bh = 0.34;
      put(g, rb(0.62 * s, bh, 0.62 * s, 0.05), 0xd2492f, 0, h + bh / 2, 0);
      put(g, rb(0.42 * s, bh * 0.55, 0.64 * s, 0.03), 0xf4efe4, 0, h + bh / 2, 0); // (white walls between the posts)
      put(g, eave(0.72 * s), 0x3e444d, 0, h + bh - 0.02, 0);
      h += bh + 0.12;
    }
    put(g, cylG(0.03, 0.04, 0.55, 6), 0xc9a24a, 0, h + 0.2, 0);
    for (let i = 0; i < 4; i++) put(g, cylG(0.07, 0.07, 0.025, 10), 0xc9a24a, 0, h + 0.05 + i * 0.1, 0);
    // the torii, in front, on the path
    const tz = 1.35;
    for (const x of [-0.32, 0.32]) put(g, cylG(0.04, 0.045, 0.62, 8), 0xe0502f, x, y + 0.31, tz);
    put(g, rb(0.86, 0.06, 0.09, 0.02), 0x2f2a2a, 0, y + 0.66, tz);
    put(g, rb(0.78, 0.05, 0.07, 0.02), 0xe0502f, 0, y + 0.6, tz);
    put(g, rb(0.7, 0.04, 0.06, 0.015), 0xe0502f, 0, y + 0.48, tz);
    for (let i = 0; i < 4; i++) put(g, rb(0.26, 0.03, 0.18, 0.02), 0xc8c2b4, 0, y + 0.015, 0.55 + i * 0.32);
    tree(g, -1.15, 0.6, y, 0xf6b7c8, 1.1); tree(g, -0.9, -1.1, y, 0xf2a9bf, 0.9);
    tree(g, 1.2, 0.5, y, 0xe8743c, 1.0); tree(g, 1.0, -1.05, y, 0xd9622e, 0.85);
    return g;
  },
  palm() { // Naha: a red-tiled Okinawan house with a shisa on the ridge, a stone screen, palms, a beach and the reef sea
    const g = new THREE.Group(), y = patch(g, 2.0, 0xf2e2b8, 4);
    // a little lagoon cut into the beach, pale at its edge
    put(g, new THREE.CircleGeometry(0.95, 28).scale(1.25, 0.8, 1), 0xbfeee6, 0.75, y + 0.012, 0.75, { rx: -Math.PI / 2, rz: 0.5 });
    put(g, new THREE.CircleGeometry(0.82, 28).scale(1.25, 0.8, 1), 0x34bfc6, 0.75, y + 0.02, 0.75, { rx: -Math.PI / 2, rz: 0.5, opts: { roughness: 0.15 } });
    put(g, rb(0.6, 0.06, 0.6, 0.03), 0x9cc47a, -0.45, y + 0.03, -0.25);
    put(g, rb(0.9, 0.42, 0.7, 0.06), 0xf4efe4, -0.45, y + 0.25, -0.25);
    put(g, rb(0.22, 0.26, 0.02, 0.01), 0x6b4a32, -0.45, y + 0.16, 0.11);
    const roof = geo('ryukyuRoof', () => new THREE.LatheGeometry([new THREE.Vector2(0.78, 0.0), new THREE.Vector2(0.7, 0.03), new THREE.Vector2(0.38, 0.2), new THREE.Vector2(0.001, 0.32)], 4).rotateY(Math.PI / 4).scale(1, 1, 0.8));
    put(g, roof, 0xc4573a, -0.45, y + 0.45, -0.25);
    put(g, ballG(0.07), 0xd9a04a, -0.45, y + 0.82, -0.25); // the shisa
    put(g, ballG(0.045), 0xd9a04a, -0.38, y + 0.86, -0.25);
    put(g, rb(0.6, 0.22, 0.1, 0.04), 0xb9b2a2, -0.45, y + 0.11, 0.45); // the hinpun
    for (const [x, z, s, seed] of [[0.55, -0.85, 0.3, 2], [-1.25, 0.55, 0.26, 3]]) { const p = palm({ height: 6, lean: 0.5, seed }); p.scale.setScalar(s); p.position.set(x, y, z); g.add(p); }
    for (const [x, z] of [[-1.1, -0.7], [0.05, -0.75]]) { put(g, ballG(0.16), 0x4f9a5a, x, y + 0.12, z); put(g, ballG(0.04), 0xe0384a, x + 0.08, y + 0.22, z + 0.1); }
    return g;
  },
  snowcastle() { // Snow festival: a rounded castle of snow with a flag, the orange lattice tower, snowy pines, a snowman
    const g = new THREE.Group(), y = patch(g, 2.0, 0xf4f7fb, 5);
    const snow = 0xf2f6fc, shade = 0xdfe8f4;
    put(g, rb(1.3, 0.85, 0.8, 0.12), snow, -0.35, y + 0.43, 0);
    for (let i = 0; i < 5; i++) put(g, rb(0.16, 0.14, 0.16, 0.04), snow, -0.85 + i * 0.25, y + 0.92, 0.32);
    put(g, rb(0.3, 0.4, 0.04, 0.1), 0x8fb4dc, -0.35, y + 0.2, 0.41);
    for (const [x, z] of [[-1.0, 0.38], [0.3, 0.38], [-1.0, -0.38], [0.3, -0.38]]) {
      put(g, cylG(0.19, 0.21, 1.3, 14), snow, x, y + 0.65, z);
      put(g, coneG(0.26, 0.5, 14), shade, x, y + 1.55, z);
    }
    put(g, cylG(0.015, 0.015, 0.4, 4), 0x9aa0aa, -0.35, y + 1.05, 0);
    put(g, rb(0.22, 0.13, 0.02, 0.01), 0xe8673c, -0.23, y + 1.18, 0);
    // the lattice tower: four legs leaning in, rings, a deck, a mast
    const tx = 1.15, tz = -0.45, legs = 0.32, top = 0.08, TH = 2.2;
    const legG = geo('tvleg', () => { const v = new THREE.Vector3(legs - top, TH, 0), l = v.length(); return new THREE.CylinderGeometry(0.025, 0.035, l, 5); });
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, lean = Math.atan2(legs - top, TH);
      const m = new THREE.Mesh(legG, mat(0xe8673c)); m.position.set(tx + Math.cos(a) * (legs + top) / 2, y + TH / 2, tz + Math.sin(a) * (legs + top) / 2);
      m.rotation.set(0, -a, 0); m.rotateZ(lean); g.add(m);
    }
    for (const t of [0.25, 0.5, 0.75]) { const r = legs + (top - legs) * t; put(g, cylG(r * 1.05, r * 1.05, 0.04, 4), 0xe8673c, tx, y + TH * t, tz, { ry: Math.PI / 4 }); }
    put(g, rb(0.36, 0.18, 0.36, 0.05), 0xf3efe6, tx, y + TH * 0.62, tz);
    put(g, cylG(0.012, 0.025, 0.6, 5), 0xe8673c, tx, y + TH + 0.3, tz);
    for (const [x, z, s] of [[1.3, 0.7, 0.9], [-1.5, -0.6, 1.0], [-1.45, 0.75, 0.8], [0.6, -1.25, 0.85]]) pine(g, x, z, y, s, true);
    put(g, ballG(0.13), 0xffffff, 0.45, y + 0.13, 1.05); put(g, ballG(0.09), 0xffffff, 0.45, y + 0.33, 1.05);
    put(g, rb(0.12, 0.03, 0.12, 0.01), 0xe8673c, 0.45, y + 0.25, 1.05);
    return g;
  },
  venice() { // Venice (outside Japan, made the same new way): a canal through coloured houses, the bell tower, a domed church, a gondola
    const g = new THREE.Group(), y = patch(g, 2.1, 0xd9cfbf, 6);
    put(g, rb(4.0, 0.04, 0.9, 0.02), 0x3fa79a, 0, y + 0.0, 0.55, { ry: 0.25, opts: { roughness: 0.15 } }); // the canal
    for (const [x, z, col, h] of [[-1.2, -0.25, 0xe2b867, 1.1], [-0.6, -0.4, 0xec9b85, 1.3], [1.3, 1.25, 0xd27a4f, 1.0], [0.5, 1.45, 0xb9cfa6, 0.9], [-1.5, 1.0, 0xb8513f, 0.95]]) {
      put(g, rb(0.55, h, 0.5, 0.06), col, x, y + h / 2, z);
      put(g, coneG(0.42, 0.22, 4), 0xc7643f, x, y + h + 0.11, z, { ry: Math.PI / 4 });
      put(g, rb(0.12, 0.2, 0.02, 0.01), 0x2c3a4f, x, y + h * 0.6, z + 0.26);
    }
    put(g, rb(0.36, 2.6, 0.36, 0.04), 0xb5533c, 1.2, y + 1.3, -0.6); // the bell tower
    put(g, rb(0.4, 0.3, 0.4, 0.04), 0xf4efe6, 1.2, y + 2.75, -0.6);
    put(g, coneG(0.3, 0.6, 4), 0x6fa594, 1.2, y + 3.2, -0.6, { ry: Math.PI / 4 });
    put(g, rb(1.1, 0.6, 0.8, 0.08), 0xf4efe6, 0.25, y + 0.3, -0.75); // the church
    for (const [x, s] of [[0.25, 0.28], [-0.12, 0.18], [0.62, 0.18]]) put(g, new THREE.SphereGeometry(s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x6fa594, x, y + 0.6, -0.75);
    put(g, rb(0.9, 0.06, 0.16, 0.03), 0x1e2433, -0.3, y + 0.05, 0.45, { ry: 0.25 }); // a gondola
    put(g, rb(0.06, 0.16, 0.06, 0.02), 0xd8383a, -0.62, y + 0.15, 0.53);
    return g;
  },
};

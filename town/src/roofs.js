// Roofs for old Japanese buildings (koto/DESIGN.md §1.3): 切妻 gable, 寄棟 hip, 入母屋 irimoya, 宝形 hogyo.
// A roof is a height field over its footprint (ridge along X, eaves on all sides), so the curve of the eaves (反り),
// the lifted corners and the rows of tiles (as ripples across each slope) all come from one function.
// Origin: the centre of the eave line; the roof rises from y = 0. Front is +Z.
import * as THREE from 'three';
import { mat, mesh, box } from '../../airport/src/parts.js';

export const ROOF_MATERIALS = {
  kawara: { color: 0x6d7178, roughness: 0.75, ripple: 0.035, step: 0.24 }, // いぶし瓦: silver-grey tiles in rows
  copper: { color: 0x5f9a8a, roughness: 0.6, ripple: 0.012, step: 0.3, metalness: 0.2 }, // 銅板: green with age
  hiwada: { color: 0x7a5a3a, roughness: 1, ripple: 0.006, step: 0.12, thick: 0.3 }, // 檜皮・茅: thick layers of bark or thatch
  ichimonji: { color: 0x5d6168, roughness: 0.7, ripple: 0.03, step: 0.2 }, // 一文字瓦 (the straight eave of a machiya)
};

// kind: gable | hip | irimoya | hogyo | nagare (a shrine's 流造: the front slope runs on, longer than the back) · w × d: the eave footprint · h: height of the ridge above the eaves
// sori: how much the eaves curve up (0 for a townhouse, 0.3–0.6 for a temple) · corner: extra lift at the corners
export function roof({ kind = 'gable', w = 8, d = 6, h = 2.5, sori = 0, corner = 0, material = 'kawara', ridge = true, onigawara = true, segX = 0, segZ = 0 } = {}) {
  const M = ROOF_MATERIALS[material];
  const hw = w / 2, hd = d / 2;
  const zr = kind === 'nagare' ? -hd * 0.35 : 0; // where the ridge runs
  const gableEnd = kind === 'irimoya' ? hw - hd * 0.55 : hw; // where the upper gable of an irimoya stops
  // the height of the roof at (x, z), and which way its tile rows run
  const f = (x, z) => {
    const az = Math.abs(z) / hd, ax = Math.abs(x);
    let y, across; // across: true when we're on a front/back slope (rows run along X)
    if (kind === 'gable') { y = h * (1 - az); across = true; }
    else if (kind === 'nagare') { y = h * (1 - (z > zr ? (z - zr) / (hd - zr) : (zr - z) / (hd + zr))); across = true; }
    else if (kind === 'hogyo') { const a = Math.max(az, ax / hw); y = h * (1 - a); across = az >= ax / hw; }
    else if (kind === 'hip') { // the end slopes come in from the short sides at the same pitch
      const e = Math.max(0, (ax - (hw - hd)) / hd);
      y = h * (1 - Math.max(az, e)); across = az >= e;
    } else { // irimoya: a gable on top; beyond gableEnd a hip slope rises from the end eave to 0.62 h
      const gy = h * (1 - az);
      if (ax <= gableEnd) { y = gy; across = true; }
      else { const hy = h * 0.62 * (1 - (ax - gableEnd) / (hw - gableEnd)); y = Math.min(gy, hy); across = gy <= hy; }
    }
    // the eave curve: rises toward the edges, more at the corners
    const edge = Math.max(kind === 'nagare' && z < zr ? (zr - z) / (hd + zr) : kind === 'nagare' ? (z - zr) / (hd - zr) : az, Math.min(1, ax / hw));
    y += sori * h * THREE.MathUtils.smoothstep(edge, 0.55, 1) ** 2;
    y += corner * (az * Math.min(1, ax / hw)) ** 4;
    return { y, across };
  };
  // top surface: a grid with rippled tile channels; underside: a coarse grid, lowered; then the edge between them.
  // The channels run down the slope: a gable only needs the fine step across it (along X); down the slope a coarse
  // grid is enough for the curve. Hip-type roofs have channels both ways, so they get a middle step both ways.
  // Bark and thatch ripple too little to see, so they stay coarse.
  const smooth = M.ripple < 0.01, along = kind === 'gable' || kind === 'nagare';
  const fine = smooth ? 0.3 : Math.min(0.12, M.step / 2.05), mid = smooth ? 0.3 : Math.max(fine, M.step / 1.6);
  const nx = segX || Math.round(w / (along ? fine : mid)), nz = segZ || Math.round(d / (along ? 0.35 : mid));
  const T = M.thick ?? 0.14;
  const verts = [], idx = [];
  const pt = (x, z, top) => {
    const { y, across } = f(x, z);
    const rip = top ? M.ripple * Math.abs(Math.sin(((across ? x : z) / M.step) * Math.PI)) : 0;
    return [x, y + rip - (top ? 0 : T), z];
  };
  const grid = (cx, cz, top) => { // a (cx × cz) grid; returns the index of its first vertex
    const base = verts.length / 3, row = cx + 1;
    for (let j = 0; j <= cz; j++) for (let i = 0; i <= cx; i++) verts.push(...pt(-hw + (i / cx) * w, -hd + (j / cz) * d, top));
    for (let j = 0; j < cz; j++) for (let i = 0; i < cx; i++) {
      const a = base + j * row + i, b = a + 1, c = a + row, e = c + 1;
      if (top) idx.push(a, c, b, b, c, e); else idx.push(a, b, c, b, e, c);
    }
    return base;
  };
  grid(nx, nz, true);
  grid(Math.max(2, Math.round(w / 0.6)), Math.max(2, Math.round(d / 0.6)), false);
  // the rim: walk the top grid's edge, drop each point by the thickness
  const edge = [];
  for (let i = 0; i <= nx; i++) edge.push([i, 0]);
  for (let j = 1; j <= nz; j++) edge.push([nx, j]);
  for (let i = nx - 1; i >= 0; i--) edge.push([i, nz]);
  for (let j = nz - 1; j >= 0; j--) edge.push([0, j]);
  const r0 = verts.length / 3;
  for (const [i, j] of edge) { const x = -hw + (i / nx) * w, z = -hd + (j / nz) * d; verts.push(...pt(x, z, true), ...pt(x, z, false)); }
  for (let k = 0; k < edge.length - 1; k++) { const a = r0 + k * 2, b = a + 2; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const g = new THREE.Group();
  const roofMat = mat(M.color, { roughness: M.roughness, metalness: M.metalness ?? 0, side: THREE.DoubleSide });
  g.add(mesh(geo, roofMat));
  // the ridge (棟) with ogre tiles (鬼瓦) at its ends; hip ridges down the corners of hip / hogyo roofs
  const ridgeM = mat(material === 'copper' ? 0x4f8a7a : 0x55595f, { roughness: 0.7 });
  if (ridge) {
    const len = kind === 'hogyo' ? 0 : kind === 'hip' ? Math.max(0.01, w - d) : kind === 'irimoya' ? gableEnd * 2 : w;
    if (len > 0.05) g.add(box(len + 0.1, 0.22, 0.26, ridgeM, 0, h + 0.1, zr));
    if (onigawara && len > 0.05) for (const s of [1, -1]) { g.add(box(0.16, 0.42, 0.34, ridgeM, s * (len / 2 + 0.05), h + 0.2, zr)); g.add(box(0.12, 0.12, 0.38, ridgeM, s * (len / 2 + 0.05), h + 0.42, zr)); }
    if (kind === 'hip' || kind === 'hogyo' || kind === 'irimoya') {
      // corner ridges: sample the surface along each diagonal and lay short pieces on it
      const from = kind === 'irimoya' ? [gableEnd, 0.38] : kind === 'hip' ? [hw - hd, 0] : [0, 0];
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const p0 = new THREE.Vector3(sx * from[0], 0, sz * from[1] * hd), p1 = new THREE.Vector3(sx * hw, 0, sz * hd);
        const n = 10;
        for (let k = 0; k < n; k++) {
          const a = p0.clone().lerp(p1, k / n), b = p0.clone().lerp(p1, (k + 1) / n);
          a.y = f(a.x, a.z).y + 0.06; b.y = f(b.x, b.z).y + 0.06;
          const piece = box(a.distanceTo(b) + 0.02, 0.14, 0.16, ridgeM, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
          piece.lookAt(b.x, b.y, b.z); piece.rotateY(Math.PI / 2);
          g.add(piece);
        }
      }
    }
    if (kind === 'hogyo') { // 宝珠: the jewel on top
      g.add(mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.3, 10), ridgeM, 0, h + 0.15, 0));
      g.add(mesh(new THREE.SphereGeometry(0.18, 12, 8), mat(0xc9a24a, { metalness: 0.6, roughness: 0.3 }), 0, h + 0.42, 0));
    }
  }
  // irimoya: the upper gable's vertical triangle (妻) with its board and a hanging ornament (懸魚)
  if (kind === 'irimoya') {
    const yBase = h * 0.62 * 0.98;
    for (const s of [1, -1]) {
      const tri = new THREE.Shape([new THREE.Vector2(-hd * 0.62, yBase - 0.1), new THREE.Vector2(hd * 0.62, yBase - 0.1), new THREE.Vector2(0, h)]);
      const tm = mesh(new THREE.ShapeGeometry(tri), mat(0xe8dfcc, { side: THREE.DoubleSide, roughness: 0.9 }), s * (gableEnd - 0.05), 0, 0);
      tm.rotation.y = Math.PI / 2;
      g.add(tm);
      g.add(box(0.12, 0.1, d * 0.64, ridgeM, s * gableEnd, yBase - 0.02, 0)); // the beam at its foot
      g.add(box(0.1, 0.36, 0.24, mat(0xc9a24a, { metalness: 0.5, roughness: 0.4 }), s * (gableEnd + 0.03), h * 0.8, 0)); // 懸魚
    }
  }
  g.userData = { kind: 'roof', roof: kind, height: (x, z) => f(x, z).y };
  return g;
}

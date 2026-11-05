// The room's surfaces (room/DESIGN.md §2.2): the oak floorboards and the white wallpaper, made once as canvas textures;
// a shell() of floor and walls, cut open on the viewer's side (§2.4), with openings for a window.
import * as THREE from 'three';
import { mat, mesh, box } from '../../airport/src/parts.js';

export const canvasTex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
const planks = () => canvasTex(512, 512, (x, w, h) => { // 8 boards across, staggered joints
  for (let i = 0; i < 8; i++) { const y0 = i * h / 8; x.fillStyle = `hsl(30, ${36 + (i * 7) % 8}%, ${50 + ((i * 5) % 7)}%)`; x.fillRect(0, y0, w, h / 8);
    for (let k = 0; k < 30; k++) { x.strokeStyle = `rgba(90,55,30,${0.05 + Math.random() * 0.1})`; x.lineWidth = 1; const yy = y0 + Math.random() * h / 8; x.beginPath(); x.moveTo(0, yy); x.bezierCurveTo(w / 3, yy + 3, w * 2 / 3, yy - 3, w, yy); x.stroke(); }
    x.fillStyle = 'rgba(40,25,15,0.55)'; x.fillRect(0, y0, w, 2); const j = ((i * 197) % 400) + 40; x.fillRect(j, y0, 2, h / 8); }
});
const paper = () => canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#d9d4cc'; x.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
let made = null;
export const SURF = () => (made ??= {
  floor: new THREE.MeshStandardMaterial({ map: planks(), roughness: 0.6 }),
  wall: new THREE.MeshStandardMaterial({ map: paper(), roughness: 0.95 }),
  cut: mat(0x8f8a82, { roughness: 1 }), plinth: mat(0x2a2b33, { roughness: 1 }), skirt: mat(0xeeeae2, { roughness: 0.7 }),
});
// a box whose texture repeats every `unit` world units on its big faces (so boards and paper keep their size)
function slab(w, h, d, faces, unit = 1.2) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, n = g.attributes.normal, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const [a, b] = ay > 0.5 ? [p.getX(i), p.getZ(i)] : ax > 0.5 ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)]; uv.setXY(i, a / unit, b / unit); }
  return mesh(g, faces);
}
// floor x0…x1 × z0…z1, the back wall (−z) and the left wall (−x), h high; holes: { back: [[x0, x1, y0, y1], …], left: … }
export function shell({ x0, x1, z0, z1, h = 1.8, t = 0.06, holes = {} }) {
  const S = SURF(), g = new THREE.Group(), { cut } = S;
  const floor = slab(x1 - x0, 0.06, z1 - z0, [cut, cut, S.floor, cut, cut, cut], 1.4); floor.position.set((x0 + x1) / 2, -0.03, (z0 + z1) / 2); g.add(floor);
  g.add(box(x1 - x0 + t + 0.04, 0.05, z1 - z0 + t + 0.04, S.plinth, (x0 + x1 - t) / 2, -0.085, (z0 + z1 - t) / 2));
  // a wall along one side, built in pieces round its holes: u runs along the wall from a to b
  const wall = (a, b, place, list) => {
    const parts = [], hs = [...(list ?? [])].sort((p, q) => p[0] - q[0]);
    let u = a;
    for (const [u0, u1, y0, y1] of hs) { parts.push([u, u0, 0, h]); parts.push([u0, u1, 0, y0]); parts.push([u0, u1, y1, h]); u = u1; }
    parts.push([u, b, 0, h]);
    for (const [p0, p1, y0, y1] of parts) if (p1 - p0 > 0.001 && y1 - y0 > 0.001) place(p0, p1, y0, y1);
  };
  wall(x0 - t, x1, (u0, u1, y0, y1) => { const m = slab(u1 - u0, y1 - y0, t, [cut, cut, cut, cut, S.wall, cut]); m.position.set((u0 + u1) / 2, (y0 + y1) / 2, z0 - t / 2); g.add(m); }, holes.back);
  wall(z0, z1, (u0, u1, y0, y1) => { const m = slab(t, y1 - y0, u1 - u0, [S.wall, cut, cut, cut, cut, cut]); m.position.set(x0 - t / 2, (y0 + y1) / 2, (u0 + u1) / 2); g.add(m); }, holes.left);
  g.add(box(x1 - x0, 0.05, 0.012, S.skirt, (x0 + x1) / 2, 0.025, z0 + 0.006)); g.add(box(0.012, 0.05, z1 - z0, S.skirt, x0 + 0.006, 0.025, (z0 + z1) / 2));
  return g;
}

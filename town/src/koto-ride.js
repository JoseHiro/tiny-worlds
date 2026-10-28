// Vehicles of the old capital (koto/DESIGN.md §3.6): the rickshaw (人力車) with its puller, a little two-car tram
// on a single track (路面電車), and river boats (屋形船, 小舟) with a boatman. Nose +X, ground y = 0, like town vehicles.
// Each has userData.update(t, dt); set userData.speed (m/s) and the wheels turn, the puller runs.
import * as THREE from 'three';
import { mat, mesh, rbox, box, cyl, person } from '../../airport/src/parts.js';
import { compactRig } from '../../airport/src/merge.js';
import { KOTO } from './koto.js';
import { chochin } from './koto-props.js';
import { signTexture } from './buildings.js';

// a spoked wheel (r, along Z)
function spokeWheel(r, rim, spoke, n = 12) {
  const w = new THREE.Group();
  w.add(mesh(new THREE.TorusGeometry(r, 0.035, 6, 24), rim));
  w.add(cyl(0.06, 0.06, 0.12, rim, 0, 0, 0, 8)).children.at(-1).rotation.x = Math.PI / 2;
  for (let k = 0; k < n; k++) { const s = box(0.018, r * 2, 0.018, spoke); s.rotation.z = (k / n) * Math.PI; w.add(s); }
  w.userData.radius = r;
  return w;
}

// ---------- 人力車: black lacquer, a red blanket, the folded hood, big wheels; the puller (車夫) between the shafts ----------
export function rickshaw({ riders = ['kimonoWoman', 'kimonoMan'], puller = true, hood = 'down' } = {}) {
  const g = new THREE.Group();
  const black = mat(0x1d1f23, { roughness: 0.35, metalness: 0.2 }), red = mat(0xc8283a, { roughness: 0.9 }), gold = mat(KOTO.gold, { metalness: 0.6, roughness: 0.35 });
  const body = new THREE.Group(); g.add(body);
  // the seat box and back
  body.add(rbox(0.75, 0.45, 1.1, 0.06, black, 0, 1.0, 0));
  body.add(rbox(0.12, 0.75, 1.1, 0.05, black, -0.38, 1.45, 0));
  body.add(box(0.55, 0.08, 1.0, red, 0.05, 1.25, 0)); // cushion
  body.add(box(0.42, 0.04, 1.05, red, 0.48, 0.95, 0)); // the knee blanket hanging over the front
  body.add(box(0.04, 0.5, 1.05, red, 0.68, 0.72, 0));
  body.add(box(0.5, 0.05, 0.9, black, 0.65, 0.48, 0)); // footboard
  for (const s of [1, -1]) body.add(box(0.7, 0.05, 0.04, gold, 0, 1.24, s * 0.56)); // gold trim
  // the hood: folded back (down), or up as a half dome against sun and rain
  const hd = mesh(new THREE.SphereGeometry(0.62, 16, 8, 0, Math.PI, 0, Math.PI / 2), black);
  if (hood === 'down') { hd.scale.set(0.35, 0.5, 0.95); hd.rotation.set(0, Math.PI / 2, 0); hd.position.set(-0.45, 1.75, 0); }
  else { hd.scale.set(0.9, 1.1, 0.95); hd.rotation.set(0, Math.PI / 2, 0); hd.position.set(-0.2, 1.6, 0); }
  body.add(hd);
  // the long shafts (梶棒) and the crossbar the puller holds
  for (const s of [1, -1]) { const sh = box(2.0, 0.05, 0.05, black, 1.4, 0.75, s * 0.42); sh.rotation.z = -0.12; body.add(sh); }
  body.add(cyl(0.025, 0.025, 0.9, black, 2.35, 0.64, 0, 6)).children.at(-1).rotation.x = Math.PI / 2;
  const ud = (g.userData = { kind: 'rickshaw', speed: 0, wheels: [] });
  for (const s of [1, -1]) { const w = spokeWheel(0.62, black, mat(0xc8283a)); w.position.set(-0.05, 0.62, s * 0.64); body.add(w); ud.wheels.push(w); }
  const people = [];
  riders.slice(0, 2).forEach((r, i) => { const p = person(r, { mode: 'sit' }); p.position.set(-0.15, 1.0, (i - (riders.length - 1) / 2) * 0.42); p.scale.multiplyScalar(0.85); body.add(p); people.push(p); });
  let shafu = null;
  if (puller) { shafu = person('shafu', { mode: 'walk' }); shafu.position.set(2.0, 0, 0); g.add(shafu); }
  compactRig(g);
  ud.puller = shafu; ud.riders = people;
  ud.update = (t, dt = 0) => {
    for (const w of ud.wheels) w.rotation.z -= (ud.speed * dt) / w.userData.radius;
    if (shafu) { shafu.userData.mode = ud.speed > 0.1 ? 'walk' : 'idle'; shafu.userData.update(t * (0.5 + Math.min(1.6, ud.speed * 0.6))); }
    people.forEach((p) => p.userData.update(t));
    body.rotation.z = ud.speed > 0.1 ? Math.sin(t * 9) * 0.008 : 0;
  };
  return g;
}

// ---------- 路面電車: two short cars, cream above and green below, rounded ends, a pantograph, bogies ----------
export function tram({ cars = 2, color = 0x3f7a4a, cream = 0xefe6cc, dest = '鎌倉 Kamakura' } = {}) {
  const g = new THREE.Group();
  const L = 6.4, W = 2.2, green = mat(color, { roughness: 0.45 }), top = mat(cream, { roughness: 0.45 }), dark = mat(0x2a2d33);
  const glass = mat(0x2f3a48, { roughness: 0.15, metalness: 0.3 });
  const headM = mat(0xfff4d6, { emissive: 0xfff1c8, emissiveIntensity: 0.6 });
  const ud = (g.userData = { kind: 'tram', speed: 0, wheels: [], len: cars * (L + 0.4) });
  for (let i = 0; i < cars; i++) {
    const c = new THREE.Group(); c.position.x = -i * (L + 0.4);
    c.add(rbox(L, 1.1, W, 0.25, green, 0, 0.95, 0));
    c.add(rbox(L, 1.25, W, 0.3, top, 0, 2.1, 0));
    c.add(rbox(L - 0.2, 0.25, W - 0.2, 0.12, mat(0xd8d3c8), 0, 2.8, 0)); // roof
    for (let x = -L / 2 + 0.9; x < L / 2 - 0.6; x += 0.95) for (const s of [1, -1]) c.add(box(0.75, 0.65, 0.04, glass, x, 2.15, s * (W / 2 + 0.005)));
    for (const s of [1, -1]) { c.add(box(0.8, 1.6, 0.04, mat(0x2a3a2a), L * 0.15, 1.4, s * (W / 2 + 0.01))); } // doors
    c.add(box(L, 0.08, W + 0.02, mat(0xc9a24a), 0, 1.5, 0)); // a thin gold line
    for (const x of [L / 2 - 1.2, -L / 2 + 1.2]) { // bogies
      c.add(box(1.6, 0.35, W - 0.4, dark, x, 0.35, 0));
      for (const dx of [0.5, -0.5]) for (const s of [1, -1]) { const w = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 14).rotateX(Math.PI / 2), dark); const wg = new THREE.Group(); wg.position.set(x + dx, 0.3, s * (W / 2 - 0.25)); wg.add(w); wg.add(box(0.4, 0.06, 0.13, mat(0x8a8f96))); wg.userData.radius = 0.3; c.add(wg); ud.wheels.push(wg); }
    }
    if (i === 0 || i === cars - 1) { // the end with a big window, a headlight and the destination
      const s = i === 0 ? 1 : -1;
      c.add(box(0.05, 0.85, 1.6, glass, s * (L / 2 + 0.01), 2.15, 0));
      c.add(mesh(new THREE.CircleGeometry(0.16, 14).rotateY(s * Math.PI / 2), headM, s * (L / 2 + 0.03), 1.2, 0));
      const ds = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.24), new THREE.MeshStandardMaterial({ map: signTexture(dest, { w: 256, h: 56, font: 'bold 34px sans-serif', bg: '#1c2232', fg: '#ffd966' }), emissive: 0xffffff, emissiveIntensity: 0.2 }));
      ds.rotation.y = s * Math.PI / 2; ds.position.set(s * (L / 2 + 0.04), 2.68, 0); c.add(ds);
    }
    if (i === 0) { // the pantograph
      const p = new THREE.Group(); p.position.set(0.5, 2.95, 0);
      for (const sgn of [1, -1]) { const a = box(0.04, 0.9, 0.04, dark, sgn * 0.3, 0.4, 0); a.rotation.z = sgn * 0.55; p.add(a); }
      p.add(box(0.06, 0.04, 1.3, dark, 0, 0.78, 0));
      c.add(p);
    }
    g.add(c);
  }
  compactRig(g);
  ud.update = (t, dt = 0) => { for (const w of ud.wheels) w.rotation.z -= (ud.speed * dt) / w.userData.radius; };
  return g;
}

// ---------- 川の舟: a covered pleasure boat with lanterns (屋形船), or a small punt; the boatman pushes with a pole ----------
export function kawabune({ kind = 'small' } = {}) {
  const g = new THREE.Group();
  const wood = mat(0x8a6a4a, { roughness: 0.8 }), dark = mat(0x4a3a2a);
  const L = kind === 'yakata' ? 8 : 4.5, W = kind === 'yakata' ? 2.4 : 1.3;
  const hull = new THREE.Shape(); hull.moveTo(-L / 2, 0.5); hull.lineTo(-L / 2 + 0.3, 0); hull.lineTo(L / 2 - 0.9, 0); hull.quadraticCurveTo(L / 2, 0.05, L / 2 + 0.2, 0.65); hull.lineTo(-L / 2, 0.55);
  const hg = new THREE.ExtrudeGeometry(hull, { depth: W, bevelEnabled: false }).translate(0, -0.2, -W / 2);
  const boat = new THREE.Group(); g.add(boat);
  boat.add(mesh(hg, wood));
  boat.add(box(L - 0.6, 0.04, W - 0.1, mat(0xc9b07a), -0.1, 0.25, 0));
  let lamps = [];
  if (kind === 'yakata') {
    boat.add(box(L - 2, 0.06, W - 0.2, mat(0xd8c48a), -0.3, 0.3, 0)); // tatami
    for (const x of [-L / 2 + 0.8, -0.3, L / 2 - 1.6]) for (const s of [1, -1]) boat.add(box(0.08, 1.5, 0.08, dark, x, 1.05, s * (W / 2 - 0.15)));
    boat.add(rbox(L - 1.8, 0.15, W + 0.1, 0.05, dark, -0.3, 1.85, 0));
    for (const s of [1, -1]) boat.add(box(L - 2.2, 0.35, 0.03, mat(0xf2ede2), -0.3, 1.6, s * (W / 2 - 0.12))); // the paper screens up high
    for (let k = 0; k < 5; k++) { const c = chochin({ color: 'red', text: '屋形', size: 0.6 }); c.position.set(-L / 2 + 1 + k * 1.3, 1.75, W / 2 - 0.05); boat.add(c); lamps.push(c); }
  } else boat.add(box(0.6, 0.3, W - 0.2, wood, -0.5, 0.42, 0)); // a seat
  const sendo = person('sendo', { mode: 'idle' }); sendo.position.set(-L / 2 + 0.5, 0.27, 0); boat.add(sendo);
  const pole = cyl(0.025, 0.025, 4.2, mat(0xc9b07a), 0, 0, 0, 5); const pg = new THREE.Group(); pg.add(pole); pg.position.set(-L / 2 + 0.75, 0.9, 0.25); boat.add(pg);
  const ud = (g.userData = { kind: 'boat', speed: 0 });
  ud.update = (t) => {
    boat.position.y = Math.sin(t * 1.3) * 0.03; boat.rotation.x = Math.sin(t * 0.9) * 0.02;
    const k = (Math.sin(t * 0.8) + 1) / 2; // push the pole down along the back, lift and swing it forward
    pg.rotation.z = 0.35 + k * 0.4; pg.position.x = -L / 2 + 0.75 - k * 0.4;
    sendo.userData.update(t);
    lamps.forEach((c) => c.userData.update(t));
  };
  return g;
}

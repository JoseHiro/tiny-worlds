// The opening every Tiny Worlds film can start with (the user's idea, 2026-11-12): on the World Map's globe, an aircraft
// out of Mini Airport is already in the air at the first frame, the camera riding just behind it; it turns for the city,
// the route glows orange, the city's name comes up, and the camera dives into the little model there until the frame
// goes white. The world's own film then opens out of that white (film/snowfest.js's first shot), and
// film/make-flyin.sh joins the two. Open world/ on the film server and run
// (await import('/film/flyin.js')).run('CTS', 'SAPPORO'); run(code, name, true) for the first and last frames only.
import * as THREE from 'three';
import { film } from './film.js';

const SANS = '"Avenir Next", "Helvetica Neue", sans-serif';
const ease = (u) => u * u * (3 - 2 * u);
const clamp = (x) => Math.min(1, Math.max(0, x));

// the page's own backdrop (a warm radial wash) as the scene's background: the canvas itself is see-through
function backdrop(W, H) {
  const c = document.createElement('canvas'); c.width = W / 4; c.height = H / 4;
  const g = c.getContext('2d'), r = g.createRadialGradient(c.width / 2, c.height * 0.55, 0, c.width / 2, c.height * 0.55, c.height * 0.7);
  r.addColorStop(0, '#f7f1e6'); r.addColorStop(0.55, '#efe8dc'); r.addColorStop(1, '#e6ddcd');
  g.fillStyle = r; g.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// the words over it: a flight tag at the top from the first frame, the city's name as the aircraft turns in
const words = (code, city) => (g, u, W, H, ts) => {
  g.save(); g.textAlign = 'center';
  const a = clamp(ts / 0.25) * (1 - clamp((u - 0.8) / 0.12));
  g.globalAlpha = a; g.shadowColor = 'rgba(20,30,50,0.35)'; g.shadowBlur = 12;
  g.font = `600 36px ${SANS}`; g.letterSpacing = '7px';
  const tag = `✈  TOKYO  →  ${city}`, tw = g.measureText(tag).width + 80;
  g.fillStyle = 'rgba(28,34,50,0.84)'; g.beginPath(); g.roundRect((W - tw) / 2, 200, tw, 78, 39); g.fill();
  g.shadowBlur = 0; g.fillStyle = '#fff'; g.fillText(tag, W / 2 + 4, 252);
  const b = clamp((u - 0.3) / 0.12) * (1 - clamp((u - 0.82) / 0.1));
  if (b > 0) {
    g.globalAlpha = b; g.fillStyle = '#1c2232'; g.shadowColor = 'rgba(247,241,230,0.9)'; g.shadowBlur = 18;
    g.letterSpacing = '0px'; g.font = `italic 400 ${150 + 20 * b}px "Hoefler Text", Georgia, serif`;
    g.fillText(city, W / 2, 470);
  }
  g.restore();
  // into the white
  const w = clamp((u - 0.8) / 0.2);
  if (w > 0) { g.fillStyle = `rgba(255,255,255,${ease(w)})`; g.fillRect(0, 0, W, H); }
};

export async function run(code = 'CTS', city = 'SAPPORO', preview = false, dur = 4) {
  const m = window.__map, { scene, camera, renderer, arcPoint, arcs, at, R } = m;
  const arc = arcs[code];
  document.querySelector('.labels').style.display = 'none';
  scene.background = backdrop(1080, 1920);
  for (const p of m.planes) if (p.code === code) p.m.visible = false, p.wait = 99; // (ours is the only one on this route)
  // the route, bright now
  const pts = Array.from({ length: 96 }, (_, i) => arcPoint(arc.a, arc.b, i / 95, arc.lift));
  const route = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.07, 6), new THREE.MeshBasicMaterial({ color: 0xe8673c }));
  scene.add(route);
  // our aircraft
  const plane = m.models[0].clone(); plane.scale.setScalar(0.17); scene.add(plane);
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), X = new THREE.Vector3(), N = new THREE.Vector3(), S = new THREE.Vector3(), M4 = new THREE.Matrix4();
  const city3 = at(code), top = at(code, R + 3.4), above = at(code, R + 6);
  const place = (uu) => {
    arcPoint(arc.a, arc.b, uu, arc.lift, P); arcPoint(arc.a, arc.b, Math.min(1, uu + 0.004), arc.lift, Q);
    if (uu >= 0.996) Q.copy(P).addScaledVector(X, 0.01);
    X.subVectors(Q, P).normalize(); N.copy(P).normalize(); S.crossVectors(X, N).normalize(); const Y = new THREE.Vector3().crossVectors(S, X);
    M4.makeBasis(X, Y, S); plane.position.copy(P); plane.quaternion.setFromRotationMatrix(M4);
  };
  const eye = new THREE.Vector3(), look = new THREE.Vector3(), e2 = new THREE.Vector3(), l2 = new THREE.Vector3();
  window.__koto = { renderer, camera, scene, tick: (dt) => m.step(dt), render: () => renderer.render(scene, camera), people: [] };
  const shot = {
    dur,
    cam: { fn(u, Pc, Tc) {
      const uu = 0.04 + 0.9 * (1 - Math.pow(1 - u, 1.6)); place(uu); // (slowing as it comes in)
      // high and wide at first, so the globe's curve and the little worlds on it show, then down behind the aircraft
      const c = ease(clamp(u / 0.7));
      eye.copy(P).addScaledVector(X, -(26 - 18 * c)).addScaledVector(N, 30 - 23 * c).addScaledVector(S, 6 - 3 * c);
      look.copy(P).lerp(city3, 0.55);
      // then down into the model, from above
      const k = ease(clamp((u - 0.62) / 0.38));
      e2.copy(above).lerp(top, ease(clamp((u - 0.75) / 0.25))); l2.copy(city3);
      Pc.copy(eye).lerp(e2, k); Tc.copy(look).lerp(l2, k);
      camera.up.copy(N).lerp(X, k).normalize(); // (straight down at the end: "up" turns to the way it was flying)
    } },
    draw: words(code, city),
  };
  return film({ name: preview ? `flyin-${code}` : `flyin-${code}1`, shots: [shot], fov: 50, near: 0.1, far: 1000, preview });
}

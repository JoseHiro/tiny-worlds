// Film a story page as a vertical video (film/README.md): the page's own loop is stopped and the world is stepped one
// frame at a time (a fixed 1/fps, so a slow machine films the same thing), drawn at W × H with a camera of our own,
// captions laid over it on a 2D canvas, and every frame posted to film/record.mjs.
// A shot: { start?() (set things up first), at: 'a few words of a story line' (run the story on until that line shows) | skip: seconds (run it on),
//   dur: seconds of film, speed: story seconds per film second (1), cam: { from: [[eye], [target]], to: … } or
//   { follow: [dx, dy, dz], look?: dy } (keep Mina in view) or { orbit: { center, radius, height, from, to } } or { toward: [x, y, z], from: [back, up, side], to } (over her shoulder); rel: 'eye' | 'both' puts from / to
//   relative to where Mina is as the shot begins, clear?: metres (no one else that near Mina), cap: [ja, en] (capTop: up high), draw?(g, k, W, H) (anything else on top) }
// · until: () => bool (run the world on until it is true) · cam: { fn(u, P, T, ts) } sets eye P and target T itself (to track a moving thing)
import * as THREE from 'three';
import { v3 } from '../koto/src/world.js';

const k = () => window.__koto;
const mina = () => k().people?.[k().people.length - 1] ?? { p: { position: v3(0, 0, 0) } }; // the story's one actor is added last, when it starts (without a story: whoever came last)
const ease = (t) => t * t * (3 - 2 * t);
const line = () => document.getElementById('storyLine')?.textContent ?? '';
export const FONT = '"Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';

// a rounded caption box near the bottom (or the top): Japanese big, English under it; fades in over the first 0.4 s
export function caption(g, [ja, en], a, W, H, top = false) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  g.font = `600 62px ${FONT}`; const wj = g.measureText(ja).width;
  g.font = `400 36px ${FONT}`; const we = en ? g.measureText(en).width : 0;
  const w = Math.max(wj, we) + 88, h = en ? 190 : 128, x = (W - w) / 2, y = top ? 250 : H - 330 - h;
  g.fillStyle = 'rgba(255, 250, 240, 0.86)'; g.beginPath(); g.roundRect(x, y, w, h, 40); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#4a3a30'; g.font = `600 62px ${FONT}`; g.fillText(ja, W / 2, y + (en ? 68 : h / 2));
  if (en) { g.fillStyle = '#8a7462'; g.font = `400 36px ${FONT}`; g.fillText(en, W / 2, y + 140); }
  g.restore();
}

// near / far: the depth range (a big diorama from far off: push near out too, or the ground flickers); bg: a plain backdrop instead of the sky (the diorama as an object on a table); floor: [y, size] a pale floor
// under it that only takes the diorama's shadow
export async function film({ name, shots, W = 1080, H = 1920, fps = 30, fov = 44, near = null, far = null, preview = false, bg = null, floor = null }) {
  const { renderer, camera, scene } = k();
  if (floor) { const f = new THREE.Mesh(new THREE.PlaneGeometry(floor[1], floor[1]).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.18 })); f.position.y = floor[0]; f.receiveShadow = true; scene.add(f); }
  renderer.setAnimationLoop(null); // the page's loop would step the world in real time
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  camera.fov = fov; camera.aspect = W / H; if (near) camera.near = near; if (far) camera.far = far; camera.clearViewOffset(); camera.updateProjectionMatrix();
  const draw = k().render ?? (() => renderer.render(scene, camera)); // (a page with post-processing hands its own)
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const g = out.getContext('2d');
  const dt = 1 / fps, P = v3(0, 0, 0), T = v3(0, 0, 0);
  let n = 0, sent = [];
  for (const [i, s] of shots.entries()) {
    s.start?.(); // (set the weather, the time of day… before running on)
    if (s.at) { let guard = 0; while (!line().includes(s.at) && guard++ < 20 * 600) k().tick(1 / 20); }
    if (s.skip) for (let j = 0; j < s.skip * 20; j++) k().tick(1 / 20);
    if (s.until) { let guard = 0; while (!s.until() && guard++ < 20 * 900) k().tick(1 / 20); }
    const base = mina().p.position.clone(); // (rel: 'eye' | 'both': the shot is placed from where Mina is now)
    if (s.clear) for (const a of k().people) if (a !== mina() && a.p.position.distanceTo(base) < s.clear) { a.t = -60; a.p.visible = false; } // (someone in the way: sent off for a minute)
    const frames = Math.round(s.dur * fps);
    const shown = preview ? [0, frames - 1] : [...Array(frames).keys()];
    for (let f = 0; f < frames; f++) {
      const u = frames > 1 ? f / (frames - 1) : 0;
      if (f) k().tick(dt * (s.speed ?? 1));
      if (s.cam.fn) s.cam.fn(u, P, T, f / fps);
      else if (s.cam.follow) {
        const m = mina().p.position, o = s.cam.follow;
        P.set(m.x + o[0], m.y + o[1], m.z + o[2]); T.set(m.x, m.y + (s.cam.look ?? 0.9), m.z);
      } else if (s.cam.orbit) { // round a point: angles (radians, from +z) from → to, at a radius and a height
        const { center: c, radius, height, from: a0, to: a1 = a0 } = s.cam.orbit, a = a0 + (a1 - a0) * u;
        const at = (x) => (Array.isArray(x) ? x[0] + (x[1] - x[0]) * ease(u) : x), r = at(radius); // (radius, height: one value or [from, to])
        P.set(c[0] + Math.sin(a) * r, c[1] + at(height), c[2] + Math.cos(a) * r); T.set(...c);
      } else if (s.cam.toward) { // over Mina's shoulder at something far off: [back, up, side] from her, eased from → to
        const e = ease(u), a = s.cam.from, b = s.cam.to ?? a, [bk, up, sd] = a.map((x, j) => x + (b[j] - x) * e);
        T.set(...s.cam.toward); const d = v3(T.x - base.x, 0, T.z - base.z).normalize();
        P.set(base.x - d.x * bk - d.z * sd, base.y + up, base.z - d.z * bk + d.x * sd);
      } else {
        const e = ease(u), [p0, t0] = s.cam.from, [p1, t1] = s.cam.to ?? s.cam.from;
        P.set(...p0).lerp(v3(...p1), e); T.set(...t0).lerp(v3(...t1), e);
        if (s.cam.rel) { P.add(base); if (s.cam.rel === 'both') T.add(base); }
      }
      camera.position.copy(P); camera.lookAt(T);
      if (!shown.includes(f)) continue;
      k().tick(0); // (the cut-away walls follow the camera)
      if (bg) scene.background.set(bg); // (the café sets its sky every step)
      draw();
      g.drawImage(renderer.domElement, 0, 0);
      const ts = f / fps;
      if (s.cap) caption(g, s.cap, Math.min(1, ts / 0.4), W, H, s.capTop);
      s.draw?.(g, u, W, H, ts);
      const blob = await new Promise((r) => out.toBlob(r, 'image/jpeg', 0.92));
      const id = preview ? `${String(i).padStart(2, '0')}-${f ? 'b' : 'a'}` : String(n++).padStart(5, '0');
      sent.push(fetch(`/__film/${preview ? name + '-preview' : name}/${id}`, { method: 'POST', body: blob }));
      if (sent.length > 6) { await Promise.all(sent); sent = []; }
    }
  }
  await Promise.all(sent);
  return { name, frames: n };
}

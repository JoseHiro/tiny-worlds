// The room's stage (room/DESIGN.md §2.4, §6): one renderer, a night background, orbit controls close in (the things
// are small), a little bloom so the screens and LEDs glow, the loop. A page adds its content to stage.scene and its
// moving things to stage.life (fn(t, dt)); views are [label, eye, target].
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { L, onLang } from '../../koto/src/i18n.js';

export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function createStage({ views, view = Object.keys(views)[0], bloom = 0.55 } = {}) {
  const app = document.getElementById('app');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'; // (the size is set without styles)
  app.appendChild(renderer.domElement);
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#121624');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 60);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.minDistance = 0.3; controls.maxDistance = 7; controls.maxPolarAngle = 1.5;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const glow = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom, 0.5, 0.92);
  composer.addPass(glow); composer.addPass(new OutputPass());

  const life = [];
  let fly = null;
  const go = (k, now = false) => {
    const [, p, t] = views[k];
    if (now) { camera.position.copy(p); controls.target.copy(t); controls.update(); }
    else fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t };
    document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('on', b.dataset.v === k));
  };
  const bar = document.getElementById('views');
  if (bar) for (const [k, [name]] of Object.entries(views)) { const b = document.createElement('button'); b.dataset.v = k; b.textContent = L(name); b.onclick = () => go(k); bar.appendChild(b); onLang(() => (b.textContent = L(name))); }
  // a camera move to any eye and target over `secs` (the story's shots)
  const shot = (p, t, secs = 1.4) => { fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: p.clone(), t1: t.clone(), secs }; document.querySelectorAll('#views button').forEach((b) => b.classList.remove('on')); };
  go(views[new URLSearchParams(location.search).get('view')] ? new URLSearchParams(location.search).get('view') : view, true); // (?view=… opens on that view)

  const resize = () => {
    const w = app.clientWidth || innerWidth, h = app.clientHeight || innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    stage.px = h; // (for sizing point sprites)
  };
  addEventListener('resize', resize);

  let t = 0, last = performance.now();
  const tick = (dt) => {
    t += dt;
    if (fly && !stage.filming) { fly.t = Math.min(1, fly.t + dt / (fly.secs ?? 1.4)); const e = fly.t * fly.t * (3 - 2 * fly.t); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (fly.t >= 1) fly = null; }
    if (!stage.filming) controls.update(); // (filming: the film's camera, not the controls')
    for (const f of life) f(t, dt);
  };
  const render = () => composer.render();
  const stage = { renderer, scene, camera, controls, composer, life, go, shot, tick, render, px: innerHeight,
    start() { resize(); renderer.setAnimationLoop(() => { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; tick(dt); render(); }); } };
  window.__room = stage;
  return stage;
}

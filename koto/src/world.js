// The stage every Koto scene stands on (koto/DESIGN.md §7.6): renderer, lights, the diorama slab, stone paving,
// the panel (views, seasons, day / dusk / night, follow someone), the loop and the debug hooks.
// A scene builds its content into world.scene and registers what moves; then calls world.start().
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clock } from '../../sealife/src/kit.js';
import { mat } from '../../airport/src/parts.js';
import { setLamps } from '../../town/src/koto-props.js';
import { setSeason, onSeason, SEASONS } from '../../town/src/seasons.js';

const $ = (id) => document.getElementById(id);
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

const LOOKS = {
  day: { hemi: [1.4, '#fffaf0', '#c9c4b4'], sun: [2.5, '#fff4e0', [40, 60, 30]], lamps: 0 },
  dusk: { hemi: [1.1, '#ffe0cc', '#8a7a8a'], sun: [1.1, '#ff9a5a', [70, 22, 10]], lamps: 1, sky: '#d9a88a' },
  night: { hemi: [0.42, '#8a9ad0', '#2a2434'], sun: [0.35, '#a9b8e8', [-30, 50, 20]], lamps: 1.4, sky: '#1c2236' }, // moonlight
};

export function createWorld({ shadow = 62, target = [0, 0, 0], views, follow = null, look: look0 = 'day' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  $('app').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SEASONS.spring.sky);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 700);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = 1.48;
  controls.minDistance = 4;
  controls.maxDistance = 300;

  const hemi = new THREE.HemisphereLight('#fffaf0', '#c9c4b4', 1.4);
  const sun = new THREE.DirectionalLight('#fff4e0', 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, near: 1, far: 220 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.target.position.set(...target);
  scene.add(hemi, sun, sun.target);

  // ---------- ground ----------
  const soil = mat(0x8a6a4a, { roughness: 1 }), grass = new THREE.MeshStandardMaterial({ color: SEASONS.spring.grass, roughness: 1 });
  // a block of earth from x0…x1, z0…z1, its top at top(z, x) (grass), its sides cut open (soil)
  function slab(x0, x1, z0, z1, top = () => 0, seg = 1, segX = 1) {
    const geo = new THREE.BoxGeometry(x1 - x0, 1, z1 - z0, segX, 1, seg);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (x0 + x1) / 2, z = p.getZ(i) + (z0 + z1) / 2; p.setXYZ(i, x, p.getY(i) > 0 ? top(z, x) : -1.6, z); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, [soil, soil, grass, soil, soil, soil]);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  // stone paving (石畳): small setts, or big granite slabs
  const pavings = {};
  function pavingTex(kind) {
    if (pavings[kind]) return pavings[kind];
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    if (kind === 'granite') {
      g.fillStyle = '#6f6c66'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 64) for (let x = (y / 64) % 2 ? -48 : 0; x < 256; x += 96) { g.fillStyle = `hsl(30, 5%, ${50 + ((x * 7 + y * 3) % 11)}%)`; g.fillRect(x + 2, y + 2, 92, 60); }
    } else {
      g.fillStyle = '#9d968a'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -24 : 0; x < 256; x += 48) { g.fillStyle = `hsl(35, 8%, ${62 + ((x * 7 + y * 3) % 9)}%)`; g.fillRect(x + 2, y + 2, 44, 28); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return (pavings[kind] = t);
  }
  // a paved strip w × len along Z, centred at (x, z), its surface at y(z); rotY turns it
  function paved(w, len, x, z, { y = () => 0.03, segs = 1, kind = 'setts', rotY = 0, rough = 0.9 } = {}) {
    const t = pavingTex(kind).clone(); t.needsUpdate = true; t.repeat.set(w / 3, len / 3);
    const geo = new THREE.PlaneGeometry(w, len, 1, segs).rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, y(p.getZ(i) + z));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: rough }));
    m.position.set(x, 0, z); m.rotation.y = rotY;
    m.receiveShadow = true; scene.add(m);
    return m;
  }

  // ---------- what moves ----------
  const life = [], people = [], stills = [], steps = [];

  // ---------- panel: views, seasons, time, follow ----------
  let look = look0, fly = null, following = false;
  const VIEWS = views;
  function goView(k) {
    following = false; $('follow')?.classList.remove('on');
    const [, p, t] = VIEWS[k];
    fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: p.clone(), t1: t.clone() };
    [...$('views').children].forEach((b) => b.classList.toggle('on', b.dataset.v === k));
  }
  for (const [k, [ja]] of Object.entries(VIEWS)) { const b = document.createElement('button'); b.textContent = ja; b.dataset.v = k; b.onclick = () => goView(k); $('views').appendChild(b); }
  const first = Object.keys(VIEWS)[0];
  camera.position.copy(VIEWS[first][1]); controls.target.copy(VIEWS[first][2]);
  $('views').children[0].classList.add('on');
  let season = 'spring';
  for (const [k, S] of Object.entries(SEASONS)) { const b = document.createElement('button'); b.textContent = S.ja; b.dataset.v = k; b.onclick = () => { setSeason(k); season = k; [...$('seasons').children].forEach((x) => x.classList.toggle('on', x === b)); }; $('seasons').appendChild(b); }
  $('seasons').children[0].classList.add('on');
  onSeason((name, S) => { grass.color.set(S.grass); if (look === 'day') scene.background.set(S.sky); });
  function applyLook() {
    const L = LOOKS[look];
    hemi.intensity = L.hemi[0]; hemi.color.set(L.hemi[1]); hemi.groundColor.set(L.hemi[2]);
    sun.intensity = L.sun[0]; sun.color.set(L.sun[1]); sun.position.set(...L.sun[2]).add(sun.target.position);
    scene.background.set(L.sky ?? SEASONS[season].sky);
    setLamps(L.lamps);
    [...$('time').children].forEach((b) => b.classList.toggle('on', b.dataset.v === look));
  }
  for (const b of $('time').children) b.onclick = () => { look = b.dataset.v; applyLook(); };
  if (follow) $('follow').onclick = () => { following = !following; $('follow').classList.toggle('on', following); fly = null; [...$('views').children].forEach((b) => b.classList.remove('on')); };

  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);
  resize();

  function step(t, dt) {
    clock.uTime.value = t;
    for (const o of life) o.userData.update(t, dt);
    for (const a of people) a.update(t, dt);
    for (const s of stills) s.update(t);
    for (const f of steps) f(t, dt);
  }
  const followCam = () => { const a = follow.agent(), p = a.p.position, o = follow.offset ?? [6, 5.5, 8]; return [v3(p.x + o[0], p.y + o[1], p.z + o[2]), v3(p.x, p.y + 0.9, p.z)]; };
  function start() {
    applyLook();
    const timer = new THREE.Clock();
    let uiT = 0;
    renderer.setAnimationLoop(() => {
      const dt = Math.min(timer.getDelta(), 0.05), t = timer.elapsedTime;
      step(t, dt);
      if ((uiT -= dt) <= 0) { uiT = 0.4; if (following) $('followLine').textContent = follow.agent().label || follow.idle; }
      if (fly) {
        fly.t = Math.min(1, fly.t + dt / 1.6);
        const k = fly.t * fly.t * (3 - 2 * fly.t);
        camera.position.lerpVectors(fly.p0, fly.p1, k);
        controls.target.lerpVectors(fly.t0, fly.t1, k);
        if (fly.t >= 1) fly = null;
      } else if (following) {
        const [p, tg] = followCam();
        camera.position.lerp(p, Math.min(1, dt * 1.5));
        controls.target.lerp(tg, Math.min(1, dt * 2.5));
      }
      controls.update();
      renderer.render(scene, camera);
    });
    // debug: one frame at a fixed size (the preview pane is narrow); run the people forward in time
    let simT = 0;
    window.__koto = {
      renderer, scene, camera, controls, people, VIEWS, goView, setSeason,
      setLook: (k) => { look = k; applyLook(); },
      view(k) { const [, p, t] = VIEWS[k]; fly = null; following = false; camera.position.copy(p); controls.target.copy(t); controls.update(); },
      follow() { following = true; const [p, t] = followCam(); camera.position.copy(p); controls.target.copy(t); controls.update(); },
      advance(sec) { for (let k = 0; k < sec * 20; k++) { simT += 1 / 20; step(timer.elapsedTime + simT, 1 / 20); } },
      snapshot(w = 1440, h = 900) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera); const url = renderer.domElement.toDataURL('image/jpeg', 0.88); resize(); return url; },
      info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, heapMB: (performance.memory?.usedJSHeapSize ?? 0) / 1e6 | 0 }),
    };
  }
  return { renderer, scene, camera, controls, slab, paved, life, people, stills, steps, start, get look() { return look; } };
}

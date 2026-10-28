// Mini Airport — renderer, camera, time of day, UI.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildScenery, glow } from './scenery.js';
import { buildTerminal } from './terminal.js';
import { PaxSystem } from './pax.js';
import { BagSystem } from './bags.js';
import * as T from './i18n.js';
import { Story } from './story.js';
import { CabinBook, CabinView } from './cabinview.js';
import { World, TURN, fmtClock } from './sim.js';
import * as L from './layout.js';

const $ = (id) => document.getElementById(id);

// ---------- renderer & scene ----------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
$('app').appendChild(renderer.domElement);
const labels = new CSS2DRenderer({ element: $('labels') });

const scene = new THREE.Scene();
scene.background = new THREE.Color();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
const HOME = { pos: new THREE.Vector3(118, 150, 205), target: new THREE.Vector3(0, 0, 10) };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.maxPolarAngle = 1.36;
controls.minDistance = 10;
controls.maxDistance = 520;
controls.update();

const hemi = new THREE.HemisphereLight();
const sun = new THREE.DirectionalLight();
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -128, right: 128, top: 128, bottom: -128, near: 1, far: 600 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(hemi, sun, sun.target);

const floods = [-36, 0, 36, 80].map((x) => {
  const p = new THREE.PointLight(0xffe2b0, 0, 60, 1.2);
  p.position.set(x, 9, L.TERMINAL.z0 - 4);
  scene.add(p);
  return p;
});

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.45, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const scenery = buildScenery(scene);
const terminal = buildTerminal(scene);
const world = new World(scene, scenery);
const pax = new PaxSystem(scene, world, terminal);
const bags = new BagSystem(scene, world, terminal);
const story = new Story(scene, world, pax);
const cabins = new CabinBook(world);
const cabinView = new CabinView(renderer, $('cabinFrame'), $('cabinViewport'), world, cabins);
let cabinClosed = null; // the flight whose cabin window the user closed
$('cabinClose').addEventListener('click', () => { cabinClosed = cabinView.flight; cabinView.show(null); });

// which flight's cabin to show: the selected aircraft, or the flight of the person being followed
function cabinFlight() {
  if (selected) return selected;
  if (person && ['boarding', 'aboard', 'deplane', 'corridor'].includes(person.activity)) return person.flight ?? person.stand?.flight ?? null;
  return null;
}

// Terminal view: 'auto' opens the roof when the camera comes close.
let viewPick = 'auto';
function updateView() {
  if (viewPick !== 'auto') return terminal.setMode(viewPick);
  if (person && follow) { // show the floor the followed person is on
    const p = person.p.getWorldPosition(new THREE.Vector3()), Tm = L.TERMINAL;
    const inside = p.x > Tm.x0 && p.x < Tm.x1 && p.z > Tm.z0 && p.z < Tm.z1;
    if (inside) return terminal.setMode(p.y > 2 ? 'f2' : 'f1');
  }
  const d = camera.position.distanceTo(controls.target);
  const nearTerminal = controls.target.z > L.TERMINAL.z0 - 30 && Math.abs(controls.target.x) < L.TERMINAL.x1 + 30;
  terminal.setMode(d < 150 && nearTerminal ? 'f2' : 'exterior');
}

// ---------- labels & selection ----------

const tags = new Map();
function addTag(f) {
  const el = document.createElement('div');
  el.className = 'tag';
  const obj = new CSS2DObject(el);
  obj.position.set(0, 6.2, 0);
  f.root.add(obj);
  tags.set(f, { el, obj });
}
world.onFlightAdded = addTag;
world.onFlightRemoved = (f) => {
  const t = tags.get(f);
  if (t) { t.obj.removeFromParent(); t.el.remove(); }
  tags.delete(f);
  if (selected === f) select(null);
};
world.flights.forEach(addTag);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(8.6, 9.2, 64),
  new THREE.MeshBasicMaterial({ color: 0xe8673c, transparent: true, opacity: 0.8, depthWrite: false }),
);
ring.rotation.x = -Math.PI / 2;
ring.visible = false;
scene.add(ring);

let selected = null;
let person = null; // a followed passenger / crew member (pax actor)
let follow = false;
let showLabels = true;
function select(f) {
  selected = f;
  if (f) person = null;
  ring.visible = !!f;
  ring.scale.setScalar(1);
  if (!f) setFollow(false);
  renderUI(true);
}
function selectPerson(a) {
  selected = null;
  person = a;
  ring.visible = !!a;
  ring.scale.setScalar(0.09);
  setFollow(!!a);
  if (a) { // swoop in close, then keep following
    const p = a.p.getWorldPosition(new THREE.Vector3());
    flyTo(p.setY(p.y * 0.6), new THREE.Vector3(9, 13, 16), true);
  }
  renderUI(true);
}
function setFollow(on) {
  follow = on && !!(selected || person);
  $('tFollow').classList.toggle('on', follow);
  if (follow) tween = null;
}

const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  // people first (they are small), then aircraft
  const actors = new Map();
  for (const a of pax.actors) if (a.p.visible) actors.set(a.p, a);
  for (const m of story.byId.yu.members) actors.set(m.p, m);
  const ph = ray.intersectObjects([...actors.keys()], true)[0];
  if (ph) {
    let o = ph.object;
    while (o && !actors.has(o)) o = o.parent;
    if (o) return selectPerson(actors.get(o));
  }
  const hit = ray.intersectObjects(world.flights.map((f) => f.root), true)[0];
  let o = hit?.object;
  while (o && !o.userData.flight) o = o.parent;
  if (o) {
    select(o.userData.flight);
    setFollow(true);
  }
});

// ---------- camera tweens ----------

let tween = null;
function flyTo(target, offset, keepFollow = false) {
  if (!keepFollow) setFollow(false);
  tween = {
    t: 0,
    p0: camera.position.clone(), t0: controls.target.clone(),
    p1: target.clone().add(offset), t1: target.clone(),
  };
}
function updateCamera(dt) {
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 1.4);
    const k = THREE.MathUtils.smootherstep(tween.t, 0, 1);
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    controls.target.lerpVectors(tween.t0, tween.t1, k);
    if (tween.t >= 1) tween = null;
  } else if (follow && (selected || person)) {
    const goal = selected ? selected.root.position.clone() : person.p.getWorldPosition(new THREE.Vector3());
    goal.y *= 0.6;
    const delta = goal.sub(controls.target).multiplyScalar(1 - Math.exp(-4 * dt));
    controls.target.add(delta);
    camera.position.add(delta);
  }
  controls.update();
}

// ---------- time of day ----------

const TOD = {
  day: { bg: 0xefe8dc, sky: 0xfff8ee, ground: 0xc9b99f, hemi: 1.35, sun: 2.7, sunColor: 0xfff1dc, dir: [0.5, 0.8, 0.32], night: 0, bloom: 0.22, flood: 0 },
  dusk: { bg: 0xe8c4a2, sky: 0xffd2ae, ground: 0x8c7871, hemi: 0.85, sun: 2.0, sunColor: 0xffa468, dir: [-0.86, 0.3, 0.22], night: 0.55, bloom: 0.5, flood: 25 },
  night: { bg: 0x121827, sky: 0x4d5d8a, ground: 0x1a1e2a, hemi: 0.6, sun: 0.5, sunColor: 0x9db4ff, dir: [-0.3, 0.9, -0.35], night: 1, bloom: 0.85, flood: 70 },
};
const cur = { bg: new THREE.Color(TOD.day.bg), sky: new THREE.Color(TOD.day.sky), ground: new THREE.Color(TOD.day.ground), sunColor: new THREE.Color(TOD.day.sunColor), dir: new THREE.Vector3(...TOD.day.dir), hemi: 1.35, sun: 2.7, night: 0, bloom: 0.22, flood: 0 };
let todKey = 'day';
let todAuto = true; // follow the airport clock: dawn → day → dusk → night
function todFromClock() {
  const h = (world.clock / 60) % 24;
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 17 && h < 19) || (h >= 5 && h < 7)) return 'dusk';
  return 'night';
}
function updateLighting(dt) {
  if (todAuto) {
    const k = todFromClock();
    if (k !== todKey) { todKey = k; document.body.classList.toggle('night', k === 'night'); }
  }
  const T = TOD[todKey];
  const k = 1 - Math.exp(-2.2 * dt);
  for (const key of ['bg', 'sky', 'ground', 'sunColor']) cur[key].lerp(new THREE.Color(T[key]), k);
  cur.dir.lerp(new THREE.Vector3(...T.dir), k);
  for (const key of ['hemi', 'sun', 'night', 'bloom', 'flood']) cur[key] += (T[key] - cur[key]) * k;
  scene.background.copy(cur.bg);
  hemi.color.copy(cur.sky);
  hemi.groundColor.copy(cur.ground);
  hemi.intensity = cur.hemi;
  sun.color.copy(cur.sunColor);
  sun.intensity = cur.sun;
  sun.position.copy(cur.dir).normalize().multiplyScalar(260);
  for (const g of glow) g.material.emissiveIntensity = THREE.MathUtils.lerp(g.day, g.night, cur.night);
  for (const p of floods) p.intensity = cur.flood;
  bloom.strength = cur.bloom;
}

// ---------- UI ----------

let speed = 1;
const seg = (id, onPick) => {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $(id).querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    onPick(b.dataset.v);
  });
};
seg('speed', (val) => { speed = Number(val); });
function applyLang() {
  T.applyStatic();
  $('lang').textContent = T.t('langBtn');
  renderUI(true);
}
$('lang').addEventListener('click', () => {
  T.setLang(T.getLang() === 'ja' ? 'en' : 'ja');
  story.relabel();
  applyLang();
});
$('story').addEventListener('click', (e) => {
  const li = e.target.closest('[data-cast]');
  if (!li) return;
  const lead = story.byId[li.dataset.cast].members.find((m) => !m.done);
  if (lead) selectPerson(lead);
});
seg('view', (val) => {
  viewPick = val;
  if (val === 'f2' || val === 'f1') flyTo(new THREE.Vector3(-4, val === 'f2' ? 3 : 0, 24), new THREE.Vector3(26, 60, 70));
});
seg('tod', (val) => {
  todAuto = val === 'auto';
  if (todAuto) return;
  todKey = val;
  document.body.classList.toggle('night', val === 'night');
});
$('tLabels').addEventListener('click', () => {
  showLabels = !showLabels;
  $('tLabels').classList.toggle('on', showLabels);
  $('labels').style.display = showLabels ? '' : 'none';
});
$('tFollow').addEventListener('click', () => setFollow(!follow));
$('tReset').addEventListener('click', () => {
  select(null);
  flyTo(HOME.target, HOME.pos.clone().sub(HOME.target));
});
$('stands').addEventListener('click', (e) => {
  const li = e.target.closest('[data-stand]');
  if (!li) return;
  const s = world.stands[Number(li.dataset.stand)];
  if (s.flight && s.flight.state !== 'approach') {
    select(s.flight);
    setFollow(true);
  } else {
    flyTo(new THREE.Vector3(s.x, 0, L.PARK_Z), new THREE.Vector3(20, 26, 34));
  }
});

function standRow(s) {
  const f = s.flight;
  let chip = `<span class="chip">${T.t('free')}</span>`;
  let sub = T.t('waiting');
  let pct = 0;
  if (f) {
    const cls = f.phase === 'turnaround' ? 'busy' : 'ok';
    chip = `<span class="chip ${cls}">${T.status(f.status)}</span>`;
    sub = `${T.city(f.from)} → ${T.city(f.to)}`;
    if (f.state === 'parked') pct = Math.min(100, (f.t / TURN.ready) * 100);
  }
  return `<li class="stand" data-stand="${s.index}">
    <span class="id">${s.id}</span>
    <div><div class="fl">${f ? f.number : '—'}</div><div class="st">${sub}</div>${f && f.state === 'parked' ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</div>
    ${chip}</li>`;
}

function personCard(a) {
  const acts = T.t('acts'), types = T.t('types'), kinds = T.t('kinds');
  const castEntry = a.storyId ? story.byId[a.storyId] : (story.byId.yu.members.includes(a) ? story.byId.yu : null);
  const name = castEntry ? `★ ${castEntry.name[T.getLang()]}` : types[a.type] ?? kinds[a.kind] ?? '';
  const f = a.flight ?? a.stand?.flight;
  return `<div class="card">
    <div class="num">${name}</div>
    <div class="route">${castEntry ? castEntry.role[T.getLang()] : kinds[a.kind] ?? ''}</div>
    <div class="kv">
      <span>${T.t('doing')}</span><b>${acts[a.activity] ?? '—'}</b>
      ${a.stand ? `<span>${T.t('gateLabel')}</span><b>${a.stand.id}</b>` : ''}
      ${a.seat ? `<span>${T.t('seat')}</span><b>${a.seat}</b>` : ''}
      ${f ? `<span>${T.t('flightLabel')}</span><b>${f.number} · ${T.city(f.from)} → ${T.city(f.to)}</b>` : ''}
    </div>${castEntry?.last ? `<p class="empty" style="margin:8px 0 0">${castEntry.last[T.getLang()]}</p>` : ''}</div>`;
}

function storyRows() {
  return story.cast.map((c) => {
    const lead = c.members.find((m) => !m.done);
    const line = (c.state === 'active' || c.state === 'away') && c.last ? c.last[T.getLang()] : T.t('storyIdle');
    return `<li class="stand" data-cast="${c.id}">
      <span class="id">★</span>
      <div><div class="fl">${c.name[T.getLang()]} <span class="st">${c.role[T.getLang()]}</span></div><div class="st">${line}</div></div>
      ${lead ? `<span class="chip ok">${T.t('watch')}</span>` : ''}</li>`;
  }).join('');
}

function flightCard(f) {
  if (!f) return `<p class="empty">${T.t('clickHint')}</p>`;
  const svcT = T.t('svc'), ppl = T.t('people'), pcs = T.t('pieces');
  const kt = Math.round(f.v * 11);
  const ft = Math.round(f.alt * 120);
  const svc = f.state === 'parked'
    ? `<div class="toggles" style="margin-top:8px">${f.services().map(([n, st]) => `<span class="chip ${st === 'on' ? 'busy' : st === 'done' ? 'ok' : ''}">${svcT[n]} · ${svcT[st]}</span>`).join('')}</div>`
    : '';
  return `<div class="card">
    <div class="num">${f.number}</div>
    <div class="route">${T.city(f.from)} ${f.from[1]} → ${T.city(f.to)} ${f.to[1]}</div>
    <div class="kv">
      <span>${T.t('state')}</span><b>${T.status(f.status)}</b>
      <span>${T.t('stand')}</span><b>${f.stand.id}</b>
      <span>${T.t('arrived')}</span><b>${f.arrivedAt != null ? fmtClock(f.arrivedAt) : '—'}</b>
      <span>${T.t('std')}</span><b>${f.std != null ? fmtClock(f.std) : '—'}</b>
      <span>${T.t('speedAlt')}</span><b>${kt} kt · ${ft} ft</b>
      <span>${T.t('paxOffOn')}</span><b>${f.deplaned ?? 0}${ppl} / ${f.boarded ?? 0}${ppl}</b>
      <span>${T.t('seats')}</span><b>${cabins.seatedCount(f)} / ${cabinView.seatsTotal}</b>
      <span>${T.t('bagsOffOn')}</span><b>${f.bagsUnloaded ?? 0}${pcs} / ${f.bagsLoaded ?? 0}${pcs}</b>
    </div>${svc}</div>`;
}

let uiTimer = 0;
function renderUI(force = false) {
  $('clock').textContent = fmtClock(world.clock);
  $('sArr').textContent = world.stats.arrivals;
  $('sDep').textContent = world.stats.departures;
  $('paxLine').textContent = T.t('paxLine')({ dep: pax.stats.departing, arr: pax.stats.arriving, boarded: pax.stats.boarded, bags: bags.inTransit });
  $('sOnTime').textContent = world.stats.pushbacks ? `${Math.round((world.stats.onTime / world.stats.pushbacks) * 100)}%` : '—';
  $('stands').innerHTML = world.stands.map(standRow).join('');
  $('flight').innerHTML = person ? personCard(person) : flightCard(selected);
  $('story').innerHTML = storyRows();
  const lines = [
    ...world.events.map((e) => ({ clock: e.clock, html: `<span>${T.logLine(e)}</span>` })),
    ...story.feed.map((e) => ({ clock: e.time, html: `<span style="color:var(--accent)">★ ${e.line[T.getLang()]}</span>` })),
  ].sort((a, b) => b.clock - a.clock).slice(0, 9);
  $('log').innerHTML = lines.map((e) => `<li><time>${fmtClock(e.clock)}</time>${e.html}</li>`).join('');
  for (const [f, t] of tags) {
    t.el.className = 'tag' + (f === selected ? ' sel' : '');
    t.el.innerHTML = `<i></i>${f.number} · ${T.status(f.status)}`;
  }
}

// ---------- resize & loop ----------

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  labels.setSize(w, h);
  camera.aspect = w / h;
  // keep the diorama centred in the space left of the side panel
  const panel = w > 820 ? 310 : 0;
  if (panel) camera.setViewOffset(w, h, panel / 2, 0, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
applyLang();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const rdt = Math.min(clock.getDelta(), 0.1);
  let left = rdt * speed;
  while (left > 1e-6) {
    const step = Math.min(left, 1 / 30);
    world.update(step);
    left -= step;
  }
  scenery.update(world.time, rdt * speed);
  terminal.update(world.time, rdt * speed);
  pax.update(world.time, rdt * speed);
  bags.update(world.time, rdt * speed);
  story.update(rdt * speed);
  cabins.update();
  const cf = cabinFlight();
  if (cf !== cabinClosed) cabinClosed = null;
  cabinView.focus = person;
  cabinView.show(cabinClosed ? null : cf);
  cabinView.update(world.time, rdt * speed);
  updateView();

  if (person) {
    if (person.done || !person.p.parent) selectPerson(null);
    else {
      const p = person.p.getWorldPosition(new THREE.Vector3());
      ring.position.set(p.x, p.y + 0.05, p.z);
    }
  } else if (selected) {
    ring.position.set(selected.root.position.x, 0.06, selected.root.position.z);
    ring.material.opacity = 0.55 + Math.sin(performance.now() / 300) * 0.25;
  }
  updateCamera(rdt);
  updateLighting(rdt);

  uiTimer -= rdt;
  if (uiTimer <= 0) {
    renderUI();
    uiTimer = 0.25;
  }
  composer.render();
  cabinView.render();
  if (cabinView.flight) {
    const f = cabinView.flight;
    $('cabinTitle').textContent = `${T.t('cabin')} · ${f.number} · ${T.city(f.from)} → ${T.city(f.to)} · ${T.status(f.status)} · ${T.t('seats')} ${cabins.seatedCount(f)}/${cabinView.seatsTotal}`;
  }
  labels.render(scene, camera);
});

// Debug hooks. snapshot() renders one frame at a fixed size and returns it as a data URL.
function snapshot(w = 1440, h = 900) {
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.setViewOffset(w, h, 155, 0, w, h);
  camera.updateProjectionMatrix();
  composer.render();
  cabinView.render();
  if (cabinView.flight) {
    const f = cabinView.flight;
    $('cabinTitle').textContent = `${T.t('cabin')} · ${f.number} · ${T.city(f.from)} → ${T.city(f.to)} · ${T.status(f.status)} · ${T.t('seats')} ${cabins.seatedCount(f)}/${cabinView.seatsTotal}`;
  }
  const url = renderer.domElement.toDataURL('image/jpeg', 0.85);
  resize();
  return url;
}
window.__airport = { cabins, cabinView, world, terminal, pax, bags, story, selectPerson, scenery, camera, controls, renderer, scene, flyTo, select, snapshot, setTod: (k) => { todAuto = k === 'auto'; if (!todAuto) todKey = k; }, setView: (k) => { viewPick = k; } };

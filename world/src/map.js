// World Map (world/DESIGN.md §2): a low-poly globe with the tiny worlds standing on it as little models, the routes
// out of Mini Airport as dotted arcs, and aircraft flying them. Starts on the whole globe, then turns to East Asia.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { airplane, LIVERIES, mat, box, cyl } from '../../airport/src/parts.js';
import { palm } from '../../town/src/nature.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { CITIES, WORLDS, ROUTES, LIVERY_KEYS } from './places.js';

const $ = (id) => document.getElementById(id);
const R = 100, D = Math.PI / 180;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
// a latitude/longitude on the globe (matches SphereGeometry's uv, so the equirectangular land texture lines up)
export function ll(lat, lon, r = R) {
  const phi = (90 - lat) * D, th = (lon + 180) * D;
  return vec(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}
const at = (code, r = R) => ll(CITIES[code][2], CITIES[code][3], r);
const name = (code) => L([CITIES[code][0], CITIES[code][1]]);

// ---------- renderer, scene ----------

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
$('app').appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.className = 'labels';
$('app').appendChild(labels.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
scene.add(camera);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.rotateSpeed = 0.45;
controls.zoomSpeed = 0.7;
controls.minDistance = 150;
controls.maxDistance = 520;
scene.add(new THREE.HemisphereLight('#fffaf0', '#c9c2b0', 1.6));
const sun = new THREE.DirectionalLight('#fff4e0', 1.9); // rides with the camera, a little up and to the left
sun.position.set(-160, 220, 120);
camera.add(sun, sun.target);
sun.target.position.set(0, 0, -400);

// ---------- the globe: a faceted sphere, the sea, shallows along the coasts, the land ----------

const tex = (() => {
  const W = 2048, H = 1024, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#8fcfd4'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.5; // a faint graticule every 30°
  for (let lon = -180; lon <= 180; lon += 30) { const x = (lon + 180) / 360 * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { const y = (90 - lat) / 180 * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData = { g, W, H };
  return t;
})();
const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, flatShading: true }));
scene.add(globe);
// the air around it: a soft rim
const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 64, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide, transparent: true, depthWrite: false,
  vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix * normal); vec4 p = modelViewMatrix * vec4(position,1.0); v = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
  fragmentShader: 'varying vec3 n; varying vec3 v; void main(){ float f = pow(1.0 - abs(dot(n, v)), 2.2); gl_FragColor = vec4(0.62, 0.84, 0.86, f * 0.55); }',
}));
scene.add(halo);

// land from world-atlas (Natural Earth 1:110m), drawn once into the globe's texture
(async () => {
  try {
    const [{ feature }, topo] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm'),
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then((r) => r.json()),
    ]);
    const { g, W, H } = tex.userData;
    const land = feature(topo, topo.objects.land);
    const trace = () => {
      g.beginPath();
      for (const f of land.features) {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        for (const poly of polys) for (const ring of poly) {
          // keep the longitude continuous across the 180° line (Chukotka, Fiji); a ring that runs off an edge is drawn again a turn over
          let prev = ring[0][0], off = 0, lo = Infinity, hi = -Infinity;
          const pts = ring.map(([lon, lat]) => { if (lon - prev > 180) off -= 360; else if (prev - lon > 180) off += 360; prev = lon; const u = lon + off; lo = Math.min(lo, u); hi = Math.max(hi, u); return [u, lat]; });
          const shifts = hi - lo > 350 ? [0] : [0, lo < -180 ? 360 : hi > 180 ? -360 : null].filter((v) => v !== null);
          for (const sh of shifts) pts.forEach(([lon, lat], i) => { const x = (lon + sh + 180) / 360 * W, y = (90 - lat) / 180 * H; i ? g.lineTo(x, y) : g.moveTo(x, y); });
        }
      }
    };
    trace();
    g.lineJoin = 'round';
    g.strokeStyle = '#b6e2da'; g.lineWidth = 9; g.stroke(); // the shallows
    g.fillStyle = '#f0e4c6'; g.fill('evenodd');
    g.strokeStyle = '#d9c9a3'; g.lineWidth = 1.2; g.stroke(); // the coastline
    tex.needsUpdate = true;
  } catch (e) {
    console.warn('world map: land outlines could not load', e);
  }
})();

// ---------- the worlds: a little model for each, standing on the globe ----------

const plinth = mat(0xf7f1e6), ink = mat(0x2c3a57);
const MODELS = {
  tower() { // Mini Airport: the control tower
    const g = new THREE.Group();
    g.add(cyl(0.45, 0.6, 3.2, mat(0xf1ede4), 0, 1.6, 0, 10));
    g.add(cyl(1.0, 0.75, 0.9, mat(0x7fc4cf, { roughness: 0.2 }), 0, 3.6, 0, 10));
    g.add(cyl(1.1, 1.1, 0.25, mat(0xe8673c), 0, 4.15, 0, 10));
    return g;
  },
  palm() { // Naha: palms and a red-tiled roof
    const g = new THREE.Group();
    for (const [x, z, s] of [[-0.6, 0.2, 0.62], [0.7, -0.4, 0.5]]) { const p = palm({ height: 6, lean: 0.6, seed: 3 }); p.scale.setScalar(s); p.position.set(x, 0, z); g.add(p); }
    g.add(box(1.6, 0.8, 1.2, mat(0xf4efe4), 0.4, 0.4, 0.9));
    g.add(cyl(0.01, 1.2, 0.6, mat(0xc4573a), 0.4, 1.1, 0.9, 4)).rotation.y = Math.PI / 4;
    return g;
  },
  pagoda() { // Koto: a five-storey pagoda
    const g = new THREE.Group(), wood = mat(0xb5603e), roof = mat(0x4a4f57);
    for (let k = 0; k < 5; k++) {
      const s = 1 - k * 0.12, y = 0.2 + k * 0.85;
      g.add(box(1.2 * s, 0.55, 1.2 * s, wood, 0, y + 0.27, 0));
      g.add(cyl(0.01, 1.35 * s + 0.2, 0.3, roof, 0, y + 0.68, 0, 4)).rotation.y = Math.PI / 4;
    }
    g.add(cyl(0.05, 0.07, 1.2, mat(0xc9a24a), 0, 5.0, 0, 6));
    return g;
  },
  sagrada() { // Barcelona: the towers of the Sagrada Família
    const g = new THREE.Group(), stone = mat(0xd9c49a), tip = mat(0xe8673c);
    g.add(box(2.4, 1.2, 1.2, stone, 0, 0.6, 0));
    for (const [x, z, h] of [[-0.9, -0.35, 3.6], [-0.3, -0.35, 4.2], [0.3, -0.35, 4.2], [0.9, -0.35, 3.6], [0, 0.3, 5.4]]) {
      g.add(cyl(0.06, 0.3, h, stone, x, h / 2, z, 8));
      g.add(cyl(0.12, 0.12, 0.22, tip, x, h + 0.08, z, 6));
    }
    return g;
  },
  tuktuk() { // Bangkok: a tuk-tuk under a string of night-market bulbs
    const g = new THREE.Group(), blue = mat(0x2c5aa0), dark = mat(0x24252a);
    g.add(box(2.2, 0.55, 1.2, blue, 0, 0.75, 0)); // the body
    g.add(box(0.6, 0.7, 0.8, blue, 1.25, 0.8, 0)); // the nose
    g.add(box(2.4, 0.12, 1.4, mat(0xf2b84b), -0.1, 2.05, 0)); // the roof
    for (const [x, z] of [[-1.0, -0.6], [-1.0, 0.6], [0.6, -0.6], [0.6, 0.6]]) g.add(box(0.07, 1.0, 0.07, dark, x, 1.5, z));
    for (const [x, z] of [[1.3, 0], [-0.8, -0.62], [-0.8, 0.62]]) { const w = cyl(0.35, 0.35, 0.2, dark, x, 0.35, z, 10); w.rotation.x = Math.PI / 2; g.add(w); }
    g.add(box(0.25, 0.2, 0.06, mat(0xfff4d0, { emissive: 0xfff4d0, emissiveIntensity: 0.8 }), 1.56, 0.95, 0));
    [0xffcf80, 0xff5ca8, 0x5ce1ff, 0x5cff8a].forEach((c, i) => { for (const s of [-1, 1]) g.add(cyl(0.09, 0.09, 0.09, mat(c, { emissive: c, emissiveIntensity: 0.9 }), -1.05 + i * 0.6 + (s > 0 ? 0.3 : 0), 2.05, s * 0.72, 6)); });
    return g;
  },
  cabin() { // the Nordic café: a red wooden house
    const g = new THREE.Group();
    g.add(box(2.0, 1.3, 1.4, mat(0xa8352c), 0, 0.65, 0));
    const roof = cyl(1.0, 1.0, 2.15, mat(0x2f3338), 0, 1.65, 0, 3);
    roof.rotation.set(0, 0, Math.PI / 2); roof.scale.set(1, 1, 0.85);
    g.add(roof);
    for (const x of [-0.5, 0.5]) g.add(box(0.35, 0.4, 0.05, mat(0xfff4dc, { emissive: 0xffd68a, emissiveIntensity: 0.5 }), x, 0.75, 0.72));
    g.add(box(0.4, 0.75, 0.05, mat(0xf4efe4), 0, 0.38, 0.72));
    return g;
  },
};
const UP = vec(0, 1, 0);
const stand = (obj, pos) => { obj.position.copy(pos); obj.quaternion.setFromUnitVectors(UP, pos.clone().normalize()); scene.add(obj); return obj; };

const picks = []; // things the pointer can pick: { pos, kind, ref }
const cityLabels = [];
for (const [code, c] of Object.entries(CITIES)) {
  const world = WORLDS.find((w) => w.city === code);
  const p = at(code);
  if (world) {
    const g = new THREE.Group();
    g.add(cyl(1.8, 2.0, 0.3, plinth, 0, 0.1, 0, 16));
    const m = MODELS[world.model]();
    m.position.y = 0.25;
    g.add(m);
    g.scale.setScalar(1.1);
    stand(g, p);
    picks.push({ pos: at(code, R + 2.5), kind: 'world', ref: world });
  } else {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mat(0xfffaf2));
    dot.position.copy(at(code, R + 0.1));
    scene.add(dot);
    picks.push({ pos: at(code, R + 0.4), kind: 'city', ref: code });
  }
  const d = document.createElement('div');
  d.className = 'city' + (world ? ' world' : ' dim');
  const o = new CSS2DObject(d);
  o.position.copy(at(code, R + (world ? 5.5 : 0.6)));
  o.userData = { code, el: d, normal: p.clone().normalize() };
  scene.add(o);
  cityLabels.push(o);
}
const relabel = () => { for (const o of cityLabels) o.userData.el.textContent = name(o.userData.code); };
relabel();
onLang(() => { relabel(); if (shown) showCard(shown); });

// ---------- routes: dotted arcs out of Mini Airport ----------

const arcs = {};
const routeMat = new THREE.LineDashedMaterial({ color: 0x2c3a57, dashSize: 0.9, gapSize: 0.9, transparent: true, opacity: 0.32 });
// a point along the great circle from a to b at u (0..1), lifted into the air in the middle
function arcPoint(a, b, u, lift, out = new THREE.Vector3()) {
  const ang = a.angleTo(b);
  const s = Math.sin(ang), k1 = Math.sin((1 - u) * ang) / s, k2 = Math.sin(u * ang) / s;
  out.copy(a).multiplyScalar(k1).addScaledVector(b, k2).normalize();
  return out.multiplyScalar(R + 0.6 + lift * Math.sin(Math.PI * u));
}
for (const code of ROUTES) {
  const a = at('HND').normalize(), b = at(code).normalize(), ang = a.angleTo(b);
  const lift = 1.2 + ang * R * 0.09;
  const pts = Array.from({ length: 64 }, (_, i) => arcPoint(a, b, i / 63, lift));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), routeMat);
  line.computeLineDistances();
  scene.add(line);
  arcs[code] = { a, b, lift, len: ang * R };
}

// ---------- aircraft: out to a city and back, each leg a new flight number ----------

const SPEED = 3.2; // globe units a second
const planes = [];
const planeFor = ROUTES.filter((c, i) => i % 3 !== 2).concat(['OKA', 'BCN']); // a few routes doubled up, Naha among them
const models = LIVERY_KEYS.map((k) => airplane(LIVERIES[k])); // one per livery; the copies share its geometry
planeFor.slice(0, 9).forEach((code, i) => {
  const m = models[i % models.length].clone();
  m.scale.setScalar(0.15);
  scene.add(m);
  const n = 100 + ((i * 137) % 880);
  planes.push({ m, code, out: i % 2 === 0, u: (i * 0.29) % 1, wait: 0, n: n - (n % 2) + 1 });
  picks.push({ pos: m.position, kind: 'plane', ref: planes.at(-1) });
});
const flightNo = (p) => `MA ${p.out ? p.n : p.n + 1}`;
const P = new THREE.Vector3(), Q = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), M4 = new THREE.Matrix4();
function flyPlanes(dt) {
  for (const p of planes) {
    const arc = arcs[p.code];
    if (p.wait > 0) { p.wait -= dt; p.m.visible = false; continue; }
    p.m.visible = true;
    p.u += (SPEED * dt) / arc.len;
    if (p.u >= 1) { p.u = 0; p.out = !p.out; p.wait = 1.5; if (p.out) p.n = 100 + ((p.n * 7 + 31) % 880) | 1; continue; }
    const [a, b] = p.out ? [arc.a, arc.b] : [arc.b, arc.a];
    arcPoint(a, b, p.u, arc.lift, P);
    arcPoint(a, b, Math.min(1, p.u + 0.004), arc.lift, Q);
    X.subVectors(Q, P).normalize(); // nose (+X on the model) along the arc, belly to the globe
    Y.copy(P).normalize(); Z.crossVectors(X, Y).normalize(); Y.crossVectors(Z, X);
    M4.makeBasis(X, Y, Z);
    p.m.position.copy(P);
    p.m.quaternion.setFromRotationMatrix(M4);
  }
}

// ---------- clouds: a few soft puffs drifting east ----------

const CLOUDS = 16, PUFFS = 4;
const clouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 }), CLOUDS * PUFFS);
scene.add(clouds);
const cloudAt = Array.from({ length: CLOUDS }, (_, i) => ({ lat: -50 + ((i * 37) % 110), lon: (i * 83) % 360 - 180, s: 0.8 + ((i * 13) % 7) / 10, v: 1.2 + (i % 4) * 0.4 }));
const O = new THREE.Object3D();
function driftClouds(dt) {
  cloudAt.forEach((c, i) => {
    c.lon = ((c.lon + c.v * dt + 540) % 360) - 180;
    const n = ll(c.lat, c.lon, 1);
    const east = vec(-n.z, 0, n.x).normalize(), north = new THREE.Vector3().crossVectors(n, east);
    for (let k = 0; k < PUFFS; k++) {
      O.position.copy(n).multiplyScalar(R + 5).addScaledVector(east, (k - 1.5) * 0.9 * c.s).addScaledVector(north, Math.sin(k * 2.1) * 0.35 * c.s);
      O.scale.set(1.5, 0.9, 1.3).multiplyScalar(0.55 * c.s * (k === 1 || k === 2 ? 1.25 : 0.9));
      O.quaternion.setFromUnitVectors(UP, n);
      O.updateMatrix();
      clouds.setMatrixAt(i * PUFFS + k, O.matrix);
    }
  });
  clouds.instanceMatrix.needsUpdate = true;
}

// ---------- the card ----------

let shown = null;
function showCard(what) {
  shown = what;
  const card = $('card');
  card.hidden = false;
  const links = $('cardLinks');
  links.innerHTML = '';
  const link = (href, label, cls = '') => { const a = document.createElement('a'); a.href = href; a.textContent = L(label); a.className = cls; links.append(a); };
  if (what.kind === 'world') {
    const w = what.ref;
    $('cardCity').textContent = name(w.city);
    $('cardTitle').textContent = L(w.title);
    $('cardText').textContent = L(w.text);
    w.links.forEach((l, i) => link(l.href, l.label, i ? '' : 'primary'));
    if (w.fly) link(`./flight.html?from=HND&to=${w.city}`, ['ミニ空港から飛ぶ →', 'Fly from Mini Airport →'], 'fly');
  } else if (what.kind === 'city') {
    $('cardCity').textContent = 'MINI AIRPORT → ' + what.ref;
    $('cardTitle').textContent = name(what.ref);
    $('cardText').textContent = L(['ミニ空港から毎日飛んでいます。この町の世界はまだ準備中です。', 'Flights from Mini Airport every day. This city’s world is still to come.']);
  } else {
    const p = what.ref, [from, to] = p.out ? ['HND', p.code] : [p.code, 'HND'];
    $('cardCity').textContent = `${flightNo(p)} · ${from} → ${to}`;
    $('cardTitle').textContent = `${name(from)} → ${name(to)}`;
    const w = WORLDS.find((x) => x.city === to);
    $('cardText').textContent = w ? L([`${name(to)}には「${L(w.title)}」の世界があります。`, `${name(to)} has a world: ${L(w.title)}.`]) : L(['この便の行き先の世界は、まだ準備中です。', 'The world at the other end of this flight is still to come.']);
    if (to === 'OKA') link(`./flight.html?from=HND&to=OKA&flight=${encodeURIComponent(flightNo(p))}`, ['この便に乗る →', 'Board this flight →'], 'fly');
    else if (from === 'OKA') link(`./flight.html?from=OKA&to=HND&flight=${encodeURIComponent(flightNo(p))}`, ['この便に乗る →', 'Board this flight →'], 'fly');
    if (w) link(w.links[0].href, [`${L(w.title)}を開く`, `Open ${L(w.title)}`], 'primary');
  }
}
$('cardClose').onclick = () => { $('card').hidden = true; shown = null; };

// ---------- picking: the nearest thing on screen within reach of the pointer ----------

const S = new THREE.Vector3();
function pickAt(cx, cy) {
  const rect = renderer.domElement.getBoundingClientRect();
  const camDir = camera.position.clone().normalize();
  let best = null, bestD = 22;
  for (const p of picks) {
    if (p.kind === 'plane' && !p.ref.m.visible) continue;
    if (p.pos.clone().normalize().dot(camDir) < 0.2) continue; // the far side of the globe
    S.copy(p.pos).project(camera);
    const x = (S.x + 1) / 2 * rect.width, y = (1 - S.y) / 2 * rect.height;
    const d = Math.hypot(x - cx, y - cy) - (p.kind === 'world' ? 8 : 0);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const p = pickAt(e.clientX, e.clientY);
  if (!p) return;
  showCard(p);
  if (p.kind !== 'plane') goTo(p.kind === 'world' ? p.ref.city : p.ref, Math.min(camera.position.length(), 230));
});
renderer.domElement.addEventListener('pointermove', (e) => { renderer.domElement.style.cursor = pickAt(e.clientX, e.clientY) ? 'pointer' : 'grab'; });

// ---------- views ----------

const VIEWS = { globe: [32, 70, 470], asia: [21, 131, 225], europe: [40, 10, 245] }; // close views sit south of what they show (see tilt)
let fly = null;
function flyTo([lat, lon, dist], dur = 2.2) {
  const p0 = camera.position.clone();
  fly = { t: 0, dur, d0: p0.length(), dir0: p0.normalize(), dir1: ll(lat, lon, 1).normalize(), d1: dist };
  for (const b of $('views').children) b.classList.toggle('on', VIEWS[b.dataset.v]?.[0] === lat && VIEWS[b.dataset.v]?.[1] === lon);
}
const goTo = (code, dist) => flyTo([CITIES[code][2] - 10, CITIES[code][3], dist], 1.4);
$('views').onclick = (e) => { const v = e.target.closest('button')?.dataset.v; if (v) flyTo(VIEWS[v]); };
controls.addEventListener('start', () => { fly = null; });

// close in, the camera looks a little north of straight down, so the globe reads like a diorama with a horizon
const T = new THREE.Vector3(), NORTH = new THREE.Vector3();
function tilt() {
  const d = camera.position.length(), k = 1 - THREE.MathUtils.smoothstep(d, 230, 430);
  const n = T.copy(camera.position).normalize();
  NORTH.set(0, 1, 0).addScaledVector(n, -n.y).normalize();
  T.multiplyScalar(R * k * 0.85).addScaledVector(NORTH, k * (d - R) * 0.2);
  camera.up.copy(NORTH).lerp(UP, 1 - k).normalize();
  camera.lookAt(T);
}

// ---------- the frame ----------

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const start = new URLSearchParams(location.search).get('view');
camera.position.copy(ll(...VIEWS.globe.slice(0, 2), VIEWS.globe[2]));
if (start && VIEWS[start]) camera.position.copy(ll(VIEWS[start][0], VIEWS[start][1], VIEWS[start][2]));
else setTimeout(() => { if (!fly) flyTo(VIEWS.asia, 3); }, 1200); // the whole globe first, then East Asia
for (const b of $('views').children) b.classList.toggle('on', b.dataset.v === (start ?? 'globe'));

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), clk = new THREE.Clock();
function frame(dt) {
  if (fly) {
    fly.t += dt;
    const k = THREE.MathUtils.smootherstep(Math.min(1, fly.t / fly.dur), 0, 1);
    qa.setFromUnitVectors(fly.dir0, fly.dir1);
    qb.identity().slerp(qa, k);
    camera.position.copy(fly.dir0).applyQuaternion(qb).multiplyScalar(THREE.MathUtils.lerp(fly.d0, fly.d1, k));
    if (fly.t >= fly.dur) fly = null;
  } else controls.update();
  tilt();
  flyPlanes(dt);
  driftClouds(dt);
  const camDir = camera.position.clone().normalize();
  for (const o of cityLabels) o.userData.el.style.opacity = o.userData.normal.dot(camDir) > 0.25 ? 1 : 0;
  renderer.render(scene, camera);
  labels.render(scene, camera);
}
renderer.setAnimationLoop(() => frame(Math.min(clk.getDelta(), 0.05)));

window.__map = { renderer, scene, camera, controls, planes, flyTo, VIEWS, showCard, frame };

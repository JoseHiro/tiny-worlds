// Cafè de la Plaça — the Barcelona terrace café (cafe/DESIGN.md §2.5, cafe/SAGRADA.md §3): a corner café on the far
// side of Plaça de Gaudí, its terrace of rattan chairs and parasols on flower-tiled pavement, and across the plaza
// and its pond, the Nativity façade of the Sagrada Família at true scale. When it rains, the terrace goes inside.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { bakeStatic } from '../../airport/src/merge.js';
import { mat, mesh, box, cyl } from '../../airport/src/parts.js';
import { L, onLang } from '../../koto/src/i18n.js';
import { createWorld, v3, LOOKS } from '../../koto/src/world.js';
import { Agent, FACE, yawTo } from '../../koto/src/people.js';
import { sedan, keiCar, taxi, tourBus, CAR_COLORS, KEI_COLORS } from '../../town/src/vehicles.js';
import { streetLight } from '../../town/src/gear.js';
import { streetTree, palm } from '../../town/src/nature.js';
import { CAFE, M, setGlow, shell, cutaway, counter, espressoMachine, grinder, register, pastryCase, menuBoard, wallShelf, windowBar, stool, chair, roundTable, pendant, candle, stringLights, plant, door, awning, bladeSign, aFrame, umbrellaStand } from './furniture.js';
import { cup, laptop, plate, phone, book, sketchbook, Steam } from './things.js';
import { minaStory, holdWeather } from './mina.js';
import { Weather, Rain, Wet, puddles, WindowDrops } from './rain.js';
import { Ambience } from './sound.js';
import { SAGRADA_SCALE, basilica, towers, gloryWorks, nativityFacade, passionFacade, setNight, nightLights } from './sagrada.js';

const VIEWS = {
  terrace: [['テラスから', 'From the terrace'], v3(138.0, 2.0, 7.4), v3(60, 20, 0.5)],
  cafe: [['カフェ', 'Café'], v3(126, 4.2, 18), v3(140, 1.4, 6)],
  pond: [['池', 'Pond'], v3(99, 3.2, 13), v3(40, 9, 1)],
  plaza: [['広場', 'Plaza'], v3(118, 26, 56), v3(70, 0, 0)],
  all: [['全体', 'Overview'], v3(230, 150, 170), v3(50, 25, 0)],
  facade: [['生誕のファサード', 'Nativity façade'], v3(62, 6, 4), v3(26, 24, 0)],
};
const world = createWorld({ views: VIEWS, shadow: 150, target: [60, 0, 0], look: 'day' });
const { scene, camera, life, people, steps } = world;
camera.far = 2200; camera.fov = 45; camera.updateProjectionMatrix(); // (wider here: the terrace and the towers in one view)
world.controls.maxPolarAngle = 1.95; // (allowed to look up at the towers from the ground) world.controls.maxDistance = 900;
const heightAt = () => 0;
const lift = (seat) => seat - 0.26;

// ---------- the ground: panot pavement (the flower tiles of Barcelona), asphalt streets, the plaza ----------
const wet = new Wet();
const panotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#9a958c'; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const cx = k * 32 + 16, cy = r * 32 + 16; x.fillStyle = '#aaa59b'; x.fillRect(cx - 15, cy - 15, 30, 30); x.fillStyle = '#8a857c'; for (let p = 0; p < 4; p++) { const a = (p / 4) * Math.PI * 2; x.beginPath(); x.ellipse(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 5, 3, a, 0, 7); x.fill(); } x.beginPath(); x.arc(cx, cy, 2.5, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const paveM = wet.add(new THREE.MeshStandardMaterial({ map: panotTex, roughness: 0.85 }));
panotTex.repeat.set(110, 90);
world.slab(-120, 160, -110, 110, () => 0, 1, 1, paveM);
const flat = (w, d, x, z, m, y = 0.02) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m); p.position.set(x, y, z); p.receiveShadow = true; scene.add(p); return p; };
const asphalt = wet.add(new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.9 }));
flat(13, 220, 36.5, 0, asphalt); flat(13, 220, -36.5, 0, asphalt); flat(280, 12, 20, 54, asphalt); flat(280, 12, 20, -54, asphalt); // Marina, Sardenya, Mallorca, Provença
for (let z = -46; z <= 46; z += 92) for (let k = 0; k < 7; k++) flat(1.2, 3.5, 31.5 + k * 1.7, z, M(0xeeeae2), 0.03); // zebra crossings over Marina
// the plaza: gravel paths, lawns, the pond with a stone rim
const gravel = wet.add(new THREE.MeshStandardMaterial({ color: 0xcbbfa6, roughness: 1 }));
flat(84, 94, 86, 0, gravel, 0.015);
const lawn = new THREE.MeshStandardMaterial({ color: 0x8fb06a, roughness: 1 });
for (const [w, d, x, z] of [[22, 30, 58, -28], [22, 30, 58, 30], [26, 26, 112, -30], [26, 26, 112, 30], [18, 18, 102, 4]]) flat(w, d, x, z, lawn, 0.025);
const pondShape = new THREE.Shape(); { const N = 40; for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, r = 1 + 0.08 * Math.sin(a * 3) + 0.06 * Math.cos(a * 5); const p = [Math.cos(a) * 17 * r, Math.sin(a) * 10 * r]; i ? pondShape.lineTo(...p) : pondShape.moveTo(...p); } }
const pond = new Reflector(new THREE.ShapeGeometry(pondShape).rotateX(-Math.PI / 2), { textureWidth: 512, textureHeight: 512, color: 0x8faab0 });
pond.position.set(72, 0.06, 2); scene.add(pond);
const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pondShape.getSpacedPoints(60).map((p) => new THREE.Vector3(p.x, 0.15, -p.y)), true), 80, 0.45, 6, true), M(0xb8b2a6, { roughness: 0.9 }));
rim.position.set(72, 0, 2); scene.add(rim);

// ---------- the Sagrada Família across Carrer de la Marina ----------
const sf = new THREE.Group(); sf.scale.setScalar(SAGRADA_SCALE); scene.add(sf);
sf.add(basilica(), towers(), nativityFacade(), passionFacade());
const works = gloryWorks(); sf.add(works); life.push(works);
const flood = nightLights(scene);

// ---------- the plaza's trees, benches, lamps ----------
const outside = new THREE.Group(); scene.add(outside);
const out = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; outside.add(o); return o; };
// plane trees (scaled to Barcelona's big ones) round the edge and through the gardens
for (const [x, z] of [[50, -44], [62, -44], [74, -44], [86, -44], [98, -44], [110, -44], [122, -44], [50, 44], [62, 44], [74, 44], [86, 44], [98, 44], [110, 44], [122, 44], [46, -30], [46, -18], [46, 26], [46, 36], [126, -24], [126, 28], [108, -24], [110, 22], [96, -32], [96, 32], [66, -34], [66, 36], [116, -6]]) { const tr = streetTree({ seed: Math.abs(x * 3 + z) % 9 }); tr.scale.setScalar(2.6); out(tr, x, z, x); }
for (const [x, z, w, d] of [[58, -28, 20, 1.2], [58, 30, 20, 1.2], [112, -30, 1.2, 24], [112, 30, 1.2, 24]]) out(box(w, 1.1, d, M(0x5f8a4a, { roughness: 1 })), x, z, 0, 0.55); // clipped hedges
// the Eixample blocks round about: chamfered corners, balconies, shops below
const blockTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#d9c8aa'; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { x.fillStyle = '#5a4a3a'; x.fillRect(k * 32 + 10, r * 32 + 6, 12, 18); x.fillStyle = '#2a2a2c'; x.fillRect(k * 32 + 6, r * 32 + 22, 20, 2); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const litTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) if ((r * 5 + k * 3) % 4 !== 0) { x.fillStyle = (r + k) % 3 ? '#ffcf8a' : '#ffe6b8'; x.fillRect(k * 32 + 10, r * 32 + 6, 12, 18); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const blockMats = []; // their windows light up at night
function eixample(w, d, h, x, z, tint) {
  const ch = 10, sh = new THREE.Shape([new THREE.Vector2(-w / 2 + ch, -d / 2), new THREE.Vector2(w / 2 - ch, -d / 2), new THREE.Vector2(w / 2, -d / 2 + ch), new THREE.Vector2(w / 2, d / 2 - ch), new THREE.Vector2(w / 2 - ch, d / 2), new THREE.Vector2(-w / 2 + ch, d / 2), new THREE.Vector2(-w / 2, d / 2 - ch), new THREE.Vector2(-w / 2, -d / 2 + ch)]);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
  const t = blockTex.clone(); t.needsUpdate = true; t.repeat.set(w / 6, h / 6);
  const lt = litTex.clone(); lt.needsUpdate = true; lt.repeat.copy(t.repeat);
  const bm = new THREE.MeshStandardMaterial({ map: t, color: tint, roughness: 0.95, emissive: 0xffffff, emissiveMap: lt, emissiveIntensity: 0 }); blockMats.push(bm);
  const m = new THREE.Mesh(geo, bm); m.position.set(x, 0, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
}
for (const [x, z, w, h, tint] of [[86, 86, 80, 21, 0xffffff], [86, -86, 80, 19, 0xf2e6d6], [0, 86, 56, 20, 0xf6ead8], [0, -86, 56, 22, 0xffffff], [-86, 0, 78, 20, 0xf2e6d6], [-86, 86, 78, 18, 0xffffff], [-86, -86, 78, 21, 0xf6ead8]]) eixample(w, x === -86 && z === 0 ? 84 : 46, h, x, z, tint);
for (const [x, z] of [[58, -16], [88, -16], [58, 20], [90, 18], [100, -6]]) out(palm({ height: 9 + (x % 3), lean: 0.3, seed: x % 5 }), x, z);
function bench() { const g = new THREE.Group(); g.add(box(2.2, 0.06, 0.5, M(CAFE.walnut), 0, 0.42, 0)); g.add(box(2.2, 0.4, 0.06, M(CAFE.walnut), 0, 0.68, -0.24)); for (const x of [-0.9, 0.9]) g.add(box(0.08, 0.42, 0.5, M(CAFE.iron), x, 0.21, 0)); return g; }
const BENCHES = [[60, -10, Math.PI / 2], [60, 14, Math.PI / 2], [84, -12, 0], [84, 16, Math.PI]];
for (const [x, z, r] of BENCHES) out(bench(), x, z, r);
for (const [x, z] of [[47, -10], [47, 14], [126, -40], [126, 40]]) out(streetLight({ height: 5, reach: 1.2 }), x, z, x < 60 ? 0 : Math.PI);

// ---------- the café: a corner shop on Carrer de Lepant, its front toward the plaza and the basilica ----------
const cafe = new THREE.Group(); cafe.position.set(145, 0, 8); cafe.rotation.y = -Math.PI / 2; scene.add(cafe); // local +Z = toward the plaza (−X)
const T = 3.4;
const shop = shell({ w: 13, d: 9, h: T, wall: 0xf3ead8, wainscot: 0xc9714a, openings: { front: [[-6.0, -2.2, 'window'], [-1.6, -0.4, 'door'], [0.4, 6.0, 'window']] } });
cafe.add(shop);
const inside = new THREE.Group(); cafe.add(inside);
const at = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; inside.add(o); return o; };
const ctr = at(counter({ len: 5, front: CAFE.walnut, top: CAFE.marble }), 2.6, -2.4);
at(pastryCase({ len: 1.4, items: 'barcelona' }), -0.6, -2.4);
const back = at(counter({ len: 5, depth: 0.55, front: CAFE.white }), 2.3, -4.15);
at(espressoMachine(), 2.4, -4.1, 0, back.userData.top); at(grinder(), 1.3, -4.15, 0, back.userData.top); at(register(), 4.3, -2.25, 0, ctr.userData.top);
at(menuBoard({ title: 'Cafè de la Plaça', lines: ['Cortado ............ 1,90', 'Cafè amb llet ..... 2,20', 'Croissant ......... 1,80', 'Xurros .............. 3,50'] }), 2.4, -4.4, 0, 2.2);
at(wallShelf({ len: 2.2 }), -1.4, -4.4, 0, 1.5);
const bar = at(windowBar({ len: 3.6 }), -4.1, 3.95);
const STOOLS = [-5.4, -4.1, -2.8];
for (const x of STOOLS) at(stool(), x, 3.4);
const INT = [[2.6, 1.5], [4.8, 1.5]];
for (const [x, z] of INT) { at(roundTable(), x, z); at(chair({ kind: 'bistro', color: CAFE.iron }), x - 0.55, z, 0); at(chair({ kind: 'bistro', color: CAFE.iron }), x + 0.55, z, Math.PI); }
for (const x of [-4.1, 2.6, 4.8]) at(pendant({ kind: 'globe', drop: 1.3 }), x, x < 0 ? 3.7 : 1.5, 0, T);
at(plant({ kind: 'monstera' }), 5.8, -4.0); at(umbrellaStand({ n: 2 }), -2.0, 4.0);
const dr = at(door({ color: CAFE.terracotta }), -1.0, 4.45); life.push(dr);
const lamps = [[0, 2.2, 0], [-4.1, 2.0, 3.5]].map(([x, y, z]) => { const l = new THREE.PointLight(0xffc27a, 4, 9, 1.4); l.position.set(x, y, z); cafe.add(l); return l; });
// upstairs: an Eixample block of flats with iron balconies (only from street level, so it never hides the café)
const flats = new THREE.Group(); flats.position.y = T; cafe.add(flats);
{ const w = 13, d = 9, H = 15.6; flats.add(box(w, H, d, M(0xe0cfb4, { roughness: 0.95 }), 0, H / 2, 0)); flats.add(box(w + 0.4, 0.5, d + 0.4, M(0xc9b89c), 0, H + 0.25, 0));
  for (let f = 0; f < 5; f++) for (let k = 0; k < 4; k++) { const x = -4.8 + k * 3.2, y = 1.2 + f * 3.1; flats.add(box(1.2, 2.0, 0.08, M(0x5a4a3a, { roughness: 0.5 }), x, y + 1, d / 2 + 0.05)); flats.add(box(1.8, 0.12, 0.7, M(0xc9b89c), x, y, d / 2 + 0.35)); for (let b = -0.8; b <= 0.81; b += 0.16) flats.add(box(0.03, 0.8, 0.03, M(CAFE.iron), x + b, y + 0.45, d / 2 + 0.68)); flats.add(box(1.8, 0.04, 0.04, M(CAFE.iron), x, y + 0.85, d / 2 + 0.68)); }
  bakeStatic(flats); }
// the terrace: an awning on the café, parasols, rattan chairs at little marble tables, string lights, planters
out(awning({ w: 12, depth: 1.6, a: CAFE.terracotta, b: CAFE.cream }), 140.2, 8, -Math.PI / 2, 3.1);
out(bladeSign({ name: 'Cafè', sub: 'de la Plaça', color: '#b5452b' }), 140.4, 14.8, -Math.PI / 2, 3.4);
out(aFrame({ lines: ['Cortado', '+ croissant', '3,50 €', 'Bon dia!'] }), 138.8, 0.5, -Math.PI / 2 + 0.3);
const TABLES = [];
for (const x of [132.6, 136.0]) for (const z of [-1.5, 3.5, 8.5, 13.5, 18.5]) TABLES.push([x, z]);
for (const [x, z] of TABLES) { out(roundTable({ r: 0.32 }), x, z); out(chair({ kind: 'bistro', color: 0x2a2a2c }), x + 0.55, z, Math.PI); out(chair({ kind: 'bistro', color: 0x2a2a2c }), x, z + 0.55, -Math.PI / 2); }
function cafeParasol() { const g = new THREE.Group(); g.add(cyl(0.04, 0.05, 2.6, M(CAFE.walnut), 0, 1.3, 0, 8)); g.add(mesh(new THREE.ConeGeometry(1.9, 0.5, 8, 1, true), M(0xf3ead8, { side: THREE.DoubleSide, roughness: 0.9 }), 0, 2.55, 0)); g.add(mesh(new THREE.CylinderGeometry(1.92, 1.92, 0.22, 8, 1, true), M(CAFE.terracotta, { side: THREE.DoubleSide }), 0, 2.22, 0)); g.add(cyl(0.2, 0.25, 0.18, M(0x9a958c), 0, 0.09, 0, 10)); return g; }
for (const [x, z] of [[134.3, 1], [134.3, 11], [134.3, 21]]) out(cafeParasol(), x, z);
for (const z of [-4, 6, 16, 23]) out(box(0.08, 3.0, 0.08, M(CAFE.iron)), 130.2, z, 0, 1.5); // the posts for the string lights
outside.add(stringLights([[140, 3.0, -4], [130.2, 2.9, -4], [140, 3.0, 6], [130.2, 2.9, 6], [140, 3.0, 16], [130.2, 2.9, 16], [140, 3.0, 23]], { sag: 0.25, every: 0.6 }));
for (const z of [-5, 24]) out(plant({ kind: 'small', s: 3.2 }), 131, z);
// the other side of Lepant: more flats with shops (to frame the plaza)
for (const z of [-36, -16, 32]) { const g = new THREE.Group(); g.add(box(10, 19, 14, M(z % 2 ? 0xd8c8ac : 0xe6d6bc, { roughness: 0.95 }), 0, 9.5, 0)); for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) g.add(box(0.08, 1.8, 1.1, M(0x5a4a3a), -5.05, 1.4 + f * 3, -4.5 + k * 3)); out(g, 146, z); }
bakeStatic(inside); bakeStatic(outside);

// ---------- things on tables, steam ----------
const steam = new Steam(scene, { max: 200 });
const put = (o, x, z, y, parent = scene) => { o.position.set(x, y, z); parent.add(o); if (o.userData.hot) steam.add(o); return o; };
const TT = 0.59;
const tableThings = TABLES.map(([x, z], i) => [put(cup({ kind: i % 3 ? 'espresso' : 'cappuccino' }), x - 0.08, z + 0.1, TT), put(i % 4 === 1 ? plate({ food: 'croissant' }) : i % 4 === 2 ? phone() : cup({ kind: 'iced' }), x + 0.12, z - 0.12, TT)]);
const lap = put(laptop({ screen: 'sheet' }), TABLES[3][0], TABLES[3][1] - 0.05, TT); lap.rotation.y = Math.PI / 2; // facing its owner
put(book({ color: CAFE.navy }), TABLES[6][0] + 0.05, TABLES[6][1], TT);

// ---------- people ----------
const weather = new Weather({ start: 'clear' });
const sound = new Ambience();
const rainy = () => weather.rain > 0.35, dry = () => weather.rain < 0.12;
let doorT = 0; const ring = () => { doorT = 1.6; sound.bell(); };
const agents = [];
const agent = (role, route, o = {}) => { const a = new Agent(scene, role, route, { heightAt, onStep: (s) => s.call?.(), ...o }); people.push(a); agents.push(a); return a; };
// the café's own coordinates → world (for the indoor seats)
const W = (lx, lz) => { const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2).add(cafe.position); return [v.x, v.z]; };
const DOOR_OUT = [139.2, 9.0], DOOR_IN = W(-1.0, 3.6);
// a terrace customer: out at their table until it rains, then in to a seat inside until it stops, then out again
function terraceSitter(role, [tx, tz], inSeat, inFace, inLift, acts = 'sitSip') {
  const sx = tx + 0.55, sz = tz;
  return agent(role, [
    { jump: [sx, sz] },
    { until: rainy, do: acts, face: FACE.west, lift: lift(0.38) },
    { to: [sx + 1.2, sz] }, { to: DOOR_OUT }, { call: ring }, { to: DOOR_IN }, { to: inSeat },
    { until: dry, do: 'sitSip', face: inFace, lift: inLift },
    { to: DOOR_IN }, { to: DOOR_OUT }, { call: ring }, { to: [sx + 1.2, sz] }, { to: [sx, sz] },
  ], { speed: 1.4, phase: tx + tz });
}
terraceSitter('macWorker', TABLES[3], W(-5.4, 3.4), yawTo(-1, 0), lift(0.69), 'sitType');
terraceSitter('chatA', TABLES[1], W(2.05, 1.5), yawTo(0, 1) + 0, lift(0.4));
terraceSitter('chatB', TABLES[6], W(3.15, 1.5), yawTo(0, -1), lift(0.4));
terraceSitter('reader', TABLES[2], W(-4.1, 3.4), yawTo(-1, 0), lift(0.69), 'sitRead');
terraceSitter('oldman', TABLES[5], W(4.25, 1.5), yawTo(0, 1), lift(0.4));
terraceSitter('regular', TABLES[8], W(-2.8, 3.4), yawTo(-1, 0), lift(0.69), 'sitThink');
// the waiter: between the bar and the tables with a tray
agent('teaStaff', [{ jump: W(2.0, -1.6) }, { do: 'idle', dur: 4, face: FACE.east }, { to: DOOR_IN }, { to: DOOR_OUT }, { to: [135.2, 3.5] }, { do: 'hold', dur: 3, face: FACE.west }, { to: [135.2, 13.5] }, { do: 'hold', dur: 3, face: FACE.west }, { to: DOOR_OUT }, { to: DOOR_IN }, { to: W(2.0, -1.6) }], { speed: 1.1 });
agent('barista', [{ jump: W(2.4, -3.5) }, { do: 'pour', dur: 6, face: yawTo(1, 0) }, { to: W(4.0, -3.2) }, { do: 'idle', dur: 4, face: yawTo(-1, 0) }, { to: W(2.4, -3.5) }]);
// the plaza: tourists photographing the façade across the pond, a dog walker, children by the water, people on benches
const umb = []; // people whose umbrella opens in the rain
for (const [k, role, x, z] of [[0, 'tourist', 90, -4], [1, 'visitor', 91, 6], [2, 'woman', 89, 12], [3, 'senior', 95, 0]]) umb.push(agent(role, [{ jump: [x + 30, z + 40] }, { to: [x, z] }, { do: 'photo', dur: 4, face: yawTo(-1, 0) }, { do: 'look', dur: 5, face: yawTo(-1, -0.02 * z) }, { to: [x + 8, z - 30] }, { to: [x + 34, z - 46] }, { hide: 8 + k * 5 }], { delay: k * 9, speed: 0.95 }));
const dogWalker = agent('rainComer', [{ jump: [125, -40] }, { to: [52, -40] }, { to: [52, 40] }, { to: [125, 40] }, { to: [125, -40] }], { speed: 1.0 });
umb.push(dogWalker);
const kids = ['child', 'swimKid'].map((r, i) => agent(r, [{ jump: [88, -6 + i * 10] }, { to: [80 + i * 3, -9 + i * 20] }, { do: 'look', dur: 2, face: yawTo(-1, 0) }, { to: [89, -4 + i * 8] }], { speed: 1.3, phase: i }));
for (const [x, z, r] of BENCHES.slice(0, 3)) { const a = agent(r === 0 ? 'senior' : 'reader', [{ jump: [x + Math.sin(r) * 0.25, z - Math.cos(r) * 0.25] }, { until: rainy, do: 'sitRead', face: r - Math.PI / 2, lift: lift(0.44) }, { to: [x + 6, z] }, { hide: () => dry() }]); umb.push(a); }
// the dog
const dog = (() => { const g = new THREE.Group(), m = M(0xc9a87c), legs = []; const b = mesh(new THREE.SphereGeometry(0.22, 10, 8), m, 0, 0.4, 0); b.scale.set(1.8, 1, 1); g.add(b); g.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), m, 0.4, 0.58, 0)); g.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), M(0x2a2a2c), 0.56, 0.58, 0)); for (const s of [1, -1]) { const e = mesh(new THREE.SphereGeometry(0.08, 6, 5), M(0x8a6a4a), 0.36, 0.7, s * 0.1); e.scale.set(0.6, 1.4, 0.6); g.add(e); } const tail = mesh(new THREE.CapsuleGeometry(0.03, 0.2, 3, 6), m, -0.42, 0.55, 0); tail.rotation.z = 0.8; g.add(tail); for (const [x, z] of [[0.25, 0.12], [0.25, -0.12], [-0.25, 0.12], [-0.25, -0.12]]) { const l = mesh(new THREE.CapsuleGeometry(0.05, 0.22, 3, 6), m, x, 0.16, z); legs.push(l); g.add(l); } g.userData.update = (t) => { legs.forEach((l, i) => (l.rotation.z = Math.sin(t * 10 + i * Math.PI) * 0.4)); tail.rotation.x = Math.sin(t * 8) * 0.5; }; scene.add(g); return g; })();
// ---------- the story, chapter 3 (DESIGN.md §12): Mina draws the basilica from the terrace, a passing shower sends
// everyone inside, the square shines after the rain, and at night she fills the last page and shows the barista ----------
const [MX, MZ] = TABLES[7], mBook = put(sketchbook({ page: 3 }), MX - 0.02, MZ - 0.05, TT); mBook.rotation.y = -Math.PI / 2; mBook.visible = false;
const atTable = (m, dur, extra = {}) => ({ do: m, dur, face: FACE.west, lift: lift(0.38), ...extra });
const BEHIND = [[MX + 1.8, 1.65, MZ + 0.7], [60, 26, -2]];
minaStory(world, {
  no: 3, heightAt, role: 'minaBare',
  setup: () => { holdWeather(weather, 'clear'); world.setLook('day'); mBook.visible = false; mBook.userData.page(3); },
  route: [
    { jump: [124, 21], say: ['海を渡って、バルセロナ。昼下がりのガウディ広場。', 'Across the sea to Barcelona. Early afternoon on Plaça de Gaudí.'], shot: [[118, 3.2, 30], [80, 30, 0]] },
    { to: [129, 13], shot: { track: [-4, 2.6, 4] } }, { to: [MX + 1.4, MZ] }, { to: [MX + 0.55, MZ] },
    atTable('sitSip', 6, { call: () => (mBook.visible = true), say: ['「コルタードをひとつ」 池の向こうに、サグラダ・ファミリア。', '“A cortado, please.” Across the pond: the Sagrada Família.'], shot: BEHIND }),
    atTable('sitWrite', 10, { say: ['塔を一本ずつ数えながら、鉛筆で描いていく。まだ完成しない聖堂を、まだ途中のスケッチブックに。', 'Counting the towers one by one, she draws in pencil: an unfinished basilica in an unfinished sketchbook.'], shot: [[MX + 1.5, 1.6, MZ + 0.9], [MX - 0.2, 0.6, MZ - 0.2]] }),
    atTable('sitThink', 6, { call: () => holdWeather(weather, 'rain'), say: ['ふいに空が暗くなる。地中海の通り雨だ。', 'All of a sudden the sky darkens. A Mediterranean shower.'], shot: [[124, 4, 22], [136, 1, 6]] }),
    { swap: 'minaWagasa' },
    { to: [MX + 1.4, MZ], call: () => (mBook.visible = false), say: ['借りた赤い和傘をひらいて、テラスの人たちといっしょに店のなかへ。', 'She opens the borrowed red umbrella and hurries inside with everyone from the terrace.'] },
    { to: DOOR_OUT, call: ring }, { to: DOOR_IN },
    { swap: 'minaIn' },
    { to: W(1.5, 3.6) },
    { do: 'idle', dur: 8, face: FACE.west, say: ['窓ガラスを雨が流れる。広場の向こうで、聖堂がかすんでいる。', 'Rain runs down the glass. Across the square, the basilica fades into grey.'], shot: [[144.2, 1.9, 10.6], [120, 4, 5]] },
    { do: 'idle', dur: 7, face: FACE.west, call: () => { holdWeather(weather, 'clear'); world.setLook('dusk'); }, say: ['やがて雨が上がる。石畳がひかって、夕方の空が池に映る。', 'At last the rain stops. The paving shines, and the evening sky lies in the pond.'] },
    { to: DOOR_IN }, { to: DOOR_OUT, call: ring },
    { swap: 'minaBare' },
    { jump: [97, 9] }, { to: [90.5, 5] }, // (a cut: later, by the pond)
    { do: 'look', dur: 8, face: FACE.west, say: ['池のほとりで。水に映った聖堂も、もう一枚。', 'By the pond: one more drawing, of the basilica in the water.'], shot: [[97, 2.6, 12], [40, 10, 0]] },
    { jump: [130.5, 12], call: () => world.setLook('night'), say: ['夜。塔に灯りがともる。', 'Night. Lights come on in the towers.'], shot: [[118, 3.5, 30], [60, 35, 0]] },
    { do: 'look', dur: 4, face: FACE.west },
    { to: [MX + 1.4, MZ] }, { to: [MX + 0.55, MZ] },
    atTable('sitWrite', 9, { call: () => { mBook.userData.page(4); mBook.visible = true; }, say: ['ライトアップされた塔の下で、最後のページに色を置く。', 'Under the floodlit towers, she adds colour to the last page.'], shot: BEHIND }),
    { to: [MX + 1.4, MZ], call: () => (mBook.visible = false) }, { to: DOOR_OUT, call: ring }, { to: DOOR_IN }, { to: W(2.4, -1.7) },
    { do: 'idle', dur: 6, face: FACE.east, say: ['「見て。今日いちにちの、雨の絵」 バリスタが目を細める。「Que bonic!」', '“Look — a whole day of rain, in pictures.” The barista smiles. “Que bonic!”'], shot: [[145.0, 2.1, 7.2], [148.2, 1.2, 11.0]] },
    { do: 'idle', dur: 6, face: FACE.east, say: ['北の町の猫、借りた和傘、雨上がりの聖堂。スケッチブックが、やっと一冊ぶん埋まった。', 'A cat up north, a borrowed paper umbrella, a basilica after the rain. The sketchbook is finally full.'], end: true },
    { do: 'idle', dur: 9999, face: FACE.east },
  ],
});

// cars and the tourist bus along Carrer de la Marina
const cars = [[sedan({ color: CAR_COLORS[1] }), 1, 34], [taxi({ color: 0xf2c94c }), -1, 39], [tourBus({ a: 0xc8283a, b: 0x2c3a57 }), 1, 34], [keiCar({ color: KEI_COLORS[4] }), -1, 39], [sedan({ color: CAR_COLORS[7] }), 1, 34]].map(([c, dir, x], i) => { c.userData.dir = dir; c.userData.z = -100 + i * 44; c.position.x = x; c.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(c); return c; });

// ---------- rain ----------
const rain = new Rain(scene, { zones: [[30, 140.2, -60, 60, 0], [140.2, 152, -60, 1, 0], [140.2, 152, 15, 60, 0]], top: 14, count: 6000, splashes: 220 });
rain.dripLine([140.2, 2.3, 2], [140.2, 2.3, 14], 0, 14);
cafe.updateMatrixWorld(true);
const panes = shop.userData.walls.front.userData.panes.map((p) => { const wg = shop.userData.walls.front, c = new THREE.Vector3((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0); wg.localToWorld(c); return { center: c, normal: new THREE.Vector3(-1, 0, 0), w: p.x1 - p.x0, h: p.y1 - p.y0 }; });
const drops = new WindowDrops(scene, panes);
const pud = puddles(scene, [[110, 2, 2.2, 1.0], [133, 6, 0.8, 0.5], [92, -20, 1.6, 0.8], [36, 10, 1.8, 0.7], [120, 30, 1.2, 0.6]], 0.03);

// ---------- the panel and the loop ----------
const $ = (id) => document.getElementById(id);
const WJA = { clear: ['晴れ', 'clear'], cloudy: ['くもり', 'cloudy'], drizzle: ['小雨', 'drizzle'], rain: ['本降り', 'pouring'], after: ['雨上がり', 'after the rain'] };
for (const b of $('weather').children) b.onclick = () => { weather.hold(b.dataset.v); [...$('weather').children].forEach((x) => x.classList.toggle('on', x === b)); };
let drift = false, driftT = 0, driftI = 0;
const DRIFT = [[[138.0, 2.0, 7.4], [60, 20, 0.5]], [[128, 3.5, 20], [140, 1.2, 8]], [[92, 2.2, 10], [26, 44, 0]], [[124, 2.2, -6], [133, 0.8, 3]], [[140, 2.2, 22], [60, 30, 0]]];
$('drift').onclick = () => { drift = !drift; driftT = 0; $('drift').classList.toggle('on', drift); };
const soundLabel = () => { $('sound').textContent = L(sound.on ? ['音 · ON', 'Sound · ON'] : ['音 · OFF', 'Sound · OFF']); };
$('sound').onclick = () => { $('sound').classList.toggle('on', sound.toggle()); soundLabel(); };
onLang(soundLabel);
const sky = new THREE.Color(), grey = new THREE.Color('#9aa3ad');
let uiT = 0;
steps.push((t, dt) => {
  weather.update(dt);
  const r = weather.rain, look = world.look, LK = LOOKS[look];
  const dim = 1 - 0.5 * weather.cloud;
  world.hemi.intensity = LK.hemi[0] * (0.6 + 0.4 * dim); world.sun.intensity = LK.sun[0] * dim;
  sky.set(LK.sky ?? '#dfe9f2').lerp(grey, look === 'night' ? 0.1 : weather.cloud * 0.5); scene.background.copy(sky);
  const dark = Math.min(1, { morning: 0.2, day: 0, dusk: 0.6, night: 1 }[look] + weather.cloud * 0.3);
  setGlow(dark); const nk = look === 'night' ? 1 : look === 'dusk' ? 0.35 : 0; setNight(nk); flood.update(nk); blockMats.forEach((m) => (m.emissiveIntensity = nk * 0.9)); lamps.forEach((l) => (l.intensity = 3 + dark * 14));
  rain.update(t, dt, r); drops.update(dt, r); wet.update(weather.wet); pud.update(weather.wet);
  steam.update(t, dt); sound.update(dt, r);
  doorT = Math.max(0, doorT - dt); dr.userData.open = doorT > 0 ? 1 : 0;
  for (const a of umb) a.p.userData.umbrella = r > 0.15;
  // things on an empty table are cleared away while it rains
  tableThings.forEach((pair) => pair.forEach((o) => (o.visible = weather.rain < 0.35)));
  // the dog trots beside its walker
  const P = dogWalker.p.position; dog.position.set(P.x + 0.9, 0, P.z + 0.6); dog.rotation.y = dogWalker.p.rotation.y; dog.userData.update(t);
  for (const c of cars) { const ud = c.userData; ud.speed = 6; ud.z += ud.dir * ud.speed * dt; if (ud.z > 115) ud.z = -115; if (ud.z < -115) ud.z = 115; c.position.z = ud.z; c.visible = Math.abs(ud.z) < 108; ud.update(dt); }
  if (drift && ((driftT -= dt) <= 0)) { driftT = 14; const [p, q] = DRIFT[driftI++ % DRIFT.length]; world.cam(v3(...p), v3(...q), 7); }
  cutaway(shop, camera);
  flats.visible = camera.position.y < 9 || camera.position.x < 128;
  pond.visible = camera.position.distanceTo(pond.position) < 260;
  if ((uiT -= dt) <= 0) { uiT = 0.5; $('weatherLine').textContent = L([`いまの天気：${WJA[weather.state][0]}${weather.mode === 'auto' ? '（自動で移り変わります）' : ''}`, `Now: ${WJA[weather.state][1]}${weather.mode === 'auto' ? ' (changes on its own)' : ''}`]); }
});
world.start();
window.__cafe = { weather, rain, steam, shop, sound };

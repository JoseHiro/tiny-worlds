// The boats of Venice (venice/DESIGN.md §1.7): the gondola (long, black, rising at both ends, the silver comb on its
// bow, a red seat) with its gondolier rowing at the stern; a serenade gondola (a singer and an accordion); the
// water bus (white with a yellow band, a cabin full of people); the varnished water taxi; a work boat with crates and a
// little crane; the standing ferry; an ambulance boat; a small motor boat. Each faces +x and floats at y = 0.
// userData.update(t) rocks it and moves its crew; userData.len is its length (for wakes and lanes).
import * as THREE from 'three';
import { kits, group, G, C, hullGeo } from './kit.js';
import { gondolier, singer, accordion, summer, put } from './people.js';

const bob = (g, t, k = 1, ph = 0) => { g.rotation.z = Math.sin(t * 1.3 + ph) * 0.02 * k; g.rotation.x = Math.sin(t * 1.1 + ph * 2) * 0.03 * k; g.position.y = Math.sin(t * 1.7 + ph) * 0.015 * k; };

export function gondola({ crew = true, passengers = 0, serenade = false, ferry = false } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const len = ferry ? 2.8 : 2.5, k = kits('shiny', 'metal', 'velvet', 'gold', 'plain');
  k.shiny.add(hullGeo(len, 0.42, 0.14, { sheer: 0.32, pointy: 0.9 }), C.gondola, 0, -0.05, 0);
  // the comb on the bow (ferro) and a little curl at the stern
  k.metal.box(0.03, 0.28, 0.1, 0xd8dde6, len / 2 - 0.02, 0.36, 0, { r: 0.01, rz: -0.25 });
  for (let i = 0; i < 6; i++) k.metal.box(0.08, 0.018, 0.02, 0xd8dde6, len / 2 + 0.03, 0.27 + i * 0.035, 0, { r: 0.006, rz: -0.25 });
  k.metal.box(0.1, 0.03, 0.08, 0xd8dde6, len / 2 + 0.02, 0.5, 0, { r: 0.01, rz: -0.6 });
  k.shiny.add(G.torus, C.gondola, -len / 2 + 0.02, 0.32, 0, { s: [0.06, 0.06, 0.05], rx: Math.PI / 2 });
  // the forcola (oarlock) by the stern
  k.plain.box(0.05, 0.22, 0.05, 0x6b4a32, -len * 0.3, 0.2, 0.15, { r: 0.015 });
  if (!ferry) { // the seat: a red velvet bench with gold trim, a little cabin-less loveseat
    k.velvet.box(0.36, 0.1, 0.3, 0xa8202c, -0.05, 0.13, 0, { r: 0.04 }); k.velvet.box(0.08, 0.2, 0.32, 0xa8202c, -0.22, 0.2, 0, { r: 0.04 });
    k.gold.box(0.4, 0.02, 0.34, C.gold, -0.05, 0.08, 0, { r: 0.008 });
    k.plain.box(0.6, 0.03, 0.34, 0x4a3a2a, 0.45, 0.07, 0, { r: 0.01 });
  }
  body.add(group(k));
  const crewList = [];
  if (crew) { const p = gondolier(); p.position.set(-len * 0.36, 0.06, 0); p.rotation.y = Math.PI / 2; body.add(p); crewList.push(p); }
  if (serenade) { const s = singer(), a = accordion(); s.position.set(0.15, 0.06, 0.06); a.position.set(-0.15, 0.06, -0.06); s.rotation.y = a.rotation.y = Math.PI / 2; body.add(s, a); crewList.push(s, a); }
  const seat = ferry ? 4 : passengers;
  for (let i = 0; i < seat; i++) { const p = summer({ top: [0x6fb0e0, 0xf08a7a, 0xf2c230, 0x8fd0b0][i % 4], hat: i % 2 ? 'sun' : null, long: i % 2 === 1 }); if (ferry) p.position.set(0.6 - i * 0.35, 0.06, (i % 2 ? 0.05 : -0.05)); else { p.position.set(-0.05 + (i ? 0.02 : 0), 0.12, i ? -0.08 : 0.08); p.scale.setScalar(0.92); for (const h of p.userData.swing) h.rotation.x = -1.4; } p.rotation.y = Math.PI / 2; body.add(p); }
  // music notes over a serenade
  const notes = [];
  if (serenade) for (let i = 0; i < 4; i++) { const n = new THREE.Group(); put(n, G.ball, 0x24345f, 0, 0, 0, [0.04, 0.03, 0.02]); put(n, G.cyl8, 0x24345f, 0.035, 0.07, 0, [0.006, 0.14, 0.006]); n.userData.ph = i / 4; body.add(n); notes.push(n); }
  g.userData = {
    len, kind: 'gondola',
    update(t) {
      bob(body, t, 0.6);
      for (const p of crewList) p.userData.update?.(t);
      for (const n of notes) { const u = (t * 0.3 + n.userData.ph) % 1; n.position.set(0.1 + Math.sin(u * 6 + n.userData.ph * 9) * 0.15, 0.85 + u * 0.9, Math.cos(u * 5) * 0.1); n.scale.setScalar(Math.sin(u * Math.PI) * 1.4 + 0.01); }
    },
  };
  return g;
}

export function vaporetto() { // the water bus
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const k = kits('plain', 'glass', 'shiny', 'metal'), len = 4.0;
  k.shiny.add(hullGeo(len, 1.0, 0.3, { sheer: 0.06, pointy: 0.4 }), 0xf4f4f0, 0, 0, 0);
  k.plain.box(len * 0.94, 0.08, 0.98, 0xf2c230, 0, 0.29, 0, { r: 0.03 }); // the yellow band
  k.plain.box(len * 0.92, 0.04, 1.0, 0x3a3f4f, 0, 0.06, 0, { r: 0.015 }); // the rubbing strake
  k.plain.box(2.2, 0.55, 0.86, 0xf4f4f0, -0.25, 0.6, 0, { r: 0.08 }); // the cabin
  k.glass.box(2.0, 0.26, 0.88, 0x3a4a5f, -0.25, 0.66, 0, { r: 0.04 });
  k.plain.box(2.4, 0.06, 0.96, 0xf4f4f0, -0.25, 0.9, 0, { r: 0.03 });
  k.plain.box(0.5, 0.4, 0.5, 0xf4f4f0, 1.15, 0.55, 0, { r: 0.06 }); k.glass.box(0.42, 0.18, 0.52, 0x3a4a5f, 1.18, 0.62, 0, { r: 0.03 }); // the wheelhouse
  k.plain.box(0.05, 0.25, 0.05, 0xf2c230, 1.15, 0.85, 0, { r: 0.01 });
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) k.metal.add(G.cyl8, 0xb8bec8, -1.35 + i * 0.22, 0.42, s * 0.45, { s: [0.012, 0.22, 0.012] });
  body.add(group(k));
  const ppl = [];
  for (let i = 0; i < 7; i++) { const p = summer({ top: [0x6fb0e0, 0xf08a7a, 0xf2c230, 0x8fd0b0, 0xe8a0c8, 0x3f6fd6, 0xfbfaf6][i], hat: ['sun', null, 'cap', null, 'panama', null, 'sun'][i], hatCol: 0xe8d39a }); p.scale.setScalar(0.85); p.position.set(-1.1 + (i % 4) * 0.42 + (i > 3 ? 0.2 : 0), 0.33, i > 3 ? -0.18 : 0.18); p.rotation.y = i > 3 ? Math.PI * 0.7 : Math.PI * 0.3; body.add(p); ppl.push(p); }
  g.userData = { len, kind: 'vaporetto', people: ppl, update(t) { bob(body, t, 0.5, 1); } };
  return g;
}
export function waterTaxi() { // varnished wood, a white roof, a windscreen, chrome rails
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const k = kits('shiny', 'plain', 'glass', 'metal'), len = 2.4;
  k.shiny.add(hullGeo(len, 0.7, 0.22, { sheer: 0.1, pointy: 1.2 }), C.varnish, 0, 0, 0);
  for (let i = 0; i < 5; i++) k.shiny.box(0.03, 0.01, 0.55, 0xd8a868, 0.85 - i * 0.12, 0.23, 0, { r: 0.004 });
  k.shiny.box(1.05, 0.34, 0.6, C.varnish, -0.3, 0.38, 0, { r: 0.06 });
  k.glass.box(0.95, 0.15, 0.62, 0x3a4a5f, -0.3, 0.42, 0, { r: 0.03 });
  k.plain.box(1.15, 0.05, 0.66, C.white, -0.3, 0.57, 0, { r: 0.02 });
  k.glass.box(0.04, 0.16, 0.56, 0x9fc4d6, 0.3, 0.42, 0, { r: 0.01, rz: -0.4 });
  for (const s of [-1, 1]) k.metal.box(0.8, 0.015, 0.015, 0xdfe4ea, 0.65, 0.3, s * 0.28, { r: 0.005 });
  body.add(group(k));
  const d = summer({ top: 0xfbfaf6, legs: 0x23263a, hat: 'cap', hatCol: 0x24345f }); d.position.set(0.15, 0.2, 0.12); d.rotation.y = Math.PI / 2; body.add(d);
  g.userData = { len, kind: 'taxi', update(t) { bob(body, t, 0.4, 2); body.rotation.z += 0.04; } };
  return g;
}
export function workBoat() { // a little work boat: crates of fruit and gas bottles, a small crane arm
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const k = kits('plain', 'shiny', 'metal'), len = 2.4;
  k.plain.add(hullGeo(len, 0.85, 0.24, { sheer: 0.06, pointy: 0.3 }), 0x4f7a6a, 0, 0, 0);
  k.plain.box(len * 0.9, 0.05, 0.88, 0xe8e2d6, 0, 0.23, 0, { r: 0.02 });
  for (let i = 0; i < 4; i++) { const x = -0.6 + (i % 2) * 0.32, z = i < 2 ? -0.18 : 0.14; k.plain.box(0.28, 0.16, 0.24, 0xc9965a, x, 0.33, z, { r: 0.02 }); for (let j = 0; j < 4; j++) k.plain.ball(0.045, [0xe8483f, 0xf2a23a, 0x7cc94a, 0xf2c230][i], x - 0.07 + (j % 2) * 0.14, 0.43, z - 0.05 + Math.floor(j / 2) * 0.1); }
  for (let i = 0; i < 3; i++) k.shiny.add(G.cap, 0xd8d4cc, 0.05 + i * 0.12, 0.38, -0.2, { s: [0.05, 0.12, 0.05] });
  k.metal.box(0.08, 0.6, 0.08, 0xe8673c, 0.55, 0.53, 0, { r: 0.02 }); k.metal.box(0.7, 0.06, 0.06, 0xe8673c, 0.3, 0.82, 0, { r: 0.02, rz: 0.25 });
  k.metal.add(G.cyl8, 0x3a3f4f, 0.0, 0.62, 0, { s: [0.006, 0.36, 0.006] }); k.plain.box(0.18, 0.12, 0.16, 0xc9965a, 0.0, 0.4, 0, { r: 0.02 });
  body.add(group(k));
  const p = summer({ top: 0x3f6fd6, hat: 'cap', hatCol: 0xe8673c }); p.position.set(0.85, 0.24, 0.2); p.rotation.y = Math.PI; body.add(p);
  p.userData.update = (t) => { p.userData.arms[0].rotation.x = p.userData.arms[1].rotation.x = -1.2 + Math.sin(t * 1.4) * 0.4; };
  g.userData = { len, kind: 'work', update(t) { bob(body, t, 0.7, 3); p.userData.update(t); } };
  return g;
}
export function ambulance() { // white with an orange band and a blue light
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const k = kits('shiny', 'plain', 'glass', 'glow'), len = 2.6;
  k.shiny.add(hullGeo(len, 0.8, 0.24, { sheer: 0.1, pointy: 1.0 }), 0xf4f4f0, 0, 0, 0);
  k.plain.box(len * 0.85, 0.08, 0.8, 0xe8673c, 0, 0.21, 0, { r: 0.03 });
  k.plain.box(1.2, 0.4, 0.66, 0xf4f4f0, -0.25, 0.45, 0, { r: 0.06 }); k.glass.box(1.1, 0.16, 0.68, 0x3a4a5f, -0.25, 0.5, 0, { r: 0.03 });
  k.plain.box(0.5, 0.06, 0.06, 0xe8673c, -0.25, 0.4, 0.34, { r: 0.01 }); k.plain.box(0.06, 0.3, 0.06, 0xe8673c, -0.25, 0.4, 0.34, { r: 0.01 });
  body.add(group(k));
  const lamp = put(body, G.ball, 0x3f8fff, -0.25, 0.7, 0, 0.06, [0, 0, 0], 0.2, { emissive: 0x3f8fff, emissiveIntensity: 2 });
  g.userData = { len, kind: 'ambulance', update(t) { bob(body, t, 0.4, 4); lamp.material.emissiveIntensity = Math.sin(t * 12) > 0 ? 2.5 : 0.2; } };
  return g;
}
export function motorBoat(col = 0x3f8f9a) { // a resident's small boat, tied up and rocking
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const k = kits('plain', 'shiny'), len = 1.6;
  k.shiny.add(hullGeo(len, 0.6, 0.18, { sheer: 0.08, pointy: 0.8 }), col, 0, 0, 0);
  k.plain.box(len * 0.8, 0.03, 0.5, 0xd8c9a8, 0, 0.17, 0, { r: 0.01 }); k.plain.box(0.2, 0.18, 0.18, 0x3a3f4f, -len * 0.42, 0.25, 0, { r: 0.03 });
  k.plain.box(0.3, 0.06, 0.48, 0xd8c9a8, 0.15, 0.25, 0, { r: 0.02 });
  body.add(group(k));
  g.userData = { len, kind: 'motor', update(t) { bob(body, t, 1.2, col % 7); } };
  return g;
}

// Small things passengers have (world/CABIN.md §5.4). Each sits on y = 0 and is a few hundredths of a unit big.
import * as THREE from 'three';
import { PALETTE, CP, M, SCREENS, mat, bx, rb, cy, sp, put, pivot, stateful } from './common.js';

export function blanket({ spread = false, color = 0xe8dcc8 } = {}) {
  const g = new THREE.Group();
  if (spread) { // draped over a lap: two slabs at an angle
    const a = rb(g, 0.4, 0.025, 0.42, 0.01, M.fabric(color), 0, 0.02, 0);
    const b = rb(g, 0.26, 0.025, 0.42, 0.01, M.fabric(color), 0.3, -0.06, 0);
    b.rotation.z = -0.7;
    bx(a, 0.4, 0.01, 0.04, M.fabric(PALETTE.navy), 0, 0.014, 0.15);
  } else {
    rb(g, 0.26, 0.08, 0.34, 0.03, M.fabric(color), 0, 0.04, 0);
    bx(g, 0.262, 0.01, 0.04, M.fabric(PALETTE.navy), 0, 0.06, 0.1);
  }
  return g;
}
export const pillow = () => { const g = new THREE.Group(); rb(g, 0.22, 0.07, 0.32, 0.035, M.white, 0, 0.035, 0); return g; };

export function headphones() {
  const g = new THREE.Group();
  const band = put(g, new THREE.TorusGeometry(0.07, 0.01, 6, 16, Math.PI), M.ink, 0, 0.02, 0);
  band.rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) { const c = cy(g, 0.028, 0.028, 0.02, M.ink, s * 0.07, 0.02, 0, 12); c.rotation.z = Math.PI / 2; }
  return g;
}
export function eyeMask() {
  const g = new THREE.Group();
  rb(g, 0.06, 0.012, 0.14, 0.005, M.fabric(PALETTE.navy), 0, 0.006, 0);
  bx(g, 0.004, 0.006, 0.2, M.ink, -0.02, 0.006, 0);
  return g;
}
// open 0 → 1 lifts the lid; the screen glows
export function laptop() {
  const g = new THREE.Group();
  rb(g, 0.2, 0.012, 0.28, 0.005, M.steel, 0, 0.006, 0);
  bx(g, 0.1, 0.002, 0.24, M.ink, 0.03, 0.013, 0);
  const lid = pivot(g, -0.1, 0.012, 0);
  rb(lid, 0.2, 0.01, 0.28, 0.005, M.steel, 0.1, 0.005, 0);
  bx(lid, 0.17, 0.002, 0.25, SCREENS.menu, 0.1, -0.001, 0);
  stateful(g, { open: 1 }, (s) => { lid.rotation.z = -s.open * 1.85; });
  return g;
}
export function book(color = PALETTE.red) {
  const g = new THREE.Group();
  bx(g, 0.1, 0.024, 0.14, mat(color), 0, 0.012, 0);
  bx(g, 0.095, 0.02, 0.005, M.white, 0.004, 0.012, 0.068);
  return g;
}
export function phone() {
  const g = new THREE.Group();
  rb(g, 0.07, 0.008, 0.035, 0.004, M.ink, 0, 0.004, 0);
  bx(g, 0.062, 0.001, 0.03, SCREENS.map, 0, 0.0085, 0);
  return g;
}
export function bottle() {
  const g = new THREE.Group();
  cy(g, 0.02, 0.02, 0.11, mat(0xbfe0f0, { transparent: true, opacity: 0.6, roughness: 0.1 }), 0, 0.055, 0, 10);
  cy(g, 0.01, 0.01, 0.02, mat(0x2c6fb0), 0, 0.12, 0, 8);
  bx(g, 0.041, 0.03, 0.041, M.white, 0, 0.06, 0);
  return g;
}
export function amenityKit() {
  const g = new THREE.Group();
  rb(g, 0.14, 0.05, 0.08, 0.02, M.leather(CP.gold), 0, 0.025, 0);
  bx(g, 0.12, 0.004, 0.004, M.ink, 0, 0.05, 0);
  return g;
}
export function shoes(color = PALETTE.brown) {
  const g = new THREE.Group();
  for (const z of [-0.04, 0.04]) { rb(g, 0.13, 0.04, 0.05, 0.02, mat(color), 0, 0.02, z); bx(g, 0.13, 0.008, 0.052, M.ink, 0, 0.004, z); }
  return g;
}
export function backpack(color = PALETTE.teal) {
  const g = new THREE.Group();
  rb(g, 0.12, 0.2, 0.18, 0.05, mat(color), 0, 0.1, 0);
  rb(g, 0.04, 0.09, 0.14, 0.02, mat(color), 0.07, 0.07, 0);
  for (const z of [-0.05, 0.05]) bx(g, 0.012, 0.15, 0.025, M.ink, -0.065, 0.11, z);
  return g;
}
export function menuCard() {
  const g = new THREE.Group();
  const card = bx(g, 0.07, 0.1, 0.004, M.white, 0, 0.05, 0);
  card.rotation.x = -0.15;
  bx(card, 0.05, 0.012, 0.005, mat(CP.gold), 0, 0.03, 0);
  return g;
}
// Hana's bear (the airport story: she holds it all the way to Okinawa)
export function bear() {
  const g = new THREE.Group();
  const fur = mat(0xb07a4a, { roughness: 0.95 });
  sp(g, 0.06, fur, 0, 0.06, 0).scale.set(0.9, 1.1, 0.95);
  sp(g, 0.045, fur, 0.01, 0.15, 0);
  for (const s of [-1, 1]) {
    sp(g, 0.018, fur, 0, 0.19, s * 0.035);
    sp(g, 0.02, fur, 0.02, 0.03, s * 0.04);
    sp(g, 0.018, fur, 0.02, 0.09, s * 0.06);
  }
  sp(g, 0.018, mat(0xe8d2b0), 0.045, 0.14, 0);
  for (const s of [-1, 1]) sp(g, 0.006, M.ink, 0.04, 0.165, s * 0.016);
  bx(g, 0.01, 0.015, 0.08, mat(PALETTE.red), 0.03, 0.115, 0); // a ribbon
  return g;
}

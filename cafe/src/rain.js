// Rain and weather (cafe/DESIGN.md §6): a weather that drifts by itself (clear → cloudy → drizzle → downpour →
// drizzle → after the rain) or is held by a button; falling streaks (one draw call, moved in the shader), splashes and
// rings on the ground, drips from an awning, wet ground that darkens and shines, and drops running down the windows.
import * as THREE from 'three';

// ---------- the weather: rain 0…1, clouds 0…1, and how wet the ground is (it lags behind the rain) ----------
const PLAN = [['clear', 40], ['cloudy', 25], ['drizzle', 30], ['rain', 55], ['drizzle', 25], ['after', 35]];
const TARGET = { clear: [0, 0.1], cloudy: [0, 0.6], drizzle: [0.35, 0.8], rain: [1, 1], after: [0, 0.45] };
export class Weather {
  constructor({ start = 'drizzle' } = {}) { this.mode = 'auto'; this.rain = 0.3; this.cloud = 0.7; this.wet = 0.5; this.i = PLAN.findIndex(([k]) => k === start); this.t = 0; }
  hold(mode) { this.mode = mode; } // 'auto' | 'clear' | 'drizzle' | 'rain'
  get state() { return this.mode === 'auto' ? PLAN[this.i][0] : this.mode; }
  update(dt) {
    if (this.mode === 'auto' && (this.t += dt) > PLAN[this.i][1]) { this.t = 0; this.i = (this.i + 1) % PLAN.length; }
    const [r, c] = TARGET[this.state];
    this.rain += (r - this.rain) * Math.min(1, dt * 0.25);
    this.cloud += (c - this.cloud) * Math.min(1, dt * 0.2);
    this.wet += ((this.rain > 0.05 ? Math.min(1, 0.4 + this.rain) : 0) - this.wet) * Math.min(1, dt * (this.rain > 0.05 ? 0.15 : 0.03));
  }
}

// ---------- rain streaks: short lines whose height is (time × speed + phase) mod the fall, worked out in the shader ----------
// zones: [[x0, x1, z0, z1, ground], …] where rain falls (outside, never inside the shop)
export class Rain {
  constructor(scene, { zones, top = 9, count = 3000, splashes = 140 } = {}) {
    this.count = count;
    const pos = new Float32Array(count * 2 * 3), seed = new Float32Array(count * 2), end = new Float32Array(count * 2);
    const area = zones.map(([x0, x1, z0, z1]) => (x1 - x0) * (z1 - z0)), total = area.reduce((a, b) => a + b, 0);
    for (let i = 0; i < count; i++) {
      let r = Math.random() * total, k = 0; while (r > area[k]) r -= area[k++];
      const [x0, x1, z0, z1, gy = 0] = zones[k], x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0), s = Math.random();
      for (const e of [0, 1]) { const j = i * 2 + e; pos[j * 3] = x; pos[j * 3 + 1] = gy; pos[j * 3 + 2] = z; seed[j] = s; end[j] = e; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.u = { uTime: { value: 0 }, uTop: { value: top }, uAmt: { value: 0 }, uColor: { value: new THREE.Color(0xdfe8f0) } };
    this.lines = new THREE.LineSegments(geo, new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false,
      vertexShader: `attribute float aSeed; attribute float aEnd; uniform float uTime, uTop, uAmt; varying float vA;
        void main(){ vec3 p = position; float fall = uTop; float y = fall - mod(uTime * (7.0 + aSeed * 3.0) + aSeed * 97.0, fall);
          p.y += y + aEnd * 0.35; p.x += aEnd * 0.04; vA = step(aSeed, uAmt) * (0.35 + 0.3 * aEnd);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ if (vA <= 0.0) discard; gl_FragColor = vec4(uColor, vA); }',
    }));
    this.lines.frustumCulled = false;
    scene.add(this.lines);
    // splashes: little rings that open and fade where drops land
    this.zones = zones;
    const ring = new THREE.RingGeometry(0.03, 0.05, 12).rotateX(-Math.PI / 2);
    this.rings = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ color: 0xe8f0f4, transparent: true, opacity: 0.45, depthWrite: false }), splashes);
    this.rings.frustumCulled = false;
    this.rl = Array.from({ length: splashes }, () => ({ t: Math.random(), x: 0, y: 0, z: 0 }));
    scene.add(this.rings);
    this.drips = [];
    this.o = new THREE.Object3D();
  }
  // drips along a line (an awning's edge): [x0, y, z0] → [x1, y, z1], landing at ground
  dripLine(a, b, ground = 0, n = 10) {
    const geo = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; p[k * 3] = a[0] + (b[0] - a[0]) * t; p[k * 3 + 1] = a[1]; p[k * 3 + 2] = a[2] + (b[2] - a[2]) * t; }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe8f0f4, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false }));
    pts.frustumCulled = false; this.lines.parent.add(pts);
    this.drips.push({ pts, base: p.slice(), ground, ph: Array.from({ length: n }, () => Math.random()) });
  }
  update(t, dt, amount) {
    this.u.uTime.value = t; this.u.uAmt.value = amount;
    this.lines.visible = amount > 0.01;
    const n = Math.round(this.rl.length * Math.min(1, amount * 1.2));
    for (let i = 0; i < this.rl.length; i++) {
      const r = this.rl[i];
      r.t += dt * 2.2;
      if (r.t >= 1) { r.t = 0; const [x0, x1, z0, z1, gy = 0] = this.zones[i % this.zones.length]; r.x = x0 + Math.random() * (x1 - x0); r.z = z0 + Math.random() * (z1 - z0); r.y = gy + 0.02; }
      const s = i < n ? 0.4 + r.t * 2.2 : 0;
      this.o.position.set(r.x, r.y, r.z); this.o.scale.set(s, 1, s); this.o.updateMatrix(); this.rings.setMatrixAt(i, this.o.matrix);
    }
    this.rings.instanceMatrix.needsUpdate = true;
    this.rings.material.opacity = 0.45 * Math.min(1, amount * 2);
    for (const d of this.drips) {
      const p = d.pts.geometry.attributes.position;
      d.pts.visible = amount > 0.05;
      for (let k = 0; k < d.ph.length; k++) { d.ph[k] = (d.ph[k] + dt * (0.6 + amount)) % 1; const k2 = d.ph[k] ** 2; p.setY(k, d.base[k * 3 + 1] - k2 * (d.base[k * 3 + 1] - d.ground)); }
      p.needsUpdate = true;
    }
  }
}

// ---------- wet ground: materials that darken and turn glossy as the ground gets wet ----------
export class Wet {
  constructor() { this.list = []; }
  add(material) { this.list.push({ m: material, c: material.color.clone(), r: material.roughness }); return material; }
  update(wet) { for (const { m, c, r } of this.list) { m.color.copy(c).multiplyScalar(1 - 0.38 * wet); m.roughness = r - (r - 0.12) * wet; m.metalness = 0.15 * wet; } }
}
// puddles: flat shapes that appear on the ground with the rain, rippled by the splashes above them
export function puddles(scene, list, y = 0.012) {
  const m = new THREE.MeshStandardMaterial({ color: 0x55606a, roughness: 0.04, metalness: 0.35, transparent: true, opacity: 0, depthWrite: false });
  for (const [x, z, rx, rz] of list) {
    const shape = new THREE.Shape(); const N = 18;
    for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, r = 1 + 0.18 * Math.sin(a * 3 + x) + 0.1 * Math.cos(a * 5 + z); const p = [Math.cos(a) * rx * r, Math.sin(a) * rz * r]; i ? shape.lineTo(...p) : shape.moveTo(...p); }
    const p = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), m); p.position.set(x, y, z); p.renderOrder = 1; scene.add(p);
  }
  return { update: (wet) => { m.opacity = Math.max(0, wet - 0.2) * 0.85; } };
}

// ---------- drops on the window: a canvas with beads and the trails they leave as they run down ----------
// panes: [{ center: Vector3, normal: Vector3, w, h }] — a sheet just outside each glass pane, sharing one moving texture
export class WindowDrops {
  constructor(scene, panes) {
    this.c = document.createElement('canvas'); this.c.width = 256; this.c.height = 256;
    this.x = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.wrapS = this.tex.wrapT = THREE.RepeatWrapping;
    this.mat = new THREE.MeshStandardMaterial({ map: this.tex, transparent: true, roughness: 0.1, metalness: 0.2, depthWrite: false, opacity: 1 });
    this.beads = Array.from({ length: 160 }, () => this.bead(true));
    this.runs = Array.from({ length: 14 }, () => this.run());
    this.sheets = panes.map(({ center, normal, w, h }) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
      m.position.copy(center).addScaledVector(normal, 0.03); m.lookAt(m.position.clone().add(normal)); m.renderOrder = 3;
      m.material.map.repeat.set(w / 2, h / 2);
      scene.add(m); return m;
    });
    this.t = 0;
  }
  bead(any) { return { x: Math.random() * 256, y: Math.random() * 256, r: 1 + Math.random() * 2.6, on: any ? Math.random() : 0 }; }
  run() { return { x: Math.random() * 256, y: Math.random() * -256, v: 20 + Math.random() * 40, r: 2 + Math.random() * 2, trail: [] }; }
  update(dt, amount) {
    for (const s of this.sheets) s.visible = amount > 0.02;
    if (amount <= 0.02 || (this.t += dt) < 1 / 15) return;
    const step = this.t; this.t = 0;
    const x = this.x;
    x.clearRect(0, 0, 256, 256);
    // beads appear with the rain and slowly dry
    for (const b of this.beads) { b.on = Math.max(0, Math.min(1, b.on + (Math.random() < amount * 0.05 ? 0.6 : -step * 0.04))); if (b.on <= 0 && Math.random() < 0.01) Object.assign(b, this.bead(false)); }
    x.fillStyle = 'rgba(235,245,250,0.55)';
    for (const b of this.beads) if (b.on > 0) { x.globalAlpha = b.on; x.beginPath(); x.arc(b.x, b.y, b.r, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    // drops running down, leaving a thin trail
    for (const r of this.runs) {
      if (r.y > 290) Object.assign(r, this.run());
      r.y += r.v * step * (0.4 + amount); r.x += Math.sin(r.y * 0.07) * 0.4;
      r.trail.push([r.x, r.y]); if (r.trail.length > 40) r.trail.shift();
      if (r.y < 0) continue;
      x.strokeStyle = 'rgba(230,240,245,0.35)'; x.lineWidth = 1.2; x.beginPath(); r.trail.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
      x.fillStyle = 'rgba(240,248,252,0.8)'; x.beginPath(); x.ellipse(r.x, r.y, r.r, r.r * 1.3, 0, 0, 7); x.fill();
    }
    this.mat.opacity = Math.min(1, amount * 1.4);
    this.tex.needsUpdate = true;
  }
}

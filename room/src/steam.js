// Steam off a mug (room/DESIGN.md §2.1): many faint, soft puffs that rise, widen, lean with a slow draught and fade,
// so they overlap into a wisp instead of reading as dots (the café's Steam is made for cups seen from across a room).
import * as THREE from 'three';

const puff = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();

export class MugSteam {
  constructor(scene, cup, { n = 46, rise = 0.17 } = {}) {
    this.cup = cup; this.n = n; this.rise = rise; this.on = 1;
    this.pos = new Float32Array(n * 3); this.life = new Float32Array(n); this.seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.life[i] = i / n; this.seed[i] = Math.random() * 6.28; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: puff }, uScale: { value: 800 }, uOn: { value: 1 } }, transparent: true, depthWrite: false,
      vertexShader: 'attribute float aLife; varying float vL; uniform float uScale; void main(){ vL = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uScale * (0.012 + 0.05 * aLife) / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D uTex; uniform float uOn; varying float vL; void main(){ float a = texture2D(uTex, gl_PointCoord).r * 0.16 * uOn * smoothstep(0.0, 0.12, vL) * (1.0 - smoothstep(0.45, 1.0, vL)); gl_FragColor = vec4(1.0, 0.97, 0.93, a); }',
    });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 3;
    scene.add(this.points);
    this.at = new THREE.Vector3();
  }
  update(t, dt) {
    this.at.set(...(this.cup.userData.steamAt ?? [0, 0.07, 0])); this.cup.localToWorld(this.at);
    const { pos, life, seed, at } = this, lean = Math.sin(t * 0.21) * 0.025; // (a slow draught)
    for (let i = 0; i < this.n; i++) {
      let L = life[i] + dt * 0.32; if (L >= 1) L -= 1; life[i] = L;
      const s = seed[i], curl = Math.sin(t * 1.7 + s + L * 5) * 0.012 * (0.3 + L);
      pos[i * 3] = at.x + curl + lean * L * L + Math.cos(s) * 0.006;
      pos[i * 3 + 1] = at.y + L * this.rise;
      pos[i * 3 + 2] = at.z + Math.cos(t * 1.3 + s * 2 + L * 4) * 0.01 * (0.3 + L) + Math.sin(s) * 0.006;
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.aLife.needsUpdate = true;
  }
}

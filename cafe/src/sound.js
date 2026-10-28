// The café's sound, made in the browser (no files; cafe/DESIGN.md §7): rain (filtered noise that swells with the
// weather, with a few heavier drops), a soft murmur of voices, now and then a cup set on a saucer, the espresso
// machine's steam, the door's bell. Starts silent; on() is called from a click (browsers need a gesture).
export class Ambience {
  constructor() { this.ctx = null; this.on = false; this.next = { cup: 3, steam: 9, drop: 0 }; }
  start() {
    const C = (this.ctx ??= new (window.AudioContext || window.webkitAudioContext)());
    if (this.master) { C.resume(); return; }
    this.master = C.createGain(); this.master.gain.value = 0; this.master.connect(C.destination);
    const noise = (kind = 'pink') => { // a looping noise buffer
      const n = C.sampleRate * 3, b = C.createBuffer(1, n, C.sampleRate), d = b.getChannelData(0);
      let l = 0, b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; } else { b0 = 0.997 * b0 + 0.029591 * w; b1 = 0.985 * b1 + 0.032534 * w; b2 = 0.95 * b2 + 0.048056 * w; d[i] = (b0 + b1 + b2 + w * 0.1) * 0.6; } }
      const s = C.createBufferSource(); s.buffer = b; s.loop = true; return s;
    };
    // rain: pink noise through a soft band, plus a low rumble
    this.rainGain = C.createGain(); this.rainGain.gain.value = 0; this.rainGain.connect(this.master);
    const r = noise('pink'), bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.4; r.connect(bp).connect(this.rainGain); r.start();
    const r2 = noise('brown'), lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; const g2 = C.createGain(); g2.gain.value = 0.5; r2.connect(lp).connect(g2).connect(this.rainGain); r2.start();
    // the murmur: low voices, slowly rising and falling
    this.talk = C.createGain(); this.talk.gain.value = 0.05; this.talk.connect(this.master);
    const v = noise('brown'), vf = C.createBiquadFilter(); vf.type = 'bandpass'; vf.frequency.value = 420; vf.Q.value = 1.6; v.connect(vf).connect(this.talk); v.start();
    const lfo = C.createOscillator(), lg = C.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.025; lfo.connect(lg).connect(this.talk.gain); lfo.start();
    this.noiseBuf = noise('pink').buffer;
  }
  toggle() { this.on = !this.on; if (this.on) this.start(); if (this.master) this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ctx.currentTime, 0.4); return this.on; }
  ping(freq = 2600, dur = 0.5, vol = 0.05) { // a cup on a saucer, a spoon
    const C = this.ctx, o = C.createOscillator(), g = C.createGain(), o2 = C.createOscillator();
    o.frequency.value = freq; o2.frequency.value = freq * 2.76; o.type = o2.type = 'sine';
    g.gain.setValueAtTime(vol, C.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, C.currentTime + dur);
    o.connect(g); o2.connect(g); g.connect(this.master); o.start(); o2.start(); o.stop(C.currentTime + dur); o2.stop(C.currentTime + dur);
  }
  hiss(dur = 2.2) { // the steam wand
    const C = this.ctx, s = C.createBufferSource(), f = C.createBiquadFilter(), g = C.createGain();
    s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = 3500; g.gain.setValueAtTime(0, C.currentTime); g.gain.linearRampToValueAtTime(0.05, C.currentTime + 0.2); g.gain.linearRampToValueAtTime(0, C.currentTime + dur);
    s.connect(f).connect(g).connect(this.master); s.start(); s.stop(C.currentTime + dur);
  }
  bell() { [2200, 2950].forEach((f, i) => setTimeout(() => this.on && this.ping(f, 1.2, 0.04), i * 90)); }
  drop() { this.ping(700 + Math.random() * 500, 0.08, 0.02); } // a heavy drop on the awning
  update(dt, rain) {
    if (!this.on || !this.master) return;
    this.rainGain.gain.setTargetAtTime(rain * 0.35, this.ctx.currentTime, 0.8);
    if ((this.next.cup -= dt) < 0) { this.next.cup = 4 + Math.random() * 9; this.ping(2400 + Math.random() * 900, 0.6, 0.035); }
    if ((this.next.steam -= dt) < 0) { this.next.steam = 18 + Math.random() * 20; this.hiss(); }
    if (rain > 0.2 && (this.next.drop -= dt) < 0) { this.next.drop = 0.05 + Math.random() * (0.6 - rain * 0.4); this.drop(); }
  }
}

// The screens (room/DESIGN.md §4.1): one canvas for all three — the main monitor (an editor with the code being typed
// and a terminal under it), the tall monitor on its side (docs, a chat), the laptop (logs scrolling). It is drawn
// again only when something changes (a character typed, a line of log), not every frame.
import * as THREE from 'three';

export const ATLAS = { w: 2048, h: 1024, main: [0, 0, 1280, 720], tall: [1300, 0, 405, 720], laptop: [0, 724, 480, 300] };
const MONO = '"SF Mono", Menlo, Consolas, monospace', SANS = '"Inter", "Helvetica Neue", sans-serif';
const C = { bg: '#1e2230', side: '#191c28', bar: '#151823', line: '#2a2f42', text: '#c8cde0', dim: '#676e95', kw: '#c792ea', str: '#c3e88d', fn: '#82aaff', num: '#f78c6c', type: '#ffcb6b', red: '#ff5370', green: '#addb67', cur: '#ffcc00' };

// the code being written (it is typed out, then the tests run, then it starts the next function)
const CODE = `import { readFile } from 'node:fs/promises';
import { parse } from './parse.js';

// merge the night's readings into one log, oldest first
export async function mergeLogs(paths, { since = 0 } = {}) {
  const all = [];
  for (const p of paths) {
    const text = await readFile(p, 'utf8');
    for (const row of parse(text)) {
      if (row.t < since) continue;
      all.push({ ...row, from: p });
    }
  }
  all.sort((a, b) => a.t - b.t);
  return dedupe(all);
}

function dedupe(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const key = \`\${r.t}:\${r.id}\`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
`;
const KW = new Set(['import', 'from', 'export', 'async', 'function', 'const', 'let', 'for', 'of', 'await', 'if', 'continue', 'return', 'new', 'true', 'false']);
// colour one line: [[text, colour], …]
function tokens(line) {
  const out = []; let i = 0;
  const ci = line.indexOf('//');
  const body = ci >= 0 ? line.slice(0, ci) : line;
  const re = /(\s+)|('[^']*'?|`[^`]*`?)|(\d+)|([A-Za-z_$][\w$]*)|(.)/g; let m;
  while ((m = re.exec(body))) {
    const [s, ws, str, num, id] = m;
    let col = C.text;
    if (ws) col = C.text; else if (str) col = C.str; else if (num) col = C.num;
    else if (id) col = KW.has(id) ? C.kw : body[re.lastIndex] === '(' ? C.fn : /^[A-Z]/.test(id) ? C.type : C.text;
    else if ('{}()[]'.includes(s)) col = C.dim;
    out.push([s, col]); i += s.length;
  }
  if (ci >= 0) out.push([line.slice(ci), C.dim]);
  return out;
}

const DOCS = ['Array.prototype.sort()', '', 'The sort() method sorts the elements', 'of an array in place and returns the', 'reference to the same array, now', 'sorted.', '', 'Syntax', '  sort()', '  sort(compareFn)', '', 'compareFn(a, b)', '  > 0   sort a after b', '  < 0   sort a before b', '  === 0 keep original order', '', 'Set', '', 'The Set object lets you store unique', 'values of any type.'];
const LOGS = ['GET /api/readings 200 12ms', 'GET /api/readings?since=1730 200 9ms', 'worker: merged 1,204 rows', 'GET /health 200 1ms', 'watch: src/merge.js changed', 'rebuild 182ms', 'GET /api/readings 200 14ms', 'cache: hit 96%', 'worker: idle'];

export class Screens {
  constructor() {
    const c = document.createElement('canvas'); c.width = ATLAS.w; c.height = ATLAS.h;
    this.g = c.getContext('2d');
    this.tex = new THREE.CanvasTexture(c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.material = new THREE.MeshBasicMaterial({ map: this.tex, color: 0xc4c8d6, toneMapped: false }); // (not tone-mapped, so the colours stay; a little under white so it glows without blowing out)
    this.typed = CODE.indexOf('export'); this.wait = 1.2; /* (the night is already under way: the first lines are written) */ this.phase = 'type'; this.test = null; this.log = LOGS.slice(0, 4); this.logT = 0; this.blink = 0;
    this.onKey = null; // called on every key pressed (the keyboard pushes a key down)
    this.auto = true; // false while the story runs: no tests of its own, the code just goes on being typed
    this.extra = ''; this.on = true; // (keys walked on by the cat, shown at the cursor; the power)
    this.draw();
  }
  // a w × h plane showing one region of the atlas
  plane(region, w, h) {
    const [x, y, rw, rh] = ATLAS[region];
    const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * rw) / ATLAS.w, 1 - (y + (1 - uv.getY(i)) * rh) / ATLAS.h);
    const m = new THREE.Mesh(geo, this.material); m.userData.keep = true;
    return m;
  }
  update(dt) {
    let dirty = false;
    this.blink += dt; if (this.blink > 0.5) { this.blink = 0; this.cursor = !this.cursor; dirty = true; }
    this.logT += dt; if (this.logT > 1.6) { this.logT = 0; this.log.push(LOGS[(Math.random() * LOGS.length) | 0]); if (this.log.length > 9) this.log.shift(); dirty = true; }
    if (!this.paused || this.phase !== 'type') this.wait -= dt; // (no typing while the hands are off the keys)
    if (this.wait <= 0) {
      if (this.phase === 'type') {
        const ch = CODE[this.typed++]; this.onKey?.(ch);
        this.wait = ch === '\n' ? 0.3 + Math.random() * 0.4 : ' (){}'.includes(ch) ? 0.08 : 0.025 + Math.random() * 0.06; // (about 15 a second, a breath at each line)
        if (Math.random() < 0.015) this.wait += 1.2; // (stops to think)
        if (this.typed >= CODE.length) { if (this.auto) { this.phase = 'test'; this.wait = 1.0; this.test = 'run'; } else this.typed = CODE.indexOf('export'); }
        dirty = true;
      } else if (this.phase === 'test') {
        this.test = this.test === 'run' ? 'pass' : null; this.wait = this.test ? 4 : 2;
        if (!this.test) { this.phase = 'type'; this.typed = 0; }
        dirty = true;
      }
    }
    if (dirty) this.draw();
  }
  // (for the story) the test result shown in the terminal: null, 'run', 'fail' or 'pass'
  setTest(v) { this.test = v; this.draw(); }
  key(ch) { this.extra += ch; this.onKey?.(ch); this.draw(); }
  power(on) { this.on = on; this.material.color.set(on ? 0xc4c8d6 : 0x000000); this.draw(); }
  draw() {
    const g = this.g;
    g.fillStyle = '#000'; g.fillRect(0, 0, ATLAS.w, ATLAS.h);
    if (!this.on) { this.tex.needsUpdate = true; return; }
    this.drawMain(...ATLAS.main); this.drawTall(...ATLAS.tall); this.drawLaptop(...ATLAS.laptop);
    this.tex.needsUpdate = true;
  }
  drawMain(X, Y, W, H) {
    const g = this.g; g.save(); g.translate(X, Y);
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    // the side bar: files
    g.fillStyle = C.side; g.fillRect(0, 0, 210, H);
    g.font = `600 15px ${SANS}`; g.fillStyle = C.dim; g.fillText('EXPLORER', 18, 34);
    ['▾ night-logs', '  ▾ src', '     merge.js', '     parse.js', '     server.js', '  ▾ test', '     merge.test.js', '  package.json', '  README.md'].forEach((f, i) => {
      if (i === 2) { g.fillStyle = '#2a3048'; g.fillRect(0, 52 + i * 28, 210, 28); }
      g.font = `400 16px ${SANS}`; g.fillStyle = i === 2 ? '#fff' : C.text; g.fillText(f, 16, 72 + i * 28);
    });
    // tabs
    g.fillStyle = C.bar; g.fillRect(210, 0, W - 210, 40);
    g.fillStyle = C.bg; g.fillRect(210, 0, 150, 40); g.font = `500 16px ${SANS}`; g.fillStyle = '#fff'; g.fillText('merge.js', 232, 26);
    g.fillStyle = C.dim; g.fillText('parse.js', 384, 26);
    // the code
    const lines = (CODE.slice(0, this.typed) + this.extra).split('\n'), top = 70, lh = 22, first = Math.max(0, lines.length - 19);
    g.font = `400 17px ${MONO}`;
    for (let i = first; i < lines.length; i++) {
      const y = top + (i - first) * lh;
      g.fillStyle = C.dim; g.textAlign = 'right'; g.fillText(String(i + 1), 262, y); g.textAlign = 'left';
      let x = 286;
      for (const [s, col] of tokens(lines[i])) { g.fillStyle = col; g.fillText(s, x, y); x += g.measureText(s).width; }
      if (i === lines.length - 1 && this.cursor !== false) { g.fillStyle = C.cur; g.fillRect(x + 1, y - 16, 2.5, 21); }
    }
    // the terminal under it
    const ty = H - 200; g.fillStyle = C.bar; g.fillRect(210, ty, W - 210, 200); g.fillStyle = C.line; g.fillRect(210, ty, W - 210, 2);
    g.font = `600 14px ${SANS}`; g.fillStyle = C.text; g.fillText('TERMINAL', 232, ty + 26); g.fillStyle = C.dim; g.fillText('PROBLEMS   OUTPUT', 330, ty + 26);
    g.font = `400 16px ${MONO}`;
    const t = [['~/night-logs $ npm test', C.text]];
    if (this.test === 'run') t.push(['  running 6 tests…', C.dim]);
    if (this.test === 'fail') t.push(['  ✓ merges in time order', C.green], ['  ✗ dedupes by time and id', C.red], ['      expected 3 rows, received 4', C.red], [' Tests  1 failed | 5 passed (6)', C.red]);
    if (this.test === 'pass') t.push(['  ✓ merges in time order', C.green], ['  ✓ drops readings before since', C.green], ['  ✓ dedupes by time and id', C.green], [' Tests  6 passed (6)   312ms', C.green]);
    t.forEach(([s, col], i) => { g.fillStyle = col; g.fillText(s, 232, ty + 58 + i * 24); });
    // the status bar
    g.fillStyle = '#7c4dff'; g.fillRect(0, H - 24, W, 24); g.font = `500 14px ${SANS}`; g.fillStyle = '#fff'; g.fillText('⎇ main   ✓ 0  ⚠ 0', 14, H - 7); g.fillText('Ln ' + (CODE.slice(0, this.typed).split('\n').length) + '   UTF-8   JavaScript', W - 260, H - 7);
    g.restore();
  }
  drawTall(X, Y, W, H) {
    const g = this.g; g.save(); g.translate(X, Y);
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H * 0.62);
    g.fillStyle = '#e4dfd4'; g.fillRect(0, 0, W, 34); g.fillStyle = '#fff'; g.fillRect(12, 8, W - 24, 18);
    g.font = `400 12px ${SANS}`; g.fillStyle = '#777'; g.fillText('developer.mozilla.org/…/sort', 20, 21);
    DOCS.forEach((s, i) => { g.font = i === 0 ? `700 22px ${SANS}` : s.startsWith(' ') ? `400 14px ${MONO}` : i === 7 || i === 16 ? `700 17px ${SANS}` : `400 14px ${SANS}`; g.fillStyle = i === 0 ? '#1b1b1b' : '#333'; g.fillText(s, 16, 66 + i * 21); });
    // a chat under it
    const cy = H * 0.62; g.fillStyle = '#1a1d21'; g.fillRect(0, cy, W, H - cy);
    g.font = `700 14px ${SANS}`; g.fillStyle = '#fff'; g.fillText('# night-shift', 14, cy + 26);
    [['ken', 'deploy is green 🎉', '#e8673c'], ['aya', 'anyone still up?', '#9fd6c2'], ['you', 'yes, fixing the merge', '#82aaff']].forEach(([who, s, col], i) => {
      const y = cy + 62 + i * 52; g.fillStyle = col; g.fillRect(14, y - 14, 26, 26); g.font = `700 13px ${SANS}`; g.fillStyle = '#fff'; g.fillText(who, 50, y - 2); g.font = `400 13px ${SANS}`; g.fillStyle = '#c9ccd1'; g.fillText(s, 50, y + 16);
    });
    g.restore();
  }
  drawLaptop(X, Y, W, H) {
    const g = this.g; g.save(); g.translate(X, Y);
    g.fillStyle = '#0d1014'; g.fillRect(0, 0, W, H);
    g.font = `400 15px ${MONO}`;
    this.log.forEach((s, i) => { g.fillStyle = s.includes('changed') || s.includes('rebuild') ? C.type : s.includes('worker') ? C.fn : '#9ad89a'; g.fillText(s, 12, 26 + i * 30); });
    g.restore();
  }
}

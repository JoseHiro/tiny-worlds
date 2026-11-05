// Station names (rails/DESIGN.md §5): every name board on every platform and every floating name over a station come
// from one canvas (an atlas), so they share one texture and one material. The boards are like JR East's — hiragana,
// big kanji, rōmaji, the station number, and the neighbours on a band of the line colour — and stay bilingual, as the
// real ones are; the floating names follow the language switch.
import * as THREE from 'three';
import { L, onLang } from '../../koto/src/i18n.js';
import { STATIONS, LINES } from './geo.js';

const CW = 384, CH = 96, COLS = 5;
const LEG = new THREE.MeshStandardMaterial({ color: 0x7d838c, roughness: 0.5, metalness: 0.3 }), LEG_GEO = new THREE.BoxGeometry(0.003, 0.045, 0.003);
const hex = (c) => '#' + new THREE.Color(c).getHexString();

export class Signs {
  constructor(rows = 18) {
    this.canvas = document.createElement('canvas'); this.canvas.width = CW * COLS; this.canvas.height = CH * rows;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.boardMat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.5 });
    this.float = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, toneMapped: false });
    this.cells = []; this.labels = [];
    onLang(() => this.draw());
  }
  cell(paint) { const i = this.cells.length; this.cells.push(paint); return i; }
  uv(geo, i) { // fit a plane's uvs to cell i
    const u0 = (i % COLS) / COLS, v0 = 1 - (Math.floor(i / COLS) + 1) * CH / this.canvas.height, uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / COLS, v0 + uv.getY(k) * CH / this.canvas.height);
    return geo;
  }
  draw() { const g = this.canvas.getContext('2d'); g.clearRect(0, 0, this.canvas.width, this.canvas.height); this.cells.forEach((paint, i) => { g.save(); g.translate((i % COLS) * CW, Math.floor(i / COLS) * CH); paint(g); g.restore(); }); this.tex.needsUpdate = true; }

  // a platform name board for `key` on `line`, with its neighbours (either may be null) and number; stands on two legs
  board(line, key, prev, next, num) {
    const [kanji, kana, en] = STATIONS[key], col = hex(LINES[line].color), code = LINES[line].code;
    const i = this.cell((g) => {
      g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, CW, CH);
      g.fillStyle = col; g.fillRect(0, CH - 22, CW, 22);
      g.fillStyle = '#1d2128'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = '500 13px "Hiragino Sans", sans-serif'; g.fillText(kana, CW / 2, 17);
      g.font = `700 ${kanji.length > 4 ? 30 : 40}px "Hiragino Sans", "Noto Sans JP", sans-serif`; g.fillText(kanji, CW / 2, 52);
      g.font = '500 13px Inter, sans-serif'; g.fillText(en, CW / 2, 68);
      g.lineWidth = 3; g.strokeStyle = col; g.strokeRect(14, 22, 44, 32); g.font = '700 12px Inter, sans-serif'; g.fillText(code, 36, 36); g.font = '700 15px Inter, sans-serif'; g.fillText(String(num).padStart(2, '0'), 36, 51);
      g.fillStyle = line === 'sobu' ? '#1d2128' : '#fff'; g.font = '600 12px "Hiragino Sans", sans-serif';
      if (prev) { g.textAlign = 'left'; g.fillText('◀ ' + STATIONS[prev][0] + '  ' + STATIONS[prev][2], 8, CH - 6); }
      if (next) { g.textAlign = 'right'; g.fillText(STATIONS[next][0] + '  ' + STATIONS[next][2] + ' ▶', CW - 8, CH - 6); }
    });
    const g = new THREE.Group(), w = 0.076, h = w * CH / CW;
    for (const r of [0, Math.PI]) { const m = new THREE.Mesh(this.uv(new THREE.PlaneGeometry(w, h), i), this.boardMat); m.rotation.y = r; m.position.y = 0.045; g.add(m); }
    for (const s of [-1, 1]) { const l = new THREE.Mesh(LEG_GEO, LEG); l.position.set(s * w * 0.42, 0.0225, 0); g.add(l); }
    return g;
  }

  // a floating name over a station: kanji or English, with a dot for each line that calls there
  label(key, lines) {
    const i = this.cell((g) => {
      const name = L([STATIONS[key][0], STATIONS[key][2]]);
      g.font = `700 ${L([44, 38])}px "Hiragino Sans", Inter, sans-serif`;
      const tw = Math.min(CW - 20, g.measureText(name).width + 34 + lines.length * 22), x0 = (CW - tw) / 2;
      g.fillStyle = 'rgba(255,255,255,0.94)'; g.beginPath(); g.roundRect(x0, 14, tw, CH - 28, (CH - 28) / 2); g.fill();
      lines.forEach((ln, k) => { g.fillStyle = hex(LINES[ln].color); g.beginPath(); g.arc(x0 + 24 + k * 22, CH / 2, 8, 0, 7); g.fill(); });
      g.fillStyle = '#1d2128'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(name, x0 + 12 + lines.length * 22 + 6, CH / 2 + 2, tw - 30 - lines.length * 22);
    });
    const m = new THREE.Mesh(this.uv(new THREE.PlaneGeometry(1, CH / CW), i), this.float);
    m.renderOrder = 10; m.castShadow = false; this.labels.push(m);
    return m;
  }
  // keep the floating names facing the camera, about the same size on screen, and out of the way up close
  face(camera) {
    for (const m of this.labels) {
      const d = camera.position.distanceTo(m.position);
      m.visible = d > 1.6; m.quaternion.copy(camera.quaternion); m.scale.setScalar(Math.min(1.6, Math.max(0.15, d * 0.075)));
    }
  }
}

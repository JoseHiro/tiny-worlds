# A 9:16 cover for a Tiny Worlds film, laid out by film/COVER.md: every number (positions, sizes, the wash) is read from
# the ```cover block there, so every cover has its words in the same place at the same size.
#   python3 film/cover.py film/out/snowfest-coverframe 0 "Sapporo" film/out/snowfest-cover.jpg [r,g,b tint]
import os, re, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SPEC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'COVER.md')

def spec():
    text = open(SPEC, encoding='utf-8').read()
    block = re.search(r'```cover\n(.*?)```', text, re.S).group(1)
    out = {}
    for line in block.splitlines():
        if '=' not in line: continue
        k, v = (s.strip() for s in line.split('=', 1))
        if ',' in v and not v.startswith('/'): out[k] = tuple(int(x) for x in v.split(','))
        else:
            try: out[k] = float(v) if '.' in v and not v.startswith('/') else int(v)
            except ValueError: out[k] = v
    return out

def lines(g, place, font, room):
    # one line at the fixed size if it fits; otherwise two, broken at the space nearest the middle (never shrunk)
    if g.textlength(place, font=font) <= room or ' ' not in place: return [place]
    spaces = [i for i, c in enumerate(place) if c == ' ']
    i = min(spaces, key=lambda i: abs(i - len(place) / 2))
    return [place[:i], place[i + 1:]]

def cover(frames, frame, place, out, tint=(4, 30, 60)):
    S = spec()
    face = lambda size: ImageFont.truetype(S['font'], size, index=S['font_index'])
    im = Image.open(f'{frames}/{frame:05d}.jpg').convert('RGB')
    if im.size != (S['width'], S['height']): im = im.resize((S['width'], S['height']), Image.LANCZOS)
    W, H = im.size
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(layer)
    white = (255, 255, 255, 255)

    # (text drawn so its letters' top sits on the line given: Pillow's y is the top of the em box, not of the ink)
    def put(text, font, top, x=None):
        l, t, r, b = g.textbbox((0, 0), text, font=font)
        x = (W - (r - l)) / 2 - l if x is None else x - l
        g.text((x, top - t), text, font=font, fill=white)
        return r - l

    # ● Claude
    f1 = face(S['claude_size']); w1 = g.textlength('Claude', font=f1)
    d, gap = S['dot_size'], S['dot_gap']
    x0 = (W - (d + gap + w1)) / 2
    l, t, r, b = g.textbbox((0, 0), 'Claude', font=f1)
    put('Claude', f1, S['claude_top'], x0 + d + gap + l)
    cy = S['claude_top'] + (b - t) * 0.55
    g.ellipse([x0, cy - d / 2, x0 + d, cy + d / 2], fill=(*S['dot_color'], 255))
    # the hairline
    rw, rh = S['rule_width'], S['rule_height']
    g.rectangle([(W - rw) / 2, S['rule_top'], (W + rw) / 2, S['rule_top'] + rh], fill=(255, 255, 255, int(255 * S['rule_alpha'])))
    # the place: fixed size, one line or two
    f2 = face(S['place_size'])
    rows = lines(g, place, f2, W - 2 * S['margin'])
    cap = g.textbbox((0, 0), 'H', font=f2)[1] # (every row hangs from the same cap line, whatever its letters)
    for i, row in enumerate(rows):
        l, t, r, b = g.textbbox((0, 0), row, font=f2)
        g.text(((W - (r - l)) / 2 - l, S['place_top'] + i * S['place_line'] - cap), row, font=f2, fill=white)

    # the wash behind it all, longer for a second line
    wh = S['wash_height'] + (len(rows) - 1) * S['wash_extra_line']
    wash = Image.new('L', (W, H), 0); dw = ImageDraw.Draw(wash)
    for y in range(wh): dw.line([(0, y), (W, y)], fill=int(255 * S['wash_alpha'] * (1 - y / wh) ** S['wash_curve']))
    im = Image.composite(Image.new('RGB', (W, H), tint), im, wash)
    # a soft shadow under the words
    a = layer.getchannel('A').filter(ImageFilter.GaussianBlur(S['shadow_blur'])).point(lambda v: int(v * S['shadow_alpha']))
    sh = Image.new('RGBA', (W, H), (*[max(0, c - 4) for c in tint], 255)); sh.putalpha(a)
    im = im.convert('RGBA'); im.alpha_composite(sh); im.alpha_composite(layer)
    im.convert('RGB').save(out, quality=92)
    return rows

if __name__ == '__main__':
    frames, frame, place, out = sys.argv[1:5]
    tint = tuple(int(x) for x in sys.argv[5].split(',')) if len(sys.argv) > 5 else (4, 30, 60)
    print(cover(frames, int(frame), place, out, tint))

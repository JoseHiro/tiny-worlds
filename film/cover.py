# A 9:16 cover for a Tiny Worlds film: one clean frame (between captions) with two things centred at the top, "Claude" and
# the place's name, big, over a soft dark wash so they read on pale sand or sky. Kept clear of the app's tabs at the top.
#   python3 film/cover.py film/out/okinawa1 149 "Okinawa" film/out/okinawa-cover.jpg
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SERIF = '/System/Library/Fonts/Supplemental/Hoefler Text.ttc'
italic = lambda size: ImageFont.truetype(SERIF, size, index=2)

def cover(frames, frame, place, out, tint=(4, 30, 60)):
    im = Image.open(f'{frames}/{frame:05d}.jpg').convert('RGB')
    W, H = im.size
    wash = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(wash)
    for y in range(820):
        d.line([(0, y), (W, y)], fill=int(165 * (1 - y / 820) ** 1.5))
    im = Image.composite(Image.new('RGB', (W, H), tint), im, wash)

    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(layer)
    # "● Claude"
    f1 = italic(104); w1 = g.textlength('Claude', font=f1); x = (W - (34 + w1)) / 2; y = 230
    g.ellipse([x, y + 52, x + 22, y + 74], fill=(232, 103, 60, 255))
    g.text((x + 34, y), 'Claude', font=f1, fill=(255, 255, 255, 255))
    # the place, as big as fits
    size = 230
    while g.textlength(place, font=italic(size)) > W - 110: size -= 6
    f2 = italic(size)
    g.text(((W - g.textlength(place, font=f2)) / 2, y + 120), place, font=f2, fill=(255, 255, 255, 255))
    # a soft shadow under the words
    a = layer.getchannel('A').filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.6))
    sh = Image.new('RGBA', (W, H), (2, 24, 50, 255)); sh.putalpha(a)
    im = im.convert('RGBA'); im.alpha_composite(sh); im.alpha_composite(layer)
    im.convert('RGB').save(out, quality=92)

if __name__ == '__main__':
    frames, frame, place, out = sys.argv[1:5]
    cover(frames, int(frame), place, out)

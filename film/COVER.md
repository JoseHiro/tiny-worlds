# 9:16 cover: fixed layout

Every Tiny Worlds post cover uses the same words in the same place at the same size, so the covers line up as one series on the profile grid. `film/cover.py` reads the numbers in the `cover` block below. Change a number here and every cover follows; nothing is set per film.

```
python3 film/cover.py <frames dir> <frame no.> "<Place>" <out.jpg>
python3 film/cover.py film/out/snowfest-coverframe 0 "Sapporo" film/out/snowfest-cover.jpg
```

## What goes on it

1. **● Claude**: small, in italic serif, with an orange dot. It says who made it.
2. **A hairline**: a short thin rule between the two lines of words.
3. **The place**: large, in italic serif. Use one or two words, as people would search for it (Okinawa, Phi Phi, Santorini, Sapporo), not the world's title.

There is nothing else on the cover: no number, no hashtag, no emoji.

## Rules

- **Fixed size.** The place name never shrinks to fit. When a name is too wide, it breaks onto a second line at the same size, at the space nearest its middle.
- **Fixed position.** The words hang from the same top line on every cover. A second line of the place name extends downwards, and the wash grows with it.
- **Safe areas.** Stay clear of the top 200 px (the app's tabs) and the bottom 520 px (the caption and buttons). Keep a 96 px margin on each side.
- **Picking the frame.** Use a clean frame with no captions, chosen from the widest, best-loved angle. Keep the top third calm (sky, sea, snow) so the words sit on a quiet ground.
- **Colour.** The words are white. The wash and the shadow take the film's own tint: deep sea blue for the sea, deep ink blue for the snow.

## The numbers

Positions and sizes are in pixels on a 1080 × 1920 canvas. `*_top` is where the top of the letters sits.

```cover
width            = 1080
height           = 1920
margin           = 96

font             = /System/Library/Fonts/Supplemental/Hoefler Text.ttc
font_index       = 2

claude_size      = 84
claude_top       = 292
dot_size         = 18
dot_gap          = 20
dot_color        = 232,103,60

rule_top         = 428
rule_width       = 88
rule_height      = 2
rule_alpha       = 0.6

place_size       = 176
place_top        = 464
place_line       = 200

wash_height      = 900
wash_extra_line  = 200
wash_alpha       = 0.7
wash_curve       = 1.6

shadow_blur      = 18
shadow_alpha     = 0.5
```

## Tints used so far

| Film | Tint (RGB) |
|---|---|
| Okinawa, Phi Phi, Santorini | 4,30,60 |
| Sapporo (snow) | 14,30,64 |

Pass a tint as a fifth argument, `r,g,b`. The default is 4,30,60.

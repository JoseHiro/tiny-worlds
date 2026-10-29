# film — vertical videos from the story pages

Makes 1080 × 1920 videos (TikTok / Reels / Shorts) from the café story pages. The page's own loop is stopped. The world is stepped at a fixed 1/30 s per frame and filmed with the shots in `film/mina.js`. Each frame goes to `film/out/` (git-ignored).

1. Start the recorder: `node film/record.mjs` (port 5182; launch name `tiny-worlds-film`).
2. For each chapter, open its page and run the film in the console:
   - `cafe/nordic.html?story=1` → `(await import('/film/mina.js')).run(1)`
   - `cafe/wa.html?story=2` → `run(2)`
   - `cafe/barcelona.html?story=3` → `run(3)`

   `run(n, true)` films only the first and last frame of each shot, so you can check the framing.
3. Run `film/make-mina.sh`. It adds the cross-fades and the rain sound, and writes `film/out/mina.mp4` and `mina-silent.mp4`.

## Café life (`film/cafes.js`)

This film has no story and no single main character. Each café goes about its day, with English captions. Film it from the plain pages (`cafe/nordic.html`, `wa.html` and `barcelona.html`, without `?story`) with `(await import('/film/cafes.js')).run(n)`. Then join the three pieces:

```bash
film/make.sh cafes 0.35 0.8 0.03
```

`film/make.sh` works for any set of pieces. You give it one rain loudness per piece: 0 is dry and 1 is a downpour.

## Pocket (`film/pocket.js`)

Each pocket video shows one café as a small object on a plain table. The camera goes slowly round the whole diorama for 20 seconds while life goes on inside. Text is in English, set like a museum label. Film it from the plain page with `(await import('/film/pocket.js')).run('nordic')` (or `'wa'`). Then rename the frame folder `film/out/pocket-nordic` to `pocket-nordic1` and join it:

```bash
film/make.sh pocket-nordic 0.35
```

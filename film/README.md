# film — vertical videos from the story pages

Makes 1080 × 1920 videos (TikTok / Reels / Shorts) from the café story pages. The page's own loop is stopped. The world is stepped at a fixed 1/30 s per frame and filmed with the shots in `film/mina.js`. Each frame goes to `film/out/` (git-ignored).

1. Start the recorder: `node film/record.mjs` (port 5182; launch name `tiny-worlds-film`).
2. For each chapter, open its page and run the film in the console:
   - `cafe/nordic.html?story=1` → `(await import('/film/mina.js')).run(1)`
   - `cafe/wa.html?story=2` → `run(2)`
   - `cafe/barcelona.html?story=3` → `run(3)`

   `run(n, true)` films only the first and last frame of each shot, so you can check the framing.
3. Run `film/make-mina.sh`. It adds the cross-fades and the rain sound, and writes `film/out/mina.mp4` and `mina-silent.mp4`.

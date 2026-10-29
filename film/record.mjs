// The film recorder: the same static server as serve.mjs, plus a place to drop frames. node film/record.mjs [port]
// A page running film/film.js posts each frame (a JPEG) to /__film/<shot>/<n>; it lands in film/out/<shot>/<n>.jpg,
// ready for film/make.sh (ffmpeg) to join into a video.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('./out/', import.meta.url));
const port = Number(process.argv[2] ?? 5182);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const drop = path.match(/^\/__film\/([\w-]+)\/([\w-]+)$/);
  if (req.method === 'POST' && drop) {
    const parts = [];
    for await (const c of req) parts.push(c);
    await mkdir(join(out, drop[1]), { recursive: true });
    await writeFile(join(out, drop[1], drop[2] + '.jpg'), Buffer.concat(parts));
    return res.writeHead(204).end();
  }
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));

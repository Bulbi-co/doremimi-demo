// Serves the demo from this folder:  npm start  ->  http://localhost:4175 (or the next free port).
//
// The site has no build step, so this only maps paths to files. It replaces tools/serve.py: the deck is ES modules,
// so a cold load fires a burst of parallel requests. Python's plain http.server (listen backlog 5) dropped them
// (9 of 12 cold loads failed); Node listens with a backlog of 511 by default.
// A busy port moves to the next one instead of failing, because a screenshot run or a second terminal often
// already holds 4175.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml',
};

function resolve(urlPath) {
  const path = normalize(join(root, decodeURIComponent(urlPath.split('?')[0])));
  if (!path.startsWith(root.endsWith(sep) ? root : root + sep) && path !== root) return null;
  try {
    const st = statSync(path);
    if (st.isDirectory()) return resolve(join(urlPath.split('?')[0], 'index.html'));
    return { path, size: st.size };
  } catch { return null; }
}

const server = createServer((req, res) => {
  const file = resolve(req.url || '/');
  if (!file) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('404'); return; }
  // no-store: during rehearsals an edited slide must show on the next reload, not a cached copy.
  res.writeHead(200, { 'content-type': types[extname(file.path).toLowerCase()] || 'application/octet-stream',
    'content-length': file.size, 'cache-control': 'no-store' });
  createReadStream(file.path).pipe(res);
});

let port = Number(process.env.PORT) || 4175;
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && port < 4195) { port += 1; server.listen(port); } else { throw e; }
});
server.on('listening', () => console.log(`Doremimi demo: http://localhost:${port}/`));
server.listen(port);

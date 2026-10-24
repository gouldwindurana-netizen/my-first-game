#!/usr/bin/env node
/** Serve the built game, optionally under the same prefix used by GitHub Pages. */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = {
  dir: 'dist',
  port: process.env.PORT || '4173',
  host: process.env.HOST || '127.0.0.1',
  base: process.env.BASE_PATH || '/',
};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  const flag = args[index];
  const name = flag.replace(/^--/, '');
  if (!flag.startsWith('--') || !Object.hasOwn(options, name) || !args[index + 1]) {
    console.error('Usage: node scripts/serve.mjs [--dir dist] [--port 4173] [--host 127.0.0.1] [--base /my-first-game/]');
    process.exit(1);
  }
  options[name] = args[++index];
}
const port = Number(options.port);
if (!Number.isInteger(port) || port < 0 || port > 65535 || /[?#\\\0]/.test(options.base)) {
  console.error('Invalid port or base path.');
  process.exit(1);
}
const baseSegments = options.base.split('/').filter(Boolean);
if (baseSegments.some(segment => segment === '.' || segment === '..')) {
  console.error('Base path cannot contain dot segments.');
  process.exit(1);
}
const basePath = baseSegments.length ? `/${baseSegments.join('/')}/` : '/';
let root;
try {
  root = await realpath(resolve(projectRoot, options.dir));
  if (!(await stat(root)).isDirectory()) throw new Error('Not a directory');
} catch {
  console.error(`Cannot serve ${options.dir}. Run npm run build first, or supply --dir.`);
  process.exit(1);
}
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};
function withinRoot(path) {
  const location = relative(root, path);
  return location !== '..' && !location.startsWith(`..${sep}`) && !isAbsolute(location);
}
function respond(response, code, message) {
  response.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
  response.end(message);
}
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    respond(response, 405, 'Method not allowed');
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent((request.url || '/').split('?')[0]); }
  catch { respond(response, 400, 'Invalid URL encoding'); return; }
  if (pathname.includes('\0') || pathname.includes('\\')) { respond(response, 400, 'Invalid path'); return; }
  if (basePath !== '/' && pathname === basePath.slice(0, -1)) {
    response.writeHead(308, { Location: basePath });
    response.end();
    return;
  }
  if (!pathname.startsWith(basePath)) { respond(response, 404, 'Not found'); return; }
  const requestedPath = pathname.slice(basePath.length);
  if (requestedPath.split('/').includes('..')) { respond(response, 403, 'Forbidden'); return; }
  const candidate = resolve(root, requestedPath || 'index.html');
  if (!withinRoot(candidate)) { respond(response, 403, 'Forbidden'); return; }
  try {
    let file = await realpath(candidate);
    if (!withinRoot(file)) { respond(response, 403, 'Forbidden'); return; }
    let info = await stat(file);
    if (info.isDirectory()) {
      file = await realpath(resolve(file, 'index.html'));
      if (!withinRoot(file)) { respond(response, 403, 'Forbidden'); return; }
      info = await stat(file);
    }
    if (!info.isFile()) { respond(response, 404, 'Not found'); return; }
    response.writeHead(200, {
      'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') { response.end(); return; }
    const stream = createReadStream(file);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch (error) {
    const status = error.code === 'EACCES' ? 403 : ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500;
    respond(response, status, status === 500 ? 'Server error' : status === 403 ? 'Forbidden' : 'Not found');
  }
});
server.on('error', error => { console.error(`Static server failed: ${error.code || error.message}`); process.exitCode = 1; });
server.listen(port, options.host, () => {
  const address = server.address();
  const host = options.host.includes(':') ? `[${options.host}]` : options.host;
  console.log(`Serving ${options.dir} at http://${host}:${address.port}${basePath}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => { server.close(); server.closeIdleConnections(); });
}

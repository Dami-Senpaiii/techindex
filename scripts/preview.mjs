import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
const root = new URL('../', import.meta.url);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path === '/' ? '/index.html' : path;
    const allowed = ['/index.html', '/404.html', '/favicon.svg', '/data/catalogue.json'].includes(file) || /^\/assets\/[a-zA-Z0-9/_-]+\.(?:js|css|png|webp|svg)$/.test(file);
    if (!allowed || !['GET', 'HEAD'].includes(request.method)) throw new Error('Not found');
    const data = await readFile(new URL('.' + file, root));
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(await readFile(new URL('404.html', root)));
  }
});
server.listen(4173, '127.0.0.1', () => console.log('TechIndex preview: http://127.0.0.1:4173'));

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../site.config.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/__preview/mobile') {
      const slug = new URL(req.url, 'http://localhost').searchParams.get('page') || '';
      if (!/^[a-z-]*$/.test(slug)) throw new Error('Invalid preview path');
      const frameUrl = site.base + (slug ? slug + '/' : '');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>390px 移动端预览</title><style>body{margin:0;background:#e6e9ef;font:12px system-ui;color:#738099}header{text-align:center;padding:12px}iframe{display:block;width:390px;height:844px;max-width:100%;border:0;margin:auto;background:#fff;box-shadow:0 4px 30px #20304a20}</style></head><body><header>390 × 844 · 移动端布局检查</header><iframe title="手机尺寸的作品集" src="${frameUrl}"></iframe></body></html>`);
    }
    if (pathname === '/') { res.writeHead(302, { Location: site.base }); return res.end(); }
    if (!pathname.startsWith(site.base)) throw new Error('Not found');
    let file = path.resolve(root, '.' + pathname.slice(site.base.length - 1));
    if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Not found');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${site.base}`));

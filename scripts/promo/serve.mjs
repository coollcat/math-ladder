/* 本地静态服务：把 static/promo 挂在 http://127.0.0.1:8788/
   用法： node scripts/promo/serve.mjs [--port 8788]                             */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const ai = argv.indexOf('--port');
const PORT = ai >= 0 ? +argv[ai + 1] : 8788;
const ROOT = path.resolve(import.meta.dirname, '../../static/promo');
const MIME = { '.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png' };

http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(f));
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, '127.0.0.1', () => {
  console.log('宣传片 → http://127.0.0.1:' + PORT + '/   (Ctrl+C 退出)');
});

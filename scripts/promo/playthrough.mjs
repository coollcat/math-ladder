/* 全片真实播放测试：从 0 播到 167s，每 8 秒采一次状态，关键节点截图。
   目的：抓「只在幕切换/长时间播放时才出现」的问题。
   用法： node scripts/promo/playthrough.mjs [--quality 1] [--w 1280] [--h 720] */
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const PORT = +arg('port', 8778), DBG = +arg('dbg', 9334);
const W = +arg('w', 1280), H = +arg('h', 720), QUALITY = +arg('quality', 1);
const OUT = path.join(import.meta.dirname, 'shots');
mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(import.meta.dirname, '../../static/promo');
const CANDIDATES = [
  process.env.ML_CHROME || '',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const EDGE = CANDIDATES.find(p => p && existsSync(p));
if (!EDGE) { console.error('找不到 Chrome/Edge，可用 ML_CHROME 环境变量指定'); process.exit(1); }

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  try { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(readFileSync(f)); }
  catch { res.writeHead(404); res.end('x'); }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + DBG,
  '--user-data-dir=' + path.join(OUT, 'edge-profile2'), '--window-size=' + W + ',' + H,
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required',
  '--no-first-run', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  'about:blank'], { stdio: 'ignore' });

let wsUrl = null;
for (let i = 0; i < 60; i++) {
  try { wsUrl = (await (await fetch('http://127.0.0.1:' + DBG + '/json/version')).json()).webSocketDebuggerUrl; break; }
  catch { await new Promise(r => setTimeout(r, 250)); }
}
if (!wsUrl) { console.error('Edge 没起来'); process.exit(1); }
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); const evs = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  else if (m.method) evs.push(m);
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' }, sessionId);
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
for (let i = 0; i < 60; i++) { try { if (await evaluate('!!window.__PROMO')) break; } catch { } await sleep(250); }
await sleep(800);
await evaluate("document.getElementById('gate').classList.add('is-off')");
await evaluate('window.__PROMO.setQuality(' + QUALITY + ', false); window.__PROMO.mute();');
const total = await evaluate('window.__PROMO.total');
console.log('全片 ' + total + 's，开始真实播放（' + W + '×' + H + '，画质档 ' + QUALITY + '）');
await evaluate('window.__PROMO.play()');

const t0 = Date.now();
const marks = {};
const shots = [12, 40, 75, 110, 140, 163];
let errs = [];
for (;;) {
  await sleep(8000);
  const st = JSON.parse(await evaluate('JSON.stringify(window.__PROMO.state)'));
  const wall = (Date.now() - t0) / 1000;
  marks[st.scene] = (marks[st.scene] || []).concat([st.fps]);
  for (const s of shots) {
    if (st.t >= s && !marks['shot' + s]) {
      marks['shot' + s] = 1;
      const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      writeFileSync(path.join(OUT, 'play-' + String(s).padStart(3, '0') + '.png'), Buffer.from(r.data, 'base64'));
    }
  }
  console.log('t=' + st.t.toFixed(1) + '/' + total + '  墙钟=' + wall.toFixed(0) + 's  ' +
    st.sceneName.padEnd(12) + ' fps=' + st.fps + (st.err ? '  ⚠ ' + st.err.slice(0, 60) : ''));
  if (st.err) errs.push('t=' + st.t.toFixed(0) + ' ' + st.err.slice(0, 120));
  if (!st.playing || st.t >= total - 0.01) { console.log('播放结束：t=' + st.t.toFixed(2) + ' playing=' + st.playing); break; }
  if (wall > total * 4 + 60) { errs.push('播放超时（墙钟 ' + wall.toFixed(0) + 's 还没播完）'); break; }
}
for (const e of evs) {
  if (e.method === 'Runtime.exceptionThrown') errs.push('EXCEPTION: ' + (e.params.exceptionDetails.exception?.description || '').slice(0, 200));
  if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') errs.push('CONSOLE: ' + e.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 200));
}
console.log(errs.length ? '\n播放期间问题 ' + errs.length + ' 条:\n' + errs.join('\n') : '\n整片播放无异常 ✓');
try { ws.close(); } catch { }
child.kill(); server.close();
process.exit(0);

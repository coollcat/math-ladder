/* 无头批量出片：把整片录成 webm 落盘，可选再转 mp4。
   原理仍是页面里那颗「● 录制」（MediaRecorder = 编码，不是生成），
   只是用 CDP 代替人点按钮，并把下载目录接管到 scripts/promo/out/。

   用法：
     node scripts/promo/record.mjs                          :: 完整版 1280x720 标准档
     node scripts/promo/record.mjs --film short --transcode :: 快闪版并转 mp4
     node scripts/promo/record.mjs --quality 2 --w 1600 --h 900
     node scripts/promo/record.mjs --transcode              :: 顺带 ffmpeg 转 mp4（constant 60fps）
     node scripts/promo/record.mjs --fps 30 --transcode     :: 想要 30fps 的 mp4

   注意：录制按钮的语义是「从片头完整录一条」，--from 只在试片时用来跳过前半段；
         无头环境是 SwiftShader 软件渲染，帧率不如真机。
         要 60fps 的成片，请在浏览器里点「● 录制」。                        */
import http from 'node:http';
import { readFileSync, mkdirSync, readdirSync, statSync, existsSync, renameSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes('--' + n);
const PORT = +arg('port', 8779), DBG = +arg('dbg', 9335);
const W = +arg('w', 1280), H = +arg('h', 720), QUALITY = +arg('quality', 1);
const FROM = +arg('from', 0);
const FILM = (arg('film', 'full') || 'full').replace(/[^a-z]/g, '');
const HERE = import.meta.dirname;
const OUTDIR = path.join(HERE, 'out');
const ROOT = path.resolve(HERE, '../../static/promo');
const CANDIDATES = [
  process.env.ML_CHROME || '',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const CHROME = CANDIDATES.find(p => p && existsSync(p));
if (!CHROME) { console.error('找不到 Chrome/Edge，可用 ML_CHROME 环境变量指定'); process.exit(1); }
mkdirSync(OUTDIR, { recursive: true });

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  try { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(readFileSync(f)); }
  catch { res.writeHead(404); res.end('x'); }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const child = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + DBG,
  '--user-data-dir=' + path.join(OUTDIR, 'chrome-profile'), '--window-size=' + W + ',' + H,
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  'about:blank'], { stdio: 'ignore' });

let wsUrl = null;
for (let i = 0; i < 80; i++) {
  try { wsUrl = (await (await fetch('http://127.0.0.1:' + DBG + '/json/version')).json()).webSocketDebuggerUrl; break; }
  catch { await new Promise(r => setTimeout(r, 250)); }
}
if (!wsUrl) { console.error('浏览器没起来'); process.exit(1); }
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); const evs = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  else if (m.method) evs.push(m);
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const i = ++id; pend.set(i, { res, rej });
  ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUTDIR, eventsEnabled: true });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/' + FILM + '/index.html' }, sessionId);

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
for (let i = 0; i < 80; i++) { try { if (await evaluate('!!window.__PROMO')) break; } catch { } await sleep(250); }
await sleep(1200);

const before = new Set(readdirSync(OUTDIR));
await evaluate("document.getElementById('gate').classList.add('is-off')");
await evaluate('window.__PROMO.setQuality(' + QUALITY + ', true)');
await evaluate('window.__PROMO.unmute()');
await evaluate('window.__PROMO.seekTime(' + FROM + ')');
console.log('录制 ' + FILM + '：' + W + '×' + H + '（成片 1920×1080）· 画质档 ' + QUALITY + ' · 从 ' + FROM + 's 起');
await evaluate("document.getElementById('b-rec').click()");

const t0 = Date.now();
let last = -1;
for (;;) {
  await sleep(5000);
  const st = JSON.parse(await evaluate('JSON.stringify(window.__PROMO.state)'));
  const wall = (Date.now() - t0) / 1000;
  console.log('  t=' + st.t.toFixed(1) + '/' + st.total + '  墙钟=' + wall.toFixed(0) + 's  fps=' + st.fps + '  ' + st.sceneName);
  if (!st.playing || st.t <= last) break;
  last = st.t;
  if (wall > 60 * 15) { console.error('超时'); break; }
}
await sleep(600);
await evaluate("document.getElementById('b-rec').click()");
console.log('已停止录制，等文件落盘…');

let file = null, lastSize = -1, stable = 0;
for (let i = 0; i < 90; i++) {
  await sleep(500);
  /* 只看这次新出现的文件：目录里可能还躺着上一遍录的成片。
     另外 Chrome 有时来不及把 .crdownload 改名为 .webm 就被我们关掉了，
     所以这里也认 .crdownload —— 大小连续两次不变就当作已经写完，替它改名。 */
  const done = readdirSync(OUTDIR)
    .filter(f => !before.has(f) && (f.endsWith('.webm') || f.endsWith('.webm.crdownload')))
    .sort();
  if (!done.length) continue;
  const cur = path.join(OUTDIR, done[done.length - 1]);
  const size = statSync(cur).size;
  if (size === lastSize) stable++; else { stable = 0; lastSize = size; }
  if (size > 0 && (cur.endsWith('.webm') || stable >= 2)) {
    file = cur;
    if (cur.endsWith('.crdownload')) {
      file = cur.replace(/\.crdownload$/, '');
      renameSync(cur, file);
      console.log('（Chrome 没改名，已把 .crdownload 修成 .webm）');
    }
    break;
  }
}
if (!file) { console.error('没等到 webm 文件'); process.exit(1); }
const mb = (statSync(file).size / 1048576).toFixed(1);
console.log('成片: ' + file + '  (' + mb + ' MB)');

if (flag('transcode')) {
  const mp4 = file.replace(/\.webm$/, '.mp4');
  const fps = arg('fps', '60');
  console.log('转 mp4（constant ' + fps + 'fps）…');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file,
    '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-r', fps, '-fps_mode', 'cfr',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  console.log('mp4: ' + mp4 + '  (' + (statSync(mp4).size / 1048576).toFixed(1) + ' MB)');
}
const bad = evs.filter(e => e.method === 'Runtime.exceptionThrown');
if (bad.length) console.error('录制期间异常 ' + bad.length + ' 条');
try { ws.close(); } catch { }
child.kill(); server.close();
process.exit(0);

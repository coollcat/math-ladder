/* 无头浏览器验证台：起静态服务 → 起 Edge/Chrome(headless) → CDP 连上去 → 逐幕定格截图
   用法： node scripts/promo/verify.mjs [--scenes 0,1,2] [--quality 2] [--w 1280] [--h 720] [--wait 900] [--frac 0.6] [--tag a]
   产出： scripts/promo/shots/<tag>NN.png + montage-<tag>.png + 控制台报告            */
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : dflt;
}
const PORT = +arg('port', 8777);
const DBG = +arg('dbg', 9333);
const W = +arg('w', 1280), H = +arg('h', 720);
const QUALITY = +arg('quality', 2);
const WAIT = +arg('wait', 900);
const SCENES = arg('scenes', 'all');
const FILM = (arg('film', 'full') || 'full').replace(/[^a-z]/g, '');
const OUT = path.join(import.meta.dirname, 'shots');
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
/* 有累积状态的镜头要按时间「跑」过去而不是定格：完整版是 6/7/9，快闪版是高尔顿那一镜 */
const STATEFUL = FILM === 'short' ? { 7: 1 } : { 6: 1, 7: 1, 9: 1 };
if (FILM !== 'full') console.log('片子: ' + FILM);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* ---------- 静态服务 ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  try {
    const buf = readFileSync(f);
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end('nope');
  }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
console.log('静态服务 http://127.0.0.1:' + PORT + '/');

/* ---------- 启动 Edge ---------- */
const profile = path.join(OUT, 'edge-profile');
const child = spawn(EDGE, [
  '--headless=new',
  '--remote-debugging-port=' + DBG,
  '--user-data-dir=' + profile,
  '--window-size=' + W + ',' + H,
  '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--mute-audio',
  'about:blank'
], { stdio: 'ignore', detached: false });

async function jget(url) {
  const r = await fetch(url);
  return r.json();
}
let wsUrl = null;
for (let i = 0; i < 60; i++) {
  try { const v = await jget('http://127.0.0.1:' + DBG + '/json/version'); wsUrl = v.webSocketDebuggerUrl; break; }
  catch { await new Promise(r => setTimeout(r, 250)); }
}
if (!wsUrl) { console.error('Edge 没起来'); child.kill(); server.close(); process.exit(1); }
console.log('CDP ' + wsUrl);

/* ---------- 极简 CDP 客户端 ---------- */
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let msgId = 0;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(m.method + ': ' + JSON.stringify(m.error))) : res(m.result);
  } else if (m.method) events.push(m);
};
function send(method, params = {}, sessionId) {
  const id = ++msgId;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 开页面 ---------- */
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Log.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/' + FILM + '/index.html' }, sessionId);

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
/* 等 __PROMO 就绪 */
let ready = false;
for (let i = 0; i < 80; i++) {
  try { if (await evaluate('!!window.__PROMO')) { ready = true; break; } } catch { }
  await sleep(250);
}
if (!ready) { console.error('页面没起来（__PROMO 不存在）'); }
await sleep(1200);

const errs = [];
function collectConsole() {
  for (const e of events) {
    if (e.method === 'Runtime.exceptionThrown') errs.push('EXCEPTION: ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text));
    if (e.method === 'Runtime.consoleAPICalled' && (e.params.type === 'error' || e.params.type === 'warning')) {
      errs.push(e.params.type.toUpperCase() + ': ' + e.params.args.map(a => a.value ?? a.description ?? a.type).join(' '));
    }
    if (e.method === 'Log.entryAdded' && (e.params.entry.level === 'error' || e.params.entry.level === 'warning')) {
      errs.push('LOG/' + e.params.entry.level + ': ' + e.params.entry.text);
    }
  }
  events.length = 0;
}

const state0 = await evaluate('JSON.stringify(window.__PROMO.state)');
console.log('初始状态: ' + state0);
const total = await evaluate('window.__PROMO.total');
const sceneList = await evaluate('JSON.stringify(window.__PROMO.scenes)');
const scenes = JSON.parse(sceneList);
console.log('全片 ' + total.toFixed(1) + 's · ' + scenes.length + ' 幕');
for (const s of scenes) console.log('   ' + s.id.padEnd(10) + s.dur.toFixed(1) + 's  ' + s.zh);

await evaluate('window.__PROMO.setQuality(' + QUALITY + ', true)');
await evaluate("document.getElementById('gate').classList.add('is-off')");
await sleep(300);

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
}

const idx = SCENES === 'all' ? scenes.map((_, i) => i) : SCENES.split(',').map(Number);
/* 这几幕有累积状态（小球、轨迹、下降路径），要按时间「跑」过去而不是定格 */
const FRAC = +arg('frac', 0.6);
const TAG = arg('tag', 'a');
const t0 = Date.now();
for (const i of idx) {
  if (STATEFUL[i]) await evaluate('window.__PROMO.sim(' + i + ',' + (scenes[i].dur * FRAC).toFixed(2) + ')');
  else await evaluate('window.__PROMO.seek(' + i + ',' + FRAC + ')');
  await sleep(WAIT);
  await evaluate('window.__PROMO.render()');
  await sleep(Math.min(600, WAIT));
  await shot(TAG + String(i).padStart(2, '0'));
  const st = JSON.parse(await evaluate('JSON.stringify(window.__PROMO.state)'));
  console.log('幕 ' + String(i).padStart(2) + ' ' + scenes[i].zh.padEnd(12) + ' fps=' + st.fps +
    ' ft=' + st.ftAvg.toFixed(0) + 'ms gl=' + st.glW + 'x' + st.glH + ' parts=' + (st.parts / 1000) + 'k' +
    (st.err ? '  ⚠ ' + st.err.slice(0, 80) : ''));
  collectConsole();
}
console.log('截图耗时 ' + ((Date.now() - t0) / 1000).toFixed(1) + 's → ' + OUT);

/* ---------- 音频与播放冒烟测试 ---------- */
try {
  await evaluate('window.__PROMO.unmute(); window.__PROMO.seekTime(3); window.__PROMO.play();');
  await sleep(1500);
  const lv = [];
  for (let i = 0; i < 12; i++) {
    lv.push(await evaluate('window.__PROMO.level()'));
    await sleep(420);
  }
  const max = Math.max(...lv);
  const st = JSON.parse(await evaluate('JSON.stringify(window.__PROMO.state)'));
  console.log('播放冒烟: t=' + st.t.toFixed(2) + 's playing=' + st.playing + ' fps=' + st.fps +
    ' ctx=' + await evaluate('window.__PROMO.audioState()'));
  console.log('配乐电平: 峰值 ' + max.toFixed(4) + ' · 采样 ' + lv.map(v => v.toFixed(3)).join(' '));
  if (!(max > 0.002)) errs.push('配乐没有输出电平（RMS 峰值 ' + max.toFixed(5) + '）');
  await evaluate('window.__PROMO.pause()');
} catch (e) { errs.push('播放冒烟失败: ' + e.message); }
collectConsole();

/* ---------- 结尾 + 录屏 + 竖屏 ---------- */
try {
  await evaluate('window.__PROMO.seekTime(' + (total - 9) + '); window.__PROMO.unmute(); window.__PROMO.play();');
  await sleep(5200);
  await shot('z-ending');
  const st = JSON.parse(await evaluate('JSON.stringify(window.__PROMO.state)'));
  console.log('结尾: t=' + st.t.toFixed(1) + '/' + total + ' 幕=' + st.sceneName + ' playing=' + st.playing);
  /* 自动播到结束（TOTAL 处应自动暂停） */
  await evaluate('window.__PROMO.seekTime(' + (total - 2.2) + '); window.__PROMO.mute(); window.__PROMO.play();');
  await sleep(4200);
  const st2 = JSON.parse(await evaluate('JSON.stringify(window.__PROMO.state)'));
  console.log('播到片尾: t=' + st2.t.toFixed(2) + ' playing=' + st2.playing + (st2.playing ? ' ⚠ 没有自动停' : ' ✓ 自动停在片尾'));
  if (st2.playing) errs.push('播到片尾没有自动暂停');
} catch (e) { errs.push('结尾测试失败: ' + e.message); }
collectConsole();

try {
  await evaluate("window.__PROMO.seekTime(40); document.getElementById('b-rec').click();");
  await sleep(2500);
  await evaluate("document.getElementById('b-rec').click();");
  await sleep(800);
  console.log('录屏: ' + (await evaluate("document.getElementById('b-rec').textContent")).trim() + ' ✓ 未抛异常');
} catch (e) { errs.push('录屏测试失败: ' + e.message); }
collectConsole();

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 500, height: 900, deviceScaleFactor: 1, mobile: true }, sessionId);
  await sleep(600);
  await evaluate('window.__PROMO.seek(1, 0.7)');
  await sleep(700);
  await shot('z-portrait');
  const st = JSON.parse(await evaluate('JSON.stringify(window.__PROMO.state)'));
  console.log('竖屏 500x900: gl=' + st.glW + 'x' + st.glH + ' err=' + (st.err ? st.err.slice(0, 60) : '无'));
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
  await sleep(400);
} catch (e) { errs.push('竖屏测试失败: ' + e.message); }
collectConsole();

console.log(errs.length ? '\n控制台问题 ' + errs.length + ' 条:\n' + errs.slice(0, 25).join('\n') : '\n控制台干净 ✓');

/* ---------- 拼图（用 ffmpeg 把 12 张缩略成一张，便于一眼扫全片） ---------- */
try {
  const { execFileSync } = await import('node:child_process');
  const cols = idx.length > 6 ? 4 : 3, rows = Math.ceil(idx.length / cols);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(OUT, TAG + '%02d.png'),
    '-vf', 'scale=640:360,tile=' + cols + 'x' + rows, path.join(OUT, 'montage-' + TAG + '.png')], { stdio: 'ignore' });
  console.log('拼图 → ' + path.join(OUT, 'montage-' + TAG + '.png'));
} catch (e) { console.log('拼图失败（ffmpeg）: ' + e.message); }

/* ---------- 收尾 ---------- */
try { await send('Target.closeTarget', { targetId }); } catch { }
try { ws.close(); } catch { }
child.kill();
server.close();
process.exit(0);

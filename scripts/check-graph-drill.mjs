#!/usr/bin/env node
/* =========================================================================
 * 图谱双页运行时验收：/graph 阶梯版图 + /tree 课程家谱
 * -------------------------------------------------------------------------
 * 用法：node scripts/check-graph-drill.mjs            （先 npm run build）
 *       BASE=http://127.0.0.1:8099 node scripts/check-graph-drill.mjs   （对着自己起的服务跑）
 *       PW_CHANNEL=msedge node scripts/check-graph-drill.mjs          （用本机 Edge，免下载 chromium）
 *
 * `npm run build` 只证明「编译得过、SSR 出得来」，交互的坑全在运行时——
 * fetch 的 URL 拼错、竞态把数据写到错误的章、课表行数对不上、连线没画、
 * 地址栏没写回……这些构建一律绿灯。所以这里钉的全是肉眼可见的东西：
 *   1. /graph：章卡与课方格数量、6 列 × 7 行、初始零连线；悬停画线并压暗无关卡；
 *      点击章真的发出 graph-chapters/NN.json 请求且 200、课表行数＝该章课数；
 *      再点 / Esc 取消钉住；?ch=N 直达并能点课进课页；
 *   2. /tree：?l= 定焦、卡片与连线数量、单击换焦点写回地址栏、浏览器后退还原；
 *   3. 全程零 pageerror / console error / 失败请求。
 *
 * 2026-09-29 首版钉的是同心环的「原位展开课点」；2026-10 两页重做后断言整段改写。
 *
 * 三件纪律（与旧 check-chapters-page 一致，改这个脚本时别破坏）：
 *   1. 检查点钉在「肉眼看到的东西」上，不测内部状态；
 *   2. 坐标必须落在元素的真实矩形里（导语很长，画布在视口 480px 以下）；
 *   3. 依赖缺失就打印「跳过」退出 0——playwright 是可选开发期依赖，不拦构建。
 * ========================================================================= */
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'build');

/* ---- 1. 依赖与产物 ---- */
if (!fs.existsSync(path.join(BUILD, 'graph', 'index.html'))) {
  console.log('⚠ 跳过：build/graph/index.html 不存在——先跑 npm run build');
  process.exit(0);
}

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_DIR,
    path.join(ROOT, 'node_modules'),
  ].filter(Boolean);
  /* npx 缓存目录名是哈希，按当前用户扫一遍（别再写死某台机器的绝对路径）。
     扫到「有包没浏览器」的那份时 launch 会报 Executable doesn't exist——
     设 PW_CHANNEL=msedge 直接用本机 Edge，免下载浏览器。 */
  const npxRoot = path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_npx');
  try {
    for (const d of fs.readdirSync(npxRoot)) candidates.push(path.join(npxRoot, d));
  } catch {
    /* 没有 npx 缓存就算了 */
  }
  for (const dir of candidates) {
    try {
      const req = createRequire(path.join(dir, 'noop.js'));
      return req('playwright');
    } catch {
      /* 换下一个 */
    }
  }
  return null;
}

const playwright = loadPlaywright();
if (!playwright) {
  console.log('⚠ 跳过：没找到 playwright（可选依赖）。装法：npm i -D playwright && npx playwright install chromium');
  process.exit(0);
}

/* ---- 2. 需要就自己起一个静态服务 ---- */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
};

let server = null;
let base = process.env.BASE || '';
if (!base) {
  const port = 8124;
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(BUILD, rel);
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    } catch {
      file = path.join(BUILD, `${rel}.html`);
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404);
        res.end('404');
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${port}`;
}

/* ---- 3. 断言 ---- */
const problems = [];
const notes = [];
const ok = (cond, msg) => (cond ? notes.push('✔ ' + msg) : problems.push('✗ ' + msg));

/* PW_CHANNEL=msedge / chrome：用本机已装浏览器，不依赖 playwright 自带的 chromium */
const browser = await playwright.chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
/* 站点没配 favicon，浏览器自发的 /favicon.ico 会 404 并在控制台留一句不带地址的错误，
   而且这类请求不走 page 的 response 事件。它与图谱无关，拦下来回 204，别让它冒充图谱页报错。 */
await ctx.route('**/favicon.ico', (r) => r.fulfill({ status: 204, body: '' }));
const page = await ctx.newPage();
const pageErrors = [];
const consoleErrors = [];
const failedReq = [];
const jsonReqs = [];
const badResp = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 240));
});
page.on('requestfailed', (r) => failedReq.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => {
  if (/graph-chapters\/\d+\.json/.test(r.url())) jsonReqs.push({ url: r.url(), status: r.status() });
  /* 4xx/5xx 不触发 requestfailed，只在控制台留一句不带地址的 404——记下地址好排查 */
  if (r.status() >= 400) badResp.push(`${r.status()} ${r.url()}`);
});

await page.goto(`${base}/graph/`, { waitUntil: 'load' });
await page.waitForSelector('.ml-atlas__tile', { timeout: 20000 });
await page.waitForTimeout(900); /* 章卡有入场动画 */

/* 3.1 基本盘：章卡、层级列头、七卷行都在；平时不画任何连线 */
const s0 = await page.evaluate(() => ({
  tiles: document.querySelectorAll('.ml-atlas__tile').length,
  cols: document.querySelectorAll('.ml-atlas__colhead').length,
  rows: document.querySelectorAll('.ml-atlas__rowhead').length,
  links: document.querySelectorAll('.ml-atlas__link').length,
  cells: document.querySelectorAll('.ml-atlas__waffle i').length,
}));
ok(s0.tiles >= 60, `章卡渲染 ${s0.tiles} 张（≥60）`);
ok(s0.cols === 6 && s0.rows === 7, `6 级台阶 × 7 卷（${s0.cols}×${s0.rows}）`);
ok(s0.links === 0, `初始无连线（${s0.links}）`);
ok(s0.cells >= 900, `课方格 ${s0.cells} 格（≥900）`);

/* 3.2 挑一张课数 8–16 的章卡（aria-label 里有「N 课」） */
const target = await page.evaluate(() => {
  for (const el of document.querySelectorAll('.ml-atlas__tile')) {
    const m = (el.getAttribute('aria-label') || '').match(/第 (\d+) 章.*?(\d+) 课/);
    if (m && Number(m[2]) >= 8 && Number(m[2]) <= 16) return { n: Number(m[1]), count: Number(m[2]) };
  }
  return null;
});
ok(!!target, `选中测试章（第 ${target?.n} 章，${target?.count} 门课）`);
if (target) {
  const sel = `.ml-atlas__tile[data-ch="${target.n}"]`;
  const pad = String(target.n).padStart(2, '0');

  /* 3.3 悬停 → 只画这一章的连线 */
  await page.hover(sel);
  await page.waitForTimeout(300);
  const hl = await page.evaluate(() => ({
    links: document.querySelectorAll('.ml-atlas__link').length,
    dim: document.querySelectorAll('.ml-atlas__tile.is-dim').length,
  }));
  ok(hl.links > 0 && hl.dim > 0, `悬停画出 ${hl.links} 条线、压暗 ${hl.dim} 章`);

  /* 3.4 点击 → 钉住 → fetch 200 → 面板课表行数 === 该章课数 */
  await page.click(sel);
  await page.waitForSelector('.ml-atlas__panel .ml-gp-lessons--numbered li', { timeout: 8000 });
  await page.waitForTimeout(300);
  const hit = jsonReqs.find((r) => r.url.endsWith(`graph-chapters/${pad}.json`) && r.status === 200);
  ok(!!hit, `graph-chapters/${pad}.json 请求 200`);
  const rows = await page.evaluate(() => document.querySelectorAll('.ml-atlas__panel .ml-gp-lessons--numbered li').length);
  ok(rows === target.count, `面板课表 ${rows} 行 === 该章 ${target.count} 门课`);
  ok((await page.$('.ml-atlas__chain')) !== null || target.n <= 2, '面板给出最长先修链');

  /* 3.5 再点同一章 → 取消钉住（面板回到总览） */
  await page.click(sel);
  await page.waitForTimeout(300);
  ok((await page.$('.ml-atlas__panel .ml-atlas__close')) === null, '再点同一章取消钉住');

  /* 3.6 钉住后按 Esc 取消 */
  await page.click(sel);
  await page.waitForSelector('.ml-atlas__panel .ml-atlas__close', { timeout: 4000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok((await page.$('.ml-atlas__panel .ml-atlas__close')) === null, 'Esc 取消钉住');

  /* 3.7 地址栏 ?ch=N 直达，点课表里的课 → SPA 跳进课页 */
  await page.goto(`${base}/graph/?ch=${target.n}`, { waitUntil: 'load' });
  await page.waitForSelector('.ml-atlas__panel .ml-gp-lessons--numbered li a', { timeout: 10000 });
  await page.click('.ml-atlas__panel .ml-gp-lessons--numbered li a');
  await page.waitForTimeout(900);
  const url1 = page.url();
  ok(url1.includes('/docs/'), `?ch= 直达后点课进课页（${decodeURIComponent(url1).split('/docs/')[1] || url1}）`);
}

/* ---- /tree 课程家谱 ---- */
await page.goto(`${base}/tree/?l=calculus%2Fchain`, { waitUntil: 'load' });
await page.waitForSelector('.ml-lin__card.is-focus', { timeout: 20000 });
await page.waitForTimeout(600);
const t0 = await page.evaluate(() => ({
  title: document.querySelector('.ml-lin__title')?.textContent || '',
  cards: document.querySelectorAll('.ml-lin__card').length,
  edges: document.querySelectorAll('.ml-lin__edge').length,
}));
ok(t0.title.includes('链式法则'), `?l= 定焦（${t0.title}）`);
ok(t0.cards >= 5 && t0.edges >= 4, `家谱 ${t0.cards} 张卡 / ${t0.edges} 条线`);
const nextTitle = await page.evaluate(() => {
  const b = document.querySelector('button.ml-lin__card');
  const t = b?.querySelector('.ml-lin__ctitle')?.textContent || '';
  b?.click();
  return t;
});
await page.waitForTimeout(600);
const t1 = await page.evaluate(() => ({ q: location.search, title: document.querySelector('.ml-lin__title')?.textContent || '' }));
ok(t1.title === nextTitle && /[?&]l=/.test(t1.q), `单击换焦点并写进地址栏（${t1.title}）`);
await page.goBack();
await page.waitForTimeout(600);
const t2 = await page.evaluate(() => document.querySelector('.ml-lin__title')?.textContent || '');
ok(t2.includes('链式法则'), `浏览器后退回到上一门（${t2}）`);

/* 3.8 全局健康 */
ok(pageErrors.length === 0, `零 pageerror（${pageErrors.length}）`);
ok(consoleErrors.length === 0, `零 console error（${consoleErrors.length}${consoleErrors.length ? '：' + consoleErrors[0] + (badResp.length ? ' ← ' + badResp.join(' | ') : '') : ''}）`);
ok(failedReq.length === 0, `零失败请求（${failedReq.length}${failedReq.length ? '：' + failedReq[0] : ''}）`);

await page.screenshot({ path: path.join(BUILD, '..', '_ai-workspace', 'reports', 'graph-drill-verify.png'), fullPage: false }).catch(() => {});

await browser.close();
if (server) server.close();

console.log(`\n✔ /graph 阶梯版图 + /tree 课程家谱运行时验收 ${notes.length} 项全部通过\n`);
notes.forEach((n) => console.log(n));
if (problems.length) {
  console.error(`\n✘ ${problems.length} 项未过：`);
  problems.forEach((p) => console.error(p));
  process.exit(1);
}

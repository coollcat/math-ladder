#!/usr/bin/env node
/* =========================================================================
 * 知识图谱（/graph）课级钻取 · 运行时验收
 * -------------------------------------------------------------------------
 * 用法：node scripts/check-graph-drill.mjs            （先 npm run build）
 *       BASE=http://127.0.0.1:8099 node scripts/check-graph-drill.mjs   （对着自己起的服务跑）
 *
 * 2026-09-29 第五回路新增（接替已退役的 check-chapters-page.mjs 的岗位）：
 * `npm run build` 只证明「编译得过、SSR 出得来」，钻取的坑全在运行时——
 * fetch 的 URL 拼错、竞态把数据写到错误的章、课点数量对不上、点课点没跳转……
 * 这些构建一律绿灯。所以这里钉的全是肉眼可见的东西：
 *   1. 点击章真的发出了 graph-chapters/NN.json 请求且 200；
 *   2. 课点真的长出来了，数量与该章课数一致；
 *   3. 再点同一章真的收起（课点清零）；
 *   4. 点课点真的跳进课页（SPA 导航）；
 *   5. 全程零 pageerror / console error / 失败请求。
 *
 * 三件纪律（与旧 check-chapters-page 一致，改这个脚本时别破坏）：
 *   1. 检查点钉在「肉眼看到的东西」上，不测内部状态；
 *   2. 坐标必须落在元素的真实矩形里（导语很长，画布在视口 480px 以下）；
 *   3. 依赖缺失就打印「跳过」退出 0——playwright 是可选开发期依赖，不拦构建。
 * ========================================================================= */
import fs from 'node:fs';
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
    /* 已验证带浏览器的两个 npx 缓存优先（hash 目录可能有多个版本，
       字典序扫描会撞到「有包没浏览器」的那份——Executable doesn't exist） */
    'C:/Users/monobehaviour/AppData/Local/npm-cache/_npx/e41f203b7505f1fb',
    'C:/Users/monobehaviour/AppData/Local/npm-cache/_npx/a5b920f00216d246',
  ].filter(Boolean);
  /* npx 缓存目录名是哈希，扫一遍比硬编码稳 */
  const npxRoot = 'C:/Users/monobehaviour/AppData/Local/npm-cache/_npx';
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

const browser = await playwright.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const pageErrors = [];
const consoleErrors = [];
const failedReq = [];
const jsonReqs = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 240));
});
page.on('requestfailed', (r) => failedReq.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => {
  if (/graph-chapters\/\d+\.json/.test(r.url())) jsonReqs.push({ url: r.url(), status: r.status() });
});

await page.goto(`${base}/graph/`, { waitUntil: 'load' });
await page.waitForSelector('.ml-rg__node', { timeout: 20000 });
await page.waitForTimeout(700);

/* 3.1 基本盘：章点在、目录在 */
const s0 = await page.evaluate(() => ({
  nodes: document.querySelectorAll('.ml-rg__node').length,
  dots: document.querySelectorAll('.ml-rg__node .ml-rg__dot').length,
  ldot: document.querySelectorAll('.ml-rg__ldot').length,
}));
ok(s0.nodes >= 60, `章点渲染 ${s0.nodes} 颗（≥60）`);
ok(s0.ldot === 0, `初始无课点（${s0.ldot}）`);

/* 3.2 挑一颗课数在 8–16 之间的章点击（aria-label 里有「N 门课」）——数量适中，断言稳 */
const target = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('.ml-rg__node')];
  for (const g of nodes) {
    const m = (g.getAttribute('aria-label') || '').match(/(\d+) 门课/);
    if (m) {
      const count = Number(m[1]);
      if (count >= 8 && count <= 16) {
        const ch = (g.getAttribute('aria-label') || '').match(/第 (\d+) 章/);
        return { n: ch ? Number(ch[1]) : null, count };
      }
    }
  }
  return null;
});
ok(!!target, `选中测试章（第 ${target?.n} 章，${target?.count} 门课）`);
if (target) {
  const gSel = `.ml-rg__node[aria-label*="第 ${target.n} 章"]`;
  /* SVG hit-testing 坑：<g> 的 bbox 中心常落在空白处，page.click 会被 svg 拦截超时。
     用合成事件（bubbles → React 合成事件照常触发），旧 check-chapters-page 同款解法。 */
  const clickG = () =>
    page.$eval(gSel, (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

  /* 3.3 点击 → fetch 发出且 200 → 课点长出来 */
  await clickG();
  await page.waitForSelector('.ml-rg__ldot', { timeout: 8000 });
  await page.waitForTimeout(600);
  const drillHit = jsonReqs.find((r) => r.url.endsWith(`graph-chapters/${String(target.n).padStart(2, '0')}.json`) && r.status === 200);
  ok(!!drillHit, `graph-chapters/${String(target.n).padStart(2, '0')}.json 请求 200`);
  const s1 = await page.evaluate(() => document.querySelectorAll('.ml-rg__ldot').length);
  ok(s1 === target.count, `课点 ${s1} 颗 === 该章 ${target.count} 门课`);
  ok(s1 > 0 && (await page.$('.ml-rg__dcount')) !== null, '章名课数标签出现');

  /* 3.4 再点同一章 → 收起 */
  await clickG();
  await page.waitForTimeout(400);
  const s2 = await page.evaluate(() => document.querySelectorAll('.ml-rg__ldot').length);
  ok(s2 === 0, `再点同一章收起（剩 ${s2} 颗课点）`);

  /* 3.5 再展开，点课点 → SPA 跳进课页 */
  await clickG();
  await page.waitForSelector('.ml-rg__ldot', { timeout: 8000 });
  await page.waitForTimeout(500);
  const lessonLabel = await page.getAttribute('.ml-rg__ldot', 'aria-label');
  await page.$eval('.ml-rg__ldot', (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.waitForTimeout(900);
  const url1 = page.url();
  ok(url1.includes('/docs/'), `点课点跳进课页（${decodeURIComponent(url1).split('/docs/')[1] || url1}）`);
  ok(!!lessonLabel, `课点带课名（${lessonLabel}）`);

  /* 3.6 回图谱，Esc 收起路径仍在（直接再访问一次） */
  await page.goto(`${base}/graph/`, { waitUntil: 'load' });
  await page.waitForSelector('.ml-rg__node', { timeout: 20000 });
  await clickG();
  await page.waitForSelector('.ml-rg__ldot', { timeout: 8000 });
  /* Esc 的 onKeyDown 挂在 svg 上（tabIndex=0）：真实用户点击 svg 后自然获焦；
     合成事件不聚焦，这里手动聚焦对齐真实路径，再按 Esc。 */
  await page.focus('.ml-rg__svg');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const s3 = await page.evaluate(() => document.querySelectorAll('.ml-rg__ldot').length);
  ok(s3 === 0, `Esc 收起钻取（剩 ${s3} 颗课点）`);
}

/* 3.7 全部炸开：按钮切换 → 1029 课点全铺 → 收回 */
await page.goto(`${base}/graph/`, { waitUntil: 'load' });
await page.waitForSelector('.ml-rg__node', { timeout: 20000 });
const burstBtn = page.locator('.ml-rg__bar button', { hasText: '全部炸开' });
ok((await burstBtn.count()) > 0, '工具条有「全部炸开」按钮（默认章节模式）');
await burstBtn.first().click();
await page.waitForFunction(() => document.querySelectorAll('.ml-rg__ldot').length >= 1000, null, { timeout: 30000 });
const s4 = await page.evaluate(() => document.querySelectorAll('.ml-rg__ldot').length);
ok(s4 >= 1020, `炸开后课点 ${s4} 颗（≥1020，应约 1029）`);
const backBtn = page.locator('.ml-rg__bar button', { hasText: '收回课点' });
ok((await backBtn.count()) > 0, '炸开态按钮文案变「收回课点」');
await backBtn.first().click();
await page.waitForTimeout(400);
const s5 = await page.evaluate(() => document.querySelectorAll('.ml-rg__ldot').length);
ok(s5 === 0, `收回课点回到章节模式（剩 ${s5} 颗课点）`);

/* 3.8 全局健康 */
ok(pageErrors.length === 0, `零 pageerror（${pageErrors.length}）`);
ok(consoleErrors.length === 0, `零 console error（${consoleErrors.length}${consoleErrors.length ? '：' + consoleErrors[0] : ''}）`);
ok(failedReq.length === 0, `零失败请求（${failedReq.length}${failedReq.length ? '：' + failedReq[0] : ''}）`);

await page.screenshot({ path: path.join(BUILD, '..', '_ai-workspace', 'reports', 'graph-drill-verify.png'), fullPage: false }).catch(() => {});

await browser.close();
if (server) server.close();

console.log(`\n✔ /graph 课级钻取运行时验收 ${notes.length} 项全部通过\n`);
notes.forEach((n) => console.log(n));
if (problems.length) {
  console.error(`\n✘ ${problems.length} 项未过：`);
  problems.forEach((p) => console.error(p));
  process.exit(1);
}

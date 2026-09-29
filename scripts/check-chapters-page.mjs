#!/usr/bin/env node
/* =========================================================================
 * 章簇详图（/chapters）运行时验收
 * -------------------------------------------------------------------------
 * 用法：node scripts/check-chapters-page.mjs            （先 npm run build）
 *       BASE=http://127.0.0.1:8099 node scripts/check-chapters-page.mjs   （对着自己起的服务跑）
 *
 * 为什么需要它：`npm run build` 只证明「编译得过、SSR 出得来」。图谱页的坑全在
 * 运行时——变量取不到导致 color-mix 静默失效（整盘退化成黑色）、滚轮缩放绑定丢了、
 * 悬停高亮与面板口径对不上……这些构建一律绿灯。本轮就是这样先做出一版黑圆盘才发现的。
 *
 * 三件纪律（改这个脚本时别破坏）：
 *   1. **检查点必须钉在「肉眼看到的东西」上**：算出来的 fill 到底是不是黑的、
 *      标签的反向缩放到底生效没、面板写着「先修（3）」时画布上到底有没有 3 个绿簇。
 *   2. **坐标要落在元素的真实矩形里**：页面导语很长，画布顶部在视口 480px 以下，
 *      按视口中心点滚轮会落在工具条上——第一次排查就白查了一轮。
 *   3. **依赖缺失就跳过，别报错**：playwright 是可选的开发期依赖（本项目不装它），
 *      找不到就打印一句「跳过」退出 0，不能拦构建。
 * ========================================================================= */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'build');

/* ---- 1. 依赖与产物 ---- */
if (!fs.existsSync(path.join(BUILD, 'chapters', 'index.html'))) {
  console.log('⚠ 跳过：build/chapters/index.html 不存在——先跑 npm run build');
  process.exit(0);
}

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_DIR,
    path.join(ROOT, 'node_modules'),
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
  const port = 8123;
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
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 240));
});
page.on('requestfailed', (r) => failedReq.push(`${r.url()} :: ${r.failure()?.errorText}`));

await page.goto(`${base}/chapters`, { waitUntil: 'load' });
await page.waitForSelector('.ml-cc__svg', { timeout: 20000 });
await page.waitForTimeout(900);

const snap = () =>
  page.evaluate(() => {
    const svg = document.querySelector('.ml-cc__svg');
    const rect = svg.getBoundingClientRect();
    return {
      clusters: document.querySelectorAll('.ml-cc__cluster').length,
      dots: document.querySelectorAll('.ml-cc__dot').length,
      labels: document.querySelectorAll('.ml-cc__label').length,
      rings: document.querySelectorAll('.ml-cc__ring').length,
      edges: document.querySelectorAll('.ml-cc__edge').length,
      outline: document.querySelectorAll('.ml-cc__oitem').length,
      hooks: document.querySelectorAll('.ml-cc__ledge').length,
      zoom: document.querySelector('.ml-cc__zoom')?.textContent,
      far: document.querySelector('.ml-cc__svg g')?.classList.contains('is-far'),
      meta: document.querySelector('.ml-cc__meta')?.textContent,
      viewBox: svg.getAttribute('viewBox'),
      box: { w: Math.round(rect.width), h: Math.round(rect.height) },
    };
  });

/* 3.1 结构数字：SSR 出来的树对不对 */
const s0 = await snap();
ok(s0.clusters === 78, `章簇 78 个（实得 ${s0.clusters}）`);
ok(s0.dots === 1029, `课点 1029 颗（实得 ${s0.dots}）`);
ok(s0.labels === 78, `章名标签 78 个（实得 ${s0.labels}）`);
ok(s0.rings === 6, `环线 6 条（实得 ${s0.rings}）`);
ok(s0.edges === 78, `默认强先修线 78 条（实得 ${s0.edges}）`);
ok(s0.outline === 78, `目录 78 项（圆心 1 + 六环 77，实得 ${s0.outline}）`);
ok(/78 章 · 1029 门课/.test(s0.meta || ''), `统计文案：${s0.meta}`);
ok(s0.viewBox === '-889 -889 1778 1778', `viewBox 1778²（实得 ${s0.viewBox}）`);

/* 3.2 配色真的生效（卷色变量取不到时 color-mix 会静默退回黑色） */
const paint = await page.evaluate(() => {
  const disc = [...document.querySelectorAll('.ml-cc__disc')].map((d) => getComputedStyle(d).fill);
  const hub = [...document.querySelectorAll('.ml-cc__hub')].map((d) => getComputedStyle(d).stroke);
  const dot = [...document.querySelectorAll('.ml-cc__dot')].map((d) => getComputedStyle(d).fill);
  return {
    discKinds: new Set(disc).size,
    black: disc.filter((f) => /^rgba?\(0,\s*0,\s*0/.test(f)).length,
    hubKinds: new Set(hub).size,
    dotKinds: new Set(dot).size,
    swatch: getComputedStyle(document.querySelector('.ml-cc__swatch')).backgroundColor,
  };
});
ok(paint.discKinds >= 6 && paint.black === 0, `章簇按卷上色、无黑色退化（${paint.discKinds} 种，黑 ${paint.black}）`);
ok(paint.hubKinds >= 6 && paint.dotKinds >= 6, `簇心描边与课点同样按卷上色（${paint.hubKinds}/${paint.dotKinds} 种）`);
ok(!/^rgba?\(0,\s*0,\s*0/.test(paint.swatch), `图例色块有颜色：${paint.swatch}`);

/* 3.3 全览：整张图必须真的装得下（MIN_K 卡太高就会「全览不全」） */
const zoomPct = Number((s0.zoom || '0%').replace('%', ''));
const span = (zoomPct / 100) * 1778;
ok(span <= Math.min(s0.box.w, s0.box.h) + 2, `全览装得下：图上 ${span.toFixed(0)}px ≤ 短边 ${Math.min(s0.box.w, s0.box.h)}px`);
ok(s0.far === true, '全览时进入「远」档（章名收起）');

/* 3.4 滚轮缩放 + 文字反向缩放（坐标取 SVG 真实矩形） */
const box = await page.locator('.ml-cc__svg').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -260);
await page.waitForTimeout(500);
const zoomed = await page.evaluate(() => ({
  far: document.querySelector('.ml-cc__svg g').classList.contains('is-far'),
  scale: document.querySelector('[data-lx]')?.getAttribute('transform'),
}));
ok(zoomed.far === false, '滚轮放大后进入「近」档，章名露出来');
ok(/scale\(0?\.\d+\)/.test(zoomed.scale || ''), `标签反向缩放生效：${zoomed.scale}`);

/* 3.5 点选一章：面板、课表、课级连线、高亮口径与面板一致 */
const pickIdx = await page.evaluate(() => {
  const list = [...document.querySelectorAll('.ml-cc__cluster')];
  const i = list.findIndex((el) => el.dataset.ch === '50');
  return i < 0 ? 0 : i;
});
await page.evaluate((i) => {
  document.querySelectorAll('.ml-cc__cluster')[i].dispatchEvent(new MouseEvent('click', { bubbles: true }));
}, pickIdx);
await page.waitForTimeout(500);
const picked = await page.evaluate(() => {
  const panel = document.querySelector('.ml-cc__panel');
  const num = (sel) => panel?.querySelectorAll(sel).length ?? 0;
  return {
    hasPanel: !!panel,
    title: panel?.querySelector('h3')?.textContent,
    lessons: num('.ml-cc__plist--lessons li'),
    linksOk: [...(panel?.querySelectorAll('.ml-cc__plist--lessons a') || [])].every((a) =>
      (a.getAttribute('href') || '').startsWith('/docs/'),
    ),
    cols: num('.ml-cc__pcol'),
    upLabel: panel?.querySelector('.ml-cc__pcol h4')?.textContent,
    downLabel: panel?.querySelectorAll('.ml-cc__pcol h4')[1]?.textContent,
    hooks: document.querySelectorAll('.ml-cc__ledge').length,
    onCluster: document.querySelectorAll('.ml-cc__cluster.is-hot').length,
    up: document.querySelectorAll('.ml-cc__cluster.is-up').length,
    down: document.querySelectorAll('.ml-cc__cluster.is-down').length,
    off: document.querySelectorAll('.ml-cc__cluster.is-off').length,
  };
});
ok(picked.hasPanel && /第 \d+ 章/.test(picked.title || ''), `点选出详情面板：${picked.title}`);
ok(picked.lessons > 0 && picked.linksOk, `面板列出本章课表（${picked.lessons} 门，链接均指向 /docs/）`);
ok(picked.cols === 2, `面板有先修/托起两栏（${picked.upLabel} / ${picked.downLabel}）`);
ok(picked.hooks > 0, `课级连线已画出（${picked.hooks} 条）`);
/* 高亮口径必须与面板一致：面板写几，画布上就得亮几个 */
const upN = Number((picked.upLabel || '').match(/\d+/)?.[0] || -1);
const downN = Number((picked.downLabel || '').match(/\d+/)?.[0] || -1);
ok(picked.up === upN && picked.down === downN, `高亮与面板口径一致（面板 ${upN}/${downN}，画布 ${picked.up}/${picked.down}）`);
ok(picked.onCluster === 1 && picked.off === 78 - 1 - upN - downN, `无关章簇已变淡（off=${picked.off}）`);

/* 3.6 课点悬停、搜索、开关 */
await page.evaluate(() => {
  document.querySelector('.ml-cc__dot')?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
});
await page.waitForTimeout(250);
const tip = await page.evaluate(() => {
  const t = document.querySelector('.ml-cc__tip');
  return { display: t?.style.display, text: t?.querySelector('.ml-cc__tiptext')?.textContent };
});
ok(tip.display !== 'none' && /章 ·/.test(tip.text || ''), `课点悬停出提示：「${tip.text}」`);

const search = async (kw) => {
  await page.fill('.ml-cc__search', kw);
  await page.waitForTimeout(360);
  return page.evaluate(() => ({
    meta: document.querySelector('.ml-cc__meta')?.textContent,
    list: document.querySelectorAll('.ml-cc__oitem.is-hit').length,
    svg: document.querySelectorAll('.ml-cc__cluster.is-hit').length,
  }));
};
const byCh = await search('傅里叶');
ok(/命中/.test(byCh.meta || '') && byCh.list === byCh.svg, `搜章名命中且两处一致：${byCh.meta}（${byCh.list}）`);
const byLsn = await search('吉布斯');
ok(/命中/.test(byLsn.meta || ''), `搜课名也能命中：${byLsn.meta}`);
const none = await search('zzz-不存在');
ok(none.meta === '无结果', `无结果提示：${none.meta}`);
await page.fill('.ml-cc__search', '');

const chips = await page.locator('.ml-cc__chip input').all();
await chips[2].check();
await page.waitForTimeout(400);
const weakOn = await page.evaluate(() => document.querySelectorAll('.ml-cc__edge').length);
ok(weakOn === 312, `打开交叉引用后章级边 312 条（实得 ${weakOn}）`);
await chips[2].uncheck();
await chips[1].uncheck();
await page.waitForTimeout(300);
const dotsOff = await page.evaluate(() => document.querySelectorAll('.ml-cc__dot').length);
ok(dotsOff === 0, '课点开关能收起全部课点');
await chips[1].check();

/* 3.7 旧页面没被碰坏 */
const page2 = await ctx.newPage();
const err2 = [];
page2.on('pageerror', (e) => err2.push(String(e).slice(0, 200)));
await page2.goto(`${base}/graph`, { waitUntil: 'load' });
await page2.waitForSelector('.ml-rg__svg', { timeout: 20000 });
await page2.waitForTimeout(700);
const graph = await page2.evaluate(() => ({
  dots: document.querySelectorAll('.ml-rg__dot').length,
  rings: document.querySelectorAll('.ml-rg__ring').length,
  link: !!document.querySelector('a[href="/chapters"]'),
}));
ok(graph.dots > 60 && graph.rings === 6, `/graph 完好：${graph.dots} 颗圆点 / ${graph.rings} 环`);
ok(graph.link, '/graph 导语里有 /chapters 入口');

await page2.goto(`${base}/`, { waitUntil: 'load' });
await page2.waitForTimeout(800);
const home = await page2.evaluate(() => [...document.querySelectorAll('a[href="/chapters"]')].length);
ok(home > 0, `首页有 /chapters 入口（${home} 处）`);

await page2.goto(`${base}/tree`, { waitUntil: 'load' });
await page2.waitForTimeout(800);
const tree = await page2.evaluate(() => ({
  pills: document.querySelectorAll('.ml-fg__node').length,
  link: !!document.querySelector('a[href="/chapters"]'),
}));
ok(tree.pills > 60, `/tree 完好：${tree.pills} 个胶囊`);
ok(tree.link, '/tree 导语里有 /chapters 入口');

/* 3.8 零报错 */
ok(err2.length === 0, `旧页面无 JS 报错${err2.length ? '：' + err2[0] : ''}`);
ok(pageErrors.length === 0, `无 JS 运行时异常${pageErrors.length ? '：' + pageErrors[0] : ''}`);
ok(consoleErrors.length === 0, `无控制台 error${consoleErrors.length ? '：' + consoleErrors[0] : ''}`);
ok(failedReq.length === 0, `无失败请求${failedReq.length ? '：' + failedReq[0] : ''}`);

await browser.close();
if (server) await new Promise((resolve) => server.close(resolve));

/* ---- 4. 报告 ---- */
notes.forEach((n) => console.log(n));
if (problems.length) {
  console.log('');
  problems.forEach((p) => console.log(p));
  console.log(`\n共 ${problems.length} 项未通过。\n`);
  process.exit(1);
}
console.log(`\n✔ /chapters 运行时验收 ${notes.length} 项全部通过\n`);

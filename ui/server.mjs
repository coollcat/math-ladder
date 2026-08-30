/* 数学阶梯 · 新 UI 服务器（node 原生 http，无框架）
 * 用法：node ui/server.mjs --skin fluent --port 9453
 * 自扫 docs/ 构建 meta，/api/lesson 按需渲染并缓存；两个实例均可访问整个 ui/ 静态目录。
 */
import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter, renderMarkdown, chNum, stripNum } from './render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

/* ---------- 启动参数 ---------- */
function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : dflt;
}
const SKIN = arg('skin', 'fluent');
const PORT = parseInt(arg('port', '9453'), 10);
const MAIN_URL = arg('main', 'http://localhost:9452');

/* ---------- 卷册划分（与 src/components/ml-home/data.js 保持一致） ---------- */
const VOLUMES = [
  { n: '卷一', title: '数学地基', range: '00–16 章', status: 'done', statusLabel: '已完工', desc: '从数量直觉一路长出函数、微积分、级数与傅里叶枢纽站。' },
  { n: '卷二', title: '高等数学核心', range: '18–26 章', status: 'plan', statusLabel: '规划中', desc: '数学语言与证明、实分析、多元微积分、微分方程到泛函分析。' },
  { n: '卷三', title: '离散数学与计算', range: '27–35 章', status: 'plan', statusLabel: '规划中', desc: '逻辑、组合、图论、算法、自动机、密码学与编码理论。' },
  { n: '卷四', title: '概率统计与信息', range: '36–42 章', status: 'plan', statusLabel: '规划中', desc: '概率进阶、随机过程、统计推断、贝叶斯、信息论与因果推断。' },
  { n: '卷五', title: '应用 AI 与前沿', range: '43–65 章', status: 'plan', statusLabel: '规划中', desc: '优化、深度学习、Transformer、生成模型、强化学习等前沿章。' },
];
function volumeOf(ch) {
  if (ch < 18) return 0;
  if (ch <= 26) return 1;
  if (ch <= 35) return 2;
  if (ch <= 42) return 3;
  return 4;
}

/* ---------- 扫描 docs/ ---------- */
async function scanDocs() {
  const dirs = (await readdir(DOCS))
    .filter((d) => /^\d+/.test(d) && !d.includes('.'))
    // 17 章是「下一程导读」章：只存在于主站随卷阅读流，不进 ui 目录页与图谱
    .filter((d) => !d.startsWith('17-'));
  dirs.sort((a, b) => chNum(a) - chNum(b));

  const chapters = [];
  const flatLessons = []; // 图谱用扁平课表

  for (const dir of dirs) {
    const files = await readdir(path.join(DOCS, dir));
    // COMPONENT_SPEC.md 是章内未来组件规格（draft 内部文档），显式排除，
    // 不依赖 `/^\d+-/` 正则的巧合过滤（否则 NN-xxx-spec.md 之类的内部文档会泄漏到读者端）。
    const mdFiles = files.filter(
      (f) =>
        f.endsWith('.md') &&
        f !== 'COMPONENT_SPEC.md' &&
        // 999-references 是每章「参考资料」维护型条目（含受登录门禁的 paper 卡片），
        // 独立阅读前端不收录，口径与 gen-graph.mjs 对齐
        f !== '999-references.md',
    );
    const indexFile = mdFiles.find((f) => f === 'index.md');
    const lessonsFiles = mdFiles
      .filter((f) => /^\d+-.*\.md$/.test(f))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    let chTitle = '', chDesc = '';
    if (indexFile) {
      const { fm } = parseFrontMatter(await readFile(path.join(DOCS, dir, indexFile), 'utf8'));
      chTitle = fm.title || dir;
      chDesc = fm.description || '';
    }

    const lessons = [];
    if (indexFile) lessons.push({ id: `${dir}/index`, file: 'index.md', title: chTitle || dir, prereqs: [], isIndex: true });
    for (const f of lessonsFiles) {
      const { fm } = parseFrontMatter(await readFile(path.join(DOCS, dir, f), 'utf8'));
      if (fm.draft) continue; // 占位课不入读者目录（与 Docusaurus 侧三脚本口径对齐）
      const num = parseInt(f, 10);
      lessons.push({ id: `${dir}/${f.replace(/\.md$/, '')}`, file: f, num, title: fm.title || f, prereqs: Array.isArray(fm.prereqs) ? fm.prereqs : [], isIndex: false });
    }
    for (const l of lessons) {
      if (l.isIndex) continue;
      flatLessons.push({ ...l, chDir: dir });
    }

    chapters.push({ dir, n: chNum(dir), slug: stripNum(dir), title: chTitle || dir, desc: chDesc, volume: volumeOf(chNum(dir)), lessons });
  }

  // 先修边：lesson_id（目录剥号slug/课程slug）→ 扫描 id 换算后连边
  const lidMap = new Map();
  for (const c of chapters) {
    for (const l of c.lessons) {
      if (l.isIndex) continue;
      lidMap.set(`${stripNum(c.dir)}/${l.id.split('/')[1].replace(/^\d+-/, '')}`, l.id);
    }
  }
  const flatPos = new Map(flatLessons.map((x, i) => [x.id, i]));
  const edges = [];
  for (let i = 0; i < flatLessons.length; i++) {
    for (const p of flatLessons[i].prereqs) {
      const t = lidMap.get(p);
      if (t && t !== flatLessons[i].id && flatPos.has(t)) {
        edges.push([i, flatPos.get(t)]);
      }
    }
  }

  const stats = { chapters: chapters.length, lessons: flatLessons.length, edges: edges.length };
  return { chapters, flatLessons, edges, stats };
}

let DB = null;
async function getDB() {
  if (!DB) DB = await scanDocs();
  return DB;
}

/* ---------- 课程正文渲染 ---------- */
const lessonCache = new Map();
async function renderLesson(id) {
  const [dir, file] = id.split('/');
  if (!dir || !file || !/^\d+/.test(dir)) throw Object.assign(new Error('bad id'), { status: 400 });
  const fp = path.join(DOCS, dir, (file === 'index' ? 'index' : file) + '.md');
  const raw = await readFile(fp, 'utf8');
  const { fm, body } = parseFrontMatter(raw);
  const html = renderMarkdown(id, dir, body, fm.title || '');
  const db = await getDB();

  // 章内 prev/next（含章首页参与排序）
  const ch = db.chapters.find((c) => c.dir === dir);
  const idx = ch.lessons.findIndex((l) => l.id === id);
  const prev = idx > 0 ? { id: ch.lessons[idx - 1].id, title: ch.lessons[idx - 1].title } : null;
  const next = idx < ch.lessons.length - 1 ? { id: ch.lessons[idx + 1].id, title: ch.lessons[idx + 1].title } : null;

  // 前置课：lesson_id key → 扫描 id 反查
  const lessonMeta = ch.lessons.find((l) => l.id === id) || {};
  const lidReverse = new Map();
  for (const c of db.chapters) {
    for (const l of c.lessons) {
      if (l.isIndex) continue;
      lidReverse.set(l.id, `${stripNum(c.dir)}/${l.file.replace(/\.md$/, '').replace(/^\d+-/, '')}`);
    }
  }
  const prereqTargets = [];
  if (lessonMeta.prereqs && lessonMeta.prereqs.length) {
    for (const c of db.chapters) {
      for (const l of c.lessons) {
        if (l.isIndex) continue;
        if (lessonMeta.prereqs.includes(lidReverse.get(l.id))) prereqTargets.push({ id: l.id, title: l.title });
      }
    }
  }

  const mainLink = `http://localhost:9452/docs/${stripNum(dir)}${file === 'index' ? '' : '/' + stripNum(file)}`;

  return {
    ok: true, id, dir,
    title: fm.title || lessonMeta.title || id,
    description: fm.description || '',
    chapter: { dir, title: ch ? ch.title : dir },
    html, prev, next, prereqs: prereqTargets, mainLink,
    interactive: {
      quiz: (html.match(/data-mlq/g) || []).length,
      exercise: (html.match(/ml-exercise"/g) || []).length,
      viz: (html.match(/ml-viz"/g) || []).length,
    },
  };
}

/* ---------- HTTP ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}
function sendErr(res, code, msg) { send(res, code, JSON.stringify({ ok: false, error: msg })); }

/** ui/ 静态文件（跨皮肤共用：两个端口都指向同一份 ui 目录） */
async function serveStatic(res, urlPath) {
  const rel = urlPath.replace(/^\/+/, '');
  const base = path.join(ROOT, 'ui');
  const abs = path.resolve(base, rel);
  if (!abs.startsWith(base)) return sendErr(res, 403, 'forbidden');
  try {
    const buf = await readFile(abs);
    send(res, 200, buf, MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream');
    return true;
  } catch {
    return false;
  }
}

async function handle(req, res) {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = u.pathname;

  if (p === '/') {
    res.writeHead(302, { Location: `/${SKIN}/index.html` });
    res.end();
    return;
  }

  if (p === '/api/meta') {
    const db = await getDB();
    send(res, 200, JSON.stringify({
      ok: true, site: '数学阶梯', mainUrl: MAIN_URL, volumes: VOLUMES,
      chapters: db.chapters, stats: db.stats,
      flat: db.flatLessons, edges: db.edges, // 图谱视图用
    }));
    return;
  }

  if (p === '/api/lesson') {
    const id = u.searchParams.get('id') || '';
    try {
      let out;
      if (lessonCache.has(id)) out = lessonCache.get(id);
      else {
        out = await renderLesson(id);
        if (lessonCache.size < 120) lessonCache.set(id, out);
      }
      send(res, 200, JSON.stringify(out));
    } catch (e) {
      sendErr(res, e.status || 500, e.code === 'ENOENT' ? 'lesson not found' : String(e.message));
    }
    return;
  }

  if (p.startsWith('/vendor/')) {
    // /vendor/* → node_modules/katex/dist/*（katex.min.css 及其 fonts/ 字体目录）
    const rest = p.replace(/^\/vendor\//, '');
    try {
      const buf = await readFile(path.join(ROOT, 'node_modules/katex/dist', rest));
      send(res, 200, buf, MIME[path.extname(rest)] || 'application/octet-stream');
    } catch {
      sendErr(res, 404, 'vendor not found');
    }
    return;
  }

  if (await serveStatic(res, p)) return;
  sendErr(res, 404, 'not found: ' + p);
}

getDB()
  .then((db) => {
    http.createServer(handle).listen(PORT, '::', () => {
      console.log(`[math-ladder-ui] skin=${SKIN} http://localhost:${PORT}  (${db.stats.chapters} 章 / ${db.stats.lessons} 课 / ${db.stats.edges} 先修线)`);
    });
  })
  .catch((e) => {
    console.error('[math-ladder-ui] 启动失败：', e);
    process.exit(1);
  });

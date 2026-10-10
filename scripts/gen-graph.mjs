#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.join(scriptDir, '..', 'docs');
const outFile = path.join(scriptDir, '..', 'src', 'components', 'ml-home', 'full-graph-data.js');

const TRACKED_BUILTINS = ['abs', 'sum', 'min', 'max', 'round', 'pow', 'divmod'];

function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  let key = null;
  for (const line of match[1].split(/\r?\n/)) {
    const bullet = line.match(/^\s*-\s*(.+)$/);
    if (bullet && key && Array.isArray(data[key])) {
      data[key].push(bullet[1].trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    key = kv[1];
    const raw = kv[2].trim();
    const inline = raw.match(/^\[(.*)\]$/);
    if (inline) {
      data[key] = inline[1]
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      key = null;
    } else if (raw === '') {
      data[key] = [];
    } else {
      data[key] = raw.replace(/^["']|["']$/g, '');
      key = null;
    }
  }
  return data;
}

function maskCode(lines) {
  return lines.map((line) => {
    let quote = null;
    let triple = null;
    let out = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (triple) {
        if (line.slice(i, i + 3) === triple) {
          triple = null;
          i += 2;
        }
        continue;
      }
      if (quote) {
        if (ch === '\\') {
          i++;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '#') break;
      if (ch === '"' || ch === "'") {
        if (line.slice(i, i + 3) === ch.repeat(3)) {
          triple = ch.repeat(3);
          i += 2;
        } else {
          quote = ch;
        }
        continue;
      }
      out += ch;
    }
    return out;
  });
}

function pythonBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let fence = null;
  let current = null;
  for (const line of lines) {
    if (!current) {
      const open = line.match(/^(`{3,})\s*(?:python3?|exercise)\b/);
      if (open) {
        fence = open[1];
        current = [];
      }
    } else if (new RegExp('^' + fence + '{1,}\\s*$').test(line)) {
      blocks.push(current);
      current = null;
      fence = null;
    } else {
      current.push(line);
    }
  }
  return blocks;
}

function expandRoot(root) {
  const parts = root.split('.');
  return parts.map((_, i) => parts.slice(0, i + 1).join('.'));
}

function collectLessons(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectLessons(full, out);
    else if (entry.name === 'COMPONENT_SPEC.md') continue;
    else if (/\.mdx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function shortTitle(title) {
  return title.length > 10 ? title.slice(0, 7) + '…' : title;
}

function collectUses(text, allowed) {
  const uses = new Set();
  for (const block of pythonBlocks(text)) {
    maskCode(block).forEach((line) => {
      for (const match of line.matchAll(/\bmath\.([A-Za-z_]\w*)/g)) {
        const name = 'math.' + match[1];
        if (allowed.has(name)) uses.add(name);
      }
      for (const name of TRACKED_BUILTINS) {
        if (allowed.has(name) && new RegExp(`(?<![\\w.])${name}\\s*\\(`).test(line)) uses.add(name);
      }
      const imported = line.match(/^\s*(?:from\s+([A-Za-z_][\w.]*)|import\s+(.+))$/);
      if (imported) {
        const roots = imported[1]
          ? [imported[1]]
          : imported[2].split(',').map((item) => item.trim().split(/\s+as\s+/)[0].trim());
        roots.filter(Boolean).forEach((root) => {
          if (allowed.has(root)) uses.add(root);
        });
      }
    });
  }
  return [...uses];
}

const files = collectLessons(docsRoot)
  .map((file) => path.relative(docsRoot, file).split(path.sep).join('/'))
  .filter(
    (rel) =>
      rel.includes('/') &&
      !/(^|\/)index\.mdx?$/.test(rel) &&
      !/(^|\/)COMPONENT_SPEC\.md$/.test(rel) &&
      // 17 章是「下一程导读」章：只随卷阅读，不进知识图谱 / 知识树 / 首页统计
      !rel.startsWith('17-') &&
      // 999-references 是每章「参考资料」维护型条目（gen-references.mjs 产物）：同等待遇
      !/(^|\/)999-references\.md$/.test(rel),
  )
  .sort((a, b) => a.localeCompare(b));

const lessons = files.map((rel) => {
  const text = fs.readFileSync(path.join(docsRoot, rel), 'utf8').replace(/^\uFEFF/, '');
  const fm = parseFrontMatter(text);
  const physicalSegments = rel.replace(/\.mdx?$/, '').split('/');
  const segments = physicalSegments.map((segment) => segment.replace(/^\d+-/, ''));
  const base = segments.at(-1);
  const physicalBase = physicalSegments.at(-1);
  const physicalDir = physicalSegments.length > 1 ? physicalSegments.at(-2) : '';
  const stripped = base === 'index' ? '' : base.replace(/^\d+-/, '');
  const autoId = (segments.length > 1 ? segments.slice(0, -1).join('/') + '/' : '') + stripped;
  const id = typeof fm.lesson_id === 'string' ? fm.lesson_id : autoId;
  const chNum = physicalDir.match(/^(\d+)/) ? parseInt(physicalDir.match(/^(\d+)/)[1], 10) : -1;
  const ord = physicalBase === 'index.md'
    ? -1
    : physicalBase.match(/^(\d+)/)
      ? parseInt(physicalBase.match(/^(\d+)/)[1], 10)
      : 0;

  const born = [
    ...(Array.isArray(fm.introduces_math) ? fm.introduces_math : []),
    ...(Array.isArray(fm.introduces_builtin) ? fm.introduces_builtin : []),
    ...(Array.isArray(fm.introduces_import) ? fm.introduces_import : []),
  ];
  const seenBorn = new Set();
  const uniqueBorn = born.filter((tool) => !seenBorn.has(tool) && seenBorn.add(tool));

  return {
    rel,
    draft: fm.draft === true || fm.draft === 'true',
    id,
    ch: chNum,
    ord,
    prereqs: Array.isArray(fm.prereqs) ? fm.prereqs : [],
    title: fm.title || rel,
    short: shortTitle(fm.title || rel),
    to: `/docs/${segments.join('/')}`,
    born: uniqueBorn,
    text,
    uses: [],
  };
}).filter((lesson) => !lesson.draft);

lessons.sort((a, b) => a.ch - b.ch || a.ord - b.ord || a.rel.localeCompare(b.rel));
const availableTools = new Set();
for (const lesson of lessons) {
  lesson.born.forEach((tool) => availableTools.add(tool));
  lesson.uses = collectUses(lesson.text, availableTools);
}

const parents = lessons.map(() => []);
const rawEdges = [];
for (let i = 0; i < lessons.length; i++) {
  for (const ref of lessons[i].prereqs) {
    const parent = lessons.findIndex((lesson) =>
      lesson.id === ref || lesson.id.endsWith('/' + ref),
    );
    if (parent >= 0 && parent !== i) rawEdges.push([parent, i]);
  }
}

function hasAlternativePath(from, to, skippedEdge) {
  const stack = [from];
  const seen = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (current === to) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const [a, b] of rawEdges) {
      if (a === current && !(a === skippedEdge[0] && b === skippedEdge[1])) stack.push(b);
    }
  }
  return false;
}

const edges = rawEdges.filter(([a, b]) => !hasAlternativePath(a, b, [a, b]));
for (const [parent, child] of edges) parents[child].push(parent);

const depth = lessons.map(() => 0);
function calculateDepth(i) {
  if (depth[i]) return depth[i];
  const deps = parents[i];
  depth[i] = deps.length ? Math.max(...deps.map(calculateDepth)) + 1 : 1;
  return depth[i];
}
lessons.forEach((_, i) => calculateDepth(i));

function ancestorsOf(i, cache = new Map()) {
  if (cache.has(i)) return cache.get(i);
  const result = new Set();
  for (const parent of parents[i]) {
    result.add(parent);
    for (const grandparent of ancestorsOf(parent, cache)) result.add(grandparent);
  }
  cache.set(i, result);
  return result;
}

const ancestryCache = new Map();
const flowMap = new Map();
lessons.forEach((lesson, i) => {
  const ancestors = [...ancestorsOf(i, ancestryCache)].sort((a, b) => depth[b] - depth[a]);
  for (const tool of lesson.uses) {
    const birth = ancestors.find((j) => lessons[j].born.includes(tool));
    if (birth == null) continue;
    const key = birth + '>' + i;
    if (!flowMap.has(key)) flowMap.set(key, []);
    flowMap.get(key).push(tool);
  }
});

/* -------------------------------------------------------------------------
 * 章级元数据：章节信息的唯一事实来源（CHAPTER_INFO）
 * -------------------------------------------------------------------------
 * 源头是各章自己的 index.md（docs 里每个章目录下的那一份）的 front matter
 * （title / short / volume），不是 UI 里手抄的第二份表。
 *
 * 为什么要有这一段：src/components/ml-home/data.js 此前用两张**手写 Map**
 * （CH_TITLES / CH_SHORT）维护 18–78 章的标题与短名，改动课表时极易漏改——
 * 66/67 章就真的漏过，导致图谱 tooltip 退化成「66 章」「67 章」；
 * 1–16 章的标题又只活在另一张手写数组 CHAPTER_META 里，同一件事两份口径。
 * 生成一份出来，UI 只消费、不手抄，章名改在章首页，跑一次生成器全站同步。
 *
 * 口径与 NODES/EDGES 完全一致：第 17 章（下一程导读）排除，
 * 第 0 章（Python 工具箱）保留。 */
const chapterDirs = fs
  .readdirSync(docsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d+-/.test(entry.name))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

const chapterInfo = [];
const chapterWarn = [];
for (const dir of chapterDirs) {
  if (dir.startsWith('17-')) continue; /* 导览章：不入图谱 / 知识树 / 首页统计 */
  const n = parseInt(dir.match(/^(\d+)/)[1], 10);
  const indexPath = path.join(docsRoot, dir, 'index.md');
  if (!fs.existsSync(indexPath)) {
    chapterWarn.push(`${dir}：缺 index.md，该章未进入 CHAPTER_INFO`);
    continue;
  }
  const fm = parseFrontMatter(fs.readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, ''));
  const rawTitle = typeof fm.title === 'string' ? fm.title : '';
  /* 「第 N 章 · 」是章首页标题的排版前缀，不是章名本身，脱掉 */
  const title = rawTitle.replace(/^第\s*\d+\s*章\s*[·:：\-]?\s*/, '').trim() || rawTitle || dir;
  const short =
    (typeof fm.short === 'string' && fm.short.trim()) ||
    (title.length > 6 ? title.slice(0, 6) : title);
  const count = lessons.filter((lesson) => lesson.ch === n).length;
  if (!count) chapterWarn.push(`${dir}：图谱里 0 门课（全标了 draft？）`);
  if (!fm.volume) chapterWarn.push(`${dir}：front matter 缺 volume，章属卷号在 UI 里会算不出来`);
  chapterInfo.push({
    n,
    dir,
    to: `/docs/${dir.replace(/^\d+-/, '')}/`,
    title,
    short,
    volume: Number(fm.volume) || 0,
    lessons: count,
  });
}
/* 反向体检：图谱里有课、却没有对应章首页的章号 */
const knownCh = new Set(chapterInfo.map((c) => c.n));
const orphanCh = [...new Set(lessons.map((lesson) => lesson.ch))].filter((ch) => !knownCh.has(ch));
if (orphanCh.length) chapterWarn.push(`图谱含章的课但 CHAPTER_INFO 里没有：${orphanCh.join(', ')}`);

const nodesJson = JSON.stringify(lessons.map(({ rel, id, ch, ord, title, short, to, born, uses }) => ({
  id, ch, ord, title, short, to, born, uses,
})));
const edgesJson = JSON.stringify(edges);
const useAggJson = JSON.stringify([...flowMap.entries()].map(([key, tools]) => {
  const [a, b] = key.split('>').map(Number);
  return [a, b, tools];
}));
const depthJson = JSON.stringify(depth);
const chapterJson = chapterInfo.map((chapter) => JSON.stringify(chapter)).join(',\n');

const output = `/* 自动生成：node scripts/gen-graph.mjs。请勿手改。 */
export const NODES = ${nodesJson};
export const EDGES = ${edgesJson};
export const USE_AGG = ${useAggJson};
export const DEPTH = ${depthJson};

/* 章级元数据：来自各章 index.md 的 front matter（title / short / volume）。
   全站章节名的唯一事实来源——首页、知识树、图谱都从这里取，别再手写第二份。 */
export const CHAPTER_INFO = [
${chapterJson},
];
`;
fs.writeFileSync(outFile, output.replace(/\}\],/g, '}],\n').replace(/\n/g, '\n'), 'utf8');
console.log(`✔ 已生成 ${path.relative(process.cwd(), outFile)}（${lessons.length} 门课 / ${edges.length} 条先修线 / ${chapterInfo.length} 章）`);

/* ---------- 首屏挂件数据：按课拆分的静态 JSON + 总课数 ----------
   右栏挂件（TOCItems 的进度条 + PrereqPanel 的前置知识面板）是 theme 级组件，
   每个文档页都会打进首屏。它们只需要两样东西：总课数、以及
   「本课自己的 prereqs 指向的课」的 id -> {to, title}。

   直接让它们 import full-graph-data.js 的话，全量 NODES/EDGES/USE_AGG（约 317 KB）
   会跟着进 main.js，实测占首屏 JS 的 31%。早期（2026-09-29）的解法是另出一份
   prereq-index.js，把 83 KB 的精简索引打进每个文档页的 bundle；对「一页只用
   其中 1 到 5 条」的访问模式仍是净浪费（传输、parse、eval 三遍都省不掉）。

   现在改成按课拆分的静态 JSON（static/prereqs/<课id>.json，每份 0.1 到 0.4 KB），
   PrereqPanel 挂载后按当前课 id fetch 自己那一份；总课数进一个只有常量的
   lesson-count.js（约 40 字节，tree-shake 成字面量，SSR 首屏就能显示）。

   与旧 prereq-index.js 同源同口径（都从 lessons[].prereqs 解析），仍是
   npm run gen:graph 的手动生成物，别手改。 */
const byId = new Map(lessons.map((l) => [l.id, l]));
const resolveRef = (ref) => {
  const id = String(ref).replace(/\.md$/, '');
  return byId.get(id) || lessons.find((l) => l.id.endsWith('/' + id)) || null;
};
const prereqMiss = [];
const prereqOutDir = path.join(scriptDir, '..', 'static', 'prereqs');
fs.rmSync(prereqOutDir, { recursive: true, force: true });
fs.mkdirSync(prereqOutDir, { recursive: true });

let prereqRefs = 0;
for (const lesson of lessons) {
  const items = [];
  for (const ref of lesson.prereqs) {
    prereqRefs += 1;
    const hit = resolveRef(ref);
    if (hit) items.push({ id: hit.id, to: hit.to, title: hit.title });
    else prereqMiss.push(`${lesson.id} -> ${ref}`);
  }
  const outFile = path.join(prereqOutDir, `${lesson.id}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ prereqs: items }), 'utf8');
}
console.log(
  `✔ 已生成 static/prereqs/（${lessons.length} 份按课索引 / ${prereqRefs} 条先修引用）`,
);
if (prereqMiss.length) console.log(`  ⚠ prereqs 指向了图谱里不存在的课：${prereqMiss.join(', ')}`);

/* 总课数单独一个常量文件：TOCItems 的进度条要 SSR 首屏显示「已学 x / N 节」，
   不能走异步 fetch（水合前会闪一下 0/N）。文件只导出一个数字。 */
const countOutFile = path.join(scriptDir, '..', 'src', 'components', 'ml-home', 'lesson-count.js');
fs.writeFileSync(
  countOutFile,
  `/* 自动生成：node scripts/gen-graph.mjs。请勿手改。
   全站正式课总数（TOCItems 进度条用，SSR 首屏就要有，所以是编译期常量而非 fetch）。 */
export const LESSON_COUNT = ${lessons.length};
`,
  'utf8',
);
console.log(`✔ 已生成 ${path.relative(process.cwd(), countOutFile)}（LESSON_COUNT = ${lessons.length}）`);

if (chapterWarn.length) {
  console.log(`⚠ 章节元数据 ${chapterWarn.length} 条提示：`);
  chapterWarn.forEach((w) => console.log('  · ' + w));
}

#!/usr/bin/env node
/* =========================================================================
 * 章节信息同步闸门
 * -------------------------------------------------------------------------
 * 用法：node scripts/check-chapter-sync.mjs
 *
 * 拦的是这一类静默漂移：**改了章首页，却忘了重新生成图谱数据**。
 * 站内的章节名只有一个源头——各章 index.md 的 front matter（title / short /
 * volume）——经由 scripts/gen-graph.mjs 落进 src/components/ml-home/
 * full-graph-data.js 的 CHAPTER_INFO，首页、知识树、图谱都从这里取。
 * 于是「生成物过期」是这套设计唯一的故障模式，本脚本专门盯它。
 *
 * 检查五件事：
 *   ① 章首页是否备齐 short 与 volume（没有源头就谈不上同步）；
 *   ② CHAPTER_INFO 与 docs 的章号集合双向一致；
 *   ③ 逐章比对 title / short / volume / to / 课数（不一致 = 生成物过期）；
 *   ④ 课数三方对账：docs 文件数 ↔ CHAPTER_INFO ↔ NODES；
 *   ⑤ 回归检查：src/ 里不许再长出第二份手写章表（CH_TITLES / CH_SHORT）。
 *
 * 口径（与 gen-graph.mjs、validate.mjs 一致，写在这里免得又各写一份）：
 *   第 17 章是「下一程导读」导览章，不属任何卷，不进图谱 / 知识树 / 首页统计。
 * ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const DATA_FILE = path.join(ROOT, 'src/components/ml-home/full-graph-data.js');
const GUIDE_CH = 17;
const VOLUMES = new Set(['1', '2', '3', '4', '5', '6', '7']);
const SKIP_FILE = new Set(['index.md', 'COMPONENT_SPEC.md']);

const errors = [];
const warns = [];

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
    if (raw === '') data[key] = [];
    else data[key] = raw.replace(/^["']|["']$/g, '');
  }
  return data;
}

const stripPrefix = (title) => title.replace(/^第\s*\d+\s*章\s*[·:：\-]?\s*/, '').trim();

/* ---- 一、docs 侧真值 ---- */
const truth = new Map();
for (const dir of fs.readdirSync(DOCS).sort()) {
  const full = path.join(DOCS, dir);
  if (!/^\d+-/.test(dir) || !fs.statSync(full).isDirectory()) continue;
  const n = parseInt(dir.match(/^(\d+)/)[1], 10);
  const idx = path.join(full, 'index.md');
  if (!fs.existsSync(idx)) {
    errors.push(`${dir}：缺 index.md，该章没有章节信息的源头`);
    continue;
  }
  const fm = parseFrontMatter(fs.readFileSync(idx, 'utf8').replace(/^\uFEFF/, ''));
  const rawTitle = typeof fm.title === 'string' ? fm.title : '';
  if (!rawTitle) errors.push(`${dir}：index.md front matter 缺 title`);
  const short = typeof fm.short === 'string' ? fm.short.trim() : '';
  if (!short) errors.push(`${dir}：index.md front matter 缺 short（章节短名唯一源头）`);
  const volume = Number(fm.volume) || 0;
  if (n === GUIDE_CH) {
    if (volume) warns.push(`${dir}：导览章本不属任何卷，却写了 volume: ${volume}`);
  } else if (!VOLUMES.has(String(volume))) {
    errors.push(`${dir}：index.md front matter 的 volume ${fm.volume ?? '(缺失)'} 不是 1–7，章属卷号定不下来`);
  }
  const lessons = fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.md') && !SKIP_FILE.has(f) && !/-references\.md$/.test(f)).length;
  truth.set(n, { dir, title: stripPrefix(rawTitle) || rawTitle, short, volume, lessons });
}

/* ---- 二、生成物侧 ---- */
if (!fs.existsSync(DATA_FILE)) {
  console.log('✗ 找不到生成数据 src/components/ml-home/full-graph-data.js——先跑 node scripts/gen-graph.mjs');
  process.exit(1);
}
const { CHAPTER_INFO = [], NODES = [] } = await import(pathToFileURL(DATA_FILE).href);
const info = new Map(CHAPTER_INFO.map((c) => [c.n, c]));

/* ---- 三、章号集合双向对账 ---- */
for (const [n, t] of truth) {
  if (info.has(n)) continue;
  if (n === GUIDE_CH) continue; /* 口径内排除，不算缺口 */
  errors.push(`第 ${n} 章（${t.dir}）在 docs 里，却不在 CHAPTER_INFO 里——跑 node scripts/gen-graph.mjs 重新生成`);
}
for (const n of info.keys()) {
  if (!truth.has(n)) errors.push(`第 ${n} 章在 CHAPTER_INFO 里，docs 里却没有这个章目录——生成物过期了`);
}

/* ---- 四、逐字段比对 ---- */
const fieldDiffs = [];
const lessonCnt = new Map();
NODES.forEach((node) => lessonCnt.set(node.ch, (lessonCnt.get(node.ch) || 0) + 1));

for (const [n, c] of [...info].sort((a, b) => a[0] - b[0])) {
  const t = truth.get(n);
  if (!t) continue;
  const label = `第 ${String(n).padStart(2, '0')} 章`;
  if (c.title !== t.title) fieldDiffs.push(`${label} title：docs「${t.title}」 vs 生成物「${c.title}」`);
  if (c.short !== t.short) fieldDiffs.push(`${label} short：docs「${t.short}」 vs 生成物「${c.short}」`);
  if (c.volume !== t.volume) fieldDiffs.push(`${label} volume：docs「${t.volume}」 vs 生成物「${c.volume}」`);
  const expectTo = `/docs/${t.dir.replace(/^\d+-/, '')}/`;
  if (c.to !== expectTo) fieldDiffs.push(`${label} to：应为「${expectTo}」 vs 生成物「${c.to}」`);
  const graphLessons = lessonCnt.get(n) || 0;
  if (c.lessons !== graphLessons) {
    errors.push(`${label} 课数对不上：CHAPTER_INFO 说 ${c.lessons}，NODES 里 ${graphLessons}——生成物自相矛盾`);
  }
  if (t.lessons !== graphLessons) {
    warns.push(`${label} 磁盘上 ${t.lessons} 个课文件，图谱里 ${graphLessons} 门——差额通常是课文件标了 draft（draft 不进图谱）`);
  }
}
if (fieldDiffs.length) {
  errors.push(`CHAPTER_INFO 与章首页 front matter 有 ${fieldDiffs.length} 处不一致（通常是改了章首页忘了跑生成器）：`);
  fieldDiffs.forEach((d) => errors.push('    · ' + d));
}

/* ---- 五、总量对账 ---- */
const totalByInfo = CHAPTER_INFO.reduce((sum, c) => sum + c.lessons, 0);
if (totalByInfo !== NODES.length) {
  errors.push(`课数总量对不上：CHAPTER_INFO 合计 ${totalByInfo}，NODES ${NODES.length}`);
}
if (info.size !== CHAPTER_INFO.length) {
  errors.push(`CHAPTER_INFO 里有重复章号（${CHAPTER_INFO.length} 条 → 去重后 ${info.size} 个）`);
}

/* ---- 六、回归检查：不许再长出第二份手写章表 ----
 * 只认「声明」，不认「提及」——解释「当年这两张表怎么来的」的注释不算违规，
 * 真长出 const CH_TITLES = new Map([...]) 才算。 */
const HAND_TABLES = ['CH_TITLES', 'CH_SHORT'];
const DECL = new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var)\\s+(?:${HAND_TABLES.join('|')})\\b`);
const SRC = path.join(ROOT, 'src');
const handFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) {
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (DECL.test(line)) handFiles.push(`${path.relative(ROOT, full)}:${i + 1} ${line.trim().slice(0, 60)}`);
      });
    }
  }
})(SRC);
if (handFiles.length) {
  errors.push('src/ 下又出现了手写的章节标题表（章节名应该只有一个源头：各章 index.md）：');
  handFiles.forEach((f) => errors.push('    · ' + f));
}

/* ---- 报告 ---- */
console.log('');
console.log(`docs 章目录：${truth.size} 个（含导览章第 ${GUIDE_CH} 章）`);
console.log(`CHAPTER_INFO：${CHAPTER_INFO.length} 章 / ${totalByInfo} 门课 | NODES：${NODES.length} 门课`);
warns.forEach((w) => console.log('⚠ ' + w));
if (errors.length) {
  console.log('');
  errors.forEach((e) => console.log('✗ ' + e));
  console.log(`\n共 ${errors.length} 处不同步。\n`);
  process.exit(1);
}
console.log(`✔ 章节信息同步：${CHAPTER_INFO.length} 章名/短名/卷号全部与各章 index.md 一致\n`);

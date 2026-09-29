/* 把 full-graph-data.js 按章拆成 static/graph-chapters/NN.json —— /graph 课级钻取的按需数据源。
 *
 * 背景与动机（2026-09-29 第五回路）：
 *   full-graph-data.js 约 285KB，全部 1029 门课都在每个图谱页的 bundle 里；
 *   同心环首屏其实只需要「章」这一层（79 条元数据，几 KB），课级数据只在
 *   用户点击某一章时才用得上。按章拆成 79 个小 JSON（每章 2~6KB），
 *   点击时 fetch——首屏不再背全量课数据。
 *
 * 数据流与纪律：
 *   唯一源头仍是 full-graph-data.js（gen-graph.mjs 的产物，勿手改）。
 *   本脚本只做「拆分投影」，不做任何解析或补算：
 *     · 课按 ch 分组，fields 原样带走（id/ord/title/to；short 也在 NODES 里，钻取圈不显示短名，省掉）；
 *     · EDGES 是全库 NODES 索引对，拆分时把落在同一章内的边换算成**章内局部索引**，
 *       跨章课级边不进章 JSON（章与章的关系画在同心环的章级边上）；
 *     · CHAPTER_INFO 的章名/卷号/目录原样带上，fetch 后不需要再查任何表。
 *   无课章（如 17「下一程导读」）也生成空 JSON——保证图上任何章号 fetch 都 200，
 *   不用在前端区分「这章有没有文件」。
 *
 * 用法：node scripts/gen-chapters-data.mjs（幂等；npm run build 已自动执行）。
 * 输出规模每次都会打印，改动后请以最近一次输出为准。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = path.join(ROOT, 'src', 'components', 'ml-home', 'full-graph-data.js');
const OUT = path.join(ROOT, 'static', 'graph-chapters');

/* full-graph-data.js 是 ESM 的 .js（package.json 无 "type":"module"），node 不能直接 import。
 * 拷成临时 .mjs 再 import——不 eval、不正则，生成物长什么样都吃得下。 */
async function loadGraphData() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-gen-chapters-'));
  try {
    const tmpFile = path.join(tmp, 'full-graph-data.mjs');
    fs.copyFileSync(SRC, tmpFile);
    return await import(pathToFileURL(tmpFile).href);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const { NODES, EDGES, CHAPTER_INFO } = await loadGraphData();

/* 按 ch 分组成员，并记录 全局索引 → 章内局部序号 */
const byCh = new Map();
for (let i = 0; i < NODES.length; i++) {
  const n = NODES[i];
  if (!byCh.has(n.ch)) byCh.set(n.ch, { members: [], localOf: new Map() });
  const bucket = byCh.get(n.ch);
  bucket.localOf.set(i, bucket.members.length);
  bucket.members.push(n);
}

const metaOf = new Map(CHAPTER_INFO.map((c) => [c.n, c]));

/* 对账：图谱里有课、CHAPTER_INFO 却没有这一章 → 拆分无从谈起，直接炸 */
const orphans = [...byCh.keys()].filter((ch) => !metaOf.has(ch));
if (orphans.length) {
  console.error(`✘ CHAPTER_INFO 缺章（图谱里却有课）：${orphans.join(', ')}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
/* 清旧文件：章号删光后旧 JSON 不该再留着（比如上次生成还有 60 章、这次只有 58 章） */
const prevFiles = fs.readdirSync(OUT).filter((f) => f.endsWith('.json'));
const keep = new Set();

let totalLessons = 0;
let totalEdges = 0;
let totalBytes = 0;
let emptyChapters = 0;

for (const info of [...CHAPTER_INFO].sort((a, b) => a.n - b.n)) {
  const bucket = byCh.get(info.n);
  const lessons = (bucket?.members ?? [])
    .slice()
    .sort((a, b) => a.ord - b.ord)
    .map(({ id, ord, title, to }) => ({ id, ord, title, to }));
  const localOf = bucket?.localOf ?? new Map();

  const edges = [];
  for (const [a, b] of EDGES) {
    const la = localOf.get(a);
    const lb = localOf.get(b);
    if (la !== undefined && lb !== undefined) edges.push([la, lb]);
  }

  const doc = {
    ch: info.n,
    dir: info.dir,
    title: info.title,
    short: info.short,
    volume: info.volume,
    lessons,
    edges,
  };
  if (!lessons.length) emptyChapters++;

  const name = `${String(info.n).padStart(2, '0')}.json`;
  keep.add(name);
  const json = JSON.stringify(doc);
  fs.writeFileSync(path.join(OUT, name), json, 'utf8');
  totalLessons += lessons.length;
  totalEdges += edges.length;
  totalBytes += Buffer.byteLength(json);
}

const stale = prevFiles.filter((f) => !keep.has(f));
for (const f of stale) fs.unlinkSync(path.join(OUT, f));

const perCh = totalLessons / CHAPTER_INFO.length;
console.log(
  `✔ 已生成 static/graph-chapters/（${CHAPTER_INFO.length} 个章文件 / ${totalLessons} 门课 / ` +
    `章内先修 ${totalEdges} 条 / 合计 ${(totalBytes / 1024).toFixed(1)} KB / 均值 ${perCh.toFixed(1)} 课每章` +
    `${emptyChapters ? ` / ${emptyChapters} 个无课空章` : ''}）`
);
if (stale.length) console.log(`  · 清掉过期文件：${stale.join(', ')}`);

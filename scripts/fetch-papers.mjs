#!/usr/bin/env node
/* 把参考资料里可直接下载的 PDF（目前全部是 arXiv）抓到本地 static/papers/，
 * 供已登录用户从本站直接下载；未登录仍走原始地址。
 *
 * 单一事实来源：scripts/references-data.json（每条的 f 字段 = 原始 PDF 地址）。
 * 产物：
 *   static/papers/<slug>.pdf    归档文件（体积大，不入库，见 .gitignore）
 *   scripts/papers-local.json   清单（入库，URL → 本地文件名/字节数）
 *
 * 用法：
 *   node scripts/fetch-papers.mjs          增量下载（已有文件跳过）
 *   node scripts/fetch-papers.mjs --force  全部重下
 *   node scripts/fetch-papers.mjs --check  只体检：哪些条目缺本地副本（不联网）
 *
 * 清单是「已归档的事实记录」：gen-references.mjs 只在磁盘上真有该文件时才写入
 * @local64，所以新克隆的仓库（没有 PDF）会优雅退化成「全部走原始地址」。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(scriptDir, '..');
const dataFile = path.join(scriptDir, 'references-data.json');
const manifestFile = path.join(scriptDir, 'papers-local.json');
const outDir = path.join(rootDir, 'static', 'papers');

const force = process.argv.includes('--force');
const checkMode = process.argv.includes('--check');

/* 第一次用本项目的诚实 UA；被拒（RAND/ACM 一类站点认 UA）后轮换浏览器 UA 再试 */
const UAS = [
  'math-ladder/1.0 (offline reference archive)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

/* 目标清单：URL 去重（同一篇可能在多章出现） */
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const targets = new Map();
for (const [chapter, entries] of Object.entries(data)) {
  for (const e of entries) {
    if (!e.f) continue;
    if (!targets.has(e.f)) targets.set(e.f, { url: e.f, title: e.t, chapters: [] });
    targets.get(e.f).chapters.push(chapter);
  }
}

function slugOf(url, title) {
  const arxiv = url.match(/arxiv\.org\/pdf\/([0-9.]+)(v\d+)?/i);
  if (arxiv) return arxiv[1];
  const tail = url.split('?')[0].split('/').filter(Boolean).pop() || 'ref';
  const base =
    tail.replace(/[^A-Za-z0-9._-]/g, '').replace(/\.pdf$/i, '').slice(0, 60) || 'ref';
  const short = crypto.createHash('sha1').update(url).digest('hex').slice(0, 8);
  return `${base}-${short}`;
}

function readManifest() {
  if (!fs.existsSync(manifestFile)) return { generatedAt: null, items: {} };
  try {
    const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    return { generatedAt: m.generatedAt || null, items: m.items || {} };
  } catch {
    return { generatedAt: null, items: {} };
  }
}

const manifest = readManifest();
const items = {};

function humanMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

async function downloadOne(url, dest) {
  const tmp = dest + '.part';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UAS[Math.min(attempt - 1, UAS.length - 1)],
          Accept: 'application/pdf,*/*',
        },
        redirect: 'follow',
        /* 归档扫描件动辄几十 MB（archive.org 也不快），超时给到 10 分钟 */
        signal: AbortSignal.timeout(600000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      const head = buf.subarray(0, 5).toString('latin1');
      if (head !== '%PDF-') throw new Error('不是 PDF（前 5 字节：' + JSON.stringify(head) + '）');
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, dest);
      return { ok: true, bytes: buf.length };
    } catch (err) {
      if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
      if (attempt === 3) return { ok: false, err: String(err.message || err) };
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  return { ok: false, err: '未知失败' };
}

const rows = [];
let done = 0;
let skipped = 0;
let failed = 0;
let totalBytes = 0;

for (const { url, title, chapters } of targets.values()) {
  const slug = slugOf(url, title);
  const file = `${slug}.pdf`;
  const dest = path.join(outDir, file);
  const known = manifest.items[url];
  const exists = fs.existsSync(dest);

  if (checkMode) {
    if (!exists) {
      failed += 1;
      rows.push({ file, state: '缺', title });
    } else {
      done += 1;
      totalBytes += fs.statSync(dest).size;
    }
    continue;
  }

  if (exists && !force) {
    const size = fs.statSync(dest).size;
    skipped += 1;
    done += 1;
    totalBytes += size;
    items[url] = { file, bytes: size, title };
    rows.push({ file, state: '已有', size: humanMB(size), title });
    continue;
  }

  const r = await downloadOne(url, dest);
  if (r.ok) {
    done += 1;
    totalBytes += r.bytes;
    items[url] = { file, bytes: r.bytes, title };
    rows.push({ file, state: '下载', size: humanMB(r.bytes), title });
  } else {
    failed += 1;
    rows.push({ file, state: '失败', title, err: r.err });
    /* 失败但磁盘上还有旧文件：保留旧清单条目，让站点继续可用 */
    if (exists) {
      const size = fs.statSync(dest).size;
      items[url] = { file, bytes: size, title };
      done += 1;
      totalBytes += size;
    }
  }
  /* arXiv 有速率限制，别把人家当 CDN 打 */
  await new Promise((r) => setTimeout(r, 900));
}

if (!checkMode) {
  fs.mkdirSync(outDir, { recursive: true });
  /* 只保留本次仍在清单里的 URL（顺序按 targets 稳定输出） */
  fs.writeFileSync(
    manifestFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        base: '/papers/',
        items,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
}

const pad = (s, n) => String(s).padEnd(n);
for (const r of rows) {
  const detail = r.err ? `  ✗ ${r.err}` : r.size ? `  ${r.size}` : '';
  console.log(`${pad(r.state, 6)} ${pad(r.file, 22)}${pad(r.title.slice(0, 42), 44)}${detail}`);
}

console.log('');
console.log(
  checkMode
    ? `✔ 本地副本体检：已归档 ${done} / 缺失 ${failed}（共 ${targets.size} 个 PDF，合计 ${humanMB(totalBytes)}）`
    : `✔ 本地副本：可用 ${done}（新下载 ${done - skipped}）/ 失败 ${failed} / 共 ${targets.size} 个 PDF，合计 ${humanMB(totalBytes)}`,
);
console.log(
  checkMode
    ? '  提示：缺的跑 node scripts/fetch-papers.mjs 补下，再跑 node scripts/gen-references.mjs 同步条目。'
    : '  下一步：node scripts/gen-references.mjs（把 @local64 写进各章 999-references.md）。',
);
if (failed > 0 && !checkMode) process.exitCode = 1;

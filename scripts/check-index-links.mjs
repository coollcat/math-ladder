// 章首页收录检查：找出「课文件已存在但 index.md 里没有链接」的情况。
// 用法：node scripts/check-index-links.mjs [docs目录]
//   —— 不传参数时默认 <仓库根>/docs。旧版把默认值钉成 D:/桌面/ai项目/math-ladder/docs，
//      换台机器跑就 ENOENT，而且命令行传参也会被静默忽略（2026-10 审查发现，已修）。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || path.join(here, '..', 'docs'));
const SKIP = new Set(['index.md', '999-references.md', 'COMPONENT_SPEC.md']);
const problems = [];

if (!fs.existsSync(root)) {
  console.error('✗ docs 目录不存在：' + root);
  process.exit(1);
}

for (const d of fs.readdirSync(root)) {
  const dir = path.join(root, d);
  if (!fs.statSync(dir).isDirectory()) continue;
  const idx = path.join(dir, 'index.md');
  const lessons = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !SKIP.has(f))
    .sort();
  if (!lessons.length) continue;
  if (!fs.existsSync(idx)) {
    problems.push(`${d}: 缺少 index.md（${lessons.length} 门课无处安放）`);
    continue;
  }
  const txt = fs.readFileSync(idx, 'utf8');
  const missing = lessons.filter((f) => !txt.includes(f));
  if (missing.length) {
    problems.push(`${d}: ${missing.length} 门未收录\n    ${missing.join('\n    ')}`);
  }
}

console.log(`\n扫描目录：${root}`);
console.log(problems.length ? problems.join('\n') : '✔ 全部章首页均已收录本章所有课程');
console.log('');
if (problems.length) process.exit(1);

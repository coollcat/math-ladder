// 文档链接体检：扫描 docs 下所有 markdown 的相对链接，报告失效目标。
// 用法：node scripts/check-links.mjs [docs目录]
//   —— 不传参数时默认 <仓库根>/docs（**不再写死某台机器的绝对路径**：
//      2026-10 审查发现旧版把 root 钉成 D:/桌面/ai项目/math-ladder/docs，
//      换机器直接 ENOENT，命令行传参也被忽略）。
// 退出码：有断链为 1，否则 0（可在 CI/收尾脚本里当闸门用；--warn 只报不拦）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const warnOnly = argv.includes('--warn');
const dirArg = argv.find((a) => !a.startsWith('--'));
const root = path.resolve(dirArg || path.join(here, '..', 'docs'));

if (!fs.existsSync(root)) {
  console.error('✗ docs 目录不存在：' + root);
  process.exit(1);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const broken = [];
const absolute = [];
const files = walk(root);

for (const file of files) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const raw = m[1];
    if (/^(https?:|mailto:|tel:|#)/i.test(raw)) continue;
    if (raw.startsWith('/')) {
      absolute.push(rel + '  →  ' + raw);
      continue;
    }
    const target = raw.split('#')[0];
    if (!target) continue;
    // 排除 KaTeX/记号误报：真正的文档链接必然带 .md 或目录分隔符
    if (!target.endsWith('.md') && !target.includes('/')) continue;
    let decoded = target;
    try { decoded = decodeURIComponent(target); } catch (e) { void e; }
    const abs = path.resolve(path.dirname(file), decoded);
    if (!fs.existsSync(abs)) broken.push(rel + '  →  ' + raw);
  }
}

console.log('\n扫描 ' + files.length + ' 个 markdown 文件（根目录：' + root + '）\n');
console.log('站内绝对链接（Docusaurus 下多半 404）：' + absolute.length);
absolute.slice(0, 20).forEach((x) => console.log('  ' + x));
console.log('\n断链（目标文件不存在）：' + broken.length);
broken.slice(0, 60).forEach((x) => console.log('  ' + x));
if (broken.length > 60) console.log('  …… 其余 ' + (broken.length - 60) + ' 条略');
console.log('');

if (broken.length && !warnOnly) process.exit(1);

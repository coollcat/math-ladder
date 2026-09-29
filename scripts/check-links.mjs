// 文档链接体检：扫描 docs 下所有 markdown 的相对链接，报告失效目标。
// 用法：node scripts/check-links.mjs
import fs from 'fs';
import path from 'path';

const root = path.resolve('D:/桌面/ai项目/math-ladder/docs');

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
      absolute.push(`${rel}  →  ${raw}`);
      continue;
    }
    const target = raw.split('#')[0];
    if (!target) continue;
    // 排除 KaTeX/记号误报：真正的文档链接必然带 .md 或目录分隔符
    if (!target.endsWith('.md') && !target.includes('/')) continue;
    const abs = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(abs)) broken.push(`${rel}  →  ${raw}`);
  }
}

console.log(`\n扫描 ${files.length} 个 markdown 文件\n`);
console.log(`站内绝对链接（Docusaurus 下多半 404）：${absolute.length}`);
absolute.slice(0, 20).forEach((x) => console.log('  ' + x));
console.log(`\n断链（目标文件不存在）：${broken.length}`);
broken.slice(0, 60).forEach((x) => console.log('  ' + x));
if (broken.length > 60) console.log(`  …… 其余 ${broken.length - 60} 条略`);
console.log('');

// lab 围栏 ↔ 注册表 交叉核对（只读）
// 用法：node scripts/check-lab-registry.mjs [docs目录]
//
// 为什么需要这个：lab 围栏里的 `type` 与 registries 里的键**必须逐字一致**。
// 拼错、忘了登记、登记了却没人用——这三种情况 build 不报错、validate 也不报错，
// 表现只是"页面上静默不出组件"，是最容易在收尾时漏掉的一类缺陷。
//
// 检查四件事：
//   1. 课文用了但没登记  → P0（页面静默空白）
//   2. 登记了但组件文件不存在 → P0（运行时报 404 chunk）
//   3. 登记了但没有任何课在用 → P1（死代码，或课文漏插围栏）
//   4. lab 围栏 JSON 解析失败 → P0（整块渲染不出来）
//
// 退出码：有 P0 为 1。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..');
const docsRoot = path.resolve(process.argv[2] || path.join(repo, 'docs'));
const regDir = path.join(repo, 'src', 'pyrunner', 'lab', 'registries');
const compDir = path.join(repo, 'src', 'pyrunner', 'lab', 'components');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/* ---- 1) 收集注册表 ---- */
const registered = new Map(); // type -> { registry, file }
const dupes = [];
for (const f of fs.readdirSync(regDir).filter((x) => x.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(regDir, f), 'utf8');
  for (const m of text.matchAll(/^\s*'([^']+)':\s*\(\)\s*=>\s*import\(\s*'([^']+)'\s*\)/gm)) {
    const type = m[1];
    const rel = m[2];
    if (registered.has(type)) dupes.push(type + '（' + registered.get(type).registry + ' 与 ' + f + '）');
    registered.set(type, { registry: f, rel });
  }
}

/* ---- 2) 收集课文里的 lab 围栏 ---- */
const used = new Map(); // type -> [file...]
const badJson = [];
for (const file of walk(docsRoot)) {
  const rel = path.relative(repo, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/^```lab[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm)) {
    let spec;
    try {
      spec = JSON.parse(m[1]);
    } catch (e) {
      badJson.push(rel + '  ' + String(e.message).slice(0, 90));
      continue;
    }
    if (!spec || !spec.type) continue;
    if (!used.has(spec.type)) used.set(spec.type, []);
    used.get(spec.type).push(rel);
  }
}

/* ---- 3) 比对 ---- */
const p0 = [];
const p1 = [];

for (const [type, files] of used) {
  if (!registered.has(type)) {
    p0.push('未登记：' + type + '  ← ' + files.join(', '));
  }
}

for (const [type, info] of registered) {
  const target = path.resolve(path.join(regDir, info.rel));
  if (!fs.existsSync(target)) {
    p0.push('组件文件不存在：' + type + ' → ' + info.rel + '（' + info.registry + '）');
  }
  if (!used.has(type)) {
    p1.push('登记但无课文使用：' + type + '（' + info.registry + '）');
  }
}

for (const d of dupes) p0.push('type 重复登记（后加载的会静默覆盖）：' + d);
for (const b of badJson) p0.push('lab 围栏 JSON 解析失败：' + b);

console.log('');
console.log('注册表 ' + registered.size + ' 个 type ／ 课文使用 ' + used.size + ' 个 type');
console.log('P0：' + p0.length);
p0.forEach((x) => console.log('  ' + x));
console.log('P1：' + p1.length);
p1.slice(0, 30).forEach((x) => console.log('  ' + x));
if (p1.length > 30) console.log('  …… 其余 ' + (p1.length - 30) + ' 条略');
console.log('');
if (p0.length) process.exit(1);

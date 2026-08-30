/* lab 组件语法体检：把 .js 复制成 .mjs 后用 node --check 逐个解析。
   为什么绕这一道：本仓库 package.json 没有 "type":"module"，node --check
   会把 .js 当 CommonJS 解析，遇到 import 就误报；.mjs 才会走 ESM 解析。
   用法：node scripts/check-lab-syntax.mjs */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const labDir = path.join(root, 'src', 'pyrunner', 'lab');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  });
  return out;
}

const files = walk(labDir);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-lab-check-'));
let bad = 0;

files.forEach((f) => {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const tmpFile = path.join(tmp, path.basename(f, '.js') + '-' + Math.random().toString(36).slice(2, 8) + '.mjs');
  fs.copyFileSync(f, tmpFile);
  try {
    execFileSync(process.execPath, ['--check', tmpFile], { stdio: 'pipe' });
  } catch (e) {
    bad += 1;
    const msg = (e.stderr ? e.stderr.toString() : String(e)).split('\n').slice(0, 4).join('\n');
    console.log('FAIL  ' + rel + '\n' + msg);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (e) { void e; }
  }
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n' + (files.length - bad) + ' 个文件语法通过 / ' + bad + ' 个失败（共 ' + files.length + ' 个）');
process.exit(bad ? 1 : 0);

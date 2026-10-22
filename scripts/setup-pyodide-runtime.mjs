#!/usr/bin/env node
/* =========================================================================
 * setup-pyodide-runtime.mjs · 备齐 check-py-run.mjs 要用的浏览器版运行时
 *
 * 站点跑的是 Pyodide v0.26.4（CPython 3.12 / matplotlib 3.5.2 / numpy 1.26.4 /
 * scipy 1.12）。本机 Python 是 3.14 + matplotlib 3.11，**版本口径不同**，拿本机
 * 跑会把浏览器里正常的课文报成缺陷（`boxplot(labels=…)` 就是活例子：3.5.2 有
 * 这个参数，3.11 删了）。所以体检必须在真运行时里跑。
 *
 * 这个脚本把运行时落盘到 _ai-workspace/pyodide-runtime/：
 *   · pyodide 的核心几件（wasm / stdlib / lock）从 node_modules/pyodide 复制；
 *   · matplotlib / numpy / scipy / sympy 的依赖闭包从 jsdelivr 下载 wheel；
 *   · 纯 Python 包直接解到 site-packages/；带原生扩展的（scipy / sympy）留给
 *     运行时里的 loadPackage 就地装载（硬解会得到 PyInit__fblas 之类报错）。
 *
 * 用法：node scripts/setup-pyodide-runtime.mjs [--force]
 * 幂等：已经齐了就秒退。
 * ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RT = path.join(ROOT, '_ai-workspace/pyodide-runtime');
const SP = path.join(RT, 'site-packages');
const PKG = path.join(ROOT, 'node_modules/pyodide');
const VERSION = 'v0.26.4';
const FORCE = process.argv.includes('--force');

if (!fs.existsSync(path.join(PKG, 'pyodide.asm.wasm'))) {
  console.error('✖ 没找到 node_modules/pyodide，先跑：npm i -D pyodide@0.26.4');
  process.exit(1);
}
fs.mkdirSync(RT, { recursive: true });
fs.mkdirSync(SP, { recursive: true });
for (const f of ['pyodide.asm.js', 'pyodide.asm.wasm', 'pyodide.js', 'pyodide.mjs', 'python_stdlib.zip', 'pyodide-lock.json']) {
  const dst = path.join(RT, f);
  if (!FORCE && fs.existsSync(dst)) continue;
  fs.copyFileSync(path.join(PKG, f), dst);
}

const lock = JSON.parse(fs.readFileSync(path.join(PKG, 'pyodide-lock.json'), 'utf8'));
const wanted = new Set();
const walk = (n) => {
  if (wanted.has(n)) return;
  const p = lock.packages[n];
  if (!p) return;
  wanted.add(n);
  (p.depends || []).forEach(walk);
};
['matplotlib', 'scipy', 'sympy'].forEach(walk);

/* 只解压纯 Python 包：带原生扩展的交给运行时里的 loadPackage */
const NATIVE = /pyodide_2024_0_wasm32|openblas/;
for (const name of wanted) {
  const file = lock.packages[name].file_name;
  const dst = path.join(RT, file);
  if (!fs.existsSync(dst) || FORCE) {
    const url = 'https://cdn.jsdelivr.net/pyodide/' + VERSION + '/full/' + file;
    process.stdout.write('下载 ' + file + ' … ');
    const res = await fetch(url);
    if (!res.ok) { console.log('失败 ' + res.status); continue; }
    fs.writeFileSync(dst, Buffer.from(await res.arrayBuffer()));
    console.log('ok');
  }
  if (!NATIVE.test(file)) {
    const { execFileSync } = await import('node:child_process');
    try { execFileSync('tar', ['-xf', dst, '-C', SP], { stdio: 'ignore' }); } catch { /* 已解过或 tar 不支持 */ }
  }
}

const wheels = fs.readdirSync(RT).filter((n) => n.endsWith('.whl')).length;
console.log('✔ 运行时就绪：' + RT + '（' + wheels + ' 个 wheel）');
console.log('  接着跑：npm run check:py-run');

#!/usr/bin/env node
/* =========================================================================
 * check-py-run.mjs · `python` 围栏**在真实浏览器运行时里**实跑体检
 *
 * 为什么必须是 Pyodide 而不是本机 python：
 *   `audit-py-syntax.py` 只 `compile()`——证明语法没错，证明不了跑得起来。
 *   站点上每块 `python` 都配「▶ 浮窗运行」，读者点下去看到 Traceback 就是
 *   一次失败体验，而 `validate` / `build` 全程绿灯。
 *
 *   更要命的是**本机 python 会给出错误结论**：站上锁的是 Pyodide v0.26.4
 *   （CPython 3.12 / matplotlib 3.5.2 / numpy 1.26.4），而本机是 3.14 +
 *   matplotlib 3.11。同一个 `ax.boxplot(..., labels=[...])`：
 *       · matplotlib 3.5.2 → 正常（`labels` 才是当时的参数名）
 *       · matplotlib 3.11  → TypeError（改名 `tick_labels`，旧名已删）
 *   拿本机跑就会把 30 多处**浏览器里完全正常**的课文报成 P0。所以这个脚本
 *   直接在 Pyodide 里跑，版本与读者所见逐字节一致。
 *
 * 口径（与浮窗行为对齐，别改成「每块独立」）：
 *   `python` 块走 `_ml_console_run`（**持久命名空间**），同页上块按文档顺序
 *   共享变量。所以第 N 块的跑法是「先跑 0..N-1，再跑第 N 块」。前文块用
 *   try/except 包住：浏览器里某块报错只是「这一块没跑成」，命名空间里已定义
 *   的变量还在，后面的块照样能跑；直接拼接会把一次失败传染给后面所有块。
 *
 * 三个刻意跳过：
 *   1. 带 `# sliders:` 的块——变量由滑块注入，裸跑必然 NameError；
 *   2. `py` 片段——按设计就不是可执行单元（解答区专用）；
 *   3. `plt.show()` 换成 `plt.close('all')`——无头环境下 show 会阻塞。
 *
 * 用法：
 *   node scripts/check-py-run.mjs [docs目录] [--json out.json] [--limit N]
 *   需要先备好 Pyodide 运行时（npm i -D pyodide 之后，把 matplotlib 的
 *   依赖 wheel 解到 _ai-workspace/pyodide-runtime/site-packages/）；
 *   找不到运行时会**明确报错退出码 2**，不会静默退回本机 python
 *   ——那正是会给出错误结论的路径。
 *
 * 退出码：有失败块即 1；运行时缺失 2。
 * ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dirArg = args.find((a) => !a.startsWith('--') && !args.includes(a) === false) || 'docs';
const DOCS = path.resolve(ROOT, args.find((a) => !a.startsWith('--')) || 'docs');
const jsonIdx = args.indexOf('--json');
const JSON_OUT = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;

/* ---- 运行时 ---- */
const RT = path.join(ROOT, '_ai-workspace/pyodide-runtime');
const SP = path.join(RT, 'site-packages');
if (!fs.existsSync(path.join(RT, 'pyodide.asm.wasm')) || !fs.existsSync(SP)) {
  console.error('✖ 缺少 Pyodide 运行时：' + RT);
  console.error('  准备方式：npm i -D pyodide，然后把 matplotlib 依赖闭包里的');
  console.error('  *.whl 下载并解压到 _ai-workspace/pyodide-runtime/site-packages/。');
  console.error('  刻意不退回本机 python：本机版本与读者所见不同，会给出错误结论。');
  process.exit(2);
}
const { loadPyodide } = await import('pyodide');
const py = await loadPyodide({ indexURL: RT });
(function copyTree(src, dst) {
  py.FS.mkdirTree(dst);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = dst + '/' + e.name;
    if (e.isDirectory()) copyTree(s, d); else py.FS.writeFile(d, fs.readFileSync(s));
  }
})(SP, '/lib/sp');
await py.runPythonAsync("import sys, os; sys.path.insert(0, '/lib/sp'); os.environ['MPLBACKEND'] = 'AGG'");

/* scipy / sympy 带原生扩展，不能手动解包（openblas 的初始化顺序由 Pyodide 的
   loader 负责，硬解会得到 PyInit__fblas 之类的报错）。整份运行时目录里已经放了
   wheel，loadPackage 就地取用、不联网。缺包就跳过——那只说明这台机器没备齐，
   不是课文的缺陷。 */
const LOADABLE = ['scipy', 'sympy', 'pandas'];
for (const pkg of LOADABLE) {
  if (!fs.readdirSync(RT).some((n) => n.startsWith(pkg + '-'))) continue;
  try { await py.loadPackage(pkg, { messageCallback: () => {} }); }
  catch { /* 没备齐就跳过，别把环境问题报成课文问题 */ }
}

/* ---- 遍历 ---- */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const q = path.join(dir, e.name);
    if (e.isDirectory()) walk(q, out);
    else if (e.name.endsWith('.md')) out.push(q);
  }
  return out;
}

const FENCE = /^```python[^\n]*\r?\n([\s\S]*?)^```/gm;

/* 跨文件必须清命名空间：浏览器里的「持久命名空间」只在一页之内成立，换一页当然
   互不可见。不清就会让上一课的同名变量顶掉下一课本该 NameError 的引用——实测
   09 章的 xs/ys 泄漏进下一章，把一句本来正确的 `ax.plot(xs)` 报成「缺参数」。 */
const RESET = [
  "for _k in [k for k in list(globals()) if not k.startswith('_')",
  "           and k not in ('matplotlib', 'np', 'numpy', 'plt', 'math', 'random', 'sys', 'os')]:",
  '    del globals()[_k]',
].join('\n');
/* 文件之间还要清 pyplot 的图状态：`import matplotlib.pyplot` 是模块级的，
   全局只有一份。上一课留下的 3D 坐标轴会让下一课那句 `plt.plot(avg_hist)`
   落到 Axes3D.plot 上，报「缺少位置参数 ys」——纯属检查器自己串了台，浏览器里
   每页都是新文档不会这样。 */
const REIMPORT = "import matplotlib, numpy, math, random, sys, os; matplotlib.use('AGG'); " +
  "import matplotlib.pyplot as _p; _p.close('all'); del _p";

/* 同页之内，前文块用 try/except 包住再跑：浏览器里某块报错只是「这一块没跑成」，
   已经定义好的变量还在，后面的块照样能跑；直接拼接会把一次失败传染给后面所有块。 */
function guard(prior) {
  if (!prior.trim()) return '';
  return 'try:\n' + prior.split(/\r?\n/).map((l) => '    ' + l).join('\n') +
         '\nexcept Exception:\n    pass\n';
}

const failures = [];
let files = 0, blocks = 0, skipped = 0;
for (const file of walk(DOCS)) {
  if (blocks >= LIMIT) break;
  const text = fs.readFileSync(file, 'utf8');
  const all = [...text.matchAll(FENCE)];
  if (!all.length) continue;
  files += 1;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  let prior = '';
  await py.runPythonAsync(RESET);
  await py.runPythonAsync(REIMPORT);
  for (let i = 0; i < all.length; i++) {
    if (blocks >= LIMIT) break;
    const body = all[i][1];
    blocks += 1;
    if (/#\s*sliders:/.test(body)) { skipped += 1; continue; }
    const clean = body.replace(/plt\.show\(\)/g, 'plt.close("all")');
    const prelude = /matplotlib|plt\./.test(clean) && !/import matplotlib/.test(clean)
      ? "import matplotlib\nmatplotlib.use('AGG')\n" : '';
    try {
      await py.runPythonAsync(prelude + guard(prior) + '\n\n' + clean);
    } catch (e) {
      const msg = String(e.message || e);
      const lines = msg.split(/\r?\n/).filter(Boolean);
      const important = lines.filter((l) => /Error|error/.test(l) && !/pyodide\.org/.test(l));
      failures.push({
        file: rel, block: i + 1, of: all.length,
        error: important[important.length - 1] || lines[lines.length - 1],
        line: (msg.match(/line (\d+)/) || [])[1] || null,
      });
    }
    prior += body + '\n';
  }
}

console.log('扫描 ' + files + ' 个文件 / ' + blocks + ' 个 python 块（跳过 ' + skipped + ' 个滑块块）');
console.log('运行时：Python ' + (await py.runPythonAsync('import sys; sys.version.split()[0]')) +
            ' / matplotlib ' + (await py.runPythonAsync('import matplotlib; matplotlib.__version__')));
if (!failures.length) {
  console.log('✔ 全部 python 块实跑通过');
} else {
  console.log('✖ ' + failures.length + ' 块实跑失败：');
  for (const f of failures) {
    console.log('  ' + f.file + ' 块 ' + f.block + '/' + f.of + (f.line ? ' 第 ' + f.line + ' 行' : ''));
    console.log('      ' + f.error);
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(failures, null, 2), 'utf8');
  process.exitCode = 1;
}

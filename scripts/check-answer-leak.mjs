#!/usr/bin/env node
/* =========================================================================
 * 判题答案泄露体检（只读）
 * -------------------------------------------------------------------------
 * 判题链最隐蔽的一类缺陷不是"判不过"，而是"判太容易"：
 *   1. 初始代码**原样就能**通过 @check —— 学生什么都不用改，练习形同虚设；
 *   2. @check 的行数与改对后的 print 行数不一致 —— 写对了也永远判不过；
 *   3. 初始代码自己就报错 —— 学生第一步就卡死；
 *   4. hint / 初始代码里直接写着期望值 —— 照抄就过。
 *
 * 用法：
 *   node scripts/check-answer-leak.mjs [docs目录] [--json out.json] [--limit N]
 * 退出码：发现 P0（初始代码直接通过）为 1，否则 0。
 *
 * 判定口径与 enhancer.js / audit-py-solutions.py 一致（normalizeOut + 数值相对容差 1e-9），
 * 不另立一套——否则审计结论代表不了线上行为。
 *
 * 判读纪律（很重要，否则满屏误报）：
 *   · 各章 index.md 的「实战挑战」故意只示范第一问，输出行数少于 @check 是**设计**；
 *   · 解答区只给片段（py 围栏）是写法选择，不是错误；
 *   · 参考解报 NameError 且变量来自同课前一块：浮窗是持久命名空间，单块跑当然会挂。
 * ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const jsonOut = (() => {
  const i = argv.indexOf('--json');
  return i >= 0 ? argv[i + 1] : '';
})();
const limit = (() => {
  const i = argv.indexOf('--limit');
  return i >= 0 ? Number(argv[i + 1]) || 0 : 0;
})();
const skipFlags = new Set(['--json', '--limit']);
const dirArg = argv.find((a, i) => !a.startsWith('--') && !skipFlags.has(argv[i - 1]));
const docsRoot = path.resolve(dirArg || path.join(here, '..', 'docs'));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/* ---- 与 enhancer.js 相同的归一化与比对 ---- */
const NUM_SPLIT = /(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/;
const NUM_ONLY = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const BIG_INT = /^-?\d{16,}$/;
const REL_TOL = 1e-9;

function normalizeOut(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').map((l) => l.trim());
  const out = [];
  let prevEmpty = false;
  for (const l of lines) {
    const empty = l === '';
    if (empty && prevEmpty) continue;
    out.push(l);
    prevEmpty = empty;
  }
  return out.join('\n').trim();
}

function sameOutput(got, want) {
  if (got === want) return true;
  const g = got.split(NUM_SPLIT).filter((x) => x !== '');
  const w = want.split(NUM_SPLIT).filter((x) => x !== '');
  if (g.length !== w.length) return false;
  for (let i = 0; i < w.length; i += 1) {
    if (NUM_ONLY.test(g[i]) && NUM_ONLY.test(w[i])) {
      if (BIG_INT.test(g[i]) || BIG_INT.test(w[i])) {
        const norm = (s) => s.replace(/^(-?)0+(?=\d)/, '$1');
        if (norm(g[i]) !== norm(w[i])) return false;
        continue;
      }
      const a = Number(g[i]);
      const b = Number(w[i]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
      /* 纯相对容差，不加绝对下限——与 enhancer.js 逐字一致。
         加 max(|want|,1) 会给接近 0 的期望值开口子（0.1+0.2-0.3 那一课就废了）。 */
      if (Math.abs(a - b) > Math.abs(b) * REL_TOL) return false;
    } else if (g[i] !== w[i]) {
      return false;
    }
  }
  return true;
}

/* ---- 解析围栏 ---- */
const FENCE = /^```([A-Za-z0-9_+-]*)[^\n]*\n([\s\S]*?)^```[ \t]*\r?$/gm;

function parseExercise(code) {
  const lines = code.split(/\r?\n/);
  const checks = [];
  const hintLines = [];
  const bodyLines = [];
  let expectError = '';
  for (const line of lines) {
    const c = line.match(/^#\s*@check:\s*(.*)$/);
    if (c) { checks.push(c[1].trim()); continue; }
    const h = line.match(/^#\s*@hint:\s*(.*)$/);
    if (h) { hintLines.push(h[1].trim()); continue; }
    if (/^#\s*@title:/.test(line)) continue;
    if (/^#\s*sliders:/.test(line)) continue;
    const ee = line.match(/^#\s*@expect-error:\s*(.*)$/);
    if (ee) { expectError = (ee[1] || '').trim(); continue; }
    bodyLines.push(line);
  }
  return { checks, hint: hintLines.join('\n'), body: bodyLines.join('\n'), expectError };
}

const PRELUDE = "import matplotlib as _mpl\n_mpl.use('Agg')\nimport matplotlib.pyplot as _plt\n_plt.show = lambda *a, **k: None\n";

function runCode(code) {
  try {
    const out = execFileSync('python', ['-X', 'utf8', '-c', PRELUDE + code], {
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: String(e.stdout || ''), err: String(e.stderr || e.message) };
  }
}

/* ---- 「初始代码里写死了答案」的取样面 ----
 *
 * 只认两处：① print(...) 的**字符串字面量**（print("上界: 25") 就是把答案抄上了屏幕）；
 * ② 行尾注释里的数字（"← 应当是 100.0" 是同一类泄露，只是换了个位置）。
 *
 * 为什么不再扫整个 body：期望值出现在输入数据里（x²+y²=25 的 25、转移矩阵的 0.7、
 * 误差容限 1e-9）完全正常。按子串匹配只能得到 55% 的误报率。 */
function leakSurfaceNumbers(body) {
  const out = [];
  for (const line of body.split(/\r?\n/)) {
    const strLits = [];
    const call = line.match(/\bprint\s*\(([\s\S]*)$/);
    if (call) {
      for (const m of call[1].matchAll(/'([^']*)'|"([^"]*)"/g)) strLits.push(m[1] ?? m[2] ?? '');
    }
    const trailing = line.match(/#[^#]*$/);
    if (trailing) strLits.push(trailing[0]);
    for (const lit of strLits) {
      for (const n of lit.match(/-?\d+(?:\.\d+)?/g) || []) out.push(n);
    }
  }
  return out;
}

/* ---- 单个 exercise 的判定 ---- */
function evaluate(rel, ex) {
  const want = ex.checks.map((c) => c.replace(/^['"]|['"]$/g, '')).join('\n');
  const wantNums = want.match(/-?\d+(?:\.\d+)?/g) || [];

  /* 需要交互输入的练习没法自动跑（会一直等 stdin） */
  if (/(^|[^\w.])input\s*\(/.test(ex.body)) {
    problems.push({
      level: 'P2',
      code: 'needs-stdin',
      file: rel,
      problem: '初始代码调用 input()，无法自动判题；线上浮窗同样会卡在等待输入',
      fix: '改成带默认值的函数参数，或直接写死示例数据',
    });
    return;
  }

  const r = runCode(ex.body);

  if (!r.ok) {
    const tail = String(r.err || '').trim().split('\n').filter(Boolean).slice(-1)[0] || '';
    /* 有些练习刻意让初始代码抛错（「它一跑就抛 ValueError，这正是本题要修的地方」）。
       这种题必须在围栏里用 `# @expect-error: 说明` 显式声明，否则无从区分「设计」与「写坏了」。 */
    if (ex.expectError) return;
    problems.push({
      level: 'P1',
      code: 'scaffold-errors',
      file: rel,
      problem: '初始代码单独运行报错：' + tail.slice(0, 140),
      fix: '初始代码必须能直接跑通（刻意的抛错请写 @expect-error 声明）',
    });
    return;
  }

  const got = normalizeOut(r.out);

  /* 1) 判题白送 */
  if (sameOutput(got, normalizeOut(want))) {
    problems.push({
      level: 'P0',
      code: 'scaffold-passes',
      file: rel,
      problem: '初始代码原样就能通过 @check：学生什么都不用改',
      fix: '把其中一处关键运算改成错的（保证能跑、结果明显不对、改动点聚焦本课概念）',
    });
    return;
  }

  /* 2) **无条件的** print 比 @check 多 —— 这才是「填对空也判不过」。
   *
   * 只数顶格（缩进 0）的 print：它们无论学生怎么改都会执行，所以输出行数下界是死的。
   * 缩进在 if / for 里的 print 不算——那正是学生要修的条件，修对了行数自然对齐
   * （27-logic-sets 的两个练习就是这种：初始条件写错多打一行，改对后只剩一行）。
   * 初始代码**少**打印也不是问题：学生本来就要补 print。
   * 章首页「实战挑战」故意只示范首问，整条规则豁免。 */
  const topLevelPrints = ex.body
    .split(/\r?\n/)
    .filter((l) => /^print\s*\(/.test(l)).length;
  if (!rel.endsWith('index.md') && topLevelPrints > ex.checks.length) {
    problems.push({
      level: 'P1',
      code: 'check-line-count',
      file: rel,
      problem: '初始代码有 ' + topLevelPrints + ' 条无条件 print，@check 只有 ' + ex.checks.length + ' 行——填对空也判不过',
      fix: '把多余的 print 删掉或并入 @check；学生只该填逻辑，不该猜要删几行',
    });
  }

  /* 3) hint 泄露答案数值
   * 与第 4 条一样只认「有辨识度」的数：hint 说「Z_8 的子群由 8 的因子生成」里的 8
   * 是题目给定的参数，不是答案；把它算成泄露会让 28 条全部误报。 */
  const isIndex = rel.endsWith('index.md');   // 章首页「实战挑战」只示范首问，两条数值规则都豁免
  const hintDistinctive = (n) => n.replace(/^-/, '').length >= 3 || n.includes('.') || Math.abs(Number(n)) > 12;
  const hintNums = ex.hint.match(/-?\d+(?:\.\d+)?/g) || [];
  const wantCore = wantNums.filter(hintDistinctive);
  if (!isIndex && wantCore.length >= 2) {
    const hinted = wantCore.filter((w) => hintNums.includes(w));
    if (hinted.length >= Math.ceil(wantCore.length * 0.6)) {
      problems.push({
        level: 'P1',
        code: 'hint-leaks-answer',
        file: rel,
        problem: 'hint 里出现了 @check 的 ' + hinted.length + '/' + wantCore.length + ' 个有辨识度的期望值：' + hinted.slice(0, 4).join(' / '),
        fix: 'hint 说方法不给数',
      });
    }
  }

  /* 4) 初始代码里明文写着全部期望值
   * 只认「有辨识度」的期望值：1 / 2 / 7 / True 这种小整数和布尔值在正常代码里到处都是，
   * 拿它们当证据会产生大量误报（ch67 三个练习全被误判过）。 */
  const distinctive = (n) => n.replace(/^-/, '').length >= 3 || n.includes('.') || Math.abs(Number(n)) > 12;
  /* 只看 print 的实参，不看整段代码：期望值出现在输入数据里（x²+y²=25 那个 25、
     转移矩阵里的 0.7）完全正常，那不是"答案写在代码里"，那是题目给的数。
     真正要抓的是「答案被原样打印出来」——比如 print("上界: 25")。 */
  const bodyNums = leakSurfaceNumbers(ex.body);
  const wantedDistinct = wantNums.filter(distinctive);
  if (!isIndex && wantedDistinct.length >= 2 && wantedDistinct.every((w) => bodyNums.includes(w))) {
    problems.push({
      level: 'P1',
      code: 'answer-literal-in-scaffold',
      file: rel,
      problem: '初始代码明文出现全部 ' + wantedDistinct.length + ' 个有辨识度的期望值',
      fix: '期望值应由计算得出，不要在初始代码里写死数字',
    });
  }
}

/* ---- 收集所有 exercise ---- */
const jobs = [];
for (const file of walk(docsRoot)) {
  const rel = path.relative(docsRoot, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  FENCE.lastIndex = 0;
  let m;
  while ((m = FENCE.exec(text)) !== null) {
    if (m[1] !== 'exercise') continue;
    const ex = parseExercise(m[2]);
    if (!ex.checks.length) continue;
    jobs.push({ rel, ex });
  }
}

/* ---- 并发跑（池大小 = CPU 核数，别把机器打死） ---- */
const CONC = Math.max(2, Math.min(8, (await import('node:os')).cpus().length - 1));
const problems = [];
let cursor = 0;
let done = 0;

async function worker() {
  for (;;) {
    const idx = cursor;
    cursor += 1;
    if (idx >= jobs.length) return;
    const { rel, ex } = jobs[idx];
    done += 1;
    if (done % 50 === 0) process.stderr.write('  ... ' + done + '/' + jobs.length + '\n');
    evaluate(rel, ex);
  }
}
await Promise.all(Array.from({ length: CONC }, () => worker()));

const p0 = problems.filter((p) => p.level === 'P0');
const p1 = problems.filter((p) => p.level === 'P1');
const p2 = problems.filter((p) => p.level === 'P2');
console.log('扫描 ' + jobs.length + ' 个 exercise（并发 ' + CONC + '）');
console.log('P0 初始代码直接通过 @check：' + p0.length);
p0.slice(0, 40).forEach((p) => console.log('  ' + p.file + '  ' + p.problem));
console.log('P1 行数不符 / 初始代码报错 / 提示泄露：' + p1.length);
const byCode = {};
p1.forEach((p) => { byCode[p.code] = (byCode[p.code] || 0) + 1; });
Object.entries(byCode).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
console.log('P2 其它（含需交互输入）：' + p2.length);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(problems, null, 1));
if (p0.length) process.exit(1);

/* 输出里的数学公式（$$…$$ / $…$）渲染，KaTeX 在这边按需加载 */
import { setMathText } from './mathout';
/* 代码补全（静态词表 + 自己起过的名字），极简版 */
import { attachComplete, harvestWords } from './complete';
/* 三个浮窗谁最后被点谁在最上面 */
import { watchPanel, bringToFront, isTopmost } from './zorder';
/* 图标（圆钮上的笔记本图标走 iconSvg 字符串版，见 src/components/icons.js） */
import { iconSvg } from '../components/icons';

/* viz 组件库很大（源码约 400KB），静态 import 会把它打进每页必下的主包。
   这里改成按需动态加载：页面里真出现 ```viz 围栏才拉取对应 chunk。
   导出给首页 hero 复用——**全站只保留这一个动态 import 调用点**，
   否则 bundler 会为每个调用点各生成一份 viz chunk（实测出过两份 299KB）。 */
let vizModPromise = null;
export function loadVizModule() {
  if (!vizModPromise) {
    vizModPromise = import('./viz').then(
      (mod) => mod,
      (e) => {
        vizModPromise = null;
        throw e;
      },
    );
  }
  return vizModPromise;
}

const PYODIDE_VERSION = 'v0.26.4';
/* 只留**实测可用**的源。原先第一位是 registry.npmmirror.com 的 -/binary/pyodide/，
   实测 pyodide.js / pyodide.asm.wasm / pyodide-lock.json 全部 404（目录也不存在），
   于是每次冷启动都先白白失败一轮再退到 jsdelivr；万一哪天镜像复活，
   它还会悄悄供一份可能过期的缓存。宁少勿错。 */
const PYODIDE_CDNS = [
  'https://cdn.jsdelivr.net/pyodide/' + PYODIDE_VERSION + '/full/',
  'https://gcore.jsdelivr.net/pyodide/' + PYODIDE_VERSION + '/full/',
];
const CDN_TIMEOUT_MS = 15000;

let pyodidePromise = null;
let preambleDone = false;

function loadScript(src, timeoutMs) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        el.remove();
        reject(new Error('超时'));
      }
    }, timeoutMs);
    el.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    };
    el.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        el.remove();
        reject(new Error('加载失败'));
      }
    };
    el.src = src;
    document.head.appendChild(el);
  });
}

/* ---------- Python 运行时的本地缓存 ----------
 * 运行时那几个大件（pyodide.asm.wasm ~9MB、python_stdlib.zip ~6MB）原本每次
 * 开页面都要重新下一遍——CDN 的 Cache-Control 靠不住。解决办法是注册一个
 * 只管这三个 CDN 域名的 Service Worker（static/ml-pyodide-sw.js），
 * 把命中后缀的请求存进 Cache Storage，之后从本地拿。
 * 缓存名两边必须一致，改这里记得改 SW。 */
const SW_CACHE = 'ml-pyodide-v1';
const SW_URL = '/ml-pyodide-sw.js';
let swRegistered = false;

function registerPySw() {
  if (swRegistered || typeof navigator === 'undefined') return;
  swRegistered = true;
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(window.location.protocol)) return;
  try {
    navigator.serviceWorker.register(SW_URL).catch(() => {
      /* 注册失败（隐私模式 / 不支持）：退回每次联网下载，不影响功能 */
    });
  } catch {
    /* 同上 */
  }
}

/** 缓存里已经有运行时了吗？有就别再吓唬用户「要下载 10MB」。 */
async function runtimeCached(base) {
  try {
    if (typeof caches === 'undefined') return false;
    const c = await caches.open(SW_CACHE);
    return !!(await c.match(base + 'pyodide.asm.wasm'));
  } catch {
    return false;
  }
}

async function initPyodide(status) {
  registerPySw();
  let lastErr = null;
  for (const base of PYODIDE_CDNS) {
    try {
      const cached = await runtimeCached(base);
      status(
        cached
          ? '从本地缓存装载 Python 运行时…'
          : '首次运行需下载 Python 运行时（约 10 MB，下完会存本地），来源 ' +
              new URL(base).host +
              ' …',
      );
      await loadScript(base + 'pyodide.js', CDN_TIMEOUT_MS);
      const py = await window.loadPyodide({ indexURL: base });
      return py;
    } catch (e) {
      lastErr = e;
      try { delete window.loadPyodide; } catch (e2) { window.loadPyodide = undefined; }
    }
  }
  throw new Error(
    '所有下载源都不可用，请检查网络后重试' +
      (lastErr ? '（最后错误：' + lastErr.message + '）' : ''),
  );
}

function getPyodide(status) {
  if (!pyodidePromise) {
    /* 缓存挂在 window 上：热更新重置模块状态后不会重新下载整个运行时 */
    const cached = window.__mlPyodidePromise;
    pyodidePromise =
      cached ||
      initPyodide(status).catch((e) => {
        /* 两个缓存都要清：只清 window 上那份没用——模块级 pyodidePromise
           仍是那个 rejected promise，`if (!pyodidePromise)` 永远为假，
           于是一次 CDN 抖动之后「运行」按钮次次立刻失败，只能刷新页面。 */
        window.__mlPyodidePromise = null;
        pyodidePromise = null;
        throw e;
      });
    window.__mlPyodidePromise = pyodidePromise;
  }
  return pyodidePromise;
}

const PREAMBLE = `
import io as _io
import base64 as _base64
import contextlib as _contextlib

def _ml_capture_figures():
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return []
    figs = []
    for num in plt.get_fignums():
        bio = _io.BytesIO()
        plt.figure(num).savefig(bio, format="png", dpi=110,
                                bbox_inches="tight")
        figs.append(_base64.b64encode(bio.getvalue()).decode())
    plt.close("all")
    return figs

def _ml_run(code, extra=None):
    g = {"__name__": "__main__"}
    if extra:
        g.update(extra)
    buf = _io.StringIO()
    err = None
    try:
        with _contextlib.redirect_stdout(buf):
            exec(compile(code, "<\\u7ec3\\u4e60>", "exec"), g)
    except Exception as exc:
        import traceback as _tb
        err = _tb.format_exc()
    figs = _ml_capture_figures()
    return buf.getvalue(), figs, err or ""

_ml_console_g = {"__name__": "__main__"}

def _ml_console_run(code, extra=None):
    if extra:
        _ml_console_g.update(extra)
    buf = _io.StringIO()
    err = None
    try:
        with _contextlib.redirect_stdout(buf):
            exec(compile(code, "<\\u63a7\\u5236\\u53f0>", "exec"), _ml_console_g)
    except Exception as exc:
        import traceback as _tb
        err = _tb.format_exc()
    figs = _ml_capture_figures()
    return buf.getvalue(), figs, err or ""
`;

async function ensurePreamble(py) {
  if (preambleDone || py.__mlPreambleDone) {
    preambleDone = true;
    return;
  }
  await py.runPythonAsync(PREAMBLE);
  /* 标记记在 Pyodide 实例上：热更新后模块布尔值清零，但不会重复执行
     PREAMBLE（重复执行会重置 _ml_console_g，丢掉随手算的变量） */
  py.__mlPreambleDone = true;
  preambleDone = true;
}

/* =========================================================================
 * 执行排队（2026-09-28）
 * -------------------------------------------------------------------------
 * 浮窗与笔记本共用**同一个 Pyodide 实例**：两边都往 py.globals 里写 _ml_src，
 * 再调 runPythonAsync('_ml_console_run(_ml_src)')。并发跑的时候后写的把先写的
 * 盖掉，于是「在笔记本里跑一段」和「在浮窗里点运行」会互相串——
 * 跑的是对方的代码，print 出来的东西还出现在对方的面板里。
 *
 * 所以所有执行**串行排队**：先来先跑，后来的等前一个跑完。
 * 排队的另一个好处是 stdout 也不会被抢：setStdout 是全局的单例设置，
 * 两个执行同时在跑时，输出会随机落到两个面板中的某一个。
 *
 * 注意 then(fn, fn)：前一个执行**失败**也要接着往下走，不能让一次异常
 * 把整条队列堵死（那会变成「报错一次之后再也跑不动」）。
 * ========================================================================= */
let execQueue = Promise.resolve();
function queueExec(fn) {
  const p = execQueue.then(fn, fn);
  execQueue = p.then(
    () => {},
    () => {},
  );
  return p;
}

/* ---------- 给笔记本用的执行入口 ----------
 * 与浮窗的「▶ 运行」跑在同一个命名空间 _ml_console_g 里：笔记本单元里定义的
 * 变量在浮窗里能直接用，浮窗里算出来的东西笔记本也能接着用——这是两个面板
 * 「联动」的全部秘密（重置变量对两边同时生效，这也符合直觉）。
 * 与浮窗 run() 的差异：不读槽位/滑块/判题，输出交给 onText 回调自行处置。 */
export async function execInConsole(source, opts = {}) {
  return queueExec(() => execInConsoleNow(source, opts));
}

/* ---------- 按 import 自动装包 ----------
 * Pyodide 启动时**只有标准库**：numpy / sympy / scipy / pandas / matplotlib
 * 都要显式 loadPackage。此前只对 `sympy`、`matplotlib` 两个名字做了特判，
 * 后果是实打实的「数据展示不准确」：
 *   · 22 处 `import scipy` 的课文（t 检验、卡方、ANOVA、Gamma/Beta…）在浏览器里
 *     一律 ModuleNotFoundError，学生以为是自己写错了；
 *   · numpy 只是**碰巧**能用（matplotlib 的依赖，或同一会话里先跑过 matplotlib）。
 * loadPackagesFromImports 会扫源码里的 import 行、按 indexURL 装对应包，
 * 是 Pyodide 官方推荐的用法（它不会装站上根本没有的包，比如 torch）。
 *
 * 装不到的包仍会抛 ModuleNotFoundError——那种情况给一句人话，别让读者
 * 对着 traceback 猜「是不是我代码写错了」。
 */
const PKG_HINT =
  '浏览器里的 Python 运行时（Pyodide）只带常用科学计算包：numpy / sympy / scipy / pandas / matplotlib。' +
  '这一段用到的库不在其中（例如 torch、sklearn、tensorflow）——请把这段代码复制到本机 Python 里运行。';

async function loadImportsFor(py, source, setStatus) {
  const needsMpl = /\bmatplotlib\b/.test(source);
  if (needsMpl) setStatus('加载绘图库…');
  else if (/(^|\n)\s*(import|from)\s/.test(source)) setStatus('检查依赖库…');
  try {
    await py.loadPackagesFromImports(source);
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (/No module named|ModuleNotFoundError/i.test(msg)) {
      const first = msg.split('\n')[0];
      throw new Error(first + '\n' + PKG_HINT);
    }
    throw e;
  }
  if (needsMpl) {
    await py.runPythonAsync("import os; os.environ.setdefault('MPLBACKEND', 'AGG')");
    try {
      await py.runPythonAsync(
        "import matplotlib as _m; _m.rcParams.update({'figure.figsize':(7.2,4.2),'axes.grid':True,'grid.alpha':0.35,'font.size':11,'lines.linewidth':2,'axes.spines.top':False,'axes.spines.right':False})",
      );
    } catch {
      /* 老版本 matplotlib 没有这些 rcParams：忽略 */
    }
  }
}

async function execInConsoleNow(source, opts = {}) {
  const onText = typeof opts.onText === 'function' ? opts.onText : null;
  const setStatus = (s) => {
    if (typeof opts.status === 'function') opts.status(s);
  };
  const py = await getPyodide(setStatus);
  await ensurePreamble(py);
  if (opts.helpers) {
    /* 必须 exec 进 _ml_console_g，不能 py.runPythonAsync(...)：
       后者跑在 Pyodide 的全局命名空间里，而单元代码是 exec(code, _ml_console_g)，
       全局定义的 show() 在单元里根本看不到（会 NameError）。 */
    try {
      py.globals.set('_ml_helpers_src', opts.helpers);
      await py.runPythonAsync('exec(compile(_ml_helpers_src, "<helpers>", "exec"), _ml_console_g)');
    } catch {
      /* 辅助函数注入失败不阻断主流程 */
    }
  }
  /* 用到哪个库就自动装哪个（含 numpy / scipy / pandas），省掉一个「加载 sympy」按钮 */
  await loadImportsFor(py, source, setStatus);
  setStatus('运行中…');
  py.setStdout({ batched: (s) => onText && onText(s, false) });
  py.setStderr({ batched: (s) => onText && onText(s, true) });
  py.globals.set('_ml_src', source);
  const result = await py.runPythonAsync('_ml_console_run(_ml_src)');
  const arr = typeof result.toJs === 'function' ? result.toJs({ depth: 1 }) : result;
  if (result && typeof result.destroy === 'function') result.destroy();
  return { text: arr[0] || '', imgs: arr[1] || [], err: arr[2] || '' };
}

/** 按需装 Python 包（笔记本的 sympy 用）。 */
export async function loadPyPackage(name, status) {
  const py = await getPyodide(typeof status === 'function' ? status : () => {});
  await ensurePreamble(py);
  await py.loadPackage(name);
  return true;
}

const HINTS = [
  [/NameError/i, 'NameError：有名字没被定义过。检查拼写，或确认前面课程是否讲过它。'],
  [/SyntaxError/i, 'SyntaxError：语法写错了。看报错指向的那一行附近。'],
  [/ModuleNotFoundError/i, '模块不存在：本站代码只用课程里出现过的库。'],
  [/IndentationError/i, '缩进错误：Python 靠缩进分层，检查行首空格。'],
  [/ZeroDivisionError/i, '除以零了。数学上我们很快会讲到"为什么不能除以零"。'],
];

export function prettifyError(msg) {
  const lines = msg.split('\n');
  const kept = [];
  let skipBlock = false;
  for (const line of lines) {
    const m = line.match(/^\s+File "([^"]*)"/);
    if (m) {
      const internal =
        !line.includes('\u7ec3\u4e60') &&
        !line.includes('\u63a7\u5236\u53f0') &&
        !line.includes('<module>');
      skipBlock = internal;
      if (!internal) kept.push(line);
      continue;
    }
    if (skipBlock) {
      if (/^\s*$/.test(line) || /^\s*(\^|\||~)/.test(line)) continue;
      skipBlock = false;
    }
    kept.push(line);
  }
  const body = kept.join('\n').trim();
  const hint = HINTS.find(([re]) => re.test(msg));
  return body + (hint ? '\n\n提示：' + hint[1] : '');
}

function normalizeOut(text) {
  const lines = String(text)
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim());
  const collapsed = [];
  let prevEmpty = false;
  for (const l of lines) {
    const empty = l === '';
    if (empty && prevEmpty) continue;
    collapsed.push(l);
    prevEmpty = empty;
  }
  return collapsed.join('\n').trim();
}

/* 判题比对：数值按**相对容差**比，文字仍要精确相等。
 * -------------------------------------------------------------------------
 * 此前是 normalizeOut(got) === normalizeOut(want) 的纯字符串相等。1099 个练习里
 * 594 个期望值是小数，最脆的一个是 17 位有效数字（value=0.36787944117144233）：
 * 学生只要换了等价但运算顺序不同的写法（先乘后除 vs 先除后乘），末几位一变就被
 * 判成「✗ 还不对」——答案是对的，判定是错的。这类假阴性的杀伤力远大于显示误差：
 * 学生会以为自己写错了，反复改一个本来正确的解。
 *
 * 所以这里拆成 token 逐段比：两段都解析成有限数 → 按相对误差 1e-9 比；
 * 否则（True/False/covered/文字标签）仍走精确字符串相等，不放松。
 * 相对容差用 |want| 作基准：1e-9 远小于课程里任何一次真实取值的差异
 * （比如 0.2027 vs 0.2026 差 5e-4，照样判错），不会把真错的答案放过。
 */
const NUM_SPLIT = /(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/;
const NUM_ONLY = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const REL_TOL = 1e-9;

/* 纯整数（无小数点、无指数）且位数很多的 token：走字符串比。
   Number() 超过 2^53 就退化成 double，2**100 与 2**100+1 会解析成同一个数
   （…205376 vs …205377），相对容差再一放，错答案会被判对——判题宁可严格。 */
const BIG_INT = /^-?\d{16,}$/;

function tokenizeOut(s) {
  return String(s).split(NUM_SPLIT).filter((x) => x !== '');
}

function sameOutput(got, want) {
  if (got === want) return true;
  const g = tokenizeOut(got);
  const w = tokenizeOut(want);
  if (g.length !== w.length) return false;
  for (let i = 0; i < w.length; i += 1) {
    const isNum = NUM_ONLY.test(g[i]) && NUM_ONLY.test(w[i]);
    if (isNum) {
      /* 大整数：去掉前导零后精确相等才算对（判题里的大数都是计算出来的
         精确值，见 03 章「菌群一夜」那类 2 的幂） */
      if (BIG_INT.test(g[i]) || BIG_INT.test(w[i])) {
        const norm = (s) => s.replace(/^(-?)0+(?=\d)/, '$1');
        if (norm(g[i]) !== norm(w[i])) return false;
        continue;
      }
      const a = Number(g[i]);
      const b = Number(w[i]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
      /* 纯相对容差，**不加**绝对下限：加了就等于给接近 0 的期望值开了个大口子。
         反例就是 docs/44-numerical-analysis/10-floating-point 那个练习——它考的
         正是「0.1+0.2-0.3 不等于 0，而是 5.55e-17」，若用 max(|want|,1)*1e-9 当容差，
         学生答 0 也会被判对，等于把这一课教反了。want 为 0 时容差就是 0，
         要求精确相等（课程里的 0 都是格式化输出，本来就是确定的）。 */
      if (Math.abs(a - b) > Math.abs(b) * REL_TOL) return false;
    } else if (g[i] !== w[i]) {
      return false;
    }
  }
  return true;
}

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h + s.charCodeAt(i)) | 0) >>> 0;
  }
  return h.toString(36);
}

/* ---------- 登录态（论文下载 / 学习进度的门禁） ---------- */

import { getAuth, isAuthed } from '../auth';
/* 进度/练习/续学位置的存储口径统一在 src/learning/progress.js：
   那边管命名空间与旧 key 迁移，这里只负责读写，避免两处写法漂移。 */
import {
  progressNS,
  nsKey,
  migrateLegacy as migrateLegacyProgress,
  readProgress,
  writeProgress,
  clearSpace,
  recordVisit,
  notifyDataDirty,
  EXERCISE_KEY,
} from '../learning/progress';

/* ---------- localStorage 小工具 ---------- */

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { }
}

/* ---------- 进度命名空间 ----------
 * 进度对所有人开放：未登录存本地「游客空间」，登录后存「账号空间」
 * （同一浏览器多账号互不混淆）。实现见 src/learning/progress.js。 */
function passStore() {
  migrateLegacyProgress();
  return loadJSON(nsKey(EXERCISE_KEY), {});
}

/* ---------- 浮窗控制台 ---------- */

const SCRATCH_DEFAULT = '# 随手算：写点什么，Ctrl+Enter 运行\n# 变量在两次运行之间是保留的\nx = 2 ** 100\nprint(x)';

/* 会话状态必须挂在全局上跨热更新代共享：
   开发时编辑本文件会让模块整个重新执行，若状态随模块重置，
   新一代代码与旧壳互不相认，轻则「点按钮没反应」，重则空引用崩掉路由。
   SSR 侧没有 window，退回 globalThis——服务端只需模块能求值，不会真正用到状态。 */
const consoleState = ((typeof window !== 'undefined' ? window : globalThis).__mlConsoleState =
  (typeof window !== 'undefined' ? window : globalThis).__mlConsoleState || {
  fab: null,
  panel: null,
  editor: null,
  status: null,
  out: null,
  btnRun: null,
  btnHint: null,
  btnResetCode: null,
  btnResetNs: null,
  btnBack: null,
  headTitle: null,
  banner: null,
  store: null,
  slot: 'scratch',
  slotTitle: 'Python 随手算',
  prompt: '',
  exercise: null,
  sliders: [],
  sliderTimer: null,
  sliderPending: false,
  syncAfterRun: false,
  sliderSpecChanged: false,
  running: false,
  originals: {},
  resets: {},
  callbacks: new Map(),
});

/* 模块代次：本文件每次被重新执行（保存/热更新）就 +1。
   浮窗壳是跨模块代次复用的，壳上按钮绑的闭包还属于上一代代码——
   上一代的 bug 也跟着活着（踩过：滑块回调引用不到 run、同步读不到值）。
   所以 ensureConsole 发现壳不是本代建的，就拆掉重建，让新代码真正接管。 */
const GEN =
  ((typeof window !== 'undefined' ? window : globalThis).__mlEnhancerGen =
    ((typeof window !== 'undefined' ? window : globalThis).__mlEnhancerGen || 0) + 1);

function consoleStore() {
  if (!consoleState.store) {
    const raw = loadJSON('ml-console', {});
    const store = raw && typeof raw === 'object' ? raw : {};
    if (!store.drafts || typeof store.drafts !== 'object') store.drafts = {};
    if (typeof store.draft === 'string' && store.draft && !store.drafts.scratch) {
      store.drafts.scratch = store.draft;
    }
    delete store.draft;
    consoleState.store = store;
  }
  return consoleState.store;
}

function saveConsoleStore() {
  saveJSON('ml-console', consoleStore());
}

function currentSource() {
  return consoleState.editor ? consoleState.editor.value : '';
}

function stashCurrent() {
  const s = consoleStore();
  s.drafts[consoleState.slot] = currentSource();
  saveConsoleStore();
}

function applySlot(slot, opts) {
  const s = consoleStore();
  clearTimeout(consoleState.sliderTimer);
  consoleState.sliderTimer = null;
  consoleState.sliderPending = false;
  stashCurrent();
  consoleState.slot = slot;
  consoleState.prompt = opts?.prompt || '';
  consoleState.exercise = opts?.exercise || null;
  consoleState.sliders = opts?.sliders || [];
  consoleState.originals[slot] = opts?.original ?? s.drafts[slot] ?? SCRATCH_DEFAULT;
  consoleState.resets[slot] =
    opts?.resetSource ?? consoleState.originals[slot] ?? SCRATCH_DEFAULT;
  /* overwrite：槽位里已经存着上一次的草稿时也要覆盖。
     笔记本「送到浮窗」恒用 'nb' 这一个槽位——第二次送时 drafts['nb'] 已有旧值，
     新代码被丢掉、编辑器里还是上一回那段，用户以为没反应。
     「恢复代码」走的 resets[slot]，所以覆盖草稿不会让人丢东西。 */
  if (opts?.overwrite || !s.drafts[slot]) s.drafts[slot] = consoleState.originals[slot];
  consoleState.editor.value = s.drafts[slot];
  consoleState.slotTitle = opts?.title || (slot === 'scratch' ? 'Python 随手算' : '代码块');
  refreshChrome();
  renderSliders();
  saveConsoleStore();
}

function renderSliders() {
  const st = consoleState;
  const box = st.slidersBox;
  clearTimeout(st.sliderTimer);
  st.sliderTimer = null;
  st.sliderPending = false;
  box.innerHTML = '';
  if (!st.sliders.length) {
    box.classList.remove('is-visible');
    return;
  }
  box.classList.add('is-visible');
  /* 「⇄ 从代码同步」：代码运行后，把代码里的变量值回填到滑块，
     让交互组件跟着代码里改的参数走（与拖动滑块反向） */
  const syncRow = document.createElement('div');
  syncRow.className = 'ml-console__syncrow';
  const syncBtn = document.createElement('button');
  syncBtn.type = 'button';
  syncBtn.className = 'ml-console__syncbtn';
  syncBtn.textContent = '⇄ 从代码同步参数';
  syncBtn.title =
    '先运行一次代码，再点这个按钮：把代码运行后产生的变量值回填到滑块（例如代码里把 top 改成 200，点这里滑块就跳到 200，交互组件随之更新）';
  syncBtn.addEventListener('click', requestSyncFromCode);
  syncRow.appendChild(syncBtn);
  box.appendChild(syncRow);
  for (const s of st.sliders) {
    const row = document.createElement('div');
    row.className = 'ml-slider';
    const label = document.createElement('label');
    label.textContent = s.name + ' =';
    const range = document.createElement('input');
    range.type = 'range';
    /* label 与滑块关联：不关联的话点标签没反应，读屏也只会念「滑块」 */
    range.id = 'ml-sl-' + String(s.name).replace(/[^\w-]/g, '_');
    label.htmlFor = range.id;
    range.min = String(s.min);
    range.max = String(s.max);
    range.step = String(s.step);
    range.value = String(s.value);
    const val = document.createElement('span');
    val.className = 'ml-slider__val';
    val.textContent = String(s.value);
    range.addEventListener('input', () => {
      val.textContent = range.value;
      clearTimeout(st.sliderTimer);
      st.sliderTimer = setTimeout(() => {
        /* 这一条是「立即运行」路径：运行结束的 finally 会看到 sliderPending
           并再跑一次 —— 于是拖一次滑块代码跑两遍，而代码是在持久的
           _ml_console_g 里执行的，`results.append(...)`、计数器这类副作用会翻倍。
           所以立即运行的这条分支**不能**置 sliderPending；只有「当前正在跑、
           本次改动交给它跑完再补一次」时才需要置。 */
        if (st.running) {
          st.sliderPending = true;
          return;
        }
        if (typeof st._run === 'function') st._run();
      }, 260);
    });
    s.input = range;
    s.valEl = val;
    row.append(label, range, val);
    box.appendChild(row);
  }
}

/* 点「⇄ 从代码同步参数」：请求运行一次当前代码，运行完成后自动把
   _ml_console_g 里的变量值回填到滑块（见 run() 的 finally 分支）。 */
function requestSyncFromCode() {
  const st = consoleState;
  if (!st.sliders.length) return;
  if (st.running) {
    st.syncAfterRun = true;
    return;
  }
  st.syncAfterRun = true;
  if (typeof st._run === 'function') st._run();
}

/* 读取 _ml_console_g 中与滑块同名的变量，回填滑块。返回是否有变化。 */
async function syncSlidersFromCode() {
  const st = consoleState;
  if (!st.sliders.length) return false;
  try {
    const py = await getPyodide((s) => {
      if (st.status) st.status.textContent = s;
    });
    await ensurePreamble(py);
    const names = st.sliders.map((s) => s.name);
    const res = await py.runPythonAsync(
      '{n: _ml_console_g.get(n) for n in ' + JSON.stringify(names) + '}',
    );
    let vals;
    try {
      /* dict_converter: Object.fromEntries 把 Python dict 转成普通对象，
         否则 toJs 默认转 Map，vals[s.name] 取不到值 */
      vals =
        typeof res.toJs === 'function'
          ? res.toJs({ depth: 1, dict_converter: Object.fromEntries })
          : res;
    } finally {
      if (res && typeof res.destroy === 'function') res.destroy();
    }
    let changed = false;
    for (const s of st.sliders) {
      const v = vals[s.name];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const clamped = Math.min(Math.max(v, s.min), s.max);
      const cur = parseFloat(s.input.value);
      if (Math.abs(clamped - cur) > 1e-9) {
        s.input.value = String(clamped);
        if (s.valEl) s.valEl.textContent = String(clamped);
        changed = true;
      }
    }
    if (st.status) {
      if (changed) {
        st.status.textContent = '已把代码里的参数同步到滑块，自动重跑';
      } else if (st.sliderSpecChanged) {
        st.status.textContent = '滑块已按代码里的 # sliders: 行更新';
      } else {
        st.status.textContent = '代码里没有给滑块变量赋新值，滑块保持不变';
      }
    }
    st.sliderSpecChanged = false;
    return changed;
  } catch (e) {
    if (st.status) st.status.textContent = '同步失败：' + String((e && e.message) || e);
    return false;
  }
}

/* 每次运行前按编辑器里的 # sliders: 行刷新滑块规格。
   此前滑块只在点「▶ 浮窗实验」那一刻解析一次，之后在代码里改行
   （改初值/范围/步长）滑块完全不跟——用户以为同步坏了。
   规格有变时整行重建（初值、上限都按新行来），没变则不动滑块。 */
function refreshSliderSpec(source) {
  const st = consoleState;
  const spec = parseSliders(source);
  const same =
    spec.length === st.sliders.length &&
    spec.every((p, i) => {
      const s = st.sliders[i];
      return (
        p.name === s.name &&
        p.min === s.min &&
        p.max === s.max &&
        p.step === s.step &&
        p.value === s.value
      );
    });
  st.sliderSpecChanged = !same;
  if (same) return;
  st.sliders = spec;
  renderSliders();
}

function refreshChrome() {
  const st = consoleState;
  const isEx = !!st.exercise;
  const showPrompt = isEx || st.prompt;
  st.headTitle.textContent =
    (st.slot === 'scratch'
      ? 'Python 随手算 · 变量保留 · Ctrl+Enter 运行'
      : '来源：' + st.slotTitle + (isEx ? ' · 判题模式' : '')) +
    ' · Ctrl+Enter 运行';
  st.btnBack.style.display = st.slot === 'scratch' ? 'none' : '';
  st.btnRun.textContent = isEx ? '▶ 运行并检查' : '▶ 运行';
  st.banner.style.display = showPrompt ? '' : 'none';
  st.banner.className =
    'ml-console__banner' +
    (isEx ? ' ml-console__banner--exercise' : '') +
    (!isEx && st.prompt ? ' ml-console__banner--question' : '');
  if (showPrompt) {
    const label = document.createElement('strong');
    const text = document.createElement('span');
    if (isEx) {
      label.textContent = '✍ 答题模式：';
      text.textContent =
        (st.exercise.title || '练习') +
        '（目标输出 ' + st.exercise.check.length + ' 行）';
    } else {
      label.textContent = '题目：';
      text.textContent = st.prompt;
    }
    st.banner.replaceChildren(label, text);
  }
  st.btnHint.style.display = isEx && st.exercise.hint ? '' : 'none';
  st.btnResetNs.style.display = isEx ? 'none' : '';
}

export function openInConsole(opts) {
  ensureConsole();
  const st = consoleState;
  /* 显示模式：窄屏默认整页、宽屏默认浮窗（用户手动选过的偏好优先）。
     这一步不能省——正文里的按钮只加 is-open，不经过 setOpen()。 */
  if (typeof st._applyMode === 'function') st._applyMode();
  /* 路由切换后，旧页面练习/解题的回调不会再被触发：顺手清掉，防 Map 无限增长。
     #ex- 是判题练习、#solve- 是「用 Python 解题」，两条入口都要清。 */
  for (const k of Array.from(st.callbacks.keys())) {
    if ((k.includes('#ex-') || k.includes('#solve-')) && !k.startsWith(location.pathname)) {
      st.callbacks.delete(k);
    }
  }
  if (opts?.exercise?.key) {
    st.callbacks.set(opts.exercise.key, opts.exercise.onPass || null);
  } else if (opts?.key && String(opts.key).startsWith('#ex-')) {
    if (!st.callbacks.has(opts.key)) st.callbacks.set(opts.key, null);
  }

  if (st.running) {
    st.panel.classList.add('is-open');
    st.fab.classList.add('is-active');
    st.out.classList.add('py-runner__out--visible');
    st.status.textContent = '正在运行，已保持当前槽位';
    /* 明确告诉调用方「这次没换过去」：笔记本据此提示用户，
       否则它会说「已送到浮窗」，而编辑器里还是上一段代码。 */
    return false;
  }

  st.panel.classList.add('is-open');
  st.fab.classList.add('is-active');
  applySlot(opts?.key || 'scratch', {
    original: opts?.source,
    resetSource: opts?.resetSource,
    overwrite: opts?.overwrite,
    title: opts?.title,
    prompt: opts?.prompt,
    exercise: opts?.exercise || null,
    sliders: opts?.sliders || [],
  });
  st.out.innerHTML = '';
  st.out.classList.remove('py-runner__out--visible');
  st.status.textContent = '';
  requestAnimationFrame(() => st.editor.focus());
}

/* 拆掉笔记本的圆钮与面板（浮窗跨代重建时一起带走，避免留下点了没反应的残壳）。
   笔记本与公式面板都是按需动态 import 的：它们各自会在下次打开时检查
   panel 是否还在文档里，不在就重建，所以这里只管拆。 */
function dropNotebookShell() {
  document.getElementById('ml-nb-fab')?.remove();
  document.getElementById('ml-bk-fab')?.remove();
  document.getElementById('ml-notebook')?.remove();
  document.getElementById('ml-backup')?.remove();
  document.getElementById('ml-formula')?.remove();
  document.getElementById('ml-repo')?.remove();
}

/* 文档级监听去重：热更新重建浮窗时先摘掉上一实例挂的全局监听，防止重复触发 */
function bindDocListener(type, handler) {
  const bag = (window.__mlDocHandlers = window.__mlDocHandlers || {});
  if (bag[type]) document.removeEventListener(type, bag[type]);
  bag[type] = handler;
  document.addEventListener(type, handler);
}

function ensureConsole() {
  const st = consoleState;
  if (st.fab && st.panel && document.contains(st.fab) && document.contains(st.panel)) {
    if (st.panel.__mlGen === GEN) return;
    /* 壳健在但是上一代模块建的：壳上按钮绑的闭包全是旧代码，旧 bug 也跟着活着。
       拆掉重建让新代码接管（编辑区内容和开合状态先保后还）。
       若只领养不重建，热更新后新一代修复永远装不进旧按钮——踩过两次。 */
    const restoreSlot = st.slot || 'scratch';
    const restore = {
      wasOpen: st.panel.classList.contains('is-open'),
      slot: restoreSlot,
      /* 槽位元数据一起带走：滑块规格/判题模式/恢复源，重建后 applySlot 原样喂回 */
      opts: {
        original: st.originals[restoreSlot],
        resetSource: st.resets[restoreSlot],
        title: st.slotTitle,
        prompt: st.prompt,
        exercise: st.exercise,
        sliders: st.sliders,
      },
    };
    try {
      stashCurrent();
    } catch {
      /* 保内容失败不阻断重建 */
    }
    st.panel.remove();
    st.fab.remove();
    document.querySelector('.ml-lightbox')?.remove();
    dropNotebookShell();
    st.fab = null;
    st.panel = null;
    st._restoreAfterBuild = restore;
  }

  const fabEl = document.getElementById('ml-fab');
  const panelEl = document.getElementById('ml-console');
  if (fabEl && panelEl && panelEl.__mlRefs && document.contains(panelEl)) {
    if (panelEl.__mlGen === GEN) {
      /* 壳健在但引用失效（异常兜底）：领养现有节点，绝不拆除——
         拆了正在使用的浮窗，用户手里的按钮就全变成「点了没反应」。 */
      Object.assign(st, panelEl.__mlRefs);
      return;
    }
    /* 旧代残壳：拆掉重建（与上面同一套保内容逻辑） */
    const restoreSlot2 = st.slot || 'scratch';
    try {
      stashCurrent();
    } catch {
      /* 同上 */
    }
    const restore = {
      wasOpen: panelEl.classList.contains('is-open'),
      slot: restoreSlot2,
      opts: {
        original: st.originals[restoreSlot2],
        resetSource: st.resets[restoreSlot2],
        title: st.slotTitle,
        prompt: st.prompt,
        exercise: st.exercise,
        sliders: st.sliders,
      },
    };
    panelEl.remove();
    fabEl.remove();
    document.querySelector('.ml-lightbox')?.remove();
    dropNotebookShell();
    st.fab = null;
    st.panel = null;
    st._restoreAfterBuild = restore;
  }

  /* 真没有壳（或壳残缺）才全新构建。浮窗节点都是我们自己 append 到
     body 的普通节点（不归 React 管），可以安全移除残骸。 */
  fabEl?.remove();
  panelEl?.remove();
  document.querySelector('.ml-lightbox')?.remove();
  dropNotebookShell();

  const fab = document.createElement('button');
  fab.id = 'ml-fab';
  fab.className = 'ml-fab';
  fab.type = 'button';
  fab.title = 'Python 控制台（Alt+P）';
  fab.setAttribute('aria-label', '打开 Python 控制台');
  fab.textContent = 'Py';

  /* 笔记本入口：叠在 Py 按钮正上方（右下角第二个圆钮，位置见 custom.css）。
     笔记本与浮窗共用同一个 Python 命名空间，变量互相可见。
     圆钮上放图标不放文字：两个圆钮挨着，文字会糊成一团，图标一眼能分。 */
  const fabNote = document.createElement('button');
  fabNote.id = 'ml-nb-fab';
  fabNote.className = 'ml-fab ml-fab--note';
  fabNote.type = 'button';
  fabNote.title = '数学笔记本（Alt+N）';
  fabNote.setAttribute('aria-label', '打开数学笔记本');
  fabNote.innerHTML = iconSvg('notebook', 24);

  /* 数据面板（备份 / 还原 / 空间搬家）**不再**放右下角第三个圆钮了。
     2026-09-28 搬迁：圆钮藏得太深，而「登录后进度看着像没了」恰恰是最需要它的时刻。
     现在它常驻在登录页账号卡片下方靠右那一块（见 src/pages/login.js 的 DataPanel），
     顶栏账号菜单和 Alt+D 都指到那儿去——一个功能只留一个家，不要两处入口互相打架。 */

  const panel = document.createElement('div');
  panel.id = 'ml-console';
  panel.className = 'ml-console';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Python 浮窗控制台');

  const head = document.createElement('div');
  head.className = 'ml-console__head';
  const btnBack = document.createElement('button');
  btnBack.className = 'ml-console__back';
  btnBack.type = 'button';
  btnBack.title = '回到随手算草稿';
  btnBack.textContent = '← 随手算';
  const headTitle = document.createElement('span');
  headTitle.className = 'ml-console__headtitle';
  const btnMode = document.createElement('button');
  btnMode.className = 'ml-console__mode';
  btnMode.type = 'button';
  const btnClose = document.createElement('button');
  btnClose.className = 'ml-console__close';
  btnClose.type = 'button';
  btnClose.title = '关闭（Esc）';
  btnClose.setAttribute('aria-label', '关闭 Python 控制台');
  btnClose.textContent = '×';
  head.append(btnBack, headTitle, btnMode, btnClose);

  const banner = document.createElement('div');
  banner.className = 'ml-console__banner';
  banner.style.display = 'none';

  const slidersBox = document.createElement('div');
  slidersBox.className = 'ml-console__sliders';

  const editor = document.createElement('textarea');
  editor.className = 'ml-console__editor';
  editor.spellcheck = false;
  editor.placeholder = 'print("hello")';

  const bar = document.createElement('div');
  bar.className = 'ml-console__bar';
  const status = document.createElement('span');
  status.className = 'py-runner__status ml-console__status';
  const btnHint = document.createElement('button');
  btnHint.className = 'py-runner__btn py-runner__btn--ghost';
  btnHint.textContent = '提示';
  btnHint.style.display = 'none';
  const btnRun = document.createElement('button');
  btnRun.className = 'py-runner__btn';
  btnRun.textContent = '▶ 运行';
  const btnResetCode = document.createElement('button');
  btnResetCode.className = 'py-runner__btn py-runner__btn--ghost';
  btnResetCode.textContent = '恢复代码';
  const btnClearOut = document.createElement('button');
  btnClearOut.className = 'py-runner__btn py-runner__btn--ghost';
  btnClearOut.textContent = '清屏';
  const btnBigOut = document.createElement('button');
  btnBigOut.className = 'py-runner__btn py-runner__btn--ghost';
  btnBigOut.title = '在「编辑/输出平分」和「输出占满」之间切换';
  btnBigOut.textContent = '输出放大';
  const btnResetNs = document.createElement('button');
  btnResetNs.className = 'py-runner__btn py-runner__btn--ghost';
  btnResetNs.title = '清空随手算的所有变量';
  btnResetNs.textContent = '重置变量';
  const btnRepo = document.createElement('button');
  btnRepo.className = 'py-runner__btn py-runner__btn--ghost ml-console__repo';
  btnRepo.type = 'button';
  btnRepo.title = '把编辑器里的代码存进代码仓库（本机 / 账号空间）';
  btnRepo.textContent = '仓库';
  const btnFx = document.createElement('button');
  btnFx.className = 'py-runner__btn py-runner__btn--ghost ml-console__fx';
  btnFx.type = 'button';
  btnFx.title = '打开公式输入器（符号面板 + 实时预览，插入到光标处）';
  btnFx.textContent = '公式';
  bar.append(status, btnHint, btnRun, btnResetCode, btnClearOut, btnBigOut, btnResetNs, btnFx, btnRepo);

  const out = document.createElement('div');
  out.className = 'py-runner__out ml-console__out';
  /* 判题结果（✓ 通过 / ✗ 还不对）、报错、运行输出都只出现在这一块里。
     没有 aria-live 的话，读屏用户点了「运行」听不到任何结果。 */
  out.setAttribute('role', 'status');
  out.setAttribute('aria-live', 'polite');

  panel.append(head, banner, slidersBox, editor, bar, out);
  document.body.append(fabNote, fab, panel);

  const refs = {
    fab, fabNote, panel, editor, status, out, btnRun, btnHint,
    btnResetCode, btnResetNs, btnBack, headTitle, banner, slidersBox, btnMode, btnRepo, btnFx,
  };
  /* 引用登记在壳上：热更新后新一代模块靠它领养或识别跨代重建 */
  panel.__mlRefs = refs;
  panel.__mlGen = GEN;
  Object.assign(st, refs);

  /* 参与层叠：点到谁谁在最上面（三个浮窗共用 zorder.js 的栈） */
  watchPanel(panel);

  btnBigOut.addEventListener('click', () => {
    const big = panel.classList.toggle('is-bigout');
    btnBigOut.textContent = big ? '恢复编辑' : '输出放大';
    /* 只切模式，**不清输出**：原先这里无条件 clearOut() + 塞一行说明，
       正在看的 traceback、`✗ 还不对。期望输出是：…` 或 `✓ 通过` 会被清掉
       且无法恢复——切个显示模式不该毁掉刚跑出来的结果。 */
    out.classList.add('py-runner__out--visible');
  });

  /* ---------- 显示模式：浮窗 ⇄ 整页 ----------
   * 窄屏（≤1024px，平板竖屏起）默认整页——浮窗会盖掉大半个屏幕；
   * 宽屏按用户偏好，默认浮窗。用户手动点过按钮后偏好写进 localStorage，
   * 之后不再被屏幕宽度覆盖。整页模式下禁用拖动（没有可拖的余地）。 */
  const MODE_KEY = 'ml-console-mode';
  const mqNarrow = window.matchMedia('(max-width: 1024px)');
  let modeLocked = false;
  try {
    modeLocked = window.localStorage.getItem(MODE_KEY) !== null;
  } catch {
    modeLocked = false;
  }

  const readPrefMode = () => {
    try {
      return window.localStorage.getItem(MODE_KEY);
    } catch {
      return null;
    }
  };

  const applyMode = () => {
    const want = readPrefMode() || (mqNarrow.matches ? 'fullpage' : 'floating');
    const isFull = want === 'fullpage';
    panel.classList.toggle('is-fullpage', isFull);
    if (isFull) {
      /* 整页模式靠 CSS 定位：清掉拖拽留下的内联坐标，否则切不回去 */
      panel.style.left = '';
      panel.style.top = '';
      panel.style.right = '';
      panel.style.bottom = '';
      panel.style.transform = '';
    }
    btnMode.textContent = isFull ? '浮窗' : '整页';
    btnMode.title = isFull ? '切回浮窗（可拖动、可调位置）' : '铺满整个网页';
    btnMode.setAttribute('aria-label', btnMode.title);
  };

  btnMode.addEventListener('click', () => {
    const next = panel.classList.contains('is-fullpage') ? 'floating' : 'fullpage';
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      /* 隐私模式下写不进去：本次会话内仍生效，只是不跨会话记忆 */
    }
    modeLocked = true;
    applyMode();
  });

  const onNarrowChange = () => {
    if (modeLocked) return;
    applyMode();
  };
  if (mqNarrow.addEventListener) mqNarrow.addEventListener('change', onNarrowChange);
  else if (mqNarrow.addListener) mqNarrow.addListener(onNarrowChange);

  let activeLb = null;
  const closeLb = () => {
    if (activeLb) {
      activeLb.remove();
      activeLb = null;
      return true;
    }
    return false;
  };
  bindDocListener('click', (ev) => {
    const img = ev.target.closest && ev.target.closest('.py-runner__img img');
    if (!img) return;
    ev.preventDefault();
    closeLb();
    activeLb = document.createElement('div');
    activeLb.className = 'ml-lightbox';
    const big = document.createElement('img');
    big.src = img.src;
    big.alt = '图像查看';
    activeLb.appendChild(big);
    activeLb.addEventListener('click', closeLb);
    document.body.appendChild(activeLb);
  });

  const setOpen = (v) => {
    panel.classList.toggle('is-open', v);
    fab.classList.toggle('is-active', v);
    if (v) {
      applyMode();
      bringToFront(panel);
      requestAnimationFrame(() => editor.focus());
    }
  };
  const isOpen = () => panel.classList.contains('is-open');

  /* ---------- 笔记本 / 代码仓库的公共接口 ----------
   * 两个面板与浮窗共用同一个 Pyodide 实例、同一个命名空间（execInConsole），
   * 所以「送到浮窗 / 取回浮窗」只是搬代码，变量本来就通着。 */
  const toolApi = {
    exec: execInConsole,
    prettify: prettifyError,
    loadPackage: loadPyPackage,
    getSource: () => (st.editor ? st.editor.value : ''),
    /* 笔记本单元 → 浮窗：开一个新槽位装进去，不动随手算草稿 */
    setSource: (src, title) => {
      return openInConsole({
        key: 'nb',
        title: title || '笔记本片段',
        source: src,
        resetSource: src,
        /* 每次都覆盖 'nb' 槽位的旧草稿：同一个槽位复用，不覆盖的话
           第二次「送到浮窗」传的新代码会被上一次的草稿顶掉 */
        overwrite: true,
      });
    },
    openConsole: () => setOpen(true),
    status: (s) => {
      st.status.textContent = s;
    },
    getContext: () => st.slotTitle || '',
    /* 仓库的「插入」：把一段代码追加到编辑器末尾（与 setSource 的「替换」相对） */
    insertSource: (src) => {
      setOpen(true);
      const cur = st.editor.value;
      const gap = cur && !/\n\s*$/.test(cur) ? '\n\n' : '';
      const next = cur + gap + String(src || '').replace(/\s+$/, '') + '\n';
      st.editor.value = next;
      const s = consoleStore();
      s.drafts[st.slot] = next;
      saveConsoleStore();
      st.editor.focus();
      st.editor.selectionStart = st.editor.selectionEnd = next.length;
      refreshCompleter();
    },
  };

  btnFx.addEventListener('click', async () => {
    try {
      const mod = await import('./formula');
      await mod.openFormula();
    } catch (e) {
      st.status.textContent = '公式面板打不开：' + ((e && e.message) || e);
    }
  });

  btnRepo.addEventListener('click', async () => {
    try {
      const mod = await import('./repo');
      mod.openRepo(toolApi);
    } catch (e) {
      st.status.textContent = '仓库打不开：' + ((e && e.message) || e);
    }
  });

  fabNote.addEventListener('click', async () => {
    try {
      const mod = await import('./notebook');
      /* 与 Py 圆钮一致：开着就收起来。原先只开不关——用户点第二次是想收起，
         结果又把整块面板重建了一遍（输出清空、滚动位置丢失）。 */
      if (typeof mod.isNotebookOpen === 'function' && mod.isNotebookOpen()) {
        mod.closeNotebook();
        return;
      }
      st.status.textContent = '正在打开笔记本…';
      await mod.openNotebook(toolApi);
      st.status.textContent = '';
    } catch (e) {
      st.status.textContent = '笔记本打不开：' + ((e && e.message) || e);
    }
  });

  /* 数据面板的入口搬到了**页面右上角**（顶栏那颗「数据」钮，见 Navbar/DataMenu.js）。
     Alt+D 这个快捷键留着——老用户肌肉记忆还在。
     它只做一件事：请求顶栏把面板打开（窗口事件 ml-open-data）。
     刻意不在这里就地开浮窗、也不在登录页另开一份：同一套 UI 两个落点，
     改一处忘一处是迟早的事。 */
  const gotoDataPanel = () => {
    window.dispatchEvent(new Event('ml-open-data'));
  };

  fab.addEventListener('click', () => {
    if (!isOpen()) {
      setOpen(true);
      if (st.running) {
        status.textContent = '正在运行，已保持当前槽位';
        return;
      }
      applySlot('scratch', {});
      return;
    }
    setOpen(false);
  });
  btnClose.addEventListener('click', () => setOpen(false));
  btnBack.addEventListener('click', () => {
    if (st.running) {
      status.textContent = '正在运行，不能切换槽位';
      return;
    }
    stashCurrent();
    applySlot('scratch', {});
  });

  bindDocListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (closeLb()) return;
      /* 分层关闭：几个浮窗叠着开时（比如从浮窗按钮栏进了仓库/公式面板），
         Esc 只关最上面那一层。本监听注册得比子面板早，所以必须先问一句
         「我是不是栈顶」——不问的话会抢先把底下的浮窗关掉。 */
      if (isOpen() && isTopmost(panel)) setOpen(false);
    } else if (ev.altKey && !ev.ctrlKey && !ev.metaKey && (ev.key === 'p' || ev.key === 'P')) {
      if (ev.repeat) return;
      ev.preventDefault();
      if (!isOpen()) {
        setOpen(true);
        if (st.running) status.textContent = '正在运行，已保持当前槽位';
      } else {
        setOpen(false);
      }
    } else if (ev.altKey && !ev.ctrlKey && !ev.metaKey && (ev.key === 'n' || ev.key === 'N')) {
      /* 在输入框里打字时不抢：Alt+N 会把笔记本整个重建，光标与滚动位置全丢 */
      if (ev.repeat || isTypingTarget(ev.target)) return;
      ev.preventDefault();
      fabNote.click();
    } else if (ev.altKey && !ev.ctrlKey && !ev.metaKey && (ev.key === 'd' || ev.key === 'D')) {
      /* 注意：Alt+D 在 Chrome/Edge/Firefox 上是浏览器保留的「聚焦地址栏」，
         大概率收不到；所以数据面板的主入口是顶栏右上角那颗「数据」钮，
         这里只是给收得到的环境留一条近路（另有 Alt+Shift+D，见下）。 */
      if (ev.repeat) return;
      ev.preventDefault();
      gotoDataPanel();
    } else if (ev.altKey && ev.shiftKey && (ev.key === 'd' || ev.key === 'D')) {
      /* 浏览器吞掉 Alt+D 时的备用组合，文案写在按钮 title 里 */
      ev.preventDefault();
      gotoDataPanel();
    }
  });

  /* 输出里写 $$…$$ / $…$ 会渲染成公式（见 mathout.js）。
     判题比较走的是 normalizeOut(textOut) 的字符串，不读 DOM，
     所以这里换成 KaTeX 节点不会影响练习判题。 */
  const appendText = (text, cls) => {
    if (!text) return;
    out.classList.add('py-runner__out--visible');
    const div = document.createElement('div');
    if (cls) div.className = cls;
    setMathText(div, text);
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  };
  const clearOut = () => {
    out.innerHTML = '';
    out.classList.remove('py-runner__out--visible');
  };
  btnClearOut.addEventListener('click', clearOut);

  let saveTimer = null;
  editor.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const s = consoleStore();
      s.drafts[st.slot] = editor.value;
      saveConsoleStore();
    }, 400);
  });

  /* ---------- 代码补全 ----------
   * 挂在编辑器自己的 keydown 之前：补全吃下的按键（Tab 接受/唤出等）会
   * stopImmediatePropagation，后面的「Tab 缩进两格」就不会再加两个空格。
   * 候选 = 静态词表 + 这段代码里自己起过的名字 + 控制台里的变量名。 */
  let pyNames = [];
  const completer = attachComplete(editor);
  const refreshCompleter = () => {
    completer.setExtras(harvestWords(editor.value).concat(pyNames));
  };
  refreshCompleter();

  editor.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      run();
    }
    if (ev.key === 'Tab') {
      /* Shift+Tab 放行：Tab 在这里被吃成「缩进两格」，两个方向都吃掉的后果是
         **键盘用户出不去这个编辑区**（WCAG 2.1.2 键盘陷阱）。笔记本单元里
         同样只吃正向 Tab。 */
      if (ev.shiftKey) return;
      ev.preventDefault();
      const s = editor.selectionStart;
      const e2 = editor.selectionEnd;
      editor.value = editor.value.slice(0, s) + '  ' + editor.value.slice(e2);
      editor.selectionStart = editor.selectionEnd = s + 2;
      refreshCompleter();
    }
  });

  /* 与笔记本共用 Pyodide 实例，所以整段执行排进同一条队列（见 queueExec）。
     按钮的 busy 判定仍走 st.running：排队中的第二次点击照样被挡住。 */
  const run = () => queueExec(runNow);

  const runNow = async () => {
    if (st.running) return;
    st.running = true;
    btnRun.disabled = true;
    clearOut();
    stashCurrent();
    const source = editor.value;
    /* 用户在代码里改了 # sliders: 行：先按新行刷新滑块，再注入参数 */
    refreshSliderSpec(source);
    const chunks = [];
    try {
      const py = await getPyodide((s) => (status.textContent = s));
      await ensurePreamble(py);
      /* 按 import 自动装包（numpy / sympy / scipy / pandas / matplotlib），
         不用点按钮——原先只特判 sympy 与 matplotlib，scipy 永远装不上 */
      await loadImportsFor(py, source, (s) => {
        status.textContent = s;
      });
      status.textContent = '运行中…';
      py.setStdout({ batched: (s) => { chunks.push(s); appendText(s); } });
      py.setStderr({ batched: (s) => appendText(s, 'py-runner__errtext') });
      py.globals.set('_ml_src', source);
      let extraArg = '';
      if (st.sliders.length) {
        const obj = {};
        for (const s of st.sliders) obj[s.name] = parseFloat(s.input.value);
        py.globals.set('_ml_extra', py.toPy(obj));
        extraArg = ', _ml_extra';
      }
      const call = (isExerciseSlot() ? '_ml_run(_ml_src' : '_ml_console_run(_ml_src') + extraArg + ')';
      const result = await py.runPythonAsync(call);
      const arr = typeof result.toJs === 'function' ? result.toJs({ depth: 1 }) : result;
      result.destroy?.();
      const textOut = arr[0] || '';
      const imgs = arr[1];
      const errText = arr[2] || '';

      /* 把控制台里的变量名喂给补全：运行过一次之后，自己定义的变量也能提示 */
      try {
        const names = await py.runPythonAsync(
          "sorted([k for k in _ml_console_g.keys() if not k.startswith('_')])",
        );
        const arr2 = names && typeof names.toJs === 'function' ? names.toJs({ depth: 1 }) : names;
        if (names && typeof names.destroy === 'function') names.destroy();
        if (Array.isArray(arr2) && arr2.length) {
          pyNames = arr2.filter((x) => typeof x === 'string' && x.length < 40).slice(0, 400);
          refreshCompleter();
        }
      } catch {
        /* 取变量名失败无所谓，补全只是少几个候选 */
      }

      if (textOut) appendText(textOut);
      for (const b64 of imgs || []) {
        out.classList.add('py-runner__out--visible');
        const box = document.createElement('div');
        box.className = 'py-runner__img';
        const img = document.createElement('img');
        img.src = 'data:image/png;base64,' + b64;
        img.alt = '输出的图像';
        box.appendChild(img);
        out.appendChild(box);
      }

      if (errText) {
        /* 出错也要保住出错前已打印的内容，学生才能对照排查 */
        appendText(prettifyError(errText), 'py-runner__errtext');
        status.textContent = '出错 ✗';
        return;
      }

      if (isExerciseSlot()) {
        const got = normalizeOut(textOut);
        const want = normalizeOut(st.exercise.check.join('\n'));
        if (sameOutput(got, want)) {
          const a = getAuth();
          appendText('✓ 输出与期望一致，通过！进度已保存。', 'ml-exercise__pass');
          const passes = passStore();
          passes[st.slot] = true;
          saveJSON(nsKey(EXERCISE_KEY), passes);
          /* 练习通过记录也要发一次「数据有改动」：不发的后果是只刷练习、
             不点「标记已学完」的用户，通过记录永远留在本机，
             换设备「已通过」全丢（学完标记走 progress.js，是会推的）。 */
          notifyDataDirty();
          appendText(
            a ? '（账号空间：' + a.u + '）' : '（本地存储 · 登录后进度存入账号空间）',
            'ml-exercise__unauthed',
          );
          const cb = st.callbacks.get(st.slot);
          if (cb) cb();
        } else {
          appendText('✗ 还不对。期望输出是：', 'ml-exercise__fail');
          appendText(want, 'ml-exercise__want');
        }
      } else if (!(imgs || []).length && !textOut && !chunks.length) {
        appendText('(运行完毕，无输出)', 'py-runner__dim');
      }
      status.textContent = '完成 ✔';
    } catch (e) {
      appendText(prettifyError(String(e.message || e)), 'py-runner__errtext');
      status.textContent = '出错 ✗';
    } finally {
      const shouldRerun = st.sliderPending;
      st.sliderPending = false;
      const sync = st.syncAfterRun;
      st.syncAfterRun = false;
      btnRun.disabled = false;
      st.running = false;
      if (sync) {
        /* 「⇄ 从代码同步参数」：本次运行结束后读取代码变量回填滑块；
           若有变化，用新滑块值再跑一次（与拖动滑块同一套重跑逻辑） */
        syncSlidersFromCode().then((changed) => {
          if (changed) {
            st.sliderPending = true;
            setTimeout(run, 0);
          }
        });
      } else if (shouldRerun) {
        setTimeout(run, 0);
      }
    }
  };
  /* 供外部（如 renderSliders 的同步按钮）触发一次运行 */
  st._run = run;
  /* 供 openInConsole 用：正文里的「▶ 浮窗运行 / 在浮窗作答 / 用 Python 解题」
     只是给面板加 is-open，走不到 setOpen()，于是**窄屏默认整页**这条规则
     （applyMode）从来不生效——浮窗会以 92vh 的居中卡片压住整个手机屏。 */
  st._applyMode = applyMode;

  function isExerciseSlot() {
    return !!st.exercise;
  }

  btnRun.addEventListener('click', run);

  btnHint.addEventListener('click', () => {
    if (st.exercise?.hint) appendText('提示：' + st.exercise.hint, 'py-runner__dim');
  });

  btnResetCode.addEventListener('click', () => {
    editor.value = st.resets[st.slot] ?? st.originals[st.slot] ?? SCRATCH_DEFAULT;
    const s = consoleStore();
    s.drafts[st.slot] = editor.value;
    saveConsoleStore();
    clearOut();
    status.textContent = '';
  });

  btnResetNs.addEventListener('click', async () => {
    btnResetNs.disabled = true;
    try {
      /* 清命名空间也要排进执行队列：笔记本单元或浮窗正在跑的时候直接 clear()，
         运行中的代码会当场 NameError，而报错还显示在另一个面板里。 */
      await queueExec(async () => {
        const py = await getPyodide((s) => (status.textContent = s));
        await ensurePreamble(py);
        await py.runPythonAsync(
          '_ml_console_g.clear(); _ml_console_g.update({"__name__": "__main__"})',
        );
      });
      clearOut();
      status.textContent = '变量已清空';
    } catch (e) {
      status.textContent = '重置失败';
    } finally {
      btnResetNs.disabled = false;
    }
  });

  let drag = null;
  head.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('button')) return;
    if (panel.classList.contains('is-fullpage')) return;
    const rect = panel.getBoundingClientRect();
    panel.style.transform = 'none';
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    drag = { dx: ev.clientX - rect.left, dy: ev.clientY - rect.top };
    head.setPointerCapture(ev.pointerId);
  });
  head.addEventListener('pointermove', (ev) => {
    if (!drag || ev.buttons === 0) {
      drag = null;
      return;
    }
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const x = Math.min(Math.max(ev.clientX - drag.dx, 8), window.innerWidth - w - 8);
    const y = Math.min(Math.max(ev.clientY - drag.dy, 8), window.innerHeight - h - 8);
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });
  const endDrag = () => {
    drag = null;
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', () => {
    drag = null;
  });
  head.addEventListener('lostpointercapture', () => {
    drag = null;
  });

  applySlot('scratch', {});

  /* 跨代重建后，恢复上一代面板的开合状态与所在槽位（编辑内容已存 drafts） */
  const restore = st._restoreAfterBuild;
  if (restore) {
    st._restoreAfterBuild = null;
    if (restore.wasOpen) {
      st.panel.classList.add('is-open');
      st.fab.classList.add('is-active');
    }
    applySlot(restore.slot, restore.opts || {});
  }
}

/* ---------- 正文代码块：注入浮窗按钮 / 内嵌测验 ---------- */

function extractSource(container) {
  const code = container.querySelector('code');
  if (!code) return '';
  const lineEls = code.querySelectorAll('[class*="token-line"]');
  if (lineEls.length) {
    return Array.from(lineEls)
      .map((l) => (l.textContent || '').replace(/\u00a0/g, ' '))
      .join('\n');
  }
  return (code.textContent || '').replace(/\u00a0/g, ' ');
}

function parseSliders(source) {
  const m = source.match(/^#\s*sliders:\s*(.+)$/m);
  if (!m) return [];
  const out = [];
  const re =
    /([A-Za-z_]\w*)\s*=\s*(-?\d+(?:\.\d+)?)\s*\[\s*(-?[\d.]+)\s*[:：]\s*(-?[\d.]+)\s*[:：]\s*(-?[\d.]+)\s*\]/g;
  let mm;
  while ((mm = re.exec(m[1]))) {
    out.push({
      name: mm[1],
      value: parseFloat(mm[2]),
      min: parseFloat(mm[3]),
      max: parseFloat(mm[4]),
      step: parseFloat(mm[5]),
    });
  }
  return out;
}

function makeMiniBtn(label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ml-mini-btn';
  b.textContent = label;
  return b;
}

function getButtonGroup(container) {
  let group = container.querySelector('[class*="buttonGroup"]');
  if (!group) {
    group = document.createElement('div');
    group.className = 'ml-btn-group';
    const content = container.querySelector('[class*="codeBlockContent"]') || container;
    content.appendChild(group);
  }
  return group;
}

function parseExerciseMeta(source) {
  const meta = { title: '', check: [], hint: '', initial: [] };
  for (const line of source.split('\n')) {
    const m = line.match(/^#\s*@(title|check|hint):\s*(.*)$/);
    if (m) {
      if (m[1] === 'title') meta.title = m[2].trim();
      else if (m[1] === 'check') meta.check.push(m[2].trim());
      else if (m[1] === 'hint') meta.hint = m[2].trim();
    } else {
      meta.initial.push(line);
    }
  }
  while (meta.initial.length && !meta.initial[0].trim()) meta.initial.shift();
  while (meta.initial.length && !meta.initial[meta.initial.length - 1].trim()) meta.initial.pop();
  meta.initial = meta.initial.join('\n');
  return meta;
}

function buildQuizCard(source) {
  const lines = source
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const wrap = document.createElement('div');
  wrap.className = 'ml-quiz';

  let question = null;
  const options = [];
  let explanation = null;

  for (const line of lines) {
    if (line.startsWith('-')) {
      const text = line.replace(/^[-*]\s*/, '');
      const correct = /\[\*\]\s*$/.test(text);
      options.push({ text: text.replace(/\s*\[\*]\s*$/, ''), correct });
    } else if (line.startsWith('?')) {
      explanation = line.replace(/^[？?]\s*/, '');
    } else if (!question) {
      question = line.replace(/^q[:：]\s*/i, '');
    }
  }

  if (!question || options.length < 2) {
    const warn = document.createElement('div');
    warn.className = 'ml-quiz__bad';
    warn.textContent = '测验格式有误：需要一行问题 + 至少两个 "- 选项"，正确项标 [*]';
    wrap.appendChild(warn);
    return wrap;
  }

  const qEl = document.createElement('div');
  qEl.className = 'ml-quiz__q';
  qEl.textContent = question;
  wrap.appendChild(qEl);

  const list = document.createElement('div');
  list.className = 'ml-quiz__opts';
  const inputs = [];
  const radioName = 'mlq-' + Math.random().toString(36).slice(2, 9);
  options.forEach((opt, i) => {
    const label = document.createElement('label');
    label.className = 'ml-quiz__opt';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = radioName;
    inputs.push({ input, label, correct: opt.correct });
    const span = document.createElement('span');
    span.textContent = String.fromCharCode(65 + i) + '. ' + opt.text;
    label.append(input, span);
    list.appendChild(label);
  });
  wrap.appendChild(list);

  const hasCorrect = options.some((o) => o.correct);
  const feedback = document.createElement('div');
  feedback.className = 'ml-quiz__fb';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');

  const btnCheck = document.createElement('button');
  btnCheck.className = 'ml-quiz__btn';
  btnCheck.textContent = '提交';

  btnCheck.addEventListener('click', () => {
    const picked = inputs.find(({ input }) => input.checked);
    feedback.querySelectorAll('.ml-quiz__exp').forEach((e) => e.remove());
    if (!picked) {
      feedback.className = 'ml-quiz__fb ml-quiz__fb--warn';
      feedback.textContent = '先选一个选项再提交。';
      return;
    }
    if (!hasCorrect) {
      feedback.className = 'ml-quiz__fb';
      feedback.textContent = '本题为开放讨论题，结合上文思考即可。';
    } else if (picked.correct) {
      feedback.className = 'ml-quiz__fb ml-quiz__fb--ok';
      feedback.textContent = '答对了！';
      inputs.forEach(({ label, correct }) => {
        if (correct) label.classList.add('is-correct');
      });
    } else {
      feedback.className = 'ml-quiz__fb ml-quiz__fb--no';
      feedback.textContent = '不对哦，再想想——可以重选后再提交。';
      picked.label.classList.add('is-wrong');
    }
    if (explanation && picked.correct) {
      const exp = document.createElement('div');
      exp.className = 'ml-quiz__exp';
      exp.textContent = '解释：' + explanation;
      feedback.appendChild(exp);
    }
  });

  wrap.append(list, btnCheck, feedback);
  return wrap;
}

function bindCodeBlocks() {
  /* 练习块的通过表与旧版草稿表按需各读一次（原来每个练习块全量 JSON.parse 两遍，
     一页 15 个练习就是 30 次全表解析；无练习块的页面保持零开销）。 */
  let passMap = null;
  let legacyDrafts = null;
  const getPassMap = () => (passMap = passMap || passStore());
  const getLegacyDrafts = () => (legacyDrafts = legacyDrafts || loadJSON('ml-exercise-drafts', {}));
  document.querySelectorAll('pre[class*="language-"]').forEach((pre) => {
    const lang = (pre.className.match(/language-([a-z0-9]+)/) || [])[1] || '';
    if (lang !== 'python' && lang !== 'quiz' && lang !== 'exercise') return;

    const container = pre.closest('.theme-code-block') || pre.parentElement;
    if (!container) return;
    /* 已绑定的块直接跳过——取源（逐 token-line 拼接）与全串哈希是本函数最贵的
       两步，放在 mlBound 判定之前等于每轮重扫都对全页已绑定块白算一遍
       （全站 1861 python + 1184 exercise + 1053 quiz，均值 4–5 块/课）。
       与 lab/index.js 的守卫顺序保持一致。staleQuiz 分支只在**新容器**
       （React 重建、mlBound 尚未置位）上才有意义，先判 mlBound 不会漏掉它。 */
    if (container.dataset.mlBound === '1') return;

    const source = extractSource(container);
    const sourceKey = String(hashStr(source));
    const staleQuiz = [container.previousElementSibling, container.nextElementSibling]
      .find((node) => node?.classList.contains('ml-quiz') && node.dataset.mlSource === sourceKey);
    if (staleQuiz) {
      container.style.display = 'none';
      container.dataset.mlBound = '1';
      return;
    }
    container.dataset.mlBound = '1';

    if (lang === 'quiz') {
      /* 水合安全：不删除 React 管辖的节点——隐藏原容器，把测验卡片插到它后面 */
      const widget = buildQuizCard(source);
      widget.dataset.mlSource = sourceKey;
      const parent = container.parentNode;
      if (parent) {
        container.style.display = 'none';
        parent.insertBefore(widget, container.nextSibling);
      }
      return;
    }

    const group = getButtonGroup(container);
    if (group.querySelector('.ml-mini-btn')) {
      container.dataset.mlBound = '1';
      return;
    }

    if (lang === 'python') {
      const titleEl = container.querySelector('[class*="codeBlockTitle"]');
      const title = titleEl ? (titleEl.textContent || '').trim() : '';
      const key = 'py-' + hashStr(title + '\u0000' + source);
      const sliders = parseSliders(source);
      const btn = makeMiniBtn(sliders.length ? '▶ 浮窗实验' : '▶ 浮窗运行');
      btn.title = sliders.length
        ? '在浮窗中打开：拖动滑块实时改变参数'
        : '在浮窗中运行此代码（可自由修改）';
      btn.addEventListener('click', () => {
        openInConsole({
          key,
          title: title || 'Python 代码块',
          source,
          sliders,
        });
      });
      group.appendChild(btn);
      return;
    }

    if (lang === 'exercise') {
      const meta = parseExerciseMeta(source);
      if (!meta.check.length) {
        const btn = makeMiniBtn('⚠ 练习缺少 @check');
        btn.disabled = true;
        group.appendChild(btn);
        return;
      }
      const key =
        location.pathname +
        '#ex-' +
        hashStr(meta.title + '\u0000' + meta.initial + '\u0000' + meta.check.join('|'));
      const savedDraft = consoleStore().drafts[key];
      const legacyDraft = getLegacyDrafts()[key];
      const startSource = savedDraft || legacyDraft || meta.initial;
      const passed = !!getPassMap()[key];
      const btn = makeMiniBtn(passed ? '✓ 已通过' : '▶ 在浮窗作答');
      if (passed) btn.classList.add('ok');
      btn.title = '打开浮窗完成这道练习';
      btn.addEventListener('click', () => {
        openInConsole({
          key,
          title: meta.title || '练习',
          source: startSource,
          resetSource: meta.initial,
          exercise: {
            key,
            title: meta.title,
            check: meta.check,
            hint: meta.hint,
            onPass: () => {
              btn.textContent = '✓ 已通过';
              btn.classList.add('ok');
            },
          },
        });
      });
      group.appendChild(btn);
      return;
    }
  });
}

function normalizedSolutionQuestion(detail) {
  let node = detail.previousElementSibling;
  while (node && node.tagName !== 'P' && node.tagName !== 'H2' && node.tagName !== 'H3') {
    node = node.previousElementSibling;
  }
  if (!node) return '';
  /* KaTeX 会同时渲染 MathML 和 HTML，直接取 textContent 会让公式重复 */
  const clone = node.cloneNode(true);
  clone.querySelectorAll('.katex-mathml').forEach((el) => el.remove());
  return (clone.textContent || '').replace(/\s+/g, ' ').trim();
}

function solutionTitle(detail) {
  const text = normalizedSolutionQuestion(detail);
  return text
    .replace(/^.*?练习[^：:]*[：:]\s*/, '')
    .trim() || '本题';
}

function bindSolutionDetails() {
  document.querySelectorAll('.theme-doc-markdown details').forEach((detail) => {
    const summary = detail.querySelector('summary');
    if (!summary || detail.dataset.mlSolveBound === '1') return;
    if (!/点开查看逐步解答/.test((summary.textContent || '').trim())) return;

    detail.dataset.mlSolveBound = '1';
    const title = solutionTitle(detail);
    const question = normalizedSolutionQuestion(detail);
    const key =
      location.pathname +
      '#solve-' +
      hashStr(question + '\u0000' + (summary.textContent || '').trim());
    const starter = [
      '# 先别展开下面的解答，试着用 Python 算出来。',
      '# 把题目里的数字和条件写成表达式，print() 输出结果。',
      '',
      '',
    ].join('\n');

    const box = document.createElement('div');
    box.className = 'ml-solve';
    const btn = makeMiniBtn('▶ 用 Python 解题');
    btn.title = '在浮窗中写代码解这道题（草稿会保存在本机）';
    btn.addEventListener('click', () => {
      openInConsole({
        key,
        title,
        prompt: question || '本题',
        source: consoleStore().drafts[key] || starter,
        resetSource: starter,
      });
    });
    box.appendChild(btn);
    detail.parentNode?.insertBefore(box, detail);
  });
}

/* ---------- 学习进度 ---------- */

function enhanceProgress() {
  const article = document.querySelector('article');
  if (!article) return;
  const path = location.pathname;
  if (!/^\/docs\/.+/.test(path)) return;
  if (article.querySelector('.ml-progress')) return;

  migrateLegacyProgress();
  const ns = progressNS(); // ':guest' 或 ':用户名'
  /* 每到一个课程页就记一次「停在哪」，首页的「继续学习」据此定位 */
  recordVisit(path);
  const store = readProgress();

  const box = document.createElement('div');
  box.className = 'ml-progress';

  const btn = document.createElement('button');
  const render = () => {
    const done = Object.values(store).filter(Boolean).length;
    btn.className = 'ml-progress__btn' + (store[path] ? ' done' : '');
    btn.textContent = store[path]
      ? '✓ 已标记学完 · 累计 ' + done + ' 节'
      : '读完这节了？标记「已学完」· 累计 ' + done + ' 节';
  };
  btn.addEventListener('click', () => {
    /* 点击时**重新读一次**再改：扫页面那一刻拿到的 store 是快照，
       期间别处（首页「继续学习」、另一个标签页、数据面板导入）新增的标记
       会被这次整表回写抹掉。 */
    const fresh = readProgress();
    fresh[path] = !(store[path] || fresh[path]);
    Object.keys(store).forEach((k) => {
      delete store[k];
    });
    Object.assign(store, fresh);
    writeProgress(store);
    render();
    document.dispatchEvent(new Event('ml-progress-changed'));
  });

  render();
  box.appendChild(btn);

  const wipe = document.createElement('button');
  wipe.className = 'ml-progress__wipe';
  wipe.textContent = ns === ':guest' ? '清除本机学习数据' : '清除本空间学习数据（' + ns.slice(1) + '）';
  wipe.title =
    ns === ':guest'
      ? '删除本地存的学完标记、练习通过记录、续学位置与练习草稿（随手算草稿保留）'
      : '删除该账号空间存的学完标记、练习通过记录、续学位置与练习草稿（随手算草稿保留）';
  wipe.addEventListener('click', () => {
    if (
      !window.confirm(
        '确定清除当前空间的全部学习数据？学完标记、练习通过记录与练习草稿将被删除。',
      )
    )
      return;
    clearSpace(); /* 学完标记 / 练习通过 / 续学位置一并清掉（见 learning/progress.js） */
    const cs = consoleStore();
    for (const k of Object.keys(cs.drafts)) {
      if (k.includes('#ex-') || k.includes('#solve-')) delete cs.drafts[k];
    }
    saveConsoleStore();
    location.reload();
  });
  box.appendChild(wipe);

  article.appendChild(box);
}

/* ---------- 论文与参考资料卡片 ---------- */

/* 参考资料条目（docs/NN-chapter/999-references.md）用 ```paper 围栏书写，
   每条一张文献卡：文献页面对所有人开放；PDF 下载分两路——
   已登录取本站归档副本（static/papers/），未登录前往原始地址。 */

function parsePaperMeta(source) {
  const meta = {};
  for (const line of source.split('\n')) {
    const m = line.match(/^#\s*@([A-Za-z_]\w*):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  /* 生成器把 PDF 链接写成 base64（@pdf64 原始地址 / @local64 本站副本），
     避免静态 HTML 源码直接可读；手写条目仍可用明文 @pdf / @local。
     arXiv 等 PDF 链接均为 ASCII，atob 足够。 */
  for (const [from, to] of [['pdf64', 'pdf'], ['local64', 'local']]) {
    if (!meta[from]) continue;
    try {
      const bytes = Uint8Array.from(atob(meta[from]), (c) => c.charCodeAt(0));
      meta[to] = new TextDecoder().decode(bytes);
    } catch {
      /* 解码失败时宁可没有下载按钮，也不要给出坏链接 */
    }
    delete meta[from];
  }
  return meta;
}

/* 下载按钮的两副面孔：登录 → 本站副本；未登录 → 原始地址。
   登录态可能在卡片渲染之后变化（在别的页登录/退出登录再回来），
   所以把 meta 挂在 WeakMap 上，收到 ml-auth-changed 时整体重刷一遍。 */
const pdfBtnMeta = new WeakMap();

function paintPdfButton(el, meta) {
  const useLocal = Boolean(meta.local) && isAuthed();
  el.dataset.mlMode = useLocal ? 'local' : 'remote';
  if (useLocal) {
    el.textContent = meta.lsize ? `⬇ 本地下载（${meta.lsize}）` : '⬇ 本地下载';
    el.title = '从本站下载已归档的 PDF 副本';
    el.setAttribute('href', meta.local);
    el.setAttribute('download', '');
    el.removeAttribute('target');
    el.removeAttribute('rel');
  } else {
    el.textContent = meta.local ? '⬇ 原站下载' : '⬇ PDF 下载';
    el.title = meta.local
      ? '未登录：前往原始地址下载（登录后可直接从本站取归档副本）'
      : '在新窗口打开 PDF（原始地址）';
    el.setAttribute('href', meta.pdf);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
    el.removeAttribute('download');
  }
}

function repaintPdfButtons() {
  document.querySelectorAll('.ml-paper__btn--pdf').forEach((el) => {
    const meta = pdfBtnMeta.get(el);
    if (meta) paintPdfButton(el, meta);
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('ml-auth-changed', repaintPdfButtons);
}

function buildPaperCard(meta) {
  const card = document.createElement('div');
  card.className = 'ml-paper';

  const head = document.createElement('div');
  head.className = 'ml-paper__head';
  const tag = document.createElement('span');
  tag.className = 'ml-paper__tag';
  tag.textContent = meta.tag || '论文';
  head.appendChild(tag);
  const title = document.createElement('span');
  title.className = 'ml-paper__title';
  title.textContent = meta.title || '';
  head.appendChild(title);
  card.appendChild(head);

  const metaLine = [meta.authors, meta.year, meta.venue].filter(Boolean).join(' · ');
  if (metaLine) {
    const sub = document.createElement('div');
    sub.className = 'ml-paper__meta';
    sub.textContent = metaLine;
    card.appendChild(sub);
  }
  if (meta.desc) {
    const desc = document.createElement('div');
    desc.className = 'ml-paper__desc';
    desc.textContent = meta.desc;
    card.appendChild(desc);
  }

  const actions = document.createElement('div');
  actions.className = 'ml-paper__actions';

  if (meta.page) {
    const a = document.createElement('a');
    a.className = 'ml-paper__btn ml-paper__btn--page';
    a.href = meta.page;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = '文献页面 ↗';
    a.title = '打开文献/资料页面（无需登录）';
    actions.appendChild(a);
  }

  if (meta.pdf) {
    const btn = document.createElement('a');
    btn.className = 'ml-paper__btn ml-paper__btn--pdf';
    pdfBtnMeta.set(btn, meta);
    paintPdfButton(btn, meta);
    actions.appendChild(btn);
  }

  card.appendChild(actions);
  return card;
}

function enhancePapers() {
  document.querySelectorAll('pre[class*="language-paper"]').forEach((pre) => {
    const container = pre.closest('.theme-code-block') || pre.parentElement;
    if (!container) return;
    /* 同 bindCodeBlocks：先判 mlBound 再取源+哈希，省掉每轮对已绑定块的白算 */
    if (container.dataset.mlBound === '1') return;
    const source = extractSource(container);
    const sourceKey = String(hashStr(source));
    /* 水合安全：不删除 React 管辖的节点——隐藏原容器，把文献卡插到它后面 */
    const staleCard = [container.previousElementSibling, container.nextElementSibling].find(
      (node) => node?.classList.contains('ml-paper') && node.dataset.mlSource === sourceKey,
    );
    if (staleCard) {
      container.style.display = 'none';
      container.dataset.mlBound = '1';
      return;
    }
    container.dataset.mlBound = '1';

    const widget = buildPaperCard(parsePaperMeta(source));
    widget.dataset.mlSource = sourceKey;
    const parent = container.parentNode;
    if (parent) {
      container.style.display = 'none';
      parent.insertBefore(widget, container.nextSibling);
    }
  });
}

/* ---------- 扫描入口 ---------- */

/* queueMicrotask 只合并"同一个任务"里的变更，而一次拖动/流式输出会连着发很多个
   任务 —— 结果是每帧跑 1 轮（甚至多轮）全文档扫描（8 个文档级查询 + 逐块取源）。
   改成两段合并：
     ① rAF 合并同一帧内的全部变更（一帧最多一轮）；
     ② 静默窗口：距上一轮不到 QUIET_MS 的新变更不立刻跑，等窗口结束补跑一次，
        把"连续变更"从每帧一轮压到约每 QUIET_MS 一轮。
   首轮不受影响（lastRunAt=0 直接走 rAF），所以路由切换后的首扫照样及时。 */
let scheduled = false;
let lastRunAt = 0;
let trailingTimer = 0;
const QUIET_MS = 100;

function runEnhance() {
  scheduled = false;
  lastRunAt = Date.now();
  enhanceAll();
}

export function scheduleEnhance() {
  if (scheduled || trailingTimer) return;
  const since = lastRunAt ? Date.now() - lastRunAt : Infinity;
  if (since < QUIET_MS) {
    trailingTimer = setTimeout(() => {
      trailingTimer = 0;
      scheduleEnhance();
    }, QUIET_MS - since);
    return;
  }
  scheduled = true;
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(runEnhance);
  else runEnhance();
}

function maybeEnhanceViz() {
  if (!document.querySelector('pre[class*="language-viz"]')) return;
  loadVizModule().then(
    (mod) => {
      try { mod.enhanceViz(); } catch (e) { console.error('[ml] viz:', e); }
    },
    (e) => console.error('[ml] viz 加载失败:', e),
  );
}

/* lab 组件库（卷六工程域）同样按需加载：页面里真出现 ```lab 围栏才拉取。
   与 viz 是两套平行系统；lab 走 per-component 分包，粒度比 viz 整包更细。 */
let labModPromise = null;
function loadLabModule() {
  if (!labModPromise) {
    labModPromise = import('./lab/index.js').then(
      (m) => m,
      (e) => {
        labModPromise = null;
        throw e;
      },
    );
  }
  return labModPromise;
}

function maybeEnhanceLab() {
  if (!document.querySelector('pre[class*="language-lab"]')) return;
  loadLabModule().then(
    (m) => {
      try { m.enhanceLab(); } catch (e) { console.error('[ml] lab:', e); }
    },
    (e) => console.error('[ml] lab 加载失败:', e),
  );
}

export function enhanceAll() {
  /* 任一阶段出错都不拖垮其余阶段，更不冒泡打断 React 提交 */
  try { ensureConsole(); } catch (e) { console.error('[ml] console:', e); }
  /* 首页 / /tree / /graph / /function / /login 这些页面连一个代码围栏都没有：
     一次 body 级预判跳过 viz/lab/papers/代码块四个逐语言全文档扫描
     （每次路由切换的 MutationObserver 触发都吃这个收益）。 */
  const hasCode = !!document.body && !!document.body.querySelector('pre[class*="language-"]');
  try { if (hasCode) bindCodeBlocks(); } catch (e) { console.error('[ml] code blocks:', e); }
  try { bindSolutionDetails(); } catch (e) { console.error('[ml] solutions:', e); }
  try { if (hasCode) maybeEnhanceViz(); } catch (e) { console.error('[ml] viz:', e); }
  try { if (hasCode) maybeEnhanceLab(); } catch (e) { console.error('[ml] lab:', e); }
  try { if (hasCode) enhancePapers(); } catch (e) { console.error('[ml] papers:', e); }
  try { enhanceProgress(); } catch (e) { console.error('[ml] progress:', e); }
}

/* 路由切换前清理 lab 组件持有的 AudioContext 等资源 */
export function disposeLabComponents() {
  loadLabModule().then(
    (m) => {
      try { m.disposeLab(); } catch (e) { console.error('[ml] lab dispose:', e); }
    },
    () => {},
  );
}

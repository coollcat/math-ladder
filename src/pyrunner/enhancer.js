/* 输出里的数学公式（$$…$$ / $…$）渲染，KaTeX 在这边按需加载 */
import { setMathText } from './mathout';
/* 代码补全（静态词表 + 自己起过的名字），极简版 */
import { attachComplete, harvestWords } from './complete';
/* 三个浮窗谁最后被点谁在最上面 */
import { watchPanel, bringToFront } from './zorder';
/* 图标（圆钮上的笔记本图标走 iconSvg 字符串版，见 src/components/icons.js） */
import { iconSvg } from '../components/icons';

/* viz 组件库很大（源码约 400KB），静态 import 会把它打进每页必下的主包。
   这里改成按需动态加载：页面里真出现 ```viz 围栏才拉取对应 chunk。 */
let vizModPromise = null;
function loadVizModule() {
  if (!vizModPromise) {
    vizModPromise = import('./viz').then(
      (mod) => mod.enhanceViz,
      (e) => {
        vizModPromise = null;
        throw e;
      },
    );
  }
  return vizModPromise;
}

const PYODIDE_VERSION = 'v0.26.4';
const PYODIDE_CDNS = [
  'https://registry.npmmirror.com/-/binary/pyodide/' + PYODIDE_VERSION + '/full/',
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
        window.__mlPyodidePromise = null;
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

/* ---------- 给笔记本用的执行入口 ----------
 * 与浮窗的「▶ 运行」跑在同一个命名空间 _ml_console_g 里：笔记本单元里定义的
 * 变量在浮窗里能直接用，浮窗里算出来的东西笔记本也能接着用——这是两个面板
 * 「联动」的全部秘密（重置变量对两边同时生效，这也符合直觉）。
 * 与浮窗 run() 的差异：不读槽位/滑块/判题，输出交给 onText 回调自行处置。 */
export async function execInConsole(source, opts = {}) {
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
  /* 用到哪个库就自动装哪个，省掉一个「加载 sympy」按钮（与浮窗同一套逻辑） */
  if (/\bsympy\b/.test(source)) {
    setStatus('加载符号计算库…');
    await py.loadPackage('sympy');
  }
  if (/\bmatplotlib\b/.test(source)) {
    setStatus('加载绘图库…');
    await py.loadPackage('matplotlib');
    await py.runPythonAsync("import os; os.environ.setdefault('MPLBACKEND', 'AGG')");
    try {
      await py.runPythonAsync(
        "import matplotlib as _m; _m.rcParams.update({'figure.figsize':(7.2,4.2),'axes.grid':True,'grid.alpha':0.35,'font.size':11,'lines.linewidth':2,'axes.spines.top':False,'axes.spines.right':False})",
      );
    } catch {
      /* 老版本 matplotlib 没有这些 rcParams：忽略 */
    }
  }
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
  if (!s.drafts[slot]) s.drafts[slot] = consoleState.originals[slot];
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
        st.sliderPending = true;
        /* run 是 ensureConsole 内部的局部函数，这里够不着；
           st._run 是它暴露出来的引用，运行中则交给 run 的 finally 重跑 */
        if (!st.running && typeof st._run === 'function') st._run();
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
  /* 路由切换后，旧页面练习的回调不会再被触发：顺手清掉，防 Map 无限增长 */
  for (const k of Array.from(st.callbacks.keys())) {
    if (k.includes('#ex-') && !k.startsWith(location.pathname)) st.callbacks.delete(k);
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
    return;
  }

  st.panel.classList.add('is-open');
  st.fab.classList.add('is-active');
  applySlot(opts?.key || 'scratch', {
    original: opts?.source,
    resetSource: opts?.resetSource,
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
  document.getElementById('ml-notebook')?.remove();
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

  const panel = document.createElement('div');
  panel.id = 'ml-console';
  panel.className = 'ml-console';

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
    clearOut();
    out.classList.add('py-runner__out--visible');
    appendText('(输出放大模式：再次点击「恢复编辑」返回)', 'py-runner__dim');
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
      openInConsole({
        key: 'nb',
        title: title || '笔记本片段',
        source: src,
        resetSource: src,
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
      st.status.textContent = '正在打开笔记本…';
      const mod = await import('./notebook');
      await mod.openNotebook(toolApi);
      st.status.textContent = '';
    } catch (e) {
      st.status.textContent = '笔记本打不开：' + ((e && e.message) || e);
    }
  });

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
      if (isOpen()) setOpen(false);
    } else if (ev.altKey && (ev.key === 'p' || ev.key === 'P')) {
      ev.preventDefault();
      if (!isOpen()) {
        setOpen(true);
        if (st.running) status.textContent = '正在运行，已保持当前槽位';
      } else {
        setOpen(false);
      }
    } else if (ev.altKey && (ev.key === 'n' || ev.key === 'N')) {
      ev.preventDefault();
      fabNote.click();
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
      ev.preventDefault();
      const s = editor.selectionStart;
      const e2 = editor.selectionEnd;
      editor.value = editor.value.slice(0, s) + '  ' + editor.value.slice(e2);
      editor.selectionStart = editor.selectionEnd = s + 2;
      refreshCompleter();
    }
  });

  const run = async () => {
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
      /* sympy 与 matplotlib 一样按需自动装：代码里 import 了就装，不用点按钮 */
      if (/\bsympy\b/.test(source)) {
        status.textContent = '加载符号计算库…';
        await py.loadPackage('sympy');
      }
      const needsMpl = /\bmatplotlib\b/.test(source);
      if (needsMpl) {
        status.textContent = '加载绘图库…';
        await py.loadPackage('matplotlib');
        await py.runPythonAsync("import os; os.environ.setdefault('MPLBACKEND', 'AGG')");
        try {
          await py.runPythonAsync(
            "import matplotlib as _m; _m.rcParams.update({'figure.figsize':(7.2,4.2),'axes.grid':True,'grid.alpha':0.35,'font.size':11,'lines.linewidth':2,'axes.spines.top':False,'axes.spines.right':False})",
          );
        } catch (e2) { }
      }
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
        if (got === want) {
          const a = getAuth();
          appendText('✓ 输出与期望一致，通过！进度已保存。', 'ml-exercise__pass');
          const passes = passStore();
          passes[st.slot] = true;
          saveJSON(nsKey(EXERCISE_KEY), passes);
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
      const py = await getPyodide((s) => (status.textContent = s));
      await ensurePreamble(py);
      await py.runPythonAsync(
        '_ml_console_g.clear(); _ml_console_g.update({"__name__": "__main__"})',
      );
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
  document.querySelectorAll('pre[class*="language-"]').forEach((pre) => {
    const lang = (pre.className.match(/language-([a-z0-9]+)/) || [])[1] || '';
    if (lang !== 'python' && lang !== 'quiz' && lang !== 'exercise') return;

    const container = pre.closest('.theme-code-block') || pre.parentElement;
    if (!container) return;
    const source = extractSource(container);
    const sourceKey = String(hashStr(source));
    const staleQuiz = [container.previousElementSibling, container.nextElementSibling]
      .find((node) => node?.classList.contains('ml-quiz') && node.dataset.mlSource === sourceKey);
    if (staleQuiz) {
      container.style.display = 'none';
      container.dataset.mlBound = '1';
      return;
    }
    if (container.dataset.mlBound === '1') return;
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
      const legacyDraft = loadJSON('ml-exercise-drafts', {})[key];
      const startSource = savedDraft || legacyDraft || meta.initial;
      const btn = makeMiniBtn(passStore()[key] ? '✓ 已通过' : '▶ 在浮窗作答');
      if (passStore()[key]) btn.classList.add('ok');
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
    store[path] = !store[path];
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
    if (container.dataset.mlBound === '1') return;
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

let scheduled = false;

export function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    enhanceAll();
  });
}

function maybeEnhanceViz() {
  if (!document.querySelector('pre[class*="language-viz"]')) return;
  loadVizModule().then(
    (enhanceViz) => {
      try { enhanceViz(); } catch (e) { console.error('[ml] viz:', e); }
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
  try { bindCodeBlocks(); } catch (e) { console.error('[ml] code blocks:', e); }
  try { bindSolutionDetails(); } catch (e) { console.error('[ml] solutions:', e); }
  try { maybeEnhanceViz(); } catch (e) { console.error('[ml] viz:', e); }
  try { maybeEnhanceLab(); } catch (e) { console.error('[ml] lab:', e); }
  try { enhancePapers(); } catch (e) { console.error('[ml] papers:', e); }
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

/* ============================================================
   Fluent 雅致皮肤 · 浮窗 Python 控制台(自包含,无外部依赖)
   - Pyodide v0.26.4 单例,多 CDN 依次兜底(每个 15s 超时)
   - Python PREAMBLE: _ml_run(全新沙盒判题) / _ml_console_run(持久命名空间)
   - 三入口: 随手算 / 正文 python 卡 / 正文 exercise 卡(判题)
   - 草稿: localStorage ml-ui-console;通过记录: ml-ui-exercises
   ============================================================ */

const PYODIDE_VERSION = 'v0.26.4';
const CDNS = [
  'https://registry.npmmirror.com/-/binary/pyodide/' + PYODIDE_VERSION + '/full/',
  'https://cdn.jsdelivr.net/pyodide/' + PYODIDE_VERSION + '/full/',
  'https://gcore.jsdelivr.net/pyodide/' + PYODIDE_VERSION + '/full/',
];
const CDN_TIMEOUT_MS = 15000;

/* ---------- Python 侧 PREAMBLE(注入一次) ---------- */
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
        plt.figure(num).savefig(bio, format="png", dpi=110, bbox_inches="tight")
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
            exec(compile(code, "<exercise>", "exec"), g)
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
            exec(compile(code, "<console>", "exec"), _ml_console_g)
    except Exception as exc:
        import traceback as _tb
        err = _tb.format_exc()
    figs = _ml_capture_figures()
    return buf.getvalue(), figs, err or ""
`;

/* ---------- 小工具 ---------- */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function loadJSON(key, dflt) {
  try { const v = localStorage.getItem(key); return v == null ? dflt : JSON.parse(v); }
  catch { return dflt; }
}
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 忽略 */ } }
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16) + '_' + s.length;
}

/* ---------- Pyodide 加载器(多 CDN 兜底) ---------- */
let pyodidePromise = null;
function loadScript(src, timeoutMs) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    const timer = setTimeout(() => { s.remove(); reject(new Error('timeout')); }, timeoutMs);
    s.onload = () => { clearTimeout(timer); resolve(); };
    s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('load fail')); };
    document.head.appendChild(s);
  });
}
async function getPyodide(status) {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    let lastErr = null;
    for (const base of CDNS) {
      try {
        status('尝试镜像 ' + new URL(base).host + ' …');
        await loadScript(base + 'pyodide.js', CDN_TIMEOUT_MS);
        status('初始化 Python 运行时…(首次约 10-30 秒,请稍候)');
        const py = await window.loadPyodide({ indexURL: base });
        status('注入判题内核…');
        await py.runPythonAsync(PREAMBLE);
        return py;
      } catch (e) { lastErr = e; pyodidePromise = null; }
    }
    throw lastErr || new Error('所有镜像均不可达');
  })();
  return pyodidePromise;
}

/* ---------- 浮窗控制台 ---------- */
class PyConsole {
  constructor() {
    this.py = null;
    this.running = false; // 运行重入守卫
    this.mode = 'scratch'; // scratch | run | exercise
    this.exCtx = null;     // { title, check, hint, payload }
    this.build();
    this.bindLessonButtons();
  }

  build() {
    const fab = el('button', '', 'Py');
    fab.id = 'py-fab';
    fab.type = 'button';
    fab.title = '打开 Python 浮窗';
    fab.addEventListener('click', () => this.toggle());

    const win = el('div', 'py-win');
    win.id = 'py-win';
    win.hidden = true;
    win.innerHTML = `
      <div class="py-title"><span class="py-mode" id="py-mode">随手算</span>
        <span id="py-title-text">Python 浮窗</span>
        <button type="button" class="py-x" id="py-close" title="关闭 (Esc)">✕</button></div>
      <div class="py-status" id="py-status">待命 · 首次运行将自动加载 Pyodide(约 20MB)</div>
      <div class="py-out" id="py-out"></div>
      <div class="py-diff" id="py-diff" hidden></div>
      <div class="py-in">
        <textarea id="py-code" spellcheck="false" placeholder="# 写点什么,Ctrl+Enter 运行;变量跨次保留"></textarea>
        <div class="py-actions">
          <button type="button" class="fl-btn is-accent" id="py-run">▶ 运行</button>
          <button type="button" class="fl-btn" id="py-clear">清空输出</button>
          <span class="pa-hint" id="py-hintline"></span>
        </div>
      </div>`;
    document.body.append(fab, win);

    this.fab = fab; this.win = win;
    this.$mode = win.querySelector('#py-mode');
    this.$title = win.querySelector('#py-title-text');
    this.$status = win.querySelector('#py-status');
    this.$out = win.querySelector('#py-out');
    this.$diff = win.querySelector('#py-diff');
    this.$code = win.querySelector('#py-code');
    this.$run = win.querySelector('#py-run');
    this.$hintline = win.querySelector('#py-hintline');

    win.querySelector('#py-close').addEventListener('click', () => this.close());
    this.$run.addEventListener('click', () => this.runCurrent());
    this.$code.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.runCurrent(); }
      else if (e.key === 'Tab') { // Tab 输入四个空格
        e.preventDefault();
        const t = e.target, s = t.selectionStart, epos = t.selectionEnd;
        t.value = t.value.slice(0, s) + '    ' + t.value.slice(epos);
        t.selectionStart = t.selectionEnd = s + 4;
      }
    });
    this.$code.addEventListener('input', () => this.saveDraft());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.win.hidden) this.close();
    });

    // 恢复草稿
    const d = loadJSON('ml-ui-console', null);
    if (d && typeof d.scratch === 'string') this.$code.value = d.scratch;
  }

  /* ---- 正文卡片按钮委托 ---- */
  bindLessonButtons() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.ml-runbtn');
      if (!btn || !btn.dataset.mlpy) return;
      e.preventDefault();
      const exRaw = btn.dataset.mlpyex;
      if (exRaw) {
        let meta = { title: '', check: [], hint: '' };
        try { meta = JSON.parse(decodeURIComponent(exRaw)); } catch { /* 保底空配置 */ }
        this.exCtx = { ...meta, payload: exRaw };
        this.mode = 'exercise';
      } else {
        this.exCtx = null;
        this.mode = 'run';
      }
      this.$code.value = decodeURIComponent(btn.dataset.mlpy);
      this.saveDraft();
      this.open();
      this.$out.textContent = '';
      this.$diff.hidden = true;
    });
  }

  /* ---- 开关与模式 ---- */
  toggle() { this.win.hidden ? this.open() : this.close(); }
  open() {
    this.win.hidden = false;
    this.applyMode();
    this.$code.focus();
  }
  close() { this.win.hidden = true; }
  applyMode() {
    if (this.mode === 'exercise') {
      this.$mode.textContent = '判题练习';
      this.$mode.classList.add('is-ex');
      this.$title.textContent = this.exCtx && this.exCtx.title ? this.exCtx.title : '判题练习';
      this.$hintline.textContent = '让输出与期望逐行一致';
    } else {
      this.$mode.textContent = '随手算';
      this.$mode.classList.remove('is-ex');
      this.$title.textContent = 'Python 浮窗';
      this.$hintline.textContent = '变量在两次运行之间保留';
    }
  }
  status(msg, cls) {
    this.$status.textContent = msg;
    this.$status.className = 'py-status' + (cls ? ' ' + cls : '');
  }
  print(text, cls) {
    const line = el('div', 'po-line' + (cls ? ' ' + cls : ''), text);
    this.$out.appendChild(line);
    this.$out.scrollTop = this.$out.scrollHeight;
  }
  printFig(b64) {
    const box = el('div', 'po-fig');
    const img = el('img', 'po-img');
    img.src = 'data:image/png;base64,' + b64;
    box.appendChild(img);
    this.$out.appendChild(box);
    this.$out.scrollTop = this.$out.scrollHeight;
  }

  saveDraft() { saveJSON('ml-ui-console', { scratch: this.$code.value }); }

  async runCurrent() {
    if (this.running) return;
    this.running = true;
    this.$run.disabled = true;
    try { this.mode === 'exercise' ? await this.runExercise() : await this.runConsole(); }
    finally {
      this.running = false;
      this.$run.disabled = false;
      this.saveDraft();
    }
  }

  async ensurePy() {
    if (this.py) return this.py;
    try {
      this.py = await getPyodide((m) => this.status(m, 'is-busy'));
      this.status('就绪 · Python ' + this.py.runPython('import sys; sys.version.split()[0]'), 'is-ready');
      return this.py;
    } catch (e) {
      this.status('镜像全部失联: ' + e.message + ' —— 检查网络后再次点击运行即重试', 'is-err');
      throw e;
    }
  }

  async maybeLoadMatplotlib(code) {
    if (!/\bimport\s+matplotlib|\bfrom\s+matplotlib/.test(code)) return;
    if (!this.py.runPython('import importlib.util; importlib.util.find_spec("matplotlib") is not None')) {
      this.status('正在加载 matplotlib(首次较慢)…', 'is-busy');
      await this.py.loadPackage('matplotlib');
      this.status('matplotlib 就绪', 'is-ready');
    }
  }

  /* 随手算 / python 卡: 持久命名空间 */
  async runConsole() {
    const code = this.$code.value;
    if (!code.trim()) return;
    let py;
    try { py = await this.ensurePy(); } catch { return; }
    try { await this.maybeLoadMatplotlib(code); } catch { /* 装载失败交给运行时报错 */ }
    this.status('运行中…', 'is-busy');
    const [out, figs, err] = py.runPython(`_ml_console_run(${JSON.stringify(code)})`).toJs({ depth: 1 });
    if (out) this.print(out.replace(/\n$/, ''));
    figs.forEach((f) => this.printFig(f));
    if (err) { this.print(err.replace(/\n$/, ''), 'po-err'); this.status('运行出错,见红色输出', 'is-err'); }
    else this.status('完成 · ' + new Date().toTimeString().slice(0, 5), 'is-ready');
  }

  /* 练习卡: 全新沙盒 + 逐行判题 */
  async runExercise() {
    const ex = this.exCtx;
    if (!ex) return;
    const code = this.$code.value;
    if (!code.trim()) return;
    let py;
    try { py = await this.ensurePy(); } catch { return; }
    try { await this.maybeLoadMatplotlib(code); } catch { /* 同上 */ }
    this.status('判题中…', 'is-busy');
    const call = `_ml_run(${JSON.stringify(code)}, {"_ml_check": ${JSON.stringify(ex.check)}})`;
    const [out, figs, err] = py.runPython(call).toJs({ depth: 1 });
    figs.forEach((f) => this.printFig(f));
    if (err) {
      this.print(err.replace(/\n$/, ''), 'po-err');
      this.status('代码抛出异常 —— 修复后再试', 'is-err');
      return;
    }
    const got = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const want = (ex.check || []).map((s) => String(s).trim()).filter(Boolean);
    const rows = [];
    let allOk = true;
    const n = Math.max(got.length, want.length);
    for (let i = 0; i < n; i++) {
      const g = got[i], w = want[i];
      const ok = g !== undefined && g === w;
      if (!ok) allOk = false;
      rows.push({ ok, g: g === undefined ? '(缺行)' : g, w: w === undefined ? '(多余)' : w });
    }
    this.renderDiff(rows);
    if (allOk && want.length > 0) {
      this.print('✦ 判题通过,干得漂亮!', 'po-ok');
      this.status('判题通过 · ' + new Date().toTimeString().slice(0, 5), 'is-ready');
      const rec = loadJSON('ml-ui-exercises', {});
      rec[hashStr(ex.payload)] = true;
      saveJSON('ml-ui-exercises', rec);
      echoPassed();
    } else {
      this.status('输出未匹配 —— 对照下方逐行比对修改', 'is-err');
    }
  }

  renderDiff(rows) {
    this.$diff.textContent = '';
    this.$diff.appendChild(el('div', '', '期望输出 vs 实际输出:'));
    rows.forEach((r, i) => {
      const line = el('div', '');
      line.style.display = 'flex';
      line.style.gap = '8px';
      line.appendChild(el('span', r.ok ? 'pd-ok' : 'pd-bad', r.ok ? '✓' : '✗'));
      line.appendChild(el('span', r.ok ? 'pd-ok' : 'pd-bad', `实际[${i}] ${r.g}`));
      line.appendChild(el('span', 'pd-exp', `期望[${i}] ${r.w}`));
      this.$diff.appendChild(line);
    });
    this.$diff.hidden = false;
  }
}

/* ---- 已通过练习的卡片回显(DOM 变化后自动执行) ---- */
function echoPassed() {
  const rec = loadJSON('ml-ui-exercises', {});
  document.querySelectorAll('.ml-exercise .ml-runbtn[data-mlpyex]').forEach((b) => {
    if (rec[hashStr(b.dataset.mlpyex)]) {
      const card = b.closest('.ml-exercise');
      if (card && !card.querySelector('.pass-mark')) {
        card.classList.add('is-passed');
        const head = card.querySelector('.ml-card-head');
        if (head) head.appendChild(el('span', 'pass-mark', '✓ 已通过'));
      }
    }
  });
}
new MutationObserver(echoPassed).observe(document.documentElement, { childList: true, subtree: true });

new PyConsole();

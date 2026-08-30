/* 数学阶梯 · 纸墨版浮窗控制台
   Pyodide 单例（v0.26.4，npmmirror → jsdelivr → gcore.jsdelivr，各 15s 超时）；
   随手算/课程代码走持久命名空间 _ml_console_run；判题练习走全新沙盒 _ml_run；
   matplotlib 懒加载出图。草稿存 ml-ui-console，通过记录存 ml-ui-exercises。 */
window.MLPaperConsole = (function () {
  'use strict';

  var PYODIDE_VERSION = 'v0.26.4';
  var PYODIDE_CDNS = [
    'https://registry.npmmirror.com/-/binary/pyodide/' + PYODIDE_VERSION + '/full/',
    'https://cdn.jsdelivr.net/pyodide/' + PYODIDE_VERSION + '/full/',
    'https://gcore.jsdelivr.net/pyodide/' + PYODIDE_VERSION + '/full/'
  ];
  var CDN_TIMEOUT_MS = 15000;
  var STORE_KEY = 'ml-ui-console';
  var EX_KEY = 'ml-ui-exercises';
  var SCRATCH = 'scratch';
  var SCRATCH_DEFAULT = '# 随手算：随便试。变量跨次保留\nprint(2 ** 10)\n';

  /* ---------- 小工具 ---------- */
  function loadJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = (((h << 5) + h + s.charCodeAt(i)) | 0) >>> 0;
    return h.toString(36);
  }
  function normalizeOut(text) {
    var lines = String(text).replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); });
    var collapsed = [];
    var prevEmpty = false;
    for (var i = 0; i < lines.length; i++) {
      var empty = lines[i] === '';
      if (empty && prevEmpty) continue;
      collapsed.push(lines[i]);
      prevEmpty = empty;
    }
    return collapsed.join('\n').trim();
  }
  var HINTS = [
    [/NameError/i, 'NameError：有名字没被定义过。检查拼写，或确认前面课程是否讲过它。'],
    [/SyntaxError/i, 'SyntaxError：语法写错了。看报错指向的那一行附近。'],
    [/ModuleNotFoundError/i, '模块不存在：本站代码只用课程里出现过的库。'],
    [/IndentationError/i, '缩进错误：Python 靠缩进分层，检查行首空格。'],
    [/ZeroDivisionError/i, '除以零了。数学上我们很快会讲到“为什么不能除以零”。']
  ];
  function prettifyError(msg) {
    var lines = String(msg).split('\n');
    var kept = [];
    var skipBlock = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m = line.match(/^\s+File "([^"]*)"/);
      if (m) {
        var internal = line.indexOf('练习') < 0 && line.indexOf('控制台') < 0 && line.indexOf('<module>') < 0;
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
    var body = kept.join('\n').trim();
    var hint = HINTS.find(function (h) { return h[0].test(msg); });
    return body + (hint ? '\n\n提示：' + hint[1] : '');
  }

  /* ---------- Pyodide 加载 ---------- */
  function loadScript(src, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        s.remove();
        reject(new Error('加载超时'));
      }, timeoutMs);
      s.onload = function () { if (done) return; done = true; clearTimeout(timer); resolve(); };
      s.onerror = function () { if (done) return; done = true; clearTimeout(timer); s.remove(); reject(new Error('脚本加载失败')); };
      s.src = src;
      document.head.appendChild(s);
    });
  }
  var pyPromise = null;
  function initPyodide(status) {
    var lastErr = null;
    var chain = Promise.resolve(null);
    PYODIDE_CDNS.forEach(function (base) {
      chain = chain.then(function (py) {
        if (py) return py;
        status('首次运行需下载 Python 运行时（约 10 MB），来源 ' + new URL(base).host + ' …');
        return loadScript(base + 'pyodide.js', CDN_TIMEOUT_MS)
          .then(function () { return window.loadPyodide({ indexURL: base }); })
          .catch(function (e) {
            lastErr = e;
            try { delete window.loadPyodide; } catch (e2) { window.loadPyodide = undefined; }
            return null;
          });
      });
    });
    return chain.then(function (py) {
      if (py) return py;
      throw new Error('Python 运行时下不来：' + (lastErr && lastErr.message ? lastErr.message : '三个 CDN 都连不上。检查网络（或代理）后重试。'));
    });
  }
  function getPyodide(status) {
    if (!pyPromise) {
      pyPromise = window.__mlPaperPyPromise ||
        initPyodide(status).catch(function (e) {
          window.__mlPaperPyPromise = null;
          throw e;
        });
      window.__mlPaperPyPromise = pyPromise;
    }
    return pyPromise;
  }

  var PREAMBLE = [
    'import io as _io',
    'import base64 as _base64',
    'import contextlib as _contextlib',
    '',
    'def _ml_capture_figures():',
    '    try:',
    '        import matplotlib.pyplot as plt',
    '    except ImportError:',
    '        return []',
    '    figs = []',
    '    for num in plt.get_fignums():',
    '        bio = _io.BytesIO()',
    '        plt.figure(num).savefig(bio, format="png", dpi=110,',
    '                                bbox_inches="tight")',
    '        figs.append(_base64.b64encode(bio.getvalue()).decode())',
    '    plt.close("all")',
    '    return figs',
    '',
    'def _ml_run(code, extra=None):',
    '    g = {"__name__": "__main__"}',
    '    if extra:',
    '        g.update(extra)',
    '    buf = _io.StringIO()',
    '    err = None',
    '    try:',
    '        with _contextlib.redirect_stdout(buf):',
    '            exec(compile(code, "<练习>", "exec"), g)',
    '    except Exception as exc:',
    '        import traceback as _tb',
    '        err = _tb.format_exc()',
    '    figs = _ml_capture_figures()',
    '    return buf.getvalue(), figs, err or ""',
    '',
    '_ml_console_g = {"__name__": "__main__"}',
    '',
    'def _ml_console_run(code, extra=None):',
    '    if extra:',
    '        _ml_console_g.update(extra)',
    '    buf = _io.StringIO()',
    '    err = None',
    '    try:',
    '        with _contextlib.redirect_stdout(buf):',
    '            exec(compile(code, "<控制台>", "exec"), _ml_console_g)',
    '    except Exception as exc:',
    '        import traceback as _tb',
    '        err = _tb.format_exc()',
    '    figs = _ml_capture_figures()',
    '    return buf.getvalue(), figs, err or ""',
    ''
  ].join('\n');

  function ensurePreamble(py) {
    if (py.__mlPreambleDone) return Promise.resolve();
    return py.runPythonAsync(PREAMBLE).then(function () { py.__mlPreambleDone = true; });
  }

  /* ---------- UI ---------- */
  var fab, panel, head, titleEl, kindEl, editor, out, statusEl, runBtn;
  var btnBack, btnHint, btnReset, btnClear, btnResetNs, btnClose;
  var store = loadJSON(STORE_KEY, { drafts: {}, pos: null });
  if (!store.drafts) store.drafts = {};
  var st = { slot: SCRATCH, slotTitle: '', originals: {}, exercise: null, running: false };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function mkAction(label, title) {
    var b = el('button', '', label);
    b.type = 'button';
    if (title) b.title = title;
    return b;
  }
  function appendText(s, cls) {
    if (!s) return;
    var d = el('div', cls || '');
    d.textContent = s;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }
  function clearOut() { out.innerHTML = ''; }
  function stash() {
    if (!editor) return;
    store.drafts[st.slot] = editor.value;
    saveJSON(STORE_KEY, store);
  }

  function buildUI() {
    fab = el('button', 'pc-fab', 'Py');
    fab.type = 'button';
    fab.title = '浮窗控制台（Alt+P）';
    fab.addEventListener('click', function () { toggle(); });

    panel = el('div', 'pc-panel');
    panel.hidden = true;

    head = el('div', 'pc-head');
    titleEl = el('span', 'pc-title', '随手算');
    kindEl = el('span', 'pc-slotkind', '持久命名空间');
    var actions = el('div', 'pc-actions');
    btnBack = mkAction('← 随手算'); btnBack.hidden = true;
    btnHint = mkAction('提示'); btnHint.hidden = true;
    btnReset = mkAction('重置代码'); btnReset.title = '恢复初始代码';
    btnClear = mkAction('清空输出');
    btnResetNs = mkAction('清空变量'); btnResetNs.title = '清空随手算的变量';
    btnClose = mkAction('×'); btnClose.title = '关闭';
    actions.appendChild(btnBack); actions.appendChild(btnHint); actions.appendChild(btnReset);
    actions.appendChild(btnClear); actions.appendChild(btnResetNs); actions.appendChild(btnClose);
    head.appendChild(titleEl); head.appendChild(kindEl); head.appendChild(actions);

    editor = el('textarea', 'pc-editor');
    editor.spellcheck = false;
    editor.value = store.drafts[SCRATCH] != null ? store.drafts[SCRATCH] : SCRATCH_DEFAULT;

    out = el('div', 'pc-out');

    var foot = el('div', 'pc-foot');
    runBtn = el('button', 'pc-run', '▶ 运行 (Ctrl+Enter)');
    runBtn.type = 'button';
    statusEl = el('span', 'pc-status', '');
    foot.appendChild(runBtn); foot.appendChild(statusEl);

    panel.appendChild(head); panel.appendChild(editor); panel.appendChild(out); panel.appendChild(foot);
    document.body.appendChild(panel);
    document.body.appendChild(fab);

    if (store.pos && typeof store.pos.x === 'number') {
      panel.style.left = store.pos.x + 'px';
      panel.style.top = store.pos.y + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }

    /* 事件 */
    runBtn.addEventListener('click', run);
    btnClose.addEventListener('click', function () { panel.hidden = true; stash(); });
    btnClear.addEventListener('click', clearOut);
    btnBack.addEventListener('click', function () { switchSlot(SCRATCH, SCRATCH_DEFAULT, null, ''); });
    btnHint.addEventListener('click', function () {
      if (st.exercise && st.exercise.hint) appendText('提示：' + st.exercise.hint, 'dim');
    });
    btnReset.addEventListener('click', function () {
      editor.value = st.originals[st.slot] != null ? st.originals[st.slot] : SCRATCH_DEFAULT;
      stash();
      clearOut();
      statusEl.textContent = '';
    });
    btnResetNs.addEventListener('click', function () {
      btnResetNs.disabled = true;
      getPyodide(function (s) { statusEl.textContent = s; })
        .then(function (py) { return ensurePreamble(py).then(function () { return py; }); })
        .then(function (py) {
          return py.runPythonAsync('_ml_console_g.clear(); _ml_console_g.update({"__name__": "__main__"})');
        })
        .then(function () { clearOut(); statusEl.textContent = '变量已清空'; })
        .catch(function () { statusEl.textContent = '重置失败'; })
        .finally(function () { btnResetNs.disabled = false; });
    });
    editor.addEventListener('input', stash);
    editor.addEventListener('keydown', function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); run(); }
      if (ev.key === 'Tab') {
        ev.preventDefault();
        var s = editor.selectionStart, e2 = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + '  ' + editor.value.slice(e2);
        editor.selectionStart = editor.selectionEnd = s + 2;
        stash();
      }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.altKey && (ev.key === 'p' || ev.key === 'P')) { ev.preventDefault(); toggle(); }
    });

    /* 拖拽移动 */
    var drag = null;
    head.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest('button')) return;
      var rect = panel.getBoundingClientRect();
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      drag = { dx: ev.clientX - rect.left, dy: ev.clientY - rect.top };
      head.setPointerCapture(ev.pointerId);
    });
    head.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var x = Math.min(Math.max(ev.clientX - drag.dx, 0), window.innerWidth - 120);
      var y = Math.min(Math.max(ev.clientY - drag.dy, 0), window.innerHeight - 60);
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
    });
    head.addEventListener('pointerup', function () {
      if (!drag) return;
      drag = null;
      store.pos = { x: parseFloat(panel.style.left), y: parseFloat(panel.style.top) };
      saveJSON(STORE_KEY, store);
    });
  }

  function toggle() {
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) editor.focus();
  }

  function switchSlot(slot, code, exercise, title) {
    stash();
    st.slot = slot;
    st.slotTitle = title || '';
    st.exercise = exercise;
    if (st.originals[slot] == null) st.originals[slot] = code;
    editor.value = store.drafts[slot] != null ? store.drafts[slot] : code;
    titleEl.textContent = exercise
      ? '判题练习 · ' + (st.slotTitle || '')
      : (slot === SCRATCH ? '随手算' : '课程代码 · ' + (st.slotTitle || ''));
    kindEl.textContent = exercise ? '全新沙盒判题' : '持久命名空间';
    btnBack.hidden = slot === SCRATCH;
    btnHint.hidden = !(exercise && exercise.hint);
    btnResetNs.hidden = !!exercise;
    clearOut();
    statusEl.textContent = '';
    if (panel.hidden) panel.hidden = false;
    editor.focus();
  }

  /* ---------- 运行 ---------- */
  function run() {
    if (st.running) return;
    st.running = true;
    runBtn.disabled = true;
    clearOut();
    stash();
    var source = editor.value;
    var chunks = [];
    var pyRef = null;
    getPyodide(function (s) { statusEl.textContent = s; })
      .then(function (py) { pyRef = py; return ensurePreamble(py); })
      .then(function () {
        var py = pyRef;
        var p = Promise.resolve();
        if (/\bmatplotlib\b/.test(source)) {
          statusEl.textContent = '加载绘图库…';
          p = p.then(function () { return py.loadPackage('matplotlib'); })
            .then(function () { return py.runPythonAsync("import os; os.environ.setdefault('MPLBACKEND', 'AGG')"); })
            .then(function () {
              return py.runPythonAsync("import matplotlib as _m; _m.rcParams.update({'figure.figsize':(7.2,4.2),'axes.grid':True,'grid.alpha':0.35,'font.size':11,'lines.linewidth':2,'axes.spines.top':False,'axes.spines.right':False})");
            })
            .catch(function () { });
        }
        return p.then(function () {
          statusEl.textContent = '运行中…';
          py.setStdout({ batched: function (s) { chunks.push(s); appendText(s); } });
          py.setStderr({ batched: function (s) { appendText(s, 'err'); } });
          py.globals.set('_ml_src', source);
          var call = st.exercise ? '_ml_run(_ml_src)' : '_ml_console_run(_ml_src)';
          return py.runPythonAsync(call);
        });
      })
      .then(function (result) {
        var arr = result && typeof result.toJs === 'function' ? result.toJs({ depth: 3 }) : result;
        if (result && result.destroy) result.destroy();
        var textOut = arr && arr[0] ? arr[0] : '';
        var imgs = arr && arr[1] ? arr[1] : [];
        var errText = arr && arr[2] ? arr[2] : '';
        if (textOut) appendText(textOut);
        (imgs || []).forEach(function (b64) {
          var img = document.createElement('img');
          img.src = 'data:image/png;base64,' + b64;
          img.alt = '输出的图像';
          out.appendChild(img);
        });
        if (errText) {
          /* 出错也要保住出错前已打印的内容，学生才能对照排查 */
          appendText(prettifyError(errText), 'err');
          statusEl.textContent = '出错 ✗';
          return;
        }
        if (st.exercise) {
          var got = normalizeOut(textOut);
          var want = normalizeOut(st.exercise.check.join('\n'));
          if (got === want) {
            appendText('✓ 输出与期望一致，通过！进度已保存。', 'pass');
            var passes = loadJSON(EX_KEY, {});
            passes[st.exercise.key] = true;
            saveJSON(EX_KEY, passes);
            window.dispatchEvent(new CustomEvent('ml-paper:exercise-passed', { detail: { key: st.exercise.key } }));
          } else {
            appendText('✗ 还不对。期望输出是：', 'fail');
            appendText(want, 'want');
          }
        } else if (!imgs.length && !textOut && !chunks.length) {
          appendText('(运行完毕，无输出)', 'dim');
        }
        statusEl.textContent = '完成 ✔';
      })
      .catch(function (e) {
        appendText(prettifyError(String((e && e.message) || e)), 'err');
        statusEl.textContent = '出错 ✗';
      })
      .finally(function () {
        st.running = false;
        runBtn.disabled = false;
      });
  }

  /* ---------- 对外 API ---------- */
  function init() {
    if (panel) return;
    buildUI();
  }
  function openPython(code, title) {
    init();
    switchSlot('py:' + hashStr((title || '') + '|' + code), code, null, title);
  }
  function openExercise(code, title, payloadEnc) {
    init();
    var payloadRaw = '';
    var payload = { check: [], hint: '', title: '' };
    try {
      payloadRaw = decodeURIComponent(payloadEnc);
      var j = JSON.parse(payloadRaw);
      if (j && typeof j === 'object') payload = { check: j.check || [], hint: j.hint || '', title: j.title || '' };
    } catch (e) { }
    var key = hashStr(payloadRaw);
    switchSlot('ex:' + key, code, { check: payload.check, hint: payload.hint, key: key }, payload.title || title);
  }

  return { init: init, openPython: openPython, openExercise: openExercise };
})();

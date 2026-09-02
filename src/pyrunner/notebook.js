/* =========================================================================
 * 数学笔记本（右下角「笔记」圆钮）
 * -------------------------------------------------------------------------
 * 定位：和 Jupyter 同构的轻量笔记本，但为「学数学」做了几处专门优化：
 *   1. 笔记单元支持 Markdown + $\LaTeX$（KaTeX 渲染），可以边推公式边写代码；
 *   2. 代码单元的 print 输出里写 $$...$$ / $...$ 会被渲染成公式，
 *      内置 show(x) 直接把对象转成 $\LaTeX$（sympy 在就走 sympy.latex）；
 *   3. 与右下角的 Py 浮窗**共用同一个 Python 命名空间**：
 *      笔记本里 x = 3，浮窗里 print(x) 就是 3，反过来也一样；
 *      单元可以「送到浮窗」继续调，浮窗里写顺手的代码可以「取回」成新单元。
 *
 * 存储：localStorage 的 ml-notebook:<ns>，按命名空间分空间（未登录本机 /
 * 登录后的账号空间），与学习进度同一套口径。输出不落盘（图片 base64 太大），
 * 打开后重跑一次就有了。
 *
 * 依赖：Pyodide 与执行入口由 enhancer 通过 api 注入（见 enhancer 的 toolApi）。
 * ========================================================================= */

import { nsKey, progressNS } from '../learning/progress';
import { saveSnippet } from './repo';

const NB_KEY = 'ml-notebook';
const MAX_BOOKS = 20;
const MAX_CELLS = 300;

/* 笔记本专用的小工具函数：跑在每个单元之前，注入共享命名空间 */
const HELPER_PY = `
def _ml_nb_latex(x):
    try:
        import sympy as _sp
        return _sp.latex(x)
    except Exception:
        try:
            return x._repr_latex_()
        except Exception:
            return str(x)

def show(x):
    "把任意对象（最好是 sympy 表达式）打印成渲染好的公式"
    print("$$" + _ml_nb_latex(x) + "$$")

def show_eq(lhs, rhs):
    print("$$" + _ml_nb_latex(lhs) + " = " + _ml_nb_latex(rhs) + "$$")
`;

const TEMPLATES = [
  {
    label: '插入模板…',
    code: null,
  },
  {
    label: '符号求导（需 sympy）',
    code: [
      'import sympy as sp',
      'x = sp.symbols("x")',
      'f = sp.sin(x) * sp.exp(x)',
      'show(f)                      # 原函数',
      'show(sp.diff(f, x))          # 一阶导',
      'print(sp.simplify(sp.diff(f, x)))',
    ].join('\n'),
  },
  {
    label: '符号积分（需 sympy）',
    code: [
      'import sympy as sp',
      'x = sp.symbols("x")',
      'show(sp.integrate(sp.exp(-x**2), (x, -sp.oo, sp.oo)))',
      'show(sp.integrate(sp.log(x), x))',
    ].join('\n'),
  },
  {
    label: '极限与级数（需 sympy）',
    code: [
      'import sympy as sp',
      'n = sp.symbols("n", positive=True)',
      'show(sp.limit((1 + 1/n)**n, n, sp.oo))   # e',
      'show(sp.Sum(1/n**2, (n, 1, sp.oo)).doit())',
    ].join('\n'),
  },
  {
    label: '泰勒展开（需 sympy）',
    code: [
      'import sympy as sp',
      'x = sp.symbols("x")',
      'show(sp.series(sp.cos(x), x, 0, 8))',
      'print(sp.series(sp.exp(x), x, 0, 5))',
    ].join('\n'),
  },
  {
    label: '函数图像（matplotlib）',
    code: [
      'import numpy as np',
      'import matplotlib.pyplot as plt',
      'x = np.linspace(-6, 6, 400)',
      'plt.plot(x, np.sin(x) / x, label="sin(x)/x")',
      'plt.axhline(0, color="#888", lw=0.8)',
      'plt.legend()',
      'plt.show()',
    ].join('\n'),
  },
  {
    label: '黎曼和逼近面积',
    code: [
      'import numpy as np',
      'f = lambda t: t ** 2',
      'a, b, n = 0, 1, 50',
      'xs = np.linspace(a, b, n + 1)',
      'approx = sum(f(xs[i]) * (xs[i + 1] - xs[i]) for i in range(n))',
      'print("黎曼和 =", approx, " 精确值 =", 1 / 3)',
    ].join('\n'),
  },
  {
    label: '矩阵与线性方程组（numpy）',
    code: [
      'import numpy as np',
      'A = np.array([[2.0, 1.0], [1.0, 3.0]])',
      'b = np.array([3.0, 5.0])',
      'x = np.linalg.solve(A, b)',
      'print("解 =", x)',
      'print("特征值 =", np.linalg.eigvals(A))',
    ].join('\n'),
  },
  {
    label: '概率模拟（random）',
    code: [
      'import random',
      'N = 20000',
      'hit = sum(1 for _ in range(N) if random.random() ** 2 + random.random() ** 2 <= 1)',
      'print("蒙特卡洛 π ≈", 4 * hit / N)',
    ].join('\n'),
  },
];

/* ---------- 存储 ---------- */

let data = null;
let api = null;
let els = null;
let saveTimer = null;
let sympyReady = false;

function uid(p) {
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function load() {
  if (data) return data;
  if (typeof window === 'undefined') return { v: 1, books: [], activeId: null };
  try {
    const v = JSON.parse(window.localStorage.getItem(nsKey(NB_KEY)) || 'null');
    if (v && Array.isArray(v.books)) {
      data = v;
      return data;
    }
  } catch {
    /* 数据坏了：重建一份，不阻断 */
  }
  data = { v: 1, books: [starterBook()], activeId: null };
  data.activeId = data.books[0].id;
  persist();
  return data;
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(nsKey(NB_KEY), JSON.stringify(data));
  } catch {
    /* 配额满：笔记本太大时放弃写入，界面仍可用 */
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
}

function starterBook() {
  return {
    id: uid('b'),
    title: '我的笔记本',
    at: Date.now(),
    cells: [
      {
        id: uid('c'),
        kind: 'md',
        src: [
          '# 数学笔记本',
          '',
          '左边写推导，右边跑代码。公式直接写 $\\LaTeX$：',
          '',
          '$$ e^{i\\pi} + 1 = 0 $$',
          '',
          '- 代码单元和右下角的 **Py 浮窗**共用同一套变量；',
          '- 输出里写 `$x^2$` 会渲染成公式，`show(x)` 可以把对象转成公式；',
          '- `Ctrl+Enter` 运行当前单元。',
        ].join('\n'),
      },
      { id: uid('c'), kind: 'code', src: 'import math\nprint("π =", math.pi)\nprint("2**10 =", 2 ** 10)' },
      {
        id: uid('c'),
        kind: 'code',
        src: '# show() 会把结果渲染成公式（装了 sympy 就能打印符号表达式）\nshow("\\\\frac{a}{b} + \\\\sqrt{c}")\nprint("也可以混着写：勾股定理 $a^2+b^2=c^2$")',
      },
    ],
  };
}

function activeBook() {
  const d = load();
  let b = d.books.find((x) => x.id === d.activeId);
  if (!b) {
    b = d.books[0] || starterBook();
    if (!d.books.length) d.books.push(b);
    d.activeId = b.id;
  }
  return b;
}

/* ---------- KaTeX（按需加载，只有真的要渲染公式时才拉） ---------- */

let katexPromise = null;
function getKatex() {
  if (!katexPromise) {
    katexPromise = import('katex')
      .then((m) => m.default || m)
      .catch((e) => {
        katexPromise = null;
        throw e;
      });
  }
  return katexPromise;
}

/* ---------- 渲染小工具 ---------- */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function appendMath(box, tex, display, katex) {
  if (!katex) {
    box.appendChild(el('code', 'ml-nb__rawtex', (display ? '$$' : '$') + tex + (display ? '$$' : '$')));
    return;
  }
  try {
    const span = document.createElement('span');
    if (display) span.className = 'ml-nb__math';
    span.innerHTML = katex.renderToString(tex, { displayMode: display, throwOnError: false });
    box.appendChild(span);
  } catch {
    box.appendChild(el('code', 'ml-nb__rawtex', tex));
  }
}

/** 把一段纯文本塞进 box：连续的 $...$ 渲染成行内公式，其余当普通文本。 */
function appendTextWithMath(box, str, katex) {
  const segs = String(str).split(/(\$[^$\n]+?\$)/g);
  let buf = '';
  const flush = () => {
    if (buf) {
      box.appendChild(document.createTextNode(buf));
      buf = '';
    }
  };
  for (const seg of segs) {
    if (seg.length > 2 && seg.startsWith('$') && seg.endsWith('$')) {
      flush();
      appendMath(box, seg.slice(1, -1), false, katex);
    } else {
      buf += seg;
    }
  }
  flush();
}

/* 公式先抽成 token（私有区字符 U+E000 包裹的下标），排版完再换回 KaTeX 的 HTML——
   否则转义、切行、列表包装都会把 LaTeX 里的 < > & 弄坏。 */
const TOK = '\uE000';
const TOK_RE = new RegExp(TOK + '(\\d+)' + TOK, 'g');

/** 极简 Markdown：标题 / 列表 / 粗斜体 / 行内码 / 公式，够写数学笔记了。 */
function renderMd(src, katex) {
  const math = [];
  let s = String(src || '');
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, body) => {
    math.push({ d: true, body });
    return TOK + (math.length - 1) + TOK;
  });
  s = s.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (m, pre, body) => {
    math.push({ d: false, body });
    return pre + TOK + (math.length - 1) + TOK;
  });
  s = esc(s);

  const inline = (t) =>
    t
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  const out = [];
  let para = [];
  let ul = null;
  let ol = null;
  const flushPara = () => {
    if (para.length) {
      out.push('<p>' + inline(para.join('<br>')) + '</p>');
      para = [];
    }
  };
  const closeLists = () => {
    if (ul) {
      out.push('<ul>' + ul.join('') + '</ul>');
      ul = null;
    }
    if (ol) {
      out.push('<ol>' + ol.join('') + '</ol>');
      ol = null;
    }
  };
  for (const raw of s.split('\n')) {
    const line = raw.trim();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeLists();
      flushPara();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) {
      flushPara();
      if (ol) {
        out.push('<ol>' + ol.join('') + '</ol>');
        ol = null;
      }
      (ul = ul || []).push('<li>' + inline(li[1]) + '</li>');
      continue;
    }
    const oli = line.match(/^\d+[.)]\s+(.*)$/);
    if (oli) {
      flushPara();
      if (ul) {
        out.push('<ul>' + ul.join('') + '</ul>');
        ul = null;
      }
      (ol = ol || []).push('<li>' + inline(oli[1]) + '</li>');
      continue;
    }
    if (!line) {
      closeLists();
      flushPara();
      continue;
    }
    closeLists();
    para.push(line);
  }
  closeLists();
  flushPara();

  return out
    .join('')
    .replace(TOK_RE, (m, i) => {
      const it = math[Number(i)];
      if (!it) return '';
      if (!katex) return `<code>${esc((it.d ? '$$' : '$') + it.body + (it.d ? '$$' : '$'))}</code>`;
      try {
        return katex.renderToString(it.body, { displayMode: it.d, throwOnError: false });
      } catch {
        return `<code>${esc(it.body)}</code>`;
      }
    });
}

function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight + 4, 520) + 'px';
}

/* ---------- 单元 ---------- */

function setStatus(s) {
  if (els) els.foot.textContent = s || defaultStatus();
}

function defaultStatus() {
  const ns = progressNS();
  const b = activeBook();
  return (
    `${b.cells.length} 个单元 · 与右下角 Py 浮窗共用同一套变量 · 存在` +
    (ns === ':guest' ? '本机（登录后存入账号空间）' : '账号 ' + ns.slice(1))
  );
}

async function runCell(cell, cellEl) {
  const out = cellEl.querySelector('.ml-nb__out');
  const stt = cellEl.querySelector('.ml-nb__cellstatus');
  out.classList.add('is-visible');
  out.innerHTML = '';
  stt.textContent = '运行中…';
  setStatus('运行中…（第一次要下载 Python 运行时，请稍等）');

  let katex = null;
  try {
    katex = await getKatex();
  } catch {
    /* 公式渲染不可用：退化为纯文本输出 */
  }

  const pushText = (s) => {
    const pre = el('pre', 'ml-nb__text');
    appendTextWithMath(pre, s, katex);
    out.appendChild(pre);
    out.scrollTop = out.scrollHeight;
  };

  try {
    const res = await api.exec(cell.src, {
      helpers: HELPER_PY,
      onText: (s, isErr) => {
        /* stderr 不逐行刷：最后统一用美化后的报错一次显示 */
        if (!isErr && s) pushText(s);
      },
      status: (s) => {
        stt.textContent = s;
      },
    });
    if (res.err) {
      out.innerHTML = '';
      out.appendChild(el('pre', 'ml-nb__err', api.prettify ? api.prettify(res.err) : res.err));
      stt.textContent = '出错 ✗';
    } else {
      (res.imgs || []).forEach((b64) => {
        const box = el('div', 'py-runner__img ml-nb__img');
        const img = document.createElement('img');
        img.src = 'data:image/png;base64,' + b64;
        img.alt = '单元输出的图像';
        box.appendChild(img);
        out.appendChild(box);
      });
      if (!out.childNodes.length) {
        out.appendChild(el('div', 'ml-nb__dim', '(运行完毕，无输出)'));
      }
      stt.textContent = '完成 ✔';
    }
  } catch (e) {
    out.appendChild(el('pre', 'ml-nb__err', String((e && e.message) || e)));
    stt.textContent = '出错 ✗';
  }
  setStatus('');
}

function moveCell(cell, dir) {
  const b = activeBook();
  const i = b.cells.findIndex((c) => c.id === cell.id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= b.cells.length) return;
  const tmp = b.cells[i];
  b.cells[i] = b.cells[j];
  b.cells[j] = tmp;
  persist();
  renderCells();
}

function removeCell(cell) {
  const b = activeBook();
  if (b.cells.length <= 1) {
    b.cells = [];
  } else {
    b.cells = b.cells.filter((c) => c.id !== cell.id);
  }
  persist();
  renderCells();
}

function addCell(kind, src, afterCell) {
  const b = activeBook();
  if (b.cells.length >= MAX_CELLS) {
    setStatus(`单个笔记本最多 ${MAX_CELLS} 个单元`);
    return null;
  }
  const cell = { id: uid('c'), kind, src: src || '' };
  const i = afterCell ? b.cells.findIndex((c) => c.id === afterCell.id) : -1;
  if (i >= 0) b.cells.splice(i + 1, 0, cell);
  else b.cells.push(cell);
  persist();
  renderCells();
  return cell;
}

function buildCellEl(cell) {
  const wrap = el('div', 'ml-nb__cell');
  wrap.dataset.id = cell.id;

  const bar = el('div', 'ml-nb__cellbar');
  const kind = el('span', 'ml-nb__kind', cell.kind === 'code' ? '代码' : '笔记');
  kind.classList.add(cell.kind === 'code' ? 'ml-nb__kind--code' : 'ml-nb__kind--md');
  bar.appendChild(kind);

  const mk = (label, title, fn) => {
    const b = el('button', 'ml-nb__mini', label);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', fn);
    return b;
  };

  bar.appendChild(mk('↑', '上移', () => moveCell(cell, -1)));
  bar.appendChild(mk('↓', '下移', () => moveCell(cell, 1)));
  bar.appendChild(mk('✕', '删除这个单元', () => removeCell(cell)));

  if (cell.kind === 'code') {
    bar.appendChild(mk('▶ 运行', '运行这个单元（Ctrl+Enter）', () => runCell(cell, wrap)));
    bar.appendChild(mk('⇄ 送到浮窗', '把这段代码装进右下角的 Py 浮窗继续调', () => {
      api.setSource(cell.src, '笔记本片段');
      setStatus('已送到浮窗');
    }));
    bar.appendChild(mk('存', '把这段代码存进代码仓库', () => {
      const first = (cell.src.split('\n')[0] || '').replace(/^#\s*/, '').slice(0, 40);
      const r = saveSnippet({ name: first || '笔记本片段', code: cell.src, from: '笔记本' });
      setStatus(r.ok ? '已存进代码仓库' : '存不进去：' + (r.reason === 'full' ? '仓库已满' : '存储空间不足'));
    }));
    const stt = el('span', 'ml-nb__cellstatus', '');
    bar.appendChild(stt);

    const ta = document.createElement('textarea');
    ta.className = 'ml-nb__code';
    ta.spellcheck = false;
    ta.value = cell.src;
    ta.placeholder = '写 Python，Ctrl+Enter 运行；变量与 Py 浮窗互通';
    requestAnimationFrame(() => autoGrow(ta));
    ta.addEventListener('input', () => {
      cell.src = ta.value;
      autoGrow(ta);
      scheduleSave();
    });
    ta.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault();
        runCell(cell, wrap);
      }
      if (ev.key === 'Tab') {
        ev.preventDefault();
        const s = ta.selectionStart;
        const e2 = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(e2);
        ta.selectionStart = ta.selectionEnd = s + 2;
        cell.src = ta.value;
        scheduleSave();
      }
    });

    const out = el('div', 'ml-nb__out');
    wrap.append(bar, ta, out);
    return wrap;
  }

  /* ---- 笔记单元：默认渲染态，点一下进编辑态，失焦回渲染态 ---- */
  bar.appendChild(mk('编辑', '编辑这段笔记', () => setEditing(wrap, true)));
  bar.appendChild(mk('转代码', '复制一份成代码单元', () => {
    addCell('code', cell.src, cell);
  }));

  const view = el('div', 'ml-nb__mdview');
  view.innerHTML = '<p class="ml-nb__dim">（空笔记，点「编辑」写点什么）</p>';
  const ta = document.createElement('textarea');
  ta.className = 'ml-nb__md';
  ta.spellcheck = false;
  ta.value = cell.src;
  ta.placeholder = 'Markdown + $LaTeX$：# 标题、- 列表、**粗体**、$$公式$$';
  ta.style.display = 'none';
  requestAnimationFrame(() => autoGrow(ta));

  ta.addEventListener('input', () => {
    cell.src = ta.value;
    autoGrow(ta);
    scheduleSave();
  });
  ta.addEventListener('blur', () => setEditing(wrap, false));
  ta.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ta.blur();
    }
  });
  view.addEventListener('click', () => setEditing(wrap, true));

  wrap.append(bar, view, ta);
  wrap.__view = view;
  wrap.__ta = ta;
  paintMd(wrap, cell);
  return wrap;
}

function setEditing(wrap, on) {
  const ta = wrap.__ta;
  const view = wrap.__view;
  if (!ta || !view) return;
  ta.style.display = on ? '' : 'none';
  view.style.display = on ? 'none' : '';
  if (on) {
    autoGrow(ta);
    ta.focus();
  }
}

async function paintMd(wrap, cell) {
  const view = wrap.__view;
  if (!view) return;
  let katex = null;
  try {
    katex = await getKatex();
  } catch {
    /* 没有 KaTeX 也能看纯文本 */
  }
  if (!cell.src.trim()) {
    view.innerHTML = '<p class="ml-nb__dim">（空笔记，点「编辑」写点什么）</p>';
    return;
  }
  view.innerHTML = renderMd(cell.src, katex);
}

function renderCells() {
  if (!els) return;
  const b = activeBook();
  els.body.innerHTML = '';
  if (!b.cells.length) {
    els.body.appendChild(el('p', 'ml-nb__empty', '这个笔记本是空的。点上面的「＋ 代码」或「＋ 笔记」开始。'));
  }
  b.cells.forEach((c) => els.body.appendChild(buildCellEl(c)));
  setStatus('');
}

function renderBooks() {
  if (!els) return;
  const d = load();
  const sel = els.books;
  sel.innerHTML = '';
  d.books.forEach((b) => {
    const o = document.createElement('option');
    o.value = b.id;
    o.textContent = `${b.title}（${b.cells.length}）`;
    sel.appendChild(o);
  });
  sel.value = d.activeId;
  els.title.value = activeBook().title;
}

/* ---------- 面板 ---------- */

function build() {
  const panel = el('div', 'ml-notebook');
  panel.id = 'ml-notebook';

  /* 头部：标题 + 笔记本切换 + 整页 + 关闭 */
  const head = el('div', 'ml-notebook__head');
  const brand = el('span', 'ml-notebook__brand', '数学笔记本');
  const title = el('input', 'ml-notebook__title');
  title.type = 'text';
  title.placeholder = '笔记本名字';
  const books = document.createElement('select');
  books.className = 'ml-notebook__books';
  const btnNew = el('button', 'ml-notebook__hbtn', '＋ 新建');
  btnNew.type = 'button';
  btnNew.title = '新建一个笔记本';
  const btnDel = el('button', 'ml-notebook__hbtn', '删除');
  btnDel.type = 'button';
  btnDel.title = '删除当前笔记本';
  const btnMode = el('button', 'ml-notebook__hbtn', '整页');
  btnMode.type = 'button';
  btnMode.title = '在浮窗与整页之间切换';
  const btnClose = el('button', 'ml-notebook__close', '×');
  btnClose.type = 'button';
  btnClose.title = '关闭（Esc）';
  head.append(brand, title, books, btnNew, btnDel, btnMode, btnClose);

  /* 工具条 */
  const bar = el('div', 'ml-notebook__bar');
  const mkBtn = (label, cls, title, fn) => {
    const b = el('button', 'py-runner__btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', fn);
    return b;
  };
  const btnCode = mkBtn('＋ 代码', '', '在末尾加一个代码单元', () => addCell('code', ''));
  const btnMd = mkBtn('＋ 笔记', 'py-runner__btn--ghost', '在末尾加一个笔记单元', () => addCell('md', ''));
  const btnRunAll = mkBtn('▶ 全部运行', '', '从上到下依次运行所有代码单元', runAll);
  const btnClearOut = mkBtn('清空输出', 'py-runner__btn--ghost', '清掉所有单元的 outputs', () => {
    renderCells();
    setStatus('输出已清空');
  });
  const btnFromConsole = mkBtn('⇅ 取回浮窗代码', 'py-runner__btn--ghost', '把 Py 浮窗编辑器里的代码拿进来当新单元', () => {
    const src = api.getSource ? api.getSource() : '';
    if (!src.trim()) {
      setStatus('浮窗编辑器是空的');
      return;
    }
    addCell('code', src);
    setStatus('已把浮窗代码取回成一个新单元');
  });
  const btnSympy = mkBtn('加载 sympy', 'py-runner__btn--ghost', '装上符号计算库（首次约 10 MB），之后可以 show(sp.diff(...))', async () => {
    if (sympyReady) {
      setStatus('sympy 已经装好了');
      return;
    }
    btnSympy.disabled = true;
    try {
      await api.loadPackage('sympy', (s) => setStatus(s));
      sympyReady = true;
      btnSympy.textContent = 'sympy 已就绪';
      setStatus('sympy 装好了：可以用 import sympy as sp 做符号推导');
    } catch (e) {
      setStatus('sympy 加载失败：' + ((e && e.message) || e));
    } finally {
      btnSympy.disabled = false;
    }
  });
  const tpl = document.createElement('select');
  tpl.className = 'ml-notebook__tpl';
  TEMPLATES.forEach((t, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = t.label;
    tpl.appendChild(o);
  });
  tpl.addEventListener('change', () => {
    const t = TEMPLATES[Number(tpl.value)];
    tpl.value = '0';
    if (!t || !t.code) return;
    addCell('code', t.code);
    setStatus('已插入模板：' + t.label);
  });
  bar.append(btnCode, btnMd, btnRunAll, btnClearOut, btnFromConsole, btnSympy, tpl);

  const body = el('div', 'ml-notebook__body');
  const foot = el('div', 'ml-notebook__foot', '');
  panel.append(head, bar, body, foot);
  document.body.appendChild(panel);

  /* 拖动：头部按下（避开按钮/输入框） */
  let drag = null;
  head.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('button, input, select')) return;
    if (panel.classList.contains('is-fullpage')) return;
    const r = panel.getBoundingClientRect();
    panel.style.transform = 'none';
    panel.style.left = r.left + 'px';
    panel.style.top = r.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    drag = { dx: ev.clientX - r.left, dy: ev.clientY - r.top };
    head.setPointerCapture(ev.pointerId);
  });
  head.addEventListener('pointermove', (ev) => {
    if (!drag || ev.buttons === 0) {
      drag = null;
      return;
    }
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    panel.style.left = Math.min(Math.max(ev.clientX - drag.dx, 8), window.innerWidth - w - 8) + 'px';
    panel.style.top = Math.min(Math.max(ev.clientY - drag.dy, 8), window.innerHeight - h - 8) + 'px';
  });
  const endDrag = () => {
    drag = null;
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
  head.addEventListener('lostpointercapture', endDrag);

  btnClose.addEventListener('click', () => closeNotebook());
  btnMode.addEventListener('click', () => {
    const full = panel.classList.toggle('is-fullpage');
    btnMode.textContent = full ? '浮窗' : '整页';
    if (!full) {
      panel.style.left = '';
      panel.style.top = '';
    }
  });
  title.addEventListener('input', () => {
    activeBook().title = title.value.slice(0, 60) || '未命名';
    scheduleSave();
  });
  books.addEventListener('change', () => {
    const d = load();
    d.activeId = books.value;
    persist();
    renderBooks();
    renderCells();
  });
  btnNew.addEventListener('click', () => {
    const d = load();
    if (d.books.length >= MAX_BOOKS) {
      setStatus(`最多 ${MAX_BOOKS} 个笔记本`);
      return;
    }
    const b = { id: uid('b'), title: '新笔记本 ' + (d.books.length + 1), at: Date.now(), cells: [] };
    d.books.push(b);
    d.activeId = b.id;
    persist();
    renderBooks();
    renderCells();
  });
  btnDel.addEventListener('click', () => {
    const d = load();
    if (d.books.length <= 1) {
      setStatus('至少留一个笔记本');
      return;
    }
    const b = activeBook();
    if (!window.confirm(`删除笔记本《${b.title}》？`)) return;
    d.books = d.books.filter((x) => x.id !== b.id);
    d.activeId = d.books[0].id;
    persist();
    renderBooks();
    renderCells();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && panel.classList.contains('is-open')) closeNotebook();
  });

  els = { panel, body, foot, books, title, btnSympy };
  return els;
}

async function runAll() {
  const b = activeBook();
  const cells = b.cells.filter((c) => c.kind === 'code');
  if (!cells.length) {
    setStatus('没有代码单元');
    return;
  }
  for (const cell of cells) {
    const cellEl = els.body.querySelector(`.ml-nb__cell[data-id="${cell.id}"]`);
    if (!cellEl) continue;
    cellEl.scrollIntoView({ block: 'nearest' });
    /* 串行运行：单元之间常有先后依赖（同一命名空间），并行会互相打断 */
    // eslint-disable-next-line no-await-in-loop
    await runCell(cell, cellEl);
  }
  setStatus(`全部运行完毕（${cells.length} 个代码单元）`);
}

/* ---------- 对外 ---------- */

export async function openNotebook(toolApi) {
  api = toolApi;
  if (!els || !document.contains(els.panel)) build();
  load();
  renderBooks();
  renderCells();
  els.panel.classList.add('is-open');
  /* 先摸一下 KaTeX：等用户写完笔记再加载就慢了 */
  try {
    await getKatex();
    renderCells();
  } catch {
    /* 加载失败就是没公式，不打断使用 */
  }
}

export function closeNotebook() {
  if (els) els.panel.classList.remove('is-open');
  /* data 为 null 说明从没打开过（load() 没跑），此时 persist() 会写进去一个 "null"，
     把用户已有的笔记本抹掉——只在这一轮真的读过数据时才落盘。 */
  if (data) persist();
}

export function isNotebookOpen() {
  return !!(els && els.panel.classList.contains('is-open'));
}

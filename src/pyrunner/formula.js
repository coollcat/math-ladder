/* =========================================================================
 * 公式输入工具（参照微软数学那一类「符号面板 + 实时预览」的做法）
 * -------------------------------------------------------------------------
 * 一个浮窗面板：左边按类别点符号、中间是 LaTeX 源码、上面是实时预览，
 * 写好后「插入」到它记住的最后一个编辑框里（浮窗编辑器 / 笔记本单元 /
 * 仓库的命名框，谁最后被点过就插到谁的光标处）。
 *
 * 插入形态：默认包成 `$...$`（行内）或 `$$...$$`（独占一行）——因为本站
 * 的渲染约定就是这两个定界符（见 mathout.js）。写 Markdown 笔记时如果只想
 * 插一段裸 LaTeX（比如已经在一对 $$ 里面），把「包成公式」勾掉即可。
 *
 * 符号按钮上的图形是 KaTeX 现渲的：拉到 katex 之后逐个升级，拉不到就退化成
 * 显示 LaTeX 源码，不影响使用。
 * ========================================================================= */

import { getKatex } from './mathout';
import { watchPanel, bringToFront } from './zorder';

const GROUPS = [
  {
    name: '常用',
    items: [
      ['\\frac{a}{b}', '分数'],
      ['\\sqrt{x}', '根号'],
      ['\\sqrt[n]{x}', 'n 次根'],
      ['x^{2}', '上标'],
      ['x_{i}', '下标'],
      ['\\left|x\\right|', '绝对值'],
      ['\\vec{v}', '向量'],
      ['\\overline{AB}', '上划线'],
      ['\\hat{y}', '帽号'],
      ['\\sum_{i=1}^{n}', '求和'],
      ['\\prod_{i=1}^{n}', '连乘'],
      ['\\int_{a}^{b}', '积分'],
      ['\\iint_{D}', '二重积分'],
      ['\\oint_{C}', '曲线积分'],
      ['\\lim_{x \\to 0}', '极限'],
      ['\\frac{dy}{dx}', '导数'],
      ['\\frac{\\partial f}{\\partial x}', '偏导'],
      ['\\binom{n}{k}', '组合数'],
    ],
  },
  {
    name: '希腊',
    items: [
      '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\varepsilon', '\\zeta',
      '\\eta', '\\theta', '\\vartheta', '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu',
      '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau', '\\upsilon', '\\phi', '\\varphi',
      '\\chi', '\\psi', '\\omega', '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi',
      '\\Pi', '\\Sigma', '\\Phi', '\\Psi', '\\Omega',
    ],
  },
  {
    name: '运算',
    items: [
      '\\times', '\\div', '\\cdot', '\\pm', '\\mp', '\\ast', '\\star', '\\circ',
      '\\bullet', '\\oplus', '\\otimes', '\\cap', '\\cup', '\\setminus', '\\mid',
      '\\neg', '\\partial', '\\nabla', '\\infty', '\\dots', '\\cdots', '\\vdots',
      '\\lfloor x \\rfloor', '\\lceil x \\rceil', '\\overline{x}',
    ],
  },
  {
    name: '关系',
    items: [
      '=', '\\neq', '\\approx', '\\equiv', '\\sim', '\\simeq', '\\cong', '<', '>',
      '\\le', '\\ge', '\\ll', '\\gg', '\\subset', '\\subseteq', '\\in', '\\notin',
      '\\forall', '\\exists', '\\emptyset', '\\propto', '\\to', '\\rightarrow',
      '\\Rightarrow', '\\leftrightarrow', '\\mapsto', '\\perp', '\\parallel',
      '\\angle', '\\triangle', '\\therefore', '\\because',
    ],
  },
  {
    name: '结构',
    items: [
      ['\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', '矩阵'],
      ['\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', '方括号矩阵'],
      ['\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', '行列式'],
      ['\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}', '方程组'],
      ['f(x) = \\begin{cases} x, & x \\ge 0 \\\\ -x, & x < 0 \\end{cases}', '分段函数'],
      ['\\begin{aligned} a &= b \\\\ &= c \\end{aligned}', '多行对齐'],
      ['\\left\\{ x \\mid x > 0 \\right\\}', '集合'],
      ['\\overbrace{a + b}^{s}', '上括号'],
      ['\\underbrace{a + b}_{s}', '下括号'],
      ['\\substack{0 \\le i \\le n \\\\ i \\ne j}', '多行下标'],
    ],
  },
  {
    name: '函数',
    items: [
      '\\sin', '\\cos', '\\tan', '\\cot', '\\arcsin', '\\arccos', '\\arctan',
      '\\sinh', '\\cosh', '\\tanh', '\\ln', '\\log', '\\log_{2}', '\\exp',
      '\\lim', '\\max', '\\min', '\\sup', '\\inf', '\\gcd', '\\deg', '\\dim', '\\arg',
    ],
  },
];

let els = null;
let lastTarget = null;
let lastPos = 0;
let curGroup = 0;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/* 记住最后一个被编辑的输入框（面板自己的控件除外） */
function trackFocus() {
  document.addEventListener(
    'focusin',
    (ev) => {
      const t = ev.target;
      if (!isEditable(t)) return;
      if (els && els.panel.contains(t)) return; /* 面板自己的输入框不算目标 */
      lastTarget = t;
      updateTargetHint();
    },
    true,
  );
}

function targetLabel() {
  if (!lastTarget || !lastTarget.isConnected) return '未选择（先点一下要插入的输入框）';
  const c = lastTarget.className || '';
  if (c.includes('ml-console__editor')) return '浮窗编辑器';
  if (c.includes('ml-nb__code')) return '笔记本代码单元';
  if (c.includes('ml-nb__md')) return '笔记本笔记单元';
  if (c.includes('ml-repo__name')) return '仓库命名框';
  return '上次的输入框';
}

/**
 * 目标分三类，决定「插进去的是什么」：
 *   md  —— 笔记本的笔记单元：插**公式**本身（$…$ / $$…$$），渲染区直接显示；
 *   py  —— Python 代码区（浮窗编辑器 / 笔记本代码单元）：插**代码**，
 *          即 print(r"$$…$$")。往代码里塞裸 LaTeX 会直接语法错误；
 *   raw —— 其它输入框（比如仓库命名框）：按 md 的规矩插定界符。
 */
function targetKind() {
  const c = (lastTarget && lastTarget.className) || '';
  if (c.includes('ml-nb__md')) return 'md';
  if (c.includes('ml-nb__code') || c.includes('ml-console__editor')) return 'py';
  return 'raw';
}

function updateTargetHint() {
  if (!els) return;
  const kind = targetKind();
  const tip =
    kind === 'py'
      ? ' → 插入 print 代码'
      : kind === 'md'
        ? ' → 插入公式'
        : ' → 插入带定界符的公式';
  els.target.textContent = '插入目标：' + targetLabel() + tip;
}

function paintBtn(btn, tex, label) {
  btn.textContent = label || tex;
  btn.title = tex;
  getKatex()
    .then((katex) => {
      try {
        btn.innerHTML = katex.renderToString(tex, { throwOnError: false });
        btn.title = tex;
      } catch {
        /* 渲染不出来就留着 LaTeX 源码 */
      }
    })
    .catch(() => {});
}

function renderGrid() {
  els.grid.innerHTML = '';
  const g = GROUPS[curGroup];
  for (const it of g.items) {
    const tex = Array.isArray(it) ? it[0] : it;
    const label = Array.isArray(it) ? it[1] : null;
    const btn = el('button', 'ml-formula__sym', '');
    btn.type = 'button';
    btn.dataset.tex = tex;
    paintBtn(btn, tex, label);
    btn.addEventListener('click', () => insertIntoSource(tex));
    els.grid.appendChild(btn);
  }
}

function renderTabs() {
  els.tabs.innerHTML = '';
  GROUPS.forEach((g, i) => {
    const b = el('button', 'ml-formula__tab' + (i === curGroup ? ' is-active' : ''), g.name);
    b.type = 'button';
    b.addEventListener('click', () => {
      curGroup = i;
      renderTabs();
      renderGrid();
    });
    els.tabs.appendChild(b);
  });
}

function insertIntoSource(text) {
  const ta = els.src;
  const s = ta.selectionStart;
  const e2 = ta.selectionEnd;
  ta.focus();
  ta.setRangeText(text, s, e2, 'end');
  lastPos = ta.selectionStart;
  updatePreview();
}

function currentTex() {
  return (els.src.value || '').trim();
}

/** 笔记（Markdown）形态：带定界符的公式源码。 */
function wrapped() {
  const tex = currentTex();
  if (!tex) return '';
  if (!els.wrap.checked) return tex;
  return els.mode.value === 'display' ? '$$' + tex + '$$' : '$' + tex + '$';
}

/**
 * 代码形态：一句能跑的 Python。print 出来的 $$…$$ / $…$ 会被输出渲染成公式
 * （见 mathout.js）。用 r"…" 原样字符串，免得 \frac 里的反斜杠被 Python 吃掉；
 * 源码里万一有双引号就换成单引号，别把字符串截断。
 */
function asPython() {
  const tex = currentTex();
  if (!tex) return '';
  const delim = els.mode.value === 'display' ? '$$' : '$';
  const body = (els.wrap.checked ? delim + tex + delim : tex).replace(/"/g, "'");
  return 'print(r"' + body + '")';
}

/** 真正要插进目标的文本：笔记插公式，Python 插代码，其它按笔记处理。 */
function insertText() {
  return targetKind() === 'py' ? asPython() : wrapped();
}

let previewTimer = null;
function updatePreview() {
  const tex = currentTex();
  els.preview.classList.toggle('is-empty', !tex);
  if (!tex) {
    els.preview.textContent = '预览（写点 $\\LaTeX$ 就会在这里渲染）';
    return;
  }
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    getKatex()
      .then((katex) => {
        try {
          els.preview.innerHTML = katex.renderToString(tex, { displayMode: true, throwOnError: true });
          els.preview.classList.remove('is-error');
        } catch (e) {
          els.preview.textContent = '公式写错了：' + ((e && e.message) || e);
          els.preview.classList.add('is-error');
        }
      })
      .catch(() => {
        els.preview.textContent = tex;
      });
  }, 120);
}

function doInsert() {
  let text = insertText();
  if (!text) return;
  const t = lastTarget && lastTarget.isConnected ? lastTarget : null;
  if (!t) {
    els.target.textContent = '插入目标：请先点一下要插入的输入框';
    return;
  }
  const s = typeof t.selectionStart === 'number' ? t.selectionStart : t.value.length;
  /* 往代码里插语句：光标不在行首就先换行，别把上一行的代码接在屁股后面 */
  if (targetKind() === 'py' && s > 0 && !/\n\s*$/.test(t.value.slice(0, s))) {
    text = '\n' + text;
  }
  const e2 = typeof t.selectionEnd === 'number' ? t.selectionEnd : s;
  t.focus();
  if (typeof t.setRangeText === 'function') {
    t.setRangeText(text, s, e2, 'end');
  } else {
    t.value = t.value.slice(0, s) + text + t.value.slice(e2);
  }
  /* 触发一次 input：编辑器的草稿保存 / 单元内容同步都挂在这个事件上 */
  t.dispatchEvent(new Event('input', { bubbles: true }));
  lastTarget = t;
}

function build() {
  const panel = el('div', 'ml-formula');
  panel.id = 'ml-formula';

  const head = el('div', 'ml-formula__head');
  const brand = el('span', 'ml-formula__brand', '公式输入');
  const btnClose = el('button', 'ml-formula__close', '×');
  btnClose.type = 'button';
  btnClose.title = '关闭（Esc）';
  head.append(brand, btnClose);

  const preview = el('div', 'ml-formula__preview');
  preview.className = 'ml-formula__preview is-empty';
  preview.textContent = '预览（写点 $\\LaTeX$ 就会在这里渲染）';

  const src = document.createElement('textarea');
  src.className = 'ml-formula__src';
  src.rows = 2;
  src.spellcheck = false;
  src.placeholder = '写 LaTeX，例如 \\frac{a}{b} 或 x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}';

  const tabs = el('div', 'ml-formula__tabs');
  const grid = el('div', 'ml-formula__grid');

  const bar = el('div', 'ml-formula__bar');
  const wrapLabel = el('label', 'ml-formula__opt');
  const wrap = document.createElement('input');
  wrap.type = 'checkbox';
  wrap.checked = true;
  wrapLabel.append(wrap, document.createTextNode(' 包成公式'));
  wrapLabel.title =
    '笔记：勾上就插 $…$ / $$…$$，取消则只插 LaTeX 源码（光标已经在一对 $$ 中间时用）；Python：勾上则 print 的内容带定界符';

  const mode = document.createElement('select');
  mode.className = 'ml-formula__mode';
  [['inline', '行内 $…$'], ['display', '独占 $$…$$']].forEach(([v, t]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = t;
    o.selected = v === 'inline';
    mode.appendChild(o);
  });

  const btnInsert = el('button', 'py-runner__btn', '插入到光标处');
  btnInsert.type = 'button';
  const btnCopy = el('button', 'py-runner__btn py-runner__btn--ghost', '复制');
  btnCopy.type = 'button';
  const target = el('span', 'ml-formula__target', '');
  bar.append(wrapLabel, mode, btnInsert, btnCopy, target);

  panel.append(head, preview, src, tabs, grid, bar);
  document.body.appendChild(panel);

  /* 拖动 */
  let drag = null;
  head.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('button')) return;
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

  btnClose.addEventListener('click', () => closeFormula());
  src.addEventListener('input', updatePreview);
  src.addEventListener('keyup', () => {
    lastPos = src.selectionStart;
  });
  btnInsert.addEventListener('click', doInsert);
  btnCopy.addEventListener('click', async () => {
    /* 复制与插入保持同一份文本：目标是代码就复制到 print 代码，是笔记就复制到公式 */
    const text = insertText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      btnCopy.textContent = '已复制';
      setTimeout(() => (btnCopy.textContent = '复制'), 1200);
    } catch {
      src.select();
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && panel.classList.contains('is-open')) closeFormula();
  });

  watchPanel(panel);
  els = { panel, preview, src, tabs, grid, wrap, mode, target };
  renderTabs();
  renderGrid();
  return els;
}

/* 兜底猜一个插入目标：面板是刚打开的，用户还没在它之外聚焦过任何输入框
   （focusin 监听这时才开始生效），所以先看当前焦点，再按「哪个浮窗开着」猜。 */
function guessTarget() {
  const ae = document.activeElement;
  if (ae && isEditable(ae) && !(els && els.panel.contains(ae))) return ae;
  const bySel = [
    '#ml-console.is-open .ml-console__editor',
    '#ml-notebook.is-open .ml-nb__code',
    '#ml-notebook.is-open .ml-nb__md',
    '#ml-repo.is-open .ml-repo__name',
  ];
  for (const sel of bySel) {
    const node = document.querySelector(sel);
    if (node) return node;
  }
  return null;
}

function isEditable(node) {
  if (!node || !node.tagName) return false;
  if (node.disabled || node.readOnly) return false;
  return (
    node.tagName === 'TEXTAREA' ||
    (node.tagName === 'INPUT' && /^(text|search)$/.test(node.type || ''))
  );
}

export async function openFormula() {
  if (!els || !document.contains(els.panel)) build();
  trackFocusOnce();
  if (!lastTarget || !lastTarget.isConnected) lastTarget = guessTarget();
  updateTargetHint();
  els.panel.classList.add('is-open');
  bringToFront(els.panel);
  /* 先把 KaTeX 拉起来，符号按钮的图形才不会迟到 */
  try {
    await getKatex();
    renderGrid();
    updatePreview();
  } catch {
    /* 拉不到就显示 LaTeX 源码 */
  }
  els.src.focus();
}

export function closeFormula() {
  if (els) els.panel.classList.remove('is-open');
}

export function isFormulaOpen() {
  return !!(els && els.panel.classList.contains('is-open'));
}

let tracked = false;
function trackFocusOnce() {
  if (tracked) return;
  tracked = true;
  trackFocus();
}

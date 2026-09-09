/* =========================================================================
 * 符号键盘 —— 微软数学那一套「点符号拼公式」的输入面板
 * -------------------------------------------------------------------------
 * 面板本身不持有光标：它只往「当前编辑框」的光标处塞 LaTeX 片段。
 * 空位一律用 KaTeX 的 \placeholder{} 表示，渲染出来是个虚线框，
 * 拼到哪儿、哪儿还没填，一眼看得见。
 *
 * 三条手感上的讲究：
 *   1. 选中一段再点符号，选中的东西会落进第一个空位——想把 x+1 整个塞进
 *      分子，选中它再点分数就行，不用先剪切。
 *   2. 退格不是傻删一个字符：\sin 会整个删掉，空着的占位框也整个删掉。
 *   3. Tab（或「下一空」按钮）在空位之间跳，拼完一个长式子不用找鼠标。
 * ========================================================================= */

import { getKatex } from '../mathout';

const PH = '\\placeholder{}';
const PH_HEAD = '\\placeholder{';

/* 分组。每项 [LaTeX, 说明]；说明缺省就用 latex 本身当提示。
   数字那组排成计算器样子，手熟了不用找。 */
const GROUPS = [
  {
    name: '数字与运算',
    cols: 4,
    items: [
      ['7', '7'], ['8', '8'], ['9', '9'], ['\\div', '除'],
      ['4', '4'], ['5', '5'], ['6', '6'], ['\\times', '乘'],
      ['1', '1'], ['2', '2'], ['3', '3'], ['-', '减'],
      ['0', '0'], ['.', '小数点'], ['+', '加'], ['\\pi', '圆周率 π'],
    ],
  },
  {
    name: '变量与参数',
    items: [
      ['x', '自变量 x'], ['y', '3D 下是第二个自变量；平面模式下当参数用'],
      ['a', '参数 a'], ['b', '参数 b'], ['c', '参数 c'],
      ['k', '参数 k'], ['n', '参数 n'], ['e', '自然常数'],
    ],
  },
  {
    name: '分式 · 幂 · 根',
    items: [
      ['\\frac{' + PH + '}{' + PH + '}', '分数'],
      ['\\placeholder{}^{2}', '平方'],
      ['\\placeholder{}^{3}', '立方'],
      ['\\placeholder{}^{\\placeholder{}}', '任意次幂'],
      ['\\sqrt{\\placeholder{}}', '平方根'],
      ['\\sqrt[\\placeholder{}]{\\placeholder{}}', 'n 次根'],
      ['\\frac{1}{\\placeholder{}}', '倒数'],
      ['\\placeholder{}!', '阶乘'],
    ],
  },
  {
    name: '函数',
    items: [
      ['\\sin\\left(' + PH + '\\right)', '正弦'],
      ['\\cos\\left(' + PH + '\\right)', '余弦'],
      ['\\tan\\left(' + PH + '\\right)', '正切'],
      ['\\ln\\left(' + PH + '\\right)', '自然对数'],
      ['\\log\\left(' + PH + '\\right)', '常用对数（底 10）'],
      ['\\log_{2}\\left(' + PH + '\\right)', '以 2 为底'],
      ['e^{\\placeholder{}}', '自然指数'],
      ['\\left|' + PH + '\\right|', '绝对值'],
    ],
  },
  {
    name: '希腊字母（当参数用）',
    items: [
      ['\\alpha', 'alpha'], ['\\beta', 'beta'], ['\\gamma', 'gamma'],
      ['\\delta', 'delta'], ['\\theta', 'theta'], ['\\lambda', 'lambda'],
      ['\\mu', 'mu'], ['\\sigma', 'sigma'], ['\\phi', 'phi'], ['\\omega', 'omega'],
    ],
  },
];

/* ---------- 编辑框上的光标操作 ---------- */

function isEditable(n) {
  return !!n && (n.tagName === 'TEXTAREA' || (n.tagName === 'INPUT' && n.type === 'text'));
}

/**
 * 把一段 LaTeX 塞进光标处。
 * 有选中内容时，选中内容会顶替第一个空位——这样「先写 x+1，再点分数」
 * 就能直接得到 (x+1)/□，不用来回剪切。
 * 插完光标停在第一个空位的肚子里（没有空位就停在片段末尾）。
 */
export function insertSnippet(ta, snippet) {
  if (!isEditable(ta)) return;
  const s = ta.selectionStart === null ? ta.value.length : ta.selectionStart;
  const e = ta.selectionEnd === null ? s : ta.selectionEnd;
  const sel = ta.value.slice(s, e);
  let text = snippet;
  let idx = text.indexOf(PH);

  if (sel && idx >= 0) {
    text = text.slice(0, idx) + PH_HEAD + sel + '}' + text.slice(idx + PH.length);
    idx = text.indexOf(PH_HEAD);
  }
  const before = ta.value.slice(0, s);
  const after = ta.value.slice(e);
  ta.value = before + text + after;
  const pos = idx >= 0 ? s + idx + PH_HEAD.length + (sel ? sel.length : 0)
    : s + text.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
}

/** 光标后（dir<0 时是光标前）的下一个空位，跳进去 */
export function nextPlaceholder(ta, dir) {
  if (!isEditable(ta)) return false;
  const v = ta.value;
  const cur = ta.selectionStart;
  if (dir < 0) {
    const i = v.lastIndexOf(PH_HEAD, Math.max(0, cur - PH_HEAD.length - 1));
    if (i < 0) return false;
    ta.setSelectionRange(i + PH_HEAD.length, i + PH_HEAD.length);
  } else {
    const i = v.indexOf(PH_HEAD, cur);
    if (i < 0) return false;
    ta.setSelectionRange(i + PH_HEAD.length, i + PH_HEAD.length);
  }
  ta.focus();
  return true;
}

/**
 * 退格：\sin 这种整条命令一次删掉，空着的占位框也整个删掉，
 * 而不是一个字符一个字符地抠。
 */
export function smartBackspace(ta) {
  if (!isEditable(ta)) return;
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  if (s !== e) {
    ta.setRangeText('', s, e, 'end');
    return;
  }
  const before = ta.value.slice(0, s);
  /* 空的占位框：\placeholder{} 整段删 */
  if (before.endsWith(PH)) {
    ta.setRangeText('', s - PH.length, s, 'end');
    return;
  }
  /* LaTeX 命令：\sin、\left( 之类 */
  const m = /\\[A-Za-z]+$|\\[{}|]$/.exec(before);
  if (m) {
    ta.setRangeText('', s - m[0].length, s, 'end');
    return;
  }
  /* \left( / \right) 这种成对记号，带不带空格都认 */
  const m2 = /\\(left|right)\s*[()|[\].]$/.exec(before);
  if (m2) {
    ta.setRangeText('', s - m2[0].length, s, 'end');
    return;
  }
  ta.setRangeText('', Math.max(0, s - 1), s, 'end');
}

/* ---------- 面板 ---------- */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

/**
 * 建面板。
 * @param host      容器
 * @param getTarget 取当前编辑框的函数（多函数时点哪条就往哪条里插）
 * @param onChange  插入后的回调（用来触发重算）
 */
export function buildKeypad(host, getTarget, onChange) {
  const wrap = el('div', 'ml-fn__keypad');

  /* 控制条：退格 / 左右 / 下一个空位 / 清空 */
  const bar = el('div', 'ml-fn__kbbar');
  const mk = (label, title, fn, cls) => {
    const b = el('button', 'ml-fn__kbtn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.title = title;
    b.addEventListener('click', () => {
      const ta = getTarget();
      if (!ta) return;
      fn(ta);
      if (onChange) onChange(ta);
    });
    return b;
  };
  bar.append(
    mk('⌫', '退格（删掉一整个命令或空位）', smartBackspace),
    mk('←', '光标左移', (ta) => {
      const p = Math.max(0, ta.selectionStart - 1);
      ta.setSelectionRange(p, p);
      ta.focus();
    }),
    mk('→', '光标右移', (ta) => {
      const p = Math.min(ta.value.length, ta.selectionStart + 1);
      ta.setSelectionRange(p, p);
      ta.focus();
    }),
    mk('下一空', '跳到下一个空位（Tab）', (ta) => {
      if (!nextPlaceholder(ta, 1)) nextPlaceholder(ta, -1);
    }, 'ml-fn__kbtn--wide'),
    mk('清空', '清空整个式子', (ta) => {
      ta.value = '';
      ta.setSelectionRange(0, 0);
      ta.focus();
    }),
  );
  wrap.appendChild(bar);

  /* 符号格子 */
  const body = el('div', 'ml-fn__kbbody');
  GROUPS.forEach((g) => {
    const sec = el('div', 'ml-fn__kbsec');
    const lab = el('div', 'ml-fn__kblabel', g.name);
    const grid = el('div', 'ml-fn__kbgrid');
    if (g.cols) grid.style.gridTemplateColumns = 'repeat(' + g.cols + ', minmax(0, 1fr))';
    g.items.forEach(([tex, tip]) => {
      const b = el('button', 'ml-fn__kbkey');
      b.type = 'button';
      b.dataset.tex = tex;
      b.title = tip || tex;
      b.textContent = tex; /* KaTeX 没到货前先显示源码，不至于一片空白 */
      b.addEventListener('click', () => {
        const ta = getTarget();
        if (!ta) return;
        insertSnippet(ta, tex);
        if (onChange) onChange(ta);
      });
      grid.appendChild(b);
    });
    sec.append(lab, grid);
    body.appendChild(sec);
  });
  wrap.appendChild(body);

  host.appendChild(wrap);

  /* 按钮上的图形用 KaTeX 现渲。拉不到就退化成 LaTeX 源码，不影响使用 */
  function paint() {
    getKatex()
      .then((katex) => {
        wrap.querySelectorAll('.ml-fn__kbkey').forEach((b) => {
          try {
            b.innerHTML = katex.renderToString(b.dataset.tex, { throwOnError: false });
          } catch (err) {
            void err;
          }
        });
      })
      .catch(() => {});
  }
  paint();

  return { el: wrap, repaint: paint };
}

export { GROUPS, PH, PH_HEAD };

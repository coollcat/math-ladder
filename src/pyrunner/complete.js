/* =========================================================================
 * 浮窗 / 笔记本的 Python 代码补全（极简版）
 * -------------------------------------------------------------------------
 * 刻意不做语言服务器：课程里的代码全是短片段，真正需要的只是
 * 「关键字 / 内置函数 / 我在这段代码里自己起过的名字 / 我在控制台里定义过的变量」
 * 这四类词的提示。实现就是一个候选数组 + 一个绝对定位的小列表：
 *   - Ctrl+空格：手动唤出；
 *   - Tab：有候选就直接补全，没有候选就照旧缩进两格；
 *   - ↑↓ 选、回车/Tab 接受、Esc 关掉（Esc 会拦下来，不会顺带关掉浮窗）。
 *
 * 候选来源（按顺序权重递减）：
 *   1. 静态词表（关键字 + 常用内置）；
 *   2. 当前编辑器里出现过的标识符（setExtras 由 enhancer 在输入/运行后喂进来）；
 *   3. 控制台命名空间 _ml_console_g 里的变量名（运行过一次后才有）。
 * ========================================================================= */

const KEYWORDS = [
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
];

const BUILTINS = [
  'abs', 'all', 'any', 'bin', 'bool', 'chr', 'dict', 'dir', 'divmod', 'enumerate',
  'filter', 'float', 'format', 'frozenset', 'getattr', 'hasattr', 'help', 'hex',
  'input', 'int', 'isinstance', 'iter', 'len', 'list', 'map', 'max', 'min', 'next',
  'oct', 'open', 'ord', 'pow', 'print', 'range', 'repr', 'reversed', 'round', 'set',
  'setattr', 'slice', 'sorted', 'str', 'sum', 'tuple', 'type', 'zip',
];

const METHOD_HINTS = [
  'append', 'clear', 'copy', 'count', 'extend', 'index', 'insert', 'join', 'keys',
  'lower', 'lstrip', 'pop', 'remove', 'replace', 'rstrip', 'split', 'startswith',
  'strip', 'upper', 'values', 'items', 'sort', 'title', 'mean', 'std', 'shape',
  'reshape', 'linspace', 'arange', 'zeros', 'ones', 'array', 'plot', 'show',
  'xlabel', 'ylabel', 'title', 'legend', 'scatter', 'diff', 'integrate', 'limit',
  'simplify', 'expand', 'factor', 'solve', 'latex', 'symbols', 'series', 'matrix',
];

const MAX_SHOW = 8;

let popupEl = null;
let state = null; /* { ta, start, tail, items, index } */

function ensurePopup() {
  if (popupEl) return popupEl;
  const el = document.createElement('div');
  el.className = 'ml-ac';
  el.style.display = 'none';
  /* 用 mousedown + preventDefault：默认的 blur 会先把候选框关掉，click 就点不到了 */
  el.addEventListener('mousedown', (ev) => {
    const li = ev.target.closest('.ml-ac__item');
    if (!li || !state) return;
    ev.preventDefault();
    accept(Number(li.dataset.i));
  });
  document.body.appendChild(el);
  popupEl = el;
  return el;
}

function close() {
  if (popupEl) popupEl.style.display = 'none';
  state = null;
}

/* 光标处正在写的那个词：'np.li' → { start, prefix:'np.li', tail:'li' } */
function wordAt(ta) {
  const pos = ta.selectionStart;
  if (pos !== ta.selectionEnd) return null;
  const s = ta.value;
  let i = pos;
  while (i > 0 && /[A-Za-z0-9_.]/.test(s[i - 1])) i -= 1;
  const prefix = s.slice(i, pos);
  if (!prefix) return null;
  return { start: i, prefix, tail: prefix.split('.').pop() };
}

/** 镜像 div 量光标坐标——比按字数估靠谱，也不重（几十行 DOM 操作，只在唤出时跑一次）。 */
function caretXY(ta) {
  const cs = window.getComputedStyle(ta);
  const div = document.createElement('div');
  const copy = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
    'lineHeight', 'textTransform', 'paddingLeft', 'paddingTop', 'paddingRight',
    'borderLeftWidth', 'borderTopWidth', 'boxSizing', 'tabSize',
  ];
  for (const k of copy) div.style[k] = cs[k];
  div.style.position = 'absolute';
  div.style.top = '-9999px';
  div.style.left = '-9999px';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.width = ta.clientWidth + 'px';
  div.textContent = ta.value.slice(0, ta.selectionStart);
  const marker = document.createElement('span');
  marker.textContent = '​';
  div.appendChild(marker);
  document.body.appendChild(div);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 18;
  const x = marker.offsetLeft;
  const y = marker.offsetTop + lh;
  div.remove();
  const r = ta.getBoundingClientRect();
  return { left: r.left + x - ta.scrollLeft, top: r.top + y - ta.scrollTop };
}

function paint() {
  const el = ensurePopup();
  if (!state || !state.items.length) {
    el.style.display = 'none';
    return;
  }
  el.innerHTML = '';
  state.items.slice(0, MAX_SHOW).forEach((w, i) => {
    const li = document.createElement('div');
    li.className = 'ml-ac__item' + (i === state.index ? ' is-active' : '');
    li.dataset.i = String(i);
    const b = document.createElement('b');
    b.textContent = w.slice(0, state.tail.length);
    li.appendChild(b);
    li.appendChild(document.createTextNode(w.slice(state.tail.length)));
    el.appendChild(li);
  });
  el.style.display = 'block';
  const { left, top } = caretXY(state.ta);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(left, window.innerWidth - w - 8)) + 'px';
  el.style.top =
    (top + h > window.innerHeight - 8 ? Math.max(8, top - h - (parseFloat(getComputedStyle(state.ta).lineHeight) || 18)) : top) + 'px';
  const act = el.querySelector('.is-active');
  if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest' });
}

function accept(index) {
  if (!state) return;
  const { ta, prefix, items } = state;
  const word = items[index];
  if (!word) return close();
  const tail = prefix.split('.').pop();
  const ins = word.slice(tail.length);
  const pos = ta.selectionStart;
  ta.setRangeText(ins, pos, pos, 'end');
  close();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function open(ta, extras) {
  const w = wordAt(ta);
  if (!w || !w.tail) {
    close();
    return false;
  }
  const pool = [...KEYWORDS, ...BUILTINS, ...METHOD_HINTS, ...(extras || [])];
  const seen = new Set();
  const items = [];
  const lower = w.tail.toLowerCase();
  for (const word of pool) {
    if (typeof word !== 'string' || !word) continue;
    if (seen.has(word)) continue;
    if (word.toLowerCase().startsWith(lower) && word.length > w.tail.length) {
      seen.add(word);
      items.push(word);
    }
  }
  /* 前缀完全相同的排前面，其余按字典序 */
  items.sort((a, b) => {
    const pa = a.toLowerCase().startsWith(lower) ? 0 : 1;
    const pb = b.toLowerCase().startsWith(lower) ? 0 : 1;
    return pa - pb || a.localeCompare(b);
  });
  if (!items.length) {
    close();
    return false;
  }
  state = { ta, start: w.start, prefix: w.prefix, tail: w.tail, items, index: 0 };
  paint();
  return true;
}

/**
 * 给一个 textarea 挂上补全。
 * @returns {{setExtras:(words:string[])=>void, destroy:()=>void}}
 */
export function attachComplete(ta) {
  let extras = [];
  const isOpen = () => !!state && state.ta === ta;

  /* 被本处理器吃掉的按键：既阻止默认行为，也别再传给后面挂的
     同元素监听（比如编辑器自己的「Tab 缩进两格」），否则补完还会
     多出两个空格。stopPropagation 顺便拦住文档级的 Esc（不会误关浮窗）。 */
  const swallow = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  };

  const onKeydown = (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.code === 'Space') {
      swallow(ev);
      open(ta, extras);
      return;
    }
    if (ev.key === 'Escape' && isOpen()) {
      swallow(ev);
      close();
      return;
    }
    if (isOpen()) {
      if (ev.key === 'ArrowDown') {
        swallow(ev);
        state.index = (state.index + 1) % Math.min(state.items.length, MAX_SHOW);
        paint();
        return;
      }
      if (ev.key === 'ArrowUp') {
        swallow(ev);
        const n = Math.min(state.items.length, MAX_SHOW);
        state.index = (state.index - 1 + n) % n;
        paint();
        return;
      }
      if (ev.key === 'Enter' || ev.key === 'Tab') {
        swallow(ev);
        accept(state.index);
        return;
      }
    }
    if (ev.key === 'Tab' && !ev.shiftKey && !isOpen()) {
      /* 正在写一个词就试着唤出候选；唤不出来（没匹配项）就不拦，
         让后面的监听照旧缩进两格。 */
      const w = wordAt(ta);
      if (w && (w.tail || '').length >= 2 && open(ta, extras)) swallow(ev);
    }
  };

  const onInput = () => {
    if (isOpen()) open(ta, extras); /* 边打字边收窄候选 */
  };
  const onBlur = () => {
    /* 延迟一拍：点候选项的 mousedown 已经 preventDefault，不会走到这里 */
    setTimeout(() => {
      if (isOpen()) close();
    }, 0);
  };
  const onScroll = () => {
    if (isOpen()) paint();
  };

  ta.addEventListener('keydown', onKeydown);
  ta.addEventListener('input', onInput);
  ta.addEventListener('blur', onBlur);
  window.addEventListener('scroll', onScroll, true);

  return {
    setExtras(words) {
      extras = Array.isArray(words) ? words : [];
    },
    destroy() {
      ta.removeEventListener('keydown', onKeydown);
      ta.removeEventListener('input', onInput);
      ta.removeEventListener('blur', onBlur);
      window.removeEventListener('scroll', onScroll, true);
      if (isOpen()) close();
    },
  };
}

/** 从一段源码里抓标识符（自己起过的变量名/函数名，是最有价值的候选）。 */
export function harvestWords(src) {
  const found = new Set();
  const re = /\b(?:def|class)\s+([A-Za-z_]\w*)|([A-Za-z_]\w*)\s*=/g;
  let m;
  while ((m = re.exec(String(src || '')))) {
    const w = m[1] || m[2];
    if (w && w.length < 40) found.add(w);
  }
  return [...found];
}

/* HTML 原生可视化组件：```viz 围栏 + JSON 规格，纯 canvas 即时交互 */

/* ---------- 主题色工具：canvas 底色/文字/网格跟随明暗主题 ---------- */

const redraws = new Set();
let themeObserverReady = false;
let themeCache = null;

/* 读根元素上的 CSS 变量（custom.css 提供）；取不到时用随主题给的兜底值 */
function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  } catch (e) {
    void e;
    return fallback;
  }
}

/* 当前是否暗色：Docusaurus 把主题写在 <html data-theme> 上，缺省再问系统偏好 */
function isDarkMode() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/* 一组当前主题色（带缓存，切主题时由 observer 置空后重建） */
function themeColors() {
  if (themeCache) return themeCache;
  const dark = isDarkMode();
  themeCache = {
    bg: cssVar('--ml-viz-bg', dark ? '#20242c' : '#ffffff'),
    fg: cssVar('--ml-viz-fg', dark ? '#e8eaed' : '#1c1e21'),
    grid: cssVar('--ml-viz-grid', dark ? 'rgba(148,163,184,0.20)' : 'rgba(107,114,128,0.18)'),
    axis: cssVar('--ml-viz-axis', dark ? 'rgba(148,163,184,0.60)' : 'rgba(107,114,128,0.60)'),
    /* 主色/副色：与全站硬编码蓝 (#3b74d6)、橙 (#e8871e) 保持同一风格；
       曾因缺失导致 moe-router / markov-chain-lab 的 fillStyle=undefined 沿用近黑描边色 */
    accent: cssVar('--ml-viz-accent', dark ? '#7aa5e8' : '#3b74d6'),
    accent2: cssVar('--ml-viz-accent2', dark ? '#d99a4e' : '#e8871e'),
  };
  return themeCache;
}

/* 浅灰“留白”填充（饼图底盘、筛格空位等），暗色下换成半透明亮色 */
function softFill() {
  return isDarkMode() ? 'rgba(255,255,255,0.08)' : '#eef0f3';
}

/* 监听 <html data-theme> 变化：置空缓存并触发全部存活组件重绘（只建一次） */
function ensureThemeObserver() {
  if (themeObserverReady || typeof MutationObserver === 'undefined') return;
  themeObserverReady = true;
  new MutationObserver(() => {
    themeCache = null;
    redraws.forEach((fn) => {
      if (!fn.el || !fn.el.isConnected) { redraws.delete(fn); return; }
      try { fn(); } catch (err) { void err; }
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/* 离屏暂停助手：进入视口 cb(true)、离开 cb(false)；
   偏好减少动效的用户视为永不离屏——一次性 cb(false)，只保留初始静态帧 */
function onScreen(el, cb) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cb(false);
    return;
  }
  if (typeof IntersectionObserver === 'undefined') { cb(true); return; }
  new IntersectionObserver((entries) => {
    cb(entries.some((en) => en.isIntersecting));
  }, { rootMargin: '60px' }).observe(el);
}

function setupCanvas(box, height, onResize) {
  const canvas = document.createElement('canvas');
  box.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const st = { W: 0 };
  function fit() {
    const style = getComputedStyle(box);
    const paddingX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const width = Math.max((box.clientWidth || 320) - paddingX, 280);
    if (Math.abs(width - st.W) < 2) return false;
    st.W = width;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';   // 精确像素宽：杜绝位图被拉伸
    canvas.style.height = height + 'px';
    canvas._W = width;
    canvas._H = height;
    return true;
  }
  fit();
  const ctx0 = canvas.getContext('2d');
  ctx0.scale(dpr, dpr);
  const holder = {
    get ctx() {
      const c = canvas.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      return c;
    },
    get W() { return st.W; },
    H: height,
    canvas,
    redraw: null,
  };
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (fit() && holder.redraw) holder.redraw();
    }).observe(box);
  }
  /* 主题切换全量重绘登记（惰性清理：组件已卸载的在下一次切换时剔除） */
  const themeRedraw = () => { if (holder.redraw) holder.redraw(); };
  themeRedraw.el = box;
  redraws.add(themeRedraw);
  ensureThemeObserver();
  void ctx0;
  void onResize;
  return holder;
}

/* 把指针事件换算成逻辑坐标的通用拖拽绑定 */
function bindPointer(canvas, handlers) {
  let activeId = null;
  const toLogical = (ev) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (canvas._W / rect.width),
      y: (ev.clientY - rect.top) * (canvas._H / rect.height),
    };
  };
  canvas.addEventListener('pointerdown', (ev) => {
    const p = toLogical(ev);
    const id = handlers.pick ? handlers.pick(p.x, p.y) : null;
    if (id !== null && id !== undefined) {
      activeId = id;
      canvas.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (activeId === null || activeId === undefined) return;
    if (ev.buttons === 0 && ev.pointerType === 'mouse') {
      activeId = null;
      return;
    }
    const p = toLogical(ev);
    handlers.move(activeId, p.x, p.y);
    ev.preventDefault();
  });
  const end = () => {
    activeId = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function gcd2(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function mkBtn(label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ml-viz-btn';
  b.textContent = label;
  return b;
}

/* 动画统一入口：播放/暂停/重置、离屏暂停、减少动效时保持静态 */
function addAnimationControls(host, handlers) {
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const play = mkBtn(reduced ? '减少动效' : '播放');
  const reset = mkBtn('重置');
  play.disabled = reduced;
  reset.disabled = false;
  box.append(play, reset);

  let raf = null;
  let playing = false;
  let visible = true;
  let last = 0;

  function sync() {
    const shouldRun = playing && visible && host.isConnected;
    if (shouldRun && raf == null) raf = requestAnimationFrame(tick);
    if (!shouldRun && raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    play.textContent = reduced ? '减少动效' : playing ? '暂停' : '播放';
  }
  function tick(now) {
    if (!playing || !visible || !host.isConnected) {
      raf = null;
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    handlers.onTick(dt);
    raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => {
    playing = !playing && !reduced;
    last = 0;
    sync();
  });
  reset.addEventListener('click', () => {
    playing = false;
    sync();
    handlers.onReset();
  });
  onScreen(host, (isVisible) => {
    visible = isVisible;
    last = 0;
    sync();
  });
  return {
    stop() {
      playing = false;
      sync();
    },
  };
}

function buildSliders(spec, onChange) {
  const box = document.createElement('div');
  box.className = 'ml-viz__sliders';
  const state = {};
  const refs = {};
  (spec.sliders || []).forEach((s) => {
    state[s.name] = s.value;
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
      state[s.name] = parseFloat(range.value);
      val.textContent = range.value;
      onChange(state);
    });
    row.append(label, range, val);
    refs[s.name] = { range, val };
    box.appendChild(row);
  });
  return { box, state, refs };
}

/* 表达式编译：只允许数字、白名单变量/常量/函数与四则/幂运算，new Function 前先过词法检查

   2026-08-28 加固两处（审计发现 10 处 viz 块渲染成错误卡，根因都在这里）：
   ① Unicode 归一化：正文从 Word / 网页粘来的 −(U+2212)、–、—、×、÷、全角括号，
      一律折成 ASCII，否则被判「无法识别的字符」。
   ② 一元负号：-x^2 是标准数学写法（含义 -(x^2)），但 ^→** 后成 -x**2，
      JS 语法禁止一元负号紧贴 **。这里把「一元负号 + 含幂运算对象」整体加括号 → -(x**2)。 */
const EXPR_FUNCS = {
  sin: 'Math.sin',
  cos: 'Math.cos',
  tan: 'Math.tan',
  sqrt: 'Math.sqrt',
  abs: 'Math.abs',
  log: 'Math.log',
  exp: 'Math.exp',
  floor: 'Math.floor',
  ceil: 'Math.ceil',
};
const EXPR_CONSTS = { pi: 'Math.PI', e: 'Math.E' };

/* 全角/印刷体符号 → ASCII。只折算子与括号，不动字母数字 */
const EXPR_UNICODE = {
  '−': '-', '–': '-', '—': '-', '‐': '-', '‑': '-', '‒': '-', '―': '-', '－': '-',
  '×': '*', '÷': '/', '∗': '*', '⋅': '*', '·': '*', '＊': '*', '／': '/',
  '（': '(', '）': ')', '【': '(', '】': ')', '［': '(', '］': ')',
};
function normalizeExpr(src) {
  let out = '';
  for (const ch of String(src)) out += EXPR_UNICODE[ch] || ch;
  return out;
}

/* 词法扫描：顺带校验白名单并收集用到的函数/常量。^ 在此折成 ** */
function exprTokens(src, allowedVars) {
  const toks = [];
  const usedFuncs = [];
  const usedConsts = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      toks.push({ t: 'num', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /\w/.test(src[j])) j++;
      const name = src.slice(i, j);
      let k = j;
      while (k < src.length && /\s/.test(src[k])) k++;
      if (src[k] === '(') {
        if (!EXPR_FUNCS[name]) throw new Error('未知函数: ' + name);
        if (!usedFuncs.includes(name)) usedFuncs.push(name);
        toks.push({ t: 'func', v: name });
      } else if (EXPR_CONSTS[name]) {
        if (!usedConsts.includes(name)) usedConsts.push(name);
        toks.push({ t: 'const', v: name });
      } else {
        if (!allowedVars.includes(name)) throw new Error('未知变量: ' + name);
        toks.push({ t: 'var', v: name });
      }
      i = j;
      continue;
    }
    if (ch === '*' && src[i + 1] === '*') {
      toks.push({ t: 'op', v: '**' });
      i += 2;
      continue;
    }
    if ('+-*/%^()'.includes(ch)) {
      const isParen = ch === '(' || ch === ')';
      toks.push({ t: isParen ? 'paren' : 'op', v: ch === '^' ? '**' : ch });
      i += 1;
      continue;
    }
    throw new Error('无法识别的字符: ' + ch);
  }
  return { toks, usedFuncs, usedConsts };
}

/* 跳过一个括号组：start 必须指向 '('，返回 ')' 之后的下标 */
function exprSkipGroup(toks, start) {
  if (!(toks[start] && toks[start].t === 'paren' && toks[start].v === '(')) return start;
  let depth = 0;
  for (let i = start; i < toks.length; i++) {
    if (toks[i].t === 'paren' && toks[i].v === '(') depth++;
    else if (toks[i].t === 'paren' && toks[i].v === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return toks.length;
}

/* 从 start 起吃掉一个「幂链」运算对象（可含前导一元符号与右结合的 ** 链），返回结束下标（不含） */
function exprPowerChainEnd(toks, start) {
  let i = start;
  while (i < toks.length && toks[i].t === 'op' && (toks[i].v === '-' || toks[i].v === '+')) i++;
  if (i < toks.length && toks[i].t === 'func') {
    i = exprSkipGroup(toks, i + 1);
  } else if (i < toks.length && toks[i].t === 'paren' && toks[i].v === '(') {
    i = exprSkipGroup(toks, i);
  } else if (i < toks.length && (toks[i].t === 'num' || toks[i].t === 'var' || toks[i].t === 'const')) {
    i++;
  } else {
    return start; // 认不出来就不动，交给后面的编译阶段如实报错
  }
  while (i + 1 < toks.length && toks[i].t === 'op' && toks[i].v === '**') {
    const next = exprPowerChainEnd(toks, i + 1);
    if (next === i + 1) break;
    i = next;
  }
  return i;
}

/* JS 禁止一元负号紧贴 **（-x**2 抛 SyntaxError）。
   把「一元负号 + 其后含幂的运算对象」整体括起来：-x**2 → -(x**2)。
   不含幂的一元负号原样保留，避免给全站 285 个 plot 表达式平白加括号。 */
function exprGuardUnaryMinus(toks) {
  const out = toks.slice();
  for (let i = out.length - 1; i >= 0; i--) {
    const tk = out[i];
    if (tk.t !== 'op' || tk.v !== '-') continue;
    const prev = out[i - 1];
    const unary = !prev || prev.t === 'op' || (prev.t === 'paren' && prev.v === '(');
    if (!unary) continue;
    const end = exprPowerChainEnd(out, i + 1);
    if (end <= i + 1) continue;
    let hasPow = false;
    for (let k = i + 1; k < end; k++) {
      if (out[k].t === 'op' && out[k].v === '**') { hasPow = true; break; }
    }
    if (!hasPow) continue;
    out.splice(end, 0, { t: 'paren', v: ')' });
    out.splice(i + 1, 0, { t: 'paren', v: '(' });
  }
  return out;
}

let compiledCache = {};
function compileExpr(srcRaw, allowedVars) {
  const src = normalizeExpr(srcRaw);
  const key = src + '|' + allowedVars.join(',');
  if (compiledCache[key]) return compiledCache[key];

  const { toks, usedFuncs, usedConsts } = exprTokens(src, allowedVars);
  const safe = exprGuardUnaryMinus(toks);
  const code = safe.map((t) => t.v).join(' ');

  let pre = '"use strict";';
  /* 滑块若起名叫 pi / sin 之类，会与这里注入的 const 撞名导致 SyntaxError。
     撞名时以滑块为准（作者意图优先），跳过注入。 */
  usedFuncs.forEach((n) => {
    if (allowedVars.includes(n)) return;
    pre += 'const ' + n + '=' + EXPR_FUNCS[n] + ';';
  });
  usedConsts.forEach((n) => {
    if (allowedVars.includes(n)) return;
    pre += 'const ' + n + '=' + EXPR_CONSTS[n] + ';';
  });
  const body = pre + 'return (' + code + ');';
  /* eslint-disable-next-line no-new-func */
  const fn = new Function(...allowedVars, body);
  const compiled = (scope) => fn(...allowedVars.map((n) => scope[n]));
  compiledCache[key] = compiled;
  return compiled;
}

function showSpecError(host, msg) {
  const el = document.createElement('div');
  el.className = 'ml-quiz__bad';
  el.textContent = msg;
  host.appendChild(el);
}

/* 水合安全挂载：隐藏 React 拥有的 pre 容器，把组件插在其后（绝不 remove） */
function mountAfter(container, widget) {
  const parent = container.parentNode;
  if (!parent) return;
  container.style.display = 'none';
  parent.insertBefore(widget, container.nextSibling);
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function niceStep(span) {
  const raw = span / 8;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * mag;
}

function fmtNum(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/* ---------- 数轴 ---------- */

function renderNumberline(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const lo = spec.min != null ? spec.min : -10;
  const hi = spec.max != null ? spec.max : 10;
  const op = spec.op || '-';
  const H = 150;
  let r = null;
  let ctx = null;
  let W = 320;
  const geom = {};
  function X(v) {
    return geom.pad + ((v - lo) / (hi - lo)) * (W - geom.pad * 2);
  }
  function draw(state) {
    if (r) {
      ctx = r.ctx;
      W = r.W;
    }
    const tc = themeColors();
    const a = state.a != null ? state.a : spec.a || 0;
    const b = state.b != null ? state.b : spec.b || 0;
    const res = op === '+' ? a + b : a - b;
    ctx.clearRect(0, 0, W, H);
    if (lo < 0 && hi > 0) {
      ctx.fillStyle = 'rgba(255,182,193,0.35)';
      ctx.fillRect(X(lo), geom.midY - 26, X(Math.min(0, hi)) - X(lo), 52);
      ctx.fillStyle = 'rgba(152,230,180,0.28)';
      ctx.fillRect(X(0), geom.midY - 26, X(hi) - X(0), 52);
    }
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 5;
    line(ctx, geom.pad, geom.midY, W - geom.pad, geom.midY);
    const step = hi - lo <= 20 ? 1 : Math.ceil((hi - lo) / 20);
    ctx.fillStyle = tc.axis;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    for (let v = Math.ceil(lo); v <= hi; v += step) {
      ctx.fillRect(X(v) - 0.5, geom.midY - 12, 1, 24);
      ctx.fillText(String(v), X(v), geom.midY + 26);
    }
    const resClamped = Math.min(hi, Math.max(lo, res)); // 结果出轴端时裁到边缘
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 2.5;
    line(ctx, X(a), geom.midY - 22, X(resClamped), geom.midY - 22);
    const dir = res >= a ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(X(resClamped), geom.midY - 22);
    ctx.lineTo(X(resClamped) - dir * 8, geom.midY - 27);
    ctx.lineTo(X(resClamped) - dir * 8, geom.midY - 17);
    ctx.closePath();
    ctx.fillStyle = '#e8871e';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(X(resClamped), geom.midY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    if (res !== resClamped) {
      ctx.fillStyle = '#b3261e';
      ctx.font = '600 12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('结果 ' + res + ' 超出数轴 [' + lo + ', ' + hi + ']，已贴边显示', W - geom.pad, 18);
      ctx.textAlign = 'left';
    }
    [[a, '#3b74d6'], [b, '#e8871e']].forEach(([v, c]) => {
      ctx.beginPath();
      ctx.arc(X(v), geom.midY, 8, 0, Math.PI * 2);
      ctx.fillStyle = tc.bg;
      ctx.fill();
      ctx.strokeStyle = c;
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    ctx.fillStyle = tc.fg;
    ctx.font = '600 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(a + ' ' + op + ' ' + b + ' = ' + res, geom.pad, 18);
    geom.xa = X(a);
    geom.xb = X(b);
    geom.midY = geom.midY || H * 0.55;
  }
  const sl = buildSliders(
    {
      sliders: spec.sliders && spec.sliders.length
        ? spec.sliders
        : [
            { name: 'a', min: lo, max: hi, step: 1, value: spec.a != null ? spec.a : 0 },
            { name: 'b', min: lo, max: hi, step: 1, value: spec.b != null ? spec.b : 1 },
          ],
    },
    () => draw(sl.state),
  );
  const first = setupCanvas(wrap, H, () => draw(sl.state));
  r = first;
  ctx = r.ctx;
  W = r.W;
  r.redraw = () => draw(sl.state);
  r.canvas.classList.add('ml-drag');
  geom.pad = 24;
  geom.midY = H * 0.55;
  bindPointer(first.canvas, {
    pick(x, y) {
      if (!geom.xa || Math.abs(y - geom.midY) > 30) return null;
      const da = Math.abs(x - geom.xa);
      const db = Math.abs(x - geom.xb);
      if (Math.min(da, db) > 18) return null;
      return da <= db ? 'a' : 'b';
    },
    move(id, x) {
      const v = clamp(Math.round(lo + ((x - geom.pad) / (W - geom.pad * 2)) * (hi - lo)), lo, hi);
      sl.state[id] = v;
      sl.refs[id].range.value = String(v);
      sl.refs[id].val.textContent = String(v);
      draw(sl.state);
    },
  });
  draw(sl.state);
  return { slidersBox: sl.box };
}
/* ---------- 函数图像 ---------- */

function renderPlot(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const H = 260;
  const xmin = spec.xmin != null ? spec.xmin : -5;
  const xmax = spec.xmax != null ? spec.xmax : 5;
  const piAxis = spec.piAxis === true;

  const vars = ['x'].concat((spec.sliders || []).map((s) => s.name));
  let fn = null;
  try {
    fn = compileExpr(spec.expr, vars);
  } catch (e) {
    const err = document.createElement('div');
    err.className = 'ml-quiz__bad';
    err.textContent = '表达式有误：' + e.message;
    host.appendChild(err);
    return { slidersBox: document.createElement('div') };
  }
  let fn2 = null;
  if (spec.expr2) {
    try { fn2 = compileExpr(spec.expr2, vars); } catch (e2) { fn2 = null; }
  }

  let r = null;
  function draw(state) {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const padL = 34;
    const padR = 14;
    const padT = 14;
    const padB = 26;
    const N = 400;
    const xs = [];
    const ys = [];
    const ys2 = [];
    for (let k = 0; k <= N; k++) {
      const x = xmin + ((xmax - xmin) * k) / N;
      let y;
      try { y = fn(Object.assign({ x }, state)); } catch (e2) { y = NaN; }
      xs.push(x);
      ys.push(y);
      if (fn2) {
        let v;
        try { v = fn2(Object.assign({ x }, state)); } catch (e3) { v = NaN; }
        ys2.push(v);
      }
    }
    let allYs = ys.concat(fn2 ? ys2 : []);
    const finite = allYs.filter((v) => Number.isFinite(v));
    let ymin = finite.length ? Math.min(...finite) : -1;
    let ymax = finite.length ? Math.max(...finite) : 1;
    if (!Number.isFinite(ymin) || !Number.isFinite(ymax)) { ymin = -1; ymax = 1; }
    if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
    const spanPad = (ymax - ymin) * 0.12;
    ymin -= spanPad;
    ymax += spanPad;
    const X = (x) => padL + ((x - xmin) / (xmax - xmin)) * (W - padL - padR);
    const Y = (y) => padT + (1 - (y - ymin) / (ymax - ymin)) * (H - padT - padB);

    ctx.fillStyle = tc.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = tc.grid;
    ctx.lineWidth = 1;
    const xTicks = [];
    if (piAxis) {
      const step = Math.PI / 2;
      for (let k = Math.ceil(xmin / step); k * step <= xmax + 1e-9; k++) xTicks.push(k * step);
    } else {
      const gx = niceStep(xmax - xmin);
      for (let v = Math.ceil(xmin / gx) * gx; v <= xmax; v += gx) xTicks.push(v);
    }
    for (const v of xTicks) line(ctx, X(v), padT, X(v), H - padB);
    const gy = niceStep(ymax - ymin);
    for (let v = Math.ceil(ymin / gy) * gy; v <= ymax; v += gy) line(ctx, padL, Y(v), W - padR, Y(v));

    ctx.strokeStyle = tc.axis;
    if (ymin < 0 && ymax > 0) line(ctx, padL, Y(0), W - padR, Y(0));
    if (xmin < 0 && xmax > 0) line(ctx, X(0), padT, X(0), H - padB);

    /* y=x 参考线（镜像课用：函数与其逆关于这条线对称） */
    if (spec.refline === 'y=x' || spec.refline === true) {
      ctx.strokeStyle = 'rgba(124,58,237,0.55)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      line(ctx, X(Math.max(xmin, ymin)), Y(Math.max(xmin, ymin)), X(Math.min(xmax, ymax)), Y(Math.min(xmax, ymax)));
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = spec.color || '#3b74d6';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= N; k++) {
      if (!Number.isFinite(ys[k]) || Math.abs(ys[k]) > 1e6) { pen = false; continue; }
      const px = X(xs[k]);
      const py = Y(Math.max(Math.min(ys[k], ymax + 5), ymin - 5));
      if (!pen) { ctx.moveTo(px, py); pen = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    if (fn2) {
      ctx.strokeStyle = spec.color2 || '#e8871e';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      pen = false;
      for (let k = 0; k <= N; k++) {
        if (!Number.isFinite(ys2[k]) || Math.abs(ys2[k]) > 1e6) { pen = false; continue; }
        const px = X(xs[k]);
        const py = Y(Math.max(Math.min(ys2[k], ymax + 5), ymin - 5));
        if (!pen) { ctx.moveTo(px, py); pen = true; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    /* 散点/标记层：spec.points 为 [x, y] 数组，落在窗口内的画成橙点（靶点、采样点、对抗样本等） */
    if (Array.isArray(spec.points) && spec.points.length) {
      ctx.fillStyle = spec.pointsColor || '#e8871e';
      spec.points.forEach((pt) => {
        if (!Array.isArray(pt) || pt.length < 2) return;
        const x = Number(pt[0]);
        const y = Number(pt[1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (x < xmin || x > xmax || y < ymin || y > ymax) return;
        ctx.beginPath();
        ctx.arc(X(x), Y(y), 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = tc.bg;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    ctx.fillStyle = tc.fg;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    const fmtPi = (v) => {
      const k = Math.round(v / (Math.PI / 2));
      if (k === 0) return '0';
      const sign = k < 0 ? '-' : '';
      const n = Math.abs(k);
      return n % 2 === 0 ? `${sign}${n / 2}π` : `${sign}${n}π/2`;
    };
    for (const v of xTicks) {
      ctx.fillText(piAxis ? fmtPi(v) : fmtNum(v), X(v), H - padB + 14);
    }
    ctx.textAlign = 'right';
    for (let v = Math.ceil(ymin / gy) * gy; v <= ymax; v += gy) {
      ctx.fillText(fmtNum(v), padL - 5, Y(v) + 4);
    }
    if (spec.label || fn2) {
      ctx.font = '600 12px system-ui';
      ctx.textAlign = 'right';
      let ly = padT + 12;
      ctx.fillStyle = spec.color || '#3b74d6';
      ctx.fillText(spec.label || 'y', W - padR - 6, ly);
      if (fn2) {
        ly += 17;
        ctx.fillStyle = spec.color2 || '#e8871e';
        ctx.fillText(spec.label2 || 'y\u2082', W - padR - 6, ly);
      }
    }
  }

  const sl = buildSliders(spec, () => draw(sl.state));
  r = setupCanvas(wrap, H);
  r.redraw = () => draw(sl.state);
  draw(sl.state);
  return { slidersBox: sl.box };
}

/* 增长赛跑：固定四条曲线同尺度对照，并用可键盘操作的探针读出关键点 */
function renderCurverace(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);

  const caption = document.createElement('div');
  caption.className = 'ml-viz__caption';
  host.appendChild(caption);

  const H = 310;
  const series = [
    { name: 'log2(x)', color: '#7c3aed', value(x) { return x <= 0 ? NaN : Math.log(x) / Math.LN2; } },
    { name: 'sqrt(x)', color: '#0f8a5f', value(x) { return x < 0 ? NaN : Math.sqrt(x); } },
    { name: 'x^2', color: '#e8871e', value(x) { return x * x; } },
    { name: '2^x', color: '#3b74d6', value(x) { return 2 ** x; } },
  ];
  const st = {
    range: clamp(spec.range != null ? spec.range : 6, 3, 12),
    probe: clamp(spec.probe != null ? spec.probe : 4, 0, 12),
  };

  function draw() {
    const r = canvasHolder;
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const padL = 42;
    const padR = 16;
    const padT = 16;
    const padB = 30;
    const xmin = 0;
    const xmax = st.range;
    const ymax = 2 ** xmax;
    const X = (x) => padL + ((x - xmin) / (xmax - xmin)) * (W - padL - padR);
    const Y = (y) => padT + (1 - y / ymax) * (H - padT - padB);

    ctx.fillStyle = tc.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = tc.grid;
    ctx.lineWidth = 1;
    const gx = niceStep(xmax);
    for (let v = 0; v <= xmax + 1e-9; v += gx) line(ctx, X(v), padT, X(v), H - padB);
    const gy = niceStep(ymax);
    for (let v = 0; v <= ymax + 1e-9; v += gy) line(ctx, padL, Y(v), W - padR, Y(v));

    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.4;
    line(ctx, padL, padT, padL, H - padB);
    line(ctx, padL, H - padB, W - padR, H - padB);

    ctx.font = '11px monospace';
    ctx.fillStyle = tc.fg;
    ctx.textAlign = 'center';
    for (let v = 0; v <= xmax + 1e-9; v += gx) ctx.fillText(fmtNum(v), X(v), H - padB + 17);
    ctx.textAlign = 'right';
    for (let v = 0; v <= ymax + 1e-9; v += gy) ctx.fillText(fmtNum(v), padL - 5, Y(v) + 4);

    const N = 500;
    series.forEach((item) => {
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.name === '2^x' ? 2.5 : 2.1;
      ctx.beginPath();
      let pen = false;
      for (let k = 0; k <= N; k++) {
        const x = xmin + ((xmax - xmin) * k) / N;
        const y = item.value(x);
        if (!Number.isFinite(y)) {
          pen = false;
          continue;
        }
        if (!pen) {
          ctx.moveTo(X(x), Y(y));
          pen = true;
        } else ctx.lineTo(X(x), Y(y));
      }
      ctx.stroke();
    });

    [2, 4].filter((x) => x <= xmax).forEach((x) => {
      ctx.fillStyle = '#b3261e';
      ctx.beginPath();
      ctx.arc(X(x), Y(x * x), 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const px = clamp(st.probe, xmin, xmax);
    ctx.strokeStyle = tc.fg;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    line(ctx, X(px), padT, X(px), H - padB);
    ctx.setLineDash([]);

    let legendX = padL + 8;
    ctx.textAlign = 'left';
    ctx.font = '600 11px system-ui';
    series.forEach((item) => {
      ctx.fillStyle = item.color;
      ctx.fillText(item.name, legendX, padT + 13);
      legendX += ctx.measureText(item.name).width + 14;
    });

    const readings = series.map((item) => `${item.name}=${fmtNum(item.value(px))}`);
    /* NaN 安全的领先者判定：探针落在定义域外（如 log2(0)=NaN）时不得抢占比较 */
    const val = (item) => {
      const v = item.value(px);
      return Number.isFinite(v) ? v : -Infinity;
    };
    const leader = series.reduce((best, item) => (val(item) > val(best) ? item : best));
    caption.textContent = `探针 x=${fmtNum(px)}：${readings.join('，')}；当前领先 ${leader.name}`;
  }

  const sl = buildSliders({
    sliders: [
      { name: '范围', min: 3, max: 12, step: 0.5, value: st.range },
      { name: '探针', min: 0, max: 12, step: 0.1, value: st.probe },
    ],
  }, (state) => {
    st.range = state['范围'];
    st.probe = clamp(state['探针'], 0, st.range);
    sl.refs['探针'].val.textContent = String(st.probe);
    draw();
  });

  const canvasHolder = setupCanvas(wrap, H);
  canvasHolder.redraw = draw;
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 正弦叠加 ---------- */

export function drawSinesFrame(ctx, W, H, t, terms, rawAmp) {
  ctx.clearRect(0, 0, W, H);
  const midY = H * 0.58;
  const scale = H * 0.3;
  const pxStep = 4;
  const cols = Math.ceil(W / pxStep);
  /* rawAmp=true：各谐波等幅（不除以 k），供“高频振幅不消失”类演示 */
  const ampOf = (k) => (rawAmp ? 1 : 1 / k);

  terms.forEach((k, idx) => {
    ctx.strokeStyle = `rgba(110,130,255,${0.08 + idx * 0.05})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const px = c * pxStep;
      const phase = (px / W) * Math.PI * 4 - t * (0.6 + idx * 0.25);
      const y = midY - Math.sin(k * phase) * ampOf(k) * scale;
      if (c === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(76,125,255,0.85)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) {
    const px = c * pxStep;
    const phase = (px / W) * Math.PI * 4 - t * 0.6;
    const acc = terms.reduce((s, kk) => s + Math.sin(kk * phase) * ampOf(kk), 0);
    const py = midY - acc * scale;
    if (c === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function renderSines(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const H = 220;
  const rawAmp = spec.rawAmplitude === true;
  let terms = spec.terms && spec.terms.length ? spec.terms : [1, 3, 5];
  let t = 0;
  let raf = null;
  let r = null;
  let visible = true; // 离屏暂停标记
  let paused = false; // 用户手动暂停
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame() {
    if (!r || !wrap.isConnected || !visible || paused) { raf = null; return; }
    drawSinesFrame(r.ctx, r.W, H, t, terms, rawAmp);
    t += 0.035;
    raf = requestAnimationFrame(frame);
  }
  function restartFromZero() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
    t = 0;
    if (!r || reduced || !visible) {
      if (r) drawSinesFrame(r.ctx, r.W, H, 0, terms, rawAmp);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  r = setupCanvas(wrap, H);
  r.redraw = restartFromZero;
  restartFromZero();
  onScreen(wrap, (vis) => {
    visible = vis;
    if (!vis) {
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
    } else if (raf == null && !reduced && !paused && r && wrap.isConnected) {
      raf = requestAnimationFrame(frame);
    }
  });

  /* 暂停/播放按钮：观察波形细节时手动定格 */
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const pauseBtn = mkBtn('暂停');
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? '播放' : '暂停';
    if (paused) {
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
    } else if (raf == null && !reduced && visible && r && wrap.isConnected) {
      raf = requestAnimationFrame(frame);
    }
  });
  controls.appendChild(pauseBtn);

  if (rawAmp) {
    /* 等幅模式：terms 由 spec 完全指定，不给 harmonics 滑杆（避免把 [21] 这类高频配置重置回低频） */
    return { slidersBox: controls };
  }
  const sl = buildSliders(
    { sliders: [{ name: 'harmonics', min: 1, max: 9, step: 2, value: terms.length }] },
    (state) => {
      const n = Math.max(1, Math.round(state.harmonics));
      terms = [];
      for (let k = 1; k <= 2 * n - 1; k += 2) terms.push(k);
      restartFromZero();
    },
  );
  sl.box.appendChild(pauseBtn); // 移动进既有滑杆容器，样式保持一致
  return { slidersBox: sl.box };
}

/* ---------- 入口 ---------- */


/* ---------- 回形针式动手组件 ---------- */

function renderDistributive(host, spec) {
  const minA = Math.max(1, spec.minA || 1);
  const maxA = Math.max(minA + 1, spec.maxA || 12);
  const initial = {
    a: clamp(Math.max(1, spec.a || 7), minA, maxA),
    b: Math.max(1, spec.b || 10),
    c: Math.max(1, spec.c || 3),
  };
  const st = {
    ...initial,
    rotated: false,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const tools = document.createElement('div');
  tools.className = 'ml-viz__controls';
  host.appendChild(tools);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 280;
  const y0 = H - 44;
  let r = null;
  const geo = {};
  const btnRefs = {};
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const total = st.b + st.c;
    const displayW = st.rotated ? st.a : total;
    const displayH = st.rotated ? total : st.a;
    const s = Math.min((W - 64) / displayW, (H - 104) / displayH);
    const x0 = (W - displayW * s) / 2;
    geo.x0 = x0;

    if (!st.rotated) {
      geo.s = s;
      geo.total = total;
      geo.dx = x0 + st.b * s;
      geo.topY = y0 - st.a * s;
      geo.splitY = null;
      ctx.fillStyle = 'rgba(59,116,214,0.46)';
      ctx.fillRect(x0, geo.topY, st.b * s, st.a * s);
      ctx.fillStyle = 'rgba(232,135,30,0.38)';
      ctx.fillRect(geo.dx, geo.topY, st.c * s, st.a * s);
    } else {
      geo.s = s;
      geo.total = total;
      geo.topY = y0 - total * s;
      geo.splitY = geo.topY + st.b * s;
      geo.dx = x0 + st.a * s;
      ctx.fillStyle = 'rgba(59,116,214,0.46)';
      ctx.fillRect(x0, geo.topY, st.a * s, st.b * s);
      ctx.fillStyle = 'rgba(232,135,30,0.38)';
      ctx.fillRect(x0, geo.splitY, st.a * s, st.c * s);
    }

    /* 点阵让“乘法是数个数”回到面积模型前面 */
    if (s >= 11) {
      ctx.fillStyle = isDarkMode() ? 'rgba(255,255,255,0.58)' : 'rgba(28,32,40,0.34)';
      for (let row = 0; row < displayH; row += 1) {
        for (let col = 0; col < displayW; col += 1) {
          ctx.beginPath();
          ctx.arc(x0 + (col + 0.5) * s, y0 - (row + 0.5) * s, Math.min(2.2, s * 0.11), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.strokeStyle = tc.fg;
    ctx.lineWidth = 1.2;

    if (!st.rotated) {
      ctx.strokeRect(x0, geo.topY, st.b * s, st.a * s);
      ctx.strokeRect(geo.dx, geo.topY, st.c * s, st.a * s);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#e88730';
      line(ctx, x0, geo.topY, x0, y0);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#7c3aed';
      line(ctx, geo.dx, geo.topY - 8, geo.dx, y0);
      ctx.setLineDash([]);
      geo.orange = { x: x0, y: y0 - st.a * s / 2, axis: 'y' };
      geo.purple = { x: geo.dx, y: y0 - st.a * s / 2, axis: 'x' };
    } else {
      ctx.strokeRect(x0, geo.topY, st.a * s, st.b * s);
      ctx.strokeRect(x0, geo.splitY, st.a * s, st.c * s);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#e88730';
      line(ctx, x0, y0, geo.dx, y0);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#7c3aed';
      line(ctx, x0 - 8, geo.splitY, geo.dx, geo.splitY);
      ctx.setLineDash([]);
      geo.orange = { x: x0 + st.a * s / 2, y: y0, axis: 'x' };
      geo.purple = { x: x0, y: geo.splitY, axis: 'y' };
    }

    [geo.orange, geo.purple].forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? '#e88730' : '#7c3aed';
      ctx.fill();
      ctx.strokeStyle = tc.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = tc.bg;
      ctx.font = '700 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(point.axis === 'x' ? '\u2194' : '\u2195', point.x, point.y + 3);
    });

    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'center';
    if (!st.rotated) {
      ctx.fillText(st.a + '\u00d7' + st.b, x0 + st.b * s / 2, y0 - st.a * s / 2 + 5);
      ctx.fillText(st.a + '\u00d7' + st.c, geo.dx + st.c * s / 2, y0 - st.a * s / 2 + 5);
    } else {
      ctx.fillText(st.b + '\u00d7' + st.a, x0 + st.a * s / 2, geo.topY + st.b * s / 2 + 5);
      ctx.fillText(st.c + '\u00d7' + st.a, x0 + st.a * s / 2, geo.splitY + st.c * s / 2 + 5);
    }
    ctx.textAlign = 'left';
    if (!st.rotated) {
      ctx.fillText(
        st.a + '\u00d7(' + st.b + '+' + st.c + ')=' + (st.a * st.b) + '+' + (st.a * st.c) +
          '=' + st.a * total,
        16,
        24,
      );
      ctx.font = '12px system-ui';
      ctx.fillText('\u9ad8\u5ea6 a=' + st.a + '\uff0c\u5207\u70b9 b=' + st.b, 16, 42);
      cap.textContent =
        '\u5728\u77e9\u5f62\u5185\u62d6\u52a8\uff1a\u6a2a\u79fb\u6539\u5207\u70b9\uff0c\u7eb5\u79fb\u6539\u9ad8\u5ea6\u3002\u5de6\u5757 ' +
        st.a + '\u00d7' + st.b + '=' + st.a * st.b +
        '\uff0c\u53f3\u5757 ' + st.a + '\u00d7' + st.c + '=' + st.a * st.c;
    } else {
      ctx.fillText(
        '(' + st.b + '+' + st.c + ')\u00d7' + st.a + '=' + (st.b * st.a) + '+' + (st.c * st.a) +
          '=' + total * st.a,
        16,
        24,
      );
      ctx.font = '12px system-ui';
      ctx.fillText('\u5bbd\u5ea6 a=' + st.a + '\uff0c\u4e0a\u6bb5 b=' + st.b, 16, 42);
      cap.textContent =
        '\u540c\u4e00\u70b9\u9635\u65cb\u8f6c\u540e\uff1a\u4e0a\u5757 ' + st.b + '\u00d7' + st.a + '=' + st.a * st.b +
        '\uff0c\u4e0b\u5757 ' + st.c + '\u00d7' + st.a + '=' + st.a * st.c +
        '\uff0c\u603b\u9762\u79ef\u4ecd\u662f ' + total * st.a;
    }
    btnRefs['a-'].textContent = (st.rotated ? '\u5bbd\u5ea6 a \u2212' : '\u9ad8\u5ea6 a \u2212');
    btnRefs['a+'].textContent = (st.rotated ? '\u5bbd\u5ea6 a +' : '\u9ad8\u5ea6 a +');
    btnRefs['b-'].textContent = (st.rotated ? '\u4e0a\u6bb5 b \u2212' : '\u5de6\u5757 b \u2212');
    btnRefs['b+'].textContent = (st.rotated ? '\u4e0a\u6bb5 b +' : '\u5de6\u5757 b +');
    btnRefs.rotate.textContent = st.rotated ? '\u8fd8\u539f\u6a2a\u5411' : '\u65cb\u8f6c\u7ad6\u5411';
    r.canvas.setAttribute('role', 'img');
    r.canvas.setAttribute('aria-label', cap.textContent);
  }
  function setHeight(value) {
    const na = clamp(Math.round(value), minA, maxA);
    if (na !== st.a) { st.a = na; draw(); }
  }
  function setCut(value) {
    const total = st.b + st.c;
    const nb = clamp(Math.round(value), 1, total - 1);
    if (nb !== st.b) { st.b = nb; st.c = total - nb; draw(); }
  }
  [
    ['a-', () => setHeight(st.a - 1)],
    ['a+', () => setHeight(st.a + 1)],
    ['b-', () => setCut(st.b - 1)],
    ['b+', () => setCut(st.b + 1)],
    ['rotate', () => {
      st.rotated = !st.rotated;
      draw();
    }],
    ['\u91cd\u7f6e', () => {
      st.a = initial.a;
      st.b = initial.b;
      st.c = initial.c;
      st.rotated = false;
      draw();
    }],
  ].forEach(([key, onClick]) => {
    const btn = mkBtn(key);
    btn.addEventListener('click', onClick);
    tools.appendChild(btn);
    if (key !== '\u91cd\u7f6e') btnRefs[key] = btn;
  });
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.orange || !geo.purple) return null;
      if (Math.hypot(x - geo.orange.x, y - geo.orange.y) <= 15) return 'size';
      if (Math.hypot(x - geo.purple.x, y - geo.purple.y) <= 15) return 'cut';
      const right = geo.x0 + (st.rotated ? st.a : st.b + st.c) * geo.s;
      const bottom = st.rotated ? geo.topY + (st.b + st.c) * geo.s : y0;
      if (x >= geo.x0 && x <= right && y >= geo.topY && y <= bottom) return 'area';
      return null;
    },
    move(id, x, y) {
      if (id === 'size') {
        if (st.rotated) setHeight((x - geo.x0) / geo.s);
        else setHeight((y0 - y) / geo.s);
        return;
      }
      if (id === 'cut') {
        if (st.rotated) setCut((y - geo.topY) / geo.s);
        else setCut((x - geo.x0) / geo.s);
        return;
      }
      if (id === 'area') {
        if (st.rotated) {
          setHeight((x - geo.x0) / geo.s);
          setCut((y - geo.topY) / geo.s);
        } else {
          setHeight((y0 - y) / geo.s);
          setCut((x - geo.x0) / geo.s);
        }
      }
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

function renderDivisionshare(host, spec) {
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const arena = document.createElement('div');
  host.appendChild(arena);
  const verdict = document.createElement('div');
  verdict.className = 'ml-viz__caption';
  host.appendChild(verdict);

  const st = { N: spec.total || 23, P: spec.people || 4, idx: 0, counts: [], timer: null };

  function renderArena(finalMsg) {
    arena.innerHTML = '';
    for (let i = 0; i < st.P; i++) {
      const row = document.createElement('div');
      row.className = 'ml-share-row';
      const dots = document.createElement('span');
      dots.className = 'ml-share-dot';
      dots.textContent = '\u25cf'.repeat(st.counts[i]);
      const lab = document.createElement('span');
      lab.textContent = '\u7b2c' + (i + 1) + '\u4eba\uff1a' + st.counts[i];
      row.append(lab, dots);
      arena.appendChild(row);
    }
    verdict.textContent = finalMsg || ('\u5df2\u53d1\u51fa ' + st.idx + ' / ' + st.N);
  }

  function dealAllInstant() {
    st.counts = Array(st.P).fill(0);
    for (let k = 0; k < st.N; k++) st.counts[k % st.P]++;
    st.idx = st.N;
    const q = Math.floor(st.N / st.P);
    const r = st.N % st.P;
    renderArena(st.N + ' = ' + st.P + '\u00d7' + q + ' + ' + r +
      ' \uff08\u6bcf\u4eba ' + q + ' \u9897\uff0c\u5269 ' + r + ' \u9897\uff09');
  }

  function restart() {
    if (st.timer) { clearInterval(st.timer); st.timer = null; }
    st.counts = Array(st.P).fill(0);
    st.idx = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { dealAllInstant(); return; }
    renderArena('\u53d1\u7cd6\u4e2d\u2026\u2026');
    st.timer = setInterval(() => {
      if (!host.isConnected) { clearInterval(st.timer); st.timer = null; return; }
      if (st.idx >= st.N) {
        clearInterval(st.timer); st.timer = null;
        dealAllInstant();
        return;
      }
      st.counts[st.idx % st.P]++;
      st.idx++;
      renderArena();
    }, 110);
  }

  const rows = [
    ['N', '\u7cd6\u679c\u603b\u6570', 1, 48, st.N],
    ['P', '\u5206\u7ed9\u51e0\u4e2a\u4eba', 2, 8, st.P],
  ];
  rows.forEach(([name, label, min, max, val]) => {
    const row = document.createElement('div');
    row.className = 'ml-slider';
    const lab = document.createElement('label');
    lab.textContent = label + ' =';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(min); range.max = String(max); range.step = '1';
    range.value = String(val);
    range.addEventListener('input', () => {
      if (name === 'N') st.N = parseInt(range.value, 10);
      else st.P = parseInt(range.value, 10);
      restart();
    });
    row.append(lab, range);
    box.appendChild(row);
  });
  const btn = mkBtn('\u91cd\u65b0\u53d1\u7cd6');
  btn.addEventListener('click', restart);
  box.appendChild(btn);
  restart();
  return { slidersBox: box };
}

function renderFraction(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const H = 210;
  const st = {
    num: (spec.value && spec.value[0]) != null ? spec.value[0] : 3,
    den: (spec.value && spec.value[1]) || 4,
  };
  let r = null, ctx = null, W = 340;
  const slBox = document.createElement('div');
  slBox.className = 'ml-viz__sliders is-visible';
  const refs = {};

  /* 滑杆只建一次：input 时原地更新数值与联动范围，避免销毁正在拖动的元素导致断触 */
  function makeRow(name, label, min, max) {
    const row = document.createElement('div');
    row.className = 'ml-slider';
    const lab = document.createElement('label');
    lab.textContent = label + ' =';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(min);
    range.max = String(max);
    range.step = '1';
    range.value = String(st[name]);
    const span = document.createElement('span');
    span.className = 'ml-slider__val';
    span.textContent = String(st[name]);
    range.addEventListener('input', () => {
      let v = parseInt(range.value, 10);
      if (name === 'den') {
        st.den = clamp(v, 2, 12);
        st.num = Math.min(st.num, st.den);
        refs.num.range.max = String(st.den);
      } else {
        st.num = clamp(v, 0, st.den);
      }
      refs.num.range.value = String(st.num);
      refs.num.span.textContent = String(st.num);
      refs.den.range.value = String(st.den);
      refs.den.span.textContent = String(st.den);
      draw();
    });
    row.append(lab, range, span);
    refs[name] = { range, span };
    slBox.appendChild(row);
  }
  makeRow('num', '\u5206\u5b50', 0, st.den);
  makeRow('den', '\u5206\u6bcd', 2, 12);

  function draw() {
    if (!r) return;
    ctx = r.ctx;
    W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.24;
    const cy = H * 0.52;
    const R = 72;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = softFill();
    ctx.fill();
    const frac = st.num / st.den;
    if (frac > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(59,116,214,0.75)';
      ctx.fill();
    }
    if (st.den <= 12 && st.num > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      for (let k = 1; k < st.den; k++) {
        const ang = -Math.PI / 2 + (k / st.den) * Math.PI * 2;
        line(ctx, cx, cy, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
      }
    }
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    {
      /* 把手常驻：num=0 时停在正上方并以灰色示「零份」（修复：此前把手直接消失） */
      const ang = -Math.PI / 2 + frac * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 7, 0, Math.PI * 2);
      ctx.fillStyle = st.num === 0 ? softFill() : '#2c5fc4';
      ctx.fill();
      ctx.strokeStyle = st.num === 0 ? tc.axis : tc.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const tx = Math.min(W * 0.52, W - 130);
    ctx.textAlign = 'left';
    ctx.fillStyle = tc.fg;
    ctx.font = '700 26px system-ui';
    ctx.fillText(st.num + ' / ' + st.den, tx, 58);
    const g = gcd2(st.num, st.den || 1);
    if (g > 1 && st.den > g) {
      ctx.font = '13px system-ui';
      ctx.fillStyle = tc.axis;
      ctx.fillText('\u53ef\u7ea6\u5206\uff1a' + st.num / g + ' / ' + st.den / g, tx, 84);
    }
    ctx.font = '14px monospace';
    ctx.fillText('= ' + (st.num / (st.den || 1)).toFixed(3), tx, 114);
    ctx.fillText('= ' + ((100 * st.num) / (st.den || 1)).toFixed(1) + '%', tx, 138);
    ctx.font = '13px system-ui';
    ctx.fillStyle = tc.fg;
    if (st.num === 0) ctx.fillText('\u96f6\u4e2a\u5207\u7247\uff1a\u4ec0\u4e48\u90fd\u6ca1\u6709', tx, 166);
    else if (st.num === st.den) ctx.fillText('\u5168\u90e8\u5207\u7247\uff1a\u6070\u597d\u4e00\u4e2a\u6574\u4f53', tx, 166);
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      const d = Math.hypot(x - W * 0.24, y - H * 0.52);
      return d > 56 && d < 88 ? 'rim' : null;
    },
    move(id, x, y) {
      let ang = Math.atan2(y - H * 0.52, x - W * 0.24) + Math.PI / 2;
      if (ang < 0) ang += Math.PI * 2;
      st.num = clamp(Math.round((ang / (Math.PI * 2)) * st.den), 0, st.den);
      refs.num.range.value = String(st.num);
      refs.num.span.textContent = String(st.num);
      draw();
    },
  });
  draw();
  return { slidersBox: slBox };
}

function renderFit(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const H = 300;
  const padL = 36, padB = 28, padT = 30;
  const DOM = 10;
  let pts = [];
  function shuffle() {
    const n = spec.n || 6;
    pts = [];
    for (let k = 0; k < n; k++) {
      pts.push({
        x: Math.round((1 + Math.random() * 8) * 10) / 10,
        y: Math.round((1 + Math.random() * 8) * 10) / 10,
      });
    }
  }
  shuffle();

  let r = null;
  const plotW = () => (r ? r.W : 320) - padL - 16;
  const X = (v) => padL + (v / DOM) * plotW();
  const Y = (v) => H - padB - (v / DOM) * (H - padT - padB);

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = tc.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(107,114,128,0.18)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= DOM; g++) {
      line(ctx, X(g), padT, X(g), H - padB);
      line(ctx, padL, Y(g), W - 16, Y(g));
    }
    ctx.strokeStyle = 'rgba(107,114,128,0.6)';
    line(ctx, padL, Y(0), W - 16, Y(0));
    line(ctx, X(0), padT, X(0), H - padB);

    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach((p) => { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
    const n = pts.length || 1;
    const den = n * sxx - sx * sx;
    let m = 0, b = 0;
    if (Math.abs(den) > 1e-9) {
      m = (n * sxy - sx * sy) / den;
      b = (sy - m * sx) / n;
    }
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.2;
    line(ctx, X(0), Y(m * 0 + b), X(DOM), Y(m * DOM + b));

    ctx.strokeStyle = 'rgba(179,38,30,0.45)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    pts.forEach((p) => {
      const yhat = m * p.x + b;
      line(ctx, X(p.x), Y(p.y), X(p.x), Y(yhat));
    });
    ctx.setLineDash([]);

    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), 7, 0, Math.PI * 2);
      ctx.fillStyle = '#3b74d6';
      ctx.fill();
      ctx.strokeStyle = tc.bg;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    let sse = 0;
    pts.forEach((p) => { const e = p.y - (m * p.x + b); sse += e * e; });
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      'y = ' + m.toFixed(2) + '\u00b7x ' + (b >= 0 ? '+ ' : '\u2212 ') + Math.abs(b).toFixed(2),
      padL + 6,
      20,
    );
    ctx.fillStyle = sse / n < 0.35 ? '#2e7d32' : '#b3261e';
    ctx.fillText('\u5e73\u5747\u8bef\u5dee ' + (sse / n).toFixed(2), padL + 6, 40);
    ctx.fillStyle = 'rgba(107,114,128,0.9)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('拖动=改位置 · 双击/右键=删点', W - 20, H - 8);
  }

  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const btn = mkBtn('\u6253\u4e71\u91cd\u6446');
  btn.addEventListener('click', () => { shuffle(); draw(); });
  controls.appendChild(btn);

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;

  function nearestPoint(x, y) {
    let best = null, bd = 15;
    pts.forEach((p, i) => {
      const d = Math.hypot(x - X(p.x), y - Y(p.y));
      if (d <= bd) { bd = d; best = i; }
    });
    return best;
  }
  const toLogical = (ev) => {
    const rect = r.canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (r.canvas._W / rect.width),
      y: (ev.clientY - rect.top) * (r.canvas._H / rect.height),
    };
  };
  function removePointAt(x, y) {
    if (pts.length <= 2) return; // 至少留 2 个点才谈得上拟合
    const id = nearestPoint(x, y);
    if (id === null) return;
    pts.splice(id, 1);
    draw();
  }
  r.canvas.addEventListener('dblclick', (ev) => { const p = toLogical(ev); removePointAt(p.x, p.y); });
  r.canvas.addEventListener('contextmenu', (ev) => { ev.preventDefault(); const p = toLogical(ev); removePointAt(p.x, p.y); });

  bindPointer(r.canvas, {
    pick(x, y) {
      return nearestPoint(x, y);
    },
    move(id, x, y) {
      pts[id] = {
        x: clamp(Math.round(((x - padL) / ((r.W - padL - 16) / DOM)) * 10) / 10, 0, DOM),
        y: clamp(Math.round(((H - padB - y) / ((H - padT - padB) / DOM)) * 10) / 10, 0, DOM),
      };
      draw();
    },
  });

  draw();
  return { slidersBox: controls };
}

function renderBalance(host, spec) {
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const eq = document.createElement('div');
  eq.className = 'ml-viz__eq';
  host.appendChild(eq);
  const logBox = document.createElement('div');
  logBox.className = 'ml-eqlog';
  host.appendChild(logBox);

  const init = { xs: Math.max(1, spec.xs || 3), num: spec.num == null ? 3 : spec.num };
  let xs = init.xs;
  let num = init.num;
  let right = init.xs * 3 + init.num;
  let steps = 0;

  const fmtLeft = () =>
    (xs ? xs + 'x' : '') + (num ? (xs ? ' + ' : '') + num : '') || '0';
  function refresh(msg) {
    eq.textContent = fmtLeft() + ' = ' + right + (msg ? '   ' + msg : '');
    const done = xs === 1 && num === 0;
    if (done) {
      eq.innerHTML =
        '<strong>x = ' + right + '</strong>' +
        ' <span class="ml-chip-ok">\u5e73\u8861\uff01\u89e3\u51fa\u6765\u4e86</span>';
    }
  }
  function op(desc, fn) {
    const note = fn();
    if (note && note.changed === false) {
      refresh(note.message || '');
      return;
    }
    steps++;
    const done = xs === 1 && num === 0;
    const li = document.createElement('div');
    li.textContent = '\u7b2c' + steps + '\u6b65\uff1a' + desc +
      ' \u2192 ' + fmtLeft() + ' = ' + right;
    logBox.appendChild(li);
    logBox.scrollTop = logBox.scrollHeight;
    refresh(done ? '\u89e3\u51fa\u6765\u4e86\uff01' : typeof note === 'string' ? note : '');
  }
  [
    ['\u4e24\u8fb9 \u2212 1', () => { num -= 1; right -= 1; }],
    ['\u4e24\u8fb9 + 1', () => { num += 1; right += 1; }],
    ['\u4e24\u8fb9 \u00f7 x \u7cfb\u6570', () => {
      if (xs === 1) {
        return {
          changed: false,
          message: 'x \u7684\u7cfb\u6570\u5df2\u7ecf\u662f 1\uff0c\u4e0d\u9700\u8981\u518d\u9664',
        };
      }
      const divisible = (v) => ((v % xs) + xs) % xs === 0;
      if (xs > 1 && divisible(num) && divisible(right)) {
        num /= xs;
        right /= xs;
        xs = 1;
        return { changed: true };
      }
      return {
        changed: false,
        message: '\u73b0\u5728\u9664\u4e0d\u5c3d\u2014\u2014\u5148\u7528 \u00b11 \u628a\u5e38\u6570\u9879\u51d1\u6210\u7cfb\u6570\u7684\u500d\u6570\u518d\u8bd5',
      };
    }],
  ].forEach(([label, fn]) => {
    const b = mkBtn(label);
    b.addEventListener('click', () => op(label, fn));
    box.appendChild(b);
  });
  const resetBtn = mkBtn('\u91cd\u65b0\u5f00\u59cb');
  resetBtn.addEventListener('click', () => {
    xs = init.xs;
    num = init.num;
    right = init.xs * 3 + init.num;
    steps = 0;
    logBox.textContent = '';
    refresh('\u5df2\u56de\u5230\u521d\u59cb\u65b9\u7a0b');
  });
  box.appendChild(resetBtn);
  refresh('');
  return { slidersBox: document.createElement('div') };
}

/* ---------- 几何：拖顶点三角形 ---------- */

function renderTriangle(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 320;
  const initPts = Array.isArray(spec.points) && spec.points.length === 3
    ? spec.points
    : [[0.18, 0.78], [0.85, 0.72], [0.45, 0.14]];
  const st = {
    pts: initPts.map((p) => ({ x: p[0], y: p[1] })),
    selected: 0,
  };
  let r = null;
  const geo = {};
  function angleAt(p, q1, q2) {
    const a1 = Math.atan2(q1.y - p.y, q1.x - p.x);
    const a2 = Math.atan2(q2.y - p.y, q2.x - p.x);
    let d = Math.abs(a1 - a2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const padX = 40;
    const padT = 44;
    const padB = 16;
    const tc = themeColors();
    const P = st.pts.map((p) => ({
      x: padX + p.x * (W - padX * 2),
      y: padT + p.y * (H - padT - padB),
    }));
    geo.P = P;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.moveTo(P[0].x, P[0].y);
    ctx.lineTo(P[1].x, P[1].y);
    ctx.lineTo(P[2].x, P[2].y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59,116,214,0.12)';
    ctx.fill();
    ctx.strokeStyle = tc.fg;
    ctx.lineWidth = 2;
    ctx.stroke();
    const names = ['A', 'B', 'C'];
    const angs = [0, 1, 2].map((i) =>
      angleAt(P[i], P[(i + 1) % 3], P[(i + 2) % 3]),
    );
    angs.forEach((ang, i) => {
      const p = P[i];
      const q1 = P[(i + 1) % 3];
      const q2 = P[(i + 2) % 3];
      const a1 = Math.atan2(q1.y - p.y, q1.x - p.x);
      let a2 = Math.atan2(q2.y - p.y, q2.x - p.x);
      if (a2 < a1) a2 += Math.PI * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, a1, a2);
      ctx.strokeStyle = ['#e8871e', '#2e7d32', '#7c3aed'][i];
      ctx.lineWidth = 3;
      ctx.stroke();
      const mid = (a1 + a2) / 2;
      const deg = (ang * 180) / Math.PI;
      ctx.fillStyle = tc.fg;
      ctx.font = '700 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(deg.toFixed(0) + '\u00b0', p.x + Math.cos(mid) * 38, p.y + Math.sin(mid) * 38 + 4);
      ctx.font = '600 14px system-ui';
      ctx.fillText(names[i], p.x + Math.cos(mid) * 56, p.y + Math.sin(mid) * 56 + 5);
    });
    P.forEach((p, i) => {
      if (i === st.selected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = tc.fg;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = ['#3b74d6', '#e8871e', '#7c3aed'][i];
      ctx.fill();
      ctx.strokeStyle = tc.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    const sum = angs.reduce((s, a) => s + a, 0);
    const degs = angs.map((ang) => (ang * 180) / Math.PI);
    const largest = Math.max(...degs);
    const kind = Math.min(...degs) <= 0.5
      ? '接近压扁'
      : Math.abs(largest - 90) < 0.5
        ? '直角三角形'
        : largest > 90 ? '钝角三角形' : '锐角三角形';
    cap.textContent =
      `A=${degs[0].toFixed(1)}°，B=${degs[1].toFixed(1)}°，C=${degs[2].toFixed(1)}°；当前是${kind}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = tc.fg;
    ctx.font = '600 15px system-ui';
    ctx.fillText(
      '\u2220A + \u2220B + \u2220C = ' +
        ((sum * 180) / Math.PI).toFixed(1) + '\u00b0',
      padX,
      26,
    );
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.canvas.tabIndex = 0;
  r.canvas.setAttribute('aria-label', '三角形内角和实验：按 1、2、3 选择顶点，用方向键移动');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.P) return null;
      for (let i = 0; i < 3; i++) {
        if (Math.hypot(x - geo.P[i].x, y - geo.P[i].y) <= 18) {
          st.selected = i;
          return i;
        }
      }
      return null;
    },
    move(id, x, y) {
      const W = r.W;
      st.pts[id] = {
        x: clamp((x - 40) / (W - 80), 0.02, 0.98),
        y: clamp((y - 44) / (H - 60), 0.02, 0.98),
      };
      draw();
    },
  });
  r.canvas.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 0.01 : 0.04;
    const point = st.pts[st.selected];
    if (event.key === '1' || event.key === '2' || event.key === '3') {
      st.selected = Number(event.key) - 1;
    } else if (event.key === 'ArrowLeft') {
      point.x = clamp(point.x - step, 0.02, 0.98);
    } else if (event.key === 'ArrowRight') {
      point.x = clamp(point.x + step, 0.02, 0.98);
    } else if (event.key === 'ArrowUp') {
      point.y = clamp(point.y - step, 0.02, 0.98);
    } else if (event.key === 'ArrowDown') {
      point.y = clamp(point.y + step, 0.02, 0.98);
    } else {
      return;
    }
    draw();
    event.preventDefault();
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 几何：勾股定理面积方块 ---------- */

function renderPytha(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const st = { a: clamp(Math.round(spec.a || 4), 1, 9), b: clamp(Math.round(spec.b || 3), 1, 6) };
  let r = null;
  const geo = {};
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    /* 单位长度按包围盒自适应：c² 方块最高升到 y0 - b·u - a·u²/c，最右伸到 x0 + a·u + b·u²/c，
       大 a、b 时必须整体收缩，否则三个方块会画出画布 */
    const cHyp = Math.hypot(st.a, st.b);
    let u = 24;
    const fitsV = (uu) => 24 + st.b * uu + (st.a * uu * uu) / cHyp + st.a * uu + 34 <= H;
    const fitsH = (uu) => {
      const x0 = Math.max(st.b * uu + 60, W * 0.42);
      return x0 - st.b * uu >= 10 && x0 + st.a * uu + (st.b * uu * uu) / cHyp <= W - 10;
    };
    while (u > 6 && !(fitsV(u) && fitsH(u))) u -= 1;
    geo.u = u;
    const x0 = Math.max(st.b * u + 60, W * 0.42);
    const y0 = H - st.a * u - 34;
    geo.x0 = x0;
    geo.y0 = y0;
    const A = { x: x0 + st.a * u, y: y0 };
    const B = { x: x0, y: y0 - st.b * u };
    geo.A = A;
    geo.B = B;
    ctx.fillStyle = 'rgba(59,116,214,0.10)';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tc.fg;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = tc.axis;
    ctx.strokeRect(x0 - 10, y0 - 10, 10, 10);
    ctx.fillStyle = 'rgba(59,116,214,0.45)';
    ctx.fillRect(x0, y0, st.a * u, st.a * u);
    ctx.strokeRect(x0, y0, st.a * u, st.a * u);
    ctx.fillStyle = 'rgba(232,135,30,0.45)';
    ctx.fillRect(x0 - st.b * u, y0 - st.b * u, st.b * u, st.b * u);
    ctx.strokeRect(x0 - st.b * u, y0 - st.b * u, st.b * u, st.b * u);
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const c = cHyp;
    const ox = (-dy / c) * u;
    const oy = (dx / c) * u;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(A.x + ox, A.y + oy);
    ctx.lineTo(B.x + ox, B.y + oy);
    ctx.lineTo(B.x, B.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(124,58,237,0.35)';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('a\u00b2=' + st.a * st.a, x0 + (st.a * u) / 2, y0 + (st.a * u) / 2 + 4);
    ctx.fillText('b\u00b2=' + st.b * st.b, x0 - (st.b * u) / 2, y0 - (st.b * u) / 2 + 4);
    ctx.save();
    ctx.translate((A.x + B.x) / 2 + ox / 2, (A.y + B.y) / 2 + oy / 2);
    const ang = Math.atan2(dy, dx);
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) ctx.rotate(ang + Math.PI);
    else ctx.rotate(ang);
    ctx.fillText('c\u00b2=' + (st.a * st.a + st.b * st.b), 0, 4);
    ctx.restore();
    [[A, '#e8871e'], [B, '#7c3aed']].forEach(([p]) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = tc.bg;
      ctx.fill();
      ctx.strokeStyle = p === A ? '#e8871e' : '#7c3aed';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    ctx.textAlign = 'left';
    ctx.font = '600 14px monospace';
    ctx.fillText(
      st.a + '\u00b2 + ' + st.b + '\u00b2 = ' + (st.a * st.a) + ' + ' + (st.b * st.b) +
        ' = ' + (st.a * st.a + st.b * st.b) + ' = c\u00b2',
      16,
      24,
    );
    cap.textContent =
      'a=' + st.a + '\uff0cb=' + st.b + ' \u2192 c=\u221a' + (st.a * st.a + st.b * st.b) +
      ' \u2248 ' + c.toFixed(3) + '\uff08\u62d6\u6a59\u73af\u3001\u7d2b\u73af\u6539\u76f4\u89d2\u8fb9\uff09';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.canvas.tabIndex = 0;
  r.canvas.setAttribute('aria-label', '勾股定理面积实验：方向键左右改 a，上下改 b；Shift 减小步长');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.A) return null;
      if (Math.hypot(x - geo.A.x, y - geo.A.y) <= 16) return 'a';
      if (Math.hypot(x - geo.B.x, y - geo.B.y) <= 16) return 'b';
      return null;
    },
    move(id, x, y) {
      const uu = geo.u || 24;
      if (id === 'a') {
        st.a = clamp(Math.round((x - geo.x0) / uu), 1, 9);
      } else {
        st.b = clamp(Math.round((geo.y0 - y) / uu), 1, 6);
      }
      draw();
    },
  });
  r.canvas.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 1 : 2;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      st.a = clamp(st.a + (event.key === 'ArrowRight' ? step : -step), 1, 9);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      st.b = clamp(st.b + (event.key === 'ArrowUp' ? step : -step), 1, 6);
    } else {
      return;
    }
    draw();
    event.preventDefault();
  });
  const resetBtn = mkBtn('重置');
  resetBtn.addEventListener('click', () => {
    st.a = clamp(Math.round(spec.a || 4), 1, 9);
    st.b = clamp(Math.round(spec.b || 3), 1, 6);
    draw();
  });
  const tools = document.createElement('div');
  tools.className = 'ml-viz__controls';
  tools.appendChild(resetBtn);
  host.appendChild(tools);
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 几何：滚动圆测周长（π 的实验） ---------- */

function renderPiroll(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 240;
  const st = { d: clamp(Math.round(spec.d || 2), 1, 5), p: 0 };
  let raf = null;
  let r = null;
  let visible = true; // 离屏暂停标记
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stop() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }
  function draw() {
    if (!r) return false;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    /* 行程 π·d·u 必须留在画布内：u 随 d 反比收缩（最右需求 ≈ 36 + 2.5u + πdu + 2.5u） */
    const u = Math.min(52, (W - 80) / (Math.PI * st.d + 5));
    const rad = (st.d / 2) * u;
    const xStart = 36 + rad;
    const yLine = H - 46;
    const travel = Math.PI * st.d * u;
    const cx = xStart + travel * st.p;
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 2;
    line(ctx, 20, yLine, W - 20, yLine);
    ctx.fillStyle = tc.axis;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    for (let v = 0; v * u + 36 < W - 20; v++) {
      const xv = 36 + v * u;
      line(ctx, xv, yLine, xv, yLine + 6);
      ctx.fillText(String(v), xv, yLine + 20);
    }
    ctx.fillStyle = 'rgba(232,135,30,0.55)';
    ctx.fillRect(xStart, yLine + 28, travel * (st.p > 0 ? 1 : 0), 9);
    ctx.strokeStyle = '#e8871e';
    ctx.strokeRect(xStart, yLine + 28, travel, 9);
    ctx.beginPath();
    ctx.arc(cx, yLine - rad, rad, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59,116,214,0.14)';
    ctx.fill();
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    const ang = -st.p * Math.PI * 2;
    line(ctx, cx - Math.cos(ang) * rad, yLine - rad - Math.sin(ang) * rad,
      cx + Math.cos(ang) * rad, yLine - rad + Math.sin(ang) * rad);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * rad, yLine - rad + Math.sin(ang) * rad, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#e8871e';
    line(ctx, xStart, yLine - rad - 12, xStart + travel * st.p, yLine - rad - 12);
    ctx.setLineDash([]);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      '\u5468\u957f C = \u03c0\u00b7d \u2248 3.1416 \u00d7 ' + st.d + ' \u2248 ' + (Math.PI * st.d).toFixed(4),
      20, 24,
    );
    cap.textContent =
      '\u76d8\u5b50\u6eda\u4e00\u5708\uff0c\u524d\u8fdb\u7684\u8ddd\u79bb\uff08\u6a59\u8272\u80f6\u5e26\uff09\u6070\u597d\u662f ' +
      '\u03c0 \u4e2a\u76f4\u5f84\u2014\u2014\u4e0d\u7ba1 d \u662f\u591a\u5927\uff0cC\u00f7d \u6c38\u8fdc\u662f\u540c\u4e00\u4e2a\u6570';
    return true;
  }
  function frame() {
    if (!r || !wrap.isConnected || !visible) { stop(); return; }
    st.p += 0.01;
    if (st.p >= 1) { st.p = 1; draw(); stop(); return; }
    draw();
    raf = requestAnimationFrame(frame);
  }
  function restart() {
    stop();
    st.p = reduced ? 1 : 0;
    if (!draw()) return;
    if (!reduced && visible && st.p < 1) raf = requestAnimationFrame(frame);
  }
  const sl = buildSliders(
    { sliders: [{ name: 'd', min: 1, max: 5, step: 1, value: st.d }] },
    () => {
      st.d = Math.max(1, Math.round(sl.state.d));
      restart();
    },
  );
  const btn = mkBtn('\u518d\u6eda\u4e00\u5708');
  btn.addEventListener('click', restart);
  box.appendChild(btn);
  r = setupCanvas(wrap, H);
  r.redraw = restart;
  restart();
  onScreen(wrap, (vis) => {
    visible = vis;
    if (!vis) {
      stop();
    } else if (raf == null && !reduced && st.p < 1 && wrap.isConnected) {
      raf = requestAnimationFrame(frame); // 滚到一半离屏的，回来接着滚
    }
  });
  return { slidersBox: sl.box };
}

/* ---------- 几何：扇形与弧长 ---------- */

function renderSector(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 280;
  const st = {
    th: clamp(spec.theta || 90, 10, 350),
    r: clamp(spec.r || 3, 1, 5),
  };
  let r = null;
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    const cy = H * 0.55;
    const R = Math.min(st.r * 24, H * 0.38, W * 0.28);
    const cx = R + 18;
    const frac = st.th / 360;
    const a0 = -Math.PI / 2;
    const a1 = a0 + frac * Math.PI * 2;
    ctx.fillStyle = 'rgba(59,116,214,0.30)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, a0, a1);
    ctx.stroke();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = tc.fg;
    ctx.lineWidth = 1.4;
    line(ctx, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
    ctx.setLineDash([]);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    const L = frac * 2 * Math.PI * st.r;
    const S = frac * Math.PI * st.r * st.r;
    const chord = 2 * st.r * Math.sin(st.th * Math.PI / 360);
    ctx.fillText('r = ' + st.r, cx + 10, cy - 8);
    ctx.fillText(st.th + '\u00b0', cx + Math.cos((a0 + a1) / 2) * R * 0.55, cy + Math.sin((a0 + a1) / 2) * R * 0.55 + 4);
    cap.textContent =
      '\u03b8=' + st.th + '\u00b0\uff0cr=' + st.r +
      '\uff1b\u5360\u6bd4=' + (frac * 100).toFixed(1) + '%' +
      '\uff0cL\u2248' + L.toFixed(2) +
      '\uff0cS\u2248' + S.toFixed(2) +
      '\uff0c\u5f26\u957f\u2248' + chord.toFixed(2);
  }
  const sl = buildSliders(
    {
      sliders: [
        ...(spec.thetaLocked ? [] : [{ name: '\u89d2\u5ea6', min: 10, max: 350, step: 5, value: st.th }]),
        { name: '\u534a\u5f84', min: 1, max: 5, step: 0.5, value: st.r },
      ],
    },
    (state) => {
      st.th = state['\u89d2\u5ea6'];
      st.r = state['\u534a\u5f84'];
      draw();
    },
  );
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 三角：单位圆定义 sin/cos（可拖出正弦曲线） ---------- */

function renderUnitcircle(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 300;
  const trace = spec.mode === 'wave';
  const st = { th: 0.9, playing: true };
  let raf = null;
  let r = null;
  let W = 320;
  const geo = {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stop() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const R = Math.min(96, H * 0.32);
    const cy = H / 2 + 8;
    const cx = trace ? Math.max(R + 34, W * 0.2) : W * 0.3;
    geo.cx = cx; geo.cy = cy; geo.R = R;
    const px = cx + Math.cos(st.th) * R;
    const py = cy - Math.sin(st.th) * R;
    geo.px = px; geo.py = py;
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.4;
    line(ctx, cx - R - 14, cy, cx + R + 14, cy);
    line(ctx, cx, cy - R - 14, cx, cy + R + 14);
    if (!trace) {
      for (let k = 1; k <= 3; k++) {
        ctx.strokeStyle = tc.grid;
        ctx.beginPath();
        ctx.arc(cx, cy, (R * k) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = tc.axis;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('1', cx + 4, cy - R + 2);
    }
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(59,116,214,0.75)';
    ctx.lineWidth = 3;
    line(ctx, cx, cy, px, cy);
    ctx.strokeStyle = 'rgba(232,135,30,0.85)';
    line(ctx, px, cy, px, py);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    line(ctx, cx, cy, px, py);
    ctx.fillStyle = '#3b74d6';
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('cos=' + Math.cos(st.th).toFixed(2), (cx + px) / 2, cy + 16);
    ctx.save();
    ctx.translate(px + (Math.cos(st.th) >= 0 ? 12 : -12), (cy + py) / 2);
    ctx.textAlign = Math.cos(st.th) >= 0 ? 'left' : 'right';
    ctx.fillText('sin=' + Math.sin(st.th).toFixed(2), 0, 4);
    ctx.restore();
    if (trace) {
      const x0 = cx + R + 26;
      const span = Math.PI * 4;
      const sx = (phi) => x0 + (phi / span) * (W - x0 - 16);
      const sy = (v) => cy - v * R;
      ctx.strokeStyle = 'rgba(107,114,128,0.25)';
      ctx.lineWidth = 1;
      line(ctx, x0 - 10, sy(0), W - 14, sy(0));
      ctx.strokeStyle = 'rgba(232,135,30,0.5)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k <= 240; k++) {
        const phi = (span * k) / 240;
        const yy = sy(Math.sin(phi));
        if (k === 0) ctx.moveTo(sx(phi), yy);
        else ctx.lineTo(sx(phi), yy);
      }
      ctx.stroke();
      ctx.strokeStyle = '#e8871e';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      const upto = Math.min(st.th, span);
      for (let k = 0; k <= 200; k++) {
        const phi = (upto * k) / 200;
        const yy = sy(Math.sin(phi));
        if (k === 0) ctx.moveTo(sx(phi), yy);
        else ctx.lineTo(sx(phi), yy);
      }
      ctx.stroke();
      if (st.th <= span) {
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#7c3aed';
        line(ctx, px, py, sx(st.th), sy(Math.sin(st.th)));
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(sx(st.th), sy(Math.sin(st.th)), 6, 0, Math.PI * 2);
        ctx.fillStyle = '#e8871e';
        ctx.fill();
      }
      ctx.fillStyle = tc.axis;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      [Math.PI, 2 * Math.PI, 3 * Math.PI].forEach((v) =>
        ctx.fillText((v / Math.PI).toFixed(0) + '\u03c0', sx(v), sy(-1.22)),
      );
    }
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.strokeStyle = tc.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    const deg = ((st.th * 180) / Math.PI) % 360;
    cap.textContent =
      '\u03b8 = ' + (((st.th % (Math.PI * 2)) * 180) / Math.PI).toFixed(0) + '\u00b0 = ' +
      (st.th % (Math.PI * 2)).toFixed(2) + ' rad\u3000\u2192\u3000' +
      '(cos \u03b8, sin \u03b8) = (' + Math.cos(st.th).toFixed(2) + ', ' + Math.sin(st.th).toFixed(2) + ')';
    void deg;
  }
  let visible = true; // 离屏暂停标记
  function frame() {
    if (!r || !wrap.isConnected || !visible) { stop(); return; }
    if (st.playing) {
      st.th += 0.012;
      draw();
    }
    raf = requestAnimationFrame(frame);
  }
  function startAnim() {
    stop();
    if (!reduced && st.playing && visible) raf = requestAnimationFrame(frame);
    else draw();
  }
  const btn = mkBtn('\u23f8 \u6682\u505c');
  btn.addEventListener('click', () => {
    st.playing = !st.playing;
    btn.textContent = st.playing ? '\u23f8 \u6682\u505c' : '\u25b6 \u65cb\u8f6c';
    startAnim();
  });
  box.appendChild(btn);
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.canvas.tabIndex = 0;
  r.canvas.setAttribute('role', 'slider');
  r.canvas.setAttribute('aria-label', '单位圆角度：用左右方向键调整');
  r.canvas.setAttribute('aria-valuemin', '0');
  r.canvas.setAttribute('aria-valuemax', '360');
  r.canvas.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    st.th = (st.th + (event.key === 'ArrowRight' ? Math.PI / 12 : -Math.PI / 12) + Math.PI * 2) % (Math.PI * 2);
    st.playing = false;
    btn.textContent = '\u25b6 \u65cb\u8f6c';
    stop();
    r.canvas.setAttribute('aria-valuenow', String(Math.round((st.th * 180) / Math.PI)));
    draw();
    event.preventDefault();
  });
  r.redraw = () => { startAnim(); };
  bindPointer(r.canvas, {
    pick(x, y) {
      if (geo.R && Math.hypot(x - geo.px, y - geo.py) <= 20) return 'p';
      return null;
    },
    move(id, x, y) {
      if (id !== 'p') return;
      st.th = Math.atan2(geo.cy - y, x - geo.cx);
      if (st.th < 0) st.th += Math.PI * 2;
      st.playing = false;
      btn.textContent = '\u25b6 \u65cb\u8f6c';
      stop();
      draw();
    },
  });
  startAnim();
  onScreen(wrap, (vis) => {
    visible = vis;
    if (vis && raf == null) startAnim();
    if (!vis) stop();
  });
  return { slidersBox: document.createElement('div') };
}

/* ---------- 三角：振幅/频率/相位三滑杆行波 ---------- */

function renderWave(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 260;
  const st = {
    A: spec.A || 1,
    f: spec.f || 1,
    phi: spec.phi || 0,
    t: 0,
  };
  let raf = null;
  let r = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stop() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const midY = H / 2 + 6;
    const scale = H * 0.36;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(107,114,128,0.35)';
    ctx.lineWidth = 1;
    line(ctx, 0, midY, W, midY);
    ctx.strokeStyle = 'rgba(59,116,214,0.20)';
    ctx.setLineDash([3, 4]);
    line(ctx, 0, midY - st.A * scale, W, midY - st.A * scale);
    line(ctx, 0, midY + st.A * scale, W, midY + st.A * scale);
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let px = 0; px <= W; px += 3) {
      const xx = (px / W) * Math.PI * 2 * 2;
      const y = midY - st.A * scale * Math.sin(st.f * xx - st.phi - st.t * 2);
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
    /* xx 轴总跨度为 4π（两个周期），故屏上一个波长 = W/(2f) */
    const lam = W / (2 * st.f);
    if (lam > 30 && lam < W) {
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1.6;
      const yL = midY - st.A * scale - 12;
      line(ctx, 14, yL, 14 + lam, yL);
      line(ctx, 14, yL - 5, 14, yL + 5);
      line(ctx, 14 + lam, yL - 5, 14 + lam, yL + 5);
      ctx.fillStyle = '#2e7d32';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('\u03bb \u4e00\u4e2a\u6ce2\u957f', 18 + lam / 2, yL - 6);
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 14px monospace';
    ctx.fillText(
      'y = ' + st.A.toFixed(1) + '\u00b7sin(' + st.f.toFixed(2) + 'x \u2212 ' +
        (st.phi % (Math.PI * 2)).toFixed(2) + ')',
      14, 24,
    );
    cap.textContent =
      '\u632f\u5e45 A=' + st.A.toFixed(1) + '\uff08\u591a\u9ad8\uff09\u3000\u9891\u7387 f=' + st.f.toFixed(2) +
      '\uff08\u591a\u5bc6\uff09\u3000\u76f8\u4f4d \u03c6=' + (st.phi % (Math.PI * 2)).toFixed(2) +
      '\uff08\u5de6\u53f3\u632a\u52a8\uff09';
  }
  let visible = true; // 离屏暂停标记
  function frame() {
    if (!r || !wrap.isConnected || !visible) { stop(); return; }
    if (!reduced) {
      st.t += 0.02;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  const sl = buildSliders(
    {
      sliders: [
        { name: 'A', min: 0.2, max: 2, step: 0.1, value: st.A },
        { name: 'f', min: 0.25, max: 4, step: 0.25, value: st.f },
        { name: 'phi', min: 0, max: 6.28, step: 0.1, value: st.phi },
      ],
    },
    (state) => {
      st.A = state.A;
      st.f = state.f;
      st.phi = state.phi;
      if (reduced) draw();
    },
  );
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  raf = requestAnimationFrame(frame);
  onScreen(wrap, (vis) => {
    visible = vis;
    if (!vis) {
      stop();
    } else if (raf == null && !reduced && r && wrap.isConnected) {
      raf = requestAnimationFrame(frame);
    }
  });
  return { slidersBox: sl.box };
}

/* ---------- 三角：两列波叠加出"拍" ---------- */

function renderBeats(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 300;
  const st = { f1: clamp(spec.f1 || 4, 2, 8), f2: clamp(spec.f2 || 5, 2, 8) };
  let r = null;
  function curve(ctx, W, freq, midY, scale, color, width, phaseShift) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) {
      const t = (px / W) * Math.PI * 2 * 4;
      const y = midY - scale * Math.sin(freq * t + (phaseShift || 0));
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const m1 = H * 0.2;
    const m2 = H * 0.42;
    const m3 = H * 0.78;
    const scale = 26;
    ctx.font = '11px monospace';
    curve(ctx, W, st.f1, m1, scale, 'rgba(59,116,214,0.75)', 1.6, 0);
    curve(ctx, W, st.f2, m2, scale, 'rgba(46,125,50,0.75)', 1.6, 0);
    ctx.strokeStyle = 'rgba(107,114,128,0.3)';
    ctx.lineWidth = 1;
    line(ctx, 0, m3, W, m3);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) {
      const t = (px / W) * Math.PI * 2 * 4;
      const y = m3 - scale * (Math.sin(st.f1 * t) + Math.sin(st.f2 * t));
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232,135,30,0.8)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.2;
    [1, -1].forEach((sgn) => {
      ctx.beginPath();
      for (let px = 0; px <= W; px += 2) {
        const t = (px / W) * Math.PI * 2 * 4;
        const env = 2 * scale * Math.abs(Math.cos(((st.f1 - st.f2) * t) / 2)) * sgn;
        const y = m3 - env;
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.fillStyle = tc.fg;
    ctx.textAlign = 'left';
    ctx.fillText('f\u2081=' + st.f1.toFixed(1), 10, m1 - scale - 4);
    ctx.fillText('f\u2082=' + st.f2.toFixed(1), 10, m2 - scale - 4);
    ctx.fillStyle = '#7c3aed';
    ctx.font = '600 13px monospace';
    ctx.fillText('\u76f8\u52a0', 10, m3 + scale + 18);
    const beat = Math.abs(st.f1 - st.f2);
    cap.textContent =
      beat < 0.01
        ? 'f\u2081 = f\u2082\uff1a\u4e24\u5217\u6ce2\u5408\u4e3a\u4e00\u5217\uff0c\u6ca1\u6709\u62cd\u97f3'
        : '\u62cd\u9891 = |f\u2081\u2212f\u2082| = ' + beat.toFixed(1) +
          '\uff08\u6a59\u8272\u5305\u7edc\u7ebf\uff1a\u58f0\u97f3\u5ffd\u5927\u5ffd\u5c0f\u7684\u201c\u55e1\u55e1\u201d\u5c31\u662f\u5b83\uff09';
  }
  const sl = buildSliders(
    {
      sliders: [
        { name: 'f1', min: 2, max: 8, step: 0.5, value: st.f1 },
        { name: 'f2', min: 2, max: 8, step: 0.5, value: st.f2 },
      ],
    },
    (state) => {
      st.f1 = state.f1;
      st.f2 = state.f2;
      draw();
    },
  );
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 数列：等差/等比阶梯 ---------- */

function renderSeq(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 300;
  const kind = spec.kind === 'geom' ? 'geom' : 'arith';
  const st = kind === 'arith'
    ? { a1: spec.a1 != null ? spec.a1 : 1, d: spec.d != null ? spec.d : 2, n: spec.n || 8 }
    : { a1: spec.a1 != null ? spec.a1 : 1, r: spec.r != null ? spec.r : 1.5, n: spec.n || 8 };
  let r = null;
  function term(k) {
    if (kind === 'arith') return st.a1 + k * st.d;
    return st.a1 * Math.pow(st.r, k);
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const vals = [];
    for (let k = 0; k < st.n; k++) {
      vals.push(Math.abs(term(k)) > 9999 ? NaN : term(k));
    }
    const finite = vals.filter((v) => !Number.isNaN(v));
    const maxAbs = Math.max(1, ...finite.map(Math.abs));
    const padL = 30;
    const bw = Math.min(64, (W - padL - 16) / st.n - 8);
    const baseY = H - 44;
    const usable = baseY - 46;
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.4;
    line(ctx, padL - 8, baseY, W - 12, baseY);
    let sumTxt = '';
    let acc = 0;
    for (let k = 0; k < st.n; k++) {
      const v = vals[k];
      const x = padL + k * (bw + 8);
      if (Number.isNaN(v)) {
        ctx.fillStyle = '#b3261e';
        ctx.font = '700 13px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('\u7206\u70b8', x + bw / 2, baseY - 14);
        acc = NaN;
      } else {
        acc += v;
        const h = (Math.abs(v) / maxAbs) * usable;
        ctx.fillStyle = v >= 0 ? 'rgba(59,116,214,0.6)' : 'rgba(179,38,30,0.55)';
        ctx.fillRect(x, v >= 0 ? baseY - h : baseY, bw, Math.max(h, 1.5));
        ctx.fillStyle = tc.fg;
        ctx.font = '600 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          Number.isInteger(v) ? String(v) : v.toFixed(1),
          x + bw / 2,
          v >= 0 ? baseY - h - 5 : baseY + h + 13,
        );
      }
      ctx.fillStyle = tc.axis;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('a' + (k + 1), x + bw / 2, baseY + 16);
    }
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    if (!Number.isNaN(acc)) {
      sumTxt = 'S' + st.n + ' (\u524d' + st.n + '\u9879\u548c) = ' +
        (Number.isInteger(acc) ? acc : acc.toFixed(2));
      ctx.fillStyle = '#7c3aed';
      ctx.fillText(sumTxt, padL - 8, 24);
    }
    ctx.fillStyle = tc.fg;
    ctx.fillText('a\u2081=' + st.a1, padL - 8, 44);
    if (kind === 'arith') ctx.fillText('d=' + st.d, padL + 60, 44);
    else ctx.fillText('r=' + st.r, padL + 60, 44);
    cap.textContent = kind === 'arith'
      ? '\u7b49\u5dee\uff1a\u6bcf\u9879\u518d\u52a0\u540c\u4e00\u4e2a d\uff0c\u957f\u9ad8\u50cf\u697c\u68af'
      : '\u7b49\u6bd4\uff1a\u6bcf\u9879\u518d\u4e58\u540c\u4e00\u4e2a r\uff0cr>1 \u65f6\u77ac\u95f4\u7206\u53d1\uff0cr<1 \u65f6\u8d8a\u957f\u8d8a\u77ee';
  }
  const sliders = kind === 'arith'
    ? [
        { name: 'a1', min: -5, max: 10, step: 1, value: st.a1 },
        { name: 'd', min: -5, max: 5, step: 1, value: st.d },
        { name: 'n', min: 3, max: 12, step: 1, value: st.n },
      ]
    : [
        { name: 'a1', min: 1, max: 5, step: 1, value: st.a1 },
        { name: 'r', min: 0.1, max: 2, step: 0.1, value: st.r },
        { name: 'n', min: 3, max: 11, step: 1, value: st.n },
      ];
  const sl = buildSliders({ sliders }, (state) => {
    Object.assign(st, state);
    st.n = Math.round(st.n);
    draw();
  });
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 归纳法：多米诺骨牌 ---------- */

function renderDomino(host, spec) {
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const arena = document.createElement('div');
  host.appendChild(arena);
  const verdict = document.createElement('div');
  verdict.className = 'ml-viz__caption';
  host.appendChild(verdict);

  const H = 170;
  const DH = 90;
  const DW = 26;
  const st = {
    n: clamp(spec.n || 8, 4, 12),
    gap: 1,
    angles: [],
    timer: null,
  };

  function layout() {
    arena.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.height = H * 2;
    canvas.style.height = H + 'px';
    arena.appendChild(canvas);
    st.canvas = canvas;
    st.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * st.dpr;
    canvas.height = H * st.dpr;
    st.ctx = canvas.getContext('2d');
    st.ctx.scale(st.dpr, st.dpr);
    st.W = canvas.clientWidth;
  }

  function paint() {
    /* 组件已随路由卸载：顺手摘掉 resize 监听，避免闭包泄漏累积 */
    if (!host.isConnected) {
      window.removeEventListener('resize', paint);
      return;
    }
    const ctx = st.ctx;
    if (!ctx) return;
    const tc = themeColors();
    ctx.clearRect(0, 0, st.W, H);
    const totalW = st.n * DW + (st.n + 1) * st.gap * 34;
    const scale = Math.min(1, (st.W - 20) / totalW);
    const spacing = DW + st.gap * 34 * scale;
    const startX = Math.max(10, (st.W - st.n * spacing) / 2 + spacing / 2);
    st.spacing = spacing;
    st.startX = startX;
    for (let i = 0; i < st.n; i++) {
      const cx = startX + i * spacing;
      const ang = st.angles[i] || 0;
      ctx.save();
      ctx.translate(cx, H - 16);
      ctx.rotate(ang);
      ctx.fillStyle = i === 0 ? '#e8871e' : '#3b74d6';
      ctx.fillRect(-DW / 2, -DH, DW, DH);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-DW / 2, -DH, DW, DH);
      ctx.restore();
    }
    ctx.fillStyle = tc.axis;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < st.n; i++) {
      ctx.fillText(String(i + 1), startX + i * spacing, H - 3);
    }
  }

  function stopAnim() {
    if (st.timer) { clearInterval(st.timer); st.timer = null; }
  }

  function topple() {
    stopAnim();
    reset(false);
    let i = 0;
    let phase = 0;
    st.timer = setInterval(() => {
      if (!host.isConnected) { stopAnim(); return; }
      if (i >= st.n) {
        stopAnim();
        verdict.textContent =
          '\u5168\u90e8\u5012\u4e0b\uff01\u57fa\u7840\u60c5\u51b5\uff08\u63a8\u5012\u7b2c 1 \u5757\uff09+ \u4f20\u5bfc\u6b65\uff08\u5012\u4e86\u4f1a\u78b0\u5012\u4e0b\u4e00\u5757\uff09= \u94fe\u5f0f\u53cd\u5e94';
        return;
      }
      const reach = st.spacing - DW;
      if (phase === 0) {
        st.angles[i] = Math.PI / 2.6;
        paint();
        if (i + 1 < st.n && reach < DH * 0.62) {
          phase = 1;
        } else if (i + 1 < st.n) {
          stopAnim();
          verdict.textContent =
            '\u95f4\u8ddd\u592a\u5927\uff0c\u5012\u5230\u7b2c ' + (i + 1) +
            ' \u5757\u5c31\u65ad\u4e86\u2014\u2014\u5f52\u7eb3\u6cd5\u7b2c\u4e8c\u6b65\uff08k \u6210\u7acb\u21d2 k+1 \u6210\u7acb\uff09' +
            '\u5fc5\u987b\u771f\u6210\u7acb\uff0c\u94fe\u6761\u624d\u80fd\u63a5\u4e0a';
          return;
        }
        i++;
      } else {
        phase = 0;
      }
    }, 260);
  }

  function reset(paintFlag) {
    stopAnim();
    st.angles = Array(st.n).fill(0);
    if (paintFlag !== false) {
      paint();
      verdict.textContent =
        '\u6bcf\u5757\u724c\u90fd\u76f8\u90bb\uff1a\u63a8\u5012\u7b2c\u4e00\u5757\uff08\u57fa\u7840\uff09\uff0c' +
        '\u540e\u9762\u7684\u5c31\u4f1a\u4e00\u5757\u63a5\u4e00\u5757\u5012\u4e0b\uff08\u4f20\u5bfc\uff09';
    }
  }

  const sl = buildSliders(
    {
      sliders: [
        { name: '\u95f4\u8ddd', min: 0.5, max: 2.5, step: 0.25, value: st.gap },
      ],
    },
    (state) => {
      st.gap = state['\u95f4\u8ddd'];
      reset(true);
    },
  );
  [['\u63a8\u5012\u7b2c\u4e00\u5757', topple], ['\u91cd\u7ad9', () => reset(true)]].forEach(([label, fn]) => {
    const b = mkBtn(label);
    b.addEventListener('click', fn);
    box.appendChild(b);
  });
  box.appendChild(sl.box);
  layout();
  window.addEventListener('resize', paint);
  reset(true);
  return { slidersBox: document.createElement('div') };
}

/* ---------- 斐波那契：螺线方块 ---------- */

function renderFibspiral(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 300;
  const st = { n: clamp(spec.n || 8, 3, 10) };
  let r = null;
  function fibs(n) {
    const out = [1, 1];
    while (out.length < n) out.push(out[out.length - 1] + out[out.length - 2]);
    return out.slice(0, n);
  }
  /* 黄金螺线：每块方格内一段四分之一圆弧（半径=方格边长，圆心为方格一角），
     用 DFS 找出首尾相切衔接的那一组；方块拼接顺序固定，解唯一 */
  const wrapPi2 = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a <= -Math.PI) a += Math.PI * 2;
    return a;
  };
  function buildSpiralArcs(rectList) {
    const wrapPi = (a) => {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a <= -Math.PI) a += Math.PI * 2;
      return a;
    };
    const cands = rectList.map((rc) => {
      const corners = [
        [rc.x, rc.y], [rc.x + rc.s, rc.y], [rc.x + rc.s, rc.y + rc.s], [rc.x, rc.y + rc.s],
      ];
      const out = [];
      for (const c of corners) {
        const far = corners.filter(
          (p) => Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - rc.s) < 1e-9,
        );
        if (far.length !== 2) continue;
        for (const [p0, p1] of [[far[0], far[1]], [far[1], far[0]]]) {
          out.push({
            cx: c[0], cy: c[1], r: rc.s,
            a0: Math.atan2(p0[1] - c[1], p0[0] - c[0]),
            a1: Math.atan2(p1[1] - c[1], p1[0] - c[0]),
          });
        }
      }
      return out;
    });
    const sweepSign = (A) => Math.sign(wrapPi(A.a1 - A.a0)) || 1;
    const ptAt = (A, a) => [A.cx + A.r * Math.cos(a), A.cy + A.r * Math.sin(a)];
    const tanAt = (A, a) => {
      const s = sweepSign(A);
      return [-s * Math.sin(a), s * Math.cos(a)];
    };
    function solve(i, end, tanIn) {
      if (i === rectList.length) return [];
      for (const v of cands[i]) {
        const s0 = ptAt(v, v.a0);
        if (Math.hypot(s0[0] - end[0], s0[1] - end[1]) > 1e-6) continue;
        const tv = tanAt(v, v.a0);
        if (tanIn && tv[0] * tanIn[0] + tv[1] * tanIn[1] < 0.999) continue;
        const rest = solve(i + 1, ptAt(v, v.a1), tanAt(v, v.a1));
        if (rest) return [v].concat(rest);
      }
      return null;
    }
    for (const first of cands[0]) {
      const chain = solve(1, ptAt(first, first.a1), tanAt(first, first.a1));
      if (chain) return [first].concat(chain);
    }
    return [];
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const fs = fibs(st.n);
    let X = 0;
    let Y = 0;
    let BW = 1;
    let BH = 1;
    const rects = [{ x: 0, y: 0, s: fs[0] }];
    for (let i = 1; i < st.n; i++) {
      const f = fs[i];
      const dir = i % 4;
      if (dir === 1) rects.push({ x: X + BW, y: Y, s: f }) && (BW += f);
      else if (dir === 2) rects.push({ x: X + BW - f, y: Y + BH, s: f }) && (BH += f);
      else if (dir === 3) rects.push({ x: X - f, y: Y + BH - f, s: f }) && ((X -= f), (BW += f));
      else rects.push({ x: X, y: Y - f, s: f }) && ((Y -= f), (BH += f));
    }
    const minX = X;
    const minY = Y;
    const u = Math.min((W - 40) / BW, (H - 60) / BH);
    const toPx = (rx, ry) => ({
      px: (W - BW * u) / 2 + (rx - minX) * u,
      py: 34 + (ry - minY) * u,
    });
    const colors = ['#3b74d6', '#e8871e', '#2e7d32', '#7c3aed'];
    rects.forEach((q, i) => {
      const p = toPx(q.x, q.y);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = colors[i % 4];
      ctx.fillRect(p.px, p.py, q.s * u, q.s * u);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors[i % 4];
      ctx.lineWidth = 1.6;
      ctx.strokeRect(p.px, p.py, q.s * u, q.s * u);
      if (q.s * u > 22) {
        ctx.fillStyle = tc.fg;
        ctx.font = '700 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(q.s), p.px + (q.s * u) / 2, p.py + (q.s * u) / 2 + 4);
      }
    });
    /* 黄金螺线：一段段四分之一圆弧，恰好首尾相切地穿过每块方格 */
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.2;
    buildSpiralArcs(rects).forEach((A) => {
      const p = toPx(A.cx, A.cy);
      const dTheta = A.a1 - A.a0;
      ctx.beginPath();
      ctx.arc(p.px, p.py, A.r * u, A.a0, A.a1, wrapPi2(dTheta) < 0);
      ctx.stroke();
    });
    ctx.fillStyle = tc.fg;
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    const ratios = [];
    for (let i = 2; i < fs.length; i++) ratios.push(fs[i] / fs[i - 1]);
    const last = ratios.slice(-3).map((v) => v.toFixed(3)).join(', ');
    ctx.fillText('\u76f8\u90bb\u4e24\u9879\u4e4b\u6bd4\uff1a' + last + ' \u2026\u2192 1.618(\u9ec4\u91d1\u6bd4)', 14, 22);
    cap.textContent =
      '\u6bcf\u4e2a\u65b0\u65b9\u5757\u7684\u8fb9\u957f = \u524d\u4e24\u5757\u4e4b\u548c\uff1aF(n)=F(n-1)+F(n-2)\uff0c' +
      '\u8d8a\u957f\u8d8a\u50cf\u4e00\u4e2a\u91d1\u8272\u957f\u65b9\u5f62';
  }
  const sl = buildSliders(
    { sliders: [{ name: 'n', min: 3, max: 10, step: 1, value: st.n }] },
    (state) => {
      st.n = Math.max(3, Math.round(state.n));
      draw();
    },
  );
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 概率：大数定律掷币机 ---------- */

function renderCoinlaw(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 260;
  const st = {
    n: 0,
    heads: 0,
    pts: [{ n: 0, f: 0.5 }],
    target: spec.p != null ? spec.p : 0.5,
  };
  let r = null;
  function record() {
    st.pts.push({ n: st.n, f: st.heads / st.n });
    if (st.pts.length > 1400) {
      st.pts = st.pts.filter((p, i) => i % 2 === 0 || i === st.pts.length - 1);
    }
  }
  function flip(k) {
    for (let i = 0; i < k; i++) {
      if (Math.random() < st.target) st.heads++;
      st.n++;
    }
    record();
    draw();
    cap.textContent =
      '\u6b63\u9762 ' + st.heads + ' \u6b21 / \u5171\u63b7 ' + st.n +
      ' \u6b21\uff0c\u9891\u7387 = ' + (st.heads / st.n).toFixed(4) +
      '\uff08\u7406\u8bba\u503c ' + st.target.toFixed(2) + '\uff09';
  }
  function reset() {
    st.n = 0;
    st.heads = 0;
    st.pts = [{ n: 0, f: 0.5 }];
    cap.textContent = '\u8fd8\u6ca1\u6709\u6570\u636e\uff1a\u70b9\u4e00\u4e0b\u201c\u63b7\u4e00\u6b21\u201d';
    draw();
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const padL = 44;
    const padR = 14;
    const padT = 18;
    const padB = 26;
    const X = (n) => padL + (Math.log10(Math.max(n, 1)) / Math.log10(Math.max(st.n, 100))) * (W - padL - padR);
    const Y = (f) => padT + (1 - f) * (H - padT - padB);
    ctx.fillStyle = tc.bg;
    ctx.fillRect(0, 0, W, H);
    for (let g = 0; g <= 4; g++) {
      const f = g / 4;
      ctx.strokeStyle = g === 2 ? 'rgba(46,125,30,0.55)' : 'rgba(107,114,128,0.16)';
      if (g === 2) ctx.setLineDash([5, 4]);
      line(ctx, padL, Y(f), W - padR, Y(f));
      ctx.setLineDash([]);
      ctx.fillStyle = tc.axis;
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(f.toFixed(2), padL - 5, Y(f) + 4);
    }
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    st.pts.forEach((p, i) => {
      const x = X(p.n);
      const y = Y(p.f);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const last = st.pts[st.pts.length - 1];
    ctx.beginPath();
    ctx.arc(X(last.n), Y(last.f), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#3b74d6';
    ctx.fill();
    ctx.fillStyle = tc.fg;
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('\u7406\u8bba\u6982\u7387 ' + st.target.toFixed(2), padL + 4, Y(st.target) - 6);
    ctx.textAlign = 'center';
    [1, 10, 100, 1000, 10000].forEach((v) => {
      if (v <= Math.max(st.n, 100)) ctx.fillText(String(v), X(v), H - padB + 15);
    });
  }
  [
    ['\u63b7 1 \u6b21', 1],
    ['+100', 100],
    ['+1000', 1000],
    ['+100000', 100000],
  ].forEach(([label, k]) => {
    const b = mkBtn(label);
    b.addEventListener('click', () => flip(k));
    box.appendChild(b);
  });
  const rst = mkBtn('\u91cd\u7f6e');
  rst.addEventListener('click', reset);
  box.appendChild(rst);
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  reset();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 统计：拖数据点看均值与标准差 ---------- */

function renderStatdots(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 240;
  const LO = spec.min != null ? spec.min : 0;
  const HI = spec.max != null ? spec.max : 10;
  const N = clamp(spec.n || 8, 3, 14);
  const vals = [];
  for (let i = 0; i < N; i++) {
    vals.push(Math.round(((LO + HI) / 2 + (Math.random() - 0.5) * (HI - LO) * 0.8) * 10) / 10);
  }
  let r = null;
  let W = 320;
  const geo = {};
  function X(v) {
    return geo.pad + ((v - LO) / (HI - LO)) * (W - geo.pad * 2);
  }
  function stats() {
    const m = vals.reduce((s, v) => s + v, 0) / vals.length;
    const varr = vals.reduce((s, v) => s + (v - m) * (v - m), 0) / vals.length;
    return { mean: m, sd: Math.sqrt(varr), varr };
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    W = r.W;
    const tc = themeColors();
    geo.pad = 26;
    const axisY = H - 52;
    const dotY = H * 0.38;
    ctx.clearRect(0, 0, W, H);
    const s = stats();
    geo.axisY = axisY;
    ctx.fillStyle = 'rgba(59,116,214,0.16)';
    ctx.fillRect(X(s.mean - s.sd), 30, X(s.mean + s.sd) - X(s.mean - s.sd), axisY - 30);
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 4;
    line(ctx, geo.pad, axisY, W - geo.pad, axisY);
    ctx.fillStyle = tc.axis;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    for (let v = Math.ceil(LO); v <= HI; v++) {
      ctx.fillRect(X(v) - 0.5, axisY - 8, 1, 16);
      ctx.fillText(String(v), X(v), axisY + 22);
    }
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3;
    line(ctx, X(s.mean), axisY - 6, X(s.mean), axisY + 6);
    ctx.beginPath();
    ctx.moveTo(X(s.mean), axisY - 14);
    ctx.lineTo(X(s.mean) - 6, axisY - 24);
    ctx.lineTo(X(s.mean) + 6, axisY - 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8871e';
    ctx.font = '700 12px system-ui';
    ctx.fillText('\u5747\u503c', X(s.mean), axisY - 30);
    vals.forEach((v, i) => {
      const x = X(v);
      geo['d' + i] = x;
      ctx.beginPath();
      ctx.arc(x, dotY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#3b74d6';
      ctx.fill();
      ctx.strokeStyle = tc.bg;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    });
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(
      '\u5747\u503c=' + s.mean.toFixed(2),
      geo.pad, 20,
    );
    ctx.fillStyle = '#7c3aed';
    ctx.fillText(
      '\u65b9\u5dee=' + s.varr.toFixed(2),
      geo.pad + 150, 20,
    );
    ctx.fillStyle = '#2e7d32';
    ctx.fillText(
      '\u6807\u51c6\u5dee=' + s.sd.toFixed(2),
      geo.pad + 300 > W ? geo.pad : geo.pad + 300, 20,
    );
    cap.textContent =
      '\u84dd\u8272\u9634\u5f71 = [\u5747\u503c\u2212\u03c3, \u5747\u503c+\u03c3]\uff1a\u5927\u7ea6 2/3 \u7684\u6570\u636e\u4f1a\u843d\u5728\u8fd9\u4e2a\u533a\u95f4' +
      '\uff08\u62d6\u84dd\u70b9\u8bd5\u8bd5\uff09';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.axisY || Math.abs(y - H * 0.38) > 26) return null;
      for (let i = 0; i < vals.length; i++) {
        if (Math.abs(x - geo['d' + i]) <= 14) return i;
      }
      return null;
    },
    move(id, x) {
      vals[id] = clamp(Math.round((LO + ((x - geo.pad) / (r.W - geo.pad * 2)) * (HI - LO)) * 10) / 10, LO, HI);
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 数论：模运算时钟 ---------- */

function renderClockmod(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const slBox = document.createElement('div');
  slBox.className = 'ml-viz__sliders is-visible';
  const H = 280;
  const m0 = clamp(spec.m || 12, 2, 16);
  const st = { m: m0, k: clamp(Math.round(Number(spec.k) || 1), 1, m0 - 1), n: 0 };
  const refs = {};
  let btnPlus = null;
  let btnMinus = null;
  let r = null;
  let W = 320;

  /* 滑杆只建一次，input 原地联动（k 的上限跟随 m），避免销毁拖动中的元素 */
  function makeRow(name, label, min, max) {
    const row = document.createElement('div');
    row.className = 'ml-slider';
    const lab = document.createElement('label');
    lab.textContent = label + ' =';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(min);
    range.max = String(max);
    range.step = '1';
    range.value = String(st[name]);
    const span = document.createElement('span');
    span.className = 'ml-slider__val';
    span.textContent = String(st[name]);
    range.addEventListener('input', () => {
      if (name === 'm') {
        st.m = parseInt(range.value, 10);
        st.k = Math.min(st.k, st.m - 1);
        refs.k.range.max = String(st.m - 1);
        refs.k.range.value = String(st.k);
        refs.k.span.textContent = String(st.k);
        span.textContent = String(st.m);
        syncStepBtns();
      } else {
        st.k = parseInt(range.value, 10);
        span.textContent = String(st.k);
        syncStepBtns();
      }
      draw();
    });
    row.append(lab, range, span);
    refs[name] = { range, span };
    slBox.appendChild(row);
  }
  function syncStepBtns() {
    if (btnPlus) btnPlus.textContent = '+' + st.k + ' \u6b65';
    if (btnMinus) btnMinus.textContent = '\u2212' + st.k + ' \u6b65';
  }
  makeRow('m', '\u6a21\u6570 m', 2, 16);
  makeRow('k', '\u6bcf\u6b21 +k', 1, Math.max(1, st.m - 1));

  function step(dir) {
    st.n += dir * st.k;
    draw();
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    W = r.W;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    const cx = Math.max(W * 0.27, 120);
    const cy = H * 0.54;
    const R = Math.min(H * 0.4, W * 0.24);
    const res = ((st.n % st.m) + st.m) % st.m;
    for (let i = 0; i < st.m; i++) {
      const a0 = -Math.PI / 2 + (i / st.m) * Math.PI * 2;
      const a1 = -Math.PI / 2 + ((i + 1) / st.m) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = i === res ? 'rgba(232,135,30,0.5)' : 'rgba(59,116,214,0.08)';
      ctx.fill();
      const mid = (a0 + a1) / 2;
      ctx.fillStyle = i === res ? '#b45309' : tc.fg;
      ctx.font = '600 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        String(i),
        cx + Math.cos(mid) * (R + 16),
        cy + Math.sin(mid) * (R + 16) + 4,
      );
    }
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    const mid = -Math.PI / 2 + ((res + 0.5) / st.m) * Math.PI * 2;
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 4;
    line(ctx, cx, cy, cx + Math.cos(mid) * R * 0.78, cy + Math.sin(mid) * R * 0.78);
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#e8871e';
    ctx.fill();
    const q = Math.floor(st.n / st.m);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('n mod m = ' + res, cx + R + 34, cy - 34);
    ctx.font = '13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(st.n + ' = ' + q + ' \u00d7 ' + st.m + ' + ' + res, cx + R + 34, cy - 4);
    ctx.fillText('\u65f6\u949f\u53ea\u6709 ' + st.m + ' \u4e2a\u523b\u5ea6\uff0c', cx + R + 34, cy + 28);
    ctx.fillText('\u8d70 ' + st.n + ' \u683c\u540e\u505c\u5728\u7b2c ' + res + ' \u683c', cx + R + 34, cy + 48);
    cap.textContent =
      '\u6bcf\u6b21 + ' + st.k + '\uff1an=' + st.n + ' \u2192 \u843d\u5728 ' + res +
      '\u3002\u8d85\u8fc7 ' + st.m + ' \u5c31\u7ed5\u56de\u6765\u2014\u2014\u8fd9\u5c31\u662f\u53d6\u4f59\u6570';
  }

  [
    ['+' + st.k + ' \u6b65', () => step(1)],
    ['\u2212' + st.k + ' \u6b65', () => step(-1)],
    ['\u5f52\u96f6', () => { st.n = 0; draw(); }],
  ].forEach(([label, fn], i) => {
    const b = mkBtn(label);
    if (i === 0) btnPlus = b;
    if (i === 1) btnMinus = b;
    b.addEventListener('click', fn);
    box.appendChild(b);
  });
  box.appendChild(slBox);
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 数论：埃拉托斯特尼筛 ---------- */

function renderSieve(host) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 350;
  const MAXN = 100;
  const COLS = 10;
  const ROWS = 10;
  const st = { status: {}, p: 2, done: false, found: 0 };
  let timer = null;
  let r = null;
  let W = 320;
  function reset() {
    if (timer) { clearInterval(timer); timer = null; }
    st.status = {};
    for (let v = 2; v <= MAXN; v++) st.status[v] = 0;
    st.p = 2;
    st.done = false;
    st.found = 0;
    cap.textContent = '\u7b2c\u4e00\u4e2a\u7d20\u6570\u662f 2\uff1a\u5148\u628a\u5b83\u6807\u7eff\uff0c\u518d\u5212\u6389\u5b83\u7684\u6240\u6709\u500d\u6570';
    draw();
  }
  function step() {
    if (st.done) return;
    if (st.status[st.p] === 0) {
      st.status[st.p] = 1;
      st.found++;
      let crossed = false;
      for (let q = st.p * st.p; q <= MAXN; q += st.p) {
        if (st.status[q] === 0) { st.status[q] = 2; crossed = true; }
      }
      cap.textContent = crossed
        ? '\u7d20\u6570 p=' + st.p + '\uff1a\u5df2\u5212\u6389 ' + st.p + '\u00d72, ' + st.p + '\u00d73, \u2026 \u8fd9\u4e9b\u5408\u6570'
        : '\u7d20\u6570 p=' + st.p + '\uff1ap\u00b2>100\uff0c\u6ca1\u6709\u65b0\u7684\u500d\u6570\u53ef\u5212';
    }
    do { st.p++; } while (st.p <= MAXN && st.status[st.p] !== 0);
    if (st.p > MAXN) {
      st.done = true;
      if (timer) { clearInterval(timer); timer = null; }
      cap.textContent =
        '\u7b5b\u5b8c\u4e86\uff01100 \u4ee5\u5185\u5171\u627e\u5230 ' + st.found +
        ' \u4e2a\u7d20\u6570\uff08\u7eff\u8272\u683c\u5b50\uff09\u2014\u2014\u5b83\u4eec\u662f\u4e58\u6cd5\u4e16\u754c\u7684\u201c\u539f\u5b50\u201d';
    }
    draw();
  }
  function toggleAuto(btn) {
    if (timer) {
      clearInterval(timer);
      timer = null;
      btn.textContent = '\u81ea\u52a8 \u25b6';
      return;
    }
    btn.textContent = '\u6682\u505c \u23f8';
    timer = setInterval(() => {
      if (!host.isConnected) { clearInterval(timer); timer = null; return; }
      if (st.done) { clearInterval(timer); timer = null; btn.textContent = '\u81ea\u52a8 \u25b6'; return; }
      step();
    }, 420);
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    W = r.W;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    const cw = Math.floor((W - 20) / COLS);
    const ch = Math.floor((H - 40) / ROWS);
    ctx.textAlign = 'center';
    for (let idx = 0; idx < (MAXN - 1); idx++) {
      const v = idx + 2;
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = 10 + col * cw;
      const y = 30 + row * ch;
      const stat = st.status[v];
      ctx.fillStyle = stat === 1 ? 'rgba(46,125,46,0.25)' : stat === 2 ? 'rgba(120,120,120,0.14)' : tc.bg;
      ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      ctx.strokeStyle = 'rgba(107,114,128,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4);
      if (stat === 1) {
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4);
      }
      ctx.fillStyle = stat === 2 ? '#9ca3af' : tc.fg;
      ctx.font = (stat === 1 ? '700 ' : '') + '13px monospace';
      ctx.fillText(String(v), x + cw / 2, y + ch / 2 + 5);
      if (stat === 2) {
        ctx.strokeStyle = 'rgba(179,38,30,0.6)';
        ctx.lineWidth = 1.4;
        line(ctx, x + 7, y + ch / 2, x + cw - 7, y + ch / 2);
      }
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(
      st.done ? '\u7b5b\u9009\u5b8c\u6210\uff01\u7d20\u6570 ' + st.found + ' \u4e2a'
        : '\u5f53\u524d\u8003\u5bdf p = ' + st.p + '\u3000\u5df2\u627e\u5230\u7d20\u6570 ' + st.found + ' \u4e2a',
      12, 20,
    );
  }
  [
    ['\u5355\u6b65 \u25b8', () => { if (timer) return; step(); }],
    ['\u81ea\u52a8 \u25b6', function () { toggleAuto(this); }],
    ['\u91cd\u7f6e', reset],
  ].forEach(([label, fn]) => {
    const b = mkBtn(label);
    b.addEventListener('click', fn);
    box.appendChild(b);
  });
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  reset();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 数论：欧几里得算法铺方块 ---------- */

function renderEuclid(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 320;
  const st = { a: clamp(spec.a || 21, 6, 36), b: clamp(spec.b || 15, 3, 30), idx: 0 };
  let ops = [];
  let levels = [];
  let gcdVal = 1;
  let timer = null;
  let r = null;

  function precompute() {
    ops = [];
    levels = [];
    let w = st.a;
    let h = st.b;
    let x0 = 0;
    let y0 = 0;
    let depth = 0;
    while (true) {
      const horiz = w >= h;
      const big = horiz ? w : h;
      const small = horiz ? h : w;
      const lv = { rect: { x: x0, y: y0, w, h }, startIdx: ops.length, log: '' };
      const q = Math.floor(big / small);
      const rem = big - q * small;
      for (let i = 0; i < q; i++) {
        if (horiz) ops.push({ x: x0 + i * small, y: y0, s: small, depth });
        else ops.push({ x: x0, y: y0 + i * small, s: small, depth });
      }
      gcdVal = small;
      lv.log = rem === 0
        ? big + ' = ' + q + ' \u00d7 ' + small + ' \u6574\u9664\uff01gcd = ' + small
        : big + ' = ' + q + ' \u00d7 ' + small + ' + ' + rem;
      levels.push(lv);
      if (rem === 0) break;
      if (horiz) { x0 += q * small; w = rem; } else { y0 += q * small; h = rem; }
      depth++;
    }
    st.idx = 0;
  }

  function curLevel() {
    let lv = 0;
    for (let i = 0; i < levels.length; i++) {
      if (st.idx >= levels[i].startIdx) lv = i;
    }
    return lv;
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    const u = Math.min((W - 60) / st.a, (H - 50) / st.b);
    const ox = (W - st.a * u) / 2;
    const oy = (H - st.b * u) / 2 + 8;
    const colors = ['#3b74d6', '#e8871e', '#2e7d32', '#7c3aed'];
    ctx.strokeStyle = tc.fg;
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, st.a * u, st.b * u);
    const lv = curLevel();
    const L = levels[lv];
    for (let i = 0; i < st.idx; i++) {
      const op = ops[i];
      ctx.fillStyle = colors[op.depth % 4];
      ctx.globalAlpha = 0.4 + 0.1 * (op.depth % 2);
      ctx.fillRect(ox + op.x * u, oy + op.y * u, op.s * u, op.s * u);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors[op.depth % 4];
      ctx.strokeRect(ox + op.x * u, oy + op.y * u, op.s * u, op.s * u);
    }
    if (L) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#b3261e';
      ctx.strokeRect(ox + L.rect.x * u, oy + L.rect.y * u, L.rect.w * u, L.rect.h * u);
      ctx.setLineDash([]);
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(L ? L.log.replace(/=.*$/, '= …') : '', ox, 22);
    const done = st.idx >= ops.length;
    cap.textContent = done
      ? '\u94fa\u6ee1\u4e86\uff01\u6700\u5927\u65b9\u5757\u7684\u8fb9\u957f = ' + gcdVal +
        '\uff0c\u8fd9\u5c31\u662f gcd(' + st.a + ', ' + st.b + ') = ' + gcdVal
      : L ? L.log + '\uff08\u7ea2\u8272\u865a\u7ebf = \u8fd8\u6ca1\u94fa\u6ee1\u7684\u90e8\u5206\uff0c\u7ee7\u7eed\u7528\u5b83\u7684\u77ed\u8fb9\u94fa\uff09'
        : '';
  }

  function nextOne() {
    if (timer) return;
    if (st.idx < ops.length) {
      st.idx++;
      draw();
    }
  }
  function auto(btn) {
    if (timer) {
      clearInterval(timer);
      timer = null;
      btn.textContent = '\u81ea\u52a8 \u25b6';
      return;
    }
    btn.textContent = '\u6682\u505c \u23f8';
    timer = setInterval(() => {
      if (!host.isConnected || st.idx >= ops.length) {
        clearInterval(timer);
        timer = null;
        btn.textContent = '\u81ea\u52a8 \u25b6';
        return;
      }
      st.idx++;
      draw();
    }, 380);
  }

  const sl = buildSliders(
    {
      sliders: [
        { name: 'a', min: 6, max: 36, step: 1, value: st.a },
        { name: 'b', min: 3, max: 30, step: 1, value: st.b },
      ],
    },
    (state) => {
      if (timer) { clearInterval(timer); timer = null; }
      st.a = Math.max(6, Math.round(state.a));
      st.b = Math.max(3, Math.round(state.b));
      if (st.b >= st.a) st.b = st.a - 1;
      precompute();
      draw();
    },
  );
  [
    ['\u94fa\u4e00\u5757 \u25b8', nextOne],
    ['\u81ea\u52a8 \u25b6', function () { auto(this); }],
    ['\u91cd\u6765', () => { if (timer) { clearInterval(timer); timer = null; } st.idx = 0; draw(); }],
  ].forEach(([label, fn]) => {
    const b = mkBtn(label);
    b.addEventListener('click', fn);
    box.appendChild(b);
  });
  box.appendChild(sl.box);
  precompute();
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 线代公共：平面坐标映射与箭头 ---------- */

function planeMap(W, H, hx, hy) {
  const pad = 16;
  const s = Math.min((W - pad * 2) / (2 * hx), (H - pad * 2) / (2 * hy));
  return {
    s,
    cx: W / 2,
    cy: H / 2,
    X: (x) => W / 2 + x * s,
    Y: (y) => H / 2 - y * s,
    invX: (px) => (px - W / 2) / s,
    invY: (py) => (H / 2 - py) / s,
  };
}

function arrow(ctx, x0, y0, x1, y1, color, width) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  line(ctx, x0, y0, x1, y1);
  if (Math.hypot(x1 - x0, y1 - y0) < 8) return;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const hl = Math.max(9, width * 3.4);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - hl * Math.cos(ang - Math.PI / 7), y1 - hl * Math.sin(ang - Math.PI / 7));
  ctx.lineTo(x1 - hl * Math.cos(ang + Math.PI / 7), y1 - hl * Math.sin(ang + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

/* ---------- 线代：向量加法平行四边形 ---------- */

function renderVecadd(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 300;
  const HX = 6.5;
  const HY = 3.5;
  const st = {
    u: { x: spec.u ? spec.u[0] : 3, y: spec.u ? spec.u[1] : 1 },
    v: { x: spec.v ? spec.v[0] : -1, y: spec.v ? spec.v[1] : 2 },
  };
  let r = null;
  let pm = null;
  const geo = {};
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, HX, HY);
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    ctx.lineWidth = 1;
    for (let gx = -Math.ceil(HX); gx <= Math.ceil(HX); gx++) {
      ctx.strokeStyle = gx === 0 ? 'rgba(107,114,128,0.5)' : 'rgba(107,114,128,0.14)';
      line(ctx, pm.X(gx), pm.Y(-HY), pm.X(gx), pm.Y(HY));
    }
    for (let gy = -Math.ceil(HY); gy <= Math.ceil(HY); gy++) {
      ctx.strokeStyle = gy === 0 ? 'rgba(107,114,128,0.5)' : 'rgba(107,114,128,0.14)';
      line(ctx, pm.X(-HX), pm.Y(gy), pm.X(HX), pm.Y(gy));
    }
    const S = { x: st.u.x + st.v.x, y: st.u.y + st.v.y };
    const pU = { x: pm.X(st.u.x), y: pm.Y(st.u.y) };
    const pV = { x: pm.X(st.v.x), y: pm.Y(st.v.y) };
    const pS = { x: pm.X(S.x), y: pm.Y(S.y) };
    geo.pU = pU;
    geo.pV = pV;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(59,116,214,0.45)';
    ctx.lineWidth = 1.2;
    line(ctx, pU.x, pU.y, pS.x, pS.y);
    ctx.strokeStyle = 'rgba(46,125,50,0.45)';
    line(ctx, pV.x, pV.y, pS.x, pS.y);
    ctx.setLineDash([]);
    arrow(ctx, pm.cx, pm.cy, pU.x, pU.y, '#3b74d6', 2.6);
    arrow(ctx, pm.cx, pm.cy, pV.x, pV.y, '#2e7d32', 2.6);
    arrow(ctx, pm.cx, pm.cy, pS.x, pS.y, '#7c3aed', 3.2);
    [[pU, 'u'], [pV, 'v'], [pS, 'u+v']].forEach(([p, name]) => {
      ctx.fillStyle = tc.fg;
      ctx.font = '600 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(name, p.x + (p.x > pm.cx ? 22 : -22), p.y + (p.y > pm.cy ? 18 : -10));
    });
    cap.textContent =
      'u=(' + st.u.x + ', ' + st.u.y + ')\uff0cv=(' + st.v.x + ', ' + st.v.y +
      ')\uff0cu+v=(' + S.x + ', ' + S.y + ')\u3000\u2014\u2014 \u62d6\u52a8\u84dd/\u7eff\u7bad\u5934\uff0c\u5e73\u884c\u56db\u8fb9\u5f62\u7684\u5bf9\u89d2\u7ebf\u5c31\u662f\u548c';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.pU) return null;
      if (Math.hypot(x - geo.pU.x, y - geo.pU.y) <= 18) return 'u';
      if (Math.hypot(x - geo.pV.x, y - geo.pV.y) <= 18) return 'v';
      return null;
    },
    move(id, x, y) {
      st[id] = {
        x: clamp(Math.round(pm.invX(x) * 2) / 2, -HX + 0.5, HX - 0.5),
        y: clamp(Math.round(pm.invY(y) * 2) / 2, -HY + 0.5, HY - 0.5),
      };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 线代：点积、夹角与投影 ---------- */

function renderDotprod(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 320;
  const HX = 6.5;
  const HY = 3.8;
  const showShadow = spec.shadow !== false;
  const st = {
    u: { x: spec.u ? spec.u[0] : 4, y: spec.u ? spec.u[1] : 1 },
    v: { x: spec.v ? spec.v[0] : 1, y: spec.v ? spec.v[1] : 2 },
  };
  let r = null;
  let pm = null;
  const geo = {};
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, HX, HY);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (let gx = -Math.ceil(HX); gx <= Math.ceil(HX); gx++) {
      ctx.strokeStyle = gx === 0 ? 'rgba(107,114,128,0.5)' : 'rgba(107,114,128,0.12)';
      line(ctx, pm.X(gx), pm.Y(-HY), pm.X(gx), pm.Y(HY));
    }
    for (let gy = -Math.ceil(HY); gy <= Math.ceil(HY); gy++) {
      ctx.strokeStyle = gy === 0 ? 'rgba(107,114,128,0.5)' : 'rgba(107,114,128,0.12)';
      line(ctx, pm.X(-HX), pm.Y(gy), pm.X(HX), pm.Y(gy));
    }
    const tc = themeColors();
    const dot = st.u.x * st.v.x + st.u.y * st.v.y;
    const lu = Math.hypot(st.u.x, st.u.y) || 1;
    const lv = Math.hypot(st.v.x, st.v.y) || 1;
    const cosA = dot / (lu * lv);
    const deg = (Math.acos(clamp(cosA, -1, 1)) * 180) / Math.PI;
    if (showShadow && lu > 0.01 && lv > 0.01) {
      const k = dot / (st.v.x * st.v.x + st.v.y * st.v.y);
      const F = { x: k * st.v.x, y: k * st.v.y };
      const pF = { x: pm.X(F.x), y: pm.Y(F.y) };
      const pU = { x: pm.X(st.u.x), y: pm.Y(st.u.y) };
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(179,38,30,0.6)';
      ctx.lineWidth = 1.4;
      line(ctx, pU.x, pU.y, pF.x, pF.y);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(232,135,30,0.85)';
      ctx.lineWidth = 5;
      line(ctx, pm.cx, pm.cy, pF.x, pF.y);
      ctx.beginPath();
      ctx.arc(pF.x, pF.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = tc.bg;
      ctx.fill();
      ctx.strokeStyle = '#e8871e';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    arrow(ctx, pm.cx, pm.cy, pm.X(st.u.x), pm.Y(st.u.y), '#3b74d6', 2.6);
    arrow(ctx, pm.cx, pm.cy, pm.X(st.v.x), pm.Y(st.v.y), '#2e7d32', 2.6);
    const aU = Math.atan2(st.u.y, st.u.x);
    const aV = Math.atan2(st.v.y, st.v.x);
    let dAng = aV - aU;
    while (dAng > Math.PI) dAng -= Math.PI * 2;
    while (dAng < -Math.PI) dAng += Math.PI * 2;
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 26; k++) {
      const t = aU + (dAng * k) / 26;
      const px = pm.cx + Math.cos(t) * 30;
      const py = pm.cy - Math.sin(t) * 30;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const bis = aU + dAng / 2;
    ctx.fillStyle = '#b45309';
    ctx.font = '600 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(deg.toFixed(0) + '\u00b0', pm.cx + Math.cos(bis) * 48, pm.cy - Math.sin(bis) * 48 + 4);
    if (showShadow) {
      ctx.font = '700 12px system-ui';
      ctx.fillText('\u6295\u5f71', (pm.cx + pm.X((dot / lv) * (st.v.x / lv))) / 2,
        (pm.cy + pm.Y((dot / lv) * (st.v.y / lv))) / 2 - 10);
    }
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(
      'u\u00b7v = (' + st.u.x + ')(' + st.v.x + ') + (' + st.u.y + ')(' + st.v.y + ') = ' + dot.toFixed(1),
      16, 22,
    );
    ctx.font = '600 13px system-ui';
    if (Math.abs(cosA) < 0.08) {
      ctx.fillStyle = tc.axis;
      ctx.fillText('垂直！点积恰好为 0', 16, 42);
      ctx.strokeStyle = tc.axis;
      ctx.lineWidth = 1.4;
      const q = 14;
      const ex = st.v.x / lv;
      const ey = st.v.y / lv;
      const fx = st.u.x / lu;
      const fy = st.u.y / lu;
      ctx.beginPath();
      ctx.moveTo(pm.cx + ex * q, pm.cy - ey * q);
      ctx.lineTo(pm.cx + (ex + fx) * q, pm.cy - (ey + fy) * q);
      ctx.lineTo(pm.cx + fx * q, pm.cy - fy * q);
      ctx.stroke();
    } else if (cosA > 0) {
      ctx.fillStyle = '#2e7d32';
      ctx.fillText('夹角锐角 → 点积为正（同向）', 16, 42);
    } else {
      ctx.fillStyle = '#b3261e';
      ctx.fillText('夹角钝角 → 点积为负（反向）', 16, 42);
    }
    cap.textContent =
      '\u6295\u5f71\uff1au \u5728 v \u65b9\u5411\u4e0a\u7684\u201c\u5f71\u5b50\u957f\u5ea6\u201d = |u|\u00b7cos\u03b8 = ' +
      (lu * cosA / 1).toFixed(2) + '\uff08\u6a59\u8272\u7c97\u6bb5\uff09\u3002\u70b9\u79ef\u628a\u5939\u89d2\u4fe1\u606f\u538b\u7f29\u6210\u4e00\u4e2a\u6570';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      void pm;
      const pu = { x: pm ? pm.X(st.u.x) : 0, y: pm ? pm.Y(st.u.y) : 0 };
      const pv = { x: pm ? pm.X(st.v.x) : 0, y: pm ? pm.Y(st.v.y) : 0 };
      if (Math.hypot(x - pu.x, y - pu.y) <= 18) return 'u';
      if (Math.hypot(x - pv.x, y - pv.y) <= 18) return 'v';
      return null;
    },
    move(id, x, y) {
      st[id] = {
        x: clamp(Math.round(pm.invX(x) * 2) / 2, -HX + 0.5, HX - 0.5),
        y: clamp(Math.round(pm.invY(y) * 2) / 2, -HY + 0.5, HY - 0.5),
      };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 线代：矩阵变形机 ---------- */

function renderMatrix(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 320;
  const HX = 5.5;
  const HY = 4;
  const HOUSE = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]];
  const st = {
    a: spec.a != null ? spec.a : 1,
    b: spec.b != null ? spec.b : 0,
    c: spec.c != null ? spec.c : 0,
    d: spec.d != null ? spec.d : 1,
  };
  let r = null;
  function M(x, y) {
    return { x: st.a * x + st.b * y, y: st.c * x + st.d * y };
  }
  function P(pt, pm) {
    const q = M(pt[0], pt[1]);
    return { x: pm.X(q.x), y: pm.Y(q.y) };
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const pm = planeMap(W, H, HX, HY);
    ctx.clearRect(0, 0, W, H);
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = tc.grid;
    ctx.lineWidth = 1;
    line(ctx, pm.X(-HX), pm.Y(0), pm.X(HX), pm.Y(0));
    line(ctx, pm.X(0), pm.Y(-HY), pm.X(0), pm.Y(HY));
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(59,116,214,0.28)';
    ctx.lineWidth = 1;
    const R = 7;
    for (let i = -R; i <= R; i++) {
    let p1 = P([i, -R], pm);
      let p2 = P([i, R], pm);
      line(ctx, p1.x, p1.y, p2.x, p2.y);
      p1 = P([-R, i], pm);
      p2 = P([R, i], pm);
      line(ctx, p1.x, p1.y, p2.x, p2.y);
    }
    const eigenPairs = eigGeneral2(st.a, st.b, st.c, st.d);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(124,58,237,0.55)';
    ctx.lineWidth = 3;
    eigenPairs.forEach((pair) => {
      line(
        ctx,
        pm.X(-pair.v[0] * HX),
        pm.Y(-pair.v[1] * HY),
        pm.X(pair.v[0] * HX),
        pm.Y(pair.v[1] * HY),
      );
    });
    ctx.setLineDash([]);
    const det = st.a * st.d - st.b * st.c;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    HOUSE.forEach((pt, i) => {
      const p = P(pt, pm);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    const iHat = P([1, 0], pm);
    const jHat = P([0, 1], pm);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1;
    line(ctx, pm.cx, pm.cy, pm.X(1), pm.Y(0));
    line(ctx, pm.cx, pm.cy, pm.X(0), pm.Y(1));
    ctx.setLineDash([]);
    arrow(ctx, pm.cx, pm.cy, iHat.x, iHat.y, '#3b74d6', 4);
    arrow(ctx, pm.cx, pm.cy, jHat.x, jHat.y, '#e8871e', 4);
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#3b74d6';
    ctx.fillText('(' + st.a + ', ' + st.c + ')', iHat.x + 10, iHat.y + 4);
    ctx.fillStyle = '#b45309';
    ctx.fillText('(' + st.b + ', ' + st.d + ')', jHat.x + 10, jHat.y + 4);
    ctx.font = '600 14px monospace';
    ctx.fillStyle = det === 0 ? tc.axis : det > 0 ? '#2e7d32' : '#b3261e';
    ctx.fillText(
      '\u884c\u5217\u5f0f ad\u2212bc = ' + Number(det.toFixed(2)) +
        (det === 0 ? '\uff08\u538b\u6210\u4e00\u6761\u7ebf\uff09'
          : det > 0 ? '\uff08\u9762\u79ef \u00d7' + det.toFixed(2) + '\uff09'
            : '\uff08\u7ffb\u8f6c\uff01\u9762\u79ef \u00d7' + Math.abs(det).toFixed(2) + '\uff09'),
      16, 24,
    );
    cap.textContent =
      '\u77e9\u9635\u4e24\u5217\u5c31\u662f\u57fa\u5411\u91cf\u7684\u843d\u70b9\uff1a\u00ee\u2192(' + st.a + ',' + st.c +
      ')\u3001\u0235\u2192(' + st.b + ',' + st.d + ')\u3002\u7f51\u683c\u548c\u5c0f\u623f\u5b50\u8ddf\u7740\u57fa\u4e00\u8d77\u88ab\u62c9\u52a8\u2014\u2014\u8fd9\u5c31\u662f\u7ebf\u6027\u53d8\u6362';
  }
  const sl = buildSliders(
    {
      sliders: [
        { name: 'a', ...expandedRange(st.a, -2, 2), step: 0.25, value: st.a },
        { name: 'b', ...expandedRange(st.b, -2, 2), step: 0.25, value: st.b },
        { name: 'c', ...expandedRange(st.c, -2, 2), step: 0.25, value: st.c },
        { name: 'd', ...expandedRange(st.d, -2, 2), step: 0.25, value: st.d },
      ],
    },
    (state) => {
      Object.assign(st, state);
      draw();
    },
  );
  [
    ['\u5355\u4f4d', [1, 0, 0, 1]],
    ['\u5de6\u8f6c90\u00b0', [0, -1, 1, 0]],
    ['\u526a\u5207', [1, 1, 0, 1]],
    ['\u538b\u6241', [1, 0, 0, 0]],
  ].forEach(([label, vals]) => {
    const b = mkBtn(label);
    b.addEventListener('click', () => {
      ['a', 'b', 'c', 'd'].forEach((k, i) => {
        st[k] = vals[i];
        sl.refs[k].range.value = String(vals[i]);
        sl.refs[k].val.textContent = String(vals[i]);
      });
      draw();
    });
    box.appendChild(b);
  });
  box.appendChild(sl.box);
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 复数：复平面与共轭/极形式 ---------- */

function renderComplexplane(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 320;
  const st = {
    z: { x: spec.z ? spec.z[0] : 1.5, y: spec.z && spec.z[1] != null ? spec.z[1] : 1 },
    polar: false,
  };
  let r = null;
  let pm = null;
  const geo = {};
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, 4.5, 3);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (let gx = -4; gx <= 4; gx++) {
      ctx.strokeStyle = gx === 0 ? 'rgba(107,114,128,0.55)' : 'rgba(107,114,128,0.12)';
      line(ctx, pm.X(gx), pm.Y(-3), pm.X(gx), pm.Y(3));
    }
    for (let gy = -2; gy <= 2; gy++) {
      ctx.strokeStyle = gy === 0 ? 'rgba(107,114,128,0.55)' : 'rgba(107,114,128,0.12)';
      line(ctx, pm.X(-4), pm.Y(gy), pm.X(4), pm.Y(gy));
    }
    const tc = themeColors();
    ctx.fillStyle = tc.axis;
    ctx.font = '600 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('\u5b9e\u8f74 Re', pm.X(4.5) - 36, pm.Y(0) - 8);
    ctx.fillText('\u865a\u8f74 Im', pm.X(0) + 6, pm.Y(3) - 8);
    const mod = Math.hypot(st.z.x, st.z.y);
    if (mod > 0.02) {
      ctx.strokeStyle = 'rgba(124,58,237,0.35)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(pm.cx, pm.cy, mod * pm.s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const pz = { x: pm.X(st.z.x), y: pm.Y(st.z.y) };
    const pc = { x: pz.x, y: pm.Y(-st.z.y) };
    geo.pz = pz;
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(107,114,128,0.5)';
    line(ctx, pz.x, pz.y, pc.x, pc.y);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(pc.x, pc.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = tc.bg;
    ctx.fill();
    ctx.setLineDash([3, 2]);
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 13px monospace';
    ctx.fillStyle = tc.axis;
    ctx.fillText('z\u0304', pc.x + 11, pc.y - 7);
    arrow(ctx, pm.cx, pm.cy, pz.x, pz.y, '#7c3aed', 2.6);
    ctx.beginPath();
    ctx.arc(pz.x, pz.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.strokeStyle = tc.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillText('z', pz.x + 13, pz.y - 9);
    const fmtC = (v) => Number(v.toFixed(2));
    ctx.textAlign = 'left';
    ctx.font = '600 14px monospace';
    ctx.fillStyle = tc.fg;
    if (!st.polar) {
      ctx.fillText(
        'z  = ' + fmtC(st.z.x) + (st.z.y < 0 ? ' \u2212 ' : ' + ') + Math.abs(fmtC(st.z.y)) + 'i',
        16, 24,
      );
      ctx.fillStyle = tc.axis;
      ctx.font = '600 12px monospace';
      ctx.fillText(
        'z\u0304 = ' + fmtC(st.z.x) + (st.z.y < 0 ? ' + ' : ' \u2212 ') + Math.abs(fmtC(st.z.y)) +
          'i\u3000|z|=' + fmtC(mod),
        16, 44,
      );
    } else {
      const deg = ((Math.atan2(st.z.y, st.z.x) * 180) / Math.PI).toFixed(0);
      ctx.fillText(
        'z = ' + fmtC(mod) + '(cos ' + deg + '\u00b0 + i\u00b7sin ' + deg + '\u00b0)',
        16, 24,
      );
      ctx.fillStyle = tc.axis;
      ctx.font = '600 12px monospace';
      ctx.fillText('|z|=' + fmtC(mod) + '\uff08\u6a21\uff09\u3000arg z=' + deg + '\u00b0\uff08\u8f90\u89d2\uff09', 16, 44);
    }
    cap.textContent =
      '\u767d\u8272\u865a\u70b9 = \u5171\u8f6d z\u0304\uff08\u6cbf\u5b9e\u8f74\u7167\u955c\u5b50\uff09\uff1b' +
      '\u7d2b\u8272\u865a\u7ebf\u5706 = |z|\u3002\u62d6\u52a8 z\uff0c\u770b\u5171\u8f6d/\u6a21/\u8f90\u89d2\u600e\u4e48\u53d8';
  }
  const btn = mkBtn('\u663e\u793a\u6781\u5f62\u5f0f');
  btn.addEventListener('click', () => {
    st.polar = !st.polar;
    btn.textContent = st.polar ? '\u663e\u793a\u4ee3\u6570\u5f62\u5f0f' : '\u663e\u793a\u6781\u5f62\u5f0f';
    draw();
  });
  box.appendChild(btn);
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return geo.pz && Math.hypot(x - geo.pz.x, y - geo.pz.y) <= 18 ? 'z' : null;
    },
    move(id, x, y) {
      st.z = {
        x: clamp(Math.round(pm.invX(x) * 4) / 4, -4.25, 4.25),
        y: clamp(Math.round(pm.invY(y) * 4) / 4, -2.75, 2.75),
      };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 复数：乘法 = 旋转 + 伸缩 ---------- */

function renderComplexmult(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const tools = document.createElement('div');
  tools.className = 'ml-viz__controls';
  host.appendChild(tools);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 320;
  const st = {
    z: { x: spec.z ? spec.z[0] : 1, y: spec.z && spec.z[1] != null ? spec.z[1] : 0.5 },
    wAbs: spec.wAbs != null ? spec.wAbs : 1,
    wDeg: spec.wDeg != null ? spec.wDeg : 90,
  };
  let r = null;
  let pm = null;
  const geo = {};
  const norm180 = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, 4.5, 3);
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    ctx.lineWidth = 1;
    for (let gx = -4; gx <= 4; gx++) {
      ctx.strokeStyle = gx === 0 ? 'rgba(107,114,128,0.55)' : 'rgba(107,114,128,0.12)';
      line(ctx, pm.X(gx), pm.Y(-3), pm.X(gx), pm.Y(3));
    }
    for (let gy = -2; gy <= 2; gy++) {
      ctx.strokeStyle = gy === 0 ? 'rgba(107,114,128,0.55)' : 'rgba(107,114,128,0.12)';
      line(ctx, pm.X(-4), pm.Y(gy), pm.X(4), pm.Y(gy));
    }
    ctx.strokeStyle = 'rgba(124,58,237,0.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(pm.cx, pm.cy, pm.s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const rad = (st.wDeg * Math.PI) / 180;
    const w = { x: st.wAbs * Math.cos(rad), y: st.wAbs * Math.sin(rad) };
    const zw = {
      x: st.z.x * w.x - st.z.y * w.y,
      y: st.z.x * w.y + st.z.y * w.x,
    };
    const pz = { x: pm.X(clamp(st.z.x, -4.25, 4.25)), y: pm.Y(clamp(st.z.y, -2.75, 2.75)) };
    const pw = { x: pm.X(w.x), y: pm.Y(w.y) };
    const pzw = { x: pm.X(zw.x), y: pm.Y(zw.y) };
    geo.pz = pz;
    const az = Math.atan2(st.z.y, st.z.x);
    const azw = Math.atan2(zw.y, zw.x);
    ctx.strokeStyle = 'rgba(232,135,30,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 30; k++) {
      const tt = az + shortestDelta(az, azw) * (k / 30);
      const px = pm.cx + Math.cos(tt) * 40;
      const py = pm.cy - Math.sin(tt) * 40;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    arrow(ctx, pm.cx, pm.cy, pw.x, pw.y, '#2e7d32', 1.8);
    arrow(ctx, pm.cx, pm.cy, pz.x, pz.y, '#3b74d6', 2.4);
    arrow(ctx, pm.cx, pm.cy, pzw.x, pzw.y, '#7c3aed', 3);
    ctx.font = '700 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3b74d6';
    ctx.fillText('z', pz.x + 14, pz.y - 10);
    ctx.fillStyle = '#2e7d32';
    ctx.fillText('w', pw.x + 14, pw.y - 10);
    ctx.fillStyle = '#7c3aed';
    ctx.fillText('zw', pzw.x + 16, pzw.y - 10);
    const argZ = norm180((az * 180) / Math.PI);
    const argW = norm180(st.wDeg);
    const argZW = norm180((azw * 180) / Math.PI);
    const modZ = Math.hypot(st.z.x, st.z.y);
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(
      '\u8f90\u89d2\uff1a' + argZ.toFixed(0) + '\u00b0 + (' + argW.toFixed(0) + '\u00b0) = ' +
        norm180(argZ + argW).toFixed(0) + '\u00b0',
      16, 24,
    );
    ctx.fillStyle = '#7c3aed';
    ctx.fillText(
      'arg(zw) = ' + argZW.toFixed(0) + '\u00b0 \u2713',
      16, 46,
    );
    ctx.fillStyle = tc.fg;
    ctx.fillText(
      '\u6a21\uff1a' + modZ.toFixed(2) + ' \u00d7 ' + Number(st.wAbs.toFixed(2)) + ' = ' +
        (modZ * st.wAbs).toFixed(2),
      16, 68,
    );
    cap.textContent = spec.caption ||
      '\u4e58\u4ee5 i\uff08|w|=1\u3001\u89d2=90\u00b0\uff09\u5c31\u662f\u9006\u65f6\u9488\u8f6c 90\u00b0\u2014\u2014' +
      '\u590d\u6570\u4e58\u6cd5 = \u89d2\u5ea6\u76f8\u52a0 + \u957f\u5ea6\u76f8\u4e58\uff08\u62d6\u84dd\u8272 z \u8bd5\u8bd5\uff09';
  }
  const sl = buildSliders(
    {
      sliders: [
        { name: '|w|', min: 0.05, max: 2, step: 'any', value: st.wAbs },
        { name: '\u89d2w', min: -180, max: 180, step: 'any', value: st.wDeg },
      ],
    },
    (state) => {
      st.wAbs = state['|w|'];
      st.wDeg = state['\u89d2w'];
      draw();
    },
  );
  const swapBtn = mkBtn('\u4ea4\u6362 z \u4e0e w');
  swapBtn.addEventListener('click', () => {
    const modZ = Math.hypot(st.z.x, st.z.y);
    const argZ = (Math.atan2(st.z.y, st.z.x) * 180) / Math.PI;
    const oldW = {
      x: st.wAbs * Math.cos((st.wDeg * Math.PI) / 180),
      y: st.wAbs * Math.sin((st.wDeg * Math.PI) / 180),
    };
    st.z = { x: oldW.x, y: oldW.y };
    st.wAbs = modZ;
    st.wDeg = argZ;
    sl.refs['|w|'].range.value = String(modZ);
    sl.refs['|w|'].val.textContent = Number(modZ.toFixed(2));
    sl.refs['\u89d2w'].range.value = String(argZ);
    sl.refs['\u89d2w'].val.textContent = Math.round(argZ);
    draw();
  });
  tools.appendChild(swapBtn);
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return geo.pz && Math.hypot(x - geo.pz.x, y - geo.pz.y) <= 18 ? 'z' : null;
    },
    move(id, x, y) {
      let zx = clamp(Math.round(pm.invX(x) * 4) / 4, -4.25, 4.25);
      let zy = clamp(Math.round(pm.invY(y) * 4) / 4, -2.75, 2.75);
      const modZ = Math.hypot(zx, zy);
      if (modZ > 2) {
        zx *= 2 / modZ;
        zy *= 2 / modZ;
      }
      st.z = {
        x: zx,
        y: zy,
      };
      draw();
    },
  });
  draw();
  return { slidersBox: sl.box };
}

function shortestDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* ---------- 微积分：割线滑向切线 ---------- */

function renderDerivative(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 300;
  const xmin = spec.xmin != null ? spec.xmin : -3.5;
  const xmax = spec.xmax != null ? spec.xmax : 3.5;
  let fn = null;
  try {
    fn = compileExpr(spec.expr || 'x^2', ['x']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return {};
  }
  const F = (x) => {
    try { return fn({ x }); } catch (e) { return NaN; }
  };
  const fprime = (x) => (F(x + 1e-4) - F(x - 1e-4)) / 2e-4;
  const HL = [1.5, 1, 0.5, 0.2, 0.1, 0.05, 0.01];
  const st = { a: spec.a != null ? spec.a : 1, hi: 0 };
  let r = null;
  let pm = null;
  const geo = {};
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const padL = 34;
    const padR = 14;
    const padT = 46;
    const padB = 24;
    const N = 260;
    const tc = themeColors();
    const xs = [];
    const ys = [];
    for (let k = 0; k <= N; k++) {
      const x = xmin + ((xmax - xmin) * k) / N;
      xs.push(x);
      ys.push(F(x));
    }
    const finite = ys.filter(Number.isFinite);
    let ymin = finite.length ? Math.min(...finite) : -1;
    let ymax = finite.length ? Math.max(...finite) : 1;
    if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
    const padY = (ymax - ymin) * 0.14;
    ymin -= padY;
    ymax += padY;
    const X = (x) => padL + ((x - xmin) / (xmax - xmin)) * (W - padL - padR);
    const Y = (y) => padT + (1 - (y - ymin) / (ymax - ymin)) * (H - padT - padB);
    pm = { X, Y, invX: (px) => xmin + ((px - padL) / (W - padL - padR)) * (xmax - xmin) };
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(107,114,128,0.18)';
    ctx.lineWidth = 1;
    for (let g = 1; g < 6; g++) line(ctx, padL, padT + ((H - padT - padB) * g) / 6, W - padR, padT + ((H - padT - padB) * g) / 6);
    if (ymin < 0 && ymax > 0) {
      ctx.strokeStyle = 'rgba(107,114,128,0.5)';
      line(ctx, padL, Y(0), W - padR, Y(0));
    }
    if (xmin < 0 && xmax > 0) {
      ctx.strokeStyle = 'rgba(107,114,128,0.5)';
      line(ctx, X(0), padT, X(0), H - padB);
    }
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= N; k++) {
      if (!Number.isFinite(ys[k]) || Math.abs(ys[k]) > 1e6) { pen = false; continue; }
      const px = X(xs[k]);
      const py = Y(Math.max(Math.min(ys[k], ymax + 5), ymin - 5));
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const h = HL[st.hi];
    const fa = F(st.a);
    const fb = F(st.a + h);
    const secSlope = (fb - fa) / h;
    const tanSlope = fprime(st.a);
    const drawLine = (slope, color, dash) => {
      const x1 = xmin;
      const x2 = xmax;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (dash) ctx.setLineDash([6, 4]);
      line(ctx, X(x1), Y(fa + slope * (x1 - st.a)), X(x2), Y(fa + slope * (x2 - st.a)));
      ctx.setLineDash([]);
    };
    drawLine(secSlope, '#e8871e', false);
    drawLine(tanSlope, 'rgba(46,125,50,0.75)', true);
    const pA = { x: X(st.a), y: Y(fa) };
    const pB = { x: X(st.a + h), y: Y(fb) };
    geo.pA = pA;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(179,38,30,0.55)';
    ctx.lineWidth = 1.2;
    line(ctx, pA.x, pA.y, pB.x, pA.y);
    line(ctx, pB.x, pA.y, pB.x, pB.y);
    ctx.setLineDash([]);
    ctx.font = '600 11px monospace';
    ctx.fillStyle = '#b3261e';
    ctx.textAlign = 'center';
    ctx.fillText('\u0394x=' + h, (pA.x + pB.x) / 2, pA.y + 14);
    [[pA, '#3b74d6'], [pB, '#e8871e']].forEach(([p, c]) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.strokeStyle = tc.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = '#e8871e';
    ctx.fillText(
      '\u5272\u7ebf\u659c\u7387 = (' + Number(fb.toFixed(3)) + '\u2212' + Number(fa.toFixed(3)) +
        ')/' + h + ' = ' + secSlope.toFixed(4),
      padL + 4, 20,
    );
    ctx.fillStyle = '#2e7d32';
    ctx.fillText(
      '\u5207\u7ebf\u659c\u7387 f\u2032(a) \u2248 ' + tanSlope.toFixed(4) +
        '\u3000\u5dee\u503c ' + Math.abs(secSlope - tanSlope).toFixed(4),
      padL + 4, 38,
    );
    cap.textContent =
      '\u6bcf\u6309\u4e00\u6b21\u201ch\u00f72\u201d\uff0c\u6a59\u8272\u5272\u7ebf\u5c31\u66f4\u8d34\u8fd1\u7eff\u8272\u5207\u7ebf' +
      '\u2014\u2014h \u8d8b\u4e8e 0 \u65f6\u5272\u7ebf\u659c\u7387\u7684\u6781\u9650\u5c31\u662f\u5bfc\u6570\uff08\u84dd\u70b9\u53ef\u6cbf\u66f2\u7ebf\u62d6\uff09';
  }
  const sl = buildSliders(
    {
      sliders: [
        { name: 'a', min: xmin + 0.5, max: xmax - 0.5, step: 0.25, value: st.a },
      ],
    },
    (state) => {
      st.a = state.a;
      draw();
    },
  );
  [
    ['h \u00f7 2', () => { st.hi = Math.min(st.hi + 1, HL.length - 1); draw(); }],
    ['\u91cd\u7f6e h=1.5', () => { st.hi = 0; draw(); }],
  ].forEach(([label, fn2]) => {
    const b = mkBtn(label);
    b.addEventListener('click', fn2);
    box.appendChild(b);
  });
  box.appendChild(sl.box);
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return geo.pA && Math.hypot(x - geo.pA.x, y - geo.pA.y) <= 20 ? 'a' : null;
    },
    move(id, x) {
      st.a = clamp(Math.round(pm.invX(x) * 4) / 4, xmin + 0.5, xmax - 0.5);
      sl.refs.a.range.value = String(st.a);
      sl.refs.a.val.textContent = String(st.a);
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 微积分：黎曼和 ---------- */

function renderRiemann(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 300;
  const xmin = spec.xmin != null ? spec.xmin : 0;
  const xmax = spec.xmax != null ? spec.xmax : 2;
  let fn = null;
  try {
    fn = compileExpr(spec.expr || 'x^2', ['x']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return {};
  }
  const F = (x) => {
    try { const v = fn({ x }); return Number.isFinite(v) ? v : NaN; } catch (e) { return NaN; }
  };
  const M = 2000;
  const dxFine = (xmax - xmin) / M;
  let exact = 0;
  for (let k = 0; k < M; k++) exact += F(xmin + (k + 0.5) * dxFine);
  exact *= dxFine;
  const st = { n: spec.n || 8, rule: 'mid' };
  let r = null;
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const padL = 34;
    const padR = 14;
    const padT = 46;
    const padB = 24;
    const X = (x) => padL + ((x - xmin) / (xmax - xmin)) * (W - padL - padR);
    const tc = themeColors();
    const vals = [];
    for (let k = 0; k <= 200; k++) vals.push(F(xmin + ((xmax - xmin) * k) / 200));
    const fin = vals.filter(Number.isFinite);
    let lo = Math.min(0, ...fin);
    let hi = Math.max(...fin, exact);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const p = (hi - lo) * 0.12;
    lo -= p;
    hi += p;
    const Y = (y) => padT + (1 - (y - lo) / (hi - lo)) * (H - padT - padB);
    ctx.clearRect(0, 0, W, H);
    const w = (xmax - xmin) / st.n;
    let sum = 0;
    for (let k = 0; k < st.n; k++) {
      let sx;
      if (st.rule === 'left') sx = xmin + k * w;
      else if (st.rule === 'right') sx = xmin + (k + 1) * w;
      else sx = xmin + (k + 0.5) * w;
      const yv = F(sx);
      if (!Number.isFinite(yv)) continue;
      sum += yv * w;
      const px0 = X(xmin + k * w);
      const px1 = X(xmin + (k + 1) * w);
      const py = Y(yv);
      ctx.fillStyle = yv >= 0 ? 'rgba(59,116,214,0.32)' : 'rgba(179,38,30,0.30)';
      ctx.fillRect(px0, Math.min(py, Y(0)), px1 - px0, Math.abs(py - Y(0)));
      ctx.strokeStyle = yv >= 0 ? 'rgba(59,116,214,0.65)' : 'rgba(179,38,30,0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px0, Math.min(py, Y(0)), px1 - px0, Math.abs(py - Y(0)));
    }
    ctx.strokeStyle = 'rgba(107,114,128,0.5)';
    ctx.lineWidth = 1.2;
    line(ctx, padL, Y(0), W - padR, Y(0));
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= 200; k++) {
      const yv = vals[k];
      if (!Number.isFinite(yv) || Math.abs(yv) > 1e6) { pen = false; continue; }
      const px = X(xmin + ((xmax - xmin) * k) / 200);
      const py = Y(Math.max(Math.min(yv, hi + 5), lo - 5));
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const err = sum - exact;
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(
      '\u77e9\u5f62\u9762\u79ef\u548c = ' + sum.toFixed(4),
      padL + 4, 20,
    );
    ctx.fillStyle = tc.fg;
    ctx.fillText('\u771f\u5b9e\u9762\u79ef = ' + exact.toFixed(4), padL + 4, 38);
    ctx.fillStyle = Math.abs(err) < 0.01 ? '#2e7d32' : '#b3261e';
    ctx.fillText('\u8bef\u5dee = ' + err.toFixed(4), padL + 4, 56);
    cap.textContent =
      '\u5206\u5f97\u8d8a\u7ec6\uff08N \u62c9\u5927\uff09\uff0c\u77e9\u5f62\u9762\u79ef\u548c\u5c31\u8d8a\u8d34\u8fd1\u66f2\u7ebf\u4e0b\u7684\u771f\u5b9e\u9762\u79ef\u2014\u2014' +
      '\u8fd9\u5c31\u662f\u5b9a\u79ef\u5206\u7684\u672c\u8d28\uff1b\u53d6\u6837\u70b9\u9009\u5de6/\u4e2d/\u53f3\u4f1a\u5f71\u54cd\u6536\u655b\u901f\u5ea6';
  }
  [
    ['\u5de6\u7aef\u70b9', 'left'],
    ['\u4e2d\u70b9', 'mid'],
    ['\u53f3\u7aef\u70b9', 'right'],
  ].forEach(([label, rule]) => {
    const b = mkBtn(label + (st.rule === rule ? ' \u2713' : ''));
    b.addEventListener('click', () => {
      st.rule = rule;
      Array.from(box.querySelectorAll('button')).slice(0, 3).forEach((btn, i) => {
        btn.textContent = ['\u5de6\u7aef\u70b9', '\u4e2d\u70b9', '\u53f3\u7aef\u70b9'][i] +
          (['left', 'mid', 'right'][i] === st.rule ? ' \u2713' : '');
      });
      draw();
    });
    box.appendChild(b);
  });
  const sl = buildSliders(
    { sliders: [{ name: 'N', min: 1, max: 60, step: 1, value: st.n }] },
    (state) => {
      st.n = Math.max(1, Math.round(state.N));
      draw();
    },
  );
  box.appendChild(sl.box);
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 微积分：累积函数与基本定理 ---------- */

function renderAccumfunc(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 380;
  const x0 = 0;
  const xmax = spec.xmax != null ? spec.xmax : 6.28;
  let fn = null;
  try {
    fn = compileExpr(spec.expr || 'sin(x)+1', ['x']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return {};
  }
  const F = (x) => {
    try { const v = fn({ x }); return Number.isFinite(v) ? v : NaN; } catch (e) { return NaN; }
  };
  const M = 360;
  const dx = (xmax - x0) / M;
  const xsArr = [];
  const fsArr = [];
  const cum = [];
  let run = 0;
  let prev = F(x0);
  for (let k = 0; k <= M; k++) {
    const xv = x0 + k * dx;
    const fv = k === 0 ? prev : F(xv);
    if (k > 0) {
      run += ((prev + fv) / 2) * dx;
      prev = fv;
    }
    xsArr.push(xv);
    fsArr.push(fv);
    cum.push(run);
  }
  const FofX = (x) => {
    const idx = clamp(((x - x0) / dx), 0, M - 0.001);
    const i = Math.floor(idx);
    return cum[i] + (cum[i + 1] - cum[i]) * (idx - i);
  };
  const st = { x: xmax * 0.55 };
  let r = null;
  let pmA = null;
  const geo = {};
  function panel(padT, padB, arr, colorTop) {
    const ctx = r.ctx;
    const W = r.W;
    const fin = arr.filter(Number.isFinite);
    let lo = Math.min(...fin);
    let hi = Math.max(...fin);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const pd = (hi - lo) * 0.14;
    lo -= pd;
    hi += pd;
    const X = (x) => 40 + ((x - x0) / (xmax - x0)) * (W - 54);
    const Y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (padB - padT);
    return { X, Y, lo, hi, invX: (px) => x0 + ((px - 40) / (W - 54)) * (xmax - x0) };
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    const midY = H * 0.52;
    const topPad = 44;
    const botPad = 22;
    const pA = panel(topPad, midY - 10, fsArr);
    const pB = panel(midY + 18, H - botPad, cum);
    pmA = pA;
    ctx.textAlign = 'left';
    ctx.font = '700 13px system-ui';
    ctx.fillStyle = '#3b74d6';
    ctx.fillText('f(x)\uff1a\u88ab\u79ef\u5206\u7684\u51fd\u6570', 42, 20);
    ctx.fillStyle = '#e8871e';
    ctx.fillText('F(x)\uff1a\u4ece 0 \u5230 x \u7684\u7d2f\u8ba1\u9762\u79ef', 42, midY + 8);
    ctx.strokeStyle = 'rgba(107,114,128,0.4)';
    ctx.lineWidth = 1;
    line(ctx, pA.X(x0), pA.Y(0), pA.X(xmax), pA.Y(0));
    ctx.fillStyle = 'rgba(232,135,30,0.35)';
    ctx.beginPath();
    ctx.moveTo(pA.X(x0), pA.Y(Math.max(0, fsArr[0] || 0)));
    for (let k = 0; k <= M; k++) {
      if (xsArr[k] > st.x) break;
      ctx.lineTo(pA.X(xsArr[k]), pA.Y(fsArr[k]));
    }
    ctx.lineTo(pA.X(st.x), pA.Y(0));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= M; k++) {
      if (!Number.isFinite(fsArr[k])) { pen = false; continue; }
      const px = pA.X(xsArr[k]);
      const py = pA.Y(fsArr[k]);
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232,135,30,0.35)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    pen = false;
    for (let k = 0; k <= M; k++) {
      const px = pB.X(xsArr[k]);
      const py = pB.Y(cum[k]);
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    pen = false;
    for (let k = 0; k <= M; k++) {
      if (xsArr[k] > st.x) break;
      const px = pB.X(xsArr[k]);
      const py = pB.Y(cum[k]);
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(124,58,237,0.7)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    line(ctx, pA.X(st.x), topPad, pA.X(st.x), H - botPad);
    ctx.setLineDash([]);
    const fv = F(st.x);
    [[pA, fv, '#3b74d6'], [pB, FofX(st.x), '#e8871e']].forEach(([pp, v, c]) => {
      ctx.beginPath();
      ctx.arc(pp.X(st.x), pp.Y(v), 6, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.strokeStyle = tc.bg;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    });
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(
      'x=' + st.x.toFixed(2) + '\u3000\u2208\u2080^x f dt \u2248 ' + FofX(st.x).toFixed(3) +
        '\u3000f(x)=' + Number(fv.toFixed(3)),
      42, 38,
    );
    cap.textContent =
      '\u4e0b\u56fe\u66f2\u7ebf\u5728\u6bcf\u4e00\u70b9\u7684\u659c\u7387\uff0c\u6070\u597d\u7b49\u4e8e\u4e0a\u56fe f \u5728\u540c\u4e00\u4f4d\u7f6e\u7684\u9ad8\u5ea6' +
      '\u2014\u2014\u6c42\u9762\u79ef\u4e0e\u6c42\u5bfc\u6570\u4e92\u4e3a\u9006\u64cd\u4f5c\uff08\u5fae\u79ef\u5206\u57fa\u672c\u5b9a\u7406\uff09\uff1b\u62d6\u52a8\u753b\u9762\u6539 x';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick() { return 'x'; },
    move(id, x) {
      void id;
      if (!pmA) return;
      st.x = clamp(pmA.invX(x), x0, xmax);
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 级数：泰勒多项式逼近 ---------- */

function renderTaylor(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 330;
  const FACT = [1];
  for (let k = 1; k <= 23; k++) FACT[k] = FACT[k - 1] * k;
  const DEFS = {
    sin: { label: 'sin x', dom: [-6.8, 6.8], yr: [-2.4, 2.4],
      trueFn: Math.sin,
      coeff(t) { const c = []; for (let m = 0; m < t; m++) { const d = 2 * m + 1; c[d] = (m % 2 === 0 ? 1 : -1) / FACT[d]; } return c; },
      hint: '\u9636\u6570\u8d8a\u9ad8\uff0c\u8d34\u5408\u8303\u56f4\u8d8a\u5bbd\uff1b\u4f46\u4efb\u4f55\u591a\u9879\u5f0f\u6700\u7ec8\u90fd\u4f1a\u98de\u51fa\u53bb' },
    cos: { label: 'cos x', dom: [-6.8, 6.8], yr: [-2.4, 2.4],
      trueFn: Math.cos,
      coeff(t) { const c = []; for (let m = 0; m < t; m++) { const d = 2 * m; c[d] = (m % 2 === 0 ? 1 : -1) / FACT[d]; } return c; },
      hint: 'cos \u7684\u591a\u9879\u5f0f\u53ea\u6709\u5076\u6b21\u9879\u2014\u2014\u56e0\u4e3a\u5b83\u662f\u5076\u51fd\u6570' },
    exp: { label: 'e^x', dom: [-3, 3], yr: [-2, 12],
      trueFn: Math.exp,
      coeff(t) { const c = []; for (let m = 0; m < t; m++) c[m] = 1 / FACT[m]; return c; },
      hint: 'e^x \u5230\u5904\u90fd\u6536\u655b\uff1a\u6bcf\u52a0\u4e00\u9879\u90fd\u80fd\u518d\u5411\u4e24\u8fb9\u5ef6\u4f38\u4e00\u6bb5' },
    ln: { label: 'ln(1+x)', dom: [-1.9, 2.6], yr: [-3, 2.5],
      trueFn: (x) => (x > -1 ? Math.log(1 + x) : NaN),
      coeff(t) { const c = []; for (let m = 1; m <= t; m++) c[m] = (m % 2 === 1 ? 1 : -1) / m; return c; },
      hint: '\u6536\u655b\u534a\u5f84 |x|<1\uff1ax \u8fc7 1 \u4e4b\u540e\uff0c\u65e0\u8bba\u52a0\u591a\u5c11\u9879\u90fd\u6563\u53d1' },
  };
  const st = { name: spec.fn && DEFS[spec.fn] ? spec.fn : 'sin', terms: spec.n || 5, probeX: 1.2 };
  let r = null;
  let geo = {};
  function evalPoly(c, x) {
    let acc = 0;
    for (let d = c.length - 1; d >= 0; d--) {
      acc = acc * x + (c[d] || 0);
    }
    return acc;
  }
  function draw() {
    if (!r) return;
    const def = DEFS[st.name];
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const padL = 36;
    const padR = 14;
    const padT = 48;
    const padB = 26;
    const [d0, d1] = def.dom;
    const [yl, yh] = def.yr;
    const X = (x) => padL + ((x - d0) / (d1 - d0)) * (W - padL - padR);
    const Y = (v) => padT + (1 - (v - yl) / (yh - yl)) * (H - padT - padB);
    geo = { X, invX: (px) => d0 + ((px - padL) / (W - padL - padR)) * (d1 - d0) };
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(107,114,128,0.18)';
    ctx.lineWidth = 1;
    for (let g = 1; g < 6; g++) line(ctx, padL, padT + ((H - padT - padB) * g) / 6, W - padR, padT + ((H - padT - padB) * g) / 6);
    ctx.strokeStyle = 'rgba(107,114,128,0.45)';
    line(ctx, padL, Y(0), W - padR, Y(0));
    line(ctx, X(0), padT, X(0), H - padB);
    const coeffs = def.coeff(st.terms);
    const drawCurve = (getV, color, width, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash([7, 4]);
      ctx.beginPath();
      let pen = false;
      const N = 420;
      for (let k = 0; k <= N; k++) {
        const x = d0 + ((d1 - d0) * k) / N;
        const v = getV(x);
        if (!Number.isFinite(v) || Math.abs(v) > 1e5) { pen = false; continue; }
        const py = Y(Math.max(Math.min(v, yh + 2), yl - 2));
        const px = X(x);
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    drawCurve(def.trueFn, 'rgba(59,116,214,0.9)', 2.4, false);
    drawCurve((x) => evalPoly(coeffs, x), '#e8871e', 2.2, false);
    const tv = def.trueFn(st.probeX);
    const pv = evalPoly(coeffs, st.probeX);
    const pProbe = { x: X(st.probeX), y: Y(clamp(tv, yl, yh)) };
    geo.probe = pProbe;
    ctx.beginPath();
    ctx.arc(pProbe.x, pProbe.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#3b74d6';
    ctx.fill();
    ctx.strokeStyle = tc.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (Number.isFinite(pv)) {
      ctx.beginPath();
      ctx.arc(X(st.probeX), Y(clamp(pv, yl, yh)), 5, 0, Math.PI * 2);
      ctx.fillStyle = '#e8871e';
      ctx.fill();
    }
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = '#3b74d6';
    ctx.fillText(def.label + ' = ' + (Number.isFinite(tv) ? tv.toFixed(4) : '\u2014'), padL + 4, 20);
    ctx.fillStyle = '#e8871e';
    ctx.fillText(
      st.terms + ' \u9879\u591a\u9879\u5f0f \u2248 ' + (Number.isFinite(pv) ? pv.toFixed(4) : '\u2014') +
        (Number.isFinite(tv) && Number.isFinite(pv) ? '\u3000\u8bef\u5dee ' + Math.abs(tv - pv).toFixed(4) : ''),
      padL + 4, 38,
    );
    cap.textContent = def.hint + '\uff08\u62d6\u84dd\u70b9\u6362\u4f4d\u7f6e\u770b\u8bef\u5dee\uff09';
  }
  [['sin', 'sin'], ['cos', 'cos'], ['exp', 'e^x'], ['ln', 'ln(1+x)']].forEach(([key, label]) => {
    const b = mkBtn(label);
    b.addEventListener('click', () => {
      st.name = key;
      st.probeX = key === 'ln' ? 0.5 : 1.2;
      Array.from(box.querySelectorAll('button')).forEach((btn) => { btn.textContent = btn.textContent.replace(/ \u2713$/, ''); });
      b.textContent += ' \u2713';
      draw();
    });
    if (key === st.name) b.textContent += ' \u2713';
    box.appendChild(b);
  });
  const sl = buildSliders(
    { sliders: [{ name: '\u9879\u6570', min: 1, max: 12, step: 1, value: st.terms }] },
    (state) => {
      st.terms = Math.max(1, Math.round(state['\u9879\u6570']));
      draw();
    },
  );
  box.appendChild(sl.box);
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return geo.probe && Math.hypot(x - geo.probe.x, y - geo.probe.y) <= 20 ? 'p' : null;
    },
    move(id, x) {
      void id;
      st.probeX = clamp(Math.round(geo.invX(x) * 100) / 100, DEFS[st.name].dom[0], DEFS[st.name].dom[1]);
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 概率：两骰求和直方图（经验频率 vs 理论概率） ---------- */

function renderDice(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 280;
  const two = spec.dice !== 1;
  const MIN = two ? 2 : 1;
  const MAXF = two ? 12 : 6;
  const FACES = MAXF - MIN + 1;
  /* 理论值：两骰求和是三角形分布（7 最常见），单骰是均匀分布 */
  const ways = (s) => (two ? 6 - Math.abs(s - 7) : 1);
  const TOTAL = two ? 36 : 6;
  const thMean = two ? 7 : 3.5;
  const thSd = two ? Math.sqrt(35 / 6) : Math.sqrt(35 / 12);
  const st = { counts: Array(FACES).fill(0), n: 0, s1: 0, s2: 0 };
  let r = null;

  function rollOnce() {
    const a = 1 + Math.floor(Math.random() * 6);
    const b = two ? 1 + Math.floor(Math.random() * 6) : 0;
    st.counts[a + b - MIN]++;
    st.n++;
    st.s1 += a + b;
    st.s2 += (a + b) * (a + b);
  }
  function roll(k) {
    for (let i = 0; i < k; i++) rollOnce();
    draw();
  }
  function reset() {
    st.counts = Array(FACES).fill(0);
    st.n = 0; st.s1 = 0; st.s2 = 0;
    cap.textContent = '\u8fd8\u6ca1\u6709\u6570\u636e\uff1a\u70b9\u4e00\u4e0b\u201c\u63b7\u4e00\u6b21\u201d';
    draw();
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const padL = 40;
    const padR = 14;
    const padB = 30;
    const topPad = 46;
    const maxFreq = Math.max(0.05, ...st.counts.map((c) => (st.n ? c / st.n : 0)));
    const bw = Math.min(64, (W - padL - padR) / FACES - 8);
    const baseY = H - padB;
    const usable = baseY - topPad;
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.4;
    line(ctx, padL - 8, baseY, W - 12, baseY);
    for (let i = 0; i < FACES; i++) {
      const s = MIN + i;
      const x = padL + i * (bw + 8);
      const f = st.n ? st.counts[i] / st.n : 0;
      const h = (f / maxFreq) * usable;
      ctx.fillStyle = 'rgba(59,116,214,0.55)';
      ctx.fillRect(x, baseY - h, bw, Math.max(h, 0));
      ctx.strokeStyle = 'rgba(59,116,214,0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, baseY - h, bw, Math.max(h, 0));
      /* 理论概率的刻度线：n 越大柱子越贴近它 */
      const yTh = baseY - (ways(s) / TOTAL / maxFreq) * usable;
      ctx.strokeStyle = '#e8871e';
      ctx.lineWidth = 2.5;
      line(ctx, x - 3, yTh, x + bw + 3, yTh);
      ctx.fillStyle = tc.fg;
      ctx.font = '600 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(s), x + bw / 2, baseY + 16);
      if (st.counts[i]) {
        ctx.fillText(String(st.counts[i]), x + bw / 2, baseY - h - 5);
      }
    }
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    if (!st.n) {
      ctx.fillText('\u6a59\u8272\u523b\u5ea6 = \u7406\u8bba\u6982\u7387\uff08' +
        (two ? '\u4e24\u9ab0\u548c\u7684\u4e09\u89d2\u5f62\u5206\u5e03' : '\u5747\u5300\u5206\u5e03') + '\uff09', padL - 8, 22);
    } else {
      const m = st.s1 / st.n;
      const sd = Math.sqrt(Math.max(st.s2 / st.n - m * m, 0));
      ctx.fillText('\u5747\u503c ' + m.toFixed(3) + '\uff08\u7406\u8bba ' + thMean + '\uff09', padL - 8, 22);
      ctx.fillStyle = '#7c3aed';
      ctx.fillText('\u6807\u51c6\u5dee ' + sd.toFixed(3) + '\uff08\u7406\u8bba ' + thSd.toFixed(4) + '\u2026\uff09', padL - 8, 40);
    }
    cap.textContent = !st.n
      ? (two ? '\u4e24\u9897\u9ab0\u5b50\u6c42\u548c\uff1a\u4e3a\u4ec0\u4e48\u201c7 \u70b9\u201d\u6700\u5e38\u89c1\uff1f' : '\u5355\u9ab0\uff1a\u6bcf\u4e2a\u70b9\u6570\u673a\u4f1a\u5747\u7b49')
      : '\u5171\u63b7 ' + st.n + ' \u6b21\u3002\u5927\u91cf\u91cd\u590d\u540e\uff0c\u67f1\u9ad8\u4f1a\u7a33\u5b9a\u8d34\u5728\u6a59\u8272\u523b\u5ea6\u4e0a\uff0c\u5747\u503c/\u6807\u51c6\u5dee\u4e5f\u4f1a\u95ed\u5408\u5230\u7406\u8bba\u503c\u2014\u2014\u53c8\u4e00\u6b21\u5927\u6570\u5b9a\u5f8b';
  }
  [
    ['\u63b7 1 \u6b21', 1],
    ['+50', 50],
    ['+2000', 2000],
    ['\u91cd\u7f6e', 0],
  ].forEach(([label, k]) => {
    const b = mkBtn(label);
    b.addEventListener('click', () => (k ? roll(k) : reset()));
    box.appendChild(b);
  });
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  reset();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 数论：凯撒密码盘（同余的动手应用） ---------- */

function renderCaesar(host, spec) {
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);

  const row = document.createElement('div');
  row.className = 'ml-slider';
  const lab = document.createElement('label');
  lab.textContent = '\u5bc6\u94a5 k =';
  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0'; range.max = '25'; range.step = '1';
  range.value = String(clamp(spec.k != null ? spec.k : 3, 0, 25));
  const val = document.createElement('span');
  val.className = 'ml-slider__val';
  val.textContent = range.value;
  row.append(lab, range, val);
  box.appendChild(row);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ml-caesar__input';
  input.maxLength = 60;
  input.spellcheck = false;
  input.value = spec.text || 'HELLO MATH';
  input.setAttribute('aria-label', '\u8981\u52a0\u5bc6\u7684\u660e\u6587');
  host.appendChild(input);

  const out = document.createElement('div');
  out.className = 'ml-caesar__out';
  host.appendChild(out);

  /* 26 格字母对照条：上排明文字母表，下排同余平移后的密文字母表 */
  const strip = document.createElement('div');
  strip.className = 'ml-caesar__strip';
  const cellsPlain = [];
  const cellsCipher = [];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('span');
    p.className = 'ml-caesar__cell';
    p.textContent = String.fromCharCode(65 + i);
    strip.appendChild(p);
    cellsPlain.push(p);
  }
  for (let i = 0; i < 26; i++) {
    const c = document.createElement('span');
    c.className = 'ml-caesar__cell ml-caesar__cell--shift';
    strip.appendChild(c);
    cellsCipher.push(c);
  }
  host.appendChild(strip);

  const enc = (ch, k) => {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + k) % 26) + 65);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + k) % 26) + 97);
    return ch;
  };
  function refresh() {
    const k = parseInt(range.value, 10);
    val.textContent = String(k);
    const text = input.value;
    out.textContent = text.replace(/[A-Za-z]/g, (ch) => enc(ch, k)) || '\u2026';
    const up = text.toUpperCase();
    for (let i = 0; i < 26; i++) {
      cellsCipher[i].textContent = String.fromCharCode(((i + k) % 26) + 65);
      cellsPlain[i].classList.toggle('is-hot', !!up && up.includes(String.fromCharCode(65 + i)));
    }
  }
  range.addEventListener('input', refresh);
  input.addEventListener('input', refresh);
  refresh();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 线代：斜基坐标系 ---------- */

function renderBasiscoords(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const HX = 6;
  const HY = 4;
  const st = {
    b1: { x: spec.b1 ? spec.b1[0] : 1, y: spec.b1 ? spec.b1[1] : 1 },
    b2: { x: spec.b2 ? spec.b2[0] : 1, y: spec.b2 ? spec.b2[1] : -1 },
    p: { x: spec.p ? spec.p[0] : 3, y: spec.p ? spec.p[1] : 2 },
  };
  let r = null;
  let pm = null;
  const geo = {};
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, HX, HY);
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    ctx.lineWidth = 1;
    for (let gx = -Math.ceil(HX); gx <= Math.ceil(HX); gx++) {
      ctx.strokeStyle = gx === 0 ? 'rgba(107,114,128,0.45)' : 'rgba(107,114,128,0.10)';
      line(ctx, pm.X(gx), pm.Y(-HY), pm.X(gx), pm.Y(HY));
    }
    for (let gy = -Math.ceil(HY); gy <= Math.ceil(HY); gy++) {
      ctx.strokeStyle = gy === 0 ? 'rgba(107,114,128,0.45)' : 'rgba(107,114,128,0.10)';
      line(ctx, pm.X(-HX), pm.Y(gy), pm.X(HX), pm.Y(gy));
    }
    const det = st.b1.x * st.b2.y - st.b2.x * st.b1.y;
    const c1 = det ? (st.p.x * st.b2.y - st.b2.x * st.p.y) / det : 0;
    const c2 = det ? (st.b1.x * st.p.y - st.p.x * st.b1.y) / det : 0;
    const pb1 = { x: pm.X(st.b1.x), y: pm.Y(st.b1.y) };
    const pb2 = { x: pm.X(st.b2.x), y: pm.Y(st.b2.y) };
    const pp = { x: pm.X(st.p.x), y: pm.Y(st.p.y) };
    geo.pb1 = pb1;
    geo.pb2 = pb2;
    geo.pp = pp;
    if (Math.abs(det) > 1e-9) {
      const q = { x: c1 * st.b1.x + c2 * st.b2.x, y: c1 * st.b1.y + c2 * st.b2.y };
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.moveTo(pm.cx, pm.cy);
      ctx.lineTo(pb1.x, pb1.y);
      ctx.lineTo(pm.X(q.x), pm.Y(q.y));
      ctx.lineTo(pb2.x, pb2.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    arrow(ctx, pm.cx, pm.cy, pb1.x, pb1.y, '#3b74d6', 4);
    arrow(ctx, pm.cx, pm.cy, pb2.x, pb2.y, '#e8871e', 4);
    arrow(ctx, pm.cx, pm.cy, pp.x, pp.y, '#7c3aed', 3.2);
    [[pb1, 'b1'], [pb2, 'b2'], [pp, 'v']].forEach(([p, name]) => {
      ctx.font = '700 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(name, p.x + (p.x > pm.cx ? 22 : -22), p.y + (p.y > pm.cy ? 16 : -8));
    });
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    if (Math.abs(det) < 1e-9) {
      ctx.fillText('det = 0：两支基共线，坐标读不出来', 16, 24);
    } else {
      ctx.fillText('v = ' + Number(c1.toFixed(2)) + ' b1 + ' + Number(c2.toFixed(2)) + ' b2', 16, 24);
      ctx.fillText('det(b1,b2) = ' + Number(det.toFixed(2)), 16, 44);
    }
    cap.textContent =
      '同一支紫色箭头，在标准语言里是 v=(' + st.p.x + ',' + st.p.y +
      ')；换用蓝橙两支斜基后，要报出上面的系数。拖动三个端点，平行四边形会跟着重新配平';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.pp) return null;
      const items = [['p', geo.pp], ['b1', geo.pb1], ['b2', geo.pb2]];
      for (const [id, p] of items) {
        if (Math.hypot(x - p.x, y - p.y) <= 18) return id;
      }
      return null;
    },
    move(id, x, y) {
      st[id] = {
        x: clamp(Math.round(pm.invX(x) * 2) / 2, -HX + 0.5, HX - 0.5),
        y: clamp(Math.round(pm.invY(y) * 2) / 2, -HY + 0.5, HY - 0.5),
      };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 线代：投影与最短误差 ---------- */

function renderProjection(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const HX = 6;
  const HY = 3.8;
  const st = {
    u: { x: spec.u ? spec.u[0] : 5, y: spec.u ? spec.u[1] : 0 },
    v: { x: spec.v ? spec.v[0] : 1, y: spec.v ? spec.v[1] : 2 },
  };
  let r = null;
  let pm = null;
  const geo = {};
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, HX, HY);
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    for (let gx = -Math.ceil(HX); gx <= Math.ceil(HX); gx++) {
      ctx.strokeStyle = gx === 0 ? 'rgba(107,114,128,0.45)' : 'rgba(107,114,128,0.10)';
      line(ctx, pm.X(gx), pm.Y(-HY), pm.X(gx), pm.Y(HY));
    }
    for (let gy = -Math.ceil(HY); gy <= Math.ceil(HY); gy++) {
      ctx.strokeStyle = gy === 0 ? 'rgba(107,114,128,0.45)' : 'rgba(107,114,128,0.10)';
      line(ctx, pm.X(-HX), pm.Y(gy), pm.X(HX), pm.Y(gy));
    }
    const vv = st.v.x * st.v.x + st.v.y * st.v.y;
    const t = vv ? (st.u.x * st.v.x + st.u.y * st.v.y) / vv : 0;
    const proj = { x: t * st.v.x, y: t * st.v.y };
    const err = { x: st.u.x - proj.x, y: st.u.y - proj.y };
    const pu = { x: pm.X(st.u.x), y: pm.Y(st.u.y) };
    const pv = { x: pm.X(st.v.x), y: pm.Y(st.v.y) };
    const pf = { x: pm.X(proj.x), y: pm.Y(proj.y) };
    geo.pu = pu;
    geo.pv = pv;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#b3261e';
    ctx.lineWidth = 2;
    line(ctx, pu.x, pu.y, pf.x, pf.y);
    ctx.setLineDash([]);
    arrow(ctx, pm.cx, pm.cy, pv.x, pv.y, '#2e7d32', 4);
    arrow(ctx, pm.cx, pm.cy, pf.x, pf.y, '#e8871e', 6);
    arrow(ctx, pm.cx, pm.cy, pu.x, pu.y, '#3b74d6', 3);
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('v', pv.x + 14, pv.y - 8);
    ctx.fillText('投影', pf.x, pf.y - 12);
    ctx.fillText('u', pu.x + 16, pu.y + 12);
    ctx.fillStyle = '#b3261e';
    ctx.fillText('误差', (pu.x + pf.x) / 2 + 18, (pu.y + pf.y) / 2);
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText('t = (u·v)/(v·v) = ' + Number(t.toFixed(3)), 16, 24);
    ctx.fillText('误差长度 = ' + Math.hypot(err.x, err.y).toFixed(3), 16, 44);
    cap.textContent =
      '橙色影子是 u 留在 v 方向的部分；红色虚线一定垂直于 v。把蓝色 u 拖到别处，误差长度变化——垂足就是这条直线上的最佳近似';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.pu) return null;
      if (Math.hypot(x - geo.pu.x, y - geo.pu.y) <= 18) return 'u';
      if (Math.hypot(x - geo.pv.x, y - geo.pv.y) <= 18) return 'v';
      return null;
    },
    move(id, x, y) {
      st[id] = {
        x: clamp(Math.round(pm.invX(x) * 2) / 2, -HX + 0.5, HX - 0.5),
        y: clamp(Math.round(pm.invY(y) * 2) / 2, -HY + 0.5, HY - 0.5),
      };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 极限：左右探针夹逼 ---------- */

function renderLimitprobe(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 320;
  const xmin = spec.xmin != null ? spec.xmin : -1;
  const xmax = spec.xmax != null ? spec.xmax : 5;
  const a = spec.a != null ? spec.a : 2;
  let fn = null;
  try {
    fn = compileExpr(spec.expr || '(x^2-4)/(x-2)', ['x']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return {};
  }
  const F = (x) => {
    try { return fn({ x }); } catch (err) { return NaN; }
  };
  const HS = [1, 0.5, 0.2, 0.1, 0.05, 0.01];
  const st = { hi: 0 };
  let r = null;
  let map = null;
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const padL = 34;
    const padR = 14;
    const padT = 54;
    const padB = 26;
    const N = 360;
    const xs = [];
    const ys = [];
    for (let k = 0; k <= N; k++) {
      const x = xmin + ((xmax - xmin) * k) / N;
      xs.push(x);
      ys.push(F(x));
    }
    const finite = ys.filter(Number.isFinite);
    let ymin = finite.length ? Math.min(...finite) : -1;
    let ymax = finite.length ? Math.max(...finite) : 1;
    if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
    const padY = (ymax - ymin) * 0.15;
    ymin -= padY;
    ymax += padY;
    const X = (x) => padL + ((x - xmin) / (xmax - xmin)) * (W - padL - padR);
    const Y = (y) => padT + (1 - (y - ymin) / (ymax - ymin)) * (H - padT - padB);
    map = { X, invX: (px) => xmin + ((px - padL) / (W - padL - padR)) * (xmax - xmin) };
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    ctx.strokeStyle = 'rgba(107,114,128,0.16)';
    for (let g = 1; g < 6; g++) line(ctx, padL, padT + ((H - padT - padB) * g) / 6, W - padR, padT + ((H - padT - padB) * g) / 6);
    if (ymin < 0 && ymax > 0) line(ctx, padL, Y(0), W - padR, Y(0));
    if (xmin < 0 && xmax > 0) line(ctx, X(0), padT, X(0), H - padB);
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= N; k++) {
      if (!Number.isFinite(ys[k]) || Math.abs(ys[k]) > 1e6 || Math.abs(xs[k] - a) < 1e-6) { pen = false; continue; }
      const px = X(xs[k]);
      const py = Y(Math.max(Math.min(ys[k], ymax + 5), ymin - 5));
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const h = HS[st.hi];
    const lv = F(a - h);
    const rv = F(a + h);
    [[a - h, lv, '#e8871e'], [a + h, rv, '#2e7d32']].forEach(([x, y, color]) => {
      ctx.beginPath();
      ctx.arc(X(x), Y(clamp(y, ymin - 2, ymax + 2)), 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(X(a), Y(Number.isFinite(lv) ? lv : 0), 5, 0, Math.PI * 2);
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(124,58,237,0.75)';
    line(ctx, X(a), padT, X(a), H - padB);
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText('h=' + h, padL + 4, 20);
    ctx.fillStyle = '#e8871e';
    ctx.fillText('左侧 f(a-h)=' + (Number.isFinite(lv) ? lv.toFixed(5) : 'undefined'), padL + 64, 20);
    ctx.fillStyle = '#2e7d32';
    ctx.fillText('右侧 f(a+h)=' + (Number.isFinite(rv) ? rv.toFixed(5) : 'undefined'), padL + 64, 38);
    cap.textContent =
      '紫线是考察点 a；按 h÷2 让红绿两个探针从两侧贴上去。若两组读数靠向同一个值，极限就在那里——即使函数本身在 a 处缺席';
  }
  [
    ['h ÷ 2', () => { st.hi = Math.min(st.hi + 1, HS.length - 1); draw(); }],
    ['重置 h', () => { st.hi = 0; draw(); }],
  ].forEach(([label, handler]) => {
    const b = mkBtn(label);
    b.addEventListener('click', handler);
    box.appendChild(b);
  });
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick() { return null; },
    move() {},
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 积分：中点 / 梯形 / 辛普森同台对比 ---------- */

function renderQuadrature(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 320;
  const xmin = spec.xmin != null ? spec.xmin : 0;
  const xmax = spec.xmax != null ? spec.xmax : Math.PI;
  let fn = null;
  try {
    fn = compileExpr(spec.expr || 'sin(x)', ['x']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return {};
  }
  const F = (x) => {
    try { const v = fn({ x }); return Number.isFinite(v) ? v : NaN; } catch (err) { return NaN; }
  };
  const M = 2400;
  const dxFine = (xmax - xmin) / M;
  let exact = 0;
  for (let k = 0; k < M; k++) exact += F(xmin + (k + 0.5) * dxFine);
  exact *= dxFine;
  const st = { n: spec.n || 4, rule: 'trap' };
  let r = null;
  function values(n) {
    const out = [];
    for (let k = 0; k <= n; k++) out.push(F(xmin + ((xmax - xmin) * k) / n));
    return out;
  }
  function estimates(n) {
    const ys = values(n);
    const w = (xmax - xmin) / n;
    let mid = 0;
    for (let k = 0; k < n; k++) mid += F(xmin + (k + 0.5) * w) * w;
    let trap = (ys[0] + ys[n]) / 2;
    for (let k = 1; k < n; k++) trap += ys[k];
    trap *= w;
    /* 辛普森公式只吃偶数区间：奇数 N 时自动补成 N+1 桶再算 */
    const sn = n % 2 ? n + 1 : n;
    const ysS = sn === n ? ys : values(sn);
    const wS = (xmax - xmin) / sn;
    let simp = ysS[0] + ysS[sn];
    for (let k = 1; k < sn; k++) simp += (k % 2 ? 4 : 2) * ysS[k];
    simp *= wS / 3;
    return { mid, trap, simp, sn };
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const padL = 38;
    const padR = 14;
    const padT = 76;
    const padB = 26;
    const N = 260;
    const vals = [];
    for (let k = 0; k <= N; k++) vals.push(F(xmin + ((xmax - xmin) * k) / N));
    const finite = vals.filter(Number.isFinite);
    let lo = Math.min(0, ...finite);
    let hi = Math.max(...finite, exact);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const p = (hi - lo) * 0.12;
    lo -= p;
    hi += p;
    const X = (x) => padL + ((x - xmin) / (xmax - xmin)) * (W - padL - padR);
    const Y = (y) => padT + (1 - (y - lo) / (hi - lo)) * (H - padT - padB);
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    ctx.strokeStyle = 'rgba(107,114,128,0.45)';
    line(ctx, padL, Y(0), W - padR, Y(0));
    const est = estimates(st.n);
    const n = st.rule === 'simp' ? est.sn : st.n;
    const w = (xmax - xmin) / n;
    const ys = values(n);
    for (let k = 0; k < n; k++) {
      let height;
      if (st.rule === 'mid') height = F(xmin + (k + 0.5) * w);
      else height = (ys[k] + ys[k + 1]) / 2;
      if (!Number.isFinite(height)) continue;
      ctx.fillStyle = 'rgba(59,116,214,0.22)';
      ctx.fillRect(X(xmin + k * w), Math.min(Y(height), Y(0)), X(xmin + (k + 1) * w) - X(xmin + k * w), Math.abs(Y(height) - Y(0)));
      if (st.rule === 'trap') {
        ctx.strokeStyle = 'rgba(232,135,30,0.8)';
        ctx.lineWidth = 1.2;
        line(ctx, X(xmin + k * w), Y(ys[k]), X(xmin + (k + 1) * w), Y(ys[k + 1]));
      }
    }
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= N; k++) {
      const yv = vals[k];
      if (!Number.isFinite(yv) || Math.abs(yv) > 1e6) { pen = false; continue; }
      const px = X(xmin + ((xmax - xmin) * k) / N);
      const py = Y(yv);
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText('精确面积=' + exact.toFixed(5), padL + 4, 20);
    ctx.fillStyle = '#b45309';
    ctx.fillText('N=' + n + '，当前方法估计=' + Number(est[st.rule].toFixed(5)) +
      (st.rule === 'simp' && est.sn !== st.n ? '（辛普森自动补成 ' + est.sn + ' 桶）' : ''), padL + 4, 40);
    ctx.fillStyle = Math.abs(est.mid - exact) < Math.abs(est.trap - exact) ? '#2e7d32' : '#b3261e';
    ctx.fillText('中点误差 ' + Math.abs(est.mid - exact).toFixed(5) + '；梯形误差 ' + Math.abs(est.trap - exact).toFixed(5), padL + 4, 60);
    cap.textContent =
      '拖大 N 后分别切换三种替身：水平线、斜线、抛物线。辛普森通常赢在最少的采样数——这不是运气，而是它多利用了一层弯曲信息';
  }
  [
    ['中点', 'mid'],
    ['梯形', 'trap'],
    ['辛普森', 'simp'],
  ].forEach(([label, rule], index, arr) => {
    const b = mkBtn(label + (st.rule === rule ? ' ✓' : ''));
    b.addEventListener('click', () => {
      st.rule = rule;
      Array.from(box.querySelectorAll('button')).forEach((btn, i) => {
        btn.textContent = arr[i][0] + (arr[i][1] === rule ? ' ✓' : '');
      });
      draw();
    });
    box.appendChild(b);
  });
  const sl = buildSliders(
    { sliders: [{ name: 'N', min: 2, max: 40, step: 1, value: st.n }] },
    (state) => { st.n = Math.max(2, Math.round(state.N)); draw(); },
  );
  box.appendChild(sl.box);
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 级数：部分和曲线与当前项贡献 ---------- */

function renderSeriesbuild(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 380;
  const FACT = [1];
  for (let k = 1; k <= 16; k++) FACT[k] = FACT[k - 1] * k;
  const DEFS = {
    geom: { label: '1/(1-x)', dom: [-1.7, 1.7], yr: [-1.5, 5.5],
      trueFn(x) { return Math.abs(x - 1) < 1e-9 ? NaN : 1 / (1 - x); },
      coeff(i, x) { return Math.pow(x, i); }, max: 14, probeX: 0.55 },
    sin: { label: 'sin x', dom: [-6.8, 6.8], yr: [-2.4, 2.4], trueFn: Math.sin,
      coeff(i, x) { return i % 2 ? ((Math.floor(i / 2) % 2 ? -1 : 1) * Math.pow(x, i)) / FACT[i] : 0; }, max: 13, probeX: 1.2 },
    cos: { label: 'cos x', dom: [-6.8, 6.8], yr: [-2.4, 2.4], trueFn: Math.cos,
      coeff(i, x) { return i % 2 === 0 ? ((i / 2) % 2 ? -1 : 1) * Math.pow(x, i) / FACT[i] : 0; }, max: 14, probeX: 1.2 },
    exp: { label: 'e^x', dom: [-3, 3], yr: [-2, 12], trueFn: Math.exp,
      coeff(i, x) { return Math.pow(x, i) / FACT[i]; }, max: 14, probeX: 1 },
  };
  const initial = DEFS[spec.fn] ? spec.fn : 'geom';
  const st = { name: initial, n: spec.n || 5, probeX: DEFS[initial].probeX };
  let r = null;
  let geo = null;
  function draw() {
    if (!r) return;
    const def = DEFS[st.name];
    const ctx = r.ctx;
    const W = r.W;
    const [d0, d1] = def.dom;
    const [yl, yh] = def.yr;
    const topPad = 66;
    const barTop = H - 104;
    const barH = 82;
    const padL = 38;
    const padR = 14;
    const X = (x) => padL + ((x - d0) / (d1 - d0)) * (W - padL - padR);
    const Y = (v) => topPad + (1 - (clamp(v, yl - 2, yh + 2) - yl) / (yh - yl)) * (barTop - topPad);
    geo = { X, invX: (px) => d0 + ((px - padL) / (W - padL - padR)) * (d1 - d0) };
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    ctx.strokeStyle = 'rgba(107,114,128,0.35)';
    line(ctx, padL, Y(0), W - padR, Y(0));
    const partial = (x) => {
      let sum = 0;
      for (let i = 0; i <= st.n; i++) sum += def.coeff(i, x);
      return sum;
    };
    const curve = (getV, color, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      if (dash) ctx.setLineDash([6, 4]);
      ctx.beginPath();
      let pen = false;
      for (let k = 0; k <= 420; k++) {
        const x = d0 + ((d1 - d0) * k) / 420;
        const v = getV(x);
        if (!Number.isFinite(v) || Math.abs(v) > 1e5) { pen = false; continue; }
        const px = X(x);
        const py = Y(v);
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    curve(def.trueFn, 'rgba(59,116,214,0.85)', false);
    curve(partial, '#e8871e', true);
    ctx.beginPath();
    ctx.arc(X(st.probeX), Y(def.trueFn(st.probeX)), 7, 0, Math.PI * 2);
    ctx.fillStyle = '#3b74d6';
    ctx.fill();
    const terms = [];
    for (let i = 0; i <= st.n; i++) terms.push(def.coeff(i, st.probeX));
    const maxTerm = Math.max(...terms.map(Math.abs), 1e-9);
    const bw = (W - padL - padR) / (st.n + 1);
    terms.forEach((term, i) => {
      const h = (Math.abs(term) / maxTerm) * barH;
      ctx.fillStyle = i === st.n ? 'rgba(124,58,237,0.65)' : 'rgba(232,135,30,0.48)';
      ctx.fillRect(padL + i * bw + bw * 0.18, barTop + barH - h, bw * 0.64, h);
    });
    ctx.strokeStyle = tc.axis;
    line(ctx, padL, barTop + barH, W - padR, barTop + barH);
    const tv = def.trueFn(st.probeX);
    const pv = partial(st.probeX);
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(def.label + '=' + (Number.isFinite(tv) ? tv.toFixed(4) : 'undefined'), padL + 4, 22);
    ctx.fillStyle = '#e8871e';
    ctx.fillText(st.n + ' 阶部分和=' + pv.toFixed(4) + '，误差=' + Math.abs(tv - pv).toFixed(4), padL + 4, 42);
    ctx.fillStyle = '#7c3aed';
    ctx.fillText('x=' + st.probeX.toFixed(2) + '，下方是每一项的贡献高度', padL + 4, 62);
    cap.textContent =
      '拖动蓝色探针或增大阶数：上方橙色折线追蓝线，下方柱子显示每个幂次在这一点的实际贡献。柱子迟迟不变小，就是发散警报';
  }
  [['几何', 'geom'], ['sin', 'sin'], ['cos', 'cos'], ['exp', 'exp']].forEach(([label, key], index, arr) => {
    const b = mkBtn(label + (key === st.name ? ' ✓' : ''));
    b.addEventListener('click', () => {
      st.name = key;
      st.probeX = DEFS[key].probeX;
      Array.from(box.querySelectorAll('button')).forEach((btn, i) => { btn.textContent = arr[i][0] + (arr[i][1] === key ? ' ✓' : ''); });
      draw();
    });
    box.appendChild(b);
  });
  const sl = buildSliders(
    { sliders: [{ name: '阶数', min: 0, max: 14, step: 1, value: st.n }] },
    (state) => { st.n = Math.round(state['阶数']); draw(); },
  );
  box.appendChild(sl.box);
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return geo && y > 50 && y < H - 90 && Math.hypot(y - 120, 0) >= 0 && x > 20 ? 'p' : null;
    },
    move(id, x) {
      void id;
      st.probeX = clamp(geo.invX(x), DEFS[st.name].dom[0], DEFS[st.name].dom[1]);
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 傅里叶：乘积面积与离散投影 ---------- */

function renderOrthoproduct(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 320;
  const N = 256;
  const signalName = ['square', 'triangle'].includes(spec.signal) ? spec.signal : 'product';
  const st = { m: spec.m || 2, n: spec.n || 3 };
  let r = null;
  function signal(x) {
    if (signalName === 'square') return Math.sin(x) >= 0 ? 1 : -1;
    if (signalName === 'triangle') {
      const phase = ((x / (Math.PI * 2)) % 1 + 1) % 1;
      return 4 * Math.abs(phase - 0.5) - 1;
    }
    return Math.sin(st.m * x);
  }
  function probe(x) { return Math.sin((signalName === 'product' ? st.n : st.m) * x); }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    const padL = 38;
    const padR = 14;
    const padT = 58;
    const padB = 26;
    const xmax = Math.PI * 2;
    const X = (x) => padL + (x / xmax) * (W - padL - padR);
    const Y = (v) => padT + (1 - clamp(v, -1.35, 1.35) / 1.35) * (H - padT - padB);
    ctx.strokeStyle = 'rgba(107,114,128,0.45)';
    line(ctx, padL, Y(0), W - padR, Y(0));
    line(ctx, X(0), padT, X(0), H - padB);
    for (let k = 1; k < 4; k++) {
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = 'rgba(107,114,128,0.25)';
      line(ctx, X(xmax * k / 4), padT, X(xmax * k / 4), H - padB);
      ctx.setLineDash([]);
    }
    let sum = 0;
    let prevProduct = null;
    for (let k = 0; k <= N; k++) {
      const x = xmax * k / N;
      const product = signal(x) * probe(x);
      if (k < N) sum += product;
      if (k > 0 && prevProduct !== null && product * prevProduct < 0) {
        ctx.fillStyle = product > prevProduct ? 'rgba(59,116,214,0.20)' : 'rgba(179,38,30,0.18)';
      }
      if (product >= 0) {
        ctx.fillStyle = 'rgba(59,116,214,0.24)';
        ctx.fillRect(X(x - xmax / N), Y(product), W / N + 0.5, Y(0) - Y(product));
      } else {
        ctx.fillStyle = 'rgba(179,38,30,0.22)';
        ctx.fillRect(X(x - xmax / N), Y(0), W / N + 0.5, Y(product) - Y(0));
      }
      prevProduct = product;
    }
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let k = 0; k <= N; k++) {
      const x = xmax * k / N;
      const px = X(x);
      const py = Y(signal(x) * probe(x));
      if (!k) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(59,116,214,0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k <= N; k++) {
      const x = xmax * k / N;
      if (!k) ctx.moveTo(X(x), Y(signal(x)));
      else ctx.lineTo(X(x), Y(signal(x)));
    }
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    if (signalName === 'product') {
      ctx.fillText('sin(' + st.m + 'x)·sin(' + st.n + 'x) 的 256 点和=' + Number(sum.toFixed(4)), padL + 4, 22);
    } else {
      const coefficient = 2 * sum / N;
      ctx.fillText('f·sin(' + st.m + 'x)，256 点系数=' + Number(coefficient.toFixed(4)), padL + 4, 22);
    }
    ctx.fillStyle = '#b45309';
    ctx.fillText('蓝=信号，橙=逐点乘积；正区加，负区减', padL + 4, 42);
    cap.textContent =
      signalName === 'product'
        ? '异频时正负区块成对抵消；把 n 拖到 m，乘积全部跑到零轴上方——这就是“自己有长度”'
        : '换不同谐波扫一遍：有的轴读数很大，有的几乎为零。傅里叶系数就是这份“逐轴点名”的结果';
  }
  if (signalName === 'product') {
    const sl = buildSliders(
      { sliders: [
        { name: 'm', min: 1, max: 8, step: 1, value: st.m },
        { name: 'n', min: 1, max: 8, step: 1, value: st.n },
      ] },
      (state) => { st.m = Math.round(state.m); st.n = Math.round(state.n); draw(); },
    );
    box.appendChild(sl.box);
  } else {
    const sl = buildSliders(
      { sliders: [{ name: '谐波', min: 1, max: 12, step: 1, value: st.m }] },
      (state) => { st.m = Math.round(state['谐波']); draw(); },
    );
    box.appendChild(sl.box);
  }
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 频谱/DFT：双音信号的时域与频域 ---------- */

function renderSpectrum(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const box = document.createElement('div');
  box.className = 'ml-viz__controls';
  host.appendChild(box);
  const H = 400;
  const N = 128;
  const fs = N;
  const maxF = fs / 2 - 1;
  const st = {
    f1: spec.f1 != null ? spec.f1 : 5,
    a1: spec.a1 != null ? spec.a1 : 1,
    f2: spec.f2 != null ? spec.f2 : 12,
    a2: spec.a2 != null ? spec.a2 : 0.5,
  };
  let r = null;
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    const waveTop = 52;
    const waveH = 110;
    const specTop = 238;
    const specH = 122;
    const padL = 42;
    const padR = 16;
    const samples = [];
    for (let n = 0; n < N; n++) {
      samples.push(
        st.a1 * Math.sin(Math.PI * 2 * st.f1 * n / fs) +
        st.a2 * Math.sin(Math.PI * 2 * st.f2 * n / fs),
      );
    }
    const XW = (n) => padL + (n / (N - 1)) * (W - padL - padR);
    const YW = (v) => waveTop + (1 - v / 1.75) * waveH / 2;
    ctx.strokeStyle = tc.axis;
    line(ctx, padL, YW(0), W - padR, YW(0));
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    samples.forEach((v, n) => {
      const px = XW(n);
      const py = YW(v);
      if (!n) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    const mags = [];
    for (let k = 0; k <= maxF; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < N; n++) {
        const ang = Math.PI * 2 * k * n / N;
        re += samples[n] * Math.cos(ang);
        im -= samples[n] * Math.sin(ang);
      }
      mags.push(Math.hypot(re, im) / N);
    }
    const maxMag = Math.max(...mags, 0.08);
    const XF = (f) => padL + (f / maxF) * (W - padL - padR);
    const YF = (v) => specTop + (1 - v / (maxMag * 1.15)) * specH;
    ctx.strokeStyle = tc.axis;
    line(ctx, padL, YF(0), W - padR, YF(0));
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3;
    mags.forEach((mag, k) => line(ctx, XF(k), YF(0), XF(k), YF(mag)));
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText('时域：两个正弦叠加（N=' + N + '）', padL + 4, 22);
    ctx.fillStyle = '#b45309';
    ctx.fillText('频域：DFT 前 ' + maxF + ' 个实频率桶', padL + 4, specTop - 20);
    [[st.f1, '#3b74d6'], [st.f2, '#2e7d32']].forEach(([freq, color]) => {
      ctx.fillStyle = color;
      ctx.fillText(String(freq) + ' Hz', XF(freq) - 16, YF(mags[Math.round(freq)]) - 8);
    });
    cap.textContent =
      '拖动两个频率和份量，上面的乱麻立刻在下面现出原形。这里的滑杆按整数桶取值，所以整桶谱峰保持干净；非整桶频率才会展开成泄漏裙边';
  }
  const sl = buildSliders(
    { sliders: [
      { name: '频率1', min: 1, max: maxF, step: 1, value: st.f1 },
      { name: '份量1', min: 0, max: 1, step: 0.05, value: st.a1 },
      { name: '频率2', min: 1, max: maxF, step: 1, value: st.f2 },
      { name: '份量2', min: 0, max: 1, step: 0.05, value: st.a2 },
    ] },
    (state) => {
      st.f1 = Math.round(state['频率1']);
      st.a1 = state['份量1'];
      st.f2 = Math.round(state['频率2']);
      st.a2 = state['份量2'];
      draw();
    },
  );
  box.appendChild(sl.box);
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 因式分解：代数面积模型 ---------- */

function renderFactoring(host, spec) {
  const st = { p: spec.p || 2, q: spec.q || 3 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 260;
  let r = null;

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const b = st.p + st.q;
    const c = st.p * st.q;
    const matched = (spec.b == null || b === spec.b) && (spec.c == null || c === spec.c);
    const unit = Math.min(30, (W - 190) / 8, (H - 95) / 8);
    const ox = 78;
    const oy = H - 45;
    const xLen = unit * 2;
    if (st.p >= 0 && st.q >= 0) {
      const pw = st.p * unit;
      const ph = st.q * unit;
      ctx.fillStyle = 'rgba(59,116,214,0.48)';
      ctx.fillRect(ox, oy - xLen, xLen, xLen);
      ctx.fillStyle = 'rgba(232,135,30,0.46)';
      ctx.fillRect(ox + xLen, oy - xLen, pw, xLen);
      ctx.fillRect(ox, oy - xLen - ph, xLen, ph);
      ctx.fillStyle = 'rgba(46,125,50,0.38)';
      ctx.fillRect(ox + xLen, oy - xLen - ph, pw, ph);
      ctx.strokeStyle = tc.fg;
      ctx.lineWidth = 1.1;
      [0, 1, 2, 3].forEach((k) => {
        const x = ox + (k % 2 === 0 ? 0 : xLen);
        const y = oy - (k < 2 ? xLen : xLen + ph);
        const w = k % 2 === 0 ? xLen : pw;
        const h = k < 2 ? xLen : ph;
        ctx.strokeRect(x, y, w, h);
      });
      ctx.fillStyle = tc.fg;
      ctx.font = `600 ${Math.max(10, Math.min(15, unit * 0.55))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('x²', ox + xLen / 2, oy - xLen / 2 + 5);
      if (pw > 24) ctx.fillText(`${st.p}x`, ox + xLen + pw / 2, oy - xLen / 2 + 5);
      if (ph > 20) ctx.fillText(`${st.q}x`, ox + xLen / 2, oy - xLen - ph / 2 + 5);
      if (pw > 34 && ph > 26) {
        ctx.fillText(String(st.p * st.q), ox + xLen + pw / 2, oy - xLen - ph / 2 + 5);
      }
    } else {
      ctx.fillStyle = softFill();
      ctx.fillRect(ox, oy - xLen - 42, Math.max(xLen + 90, 150), xLen + 62);
      ctx.fillStyle = tc.fg;
      ctx.font = '13px system-ui';
      ctx.fillText('负数拼块先收进符号账本', ox + 14, oy - xLen + 8);
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 15px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`(x ${st.p >= 0 ? '+' : '−'} ${Math.abs(st.p)})(x ${st.q >= 0 ? '+' : '−'} ${Math.abs(st.q)})`, 16, 32);
    ctx.font = '15px monospace';
    ctx.fillText(`= x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}x ${c >= 0 ? '+' : '−'} ${Math.abs(c)}`, 16, 58);
    ctx.font = '13px system-ui';
    ctx.fillStyle = '#2e7d32';
    ctx.fillText(`p·q=${c}  p+q=${b}`, W - 128, 36);
    if (st.p >= 0 && st.q >= 0) {
      cap.textContent =
        `展开账本：x² + ${st.q}x + ${st.p}x + ${st.p * st.q}。` +
        (matched ? '两个条件同时命中。' : '继续拖动 p、q，同时满足“乘积=c”和“和=b”。');
    } else {
      cap.textContent = `符号账本：p·q=${c} 决定常数项，p+q=${b} 决定中间项。`;
    }
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'p', min: -6, max: 6, step: 1, value: st.p },
      { name: 'q', min: -6, max: 6, step: 1, value: st.q },
    ],
  }, (state) => {
    st.p = Math.round(state.p);
    st.q = Math.round(state.q);
    draw();
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 统计图：纵轴起点如何改变观感 ---------- */

function renderDatachart(host, spec) {
  const labels = Array.isArray(spec.labels) && spec.labels.length ? spec.labels.map(String) : ['甲', '乙', '丙'];
  const values = Array.isArray(spec.values) ? spec.values.slice(0, labels.length).map((v) => Number(v) || 0) : [4, 6, 9];
  while (values.length < labels.length) values.push(5);
  const state = { values, zero: true };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 290;
  const padL = 40;
  const padB = 38;
  const padT = 32;
  let r = null;
  let geom = {};

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const maxV = Math.max(10, ...state.values);
    const low = Math.min(...state.values);
    const minV = state.zero
      ? 0
      : Math.max(0.05, low - Math.max(0.5, (maxV - low) * 0.18));
    const Y = (v) => padT + (maxV - v) / ((maxV - minV) || 1) * (H - padT - padB);
    const n = labels.length;
    const gap = (W - padL - 20) / n;
    const bw = Math.max(1, Math.min(64, gap * 0.55));
    geom = { gap, bw };
    let labFont = 12;
    let valFont = 12;
    let labelStep = 1;
    let skipValues = false;
    if (n > 6) {
      /* 类目超过 6 根：字号随间距缩放，极端密集时抽稀名称/省略数值，保证不重叠 */
      const widest = labels.reduce((mx, s) => Math.max(mx, s.length), 1);
      const asciiOnly = labels.every((s) => !/[^\x00-\x7f]/.test(s));
      const charPx = asciiOnly ? 6.6 : 12;
      labFont = Math.max(7, Math.min(12, Math.floor((gap / (charPx * widest)) * 12)));
      valFont = Math.max(7, Math.min(12, Math.floor(gap * 0.38)));
      if (widest * (charPx / 12) * labFont > gap) labelStep = Math.ceil((widest * (charPx / 12) * labFont * 1.05) / gap);
      const maxLen = state.values.reduce((mx, v) => Math.max(mx, String(v).length), 1);
      skipValues = maxLen * valFont * 0.66 > gap;
    }
    ctx.strokeStyle = tc.grid;
    for (let step = 0; step <= 4; step++) {
      const v = minV + (maxV - minV) * step / 4;
      line(ctx, padL, Y(v), W - 16, Y(v));
      ctx.fillStyle = tc.axis;
      ctx.textAlign = 'right';
      ctx.font = '11px system-ui';
      ctx.fillText(v.toFixed(state.zero ? 0 : 1), padL - 6, Y(v) + 4);
    }
    ctx.strokeStyle = tc.axis;
    line(ctx, padL, padT, padL, H - padB);
    line(ctx, padL, Y(minV), W - 16, Y(minV));
    const barColors = Array.isArray(spec.colors) ? spec.colors : null; // 可选逐柱着色：colors[i] 为 CSS 颜色
    labels.forEach((label, i) => {
      const x = padL + gap * i + (gap - bw) / 2;
      const y = Y(state.values[i]);
      ctx.fillStyle = (barColors && barColors[i]) || 'rgba(59,116,214,0.72)';
      ctx.fillRect(x, y, bw, Y(minV) - y);
      ctx.strokeStyle = barColors && barColors[i] ? 'rgba(28,32,40,0.28)' : '#2563eb';
      ctx.strokeRect(x, y, bw, Y(minV) - y);
      ctx.fillStyle = tc.fg;
      ctx.textAlign = 'center';
      ctx.font = `${labFont}px system-ui`;
      if (i % labelStep === 0) ctx.fillText(label, x + bw / 2, H - padB + 18);
      if (!skipValues) {
        ctx.font = `600 ${valFont}px monospace`;
        ctx.fillText(String(state.values[i]), x + bw / 2, y - 12);
      }
    });
    let denseNote = '';
    if (n > 6) {
      if (labelStep > 1) denseNote += `（类目较密：每 ${labelStep} 根标注一个名称）`;
      if (skipValues) denseNote += '（数值过密，柱顶数字省略）';
    }
    cap.textContent =
      (state.zero ? '零基线：柱高和数据大小比例一致。' : '非零基线：微小差距被放大了。看图先问纵轴从哪里开始。') + denseNote;
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const btn = mkBtn('切换零基线 / 非零基线');
  btn.addEventListener('click', () => { state.zero = !state.zero; draw(); });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  controls.appendChild(btn);
  draw();
  return { slidersBox: controls };
}

/* ---------- 计数：排列认顺序，组合只认团队 ---------- */

function renderCounting(host, spec) {
  const state = {
    n: Math.min(6, Math.max(2, spec.n || 4)),
    k: clamp(spec.k != null ? Math.round(spec.k) : 2, 1, Math.min(6, Math.max(2, spec.n || 4))),
  };
  const colors = ['#3b74d6', '#e8871e', '#2e7d32', '#7c3aed', '#c62828', '#00838f'];
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 300;
  let r = null;

  function combinations(items, k) {
    if (!k) return [[]];
    if (items.length < k) return [];
    const rest = items.slice(1);
    return combinations(rest, k - 1).map((group) => [items[0], ...group]).concat(combinations(rest, k));
  }
  function permutations(group) {
    if (group.length <= 1) return [group];
    return group.flatMap((item, i) =>
      permutations([...group.slice(0, i), ...group.slice(i + 1)]).map((tail) => [item, ...tail]));
  }
  function permCount(n, k) {
    let total = 1;
    for (let i = 0; i < k; i++) total *= n - i;
    return total;
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const items = Array.from({ length: state.n }, (_, i) => i);
    const allGroups = combinations(items, state.k);
    const rowStep = Math.min(24, (H - 82) / 9);
    const maxRows = Math.max(1, Math.floor((H - 82) / rowStep) + 1);
    const groups = allGroups.slice(0, maxRows);
    const orders = groups.flatMap(permutations).slice(0, maxRows);
    const radius = Math.min(10, (W / 2 - 40) / (state.k + 1));
    function panel(list, x0, title, count, color) {
      ctx.fillStyle = tc.fg;
      ctx.textAlign = 'left';
      ctx.font = '600 13px system-ui';
      ctx.fillText(title, x0, 28);
      ctx.font = '12px monospace';
      ctx.fillStyle = color;
      ctx.fillText(count, x0, 48);
      list.forEach((row, rowIndex) => {
        row.forEach((item, colIndex) => {
          ctx.beginPath();
          ctx.arc(x0 + colIndex * radius * 2.35 + radius + 2, 68 + rowIndex * rowStep, radius - 2, 0, Math.PI * 2);
          ctx.fillStyle = colors[item];
          ctx.fill();
        });
      });
    }
    const pc = permCount(state.n, state.k);
    panel(groups, 24, '组合：只挑团队', `C=${allGroups.length}${allGroups.length > maxRows ? '（显示前' + maxRows + '行）' : ''}`, '#2e7d32');
    panel(orders, W / 2 + 8, '排列：还要排顺序', `P=${pc}${pc > orders.length ? '（显示前' + orders.length + '行）' : ''}`, '#b3261e');
    cap.textContent = '左边同一批圆点不管怎么站都只算一次；右边换个站位就是一条新的排列。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'n', min: 2, max: 6, step: 1, value: state.n },
      { name: 'k', min: 1, max: state.n, step: 1, value: state.k },
    ],
  }, (next) => {
    state.n = Math.round(next.n);
    state.k = clamp(Math.round(next.k), 1, state.n);
    const refs = sl.refs;
    refs.k.range.max = String(state.n);
    refs.k.range.value = String(Math.min(Number(refs.k.range.value), state.n));
    refs.k.val.textContent = refs.k.range.value;
    draw();
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 真值表：条件句只有一行是假的 ---------- */

function renderTruthtable(host, spec) {
  const formulas = {
    p: (p) => p,
    q: (p, q) => q,
    'not p': (p) => !p,
    'not q': (p, q) => !q,
    'p=>q': (p, q) => !p || q,
    'q=>p': (p, q) => !q || p,
    'p<=>q': (p, q) => p === q,
    'p and q': (p, q) => p && q,
    'p or q': (p, q) => p || q,
  };
  const order = ['p=>q', 'q=>p', 'p<=>q', 'p and q', 'p or q'];
  const state = { p: true, q: false, main: formulas[spec.formula] ? spec.formula : 'p=>q' };
  const cols = (Array.isArray(spec.showColumns) ? spec.showColumns : ['p', 'q', 'not p', 'p=>q', 'q=>p'])
    .filter((name) => formulas[name]).slice(0, 6);
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const rowH = 34;
  const H = rowH * 5 + 82;
  let r = null;

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const colW = W / cols.length;
    /* 当前行整行高亮：色带在列绘制之后再叠（此前先画会被不透明单元格覆盖） */
    const curRow = 84 + ((state.p ? 0 : 1) * 2 + (state.q ? 0 : 1)) * rowH;
    cols.forEach((name, j) => {
      const x = j * colW;
      ctx.fillStyle = name === state.main ? 'rgba(124,58,237,0.18)' : softFill();
      ctx.fillRect(x + 5, 42, colW - 10, rowH - 8);
      ctx.fillStyle = tc.fg;
      ctx.textAlign = 'center';
      ctx.font = '600 13px system-ui';
      ctx.fillText(name === state.main ? '[' + name + ']' : name, x + colW / 2, 64);
      [true, false].forEach((p, i) => [true, false].forEach((q, k) => {
        const y = 84 + (i * 2 + k) * rowH;
        const value = formulas[name](p, q);
        ctx.fillStyle = name === state.main && !value ? 'rgba(220,38,38,0.20)' : softFill();
        ctx.fillRect(x + 5, y, colW - 10, rowH - 8);
        ctx.fillStyle = value ? '#15803d' : '#dc2626';
        ctx.fillText(value ? '真' : '假', x + colW / 2, y + 21);
      }));
    });
    ctx.fillStyle = 'rgba(232,135,30,0.20)';
    ctx.fillRect(5, curRow, W - 10, rowH - 8);
    ctx.textAlign = 'left';
    ctx.fillStyle = tc.fg;
    ctx.fillText('当前 p=' + (state.p ? '真' : '假') + '，q=' + (state.q ? '真' : '假'), 12, 24);
    cap.textContent = '橙色整行就是当前 (p, q) 取值所在的那一行；红色格是主公式的反例行。条件句只在“前提真而结论假”这一行塌掉。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  [['切换 p', () => { state.p = !state.p; }],
    ['切换 q', () => { state.q = !state.q; }],
    ['换主公式', () => { state.main = order[(order.indexOf(state.main) + 1) % order.length]; }],
  ].forEach(([text, fn]) => {
    const btn = mkBtn(text);
    btn.addEventListener('click', () => { fn(); draw(); });
    controls.appendChild(btn);
  });
  draw();
  return { slidersBox: controls };
}

/* ---------- 量词猎手：顺序一换，witness 就换人 ---------- */

function renderQuantifierhunt(host, spec) {
  const domainA = (Array.isArray(spec.domain) ? spec.domain : ['甲', '乙', '丙']).slice(0, 4).map(String);
  const domainB = (Array.isArray(spec.range) ? spec.range : domainA).slice(0, 4).map(String);
  const rel = domainA.map(() => domainB.map(() => false));
  if (Array.isArray(spec.relations)) {
    spec.relations.forEach((pair) => {
      const i = domainA.indexOf(String(pair && pair[0]));
      const j = domainB.indexOf(String(pair && pair[1]));
      if (i >= 0 && j >= 0) rel[i][j] = true;
    });
  }
  const state = { form: Array.isArray(spec.form) && spec.form[0] === 'exists' ? 'exists forall' : 'forall exists' };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const padL = 62;
  const padT = 48;
  const cell = 52;
  const H = padT + domainB.length * cell + 72;
  let r = null;
  let geom = {};

  function verdict() {
    if (state.form === 'forall exists') {
      const bad = [];
      const witnesses = [];
      domainA.forEach((a, i) => {
        const hit = domainB.findIndex((b, j) => rel[i][j]);
        if (hit < 0) bad.push(a);
        else witnesses.push(a + '→' + domainB[hit]);
      });
      return bad.length
        ? { ok: false, text: '反例：' + bad.join('、') + ' 没有任何箭头。' }
        : { ok: true, text: '成立。witness：' + witnesses.join('；') };
    }
    const winners = domainA.filter((a, i) => domainB.every((b, j) => rel[i][j]));
    return winners.length
      ? { ok: true, text: '成立。这个幸运元素是：' + winners.join('、') }
      : { ok: false, text: '没有任何单个元素连向全部对象，命题为假。' };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    geom.cells = [];
    ctx.fillStyle = tc.fg;
    ctx.textAlign = 'left';
    ctx.font = '600 14px system-ui';
    ctx.fillText(state.form === 'forall exists' ? '∀a ∃b：R(a,b)' : '∃a ∀b：R(a,b)', 12, 24);
    ctx.font = '13px system-ui';
    domainA.forEach((a, i) => {
      ctx.fillText(a, 16, padT + i * cell + cell / 2 + 5);
      ctx.strokeStyle = tc.axis;
      ctx.strokeRect(padL, padT + i * cell, domainB.length * cell, cell);
    });
    domainB.forEach((b, j) => ctx.fillText(b, padL + j * cell + 22, padT - 12));
    domainA.forEach((a, i) => domainB.forEach((b, j) => {
      const x = padL + j * cell;
      const y = padT + i * cell;
      geom.cells.push({ i, j, x, y });
      ctx.fillStyle = rel[i][j] ? 'rgba(46,125,50,0.45)' : softFill();
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      ctx.fillStyle = rel[i][j] ? '#e8eaed' : tc.fg;
      ctx.textAlign = 'center';
      ctx.fillText(rel[i][j] ? '✓' : '×', x + cell / 2, y + cell / 2 + 5);
    }));
    const result = verdict();
    ctx.textAlign = 'left';
    ctx.fillStyle = result.ok ? '#15803d' : '#dc2626';
    ctx.font = '600 13px system-ui';
    ctx.fillText(result.ok ? '命题为真' : '命题为假', 12, H - 24);
    cap.textContent = result.text + ' 点击格子增删关系，再切换量词顺序看结论怎么翻转。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  r.canvas.addEventListener('pointerdown', (ev) => {
    const box = r.canvas.getBoundingClientRect();
    const x = (ev.clientX - box.left) * (r.canvas._W / box.width);
    const y = (ev.clientY - box.top) * (r.canvas._H / box.height);
    const id = geom.cells.findIndex((c) => x >= c.x && x <= c.x + cell && y >= c.y && y <= c.y + cell);
    if (id >= 0) {
      const c = geom.cells[id];
      rel[c.i][c.j] = !rel[c.i][c.j];
      draw();
      ev.preventDefault();
    }
  });
  const btn = mkBtn('切换 ∀∃ / ∃∀');
  btn.addEventListener('click', () => {
    state.form = state.form === 'forall exists' ? 'exists forall' : 'forall exists';
    draw();
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  controls.appendChild(btn);
  draw();
  return { slidersBox: controls };
}

/* ---------- 关系体检仪：点矩阵改关系，四项性质即时刷新 ---------- */

function renderRelationChecker(host, spec) {
  const items = (Array.isArray(spec.elements) ? spec.elements : ['a', 'b', 'c'])
    .slice(0, 5)
    .map(String);
  const rel = items.map(() => items.map(() => false));
  if (Array.isArray(spec.pairs)) {
    spec.pairs.forEach((pair) => {
      const i = items.indexOf(String(pair && pair[0]));
      const j = items.indexOf(String(pair && pair[1]));
      if (i >= 0 && j >= 0) rel[i][j] = true;
    });
  }
  const initial = rel.map((row) => row.slice());
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);

  const padL = 64;
  const padT = 48;
  const n = items.length;
  const cell = 40;
  const H = padT + n * cell + 112;
  let geom = [];
  let r = null;

  function checks() {
    const reflexive = items.every((item, i) => rel[i][i]);
    const symmetric = items.every((item, i) => items.every((other, j) => rel[i][j] === rel[j][i]));
    const antisymmetric = items.every((item, i) => items.every((other, j) => (
      i === j || !rel[i][j] || !rel[j][i]
    )));
    const transitive = items.every((a, i) => items.every((b, j) => items.every((c, k) => (
      !rel[i][j] || !rel[j][k] || rel[i][k]
    ))));
    return [
      ['自反', reflexive],
      ['对称', symmetric],
      ['反对称', antisymmetric],
      ['传递', transitive],
    ];
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = tc.fg;
    ctx.textAlign = 'left';
    ctx.font = '600 14px system-ui';
    ctx.fillText('关系矩阵：行 → 列', 12, 24);
    ctx.font = '12px system-ui';
    items.forEach((item, j) => ctx.fillText(item, padL + j * cell + cell / 2 - 4, padT - 12));
    geom = [];
    items.forEach((item, i) => {
      ctx.fillText(item, 16, padT + i * cell + cell / 2 + 4);
      items.forEach((other, j) => {
        const x = padL + j * cell;
        const y = padT + i * cell;
        geom.push({ i, j, x, y });
        ctx.fillStyle = rel[i][j]
          ? (i === j ? 'rgba(14,116,144,0.52)' : 'rgba(46,125,50,0.45)')
          : softFill();
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ctx.fillStyle = rel[i][j] ? '#e8eaed' : tc.fg;
        ctx.textAlign = 'center';
        ctx.fillText(rel[i][j] ? '✓' : '×', x + cell / 2, y + cell / 2 + 4);
        ctx.textAlign = 'left';
      });
    });

    const results = checks();
    results.forEach(([name, ok], idx) => {
      const x = 16 + (idx % 2) * Math.max(110, (W - 32) / 2);
      const y = padT + n * cell + 30 + Math.floor(idx / 2) * 26;
      ctx.fillStyle = ok ? '#15803d' : '#dc2626';
      ctx.beginPath();
      ctx.arc(x, y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tc.fg;
      ctx.font = '13px system-ui';
      ctx.fillText(name + '：' + (ok ? '通过' : '未过'), x + 12, y);
    });
    cap.textContent = '点击任意格子增删有序对。对角线用青色标出，方便区分自反性和普通关系。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  r.canvas.addEventListener('pointerdown', (ev) => {
    const box = r.canvas.getBoundingClientRect();
    const x = (ev.clientX - box.left) * (r.canvas._W / box.width);
    const y = (ev.clientY - box.top) * (r.canvas._H / box.height);
    const hit = geom.find((c) => x >= c.x && x <= c.x + cell && y >= c.y && y <= c.y + cell);
    if (hit) {
      rel[hit.i][hit.j] = !rel[hit.i][hit.j];
      draw();
      ev.preventDefault();
    }
  });

  const resetBtn = mkBtn('还原初始关系');
  resetBtn.addEventListener('click', () => {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) rel[i][j] = initial[i][j];
    }
    draw();
  });
  const reflexiveBtn = mkBtn('补自反对角线');
  reflexiveBtn.addEventListener('click', () => {
    items.forEach((item, i) => { rel[i][i] = true; });
    draw();
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  controls.append(resetBtn, reflexiveBtn);
  draw();
  return { slidersBox: controls };
}

/* ---------- 集合映射盘：函数、单射、满射一眼分层 ---------- */

function renderSetmapper(host, spec) {
  const left = (Array.isArray(spec.left) ? spec.left : ['1', '2', '3']).map(String);
  const right = (Array.isArray(spec.right) ? spec.right : ['a', 'b']).map(String);
  const arrows = left.map(() => right.map(() => false));
  if (Array.isArray(spec.arrows)) {
    spec.arrows.forEach((pair) => {
      const i = Number(pair && pair[0]);
      const j = Number(pair && pair[1]);
      if (i >= 0 && i < left.length && j >= 0 && j < right.length) arrows[i][j] = true;
    });
  }
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = Math.max(230, Math.max(left.length, right.length) * 52 + 70);
  let r = null;
  let geom = {};

  function classify() {
    const counts = arrows.map((row) => row.filter(Boolean).length);
    const targets = right.map((_, j) => arrows.reduce((sum, row) => sum + (row[j] ? 1 : 0), 0));
    const isFn = counts.every((n) => n === 1);
    const images = arrows.map((row) => row.findIndex(Boolean));
    const injective = isFn && new Set(images).size === images.length;
    const surjective = isFn && targets.every((n) => n > 0);
    if (!isFn) return '一般关系（还不是函数）：每个左侧元素必须恰好一个箭头。';
    if (injective && surjective) return '双射：一一对应，没有落单，也没有重复。';
    if (injective) return '单射：不撞像，但右侧还有元素没被照到。';
    if (surjective) return '满射：右侧全覆盖，但有不同输入共用同一个像。';
    return '普通函数：每个输入有唯一输出，但不保证不重复、不保证全覆盖。';
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const lx = 54;
    const rx = W - 54;
    /* 右侧集合超过 6 个元素时压缩中间箭头点阵的横向间距，防止溢出画布 */
    const crowded = right.length > 6;
    const dotGap = crowded ? Math.min(26, Math.max(8, (rx - lx - 130) / right.length)) : 26;
    const dotR = crowded ? Math.max(6, Math.round(Math.min(13, dotGap * 0.46))) : 13;
    const dotFs = crowded ? Math.max(7, Math.min(11, dotR)) : 11;
    const ly = (i) => 44 + i * ((H - 88) / Math.max(1, left.length - 1 || 1));
    const ry = (j) => 44 + j * ((H - 88) / Math.max(1, right.length - 1 || 1));
    geom.cells = [];
    arrows.forEach((row, i) => row.forEach((on, j) => {
      const cx = (lx + rx) / 2 + (j - (right.length - 1) / 2) * dotGap;
      geom.cells.push({ i, j, cx, cy: ly(i) });
      ctx.beginPath();
      ctx.arc(cx, ly(i), dotR, 0, Math.PI * 2);
      ctx.fillStyle = on ? 'rgba(46,125,50,0.55)' : softFill();
      ctx.fill();
      ctx.fillStyle = tc.fg;
      ctx.textAlign = 'center';
      ctx.font = `${dotFs}px system-ui`;
      ctx.fillText(i + '→' + j, cx, ly(i) + 4);
      if (on) {
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(lx + 18, ly(i));
        ctx.lineTo(rx - 22, ry(j));
        ctx.stroke();
      }
    }));
    left.forEach((item, i) => node(ctx, lx, ly(i), item, 'rgba(59,116,214,0.65)', '#fff'));
    right.forEach((item, j) => node(ctx, rx, ry(j), item, 'rgba(232,135,30,0.68)', '#fff'));
    cap.textContent = classify() + ' 点击中间圆点增删一条箭头。';
  }

  function node(ctx, x, y, text, fill, fg) {
    const tc = themeColors();
    ctx.beginPath();
    ctx.arc(x, y, 19, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = tc.axis;
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui';
    ctx.fillText(text, x, y + 4);
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  r.canvas.addEventListener('pointerdown', (ev) => {
    const box = r.canvas.getBoundingClientRect();
    const x = (ev.clientX - box.left) * (r.canvas._W / box.width);
    const y = (ev.clientY - box.top) * (r.canvas._H / box.height);
    const id = geom.cells.findIndex((c) => Math.hypot(x - c.cx, y - c.cy) <= 14);
    if (id >= 0) {
      const c = geom.cells[id];
      arrows[c.i][c.j] = !arrows[c.i][c.j];
      draw();
      ev.preventDefault();
    }
  });
  const reset = mkBtn('恢复初始映射');
  reset.addEventListener('click', () => {
    arrows.forEach((row) => row.fill(false));
    if (Array.isArray(spec.arrows)) {
      spec.arrows.forEach((pair) => {
        const i = Number(pair && pair[0]);
        const j = Number(pair && pair[1]);
        if (i >= 0 && i < left.length && j >= 0 && j < right.length) arrows[i][j] = true;
      });
    }
    draw();
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  controls.appendChild(reset);
  draw();
  return { slidersBox: controls };
}

/* ---------- 证明轨迹：把“凭什么”接成有向链 ---------- */

function renderProoftrail(host, spec) {
  const steps = (Array.isArray(spec.steps) ? spec.steps : [])
    .map((s, i) => ({ id: String(s.id || i), text: String(s.text || s), col: i % 2, row: Math.floor(i / 2) }))
    .slice(0, 6);
  const byId = new Map(steps.map((s, i) => [s.id, i]));
  const startEdges = (Array.isArray(spec.edges) ? spec.edges : [])
    .map((e) => [byId.get(String(e && e[0])), byId.get(String(e && e[1]))])
    .filter(([a, b]) => a != null && b != null && a !== b);
  /* 预置了完整链条时，「按顺序连链」指令会空转——初始提示改为引导先清空再重建 */
  const state = {
    edges: startEdges.map((e) => e.slice()),
    selected: null,
    message: startEdges.length
      ? '已预置完整链条：先点「清空」，再凭理解自己连一遍，检验每个环节为什么必不可少。'
      : '点击两张卡：先选原因，再选结果。',
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const cardW = 148;
  const cardH = 66;
  const gapX = 28;
  const gapY = 26;
  const H = Math.ceil(Math.max(1, steps.length) / 2) * (cardH + gapY) + 78;
  let r = null;
  let geom = {};

  function audit() {
    const n = steps.length;
    const adj = Array.from({ length: n }, () => []);
    const indeg = Array(n).fill(0);
    state.edges.forEach(([a, b]) => { adj[a].push(b); indeg[b]++; });
    const color = Array(n).fill(0);
    let cyclic = false;
    function visit(i) {
      if (color[i]) return;
      color[i] = 1;
      adj[i].forEach((j) => {
        if (color[j] === 1) cyclic = true;
        visit(j);
      });
      color[i] = 2;
    }
    steps.forEach((_, i) => visit(i));
    if (cyclic) return '循环论证：依赖链绕回了自己。';
    const roots = indeg.map((v, i) => [v, i]).filter(([v]) => v === 0).map(([, i]) => i);
    if (!roots.length) return '缺少起点：每张卡都依赖别人，证明没有立足地。';
    const seen = new Set(roots);
    const stack = roots.slice();
    while (stack.length) {
      const u = stack.pop();
      adj[u].forEach((v) => { if (!seen.has(v)) { seen.add(v); stack.push(v); } });
    }
    const missing = steps.filter((_, i) => !seen.has(i)).map((s) => s.id);
    return missing.length
      ? '缺少桥梁：' + missing.join('、') + ' 还没有接到前提链上。'
      : '依赖链成立：从起点出发能到达每一步，且没有循环。';
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const scale = Math.min(1, W / (cardW * 2 + gapX + 24));
    const cw = cardW * scale;
    const offsetX = Math.max(12, (W - (cw * 2 + gapX)) / 2);
    geom.cards = [];
    steps.forEach((step, i) => {
      const ch = cardH;
      const x = offsetX + step.col * (cw + gapX);
      const y = 18 + step.row * (ch + gapY);
      geom.cards.push({ i, x, y, w: cw, h: ch });
      ctx.fillStyle = state.selected === i ? 'rgba(124,58,237,0.25)' : softFill();
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = tc.axis;
      ctx.strokeRect(x, y, cw, ch);
      ctx.fillStyle = tc.fg;
      ctx.textAlign = 'left';
      ctx.font = '600 11px system-ui';
      ctx.fillText(step.id, x + 9, y + 18);
      wrapText(ctx, step.text, x + 9, y + 36, cw - 18, 15);
    });
    state.edges.forEach(([a, b]) => {
      const A = geom.cards[a];
      const B = geom.cards[b];
      if (!A || !B) return;
      const ax = A.x + A.w / 2;
      const ay = A.y + A.h / 2;
      const bx = B.x + B.w / 2;
      const by = B.y + B.h / 2;
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 18, bx, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
    });
    /* 状态消息只走 caption 一处（canvas 内重复绘制曾造成同一条提示显示两行） */
    ctx.textAlign = 'left';
    ctx.font = '600 13px system-ui';
    cap.textContent = state.message;
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  r.canvas.addEventListener('pointerdown', (ev) => {
    const box = r.canvas.getBoundingClientRect();
    const x = (ev.clientX - box.left) * (r.canvas._W / box.width);
    const y = (ev.clientY - box.top) * (r.canvas._H / box.height);
    const id = geom.cards.findIndex((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
    if (id >= 0) {
      if (state.selected == null) {
        state.selected = id;
        state.message = '已选第 ' + steps[id].id + ' 步，再选它的结果。';
      } else if (state.selected === id) {
        state.selected = null;
        state.message = '已取消选择。';
      } else {
        const edge = [state.selected, id];
        if (!state.edges.some((e) => e[0] === edge[0] && e[1] === edge[1])) state.edges.push(edge);
        state.selected = null;
        state.message = audit();
      }
      draw();
      ev.preventDefault();
    }
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  [['检查', () => { state.message = audit(); draw(); }],
    ['撤销一步', () => { state.edges.pop(); state.message = audit(); draw(); }],
    ['清空', () => { state.edges = []; state.selected = null; state.message = '已清空：先点两张卡，从前提开始重建依赖链。'; draw(); }],
  ].forEach(([text, fn]) => {
    const btn = mkBtn(text);
    btn.addEventListener('click', fn);
    controls.appendChild(btn);
  });
  draw();
  return { slidersBox: controls };
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  let yy = y;
  String(text).split('').forEach((ch) => {
    if (ctx.measureText(line + ch).width > maxWidth) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lineHeight;
    } else line += ch;
  });
  ctx.fillText(line, x, yy);
}

/* ---------- 线代进阶公共工具 ---------- */

function fmtFixed(value, digits = 2) {
  return Number(value.toFixed(digits)).toString();
}

function drawPlaneGrid(ctx, pm, hx, hy) {
  const tc = themeColors();
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = tc.grid;
  ctx.lineWidth = 1;
  for (let x = Math.ceil(-hx); x <= Math.floor(hx); x++) line(ctx, pm.X(x), pm.Y(-hy), pm.X(x), pm.Y(hy));
  for (let y = Math.ceil(-hy); y <= Math.floor(hy); y++) line(ctx, pm.X(-hx), pm.Y(y), pm.X(hx), pm.Y(y));
  ctx.setLineDash([]);
  ctx.strokeStyle = tc.axis;
  line(ctx, pm.X(-hx), pm.Y(0), pm.X(hx), pm.Y(0));
  line(ctx, pm.X(0), pm.Y(-hy), pm.X(0), pm.Y(hy));
}

function eigSym2(m11, m12, m22) {
  const trace = m11 + m22;
  const disc = trace * trace - 4 * (m11 * m22 - m12 * m12);
  if (disc < -1e-9) return null;
  const root = Math.sqrt(Math.max(0, disc));
  return [trace + root, trace - root].map((lambda) => {
    if (Math.abs(m12) > 1e-9) return { lambda, v: [m12, lambda - m11] };
    if (Math.abs(m11 - lambda) > Math.abs(m22 - lambda)) return { lambda, v: [1, 0] };
    return { lambda, v: [0, 1] };
  }).map((item) => {
    const norm = Math.hypot(item.v[0], item.v[1]) || 1;
    return { lambda: item.lambda, v: [item.v[0] / norm, item.v[1] / norm] };
  });
}

function eigGeneral2(a, b, c, d) {
  const trace = a + d;
  const det = a * d - b * c;
  const disc = trace * trace - 4 * det;
  if (disc < -1e-9) return [];
  const root = Math.sqrt(Math.max(0, disc));
  return [(trace + root) / 2, (trace - root) / 2].map((lambda) => {
    let vec;
    if (Math.abs(b) > 1e-9) vec = [b, lambda - a];
    else if (Math.abs(c) > 1e-9) vec = [lambda - d, c];
    else vec = Math.abs(lambda - a) < Math.abs(lambda - d) ? [1, 0] : [0, 1];
    const norm = Math.hypot(vec[0], vec[1]) || 1;
    return { lambda, v: [vec[0] / norm, vec[1] / norm] };
  });
}

function expandedRange(value, min, max) {
  return { min: Math.min(min, value), max: Math.max(max, value) };
}

function sourceSignature(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/* ---------- 高斯消元：行变解不变 ---------- */

function renderElimination(host, spec) {
  const m = Array.isArray(spec.matrix) ? spec.matrix : [2, 1, 3, 4];
  const rhs = Array.isArray(spec.rhs) ? spec.rhs : [7, 12];
  const state = {
    a: Number(m[0]) || 2,
    b: Number(m[1]) || 1,
    c: Number(m[2]) || 3,
    d: Number(m[3]) || 4,
    r1: Number(rhs[0]) || 7,
    r2: Number(rhs[1]) || 12,
    step: 0,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const hx = 8;
  const hy = 5;
  let r = null;

  function currentRows() {
    const { a, b, c, d, r1, r2, step } = state;
    if (step === 0) return [[a, b, r1], [c, d, r2]];
    if (step === 1) {
      if (Math.abs(a) > 1e-9) return [[1, b / a, r1 / a], [c, d, r2]];
      return [[c, d, r2], [a, b, r1]];
    }
    let top = [a, b, r1];
    let bottom = [c, d, r2];
    if (Math.abs(a) <= 1e-9) {
      top = [c, d, r2];
      bottom = [a, b, r1];
    }
    const factor = Math.abs(top[0]) > 1e-9 ? bottom[0] / top[0] : 0;
    bottom = bottom.map((value, i) => value - factor * top[i]);
    if (step === 2) return [top, bottom];
    const factor2 = top[1] / (bottom[1] || 1);
    top = top.map((value, i) => value - factor2 * bottom[i]);
    return [top, bottom];
  }

  function solution() {
    const { a, b, c, d, r1, r2 } = state;
    const det = a * d - b * c;
    if (Math.abs(det) > 1e-9) return { kind: 'unique', x: (r1 * d - b * r2) / det, y: (a * r2 - c * r1) / det };
    const same = Math.abs(a * r2 - c * r1) < 1e-9 && Math.abs(b * r2 - d * r1) < 1e-9;
    return same ? { kind: 'infinite' } : { kind: 'none' };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const colors = ['#3b74d6', '#e8871e'];
    [[state.a, state.b, state.r1], [state.c, state.d, state.r2]].forEach(([a, b, rhsValue], i) => {
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 2.4;
      if (Math.abs(b) > 1e-9) {
        line(ctx, pm.X(-hx), pm.Y((rhsValue - a * -hx) / b), pm.X(hx), pm.Y((rhsValue - a * hx) / b));
      } else if (Math.abs(a) > 1e-9) {
        line(ctx, pm.X(rhsValue / a), pm.Y(-hy), pm.X(rhsValue / a), pm.Y(hy));
      }
    });
    const ans = solution();
    if (ans.kind === 'unique') {
      ctx.beginPath();
      ctx.arc(pm.X(ans.x), pm.Y(ans.y), 7, 0, Math.PI * 2);
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
      ctx.strokeStyle = tc.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const rows = currentRows();
    ctx.textAlign = 'left';
    ctx.font = '600 14px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText('增广矩阵', 16, 28);
    ctx.font = '14px monospace';
    rows.forEach((row, i) => {
      ctx.fillStyle = i ? '#b45309' : '#3b74d6';
      ctx.fillText(`[${row.map((v) => fmtFixed(v)).join('  ')} | ${fmtFixed(row[2])}]`, 16, 54 + i * 22);
    });
    ctx.fillStyle = ans.kind === 'unique' ? '#15803d' : '#dc2626';
    ctx.font = '600 13px system-ui';
    ctx.fillText(ans.kind === 'unique' ? `唯一解 x=${fmtFixed(ans.x)}, y=${fmtFixed(ans.y)}` : ans.kind === 'infinite' ? '无穷多解：一条重合直线' : '无解：两条直线平行', 16, H - 20);
    cap.textContent = ['原始方程组', '归一或交换第一行', '消去第二行首项', '继续回代成最简形'][state.step] + '。行变了，蓝色和橙色两条直线没有动——这就是“保持解集”。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'a', min: -4, max: 4, step: 1, value: state.a },
      { name: 'b', min: -4, max: 4, step: 1, value: state.b },
      { name: 'c', min: -4, max: 4, step: 1, value: state.c },
      { name: 'd', min: -4, max: 4, step: 1, value: state.d },
      { name: 'r1', min: -10, max: 10, step: 1, value: state.r1 },
      { name: 'r2', min: -10, max: 10, step: 1, value: state.r2 },
    ],
  }, (next) => {
    Object.assign(state, next);
    state.step = Math.min(state.step, 1);
    draw();
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const next = mkBtn('下一步消元');
  next.addEventListener('click', () => { state.step = (state.step + 1) % 4; draw(); });
  const reset = mkBtn('重置步骤');
  reset.addEventListener('click', () => { state.step = 0; draw(); });
  controls.append(next, reset, sl.box);
  draw();
  return { slidersBox: controls };
}

/* ---------- 张成空间：线、面与秩 ---------- */

function renderSpanspace(host, spec) {
  const state = {
    v1: { x: spec.v1 ? spec.v1[0] : 2, y: spec.v1 ? spec.v1[1] : 1 },
    v2: { x: spec.v2 ? spec.v2[0] : 1, y: spec.v2 ? spec.v2[1] : 2 },
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const hx = 5;
  const hy = 4;
  let r = null;
  let pm = null;
  const geo = {};

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const det = state.v1.x * state.v2.y - state.v2.x * state.v1.y;
    const p1 = { x: pm.X(state.v1.x), y: pm.Y(state.v1.y) };
    const p2 = { x: pm.X(state.v2.x), y: pm.Y(state.v2.y) };
    geo.p1 = p1;
    geo.p2 = p2;
    if (Math.abs(det) > 1e-9) {
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.moveTo(pm.cx, pm.cy);
      ctx.lineTo(p1.x, p1.y);
      const corner = { x: state.v1.x + state.v2.x, y: state.v1.y + state.v2.y };
      ctx.lineTo(pm.X(corner.x), pm.Y(corner.y));
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      const source = Math.hypot(state.v1.x, state.v1.y) > 1e-9 ? state.v1 : state.v2;
      if (Math.hypot(source.x, source.y) > 1e-9) {
        ctx.strokeStyle = 'rgba(124,58,237,0.55)';
        ctx.lineWidth = 8;
        line(ctx, pm.X(-source.x * 10), pm.Y(-source.y * 10), pm.X(source.x * 10), pm.Y(source.y * 10));
      }
    }
    arrow(ctx, pm.cx, pm.cy, p1.x, p1.y, '#3b74d6', 4);
    arrow(ctx, pm.cx, pm.cy, p2.x, p2.y, '#e8871e', 4);
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3b74d6';
    ctx.fillText('v1', p1.x + (p1.x > pm.cx ? 20 : -20), p1.y + 4);
    ctx.fillStyle = '#b45309';
    ctx.fillText('v2', p2.x + (p2.x > pm.cx ? 20 : -20), p2.y + 4);
    const rank = Math.abs(det) > 1e-9 ? 2 : (Math.hypot(state.v1.x, state.v1.y) > 1e-9 || Math.hypot(state.v2.x, state.v2.y) > 1e-9 ? 1 : 0);
    ctx.textAlign = 'left';
    ctx.font = '600 14px system-ui';
    ctx.fillStyle = themeColors().fg;
    ctx.fillText(`rank = ${rank}，张成 = ${rank === 2 ? '整张平面' : rank === 1 ? '一条直线' : '只有原点'}`, 16, 28);
    cap.textContent = '两个方向独立时，任意平面点都能由它们配出来；一旦共线，自由度立刻塌成一条线。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (Math.hypot(x - geo.p1.x, y - geo.p1.y) <= 20) return 'v1';
      if (Math.hypot(x - geo.p2.x, y - geo.p2.y) <= 20) return 'v2';
      return null;
    },
    move(id, x, y) {
      state[id] = { x: clamp(Math.round(pm.invX(x) * 2) / 2, -hx + 0.5, hx - 0.5), y: clamp(Math.round(pm.invY(y) * 2) / 2, -hy + 0.5, hy - 0.5) };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 行列式：有向面积 ---------- */

function renderDetarea(host, spec) {
  const state = {
    c1: { x: spec.c1 ? spec.c1[0] : 2, y: spec.c1 ? spec.c1[1] : 0 },
    c2: { x: spec.c2 ? spec.c2[0] : 1, y: spec.c2 ? spec.c2[1] : 2 },
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 320;
  const hx = 4;
  const hy = 3.2;
  let r = null;
  let pm = null;
  const geo = {};

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const det = state.c1.x * state.c2.y - state.c2.x * state.c1.y;
    const p1 = { x: pm.X(state.c1.x), y: pm.Y(state.c1.y) };
    const p2 = { x: pm.X(state.c2.x), y: pm.Y(state.c2.y) };
    const corner = { x: state.c1.x + state.c2.x, y: state.c1.y + state.c2.y };
    geo.p1 = p1;
    geo.p2 = p2;
    ctx.beginPath();
    ctx.moveTo(pm.cx, pm.cy);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(pm.X(corner.x), pm.Y(corner.y));
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.fillStyle = det >= 0 ? 'rgba(46,125,50,0.30)' : 'rgba(220,38,38,0.28)';
    ctx.fill();
    ctx.strokeStyle = det >= 0 ? '#2e7d32' : '#dc2626';
    ctx.lineWidth = 2;
    ctx.stroke();
    arrow(ctx, pm.cx, pm.cy, p1.x, p1.y, '#3b74d6', 4);
    arrow(ctx, pm.cx, pm.cy, p2.x, p2.y, '#e8871e', 4);
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3b74d6';
    ctx.fillText('c1', p1.x + (p1.x > pm.cx ? 20 : -20), p1.y + 4);
    ctx.fillStyle = '#b45309';
    ctx.fillText('c2', p2.x + (p2.x > pm.cx ? 20 : -20), p2.y + 4);
    ctx.textAlign = 'left';
    ctx.font = '600 14px monospace';
    ctx.fillStyle = themeColors().fg;
    ctx.fillText(`det = c1x·c2y - c2x·c1y = ${fmtFixed(det)}`, 16, 28);
    ctx.font = '13px system-ui';
    ctx.fillText(det > 0 ? '面积放大 ' + fmtFixed(det) + ' 倍，定向不变' : det < 0 ? '面积放大 ' + fmtFixed(Math.abs(det)) + ' 倍，定向翻转' : '面积归零：两列共线，不可逆', 16, 50);
    cap.textContent = '绿色是定向不变，红色是翻面；面积只看绝对值，行列式还记住方向。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (Math.hypot(x - geo.p1.x, y - geo.p1.y) <= 20) return 'c1';
      if (Math.hypot(x - geo.p2.x, y - geo.p2.y) <= 20) return 'c2';
      return null;
    },
    move(id, x, y) {
      state[id] = { x: clamp(Math.round(pm.invX(x) * 4) / 4, -hx + 0.25, hx - 0.25), y: clamp(Math.round(pm.invY(y) * 4) / 4, -hy + 0.25, hy - 0.25) };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 特征方向：变换后不转向 ---------- */

function renderEigendirection(host, spec) {
  const m = Array.isArray(spec.matrix) ? spec.matrix : [3, 1, 0, 2];
  const state = {
    a: Number(m[0]) || 3,
    b: Number(m[1]) || 1,
    c: Number(m[2]) || 0,
    d: Number(m[3]) || 2,
    v: { x: 1, y: 0.35 },
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const hx = 5;
  const hy = 4;
  let r = null;
  let pm = null;
  const geo = {};

  function eigenPairs() {
    return eigGeneral2(state.a, state.b, state.c, state.d);
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const { a, b, c, d, v } = state;
    const av = { x: a * v.x + b * v.y, y: c * v.x + d * v.y };
    const vv = v.x * v.x + v.y * v.y;
    const t = vv > 1e-9 ? (av.x * v.x + av.y * v.y) / vv : 0;
    const proj = { x: t * v.x, y: t * v.y };
    const residual = Math.hypot(av.x - proj.x, av.y - proj.y);
    const pv = { x: pm.X(v.x), y: pm.Y(v.y) };
    const pa = { x: pm.X(av.x), y: pm.Y(av.y) };
    const pp = { x: pm.X(proj.x), y: pm.Y(proj.y) };
    geo.pv = pv;
    eigenPairs().forEach((pair) => {
      ctx.strokeStyle = 'rgba(124,58,237,0.45)';
      ctx.lineWidth = 5;
      line(ctx, pm.X(pair.v[0] * -10), pm.Y(pair.v[1] * -10), pm.X(pair.v[0] * 10), pm.Y(pair.v[1] * 10));
    });
    arrow(ctx, pm.cx, pm.cy, pv.x, pv.y, '#3b74d6', 4);
    arrow(ctx, pm.cx, pm.cy, pp.x, pp.y, '#e8871e', 4);
    arrow(ctx, pm.cx, pm.cy, pa.x, pa.y, '#b3261e', 3);
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3b74d6';
    ctx.fillText('v', pv.x + 16, pv.y + 4);
    ctx.fillStyle = '#b3261e';
    ctx.fillText('Av', pa.x + 16, pa.y + 4);
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = themeColors().fg;
    ctx.fillText(`Av = (${fmtFixed(av.x)}, ${fmtFixed(av.y)})`, 16, 28);
    const pairs = eigenPairs();
    if (!pairs.length) {
      ctx.fillStyle = '#b3261e';
      ctx.fillText('实特征方向：无（复特征值）', 16, 50);
    } else {
      ctx.fillText('特征方向 λ：' + pairs.map((pair) => fmtFixed(pair.lambda)).join('，'), 16, 50);
    }
    ctx.fillStyle = residual < 0.04 ? '#15803d' : '#dc2626';
    ctx.fillText(`偏转残差 = ${fmtFixed(residual, 3)}`, 16, 70);
    cap.textContent = residual < 0.04 ? '红箭头已经落在蓝箭头所在直线上：这就是不变方向。' : '拖动蓝色试探向量，让红色 Av 落回蓝色直线上；橙色是 Av 的最佳同向投影。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return Math.hypot(x - geo.pv.x, y - geo.pv.y) <= 20 ? 'v' : null;
    },
    move(id, x, y) {
      state.v = { x: clamp(pm.invX(x), -hx + 0.2, hx - 0.2), y: clamp(pm.invY(y), -hy + 0.2, hy - 0.2) };
      draw();
    },
  });
  const sl = buildSliders({
    sliders: [
      { name: 'a', ...expandedRange(state.a, -3, 3), step: 1, value: state.a },
      { name: 'b', ...expandedRange(state.b, -3, 3), step: 1, value: state.b },
      { name: 'c', ...expandedRange(state.c, -3, 3), step: 1, value: state.c },
      { name: 'd', ...expandedRange(state.d, -3, 3), step: 1, value: state.d },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const snap = mkBtn('吸附最近特征方向');
  snap.addEventListener('click', () => {
    const pairs = eigenPairs();
    if (!pairs.length) return;
    const best = pairs.reduce((left, right) => {
      const score = (pair) => {
        const normV = Math.hypot(state.v.x, state.v.y) || 1;
        const normE = Math.hypot(pair.v[0], pair.v[1]) || 1;
        return Math.abs(state.v.x * pair.v[1] - state.v.y * pair.v[0]) /
          (normV * normE);
      };
      return score(right) < score(left) ? right : left;
    });
    state.v = { x: best.v[0], y: best.v[1] };
    draw();
  });
  controls.append(snap, sl.box);
  draw();
  return { slidersBox: controls };
}

/* ---------- SVD：旋转、伸缩、再旋转 ---------- */

function renderSvdstretch(host, spec) {
  const m = Array.isArray(spec.matrix) ? spec.matrix : [3, 1, 0, 2];
  const state = {
    a: Number(m[0]) || 3,
    b: Number(m[1]) || 1,
    c: Number(m[2]) || 0,
    d: Number(m[3]) || 2,
    rank1: false,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const hx = 4;
  const hy = 3.4;
  let r = null;

  function decomposition() {
    const { a, b, c, d } = state;
    const pairs = eigSym2(a * a + c * c, a * b + c * d, b * b + d * d) || [];
    const sorted = pairs.sort((left, right) => right.lambda - left.lambda).map((item) => ({
      sigma: Math.sqrt(Math.max(0, item.lambda)),
      v: item.v,
    }));
    while (sorted.length < 2) sorted.push({ sigma: 0, v: [1, 0] });
    const us = sorted.map((item) => {
      const raw = { x: state.a * item.v[0] + state.b * item.v[1], y: state.c * item.v[0] + state.d * item.v[1] };
      const norm = Math.hypot(raw.x, raw.y);
      return norm > 1e-9 ? { x: raw.x / norm, y: raw.y / norm } : { x: -item.v[1], y: item.v[0] };
    });
    return { values: sorted, us };
  }

  function applyMatrix(point) {
    if (!state.rank1) return { x: state.a * point[0] + state.b * point[1], y: state.c * point[0] + state.d * point[1] };
    const { values, us } = decomposition();
    const [v1] = values[0].v;
    const v2 = values[0].v[1];
    return {
      x: values[0].sigma * us[0].x * (v1 * point[0] + v2 * point[1]),
      y: values[0].sigma * us[0].y * (v1 * point[0] + v2 * point[1]),
    };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const { values, us } = decomposition();
    ctx.strokeStyle = 'rgba(59,116,214,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 90; k++) {
      const angle = Math.PI * 2 * k / 90;
      const q = applyMatrix([Math.cos(angle), Math.sin(angle)]);
      const px = pm.X(q.x);
      const py = pm.Y(q.y);
      if (!k) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    values.forEach((item, i) => {
      const color = i ? '#e8871e' : '#3b74d6';
      arrow(ctx, pm.cx, pm.cy, pm.X(item.v[0]), pm.Y(item.v[1]), color, 3);
      if (item.sigma > 1e-9) {
        arrow(ctx, pm.cx, pm.cy, pm.X(us[i].x), pm.Y(us[i].y), i ? '#16a34a' : '#7c3aed', 3);
      }
    });
    ctx.textAlign = 'left';
    ctx.font = '600 14px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(`σ1=${fmtFixed(values[0].sigma)}  σ2=${fmtFixed(values[1].sigma)}`, 16, 28);
    ctx.font = '13px system-ui';
    ctx.fillText(state.rank1 ? `rank-1 近似丢弃 σ2，能量误差²=${fmtFixed(values[1].sigma ** 2, 3)}` : '完整 A：单位圆变成椭圆', 16, 50);
    cap.textContent = state.rank1 ? '蓝色输入方向保留，紫色输出方向保留；被丢掉的 σ2 方向不再产生输出。' : '蓝/橙是右奇异方向 V，紫/绿是左奇异方向 U；A 先旋转到 V 轴，伸缩 σ，再转到 U 轴。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'a', ...expandedRange(state.a, -3, 3), step: 1, value: state.a },
      { name: 'b', ...expandedRange(state.b, -3, 3), step: 1, value: state.b },
      { name: 'c', ...expandedRange(state.c, -3, 3), step: 1, value: state.c },
      { name: 'd', ...expandedRange(state.d, -3, 3), step: 1, value: state.d },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const btn = mkBtn('切换完整 A / rank-1 近似');
  btn.addEventListener('click', () => { state.rank1 = !state.rank1; draw(); });
  controls.append(btn, sl.box);
  draw();
  return { slidersBox: controls };
}

/* ---------- PCA：方差最大，残差最小 ---------- */

function renderPcaprojection(host, spec) {
  const raw = Array.isArray(spec.points) && spec.points.length > 2
    ? spec.points.map((point) => ({ x: Number(point[0]) || 0, y: Number(point[1]) || 0 }))
    : [{ x: 1, y: 1 }, { x: 2, y: 2.1 }, { x: 3, y: 2.8 }, { x: 4, y: 4.1 }, { x: 5, y: 5 }];
  const mean = raw.reduce((acc, point) => ({ x: acc.x + point.x / raw.length, y: acc.y + point.y / raw.length }), { x: 0, y: 0 });
  const centered = raw.map((point) => ({ x: point.x - mean.x, y: point.y - mean.y }));
  const cxx = centered.reduce((sum, point) => sum + point.x * point.x, 0) / raw.length;
  const cxy = centered.reduce((sum, point) => sum + point.x * point.y, 0) / raw.length;
  const cyy = centered.reduce((sum, point) => sum + point.y * point.y, 0) / raw.length;
  const principal = eigSym2(cxx, cxy, cyy);
  const pcaAngle = principal ? Math.atan2(principal[0].v[1], principal[0].v[0]) * 180 / Math.PI : 0;
  const state = { angle: pcaAngle };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const hx = 6;
  const hy = 4;
  let r = null;
  let pm = null;

  function direction() {
    const rad = state.angle * Math.PI / 180;
    return { x: Math.cos(rad), y: Math.sin(rad) };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const dir = direction();
    const long = 20;
    ctx.strokeStyle = 'rgba(124,58,237,0.75)';
    ctx.lineWidth = 4;
    line(ctx, pm.X(mean.x - dir.x * long), pm.Y(mean.y - dir.y * long), pm.X(mean.x + dir.x * long), pm.Y(mean.y + dir.y * long));
    let variance = 0;
    let residual = 0;
    centered.forEach((point, i) => {
      const t = point.x * dir.x + point.y * dir.y;
      const proj = { x: mean.x + dir.x * t, y: mean.y + dir.y * t };
      variance += t * t / raw.length;
      residual += ((point.x - proj.x) ** 2 + (point.y - proj.y) ** 2) / raw.length;
      const pr = { x: pm.X(proj.x), y: pm.Y(proj.y) };
      const pp = { x: pm.X(raw[i].x), y: pm.Y(raw[i].y) };
      ctx.strokeStyle = 'rgba(179,38,30,0.55)';
      ctx.lineWidth = 1.5;
      line(ctx, pp.x, pp.y, pr.x, pr.y);
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#3b74d6';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#e8871e';
      ctx.fill();
    });
    ctx.textAlign = 'left';
    ctx.font = '600 14px system-ui';
    ctx.fillStyle = themeColors().fg;
    ctx.fillText(`方向 ${fmtFixed(state.angle, 0)}°：方差 ${fmtFixed(variance, 3)}，残差 ${fmtFixed(residual, 3)}`, 16, 28);
    ctx.fillStyle = '#dc2626';
    ctx.fillText('蓝点＝原始样本　橙点＝投影重构点（红线为被丢掉的残差）', 16, 50);
    cap.textContent = '橙点是每个样本留在直线上的部分，红线是丢掉的垂直残差。转动方向，方差变大时残差同步变小。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [{ name: 'angle', min: -180, max: 180, step: 1, value: state.angle }],
  }, (next) => { state.angle = next.angle; draw(); });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const btn = mkBtn('吸附第一主成分');
  btn.addEventListener('click', () => {
    state.angle = pcaAngle;
    sl.refs.angle.range.value = String(Math.round(pcaAngle));
    sl.refs.angle.val.textContent = String(Math.round(pcaAngle));
    draw();
  });
  controls.append(btn, sl.box);
  draw();
  return { slidersBox: controls };
}

/* ---------- 正定二次型：等值线与符号场 ---------- */

function renderQuadraticform(host, spec) {
  const m = Array.isArray(spec.matrix) ? spec.matrix : [2, 0.4, 0.4, 2];
  const state = {
    a: Number(m[0]) || 2,
    b: Number(m[1]) || 0.4,
    c: Number(m[3]) || 2,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const hx = 3;
  const hy = 2.4;
  let r = null;

  function classify() {
    const det = state.a * state.c - state.b * state.b;
    if (det > 1e-9) return state.a > 0 ? 'positive definite' : 'negative definite';
    if (det < -1e-9) return 'indefinite';
    return 'semidefinite';
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    for (let px = 0; px < W; px += 4) {
      for (let py = 0; py < H; py += 4) {
        const x = pm.invX(px);
        const y = pm.invY(py);
        const q = state.a * x * x + 2 * state.b * x * y + state.c * y * y;
        ctx.fillStyle = q >= 0 ? `rgba(46,125,50,${Math.min(0.30, Math.abs(q) / 10)})` : `rgba(220,38,38,${Math.min(0.30, Math.abs(q) / 10)})`;
        ctx.fillRect(px, py, 4, 4);
      }
    }
    drawPlaneGrid(ctx, pm, hx, hy);
    const pairs = eigSym2(state.a, state.b, state.c);
    if (pairs) pairs.forEach((pair) => {
      ctx.strokeStyle = pair.lambda >= 0 ? 'rgba(46,125,50,0.8)' : 'rgba(220,38,38,0.8)';
      ctx.lineWidth = 3;
      line(ctx, pm.X(-pair.v[0] * 4), pm.Y(-pair.v[1] * 4), pm.X(pair.v[0] * 4), pm.Y(pair.v[1] * 4));
      ctx.fillStyle = tc.fg;
      ctx.font = '600 12px monospace';
      ctx.fillText('λ=' + fmtFixed(pair.lambda), pm.X(pair.v[0] * 2) + 8, pm.Y(pair.v[1] * 2));
    });
    ctx.textAlign = 'left';
    ctx.font = '600 15px system-ui';
    ctx.fillStyle = tc.fg;
    ctx.fillText(`Q(x,y)=${fmtFixed(state.a)}x²+${fmtFixed(2 * state.b)}xy+${fmtFixed(state.c)}y²`, 16, 28);
    ctx.fillStyle = classify().startsWith('positive') ? '#15803d' : classify() === 'indefinite' ? '#dc2626' : '#b45309';
    ctx.fillText(classify(), 16, 52);
    cap.textContent = '绿区 Q≥0，红区 Q<0；两条特征线是符号场的骨架。正定要求所有方向都落在绿区。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'a', min: -2, max: 3, step: 0.1, value: state.a },
      { name: 'b', min: -2.5, max: 2.5, step: 0.1, value: state.b },
      { name: 'c', min: -2, max: 3, step: 0.1, value: state.c },
    ],
  }, (next) => { state.a = next.a; state.b = next.b; state.c = next.c; draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 最小二乘：竖直残差与正规方程 ---------- */

function renderLeastSquaresFit(host, spec) {
  const points = (Array.isArray(spec.points) ? spec.points : [[1, 1.2], [2, 1.8], [3, 3.1], [4, 3.7], [5, 5.2]])
    .slice(0, 8).map((point) => ({ x: Number(point[0]) || 0, y: Number(point[1]) || 0 }));
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const hx = Math.max(6, ...points.map((p) => Math.abs(p.x))) + 0.5;
  const hy = Math.max(6, ...points.map((p) => Math.abs(p.y))) + 0.5;
  let r = null;
  let pm = null;
  const geo = {};

  function solution() {
    const n = points.length;
    const sx = points.reduce((sum, p) => sum + p.x, 0);
    const sy = points.reduce((sum, p) => sum + p.y, 0);
    const sxx = points.reduce((sum, p) => sum + p.x * p.x, 0);
    const sxy = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const den = n * sxx - sx * sx;
    if (Math.abs(den) < 1e-9) return { m: 0, b: sy / n };
    const m = (n * sxy - sx * sy) / den;
    return { m, b: (sy - m * sx) / n };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const { m, b } = solution();
    ctx.strokeStyle = 'rgba(124,58,237,0.9)';
    ctx.lineWidth = 3;
    line(ctx, pm.X(-hx), pm.Y(-hx * m + b), pm.X(hx), pm.Y(hx * m + b));
    let sse = 0;
    points.forEach((point, i) => {
      const pred = m * point.x + b;
      const err = point.y - pred;
      sse += err * err;
      const pp = { x: pm.X(point.x), y: pm.Y(point.y) };
      const pq = { x: pp.x, y: pm.Y(pred) };
      geo['p' + i] = pp;
      ctx.strokeStyle = 'rgba(220,38,38,0.65)';
      ctx.lineWidth = 2;
      line(ctx, pp.x, pp.y, pq.x, pq.y);
      ctx.fillStyle = 'rgba(220,38,38,0.14)';
      ctx.fillRect(Math.min(pp.x, pq.x), Math.min(pp.y, pq.y), 4, Math.abs(pq.y - pp.y));
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#3b74d6';
      ctx.fill();
    });
    ctx.textAlign = 'left';
    ctx.font = '600 14px monospace';
    ctx.fillStyle = themeColors().fg;
    ctx.fillText(`y=${fmtFixed(m, 3)}x+${fmtFixed(b, 3)}`, 16, 28);
    ctx.fillStyle = '#dc2626';
    ctx.fillText(`竖直残差平方和=${fmtFixed(sse, 3)}`, 16, 50);
    cap.textContent = '蓝点可拖动；红线是每个点的竖直误差。正规方程让所有误差平方之和最小，而不是让点到直线的垂直距离最短。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return points.findIndex((_, i) => Math.hypot(x - geo['p' + i].x, y - geo['p' + i].y) <= 18);
    },
    move(id, x, y) {
      points[id] = {
        x: clamp(Math.round(pm.invX(x) * 4) / 4, -hx + 0.25, hx - 0.25),
        y: clamp(Math.round(pm.invY(y) * 4) / 4, -hy + 0.25, hy - 0.25),
      };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 线性映射：核、像与基去向 ---------- */

function renderLinearmap(host, spec) {
  const m = Array.isArray(spec.matrix) ? spec.matrix : [2, 1, 1, 2];
  const state = {
    a: Number(m[0]) || 2,
    b: Number(m[1]) || 1,
    c: Number(m[2]) || 1,
    d: Number(m[3]) || 2,
    p: { x: 1, y: 1 },
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const hx = 5;
  const hy = 4;
  let r = null;
  let pm = null;
  const geo = {};

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const det = state.a * state.d - state.b * state.c;
    const map = (point) => ({ x: state.a * point.x + state.b * point.y, y: state.c * point.x + state.d * point.y });
    const i1 = map({ x: 1, y: 0 });
    const j1 = map({ x: 0, y: 1 });
    const output = map(state.p);
    const pi = { x: pm.X(state.p.x), y: pm.Y(state.p.y) };
    const po = { x: pm.X(output.x), y: pm.Y(output.y) };
    geo.pi = pi;
    arrow(ctx, pm.cx, pm.cy, pm.X(i1.x), pm.Y(i1.y), '#3b74d6', 3.5);
    arrow(ctx, pm.cx, pm.cy, pm.X(j1.x), pm.Y(j1.y), '#e8871e', 3.5);
    if (Math.abs(det) < 1e-9) {
      const kernel = Math.abs(state.a) > 1e-9 || Math.abs(state.b) > 1e-9 ? { x: state.b, y: -state.a } : { x: 1, y: 0 };
      ctx.strokeStyle = 'rgba(220,38,38,0.8)';
      ctx.lineWidth = 6;
      line(ctx, pm.X(-kernel.x * 10), pm.Y(-kernel.y * 10), pm.X(kernel.x * 10), pm.Y(kernel.y * 10));
    }
    arrow(ctx, pm.cx, pm.cy, pi.x, pi.y, '#3b74d6', 3);
    arrow(ctx, pm.cx, pm.cy, po.x, po.y, '#7c3aed', 4);
    ctx.textAlign = 'left';
    ctx.font = '600 14px monospace';
    ctx.fillStyle = themeColors().fg;
    ctx.fillText(`T(v)=(${fmtFixed(output.x)}, ${fmtFixed(output.y)})`, 16, 28);
    ctx.fillStyle = Math.abs(det) < 1e-9 ? '#dc2626' : '#15803d';
    ctx.fillText(Math.abs(det) < 1e-9 ? 'rank=1：像是一条线，核是一条线' : 'rank=2：像是整张平面，核只有零', 16, 50);
    cap.textContent = '蓝色/橙色是两个基向量的去向。紫点是输入 v 的像；拖动 v，线性映射永远保持网格平行和原点不动。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return Math.hypot(x - geo.pi.x, y - geo.pi.y) <= 20 ? 'p' : null;
    },
    move(id, x, y) {
      state.p = { x: clamp(pm.invX(x), -hx + 0.2, hx - 0.2), y: clamp(pm.invY(y), -hy + 0.2, hy - 0.2) };
      draw();
    },
  });
  const sl = buildSliders({
    sliders: [
      { name: 'a', min: -3, max: 3, step: 1, value: state.a },
      { name: 'b', min: -3, max: 3, step: 1, value: state.b },
      { name: 'c', min: -3, max: 3, step: 1, value: state.c },
      { name: 'd', min: -3, max: 3, step: 1, value: state.d },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 相似与对角化：换基看动作 ---------- */

function renderDiagonalizeGrid(host, spec) {
  const m = Array.isArray(spec.matrix) ? spec.matrix : [3, 1, 0, 2];
  const state = { a: Number(m[0]) || 3, b: Number(m[1]) || 1, c: Number(m[2]) || 0, d: Number(m[3]) || 2, eigenBasis: false };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const hx = 4;
  const hy = 3.2;
  let r = null;

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const pairs = eigGeneral2(state.a, state.b, state.c, state.d);
    const independent = pairs.length === 2 &&
      Math.abs(pairs[0].v[0] * pairs[1].v[1] - pairs[0].v[1] * pairs[1].v[0]) > 1e-9;
    const validated = independent && pairs.every((pair) => {
      const av = {
        x: state.a * pair.v[0] + state.b * pair.v[1],
        y: state.c * pair.v[0] + state.d * pair.v[1],
      };
      const residual = Math.hypot(av.x - pair.lambda * pair.v[0], av.y - pair.lambda * pair.v[1]);
      return residual < 1e-8 * Math.max(1, Math.hypot(av.x, av.y));
    });
    const diagonalizable = validated;
    const basis = diagonalizable ? pairs.map((pair) => pair.v) : [[1, 0], [0, 1]];
    for (let s = -8; s <= 8; s++) {
      [basis[0], basis[1]].forEach((axis) => {
        const from = { x: axis[0] * s - axis[1] * 8, y: axis[1] * s - axis[0] * 8 };
        const to = { x: axis[0] * s + axis[1] * 8, y: axis[1] * s + axis[0] * 8 };
        const q = (point) => {
          const raw = { x: state.a * point.x + state.b * point.y, y: state.c * point.x + state.d * point.y };
          return { x: pm.X(raw.x), y: pm.Y(raw.y) };
        };
        const p1 = q(from);
        const p2 = q(to);
        ctx.strokeStyle = state.eigenBasis ? 'rgba(124,58,237,0.65)' : 'rgba(59,116,214,0.35)';
        ctx.lineWidth = state.eigenBasis ? 2 : 1;
        line(ctx, p1.x, p1.y, p2.x, p2.y);
      });
    }
    basis.forEach((axis, i) => {
      const scaled = diagonalizable ? axis.map((v) => v * pairs[i].lambda) : [state.a * axis[0] + state.b * axis[1], state.c * axis[0] + state.d * axis[1]];
      arrow(ctx, pm.cx, pm.cy, pm.X(scaled[0]), pm.Y(scaled[1]), i ? '#e8871e' : '#3b74d6', 4);
    });
    ctx.textAlign = 'left';
    ctx.font = '600 14px system-ui';
    ctx.fillStyle = tc.fg;
    if (diagonalizable) {
      ctx.fillText(`D=diag(${fmtFixed(pairs[0].lambda)}, ${fmtFixed(pairs[1].lambda)})`, 16, 28);
      ctx.fillText(state.eigenBasis ? '特征基：网格只伸缩，不剪断' : '标准基：动作混杂旋转与伸缩', 16, 50);
    } else {
      ctx.fillText('实特征方向不足或验证失败，本课不强行对角化', 16, 28);
    }
    cap.textContent = '同一矩阵可以换一套语言描述。特征基里的动作被拆成两个独立伸缩，这就是相似变换的几何好处。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'a', ...expandedRange(state.a, -3, 3), step: 1, value: state.a },
      { name: 'b', ...expandedRange(state.b, -3, 3), step: 1, value: state.b },
      { name: 'c', ...expandedRange(state.c, -3, 3), step: 1, value: state.c },
      { name: 'd', ...expandedRange(state.d, -3, 3), step: 1, value: state.d },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const btn = mkBtn('切换标准基 / 特征基');
  btn.addEventListener('click', () => { state.eigenBasis = !state.eigenBasis; draw(); });
  controls.append(btn, sl.box);
  draw();
  return { slidersBox: controls };
}

/* ---------- 条件数：输入扰动被放大多少 ---------- */

function renderConditionNumber(host, spec) {
  const state = {
    s1: spec.s1 != null && Number(spec.s1) > 0 ? Number(spec.s1) : 4,
    s2: spec.s2 != null && Number(spec.s2) > 0 ? Number(spec.s2) : 1,
    epsilon: clamp(spec.epsilon || 0.08, 0.01, 0.3),
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const hx = 5;
  const hy = 4;
  let r = null;

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 90; k++) {
      const angle = Math.PI * 2 * k / 90;
      const px = pm.X(state.epsilon * Math.cos(angle));
      const py = pm.Y(state.epsilon * Math.sin(angle));
      if (!k) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,38,38,0.85)';
    ctx.beginPath();
    for (let k = 0; k <= 120; k++) {
      const angle = Math.PI * 2 * k / 120;
      const px = pm.X(state.s1 * state.epsilon * Math.cos(angle));
      const py = pm.Y(state.s2 * state.epsilon * Math.sin(angle));
      if (!k) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    arrow(ctx, pm.cx, pm.cy, pm.X(state.s1), pm.Y(0), '#3b74d6', 3.5);
    arrow(ctx, pm.cx, pm.cy, pm.X(0), pm.Y(state.s2), '#e8871e', 3.5);
    const kappa = state.s1 / state.s2;
    ctx.textAlign = 'left';
    ctx.font = '600 15px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(`κ=s1/s2=${fmtFixed(kappa)}`, 16, 28);
    ctx.font = '13px system-ui';
    ctx.fillStyle = kappa > 20 ? '#dc2626' : kappa > 6 ? '#b45309' : '#15803d';
    ctx.fillText(kappa > 20 ? '病态：微小输入扰动可能被放大超过 20 倍' : kappa > 6 ? '敏感：解会明显随输入摆动' : '良态：扰动放大有限', 16, 50);
    cap.textContent = '蓝圈是输入小扰动，红椭圆是输出误差。长短轴之比就是条件数；把 σ2 调小，椭圆被拉成针。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 's1', min: 0.1, max: 10, step: 0.1, value: state.s1 },
      { name: 's2', min: 0.1, max: 10, step: 0.1, value: state.s2 },
      { name: 'epsilon', min: 0.01, max: 0.3, step: 0.01, value: state.epsilon },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 矩阵幂：转移矩阵与图传播 ---------- */

function renderMatrixPower(host, spec) {
  const state = {
    pAA: clamp(spec.pAA != null ? spec.pAA : 0.8, 0, 1),
    pBB: clamp(spec.pBB != null ? spec.pBB : 0.7, 0, 1),
    power: clamp(spec.power || 1, 1, 12),
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 320;
  let r = null;

  function transition() {
    return [[state.pAA, 1 - state.pBB], [1 - state.pAA, state.pBB]];
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const P = transition();
    let M = [[1, 0], [0, 1]];
    for (let k = 0; k < state.power; k++) {
      M = [
        [M[0][0] * P[0][0] + M[0][1] * P[1][0], M[0][0] * P[0][1] + M[0][1] * P[1][1]],
        [M[1][0] * P[0][0] + M[1][1] * P[1][0], M[1][0] * P[0][1] + M[1][1] * P[1][1]],
      ];
    }
    const pa = M[0][0];
    const pb = M[1][0];
    const nodes = [{ x: 90, y: 105, label: 'A' }, { x: W - 90, y: 105, label: 'B' }];
    nodes.forEach((node, i) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 32, 0, Math.PI * 2);
      ctx.fillStyle = i ? 'rgba(232,135,30,0.75)' : 'rgba(59,116,214,0.75)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 6);
    });
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 2;
    line(ctx, nodes[0].x + 34, nodes[0].y, nodes[1].x - 34, nodes[1].y);
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText('B\u2192A P=' + fmtFixed(P[0][1], 2), (nodes[0].x + nodes[1].x) / 2 - 36, 92);
    ctx.fillText('A\u2192B P=' + fmtFixed(P[1][0], 2), (nodes[0].x + nodes[1].x) / 2 - 36, 132);
    const bars = [['A', pa, '#3b74d6'], ['B', pb, '#e8871e']];
    bars.forEach(([label, value, color], i) => {
      const x = 80 + i * 130;
      const y = 250;
      ctx.fillStyle = softFill();
      ctx.fillRect(x, y - 120, 70, 120);
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 120 * value, 70, 120 * value);
      ctx.fillStyle = tc.fg;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + 35, y + 20);
      ctx.fillText(fmtFixed(value, 3), x + 35, y - 126);
    });
    ctx.textAlign = 'left';
    ctx.fillText(`P^${state.power} 从 A 出发的分布`, 16, 28);
    const isPeriodic = Math.abs(state.pAA) < 1e-9 && Math.abs(state.pBB) < 1e-9;
    const isIdentity = Math.abs(state.pAA - 1) < 1e-9 && Math.abs(state.pBB - 1) < 1e-9;
    cap.textContent = isPeriodic
      ? `两态每一步完全互换，所以 P^k 不收敛：当前分布是 (${fmtFixed(pa)}, ${fmtFixed(pb)})。`
      : isIdentity
        ? '两个状态都完全留守，分布永远停留在出发点；平稳分布不唯一。'
        : '从 A 出发的概率经过多步转移。列随机矩阵的幂仍列随机；这个连通非周期例子会趋于平稳分布。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'pAA', min: 0, max: 1, step: 0.05, value: state.pAA },
      { name: 'pBB', min: 0, max: 1, step: 0.05, value: state.pBB },
      { name: 'power', min: 1, max: 12, step: 1, value: state.power },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- ODE 公共工具：RK4 积分器 ---------- */

function rk4Step(fn, t, y, h) {
  const k1 = fn(t, y);
  const k2 = fn(t + h / 2, y + h * k1 / 2);
  const k3 = fn(t + h / 2, y + h * k2 / 2);
  const k4 = fn(t + h, y + h * k3);
  return y + h * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
}

function rk4Path(fn, t0, y0, tEnd, steps) {
  const path = [{ t: t0, y: y0 }];
  const h = (tEnd - t0) / steps;
  let t = t0;
  let y = y0;
  for (let k = 0; k < steps; k++) {
    y = rk4Step(fn, t, y, h);
    t += h;
    path.push({ t, y });
  }
  return path;
}

/* ---------- ODE 方向场与初值轨迹 ---------- */

function renderSlopefield(host, spec) {
  let fn = null;
  try {
    fn = compileExpr(spec.expr || '-y', ['t', 'y']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const tmin = spec.tmin != null ? spec.tmin : -2;
  const tmax = spec.tmax != null ? spec.tmax : 4;
  const ymin = spec.ymin != null ? spec.ymin : -3;
  const ymax = spec.ymax != null ? spec.ymax : 3;
  const state = { point: { t: spec.t0 != null ? spec.t0 : 0, y: spec.y0 != null ? spec.y0 : 2 } };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const pad = 30;
  let r = null;
  const slopeFn = (t, y) => callField(fn, t, y);

  function mapPoint(t, y) {
    return {
      x: pad + (t - tmin) / (tmax - tmin) * (r.W - pad * 2),
      y: H - pad - (y - ymin) / (ymax - ymin) * (H - pad * 2),
    };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1;
    for (let t = Math.ceil(tmin); t <= Math.floor(tmax); t++) {
      const top = mapPoint(t, ymax);
      const bottom = mapPoint(t, ymin);
      line(ctx, top.x, top.y, bottom.x, bottom.y);
    }
    for (let y = Math.ceil(ymin); y <= Math.floor(ymax); y++) {
      const left = mapPoint(tmin, y);
      const right = mapPoint(tmax, y);
      line(ctx, left.x, left.y, right.x, right.y);
    }
    ctx.strokeStyle = 'rgba(124,58,237,0.55)';
    ctx.lineWidth = 1.3;
    for (let gt = tmin; gt <= tmax + 0.001; gt += (tmax - tmin) / 18) {
      for (let gy = ymin; gy <= ymax + 0.001; gy += (ymax - ymin) / 13) {
        const slope = slopeFn(gt, gy);
        if (!Number.isFinite(slope)) continue;
        const angle = Math.atan2(-slope, 1);
        const center = mapPoint(gt, gy);
        line(ctx, center.x - 9 * Math.cos(angle), center.y - 9 * Math.sin(angle), center.x + 9 * Math.cos(angle), center.y + 9 * Math.sin(angle));
      }
    }
    const forward = rk4Path(slopeFn, state.point.t, state.point.y, tmax, 220);
    const backward = rk4Path(slopeFn, state.point.t, state.point.y, tmin, 160).reverse();
    const full = backward.concat(forward.slice(1));
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    full.forEach((point, k) => {
      const p = mapPoint(point.t, point.y);
      if (!k) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    const p0 = mapPoint(state.point.t, state.point.y);
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.strokeStyle = tc.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`y(${fmtFixed(tmax, 1)})≈${fmtFixed(forward[forward.length - 1].y, 3)}`, 16, 26);
    cap.textContent = '紫色短线是方向场，橙线是顺着这些方向走出的解。拖动初始点，同一方程立刻长出不同命运。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      const p = mapPoint(state.point.t, state.point.y);
      return Math.hypot(x - p.x, y - p.y) <= 18 ? 'point' : null;
    },
    move(id, x, y) {
      state.point = {
        t: clamp(tmin + (x - pad) / (r.W - pad * 2) * (tmax - tmin), tmin, tmax),
        y: clamp(ymin + (H - pad - y) / (H - pad * 2) * (ymax - ymin), ymin, ymax),
      };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 解族流动：参数、初值与时间切片 ---------- */

function renderSeparableflow(host, spec) {
  const state = {
    k: spec.k != null ? spec.k : 0.8,
    a: spec.a != null ? spec.a : 1,
    y0: spec.y0 != null ? spec.y0 : 2.5,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 320;
  const pad = 30;
  const tmax = 5;
  const ymin = -1;
  const ymax = 5;
  let r = null;

  function mapPoint(t, y) {
    return { x: pad + t / tmax * (r.W - pad * 2), y: H - pad - (y - ymin) / (ymax - ymin) * (H - pad * 2) };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const balance = mapPoint(0, state.a);
    ctx.strokeStyle = tc.axis;
    line(ctx, balance.x, balance.y, mapPoint(tmax, state.a).x, mapPoint(tmax, state.a).y);
    for (let seed = -0.5; seed <= 4.5; seed += 0.5) {
      ctx.strokeStyle = 'rgba(59,116,214,0.30)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k <= 240; k++) {
        const t = tmax * k / 240;
        const y = state.a + (seed - state.a) * Math.exp(state.k * t);
        const p = mapPoint(t, y);
        if (!k) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let k = 0; k <= 240; k++) {
      const t = tmax * k / 240;
      const y = state.a + (state.y0 - state.a) * Math.exp(state.k * t);
      const p = mapPoint(t, y);
      if (!k) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`y(5)=${fmtFixed(state.a + (state.y0 - state.a) * Math.exp(state.k * tmax), 3)}`, 16, 26);
    cap.textContent = '蓝线是解族，橙线是当前初值。k>0 时远离平衡线 A，k<0 时被吸回 A；k=0 则高度不变。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'k', min: -1.5, max: 1.5, step: 0.1, value: state.k },
      { name: 'A', min: -0.5, max: 4, step: 0.1, value: state.a },
      { name: 'y0', min: -0.5, max: 4.5, step: 0.1, value: state.y0 },
    ],
  }, (next) => { state.k = next.k; state.a = next.A; state.y0 = next.y0; draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 平衡点探针：相线与时间线 ---------- */

function renderEquilibriumprobe(host, spec) {
  let fn = null;
  try {
    fn = compileExpr(spec.expr || 'y*(y-1)*(y+2)', ['y']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const ymin = spec.ymin != null ? spec.ymin : -3;
  const ymax = spec.ymax != null ? spec.ymax : 2.5;
  const state = { y0: spec.y0 != null ? spec.y0 : 1.6 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const pad = 28;
  let r = null;
  const slopeFn = (t, y) => callField(fn, y);

  function equilibria() {
    const out = [];
    let prevY = ymin;
    let prevV = callField(fn, prevY);
    for (let k = 1; k <= 300; k++) {
      const y = ymin + (ymax - ymin) * k / 300;
      const value = callField(fn, y);
      if (Number.isFinite(prevV) && Number.isFinite(value) && prevV * value < 0) {
        const root = prevY + (y - prevY) * Math.abs(prevV) / (Math.abs(prevV) + Math.abs(value));
        const h = 0.0001;
        const derivative = (callField(fn, root + h) - callField(fn, root - h)) / (2 * h);
        out.push({ y: root, kind: derivative < -1e-5 ? 'stable' : derivative > 1e-5 ? 'unstable' : 'semi' });
      }
      prevY = y;
      prevV = value;
    }
    return out;
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const lineY = 52;
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 3;
    line(ctx, pad, lineY, W - pad, lineY);
    equilibria().forEach((item) => {
      const x = pad + (item.y - ymin) / (ymax - ymin) * (W - pad * 2);
      ctx.beginPath();
      ctx.arc(x, lineY, 7, 0, Math.PI * 2);
      ctx.fillStyle = item.kind === 'stable' ? '#15803d' : item.kind === 'unstable' ? '#dc2626' : '#b45309';
      ctx.fill();
      ctx.fillStyle = tc.fg;
      ctx.font = '600 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(item.kind, x, lineY - 16);
    });
    const path = rk4Path(slopeFn, 0, state.y0, 8, 500);
    const plotTop = 100;
    const plotH = H - plotTop - pad;
    ctx.strokeStyle = tc.grid;
    line(ctx, pad, plotTop + plotH / 2, W - pad, plotTop + plotH / 2);
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    path.forEach((point, k) => {
      const x = pad + point.t / 8 * (W - pad * 2);
      const y = plotTop + (1 - (point.y - ymin) / (ymax - ymin)) * plotH;
      if (!k) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`y(8)≈${fmtFixed(path[path.length - 1].y, 3)}`, 16, 26);
    cap.textContent = '上方是状态相线：绿点吸引，红点排斥。下方时间线显示初值被哪个平衡点接收。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      const px = pad + (state.y0 - ymin) / (ymax - ymin) * (r.W - pad * 2);
      return Math.abs(x - px) <= 18 && Math.abs(y - 52) <= 22 ? 'y0' : null;
    },
    move(id, x) {
      state.y0 = clamp(ymin + (x - pad) / (r.W - pad * 2) * (ymax - ymin), ymin, ymax);
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 相图：线性系统与特征方向 ---------- */

function renderPhaseportrait(host, spec) {
  const m = Array.isArray(spec.matrix) ? spec.matrix : [1, 1, 4, 1];
  /* 只对 NaN/undefined 兜底，合法的 0 必须按 0 生效 */
  const numOr = (v, fb) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };
  const state = {
    a: numOr(m[0], 1),
    b: numOr(m[1], 1),
    c: numOr(m[2], 4),
    d: numOr(m[3], 1),
    p: { x: spec.x0 != null ? spec.x0 : 1.5, y: spec.y0 != null ? spec.y0 : 0.2 },
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const hx = 3;
  const hy = 2.5;
  let r = null;
  let pm = null;
  const geo = {};

  function classify() {
    const trace = state.a + state.d;
    const det = state.a * state.d - state.b * state.c;
    const disc = trace * trace - 4 * det;
    if (disc > 1e-9) return det > 0 ? (trace < 0 ? '稳定结点' : '不稳定结点') : '鞍点';
    if (disc < -1e-9) return trace < -1e-9 ? '稳定螺旋' : trace > 1e-9 ? '不稳定螺旋' : '中心';
    return '重特征值（退化）';
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    const field = (x, y) => ({ x: state.a * x + state.b * y, y: state.c * x + state.d * y });
    for (let gx = -hx + 0.5; gx <= hx; gx += 0.5) for (let gy = -hy + 0.4; gy <= hy; gy += 0.4) {
      const velocity = field(gx, gy);
      const center = { x: pm.X(gx), y: pm.Y(gy) };
      arrow(ctx, center.x, center.y, center.x + velocity.x * 16, center.y - velocity.y * 16, 'rgba(124,58,237,0.38)', 1.2);
    }
    const pairs = eigGeneral2(state.a, state.b, state.c, state.d);
    pairs.forEach((pair) => {
      ctx.strokeStyle = 'rgba(46,125,50,0.65)';
      ctx.lineWidth = 4;
      line(ctx, pm.X(-pair.v[0] * 10), pm.Y(-pair.v[1] * 10), pm.X(pair.v[0] * 10), pm.Y(pair.v[1] * 10));
    });
    const seeds = [[state.p.x, state.p.y], [-state.p.x, -state.p.y], [0.2, 1.5], [-0.2, -1.5], [2, -1], [-2, 1]];
    seeds.forEach((seed, index) => {
      let point = seed;
      let t = 0;
      ctx.strokeStyle = index ? 'rgba(232,135,30,0.45)' : '#e8871e';
      ctx.lineWidth = index ? 1.5 : 3;
      ctx.beginPath();
      const h = 0.015;
      for (let k = 0; k < 500; k++) {
        const p = { x: pm.X(point[0]), y: pm.Y(point[1]) };
        if (!k) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
        const k1 = field(point[0], point[1]);
        const k2 = field(point[0] + h * k1.x / 2, point[1] + h * k1.y / 2);
        const k3 = field(point[0] + h * k2.x / 2, point[1] + h * k2.y / 2);
        const k4 = field(point[0] + h * k3.x, point[1] + h * k3.y);
        point = [point[0] + h * (k1.x + 2 * k2.x + 2 * k3.x + k4.x) / 6, point[1] + h * (k1.y + 2 * k2.y + 2 * k3.y + k4.y) / 6];
        t += h;
        if (!Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 20 || Math.abs(point[1]) > 20) break;
      }
      ctx.stroke();
    });
    const pp = { x: pm.X(state.p.x), y: pm.Y(state.p.y) };
    geo.pp = pp;
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.stroke();
    ctx.fillStyle = themeColors().fg;
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(classify(), 16, 26);
    cap.textContent = '紫箭头是速度场，绿线是不变方向，橙线是轨迹。拖动白点换初始状态，观察系统被吸向或推离平衡点。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return Math.hypot(x - geo.pp.x, y - geo.pp.y) <= 18 ? 'p' : null;
    },
    move(id, x, y) {
      state.p = { x: clamp(pm.invX(x), -hx, hx), y: clamp(pm.invY(y), -hy, hy) };
      draw();
    },
  });
  const sl = buildSliders({
    sliders: [
      { name: 'a', min: -3, max: 3, step: 0.5, value: state.a },
      { name: 'b', min: -3, max: 3, step: 0.5, value: state.b },
      { name: 'c', min: -3, max: 3, step: 0.5, value: state.c },
      { name: 'd', min: -3, max: 3, step: 0.5, value: state.d },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 共振实验室：二阶振动系统 ---------- */

function renderResonancelab(host, spec) {
  const state = {
    m: spec.m || 1,
    c: spec.c != null ? spec.c : 0.15,
    k: spec.k || 1,
    force: spec.force != null ? spec.force : 0.4,
    omega: spec.omega || 1,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  let r = null;

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    let x = 0;
    let v = 0;
    let t = 0;
    const h = 0.005;
    const n = Math.floor(30 / h);
    let maxX = 0;
    const samples = [];
    for (let k = 0; k <= n; k++) {
      if (k % 10 === 0) samples.push({ t, x });
      maxX = Math.max(maxX, Math.abs(x));
      const k1v = (state.force * Math.cos(state.omega * t) - state.c * v - state.k * x) / state.m;
      const k1x = v;
      const k2v = (state.force * Math.cos(state.omega * (t + h / 2)) - state.c * (v + h * k1v / 2) - state.k * (x + h * k1x / 2)) / state.m;
      const k2x = v + h * k1v / 2;
      const k3v = (state.force * Math.cos(state.omega * (t + h / 2)) - state.c * (v + h * k2v / 2) - state.k * (x + h * k2x / 2)) / state.m;
      const k3x = v + h * k2v / 2;
      const k4v = (state.force * Math.cos(state.omega * (t + h)) - state.c * (v + h * k3v) - state.k * (x + h * k3x)) / state.m;
      const k4x = v + h * k3v;
      x += h * (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
      v += h * (k1v + 2 * k2v + 2 * k3v + k4v) / 6;
      t += h;
    }
    const pad = 30;
    const mid = H / 2;
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, mid, W - pad, mid);
    const scale = 80 / Math.max(0.2, maxX);
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    samples.forEach((point, k) => {
      const px = pad + point.t / 30 * (W - pad * 2);
      const py = mid - point.x * scale;
      if (!k) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    const natural = Math.sqrt(state.k / state.m);
    const ratio = state.c / (2 * Math.sqrt(state.k * state.m));
    const denom = Math.sqrt((state.k - state.m * state.omega ** 2) ** 2 + (state.c * state.omega) ** 2);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ω0=${fmtFixed(natural, 3)}  ζ=${fmtFixed(ratio, 3)}`, 16, 26);
    ctx.fillText(`稳态振幅≈${fmtFixed(state.force / (denom || 1), 3)}  30秒最大≈${fmtFixed(maxX, 3)}`, 16, 46);
    cap.textContent = '驱频接近固有频率且阻尼小时，振幅迅速放大。阻尼不会只让运动变慢，还会改变位移与力的相位。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'm', min: 0.4, max: 2, step: 0.1, value: state.m },
      { name: 'c', min: 0, max: 1, step: 0.05, value: state.c },
      { name: 'k', min: 0.3, max: 5, step: 0.1, value: state.k },
      { name: 'F', min: 0, max: 1, step: 0.05, value: state.force },
      { name: 'omega', min: 0, max: 3, step: 0.05, value: state.omega },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 数值解法赛跑：Euler、Heun、RK4 ---------- */

function renderOdesolverrace(host, spec) {
  const lambda = spec.lambda != null ? spec.lambda : -1.2;
  const y0 = spec.y0 != null ? spec.y0 : 2;
  const tEnd = spec.tEnd != null ? spec.tEnd : 2;
  const state = { h: spec.h != null ? spec.h : 0.4 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const pad = 30;
  const ymin = -1;
  const ymax = 3;
  let r = null;
  const slopeFn = (t, y) => lambda * y;

  function mapPoint(t, y) {
    return { x: pad + t / tEnd * (r.W - pad * 2), y: H - pad - (y - ymin) / (ymax - ymin) * (H - pad * 2) };
  }

  function solve(kind, h) {
    const steps = Math.max(1, Math.round(tEnd / h));
    const dt = tEnd / steps;
    let t = 0;
    let y = y0;
    const path = [{ t, y }];
    for (let k = 0; k < steps; k++) {
      if (kind === 'euler') y += dt * slopeFn(t, y);
      else if (kind === 'heun') {
        const preview = y + dt * slopeFn(t, y);
        y += dt * (slopeFn(t, y) + slopeFn(t + dt, preview)) / 2;
      } else y = rk4Step(slopeFn, t, y, dt);
      t += dt;
      path.push({ t, y });
    }
    return path;
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = tc.axis;
    line(ctx, mapPoint(0, 0).x, mapPoint(0, 0).y, mapPoint(tEnd, 0).x, mapPoint(tEnd, 0).y);
    const exactPath = [];
    for (let k = 0; k <= 240; k++) {
      const t = tEnd * k / 240;
      exactPath.push({ t, y: y0 * Math.exp(lambda * t) });
    }
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    exactPath.forEach((point, k) => {
      const p = mapPoint(point.t, point.y);
      if (!k) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    const methods = [['euler', '#dc2626'], ['heun', '#b45309'], ['rk4', '#2e7d32']];
    const errors = {};
    methods.forEach(([kind, color]) => {
      const path = solve(kind, state.h);
      errors[kind] = Math.abs(path[path.length - 1].y - y0 * Math.exp(lambda * tEnd));
      ctx.strokeStyle = color;
      ctx.lineWidth = kind === 'euler' ? 2.2 : 1.9;
      ctx.setLineDash(kind === 'rk4' ? [6, 4] : []);
      ctx.beginPath();
      path.forEach((point, k) => {
        const p = mapPoint(point.t, point.y);
        if (!k) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`h=${fmtFixed(state.h, 2)}`, 16, 26);
    ctx.fillText(`误差 Euler=${fmtFixed(errors.euler, 4)} Heun=${fmtFixed(errors.heun, 4)} RK4=${fmtFixed(errors.rk4, 5)}`, 16, 46);
    cap.textContent = '黑线是精确指数解。步长相同时，RK4 通常最贴；步长减半，Euler 误差约减半，RK4 误差缩小得快得多。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [{ name: 'h', min: 0.02, max: 0.8, step: 0.02, value: state.h }],
  }, (next) => { state.h = next.h; draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 多元微积分公共工具 ---------- */

function callField(fn, x, y, scope) {
  try {
    const value = fn(Object.assign({ x, y }, scope || {}));
    return Number.isFinite(value) ? value : NaN;
  } catch (e) {
    void e;
    return NaN;
  }
}

function fieldColor(value, lo, hi) {
  if (!Number.isFinite(value)) return 'rgba(107,114,128,0.20)';
  const t = clamp((value - lo) / ((hi - lo) || 1), 0, 1);
  const r = Math.round(59 + t * (232 - 59));
  const g = Math.round(116 + t * (135 - 116));
  const b = Math.round(214 + t * (30 - 214));
  return `rgba(${r},${g},${b},0.72)`;
}

function drawContourSegments(ctx, values, cols, rows, level, toPoint) {
  ctx.beginPath();
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const a = values[j * cols + i];
    const b = values[j * cols + i + 1];
    const c = values[(j + 1) * cols + i + 1];
    const d = values[(j + 1) * cols + i];
    if (![a, b, c, d].every(Number.isFinite)) continue;
    const corners = [[i, j, a], [i + 1, j, b], [i + 1, j + 1, c], [i, j + 1, d]];
    const crossings = [];
    for (let k = 0; k < 4; k++) {
      const [x1, y1, v1] = corners[k];
      const [x2, y2, v2] = corners[(k + 1) % 4];
      if ((v1 - level) * (v2 - level) < 0) {
        const t = (level - v1) / (v2 - v1);
        crossings.push(toPoint(x1 + t * (x2 - x1), y1 + t * (y2 - y1)));
      }
    }
    if (crossings.length >= 2) {
      ctx.moveTo(crossings[0].x, crossings[0].y);
      ctx.lineTo(crossings[1].x, crossings[1].y);
      if (crossings.length === 4) {
        ctx.moveTo(crossings[2].x, crossings[2].y);
        ctx.lineTo(crossings[3].x, crossings[3].y);
      }
    }
  }
  ctx.stroke();
}

/* ---------- 多元函数：等高线地图 ---------- */

function renderContourmap(host, spec) {
  const xmin = spec.xmin != null ? spec.xmin : -3;
  const xmax = spec.xmax != null ? spec.xmax : 3;
  const ymin = spec.ymin != null ? spec.ymin : -2.5;
  const ymax = spec.ymax != null ? spec.ymax : 2.5;
  const vars = ['x', 'y'].concat((spec.sliders || []).map((slider) => slider.name));
  let fn = null;
  try {
    fn = compileExpr(spec.expr || 'x^2 + y^2', vars);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const state = { point: { x: spec.point ? spec.point[0] : 1, y: spec.point ? spec.point[1] : 1 } };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const pad = 12;
  let r = null;
  let scope = {};
  const sl = buildSliders(spec, (next) => { scope = next; draw(); });

  function mapPoint(x, y) {
    return {
      x: pad + (x - xmin) / (xmax - xmin) * (r.W - pad * 2),
      y: H - pad - (y - ymin) / (ymax - ymin) * (H - pad * 2),
    };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const cols = 90;
    const rows = Math.max(30, Math.round(cols * (H - pad * 2) / (W - pad * 2)));
    const values = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = xmin + (xmax - xmin) * i / (cols - 1);
      const y = ymin + (ymax - ymin) * j / (rows - 1);
      const value = callField(fn, x, y, scope);
      values.push(value);
      if (Number.isFinite(value)) { lo = Math.min(lo, value); hi = Math.max(hi, value); }
    }
    for (let py = pad; py < H - pad; py += 3) for (let px = pad; px < W - pad; px += 3) {
      const i = Math.round((px - pad) / (W - pad * 2) * (cols - 1));
      const j = Math.round((H - pad - py) / (H - pad * 2) * (rows - 1));
      ctx.fillStyle = fieldColor(values[j * cols + i], lo, hi);
      ctx.fillRect(px, py, 3, 3);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 1.1;
    for (let k = 1; k <= 8; k++) drawContourSegments(ctx, values, cols, rows, lo + (hi - lo) * k / 9, mapPoint);
    const p = mapPoint(state.point.x, state.point.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.strokeStyle = tc.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    const value = callField(fn, state.point.x, state.point.y, scope);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`f(${fmtFixed(state.point.x)}, ${fmtFixed(state.point.y)})=${fmtFixed(value, 3)}`, 16, 26);
    cap.textContent = '颜色是高度，白线是等高线。同一条白线上的点高度相同；线越密，曲面在那个方向越陡。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      const p = mapPoint(state.point.x, state.point.y);
      return Math.hypot(x - p.x, y - p.y) <= 18 ? 'point' : null;
    },
    move(id, x, y) {
      state.point = {
        x: clamp(xmin + (x - pad) / (r.W - pad * 2) * (xmax - xmin), xmin, xmax),
        y: clamp(ymin + (H - pad - y) / (H - pad * 2) * (ymax - ymin), ymin, ymax),
      };
      draw();
    },
  });
  scope = sl.state;
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 梯度探针：偏导、梯度与方向导数 ---------- */

function renderGradientprobe(host, spec) {
  const xmin = spec.xmin != null ? spec.xmin : -3;
  const xmax = spec.xmax != null ? spec.xmax : 3;
  const ymin = spec.ymin != null ? spec.ymin : -2.5;
  const ymax = spec.ymax != null ? spec.ymax : 2.5;
  let fn = null;
  try {
    fn = compileExpr(spec.expr || 'x^2 + y^2', ['x', 'y']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const state = {
    point: { x: spec.point ? spec.point[0] : 1, y: spec.point ? spec.point[1] : 0.5 },
    angle: spec.angle != null ? spec.angle : 30,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const pad = 12;
  const h = 0.0001;
  let r = null;

  function mapPoint(x, y) {
    return { x: pad + (x - xmin) / (xmax - xmin) * (r.W - pad * 2), y: H - pad - (y - ymin) / (ymax - ymin) * (H - pad * 2) };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const cols = 80;
    const rows = 60;
    const values = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const value = callField(fn, xmin + (xmax - xmin) * i / (cols - 1), ymin + (ymax - ymin) * j / (rows - 1));
      values.push(value);
      if (Number.isFinite(value)) { lo = Math.min(lo, value); hi = Math.max(hi, value); }
    }
    for (let py = pad; py < H - pad; py += 4) for (let px = pad; px < W - pad; px += 4) {
      const i = Math.round((px - pad) / (W - pad * 2) * (cols - 1));
      const j = Math.round((H - pad - py) / (H - pad * 2) * (rows - 1));
      ctx.fillStyle = fieldColor(values[j * cols + i], lo, hi);
      ctx.fillRect(px, py, 4, 4);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.70)';
    ctx.lineWidth = 1.05;
    for (let k = 1; k <= 8; k++) drawContourSegments(ctx, values, cols, rows, lo + (hi - lo) * k / 9, mapPoint);
    const { x, y } = state.point;
    const gx = (callField(fn, x + h, y) - callField(fn, x - h, y)) / (2 * h);
    const gy = (callField(fn, x, y + h) - callField(fn, x, y - h)) / (2 * h);
    const rad = state.angle * Math.PI / 180;
    const dir = { x: Math.cos(rad), y: Math.sin(rad) };
    const directional = gx * dir.x + gy * dir.y;
    const p = mapPoint(x, y);
    const scale = 34 / (Math.hypot(gx, gy) || 1);
    arrow(ctx, p.x, p.y, p.x + gx * scale, p.y - gy * scale, '#7c3aed', 5);
    arrow(ctx, p.x, p.y, p.x + dir.x * 58, p.y - dir.y * 58, '#e8871e', 3);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`fx=${fmtFixed(gx, 3)}  fy=${fmtFixed(gy, 3)}`, 16, 26);
    ctx.fillText(`|grad|=${fmtFixed(Math.hypot(gx, gy), 3)}  Du=${fmtFixed(directional, 3)}`, 16, 46);
    cap.textContent = '紫色梯度指向最陡上升；橙色是你选的方向。方向导数就是梯度在橙色方向上的投影，负号表示下降。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      const p = mapPoint(state.point.x, state.point.y);
      return Math.hypot(x - p.x, y - p.y) <= 18 ? 'point' : null;
    },
    move(id, x, y) {
      state.point = {
        x: clamp(xmin + (x - pad) / (r.W - pad * 2) * (xmax - xmin), xmin, xmax),
        y: clamp(ymin + (H - pad - y) / (H - pad * 2) * (ymax - ymin), ymin, ymax),
      };
      draw();
    },
  });
  const sl = buildSliders({ sliders: [{ name: 'angle', min: -180, max: 180, step: 1, value: state.angle }] }, (next) => {
    state.angle = next.angle;
    draw();
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- Jacobian：映射网格的一阶放大器 ---------- */

function renderJacobiangrid(host, spec) {
  let fx = null;
  let fy = null;
  try {
    fx = compileExpr(spec.fx || 'u^2 - v', ['u', 'v']);
    fy = compileExpr(spec.fy || '2*u*v', ['u', 'v']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const state = { point: { x: spec.point ? spec.point[0] : 1, y: spec.point ? spec.point[1] : 1 } };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 370;
  const pad = 16;
  const lo = -2;
  const hi = 2;
  const h = 0.0001;
  let r = null;
  let outView = null;

  function mapOut(u, v) {
    return { x: callField(fx, u, v), y: callField(fy, u, v) };
  }
  function sourceBox() {
    return { x: pad, y: 32, w: r.W - pad * 2, h: 112 };
  }
  function outputBox() {
    return { x: pad, y: 210, w: r.W - pad * 2, h: H - 210 - pad };
  }
  function screenSource(point) {
    const box = sourceBox();
    return {
      x: box.x + (point.x - lo) / (hi - lo) * box.w,
      y: box.y + box.h - (point.y - lo) / (hi - lo) * box.h,
    };
  }
  function inverseSource(px, py) {
    const box = sourceBox();
    return {
      x: lo + (px - box.x) / box.w * (hi - lo),
      y: lo + (box.y + box.h - py) / box.h * (hi - lo),
    };
  }
  function finiteBounds(points) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    points.forEach((p) => {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    if (![minX, maxX, minY, maxY].every(Number.isFinite)) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    if (minX === maxX) { minX -= 0.5; maxX += 0.5; }
    if (minY === maxY) { minY -= 0.5; maxY += 0.5; }
    return { minX, maxX, minY, maxY };
  }
  function screenOutput(point) {
    const box = outputBox();
    return {
      x: box.x + (point.x - outView.minX) / (outView.maxX - outView.minX) * box.w,
      y: box.y + box.h - (point.y - outView.minY) / (outView.maxY - outView.minY) * box.h,
    };
  }
  function strokeCurve(context, makePoint, toScreen) {
    let pen = false;
    context.beginPath();
    for (let t = lo; t <= hi + 0.001; t += 0.05) {
      const value = makePoint(t);
      if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) { pen = false; continue; }
      const p = toScreen(value);
      if (!pen) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
      pen = true;
    }
    context.stroke();
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.fillStyle = tc.bg;
    ctx.fillRect(0, 0, W, H);
    const { x, y } = state.point;
    const jxx = (callField(fx, x + h, y) - callField(fx, x - h, y)) / (2 * h);
    const jxy = (callField(fx, x, y + h) - callField(fx, x, y - h)) / (2 * h);
    const jyx = (callField(fy, x + h, y) - callField(fy, x - h, y)) / (2 * h);
    const jyy = (callField(fy, x, y + h) - callField(fy, x, y - h)) / (2 * h);
    const det = jxx * jyy - jxy * jyx;
    const d = 0.35;
    const image = mapOut(x, y);
    const linear = [
      { x: image.x + jxx * d, y: image.y + jyx * d },
      { x: image.x + (jxx + jxy) * d, y: image.y + (jyx + jyy) * d },
      { x: image.x + jxy * d, y: image.y + jyy * d },
      image,
    ];
    const mapped = [];
    for (let s = Math.ceil(lo); s <= Math.floor(hi); s += 0.5) {
      for (let t = lo; t <= hi + 0.001; t += 0.05) {
        mapped.push(mapOut(s, t), mapOut(t, s));
      }
    }
    outView = finiteBounds(mapped.concat(linear));
    const source = sourceBox();
    const output = outputBox();
    ctx.strokeStyle = tc.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(source.x, source.y, source.w, source.h);
    ctx.strokeRect(output.x, output.y, output.w, output.h);
    ctx.textAlign = 'left';
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px system-ui';
    ctx.fillText('源 uv 平面（拖动白点）', source.x, 24);
    ctx.fillText('输出 F(u,v) 平面（自动适配视野）', output.x, 168);
    for (let s = Math.ceil(lo); s <= Math.floor(hi); s += 0.5) {
      ctx.strokeStyle = Number.isInteger(s) ? 'rgba(59,116,214,0.65)' : 'rgba(59,116,214,0.28)';
      ctx.lineWidth = Number.isInteger(s) ? 1.3 : 0.75;
      strokeCurve(ctx, (t) => ({ x: s, y: t }), screenSource);
      strokeCurve(ctx, (t) => ({ x: t, y: s }), screenSource);
      strokeCurve(ctx, (t) => mapOut(s, t), screenOutput);
      strokeCurve(ctx, (t) => mapOut(t, s), screenOutput);
    }
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    linear.forEach((point, k) => {
      const p = screenOutput(point);
      if (!k) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    const ps = screenSource({ x, y });
    const pt = screenOutput(image);
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.fillText(`J=[${fmtFixed(jxx, 2)} ${fmtFixed(jxy, 2)}; ${fmtFixed(jyx, 2)} ${fmtFixed(jyy, 2)}]`, 16, 190);
    ctx.fillText(`det J=${fmtFixed(det, 3)}，局部面积×${fmtFixed(Math.abs(det), 3)}`, 16, 208);
    cap.textContent = '上图的蓝色网格是源阵列，下图是它的像；橙色小方块是 Jacobian 给出的一阶线性近似。白点在源平面，紫点是其像。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      const p = screenSource(state.point);
      return Math.hypot(x - p.x, y - p.y) <= 16 ? 'point' : null;
    },
    move(id, x, y) {
      const next = inverseSource(x, y);
      state.point = { x: clamp(next.x, lo, hi), y: clamp(next.y, lo, hi) };
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- Hessian：局部形状与临界点 ---------- */

function renderHessiancurvature(host, spec) {
  const state = {
    a: spec.a != null ? spec.a : 1,
    b: spec.b != null ? spec.b : 1,
    c: spec.c != null ? spec.c : 0.5,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const hx = 2.5;
  const hy = 2;
  let r = null;

  function fn(x, y) {
    return state.a * x * x + state.b * y * y + state.c * x * y;
  }
  function classify() {
    const det = 4 * state.a * state.b - state.c * state.c;
    if (det > 1e-9) return state.a > 0 ? 'local minimum' : 'local maximum';
    if (det < -1e-9) return 'saddle';
    return 'degenerate';
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    let lo = Infinity;
    let hi = -Infinity;
    const cols = 80;
    const rows = 60;
    const values = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const value = fn(-hx + 2 * hx * i / (cols - 1), -hy + 2 * hy * j / (rows - 1));
      values.push(value);
      lo = Math.min(lo, value);
      hi = Math.max(hi, value);
    }
    for (let py = 0; py < H; py += 4) for (let px = 0; px < W; px += 4) {
      const i = Math.round(px / W * (cols - 1));
      const j = Math.round((H - py) / H * (rows - 1));
      ctx.fillStyle = fieldColor(values[j * cols + i], lo, hi);
      ctx.fillRect(px, py, 4, 4);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    for (let k = 1; k <= 7; k++) drawContourSegments(ctx, values, cols, rows, lo + (hi - lo) * k / 8, (x, y) => ({ x: pm.X(x), y: pm.Y(y) }));
    const pairs = eigSym2(2 * state.a, state.c, 2 * state.b) || [];
    pairs.forEach((pair) => {
      arrow(ctx, pm.cx, pm.cy, pm.X(pair.v[0] * 1.6), pm.Y(pair.v[1] * 1.6), pair.lambda > 0 ? '#2e7d32' : '#dc2626', 4);
      ctx.fillStyle = tc.fg;
      ctx.font = '600 12px monospace';
      ctx.fillText('λ=' + fmtFixed(pair.lambda), pm.X(pair.v[0] * 1.8), pm.Y(pair.v[1] * 1.8));
    });
    ctx.textAlign = 'left';
    ctx.font = '600 13px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText(`H=[[${fmtFixed(2 * state.a)} ${fmtFixed(state.c)}];[${fmtFixed(state.c)} ${fmtFixed(2 * state.b)}]]`, 16, 26);
    ctx.fillStyle = classify() === 'saddle' ? '#dc2626' : classify() === 'degenerate' ? '#b45309' : '#15803d';
    ctx.fillText(classify(), 16, 46);
    cap.textContent = '原点是临界点。绿色/红色箭头是 Hessian 特征方向；两个特征值都正才是碗底，一正一负就是马鞍。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'a', min: -1.5, max: 1.5, step: 0.1, value: state.a },
      { name: 'b', min: -1.5, max: 1.5, step: 0.1, value: state.b },
      { name: 'c', min: -2, max: 2, step: 0.1, value: state.c },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 二重积分：矩形网格上的体积和 ---------- */

function renderRiemann2d(host, spec) {
  let fn = null;
  try {
    fn = compileExpr(spec.expr || 'x*y', ['x', 'y']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const a = spec.a != null ? spec.a : 0;
  const b = spec.b != null ? spec.b : 2;
  const c = spec.c != null ? spec.c : 0;
  const d = spec.d != null ? spec.d : 2;
  const state = { nx: spec.nx || 6, ny: spec.ny || 6 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const exact = spec.exact != null && Number.isFinite(spec.exact) ? spec.exact : null;
  let r = null;
  let view = null;

  function rawProject(i, j, z) {
    const x = a + (b - a) * i / state.nx;
    const y = c + (d - c) * j / state.ny;
    return { x: x + y * 0.58, y: -x * 0.42 + y * 0.24 - z * 0.70 };
  }

  function dataBounds(points) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    points.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    if (![minX, maxX, minY, maxY].every(Number.isFinite)) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    return { minX, maxX, minY, maxY };
  }

  function project(i, j, z) {
    const raw = rawProject(i, j, z);
    return { x: view.left + (raw.x - view.minX) * view.scale, y: view.top + (raw.y - view.minY) * view.scale };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    let total = 0;
    let lo = Infinity;
    let hi = -Infinity;
    const heights = [];
    for (let j = 0; j < state.ny; j++) for (let i = 0; i < state.nx; i++) {
      const x = a + (b - a) * (i + 0.5) / state.nx;
      const y = c + (d - c) * (j + 0.5) / state.ny;
      const height = callField(fn, x, y);
      heights.push(height);
      if (Number.isFinite(height)) { lo = Math.min(lo, height); hi = Math.max(hi, height); }
      total += height * (b - a) * (d - c) / (state.nx * state.ny);
    }
    const rawPoints = [];
    for (let j = 0; j <= state.ny; j++) for (let i = 0; i <= state.nx; i++) {
      const vx = a + (b - a) * i / state.nx;
      const vy = c + (d - c) * j / state.ny;
      const height = callField(fn, vx, vy);
      rawPoints.push(rawProject(i, j, 0), rawProject(i, j, height));
    }
    const bounds = dataBounds(rawPoints);
    const scale = Math.min(
      (r.W - 36) / (bounds.maxX - bounds.minX),
      (H - 72) / (bounds.maxY - bounds.minY),
    );
    view = {
      scale,
      minX: bounds.minX,
      minY: bounds.minY,
      left: 18 - bounds.minX * scale,
      top: 58 - bounds.minY * scale,
    };
    for (let j = state.ny - 1; j >= 0; j--) for (let i = 0; i < state.nx; i++) {
      const height = heights[j * state.nx + i] || 0;
      const p1 = project(i, j, 0);
      const p2 = project(i + 1, j, 0);
      const p3 = project(i + 1, j + 1, 0);
      const p4 = project(i, j + 1, 0);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(59,116,214,0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.stroke();
      const top = [project(i, j, height), project(i + 1, j, height), project(i + 1, j + 1, height), project(i, j + 1, height)];
      ctx.beginPath();
      top.forEach((point, k) => { if (!k) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); });
      ctx.closePath();
      ctx.fillStyle = fieldColor(height, lo, hi);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.stroke();
      [p1, p2, p3, p4].forEach((base, k) => line(ctx, base.x, base.y, top[k].x, top[k].y));
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`网格 ${state.nx}×${state.ny}，体积≈${fmtFixed(total, 4)}`, 16, 28);
    if (exact != null) {
      ctx.font = '600 12px monospace';
      ctx.fillText(`精确值=${fmtFixed(exact, 4)} 误差≈${fmtFixed(Math.abs(total - exact), 4)}`, 16, 48);
    }
    cap.textContent = '每个小柱体用中心高度代表整块；底面积乘高再求和。投影按画布和数据自动适配；网格越细，读数越接近精确值。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'nx', min: 1, max: 18, step: 1, value: state.nx },
      { name: 'ny', min: 1, max: 18, step: 1, value: state.ny },
    ],
  }, (next) => { state.nx = Math.round(next.nx); state.ny = Math.round(next.ny); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 路径积分：力场做的功 ---------- */

function renderPathintegral(host, spec) {
  let pFn = null;
  let qFn = null;
  try {
    pFn = compileExpr(spec.p || '-y', ['x', 'y']);
    qFn = compileExpr(spec.q || 'x', ['x', 'y']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const state = {
    kind: spec.kind === 'arc' ? 'arc' : 'line',
    end: spec.end != null ? spec.end : 2,
    reversed: false,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const hx = 3;
  const hy = 2.5;
  let r = null;
  let pm = null;

  function path(t) {
    const s = state.reversed ? 1 - t : t;
    return state.kind === 'arc'
      ? { x: -Math.cos(Math.PI * s), y: state.end * Math.sin(Math.PI * s) }
      : { x: -1 + 2 * s, y: 0 };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    for (let gx = -2; gx <= 2; gx += 0.5) for (let gy = -1.5; gy <= 1.5; gy += 0.5) {
      const p = { x: callField(pFn, gx, gy), y: callField(qFn, gx, gy) };
      const center = { x: pm.X(gx), y: pm.Y(gy) };
      arrow(ctx, center.x, center.y, center.x + p.x * 18, center.y - p.y * 18, 'rgba(124,58,237,0.45)', 1.5);
    }
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    let work = 0;
    const n = 400;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const point = path(t);
      const p = { x: pm.X(point.x), y: pm.Y(point.y) };
      if (!k) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
      if (k < n) {
        const next = path((k + 1) / n);
        const fx = callField(pFn, point.x, point.y);
        const fy = callField(qFn, point.x, point.y);
        work += fx * (next.x - point.x) + fy * (next.y - point.y);
      }
    }
    ctx.stroke();
    const mid0 = path(0.42);
    const mid1 = path(0.48);
    arrow(
      ctx,
      pm.X(mid0.x),
      pm.Y(mid0.y),
      pm.X(mid1.x),
      pm.Y(mid1.y),
      '#e8871e',
      3,
    );
    [
      [-1, '左端点'],
      [1, '右端点'],
    ].forEach(([x, label]) => {
      ctx.beginPath();
      ctx.arc(pm.X(x), pm.Y(0), 5, 0, Math.PI * 2);
      ctx.fillStyle = tc.bg;
      ctx.fill();
      ctx.strokeStyle = tc.fg;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = tc.fg;
      ctx.font = '600 12px system-ui';
      ctx.fillText(label, pm.X(x) - (label === '左端点' ? 30 : 8), pm.Y(0) + 22);
    });
    ctx.fillStyle = tc.fg;
    ctx.font = '600 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`功 W≈${fmtFixed(work, 4)}`, 16, 28);
    cap.textContent = '两条路线共享左右端点。紫箭头是力场，橙色行进方向可反转；把每小步“力·位移”加起来就是功，反向后结果变号。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [{ name: 'end', min: -2, max: 2, step: 0.1, value: state.end }],
  }, (next) => { state.end = next.end; draw(); });
  function syncEndSlider() {
    sl.box.style.display = state.kind === 'arc' ? '' : 'none';
  }
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const btn = mkBtn('切换直线 / 弧线路径');
  btn.addEventListener('click', () => {
    state.kind = state.kind === 'line' ? 'arc' : 'line';
    syncEndSlider();
    draw();
  });
  const reverseBtn = mkBtn('反向路径');
  reverseBtn.addEventListener('click', () => { state.reversed = !state.reversed; draw(); });
  controls.append(btn, reverseBtn, sl.box);
  syncEndSlider();
  draw();
  return { slidersBox: controls };
}

/* ---------- Green 定理：环流与通量 ---------- */

function renderGreentheorem(host, spec) {
  let pFn = null;
  let qFn = null;
  try {
    pFn = compileExpr(spec.p || '-y', ['x', 'y']);
    qFn = compileExpr(spec.q || 'x', ['x', 'y']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const state = { radius: spec.radius || 1.2 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const hx = 2.5;
  const hy = 2.2;
  let r = null;
  let pm = null;

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    pm = planeMap(W, H, hx, hy);
    ctx.clearRect(0, 0, W, H);
    drawPlaneGrid(ctx, pm, hx, hy);
    for (let gx = -2; gx <= 2; gx += 0.5) for (let gy = -1.5; gy <= 1.5; gy += 0.5) {
      const p = { x: callField(pFn, gx, gy), y: callField(qFn, gx, gy) };
      const center = { x: pm.X(gx), y: pm.Y(gy) };
      arrow(ctx, center.x, center.y, center.x + p.x * 16, center.y - p.y * 16, 'rgba(124,58,237,0.40)', 1.3);
    }
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    let circulation = 0;
    let flux = 0;
    const n = 160;
    for (let k = 0; k <= n; k++) {
      const angle = Math.PI * 2 * k / n;
      const point = { x: state.radius * Math.cos(angle), y: state.radius * Math.sin(angle) };
      const p = { x: callField(pFn, point.x, point.y), y: callField(qFn, point.x, point.y) };
      const tangent = { x: -Math.sin(angle), y: Math.cos(angle) };
      const normal = { x: Math.cos(angle), y: Math.sin(angle) };
      circulation += (p.x * tangent.x + p.y * tangent.y) * state.radius;
      flux += (p.x * normal.x + p.y * normal.y) * state.radius;
      const screen = { x: pm.X(point.x), y: pm.Y(point.y) };
      if (!k) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    }
    ctx.stroke();
    const step = Math.PI * 2 / n;
    circulation *= step;
    flux *= step;
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`环流≈${fmtFixed(circulation, 4)}  通量≈${fmtFixed(flux, 4)}`, 16, 28);
    ctx.fillText(`r=${fmtFixed(state.radius, 2)}  面积≈${fmtFixed(Math.PI * state.radius * state.radius, 3)}`, 16, 48);
    cap.textContent = '沿橙色逆时针闭路径，环流累加“力沿切线”的分量，通量累加“力穿出边界”的分量；两者都是随半径变化的读数。Green 定理把边界账本翻译成内部旋度/散度。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [{ name: 'radius', min: 0.3, max: 1.8, step: 0.05, value: state.radius }],
  }, (next) => { state.radius = next.radius; draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 实分析：完备性与嵌套区间 ---------- */

function renderCompletenessladder(host, spec) {
  const target = spec.target != null ? spec.target : Math.SQRT2;
  const state = { steps: spec.steps || 5 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 320;
  const lo0 = 0;
  const hi0 = Math.max(2, Math.ceil(target));
  let r = null;

  function interval(steps) {
    let lo = lo0;
    let hi = hi0;
    for (let k = 0; k < steps; k++) {
      const mid = (lo + hi) / 2;
      if (mid < target) lo = mid;
      else hi = mid;
    }
    return { lo, hi };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const pad = 36;
    const X = (x) => pad + (x - lo0) / (hi0 - lo0) * (W - pad * 2);
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 2;
    line(ctx, pad, H - 60, W - pad, H - 60);
    for (let k = 0; k <= state.steps; k++) {
      const item = interval(k);
      const y = 42 + k * ((H - 120) / Math.max(1, state.steps));
      ctx.strokeStyle = k === state.steps ? '#e8871e' : `rgba(59,116,214,${0.28 + 0.5 * k / Math.max(1, state.steps)})`;
      ctx.lineWidth = k === state.steps ? 4 : 2;
      line(ctx, X(item.lo), y, X(item.hi), y);
    }
    const final = interval(state.steps);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`L=${fmtFixed(final.lo, 6)}`, 16, 26);
    ctx.fillText(`U=${fmtFixed(final.hi, 6)}`, W - 130, 26);
    ctx.fillText(`宽度=${fmtFixed(final.hi - final.lo, 8)}`, 16, H - 32);
    ctx.beginPath();
    ctx.arc(X(target), H - 60, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    cap.textContent = '橙色是当前嵌套区间；紫点是被夹住的数。每次二分都保留“中点不足 target”的左端，区间宽度趋于零。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [{ name: 'steps', min: 0, max: 14, step: 1, value: state.steps }],
  }, (next) => { state.steps = Math.round(next.steps); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- Cauchy 数列：尾部与 epsilon 带 ---------- */

function renderCauchytail(host, spec) {
  let fn = null;
  try {
    fn = compileExpr(spec.expr || '1 + 1/n', ['n']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const limit = spec.limit != null ? spec.limit : 1;
  const state = { tail: spec.tail || 8, epsilon: spec.epsilon != null ? spec.epsilon : 0.25 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const pad = 34;
  let r = null;

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const terms = [];
    for (let n = 1; n <= 70; n++) terms.push(callField(fn, n));
    const finite = terms.filter(Number.isFinite);
    let lo = Math.min(limit, ...finite);
    let hi = Math.max(limit, ...finite);
    const extra = (hi - lo) * 0.16 || 1;
    lo -= extra;
    hi += extra;
    const X = (n) => pad + (n - 1) / 69 * (W - pad * 2);
    const Y = (y) => pad + (1 - (y - lo) / (hi - lo)) * (H - pad * 2);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(124,58,237,0.12)';
    ctx.fillRect(pad, Y(limit + state.epsilon), W - pad * 2, Y(limit - state.epsilon) - Y(limit + state.epsilon));
    ctx.strokeStyle = '#7c3aed';
    ctx.setLineDash([5, 4]);
    line(ctx, pad, Y(limit), W - pad, Y(limit));
    ctx.setLineDash([]);
    const tailValues = terms.slice(state.tail - 1);
    const spread = Math.max(...tailValues) - Math.min(...tailValues);
    for (let n = 1; n <= 70; n++) {
      const inTail = n >= state.tail;
      ctx.beginPath();
      ctx.arc(X(n), Y(terms[n - 1]), inTail ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = inTail ? '#e8871e' : 'rgba(59,116,214,0.55)';
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(232,135,30,0.7)';
    ctx.lineWidth = 2;
    line(ctx, X(state.tail), pad, X(state.tail), H - pad);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`尾部 N=${state.tail}，最大尾幅=${fmtFixed(spread, 4)}`, 16, 26);
    ctx.fillStyle = spread < state.epsilon ? '#15803d' : '#dc2626';
    ctx.fillText(spread < state.epsilon ? '前 70 项采样尾幅 < ε' : '前 70 项采样尾幅 ≥ ε：还需更大的 N', 16, 46);
    cap.textContent = '橙点从第 N 项进入尾部。Cauchy 不只看相邻两项，而要求整个尾部的任意两项都能被 ε 带罩住。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'tail', min: 1, max: 60, step: 1, value: state.tail },
      { name: 'epsilon', min: 0.01, max: 1, step: 0.01, value: state.epsilon },
    ],
  }, (next) => { state.tail = Math.round(next.tail); state.epsilon = next.epsilon; draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- epsilon-delta 探针 ---------- */

function renderEpsilondeltaprobe(host, spec) {
  let fn = null;
  try {
    fn = compileExpr(spec.expr || '(x^2-4)/(x-2)', ['x']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const a = spec.a != null ? spec.a : 2;
  const xmin = spec.xmin != null ? spec.xmin : a - 3;
  const xmax = spec.xmax != null ? spec.xmax : a + 3;
  const state = { epsilon: spec.epsilon != null ? spec.epsilon : 0.5, a };
  let L = spec.limit != null ? spec.limit : 4;
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  let r = null;

  function updateLimit() {
    const span = xmax - xmin;
    const steps = [0.002, 0.001, 0.0005, 0.00025];
    let previousGap = null;
    let estimate = NaN;
    let converges = false;
    for (const fraction of steps) {
      const h = span * fraction;
      const left = callField(fn, state.a - h);
      const right = callField(fn, state.a + h);
      if (!Number.isFinite(left) || !Number.isFinite(right)) continue;
      const gap = Math.abs(left - right);
      estimate = (left + right) / 2;
      if (previousGap != null && gap <= previousGap && gap < Math.max(0.05, previousGap * 0.8)) {
        converges = true;
      }
      previousGap = gap;
    }
    L = converges && Number.isFinite(estimate) ? estimate : NaN;
  }

  function findDelta() {
    if (!Number.isFinite(L)) return 0;
    const span = Math.min(state.a - xmin, xmax - state.a);
    let best = 0;
    for (let k = 1; k <= 3000; k++) {
      const delta = span * k / 3000;
      let ok = true;
      for (let j = 1; j <= 500; j++) {
        const x = state.a - delta + delta * 2 * j / 500;
        if (Math.abs(x - state.a) < 1e-9) continue;
        const value = callField(fn, x);
        if (!Number.isFinite(value) || Math.abs(value - L) >= state.epsilon) {
          ok = false;
          break;
        }
      }
      if (ok) best = delta;
      else break;
    }
    return best;
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const samples = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k <= 300; k++) {
      const x = xmin + (xmax - xmin) * k / 300;
      const y = callField(fn, x);
      samples.push({ x, y });
      if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    }
    if (Number.isFinite(L)) {
      lo = Math.min(lo, L - state.epsilon - 0.5);
      hi = Math.max(hi, L + state.epsilon + 0.5);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = L - 2;
      hi = L + 2;
    }
    const pad = 32;
    const X = (x) => pad + (x - xmin) / (xmax - xmin) * (W - pad * 2);
    const Y = (y) => pad + (1 - (y - lo) / (hi - lo)) * (H - pad * 2);
    ctx.clearRect(0, 0, W, H);
    const delta = findDelta();
    if (Number.isFinite(L)) {
      ctx.fillStyle = 'rgba(46,125,50,0.14)';
      ctx.fillRect(pad, Y(L + state.epsilon), W - pad * 2, Y(L - state.epsilon) - Y(L + state.epsilon));
    }
    ctx.fillStyle = 'rgba(232,135,30,0.16)';
    ctx.fillRect(X(state.a - delta), pad, X(state.a + delta) - X(state.a - delta), H - pad * 2);
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    samples.forEach((point, k) => {
      const p = { x: X(point.x), y: Y(point.y) };
      if (!k) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    if (Number.isFinite(L)) {
      ctx.strokeStyle = '#7c3aed';
      ctx.setLineDash([5, 4]);
      line(ctx, pad, Y(L), W - pad, Y(L));
    }
    line(ctx, X(state.a), pad, X(state.a), H - pad);
    ctx.setLineDash([]);
    if (Number.isFinite(L)) {
      ctx.beginPath();
      ctx.arc(X(state.a), Y(L), 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.stroke();
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ε=${fmtFixed(state.epsilon, 3)}  δ=${fmtFixed(delta, 4)}`, 16, 26);
    cap.textContent = Number.isFinite(L)
      ? '先给定绿色输出带 ε，再找橙色输入半径 δ；挖掉中心点后，带内所有函数值都落入绿带。拖动中心时，极限值会重新估计。'
      : '当前中心附近左右极限不一致或不存在，因此找不到可行的 delta。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      void y;
      return Math.abs(x - (32 + (state.a - xmin) / (xmax - xmin) * (r.W - 64))) <= 18 ? 'a' : null;
    },
    move(id, x) {
      state.a = clamp(xmin + (x - 32) / (r.W - 64) * (xmax - xmin), xmin + 0.2, xmax - 0.2);
      updateLimit();
      draw();
    },
  });
  const sl = buildSliders({
    sliders: [{ name: 'epsilon', min: 0.05, max: 1.5, step: 0.05, value: state.epsilon }],
  }, (next) => { state.epsilon = next.epsilon; updateLimit(); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 一致收敛：逐点误差与上确界误差 ---------- */

function renderUniformconvergencezoom(host, spec) {
  const mode = spec.mode === 'power' ? 'power' : 'sin';
  const state = { n: spec.n || 4 };
  const xmin = mode === 'power' ? -0.9 : -Math.PI;
  const xmax = mode === 'power' ? 0.9 : Math.PI;
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  let r = null;
  let probe = spec.probe != null ? spec.probe : (xmin + xmax) / 2;

  function pair(x) {
    if (mode === 'power') return { fn: (1 - Math.pow(x, state.n + 1)) / (1 - x), limit: 1 / (1 - x) };
    return { fn: Math.sin(state.n * x) / state.n, limit: 0 };
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const pad = 32;
    let lo = -1.2;
    let hi = 1.8;
    if (mode === 'power') { lo = 0; hi = 10; }
    const X = (x) => pad + (x - xmin) / (xmax - xmin) * (W - pad * 2);
    const Y = (y) => pad + (1 - (y - lo) / (hi - lo)) * (H - pad * 2);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = tc.grid;
    line(ctx, pad, Y(0), W - pad, Y(0));
    const sampleCount = Math.min(3000, Math.max(320, state.n * 120));
    let sup = 0;
    let supX = xmin;
    const partial = [];
    const limit = [];
    for (let k = 0; k <= sampleCount; k++) {
      const x = xmin + (xmax - xmin) * k / sampleCount;
      const value = pair(x);
      partial.push({ x, y: value.fn });
      limit.push({ x, y: value.limit });
      const error = Math.abs(value.fn - value.limit);
      if (error > sup) { sup = error; supX = x; }
    }
    ctx.strokeStyle = '#e8871e';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    limit.forEach((point, k) => { if (!k) ctx.moveTo(X(point.x), Y(point.y)); else ctx.lineTo(X(point.x), Y(point.y)); });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    partial.forEach((point, k) => { if (!k) ctx.moveTo(X(point.x), Y(point.y)); else ctx.lineTo(X(point.x), Y(point.y)); });
    ctx.stroke();
    const probeValue = pair(probe);
    ctx.strokeStyle = 'rgba(124,58,237,0.7)';
    line(ctx, X(probe), pad, X(probe), H - pad);
    ctx.beginPath();
    ctx.arc(X(probe), Y(probeValue.fn), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`n=${state.n}  探针误差=${fmtFixed(Math.abs(probeValue.fn - probeValue.limit), 4)}`, 16, 26);
    ctx.fillText(`全域采样 sup=${fmtFixed(sup, 4)}（x≈${fmtFixed(supX, 2)}）`, 16, 46);
    cap.textContent = mode === 'sin'
      ? 'sin(nx)/n 处处压向 0，而且全域最慢误差也按 1/n 下降：这是一致收敛。'
      : '几何部分和在 |x|<0.9 内逼近 1/(1-x)。移动探针靠近边界，逐点误差可能很大，sup 误差由最慢点决定。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      void y;
      return Math.abs(x - (32 + (probe - xmin) / (xmax - xmin) * (r.W - 64))) <= 18 ? 'probe' : null;
    },
    move(id, x) {
      probe = clamp(xmin + (x - 32) / (r.W - 64) * (xmax - xmin), xmin, xmax);
      draw();
    },
  });
  const sl = buildSliders({
    sliders: [{ name: 'n', min: 1, max: 30, step: 1, value: state.n }],
  }, (next) => { state.n = Math.round(next.n); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- Riemann 上和与下和 ---------- */

function renderRiemannupperlower(host, spec) {
  let fn = null;
  try {
    fn = compileExpr(spec.expr || 'x^2', ['x']);
  } catch (e) {
    showSpecError(host, '表达式有误：' + e.message);
    return { slidersBox: document.createElement('div') };
  }
  const xmin = spec.xmin != null ? spec.xmin : 0;
  const xmax = spec.xmax != null ? spec.xmax : 2;
  const state = { n: spec.n || 6 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  let r = null;

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const padL = 34;
    const padR = 16;
    const padT = 54;
    const padB = 28;
    let lo = 0;
    let hi = 0;
    const curve = [];
    for (let k = 0; k <= 260; k++) {
      const x = xmin + (xmax - xmin) * k / 260;
      const y = callField(fn, x);
      curve.push({ x, y });
      if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    }
    const margin = (hi - lo) * 0.15 || 1;
    lo -= margin;
    hi += margin;
    const X = (x) => padL + (x - xmin) / (xmax - xmin) * (W - padL - padR);
    const Y = (y) => padT + (1 - (y - lo) / (hi - lo)) * (H - padT - padB);
    ctx.clearRect(0, 0, W, H);
    const width = (xmax - xmin) / state.n;
    let lower = 0;
    let upper = 0;
    for (let k = 0; k < state.n; k++) {
      const left = xmin + k * width;
      const right = left + width;
      let minV = Infinity;
      let maxV = -Infinity;
      for (let s = 0; s <= 60; s++) {
        const y = callField(fn, left + width * s / 60);
        if (!Number.isFinite(y)) continue;
        minV = Math.min(minV, y);
        maxV = Math.max(maxV, y);
      }
      if (!Number.isFinite(minV)) continue;
      lower += minV * width;
      upper += maxV * width;
      ctx.fillStyle = 'rgba(46,125,50,0.24)';
      ctx.fillRect(X(left), Y(0), X(right) - X(left), Y(minV) - Y(0));
      ctx.fillStyle = 'rgba(220,38,38,0.14)';
      ctx.fillRect(X(left), Y(0), X(right) - X(left), Y(maxV) - Y(0));
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.strokeRect(X(left), Y(minV), X(right) - X(left), Y(maxV) - Y(minV));
    }
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    curve.forEach((point, k) => { if (!k) ctx.moveTo(X(point.x), Y(point.y)); else ctx.lineTo(X(point.x), Y(point.y)); });
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`下和=${fmtFixed(lower, 4)}  上和=${fmtFixed(upper, 4)}`, 16, 26);
    ctx.fillText(`上一下差=${fmtFixed(upper - lower, 4)}`, 16, 46);
    cap.textContent = '绿柱用每格下确界，红柱用每格上确界。分割加细时，两个阶梯面积互相逼近；能夹出同一个数就是 Riemann 可积。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [{ name: 'n', min: 1, max: 40, step: 1, value: state.n }],
  }, (next) => { state.n = Math.round(next.n); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- Fourier 严格收敛与吉布斯过冲 ---------- */

function renderFouriergibbsstrict(host, spec) {
  const state = { harmonics: spec.harmonics || 9, halfWidth: spec.halfWidth != null ? spec.halfWidth : 0.7 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  let r = null;

  function partial(x) {
    let total = 0;
    for (let j = 1; j <= state.harmonics; j++) {
      const n = 2 * j - 1;
      total += Math.sin(n * x) / n;
    }
    return 4 * total / Math.PI;
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const pad = 30;
    const xmin = Math.PI - state.halfWidth;
    const xmax = Math.PI + state.halfWidth;
    const X = (x) => pad + (x - xmin) / (xmax - xmin) * (W - pad * 2);
    const Y = (y) => pad + (1 - (y + 1.5) / 3) * (H - pad * 2);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, Y(0), W - pad, Y(0));
    ctx.strokeStyle = '#2e7d32';
    ctx.setLineDash([6, 4]);
    line(ctx, pad, Y(1), W - pad, Y(1));
    line(ctx, pad, Y(-1), W - pad, Y(-1));
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3b74d6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k <= 500; k++) {
      const x = xmin + (xmax - xmin) * k / 500;
      const p = { x: X(x), y: Y(partial(x)) };
      if (!k) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    let maxV = -Infinity;
    let maxX = 0;
    for (let k = 1; k < 500; k++) {
      const x = xmin + (xmax - xmin) * k / 500;
      const value = partial(x);
      if (value > maxV) { maxV = value; maxX = x; }
    }
    ctx.beginPath();
    ctx.arc(X(maxX), Y(maxV), 6, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    const jumpValue = partial(Math.PI);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`S(${state.harmonics};π)=${fmtFixed(jumpValue, 4)}`, 16, 26);
    ctx.fillText(`左侧峰=${fmtFixed(maxV, 4)}，相对全跳幅过冲≈${fmtFixed((maxV - 1) * 50, 1)}%`, 16, 46);
    cap.textContent = '绿线是方波上下台阶。跳点 π 的部分和收敛到左右平均值 0；红峰高度不随谐波数消失，只被挤得越来越窄。';
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const sl = buildSliders({
    sliders: [
      { name: 'harmonics', min: 1, max: 81, step: 2, value: state.harmonics },
      { name: 'halfWidth', min: 0.1, max: Math.PI, step: 0.05, value: state.halfWidth },
    ],
  }, (next) => { state.harmonics = Math.round(next.harmonics); state.halfWidth = next.halfWidth; draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- PDE 探针：时空平面与当前波形联动 ---------- */

function renderPdeprobe(host, spec) {
  const initial = {
    amplitude: spec.amplitude != null ? spec.amplitude : 1,
    speed: spec.speed != null ? spec.speed : 1,
    wavelength: spec.wavelength != null ? spec.wavelength : 2,
    x: spec.x != null ? spec.x : 1,
    t: spec.t != null ? spec.t : 0.5,
  };
  const state = {
    ...initial,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 400;
  const pad = 38;
  const mapH = 210;
  const xmin = 0;
  const xmax = 4;
  const tmax = 2;
  let r = null;
  let geo = {};

  function value(x, t) {
    return state.amplitude * Math.sin((Math.PI * 2 * (x - state.speed * t)) / state.wavelength);
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const plotW = W - pad * 2;
    const MX = (x) => pad + ((x - xmin) / (xmax - xmin)) * plotW;
    const MY = (t) => pad + (1 - t / tmax) * mapH;
    geo.MX = MX;
    geo.MY = MY;

    const cols = Math.min(90, Math.max(36, Math.floor(plotW / 8)));
    const rows = 24;
    const cw = plotW / cols;
    const rh = mapH / rows;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = xmin + ((xmax - xmin) * (i + 0.5)) / cols;
        const t = tmax * (j + 0.5) / rows;
        ctx.fillStyle = fieldColor(value(x, t), -1, 1);
        ctx.fillRect(MX(xmin + ((xmax - xmin) * i) / cols), MY(tmax * (j + 1) / rows), cw + 0.7, rh + 0.7);
      }
    }
    ctx.strokeStyle = tc.bg;
    ctx.lineWidth = 3;
    line(ctx, pad, MY(state.t), W - pad, MY(state.t));
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    line(ctx, MX(state.x), MY(tmax), MX(state.x), pad);
    ctx.setLineDash([]);

    const profTop = pad + mapH + 42;
    const profH = H - profTop - pad;
    const PY = (u) => profTop + (1 - (u + 1.25) / 2.5) * profH;
    geo.PY = PY;
    ctx.fillStyle = tc.fg;
    ctx.font = '600 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('当前时刻波形', pad, profTop - 12);
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 2;
    line(ctx, pad, PY(0), W - pad, PY(0));
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let clipped = false; // 波形超出 ±1.25 显示范围时贴边裁剪并提示（修复：峰顶直接画进上方时空图）
    for (let k = 0; k <= 300; k++) {
      const x = xmin + ((xmax - xmin) * k) / 300;
      const u = value(x, state.t);
      const uc = Math.max(-1.25, Math.min(1.25, u));
      if (uc !== u) clipped = true;
      const p = { x: MX(x), y: PY(uc) };
      if (!k) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    const uProbe = value(state.x, state.t);
    const pp = { x: MX(state.x), y: PY(Math.max(-1.25, Math.min(1.25, uProbe))) };
    geo.pp = pp;
    const mp = { x: MX(state.x), y: MY(state.t) };
    geo.mp = mp;
    [[mp, '#7c3aed'], [pp, '#7c3aed']].forEach(([p]) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`u(${fmtFixed(state.x, 2)},${fmtFixed(state.t, 2)})=${fmtFixed(uProbe, 3)}`, pad, 24);
    cap.textContent =
      '上图横轴是空间 x，纵轴是时间 t；下图是橙色时刻的波形。在时空图里横向改位置、纵向改时间，两个紫点保持同一探针。' +
      (clipped ? ' ⚠ 波形已超出 ±1.25 显示范围，峰顶贴边裁剪。' : '');
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return geo.mp && Math.hypot(x - geo.mp.x, y - geo.mp.y) <= 22 ? 'probe' : null;
    },
    move(id, x, y) {
      void id;
      state.x = clamp(xmin + ((x - pad) / (r.W - pad * 2)) * (xmax - xmin), xmin, xmax);
      state.t = clamp(tmax * (1 - (y - pad) / mapH), 0, tmax);
      draw();
    },
  });
  const sl = buildSliders({
    sliders: [
      { name: 'amplitude', min: 0, max: 1.5, step: 0.05, value: state.amplitude },
      { name: 'speed', min: -2, max: 2, step: 0.1, value: state.speed },
      { name: 'wavelength', min: 0.8, max: 4, step: 0.1, value: state.wavelength },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  addAnimationControls(host, {
    onTick(dt) {
      state.t = (state.t + dt * 0.45) % tmax;
      draw();
    },
    onReset() {
      Object.assign(state, initial);
      draw();
    },
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 通量盒：两个采样点决定边界通量 ---------- */

function renderFluxbox(host, spec) {
  const initialStorage = spec.storage != null ? spec.storage : 1;
  const state = {
    points: [
      { x: spec.left ? spec.left[0] : 0.28, y: spec.left ? spec.left[1] : 0.65 },
      { x: spec.right ? spec.right[0] : 0.72, y: spec.right ? spec.right[1] : -0.25 },
    ],
    storage: initialStorage,
    source: spec.source != null ? spec.source : 0,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 360;
  const pad = 38;
  const xmin = 0;
  const xmax = 1;
  const umin = -1;
  const umax = 1;
  let r = null;
  let geo = {};

  function sorted() {
    return state.points.slice().sort((a, b) => a.x - b.x);
  }
  function fluxAt(x) {
    const pts = sorted();
    if (pts[1].x === pts[0].x) return pts[0].y;
    return pts[0].y + ((x - pts[0].x) / (pts[1].x - pts[0].x)) * (pts[1].y - pts[0].y);
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const plotW = W - pad * 2;
    const X = (x) => pad + ((x - xmin) / (xmax - xmin)) * plotW;
    const Y = (q) => pad + (1 - (q - umin) / (umax - umin)) * 180;
    geo.X = X;
    geo.Y = Y;
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, Y(0), W - pad, Y(0));
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = tc.grid;
    line(ctx, X(0), Y(fluxAt(0)), X(1), Y(fluxAt(1)));
    ctx.setLineDash([]);
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(fluxAt(0)));
    state.points.forEach((p) => ctx.lineTo(X(p.x), Y(p.y)));
    ctx.lineTo(X(1), Y(fluxAt(1)));
    ctx.stroke();
    geo.handles = state.points.map((p) => ({ x: X(p.x), y: Y(p.y) }));
    geo.handles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    const qIn = fluxAt(0);
    const qOut = fluxAt(1);
    const net = qIn - qOut + state.source;
    const boxTop = 250;
    const boxH = 70;
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, boxTop, plotW, boxH);
    const fillH = clamp(state.storage, 0, 2) / 2 * boxH;
    ctx.fillStyle = 'rgba(59,116,214,0.55)';
    ctx.fillRect(pad, boxTop + boxH - fillH, plotW, fillH);
    arrow(ctx, pad - 26, boxTop + boxH / 2, pad + 4, boxTop + boxH / 2, qIn >= 0 ? '#15803d' : '#dc2626', 7);
    arrow(ctx, W - pad - 4, boxTop + boxH / 2, W - pad + 26, boxTop + boxH / 2, qOut >= 0 ? '#b45309' : '#dc2626', 7);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`q_in=${fmtFixed(qIn, 3)}  q_out=${fmtFixed(qOut, 3)}  净变化=${fmtFixed(net, 3)}`, pad, 26);
    ctx.fillText(`存储量=${fmtFixed(state.storage, 3)}`, pad, 46);
    cap.textContent = '橙线是通量剖面。左右两个把手都可横纵拖动：横轴改变取样位置，纵轴改变通量大小；盒子高度随“流入减流出加源”实时增减。';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.handles) return null;
      let best = null;
      let dist = 24;
      geo.handles.forEach((p, index) => {
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < dist) { dist = d; best = index; }
      });
      return best;
    },
    move(id, x, y) {
      const lo = id === 0 ? 0 : 0.35;
      const hi = id === 0 ? 0.65 : 1;
      state.points[id] = {
        x: clamp(xmin + ((x - pad) / (r.W - pad * 2)) * (xmax - xmin), lo, hi),
        y: clamp(umin + (1 - (y - pad) / 180) * (umax - umin), umin, umax),
      };
      draw();
    },
  });
  const sl = buildSliders({
    sliders: [{ name: 'source', min: -0.5, max: 0.5, step: 0.05, value: state.source }],
  }, (next) => { state.source = next.source; draw(); });
  addAnimationControls(host, {
    onTick(dt) {
      state.storage = clamp(state.storage + (fluxAt(0) - fluxAt(1) + state.source) * dt, 0, 2);
      draw();
    },
    onReset() {
      state.storage = initialStorage;
      draw();
    },
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 边界实验室：可拖初值与三种边界规则 ---------- */

function renderBoundarylab(host, spec) {
  const N = 49;
  const modes = ['fixed', 'insulated', 'periodic'];
  const modeNames = { fixed: '固定', insulated: '绝热', periodic: '周期' };
  const state = {
    mode: modes.includes(spec.mode) ? spec.mode : 'fixed',
    diffusivity: spec.diffusivity != null ? spec.diffusivity : 0.8,
    nodes: (spec.nodes || [[0.08, 0], [0.25, 0.8], [0.48, 0.15], [0.72, 0.65], [0.92, 0]])
      .map((pair) => ({ x: pair[0], y: pair[1] })),
    u: new Array(N).fill(0),
    time: 0,
    history: [],
  };
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  host.appendChild(controls);
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 380;
  const pad = 34;
  const profH = 170;
  let r = null;
  let geo = {};

  function seed() {
    const pts = state.nodes.slice().sort((a, b) => a.x - b.x);
    const last = N - 1;
    const limit = state.mode === 'periodic' ? last : N;
    if (state.mode === 'fixed') {
      state.u[0] = pts[0].y;
      state.u[last] = pts[pts.length - 1].y;
    }
    for (let i = state.mode === 'fixed' ? 1 : 0; i < limit; i++) {
      const x = i / (N - 1);
      let left = pts[0];
      let right = pts[pts.length - 1];
      for (let k = 1; k < pts.length; k++) {
        if (x <= pts[k].x) { left = pts[k - 1]; right = pts[k]; break; }
      }
      const t = right.x === left.x ? 0 : (x - left.x) / (right.x - left.x);
      state.u[i] = clamp(left.y + t * (right.y - left.y), -1.2, 1.2);
    }
    if (state.mode === 'periodic') state.u[last] = state.u[0];
    applyBoundary();
  }
  function applyBoundary() {
    if (state.mode === 'fixed') {
      /* Dirichlet 端点由 seed() 的初值数据直接规定 */
    } else if (state.mode === 'insulated') {
      state.u[0] = state.u[1];
      state.u[N - 1] = state.u[N - 2];
    } else {
      state.u[N - 1] = state.u[0];
    }
  }
  function step(dt) {
    const dx = 1 / (N - 1);
    const h = Math.min(dt, 0.03) * 0.30;
    /* 先按稳定性上限切子步，再用真实的 k*dt/dx^2 更新。 */
    const maxDt = 0.45 * dx * dx / state.diffusivity;
    const steps = clamp(Math.ceil(h / maxDt), 1, 160);
    const dtStep = h / steps;

    function advance() {
      const ratio = state.diffusivity * dtStep / (dx * dx);
      const next = state.u.slice();
      if (state.mode === 'periodic') {
        const count = N - 1;
        for (let i = 0; i < count; i++) {
          const left = state.u[(i + count - 1) % count];
          const right = state.u[(i + 1) % count];
          next[i] = state.u[i] + ratio * (left - 2 * state.u[i] + right);
        }
      } else {
        for (let i = 1; i < N - 1; i++) {
          next[i] = state.u[i] + ratio * (state.u[i - 1] - 2 * state.u[i] + state.u[i + 1]);
        }
      }
      state.u = next;
      applyBoundary();
    }
    for (let n = 0; n < steps; n++) advance();
    state.time += h;
    if (!geo.lastHistory || state.time - geo.lastHistory > 0.02) {
      state.history.push(state.u.slice());
      if (state.history.length > 52) state.history.shift();
      geo.lastHistory = state.time;
    }
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const X = (x) => pad + x * (W - pad * 2);
    const Y = (v) => pad + (1 - (v + 1.2) / 2.4) * profH;
    geo.X = X;
    geo.Y = Y;
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, Y(0), W - pad, Y(0));
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    state.u.forEach((v, i) => {
      const p = { x: X(i / (N - 1)), y: Y(v) };
      if (!i) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    geo.nodes = state.nodes.map((node) => ({ x: X(node.x), y: Y(node.y) }));
    geo.nodes.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    const stripTop = pad + profH + 54;
    const stripH = H - stripTop - pad;
    const cols = 80;
    const start = Math.max(0, state.history.length - cols);
    for (let row = 0; row < state.history.length - start; row++) {
      const vals = state.history[start + row];
      for (let i = 0; i < N; i++) {
        const px = pad + (i / (N - 1)) * (W - pad * 2);
        const py = stripTop + stripH - (row / 52) * stripH;
        ctx.fillStyle = fieldColor(vals[i], -1, 1);
        ctx.fillRect(px, py, (W - pad * 2) / (N - 1) + 0.7, stripH / 52 + 0.7);
      }
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`边界=${modeNames[state.mode]}  t=${fmtFixed(state.time, 3)}`, pad, 26);
    cap.textContent = '上方紫色点同时接受横纵拖动，用来捏出初始温度曲线；下方热图记录演化历史。切换固定、绝热、周期边界，看端点如何改写规则。';
  }

  modes.forEach((mode) => {
    const b = mkBtn(modeNames[mode]);
    b.addEventListener('click', () => {
      state.mode = mode;
      /* 切边界=换规则：清空历史热图与计时，避免新旧规则的条带混叠（与 onReset 同口径） */
      state.time = 0;
      state.history = [];
      geo.lastHistory = 0;
      seed();
      draw();
    });
    controls.appendChild(b);
  });
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.nodes) return null;
      let best = null;
      let dist = 22;
      geo.nodes.forEach((p, index) => {
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < dist) { dist = d; best = index; }
      });
      return best;
    },
    move(id, x, y) {
      const lo = id === 0 ? 0 : state.nodes[id - 1].x + 0.03;
      const hi = id === state.nodes.length - 1 ? 1 : state.nodes[id + 1].x - 0.03;
      state.nodes[id] = {
        x: clamp((x - pad) / (r.W - pad * 2), lo, hi),
        y: clamp(-1.2 + (1 - (y - pad) / profH) * 2.4, -1.2, 1.2),
      };
      seed();
      draw();
    },
  });
  const sl = buildSliders({
    sliders: [{ name: 'diffusivity', min: 0.1, max: 1.5, step: 0.05, value: state.diffusivity }],
  }, (next) => { state.diffusivity = next.diffusivity; draw(); });
  seed();
  addAnimationControls(host, {
    onTick(dt) {
      step(dt);
      draw();
    },
    onReset() {
      state.time = 0;
      state.history = [];
      geo.lastHistory = 0;
      seed();
      draw();
    },
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 一维热扩散：移动热点的解析直觉 ---------- */

function renderHeat1dlab(host, spec) {
  const state = {
    center: spec.center != null ? spec.center : 1,
    height: spec.height != null ? spec.height : 1,
    width: spec.width != null ? spec.width : 0.35,
    diffusivity: spec.diffusivity != null ? spec.diffusivity : 0.18,
    time: 0,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const pad = 38;
  const xmin = 0;
  const xmax = 2;
  let r = null;
  let geo = {};

  function temp(x, t) {
    const spread = state.width * state.width + 4 * state.diffusivity * t;
    return state.height * Math.sqrt(state.width * state.width / spread)
      * Math.exp(-Math.pow(x - state.center, 2) / spread);
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const peak = Math.max(0.25, temp(state.center, state.time));
    const X = (x) => pad + ((x - xmin) / (xmax - xmin)) * (W - pad * 2);
    const Y = (v) => pad + (1 - v / 1.35) * (H - pad * 2);
    geo.X = X;
    geo.Y = Y;
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, Y(0), W - pad, Y(0));
    for (let i = 0; i < 60; i++) {
      const x0 = xmin + ((xmax - xmin) * i) / 60;
      const x1 = xmin + ((xmax - xmin) * (i + 1)) / 60;
      ctx.fillStyle = fieldColor(temp((x0 + x1) / 2, state.time), 0, 1.1);
      ctx.globalAlpha = 0.32;
      ctx.fillRect(X(x0), Y(temp((x0 + x1) / 2, state.time)), X(x1) - X(x0), Y(0) - Y(temp((x0 + x1) / 2, state.time)));
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k <= 320; k++) {
      const x = xmin + ((xmax - xmin) * k) / 320;
      const p = { x: X(x), y: Y(temp(x, state.time)) };
      if (!k) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    const hp = { x: X(state.center), y: Y(temp(state.center, state.time)) };
    geo.handle = hp;
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`峰值=${fmtFixed(peak, 3)}  扩散宽度²=${fmtFixed(state.width ** 2 + 4 * state.diffusivity * state.time, 3)}`, pad, 26);
    cap.textContent = '白点可横向移动热点中心，纵向改变初始峰高。时间播放时峰变矮变宽：热量没有消失，只是摊到了更大的空间里。';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return geo.handle && Math.hypot(x - geo.handle.x, y - geo.handle.y) <= 24 ? 'pulse' : null;
    },
    move(id, x, y) {
      void id;
      state.center = clamp(xmin + ((x - pad) / (r.W - pad * 2)) * (xmax - xmin), xmin + 0.08, xmax - 0.08);
      const wanted = clamp((pad + (H - pad * 2) - y) / (H - pad * 2) * 1.35, 0, 1.25);
      const spread = state.width * state.width + 4 * state.diffusivity * state.time;
      state.height = clamp(wanted / Math.sqrt(state.width * state.width / spread), 0, 1.25);
      draw();
    },
  });
  const sl = buildSliders({
    sliders: [
      { name: 'diffusivity', min: 0.03, max: 0.45, step: 0.01, value: state.diffusivity },
      { name: 'width', min: 0.12, max: 0.70, step: 0.01, value: state.width },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  addAnimationControls(host, {
    onTick(dt) {
      state.time += dt;
      draw();
    },
    onReset() {
      state.time = 0;
      draw();
    },
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 热方程差分模板 ---------- */

function renderFdheatstencil(host, spec) {
  const cols = spec.cols || 10;
  const rows = spec.rows || 6;
  const initial = {
    i: spec.i != null ? spec.i : 4,
    j: spec.j != null ? spec.j : 2,
  };
  const state = { ...initial, phase: 0 };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const pad = 44;
  let r = null;
  let geo = {};

  function fakeValue(i, j) {
    return Math.cos(i / cols * Math.PI) * Math.exp(-j / 5);
  }
  function cell(i, j) {
    return {
      x: pad + (i + 0.5) * ((r.W - pad * 2) / cols),
      y: pad + (rows - 1 - j) * ((H - pad * 2) / rows),
    };
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const cw = (W - pad * 2) / cols;
    const ch = (H - pad * 2) / rows;
    geo.cw = cw;
    geo.ch = ch;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const p = cell(i, j);
      const active = Math.abs(i - state.i) + Math.abs(j - (state.j - 1)) === 1 && j === state.j - 1;
      ctx.fillStyle = j < state.j ? fieldColor(fakeValue(i, j), -1, 1) : softFill();
      if (j === state.j - 1 && Math.abs(i - state.i) === 1) ctx.fillStyle = 'rgba(232,135,30,0.45)';
      if (i === state.i && j === state.j - 1) ctx.fillStyle = 'rgba(46,125,50,0.55)';
      ctx.fillRect(p.x - cw / 2 + 2, p.y - ch / 2 + 2, cw - 4, ch - 4);
      void active;
    }
    const target = cell(state.i, state.j);
    geo.target = target;
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    ctx.strokeRect(target.x - cw / 2 + 2, target.y - ch / 2 + 2, cw - 4, ch - 4);
    ctx.beginPath();
    ctx.moveTo(target.x - cw * 0.38, target.y + ch * 0.30);
    ctx.lineTo(target.x - cw * 0.38, target.y - ch * 0.20);
    ctx.moveTo(target.x + cw * 0.38, target.y + ch * 0.30);
    ctx.lineTo(target.x + cw * 0.38, target.y - ch * 0.20);
    ctx.moveTo(target.x - cw * 0.38, target.y + ch * 0.30);
    ctx.lineTo(target.x + cw * 0.38, target.y + ch * 0.30);
    ctx.stroke();
    const uL = fakeValue(state.i - 1, state.j - 1);
    const uC = fakeValue(state.i, state.j - 1);
    const uR = fakeValue(state.i + 1, state.j - 1);
    const lambda = 0.4;
    const unew = uC + lambda * (uL - 2 * uC + uR);
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`U[i,j+1]=U[i,j]+λ(U[i-1,j]-2U[i,j]+U[i+1,j])`, pad, 24);
    ctx.fillText(`λ=${fmtFixed(lambda, 2)}  新值≈${fmtFixed(unew, 3)}`, pad, 42);
    cap.textContent = '紫色目标格由下一层的左邻、自身、右邻加权得到。拖动模板可同时在网格横轴换位置、纵轴换时间层；动画则逐层向上推进。';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.target) return null;
      return Math.hypot(x - geo.target.x, y - geo.target.y) <= Math.max(geo.cw, geo.ch) ? 'stencil' : null;
    },
    move(id, x, y) {
      void id;
      state.i = clamp(Math.floor(((x - pad) / (r.W - pad * 2)) * cols), 1, cols - 2);
      state.j = clamp(rows - 1 - Math.floor(((y - pad) / (H - pad * 2)) * rows), 1, rows - 1);
      draw();
    },
  });
  addAnimationControls(host, {
    onTick(dt) {
      state.phase += dt * 1.8;
      state.j = 1 + Math.floor(state.phase) % (rows - 1);
      draw();
    },
    onReset() {
      state.phase = 0;
      Object.assign(state, initial);
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 显式格式的复平面稳定域 ---------- */

function renderStabilityplane(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 350;
  const radius = Math.min(H, 999) / 2 - 42;
  let r = null;
  let geo = {};

  /* 轨迹 G=1-r+r e^(-iθ) 是过 1、圆心在实轴上的圆。
     由点相对 1 的向量可直接解出 r，再反解相位。 */
  function paramsFromPoint(re, im) {
    const dx = re - 1;
    if (dx > -1e-4) return { theta: 0, rr: 0.02 };
    const rr = clamp((dx * dx + im * im) / (-2 * dx), 0.02, 1.6);
    let theta = -Math.atan2(im, re - (1 - rr));
    theta %= Math.PI * 2;
    if (theta < 0) theta += Math.PI * 2;
    return { theta, rr };
  }
  function pointFromParams(theta, rr) {
    return {
      re: 1 - rr * (1 - Math.cos(theta)),
      im: -rr * Math.sin(theta),
    };
  }
  const initialParams = paramsFromPoint(
    spec.re != null ? spec.re : 0,
    spec.im != null ? spec.im : 0.55,
  );
  const initialState = {
    ...initialParams,
    ...pointFromParams(initialParams.theta, initialParams.rr),
  };
  const state = { ...initialState };
  function amplification(theta, rr) {
    return Math.sqrt(1 - 2 * rr * (1 - rr) * (1 - Math.cos(theta)));
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const cx = W / 2;
    const cy = H / 2;
    const X = (z) => cx + z * radius;
    const Y = (z) => cy - z * radius;
    geo.X = X;
    geo.Y = Y;
    ctx.clearRect(0, 0, W, H);
    const tc = themeColors();
    ctx.strokeStyle = tc.grid;
    line(ctx, cx - radius, cy, cx + radius, cy);
    line(ctx, cx, cy - radius, cx, cy + radius);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(46,125,50,0.10)';
    ctx.fill();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    const p = { theta: state.theta, rr: state.rr };
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let k = 0; k <= 720; k++) {
      const th = Math.PI * 2 * k / 720;
      const zr = 1 - p.rr * (1 - Math.cos(th));
      const zi = -p.rr * Math.sin(th);
      if (!k) ctx.moveTo(X(zr), Y(zi));
      else ctx.lineTo(X(zr), Y(zi));
    }
    ctx.stroke();
    const snapped = pointFromParams(p.theta, p.rr);
    state.re = snapped.re;
    state.im = snapped.im;
    const zr = snapped.re;
    const zi = snapped.im;
    state.re = zr;
    state.im = zi;
    const pp = { x: X(zr), y: Y(zi) };
    geo.point = pp;
    const amp = amplification(p.theta, p.rr);
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = amp <= 1.001 ? '#15803d' : '#dc2626';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`CFL r=${fmtFixed(p.rr, 3)}  |G|=${fmtFixed(amp, 4)}`, 16, 28);
    cap.textContent = '绿圆是不放大误差的安全域，橙圈是对流迎风格式随波数走出的轨迹。白点可在复平面上横纵拖动：实轴和虚轴共同反推出 r 与相位 θ。';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      return geo.point && Math.hypot(x - geo.point.x, y - geo.point.y) <= 24 ? 'G' : null;
    },
    move(id, x, y) {
      void id;
      const re = clamp((x - r.W / 2) / radius, -1, 2.2);
      const im = clamp((r.H / 2 - y) / radius, -1.2, 1.2);
      Object.assign(state, paramsFromPoint(re, im), pointFromParams(state.theta, state.rr));
      draw();
    },
  });
  addAnimationControls(host, {
    onTick(dt) {
      state.theta = (state.theta + dt * 0.7) % (Math.PI * 2);
      Object.assign(state, pointFromParams(state.theta, state.rr));
      draw();
    },
    onReset() {
      Object.assign(state, initialState);
      draw();
    },
  });
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 代数结构：行/列双轴运算表（凯莱表与有限域乘法网格共用内核） ---------- */

function parseAlgebraOperation(spec, elements) {
  const opText = String(spec.operation || '').toLowerCase();
  const match = opText.match(/mod\s*(\d+)/);
  const modulus = Number(spec.modulus || (match ? match[1] : elements.length));
  if (/\*/.test(opText)) return { kind: 'mul-mod', modulus };
  if (/\+/.test(opText)) return { kind: 'add-mod', modulus };
  if (/^(mul(mod)?|multiplication)$/.test(opText)) return { kind: 'mul-mod', modulus };
  if (/^(add(mod)?|addition)$/.test(opText)) return { kind: 'add-mod', modulus };
  return { kind: 'table', modulus };
}

function algebraResult(op, a, b, table, ai, bi) {
  if (op.kind === 'table') {
    const value = table && table[ai] ? table[ai][bi] : null;
    return value == null ? null : String(value);
  }
  const av = Number(a);
  const bv = Number(b);
  if (!Number.isFinite(av) || !Number.isFinite(bv)) return null;
  const raw = op.kind === 'mul-mod' ? av * bv : av + bv;
  return String(((raw % op.modulus) + op.modulus) % op.modulus);
}

function renderAlgebraGrid(host, spec) {
  const isFiniteGrid = spec.type === 'finite-field-inverse-grid';
  let elements;
  let op;
  if (isFiniteGrid) {
    const n = clamp(Number(spec.modulus || 11), 2, 16);
    elements = Array.from({ length: n }, (_, i) => String(i));
    op = { kind: 'mul-mod', modulus: n };
  } else {
    elements = (Array.isArray(spec.elements) ? spec.elements : ['0', '1']).slice(0, 12).map(String);
    op = parseAlgebraOperation(spec, elements);
  }
  const labels = Array.isArray(spec.labels) && spec.labels.length === elements.length
    ? spec.labels.map(String)
    : elements;
  const values = Array.isArray(spec.values) ? spec.values : elements;
  const zeroLabel = String(spec.zero != null ? spec.zero : (op.kind === 'mul-mod' ? 0 : ''));
  const state = {
    row: clamp(Number(spec.selectedRow == null ? 1 : spec.selectedRow), 0, elements.length - 1),
    col: clamp(Number(spec.selectedCol == null ? 1 : spec.selectedCol), 0, elements.length - 1),
    highlight: new Set(Array.isArray(isFiniteGrid ? spec.filters : spec.highlight)
      ? (isFiniteGrid ? spec.filters : spec.highlight)
      : ['identity', 'inverses']),
  };
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  const summary = document.createElement('div');
  summary.className = 'ml-viz__caption';
  const tableWrap = document.createElement('div');
  tableWrap.className = 'ml-algebra-scroll';
  const table = document.createElement('div');
  table.className = 'ml-algebra-grid';
  table.setAttribute('role', 'grid');
  table.tabIndex = 0;
  table.setAttribute('aria-label', spec.title || '代数运算表');
  tableWrap.appendChild(table);
  host.append(controls, tableWrap, summary);

  const result = [];
  for (let i = 0; i < elements.length; i++) {
    result.push(elements.map((__, j) => algebraResult(op, values[i], values[j], spec.table, i, j)));
  }
  if (result.some((row) => row.some((value) => value == null || !elements.includes(value)))) {
    showSpecError(host, '运算表不合法：每个结果必须是集合中的元素。');
    return { slidersBox: document.createElement('div') };
  }

  let identity = null;
  for (const candidate of elements) {
    const at = elements.indexOf(candidate);
    const leftOk = elements.every((item, i) => result[i][at] === item);
    const rightOk = elements.every((item, j) => result[at][j] === item);
    if (leftOk && rightOk) {
      identity = candidate;
      break;
    }
  }
  const commutative = result.every((row, i) => row.every((value, j) => value === result[j][i]));
  const inverses = new Map();
  if (identity != null) {
    elements.forEach((a, i) => elements.forEach((b, j) => {
      if (result[i][j] === identity && result[j][i] === identity) inverses.set(a, b);
    }));
  }
  const units = identity == null ? [] : elements.filter((item) => inverses.has(item));
  const zeroDivisors = op.kind !== 'mul-mod' || zeroLabel === '' || !elements.includes(zeroLabel)
    ? []
    : elements.filter((a, i) => a !== zeroLabel
      && elements.some((b, j) => b !== zeroLabel && result[i][j] === zeroLabel));

  function toggle(name) {
    if (state.highlight.has(name)) state.highlight.delete(name);
    else state.highlight.add(name);
    draw();
  }

  function makeAxisButton(label, axis, index) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ml-algebra-axis';
    btn.textContent = label;
    btn.setAttribute('aria-label', (axis === 'row' ? '选择行 ' : '选择列 ') + label);
    btn.addEventListener('click', () => {
      state[axis] = index;
      draw();
    });
    return btn;
  }

  function build() {
    table.innerHTML = '';
    table.style.gridTemplateColumns = 'minmax(44px,auto) repeat(' + elements.length + ',minmax(40px,1fr))';
    const corner = document.createElement('div');
    corner.className = 'ml-algebra-head';
    corner.textContent = op.kind === 'mul-mod' ? '×' : '*';
    table.appendChild(corner);
    elements.forEach((item, j) => table.appendChild(makeAxisButton(labels[j], 'col', j)));
    result.forEach((row, i) => {
      table.appendChild(makeAxisButton(labels[i], 'row', i));
      row.forEach((value, j) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'ml-algebra-cell';
        cell.textContent = value;
        cell.setAttribute('aria-label', labels[i] + ' 与 ' + labels[j] + ' 的结果是 ' + value);
        cell.addEventListener('click', () => {
          state.row = i;
          state.col = j;
          draw();
        });
        table.appendChild(cell);
      });
    });
    table.addEventListener('keydown', (event) => {
      const moves = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const move = moves[event.key];
      if (!move) return;
      state.row = clamp(state.row + move[0], 0, elements.length - 1);
      state.col = clamp(state.col + move[1], 0, elements.length - 1);
      draw();
      table.querySelectorAll('.ml-algebra-cell')[state.row * elements.length + state.col]?.focus();
      event.preventDefault();
    });
  }

  const controlRefs = {};
  const controlRows = isFiniteGrid
    ? [
      ['one', '乘积=1', 'equals-one'],
      ['zeroCell', '乘积=0', 'equals-zero'],
      ['nonzeroZero', '非零零积', 'nonzero-zero-product'],
    ]
    : [
      ['identity', '单位元', 'identity'],
      ['inverses', '互逆对', 'inverses'],
      ['commute', '交换差异', 'commuting-pairs'],
      ['zero', '零因子', 'zero-products'],
    ];
  controlRows.forEach(([name, label, key]) => {
    if (name === 'zero' && !(op.kind === 'mul-mod' && zeroDivisors.length)) return;
    const btn = mkBtn(label);
    controlRefs[name] = btn;
    btn.addEventListener('click', () => toggle(key));
    controls.appendChild(btn);
  });

  function draw() {
    const cells = Array.from(table.querySelectorAll('.ml-algebra-cell'));
    const axes = Array.from(table.querySelectorAll('.ml-algebra-axis'));
    cells.forEach((cell) => { cell.className = 'ml-algebra-cell'; });
    axes.forEach((axis) => axis.classList.remove('is-row-hot', 'is-col-hot'));
    result.forEach((row, i) => row.forEach((value, j) => {
      const cell = cells[i * elements.length + j];
      if (state.row === i) cell.classList.add('is-row-hot');
      if (state.col === j) cell.classList.add('is-col-hot');
      if (state.row === i && state.col === j) cell.classList.add('is-selected');
      if (!isFiniteGrid) {
        if (identity != null && value === identity && state.highlight.has('identity')) cell.classList.add('is-identity');
        if (state.highlight.has('inverses') && value === identity && result[j][i] === identity) cell.classList.add('is-inverse');
        if (state.highlight.has('commuting-pairs') && value !== result[j][i]) cell.classList.add('is-mismatch');
        if (state.highlight.has('zero-products') && zeroDivisors.length && value === zeroLabel) cell.classList.add('is-zero');
      } else {
        if (state.highlight.has('equals-one') && value === '1') cell.classList.add('is-inverse');
        if (state.highlight.has('equals-zero') && value === zeroLabel) cell.classList.add('is-zero');
        if (state.highlight.has('nonzero-zero-product')
          && values[i] != 0 && values[j] != 0 && value === zeroLabel) cell.classList.add('is-mismatch');
      }
    }));
    for (let i = 0; i < elements.length; i++) {
      axes[i].classList.toggle('is-row-hot', state.row === i);
      axes[elements.length + i].classList.toggle('is-col-hot', state.col === i);
    }
    summary.innerHTML = '';
    [
      '选中：' + labels[state.row] + ' ∗ ' + labels[state.col] + ' = ' + result[state.row][state.col],
      identity == null ? '单位元：未找到' : '单位元：' + identity,
      '单位：[' + units.join(', ') + ']',
      '交换律：' + (commutative ? '满足' : '不满足'),
      op.kind === 'mul-mod' && zeroDivisors.length ? '零因子：[' + zeroDivisors.join(', ') + ']' : '',
    ].filter(Boolean).forEach((text, index) => {
      const item = document.createElement(index === 0 ? 'strong' : 'span');
      item.textContent = text;
      if (index > 0) {
        item.style.display = 'inline-block';
        item.style.marginRight = '.8em';
      }
      summary.appendChild(item);
    });
    controlRows.forEach(([name,, key]) => {
      if (controlRefs[name]) controlRefs[name].setAttribute('aria-pressed', String(state.highlight.has(key)));
    });
  }

  build();
  draw();
  return { slidersBox: document.createElement('div') };
}

/* ---------- 循环群：圆周轨道与 k×(kg mod n) 幂次平面联动 ---------- */

function renderCyclicGenerator(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox ml-drag';
  wrap.tabIndex = 0;
  wrap.setAttribute('aria-label', spec.title || '循环群生成器');
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  host.append(wrap, cap, controls);
  const H = 330;
  const initialN = clamp(Number(spec.modulus || 12), 2, 16);
  const initialG = clamp(Number(spec.step == null ? 5 : spec.step), 0, initialN - 1);
  const initialK = clamp(Number(spec.power == null ? 3 : spec.power), 0, initialN * 2 - 1);
  const state = {
    n: initialN,
    g: initialG,
    k: initialK,
    showAll: spec.showAll !== false,
  };
  let r = null;
  const geo = { circle: [], plane: [] };
  let sliderRefs = null;

  function metrics() {
    const W = r.W;
    const cx = Math.max(W * 0.21, 92);
    const cy = H * 0.53;
    const radius = Math.min(H * 0.35, W * 0.17);
    const px0 = cx + radius + Math.max(48, W * 0.11);
    const px1 = W - 28;
    const py0 = 38;
    const py1 = H - 42;
    return { W, cx, cy, radius, px0, px1, py0, py1 };
  }

  function pointAt(k) {
    const m = metrics();
    const angle = -Math.PI / 2 + ((state.g * k) % state.n) / state.n * Math.PI * 2;
    const circle = {
      x: m.cx + Math.cos(angle) * m.radius,
      y: m.cy + Math.sin(angle) * m.radius,
    };
    const maxK = Math.max(state.n * 2 - 1, 8);
    const x = m.px0 + (m.px1 - m.px0) * k / maxK;
    const y = m.py1 - (m.py1 - m.py0) * ((state.g * k) % state.n) / Math.max(1, state.n - 1);
    return { circle, plane: { x, y } };
  }

  function draw() {
    if (!r) return;
    state.g %= state.n;
    state.k = clamp(Math.round(state.k), 0, state.n * 2 - 1);
    const ctx = r.ctx;
    const m = metrics();
    ctx.clearRect(0, 0, m.W, H);
    const tc = themeColors();
    ctx.font = '600 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < state.n; i++) {
      const angle = -Math.PI / 2 + i / state.n * Math.PI * 2;
      const x = m.cx + Math.cos(angle) * m.radius;
      const y = m.cy + Math.sin(angle) * m.radius;
      geo.circle[i] = { x, y, value: i };
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fillStyle = softFill();
      ctx.fill();
      ctx.strokeStyle = tc.axis;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = tc.fg;
      ctx.fillText(String(i), x, y);
    }
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let q = 0; q <= state.k; q++) {
      const p = pointAt(q).circle;
      if (q === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    const current = pointAt(state.k);
    ctx.beginPath();
    ctx.arc(current.circle.x, current.circle.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();

    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1;
    line(ctx, m.px0, m.py1, m.px1, m.py1);
    line(ctx, m.px0, m.py0, m.px0, m.py1);
    ctx.textAlign = 'left';
    ctx.fillStyle = tc.fg;
    ctx.fillText('k', m.px1 - 10, m.py1 + 17);
    ctx.save();
    ctx.translate(m.px0 - 22, m.py0 + 24);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('kg mod n', 0, 0);
    ctx.restore();
    geo.plane = [];
    for (let k = 0; k <= state.n * 2 - 1; k++) {
      const p = pointAt(k).plane;
      geo.plane.push({ ...p, k });
      ctx.beginPath();
      ctx.arc(p.x, p.y, state.showAll || k <= state.k ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = state.showAll || k <= state.k ? '#3b74d6' : softFill();
      ctx.fill();
      if (k === state.k) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    const order = state.n / gcd2(state.g || state.n, state.n);
    const generates = gcd2(state.g || state.n, state.n) === 1;
    ctx.textAlign = 'left';
    ctx.fillStyle = generates ? '#15803d' : tc.fg;
    ctx.font = '700 14px monospace';
    ctx.fillText('gcd=' + gcd2(state.g || state.n, state.n) + '，阶=' + order + (generates ? '，生成全群' : ''), 16, 24);
    cap.textContent = '左图是模 ' + state.n + ' 加法钟；右图横轴选次数 k、纵轴看落点。点击或拖动右图任一点，左侧会同步到同一状态。';
  }

  function pickNearest(x, y) {
    const m = metrics();
    if (x >= m.px0 - 12 && x <= m.px1 + 12 && y >= m.py0 - 12 && y <= m.py1 + 12) {
      let best = null;
      let bestDistance = Infinity;
      geo.plane.forEach((point) => {
        const distance = (point.x - x) * (point.x - x) + (point.y - y) * (point.y - y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = point;
        }
      });
      return best;
    }
    return null;
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      const hit = pickNearest(x, y);
      return hit ? 'k' : null;
    },
    move(id, x, y) {
      void id;
      const hit = pickNearest(x, y);
      if (hit && hit.k != null && hit.k !== state.k) {
        state.k = hit.k;
        if (sliderRefs) {
          sliderRefs.power.range.value = String(state.k);
          sliderRefs.power.val.textContent = String(state.k);
        }
        draw();
      }
    },
  });
  [
    ['−1 步', () => { state.k = Math.max(0, state.k - 1); }],
    ['+1 步', () => { state.k = Math.min(state.n * 2 - 1, state.k + 1); }],
    ['归零', () => { state.k = 0; }],
  ].forEach(([label, fn]) => {
    const btn = mkBtn(label);
    btn.addEventListener('click', () => {
      fn();
      if (sliderRefs) {
        sliderRefs.power.range.value = String(state.k);
        sliderRefs.power.val.textContent = String(state.k);
      }
      draw();
    });
    controls.appendChild(btn);
  });
  const showAllButton = mkBtn(state.showAll ? '只画已走路径' : '显示全部幂点');
  showAllButton.addEventListener('click', () => {
    state.showAll = !state.showAll;
    showAllButton.textContent = state.showAll ? '只画已走路径' : '显示全部幂点';
    draw();
  });
  controls.appendChild(showAllButton);
  const sl = buildSliders({
    sliders: [
      { name: 'modulus', min: 2, max: 16, step: 1, value: state.n },
      { name: 'step', min: 0, max: 15, step: 1, value: state.g },
      { name: 'power', min: 0, max: 31, step: 1, value: state.k },
    ],
  }, (next) => {
    state.n = Math.round(next.modulus);
    state.g = clamp(Math.round(next.step), 0, state.n - 1);
    state.k = clamp(Math.round(next.power), 0, state.n * 2 - 1);
    sl.refs.step.range.max = String(state.n - 1);
    sl.refs.step.range.value = String(state.g);
    sl.refs.step.val.textContent = String(state.g);
    sl.refs.power.range.max = String(state.n * 2 - 1);
    sl.refs.power.range.value = String(state.k);
    sl.refs.power.val.textContent = String(state.k);
    draw();
  });
  sliderRefs = sl.refs;
  wrap.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      state.k = clamp(state.k + (event.key === 'ArrowRight' ? 1 : -1), 0, state.n * 2 - 1);
      sliderRefs.power.range.value = String(state.k);
      sliderRefs.power.val.textContent = String(state.k);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      state.g = clamp(state.g + (event.key === 'ArrowDown' ? 1 : -1), 0, state.n - 1);
      sliderRefs.step.range.value = String(state.g);
      sliderRefs.step.val.textContent = String(state.g);
    } else {
      return;
    }
    draw();
    event.preventDefault();
  });
  controls.appendChild(sl.box);
  draw();
  return { slidersBox: document.createElement('div') };
}
/* ---------- 几何：平面直角坐标系（拖点读坐标、认象限、勾股算距离） ---------- */

function renderCoordplane(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const R = clamp(spec.range != null ? Number(spec.range) : 5, 2, 8);
  const st = { px: 2, py: 1, qx: -2, qy: 3, pair: !!spec.pair };
  let r = null;
  let geo = {};

  function quadrantName(x, y) {
    if (x === 0 && y === 0) return '原点本尊';
    if (x === 0) return '在 y 轴上（不属于任何象限）';
    if (y === 0) return '在 x 轴上（不属于任何象限）';
    if (x > 0 && y > 0) return '第一象限（右上）';
    if (x < 0 && y > 0) return '第二象限（左上）';
    if (x < 0 && y < 0) return '第三象限（左下）';
    return '第四象限（右下）';
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const step = Math.min((W - 34) / (2 * R + 1), (H - 52) / (2 * R + 1));
    const cx = W / 2;
    const cy = 26 + (H - 52) / 2;
    geo = { step, cx, cy };
    const X = (v) => cx + v * step;
    const Y = (v) => cy - v * step;
    ctx.strokeStyle = tc.grid;
    ctx.lineWidth = 1;
    for (let g = -R; g <= R; g++) {
      line(ctx, X(g), Y(R), X(g), Y(-R));
      line(ctx, X(-R), Y(g), X(R), Y(g));
    }
    ctx.strokeStyle = tc.axis;
    ctx.lineWidth = 1.6;
    line(ctx, X(-R) - 8, Y(0), X(R) + 8, Y(0));
    line(ctx, X(0), Y(R) + 8, X(0), Y(-R) - 8);
    ctx.fillStyle = tc.axis;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let g = -R; g <= R; g++) {
      if (g !== 0) {
        ctx.fillText(String(g), X(g), Y(0) + 14);
        ctx.fillText(String(g), X(0) - 12, Y(g) + 4);
      }
    }
    ctx.fillText('x', X(R) + 4, Y(0) - 8);
    ctx.textAlign = 'left';
    ctx.fillText('y', X(0) + 6, Y(R) - 2);

    function seg(x1, y1, x2, y2, color, dash) {
      ctx.setLineDash(dash || []);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      line(ctx, X(x1), Y(y1), X(x2), Y(y2));
      ctx.setLineDash([]);
    }

    ctx.font = '600 12px monospace';
    ctx.textAlign = 'left';
    if (st.pair) {
      seg(st.px, st.py, st.qx, st.qy, '#e8871e', [5, 4]);
      const dx = Math.abs(st.qx - st.px);
      const dy = Math.abs(st.qy - st.py);
      const d = Math.sqrt(dx * dx + dy * dy);
      ctx.fillStyle = '#e8871e';
      ctx.fillText(
        'Δx=' + dx.toFixed(1) + '，Δy=' + dy.toFixed(1) + ' → d=√(' + (dx * dx).toFixed(1) + '+' + (dy * dy).toFixed(1) + ')≈' + d.toFixed(2),
        12, 16,
      );
    } else {
      seg(0, 0, st.px, st.py, '#7c3aed', [5, 4]);
      const d = Math.sqrt(st.px * st.px + st.py * st.py);
      ctx.fillStyle = '#7c3aed';
      ctx.fillText(
        'OP=√(' + (st.px * st.px).toFixed(1) + '+' + (st.py * st.py).toFixed(1) + ')≈' + d.toFixed(2),
        12, 16,
      );
    }

    function dot(x, y, color, label) {
      ctx.beginPath();
      ctx.arc(X(x), Y(y), 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = tc.bg;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = '600 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(label, X(x), Y(y) - 12);
    }
    if (st.pair) dot(st.qx, st.qy, '#e8871e', 'Q');
    dot(st.px, st.py, '#3b74d6', 'P');
    cap.textContent = st.pair
      ? '两点距离=勾股定理：Δx、Δy 恰好是两条直角边（蓝点拖 P，橙点拖 Q）'
      : 'P = (' + st.px.toFixed(1) + ', ' + st.py.toFixed(1) + ')：' + quadrantName(st.px, st.py) + '。拖动试试——先横后纵，读门牌号';
  }

  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      if (!geo.step) return null;
      const xd = (x - geo.cx) / geo.step;
      const yd = (geo.cy - y) / geo.step;
      const dp = Math.hypot(xd - st.px, yd - st.py);
      const dq = Math.hypot(xd - st.qx, yd - st.qy);
      if (st.pair && dq < 0.5 && dq <= dp) return 2;
      if (dp < 0.5) return 1;
      return null;
    },
    move(id, x, y) {
      if (!geo.step) return;
      const snap = (v) => Math.round(v * 2) / 2;
      const xd = snap(clamp((x - geo.cx) / geo.step, -R, R));
      const yd = snap(clamp((geo.cy - y) / geo.step, -R, R));
      if (id === 2) {
        st.qx = xd;
        st.qy = yd;
      } else {
        st.px = xd;
        st.py = yd;
      }
      draw();
    },
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const btn = mkBtn('切换：拖动两点算距离');
  btn.addEventListener('click', () => {
    st.pair = !st.pair;
    btn.textContent = st.pair ? '切换：只看点 P（与原点的距离）' : '切换：拖动两点算距离';
    draw();
  });
  controls.appendChild(btn);
  draw();
  return { slidersBox: controls };
}

/* ---------- 概率：2×2 条件化棋盘（缩小论域，看概率怎么变） ---------- */

function renderCondgrid(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const rows = (Array.isArray(spec.rows) && spec.rows.length === 2 ? spec.rows : ['女生', '男生']).map(String);
  const cols = (Array.isArray(spec.cols) && spec.cols.length === 2 ? spec.cols : ['戴眼镜', '不戴眼镜']).map(String);
  const unit = typeof spec.unit === 'string' ? spec.unit : '人';
  const raw = Array.isArray(spec.counts) ? spec.counts : [];
  const at = (i, j) => (Array.isArray(raw[i]) && Number(raw[i][j]) >= 0 ? Number(raw[i][j]) : 0);
  const cnt = [[at(0, 0), at(0, 1)], [at(1, 0), at(1, 1)]];
  const safe = (a, b) => (b ? a / b : 0);
  const st = { focus: null };
  let r = null;

  function rowTot(i) { return cnt[i][0] + cnt[i][1]; }
  function colTot(j) { return cnt[0][j] + cnt[1][j]; }
  function total() { return rowTot(0) + rowTot(1); }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const H = r.H;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const padL = 30 + Math.max(rows[0].length, rows[1].length) * 13;
    const padT = 30;
    const cw = (W - padL - 16) / 2;
    const ch = (H - padT - 16) / 2;
    ctx.font = '600 12px system-ui';
    ctx.fillStyle = tc.fg;
    ctx.textAlign = 'center';
    for (let j = 0; j < 2; j++) ctx.fillText(cols[j] + '（' + colTot(j) + '）', padL + cw * j + cw / 2, padT - 10);
    ctx.textAlign = 'right';
    for (let i = 0; i < 2; i++) ctx.fillText(rows[i] + '（' + rowTot(i) + '）', padL - 8, padT + ch * i + ch / 2 + 4);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const active = !st.focus
          || (st.focus.kind === 'row' && st.focus.i === i)
          || (st.focus.kind === 'col' && st.focus.j === j);
        const x = padL + cw * j;
        const y = padT + ch * i;
        ctx.fillStyle = active ? 'rgba(59,116,214,0.18)' : softFill();
        ctx.fillRect(x + 3, y + 3, cw - 6, ch - 6);
        ctx.strokeStyle = active ? '#2563eb' : tc.axis;
        ctx.lineWidth = active ? 1.6 : 1;
        ctx.strokeRect(x + 3, y + 3, cw - 6, ch - 6);
        ctx.fillStyle = tc.fg;
        ctx.textAlign = 'center';
        ctx.font = '700 22px monospace';
        ctx.fillText(String(cnt[i][j]), x + cw / 2, y + ch / 2 + 4);
        ctx.font = '11px monospace';
        const base = st.focus && st.focus.kind === 'col' ? colTot(j) : rowTot(i);
        ctx.fillText(cnt[i][j] + '/' + base + '≈' + safe(cnt[i][j], base).toFixed(2), x + cw / 2, y + ch / 2 + 24);
      }
    }
    if (!st.focus) {
      cap.textContent = '全体 ' + total() + unit + '：' + cols[0] + ' 共 ' + colTot(0) + unit + '，占 '
        + safe(colTot(0), total()).toFixed(2) + '。点上面按钮缩小论域——条件概率登场';
    } else if (st.focus.kind === 'row') {
      const i = st.focus.i;
      cap.textContent = '只看' + rows[i] + '（' + rowTot(i) + unit + '）：' + cols[0] + ' 占 '
        + safe(cnt[i][0], rowTot(i)).toFixed(2) + '。再点“只看' + cols[0] + '”按列看——条件方向一换，数字就两样了';
    } else {
      const j = st.focus.j;
      cap.textContent = '只看' + cols[j] + '（' + colTot(j) + unit + '）：' + rows[0] + ' 占 '
        + safe(cnt[0][j], colTot(j)).toFixed(2) + '、' + rows[1] + ' 占 '
        + safe(cnt[1][j], colTot(j)).toFixed(2) + '。和按行算的数对比：P(A|B) ≠ P(B|A)';
    }
  }

  r = setupCanvas(wrap, 280);
  r.redraw = draw;
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  function addBtn(label, apply) {
    const b = mkBtn(label);
    b.addEventListener('click', () => {
      st.focus = apply();
      draw();
    });
    controls.appendChild(b);
  }
  addBtn('全体', () => null);
  rows.forEach((name, i) => addBtn('只看' + name, () => ({ kind: 'row', i })));
  cols.forEach((name, j) => addBtn('只看' + name, () => ({ kind: 'col', j })));
  draw();
  return { slidersBox: controls };
}

/* ---------- 分离变量：把 u(x,t) 拆成 X(x) 与 T(t) ---------- */

function renderSeparationmode(host, spec) {
  const L = spec.L != null ? spec.L : 1;
  const state = {
    n: spec.n != null ? spec.n : 2,
    mode: spec.mode || 'dirichlet',
    k: spec.k != null ? spec.k : 0.25,
    time: 0,
  };
  const modeNames = { dirichlet: '两端固定（0 度）', neumann: '两端绝热' };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 400;
  const pad = 40;
  let r = null;

  function lambda() {
    const w = state.mode === 'neumann' ? (state.n - 1) : state.n;
    return (w * Math.PI / L) ** 2;
  }
  function Xf(x) {
    return state.mode === 'neumann'
      ? Math.cos((state.n - 1) * Math.PI * x / L)
      : Math.sin(state.n * Math.PI * x / L);
  }
  function Tf(t) {
    return Math.exp(-state.k * lambda() * t);
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    const PX = (x) => pad + (x / L) * (W - pad * 2);
    const tmax = 4 / Math.max(0.2, state.k * lambda());
    const bandTop = [pad, pad + 130, pad + 230];
    const bandH = [90, 70, H - pad - (pad + 230)];
    const mid = [bandTop[0] + bandH[0] / 2, bandTop[1] + bandH[1] / 2, bandTop[2] + bandH[2] / 2];

    // 第 1 带：空间部分 X(x)
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, mid[0], W - pad, mid[0]);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = (L * i) / 200;
      ctx.lineTo(PX(x), mid[0] - Xf(x) * (bandH[0] / 2 - 6));
    }
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.font = '600 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('X(x) 空间形状 · 只由边界决定', pad, bandTop[0] - 6);

    // 第 2 带：时间部分 T(t)
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, bandTop[1] + bandH[1] - 6, W - pad, bandTop[1] + bandH[1] - 6);
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const t = (tmax * i) / 200;
      const px = pad + (i / 200) * (W - pad * 2);
      const py = bandTop[1] + bandH[1] - 6 - Tf(t) * (bandH[1] - 12);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    const tNow = pad + (Math.min(state.time, tmax) / tmax) * (W - pad * 2);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    line(ctx, tNow, bandTop[1], tNow, bandTop[1] + bandH[1]);
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(tNow, bandTop[1] + bandH[1] - 6 - Tf(state.time) * (bandH[1] - 12), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tc.fg;
    ctx.fillText('T(t) 时间衰减 · 只由 λ 决定', pad, bandTop[1] - 6);

    // 第 3 带：乘积 u = X·T
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, mid[2], W - pad, mid[2]);
    for (let i = 0; i < 60; i++) {
      const x0 = (L * i) / 60;
      const x1 = (L * (i + 1)) / 60;
      const v = Xf((x0 + x1) / 2) * Tf(state.time);
      ctx.fillStyle = fieldColor(v, -1, 1);
      ctx.globalAlpha = 0.3;
      const top = v >= 0 ? mid[2] - v * (bandH[2] / 2 - 4) : mid[2];
      ctx.fillRect(PX(x0), top, PX(x1) - PX(x0) + 0.6, Math.abs(v) * (bandH[2] / 2 - 4));
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = (L * i) / 200;
      ctx.lineTo(PX(x), mid[2] - Xf(x) * Tf(state.time) * (bandH[2] / 2 - 4));
    }
    ctx.stroke();
    ctx.fillStyle = tc.fg;
    ctx.fillText('u(x,t) = X(x)·T(t) 乘积解', pad, bandTop[2] - 6);

    ctx.font = '600 13px monospace';
    ctx.fillText(
      `n=${state.n}  λ=${fmtFixed(lambda(), 2)}  衰减率 kλ=${fmtFixed(state.k * lambda(), 3)}  半衰期=${fmtFixed(Math.LN2 / (state.k * lambda()), 3)}  t=${fmtFixed(state.time, 3)}`,
      pad, 24,
    );
    cap.textContent = '三条带自上而下是同一次分离的三张脸：空间形状、时间衰减、二者相乘。n 越大 λ 越大，衰减越快——高模态先死，这是展开式里最要紧的一条。';
  }
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  host.appendChild(controls);
  ['dirichlet', 'neumann'].forEach((m) => {
    const b = mkBtn(modeNames[m]);
    b.addEventListener('click', () => {
      state.mode = m;
      if (m === 'neumann' && state.n === 1) state.n = 2;
      state.time = 0;
      draw();
    });
    controls.appendChild(b);
  });
  const sl = buildSliders({
    sliders: [
      { name: 'n', min: 1, max: 5, step: 1, value: state.n },
      { name: 'k', min: 0.05, max: 0.8, step: 0.05, value: state.k },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  addAnimationControls(host, {
    onTick(dt) {
      state.time += dt * 0.6;
      draw();
    },
    onReset() {
      state.time = 0;
      draw();
    },
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 特征函数与边界：谁有资格当模态 ---------- */

function renderEigenboundary(host, spec) {
  const L = spec.L != null ? spec.L : 1;
  const state = {
    n: spec.n != null ? spec.n : 3,
    mode: spec.mode || 'dirichlet',
  };
  const modes = {
    dirichlet: { label: '两端固定 u=0', fn: (n, x) => Math.sin(n * Math.PI * x / L), lam: (n) => (n * Math.PI / L) ** 2 },
    neumann: { label: "两端绝热 u'=0", fn: (n, x) => Math.cos((n - 1) * Math.PI * x / L), lam: (n) => ((n - 1) * Math.PI / L) ** 2 },
    mixed: { label: '左固定右绝热', fn: (n, x) => Math.sin((n - 0.5) * Math.PI * x / L), lam: (n) => ((n - 0.5) * Math.PI / L) ** 2 },
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const pad = 38;
  let r = null;

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const m = modes[state.mode];
    ctx.clearRect(0, 0, W, H);
    const PX = (x) => pad + (x / L) * (W - pad * 2);
    const mid = pad + (H - pad * 2) / 2;
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, mid, W - pad, mid);
    ctx.strokeStyle = tc.axis;
    ctx.globalAlpha = 0.5;
    line(ctx, pad, pad, pad, H - pad);
    line(ctx, W - pad, pad, W - pad, H - pad);
    ctx.globalAlpha = 1;
    for (let n = 1; n <= 4; n++) {
      const on = n === state.n;
      ctx.strokeStyle = on ? '#e11d48' : '#94a3b8';
      ctx.lineWidth = on ? 3 : 1.4;
      ctx.globalAlpha = on ? 1 : 0.55;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = (L * i) / 200;
        ctx.lineTo(PX(x), mid - m.fn(n, x) * (H / 2 - pad - 8));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    const nodes = state.n - 1;
    ctx.fillText(
      `边界=${m.label}  n=${state.n}  λ_n=${fmtFixed(m.lam(state.n), 3)}  内部节点=${nodes}`,
      pad, 24,
    );
    ctx.font = '12px monospace';
    ctx.fillText('灰色是同族的前四个特征函数，红色是当前选中的模态', pad, H - 12);
    cap.textContent = '边界条件像一把筛子：两端固定只放行在端点为零的正弦，两端绝热只放行端点斜率为零的余弦。筛剩下的这一族就是特征函数，每个都带自己的 λ。';
  }
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  host.appendChild(controls);
  Object.keys(modes).forEach((k) => {
    const b = mkBtn(modes[k].label);
    b.addEventListener('click', () => { state.mode = k; draw(); });
    controls.appendChild(b);
  });
  const sl = buildSliders({
    sliders: [{ name: 'n', min: 1, max: 4, step: 1, value: state.n }],
  }, (next) => { Object.assign(state, next); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- Fourier 合成：把初始形状拆成模态再各自衰减 ---------- */

function renderFourierpdesynth(host, spec) {
  const shapes = {
    square: { label: '方波脉冲', f: (x) => (x > 0.35 && x < 0.65 ? 1 : 0) },
    triangle: { label: '三角屋顶', f: (x) => Math.max(0, 1 - Math.abs(x - 0.5) * 4) },
    twohump: { label: '双峰', f: (x) => Math.exp(-((x - 0.3) ** 2) / 0.006) + 0.7 * Math.exp(-((x - 0.7) ** 2) / 0.01) },
  };
  const state = {
    shape: spec.shape || 'square',
    N: spec.N != null ? spec.N : 3,
    k: spec.k != null ? spec.k : 0.1,
    time: 0,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const pad = 38;
  let r = null;

  function coeffs() {
    const out = [];
    for (let n = 1; n <= 12; n++) {
      let s = 0;
      const M = 400;
      for (let i = 0; i < M; i++) {
        const x = (i + 0.5) / M;
        s += shapes[state.shape].f(x) * Math.sin(n * Math.PI * x);
      }
      out.push((2 * s) / M);
    }
    return out;
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const b = coeffs();
    const PX = (x) => pad + x * (W - pad * 2);
    const base = H - pad;
    const scale = H - pad * 2 - 10;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, base, W - pad, base);

    // 初始形状（灰虚线）
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const x = i / 240;
      ctx.lineTo(PX(x), base - shapes[state.shape].f(x) * scale * 0.8);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 截断和（蓝）
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const x = i / 240;
      let s = 0;
      for (let n = 1; n <= state.N; n++) s += b[n - 1] * Math.sin(n * Math.PI * x);
      ctx.lineTo(PX(x), base - s * scale * 0.8);
    }
    ctx.stroke();

    // 衰减后的解（橙）
    ctx.strokeStyle = '#e8871e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const x = i / 240;
      let s = 0;
      for (let n = 1; n <= state.N; n++) {
        s += b[n - 1] * Math.exp(-state.k * (n * Math.PI) ** 2 * state.time) * Math.sin(n * Math.PI * x);
      }
      ctx.lineTo(PX(x), base - s * scale * 0.8);
    }
    ctx.stroke();

    let err = 0;
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      let s = 0;
      for (let n = 1; n <= state.N; n++) s += b[n - 1] * Math.sin(n * Math.PI * x);
      err = Math.max(err, Math.abs(shapes[state.shape].f(x) - s));
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `N=${state.N}  b1=${fmtFixed(b[0], 3)} b2=${fmtFixed(b[1], 3)} b3=${fmtFixed(b[2], 3)}  最大误差=${fmtFixed(err, 3)}  t=${fmtFixed(state.time, 3)}`,
      pad, 24,
    );
    ctx.font = '12px monospace';
    ctx.fillText('灰虚线＝初始形状，蓝＝N 项正弦截断，橙＝各模态按 e^(-k n²π²t) 衰减后的解', pad, H - 12);
    cap.textContent = '系数 b_n 只在 t=0 时算一次，之后每个模态带着自己的衰减率各走各的：n 大的走得快。于是尖角最先被磨平，剩下的大鼓包慢慢摊开。';
  }
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  host.appendChild(controls);
  Object.keys(shapes).forEach((k) => {
    const b = mkBtn(shapes[k].label);
    b.addEventListener('click', () => { state.shape = k; state.time = 0; draw(); });
    controls.appendChild(b);
  });
  const sl = buildSliders({
    sliders: [
      { name: 'N', min: 1, max: 12, step: 1, value: state.N },
      { name: 'k', min: 0.02, max: 0.4, step: 0.02, value: state.k },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  addAnimationControls(host, {
    onTick(dt) {
      state.time += dt * 0.25;
      draw();
    },
    onReset() { state.time = 0; draw(); },
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- Laplace / Poisson：松弛迭代求稳态 ---------- */

function renderLaplacerelax(host, spec) {
  const N = spec.N || 18;
  const state = {
    mode: spec.mode || 'laplace',
    f: spec.f != null ? spec.f : 1.2,
    iter: 0,
    omega: 1,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  let r = null;
  let grid = [];
  let fixed = [];

  function source(i, j) {
    // 中央 5×5 区域供热，其余为零；格距取 1，离散 Poisson 的源项贡献是 f/4
    if (state.mode !== 'poisson') return 0;
    return Math.abs(i - N / 2) <= 2 && Math.abs(j - N / 2) <= 2 ? state.f / 4 : 0;
  }
  function seed() {
    grid = [];
    fixed = [];
    for (let j = 0; j < N; j++) {
      grid.push([]);
      fixed.push([]);
      for (let i = 0; i < N; i++) {
        let v = 0;
        let isFixed = false;
        if (i === 0) { v = 1; isFixed = true; }          // 左边界 hot
        if (i === N - 1) { v = 0; isFixed = true; }      // 右边界 cold
        grid[j].push(v);
        fixed[j].push(isFixed);
      }
    }
    state.iter = 0;
  }
  function sweep() {
    let maxDiff = 0;
    const next = grid.map((row) => row.slice());
    for (let j = 1; j < N - 1; j++) {
      for (let i = 1; i < N - 1; i++) {
        if (fixed[j][i]) continue;
        const up = grid[j - 1][i];
        const down = j + 1 < N ? grid[j + 1][i] : grid[j][i];     // 下边界绝热
        const avg = (grid[j][i - 1] + grid[j][i + 1] + up + down) / 4;
        const target = avg + source(i, j);
        next[j][i] = grid[j][i] + state.omega * (target - grid[j][i]);
        maxDiff = Math.max(maxDiff, Math.abs(next[j][i] - grid[j][i]));
      }
    }
    for (let i = 1; i < N - 1; i++) {                             // 上下绝热：抄内侧一行
      next[0][i] = next[1][i];
      next[N - 1][i] = next[N - 2][i];
    }
    grid = next;
    state.iter += 1;
    return maxDiff;
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const side = Math.min(W - 40, H - 40);
    const ox = (W - side) / 2;
    const oy = (H - side) / 2;
    const cw = side / N;
    ctx.clearRect(0, 0, W, H);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        ctx.fillStyle = fieldColor(grid[j][i], 0, 1.5);
        ctx.fillRect(ox + i * cw, oy + j * cw, cw + 0.6, cw + 0.6);
        if (fixed[j][i] && (i === 0 || i === N - 1)) {
          ctx.strokeStyle = tc.fg;
          ctx.globalAlpha = 0.35;
          ctx.strokeRect(ox + i * cw, oy + j * cw, cw, cw);
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${state.mode === 'poisson' ? 'Poisson Δu=-f（中央有源）' : 'Laplace Δu=0（无源）'}  迭代=${state.iter}  ω=${fmtFixed(state.omega, 2)}`,
      12, 22,
    );
    cap.textContent = '左右两条边是固定温度（左 1 右 0），上下绝热。每按一次「单步」，每个内点都被替换成四邻的平均值——反复松弛，全场收敛到稳态。Poisson 模式在中央钉一块热源，看稳态如何被顶起来。';
  }
  seed();
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  host.appendChild(controls);
  const btnStep = mkBtn('单步');
  btnStep.addEventListener('click', () => { sweep(); draw(); });
  controls.appendChild(btnStep);
  const btnMode = mkBtn('切到 Poisson');
  btnMode.addEventListener('click', () => {
    state.mode = state.mode === 'laplace' ? 'poisson' : 'laplace';
    btnMode.textContent = state.mode === 'laplace' ? '切到 Poisson' : '切到 Laplace';
    seed();
    draw();
  });
  controls.appendChild(btnMode);
  const btnReset = mkBtn('重置');
  btnReset.addEventListener('click', () => { seed(); draw(); });
  controls.appendChild(btnReset);
  const sl = buildSliders({
    sliders: [
      { name: 'omega', min: 0.4, max: 1.8, step: 0.05, value: state.omega },
      { name: 'f', min: 0, max: 2.4, step: 0.1, value: state.f },
    ],
  }, (next) => { state.omega = next.omega; state.f = next.f; draw(); });
  addAnimationControls(host, {
    onTick() { sweep(); sweep(); draw(); },
    onReset() { seed(); draw(); },
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 二维热扩散：画笔涂温度，看它怎么摊开 ---------- */

function renderHeat2dpaint(host, spec) {
  const N = spec.N || 22;
  const state = {
    r: spec.r != null ? spec.r : 0.2,
    boundary: spec.boundary || 'cold',
    time: 0,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  let r = null;
  let grid = [];

  function seed() {
    grid = [];
    for (let j = 0; j < N; j++) {
      grid.push([]);
      for (let i = 0; i < N; i++) grid[j].push(0);
    }
    for (let j = N / 2 - 2; j < N / 2 + 2; j++) {
      for (let i = N / 2 - 2; i < N / 2 + 2; i++) grid[j][i] = 1;
    }
    state.time = 0;
  }
  function step() {
    const next = grid.map((row) => row.slice());
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        if (state.boundary === 'cold' && (i === 0 || j === 0 || i === N - 1 || j === N - 1)) {
          next[j][i] = 0;
          continue;
        }
        const up = grid[Math.max(0, j - 1)][i];
        const down = grid[Math.min(N - 1, j + 1)][i];
        const left = grid[j][Math.max(0, i - 1)];
        const right = grid[j][Math.min(N - 1, i + 1)];
        next[j][i] = grid[j][i] + state.r * (up + down + left + right - 4 * grid[j][i]);
      }
    }
    grid = next;
    state.time += state.r;
  }
  function heat() {
    let s = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) s += grid[j][i];
    return s;
  }
  function geom() {
    const W = r.W;
    const side = Math.min(W - 40, H - 40);
    return { side, ox: (W - side) / 2, oy: (H - side) / 2, cw: side / N };
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const tc = themeColors();
    const g = geom();
    ctx.clearRect(0, 0, r.W, H);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        ctx.fillStyle = fieldColor(grid[j][i], 0, 1);
        ctx.fillRect(g.ox + i * g.cw, g.oy + j * g.cw, g.cw + 0.6, g.cw + 0.6);
      }
    }
    ctx.strokeStyle = tc.fg;
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(g.ox, g.oy, g.side, g.side);
    ctx.globalAlpha = 1;
    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `r=${fmtFixed(state.r, 3)}${state.r > 0.25 ? '  ⚠ 超过 1/4 稳定上限，会出现棋盘震荡' : '  （稳定上限 1/4）'}  t=${fmtFixed(state.time, 3)}  总热量=${fmtFixed(heat(), 2)}`,
      12, 22,
    );
    cap.textContent = '用鼠标在网格上拖动涂热（涂到的格子被钉成 1）。按播放看热量摊开：冷墙模式下热量从边界漏走，绝热模式下总量守恒、只是摊平。把 r 推过 1/4，格子开始一格高一格低地闪烁——这就是二维显式格式的稳定线。';
  }
  seed();
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      const g = geom();
      const i = Math.floor((x - g.ox) / g.cw);
      const j = Math.floor((y - g.oy) / g.cw);
      return (i >= 0 && i < N && j >= 0 && j < N) ? 'paint' : null;
    },
    move(id, x, y) {
      void id;
      const g = geom();
      const i = clamp(Math.floor((x - g.ox) / g.cw), 0, N - 1);
      const j = clamp(Math.floor((y - g.oy) / g.cw), 0, N - 1);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const jj = clamp(j + dj, 0, N - 1);
          const ii = clamp(i + di, 0, N - 1);
          grid[jj][ii] = 1;
        }
      }
      draw();
    },
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  host.appendChild(controls);
  const btnB = mkBtn('边界：冷墙');
  btnB.addEventListener('click', () => {
    state.boundary = state.boundary === 'cold' ? 'insulated' : 'cold';
    btnB.textContent = state.boundary === 'cold' ? '边界：冷墙' : '边界：绝热';
    draw();
  });
  controls.appendChild(btnB);
  const btnClear = mkBtn('清空重涂');
  btnClear.addEventListener('click', () => {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) grid[j][i] = 0;
    state.time = 0;
    draw();
  });
  controls.appendChild(btnClear);
  const sl = buildSliders({
    sliders: [{ name: 'r', min: 0.05, max: 0.32, step: 0.01, value: state.r }],
  }, (next) => { state.r = next.r; draw(); });
  addAnimationControls(host, {
    onTick() { step(); draw(); },
    onReset() { seed(); draw(); },
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- PDE 分类与方法地图 ---------- */

function renderPdeclassifier(host, spec) {
  const state = {
    a: spec.a != null ? spec.a : 1,
    b: spec.b != null ? spec.b : 0,
    c: spec.c != null ? spec.c : -1,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 330;
  const pad = 44;
  let r = null;

  function disc() {
    return state.b * state.b - 4 * state.a * state.c;
  }
  function kind() {
    const d = disc();
    if (d > 0.05) return { name: '双曲型', eq: '波动方程 u_tt = c²u_xx', color: '#e11d48', story: '信息沿两条特征线以有限速度跑，初值一路带到未来' };
    if (d < -0.05) return { name: '椭圆型', eq: 'Laplace / Poisson Δu = f', color: '#2563eb', story: '没有时间方向，全场互相牵制，边界一举定生死' };
    return { name: '抛物型', eq: '热方程 u_t = k u_xx', color: '#e8871e', story: '一条特征线退化，时间只朝一个方向走，不可倒带' };
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const lim = 2;
    ctx.clearRect(0, 0, W, H);
    const PX = (a) => pad + ((a + lim) / (2 * lim)) * (W - pad * 2);
    const PY = (c) => pad + (1 - (c + lim) / (2 * lim)) * (H - pad * 2);
    ctx.strokeStyle = tc.axis;
    line(ctx, pad, PY(0), W - pad, PY(0));
    line(ctx, PX(0), pad, PX(0), H - pad);

    // disc = 0 的分界曲线 c = b²/(4a)
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    for (const sign of [1, -1]) {
      ctx.beginPath();
      let started = false;
      for (let i = 1; i <= 400; i++) {
        const a = sign * (lim * i) / 400;
        const c = (state.b * state.b) / (4 * a);
        if (Math.abs(c) > lim * 1.6) { started = false; continue; }
        const p = { x: PX(clamp(a, -lim, lim)), y: PY(clamp(c, -lim, lim)) };
        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const k = kind();
    ctx.fillStyle = k.color;
    ctx.beginPath();
    ctx.arc(PX(clamp(state.a, -lim, lim)), PY(clamp(state.c, -lim, lim)), 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = tc.fg;
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`a=${fmtFixed(state.a, 2)}  b=${fmtFixed(state.b, 2)}  c=${fmtFixed(state.c, 2)}  →  b²-4ac=${fmtFixed(disc(), 3)}`, pad, 24);
    ctx.fillStyle = k.color;
    ctx.font = '700 16px monospace';
    ctx.fillText(`${k.name}：${k.eq}`, pad, 46);
    ctx.fillStyle = tc.fg;
    ctx.font = '12px monospace';
    ctx.fillText(k.story, pad, H - 26);
    if (disc() > 0.05 && Math.abs(state.a) > 1e-6) {
      const s = Math.sqrt(disc());
      const m1 = (state.b + s) / (2 * state.a);
      const m2 = (state.b - s) / (2 * state.a);
      ctx.fillText(`两条特征线斜率 dt/dx：${fmtFixed(m1, 3)} 与 ${fmtFixed(m2, 3)}`, pad, H - 10);
    }
    cap.textContent = '紫色虚线是 b²-4ac=0 的分界。点落在它两侧就是双曲（波动）与椭圆（稳态），正好压在线上就是抛物（扩散）。三个按钮一键跳到三类代表方程，看同一个判别式怎么把三种物理分成三家。';
  }
  r = setupCanvas(wrap, H);
  r.redraw = draw;
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  host.appendChild(controls);
  [['波动方程', { a: 1, b: 0, c: -1 }], ['热方程', { a: 1, b: 0, c: 0 }], ['Laplace 方程', { a: 1, b: 0, c: 1 }]].forEach(([label, v]) => {
    const b = mkBtn(label);
    b.addEventListener('click', () => { Object.assign(state, v); draw(); });
    controls.appendChild(b);
  });
  const sl = buildSliders({
    sliders: [
      { name: 'a', min: -2, max: 2, step: 0.1, value: state.a },
      { name: 'b', min: -3, max: 3, step: 0.1, value: state.b },
      { name: 'c', min: -2, max: 2, step: 0.1, value: state.c },
    ],
  }, (next) => { Object.assign(state, next); draw(); });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 收益矩阵：零和博弈的保底与封顶 ---------- */

function renderPayoffmatrix(host, spec) {
  const mode = spec.mode || 'zero-sum';
  const rowNames = spec.rowNames || ['行一', '行二'];
  const colNames = spec.colNames || ['列一', '列二', '列三'];
  const initial = spec.payoff || spec.rowPayoff || [[4, 1, 6], [2, 3, 5]];
  const state = {
    M: initial.map((r) => r.slice()),
    sel: { j: 0, i: 0 },
    show: 'both',
  };
  const rows = state.M.length;
  const cols = state.M[0].length;
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 350;
  const pad = 14;
  const nameW = 74;
  const headH = 30;
  let r = null;
  let geo = {};

  function floors() {
    return state.M.map((row) => Math.min(...row));
  }
  function ceilings() {
    const out = [];
    for (let i = 0; i < cols; i++) {
      let mx = -Infinity;
      for (let j = 0; j < rows; j++) mx = Math.max(mx, state.M[j][i]);
      out.push(mx);
    }
    return out;
  }
  function cellRect(j, i) {
    const g = geo;
    return { x: g.x0 + i * g.cw, y: g.y0 + j * g.ch, w: g.cw, h: g.ch };
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const fl = floors();
    const ce = ceilings();
    const maxi = Math.max(...fl);
    const mini = Math.min(...ce);
    const saddle = maxi === mini;
    ctx.clearRect(0, 0, W, H);
    const x0 = pad + nameW;
    const y0 = pad + headH;
    const cw = (W - pad * 2 - nameW - 62) / cols;
    const ch = (H - pad * 2 - headH - 34) / rows;
    geo = { x0, y0, cw, ch };

    ctx.font = '600 12px monospace';
    ctx.fillStyle = tc.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < cols; i++) ctx.fillText(colNames[i] || ('列' + (i + 1)), x0 + (i + 0.5) * cw, y0 - 14);
    ctx.textAlign = 'left';
    for (let j = 0; j < rows; j++) ctx.fillText(rowNames[j] || ('行' + (j + 1)), pad, y0 + (j + 0.5) * ch);

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const c = cellRect(j, i);
        const v = state.M[j][i];
        ctx.fillStyle = fieldColor(v, -6, 6);
        ctx.globalAlpha = 0.28;
        ctx.fillRect(c.x, c.y, c.w - 3, c.h - 3);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = (state.sel.j === j && state.sel.i === i) ? '#7c3aed' : tc.axis;
        ctx.lineWidth = state.sel.j === j && state.sel.i === i ? 3 : 1;
        ctx.strokeRect(c.x, c.y, c.w - 3, c.h - 3);
        if (saddle && v === maxi) {
          ctx.strokeStyle = '#e8871e';
          ctx.lineWidth = 3;
          ctx.strokeRect(c.x + 2, c.y + 2, c.w - 7, c.h - 7);
        }
        ctx.fillStyle = tc.fg;
        ctx.font = '600 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(v), c.x + (c.w - 3) / 2, c.y + (c.h - 3) / 2);
      }
    }

    // 右侧保底列（每行最小值）
    ctx.textAlign = 'center';
    ctx.font = '600 11px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText('保底', x0 + cols * cw + 31, y0 - 14);
    for (let j = 0; j < rows; j++) {
      const c = { x: x0 + cols * cw + 8, y: y0 + j * ch, w: 46, h: ch - 3 };
      ctx.strokeStyle = fl[j] === maxi ? '#e11d48' : tc.axis;
      ctx.lineWidth = fl[j] === maxi ? 2.5 : 1;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = fl[j] === maxi ? '#e11d48' : tc.fg;
      ctx.font = '600 14px monospace';
      ctx.fillText(String(fl[j]), c.x + c.w / 2, c.y + c.h / 2);
    }

    // 底部封顶行（每列最大值）
    ctx.textAlign = 'left';
    ctx.font = '600 11px monospace';
    ctx.fillStyle = tc.fg;
    ctx.fillText('封顶', pad, y0 + rows * ch + 16);
    for (let i = 0; i < cols; i++) {
      const c = { x: x0 + i * cw, y: y0 + rows * ch + 4, w: cw - 3, h: 28 };
      ctx.strokeStyle = ce[i] === mini ? '#2563eb' : tc.axis;
      ctx.lineWidth = ce[i] === mini ? 2.5 : 1;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = ce[i] === mini ? '#2563eb' : tc.fg;
      ctx.font = '600 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(ce[i]), c.x + c.w / 2, c.y + c.h / 2);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = tc.fg;
    ctx.font = '600 12px monospace';
    ctx.fillText(
      `保底=${JSON.stringify(fl)} → maximin=${maxi}    封顶=${JSON.stringify(ce)} → minimax=${mini}    ${saddle ? '✔ 有鞍点：安全做法就是最优做法' : '✘ 无鞍点（maximin < minimax）：必须随机化'}`,
      pad, H - 6,
    );
    cap.textContent = mode === 'zero-sum'
      ? '点一个格子选中它，再用滑块改数字：亲手把鞍点造出来，再亲手把它拆掉。红色是各行保底里的最大值（行的安全牌），蓝色是各列封顶里的最小值（列的止损牌）；两者撞在同一个格子上就是鞍点。'
      : '每格上行是行玩家收益、下行是列玩家收益。悬停或点选某格，箭头会指出双方的最佳响应。';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const c = cellRect(j, i);
          if (x >= c.x && x <= c.x + c.w - 3 && y >= c.y && y <= c.y + c.h - 3) return j * cols + i;
        }
      }
      return null;
    },
    move(id, x, y) {
      void x;
      void y;
      state.sel = { j: Math.floor(id / cols), i: id % cols };
      draw();
    },
  });
  const btnReset = mkBtn('恢复初始矩阵');
  btnReset.addEventListener('click', () => {
    state.M = initial.map((row) => row.slice());
    draw();
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  controls.appendChild(btnReset);
  host.appendChild(controls);
  const sl = buildSliders({
    sliders: [{ name: 'value', min: -6, max: 9, step: 1, value: state.M[0][0] }],
  }, (next) => {
    state.M[state.sel.j][state.sel.i] = next.value;
    draw();
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 坐标变换：六滑块揉捏一个模型 ---------- */

function renderCoordinatetransform(host, spec) {
  const models = {
    house: [[0, 0], [4, 0], [4, 3], [2.6, 3], [2.6, 4.6], [0, 3]],
    triangle: [[-2, -2], [2, -2], [0, 3]],
    'letter-f': [[-1, -3], [-1, 3], [2, 3], [2, 1.8], [0.2, 1.8], [0.2, 0.6], [1.6, 0.6], [1.6, -0.6], [0.2, -0.6], [0.2, -3]],
  };
  const key = spec.model && models[spec.model] ? spec.model : 'house';
  const pts = models[key];
  const state = {
    m: [1, 0, 0, 1, 0, 0].map((v, i) => (Array.isArray(spec.matrix) && spec.matrix[i] != null ? spec.matrix[i] : v)),
    ghosts: [],
    showBasis: true,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 360;
  let r = null;
  let geo = {};

  function apply(m, p) {
    return [m[0] * p[0] + m[1] * p[1] + m[4], m[2] * p[0] + m[3] * p[1] + m[5]];
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const lim = 8;
    const pad = 16;
    const side = Math.min(W - pad * 2, H - pad * 2 - 44);
    const ox = pad + (W - pad * 2 - side) / 2;
    const oy = pad;
    geo = { ox, oy, side, lim };
    const X = (x) => ox + ((x + lim) / (2 * lim)) * side;
    const Y = (y) => oy + ((lim - y) / (2 * lim)) * side;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = tc.axis;
    ctx.globalAlpha = 0.35;
    for (let g = -lim; g <= lim; g++) {
      line(ctx, X(g), Y(-lim), X(g), Y(lim));
      line(ctx, X(-lim), Y(g), X(lim), Y(g));
    }
    ctx.globalAlpha = 1;
    line(ctx, X(-lim), Y(0), X(lim), Y(0));
    line(ctx, X(0), Y(-lim), X(0), Y(lim));

    const trace = (m) => pts.map((p) => apply(m, p)).map((p) => ({ x: X(p[0]), y: Y(p[1]) }));
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    trace([1, 0, 0, 1, 0, 0]).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    state.ghosts.forEach((m) => {
      ctx.strokeStyle = '#e8871e';
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      trace(m).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    const cur = trace(state.m);
    ctx.fillStyle = 'rgba(124, 58, 237, 0.18)';
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    cur.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (state.showBasis) {
      const o = apply(state.m, [0, 0]);
      const iv = apply(state.m, [1, 0]);
      const jv = apply(state.m, [0, 1]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#e11d48';
      line(ctx, X(o[0]), Y(o[1]), X(iv[0]), Y(iv[1]));
      ctx.strokeStyle = '#2563eb';
      line(ctx, X(o[0]), Y(o[1]), X(jv[0]), Y(jv[1]));
    }

    ctx.fillStyle = tc.fg;
    ctx.font = '600 12px monospace';
    ctx.textAlign = 'left';
    const m = state.m;
    ctx.fillText(`矩阵 [${m.slice(0, 4).map((v) => fmtFixed(v, 2)).join(' ')} | 平移 (${fmtFixed(m[4], 1)}, ${fmtFixed(m[5], 1)})]`, pad, H - 26);
    ctx.font = '11px monospace';
    ctx.fillText('灰虚线＝原模型，橙＝最近三步残影，紫＝当前变换结果；红/蓝箭头是被矩阵掰弯的基向量 i / j', pad, H - 8);
    cap.textContent = '拖动六个滑块，紫色模型与基向量箭头跟着变形：a、d 拉伸，b、c 剪切，四个一起能旋转，tx、ty 平移。预设按钮一键跳到典型变换，橙色残影记录你上一步的位置。';
  }
  r = setupCanvas(wrap, H);
  r.redraw = draw;

  const sl = buildSliders({
    sliders: [
      { name: 'a', min: -2, max: 2, step: 0.05, value: state.m[0] },
      { name: 'b', min: -2, max: 2, step: 0.05, value: state.m[1] },
      { name: 'c', min: -2, max: 2, step: 0.05, value: state.m[2] },
      { name: 'd', min: -2, max: 2, step: 0.05, value: state.m[3] },
      { name: 'tx', min: -6, max: 6, step: 0.1, value: state.m[4] },
      { name: 'ty', min: -6, max: 6, step: 0.1, value: state.m[5] },
    ],
  }, (next) => {
    state.m = [next.a, next.b, next.c, next.d, next.tx, next.ty];
    draw();
  });

  function syncSliders() {
    ['a', 'b', 'c', 'd', 'tx', 'ty'].forEach((k, i) => {
      sl.refs[k].range.value = String(state.m[i]);
      sl.refs[k].val.textContent = fmtFixed(state.m[i], 2);
      sl.state[k] = state.m[i];
    });
  }
  function setMatrix(target) {
    state.ghosts.push(state.m.slice());
    if (state.ghosts.length > 3) state.ghosts.shift();
    state.m = target.slice();
    syncSliders();
    draw();
  }
  const controls = document.createElement('div');
  controls.className = 'ml-viz__controls';
  [['平移', [1, 0, 0, 1, 3, 2]], ['缩放', [1.5, 0, 0, 0.6, 0, 0]], ['旋转 90°', [0, -1, 1, 0, 0, 0]], ['剪切', [1, 1, 0, 1, 0, 0]], ['重置', [1, 0, 0, 1, 0, 0]]].forEach(([label, m]) => {
    const b = mkBtn(label);
    b.addEventListener('click', () => setMatrix(m));
    controls.appendChild(b);
  });
  host.appendChild(controls);
  draw();
  return { slidersBox: sl.box };
}

/* ---------- 样条编辑器：拖控制点，看 de Casteljau 骨架 ---------- */

function renderSplineeditor(host, spec) {
  const state = {
    pts: Array.isArray(spec.controlPoints) && spec.controlPoints.length >= 2
      ? spec.controlPoints.map((p) => p.slice())
      : [[0, 0], [0, 2], [2, 2], [2, 0]],
    t: spec.t != null ? spec.t : 0.5,
    showSkeleton: spec.showSkeleton !== false,
  };
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  let r = null;
  let geo = {};
  const layerColors = ['#94a3b8', '#2563eb', '#e8871e', '#7c3aed'];

  function deCasteljau(points, t) {
    const layers = [points.map((p) => p.slice())];
    let cur = layers[0];
    while (cur.length > 1) {
      const next = [];
      for (let i = 0; i < cur.length - 1; i++) {
        next.push([
          cur[i][0] + (cur[i + 1][0] - cur[i][0]) * t,
          cur[i][1] + (cur[i + 1][1] - cur[i][1]) * t,
        ]);
      }
      layers.push(next);
      cur = next;
    }
    return layers;
  }
  function curvePoint(points, t) {
    const layers = deCasteljau(points, t);
    return layers[layers.length - 1][0];
  }
  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    const lim = 3;
    const pad = 16;
    const side = Math.min(W - pad * 2, H - pad * 2 - 40);
    const ox = pad + (W - pad * 2 - side) / 2;
    const oy = pad;
    geo = { ox, oy, side, lim };
    const X = (x) => ox + ((x + lim) / (2 * lim)) * side;
    const Y = (y) => oy + ((lim - y) / (2 * lim)) * side;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = tc.axis;
    ctx.globalAlpha = 0.3;
    for (let g = -lim; g <= lim; g++) {
      line(ctx, X(g), Y(-lim), X(g), Y(lim));
      line(ctx, X(-lim), Y(g), X(lim), Y(g));
    }
    ctx.globalAlpha = 1;
    line(ctx, X(-lim), Y(0), X(lim), Y(0));
    line(ctx, X(0), Y(-lim), X(0), Y(lim));

    // 整条曲线（淡）+ 已走部分（粗）
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const p = curvePoint(state.pts, i / 120);
      ctx.lineTo(X(p[0]), Y(p[1]));
    }
    ctx.stroke();
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= Math.max(1, Math.round(120 * state.t)); i++) {
      const p = curvePoint(state.pts, (i / 120) * state.t);
      ctx.lineTo(X(p[0]), Y(p[1]));
    }
    ctx.stroke();

    // 控制多边形与控制点
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    state.pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
    ctx.stroke();
    ctx.setLineDash([]);
    state.pts.forEach((p, i) => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.fillRect(X(p[0]) - 5, Y(p[1]) - 5, 10, 10);
      ctx.strokeRect(X(p[0]) - 5, Y(p[1]) - 5, 10, 10);
      ctx.fillStyle = tc.fg;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('P' + i, X(p[0]) + 8, Y(p[1]) - 6);
    });

    // de Casteljau 骨架
    if (state.showSkeleton) {
      const layers = deCasteljau(state.pts, state.t);
      for (let L = 1; L < layers.length; L++) {
        ctx.strokeStyle = layerColors[(L - 1) % layerColors.length];
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        layers[L - 1].forEach((p, i) => {
          if (i < layers[L].length) {
            ctx.moveTo(X(p[0]), Y(p[1]));
            ctx.lineTo(X(layers[L][i][0]), Y(layers[L][i][1]));
          }
        });
        ctx.stroke();
        layers[L].forEach((p) => {
          ctx.fillStyle = layerColors[(L - 1) % layerColors.length];
          ctx.beginPath();
          ctx.arc(X(p[0]), Y(p[1]), 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
    ctx.fillStyle = tc.fg;
    ctx.font = '600 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`t=${fmtFixed(state.t, 3)}  控制点 ${state.pts.length} 个`, pad, H - 20);
    cap.textContent = '拖动方块改控制点，曲线即时变形；橙色粗线是 t 扫过时曲线"画到哪了"。彩色杆件是 de Casteljau 的逐层取点：每层都把上一层的相邻两点按 t 分成 t:(1-t)，最后一层剩下的那个点就在曲线上。';
  }
  r = setupCanvas(wrap, H);
  r.canvas.classList.add('ml-drag');
  r.redraw = draw;
  bindPointer(r.canvas, {
    pick(x, y) {
      for (let i = 0; i < state.pts.length; i++) {
        if (Math.hypot(x - X(state.pts[i][0]), y - Y(state.pts[i][1])) < 14) return i;
      }
      return null;
    },
    move(id, x, y) {
      const g = geo;
      state.pts[id] = [
        clamp((x - g.ox) / g.side * 2 * g.lim - g.lim, -g.lim, g.lim),
        clamp(g.lim - (y - g.oy) / g.side * 2 * g.lim, -g.lim, g.lim),
      ];
      draw();
    },
  });
  function X(x) { return geo.ox + ((x + geo.lim) / (2 * geo.lim)) * geo.side; }
  function Y(y) { return geo.oy + ((geo.lim - y) / (2 * geo.lim)) * geo.side; }
  const sl = buildSliders({
    sliders: [{ name: 't', min: 0, max: 1, step: 0.001, value: state.t }],
  }, (next) => { state.t = next.t; draw(); });
  addAnimationControls(host, {
    onTick(dt) {
      state.t = (state.t + dt * 0.25) % 1;
      sl.refs.t.range.value = String(state.t);
      sl.refs.t.val.textContent = fmtFixed(state.t, 3);
      sl.state.t = state.t;
      draw();
    },
    onReset() { state.t = 0; draw(); },
  });
  draw();
  return { slidersBox: sl.box };
}

/* ---------- moe-router：MoE 路由分诊台 ----------
   契约：{ type, title, logits:[…], names:[…], k }
   logits/names 长度可变（2~6）。内置滑块 t（温度）与 k（激活专家数）。 */
function renderMoeRouter(box, spec) {
  const C = themeColors();
  const logits = Array.isArray(spec.logits) && spec.logits.length >= 2
    ? spec.logits.slice(0, 6).map(Number)
    : [3.0, 0.9, 0.1, 2.0];
  const names = Array.isArray(spec.names) && spec.names.length === logits.length
    ? spec.names.slice()
    : logits.map((_, i) => '专家' + (i + 1));
  const E = logits.length;
  const kInit = clamp(Number(spec.k) || 2, 1, E);
  const info = document.createElement('div');
  info.className = 'ml-viz__readout';
  const canvasHost = document.createElement('div');
  box.appendChild(canvasHost);
  box.appendChild(info);
  const sl = buildSliders({
    sliders: [
      { name: 't', min: 0.25, max: 3, step: 0.05, value: 1 },
      { name: 'k', min: 1, max: E, step: 1, value: kInit },
    ],
  }, () => draw());
  box.appendChild(sl.box);

  const holder = setupCanvas(canvasHost, 210, null);
  function softmax(xs, t) {
    const m = Math.max.apply(null, xs);
    const ex = xs.map((v) => Math.exp((v - m) / t));
    const s = ex.reduce((a, b) => a + b, 0);
    return ex.map((v) => v / s);
  }
  function draw() {
    const t = Math.max(0.05, sl.state.t);
    const k = clamp(Math.round(sl.state.k), 1, E);
    const probs = softmax(logits, t);
    const order = logits.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    const chosen = order.slice(0, k).map((p) => p[1]);
    const chosenSet = new Set(chosen);
    const sub = chosen.map((i) => probs[i]);
    const subSum = sub.reduce((a, b) => a + b, 0);
    const gates = chosen.map((i) => ({ i, g: probs[i] / subSum }));
    const lost = 1 - subSum;
    const topGate = gates.reduce((a, b) => (b.g > a ? b.g : a), 0);

    const ctx = holder.ctx;
    const W = holder.W;
    const H = holder.H;
    ctx.clearRect(0, 0, W, H);
    const pad = 34;
    const bw = (W - pad - 12) / E;
    const maxLogit = Math.max.apply(null, logits.map(Math.abs)) || 1;
    /* 上半：原始分 */
    ctx.font = '11px sans-serif';
    ctx.fillStyle = C.fg;
    ctx.fillText('路由原始分', pad, 12);
    logits.forEach((v, i) => {
      const h = (Math.abs(v) / maxLogit) * 52;
      const x = pad + i * bw + bw * 0.18;
      ctx.fillStyle = chosenSet.has(i) ? C.accent : C.grid;
      ctx.fillRect(x, 74 - h, bw * 0.64, h);
      ctx.fillStyle = C.fg;
      ctx.textAlign = 'center';
      ctx.fillText(names[i], x + bw * 0.32, H - 6);
      ctx.fillText(v.toFixed(1), x + bw * 0.32, 74 - h - 3);
    });
    /* 下半：softmax 概率 + 门控权重 */
    ctx.textAlign = 'left';
    ctx.fillStyle = C.fg;
    ctx.fillText('softmax 概率（t=' + t.toFixed(2) + '，top-' + k + ' 高亮）', pad, 92);
    const base = 158;
    probs.forEach((p, i) => {
      const h = p * 56;
      const x = pad + i * bw + bw * 0.18;
      ctx.fillStyle = chosenSet.has(i) ? C.accent : C.grid;
      ctx.fillRect(x, base - h, bw * 0.64, h);
      ctx.fillStyle = C.fg;
      ctx.textAlign = 'center';
      ctx.fillText((p * 100).toFixed(0) + '%', x + bw * 0.32, base - h - 3);
      if (chosenSet.has(i)) {
        const g = gates.find((q) => q.i === i).g;
        ctx.fillStyle = C.accent2;
        ctx.fillText('g=' + g.toFixed(2), x + bw * 0.32, base + 12);
      }
    });
    ctx.textAlign = 'left';
    info.textContent = '落选票权合计 ' + (lost * 100).toFixed(1) + '%　·　最大接诊占比 '
      + (topGate * 100).toFixed(1) + '%（越接近 100% 越失衡）';
    void ctx.textAlign;
  }
  holder.redraw = draw;
  draw();
  return { slidersBox: sl.box };
}

/* ---------- conv2d-slide：2D 卷积滑窗 ----------
   契约：{ type, title, size, pattern:'vline'|'hline'|'diag'|'corner', ksize } */
function renderConv2dSlide(box, spec) {
  const C = themeColors();
  const size = clamp(Number(spec.size) || 5, 4, 8);
  const ksize = clamp(Number(spec.ksize) || 3, 2, size - 1);
  let pattern = ['vline', 'hline', 'diag', 'corner'].includes(spec.pattern) ? spec.pattern : 'vline';
  const img = [];
  for (let r = 0; r < size; r++) {
    img.push(new Array(size).fill(0));
  }
  const mid = Math.floor(size / 2);
  function buildImg() {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (pattern === 'vline') img[r][c] = c === mid ? 1 : 0;
        else if (pattern === 'hline') img[r][c] = r === mid ? 1 : 0;
        else if (pattern === 'diag') img[r][c] = r === c ? 1 : 0;
        else img[r][c] = (r < mid && c < mid) ? 1 : 0;
      }
    }
  }
  buildImg();
  const kernel = [];
  for (let u = 0; u < ksize; u++) {
    kernel.push(new Array(ksize).fill(0));
    for (let v = 0; v < ksize; v++) kernel[u][v] = (v === ksize - 1 ? 1 : v === 0 ? -1 : 0);
  }
  let padded = false;
  let stride = 1;
  const info = document.createElement('div');
  info.className = 'ml-viz__readout';
  const canvasHost = document.createElement('div');
  box.appendChild(canvasHost);
  const ctrl = document.createElement('div');
  ctrl.className = 'ml-viz__controls';
  box.appendChild(ctrl);
  box.appendChild(info);
  let rowMax = 0;
  let colMax = 0;
  const sl = buildSliders({ sliders: [
    { name: 'row', min: 0, max: 0, step: 1, value: 0 },
    { name: 'col', min: 0, max: 0, step: 1, value: 0 },
  ] }, () => draw());
  box.appendChild(sl.box);
  const padBtn = mkBtn('padding：关');
  const strBtn = mkBtn('stride：1');
  padBtn.addEventListener('click', () => { padded = !padded; padBtn.textContent = 'padding：' + (padded ? '开' : '关'); rebuild(); });
  strBtn.addEventListener('click', () => { stride = stride === 1 ? 2 : 1; strBtn.textContent = 'stride：' + stride; rebuild(); });
  ctrl.append(padBtn, strBtn);
  const PATTERNS = [['vline', '图案：竖线'], ['hline', '图案：横线'], ['diag', '图案：对角'], ['corner', '图案：左上块']];
  const patBtns = PATTERNS.map(([name, label]) => {
    const b = mkBtn(label);
    b.addEventListener('click', () => {
      pattern = name;
      buildImg();
      syncPatBtns();
      draw();
    });
    ctrl.appendChild(b);
    return b;
  });
  function syncPatBtns() {
    patBtns.forEach((b, i) => {
      const on = PATTERNS[i][0] === pattern;
      b.style.fontWeight = on ? '700' : '400';
      b.style.textDecoration = on ? 'underline' : 'none';
    });
  }
  syncPatBtns();
  const holder = setupCanvas(canvasHost, 240, null);

  function effSize() { return size + (padded ? 2 : 0); }
  function at(r, c) {
    if (!padded) return img[r] ? img[r][c] : 0;
    const rr = r - 1;
    const cc = c - 1;
    return (rr >= 0 && rr < size && cc >= 0 && cc < size) ? img[rr][cc] : 0;
  }
  function rebuild() {
    rowMax = Math.max(0, Math.floor((effSize() - ksize) / stride));
    colMax = rowMax;
    sl.refs.row.range.max = String(rowMax);
    sl.refs.row.range.step = String(stride);
    sl.refs.col.range.max = String(colMax);
    sl.refs.col.range.step = String(stride);
    if (Number(sl.refs.row.range.value) > rowMax) { sl.state.row = rowMax; sl.refs.row.range.value = String(rowMax); }
    if (Number(sl.refs.col.range.value) > colMax) { sl.state.col = colMax; sl.refs.col.range.value = String(colMax); }
    sl.refs.row.val.textContent = sl.refs.row.range.value;
    sl.refs.col.val.textContent = sl.refs.col.range.value;
    draw();
  }
  function convolve() {
    const outN = rowMax + 1;
    const out = [];
    for (let i = 0; i < outN; i++) {
      out.push(new Array(outN).fill(0));
      for (let j = 0; j < outN; j++) {
        let acc = 0;
        for (let u = 0; u < ksize; u++) {
          for (let v = 0; v < ksize; v++) acc += kernel[u][v] * at(i * stride + u, j * stride + v);
        }
        out[i][j] = acc;
      }
    }
    return out;
  }
  function draw() {
    const out = convolve();
    const ctx = holder.ctx;
    const W = holder.W;
    const H = holder.H;
    ctx.clearRect(0, 0, W, H);
    const cs = Math.min(22, Math.floor((W - 60) / Math.max(size + 2, out.length)));
    const gap = 26;
    const ox1 = 8;
    const oy1 = 26;
    const ox2 = ox1 + effSize() * cs + gap;
    /* 窗口位置（先取出来：输入图要给窗口盖住的格子叠高亮） */
    const rr = Math.round(Number(sl.refs.row.range.value));
    const cc = Math.round(Number(sl.refs.col.range.value));
    sl.state.row = rr;
    sl.state.col = cc;
    sl.refs.row.val.textContent = String(rr);
    sl.refs.col.val.textContent = String(cc);
    /* 输入图 */
    ctx.font = '11px sans-serif';
    ctx.fillStyle = C.fg;
    ctx.fillText(padded ? '输入（padding 开，外圈补 0）' : '输入', ox1, 16);
    for (let r = 0; r < effSize(); r++) {
      for (let c = 0; c < effSize(); c++) {
        const v = at(r, c);
        const inWin = r >= rr * stride && r < rr * stride + ksize && c >= cc * stride && c < cc * stride + ksize;
        ctx.fillStyle = v ? C.accent : C.bg;
        ctx.fillRect(ox1 + c * cs, oy1 + r * cs, cs - 1, cs - 1);
        if (inWin) { ctx.fillStyle = 'rgba(232,135,30,0.30)'; ctx.fillRect(ox1 + c * cs, oy1 + r * cs, cs - 1, cs - 1); }
        if (v) { ctx.fillStyle = C.bg; ctx.textAlign = 'center'; ctx.fillText('1', ox1 + c * cs + cs / 2 - 1, oy1 + r * cs + cs / 2 + 4); }
      }
    }
    /* 窗口框 */
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2;
    ctx.strokeRect(ox1 + cc * stride * cs + 0.5, oy1 + rr * stride * cs + 0.5, ksize * cs - 1, ksize * cs - 1);
    /* 特征图 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.fillStyle = C.fg;
    ctx.textAlign = 'left';
    ctx.fillText('特征图（' + out.length + '×' + out.length + '）', ox2, 16);
    const hiR = rr / stride;
    const hiC = cc / stride;
    for (let i = 0; i < out.length; i++) {
      for (let j = 0; j < out.length; j++) {
        const v = out[i][j];
        const x = ox2 + j * cs;
        const y = oy1 + i * cs;
        ctx.fillStyle = v > 0 ? C.accent : v < 0 ? C.accent2 : C.bg;
        ctx.fillRect(x, y, cs - 1, cs - 1);
        ctx.fillStyle = v ? C.bg : C.fg;
        ctx.textAlign = 'center';
        ctx.fillText(String(v), x + cs / 2 - 1, y + cs / 2 + 4);
        if (i === hiR && j === hiC) {
          ctx.strokeStyle = C.accent2;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 0.5, y + 0.5, cs - 2, cs - 2);
          ctx.lineWidth = 1;
        }
      }
    }
    /* 参数账单 */
    ctx.textAlign = 'left';
    ctx.fillStyle = C.fg;
    const billY = oy1 + effSize() * cs + 18;
    const fc = size * size * 1000;
    const cv = ksize * ksize * 1 * 1000 + 1000;
    ctx.fillText('参数账单：全连接 ' + fc.toLocaleString() + '　vs　卷积 ' + cv.toLocaleString()
      + '　·　O = ⌊(' + size + '+2·' + (padded ? 1 : 0) + '−' + ksize + ')/' + stride + '⌋+1 = ' + out.length, 8, billY);
    const rows = [];
    for (let u = 0; u < ksize; u++) {
      const items = [];
      for (let v = 0; v < ksize; v++) {
        const a = at(rr * stride + u, cc * stride + v);
        const w = kernel[u][v];
        items.push(a + '×' + (w < 0 ? '(' + w + ')' : w) + '=' + (a * w));
      }
      rows.push('第' + (u + 1) + '行　' + items.join('　'));
    }
    const winSum = (out[hiR] && out[hiR][hiC] !== undefined) ? out[hiR][hiC] : 0;
    info.innerHTML = '窗口左上角 (row=' + rr + ', col=' + cc + ')，步长 ' + stride
      + '；盖住的 ' + (ksize * ksize) + ' 格乘积（输入×权重）：<br>'
      + rows.join('<br>')
      + '<br><b>加权和 = ' + winSum + '</b>（橙色高亮格即本窗口）。';
  }
  holder.redraw = draw;
  rebuild();
  return { slidersBox: sl.box };
}

/* ---------- markov-chain-lab：马尔可夫链分布演化 ----------
   契约：{ type, title, labels:[…], matrix:[[…]], steps }，支持 2~4 状态 */
function renderMarkovChainLab(box, spec) {
  const C = themeColors();
  let M = Array.isArray(spec.matrix) ? spec.matrix.map((r) => r.map(Number)) : [[0.9, 0.1], [0.5, 0.5]];
  const N = M.length;
  const labels = Array.isArray(spec.labels) && spec.labels.length === N
    ? spec.labels.slice()
    : M.map((_, i) => '状态' + (i + 1));
  /* 行和不为 1 时按行归一（读数提示），全零行回退为均匀分布 */
  let normalized = false;
  for (let i = 0; i < N; i++) {
    const s = M[i].reduce((a, b) => a + b, 0);
    if (s <= 0) { M[i] = new Array(N).fill(1 / N); normalized = true; }
    else if (Math.abs(s - 1) > 1e-9) { M[i] = M[i].map((v) => v / s); normalized = true; }
  }
  /* 平稳分布：π = πM 的幂迭代（从均匀分布出发，取一个特解） */
  let pi = new Array(N).fill(1 / N);
  for (let it = 0; it < 400; it++) {
    const nx = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) nx[j] += pi[i] * M[i][j];
    }
    const s = nx.reduce((a, b) => a + b, 0) || 1;
    for (let j = 0; j < N; j++) nx[j] /= s;
    pi = nx;
  }
  const stepsInit = clamp(Number(spec.steps) || 0, 0, 60);
  const info = document.createElement('div');
  info.className = 'ml-viz__readout';
  const canvasHost = document.createElement('div');
  box.appendChild(canvasHost);
  box.appendChild(info);
  const sl = buildSliders({ sliders: [{ name: 'steps', min: 0, max: 60, step: 1, value: stepsInit }] }, () => draw());
  box.appendChild(sl.box);
  const holder = setupCanvas(canvasHost, 200, null);
  function draw() {
    const steps = Math.round(sl.state.steps);
    let v = new Array(N).fill(0);
    v[0] = 1;
    for (let s = 0; s < steps; s++) {
      const nx = new Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) nx[j] += v[i] * M[i][j];
      }
      v = nx;
    }
    const ctx = holder.ctx;
    const W = holder.W;
    const H = holder.H;
    ctx.clearRect(0, 0, W, H);
    const pad = 30;
    const bw = (W - pad - 14) / N;
    const base = H - 26;
    const top = 26;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    let maxDev = 0;
    for (let i = 0; i < N; i++) {
      const h = v[i] * (base - top);
      const x = pad + i * bw + bw * 0.16;
      ctx.fillStyle = C.accent;
      ctx.fillRect(x, base - h, bw * 0.68, h);
      ctx.fillStyle = C.fg;
      ctx.fillText(labels[i], x + bw * 0.34, base + 14);
      ctx.fillText(v[i].toFixed(3), x + bw * 0.34, base - h - 4);
      const dev = Math.abs(v[i] - pi[i]);
      if (dev > maxDev) maxDev = dev;
      /* 平稳分布虚线 */
      const py = base - pi[i] * (base - top);
      ctx.strokeStyle = C.accent2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + bw * 0.68, py);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = C.fg;
    ctx.fillText('steps=' + steps + '　·　虚线 = 平稳分布（幂迭代特解）', pad, 14);
    info.textContent = '距平稳最大偏差 ' + maxDev.toFixed(4)
      + (normalized ? '　·　⚠ 矩阵有行和≠1，已按行归一' : '')
      + (steps === 0 ? '　·　steps=0 即初始分布' : '');
  }
  holder.redraw = draw;
  draw();
  return { slidersBox: sl.box };
}

/* ---------- ica-rotate：白化后旋转分离 ----------
   契约：{ type, title, mix, n } */
function renderIcaRotate(box, spec) {
  const C = themeColors();
  const mix = clamp(Number(spec.mix) || 0.6, 0, 0.95);
  const n = clamp(Number(spec.n) || 400, 60, 1200);
  /* 两路独立源：方波 + 正弦 */
  const s1 = [];
  const s2 = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    s1.push(Math.sin(2 * Math.PI * 3 * t) >= 0 ? 1 : -1);
    s2.push(Math.sin(2 * Math.PI * 5 * t + 0.7));
  }
  const xs = [];
  const ys = [];
  for (let i = 0; i < n; i++) {
    xs.push(s1[i] + mix * s2[i]);
    ys.push(s2[i] + mix * s1[i]);
  }
  /* 2×2 协方差逆平方根（白化），再用 angle 旋转 */
  function cov(a, b) {
    const ma = a.reduce((p, q) => p + q, 0) / a.length;
    const mb = b.reduce((p, q) => p + q, 0) / b.length;
    let v = 0;
    for (let i = 0; i < a.length; i++) v += (a[i] - ma) * (b[i] - mb);
    return v / a.length;
  }
  const c11 = cov(xs, xs);
  const c12 = cov(xs, ys);
  const c22 = cov(ys, ys);
  const tr = c11 + c22;
  const det = c11 * c22 - c12 * c12;
  const disc = Math.sqrt(Math.max(1e-12, tr * tr / 4 - det));
  const l1 = tr / 2 + disc;
  const l2 = Math.max(1e-9, tr / 2 - disc);
  /* C^{-1/2} = U diag(1/√λ) U^T；2×2 特征向量解析解 */
  const theta0 = 0.5 * Math.atan2(2 * c12, c11 - c22);
  const cos0 = Math.cos(theta0);
  const sin0 = Math.sin(theta0);
  function whitened(px, py) {
    const dx = px * cos0 + py * sin0;
    const dy = -px * sin0 + py * cos0;
    const ux = dx / Math.sqrt(l1);
    const uy = dy / Math.sqrt(l2);
    return [ux * cos0 - uy * sin0, ux * sin0 + uy * cos0];
  }
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(whitened(xs[i], ys[i]));
  function kurtAt(deg) {
    const a = (deg * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const proj = pts.map((p) => p[0] * ca + p[1] * sa);
    const m = proj.reduce((p, q) => p + q, 0) / proj.length;
    let m2 = 0;
    let m4 = 0;
    for (const v of proj) {
      const d = v - m;
      m2 += d * d;
      m4 += d * d * d * d;
    }
    m2 /= proj.length;
    m4 /= proj.length;
    return m2 > 0 ? m4 / (m2 * m2) - 3 : 0;
  }
  /* 扫全角找最优 */
  let bestDeg = 0;
  let bestK = -Infinity;
  for (let d = 0; d < 180; d++) {
    const k = Math.abs(kurtAt(d));
    if (k > bestK) { bestK = k; bestDeg = d; }
  }
  const info = document.createElement('div');
  info.className = 'ml-viz__readout';
  const canvasHost = document.createElement('div');
  box.appendChild(canvasHost);
  box.appendChild(info);
  const sl = buildSliders({ sliders: [{ name: 'angle', min: 0, max: 180, step: 1, value: 0 }] }, () => draw());
  box.appendChild(sl.box);
  const holder = setupCanvas(canvasHost, 230, null);
  function draw() {
    const deg = Math.round(sl.state.steps !== undefined ? sl.state.angle : 0);
    const k = kurtAt(deg);
    const ctx = holder.ctx;
    const W = holder.W;
    const H = holder.H;
    ctx.clearRect(0, 0, W, H);
    const half = Math.min(W / 2 - 24, H - 46);
    const cx = W / 2;
    const cy = (H - 40) / 2 + 10;
    /* 坐标轴 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - half, cy);
    ctx.lineTo(cx + half, cy);
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx, cy + half);
    ctx.stroke();
    /* 散点：白化后旋转 deg */
    ctx.fillStyle = C.accent;
    const a = (deg * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    let spread = 0;
    for (const p of pts) {
      spread = Math.max(spread, Math.abs(p[0]), Math.abs(p[1]));
    }
    const scale = half / (spread || 1);
    for (const p of pts) {
      const rx = p[0] * ca - p[1] * sa;
      const ry = p[0] * sa + p[1] * ca;
      ctx.fillRect(cx + rx * scale - 1, cy - ry * scale - 1, 2, 2);
    }
    /* 探测轴 */
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - ca * half, cy - sa * half);
    ctx.lineTo(cx + ca * half, cy + sa * half);
    ctx.stroke();
    ctx.lineWidth = 1;
    /* 峰度曲线 */
    ctx.fillStyle = C.fg;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('|kurtosis| 随 angle：混合方向趴平（趋高斯），最优角竖起尖塔', 8, H - 22);
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    let peak = 0;
    for (let d = 0; d <= 180; d++) {
      const kk = Math.abs(kurtAt(d));
      if (kk > peak) peak = kk;
    }
    for (let d = 0; d <= 180; d++) {
      const x = 8 + (d / 180) * (W - 16);
      const y = H - 8 - (Math.abs(kurtAt(d)) / (peak || 1)) * 12;
      if (d === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    /* 最优角标记 */
    const bx = 8 + (bestDeg / 180) * (W - 16);
    ctx.strokeStyle = C.accent2;
    ctx.beginPath();
    ctx.moveTo(bx, H - 8);
    ctx.lineTo(bx, H - 8 - 12);
    ctx.stroke();
    info.textContent = 'angle=' + deg + '°　·　当前 |kurtosis|=' + Math.abs(k).toFixed(3)
      + '　·　最优角 ' + bestDeg + '°（|k|=' + peak.toFixed(3) + '）'
      + (deg === bestDeg ? '　·　已对准：两股源分开' : '');
  }
  holder.redraw = draw;
  draw();
  return { slidersBox: sl.box };
}

/* ---------- DFA 运行器：五元组可视化（31 章专属） ---------- */
function renderDfaRunner(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 360; // 自环+标签在节点上方占约 65px，画布加高给顶部节点留余量
  const NODE_R = 24;
  const states = (Array.isArray(spec.states) ? spec.states : []).map(String);
  const alphabet = (Array.isArray(spec.alphabet) ? spec.alphabet : []).map(String);
  const start = String(spec.start != null ? spec.start : states[0]);
  const accepting = new Set((Array.isArray(spec.accepting) ? spec.accepting : []).map(String));
  let input = String(spec.input != null ? spec.input : ''); // 可在运行时经输入框改写
  /* transitions: [from, sym, to]，sym 必须逐字匹配输入符号 */
  const edges = (Array.isArray(spec.transitions) ? spec.transitions : []).map((t) => [
    String(t[0]),
    String(t[1]),
    String(t[2]),
  ]);
  const P = {}; // 节点位置（可拖动，只在组件内部保存）
  let r = null;
  const st = { i: 0, cur: start, done: false, dead: false, lastEdge: null };

  function ensureLayout(W) {
    const n = Math.max(states.length, 1);
    const cx = W / 2;
    const cy = H / 2 + 16;
    const R = Math.min(92, W / 2 - 70);
    states.forEach((s, i) => {
      if (!P[s]) {
        let a;
        if (n === 2) a = i === 0 ? Math.PI : 0; // 两态水平排布，自环与双向边各得其所
        else a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        P[s] = [cx + R * Math.cos(a), cy + R * Math.sin(a)];
      }
    });
  }

  function step() {
    if (st.done || st.dead) return;
    if (st.i >= input.length) {
      st.done = true;
      return;
    }
    const sym = input[st.i];
    const e = edges.find((t) => t[0] === st.cur && t[1] === sym);
    if (!e) {
      st.dead = true;
      return;
    }
    st.lastEdge = e;
    st.cur = e[2];
    st.i += 1;
    if (st.i >= input.length) st.done = true;
  }

  function runAll() {
    while (!st.done && !st.dead) step();
  }

  function reset() {
    st.i = 0;
    st.cur = start;
    st.done = false;
    st.dead = false;
    st.lastEdge = null;
    draw();
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    ensureLayout(W);
    ctx.font = '12px system-ui';

    /* 边（自环画在节点上方的小圈） */
    edges.forEach((e) => {
      const A = P[e[0]];
      const B = P[e[2]];
      if (!A || !B) return;
      const active = st.lastEdge && st.lastEdge[0] === e[0] && st.lastEdge[1] === e[1] && st.lastEdge[2] === e[2] && !st.done && !st.dead;
      ctx.strokeStyle = active ? '#e8871e' : tc.axis;
      ctx.lineWidth = active ? 3 : 1.6;
      if (e[0] === e[2]) {
        const lx = A[0];
        const ly = A[1] - NODE_R - 16; // 自环固定画在节点上方，避免与连接边缠绕
        ctx.beginPath();
        ctx.arc(lx, ly, 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = active ? '#e8871e' : tc.fg;
        ctx.textAlign = 'center';
        ctx.fillText(e[1], lx, ly - 17);
        return;
      }
      const dx = B[0] - A[0];
      const dy = B[1] - A[1];
      const d = Math.hypot(dx, dy) || 1;
      const sx = A[0] + (dx / d) * NODE_R;
      const sy = A[1] + (dy / d) * NODE_R;
      const ex = B[0] - (dx / d) * NODE_R;
      const ey = B[1] - (dy / d) * NODE_R;
      /* 同向多条边各让弧度；存在反向边时双方错开，避免两条直线重叠 */
      const same = edges.filter((q) => q[0] === e[0] && q[2] === e[2]).length;
      const opposite = edges.some((q) => q[0] === e[2] && q[2] === e[0] && q[0] !== q[2]);
      const bend = same > 1 ? 14 : opposite ? 16 : 0;
      const mx = (sx + ex) / 2 - (dy / d) * bend;
      const my = (sy + ey) / 2 + (dx / d) * bend;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
      /* 箭头 */
      const ang = Math.atan2(ey - my, ex - mx);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 9 * Math.cos(ang - 0.4), ey - 9 * Math.sin(ang - 0.4));
      ctx.lineTo(ex - 9 * Math.cos(ang + 0.4), ey - 9 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fillStyle = active ? '#e8871e' : tc.axis;
      ctx.fill();
      ctx.fillStyle = active ? '#e8871e' : tc.fg;
      ctx.textAlign = 'center';
      ctx.fillText(e[1], mx + (dx / d) * 4, my + (dy / d) * 4 - 6);
    });

    /* 起点箭头 */
    const S = P[start];
    if (S) {
      ctx.strokeStyle = tc.fg;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(S[0] - NODE_R - 30, S[1]);
      ctx.lineTo(S[0] - NODE_R - 6, S[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(S[0] - NODE_R - 4, S[1]);
      ctx.lineTo(S[0] - NODE_R - 13, S[1] - 5);
      ctx.lineTo(S[0] - NODE_R - 13, S[1] + 5);
      ctx.closePath();
      ctx.fillStyle = tc.fg;
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillText('开始', S[0] - NODE_R - 30, S[1] - 12);
    }

    /* 节点 */
    states.forEach((s) => {
      const p = P[s];
      const isCur = s === st.cur && !st.done && !st.dead;
      const isFinal = st.done && s === st.cur;
      ctx.beginPath();
      ctx.arc(p[0], p[1], NODE_R + (accepting.has(s) ? 5 : 0), 0, Math.PI * 2);
      ctx.strokeStyle = isFinal
        ? accepting.has(s)
          ? '#15803d'
          : '#dc2626'
        : accepting.has(s)
          ? tc.fg
          : tc.axis;
      ctx.lineWidth = isCur || isFinal ? 3 : 1.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p[0], p[1], NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = isCur ? 'rgba(232,135,30,0.30)' : softFill();
      ctx.fill();
      ctx.strokeStyle = isCur ? '#e8871e' : isFinal ? (accepting.has(s) ? '#15803d' : '#dc2626') : tc.fg;
      ctx.lineWidth = isCur || isFinal ? 2.6 : 1.8;
      ctx.stroke();
      ctx.fillStyle = tc.fg;
      ctx.font = '600 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(s, p[0], p[1] + 4);
    });

    /* 输入带 */
    const bandY = H - 22;
    const bw = Math.min(26, (W - 60) / Math.max(input.length, 1));
    const bx0 = W / 2 - (input.length * bw) / 2;
    for (let i = 0; i < input.length; i++) {
      const x = bx0 + i * bw;
      ctx.strokeStyle = tc.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, bandY - 15, bw, 24);
      ctx.fillStyle = i < st.i ? '#15803d' : tc.fg;
      ctx.font = '600 13px monospace';
      ctx.fillText(input[i], x + bw / 2, bandY + 2);
    }
    /* 读取头 */
    if (!st.dead) {
      const hx = bx0 + Math.min(st.i, input.length) * bw + bw / 2;
      ctx.fillStyle = '#e8871e';
      ctx.beginPath();
      ctx.moveTo(hx, bandY + 12);
      ctx.lineTo(hx - 5, bandY + 20);
      ctx.lineTo(hx + 5, bandY + 20);
      ctx.closePath();
      ctx.fill();
    }

    /* 说明 */
    if (st.dead) {
      cap.textContent = `✘ 第 ${st.i + 1} 个符号「${input[st.i]}」在状态 ${st.cur} 没有转移规则——DFA 的转移是全函数，缺规则就等于拒绝。`;
    } else if (st.done && st.i >= input.length) {
      cap.textContent = accepting.has(st.cur)
        ? `✔ 输入读完，停在接受态 ${st.cur}（双圈绿）——整串「${input}」被接受。`
        : `✘ 输入读完，停在非接受态 ${st.cur}（红圈）——整串「${input}」被拒绝。`;
    } else {
      cap.textContent = `已读 ${st.i}/${input.length}，当前在状态 ${st.cur}。点「步进」按输入带前进；拖动圆圈可重排布局。`;
    }
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  r.canvas.classList.add('ml-drag');
  bindPointer(r.canvas, {
    pick(x, y) {
      let best = null;
      let bd = NODE_R + 10;
      states.forEach((s) => {
        const d = Math.hypot(x - P[s][0], y - P[s][1]);
        if (d < bd) {
          bd = d;
          best = s;
        }
      });
      return best;
    },
    move(id, x, y) {
      /* y 上界给自环+标签留出约 65px，避免拖到顶部后整组消失在画布外 */
      P[id] = [clamp(x, NODE_R + 12, r.W - NODE_R - 12), clamp(y, 84, H - 64)];
      draw();
    },
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  [
    ['步进', () => { step(); draw(); }],
    ['一键跑完', () => { runAll(); draw(); }],
    ['重置', reset],
  ].forEach(([text, fn]) => {
    const btn = mkBtn(text);
    btn.addEventListener('click', fn);
    controls.appendChild(btn);
  });
  /* 输入框：读者可当场换串重跑（超出字母表的符号会被过滤） */
  const inputBox = document.createElement('input');
  inputBox.type = 'text';
  inputBox.value = input;
  inputBox.setAttribute('aria-label', '输入串（仅字母表内符号）');
  inputBox.style.cssText =
    'flex:1;min-width:110px;padding:4px 8px;border:1px solid rgba(128,138,155,0.5);border-radius:6px;background:transparent;color:inherit;font:600 13px monospace;';
  inputBox.addEventListener('change', () => {
    input = [...inputBox.value].filter((ch) => alphabet.includes(ch)).join('');
    inputBox.value = input;
    st.i = 0;
    st.cur = start;
    st.done = false;
    st.dead = false;
    st.lastEdge = null;
    draw();
  });
  controls.appendChild(inputBox);
  draw();
  return { slidersBox: controls };
}

/* ---------- 度序列实验室（29 章专属）：握手定理随手验 ---------- */
function renderDegreeLab(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 320;
  const NODE_R = 20;
  const PANEL_W = 168;
  const nodes = (Array.isArray(spec.nodes) ? spec.nodes : []).map(String);
  const edges = (Array.isArray(spec.edges) ? spec.edges : [])
    .map((e) => [String(e[0]), String(e[1])])
    .filter(([u, v]) => u !== v && nodes.includes(u) && nodes.includes(v));
  const P = {};
  let r = null;
  let sel = spec.selectedId != null ? String(spec.selectedId) : null;

  function degrees() {
    const d = Object.fromEntries(nodes.map((n) => [n, 0]));
    edges.forEach(([u, v]) => {
      if (d[u] != null) d[u] += 1;
      if (d[v] != null) d[v] += 1;
    });
    return d;
  }

  function ensureLayout(W) {
    const graphW = W - PANEL_W;
    const n = Math.max(nodes.length, 1);
    const cx = graphW / 2;
    const cy = H / 2 + 6;
    const R = Math.min(100, graphW / 2 - 46);
    nodes.forEach((s, i) => {
      if (!P[s]) {
        let a;
        if (n === 2) a = i === 0 ? Math.PI : 0;
        else a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        P[s] = [cx + R * Math.cos(a), cy + R * Math.sin(a)];
      }
    });
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    ensureLayout(W);
    const graphW = W - PANEL_W;
    const deg = degrees();
    const seq = nodes.map((n) => deg[n]).sort((a, b) => b - a);
    const sum = seq.reduce((a, b) => a + b, 0);
    const odd = nodes.filter((n) => deg[n] % 2 === 1);

    ctx.font = '12px system-ui';
    /* 边 */
    edges.forEach(([u, v]) => {
      const A = P[u];
      const B = P[v];
      if (!A || !B) return;
      const hot = sel && (u === sel || v === sel);
      ctx.strokeStyle = hot ? '#e8871e' : tc.axis;
      ctx.lineWidth = hot ? 3 : 1.6;
      line(ctx, A[0], A[1], B[0], B[1]);
    });
    /* 节点 + 度徽标 */
    nodes.forEach((s) => {
      const p = P[s];
      const hot = s === sel;
      ctx.beginPath();
      ctx.arc(p[0], p[1], NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = hot ? 'rgba(232,135,30,0.30)' : softFill();
      ctx.fill();
      ctx.strokeStyle = hot ? '#e8871e' : tc.fg;
      ctx.lineWidth = hot ? 2.6 : 1.8;
      ctx.stroke();
      ctx.fillStyle = tc.fg;
      ctx.font = '600 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(s, p[0], p[1] + 4);
      /* 度徽标 */
      ctx.beginPath();
      ctx.arc(p[0] + NODE_R * 0.82, p[1] - NODE_R * 0.82, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#3b74d6';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 11px monospace';
      ctx.fillText(String(deg[s]), p[0] + NODE_R * 0.82, p[1] - NODE_R * 0.82 + 4);
    });
    /* 右侧账本 */
    const px = graphW + 12;
    ctx.textAlign = 'left';
    ctx.fillStyle = tc.fg;
    ctx.font = '600 12px system-ui';
    ctx.fillText('度序列（降序）', px, 24);
    ctx.font = '600 13px monospace';
    ctx.fillText(seq.join(', '), px, 44);
    ctx.font = '12px system-ui';
    ctx.fillText(`边数 m = ${edges.length}`, px, 70);
    ctx.fillText(`Σ度 = ${sum} = 2m`, px, 90);
    ctx.fillStyle = sum === 2 * edges.length ? '#15803d' : '#dc2626';
    ctx.fillText(sum === 2 * edges.length ? '握手定理成立 ✓' : '账目不平 ✗', px, 110);
    ctx.fillStyle = tc.fg;
    ctx.fillText(`奇度点 ${odd.length} 个`, px, 136);
    ctx.font = '600 12px system-ui';
    if (odd.length) {
      const pairs = [];
      for (let i = 0; i + 1 < odd.length; i += 2) pairs.push(`${odd[i]}—${odd[i + 1]}`);
      ctx.fillText(pairs.join('，'), px, 156);
      ctx.fillStyle = tc.fg;
      ctx.font = '11px system-ui';
      ctx.fillText('（个数必为偶，可两两配对）', px, 174);
    } else {
      ctx.font = '11px system-ui';
      ctx.fillText('（全偶度：每个点都能一笔回到起点）', px, 156);
    }
    ctx.font = '11px system-ui';
    ctx.fillStyle = tc.axis;
    ctx.fillText('拖动节点重排；点选看邻边', px, H - 34);
    cap.textContent = `握手定理现场：Σ度 = ${sum} = 2 × ${edges.length} 条边。奇度点 ${odd.length} 个${
      odd.length ? `（${odd.join('、')}）` : ''
    }——无论怎么拖动，两本账永远对得上。`;
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  r.canvas.classList.add('ml-drag');
  /* 手动指针处理：按下选中/开始拖动，位移小于阈值视为点选 */
  let dragId = null;
  let downPos = null;
  const toLogical = (ev) => {
    const rect = r.canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (r.canvas._W / rect.width),
      y: (ev.clientY - rect.top) * (r.canvas._H / rect.height),
    };
  };
  r.canvas.addEventListener('pointerdown', (ev) => {
    const p = toLogical(ev);
    let best = null;
    let bd = NODE_R + 10;
    nodes.forEach((s) => {
      const d = Math.hypot(p.x - P[s][0], p.y - P[s][1]);
      if (d < bd) {
        bd = d;
        best = s;
      }
    });
    dragId = best;
    downPos = p;
    if (best !== null) {
      r.canvas.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    }
  });
  r.canvas.addEventListener('pointermove', (ev) => {
    if (dragId === null) return;
    const p = toLogical(ev);
    if (Math.hypot(p.x - downPos.x, p.y - downPos.y) > 4) {
      P[dragId] = [clamp(p.x, NODE_R + 6, r.W - PANEL_W - NODE_R - 6), clamp(p.y, NODE_R + 24, H - NODE_R - 40)];
      draw();
      ev.preventDefault();
    }
  });
  const endDrag = (ev) => {
    if (dragId !== null && downPos && ev) {
      const p = toLogical(ev);
      if (Math.hypot(p.x - downPos.x, p.y - downPos.y) <= 4) {
        sel = sel === dragId ? null : dragId;
        draw();
      }
    }
    dragId = null;
    downPos = null;
  };
  r.canvas.addEventListener('pointerup', endDrag);
  r.canvas.addEventListener('pointercancel', () => {
    dragId = null;
    downPos = null;
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const resetBtn = mkBtn('重置布局');
  resetBtn.addEventListener('click', () => {
    nodes.forEach((s) => delete P[s]);
    draw();
  });
  controls.appendChild(resetBtn);
  draw();
  return { slidersBox: controls };
}

/* ---------- 图建造台（29 章专属）：V 与 E 随手搭 ---------- */
function renderGraphBuilder(host, spec) {
  const wrap = document.createElement('div');
  wrap.className = 'ml-viz__canvasbox';
  host.appendChild(wrap);
  const cap = document.createElement('div');
  cap.className = 'ml-viz__caption';
  host.appendChild(cap);
  const H = 340;
  const NODE_R = 18;
  const MAX_NODES = 12;
  const directed = spec.mode === 'directed';
  const initialNodes = (Array.isArray(spec.nodes) ? spec.nodes : []).map(String);
  const initialEdges = (Array.isArray(spec.edges) ? spec.edges : [])
    .map((e) => [String(e[0]), String(e[1])])
    .filter(([u, v]) => u !== v && initialNodes.includes(u) && initialNodes.includes(v));
  let nodes = initialNodes.slice();
  let edges = initialEdges.map((e) => e.slice());
  const P = {};
  let r = null;
  const st = { sel: null, hover: null, msg: '' };

  function ensureLayout(W) {
    const n = Math.max(nodes.length, 1);
    const cx = W / 2;
    const cy = H / 2 - 4;
    const R = Math.min(104, W / 2 - 46);
    nodes.forEach((s, i) => {
      if (!P[s]) {
        let a;
        if (n === 2) a = i === 0 ? Math.PI : 0;
        else a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        P[s] = [cx + R * Math.cos(a), cy + R * Math.sin(a)];
      }
    });
  }

  function nextNodeName() {
    let n = nodes.length + 1;
    let name = 'V' + n;
    while (nodes.includes(name)) {
      n += 1;
      name = 'V' + n;
    }
    return name;
  }

  function toggleEdge(a, b) {
    const i = edges.findIndex(([u, v]) => (u === a && v === b) || (u === b && v === a));
    if (i >= 0) {
      edges.splice(i, 1);
      st.msg = `已删除边 ${a}—${b}`;
    } else {
      edges.push([a, b]);
      st.msg = `已添加边 ${a}—${b}`;
    }
  }

  function neighbors(s) {
    const set = new Set();
    edges.forEach(([u, v]) => {
      if (u === s) set.add(v);
      if (v === s) set.add(u);
    });
    return set;
  }

  function draw() {
    if (!r) return;
    const ctx = r.ctx;
    const W = r.W;
    const tc = themeColors();
    ctx.clearRect(0, 0, W, H);
    ensureLayout(W);
    const nb = st.hover ? neighbors(st.hover) : null;

    edges.forEach(([u, v]) => {
      const A = P[u];
      const B = P[v];
      if (!A || !B) return;
      const hot = st.hover && (u === st.hover || v === st.hover);
      ctx.strokeStyle = hot ? '#e8871e' : tc.axis;
      ctx.lineWidth = hot ? 3 : 1.6;
      const dx = B[0] - A[0];
      const dy = B[1] - A[1];
      const d = Math.hypot(dx, dy) || 1;
      const ex = B[0] - (dx / d) * NODE_R;
      const ey = B[1] - (dy / d) * NODE_R;
      line(ctx, A[0] + (dx / d) * NODE_R, A[1] + (dy / d) * NODE_R, ex, ey);
      if (directed) {
        const ang = Math.atan2(ey - A[1], ex - A[0]);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 9 * Math.cos(ang - 0.4), ey - 9 * Math.sin(ang - 0.4));
        ctx.lineTo(ex - 9 * Math.cos(ang + 0.4), ey - 9 * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fillStyle = hot ? '#e8871e' : tc.axis;
        ctx.fill();
      }
    });

    nodes.forEach((s) => {
      const p = P[s];
      const hot = s === st.hover;
      const isSel = s === st.sel;
      const isNeighbor = nb && nb.has(s);
      ctx.beginPath();
      ctx.arc(p[0], p[1], NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = isSel
        ? 'rgba(232,135,30,0.32)'
        : isNeighbor
          ? 'rgba(59,116,214,0.18)'
          : softFill();
      ctx.fill();
      ctx.strokeStyle = isSel ? '#e8871e' : hot ? '#3b74d6' : tc.fg;
      ctx.lineWidth = isSel || hot ? 2.6 : 1.8;
      ctx.stroke();
      ctx.fillStyle = tc.fg;
      ctx.font = '600 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(s, p[0], p[1] + 4);
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = tc.fg;
    ctx.font = '600 12px system-ui';
    ctx.fillText(
      `V = ${nodes.length}   E = ${edges.length}${directed ? '   （有向）' : '   （无向）'}`,
      12,
      22,
    );
    cap.textContent =
      st.msg ||
      (st.sel
        ? `已选中 ${st.sel}：再点一个顶点建/删边；再点自己取消。空白处按住可拖出新顶点。`
        : '点一个顶点开始连边；悬停看邻接；空白处按住拖出新顶点。顶点位置不是图的一部分——随便拖。');
  }

  r = setupCanvas(wrap, H);
  r.redraw = draw;
  r.canvas.classList.add('ml-drag');
  let dragId = null;
  let downPos = null;
  const toLogical = (ev) => {
    const rect = r.canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (r.canvas._W / rect.width),
      y: (ev.clientY - rect.top) * (r.canvas._H / rect.height),
    };
  };
  const hitNode = (x, y) => {
    let best = null;
    let bd = NODE_R + 8;
    nodes.forEach((s) => {
      const d = Math.hypot(x - P[s][0], y - P[s][1]);
      if (d < bd) {
        bd = d;
        best = s;
      }
    });
    return best;
  };
  r.canvas.addEventListener('pointerdown', (ev) => {
    const p = toLogical(ev);
    const hit = hitNode(p.x, p.y);
    if (hit) {
      dragId = hit;
    } else {
      if (nodes.length >= MAX_NODES) {
        st.msg = `顶点数已达上限 ${MAX_NODES}，先删边重置再说。`;
        draw();
        return;
      }
      const name = nextNodeName();
      nodes.push(name);
      P[name] = [p.x, p.y];
      dragId = name;
      st.msg = `新顶点 ${name} 已就位。`;
    }
    downPos = p;
    if (dragId !== null) {
      r.canvas.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    }
  });
  r.canvas.addEventListener('pointermove', (ev) => {
    const p = toLogical(ev);
    if (dragId !== null) {
      P[dragId] = [clamp(p.x, NODE_R + 6, r.W - NODE_R - 6), clamp(p.y, NODE_R + 30, H - NODE_R - 14)];
      draw();
      return;
    }
    const h = hitNode(p.x, p.y);
    if (h !== st.hover) {
      st.hover = h;
      draw();
    }
  });
  r.canvas.addEventListener('pointerup', (ev) => {
    if (dragId !== null && downPos) {
      const p = toLogical(ev);
      if (Math.hypot(p.x - downPos.x, p.y - downPos.y) <= 4) {
        if (st.sel === null) {
          st.sel = dragId;
          st.msg = '';
        } else if (st.sel === dragId) {
          st.sel = null;
          st.msg = '已取消选择。';
        } else {
          toggleEdge(st.sel, dragId);
          st.sel = null;
        }
      }
    }
    dragId = null;
    downPos = null;
    draw();
  });
  r.canvas.addEventListener('pointerleave', () => {
    if (st.hover) {
      st.hover = null;
      draw();
    }
  });
  r.canvas.addEventListener('pointercancel', () => {
    dragId = null;
    downPos = null;
  });
  const controls = document.createElement('div');
  controls.className = 'ml-viz__sliders is-visible';
  const resetBtn = mkBtn('重置为初始图');
  resetBtn.addEventListener('click', () => {
    nodes = initialNodes.slice();
    edges = initialEdges.map((e) => e.slice());
    Object.keys(P).forEach((k) => delete P[k]);
    st.sel = null;
    st.msg = '';
    draw();
  });
  controls.appendChild(resetBtn);
  draw();
  return { slidersBox: controls };
}

const RENDERERS = {
  'dfa-runner': renderDfaRunner,
  'degree-lab': renderDegreeLab,
  'graph-builder': renderGraphBuilder,
  numberline: renderNumberline,
  plot: renderPlot,
  sines: renderSines,
  distributive: renderDistributive,
  divisionshare: renderDivisionshare,
  fraction: renderFraction,
  fit: renderFit,
  balance: renderBalance,
  triangle: renderTriangle,
  pytha: renderPytha,
  piroll: renderPiroll,
  sector: renderSector,
  unitcircle: renderUnitcircle,
  wave: renderWave,
  beats: renderBeats,
  seq: renderSeq,
  curverace: renderCurverace,
  domino: renderDomino,
  fibspiral: renderFibspiral,
  coinlaw: renderCoinlaw,
  statdots: renderStatdots,
  dice: renderDice,
  clockmod: renderClockmod,
  sieve: renderSieve,
  euclid: renderEuclid,
  caesar: renderCaesar,
  vecadd: renderVecadd,
  dotprod: renderDotprod,
  basiscoords: renderBasiscoords,
  projection: renderProjection,
  matrix: renderMatrix,
  complexplane: renderComplexplane,
  complexmult: renderComplexmult,
  derivative: renderDerivative,
  limitprobe: renderLimitprobe,
  quadrature: renderQuadrature,
  riemann: renderRiemann,
  accumfunc: renderAccumfunc,
  taylor: renderTaylor,
  seriesbuild: renderSeriesbuild,
  orthoproduct: renderOrthoproduct,
  spectrum: renderSpectrum,
  factoring: renderFactoring,
  datachart: renderDatachart,
  counting: renderCounting,
  'truth-table': renderTruthtable,
  'quantifier-hunt': renderQuantifierhunt,
  'relation-checker': renderRelationChecker,
  'set-mapper': renderSetmapper,
  'proof-trail': renderProoftrail,
  elimination: renderElimination,
  'span-space': renderSpanspace,
  'det-area': renderDetarea,
  'eigen-direction': renderEigendirection,
  'svd-stretch': renderSvdstretch,
  'pca-projection': renderPcaprojection,
  'quadratic-form': renderQuadraticform,
  'least-squares-fit': renderLeastSquaresFit,
  'linear-map': renderLinearmap,
  'diagonalize-grid': renderDiagonalizeGrid,
  'condition-number': renderConditionNumber,
  'matrix-power': renderMatrixPower,
  'contour-map': renderContourmap,
  'gradient-probe': renderGradientprobe,
  'jacobian-grid': renderJacobiangrid,
  'hessian-curvature': renderHessiancurvature,
  'riemann2d': renderRiemann2d,
  'path-integral': renderPathintegral,
  'green-theorem': renderGreentheorem,
  'slope-field': renderSlopefield,
  'separable-flow': renderSeparableflow,
  'equilibrium-probe': renderEquilibriumprobe,
  'phase-portrait': renderPhaseportrait,
  'resonance-lab': renderResonancelab,
  'ode-solver-race': renderOdesolverrace,
  'completeness-ladder': renderCompletenessladder,
  'cauchy-tail': renderCauchytail,
  'epsilon-delta-probe': renderEpsilondeltaprobe,
  'uniform-convergence-zoom': renderUniformconvergencezoom,
  'riemann-upper-lower': renderRiemannupperlower,
  'fourier-gibbs-strict': renderFouriergibbsstrict,
  'pde-probe': renderPdeprobe,
  'flux-box': renderFluxbox,
  'boundary-lab': renderBoundarylab,
  'heat1d-lab': renderHeat1dlab,
  'fd-heat-stencil': renderFdheatstencil,
  'stability-plane': renderStabilityplane,
  'separation-mode': renderSeparationmode,
  'eigen-boundary': renderEigenboundary,
  'fourier-pde-synth': renderFourierpdesynth,
  'laplace-relax': renderLaplacerelax,
  'heat2d-paint': renderHeat2dpaint,
  'pde-classifier': renderPdeclassifier,
  'payoff-matrix': renderPayoffmatrix,
  'coordinate-transform': renderCoordinatetransform,
  'spline-editor': renderSplineeditor,
  'operation-table': renderAlgebraGrid,
  'finite-field-inverse-grid': renderAlgebraGrid,
  'cyclic-generator': renderCyclicGenerator,
  coordplane: renderCoordplane,
  condgrid: renderCondgrid,
  'moe-router': renderMoeRouter,
  'conv2d-slide': renderConv2dSlide,
  'markov-chain-lab': renderMarkovChainLab,
  'ica-rotate': renderIcaRotate,
};

export function enhanceViz(root) {
  (root || document).querySelectorAll('pre[class*="language-viz"]').forEach((pre) => {
    const container = pre.closest('.theme-code-block') || pre.parentElement;
    if (!container || container.dataset.mlVizBound === '1') return;
    const code = pre.querySelector('code');
    const lineEls = code.querySelectorAll('[class*="token-line"]');
    const text = (
      lineEls.length
        ? Array.from(lineEls).map((l) => l.textContent).join('\n')
        : code.textContent
    ).trim();
    const signature = sourceSignature(text);
    const staleWidget = [container.previousElementSibling, container.nextElementSibling]
      .find((node) => node?.classList.contains('ml-viz') && node.dataset.mlSource === signature);
    if (staleWidget) {
      container.style.display = 'none';
      container.dataset.mlVizBound = '1';
      return;
    }
    container.dataset.mlVizBound = '1';

    const widget = document.createElement('div');
    widget.className = 'ml-viz';
    widget.dataset.mlSource = signature;

    let spec = null;
    let parseErr = null;
    try {
      spec = JSON.parse(text);
    } catch (e) {
      parseErr = e.message;
    }

    if (parseErr || !spec) {
      const err = document.createElement('div');
      err.className = 'ml-quiz__bad';
      err.textContent = 'viz 配置不是合法 JSON：' + parseErr;
      widget.appendChild(err);
      mountAfter(container, widget);
      return;
    }

    if (spec.title) {
      const t = document.createElement('div');
      t.className = 'ml-viz__title';
      t.textContent = spec.title;
      widget.appendChild(t);
    }

    const renderer = RENDERERS[spec.type];
    if (!renderer) {
      const err = document.createElement('div');
      err.className = 'ml-quiz__bad';
      err.textContent = '未知 viz 类型: ' + spec.type + '（可用: ' + Object.keys(RENDERERS).join(' / ') + '）';
      widget.appendChild(err);
      mountAfter(container, widget);
      return;
    }

    const body = document.createElement('div');
    widget.appendChild(body);
    const slidersWrap = document.createElement('div');
    widget.appendChild(slidersWrap);

    let res = null;
    try {
      res = renderer(body, spec) || {};
    } catch (e) {
      const errEl = document.createElement('div');
      errEl.className = 'ml-quiz__bad';
      errEl.textContent = '组件渲染出错：' + (e && e.message ? e.message : String(e));
      widget.appendChild(errEl);
      res = {};
    }
    if (res.slidersBox) slidersWrap.appendChild(res.slidersBox);

    mountAfter(container, widget);
  });
}

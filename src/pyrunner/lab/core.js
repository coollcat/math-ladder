/* lab 系统共享底座 —— 卷六（68–75 章）工程域交互组件的公共设施。
   与 viz.js 的关系：平行系统，互不引用。viz.js 服务既有 741 门课，只读不写。
   约定：
   - 颜色一律经 themeColors()，跟随明暗主题，禁止硬编码。
   - 出声组件必须走 audio 门面（首次手势解锁 + 离屏自动停）。
   - 组件文件在 components/，默认导出 render(host, spec) -> { slidersBox?, destroy? }。 */

const redraws = new Set();
let themeObserverReady = false;
let themeCache = null;

/* ---------- 主题 ---------- */

function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  } catch (e) {
    void e;
    return fallback;
  }
}

function isDarkMode() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/* 明暗两版调色板。系列色成对给出（亮/暗），供多通道绘图使用。 */
const SERIES = {
  blue: ['#3b74d6', '#7aa5e8'],
  orange: ['#e8871e', '#d99a4e'],
  green: ['#2f8f5b', '#5fbf8a'],
  red: ['#d1483f', '#e8837b'],
  purple: ['#7a5cc4', '#a794e0'],
  teal: ['#1d9e9e', '#4fc9c9'],
  amber: ['#c8901a', '#e0b556'],
  pink: ['#c4559b', '#e58cc0'],
  gray: ['#6b7280', '#94a3b8'],
};

function themeColors() {
  if (themeCache) return themeCache;
  const dark = isDarkMode();
  const C = {
    bg: cssVar('--ml-viz-bg', dark ? '#20242c' : '#ffffff'),
    fg: cssVar('--ml-viz-fg', dark ? '#e8eaed' : '#1c1e21'),
    grid: cssVar('--ml-viz-grid', dark ? 'rgba(148,163,184,0.20)' : 'rgba(107,114,128,0.18)'),
    axis: cssVar('--ml-viz-axis', dark ? 'rgba(148,163,184,0.60)' : 'rgba(107,114,128,0.60)'),
    accent: cssVar('--ml-viz-accent', dark ? '#7aa5e8' : '#3b74d6'),
    accent2: cssVar('--ml-viz-accent2', dark ? '#d99a4e' : '#e8871e'),
    soft: dark ? 'rgba(255,255,255,0.08)' : '#eef0f3',
    ok: dark ? '#5fbf8a' : '#2f8f5b',
    bad: dark ? '#e8837b' : '#d1483f',
    dark,
  };
  /* series(i) 取第 i 条曲线在当前主题下的颜色；seriesAll() 取整组 */
  C.series = (i) => {
    const keys = Object.keys(SERIES);
    return SERIES[keys[i % keys.length]][dark ? 1 : 0];
  };
  C.seriesAll = () => Object.keys(SERIES).map((k) => SERIES[k][dark ? 1 : 0]);
  C.named = (name) => {
    const p = SERIES[name] || SERIES.blue;
    return p[dark ? 1 : 0];
  };
  themeCache = C;
  return C;
}

function ensureThemeObserver() {
  if (themeObserverReady || typeof MutationObserver === 'undefined') return;
  themeObserverReady = true;
  new MutationObserver(() => {
    themeCache = null;
    redraws.forEach((fn) => {
      if (!fn.el || !fn.el.isConnected) {
        redraws.delete(fn);
        return;
      }
      try {
        fn();
      } catch (err) {
        void err;
      }
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

function onScreen(el, cb) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cb(false);
    return;
  }
  if (typeof IntersectionObserver === 'undefined') {
    cb(true);
    return;
  }
  new IntersectionObserver((entries) => {
    cb(entries.some((en) => en.isIntersecting));
  }, { rootMargin: '60px' }).observe(el);
}

/* ---------- DOM 小工具 ---------- */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

function mkBtn(label, cls) {
  const b = el('button', 'ml-viz-btn' + (cls ? ' ' + cls : ''));
  b.type = 'button';
  b.textContent = label;
  return b;
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const lerp = (a, b, t) => a + (b - a) * t;

/* 数值格式化：自动在整数/小数间切换，避免 3.000000001 之类噪声 */
function fmt(v, digits = 2) {
  if (!isFinite(v)) return String(v);
  if (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0)) return v.toExponential(2);
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return Number.isInteger(r) ? String(r) : r.toFixed(digits);
}

/* ---------- 画布 ---------- */

function setupCanvas(box, height, opts = {}) {
  const canvas = el('canvas');
  box.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const aspect = opts.aspect || 0; // 给定宽高比时高度随宽度变化
  const st = { W: 0, H: height };
  function fit() {
    const style = getComputedStyle(box);
    const paddingX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const width = Math.max((box.clientWidth || 320) - paddingX, 280);
    const h = aspect ? Math.round(width * aspect) : height;
    if (Math.abs(width - st.W) < 2 && h === st.H) return false;
    st.W = width;
    st.H = h;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = h + 'px';
    canvas._W = width;
    canvas._H = h;
    return true;
  }
  fit();
  const holder = {
    get ctx() {
      const c = canvas.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      return c;
    },
    get W() { return st.W; },
    get H() { return st.H; },
    canvas,
    redraw: null,
  };
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (fit() && holder.redraw) holder.redraw();
    }).observe(box);
  }
  const themeRedraw = () => {
    if (holder.redraw) holder.redraw();
  };
  themeRedraw.el = box;
  redraws.add(themeRedraw);
  ensureThemeObserver();
  return holder;
}

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
    const id = handlers.pick ? handlers.pick(p.x, p.y) : 'main';
    if (id !== null && id !== undefined) {
      activeId = id;
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { void e; }
      if (handlers.down) handlers.down(activeId, p.x, p.y);
      ev.preventDefault();
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (handlers.hover) {
      const p = toLogical(ev);
      handlers.hover(p.x, p.y, activeId);
    }
    if (activeId === null || activeId === undefined) return;
    if (ev.buttons === 0 && ev.pointerType === 'mouse') {
      activeId = null;
      return;
    }
    const p = toLogical(ev);
    handlers.move(activeId, p.x, p.y);
    ev.preventDefault();
  });
  const end = (ev) => {
    if (activeId !== null && activeId !== undefined && handlers.up) {
      const p = ev ? toLogical(ev) : { x: 0, y: 0 };
      handlers.up(activeId, p.x, p.y);
    }
    activeId = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => {
    if (handlers.leave) handlers.leave();
  });
}

/* 常用绘图：网格 + 坐标轴 + 折线。各组件自行决定是否调用。 */
function drawGrid(ctx, W, H, C, opts = {}) {
  const step = opts.step || 40;
  ctx.save();
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += step) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = 0; y <= H; y += step) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();
  ctx.restore();
}

function polyline(ctx, pts, color, width = 2, dash) {
  if (!pts.length) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, color, opts = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${opts.weight || 400} ${opts.size || 12}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.baseline || 'alphabetic';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ---------- 控件 ---------- */

function buildSliders(spec, onChange) {
  const box = el('div', 'ml-viz__sliders');
  const state = {};
  (spec.sliders || []).forEach((s) => {
    state[s.name] = s.value;
    const row = el('div', 'ml-slider');
    const lab = el('label', null, (s.label || s.name) + ' =');
    const range = el('input');
    range.type = 'range';
    range.min = String(s.min);
    range.max = String(s.max);
    range.step = String(s.step);
    range.value = String(s.value);
    const val = el('span', 'ml-slider__val', String(s.value));
    range.addEventListener('input', () => {
      state[s.name] = parseFloat(range.value);
      val.textContent = s.fmt ? fmt(state[s.name], s.fmt) : range.value;
      onChange(state);
    });
    row.append(lab, range, val);
    box.appendChild(row);
  });
  return { box, state };
}

function buildToolbar(...buttons) {
  const box = el('div', 'ml-viz__controls');
  buttons.forEach((b) => b && box.appendChild(b));
  return box;
}

/* 分段选择（模式切换） */
function buildSegmented(options, initial, onChange) {
  const box = el('div', 'ml-lab__seg');
  let cur = initial;
  const btns = options.map((o) => {
    const b = mkBtn(o.label);
    b.addEventListener('click', () => {
      cur = o.value;
      sync();
      onChange(o.value);
    });
    box.appendChild(b);
    return { b, o };
  });
  function sync() {
    btns.forEach(({ b, o }) => {
      b.classList.toggle('is-active', o.value === cur);
    });
  }
  sync();
  return box;
}

/* 只读数值读数条 */
function buildReadout(pairs) {
  const box = el('div', 'ml-lab__readout');
  const refs = {};
  Object.keys(pairs).forEach((k) => {
    const item = el('div', 'ml-lab__ro');
    item.append(el('span', 'ml-lab__ro-k', k), el('span', 'ml-lab__ro-v', pairs[k]));
    refs[k] = item.lastChild;
    box.appendChild(item);
  });
  return {
    box,
    set(k, v) {
      if (refs[k]) refs[k].textContent = v;
    },
  };
}

/* 动画循环：播放/暂停/重置 + 离屏暂停 + 尊重减少动效 */
function anim(host, handlers) {
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const play = mkBtn(reduced ? '减少动效' : '播放');
  const reset = mkBtn('重置');
  play.disabled = reduced;
  const bar = buildToolbar(play, reset);
  host.appendChild(bar);

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
  onScreen(host, (v) => {
    visible = v;
    last = 0;
    sync();
  });
  return {
    bar,
    get playing() { return playing; },
    toggle(v) {
      playing = v === undefined ? !playing : !!v;
      last = 0;
      sync();
    },
    stop() {
      playing = false;
      sync();
    },
  };
}

/* 轻量 raf 循环（无控件），离屏自动停 */
function rafLoop(host, onTick) {
  let raf = null;
  let visible = true;
  function sync() {
    const run = visible && host.isConnected;
    if (run && raf == null) raf = requestAnimationFrame(tick);
    if (!run && raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
  function tick() {
    if (!visible || !host.isConnected) {
      raf = null;
      return;
    }
    onTick();
    raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    sync();
  });
  return { stop() { visible = false; sync(); } };
}

/* ---------- 音频门面（懒加载，失败降级为「此浏览器不支持」） ---------- */

let audioPromise = null;
const audio = {
  get available() {
    return typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined';
  },
  /* 必须在用户手势回调里首次调用。返回引擎对象。 */
  load() {
    if (!audioPromise) audioPromise = import('./engines/audio.js').catch((e) => {
      audioPromise = null;
      throw e;
    });
    return audioPromise;
  },
};

/* 统一的「出声组件」外壳：处理解锁提示、停止按钮、离屏静音。
   build(ctxHost, setup) 中 setup(engine, api) 负责真正接线。 */
function audioShell(host, setup) {
  const bar = el('div', 'ml-viz__controls');
  const hint = el('span', 'ml-lab__hint', '');
  const toggle = mkBtn('▶ 播放');
  bar.append(toggle, hint);
  host.appendChild(bar);

  let eng = null;
  let running = false;
  let visible = true;
  const dispose = [];

  async function start() {
    if (!audio.available) {
      hint.textContent = '此浏览器不支持 Web Audio';
      return;
    }
    try {
      const mod = await audio.load();
      eng = await mod.createEngine();
      await eng.resume();
      running = true;
      toggle.textContent = '■ 停止';
      hint.textContent = '';
      const cleanup = setup(eng, { hint, dispose });
      if (typeof cleanup === 'function') dispose.push(cleanup);
    } catch (e) {
      hint.textContent = '音频启动失败：' + (e && e.message ? e.message : e);
    }
  }
  function stop() {
    running = false;
    toggle.textContent = '▶ 播放';
    while (dispose.length) {
      const fn = dispose.pop();
      try { fn(); } catch (e) { void e; }
    }
    if (eng) {
      try { eng.close(); } catch (e) { void e; }
      eng = null;
    }
  }
  toggle.addEventListener('click', () => {
    if (running) stop();
    else start();
  });
  onScreen(host, (v) => {
    visible = v;
    if (!v && running) stop();
  });
  return { bar, stop, get running() { return running; } };
}

/* ---------- 引擎懒加载门面 ---------- */

const engineLoaders = {
  dsp: () => import('./engines/dsp.js'),
  media: () => import('./engines/media.js'),
  circuit: () => import('./engines/circuit.js'),
  logic: () => import('./engines/logic.js'),
  mech: () => import('./engines/mech.js'),
  audio: () => import('./engines/audio.js'),
};

function engine(name) {
  const l = engineLoaders[name];
  if (!l) return Promise.reject(new Error('未知引擎: ' + name));
  return l();
}

export {
  cssVar,
  isDarkMode,
  themeColors,
  ensureThemeObserver,
  onScreen,
  el,
  mkBtn,
  clamp,
  lerp,
  fmt,
  setupCanvas,
  bindPointer,
  drawGrid,
  polyline,
  label,
  buildSliders,
  buildToolbar,
  buildSegmented,
  buildReadout,
  anim,
  rafLoop,
  audio,
  audioShell,
  engine,
  SERIES,
};

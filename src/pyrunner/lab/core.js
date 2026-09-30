/* lab 系统共享底座 —— 卷六（68–75 章）工程域交互组件的公共设施。
   与 viz.js 的关系：平行系统，互不引用。viz.js 服务既有课程，只读不写。
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
    pruneRedraws();
    redraws.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        void err;
      }
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/* 清掉已脱离文档的组件留下的重绘回调。组件销毁（路由切换）不会主动注销，
   全靠这里兜底：否则死回调会滞留在 redraws 里直到下次主题切换。
   每次有新画布注册时也扫一遍，把滞留窗口压到「本轮新增的画布」级别。 */
function pruneRedraws() {
  redraws.forEach((fn) => {
    if (!fn.el || !fn.el.isConnected) redraws.delete(fn);
  });
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
  pruneRedraws();
  redraws.add(themeRedraw);
  ensureThemeObserver();
  return holder;
}

function bindPointer(canvas, handlers) {
  let activeId = null;
  const toLogical = (ev) => pointerXY(canvas, ev);
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

/* 把指针事件换算成画布逻辑坐标（setupCanvas 的 _W/_H 口径）。
   bindPointer 内部也用它；组件自管指针事件时直接调这个，别再各写一份。 */
function pointerXY(canvas, ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - rect.left) * (canvas._W / rect.width),
    y: (ev.clientY - rect.top) * (canvas._H / rect.height),
  };
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

/* 带箭头的线段（力学/电路类组件画力矢量、流向用）。
   head 是箭头长度像素，w 是线宽，长度不足 5px 时不画箭头。 */
function arrow(ctx, x0, y0, x1, y1, color, w, head) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w || 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  if (len > 5) {
    const h = head || 9;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - h * Math.cos(ang - 0.42), y1 - h * Math.sin(ang - 0.42));
    ctx.lineTo(x1 - h * Math.cos(ang + 0.42), y1 - h * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
  }
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

/* 把一个值回写到 buildSliders 造出的第 i 行滑块（拖拽联动 / 工具条同步用）。
   buildSliders 没给 setter，组件里做「拖画布改滑块」时全靠这个按行序号回写：
   - digits 给了就用 fmt(v, digits) 更新数值标签；不给就原样 String(v)（整数滑块）。
   - name 给了就顺带 sliders.state[name] = v（与用户拖滑块的行为对齐）。
   行结构固定是 label / input / span 三个孩子，直接按位取，比 querySelector 快。 */
function setSliderRow(sliders, i, v, digits, name) {
  const row = sliders.box.children[i];
  if (row) {
    const input = row.children[1];
    const val = row.children[2];
    if (input) input.value = String(v);
    if (val) val.textContent = digits === undefined ? String(v) : fmt(v, digits);
  }
  if (name !== undefined) sliders.state[name] = v;
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

/* ---------- 组件通用工具 ----------
   这一节的函数原先在 lab/components/ 里被各组件各写一份（多则十几份），
   语义一致，统一收敛到这里。组件直接从 core.js 引，不必再自带副本。
   注意：core.js 已被全部组件引用，加导出不增加任何加载成本。 */

/* 灰度数组 -> 离屏 canvas。map 可选，用于显示前做一次逐点映射
   （传不传都行，不传就直接把 [0,1] 值画成灰阶）。
   ImageData 的 data 是 Uint8ClampedArray，赋值时自己会夹紧，
   所以这里只负责 clamp + 四舍五入。 */
function grayCanvas(data, w, h, map) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c2 = cv.getContext('2d');
  const im = c2.createImageData(w, h);
  for (let i = 0; i < w * h; i += 1) {
    const g = Math.round(clamp(map ? map(data[i], i) : data[i], 0, 1) * 255);
    im.data[i * 4] = g;
    im.data[i * 4 + 1] = g;
    im.data[i * 4 + 2] = g;
    im.data[i * 4 + 3] = 255;
  }
  c2.putImageData(im, 0, 0);
  return cv;
}

/* 老名字，与 grayCanvas 是同一件事（视频/编码类组件在用）。留作别名，
   免得 6 个文件各改一遍调用点。 */
const toCanvas = grayCanvas;

/* 把离屏 canvas 贴到目标上下文，关掉插值以免灰阶图被平滑糊掉。 */
function blit(ctx, cv, x, y, w, h) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, x, y, w, h);
}

/* 从 spec.sliders 里按名取一项滑块规格，取不到就用组件给的默认值。
   课文 ```lab 围栏里写了同名滑块时，用它覆盖组件默认范围。 */
function pickSlider(spec, name, def) {
  const s = (spec.sliders || []).find((it) => it && it.name === name);
  return s
    ? { name, label: s.label || def.label, min: s.min, max: s.max, step: s.step, value: s.value }
    : def;
}

/* 把课文 spec 里散落的滑块初值合回组件的默认规格表，
   合完统一 clamp 回各自范围，保证初值不会越界。 */
function mergeSpec(base, spec) {
  const given = Array.isArray(spec && spec.sliders) ? spec.sliders : [];
  return base.map((d) => {
    const top = spec && typeof spec[d.name] === 'number' ? spec[d.name] : d.value;
    const o = given.find((g) => g && g.name === d.name) || {};
    const item = Object.assign({}, d, { value: top }, o, { name: d.name });
    item.value = clamp(item.value, item.min, item.max);
    return item;
  });
}

/* 确定性伪随机（同一 seed 永远同一串），用于"每次刷新结果都一样"的教学演示，
   避免学生对照答案时被随机数干扰。 */
function mulberry32(a) {
  return function rnd() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 把数组按峰值缩放到 peak（默认 0.9，留一点余量防削波）。
   频谱/倒谱类组件画图前的例行公事，原先 mfcc-lab 与 spectrogram-lab 各一份。 */
function normalizeTo(arr, peak = 0.9) {
  let mx = 1e-9;
  for (let i = 0; i < arr.length; i += 1) mx = Math.max(mx, Math.abs(arr[i]));
  const k = peak / mx;
  for (let i = 0; i < arr.length; i += 1) arr[i] *= k;
  return arr;
}

/* 泊松分布 pmf：P(X=k|λ)。连乘算 log 避免阶乘溢出，λ≤0 时只 k=0 有意义。
   bci 章两个组件（互信息 / 调谐曲线）共用。 */
function pois(k, lam) {
  if (lam <= 0) return k === 0 ? 1 : 0;
  let lg = -lam + k * Math.log(lam);
  for (let i = 2; i <= k; i += 1) lg -= Math.log(i);
  return Math.exp(lg);
}

/* 程序化生成的内置示例图（图像处理类组件共用同一张「风景」：
   天空亮斑 / 双层山脊 / 水面波纹 / 码头条纹 / 棋盘角），返回 [0,1] 灰度。
   原先 5 个图像组件各抄一份，现在统一从这里出。 */
function sceneGray(w, h) {
  const img = new Float64Array(w * h);
  const ar = w / h;
  const HZ = 0.58;
  const bump = (u, c, s) => Math.exp(-((u - c) * (u - c)) / (2 * s * s));
  for (let y = 0; y < h; y += 1) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x += 1) {
      const u = x / (w - 1);
      const rA = HZ - 0.26 * bump(u, 0.26, 0.13) - 0.17 * bump(u, 0.68, 0.08);
      const rB = HZ - 0.10 * bump(u, 0.5, 0.22);
      const far = Math.min(rA, rB);
      const near = Math.max(rA, rB);
      let val;
      if (v < far) {
        val = 0.30 + 0.44 * (v / HZ);
        const sd = Math.hypot((u - 0.78) * ar, v - 0.16);
        if (sd < 0.07) val = 0.99;
        else if (sd < 0.14) val += 0.16 * (1 - (sd - 0.07) / 0.07);
      } else if (v < near) {
        val = 0.20 + 0.10 * bump(u, 0.26, 0.13);
      } else if (v < HZ) {
        val = 0.46 + 0.10 * Math.sin(u * 46);
      } else {
        val = 0.68 - 0.36 * ((v - HZ) / (1 - HZ));
        if (v > 0.63 && v < 0.79 && u > 0.08 && u < 0.44) {
          val = Math.floor(x / 3) % 2 ? 0.90 : 0.16;
        }
        if (v > 0.80 && u > 0.60) {
          val = (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? 0.92 : 0.26;
        }
      }
      img[y * w + x] = clamp(val, 0, 1);
    }
  }
  return img;
}

/* 画布开屏三连：清底 + 填主题底色。各组件 draw() 的第一步原先都是这三行。 */
function clearBg(ctx, W, H, C) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
}

/* LCG 线性同余（经典 glibc 参数，seed*1103515245+12345）。
   unit=true 给 [0,1]（概率采样 / Box-Muller 用），默认给 [-1,1] 的带符号噪声
   （波形注入 / 抖动用）。注意与 mulberry32 是两种分布口径，别互相替换。 */
function lcg(seed, unit) {
  return function rnd() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return unit ? seed / 0x7fffffff : seed / 0x3fffffff - 1;
  };
}

/* Box-Muller 高斯：rand 是 [0,1] 随机源（传 lcg(seed, true) 或 mulberry32(seed)）。
   u1 带 1e-9 下限防 log(0)。 */
function gaussOf(rand) {
  const u1 = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rand());
}

/* 泊松采样：λ<30 用 Knuth 乘法逐个试，大 λ 用正态近似 λ+√λ·z（并夹到 ≥0）。 */
function poissonSample(lam, rand) {
  if (lam <= 0) return 0;
  if (lam < 30) {
    let k = 0;
    let p = 1;
    const L = Math.exp(-lam);
    do { k += 1; p *= rand(); } while (p > L);
    return k - 1;
  }
  const u1 = Math.max(rand(), 1e-12);
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rand());
  return Math.max(0, Math.round(lam + Math.sqrt(lam) * z));
}

/* 洛伦兹因子 γ(v) = 1/√(1−v²)，相对论各组件共用（v 用无量纲 β = v/c）。 */
function gammaOf(v) {
  return 1 / Math.sqrt(1 - v * v);
}

/* 频率 → 音名 + 音分偏差（A4 = 440 Hz = MIDI 69，音名用升号 ♯ 记法）。
   非有限 / 非正频率给 { name: '—', cents: 0 }，调用方不必自己判。 */
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
function noteOf(f) {
  if (!isFinite(f) || f <= 0) return { name: '—', cents: 0 };
  const n = 69 + 12 * Math.log2(f / 440);
  const near = Math.round(n);
  return {
    name: NOTE_NAMES[((near % 12) + 12) % 12] + (Math.floor(near / 12) - 1),
    cents: Math.round((n - near) * 100),
  };
}

/* CSS 颜色串 → [r,g,b]：hex3/hex6、rgb()/rgba()、裸「r, g, b」数字串都认，
   全部失败给 fallback（三版组件私有解析的正则并集）。 */
function cssToRGB(css, fallback) {
  const s0 = String(css || '').trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s0);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = /rgba?\(([^)]+)\)/i.exec(s0);
  if (rgb) {
    const p = rgb[1].split(',').map((v) => parseFloat(v));
    return [p[0] || 0, p[1] || 0, p[2] || 0];
  }
  const bare = /(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(s0);
  if (bare) return [+bare[1], +bare[2], +bare[3]];
  return fallback;
}

/* 改某一行滑块的量程上限（异步引擎装载数据后帧数/档位才定的场景）。 */
function setSliderMax(sliders, i, max) {
  const row = sliders.box.children[i];
  if (!row) return;
  const r = row.querySelector('input[type="range"]');
  if (r) r.max = String(max);
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
  pointerXY,
  drawGrid,
  polyline,
  label,
  arrow,
  buildSliders,
  setSliderRow,
  setSliderMax,
  buildToolbar,
  buildSegmented,
  buildReadout,
  anim,
  rafLoop,
  audio,
  audioShell,
  engine,
  SERIES,
  grayCanvas,
  toCanvas,
  blit,
  pickSlider,
  mergeSpec,
  mulberry32,
  lcg,
  gaussOf,
  poissonSample,
  gammaOf,
  noteOf,
  cssToRGB,
  normalizeTo,
  pois,
  sceneGray,
  clearBg,
};

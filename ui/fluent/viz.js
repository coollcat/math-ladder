/* ============================================================
   Fluent 皮肤 · viz 交互组件渲染器(自包含)
   支持类型: plot / datachart / seq / sines / unitcircle / wave /
             dice / statdots / coinlaw / counting(覆盖全站 55% 用量)
   其余章节专属类型保留占位卡,由卡片右上角链接跳主站游玩。
   颜色走 CSS 变量 --viz-bg/--viz-fg/--viz-grid/--viz-axis(皮肤各自定义)。
   用法: mountViz(rootElement) —— 在阅读页正文注入后调用。
   ============================================================ */

/* ---------- 主题与画布基建 ---------- */
function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  } catch { return fallback; }
}
function colors() {
  return {
    bg: cssVar('--viz-bg', '#ffffff'),
    fg: cssVar('--viz-fg', '#1a1a1a'),
    grid: cssVar('--viz-grid', 'rgba(107,114,128,.18)'),
    axis: cssVar('--viz-axis', 'rgba(107,114,128,.6)'),
    accent: cssVar('--viz-accent', '#0067c0'),
    accent2: cssVar('--viz-accent-2', '#9a6600'),
  };
}
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setupCanvas(box, height) {
  const canvas = document.createElement('canvas');
  box.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const st = { W: 0 };
  function fit() {
    const width = Math.max(box.clientWidth || 320, 280);
    if (Math.abs(width - st.W) < 2) return false;
    st.W = width;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = height + 'px';
    canvas._W = width; canvas._H = height;
    return true;
  }
  fit();
  const holder = {
    get ctx() { const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return c; },
    get W() { return st.W; }, H: height, canvas, redraw: null,
  };
  if (window.ResizeObserver) {
    new ResizeObserver(() => { if (fit() && holder.redraw) holder.redraw(); }).observe(box);
  }
  return holder;
}

/* 动画循环: 离屏自动暂停,减少动效偏好时只画一帧 */
function animLoop(canvas, frame) {
  let running = true, raf = 0, t0 = performance.now();
  if (REDUCED) { frame(0); return { stop() { running = false; } }; }
  function tick(now) {
    if (!running) return;
    frame((now - t0) / 1000);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((es) => {
      const vis = es.some((e) => e.isIntersecting);
      if (vis && !running) { running = true; raf = requestAnimationFrame(tick); }
      else if (!vis && running) { running = false; cancelAnimationFrame(raf); }
    }, { rootMargin: '60px' }).observe(canvas);
  }
  return { stop() { running = false; cancelAnimationFrame(raf); } };
}

/* 滑杆组: spec.sliders = [{var,min,max,step,init}] */
function buildSliders(spec, state, onChange, host) {
  const list = spec.sliders || [];
  if (!list.length) return null;
  const box = document.createElement('div');
  box.className = 'viz-controls';
  for (const s of list) {
    const key = s.var || s.name || s.key || 'v';
    const min = Number(s.min ?? 0), max = Number(s.max ?? 10);
    const step = Number(s.step ?? ((max - min) / 100 || 0.1));
    state[key] = Number(s.init ?? s.value ?? min);
    const row = document.createElement('label');
    row.className = 'viz-slider';
    const name = document.createElement('span');
    name.textContent = key;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min); input.max = String(max); input.step = String(step);
    input.value = String(state[key]);
    const val = document.createElement('b');
    val.textContent = fmtNum(state[key]);
    input.addEventListener('input', () => {
      state[key] = Number(input.value);
      val.textContent = fmtNum(state[key]);
      onChange();
    });
    row.append(name, input, val);
    box.appendChild(row);
  }
  host.appendChild(box);
  return box;
}

/* 按钮组 */
function addButtons(host, defs) {
  const box = document.createElement('div');
  box.className = 'viz-controls';
  for (const d of defs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'viz-btn';
    b.textContent = d.label;
    b.addEventListener('click', d.onClick);
    box.appendChild(b);
  }
  host.appendChild(box);
  return box;
}

/* 读数条 */
function mkReadout(host, n) {
  const box = document.createElement('div');
  box.className = 'viz-readout';
  const spans = [];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    box.appendChild(s);
    spans.push(s);
  }
  host.appendChild(box);
  return (vals) => vals.forEach((v, i) => { if (spans[i]) spans[i].textContent = v; });
}

/* ---------- 表达式编译(白名单) ---------- */
const EXPR_FUNCS = {
  sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', asin: 'Math.asin', acos: 'Math.acos',
  atan: 'Math.atan', sqrt: 'Math.sqrt', abs: 'Math.abs', exp: 'Math.exp', log: 'Math.log',
  floor: 'Math.floor', ceil: 'Math.ceil', round: 'Math.round', min: 'Math.min', max: 'Math.max',
  pow: 'Math.pow', atan2: 'Math.atan2', sinh: 'Math.sinh', cosh: 'Math.cosh', tanh: 'Math.tanh',
  sign: 'Math.sign',
};
const EXPR_CONSTS = { pi: 'Math.PI', e: 'Math.E' };
function compileExpr(src, varNames) {
  const allowed = new Set([...Object.keys(EXPR_FUNCS), ...Object.keys(EXPR_CONSTS), ...varNames]);
  // 词法检查: 只允许白名单标识符、数字、运算符与括号
  const tokens = src.match(/[A-Za-z_]\w*|\d*\.?\d+(?:e[+-]?\d+)?|[+\-*/%^(),\s]*/g) || [];
  for (const tk of tokens) {
    if (/^[A-Za-z_]/.test(tk) && !allowed.has(tk)) throw new Error('表达式含未允许的符号: ' + tk);
  }
  let js = src.replace(/\^/g, '**');
  for (const [k, v] of Object.entries(EXPR_FUNCS)) js = js.replace(new RegExp('\\b' + k + '\\b', 'g'), v);
  for (const [k, v] of Object.entries(EXPR_CONSTS)) js = js.replace(new RegExp('\\b' + k + '\\b', 'g'), v);
  return new Function(...varNames, '"use strict";return (' + js + ');');
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
function fmtNum(v) {
  if (!isFinite(v)) return '—';
  return Number.isInteger(v) ? String(v) : (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, ''));
}
function niceStep(span) {
  const raw = span / 8;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
}

/* ---------- 坐标系绘制(plot/seq 等共用) ---------- */
function drawGrid(ctx, C, box, x0, x1, y0, y1, toX, toY, piAxis) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, box.W, box.H);
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.font = '11px Consolas, monospace';
  ctx.fillStyle = C.fg;
  // x 刻度
  const sx = piAxis ? Math.PI / 2 : niceStep(x1 - x0);
  const startX = piAxis ? Math.ceil(x0 / sx) * sx : Math.ceil(x0 / sx) * sx;
  ctx.textAlign = 'center';
  for (let xv = startX; xv <= x1 + 1e-9; xv += sx) {
    const px = toX(xv);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, box.H); ctx.stroke();
    const lbl = piAxis
      ? (Math.abs(xv / Math.PI - Math.round(xv / Math.PI)) < 1e-9
        ? (Math.round(xv / Math.PI) === 0 ? '0' : Math.round(xv / Math.PI) + 'π')
        : (xv / Math.PI) + 'π')
      : fmtNum(xv);
    if (lbl) ctx.fillText(lbl, px, box.H - 6);
  }
  // y 刻度
  const sy = niceStep(y1 - y0);
  ctx.textAlign = 'right';
  for (let yv = Math.ceil(y0 / sy) * sy; yv <= y1; yv += sy) {
    const py = toY(yv);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(box.W, py); ctx.stroke();
    ctx.fillText(fmtNum(yv), 42, py - 4);
  }
  // 轴
  ctx.strokeStyle = C.axis;
  if (y0 < 0 && y1 > 0) { const py = toY(0); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(box.W, py); ctx.stroke(); }
  if (x0 < 0 && x1 > 0) { const px = toX(0); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, box.H); ctx.stroke(); }
}

function plotCurve(ctx, C, box, fn, x0, x1, toX, toY, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  let pen = false;
  const N = 400;
  for (let i = 0; i <= N; i++) {
    const xv = x0 + (x1 - x0) * i / N;
    const yv = fn(xv);
    if (!isFinite(yv)) { pen = false; continue; }
    const py = toY(yv);
    if (py < -2000 || py > box.H + 2000) { pen = false; continue; }
    if (!pen) { ctx.moveTo(toX(xv), py); pen = true; }
    else ctx.lineTo(toX(xv), py);
  }
  ctx.stroke();
}

/* ---------- 类型: plot ---------- */
function renderPlot(host, spec) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  const state = {};
  const varNames = ['x'];
  for (const s of spec.sliders || []) varNames.push(s.var || s.name || s.key);
  const x0 = Number(spec.xmin ?? -10), x1 = Number(spec.xmax ?? 10);
  const f1 = spec.expr ? compileExpr(spec.expr, varNames) : null;
  const f2 = spec.expr2 ? compileExpr(spec.expr2, varNames) : null;
  let probeX = null;
  let ys = [];

  function sampleY() {
    ys = [];
    const args = varNames.slice(1).map((k) => state[k]);
    for (const fn of [f1, f2]) {
      if (!fn) continue;
      for (let i = 0; i <= 200; i++) {
        const v = fn(x0 + (x1 - x0) * i / 200, ...args);
        if (isFinite(v)) ys.push(v);
      }
    }
  }
  const holder = setupCanvas(box, 300);
  function draw() {
    const ctx = holder.ctx;
    sampleY();
    let y0 = spec.ymin ?? Math.min(...ys), y1 = spec.ymax ?? Math.max(...ys);
    if (!isFinite(y0) || !isFinite(y1) || y0 === y1) { y0 = -1; y1 = 1; }
    if (spec.ymin == null) { const pad = (y1 - y0) * 0.12 || 0.5; y0 -= pad; y1 += pad; }
    const toX = (v) => (v - x0) / (x1 - x0) * holder.W;
    const toY = (v) => holder.H - (v - y0) / (y1 - y0) * holder.H;
    drawGrid(ctx, C, holder, x0, x1, y0, y1, toX, toY, spec.piAxis);
    const args = varNames.slice(1).map((k) => state[k]);
    if (f1) plotCurve(ctx, C, holder, (x) => f1(x, ...args), x0, x1, toX, toY, C.accent, 2);
    if (f2) plotCurve(ctx, C, holder, (x) => f2(x, ...args), x0, x1, toX, toY, C.accent2, 1.6);
    // 探针
    if (probeX != null) {
      const px = toX(probeX);
      ctx.strokeStyle = C.axis;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, holder.H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '12px Consolas, monospace';
      ctx.textAlign = 'left';
      let ty = 16;
      if (f1) {
        const v = f1(probeX, ...args);
        if (isFinite(v)) {
          ctx.fillStyle = C.accent;
          ctx.beginPath(); ctx.arc(px, toY(v), 4, 0, 7); ctx.fill();
          ctx.fillText((spec.label || 'f') + '(' + fmtNum(probeX) + ') = ' + fmtNum(v), px + 8, ty);
          ty += 16;
        }
      }
      if (f2) {
        const v = f2(probeX, ...args);
        if (isFinite(v)) {
          ctx.fillStyle = C.accent2;
          ctx.beginPath(); ctx.arc(px, toY(v), 4, 0, 7); ctx.fill();
          ctx.fillText((spec.label2 || 'g') + '(' + fmtNum(probeX) + ') = ' + fmtNum(v), px + 8, ty);
        }
      }
    }
  }
  holder.redraw = draw;
  buildSliders(spec, state, draw, host);
  const readout = mkReadout(host, 2);
  readout([spec.label ? '蓝: ' + spec.label : '', spec.label2 ? '橙: ' + spec.label2 : '']);
  // 提示: 鼠标在画布上移动即探针
  box.title = '在曲线上移动鼠标可读取函数值';
  holder.canvas.addEventListener('pointermove', (e) => {
    const r = holder.canvas.getBoundingClientRect();
    const lx = (e.clientX - r.left) * (holder.canvas._W / r.width);
    probeX = x0 + (x1 - x0) * lx / holder.W;
    draw();
  });
  holder.canvas.addEventListener('pointerleave', () => { probeX = null; draw(); });
  draw();
}

/* ---------- 类型: datachart ---------- */
function renderDatachart(host, spec) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  const labels = spec.labels || [];
  const values = (spec.values || []).map(Number);
  const baseline = spec.baseline != null ? Number(spec.baseline) : 0;
  const holder = setupCanvas(box, 280);
  let hover = -1;
  function draw() {
    const ctx = holder.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, holder.W, holder.H);
    const vmax = Math.max(...values, baseline, 1) * 1.15;
    const vmin = Math.min(0, ...values, baseline);
    const toY = (v) => holder.H - 30 - (v - vmin) / (vmax - vmin) * (holder.H - 55);
    const bw = holder.W / Math.max(values.length, 1);
    values.forEach((v, i) => {
      const x = i * bw + bw * 0.18, w = bw * 0.64;
      ctx.fillStyle = i === hover ? C.accent2 : C.accent;
      const y0 = toY(v), yb = toY(baseline);
      ctx.fillRect(x, Math.min(y0, yb), w, Math.abs(yb - y0) || 2);
      ctx.fillStyle = C.fg;
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i] || String(i), x + w / 2, holder.H - 10);
      if (i === hover) { ctx.font = 'bold 13px Consolas'; ctx.fillText(fmtNum(v), x + w / 2, Math.min(y0, yb) - 6); }
    });
    // 基线
    const yb = toY(baseline);
    ctx.strokeStyle = C.axis;
    ctx.beginPath(); ctx.moveTo(0, yb); ctx.lineTo(holder.W, yb); ctx.stroke();
    ctx.fillStyle = C.fg;
    ctx.textAlign = 'left';
    ctx.font = '11px Consolas';
    ctx.fillText('基线 ' + fmtNum(baseline), 4, yb - 4);
  }
  holder.redraw = draw;
  holder.canvas.addEventListener('pointermove', (e) => {
    const r = holder.canvas.getBoundingClientRect();
    const lx = (e.clientX - r.left) * (holder.canvas._W / r.width);
    hover = Math.floor(lx / (holder.W / Math.max(values.length, 1)));
    draw();
  });
  holder.canvas.addEventListener('pointerleave', () => { hover = -1; draw(); });
  if (baseline !== 0) mkReadout(host, 1)(['注意: 纵轴基线不是 0,柱高差会被视觉放大']);
  draw();
}

/* ---------- 类型: seq(等差/等比) ---------- */
function renderSeq(host, spec) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  const kind = spec.kind === 'geom' ? 'geom' : 'arith';
  const state = { a1: Number(spec.a1 ?? 1), step: Number(spec.d ?? spec.r ?? 1), n: Number(spec.n ?? 8) };
  const holder = setupCanvas(box, 260);
  function terms() {
    const arr = [];
    for (let i = 0; i < Math.round(state.n); i++) {
      arr.push(kind === 'arith' ? state.a1 + state.step * i : state.a1 * Math.pow(state.step, i));
    }
    return arr;
  }
  function draw() {
    const arr = terms();
    const ctx = holder.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, holder.W, holder.H);
    const vmax = Math.max(...arr.map(Math.abs), 1) * 1.1;
    const vmin = Math.min(0, ...arr);
    const toY = (v) => holder.H - 26 - (v - vmin) / (vmax - vmin) * (holder.H - 50);
    const bw = holder.W / arr.length;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    arr.forEach((v, i) => {
      const x = i * bw + bw / 2;
      i ? ctx.lineTo(x, toY(v)) : ctx.moveTo(x, toY(v));
    });
    ctx.stroke();
    arr.forEach((v, i) => {
      ctx.fillStyle = C.accent;
      const x = i * bw + bw * 0.2, w = bw * 0.6;
      const yb = toY(Math.max(vmin, 0)), yv = toY(v);
      ctx.fillRect(x, Math.min(yv, yb), w, Math.abs(yv - yb) || 2);
    });
    ctx.fillStyle = C.fg;
    ctx.font = '12px Consolas';
    ctx.textAlign = 'center';
    arr.forEach((v, i) => ctx.fillText(fmtNum(v), i * bw + bw / 2, toY(v) - 6));
  }
  holder.redraw = draw;
  const sliders = { sliders: [
    { var: 'a1', min: -5, max: 5, step: 1, init: state.a1 },
    kind === 'arith'
      ? { var: 'd(公差)', min: -4, max: 6, step: 0.5, init: state.step }
      : { var: 'r(公比)', min: 0.2, max: 2.2, step: 0.1, init: state.step },
    { var: 'n(项数)', min: 3, max: 20, step: 1, init: state.n },
  ] };
  // 特殊处理: 滑杆 key 与 state 对齐
  const rawSpec = { sliders: sliders.sliders.map((s, i) => ({ ...s, var: ['a1', 'step', 'n'][i] })) };
  const readout = mkReadout(host, 2);
  function update() {
    const arr = terms();
    const an = arr[arr.length - 1];
    const sn = kind === 'arith'
      ? arr.length * (arr[0] + an) / 2
      : arr[0] * (Math.pow(state.step, arr.length) - 1) / (state.step - 1);
    readout(['a' + arr.length + ' = ' + fmtNum(an), '前 ' + arr.length + ' 项和 = ' + fmtNum(sn)]);
  }
  buildSliders(rawSpec, state, () => { draw(); update(); }, host);
  draw(); update();
}

/* ---------- 类型: sines(谐波叠加) ---------- */
function renderSines(host, spec) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  const terms = (spec.terms || [1]).map(Number);
  let harmonics = terms.length;
  const holder = setupCanvas(box, 260);
  function draw(t) {
    const ctx = holder.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, holder.W, holder.H);
    const x0 = 0, x1 = Math.PI * 2;
    const toX = (x) => (x - x0) / (x1 - x0) * holder.W;
    const toY = (y) => holder.H / 2 - y * holder.H * 0.38;
    drawGrid(ctx, C, holder, x0, x1, -1.4, 1.4, toX, toY, true);
    ctx.lineWidth = 1;
    for (let i = 0; i < harmonics; i++) {
      const k = terms[i];
      ctx.strokeStyle = C.grid;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      for (let px = 0; px <= holder.W; px++) {
        const x = x0 + (x1 - x0) * px / holder.W;
        const y = Math.sin(k * x + t * 0.5) / k;
        px ? ctx.lineTo(px, toY(y)) : ctx.moveTo(px, toY(y));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let px = 0; px <= holder.W; px++) {
      const x = x0 + (x1 - x0) * px / holder.W;
      let y = 0;
      for (let i = 0; i < harmonics; i++) y += Math.sin(terms[i] * x + t * 0.5) / terms[i];
      px ? ctx.lineTo(px, toY(y)) : ctx.moveTo(px, toY(y));
    }
    ctx.stroke();
    ctx.fillStyle = C.fg;
    ctx.font = '12px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText('谐波数: ' + harmonics + ' / ' + terms.length, 8, 18);
  }
  holder.redraw = () => draw(0);
  const state = {};
  buildSliders({ sliders: [{ var: 'harmonics', min: 1, max: terms.length, step: 1, init: terms.length }] }, state, () => { harmonics = Math.round(state.harmonics); }, host);
  if (!REDUCED) animLoop(holder.canvas, draw);
  else draw(0);
}

/* ---------- 类型: unitcircle ---------- */
function renderUnitcircle(host, spec) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  const wave = spec.mode !== 'circle';
  const holder = setupCanvas(box, 300);
  let theta = Math.PI / 6, dragging = false;
  function draw(t) {
    if (!dragging && !REDUCED) theta = (t * 0.6) % (Math.PI * 2);
    const ctx = holder.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, holder.W, holder.H);
    const R = Math.min(holder.W * (wave ? 0.28 : 0.38), holder.H * 0.42);
    const cx = R + 30, cy = holder.H / 2;
    // 圆
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R - 10, cy); ctx.lineTo(cx + R + (wave ? 10 : 14), cy); ctx.stroke();
    // 波展开区
    const wx0 = cx + R + 20;
    const wx1 = holder.W - 10;
    if (wave) {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      for (let px = wx0; px <= wx1; px++) {
        const th = (px - wx0) / (wx1 - wx0) * Math.PI * 2;
        const y = cy - Math.sin(th) * R;
        px === wx0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.stroke();
    }
    // 点与投影
    const pxp = cx + Math.cos(theta) * R, pyp = cy - Math.sin(theta) * R;
    ctx.strokeStyle = C.accent2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pxp, cy); ctx.stroke(); // cos
    ctx.beginPath(); ctx.moveTo(pxp, pyp); ctx.lineTo(pxp, cy); ctx.stroke(); // sin 竖线
    if (wave) {
      ctx.beginPath(); ctx.moveTo(pxp, pyp); ctx.lineTo(wx0 + (theta / (Math.PI * 2)) * (wx1 - wx0), pyp); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pxp, pyp); ctx.stroke();
    ctx.fillStyle = C.accent2;
    ctx.beginPath(); ctx.arc(pxp, pyp, 6, 0, 7); ctx.fill();
    // 读数
    ctx.fillStyle = C.fg;
    ctx.font = '12.5px Consolas';
    ctx.textAlign = 'left';
    const deg = (theta * 180 / Math.PI).toFixed(1);
    ctx.fillText('θ = ' + deg + '°  (' + (theta / Math.PI).toFixed(2) + 'π)', 8, 18);
    ctx.fillText('sin θ = ' + Math.sin(theta).toFixed(3), 8, 36);
    ctx.fillText('cos θ = ' + Math.cos(theta).toFixed(3), 8, 54);
  }
  holder.redraw = () => draw(0);
  holder.canvas.addEventListener('pointerdown', (e) => { dragging = true; move(e); });
  holder.canvas.addEventListener('pointermove', (e) => dragging && move(e));
  addEventListener('pointerup', () => { dragging = false; });
  function move(e) {
    const r = holder.canvas.getBoundingClientRect();
    const lx = (e.clientX - r.left) * (holder.canvas._W / r.width);
    const ly = (e.clientY - r.top) * (holder.canvas._H / r.height);
    const R = Math.min(holder.W * (wave ? 0.28 : 0.38), holder.H * 0.42);
    theta = Math.atan2(-(ly - holder.H / 2), lx - (R + 30));
    if (theta < 0) theta += Math.PI * 2;
    draw(0);
  }
  if (!REDUCED && !wave) animLoop(holder.canvas, draw);
  else if (!REDUCED) animLoop(holder.canvas, (t) => !dragging && draw(t));
  else draw(0);
}

/* ---------- 类型: wave ---------- */
function renderWave(host, spec) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  const state = { A: Number(spec.A ?? 1), f: Number(spec.f ?? 1), phi: Number(spec.phi ?? 0) };
  const holder = setupCanvas(box, 240);
  function draw(t) {
    const ctx = holder.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, holder.W, holder.H);
    const x1 = Math.PI * 2;
    const toX = (x) => x / x1 * holder.W;
    const toY = (y) => holder.H / 2 - y * holder.H * 0.36;
    drawGrid(ctx, C, holder, 0, x1, -1.5, 1.5, toX, toY, true);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let px = 0; px <= holder.W; px++) {
      const x = x1 * px / holder.W;
      const y = state.A * Math.sin(2 * Math.PI * state.f * (x / x1) + state.phi + (REDUCED ? 0 : t * 0.4));
      px ? ctx.lineTo(px, toY(y)) : ctx.moveTo(px, toY(y));
    }
    ctx.stroke();
    ctx.fillStyle = C.fg;
    ctx.font = '12.5px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText('y = ' + fmtNum(state.A) + '·sin(2π·' + fmtNum(state.f) + '·t + ' + fmtNum(state.phi) + ')', 8, 18);
  }
  holder.redraw = () => draw(0);
  buildSliders({ sliders: [
    { var: 'A(振幅)', min: 0, max: 1.5, step: 0.05, init: state.A },
    { var: 'f(频率)', min: 0.2, max: 5, step: 0.1, init: state.f },
    { var: 'phi(相位)', min: 0, max: 6.28, step: 0.05, init: state.phi },
  ].map((s, i) => ({ ...s, var: ['A', 'f', 'phi'][i] })) }, state, () => holder.redraw(), host);
  if (!REDUCED) animLoop(holder.canvas, draw);
  else draw(0);
}

/* ---------- 类型: dice(骰子与大数定律) ---------- */
function renderDice(host, spec) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  const nDice = Math.max(1, Math.min(6, Number(spec.dice ?? 2)));
  const lo = nDice, hi = nDice * 6;
  const counts = new Array(hi - lo + 1).fill(0);
  let total = 0;
  const holder = setupCanvas(box, 260);
  function roll(k) {
    for (let i = 0; i < k; i++) {
      let s = 0;
      for (let d = 0; d < nDice; d++) s += 1 + Math.floor(Math.random() * 6);
      counts[s - lo]++;
      total++;
    }
    draw();
  }
  function draw() {
    const ctx = holder.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, holder.W, holder.H);
    const maxCount = Math.max(...counts, 1);
    const bw = holder.W / counts.length;
    counts.forEach((c, i) => {
      const h = c / maxCount * (holder.H - 60);
      ctx.fillStyle = C.accent;
      ctx.fillRect(i * bw + bw * 0.15, holder.H - 30 - h, bw * 0.7, h);
      ctx.fillStyle = C.fg;
      ctx.font = '12px Consolas';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + lo), i * bw + bw / 2, holder.H - 12);
    });
    // 理论概率横线: 每柱期望数量 = total * P(s)
    if (total > 0) {
      ctx.strokeStyle = C.accent2;
      ctx.setLineDash([5, 4]);
      counts.forEach((_, i) => {
        const s = i + lo;
        const p = nDice === 1 ? 1 / 6 : combinationsCount(s, nDice) / 6 ** nDice;
        const expect = p * total;
        const maxExp = Math.max(...counts.map((c, j) => {
          const sj = j + lo;
          return nDice === 1 ? total / 6 : combinationsCount(sj, nDice) / 6 ** nDice * total;
        }), 1);
        const h = expect / maxExp * (holder.H - 60);
        ctx.beginPath();
        ctx.moveTo(i * bw + bw * 0.1, holder.H - 30 - h);
        ctx.lineTo(i * bw + bw * 0.9, holder.H - 30 - h);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    ctx.fillStyle = C.fg;
    ctx.font = '13px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText('总掷数: ' + total + '(n=' + nDice + ' 个骰子,虚线=理论期望)', 8, 18);
  }
  holder.redraw = draw;
  addButtons(host, [
    { label: '掷 1 次', onClick: () => roll(1) },
    { label: '+50', onClick: () => roll(50) },
    { label: '+2000', onClick: () => roll(2000) },
    { label: '↺ 重置', onClick: () => { counts.fill(0); total = 0; draw(); } },
  ]);
  draw();
}
function combinationsCount(sum, dice) {
  let c = 0;
  const rec = (d, s) => {
    if (d === 0) { if (s === 0) c++; return; }
    for (let f = 1; f <= 6; f++) if (s - f >= 0) rec(d - 1, s - f);
  };
  rec(dice, sum);
  return c;
}
function combinations(n, k) { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; }

/* ---------- 类型: statdots(均值与标准差) ---------- */
function renderStatdots(host, spec) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  const n = Math.max(2, Math.min(30, Number(spec.n ?? 8)));
  const lo = Number(spec.min ?? 0), hi = Number(spec.max ?? 10);
  const pts = Array.from({ length: n }, (_, i) => ({ x: lo + (hi - lo) * (i + 0.5) / n, y: 0.5, v: lo + Math.random() * (hi - lo) }));
  const holder = setupCanvas(box, 240);
  let dragIdx = -1;
  function stats() {
    const m = pts.reduce((a, p) => a + p.v, 0) / pts.length;
    const sd = Math.sqrt(pts.reduce((a, p) => a + (p.v - m) ** 2, 0) / pts.length);
    return { m, sd };
  }
  function toX(v) { return 40 + (v - lo) / (hi - lo) * (holder.W - 60); }
  function fromX(px) { return lo + (px - 40) / (holder.W - 60) * (hi - lo); }
  function draw() {
    const { m, sd } = stats();
    const ctx = holder.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, holder.W, holder.H);
    const band = (w, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(toX(m - sd * w), 40, toX(m + sd * w) - toX(m - sd * w), holder.H - 80);
    };
    band(1, C.accent + '1a');
    // 轴
    ctx.strokeStyle = C.axis;
    ctx.beginPath(); ctx.moveTo(30, holder.H / 2); ctx.lineTo(holder.W - 10, holder.H / 2); ctx.stroke();
    ctx.fillStyle = C.fg;
    ctx.font = '11px Consolas';
    ctx.textAlign = 'center';
    for (let v = lo; v <= hi; v += (hi - lo) / (hi - lo)) ctx.fillText(String(v), toX(v), holder.H / 2 + 18);
    // 点
    pts.forEach((p, i) => {
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.arc(toX(p.v), holder.H / 2 + p.y * 60, 7, 0, 7); ctx.fill();
      if (i === dragIdx) { ctx.strokeStyle = C.accent2; ctx.lineWidth = 2.4; ctx.stroke(); }
    });
    // 均值三角
    const mx = toX(m);
    ctx.fillStyle = C.accent2;
    ctx.beginPath(); ctx.moveTo(mx, holder.H / 2 - 22); ctx.lineTo(mx - 7, holder.H / 2 - 34); ctx.lineTo(mx + 7, holder.H / 2 - 34); ctx.closePath(); ctx.fill();
    ctx.font = '13px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText('均值 μ = ' + m.toFixed(2), 8, 18);
    ctx.fillText('标准差 σ = ' + sd.toFixed(2), 8, 34);
  }
  holder.redraw = draw;
  holder.canvas.addEventListener('pointerdown', (e) => { dragIdx = hit(e); if (dragIdx >= 0) move(e); });
  holder.canvas.addEventListener('pointermove', (e) => dragIdx >= 0 && move(e));
  addEventListener('pointerup', () => { dragIdx = -1; draw(); });
  function hit(e) {
    const r = holder.canvas.getBoundingClientRect();
    const lx = (e.clientX - r.left) * (holder.canvas._W / r.width);
    return pts.findIndex((p) => Math.abs(toX(p.v) - lx) < 14);
  }
  function move(e) {
    const r = holder.canvas.getBoundingClientRect();
    const lx = (e.clientX - r.left) * (holder.canvas._W / r.width);
    pts[dragIdx].v = clamp(fromX(lx), lo, hi);
    draw();
  }
  draw();
}

/* ---------- 类型: coinlaw(频率收敛) ---------- */
function renderCoinlaw(host) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  let heads = 0, total = 0;
  const holder = setupCanvas(box, 260);
  function flip(k) {
    for (let i = 0; i < k; i++) { if (Math.random() < 0.5) heads++; total++; }
    draw();
  }
  function draw() {
    const ctx = holder.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, holder.W, holder.H);
    if (total < 1) {
      ctx.fillStyle = C.fg; ctx.font = '13px Consolas'; ctx.textAlign = 'left';
      ctx.fillText('点下面的按钮开始掷硬币', 10, 24);
      return;
    }
    // 记录不够存整条曲线——重掷: 为了性能,直接按几何网格采样重放不现实;这里保存抽样点
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let pen = false;
    const N = 240;
    for (let i = 1; i <= N; i++) {
      const nAt = Math.round(total * i / N);
      // 二项频率在 nAt 处的期望路径近似: 0.5 + noise/sqrt(n) —— 用确定性伪随机展示带状收缩
      if (nAt < 1) continue;
      const noise = pseudo(heads * 7919 + nAt);
      const f = 0.5 + (noise - 0.5) * 1.6 / Math.sqrt(nAt) * Math.sqrt(total) * Math.sqrt(Math.min(1, 40 / total)) + (heads / total - 0.5) * (nAt / total);
      const px = 40 + Math.log10(nAt) / Math.log10(Math.max(total, 10)) * (holder.W - 60);
      const py = holder.H - 34 - clamp(f, 0, 1) * (holder.H - 60);
      pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      pen = true;
    }
    ctx.stroke();
    // 0.5 参考线
    ctx.strokeStyle = C.accent2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(40, holder.H - 34 - 0.5 * (holder.H - 60));
    ctx.lineTo(holder.W - 20, holder.H - 34 - 0.5 * (holder.H - 60));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.fg;
    ctx.font = '13px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText('正面频率 = ' + (heads / total).toFixed(4) + '(总掷数 ' + total + ',横轴对数)', 8, 18);
    ctx.fillText('绿虚线 = 理论值 0.5', 8, 36);
  }
  holder.redraw = draw;
  addButtons(host, [
    { label: '掷 1 次', onClick: () => flip(1) },
    { label: '+100', onClick: () => flip(100) },
    { label: '+1000', onClick: () => flip(1000) },
    { label: '+100000', onClick: () => flip(100000) },
    { label: '↺ 重置', onClick: () => { heads = 0; total = 0; draw(); } },
  ]);
  draw();
}
function pseudo(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

/* ---------- 类型: counting(排列 vs 组合) ---------- */
function renderCounting(host, spec) {
  const box = document.createElement('div');
  box.className = 'viz-canvasbox';
  host.appendChild(box);
  const C = colors();
  const state = { n: Number(spec.n ?? 6), k: Number(spec.k ?? 2) };
  const holder = setupCanvas(box, 250);
  function fact(x) { let r = 1; for (let i = 2; i <= x; i++) r *= i; return r; }
  function draw() {
    const n = Math.round(state.n), k = Math.min(Math.round(state.k), n);
    const P = fact(n) / fact(n - k);
    const Ck = combinations(n, k);
    const ctx = holder.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, holder.W, holder.H);
    const vmax = Math.max(P, Ck, 1);
    const cx = holder.W / 2;
    const bars = [
      { v: P, label: '排列 P(n,k)', x: cx - 190, color: C.accent },
      { v: Ck, label: '组合 C(n,k)', x: cx + 60, color: C.accent2 },
    ];
    for (const b of bars) {
      const h = b.v / vmax * 140;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, 190 - h, 130, h);
      ctx.fillStyle = C.fg;
      ctx.font = '13px Consolas';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x + 65, 208);
      ctx.fillText(fmtNum(b.v), b.x + 65, 190 - h - 8);
    }
    ctx.fillStyle = C.fg;
    ctx.font = '13px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText('n = ' + n + ', k = ' + k + ' —— 组合 = 排列 ÷ ' + k + '!', 8, 20);
  }
  holder.redraw = draw;
  buildSliders({ sliders: [
    { var: 'n', min: 1, max: 12, step: 1, init: state.n },
    { var: 'k', min: 0, max: 12, step: 1, init: state.k },
  ] }, state, draw, host);
  draw();
}

/* ---------- 分发表 ---------- */
const RENDER = {
  plot: renderPlot,
  datachart: renderDatachart,
  seq: renderSeq,
  sines: renderSines,
  unitcircle: renderUnitcircle,
  wave: renderWave,
  dice: renderDice,
  statdots: renderStatdots,
  coinlaw: renderCoinlaw,
  counting: renderCounting,
};

/* ---------- 挂载入口 ---------- */
export function mountViz(root) {
  root.querySelectorAll('.ml-viz[data-viz]').forEach((card) => {
    if (card.dataset.vizBound) return; // 防重复注入守卫
    card.dataset.vizBound = '1';
    let spec;
    try { spec = JSON.parse(decodeURIComponent(card.dataset.viz)); } catch { return; }
    const renderer = RENDER[spec.type];
    if (!renderer) return; // 不支持的类型保留占位,由卡片链接跳主站
    const ph = card.querySelector('.ml-viz-ph');
    if (!ph) return;
    const box = document.createElement('div');
    box.className = 'viz-host';
    ph.replaceWith(box);
    try { renderer(box, spec); }
    catch (e) {
      box.textContent = '组件加载失败: ' + (e && e.message);
      box.className = 'viz-host viz-err';
    }
  });
}

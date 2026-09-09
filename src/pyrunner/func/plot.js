/* =========================================================================
 * 画布 —— 坐标系、网格、曲线、标注，以及拖动/滚轮缩放
 * -------------------------------------------------------------------------
 * 只管「怎么画」和「怎么操作视野」，不管算式从哪来、性质怎么算。
 * 主题色自己读 CSS 变量（--ml-viz-*，与卷六 lab 组件共用一套），
 * 于是明暗切换、自定义配色都不用改这里，也不必反向依赖 lab 底座。
 *
 * 两个容易踩的坑，这里都堵上了：
 *   1. 曲线碰到 1/x 的极点会算出 ±1e12，直接换算成屏幕坐标能到 ±1e15 像素，
 *      Canvas 画这种线会整条消失。所以先把 y 夹到视窗外 20 屏再换算，
 *      看上去仍是「从屏幕外射进来」，但线不会飞掉。
 *   2. 拖动/缩放过程中不重采样，只拿现有数据重画，重采交给节流后的回调；
 *      否则每帧几千次函数求值，拖起来会一卡一卡的。
 * ========================================================================= */

/* 多曲线配色：亮/暗两版成对给出 */
const SERIES = [
  ['#3b74d6', '#7aa5e8'],
  ['#e8871e', '#d99a4e'],
  ['#2f8f5b', '#5fbf8a'],
  ['#d1483f', '#e8837b'],
  ['#7a5cc4', '#a794e0'],
  ['#1d9e9e', '#4fc9c9'],
  ['#c4559b', '#e58cc0'],
  ['#c8901a', '#e0b556'],
];

function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  } catch (e) {
    void e;
    return fallback;
  }
}

function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

let cache = null;
export function themeColors() {
  if (cache) return cache;
  const dark = isDark();
  cache = {
    bg: cssVar('--ml-viz-bg', dark ? '#20242c' : '#ffffff'),
    fg: cssVar('--ml-viz-fg', dark ? '#e8eaed' : '#1c1e21'),
    grid: cssVar('--ml-viz-grid', dark ? 'rgba(148,163,184,0.18)' : 'rgba(107,114,128,0.16)'),
    axis: cssVar('--ml-viz-axis', dark ? 'rgba(148,163,184,0.62)' : 'rgba(107,114,128,0.62)'),
    soft: cssVar('--ml-viz-soft', dark ? 'rgba(255,255,255,0.07)' : '#eef0f3'),
    muted: dark ? 'rgba(232,234,237,0.62)' : 'rgba(28,30,33,0.60)',
    dark,
    series: (i) => SERIES[i % SERIES.length][dark ? 1 : 0],
  };
  return cache;
}

/* ---------- 小工具 ---------- */

/** 取「好看的」刻度间隔：1、2、5 乘 10 的整数次幂 */
export function niceStep(span, target) {
  const raw = span / Math.max(1, target || 8);
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const s = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return s * mag;
}

/** 刻度文字：按步长决定小数位，太大太小都走科学计数 */
export function tickText(v, step) {
  if (Math.abs(v) < step / 2) return '0';
  if (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-4)) return v.toExponential(1).replace('e+', 'e');
  const d = Math.max(0, Math.min(10, Math.ceil(-Math.log10(Math.abs(step)))));
  let s = v.toFixed(d);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

/* ---------- 主入口 ---------- */

export function createPlot(host, opts) {
  const o = opts || {};
  const wrap = document.createElement('div');
  wrap.className = 'ml-fn__plot';
  host.appendChild(wrap);

  const canvas = document.createElement('canvas');
  canvas.className = 'ml-fn__canvas';
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let view = Object.assign({ x0: -10, x1: 10, y0: -6, y1: 6 }, o.view);
  let curves = [];
  let marks = [];
  let areas = [];
  let showGrid = o.showGrid !== false;
  let hover = null;
  let W = 300;
  let H = 200;
  let dpr = 1;

  const cbView = [];
  const cbHover = [];
  const cbSelect = [];
  /* 'pan' = 拖动画布；'select' = 拖出一个 x 区间（量面积用） */
  let dragMode = 'pan';
  let selRange = null;

  /* ---------- 尺寸 ---------- */
  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(240, wrap.clientWidth || 320);
    const h = Math.max(180, o.height || wrap.clientHeight || 320);
    if (Math.abs(w - W) < 1 && Math.abs(h - H) < 1 && canvas.width) return false;
    W = w;
    H = h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    return true;
  }
  fit();
  let ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(() => {
      if (fit()) draw();
    });
    ro.observe(wrap);
  }
  /* 明暗主题变化时重画（颜色是读 CSS 变量算的） */
  const mo = new MutationObserver(() => {
    cache = null;
    draw();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- 坐标换算 ---------- */
  const spanX = () => view.x1 - view.x0;
  const spanY = () => view.y1 - view.y0;
  const sx = (x) => ((x - view.x0) / spanX()) * W;
  const sy = (y) => H - ((y - view.y0) / spanY()) * H;
  /* 极端值先夹到视窗外 20 屏：1/x 在极点附近能算出 1e12，
     不夹的话屏幕坐标会大到 Canvas 直接不画这条线 */
  const sySafe = (y) => {
    if (!Number.isFinite(y)) return NaN;
    const s = spanY();
    const c = Math.min(Math.max(y, view.y0 - s * 20), view.y1 + s * 20);
    return H - ((c - view.y0) / s) * H;
  };
  const ix = (px) => view.x0 + (px / W) * spanX();
  const iy = (py) => view.y0 + ((H - py) / H) * spanY();

  /* ---------- 绘制 ---------- */

  function drawGrid(C) {
    const stepX = niceStep(spanX(), Math.max(4, Math.round(W / 90)));
    const stepY = niceStep(spanY(), Math.max(3, Math.round(H / 70)));
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.grid;
    ctx.fillStyle = C.muted;
    ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.beginPath();
    let k = Math.ceil(view.x0 / stepX);
    for (let v = k * stepX; v <= view.x1 + 1e-9; v += stepX, k += 1) {
      const px = Math.round(sx(v)) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
    }
    k = Math.ceil(view.y0 / stepY);
    for (let v = k * stepY; v <= view.y1 + 1e-9; v += stepY, k += 1) {
      const py = Math.round(sy(v)) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
    }
    ctx.stroke();

    /* 刻度数字 */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    k = Math.ceil(view.x0 / stepX);
    for (let v = k * stepX; v <= view.x1 + 1e-9; v += stepX, k += 1) {
      if (Math.abs(v) < stepX / 2) continue; /* 0 留给坐标轴交点那儿写 */
      const px = sx(v);
      if (px < 14 || px > W - 14) continue;
      ctx.fillText(tickText(v, stepX), px, Math.min(sy(0) + 4, H - 14));
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    k = Math.ceil(view.y0 / stepY);
    for (let v = k * stepY; v <= view.y1 + 1e-9; v += stepY, k += 1) {
      if (Math.abs(v) < stepY / 2) continue;
      const py = sy(v);
      if (py < 10 || py > H - 10) continue;
      ctx.fillText(tickText(v, stepY), Math.max(sx(0) - 5, W - 4), py);
    }
    /* 原点 */
    if (view.x0 <= 0 && view.x1 >= 0 && view.y0 <= 0 && view.y1 >= 0) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('0', Math.max(sx(0) - 5, 12), Math.min(sy(0) + 4, H - 14));
    }
    ctx.restore();
  }

  function drawAxes(C) {
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (view.y0 <= 0 && view.y1 >= 0) {
      const py = Math.round(sy(0)) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
    }
    if (view.x0 <= 0 && view.x1 >= 0) {
      const px = Math.round(sx(0)) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawAreas() {
    areas.forEach((a) => {
      if (!a.segs || !a.segs.length) return;
      ctx.save();
      ctx.fillStyle = a.color;
      ctx.globalAlpha = a.alpha === undefined ? 0.16 : a.alpha;
      ctx.beginPath();
      const y0px = sy(0);
      a.segs.forEach(([i0, i1]) => {
        ctx.moveTo(sx(a.xs[i0]), y0px);
        for (let i = i0; i <= i1; i += 1) ctx.lineTo(sx(a.xs[i]), sySafe(a.ys[i]));
        ctx.lineTo(sx(a.xs[i1]), y0px);
        ctx.closePath();
      });
      ctx.fill();
      ctx.restore();
    });
  }

  function drawCurves() {
    curves.forEach((c) => {
      if (!c.visible && c.visible !== undefined) return;
      if (!c.segs || !c.segs.length) return;
      ctx.save();
      ctx.strokeStyle = c.color;
      ctx.lineWidth = c.width || 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (c.dash) ctx.setLineDash(c.dash);
      ctx.beginPath();
      c.segs.forEach(([i0, i1]) => {
        let started = false;
        for (let i = i0; i <= i1; i += 1) {
          const px = sx(c.xs[i]);
          const py = sySafe(c.ys[i]);
          if (!Number.isFinite(py)) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
      });
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawMarks(C) {
    ctx.save();
    ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
    marks.forEach((m) => {
      const px = sx(m.x);
      const py = sy(m.y);
      if (px < -30 || px > W + 30 || py < -30 || py > H + 30) return;
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = m.color;
      ctx.fillStyle = C.bg;
      ctx.arc(px, py, m.kind === 'zero' ? 4 : 3.6, 0, Math.PI * 2);
      if (m.kind === 'zero') {
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = m.color;
        ctx.fill();
      }
      if (m.label) {
        ctx.fillStyle = C.fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const dy = m.kind === 'min' ? 16 : -8;
        ctx.fillText(m.label, px, py + dy);
      }
    });
    ctx.restore();
  }

  /** 框出来的积分区间：整条竖带染一层淡色，边界画实线 */
  function drawSelection() {
    if (!selRange) return;
    const a = Math.min(selRange[0], selRange[1]);
    const b = Math.max(selRange[0], selRange[1]);
    const pa = sx(a);
    const pb = sx(b);
    const C = themeColors();
    ctx.save();
    ctx.fillStyle = C.soft;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(pa, 0, Math.max(1, pb - pa), H);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(pa) + 0.5, 0);
    ctx.lineTo(Math.round(pa) + 0.5, H);
    ctx.moveTo(Math.round(pb) + 0.5, 0);
    ctx.lineTo(Math.round(pb) + 0.5, H);
    ctx.stroke();
    ctx.restore();
  }

  function drawHover(C) {
    if (!hover) return;
    const px = sx(hover.x);
    ctx.save();
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
    ctx.setLineDash([]);
    /* 各条曲线在这个 x 上的位置点一个圈 */
    hover.points.forEach((p) => {
      const py = sySafe(p.y);
      if (!Number.isFinite(py)) return;
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function draw() {
    if (!canvas.isConnected) return;
    const C = themeColors();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (showGrid) drawGrid(C);
    drawSelection();
    drawAreas();
    drawAxes(C);
    drawCurves();
    drawMarks(C);
    drawHover(C);
  }

  /* ---------- 视野操作 ---------- */

  function setView(v, silent) {
    const nx = Object.assign({}, view, v);
    /* 防止拖到宽高为 0 或者翻转 */
    if (!(nx.x1 > nx.x0)) return view;
    if (!(nx.y1 > nx.y0)) return view;
    view = nx;
    draw();
    if (!silent) cbView.forEach((f) => f(view));
    return view;
  }

  /** 以屏幕点为锚缩放：锚点下的数学坐标保持不动 */
  function zoomAt(px, py, factor, mode) {
    const ax = ix(px);
    const ay = iy(py);
    const fx = mode === 'y' ? 1 : factor;
    const fy = mode === 'x' ? 1 : factor;
    const nv = {
      x0: ax - (ax - view.x0) * fx,
      x1: ax + (view.x1 - ax) * fx,
      y0: ay - (ay - view.y0) * fy,
      y1: ay + (view.y1 - ay) * fy,
    };
    /* 别让人缩到 1e-15 那么细，也别放到 1e12 那么空 */
    const MIN = 1e-6;
    const MAX = 1e9;
    if (nv.x1 - nv.x0 < MIN || nv.x1 - nv.x0 > MAX) return;
    if (nv.y1 - nv.y0 < MIN || nv.y1 - nv.y0 > MAX) return;
    setView(nv);
  }

  /** 按曲线数据自动定 y 的范围（去掉极端值，免得一根渐近线压扁全图） */
  function fitY(padRatio) {
    let lo = Infinity;
    let hi = -Infinity;
    const all = [];
    curves.forEach((c) => {
      if (c.visible === false || !c.segs) return;
      c.segs.forEach(([i0, i1]) => {
        for (let i = i0; i <= i1; i += 1) {
          const x = c.xs[i];
          const y = c.ys[i];
          if (x < view.x0 || x > view.x1) continue;
          if (!Number.isFinite(y)) continue;
          all.push(y);
        }
      });
    });
    if (!all.length) return false;
    all.sort((a, b) => a - b);
    /* 掐头去尾各 1%：tan(x)、1/x 在边界上的巨值不该决定整张图的比例 */
    const cut = Math.max(1, Math.floor(all.length * 0.01));
    lo = all[cut];
    hi = all[all.length - 1 - cut];
    if (!(hi > lo)) {
      const c = (lo + hi) / 2 || 0;
      lo = c - 1;
      hi = c + 1;
    }
    const pad = (hi - lo) * (padRatio === undefined ? 0.12 : padRatio);
    setView({ y0: lo - pad, y1: hi + pad }, true);
    return true;
  }

  /* ---------- 鼠标 / 触摸 ---------- */

  function toLocal(ev) {
    const r = canvas.getBoundingClientRect();
    return { px: (ev.clientX - r.left) * (W / r.width), py: (ev.clientY - r.top) * (H / r.height) };
  }

  let drag = null;
  let picking = null;
  canvas.addEventListener('pointerdown', (ev) => {
    const { px, py } = toLocal(ev);
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { void e; }
    if (dragMode === 'select') {
      picking = { from: ix(px) };
      selRange = [picking.from, picking.from];
      draw();
      return;
    }
    drag = { px, py, x0: view.x0, x1: view.x1, y0: view.y0, y1: view.y1 };
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (ev) => {
    const { px, py } = toLocal(ev);
    if (picking) {
      selRange = [picking.from, ix(px)];
      draw();
      cbSelect.forEach((f) => f(selRange, false));
      return;
    }
    if (drag) {
      const dx = (drag.px - px) / W * (drag.x1 - drag.x0);
      const dy = (drag.py - py) / H * (drag.y1 - drag.y0);
      setView({ x0: drag.x0 + dx, x1: drag.x1 + dx, y0: drag.y0 - dy, y1: drag.y1 - dy });
      return;
    }
    const x = ix(px);
    const points = [];
    curves.forEach((c) => {
      if (c.visible === false || !c.segs) return;
      const y = c.at ? c.at(x) : valueAt(c, x);
      if (y !== null && Number.isFinite(y)) points.push({ y, color: c.color });
    });
    hover = { x, py, points };
    draw();
    cbHover.forEach((f) => f(hover));
  });
  const endDrag = () => {
    if (picking) {
      const r = selRange;
      picking = null;
      /* 拖得太短（手抖点一下）就不算选区 */
      if (r && Math.abs(r[1] - r[0]) < (view.x1 - view.x0) * 0.005) {
        selRange = null;
        draw();
        cbSelect.forEach((f) => f(null, true));
      } else {
        cbSelect.forEach((f) => f(r, true));
      }
      return;
    }
    if (!drag) return;
    drag = null;
    canvas.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    if (drag || picking) return;
    hover = null;
    draw();
    cbHover.forEach((f) => f(null));
  });

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const { px, py } = toLocal(ev);
    const factor = Math.exp((ev.deltaY > 0 ? 1 : -1) * 0.16);
    const mode = ev.shiftKey ? 'x' : ev.ctrlKey || ev.metaKey ? 'y' : null;
    zoomAt(px, py, factor, mode);
  }, { passive: false });

  canvas.addEventListener('dblclick', (ev) => {
    ev.preventDefault();
    if (o.onReset) o.onReset();
  });

  /* ---------- 对外 ---------- */

  return {
    el: wrap,
    canvas,
    get view() { return Object.assign({}, view); },
    setView,
    zoomAt,
    fitY,
    get width() { return W; },
    get height() { return H; },
    setData(d) {
      curves = (d && d.curves) || [];
      marks = (d && d.marks) || [];
      areas = (d && d.areas) || [];
      showGrid = !d || d.showGrid !== false;
      draw();
    },
    setHover(h) {
      hover = h;
      draw();
    },
    draw,
    onView(f) { cbView.push(f); },
    onHover(f) { cbHover.push(f); },
    /** 框选回调：done=true 表示这一笔拖完了 */
    onSelect(f) { cbSelect.push(f); },
    setDragMode(m) {
      dragMode = m === 'select' ? 'select' : 'pan';
      canvas.classList.toggle('is-selecting', dragMode === 'select');
    },
    get dragMode() { return dragMode; },
    setSelection(r) {
      selRange = r ? [r[0], r[1]] : null;
      draw();
    },
    get selection() { return selRange ? [selRange[0], selRange[1]] : null; },
    destroy() {
      if (ro) ro.disconnect();
      mo.disconnect();
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    },
  };
}

/** 在某条曲线的采样上插值取值（悬停读数用，比重新求值快） */
export function valueAt(curve, x) {
  if (!curve.xs || !curve.xs.length) return null;
  const xs = curve.xs;
  const ys = curve.ys;
  let lo = 0;
  let hi = xs.length - 1;
  if (x <= xs[0] || x >= xs[hi]) return null;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const y0 = ys[lo];
  const y1 = ys[hi];
  if (!Number.isFinite(y0) || !Number.isFinite(y1)) return null;
  const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return y0 + (y1 - y0) * t;
}

export { SERIES };

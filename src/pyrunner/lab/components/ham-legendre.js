/* =========================================================================
 * lab 组件：ham-legendre —— 勒让德变换：函数与它的切线族互为对偶
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "ham-legendre",
 *     "title": "拖点看切线：斜率变成新自变量，截距变成新函数",
 *     "m": 1,
 *     "b": 0.25
 *   }
 *   ```
 *
 * 最小 spec（只有 type + title）也能渲染：m = 1、b = 0.25、v = 0.9。
 *
 * 字段：
 *   m   二次项系数（质量）  0.4..2，默认 1
 *   b   四次项系数（非线性）0..0.5，默认 0.25
 *   v   初始切点位置 −1.6..1.6，默认 0.9
 *
 * 能拖什么：
 *   **左图里左右拖** = 挪切点 v（切线的斜率 p = f′(v) 跟着变）；
 *   **右图里左右拖** = 挪对偶点 p（切点位置由 p 反解回来）。两边是同一件事。
 *
 * 看什么：
 *   左图：粗线是 f(v) = ½mv² + ¼bv⁴；橙虚线是它在 v 处的切线，斜率就是 p；
 *         灰虚线是过原点的直线 y = pv。曲线与直线在 v 处的**竖直间隙**
 *         恰好等于 pv − f(v) —— 那就是右图那个点的高度 f*(p)。
 *   右图：f*(p) = max_v (pv − f(v))，凸共轭。b = 0 时它是 p²/(2m)，与 f 同形；
 *         b > 0 时右图明显比左图"矮胖"，这是非线性带来的对偶形变。
 *   两条只读结论：间隙最大的地方正是切点（"max" 的含义）；
 *   左图那一族淡淡的切线，它们的**包络**就是 f 自己。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, bindPointer, label, polyline,
  fmt, clamp,
} from '../core.js';

const VMAX = 1.6;      /* 自变量 v 的显示半宽 */
const FAMILY = 13;     /* 背景切线族画几条 */
const SAMPLES = 160;   /* 曲线采样点数 */

function fOf(v, m, b) {
  return 0.5 * m * v * v + 0.25 * b * v * v * v * v;
}

function dfOf(v, m, b) {
  return m * v + b * v * v * v;
}

/* 由 p 反解 v：df 关于 v 严格单调（m > 0、b ≥ 0），二分 60 次足够精确 */
function vOf(p, m, b) {
  let lo = -VMAX * 3;
  let hi = VMAX * 3;
  for (let i = 0; i < 60; i += 1) {
    const mid = 0.5 * (lo + hi);
    if (dfOf(mid, m, b) < p) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/* f*(p) = p·v − f(v)，v 是切点 —— 直接照定义算，不做解析简化 */
function fStar(p, m, b) {
  const v = vOf(p, m, b);
  return p * v - fOf(v, m, b);
}

/* 滑块规格：默认值 ← spec 顶层同名字段 ← spec.sliders 里的同名项（后者优先） */
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

export default function render(host, spec) {
  const sl = buildSliders(
    {
      sliders: mergeSpec([
        { name: 'm', label: '二次项 m', min: 0.4, max: 2, step: 0.05, value: 1, fmt: 2 },
        { name: 'b', label: '四次项 b', min: 0, max: 0.5, step: 0.01, value: 0.25, fmt: 2 },
      ], spec),
    },
    (st) => { m = st.m; b = st.b; draw(); },
  );
  let m = sl.state.m;
  let b = sl.state.b;
  let v = clamp(typeof spec.v === 'number' ? spec.v : 0.9, -VMAX, VMAX);

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({
    切点: '—', 斜率: '—', 'f(v)': '—', 'f*(p)': '—', 恒等式: '—',
  });
  host.appendChild(ro.box);

  const geo = { lx: 0, ly: 0, lw: 0, lh: 0, rx: 0, ry: 0, rw: 0, rh: 0 };
  let yMax = 1;

  const sx = (val) => geo.lx + ((val + VMAX) / (2 * VMAX)) * geo.lw;
  const sy = (val) => geo.ly + geo.lh - (val / yMax) * geo.lh;

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const pMax = dfOf(VMAX, m, b);
    const fsMax = Math.max(fStar(pMax, m, b), 1e-6);
    yMax = Math.max(fOf(VMAX, m, b), pMax * VMAX) * 1.08;

    const pad = 30;
    const gap = 26;
    const lw = (W - pad * 2 - gap) / 2;
    geo.lx = pad;
    geo.lw = lw;
    geo.rx = pad + lw + gap;
    geo.rw = lw;
    geo.ly = 26;
    geo.ry = 26;
    geo.lh = H - geo.ly - 42;
    geo.rh = geo.lh;

    const p0 = dfOf(v, m, b);
    const f0 = fOf(v, m, b);
    const fs0 = fStar(p0, m, b);
    const rpx = (p) => geo.rx + (p / pMax) * geo.rw;
    const rpy = (f) => geo.ry + geo.rh - (f / (fsMax * 1.06)) * geo.rh;

    /* ---------- 左图：f(v) 与它的切线族 ---------- */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(geo.lx, sy(0) + 0.5);
    ctx.lineTo(geo.lx + geo.lw, sy(0) + 0.5);
    ctx.moveTo(sx(0) + 0.5, geo.ly);
    ctx.lineTo(sx(0) + 0.5, geo.ly + geo.lh);
    ctx.stroke();

    const curve = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const vv = -VMAX + (2 * VMAX * i) / SAMPLES;
      curve.push([sx(vv), sy(fOf(vv, m, b))]);
    }

    /* 背景切线族：这一族线的包络就是 f 自己 */
    for (let j = 0; j < FAMILY; j += 1) {
      const vj = -VMAX + (2 * VMAX * j) / (FAMILY - 1);
      const pj = dfOf(vj, m, b);
      const fj = fOf(vj, m, b);
      const a = [-VMAX, fj + pj * (-VMAX - vj)];
      const c = [VMAX, fj + pj * (VMAX - vj)];
      polyline(ctx, [[sx(a[0]), sy(a[1])], [sx(c[0]), sy(c[1])]], C.grid, 1);
    }

    /* 直线 y = p v 与它和曲线之间的间隙 */
    const linePts = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const vv = -VMAX + (2 * VMAX * i) / SAMPLES;
      linePts.push([sx(vv), sy(Math.max(0, p0 * vv))]);
    }
    polyline(ctx, linePts, C.axis, 1.5, [5, 4]);

    if (fs0 > 1e-6) {
      polyline(ctx, [[sx(v), sy(f0)], [sx(v), sy(p0 * v)]], C.named('green'), 3.5);
      label(ctx, `间隙 = f*(p) = ${fmt(fs0, 3)}`, clamp(sx(v) + 6, geo.lx, geo.lx + geo.lw - 120),
        (sy(f0) + sy(p0 * v)) / 2, C.named('green'), { size: 11, weight: 600 });
    }

    polyline(ctx, curve, C.accent, 2.5);
    const tanPts = [
      [sx(-VMAX), sy(f0 + p0 * (-VMAX - v))],
      [sx(VMAX), sy(f0 + p0 * (VMAX - v))],
    ];
    polyline(ctx, tanPts, C.accent2, 2, [7, 5]);

    /* 切点与它的两条投影虚线 */
    ctx.save();
    ctx.strokeStyle = C.accent2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(sx(v), sy(f0));
    ctx.lineTo(sx(v), sy(0));
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(sx(v), sy(f0), 5, 0, Math.PI * 2);
    ctx.fill();

    label(ctx, 'f(v)', geo.lx + 2, geo.ly + 12, C.accent, { size: 11, weight: 600 });
    label(ctx, `切线斜率 p = ${fmt(p0, 3)}`, geo.lx + 2, geo.ly + 26, C.accent2, { size: 11 });
    label(ctx, '直线 y = pv', geo.lx + 2, geo.ly + 40, C.axis, { size: 11 });
    label(ctx, `v = ${fmt(v, 3)}`, sx(v), geo.ly + geo.lh + 14, C.fg, { size: 11, align: 'center' });
    label(ctx, '左图：拖它改切点', geo.lx, H - 6, C.axis, { size: 11 });

    /* ---------- 右图：共轭函数 f*(p) ---------- */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(geo.rx, rpy(0) + 0.5);
    ctx.lineTo(geo.rx + geo.rw, rpy(0) + 0.5);
    ctx.moveTo(geo.rx + 0.5, geo.ry);
    ctx.lineTo(geo.rx + 0.5, geo.ry + geo.rh);
    ctx.stroke();

    const dual = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const pp = (pMax * i) / SAMPLES;
      dual.push([rpx(pp), rpy(fStar(pp, m, b))]);
    }
    polyline(ctx, dual, C.accent2, 2.5);

    ctx.save();
    ctx.strokeStyle = C.accent;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(rpx(p0), rpy(fs0));
    ctx.lineTo(rpx(p0), rpy(0));
    ctx.moveTo(rpx(p0), rpy(fs0));
    ctx.lineTo(geo.rx, rpy(fs0));
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(rpx(p0), rpy(fs0), 5, 0, Math.PI * 2);
    ctx.fill();

    label(ctx, 'f*(p)', geo.rx + 4, geo.ry + 12, C.accent2, { size: 11, weight: 600 });
    label(ctx, `p = f′(v) = ${fmt(p0, 3)}`, rpx(p0), geo.ry + geo.rh + 14,
      C.fg, { size: 11, align: Math.min(1, p0 / pMax) > 0.75 ? 'right' : 'left' });
    label(ctx, '右图：拖它改 p，切点由 p 反解', geo.rx, H - 6, C.axis, { size: 11 });

    ro.set('切点', `v = ${fmt(v, 4)}`);
    ro.set('斜率', `p = f′(v) = ${fmt(p0, 4)}`);
    ro.set('f(v)', fmt(f0, 4));
    ro.set('f*(p)', fmt(fs0, 4));
    ro.set('恒等式', `p·v − f(v) = ${fmt(p0 * v - f0, 4)}（= f*(p)）；p·v − f*(p) = ${fmt(p0 * v - fs0, 4)}（= f(v)）`);
  }

  const invV = (x) => clamp(((x - geo.lx) / geo.lw) * 2 * VMAX - VMAX, -VMAX, VMAX);
  const setFromP = (x) => {
    const pMax = dfOf(VMAX, m, b);
    const p = clamp(((x - geo.rx) / geo.rw) * pMax, 0, pMax);
    v = clamp(vOf(p, m, b), -VMAX, VMAX);
  };

  bindPointer(cv.canvas, {
    pick(x) { return x < geo.rx - 8 ? 'v' : 'p'; },
    down(id, x) { if (id === 'v') v = invV(x); else setFromP(x); draw(); },
    move(id, x) { if (id === 'v') v = invV(x); else setFromP(x); draw(); },
  });

  draw();
  cv.redraw = draw;
  return { slidersBox: sl.box };
}

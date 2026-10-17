/* =========================================================================
 * lab 组件：chain-rule-pipeline —— 扰动穿过两级函数机器（导数 35 / 37 课共用）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "chain-rule-pipeline", "mode": "chain",
 *     "title": "扰动穿过两级机器", "x": 0.6, "dx": 0.8 }
 *   ```
 *   ```lab
 *   { "type": "chain-rule-pipeline", "mode": "implicit",
 *     "title": "拖着点走圆：切线自己转", "shape": "circle", "r": 2.5 }
 *   ```
 *
 * mode = 'chain'（链式法则）：
 *   上半屏是流水线 x →(机器 g)→ u →(机器 f)→ y，三张数值卡各带一段
 *   「扰动的尺子」；机器格里画 g、f 的局部图，切线（导数 ×1）与割线
 *   （实际步长比）同框。下半屏用两杆秤对账：实测 Δu/Δx、Δy/Δu、Δy/Δx
 *   对切线预测 g′(x)、f′(u)、g′·f′——把 Δx 拖小，两杆秤自动合拢。
 *   字段 x / dx 覆盖初值；「Δx ÷ 2」等按钮直达极限。
 *
 * mode = 'implicit'（隐函数求导）：
 *   拖着约束点 P 沿曲线走（圆 x²+y²=r² 或双曲线 xy=k），切线跟着转，
 *   读数条同步给出 y′ = −x/y —— 而且全程没有解出过 y。点到 y = 0 附近
 *   分母归零，切线当场立成竖直。字段 shape / r 覆盖初值。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented, buildReadout,
  anim, mkBtn, buildToolbar, label, polyline, arrow, fmt, clamp, setSliderRow,
  mergeSpec, clearBg,
} from '../core.js';

/* 圆角矩形（自绘，避免依赖 ctx.roundRect 的浏览器支持） */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/* ---------- 链式法则的两个常用配方 ---------- */

const CHAIN_PRESETS = [
  {
    value: 'linear-cube',
    label: '(2x+1)³',
    gText: 'u = 2x + 1',
    gSlopeText: 'g′(x) = 2',
    fText: 'y = u³',
    fSlopeText: 'f′(u) = 3u²',
    g: (x) => 2 * x + 1,
    dg: () => 2,
    f: (u) => u * u * u,
    df: (u) => 3 * u * u,
  },
  {
    value: 'quad-cube',
    label: '(x²+1)³',
    gText: 'u = x² + 1',
    gSlopeText: 'g′(x) = 2x',
    fText: 'y = u³',
    fSlopeText: 'f′(u) = 3u²',
    g: (x) => x * x + 1,
    dg: (x) => 2 * x,
    f: (u) => u * u * u,
    df: (u) => 3 * u * u,
  },
];

/* =========================================================================
 * 模式一：链式法则流水线
 * ========================================================================= */

function renderChain(host, spec) {
  let presetIdx = Math.max(0, CHAIN_PRESETS.findIndex((p) => p.value === spec.preset));
  if (!(presetIdx >= 0)) presetIdx = 0;

  const cv = setupCanvas(host, 430);
  cv.canvas.style.touchAction = 'none';

  let sl = null;
  const FLOW_Y = 40;
  const FLOW_H = 146;

  /* 机器格里的局部函数图：曲线 + 割线（实际步长比）+ 切线（导数预测） */
  function miniGraph(ctx, C, box, P, kind, lo, hi, p0, p1) {
    const inner = { x: box.x + 8, y: box.y + 58, w: box.w - 16, h: box.h - 66 };
    if (inner.w < 40 || inner.h < 30) return;
    const fn = kind === 'g' ? P.g : P.f;
    const d = kind === 'g' ? P.dg : P.df;
    const n = 60;
    const pts = [];
    let vmin = Infinity;
    let vmax = -Infinity;
    for (let i = 0; i <= n; i += 1) {
      const t = lo + ((hi - lo) * i) / n;
      const v = fn(t);
      if (!isFinite(v)) continue;
      pts.push([t, v]);
      vmin = Math.min(vmin, v);
      vmax = Math.max(vmax, v);
    }
    if (!pts.length || vmax - vmin < 1e-9) return;
    const pad = (vmax - vmin) * 0.18 + 1e-6;
    vmin -= pad;
    vmax += pad;
    const sx = (t) => inner.x + ((t - lo) / (hi - lo)) * inner.w;
    const sy = (v) => inner.y + inner.h - ((v - vmin) / (vmax - vmin)) * inner.h;

    ctx.save();
    roundRect(ctx, inner.x, inner.y, inner.w, inner.h, 5);
    ctx.clip();
    polyline(ctx, pts.map(([t, v]) => [sx(t), sy(v)]), C.accent, 1.6);
    /* 割线：连接 (p0, fn(p0)) 与 (p1, fn(p1))——它测的就是"实际放大倍率" */
    polyline(ctx, [[sx(p0), sy(fn(p0))], [sx(p1), sy(fn(p1))]], C.accent2, 2);
    /* 切线：在 p0 处以导数 d(p0) 出发 */
    const v0 = fn(p0);
    const m = d(p0);
    const span = hi - lo;
    polyline(ctx, [
      [sx(p0 - span), sy(v0 - m * span)],
      [sx(p0 + span), sy(v0 + m * span)],
    ], C.named('red'), 1.4, [5, 4]);
    /* 两端点 */
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(sx(p0), sy(v0), 3.2, 0, Math.PI * 2);
    ctx.arc(sx(p1), sy(fn(p1)), 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    roundRect(ctx, inner.x, inner.y, inner.w, inner.h, 5);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
    label(ctx, kind === 'g' ? '切线 g′(x)' : '切线 f′(u)', inner.x + 3, inner.y + inner.h - 4,
      C.named('red'), { size: 9.5 });
    label(ctx, kind === 'g' ? '割线 Δu/Δx' : '割线 Δy/Δu', inner.x + inner.w - 3, inner.y + inner.h - 4,
      C.accent2, { size: 9.5, align: 'right' });
  }

  /* 数值卡：标题 + 大数 + 「扰动的尺子」（|Δ| 取对数刻度的长度） */
  function valueCard(ctx, C, box, title, value, delta, color) {
    ctx.save();
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fillStyle = C.soft;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    label(ctx, title, box.x + 10, box.y + 20, C.axis, { size: 11.5, weight: 600 });
    label(ctx, fmt(value, 3), box.x + 10, box.y + 52, color, { size: 20, weight: 700 });
    const mag = Math.abs(delta);
    const len = mag < 1e-9 ? 2 : 10 + 30 * clamp((Math.log10(mag) + 3) / 3, 0, 1);
    const bx = box.x + box.w - 22;
    const by = box.y + box.h - 14;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by - len);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'Δ = ' + (delta >= 0 ? '+' : '') + fmt(delta, 3),
      box.x + box.w - 6, box.y + 34, color, { size: 10, align: 'right' });
    label(ctx, '扰动尺', bx - 5, by - len - 4, C.axis, { size: 9.5, align: 'right' });
  }

  /* 半屏账本的一行：实测条 + 预测刻度，同一条零线上比长短 */
  function ratioRow(ctx, C, x, y, w, name, meas, pred) {
    const tx = x + 108;
    const tw = Math.max(w - 108 - 150, 70);
    const mv = isFinite(meas) ? meas : 0;
    const maxV = Math.max(Math.abs(mv), Math.abs(pred), 1e-9) * 1.15;
    const map = (v) => tx + tw * (v / (2 * maxV) + 0.5);
    const mid = map(0);
    label(ctx, name, x, y + 4, C.fg, { size: 12, weight: 600 });
    ctx.save();
    ctx.fillStyle = C.soft;
    roundRect(ctx, tx, y - 4, tw, 10, 5);
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = C.accent;
    const mx = map(mv);
    ctx.fillRect(Math.min(mid, mx), y - 4, Math.max(Math.abs(mx - mid), 1.5), 10);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = C.named('orange');
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(map(pred), y - 8);
    ctx.lineTo(map(pred), y + 10);
    ctx.stroke();
    ctx.restore();
    label(ctx, '实测 ' + (isFinite(meas) ? fmt(meas, 2) : '—') + ' · 预测 ' + fmt(pred, 2),
      x + w, y + 4, C.axis, { size: 11, align: 'right' });
  }

  function draw() {
    if (!sl) return;
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const P = CHAIN_PRESETS[presetIdx];
    const x = sl.state.x;
    const dx = sl.state.dx;
    const u = P.g(x);
    const du = P.g(x + dx) - u;
    const y0 = P.f(u);
    const dy = P.f(u + du) - y0;
    const pred1 = P.dg(x);
    const pred2 = P.df(u);
    const predTot = pred1 * pred2;
    const meas1 = du / dx;
    const meas2 = Math.abs(du) > 1e-12 ? dy / du : NaN;
    const measTot = dy / dx;

    /* 流水线 x →（机器 g）→ u →（机器 f）→ y。
       宽屏排成一行；窄屏分两行（三张数值卡 / 两台机器），免得卡片被压成细条。 */
    const M = 12;
    const wide = W >= 620;
    const machines = [
      {
        title: '机器 g（内层）', text: P.gText, slope: P.gSlopeText, val: pred1, kind: 'g',
        lo: x - Math.max(1, dx + 0.2), hi: x + Math.max(1, dx + 0.2), p0: x, p1: x + dx,
      },
      {
        title: '机器 f（外层）', text: P.fText, slope: P.fSlopeText, val: pred2, kind: 'f',
        lo: u - Math.max(Math.abs(du), 0.6) - 0.4, hi: u + Math.max(Math.abs(du), 0.6) + 0.4,
        p0: u, p1: u + du,
      },
    ];
    function paintMachine(mc, b, withGraph) {
      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fillStyle = C.bg;
      ctx.fill();
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
      label(ctx, mc.title, b.x + 8, b.y + 17, C.axis, { size: 11, weight: 600 });
      label(ctx, mc.text, b.x + 8, b.y + 34, C.fg, { size: 12, weight: 600 });
      label(ctx, '× ' + mc.slope + ' = ' + fmt(mc.val, 2), b.x + 8, withGraph ? b.y + 50 : b.y + 56,
        C.named('red'), { size: 11, weight: 600 });
      if (withGraph) miniGraph(ctx, C, b, P, mc.kind, mc.lo, mc.hi, mc.p0, mc.p1);
      else {
        label(ctx, '局部图请用宽屏看：割线 Δ 与切线在同框对比', b.x + 8, b.y + 82,
          C.axis, { size: 9.5 });
      }
    }

    let machineBottom;
    if (wide) {
      const gap = Math.max(W * 0.018, 7);
      const avail = W - 2 * M - 4 * gap;
      const widths = [0.15, 0.235, 0.13, 0.235, 0.15].map((f) => f * avail);
      const xs = [];
      let cxx = M;
      widths.forEach((wd) => {
        xs.push(cxx);
        cxx += wd + gap;
      });
      valueCard(ctx, C, { x: xs[0], y: FLOW_Y, w: widths[0], h: FLOW_H }, '输入 x', x, dx, C.accent);
      valueCard(ctx, C, { x: xs[2], y: FLOW_Y, w: widths[2], h: FLOW_H }, '中间量 u', u, du, C.named('purple'));
      valueCard(ctx, C, { x: xs[4], y: FLOW_Y, w: widths[4], h: FLOW_H }, '输出 y', y0, dy, C.named('green'));
      paintMachine(machines[0], { x: xs[1], y: FLOW_Y, w: widths[1], h: FLOW_H }, true);
      paintMachine(machines[1], { x: xs[3], y: FLOW_Y, w: widths[3], h: FLOW_H }, true);
      for (let i = 0; i < 4; i += 1) {
        const y = FLOW_Y + FLOW_H / 2;
        arrow(ctx, xs[i] + widths[i] + 2, y, xs[i + 1] - 2, y, C.axis, 1.6, 7);
      }
      label(ctx, '先过内层', xs[1] + widths[1] / 2, FLOW_Y - 6, C.axis, { size: 10.5, align: 'center' });
      label(ctx, '再过外层', xs[3] + widths[3] / 2, FLOW_Y - 6, C.axis, { size: 10.5, align: 'center' });
      machineBottom = FLOW_Y + FLOW_H;
    } else {
      const gap = 8;
      const cw = (W - 2 * M - 2 * gap) / 3;
      const cards = [
        ['输入 x', x, dx, C.accent],
        ['中间量 u', u, du, C.named('purple')],
        ['输出 y', y0, dy, C.named('green')],
      ];
      cards.forEach((cd, i) => valueCard(ctx, C,
        { x: M + i * (cw + gap), y: FLOW_Y, w: cw, h: 92 }, cd[0], cd[1], cd[2], cd[3]));
      label(ctx, '流水线：x →（机器 g）→ u →（机器 f）→ y', M, FLOW_Y - 6, C.axis, { size: 10.5 });
      const my = FLOW_Y + 92 + 16;
      const mw = (W - 2 * M - gap) / 2;
      paintMachine(machines[0], { x: M, y: my, w: mw, h: 92 }, false);
      paintMachine(machines[1], { x: M + mw + gap, y: my, w: mw, h: 92 }, false);
      arrow(ctx, M + cw + 2, FLOW_Y + 46, M + cw + gap - 2, FLOW_Y + 46, C.axis, 1.5, 6);
      arrow(ctx, M + 2 * cw + gap + 2, FLOW_Y + 46, M + 2 * cw + 2 * gap - 2, FLOW_Y + 46, C.axis, 1.5, 6);
      machineBottom = my + 92;
    }

    /* 下半屏：两杆秤 + 总账 */
    const rowGap = wide ? 42 : 36;
    const ly = machineBottom + (wide ? 30 : 22);
    label(ctx, '两级放大倍率：蓝条 = 实测步长比，橙线 = 切线预测', M, ly - 12, C.fg,
      { size: 12, weight: 600 });
    ratioRow(ctx, C, M, ly + 12, W - 2 * M, '第一棒 Δu/Δx', meas1, pred1);
    ratioRow(ctx, C, M, ly + 12 + rowGap, W - 2 * M, '第二棒 Δy/Δu', meas2, pred2);
    ratioRow(ctx, C, M, ly + 12 + 2 * rowGap, W - 2 * M, '总账 Δy/Δx', measTot, predTot);

    const gapTot = Math.abs(predTot) > 1e-12 ? Math.abs(measTot - predTot) / Math.abs(predTot) : 0;
    label(ctx, 'Δy ≈ f′(u)·g′(x)·Δx = ' + fmt(predTot, 3) + ' × ' + fmt(dx, 3)
      + ' = ' + fmt(predTot * dx, 3) + '，实算 Δy = ' + fmt(dy, 3)
      + '（相对差 ' + fmt(gapTot * 100, 1) + '%）',
    M, ly + 12 + 3 * rowGap + 14, C.axis, { size: 11.5 });
    if (gapTot < 0.01) {
      label(ctx, 'Δx 已经足够小：两条账在读数精度内合拢——"沿途相乘"就是这个极限',
        M, ly + 12 + 3 * rowGap + 32, C.named('green'), { size: 11.5, weight: 600 });
    }

    ro.set('第一棒', 'Δu/Δx = ' + fmt(meas1, 3) + ' · g′(x) = ' + fmt(pred1, 3));
    ro.set('第二棒', 'Δy/Δu = ' + fmt(meas2, 3) + ' · f′(u) = ' + fmt(pred2, 3));
    ro.set('总账', 'Δy/Δx = ' + fmt(measTot, 3) + ' · g′·f′ = ' + fmt(predTot, 3));
    ro.set('Δy 对账', '线性预测 ' + fmt(predTot * dx, 3) + ' · 实算 ' + fmt(dy, 3));
  }

  /* ---------- 控件 ---------- */

  const seg = buildSegmented(
    CHAIN_PRESETS.map((p) => ({ value: p.value, label: p.label })),
    CHAIN_PRESETS[presetIdx].value,
    (v) => {
      presetIdx = Math.max(0, CHAIN_PRESETS.findIndex((p) => p.value === v));
      draw();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ 第一棒: '—', 第二棒: '—', 总账: '—', 'Δy 对账': '—' });
  host.appendChild(ro.box);

  const BASE = [
    { name: 'x', label: '输入 x', min: -2, max: 2, step: 0.05, value: 0.6 },
    { name: 'dx', label: '扰动 Δx', min: 0.002, max: 1.2, step: 0.002, value: 0.8 },
  ];
  sl = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => draw());

  const half = mkBtn('Δx ÷ 2');
  half.addEventListener('click', () => {
    setSliderRow(sl, 1, Math.max(sl.state.dx / 2, 0.002), 3, 'dx');
    draw();
  });
  const dbl = mkBtn('Δx × 2');
  dbl.addEventListener('click', () => {
    setSliderRow(sl, 1, Math.min(sl.state.dx * 2, 1.2), 3, 'dx');
    draw();
  });
  host.appendChild(buildToolbar(half, dbl));

  /* 播放：Δx 按几何级数缩向 0——极限过程本身 */
  const ap = anim(host, {
    onTick(dt) {
      const next = Math.max(sl.state.dx * Math.exp(-dt * 2.2), 0.0012);
      setSliderRow(sl, 1, next, 3, 'dx');
      draw();
      if (next <= 0.0013) ap.stop();
    },
    onReset() {
      setSliderRow(sl, 1, 0.8, 3, 'dx');
      draw();
    },
  });

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sl.box,
    destroy() {
      ap.stop();
      cv.redraw = null;
    },
  };
}

/* =========================================================================
 * 模式二：隐函数求导——约束点 + 切线
 * ========================================================================= */

function renderImplicit(host, spec) {
  let kind = spec.shape === 'hyperbola' ? 'hyperbola' : 'circle';

  const cv = setupCanvas(host, 400);
  cv.canvas.style.touchAction = 'none';
  cv.canvas.style.cursor = 'crosshair';

  let sl = null;
  const geo = { x0: 0, y0: 0, w: 0, h: 0, cx: 0, cy: 0, s: 1 };
  const X = (v) => geo.cx + v * geo.s;
  const Y = (v) => geo.cy - v * geo.s;

  function setSliderRange(i, min, max, value, digits, name) {
    const row = sl.box.children[i];
    if (!row) return;
    const input = row.children[1];
    const val = row.children[2];
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    if (val) val.textContent = fmt(value, digits);
    sl.state[name] = value;
  }

  function pointOf() {
    const r = sl.state.r;
    const p = sl.state.p;
    if (kind === 'circle') {
      const th = p * Math.PI * 2;
      return { x: r * Math.cos(th), y: r * Math.sin(th) };
    }
    const x = 0.3 + p * 2.7;
    return { x, y: r / x };
  }

  function slopeOf(pt) {
    if (kind === 'circle') {
      return { m: -pt.x / pt.y, derive: '两边对 x 求导：2x + 2y·y′ = 0', solve: 'y′ = −x/y' };
    }
    return { m: -pt.y / pt.x, derive: '两边对 x 求导：y + x·y′ = 0', solve: 'y′ = −y/x' };
  }

  function draw() {
    if (!sl) return;
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const r = sl.state.r;
    const pt = pointOf();
    const { m, derive, solve } = slopeOf(pt);
    const vertical = !isFinite(m) || Math.abs(pt.y) < 0.06;
    const horizontal = isFinite(m) && Math.abs(m) < 1e-3;
    const view = kind === 'circle' ? r * 1.45 + 0.5 : 3.8;

    const plot = Math.max(Math.min(W * 0.56, H - 84), 170);
    geo.x0 = 10;
    geo.y0 = 34;
    geo.w = plot;
    geo.h = plot;
    geo.cx = geo.x0 + plot / 2;
    geo.cy = geo.y0 + plot / 2;
    geo.s = (plot * 0.9) / (2 * view);

    label(ctx, kind === 'circle' ? '圆 x² + y² = r²：拖着 P 走一圈' : '双曲线 xy = k（右支）：拖着 P 走',
      geo.x0, 18, C.fg, { size: 12, weight: 600 });

    /* 绘图区 */
    ctx.save();
    ctx.beginPath();
    ctx.rect(geo.x0, geo.y0, geo.w, geo.h);
    ctx.clip();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = -4; k <= 4; k += 1) {
      ctx.moveTo(X(k), geo.y0);
      ctx.lineTo(X(k), geo.y0 + geo.h);
      ctx.moveTo(geo.x0, Y(k));
      ctx.lineTo(geo.x0 + geo.w, Y(k));
    }
    ctx.stroke();
    polyline(ctx, [[geo.x0, Y(0)], [geo.x0 + geo.w, Y(0)]], C.axis, 1.2);
    polyline(ctx, [[X(0), geo.y0], [X(0), geo.y0 + geo.h]], C.axis, 1.2);

    /* 曲线本体 */
    const curve = [];
    if (kind === 'circle') {
      for (let i = 0; i <= 140; i += 1) {
        const th = (i / 140) * Math.PI * 2;
        curve.push([X(r * Math.cos(th)), Y(r * Math.sin(th))]);
      }
    } else {
      for (let i = 0; i <= 90; i += 1) {
        const xv = 0.25 + (3.6 - 0.25) * (i / 90);
        curve.push([X(xv), Y(r / xv)]);
      }
    }
    polyline(ctx, curve, C.accent, 2.2);
    if (kind === 'hyperbola') {
      const left = [];
      for (let i = 0; i <= 90; i += 1) {
        const xv = -3.6 + (3.6 - 0.25) * (i / 90);
        left.push([X(xv), Y(r / xv)]);
      }
      polyline(ctx, left, C.accent, 1.4, [5, 4]);
    }

    /* 半径/坐标辅助线 + 切线 */
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(pt.x), Y(pt.y));
    ctx.moveTo(X(pt.x), Y(0));
    ctx.lineTo(X(pt.x), Y(pt.y));
    ctx.moveTo(X(0), Y(pt.y));
    ctx.lineTo(X(pt.x), Y(pt.y));
    ctx.stroke();
    ctx.restore();

    const tl = view * 1.6;
    if (vertical) {
      polyline(ctx, [[X(pt.x), geo.y0], [X(pt.x), geo.y0 + geo.h]], C.named('red'), 2);
    } else {
      polyline(ctx, [
        [X(pt.x - tl), Y(pt.y - m * tl)],
        [X(pt.x + tl), Y(pt.y + m * tl)],
      ], C.named('red'), 2);
    }

    /* 切线上量一段 Δy/Δx：直角三角形直接读斜率 */
    if (!vertical) {
      const d = Math.min(0.9, Math.abs(pt.x) + 0.6);
      const x1 = pt.x + d;
      const y1 = pt.y + m * d;
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = C.named('orange');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X(pt.x), Y(pt.y));
      ctx.lineTo(X(x1), Y(pt.y));
      ctx.lineTo(X(x1), Y(y1));
      ctx.stroke();
      ctx.restore();
      label(ctx, 'Δx', X(pt.x + d / 2), Y(pt.y) + 14, C.named('orange'), { size: 10.5, align: 'center' });
      label(ctx, 'Δy', X(x1) + 6, Y((pt.y + y1) / 2), C.named('orange'), { size: 10.5 });
    }

    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(X(pt.x), Y(pt.y), 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, 'P（拖我）', X(pt.x) + 10, Y(pt.y) - 8, C.named('red'), { size: 11.5, weight: 600 });
    ctx.restore();

    /* 右侧账本：推导链 + 读数 */
    const lx = geo.x0 + plot + 16;
    const lw = W - lx - 10;
    let ly = 48;
    const line = (txt, color, weight, size) => {
      if (lx + 10 > W) return;
      label(ctx, txt, lx, ly, color, { size: size || 12, weight: weight || 400 });
      ly += 22;
    };
    line('约束方程（y 解不出来也没关系）', C.axis, 600, 11.5);
    line(kind === 'circle' ? 'F: x² + y² = ' + fmt(r * r, 2) : 'F: xy = ' + fmt(r, 2), C.fg, 700, 13);
    line(derive, C.fg);
    line(solve + '　（面具舞伴照抄进链环）', C.accent, 600);
    line('当前点 P(' + fmt(pt.x, 2) + ', ' + fmt(pt.y, 2) + ')', C.fg);
    if (vertical) {
      line('y → 0：分母归零，切线竖直', C.named('red'), 700);
      line('此处 dy/dx 爆炸，提问方向到头', C.axis, 400, 11.5);
    } else if (horizontal) {
      line('y′ = ' + fmt(m, 3) + '：切线水平', C.named('green'), 600);
    } else {
      line('y′ = ' + fmt(m, 3) + '（三角形里 Δy/Δx 就是它）', C.named('green'), 600);
    }
    if (kind === 'hyperbola') {
      line('左支同理：公式 −y/x 上下通用', C.axis, 400, 11.5);
    }

    ro.set('约束', kind === 'circle' ? 'x² + y² = ' + fmt(r * r, 2) : 'xy = ' + fmt(r, 2));
    ro.set('点 P', '(' + fmt(pt.x, 2) + ', ' + fmt(pt.y, 2) + ')');
    ro.set('dy/dx', vertical ? '竖直（分母归零）' : fmt(m, 3));
    ro.set('切线', vertical ? '竖直' : horizontal ? '水平' : '斜率 ' + fmt(m, 3));
    ro.set('代数', solve);
  }

  const seg = buildSegmented(
    [{ value: 'circle', label: '圆 x²+y²=r²' }, { value: 'hyperbola', label: '双曲线 xy=k' }],
    kind,
    (v) => {
      kind = v === 'hyperbola' ? 'hyperbola' : 'circle';
      if (kind === 'circle') setSliderRange(0, 1, 4, 2.5, 2, 'r');
      else setSliderRange(0, 0.5, 9, 4, 2, 'r');
      setSliderRange(1, 0, 1, kind === 'circle' ? 0.15 : 0.63, 2, 'p');
      draw();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ 约束: '—', '点 P': '—', 'dy/dx': '—', 切线: '—', 代数: '—' });
  host.appendChild(ro.box);

  const BASE = [
    { name: 'r', label: '半径 r（双曲线里是 k）', min: 1, max: 4, step: 0.25, value: 2.5 },
    { name: 'p', label: '点 P 的位置', min: 0, max: 1, step: 0.01, value: 0.15 },
  ];
  sl = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => draw());
  /* 双曲线做默认形状时，把滑轨换成 k 的量程（圆用 r ∈ [1,4]） */
  if (kind === 'hyperbola') {
    setSliderRange(0, 0.5, 9, clamp(Number(spec.r ?? 4), 0.5, 9), 2, 'r');
    setSliderRange(1, 0, 1, clamp(Number(spec.p ?? 0.63), 0, 1), 2, 'p');
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const inside = x >= geo.x0 && x <= geo.x0 + geo.w && y >= geo.y0 && y <= geo.y0 + geo.h;
      return inside ? 'P' : null;
    },
    move(id, x, y) {
      const wx = (x - geo.cx) / geo.s;
      const wy = (geo.cy - y) / geo.s;
      let p;
      if (kind === 'circle') {
        const th = Math.atan2(wy, wx);
        p = ((th / (Math.PI * 2)) % 1 + 1) % 1;
      } else {
        p = clamp((wx - 0.3) / 2.7, 0, 1);
      }
      setSliderRow(sl, 1, Math.round(p * 100) / 100, 2, 'p');
      draw();
    },
  });

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box, destroy() { cv.redraw = null; } };
}

export default function render(host, spec) {
  if (spec.mode === 'implicit') return renderImplicit(host, spec);
  return renderChain(host, spec);
}

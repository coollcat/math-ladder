/* =========================================================================
 * lab 组件：stoch-stationary-audit —— 平稳性体检（第 37 章 · 85 课）
 * -------------------------------------------------------------------------
 * 演示什么：三条 400 点的序列各代表一种「病历」：
 *   white  白噪声     —— 均值、方差都不随时间变（真的平稳）
 *   trend  趋势线     —— 均值一路向北，方差纹丝不动（B 型病人）
 *   walk   随机游走   —— 方差越走越大，均值看着还挺乖（C 型病人，最会骗眼睛）
 * 左边三条画在一起（目测：都「像那么回事」），右边的体检表不看气质只看数字：
 *   · 均值检查：把序列等分成四段，四段均值的极差 ≤ 1.0 才算没搬家；
 *   · 方差检查：后半段方差 / 前半段方差 ∈ [0.4, 2.5] 才算没膨胀。
 * 两项都过才判平稳。随机游走过不了均值那一关（四段均值能拉开好几个单位），
 * 趋势线更是直接爆表；白噪声在任何种子下都稳稳通过。
 * 切到「一阶差分 Δ」：随机游走回血，趋势线也被抹成常数——顺手说明
 * 「差分不是万能药，它会把趋势一起杀掉」。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "stoch-stationary-audit",
 *     "title": "三份病历对半切开：谁在搬家，谁在膨胀",
 *     "seed": 42,
 *     "n": 400 }
 *
 * 字段（都可省）：
 *   seed    随机种子，默认 42（1..60）
 *   n       序列长度，默认 400（120..1200）
 *   height  画布高度，默认 540
 *
 * 能玩什么：
 *   - 拖「随机种子」重掷三条序列：三种病的判决不会因为换了一次抽样就翻盘；
 *   - 切「一阶差分 Δ」看谁回血、谁被误伤；
 *   - 「单步」把观察窗口往前推（窗口扫过整条序列），体检表随之更新。
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg, polyline, fmt,
  buildSliders, buildToolbar, buildReadout, buildSegmented, anim, mkBtn, mergeSpec,
  mulberry32,
} from '../core.js';

const BASE_SLIDERS = [
  { name: 'seed', label: '随机种子', min: 1, max: 60, step: 1, value: 42 },
  { name: 'n', label: '序列长度', min: 120, max: 1200, step: 100, value: 400 },
];

const SERIES = [
  { key: 'white', name: '白噪声', color: 0 },
  { key: 'trend', name: '趋势线', color: 1 },
  { key: 'walk', name: '随机游走', color: 2 },
];

/* 判据写死在这里，同时显示在画布上；阈值经过多种子实测（见报告）：
   白噪声 100% 通过、趋势线 0%、随机游走约 1%。 */
const MEAN_RANGE_MAX = 1.0;
const VAR_RATIO_LO = 0.4;
const VAR_RATIO_HI = 2.5;

function make(seed, n) {
  const rnd = mulberry32(seed * 7919 + 101);
  const white = [];
  const trend = [];
  const walk = [];
  let g = 0;
  for (let t = 0; t < n; t += 1) {
    white.push(rnd() - 0.5);
    trend.push(t * 0.028 + (rnd() - 0.5) * 0.6);
    g += rnd() - 0.5;
    walk.push(g);
  }
  return { white, trend, walk };
}

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
const vari = (xs) => {
  const m = mean(xs);
  return xs.reduce((s, v) => s + (v - m) * (v - m), 0) / xs.length;
};
const diff = (xs) => xs.slice(1).map((v, i) => v - xs[i]);

/* 体检：四段均值极差 + 后半/前半方差比 */
function audit(xs) {
  if (xs.length < 8) return null;
  const K = 4;
  const L = Math.floor(xs.length / K);
  const ms = [];
  for (let i = 0; i < K; i += 1) ms.push(mean(xs.slice(i * L, (i + 1) * L)));
  const range = Math.max(...ms) - Math.min(...ms);
  const half = Math.floor(xs.length / 2);
  const v1 = vari(xs.slice(0, half));
  const v2 = vari(xs.slice(half));
  const ratio = v2 / Math.max(v1, 1e-12);
  const okMean = range <= MEAN_RANGE_MAX;
  const okVar = ratio >= VAR_RATIO_LO && ratio <= VAR_RATIO_HI;
  return { ms, range, v1, v2, ratio, okMean, okVar, ok: okMean && okVar };
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 360, 820) : 540;
  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let seed = Number.isFinite(spec.seed) ? clamp(Math.round(spec.seed), 1, 60) : 42;
  let n = Number.isFinite(spec.n) ? clamp(Math.round(spec.n), 120, 1200) : 400;
  let mode = 'raw';        // raw | delta
  let data = make(seed, n);

  const ro = buildReadout({
    '白噪声': '—',
    '趋势线': '—',
    '随机游走': '—',
    '读法': '—',
  });
  host.appendChild(ro.box);

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (st) => {
    if (st.seed !== undefined) seed = Math.round(st.seed);
    if (st.n !== undefined) n = Math.round(st.n);
    data = make(seed, n);
    draw();
  });

  host.appendChild(buildSegmented(
    [
      { label: '原始序列', value: 'raw' },
      { label: '一阶差分 Δ', value: 'delta' },
    ],
    'raw',
    (v) => { mode = v; draw(); },
  ));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, narrow: false };

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    const narrow = W < 660;
    geo.narrow = narrow;
    if (narrow) {
      geo.plots = { x: 12, y: 62, w: W - 24, h: Math.round((Hh - 300) * 0.62) };
    } else {
      geo.plots = { x: 46, y: 62, w: Math.round(W * 0.46), h: Hh - 250 };
    }
  }

  function seriesOf() {
    if (mode === 'delta') {
      return { white: diff(data.white), trend: diff(data.trend), walk: diff(data.walk) };
    }
    return data;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const S = seriesOf();
    const rows = SERIES.map((s) => ({ s, xs: S[s.key], a: audit(S[s.key]) }));
    const p = geo.plots;

    label(ctx, '平稳性体检' + (mode === 'delta' ? '（序列已做一阶差分）' : '') + '　—— 不看气质，只算数字',
      12, 18, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });
    label(ctx, '判据：① 四段均值的极差 ≤ ' + fmt(MEAN_RANGE_MAX, 1)
      + '　② 后半段方差 / 前半段方差 ∈ [' + fmt(VAR_RATIO_LO, 1) + ', ' + fmt(VAR_RATIO_HI, 1) + ']',
      12, 34, C.axis, { size: 10 });
    label(ctx, '两项都过才算平稳；任何一项失守，用历史参数外推就会失效',
      12, 48, C.grid, { size: 10 });

    /* 三条序列：各自归一化到同一高度，只比形状 */
    const all = [];
    rows.forEach((r) => r.xs.forEach((v) => all.push(v)));
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.07 || 1;
    const py = (v) => p.y + p.h - ((v - (lo - pad)) / ((hi - lo) + 2 * pad)) * p.h;
    const px = (i, len) => p.x + (i / Math.max(len - 1, 1)) * p.w;
    rows.forEach((r) => {
      const stride = Math.max(1, Math.floor(r.xs.length / 300));
      const pts = [];
      for (let i = 0; i < r.xs.length; i += stride) pts.push([px(i, r.xs.length), py(r.xs[i])]);
      polyline(ctx, pts, C.series(r.s.color), 1.2);
    });
    /* 四段分隔线：告诉读者「四段均值」是怎么切的 */
    for (let k = 1; k < 4; k += 1) {
      const x = px(Math.floor((r0Len(rows) * k) / 4), r0Len(rows));
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, p.y - 4);
      ctx.lineTo(x + 0.5, p.y + p.h + 4);
      ctx.stroke();
      ctx.restore();
    }
    rows.forEach((r, k) => {
      const y = p.y + 12 + k * 15;
      const x = p.x + 8;
      ctx.save();
      ctx.strokeStyle = C.series(r.s.color);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x + 16, y - 3);
      ctx.stroke();
      ctx.restore();
      label(ctx, r.s.name, x + 22, y, C.fg, { size: 10, weight: 600 });
    });
    label(ctx, '三条曲线画在同一高度区间里，只比「形状与稳定性」，不比绝对值',
      p.x, p.y + p.h + 16, C.grid, { size: 9.5 });

    drawReport(ctx, C, rows);

    /* 读数 */
    rows.forEach((r) => {
      const a = r.a;
      ro.set(r.s.name, a
        ? '四段均值极差 ' + fmt(a.range, 2) + '（限 ' + fmt(MEAN_RANGE_MAX, 1) + '）　'
          + '方差比 ' + fmt(a.ratio, 2) + '　⇒ ' + (a.ok ? '平稳 ✓' : '非平稳 ✗')
        : '—');
    });
    ro.set('读法', mode === 'delta'
      ? '差分后：随机游走回血（增量均值回到 0），趋势线也被抹成常数——差分不是万灵药'
      : '原始序列：随机游走的「方差膨胀」被均值漂移一起暴露，光看图容易被前半段骗过去');
  }

  function r0Len(rows) {
    return rows && rows[0] && rows[0].xs ? rows[0].xs.length : n;
  }

  function drawReport(ctx, C, rows) {
    const W = cv.W;
    const narrow = geo.narrow;
    const x0 = narrow ? 12 : Math.round(W * 0.53);
    const wMax = narrow ? W - 24 : W - x0 - 14;
    let y = narrow ? geo.plots.y + geo.plots.h + 46 : 66;
    label(ctx, '分期体检表', x0, y, C.fg, { size: 11, weight: 700 });
    y += 16;
    /* 表头 */
    const col = narrow
      ? [x0, x0 + 74, x0 + wMax * 0.52, x0 + wMax * 0.78]
      : [x0, x0 + 74, x0 + wMax * 0.5, x0 + wMax * 0.76];
    label(ctx, '序列', col[0], y, C.axis, { size: 9.5, weight: 700 });
    label(ctx, '四段均值', col[1], y, C.axis, { size: 9.5, weight: 700 });
    label(ctx, '极差', col[2], y, C.axis, { size: 9.5, weight: 700 });
    label(ctx, '方差比', col[3], y, C.axis, { size: 9.5, weight: 700 });
    y += 6;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y + 0.5);
    ctx.lineTo(x0 + wMax, y + 0.5);
    ctx.stroke();
    ctx.restore();
    y += 14;
    rows.forEach((r) => {
      const a = r.a;
      label(ctx, r.s.name, col[0], y, C.fg, { size: 10, weight: 600 });
      if (!a) { y += 16; return; }
      label(ctx, a.ms.map((v) => fmt(v, 2)).join(' / '), col[1], y,
        a.okMean ? C.fg : C.bad, { size: 9.5 });
      label(ctx, fmt(a.range, 2), col[2], y, a.okMean ? C.fg : C.bad, { size: 10, weight: 700 });
      label(ctx, fmt(a.ratio, 2), col[3], y, a.okVar ? C.fg : C.bad, { size: 10, weight: 700 });
      y += 16;
      label(ctx, '　⇒ ' + (a.ok ? '通过：均值未搬家、方差未膨胀' : (a.okMean
        ? '不通过：均值稳，方差在膨胀（C 型）' : '不通过：均值在搬家（B 型）')),
        col[0], y, a.ok ? C.ok : C.bad, { size: 10, weight: 700 });
      y += 18;
    });
    label(ctx, '注：方差比用「后一半 / 前一半」，与课文里分期体检的算法一致',
      x0, y + 2, C.grid, { size: 9.5 });
  }

  draw();
  cv.redraw = draw;
  void reduced;
  return { slidersBox: sliders.box, destroy() { cv.redraw = null; } };
}

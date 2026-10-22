/* =========================================================================
 * lab 组件：stoch-poisson-arrivals —— 泊松到达：计数阶梯 + 等待间隔（第 37 章 · 70 课）
 * -------------------------------------------------------------------------
 * 演示什么：强度 λ 的泊松过程在时间轴上一颗颗「蹦豆」。上半屏是计数过程
 * N(t)——一条只会往上跳的阶梯；下半屏是相邻间隔 T 的样本，每根竖条是一次
 * 等待。两件事在这里同时被看见：
 *   · N(t) 平均斜率为 λ（阶梯在 t 时刻的平均高度 ≈ λt）；
 *   · 间隔 T 服从指数分布，均值为 1/λ，但样本长得极其参差——短的几秒，长的
 *     拖很久，柱子高低差一大截，这就是「指数分布右偏」的样子。
 * 底部再画出经验直方图与理论密度 λe^{−λτ} 的对照（不用装库，纯手算）。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "stoch-poisson-arrivals",
 *     "title": "λ = 20 通/小时：计数阶梯与它参差的间隔",
 *     "lambda": 20,
 *     "hours": 6 }
 *
 * 字段（都可省）：
 *   lambda  强度（每单位时间的平均到达数），默认 20
 *   hours   观察时长，默认 6
 *   seed    随机种子，默认 3
 *   height  画布高度，默认 500
 *
 * 能玩什么：
 *   - 「单步」放出一个新到达（时间轴往前走一段）；
 *   - 拖动「强度 λ」滑块，阶梯立刻变陡或变缓，间隔柱子整体变矮或变高；
 *   - 「重置」用同一颗种子重放，对照「同一条样本」与「换种子后的另一条样本」。
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg, polyline, fmt,
  buildSliders, buildToolbar, buildReadout, anim, mkBtn, mergeSpec,
  mulberry32,
} from '../core.js';

const BASE_SLIDERS = [
  { name: 'lambda', label: '强度 λ（个/小时）', min: 2, max: 60, step: 1, value: 20 },
  { name: 'seed', label: '随机种子', min: 1, max: 20, step: 1, value: 3 },
];

/* 反函数法：U ~ Uniform(0,1) ⟹ −ln(U)/λ ~ Exp(λ)。
   用同一个随机数流，换 λ 只改变尺度，到达的「节奏形状」保持可比。 */
function arrivals(lam, hours, seed) {
  const rnd = mulberry32(seed * 104729 + 17);
  const out = [];
  let t = 0;
  let guard = 0;
  while (t < hours && guard < 5000) {
    const u = Math.max(rnd(), 1e-12);
    t += -Math.log(u) / lam;
    guard += 1;
    if (t < hours) out.push(t);
  }
  return out;
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 340, 780) : 500;
  let lam = Number.isFinite(spec.lambda) ? clamp(spec.lambda, 2, 60) : 20;
  let seed = Number.isFinite(spec.seed) ? clamp(Math.round(spec.seed), 1, 20) : 3;
  const hours = Number.isFinite(spec.hours) ? clamp(spec.hours, 1, 24) : 6;
  let ev = arrivals(lam, hours, seed);
  let shown = ev.length;

  const ro = buildReadout({
    '到达总数': '—',
    '实际强度': '—',
    '平均间隔': '—',
    '最长 / 最短间隔': '—',
  });
  host.appendChild(ro.box);

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (st) => {
    if (st.lambda !== undefined) lam = st.lambda;
    if (st.seed !== undefined) seed = Math.round(st.seed);
    ev = arrivals(lam, hours, seed);
    shown = ev.length;
    draw();
  });

  const bStep = mkBtn('单步放一个到达 ▶');
  const bBack = mkBtn('◀ 收回一个');
  host.appendChild(buildToolbar(bStep, bBack));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, narrow: false };

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    geo.narrow = W < 620;
    geo.x = 46;
    geo.w = W - 68;
    geo.y = 34;
    geo.h = Hh - 128;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const staircaseH = Math.round(geo.h * 0.48);
    const gapH = Math.round(geo.h * 0.46);
    const y0 = geo.y;
    const y1 = geo.y + staircaseH + Math.round(geo.h * 0.06);

    label(ctx, 'λ = ' + fmt(lam, 0) + ' 个/小时，观察 ' + fmt(hours, 0) + ' 小时　ε 期望 E[N(t)] = λt',
      geo.x - 34, 18, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });

    /* ---------- 上：计数过程 N(t) ---------- */
    const tx = (t) => geo.x + (t / hours) * geo.w;
    const maxN = Math.max(ev.length, Math.round(lam * hours), 1);
    const ny = (n) => y0 + staircaseH - (n / (maxN * 1.05)) * staircaseH;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let k = 0; k <= 4; k += 1) {
      const y = y0 + (staircaseH / 4) * k;
      ctx.beginPath();
      ctx.moveTo(geo.x, y + 0.5);
      ctx.lineTo(geo.x + geo.w, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
    /* 理论斜率 λt 的参考线（虚线） */
    polyline(ctx, [[tx(0), ny(0)], [tx(hours), ny(lam * hours)]], C.named('gray'), 1.4, [5, 4]);
    label(ctx, '参考斜率 λt', tx(hours), ny(lam * hours) - 6, C.named('gray'), { size: 9.5, align: 'right' });

    const pts = [[tx(0), ny(0)]];
    for (let i = 0; i < shown; i += 1) {
      const t = ev[i];
      pts.push([tx(t), ny(i)]);
      pts.push([tx(t), ny(i + 1)]);
    }
    if (shown > 0) pts.push([tx(hours), ny(shown)]);
    polyline(ctx, pts, C.accent, 2.2);
    /* 每一次跳变的落点 */
    for (let i = 0; i < shown; i += 1) {
      ctx.save();
      ctx.fillStyle = C.accent2;
      ctx.beginPath();
      ctx.arc(tx(ev[i]), ny(i + 1), 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    label(ctx, '计数过程 N(t)：只会往上跳，跳一次算一次到达',
      geo.x, y0 - 8, C.axis, { size: 10 });
    label(ctx, 'N = ' + shown, geo.x - 8, ny(shown) + 4, C.accent, { size: 9.5, align: 'right' });

    /* ---------- 下：相邻间隔 T ---------- */
    label(ctx, '相邻间隔 Tᵢ = tᵢ − tᵢ₋₁（竖条）：平均 ' + fmt(60 / lam, 1)
      + ' 分钟，但参差不齐才是常态', geo.x, y1 - 8, C.axis, { size: 10 });
    const gaps = [];
    for (let i = 0; i < shown; i += 1) gaps.push(i === 0 ? ev[0] : ev[i] - ev[i - 1]);
    const maxGap = Math.max(...gaps, 1 / lam * 3);
    const barW = Math.max(Math.min(geo.w / Math.max(gaps.length, 1) * 0.72, 14), 1.4);
    gaps.forEach((g, i) => {
      const x = geo.x + (i / Math.max(gaps.length, 1)) * geo.w;
      const hh = (g / maxGap) * gapH;
      ctx.save();
      ctx.fillStyle = C.series(2);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y1 + gapH - hh, barW, hh);
      ctx.globalAlpha = 1;
      ctx.restore();
    });
    /* 平均间隔参考线 */
    const ay = y1 + gapH - ((1 / lam) / maxGap) * gapH;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(geo.x, ay + 0.5);
    ctx.lineTo(geo.x + geo.w, ay + 0.5);
    ctx.stroke();
    ctx.restore();
    label(ctx, '平均间隔 1/λ = ' + fmt(60 / lam, 1) + ' 分钟', geo.x + geo.w, ay - 5,
      C.named('red'), { size: 9.5, align: 'right' });

    label(ctx, '横轴 = 时间（小时，0 → ' + fmt(hours, 0) + '）',
      geo.x + geo.w, cv.H - 22, C.axis, { size: 10, align: 'right' });
    label(ctx, '无记忆性：已经白等了 s 分钟，接下来要等的分布和从头开始一模一样',
      geo.x - 34, cv.H - 6, C.grid, { size: 10 });

    /* 读数 */
    const last = shown ? ev[shown - 1] : 0;
    const rate = last > 0 ? shown / last : 0;
    const meanGap = gaps.length ? gaps.reduce((s, v) => s + v, 0) / gaps.length : NaN;
    ro.set('到达总数', shown + ' 个（观察 ' + fmt(hours, 0) + ' 小时，期望 ' + fmt(lam * hours, 0) + '）');
    ro.set('实际强度', fmt(rate, 1) + ' 个/小时（理论 ' + fmt(lam, 0) + '）');
    ro.set('平均间隔', Number.isNaN(meanGap) ? '—'
      : fmt(meanGap * 60, 1) + ' 分钟（理论 ' + fmt(60 / lam, 1) + '）');
    const gmin = gaps.length ? Math.min(...gaps) : NaN;
    const gmax = gaps.length ? Math.max(...gaps) : NaN;
    ro.set('最长 / 最短间隔', gaps.length
      ? fmt(gmax * 60, 1) + ' / ' + fmt(gmin * 60, 1) + ' 分钟，相差 '
        + fmt(gmax / Math.max(gmin, 1e-9), 1) + ' 倍'
      : '—');
  }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.18) return;
      acc = 0;
      shown = shown >= ev.length ? 0 : shown + 1;
      draw();
    },
    onReset() { acc = 0; shown = ev.length; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    shown = Math.min(shown + 1, ev.length);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    shown = Math.max(shown - 1, 0);
    draw();
  });

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); cv.redraw = null; } };
}

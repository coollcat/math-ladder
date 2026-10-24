/* =========================================================================
 * lab 组件：ou-density-cloud —— 一团粒子各自走，走出宏观密度的形状
 *                  （第 66 章 · 80 课《Fokker-Planck 方程：样本路径到密度演化》）
 * -------------------------------------------------------------------------
 * 演示什么：Fokker-Planck 说"密度的演化"；这一课把它翻译成"一群各自乱走的粒子"。
 *   OU 过程 dX = -theta(X - mu)dt + sigma dW 有闭式解：
 *     均值  m(t) = mu + (x0 - mu) e^{-theta t}       ← 整团往 mu 收
 *     方差  s(t)^2 = sigma^2/(2theta) (1 - e^{-2 theta t})  ← 先张开，再定在平稳值
 *   上半是 1500 个粒子的直方图（青色的柱），叠一条理论密度曲线（橙线）——
 *   两者越贴，说明"数出来的"和"算出来的"是一回事。
 *   下半是时间轴上的 m(t) 与 ±s(t) 云带：粒子团整体的行军路线。
 *   拖动 "theta"（回复力）与 "sigma"（噪声强度）：
 *     theta 大 → 收得快、平稳分布窄（sd = sigma/sqrt(2theta)）；
 *     sigma 大 → 抖得厉害、平稳分布宽。
 *   把 sigma 拖到 0，粒子再也不抖：密度不扩散，只剩一条竖直的确定性轨道。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "ou-density-cloud",
 *     "title": "theta=2、sigma=1：噪声把粒子团摊成 0.5 宽的云",
 *     "theta": 2, "sigma": 1, "t": 1 }
 *
 * 字段（都可省）：
 *   theta  回复力，默认 2（0.2..8）
 *   sigma  噪声强度，默认 1（0..3）
 *   t      观察时刻，默认 1（0.05..4）
 *   mu     长期均值，默认 3
 *   x0     初始位置，默认 -2
 *   n      粒子数，默认 1500（200..4000）
 *   seed   随机种子，默认 5150
 *   height 画布高度，默认 470
 *
 * 交互（完美教具五问）：
 *   1. 动手量：五个滑块 = theta / sigma / t / n / seed，全是课文 SDE 里的
 *      系数、观察时刻与样本量，不是装饰。
 *   2. 即时后果：拖任何一个滑块，直方图、理论曲线、云带、读数一帧内全部重算。
 *   3. 读数：t 时刻均值 / 实测标准差 / 理论标准差 sigma/sqrt(2theta) /
 *      平稳方差 —— 与课文闭式解的两行公式一一对应。
 *   4. 啊哈预设：「掐断噪声」把 sigma 拖到 0：粒子排成一条竖线，云带宽 0，
 *      理论密度曲线整个消失 —— Fokker-Planck 的扩散项被拿掉后的样子；
 *      「跳到平稳」把 t 拉到 4，均值已贴 mu、sd 贴住 sigma/sqrt(2theta)。
 *   5. 默认状态：theta=2、sigma=1、t=1 → 均值 2.3233、标准差 0.4954，
 *      与课文表格里那一行逐位相同；平稳标准差 0.5000。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, setSliderRow, buildToolbar,
  buildReadout, mkBtn, label, clearBg, clamp, fmt, mulberry32, gaussOf,
  polyline,
} from '../core.js';

/* seed 取 50 而不是 5150：滑块上限是 99，写 5150 会被 clamp 成 99，
   于是「初始读数」用 99、「回到课文示例」用 5150，同一个按钮按一次读数就变，
   滑块还显示 99——两套口径打架。用一个合法值，两边就永远一致。 */
const BASE = { theta: 2, sigma: 1, t: 1, mu: 3, x0: -2, n: 1500, seed: 50 };

export default function render(host, spec) {
  const st = {
    theta: clamp(Number(spec.theta) || BASE.theta, 0.2, 8),
    sigma: spec.sigma === 0 ? 0 : clamp(Number(spec.sigma) || BASE.sigma, 0, 3),
    t: clamp(Number(spec.t) || BASE.t, 0.05, 4),
    mu: clamp(spec.mu === undefined ? BASE.mu : Number(spec.mu), -4, 6),
    x0: clamp(spec.x0 === undefined ? BASE.x0 : Number(spec.x0), -6, 4),
    n: clamp(Math.round(Number(spec.n) || BASE.n), 200, 4000),
    seed: clamp(Math.round(Number(spec.seed) || BASE.seed), 1, 99),
    showTheory: true,
  };

  const cv = setupCanvas(host, clamp(spec.height || 470, 380, 760));
  const ro = buildReadout({
    '均值 m(t)': '—', '实测 sd': '—', '理论 sd': '—', '平稳 sd': '—',
  });
  host.appendChild(ro.box);

  const bFlat = mkBtn('掐断噪声（sigma=0）');
  const bStat = mkBtn('跳到平稳（t=4）');
  const bReset = mkBtn('回到课文示例');
  const bTheory = mkBtn('隐藏理论曲线');
  host.appendChild(buildToolbar(bFlat, bStat, bReset, bTheory));

  const sl = buildSliders({
    sliders: [
      { name: 'theta', label: '回复力 theta', min: 0.2, max: 8, step: 0.1, value: st.theta, fmt: 1 },
      { name: 'sigma', label: '噪声 sigma', min: 0, max: 3, step: 0.1, value: st.sigma, fmt: 1 },
      { name: 't', label: '时刻 t', min: 0.05, max: 4, step: 0.05, value: st.t, fmt: 2 },
      { name: 'n', label: '粒子数 n', min: 200, max: 4000, step: 100, value: st.n },
      { name: 'seed', label: '随机种子', min: 1, max: 99, step: 1, value: st.seed },
    ],
  }, (s) => {
    st.theta = s.theta;
    st.sigma = s.sigma;
    st.t = s.t;
    st.n = Math.round(s.n);
    st.seed = Math.round(s.seed);
    draw();
  });
  host.appendChild(sl.box);

  /* 闭式解：均值往 mu 收，方差先张开再定在 sigma²/(2theta)。 */
  function meanAt(t) {
    return st.mu + (st.x0 - st.mu) * Math.exp(-st.theta * t);
  }
  function sdAt(t) {
    const v = (st.sigma * st.sigma) / (2 * st.theta) * (1 - Math.exp(-2 * st.theta * t));
    return Math.sqrt(Math.max(v, 0));
  }
  function densAt(x, t) {
    const m = meanAt(t);
    const s = sdAt(t);
    if (s < 1e-6) return 0;
    return Math.exp(-((x - m) * (x - m)) / (2 * s * s)) / (Math.sqrt(2 * Math.PI) * s);
  }

  /* 粒子样本：OU 的精确转移——一次抽样就到 t，不用逐步积分，
     这样拖动 t 不会改变"同一批平行宇宙"。 */
  function sample() {
    const rnd = mulberry32(st.seed);
    const m = meanAt(st.t);
    const s = sdAt(st.t);
    const out = new Float64Array(st.n);
    for (let i = 0; i < st.n; i += 1) out[i] = m + s * gaussOf(rnd);
    return out;
  }

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const H = cv.H;
    if (W < 40) return;
    clearBg(cv.ctx, W, H, C);
    const ctx = cv.ctx;

    const panTop = 26;
    const panH = Math.round((H - 48) * 0.58);
    const panBot = panTop + panH + 34;
    const panBotH = H - panBot - 16;

    const m = meanAt(st.t);
    const s = sdAt(st.t);
    const xs = sample();

    /* 横轴范围：把 mu、x0、三倍标准差都包进去，拖滑块不跳视窗 */
    const lo = Math.min(st.x0, st.mu, m - 3 * s) - 0.6;
    const hi = Math.max(st.x0, st.mu, m + 3 * s) + 0.6;
    const padL = 40;
    const padR = 16;
    const X = (v) => padL + ((v - lo) / (hi - lo)) * (W - padL - padR);

    label(ctx, 't = ' + fmt(st.t, 2) + ' 时 ' + st.n + ' 个粒子的直方图 vs 理论密度 N(m, s²)',
      12, 18, C.fg, { size: 12, weight: 600 });

    /* ---- 上半：直方图 + 理论密度 ---- */
    /* 先算最大密度：柱高与曲线都按同一把尺子缩，才可比较 */
    const bins = Math.max(12, Math.min(40, Math.round((W - padL - padR) / 22)));
    const counts = new Array(bins).fill(0);
    xs.forEach((v) => {
      const b = Math.floor(((v - lo) / (hi - lo)) * bins);
      if (b >= 0 && b < bins) counts[b] += 1;
    });
    const binW = (hi - lo) / bins;
    const densOf = (c) => c / (st.n * binW);            /* 归一化成密度 */
    const densVals = counts.map(densOf);
    let peak = 0.001;
    densVals.forEach((v) => { if (v > peak) peak = v; });
    if (st.showTheory) {
      for (let i = 0; i <= 120; i += 1) {
        const x = lo + ((hi - lo) * i) / 120;
        const d = densAt(x, st.t);
        if (d > peak) peak = d;
      }
    }

    /* 基线 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL - 6, panTop + panH + 0.5);
    ctx.lineTo(W - padR + 6, panTop + panH + 0.5);
    ctx.stroke();
    ctx.restore();

    counts.forEach((c, i) => {
      if (!c) return;
      const x0 = X(lo + i * binW);
      const x1 = X(lo + (i + 1) * binW);
      const h = (densVals[i] / peak) * (panH - 12);
      ctx.save();
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x0 + 1, panTop + panH - h, Math.max(1, x1 - x0 - 2), h);
      ctx.restore();
    });

    if (st.showTheory && s > 1e-6) {
      const pts = [];
      for (let i = 0; i <= 200; i += 1) {
        const x = lo + ((hi - lo) * i) / 200;
        const d = densAt(x, st.t);
        pts.push([X(x), panTop + panH - (d / peak) * (panH - 12)]);
      }
      polyline(ctx, pts, C.accent2, 2.5);
    }

    /* 均值竖线：整团的重心 */
    ctx.save();
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(X(m), panTop);
    ctx.lineTo(X(m), panTop + panH);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'm(t)=' + fmt(m, 2), X(m) + 4, panTop + 12, C.accent2, { size: 11 });
    label(ctx, 'x0', X(st.x0), panTop + panH - 4, C.fg, { size: 11, align: 'center' });
    label(ctx, 'mu', X(st.mu), panTop + panH + 14, C.fg, { size: 11, align: 'center' });

    /* ---- 下半：m(t) ± s(t) 云带，沿时间轴铺开 ---- */
    const T2 = 4.2;
    const Y = (v) => panBot + panBotH - ((v - lo) / (hi - lo)) * panBotH;
    const band = [];
    for (let i = 0; i <= 160; i += 1) {
      const t = (T2 * i) / 160;
      band.push([t, meanAt(t), sdAt(t)]);
    }
    /* 云带：上边界 + 下边界围出的区域，两条折线夹出来（下边界反序闭合）。
       下半的时间轴是 t ∈ [0, T2] 横跨整个画布，与上半的横轴不是同一把尺子。 */
    const TX = (t) => padL + (t / T2) * (W - padL - padR);
    const upPts = band.map(([t, mm, ss]) => [TX(t), Y(clamp(mm + ss, lo, hi))]);
    const dnPts = band.map(([t, mm, ss]) => [TX(t), Y(clamp(mm - ss, lo, hi))]).reverse();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(upPts[0][0], upPts[0][1]);
    upPts.forEach((p) => ctx.lineTo(p[0], p[1]));
    dnPts.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.20;
    ctx.fill();
    ctx.restore();
    if (st.showTheory) {
      polyline(ctx, band.map(([t, mm]) => [TX(t), Y(clamp(mm, lo, hi))]), C.accent2, 2.5);
    }
    /* 当前位置：一条竖线 + 一个点，读图时眼睛有落点 */
    ctx.save();
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(TX(st.t), panBot);
    ctx.lineTo(TX(st.t), panBot + panBotH);
    ctx.stroke();
    ctx.restore();
    label(ctx, '下半：均值 m(t)（橙）与 ±s(t) 云带（蓝），横轴 t ∈ [0, 4.2]',
      12, panBot - 8, C.fg, { size: 11 });

    /* ---- 读数 ---- */
    let sum = 0;
    let sum2 = 0;
    xs.forEach((v) => { sum += v; sum2 += v * v; });
    const empMean = sum / st.n;
    const empSd = Math.sqrt(Math.max(sum2 / st.n - empMean * empMean, 0));
    const statSd = st.sigma / Math.sqrt(2 * st.theta);
    ro.set('均值 m(t)', fmt(m, 4));
    ro.set('实测 sd', fmt(empSd, 4) + '（' + st.n + ' 个样本）');
    ro.set('理论 sd', fmt(s, 4));
    ro.set('平稳 sd', fmt(statSd, 4) + ' = sigma/sqrt(2*theta)');
  }

  function apply() {
    setSliderRow(sl, 0, st.theta, 1, 'theta');
    setSliderRow(sl, 1, st.sigma, 1, 'sigma');
    setSliderRow(sl, 2, st.t, 2, 't');
    setSliderRow(sl, 3, st.n, undefined, 'n');
    setSliderRow(sl, 4, st.seed, undefined, 'seed');
    draw();
  }

  bFlat.addEventListener('click', () => { st.sigma = 0; apply(); });
  bStat.addEventListener('click', () => { st.t = 4; apply(); });
  bReset.addEventListener('click', () => {
    st.theta = BASE.theta; st.sigma = BASE.sigma; st.t = BASE.t;
    st.n = BASE.n; st.seed = clamp(BASE.seed, 1, 99);
    apply();
  });
  bTheory.addEventListener('click', () => {
    st.showTheory = !st.showTheory;
    bTheory.textContent = st.showTheory ? '隐藏理论曲线' : '显示理论曲线';
    draw();
  });

  cv.redraw = draw;
  draw();

  return {
    destroy() {
      cv.redraw = null;
    },
  };
}

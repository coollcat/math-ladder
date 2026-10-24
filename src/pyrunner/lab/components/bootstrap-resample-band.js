/* =========================================================================
 * lab 组件：bootstrap-resample-band —— 从一堆原始样本里，抖出误差带
 * -------------------------------------------------------------------------
 * 用法（第 38 章《Bootstrap 重采样》）：
 *
 *   { "type": "bootstrap-resample-band", "title": "重采样一万次，看均值怎么晃", "n": 40, "resamples": 800, "level": 0.95 }
 *
 * 字段（都可省，走滑块默认）：
 *   n          原始样本量（10..200，默认 40）
 *   resamples  重采样次数 B（100..2000，步长 100，默认 800）
 *   level      置信水平（0.80..0.99，默认 0.95）
 *   skew       原始样本的偏态（0..1，0=对称，1=长尾，默认 0.55）
 *   height     画布高度，默认 340
 *
 * 演示什么：
 *   上半幅是**一份**原始样本（点落在数轴上）；下半幅是 B 次「有放回抽样」
 *   各自算出的均值。中间那条橙色区间＝重采样均值的分位带。
 *   · 拖 B：点越来越密，带的边界收敛到不再动——这就是「B 够大就行」。
 *   · 拖 level：带变宽变窄，但中心不动。
 *   · 拖 n：带宽按 1/√n 收窄（正文公式），而原始样本的散度几乎没变。
 *   · 「换一份原始样本」：整幅重来，带的边界抖动——bootstrap 只承担
 *     「给定这一份样本」的不确定性，不承担「样本本身抽歪了」的风险。
 *
 * 完美教具五问：
 *   1 动手量：n（样本量）、B（重采样次数）、level（置信水平）、skew（数据形状）
 *     —— 四个都是 bootstrap 流程里真正的自由参数。
 *   2 即时后果：上半幅点云重排、下半幅直方图重铺、橙色带边界一帧内更新。
 *   3 读数：点估计、下界、上界、带宽、以及「1.96·s/√n 的正态近似值」并列，
 *     两个数并列就能看出 bootstrap 什么时候和教科书公式分道扬镳（偏态大时）。
 *   4 啊哈预设：「换一份原始样本」暴露条件性；「n 翻倍」验证 1/√2 收窄律。
 *   5 默认状态：n=40、B=800、level=0.95、skew=0.55 时，重采样均值的 2.5%/97.5%
 *     分位大约夹住点估计，带宽与 1.96·s/√n 同量级但**不对称**——偏态的痕迹。
 *     正文只说「偏态下会不对称」，不写死具体数字。
 *
 * 取数口径：原始样本由 mulberry32(seed) 生成的对数正态混合（skew 控制混合比），
 * 刷新不变；「换一份原始样本」只改 seed。与本章 Python 实验口径一致但随机数
 * 发生器不同，数字接近而不相同——课文里不要写成相等。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildReadout, buildToolbar,
  mkBtn, setSliderRow, label, clamp, fmt, mulberry32, gaussOf,
} from '../core.js';

const BASE = [
  { name: 'n', label: '样本量 n', min: 10, max: 200, step: 5, value: 40 },
  { name: 'resamples', label: '重采样 B', min: 100, max: 2000, step: 100, value: 800 },
  { name: 'level', label: '置信水平', min: 0.8, max: 0.99, step: 0.01, value: 0.95 },
  { name: 'skew', label: '原始样本偏态', min: 0, max: 1, step: 0.05, value: 0.55 },
];

/* 双侧置信水平 → 正态分位 z（二分求 CDF 反函数，1e-6 精度足够读数用） */
function zOf(level) {
  const target = 1 - (1 - level) / 2;
  const erf = (x) => {
    const s = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const poly = ((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592;
    return s * (1 - poly * t * Math.exp(-ax * ax));
  };
  const cdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
  let lo = 0;
  let hi = 4;
  for (let k = 0; k < 48; k += 1) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export default function render(host, spec) {
  const H = clamp(spec.height || 340, 260, 560);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => rebuild());
  const S = () => sliders.state;

  const ro = buildReadout({
    '点估计（均值）': '—',
    '置信区间': '—',
    '带宽': '—',
    '正态近似 1.96·s/√n': '—',
    '重采样次数': '—',
  });
  host.appendChild(ro.box);

  const bNew = mkBtn('换一份原始样本');
  const bDouble = mkBtn('n 翻倍');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bNew, bDouble, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '上排是这一份原始样本；下排是每次「有放回抽 n 个」算出的均值。橙带是这些均值的分位区间——不假设正态，照样有误差带。';
  host.appendChild(hint);

  const cv = setupCanvas(host, H);
  let seed = Math.round(typeof spec.seed === 'number' ? spec.seed : 38);
  let raw = [];        /* 原始样本 */
  let means = [];      /* 重采样均值 */
  let band = { lo: 0, hi: 0 };

  function genRaw() {
    const n = Math.round(S().n);
    const skew = S().skew;
    const rng = mulberry32(seed);
    raw = [];
    for (let i = 0; i < n; i += 1) {
      /* 偏态 = 把一部分样本搬到右尾：skew=0 时是纯对称高斯 */
      const tail = rng() < skew * 0.34;
      const base = 10 + gaussOf(rng) * 2.2;
      raw.push(tail ? base + Math.abs(gaussOf(rng)) * 6 + 2 : base);
    }
  }

  function rebuild() {
    genRaw();
    const n = raw.length;
    const B = Math.round(S().resamples);
    const rng = mulberry32(seed * 7 + 11);
    means = [];
    for (let b = 0; b < B; b += 1) {
      let s = 0;
      for (let i = 0; i < n; i += 1) s += raw[Math.floor(rng() * n)];
      means.push(s / n);
    }
    means.sort((a, b2) => a - b2);
    const a = (1 - S().level) / 2;
    band = {
      lo: means[clamp(Math.floor(a * (B - 1)), 0, B - 1)],
      hi: means[clamp(Math.ceil((1 - a) * (B - 1)), 0, B - 1)],
    };
    draw();
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const C = themeColors();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    if (!raw.length || !means.length) return;

    const padL = 20;
    const padR = 16;
    const n = raw.length;
    const mean = raw.reduce((s, v) => s + v, 0) / n;
    const sd = Math.sqrt(raw.reduce((s, v) => s + (v - mean) * (v - mean), 0) / Math.max(n - 1, 1));
    const lo = Math.min(raw[0], band.lo);
    const hi = Math.max(...raw, band.hi);
    const span = Math.max(hi - lo, 1e-6);
    const x0 = lo - span * 0.06;
    const x1 = hi + span * 0.06;
    const X = (v) => padL + ((v - x0) / (x1 - x0)) * (W - padL - padR);

    /* ---- 上：原始样本 ---- */
    const rowY = 46;
    label(ctx, '原始样本（n = ' + n + '，每点一次观测）', padL, 20, C.fg, { size: 12, weight: 600 });
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, rowY);
    ctx.lineTo(W - padR, rowY);
    ctx.stroke();
    /* 抖动是确定性的：同一份样本刷新后点的位置不变（否则读者会以为样本变了） */
    raw.forEach((v, i) => {
      ctx.fillStyle = C.named('blue');
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(X(v), rowY + (((i * 37) % 7) - 3) * 1.1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    /* 样本均值刻线 */
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(X(mean), rowY - 12);
    ctx.lineTo(X(mean), rowY + 12);
    ctx.stroke();
    label(ctx, 'x̄ = ' + fmt(mean, 2), X(mean), rowY - 16, C.named('red'), { size: 10.5, weight: 600, align: 'center' });

    /* ---- 下：重采样均值的直方图 ---- */
    const histTop = 110;
    const histBot = H - 42;
    const bins = 34;
    const counts = new Array(bins).fill(0);
    means.forEach((m) => {
      const idx = clamp(Math.floor(((m - x0) / (x1 - x0)) * bins), 0, bins - 1);
      counts[idx] += 1;
    });
    const maxC = Math.max(...counts, 1);
    const bw = (W - padL - padR) / bins;
    label(ctx, 'B 次重采样的均值分布（橙带 = 分位区间）', padL, histTop - 12, C.fg, { size: 12, weight: 600 });

    /* 先把带画在底层 */
    ctx.fillStyle = C.named('orange');
    ctx.globalAlpha = 0.16;
    ctx.fillRect(X(band.lo), histTop - 4, Math.max(X(band.hi) - X(band.lo), 1), histBot - histTop + 4);
    ctx.globalAlpha = 1;

    counts.forEach((c, i) => {
      if (!c) return;
      const x = padL + i * bw;
      const h = (c / maxC) * (histBot - histTop - 6);
      const center = x0 + ((i + 0.5) / bins) * (x1 - x0);
      const inBand = center >= band.lo && center <= band.hi;
      ctx.fillStyle = inBand ? C.named('orange') : C.named('gray');
      ctx.globalAlpha = inBand ? 0.85 : 0.45;
      ctx.fillRect(x + 0.5, histBot - h, Math.max(bw - 1, 1), h);
      ctx.globalAlpha = 1;
    });

    /* 带边界竖线 + 点估计 */
    ctx.strokeStyle = C.named('orange');
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 3]);
    [band.lo, band.hi].forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(X(v), histTop - 4);
      ctx.lineTo(X(v), histBot);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(mean), histTop - 8);
    ctx.lineTo(X(mean), histBot);
    ctx.stroke();

    /* 轴：只标带的两个端点与点估计 */
    ctx.fillStyle = C.axis;
    ctx.font = '10.5px monospace';
    ctx.textAlign = 'center';
    [band.lo, mean, band.hi].forEach((v) => {
      ctx.fillText(fmt(v, 2), clamp(X(v), padL + 14, W - padR - 14), H - 24);
    });
    ctx.fillStyle = C.axis;
    ctx.textAlign = 'left';
    ctx.fillText('μ̂ 的重采样分布', padL, H - 8);

    ro.set('点估计（均值）', fmt(mean, 3));
    ro.set('置信区间', '[' + fmt(band.lo, 2) + ', ' + fmt(band.hi, 2) + ']');
    ro.set('带宽', fmt(band.hi - band.lo, 3));
    /* 正态近似要跟着 level 换 z：写死 1.96 会让 80% 那一档的对照数错得离谱 */
    const z = zOf(S().level);
    const zKey = '正态近似 ' + fmt(z, 2) + '·s/√n';
    ro.setKey('正态近似 1.96·s/√n', zKey);
    ro.set(zKey, fmt(z * sd / Math.sqrt(n), 3));
    ro.set('重采样次数', String(means.length));
  }

  bNew.addEventListener('click', () => {
    seed = (seed * 31 + 17) % 100000;
    rebuild();
  });
  bDouble.addEventListener('click', () => {
    const n2 = clamp(Math.round(S().n * 2), 10, 200);
    setSliderRow(sliders, 0, n2, undefined, 'n');
    rebuild();
  });
  bReset.addEventListener('click', () => {
    setSliderRow(sliders, 0, 40, undefined, 'n');
    setSliderRow(sliders, 1, 800, undefined, 'resamples');
    setSliderRow(sliders, 2, 0.95, undefined, 'level');
    setSliderRow(sliders, 3, 0.55, undefined, 'skew');
    seed = 38;
    rebuild();
  });

  rebuild();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      cv.redraw = null;
    },
  };
}

/* =========================================================================
 * lab 组件：pvalue-verdict-lab —— p 值与 α 的拉锯：裁决线就在你手里
 * -------------------------------------------------------------------------
 * 用法（第 38 章《假设检验与 p 值》）：
 *
 *   { "type": "pvalue-verdict-lab", "title": "同一枚硬币，两种判法", "n": 100, "k": 65, "alpha": 0.05 }
 *
 * 字段（都可省，走滑块默认）：
 *   n      抛掷次数（20..200，步长 20，默认 100）
 *   k      观测到的正面数（0..n，默认 65）
 *   alpha  显著性水平（0.005..0.20，默认 0.05）
 *   height 画布高度，默认 300
 *
 * 演示什么：
 *   整幅画是「零假设为真」时正面数的分布（二项分布 B(n, 0.5)）。
 *   · 拖 k：观测值那根橙柱左右滑动，两侧尾巴（p 值）随之涨落；
 *   · 拖 alpha：绿色裁决线在分布边缘进退，临界柱子亮/灭；
 *   · 拖 n：k/n 不变而 n 变大，分布变瘦，同样的比例突然显著——
 *     这正是「p 值不是效应量」的现场。
 *
 * 完美教具五问：
 *   1 动手量：k（观测）、alpha（判据）、n（样本量）——三个都是概念里的自由参数。
 *   2 即时后果：柱状图两侧的阴影面积（p 值）与临界柱的高亮一帧内跟着动。
 *   3 读数：p 值、alpha、判决、临界值——四个数直接对应正文公式。
 *   4 啊哈预设：「挪到临界值」把 k 停在还不显著的最大一格（n=100、alpha=0.05 时是 60，
 *     p=0.0569）；紧接着按「n 翻倍、比例不变」就变成 120/200 ⇔ p≈0.0057，判决翻面 ——
 *     同一个比例，换个样本量，结论就换了。
 *   5 默认状态：n=100、k=65、alpha=0.05 时 p=0.0035，判「拒绝 H0」；
 *     这个数与 python 实跑一致（0.003518），但组件里由 computeP 现算，不写死。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildReadout, buildToolbar,
  mkBtn, setSliderRow, label, clamp, fmt,
} from '../core.js';

const BASE = [
  { name: 'n', label: '抛掷次数 n', min: 20, max: 200, step: 20, value: 100 },
  { name: 'k', label: '正面数 k', min: 0, max: 200, step: 1, value: 65 },
  { name: 'alpha', label: '显著性 α', min: 0.005, max: 0.2, step: 0.005, value: 0.05 },
];

/* 二项分布 B(n, 1/2) 的概率质量：p(0)=2^-n 起步递推，n ≤ 200 不会下溢 */
function pmfTable(n) {
  const out = new Array(n + 1);
  out[0] = Math.pow(0.5, n);
  for (let i = 0; i < n; i += 1) out[i + 1] = out[i] * (n - i) / (i + 1);
  return out;
}

export default function render(host, spec) {
  const H = clamp(spec.height || 300, 220, 520);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => redraw());
  const S = () => sliders.state;
  if (typeof spec.n === 'number') setSliderRow(sliders, 0, clamp(Math.round(spec.n), 20, 200), undefined, 'n');
  if (typeof spec.alpha === 'number') setSliderRow(sliders, 2, clamp(spec.alpha, 0.005, 0.2), undefined, 'alpha');

  const ro = buildReadout({
    '观测比例': '—',
    'p 值（双侧）': '—',
    '显著性 α': '—',
    '判决': '—',
  });
  host.appendChild(ro.box);

  const bNear = mkBtn('挪到临界值');
  const bDouble = mkBtn('n 翻倍，比例不变');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bNear, bDouble, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '柱子是「H0 为真」时正面数的分布；两侧阴影合起来就是 p 值。拖 k 或 alpha，看判决在哪一格翻面。';
  host.appendChild(hint);

  const cv = setupCanvas(host, H);
  const geo = {};

  /* 双侧口径与正文一致：离期望 np 至少 |k−np| 远的所有结果都算进尾巴，
     于是 k=65/100 的 p 就是「至少 65 或至多 35」的概率。 */
  function computeP() {
    const n = Math.round(S().n);
    const k = clamp(Math.round(S().k), 0, n);
    const half = n / 2;
    const dev = Math.abs(k - half);
    const pmf = pmfTable(n);
    let p = 0;
    for (let j = 0; j <= n; j += 1) if (Math.abs(j - half) >= dev - 1e-9) p += pmf[j];
    return { n, k, p: Math.min(1, p), pmf, half };
  }

  /* 临界值 = 最后一个「还不显著」的 k，也就是恰好停在 α 线上的那一格。
     n=100、α=0.05 时它等于 60（p=0.0569，刚过线）；再走一格到 61 就 p=0.0352 判显著。
     取「还不显著」而不是「刚显著」，是因为按钮要停的地方是判决的边界，
     读者再按一下「n 翻倍」才看得到翻面（60/100 不拒绝 → 120/200 拒绝）。 */
  function criticalK(n, alpha) {
    const half = n / 2;
    const pmf = pmfTable(n);
    let last = Math.ceil(half);
    for (let k = Math.ceil(half); k <= n; k += 1) {
      let p = 0;
      const dev = Math.abs(k - half);
      for (let j = 0; j <= n; j += 1) if (Math.abs(j - half) >= dev - 1e-9) p += pmf[j];
      if (p >= alpha) last = k;
    }
    return last;
  }

  function draw() {
    const { n, k, p, pmf, half } = computeP();
    const alpha = S().alpha;
    const ctx = cv.ctx;
    const W = cv.W;
    const C = themeColors();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const padL = 34;
    const padR = 14;
    const padT = 26;
    const padB = 34;
    const plotW = Math.max(W - padL - padR, 10);
    const plotH = H - padT - padB;
    const xOf = (i) => padL + (n === 0 ? 0 : (i / n)) * plotW;
    let maxP = 0;
    for (let j = 0; j <= n; j += 1) maxP = Math.max(maxP, pmf[j]);
    maxP = maxP || 1;

    const reject = Math.abs(k - half) < 1e-9 ? false : p < alpha;
    geo.xOf = xOf;
    geo.n = n;
    geo.plotH = plotH;
    geo.padT = padT;

    /* 网格 + 期望线 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let s = 0; s <= 4; s += 1) {
      const y = padT + (plotH * s) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y + 0.5);
      ctx.lineTo(W - padR, y + 0.5);
      ctx.stroke();
    }

    /* 柱：落在尾巴里的染橙，判决为「不拒绝」时照样染色，只是裁决线不动 */
    const bw = Math.max(1, plotW / (n + 1) - 0.6);
    for (let j = 0; j <= n; j += 1) {
      const tail = Math.abs(j - half) >= Math.abs(k - half) - 1e-9;
      const x = xOf(j) - bw / 2;
      const h = Math.max((pmf[j] / maxP) * plotH, pmf[j] > 0 ? 0.8 : 0);
      ctx.fillStyle = tail ? C.named('orange') : C.accent;
      ctx.globalAlpha = tail ? 0.92 : 0.34;
      ctx.fillRect(x, padT + plotH - h, bw, h);
      ctx.globalAlpha = 1;
    }

    /* 期望竖线 */
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xOf(half), padT);
    ctx.lineTo(xOf(half), padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    /* 观测柱 */
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 2;
    ctx.strokeRect(xOf(k) - bw / 2 - 1, padT + 4, bw + 2, plotH - 4);

    /* alpha 裁决线：横向画出「p 值 = α」对应的尾巴面积分数线 */
    const kc = criticalK(n, alpha);
    ctx.strokeStyle = C.named('green');
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(xOf(n - kc), padT);
    ctx.lineTo(xOf(n - kc), padT + plotH);
    ctx.moveTo(xOf(kc), padT);
    ctx.lineTo(xOf(kc), padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = C.fg;
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('B(' + n + ', 0.5) 的零分布', padL + 2, padT - 10);
    ctx.textAlign = 'center';
    for (let j = 0; j <= n; j += Math.max(1, Math.round(n / 10))) {
      ctx.fillStyle = C.axis;
      ctx.fillText(String(j), xOf(j), padT + plotH + 14);
    }
    ctx.fillStyle = C.axis;
    ctx.fillText('正面数 k', padL + plotW / 2, H - 6);
    label(ctx, '|k − ' + n / 2 + '| ≥ ' + Math.abs(k - half) + ' 的柱子 = p 值', W - padR, padT - 10, C.named('orange'), { size: 11, weight: 600, align: 'right' });

    ro.set('观测比例', k + '/' + n + ' = ' + fmt(k / n, 3));
    ro.set('p 值（双侧）', fmt(p, 4) + (p < 1e-4 ? '（≈ ' + p.toExponential(2) + '）' : ''));
    ro.set('显著性 α', fmt(alpha, 3));
    ro.set('判决', reject ? '拒绝 H0（显著）' : '不拒绝 H0');
    geo.kc = kc;
    return { reject, p, k, n };
  }

  function redraw() {
    /* k 的上限跟着 n 走：n 一改就把 k 滑块量程与数值都夹回合法区间 */
    const n = Math.round(S().n);
    const row = sliders.box.children[1];
    if (row && row.children[1]) row.children[1].max = String(n);
    if (S().k > n) setSliderRow(sliders, 1, n, undefined, 'k');
    draw();
  }

  bNear.addEventListener('click', () => {
    const { n } = computeP();
    const kc = criticalK(n, S().alpha);
    setSliderRow(sliders, 1, kc, undefined, 'k');
    draw();
  });
  bDouble.addEventListener('click', () => {
    const { n, k } = computeP();
    const n2 = clamp(n * 2, 20, 200);
    const k2 = clamp(Math.round((k / n) * n2), 0, n2);
    setSliderRow(sliders, 0, n2, undefined, 'n');
    setSliderRow(sliders, 1, k2, undefined, 'k');
    redraw();
  });
  bReset.addEventListener('click', () => {
    setSliderRow(sliders, 0, 100, undefined, 'n');
    setSliderRow(sliders, 1, 65, undefined, 'k');
    setSliderRow(sliders, 2, 0.05, undefined, 'alpha');
    redraw();
  });

  redraw();
  cv.redraw = redraw;

  return {
    slidersBox: sliders.box,
    destroy() {
      cv.redraw = null;
    },
  };
}

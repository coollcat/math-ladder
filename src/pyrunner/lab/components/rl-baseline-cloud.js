/* =========================================================================
 * lab 组件：rl-baseline-cloud —— 减 baseline 前 / 后，两堆梯度样本的方差云
 * -------------------------------------------------------------------------
 * 用法（第 50 章 Baseline 与方差降低）：
 *
 *   { "type": "rl-baseline-cloud", "title": "两堆梯度样本", "baseline": 10, "noise": 8 }
 *
 * 字段（都可省）：
 *   baseline  参考线 b(s)，即 V(s) 的估计，-5..25，默认 10
 *   noise     噪声标准差 σ，1..20，默认 8
 *   gain      好动作比坏动作多拿的长期优势（GOOD_GAIN），0..6，默认 2
 *   base      状态的平均长期水平，-10..20，默认 10
 *   n         初始样本数，40..2000，默认 400
 *   seed      随机种子，默认 180
 *   height    画布高度，默认 520
 *
 * 演示什么：每条样本是「一个动作 + 它的回报 G」，梯度估计 Ê = score·G。
 *   · 上一条云：不减 baseline，点铺得很开（方差大）；
 *   · 下一条云：减 baseline 后 score·(G − b)，点收窄，但两条云的**中心**
 *     几乎在同一条竖线上——这就是「无偏 + 降方差」的现场。
 *   · 拖 b 滑块：云会整体平移。只要 b 只依赖状态（同一条样本里对好坏动作
 *     加的是同一个数），均值就挪不动；偏离 V(s) 太远时才重新变宽。
 *   · 单步加点 = 再抽一小批；播放 = 连续抽样；重置 = 回到初始样本量。
 * 读数给出两堆的均值与标准差，以及「方差不降反升」的警告（b 选得太离谱时）。
 * 取舍：样本生成沿用本章 Python 实验的口径（好/坏动作 + 高斯噪声 + 偶发大
 * 偏差），但随机数发生器不同，所以数字接近而不相同——课文里不要写成相等。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, clamp, fmt, clearBg, onScreen, mulberry32, gaussOf,
} from '../core.js';
import { fillRound, caption, colorRGBA, dashedLine, dot, chip } from './rl-common.js';

const BASE = [
  { name: 'baseline', label: '参考线 b(s)', min: -5, max: 25, step: 0.5, value: 10 },
  { name: 'noise', label: '噪声 σ', min: 1, max: 20, step: 0.5, value: 8 },
  { name: 'gain', label: '好动作优势', min: 0, max: 6, step: 0.5, value: 2 },
];

const MAXN = 2000;

export default function render(host, spec) {
  const H = clamp(spec.height || 520, 360, 940);
  let b = clamp(typeof spec.baseline === 'number' ? spec.baseline : 10, -5, 25);
  let sigma = clamp(typeof spec.noise === 'number' ? spec.noise : 8, 1, 20);
  let gain = clamp(typeof spec.gain === 'number' ? spec.gain : 2, 0, 6);
  const base = clamp(typeof spec.base === 'number' ? spec.base : 10, -10, 20);
  const n0 = clamp(Math.round(spec.n || 400), 40, MAXN);
  const seed = Math.round(typeof spec.seed === 'number' ? spec.seed : 180);

  let scores = [];
  let grads = [];
  let rng = mulberry32(seed);
  let playing = false;
  let acc = 0;
  let lastAdd = 0;

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    b = st.baseline;
    sigma = st.noise;
    gain = st.gain;
    resampleAll();
  });

  const ro = buildReadout({
    '样本数': '0',
    '均值（不减 b）': '—',
    '均值（减 b 后）': '—',
    '标准差（不减 b）': '—',
    '标准差（减 b 后）': '—',
    '标准差降低': '—',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('再抽一批 ▶');
  const bPlay = mkBtn(reduced ? '减少动效' : '播放');
  const bReset = mkBtn('重置');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bPlay, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '两堆点用的是同一批样本：上堆不减参考线，下堆减掉 b(s)。看中心有没有动、宽度有没有收。';
  host.appendChild(hint);

  /* 一条样本：好动作 score=+1（回报高 GOOD_GAIN），坏动作 score=−1（回报低）；
     偶发的大正偏差模拟长尾（对应本章 Python 实验里 i % 50 == 0 的那条）。 */
  function oneSample() {
    const good = scores.length % 2 === 0;
    const i = scores.length;
    const noise = gaussOf(rng) * sigma;
    const outlier = i % 50 === 0 ? 12 : 0;
    const G = base + (good ? gain : -gain) + noise + outlier;
    scores.push(good ? 1 : -1);
    grads.push(G);
  }

  function resampleAll() {
    scores = [];
    grads = [];
    rng = mulberry32(seed);
    for (let i = 0; i < n0; i += 1) oneSample();
    playing = false;
    lastAdd = 0;
    syncPlay();
    syncStats();
    draw();
  }

  function addBatch(k) {
    const want = Math.min(scores.length + k, MAXN);
    while (scores.length < want) oneSample();
    lastAdd = k;
  }

  /* ---- 统计 ---- */
  function stats(raw) {
    let m = 0;
    for (let i = 0; i < scores.length; i += 1) {
      const g = scores[i] * (raw ? grads[i] : grads[i] - b);
      m += g;
    }
    m /= Math.max(scores.length, 1);
    let v = 0;
    for (let i = 0; i < scores.length; i += 1) {
      const g = scores[i] * (raw ? grads[i] : grads[i] - b);
      v += (g - m) * (g - m);
    }
    v = Math.sqrt(v / Math.max(scores.length - 1, 1));
    return { mean: m, sd: v };
  }

  let raf = null;
  let lastT = 0;
  let visible = true;
  function ensure() {
    if (raf == null && visible && host.isConnected) { lastT = 0; raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    raf = null;
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 1 / 60;
    lastT = now;
    if (playing) {
      acc += dt;
      while (acc >= 0.12 && playing) {
        acc -= 0.12;
        if (scores.length >= MAXN) { playing = false; syncPlay(); break; }
        addBatch(20);
      }
    }
    draw();
    if (playing) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else if (v && playing) ensure();
  });

  function syncPlay() { bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放'); }

  bStep.addEventListener('click', () => { playing = false; syncPlay(); addBatch(100); syncStats(); draw(); ensure(); });
  bPlay.addEventListener('click', () => {
    if (reduced) return;
    if (scores.length >= MAXN) resampleAll();
    playing = !playing;
    acc = 0;
    syncPlay();
    ensure();
  });
  bReset.addEventListener('click', () => resampleAll());

  function syncStats() {
    const R = stats(true);
    const Q = stats(false);
    ro.set('样本数', String(scores.length) + ' / ' + MAXN);
    ro.set('均值（不减 b）', fmt(R.mean, 3));
    ro.set('均值（减 b 后）', fmt(Q.mean, 3));
    ro.set('标准差（不减 b）', fmt(R.sd, 3));
    ro.set('标准差（减 b 后）', fmt(Q.sd, 3));
    const red = R.sd > 1e-9 ? (1 - Q.sd / R.sd) * 100 : 0;
    ro.set('标准差降低', (red >= 0 ? '降 ' : '升 ') + fmt(Math.abs(red), 1) + '%'
      + (red < -1 ? '（b 离 V(s) 太远了）' : ''));
  }

  /* ---- 绘制 ---- */
  const geo = { W: 0, Hh: 0, plot: null };

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    geo.W = W;
    geo.Hh = Hh;

    const R = stats(true);
    const Q = stats(false);

    label(ctx, '同一批样本，两种梯度估计：减掉参考线后，云变窄但中心不动',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, 'G = ' + fmt(base, 0) + ' ± ' + fmt(gain, 1) + '（好/坏动作） + 噪声 N(0,σ²)'
      + '　score = ±1　梯度估计 = score × (G − b)',
      14, 38, C.axis, { size: 10.5 });

    const pad = 14;
    const stripH = Math.min(96, (Hh - 250) / 2);
    const y1 = 74;
    const y2 = y1 + stripH + 54;

    /* 两条云共用同一个 x 轴范围，宽度才可比 */
    const lo = Math.min(R.mean - 3.2 * R.sd, Q.mean - 3.2 * Q.sd);
    const hi = Math.max(R.mean + 3.2 * R.sd, Q.mean + 3.2 * Q.sd);
    const x0 = pad + 62;
    const x1 = W - pad - 12;
    const mapX = (v) => x0 + ((v - lo) / (hi - lo || 1)) * (x1 - x0);

    drawCloud(ctx, C, '不减 baseline：score × G', y1, stripH, R, mapX, C.named('orange'), true);
    drawCloud(ctx, C, '减 baseline：score × (G − b)', y2, stripH, Q, mapX, C.named('teal'), false);

    /* 两堆均值对齐线 */
    const mx1 = mapX(R.mean);
    const mx2 = mapX(Q.mean);
    dashedLine(ctx, mx1, y1 - 4, mx1, y1 + stripH + 6, C.named('red'), 1.4, [4, 4]);
    dashedLine(ctx, mx2, y2 - 4, mx2, y2 + stripH + 6, C.named('red'), 1.4, [4, 4]);
    if (Math.abs(mx1 - mx2) > 2) {
      label(ctx, '两条均值线基本重合：减 baseline 是无偏操作', (mx1 + mx2) / 2, y1 - 10,
        C.named('red'), { size: 9.5, align: 'center' });
    } else {
      label(ctx, '两条均值线重合', mx1, y1 - 10, C.named('red'), { size: 9.5, align: 'center' });
    }

    /* 标准差刻度尺 */
    drawRuler(ctx, C, x0, y2 + stripH + 20, x1, mapX, R, Q);

    /* 结论 */
    const cy = y2 + stripH + 62;
    const red = R.sd > 1e-9 ? (1 - Q.sd / R.sd) * 100 : 0;
    const verdict = red > 1
      ? '标准差从 ' + fmt(R.sd, 2) + ' 降到 ' + fmt(Q.sd, 2) + '（约降 ' + fmt(red, 0) + '%）：'
        + '样本没变、目标没变，只是换了个参考线，梯度估计就稳多了。'
      : red < -1
        ? 'b 选得太远：这次标准差反而升到 ' + fmt(Q.sd, 2) + '。参考线要贴近 V(s) 才有降方差的效果。'
        : 'b ≈ 0 附近时两者几乎一样——这正是「b 只有落在回报尺度上才有用」的意思。';
    fillRound(ctx, pad, cy - 14, W - pad * 2, 46, 8,
      colorRGBA(red >= 0 ? C.named('green') : C.named('orange'), 0.12));
    label(ctx, verdict, pad + 10, cy + 2, C.fg, { size: 10.5, weight: 600 });
    label(ctx, '均值两边都是 ' + fmt(R.mean, 3) + ' 附近：b 只依赖状态（同一条样本里好坏动作减掉同一个数），'
      + '所以期望不动；它动的是「离散程度」。', pad + 10, cy + 20, C.axis, { size: 10 });

    if (Hh > cy + 60) {
      chip(ctx, '提示：把「好动作优势」拧到 0，好坏动作就只剩噪声，两堆云几乎一样宽——'
        + '优势信号越弱，baseline 的降方差越不明显。', pad + 4, cy + 44, C,
      { size: 9, padX: 5, height: 15, align: 'left' });
    }
  }

  function drawCloud(ctx, C, title, y, h, st, mapX, color, raw) {
    fillRound(ctx, 58, y - 6, cv.W - 72, h + 12, 8, colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
    label(ctx, title, 66, y + 10, C.fg, { size: 10.5, weight: 700 });
    label(ctx, 'μ=' + fmt(st.mean, 2) + '　σ=' + fmt(st.sd, 2), 66, y + h - 4, color, { size: 10, weight: 600 });

    /* ±σ 带 */
    const a = mapX(st.mean - st.sd);
    const bb = mapX(st.mean + st.sd);
    ctx.save();
    ctx.fillStyle = colorRGBA(color, 0.14);
    ctx.fillRect(a, y + 12, Math.max(bb - a, 1), h - 22);
    ctx.restore();

    /* 抖动点云 */
    const step = Math.max(1, Math.floor(scores.length / 700));
    for (let i = 0; i < scores.length; i += step) {
      const g = scores[i] * (raw ? grads[i] : grads[i] - b);
      const x = mapX(clamp(g, -1e6, 1e6));
      const yy = y + 18 + ((i * 37) % 1000) / 1000 * (h - 30);
      ctx.save();
      ctx.globalAlpha = step > 1 ? 0.30 : 0.42;
      dot(ctx, x, yy, 1.7, color);
      ctx.restore();
    }
    /* 均值线 */
    dashedLine(ctx, mapX(st.mean), y + 10, mapX(st.mean), y + h - 6, C.named('red'), 1.6, [4, 3]);
    dot(ctx, mapX(st.mean), y + h / 2, 3.2, C.named('red'));
  }

  function drawRuler(ctx, C, x0, y, x1, mapX, R, Q) {
    label(ctx, '把两条 ±σ 摆在一起比宽度：', 66, y + 4, C.axis, { size: 9.5 });
    const scale = Math.max(R.sd, Q.sd, 1e-6);
    const rows = [
      { name: '不减 b', sd: R.sd, color: C.named('orange') },
      { name: '减 b 后', sd: Q.sd, color: C.named('teal') },
    ];
    rows.forEach((row, i) => {
      const yy = y + 14 + i * 16;
      label(ctx, row.name, 66, yy + 8, row.color, { size: 9.5, weight: 600 });
      const w = (row.sd / scale) * ((x1 - x0) * 0.55);
      fillRound(ctx, x0, yy, Math.max(w, 2), 10, 3, row.color);
      label(ctx, 'σ=' + fmt(row.sd, 2), x0 + Math.max(w, 2) + 6, yy + 8, C.fg, { size: 9.5 });
    });
    void mapX;
  }

  /* 初始化 */
  for (let i = 0; i < n0; i += 1) oneSample();
  syncPlay();
  syncStats();
  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      playing = false;
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
      cv.redraw = null;
    },
  };
}

/* =========================================================================
 * lab 组件：rlhf-pipeline —— 偏好打分 → 奖励模型 → 策略，一条流水线
 * -------------------------------------------------------------------------
 * 用法（第 50 章 RLHF 概览）：
 *
 *   { "type": "rlhf-pipeline", "title": "RLHF 三步流水线", "beta": 0.05 }
 *
 * 字段（都可省）：
 *   beta      KL 罚系数 0..0.3，默认 0.05
 *   noise    标注噪声（人会不会标错）0..0.4，默认 0.1
 *   seed     随机种子，默认 210
 *   height   画布高度，默认 540
 *
 * 演示什么：真跑一个极小的 Bradley-Terry 奖励模型，四步可视化：
 *   ① 偏好对：每次抽出回答 A/B 的特征（有用度 u、长度 len）；
 *   ② 标注：人按「真实偏好」比较，可能标错（噪声）；
 *   ③ 奖励模型：线性分数 r = w_u·u + w_len·len，用成对 logistic 损失做
 *      梯度下降，屏幕上是权重随批次的演化；
 *   ④ 策略：按 r 最大化、同时按 β 付 KL 罚，得到策略分布。
 * 关键观察点：把「标注噪声」调大，奖励模型的权重学不稳；把 β 调小，
 * 策略会朝「长度」这个混进来的特征猛冲——这就是 over-optimization。
 *   · 单批：跑一批偏好对并更新一次；连续：自动跑；重置：清空权重。
 * 取舍：不是真 PPO——策略步用的是「奖励模型梯度减去 β·KL」的解析近似，
 * 目的是展示信号流与两个旋钮的作用，不是复现训练细节。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, clamp, fmt, clearBg, onScreen, mulberry32, gaussOf,
} from '../core.js';
import { fillRound, caption, colorRGBA, strokeRound, chip, dashedLine, plotFrame, dot } from './rl-common.js';

const BASE = [
  { name: 'beta', label: 'KL 罚系数 β', min: 0, max: 0.3, step: 0.01, value: 0.05 },
  { name: 'noise', label: '标注噪声', min: 0, max: 0.4, step: 0.02, value: 0.1 },
];

const STEPS = [
  { id: 0, name: '① 偏好对', detail: '同一提示下生成 A / B 两个回答' },
  { id: 1, name: '② 人类标注', detail: '标出哪个更好 → (y_w ≻ y_l)' },
  { id: 2, name: '③ 奖励模型', detail: '学 r(x,y)，让 y_w 的分数更高' },
  { id: 3, name: '④ 策略优化', detail: '最大化 r，同时被 β·KL 拉住' },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 540, 380, 940);
  let beta = clamp(typeof spec.beta === 'number' ? spec.beta : 0.05, 0, 0.3);
  let noise = clamp(typeof spec.noise === 'number' ? spec.noise : 0.1, 0, 0.4);
  const seed = Math.round(typeof spec.seed === 'number' ? spec.seed : 210);

  let w = [0.2, 0.1];              /* [有用度权重, 长度权重]，从接近 0 起 */
  let batch = 0;
  let pairs = 0;
  let active = -1;
  let history = [];                 /* 每批的 [w_u, w_len] */
  let lastPair = null;
  let loss = null;
  let policyShift = 0;
  let playing = false;
  let acc = 0;
  let rng = mulberry32(seed);

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    beta = st.beta;
    noise = st.noise;
    syncReadout();
    draw();
  });

  const ro = buildReadout({
    '已跑批数': '0',
    '偏好对数': '0',
    '奖励模型 w(有用)': '0.20',
    '奖励模型 w(长度)': '0.10',
    '成对损失': '—',
    '策略偏移（KL 代价）': '—',
  });
  host.appendChild(ro.box);

  const bBatch = mkBtn('跑一批 ▶');
  const bPlay = mkBtn(reduced ? '减少动效' : '连续');
  const bReset = mkBtn('重置');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bBatch, bPlay, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '真在跑一个两个特征的奖励模型：看长度权重会不会被「讨好性」以外的混杂特征带跑。';
  host.appendChild(hint);

  /* 生成一个偏好对：真实偏好由「有用度」决定，长度只是相关但不该主导 */
  function makePair() {
    const uA = rng() * 1.0 + 0.1;
    const uB = rng() * 1.0 + 0.1;
    const lenA = uA * 0.6 + rng() * 0.8;
    const lenB = uB * 0.6 + rng() * 0.8;
    const trueBetter = uA >= uB ? 'A' : 'B';
    const flipped = rng() < noise;
    const winner = flipped ? (trueBetter === 'A' ? 'B' : 'A') : trueBetter;
    return { uA, uB, lenA, lenB, winner, flipped, trueBetter };
  }

  function sigmoid(z) {
    if (z >= 0) return 1 / (1 + Math.exp(-z));
    const e = Math.exp(z);
    return e / (1 + e);
  }

  function score(p, which) {
    const u = which === 'A' ? p.uA : p.uB;
    const len = which === 'A' ? p.lenA : p.lenB;
    return w[0] * u + w[1] * len;
  }

  function runBatch(k) {
    const lr = 0.25;
    let lastLoss = 0;
    for (let i = 0; i < k; i += 1) {
      const p = makePair();
      const sw = score(p, p.winner);
      const sl = score(p, p.winner === 'A' ? 'B' : 'A');
      const z = sw - sl;
      const s = sigmoid(z);
      lastLoss = -Math.log(Math.max(s, 1e-9));
      /* dL/dz = -(1 - s)，对参数链式展开 */
      const g = -(1 - s);
      const du = (p.uA - p.uB) * (p.winner === 'A' ? 1 : -1);
      const dl = (p.lenA - p.lenB) * (p.winner === 'A' ? 1 : -1);
      w[0] -= lr * g * du;
      w[1] -= lr * g * dl;
      pairs += 1;
      lastPair = p;
    }
    loss = lastLoss;
    batch += 1;
    history.push([w[0], w[1]]);
    if (history.length > 120) history.shift();
    /* 策略偏移：奖励抬高得越多，KL 罚越重；β 越大，偏移越小 */
    const rewardGain = Math.max(w[0] * 0.5 + w[1] * 0.3, 0);
    policyShift = rewardGain / (1 + beta * 8);
    syncReadout();
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
      while (acc >= 0.35 && playing) { acc -= 0.35; runBatch(4); active = (active + 1) % 4; }
    }
    draw();
    if (playing) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else if (v && playing) ensure();
  });

  function hardReset() {
    w = [0.2, 0.1];
    batch = 0;
    pairs = 0;
    history = [];
    lastPair = null;
    loss = null;
    policyShift = 0;
    playing = false;
    acc = 0;
    rng = mulberry32(seed);
    active = -1;
    syncPlay();
    syncReadout();
    draw();
  }
  function syncPlay() { bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '连续'); }

  bBatch.addEventListener('click', () => {
    playing = false;
    syncPlay();
    runBatch(20);
    active = (active + 1) % 4;
    draw();
  });
  bPlay.addEventListener('click', () => {
    if (reduced) return;
    playing = !playing;
    acc = 0;
    syncPlay();
    ensure();
  });
  bReset.addEventListener('click', () => hardReset());

  function syncReadout() {
    ro.set('已跑批数', String(batch));
    ro.set('偏好对数', String(pairs));
    ro.set('奖励模型 w(有用)', fmt(w[0], 3));
    ro.set('奖励模型 w(长度)', fmt(w[1], 3) + (w[1] > w[0] ? '（长度压过有用度！）' : ''));
    ro.set('成对损失', loss === null ? '—' : fmt(loss, 4));
    ro.set('策略偏移（KL 代价）', batch ? fmt(policyShift, 3) + '　β=' + fmt(beta, 2) : '—');
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    label(ctx, 'RLHF：把「哪个回答更好」变成可优化的分数，再小心地优化它',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, 'β = ' + fmt(beta, 2) + '　标注噪声 = ' + fmt(noise, 2)
      + '　奖励模型 r = w₁·有用度 + w₂·长度（长度是混进来的特征）',
      14, 38, C.axis, { size: 10.5 });

    /* 四段流水线 */
    const wide = W >= 700;
    const pad = 14;
    const n = STEPS.length;
    const gap = 8;
    const cw = wide ? (W - pad * 2 - gap * (n - 1)) / n : (W - pad * 2 - gap) / 2;
    STEPS.forEach((s, i) => {
      const col = wide ? i : i % 2;
      const row = wide ? 0 : Math.floor(i / 2);
      const x = pad + col * (cw + gap);
      const y = 56 + row * 78;
      const isActive = active === i;
      fillRound(ctx, x, y, cw, 68, 8,
        isActive ? colorRGBA(C.accent, C.dark ? 0.28 : 0.16) : colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
      strokeRound(ctx, x + 0.5, y + 0.5, cw - 1, 67, 8, isActive ? C.accent : C.grid, isActive ? 2 : 1);
      label(ctx, s.name, x + 8, y + 17, isActive ? C.fg : C.axis, { size: 10.5, weight: 700 });
      const maxCh = Math.max(9, Math.floor((cw - 14) / 10.2));
      let rest = s.detail;
      let line = 0;
      while (rest && line < 3) {
        const cut = rest.length > maxCh ? maxCh : rest.length;
        label(ctx, rest.slice(0, cut), x + 8, y + 32 + line * 11, C.axis, { size: 9 });
        rest = rest.slice(cut);
        line += 1;
      }
      if (wide && i < n - 1) label(ctx, '→', x + cw + 1, y + 40, C.axis, { size: 13, align: 'center' });
    });

    const top = wide ? 138 : 226;

    /* 奖励模型权重演化 */
    const wbox = { x: pad + 46, y: top + 26, w: Math.min(W * 0.46, 330), h: Math.min(Hh - top - 210, 150) };
    caption(ctx, '奖励模型权重随批次的变化', pad, top, C);
    if (wbox.h > 50) {
      const lo = Math.min(-0.2, ...history.map((h) => Math.min(h[0], h[1])));
      const hi = Math.max(0.6, ...history.map((h) => Math.max(h[0], h[1])));
      const { X, Y } = plotFrame(ctx, C, wbox, [0, Math.max(history.length, 10)], [lo, hi], { yTicks: 3 });
      dashedLine(ctx, wbox.x, Y(0), wbox.x + wbox.w, Y(0), C.axis, 1, [3, 3]);
      const series = [
        { idx: 0, color: C.named('teal'), name: 'w₁ 有用度' },
        { idx: 1, color: C.named('orange'), name: 'w₂ 长度' },
      ];
      series.forEach((sr) => {
        if (history.length < 2) return;
        ctx.save();
        ctx.strokeStyle = sr.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        history.forEach((h, i) => {
          const x = X(i);
          const y = Y(clamp(h[sr.idx], lo, hi));
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();
        const lastV = history[history.length - 1][sr.idx];
        label(ctx, sr.name + ' = ' + fmt(lastV, 2), wbox.x + wbox.w - 4, Y(clamp(lastV, lo, hi)) - 5,
          sr.color, { size: 9.5, align: 'right', weight: 700 });
      });
      if (history.length < 2) {
        label(ctx, '点「跑一批 ▶」开始训练：先用成对 logistic 损失学 w。', wbox.x, wbox.y + 24, C.axis, { size: 10 });
      }
    }

    /* 策略分布：初始 vs 现在 */
    const pbox = { x: pad + 46, y: top + 26, w: 0, h: 0 };
    if (wide) { pbox.x = pad + Math.min(W * 0.5, 400); pbox.w = W - pbox.x - 16; } else { pbox.x = pad + 20; pbox.w = W - pad * 2 - 20; pbox.y = top + 190; }
    pbox.h = Math.min(150, Hh - (wide ? top + 60 : top + 220));
    drawPolicy(ctx, C, pbox.x, wide ? top + 26 : top + 190, pbox.w, pbox.h);

    /* 关键提示 */
    const ty = Math.min(Hh - 40, (wide ? top + 190 : top + 356));
    chip(ctx, w[1] > w[0]
      ? '长度权重已经压过有用度：奖励模型学到的是「更长」而不是「更有用」——这是偏好数据的混杂，不是模型坏了。'
      : '目前有用度权重仍高于长度：奖励模型学到的是我们想要的那个方向。',
    pad + 2, ty, C, { size: 9.2, padX: 5, height: 16, align: 'left',
      fill: colorRGBA(w[1] > w[0] ? C.named('red') : C.named('green'), 0.16) });

    if (Hh > ty + 34) {
      label(ctx, 'β 的作用：把它拧到 0，策略只认奖励模型的分，会一路把「长度」堆到离谱；'
        + '调大 β，KL 罚把新策略拉在原模型附近，收益小但不容易跑飞。',
      pad, ty + 30, C.axis, { size: 10 });
    }
    void dot;
  }

  function drawPolicy(ctx, C, x, y, w, h) {
    caption(ctx, '策略分布：优化后把概率挪向高分回答', x, y - 12, C);
    const rows = [
      { name: '简短但空泛', base: 0.30, reward: 0.25 },
      { name: '中等、有用', base: 0.40, reward: 0.85 },
      { name: '冗长且堆砌', base: 0.30, reward: 0.70 + Math.max(w[1], 0) * 1.4 },
    ];
    const total = rows.reduce((a, r) => a + Math.exp(r.reward / Math.max(beta, 0.02)), 0);
    const barW = w - 96;
    rows.forEach((r, i) => {
      const yy = y + 10 + i * 34;
      const prob = batch ? Math.exp(r.reward / Math.max(beta, 0.02)) / total : r.base;
      label(ctx, r.name, x, yy + 10, C.axis, { size: 9.5 });
      fillRound(ctx, x + 78, yy + 2, Math.max(r.base * barW, 2), 8, 2, colorRGBA(C.accent, 0.35));
      fillRound(ctx, x + 78, yy + 11, Math.max(prob * barW, 2), 9, 2, C.named('teal'));
      label(ctx, fmt(prob, 2), x + 78 + Math.max(prob * barW, 2) + 5, yy + 14, C.fg, { size: 9.5 });
      if (i === 0) label(ctx, '淡色 = 初始分布 π₀　实色 = 现在', x + 78 + barW - 4, yy + 14, C.axis,
        { size: 8.5, align: 'right' });
    });
    label(ctx, batch ? 'β 越小，概率越集中到奖励模型的高分项——包括那条「冗长」的。'
      : '训完一批后这里会变。', x, y + h - 4, C.axis, { size: 9.5 });
  }

  syncReadout();
  syncPlay();
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

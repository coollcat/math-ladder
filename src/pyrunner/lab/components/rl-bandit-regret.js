/* =========================================================================
 * lab 组件：rl-bandit-regret —— regret 曲线与探索强度的实时对照
 * -------------------------------------------------------------------------
 * 用法（第 50 章 多臂老虎机与 regret）：
 *
 *   { "type": "rl-bandit-regret", "title": "regret 曲线对照", "epsilon": 0.1 }
 *
 * 字段（都可省）：
 *   epsilon   策略 A 的探索概率 0..0.5，默认 0.1
 *   c         UCB1 的探索系数 0..2，默认 1.0
 *   horizon   总步数上限 200..4000，默认 1200
 *   mus       三根臂的真实均值，默认 [0.25, 0.45, 0.65]
 *   seed      随机种子，默认 160
 *   height    画布高度，默认 520
 *
 * 演示什么：两条策略在同一个赌场里同时跑，谁也没特权——
 *   · 策略 A＝ε-greedy：以 ε 概率随机试，否则拉当前经验均值最高的臂；
 *   · 策略 B＝UCB1：拉 均值 + c·√(ln t / N) 最大的臂（不确定的臂被抬起来）。
 * 主图画累积 regret（= t·μ* − 已得奖励，实测值而非期望值），线下面积就是
 * 「本来能拿到、却因为不知道而丢掉的分数」。下方两根臂的柱子用来说明
 * 「为什么 regret 会涨」：拉错臂的每一次都把柱子拉向次优。
 *   · 单步：两个策略各拉一次；播放：连续跑；重置：清空。
 *   · 读数给出当前 regret、最优臂占比、以及「探索强度」对 regret 的影响。
 * 取舍：三根臂、伯努利奖励、无状态——这是 bandit 的最小形状，状态转移
 * 留给后面的 MDP。regret 用样本值（不是期望），所以曲线会有小抖动。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, clamp, fmt, clearBg, onScreen, mulberry32,
} from '../core.js';
import {
  fillRound, caption, plotFrame, colorRGBA, strokeRound, dot, dashedLine, chip,
} from './rl-common.js';

const BASE = [
  { name: 'epsilon', label: 'ε（A 的探索率）', min: 0, max: 0.5, step: 0.01, value: 0.1 },
  { name: 'c', label: 'UCB 系数 c', min: 0, max: 2, step: 0.1, value: 1.0 },
  { name: 'horizon', label: '总步数', min: 200, max: 4000, step: 100, value: 1200 },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 520, 360, 940);
  let eps = clamp(typeof spec.epsilon === 'number' ? spec.epsilon : 0.1, 0, 0.5);
  let cUcb = clamp(typeof spec.c === 'number' ? spec.c : 1.0, 0, 2);
  const horizon = clamp(Math.round(spec.horizon || 1200), 200, 4000);
  const mus = Array.isArray(spec.mus) && spec.mus.length >= 2
    ? spec.mus.slice(0, 4).map((v) => clamp(Number(v) || 0, 0, 1))
    : [0.25, 0.45, 0.65];
  const seed = Math.round(typeof spec.seed === 'number' ? spec.seed : 160);
  const best = Math.max(...mus);
  const bestArm = mus.indexOf(best);

  function mkAgent(kind) {
    return {
      kind,
      counts: mus.map(() => 0),
      sums: mus.map(() => 0),
      t: 0,
      regret: 0,
      curve: [],
      lastArm: -1,
      lastR: 0,
    };
  }
  let A = mkAgent('eps');
  let B = mkAgent('ucb');
  let rng = mulberry32(seed);
  let playing = false;
  let acc = 0;

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    eps = st.epsilon;
    cUcb = st.c;
    hardReset();
  });

  const ro = buildReadout({
    'ε-greedy regret': '0',
    'UCB1 regret': '0',
    '差距（A − B）': '—',
    '最优臂占比 A / B': '— / —',
    '步数': '0 / ' + horizon,
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('单步 ▶');
  const bPlay = mkBtn(reduced ? '减少动效' : '播放');
  const bReset = mkBtn('重置');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bPlay, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '两条策略在同一赌场同步跑：直线（线性 regret）说明一直在拉错臂，弯下去（次线性）才说明在学。';
  host.appendChild(hint);

  function mean(ag, i) {
    return ag.counts[i] ? ag.sums[i] / ag.counts[i] : 0;
  }

  function pickA(ag) {
    if (rng() < eps) return Math.floor(rng() * mus.length) % mus.length;
    let bi = 0;
    let bv = -Infinity;
    for (let i = 0; i < mus.length; i += 1) {
      const v = ag.counts[i] ? mean(ag, i) : 1e9;   /* 没试过的臂优先（乐观初始化） */
      if (v > bv) { bv = v; bi = i; }
    }
    return bi;
  }

  function pickB(ag) {
    const t = Math.max(ag.t, 1);
    let bi = 0;
    let bv = -Infinity;
    for (let i = 0; i < mus.length; i += 1) {
      if (!ag.counts[i]) return i;                  /* 每根臂先各拉一次 */
      const v = mean(ag, i) + cUcb * Math.sqrt(Math.log(t) / ag.counts[i]);
      if (v > bv) { bv = v; bi = i; }
    }
    return bi;
  }

  function pull(ag, arm) {
    const r = rng() < mus[arm] ? 1 : 0;
    ag.counts[arm] += 1;
    ag.sums[arm] += r;
    ag.t += 1;
    ag.regret += best - mus[arm];        /* 期望口径的即时 regret */
    ag.lastArm = arm;
    ag.lastR = r;
    ag.curve.push(ag.regret);
    return r;
  }

  function stepBoth() {
    if (A.t >= horizon) { playing = false; syncPlay(); return; }
    pull(A, pickA(A));
    pull(B, pickB(B));
    syncReadout();
  }

  /* ---- 循环 ---- */
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
      while (acc >= 0.05 && playing) {
        acc -= 0.05;
        stepBoth();
        if (A.t >= horizon) { playing = false; syncPlay(); break; }
      }
    }
    draw();
    if (playing) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else if (v && playing) ensure();
  });

  function hardReset() {
    A = mkAgent('eps');
    B = mkAgent('ucb');
    rng = mulberry32(seed);
    playing = false;
    acc = 0;
    syncPlay();
    syncReadout();
    draw();
  }
  function syncPlay() { bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放'); }

  bStep.addEventListener('click', () => { playing = false; syncPlay(); stepBoth(); draw(); });
  bPlay.addEventListener('click', () => {
    if (reduced) return;
    if (A.t >= horizon) hardReset();
    playing = !playing;
    acc = 0;
    syncPlay();
    ensure();
  });
  bReset.addEventListener('click', () => hardReset());

  function syncReadout() {
    ro.set('ε-greedy regret', fmt(A.regret, 1));
    ro.set('UCB1 regret', fmt(B.regret, 1));
    const d = A.regret - B.regret;
    ro.set('差距（A − B）', A.t === 0 ? '—' : (d >= 0 ? '+' : '') + fmt(d, 1)
      + (d > 0 ? '（UCB 更省）' : d < 0 ? '（ε-greedy 更省）' : ''));
    const share = (ag) => {
      const tot = ag.counts.reduce((a, b) => a + b, 0);
      return tot ? Math.round((ag.counts[bestArm] / tot) * 100) + '%' : '—';
    };
    ro.set('最优臂占比 A / B', share(A) + ' / ' + share(B));
    ro.set('步数', String(A.t) + ' / ' + horizon);
  }

  /* ---- 绘制 ---- */
  const geo = { W: 0, Hh: 0, wide: true, plot: null };

  function layout(W, Hh) {
    geo.W = W;
    geo.Hh = Hh;
    geo.wide = W >= 660;
    const pad = 14;
    const plotH = geo.wide ? Math.min(Hh * 0.5, 240) : Math.min(Hh * 0.42, 190);
    geo.plot = { x: pad + 44, y: 66, w: W - pad * 2 - 54, h: plotH };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);

    label(ctx, '累积 regret：本来能拿到的分数，有多少因为「不知道哪根臂好」而丢了',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '臂的真实均值 ' + mus.map((v) => fmt(v, 2)).join(' / ')
      + '　最优 = ' + fmt(best, 2) + '（第 ' + (bestArm + 1) + ' 根）'
      + '　ε = ' + fmt(eps, 2) + '　c = ' + fmt(cUcb, 1),
      14, 38, C.axis, { size: 10.5 });

    const box = geo.plot;
    const xmax = Math.max(horizon, 10);
    const ymax = Math.max(best * Math.min(A.t, horizon), 1) * 1.05;
    const { X, Y } = plotFrame(ctx, C, box, [0, xmax], [0, ymax], { xTicks: 5, yTicks: 4 });

    /* 线性 regret 参考线：一直瞎拉能到多高 */
    dashedLine(ctx, X(0), Y(0), X(xmax), Y(best * xmax), colorRGBA(C.fg, 0.35), 1.2, [5, 5]);
    label(ctx, '全拉最差臂 = 线性 regret（斜率 μ*−μ 最差）', X(xmax * 0.42), Y(best * xmax * 0.42) - 6,
      C.axis, { size: 9.5 });

    /* 两条 regret 曲线 */
    const curve = (ag, color, name) => {
      if (ag.curve.length < 2) return;
      const stepX = box.w / xmax;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ag.curve.forEach((v, i) => {
        const x = box.x + i * stepX;
        const y = Y(v);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
      const lastV = ag.curve[ag.curve.length - 1];
      const lx = box.x + (ag.curve.length - 1) * stepX;
      dot(ctx, lx, Y(lastV), 3, color);
      label(ctx, name + ' ' + fmt(lastV, 1), Math.min(lx + 8, box.x + box.w - 76), Y(lastV) - 6, color,
        { size: 10, weight: 700 });
    };
    curve(B, C.named('teal'), 'UCB1');
    curve(A, C.named('orange'), 'ε-greedy');

    /* 坐标轴标签 */
    label(ctx, '步数 t', box.x + box.w, box.y + box.h + 16, C.axis, { size: 9.5, align: 'right' });
    label(ctx, '累积 regret', box.x - 6, box.y + 10, C.axis, { size: 9.5, align: 'right' });
    [0, Math.round(ymax / 2), Math.round(ymax)].forEach((v) => {
      label(ctx, fmt(v, 0), box.x - 6, Y(v) + 4, C.axis, { size: 9, align: 'right' });
    });

    /* 下部：每根臂的经验均值与拉动次数 */
    const by = box.y + box.h + 34;
    drawArms(ctx, C, by);
    void Hh;
  }

  function drawArms(ctx, C, y) {
    const W = geo.W;
    const pad = 14;
    caption(ctx, '每根臂：柱高 = 经验均值 μ̂，柱内数字 = 被拉次数，虚线 = 真实均值 μ',
      pad, y, C);
    const cols = mus.length;
    const colW = Math.min((geo.wide ? W * 0.6 : W - pad * 2) / cols, 150);
    const maxH = 66;
    const barBottom = y + 30 + maxH;
    mus.forEach((mu, i) => {
      const x = pad + 8 + i * colW;
      /* 真实均值虚线 */
      const trueY = barBottom - mu * maxH;
      dashedLine(ctx, x, trueY, x + colW - 22, trueY, C.bad, 1.4, [4, 3]);
      label(ctx, fmt(mu, 2), x + colW - 18, trueY + 4, C.bad, { size: 9 });
      /* 两个策略的经验均值柱 */
      const items = [
        { ag: A, color: C.named('orange'), x0: x + 4, w: (colW - 34) / 2 - 2 },
        { ag: B, color: C.named('teal'), x0: x + 4 + (colW - 34) / 2, w: (colW - 34) / 2 - 2 },
      ];
      items.forEach((it) => {
        const m = it.ag.counts[i] ? it.ag.sums[i] / it.ag.counts[i] : 0;
        const h = m * maxH;
        fillRound(ctx, it.x0, barBottom - h, it.w, Math.max(h, 1), 3, it.color);
        label(ctx, String(it.ag.counts[i]), it.x0 + it.w / 2, barBottom - Math.max(h, 1) / 2 + 4,
          C.bg, { size: 9, align: 'center', weight: 700 });
      });
      label(ctx, '臂 ' + (i + 1) + (i === bestArm ? ' ★' : ''), x + (colW - 30) / 2, barBottom + 15,
        i === bestArm ? C.named('green') : C.axis, { size: 10, align: 'center', weight: i === bestArm ? 700 : 400 });
    });

    /* 结论句 */
    const d = A.regret - B.regret;
    const line = A.t < 20 ? '先跑几步再看结论：regret 的差别要累积才显出来。'
      : d > 0 ? '这一局里 UCB1 少丢了 ' + fmt(d, 1) + ' 分：它把「没试过 / 试得少」的臂抬起来，探索更有目的。'
        : d < 0 ? '这一局里 ε-greedy 少丢了 ' + fmt(-d, 1) + ' 分：随机探索在某些参数下也够用。'
          : '两条曲线暂时贴在一起。';
    label(ctx, line, pad, barBottom + 38, C.fg, { size: 10.5, weight: 600 });

    /* 探索强度提示 */
    const epsLine = 'ε 越大，A 在次优臂上浪费越多（斜率≈ε·(μ*−μ次)），但更不容易被早期噪声锁死；'
      + 'c 越大，B 越晚停止试探。把 ε 拧到 0 看看纯贪心会不会一开始就锁错臂。';
    if (geo.Hh > barBottom + 60) {
      label(ctx, epsLine, pad, barBottom + 54, C.axis, { size: 10 });
    }
    chip(ctx, '同一种子 ' + seed + '：两条策略吃同一串随机数，差别只来自策略',
      pad + 4, barBottom + 70, C, { size: 9, padX: 5, height: 15, align: 'left' });
    void cols;
    void strokeRound;
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

/* =========================================================================
 * lab 组件：rl-temporal-tradeoff —— 「现在吃」还是「以后吃」
 * -------------------------------------------------------------------------
 * 用法（第 50 章 序贯决策与反馈延迟）：
 *
 *   { "type": "rl-temporal-tradeoff", "title": "现在吃 vs 以后吃", "gamma": 0.9 }
 *
 * 字段（都可省）：
 *   gamma    折扣因子 0.50..0.99，默认 0.9
 *   delay    延迟步数 K（1..8），默认 4：大奖励在第 K 步才出现
 *   rNow     现在吃能拿到的即时奖励，默认 3
 *   rLater   以后吃能拿到的大奖励，默认 10
 *   height   画布高度，默认 460
 *
 * 演示什么：一次选择把一个奖励放在 t=0，另一次把更大的奖励放在 t=K。
 * 两条时间线并排，每一步都按 γ^t 折算；游标走到事件那一步才「入账」，
 * 这样学生亲眼看到「奖励延迟 = 价值被折扣吃掉」。
 *   · 单步：游标前进一格；播放：自动走到 K 步；重置：回到 t=0。
 *   · 读数给出 G_现 = r_现 与 G_后 = γ^K·r_后，以及两者的临界折扣
 *     γ* = (r_现/r_后)^(1/K)——γ 超过 γ* 时等待才划算。
 * 取舍：只演示「折扣」这一个机制，不掺探索/策略；滑倒、随机奖励都不进来。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, clamp, fmt, clearBg, onScreen,
} from '../core.js';
import { fillRound, chip, caption, dashedLine, dot, colorRGBA } from './rl-common.js';

const BASE = [
  { name: 'gamma', label: '折扣因子 γ', min: 0.5, max: 0.99, step: 0.01, value: 0.9 },
  { name: 'delay', label: '延迟步数 K', min: 1, max: 8, step: 1, value: 4 },
  { name: 'rNow', label: '现在吃 r 现', min: 0, max: 10, step: 0.5, value: 3 },
  { name: 'rLater', label: '以后吃 r 后', min: 1, max: 20, step: 0.5, value: 10 },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 460, 320, 900);
  let gamma = clamp(typeof spec.gamma === 'number' ? spec.gamma : 0.9, 0.5, 0.99);
  let K = clamp(Math.round(typeof spec.delay === 'number' ? spec.delay : 4), 1, 8);
  let rNow = clamp(typeof spec.rNow === 'number' ? spec.rNow : 3, 0, 10);
  let rLater = clamp(typeof spec.rLater === 'number' ? spec.rLater : 10, 1, 20);

  let tau = 0;                       /* 游标所在的时间步 0..K */
  let playing = false;
  let accNow = 0;                    /* 已入账的现值（现在吃那条时间线） */
  let accLater = 0;                  /* 已入账的现值（以后吃那条时间线） */
  let lastFlash = -1;                 /* 刚入账的步，画一圈呼吸光 */
  let flash = 0;

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);

  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    gamma = st.gamma;
    K = Math.round(st.delay);
    rNow = st.rNow;
    rLater = st.rLater;
    hardReset();
  });

  const ro = buildReadout({
    '现吃收益 G 现': '—',
    '等待收益 G 后': '—',
    '差值（后 − 现）': '—',
    '临界折扣 γ*': '—',
    '结论': '—',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('单步 ▶');
  const bPlay = mkBtn(reduced ? '减少动效' : '播放');
  const bReset = mkBtn('重置');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bPlay, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '单步 = 时间往前走一格；奖励只在它出现的那一步入账，之后不再复利。';
  host.appendChild(hint);

  /* ---- 现值 ---- */
  const gNow = () => rNow;
  const gLater = () => Math.pow(gamma, K) * rLater;
  /* 临界折扣：γ^K·r后 = r现 的解；r现 ≥ r后 时解 ≥ 1，等价于「任何 γ<1 都现吃」 */
  function breakEven() {
    if (rLater <= 0) return NaN;
    const q = rNow / rLater;
    if (q <= 0) return 0;
    if (q >= 1) return 1;
    return Math.pow(q, 1 / K);
  }

  /* ---- 入账：只把「事件时间 ≤ 游标」的那份记进来 ---- */
  function recompute() {
    accNow = tau >= 0 ? gNow() : 0;
    accLater = tau >= K ? gLater() : 0;
  }

  function hardReset() {
    tau = 0;
    playing = false;
    lastFlash = -1;
    flash = 0;
    recompute();
    syncPlay();
    syncReadout();
    draw();
  }

  function syncPlay() {
    bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放');
  }

  /* ---- 循环：只在播放或闪一下时需要帧 ---- */
  let raf = null;
  let last = 0;
  let visible = true;
  let clock = 0;

  function ensure() {
    if (raf == null && visible && host.isConnected) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    raf = null;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (flash > 0) flash = Math.max(0, flash - dt * 2.2);
    if (playing) {
      clock += dt;
      while (clock >= 0.55) {
        clock -= 0.55;
        stepOnce();
        if (!playing) break;
      }
    }
    draw();
    if (playing || flash > 0) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; }
    else if (v) ensure();
  });

  function stepOnce() {
    if (tau >= K) { playing = false; syncPlay(); return; }
    tau += 1;
    if (tau === K) { lastFlash = K; flash = 1; }
    recompute();
    syncReadout();
  }

  bStep.addEventListener('click', () => {
    playing = false;
    syncPlay();
    stepOnce();
    draw();
    ensure();
  });
  bPlay.addEventListener('click', () => {
    if (reduced) return;
    if (tau >= K) hardReset();
    playing = !playing;
    clock = 0;
    syncPlay();
    ensure();
  });
  bReset.addEventListener('click', () => hardReset());

  /* ---- 读数 ---- */
  function syncReadout() {
    const gn = gNow();
    const gl = gLater();
    const d = gl - gn;
    ro.set('现吃收益 G 现', fmt(gn, 2));
    ro.set('等待收益 G 后', fmt(gl, 2) + '（r 后 × γ^' + K + '）');
    ro.set('差值（后 − 现）', (d >= 0 ? '+' : '') + fmt(d, 2));
    const be = breakEven();
    ro.set('临界折扣 γ*', !isFinite(be) ? '—'
      : be >= 1 ? '≥ 1（现吃永远不亏）' : fmt(be, 3));
    ro.set('结论', d > 1e-9 ? '等一等更划算' : (d < -1e-9 ? '现在拿下更划算' : '两者打平'));
  }

  /* ---- 绘制 ---- */
  const geo = { W: 0, Hh: 0, wide: true, x0: 0, x1: 0, laneY: [0, 0], laneH: 0, axisY: 0 };

  function layout(W, Hh) {
    geo.W = W;
    geo.Hh = Hh;
    geo.wide = W >= 640;
    const pad = 14;
    geo.x0 = pad + (geo.wide ? 86 : 70);
    geo.x1 = W - pad - 8;
    geo.laneH = Math.min(70, (Hh - 210) / 2);
    geo.laneY = [56, 56 + geo.laneH + 30];
    geo.axisY = geo.laneY[1] + geo.laneH + 26;
  }
  const px = (t) => geo.x0 + (K <= 0 ? 0 : (t / K) * (geo.x1 - geo.x0));
  const py = (lane, v) => geo.laneY[lane] + geo.laneH - v * (geo.laneH - 16);

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);

    label(ctx, '同一次选择，两个时间点：把奖励放到更远的未来，它还剩多少现值？',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, 'γ = ' + fmt(gamma, 2) + '　K = ' + K + ' 步　r 现 = ' + fmt(rNow, 1)
      + '　r 后 = ' + fmt(rLater, 1) + '　（现值 = 奖励 × γ^等待步数）',
      14, 37, C.axis, { size: 10.5 });

    const maxR = Math.max(rNow, rLater, 1);
    const lanes = [
      { name: '现在吃', color: C.named('orange'), t: 0, r: rNow, acc: accNow },
      { name: '以后吃', color: C.named('green'), t: K, r: rLater, acc: accLater },
    ];

    /* 每个时间步的竖虚线（一眼看出等待了几步） */
    for (let t = 0; t <= K; t += 1) {
      const x = px(t);
      dashedLine(ctx, x, geo.laneY[0] - 6, x, geo.axisY + 4, C.grid, 1, [2, 4]);
      label(ctx, 't=' + t, x, geo.axisY + 18, C.axis, { size: 9.5, align: 'center' });
    }

    lanes.forEach((lane, i) => {
      const y0 = geo.laneY[i];
      /* 车道底 */
      fillRound(ctx, geo.x0 - 46, y0 - 4, geo.x1 - geo.x0 + 52, geo.laneH + 8, 8,
        colorRGBA(C.fg, C.dark ? 0.05 : 0.035, [28, 30, 33]));
      label(ctx, lane.name, geo.x0 - 42, y0 + geo.laneH / 2 + 4, lane.color, { size: 12, weight: 700 });
      label(ctx, lane.t === 0 ? '第 0 步就吃' : '等 ' + K + ' 步', geo.x0 - 42,
        y0 + geo.laneH / 2 + 19, C.axis, { size: 9.5 });

      /* 未到账的奖励画成空心幽灵柱：它在未来，还不属于现在 */
      const bx = px(lane.t);
      const bh = (lane.r / maxR) * (geo.laneH - 16);
      dashedLine(ctx, bx, py(i, lane.r), bx, py(i, 0), lane.color, 1.5, [4, 4]);
      label(ctx, 'r=' + fmt(lane.r, 1), bx, py(i, lane.r) - 6, lane.color,
        { size: 10, align: 'center', weight: 600 });

      /* 已入账的现值柱：高度按 γ^t 缩水 */
      const pv = lane.r * Math.pow(gamma, lane.t);
      const ph = (pv / maxR) * (geo.laneH - 16);
      ctx.save();
      ctx.globalAlpha = tau >= lane.t ? 1 : 0.22;
      fillRound(ctx, bx - 11, py(i, 0) - ph, 22, ph, 4, lane.color);
      ctx.restore();
      if (tau >= lane.t) {
        label(ctx, '现值 ' + fmt(pv, 2), bx, py(i, 0) - ph - 20, C.fg,
          { size: 10, align: 'center', weight: 600 });
      } else {
        label(ctx, '还未入账', bx, py(i, 0) - 8, C.axis, { size: 9.5, align: 'center' });
      }
      /* 打折箭头：从奖励高度指向现值高度 */
      if (tau >= lane.t && lane.t > 0) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        dashedLine(ctx, bx + 18, py(i, lane.r), bx + 18, py(i, 0) - ph, C.axis, 1, [3, 3]);
        ctx.restore();
      }
      /* 累计入账横条 */
      const bw = (lane.acc / maxR) * (geo.x1 - geo.x0);
      fillRound(ctx, geo.x0, y0 + geo.laneH - 6, Math.max(bw, 0), 4, 2, lane.color);
      label(ctx, '已入账 ' + fmt(lane.acc, 2), Math.min(geo.x0 + Math.max(bw, 0) + 6, geo.x1 - 60),
        y0 + geo.laneH + 1, lane.color, { size: 9.5 });
    });

    /* 游标 */
    const cx = px(tau);
    if (!reduced) {
      ctx.save();
      ctx.globalAlpha = 0.14 + 0.1 * flash;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, geo.laneY[0] - 8);
      ctx.lineTo(cx, geo.axisY + 2);
      ctx.stroke();
      ctx.restore();
    }
    chip(ctx, '现在 t=' + tau, cx, geo.laneY[0] - 18, C, { size: 10, fill: colorRGBA(C.accent, 0.16) });

    /* 破局提示：γ* 与结论 */
    const be = breakEven();
    const d = gLater() - gNow();
    const verdict = d > 1e-9 ? '等 ' + K + ' 步更划算：延迟没有吃掉全部价值'
      : (d < -1e-9 ? '现在就吃：' + (K > 0 ? 'γ^' + K + ' 把大奖励折得太狠' : '') : '打平：两条路一样值');
    const bx0 = geo.x0 - 46;
    const by0 = geo.axisY + 30;
    fillRound(ctx, bx0, by0, geo.x1 - bx0 + 6, 58, 8,
      colorRGBA(d >= 0 ? C.named('green') : C.named('orange'), 0.12));
    label(ctx, verdict, bx0 + 10, by0 + 20, C.fg, { size: 11.5, weight: 700 });
    label(ctx, '临界折扣 γ* = (r 现 / r 后)^(1/K) = ' + (!isFinite(be) ? '—'
      : be >= 1 ? '≥ 1（r 现 ≥ r 后 时，任何 γ<1 都该现吃）' : fmt(be, 3))
      + '　→ γ ' + (gamma >= be ? '高于' : '低于') + ' γ*',
      bx0 + 10, by0 + 38, C.axis, { size: 10.5 });
    label(ctx, '这就是「反馈延迟」的代价：同样的数字，晚拿到就要按 γ 打折。',
      bx0 + 10, by0 + 52, C.axis, { size: 10 });

    /* 上一步提示 */
    if (lastFlash >= 0 && tau < K) {
      caption(ctx, '游标未到第 ' + K + ' 步，以后吃那条线的收益还是 0——奖励延迟就是这样「看不见」。',
        geo.x0 - 46, geo.laneY[1] + geo.laneH + 8, C);
    }
    if (tau >= K) {
      dot(ctx, px(K) + 26, geo.laneY[1] + geo.laneH / 2, 3, C.named('green'));
    }

    void Hh;
  }

  /* 初始化 */
  recompute();
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

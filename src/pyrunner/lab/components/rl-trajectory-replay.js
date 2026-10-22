/* =========================================================================
 * lab 组件：rl-trajectory-replay —— 一条轨迹的生成与回溯
 * -------------------------------------------------------------------------
 * 用法（第 50 章 Episode 与 Trajectory）：
 *
 *   { "type": "rl-trajectory-replay", "title": "轨迹生成与回溯", "gamma": 0.9 }
 *
 * 字段（都可省）：
 *   gamma   折扣因子 0.5..0.99，默认 0.9
 *   seed    随机种子，默认 31
 *   height  画布高度，默认 520
 *
 * 演示什么：一条真跑出来的 episode（0→1→2 的链，随机左右走，到 2 得 +1），
 * 上下两个视角同步：
 *   · 上：时间轴。每一步画成一层台阶，标上 s_t、a_t、r_{t+1}；
 *   · 下：回溯。从轨迹末尾往回走，累计折扣回报
 *         G_t = r_{t+1} + γ·G_{t+1}，一格一格点亮。
 * 于是「前向生成」与「后向计算」在同一屏上对撞——这正是轨迹作为原始数据
 * 被反复使用的方式（策略梯度要整条 G，TD 只要相邻两步）。
 *   · 前进：生成下一步；回溯：从后往前算一格；整条：直接生成完整 episode；
 *   · 切换轨迹：换一条随机路径（换 seed），比较长度与回报。
 * 读数给出当前步、轨迹长度、总回报、以及 G_0 与「只看即时奖励之和」的对照。
 * 取舍：不做学习，只把「轨迹」当成一等公民展示；把 episode 的终止条件写成
 * 「到达 2」或「步数上限」，让学生看到 time limit 与真终止的区别。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, arrow, clamp, fmt, clearBg, onScreen, mulberry32,
} from '../core.js';
import { fillRound, chip, caption, colorRGBA, strokeRound, dot, dashedLine } from './rl-common.js';

const BASE = [
  { name: 'gamma', label: '折扣因子 γ', min: 0.5, max: 0.99, step: 0.01, value: 0.9 },
];

const MAX_STEPS = 12;
const NS = 3;                    /* 位置 0,1,2；2 是终点 */

export default function render(host, spec) {
  const H = clamp(spec.height || 520, 360, 940);
  let gamma = clamp(typeof spec.gamma === 'number' ? spec.gamma : 0.9, 0.5, 0.99);
  let seed = Math.round(typeof spec.seed === 'number' ? spec.seed : 31);

  /* path 的第 i 项：{ s, a, r, ns }；s 是离开的状态，ns 是到达的状态 */
  let path = [];
  let done = false;
  let truncated = false;
  let s = 0;
  let cursor = -1;             /* 回溯游标：-1 = 还没开始回溯 */
  let G = [];                  /* 每个时刻的折扣回报，从后往前填 */
  let playing = false;
  let acc = 0;

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    gamma = st.gamma;
    resetAll(seed);
  });

  const ro = buildReadout({
    '步数': '0',
    '轨迹长度 T': '0',
    '终止方式': '—',
    '总回报 Σr': '0',
    'G_0（折扣回报）': '—',
    '回溯进度': '未开始',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('前进一步 ▶');
  const bBack = mkBtn('回溯一格 ◀');
  const bAll = mkBtn('整条轨迹 ⏭');
  const bNew = mkBtn('换一条轨迹');
  const bPlay = mkBtn(reduced ? '减少动效' : '播放');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bBack, bAll, bNew, bPlay));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '前进 = 生成轨迹；回溯 = 从末尾往前算 G_t = r + γ·G_{t+1}。两种方向在同一屏上对撞。';
  host.appendChild(hint);

  /* ---- 生成 ---- */
  function resetAll(newSeed) {
    seed = newSeed;
    path = [];
    done = false;
    truncated = false;
    s = 0;
    cursor = -1;
    G = [];
    playing = false;
    acc = 0;
    syncPlay();
    syncReadout();
    draw();
  }

  function advance() {
    if (done) { playing = false; syncPlay(); return; }
    const rngA = mulberry32(seed * 7919 + path.length * 104729 + 13);
    const a = rngA() < 0.5 ? -1 : 1;
    const ns = clamp(s + a, 0, NS - 1);
    const r = ns === NS - 1 && s !== NS - 1 ? 1 : 0;
    path.push({ s, a, r, ns, t: path.length });
    s = ns;
    if (ns === NS - 1) done = true;
    else if (path.length >= MAX_STEPS) { done = true; truncated = true; }
    G = new Array(path.length).fill(null);
    cursor = -1;
    syncReadout();
  }

  function stepBack() {
    if (!path.length) return;
    if (cursor === -1) { cursor = path.length - 1; }
    else if (cursor > 0) { cursor -= 1; }
    /* 填 G：从末尾往 cursor 计算 */
    let accG = 0;
    for (let i = path.length - 1; i >= cursor; i -= 1) {
      accG = path[i].r + gamma * accG;
      G[i] = accG;
    }
    syncReadout();
  }

  function fullTrace() {
    let guard = 0;
    while (!done && guard < MAX_STEPS + 2) {
      advance();
      guard += 1;
    }
    cursor = -1;
    stepBack();
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
      while (acc >= 0.42 && playing) {
        acc -= 0.42;
        if (!done) advance();
        else if (cursor > 0) stepBack();
        else { playing = false; syncPlay(); }
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

  bStep.addEventListener('click', () => { playing = false; syncPlay(); advance(); draw(); });
  bBack.addEventListener('click', () => { playing = false; syncPlay(); stepBack(); draw(); });
  bAll.addEventListener('click', () => { playing = false; syncPlay(); fullTrace(); draw(); });
  bNew.addEventListener('click', () => resetAll(seed + 1));
  bPlay.addEventListener('click', () => {
    if (reduced) return;
    if (done && cursor <= 0) resetAll(seed);
    playing = !playing;
    acc = 0;
    syncPlay();
    ensure();
  });

  function totalReward() {
    return path.reduce((a, p) => a + p.r, 0);
  }

  function syncReadout() {
    ro.set('步数', String(path.length) + ' / ' + MAX_STEPS);
    ro.set('轨迹长度 T', String(path.length));
    ro.set('终止方式', !done ? '进行中' : (truncated ? '被步数上限截断（不是真终止）' : '到达终点（真终止）'));
    ro.set('总回报 Σr', fmt(totalReward(), 0));
    const g0 = G.length && G[0] !== null ? fmt(G[0], 4) : '—';
    ro.set('G_0（折扣回报）', path.length ? g0 : '—');
    ro.set('回溯进度', cursor < 0 ? '未开始' :
      (cursor === 0 ? '已回到 t=0（整条算完）' : '已算到 t=' + cursor));
  }

  /* ---- 绘制 ---- */
  const geo = { W: 0, Hh: 0 };

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    geo.W = W;
    geo.Hh = Hh;

    label(ctx, '一条轨迹：前向生成（s→a→r→s′），后向计算（G_t = r + γG_{t+1}）',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '三格链：0 → 1 → 2（2 是终点，进入得 +1）　γ = ' + fmt(gamma, 2)
      + '　随机动作左右各半　上限 ' + MAX_STEPS + ' 步',
      14, 38, C.axis, { size: 10.5 });

    const railY = 84;
    drawRail(ctx, C, railY, W);

    const top = 150;
    const rowH = Math.min(30, Math.max(20, (Hh - 300) / Math.max(MAX_STEPS, 1)));
    drawSteps(ctx, C, top, rowH, W);
    drawReturn(ctx, C, top + MAX_STEPS * rowH + 22, W);
    void Hh;
  }

  function drawRail(ctx, C, y, W) {
    caption(ctx, '环境：三个位置，走到最右边就结束', 14, y - 12, C);
    const cx = [W * 0.24, W * 0.5, W * 0.76];
    for (let i = 0; i < NS; i += 1) {
      const x = cx[i];
      const isTerm = i === NS - 1;
      const here = s === i && !done;
      fillRound(ctx, x - 34, y, 68, 34, 8,
        isTerm ? colorRGBA(C.bad, 0.16) : colorRGBA(C.fg, C.dark ? 0.06 : 0.035, [28, 30, 33]));
      strokeRound(ctx, x - 33.5, y + 0.5, 67, 33, 8, here ? C.accent : C.grid, here ? 2 : 1);
      label(ctx, isTerm ? '终点 2' : '位置 ' + i, x, y + 22,
        isTerm ? C.bad : C.fg, { size: 11.5, align: 'center', weight: 700 });
      if (i < NS - 1) {
        arrow(ctx, x + 36, y + 17, cx[i + 1] - 36, y + 17, C.axis, 1.4, 6);
      }
    }
    if (!done) dot(ctx, cx[s], y + 8, 3.4, C.named('orange'));
  }

  function drawSteps(ctx, C, y, rowH, W) {
    caption(ctx, '时间轴：每一步的 (s_t, a_t, r_{t+1}, s_{t+1})', 14, y - 10, C);
    const lx = 92;
    const rEnd = W - 16;
    const per = Math.max((rEnd - lx) / MAX_STEPS, 6);

    for (let i = 0; i < MAX_STEPS; i += 1) {
      const yy = y + i * rowH;
      const step = path[i];
      const active = !!step;
      const isBack = cursor >= 0 && i >= cursor;
      if (!active) {
        if (i === path.length && dot) {
          /* 下一步的落点：一个空心占位 */
          strokeRound(ctx, lx, yy + 3, per - 3, rowH - 6, 3, C.grid, 1);
        } else {
          dashedLine(ctx, lx, yy + rowH / 2, rEnd, yy + rowH / 2, colorRGBA(C.grid, 0.5), 1, [2, 6]);
        }
        continue;
      }
      label(ctx, 't=' + i, 16, yy + rowH / 2 + 4, C.axis, { size: 9.5 });
      /* 状态轨道：三段位置，标出 s_t 与 s_{t+1} */
      const trackX0 = lx;
      const trackW = rEnd - lx;
      const pos = (k) => trackX0 + (k / (NS - 1)) * trackW * 0.62;
      strokeRound(ctx, trackX0, yy + 4, trackW * 0.62, rowH - 8, 4,
        isBack ? colorRGBA(C.named('green'), 0.5) : C.grid, 1);
      const x0 = pos(step.s);
      const x1 = pos(step.ns);
      arrow(ctx, x0, yy + rowH / 2, x1, yy + rowH / 2,
        isBack ? C.named('green') : C.accent, 2, 6);
      label(ctx, step.a < 0 ? '←' : '→', (x0 + x1) / 2, yy + 10, C.axis, { size: 9, align: 'center' });
      /* 右侧：奖励与 G */
      const tx = trackX0 + trackW * 0.64;
      label(ctx, 's=' + step.s + '→' + step.ns, tx, yy + rowH / 2 + 4, C.fg, { size: 9.5 });
      label(ctx, 'r=' + (step.r > 0 ? '+1' : '0'), tx + 74, yy + rowH / 2 + 4,
        step.r ? C.bad : C.axis, { size: 9.5, weight: step.r ? 700 : 400 });
      if (G[i] !== null && G[i] !== undefined) {
        chip(ctx, 'G=' + fmt(G[i], 3), tx + 128, yy + rowH / 2, C,
          { size: 9, padX: 4, height: 15, align: 'left',
            fill: colorRGBA(isBack ? C.named('green') : C.accent, 0.18) });
      }
    }
    /* 终点标记 */
    if (done && !truncated) {
      const yy = y + path.length * rowH + 4;
      label(ctx, '到达终点 2 → episode 在这里结束（真终止）', 16, yy, C.named('green'),
        { size: 10, weight: 700 });
    } else if (done && truncated) {
      const yy = y + path.length * rowH + 4;
      label(ctx, '步数到 ' + MAX_STEPS + ' 被截断（time limit，不是真终止）', 16, yy, C.named('orange'),
        { size: 10, weight: 700 });
    }
  }

  function drawReturn(ctx, C, y, W) {
    caption(ctx, '回溯：从末尾往前，G_t = r_{t+1} + γ·G_{t+1}', 14, y - 6, C);
    if (!path.length) {
      label(ctx, '先点「前进一步 ▶」生成轨迹，再「回溯一格 ◀」从后往前算回报。', 14, y + 16, C.fg, { size: 10.5 });
      return;
    }
    const n = path.length;
    const w = Math.min((W - 40) / Math.max(n, 1), 120);
    let lastG = null;
    for (let i = n - 1; i >= 0; i -= 1) {
      if (G[i] === null || G[i] === undefined) break;
      lastG = G[i];
      void lastG;
    }
    path.forEach((step, i) => {
      const x = 14 + i * w;
      const filled = G[i] !== null && G[i] !== undefined;
      const isCursor = cursor === i;
      fillRound(ctx, x, y + 6, Math.max(w - 6, 20), 40, 6,
        filled ? colorRGBA(C.named('green'), isCursor ? 0.34 : 0.16) : colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
      strokeRound(ctx, x + 0.5, y + 6.5, Math.max(w - 7, 19), 39, 6, isCursor ? C.named('green') : C.grid, isCursor ? 2 : 1);
      label(ctx, 't=' + i, x + 6, y + 20, C.axis, { size: 9 });
      label(ctx, filled ? fmt(G[i], 3) : '—', x + 6, y + 38, filled ? C.fg : C.axis,
        { size: 11.5, weight: filled ? 700 : 400 });
      if (i < n - 1) {
        arrow(ctx, x + Math.max(w - 6, 20) + 1, y + 26, x + w - 3, y + 26,
          G[i] !== null && G[i + 1] !== null ? C.named('green') : colorRGBA(C.axis, 0.5), 1.4, 5);
      }
    });
    const g0 = G[0];
    const line = (g0 === null || g0 === undefined)
      ? '继续「回溯一格 ◀」直到回到 t=0。'
      : 'G_0 = ' + fmt(g0, 4) + '　即时奖励之和 Σr = ' + fmt(totalReward(), 0)
        + '　差距来自 γ 对远期奖励的折扣：离终点越远，那 1 分折得越狠。';
    label(ctx, line, 14, y + 62, C.fg, { size: 10.5, weight: 600 });
    dashedLine(ctx, 14, y + 72, W - 14, y + 72, C.grid, 1, [3, 4]);
    label(ctx, '策略梯度要的是一条完整的 G_0；TD 只看相邻两步的 r + γV(s′)——同一份轨迹，两种用法。',
      14, y + 88, C.axis, { size: 10 });
  }

  resetAll(seed);
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

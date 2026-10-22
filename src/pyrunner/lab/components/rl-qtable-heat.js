/* =========================================================================
 * lab 组件：rl-qtable-heat —— Q 表热力图，叠着一条正在跑的轨迹
 * -------------------------------------------------------------------------
 * 用法（第 50 章 Q-learning 更新）：
 *
 *   { "type": "rl-qtable-heat", "title": "Q 表热力图与轨迹", "alpha": 0.2, "gamma": 0.9, "epsilon": 0.15 }
 *
 * 字段（都可省）：
 *   alpha    学习率 0.05..1，默认 0.2
 *   gamma    折扣因子 0.5..0.99，默认 0.9
 *   epsilon  探索概率 0..0.5，默认 0.15
 *   grid     行列数，默认 4
 *   seed     随机种子（固定后每次刷新轨迹相同），默认 140
 *   height   画布高度，默认 580
 *
 * 演示什么：真跑 Q-learning，不画示意图。
 *   · 每个格子被两条对角线切成四块三角形，对应 ↑ → ↓ ← 四个动作的 Q 值；
 *     三角形越亮，Q 越高——热力图就是「Q 表按状态摊在网格上」。
 *   · 贪心箭头画在最亮的那个三角形方向上；当 Q 还全是 0 时箭头没有意义，
 *     会画成浅色虚线，直到某格真的被更新过。
 *   · 轨迹：当前 episode 走过的格子留下实线，上一回合的轨迹留淡色残影；
 *     刚被更新的 (s,a) 用白圈 + 三角高亮标出来，和右栏账本一一对应。
 *   · 单步 = 走一步并更新一次；整回合 = 跑到终点或步数上限；
 *     播放 = 连续跑；重置 = 清空 Q 表与统计。
 * 取舍：确定性转移（撞墙原地），奖励只在进入终点时给 +1，不加滑倒；
 * ε-greedy 只在动作选择上用，更新目标是 off-policy 的 max——两件事分开。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, arrow, clamp, fmt, clearBg, onScreen, mulberry32,
} from '../core.js';
import { fillRound, chip, caption, colorRGBA, strokeRound, dot, dashedLine } from './rl-common.js';

const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];      /* 上 右 下 左 */
const GLYPH = ['↑', '→', '↓', '←'];

const BASE = [
  { name: 'alpha', label: '学习率 α', min: 0.05, max: 1, step: 0.05, value: 0.2 },
  { name: 'gamma', label: '折扣因子 γ', min: 0.5, max: 0.99, step: 0.01, value: 0.9 },
  { name: 'epsilon', label: '探索 ε', min: 0, max: 0.5, step: 0.05, value: 0.15 },
];

export default function render(host, spec) {
  const n = clamp(Math.round(spec.grid || 4), 3, 5);
  const H = clamp(spec.height || 580, 380, 940);
  let alpha = clamp(typeof spec.alpha === 'number' ? spec.alpha : 0.2, 0.05, 1);
  let gamma = clamp(typeof spec.gamma === 'number' ? spec.gamma : 0.9, 0.5, 0.99);
  let eps = clamp(typeof spec.epsilon === 'number' ? spec.epsilon : 0.15, 0, 0.5);
  const seed = Math.round(typeof spec.seed === 'number' ? spec.seed : 140);

  const N = n * n;
  const K = (r, c) => r * n + c;
  const ROW = (k) => Math.floor(k / n);
  const COL = (k) => k % n;

  const goal = K(0, n - 1);
  const walls = new Set();
  const given = Array.isArray(spec.walls) ? spec.walls : (n === 4 ? [[1, 1], [2, 2]] : [[1, 1]]);
  given.forEach((w) => {
    if (Array.isArray(w) && w[0] >= 0 && w[0] < n && w[1] >= 0 && w[1] < n) {
      const k = K(w[0], w[1]);
      if (k !== goal) walls.add(k);
    }
  });
  const maxSteps = 60;

  let Q = new Float64Array(N * 4);
  let seen = new Uint8Array(N);            /* 这一格是否被更新过（决定箭头要不要画实心） */
  let s = 0;
  let episode = 1;
  let stepInEp = 0;
  let episodesDone = 0;
  let totalUpdates = 0;
  let trail = [0];                          /* 本回合轨迹 */
  let ghost = [];                           /* 上一回合轨迹 */
  let last = { s: -1, a: -1, r: 0, ns: -1, delta: 0, before: 0, after: 0 };
  let flash = 0;
  let playing = false;
  let rng = mulberry32(seed);
  let returns = [];                         /* 每回合回报，画成小柱 */
  let epReturn = 0;

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    alpha = st.alpha;
    gamma = st.gamma;
    eps = st.epsilon;
  });

  const ro = buildReadout({
    '回合 / 步': '1 / 0',
    '最近更新 (s,a)': '—',
    '目标 r+γmax Q': '—',
    'δ': '—',
    'Q 变化': '—',
    '已学状态': '0 / ' + (N - 1),
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('单步 ▶');
  const bEp = mkBtn('整回合 ⏭');
  const bPlay = mkBtn(reduced ? '减少动效' : '播放');
  const bReset = mkBtn('重置');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bEp, bPlay, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '四个三角形 = 该格子四个动作的 Q 值，越亮越高；箭头指向当前贪心动作。单步 = 走一步 + 更新一次。';
  host.appendChild(hint);

  /* ---- 环境与更新 ---- */
  function stepOf(k, a) {
    if (k === goal) return k;
    const r = ROW(k) + DIRS[a][0];
    const c = COL(k) + DIRS[a][1];
    if (r < 0 || r >= n || c < 0 || c >= n) return k;
    const nk = K(r, c);
    if (walls.has(nk)) return k;
    return nk;
  }
  const rewardOf = (nk) => (nk === goal ? 1 : 0);

  function bestQ(k) {
    let b = -Infinity;
    let ai = 0;
    for (let a = 0; a < 4; a += 1) {
      const v = Q[k * 4 + a];
      if (v > b + 1e-12) { b = v; ai = a; }
    }
    return { v: b, a: ai };
  }

  function chooseAction(k) {
    if (rng() < eps) return Math.floor(rng() * 4) % 4;
    const b = bestQ(k);
    /* 并列时随机挑一个，避免箭头永远偏向上 */
    const ties = [];
    for (let a = 0; a < 4; a += 1) if (Math.abs(Q[k * 4 + a] - b.v) < 1e-12) ties.push(a);
    return ties[Math.floor(rng() * ties.length) % ties.length];
  }

  function envStep() {
    if (s === goal) return;                 /* 终点不再行动 */
    if (stepInEp === 0 && trail.length > 1) trail = [s];
    const a = chooseAction(s);
    const ns = stepOf(s, a);
    const r = rewardOf(ns);
    const bn = bestQ(ns);
    const target = r + gamma * (ns === goal ? 0 : bn.v);
    const before = Q[s * 4 + a];
    Q[s * 4 + a] = before + alpha * (target - before);
    seen[s] = 1;
    totalUpdates += 1;
    last = { s, a, r, ns, delta: target - before, before, after: Q[s * 4 + a] };
    s = ns;
    stepInEp += 1;
    epReturn += r;
    trail.push(ns);
    flash = 1;
    if (ns === goal || stepInEp >= maxSteps) endEpisode();
    syncReadout();
  }

  function endEpisode() {
    if (trail.length > 1) ghost = trail.slice();
    returns.push(epReturn);
    if (returns.length > 60) returns.shift();
    episodesDone += 1;
    episode += 1;
    s = 0;
    stepInEp = 0;
    epReturn = 0;
    trail = [0];
  }

  /* ---- 循环 ---- */
  let raf = null;
  let lastT = 0;
  let visible = true;
  let acc = 0;
  function needLoop() { return playing || flash > 0; }
  function ensure() {
    if (raf == null && visible && host.isConnected) { lastT = 0; raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    raf = null;
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 1 / 60;
    lastT = now;
    if (flash > 0) flash = Math.max(0, flash - dt * 2.2);
    if (playing) {
      acc += dt;
      while (acc >= 0.16 && playing) {
        acc -= 0.16;
        envStep();
        if (episodesDone >= 400) { playing = false; syncPlay(); break; }
      }
    }
    draw();
    if (needLoop()) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else if (v && needLoop()) ensure();
  });

  function hardReset() {
    Q = new Float64Array(N * 4);
    seen = new Uint8Array(N);
    s = 0;
    episode = 1;
    stepInEp = 0;
    episodesDone = 0;
    totalUpdates = 0;
    trail = [0];
    ghost = [];
    returns = [];
    epReturn = 0;
    last = { s: -1, a: -1, r: 0, ns: -1, delta: 0, before: 0, after: 0 };
    flash = 0;
    playing = false;
    rng = mulberry32(seed);
    syncPlay();
    syncReadout();
    draw();
  }
  function syncPlay() { bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放'); }

  bStep.addEventListener('click', () => { playing = false; syncPlay(); envStep(); draw(); ensure(); });
  bEp.addEventListener('click', () => {
    playing = false;
    syncPlay();
    const startEp = episodesDone;
    let guard = 0;
    while (episodesDone === startEp && guard < maxSteps + 4) { envStep(); guard += 1; }
    draw();
    ensure();
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
    ro.set('回合 / 步', String(episode) + ' / ' + String(stepInEp));
    if (last.s < 0) {
      ro.set('最近更新 (s,a)', '—（还没走过一步）');
      ro.set('目标 r+γmax Q', '—');
      ro.set('δ', '—');
      ro.set('Q 变化', '—');
    } else {
      const ns = last.ns;
      const bn = bestQ(ns);
      ro.set('最近更新 (s,a)', '(' + ROW(last.s) + ',' + COL(last.s) + ') ' + GLYPH[last.a]
        + ' → (' + ROW(ns) + ',' + COL(ns) + ')');
      ro.set('目标 r+γmax Q', fmt(last.r, 0) + ' + ' + fmt(gamma, 2) + '×'
        + fmt(ns === goal ? 0 : bn.v, 3) + ' = ' + fmt(last.r + gamma * (ns === goal ? 0 : bn.v), 3));
      ro.set('δ', fmt(last.delta, 3));
      ro.set('Q 变化', fmt(last.before, 3) + ' → ' + fmt(last.after, 3));
    }
    let cnt = 0;
    for (let k = 0; k < N; k += 1) if (seen[k] && k !== goal) cnt += 1;
    ro.set('已学状态', String(cnt) + ' / ' + String(N - 1) + (episodesDone ? '　已完成 ' + episodesDone + ' 回合' : ''));
  }

  /* ---- 布局 ---- */
  const geo = { gx: 0, gy: 0, cell: 0, wide: true, px: 0, py: 0, pw: 0 };

  function layout(W, Hh) {
    geo.wide = W >= 700;
    const pad = 14;
    const mapMax = geo.wide ? Math.min(W * 0.46, Hh - 250) : Math.min(W - pad * 2, 300);
    geo.cell = Math.max(52, Math.floor(mapMax / n));
    geo.gx = geo.wide ? pad + 6 : Math.round((W - geo.cell * n) / 2);
    geo.gy = 62;
    geo.px = geo.wide ? geo.gx + geo.cell * n + 20 : pad + 2;
    geo.py = geo.wide ? 62 : geo.gy + geo.cell * n + 24;
    geo.pw = geo.wide ? W - geo.px - pad : W - pad * 2 - 4;
  }

  function qRange() {
    let lo = 0;
    let hi = 1e-6;
    for (let i = 0; i < N * 4; i += 1) { lo = Math.min(lo, Q[i]); hi = Math.max(hi, Q[i]); }
    return { lo, hi };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);
    const { lo, hi } = qRange();
    const span = Math.max(hi - lo, 1e-9);

    label(ctx, 'Q 表摊在网格上：每格四个三角形 = 四个动作的 Q 值，越亮越高',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, 'α = ' + fmt(alpha, 2) + '　γ = ' + fmt(gamma, 2) + '　ε = ' + fmt(eps, 2)
      + '　目标 = r + γ·max_a′ Q(s′,a′)，max 只对下一状态取',
      14, 38, C.axis, { size: 10.5 });

    /* 上一回合残影 */
    if (ghost.length > 1) drawPath(ctx, C, ghost, colorRGBA(C.axis, 0.5), 2, [3, 4]);

    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        const k = K(r, c);
        const x = geo.gx + c * geo.cell;
        const y = geo.gy + r * geo.cell;
        const cx = x + geo.cell / 2;
        const cy = y + geo.cell / 2;
        const h2 = geo.cell / 2 - 2;

        if (walls.has(k)) {
          fillRound(ctx, x + 2, y + 2, geo.cell - 4, geo.cell - 4, 6, colorRGBA(C.fg, 0.10, [28, 30, 33]));
          label(ctx, '墙', cx, cy + 4, C.axis, { size: 10, align: 'center' });
          continue;
        }
        if (k === goal) {
          fillRound(ctx, x + 2, y + 2, geo.cell - 4, geo.cell - 4, 6, colorRGBA(C.bad, 0.18));
          strokeRound(ctx, x + 2.5, y + 2.5, geo.cell - 5, geo.cell - 5, 6, C.bad, 2);
          label(ctx, '目标 +1', cx, cy + 4, C.bad, { size: Math.min(12, geo.cell * 0.2), align: 'center', weight: 700 });
          label(ctx, '终点不再行动', cx, cy + 20, C.axis, { size: 9, align: 'center' });
          continue;
        }
        /* 四个三角 */
        const base = C.dark ? 0.06 : 0.035;
        for (let a = 0; a < 4; a += 1) {
          const t = (Q[k * 4 + a] - lo) / span;
          const color = colorRGBA(C.accent, base + t * 0.78, [59, 116, 214]);
          ctx.save();
          ctx.beginPath();
          if (a === 0) { ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + geo.cell - 2, y + 2); ctx.lineTo(cx, cy); }
          else if (a === 1) { ctx.moveTo(x + geo.cell - 2, y + 2); ctx.lineTo(x + geo.cell - 2, y + geo.cell - 2); ctx.lineTo(cx, cy); }
          else if (a === 2) { ctx.moveTo(x + geo.cell - 2, y + geo.cell - 2); ctx.lineTo(x + 2, y + geo.cell - 2); ctx.lineTo(cx, cy); }
          else { ctx.moveTo(x + 2, y + geo.cell - 2); ctx.lineTo(x + 2, y + 2); ctx.lineTo(cx, cy); }
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          ctx.restore();
        }
        /* 边框 + 最近更新高亮 */
        strokeRound(ctx, x + 2.5, y + 2.5, geo.cell - 5, geo.cell - 5, 6, C.grid, 1);
        if (flash > 0 && k === last.s) {
          ctx.save();
          ctx.globalAlpha = 0.8 * flash;
          strokeRound(ctx, x + 1.5, y + 1.5, geo.cell - 3, geo.cell - 3, 7, C.fg, 2.4);
          ctx.restore();
        }
        /* 贪心箭头 */
        if (seen[k]) {
          const b = bestQ(k);
          const dx = DIRS[b.a][1];
          const dy = DIRS[b.a][0];
          const L = geo.cell * 0.2;
          arrow(ctx, cx - dx * L * 0.3, cy - dy * L * 0.3, cx + dx * L, cy + dy * L, C.fg, 2.2, 7);
          label(ctx, fmt(b.v, 2), cx, cy - geo.cell * 0.27, C.fg, { size: 9.5, align: 'center', weight: 700 });
          const L2 = geo.cell * 0.3;
          void L2;
        } else {
          label(ctx, '未学', cx, cy + 4, C.axis, { size: 9.5, align: 'center' });
        }
        /* 四个动作的符号角标 */
        label(ctx, '↑', cx, y + 13, colorRGBA(C.fg, 0.55), { size: 9, align: 'center' });
        label(ctx, '→', x + geo.cell - 10, cy + 3, colorRGBA(C.fg, 0.55), { size: 9, align: 'center' });
        label(ctx, '↓', cx, y + geo.cell - 5, colorRGBA(C.fg, 0.55), { size: 9, align: 'center' });
        label(ctx, '←', x + 10, cy + 3, colorRGBA(C.fg, 0.55), { size: 9, align: 'center' });
        void h2;
      }
    }

    /* 轨迹：本回合 */
    if (trail.length > 1) drawPath(ctx, C, trail, C.named('green'), 2.4);
    /* 智能体 */
    const ax = geo.gx + COL(s) * geo.cell + geo.cell / 2;
    const ay = geo.gy + ROW(s) * geo.cell + geo.cell / 2;
    dot(ctx, ax, ay, Math.max(4, geo.cell * 0.09), C.named('orange'));
    chip(ctx, 'agent', ax, ay - geo.cell * 0.34, C, { size: 9, padX: 4, height: 14, fill: colorRGBA(C.named('orange'), 0.25), color: C.fg });

    /* 图例 */
    const ly = geo.gy + geo.cell * n + 14;
    if (geo.wide) {
      label(ctx, '亮度 = Q 值高低　箭头 = 贪心动作　绿线 = 本回合轨迹　淡虚线 = 上一回合',
        geo.gx, ly, C.axis, { size: 10 });
    } else {
      label(ctx, '亮度 = Q 值　箭头 = 贪心动作　绿线 = 本回合轨迹', geo.gx, ly, C.axis, { size: 10 });
    }

    /* 右栏：选中状态的 Q 行 + 账本 + 回报曲线 */
    const py = geo.wide ? geo.py : ly + 24;
    drawPanel(ctx, C, geo.px, py, geo.pw);
    void Hh;
  }

  const centerOf = (k) => ({
    x: geo.gx + COL(k) * geo.cell + geo.cell / 2,
    y: geo.gy + ROW(k) * geo.cell + geo.cell / 2,
  });

  function drawPath(ctx, C, path, color, w, dash) {
    if (path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    path.forEach((k, i) => {
      const p = centerOf(k);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawPanel(ctx, C, x, y, w) {
    /* 1) 当前状态的四条 Q */
    const k = last.s >= 0 && flash > 0.05 ? last.s : s;
    caption(ctx, '状态 (' + ROW(k) + ',' + COL(k) + ') 的四个动作', x, y - 2, C);
    const qs = [0, 1, 2, 3].map((a) => Q[k * 4 + a]);
    let lo = Math.min(0, ...qs);
    let hi = Math.max(1e-6, ...qs);
    const pad = (hi - lo) * 0.18 + 1e-6;
    lo -= pad; hi += pad;
    const barW = Math.max(60, w - 96);
    for (let a = 0; a < 4; a += 1) {
      const yy = y + 12 + a * 22;
      label(ctx, GLYPH[a], x + 4, yy + 11, C.axis, { size: 12, weight: 700 });
      const zw = ((qs[a] - lo) / (hi - lo)) * barW;
      fillRound(ctx, x + 22, yy + 2, Math.max(2, zw), 14, 3, seen[k] ? C.accent : colorRGBA(C.axis, 0.35));
      label(ctx, fmt(qs[a], 3), x + 26 + Math.max(2, zw), yy + 13, C.fg, { size: 10 });
      if (last.a === a && flash > 0.05) {
        chip(ctx, '刚更新', x + w - 30, yy + 9, C, { size: 9, padX: 4, height: 15, fill: colorRGBA(C.ok, 0.22) });
      }
    }

    /* 2) 账本 */
    const ly = y + 12 + 4 * 22 + 14;
    fillRound(ctx, x - 6, ly - 14, w + 10, 96, 8, colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
    caption(ctx, '最近一次更新', x, ly, C);
    if (last.s < 0) {
      label(ctx, '还没走过一步。点「单步 ▶」：选动作 → 得奖励 → 用下一步的 max Q 构造目标。', x, ly + 20, C.fg, { size: 10.5 });
      label(ctx, 'Q 全是 0 时，目标只剩即时奖励 r，这正是自举的起点。', x, ly + 38, C.axis, { size: 10 });
    } else {
      const ns = last.ns;
      const bn = bestQ(ns);
      const target = last.r + gamma * (ns === goal ? 0 : bn.v);
      label(ctx, '(' + ROW(last.s) + ',' + COL(last.s) + ') ' + GLYPH[last.a] + ' → ('
        + ROW(ns) + ',' + COL(ns) + ')　r = ' + fmt(last.r, 0), x, ly + 18, C.fg, { size: 10.5, weight: 600 });
      label(ctx, 'next 的 max Q = ' + fmt(ns === goal ? 0 : bn.v, 3) + '（动作 '
        + GLYPH[bn.a] + '）　目标 = ' + fmt(last.r, 0) + ' + ' + fmt(gamma, 2) + '×'
        + fmt(ns === goal ? 0 : bn.v, 3) + ' = ' + fmt(target, 3), x, ly + 34, C.axis, { size: 10 });
      label(ctx, 'Q ← Q + α(目标 − Q) = ' + fmt(Q[last.s * 4 + last.a], 3)
        + '　（α = ' + fmt(alpha, 2) + '）', x, ly + 50, C.ok, { size: 10.5, weight: 700 });
      label(ctx, '注意 max 用的是「下一状态」的动作，不是踩着的这一脚。', x, ly + 68, C.axis, { size: 10 });
    }

    /* 3) 回报曲线 */
    const cy0 = ly + 104;
    const cw = w;
    const ch = Math.max(48, Math.min(86, cv.H - cy0 - 20));
    if (ch > 40) {
      caption(ctx, '每回合回报（' + (returns.length ? returns.length + ' 个回合' : '还没有完整回合') + '）', x, cy0, C);
      const box = { x: x + 4, y: cy0 + 8, w: cw - 22, h: ch - 12 };
      dashedLine(ctx, box.x, box.y + box.h, box.x + box.w, box.y + box.h, C.axis, 1, [3, 3]);
      if (returns.length > 1) {
        const maxR = Math.max(1, ...returns);
        const stepX = box.w / Math.max(returns.length - 1, 1);
        const pts = returns.map((v, i) => [box.x + i * stepX, box.y + box.h - (v / maxR) * box.h]);
        ctx.save();
        ctx.strokeStyle = C.named('orange');
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.stroke();
        ctx.restore();
        pts.forEach((p) => dot(ctx, p[0], p[1], 1.6, C.named('orange')));
      }
      label(ctx, '1 分 = 走到目标', box.x + box.w, box.y + box.h + 12, C.axis, { size: 9, align: 'right' });
    }
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

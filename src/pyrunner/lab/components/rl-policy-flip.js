/* =========================================================================
 * lab 组件：rl-policy-flip —— 策略迭代：箭头是怎么被一轮轮「扶正」的
 * -------------------------------------------------------------------------
 * 用法（第 50 章 策略迭代）：
 *
 *   { "type": "rl-policy-flip", "title": "策略评估 → 策略改进", "gamma": 0.9 }
 *
 * 字段（都可省）：
 *   gamma   折扣因子 0.5..0.99，默认 0.9
 *   grid    行列数（正方形），默认 4
 *   walls   墙的坐标数组，默认 [[1,1],[1,2]]
 *   height  画布高度，默认 560
 *
 * 演示什么：策略迭代是两个动作交替——
 *   评估：固定 π，反复扫 V(s) ← r(s,π(s)) + γ·V(s′)，扫到 Δ 很小；
 *   改进：对每格算四个 Q(s,a) = r + γ·V(s′)，取 max 换掉箭头。
 * 状态机：单步 = 一次评估扫描；改进 = 一次策略改进（箭头可能翻转并由绿色
 * 闪烁标出）；自动 = 评估到收敛→改进→再评估，直到一轮没有任何箭头改变。
 *   · 点格子可以选中它，右栏画它的四条 Q 值柱与当前 V 的虚线——
 *     「改进」在这个视角下就是「把箭头挪到虚线右边那根柱子」。
 *   · 读数给出评估扫描数、本轮最大变化 Δ、本轮翻转格数、外循环轮数。
 * 取舍：环境确定性（动作一定到达下一格），只让「评估/改进」这一对概念出场；
 * 滑倒随机性留给 Bellman 那几课。终点/陷阱的价值固定为 0（到达即结束）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, arrow, clamp, fmt, clearBg, onScreen,
} from '../core.js';
import { fillRound, chip, caption, dashedLine, heatColor, strokeRound, colorRGBA, dot } from './rl-common.js';

const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];        /* 上 右 下 左 */
const GLYPH = ['↑', '→', '↓', '←'];

const BASE = [
  { name: 'gamma', label: '折扣因子 γ', min: 0.5, max: 0.99, step: 0.01, value: 0.9 },
];

export default function render(host, spec) {
  const n = clamp(Math.round(spec.grid || 4), 3, 6);
  const H = clamp(spec.height || 560, 380, 900);
  let gamma = clamp(typeof spec.gamma === 'number' ? spec.gamma : 0.9, 0.5, 0.99);

  const N = n * n;
  const K = (r, c) => r * n + c;
  const ROW = (k) => Math.floor(k / n);
  const COL = (k) => k % n;

  const goal = K(0, n - 1);
  const trap = K(n - 1, 0);
  const walls = new Set();
  const given = Array.isArray(spec.walls) ? spec.walls : [[1, 1], [1, 2]];
  given.forEach((w) => {
    if (Array.isArray(w) && w[0] >= 0 && w[0] < n && w[1] >= 0 && w[1] < n) {
      const k = K(w[0], w[1]);
      if (k !== goal && k !== trap) walls.add(k);
    }
  });
  const isTerm = (k) => k === goal || k === trap;
  const rewardTo = (k) => (k === goal ? 1 : (k === trap ? -1 : 0));

  /* ---- 动力学（确定性） ---- */
  function stepOf(k, a) {
    const r = ROW(k) + DIRS[a][0];
    const c = COL(k) + DIRS[a][1];
    if (r < 0 || r >= n || c < 0 || c >= n) return k;
    const nk = K(r, c);
    if (walls.has(nk) || isTerm(k)) return k;
    return nk;
  }
  const qOf = (V, k, a) => {
    if (isTerm(k) || walls.has(k)) return 0;
    const nk = stepOf(k, a);
    return rewardTo(nk) + gamma * V[nk];
  };

  /* ---- 状态 ---- */
  let V = new Float64Array(N);
  let policy = new Int8Array(N);          /* 默认全向上 */
  let phase = 'eval';                      /* eval | improve | done */
  let sweepCount = 0;
  let outerRound = 0;
  let delta = null;
  let flipped = new Int8Array(N);           /* 本轮被改进的格：1 = 翻转 */
  let flipCount = 0;
  let flash = new Float64Array(N);
  let selected = K(Math.floor(n / 2), Math.floor(n / 2));
  while (walls.has(selected)) selected = (selected + 1) % N;
  let playing = false;
  let gapT = 0;
  let msg = '';

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);

  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    gamma = st.gamma;
    hardReset();
  });

  const ro = buildReadout({
    '阶段': '评估',
    '评估扫描': '0',
    '本轮 Δ': '—',
    '本轮翻转': '0 格',
    '外循环轮数': '0',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('单步 ▶');
  const bImp = mkBtn('改进 ⤴');
  const bAuto = mkBtn(reduced ? '减少动效' : '自动');
  const bReset = mkBtn('重置');
  bAuto.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bImp, bAuto, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '单步 = 一次策略评估扫描（价值收敛）；改进 = 按当前价值重选每个格子的动作。点格子看它的四条 Q。';
  host.appendChild(hint);

  /* ---- 评估 / 改进 ---- */
  function evalSweep() {
    if (phase === 'done') return;
    phase = 'eval';
    const old = Float64Array.from(V);
    for (let k = 0; k < N; k += 1) {
      if (isTerm(k) || walls.has(k)) continue;
      V[k] = rewardTo(stepOf(k, policy[k])) + gamma * old[stepOf(k, policy[k])];
    }
    let d = 0;
    for (let k = 0; k < N; k += 1) d = Math.max(d, Math.abs(V[k] - old[k]));
    delta = d;
    sweepCount += 1;
    if (d < 1e-5) {
      phase = 'improve';
      msg = '评估收敛（Δ<1e-5），可以改进了';
    }
    syncReadout();
  }

  function improve() {
    if (phase === 'done') return;
    if (phase === 'eval' && (delta === null || delta >= 1e-5)) {
      msg = '先把策略评估到收敛（Δ<1e-5）再改进，才是标准策略迭代';
    }
    flipped = new Int8Array(N);
    flipCount = 0;
    for (let k = 0; k < N; k += 1) {
      if (isTerm(k) || walls.has(k)) continue;
      let best = -Infinity;
      let bestA = policy[k];
      for (let a = 0; a < 4; a += 1) {
        const q = qOf(V, k, a);
        if (q > best + 1e-12) { best = q; bestA = a; }
      }
      if (bestA !== policy[k]) {
        policy[k] = bestA;
        flipped[k] = 1;
        flipCount += 1;
        flash[k] = 1;
      }
    }
    outerRound += 1;
    sweepCount = 0;
    delta = null;
    if (flipCount === 0) {
      phase = 'done';
      msg = '一轮没有任何箭头改变：策略已最优（满足 Bellman 最优方程）';
      playing = false;
      syncPlay();
    } else {
      phase = 'eval';
      msg = '改进完成：' + flipCount + ' 个箭头换了方向，重新评估新策略';
    }
    syncReadout();
  }

  /* ---- 自动 ---- */
  function autoTick() {
    if (phase === 'done') { playing = false; syncPlay(); return; }
    if (phase === 'improve') { improve(); return; }
    evalSweep();
    if (phase === 'improve') { /* 下一帧改进 */ }
  }

  let raf = null;
  let last = 0;
  let visible = true;
  let acc = 0;

  function ensure() {
    if (raf == null && visible && host.isConnected) { last = 0; raf = requestAnimationFrame(tick); }
  }
  function needLoop() { return playing || gapT > 0 || flash.some((v) => v > 0); }
  function tick(now) {
    raf = null;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    for (let i = 0; i < N; i += 1) if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dt * 1.8);
    if (playing) {
      acc += dt;
      while (acc >= 0.18 && playing) { acc -= 0.18; autoTick(); }
    } else if (gapT > 0) {
      gapT -= dt;
    }
    draw();
    if (needLoop()) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else if (v && needLoop()) ensure();
  });

  function hardReset() {
    V = new Float64Array(N);
    policy = new Int8Array(N);
    phase = 'eval';
    sweepCount = 0;
    outerRound = 0;
    delta = null;
    flipped = new Int8Array(N);
    flipCount = 0;
    flash = new Float64Array(N);
    playing = false;
    acc = 0;
    msg = '';
    syncPlay();
    syncReadout();
    draw();
  }

  function syncPlay() { bAuto.textContent = reduced ? '减少动效' : (playing ? '暂停' : '自动'); }

  bStep.addEventListener('click', () => { playing = false; syncPlay(); evalSweep(); draw(); });
  bImp.addEventListener('click', () => { playing = false; syncPlay(); improve(); draw(); });
  bAuto.addEventListener('click', () => {
    if (reduced) return;
    if (phase === 'done') hardReset();
    playing = !playing;
    acc = 0;
    syncPlay();
    ensure();
  });
  bReset.addEventListener('click', () => hardReset());

  /* 点格子选中：画它的四条 Q */
  bindClick();

  function bindClick() {
    const canvas = cv.canvas;
    canvas.addEventListener('pointerdown', (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (canvas._W / (rect.width || 1));
      const y = (ev.clientY - rect.top) * (canvas._H / (rect.height || 1));
      if (x < geo.gx || x > geo.gx + geo.cell * n || y < geo.gy || y > geo.gy + geo.cell * n) return;
      const c = clamp(Math.floor((x - geo.gx) / geo.cell), 0, n - 1);
      const r = clamp(Math.floor((y - geo.gy) / geo.cell), 0, n - 1);
      const k = K(r, c);
      if (walls.has(k)) return;
      selected = k;
      draw();
    });
  }

  /* ---- 读数 ---- */
  function syncReadout() {
    ro.set('阶段', phase === 'done' ? '已收敛（策略稳定）' : (phase === 'improve' ? '可改进' : '评估中'));
    ro.set('评估扫描', String(sweepCount) + (delta !== null && delta < 1e-5 ? '（Δ 已足够小）' : ''));
    ro.set('本轮 Δ', delta === null ? '—' : fmt(delta, 5));
    ro.set('本轮翻转', String(flipCount) + ' 格');
    ro.set('外循环轮数', String(outerRound));
  }

  /* ---- 布局 ---- */
  const geo = { gx: 0, gy: 0, cell: 0, wide: true, px: 0, py: 0, pw: 0 };

  function layout(W, Hh) {
    geo.wide = W >= 660;
    const pad = 14;
    const mapMax = geo.wide ? Math.min(W * 0.46, Hh - 190) : Math.min(W - pad * 2, 320);
    geo.cell = Math.floor(mapMax / n);
    geo.gx = geo.wide ? pad + 6 : Math.round((W - geo.cell * n) / 2);
    geo.gy = 58;
    geo.px = geo.wide ? geo.gx + geo.cell * n + 22 : pad + 4;
    geo.py = geo.wide ? 58 : geo.gy + geo.cell * n + 26;
    geo.pw = geo.wide ? W - geo.px - pad : W - pad * 2 - 8;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);

    label(ctx, '策略迭代：评估（固定箭头算价值）→ 改进（按价值换箭头）→ 再评估',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, 'γ = ' + fmt(gamma, 2) + '　箭头 = 当前策略 π(s)　格子数字 = V(s)　'
      + '绿圈 = 本轮翻转的箭头　红圈 G = 终点(+1)　蓝圈 T = 陷阱(−1)',
      14, 38, C.axis, { size: 10.5 });

    let vmin = -1;
    let vmax = 1;
    for (let k = 0; k < N; k += 1) { vmin = Math.min(vmin, V[k]); vmax = Math.max(vmax, V[k]); }
    const span = Math.max(vmax - vmin, 1e-9);

    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        const k = K(r, c);
        const x = geo.gx + c * geo.cell;
        const y = geo.gy + r * geo.cell;
        if (walls.has(k)) {
          fillRound(ctx, x + 1, y + 1, geo.cell - 2, geo.cell - 2, 6, colorRGBA(C.fg, 0.10, [28, 30, 33]));
          label(ctx, '墙', x + geo.cell / 2, y + geo.cell / 2 + 4, C.axis, { size: 10, align: 'center' });
          continue;
        }
        const t = (V[k] - vmin) / span;
        fillRound(ctx, x + 1, y + 1, geo.cell - 2, geo.cell - 2, 6, heatColor(C, t, 0.5));
        strokeRound(ctx, x + 1.5, y + 1.5, geo.cell - 3, geo.cell - 3, 6,
          k === selected ? C.fg : C.grid, k === selected ? 1.8 : 1);
        if (flash[k] > 0) {
          ctx.save();
          ctx.globalAlpha = 0.55 * flash[k];
          strokeRound(ctx, x + 3, y + 3, geo.cell - 6, geo.cell - 6, 6, C.ok, 2.5);
          ctx.restore();
        }
        if (isTerm(k)) {
          const col = k === goal ? C.bad : C.accent;
          ctx.save();
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + geo.cell / 2, y + geo.cell / 2, geo.cell * 0.26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          label(ctx, k === goal ? 'G' : 'T', x + geo.cell / 2, y + geo.cell / 2 + geo.cell * 0.08,
            col, { size: Math.min(18, geo.cell * 0.32), align: 'center', weight: 700 });
          continue;
        }
        label(ctx, fmt(V[k], 2), x + geo.cell / 2, y + geo.cell * 0.42, C.fg,
          { size: Math.min(15, geo.cell * 0.27), align: 'center', weight: 600 });
        /* 箭头 */
        const a = policy[k];
        const cx = x + geo.cell / 2;
        const cy = y + geo.cell * 0.72;
        const L = geo.cell * 0.2;
        const changed = flipped[k] === 1;
        arrow(ctx, cx - DIRS[a][1] * L * 0.2, cy - DIRS[a][0] * L * 0.2,
          cx + DIRS[a][1] * L, cy + DIRS[a][0] * L,
          changed ? C.ok : C.accent2, changed ? 2.6 : 2, 7);
      }
    }

    /* 图例条 */
    const ly = geo.gy + geo.cell * n + 16;
    if (geo.wide) label(ctx, '数字 = V(s)（到达终点 +1、陷阱 −1，到达即结束故 V=0）', geo.gx, ly, C.axis, { size: 10 });

    /* 右栏 / 下方：选中格子的四条 Q */
    drawPanel(ctx, C, geo.px, geo.py, geo.pw, geo.wide ? Hh - geo.py - 14 : 250);

    if (msg) {
      const my = geo.wide ? Hh - 22 : geo.py + 258;
      label(ctx, '· ' + msg, geo.px, my, C.fg, { size: 10.5, weight: 600 });
    }
  }

  function drawPanel(ctx, C, x, y, w, h) {
    const k = selected;
    const boxH = Math.min(h, 232);
    fillRound(ctx, x - 6, y - 16, w + 10, boxH + 22, 8, colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
    caption(ctx, '选中格子 (' + ROW(k) + ',' + COL(k) + ')　拿四个动作各算一次 Q', x, y - 2, C);

    if (isTerm(k) || walls.has(k)) {
      label(ctx, isTerm(k) ? '终点/陷阱格不再行动（到达即结束）' : '墙：不能进入，也不产生行动', x, y + 22, C.fg, { size: 11 });
      return;
    }

    const qs = [0, 1, 2, 3].map((a) => qOf(V, k, a));
    const best = Math.max(...qs);
    let lo = Math.min(0, ...qs);
    let hi = Math.max(1e-6, ...qs);
    const pad = (hi - lo) * 0.15 + 1e-6;
    lo -= pad;
    hi += pad;
    const barX = x + 26;
    const barW = w - 40;
    const y0 = y + 20;
    const rowH = 30;
    const mapX = (v) => barX + ((v - lo) / (hi - lo)) * barW;

    /* 当前 V 的虚线：改进就是「把箭头挪到它右边」 */
    const vx = mapX(V[k]);
    dashedLine(ctx, vx, y0 - 6, vx, y0 + rowH * 4 - 4, C.fg, 1.4, [4, 4]);
    label(ctx, 'V=' + fmt(V[k], 2), vx, y0 - 10, C.fg, { size: 9.5, align: 'center', weight: 700 });

    for (let a = 0; a < 4; a += 1) {
      const yy = y0 + a * rowH;
      const q = qs[a];
      const isBest = Math.abs(q - best) < 1e-9;
      const isCur = policy[k] === a;
      label(ctx, GLYPH[a], x + 8, yy + 15, isCur ? C.accent2 : C.axis, { size: 14, weight: 700 });
      const bx = mapX(Math.min(0, q));
      const bw = Math.max(2, Math.abs(mapX(q) - mapX(0)));
      fillRound(ctx, bx, yy + 3, bw, 16, 3,
        isBest ? C.ok : colorRGBA(C.accent, C.dark ? 0.45 : 0.35, [59, 116, 214]));
      label(ctx, fmt(q, 3), Math.max(mapX(q), mapX(0)) + 6, yy + 15, C.fg, { size: 10 });
      if (isCur) {
        chip(ctx, '当前', x + w - 34, yy + 11, C, { size: 9, padX: 4, height: 15, fill: colorRGBA(C.accent2, 0.2) });
      }
      void yy;
    }
    /* 结论行 */
    const target = best;
    const gain = target - V[k];
    const line = 'max_a Q = ' + fmt(best, 3) + '（' + GLYPH[qs.indexOf(best)] + '）'
      + '　比 V 高 ' + (gain >= 0 ? '+' : '') + fmt(gain, 3)
      + (gain > 1e-9 ? '　→ 该改进' : '　→ 已无可改进');
    label(ctx, line, x, y0 + rowH * 4 + 14, gain > 1e-9 ? C.ok : C.axis, { size: 10.5, weight: 600 });
    label(ctx, '箭头画在格子里，虚线是 V(s)：Q 越过虚线就说明这个动作值得换。',
      x, y0 + rowH * 4 + 30, C.axis, { size: 10 });
    dot(ctx, x + 3, y0 + rowH * 4 + 26, 2.5, C.accent2);
  }

  /* 初始化 */
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

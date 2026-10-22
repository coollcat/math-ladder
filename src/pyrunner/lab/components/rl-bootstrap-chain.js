/* =========================================================================
 * lab 组件：rl-bootstrap-chain —— TD 的自举链：一步回报 vs 留到下一状态
 * -------------------------------------------------------------------------
 * 用法（第 50 章 TD 学习与自举）：
 *
 *   { "type": "rl-bootstrap-chain", "title": "自举：用估计更新估计", "alpha": 0.1, "gamma": 0.9 }
 *
 * 字段（都可省）：
 *   alpha   学习率 0.05..1，默认 0.1
 *   gamma   折扣因子 0.5..0.99，默认 0.9
 *   height  画布高度，默认 470
 *
 * 演示什么：一条 A→B→C→终点 的确定性链，进入终点得 r=1，其余 r=0。
 * 每个非终点状态有当前估计 V(s)。点格子选中它，再点「更新一格」，按
 *
 *     δ = r + γ·V(s′) − V(s)          （s′ 的价值是「估计」，不是真值）
 *     V(s) ← V(s) + α·δ
 *
 * 更新一次。右栏并排两根目标棒：
 *   · TD 目标 r + γ·V(s′)：只用一步真实奖励，剩下的靠自举；
 *   · MC 目标（整条回报）：走到终点才有的 G，不需要任何估计。
 * 两者随更新逐渐靠近——这就是「自举有偏差、但没有方差」的现场。
 *   · 单步 = 更新选中格；扫一轮 = 从最右往左各更新一次（波纹顺序）；
 *     播放 = 连续扫描；重置 = V 清零。
 * 取舍：环境确定性、策略固定向右，只让「自举 vs 等到底」这一对概念出场。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, arrow, clamp, fmt, clearBg, onScreen,
} from '../core.js';
import { fillRound, chip, caption, dashedLine, colorRGBA, strokeRound, dot } from './rl-common.js';

const BASE = [
  { name: 'alpha', label: '学习率 α', min: 0.05, max: 1, step: 0.05, value: 0.1 },
  { name: 'gamma', label: '折扣因子 γ', min: 0.5, max: 0.99, step: 0.01, value: 0.9 },
];

const NS = 4;                 /* 0,1,2 可行动；3 是终点 */

export default function render(host, spec) {
  const H = clamp(spec.height || 470, 340, 900);
  let alpha = clamp(typeof spec.alpha === 'number' ? spec.alpha : 0.1, 0.05, 1);
  let gamma = clamp(typeof spec.gamma === 'number' ? spec.gamma : 0.9, 0.5, 0.99);

  const rewardTo = (ns) => (ns === NS - 1 ? 1 : 0);
  const nextOf = (s) => Math.min(NS - 1, s + 1);

  let V = new Float64Array(NS);
  let selected = 0;
  let updates = 0;
  let lastS = -1;
  let lastRec = null;            /* { s, r, target, delta, before, after } */
  let flash = new Float64Array(NS);
  let playing = false;
  let clock = 0;

  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    alpha = st.alpha;
    gamma = st.gamma;
    hardReset();
  });

  const ro = buildReadout({
    '选中状态': 'A',
    'TD 目标 r+γV(s′)': '—',
    'δ（TD error）': '—',
    '更新前后': '—',
    'MC 目标（整条回报）': '—',
    '更新次数': '0',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('更新一格 ▶');
  const bSweep = mkBtn('扫一轮');
  const bPlay = mkBtn(reduced ? '减少动效' : '播放');
  const bReset = mkBtn('重置');
  bPlay.disabled = reduced;
  host.appendChild(buildToolbar(bStep, bSweep, bPlay, bReset));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '点格子选状态；「更新一格」按 δ = r + γV(s′) − V(s) 改它的估计，右栏同时给出如果等到终点的真实回报。';
  host.appendChild(hint);

  const mcTarget = (s) => Math.pow(gamma, NS - 2 - s) * 1;   /* 从 s 到终点一共要 NS-1-s 步，奖励 1 */

  function updateOnce(s) {
    if (s >= NS - 1) return;
    const ns = nextOf(s);
    const r = rewardTo(ns);
    const target = r + gamma * V[ns];
    const delta = target - V[s];
    const before = V[s];
    V[s] = before + alpha * delta;
    updates += 1;
    lastS = s;
    lastRec = { s, ns, r, target, delta, before, after: V[s] };
    flash[s] = 1;
    syncReadout();
  }

  function sweep() {
    for (let s = NS - 2; s >= 0; s -= 1) updateOnce(s);
  }

  let raf = null;
  let last = 0;
  let visible = true;
  let acc = 0;
  function needLoop() { return playing || flash.some((v) => v > 0); }
  function ensure() {
    if (raf == null && visible && host.isConnected) { last = 0; raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    raf = null;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    for (let i = 0; i < NS; i += 1) if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dt * 2);
    if (playing) {
      acc += dt;
      while (acc >= 0.5 && playing) { acc -= 0.5; sweep(); }
    }
    draw();
    if (needLoop()) raf = requestAnimationFrame(tick);
  }
  onScreen(host, (v) => {
    visible = v;
    if (!v && raf != null) { cancelAnimationFrame(raf); raf = null; } else if (v && needLoop()) ensure();
  });

  function hardReset() {
    V = new Float64Array(NS);
    updates = 0;
    lastS = -1;
    lastRec = null;
    flash = new Float64Array(NS);
    playing = false;
    acc = 0;
    syncPlay();
    syncReadout();
    draw();
  }
  function syncPlay() { bPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放'); }

  bStep.addEventListener('click', () => { playing = false; syncPlay(); updateOnce(selected); draw(); ensure(); });
  bSweep.addEventListener('click', () => { playing = false; syncPlay(); sweep(); draw(); ensure(); });
  bPlay.addEventListener('click', () => {
    if (reduced) return;
    playing = !playing;
    acc = 0;
    syncPlay();
    ensure();
  });
  bReset.addEventListener('click', () => hardReset());

  cv.canvas.addEventListener('pointerdown', (ev) => {
    const rect = cv.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cv.canvas._W / (rect.width || 1));
    const y = (ev.clientY - rect.top) * (cv.canvas._H / (rect.height || 1));
    const i = pickCell(x, y);
    if (i >= 0 && i < NS - 1) { selected = i; syncReadout(); draw(); }
  });

  function syncReadout() {
    const name = 'ABCD'[selected];
    ro.set('选中状态', name + (lastS === selected ? '（刚更新过）' : ''));
    if (selected >= NS - 1) {
      ro.set('TD 目标 r+γV(s′)', '终点不再行动');
      ro.set('δ（TD error）', '—');
      ro.set('更新前后', '—');
      ro.set('MC 目标（整条回报）', '0（到达即结束）');
    } else {
      const ns = nextOf(selected);
      const target = rewardTo(ns) + gamma * V[ns];
      const delta = target - V[selected];
      ro.set('TD 目标 r+γV(s′)', fmt(target, 4) + ' = ' + fmt(rewardTo(ns), 0) + ' + ' + fmt(gamma, 2) + '×' + fmt(V[ns], 3));
      ro.set('δ（TD error）', fmt(delta, 4));
      ro.set('更新前后', fmt(V[selected], 4) + ' → ' + fmt(V[selected] + alpha * delta, 4));
      ro.set('MC 目标（整条回报）', fmt(mcTarget(selected), 4) + '（要走到终点才知道）');
    }
    ro.set('更新次数', String(updates));
  }

  /* ---- 绘制 ---- */
  const geo = { W: 0, Hh: 0, wide: true, cellW: 0, cellH: 0, x0: 0, y0: 0 };

  function pickCell(x, y) {
    if (x < geo.x0 || y < geo.y0 || y > geo.y0 + geo.cellH) return -1;
    const i = Math.floor((x - geo.x0) / (geo.cellW + 12));
    if (i < 0 || i >= NS) return -1;
    if ((x - geo.x0) - i * (geo.cellW + 12) > geo.cellW) return -1;
    return i;
  }

  function layout(W, Hh) {
    geo.W = W;
    geo.Hh = Hh;
    geo.wide = W >= 660;
    const pad = 14;
    const totalW = geo.wide ? Math.min(W - pad * 2, 620) : W - pad * 2;
    geo.cellW = Math.floor((totalW - 12 * (NS - 1)) / NS);
    geo.cellH = 64;
    geo.x0 = geo.wide ? pad + 4 : Math.max(pad, Math.round((W - (geo.cellW * NS + 12 * (NS - 1))) / 2));
    geo.y0 = 62;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    layout(W, Hh);

    label(ctx, '自举链：s′ 的价值是「估计」，不是等到终点的真实回报',
      14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, 'α = ' + fmt(alpha, 2) + '　γ = ' + fmt(gamma, 2)
      + '　策略固定向右　进入终点 r = +1，其余 r = 0',
      14, 38, C.axis, { size: 10.5 });

    /* 状态格 */
    for (let s = 0; s < NS; s += 1) {
      const x = geo.x0 + s * (geo.cellW + 12);
      const y = geo.y0;
      const isTerm = s === NS - 1;
      fillRound(ctx, x, y, geo.cellW, geo.cellH, 8,
        s === selected ? colorRGBA(C.accent, C.dark ? 0.28 : 0.16, [59, 116, 214])
          : colorRGBA(C.fg, C.dark ? 0.06 : 0.035, [28, 30, 33]));
      strokeRound(ctx, x + 0.5, y + 0.5, geo.cellW - 1, geo.cellH - 1, 8,
        s === selected ? C.accent : C.grid, s === selected ? 2 : 1);
      if (flash[s] > 0) {
        ctx.save();
        ctx.globalAlpha = 0.6 * flash[s];
        strokeRound(ctx, x + 3, y + 3, geo.cellW - 6, geo.cellH - 6, 7, C.ok, 2.2);
        ctx.restore();
      }
      label(ctx, isTerm ? '终点' : 'ABCD'[s], x + 8, y + 16, C.axis, { size: 10, weight: 700 });
      if (isTerm) {
        label(ctx, 'V = 0', x + geo.cellW / 2, y + 40, C.bad, { size: 13, align: 'center', weight: 700 });
        label(ctx, '到达即结束', x + geo.cellW / 2, y + 56, C.axis, { size: 9.5, align: 'center' });
      } else {
        label(ctx, 'V = ' + fmt(V[s], 3), x + geo.cellW / 2, y + 40, C.fg,
          { size: 13, align: 'center', weight: 700 });
        label(ctx, '估计值', x + geo.cellW / 2, y + 56, C.axis, { size: 9.5, align: 'center' });
      }
      if (s < NS - 1) {
        arrow(ctx, x + geo.cellW + 1, y + geo.cellH / 2, x + geo.cellW + 11, y + geo.cellH / 2, C.axis, 1.6, 6);
      }
    }

    /* 自举回流：从 V(s′) 折回 V(s) 的虚线弧 */
    const sel = Math.min(selected, NS - 2);
    const sx = geo.x0 + sel * (geo.cellW + 12) + geo.cellW / 2;
    const nx = geo.x0 + (sel + 1) * (geo.cellW + 12) + geo.cellW / 2;
    const ay = geo.y0 + geo.cellH;
    ctx.save();
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(nx, ay + 6);
    ctx.bezierCurveTo(nx, ay + 34, sx, ay + 34, sx, ay + 8);
    ctx.stroke();
    ctx.restore();
    arrow(ctx, sx + 12, ay + 16, sx + 2, ay + 8, C.named('purple'), 2, 7);
    label(ctx, 'γ·V(s′) 折回来当前格（自举：借用邻居的估计）',
      (sx + nx) / 2, ay + 46, C.named('purple'), { size: 10, align: 'center', weight: 600 });

    /* 两根目标棒：TD vs MC */
    const py0 = geo.y0 + geo.cellH + 74;
    drawTargets(ctx, C, py0);

    /* 账本 */
    drawLedger(ctx, C, geo.wide ? Math.min(W * 0.6, 520) : 14, py0 + 108, W);
    void Hh;
  }

  function drawTargets(ctx, C, y) {
    const s = Math.min(selected, NS - 2);
    const r = rewardTo(nextOf(s));
    const td = r + gamma * V[nextOf(s)];
    const mc = mcTarget(s);
    const maxV = Math.max(td, mc, V[s], 0.2);
    const barMaxW = geo.wide ? Math.min(geo.W * 0.45, 330) : geo.W - 150;

    caption(ctx, '看得见的目标：' + 'ABCD'[s] + ' 这一步', 14, y, C);
    const rows = [
      { name: 'TD 目标', detail: 'r + γV(s′) = 一步 + 估计', v: td, color: C.named('purple') },
      { name: 'MC 目标', detail: '走到终点的整条回报', v: mc, color: C.named('teal') },
      { name: '当前 V(s)', detail: '要被修正的估计', v: V[s], color: C.accent2 },
    ];
    rows.forEach((row, i) => {
      const yy = y + 18 + i * 28;
      label(ctx, row.name, 14, yy + 12, row.color, { size: 11, weight: 700 });
      const bx = 92;
      fillRound(ctx, bx, yy + 2, Math.max(2, (row.v / maxV) * barMaxW), 17, 3, row.color);
      label(ctx, fmt(row.v, 3), bx + Math.max(2, (row.v / maxV) * barMaxW) + 8, yy + 15, C.fg, { size: 10.5 });
      if (!geo.wide) return;
      label(ctx, row.detail, bx + barMaxW + 54, yy + 15, C.axis, { size: 9.5 });
    });
    const gap = Math.abs(td - mc);
    label(ctx, gap < 0.02 ? '两者已贴合：估计收敛到真实回报，自举的偏差消失。'
      : '两者还差 ' + fmt(gap, 3) + '：TD 用估计当靶子，先快后准；MC 只认走完的实际回报，准但慢。',
    14, y + 18 + 3 * 28 + 6, gap < 0.02 ? C.ok : C.fg, { size: 10.5, weight: 600 });
  }

  function drawLedger(ctx, C, x, y, W) {
    const w = Math.min(W - x - 14, 520);
    fillRound(ctx, x - 6, y - 14, w + 12, 96, 8, colorRGBA(C.fg, C.dark ? 0.05 : 0.03, [28, 30, 33]));
    caption(ctx, '最近一次更新的账本', x, y, C);
    if (!lastRec) {
      label(ctx, '点「更新一格 ▶」：δ = r + γV(s′) − V(s)，V(s) ← V(s) + αδ。', x, y + 20, C.fg, { size: 11 });
      label(ctx, '刚开始 V 全是 0，TD 目标只剩「一步真实奖励」，δ 最大。', x, y + 36, C.axis, { size: 10 });
      return;
    }
    const R = lastRec;
    label(ctx, '状态 ' + 'ABCD'[R.s] + ' → ' + 'ABCD'[R.ns] + '　r = ' + fmt(R.r, 0)
      + '　V(s′) = ' + fmt(V[R.ns], 3), x, y + 18, C.fg, { size: 11, weight: 600 });
    label(ctx, '目标 ' + fmt(R.r, 0) + ' + ' + fmt(gamma, 2) + '×' + fmt(V[R.ns], 3) + ' = ' + fmt(R.target, 3)
      + '　δ = ' + fmt(R.delta, 3), x, y + 34, C.axis, { size: 10.5 });
    label(ctx, 'V 更新：' + fmt(R.before, 3) + ' + ' + fmt(alpha, 2) + '×(' + fmt(R.delta, 3) + ') = ' + fmt(R.after, 3),
      x, y + 50, C.ok, { size: 11, weight: 700 });
    label(ctx, '注意：目标里那个 V(s′) 本身也是估计——这就是「自举」。', x, y + 68, C.axis, { size: 10 });
    dot(ctx, x + w - 8, y + 6, 2.5, C.named('purple'));
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

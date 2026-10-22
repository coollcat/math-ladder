/* =========================================================================
 * lab 组件：rl-q-surface —— Q(s,a) 的三维柱状图，以及 V 是怎么「压」出来的
 * -------------------------------------------------------------------------
 * 用法（第 50 章 动作价值函数 Q）：
 *
 *   { "type": "rl-q-surface", "title": "Q(s,a) 柱状热力", "piRight": 0.75 }
 *
 * 字段（都可省）：
 *   piRight  策略选「右」的概率 0..1，默认 0.75（左 = 1 − piRight）
 *   gamma    折扣因子 0.5..0.99，默认 1.0（本课的例子取 γ=1，便于手算）
 *   height   画布高度，默认 520
 *
 * 演示什么：一张 3 状态 × 2 动作的 Q 表，用等距投影画成 6 根柱子：
 *   · 柱高 = Q(s,a) = r(s,a) + γV(s′)，颜色深浅同步柱高（热力）；
 *   · 每个状态顶上有一条横线 = 按策略加权的 V(s) = Σ_a π(a|s)Q(s,a)，
 *     它总落在两根柱子之间——「V 是 Q 的策略加权平均」被画成了几何关系。
 *   · 拖「策略概率」滑块：柱子不动，横线在两柱之间滑动；
 *     拖到 1 时横线贴住右柱，拖到 0 时贴住左柱。
 *   · 点「换一组 Q」：换一套奖励/后续价值，观察排序如何变化。
 * 取舍：Q 值来自一个写死的小例子（左右两个动作 + 后续状态价值），不训练；
 * 目的是让 V = Σπ(a|s)Q(s,a) 这个等式有形状，而不是讲解算法。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, buildToolbar, buildReadout,
  mkBtn, label, clamp, fmt, clearBg, setSliderRow,
} from '../core.js';
import { fillRound, caption, colorRGBA, strokeRound, chip, dashedLine, dot } from './rl-common.js';

const BASE = [
  { name: 'piRight', label: '策略 π(右)', min: 0, max: 1, step: 0.05, value: 0.75 },
  { name: 'gamma', label: '折扣因子 γ', min: 0.5, max: 0.99, step: 0.01, value: 0.99 },
];

/* 三套小例子：每套是 [状态名, r(左), r(右), V(s′左), V(s′右)] */
const SCENES = [
  {
    name: '默认：高档位更值钱',
    states: [
      { s: '低档', r: [1, 0], v: [0, 2] },
      { s: '中档', r: [0, 1], v: [1, 3] },
      { s: '高档', r: [2, 0], v: [0, 1] },
    ],
  },
  {
    name: '延迟奖励：现在小、以后大',
    states: [
      { s: '入口', r: [1, 0], v: [0, 6] },
      { s: '走廊', r: [0, 0], v: [2, 5] },
      { s: '门前', r: [0, 1], v: [0, 4] },
    ],
  },
  {
    name: '陷阱：即时奖励骗人',
    states: [
      { s: '岔口', r: [3, 0], v: [0, 5] },
      { s: '捷径', r: [2, 1], v: [0, 3] },
      { s: '绕路', r: [0, 1], v: [1, 4] },
    ],
  },
];

export default function render(host, spec) {
  const H = clamp(spec.height || 520, 360, 940);
  let piRight = clamp(typeof spec.piRight === 'number' ? spec.piRight : 0.75, 0, 1);
  let gamma = clamp(typeof spec.gamma === 'number' ? spec.gamma : 0.99, 0.5, 0.99);
  let sceneIdx = 0;

  const cv = setupCanvas(host, H);
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (st) => {
    piRight = st.piRight;
    gamma = st.gamma;
    syncReadout();
    draw();
  });

  const ro = buildReadout({
    'π(左) / π(右)': '—',
    'Q 最高的格子': '—',
    'V(低档)': '—',
    'V(中档)': '—',
    'V(高档)': '—',
    '贪心动作': '—',
  });
  host.appendChild(ro.box);

  const bScene = mkBtn('换一组 Q');
  const bPi = mkBtn('π 摆到 0 / 1');
  host.appendChild(buildToolbar(bScene, bPi));

  const hint = document.createElement('div');
  hint.className = 'ml-lab__hint';
  hint.textContent = '柱高是 Q(s,a)，横线是按策略加权的 V(s)：拖策略概率，看横线在两根柱子之间滑。';
  host.appendChild(hint);

  let piFlip = false;
  bScene.addEventListener('click', () => {
    sceneIdx = (sceneIdx + 1) % SCENES.length;
    syncReadout();
    draw();
  });
  bPi.addEventListener('click', () => {
    piFlip = !piFlip;
    piRight = piFlip ? 0 : 1;
    setSliderRow(sliders, 0, piRight, 2, 'piRight');
    syncReadout();
    draw();
  });

  function table() {
    const sc = SCENES[sceneIdx];
    return sc.states.map((st) => {
      const qL = st.r[0] + gamma * st.v[0];
      const qR = st.r[1] + gamma * st.v[1];
      return { s: st.s, qL, qR, v: (1 - piRight) * qL + piRight * qR };
    });
  }

  function syncReadout() {
    const rows = table();
    ro.set('π(左) / π(右)', fmt(1 - piRight, 2) + ' / ' + fmt(piRight, 2));
    let best = null;
    rows.forEach((r) => {
      ['左', '右'].forEach((nm, i) => {
        const q = i === 0 ? r.qL : r.qR;
        if (!best || q > best.q) best = { q, where: r.s + '·' + nm };
      });
    });
    ro.set('Q 最高的格子', best ? best.where + ' = ' + fmt(best.q, 3) : '—');
    ro.set('V(低档)', fmt(rows[0].v, 3));
    ro.set('V(中档)', fmt(rows[1].v, 3));
    ro.set('V(高档)', fmt(rows[2].v, 3));
    ro.set('贪心动作', rows.map((r) => r.s + ':' + (r.qL >= r.qR ? '左' : '右')).join('　'));
  }

  /* ---- 等距投影绘制 ---- */
  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    const sc = SCENES[sceneIdx];
    const rows = table();
    const qmax = Math.max(...rows.map((r) => Math.max(r.qL, r.qR)), 1);
    const qmin = Math.min(0, ...rows.map((r) => Math.min(r.qL, r.qR)));
    const span = Math.max(qmax - qmin, 1e-9);

    label(ctx, 'Q(s,a)：状态 × 动作的一张表，被画成立体的柱子', 14, 20, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '例子：' + sc.name + '　γ = ' + fmt(gamma, 2)
      + '　Q(s,a) = r(s,a) + γ·V(s′)', 14, 38, C.axis, { size: 10.5 });

    /* 投影参数 */
    const originX = W * 0.34;
    const originY = 118;
    const dxState = 34;         /* 每前进一个状态：右移 */
    const dyState = 26;         /* 且下移 */
    const dxAction = 56;        /* 每个动作：右移 */
    const barW = 26;
    const maxBarH = Math.min(Hh - 300, 190);
    const baseY = originY + rows.length * dyState + 66;

    const pos = (si, ai) => {
      const x = originX + si * dxState + ai * dxAction;
      const y = originY + si * dyState;
      return { x, y };
    };
    const hOf = (q) => ((q - qmin) / span) * maxBarH;

    /* 网格地面 */
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    rows.forEach((r, si) => {
      const p0 = pos(si, 0);
      const p1 = pos(si, 1);
      ctx.beginPath();
      ctx.moveTo(p0.x - 14, p0.y + 22);
      ctx.lineTo(p1.x + barW + 14, p1.y + 22);
      ctx.stroke();
    });
    ctx.restore();

    /* 状态标签 */
    rows.forEach((r, si) => {
      const p = pos(si, 0);
      label(ctx, r.s, p.x - 20, p.y + 38, C.axis, { size: 10, align: 'right' });
    });

    /* 柱子：从后往前画（远的状态先画，深度才对） */
    const order = rows.map((r, i) => i).sort((a, b) => b - a);
    order.forEach((si) => {
      const r = rows[si];
      [0, 1].forEach((ai) => {
        const p = pos(si, ai);
        const q = ai === 0 ? r.qL : r.qR;
        const h = Math.max(hOf(q), 2);
        const t = (q - qmin) / span;
        const base = p.y + 22;
        const color = ai === 0 ? C.named('orange') : C.named('teal');
        /* 柱体 */
        ctx.save();
        ctx.fillStyle = colorRGBA(color, 0.25 + 0.6 * t);
        ctx.fillRect(p.x, base - h, barW, h);
        /* 顶面（等距） */
        ctx.beginPath();
        ctx.moveTo(p.x, base - h);
        ctx.lineTo(p.x + 8, base - h - 8);
        ctx.lineTo(p.x + barW + 8, base - h - 8);
        ctx.lineTo(p.x + barW, base - h);
        ctx.closePath();
        ctx.fillStyle = colorRGBA(color, 0.35 + 0.55 * t);
        ctx.fill();
        /* 侧面 */
        ctx.beginPath();
        ctx.moveTo(p.x + barW, base - h);
        ctx.lineTo(p.x + barW + 8, base - h - 8);
        ctx.lineTo(p.x + barW + 8, base - 8);
        ctx.lineTo(p.x + barW, base);
        ctx.closePath();
        ctx.fillStyle = colorRGBA(color, 0.2 + 0.35 * t);
        ctx.fill();
        ctx.restore();
        /* 数值 */
        label(ctx, fmt(q, 2), p.x + barW / 2, base - h - 12, C.fg,
          { size: 9.5, align: 'center', weight: 700 });
        /* 柱底标签 */
        label(ctx, ai === 0 ? '左' : '右', p.x + barW / 2, base + 13, color,
          { size: 9, align: 'center', weight: 600 });
      });

      /* V 线：落在两根柱子之间 */
      const pL = pos(si, 0);
      const pR = pos(si, 1);
      const vy = baseY - hOf(r.v) - (si * 0) - 0;
      const yy = (pL.y + 22) - hOf(r.v);
      void vy;
      const x0 = pL.x - 6;
      const x1 = pR.x + barW + 12;
      dashedLine(ctx, x0, yy, x1, yy, C.fg, 2, [5, 3]);
      label(ctx, 'V=' + fmt(r.v, 2), x0 - 4, yy - 5, C.fg, { size: 9.5, align: 'right', weight: 700 });
      /* 从两根柱顶到 V 线的细连线：说明 V 是加权平均 */
      dot(ctx, pL.x + barW / 2, (pL.y + 22) - hOf(r.qL), 3, C.named('orange'));
      dot(ctx, pR.x + barW / 2, (pR.y + 22) - hOf(r.qR), 3, C.named('teal'));
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = C.fg;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pL.x + barW / 2, (pL.y + 22) - hOf(r.qL));
      ctx.lineTo(pR.x + barW / 2, (pR.y + 22) - hOf(r.qR));
      ctx.stroke();
      ctx.restore();
      /* 加权平均点落在连线的哪个位置 */
      const frac = piRight;
      const ax = (pL.x + barW / 2) * (1 - frac) + (pR.x + barW / 2) * frac;
      const ay = ((pL.y + 22) - hOf(r.qL)) * (1 - frac) + ((pR.y + 22) - hOf(r.qR)) * frac;
      dot(ctx, ax, ay, 4.5, C.fg);
      dot(ctx, ax, ay, 2.2, C.bg);
    });

    /* 底部说明 */
    const iy = baseY + 26;
    fillRound(ctx, 14, iy - 12, W - 28, Math.min(Hh - iy - 12, 78), 8,
      colorRGBA(C.accent, C.dark ? 0.14 : 0.08));
    label(ctx, 'V(s) = Σ_a π(a|s) · Q(s,a) = ' + fmt(1 - piRight, 2) + '·Q(s,左) + '
      + fmt(piRight, 2) + '·Q(s,右)　—— 白点就落在两根柱顶的连线上。',
    14 + 10, iy + 4, C.fg, { size: 10.5, weight: 600 });
    label(ctx, piRight > 0.98 ? 'π 全压右：V 贴住右柱，此时 V = max_a Q——就是 Bellman 最优的贪心支。'
      : piRight < 0.02 ? 'π 全压左：V 贴住左柱。策略变了，同一个 Q 表能算出完全不同的 V。'
        : '两根柱子都没动，动的只是「按什么比例混合」——这就是「Q 是动作的分数，V 是状态的平均分」。',
    14 + 10, iy + 24, C.axis, { size: 10 });
    caption(ctx, '柱子上的数值是 Q；虚线是当前策略下的 V；白点 = 按 π 加权平均的位置', 16, iy + 46, C);
    void chip;
    void strokeRound;
    void baseY;
  }

  syncReadout();
  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() { cv.redraw = null; },
  };
}

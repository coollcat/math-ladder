/* =========================================================================
 * lab 组件：stoch-pagerank-iter —— PageRank 幂迭代（第 37 章 · 50 课）
 * -------------------------------------------------------------------------
 * 演示什么：课文实验里那个 5 页玩具互联网（A、B、C、D、E），随机冲浪者的分数
 * 向量从均匀 1/N 出发，
 * 反复代进 G = d·M + (1−d)/N·J 的迭代式：
 *     π' = (1−d)/N + d · Σ_{j→i} π_j / outdeg(j)
 * 每按一次「单步」迭代一轮，柱状图即时更新；连续两轮的最大变化量 δ 一路掉到
 * 机器精度——幂迭代就是这样「自己把自己按平」的。终值满足 πP = π。
 *
 * 图与课文 Python 实验逐字一致，收敛后 C 35.79% / A 35.63% / B 18.14% /
 * D 5.22% / E 5.22%：B 与 D 都只有一条入链，但给 B 投票的是高分的 A，
 * 所以 B 是 D 的 3.48 倍——「谁投你」比「有几个入链」更重要。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "stoch-pagerank-iter",
 *     "title": "五页网络上的幂迭代：柱高怎么稳定下来",
 *     "damp": 0.85 }
 *
 * 字段（都可省）：
 *   damp    阻尼系数 d，默认 0.85（范围 0.05 到 0.99；0 表示纯瞬移、1 表示纯投票）
 *   height  画布高度，默认 480
 *   pages   状态数上限 30 轮
 *
 * 能玩什么：
 *   - 「单步」迭代一轮（柱高与 δ 同步刷新）；「回退」退回上一轮
 *   - 拖动「阻尼 d」滑块：d 越小瞬移越多，分数越平、收敛越快；d → 1 时慢得像爬
 *   - 顶部分段器切换「显示视图」：柱状排名 / 变化量衰减（半对数）
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg, polyline, fmt,
  buildSliders, buildToolbar, buildReadout, buildSegmented, anim, mkBtn, mergeSpec,
} from '../core.js';

/* 6 页玩具图：邻接表，键是页面，值是它指向谁 */
const LINKS = {
  A: ['B', 'C'],
  B: ['C'],
  C: ['A'],
  D: ['C', 'E'],
  E: ['A', 'D'],
};
const PAGES = Object.keys(LINKS);
const N = PAGES.length;

const BASE_SLIDERS = [
  { name: 'damp', label: '阻尼系数 d', min: 0.05, max: 0.99, step: 0.01, value: 0.85, fmt: 2 },
];

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 320, 760) : 480;
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let view = 'bars';

  let damp = Number.isFinite(spec.damp) ? clamp(spec.damp, 0.05, 0.99) : 0.85;

  /* ---------- 幂迭代：一次算好每一轮的历史，单步/回退直接查表 ---------- */
  let FLOW = [];      // 索引对齐 PAGES
  function rebuildLinkTable() {
    FLOW = PAGES.map((p) => LINKS[p]);
  }
  rebuildLinkTable();

  function iterate(rank) {
    const nxt = {};
    PAGES.forEach((pg) => {
      let s = (1 - damp) / N;
      PAGES.forEach((src) => {
        const outs = FLOW[PAGES.indexOf(src)];
        if (outs.indexOf(pg) >= 0) s += damp * rank[src] / outs.length;
      });
      nxt[pg] = s;
    });
    return nxt;
  }

  const history = [];
  function reset(d) {
    damp = d;
    history.length = 0;
    const r0 = {};
    PAGES.forEach((p) => { r0[p] = 1 / N; });
    history.push({ rank: r0, delta: NaN });
    let cur = r0;
    for (let k = 0; k < 30; k += 1) {
      const nx = iterate(cur);
      let dd = 0;
      PAGES.forEach((p) => { dd = Math.max(dd, Math.abs(nx[p] - cur[p])); });
      history.push({ rank: nx, delta: dd });
      cur = nx;
    }
  }
  let step = 0;

  const sliders = buildSliders({ sliders: mergeSpec(BASE_SLIDERS, spec) }, (st) => {
    if (st.damp !== undefined) { reset(st.damp); step = 0; draw(); }
  });
  /* 滑块交给 lab/index.js 挂在卡片底部（slidersBox 约定，与本章其它组件一致） */

  const ro = buildReadout({
    轮次: '—',
    '本轮最大变化 δ': '—',
    排名: '—',
    与下一轮差距: '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    [
      { label: '排名柱状图', value: 'bars' },
      { label: '变化量衰减', value: 'decay' },
    ],
    'bars',
    (v) => { view = v; draw(); },
  ));

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  host.appendChild(buildToolbar(bStep, bBack));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, narrow: false };

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    geo.narrow = W < 620;
    geo.x = 42;
    geo.y = 42;
    geo.w = W - 66;
    geo.h = Hh - 130;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const h = history[Math.min(step, history.length - 1)];
    const rank = h.rank;
    const order = PAGES.slice().sort((a, b) => rank[b] - rank[a]);

    label(ctx, '阻尼 d = ' + fmt(damp, 2) + '　迭代式 π′ = (1−d)/N + d·Σ πⱼ/outdeg(j)',
      geo.x, 20, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });

    if (view === 'bars') drawBars(ctx, C, h, order);
    else drawDecay(ctx, C);

    /* 图例 / 结语 */
    label(ctx, '每个页面把票按出链数量均分；被权威页指向一次 > 被十个无名页各指一次',
      geo.x, cv.H - 26, C.grid, { size: 10 });
    label(ctx, 'δ < 10⁻¹² 时可以认为到达不动点：再迭代，分数也不动了',
      geo.x, cv.H - 10, C.grid, { size: 10 });

    const top = order[0];
    ro.set('轮次', step + ' / ' + (history.length - 1) + (step >= history.length - 1 ? '（已收敛）' : ''));
    ro.set('本轮最大变化 δ', Number.isNaN(h.delta) ? '—（初始均匀分布）' : h.delta.toExponential(2));
    ro.set('排名', order.map((p) => p).join(' > ')
      .replace(/ > $/, '') + '　（' + top + ' 以 ' + fmt(rank[top] * 100, 1) + '% 领先）');
    const sum = PAGES.reduce((s, p) => s + rank[p], 0);
    ro.set('与下一轮差距', '分数总和 ' + fmt(sum, 4) + '（应为 1）'
      + (step < history.length - 1 ? '　下一轮 δ ≈ ' + history[step + 1].delta.toExponential(2) : ''));
  }

  function drawBars(ctx, C, h, order) {
    const n = order.length;
    const bw = (geo.w / n) * 0.62;
    const gap = (geo.w / n);
    const maxV = Math.max(...PAGES.map((p) => h.rank[p]), 0.05);
    const base = geo.y + geo.h;
    /* 基准线 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(geo.x - 6, base + 0.5);
    ctx.lineTo(geo.x + geo.w, base + 0.5);
    ctx.stroke();
    ctx.restore();

    order.forEach((p, i) => {
      const v = h.rank[p];
      const bh = (v / maxV) * (geo.h - 26);
      const x = geo.x + i * gap + (gap - bw) / 2;
      const y = base - bh;
      const col = C.series(PAGES.indexOf(p) % 9);
      ctx.save();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.82;
      ctx.fillRect(x, y, bw, bh);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
      ctx.restore();
      label(ctx, p, x + bw / 2, base + 18, C.fg, { size: 12, align: 'center', weight: 700 });
      label(ctx, fmt(v * 100, 1) + '%', x + bw / 2, y - 6, col,
        { size: geo.narrow ? 9.5 : 10.5, align: 'center', weight: 600 });
      /* 均分线：1/N 的位置，一眼看出谁在平均线上、谁在下面 */
      const avg = 1 / N;
      const ay = base - (avg / maxV) * (geo.h - 26);
      if (i === 0) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = C.named('gray');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(geo.x - 4, ay + 0.5);
        ctx.lineTo(geo.x + geo.w, ay + 0.5);
        ctx.stroke();
        ctx.restore();
        label(ctx, '均匀线 1/N = ' + fmt(avg * 100, 1) + '%', geo.x + geo.w, ay - 4,
          C.named('gray'), { size: 9.5, align: 'right' });
      }
    });
    label(ctx, '柱高 = 长期停留占比 πᵢ', geo.x, geo.y - 10, C.axis, { size: 10 });
  }

  function drawDecay(ctx, C) {
    const ys = history.map((h) => (Number.isNaN(h.delta) ? null : h.delta)).filter((v) => v !== null && v > 0);
    if (!ys.length) {
      label(ctx, '还没有数据：按「单步」迭代一轮', geo.x, geo.y + geo.h / 2, C.axis, { size: 11 });
      return;
    }
    const lo = Math.log10(Math.min(...ys));
    const hi = Math.log10(Math.max(...ys));
    const span = Math.max(hi - lo, 1e-6);
    const px = (i) => geo.x + (i / Math.max(history.length - 2, 1)) * geo.w;
    const py = (d) => geo.y + geo.h - ((Math.log10(Math.max(d, 1e-16)) - lo) / span) * (geo.h - 20);
    /* 网格线：每个数量级一条 */
    for (let e = Math.ceil(lo); e <= Math.floor(hi); e += 1) {
      const y = geo.y + geo.h - ((e - lo) / span) * (geo.h - 20);
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(geo.x, y + 0.5);
      ctx.lineTo(geo.x + geo.w, y + 0.5);
      ctx.stroke();
      ctx.restore();
      label(ctx, '1e' + e, geo.x - 6, y + 4, C.grid, { size: 9, align: 'right' });
    }
    const pts = [];
    history.forEach((h, i) => {
      if (i === 0 || !(h.delta > 0)) return;
      if (i > step) return;
      pts.push([px(i - 1), py(h.delta)]);
    });
    if (pts.length > 1) polyline(ctx, pts, C.accent, 2.2);
    pts.forEach((pt, i) => {
      ctx.save();
      ctx.fillStyle = i === pts.length - 1 ? C.accent2 : C.accent;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], i === pts.length - 1 ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    label(ctx, '轮次 →', geo.x + geo.w, geo.y + geo.h + 16, C.axis, { size: 10, align: 'right' });
    label(ctx, 'δ（相邻两轮的最大变化，纵轴对数）', geo.x, geo.y - 10, C.axis, { size: 10 });
    if (pts.length < 2) {
      label(ctx, '至少迭代两轮才能看出衰减斜率', geo.x + geo.w / 2, geo.y + geo.h / 2,
        C.axis, { size: 11, align: 'center' });
    }
  }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.45) return;
      acc = 0;
      step = step >= history.length - 1 ? 0 : step + 1;
      draw();
    },
    onReset() { acc = 0; step = 0; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    step = Math.min(step + 1, history.length - 1);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    step = Math.max(step - 1, 0);
    draw();
  });

  reset(damp);
  step = reduced ? history.length - 1 : 0;   // 减少动效的用户直接看终态
  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); cv.redraw = null; } };
}

/* =========================================================================
 * lab 组件：g53-random-walk-field —— 一次游走的频率 vs 平稳分布（第 53 章「随机游走」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-random-walk-field",
 *     "title": "三角形带尾巴：走 400 步，频率离平稳分布还有多远",
 *     "nodes": ["0","1","2","3"], "edges": [[0,1],[1,2],[0,2],[1,3]], "seed": 7 }
 *
 * 字段：nodes / edges（可选）；seed（默认 7）；steps（默认 400）。
 *
 * 交互（三条互相对照的证据）：
 *   · 「走 100 步 / 走 400 步 / 重置」按固定种子推进，每步都记录落点；
 *   · 右上是**访问频率柱**，橙色横线是理论平稳分布 π（度 / 总度）——
 *     步数越多，柱子越贴线，这是「长跑抹掉起点」的可视证明；
 *   · 图上有一个会动的光点，点「慢放」可以看它一跳一跳；
 *   · 「换个起点」把光点挪到别的节点，再跑同样的步数，柱子基本不变——
 *     起点只影响开头几步。
 *
 * 为什么平稳分布的公式是「度 / 总度」：无向图上从每个点等概率挑邻居，
 *   邻居多的点自然被挑中更多次。这里直接把两边的数并排放着核对。
 * 所有随机数来自固定种子，同一颗按钮点两次结果一样（可复现）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clamp, fmt, mulberry32,
} from '../core.js';
import {
  adjOf, degOf, circleLayout, pickNode, drawEdge, drawNode, legendInto,
  readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['0', '1', '2', '3'];
const DEFAULT_EDGES = [[0, 1], [1, 2], [0, 2], [1, 3]];
const MAX_STEPS = 4000;

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;
  const edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);
  const seed = (Number(spec.seed) || 7) >>> 0;
  const targetSteps = clamp(Math.round(Number(spec.steps) || 400), 10, MAX_STEPS);

  let start = 0;
  let pos0 = 0;                 /* 光点当前所在 */
  let visits = new Array(n).fill(0);
  let steps = 0;
  let rnd = mulberry32(seed);
  let slow = false;

  const cv = setupCanvas(host, 340);
  const pos = {};
  let posKey = '';
  let barRect = null;
  const hover = { i: -1 };

  /* ---------- 数学 ---------- */

  function adj() {
    return adjOf(n, edges, { directed: false });
  }

  /* 平稳分布 π_i = d_i / Σd。这是无向图上「均匀挑邻居」的不变分布。 */
  function stationary() {
    const d = degOf(adj());
    const total = d.reduce((a, b) => a + b, 0) || 1;
    return d.map((x) => x / total);
  }

  function freq() {
    const total = visits.reduce((a, b) => a + b, 0);
    return total ? visits.map((v) => v / total) : new Array(n).fill(0);
  }

  function advance(count) {
    const A = adj();
    for (let s = 0; s < count && steps < MAX_STEPS; s += 1) {
      visits[pos0] += 1;
      const nbrs = [];
      for (let v = 0; v < n; v += 1) if (A[pos0][v]) nbrs.push(v);
      if (!nbrs.length) break;
      pos0 = nbrs[Math.floor(rnd() * nbrs.length)];
      steps += 1;
    }
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    return {
      narrow,
      graph: { x: 10, y: 26, w: narrow ? W - 20 : Math.round(W * 0.44) - 18, h: narrow ? Math.round(H * 0.44) : H - 56 },
      bars: {
        x: narrow ? 12 : Math.round(W * 0.46),
        y: narrow ? 26 + Math.round(H * 0.44) + 26 : 42,
        w: narrow ? W - 24 : W - Math.round(W * 0.46) - 20,
        h: narrow ? Math.round(H * 0.42) : H - 92,
      },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + n;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    circleLayout(n, rect, 0.35).forEach((p, i) => { pos[i] = p; });
  }

  /* ---------- 绘制 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const r = rects();
    ensurePos(r.graph);
    const pi = stationary();
    const f = freq();

    drawGraph(ctx, r.graph, C);
    drawBars(ctx, r.bars, f, pi, C);

    label(ctx, '柱子 = 实际访问频率；橙线 = 理论平稳分布 dᵢ/Σd；步数越多，柱子越贴线',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, C) {
    const f = freq();
    const mx = Math.max(1e-9, ...f);
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const hot = hover.i >= 0 && (hover.i === u || hover.i === v);
      drawEdge(ctx, pos[u], 16, pos[v], 16, hot ? C.accent2 : C.axis, hot ? 2.6 : 1.5, {});
    });
    nodes.forEach((nm, i) => {
      const hot = hover.i === i;
      const on = pos0 === i;
      drawNode(ctx, pos[i], 16, C, {
        text: nm,
        sub: fmt(f[i], 2),
        stroke: on ? C.named('green') : (hot ? C.accent2 : C.axis),
        lineWidth: on ? 3 : (hot ? 2.6 : 1.6),
        ring: on ? C.named('green') : (hot ? C.accent2 : null),
        textColor: hot ? C.accent2 : C.fg,
        fill: C.accent,
        fillAlpha: 0.12 + 0.55 * (f[i] / mx),
      });
      if (on) {
        label(ctx, '光点在这里', pos[i].x, pos[i].y - 30, C.named('green'), {
          size: 9.5, align: 'center', weight: 700,
        });
      }
    });
    label(ctx, '起点：' + nodes[start] + '　当前：' + nodes[pos0] + '　已走 ' + steps + ' 步',
      rect.x + 2, rect.y + rect.h + 14, C.fg, { size: 9.5 });
  }

  function drawBars(ctx, rect, f, pi, C) {
    barRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h, n };
    label(ctx, '访问频率 vs 平稳分布', rect.x, rect.y - 14, C.fg, { size: 10.5, weight: 700 });
    const padB = 26;
    const h = rect.h - padB - 8;
    const maxV = Math.max(0.15, ...f, ...pi) * 1.15;
    const bw = rect.w / Math.max(1, n);

    /* 平稳分布：一整条橙色横线，每根柱子都能对上 */
    pi.forEach((p, i) => {
      const y = rect.y + 8 + h - (p / maxV) * h;
      ctx.save();
      ctx.strokeStyle = C.named('orange');
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(rect.x + i * bw + 3, y);
      ctx.lineTo(rect.x + (i + 1) * bw - 3, y);
      ctx.stroke();
      ctx.restore();
      label(ctx, fmt(p, 2), rect.x + i * bw + bw / 2, y - 4, C.named('orange'), {
        size: 8.5, align: 'center',
      });
    });

    f.forEach((v, i) => {
      const bh = (v / maxV) * h;
      const hot = hover.i === i;
      ctx.save();
      ctx.fillStyle = hot ? C.accent2 : C.accent;
      ctx.globalAlpha = v > 0 ? 0.78 : 0.15;
      ctx.fillRect(rect.x + i * bw + 4, rect.y + 8 + h - bh, Math.max(2, bw - 8), bh);
      ctx.restore();
      label(ctx, nodes[i], rect.x + i * bw + bw / 2, rect.y + 8 + h + 13,
        hot ? C.accent2 : C.axis, { size: 9, align: 'center', weight: hot ? 700 : 400 });
    });

    /* 总变差：频率与 π 差多少，一个数收口 */
    let tv = 0;
    for (let i = 0; i < n; i += 1) tv += Math.abs(f[i] - pi[i]);
    tv /= 2;
    label(ctx, '总变差距离 ‖f − π‖₁/2 = ' + fmt(tv, 3),
      rect.x, rect.y + rect.h - 4, tv < 0.06 ? C.ok : C.grid, { size: 9.5, weight: 700 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 步数: '—', 当前位置: '—', 最大频率: '—', '总变差': '—' });
  host.appendChild(ro.box);

  const btn100 = mkBtn('再走 100 步');
  const btn400 = mkBtn('再走 400 步');
  const btnReset = mkBtn('重置（同一种子）');
  host.appendChild(buildToolbar(btn100, btn400, btnReset));

  const btnStart = mkBtn('换个起点');
  const btnSlow = mkBtn('慢放一帧');
  host.appendChild(buildToolbar(btnStart, btnSlow));

  legendInto(host, [
    [themeColors().accent, '柱高 = 实际到访频率'],
    [themeColors().named('orange'), '横线 = 理论平稳分布 πᵢ = dᵢ/Σd'],
    [themeColors().named('green'), '绿圈 = 光点当前所在'],
  ]);

  function refresh() {
    const f = freq();
    const pi = stationary();
    let tv = 0;
    for (let i = 0; i < n; i += 1) tv += Math.abs(f[i] - pi[i]);
    tv /= 2;
    ro.set('步数', steps + ' / ' + targetSteps + '（上限 ' + MAX_STEPS + '）');
    ro.set('当前位置', nodes[pos0]);
    ro.set('最大频率', fmt(Math.max(...f), 3));
    ro.set('总变差', fmt(tv, 3) + (steps > 0 ? (tv < 0.06 ? '（已收敛）' : '') : ''));
    draw();
  }

  btn100.addEventListener('click', () => { advance(slow ? 1 : 100); refresh(); });
  btn400.addEventListener('click', () => { advance(slow ? 1 : 400); refresh(); });
  btnReset.addEventListener('click', () => {
    rnd = mulberry32(seed);
    visits = new Array(n).fill(0);
    steps = 0;
    pos0 = start;
    refresh();
  });
  btnStart.addEventListener('click', () => {
    start = (start + 1) % n;
    pos0 = start;
    rnd = mulberry32(seed);
    visits = new Array(n).fill(0);
    steps = 0;
    refresh();
  });
  btnSlow.addEventListener('click', () => {
    slow = !slow;
    advance(1);
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 16);
      return i >= 0 ? { kind: 'node', i } : null;
    },
    down(id) {
      if (id && id.kind === 'node') {
        /* 点节点 = 从它重新出发（种子照旧，所以结果可复现） */
        start = id.i;
        pos0 = id.i;
        rnd = mulberry32(seed);
        visits = new Array(n).fill(0);
        steps = 0;
        hover.i = id.i;
      }
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 16);
      if (i !== hover.i) { hover.i = i; refresh(); }
    },
    leave() {
      if (hover.i >= 0) { hover.i = -1; refresh(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

/* =========================================================================
 * lab 组件：g53-transfer-builder —— 加权出边 → 列随机转移矩阵（第 53 章「加权图与转移矩阵」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-transfer-builder", "title": "把权重列归一化成概率",
 *     "nodes": ["A","B","C"], "edges": [[0,1,2],[1,2,1],[2,0,3],[0,2,1]] }
 *
 * 字段：nodes / edges（第三项是权重，缺省 1）；steps 可选，初始步数。
 *
 * 交互：
 *   · 「下一步」把分布沿转移矩阵推一步，「重置」回到全部在 A；
 *   · 「把某列归一化」开关：关掉时右侧显示原始权重矩阵 W，打开后显示 P，
 *     每一列会自己标出「列和 = 1」——课程里那句「按列归一化」就是这一下；
 *   · 悬停权重矩阵的一格，图上对应的有向边加粗；
 *   · 点节点查看它的出边总权重（= 归一化的分母）。
 *
 * 本课约定与课文一致：**列随机**。第 j 列是从节点 j 出发的概率预算，
 * 所以下一步分布写 P·p（左乘列向量），不是 p·P。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clamp, fmt,
} from '../core.js';
import {
  adjOf, circleLayout, pickNode, drawEdge, drawNode, drawMatrixInto,
  matrixCellAt, legendInto, fmtVec,
} from './graph-kit.js';

const DEFAULT_NODES = ['A', 'B', 'C'];
const DEFAULT_EDGES = [[0, 1, 2], [1, 2, 1], [2, 0, 3], [0, 2, 1]];

export default function render(host, spec) {
  const nodes = Array.isArray(spec.nodes) && spec.nodes.length >= 2 ? spec.nodes.slice(0, 8).map(String) : DEFAULT_NODES.slice();
  const n = nodes.length;
  const edges = (Array.isArray(spec.edges) ? spec.edges : DEFAULT_EDGES)
    .filter((e) => Array.isArray(e) && e.length >= 2)
    .map((e) => [Math.round(Number(e[0])), Math.round(Number(e[1])), typeof e[2] === 'number' ? e[2] : 1])
    .filter(([u, v, w]) => u >= 0 && v >= 0 && u < n && v < n && u !== v && w > 0);

  let normalized = true;
  let steps = 0;
  let p = new Array(n).fill(0);
  p[0] = 1;

  const cv = setupCanvas(host, 350);
  const pos = {};
  let posKey = '';
  let mxRect = null;
  let dragNode = -1;
  const hover = { kind: null, i: -1, j: -1 };

  /* ---------- 数学 ---------- */

  /* W[u][v] = u→v 的权重。列随机 P 的每一列是「从 v 出发」的预算，
     所以 P[u][v] = W[u][v] / Σ_u W[u][v]（按列求分母）。 */
  function weights() {
    const W = Array.from({ length: n }, () => new Array(n).fill(0));
    edges.forEach(([u, v, w]) => { W[u][v] += w; });
    return W;
  }

  function transfer() {
    const W = weights();
    const colSum = W[0].map((_, v) => W.reduce((s, row) => s + row[v], 0));
    const P = W.map((row) => row.map((w, v) => (colSum[v] > 1e-12 ? w / colSum[v] : 0)));
    return { W, P, colSum };
  }

  function advance() {
    const { P } = transfer();
    const next = new Array(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) next[i] += P[i][j] * p[j];
    }
    p = next;
    steps += 1;
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    if (narrow) {
      const gh = Math.round(H * 0.46);
      const size = Math.min(W * 0.60, H - gh - 60);
      return {
        narrow,
        graph: { x: 6, y: 26, w: W - 12, h: gh },
        matrix: { x: 8, y: 26 + gh + 22, w: size, h: size },
        text: { x: size + 24, y: 26 + gh + 22, w: W - size - 32, h: size },
      };
    }
    const graph = { x: 8, y: 26, w: Math.round(W * 0.44) - 16, h: H - 50 };
    const size = Math.min(W * 0.31, H - 80);
    return {
      narrow,
      graph,
      matrix: { x: Math.round(W * 0.46), y: 38, w: size, h: size },
      text: { x: Math.round(W * 0.46) + size + 16, y: 38, w: W - Math.round(W * 0.46) - size - 24, h: size },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + n;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    circleLayout(n, rect, 0.34).forEach((pt, i) => { pos[i] = pt; });
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
    const { W: Wm, P, colSum } = transfer();
    const shown = normalized ? P : Wm;
    const f = hover;

    drawGraph(ctx, r.graph, Wm, C, f);
    const mr = drawMatrixInto(ctx, r.matrix, shown, {
      C,
      labels: nodes,
      title: normalized ? 'P（每列和 = 1）' : 'W（原始权重）',
      hoverRow: f.kind === 'cell' ? f.i : -1,
      hoverCol: f.kind === 'cell' ? f.j : -1,
      focus: f.kind === 'cell' ? { i: f.i, j: f.j } : null,
      rowSums: normalized ? null : colSum,
      small: r.narrow,
    });
    mxRect = mr;
    drawText(ctx, r.text, P, colSum, C, f);

    label(ctx, normalized
      ? '列和全部 = 1：第 j 列是「从 j 出发」的概率预算，下一步写 P·p'
      : '原始权重：列和是分母，归一化就是每列各除以自己的和',
      8, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, Wm, C, f) {
    let maxW = 1e-9;
    Wm.forEach((row) => row.forEach((w) => { maxW = Math.max(maxW, w); }));
    edges.forEach(([u, v, w]) => {
      if (!pos[u] || !pos[v]) return;
      const hot = f.kind === 'cell' && f.i === u && f.j === v;
      drawEdge(ctx, pos[u], 15, pos[v], 15, hot ? C.accent2 : C.axis,
        1.2 + 3.4 * (w / maxW), { arrow: true, head: 8 });
      const mx = (pos[u].x + pos[v].x) / 2;
      const my = (pos[u].y + pos[v].y) / 2;
      label(ctx, fmt(w, 2), mx + 7, my - 5, hot ? C.accent2 : C.grid, { size: 9.5, weight: 600 });
    });
    const maxP = Math.max(1e-9, ...p);
    nodes.forEach((nm, i) => {
      const hot = f.kind === 'cell' && (f.i === i || f.j === i);
      const r = 13 + 8 * (p[i] / maxP);
      drawNode(ctx, pos[i], r, C, {
        text: nm,
        sub: 'p=' + fmt(p[i], 3),
        stroke: hot ? C.accent2 : C.axis,
        lineWidth: hot ? 2.6 : 1.6,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: C.accent,
        fillAlpha: 0.12 + 0.5 * (p[i] / maxP),
      });
    });
  }

  function drawText(ctx, rect, P, colSum, C, f) {
    let y = rect.y + 4;
    label(ctx, '第 ' + steps + ' 步的分布', rect.x, y, C.fg, { size: 11, weight: 700 });
    y += 17;
    label(ctx, fmtVec(p, 3), rect.x, y, C.accent, { size: 10 });
    y += 20;
    label(ctx, '列和（归一化分母）', rect.x, y, C.axis, { size: 10 });
    y += 16;
    nodes.forEach((nm, j) => {
      const hot = f.kind === 'cell' && f.j === j;
      label(ctx, nm + ' 的出边总权重 = ' + fmt(colSum[j], 2), rect.x, y,
        hot ? C.accent2 : C.grid, { size: 9.5, weight: hot ? 700 : 400 });
      y += 15;
    });
    y += 8;
    if (f.kind === 'cell') {
      label(ctx, nodes[f.i] + ' → ' + nodes[f.j], rect.x, y, C.accent2, { size: 10, weight: 700 });
      y += 16;
      label(ctx, '原始权重 = ' + fmt(weights()[f.i][f.j], 2) + '　列和 = ' + fmt(colSum[f.j], 2),
        rect.x, y, C.grid, { size: 9 });
      y += 13;
      label(ctx, 'P = 权重 / 列和 = ' + fmt(P[f.i][f.j], 3), rect.x, y, C.fg, { size: 9.5 });
    } else {
      label(ctx, '悬停一格看它的 P 值', rect.x, y, C.grid, { size: 9.5 });
    }
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 矩阵: '—', '列和': '—', 当前分布: '—' });
  host.appendChild(ro.box);

  const btnStep = mkBtn('下一步');
  const btnReset = mkBtn('重置到 A');
  const btnNorm = mkBtn('切换：权重 W / 概率 P');
  host.appendChild(buildToolbar(btnStep, btnReset, btnNorm));

  legendInto(host, [
    [themeColors().accent, '节点圆的大小 = 当前概率'],
    [themeColors().axis, '箭头粗细 = 原始权重'],
  ]);

  function refresh() {
    const { P, colSum } = transfer();
    let mx = 0;
    p.forEach((v) => { mx = Math.max(mx, v); });
    ro.set('矩阵', normalized ? 'P（列随机）' : 'W（原始权重）');
    ro.set('列和', normalized ? '全部 = 1' : fmtVec(colSum, 2));
    ro.set('当前分布', '第 ' + steps + ' 步 · 总和 ' + fmt(p.reduce((a, b) => a + b, 0), 3)
      + ' · 最大 ' + fmt(mx, 3));
    draw();
  }

  btnStep.addEventListener('click', () => { advance(); refresh(); });
  btnReset.addEventListener('click', () => {
    p = new Array(n).fill(0);
    p[0] = 1;
    steps = 0;
    refresh();
  });
  btnNorm.addEventListener('click', () => { normalized = !normalized; refresh(); });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 16);
      if (i >= 0) return { kind: 'node', i };
      const c = matrixCellAt(mxRect, px, py);
      if (c) return { kind: 'cell', i: c.i, j: c.j };
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') dragNode = id.i;
      else if (id && id.kind === 'cell') {
        hover.kind = 'cell';
        hover.i = id.i;
        hover.j = id.j;
      }
      refresh();
    },
    move(id, px, py) {
      if (dragNode < 0) return;
      const g = rects().graph;
      pos[dragNode].x = clamp(px, g.x + 20, g.x + g.w - 20);
      pos[dragNode].y = clamp(py, g.y + 24, g.y + g.h - 22);
      refresh();
    },
    up() { dragNode = -1; },
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 16);
      let next = { kind: null, i: -1, j: -1 };
      if (i >= 0) next = { kind: 'node', i, j: -1 };
      else {
        const c = matrixCellAt(mxRect, px, py);
        if (c) next = { kind: 'cell', i: c.i, j: c.j };
      }
      if (next.kind !== hover.kind || next.i !== hover.i || next.j !== hover.j) {
        hover.kind = next.kind;
        hover.i = next.i;
        hover.j = next.j;
        refresh();
      }
    },
    leave() {
      if (hover.kind) { hover.kind = null; hover.i = -1; hover.j = -1; refresh(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

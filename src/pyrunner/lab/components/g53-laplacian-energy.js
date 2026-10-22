/* =========================================================================
 * lab 组件：g53-laplacian-energy —— Laplacian 二次型能量（第 53 章「Laplacian 矩阵」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-laplacian-energy", "title": "给节点赋值，看能量怎么变" }
 *
 * 字段：nodes / edges（可选）；values 可选，初始节点取值。
 *
 * 交互（这一张卡的主角是「赋值」这件事）：
 *   · 每个节点一根竖直滑块（拖节点上下就是调它的取值），能量条实时更新；
 *   · 「抹平」按钮把所有取值拉向均值——能量单调下降，最后趋近 0；
 *   · 「随机」按钮换一组取值；「用第二特征向量」按钮把 $x$ 设成 Fiedler 向量，
 *     此时能量恰好等于 $\lambda_2 \lVert x\rVert^2$，是能算出来核对的；
 *   · 右侧矩阵是 $L=D-A$，同时把每一行和（恒为 0）写在旁边；
 *   · 悬停矩阵一格，图上那条边加粗。
 *
 * 看什么：能量 $x^{\mathsf T}Lx=\sum_{(i,j)\in E}(x_i-x_j)^2$。
 *   当一个连通块里所有 $x_i$ 相等时，每一条边的差都是 0，能量就是 0——
 *   这就是「常数信号在图上没有局部差异」那句话的现场。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clamp, fmt,
} from '../core.js';
import {
  adjOf, laplacianOf, degOf, jacobiEigen, eigenVector, circleLayout, pickNode,
  drawEdge, drawNode, drawMatrixInto, matrixCellAt, legendInto, fmtVec,
} from './graph-kit.js';

const DEFAULT_NODES = ['A', 'B', 'C'];
const DEFAULT_EDGES = [[0, 1], [0, 2], [1, 2]];

export default function render(host, spec) {
  const nodes = Array.isArray(spec.nodes) && spec.nodes.length >= 2 ? spec.nodes.slice(0, 8).map(String) : DEFAULT_NODES.slice();
  const n = nodes.length;
  const edges = (Array.isArray(spec.edges) ? spec.edges : DEFAULT_EDGES)
    .filter((e) => Array.isArray(e) && e.length >= 2)
    .map((e) => [Math.round(Number(e[0])), Math.round(Number(e[1]))])
    .filter(([u, v]) => u >= 0 && v >= 0 && u < n && v < n && u !== v);

  let vals = (Array.isArray(spec.values) && spec.values.length === n)
    ? spec.values.map((x) => Number(x) || 0)
    : nodes.map((_, i) => (n === 3 ? [1, 2, 4][i] : i + 1));

  const cv = setupCanvas(host, 360);
  const pos = {};
  let posKey = '';
  let mxRect = null;
  let dragNode = -1;
  const hover = { kind: null, i: -1, j: -1 };

  /* ---------- 数学 ---------- */

  function Laplacian() {
    return laplacianOf(adjOf(n, edges, { directed: false }));
  }

  /* xᵀLx 两种算法：按矩阵乘，或按边逐条求差平方和。
     两条路都必须给出同一个数——组件直接把两个都显示出来，好让学生自己核对。 */
  function energy() {
    const L = Laplacian();
    const viaMatrix = vals.reduce((s, xi, i) => s + xi * L[i].reduce((a, Lij, j) => a + Lij * vals[j], 0), 0);
    const viaEdges = edges.reduce((s, [u, v]) => s + (vals[u] - vals[v]) ** 2, 0);
    return { viaMatrix, viaEdges };
  }

  function fiedler() {
    const L = Laplacian();
    const { values, vectors } = jacobiEigen(L);
    /* 第二小特征向量（下标 1）。重根时方向不唯一——UI 上会标一句 */
    const vec = eigenVector(vectors, Math.min(1, values.length - 1));
    return { values, vec };
  }

  const MARGIN = 1.1;
  function vRange() {
    const lo = Math.min(0, ...vals) - MARGIN;
    const hi = Math.max(1, ...vals) + MARGIN;
    return { lo, hi };
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    if (narrow) {
      const gh = Math.round(H * 0.50);
      const size = Math.min(W * 0.58, H - gh - 60);
      return {
        narrow,
        graph: { x: 6, y: 26, w: W - 12, h: gh },
        matrix: { x: 8, y: 26 + gh + 24, w: size, h: size },
        text: { x: size + 24, y: 26 + gh + 24, w: W - size - 32, h: size },
      };
    }
    const graph = { x: 8, y: 26, w: Math.round(W * 0.46) - 16, h: H - 50 };
    const size = Math.min(W * 0.30, H - 82);
    return {
      narrow,
      graph,
      matrix: { x: Math.round(W * 0.48), y: 38, w: size, h: size },
      text: { x: Math.round(W * 0.48) + size + 16, y: 38, w: W - Math.round(W * 0.48) - size - 24, h: size },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + n;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    circleLayout(n, rect, 0.34).forEach((pt, i) => { pos[i] = pt; });
  }

  /* 节点取值 → 屏幕 y（值越大越靠上）。拖节点上下就是改取值。 */
  function yOf(v, rect) {
    const { lo, hi } = vRange();
    const t = (v - lo) / (hi - lo);
    return rect.y + rect.h - 14 - t * (rect.h - 34);
  }

  function vOf(y, rect) {
    const { lo, hi } = vRange();
    const t = (rect.y + rect.h - 14 - y) / (rect.h - 34);
    return lo + clamp(t, 0, 1) * (hi - lo);
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
    /* 让节点纵向位置直接编码它的取值——不用另画一组柱子 */
    nodes.forEach((_, i) => {
      const base = pos[i];
      base.y = yOf(vals[i], r.graph);
      base.x = r.graph.x + 30 + (i / Math.max(1, n - 1)) * (r.graph.w - 60);
    });

    const L = Laplacian();
    const deg = degOf(adjOf(n, edges, { directed: false }));
    const e = energy();
    drawGraph(ctx, r.graph, C, L, deg);
    const mr = drawMatrixInto(ctx, r.matrix, L, {
      C,
      labels: nodes,
      title: 'L = D − A',
      signed: true,
      hoverRow: hover.kind === 'cell' ? hover.i : -1,
      hoverCol: hover.kind === 'cell' ? hover.j : -1,
      focus: hover.kind === 'cell' ? { i: hover.i, j: hover.j } : null,
      rowSums: vals.map(() => 0),
      small: r.narrow,
    });
    mxRect = mr;
    drawText(ctx, r.text, e, C);

    label(ctx, '上下拖动节点 = 改它的取值 xᵢ；能量 = Σ(相邻取值差)²，最右边是矩阵算出的同一个数',
      8, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, C, L, deg) {
    const { lo, hi } = vRange();
    const yMid = (v) => yOf(v, rect);
    /* 水平参考线（0 与均值），让「差多少」有标尺 */
    [0, vals.reduce((a, b) => a + b, 0) / Math.max(1, n)].forEach((v, k) => {
      if (v < lo || v > hi) return;
      ctx.save();
      ctx.strokeStyle = k === 0 ? C.axis : C.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash(k === 0 ? [] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(rect.x + 16, yMid(v));
      ctx.lineTo(rect.x + rect.w - 12, yMid(v));
      ctx.stroke();
      ctx.restore();
      label(ctx, k === 0 ? '0' : '均值', rect.x + 16, yMid(v) - 4, C.grid, { size: 8.5 });
    });

    edges.forEach(([u, v]) => {
      const hot = (hover.kind === 'cell' && ((hover.i === u && hover.j === v) || (hover.i === v && hover.j === u)))
        || (hover.kind === 'node' && (hover.i === u || hover.i === v));
      drawEdge(ctx, pos[u], 14, pos[v], 14, hot ? C.accent2 : C.axis, hot ? 3 : 1.6, {});
      const d = Math.abs(vals[u] - vals[v]);
      label(ctx, fmt(d, 2), (pos[u].x + pos[v].x) / 2 + 5, (pos[u].y + pos[v].y) / 2 - 5,
        d < 1e-9 ? C.ok : (hot ? C.accent2 : C.grid), { size: 9.5, weight: d < 1e-9 ? 700 : 400 });
    });

    nodes.forEach((nm, i) => {
      const hot = hover.kind === 'node' ? hover.i === i : (hover.kind === 'cell' && (hover.i === i || hover.j === i));
      drawNode(ctx, pos[i], 15, C, {
        text: nm,
        sub: 'x=' + fmt(vals[i], 2),
        stroke: hot ? C.accent2 : C.axis,
        lineWidth: hot ? 2.6 : 1.6,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: vals[i] >= 0 ? C.accent : C.bad,
        fillAlpha: 0.18,
      });
      label(ctx, 'd=' + fmt(deg[i], 2), pos[i].x + 22, pos[i].y + 4, C.grid, { size: 8.5 });
    });
  }

  function drawText(ctx, rect, e, C) {
    let y = rect.y + 4;
    label(ctx, 'x = ' + fmtVec(vals, 2), rect.x, y, C.fg, { size: 10.5 });
    y += 20;
    label(ctx, '能量（按边逐条求差平方）', rect.x, y, C.axis, { size: 9.5 });
    y += 15;
    label(ctx, '= ' + fmt(e.viaEdges, 4), rect.x, y, C.accent, { size: 13, weight: 700 });
    y += 20;
    label(ctx, '能量（按 xᵀLx 算）', rect.x, y, C.axis, { size: 9.5 });
    y += 15;
    label(ctx, '= ' + fmt(e.viaMatrix, 4), rect.x, y, C.named('purple'), { size: 13, weight: 700 });
    y += 20;
    const same = Math.abs(e.viaMatrix - e.viaEdges) < 1e-6;
    label(ctx, same ? '两条路给出同一个数 ✔' : '数值上略有出入（' + fmt(Math.abs(e.viaMatrix - e.viaEdges), 6) + '）',
      rect.x, y, same ? C.ok : C.bad, { size: 9.5, weight: 700 });
    y += 20;
    const { values } = fiedler();
    label(ctx, 'λ₂ = ' + fmt(values.length > 1 ? values[1] : 0, 3) + '（代数连通度：连通时 > 0）',
      rect.x, y, C.grid, { size: 9.5 });
    y += 14;
    label(ctx, '连通时 λ₂ > 0；能量为 0 时全是常数', rect.x, y, C.grid, { size: 9 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 能量: '—', 'λ₂': '—', 取值: '—' });
  host.appendChild(ro.box);

  const btnSmooth = mkBtn('抹平（拉向均值）');
  const btnRandom = mkBtn('随机取值');
  const btnFiedler = mkBtn('用第二特征向量');
  host.appendChild(buildToolbar(btnSmooth, btnRandom, btnFiedler));

  legendInto(host, [
    [themeColors().accent, '节点高低 = 取值大小'],
    [themeColors().ok, '边上数字为 0 = 两端一样高（不贡献能量）'],
  ]);

  function refresh() {
    const e = energy();
    const { values } = fiedler();
    ro.set('能量', 'xᵀLx = ' + fmt(e.viaEdges, 4));
    ro.set('λ₂', fmt(values.length > 1 ? values[1] : 0, 4));
    ro.set('取值', fmtVec(vals, 2));
    draw();
  }

  btnSmooth.addEventListener('click', () => {
    const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, n);
    /* 每点一次走一半：能量单调下降但仍看得见变化，不会一步跳成常数 */
    vals = vals.map((v) => v + (mean - v) * 0.5);
    refresh();
  });
  btnRandom.addEventListener('click', () => {
    vals = vals.map(() => Math.round((Math.random() * 6 - 1) * 10) / 10);
    refresh();
  });
  btnFiedler.addEventListener('click', () => {
    const { vec } = fiedler();
    const scale = 3;
    vals = vec.map((v) => Math.round(v * scale * 100) / 100);
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      if (i >= 0) return { kind: 'node', i };
      const c = matrixCellAt(mxRect, px, py);
      if (c) return { kind: 'cell', i: c.i, j: c.j };
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') {
        dragNode = id.i;
        hover.kind = 'node';
        hover.i = id.i;
      } else if (id && id.kind === 'cell') {
        hover.kind = 'cell';
        hover.i = id.i;
        hover.j = id.j;
      }
      refresh();
    },
    move(id, px, py) {
      if (dragNode < 0) return;
      const r = rects().graph;
      vals[dragNode] = Math.round(vOf(py, r) * 100) / 100;
      refresh();
    },
    up() { dragNode = -1; },
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
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

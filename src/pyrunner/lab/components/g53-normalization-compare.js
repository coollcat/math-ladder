/* =========================================================================
 * lab 组件：g53-normalization-compare —— 三种 Laplacian 同屏对照（第 53 章「度矩阵与归一化」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-normalization-compare", "title": "同一条链，三种归一化",
 *     "nodes": ["A","B","C"], "edges": [[0,1],[1,2]] }
 *
 * 字段：nodes / edges（可选）；mode 可选，初始归一化
 *       "comb"（D−A）/ "rw"（D⁻¹L）/ "sym"（D^-1/2 L D^-1/2）。
 *
 * 交互：
 *   · 分段按钮切换三种归一化，矩阵、特征值条形图、节点着色三处同时变；
 *   · 点特征值条形图里的一根 → 图按对应的特征向量着色（正红负蓝，零灰）；
 *   · 「加一个枢纽」把第 0 个节点连到所有人——度失衡立刻出现；
 *   · 悬停矩阵格：行列与图上那条边联动加粗。
 *
 * 看什么：三种矩阵长得不一样，但 rw 与 sym 的**特征值完全一样**（它们是
 *   相似矩阵）。这是本课最容易背错的一条，这里可以直接把两行特征值并排放着核对。
 *   另外注意加枢纽之后两排数朝**相反**方向走：组合 L 的最大特征值几乎不动
 *   （3→3），rw / sym 那一行反而跌（2→1.5），因为整行被度除掉了。
 *   「归一化像给每人除以自己的嗓门」就是这个差别。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildToolbar,
  buildReadout, mkBtn, label, clamp, fmt,
} from '../core.js';
import {
  adjOf, degOf, laplacianOf, jacobiEigen, eigenVector, circleLayout, pickNode,
  drawEdge, drawNode, drawMatrixInto, matrixCellAt, legendInto,
} from './graph-kit.js';

const MODES = [
  { value: 'comb', label: '组合 L = D−A' },
  { value: 'rw', label: '随机游走 L_rw' },
  { value: 'sym', label: '对称 L_sym' },
];

const DEFAULT_NODES = ['A', 'B', 'C'];
const DEFAULT_EDGES = [[0, 1], [1, 2]];

export default function render(host, spec) {
  let nodes = Array.isArray(spec.nodes) && spec.nodes.length >= 2 ? spec.nodes.slice(0, 8).map(String) : DEFAULT_NODES.slice();
  let n = nodes.length;
  let edges = (Array.isArray(spec.edges) ? spec.edges : DEFAULT_EDGES)
    .filter((e) => Array.isArray(e) && e.length >= 2)
    .map((e) => [Math.round(Number(e[0])), Math.round(Number(e[1]))])
    .filter(([u, v]) => u >= 0 && v >= 0 && u < n && v < n && u !== v);

  const cfg = { mode: MODES.some((m) => m.value === spec.mode) ? spec.mode : 'comb' };
  let vecIdx = -1;

  const cv = setupCanvas(host, 360);
  const pos = {};
  let posKey = '';
  let mxRect = null;
  let barRect = null;
  let dragNode = -1;
  const hover = { kind: null, i: -1, j: -1, k: -1 };

  /* ---------- 数学 ---------- */

  function mats() {
    const A = adjOf(n, edges, { directed: false });
    const d = degOf(A);
    const L = laplacianOf(A);
    const rw = L.map((row, i) => row.map((x) => (d[i] > 1e-12 ? x / d[i] : 0)));
    const inv = d.map((x) => (x > 1e-12 ? 1 / Math.sqrt(x) : 0));
    const sym = L.map((row, i) => row.map((x, j) => x * inv[i] * inv[j]));
    return { A, d, L, rw, sym };
  }

  function current() {
    const m = mats();
    if (cfg.mode === 'rw') return { M: m.rw, d: m.d, sym: true };
    if (cfg.mode === 'sym') return { M: m.sym, d: m.d, sym: true };
    return { M: m.L, d: m.d, sym: true };
  }

  /* 每一档要分解的矩阵**必须跟着 mode 走**：
       · comb → 组合 L 本身（对称，直接 Jacobi）；
       · sym  → D^-1/2 L D^-1/2（对称）；
       · rw   → D⁻¹L 一般不对称，Jacobi 只吃对称矩阵。但 rw 与 sym 相似，
                谱完全相同，所以这里借 sym 的谱，并在 UI 上注明，
                不假装对非对称矩阵做了对称特征分解。
     曾经这里写死 jacobiEigen(m.sym)，于是「组合 L」那一行画出来的是 L_sym 的谱：
     加枢纽后组合 L 的最大特征值本该暴涨（4→6），屏上却跟着归一化的谱往下走，
     课文承诺的「L 暴涨 vs L_rw 小涨」当场翻成「下跌」。 */
  function spectrum() {
    const m = mats();
    const target = cfg.mode === 'comb' ? m.L : m.sym;
    const eig = jacobiEigen(target);
    return { values: eig.values, vectors: eig.vectors };
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    if (narrow) {
      const gh = Math.round(H * 0.44);
      const size = Math.min(W * 0.54, H - gh - 64);
      return {
        narrow,
        graph: { x: 6, y: 26, w: W - 12, h: gh },
        matrix: { x: 8, y: 26 + gh + 22, w: size, h: size },
        bars: { x: size + 24, y: 26 + gh + 22, w: W - size - 32, h: size },
      };
    }
    const graph = { x: 8, y: 26, w: Math.round(W * 0.42) - 16, h: H - 50 };
    const size = Math.min(W * 0.28, H - 86);
    return {
      narrow,
      graph,
      matrix: { x: Math.round(W * 0.44), y: 38, w: size, h: size },
      bars: { x: Math.round(W * 0.44) + size + 16, y: 38, w: W - Math.round(W * 0.44) - size - 24, h: size },
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
    const cur = current();
    const sp = spectrum();
    const vec = vecIdx >= 0 ? eigenVector(sp.vectors, vecIdx) : null;

    drawGraph(ctx, r.graph, cur.d, vec, C);
    const mr = drawMatrixInto(ctx, r.matrix, cur.M, {
      C,
      labels: nodes,
      title: MODES.find((m) => m.value === cfg.mode).label,
      signed: true,
      hoverRow: hover.kind === 'cell' ? hover.i : (hover.kind === 'node' ? hover.i : -1),
      hoverCol: hover.kind === 'cell' ? hover.j : (hover.kind === 'node' ? hover.i : -1),
      focus: hover.kind === 'cell' ? { i: hover.i, j: hover.j } : null,
      small: r.narrow,
    });
    mxRect = mr;
    drawBars(ctx, r.bars, sp, C);

    label(ctx, cfg.mode === 'rw'
      ? 'L_rw = D⁻¹L：第 i 行除以 dᵢ，行和仍为 0，但矩阵一般不再对称'
      : cfg.mode === 'sym'
        ? 'L_sym = D^-1/2 L D^-1/2：两边同时缩放，矩阵保持对称'
        : 'L = D − A：对角线是度数，邻居位置是 −1',
      8, H - 8, C.grid, { size: 10 });
  }

  function nodeColor(C, i, vec, d) {
    if (!vec) {
      const mx = Math.max(1, ...d);
      return { fill: C.accent, alpha: 0.12 + 0.5 * (d[i] / mx) };
    }
    const v = vec[i];
    const ax = Math.max(1e-9, ...vec.map((x) => Math.abs(x)));
    return { fill: Math.abs(v) < 1e-9 ? C.axis : (v > 0 ? C.bad : C.accent), alpha: 0.15 + 0.6 * (Math.abs(v) / ax) };
  }

  function drawGraph(ctx, rect, d, vec, C) {
    edges.forEach(([u, v]) => {
      const hot = (hover.kind === 'cell' && ((hover.i === u && hover.j === v) || (hover.i === v && hover.j === u)))
        || (hover.kind === 'node' && (hover.i === u || hover.i === v));
      drawEdge(ctx, pos[u], 15, pos[v], 15, hot ? C.accent2 : C.axis, hot ? 3 : 1.6, {});
    });
    nodes.forEach((nm, i) => {
      const hot = hover.kind === 'node' ? hover.i === i
        : (hover.kind === 'cell' && (hover.i === i || hover.j === i))
          || (hover.kind === 'bar' && vecIdx >= 0);
      const col = nodeColor(C, i, vec, d);
      drawNode(ctx, pos[i], 15, C, {
        text: nm,
        sub: 'd=' + fmt(d[i], 2) + (vec ? ' · ' + fmt(vec[i], 2) : ''),
        stroke: hot && hover.kind !== 'bar' ? C.accent2 : C.axis,
        lineWidth: hot && hover.kind !== 'bar' ? 2.6 : 1.6,
        ring: hot && hover.kind !== 'bar' ? C.accent2 : null,
        textColor: C.fg,
        fill: col.fill,
        fillAlpha: col.alpha,
      });
    });
    if (vec) {
      label(ctx, '节点颜色 = 第 ' + vecIdx + ' 个特征向量的符号（红正 / 蓝负 / 灰近零）',
        rect.x + 2, rect.y + 2, C.grid, { size: 9.5 });
    }
  }

  function drawBars(ctx, rect, sp, C) {
    const vals = sp.values;
    const maxV = Math.max(1e-9, ...vals.map((v) => Math.abs(v)));
    label(ctx, '特征值（升序）', rect.x, rect.y + 4, C.fg, { size: 11, weight: 700 });
    const y0 = rect.y + 24;
    const rowH = Math.min(20, (rect.h - 30) / Math.max(1, vals.length));
    barRect = { x: rect.x, y: y0, w: rect.w, h: rowH * vals.length, rowH, n: vals.length };
    vals.forEach((v, k) => {
      const y = y0 + k * rowH;
      const hot = vecIdx === k || hover.k === k;
      const w = Math.max(2, (Math.abs(v) / maxV) * (rect.w - 54));
      ctx.save();
      ctx.fillStyle = hot ? C.accent2 : C.accent;
      ctx.globalAlpha = v < 0 ? 0.55 : 0.82;
      ctx.fillRect(rect.x + 40, y + 3, w, rowH - 7);
      ctx.restore();
      label(ctx, 'λ' + k, rect.x, y + rowH - 5, hot ? C.accent2 : C.axis, { size: 9, weight: hot ? 700 : 400 });
      label(ctx, fmt(v, 3), rect.x + 40 + w + 4, y + rowH - 5, hot ? C.accent2 : C.fg, { size: 9 });
    });
    const y = y0 + rowH * vals.length + 12;
    label(ctx, 'λ₂ = ' + fmt(vals.length > 1 ? vals[1] : 0, 3) + '（代数连通度）', rect.x, y, C.grid, { size: 9.5 });
    label(ctx, '点一根柱子 → 按该特征向量着色', rect.x, y + 14, C.grid, { size: 9 });
    label(ctx, 'rw 与 sym 的谱完全相同（相似矩阵）', rect.x, y + 28, C.named('purple'), { size: 9 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 矩阵: '—', '特征值序列': '—', 'λ₂': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(MODES, cfg.mode, (v) => { cfg.mode = v; vecIdx = -1; refresh(); }));

  const btnHub = mkBtn('加一个枢纽（连到所有人）');
  const btnClear = mkBtn('清空额外边');
  const btnReset = mkBtn('重置为链形');
  host.appendChild(buildToolbar(btnHub, btnClear, btnReset));

  legendInto(host, [
    [themeColors().accent, '特征值为正一侧 / 负一侧用颜色区分'],
    [themeColors().named('purple'), '对称与随机游走两种归一化共享同一组特征值'],
  ]);

  function baseEdges() {
    return DEFAULT_EDGES.filter(([u, v]) => u < n && v < n).map((e) => e.slice());
  }

  function refresh() {
    const cur = current();
    const sp = spectrum();
    ro.set('矩阵', MODES.find((m) => m.value === cfg.mode).label);
    ro.set('特征值序列', '[' + sp.values.map((v) => fmt(v, 3)).join(', ') + ']');
    ro.set('λ₂', fmt(sp.values.length > 1 ? sp.values[1] : 0, 4));
    draw();
  }

  btnHub.addEventListener('click', () => {
    for (let v = 1; v < n; v += 1) {
      if (!edges.some(([a, b]) => (a === 0 && b === v) || (a === v && b === 0))) edges.push([0, v]);
    }
    vecIdx = -1;
    refresh();
  });
  btnClear.addEventListener('click', () => {
    edges = baseEdges();
    vecIdx = -1;
    refresh();
  });
  btnReset.addEventListener('click', () => {
    nodes = DEFAULT_NODES.slice();
    n = nodes.length;
    edges = baseEdges();
    posKey = '';
    vecIdx = -1;
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      if (i >= 0) return { kind: 'node', i };
      const c = matrixCellAt(mxRect, px, py);
      if (c) return { kind: 'cell', i: c.i, j: c.j };
      if (barRect && px >= barRect.x && px <= barRect.x + barRect.w
        && py >= barRect.y && py <= barRect.y + barRect.h) {
        return { kind: 'bar', i: clamp(Math.floor((py - barRect.y) / barRect.rowH), 0, barRect.n - 1) };
      }
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') { dragNode = id.i; hover.kind = 'node'; hover.i = id.i; }
      else if (id && id.kind === 'cell') { hover.kind = 'cell'; hover.i = id.i; hover.j = id.j; }
      else if (id && id.kind === 'bar') {
        vecIdx = (vecIdx === id.i) ? -1 : id.i;
        hover.kind = null;
      }
      refresh();
    },
    move(id, px, py) {
      if (dragNode < 0) return;
      const g = rects().graph;
      pos[dragNode].x = clamp(px, g.x + 22, g.x + g.w - 22);
      pos[dragNode].y = clamp(py, g.y + 26, g.y + g.h - 24);
      refresh();
    },
    up() { dragNode = -1; },
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      let next = { kind: null, i: -1, j: -1, k: hover.k };
      if (i >= 0) next = { kind: 'node', i, j: -1, k: -1 };
      else {
        const c = matrixCellAt(mxRect, px, py);
        if (c) next = { kind: 'cell', i: c.i, j: c.j, k: -1 };
        else if (barRect && px >= barRect.x && px <= barRect.x + barRect.w
          && py >= barRect.y && py <= barRect.y + barRect.h) {
          const k = clamp(Math.floor((py - barRect.y) / barRect.rowH), 0, barRect.n - 1);
          next = { kind: 'bar', i: -1, j: -1, k };
        }
      }
      if (next.kind !== hover.kind || next.i !== hover.i || next.j !== hover.j || next.k !== hover.k) {
        hover.kind = next.kind;
        hover.i = next.i;
        hover.j = next.j;
        hover.k = next.k;
        refresh();
      }
    },
    leave() {
      if (hover.kind) { hover.kind = null; hover.i = -1; hover.j = -1; hover.k = -1; refresh(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

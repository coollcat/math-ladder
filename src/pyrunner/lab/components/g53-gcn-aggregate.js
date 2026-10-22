/* =========================================================================
 * lab 组件：g53-gcn-aggregate —— 一层图卷积到底在算什么（第 53 章「图卷积一层聚合」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-gcn-aggregate",
 *     "title": "三种归一化，三种「听谁的多」",
 *     "x": [1, 0, 0, 0, 1] }
 *
 * 字段：nodes / edges（可选）；x 初始特征向量（可选，长度须等于节点数）。
 *
 * 交互：
 *   · 分段按钮切聚合矩阵：普通求和 A／行归一化 D⁻¹A／对称归一化 D^-1/2 A D^-1/2；
 *   · 「自环开/关」——关掉自环后，节点下一层完全丢掉自己的旧特征（课程误区一）；
 *   · 「再来一层」反复左乘同一个矩阵，看特征怎么被抹平（这就是过平滑的起点）；
 *   · 「重置为第一层」回到初始特征；
 *   · 右侧热力图就是这一层真正用的矩阵，悬停格子高亮对应的那条边。
 *
 * 看什么：切到「普通求和」，枢纽节点的新特征被三个邻居一起推高，叶子只有 1；
 *   切到「对称归一化」，枢纽反而被自己的度压回去——度大的节点不再天然占优。
 *   这正是正文「既尊重连接，又防止明星节点主导一切」的定量含义。
 *
 * 数学口径（全部现算）：
 *   row:  M[i][j] = A[i][j] / Σ_j A[i][j]
 *   sym:  M[i][j] = A[i][j] / sqrt(d_i * d_j)
 *   sum:  M = A
 *   自环：把 A 换成 Ã = A + I（度也随之 +1）
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildToolbar,
  buildReadout, mkBtn, label, fmt, clamp,
} from '../core.js';
import {
  adjOf, degOf, identity, matrixCellAt, drawEdge, drawNode, circleLayout,
  pickNode, readNodes, readEdges, legendInto,
} from './graph-kit.js';

const DEFAULT_NODES = ['枢纽', '甲', '乙', '丙', '丁'];
/* 枢纽 0 连三个邻居（1,2,3），3 再连 4；叶子们彼此几乎不相连 */
const DEFAULT_EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [3, 4]];
const DEFAULT_X = [1, 0, 0, 0, 1];

const MODES = [
  { value: 'sym', label: '对称归一化' },
  { value: 'row', label: '行归一化' },
  { value: 'sum', label: '普通求和' },
];

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;
  const edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);

  const cfg = {
    mode: MODES.some((m) => m.value === spec.mode) ? spec.mode : 'sym',
    selfLoop: spec.selfLoop !== false,
    layers: 1,
  };

  let x0 = Array.isArray(spec.x) && spec.x.length === n
    ? spec.x.map((v) => Number(v) || 0)
    : DEFAULT_X.slice(0, n);

  const cv = setupCanvas(host, 380);
  const pos = {};
  let posKey = '';
  const hover = { i: -1, cell: null };

  /* ---------- 数学 ---------- */

  function baseAdj() {
    const A = adjOf(n, edges, { directed: false });
    if (!cfg.selfLoop) return A;
    const I = identity(n);
    return A.map((row, i) => row.map((v, j) => (v || I[i][j] ? 1 : 0)));
  }

  /* 这一层实际用的传播矩阵 */
  function propagation() {
    const A = baseAdj();
    if (cfg.mode === 'sum') return A.map((r) => r.slice());
    const deg = degOf(A);
    if (cfg.mode === 'row') {
      return A.map((row, i) => row.map((v) => (deg[i] ? v / deg[i] : 0)));
    }
    return A.map((row, i) => row.map((v, j) => {
      const den = Math.sqrt((deg[i] || 1) * (deg[j] || 1));
      return v ? v / den : 0;
    }));
  }

  function applyOnce(vec, M) {
    return M.map((row) => row.reduce((acc, w, j) => acc + w * vec[j], 0));
  }

  function currentX() {
    const M = propagation();
    let vec = x0.slice();
    for (let k = 0; k < cfg.layers; k += 1) vec = applyOnce(vec, M);
    return vec;
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 640;
    const leftW = narrow ? W - 20 : Math.round(W * 0.50) - 18;
    return {
      narrow,
      graph: { x: 10, y: 34, w: leftW, h: narrow ? Math.round(H * 0.40) : Math.round(H * 0.46) },
      bars: { x: 10, y: narrow ? 34 + Math.round(H * 0.40) + 26 : 34 + Math.round(H * 0.46) + 30, w: leftW, h: narrow ? Math.round(H * 0.24) : Math.round(H * 0.28) },
      matrix: {
        x: narrow ? 12 : Math.round(W * 0.52) + 6,
        y: 44,
        w: narrow ? W - 24 : W - (Math.round(W * 0.52) + 26),
        h: narrow ? Math.round(H * 0.30) : Math.round(H * 0.52),
      },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + n;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    circleLayout(n, rect, 0.34).forEach((p, i) => { pos[i] = p; });
    /* 让枢纽居中：把 0 号搬到质心，其他人保持环上的相对顺序 */
    if (pos[0]) {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      pos[0] = { x: cx, y: cy };
    }
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
    const M = propagation();
    const vec = currentX();
    const mx = Math.max(1e-9, ...vec.map((v) => Math.abs(v)));

    drawGraph(ctx, r.graph, vec, mx, C);
    drawBars(ctx, r.bars, vec, mx, C);
    drawMatrix(ctx, r.matrix, M, C);

    label(ctx, '矩阵 ＝ 这一层真正用的传播算子；向量 ＝ 聚合后的新特征',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, vec, mx, C) {
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const hot = hover.i >= 0 && (hover.i === u || hover.i === v);
      const cellHot = hover.cell && ((hover.cell.i === u && hover.cell.j === v)
        || (hover.cell.i === v && hover.cell.j === u));
      drawEdge(ctx, pos[u], 16, pos[v], 16,
        hot || cellHot ? C.accent2 : C.axis, hot || cellHot ? 2.8 : 1.6, {});
    });
    nodes.forEach((nm, i) => {
      const hot = hover.i === i;
      const t = Math.abs(vec[i]) / mx;
      drawNode(ctx, pos[i], 15 + 7 * t, C, {
        text: nm,
        sub: fmt(vec[i], 2),
        stroke: hot ? C.accent2 : C.named('teal'),
        lineWidth: hot ? 3 : 1.8,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: C.named('teal'),
        fillAlpha: 0.12 + 0.6 * t,
      });
    });
    const deg = degOf(baseAdj());
    label(ctx, '圆大小 = 新特征大小；度依次为 ' + deg.join(' / '),
      rect.x + 2, rect.y + rect.h + 13, C.grid, { size: 9.5 });
  }

  function drawBars(ctx, rect, vec, mx, C) {
    label(ctx, '第 ' + cfg.layers + ' 层后的特征向量',
      rect.x + 2, rect.y, C.fg, { size: 10.5, weight: 700 });
    const y0 = rect.y + 14;
    const rowH = Math.max(13, Math.min(24, (rect.h - 16) / Math.max(1, n)));
    const barX = rect.x + 52;
    const barW = Math.max(20, rect.w - 96);
    vec.forEach((v, i) => {
      const y = y0 + i * rowH;
      const hot = hover.i === i;
      label(ctx, nodes[i], rect.x + 2, y + rowH - 6, hot ? C.accent2 : C.fg,
        { size: 9.5, weight: hot ? 700 : 400 });
      ctx.save();
      ctx.fillStyle = hot ? C.accent2 : C.named('teal');
      ctx.globalAlpha = hot ? 0.9 : 0.55;
      ctx.fillRect(barX, y + 2, Math.max(1, (barW * Math.abs(v)) / mx), rowH - 6);
      ctx.restore();
      label(ctx, fmt(v, 3), barX + (barW * Math.abs(v)) / mx + 4, y + rowH - 6,
        hot ? C.accent2 : C.fg, { size: 9 });
    });
  }

  function drawMatrix(ctx, rect, M, C) {
    const size = Math.min(rect.w - 8, rect.h - 34);
    const cell = Math.max(16, Math.floor(size / n));
    const x0 = rect.x + 2;
    const y0 = rect.y + 26;
    label(ctx, MODES.find((m) => m.value === cfg.mode).label
      + (cfg.selfLoop ? '（含自环）' : '（无自环）'),
      rect.x + 2, rect.y + 6, C.fg, { size: 11, weight: 700 });
    /* 列/行标签 */
    for (let i = 0; i < n; i += 1) {
      label(ctx, nodes[i], x0 + 26 + i * cell + cell / 2, y0 - 4, C.axis,
        { size: 8.5, align: 'center' });
      label(ctx, nodes[i], x0 + 22, y0 + i * cell + cell / 2 + 4, C.axis,
        { size: 8.5, align: 'right' });
    }
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const v = M[i][j];
        const hot = hover.cell && hover.cell.i === i && hover.cell.j === j;
        ctx.save();
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 0.6;
        ctx.fillStyle = hot ? C.accent2 : (v > 0 ? C.named('teal') : C.bg);
        ctx.globalAlpha = hot ? 0.9 : (v > 0 ? clamp(0.12 + v * 0.85, 0.08, 0.9) : 1);
        ctx.beginPath();
        ctx.rect(x0 + 26 + j * cell, y0 + i * cell, cell - 1, cell - 1);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        ctx.restore();
        if (v > 0 && cell >= 26) {
          label(ctx, v >= 10 ? Math.round(v) : v.toFixed(2),
            x0 + 26 + j * cell + cell / 2, y0 + i * cell + cell / 2 + 4,
            C.fg, { size: 8, align: 'center' });
        }
      }
    }
    label(ctx, '行 = 收特征的节点，列 = 出特征的节点；整行加起来＝这个节点听了多少人的话',
      rect.x + 2, y0 + n * cell + 16, C.grid, { size: 9 });
    void matrixCellAt;
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 传播算子: '—', 层: '—', '枢纽特征': '—', '叶子特征': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(MODES, cfg.mode, (v) => { cfg.mode = v; cfg.layers = 1; refresh(); }));

  const btnLoop = mkBtn('自环：开');
  const btnLayer = mkBtn('再来一层');
  const btnReset = mkBtn('重置为第一层');
  host.appendChild(buildToolbar(btnLoop, btnLayer, btnReset));

  legendInto(host, [
    [themeColors().named('teal'), '正方格 = 有传播权重'],
    [themeColors().accent2, '悬停/选中的格子与对应边'],
  ]);

  function refresh() {
    const M = propagation();
    const vec = currentX();
    ro.set('传播算子', MODES.find((m) => m.value === cfg.mode).label + (cfg.selfLoop ? ' +自环' : ''));
    ro.set('层', String(cfg.layers));
    ro.set('枢纽特征', fmt(vec[0], 3));
    ro.set('叶子特征', fmt(vec[Math.min(1, n - 1)], 3));
    btnLoop.textContent = '自环：' + (cfg.selfLoop ? '开' : '关');
    void M;
    draw();
  }

  btnLoop.addEventListener('click', () => { cfg.selfLoop = !cfg.selfLoop; cfg.layers = 1; refresh(); });
  btnLayer.addEventListener('click', () => { cfg.layers = clamp(cfg.layers + 1, 1, 8); refresh(); });
  btnReset.addEventListener('click', () => { cfg.layers = 1; refresh(); });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 16);
      if (i >= 0) return { kind: 'node', i };
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') { hover.i = id.i; }
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 16);
      /* 热力图格子：按几何位置反推行列 */
      let cell = null;
      const r = rects();
      const size = Math.min(r.matrix.w - 8, r.matrix.h - 34);
      const cw = Math.max(16, Math.floor(size / n));
      const x0 = r.matrix.x + 2 + 26;
      const y0 = r.matrix.y + 26;
      if (px >= x0 && px < x0 + cw * n && py >= y0 && py < y0 + cw * n) {
        cell = {
          i: clamp(Math.floor((py - y0) / cw), 0, n - 1),
          j: clamp(Math.floor((px - x0) / cw), 0, n - 1),
        };
      }
      const changed = i !== hover.i
        || (!cell !== !hover.cell)
        || (cell && hover.cell && (cell.i !== hover.cell.i || cell.j !== hover.cell.j));
      if (changed) { hover.i = i; hover.cell = cell; refresh(); }
    },
    leave() {
      if (hover.i >= 0 || hover.cell) { hover.i = -1; hover.cell = null; refresh(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

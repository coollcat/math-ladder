/* =========================================================================
 * lab 组件：g53-attention-heat —— 注意力权重从哪来（第 53 章「图注意力」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-attention-heat",
 *     "title": "改特征，热力图当场换亮区",
 *     "nodes": ["A","B","C"],
 *     "edges": [[0,1],[1,2]],
 *     "h": [1, 2, 3] }
 *
 * 字段：nodes / edges（可选）；h 初始一维特征（可选）。
 *
 * 交互：
 *   · 左下每条横条是一个节点的特征，**横向拖动**就改它的 h；
 *   · 右侧是这一层的注意力矩阵 A[i][j]：行 = 收票的节点，列 = 投票的邻居，
 *     每行加起来正好是 1（softmax 给的），格子颜色越深权重越大；
 *   · 「打分方向」两档：a=(1,1) 是「特征越大越有料」；a=(1,−1) 打的是 h_i−h_j，
 *     只有「邻居比自己低」那一侧拿满分，反过来的那一侧被 LeakyReLU 压到两成；
 *   · 「打平特征」「拉高一端」两个预设；
 *   · 「对照 GCN」把同一张图 GCN 的固定行配比叠在下面——它不会随 h 变化。
 *
 * 看什么：h 一动，上排（GAT）的亮格子立刻横移，下排（GCN 对照）纹丝不动。
 *   这就是「固定配比」与「学出来的配比」的差别。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildToolbar,
  buildReadout, mkBtn, label, fmt, clamp,
} from '../core.js';
import {
  adjOf, degOf, circleLayout, pickNode, drawEdge, drawNode, legendInto,
  readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['A', 'B', 'C'];
const DEFAULT_EDGES = [[0, 1], [1, 2]];
const DEFAULT_H = [1, 2, 3];
const LEAK = 0.2;

const DIRECTIONS = [
  { value: 'sum', label: 'a = (1, 1)：越大越有料' },
  { value: 'diff', label: 'a = (1, −1)：只听得进比自己低的' },
];

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;
  const edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);
  let h = Array.isArray(spec.h) && spec.h.length === n
    ? spec.h.map((v) => clamp(Number(v) || 0, 0, 5))
    : DEFAULT_H.slice(0, n);

  const cfg = { dir: spec.direction === 'diff' ? 'diff' : 'sum' };
  const cv = setupCanvas(host, 400);
  const pos = {};
  let posKey = '';
  const hover = { i: -1, cell: null, drag: -1 };
  let barRect = null;

  /* ---------- 数学 ---------- */

  function neighbours(i) {
    const list = [i];                       /* 自环永远在邻居集合里 */
    edges.forEach(([u, v]) => {
      if (u === i && !list.includes(v)) list.push(v);
      if (v === i && !list.includes(u)) list.push(u);
    });
    return list;
  }

  function leaky(v) { return v > 0 ? v : LEAK * v; }

  function score(i, j) {
    const a1 = 1;
    const a2 = cfg.dir === 'diff' ? -1 : 1;
    return leaky(a1 * h[i] + a2 * h[j]);
  }

  /* 一行 softmax：注意力系数 */
  function attentionRow(i) {
    const list = neighbours(i);
    const exps = list.map((j) => Math.exp(score(i, j)));
    const total = exps.reduce((a, b) => a + b, 0) || 1;
    const row = new Array(n).fill(0);
    list.forEach((j, k) => { row[j] = exps[k] / total; });
    return row;
  }

  function attentionMatrix() {
    return Array.from({ length: n }, (_, i) => attentionRow(i));
  }

  /* GCN 对照：固定权重 1/sqrt(d_i d_j)，**不做行归一化**——
     这样 A 行读出来就是课程例题里那个 (0.500, 0.408)，自身比邻居还大。 */
  function gcnMatrix() {
    const A = adjOf(n, edges, { directed: false });
    /* 加自环 */
    const At = A.map((row, i) => row.map((v, j) => (v || (i === j) ? 1 : 0)));
    const deg = degOf(At);
    return At.map((row, i) => row.map((v, j) => (v ? 1 / Math.sqrt((deg[i] || 1) * (deg[j] || 1)) : 0)));
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 640;
    const leftW = narrow ? W - 20 : Math.round(W * 0.46) - 16;
    return {
      narrow,
      graph: { x: 10, y: 32, w: leftW, h: narrow ? Math.round(H * 0.30) : Math.round(H * 0.34) },
      bars: {
        x: 10,
        y: narrow ? 32 + Math.round(H * 0.30) + 26 : 32 + Math.round(H * 0.34) + 30,
        w: leftW,
        h: narrow ? Math.round(H * 0.22) : Math.round(H * 0.26),
      },
      heat: {
        x: narrow ? 12 : Math.round(W * 0.48) + 6,
        y: 40,
        w: narrow ? W - 24 : W - (Math.round(W * 0.48) + 26),
        h: narrow ? Math.round(H * 0.40) : Math.round(H * 0.62),
      },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + n;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    circleLayout(n, rect, 0.30).forEach((p, i) => { pos[i] = p; });
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
    const att = attentionMatrix();
    drawGraph(ctx, r.graph, att, C);
    drawBars(ctx, r.bars, C);
    drawHeat(ctx, r.heat, att, gcnMatrix(), C);

    label(ctx, '拖动下方横条改特征；右侧热力图是每一步重算的，不是画死的图',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, att, C) {
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const w = (att[u][v] + att[v][u]) / 2;
      const hot = hover.i >= 0 && (hover.i === u || hover.i === v);
      drawEdge(ctx, pos[u], 17, pos[v], 17,
        hot ? C.accent2 : C.named('purple'),
        hot ? 3 : 1.2 + 4 * w, {});
    });
    nodes.forEach((nm, i) => {
      const hot = hover.i === i;
      drawNode(ctx, pos[i], 17, C, {
        text: nm,
        sub: 'h=' + fmt(h[i], 1),
        stroke: hot ? C.accent2 : C.named('purple'),
        lineWidth: hot ? 3 : 1.9,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: C.named('purple'),
        fillAlpha: 0.2,
      });
    });
    label(ctx, '边越粗 = 这对邻居之间的注意力越大（双向平均）',
      rect.x + 2, rect.y + rect.h + 13, C.grid, { size: 9.5 });
  }

  function drawBars(ctx, rect, C) {
    barRect = { x: rect.x, y: rect.y + 16, w: rect.w, h: rect.h - 16, rowH: 0 };
    label(ctx, '特征 h（横向拖动改值）', rect.x + 2, rect.y, C.fg, { size: 10.5, weight: 700 });
    const rowH = Math.max(16, Math.min(30, (rect.h - 16) / Math.max(1, n)));
    barRect.rowH = rowH;
    const trackX = rect.x + 44;
    const trackW = Math.max(40, rect.w - 90);
    nodes.forEach((nm, i) => {
      const y = rect.y + 16 + i * rowH;
      const hot = hover.i === i || hover.drag === i;
      label(ctx, nm, rect.x + 2, y + rowH - 8, hot ? C.accent2 : C.fg,
        { size: 10, weight: hot ? 700 : 400 });
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(trackX, y + rowH / 2);
      ctx.lineTo(trackX + trackW, y + rowH / 2);
      ctx.stroke();
      ctx.restore();
      const kx = trackX + (clamp(h[i], 0, 5) / 5) * trackW;
      ctx.save();
      ctx.fillStyle = hot ? C.accent2 : C.named('purple');
      ctx.beginPath();
      ctx.arc(kx, y + rowH / 2, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(ctx, fmt(h[i], 2), trackX + trackW + 8, y + rowH - 8,
        hot ? C.accent2 : C.grid, { size: 9 });
    });
  }

  function drawHeat(ctx, rect, att, gcn, C) {
    const cellMax = Math.min(rect.w * 0.55, (rect.h - 60) / 2);
    const cell = Math.max(20, Math.floor(cellMax / Math.max(1, n)));
    const x0 = rect.x + 30;
    let y0 = rect.y + 26;

    const paint = (M, title, note) => {
      label(ctx, title, rect.x + 2, y0 - 10, C.fg, { size: 10.5, weight: 700 });
      for (let i = 0; i < n; i += 1) {
        label(ctx, nodes[i], x0, y0 + i * cell + cell / 2 + 4, C.axis, { size: 9, align: 'right' });
        for (let j = 0; j < n; j += 1) {
          const v = M[i][j];
          const hot = hover.cell && hover.cell.i === i && hover.cell.j === j;
          ctx.save();
          ctx.fillStyle = hot ? C.accent2 : (v > 0 ? C.named('purple') : C.bg);
          ctx.globalAlpha = v > 0 ? clamp(0.10 + v * 0.9, 0.1, 0.95) : 1;
          ctx.beginPath();
          ctx.rect(x0 + 4 + j * cell, y0 + i * cell, cell - 1, cell - 1);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = C.grid;
          ctx.lineWidth = 0.7;
          ctx.stroke();
          ctx.restore();
          if (v > 0.0005) {
            label(ctx, v.toFixed(2), x0 + 4 + j * cell + cell / 2, y0 + i * cell + cell / 2 + 4,
              v > 0.45 ? C.bg : C.fg, { size: 8.5, align: 'center' });
          }
        }
      }
      /* 列标签 */
      for (let j = 0; j < n; j += 1) {
        label(ctx, nodes[j], x0 + 4 + j * cell + cell / 2, y0 - 1, C.axis,
          { size: 8.5, align: 'center' });
      }
      label(ctx, note, rect.x + 2, y0 + n * cell + 14, C.grid, { size: 9 });
      y0 += n * cell + 32;
    };

    paint(att, 'GAT：学出来的注意力（每行和 = 1）', '行 = 收票的节点，列 = 投票的邻居');
    paint(gcn, 'GCN 对照：固定 1/√(dᵢdⱼ)，不做行归一化', '这些数字完全不看 h，改特征它一格都不动');
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 'A 行配比': '—', 'B 行配比': '—', '特征': '—', 打分行: '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(DIRECTIONS, cfg.dir, (v) => { cfg.dir = v; refresh(); }));

  const btnFlat = mkBtn('把特征拉平');
  const btnRamp = mkBtn('拉高一端（1,2,3…)');
  const btnReset = mkBtn('回到例题特征');
  host.appendChild(buildToolbar(btnFlat, btnRamp, btnReset));

  legendInto(host, [
    [themeColors().named('purple'), '注意力权重 / 特征条'],
    [themeColors().accent2, '悬停或正在拖动的目标'],
  ]);

  function refresh() {
    const att = attentionMatrix();
    /* 只列非零项：A 行只有「自己」和 B 两个数，写成 [0.269 / 0.731] 才对得上例题 */
    const rowA = att[0].filter((v) => v > 0).map((v) => v.toFixed(3)).join(' / ');
    const rowB = att[Math.min(1, n - 1)].filter((v) => v > 0).map((v) => v.toFixed(3)).join(' / ');
    ro.set('A 行配比', rowA);
    ro.set('B 行配比', rowB);
    ro.set('特征', h.map((v) => fmt(v, 1)).join(' / '));
    ro.set('打分行', cfg.dir === 'diff' ? 'a = (1, −1)' : 'a = (1, 1)');
    draw();
  }

  btnFlat.addEventListener('click', () => { h = new Array(n).fill(1); refresh(); });
  btnRamp.addEventListener('click', () => { h = nodes.map((_, i) => i + 1); refresh(); });
  btnReset.addEventListener('click', () => { h = DEFAULT_H.slice(0, n); refresh(); });

  /* ---------- 指针 ---------- */

  function pickBar(px, py) {
    const b = barRect;
    if (!b) return -1;
    if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) return -1;
    const k = Math.floor((py - b.y) / b.rowH);
    return k >= 0 && k < n ? k : -1;
  }

  function setFromX(i, px) {
    const b = barRect;
    if (!b) return;
    const trackX = b.x + 44;
    const trackW = Math.max(40, b.w - 90);
    h[i] = clamp(Math.round(((px - trackX) / trackW) * 5 * 100) / 100, 0, 5);
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      const bi = pickBar(px, py);
      if (bi >= 0) return { kind: 'bar', i: bi };
      const i = pickNode(Object.values(pos), px, py, 17);
      if (i >= 0) return { kind: 'node', i };
      return null;
    },
    down(id) {
      if (id && id.kind === 'bar') { hover.drag = id.i; hover.i = id.i; }
      else if (id && id.kind === 'node') { hover.i = id.i; }
      refresh();
    },
    move(id, px, py) {
      if (hover.drag >= 0) { setFromX(hover.drag, px); refresh(); }
      else if (id && id.kind === 'node' && pos[id.i]) {
        /* 竖直拖动节点 = 直接改它的特征（高度就是 h） */
        const g = rects().graph;
        const t = 1 - clamp((py - g.y) / Math.max(1, g.h), 0, 1);
        h[id.i] = Math.round(t * 5 * 100) / 100;
        refresh();
      }
    },
    up() { hover.drag = -1; },
    hover(px, py) {
      const bi = pickBar(px, py);
      const ni = pickNode(Object.values(pos), px, py, 17);
      const next = bi >= 0 ? bi : ni;
      if (next !== hover.i) { hover.i = next; refresh(); }
    },
    leave() {
      if (hover.i >= 0 || hover.cell) { hover.i = -1; hover.cell = null; refresh(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

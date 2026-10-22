/* =========================================================================
 * lab 组件：g53-smoothing-layers —— 层数一加，节点特征就糊成一片（第 53 章「多层 GNN 与过平滑」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-smoothing-layers",
 *     "title": "层数越多，节点还分得清吗",
 *     "h": [1, 2, 3],
 *     "nodes": ["A","B","C"] }
 *
 * 字段：nodes / edges（可选，默认链形 A–B–C）；h 初始特征（可选）。
 *
 * 交互：
 *   · 「加一层」/「减一层」：每层做一次「含自环的普通平均」H ← S H；
 *   · 「换一组特征」：换掉初始值，看收敛到的是不是同一个方向；
 *   · 「打乱初始分配」：不换图，只把初始特征重新分配，验证「极限与起点无关」；
 *   · 右上折线 = 每一层的极差（max − min），右下折线 = 相邻两层的成对差范数。
 *
 * 看什么：极差一路往下掉、成对差一路往下掉，两条曲线都是「越深越像」。
 *   第 6 层时三位数已经挤在一起——这时候再加层，网络分不出 A 和 C 了，
 *   这就是过平滑：深度不再是免费的。
 *
 * 数学口径：
 *   S = D̃⁻¹Ã（含自环的行归一化），H⁽ᵏ⁾ = Sᵏ H⁽⁰⁾
 *   极差 = max H⁽ᵏ⁾ − min H⁽ᵏ⁾
 *   smoothness = (1/n) Σ_v |h_v⁽ᵏ⁾ − h_v⁽ᵏ⁻¹⁾|
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, fmt, clamp,
} from '../core.js';
import {
  adjOf, circleLayout, pickNode, drawEdge, drawNode, legendInto,
  readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['A', 'B', 'C'];
const DEFAULT_EDGES = [[0, 1], [1, 2]];
const DEFAULT_H = [1, 2, 3];
const MAX_LAYERS = 10;

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;
  const edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);

  let h0 = Array.isArray(spec.h) && spec.h.length === n
    ? spec.h.map((v) => Number(v) || 0)
    : DEFAULT_H.slice(0, n);

  const cv = setupCanvas(host, 380);
  const pos = {};
  let posKey = '';
  const hover = { i: -1 };

  /* 每一层的快照：layers[k] = 第 k 层的特征（k=0 是初始值） */
  let layers = [];
  let layer = 0;

  /* ---------- 数学 ---------- */

  /* 含自环的行归一化平均：每个节点取自己 + 邻居的算术平均 */
  function step(vec) {
    const A = adjOf(n, edges, { directed: false });
    return vec.map((_, i) => {
      let sum = vec[i];
      let cnt = 1;
      for (let j = 0; j < n; j += 1) {
        if (A[i][j] && j !== i) { sum += vec[j]; cnt += 1; }
      }
      return sum / cnt;
    });
  }

  function rebuild() {
    layers = [h0.slice()];
    for (let k = 1; k <= MAX_LAYERS; k += 1) layers.push(step(layers[k - 1]));
  }

  function rangeOf(vec) {
    return Math.max(...vec) - Math.min(...vec);
  }

  function smoothness(k) {
    if (k <= 0) return NaN;
    const a = layers[k - 1];
    const b = layers[k];
    return a.reduce((acc, v, i) => acc + Math.abs(b[i] - v), 0) / n;
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 640;
    const leftW = narrow ? W - 20 : Math.round(W * 0.46) - 16;
    return {
      narrow,
      graph: { x: 10, y: 30, w: leftW, h: narrow ? Math.round(H * 0.32) : Math.round(H * 0.36) },
      bars: {
        x: 10,
        y: narrow ? 30 + Math.round(H * 0.32) + 26 : 30 + Math.round(H * 0.36) + 26,
        w: leftW,
        h: narrow ? Math.round(H * 0.26) : Math.round(H * 0.28),
      },
      charts: {
        x: narrow ? 12 : Math.round(W * 0.48) + 4,
        y: 34,
        w: narrow ? W - 24 : W - (Math.round(W * 0.48) + 24),
        h: narrow ? Math.round(H * 0.42) : Math.round(H * 0.68),
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
    const vec = layers[layer] || h0;
    drawGraph(ctx, r.graph, vec, C);
    drawBars(ctx, r.bars, vec, C);
    drawCharts(ctx, r.charts, C);

    label(ctx, '每加一层 = 再取一次「自己 + 邻居」的平均；极差与成对差就是「还分得清吗」的量化',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, vec, C) {
    const mx = Math.max(1e-9, ...vec.map((v) => Math.abs(v)));
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const hot = hover.i >= 0 && (hover.i === u || hover.i === v);
      drawEdge(ctx, pos[u], 18, pos[v], 18, hot ? C.accent2 : C.axis, hot ? 3 : 1.8, {});
    });
    nodes.forEach((nm, i) => {
      const hot = hover.i === i;
      const t = Math.abs(vec[i]) / mx;
      drawNode(ctx, pos[i], 18, C, {
        text: nm,
        sub: fmt(vec[i], 3),
        stroke: hot ? C.accent2 : C.named('amber'),
        lineWidth: hot ? 3 : 1.9,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: C.named('amber'),
        fillAlpha: 0.12 + 0.62 * t,
      });
    });
    label(ctx, '圆里的数字 = 当前层的特征值',
      rect.x + 2, rect.y + rect.h + 13, C.grid, { size: 9.5 });
  }

  function drawBars(ctx, rect, vec, C) {
    label(ctx, '特征柱（第 ' + layer + ' 层）', rect.x + 2, rect.y, C.fg,
      { size: 10.5, weight: 700 });
    const mx = Math.max(1e-9, ...vec.map((v) => Math.abs(v)));
    const baseY = rect.y + rect.h - 18;
    const usable = rect.h - 34;
    const gap = 6;
    const bw = Math.max(10, (rect.w - 12) / Math.max(1, n) - gap);
    vec.forEach((v, i) => {
      const hot = hover.i === i;
      const x = rect.x + 6 + i * (bw + gap);
      const hgt = Math.max(1, (Math.abs(v) / mx) * usable);
      ctx.save();
      ctx.fillStyle = hot ? C.accent2 : C.named('amber');
      ctx.globalAlpha = hot ? 0.92 : 0.6;
      ctx.fillRect(x, baseY - hgt, bw, hgt);
      ctx.restore();
      label(ctx, nodes[i], x + bw / 2, baseY + 12, C.axis, { size: 9, align: 'center' });
      label(ctx, fmt(v, 2), x + bw / 2, baseY - hgt - 5,
        hot ? C.accent2 : C.fg, { size: 8.5, align: 'center' });
    });
  }

  function drawCharts(ctx, rect, C) {
    const chartH = Math.max(52, Math.floor((rect.h - 60) / 2));
    const plot = (title, values, color, idxNow, yNote, oy) => {
      label(ctx, title, rect.x + 2, rect.y + oy, C.fg, { size: 10.5, weight: 700 });
      const x0 = rect.x + 30;
      const y0 = rect.y + oy + 12;
      const w = Math.max(40, rect.w - 44);
      const mx = Math.max(1e-9, ...values.filter((v) => !Number.isNaN(v)));
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + chartH);
      ctx.lineTo(x0 + w, y0 + chartH);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0, y0 + chartH);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      values.forEach((v, k) => {
        if (Number.isNaN(v)) return;
        const px = x0 + (k / Math.max(1, values.length - 1)) * w;
        const py = y0 + chartH - (v / mx) * chartH;
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
      if (idxNow >= 0 && idxNow < values.length && !Number.isNaN(values[idxNow])) {
        const px = x0 + (idxNow / Math.max(1, values.length - 1)) * w;
        const py = y0 + chartH - (values[idxNow] / mx) * chartH;
        ctx.save();
        ctx.fillStyle = C.accent2;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        label(ctx, fmt(values[idxNow], 4), px + 7, py - 5, C.accent2, { size: 9, weight: 700 });
      }
      label(ctx, yNote, rect.x + 2, y0 + chartH + 13, C.grid, { size: 8.5 });
      return y0 + chartH + 22;
    };

    const ranges = layers.map((v) => rangeOf(v));
    const smooth = layers.map((_, k) => smoothness(k));
    const h1 = plot('极差 max − min（每层）', ranges, C.named('red'), layer,
      '起点 = ' + fmt(ranges[0], 3) + '　第 ' + MAX_LAYERS + ' 层 = '
      + fmt(ranges[Math.min(MAX_LAYERS, ranges.length - 1)], 4), 0);
    plot('成对差 (1/n)Σ|h⁽ᵏ⁾−h⁽ᵏ⁻¹⁾|', smooth, C.named('blue'), layer,
      '第 1 层最大，之后一路衰减', h1 - rect.y + 14);
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 层: '—', 极差: '—', 相邻层变化: '—', 极限方向: '—' });
  host.appendChild(ro.box);

  const btnAdd = mkBtn('加一层');
  const btnSub = mkBtn('减一层');
  const btnSwap = mkBtn('换一组特征');
  const btnShuffle = mkBtn('打乱初始分配');
  const btnReset = mkBtn('回到第 0 层');
  host.appendChild(buildToolbar(btnAdd, btnSub, btnSwap, btnShuffle, btnReset));

  legendInto(host, [
    [themeColors().named('red'), '极差（越小越糊）'],
    [themeColors().named('blue'), '相邻层变化'],
  ]);

  function refresh() {
    const vec = layers[layer] || h0;
    ro.set('层', String(layer) + ' / ' + MAX_LAYERS);
    ro.set('极差', fmt(rangeOf(vec), 4));
    ro.set('相邻层变化', layer > 0 ? fmt(smoothness(layer), 4) : '—');
    const last = layers[layers.length - 1];
    const s = last.reduce((a, b) => a + b, 0) || 1;
    ro.set('极限方向', last.map((v) => fmt(v / s, 3)).join(' : '));
    draw();
  }

  btnAdd.addEventListener('click', () => { layer = clamp(layer + 1, 0, MAX_LAYERS); refresh(); });
  btnSub.addEventListener('click', () => { layer = clamp(layer - 1, 0, MAX_LAYERS); refresh(); });
  btnSwap.addEventListener('click', () => {
    h0 = nodes.map((_, i) => (i === 0 ? 0 : (i + 1) * 2.5));
    rebuild(); layer = Math.min(layer, MAX_LAYERS); refresh();
  });
  btnShuffle.addEventListener('click', () => {
    h0 = h0.slice().reverse();
    rebuild(); refresh();
  });
  btnReset.addEventListener('click', () => { layer = 0; refresh(); });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 18);
      return i >= 0 ? { kind: 'node', i } : null;
    },
    down(id) {
      if (id && id.kind === 'node') hover.i = id.i;
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 18);
      if (i !== hover.i) { hover.i = i; refresh(); }
    },
    leave() {
      if (hover.i >= 0) { hover.i = -1; refresh(); }
    },
  });

  rebuild();
  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

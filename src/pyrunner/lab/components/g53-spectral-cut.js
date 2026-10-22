/* =========================================================================
 * lab 组件：g53-spectral-cut —— 谱分割的「切得值不值」（第 53 章「谱聚类直觉」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-spectral-cut",
 *     "title": "同一张图，四种切法，谁的 Ncut 最小",
 *     "nodes": ["0","1","2","3","4","5"],
 *     "edges": [[0,1],[1,2],[0,2],[3,4],[4,5],[3,5],[2,3]] }
 *
 * 字段：nodes / edges（可选）；cut 可选，初始切点（沿 Fiedler 排序的位置）。
 *
 * 交互（把「切得好不好」变成一个可以手拖的数）：
 *   · 主视图是**按 Fiedler 值排好序**的一列节点，左边低、右边高；
 *     中间那把刀可以拖——刀左侧一组、右侧一组；
 *   · 右边实时给出三个数：切边条数 cut、两组大小、归一化割 Ncut；
 *   · 「按键号切」按钮换成「前一半 / 后一半」这种不看结构的切法，Ncut 立刻变差；
 *   · 「打乱标号」把节点编号重排（图本身不变），验证谱切法不受编号影响，
 *     而按编号切会彻底失效——这就是「谱方法看结构不看标签」。
 *
 * 数学口径：$\mathrm{Ncut}=\mathrm{cut}/\mathrm{vol}(A)+\mathrm{cut}/\mathrm{vol}(B)$，
 *   vol 是组内度数之和。只做二分、穷举所有切点取最小——六节点图上这是精确解，
 *   不是迭代近似，所以读数可以直接当答案核对。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clamp, fmt,
} from '../core.js';
import {
  adjOf, degOf, laplacianOf, jacobiEigen, eigenVector, pickNode,
  drawEdge, drawNode, legendInto, readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['0', '1', '2', '3', '4', '5'];
const DEFAULT_EDGES = [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5], [2, 3]];

export default function render(host, spec) {
  let nodes = readNodes(spec, DEFAULT_NODES);
  let n = nodes.length;
  let edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);

  /* order：节点在「一行」里的排列顺序。默认按 Fiedler 值升序。 */
  let order = [];
  let cut = clamp(Math.round(Number(spec.cut) || 3), 1, n - 1);
  let mode = 'spectral';   /* spectral | indexed */
  let shuffleSeed = 1;

  const cv = setupCanvas(host, 340);
  const pos = {};
  let posKey = '';
  const hover = { i: -1 };
  let stripRect = null;

  /* ---------- 数学 ---------- */

  function spectrum() {
    const A = adjOf(n, edges, { directed: false });
    const L = laplacianOf(A);
    const eig = jacobiEigen(L);
    return { A, L, values: eig.values, vectors: eig.vectors, deg: degOf(A) };
  }

  function fiedlerOrder() {
    const sp = spectrum();
    const vec = eigenVector(sp.vectors, Math.min(1, sp.values.length - 1));
    return vec
      .map((v, i) => ({ i, v }))
      .sort((a, b) => a.v - b.v)
      .map((o) => o.i);
  }

  /* 给定切点位置 k（1..n-1），左组 = order[0..k-1]。
     Ncut = cut/vol(A) + cut/vol(B)，vol 是组内度数之和。 */
  function evaluate(k) {
    const sp = spectrum();
    const A = sp.A;
    const deg = sp.deg;
    const left = new Set(order.slice(0, k));
    let cutEdges = 0;
    edges.forEach(([u, v]) => { if (left.has(u) !== left.has(v)) cutEdges += 1; });
    const volA = [...left].reduce((s, i) => s + deg[i], 0);
    const volB = deg.reduce((s, d, i) => s + (left.has(i) ? 0 : d), 0);
    const ncut = (volA > 0 ? cutEdges / volA : Infinity) + (volB > 0 ? cutEdges / volB : Infinity);
    void A;
    return { k, left, cutEdges, volA, volB, ncut, sizeA: left.size, sizeB: n - left.size };
  }

  function bestCut() {
    let best = null;
    for (let k = 1; k < n; k += 1) {
      const e = evaluate(k);
      if (!best || e.ncut < best.ncut) best = e;
    }
    return best;
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    return {
      narrow,
      graph: { x: 10, y: 26, w: narrow ? W - 20 : Math.round(W * 0.44) - 18, h: narrow ? Math.round(H * 0.46) : H - 56 },
      strip: {
        x: narrow ? 12 : Math.round(W * 0.46),
        y: narrow ? 26 + Math.round(H * 0.46) + 30 : 46,
        w: narrow ? W - 24 : W - Math.round(W * 0.46) - 20,
        h: narrow ? Math.round(H * 0.34) : 116,
      },
    };
  }

  function layoutGraph(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + n;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    /* 两簇摆法：前一半在左、后一半在右，看着像原图 */
    const half = Math.ceil(n / 2);
    for (let i = 0; i < n; i += 1) {
      const leftSide = i < half;
      const idx = leftSide ? i : i - half;
      const cnt = leftSide ? half : n - half;
      const cx = rect.x + (leftSide ? rect.w * 0.28 : rect.w * 0.72);
      const cy = rect.y + rect.h * 0.5;
      const rad = Math.min(rect.w * 0.19, rect.h * 0.36);
      const ang = (idx / Math.max(1, cnt)) * Math.PI * 2 - Math.PI / 2;
      pos[i] = { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad };
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
    layoutGraph(r.graph);
    const ev = evaluate(cut);
    const best = bestCut();

    drawGraph(ctx, r.graph, ev, C);
    drawStrip(ctx, r.strip, ev, best, C);

    label(ctx, mode === 'spectral'
      ? '一行按 Fiedler 值升序排好；竖着的那把刀可以拖'
      : '一行按键号排序——不看结构，切出来的质量差很多',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, ev, C) {
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const isCut = ev.left.has(u) !== ev.left.has(v);
      const hot = hover.i >= 0 && (hover.i === u || hover.i === v);
      drawEdge(ctx, pos[u], 14, pos[v], 14,
        isCut ? C.bad : (hot ? C.accent2 : C.axis), isCut ? 3 : (hot ? 2.4 : 1.5),
        { dash: isCut ? [6, 4] : null });
    });
    nodes.forEach((nm, i) => {
      const inA = ev.left.has(i);
      const hot = hover.i === i;
      drawNode(ctx, pos[i], 14, C, {
        text: nm,
        sub: inA ? 'A' : 'B',
        stroke: hot ? C.accent2 : (inA ? C.named('teal') : C.named('purple')),
        lineWidth: hot ? 2.8 : 1.8,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: inA ? C.named('teal') : C.named('purple'),
        fillAlpha: 0.18,
      });
    });
    label(ctx, '红虚线 = 被切掉的边（' + ev.cutEdges + ' 条）', rect.x + 2, rect.y + rect.h + 14,
      C.bad, { size: 9.5 });
    void rect;
  }

  function drawStrip(ctx, rect, ev, best, C) {
    stripRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h, n };
    label(ctx, mode === 'spectral' ? '按 Fiedler 值排好序的一行' : '按键号排好序的一行',
      rect.x, rect.y - 18, C.fg, { size: 10.5, weight: 700 });

    const cellW = (rect.w - 16) / Math.max(1, n);
    order.forEach((idx, j) => {
      const x = rect.x + 8 + j * cellW;
      const inA = j < cut;
      const hot = hover.i === idx;
      ctx.save();
      ctx.fillStyle = inA ? C.named('teal') : C.named('purple');
      ctx.globalAlpha = hot ? 0.95 : 0.55;
      ctx.fillRect(x + 2, rect.y + 10, cellW - 4, 34);
      ctx.restore();
      label(ctx, nodes[idx], x + cellW / 2, rect.y + 32, C.bg, {
        size: 11, align: 'center', weight: 700,
      });
      label(ctx, mode === 'spectral' ? '#' + idx : '#' + idx, x + cellW / 2, rect.y + 56,
        hot ? C.accent2 : C.grid, { size: 8.5, align: 'center' });
    });

    /* 刀 */
    const kx = rect.x + 8 + cut * cellW;
    ctx.save();
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(kx, rect.y + 4);
    ctx.lineTo(kx, rect.y + 48);
    ctx.stroke();
    ctx.restore();
    label(ctx, '刀', kx + 3, rect.y + 4, C.bad, { size: 9.5, weight: 700 });

    const y = rect.y + 74;
    label(ctx, 'A 组 ' + ev.sizeA + ' 个（vol=' + fmt(ev.volA, 0) + '）　B 组 ' + ev.sizeB
      + ' 个（vol=' + fmt(ev.volB, 0) + '）', rect.x + 4, y, C.fg, { size: 9.5 });
    label(ctx, 'Ncut = ' + fmt(ev.ncut, 3) + '　（cut=' + ev.cutEdges + '）',
      rect.x + 4, y + 16, C.accent, { size: 11, weight: 700 });
    label(ctx, '穷举最优：刀在 ' + best.k + ' 处，Ncut = ' + fmt(best.ncut, 3),
      rect.x + 4, y + 32, Math.abs(ev.ncut - best.ncut) < 1e-6 ? C.ok : C.grid,
      { size: 9.5, weight: Math.abs(ev.ncut - best.ncut) < 1e-6 ? 700 : 400 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 切点: '—', Ncut: '—', 切边: '—', 最优: '—' });
  host.appendChild(ro.box);

  const btnBest = mkBtn('跳到最优切点');
  const btnIndexed = mkBtn('换成按键号切');
  const btnRestore = mkBtn('回到按 Fiedler 切');
  host.appendChild(buildToolbar(btnBest, btnIndexed, btnRestore));

  const btnShuffle = mkBtn('打乱节点标号');
  host.appendChild(buildToolbar(btnShuffle));

  legendInto(host, [
    [themeColors().named('teal'), 'A 组'],
    [themeColors().named('purple'), 'B 组'],
    [themeColors().bad, '被切掉的边 / 那把刀'],
  ]);

  function refresh() {
    if (!order.length || order.length !== n) order = fiedlerOrder();
    const ev = evaluate(cut);
    const best = bestCut();
    ro.set('切点', cut + ' / ' + (n - 1));
    ro.set('Ncut', fmt(ev.ncut, 3));
    ro.set('切边', ev.cutEdges + ' 条');
    ro.set('最优', 'k=' + best.k + ' · ' + fmt(best.ncut, 3));
    draw();
  }

  btnBest.addEventListener('click', () => { cut = bestCut().k; refresh(); });
  btnIndexed.addEventListener('click', () => {
    mode = 'indexed';
    order = Array.from({ length: n }, (_, i) => i);
    refresh();
  });
  btnRestore.addEventListener('click', () => {
    mode = 'spectral';
    order = fiedlerOrder();
    refresh();
  });
  btnShuffle.addEventListener('click', () => {
    /* 只打乱「标号」，图本身（边所代表的连接）不变：
       先按现有 order 记下真实结构，再把编号重排一遍。 */
    shuffleSeed = (shuffleSeed * 1103515245 + 12345) & 0x7fffffff;
    const perm = Array.from({ length: n }, (_, i) => i);
    let s = shuffleSeed;
    for (let i = n - 1; i > 0; i -= 1) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    const inv = new Array(n);
    perm.forEach((p, i) => { inv[p] = i; });
    edges = edges.map(([u, v]) => {
      const a = perm[u];
      const b = perm[v];
      return a < b ? [a, b] : [b, a];
    });
    nodes = perm.map((p) => nodes[p]);
    posKey = '';
    mode = 'spectral';
    order = fiedlerOrder();
    cut = clamp(cut, 1, n - 1);
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 14);
      if (i >= 0) return { kind: 'node', i };
      const sr = stripRect;
      if (sr && py >= sr.y && py <= sr.y + 50 && px >= sr.x && px <= sr.x + sr.w) {
        const cw = (sr.w - 16) / Math.max(1, n);
        return { kind: 'cut', i: clamp(Math.round((px - sr.x - 8) / cw), 1, n - 1) };
      }
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') hover.i = id.i;
      else if (id && id.kind === 'cut') cut = id.i;
      refresh();
    },
    move(id, px) {
      if (!id || id.kind !== 'cut') return;
      const sr = stripRect;
      if (!sr) return;
      const cw = (sr.w - 16) / Math.max(1, n);
      cut = clamp(Math.round((px - sr.x - 8) / cw), 1, n - 1);
      refresh();
    },
    up() {},
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 14);
      if (i !== hover.i) { hover.i = i; refresh(); }
    },
    leave() {
      if (hover.i >= 0) { hover.i = -1; refresh(); }
    },
  });

  order = fiedlerOrder();
  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

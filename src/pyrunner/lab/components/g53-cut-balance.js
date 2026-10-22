/* =========================================================================
 * lab 组件：g53-cut-balance —— 划分评估器：只砍边会发生什么（第 53 章「社区检测」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-cut-balance",
 *     "title": "自己动手分社区：切割、平衡、RatioCut 一起看",
 *     "nodes": ["0","1","2","3","4","5"],
 *     "edges": [[0,1],[1,2],[0,2],[3,4],[4,5],[3,5],[2,3]] }
 *
 * 字段：nodes / edges（可选）；labels 可选，初始组标签（0/1）。
 *
 * 交互（把「划分」变成可以亲手改的对象）：
 *   · 点图上任意节点 → 它在 A/B 两组之间来回跳；
 *   · 右侧实时给出：内部边数、跨组边数（cut）、两组大小、平衡比 min/max、
 *     以及 RatioCut = Σ cut(Cₖ)/|Cₖ|；
 *   · 「全部塞进一组」和「人人自成一组」两个退化按钮：前者的 cut = 0，
 *     后者的 |Cₖ| = 1 让 RatioCut 爆掉——**只优化 cut 会掉进这两个坑**；
 *   · 「用谱切法」把节点按 Fiedler 符号分组，通常是最平衡且切边最少的那种；
 *   · 悬停任一节点高亮它的所有跨组边。
 *
 * 数学口径：
 *   cut(C)   = 跨组边数
 *   balance  = min|Cₖ| / max|Cₖ|
 *   RatioCut = Σₖ cut(Cₖ)/|Cₖ|（两组时就是两项相加，空组记 0）
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clamp, fmt,
} from '../core.js';
import {
  adjOf, degOf, laplacianOf, jacobiEigen, eigenVector, circleLayout, pickNode,
  drawEdge, drawNode, legendInto, readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['0', '1', '2', '3', '4', '5'];
const DEFAULT_EDGES = [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5], [2, 3]];

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;
  const edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);

  /* labels[i] ∈ {0,1}：0 = A 组，1 = B 组。默认给一个「明显该被判错」的初始划分，
     好让学生一上来就想动手改。 */
  let labels = Array.isArray(spec.labels) && spec.labels.length === n
    ? spec.labels.map((x) => (Number(x) ? 1 : 0))
    : nodes.map((_, i) => (i % 2 === 0 ? 0 : 1));

  const cv = setupCanvas(host, 340);
  const pos = {};
  let posKey = '';
  const hover = { i: -1 };

  /* ---------- 数学 ---------- */

  function evaluate(marks) {
    const A = adjOf(n, edges, { directed: false });
    let internal = 0;
    let cut = 0;
    edges.forEach(([u, v]) => {
      if (marks[u] === marks[v]) internal += 1;
      else cut += 1;
    });
    const sizeA = marks.filter((x) => x === 0).length;
    const sizeB = n - sizeA;
    const balance = (sizeA && sizeB) ? Math.min(sizeA, sizeB) / Math.max(sizeA, sizeB) : 0;
    /* RatioCut：切边数除以各组规模，两组各算一项；空组不计 */
    let ratio = 0;
    if (sizeA) ratio += cut / sizeA;
    if (sizeB) ratio += cut / sizeB;
    void A;
    return { internal, cut, sizeA, sizeB, balance, ratio, total: edges.length };
  }

  function spectralLabels() {
    const A = adjOf(n, edges, { directed: false });
    const L = laplacianOf(A);
    const { values, vectors } = jacobiEigen(L);
    const vec = eigenVector(vectors, Math.min(1, values.length - 1));
    return vec.map((v) => (v < 0 ? 0 : 1));
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    return {
      narrow,
      graph: { x: 10, y: 30, w: narrow ? W - 20 : Math.round(W * 0.52) - 18, h: narrow ? Math.round(H * 0.52) : H - 60 },
      panel: {
        x: narrow ? 12 : Math.round(W * 0.54),
        y: narrow ? 30 + Math.round(H * 0.52) + 24 : 36,
        w: narrow ? W - 24 : W - Math.round(W * 0.54) - 20,
        h: narrow ? Math.round(H * 0.36) : H - 66,
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
    const ev = evaluate(labels);
    drawGraph(ctx, r.graph, ev, C);
    drawPanel(ctx, r.panel, ev, C);

    label(ctx, '点节点 = 在 A/B 之间切换；只看 cut 会掉进「全都一组」或「各自一组」两个坑',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, ev, C) {
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const cut = labels[u] !== labels[v];
      const hot = hover.i >= 0 && (hover.i === u || hover.i === v);
      drawEdge(ctx, pos[u], 15, pos[v], 15,
        cut ? C.bad : (hot ? C.accent2 : C.named('teal')),
        cut ? 2.8 : (hot ? 2.6 : 2), { dash: cut ? [6, 4] : null });
    });
    nodes.forEach((nm, i) => {
      const hot = hover.i === i;
      const inA = labels[i] === 0;
      const col = inA ? C.named('teal') : C.named('purple');
      drawNode(ctx, pos[i], 15, C, {
        text: nm,
        sub: inA ? 'A' : 'B',
        stroke: hot ? C.accent2 : col,
        lineWidth: hot ? 3 : 1.9,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: col,
        fillAlpha: 0.22,
      });
    });
    label(ctx, '实线 = 组内边（' + ev.internal + ' 条）　红虚线 = 被切掉的边（' + ev.cut + ' 条）',
      rect.x + 2, rect.y + rect.h + 14, C.fg, { size: 9.5 });
  }

  function drawPanel(ctx, rect, ev, C) {
    let y = rect.y + 4;
    label(ctx, '这个划分长什么样', rect.x, y, C.fg, { size: 11, weight: 700 });
    y += 20;
    const rows = [
      ['内部边', String(ev.internal) + ' / ' + ev.total, C.named('teal')],
      ['跨组边 cut', String(ev.cut), C.bad],
      ['两组规模', 'A=' + ev.sizeA + '　B=' + ev.sizeB, C.fg],
      ['平衡比 min/max', fmt(ev.balance, 3), ev.balance > 0.5 ? C.ok : C.bad],
      ['RatioCut', fmt(ev.ratio, 3), C.accent],
    ];
    rows.forEach(([k, v, col]) => {
      label(ctx, k, rect.x, y, C.axis, { size: 9.5 });
      label(ctx, v, rect.x + Math.min(120, rect.w * 0.44), y, col, { size: 10.5, weight: 700 });
      y += 18;
    });

    y += 6;
    /* 三句话诊断，直接点出这个划分的问题 */
    let verdict;
    let vcol = C.grid;
    if (ev.cut === 0 && (ev.sizeA === 0 || ev.sizeB === 0)) {
      verdict = '全塞进一组：cut = 0，但这不是社区，什么都没分出来';
      vcol = C.bad;
    } else if (ev.sizeA <= 1 || ev.sizeB <= 1) {
      verdict = '有一个组只剩 ≤1 个点：靠牺牲一个孤点把 cut 压小，RatioCut 会惩罚它';
      vcol = C.bad;
    } else if (ev.balance > 0.8 && ev.cut <= 1) {
      verdict = '又平衡、切边又少——这才是像样的划分';
      vcol = C.ok;
    } else if (ev.balance < 0.4) {
      verdict = '两组悬殊：切割可能好看，但把一大半人当成一个社区没有解释力';
      vcol = C.bad;
    } else {
      verdict = '还行，但还有更好的切法';
      vcol = C.grid;
    }
    label(ctx, verdict, rect.x, y, vcol, { size: 9.5, weight: 700 });
    y += 22;

    label(ctx, 'RatioCut = cut/|A| + cut/|B|，所以它同时惩罚切边和失衡',
      rect.x, y, C.grid, { size: 9 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 划分: '—', 切边: '—', 平衡: '—', RatioCut: '—' });
  host.appendChild(ro.box);

  const btnSpectral = mkBtn('用谱切法');
  const btnOne = mkBtn('全部塞进一组');
  const btnSingletons = mkBtn('人人自成一组');
  host.appendChild(buildToolbar(btnSpectral, btnOne, btnSingletons));

  const btnReset = mkBtn('回到初始划分');
  host.appendChild(buildToolbar(btnReset));

  legendInto(host, [
    [themeColors().named('teal'), 'A 组'],
    [themeColors().named('purple'), 'B 组'],
    [themeColors().bad, '被切掉的边'],
  ]);

  function refresh() {
    const ev = evaluate(labels);
    ro.set('划分', 'A=' + ev.sizeA + ' · B=' + ev.sizeB);
    ro.set('切边', ev.cut + ' / ' + ev.total);
    ro.set('平衡', fmt(ev.balance, 3));
    ro.set('RatioCut', fmt(ev.ratio, 3));
    draw();
  }

  btnSpectral.addEventListener('click', () => { labels = spectralLabels(); refresh(); });
  btnOne.addEventListener('click', () => { labels = new Array(n).fill(0); refresh(); });
  btnSingletons.addEventListener('click', () => {
    /* 每人一组：组数超过 2，用 A/B 两色表达不了全部；
       这里只把「除第一个点外全部单独进 B」——cut 变小，但 RatioCut 会被 |C|=1 撑大 */
    labels = new Array(n).fill(1);
    labels[0] = 0;
    refresh();
  });
  btnReset.addEventListener('click', () => {
    labels = nodes.map((_, i) => (i % 2 === 0 ? 0 : 1));
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      return i >= 0 ? { kind: 'node', i } : null;
    },
    down(id) {
      if (id && id.kind === 'node') {
        labels[id.i] = labels[id.i] === 0 ? 1 : 0;
        hover.i = id.i;
      }
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
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

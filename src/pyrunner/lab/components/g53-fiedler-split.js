/* =========================================================================
 * lab 组件：g53-fiedler-split —— Fiedler 向量当横坐标（第 53 章「特征值与谱布局」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-fiedler-split",
 *     "title": "双三角 + 桥：Fiedler 向量把裂缝指出来",
 *     "nodes": ["0","1","2","3","4","5"],
 *     "edges": [[0,1],[1,2],[0,2],[3,4],[4,5],[3,5],[2,3]] }
 *
 * 字段：nodes / edges（可选）；mode 可选 "line"（一维谱布局）| "graph"（原图）。
 *
 * 交互（状态机在「横坐标从哪儿来」上）：
 *   · 分段按钮切换「一维谱布局 / 原图」：一维模式把节点摆到 Fiedler 值的位置，
 *     相连的点自然靠拢，桥两端被拉开——这就是「最便宜的裂缝探测器」；
 *   · 阈值滑块把节点分成两组（q₂ < 阈值 / ≥ 阈值），实时统计切边数与组大小；
 *   · 点特征值条里的一根 → 改用那一个特征向量当横坐标（λ₂ 是 Fiedler）；
 *   · 「拆掉桥」按钮删掉跨两簇的那条边，λ₂ 立刻掉到 0——图断开，
 *     零特征值重数变成 2；
 *   · 节点可拖拽（只在一维模式下有意义：拖动不改数值，松手会弹回原位）。
 *
 * 数值口径：Jacobi 循环分解，残差 1e-12 级；浮点零用 1e-10 判断。
 * 重根附近特征向量方向不唯一——画面里会明说「方向只作结构证据」。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildToolbar,
  buildReadout, buildSliders, mkBtn, label, clamp, fmt,
} from '../core.js';
import {
  adjOf, degOf, laplacianOf, jacobiEigen, eigenVector, circleLayout, pickNode,
  drawEdge, drawNode, legendInto, readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['0', '1', '2', '3', '4', '5'];
const DEFAULT_EDGES = [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5], [2, 3]];

const MODES = [
  { value: 'line', label: '一维谱布局' },
  { value: 'graph', label: '原图' },
];

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;
  let edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);

  const cfg = { mode: MODES.some((m) => m.value === spec.mode) ? spec.mode : 'line' };
  let vecIdx = 1;
  let threshold = 0;

  const cv = setupCanvas(host, 380);
  const pos = {};
  let posKey = '';
  let barRect = null;
  const hover = { kind: null, i: -1, k: -1 };

  /* ---------- 数学 ---------- */

  function spectrum() {
    const A = adjOf(n, edges, { directed: false });
    const L = laplacianOf(A);
    const eig = jacobiEigen(L);
    return { A, L, values: eig.values, vectors: eig.vectors };
  }

  function grouping(vec, thr) {
    const left = [];
    const right = [];
    vec.forEach((v, i) => { (v < thr ? left : right).push(i); });
    const cut = edges.filter(([u, v]) => (vec[u] < thr) !== (vec[v] < thr));
    return { left, right, cut };
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    const plotH = narrow ? Math.round(H * 0.52) : Math.round(H * 0.60);
    return {
      narrow,
      plot: { x: 14, y: 34, w: W - 28, h: plotH },
      bars: { x: 14, y: 34 + plotH + 26, w: W - 28, h: H - plotH - 74 },
    };
  }

  /* 一维谱布局：横坐标 = 该节点在当前特征向量里的分量，纵坐标按符号分两行。
     这不只是好看——相连的点被拉到一起，正是「相似性才是距离」那句话。 */
  function layoutLine(rect, vec) {
    let lo = Math.min(...vec);
    let hi = Math.max(...vec);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pad = 26;
    const groups = grouping(vec, threshold);
    const leftSet = new Set(groups.left);
    vec.forEach((v, i) => {
      pos[i] = {
        x: rect.x + pad + ((v - lo) / (hi - lo)) * (rect.w - pad * 2),
        y: leftSet.has(i) ? rect.y + rect.h * 0.66 : rect.y + rect.h * 0.34,
      };
    });
  }

  function layoutGraph(rect) {
    circleLayout(n, rect, 0.34).forEach((p, i) => { pos[i] = p; });
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
    const sp = spectrum();
    const k = clamp(vecIdx, 0, Math.max(0, sp.values.length - 1));
    const vec = eigenVector(sp.vectors, k);
    if (cfg.mode === 'line') layoutLine(r.plot, vec);
    else layoutGraph(r.plot);
    posKey = cfg.mode;

    const g = grouping(vec, threshold);
    const leftSet = new Set(g.left);
    drawPlot(ctx, r.plot, sp, vec, g, leftSet, C);
    drawBars(ctx, r.bars, sp, k, C);

    label(ctx, '横坐标 = 第 ' + k + ' 个特征向量的分量；相邻的点被拉近，桥两端被推开',
      14, H - 8, C.grid, { size: 10 });
  }

  function drawPlot(ctx, rect, sp, vec, g, leftSet, C) {
    /* 阈值竖线（一维模式下就是真正的切点） */
    if (cfg.mode === 'line') {
      let lo = Math.min(...vec);
      let hi = Math.max(...vec);
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      const pad = 26;
      const x = rect.x + pad + ((threshold - lo) / (hi - lo)) * (rect.w - pad * 2);
      ctx.save();
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x, rect.y + 8);
      ctx.lineTo(x, rect.y + rect.h - 8);
      ctx.stroke();
      ctx.restore();
      label(ctx, '阈值', x + 4, rect.y + 16, C.bad, { size: 9.5 });
      label(ctx, '第 ' + g.left.length + ' 组', rect.x + 4, rect.y + rect.h * 0.66 - 20,
        C.named('teal'), { size: 10, weight: 700 });
      label(ctx, '第 ' + (g.left.length + g.right.length > 0 ? 2 : 2) + ' 组', rect.x + 4,
        rect.y + rect.h * 0.34 - 20, C.named('purple'), { size: 10, weight: 700 });
    }

    const isCut = new Set(g.cut.map(([u, v]) => u + '>' + v));
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const cut = isCut.has(u + '>' + v) || isCut.has(v + '>' + u);
      const hot = (hover.kind === 'node' && (hover.i === u || hover.i === v));
      drawEdge(ctx, pos[u], 14, pos[v], 14,
        cut ? C.bad : (hot ? C.accent2 : C.axis), cut ? 2.8 : (hot ? 2.4 : 1.5),
        { dash: cut ? [5, 3] : null });
    });

    nodes.forEach((nm, i) => {
      const hot = hover.kind === 'node' && hover.i === i;
      const inLeft = leftSet.has(i);
      drawNode(ctx, pos[i], 15, C, {
        text: nm,
        sub: fmt(vec[i], 2),
        stroke: hot ? C.accent2 : (inLeft ? C.named('teal') : C.named('purple')),
        lineWidth: hot ? 2.8 : 1.8,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: inLeft ? C.named('teal') : C.named('purple'),
        fillAlpha: 0.16,
      });
    });

    label(ctx, '实线 = 组内边　红色虚线 = 切边（' + g.cut.length + ' 条）',
      rect.x + 4, rect.y + rect.h + 16, C.grid, { size: 9.5 });
  }

  function drawBars(ctx, rect, sp, k, C) {
    const vals = sp.values;
    const maxV = Math.max(1e-9, ...vals.map((v) => Math.abs(v)));
    barRect = { x: rect.x, y: rect.y + 14, w: rect.w, rowH: 0, n: vals.length };
    label(ctx, 'L 的全部特征值（升序）——点一根改用它的特征向量当横坐标',
      rect.x, rect.y + 6, C.fg, { size: 10.5, weight: 700 });
    const n2 = vals.length;
    const colW = Math.min(46, (rect.w - 20) / n2);
    const zeroEps = 1e-10;
    let zeros = 0;
    vals.forEach((v) => { if (Math.abs(v) < zeroEps) zeros += 1; });
    vals.forEach((v, i) => {
      const x = rect.x + i * colW;
      const h = Math.max(2, (Math.abs(v) / maxV) * Math.max(10, rect.h - 30));
      const hot = i === k || hover.k === i;
      ctx.save();
      ctx.fillStyle = Math.abs(v) < zeroEps ? C.named('green') : (hot ? C.accent2 : C.accent);
      ctx.globalAlpha = hot ? 0.95 : 0.75;
      ctx.fillRect(x + 2, rect.y + rect.h - 8 - h, colW - 4, h);
      ctx.restore();
      label(ctx, fmt(v, 2), x + colW / 2, rect.y + rect.h - 10 - h - 3,
        hot ? C.accent2 : C.fg, { size: 8.5, align: 'center' });
      label(ctx, 'λ' + (i + 1), x + colW / 2, rect.y + rect.h + 2, C.axis, { size: 8.5, align: 'center' });
    });
    barRect.y = rect.y + 14;
    barRect.rowH = colW;
    label(ctx, '近零特征值 ' + zeros + ' 个 → 图有 ' + zeros + ' 个连通分量',
      rect.x + vals.length * colW + 8, rect.y + rect.h - 2, zeros > 1 ? C.bad : C.ok,
      { size: 9.5, weight: 700 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 'λ₂': '—', 分组: '—', 切边: '—', '零特征值': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(MODES, cfg.mode, (v) => { cfg.mode = v; draw(); }));

  const sliders = buildSliders([
    {
      name: 'threshold', label: '分组阈值', min: -1, max: 1, step: 0.01, value: threshold, fmt: 2,
    },
  ], (st) => { threshold = st.threshold; refresh(); });
  host.appendChild(sliders.box);

  const btnBridge = mkBtn('拆掉桥');
  const btnRestore = mkBtn('恢复桥');
  host.appendChild(buildToolbar(btnBridge, btnRestore));

  legendInto(host, [
    [themeColors().named('teal'), '负侧分组'],
    [themeColors().named('purple'), '正侧分组'],
    [themeColors().bad, '切边（跨组）'],
  ]);

  function refresh() {
    const sp = spectrum();
    const k = clamp(vecIdx, 0, Math.max(0, sp.values.length - 1));
    const vec = eigenVector(sp.vectors, k);
    const g = grouping(vec, threshold);
    let zeros = 0;
    sp.values.forEach((v) => { if (Math.abs(v) < 1e-10) zeros += 1; });
    ro.set('λ₂', sp.values.length > 1 ? fmt(sp.values[1], 4) : '—');
    ro.set('分组', g.left.length + ' / ' + g.right.length);
    ro.set('切边', g.cut.length + ' 条');
    ro.set('零特征值', zeros + ' 个（分量数）');
    draw();
  }

  btnBridge.addEventListener('click', () => {
    /* 拆掉「两端分属两簇」的那条边：找一条删掉后度数都还 > 0 的切割边 */
    const sp = spectrum();
    const vec = eigenVector(sp.vectors, clamp(vecIdx, 0, sp.values.length - 1));
    const g = grouping(vec, threshold);
    const deg = degOf(adjOf(n, edges, { directed: false }));
    const pick = g.cut.find(([u, v]) => deg[u] > 1 && deg[v] > 1);
    if (pick) edges = edges.filter(([u, v]) => !(u === pick[0] && v === pick[1]) && !(u === pick[1] && v === pick[0]));
    refresh();
  });
  btnRestore.addEventListener('click', () => {
    edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      if (i >= 0) return { kind: 'node', i };
      const br = barRect;
      if (br && py >= br.y && py <= br.y + 80 && px >= br.x && px < br.x + br.w) {
        const k = clamp(Math.floor((px - br.x) / br.rowH), 0, br.n - 1);
        return { kind: 'bar', k };
      }
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') { hover.kind = 'node'; hover.i = id.i; }
      else if (id && id.kind === 'bar') { vecIdx = id.k; hover.kind = null; }
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      let next = { kind: null, i: -1, k: -1 };
      if (i >= 0) next = { kind: 'node', i, k: -1 };
      else {
        const br = barRect;
        if (br && py >= br.y && py <= br.y + 80 && px >= br.x && px < br.x + br.w) {
          next = { kind: 'bar', i: -1, k: clamp(Math.floor((px - br.x) / br.rowH), 0, br.n - 1) };
        }
      }
      if (next.kind !== hover.kind || next.i !== hover.i || next.k !== hover.k) {
        hover.kind = next.kind;
        hover.i = next.i;
        hover.k = next.k;
        refresh();
      }
    },
    leave() {
      if (hover.kind) { hover.kind = null; hover.i = -1; hover.k = -1; refresh(); }
    },
  });

  void posKey;
  refresh();
  cv.redraw = () => { refresh(); };
  return {
    slidersBox: sliders.box,
    destroy() { cv.redraw = null; },
  };
}

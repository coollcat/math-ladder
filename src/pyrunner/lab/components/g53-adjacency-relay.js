/* =========================================================================
 * lab 组件：g53-adjacency-relay —— 边表 / 图 / 邻接矩阵三视图联动（第 53 章「邻接矩阵」）
 * -------------------------------------------------------------------------
 * 用法：
 *   ```lab
 *   { "type": "g53-adjacency-relay",
 *     "title": "同一张图的三种写法",
 *     "nodes": ["A","B","C","D"],
 *     "edges": [[0,1],[0,2],[1,3]],
 *     "directed": false,
 *     "mode": "undirected" }
 *   ```
 *
 * 字段：
 *   nodes / edges   节点名与边表（edges 第 3 项可给权重）
 *   directed        初始是否有向（分段按钮可现场切换）
 *   mode            "undirected" | "directed" | "broken"（初始模式）
 *                   broken = 「只写一半」的错误示范：行里有的、列里没有
 *   seedLayout     可选，[[x,y],…] 归一化坐标（0..1），给初始布局一个稳定偏心
 *
 * 交互：
 *   · 按住任意节点在画布上拖动，边实时跟随（拖拽不改变任何数值）。
 *   · 悬停/点选矩阵格子 → 图上对应那条有向边加粗描边；悬停节点 → 矩阵对应行列描边。
 *     点过之后焦点会锁住（触屏没有 hover，靠这个走）。
 *   · 「添加/删除一条边」按钮在随机位置增删一条边，三视图同步更新。
 *   · 分段按钮在「无向 / 有向 / 只写一半（错误示范）」之间切换：
 *     错误示范会把每一行的一半非零格抹掉，演示「矩阵悄悄变成有向图」。
 *
 * 看什么：右上角的「1 的个数」；无向图应当是边数的两倍，
 *   切成 broken 之后这个数会对不上——这正是课程里那句「删除 A[j][i]=1，
 *   矩阵会悄悄变成有向图」的可视版本。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildToolbar,
  buildReadout, mkBtn, label, clamp, fmt, el,
} from '../core.js';
import {
  adjOf, degOf, circleLayout, pickNode, drawEdge, drawNode,
  drawMatrixInto, matrixCellAt, legendInto, readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['A', 'B', 'C', 'D'];
const DEFAULT_EDGES = [[0, 1, 1], [0, 2, 1], [1, 3, 1]];

const MODES = [
  { value: 'undirected', label: '无向（对称）' },
  { value: 'directed', label: '有向（单格）' },
  { value: 'broken', label: '只写一半（错误示范）' },
];

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;
  const edges = readEdges(spec, n, DEFAULT_EDGES);

  const cfg = {
    mode: MODES.some((m) => m.value === spec.mode) ? spec.mode : 'undirected',
  };

  const cv = setupCanvas(host, 340);

  const pos = {};
  let posKey = '';
  let mxRect = null;
  let dragNode = -1;
  /* 焦点：hover 优先显示，没有 hover 时显示 locked（点选）。node=-1 表示无焦点 */
  const hover = { node: -1, kind: null, i: -1, j: -1 };
  const locked = { node: -1, kind: null, i: -1, j: -1 };

  function focusNow() {
    return hover.kind ? hover : locked;
  }

  /* ---------- 三视图的共同数据源 ---------- */

  /* 按当前模式造出「要画的邻接矩阵」。
     broken 模式：每条边只在起点行写 1，且只写一半（偶数索引的边漏掉反向格）
     —— 这正是把无向图错写成有向图时矩阵的样子。 */
  function buildMatrix() {
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    if (cfg.mode === 'undirected') {
      edges.forEach(([u, v, w]) => {
        A[u][v] = w;
        if (u !== v) A[v][u] = w;
      });
    } else if (cfg.mode === 'directed') {
      edges.forEach(([u, v, w]) => { A[u][v] = w; });
    } else {
      edges.forEach(([u, v, w], k) => {
        A[u][v] = w;
        /* 一半的边「忘了补反向格」：只有偶数位记得补 */
        if (u !== v && k % 2 === 1) A[v][u] = w;
      });
    }
    return A;
  }

  /* ---------- 布局 ---------- */

  function layoutRects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    if (narrow) {
      const gh = Math.round(H * 0.52);
      const graph = { x: 6, y: 28, w: W - 12, h: gh };
      const size = Math.min(W * 0.60, H - gh - 60);
      return {
        narrow,
        graph,
        matrix: { x: 8, y: 28 + gh + 30, w: size, h: size },
        text: { x: size + 24, y: 28 + gh + 30, w: W - size - 34, h: size },
      };
    }
    const graph = { x: 8, y: 28, w: Math.round(W * 0.52) - 16, h: H - 52 };
    const rightX = Math.round(W * 0.54);
    const size = Math.min(W - rightX - 20, H - 92);
    return {
      narrow,
      graph,
      matrix: { x: rightX, y: 44, w: size, h: size },
      text: { x: rightX + size + 14, y: 44, w: W - rightX - size - 20, h: size },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    const base = circleLayout(n, rect, 0.34);
    /* seedLayout 只影响初始偏心，不改「重置布局」的确定性 */
    const seed = Array.isArray(spec.seedLayout) ? spec.seedLayout : null;
    base.forEach((p, i) => {
      const s = seed && Array.isArray(seed[i]) ? seed[i] : null;
      pos[i] = s
        ? {
          x: clamp(rect.x + Number(s[0]) * rect.w, rect.x + 22, rect.x + rect.w - 22),
          y: clamp(rect.y + Number(s[1]) * rect.h, rect.y + 26, rect.y + rect.h - 24),
        }
        : p;
    });
  }

  function resetLayout() {
    posKey = '';
    ensurePos(layoutRects().graph);
    draw();
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

    const rects = layoutRects();
    ensurePos(rects.graph);
    const A = buildMatrix();
    const deg = degOf(A);
    const f = focusNow();

    drawGraph(ctx, rects.graph, A, deg, C, f);
    const mr = drawMatrixInto(ctx, rects.matrix, A, {
      C,
      labels: nodes,
      title: '邻接矩阵（行 = 起点，列 = 终点）',
      hoverRow: f.kind === 'cell' ? f.i : (f.kind === 'node' ? f.node : -1),
      hoverCol: f.kind === 'cell' ? f.j : (f.kind === 'node' ? f.node : -1),
      focus: f.kind === 'cell' ? { i: f.i, j: f.j } : null,
      rowSums: deg,
      small: rects.narrow,
    });
    mxRect = mr;
    drawSideText(ctx, rects.text, A, deg, C, f);

    const hint = cfg.mode === 'broken'
      ? '错误示范：一半的边只写了起点格——行和还算得出度，矩阵却不对称了'
      : cfg.mode === 'directed'
        ? '有向：每格只记录一条单向关系，行列不再互相搬运'
        : '无向：每条边写两格，所以「1 的个数」= 边数 × 2';
    label(ctx, hint, 8, H - 10, C.grid, { size: 10 });
  }

  function edgeHot(f, u, v) {
    if (!f.kind) return false;
    if (f.kind === 'node') return u === f.node || v === f.node;
    return f.i === u && f.j === v;
  }

  function drawGraph(ctx, rect, A, deg, C, f) {
    const inMatrix = (u, v) => A[u] && A[u][v] > 0;
    /* 先画所有「矩阵里为 0」的反向虚影：无向图里看不见，有向图里正好没有 */
    edges.forEach(([u, v, w]) => {
      const rev = inMatrix(v, u);
      const hot = edgeHot(f, u, v);
      const col = hot ? C.accent2 : (cfg.mode === 'broken' && !rev ? C.bad : C.axis);
      const wide = hot ? 3 : (1.2 + Math.min(2.2, Math.log2(1 + w)));
      drawEdge(ctx, pos[u], 15, pos[v], 15, col, wide, {
        arrow: cfg.mode !== 'undirected',
        head: 8,
        dash: cfg.mode === 'broken' && !rev ? [5, 3] : null,
      });
      /* 无向双写时，反向那条不该再画一次箭头；用权重大小把标签摆在中点 */
      if (Math.abs(w - 1) > 1e-9) {
        const mx = (pos[u].x + pos[v].x) / 2;
        const my = (pos[u].y + pos[v].y) / 2;
        label(ctx, fmt(w, 2), mx + 6, my - 4, hot ? C.accent2 : C.grid, { size: 9 });
      }
    });

    nodes.forEach((nm, i) => {
      const hot = f.kind === 'node' ? f.node === i : (f.kind === 'cell' && (f.i === i || f.j === i));
      drawNode(ctx, pos[i], 15, C, {
        text: nm,
        sub: 'd=' + fmt(deg[i], 2),
        stroke: hot ? C.accent2 : C.axis,
        lineWidth: hot ? 2.6 : 1.6,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: C.accent,
        fillAlpha: 0.14,
      });
    });
  }

  function drawSideText(ctx, rect, A, deg, C, f) {
    const ones = A.reduce((s, row) => s + row.filter((v) => Math.abs(v) > 1e-12).length, 0);
    const asym = A.some((row, i) => row.some((v, j) => Math.abs(v - A[j][i]) > 1e-12));
    const lines = [
      ['边数（边表）', String(edges.length)],
      ['矩阵里非零格', String(ones)],
      ['非零格 ÷ 边数', edges.length ? fmt(ones / edges.length, 2) : '—'],
      ['矩阵对称？', asym ? '否 —— 这其实是有向图' : '是'],
      ['总度数 Σd', fmt(deg.reduce((a, b) => a + b, 0), 2)],
    ];
    let y = rect.y + 6;
    lines.forEach(([k, v]) => {
      label(ctx, k, rect.x, y, C.axis, { size: 10 });
      label(ctx, v, rect.x, y + 15, k === '矩阵对称？' && asym ? C.bad : C.fg, {
        size: 11.5, weight: 700,
      });
      y += 36;
    });
    if (f.kind === 'cell') {
      label(ctx, '焦点 (' + nodes[f.i] + '→' + nodes[f.j] + ')', rect.x, y + 4, C.accent2, {
        size: 10, weight: 700,
      });
      label(ctx, 'A[' + f.i + '][' + f.j + '] = ' + fmt(A[f.i][f.j], 2), rect.x, y + 19, C.fg, { size: 10 });
    } else if (f.kind === 'node') {
      label(ctx, '焦点 ' + nodes[f.node] + ' 的整行 / 整列', rect.x, y + 4, C.accent2, {
        size: 10, weight: 700,
      });
      label(ctx, '行和 = 度 = ' + fmt(deg[f.node], 2), rect.x, y + 19, C.fg, { size: 10 });
    } else {
      label(ctx, '悬停矩阵格子或节点查看对应关系', rect.x, y + 4, C.grid, { size: 10 });
    }
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 模式: '—', 焦点: '—', '矩阵状态': '—' });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(MODES, cfg.mode, (v) => {
    cfg.mode = v;
    refresh();
  }));

  const btnAdd = mkBtn('加一条边');
  const btnDel = mkBtn('删一条边');
  const btnResetLayout = mkBtn('重置布局');
  host.appendChild(buildToolbar(btnAdd, btnDel, btnResetLayout));

  legendInto(host, [
    [themeColors().accent, '实线 = 矩阵里存在的方向'],
    [themeColors().bad, '红色虚线 = 只写了一格、缺反向格'],
    [themeColors().accent2, '加粗外圈 = 当前焦点'],
  ]);

  function refresh() {
    const A = buildMatrix();
    const ones = A.reduce((s, row) => s + row.filter((v) => Math.abs(v) > 1e-12).length, 0);
    const asym = A.some((row, i) => row.some((v, j) => Math.abs(v - A[j][i]) > 1e-12));
    const f = focusNow();
    ro.set('模式', MODES.find((m) => m.value === cfg.mode).label);
    ro.set('焦点', f.kind === 'cell'
      ? nodes[f.i] + ' → ' + nodes[f.j] + '（格 ' + f.i + ',' + f.j + '）'
      : f.kind === 'node' ? nodes[f.node] + ' 的整行整列' : '无（悬停或点一下矩阵）');
    ro.set('矩阵状态', asym
      ? '不对称：非零格 ' + ones + ' 个，边却只有 ' + edges.length + ' 条'
      : '对称：非零格 ' + ones + ' 个 = 边数 ' + edges.length + ' × 2');
    draw();
  }

  function nextFreePair() {
    for (let u = 0; u < n; u += 1) {
      for (let v = 0; v < n; v += 1) {
        if (u === v) continue;
        if (!edges.some(([a, b]) => (a === u && b === v) || (cfg.mode === 'undirected' && a === v && b === u))) {
          return [u, v, 1];
        }
      }
    }
    return null;
  }

  btnAdd.addEventListener('click', () => {
    const pair = nextFreePair();
    if (pair) edges.push(pair);
    refresh();
  });
  btnDel.addEventListener('click', () => {
    if (edges.length) edges.pop();
    refresh();
  });
  btnResetLayout.addEventListener('click', resetLayout);

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      if (i >= 0) return { kind: 'node', i };
      const cell = matrixCellAt(mxRect, px, py);
      if (cell) return { kind: 'cell', i: cell.i, j: cell.j };
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') {
        dragNode = id.i;
        locked.kind = 'node';
        locked.node = id.i;
        locked.i = -1;
        locked.j = -1;
      } else if (id && id.kind === 'cell') {
        /* 触屏点选：再点同一格取消 */
        if (locked.kind === 'cell' && locked.i === id.i && locked.j === id.j) {
          locked.kind = null; locked.i = -1; locked.j = -1;
        } else {
          locked.kind = 'cell'; locked.i = id.i; locked.j = id.j;
        }
      }
      refresh();
    },
    move(id, px, py) {
      if (dragNode < 0) return;
      const rect = layoutRects().graph;
      pos[dragNode].x = clamp(px, rect.x + 22, rect.x + rect.w - 22);
      pos[dragNode].y = clamp(py, rect.y + 26, rect.y + rect.h - 24);
      refresh();
    },
    up() { dragNode = -1; },
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      let next = { node: -1, kind: null, i: -1, j: -1 };
      if (i >= 0) next = { node: i, kind: 'node', i, j: -1 };
      else {
        const cell = matrixCellAt(mxRect, px, py);
        if (cell) next = { node: -1, kind: 'cell', i: cell.i, j: cell.j };
      }
      if (next.kind !== hover.kind || next.i !== hover.i || next.j !== hover.j) {
        hover.node = next.node;
        hover.kind = next.kind;
        hover.i = next.i;
        hover.j = next.j;
        refresh();
      }
    },
    leave() {
      if (hover.kind) {
        hover.node = -1;
        hover.kind = null;
        hover.i = -1;
        hover.j = -1;
        refresh();
      }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };

  return {
    destroy() {
      cv.redraw = null;
    },
  };
}

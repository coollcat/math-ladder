/* =========================================================================
 * lab 组件：g53-centrality-panel —— 四个指标同屏排榜（第 53 章「中心性家族比较」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-centrality-panel",
 *     "title": "同一张图，四种「重要」，四个冠军" }
 *
 * 字段：nodes / edges（可选）；metric 可选，初始指标
 *       "degree" | "closeness" | "betweenness" | "eigenvector"。
 *
 * 交互：
 *   · 分段按钮切指标，右侧排行榜立刻重排——**同一张图，冠军会换人**；
 *   · 排行榜每行是一根条，条长 = 归一化得分，第一名的条加描边；
 *   · 图上节点颜色深浅跟着当前指标走，悬停榜单一行的同时在图上高亮那个节点；
 *   · 「加一条捷径」在两个末端之间连一条边——中介中心性会重新洗牌，
 *     而度中心性只动两个点；这条按钮专门用来暴露「指标在测什么」；
 *   · 「换成星形」一键换图，四种指标的冠军全落在同一个节点上——
 *     那种情况下四个指标没分歧，也就不需要比较了。
 *
 * 数学口径（都在组件里真算，不是查表）：
 *   度中心性   C_D = d/(n−1)
 *   接近中心性 C_C = (n−1)/Σdist，距离用 BFS 的真最短跳数
 *   中介中心性 Brandes 累积（无向、无权），最后归一化到 2/((n−1)(n−2))
 *   特征向量   A 的主特征向量（Jacobi 分解后取最大特征值的向量，L1 归一化）
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildToolbar,
  buildReadout, mkBtn, label, clamp, fmt,
} from '../core.js';
import {
  adjOf, degOf, jacobiEigen, eigenVector, circleLayout, pickNode,
  drawEdge, drawNode, legendInto, readNodes, readEdges,
} from './graph-kit.js';

/* 这张默认图是刻意挑的（穷举 6 节点图找出来的）：三种指标都指向 0，
   但中介中心性选了 3——3 是通往叶子 5 的唯一通道。冠军换人，
   正是因为「中介」问的问题和别人不一样。 */
const DEFAULT_NODES = ['枢纽', '组员甲', '组员乙', '守门人', '组员丙', '外部顾问'];
const DEFAULT_EDGES = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [2, 4], [3, 5]];

const STAR_NODES = ['中心', 'L1', 'L2', 'L3'];
const STAR_EDGES = [[0, 1], [0, 2], [0, 3]];

/* 星形：四种指标的冠军全落在中心节点——没有分歧时就不需要比较 */

const METRICS = [
  { value: 'degree', label: '度中心性' },
  { value: 'closeness', label: '接近中心性' },
  { value: 'betweenness', label: '中介中心性' },
  { value: 'eigenvector', label: '特征向量中心性' },
];

export default function render(host, spec) {
  let nodes = readNodes(spec, DEFAULT_NODES);
  let n = nodes.length;
  let edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);
  const cfg = { metric: METRICS.some((m) => m.value === spec.metric) ? spec.metric : 'degree' };

  const cv = setupCanvas(host, 360);
  const pos = {};
  let posKey = '';
  let boardRect = null;
  let dragNode = -1;
  const hover = { kind: null, i: -1 };

  /* ---------- 数学 ---------- */

  function adj() {
    return adjOf(n, edges, { directed: false });
  }

  /* BFS 全源最短路：返回 dist[i][j] 与 σ[i][j]（最短路径条数）。
     图很小（≤9 节点），直接按起点做一次 BFS 就够，不用 Floyd。 */
  function bfsAll() {
    const A = adj();
    const dist = [];
    for (let s = 0; s < n; s += 1) {
      const d = new Array(n).fill(-1);
      d[s] = 0;
      const q = [s];
      while (q.length) {
        const u = q.shift();
        for (let v = 0; v < n; v += 1) {
          if (A[u][v] && d[v] < 0) { d[v] = d[u] + 1; q.push(v); }
        }
      }
      dist.push(d);
    }
    return dist;
  }

  function closeness() {
    const dist = bfsAll();
    return dist.map((row) => {
      const reach = row.filter((d) => d > 0);
      const sum = reach.reduce((a, b) => a + b, 0);
      /* 不连通时只用可达节点：分母跟着可达数走，并在读数条里注明 */
      return sum > 0 ? reach.length / sum : 0;
    });
  }

  /* Brandes（无向无权）：每个起点做一次 BFS，再按逆序把依赖回传。
     结果是「经过 v 的最短路条数」的未归一化计数。 */
  function betweenness() {
    const A = adj();
    const bc = new Array(n).fill(0);
    for (let s = 0; s < n; s += 1) {
      const stack = [];
      const pred = Array.from({ length: n }, () => []);
      const sigma = new Array(n).fill(0);
      const dist = new Array(n).fill(-1);
      sigma[s] = 1;
      dist[s] = 0;
      const q = [s];
      while (q.length) {
        const v = q.shift();
        stack.push(v);
        for (let w = 0; w < n; w += 1) {
          if (!A[v][w]) continue;
          if (dist[w] < 0) { dist[w] = dist[v] + 1; q.push(w); }
          if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; pred[w].push(v); }
        }
      }
      const delta = new Array(n).fill(0);
      while (stack.length) {
        const w = stack.pop();
        for (const v of pred[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        if (w !== s) bc[w] += delta[w];
      }
    }
    const scale = n > 2 ? 1 / ((n - 1) * (n - 2)) : 1;
    return bc.map((x) => x * scale);
  }

  function eigenCentrality() {
    const A = adj();
    if (n === 0) return [];
    const { values, vectors } = jacobiEigen(A);
    const k = values.length - 1;
    const v = eigenVector(vectors, k);
    const sum = v.reduce((a, b) => a + Math.abs(b), 0) || 1;
    return v.map((x) => Math.abs(x) / sum);
  }

  function scores(metric) {
    if (metric === 'closeness') return closeness();
    if (metric === 'betweenness') return betweenness();
    if (metric === 'eigenvector') return eigenCentrality();
    const d = degOf(adj());
    const den = Math.max(1, n - 1);
    return d.map((x) => x / den);
  }

  function ranking(metric) {
    const sc = scores(metric);
    const mx = Math.max(1e-12, ...sc);
    return sc
      .map((v, i) => ({ i, v, norm: v / mx }))
      .sort((a, b) => b.v - a.v);
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    return {
      narrow,
      graph: { x: 10, y: 30, w: narrow ? W - 20 : Math.round(W * 0.46) - 18, h: narrow ? Math.round(H * 0.46) : H - 60 },
      board: {
        x: narrow ? 12 : Math.round(W * 0.48),
        y: narrow ? 30 + Math.round(H * 0.46) + 26 : 34,
        w: narrow ? W - 24 : W - Math.round(W * 0.48) - 20,
        h: narrow ? Math.round(H * 0.44) : H - 66,
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
    const rank = ranking(cfg.metric);
    const sc = scores(cfg.metric);
    const mx = Math.max(1e-12, ...sc);

    drawGraph(ctx, r.graph, rank, sc, mx, C);
    drawBoard(ctx, r.board, rank, C);

    label(ctx, '同一张图换指标 = 换一种「重要」；冠军换人，说明你之前问的问题不一样',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, rank, sc, mx, C) {
    const topIdx = rank.length ? rank[0].i : -1;
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const hot = hover.i >= 0 && (hover.i === u || hover.i === v);
      const onTop = u === topIdx || v === topIdx;
      drawEdge(ctx, pos[u], 16, pos[v], 16,
        hot ? C.accent2 : (onTop ? C.named('green') : C.axis),
        hot ? 2.8 : (onTop ? 2.2 : 1.5), {});
    });
    nodes.forEach((nm, i) => {
      const hot = hover.i === i;
      const t = sc[i] / mx;
      drawNode(ctx, pos[i], 15 + 6 * t, C, {
        text: nm,
        sub: fmt(sc[i], 2),
        stroke: hot ? C.accent2 : (i === topIdx ? C.named('green') : C.axis),
        lineWidth: hot ? 3 : (i === topIdx ? 2.6 : 1.6),
        ring: hot ? C.accent2 : (i === topIdx ? C.named('green') : null),
        textColor: hot ? C.accent2 : C.fg,
        fill: C.accent,
        fillAlpha: 0.10 + 0.55 * t,
      });
      if (i === topIdx) {
        label(ctx, '冠军', pos[i].x, pos[i].y - 30, C.named('green'), {
          size: 9.5, align: 'center', weight: 700,
        });
      }
    });
    label(ctx, '节点圆大小 = 当前指标得分；绿圈 = 本指标的冠军',
      rect.x + 2, rect.y + rect.h + 14, C.grid, { size: 9.5 });
  }

  function drawBoard(ctx, rect, rank, C) {
    boardRect = { x: rect.x, y: rect.y + 24, w: rect.w, h: rect.h - 24, n, rowH: 0 };
    label(ctx, METRICS.find((m) => m.value === cfg.metric).label + '──从高到低',
      rect.x, rect.y + 6, C.fg, { size: 11, weight: 700 });
    const rowH = Math.min(30, (rect.h - 30) / Math.max(1, rank.length));
    boardRect.rowH = rowH;
    const barX = rect.x + 74;
    const barW = Math.max(20, rect.w - 84);
    rank.forEach((row, k) => {
      const y = rect.y + 24 + k * rowH;
      const hot = hover.i === row.i;
      const isTop = k === 0;
      label(ctx, String(k + 1), rect.x + 4, y + rowH - 12, isTop ? C.named('green') : C.grid,
        { size: 10, weight: isTop ? 700 : 400 });
      label(ctx, nodes[row.i], rect.x + 18, y + rowH - 12,
        hot ? C.accent2 : C.fg, { size: 10, weight: hot || isTop ? 700 : 400 });
      ctx.save();
      ctx.fillStyle = isTop ? C.named('green') : (hot ? C.accent2 : C.accent);
      ctx.globalAlpha = isTop ? 0.85 : (hot ? 0.8 : 0.5);
      ctx.fillRect(barX, y + 6, Math.max(2, barW * row.norm), rowH - 14);
      ctx.restore();
      label(ctx, fmt(row.v, 3), barX + barW * row.norm + 4, y + rowH - 12,
        hot ? C.accent2 : C.fg, { size: 9, weight: isTop ? 700 : 400 });
    });
    const y = rect.y + 24 + rank.length * rowH + 10;
    label(ctx, '第一名：' + (rank.length ? nodes[rank[0].i] : '—'), rect.x, y,
      C.named('green'), { size: 10, weight: 700 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 指标: '—', 冠军: '—', '冠军得分': '—', 图: '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(METRICS, cfg.metric, (v) => { cfg.metric = v; refresh(); }));

  const btnShortcut = mkBtn('加一条捷径');
  const btnStar = mkBtn('换成星形');
  const btnReset = mkBtn('回到默认图');
  host.appendChild(buildToolbar(btnShortcut, btnStar, btnReset));

  legendInto(host, [
    [themeColors().named('green'), '当前指标的冠军'],
    [themeColors().accent, '条长 = 归一化得分'],
  ]);

  function refresh() {
    const rank = ranking(cfg.metric);
    ro.set('指标', METRICS.find((m) => m.value === cfg.metric).label);
    ro.set('冠军', rank.length ? nodes[rank[0].i] : '—');
    ro.set('冠军得分', rank.length ? fmt(rank[0].v, 3) : '—');
    ro.set('图', nodes.length + ' 节点 / ' + edges.length + ' 边');
    draw();
  }

  btnShortcut.addEventListener('click', () => {
    /* 挑一对「当前没有直接相连」的节点连起来（优先挑两端）：
       中介中心性会因为多了这条替代路径而重排，度中心性只动这两个点。 */
    const A = adj();
    let pick = null;
    for (let u = 0; u < n && !pick; u += 1) {
      for (let v = u + 1; v < n; v += 1) {
        if (!A[u][v]) { pick = [u, v]; break; }
      }
    }
    if (pick) edges.push(pick);
    refresh();
  });
  btnStar.addEventListener('click', () => {
    nodes = STAR_NODES.slice();
    n = nodes.length;
    edges = STAR_EDGES.map((e) => e.slice());
    posKey = '';
    refresh();
  });
  btnReset.addEventListener('click', () => {
    nodes = DEFAULT_NODES.slice();
    n = nodes.length;
    edges = DEFAULT_EDGES.map((e) => e.slice());
    posKey = '';
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 16);
      if (i >= 0) return { kind: 'node', i };
      const b = boardRect;
      if (b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
        const k = clamp(Math.floor((py - b.y) / b.rowH), 0, n - 1);
        return { kind: 'row', i: k };
      }
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') { dragNode = id.i; hover.kind = 'node'; hover.i = id.i; }
      else if (id && id.kind === 'row') {
        const rank = ranking(cfg.metric);
        if (rank[id.i]) { hover.kind = 'row'; hover.i = rank[id.i].i; }
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
      const i = pickNode(Object.values(pos), px, py, 16);
      let next = -1;
      if (i >= 0) next = i;
      else {
        const b = boardRect;
        if (b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
          const k = clamp(Math.floor((py - b.y) / b.rowH), 0, n - 1);
          const rank = ranking(cfg.metric);
          if (rank[k]) next = rank[k].i;
        }
      }
      if (next !== hover.i) { hover.i = next; refresh(); }
    },
    leave() {
      if (hover.i >= 0) { hover.i = -1; refresh(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

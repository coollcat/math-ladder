/* =========================================================================
 * lab 组件：g53-edge-semantics —— 同一个三人小组的四种边语义（第 53 章「图的类型与建模」）
 * -------------------------------------------------------------------------
 * 用法（lab 围栏）：
 *   { "type": "g53-edge-semantics", "title": "同三条关系，四种建图方式" }
 *
 * 字段：
 *   nodes    可选，默认 ["甲","乙","丙"]
 *   relations 可选，[[起点, 终点, 权重], …]，默认甲→乙 7、甲→丙 12、乙→丙 3
 *   duplicate 可选，多重图模式下额外并行的那条边 [起, 终]，默认 [0, 1]
 *
 * 四种模式（分段按钮切换，是这张卡的主状态机）：
 *   undirected  无向好友图：三条关系都变成双向，度数 2/2/2，矩阵对称
 *   directed    有向转发图：甲→乙 不代表 乙→甲，出入度分开算
 *   weighted    加权通勤图：边上带分钟数，度变成「加权出度」
 *   multigraph  多重图：甲→乙 同时有高铁和普铁两条平行边，矩阵格子记 2
 *
 * 交互：
 *   · 节点可拖拽；拖拽只改坐标，不改任何数字。
 *   · 悬停一条边或一个矩阵格子，两边同时加粗描边并显示这条关系的读法。
 *   · 切换模式时，右侧的出入度表与矩阵即时重算，屏幕上方那句话点明
 *     「这一种建图会让哪个结论改变」。
 *
 * 看什么：同三条关系，无向模式里 甲 和 丙 都是度 2，看不出谁在传播链的上游；
 *   切到有向模式，出度 2/1/0、入度 0/1/2 立刻把方向暴露出来。这不是算法变了，
 *   是边的语义变了。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildReadout,
  label, clamp, fmt,
} from '../core.js';
import {
  drawNode, pickNode, drawMatrixInto, matrixCellAt, legendInto, trimEdge, TAU,
} from './graph-kit.js';

const DEFAULT_NODES = ['甲', '乙', '丙'];
const DEFAULT_REL = [[0, 1, 7], [0, 2, 12], [1, 2, 3]];

const MODES = [
  { value: 'undirected', label: '无向（好友）' },
  { value: 'directed', label: '有向（转发）' },
  { value: 'weighted', label: '加权（通勤）' },
  { value: 'multigraph', label: '多重（并行）' },
];

const MODE_LINE = {
  undirected: '无向：同一条关系写两格，度数 = 邻居数，矩阵必然对称',
  directed: '有向：每格只记一个方向，出度和入度必须分开报',
  weighted: '加权：格子里的数字是代价不是连接强度，度变成「加权出度」',
  multigraph: '多重图：同一对节点之间可以有两条边，格子记 2',
};

export default function render(host, spec) {
  const nodes = Array.isArray(spec.nodes) && spec.nodes.length >= 2
    ? spec.nodes.slice(0, 5).map(String)
    : DEFAULT_NODES.slice();
  const n = nodes.length;
  const rel = (Array.isArray(spec.relations) ? spec.relations : DEFAULT_REL)
    .filter((e) => Array.isArray(e) && e.length >= 2)
    .map((e) => [
      clamp(Math.round(Number(e[0])), 0, n - 1),
      clamp(Math.round(Number(e[1])), 0, n - 1),
      typeof e[2] === 'number' ? e[2] : 1,
    ])
    .filter(([u, v]) => u !== v);
  const dup = Array.isArray(spec.duplicate)
    ? [clamp(Math.round(Number(spec.duplicate[0])), 0, n - 1), clamp(Math.round(Number(spec.duplicate[1])), 0, n - 1)]
    : [0, 1];

  const cfg = { mode: MODES.some((m) => m.value === spec.mode) ? spec.mode : 'undirected' };

  const cv = setupCanvas(host, 360);
  const pos = {};
  let posKey = '';
  let mxRect = null;
  let dragNode = -1;
  const hover = { kind: null, u: -1, v: -1, i: -1, j: -1 };
  const locked = { kind: null, u: -1, v: -1, i: -1, j: -1 };

  /* ---------- 当前模式下的结构 ---------- */

  /* 返回 { edges: [{u,v,w,id}], A, outDeg, inDeg }。
     无向时每条关系展开成两条有向记录（画的时候只画一条线、末端不画箭头），
     矩阵与度数用展开后的有向记录算，保证「矩阵 = 画出来的图」。 */
  function structure() {
    const list = [];
    if (cfg.mode === 'undirected') {
      rel.forEach(([u, v], k) => {
        list.push({ u, v, w: 1, base: k, back: false });
        list.push({ u: v, v: u, w: 1, base: k, back: true });
      });
    } else if (cfg.mode === 'multigraph') {
      rel.forEach(([u, v], k) => list.push({ u, v, w: 1, base: k, back: false }));
      list.push({ u: dup[0], v: dup[1], w: 1, base: rel.length, back: false, parallel: true });
    } else {
      rel.forEach(([u, v], k) => list.push({ u, v, w: cfg.mode === 'weighted' ? rel[k][2] : 1, base: k, back: false }));
    }
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    list.forEach(({ u, v, w }) => { A[u][v] += w; });
    const outDeg = A.map((row) => row.reduce((s, x) => s + x, 0));
    const inDeg = A.map((_, j) => A.reduce((s, row) => s + row[j], 0));
    return { list, A, outDeg, inDeg };
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    if (narrow) {
      const gh = Math.round(H * 0.50);
      const g = { x: 6, y: 30, w: W - 12, h: gh };
      const size = Math.min(W * 0.58, H - gh - 56);
      return {
        narrow,
        graph: g,
        matrix: { x: 8, y: 30 + gh + 26, w: size, h: size },
        table: { x: size + 26, y: 30 + gh + 26, w: W - size - 36, h: size },
      };
    }
    const graph = { x: 8, y: 30, w: Math.round(W * 0.50) - 16, h: H - 56 };
    const size = Math.min(W * 0.30, H - 96);
    return {
      narrow,
      graph,
      matrix: { x: Math.round(W * 0.52), y: 46, w: size, h: size },
      table: { x: Math.round(W * 0.52) + size + 16, y: 46, w: W - Math.round(W * 0.52) - size - 24, h: size },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const R = Math.max(40, Math.min(rect.w, rect.h) * 0.34);
    /* 三人固定成「上一下二」的三角，关系方向最容易读 */
    const angs = [-Math.PI / 2, Math.PI / 2 + 0.9, Math.PI / 2 - 0.9];
    for (let i = 0; i < n; i += 1) {
      const a = angs[i] != null ? angs[i] : -Math.PI / 2 + (i / n) * TAU;
      pos[i] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
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
    const st = structure();
    const f = hover.kind ? hover : locked;

    drawGraph(ctx, r.graph, st, C, f);
    const mr = drawMatrixInto(ctx, r.matrix, st.A, {
      C,
      labels: nodes,
      title: cfg.mode === 'undirected' ? '对称矩阵' : '关系矩阵（行 = 起点）',
      hoverRow: f.kind === 'cell' ? f.i : (f.kind === 'node' ? f.node : -1),
      hoverCol: f.kind === 'cell' ? f.j : (f.kind === 'node' ? f.node : -1),
      focus: f.kind === 'cell' ? { i: f.i, j: f.j } : null,
      rowSums: cfg.mode === 'weighted' ? st.outDeg : null,
      small: r.narrow,
    });
    mxRect = mr;
    drawTable(ctx, r.table, st, C, f);

    label(ctx, MODE_LINE[cfg.mode], 8, H - 10, C.grid, { size: 10.5 });
  }

  function edgeHot(f, u, v) {
    if (!f.kind) return false;
    if (f.kind === 'node') return u === f.node || v === f.node;
    return f.i === u && f.j === v;
  }

  function drawGraph(ctx, rect, st, C, f) {
    /* 无向模式用「一对节点只画一条线」的画法：把双向记录折叠掉 |
       多重图模式里平行边用垂直偏移分开画，否则两条会完全重合。 */
    const drawn = new Set();
    const pairs = {};
    st.list.forEach((e) => {
      if (cfg.mode === 'undirected' && e.back) return;
      const key = e.u + '>' + e.v;
      pairs[key] = (pairs[key] || 0) + 1;
    });

    const seenCount = {};
    st.list.forEach((e) => {
      if (cfg.mode === 'undirected' && e.back) return;
      const key = e.u + '>' + e.v;
      const k = seenCount[key] || 0;
      seenCount[key] = k + 1;
      const total = pairs[key];
      const off = (k - (total - 1) / 2) * 14;
      const a = pos[e.u];
      const b = pos[e.v];
      const hot = edgeHot(f, e.u, e.v);
      const color = hot ? C.accent2 : C.axis;
      const width = hot ? 3 : 1.5;
      const t = trimEdge(a, 15, b, 15);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      const mx = (t.x0 + t.x1) / 2;
      const my = (t.y0 + t.y1) / 2;
      const nx = -t.uy * off;
      const ny = t.ux * off;
      ctx.beginPath();
      ctx.moveTo(t.x0 + nx, t.y0 + ny);
      ctx.quadraticCurveTo(mx + nx * 2, my + ny * 2, t.x1 + nx, t.y1 + ny);
      ctx.stroke();
      if (cfg.mode !== 'undirected') {
        const ang = Math.atan2(t.y1 - t.y0, t.x1 - t.x0);
        const hx = t.x1 + nx;
        const hy = t.y1 + ny;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - 9 * Math.cos(ang - 0.42), hy - 9 * Math.sin(ang - 0.42));
        ctx.lineTo(hx - 9 * Math.cos(ang + 0.42), hy - 9 * Math.sin(ang + 0.42));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      if (cfg.mode === 'weighted' || total > 1) {
        label(ctx, cfg.mode === 'weighted' ? String(e.w) : '×' + total,
          mx + nx * 2, my + ny * 2 - 4, hot ? C.accent2 : C.fg,
          { size: 11, weight: 700, align: 'center' });
      }
      void drawn;
    });

    nodes.forEach((nm, i) => {
      const hot = f.kind === 'node' ? f.node === i : (f.kind === 'cell' && (f.i === i || f.j === i));
      drawNode(ctx, pos[i], 15, C, {
        text: nm,
        sub: cfg.mode === 'weighted'
          ? '出' + fmt(st.outDeg[i], 2)
          : '出' + fmt(st.outDeg[i], 2) + ' / 入' + fmt(st.inDeg[i], 2),
        stroke: hot ? C.accent2 : C.axis,
        lineWidth: hot ? 2.6 : 1.6,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: cfg.mode === 'undirected' ? C.named('teal') : C.accent,
        fillAlpha: 0.14,
      });
    });
  }

  function drawTable(ctx, rect, st, C, f) {
    let y = rect.y + 4;
    label(ctx, '出度 / 入度', rect.x, y, C.fg, { size: 11, weight: 700 });
    y += 18;
    const maxD = Math.max(1, ...st.outDeg, ...st.inDeg);
    nodes.forEach((nm, i) => {
      const hot = f.kind === 'node' ? f.node === i : (f.kind === 'cell' && (f.i === i || f.j === i));
      label(ctx, nm, rect.x, y + 10, hot ? C.accent2 : C.fg, { size: 11, weight: hot ? 700 : 400 });
      const bx = rect.x + 24;
      const bw = Math.max(24, rect.w - 60);
      ctx.save();
      ctx.fillStyle = C.soft;
      ctx.fillRect(bx, y + 3, bw, 8);
      ctx.fillRect(bx, y + 14, bw, 8);
      ctx.fillStyle = C.accent;
      ctx.fillRect(bx, y + 3, bw * (st.outDeg[i] / maxD), 8);
      ctx.fillStyle = C.named('amber');
      ctx.fillRect(bx, y + 14, bw * (st.inDeg[i] / maxD), 8);
      ctx.restore();
      label(ctx, fmt(st.outDeg[i], 2), rect.x + rect.w - 4, y + 11, C.fg, { size: 9.5, align: 'right' });
      label(ctx, fmt(st.inDeg[i], 2), rect.x + rect.w - 4, y + 22, C.named('amber'), { size: 9.5, align: 'right' });
      y += 34;
    });
    y += 6;
    const totalOut = st.outDeg.reduce((a, b) => a + b, 0);
    const totalIn = st.inDeg.reduce((a, b) => a + b, 0);
    label(ctx, 'Σ出 = ' + fmt(totalOut, 2) + '　Σ入 = ' + fmt(totalIn, 2), rect.x, y, C.axis, { size: 9.5 });
    y += 15;
    label(ctx, '每条有向边恰好贡献', rect.x, y, C.grid, { size: 9 });
    label(ctx, '一个出度和一个入度', rect.x, y + 12, C.grid, { size: 9 });

    if (f.kind === 'cell') {
      const w = st.A[f.i][f.j];
      label(ctx, nodes[f.i] + ' → ' + nodes[f.j] + ' = ' + fmt(w, 2), rect.x, y + 34, C.accent2, {
        size: 10, weight: 700,
      });
      label(ctx, w > 0 ? '这条关系存在' : '这条关系不存在', rect.x, y + 48, C.grid, { size: 9.5 });
      if (cfg.mode === 'directed' || cfg.mode === 'weighted') {
        const back = st.A[f.j][f.i];
        label(ctx, '反向 = ' + fmt(back, 2) + (back > 0 ? '（能回去）' : '（回不去）'),
          rect.x, y + 62, back > 0 ? C.ok : C.bad, { size: 9.5 });
      }
    }
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 模式: '—', 度数合计: '—', 关系方向: '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(MODES, cfg.mode, (v) => { cfg.mode = v; refresh(); }));
  legendInto(host, [
    [themeColors().accent, '蓝色条 = 出度'],
    [themeColors().named('amber'), '橙色条 = 入度'],
    [themeColors().accent2, '加粗 = 当前焦点'],
  ]);

  function refresh() {
    const st = structure();
    const total = st.outDeg.reduce((a, b) => a + b, 0);
    const undirectedLike = st.A.every((row, i) => row.every((v, j) => Math.abs(v - st.A[j][i]) < 1e-12));
    ro.set('模式', MODES.find((m) => m.value === cfg.mode).label);
    ro.set('度数合计', cfg.mode === 'weighted' ? '加权 Σ出 = ' + fmt(total, 2) : 'Σ出 = Σ入 = ' + fmt(total, 2));
    ro.set('关系方向', undirectedLike ? '对称：每条关系都能原路返回' : '不对称：存在单向关系');
    draw();
  }

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
        Object.assign(locked, { kind: 'node', i: -1, j: -1 });
      } else if (id && id.kind === 'cell') {
        const same = locked.kind === 'cell' && locked.i === id.i && locked.j === id.j;
        Object.assign(locked, same
          ? { kind: null, i: -1, j: -1 }
          : { kind: 'cell', i: id.i, j: id.j });
      }
      refresh();
    },
    move(id, px, py) {
      if (dragNode < 0) return;
      const g = rects().graph;
      pos[dragNode].x = clamp(px, g.x + 22, g.x + g.w - 22);
      pos[dragNode].y = clamp(py, g.y + 26, g.y + g.h - 26);
      refresh();
    },
    up() { dragNode = -1; },
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      let next = { kind: null, i: -1, j: -1 };
      if (i >= 0) next = { kind: 'node', i, j: -1 };
      else {
        const cell = matrixCellAt(mxRect, px, py);
        if (cell) next = { kind: 'cell', i: cell.i, j: cell.j };
      }
      if (next.kind !== hover.kind || next.i !== hover.i || next.j !== hover.j) {
        Object.assign(hover, next, { u: -1, v: -1 });
        refresh();
      }
    },
    leave() {
      if (hover.kind) {
        Object.assign(hover, { kind: null, i: -1, j: -1, u: -1, v: -1 });
        refresh();
      }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

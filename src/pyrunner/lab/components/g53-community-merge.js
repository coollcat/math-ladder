/* =========================================================================
 * lab 组件：g53-community-merge —— 模块度的贪心合并（第 53 章「模块度」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-community-merge",
 *     "title": "一步一步把节点并成社区",
 *     "nodes": ["A","B","C","D","E","F"],
 *     "edges": [[0,1],[1,2],[0,2],[3,4],[4,5],[3,5],[2,3]] }
 *
 * 字段：nodes / edges（可选）。
 *
 * 交互（真状态机：可以前进、后退、重来）：
 *   · 起点是「每个节点自己一个社区」；
 *   · 每按一次「合并一步」，程序在所有相邻社区对里挑模块度增量最大的那一对合并，
 *     并把这一次合并的 ΔQ 写进右侧日志；
 *   · 「退一步」回放上一次，「重来」回到全部分开；
 *   · 悬停任一社区块，该块内节点在图上一起加粗。
 *
 * 看什么：**社区不是先定义再算出来的，是合并过程停下来的地方**。
 *   对照图是双三角 + 桥（6 节点 7 边）：贪心合并的 Q 依次是
 *   −0.1735 → −0.0714 → 0.0918 → 0.1939 → 0.3571 → 0.0000。
 *   停在「两个三角形」时最高；最后一步把桥也吞进去，Q 直接塌回 0
 *   ——这就是为什么合并要在 Q 最高处收手。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clamp, fmt,
} from '../core.js';
import {
  adjOf, degOf, circleLayout, pickNode, drawEdge, drawNode, legendInto,
  readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['A', 'B', 'C', 'D', 'E', 'F'];
const DEFAULT_EDGES = [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5], [2, 3]];

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;
  const edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);

  const cv = setupCanvas(host, 360);
  const pos = {};
  let posKey = '';

  /* history：每一步的社区划分快照 + 这一步的 ΔQ */
  let history = [];
  let cursor = 0;
  const hover = { i: -1, c: -1 };

  /* ---------- 数学 ---------- */

  /* 模块度 Q = Σ_c [ L_c/m − (d_c/2m)² ]，
     L_c 是社区 c 内部的边数，d_c 是社区内节点的度之和，m 是总边数。 */
  function modularity(comm) {
    const m = edges.length || 1;
    const deg = degOf(adjOf(n, edges, { directed: false }));
    const groups = new Map();
    comm.forEach((c, i) => {
      if (!groups.has(c)) groups.set(c, { l: 0, d: 0, members: [] });
      const g = groups.get(c);
      g.d += deg[i];
      g.members.push(i);
    });
    edges.forEach(([u, v]) => {
      if (comm[u] === comm[v] && groups.has(comm[u])) groups.get(comm[u]).l += 1;
    });
    let q = 0;
    groups.forEach((g) => { q += g.l / m - (g.d / (2 * m)) ** 2; });
    return q;
  }

  /* 贪心：在所有「相邻社区对」里试合并，选 Q 增益最大的那一对。
     增益 <= 0 也照样合并（这就是为什么 Q 会先升后降），但界面上会标出来。 */
  function bestMerge(comm) {
    const seen = new Set();
    const cands = [];
    edges.forEach(([u, v]) => {
      const cu = comm[u];
      const cv = comm[v];
      if (cu === cv) return;
      const key = cu < cv ? cu + ':' + cv : cv + ':' + cu;
      if (seen.has(key)) return;
      seen.add(key);
      const trial = comm.map((c) => (c === cv ? cu : c));
      cands.push({ key, from: cv, to: cu, delta: modularity(trial) - modularity(comm), comm: trial });
    });
    if (!cands.length) return null;
    cands.sort((a, b) => b.delta - a.delta);
    return cands[0];
  }

  function reset() {
    const comm = Array.from({ length: n }, (_, i) => i);
    history = [{ comm, delta: 0, q: modularity(comm), from: -1, to: -1 }];
    cursor = 0;
  }

  function stepForward() {
    if (cursor < history.length - 1) { cursor += 1; return; }
    const cur = history[history.length - 1];
    const pick = bestMerge(cur.comm);
    if (!pick) return;
    history.push({ comm: pick.comm, delta: pick.delta, q: modularity(pick.comm), from: pick.from, to: pick.to });
    cursor = history.length - 1;
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
        h: narrow ? Math.round(H * 0.34) : H - 66,
      },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + n;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    circleLayout(n, rect, 0.35).forEach((p, i) => { pos[i] = p; });
  }

  const HUES = ['teal', 'purple', 'orange', 'pink', 'green', 'blue'];

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
    const frame = history[cursor] || history[0];
    const comm = frame.comm;

    /* 社区编号 → 稳定颜色：用「该社区里最小节点号」当下标，颜色不会随合并乱跳 */
    const colorOf = new Map();
    const firstOf = new Map();
    comm.forEach((c, i) => { if (!firstOf.has(c)) firstOf.set(c, i); });
    firstOf.forEach((i, c) => colorOf.set(c, HUES[i % HUES.length]));

    const counts = new Map();
    comm.forEach((c) => counts.set(c, (counts.get(c) || 0) + 1));

    drawGraph(ctx, r.graph, comm, colorOf, counts, C);
    drawPanel(ctx, r.panel, comm, colorOf, counts, frame, C);

    label(ctx, '每步合并「让 Q 涨得最多」的那一对相邻社区；Q 见右下曲线',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, comm, colorOf, counts, C) {
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const inner = comm[u] === comm[v];
      const hot = (hover.i >= 0 && (hover.i === u || hover.i === v))
        || (hover.c >= 0 && (comm[u] === hover.c || comm[v] === hover.c));
      drawEdge(ctx, pos[u], 15, pos[v], 15,
        hot ? C.accent2 : (inner ? C.named(colorOf.get(comm[u])) : C.axis),
        hot ? 2.8 : (inner ? 2.4 : 1.3),
        { dash: inner ? null : [5, 4] });
    });
    nodes.forEach((nm, i) => {
      const hot = hover.i === i || (hover.c >= 0 && comm[i] === hover.c);
      const col = C.named(colorOf.get(comm[i]));
      drawNode(ctx, pos[i], 15, C, {
        text: nm,
        sub: '社区 ' + (comm[i] + 1),
        stroke: hot ? C.accent2 : col,
        lineWidth: hot ? 2.8 : 1.9,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: col,
        fillAlpha: 0.22,
      });
    });
    const k = new Set(comm).size;
    label(ctx, '当前 ' + k + ' 个社区；实线 = 社区内边，虚线 = 跨社区边',
      rect.x + 2, rect.y + rect.h + 14, C.fg, { size: 9.5 });
  }

  function drawPanel(ctx, rect, comm, colorOf, counts, frame, C) {
    /* 每个社区的成员块 */
    label(ctx, '社区构成', rect.x, rect.y + 4, C.fg, { size: 11, weight: 700 });
    const groups = new Map();
    comm.forEach((c, i) => {
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(i);
    });
    let y = rect.y + 22;
    const keys = [...groups.keys()].sort((a, b) => a - b);
    keys.forEach((c) => {
      const hot = hover.c === c;
      const col = C.named(colorOf.get(c));
      ctx.save();
      ctx.fillStyle = col;
      ctx.globalAlpha = hot ? 0.9 : 0.35;
      ctx.fillRect(rect.x, y, Math.min(56, rect.w * 0.22), 16);
      ctx.restore();
      label(ctx, '社区 ' + (c + 1), rect.x + 4, y + 12, C.bg, { size: 9, weight: 700 });
      label(ctx, groups.get(c).map((i) => nodes[i]).join(' '),
        rect.x + Math.min(56, rect.w * 0.22) + 6, y + 12, hot ? C.accent2 : C.fg,
        { size: 9.5, weight: hot ? 700 : 400 });
      y += 20;
      void counts;
    });

    /* Q 随步数变化的小折线 */
    const gy = y + 14;
    label(ctx, '模块度 Q 随合并步骤', rect.x, gy, C.fg, { size: 10.5, weight: 700 });
    const gx = rect.x;
    const gw = rect.w - 8;
    const gh = Math.max(30, rect.y + rect.h - gy - 40);
    const qs = history.map((h) => h.q);
    const lo = Math.min(...qs, 0);
    const hi = Math.max(...qs, 0.01);
    const span = Math.max(1e-6, hi - lo);
    ctx.save();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    qs.forEach((q, k) => {
      const px = gx + (k / Math.max(1, qs.length - 1)) * gw;
      const py = gy + 20 + gh - ((q - lo) / span) * gh;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.restore();
    /* 当前这一步点一个圆 */
    const cx = gx + (cursor / Math.max(1, qs.length - 1)) * gw;
    const cy = gy + 20 + gh - ((qs[cursor] - lo) / span) * gh;
    ctx.save();
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label(ctx, 'Q = ' + fmt(qs[cursor], 4), cx + 8, cy - 6, C.accent2, { size: 10, weight: 700 });
    if (frame.from >= 0) {
      label(ctx, '本步合并：社区 ' + (frame.from + 1) + ' → 社区 ' + (frame.to + 1)
        + '，ΔQ = ' + fmt(frame.delta, 4),
        rect.x, gy + 20 + gh + 14, frame.delta > 0 ? C.ok : C.bad, { size: 9.5, weight: 700 });
    } else {
      label(ctx, '起点：每个节点自己一个社区', rect.x, gy + 20 + gh + 14, C.grid, { size: 9.5 });
    }
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 社区数: '—', Q: '—', '本步 ΔQ': '—', 步: '—' });
  host.appendChild(ro.box);

  const btnStep = mkBtn('合并一步');
  const btnBack = mkBtn('退一步');
  const btnReset = mkBtn('重来');
  host.appendChild(buildToolbar(btnStep, btnBack, btnReset));

  legendInto(host, [
    [themeColors().accent, '同色 = 同一个社区'],
    [themeColors().axis, '虚线 = 跨社区边'],
  ]);

  function refresh() {
    const frame = history[cursor];
    ro.set('社区数', String(new Set(frame.comm).size));
    ro.set('Q', fmt(frame.q, 4));
    ro.set('本步 ΔQ', frame.from >= 0 ? fmt(frame.delta, 4) : '—');
    ro.set('步', cursor + ' / ' + (history.length - 1));
    draw();
  }

  btnStep.addEventListener('click', () => {
    /* 已经回放过一半时，再往前走就复用历史；到末尾才算新合并 */
    stepForward();
    refresh();
  });
  btnBack.addEventListener('click', () => { cursor = clamp(cursor - 1, 0, history.length - 1); refresh(); });
  btnReset.addEventListener('click', () => { reset(); refresh(); });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      if (i >= 0) return { kind: 'node', i };
      /* 点右侧社区块 = 选中那个社区 */
      const frame = history[cursor];
      return { kind: 'blank', i, c: frame ? frame.comm[Math.max(0, i)] : -1 };
    },
    down(id) {
      if (id && id.kind === 'node') { hover.i = id.i; hover.c = -1; }
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      if (i !== hover.i || hover.c !== -1) { hover.i = i; hover.c = -1; refresh(); }
    },
    leave() {
      if (hover.i >= 0 || hover.c >= 0) { hover.i = -1; hover.c = -1; refresh(); }
    },
  });

  reset();
  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

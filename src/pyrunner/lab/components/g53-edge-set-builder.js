/* =========================================================================
 * lab 组件：g53-edge-set-builder —— 关系表 → 边集，重复与反向怎么塌掉
 *                        （第 53 章「网络不只是点线图」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-edge-set-builder",
 *     "title": "五条记录，三条边",
 *     "nodes": ["小蓝","小橙","小绿","小紫"],
 *     "records": [["小蓝","小橙"],["小橙","小蓝"],["小橙","小绿"],
 *                 ["小绿","小橙"],["小绿","小紫"]] }
 *
 * 字段：nodes / edges / records（都能省，缺了用课程里那四条同学关系）。
 *
 * 交互：
 *   · 左边一列是**原始记录**，右边是从记录里抽出来的图；
 *   · 「再加一条重复记录」：记录数 +1，唯一边不变——重复不会让关系变多；
 *   · 「再加一条反向记录」：仍然是同一条边——无向图 (A,B) 与 (B,A) 是同一条；
 *   · 「切成有向图」：同样的记录，唯一关系数立刻翻倍，(A→B) 与 (B→A) 变成两条；
 *   · 「删掉小橙」：图上分成两块，连通分量从 1 变成 2——正文第 4 步那个结论；
 *   · 「重置」回到课程里那五条原始记录。
 *
 * 看什么：**同一堆记录，选无向还是有向，抽出来的边集不是一个东西**；
 *   而「删掉小橙后断开」这种结论只能从边集里读出来，名单本身读不出来。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, fmt, clamp,
} from '../core.js';
import {
  adjOf, degOf, circleLayout, pickNode, drawEdge, drawNode, legendInto,
  readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['小蓝', '小橙', '小绿', '小紫'];
const DEFAULT_RECORDS = [
  ['小蓝', '小橙'], ['小橙', '小蓝'],
  ['小橙', '小绿'], ['小绿', '小橙'],
  ['小绿', '小紫'],
];

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;

  /* 记录用节点下标存；spec 里可以给 records，也可以给 edges（当作 records） */
  function normRecords(list) {
    const out = [];
    (list || []).forEach((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) return;
      const u = nodes.indexOf(String(pair[0]));
      const v = nodes.indexOf(String(pair[1]));
      if (u >= 0 && v >= 0 && u !== v) out.push([u, v]);
    });
    return out;
  }

  const seed = Array.isArray(spec.records) ? spec.records
    : (Array.isArray(spec.edges) ? spec.edges.map(([u, v]) => [nodes[u], nodes[v]]) : DEFAULT_RECORDS);

  let records = normRecords(seed);
  if (!records.length) records = normRecords(DEFAULT_RECORDS);

  const cfg = { directed: spec.directed === true, removed: [] };
  const cv = setupCanvas(host, 360);
  let pos = {};
  let posKey = '';
  const hover = { i: -1, row: -1 };

  /* ---------- 数学 ---------- */

  function alive(i) { return !cfg.removed.includes(i); }

  /* 唯一边集：无向按 (min,max) 去重，有向按 (u,v) 去重 */
  function edgeSet() {
    const seen = new Set();
    const out = [];
    records.forEach(([u, v]) => {
      if (!alive(u) || !alive(v)) return;
      const key = cfg.directed ? u + '>' + v : Math.min(u, v) + '-' + Math.max(u, v);
      if (seen.has(key)) return;
      seen.add(key);
      out.push([u, v]);
    });
    return out;
  }

  function components() {
    const A = adjOf(n, records, { directed: false });
    const seen = new Array(n).fill(false);
    let cnt = 0;
    for (let s = 0; s < n; s += 1) {
      if (!alive(s) || seen[s]) continue;
      cnt += 1;
      const q = [s];
      seen[s] = true;
      while (q.length) {
        const u = q.shift();
        for (let v = 0; v < n; v += 1) {
          if (alive(v) && !seen[v] && (A[u][v] || A[v][u])) { seen[v] = true; q.push(v); }
        }
      }
    }
    return cnt;
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 640;
    const leftW = narrow ? W - 20 : Math.round(W * 0.44) - 16;
    return {
      narrow,
      list: { x: 10, y: 32, w: leftW, h: narrow ? Math.round(H * 0.36) : Math.round(H * 0.42) },
      graph: {
        x: narrow ? 10 : Math.round(W * 0.46) + 4,
        y: narrow ? 32 + Math.round(H * 0.36) + 26 : 32,
        w: narrow ? W - 20 : W - (Math.round(W * 0.46) + 24),
        h: narrow ? Math.round(H * 0.34) : H - 66,
      },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + n;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    pos = {};
    circleLayout(n, rect, 0.34).forEach((p, i) => { pos[i] = p; });
    /* 四个点摆成一条链更贴合「同学关系」的直觉：按编号排在水平线上 */
    const step = rect.w / Math.max(1, n);
    for (let i = 0; i < n; i += 1) {
      pos[i] = { x: rect.x + step * (i + 0.5), y: rect.y + rect.h * 0.5 };
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
    const es = edgeSet();
    drawList(ctx, r.list, es, C);
    drawGraph(ctx, r.graph, es, C);

    label(ctx, '左：原始记录　右：从记录里抽出来的边集；同一条关系写两遍只算一条',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawList(ctx, rect, es, C) {
    label(ctx, '原始记录（' + records.length + ' 条）', rect.x + 2, rect.y,
      C.fg, { size: 11, weight: 700 });
    const rowH = Math.max(15, Math.min(22, (rect.h - 20) / Math.max(1, records.length)));
    /* 先算出每条记录是否「被去重掉了」：按顺序扫，第一次见到的算新边 */
    const seen = new Set();
    const marks = records.map(([u, v]) => {
      const key = cfg.directed ? u + '>' + v : Math.min(u, v) + '-' + Math.max(u, v);
      if (!alive(u) || !alive(v)) return 'gone';
      if (seen.has(key)) return 'dup';
      seen.add(key);
      return 'new';
    });

    records.forEach(([u, v], k) => {
      const y = rect.y + 18 + k * rowH;
      if (y + rowH > rect.y + rect.h) return;
      const hot = hover.row === k;
      const mark = marks[k];
      const arrow = cfg.directed ? ' → ' : ' — ';
      const txt = nodes[u] + arrow + nodes[v];
      const col = mark === 'new' ? C.fg : (mark === 'dup' ? C.grid : C.bad);
      if (hot) {
        ctx.save();
        ctx.fillStyle = C.accent2;
        ctx.globalAlpha = 0.12;
        ctx.fillRect(rect.x, y, rect.w, rowH - 2);
        ctx.restore();
      }
      label(ctx, String(k + 1) + '.', rect.x + 2, y + rowH - 7, C.grid, { size: 8.5 });
      label(ctx, txt, rect.x + 18, y + rowH - 7, hot ? C.accent2 : col,
        { size: 9.5, weight: mark === 'new' ? 700 : 400 });
      if (mark === 'dup') {
        label(ctx, '重复', rect.x + rect.w - 34, y + rowH - 7, C.grid, { size: 8.5 });
      } else if (mark === 'gone') {
        label(ctx, '已剔除', rect.x + rect.w - 40, y + rowH - 7, C.bad, { size: 8.5 });
      }
    });

    const y2 = rect.y + 18 + Math.min(records.length, Math.floor((rect.h - 20) / rowH)) * rowH + 8;
    label(ctx, '去掉重复后剩 ' + es.length + ' 条唯一关系'
      + (cfg.directed ? '（有向：(A→B) 与 (B→A) 是两条）' : '（无向：(A,B) 与 (B,A) 是同一条）'),
      rect.x + 2, y2, C.named('teal'), { size: 9, weight: 700 });
  }

  function drawGraph(ctx, rect, es, C) {
    /* 度必须按**去重后的边集** es 算，不能按原始记录 records：records 里同一条
       关系可能记了多次，用它会得到 [2,4,3,1]、Σd=10，而屏幕上同时写着「3 条边」——
       Σd=2E 的握手引理当场被违反，而本课的全部论点正是「重复记录不该让边变粗」。
       按 es 算才是 [1,2,2,1]、Σd=6 = 2×3。 */
    const deg = degOf(adjOf(n, es, { directed: false }));
    es.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const hot = hover.i >= 0 && (hover.i === u || hover.i === v);
      drawEdge(ctx, pos[u], 17, pos[v], 17,
        hot ? C.accent2 : C.named('teal'),
        hot ? 3 : 2.2, { arrow: cfg.directed });
    });
    nodes.forEach((nm, i) => {
      const hot = hover.i === i;
      const off = !alive(i);
      drawNode(ctx, pos[i], 17, C, {
        text: nm,
        sub: off ? '已删' : '度 ' + deg[i],
        stroke: hot ? C.accent2 : (off ? C.bad : C.named('teal')),
        lineWidth: hot ? 3 : 1.9,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : (off ? C.bad : C.fg),
        fill: off ? C.bg : C.named('teal'),
        fillAlpha: off ? 0 : 0.2,
      });
    });
    const comp = components();
    label(ctx, (cfg.directed ? '有向图' : '无向图') + '：' + nodes.filter((_, i) => alive(i)).length
      + ' 个节点、' + es.length + ' 条边、' + comp + ' 个连通分量',
      rect.x + 2, rect.y + rect.h + 14, C.fg, { size: 10, weight: 700 });
    label(ctx, '度 = 该节点在几条边里出现；连通分量 = 互相走得到的块',
      rect.x + 2, rect.y + rect.h + 28, C.grid, { size: 9 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 原始记录: '—', 唯一关系: '—', 连通分量: '—', 图类型: '—' });
  host.appendChild(ro.box);

  const btnDup = mkBtn('再加一条重复记录');
  const btnRev = mkBtn('再加一条反向记录');
  const btnDir = mkBtn('切成有向图');
  host.appendChild(buildToolbar(btnDup, btnRev, btnDir));

  const btnDel = mkBtn('删掉小橙');
  const btnReset = mkBtn('重置');
  host.appendChild(buildToolbar(btnDel, btnReset));

  legendInto(host, [
    [themeColors().named('teal'), '边（唯一关系）'],
    [themeColors().grid, '灰色 = 被去重掉的重复记录'],
  ]);

  function refresh() {
    const es = edgeSet();
    ro.set('原始记录', String(records.length));
    ro.set('唯一关系', String(es.length));
    ro.set('连通分量', String(components()));
    ro.set('图类型', cfg.directed ? '有向（箭头）' : '无向');
    btnDir.textContent = cfg.directed ? '切回无向图' : '切成有向图';
    const mid = nodes.indexOf('小橙');
    btnDel.textContent = mid >= 0 && alive(mid) ? '删掉小橙' : '恢复小橙';
    draw();
  }

  function pickPair() {
    /* 找一对「已经有记录」的节点来造重复/反向记录；没有就退回前两个点 */
    for (const [u, v] of records) {
      if (alive(u) && alive(v) && u !== v) return [u, v];
    }
    return [0, Math.min(1, n - 1)];
  }

  btnDup.addEventListener('click', () => {
    const [u, v] = pickPair();
    records = records.concat([[u, v]]);
    refresh();
  });
  btnRev.addEventListener('click', () => {
    const [u, v] = pickPair();
    records = records.concat([[v, u]]);
    refresh();
  });
  btnDir.addEventListener('click', () => { cfg.directed = !cfg.directed; refresh(); });
  btnDel.addEventListener('click', () => {
    const mid = nodes.indexOf('小橙');
    if (mid < 0) return;
    if (alive(mid)) cfg.removed = cfg.removed.concat([mid]);
    else cfg.removed = cfg.removed.filter((x) => x !== mid);
    refresh();
  });
  btnReset.addEventListener('click', () => {
    records = normRecords(DEFAULT_RECORDS);
    cfg.directed = false;
    cfg.removed = [];
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 17);
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
      const i = pickNode(Object.values(pos), px, py, 17);
      /* 记录行也可以悬停：按左栏的几何位置反推 */
      let row = -1;
      const r = rects();
      const rowH = Math.max(15, Math.min(22, (r.list.h - 20) / Math.max(1, records.length)));
      if (px >= r.list.x && px <= r.list.x + r.list.w
        && py >= r.list.y + 18 && py <= r.list.y + 18 + records.length * rowH) {
        row = clamp(Math.floor((py - r.list.y - 18) / rowH), 0, records.length - 1);
      }
      if (i !== hover.i || row !== hover.row) { hover.i = i; hover.row = row; refresh(); }
    },
    leave() {
      if (hover.i >= 0 || hover.row >= 0) { hover.i = -1; hover.row = -1; refresh(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

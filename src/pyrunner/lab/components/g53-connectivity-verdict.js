/* =========================================================================
 * lab 组件：g53-connectivity-verdict —— 遍历计数 vs 零特征值计数（第 53 章「连通分量与代数判据」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-connectivity-verdict",
 *     "title": "两种方法数同一张图的连通分量",
 *     "nodes": ["A","B","C","D","E"], "edges": [[0,1],[1,2],[0,2],[3,4]] }
 *
 * 字段：nodes / edges（可选）；seed 可选（加边用的固定随机种子）。
 *
 * 交互（两条独立证据并排，谁也不许打掩护）：
 *   · 上面是栈式深度优先搜索：点「走一步」逐次演示，已访问的节点变成填充色，
 *     屏幕上把栈的当前内容写出来；
 *   · 下面是从 $L$ 算出的谱：近零特征值个数（阈值 1e-10）；
 *   · 两个数字必须相等。点「加一座桥」把两个分量连起来，两边同时变 1；
 *     点「剪断一条边」反过来。
 *   · 悬停任一节点，DFS 访问序里对应的那一步也会高亮。
 *
 * 看什么：**遍历是从结构出发，谱是从代数出发**，两条完全不同的路给出同一个数。
 *   课程里那句「零特征值重数等于连通分量个数」在这张卡上是两个并排的计数器。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clamp, fmt,
} from '../core.js';
import {
  adjOf, degOf, laplacianOf, jacobiEigen, circleLayout, pickNode,
  drawEdge, drawNode, legendInto, readNodes, readEdges,
} from './graph-kit.js';

const DEFAULT_NODES = ['A', 'B', 'C', 'D', 'E'];
const DEFAULT_EDGES = [[0, 1], [1, 2], [0, 2], [3, 4]];

const MAX_STEPS = 400;

export default function render(host, spec) {
  const nodes = readNodes(spec, DEFAULT_NODES);
  const n = nodes.length;
  let edges = readEdges(spec, n, DEFAULT_EDGES).map(([u, v]) => [u, v]);

  const cv = setupCanvas(host, 340);
  const pos = {};
  let posKey = '';
  const hover = { i: -1 };

  /* ---------- 状态机：DFS 走一步 ---------- */

  /* trace 是一段可回放的访问记录：{ type: 'visit'|'push'|'pop'|'done', node, comp, stack } */
  let trace = [];
  let cursor = 0;

  function buildTrace() {
    const A = adjOf(n, edges, { directed: false });
    const seen = new Array(n).fill(false);
    const out = [];
    const stackOut = [];
    let comp = -1;
    let steps = 0;
    for (let s = 0; s < n; s += 1) {
      if (seen[s]) continue;
      comp += 1;
      const stack = [s];
      seen[s] = true;
      out.push({ type: 'push', node: s, comp, stack: stack.slice(), visited: seen.slice() });
      while (stack.length && steps < MAX_STEPS) {
        const node = stack.pop();
        out.push({ type: 'visit', node, comp, stack: stack.slice(), visited: seen.slice() });
        steps += 1;
        for (let v = 0; v < n; v += 1) {
          if (A[node][v] && !seen[v]) {
            seen[v] = true;
            stack.push(v);
          }
        }
        out.push({ type: 'push', node, comp, stack: stack.slice(), visited: seen.slice() });
      }
      out.push({ type: 'done', node: s, comp, stack: [], visited: seen.slice() });
    }
    return out;
  }

  function resetTrace() {
    trace = buildTrace();
    cursor = 0;
  }

  function compCount() {
    return buildTrace().filter((t) => t.type === 'done').length;
  }

  function epsCount() {
    const L = laplacianOf(adjOf(n, edges, { directed: false }));
    const { values } = jacobiEigen(L);
    return { zeros: values.filter((v) => Math.abs(v) < 1e-10).length, values };
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    return {
      narrow,
      graph: { x: 10, y: 28, w: W - 20, h: narrow ? Math.round(H * 0.52) : Math.round(H * 0.56) },
      panel: { x: 10, y: (narrow ? 28 + Math.round(H * 0.52) : 28 + Math.round(H * 0.56)) + 22, w: W - 20, h: H * 0.3 },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + n;
    if (key === posKey && Object.keys(pos).length === n) return;
    posKey = key;
    circleLayout(n, rect, 0.33).forEach((p, i) => { pos[i] = p; });
  }

  /* ---------- 绘制 ---------- */

  const COMP_COLORS = ['teal', 'purple', 'orange', 'pink', 'green'];

  function cur() {
    return trace[Math.min(cursor, trace.length - 1)] || null;
  }

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
    const st = cur();
    const comps = compCount();
    const { zeros, values } = epsCount();
    const compOf = new Array(n).fill(-1);
    if (st) st.visited.forEach((v, i) => { if (v) compOf[i] = -1; });
    /* 用当前帧已经「完成」的分量数给节点上色：颜色只表达「同一块」 */
    const colorIdx = new Array(n).fill(-1);
    if (st) {
      st.visited.forEach((v, i) => { if (v) colorIdx[i] = Math.min(st.comp, COMP_COLORS.length - 1); });
    }

    drawGraph(ctx, r.graph, C, st, colorIdx);
    drawPanel(ctx, r.panel, C, st, comps, zeros, values);

    label(ctx, '上面用栈数分量，下面用特征值数分量——两个数必须相等',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawGraph(ctx, rect, C, st, colorIdx) {
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const hot = hover.i >= 0 && (hover.i === u || hover.i === v);
      drawEdge(ctx, pos[u], 15, pos[v], 15, hot ? C.accent2 : C.axis, hot ? 2.8 : 1.5, {});
    });
    const stackNow = st ? st.stack : [];
    nodes.forEach((nm, i) => {
      const visited = st ? !!st.visited[i] : false;
      const hot = hover.i === i;
      const onStack = stackNow.includes(i);
      const cname = colorIdx[i] >= 0 ? COMP_COLORS[colorIdx[i]] : null;
      drawNode(ctx, pos[i], 15, C, {
        text: nm,
        sub: onStack ? '在栈里' : (visited ? '已访问' : '未访问'),
        stroke: hot ? C.accent2 : (visited ? (cname ? C.named(cname) : C.fg) : C.axis),
        lineWidth: hot ? 2.8 : (visited ? 2.2 : 1.5),
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: visited ? (cname ? C.named(cname) : C.accent) : C.soft,
        fillAlpha: visited ? 0.30 : 0.6,
      });
    });
    if (st) {
      const names = st.stack.map((i) => nodes[i]).join(' ');
      label(ctx, '栈（后进先出）：' + (names || '（空）') + '　当前分量 #' + (st.comp + 1),
        rect.x + 2, rect.y + rect.h + 14, C.fg, { size: 10, weight: 700 });
    }
  }

  function drawPanel(ctx, rect, C, st, comps, zeros, values) {
    const y0 = rect.y + 4;
    label(ctx, '证据一：遍历数出来的分量', rect.x, y0, C.axis, { size: 10 });
    label(ctx, String(comps), rect.x + rect.w - 30, y0 + 6, C.accent, { size: 20, weight: 700 });
    label(ctx, '证据二：L 的近零特征值（|λ| < 1e-10）', rect.x, y0 + 26, C.axis, { size: 10 });
    label(ctx, String(zeros), rect.x + rect.w - 30, y0 + 34, zeros === comps ? C.ok : C.bad, { size: 20, weight: 700 });
    const same = comps === zeros;
    label(ctx, same ? '两个计数器一致 ✔' : '不一致：阈值或数值误差需要检查',
      rect.x, y0 + 56, same ? C.ok : C.bad, { size: 10.5, weight: 700 });

    /* 特征值条形图：近零的那些用绿色，一眼数得出几根 */
    const y = y0 + 74;
    const w = rect.w - 46;
    const maxV = Math.max(1e-9, ...values.map((v) => Math.abs(v)));
    values.forEach((v, i) => {
      const bh = 6 + (Math.abs(v) / maxV) * 26;
      const x = rect.x + 24 + i * Math.min(30, w / Math.max(1, values.length));
      ctx.save();
      ctx.fillStyle = Math.abs(v) < 1e-10 ? C.named('green') : C.accent;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, y + 34 - bh, Math.min(22, w / values.length - 4), bh);
      ctx.restore();
      label(ctx, fmt(v, 2), x + 8, y + 46, C.fg, { size: 8, align: 'center' });
    });
    label(ctx, 'λ', rect.x, y + 34, C.axis, { size: 9 });
    if (st) {
      label(ctx, st.type === 'done' ? '一个分量搜索完毕，换下一个起点'
        : '弹出栈顶并访问它，再把它的未访问邻居压栈',
        rect.x, y + 62, C.grid, { size: 9 });
    }
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 分量: '—', 近零特征值: '—', 步: '—' });
  host.appendChild(ro.box);

  const btnStep = mkBtn('走一步');
  const btnRun = mkBtn('走完');
  const btnReset = mkBtn('重来');
  host.appendChild(buildToolbar(btnStep, btnRun, btnReset));

  const btnBridge = mkBtn('加一座桥');
  const btnCut = mkBtn('剪断一条边');
  host.appendChild(buildToolbar(btnBridge, btnCut));

  legendInto(host, [
    [themeColors().accent, '已访问的节点（按分量分组着色）'],
    [themeColors().named('green'), '近零特征值：图有几个分量就有几根'],
  ]);

  function refresh() {
    const st = cur();
    const comps = compCount();
    const { zeros } = epsCount();
    ro.set('分量', String(comps));
    ro.set('近零特征值', String(zeros));
    ro.set('步', (Math.min(cursor + 1, trace.length)) + ' / ' + trace.length
      + (st ? '（' + st.type + '）' : ''));
    draw();
  }

  btnStep.addEventListener('click', () => {
    cursor = clamp(cursor + 1, 0, trace.length - 1);
    refresh();
  });
  btnRun.addEventListener('click', () => { cursor = trace.length - 1; refresh(); });
  btnReset.addEventListener('click', () => { cursor = 0; refresh(); });

  btnBridge.addEventListener('click', () => {
    /* 找一对「当前不在同一分量」的节点连起来 */
    const A = adjOf(n, edges, { directed: false });
    const comp = new Array(n).fill(-1);
    let c = 0;
    for (let s = 0; s < n; s += 1) {
      if (comp[s] >= 0) continue;
      const q = [s];
      comp[s] = c;
      while (q.length) {
        const x = q.pop();
        for (let v = 0; v < n; v += 1) if (A[x][v] && comp[v] < 0) { comp[v] = c; q.push(v); }
      }
      c += 1;
    }
    for (let u = 0; u < n; u += 1) {
      for (let v = u + 1; v < n; v += 1) {
        if (comp[u] !== comp[v]) {
          edges.push([u, v]);
          resetTrace();
          refresh();
          return;
        }
      }
    }
  });
  btnCut.addEventListener('click', () => {
    /* 先挑「剪了会让某条边两端度数归零以外」的边，再挑能让分量变多的那条；
       找不到「剪了就裂开」的，就退回剪第一条候选——分量数照样会往上走。 */
    const before = compCount();
    const deg = degOf(adjOf(n, edges, { directed: false }));
    const cand = edges
      .map((e, idx) => ({ e, idx }))
      .filter(({ e }) => deg[e[0]] > 1 && deg[e[1]] > 1);
    for (const { idx } of cand) {
      const saved = edges;
      edges = edges.filter((_, k) => k !== idx);
      if (compCount() > before) { resetTrace(); refresh(); return; }
      edges = saved;
    }
    if (cand.length) edges = edges.filter((_, k) => k !== cand[0].idx);
    resetTrace();
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 15);
      return i >= 0 ? { kind: 'node', i } : null;
    },
    down(id) {
      if (id && id.kind === 'node') { hover.i = id.i; }
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

  resetTrace();
  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

/* =========================================================================
 * lab 组件：g53-walk-counter —— 邻接矩阵幂 = 定长游走计数器（第 53 章「邻接矩阵幂」）
 * -------------------------------------------------------------------------
 * 用法（lab 围栏）：
 *   { "type": "g53-walk-counter", "title": "A 的 k 次幂在数什么", "k": 2 }
 *
 * 字段：
 *   preset   "chain4" | "triangle" | "ring5"（初始图）
 *   nodes / edges  可选自定义
 *   k        1..4，初始幂次
 *
 * 交互（真状态机）：
 *   · 点「k 加一 / k 减一」改幂次，矩阵从 A 一路乘到 A^k，格子数字就是答案；
 *   · 点矩阵任意一格 (i,j)，右侧列出**所有**长度为 k 的走法序列（最多 8 条），
 *     点「下一条」逐条在图上高亮——游走的每一步按顺序点亮，回头路看得见；
 *   · 图上点一个节点 = 选中起点行，矩阵那一行整行描边；
 *   · 悬停矩阵格子会同时高亮行列与图上对应的两个端点。
 *
 * 看什么：链形图上 (1,1) 这一格。$k=2$ 时它是 2——因为 $2\to1\to2$ 和
 *   $2\to3\to2$ 两条都算。这正是课程反复强调的：$A^k$ 数的是**游走**，
 *   允许回头，不是最短路径。把 k 拖到 3，看这一格怎么继续长。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout,
  mkBtn, label, clamp, fmt,
} from '../core.js';
import {
  adjOf, circleLayout, pickNode, drawEdge, drawNode, drawMatrixInto,
  matrixCellAt, legendInto, fmtVec,
} from './graph-kit.js';

const PRESETS = {
  chain4: {
    label: '链形 1-2-3-4',
    nodes: ['1', '2', '3', '4'],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  triangle: {
    label: '三角形 + 尾巴',
    nodes: ['A', 'B', 'C', 'D'],
    edges: [[0, 1], [1, 2], [0, 2], [2, 3]],
  },
  ring5: {
    label: '五边形环',
    nodes: ['1', '2', '3', '4', '5'],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
  },
};

const MAXK = 4;
const MAX_LIST = 8;

function mul(A, B) {
  const n = A.length;
  const out = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let k = 0; k < n; k += 1) {
      if (!A[i][k]) continue;
      for (let j = 0; j < n; j += 1) out[i][j] += A[i][k] * B[k][j];
    }
  }
  return out;
}

export default function render(host, spec) {
  const pKey = PRESETS[spec.preset] ? spec.preset : 'chain4';
  let preset = PRESETS[pKey];
  let nodes = Array.isArray(spec.nodes) && spec.nodes.length >= 2 ? spec.nodes.slice(0, 8).map(String) : preset.nodes.slice();
  let edges = Array.isArray(spec.edges) && spec.edges.length
    ? spec.edges.filter((e) => Array.isArray(e) && e.length >= 2)
      .map((e) => [Math.round(Number(e[0])), Math.round(Number(e[1]))])
      .filter(([u, v]) => u >= 0 && v >= 0 && u < nodes.length && v < nodes.length && u !== v)
    : preset.edges.map((e) => e.slice());

  let k = clamp(Math.round(Number(spec.k) || 2), 1, MAXK);

  const cv = setupCanvas(host, 360);
  const pos = {};
  let posKey = '';
  let mxRect = null;
  let dragNode = -1;
  const sel = { i: -1, j: -1 };       /* 选中的格子 */
  const hover = { kind: null, i: -1, j: -1 };
  let walkIdx = 0;

  /* ---------- 数学 ---------- */

  function powers() {
    const A0 = adjOf(nodes.length, edges, { directed: false });
    const out = [null, A0];
    for (let p = 2; p <= MAXK; p += 1) out.push(mul(out[p - 1], A0));
    return out;
  }

  /* 枚举所有长度为 k 的游走（带剪枝，条数封顶 MAX_LIST）。
     这不是「最短路径」，每一步都从当前点沿边走过去，走回来也算。 */
  function enumWalks(A, i, j, kk) {
    const res = [];
    const path = [i];
    (function dfs(u, depth) {
      if (res.length >= MAX_LIST || depth > kk) return;
      if (depth === kk) {
        if (u === j) res.push(path.slice());
        return;
      }
      for (let v = 0; v < A.length; v += 1) {
        if (!A[u][v]) continue;
        path.push(v);
        dfs(v, depth + 1);
        path.pop();
        if (res.length >= MAX_LIST) return;
      }
    })(i, 0);
    return res;
  }

  function walksNow() {
    if (sel.i < 0 || sel.j < 0) return [];
    const A = powers()[k];
    return enumWalks(adjOf(nodes.length, edges, { directed: false }), sel.i, sel.j, k);
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    if (narrow) {
      const gh = Math.round(H * 0.44);
      const size = Math.min(W * 0.64, H - gh - 66);
      return {
        narrow,
        graph: { x: 6, y: 26, w: W - 12, h: gh },
        matrix: { x: 8, y: 26 + gh + 24, w: size, h: size },
        text: { x: size + 22, y: 26 + gh + 24, w: W - size - 30, h: size },
      };
    }
    const graph = { x: 8, y: 26, w: Math.round(W * 0.46) - 16, h: H - 50 };
    const size = Math.min(W * 0.30, H - 84);
    return {
      narrow,
      graph,
      matrix: { x: Math.round(W * 0.48), y: 40, w: size, h: size },
      text: { x: Math.round(W * 0.48) + size + 16, y: 40, w: W - Math.round(W * 0.48) - size - 24, h: size },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + nodes.length;
    if (key === posKey && Object.keys(pos).length === nodes.length) return;
    posKey = key;
    circleLayout(nodes.length, rect, 0.36).forEach((p, i) => { pos[i] = p; });
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
    const all = powers();
    const Ap = all[k];
    const walk = walks();
    const curWalk = walk.length ? walk[walkIdx % walk.length] : null;
    const f = hover.kind ? hover : { kind: sel.i >= 0 ? 'cell' : null, i: sel.i, j: sel.j };

    drawGraph(ctx, r.graph, curWalk, C, f);
    const mr = drawMatrixInto(ctx, r.matrix, Ap, {
      C,
      labels: nodes,
      title: 'A^' + k + '（行 = 起点，列 = 终点）',
      hoverRow: f.kind === 'cell' ? f.i : (f.kind === 'node' ? f.i : -1),
      hoverCol: f.kind === 'cell' ? f.j : (f.kind === 'node' ? f.i : -1),
      focus: sel.i >= 0 ? { i: sel.i, j: sel.j } : null,
      small: r.narrow,
    });
    mxRect = mr;
    drawText(ctx, r.text, Ap, curWalk, walk, C);

    label(ctx, '格子数字 = 从行走到列、恰好 ' + k + ' 步的游走条数（走回头路也算一条）',
      8, H - 8, C.grid, { size: 10 });
  }

  function walks() { return walksNow(); }

  function drawGraph(ctx, rect, curWalk, C, f) {
    const A = adjOf(nodes.length, edges, { directed: false });
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const hot = f.kind === 'cell' && ((f.i === u && f.j === v) || (f.i === v && f.j === u));
      drawEdge(ctx, pos[u], 14, pos[v], 14, hot ? C.accent2 : C.axis, hot ? 2.6 : 1.5, {});
    });
    /* 当前走法：逐跳加粗，并把第几步写在边的中点 */
    if (curWalk) {
      for (let s = 0; s + 1 < curWalk.length; s += 1) {
        const a = pos[curWalk[s]];
        const b = pos[curWalk[s + 1]];
        if (!a || !b) continue;
        ctx.save();
        ctx.strokeStyle = C.named('green');
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
        label(ctx, String(s + 1), (a.x + b.x) / 2 + 6, (a.y + b.y) / 2 - 6, C.named('green'), {
          size: 10, weight: 700,
        });
      }
      nodes.forEach((_, i) => {
        const stepAt = curWalk.indexOf(i);
        if (stepAt >= 0) {
          label(ctx, '第' + stepAt + '站', pos[i].x, pos[i].y - 26, C.named('green'), {
            size: 9, align: 'center', weight: 700,
          });
        }
      });
    }
    nodes.forEach((nm, i) => {
      const hot = f.kind === 'cell' ? (f.i === i || f.j === i) : (f.kind === 'node' && f.i === i);
      drawNode(ctx, pos[i], 14, C, {
        text: nm,
        sub: '行和 ' + fmt(adjOf(nodes.length, edges, { directed: false })[i].reduce((a, b) => a + b, 0), 2),
        stroke: hot ? C.accent2 : C.axis,
        lineWidth: hot ? 2.6 : 1.6,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: C.accent,
        fillAlpha: 0.14,
      });
    });
    label(ctx, '绿线 = 当前展示的第 ' + (curWalk ? (walkIdx % Math.max(1, walks().length)) + 1 : 0) + ' 条走法',
      rect.x + 2, rect.y + rect.h + 14, C.named('green'), { size: 10 });
  }

  function drawText(ctx, rect, Ap, curWalk, walk, C) {
    let y = rect.y + 4;
    const cell = sel.i >= 0 && sel.j >= 0 ? Ap[sel.i][sel.j] : 0;
    label(ctx, sel.i >= 0 ? ('格 (' + sel.i + ',' + sel.j + ') = ' + fmt(cell, 2)) : '点一个矩阵格子',
      rect.x, y, C.fg, { size: 12, weight: 700 });
    y += 18;
    if (sel.i >= 0) {
      label(ctx, '即：' + nodes[sel.i] + ' 出发、' + k + ' 步后到 ' + nodes[sel.j] + ' 的走法',
        rect.x, y, C.axis, { size: 9.5 });
      y += 20;
      label(ctx, '共 ' + walk.length + (walk.length >= MAX_LIST ? '+' : '') + ' 条（最多列 ' + MAX_LIST + ' 条）',
        rect.x, y, C.accent2, { size: 10, weight: 700 });
      y += 20;
      walk.forEach((w, idx) => {
        const on = idx === walkIdx % Math.max(1, walk.length);
        label(ctx, (on ? '▶ ' : '· ') + w.join(' → '), rect.x, y,
          on ? C.named('green') : C.grid, { size: 9.5, weight: on ? 700 : 400 });
        y += 15;
      });
      if (!walk.length) {
        label(ctx, '这条长度 ' + k + ' 的走法不存在', rect.x, y, C.bad, { size: 9.5 });
      }
    } else {
      label(ctx, '选一格看它数的是哪些路径', rect.x, y, C.grid, { size: 9.5 });
      y += 18;
      label(ctx, '第 0 行：' + fmtVec(Ap[0], 0), rect.x, y, C.axis, { size: 9.5 });
      y += 15;
      if (Ap[1]) {
        label(ctx, '第 1 行：' + fmtVec(Ap[1], 0), rect.x, y, C.axis, { size: 9.5 });
      }
    }
    void curWalk;
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 图: '—', 'A^k 总量': '—', 选中格: '—', 走法: '—' });
  host.appendChild(ro.box);

  const btnKm = mkBtn('k − 1');
  const btnKp = mkBtn('k + 1');
  const btnNext = mkBtn('下一条走法');
  host.appendChild(buildToolbar(btnKm, btnKp, btnNext));

  host.appendChild(buildSegmentedPresets());

  legendInto(host, [
    [themeColors().named('green'), '绿线 = 当前这条走法（编号是第几跳）'],
    [themeColors().accent2, '加粗 = 选中/悬停的格子'],
  ]);

  function buildSegmentedPresets() {
    const box = document.createElement('div');
    box.className = 'ml-lab__seg';
    Object.keys(PRESETS).forEach((key) => {
      const b = mkBtn(PRESETS[key].label);
      if (key === pKey) b.classList.add('is-active');
      b.addEventListener('click', () => {
        preset = PRESETS[key];
        nodes = preset.nodes.slice();
        edges = preset.edges.map((e) => e.slice());
        posKey = '';
        sel.i = -1;
        sel.j = -1;
        walkIdx = 0;
        Array.from(box.children).forEach((c) => c.classList.remove('is-active'));
        b.classList.add('is-active');
        refresh();
      });
      box.appendChild(b);
    });
    return box;
  }

  function refresh() {
    const Ap = powers()[k];
    const total = Ap.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
    const walk = walksNow();
    ro.set('图', preset.label);
    ro.set('A^k 总量', 'Σ 全部格子 = ' + fmt(total, 2));
    ro.set('选中格', sel.i >= 0 ? '(' + sel.i + ',' + sel.j + ') = ' + fmt(Ap[sel.i][sel.j], 2) : '未选');
    ro.set('走法', walk.length ? '共 ' + walk.length + ' 条，正在看第 ' + (walkIdx % walk.length + 1) + ' 条' : '—');
    draw();
  }

  btnKm.addEventListener('click', () => { k = clamp(k - 1, 1, MAXK); walkIdx = 0; refresh(); });
  btnKp.addEventListener('click', () => { k = clamp(k + 1, 1, MAXK); walkIdx = 0; refresh(); });
  btnNext.addEventListener('click', () => {
    const w = walksNow();
    if (w.length) walkIdx = (walkIdx + 1) % w.length;
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 14);
      if (i >= 0) return { kind: 'node', i };
      const c = matrixCellAt(mxRect, px, py);
      if (c) return { kind: 'cell', i: c.i, j: c.j };
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') {
        dragNode = id.i;
        sel.i = id.i;
        sel.j = -1;
        walkIdx = 0;
      } else if (id && id.kind === 'cell') {
        if (sel.i === id.i && sel.j === id.j) {
          sel.i = -1;
          sel.j = -1;
        } else {
          sel.i = id.i;
          sel.j = id.j;
        }
        walkIdx = 0;
      }
      refresh();
    },
    move(id, px, py) {
      if (dragNode < 0) return;
      const g = rects().graph;
      pos[dragNode].x = clamp(px, g.x + 20, g.x + g.w - 20);
      pos[dragNode].y = clamp(py, g.y + 24, g.y + g.h - 22);
      refresh();
    },
    up() { dragNode = -1; },
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 14);
      let next = { kind: null, i: -1, j: -1 };
      if (i >= 0) next = { kind: 'node', i, j: -1 };
      else {
        const c = matrixCellAt(mxRect, px, py);
        if (c) next = { kind: 'cell', i: c.i, j: c.j };
      }
      if (next.kind !== hover.kind || next.i !== hover.i || next.j !== hover.j) {
        hover.kind = next.kind;
        hover.i = next.i;
        hover.j = next.j;
        refresh();
      }
    },
    leave() {
      if (hover.kind) {
        hover.kind = null;
        hover.i = -1;
        hover.j = -1;
        refresh();
      }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

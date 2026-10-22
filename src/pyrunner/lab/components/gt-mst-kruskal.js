/* =========================================================================
 * lab 组件：gt-mst-kruskal —— 每一步都问：这条边会不会成环？
 * -------------------------------------------------------------------------
 * 用法（第 29 章《生成树与最小生成树》动手实验）：
 *   { "type": "gt-mst-kruskal", "title": "…" }
 * 字段（都可省）：edges 带权边 [[u,v,w],…]（默认抄课文 5 条）；
 *   height 画布高度（默认 540）。
 *
 * 边按权升序排队，逐条尝试：并查集（union-find）当场回答「两端是否已连通」。
 *   · 不会成环 → 收进生成树（绿色加粗），面板记一笔「接受」与累计代价；
 *   · 会成环 → 拒绝（红色虚线），并写明「两端已在同一棵树里」。
 * 右侧队列里当前这条被高亮，上下两步可回退；「播放」会自动走完。
 * 全程结束时，接受 n−1 条边、代价最小，这就是 Kruskal 的贪心凭证。
 * 另有 Prim 对照按钮：从起点出发每次取「跨出已选集合的最便宜边」——
 *   两种贪心选的边不同，总代价一定相同（可以换着看）。
 *
 * 取舍：图固定 4–6 点、边 ≤ 9，权重为整数，画布上直接标数字；
 *   并查集现算，不保存中间结论。同一组权重可能有多个 MST，本组件只展示一条。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout,
  mkBtn, label, clearBg, polyline, clamp,
} from '../core.js';

const DEF_EDGES = [['A', 'B', 1], ['B', 'C', 2], ['A', 'C', 3], ['C', 'D', 4], ['B', 'D', 5]];

export default function render(host, spec) {
  const raw = Array.isArray(spec.edges) && spec.edges.length
    ? spec.edges.filter((e) => Array.isArray(e) && e.length === 3 && Number.isFinite(Number(e[2])))
      .map((e) => [String(e[0]), String(e[1]), Math.round(Number(e[2]))])
    : DEF_EDGES.slice();
  const edges = raw.slice(0, 12);

  const nodes = [];
  edges.forEach(([u, v]) => {
    if (!nodes.includes(u)) nodes.push(u);
    if (!nodes.includes(v)) nodes.push(v);
  });

  const sorted = edges.map((e, i) => ({ u: e[0], v: e[1], w: e[2], idx: i })).sort((a, b) => a.w - b.w || a.idx - b.idx);

  /* 预演一遍，得到每一步的快照（接受/拒绝 + 累计代价 + 已选边） */
  function runKruskal() {
    const parent = {};
    nodes.forEach((n) => { parent[n] = n; });
    const find = (x) => { let y = x; while (parent[y] !== y) y = parent[y]; return y; };
    const steps = [];
    let total = 0;
    const chosen = [];
    sorted.forEach((e) => {
      const ru = find(e.u);
      const rv = find(e.v);
      const accept = ru !== rv;
      if (accept) {
        parent[rv] = ru;
        chosen.push(e.idx);
        total += e.w;
      }
      steps.push({ edge: e, accept, total, chosen: chosen.slice(), ru, rv });
    });
    return { steps, total, chosen };
  }
  const K = runKruskal();

  function runPrim(startNode) {
    const inTree = new Set([startNode]);
    const order = [];
    const chosen = [];
    let total = 0;
    while (inTree.size < nodes.length) {
      let best = null;
      edges.forEach((e, i) => {
        const [u, v, w] = e;
        const aIn = inTree.has(u);
        const bIn = inTree.has(v);
        if (aIn === bIn) return;
        if (!best || w < best.w) best = { u, v, w, i };
      });
      if (!best) break;
      const add = inTree.has(best.u) ? best.v : best.u;
      inTree.add(add);
      chosen.push(best.i);
      total += best.w;
      order.push(best.i);
    }
    return { chosen, total, order };
  }

  let mode = 'kruskal';
  let step = 0;      /* 已处理的边条数 */
  let prim = null;

  const cv = setupCanvas(host, spec.height || 540);
  const ro = buildReadout({
    模式: '—',
    当前边: '—',
    判定: '—',
    '累计代价': '—',
    '已选边数': '—',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('尝试下一条 ▶');
  const bBack = mkBtn('◀ 回退一条');
  const bPlayAll = mkBtn('一次走完');
  const bPrim = mkBtn('切到 Prim 看一遍');
  host.appendChild(buildToolbar(bStep, bBack, bPlayAll, bPrim));

  const geo = { W: 0, H: 0, cx: 0, cy: 0, R: 0, pos: {} };

  function layout(W, H) {
    geo.W = W;
    geo.H = H;
    geo.cx = W >= 640 ? Math.min(W * 0.31, 240) : W / 2;
    geo.cy = W >= 640 ? H * 0.46 : H * 0.36;
    geo.R = W >= 640 ? Math.min(W * 0.2, H * 0.29) : Math.min(W * 0.31, H * 0.22);
    geo.pos = {};
    nodes.forEach((n, i) => {
      const ang = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      geo.pos[n] = { x: geo.cx + Math.cos(ang) * geo.R, y: geo.cy + Math.sin(ang) * geo.R * 0.9 };
    });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    const done = Math.min(step, K.steps.length);
    const cur = done > 0 ? K.steps[done - 1] : null;
    const chosenSet = new Set(cur ? cur.chosen : []);
    const rejected = new Set();
    for (let i = 0; i < done; i += 1) if (!K.steps[i].accept) rejected.add(K.steps[i].edge.idx);

    label(ctx, 'Kruskal：边按权升序排队，逐条问「会不会成环」', 16, 26, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '绿实线 = 已收进生成树；红虚线 = 因成环被拒；灰细线 = 还没轮到的候选', 16, 46, C.axis,
      { size: 10.5 });

    /* ---- 边 ---- */
    edges.forEach(([u, v, w], i) => {
      const a = geo.pos[u];
      const b = geo.pos[v];
      if (!a || !b) return;
      const isChosen = chosenSet.has(i);
      const isRejected = rejected.has(i);
      const isCur = cur && cur.edge.idx === i;
      polyline(ctx, [[a.x, a.y], [b.x, b.y]],
        isChosen ? C.ok : (isRejected ? C.bad : C.grid),
        isCur ? 4.6 : (isChosen ? 3.4 : (isRejected ? 2 : 1.3)),
        isRejected ? [5, 4] : null);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.save();
      ctx.fillStyle = isChosen ? C.ok : (isRejected ? C.bad : C.soft);
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.arc(mx, my, isCur ? 13 : 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isCur ? C.fg : C.grid;
      ctx.lineWidth = isCur ? 2.2 : 1;
      ctx.stroke();
      ctx.restore();
      label(ctx, String(w), mx, my + 4, (isChosen || isRejected) ? C.bg : C.fg,
        { size: 11, align: 'center', weight: 700 });
    });

    /* ---- 顶点 ---- */
    nodes.forEach((n) => {
      const p = geo.pos[n];
      ctx.save();
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.stroke();
      ctx.restore();
      label(ctx, n, p.x, p.y + 5, C.bg, { size: 13, align: 'center', weight: 700 });
    });

    /* ---- 队列 ---- */
    const px = geo.W >= 640 ? Math.min(geo.W - 210, geo.cx + geo.R + 46) : 16;
    let py = geo.W >= 640 ? 82 : geo.H - 210;

    label(ctx, '按权排序的候选队列', px, py, C.fg, { size: 11.5, weight: 700 });
    py += 16;
    sorted.forEach((e, i) => {
      const processed = i < done;
      const s2 = K.steps[i];
      const isCur = i === done - 1 && done > 0;
      const mark = processed ? (s2.accept ? '✓ 收下' : '✗ 成环') : '待定';
      label(ctx, (i + 1) + '. ' + e.u + '—' + e.v + '  w=' + e.w, px, py,
        isCur ? C.accent : (processed ? C.fg : C.axis), { size: 10.5, weight: isCur ? 700 : 400 });
      label(ctx, mark, px + 132, py,
        processed ? (s2.accept ? C.ok : C.bad) : C.axis, { size: 10 });
      py += 15;
    });

    py += 8;
    const total = cur ? cur.total : 0;
    label(ctx, '已选 ' + chosenSet.size + ' 条边，累计代价 ' + total, px, py, C.fg,
      { size: 11.5, weight: 700 });
    py += 17;
    if (chosenSet.size === nodes.length - 1) {
      label(ctx, '已够 n − 1 = ' + (nodes.length - 1) + ' 条：生成树完成，代价 ' + K.total + ' 最小',
        px, py, C.ok, { size: 10.5, weight: 700 });
    } else {
      label(ctx, '还差 ' + (nodes.length - 1 - chosenSet.size) + ' 条才连成树', px, py, C.axis, { size: 10 });
    }

    if (cur) {
      py += 22;
      label(ctx, '刚刚这条 ' + cur.edge.u + '—' + cur.edge.v + '（w=' + cur.edge.w + '）：',
        px, py, C.fg, { size: 10.5, weight: 700 });
      py += 15;
      label(ctx, cur.accept
        ? '两端分属不同的树，收下不会成环 → 安全边'
        : '两端已在同一棵树里，收下必成环 → 拒绝',
        px, py, cur.accept ? C.ok : C.bad, { size: 10 });
    }

    /* Prim 对照 */
    if (mode === 'prim' && prim) {
      py += 24;
      label(ctx, 'Prim（从 ' + nodes[0] + ' 出发）', px, py, C.named('orange'), { size: 11.5, weight: 700 });
      py += 16;
      label(ctx, '选的边：' + prim.order.map((i) => edges[i][0] + '—' + edges[i][1]).join('、'),
        px, py, C.axis, { size: 10 });
      py += 14;
      label(ctx, '总代价 ' + prim.total + '（与 Kruskal 相同；选的边可能不同）',
        px, py, C.named('orange'), { size: 10 });
    }

    ro.set('模式', mode === 'prim' ? 'Prim 对照' : 'Kruskal');
    ro.set('当前边', cur ? cur.edge.u + '—' + cur.edge.v + '（w=' + cur.edge.w + '）' : '尚未开始');
    ro.set('判定', cur ? (cur.accept ? '收下（安全边）' : '拒绝（成环）') : '—');
    ro.set('累计代价', String(total));
    ro.set('已选边数', chosenSet.size + ' / ' + (nodes.length - 1));
  }

  bStep.addEventListener('click', () => { step = Math.min(step + 1, K.steps.length); draw(); });
  bBack.addEventListener('click', () => { step = Math.max(step - 1, 0); draw(); });
  bPlayAll.addEventListener('click', () => { step = K.steps.length; draw(); });
  bPrim.addEventListener('click', () => {
    mode = mode === 'prim' ? 'kruskal' : 'prim';
    prim = mode === 'prim' ? runPrim(nodes[0]) : null;
    bPrim.textContent = mode === 'prim' ? '切回 Kruskal' : '切到 Prim 看一遍';
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}

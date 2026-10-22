/* =========================================================================
 * lab 组件：gt-coloring —— 回溯搜索给顶点上色，冲突当场报警
 * -------------------------------------------------------------------------
 * 用法（第 29 章《图着色与色数》动手实验）：
 *   { "type": "gt-coloring", "title": "…" }
 * 字段（都可省）：nodes 顶点；edges 边；k 调色板大小（2–4，默认 3）；
 *   height 画布高度（默认 540）。
 *
 * 三件事可分别触发，顺序由你定：
 *   1. 手动上色：点顶点循环换色（未上色 → 1 → 2 → … → 未上色），冲突边立刻变红打 ✕；
 *   2. 自动回溯：按度数从高到低 DFS，某色冲突就换一个，试遍就撤销上一个点的颜色——
 *      画面上能看到「某点颜色被清空」，那正是搜索在退回去；
 *   3. 色数探针：k = 1,2,3,4 逐个试，第一个走通的 k 就是色数 χ，并给出贪心用色作对照。
 * 颜色之外每个点下面还写着「色 n / 未上色」，暗色模式与色觉差异下同样可读。
 *
 * 取舍：顶点 ≤ 8；回溯是迭代版（显式决策栈），带步数上限，不会卡死浏览器。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, buildSegmented,
  mkBtn, label, clearBg, polyline, clamp,
} from '../core.js';

const DEF_NODES = ['A', 'B', 'C', 'D', 'E'];
const DEF_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'], ['A', 'C']];

export default function render(host, spec) {
  const nodes = Array.isArray(spec.nodes) && spec.nodes.length ? spec.nodes.map(String).slice(0, 8) : DEF_NODES.slice();
  const edges = (Array.isArray(spec.edges) && spec.edges.length
    ? spec.edges.filter((e) => Array.isArray(e) && e.length === 2).map((e) => [String(e[0]), String(e[1])])
    : DEF_EDGES.slice()).filter(([u, v]) => nodes.includes(u) && nodes.includes(v));

  let k = clamp(Math.round(spec.k || 3), 2, 4);
  const color = {};
  nodes.forEach((n) => { color[n] = 0; });

  let log = [];
  let chi = null;
  let chiGreedy = null;

  const deg = (n) => edges.reduce((acc, [u, v]) => acc + (u === n || v === n ? 1 : 0), 0);
  /* 回溯顺序：度大的先上色，冲突更早暴露 */
  const order = nodes.slice().sort((a, b) => deg(b) - deg(a));

  const cv = setupCanvas(host, spec.height || 540);
  const ro = buildReadout({
    '调色板 k': '—',
    冲突边: '—',
    已上色: '—',
    贪心用色: '—',
    '色数 χ': '—',
    搜索结果: '—',
  });
  host.appendChild(ro.box);

  const bAuto = mkBtn('自动回溯一步');
  const bAutoAll = mkBtn('一次跑完');
  const bProbe = mkBtn('探测色数 χ');
  const bClear = mkBtn('全部擦掉');
  host.appendChild(buildToolbar(bAuto, bAutoAll, bProbe, bClear));
  host.appendChild(buildSegmented(
    [{ label: '2 色', value: '2' }, { label: '3 色', value: '3' }, { label: '4 色', value: '4' }],
    String(k),
    (v) => {
      k = Number(v);
      nodes.forEach((n) => { color[n] = 0; });
      log = [];
      chi = null;
      chiGreedy = null;
      draw();
    },
  ));

  const geo = { W: 0, H: 0, pos: {}, R: 0, cx: 0, cy: 0 };

  function layout(W, H) {
    geo.W = W;
    geo.H = H;
    geo.cx = W >= 640 ? Math.min(W * 0.32, 250) : W / 2;
    geo.cy = W >= 640 ? H * 0.46 : H * 0.37;
    geo.R = W >= 640 ? Math.min(W * 0.2, H * 0.29) : Math.min(W * 0.31, H * 0.22);
    geo.pos = {};
    nodes.forEach((n, i) => {
      const ang = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      geo.pos[n] = { x: geo.cx + Math.cos(ang) * geo.R, y: geo.cy + Math.sin(ang) * geo.R * 0.9 };
    });
  }

  const conflicts = () => edges.filter(([u, v]) => color[u] !== 0 && color[u] === color[v]);

  /* ---- 迭代回溯：显式决策栈，每次调用推进一个决策点 ---- */
  let stack = [];     /* [{node, next}]：next = 下一个待尝试的颜色 */
  let exhausted = false;
  let solved = false;

  function resetSearch() {
    stack = [];
    exhausted = false;
    /* solved 与 exhausted 必须是两个状态：两者都被置为「不能继续推进」，
       但含义相反——solved 是全部点都上色成功，exhausted 是 k 种颜色不够用。
       原代码只用 exhausted 一个标志，于是「k 不够」这件事从不上屏，
       课文承诺的「或判定这个 k 不够」永远不出现。 */
    solved = false;
    nodes.forEach((n) => { color[n] = 0; });
    log = [];
  }

  /* 返回 true 表示还能继续推进（尚未判定完成/失败） */
  function btStep() {
    if (exhausted) return false;
    /* 第一个未上色的点（按 order） */
    const n = order.find((x) => color[x] === 0);
    if (!n) {
      exhausted = true;
      solved = true;
      return false;
    }
    /* 该点的起点颜色：若栈顶正好是它，就从上次的下一个颜色继续 */
    let start = 1;
    if (stack.length && stack[stack.length - 1].node === n) {
      start = stack[stack.length - 1].next;
      stack.pop();
    }
    for (let c = start; c <= k; c += 1) {
      const ok = !edges.some(([u, v]) => (u === n && color[v] === c) || (v === n && color[u] === c));
      if (ok) {
        color[n] = c;
        stack.push({ node: n, next: c + 1 });
        log.push({ kind: 'place', node: n, c });
        return true;
      }
      log.push({ kind: 'try', node: n, c });
    }
    /* 这个点无颜色可用：撤销上一个决策点的颜色，退回它的下一个候选 */
    color[n] = 0;
    while (stack.length) {
      const top = stack.pop();
      color[top.node] = 0;
      log.push({ kind: 'back', node: top.node });
      if (top.next <= k) {
        stack.push(top);
        return true;
      }
    }
    exhausted = true;
    return false;
  }

  function greedy() {
    const col = {};
    nodes.forEach((n) => { col[n] = 0; });
    let used = 0;
    order.forEach((n) => {
      const banned = new Set();
      edges.forEach(([u, v]) => {
        if (u === n && col[v]) banned.add(col[v]);
        if (v === n && col[u]) banned.add(col[u]);
      });
      let c = 1;
      while (banned.has(c)) c += 1;
      col[n] = c;
      used = Math.max(used, c);
    });
    return used;
  }

  /* 固定 k 的完整递归求解（只用于探针，规模很小） */
  function solvable(kk) {
    const col = {};
    nodes.forEach((n) => { col[n] = 0; });
    const rec = (guard) => {
      if (guard > 3000) return false;
      const n = order.find((x) => col[x] === 0);
      if (!n) return true;
      for (let c = 1; c <= kk; c += 1) {
        if (edges.some(([u, v]) => (u === n && col[v] === c) || (v === n && col[u] === c))) continue;
        col[n] = c;
        if (rec(guard + 1)) return true;
        col[n] = 0;
      }
      return false;
    };
    return rec(0);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    const bad = conflicts();
    const badSet = new Set(bad.map(([u, v]) => u + '|' + v));
    const colored = nodes.filter((n) => color[n] > 0).length;

    label(ctx, '点顶点循环换色；相邻两点同色时，那条边立刻变红并打 ✕', 16, 26, C.fg,
      { size: 12.5, weight: 700 });
    label(ctx, '自动回溯真的会撤销：看到某个点的颜色被清空，就是搜索在退回去换一个', 16, 46, C.axis,
      { size: 10.5 });

    edges.forEach(([u, v]) => {
      const a = geo.pos[u];
      const b = geo.pos[v];
      if (!a || !b) return;
      const isBad = badSet.has(u + '|' + v) || badSet.has(v + '|' + u);
      polyline(ctx, [[a.x, a.y], [b.x, b.y]], isBad ? C.bad : C.grid, isBad ? 3.4 : 1.4);
      if (isBad) label(ctx, '✕', (a.x + b.x) / 2, (a.y + b.y) / 2 + 4, C.bad, { size: 13, align: 'center', weight: 700 });
    });

    nodes.forEach((n) => {
      const p = geo.pos[n];
      const c = color[n];
      ctx.save();
      ctx.fillStyle = c === 0 ? C.soft : C.series(c - 1);
      ctx.globalAlpha = c === 0 ? 0.7 : 0.92;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.stroke();
      ctx.restore();
      label(ctx, n, p.x, p.y + 5, c === 0 ? C.fg : C.bg, { size: 13, align: 'center', weight: 700 });
      label(ctx, c === 0 ? '未上色' : '色 ' + c, p.x, p.y + 34, c === 0 ? C.axis : C.series(c - 1),
        { size: 9.5, align: 'center', weight: 700 });
      label(ctx, '度 ' + deg(n), p.x, p.y - 25, C.axis, { size: 9, align: 'center' });
    });

    const px = geo.W >= 660 ? Math.min(geo.W - 210, geo.W * 0.66) : 16;
    let py = geo.W >= 660 ? 84 : geo.H - 214;

    label(ctx, '状态', px, py, C.fg, { size: 12, weight: 700 });
    py += 18;
    label(ctx, '调色板 k = ' + k + '，已上色 ' + colored + ' / ' + nodes.length, px, py, C.fg, { size: 11 });
    py += 17;
    label(ctx, bad.length
      ? '冲突边 ' + bad.length + ' 条：相邻两点同色'
      : (colored === nodes.length ? '无冲突：这是一个正常 ' + k + '-着色' : '目前没有冲突'),
    px, py, bad.length ? C.bad : C.ok, { size: 11, weight: 700 });
    py += 22;
    label(ctx, '贪心（按度降序）用色 = ' + greedy(), px, py, C.axis, { size: 10.5 });
    py += 16;
    label(ctx, '色数 χ = ' + (chi === null ? '（点「探测色数」）' : String(chi)), px, py,
      C.named('orange'), { size: 11.5, weight: 700 });
    py += 15;
    if (chi !== null) {
      label(ctx, '贪心 ' + chiGreedy + ' 色 ≥ χ = ' + chi + '：贪心不保证最优', px, py, C.axis, { size: 10 });
      py += 14;
    }

    py += 8;
    label(ctx, '回溯轨迹（最近 6 条）', px, py, C.fg, { size: 10.5, weight: 700 });
    py += 15;
    log.slice(-6).forEach((l) => {
      const txt = l.kind === 'place' ? '给 ' + l.node + ' 上色 ' + l.c
        : (l.kind === 'back' ? '撤销 ' + l.node + ' 的颜色（退回去换）' : l.node + ' ← 色 ' + l.c + ' 冲突，换下一个');
      label(ctx, txt, px, py, l.kind === 'back' ? C.bad : C.axis, { size: 9.5 });
      py += 13;
    });

    ro.set('调色板 k', String(k));
    ro.set('冲突边', bad.length + ' 条');
    ro.set('已上色', colored + ' / ' + nodes.length);
    ro.set('贪心用色', String(greedy()));
    ro.set('色数 χ', chi === null ? '未探测' : String(chi));
    /* k 够不够用，必须明确上屏：这是课文「或判定这个 k 不够」承诺的那句话。 */
    let verdict = '待搜索';
    if (solved) verdict = k + ' 色够用（' + colored + '/' + nodes.length + ' 全部上色）';
    else if (exhausted) verdict = k + ' 色不够（已穷尽全部配色方案）';
    else if (colored > 0) verdict = '搜索中 ' + colored + '/' + nodes.length;
    ro.set('搜索结果', verdict);
  }

  const hitNode = (x0, y0) => {
    let best = null;
    let bd = 26;
    nodes.forEach((n) => {
      const p = geo.pos[n];
      const d = Math.hypot(p.x - x0, p.y - y0);
      if (d < bd) { bd = d; best = n; }
    });
    return best;
  };

  function cycleColor(n) {
    color[n] = (color[n] + 1) % (k + 1);
    log.push({ kind: color[n] ? 'place' : 'back', node: n, c: color[n] });
  }

  cv.canvas.style.cursor = 'pointer';
  cv.canvas.addEventListener('click', (ev) => {
    const r = cv.canvas.getBoundingClientRect();
    const n = hitNode(ev.clientX - r.left, ev.clientY - r.top);
    if (!n) return;
    cycleColor(n);
    draw();
  });

  bAuto.addEventListener('click', () => { btStep(); draw(); });
  bAutoAll.addEventListener('click', () => {
    resetSearch();
    let guard = 0;
    while (guard < 800) {
      if (!btStep()) break;
      guard += 1;
    }
    draw();
  });
  bProbe.addEventListener('click', () => {
    chiGreedy = greedy();
    chi = null;
    for (let kk = 1; kk <= 4; kk += 1) {
      if (solvable(kk)) { chi = kk; break; }
    }
    draw();
  });
  bClear.addEventListener('click', () => { resetSearch(); chi = null; chiGreedy = null; draw(); });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}

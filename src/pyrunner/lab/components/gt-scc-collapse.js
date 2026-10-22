/* =========================================================================
 * lab 组件：gt-scc-collapse —— 强连通分量收缩成一团，缩点后必是 DAG
 * -------------------------------------------------------------------------
 * 用法（第 29 章《强连通分量：有向图的抱团地图》动手实验）：
 *   { "type": "gt-scc-collapse", "title": "…" }
 * 字段（都可省）：nodes 顶点；edges 有向边；height 画布高度（默认 540）。
 *
 * 两遍 DFS 的 Kosaraju 真的跑一遍：
 *   第一遍在原图上记「收工顺序」，第二遍在反图上从最晚收工的点开始圈人；
 *   每个分量当场染色，并在右侧列出它的成员。
 * 滑杆「收缩程度 0→1」把同一分量的点吸向它们的重心、分量间只留一条代表边：
 *   收缩完成时，你看到的就是缩点图（condensation），它一定是 DAG。
 * 点「补一条 F→B」这样的回边，两块会立刻融成一块——单向边是唯一的隔墙。
 *
 * 取舍：顶点 ≤ 8；分量用固定色序着色（调色板取 C.series）。收缩只是绘制层
 *   的插值，不改图结构，所以 0 与 1 两端都能随时无级返回。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, buildSegmented,
  mkBtn, label, clearBg, polyline, arrow, clamp,
} from '../core.js';

const DEF_NODES = ['A', 'B', 'C', 'D', 'E', 'F'];
const DEF_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'A'], ['C', 'D'], ['D', 'E'], ['E', 'F'], ['F', 'D']];

export default function render(host, spec) {
  let nodes = Array.isArray(spec.nodes) && spec.nodes.length ? spec.nodes.map(String).slice(0, 8) : DEF_NODES.slice();
  let edges = (Array.isArray(spec.edges) && spec.edges.length
    ? spec.edges.filter((e) => Array.isArray(e) && e.length === 2).map((e) => [String(e[0]), String(e[1])])
    : DEF_EDGES.slice()).filter(([u, v]) => nodes.includes(u) && nodes.includes(v));

  let shrink = 0;   /* 0 = 原图，1 = 完全收缩 */

  /* ---- Kosaraju：两遍 DFS，真跑 ---- */
  function kosaraju() {
    const out = {};
    const radj = {};
    nodes.forEach((n) => { out[n] = []; radj[n] = []; });
    edges.forEach(([u, v]) => { out[u].push(v); radj[v].push(u); });

    const seen = new Set();
    const order = [];
    nodes.forEach((start) => {
      if (seen.has(start)) return;
      const stack = [[start, 0]];
      seen.add(start);
      while (stack.length) {
        const top = stack[stack.length - 1];
        const [node, i] = top;
        if (i < out[node].length) {
          top[1] += 1;
          const nb = out[node][i];
          if (!seen.has(nb)) { seen.add(nb); stack.push([nb, 0]); }
        } else {
          stack.pop();
          order.push(node);
        }
      }
    });

    const seen2 = new Set();
    const comps = [];
    for (let k = order.length - 1; k >= 0; k -= 1) {
      const start = order[k];
      if (seen2.has(start)) continue;
      const group = [];
      const q = [start];
      seen2.add(start);
      while (q.length) {
        const cur = q.shift();
        group.push(cur);
        radj[cur].forEach((nb) => { if (!seen2.has(nb)) { seen2.add(nb); q.push(nb); } });
      }
      comps.push(group.sort());
    }
    const which = {};
    comps.forEach((g, i) => g.forEach((n) => { which[n] = i; }));
    /* 缩点图的边（去重） */
    const ce = [];
    edges.forEach(([u, v]) => {
      if (which[u] !== which[v]) {
        if (!ce.some(([a, b]) => a === which[u] && b === which[v])) ce.push([which[u], which[v]]);
      }
    });
    return { order, comps, which, ce };
  }
  let K = kosaraju();

  const cv = setupCanvas(host, spec.height || 540);
  const ro = buildReadout({
    分量数: '—',
    最大分量: '—',
    缩点后边数: '—',
    收工顺序: '—',
    '缩点图是否 DAG': '—',
  });
  host.appendChild(ro.box);

  const bAdd = mkBtn('补一条回边（合并两块）');
  const bReset = mkBtn('恢复原图');
  const bFull = mkBtn('完全收缩 / 展开');
  host.appendChild(buildToolbar(bAdd, bReset, bFull));
  host.appendChild(buildSegmented(
    [{ label: '原图', value: '0' }, { label: '半收缩', value: '0.5' }, { label: '缩点图', value: '1' }],
    '0',
    (v) => { shrink = Number(v); draw(); },
  ));

  const geo = { W: 0, H: 0, pos: {}, cpos: {} };

  function layout(W, H) {
    geo.W = W;
    geo.H = H;
    const cx = W >= 620 ? Math.min(W * 0.32, 250) : W / 2;
    const cy = W >= 620 ? H * 0.46 : H * 0.38;
    const R = W >= 620 ? Math.min(W * 0.2, H * 0.28) : Math.min(W * 0.3, H * 0.22);
    geo.pos = {};
    nodes.forEach((n, i) => {
      const ang = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      geo.pos[n] = { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R * 0.9 };
    });
    /* 分量重心：作为收缩目标 */
    geo.cpos = {};
    K.comps.forEach((g, i) => {
      let sx = 0;
      let sy = 0;
      g.forEach((n) => { sx += geo.pos[n].x; sy += geo.pos[n].y; });
      geo.cpos[i] = { x: sx / g.length, y: sy / g.length };
    });
  }

  /* 收缩插值：同分量点向重心靠拢；不同分量之间距离也略微内收 */
  const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    const cur = {};
    nodes.forEach((n) => {
      cur[n] = mix(geo.pos[n], geo.cpos[K.which[n]], shrink);
    });

    label(ctx, '强连通分量：同一分量里任意两点互相可达；收缩后只剩单向边', 16, 26, C.fg,
      { size: 12.5, weight: 700 });
    label(ctx, '收缩程度 ' + Math.round(shrink * 100) + '%——拉到 100% 就是缩点图（必为 DAG）',
      16, 46, C.axis, { size: 10.5 });

    /* ---- 原图的边（收缩后画得淡一些，避免和缩点边打架） ---- */
    edges.forEach(([u, v]) => {
      const a = cur[u];
      const b = cur[v];
      if (!a || !b) return;
      const sameComp = K.which[u] === K.which[v];
      const alpha = sameComp ? (1 - shrink) * 0.95 + 0.1 : (1 - shrink) * 0.9;
      if (alpha < 0.06) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      arrow(ctx, a.x, a.y, b.x, b.y, sameComp ? C.named('teal') : C.axis, sameComp ? 2 : 1.3);
      ctx.restore();
    });

    /* ---- 缩点图：分量之间的代表边 ---- */
    if (shrink > 0.35) {
      K.ce.forEach(([i, j]) => {
        const a = geo.cpos[i];
        const b = geo.cpos[j];
        if (!a || !b) return;
        ctx.save();
        ctx.globalAlpha = clamp((shrink - 0.35) / 0.5, 0, 1) * 0.95;
        arrow(ctx, a.x, a.y, b.x, b.y, C.bad, 2.2);
        ctx.restore();
      });
    }

    /* ---- 顶点 ---- */
    nodes.forEach((n) => {
      const p = cur[n];
      const ci = K.which[n];
      const col = C.series(ci);
      const r = 17 - shrink * 4;
      ctx.save();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
      label(ctx, n, p.x, p.y + 5, C.bg, { size: 12, align: 'center', weight: 700 });
      if (shrink < 0.85) {
        label(ctx, '组 ' + ci, p.x, p.y + 32, col, { size: 9.5, align: 'center', weight: 700 });
      }
    });

    /* ---- 右侧（下方）账本 ---- */
    const px = geo.W >= 660 ? Math.min(geo.W - 200, geo.W * 0.66) : 16;
    let py = geo.W >= 660 ? 84 : geo.H - 190;

    label(ctx, 'Kosaraju 的结果', px, py, C.fg, { size: 12, weight: 700 });
    py += 18;
    label(ctx, '收工顺序：' + K.order.join(' → '), px, py, C.axis, { size: 10 });
    py += 20;
    K.comps.forEach((g, i) => {
      label(ctx, '组 ' + i + '：' + g.join('、') + '（' + g.length + ' 点）', px, py, C.series(i),
        { size: 11, weight: 700 });
      py += 16;
    });
    py += 8;
    label(ctx, '缩点后的边：' + (K.ce.length ? K.ce.map(([a, b]) => '组' + a + '→组' + b).join('、') : '（无）'),
      px, py, C.bad, { size: 10.5 });
    py += 16;
    label(ctx, '缩点图是 DAG：分量之间不存在双向通路', px, py, C.ok, { size: 10 });

    const maxComp = K.comps.reduce((a, b) => (b.length > a.length ? b : a), []);
    ro.set('分量数', String(K.comps.length));
    ro.set('最大分量', maxComp.join('、') + '（' + maxComp.length + ' 点）');
    ro.set('缩点后边数', String(K.ce.length));
    ro.set('收工顺序', K.order.join('→'));
    ro.set('缩点图是否 DAG', '是');
  }

  bFull.addEventListener('click', () => { shrink = shrink > 0.5 ? 0 : 1; draw(); });
  bReset.addEventListener('click', () => {
    nodes = DEF_NODES.slice();
    edges = DEF_EDGES.slice();
    K = kosaraju();
    shrink = 0;
    draw();
  });
  bAdd.addEventListener('click', () => {
    /* 找一对「不同分量」的顶点，补上反向边让它们互相可达 */
    let found = null;
    for (let i = 0; i < K.comps.length && !found; i += 1) {
      for (let j = i + 1; j < K.comps.length && !found; j += 1) {
        const a = K.comps[j][0];   /* 下游分量 */
        const b = K.comps[i][0];   /* 上游分量 */
        if (edges.some(([u, v]) => u === a && v === b)) continue;
        found = [a, b];
      }
    }
    if (!found) return;
    edges = edges.concat([found]);
    K = kosaraju();
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}

/* =========================================================================
 * lab 组件：gt-method-map —— 图论方法地图：先问结构，再问目标
 * -------------------------------------------------------------------------
 * 用法（第 29 章《图论方法地图》动手实验）：
 *   { "type": "gt-method-map", "title": "…" }
 * 字段（都可省）：height 画布高度（默认 540）。
 *
 * 左边是三个开关（有向？带权？你要回答什么问题？），右边是候选工具列表：
 * 每次勾选都会重新排一次序，并给出「为什么推荐它 / 为什么它不合适」。
 * 这不是背算法名的表格，而是一条决策链：
 *   无向 + 无权 + 问「通不通」→ BFS；带权 → Dijkstra；
 *   有向 + 问「先后」→ 拓扑排序；有向 + 问「互相到达」→ SCC；
 *   「覆盖全部点且最便宜」→ MST；「相邻不同色」→ 着色；「每边一次」→ Euler。
 * 底部实时打印出当前选中的筛选规则，方便与课文的方法地图逐条对照。
 *
 * 取舍：推荐表是教学决策表，不是完备算法库；不推荐的项也会列出来并注明原因。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, buildSegmented,
  mkBtn, label, clearBg,
} from '../core.js';

/* 每个工具声明：它需要什么条件、能回答什么、不能回答什么 */
const TOOLS = [
  { id: 'bfs', name: 'BFS / DFS 遍历', need: { directed: false, weighted: false }, target: 'connect',
    why: '无权图的最少边数路线与连通分量，一次遍历全拿到' },
  { id: 'bfs2', name: 'BFS（有向版）', need: { directed: true, weighted: false }, target: 'connect',
    why: '单向街上问「从 A 能到哪」，BFS 依然对，但不再对称' },
  { id: 'dijkstra', name: 'Dijkstra 最短路', need: { directed: null, weighted: true }, target: 'shortest',
    why: '非负权重下从单源到所有点的最短距离' },
  { id: 'topo', name: '拓扑排序（Kahn）', need: { directed: true, weighted: false }, target: 'order',
    why: '有向无环图的先后约束，输出长度不足即说明有环' },
  { id: 'scc', name: '强连通分量（Kosaraju）', need: { directed: true, weighted: false }, target: 'mutual',
    why: '两遍 DFS 找出互相可达的抱团，缩点后得到 DAG' },
  { id: 'mst', name: '最小生成树（Kruskal / Prim）', need: { directed: false, weighted: true }, target: 'cover',
    why: '覆盖全部顶点、总代价最小；不管任意两点间的最短距离' },
  { id: 'color', name: '图着色与色数', need: { directed: false, weighted: false }, target: 'conflict',
    why: '相邻不同色；一般图求色数是 NP 难的，小图靠回溯' },
  { id: 'euler', name: 'Euler 回路判据', need: { directed: false, weighted: false }, target: 'each-edge',
    why: '所有顶点度为偶 ⇔ 存在一条走遍每条边恰好一次的回路' },
  { id: 'flow', name: '最大流最小割', need: { directed: true, weighted: true }, target: 'throughput',
    why: '带容量的网络里「最多能送多少」，见第 29 章末的最大流一课' },
];

const TARGETS = [
  { v: 'connect', label: '通不通 / 到哪' },
  { v: 'shortest', label: '最短路径' },
  { v: 'order', label: '先后顺序' },
  { v: 'mutual', label: '互相可达' },
  { v: 'cover', label: '覆盖全网最省' },
  { v: 'conflict', label: '避免相邻冲突' },
  { v: 'each-edge', label: '每条边走一次' },
  { v: 'throughput', label: '最多能送多少' },
];

export default function render(host, spec) {
  let directed = false;
  let weighted = false;
  let target = 'connect';

  const cv = setupCanvas(host, spec.height || 540);
  const ro = buildReadout({
    结构: '—',
    目标: '—',
    首选工具: '—',
    候选数: '—',
    '不适用': '—',
  });
  host.appendChild(ro.box);

  const bDir = mkBtn('有向图');
  const bWei = mkBtn('带权图');
  host.appendChild(buildToolbar(bDir, bWei));
  host.appendChild(buildSegmented(
    TARGETS.slice(0, 4).map((t) => ({ label: t.label, value: t.v })),
    target,
    (v) => { target = v; draw(); },
  ));
  host.appendChild(buildSegmented(
    TARGETS.slice(4).map((t) => ({ label: t.label, value: t.v })),
    '',
    (v) => { target = v; draw(); },
  ));

  const geo = { W: 0, H: 0 };

  /* 打分：目标吻合 +3；条件吻合 +2；条件明确不符 -2 */
  function rank() {
    return TOOLS.map((t) => {
      let s = 0;
      const reasons = [];
      if (t.target === target) { s += 3; reasons.push('正好回答这个问题'); }
      else { reasons.push('回答的是别的问题'); }
      if (t.need.directed === directed) { s += 2; reasons.push('方向设定吻合'); }
      else if (t.need.directed === null) { s += 1; reasons.push('方向不影响'); }
      else { s -= 2; reasons.push(t.need.directed ? '它要求有向图' : '它只处理无向图'); }
      if (t.need.weighted === weighted) { s += 2; reasons.push(weighted ? '用得上权重' : '不需要权重'); }
      else { s -= 2; reasons.push(weighted ? '它不看权重' : '它需要权重，而你没有'); }
      return { t, s, reasons };
    }).sort((a, b) => b.s - a.s);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    geo.W = W;
    geo.H = H;

    const rows = rank();
    const best = rows[0];
    const ok = rows.filter((r) => r.s >= 4);

    label(ctx, '先问结构（有向？带权？），再问目标（要回答什么），最后才挑工具', 16, 26, C.fg,
      { size: 12.5, weight: 700 });
    label(ctx, '当前筛选：' + (directed ? '有向' : '无向') + ' · ' + (weighted ? '带权' : '无权')
      + ' · ' + (TARGETS.find((t) => t.v === target) || {}).label, 16, 46, C.axis, { size: 10.5 });

    const px = 24;
    let py = 76;
    const wide = W >= 660;
    const colW = wide ? Math.min(W * 0.52, 380) : W - 48;

    /* 推荐栏：得分最高的 4 条 */
    label(ctx, '推荐顺序（得分来自「目标吻合 + 结构吻合」）', px, py, C.fg, { size: 11.5, weight: 700 });
    py += 20;
    rows.slice(0, 6).forEach((r, i) => {
      const isBest = i === 0;
      const barW = Math.max(3, (Math.max(r.s, 0) / 7) * (colW - 150));
      ctx.save();
      ctx.fillStyle = isBest ? C.named('green') : (r.s > 0 ? C.accent : C.named('gray'));
      ctx.globalAlpha = isBest ? 0.9 : 0.3;
      ctx.fillRect(px + 118, py - 9, barW, 11);
      ctx.restore();
      label(ctx, r.t.name, px, py, isBest ? C.fg : C.axis, { size: 10.5, weight: isBest ? 700 : 400 });
      label(ctx, (r.s > 0 ? '+' : '') + r.s, px + colW - 4, py, isBest ? C.named('green') : C.axis,
        { size: 10, align: 'right', weight: isBest ? 700 : 400 });
      py += 19;
    });

    py += 8;
    label(ctx, '首选：' + best.t.name, px, py, C.named('green'), { size: 12.5, weight: 700 });
    py += 18;
    label(ctx, best.t.why, px, py, C.fg, { size: 10.5 });
    py += 16;
    label(ctx, '理由：' + best.reasons.join('；'), px, py, C.axis, { size: 10 });

    /* 右侧：不适用清单 */
    const rx = wide ? Math.min(W * 0.58, px + colW + 30) : px;
    let ry = wide ? 76 : py + 34;
    if (!wide) {
      /* 窄屏：接着往下写 */
    }
    label(ctx, '这条路上不该用的工具', rx, ry, C.fg, { size: 11.5, weight: 700 });
    ry += 18;
    rows.filter((r) => r.s < 4).forEach((r) => {
      label(ctx, r.t.name, rx, ry, C.axis, { size: 10 });
      ry += 13;
      label(ctx, '　' + r.reasons.filter((x) => x.indexOf('别的问题') < 0).slice(0, 2).join('；'),
        rx, ry, C.axis, { size: 9.5 });
      ry += 16;
      if (ry > H - 20) return;
    });

    /* 底部：决策链口诀 */
    const by = H - 62;
    label(ctx, '决策链：结构 → 目标 → 工具。先画图、标方向与权重，再翻这张表。',
      20, by, C.named('orange'), { size: 10.5, weight: 700 });
    label(ctx, '工具由结构和目标决定，不是由「哪个算法更高级」决定。',
      20, by + 17, C.axis, { size: 10 });

    ro.set('结构', (directed ? '有向' : '无向') + ' / ' + (weighted ? '带权' : '无权'));
    ro.set('目标', (TARGETS.find((t) => t.v === target) || {}).label || target);
    ro.set('首选工具', best.t.name);
    ro.set('候选数', String(ok.length));
    ro.set('不适用', String(rows.length - ok.length));
  }

  bDir.addEventListener('click', () => {
    directed = !directed;
    bDir.textContent = directed ? '有向图 ✓' : '有向图';
    draw();
  });
  bWei.addEventListener('click', () => {
    weighted = !weighted;
    bWei.textContent = weighted ? '带权图 ✓' : '带权图';
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}

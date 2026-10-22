/* =========================================================================
 * lab 组件：gt-trees —— 树是「刚刚好连通」：少一边断、多一边成环
 * -------------------------------------------------------------------------
 * 用法（第 29 章《树与森林》动手实验）：
 *   { "type": "gt-trees", "title": "…" }
 * 字段（都可省）：nodes 顶点；edges 候选边；height 画布高度（默认 520）。
 *
 * 一屏三个动作，对应树的三条判据：
 *   1. 点边可以「启用 / 停用」——图在树、森林、含环之间实时切换；
 *   2. 面板同时给出 n、m、连通分量 c 与 m = n − c 的差值：
 *      无环 ⇔ m = n − c；连通 ⇔ c = 1；两者都成立 ⇔ 树（此时 m = n − 1）；
 *   3. 点「长一片叶」给你一个真实构造：从树上任意一点挂一个新点，
 *      永远是树；点「加一条弦」把两端已连通的两点连起来，立刻成环。
 * 判据不是背出来的，是每条边开关时当场算出来的。
 *
 * 取舍：顶点 ≤ 9，边 ≤ 12，否则画布与标签挤不下；无环判定用并查集现算。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, bindPointer,
  mkBtn, label, clearBg, clamp, polyline,
} from '../core.js';

export default function render(host, spec) {
  let nodes = Array.isArray(spec.nodes) && spec.nodes.length
    ? spec.nodes.map(String).slice(0, 9)
    : ['R', 'A', 'B', 'C', 'D', 'E'];
  let edges = Array.isArray(spec.edges) && spec.edges.length
    ? spec.edges.filter((e) => Array.isArray(e) && e.length === 2).map((e) => [String(e[0]), String(e[1])])
    : [['R', 'A'], ['R', 'B'], ['R', 'C'], ['A', 'D'], ['B', 'E'], ['C', 'D']];
  /* 默认：前 5 条构成树（R-A, R-B, R-C, A-D, B-E），第 6 条 C-D 是「弦」 */
  let on = edges.map((_, i) => i < 5);

  const cv = setupCanvas(host, spec.height || 520);
  const ro = buildReadout({
    '顶点数 n': '—',
    '边数 m': '—',
    '连通分量 c': '—',
    'm − (n − c)': '—',
    判定: '—',
  });
  host.appendChild(ro.box);

  const bLeaf = mkBtn('长一片叶（挂新点）');
  const bChord = mkBtn('加一条弦（成环）');
  const bReset = mkBtn('恢复初始');
  host.appendChild(buildToolbar(bLeaf, bChord, bReset));

  /* 并查集：判环与数分量都用它 */
  function dsu(ns) {
    const p = {};
    ns.forEach((x) => { p[x] = x; });
    const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    const uni = (a, b) => {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return false;
      p[rb] = ra;
      return true;
    };
    return { find, uni };
  }

  function survey() {
    const active = edges.filter((_, i) => on[i]);
    const d = dsu(nodes);
    let cyclic = false;
    active.forEach(([u, v]) => {
      if (!d.uni(u, v)) cyclic = true;
    });
    const roots = new Set(nodes.map((x) => d.find(x)));
    const deg = {};
    nodes.forEach((x) => { deg[x] = 0; });
    active.forEach(([u, v]) => { deg[u] += 1; deg[v] += 1; });
    return { active, c: roots.size, cyclic, deg, m: active.length };
  }

  const geo = { W: 0, H: 0, cx: 0, cy: 0, R: 0, pos: {} };

  function layout(W, H) {
    geo.W = W;
    geo.H = H;
    geo.cx = W >= 620 ? Math.min(W * 0.33, 260) : W / 2;
    geo.cy = W >= 620 ? H * 0.46 : H * 0.38;
    geo.R = W >= 620 ? Math.min(W * 0.21, H * 0.3) : Math.min(W * 0.3, H * 0.23);
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
    const s = survey();

    label(ctx, '点任意一条边：启用 / 停用。看 m、c 与判定如何一起变', 16, 26, C.fg,
      { size: 12.5, weight: 700 });
    label(ctx, '判据：无环 ⇔ m = n − c；连通 ⇔ c = 1；两者同时成立才是树（m = n − 1）', 16, 46, C.axis,
      { size: 10.5 });

    /* ---- 边 ---- */
    edges.forEach(([u, v], i) => {
      const a = geo.pos[u];
      const b = geo.pos[v];
      if (!a || !b) return;
      const active = on[i];
      polyline(ctx, [[a.x, a.y], [b.x, b.y]],
        active ? C.accent : C.grid, active ? 3 : 1.2, active ? null : [5, 4]);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.save();
      ctx.fillStyle = active ? C.accent : C.soft;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.stroke();
      ctx.restore();
      label(ctx, String(i + 1), mx, my + 4, active ? C.bg : C.fg, { size: 10, align: 'center', weight: 700 });
    });

    /* ---- 顶点（度 = 1 的标叶） ---- */
    nodes.forEach((n) => {
      const p = geo.pos[n];
      const isLeaf = s.deg[n] === 1;
      ctx.save();
      ctx.fillStyle = isLeaf ? C.named('green') : C.accent;
      ctx.globalAlpha = s.deg[n] === 0 ? 0.35 : 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.stroke();
      ctx.restore();
      label(ctx, n, p.x, p.y + 5, C.bg, { size: 13, align: 'center', weight: 700 });
      label(ctx, '度 ' + s.deg[n], p.x, p.y + 33, C.axis, { size: 9.5, align: 'center' });
      if (isLeaf) label(ctx, '叶', p.x, p.y - 24, C.named('green'), { size: 10, align: 'center', weight: 700 });
    });

    /* ---- 右侧（下方）账本 ---- */
    const px = geo.W >= 620 ? Math.min(geo.W - 200, geo.cx + geo.R + 48) : 16;
    let py = geo.W >= 620 ? 84 : geo.H - 176;

    const isForest = !s.cyclic;
    const isTree = isForest && s.c === 1;
    const verdict = isTree ? '树' : (isForest ? '森林（无环但不连通）' : '含环图');
    const vColor = isTree ? C.ok : (isForest ? C.named('orange') : C.bad);

    label(ctx, '判定：' + verdict, px, py, vColor, { size: 14, weight: 700 });
    py += 22;
    label(ctx, 'n = ' + nodes.length + '，m = ' + s.m + '，c = ' + s.c, px, py, C.fg, { size: 11.5 });
    py += 17;
    label(ctx, 'm − (n − c) = ' + (s.m - (nodes.length - s.c)), px, py,
      isForest ? C.ok : C.bad, { size: 11.5, weight: 700 });
    py += 15;
    label(ctx, isForest ? '为 0：无环 ✓' : '为正：每多 1 就多一个独立回路 ✗', px, py, C.axis, { size: 10 });
    py += 20;

    label(ctx, '已启用边：' + (s.active.length ? s.active.map((e) => e.join('—')).join('、') : '（无）'),
      px, py, C.axis, { size: 10 });
    py += 16;
    const leaves = nodes.filter((x) => s.deg[x] === 1);
    label(ctx, '叶（度 = 1）：' + (leaves.join('、') || '无'), px, py, C.named('green'), { size: 10 });

    py += 24;
    label(ctx, '三个动作对应的三条判据', px, py, C.fg, { size: 11, weight: 700 });
    py += 16;
    label(ctx, '· 停一条桥边 → 断成森林，c 加一', px, py, C.axis, { size: 10 });
    py += 14;
    label(ctx, '· 连一条已连通的边 → 成环，m 反超 n − c', px, py, C.axis, { size: 10 });
    py += 14;
    label(ctx, '· 挂一片新叶 → n 与 m 同步加一，仍是树', px, py, C.axis, { size: 10 });

    ro.set('顶点数 n', String(nodes.length));
    ro.set('边数 m', String(s.m));
    ro.set('连通分量 c', String(s.c));
    ro.set('m − (n − c)', String(s.m - (nodes.length - s.c)));
    ro.set('判定', verdict);
  }

  /* 命中：边上的小圆点 */
  function hitEdge(x0, y0) {
    for (let i = 0; i < edges.length; i += 1) {
      const a = geo.pos[edges[i][0]];
      const b = geo.pos[edges[i][1]];
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (Math.hypot(mx - x0, my - y0) < 14) return i;
    }
    return -1;
  }

  bindPointer(cv.canvas, {
    pick(x0, y0) { return hitEdge(x0, y0) >= 0 ? 'edge' : null; },
    hover(x0, y0) { cv.canvas.style.cursor = hitEdge(x0, y0) >= 0 ? 'pointer' : 'default'; },
    down(id, x0, y0) {
      const i = hitEdge(x0, y0);
      if (i < 0) return;
      on[i] = !on[i];
      draw();
    },
    move() {},
    up() {},
    leave() { cv.canvas.style.cursor = 'default'; },
  });

  let seed = 3;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  bLeaf.addEventListener('click', () => {
    if (nodes.length >= 9) return;
    const s = survey();
    /* 挂在第一个存在的点上，新点编号按字母顺延 */
    const pool = 'PQRSTUVWX';
    const nn = pool.split('').find((ch) => !nodes.includes(ch));
    if (!nn) return;
    const anchor = nodes[Math.floor(rnd() * nodes.length)];
    nodes = nodes.concat([nn]);
    edges = edges.concat([[anchor, nn]]);
    on = on.concat([true]);
    void s;
    draw();
  });

  bChord.addEventListener('click', () => {
    const s = survey();
    /* 只在「同分量」的两点之间加边，必成环；找不到就换成分量内任意两点 */
    const d = dsu(nodes);
    s.active.forEach(([u, v]) => d.uni(u, v));
    let found = null;
    for (let i = 0; i < nodes.length && !found; i += 1) {
      for (let j = i + 1; j < nodes.length && !found; j += 1) {
        const u = nodes[i];
        const v = nodes[j];
        if (d.find(u) !== d.find(v)) continue;
        if (edges.some(([a, b]) => (a === u && b === v) || (a === v && b === u))) continue;
        found = [u, v];
      }
    }
    if (!found) return;
    edges = edges.concat([found]);
    on = on.concat([true]);
    draw();
  });

  bReset.addEventListener('click', () => {
    nodes = ['R', 'A', 'B', 'C', 'D', 'E'];
    edges = [['R', 'A'], ['R', 'B'], ['R', 'C'], ['A', 'D'], ['B', 'E'], ['C', 'D']];
    on = edges.map((_, i) => i < 5);
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}

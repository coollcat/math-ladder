/* =========================================================================
 * lab 组件：gt-path-walk —— 通路 / 路径 / 回路的分界，BFS 按层扩散
 * -------------------------------------------------------------------------
 * 用法（第 29 章《路径、回路与连通性》动手实验）：
 *   { "type": "gt-path-walk", "title": "…" }
 * 字段（都可省）：nodes 顶点名数组；edges 边数组 [[a,b],…]；
 *   start 起点；height 画布高度（默认 520）。
 *
 * 三种对象用同一张图对照：
 *   · BFS 分层扩散（单步 / 播放）——每个点标出「第几层」与父指针；
 *   · 从起点到目标的一条最短路（按层回溯，绿色加粗）；
 *   · 回路演示：沿当前路径走一圈回来，多出来的那条边就是「成环的证据」。
 * 另有连通分量体检：不可达的点会保持灰白，右侧直接数出「几个岛」。
 * 点任意顶点可以把它设成新的目标点，重新看层号如何变化。
 *
 * 取舍：图固定为课文那张 6 点小图（A..F），允许点顶点换目标；
 *   不做任意增删边——那是 graph-builder 的活（第 10 课已有）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, bindPointer, anim,
  mkBtn, label, clearBg, clamp, polyline,
} from '../core.js';

const DEF_NODES = ['A', 'B', 'C', 'D', 'E', 'F'];
const DEF_EDGES = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['C', 'E'], ['A', 'C']];

export default function render(host, spec) {
  const nodes = Array.isArray(spec.nodes) && spec.nodes.length ? spec.nodes.map(String) : DEF_NODES.slice();
  const edges = Array.isArray(spec.edges) && spec.edges.length
    ? spec.edges.filter((e) => Array.isArray(e) && e.length === 2 && nodes.includes(String(e[0])) && nodes.includes(String(e[1])))
      .map((e) => [String(e[0]), String(e[1])])
    : DEF_EDGES.slice();
  const start = nodes.includes(spec.start) ? spec.start : nodes[0];

  let target = nodes.includes(spec.target) ? spec.target : nodes[nodes.length - 1];
  let step = 0;   /* 已扩散的步数（BFS 层数推进） */

  /* 邻接表 */
  const adj = {};
  nodes.forEach((n) => { adj[n] = []; });
  edges.forEach(([u, v]) => { adj[u].push(v); adj[v].push(u); });

  /* BFS 快照：每一层之后的 dist / parent */
  function bfsSnapshots() {
    const dist = {};
    const parent = {};
    nodes.forEach((n) => { dist[n] = -1; parent[n] = null; });
    dist[start] = 0;
    const queue = [start];
    const snaps = [{ dist: { ...dist }, parent: { ...parent }, frontier: [start], popped: null }];
    while (queue.length) {
      const cur = queue.shift();
      adj[cur].forEach((nb) => {
        if (dist[nb] === -1) {
          dist[nb] = dist[cur] + 1;
          parent[nb] = cur;
          queue.push(nb);
        }
      });
      snaps.push({ dist: { ...dist }, parent: { ...parent }, frontier: queue.slice(), popped: cur });
    }
    return snaps;
  }
  const SNAPS = bfsSnapshots();
  step = clamp(step, 0, SNAPS.length - 1);

  const cv = setupCanvas(host, spec.height || 520);
  const ro = buildReadout({
    起点: start,
    目标: '—',
    'BFS 步数': '—',
    '目标层号': '—',
    连通分量: '—',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 上一步');
  const bRestart = mkBtn('回到第 0 步');
  host.appendChild(buildToolbar(bStep, bBack, bRestart));

  const geo = { W: 0, H: 0, cx: 0, cy: 0, R: 0, pos: {} };

  function layout(W, H) {
    geo.W = W;
    geo.H = H;
    geo.cx = W >= 620 ? Math.min(W * 0.32, 250) : W / 2;
    geo.cy = W >= 620 ? H * 0.46 : H * 0.4;
    geo.R = W >= 620 ? Math.min(W * 0.2, H * 0.28) : Math.min(W * 0.3, H * 0.24);
    geo.pos = {};
    nodes.forEach((n, i) => {
      const ang = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      geo.pos[n] = { x: geo.cx + Math.cos(ang) * geo.R, y: geo.cy + Math.sin(ang) * geo.R * 0.92 };
    });
  }

  function components() {
    const seen = new Set();
    let cnt = 0;
    const groups = [];
    nodes.forEach((n) => {
      if (seen.has(n)) return;
      cnt += 1;
      const g = [];
      const q = [n];
      seen.add(n);
      while (q.length) {
        const cur = q.shift();
        g.push(cur);
        adj[cur].forEach((nb) => { if (!seen.has(nb)) { seen.add(nb); q.push(nb); } });
      }
      groups.push(g);
    });
    return { cnt, groups };
  }

  function pathTo(t) {
    const snap = SNAPS[step];
    if (snap.dist[t] < 0) return null;
    const rev = [];
    let cur = t;
    while (cur !== null) {
      rev.push(cur);
      cur = snap.parent[cur];
    }
    return rev.reverse();
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);
    const snap = SNAPS[step];
    const path = pathTo(target);
    const pathSet = new Set(path || []);
    const comp = components();

    label(ctx, 'BFS 分层的第 ' + step + ' 步：灰点 = 还没扩散到，实心 = 已定层', 16, 26, C.fg,
      { size: 12.5, weight: 700 });
    label(ctx, '点任意顶点可把它设成新目标（绿色那条就是到目标的层号最短路径）', 16, 46, C.axis, { size: 10.5 });

    /* ---- 边 ---- */
    edges.forEach(([u, v]) => {
      const a = geo.pos[u];
      const b = geo.pos[v];
      const onPath = pathSet.has(u) && pathSet.has(v)
        && Math.abs(path.indexOf(u) - path.indexOf(v)) === 1;
      polyline(ctx, [[a.x, a.y], [b.x, b.y]], onPath ? C.ok : C.grid, onPath ? 4 : 1.6);
    });

    /* ---- 顶点 ---- */
    nodes.forEach((n) => {
      const p = geo.pos[n];
      const d = snap.dist[n];
      const isTarget = n === target;
      const isStart = n === start;
      ctx.save();
      ctx.fillStyle = d < 0 ? C.soft : (isStart ? C.named('orange') : (isTarget ? C.named('green') : C.accent));
      ctx.globalAlpha = d < 0 ? 0.7 : 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isTarget || isStart ? 19 : 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isTarget ? C.fg : C.grid;
      ctx.lineWidth = isTarget ? 2.6 : 1;
      ctx.stroke();
      ctx.restore();
      label(ctx, n, p.x, p.y + 5, d < 0 ? C.fg : C.bg, { size: 14, align: 'center', weight: 700 });
      if (d >= 0) label(ctx, '层 ' + d, p.x, p.y + 34, C.axis, { size: 10, align: 'center' });
      else label(ctx, '未达', p.x, p.y + 34, C.axis, { size: 9.5, align: 'center' });
      if (snap.parent[n]) {
        const q = geo.pos[snap.parent[n]];
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        label(ctx, '父:' + snap.parent[n], mx, my - 5, C.axis, { size: 9, align: 'center' });
      }
    });

    /* ---- 右侧（下方）账本 ---- */
    const px = geo.W >= 620 ? Math.min(geo.W - 190, geo.cx + geo.R + 46) : 16;
    let py = geo.W >= 620 ? 82 : geo.H - 170;

    label(ctx, '连通性体检', px, py, C.fg, { size: 12, weight: 700 });
    py += 18;
    label(ctx, '连通分量数 = ' + comp.cnt, px, py, comp.cnt === 1 ? C.ok : C.named('orange'),
      { size: 11.5, weight: 700 });
    py += 16;
    comp.groups.forEach((g, i) => {
      label(ctx, '岛 ' + (i + 1) + '：' + g.join('、'), px, py, C.axis, { size: 10 });
      py += 14;
    });

    py += 10;
    label(ctx, 'BFS 队列（待扩散）', px, py, C.fg, { size: 11.5, weight: 700 });
    py += 16;
    label(ctx, snap.frontier.length ? snap.frontier.join(' → ') : '（空）', px, py, C.axis, { size: 10.5 });
    py += 20;

    label(ctx, '到目标 ' + target + ' 的路径', px, py, C.fg, { size: 11.5, weight: 700 });
    py += 16;
    if (path) {
      label(ctx, path.join(' → ') + '（' + (path.length - 1) + ' 步）', px, py, C.ok, { size: 11, weight: 700 });
      py += 16;
      label(ctx, '层号每走一步加一：不会出现捷径，因为 BFS 先扫完近处', px, py, C.axis, { size: 10 });
    } else {
      label(ctx, '不可达：目标在另一个连通分量里', px, py, C.bad, { size: 11, weight: 700 });
      py += 16;
      label(ctx, '这正是「连通 ≠ 存在路」的现场：换起点或换边才可能到', px, py, C.axis, { size: 10 });
    }

    /* ---- 回路提示：任意一条「两端都已定层且层差 1」的非树边 ---- */
    py += 22;
    let cycle = null;
    edges.forEach(([u, v]) => {
      if (cycle) return;
      if (snap.dist[u] >= 0 && snap.dist[v] >= 0 && snap.parent[u] !== v && snap.parent[v] !== u) {
        cycle = [u, v];
      }
    });
    if (cycle) {
      label(ctx, '非树边 ' + cycle[0] + '—' + cycle[1] + '：把它接上就出现回路', px, py, C.named('orange'),
        { size: 10.5, weight: 700 });
      py += 15;
      label(ctx, '回路 = 树上那条路 + 这条边，首尾回到同一个点', px, py, C.axis, { size: 10 });
    }

    ro.set('目标', target);
    ro.set('BFS 步数', step + ' / ' + (SNAPS.length - 1));
    ro.set('目标层号', snap.dist[target] >= 0 ? String(snap.dist[target]) : '不可达');
    ro.set('连通分量', String(comp.cnt));
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

  bindPointer(cv.canvas, {
    pick(x0, y0) { return hitNode(x0, y0) ? 'node' : null; },
    hover(x0, y0) { cv.canvas.style.cursor = hitNode(x0, y0) ? 'pointer' : 'default'; },
    down(id, x0, y0) {
      const n = hitNode(x0, y0);
      if (!n) return;
      target = n;
      draw();
    },
    move() {},
    up() {},
    leave() { cv.canvas.style.cursor = 'default'; },
  });

  bStep.addEventListener('click', () => { step = Math.min(step + 1, SNAPS.length - 1); draw(); });
  bBack.addEventListener('click', () => { step = Math.max(step - 1, 0); draw(); });
  bRestart.addEventListener('click', () => { step = 0; draw(); });

  let acc = 0;
  const player = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.8) return;
      acc = 0;
      step = step >= SNAPS.length - 1 ? 0 : step + 1;
      draw();
    },
    onReset() { step = 0; acc = 0; draw(); },
  });

  draw();
  cv.redraw = draw;
  return { destroy() { player.stop(); } };
}

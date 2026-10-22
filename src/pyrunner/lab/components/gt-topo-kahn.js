/* =========================================================================
 * lab 组件：gt-topo-kahn —— 入度消去：谁没有前置，谁先开工
 * -------------------------------------------------------------------------
 * 用法（第 29 章《拓扑排序与 DAG》动手实验）：
 *   { "type": "gt-topo-kahn", "title": "…" }
 * 字段（都可省）：nodes 顶点；edges 有向边 [[u,v],…]（u → v 表示 u 先于 v）；
 *   height 画布高度（默认 540）。
 *
 * Kahn 算法一步一屏地走：
 *   1. 每个点显示当前入度（还欠几个前置）；
 *   2. 点「消去入度为 0 的点 ▶」——它被写进输出序列，同时它的每条出边
 *      让下游入度减一，刚变成 0 的点会亮起「可开工」；
 *   3. 队列里同时有多个候选时，右侧会列出全部候选，说明「拓扑序通常不唯一」；
 *   4. 随时可以点「制造一个环」：加一条回边，之后就会有节点永远等不到入度 0
 *      ——收尾时输出长度 < n，正是 DAG 判定的现场。
 * 「自动播完」按最长链流程走，卡住即停。
 *
 * 取舍：顶点 ≤ 8、边 ≤ 12；布局用分层（按最长路径深度）排，避免箭头打折。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout,
  mkBtn, label, clearBg, polyline, arrow, clamp, anim,
} from '../core.js';

const DEF_NODES = ['A', 'B', 'C', 'D', 'E'];
const DEF_EDGES = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E']];

export default function render(host, spec) {
  let nodes = Array.isArray(spec.nodes) && spec.nodes.length ? spec.nodes.map(String).slice(0, 8) : DEF_NODES.slice();
  let edges = (Array.isArray(spec.edges) && spec.edges.length
    ? spec.edges.filter((e) => Array.isArray(e) && e.length === 2).map((e) => [String(e[0]), String(e[1])])
    : DEF_EDGES.slice()).filter(([u, v]) => nodes.includes(u) && nodes.includes(v));

  /* 运行态：indeg 快照 + 输出序列。重置即回到初始 */
  let indeg = {};
  let out = [];
  let done = new Set();
  let fresh = new Set();   /* 刚刚解锁的点 */
  let cyclic = false;

  function reset() {
    indeg = {};
    nodes.forEach((n) => { indeg[n] = 0; });
    edges.forEach(([, v]) => { indeg[v] += 1; });
    out = [];
    done = new Set();
    fresh = new Set();
    cyclic = false;
  }
  reset();

  const cv = setupCanvas(host, spec.height || 540);
  const ro = buildReadout({
    输出序列: '—',
    可开工队列: '—',
    剩余顶点: '—',
    '是否 DAG': '—',
    '输出长度': '—',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('消去入度为 0 的点 ▶');
  const bReset = mkBtn('重置');
  const bCycle = mkBtn('制造一个环');
  const bPlay = mkBtn('自动播完');
  host.appendChild(buildToolbar(bStep, bReset, bCycle, bPlay));

  const geo = { W: 0, H: 0, pos: {}, level: {} };

  /* 分层：按「最长前驱链长度」排横坐标，同层竖着摆 */
  function layout(W, H) {
    geo.W = W;
    geo.H = H;
    const depth = {};
    nodes.forEach((n) => { depth[n] = 0; });
    for (let it = 0; it < nodes.length; it += 1) {
      edges.forEach(([u, v]) => { if (depth[v] < depth[u] + 1) depth[v] = depth[u] + 1; });
    }
    geo.level = depth;
    const maxD = Math.max(1, ...nodes.map((n) => depth[n]));
    const byLevel = {};
    nodes.forEach((n) => {
      const d = depth[n];
      if (!byLevel[d]) byLevel[d] = [];
      byLevel[d].push(n);
    });
    geo.pos = {};
    const padX = W >= 620 ? 46 : 26;
    const usableW = W - padX * 2;
    const top = 96;
    const bottom = H - 150;
    const bandH = Math.max(60, bottom - top);
    const colW = usableW / Math.max(1, maxD + 1);
    Object.keys(byLevel).forEach((d) => {
      const arr = byLevel[d];
      arr.forEach((n, i) => {
        const x = padX + Number(d) * colW + colW / 2;
        const y = top + (bandH / (arr.length + 1)) * (i + 1);
        geo.pos[n] = { x: clamp(x, 34, W - 34), y };
      });
    });
  }

  /* 缩短箭头：不让箭头插进圆里 */
  function trim(a, b, r1, r2) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x1: a.x + (dx / len) * r1,
      y1: a.y + (dy / len) * r1,
      x2: b.x - (dx / len) * r2,
      y2: b.y - (dy / len) * r2,
    };
  }

  function stepOnce() {
    const ready = nodes.filter((n) => !done.has(n) && indeg[n] === 0);
    if (!ready.length) {
      /* 没有入度为 0 的点，有两种完全不同的情形：
         · 已经全部出队 —— 正常排完，「自动播完」正好会走到这里；
         · 还有剩下的点却都堵着 —— 那才是环。
         以前无条件置 cyclic = true，于是合法 DAG 上点「自动播完」必被判
         「否（有环）」，画布还写出「输出长度 5 < n = 5」这种自相矛盾的话；
         而手动单步恰好停在 n 次、不再多点一下，就不会误报。 */
      if (done.size < nodes.length) cyclic = true;
      return false;
    }
    const pick = ready[0];
    done.add(pick);
    out.push(pick);
    fresh = new Set();
    edges.forEach(([u, v]) => {
      if (u === pick) {
        indeg[v] -= 1;
        if (indeg[v] === 0 && !done.has(v)) fresh.add(v);
      }
    });
    return true;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    const ready = nodes.filter((n) => !done.has(n) && indeg[n] === 0);
    const remaining = nodes.filter((n) => !done.has(n));

    label(ctx, 'Kahn：反复取走「入度为 0」的点，并把它的出边逐条删掉', 16, 26, C.fg,
      { size: 12.5, weight: 700 });
    label(ctx, '箭头方向 = 「先于」。圆里是点，右上角小字是当前入度', 16, 46, C.axis, { size: 10.5 });

    /* ---- 边 ---- */
    edges.forEach(([u, v]) => {
      const a = geo.pos[u];
      const b = geo.pos[v];
      if (!a || !b) return;
      const t = trim(a, b, 20, 22);
      const consumed = done.has(u);
      arrow(ctx, t.x1, t.y1, t.x2, t.y2, consumed ? C.grid : C.axis, consumed ? 1 : 1.6);
    });

    /* ---- 顶点 ---- */
    nodes.forEach((n) => {
      const p = geo.pos[n];
      const isDone = done.has(n);
      const isReady = ready.includes(n);
      const isFresh = fresh.has(n);
      ctx.save();
      ctx.fillStyle = isDone ? C.named('gray') : (isFresh ? C.named('green') : (isReady ? C.accent : C.soft));
      ctx.globalAlpha = isDone ? 0.5 : 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = isReady && !isDone ? 2.6 : 1;
      ctx.strokeStyle = isReady && !isDone ? C.named('green') : C.grid;
      ctx.stroke();
      ctx.restore();
      label(ctx, n, p.x, p.y + 5, isDone ? C.fg : C.bg, { size: 13, align: 'center', weight: 700 });
      label(ctx, '入度 ' + Math.max(0, indeg[n]), p.x, p.y - 26, indeg[n] === 0 ? C.ok : C.axis,
        { size: 9.5, align: 'center', weight: indeg[n] === 0 ? 700 : 400 });
      if (isDone) {
        const idx = out.indexOf(n);
        label(ctx, '#' + (idx + 1), p.x, p.y + 34, C.axis, { size: 9.5, align: 'center' });
      }
    });

    /* ---- 输出序列（时间轴） ---- */
    const ty = geo.H - 116;
    label(ctx, '输出序列（拓扑序）', 20, ty - 12, C.fg, { size: 11.5, weight: 700 });
    const slotW = clamp((geo.W - 60) / Math.max(nodes.length, 1), 30, 52);
    nodes.forEach((_, i) => {
      const x = 26 + i * slotW;
      ctx.save();
      ctx.fillStyle = i < out.length ? C.accent : C.soft;
      ctx.globalAlpha = i < out.length ? 0.85 : 0.5;
      ctx.fillRect(x, ty, slotW - 6, 30);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(x + 0.5, ty + 0.5, slotW - 7, 29);
      ctx.restore();
      if (i < out.length) {
        label(ctx, out[i], x + (slotW - 6) / 2, ty + 20, C.bg, { size: 13, align: 'center', weight: 700 });
      } else {
        label(ctx, '?', x + (slotW - 6) / 2, ty + 20, C.axis, { size: 12, align: 'center' });
      }
    });

    /* ---- 右侧/下方账本 ---- */
    const px = geo.W >= 660 ? Math.min(geo.W - 200, geo.W * 0.68) : 20;
    let py = geo.W >= 660 ? 84 : ty - 62;
    if (geo.W >= 660) {
      label(ctx, '可开工队列', px, py, C.fg, { size: 11.5, weight: 700 });
      py += 16;
      label(ctx, ready.length ? ready.join('、') : '（空）', px, py, ready.length ? C.ok : C.bad,
        { size: 11, weight: 700 });
      py += 18;
      label(ctx, ready.length > 1 ? '≥2 个候选：拓扑序不唯一，先取谁都合法' :
        (ready.length === 1 ? '唯一候选：这一步没得选' : '没有候选：剩下的点互相卡死'),
        px, py, C.axis, { size: 10 });
      py += 24;
      label(ctx, '剩余顶点：' + (remaining.join('、') || '无'), px, py, C.axis, { size: 10 });
      py += 20;
      if (cyclic || (!ready.length && remaining.length)) {
        label(ctx, '有环：这些点的入度永远降不到 0', px, py, C.bad, { size: 10.5, weight: 700 });
        py += 15;
        label(ctx, '输出长度 ' + out.length + ' < n = ' + nodes.length + ' → 不是 DAG',
          px, py, C.bad, { size: 10 });
      } else if (out.length === nodes.length) {
        label(ctx, '输出已含全部 ' + nodes.length + ' 个点：这是合法拓扑序', px, py, C.ok,
          { size: 10.5, weight: 700 });
      }
    }

    ro.set('输出序列', out.length ? out.join(' → ') : '（空）');
    ro.set('可开工队列', ready.length ? ready.join('、') : '（空）');
    ro.set('剩余顶点', String(remaining.length));
    ro.set('是否 DAG', (cyclic || (!ready.length && remaining.length)) ? '否（有环）' : (out.length === nodes.length ? '是' : '目前无环'));
    ro.set('输出长度', out.length + ' / ' + nodes.length);
  }

  bStep.addEventListener('click', () => { stepOnce(); draw(); });
  bReset.addEventListener('click', () => { reset(); draw(); });
  bCycle.addEventListener('click', () => {
    /* 加一条「从最深的点回到最浅的点」的回边，必定制造环 */
    const order = nodes.slice().sort((a, b) => (geo.level[b] || 0) - (geo.level[a] || 0));
    const from = order[0];
    const to = order[order.length - 1];
    if (from === to) return;
    if (edges.some(([u, v]) => u === from && v === to)) return;
    edges = edges.concat([[from, to]]);
    reset();
    draw();
  });
  bPlay.addEventListener('click', () => {
    let guard = 0;
    while (guard < nodes.length + 2) {
      if (!stepOnce()) break;
      guard += 1;
    }
    draw();
  });

  let acc = 0;
  const player = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.9) return;
      acc = 0;
      if (!stepOnce()) return;
      draw();
    },
    onReset() { reset(); acc = 0; draw(); },
  });

  draw();
  cv.redraw = draw;
  return { destroy() { player.stop(); } };
}

/* 路由与转发：一张 7 节点带权图，跑 Dijkstra（链路状态）或距离向量（分布 Bellman-Ford），
   逐轮看距离表怎么收敛。点一条边可改权重或把它断开——第三种模式就是「计数到无穷」。 */
import {
  themeColors, setupCanvas, bindPointer, anim, buildSegmented, buildSliders, buildToolbar,
  buildReadout, el, mkBtn, label, clamp, fmt,
} from '../core.js';

const NODES = [
  { id: 'A', x: 0.10, y: 0.50 }, { id: 'B', x: 0.30, y: 0.18 }, { id: 'C', x: 0.30, y: 0.82 },
  { id: 'D', x: 0.55, y: 0.35 }, { id: 'E', x: 0.55, y: 0.78 }, { id: 'F', x: 0.82, y: 0.20 },
  { id: 'G', x: 0.86, y: 0.72 },
];
const EDGES = [
  { a: 0, b: 1, w: 2 }, { a: 0, b: 2, w: 5 }, { a: 1, b: 2, w: 1 }, { a: 1, b: 3, w: 3 },
  { a: 2, b: 4, w: 4 }, { a: 3, b: 4, w: 2 }, { a: 3, b: 5, w: 4 }, { a: 4, b: 5, w: 3 },
  { a: 4, b: 6, w: 2 }, { a: 5, b: 6, w: 5 },
];
const NMAP = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const INF = Infinity;

function adjacency(edges) {
  const adj = NODES.map(() => []);
  edges.forEach((e, i) => {
    if (e.cut) return;
    adj[e.a].push({ v: e.b, w: e.w, i });
    adj[e.b].push({ v: e.a, w: e.w, i });
  });
  return adj;
}

function dijkstraFrames(adj, src) {
  const n = NODES.length;
  const dist = new Array(n).fill(INF);
  const nxt = new Array(n).fill(-1);
  const done = new Array(n).fill(false);
  dist[src] = 0;
  const snap = (note, edge) => ({ d: dist.slice(), nxt: nxt.slice(), done: done.slice(), note, edge });
  const frames = [snap(`初始化：源点 A 的 d=0，其余 ∞`, null)];
  for (let k = 0; k < n; k += 1) {
    let u = -1;
    for (let i = 0; i < n; i += 1) if (!done[i] && dist[i] !== INF && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0) break;
    done[u] = true;
    frames.push(snap(`选出未确定里最小的 ${NMAP[u]}：d=${dist[u]}，它的最短路径到此确定`, null));
    adj[u].forEach(({ v, w, i }) => {
      if (done[v] || dist[u] + w >= dist[v]) return;
      dist[v] = dist[u] + w;
      nxt[v] = u;
      frames.push(snap(`松弛边 ${NMAP[u]}–${NMAP[v]}：d(${NMAP[v]}) 松弛为 ${dist[v]}`, i));
    });
  }
  return frames;
}

function dvFrames(adj, src) {
  const n = NODES.length;
  let dist = NODES.map((_, i) => NODES.map((_, j) => (i === j ? 0 : INF)));
  let nxt = NODES.map(() => NODES.map(() => -1));
  adj.forEach((list, u) => list.forEach(({ v, w }) => {
    if (w < dist[u][v]) { dist[u][v] = w; nxt[u][v] = v; }
  }));
  const snap = (note) => ({ d: dist.map((r) => r[src]), nxt: nxt.map((r) => r[src]), done: NODES.map(() => false), note, edge: null });
  const frames = [snap('初始：每个节点只知道自己到直连邻居的距离，其余 ∞')];
  for (let r = 1; r <= 14; r += 1) {
    const nd = dist.map((row) => row.slice());
    const nn = nxt.map((row) => row.slice());
    let changed = false;
    for (let u = 0; u < n; u += 1) {
      adj[u].forEach(({ v, w }) => {
        for (let k = 0; k < n; k += 1) {
          if (dist[v][k] !== INF && dist[v][k] + w < nd[u][k]) {
            nd[u][k] = dist[v][k] + w;
            nn[u][k] = v;
            changed = true;
          }
        }
      });
    }
    dist = nd;
    nxt = nn;
    frames.push(snap(`第 ${r} 轮：所有节点同时把整张距离表发给邻居`));
    if (!changed) {
      frames.push(snap(`第 ${r} 轮后收敛：没有节点再更新`));
      break;
    }
  }
  return frames;
}

/* 计数到无穷：线型 A—B—C，断开 A—B 后 B、C 互相抬升，直到跳数上限 16 */
function countFrames() {
  const frames = [];
  let dB = 1;
  let dC = 2;
  frames.push({ d: [0, INF, 2], nxt: [-1, -1, 0], done: NODES.map(() => false), log: '断开 A–B：B 到 A 的直达没了，C 仍以为 d(A)=2', edge: null });
  for (let r = 1; r <= 16; r += 1) {
    if (r % 2 === 1) { dB = dC + 1; frames.push({ d: [0, dB, dC], nxt: [-1, 2, 1], done: NODES.map(() => false), log: `第 ${r} 轮：B 问 C「你到 A 多远？」→ ${dC}，于是 B 记为 ${dB}`, edge: 2 }); }
    else { dC = dB + 1; frames.push({ d: [0, dB, dC], nxt: [-1, 2, 1], done: NODES.map(() => false), log: `第 ${r} 轮：C 问 B「你到 A 多远？」→ ${dB}，于是 C 记为 ${dC}`, edge: 1 }); }
    if (Math.max(dB, dC) >= 16) {
      frames.push({ d: [0, dB, dC], nxt: [-1, 2, 1], done: NODES.map(() => false), log: '撞上跳数上限 16 才停：这就是计数到无穷。毒性逆转 / 触发更新可缓解', edge: null });
      break;
    }
  }
  return frames;
}

export default function render(host) {
  const C0 = themeColors();
  let mode = 'dijkstra';
  let src = 0;
  let selEdge = 0;
  let frames = dijkstraFrames(adjacency(EDGES), src);
  let step = 0;

  const cv = setupCanvas(host, 340);
  host.appendChild(buildSegmented([
    { label: 'Dijkstra（链路状态）', value: 'dijkstra' },
    { label: '距离向量', value: 'dv' },
    { label: '计数到无穷', value: 'count' },
  ], mode, (v) => { mode = v; rebuild(); }));
  const ro = buildReadout({ 模式: '—', 步骤: '—', 选中边: '—', 总代价: '—' });
  host.appendChild(ro.box);
  const bCut = mkBtn('断开 / 恢复选中边');
  bCut.addEventListener('click', () => {
    EDGES[selEdge].cut = !EDGES[selEdge].cut;
    rebuild();
  });
  host.appendChild(buildToolbar(bCut));
  const note = el('pre');
  note.style.cssText = `margin:0;padding:0.5rem 0.85rem;font:12px/1.6 var(--pyr-mono,monospace);
    white-space:pre-wrap;color:${C0.fg};background:${C0.soft};border-top:1px dashed ${C0.grid}`;
  host.appendChild(note);

  function rebuild() {
    if (mode === 'dijkstra') frames = dijkstraFrames(adjacency(EDGES), src);
    else if (mode === 'dv') frames = dvFrames(adjacency(EDGES), src);
    else frames = countFrames();
    step = 0;
    sync();
    draw();
  }

  function sync() {
    const f = frames[step];
    ro.set('模式', { dijkstra: 'Dijkstra', dv: '距离向量', count: '计数到无穷' }[mode]);
    ro.set('步骤', `${step + 1} / ${frames.length}`);
    const e = EDGES[selEdge];
    ro.set('选中边', `${NMAP[e.a]}–${NMAP[e.b]} 权重 ${e.w}${e.cut ? '（已断开）' : ''}`);
    const total = f.d.reduce((a, v) => a + (v === INF ? 0 : v), 0);
    ro.set('总代价', fmt(total, 0));
    note.textContent = (f.note || f.log || '');
  }

  function pos(i) {
    const gw = cv.W - 20;
    return { x: 10 + NODES[i].x * gw, y: 12 + NODES[i].y * 150 };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const f = frames[step] || { d: [], nxt: [], done: [], edge: null };

    EDGES.forEach((e, i) => {
      const p = pos(e.a);
      const q = pos(e.b);
      const hot = f.edge === i;
      const on = i === selEdge;
      const cut = e.cut || (mode === 'count' && i === 0);
      ctx.strokeStyle = cut ? C.bad : hot ? C.accent2 : on ? C.accent : C.axis;
      ctx.lineWidth = hot ? 3 : on ? 2.2 : 1.2;
      ctx.setLineDash(cut ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, cut ? '∞' : String(e.w), (p.x + q.x) / 2, (p.y + q.y) / 2 - 4, cut ? C.bad : C.fg, { align: 'center', size: 10 });
    });

    NODES.forEach((nd, i) => {
      const p = pos(i);
      const done = f.done && f.done[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = done ? C.accent : i === src ? C.named('amber') : C.soft;
      ctx.globalAlpha = done || i === src ? 0.9 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      label(ctx, nd.id, p.x, p.y + 4, done || i === src ? C.bg : C.fg, { align: 'center', size: 11, weight: 700 });
    });

    /* 距离表：两列 */
    const ty = 186;
    label(ctx, mode === 'count' ? '到 A 的距离（各节点自己的表）' : `到 ${NMAP[src]} 的距离 / 下一跳`, 10, ty - 4, C.fg, { size: 11 });
    NODES.forEach((nd, i) => {
      const col = i < 4 ? 0 : 1;
      const row = i % 4;
      const x = 10 + col * ((W - 20) / 2);
      const y = ty + 16 + row * 22;
      const d = f.d[i] === undefined ? INF : f.d[i];
      const nx = (f.nxt && f.nxt[i] >= 0) ? NMAP[f.nxt[i]] : '—';
      const txt = `${nd.id}  d=${d === INF ? '∞' : fmt(d, 0)}  next=${nx}`;
      label(ctx, txt, x, y, d === INF ? C.axis : C.fg, { size: 12 });
    });
    label(ctx, '点一条边选中它，拖「权重」滑块改代价，或按「断开 / 恢复」', 10, H - 6, C.axis, { size: 10 });
  }

  bindPointer(cv.canvas, {
    pick: () => 'main',
    down(id, x, y) {
      let best = -1;
      let bd = 15;
      NODES.forEach((nd, i) => {
        const p = pos(i);
        const dd = Math.hypot(p.x - x, p.y - y);
        if (dd < bd) { bd = dd; best = i; }
      });
      if (best >= 0) {
        src = best;
        rebuild();
        return;
      }
      bd = 9;
      best = -1;
      EDGES.forEach((e, i) => {
        const p = pos(e.a);
        const q = pos(e.b);
        const vx = q.x - p.x;
        const vy = q.y - p.y;
        const t = clamp(((x - p.x) * vx + (y - p.y) * vy) / (vx * vx + vy * vy), 0, 1);
        const dd = Math.hypot(p.x + t * vx - x, p.y + t * vy - y);
        if (dd < bd) { bd = dd; best = i; }
      });
      if (best >= 0) {
        selEdge = best;
        sync();
        draw();
      }
    },
    move() {},
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'w', label: '选中边权重', min: 1, max: 20, step: 1, value: EDGES[0].w },
        { name: 'step', label: '步骤', min: 0, max: 60, step: 1, value: 0 },
      ],
    },
    (st) => {
      EDGES[selEdge].w = st.w;
      step = clamp(st.step, 0, frames.length - 1);
      if (mode !== 'count') {
        frames = mode === 'dijkstra' ? dijkstraFrames(adjacency(EDGES), src) : dvFrames(adjacency(EDGES), src);
        step = clamp(step, 0, frames.length - 1);
      }
      sync();
      draw();
    },
  );

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc > 0.7) {
        acc = 0;
        step = (step + 1) % frames.length;
        sync();
        draw();
      }
    },
    onReset() { step = 0; sync(); draw(); },
  });

  rebuild();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}

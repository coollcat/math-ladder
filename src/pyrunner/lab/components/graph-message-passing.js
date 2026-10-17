/* =========================================================================
 * 图与矩阵联体视图：消息传递 / PageRank（第 53 章）
 * -------------------------------------------------------------------------
 * 一个组件、两种作业，共用同一台「一步 = 一层」状态机：
 *   mode="message"  —— GNN 式逐层邻居聚合：h'(v) = UPDATE(h(v), AGG_{u→v} h(u))
 *   mode="pagerank" —— 幂迭代：r' = d·M·r + (1−d)/n，死端按均匀传送处理
 * 共同点：先让蓝点沿箭头把「旧值」送出去，再整体换新；右侧矩阵同步显示
 * 这一层真正使用的加权格子，下方条带显示这一层的向量。
 *
 * 交互：单步 / 回退 / 播放 / 重置都走真正的步进状态机（不是滑块换图）；
 * 悬停节点或矩阵格子会联动高亮对应行列与边（行/列额外有描边，不只靠颜色）。
 * reduced-motion 用户禁用自动播放，单步直接给终态；滚出视口自动暂停。
 *
 * 契约（```lab 围栏里的 JSON）：
 *   {
 *     "type": "graph-message-passing",
 *     "mode": "message",            // 或 "pagerank"
 *     "aggregation": "mean",        // sum | mean | max（message 模式）
 *     "selfLoop": true,
 *     "damping": 0.85,              // pagerank 模式
 *     "nodes": ["A","B","C","D","E"],
 *     "edges": [[0,1],[1,2]],
 *     "features": [[1,0],[0,1]]
 *   }
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, label, arrow, fmt, clamp, el,
  buildSliders, mergeSpec, buildSegmented, buildToolbar, buildReadout, mkBtn,
  onScreen,
} from '../core.js';

const MAX_LAYERS = 8;      // 消息传递最多走多少层
const MAX_ITER = 24;       // PageRank 幂迭代上限
const STEP_DUR = 1.0;      // 速度 1 倍时，一步动画的时长（秒）
const HOLD_DUR = 0.4;      // 连播时两步之间的停顿
const TAU = Math.PI * 2;

const BASE_SLIDERS = [
  /* d 给到 0..1 全量程：0 时 G 退化成整块 1/n，1 时只剩纯链接矩阵（教学对照用） */
  { name: 'damping', label: '阻尼 d', min: 0, max: 1, step: 0.01, value: 0.85, fmt: 2 },
  { name: 'speed', label: '播放速度（步/秒）', min: 0.3, max: 2.5, step: 0.1, value: 0.9, fmt: 1 },
];

const DEFAULT_NODES = ['A', 'B', 'C', 'D', 'E'];
/* 有向边 u→v：消息与排名流量都沿箭头走。E 是死端（没有出边），D 没有入邻居。 */
const DEFAULT_EDGES = [[0, 1], [0, 2], [1, 2], [2, 0], [3, 0], [1, 4], [3, 1]];
const DEFAULT_FEATS = [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]];

const easeInOut = (t) => {
  const u = clamp(t, 0, 1);
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
};

function maxChange(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (let d = 0; d < a[i].length; d += 1) m = Math.max(m, Math.abs(a[i][d] - b[i][d]));
  }
  return m;
}

function maxAbs(vals) {
  let m = 1e-9;
  vals.forEach((v) => {
    v.forEach((x) => { m = Math.max(m, Math.abs(x)); });
  });
  return m;
}

function lerpVecs(a, b, f) {
  return a.map((row, i) => row.map((x, d) => x + (b[i][d] - x) * f));
}

function normNodes(spec) {
  const src = Array.isArray(spec.nodes) ? spec.nodes : [];
  const out = src.length >= 2 && src.length <= 8 ? src.map((s) => String(s)) : DEFAULT_NODES.slice();
  return out;
}

function normEdges(spec, n) {
  const src = Array.isArray(spec.edges) ? spec.edges : null;
  const list = src || DEFAULT_EDGES;
  const seen = new Set();
  const out = [];
  list.forEach((e) => {
    if (!Array.isArray(e) || e.length < 2) return;
    const u = Math.round(Number(e[0]));
    const v = Math.round(Number(e[1]));
    if (!(u >= 0 && u < n && v >= 0 && v < n) || u === v) return;
    const key = u + '>' + v;
    if (seen.has(key)) return;
    seen.add(key);
    out.push([u, v]);
  });
  return out.length ? out.slice(0, 32) : DEFAULT_EDGES.filter(([u, v]) => u < n && v < n);
}

function normFeats(spec, n) {
  const src = Array.isArray(spec.features) ? spec.features : null;
  if (src && src.length === n && src.every((f) => Array.isArray(f) && f.length >= 1 && f.length <= 2)) {
    return src.map((f) => f.slice(0, 2).map((x) => (typeof x === 'number' ? x : Number(x) || 0)));
  }
  if (n === DEFAULT_NODES.length) return DEFAULT_FEATS.map((f) => f.slice());
  return Array.from({ length: n }, (_, i) => [Math.cos(i * 1.3), Math.sin(i * 1.3)]);
}

export default function render(host, spec) {
  const nodes = normNodes(spec);
  const edges = normEdges(spec, nodes.length);
  const feats = normFeats(spec, nodes.length);
  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cfg = {
    mode: spec.mode === 'pagerank' ? 'pagerank' : 'message',
    aggregation: ['sum', 'mean', 'max'].indexOf(spec.aggregation) >= 0 ? spec.aggregation : 'mean',
    selfLoop: spec.selfLoop !== false,
  };

  const sliders = buildSliders(
    { sliders: mergeSpec(BASE_SLIDERS, spec) },
    () => { applyConfig(); },
  );

  const ro = buildReadout({
    模式: '—', 步数: '—', 最大变化: '—', 状态: '—', 悬停: '—',
  });
  host.appendChild(ro.box);

  const segMode = buildSegmented(
    [
      { label: '消息传递（逐层聚合）', value: 'message' },
      { label: 'PageRank（幂迭代）', value: 'pagerank' },
    ],
    cfg.mode,
    (v) => { cfg.mode = v; syncMode(); applyConfig(); },
  );
  const segAgg = buildSegmented(
    [
      { label: '求和 SUM', value: 'sum' },
      { label: '平均 MEAN', value: 'mean' },
      { label: '最大 MAX', value: 'max' },
    ],
    cfg.aggregation,
    (v) => { cfg.aggregation = v; applyConfig(); },
  );
  const segLoop = buildSegmented(
    [
      { label: '含自环', value: 'on' },
      { label: '不含自环', value: 'off' },
    ],
    cfg.selfLoop ? 'on' : 'off',
    (v) => { cfg.selfLoop = v === 'on'; applyConfig(); },
  );
  host.appendChild(segMode);
  host.appendChild(segAgg);
  host.appendChild(segLoop);

  const btnStep = mkBtn('单步 ▶');
  const btnBack = mkBtn('回退一步');
  const btnPlay = mkBtn(reduced ? '减少动效' : '播放');
  const btnReset = mkBtn('重置');
  btnPlay.disabled = reduced;
  host.appendChild(buildToolbar(btnStep, btnBack));
  host.appendChild(buildToolbar(btnPlay, btnReset));

  /* 图例（非颜色冗余：每种流向都有文字） */
  const legend = el('div', 'ml-lab__legend');
  legend.innerHTML = '';
  const legendItems = [
    ['边上的小点', '这一步流动的消息 / 流量'],
    ['节点里的箭头', '二维特征（消息传递）'],
    ['节点圈的大小', 'PageRank 得分（幂迭代）'],
  ];
  legendItems.forEach(([k, v]) => {
    const s = el('span', null, k + '：' + v);
    legend.appendChild(s);
  });
  host.appendChild(legend);

  const cv = setupCanvas(host, 410);

  let hist = [];
  let mat = { M: [], note: '' };
  let residual = [];
  let converged = false;
  let cur = 0;
  let segT = 0;
  let anim = false;
  let hold = 0;
  let playing = false;
  let visible = true;
  let raf = null;
  let last = 0;
  let mxRect = null;
  let dragNode = -1;
  const pos = {};
  let posKey = '';
  const hover = { kind: null, i: -1, j: -1 };

  /* ---------- 数学：两条流水线 ---------- */

  function buildMessageHistory() {
    const n = nodes.length;
    const dim = feats[0].length;
    const inNbr = Array.from({ length: n }, () => []);
    edges.forEach(([u, v]) => { inNbr[v].push(u); });
    const outHist = [feats.map((f) => f.slice())];
    const outRes = [0];
    for (let l = 0; l < MAX_LAYERS; l += 1) {
      const prev = outHist[outHist.length - 1];
      const next = prev.map(() => new Array(dim).fill(0));
      for (let v = 0; v < n; v += 1) {
        const ns = cfg.selfLoop ? inNbr[v].concat([v]) : inNbr[v].slice();
        if (!ns.length) continue;              // 没人给它发消息：零向量
        for (let d = 0; d < dim; d += 1) {
          if (cfg.aggregation === 'max') {
            let m = -Infinity;
            ns.forEach((u) => { m = Math.max(m, prev[u][d]); });
            next[v][d] = m;
          } else {
            let s = 0;
            ns.forEach((u) => { s += prev[u][d]; });
            next[v][d] = cfg.aggregation === 'mean' ? s / ns.length : s;
          }
        }
      }
      outHist.push(next);
      outRes.push(maxChange(prev, next));
      if (outRes[outRes.length - 1] < 1e-4) break;
    }
    const M = Array.from({ length: n }, () => new Array(n).fill(0));
    edges.forEach(([u, v]) => { M[v][u] += 1; });
    if (cfg.selfLoop) for (let i = 0; i < n; i += 1) M[i][i] += 1;
    let note;
    if (cfg.aggregation === 'max') {
      note = 'MAX 聚合不是线性算子：矩阵只标出谁给谁发消息';
    } else if (cfg.aggregation === 'mean') {
      if (cfg.selfLoop) {
        for (let v = 0; v < n; v += 1) {
          const s = M[v].reduce((a, b) => a + b, 0);
          if (s > 0) for (let u = 0; u < n; u += 1) M[v][u] /= s;
        }
        note = '平均聚合（含自环）：矩阵是 D̃⁻¹Ã，每行和 = 1';
      } else {
        for (let v = 0; v < n; v += 1) {
          const s = M[v].reduce((a, b) => a + b, 0);
          if (s > 0) for (let u = 0; u < n; u += 1) M[v][u] /= s;
        }
        note = '平均聚合（不含自环）：矩阵是 D⁻¹A';
      }
    } else {
      note = cfg.selfLoop ? '求和聚合（含自环）：矩阵是 Ã（0/1 结构）' : '求和聚合：矩阵是邻接矩阵 A';
    }
    return { hist: outHist, mat: { M, note }, residual: outRes };
  }

  function buildPagerankHistory() {
    const n = nodes.length;
    const d = sliders.state.damping;
    const outDeg = new Array(n).fill(0);
    edges.forEach(([u]) => { outDeg[u] += 1; });
    const M = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let j = 0; j < n; j += 1) {
      if (outDeg[j] === 0) {
        /* 死端：没有出边，就在这一步均匀传送，等价于整列 1/n */
        for (let i = 0; i < n; i += 1) M[i][j] = 1 / n;
      } else {
        edges.forEach(([u, v]) => { if (u === j) M[v][j] += 1 / outDeg[j]; });
      }
    }
    const G = M.map((row) => row.map((m) => d * m + (1 - d) / n));
    let r = new Array(n).fill(1 / n);
    /* 统一成 [1] 形式的行向量，后面画图 / 读数一套代码吃两种模式 */
    const outHist = [r.map((x) => [x])];
    const outRes = [0];
    for (let it = 0; it < MAX_ITER; it += 1) {
      const next = new Array(n).fill(0);
      let resid = 0;
      for (let i = 0; i < n; i += 1) {
        let s = 0;
        for (let j = 0; j < n; j += 1) s += G[i][j] * r[j];
        next[i] = s;
        resid = Math.max(resid, Math.abs(s - r[i]));
      }
      outHist.push(next.map((x) => [x]));
      outRes.push(resid);
      r = next;
      if (outRes[outRes.length - 1] < 1e-7) break;
    }
    return {
      hist: outHist,
      mat: { M: G, note: 'G = dM + (1−d)/n（死端均匀传送）' },
      residual: outRes,
    };
  }

  function applyConfig() {
    const built = cfg.mode === 'pagerank' ? buildPagerankHistory() : buildMessageHistory();
    hist = built.hist;
    mat = built.mat;
    residual = built.residual;
    converged = residual.length > 1 && residual[residual.length - 1] < (cfg.mode === 'pagerank' ? 1e-7 : 1e-4);
    cur = 0;
    segT = 0;
    anim = false;
    hold = 0;
    syncButtons();
    draw();
  }

  /* ---------- 画布布局 ---------- */

  function layoutRects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    if (narrow) {
      const gh = Math.round(H * 0.42);
      const graph = { x: 6, y: 26, w: W - 12, h: gh };
      const by = 26 + gh + 36;
      const size = Math.min(W * 0.56, H - by - 18);
      return {
        narrow,
        graph,
        matrix: { x: 6, y: by, w: size, h: size },
        bars: { x: 6 + size + 12, y: by, w: W - size - 24, h: size },
      };
    }
    const graph = { x: 8, y: 26, w: Math.round(W * 0.5) - 16, h: H - 44 };
    const rightX = Math.round(W * 0.52);
    const rightW = W - rightX - 8;
    const size = Math.min(rightW * 0.56, H - 78);
    return {
      narrow,
      graph,
      matrix: { x: rightX, y: 42, w: size, h: size },
      bars: { x: rightX + size + 14, y: 42, w: rightW - size - 14, h: size },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h;
    if (key === posKey && Object.keys(pos).length === nodes.length) return;
    posKey = key;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2 + 6;
    const R = Math.max(28, Math.min(rect.w, rect.h) * 0.33);
    nodes.forEach((_, i) => {
      const a = -Math.PI / 2 + (i / nodes.length) * TAU;
      pos[i] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
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

    const rects = layoutRects();
    ensurePos(rects.graph);
    const f = anim ? easeInOut(segT) : 0;
    const i0 = clamp(cur, 0, hist.length - 1);
    const i1 = Math.min(i0 + 1, hist.length - 1);
    const vals = lerpVecs(hist[i0], hist[i1], f);

    drawGraph(ctx, rects.graph, vals, C);
    drawMatrix(ctx, rects.matrix, C, rects.narrow);
    drawBars(ctx, rects.bars, vals, C, rects.narrow);

    const hint = cfg.mode === 'pagerank'
      ? '每步：r ← d·M·r + (1−d)/n，所有节点同时换新'
      : '每步：所有节点同时用「上一层」的特征更新自己——先送消息，再换新';
    label(ctx, hint, 8, H - 22, C.grid, { size: 10 });
    label(ctx, mat.note, 8, H - 8, C.grid, { size: 10 });

    updateReadout(vals);
  }

  function edgeEnds(a, ra, b, rb) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L;
    const uy = dy / L;
    return {
      x0: a.x + ux * ra, y0: a.y + uy * ra,
      x1: b.x - ux * rb, y1: b.y - uy * rb,
      ux, uy,
    };
  }

  function nodeRadius(i, vals) {
    if (cfg.mode === 'pagerank') {
      let mx = 1e-9;
      vals.forEach((v) => { mx = Math.max(mx, v[0]); });
      return 11 + 16 * (vals[i][0] / mx);
    }
    return 15;
  }

  function visibleGraphRadius(i, vals) {
    let mx = 1e-9;
    vals.forEach((v) => {
      const m = v.length > 1 ? Math.hypot(v[0], v[1]) : Math.abs(v[0]);
      mx = Math.max(mx, m);
    });
    return mx;
  }

  function highlightedEdges() {
    /* 悬停节点：点亮它的入边（谁给它发消息）和出边（它给谁发） */
    if (hover.kind === 'node' && hover.i >= 0) return { node: hover.i };
    if (hover.kind === 'cell' && hover.i >= 0) return { cell: [hover.j, hover.i] };
    return null;
  }

  function isEdgeHot(u, v) {
    const h = highlightedEdges();
    if (!h) return false;
    if (h.node !== undefined) return u === h.node || v === h.node;
    return h.cell[0] === u && h.cell[1] === v;
  }

  function drawGraph(ctx, rect, vals, C) {
    const maxMag = visibleGraphRadius(0, vals);
    /* 边 + 消息小点 */
    edges.forEach(([u, v]) => {
      const ra = nodeRadius(u, vals);
      const rb = nodeRadius(v, vals);
      const e = edgeEnds(pos[u], ra, pos[v], rb);
      const hot = isEdgeHot(u, v);
      arrow(ctx, e.x0, e.y0, e.x1, e.y1, hot ? C.accent2 : C.axis, hot ? 2.6 : 1.4, 8);
      if (anim && segT > 0.02) {
        const p = easeInOut(clamp(segT * 1.15 - 0.08, 0, 1));
        const x = e.x0 + (e.x1 - e.x0) * p;
        const y = e.y0 + (e.y1 - e.y0) * p;
        ctx.save();
        ctx.globalAlpha = 0.9 * Math.sin(Math.PI * clamp(segT, 0, 1)) + 0.1;
        ctx.fillStyle = cfg.mode === 'pagerank' ? C.named('amber') : C.named('blue');
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    });
    /* 节点 */
    nodes.forEach((nm, i) => {
      const p = pos[i];
      const r = nodeRadius(i, vals);
      const v = vals[i];
      const mag = v.length > 1 ? Math.hypot(v[0], v[1]) : Math.abs(v[0]);
      const inten = clamp(mag / maxMag, 0, 1);
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fillStyle = C.bg;
      ctx.fill();
      ctx.globalAlpha = 0.16 + 0.5 * inten;
      ctx.fillStyle = cfg.mode === 'pagerank' ? C.accent2 : C.accent;
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.strokeStyle = hover.i === i ? C.accent2 : C.axis;
      ctx.lineWidth = hover.i === i ? 3 : 1.6;
      ctx.stroke();
      ctx.restore();
      if (v.length > 1) {
        const m = Math.hypot(v[0], v[1]);
        if (m > 1e-6) {
          const L = (r - 5) * clamp(m / maxMag, 0.25, 1);
          arrow(ctx, p.x, p.y, p.x + (v[0] / m) * L, p.y - (v[1] / m) * L, C.named('purple'), 2, 6);
        }
      }
      label(ctx, nm, p.x, p.y - r - 6, hover.i === i ? C.accent2 : C.fg, {
        size: 11, weight: 700, align: 'center',
      });
      label(ctx, valueText(v), p.x, p.y + r + 13, C.fg, { size: 9.5, align: 'center' });
    });
  }

  function valueText(v) {
    if (v.length > 1) return fmt(v[0], 2) + ', ' + fmt(v[1], 2);
    return fmt(v[0], 3);
  }

  function drawMatrix(ctx, rect, C, narrow) {
    const n = nodes.length;
    const M = mat.M;
    const labelW = narrow ? 18 : 22;
    const topH = 17;
    const cell = Math.min((rect.w - labelW - 2) / n, (rect.h - topH - 2) / n);
    const x0 = rect.x + labelW;
    const y0 = rect.y + topH;
    mxRect = { x0, y0, cell, n };
    label(ctx, cfg.mode === 'pagerank' ? 'Google 矩阵 G（行 ← 列）' : '本层聚合器（行 ← 列）', rect.x, rect.y + 12, C.fg, {
      size: narrow ? 9.5 : 11, weight: 700,
    });
    let mx = 1e-9;
    M.forEach((row) => row.forEach((v) => { mx = Math.max(mx, Math.abs(v)); }));
    /* 行列底色（悬停联动） */
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const x = x0 + j * cell;
        const y = y0 + i * cell;
        const v = M[i][j];
        const a = clamp(Math.abs(v) / mx, 0, 1);
        ctx.save();
        if (v >= 0) {
          ctx.fillStyle = C.accent;
          ctx.globalAlpha = 0.08 + 0.72 * a;
        } else {
          ctx.fillStyle = C.bad;
          ctx.globalAlpha = 0.12 + 0.6 * a;
        }
        ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        ctx.restore();
        if (cell >= 26) {
          label(ctx, fmt(v, 2), x + cell / 2, y + cell / 2 + 3.5,
            a > 0.55 ? C.bg : C.fg, { size: 9, align: 'center' });
        }
      }
    }
    /* 行 / 列高亮：描边（非颜色冗余），不只靠颜色 */
    const hi = hover.i;
    const hj = hover.kind === 'cell' ? hover.j : hover.i;
    if (hi >= 0) {
      ctx.save();
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 - 1, y0 + hi * cell - 1, n * cell + 2, cell + 2);
      ctx.restore();
    }
    if (hj >= 0) {
      ctx.save();
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 + hj * cell - 1, y0 - 1, cell + 2, n * cell + 2);
      ctx.restore();
    }
    /* 行列标签 */
    for (let i = 0; i < n; i += 1) {
      label(ctx, nodes[i], x0 - 6, y0 + i * cell + cell / 2 + 3.5, hover.i === i ? C.accent2 : C.axis, {
        size: 8.5, align: 'right',
      });
      label(ctx, nodes[i], x0 + i * cell + cell / 2, y0 - 5, C.axis, { size: 8.5, align: 'center' });
    }
  }

  function drawBars(ctx, rect, vals, C, narrow) {
    const n = nodes.length;
    const rowH = Math.max(22, Math.min(rect.h / n, 36));
    const mx = maxAbs(vals);
    const bx = rect.x + (narrow ? 14 : 20);
    const bw = Math.max(24, rect.w - (narrow ? 16 : 24));
    nodes.forEach((nm, i) => {
      const y = rect.y + i * rowH;
      label(ctx, nm, rect.x, y + 11, hover.i === i ? C.accent2 : C.fg, {
        size: 10, weight: hover.i === i ? 700 : 400,
      });
      ctx.save();
      ctx.fillStyle = C.soft;
      ctx.fillRect(bx, y + 3, bw, 9);
      const v = vals[i];
      const m = v.length > 1 ? Math.hypot(v[0], v[1]) : Math.abs(v[0]);
      ctx.fillStyle = hover.i === i ? C.accent2 : (cfg.mode === 'pagerank' ? C.named('amber') : C.accent);
      ctx.fillRect(bx, y + 3, bw * clamp(m / mx, 0, 1), 9);
      ctx.restore();
      label(ctx, valueText(v), rect.x, y + 25, C.grid, { size: 8.5 });
    });
  }

  function updateReadout(vals) {
    const aggName = { sum: '求和', mean: '平均', max: '最大值' }[cfg.aggregation];
    ro.set('模式', cfg.mode === 'pagerank'
      ? 'PageRank 幂迭代（d = ' + fmt(sliders.state.damping, 2) + '）'
      : '消息传递：' + aggName + (cfg.selfLoop ? ' + 自环' : '（无自环）'));
    ro.set('步数', '第 ' + cur + ' / ' + (hist.length - 1) + ' 步' + (anim ? '（进行中）' : ''));
    ro.set('最大变化', residual[Math.min(cur + (anim ? 1 : 0), residual.length - 1)] === undefined
      ? '—'
      : fmt(residual[Math.min(cur + (anim ? 1 : 0), residual.length - 1)], 5));
    ro.set('状态', converged ? '已收敛（变化 < 阈值）' : (cur >= hist.length - 1 ? '走到上限（未低于阈值）' : '迭代中'));
    const hv = hover.i >= 0 ? nodes[hover.i] + (hover.kind === 'cell' ? ' ← ' + nodes[hover.j] : '') : '—';
    ro.set('悬停', hv + (hover.i >= 0 ? '：' + valueText(vals[hover.i]) : ''));
  }

  /* ---------- 步进状态机 ---------- */

  function startRaf() {
    if (raf == null && !reduced) raf = requestAnimationFrame(tick);
  }

  function stopRaf() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }

  function beginStep() {
    if (anim || cur >= hist.length - 1) return false;
    if (reduced) {
      cur += 1;
      segT = 0;
      hold = HOLD_DUR;
      return true;
    }
    anim = true;
    segT = 0;
    hold = 0;
    startRaf();
    return true;
  }

  function advance(dt) {
    const speed = sliders.state.speed || 1;
    if (anim) {
      segT += dt / (STEP_DUR / speed);
      if (segT >= 1) {
        segT = 0;
        anim = false;
        cur = Math.min(cur + 1, hist.length - 1);
        hold = HOLD_DUR;
        syncButtons();
      }
      return;
    }
    if (!playing) return;
    if (hold > 0) {
      hold = Math.max(0, hold - dt);
      return;
    }
    if (cur < hist.length - 1) beginStep();
    else stopPlayback();
  }

  function tick(now) {
    raf = null;
    if (!host.isConnected) {
      stopPlayback();
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (!visible) {
      stopRaf();
      return;
    }
    advance(dt);
    draw();
    if (playing || anim) startRaf();
  }

  function stopPlayback() {
    playing = false;
    syncButtons();
  }

  function syncButtons() {
    btnPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放');
    btnPlay.disabled = reduced;
  }

  function syncMode() {
    const isRank = cfg.mode === 'pagerank';
    segAgg.style.display = isRank ? 'none' : '';
    segLoop.style.display = isRank ? 'none' : '';
    /* 阻尼只在 PageRank 模式有意义：消息传递时把那一行滑块收起来 */
    const dampRow = sliders.box.children[0];
    if (dampRow) dampRow.style.display = isRank ? '' : 'none';
  }

  /* ---------- 指针 ---------- */

  function nodeAt(px, py) {
    let hit = -1;
    let bd = 1e9;
    nodes.forEach((_, i) => {
      const p = pos[i];
      if (!p) return;
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < Math.max(18, 15) + 3 && d < bd) {
        bd = d;
        hit = i;
      }
    });
    return hit;
  }

  function matrixCellAt(px, py) {
    if (!mxRect) return null;
    const { x0, y0, cell, n } = mxRect;
    const j = Math.floor((px - x0) / cell);
    const i = Math.floor((py - y0) / cell);
    if (i < 0 || i >= n || j < 0 || j >= n) return null;
    return { i, j };
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = nodeAt(px, py);
      return i >= 0 ? { kind: 'node', i } : null;
    },
    down(id) {
      if (id && id.kind === 'node') dragNode = id.i;
    },
    move(id, px, py) {
      if (dragNode < 0) return;
      const rect = layoutRects().graph;
      const p = pos[dragNode];
      p.x = clamp(px, rect.x + 20, rect.x + rect.w - 20);
      p.y = clamp(py, rect.y + 26, rect.y + rect.h - 22);
      draw();
    },
    up() { dragNode = -1; },
    hover(px, py) {
      const i = nodeAt(px, py);
      let next = { kind: null, i: -1, j: -1 };
      if (i >= 0) next = { kind: 'node', i, j: i };
      else {
        const cell = matrixCellAt(px, py);
        if (cell) next = { kind: 'cell', i: cell.i, j: cell.j };
      }
      if (next.kind !== hover.kind || next.i !== hover.i || next.j !== hover.j) {
        hover.kind = next.kind;
        hover.i = next.i;
        hover.j = next.j;
        draw();
      }
    },
    leave() {
      if (hover.kind) {
        hover.kind = null;
        hover.i = -1;
        hover.j = -1;
        draw();
      }
    },
  });

  btnStep.addEventListener('click', () => { beginStep(); draw(); });
  btnBack.addEventListener('click', () => {
    if (anim) {
      anim = false;
      segT = 0;
    } else {
      cur = Math.max(0, cur - 1);
    }
    hold = 0;
    stopPlayback();
    draw();
  });
  btnPlay.addEventListener('click', () => {
    if (reduced) return;
    playing = !playing;
    last = 0;
    if (playing && cur >= hist.length - 1 && !anim) {
      playing = false;
    }
    syncButtons();
    if (playing) startRaf();
    else stopRaf();
    draw();
  });
  btnReset.addEventListener('click', () => {
    stopPlayback();
    stopRaf();
    cur = 0;
    segT = 0;
    anim = false;
    hold = 0;
    draw();
  });

  onScreen(host, (v) => {
    visible = v;
    if (!v) stopRaf();
    else if (playing || anim) startRaf();
  });

  syncMode();
  applyConfig();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      stopPlayback();
      stopRaf();
      cv.redraw = null;
    },
  };
}

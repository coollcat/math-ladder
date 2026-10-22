/* =========================================================================
 * lab 组件：g53-degree-ladder —— 度序列 + 度分布直方图（第 53 章「度序列与中心性初步」）
 * -------------------------------------------------------------------------
 * 用法（lab 围栏）：
 *   { "type": "g53-degree-ladder", "title": "度序列：星形、链形、双簇" }
 *
 * 字段：
 *   preset    "star" | "chain" | "two-clusters" | "custom"（初始预设）
 *   nodes     可选，自定义节点名
 *   edges     可选，自定义边表（preset="custom" 时生效）
 *
 * 交互（真状态机，不是滑块换图）：
 *   · 「加一条边 / 删一条边」直接改边集，图、度数、度序列、直方图四处同步；
 *   · 「移动一条边」把最后一条边的终点换到另一个节点——课程里那句
 *     「把一条边从小蓝移到小紫，看排名如何变化」就是这一颗按钮；
 *   · 预设按钮一键换整张图，用来对照「节点数相同、形状完全不同」；
 *   · 悬停节点或直方图的柱子，图上的节点集合与直方图那一根同时加粗。
 *
 * 看什么：屏幕中下方是**度序列**（从大到小排队）与它的**直方图**。
 *   星形与链形的直方图一眼不同：星形是「一根高柱 + 一堆 1」，
 *   链形是中间凸起的一条小丘。两者节点数一样，度序列完全不同。
 *   度中心性 C_D = d/(n−1) 随节点数 n 变化，同一张图换 n 口径就换数字——
 *   这也是读数条里随时给出 n 的原因。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildToolbar,
  buildReadout, mkBtn, label, clamp, fmt, el,
} from '../core.js';
import { degOf, adjOf, circleLayout, pickNode, drawNode, legendInto } from './graph-kit.js';

/* 预设：每张图都是「节点数相同、形状不同」的对照组 */
const PRESETS = {
  star: {
    label: '星形（1 个枢纽）',
    nodes: ['中心', 'A', 'B', 'C', 'D', 'E'],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]],
  },
  chain: {
    label: '链形（无枢纽）',
    nodes: ['1', '2', '3', '4', '5', '6'],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  'two-clusters': {
    label: '双簇（两个小团）',
    nodes: ['a', 'b', 'c', 'd', 'e', 'f'],
    edges: [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5]],
  },
  custom: {
    label: '四人小组（课程例题）',
    nodes: ['小蓝', '小橙', '小绿', '小紫'],
    edges: [[0, 1], [0, 2], [0, 3], [1, 2]],
  },
};

export default function render(host, spec) {
  const presetKey = PRESETS[spec.preset] ? spec.preset : 'custom';
  let preset = PRESETS[presetKey];
  let nodes = Array.isArray(spec.nodes) && spec.nodes.length >= 2
    ? spec.nodes.slice(0, 10).map(String)
    : preset.nodes.slice();
  let edges = Array.isArray(spec.edges) && spec.edges.length
    ? spec.edges
      .filter((e) => Array.isArray(e) && e.length >= 2)
      .map((e) => [Math.round(Number(e[0])), Math.round(Number(e[1]))])
      .filter(([u, v]) => u >= 0 && v >= 0 && u < nodes.length && v < nodes.length && u !== v)
    : preset.edges.map((e) => e.slice());

  const cv = setupCanvas(host, 380);

  const pos = {};
  let posKey = '';
  let dragNode = -1;
  let hoverNode = -1;
  let hoverDeg = -1;
  let histRect = null;
  let seqRect = null;

  /* ---------- 结构 ---------- */

  function graphNow() {
    const A = adjOf(nodes.length, edges, { directed: false });
    const deg = degOf(A);
    const seq = deg.slice().sort((a, b) => b - a);
    /* 直方图：度数 → 出现次数（0 度也要有一根柱子，孤立点不能消失） */
    const maxD = Math.max(0, ...deg);
    const hist = new Array(maxD + 1).fill(0);
    deg.forEach((d) => { hist[d] += 1; });
    return { A, deg, seq, hist, maxD };
  }

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    const topH = narrow ? Math.round(H * 0.46) : Math.round(H * 0.56);
    const graph = { x: 8, y: 28, w: narrow ? W - 16 : Math.round(W * 0.46) - 16, h: topH };
    const hx = narrow ? 8 : Math.round(W * 0.48);
    const hw = narrow ? W - 16 : W - hx - 8;
    const hy = 28 + (narrow ? topH + 22 : 0);
    const hh = narrow ? Math.round((H - hy - 34) * 0.52) : Math.round(H * 0.40);
    return {
      narrow,
      graph,
      hist: { x: hx, y: hy, w: hw, h: hh },
      seq: { x: hx, y: hy + hh + (narrow ? 26 : 30), w: hw, h: narrow ? 60 : 64 },
    };
  }

  function ensurePos(rect) {
    const key = rect.x + ':' + rect.y + ':' + rect.w + ':' + rect.h + ':' + nodes.length;
    if (key === posKey && Object.keys(pos).length === nodes.length) return;
    posKey = key;
    const pts = circleLayout(nodes.length, rect, 0.36);
    pts.forEach((pt, i) => { pos[i] = pt; });
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
    const g = graphNow();
    const maxDeg = Math.max(1, ...g.deg);

    /* 图 */
    edges.forEach(([u, v]) => {
      if (!pos[u] || !pos[v]) return;
      const hot = hoverNode >= 0 && (u === hoverNode || v === hoverNode);
      ctx.save();
      ctx.strokeStyle = hot ? C.accent2 : C.axis;
      ctx.lineWidth = hot ? 3 : 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pos[u].x, pos[u].y);
      ctx.lineTo(pos[v].x, pos[v].y);
      ctx.stroke();
      ctx.restore();
    });
    nodes.forEach((nm, i) => {
      const d = g.deg[i];
      const hot = hoverNode === i || (hoverDeg >= 0 && d === hoverDeg);
      drawNode(ctx, pos[i], 13 + 9 * (d / maxDeg), C, {
        text: nm,
        sub: 'd=' + d,
        stroke: hot ? C.accent2 : C.axis,
        lineWidth: hot ? 2.6 : 1.6,
        ring: hot ? C.accent2 : null,
        textColor: hot ? C.accent2 : C.fg,
        fill: C.accent,
        fillAlpha: 0.10 + 0.45 * (d / maxDeg),
      });
    });

    drawHist(ctx, r.hist, g, C);
    drawSeq(ctx, r.seq, g, C, r.narrow);

    label(ctx, '柱高 = 度数为 k 的节点有几个；悬停柱子，图上对应的节点一起加粗',
      8, H - 8, C.grid, { size: 10 });
  }

  function drawHist(ctx, rect, g, C) {
    const n = g.hist.length;
    const padL = 26;
    const padB = 22;
    const w = rect.w - padL - 8;
    const h = rect.h - padB - 16;
    histRect = { x: rect.x + padL, y: rect.y + 16, w, h, n };
    label(ctx, '度分布直方图', rect.x, rect.y + 10, C.fg, { size: 11, weight: 700 });
    /* 坐标轴 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x + padL, rect.y + 16);
    ctx.lineTo(rect.x + padL, rect.y + 16 + h);
    ctx.lineTo(rect.x + padL + w, rect.y + 16 + h);
    ctx.stroke();
    ctx.restore();
    const maxCount = Math.max(1, ...g.hist);
    const bw = w / n;
    for (let k = 0; k < n; k += 1) {
      const c = g.hist[k];
      const hot = hoverDeg === k;
      const x = rect.x + padL + k * bw;
      const bh = (c / maxCount) * h;
      ctx.save();
      ctx.fillStyle = hot ? C.accent2 : C.accent;
      ctx.globalAlpha = c ? (hot ? 0.95 : 0.72) : 0.12;
      ctx.fillRect(x + 1, rect.y + 16 + h - bh, Math.max(1, bw - 2), bh);
      ctx.restore();
      if (c) {
        label(ctx, String(c), x + bw / 2, rect.y + 16 + h - bh - 4, hot ? C.accent2 : C.fg, {
          size: 9.5, align: 'center', weight: hot ? 700 : 400,
        });
      }
      label(ctx, String(k), x + bw / 2, rect.y + 16 + h + 13, hot ? C.accent2 : C.axis, {
        size: 9, align: 'center', weight: hot ? 700 : 400,
      });
    }
    label(ctx, '度数 k', rect.x + padL + w, rect.y + 16 + h + 13, C.grid, { size: 9, align: 'right' });
    label(ctx, '节点数', rect.x + 2, rect.y + 20, C.grid, { size: 8.5 });
  }

  function drawSeq(ctx, rect, g, C, narrow) {
    seqRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    label(ctx, '度序列（从大到小）', rect.x, rect.y + 4, C.fg, { size: 11, weight: 700 });
    const n = nodes.length;
    const cellW = Math.min(38, (rect.w - 40) / n);
    const y = rect.y + 26;
    g.seq.forEach((d, i) => {
      const x = rect.x + 30 + i * cellW;
      const hot = hoverDeg >= 0 && d === hoverDeg;
      ctx.save();
      ctx.fillStyle = hot ? C.accent2 : C.soft;
      ctx.globalAlpha = hot ? 0.9 : 1;
      ctx.fillRect(x, y, cellW - 3, 18);
      ctx.restore();
      label(ctx, String(d), x + (cellW - 3) / 2, y + 13, hot ? C.bg : C.fg, {
        size: 10.5, align: 'center', weight: 700,
      });
    });
    label(ctx, 'd:', rect.x, y + 13, C.axis, { size: 9.5 });
    const cd = n > 1 ? g.seq[0] / (n - 1) : 0;
    label(ctx, '最大度中心性 C_D = ' + g.seq[0] + ' / (' + n + ' − 1) = ' + fmt(cd, 2),
      rect.x, y + 36, C.accent, { size: narrow ? 9.5 : 10.5, weight: 700 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 当前图: '—', '节点 / 边': '—', 度序列: '—', 悬停: '—' });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    Object.keys(PRESETS).map((k) => ({ value: k, label: PRESETS[k].label })),
    presetKey,
    (v) => {
      preset = PRESETS[v];
      nodes = preset.nodes.slice();
      edges = preset.edges.map((e) => e.slice());
      posKey = '';
      hoverNode = -1;
      hoverDeg = -1;
      refresh();
    },
  ));

  const btnAdd = mkBtn('加一条边');
  const btnDel = mkBtn('删一条边');
  const btnMove = mkBtn('把最后一条边挪个终点');
  host.appendChild(buildToolbar(btnAdd, btnDel, btnMove));

  legendInto(host, [
    [themeColors().accent, '节点圆的大小 = 度数'],
    [themeColors().accent2, '加粗 = 当前悬停（节点或度数）'],
  ]);

  function freePair() {
    for (let u = 0; u < nodes.length; u += 1) {
      for (let v = u + 1; v < nodes.length; v += 1) {
        if (!edges.some(([a, b]) => (a === u && b === v) || (a === v && b === u))) return [u, v];
      }
    }
    return null;
  }

  function refresh() {
    const g = graphNow();
    ro.set('当前图', preset.label);
    ro.set('节点 / 边', nodes.length + ' 个节点 · ' + edges.length + ' 条边');
    ro.set('度序列', '[' + g.seq.join(', ') + ']');
    ro.set('悬停', hoverNode >= 0
      ? nodes[hoverNode] + '：度 ' + g.deg[hoverNode] + '，C_D = ' + fmt(g.deg[hoverNode] / Math.max(1, nodes.length - 1), 2)
      : hoverDeg >= 0 ? ('度数为 ' + hoverDeg + ' 的节点有 ' + g.hist[hoverDeg] + ' 个') : '—');
    draw();
  }

  btnAdd.addEventListener('click', () => {
    const p = freePair();
    if (p) edges.push(p);
    refresh();
  });
  btnDel.addEventListener('click', () => {
    if (edges.length) edges.pop();
    refresh();
  });
  btnMove.addEventListener('click', () => {
    if (!edges.length || nodes.length < 3) return;
    /* 只挪终点：起点不动，终点换成一个「还不是邻居」的节点 —— 边数不变，
       度序列却会变，正是「把一条边从小蓝移到小紫」这个动作 */
    const [u, v] = edges.pop();
    const cand = [];
    for (let w = 0; w < nodes.length; w += 1) {
      if (w === u || w === v) continue;
      if (edges.some(([a, b]) => (a === u && b === w) || (a === w && b === u))) continue;
      cand.push(w);
    }
    if (cand.length) {
      edges.push([u, cand[edges.length % cand.length]]);
    } else {
      edges.push([u, v]);
    }
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const i = pickNode(Object.values(pos), px, py, 18);
      if (i >= 0) return { kind: 'node', i };
      if (histRect) {
        const k = Math.floor((px - histRect.x) / (histRect.w / histRect.n));
        if (px >= histRect.x && px <= histRect.x + histRect.w
          && py >= histRect.y && py <= histRect.y + histRect.h) {
          return { kind: 'deg', i: clamp(k, 0, histRect.n - 1) };
        }
      }
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') {
        dragNode = id.i;
        hoverNode = id.i;
        hoverDeg = -1;
      } else if (id && id.kind === 'deg') {
        hoverDeg = id.i;
        hoverNode = -1;
      }
      refresh();
    },
    move(id, px, py) {
      if (dragNode < 0) return;
      const rect = rects().graph;
      pos[dragNode].x = clamp(px, rect.x + 20, rect.x + rect.w - 20);
      pos[dragNode].y = clamp(py, rect.y + 24, rect.y + rect.h - 22);
      refresh();
    },
    up() { dragNode = -1; },
    hover(px, py) {
      const i = pickNode(Object.values(pos), px, py, 18);
      let nd = -1;
      let hn = i;
      if (i < 0 && histRect) {
        const k = Math.floor((px - histRect.x) / (histRect.w / histRect.n));
        if (px >= histRect.x && px <= histRect.x + histRect.w
          && py >= histRect.y && py <= histRect.y + histRect.h) {
          nd = clamp(k, 0, histRect.n - 1);
        }
      }
      if (hn < 0 && nd < 0) {
        const s = seqRect;
        if (s && px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) {
          const g = graphNow();
          const idx = Math.floor((px - s.x - 30) / Math.min(38, (s.w - 40) / nodes.length));
          if (idx >= 0 && idx < g.seq.length) nd = g.seq[idx];
        }
      }
      if (hn !== hoverNode || nd !== hoverDeg) {
        hoverNode = hn;
        hoverDeg = nd;
        refresh();
      }
    },
    leave() {
      if (hoverNode >= 0 || hoverDeg >= 0) {
        hoverNode = -1;
        hoverDeg = -1;
        refresh();
      }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

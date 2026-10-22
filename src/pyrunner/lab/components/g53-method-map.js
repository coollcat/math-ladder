/* =========================================================================
 * lab 组件：g53-method-map —— 选型不是选最强的算法，是选「对得上问题」的那个
 *                        （第 53 章「图网络方法地图」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-method-map",
 *     "title": "五个问题，五种方法：点一下看它为什么配",
 *     "goal": "long-term" }
 *
 * 字段：goal 可选，初始选中的问题
 *       "walk" | "cut" | "stationary" | "pagerank" | "local"
 *
 * 交互：
 *   · 右下角是五个问题（按钮组），点一个 → 左上版图上对应方法被点亮、
 *     其余压暗，并画出一条「问题 → 方法」的连线；
 *   · 版图上每个方法的位置由两个轴决定：横轴 = 可解释性（左黑箱右透明），
 *     纵轴 = 计算成本（下便宜上贵）——**位置本身就是一张选型地图**；
 *   · 「看误配」把另外四个问题也画成红线，红线的意思不是「算错了」，
 *     而是「这个方法答的不是这个问题」；
 *   · 右侧读数条给出这个方法的核心对象、强项、解释边界（正文对照表的三列）。
 *
 * 看什么：五个方法没有优劣，只有一个二维坐标和一句「它能回答什么」。
 *   换问题就是换坐标，不是换到「更好的方法」。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, fmt, clamp,
} from '../core.js';
import { legendInto } from './graph-kit.js';

/* 五个方法：transparent = 可解释性（0 黑箱 → 1 透明），cost = 计算/数据成本（0 便宜 → 1 贵） */
const METHODS = [
  { id: 'power', name: '邻接矩阵幂 A^k', short: 'A^k', transparent: 0.95, cost: 0.55,
    object: 'A^k', strength: '数固定长度游走', limit: '回头路会计入' },
  { id: 'laplacian', name: 'Laplacian 谱', short: 'D−A', transparent: 0.85, cost: 0.68,
    object: 'D−A 或归一化版', strength: '连通性、切割能量', limit: '加权和归一化改变结论' },
  { id: 'stationary', name: '平稳分布', short: 'Pπ=π', transparent: 0.80, cost: 0.30,
    object: 'Pπ=π', strength: '长期流量', limit: '需不可约且非周期' },
  { id: 'pagerank', name: 'PageRank', short: 'PageRank', transparent: 0.70, cost: 0.38,
    object: 'dM+(1−d)1/n', strength: '有阻尼的重要性', limit: '参数和爬取范围影响排名' },
  { id: 'gnn', name: '图神经网络', short: 'GNN', transparent: 0.20, cost: 0.95,
    object: '邻居聚合 + 参数', strength: '可学习表示', limit: '过平滑与分布偏移要监控' },
];

const GOALS = [
  { id: 'walk', label: '数三步内有几条路', method: 'power',
    why: '问的是「长度固定的路径有多少条」，正好就是 A^k 的 (i,j) 元素；换任何别的表示都答不出这个计数。' },
  { id: 'cut', label: '找社区边界 / 判断连通', method: 'laplacian',
    why: '问的是「哪里难切断」。Laplacian 的第二特征值与 Fiedler 向量直接给出切边最少的方向。' },
  { id: 'stationary', label: '长期流量停在哪', method: 'stationary',
    why: '问的是「走很久之后分布是什么」。平稳分布 Pπ=π 就是答案，前提是不可约且非周期。' },
  { id: 'pagerank', label: '网页重要性排序', method: 'pagerank',
    why: '问的是「谁更重要」，而且允许随机跳转。阻尼项把有向图上的死端和悬挂页都修好了。' },
  { id: 'local', label: '按局部环境预测', method: 'gnn',
    why: '问的是「每个节点的标签，用邻居的特征能不能推出来」。这件事没有闭式答案，只能学。' },
];

export default function render(host, spec) {
  const cv = setupCanvas(host, 400);
  const cfg = {
    goal: GOALS.some((g) => g.id === spec.goal) ? spec.goal : 'walk',
    showMis: false,
  };
  const hover = { id: null };
  let board = null;

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 680;
    return {
      narrow,
      board: {
        x: 26,
        y: 30,
        w: narrow ? W - 46 : Math.round(W * 0.52) - 30,
        h: narrow ? Math.round(H * 0.48) : H - 96,
      },
      card: {
        x: narrow ? 12 : Math.round(W * 0.54) + 2,
        y: narrow ? 30 + Math.round(H * 0.48) + 24 : 32,
        w: narrow ? W - 24 : W - (Math.round(W * 0.54) + 16),
        h: narrow ? Math.round(H * 0.34) : H - 70,
      },
    };
  }

  function posOf(m, rect) {
    return {
      x: rect.x + 12 + m.transparent * (rect.w - 24),
      y: rect.y + rect.h - 14 - m.cost * (rect.h - 28),
    };
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
    const goal = GOALS.find((g) => g.id === cfg.goal) || GOALS[0];
    drawBoard(ctx, r.board, goal, C);
    drawCard(ctx, r.card, goal, C);

    label(ctx, '横轴 = 可解释性（左黑箱右透明），纵轴 = 成本（下便宜上贵）；位置本身就是选型地图',
      10, H - 8, C.grid, { size: 10 });
  }

  function drawBoard(ctx, rect, goal, C) {
    board = rect;
    /* 坐标轴 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x + 12, rect.y + rect.h - 14);
    ctx.lineTo(rect.x + rect.w - 12, rect.y + rect.h - 14);
    ctx.moveTo(rect.x + 12, rect.y + 14);
    ctx.lineTo(rect.x + 12, rect.y + rect.h - 14);
    ctx.stroke();
    ctx.restore();
    label(ctx, '可解释性 →', rect.x + rect.w - 78, rect.y + rect.h - 1, C.axis, { size: 9 });
    label(ctx, '成本 ↑', rect.x + 14, rect.y + 10, C.axis, { size: 9 });

    /* 误配红线：先画，压在图底下 */
    if (cfg.showMis) {
      const target = METHODS.find((m) => m.id === goal.method);
      if (target) {
        const p0 = posOf(target, rect);
        GOALS.filter((g) => g.method !== goal.method).forEach((g) => {
          const m = METHODS.find((x) => x.id === g.method);
          if (!m) return;
          const p1 = posOf(m, rect);
          ctx.save();
          ctx.strokeStyle = C.bad;
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          ctx.restore();
        });
      }
    }

    METHODS.forEach((m) => {
      const p = posOf(m, rect);
      const isMine = m.id === goal.method;
      const hot = hover.id === m.id;
      const dim = !isMine && !hot;
      ctx.save();
      ctx.globalAlpha = dim ? 0.42 : 1;
      ctx.fillStyle = isMine ? C.ok : (hot ? C.accent2 : C.named('teal'));
      ctx.strokeStyle = isMine ? C.ok : (hot ? C.accent2 : C.axis);
      ctx.lineWidth = isMine || hot ? 2.6 : 1.4;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 26, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = dim ? 1 : 0.22;
      ctx.fill();
      ctx.globalAlpha = dim ? 0.42 : 1;
      ctx.stroke();
      ctx.restore();
      label(ctx, m.short, p.x, p.y + 4, dim ? C.axis : C.bg, { size: 9.5, align: 'center', weight: 700 });
      if (isMine) {
        label(ctx, '就是这个', p.x, p.y - 22, C.ok, { size: 9, align: 'center', weight: 700 });
      } else if (hot) {
        label(ctx, m.name, p.x, p.y - 22, C.accent2, { size: 9, align: 'center' });
      }
    });

    label(ctx, '当前问题：' + goal.label, rect.x + 14, rect.y + rect.h + 14, C.fg,
      { size: 10.5, weight: 700 });
    label(ctx, cfg.showMis ? '红色虚线 = 这些方法答不了这个问题' : '按「看误配」把不匹配的组合画出来',
      rect.x + 14, rect.y + rect.h + 29, cfg.showMis ? C.bad : C.grid, { size: 9.5 });
  }

  function drawCard(ctx, rect, goal, C) {
    const m = METHODS.find((x) => x.id === goal.method);
    if (!m) return;
    let y = rect.y + 4;
    label(ctx, m.name, rect.x, y, C.ok, { size: 12, weight: 700 });
    y += 22;
    const rows = [
      ['核心对象', m.object],
      ['强项', m.strength],
      ['解释边界', m.limit],
      ['可解释性', fmt(m.transparent, 2) + '（1 = 完全透明）'],
      ['成本', fmt(m.cost, 2) + '（1 = 最贵）'],
    ];
    rows.forEach(([k, v]) => {
      label(ctx, k, rect.x, y, C.axis, { size: 9.5 });
      label(ctx, v, rect.x + Math.min(76, rect.w * 0.30), y, C.fg, { size: 9.5, weight: 700 });
      y += 17;
    });
    y += 8;
    /* 为什么配：把正文的「选型流程」翻译成一句话 */
    const lines = wrap(goal.why, Math.max(14, Math.floor(rect.w / 11)));
    lines.forEach((ln) => {
      label(ctx, ln, rect.x, y, C.fg, { size: 9.5 });
      y += 14;
    });
    y += 6;
    label(ctx, '误配的四种组合：', rect.x, y, C.axis, { size: 9 });
    y += 14;
    GOALS.filter((g) => g.method !== goal.method).slice(0, 4).forEach((g) => {
      label(ctx, '· ' + g.label + ' → ' + (METHODS.find((x) => x.id === g.method) || {}).short,
        rect.x + 4, y, cfg.showMis ? C.bad : C.grid, { size: 9 });
      y += 13;
    });
  }

  function wrap(text, width) {
    const out = [];
    let cur = '';
    for (const ch of text) {
      cur += ch;
      if (cur.length >= width) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out;
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 问题: '—', 方法: '—', 核心对象: '—', 解释边界: '—' });
  host.appendChild(ro.box);

  const btns = GOALS.map((g) => {
    const b = mkBtn(g.label);
    b.addEventListener('click', () => { cfg.goal = g.id; refresh(); });
    return b;
  });
  host.appendChild(buildToolbar(...btns));

  const btnMis = mkBtn('看误配');
  host.appendChild(buildToolbar(btnMis));

  legendInto(host, [
    [themeColors().ok, '这个问题该用的方法'],
    [themeColors().bad, '误配连线（画的是「答不上」，不是「算错了」）'],
  ]);

  function refresh() {
    const goal = GOALS.find((g) => g.id === cfg.goal) || GOALS[0];
    const m = METHODS.find((x) => x.id === goal.method) || {};
    ro.set('问题', goal.label);
    ro.set('方法', m.name || '—');
    ro.set('核心对象', m.object || '—');
    ro.set('解释边界', m.limit || '—');
    btnMis.textContent = cfg.showMis ? '收起误配' : '看误配';
    btns.forEach((b, i) => {
      b.style.borderColor = GOALS[i].id === cfg.goal ? themeColors().ok : '';
    });
    draw();
  }

  btnMis.addEventListener('click', () => { cfg.showMis = !cfg.showMis; refresh(); });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      if (!board) return null;
      for (const m of METHODS) {
        const p = posOf(m, board);
        if (Math.hypot(px - p.x, py - p.y) <= 26) return { kind: 'method', id: m.id };
      }
      return null;
    },
    down(id) {
      if (id && id.kind === 'method') {
        /* 点方法 = 反过来问「它能答哪个问题」 */
        const g = GOALS.find((x) => x.method === id.id);
        if (g) cfg.goal = g.id;
      }
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      let next = null;
      if (board) {
        for (const m of METHODS) {
          const p = posOf(m, board);
          if (Math.hypot(px - p.x, py - p.y) <= 26) { next = m.id; break; }
        }
      }
      if (next !== hover.id) { hover.id = next; refresh(); }
    },
    leave() {
      if (hover.id) { hover.id = null; refresh(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

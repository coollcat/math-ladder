/* =========================================================================
 * lab 组件：g53-power-iteration —— 幂迭代的收敛过程（第 53 章「平稳分布」）
 * -------------------------------------------------------------------------
 * 用法：
 *   { "type": "g53-power-iteration",
 *     "title": "两状态链：为什么最终一定是 (0.6, 0.4)",
 *     "step": 0.8 }
 *
 * 字段：
 *   P        2×2 或更大，列随机矩阵（缺省用课程那个 [[0.8,0.3],[0.2,0.7]]）
 *   nodes    节点名（可选）
 *   pHat     可选初始分布（缺省全部在第一个节点）
 *   step     可选「一步转移的保守程度」预设说明用；不传则用 P 里的数
 *
 * 交互：
 *   · 「迭代一步」按 $p\leftarrow Pp$ 推一步，「快进 5 步」连推五次；
 *   · 左侧是概率三角（单纯形）上的轨迹：每一步一个点，箭头连起来，
 *     收敛到的不动点画成星标——**几何上的收敛**一眼看见；
 *   · 右侧给出每步的数值与「变化量」‖p_{t+1}−p_t‖₁，阈值 1e-10；
 *   · 「换初始分布」把起点改成另一个角，轨迹换了起点、终点不变；
 *   · 「换一个不可约性缺失的 P」用可约矩阵演示「收敛到哪儿取决于起点」。
 *
 * 口径：只对 2×2 做三角可视化；更大的 P 只画数值表并说明。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clamp, fmt, polyline,
} from '../core.js';
import { legendInto } from './graph-kit.js';

const DEFAULT_P = [[0.8, 0.3], [0.2, 0.7]];
/* 两个闭合类：从 A 出发永远停在 A，从 B 出发永远停在 B。
   不可约性缺失，极限依赖起点，「平稳分布」不再是唯一的。 */
const REDUCIBLE_P = [[1, 0], [0, 1]];

export default function render(host, spec) {
  const defaultNodes = ['A', 'B'];
  const nodes = Array.isArray(spec.nodes) && spec.nodes.length >= 2
    ? spec.nodes.slice(0, 6).map(String)
    : defaultNodes.slice();

  function readP(src, fallback) {
    if (!Array.isArray(src) || !src.length) return fallback.map((r) => r.slice());
    const k = Math.min(src.length, 6);
    const out = [];
    for (let i = 0; i < k; i += 1) {
      const row = Array.isArray(src[i]) ? src[i] : [];
      out.push(Array.from({ length: k }, (_, j) => {
        const x = Number(row[j]);
        return Number.isFinite(x) ? clamp(x, 0, 1) : 0;
      }));
    }
    return out;
  }

  let P = readP(spec.P, DEFAULT_P);
  const n = P.length;
  let p = Array.isArray(spec.pHat) && spec.pHat.length === n
    ? spec.pHat.map((x) => clamp(Number(x) || 0, 0, 1))
    : (() => { const a = new Array(n).fill(0); a[0] = 1; return a; })();
  let trail = [p.slice()];
  let iterations = 0;
  let lastChange = Infinity;

  const cv = setupCanvas(host, 320);
  let triRect = null;
  let hover = -1;

  /* ---------- 数学 ---------- */

  function stepOnce() {
    const nxt = new Array(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) nxt[i] += P[i][j] * p[j];
    }
    const change = nxt.reduce((s, v, i) => s + Math.abs(v - p[i]), 0);
    p = nxt;
    trail.push(p.slice());
    iterations += 1;
    lastChange = change;
    return change;
  }

  /* 不动点：解 Pπ = π 且 Σπ = 1。
     2×2 时直接代数解；更大时用幂迭代跑到阈值以下（有限步）。 */
  function fixedPoint() {
    if (n === 2) {
      /* (P00−1)x + P01(1−x) = 0 → x(P00−P01−1) = −P01 */
      const den = P[0][0] - P[0][1] - 1;
      if (Math.abs(den) < 1e-12) return null;
      const x = -P[0][1] / den;
      return [clamp(x, 0, 1), clamp(1 - x, 0, 1)];
    }
    let q = new Array(n).fill(0);
    q[0] = 1;
    for (let it = 0; it < 4000; it += 1) {
      const nxt = new Array(n).fill(0);
      for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) nxt[i] += P[i][j] * q[j];
      const ch = nxt.reduce((s, v, i) => s + Math.abs(v - q[i]), 0);
      q = nxt;
      if (ch < 1e-13) break;
    }
    return q;
  }

  /* ---------- 布局 ---------- */

  function rects() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    return {
      narrow,
      tri: { x: 16, y: 34, w: narrow ? W - 32 : Math.round(W * 0.50) - 24, h: narrow ? Math.round(H * 0.56) : H - 74 },
      text: {
        x: narrow ? 16 : Math.round(W * 0.52),
        y: narrow ? 34 + Math.round(H * 0.56) + 24 : 40,
        w: narrow ? W - 32 : W - Math.round(W * 0.52) - 20,
        h: narrow ? H * 0.3 : H - 80,
      },
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
    const fp = fixedPoint();
    drawTriangle(ctx, r.tri, fp, C);
    drawText(ctx, r.text, fp, C);

    label(ctx, '三角上的一个点 = 一个概率分布；每迭代一次走一步，最后停在不动点上',
      10, H - 8, C.grid, { size: 10 });
  }

  /* 概率单纯形（2 维时就是一条线段，这里画成「底边 = p₀，向上 = 迭代次数」的阶梯图，
     比塞进一个三角形更容易读每一步的变化）。 */
  function drawTriangle(ctx, rect, fp, C) {
    if (n !== 2) {
      triRect = null;
      label(ctx, 'P 不是 2×2，跳过单纯形图', rect.x, rect.y + 10, C.grid, { size: 10 });
      return;
    }
    const x0 = rect.x + 30;
    const x1 = rect.x + rect.w - 16;
    const y0 = rect.y + 16;
    const y1 = rect.y + rect.h - 26;
    triRect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };

    /* 坐标轴：横轴 = p₀（第一分量的概率），纵轴 = 迭代步 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, y1);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'p₀ →', x1, y1 + 15, C.axis, { size: 9, align: 'right' });
    label(ctx, '迭代', x0 - 6, y0 + 10, C.axis, { size: 9, align: 'right' });
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const x = x0 + t * (x1 - x0);
      label(ctx, fmt(t, 2), x, y1 + 15, C.grid, { size: 8.5, align: 'center' });
    });

    /* 不动点：一条竖直虚线，所有迭代都朝它走 */
    if (fp) {
      const fx = x0 + fp[0] * (x1 - x0);
      ctx.save();
      ctx.strokeStyle = C.named('green');
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(fx, y0);
      ctx.lineTo(fx, y1);
      ctx.stroke();
      ctx.restore();
      label(ctx, '不动点 π₀ = ' + fmt(fp[0], 3), fx + 4, y0 + 10, C.named('green'),
        { size: 9.5, weight: 700 });
    }

    /* 轨迹：每步一个点，纵向按迭代序排（越上面越新） */
    const stepH = Math.min(18, (y1 - y0) / Math.max(1, trail.length));
    const pts = trail.map((q, k) => ({
      x: x0 + q[0] * (x1 - x0),
      y: y1 - 10 - k * stepH,
    }));
    if (pts.length > 1) {
      polyline(ctx, pts, C.named('purple'), 1.8);
    }
    pts.forEach((pt, k) => {
      const hot = hover === k;
      ctx.save();
      ctx.fillStyle = k === pts.length - 1 ? C.accent2 : C.accent;
      ctx.globalAlpha = hot ? 1 : 0.85;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, hot ? 5.5 : 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    if (pts.length) {
      const last = pts[pts.length - 1];
      label(ctx, '第 ' + iterations + ' 步：p₀ = ' + fmt(p[0], 4), last.x + 8, last.y - 6,
        C.accent2, { size: 9.5, weight: 700 });
    }
  }

  function drawText(ctx, rect, fp, C) {
    let y = rect.y + 4;
    label(ctx, 'P = [' + P[0].map((x) => fmt(x, 3)).join(', ') + ' ; '
      + P[1].map((x) => fmt(x, 3)).join(', ') + ']', rect.x, y, C.fg, { size: 10 });
    y += 18;
    label(ctx, '当前分布 p = (' + p.map((x) => fmt(x, 5)).join(', ') + ')', rect.x, y, C.accent, { size: 10.5, weight: 700 });
    y += 18;
    label(ctx, '每步变化量 ‖p₊ − p‖₁ = ' + (lastChange === Infinity ? '—' : fmt(lastChange, 8)),
      rect.x, y, lastChange < 1e-10 ? C.ok : C.grid, { size: 9.5 });
    y += 18;
    if (fp) {
      label(ctx, '不动点 π = (' + fp.map((x) => fmt(x, 4)).join(', ') + ')', rect.x, y,
        C.named('green'), { size: 10.5, weight: 700 });
      y += 18;
      const dist = Math.abs(p[0] - fp[0]) + Math.abs(p[1] - fp[1]);
      label(ctx, '到不动点的距离 = ' + fmt(dist, 6), rect.x, y, dist < 1e-3 ? C.ok : C.grid, { size: 9.5 });
      y += 20;
    }
    label(ctx, '列随机：P 的每一列和都是 1，所以概率总量永远是 1', rect.x, y, C.grid, { size: 9 });
    y += 14;
    if (n === 2) {
      label(ctx, '这个 P 的对角线是「留在原状态」的概率', rect.x, y, C.grid, { size: 9 });
      y += 14;
      label(ctx, '点「换成可约的 P」看极限依赖起点的反例', rect.x, y, C.grid, { size: 9 });
    }
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 迭代: '—', '变化量': '—', 当前: '—', 不动点: '—' });
  host.appendChild(ro.box);

  const btn1 = mkBtn('迭代一步');
  const btn5 = mkBtn('快进 5 步');
  const btnReset = mkBtn('重置轨迹');
  host.appendChild(buildToolbar(btn1, btn5, btnReset));

  const btnOther = mkBtn('换初始分布');
  const btnReducible = mkBtn('换成可约的 P');
  host.appendChild(buildToolbar(btnOther, btnReducible));

  legendInto(host, [
    [themeColors().accent, '每次迭代后的分布'],
    [themeColors().named('green'), '不动点 π（Pπ = π）'],
  ]);

  function refresh() {
    const fp = fixedPoint();
    ro.set('迭代', String(iterations));
    ro.set('变化量', lastChange === Infinity ? '—' : fmt(lastChange, 8));
    ro.set('当前', '(' + p.map((x) => fmt(x, 4)).join(', ') + ')');
    ro.set('不动点', fp ? '(' + fp.map((x) => fmt(x, 4)).join(', ') + ')' : '不存在（不唯一）');
    draw();
  }

  btn1.addEventListener('click', () => { stepOnce(); refresh(); });
  btn5.addEventListener('click', () => { for (let i = 0; i < 5; i += 1) stepOnce(); refresh(); });
  btnReset.addEventListener('click', () => {
    p = new Array(n).fill(0);
    p[0] = 1;
    trail = [p.slice()];
    iterations = 0;
    lastChange = Infinity;
    refresh();
  });
  btnOther.addEventListener('click', () => {
    /* 换到「全部质量在另一个角」的起点：终点应该不变 */
    const corner = (p[0] > 0.5 ? 1 : 0);
    p = new Array(n).fill(0);
    p[Math.min(corner, n - 1)] = 1;
    trail = [p.slice()];
    iterations = 0;
    lastChange = Infinity;
    refresh();
  });
  btnReducible.addEventListener('click', () => {
    /* 换成「两个闭合类」的 P：迭代再多次也停在原地，极限由起点决定 */
    P = REDUCIBLE_P.map((r) => r.slice());
    p = new Array(2).fill(0);
    p[0] = 1;
    trail = [p.slice()];
    iterations = 0;
    lastChange = Infinity;
    refresh();
  });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      const tr = triRect;
      if (tr && px >= tr.x - 10 && px <= tr.x + tr.w + 10 && py >= tr.y - 10 && py <= tr.y + tr.h + 10) {
        const stepH = Math.min(18, tr.h / Math.max(1, trail.length));
        const k = Math.round((tr.y + tr.h - 10 - py) / stepH);
        return { kind: 'trail', i: clamp(k, 0, trail.length - 1) };
      }
      return null;
    },
    down(id) {
      if (id && id.kind === 'trail') hover = id.i;
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      const tr = triRect;
      let k = -1;
      if (tr && px >= tr.x - 10 && px <= tr.x + tr.w + 10 && py >= tr.y - 10 && py <= tr.y + tr.h + 10) {
        const stepH = Math.min(18, tr.h / Math.max(1, trail.length));
        k = clamp(Math.round((tr.y + tr.h - 10 - py) / stepH), 0, trail.length - 1);
      }
      if (k !== hover) { hover = k; refresh(); }
    },
    leave() {
      if (hover >= 0) { hover = -1; refresh(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}

/* =========================================================================
 * aut-graph-base —— 第 31 章自动机类 lab 组件的共用画法
 * -------------------------------------------------------------------------
 * 状态圈（含双圈接受态）、双向拱边、自环、输入带、小圆角标签。
 * 为什么单独一份：本章 6 个组件都要画同一套图元，各抄一份必然漂移
 * （箭头缩进多少、双圈半径差几像素、带子高度多少）。
 *
 * 不是 lab 组件：不导出 render，也不进 registry，只被 components 内部 import。
 * 所有函数都对缺字段容错：坐标非数字时画在原点附近，不抛异常。
 * ========================================================================= */

const num = (v, d) => (Number.isFinite(v) ? v : d);

/* 箭头三角：从 (x,y) 指向 ang 方向的反向尾巴 */
export function arrowHead(ctx, x, y, ang, size) {
  const h = num(size, 8);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - h * Math.cos(ang - 0.42), y - h * Math.sin(ang - 0.42));
  ctx.lineTo(x - h * Math.cos(ang + 0.42), y - h * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fill();
}

/* 两个状态之间的一段弧线（二次贝塞尔）。bend 是垂直方向的外拱量：
   0 = 直线；正负决定往哪一侧拱（双向边各取一侧才不重叠）。
   r0 / r1 是两端节点的半径，用来把线头缩进到圆周上。
   返回弧线中点（含 bend 的偏移量），供标签落位。 */
export function drawCurvedArrow(ctx, a, b, o) {
  const opt = o || {};
  const x0 = num(a.x, 0); const y0 = num(a.y, 0);
  const x1 = num(b.x, 0); const y1 = num(b.y, 0);
  const r0 = num(opt.r0, 18); const r1 = num(opt.r1, 18);
  const bend = num(opt.bend, 0);
  const dx = x1 - x0; const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; const ny = dx / len;
  const cx = (x0 + x1) / 2 + nx * bend;
  const cy = (y0 + y1) / 2 + ny * bend;
  const t0x = cx - x0; const t0y = cy - y0;
  const l0 = Math.hypot(t0x, t0y) || 1;
  const sx = x0 + (t0x / l0) * (r0 + 2);
  const sy = y0 + (t0y / l0) * (r0 + 2);
  const t1x = x1 - cx; const t1y = y1 - cy;
  const l1 = Math.hypot(t1x, t1y) || 1;
  const ex = x1 - (t1x / l1) * (r1 + 3);
  const ey = y1 - (t1y / l1) * (r1 + 3);
  ctx.save();
  ctx.strokeStyle = opt.color || '#888';
  ctx.fillStyle = opt.color || '#888';
  ctx.lineWidth = num(opt.w, 1.4);
  ctx.lineCap = 'round';
  if (opt.dash) ctx.setLineDash(opt.dash);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  if (bend === 0) ctx.lineTo(ex, ey);
  else ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
  const ang = bend === 0 ? Math.atan2(ey - sy, ex - sx) : Math.atan2(ey - cy, ex - cx);
  arrowHead(ctx, ex, ey, ang, opt.head || 8);
  ctx.restore();
  return bend === 0
    ? { x: (sx + ex) / 2, y: (sy + ey) / 2 }
    : { x: 0.25 * sx + 0.5 * cx + 0.25 * ex, y: 0.25 * sy + 0.5 * cy + 0.25 * ey };
}

/* 自环：画在节点正上方（up=true）或正下方，返回环顶用来贴标签。 */
export function drawSelfLoop(ctx, p, r, o) {
  const opt = o || {};
  const x = num(p.x, 0) + num(opt.dx, 0); const y = num(p.y, 0);
  const rr = num(r, 18);
  const dir = opt.down ? 1 : -1;
  const p1x = x - rr * 0.62; const p1y = y + dir * rr * 0.62;
  const p2x = x + rr * 0.62; const p2y = y + dir * rr * 0.62;
  const c1x = x - rr * 1.55; const c1y = y + dir * rr * 2.05;
  const c2x = x + rr * 1.55; const c2y = y + dir * rr * 2.05;
  ctx.save();
  ctx.strokeStyle = opt.color || '#888';
  ctx.fillStyle = opt.color || '#888';
  ctx.lineWidth = num(opt.w, 1.4);
  ctx.lineCap = 'round';
  if (opt.dash) ctx.setLineDash(opt.dash);
  ctx.beginPath();
  ctx.moveTo(p1x, p1y);
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2x, p2y);
  ctx.stroke();
  const ang = Math.atan2(p2y - c2y, p2x - c2x);
  arrowHead(ctx, p2x, p2y, ang, opt.head || 8);
  ctx.restore();
  return { x, y: y + dir * rr * 1.5 };
}

/* 给一组边算拱度：互为反向的 A→B 与 B→A 各往一边拱 r*1.35，
   A→B 出现多次（多符号）时按序号递增拱度，避免几条线叠成一条。 */
export function bendsFor(edges, r) {
  const seen = new Map();
  const out = [];
  const selfCount = new Map();
  edges.forEach((e) => {
    if (e.from === e.to) {
      const k = selfCount.get(e.from) || 0;
      selfCount.set(e.from, k + 1);
      out.push({ edge: e, bend: 0, self: true, selfIdx: k });
      return;
    }
    const key = e.from + '\u0000' + e.to;
    const rev = e.to + '\u0000' + e.from;
    const idx = seen.get(key) || 0;
    seen.set(key, idx + 1);
    const hasRev = edges.some((o) => o.from === e.to && o.to === e.from && o.from !== o.to);
    let bend = 0;
    if (hasRev) bend = (e.from < e.to ? 1 : -1) * num(r, 18) * 1.35;
    if (idx > 0) bend += (idx % 2 === 0 ? 1 : -1) * num(r, 18) * (0.9 + idx * 0.5);
    void rev;
    out.push({ edge: e, bend, self: false });
  });
  /* 自环补上「同一状态一共几条」和它的序号，调用方据此算 dx 错位 */
  out.forEach((o) => {
    if (!o.self) return;
    o.selfTotal = selfCount.get(o.edge.from) || 1;
  });
  return out;
}

/* 状态圈：active=当前/处于活动集合；accepting=双圈；dead=卡死描红；
   start=起点（左上方标「起点」）。label 画在圆心，sub 画在圆下方。 */
export function drawNode(ctx, C, n) {
  const x = num(n.x, 0); const y = num(n.y, 0);
  const r = num(n.r, 18);
  const active = !!n.active;
  const accepting = !!n.accepting;
  const dead = !!n.dead;
  ctx.save();
  if (active) {
    ctx.fillStyle = n.fillColor || C.accent;
    ctx.globalAlpha = n.fillAlpha === undefined ? 0.22 : n.fillAlpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = dead ? C.bad : (active ? (n.strokeColor || C.accent) : (n.dim ? C.grid : C.axis));
  ctx.lineWidth = dead ? 2.4 : (active ? 2.6 : 1.4);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  if (accepting) {
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(r - 4, 5), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  const fs = num(n.fontSize, 10.5);
  if (n.label) {
    const lc = n.strokeColor || (active ? C.accent : (n.dim ? C.grid : C.fg));
    ctx.save();
    ctx.fillStyle = lc;
    ctx.font = '700 ' + (fs + 0.5) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n.label), x, y + 1);
    ctx.restore();
  }
  if (n.sub) {
    ctx.save();
    ctx.fillStyle = C.axis;
    ctx.font = '400 ' + (fs - 0.5) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(n.sub), x, y + r + 13);
    ctx.restore();
  }
  if (n.start) {
    ctx.save();
    ctx.strokeStyle = C.ok;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - r - 22, y);
    ctx.lineTo(x - r - 4, y);
    ctx.stroke();
    arrowHead(ctx, x - r - 3, y, 0, 7);
    ctx.restore();
  }
  if (n.badge) {
    ctx.save();
    ctx.fillStyle = n.badgeColor || C.accent2;
    ctx.font = '700 ' + (fs - 0.5) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(n.badge), x, y - r - 6);
    ctx.restore();
  }
  return { x, y, r };
}

/* 小圆标签（边上的符号、代价等）：底色盖住线，读起来不打架。 */
export function drawEdgeLabel(ctx, C, x, y, text, o) {
  const opt = o || {};
  const rad = text && String(text).length > 2 ? 13 : 8.5;
  ctx.save();
  ctx.fillStyle = C.bg;
  ctx.strokeStyle = opt.color || C.grid;
  ctx.lineWidth = opt.active ? 1.8 : 1;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = opt.color || C.fg;
  ctx.font = (opt.active ? '700 ' : '600 ') + (opt.size || 10.5) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), x, y + 1);
  ctx.restore();
}

/* 输入带：symbols 是字符数组，pos 是读取头位置（已吃掉的格子数）。
   deadFrom 给定时，从该下标起的格子描红（表示「读到这里就死了」）。
   o.epsilonText 用于空串。返回每格的 {x, w, y, h} 方便组件做命中测试。 */
export function drawTape(ctx, C, o) {
  const syms = Array.isArray(o.symbols) ? o.symbols : [];
  const pos = Math.max(0, Math.round(num(o.pos, 0)));
  const cw = num(o.cell, 24);
  const hh = num(o.h, Math.min(26, cw + 4));
  const y0 = num(o.y, 0);
  const total = Math.max(1, syms.length) * cw;
  const x0 = num(o.x, 0);
  const cells = [];
  if (o.label) {
    ctx.save();
    ctx.fillStyle = C.axis;
    ctx.font = '400 10px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(o.label, x0, y0 - 8);
    ctx.restore();
  }
  if (!syms.length) {
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, cw * 1.6, hh);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = C.axis;
    ctx.font = '400 10px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.epsilonText || '空串 ε', x0 + cw * 0.8, y0 + hh / 2);
    ctx.restore();
    return { cells, x0, y0, cw, h: hh, total };
  }
  for (let i = 0; i < syms.length; i += 1) {
    const x = x0 + i * cw;
    const used = i < pos;
    const at = i === pos;
    const dead = Number.isFinite(o.deadFrom) && i >= o.deadFrom;
    ctx.save();
    ctx.fillStyle = at ? C.accent2 : (used ? C.soft : C.bg);
    ctx.globalAlpha = at ? 0.22 : 1;
    ctx.fillRect(x, y0, cw, hh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = at ? C.accent2 : (dead ? C.bad : C.grid);
    ctx.lineWidth = at ? 2 : 1;
    ctx.strokeRect(x + 0.5, y0 + 0.5, cw - 1, hh - 1);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = at ? C.accent2 : (used ? C.fg : C.grid);
    ctx.font = (at ? '700 ' : '400 ') + Math.min(13, cw * 0.62) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(syms[i], x + cw / 2, y0 + hh / 2);
    ctx.restore();
    cells.push({ x, w: cw, y: y0, h: hh });
  }
  const hx = x0 + Math.min(pos, syms.length) * cw;
  ctx.save();
  ctx.fillStyle = C.accent2;
  ctx.beginPath();
  ctx.moveTo(hx, y0 - 7);
  ctx.lineTo(hx - 5, y0 - 16);
  ctx.lineTo(hx + 5, y0 - 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  void total;
  return { cells, x0, y0, cw, h: hh, total };
}

/* 归一化坐标 → 画布坐标：组件只写 pos:[0..1, 0..1]，这里统一留边距。 */
export function placeIn(geo, p) {
  const nx = Array.isArray(p) ? num(p[0], 0.5) : 0.5;
  const ny = Array.isArray(p) ? num(p[1], 0.5) : 0.5;
  return {
    x: geo.x + 34 + nx * Math.max(geo.w - 68, 40),
    y: geo.y + 30 + ny * Math.max(geo.h - 60, 40),
  };
}

export default {
  arrowHead, drawCurvedArrow, drawSelfLoop, bendsFor, drawNode, drawEdgeLabel, drawTape, placeIn,
};

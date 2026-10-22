/* =========================================================================
 * 第 50 章（强化学习）lab 组件的共享小工具 —— 不是组件，不注册。
 * -------------------------------------------------------------------------
 * 与 core.js 的分工：core 管画布 / 滑块 / 按钮 / 主题；这里只放 RL 组件反复
 * 要用的排版零件（坐标框、圆角标签、热力取色、刻度、账本分栏）。
 * 所有颜色都从 themeColors() 取，暗色主题下自动换一套。
 * ========================================================================= */

import { cssToRGB, clamp } from '../core.js';

/* 圆角矩形路径（只建路径，不改填充/描边状态） */
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r === undefined ? 6 : r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* 直接填一个圆角块 */
export function fillRound(ctx, x, y, w, h, r, style) {
  ctx.save();
  ctx.fillStyle = style;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

/* 描边圆角块 */
export function strokeRound(ctx, x, y, w, h, r, style, lw) {
  ctx.save();
  ctx.strokeStyle = style;
  ctx.lineWidth = lw || 1;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

/* 任意 CSS 颜色加透明度（color 可能是 hex / rgb() / var() 兜底值） */
export function colorRGBA(css, alpha, fallback) {
  const p = cssToRGB(css, fallback || [107, 114, 128]);
  return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + clamp(alpha, 0, 1) + ')';
}

/* 主题强调色加透明度：热力图统一走它，避免各组件各写一份 */
export function accentRGBA(C, alpha) {
  return colorRGBA(C.accent, alpha, [59, 116, 214]);
}

/* [0,1] -> 底色强度（至少留一点可见的差异） */
export function heatColor(C, t, peak) {
  return accentRGBA(C, 0.05 + clamp(t, 0, 1) * (peak === undefined ? 0.62 : peak));
}

/* 圆角文字标签：cx/cy 是中心。返回占用的宽高，方便调用方接着排下一个 */
export function chip(ctx, text, cx, cy, C, opts) {
  const o = opts || {};
  const size = o.size || 11;
  ctx.save();
  ctx.font = (o.weight || 600) + ' ' + size + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
  const tw = ctx.measureText ? ctx.measureText(text).width : text.length * size * 0.62;
  const padX = o.padX === undefined ? 6 : o.padX;
  const w = tw + padX * 2;
  const h = o.height || size + 10;
  const x = o.align === 'left' ? cx : cx - w / 2;
  const y = cy - h / 2;
  fillRound(ctx, x, y, w, h, o.radius === undefined ? 5 : o.radius,
    o.fill || colorRGBA(C.fg, C.dark ? 0.10 : 0.06, [28, 30, 33]));
  if (o.stroke) strokeRound(ctx, x, y, w, h, o.radius === undefined ? 5 : o.radius, o.stroke, 1);
  ctx.fillStyle = o.color || C.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
  return { w, h, x, y };
}

/* 好看刻度：1/2/5 × 10^k */
export function niceTicks(lo, hi, count) {
  const n = count || 5;
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const out = [];
  const start = Math.ceil(lo / step - 1e-9) * step;
  for (let v = start; v <= hi + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return out;
}

/* 主绘图区坐标框：画左/下轴线 + 横向网格，返回两个映射函数。
   box = {x, y, w, h}；xr / yr 是 [lo, hi]。 */
export function plotFrame(ctx, C, box, xr, yr, opts) {
  const o = opts || {};
  const X = (v) => box.x + ((v - xr[0]) / (xr[1] - xr[0] || 1)) * box.w;
  const Y = (v) => box.y + box.h - ((v - yr[0]) / (yr[1] - yr[0] || 1)) * box.h;
  ctx.save();
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  niceTicks(yr[0], yr[1], o.yTicks || 4).forEach((v) => {
    ctx.beginPath();
    ctx.moveTo(box.x, Math.round(Y(v)) + 0.5);
    ctx.lineTo(box.x + box.w, Math.round(Y(v)) + 0.5);
    ctx.stroke();
  });
  niceTicks(xr[0], xr[1], o.xTicks || 5).forEach((v) => {
    ctx.beginPath();
    ctx.moveTo(Math.round(X(v)) + 0.5, box.y);
    ctx.lineTo(Math.round(X(v)) + 0.5, box.y + box.h);
    ctx.stroke();
  });
  ctx.strokeStyle = C.axis;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(box.x, box.y);
  ctx.lineTo(box.x, box.y + box.h);
  ctx.lineTo(box.x + box.w, box.y + box.h);
  ctx.stroke();
  ctx.restore();
  return { X, Y };
}

/* 带正负号的数字（账本里区分「+1」与「-1」比 fmt 直白） */
export function signed(v, d) {
  const s = Math.abs(v).toFixed(d === undefined ? 2 : d);
  return (v >= 0 ? '+' : '-') + s;
}

/* 小标题：画布右栏账本的开头 */
export function caption(ctx, text, x, y, C) {
  ctx.save();
  ctx.fillStyle = C.axis;
  ctx.font = '600 10.5px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* 一条虚线（水平或垂直） */
export function dashedLine(ctx, x0, y0, x1, y1, color, lw, dash) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw || 1;
  ctx.setLineDash(dash || [4, 4]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

/* 小圆点 */
export function dot(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

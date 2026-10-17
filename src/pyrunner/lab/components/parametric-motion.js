/* =========================================================================
 * lab 组件：parametric-motion —— 参数方程的「同屏录像」（第 6 章 · 参数方程）
 * -------------------------------------------------------------------------
 * 用法（第 50 课课文 lab 围栏）：
 *
 *   { "type": "parametric-motion", "title": "同屏录像：轨迹 + x(t) + y(t)" }
 *
 * 字段：mode  "linear"（原钟：t = 1.6·s，默认）| "cubic"（换钟：t = 1.6·s³）
 *       s     初始进度读数 0..1，默认 0.35
 *
 * 三块同屏：轨迹 x–y（频闪脚印 + 速度箭头）、x(t) 图、y(t) 图。
 * 拖小球或进度滑杆改 s；播放按钮匀速推进 s；换钟只改快慢——
 * 频闪脚印的疏密变了，轨迹与两条曲线原封不动。
 * ========================================================================= */

import {
  themeColors, setupCanvas, el, buildSliders, setSliderRow, buildSegmented, buildReadout,
  bindPointer, anim, polyline, label, arrow, clamp, fmt,
} from '../core.js';

const T_END = 1.6;     /* 落地时刻（秒）：8t − 5t² = 0 的非零解 */
const VX = 5;          /* 水平速度（米/秒），全程不变 */
const VY = 8;          /* 竖直初速（米/秒） */
const G = 10;          /* 重力加速度 */
const STROBES = 8;     /* 频闪次数：等间隔拍 9 帧（含起终点） */
const SPEED = 0.22;    /* 播放时进度读数每秒推进的量（约 4.5 秒走完全程） */

const xOf = (t) => VX * t;
const yOf = (t) => VY * t - (G / 2) * t * t;
const vyOf = (t) => VY - G * t;

/* 面板内坐标映射：uniform = true 时等比缩放（轨迹不能拉变形） */
function makeMap(p, x0, x1, y0, y1, padL, padR, padT, padB, uniform) {
  const iw = Math.max(p.w - padL - padR, 10);
  const ih = Math.max(p.h - padT - padB, 10);
  let sx = iw / (x1 - x0);
  let sy = ih / (y1 - y0);
  if (uniform) {
    const k = Math.min(sx, sy);
    sx = k;
    sy = k;
  }
  const ox = p.x + padL + (iw - (x1 - x0) * sx) / 2;
  const oy = p.y + padT + (ih - (y1 - y0) * sy) / 2;
  return {
    X: (v) => ox + (v - x0) * sx,
    Y: (v) => oy + (y1 - v) * sy,
  };
}

function frame(ctx, p, C, titleText) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.soft;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.restore();
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  if (titleText) label(ctx, titleText, p.x + 8, p.y + 14, C.axis, { size: 11, weight: 600 });
}

/* 三块面板的布局：宽屏左轨迹 + 右两图；窄屏三块竖排 */
function panels(W, H) {
  const pad = 10;
  const top = 24;
  const gap = 8;
  const availW = W - pad * 2;
  const availH = H - top - pad;
  if (W >= 620) {
    const leftW = Math.min(availW * 0.5, 330);
    const rightW = availW - leftW - gap;
    const halfH = (availH - gap) / 2;
    return {
      traj: { x: pad, y: top, w: leftW, h: availH },
      xp: { x: pad + leftW + gap, y: top, w: rightW, h: halfH },
      yp: { x: pad + leftW + gap, y: top + halfH + gap, w: rightW, h: availH - halfH - gap },
    };
  }
  const trajH = availH * 0.42;
  const restH = (availH - trajH - gap * 2) / 2;
  return {
    traj: { x: pad, y: top, w: availW, h: trajH },
    xp: { x: pad, y: top + trajH + gap, w: availW, h: restH },
    yp: { x: pad, y: top + trajH + gap * 2 + restH, w: availW, h: restH },
  };
}

export default function render(host, spec) {
  const sp = spec || {};
  let mode = sp.mode === 'cubic' ? 'cubic' : 'linear';
  let s = clamp(typeof sp.s === 'number' ? sp.s : 0.35, 0, 1);

  const holder = el('div', 'ml-alg-stage__canvas');
  host.appendChild(holder);
  const cv = setupCanvas(holder, 360, {});
  const canvas = cv.canvas;
  canvas.style.touchAction = 'none';

  let animCtl = null;
  const sliders = buildSliders({
    sliders: [{ name: 's', label: '进度读数 s', min: 0, max: 1, step: 0.005, value: s }],
  }, (state) => {
    if (animCtl) animCtl.stop();
    s = clamp(state.s, 0, 1);
    draw();
  });

  const ro = buildReadout({
    '进度读数 s': '—',
    '真实时刻 t': '—',
    '位置 (x, y)': '—',
    '速度 (vx, vy)': '—',
    '频闪节奏': '—',
  });

  /* 换钟：同一部片子换一块秒表。t(s) 只改快慢，不改形状 */
  const tOf = (sv) => (mode === 'cubic' ? T_END * sv * sv * sv : T_END * sv);

  const G = { traj: null };

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const H = cv.H;
    const ctx = cv.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const P = panels(W, H);
    const t = tOf(s);
    const bx = xOf(t);
    const by = yOf(t);
    const vx = VX;
    const vy = vyOf(t);

    /* ---- 面板 1：轨迹 x–y ---- */
    frame(ctx, P.traj, C, '轨迹 x–y（同一部片子）');
    const mt = makeMap(P.traj, -0.5, 8.5, -0.6, 3.8, 26, 10, 22, 18, true);
    G.traj = mt;
    polyline(ctx, [[mt.X(-0.5), mt.Y(0)], [mt.X(8.5), mt.Y(0)]], C.axis, 1.4);
    polyline(ctx, [[mt.X(0), mt.Y(-0.6)], [mt.X(0), mt.Y(3.8)]], C.axis, 1.4);
    for (let v = 2; v <= 8; v += 2) {
      label(ctx, String(v), mt.X(v), mt.Y(0) + 13, C.axis, { size: 10, align: 'center' });
    }
    for (let v = 1; v <= 3; v += 1) {
      label(ctx, String(v), mt.X(0) - 6, mt.Y(v) + 3, C.axis, { size: 10, align: 'right' });
    }
    const path = [];
    for (let i = 0; i <= 140; i += 1) {
      const tt = (T_END * i) / 140;
      path.push([mt.X(xOf(tt)), mt.Y(yOf(tt))]);
    }
    polyline(ctx, path, C.accent, 2.2);

    /* 频闪脚印：等间隔曝光一次，疏密就是快慢 */
    for (let k = 0; k <= STROBES; k += 1) {
      const tt = tOf(k / STROBES);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(mt.X(xOf(tt)), mt.Y(yOf(tt)), k === 0 || k === STROBES ? 4 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = C.accent2;
      ctx.fill();
      ctx.restore();
    }

    /* 当前帧：红球 + 速度箭头（横向长度固定、纵向随高度缩水） */
    arrow(
      ctx,
      mt.X(bx), mt.Y(by),
      mt.X(bx + vx * 0.24), mt.Y(by + vy * 0.24),
      C.named('red'), 2, 8,
    );
    ctx.beginPath();
    ctx.arc(mt.X(bx), mt.Y(by), 5.6, 0, Math.PI * 2);
    ctx.fillStyle = C.named('red');
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    label(ctx, '小球可拖 · 圆点 = 等间隔曝光', P.traj.x + 8, P.traj.y + P.traj.h - 7, C.axis, { size: 10.5 });

    /* ---- 面板 2：x(t) ---- */
    frame(ctx, P.xp, C, '横坐标 x(t) = 5t（匀速直线）');
    const mx = makeMap(P.xp, 0, T_END, 0, 8.6, 30, 12, 24, 20, false);
    polyline(ctx, [[mx.X(0), mx.Y(0)], [mx.X(T_END), mx.Y(0)]], C.axis, 1.4);
    polyline(ctx, [[mx.X(0), mx.Y(0)], [mx.X(0), mx.Y(8.6)]], C.axis, 1.4);
    for (let k = 0; k <= 4; k += 1) {
      const tv = (T_END * k) / 4;
      label(ctx, fmt(tv, 1), mx.X(tv), mx.Y(0) + 13, C.axis, { size: 10, align: k === 4 ? 'right' : 'center' });
    }
    label(ctx, 't / 秒', mx.X(T_END), mx.Y(0) - 6, C.axis, { size: 10, align: 'right' });
    const cxLine = [];
    for (let i = 0; i <= 40; i += 1) {
      const tt = (T_END * i) / 40;
      cxLine.push([mx.X(tt), mx.Y(xOf(tt))]);
    }
    polyline(ctx, cxLine, C.accent, 2.2);
    for (let k = 0; k <= STROBES; k += 1) {
      const tt = tOf(k / STROBES);
      ctx.beginPath();
      ctx.arc(mx.X(tt), mx.Y(xOf(tt)), 3.2, 0, Math.PI * 2);
      ctx.fillStyle = C.accent2;
      ctx.fill();
    }
    polyline(ctx, [[mx.X(t), mx.Y(0)], [mx.X(t), mx.Y(xOf(t))]], C.grid, 1, [4, 4]);
    ctx.beginPath();
    ctx.arc(mx.X(t), mx.Y(xOf(t)), 5, 0, Math.PI * 2);
    ctx.fillStyle = C.named('red');
    ctx.fill();

    /* ---- 面板 3：y(t) ---- */
    frame(ctx, P.yp, C, '纵坐标 y(t) = 8t − 5t²（先升后降）');
    const my = makeMap(P.yp, 0, T_END, -0.4, 3.6, 30, 12, 24, 20, false);
    polyline(ctx, [[my.X(0), my.Y(0)], [my.X(T_END), my.Y(0)]], C.axis, 1.4);
    polyline(ctx, [[my.X(0), my.Y(-0.4)], [my.X(0), my.Y(3.6)]], C.axis, 1.4);
    for (let k = 0; k <= 4; k += 1) {
      const tv = (T_END * k) / 4;
      label(ctx, fmt(tv, 1), my.X(tv), my.Y(-0.4) + 13, C.axis, { size: 10, align: k === 4 ? 'right' : 'center' });
    }
    for (let v = 1; v <= 3; v += 1) {
      label(ctx, String(v), my.X(0) - 6, my.Y(v) + 3, C.axis, { size: 10, align: 'right' });
    }
    const cyLine = [];
    for (let i = 0; i <= 80; i += 1) {
      const tt = (T_END * i) / 80;
      cyLine.push([my.X(tt), my.Y(yOf(tt))]);
    }
    polyline(ctx, cyLine, C.accent, 2.2);
    ctx.beginPath();
    ctx.arc(my.X(0.8), my.Y(3.2), 4, 0, Math.PI * 2);
    ctx.fillStyle = C.ok;
    ctx.fill();
    label(ctx, '顶点 0.8 s', my.X(0.8) + 7, my.Y(3.2) - 4, C.ok, { size: 10.5, weight: 600 });
    for (let k = 0; k <= STROBES; k += 1) {
      const tt = tOf(k / STROBES);
      ctx.beginPath();
      ctx.arc(my.X(tt), my.Y(yOf(tt)), 3.2, 0, Math.PI * 2);
      ctx.fillStyle = C.accent2;
      ctx.fill();
    }
    polyline(ctx, [[my.X(t), my.Y(-0.4)], [my.X(t), my.Y(yOf(t))]], C.grid, 1, [4, 4]);
    ctx.beginPath();
    ctx.arc(my.X(t), my.Y(yOf(t)), 5, 0, Math.PI * 2);
    ctx.fillStyle = C.named('red');
    ctx.fill();

    /* ---- 读数 ---- */
    ro.set('进度读数 s', fmt(s, 2));
    ro.set('真实时刻 t', fmt(t, 2) + ' 秒');
    ro.set('位置 (x, y)', '(' + fmt(bx, 2) + ', ' + fmt(by, 2) + ')');
    ro.set('速度 (vx, vy)', '(' + fmt(vx, 1) + ', ' + fmt(vy, 2) + ')');
    ro.set('频闪节奏', mode === 'cubic' ? '前密后疏（换钟）' : '均匀（原钟）');
  }

  animCtl = anim(host, {
    onTick(dt) {
      s = Math.min(1, s + dt * SPEED);
      if (s >= 1) animCtl.stop();
      setSliderRow(sliders, 0, s, 3, 's');
      draw();
    },
    onReset() {
      s = 0;
      setSliderRow(sliders, 0, s, 3, 's');
      draw();
    },
  });

  const seg = buildSegmented([
    { label: '原钟：t = 1.6·s（匀速）', value: 'linear' },
    { label: '换钟：t = 1.6·s³（慢起步）', value: 'cubic' },
  ], mode, (v) => {
    mode = v;
    draw();
  });
  host.appendChild(seg);
  host.appendChild(ro.box);

  bindPointer(canvas, {
    pick(x, y) {
      if (!G.traj) return null;
      const tt = tOf(s);
      const d = Math.hypot(x - G.traj.X(xOf(tt)), y - G.traj.Y(yOf(tt)));
      return d <= 26 ? 'ball' : null;
    },
    move(id, x, y) {
      if (id !== 'ball' || !G.traj) return;
      animCtl.stop();
      /* 在轨迹上找最近的一帧（按当前钟的读数取点，换钟后手感一致） */
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i <= 240; i += 1) {
        const sv = i / 240;
        const tt = tOf(sv);
        const d = Math.hypot(x - G.traj.X(xOf(tt)), y - G.traj.Y(yOf(tt)));
        if (d < bd) {
          bd = d;
          best = sv;
        }
      }
      s = clamp(best, 0, 1);
      setSliderRow(sliders, 0, s, 3, 's');
      draw();
    },
  });
  canvas.style.cursor = 'grab';

  cv.redraw = draw;
  draw();

  return {
    slidersBox: sliders.box,
    destroy() {
      animCtl.stop();
      cv.redraw = null;
    },
  };
}

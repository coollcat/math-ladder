/* =========================================================================
 * lab 组件：ham-action-angle —— 作用量–角变量：从相空间的圆到环面上的直线
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "ham-action-angle",
 *     "title": "换一套坐标：弯曲的轨道变成匀速直线",
 *     "J": 1, "ratio": 1.5
 *   }
 *   ```
 *
 * 字段：
 *   J      作用量（相轨道围出的面积 = 2πJ），0.2..2，默认 1
 *   ratio  两个频率之比 ω₂/ω₁，0.05..3，默认 1.5
 *   speed  播放速度倍率，0.2..3，默认 1
 *
 * 能拖什么：
 *   **在右图上拖动** = 旋转环面的视角（横拖转圈、竖拖俯仰）；
 *   J 改相轨道半径、ratio 改缠绕比、播放让那个点自己在环面上爬。
 *
 * 看什么：
 *   左图：相空间里的椭圆轨道。J 大一圈，轨道就大一圈，
 *   而且**它围出的面积恰好是 2πJ** —— 这就是作用量的几何含义。
 *   角变量 θ 是沿轨道的位置，它以恒定角速度转，永远不会快也不会慢。
 *   右图：把两套角度 (θ₁, θ₂) 各卷到一个圆周上，合起来就是**环面**。
 *   环面上的轨道是一条**匀速直线**（测地线）：θ₁ 走得快、θ₂ 走得慢，
 *   于是它一圈圈往上缠。缠绕比是有理数时（比如 1.5 = 3/2），
 *   转两圈就回到起点、轨迹闭合；是无理数时永远不闭合，
 *   而是把整个环面越铺越密 —— 这就是"可积系统"的两种命运。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, bindPointer, polyline, label, fmt,
  clamp, anim, mergeSpec,
  clearBg,
} from '../core.js';

const RMAX = 2.0;      /* 相空间的显示半径 */
const TURNS = 8;       /* 环面轨迹画几圈（θ₁ 的圈数） */
const NSAMP = 900;     /* 环面轨迹采样点数 */
const TSPAN = 2 * Math.PI * TURNS;

/* 有理逼近 p/q：用来判断轨道闭不闭合 */
function bestRational(x, qmax) {
  let best = null;
  for (let q = 1; q <= qmax; q += 1) {
    const p = Math.round(x * q);
    if (p < 1) continue;
    const err = Math.abs(x - p / q);
    if (!best || err < best.err - 1e-12) best = { p, q, err };
  }
  return best;
}

export default function render(host, spec) {
  let J = clamp(typeof spec.J === 'number' ? spec.J : 1, 0.2, 2);
  let ratio = clamp(typeof spec.ratio === 'number' ? spec.ratio : 1.5, 0.05, 3);
  let speed = clamp(typeof spec.speed === 'number' ? spec.speed : 1, 0.2, 3);
  let yaw = 0.6;
  let pitch = 0.9;
  let t = 0;

  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    作用量: '—', 角变量: '—', 相轨道面积: '—', 缠绕比: '—', 命运: '—',
  });
  host.appendChild(ro.box);

  const gx = { cx: 0, cy: 0, r: 0, tx: 0, ty: 0, tr: 0 };
  let dragFrom = null;

  /* 环面参数方程 → 屏幕坐标（正交投影 + 画家算法排序） */
  function project(th, ph) {
    const R = 1;
    const r = 0.42;
    const x = (R + r * Math.cos(ph)) * Math.cos(th);
    const y = (R + r * Math.cos(ph)) * Math.sin(th);
    const z = r * Math.sin(ph);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const X = x * cy - y * sy;
    const Y = x * sy + y * cy;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    return {
      x: gx.tx + X * gx.tr,
      y: gx.ty - (Y * sp - z * cp) * gx.tr,
      d: Y * cp + z * sp,
    };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    /* ---- 左：相空间的圆，面积 = 2πJ ---- */
    const side = Math.min(Math.round(W * 0.4), H - 60);
    gx.cx = 40 + side / 2;
    gx.cy = 26 + side / 2;
    gx.r = side / 2;
    const scale = gx.r / RMAX;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx.cx - gx.r, gx.cy + 0.5);
    ctx.lineTo(gx.cx + gx.r, gx.cy + 0.5);
    ctx.moveTo(gx.cx + 0.5, gx.cy - gx.r);
    ctx.lineTo(gx.cx + 0.5, gx.cy + gx.r);
    ctx.stroke();

    const rad = Math.sqrt(2 * J) * scale;
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.arc(gx.cx, gx.cy, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(gx.cx, gx.cy, rad, 0, Math.PI * 2);
    ctx.stroke();

    const theta = t % (2 * Math.PI);
    const px = gx.cx + rad * Math.cos(theta);
    const py = gx.cy - rad * Math.sin(theta);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(gx.cx, gx.cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fill();

    label(ctx, `相轨道：面积 = 2πJ = ${fmt(2 * Math.PI * J, 3)}`, 12, 16, C.fg, { size: 12, weight: 600 });
    label(ctx, '位置 q →', gx.cx + gx.r - 58, gx.cy + 16, C.fg, { size: 11 });
    label(ctx, '动量 p', gx.cx + 8, gx.cy - gx.r + 4, C.fg, { size: 11 });
    label(ctx, `θ = ${fmt(theta, 2)}（匀速转）`, gx.cx - gx.r, gx.cy + gx.r + 20, C.accent2,
      { size: 11, weight: 600 });
    label(ctx, '同一个 J，同一圈；换 J 只换半径，不换转速', gx.cx - gx.r, H - 8, C.axis, { size: 11 });

    /* ---- 右：环面 ---- */
    gx.tx = 40 + side + (W - 40 - side) / 2;
    gx.ty = 26 + (H - 60) / 2;
    gx.tr = Math.min((W - 60 - side) / 2.6, (H - 70) / 2.6);

    /* 环面骨架：几条经线与两条主圆 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let k = 0; k < 12; k += 1) {
      const th = (2 * Math.PI * k) / 12;
      ctx.beginPath();
      for (let j = 0; j <= 40; j += 1) {
        const pt = project(th, (2 * Math.PI * j) / 40);
        if (j === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
    [0.25, 0.75].forEach((u) => {
      ctx.beginPath();
      for (let j = 0; j <= 120; j += 1) {
        const pt = project((2 * Math.PI * j) / 120, 2 * Math.PI * u);
        if (j === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    });

    /* 轨迹：未走的部分淡、走过的部分亮（画家算法：远的先画） */
    const future = [];
    for (let i = 0; i <= NSAMP; i += 1) {
      const tt = (TSPAN * i) / NSAMP;
      future.push(project(tt, ratio * tt));
    }
    future.sort((a, b) => a.d - b.d);
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.25;
    future.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const walked = [];
    for (let i = 0; i <= NSAMP; i += 1) {
      const tt = (TSPAN * i) / NSAMP;
      if (tt > t) break;
      walked.push(project(tt, ratio * tt));
    }
    walked.sort((a, b) => a.d - b.d);
    ctx.fillStyle = C.accent2;
    walked.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    const now = project(t, ratio * t);
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(now.x, now.y, 5.5, 0, Math.PI * 2);
    ctx.fill();

    label(ctx, '环面 = 两个角变量各卷成一个圆周', 40 + side + 8, 16, C.fg, { size: 12, weight: 600 });
    label(ctx, '轨道是匀速直线：θ₁ 快、θ₂ 慢，缠着往上爬', 40 + side + 8, H - 8, C.axis, { size: 11 });
    label(ctx, '拖我转视角', gx.tx + gx.tr, gx.ty + gx.tr + 24, C.axis, { size: 11, align: 'center' });

    const br = bestRational(ratio, 12);
    const closed = br && br.err < 2e-3;
    ro.set('作用量', `J = ${fmt(J, 3)}（半径 √(2J) = ${fmt(Math.sqrt(2 * J), 3)}）`);
    ro.set('角变量', `θ = ${fmt(theta, 3)} rad`);
    ro.set('相轨道面积', `2πJ = ${fmt(2 * Math.PI * J, 4)}`);
    ro.set('缠绕比', `ω₂/ω₁ = ${fmt(ratio, 4)}${closed ? ` = ${br.p}/${br.q}` : ''}`);
    ro.set('命运', closed
      ? `有理缠绕：转 ${br.q} 圈回到起点，轨道闭合（一条闭合曲线）`
      : '无理缠绕：永不闭合，轨道在整个环面上稠密（遍历）');
  }

  const loop = anim(host, {
    onTick(dt) {
      if (t < TSPAN) t = Math.min(TSPAN, t + dt * speed * 2.4);
      draw();
    },
    onReset() { t = 0; draw(); },
  });

  const sl = buildSliders(
    {
      sliders: mergeSpec([
        { name: 'J', label: '作用量 J', min: 0.2, max: 2, step: 0.02, value: J, fmt: 2 },
        { name: 'ratio', label: '频率比 ω₂/ω₁', min: 0.05, max: 3, step: 0.01, value: ratio, fmt: 2 },
        { name: 'speed', label: '播放速度', min: 0.2, max: 3, step: 0.1, value: speed, fmt: 1 },
      ], spec),
    },
    (st) => {
      J = st.J;
      ratio = st.ratio;
      speed = st.speed;
      t = 0;
      draw();
    },
  );
  J = sl.state.J; ratio = sl.state.ratio; speed = sl.state.speed;

  bindPointer(cv.canvas, {
    pick(x, y) {
      return x > 40 + Math.min(Math.round(cv.W * 0.4), cv.H - 60)
        && Math.hypot(x - gx.tx, y - gx.ty) < gx.tr * 1.9 ? 'view' : null;
    },
    down(id, x, y) { dragFrom = [x, y]; },
    move(id, x, y) {
      yaw += (x - dragFrom[0]) * 0.012;
      pitch = clamp(pitch - (y - dragFrom[1]) * 0.010, -1.45, 1.45);
      dragFrom = [x, y];
      draw();
    },
    up() { dragFrom = null; },
  });

  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() { loop.stop(); },
  };
}

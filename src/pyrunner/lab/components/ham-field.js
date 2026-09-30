/* =========================================================================
 * lab 组件：ham-field —— 离散弦的简正模：粒子如何变成"场"
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "ham-field",
 *     "title": "N 个珠子串成的弦：模态、色散与连续极限",
 *     "N": 9, "n": 1
 *   }
 *   ```
 *
 * 模型：N 个质量块用弹簧串起来、两端固定，位移 u_j 满足
 * u_j(t) = Σ_n a_n·sin(nπj/(N+1))·cos(ω_n t)，ω_n = 2√(K/m)·sin(k_n/2)，k_n = nπ/(N+1)。
 * 这里取 K = m = 1（于是连续极限的波速 c = 1）。
 *
 * 字段：
 *   N    珠子个数，3..20，默认 9
 *   n    激发第几个模态，1..N，默认 1
 *   speed 播放速度，0.2..2，默认 1
 *
 * 能拖什么：
 *   **抓住任意一颗珠子上下拖** = 把弦捏成任意形状；松手后它自己按模态叠加演化，
 *   下面的色散图上会标出被激发的那些模态。滑块还能改珠子数、换纯模态、调速度。
 *
 * 看什么：
 *   上图：珠子越密，形状越像一根连续的弦（连续极限）。
 *   下图：ω 与 k 的关系。虚线是连续弦的 ω = c·k（一条直线）；
 *   离散链的圆点是 ω_n = 2sin(k_n/2)，只在 k 小时贴着直线，
 *   越靠近布里渊区边界 k = π 越往下弯，ω 最大只到 2。
 *   这就是"场论门口"的第一课：格点上的场 = 一堆耦合振子，
 *   它的简正模在长波极限下才还原成连续的波动方程。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, bindPointer, polyline, label, fmt,
  clamp, anim, mergeSpec,
  clearBg,
} from '../core.js';

const KMAX = Math.PI;      /* 布里渊区边界 */
const WMAX = 2.2;          /* 色散图纵轴上限（连续极限下 ω 最大到 2） */

/* 第 n 个模态在第 j 个珠子上的形状值（两端固定） */
function shape(n, j, N) {
  return Math.sin((n * Math.PI * j) / (N + 1));
}

/* 离散链的色散：ω_n = 2 sin(k/2)，k = nπ/(N+1) */
function omega(n, N) {
  return 2 * Math.sin((n * Math.PI) / (2 * (N + 1)));
}

/* 把任意形状分解成模态系数 a_n（正弦变换）：a_n = 2/(N+1) · Σ_j u_j sin(k_n j) */
function decompose(u, N) {
  const out = [];
  for (let n = 1; n <= N; n += 1) {
    let s = 0;
    for (let j = 1; j <= N; j += 1) s += u[j - 1] * shape(n, j, N);
    out.push((2 / (N + 1)) * s);
  }
  return out;
}

export default function render(host, spec) {
  let N = Math.round(clamp(typeof spec.N === 'number' ? spec.N : 9, 3, 20));
  let n = Math.round(clamp(typeof spec.n === 'number' ? spec.n : 1, 1, N));
  let speed = clamp(typeof spec.speed === 'number' ? spec.speed : 1, 0.2, 2);
  let amp = 1;
  let t = 0;
  let dragJ = -1;

  const cv = setupCanvas(host, 350);
  const ro = buildReadout({
    珠子: '—', 模式: '—', 离散ω: '—', 连续ω: '—', 模态成分: '—',
  });
  host.appendChild(ro.box);

  const gx = { x0: 44, y0: 30, w: 0, h: 0, dy: 0, dh: 0 };
  let u = [];

  const beadX = (j) => gx.x0 + (gx.w * j) / (N + 1);
  const beadY = (j, tt) => {
    let s = 0;
    for (let m = 1; m <= N; m += 1) {
      const a = u[m - 1];
      if (a !== 0) s += a * shape(m, j, N) * Math.cos(omega(m, N) * tt);
    }
    return gx.y0 + gx.h / 2 - s * (gx.h * 0.36);
  };

  function reset() {
    u = [];
    for (let j = 1; j <= N; j += 1) u.push(amp * shape(n, j, N));
    t = 0;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    gx.w = W - gx.x0 - 34;
    gx.h = Math.round((H - 110) * 0.52);
    gx.dy = gx.y0 + gx.h + 46;
    gx.dh = H - gx.dy - 34;

    /* ---- 上：珠子链 ---- */
    const mid = gx.y0 + gx.h / 2;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx.x0, mid + 0.5);
    ctx.lineTo(gx.x0 + gx.w, mid + 0.5);
    ctx.stroke();
    /* 两端固定的墙 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx.x0, gx.y0);
    ctx.lineTo(gx.x0, gx.y0 + gx.h);
    ctx.moveTo(gx.x0 + gx.w, gx.y0);
    ctx.lineTo(gx.x0 + gx.w, gx.y0 + gx.h);
    ctx.stroke();

    const pts = [[gx.x0, mid]];
    for (let j = 1; j <= N; j += 1) pts.push([beadX(j), beadY(j, t)]);
    pts.push([gx.x0 + gx.w, mid]);
    polyline(ctx, pts, C.accent, 2.4);
    ctx.fillStyle = C.accent2;
    for (let j = 1; j <= N; j += 1) {
      ctx.beginPath();
      ctx.arc(beadX(j), beadY(j, t), dragJ === j ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, `离散弦：${N} 个珠子 + 两端固定（抓一颗上下拖它）`, gx.x0, gx.y0 - 10,
      C.fg, { size: 12, weight: 600 });
    label(ctx, '振幅最大处 = 波腹，始终不动的珠子 = 波节', gx.x0, gx.y0 + gx.h + 18,
      C.axis, { size: 11 });

    /* ---- 下：色散关系 ---- */
    const dw = gx.w;
    const dh = gx.dh;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx.x0, gx.dy + dh + 0.5);
    ctx.lineTo(gx.x0 + dw, gx.dy + dh + 0.5);
    ctx.moveTo(gx.x0 + 0.5, gx.dy);
    ctx.lineTo(gx.x0 + 0.5, gx.dy + dh);
    ctx.stroke();
    const X = (k) => gx.x0 + (k / KMAX) * dw;
    const Y = (om) => gx.dy + dh - (om / WMAX) * dh;

    /* 连续弦：ω = c k（c = 1） */
    polyline(ctx, [[X(0), Y(0)], [X(KMAX), Y(KMAX)]], C.axis, 1.6, [6, 4]);
    label(ctx, '连续弦 ω = c·k', X(KMAX) - 108, Y(KMAX) + 4, C.axis, { size: 11 });
    /* 布里渊区边界 */
    polyline(ctx, [[X(KMAX), gx.dy], [X(KMAX), gx.dy + dh]], C.grid, 1.2);
    label(ctx, 'k = π（边界）', X(KMAX) - 74, gx.dy + 12, C.axis, { size: 10 });
    label(ctx, 'ω', gx.x0 - 30, gx.dy + 10, C.fg, { size: 11 });
    label(ctx, 'k', gx.x0 + dw - 6, gx.dy + dh + 16, C.fg, { size: 11 });

    /* 离散链的色散点 */
    const dis = [];
    for (let m = 1; m <= N; m += 1) dis.push([X((m * Math.PI) / (N + 1)), Y(omega(m, N))]);
    polyline(ctx, dis, C.accent, 2);
    ctx.fillStyle = C.accent;
    dis.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    /* 当前最强模态（或滑块的 n）高亮 */
    let top = 1;
    for (let m = 1; m <= N; m += 1) if (Math.abs(u[m - 1]) > Math.abs(u[top - 1])) top = m;
    const kx = X((top * Math.PI) / (N + 1));
    polyline(ctx, [[kx, gx.dy], [kx, Y(omega(top, N))]], C.accent2, 1.8, [4, 3]);
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(kx, Y(omega(top, N)), 6, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, `主模态 n = ${top}：离散 ω = ${fmt(omega(top, N), 3)}，连续 c·k = ${fmt((top * Math.PI) / (N + 1), 3)}`,
      gx.x0 + 8, gx.dy + dh - 6, C.accent2, { size: 11, weight: 600 });

    const a = decompose(u, N);
    const mags = a.map((v) => Math.abs(v));
    const idx = [0, 1, 2].filter((i) => i < N);
    ro.set('珠子', `N = ${N}（自由度 ${N}，模态也就 ${N} 个）`);
    ro.set('模式', `n = ${top}，k = ${fmt((top * Math.PI) / (N + 1), 4)}`);
    ro.set('离散ω', `2sin(k/2) = ${fmt(omega(top, N), 4)}`);
    ro.set('连续ω', `c·k = ${fmt((top * Math.PI) / (N + 1), 4)}，相对偏差 ${fmt(Math.abs(omega(top, N) / ((top * Math.PI) / (N + 1)) - 1) * 100, 2)}%`);
    ro.set('模态成分', idx.map((i) => `|a${i + 1}| = ${fmt(mags[i], 3)}`).join('　')
      + `（能量占比 ${fmt((mags.reduce((s, v) => s + v * v, 0) > 0
        ? (mags.slice(0, 3).reduce((s, v) => s + v * v, 0) / mags.reduce((s, v) => s + v * v, 0)) * 100 : 0), 1)}%）`);
  }

  const loop = anim(host, {
    onTick(dt) { t += dt * speed; draw(); },
    onReset() { t = 0; draw(); },
  });

  const sl = buildSliders(
    {
      sliders: mergeSpec([
        { name: 'N', label: '珠子数 N', min: 3, max: 20, step: 1, value: N, fmt: 0 },
        { name: 'n', label: '激发模式 n', min: 1, max: 20, step: 1, value: n, fmt: 0 },
        { name: 'speed', label: '播放速度', min: 0.2, max: 2, step: 0.1, value: speed, fmt: 1 },
      ], spec),
    },
    (st) => {
      const nN = Math.round(st.N);
      const nn = Math.round(st.n);
      speed = st.speed;
      const changed = nN !== N || nn !== n;
      N = nN;
      n = clamp(nn, 1, N);
      if (changed) reset(); else t = 0;
      draw();
    },
  );
  N = Math.round(clamp(sl.state.N, 3, 20));
  n = clamp(Math.round(sl.state.n), 1, N);
  speed = sl.state.speed;

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (y < gx.y0 - 20 || y > gx.y0 + gx.h + 20) return null;
      let best = -1;
      let bd = 1e9;
      for (let j = 1; j <= N; j += 1) {
        const d = Math.hypot(x - beadX(j), y - beadY(j, t));
        if (d < bd) { bd = d; best = j; }
      }
      return bd < Math.max(26, gx.w / (N + 1)) ? best : null;
    },
    down(j) { dragJ = j; t = 0; },
    move(j, x, y) {
      if (j < 1) return;
      dragJ = j;
      const v = clamp((gx.y0 + gx.h / 2 - y) / (gx.h * 0.36), -1.6, 1.6);
      /* 拖动中直接改第 j 个珠子的位移：模态系数由它现算，
         t = 0 时刻的合成形状必然等于手上这个形状（正弦变换可逆） */
      u[j - 1] = v;
      t = 0;
      draw();
    },
    up() { dragJ = -1; t = 0; draw(); },
  });

  reset();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() { loop.stop(); },
  };
}

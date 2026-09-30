/* =========================================================================
 * lab 组件：rel-lightcone —— 光锥与三类间隔：谁能影响谁
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "rel-lightcone", "title": "拖事件点看间隔分类", "x": 1.2, "t": 1.0, "beta": 0.6 }
 *   ```
 *
 * 字段：
 *   x / t  事件 P 的初始坐标（光秒），默认 1.2 与 1.0
 *   beta   路过观察者的速度（单位 c），0..0.9，默认 0.6
 *
 * 能拖什么：
 *   ① 事件点 P —— 拖到光锥里、锥面上、锥外，右下角读数条立刻给出类别与 s²；
 *   ② 速度滑块 β —— 换一个观察者，看 Δt′、Δx′ 怎么变，而 s² 一动不动。
 *
 * 看什么：
 *   45° 的两条线就是光锥。锥内（黄）是类时间隔：从 O 出发的粒子赶得上；
 *   锥面上（绿）是类光：只有光能做到；锥外（灰）是类空间隔：谁也赶不上，
 *   而且换一个观察者还能把它们的先后顺序颠倒过来 —— 因果律禁止的就是最后这一条。
 *   紫色双曲线是 ct² − x² = ±1 的"标尺"，它把每个方向上的同一格间隔连成一条。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, polyline, label, fmt,
  clamp, pickSlider,
  clearBg,
  gammaOf,
} from '../core.js';

const RANGE = 2.5;

export default function render(host, spec) {
  let px0 = clamp(Number(spec.x ?? 1.2), -RANGE, RANGE);
  let pt0 = clamp(Number(spec.t ?? 1.0), -RANGE, RANGE);
  let beta = clamp(Number(spec.beta ?? 0.6), 0, 0.9);
  let hover = null;

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({ 间隔: '—', 类别: '—', 换观察者: '—', 因果: '—', 光标: '—' });
  host.appendChild(ro.box);

  const geo = { cx: 0, cy: 0, s: 1, left: 0, top: 0, size: 0 };
  const X = (x) => geo.cx + x * geo.s;
  const Y = (t) => geo.cy - t * geo.s;
  const iX = (p) => (p - geo.cx) / geo.s;
  const iY = (p) => (geo.cy - p) / geo.s;
  const gam = () => gammaOf(beta);

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W, H = cv.H;
    clearBg(ctx, W, H, C);

    geo.s = Math.min((W - 24) / (2 * RANGE), (H - 40) / (2 * RANGE));
    geo.size = geo.s * 2 * RANGE;
    geo.cx = W / 2;
    geo.cy = (H - 30) / 2 + 6;
    geo.left = geo.cx - geo.size / 2;
    geo.top = geo.cy - geo.size / 2;

    const g = gam();
    const line = (x1, t1, x2, t2, col, w, dash) =>
      polyline(ctx, [[X(x1), Y(t1)], [X(x2), Y(t2)]], col, w, dash);

    ctx.save();
    ctx.beginPath();
    ctx.rect(geo.left, geo.top, geo.size, geo.size);
    ctx.clip();

    /* 三个区域：未来光锥 / 过去光锥 / 锥外 */
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(-RANGE), Y(RANGE));
    ctx.lineTo(X(RANGE), Y(RANGE));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(-RANGE), Y(-RANGE));
    ctx.lineTo(X(RANGE), Y(-RANGE));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    /* 网格 */
    for (let k = -5; k <= 5; k += 1) {
      line(k * 0.5, -RANGE, k * 0.5, RANGE, C.grid, 1);
      line(-RANGE, k * 0.5, RANGE, k * 0.5, C.grid, 1);
    }

    /* 标尺双曲线 ct² − x² = ±1：把"同一格间隔"在各方向上连成一条 */
    const hyperPos = () => {
      const pts = [];
      for (let x = -RANGE; x <= RANGE + 1e-9; x += 0.05) pts.push([X(x), Y(Math.sqrt(1 + x * x))]);
      return pts;
    };
    const hyperNegR = () => {
      const pts = [];
      for (let t = -RANGE; t <= RANGE + 1e-9; t += 0.05) pts.push([X(Math.sqrt(1 + t * t)), Y(t)]);
      return pts;
    };
    polyline(ctx, hyperPos(), C.named('purple'), 1.4, [4, 3]);
    polyline(ctx, hyperPos().map(([a, b]) => [a, 2 * geo.cy - b]), C.named('purple'), 1.4, [4, 3]);
    polyline(ctx, hyperNegR(), C.named('purple'), 1.4, [4, 3]);
    polyline(ctx, hyperNegR().map(([a, b]) => [2 * geo.cx - a, b]), C.named('purple'), 1.4, [4, 3]);
    ctx.restore();

    /* 光锥与坐标轴 */
    line(-RANGE, -RANGE, RANGE, RANGE, C.accent2, 2);
    line(-RANGE, RANGE, RANGE, -RANGE, C.accent2, 2);
    line(-RANGE, 0, RANGE, 0, C.axis, 1.3);
    line(0, -RANGE, 0, RANGE, C.axis, 1.3);
    label(ctx, 'x（光秒）', X(RANGE) - 4, Y(0) - 6, C.axis, { size: 11, align: 'right' });
    label(ctx, 'ct', X(0) + 5, Y(RANGE) + 12, C.axis, { size: 11 });
    label(ctx, '未来光锥', X(0) + 8, Y(RANGE * 0.86), C.named('amber'), { size: 11, weight: 600 });
    label(ctx, '过去光锥', X(0) + 8, Y(-RANGE * 0.86), C.named('amber'), { size: 11, weight: 600 });
    label(ctx, '锥外：类空', X(RANGE) - 6, Y(RANGE * 0.55), C.axis, { size: 11, align: 'right' });
    label(ctx, '光锥面：类光', X(RANGE) - 6, Y(RANGE * 0.98), C.accent2, { size: 11, align: 'right' });

    /* 观察者世界线 x = βct 与其同时线 ct = βx */
    line(beta * -RANGE, -RANGE, beta * RANGE, RANGE, C.accent, 1.8);
    line(-RANGE, beta * -RANGE, RANGE, beta * RANGE, C.accent, 1.2, [5, 4]);
    label(ctx, `观察者 ct′ 轴（β = ${fmt(beta, 2)}）`, X(beta * RANGE) + 5, Y(RANGE) - 4, C.accent,
      { size: 10 });
    label(ctx, '他的一张"同时面"', X(RANGE) - 6, Y(beta * RANGE) + 14, C.accent,
      { size: 10, align: 'right' });

    /* 事件 P 与从原点出发的连线 */
    const s2 = pt0 * pt0 - px0 * px0;
    const kind = Math.abs(s2) < 0.02 ? 'light' : s2 > 0 ? 'time' : 'space';
    const col = kind === 'time' ? C.named('amber') : kind === 'light' ? C.ok : C.axis;
    line(0, 0, px0, pt0, col, 1.6, kind === 'space' ? [7, 5] : null);

    ctx.beginPath();
    ctx.arc(X(px0), Y(pt0), 6, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    label(ctx, 'P（拖我）', X(px0) + 10, Y(pt0) - 8, col, { size: 11, weight: 700 });
    ctx.beginPath();
    ctx.arc(X(0), Y(0), 4, 0, Math.PI * 2);
    ctx.fillStyle = C.fg;
    ctx.fill();
    label(ctx, 'O（这里 · 现在）', X(0) + 8, Y(0) + 16, C.fg, { size: 11 });

    if (hover) {
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hover.px, hover.py, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* ---- 读数 ---- */
    const dt2 = g * (pt0 - beta * px0);
    const dx2 = g * (px0 - beta * pt0);
    const kindName = kind === 'time' ? '类时（锥内）' : kind === 'light' ? '类光（锥面）' : '类空（锥外）';
    ro.set('间隔', `s² = c²t² − x² = ${fmt(s2, 3)} 光秒²`);
    ro.set('类别', kindName);
    ro.set('换观察者', `Δt′ = ${fmt(dt2, 3)}，Δx′ = ${fmt(dx2, 3)}；s′² = ${fmt(dt2 * dt2 - dx2 * dx2, 3)}（不变）`);
    ro.set('因果', kind === 'space'
      ? `不能互相影响${dt2 < 0 ? '；而且这位观察者认为 P 发生在 O 之前' : '；这位观察者认为 P 仍在 O 之后'}`
      : kind === 'light' ? '只有光信号能连接 O 与 P' : '有质量粒子就能从 O 走到 P（只要够快）');
    ro.set('光标', hover ? `x = ${fmt(iX(hover.px), 2)}，ct = ${fmt(iY(hover.py), 2)}` : '—');
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const inBox = x >= geo.left && x <= geo.left + geo.size && y >= geo.top && y <= geo.top + geo.size;
      return inBox ? 'P' : null;
    },
    move(id, x, y) {
      const r = (v) => Math.round(v * 20) / 20;
      px0 = clamp(r(iX(x)), -RANGE, RANGE);
      pt0 = clamp(r(iY(y)), -RANGE, RANGE);
      draw();
    },
    hover(x, y) { hover = { px: x, py: y }; draw(); },
    leave() { hover = null; draw(); },
  });
  cv.canvas.style.cursor = 'crosshair';

  const sl = buildSliders({
    sliders: [pickSlider(spec, 'beta', {
      name: 'beta', label: '观察者速度 β', min: 0, max: 0.9, step: 0.01, value: beta,
    })],
  }, (st) => {
    beta = clamp(st.beta ?? beta, 0, 0.9);
    draw();
  });

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}

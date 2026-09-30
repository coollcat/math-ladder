/* =========================================================================
 * lab 组件：rel-lorentz —— 时空图上拖 β：网格被"剪切"成什么样
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "rel-lorentz", "title": "拖 β 看时空网格剪切", "beta": 0.6 }
 *   ```
 *
 * 字段：beta  列车系相对站台系的速度（单位 c），0..0.9，默认 0.6
 *
 * 能拖什么：
 *   ① 速度滑块 β；② 画布上的事件点 E —— 随便拖到哪，读数条立刻给出它在两套
 *   坐标系里的 (x, ct) 与 (x′, ct′)，以及不变量 ct² − x²。
 *
 * 看什么：
 *   浅灰是站台系的方格（横 ct、竖 x）；蓝线是列车系的方格：x′ 轴（ct = βx）
 *   与 ct′ 轴（x = βct）互相靠近，方格被压成菱形——这就是"剪切"。
 *   45° 虚线是光锥：两套网格都把它夹在正中（光速对谁都一样）。
 *   从 E 沿两组网格线"数格子"，就是洛伦兹变换的几何操作。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, polyline, label, fmt,
  clamp, pickSlider,
  clearBg,
  gammaOf,
} from '../core.js';

const RANGE = 2.0; /* 横纵都画 [-2, 2] 光秒 */

export default function render(host, spec) {
  let beta = clamp(Number(spec.beta ?? 0.6), 0, 0.9);
  let ex = Number(spec.x ?? 1.0);
  let et = Number(spec.t ?? 0.5);
  let hover = null;

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({ 站台系: '—', 列车系: '—', 不变量: '—', 光标: '—' });
  host.appendChild(ro.box);

  const geo = { cx: 0, cy: 0, s: 1, left: 0, top: 0, size: 0 };
  const X = (x) => geo.cx + x * geo.s;
  const Y = (t) => geo.cy - t * geo.s;
  const iX = (px) => (px - geo.cx) / geo.s;
  const iY = (py) => (geo.cy - py) / geo.s;

  const gam = () => gammaOf(beta);
  /* (x, ct) → (x′, ct′)：x′ = γ(x − βct)，ct′ = γ(ct − βx)（c = 1） */
  function toPrime(x, t) {
    const g = gam();
    return { x: g * (x - beta * t), t: g * (t - beta * x) };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W, H = cv.H;
    clearBg(ctx, W, H, C);

    geo.s = Math.min((W - 24) / (2 * RANGE), (H - 34) / (2 * RANGE));
    geo.size = geo.s * 2 * RANGE;
    geo.cx = W / 2;
    geo.cy = (H - 24) / 2 + 4;
    geo.left = geo.cx - geo.size / 2;
    geo.top = geo.cy - geo.size / 2;

    const g = gam();
    const line = (x1, t1, x2, t2, col, w, dash) =>
      polyline(ctx, [[X(x1), Y(t1)], [X(x2), Y(t2)]], col, w, dash);

    ctx.save();
    ctx.beginPath();
    ctx.rect(geo.left, geo.top, geo.size, geo.size);
    ctx.clip();

    /* 站台系方格（每 0.5 光秒） */
    for (let k = -4; k <= 4; k += 1) {
      line(k * 0.5, -RANGE, k * 0.5, RANGE, C.grid, 1);
      line(-RANGE, k * 0.5, RANGE, k * 0.5, C.grid, 1);
    }

    /* 列车系方格：x′ = k/2 与 ct′ = k/2 */
    for (let k = -4; k <= 4; k += 1) {
      const a = k * 0.5;
      /* x′ = a  ⟹  x = a/γ + βt */
      line(a / g + beta * -RANGE, -RANGE, a / g + beta * RANGE, RANGE, C.accent, 1);
      /* ct′ = a ⟹  ct = βx + a/γ */
      line(-RANGE, beta * -RANGE + a / g, RANGE, beta * RANGE + a / g, C.accent, 1);
    }

    /* 光锥：x = ±ct */
    line(-RANGE, -RANGE, RANGE, RANGE, C.accent2, 1.4, [6, 4]);
    line(-RANGE, RANGE, RANGE, -RANGE, C.accent2, 1.4, [6, 4]);

    /* 校准双曲线 ct² − x² = 1（两套坐标都认它） */
    const hb = [];
    for (let x = -RANGE; x <= RANGE + 1e-9; x += 0.05) {
      const t2 = 1 + x * x;
      hb.push([X(x), Y(Math.sqrt(t2))]);
    }
    polyline(ctx, hb, C.named('purple'), 1.4, [4, 3]);
    const hb2 = hb.map(([px, py]) => [px, 2 * geo.cy - py]);
    polyline(ctx, hb2, C.named('purple'), 1.4, [4, 3]);
    ctx.restore();

    /* 两套坐标轴 */
    line(-RANGE, 0, RANGE, 0, C.axis, 1.3);
    line(0, -RANGE, 0, RANGE, C.axis, 1.3);
    line(-RANGE, beta * -RANGE, RANGE, beta * RANGE, C.accent, 2);          /* x′ 轴 */
    line(beta * -RANGE, -RANGE, beta * RANGE, RANGE, C.accent, 2);          /* ct′ 轴 */
    label(ctx, 'x′', X(RANGE) - 6, Y(beta * RANGE) + (beta > 0 ? 16 : -6), C.accent,
      { size: 12, weight: 700, align: 'right' });
    label(ctx, 'ct′', X(beta * RANGE) + 6, Y(RANGE) + 12, C.accent, { size: 12, weight: 700 });
    label(ctx, 'x', X(RANGE) - 4, Y(0) - 6, C.axis, { size: 12, align: 'right' });
    label(ctx, 'ct', X(0) + 5, Y(RANGE) + 12, C.axis, { size: 12 });
    label(ctx, `β = ${fmt(beta, 2)}，γ = ${fmt(g, 3)}`, geo.left, geo.top - 4, C.fg,
      { size: 11, weight: 600 });

    /* 事件点 E 与它在两套网格里的投影 */
    const p = toPrime(ex, et);
    const px = X(ex), py = Y(et);
    /* x′ = k1 的网格线与 x′ 轴（ct = βx）交于 (γk1, βγk1)；
       ct′ = k2 的网格线与 ct′ 轴（x = βct）交于 (βγk2, γk2) —— 这两点就是"数格子"的落点 */
    const k1 = p.x;
    const k2 = p.t;
    const ax = g * k1, at = beta * g * k1;
    const bx = beta * g * k2, bt = g * k2;

    ctx.save();
    ctx.strokeStyle = C.named('orange');
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(X(ax), Y(at));
    ctx.moveTo(px, py); ctx.lineTo(X(bx), Y(bt));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.named('orange');
    ctx.beginPath(); ctx.arc(X(ax), Y(at), 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(X(bx), Y(bt), 3.5, 0, Math.PI * 2); ctx.fill();
    label(ctx, `x′ = ${fmt(p.x, 2)}`, X(ax), Y(at) + 15, C.named('orange'),
      { size: 10, align: 'center' });
    label(ctx, `ct′ = ${fmt(p.t, 2)}`, X(bx) - 7, Y(bt) + 4, C.named('orange'),
      { size: 10, align: 'right' });
    ctx.restore();

    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = C.named('red');
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, 'E（拖我）', px + 9, py - 7, C.named('red'), { size: 11, weight: 600 });

    if (hover) {
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hover.px, hover.py, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    label(ctx, '几乎水平的蓝线是 ct′ = 常数（列车系的"同时"），几乎竖直的蓝线是 x′ = 常数',
      geo.left, geo.top + geo.size + 18, C.accent, { size: 11 });

    ro.set('站台系', `x = ${fmt(ex, 3)}，ct = ${fmt(et, 3)} 光秒`);
    ro.set('列车系', `x′ = ${fmt(p.x, 3)}，ct′ = ${fmt(p.t, 3)} 光秒`);
    ro.set('不变量', `c²t² − x² = ${fmt(et * et - ex * ex, 3)}（变换前后相同：${fmt(p.t * p.t - p.x * p.x, 3)}）`);
    ro.set('光标', hover ? `x = ${fmt(iX(hover.px), 2)}，ct = ${fmt(iY(hover.py), 2)}` : '—');
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const inBox = x >= geo.left && x <= geo.left + geo.size && y >= geo.top && y <= geo.top + geo.size;
      return inBox ? 'E' : null;
    },
    move(id, x, y) {
      ex = clamp(iX(x), -RANGE, RANGE);
      et = clamp(iY(y), -RANGE, RANGE);
      const r = (v) => Math.round(v * 50) / 50;
      ex = r(ex); et = r(et);
      draw();
    },
    hover(x, y) { hover = { px: x, py: y }; draw(); },
    leave() { hover = null; draw(); },
  });

  cv.canvas.style.cursor = 'crosshair';

  const sl = buildSliders({
    sliders: [pickSlider(spec, 'beta', {
      name: 'beta', label: '相对速度 β', min: 0, max: 0.9, step: 0.01, value: beta,
    })],
  }, (st) => {
    beta = clamp(st.beta ?? beta, 0, 0.9);
    draw();
  });

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}

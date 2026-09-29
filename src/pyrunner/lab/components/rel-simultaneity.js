/* =========================================================================
 * lab 组件：rel-simultaneity —— 列车上的两道闪电：同时性是相对的
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "rel-simultaneity", "title": "拖速度看两击先后翻转", "beta": 0.6 }
 *   ```
 *
 * 字段：
 *   beta    列车速度（单位 c），0..0.95，默认 0.6
 *   offset  车尾闪电相对车头闪电的时间偏移（光秒），-1..1，默认 0（站台系同时）
 *
 * 能拖什么：
 *   ① 速度滑块 —— 拖到 0 是伽利略世界（两击永远同时到达），拖大则先后差拉开；
 *   ② 画布里的 B 击（车尾那道闪电）可以上下拖 —— 直接造出"站台系不同时"的两击，
 *      再去列车系看它们谁先谁后，甚至能拖到"列车系同时"那个特殊位置。
 *   动画：点「播放」让光从两道闪电出发，看它先碰上哪一个观察者。
 *
 * 看什么：
 *   横轴 x、纵轴 ct（光秒）。绿线是列车首尾的世界线，斜率为 β；
 *   橙色斜虚线是列车系的"同时线"（t′ = 0）。从 A、B 两击各射出一条 45° 光线，
 *   站台观察者（x = 0）同时收到两条，列车观察者（x = βct）先收到 A 的那条。
 *   读数条给出两击在站台系、列车系的 Δt 与"谁先"。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, anim,
  polyline, label, fmt, clamp,
} from '../core.js';

const HALF = 1.0;      /* 半列车长 = 1 光秒（为画得清楚放大了，结论只依赖比例） */
const CT_MAX = 2.4;    /* 纵轴 ct 范围 [0, 2.4] 光秒 */
const X_MAX = 2.1;     /* 横轴 x 范围 [-2.1, 2.1] 光秒 */

function pickSlider(spec, name, def) {
  const s = (spec.sliders || []).find((it) => it && it.name === name);
  return s ? { name, label: s.label || def.label, min: s.min, max: s.max, step: s.step, value: s.value } : def;
}

export default function render(host, spec) {
  let beta = clamp(Number(spec.beta ?? 0.6), 0, 0.95);
  let off = clamp(Number(spec.offset ?? 0), -1, 1);   /* B 击相对 A 击的时间偏移（光秒） */
  let now = CT_MAX;                                   /* 动画游标：光传到哪一个 ct */
  let hover = null;

  const cv = setupCanvas(host, 380);
  const ro = buildReadout({ 速度: '—', 站台系: '—', 列车系: '—', 谁先: '—', 光标: '—' });
  host.appendChild(ro.box);

  const geo = { x0: 0, y0: 0, pw: 0, ph: 0 };
  const X = (x) => geo.x0 + ((x + X_MAX) / (2 * X_MAX)) * geo.pw;
  const Y = (t) => geo.y0 + geo.ph - (t / CT_MAX) * geo.ph;
  const invX = (px) => ((px - geo.x0) / geo.pw) * 2 * X_MAX - X_MAX;
  const invY = (py) => ((geo.y0 + geo.ph - py) / geo.ph) * CT_MAX;

  /* 两道闪电的坐标：A 在车头 (HALF, 0)，B 在车尾 (-HALF, off) */
  const evA = () => ({ x: HALF, t: 0 });
  const evB = () => ({ x: -HALF, t: off });

  function gamma() { return 1 / Math.sqrt(1 - beta * beta); }
  /* 洛伦兹时间变换：Δt′ = γ(Δt − βΔx)（取 c = 1） */
  function dtPrime() { return gamma() * (-off - 2 * HALF * beta); }

  function dot(ctx, x, y, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W, H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    geo.x0 = 46; geo.y0 = 16;
    geo.pw = W - geo.x0 - 14;
    geo.ph = H - geo.y0 - 30;

    /* 光秒方格：每 0.5 光秒一条 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = -4; k <= 4; k += 1) {
      const gx = X(k * 0.5);
      ctx.moveTo(gx + 0.5, geo.y0); ctx.lineTo(gx + 0.5, geo.y0 + geo.ph);
    }
    for (let k = 0; k <= 4; k += 1) {
      const gy = Y(k * 0.5);
      ctx.moveTo(geo.x0, gy + 0.5); ctx.lineTo(geo.x0 + geo.pw, gy + 0.5);
    }
    ctx.stroke();

    /* 坐标轴 */
    polyline(ctx, [[geo.x0, Y(0)], [geo.x0 + geo.pw, Y(0)]], C.axis, 1.4);
    polyline(ctx, [[X(0), geo.y0], [X(0), geo.y0 + geo.ph]], C.axis, 1.4);
    label(ctx, 'x（光秒）', geo.x0 + geo.pw - 2, Y(0) + 14, C.axis, { size: 10, align: 'right' });
    label(ctx, 'ct', X(0) + 5, geo.y0 + 10, C.axis, { size: 10 });
    for (let k = -4; k <= 4; k += 1) {
      if (k === 0) continue;
      label(ctx, fmt(k * 0.5, 1), X(k * 0.5), Y(0) + 13, C.axis, { size: 9, align: 'center' });
    }
    for (let k = 1; k <= 4; k += 1) {
      label(ctx, fmt(k * 0.5, 1), geo.x0 - 5, Y(k * 0.5) + 3, C.axis, { size: 9, align: 'right' });
    }

    /* 列车系同时线 t′ = 0：ct = βx */
    polyline(ctx, [[X(-X_MAX), Y(clamp(beta * -X_MAX, 0, CT_MAX))],
      [X(X_MAX), Y(clamp(beta * X_MAX, 0, CT_MAX))]], C.accent2, 1.2, [5, 4]);
    label(ctx, "列车系同时线 t′ = 0", X(X_MAX) - 4, Y(beta * X_MAX) - 5, C.accent2,
      { size: 10, align: 'right' });

    /* 列车世界线（首尾）与世界管 */
    const seg = (xAt) => [[X(xAt(0)), Y(0)], [X(xAt(CT_MAX)), Y(clamp(CT_MAX, 0, CT_MAX))]];
    const front = (t) => HALF + beta * t;
    const rear = (t) => -HALF + beta * t;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = C.soft;
    ctx.beginPath();
    ctx.moveTo(X(rear(0)), Y(0));
    ctx.lineTo(X(front(0)), Y(0));
    ctx.lineTo(X(front(CT_MAX)), Y(CT_MAX));
    ctx.lineTo(X(rear(CT_MAX)), Y(CT_MAX));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    polyline(ctx, seg(front), C.named('green'), 1.6);
    polyline(ctx, seg(rear), C.named('green'), 1.6);
    label(ctx, '车头', X(front(CT_MAX)) - 4, Y(CT_MAX) + 13, C.named('green'), { size: 10, align: 'right' });
    label(ctx, '车尾', X(rear(CT_MAX)) + 2, Y(CT_MAX) + 13, C.named('green'), { size: 10 });

    /* 列车中点观察者的世界线 x = βct */
    polyline(ctx, seg((t) => beta * t), C.named('green'), 1.2, [3, 3]);
    label(ctx, '车上观察者', X(beta * CT_MAX) + 4, Y(CT_MAX * 0.62), C.named('green'), { size: 10 });

    /* 站台观察者：x = 0 的竖轴本身，加一个点 */
    dot(ctx, X(0), Y(0), 3.5, C.fg);
    label(ctx, '站台观察者', X(0) + 5, Y(0) + 26, C.fg, { size: 10 });

    /* 两道闪电 */
    const mark = (e, name, col) => {
      const px = X(e.x), py = Y(e.t);
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * 4, py + Math.sin(a) * 4);
        ctx.lineTo(px + Math.cos(a) * 10, py + Math.sin(a) * 10);
        ctx.stroke();
      }
      ctx.restore();
      dot(ctx, px, py, 3, col);
      label(ctx, name, px + (name === 'A' ? 8 : -8), py - 8, col,
        { size: 12, weight: 700, align: name === 'A' ? 'left' : 'right' });
    };

    /* 光线：A 向 −x 走，B 向 +x 走（斜率为 1 的光锥线） */
    const rayA = (t) => HALF - t;          /* x = 1 − ct */
    const rayB = (t) => -HALF + (t - off); /* x = −1 + (ct − off) */
    const tA = clamp(now, 0, CT_MAX);
    const tB = clamp(now, Math.max(0, off), CT_MAX);
    if (now > 0) polyline(ctx, [[X(rayA(0)), Y(0)], [X(rayA(tA)), Y(tA)]], C.accent, 1.6);
    if (now > off) polyline(ctx, [[X(rayB(off)), Y(off)], [X(rayB(tB)), Y(tB)]], C.named('blue'), 1.6);

    mark(evA(), 'A', C.bad);
    mark(evB(), 'B', C.named('blue'));

    /* 两个观察者收到光的时刻 */
    const tPlat = HALF;                        /* x=0 收到 A 光；B 光同刻当且仅当 off=0 */
    const tTrainA = HALF / (1 + beta);         /* βct = 1 − ct */
    const tTrainB = (HALF + off) / (1 - beta); /* βct = −1 + ct − off */
    const arrive = (t, x, col, txt) => {
      if (t < 0 || t > CT_MAX) return;
      const px = X(x), py = Y(t);
      dot(ctx, px, py, 4, col, C.bg);
      label(ctx, txt, px + 6, py + (col === C.bad ? -5 : 13), col, { size: 10 });
    };
    arrive(tPlat, 0, C.fg, `站台收到 A、B：ct = ${fmt(tPlat, 2)}`);
    arrive(tTrainA, beta * tTrainA, C.bad, `车先收到 A：ct = ${fmt(tTrainA, 2)}`);
    arrive(tTrainB, beta * tTrainB, C.named('blue'), `车后收到 B：ct = ${fmt(tTrainB, 2)}`);

    /* B 击的拖动提示与水平参考线 */
    const bPt = evB();
    ctx.strokeStyle = C.named('blue');
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(geo.x0, Y(bPt.t));
    ctx.lineTo(X(bPt.x), Y(bPt.t));
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '↕ 拖我', X(bPt.x) - 10, Y(bPt.t) + 4, C.named('blue'), { size: 10, align: 'right' });

    if (hover) {
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hover.px, hover.py, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    label(ctx, '列车长 2 光秒；两条 45° 线就是光信号（c = 1 光秒/秒）',
      geo.x0, geo.y0 + geo.ph + 26, C.axis, { size: 11 });

    /* ---- 读数 ---- */
    const dtp = dtPrime();
    ro.set('速度', `β = ${fmt(beta, 2)}，γ = ${fmt(gamma(), 3)}`);
    ro.set('站台系', `两击 Δt = ${fmt(-off, 2)} 光秒（0 = 同时）`);
    ro.set('列车系', `Δt′ = γ(Δt − βΔx) = ${fmt(dtp, 3)} 光秒`);
    ro.set('谁先', Math.abs(dtp) < 1e-9 ? '两击同时（此时 t_B = −2β = ' + fmt(-2 * beta, 2) + ' 光秒）'
      : dtp < 0 ? '车头 A 先发生' : '车尾 B 先发生');
    ro.set('光标', hover ? `x = ${fmt(invX(hover.px), 2)}，ct = ${fmt(invY(hover.py), 2)} 光秒` : '—');
  }

  const sl = buildSliders({
    sliders: [
      pickSlider(spec, 'beta', { name: 'beta', label: '列车速度 β', min: 0, max: 0.95, step: 0.01, value: beta }),
      pickSlider(spec, 'offset', { name: 'offset', label: 'B 击时间偏移', min: -1, max: 1, step: 0.05, value: off }),
    ],
  }, (st) => {
    beta = clamp(st.beta ?? beta, 0, 0.95);
    off = clamp(st.offset ?? off, -1, 1);
    now = CT_MAX;
    draw();
  });
  /* 画布上拖 B 击时，把滑块的把手与状态一起挪过去，避免下一次拖滑块把 off 弹回旧值 */
  const offsetInput = sl.box.querySelectorAll('input')[1];

  bindPointer(cv.canvas, {
    pick(x, y) {
      const near = Math.hypot(x - X(evB().x), y - Y(evB().t)) < 26;
      const inPlot = x >= geo.x0 && x <= geo.x0 + geo.pw && y >= geo.y0 && y <= geo.y0 + geo.ph;
      return near || inPlot ? 'B' : null;
    },
    move(id, x, y) {
      off = clamp(invY(y), -1, 1);
      sl.state.offset = off;
      if (offsetInput) offsetInput.value = String(Math.round(off * 20) / 20);
      now = CT_MAX;
      draw();
    },
    hover(x, y) { hover = { px: x, py: y }; draw(); },
    leave() { hover = null; draw(); },
  });

  cv.canvas.style.cursor = 'ns-resize';

  let controls = null;
  controls = anim(host, {
    onTick(dt) {
      now += dt * 1.6;
      if (now >= CT_MAX) { now = CT_MAX; controls.stop(); }
      draw();
    },
    onReset() { now = 0; draw(); },
  });

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box, destroy() { controls.stop(); } };
}

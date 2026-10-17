/* =========================================================================
 * lab 组件：taylor-ladder —— 可搬家的泰勒展开 + 逐阶导数阶梯（级数 30 课）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "taylor-ladder", "fn": "sin",
 *     "title": "把展开点搬离 0：每搬一次，贴合范围跟着走", "a": 0, "n": 4 }
 *   ```
 *
 * 字段：fn = sin / cos / exp / ln（ln 是 ln(1+x)）；a 展开中心；n 项数
 *       （0..10）；x 探针位置。都同名覆盖滑块初值。
 *
 * 能拖什么：
 *   ① 画布上直接拖「展开中心」竖轴上的方块（等价于拖 a 滑块）；
 *   ② 拖探针圆点，读出该处误差；
 *   ③ 「逐阶展开」按钮让 n 从 0 一格一格长上去（reduced-motion 下禁用）。
 *
 * 看什么：
 *   蓝线是真函数、橙线是泰勒多项式 Pₙ，红色误差带夹在两者之间；
 *   右侧「导数阶梯」逐阶对账 P⁽ᵏ⁾(a) = f⁽ᵏ⁾(a)（k = 0 值、k = 1 斜率、
 *   k = 2 弯曲……），刚补上的那一阶高亮，n+1 阶的缺口留给下一项；
 *   对 ln(1+x) 还会画出收敛半径的边界——越过它，加多少项都在飞。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented, buildReadout,
  anim, label, polyline, fmt, clamp, setSliderRow, mergeSpec, clearBg,
} from '../core.js';

const FACT = (() => {
  const f = [1];
  for (let i = 1; i <= 13; i += 1) f[i] = f[i - 1] * i;
  return f;
})();

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (k) => String(k).split('').map((d) => SUP[Number(d)]).join('');

/* 四个配方：d(a, k) 直接给"在 a 处的第 k 阶导数"（解析式预处理，不必数值微分） */
const FNS = {
  sin: {
    label: 'sin x',
    f: (x) => Math.sin(x),
    d: (a, k) => Math.sin(a + (k * Math.PI) / 2),
    view: [-7, 7],
    aMin: -3,
    aMax: 3,
    aDef: 0,
  },
  cos: {
    label: 'cos x',
    f: (x) => Math.cos(x),
    d: (a, k) => Math.cos(a + (k * Math.PI) / 2),
    view: [-7, 7],
    aMin: -3,
    aMax: 3,
    aDef: 0,
  },
  exp: {
    label: 'e^x',
    f: (x) => Math.exp(x),
    d: (a) => Math.exp(a),
    view: [-2.5, 2.5],
    aMin: -1.5,
    aMax: 1.5,
    aDef: 0,
  },
  ln: {
    label: 'ln(1+x)',
    f: (x) => Math.log1p(x),
    d: (a, k) => (k === 0
      ? Math.log1p(a)
      : ((k % 2 === 1 ? 1 : -1) * FACT[k - 1]) / (1 + a) ** k),
    view: [-0.92, 4.2],
    aMin: -0.8,
    aMax: 2,
    aDef: 0,
    /* 收敛半径 = 展开点到奇点 x = −1 的距离 */
    radius: (a) => 1 + a,
  },
};

function polyEval(F, a, n, x) {
  let s = 0;
  for (let k = n; k >= 0; k -= 1) s = s * (x - a) + F.d(a, k) / FACT[k];
  return s;
}

function niceStep(span) {
  const raw = span / 5;
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const m = raw / mag;
  const mult = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return mult * mag;
}

export default function render(host, spec) {
  let fnKey = FNS[spec.fn] ? spec.fn : 'sin';
  const cv = setupCanvas(host, 440);
  cv.canvas.style.touchAction = 'none';
  cv.canvas.style.cursor = 'grab';

  let sl = null;
  const geo = { x0: 0, y0: 0, w: 0, h: 0, lx: 0, ly: 0, lw: 0, lh: 0, wide: true };

  function setSliderRange(i, min, max, value, digits, name) {
    const row = sl.box.children[i];
    if (!row) return;
    const input = row.children[1];
    const val = row.children[2];
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    if (val) val.textContent = fmt(value, digits);
    sl.state[name] = value;
  }

  /* ---------- 导数阶梯：逐阶对账 ---------- */

  function drawLadder(ctx, C, F, a, n) {
    const px = geo.lx;
    const py = geo.ly;
    const pw = geo.lw;
    const ph = geo.lh;
    const wide = geo.wide;
    const maxK = Math.min(n + 1, 9);
    const rowH = Math.min((ph - 22) / Math.max(maxK + 1, 1), wide ? 27 : 17.5);
    let maxAbs = 0;
    for (let k = 0; k <= maxK; k += 1) maxAbs = Math.max(maxAbs, Math.abs(F.d(a, k)));

    label(ctx, '导数阶梯：每搬高一级，两边必须仍相等', px, py - 8, C.fg, { size: 11.5, weight: 600 });
    for (let k = 0; k <= maxK; k += 1) {
      const y = py + 6 + k * rowH;
      const aligned = k <= n;
      const v = F.d(a, k);
      if (k === n) {
        ctx.save();
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.12;
        ctx.fillRect(px - 4, y, pw + 8, rowH - 2);
        ctx.restore();
      }
      /* 幅度条：|f⁽ᵏ⁾(a)| 的相对大小（n! 分母正是来收拾它的） */
      const frac = maxAbs > 1e-12 ? Math.abs(v) / maxAbs : 0;
      ctx.save();
      ctx.fillStyle = aligned ? C.named('green') : C.named('orange');
      ctx.globalAlpha = 0.5;
      ctx.fillRect(px, y + rowH - 6, Math.max(pw * 0.42 * frac, 1), 2.5);
      ctx.restore();
      const tag = k === 0 ? '值' : k === 1 ? '斜率' : k === 2 ? '弯曲' : '第 ' + k + ' 阶';
      label(ctx, 'k=' + k + ' ' + tag, px, y + rowH - 10, C.axis, { size: wide ? 11 : 9.5 });
      const txt = aligned
        ? 'f⁽' + sup(k) + '⁾ = ' + fmt(v, 3) + '　P⁽' + sup(k) + '⁾ = ' + fmt(v, 3) + '　✓'
        : 'f⁽' + sup(k) + '⁾ = ' + fmt(v, 3) + '　P⁽' + sup(k) + '⁾ = 0　←下一项补它';
      label(ctx, txt, px + (wide ? 62 : 52), y + rowH - 10,
        aligned ? C.named('green') : C.named('orange'),
        { size: wide ? 11 : 9.5, weight: aligned ? 500 : 600 });
    }
    if (n + 1 > maxK) {
      label(ctx, '（更高阶略：阶梯越往上，两边照旧逐阶相等）', px, py + 6 + (maxK + 1) * rowH,
        C.axis, { size: wide ? 10.5 : 9.5 });
    }
  }

  /* ---------- 主绘制 ---------- */

  function draw() {
    if (!sl) return;
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const F = FNS[fnKey];
    const a = sl.state.a;
    const n = Math.round(clamp(sl.state.n, 0, 10));
    const xp = clamp(sl.state.x, F.view[0], F.view[1]);
    const [vx0, vx1] = F.view;

    geo.wide = W >= 640;
    if (geo.wide) {
      geo.x0 = 12;
      geo.y0 = 44;
      geo.w = Math.round(W * 0.55);
      geo.h = H - 100;
      geo.lx = geo.x0 + geo.w + 18;
      geo.ly = geo.y0 + 10;
      geo.lw = W - geo.lx - 12;
      geo.lh = H - geo.ly - 34;
    } else {
      geo.x0 = 10;
      geo.y0 = 40;
      geo.w = W - 20;
      geo.h = Math.round((H - 108) * 0.52);
      geo.lx = 10;
      geo.ly = geo.y0 + geo.h + 30;
      geo.lw = W - 20;
      geo.lh = H - geo.ly - 12;
    }

    /* 采样：真值、多项式、误差 */
    const NS = 240;
    const fPts = [];
    const pPts = [];
    let ymin = Infinity;
    let ymax = -Infinity;
    let maxErr = 0;
    let maxErrX = vx0;
    let pFly = false;
    for (let i = 0; i <= NS; i += 1) {
      const xx = vx0 + ((vx1 - vx0) * i) / NS;
      const vf = F.f(xx);
      const vp = polyEval(F, a, n, xx);
      fPts.push([xx, vf]);
      pPts.push([xx, vp]);
      if (isFinite(vf)) {
        ymin = Math.min(ymin, vf);
        ymax = Math.max(ymax, vf);
      }
      if (isFinite(vp) && Math.abs(vp) < 1e4) {
        const err = Math.abs(vp - vf);
        if (err > maxErr) {
          maxErr = err;
          maxErrX = xx;
        }
      } else {
        pFly = true;
      }
    }
    let span = Math.max(ymax - ymin, 1e-6);
    ymin -= span * 0.14;
    ymax += span * 0.14;
    span = ymax - ymin;
    const sx = (v) => geo.x0 + ((v - vx0) / (vx1 - vx0)) * geo.w;
    const sy = (v) => geo.y0 + geo.h - ((v - ymin) / span) * geo.h;
    const clampY = (v) => clamp(v, ymin - span * 0.3, ymax + span * 0.3);

    /* 图例与标题 */
    label(ctx, '蓝 = ' + F.label + '　橙 = 泰勒多项式 P' + sup(n) + '　红带 = 误差', geo.x0, 20,
      C.fg, { size: 12, weight: 600 });

    /* 绘图区 */
    ctx.save();
    ctx.beginPath();
    ctx.rect(geo.x0, geo.y0, geo.w, geo.h);
    ctx.clip();

    /* ln(1+x)：收敛半径之外涂灰——"加多少项都在飞"的边界 */
    if (F.radius) {
      const R = F.radius(a);
      const xr = a + R;
      const xl = a - R;
      if (xr < vx1) {
        ctx.save();
        ctx.fillStyle = C.axis;
        ctx.globalAlpha = 0.07;
        ctx.fillRect(sx(xr), geo.y0, geo.x0 + geo.w - sx(xr), geo.h);
        ctx.restore();
        polyline(ctx, [[sx(xr), geo.y0], [sx(xr), geo.y0 + geo.h]], C.named('red'), 1.4, [6, 4]);
        label(ctx, '收敛半径边界 x = ' + fmt(xr, 2), sx(xr) + 4, geo.y0 + 14, C.named('red'),
          { size: 10.5 });
      }
      if (xl > vx0 && xl > -1) {
        polyline(ctx, [[sx(xl), geo.y0], [sx(xl), geo.y0 + geo.h]], C.named('red'), 1.2, [6, 4]);
      }
    }

    /* 网格 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const stepX = niceStep(vx1 - vx0);
    for (let xv = Math.ceil(vx0 / stepX) * stepX; xv <= vx1; xv += stepX) {
      ctx.moveTo(sx(xv), geo.y0);
      ctx.lineTo(sx(xv), geo.y0 + geo.h);
    }
    const stepY = niceStep(span);
    for (let yv = Math.ceil(ymin / stepY) * stepY; yv <= ymax; yv += stepY) {
      ctx.moveTo(geo.x0, sy(yv));
      ctx.lineTo(geo.x0 + geo.w, sy(yv));
    }
    ctx.stroke();
    ctx.restore();
    if (0 >= ymin && 0 <= ymax) {
      polyline(ctx, [[geo.x0, sy(0)], [geo.x0 + geo.w, sy(0)]], C.axis, 1.2);
      for (let xv = Math.ceil(vx0 / stepX) * stepX; xv <= vx1; xv += stepX) {
        label(ctx, fmt(xv, 2), sx(xv), sy(0) + 14, C.axis, { size: 9.5, align: 'center' });
      }
    }

    /* 误差带：真值与多项式之间 */
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    fPts.forEach(([xx, vf], i) => {
      if (i === 0) ctx.moveTo(sx(xx), sy(vf));
      else ctx.lineTo(sx(xx), sy(vf));
    });
    for (let i = pPts.length - 1; i >= 0; i -= 1) {
      const [xx, vp] = pPts[i];
      ctx.lineTo(sx(xx), sy(clampY(vp)));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    polyline(ctx, fPts.map(([xx, vv]) => [sx(xx), sy(vv)]), C.accent, 2.4);
    polyline(ctx, pPts.map(([xx, vv]) => [sx(xx), sy(clampY(vv))]), C.accent2, 2);

    /* 展开中心：竖轴 + 方块把手（可直接拖） */
    polyline(ctx, [[sx(a), geo.y0], [sx(a), geo.y0 + geo.h]], C.named('purple'), 1.6, [5, 4]);
    ctx.save();
    ctx.fillStyle = C.named('purple');
    ctx.fillRect(sx(a) - 5, geo.y0 + 2, 10, 10);
    ctx.restore();
    label(ctx, '展开中心 a = ' + fmt(a, 2) + '（拖我）', sx(a) + 8, geo.y0 + 12,
      C.named('purple'), { size: 11, weight: 600 });

    /* 探针：读出该处误差 */
    const vf = F.f(xp);
    const vp = polyEval(F, a, n, xp);
    polyline(ctx, [[sx(xp), geo.y0], [sx(xp), geo.y0 + geo.h]], C.axis, 1, [3, 3]);
    ctx.save();
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(sx(xp), sy(vf), 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(sx(xp), sy(clampY(vp)), 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.stroke();
    ctx.restore();
    label(ctx, '探针 x = ' + fmt(xp, 2) + '（拖我）', sx(xp) + 6, geo.y0 + geo.h - 8,
      C.named('red'), { size: 10.5 });
    if (pFly) {
      label(ctx, 'P' + sup(n) + ' 已经飞出画面——收敛域外边，加项只是飞得更高', geo.x0 + 8,
        geo.y0 + geo.h - 8, C.bad, { size: 10.5, weight: 600 });
    }
    ctx.restore();

    /* 导数阶梯 */
    drawLadder(ctx, C, F, a, n);

    /* 读数条 */
    const err = Math.abs(vp - vf);
    ro.set('探针', 'x = ' + fmt(xp, 2) + '：f = ' + fmt(vf, 4) + '，P = ' + fmt(vp, 4)
      + '，|差| = ' + fmt(err, 4));
    ro.set('视窗最大误差', fmt(maxErr, 4) + '（在 x = ' + fmt(maxErrX, 2) + ' 附近）');
    ro.set('收敛半径', F.radius
      ? 'R = ' + fmt(F.radius(a), 2) + '（a 到奇点 x = −1 的距离；越过边界必飞）'
      : 'R = ∞（整函数，到处收敛）');
    ro.set('阶梯', 'k = 0…' + n + ' 全对齐；下一阶缺口 f⁽' + sup(n + 1) + '⁾(a) = '
      + fmt(F.d(a, n + 1), 3) + ' 留给第 ' + (n + 1) + ' 项');
  }

  /* ---------- 控件 ---------- */

  const seg = buildSegmented(
    Object.keys(FNS).map((k) => ({ value: k, label: FNS[k].label })),
    fnKey,
    (v) => {
      fnKey = FNS[v] ? v : 'sin';
      const F = FNS[fnKey];
      const a0 = clamp(sl.state.a >= F.aMin && sl.state.a <= F.aMax ? sl.state.a : F.aDef,
        F.aMin, F.aMax);
      setSliderRange(0, F.aMin, F.aMax, a0, 2, 'a');
      setSliderRange(1, 0, 10, 4, 0, 'n');
      setSliderRange(2, F.view[0], F.view[1], clamp(sl.state.x, F.view[0], F.view[1]), 2, 'x');
      draw();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ 探针: '—', 视窗最大误差: '—', 收敛半径: '—', 阶梯: '—' });
  host.appendChild(ro.box);

  const BASE = [
    { name: 'a', label: '展开中心 a', min: FNS.sin.aMin, max: FNS.sin.aMax, step: 0.05, value: 0 },
    { name: 'n', label: '项数 n', min: 0, max: 10, step: 1, value: 4 },
    { name: 'x', label: '探针 x', min: -7, max: 7, step: 0.05, value: 3.2 },
  ];
  sl = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => draw());
  /* 课文给了 fn 时按该配方的量程初始化（默认 sin 的量程在上面） */
  if (fnKey !== 'sin') {
    const F = FNS[fnKey];
    setSliderRange(0, F.aMin, F.aMax, clamp(sl.state.a, F.aMin, F.aMax), 2, 'a');
    setSliderRange(2, F.view[0], F.view[1], clamp(sl.state.x, F.view[0], F.view[1]), 2, 'x');
  }

  /* 逐阶展开：n 一格一格长上去 */
  let acc = 0;
  const ap = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.85) return;
      acc = 0;
      const next = Math.min(Math.round(sl.state.n) + 1, 10);
      setSliderRow(sl, 1, next, 0, 'n');
      draw();
      if (next >= 10) ap.stop();
    },
    onReset() {
      acc = 0;
      setSliderRow(sl, 1, 0, 0, 'n');
      draw();
    },
  });

  /* ---------- 指针：拖展开中心 / 拖探针 ---------- */

  const iX = (px) => FNS[fnKey].view[0]
    + ((px - geo.x0) / Math.max(geo.w, 1)) * (FNS[fnKey].view[1] - FNS[fnKey].view[0]);

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (y < geo.y0 - 10 || y > geo.y0 + geo.h + 10) return null;
      const F = FNS[fnKey];
      const toPx = (v) => geo.x0 + ((v - F.view[0]) / (F.view[1] - F.view[0])) * geo.w;
      const da = Math.abs(x - toPx(sl.state.a));
      const dxp = Math.abs(x - toPx(sl.state.x));
      /* 绘图区内"就近抓"：离谁近抓谁（本组件没有平移画布的手势，不会打架） */
      return dxp <= da ? 'x' : 'a';
    },
    down() {
      ap.stop();
      cv.canvas.style.cursor = 'grabbing';
    },
    move(id, x) {
      const F = FNS[fnKey];
      const v = clamp(iX(x), F.view[0], F.view[1]);
      if (id === 'a') {
        const av = clamp(Math.round(v / 0.05) * 0.05, F.aMin, F.aMax);
        setSliderRow(sl, 0, av, 2, 'a');
      } else {
        setSliderRow(sl, 2, Math.round(v / 0.05) * 0.05, 2, 'x');
      }
      draw();
    },
    up() {
      cv.canvas.style.cursor = 'grab';
    },
  });

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sl.box,
    destroy() {
      ap.stop();
      cv.redraw = null;
    },
  };
}

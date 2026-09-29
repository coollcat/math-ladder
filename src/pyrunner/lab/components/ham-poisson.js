/* =========================================================================
 * lab 组件：ham-poisson —— 拖参数看 {f, H} 到底是不是零
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "ham-poisson",
 *     "title": "拖这几个系数：什么时候 {f, H} 恒等于零",
 *     "k": 1, "a": 0, "b": 0, "c": 1
 *   }
 *   ```
 *
 * 模型：H(q, p) = p²/2 + ½kq²，f(q, p) = aq + bp + c(q² + p²)/2。
 *
 * 字段：k（0.1..2，默认 1）、a、b（−1..1，默认 0）、c（−1..2，默认 1）、q0、p0（初始条件）
 *
 * 能拖什么：
 *   **在左图里拖动** = 换初始条件（红叉）；四个滑块改系数；
 *   工具条上的「取 f = H」一键把 (k, a, b, c) 调成 (1, 0, 0, 1)——此时 f 就是 H。
 *
 * 看什么：
 *   左图：灰椭圆是 H 的等高线（能量壳层），橙线是真正的轨道，
 *   绿虚线是**过初始点的 f 等高线**。两条线重合 ⟺ f 沿轨道不变。
 *   右图：f(t) 随时间画出来，纵轴放大了：**拉成一条直线就是守恒**。
 *   下面的读数给出 {f, H} 在相平面上的最大绝对值：
 *   只要 a 或 b 不为零、或者 k ≠ 1 且 c ≠ 0，这个数就咬住 0 不松口。
 *   注意 k = 1 时 f = c(q²+p²)/2 = cH —— 和 H 只差常数倍的函数自动守恒，
 *   这是"守恒量不唯一"的最简例子。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, buildToolbar, mkBtn, bindPointer,
  polyline, label, fmt, clamp,
} from '../core.js';

const QMAX = 2.4;
const PMAX = 2.0;
const NSTEP = 1600;
const TSPAN = 22;

function hOf(k, q, p) { return 0.5 * p * p + 0.5 * k * q * q; }

function fOf(a, b, c, q, p) { return a * q + b * p + 0.5 * c * (q * q + p * p); }

/* 泊松括号，严格照定义用中心差分算：
   {f, g} = (∂f/∂q)(∂g/∂p) − (∂f/∂p)(∂g/∂q) */
function bracket(fn, gn, q, p, eps) {
  const h = eps || 1e-5;
  const dqF = (fn(q + h, p) - fn(q - h, p)) / (2 * h);
  const dpF = (fn(q, p + h) - fn(q, p - h)) / (2 * h);
  const dqG = (gn(q + h, p) - gn(q - h, p)) / (2 * h);
  const dpG = (gn(q, p + h) - gn(q, p - h)) / (2 * h);
  return dqF * dpG - dpF * dqG;
}

function rk4(k, q, p, h) {
  const dq = (pp) => pp;
  const dp = (qq) => -k * qq;
  const k1q = dq(p);
  const k1p = dp(q);
  const k2q = dq(p + 0.5 * h * k1p);
  const k2p = dp(q + 0.5 * h * k1q);
  const k3q = dq(p + 0.5 * h * k2p);
  const k3p = dp(q + 0.5 * h * k2q);
  const k4q = dq(p + h * k3p);
  const k4p = dp(q + h * k3q);
  return [
    q + (h / 6) * (k1q + 2 * k2q + 2 * k3q + k4q),
    p + (h / 6) * (k1p + 2 * k2p + 2 * k3p + k4p),
  ];
}

function mergeSpec(base, spec) {
  const given = Array.isArray(spec && spec.sliders) ? spec.sliders : [];
  return base.map((d) => {
    const top = spec && typeof spec[d.name] === 'number' ? spec[d.name] : d.value;
    const o = given.find((gg) => gg && gg.name === d.name) || {};
    const item = Object.assign({}, d, { value: top }, o, { name: d.name });
    item.value = clamp(item.value, item.min, item.max);
    return item;
  });
}

export default function render(host, spec) {
  let q0 = clamp(typeof spec.q0 === 'number' ? spec.q0 : 1.4, -QMAX, QMAX);
  let p0 = clamp(typeof spec.p0 === 'number' ? spec.p0 : 0.4, -PMAX, PMAX);

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({
    'H(q₀,p₀)': '—', 'f(q₀,p₀)': '—', '{f, H}': '—', '全平面 max|{f, H}|': '—', '轨道上 f 的波动': '—',
  });
  host.appendChild(ro.box);

  const g = { x0: 44, y0: 22, w: 0, h: 0, rx: 0, ry: 0, rw: 0, rh: 0 };
  let traj = null;
  let fs = null;
  let k = 1;
  let A = 0;
  let B = 0;
  let C = 1;

  const SX = (q) => g.x0 + ((q + QMAX) / (2 * QMAX)) * g.w;
  const SY = (p) => g.y0 + g.h - ((p + PMAX) / (2 * PMAX)) * g.h;

  function rebuild() {
    const h = TSPAN / NSTEP;
    traj = [];
    fs = [];
    let q = q0;
    let p = p0;
    for (let i = 0; i <= NSTEP; i += 1) {
      traj.push([q, p]);
      fs.push(fOf(A, B, C, q, p));
      const nx = rk4(k, q, p, h);
      q = nx[0];
      p = nx[1];
    }
  }

  const fFn = (q, p) => fOf(A, B, C, q, p);
  const hFn = (q, p) => hOf(k, q, p);

  function draw() {
    const C0 = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C0.bg;
    ctx.fillRect(0, 0, W, H);

    g.w = Math.round((W - g.x0 - 40) * 0.62);
    g.h = H - g.y0 - 42;
    g.rx = g.x0 + g.w + 32;
    g.rw = W - g.rx - 40;
    g.ry = g.y0 + 26;
    g.rh = g.h - 48;

    /* 能量壳层：H 的等高线（椭圆），给相图一个背景骨架 */
    const levels = 7;
    const emax = hOf(k, QMAX, PMAX);
    ctx.save();
    ctx.strokeStyle = C0.grid;
    ctx.lineWidth = 1;
    for (let i = 1; i <= levels; i += 1) {
      const E = (emax * i) / levels;
      const b = Math.sqrt(2 * E / k);
      const a = Math.sqrt(2 * E);
      ctx.beginPath();
      ctx.ellipse(SX(0), SY(0), (b / (2 * QMAX)) * g.w, (a / (2 * PMAX)) * g.h, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = C0.axis;
    ctx.beginPath();
    ctx.moveTo(SX(0) + 0.5, g.y0);
    ctx.lineTo(SX(0) + 0.5, g.y0 + g.h);
    ctx.moveTo(g.x0, SY(0) + 0.5);
    ctx.lineTo(g.x0 + g.w, SY(0) + 0.5);
    ctx.stroke();

    /* 过初始点的 f 等高线：曲线与轨道重合就说明 f 守恒 */
    const f0 = fOf(A, B, C, q0, p0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(g.x0, g.y0, g.w, g.h);
    ctx.clip();
    ctx.strokeStyle = C0.named('green');
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    if (Math.abs(C) > 1e-9) {
      const cq = -A / C;
      const cp = -B / C;
      const rr = 2 * f0 / C + (A * A + B * B) / (C * C);
      if (rr > 0) {
        const rad = Math.sqrt(rr);
        ctx.ellipse(SX(cq), SY(cp), (rad / (2 * QMAX)) * g.w, (rad / (2 * PMAX)) * g.h, 0, 0, Math.PI * 2);
      }
    } else if (Math.abs(A) + Math.abs(B) > 1e-9) {
      /* c = 0 时 f 是线性的，等高线就是直线 aq + bp = f0 */
      const p1 = [(-QMAX), (f0 - A * (-QMAX)) / B];
      const p2 = [(QMAX), (f0 - A * QMAX) / B];
      if (Math.abs(B) > 1e-9) {
        ctx.moveTo(SX(p1[0]), SY(p1[1]));
        ctx.lineTo(SX(p2[0]), SY(p2[1]));
      } else {
        ctx.moveTo(SX(f0 / A), g.y0);
        ctx.lineTo(SX(f0 / A), g.y0 + g.h);
      }
    }
    ctx.stroke();
    ctx.restore();

    /* 轨道 */
    const pts = traj.map(([q, p]) => [SX(q), SY(p)]);
    polyline(ctx, pts, C0.accent2, 2.2);

    ctx.fillStyle = C0.bad;
    ctx.strokeStyle = C0.bad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SX(q0) - 6, SY(p0));
    ctx.lineTo(SX(q0) + 6, SY(p0));
    ctx.moveTo(SX(q0), SY(p0) - 6);
    ctx.lineTo(SX(q0), SY(p0) + 6);
    ctx.stroke();
    label(ctx, '位置 q', g.x0 + g.w - 44, SY(0) + 15, C0.fg, { size: 11 });
    label(ctx, '动量 p', SX(0) + 6, g.y0 + 12, C0.fg, { size: 11 });
    label(ctx, `H = p²/2 + ½·${fmt(k, 2)}q²`, g.x0, g.y0 - 8, C0.accent, { size: 12, weight: 600 });
    label(ctx, `f = ${fmt(A, 2)}q + ${fmt(B, 2)}p + ${fmt(C, 2)}(q²+p²)/2`, g.x0 + 150, g.y0 - 8,
      C0.named('green'), { size: 12, weight: 600 });

    /* 右图：f(t)，纵轴按轨道上的实际幅度放大 —— 平就是守恒 */
    const fmin = Math.min(...fs);
    const fmax = Math.max(...fs);
    const span = Math.max(fmax - fmin, Math.abs(f0) * 0.12, 0.08);
    const mid = 0.5 * (fmin + fmax);
    const lo = mid - span * 0.9;
    const hi = mid + span * 0.9;
    ctx.strokeStyle = C0.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.rx, g.ry + g.rh);
    ctx.lineTo(g.rx + g.rw, g.ry + g.rh);
    ctx.moveTo(g.rx + 0.5, g.ry);
    ctx.lineTo(g.rx + 0.5, g.ry + g.rh);
    ctx.stroke();
    const yOf = (v) => g.ry + g.rh - ((v - lo) / (hi - lo)) * g.rh;
    polyline(ctx, fs.map((v, i) => [g.rx + (i / NSTEP) * g.rw, yOf(v)]), C0.named('green'), 2.2);
    if (Math.abs(C) > 1e-9 || A !== 0 || B !== 0) {
      /* 叠一条 H(t) 作对照，用**它自己的**纵轴：真守恒量在这条轴上永远是水平线 */
      const hs = traj.map(([q, p]) => hOf(k, q, p));
      const hlo0 = Math.min(...hs);
      const hhi0 = Math.max(...hs);
      const hpad = Math.max(hhi0 - hlo0, Math.abs(hlo0) * 0.12, 0.08) * 0.9;
      const hy = (v) => g.ry + g.rh - ((v - (hlo0 - hpad)) / ((hhi0 + hpad) - (hlo0 - hpad))) * g.rh;
      polyline(ctx, hs.map((v, i) => [g.rx + (i / NSTEP) * g.rw, hy(v)]), C0.axis, 1.4, [5, 4]);
    }
    label(ctx, 'f(t)：纵轴已放大', g.rx - 6, g.ry - 10, C0.named('green'), { size: 11, weight: 600 });
    label(ctx, `f 纵轴 ${fmt(lo, 2)} … ${fmt(hi, 2)}`, g.rx - 6, g.ry + g.rh + 15, C0.axis, { size: 11 });
    label(ctx, '（灰虚线是 H(t) 按自己的纵轴画：永恒的水平线）', g.rx - 6, g.ry + g.rh + 29, C0.axis, { size: 11 });

    /* 全平面上的 {f, H} 最大值：判定 f 是否"恒为守恒量" */
    let worst = 0;
    for (let i = 0; i <= 24; i += 1) {
      for (let j = 0; j <= 24; j += 1) {
        const q = -QMAX + (2 * QMAX * i) / 24;
        const p = -PMAX + (2 * PMAX * j) / 24;
        worst = Math.max(worst, Math.abs(bracket(fFn, hFn, q, p)));
      }
    }
    const bNow = bracket(fFn, hFn, q0, p0);
    ro.set('H(q₀,p₀)', fmt(hOf(k, q0, p0), 4));
    ro.set('f(q₀,p₀)', fmt(f0, 4));
    ro.set('{f, H}', `${fmt(bNow, 4)}（此刻的 df/dt）`);
    ro.set('全平面 max|{f, H}|', worst < 1e-6 ? '0（f 是守恒量）' : fmt(worst, 4));
    ro.set('轨道上 f 的波动', `max − min = ${fmt(fmax - fmin, 4)}`);
  }

  const btn = mkBtn('取 f = H');
  btn.addEventListener('click', () => {
    k = 1; A = 0; B = 0; C = 1;
    setSlider(0, 1); setSlider(1, 0); setSlider(2, 0); setSlider(3, 1);
    rebuild();
    draw();
  });
  const bar = buildToolbar(btn);
  host.insertBefore(bar, ro.box);

  const sl = buildSliders(
    {
      sliders: mergeSpec([
        { name: 'k', label: 'H 的刚度 k', min: 0.1, max: 2, step: 0.05, value: 1, fmt: 2 },
        { name: 'a', label: 'f 的 a', min: -1, max: 1, step: 0.05, value: 0, fmt: 2 },
        { name: 'b', label: 'f 的 b', min: -1, max: 1, step: 0.05, value: 0, fmt: 2 },
        { name: 'c', label: 'f 的 c', min: -1, max: 2, step: 0.05, value: 1, fmt: 2 },
      ], spec),
    },
    (st) => {
      k = st.k; A = st.a; B = st.b; C = st.c;
      rebuild();
      draw();
    },
  );
  k = sl.state.k; A = sl.state.a; B = sl.state.b; C = sl.state.c;

  /* 工具条回写滑块（buildSliders 没给 setter，按声明顺序取行） */
  function setSlider(idx, value) {
    const row = sl.box.children[idx];
    if (!row) return;
    const input = row.querySelector('input');
    const val = row.querySelector('.ml-slider__val');
    if (input) input.value = String(value);
    if (val) val.textContent = fmt(value, 2);
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      return x >= g.x0 - 10 && x <= g.x0 + g.w + 10 && y >= g.y0 - 10 && y <= g.y0 + g.h + 10
        ? 'ic' : null;
    },
    down(id, x, y) { setIC(x, y); },
    move(id, x, y) { setIC(x, y); },
  });

  function setIC(x, y) {
    q0 = clamp(((x - g.x0) / g.w) * 2 * QMAX - QMAX, -QMAX, QMAX);
    p0 = clamp(PMAX - ((y - g.y0) / g.h) * 2 * PMAX, -PMAX, PMAX);
    rebuild();
    draw();
  }

  rebuild();
  draw();
  cv.redraw = draw;
  return { slidersBox: sl.box };
}

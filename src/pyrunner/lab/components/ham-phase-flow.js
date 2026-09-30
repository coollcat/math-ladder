/* =========================================================================
 * lab 组件：ham-phase-flow —— 相平面上的矢量场与轨道
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "ham-phase-flow",
 *     "title": "相平面上拖一个点：轨道就是哈密顿量的等高线",
 *     "system": "harmonic",
 *     "k": 1
 *   }
 *   ```
 *
 * 字段：
 *   system  "harmonic"（简谐振子）/ "pendulum"（单摆）/ "doublewell"（双井），默认 harmonic
 *   k       简谐振子的刚度 k，0.3..2，默认 1（只在 harmonic 下有效）
 *   a       双井的势垒系数 a，0.2..2，默认 1（只在 doublewell 下有效）
 *   q, p    初始条件，默认 (1.2, 0)
 *
 * 能拖什么：
 *   **画布里任意位置按下拖动** = 把初始条件挪到那里（红点），轨道立刻重算；
 *   三个按钮切换势场；两个滑块改势场形状；播放/重置控制那个沿轨道走的圆点。
 *
 * 看什么：
 *   灰箭头是矢量场 (q̇, ṗ) = (∂H/∂p, −∂H/∂q)：箭头只给方向，长度统一，
 *   否则远处箭头会糊成一片。
 *   淡淡的闭合曲线是不同初始能量的轨道 —— 它们**永远不相交**，
 *   因为过相平面每一点的能量值是唯一的（这就是"确定性"的几何说法）。
 *   单摆那两条上下分岔的线是**分界线**（能量恰好 = 1）：线内是来回摆，
 *   线外是绕着转的"旋转"轨道，两种命运被这一条线隔开。
 *   双井里两个"眼睛"是两处稳定平衡（q = ±1，p = 0），中间原点是鞍点。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, buildSegmented, bindPointer, polyline,
  label, fmt, clamp, anim, mergeSpec,
  clearBg,
} from '../core.js';

const QMAX = 3.4;      /* 相平面横轴半宽 */
const PMAX = 2.8;      /* 相平面纵轴半高 */
const TSPAN = 26;      /* 单条轨道演化多长时间 */
const NSTEP = 2600;    /* 采样步数 */
const SEED_N = 1200;   /* 背景参考轨道的步数 */
const SEEK = 260;      /* 动画速度：每秒走多少步 */

const SYSTEMS = [
  { value: 0, id: 'harmonic', label: '简谐振子' },
  { value: 1, id: 'pendulum', label: '单摆' },
  { value: 2, id: 'doublewell', label: '双井' },
];

/* 哈密顿矢量场 (dq/dt, dp/dt) = (∂H/∂p, −∂H/∂q) —— 正则方程的右侧 */
function field(sys, q, p, k, a) {
  if (sys === 1) return [p, -Math.sin(q)];            /* H = p²/2 − cos q */
  if (sys === 2) return [p, -a * q * (q * q - 1)];    /* H = p²/2 + ¼a(q²−1)² */
  return [p, -k * q];                                 /* H = p²/2 + ½kq² */
}

/* 能量（守恒量）：用来在读数里验证轨道确实钉在同一条等高线上 */
function energy(sys, q, p, k, a) {
  if (sys === 1) return 0.5 * p * p - Math.cos(q);
  if (sys === 2) {
    const w = q * q - 1;
    return 0.5 * p * p + 0.25 * a * w * w;
  }
  return 0.5 * p * p + 0.5 * k * q * q;
}

/* 四阶龙格–库塔：把相点沿矢量场推进一步 */
function rk4(sys, q, p, h, k, a) {
  const f1 = field(sys, q, p, k, a);
  const f2 = field(sys, q + 0.5 * h * f1[0], p + 0.5 * h * f1[1], k, a);
  const f3 = field(sys, q + 0.5 * h * f2[0], p + 0.5 * h * f2[1], k, a);
  const f4 = field(sys, q + h * f3[0], p + h * f3[1], k, a);
  return [
    q + (h / 6) * (f1[0] + 2 * f2[0] + 2 * f3[0] + f4[0]),
    p + (h / 6) * (f1[1] + 2 * f2[1] + 2 * f3[1] + f4[1]),
  ];
}

/* 从一点出发积出整条轨道 */
function orbit(sys, q0, p0, k, a, n) {
  const h = TSPAN / n;
  const qs = new Float64Array(n + 1);
  const ps = new Float64Array(n + 1);
  let q = q0;
  let p = p0;
  qs[0] = q;
  ps[0] = p;
  for (let i = 1; i <= n; i += 1) {
    const nx = rk4(sys, q, p, h, k, a);
    q = nx[0];
    p = nx[1];
    if (!isFinite(q) || !isFinite(p) || Math.abs(q) > 40 || Math.abs(p) > 40) {
      qs[i] = NaN; ps[i] = NaN;
      for (let j = i + 1; j <= n; j += 1) { qs[j] = NaN; ps[j] = NaN; }
      break;
    }
    qs[i] = q;
    ps[i] = p;
  }
  return { qs, ps, n };
}

export default function render(host, spec) {
  const sysOf = (name) => {
    const hit = SYSTEMS.find((s) => s.id === name);
    return hit ? hit.value : 0;
  };
  let sys = sysOf(spec.system);
  let q0 = clamp(typeof spec.q === 'number' ? spec.q : 1.2, -QMAX, QMAX);
  let p0 = clamp(typeof spec.p === 'number' ? spec.p : 0, -PMAX, PMAX);

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ 位置: '—', 动量: '—', 能量: '—', 已演化: '—', 闭合: '—' });
  host.appendChild(ro.box);

  const g = { x0: 46, y0: 20, w: 0, h: 0 };
  let orbitSel = null;
  let seeds = [];
  let idx = 0;

  const SX = (q) => g.x0 + ((q + QMAX) / (2 * QMAX)) * g.w;
  const SY = (p) => g.y0 + g.h - ((p + PMAX) / (2 * PMAX)) * g.h;

  function buildSeeds() {
    seeds = [];
    for (let i = 0; i < 5; i += 1) {
      for (let j = 0; j < 4; j += 1) {
        const q = -QMAX * 0.85 + (1.7 * QMAX * i) / 4;
        const p = -PMAX * 0.8 + (1.6 * PMAX * j) / 3;
        seeds.push(orbit(sys, q, p, k, a, SEED_N));
      }
    }
  }

  let k = 1;
  let a = 1;

  function rebuild() {
    orbitSel = orbit(sys, q0, p0, k, a, NSTEP);
    buildSeeds();
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    g.w = W - g.x0 - 40;
    g.h = H - g.y0 - 46;

    ctx.save();
    ctx.beginPath();
    ctx.rect(g.x0, g.y0, g.w, g.h);
    ctx.clip();

    /* 背景参考轨道：同一族的等高线，永不相交 */
    seeds.forEach((o) => {
      const pts = [];
      for (let i = 0; i <= o.n; i += 2) {
        if (!isFinite(o.qs[i])) break;
        pts.push([SX(o.qs[i]), SY(o.ps[i])]);
      }
      polyline(ctx, pts, C.grid, 1.2);
    });

    /* 矢量场：只给方向 */
    const nx = 15;
    const ny = 11;
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    for (let i = 0; i <= nx; i += 1) {
      for (let j = 0; j <= ny; j += 1) {
        const q = -QMAX + (2 * QMAX * i) / nx;
        const p = -PMAX + (2 * PMAX * j) / ny;
        const f = field(sys, q, p, k, a);
        const len = Math.hypot(f[0], f[1]) || 1;
        const ux = (f[0] / len) * 9;
        const uy = (f[1] / len) * 9;
        const x = SX(q);
        const y = SY(p);
        ctx.beginPath();
        ctx.moveTo(x - ux, y + uy);
        ctx.lineTo(x + ux, y - uy);
        ctx.stroke();
      }
    }
    ctx.restore();

    /* 当前选中的轨道：走过的部分实、剩下的虚 */
    if (orbitSel) {
      const all = [];
      const past = [];
      for (let i = 0; i <= orbitSel.n; i += 1) {
        if (!isFinite(orbitSel.qs[i])) break;
        const pt = [SX(orbitSel.qs[i]), SY(orbitSel.ps[i])];
        all.push(pt);
        if (i <= idx) past.push(pt);
      }
      polyline(ctx, all, C.accent, 1.6, [4, 4]);
      polyline(ctx, past, C.accent, 2.6);
      const i = Math.min(idx, orbitSel.n);
      if (isFinite(orbitSel.qs[i])) {
        ctx.fillStyle = C.accent2;
        ctx.beginPath();
        ctx.arc(SX(orbitSel.qs[i]), SY(orbitSel.ps[i]), 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    /* 坐标轴与初始点 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SX(0) + 0.5, g.y0);
    ctx.lineTo(SX(0) + 0.5, g.y0 + g.h);
    ctx.moveTo(g.x0, SY(0) + 0.5);
    ctx.lineTo(g.x0 + g.w, SY(0) + 0.5);
    ctx.stroke();
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SX(q0) - 6, SY(p0));
    ctx.lineTo(SX(q0) + 6, SY(p0));
    ctx.moveTo(SX(q0), SY(p0) - 6);
    ctx.lineTo(SX(q0), SY(p0) + 6);
    ctx.stroke();

    label(ctx, '位置 q', g.x0 + g.w - 44, SY(0) + 16, C.fg, { size: 11 });
    label(ctx, '动量 p', SX(0) + 6, g.y0 + 12, C.fg, { size: 11 });
    const sname = SYSTEMS[sys].label;
    label(ctx, `势场：${sname}${sys === 0 ? `（k = ${fmt(k, 2)}）` : sys === 2 ? `（a = ${fmt(a, 2)}）` : ''}`,
      g.x0, g.y0 - 6, C.accent, { size: 12, weight: 600 });
    label(ctx, '拖动画布任意处 = 换初始条件；灰箭头是 (∂H/∂p, −∂H/∂q)', g.x0, H - 6, C.axis, { size: 11 });

    const i = Math.min(idx, orbitSel ? orbitSel.n : 0);
    const cq = orbitSel && isFinite(orbitSel.qs[i]) ? orbitSel.qs[i] : q0;
    const cp = orbitSel && isFinite(orbitSel.ps[i]) ? orbitSel.ps[i] : p0;
    ro.set('位置', `q = ${fmt(cq, 3)}`);
    ro.set('动量', `p = ${fmt(cp, 3)}`);
    ro.set('能量', `H = ${fmt(energy(sys, cq, cp, k, a), 4)}（初始 ${fmt(energy(sys, q0, p0, k, a), 4)}）`);
    ro.set('已演化', `t = ${fmt((i / NSTEP) * TSPAN, 2)}`);
    ro.set('闭合', sys === 0 ? '椭圆轨道（周期 2π/√k）'
      : energy(sys, q0, p0, k, a) < 1 && sys === 1 ? '能量 < 1：来回摆'
        : sys === 1 ? '能量 > 1：绕圈转' : '看它落在哪个井里');
  }

  const loop = anim(host, {
    onTick(dt) {
      if (!orbitSel) return;
      idx += dt * SEEK;
      if (idx > orbitSel.n) idx = 0;
      draw();
    },
    onReset() { idx = 0; draw(); },
  });

  const sl = buildSliders(
    {
      sliders: mergeSpec([
        { name: 'k', label: '刚度 k', min: 0.3, max: 2, step: 0.05, value: 1, fmt: 2 },
        { name: 'a', label: '势垒 a', min: 0.2, max: 2, step: 0.05, value: 1, fmt: 2 },
      ], spec),
    },
    (st) => {
      k = st.k;
      a = st.a;
      rebuild();
      draw();
    },
  );
  k = sl.state.k;
  a = sl.state.a;

  const seg = buildSegmented(
    SYSTEMS.map((s) => ({ value: s.value, label: s.label })),
    sys,
    (v) => {
      sys = v;
      idx = 0;
      rebuild();
      draw();
    },
  );
  host.insertBefore(seg, ro.box);

  bindPointer(cv.canvas, {
    pick(x, y) {
      return x >= g.x0 - 12 && x <= g.x0 + g.w + 12 && y >= g.y0 - 12 && y <= g.y0 + g.h + 12
        ? 'ic' : null;
    },
    down(id, x, y) { setIC(x, y); },
    move(id, x, y) { setIC(x, y); },
  });

  function setIC(x, y) {
    q0 = clamp(((x - g.x0) / g.w) * 2 * QMAX - QMAX, -QMAX, QMAX);
    p0 = clamp(PMAX - ((y - g.y0) / g.h) * 2 * PMAX, -PMAX, PMAX);
    idx = 0;
    rebuild();
    draw();
  }

  rebuild();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() { loop.stop(); },
  };
}

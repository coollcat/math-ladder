/* 数字 PID：连续 PID 落到 MCU 上就变成「每隔 Ts 算一次」的差分式。
   这里能亲手撞上两个经典坑：积分饱和（执行机构顶到限幅，积分还在涨）
   和微分冲击（设定值一跳变，微分项炸出一个尖峰）。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  polyline, label, clamp, fmt,
} from '../core.js';

const TAU = 0.5;      // 对象时间常数 s
const K = 1;          // 对象增益
const T_WIN = 6;      // 一屏 6 秒
const H = 5e-4;       // 对象积分步长（固定，与帧率无关）

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    Kp: spec.Kp ?? 2,
    Ki: spec.Ki ?? 3,
    Kd: spec.Kd ?? 0.2,
    Ts: spec.Ts ?? 20,      // 控制周期 ms
    umax: spec.umax ?? 3,   // 执行机构限幅
    aw: spec.aw || 'off',   // 抗积分饱和
    dmode: spec.dmode || 'err',
  };
  const st = { t: 0, y: 0, I: 0, ePrev: 0, yPrev: 0, u: 0, P: 0, D: 0, acc: 0, hist: [], iMax: 0, uMax: 0 };
  const cv = setupCanvas(host, 350);
  const ro = buildReadout({
    超调量: '—', 调节时间: '—', 稳态误差: '—', 积分项: '—', 峰值控制量: '—', 状态: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '抗积分饱和：关', value: 'off' }, { label: '抗积分饱和：开', value: 'on' }],
    s.aw,
    (v) => { s.aw = v; resetSim(); },
  ));
  host.appendChild(buildSegmented(
    [{ label: '微分作用于偏差（有冲击）', value: 'err' }, { label: '微分作用于测量值', value: 'meas' }],
    s.dmode,
    (v) => { s.dmode = v; resetSim(); },
  ));

  const setpoint = (t) => (t < 0.4 ? 0 : 1);

  function control(Ts) {
    const r = setpoint(st.t);
    const e = r - st.y;
    st.P = s.Kp * e;
    /* 微分项：作用于偏差会在设定值跳变时炸尖峰；作用于测量值则不会 */
    st.D = s.dmode === 'err'
      ? (s.Kd * (e - st.ePrev)) / Ts
      : (-s.Kd * (st.y - st.yPrev)) / Ts;
    const iTry = st.I + s.Ki * Ts * e;
    const uTry = st.P + iTry + st.D;
    /* 条件积分抗饱和：只有在「已饱和且偏差继续往同方向推」时才停止积分 */
    const sat = Math.abs(uTry) > s.umax;
    const windup = sat && Math.sign(e) === Math.sign(uTry);
    if (!(s.aw === 'on' && windup)) st.I = iTry;
    st.u = clamp(uTry, -s.umax, s.umax);
    st.ePrev = e;
    st.yPrev = st.y;
    st.iMax = Math.max(st.iMax, Math.abs(st.I));
  }

  function simStep(h) {
    st.t += h;
    st.acc += h;
    const Ts = s.Ts / 1000;
    if (st.acc >= Ts) {
      st.acc -= Ts;
      control(Ts);
    }
    st.y += (h * (K * st.u - st.y)) / TAU;
    st.uMax = Math.max(st.uMax, Math.abs(st.u));
    const last = st.hist[st.hist.length - 1];
    if (!last || st.t - last[0] >= 0.01) st.hist.push([st.t, setpoint(st.t), st.y, st.u]);
    if (st.hist.length > 700) st.hist.shift();
  }

  function resetSim() {
    st.t = 0; st.y = 0; st.I = 0; st.ePrev = 0; st.yPrev = 0;
    st.u = 0; st.P = 0; st.D = 0; st.acc = 0; st.hist = [];
    st.iMax = 0; st.uMax = 0;
    draw();
  }

  function metrics() {
    let peak = 0;
    let lastOut = 0;
    st.hist.forEach(([t, r, y]) => {
      if (t < 0.4) return;
      if (y > peak) peak = y;
      if (Math.abs(y - r) > 0.02) lastOut = t;
    });
    return {
      overshoot: (peak - 1) * 100,
      settle: lastOut > 0.4 ? lastOut - 0.4 : 0,
      err: st.hist.length ? Math.abs(1 - st.hist[st.hist.length - 1][2]) : 0,
    };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    ctx.clearRect(0, 0, W, Hh);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, Hh);
    const gx = 40;
    const gw = W - gx - 14;
    const t0 = Math.max(0, st.t - T_WIN);
    const X = (t) => gx + ((t - t0) / T_WIN) * gw;

    /* ---- 上：设定值 / 输出 ---- */
    const h1 = 24;
    const h1h = 128;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(gx + 0.5, h1 + 0.5, gw, h1h);
    const Y1 = (v) => h1 + h1h - ((clamp(v, -0.4, 2.0) + 0.4) / 2.4) * h1h;
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(gx, Y1(0));
    ctx.lineTo(gx + gw, Y1(0));
    ctx.stroke();
    const sp = st.hist.map((p) => [X(p[0]), Y1(p[1])]);
    const pv = st.hist.map((p) => [X(p[0]), Y1(p[2])]);
    polyline(ctx, sp, C.accent2, 1.6, [4, 3]);
    polyline(ctx, pv, C.accent, 2.2);
    label(ctx, '设定值 r（虚线）/ 输出 y（实线）', gx, h1 - 6, C.fg, { size: 10 });
    label(ctx, '1.0', gx - 4, Y1(1) + 4, C.fg, { align: 'right', size: 9 });

    /* ---- 中：控制量 + 限幅带 ---- */
    const h2 = h1 + h1h + 28;
    const h2h = 92;
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(gx + 0.5, h2 + 0.5, gw, h2h);
    const Y2 = (v) => h2 + h2h / 2 - (clamp(v, -s.umax * 1.3, s.umax * 1.3) / (s.umax * 1.6)) * h2h;
    ctx.strokeStyle = C.bad;
    ctx.setLineDash([3, 3]);
    [1, -1].forEach((sg) => {
      ctx.beginPath();
      ctx.moveTo(gx, Y2(sg * s.umax));
      ctx.lineTo(gx + gw, Y2(sg * s.umax));
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(gx, Y2(0));
    ctx.lineTo(gx + gw, Y2(0));
    ctx.stroke();
    polyline(ctx, st.hist.map((p) => [X(p[0]), Y2(p[3])]), C.named('green'), 2);
    label(ctx, '控制量 u（红虚线=执行机构限幅 ±' + fmt(s.umax, 1) + '）', gx, h2 - 6, C.fg, { size: 10 });

    /* ---- 下：P / I / D 三项占比 ---- */
    const h3 = h2 + h2h + 26;
    const bars = [['P', st.P, C.accent], ['I', st.I, C.accent2], ['D', st.D, C.named('purple')]];
    const scale = Math.max(Math.abs(st.P), Math.abs(st.I), Math.abs(st.D), s.umax, 1);
    bars.forEach(([name, v, col], i) => {
      const y = h3 + i * 16;
      const half = gw / 2 - 40;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx + half, y);
      ctx.lineTo(gx + half, y + 10);
      ctx.stroke();
      const w = (Math.abs(v) / scale) * half;
      ctx.fillStyle = col;
      ctx.fillRect(v >= 0 ? gx + half : gx + half - w, y, Math.max(1, w), 10);
      label(ctx, name + ' = ' + fmt(v, 2), gx - 4, y + 9, col, { align: 'right', size: 10, weight: 600 });
    });
    label(ctx, 'PID 三项分解', gx, h3 - 6, C.fg, { size: 10 });

    const m = metrics();
    ro.set('超调量', fmt(Math.max(0, m.overshoot), 1) + ' %');
    ro.set('调节时间', m.settle > 0 ? fmt(m.settle, 2) + ' s（±2%）' : '已进入 ±2% 带');
    ro.set('稳态误差', fmt(m.err, 4));
    ro.set('积分项', fmt(st.I, 2) + '（峰值 ' + fmt(st.iMax, 2) + '）');
    ro.set('峰值控制量', fmt(st.uMax, 2) + ' / 限幅 ' + fmt(s.umax, 1));
    ro.set('状态', st.uMax >= s.umax - 1e-6
      ? (s.aw === 'on' ? '已触限幅（抗饱和生效）' : '⚠ 已触限幅，积分在往上顶')
      : '未触限幅');
  }

  const controls = anim(host, {
    onTick(dt) {
      const n = clamp(Math.round(dt / H), 1, 200);
      const hh = dt / n;
      for (let i = 0; i < n; i += 1) simStep(hh);
      if (st.t > T_WIN + 4) resetSim();
      draw();
    },
    onReset: resetSim,
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'Kp', label: 'Kp', min: 0, max: 10, step: 0.1, value: s.Kp, fmt: 1 },
        { name: 'Ki', label: 'Ki（1/s）', min: 0, max: 10, step: 0.1, value: s.Ki, fmt: 1 },
        { name: 'Kd', label: 'Kd（s）', min: 0, max: 2, step: 0.01, value: s.Kd, fmt: 2 },
        { name: 'Ts', label: '控制周期 Ts (ms)', min: 1, max: 200, step: 1, value: s.Ts, fmt: 0 },
        { name: 'umax', label: '执行机构限幅', min: 0.5, max: 10, step: 0.5, value: s.umax, fmt: 1 },
      ],
    },
    (v) => {
      s.Kp = v.Kp; s.Ki = v.Ki; s.Kd = v.Kd; s.Ts = v.Ts; s.umax = v.umax;
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}

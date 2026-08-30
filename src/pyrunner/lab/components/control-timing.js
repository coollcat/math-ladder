/* 采样率与控制周期：同一个对象、同一套 PID 参数，只是把控制周期从 1 ms 拖到 200 ms，
   系统就从平稳变成振荡再发散。零阶保持引入的相位滞后 ≈ ω·Ts/2 是罪魁祸首，
   工程上的经验法则是采样频率取闭环带宽的 10–20 倍。 */
import {
  themeColors, setupCanvas, anim, buildReadout, buildSliders, polyline, label, clamp, fmt,
} from '../core.js';

const H = 2e-4;        // 对象积分步长（固定）
const T_WIN = 4;       // 一屏 4 秒
const TS_REF = 0.001;  // 参照组：1 ms，近似连续控制

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    Ts: spec.Ts ?? 20,    // 控制周期 ms
    Kp: spec.Kp ?? 4,     // 比例增益
    tau: spec.tau ?? 0.2, // 对象时间常数 s
  };
  const mk = (Ts) => ({ t: 0, y: 0, u: 0, acc: 0, hist: [], Ts, peak: 0 });
  let A = mk(s.Ts / 1000);
  let B = mk(TS_REF);
  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    采样频率: '—', 离散极点: '—', 稳定性: '—', 临界周期: '—', 相位滞后: '—', 超调: '—',
  });
  host.appendChild(ro.box);

  function stepSim(sim, h) {
    sim.t += h;
    sim.acc += h;
    if (sim.acc >= sim.Ts) {
      sim.acc -= sim.Ts;
      sim.u = s.Kp * (1 - sim.y);      // 每个控制周期算一次，之后保持不变（零阶保持）
    }
    sim.y += (h * (sim.u - sim.y)) / s.tau;
    if (sim.y > sim.peak) sim.peak = sim.y;
    const last = sim.hist[sim.hist.length - 1];
    if (!last || sim.t - last[0] >= 0.005) sim.hist.push([sim.t, sim.y, sim.u]);
    if (sim.hist.length > 1400) sim.hist.shift();
  }

  function reset() {
    A = mk(s.Ts / 1000);
    B = mk(TS_REF);
    draw();
  }

  /* 零阶保持下的离散极点：y[k+1] = a·y[k] + b·u[k]，a = e^(−Ts/τ)，b = 1 − a */
  const poleOf = (Ts) => {
    const a = Math.exp(-Ts / s.tau);
    return a - (1 - a) * s.Kp;
  };
  /* p = −1 的临界周期：Ts_crit = τ·ln((Kp+1)/(Kp−1))，Kp ≤ 1 时永不发散 */
  const criticalTs = () => (s.Kp > 1 ? s.tau * Math.log((s.Kp + 1) / (s.Kp - 1)) : Infinity);

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    ctx.clearRect(0, 0, W, Hh);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, Hh);
    const gx = 40;
    const gw = W - gx - 14;
    const gh = 150;
    const gy = 26;
    const t0 = Math.max(0, A.t - T_WIN);
    const X = (t) => gx + ((t - t0) / T_WIN) * gw;
    const Y = (v) => gy + gh - ((clamp(v, -0.6, 2.2) + 0.6) / 2.8) * gh;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(gx + 0.5, gy + 0.5, gw, gh);
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(gx, Y(0));
    ctx.lineTo(gx + gw, Y(0));
    ctx.moveTo(gx, Y(1));
    ctx.lineTo(gx + gw, Y(1));
    ctx.stroke();
    label(ctx, '目标 1', gx - 4, Y(1) + 4, C.fg, { align: 'right', size: 9 });
    label(ctx, '0', gx - 4, Y(0) + 4, C.fg, { align: 'right', size: 9 });

    /* 参照组（Ts = 1 ms，等价连续控制） */
    polyline(ctx, B.hist.filter((p) => p[0] >= t0).map((p) => [X(p[0]), Y(p[1])]), C.grid, 2.2, [5, 3]);
    /* 当前控制周期 */
    polyline(ctx, A.hist.filter((p) => p[0] >= t0).map((p) => [X(p[0]), Y(p[1])]), C.accent, 2.2);
    /* 采样节拍：每个控制周期只在节拍时刻看一眼、算一次，中间保持不变 */
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1;
    const TsSec = s.Ts / 1000;
    for (let tk = Math.ceil(t0 / TsSec) * TsSec; tk <= A.t; tk += TsSec) {
      ctx.beginPath();
      ctx.moveTo(X(tk), gy + gh);
      ctx.lineTo(X(tk), gy + gh - 5);
      ctx.stroke();
    }
    label(ctx, '阶跃响应：实线=当前 Ts，虚线=Ts 1 ms（近似连续）', gx, gy - 6, C.fg, { size: 10 });

    /* ---- 下：Ts 稳定性地图 ---- */
    const my = gy + gh + 40;
    const mh = Hh - my - 22;
    const tsMin = 0.5;
    const tsMax = 300;
    const XM = (ts) => gx + (Math.log(clamp(ts, tsMin, tsMax) / tsMin) / Math.log(tsMax / tsMin)) * gw;
    [1, 10, 100].forEach((ts) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(XM(ts), my);
      ctx.lineTo(XM(ts), my + mh);
      ctx.stroke();
      label(ctx, ts + 'ms', XM(ts), my + mh + 14, C.fg, { align: 'center', size: 9 });
    });
    /* 分区着色：p>0 单调、−1<p≤0 振荡、p≤−1 发散 */
    for (let i = 0; i < gw; i += 2) {
      const ts = tsMin * (tsMax / tsMin) ** (i / gw);
      const p = poleOf(ts / 1000);
      ctx.fillStyle = p > 0 ? C.named('green') : p > -1 ? C.named('amber') : C.bad;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(gx + i, my, 2.2, mh);
    }
    ctx.globalAlpha = 1;
    /* 经验区：Ts ≤ 1/(10·f_bw)，f_bw = (1+Kp)/(2π·τ) */
    const fbw = (1 + s.Kp) / (2 * Math.PI * s.tau);
    const tsExp = 1000 / (10 * fbw);
    ctx.strokeStyle = C.named('green');
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(XM(tsExp), my);
    ctx.lineTo(XM(tsExp), my + mh);
    ctx.stroke();
    ctx.setLineDash([]);
    if (tsExp >= tsMin && tsExp <= tsMax) {
      label(ctx, '经验区 Ts ≤ ' + fmt(tsExp, 1) + ' ms', XM(tsExp) + 4, my + 12, C.named('green'), { size: 10 });
    }
    /* 当前 Ts 指针 */
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(XM(s.Ts), my - 4);
    ctx.lineTo(XM(s.Ts), my + mh + 4);
    ctx.stroke();
    label(ctx, '当前 Ts=' + fmt(s.Ts, 0) + 'ms', XM(s.Ts) + 4, my + mh - 4, C.accent, { size: 10, weight: 600 });
    label(ctx, '控制周期 Ts 的稳定性地图（绿=单调 / 黄=振荡收敛 / 红=发散）', gx, my - 12, C.fg, { size: 10 });

    const p = poleOf(s.Ts / 1000);
    const tc = criticalTs();
    const phaseLag = (((1 + s.Kp) / s.tau) * (s.Ts / 1000)) / 2 * (180 / Math.PI);
    ro.set('采样频率', fmt(1000 / s.Ts, 0) + ' Hz（闭环带宽约 ' + fmt(fbw, 1) + ' Hz）');
    ro.set('离散极点', 'p = ' + fmt(p, 4) + '（|p|<1 才稳定）');
    ro.set('稳定性', p > 0 ? '单调稳定（无超调）' : p > -1 ? '振荡收敛（有超调）' : '⚠ 发散（|p|>1）');
    ro.set('临界周期', isFinite(tc) ? fmt(tc * 1000, 1) + ' ms' : 'Kp ≤ 1，任意 Ts 都稳定');
    ro.set('相位滞后', fmt(phaseLag, 1) + '°（> 60° 基本就没裕度了）');
    ro.set('超调', A.peak > 1 ? fmt((A.peak - 1) * 100, 1) + ' %' : '0 %');
  }

  const controls = anim(host, {
    onTick(dt) {
      const n = clamp(Math.round(dt / H), 1, 500);
      const hh = dt / n;
      for (let i = 0; i < n; i += 1) {
        stepSim(A, hh);
        stepSim(B, hh);
      }
      if (A.t > T_WIN + 6) reset();
      draw();
    },
    onReset: reset,
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'Ts', label: '控制周期 Ts (ms)', min: 1, max: 200, step: 1, value: s.Ts, fmt: 0 },
        { name: 'Kp', label: '比例增益 Kp', min: 0.5, max: 10, step: 0.1, value: s.Kp, fmt: 1 },
        { name: 'tau', label: '对象时间常数 τ (s)', min: 0.05, max: 0.8, step: 0.01, value: s.tau, fmt: 2 },
      ],
    },
    (v) => {
      s.Ts = v.Ts; s.Kp = v.Kp; s.tau = v.tau;
      A = mk(s.Ts / 1000);
      B = mk(TS_REF);
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}

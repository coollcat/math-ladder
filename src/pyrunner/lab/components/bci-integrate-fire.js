/* 积分点火神经元（LIF）：往膜片里注入恒定电流，看膜电位怎么一格一格攒到阈值、
   放电、再被拉回重置电位。电流低于雷奥巴斯（rheobase）时它一声不吭——
   这正是「神经元为什么放电」的最小数学。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildReadout,
  polyline, label, clamp, fmt,
  clearBg,
} from '../core.js';

const EL = -65;    // mV 静息电位
const VR = -65;    // mV 重置电位（与静息同值，最简模型）
const RM = 10;     // MΩ 膜电阻
const WIN = 120;   // ms 一屏时间窗

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    I: spec.I ?? 2.0,      // nA 注入电流
    tau: spec.tau ?? 20,   // ms 膜时间常数
    dV: spec.dV ?? 15,     // mV 阈值高出静息的量
  };
  const vth = () => EL + s.dV;
  const rheo = () => s.dV / RM;                    // nA 雷奥巴斯
  const vinf = () => EL + RM * s.I;
  /* 解析发放率：V∞ 过阈值才有解，否则静息 */
  function rate() {
    const vi = vinf();
    if (vi <= vth()) return 0;
    return 1000 / (s.tau * Math.log((vi - VR) / (vi - vth())));
  }

  const st = { t: 0, V: EL, trace: [], spikes: [] };
  const cv = setupCanvas(host, 336);
  const ro = buildReadout({
    稳态电位: '—', 雷奥巴斯: '—', 放电间期: '—', 发放率: '—', 状态: '—',
  });
  host.appendChild(ro.box);

  const sl = buildSliders(
    {
      sliders: [
        { name: 'I', label: '注入电流 I (nA)', min: 0, max: 4, step: 0.05, value: s.I, fmt: 2 },
        { name: 'tau', label: '膜时间常数 τ (ms)', min: 5, max: 40, step: 1, value: s.tau, fmt: 0 },
        { name: 'dV', label: '阈值高出静息 ΔV (mV)', min: 5, max: 25, step: 1, value: s.dV, fmt: 0 },
      ],
    },
    (v) => { s.I = v.I; s.tau = v.tau; s.dV = v.dV; reset(); },
  );

  /* 画布拖动 = 直接拧电流旋钮（上格上下拖，下格左右拖） */
  const ranges = sl.box.querySelectorAll('input[type="range"]');
  function setCurrent(val) {
    s.I = clamp(val, 0, 4);
    if (ranges[0]) {
      ranges[0].value = String(s.I);
      const lab = ranges[0].parentNode.querySelector('.ml-slider__val');
      if (lab) lab.textContent = fmt(s.I, 2);
    }
    reset();
  }

  function reset() {
    st.t = 0; st.V = EL; st.trace = []; st.spikes = [];
    const dt = 0.02;
    for (let i = 0; i < Math.round(400 / dt); i += 1) step(dt);   // 预热：先把节律跑出来
  }

  function step(dt) {
    st.t += dt;
    st.V += (dt * (-(st.V - EL) + RM * s.I)) / s.tau;
    if (st.V >= vth()) {
      st.spikes.push(st.t);
      st.V = VR;
    }
    const last = st.trace[st.trace.length - 1];
    if (!last || st.t - last[0] >= 0.05) st.trace.push([st.t, st.V]);
    while (st.trace.length && st.trace[0][0] < st.t - WIN * 1.2) st.trace.shift();
    while (st.spikes.length && st.spikes[0] < st.t - WIN * 1.2) st.spikes.shift();
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    const gx = 46;
    const gw = W - gx - 14;

    /* ---------- 上：膜电位轨迹 ---------- */
    const y0 = 30;
    const y1 = 190;
    const hi = vth() + 12;
    const lo = EL - 6;
    const X = (t) => gx + ((t - (st.t - WIN)) / WIN) * gw;
    const Y = (v) => y1 - ((clamp(v, lo, hi) - lo) / (hi - lo)) * (y1 - y0);

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(gx + 0.5, y0 + 0.5, gw, y1 - y0);
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(gx, Y(EL));
    ctx.lineTo(gx + gw, Y(EL));
    ctx.stroke();

    /* 阈值线与重置线 */
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.bad;
    ctx.beginPath();
    ctx.moveTo(gx, Y(vth()));
    ctx.lineTo(gx + gw, Y(vth()));
    ctx.stroke();
    ctx.strokeStyle = C.named('gray');
    ctx.beginPath();
    ctx.moveTo(gx, Y(VR));
    ctx.lineTo(gx + gw, Y(VR));
    ctx.stroke();
    ctx.restore();
    label(ctx, '阈值 Vth = ' + fmt(vth(), 0) + ' mV', gx + 6, Y(vth()) - 5, C.bad, { size: 10 });
    label(ctx, '静息/重置 ' + fmt(EL, 0) + ' mV', gx + 6, Y(EL) + 13, C.named('gray'), { size: 10 });

    /* 稳态虚线：V∞ 一眼看出离阈值多远 */
    const vi = vinf();
    if (vi > lo && vi < hi) {
      ctx.save();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = C.accent2;
      ctx.beginPath();
      ctx.moveTo(gx, Y(vi));
      ctx.lineTo(gx + gw, Y(vi));
      ctx.stroke();
      ctx.restore();
      label(ctx, 'V∞ = ' + fmt(vi, 1) + ' mV', gx + gw - 6, Y(vi) - 5, C.accent2,
        { size: 10, align: 'right' });
    }

    /* 放电脉冲标记 */
    st.spikes.forEach((ts) => {
      const x = X(ts);
      if (x < gx || x > gx + gw) return;
      ctx.save();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = C.named('purple');
      ctx.beginPath();
      ctx.moveTo(x, y0 + 1);
      ctx.lineTo(x - 3.5, y0 - 6);
      ctx.lineTo(x + 3.5, y0 - 6);
      ctx.closePath();
      ctx.fill();
    });

    const seg = st.trace.filter((p) => p[0] >= st.t - WIN);
    /* 断点：一旦跳到 VR，折线要断开，不能连成一条斜线 */
    let run = [];
    const runs = [];
    for (let i = 0; i < seg.length; i += 1) {
      if (i > 0 && seg[i][1] < seg[i - 1][1] - 1) { runs.push(run); run = []; }
      run.push([X(seg[i][0]), Y(seg[i][1])]);
    }
    runs.push(run);
    runs.forEach((r) => polyline(ctx, r, C.accent, 2));
    label(ctx, '膜电位 V(t)  ·  拖动画布上下改变注入电流', gx, y0 - 12, C.fg, { size: 11, weight: 600 });

    /* ---------- 下：f–I 曲线 ---------- */
    const b0 = 224;
    const b1 = H - 24;
    const Ib = (i) => gx + (i / 4) * gw;
    const Yb = (r) => b1 - (clamp(r, 0, 120) / 120) * (b1 - b0);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(gx + 0.5, b0 + 0.5, gw, b1 - b0);
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(gx, Yb(0));
    ctx.lineTo(gx + gw, Yb(0));
    ctx.stroke();

    const curve = [];
    for (let i = 0; i <= 160; i += 1) {
      const ii = (i / 160) * 4;
      const saved = s.I;
      s.I = ii;
      curve.push([Ib(ii), Yb(rate())]);
      s.I = saved;
    }
    polyline(ctx, curve, C.named('teal'), 2);

    /* 渐近线 r ≈ I/(CΔV)：斜率截距 */
    const slope = 1000 / (s.tau * s.dV);   // Hz per nA
    polyline(ctx, [[Ib(rheo()), Yb(0)], [Ib(4), Yb((4 - rheo()) * slope)]], C.named('gray'), 1.2, [4, 4]);

    /* 雷奥巴斯竖线 + 当前工作点 */
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = C.accent2;
    ctx.beginPath();
    ctx.moveTo(Ib(rheo()), b0);
    ctx.lineTo(Ib(rheo()), b1);
    ctx.stroke();
    ctx.restore();
    const cx = Ib(s.I);
    const cy = Yb(rate());
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'f–I 曲线（横轴拖动改变电流）', gx, b0 - 10, C.fg, { size: 11, weight: 600 });
    label(ctx, '雷奥巴斯 ' + fmt(rheo(), 2) + ' nA', gx + 6, b1 - 6, C.accent2, { size: 10 });
    label(ctx, '120 Hz', gx - 6, Yb(120) + 4, C.fg, { size: 9, align: 'right' });
    label(ctx, '0', gx - 6, Yb(0) + 4, C.fg, { size: 9, align: 'right' });
    label(ctx, '4 nA', gx + gw, b1 + 14, C.fg, { size: 9, align: 'right' });

    /* ---------- 读数 ---------- */
    const r = rate();
    ro.set('稳态电位', fmt(vi, 1) + ' mV（阈值 ' + fmt(vth(), 0) + '）');
    ro.set('雷奥巴斯', fmt(rheo(), 2) + ' nA');
    ro.set('放电间期', r > 0 ? fmt(1000 / r, 2) + ' ms' : '—');
    ro.set('发放率', r > 0 ? fmt(r, 2) + ' Hz' : '0 Hz');
    ro.set('状态', r > 0 ? '周期性放电' : '静息（V∞ 未过阈值）');
  }

  const controls = anim(host, {
    onTick(dt) {
      const n = Math.max(1, Math.round((dt * 1000) / 0.02));
      for (let i = 0; i < Math.min(n, 400); i += 1) step(0.02);
      draw();
    },
    onReset: () => { reset(); draw(); },
  });

  cv.canvas.style.cursor = 'ns-resize';
  cv.canvas.addEventListener('pointerdown', () => { cv.canvas.style.cursor = 'grabbing'; });
  cv.canvas.addEventListener('pointerup', () => { cv.canvas.style.cursor = 'ns-resize'; });

  let dragging = false;
  function toLogical(ev) {
    const rect = cv.canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (cv.canvas._W / rect.width),
      y: (ev.clientY - rect.top) * (cv.canvas._H / rect.height),
    };
  }
  function onDown(ev) { dragging = true; applyDrag(ev); }
  function onMove(ev) { if (dragging) applyDrag(ev); }
  function onUp() { dragging = false; }
  function applyDrag(ev) {
    const p = toLogical(ev);
    if (p.y < 200) {
      /* 上格：竖直方向映射到 0–4 nA */
      setCurrent(((200 - p.y) / 170) * 4);
    } else {
      /* 下格：水平方向映射到 0–4 nA */
      const gx = 46;
      const gw = cv.W - gx - 14;
      setCurrent(((p.x - gx) / gw) * 4);
    }
    draw();
  }
  cv.canvas.addEventListener('pointerdown', onDown);
  cv.canvas.addEventListener('pointermove', onMove);
  cv.canvas.addEventListener('pointerup', onUp);
  cv.canvas.addEventListener('pointercancel', onUp);

  reset();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sl.box,
    destroy() {
      controls.stop();
      cv.canvas.removeEventListener('pointerdown', onDown);
      cv.canvas.removeEventListener('pointermove', onMove);
      cv.canvas.removeEventListener('pointerup', onUp);
      cv.canvas.removeEventListener('pointercancel', onUp);
    },
  };
}

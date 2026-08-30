/* 电荷、电流与电压 —— 水管类比。
   整章的地基只有一句话：电流不是「电在流」，而是电荷的流量 I = ΔQ/Δt。
   水压类比电压，阀门类比电阻，水流量类比电流，流过的总水量类比电荷。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildReadout, label, clamp, fmt,
} from '../core.js';

const QE = 1.602e-19; // 元电荷

export default function render(host, spec) {
  let C = themeColors();
  const s = { V: spec.V ?? 6, open: spec.open ?? 0.6 };
  let t = 0;
  let Q = 0;
  const hist = []; // {t, Q} 滚动窗口，用于算 ΔQ/Δt

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ '电流 I': '—', '累计电荷 Q': '—', 'ΔQ/Δt': '—', '每秒电子数': '—' });
  host.appendChild(ro.box);

  /* 阀门开度 → 等效电阻；I = V/R */
  const resist = () => 200 / clamp(s.open, 0.05, 1);
  const current = () => s.V / resist();

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const I = current();

    /* ---------- 上：水箱 + 管道 + 阀门 ---------- */
    const tankX = 22;
    const tankW = 56;
    const pipeY = 96;
    const pipeH = 34;
    const pipeX0 = tankX + tankW;
    const pipeX1 = W - 20;
    const tankTop = 24;
    const tankBot = pipeY + pipeH;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.strokeRect(tankX, tankTop, tankW, tankBot - tankTop);
    const lvl = (clamp(s.V, 0, 12) / 12) * (tankBot - tankTop - 4);
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.30;
    ctx.fillRect(tankX + 2, tankBot - 2 - lvl, tankW - 4, lvl);
    ctx.globalAlpha = 1;
    label(ctx, '水压 = 电压', tankX + tankW / 2, tankTop - 6, C.fg, { align: 'center', size: 10 });
    label(ctx, fmt(s.V, 1) + ' V', tankX + tankW / 2, tankBot + 15, C.accent, { align: 'center', size: 11, weight: 600 });

    /* 管道 */
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(pipeX0, pipeY);
    ctx.lineTo(pipeX1, pipeY);
    ctx.moveTo(pipeX0, pipeY + pipeH);
    ctx.lineTo(pipeX1, pipeY + pipeH);
    ctx.stroke();

    /* 阀门：两片挡板，间隙 = 开度 */
    const vx = pipeX0 + 46;
    const gap = (s.open * pipeH) / 2;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(vx, pipeY);
    ctx.lineTo(vx, pipeY + pipeH / 2 - gap);
    ctx.moveTo(vx, pipeY + pipeH / 2 + gap);
    ctx.lineTo(vx, pipeY + pipeH);
    ctx.stroke();
    label(ctx, '阀门 = 电阻', vx, pipeY - 8, C.accent2, { align: 'center', size: 10 });
    label(ctx, fmt(resist(), 0) + ' Ω', vx, pipeY + pipeH + 15, C.accent2, { align: 'center', size: 10 });

    /* 水粒子：位置随流量推进 */
    ctx.fillStyle = C.accent;
    const N = 22;
    for (let i = 0; i < N; i += 1) {
      const p = ((i / N) + (t * I * 26) % 1) % 1;
      const x = pipeX0 + 8 + p * (pipeX1 - pipeX0 - 16);
      const y = pipeY + 6 + ((i * 7) % 5) * ((pipeH - 12) / 4);
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, '流量 = 电流 I', pipeX1 - 4, pipeY - 8, C.accent, { align: 'right', size: 10 });

    /* ---------- 下：Q(t) 累积曲线 + 1 秒割线 ---------- */
    const gx = 46;
    const gw = W - gx - 18;
    const gy = H - 26;
    const gh = gy - (pipeY + pipeH + 34);
    const qMax = Math.max(0.5, Q * 1.15);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'Q', gx - 10, gy - gh + 10, C.fg, { size: 11 });
    label(ctx, '电荷累积 Q(t)（库仑）', gx + gw / 2, gy + 16, C.fg, { align: 'center', size: 10 });

    const TWIN = 6; // 窗口 6 秒
    const px = (tt) => gx + (clamp(tt - (t - TWIN), 0, TWIN) / TWIN) * gw;
    const py = (qq) => gy - (clamp(qq, 0, qMax) / qMax) * gh;
    if (hist.length > 1) {
      ctx.strokeStyle = C.named('green');
      ctx.lineWidth = 2;
      ctx.beginPath();
      hist.forEach((h, i) => (i ? ctx.lineTo(px(h.t), py(h.Q)) : ctx.moveTo(px(h.t), py(h.Q))));
      ctx.stroke();
      /* 1 秒割线：它的斜率就是 I */
      const old = hist.find((h) => h.t >= t - 1) || hist[0];
      ctx.save();
      ctx.strokeStyle = C.named('amber');
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px(old.t), py(old.Q));
      ctx.lineTo(px(t), py(Q));
      ctx.stroke();
      ctx.restore();
      label(ctx, 'ΔQ/Δt = I', (px(old.t) + px(t)) / 2, (py(old.Q) + py(Q)) / 2 - 8,
        C.named('amber'), { align: 'center', size: 10 });
      ro.set('ΔQ/Δt', fmt(((Q - old.Q) / Math.max(t - old.t, 1e-6)) * 1000, 1) + ' mA（近 1 s 实测）');
    } else {
      ro.set('ΔQ/Δt', '点「播放」开始计时，割线斜率即 I');
    }
    ro.set('电流 I', fmt(I * 1000, 1) + ' mA = ' + fmt(I, 4) + ' A');
    ro.set('累计电荷 Q', fmt(Q, 3) + ' C（已流 ' + fmt(t, 1) + ' s）');
    ro.set('每秒电子数', (I / QE).toExponential(2) + ' 个/s');
  }

  const controls = anim(host, {
    onTick(dt) {
      t += dt;
      Q += current() * dt;
      hist.push({ t, Q });
      while (hist.length && hist[0].t < t - 6.2) hist.shift();
      draw();
    },
    onReset() {
      t = 0; Q = 0; hist.length = 0;
      draw();
    },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'V', label: '水压（电压）', min: 0, max: 12, step: 0.1, value: s.V, fmt: 1 },
        { name: 'open', label: '阀门开度（1/电阻）', min: 0.05, max: 1, step: 0.01, value: s.open, fmt: 2 },
      ],
    },
    (st) => { s.V = st.V; s.open = st.open; draw(); },
  );

  draw();
  cv.redraw = draw;
  /* 自动起播：本组件的结论全在时间演化里，静态图看不出来。
     尊重「减少动效」偏好，那边由 anim 自己把播放键禁用。 */
  if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    controls.toggle(true);
  }
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}

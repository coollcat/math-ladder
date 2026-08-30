/* 编码器测速：增量式 AB 相输出两路 90° 错开的方波，四倍频后一个周期数 4 个数。
   M 法数脉冲（越快越准），T 法数高频时钟（越慢越准），两条误差曲线交叉的地方
   就是该换算法的地方。 */
import {
  themeColors, setupCanvas, anim, buildReadout, buildSliders, polyline, label, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    rpm: spec.rpm ?? 300,       // 实际转速
    ppr: spec.ppr ?? 1000,      // 每转线数（周期数）
    Tw: spec.Tw ?? 10,          // M 法闸门时间 ms
    fc: spec.fc ?? 8,           // T 法计数时钟 MHz
  };
  let phase = 0;      // 电周期相位（0–1）
  let slow = 1;       // 画面减速倍数
  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    脉冲频率: '—', 角度分辨率: '—', 'M 法': '—', 'T 法': '—', 推荐: '—', 最低可测: '—',
  });
  host.appendChild(ro.box);

  const counts = () => s.ppr * 4;                       // 四倍频后每转计数
  const fPulse = () => (s.rpm / 60) * counts();         // 计数脉冲频率 Hz
  const mCounts = () => fPulse() * (s.Tw / 1000);       // M 法：闸门内计到的脉冲数
  const tCounts = () => (s.fc * 1e6) / Math.max(fPulse(), 1e-9); // T 法：两脉冲间的高频计数
  const errM = (rpm) => 100 / Math.max((rpm / 60) * counts() * (s.Tw / 1000), 1e-9);
  const errT = (rpm) => (100 * (rpm / 60) * counts()) / (s.fc * 1e6);

  function wheel(ctx, cx, cy, R) {
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    const slots = Math.min(s.ppr, 60);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < slots; i += 1) {
      const a = phase * Math.PI * 2 + (i / slots) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + R * 0.62 * Math.cos(a), cy + R * 0.62 * Math.sin(a));
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      ctx.stroke();
    }
    /* 转轴 + 转向 */
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + R * 0.3, cy);
    ctx.lineTo(cx + R * 0.3 * Math.cos(phase * Math.PI * 2), cy + R * 0.3 * Math.sin(phase * Math.PI * 2));
    ctx.stroke();
    label(ctx, s.ppr + ' 线/转', cx, cy + R + 16, C.fg, { align: 'center', size: 10 });
    label(ctx, '画面减速 ×' + (slow < 10 ? fmt(slow, 1) : fmt(slow, 0)), cx, cy + R + 30, C.grid, { align: 'center', size: 9 });
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const gx = 40;
    const gw = W - gx - 16;

    wheel(ctx, gx + 52, 92, 54);

    /* ---- AB 相波形 + 四倍频计数沿 ---- */
    const wy = 36;
    const wh = 108;
    const wx = gx + 130;
    const ww = gw - 130;
    if (ww > 60) {
      const cycles = 2.2;
      const X = (u) => wx + (u / cycles) * ww;
      ['A', 'B'].forEach((ph, k) => {
        const yBase = wy + 12 + k * 46;
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wx, yBase + 12);
        ctx.lineTo(wx + ww, yBase + 12);
        ctx.stroke();
        /* 方波：B 相滞后 90°（1/4 周期） */
        const pts = [];
        for (let i = 0; i <= 240; i += 1) {
          const u = (i / 240) * cycles;
          const a = 2 * Math.PI * (u + phase - k * 0.25);
          pts.push([X(u), yBase + 12 - Math.sign(Math.sin(a)) * 11]);
        }
        polyline(ctx, pts, C.series(k), 1.8);
        label(ctx, ph + ' 相', wx - 6, yBase + 16, C.series(k), { align: 'right', size: 10 });
      });
      /* 四倍频：A、B 的上下沿各算一次 */
      for (let u = 0; u < cycles; u += 0.25) {
        const x = X(u + (phase % 0.25));
        ctx.strokeStyle = C.named('amber');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, wy + 4);
        ctx.lineTo(x, wy + wh - 4);
        ctx.stroke();
      }
      label(ctx, '↑ 每个上升/下降沿都计数 → 四倍频', wx, wy - 6, C.fg, { size: 10 });
    }

    /* ---- 误差对比：双对数 ---- */
    const cy0 = 176;
    const ch = H - cy0 - 30;
    const rpmMin = 1;
    const rpmMax = 1e4;
    const eMin = 1e-3;
    const eMax = 100;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, cy0);
    ctx.lineTo(gx, cy0 + ch);
    ctx.lineTo(gx + gw, cy0 + ch);
    ctx.stroke();
    const XE = (r) => gx + (Math.log(r / rpmMin) / Math.log(rpmMax / rpmMin)) * gw;
    const YE = (e) => cy0 + ch - (Math.log(clamp(e, eMin, eMax) / eMin) / Math.log(eMax / eMin)) * ch;
    [10, 100, 1000, 10000].forEach((r) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(XE(r), cy0);
      ctx.lineTo(XE(r), cy0 + ch);
      ctx.stroke();
      label(ctx, String(r), XE(r), cy0 + ch + 14, C.fg, { align: 'center', size: 9 });
    });
    [0.01, 1, 100].forEach((e) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(gx, YE(e));
      ctx.lineTo(gx + gw, YE(e));
      ctx.stroke();
      label(ctx, e + '%', gx - 4, YE(e) + 3, C.fg, { align: 'right', size: 9 });
    });
    const mk = (fn, col, name) => {
      const pts = [];
      for (let i = 0; i <= 200; i += 1) {
        const r = rpmMin * (rpmMax / rpmMin) ** (i / 200);
        pts.push([XE(r), YE(fn(r))]);
      }
      polyline(ctx, pts, col, 2.2);
      label(ctx, name, gx + gw - 2, cy0 + 12 + (name === 'M 法' ? 0 : 14), col, { align: 'right', size: 10, weight: 600 });
    };
    mk(errM, C.accent, 'M 法');
    mk(errT, C.accent2, 'T 法');
    /* 当前转速位置 */
    ctx.strokeStyle = C.named('green');
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(XE(clamp(s.rpm, rpmMin, rpmMax)), cy0);
    ctx.lineTo(XE(clamp(s.rpm, rpmMin, rpmMax)), cy0 + ch);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.named('green');
    ctx.beginPath();
    ctx.arc(XE(clamp(s.rpm, rpmMin, rpmMax)), YE(errM(s.rpm)), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(XE(clamp(s.rpm, rpmMin, rpmMax)), YE(errT(s.rpm)), 4, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, '测速相对误差 vs 转速（双对数）', gx, cy0 - 6, C.fg, { size: 10 });
    label(ctx, '转速 rpm', gx + gw, cy0 + ch + 26, C.fg, { align: 'right', size: 9 });

    const M = mCounts();
    const m = tCounts();
    const better = errM(s.rpm) <= errT(s.rpm) ? 'M 法（数脉冲）' : 'T 法（数时钟）';
    ro.set('脉冲频率', fmt(fPulse() / 1000, 2) + ' kHz（' + fmt(fPulse(), 0) + ' 计数/秒）');
    ro.set('角度分辨率', fmt(360 / counts(), 3) + '°（' + counts() + ' 计数/转）');
    ro.set('M 法', fmt(M, 1) + ' 计数，误差 ±' + fmt(errM(s.rpm), 3) + ' %');
    ro.set('T 法', fmt(m, 1) + ' 计数，误差 ±' + fmt(errT(s.rpm), 3) + ' %');
    ro.set('推荐', better);
    ro.set('最低可测', 'M 法 ' + fmt(60 / (counts() * (s.Tw / 1000)), 3) + ' rpm（闸门内只有 1 个计数）');
  }

  const controls = anim(host, {
    onTick(dt) {
      /* 真实每秒走过的线数太多，按固定上限减速到 ≤4 个电周期/秒 */
      const cycles = fPulse() / counts();
      slow = Math.max(1, cycles / 4);
      phase = (phase + (dt * cycles) / slow) % 1;
      draw();
    },
    onReset() { phase = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'rpm', label: '转速 (rpm)', min: 1, max: 6000, step: 1, value: s.rpm, fmt: 0 },
        { name: 'ppr', label: '编码器线数 PPR', min: 100, max: 5000, step: 100, value: s.ppr, fmt: 0 },
        { name: 'Tw', label: 'M 法闸门时间 (ms)', min: 1, max: 100, step: 1, value: s.Tw, fmt: 0 },
        { name: 'fc', label: 'T 法计数时钟 (MHz)', min: 1, max: 20, step: 1, value: s.fc, fmt: 0 },
      ],
    },
    (v) => { s.rpm = v.rpm; s.ppr = v.ppr; s.Tw = v.Tw; s.fc = v.fc; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}

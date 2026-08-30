/* ADC 与 DAC：桥接模拟与数字两个世界。
   两道门都要过：采样把时间离散化（不够快 → 混叠），量化把幅度离散化（不够细 → 量化噪声）。
   量化噪声的经典结论：每多一位，信噪比改善 6.02 dB，理想 N 位 ADC 的
   SNR ≈ 6.02N + 1.76 dB。本组件直接对采样点做统计，把这条公式量出来给你看。 */
import {
  themeColors, setupCanvas, buildSliders, buildReadout, polyline, label, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = { bits: spec.bits ?? 4, spc: spec.spc ?? 12 }; // spc = 每周期采样点数
  const FSIG = 1000;

  const cv = setupCanvas(host, 340);
  const ro = buildReadout({ '量化台阶 Δ': '—', '采样率': '—', '量化噪声': '—', SNR: '—' });
  host.appendChild(ro.box);

  const nb = () => Math.max(1, Math.round(s.bits));
  const step = () => 2 / (2 ** nb()); // 输入范围 ±1 V
  const quantize = (v) => Math.round(v / step()) * step();

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const fs = s.spc * FSIG;
    const alias = Math.abs(FSIG - Math.round(FSIG / fs) * fs);
    const nyq = s.spc >= 2;

    /* ---------- 上：采样 + 量化台阶 ---------- */
    const gx = 40;
    const gw = W - gx - 16;
    const gy = 132;
    const gh = 96;
    const VY = (v) => gy - (clamp(v, -1.3, 1.3) / 1.3) * (gh / 2);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh / 2); ctx.lineTo(gx + gw, gy - gh / 2);
    ctx.stroke();
    label(ctx, '+1', gx - 6, gy - gh / 2 - 4, C.fg, { align: 'right', size: 9 });
    label(ctx, '−1', gx - 6, gy + gh / 2 + 10, C.fg, { align: 'right', size: 9 });
    /* 原始正弦 */
    const orig = [];
    for (let k = 0; k <= 400; k += 1) {
      const t = (k / 400) * 2 / FSIG;
      orig.push([gx + (k / 400) * gw, VY(Math.sin(2 * Math.PI * FSIG * t))]);
    }
    polyline(ctx, orig, C.named('gray'), 1.4, [4, 3]);
    /* 量化电平横线 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    const half = 2 ** (nb() - 1);
    for (let k = -half; k <= half; k += 1) {
      const v = k * step();
      if (Math.abs(v) > 1.05) continue;
      ctx.beginPath();
      ctx.moveTo(gx, VY(v)); ctx.lineTo(gx + gw, VY(v));
      ctx.stroke();
    }
    /* 零阶保持台阶 + 采样点 */
    const stair = [];
    const dots = [];
    let se = 0;
    let n = 0;
    const nSamp = Math.max(2, Math.round(s.spc * 2));
    for (let k = 0; k < nSamp; k += 1) {
      const t = k / fs;
      const v = Math.sin(2 * Math.PI * FSIG * t);
      const q = clamp(quantize(v), -1, 1);
      const x0 = gx + (t / (2 / FSIG)) * gw;
      const x1 = gx + ((t + 1 / fs) / (2 / FSIG)) * gw;
      stair.push([x0, VY(q)], [Math.min(x1, gx + gw), VY(q)]);
      dots.push([x0, VY(q)]);
      se += (v - q) ** 2;
      n += 1;
    }
    polyline(ctx, stair, C.accent, 2.2);
    ctx.fillStyle = C.named('amber');
    dots.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    label(ctx, '原始模拟信号（虚线）', gx + 4, gy - gh / 2 - 6, C.named('gray'), { size: 10 });
    label(ctx, 'DAC 重建：零阶保持台阶', gx + gw - 4, gy - gh / 2 - 6, C.accent, { align: 'right', size: 10 });
    label(ctx, '显示 2 个信号周期', gx + gw / 2, gy + gh / 2 + 22, C.fg, { align: 'center', size: 10 });

    /* ---------- 中：量化误差 ---------- */
    const ey = 214;
    const eh = 56;
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(gx, ey); ctx.lineTo(gx + gw, ey);
    ctx.stroke();
    const err = [];
    for (let k = 0; k < nSamp; k += 1) {
      const t = k / fs;
      const v = Math.sin(2 * Math.PI * FSIG * t);
      const e = v - clamp(quantize(v), -1, 1);
      const x0 = gx + (t / (2 / FSIG)) * gw;
      err.push([x0, ey - (e / (step() * 0.75)) * (eh / 2)],
        [gx + ((t + 1 / fs) / (2 / FSIG)) * gw, ey - (e / (step() * 0.75)) * (eh / 2)]);
    }
    polyline(ctx, err, C.named('red'), 1.8);
    label(ctx, '量化误差 e = 原始 − 台阶', gx + 4, ey - eh / 2 - 6, C.named('red'), { size: 10 });
    label(ctx, '±Δ/2', gx - 6, ey - eh / 2 + 4, C.fg, { align: 'right', size: 9 });

    /* ---------- 下：位权示意 ---------- */
    const by = 268;
    const nbit = nb();
    const cellW = Math.min(30, (W - 40) / Math.max(nbit, 1));
    for (let k = 0; k < nbit; k += 1) {
      const wgt = 2 ** (nbit - 1 - k);
      const x = 20 + k * cellW;
      ctx.fillStyle = C.soft;
      ctx.fillRect(x, by, cellW - 4, 26);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, by, cellW - 4, 26);
      label(ctx, String(wgt), x + (cellW - 4) / 2, by + 17, C.fg, { align: 'center', size: 10 });
    }
    label(ctx, '位权（MSB → LSB）', 20, by - 6, C.fg, { size: 10 });
    label(ctx, 'LSB 权重 = Δ = ' + fmt(step(), 4) + ' V', 20 + nbit * cellW + 10, by + 17, C.accent, { size: 10 });

    const rms = Math.sqrt(se / Math.max(n, 1));
    const sigRms = Math.SQRT1_2;
    const snr = 20 * Math.log10(sigRms / Math.max(rms, 1e-12));
    const ideal = 6.02 * nb() + 1.76;
    ro.set('量化台阶 Δ', fmt(step(), 5) + ' V　（满量程 2 V ÷ 2^' + nb() + ' = ' + (2 ** nb()) + ' 级）');
    ro.set('采样率', fmt(fs / 1000, 2) + ' kSa/s　（每周期 ' + fmt(s.spc, 1) + ' 点）'
      + (nyq ? '' : '　⚠ 低于奈奎斯特（<2 点/周期），混叠频率 ' + fmt(alias, 0) + ' Hz'));
    ro.set('量化噪声', 'RMS = ' + fmt(rms, 5) + ' V　理论 Δ/√12 = ' + fmt(step() / Math.sqrt(12), 5) + ' V');
    ro.set('SNR', fmt(snr, 2) + ' dB　理论 6.02N+1.76 = ' + fmt(ideal, 2) + ' dB　（每 +1 bit ≈ +6 dB）');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'bits', label: '分辨率 N', min: 1, max: 8, step: 1, value: s.bits, fmt: 0 },
        { name: 'spc', label: '每周期采样点数', min: 1.5, max: 40, step: 0.5, value: s.spc, fmt: 1 },
      ],
    },
    (stt) => { Object.assign(s, stt); draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}

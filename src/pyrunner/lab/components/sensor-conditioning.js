/* 传感器信号调理：传感器给的是毫伏级差分小信号，还带着噪声；仪表放大器把它抬到伏级，
   低通把带外噪声砍掉，电平搬移把它挪进 ADC 的输入范围——每一步都在和「超范围」和
   「噪声淹没」两头打架。 */
import {
  themeColors, setupCanvas, anim, buildReadout, buildSliders, polyline, label, clamp, fmt,
} from '../core.js';

const VFS = 3.3;       // ADC 满量程
const BW_IN = 5000;    // 输入噪声带宽（白噪声假设）Hz
const NS = 720;        // 噪声序列长度

/* 确定性伪随机噪声：每次刷新形状一致，便于观察参数影响 */
function noiseSeq() {
  let seed = 20240915;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const a = new Float64Array(NS);
  for (let i = 0; i < NS; i += 1) a[i] = (rnd() + rnd() + rnd() - 1.5) * 1.2;
  let s = 0;
  for (let i = 0; i < NS; i += 1) s += a[i] * a[i];
  const rms = Math.sqrt(s / NS) || 1;
  for (let i = 0; i < NS; i += 1) a[i] /= rms;   // 归一到 RMS = 1
  return a;
}
const NOISE = noiseSeq();

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    sig: spec.sig ?? 12,        // 传感器输出幅值 mV
    noise: spec.noise ?? 0.5,   // 输入噪声 RMS mV
    gain: spec.gain ?? 100,     // 仪表放大器增益
    fc: spec.fc ?? 200,         // 低通截止频率 Hz
    vref: spec.vref ?? 1.65,    // 电平搬移偏置 V
    bits: spec.bits ?? 12,      // ADC 位数
  };
  let phase = 0;
  const cv = setupCanvas(host, 350);
  const ro = buildReadout({
    输出摆幅: '—', 输出噪声: '—', 利用率: '—', 'LSB': '—', 噪声跳动: '—', 状态: '—',
  });
  host.appendChild(ro.box);

  /* 噪声经一阶低通后：功率 ∝ 等效噪声带宽 (π/2)·fc */
  function sigmaOut() {
    const g = Math.sqrt(Math.min(1, ((Math.PI / 2) * s.fc) / BW_IN));
    return s.noise * 1e-3 * s.gain * g;
  }
  const ampOut = () => s.sig * 1e-3 * s.gain;
  const lsb = () => VFS / 2 ** s.bits;

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const A = ampOut();
    const sg = sigmaOut();
    const l = lsb();

    /* ---- 信号链 ---- */
    const chainY = 12;
    const bw = Math.min(78, (W - 24) / 5 - 6);
    [['传感器', fmt(s.sig, 1) + ' mV'], ['仪表放大', '×' + fmt(s.gain, 0)],
      ['低通', fmt(s.fc, 0) + ' Hz'], ['电平搬移', '+' + fmt(s.vref, 2) + ' V'],
      ['ADC', s.bits + ' bit']].forEach(([name, val], i) => {
      const x = 12 + i * (bw + 6);
      ctx.fillStyle = C.soft;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.rect(x, chainY, bw, 30);
      ctx.fill();
      ctx.stroke();
      label(ctx, name, x + bw / 2, chainY + 13, C.fg, { align: 'center', size: 10, weight: 600 });
      label(ctx, val, x + bw / 2, chainY + 26, C.accent, { align: 'center', size: 10 });
      if (i < 4) {
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + bw + 1, chainY + 15);
        ctx.lineTo(x + bw + 5, chainY + 15);
        ctx.stroke();
      }
    });

    /* ---- 主波形 + ADC 输入范围 ---- */
    const gy = 58;
    const gh = H - gy - 96;
    const gx = 40;
    const gw = W - gx - 14;
    const Yv = (v) => gy + gh - (clamp(v, -0.4, VFS + 0.4) + 0.4) / (VFS + 0.8) * gh;
    /* 允许输入范围带 */
    ctx.fillStyle = C.soft;
    ctx.fillRect(gx, Yv(VFS), gw, Yv(0) - Yv(VFS));
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, Yv(0));
    ctx.lineTo(gx + gw, Yv(0));
    ctx.moveTo(gx, Yv(VFS));
    ctx.lineTo(gx + gw, Yv(VFS));
    ctx.stroke();
    /* 超范围区（斜线警示）：量程之上、量程之下各一片 */
    const hatch = (ry, rh) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(gx, ry, gw, rh);
      ctx.clip();
      ctx.strokeStyle = C.bad;
      ctx.globalAlpha = 0.25;
      for (let x = gx - gh; x < gx + gw; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, ry);
        ctx.lineTo(x + gh, ry + gh);
        ctx.stroke();
      }
      ctx.restore();
    };
    hatch(gy, Yv(VFS) - gy);
    hatch(Yv(0), gy + gh - Yv(0));
    label(ctx, VFS + ' V', gx - 4, Yv(VFS) + 4, C.fg, { align: 'right', size: 9 });
    label(ctx, '0 V', gx - 4, Yv(0) + 4, C.fg, { align: 'right', size: 9 });
    label(ctx, 'Vref ' + fmt(s.vref, 2) + ' V', gx + 4, Yv(s.vref) - 3, C.grid, { size: 9 });

    /* 信号：2 个周期 */
    const nPx = Math.max(120, Math.round(gw));
    const pts = [];
    const clip = [];
    for (let i = 0; i <= nPx; i += 1) {
      const u = i / nPx;
      const v = s.vref + A * Math.sin(2 * Math.PI * (u * 2 + phase)) + sg * NOISE[i % NS];
      pts.push([gx + u * gw, Yv(v)]);
      if (v > VFS || v < 0) clip.push([gx + u * gw, Yv(clamp(v, 0, VFS))]);
    }
    polyline(ctx, pts, C.accent, 1.8);
    /* 削波段画成红色粗线 */
    if (clip.length) {
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 2.6;
      clip.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    /* ±3σ 包络 */
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([3, 3]);
    [1, -1].forEach((sgn) => {
      ctx.beginPath();
      ctx.moveTo(gx, Yv(s.vref + sgn * (A + 3 * sg)));
      ctx.lineTo(gx + gw, Yv(s.vref + sgn * (A + 3 * sg)));
      ctx.stroke();
    });
    ctx.setLineDash([]);
    label(ctx, 'ADC 输入电压（阴影=超范围，虚线=±3σ）', gx, gy - 5, C.fg, { size: 10 });

    /* ---- 底部：量化台阶（放大一段） ---- */
    const qy = gy + gh + 18;
    const qh = H - qy - 8;
    const i0 = Math.floor(nPx * 0.3);
    const i1 = Math.min(nPx, i0 + Math.floor(nPx * 0.12));
    const codes = [];
    for (let i = i0; i <= i1; i += 1) {
      const u = i / nPx;
      const v = s.vref + A * Math.sin(2 * Math.PI * (u * 2 + phase)) + sg * NOISE[i % NS];
      codes.push(Math.round(clamp(v, 0, VFS) / l));
    }
    const cMin = Math.min(...codes) - 1;
    const cMax = Math.max(...codes) + 1;
    const Yc = (c) => qy + qh - ((c - cMin) / Math.max(1, cMax - cMin)) * qh;
    const stair = [];
    codes.forEach((c, k) => {
      const x = gx + (k / (codes.length - 1)) * gw;
      stair.push([x, Yc(c)]);
      if (k < codes.length - 1) stair.push([gx + ((k + 1) / (codes.length - 1)) * gw, Yc(c)]);
    });
    polyline(ctx, stair, C.accent2, 1.8);
    label(ctx, 'ADC 码值（时间窗放大，一个台阶 = 1 LSB）', gx, qy - 4, C.accent2, { size: 10 });

    /* ---- 指标 ---- */
    const hi = s.vref + A + 3 * sg;
    const lo = s.vref - A - 3 * sg;
    const snr = 20 * Math.log10(Math.max((A / Math.SQRT2) / Math.max(sg, 1e-12), 1e-12));
    const enob = clamp((snr - 1.76) / 6.02, 0, s.bits);
    let state = '正常：信号在量程内，噪声也在可接受范围';
    if (hi > VFS || lo < 0) state = '⚠ 超范围（削波），降增益或调偏置';
    else if ((2 * A) / VFS < 0.3) state = '利用率偏低，可提高增益';
    else if (sg / l > 4) state = '噪声占掉太多码位：降截止频率或过采样平均';

    ro.set('输出摆幅', fmt(s.vref + A, 3) + ' ~ ' + fmt(s.vref - A, 3) + ' V（峰峰 ' + fmt(2 * A, 3) + ' V）');
    ro.set('输出噪声', fmt(sg * 1000, 2) + ' mV RMS（输入 ' + fmt(s.noise, 2) + ' mV × ' + fmt(s.gain, 0) + '）');
    ro.set('利用率', fmt(((2 * A) / VFS) * 100, 1) + ' %');
    ro.set('LSB', fmt(l * 1000, 3) + ' mV（' + s.bits + ' bit / ' + VFS + ' V）');
    ro.set('噪声跳动', fmt(sg / l, 2) + ' LSB RMS → ENOB ' + fmt(enob, 1) + ' bit');
    ro.set('状态', state);
  }

  const controls = anim(host, {
    onTick(dt) {
      phase = (phase + dt * 0.5) % 1;
      draw();
    },
    onReset() { phase = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'sig', label: '信号幅值 (mV)', min: 0.5, max: 50, step: 0.5, value: s.sig, fmt: 1 },
        { name: 'noise', label: '输入噪声 RMS (mV)', min: 0.1, max: 10, step: 0.1, value: s.noise, fmt: 1 },
        { name: 'gain', label: '仪表放大器增益', min: 10, max: 1000, step: 10, value: s.gain, fmt: 0 },
        { name: 'fc', label: '低通截止频率 (Hz)', min: 10, max: 5000, step: 10, value: s.fc, fmt: 0 },
        { name: 'vref', label: '电平搬移偏置 (V)', min: 0, max: 3.3, step: 0.05, value: s.vref, fmt: 2 },
        { name: 'bits', label: 'ADC 位数', min: 8, max: 16, step: 1, value: s.bits, fmt: 0 },
      ],
    },
    (v) => {
      s.sig = v.sig; s.noise = v.noise; s.gain = v.gain;
      s.fc = v.fc; s.vref = v.vref; s.bits = v.bits;
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}

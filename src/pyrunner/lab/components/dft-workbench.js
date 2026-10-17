/* =========================================================================
 * lab 组件：dft-workbench —— DFT 工作台（连续频率、窗函数、泄漏与混叠）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "dft-workbench",
 *     "title": "频率骑在两桶之间会发生什么",
 *     "f": 5.5, "N": 64, "fs": 64, "window": "rect"
 *   }
 *   ```
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   f       信号频率 Hz，连续的、可以停在两桶之间（比如 5.5），默认 5.5
 *   amp     振幅，默认 1
 *   N       窗口点数 32 | 64 | 128 | 256，默认 64
 *   fs      采样率 32 | 64 | 128，默认 64（频率滑杆上限跟着 fs 走）
 *   window  'rect' | 'hann' | 'hamming' | 'blackman'，默认 'rect'
 *
 * 看什么：
 *   上半：窗口内的采样点（针杆画的是「加窗之后」的值）+ 原正弦（细线）。
 *     两端的虚线是周期延拓的接缝——f 骑桶时接缝处要跳一下，这一步跳变
 *     就是泄漏的来源；换 Hann 窗后两端被压到近零，接缝不跳了。
 *   下半：幅度谱。整桶 → 一根针；骑桶 → 主瓣 + 两侧旁瓣。
 *   频率超过 fs/2 时，上半会再叠一条混叠后的低频虚线：它穿过同一批采样点。
 *
 * 能拖什么：
 *   - 频率滑块（连续，0.25 Hz 一档）
 *   - 顶部开关：N / 采样率 / 窗型
 *   - 在频谱面板上左右拖动，也可以直接改频率
 *
 * 读什么数：桶宽 / 频率状态 / 最强桶 / 峰值 / 窗的主瓣宽 / 主瓣外最高桶 / 混叠
 *
 * 引擎：dsp.rfft（实数 FFT，内部已除 N）、dsp.window（矩形/Hann/Hamming/
 *   Blackman）。窗函数还会在第 61 章 80 号课正面展开，这里先把它当旋钮用。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, setSliderMax, buildSegmented,
  buildReadout, bindPointer, setSliderRow, label, polyline, fmt, clamp,
  clearBg,
} from '../core.js';
import { rfft, window as makeWindow } from '../engines/dsp.js';

const NS = [32, 64, 128, 256];
const FSS = [32, 64, 128];
const WINS = [
  { label: '矩形窗', value: 'rect' },
  { label: 'Hann', value: 'hann' },
  { label: 'Hamming', value: 'hamming' },
  { label: 'Blackman', value: 'blackman' },
];

const BASE = [
  { name: 'f', label: '信号频率 f', min: 0.25, max: 64, step: 0.25, value: 5.5, fmt: 2 },
];

/* 采样后「听起来」是多少 Hz：f 对 fs 取余，再折到 [0, fs/2]。 */
function foldFreq(f, fs) {
  const m = ((f % fs) + fs) % fs;
  return m <= fs / 2 ? m : fs - m;
}

/* 各窗「主瓣半宽」的名义值（到第一零点，单位 = 桶）：矩形 1 桶、
   Hann/Hamming 2 桶、Blackman 3 桶。主瓣之外的最高桶就是旁瓣。 */
const LOBE_HALF = { rect: 1, hann: 2, hamming: 2, blackman: 3 };

export default function render(host, spec) {
  const s = {
    amp: Number(spec.amp) > 0 ? Number(spec.amp) : 1,
    N: NS.indexOf(spec.N) >= 0 ? spec.N : 64,
    fs: FSS.indexOf(spec.fs) >= 0 ? spec.fs : 64,
    win: WINS.some((o) => o.value === spec.window) ? spec.window : 'rect',
  };

  const sliders = buildSliders(
    { sliders: mergeSpec(BASE, spec) },
    (st) => {
      s.f = st.f;
      draw();
    },
  );
  s.f = sliders.state.f;
  setSliderMax(sliders, 0, s.fs);

  const segN = buildSegmented(NS.map((v) => ({ label: 'N=' + v, value: v })), s.N, (v) => {
    s.N = v;
    draw();
  });
  const segFs = buildSegmented(FSS.map((v) => ({ label: 'fs=' + v, value: v })), s.fs, (v) => {
    s.fs = v;
    s.f = clamp(s.f, 0.25, v);
    setSliderMax(sliders, 0, v);
    setSliderRow(sliders, 0, s.f, 2, 'f');
    draw();
  });
  const segWin = buildSegmented(WINS, s.win, (v) => {
    s.win = v;
    draw();
  });
  host.append(segN, segFs, segWin);

  const ro = buildReadout({
    '桶宽 Δf': '—',
    '频率状态': '—',
    '最强桶': '—',
    '峰值 |X|': '—',
    '窗的主瓣宽': '—',
    '主瓣外最高桶': '—',
    '混叠': '—',
  });
  host.appendChild(ro.box);

  const cv = setupCanvas(host, 388);
  let axisRect = null;   // 频谱面板位置，供指针改频率

  function compute() {
    const N = s.N;
    const fs = s.fs;
    const x = new Float64Array(N);
    for (let n = 0; n < N; n += 1) x[n] = s.amp * Math.sin((2 * Math.PI * s.f * n) / fs);
    const w = makeWindow(s.win, N);
    const seg = new Float64Array(N);
    let wsum = 0;
    for (let n = 0; n < N; n += 1) {
      seg[n] = x[n] * w[n];
      wsum += w[n];
    }
    /* 相干增益：窗把整桶峰高也压小了，这里补回去，保证整桶峰值恒为振幅一半。 */
    const cg = wsum / N;
    const { mag } = rfft(seg);
    const out = new Float64Array(mag.length);
    for (let k = 0; k < mag.length; k += 1) out[k] = mag[k] / (cg || 1);
    return { x, w, spec: out };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const N = s.N;
    const fs = s.fs;
    const f = s.f;
    const df = fs / N;
    const { x, w, spec: sm } = compute();

    const padL = 36;
    const padR = 14;
    const plotW = W - padL - padR;
    const topH = H * 0.46;
    const midY = 30 + (topH - 34) / 2;
    const ampPx = (topH - 40) / 2 - 8;
    const sx = (n) => padL + (N === 1 ? 0 : (n / (N - 1)) * plotW);
    const sy = (v) => midY - v * ampPx;

    /* ---------- 上：窗口内的采样点 + 原正弦 + 窗包络 ---------- */
    label(ctx, `窗口内 ${N} 点 · ${fmt(N / fs, 3)} s`, 8, 14, C.fg, { size: 11.5, weight: 700 });

    const yWin = 30 + topH - 16;
    polyline(ctx, Array.from({ length: N }, (_, n) => [sx(n), yWin - w[n] * 26]), C.named('gray'), 1, [3, 3]);
    label(ctx, '窗 w[n]', 8, yWin - 4, C.named('gray'), { size: 9.5 });

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, midY + 0.5);
    ctx.lineTo(padL + plotW, midY + 0.5);
    ctx.stroke();

    /* 原正弦（不加窗）细线 —— 采样点都落在它上面 */
    const curve = [];
    for (let i = 0; i <= 240; i += 1) {
      const n = (i / 240) * (N - 1);
      curve.push([padL + (i / 240) * plotW, sy(s.amp * Math.sin((2 * Math.PI * f * n) / fs))]);
    }
    polyline(ctx, curve, C.accent, 1.4);

    /* 采样针杆画「加窗之后」的值：拖到 Hann 一眼看见两端被压没 */
    for (let n = 0; n < N; n += 1) {
      const px = sx(n);
      const py = sy(seg_(x, w, n));
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, midY);
      ctx.lineTo(px, py);
      ctx.stroke();
      if (N <= 128) {
        ctx.fillStyle = C.accent2;
        ctx.beginPath();
        ctx.arc(px, py, N <= 64 ? 2.1 : 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    label(ctx, 'f(t)', padL - 30, sy(s.amp) + 4, C.accent, { size: 10 });
    label(ctx, '0', padL, midY + 13, C.axis, { size: 9.5, align: 'center' });
    label(ctx, fmt(N / fs, 3) + ' s', padL + plotW, midY + 13, C.axis, { size: 9.5, align: 'right' });

    /* 周期延拓的接缝：末点 → 右缘，左缘 → 首个采样点（按加窗后的值画） */
    const vLast = seg_(x, w, N - 1);
    const vFirst = seg_(x, w, 0);
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx(N - 1), sy(vLast));
    ctx.lineTo(padL + plotW, sy(vLast));
    ctx.moveTo(padL - 8, sy(vFirst));
    ctx.lineTo(sx(0), sy(vFirst));
    ctx.stroke();
    ctx.restore();
    const jump = Math.abs(vLast - vFirst);
    label(ctx, jump > 0.08 * s.amp ? `接缝跳变 ≈ ${fmt(jump, 2)}` : '接缝不跳', padL + plotW, 14, C.bad, {
      size: 10,
      align: 'right',
    });

    /* 混叠提示：画一条与采样点完全重合的低频虚线 */
    const aliased = f > fs / 2 + 1e-9;
    const alias = foldFreq(f, fs);
    if (aliased) {
      const r = ((f % fs) + fs) % fs;
      const sign = r <= fs / 2 ? 1 : -1;
      const c2 = [];
      for (let i = 0; i <= 240; i += 1) {
        const n = (i / 240) * (N - 1);
        c2.push([padL + (i / 240) * plotW, sy(sign * s.amp * Math.sin((2 * Math.PI * alias * n) / fs))]);
      }
      polyline(ctx, c2, C.named('purple'), 1.4, [5, 4]);
      label(ctx, `混叠曲线 ${fmt(alias, 2)} Hz（穿过同样的点）`, 8, 28, C.named('purple'), { size: 10 });
    }

    /* ---------- 下：幅度谱 ---------- */
    const specTop = 30 + topH + 26;
    const specH = H - specTop - 34;
    const nBins = sm.length;
    let peak = 1;
    for (let k = 1; k < nBins; k += 1) if (sm[k] > sm[peak]) peak = k;
    const vMax = Math.max(sm[peak], s.amp * 0.01, 1e-9) * 1.18;
    const bx = (k) => padL + (k / (nBins - 1)) * plotW;
    const by = (v) => specTop + specH - (v / vMax) * specH;

    label(ctx, '幅度谱 |X[k]|：整桶一根针，骑桶一座山', 8, specTop - 12, C.fg, {
      size: 11.5,
      weight: 700,
    });
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(padL, specTop + specH + 0.5);
    ctx.lineTo(padL + plotW, specTop + specH + 0.5);
    ctx.stroke();

    /* 主瓣底色（按窗型的名义宽度圈出） + 逐桶针杆 */
    const halfBins = LOBE_HALF[s.win] || 1;
    const lobeLo = Math.max(0, Math.ceil((f - halfBins * df) / df - 1e-9));
    const lobeHi = Math.min(nBins - 1, Math.floor((f + halfBins * df) / df + 1e-9));
    ctx.save();
    ctx.fillStyle = C.soft;
    ctx.fillRect(bx(lobeLo) - 3, specTop, bx(lobeHi) - bx(lobeLo) + 6, specH);
    ctx.restore();
    for (let k = 0; k < nBins; k += 1) {
      if (sm[k] < vMax * 0.0015) continue;
      ctx.strokeStyle = k === peak ? C.named('red') : C.accent;
      ctx.lineWidth = k === peak ? 2 : 1.1;
      ctx.beginPath();
      ctx.moveTo(bx(k), specTop + specH);
      ctx.lineTo(bx(k), by(sm[k]));
      ctx.stroke();
      if (k === peak) {
        ctx.fillStyle = C.named('red');
        ctx.beginPath();
        ctx.arc(bx(k), by(sm[k]), 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* 横轴刻度：最多 6 个，按桶宽成倍数取 */
    const tickEvery = Math.max(1, Math.ceil((nBins - 1) / 6));
    for (let k = 0; k < nBins; k += tickEvery) {
      const t = fmt((k * df), k * df % 1 === 0 ? 0 : 1);
      label(ctx, String(t), bx(k), specTop + specH + 14, C.axis, {
        size: 9.5,
        align: k === 0 ? 'left' : (k + tickEvery >= nBins ? 'right' : 'center'),
      });
    }
    label(ctx, 'Hz', padL - 28, specTop + specH + 14, C.axis, { size: 9.5 });

    /* ---------- 读数 ---------- */
    const kf = f / df;
    const nearInt = Math.abs(kf - Math.round(kf)) < 1e-6;
    let status;
    if (aliased) status = `混叠（采样后 ≈ ${fmt(alias, 2)} Hz）`;
    else if (nearInt) status = `整桶（k=${Math.round(kf)}）`;
    else status = `骑桶（k=${fmt(kf, 2)}）`;
    let mxSide = 0;
    for (let k = 1; k < nBins; k += 1) {
      if (k >= lobeLo && k <= lobeHi) continue;
      mxSide = Math.max(mxSide, sm[k]);
    }
    /* 旁瓣电平相对「连续主峰」（= 振幅一半）——整桶时落进的山谷只剩数值零。 */
    const side = nearInt
      ? '无（整桶，无泄漏）'
      : `${fmt(20 * Math.log10(Math.max(mxSide, 1e-12) / (s.amp / 2)), 1)} dB`;
    ro.set('桶宽 Δf', `${fmt(df, 3)} Hz`);
    ro.set('频率状态', status);
    ro.set('最强桶', `${fmt(peak * df, 2)} Hz（k=${peak}）`);
    ro.set('峰值 |X|', fmt(sm[peak], 3) + (nearInt ? '（整桶 = 振幅一半）' : ''));
    ro.set('窗的主瓣宽', `${2 * halfBins} 桶（≈ ${fmt(2 * halfBins * df, 3)} Hz）`);
    ro.set('主瓣外最高桶', side);
    ro.set(
      '混叠',
      aliased
        ? `f=${fmt(f, 2)} Hz > fs/2=${fmt(fs / 2, 1)} Hz → 采样后伪装成 ${fmt(alias, 2)} Hz`
        : `无（fs/2 = ${fmt(fs / 2, 1)} Hz）`,
    );

    axisRect = { x: padL, y: specTop, w: plotW, h: specH };
  }

  /* 加窗后的第 n 个采样值 */
  function seg_(xs, ws, n) {
    return xs[n] * ws[n];
  }

  /* 频谱面板上左右拖动 = 改频率（移动端不用摸细滑块） */
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!axisRect) return null;
      if (x >= axisRect.x - 6 && x <= axisRect.x + axisRect.w + 6
        && y >= axisRect.y - 10 && y <= axisRect.y + axisRect.h + 18) return 'f';
      return null;
    },
    down() { /* 第一次点击也直接生效 */ },
    move(id, x) {
      if (id !== 'f' || !axisRect) return;
      const k = clamp((x - axisRect.x) / axisRect.w, 0, 1) * (s.N / 2);
      const v = clamp((k * s.fs) / s.N, 0.25, s.fs);
      s.f = Math.round(v * 4) / 4;
      setSliderRow(sliders, 0, s.f, 2, 'f');
      draw();
    },
  });

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { /* 无动画、无音频 */ } };
}

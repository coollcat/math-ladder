/* =========================================================================
 * lab 组件：eq-sweep（参量均衡 —— 频响曲线与真实声音一一对应）
 * -------------------------------------------------------------------------
 * 演示什么：
 *   一个双二阶（biquad）参量均衡器。上半张图是它「纸上」的频率响应（用
 *   dsp.biquad + biquadResponse 精确算出），下半张图叠的是真实噪声通过这个
 *   滤波器之后的实测频谱（AnalyserNode）。两者重合，说明「均衡器」不是在
 *   玄学地调音色，它就是在频谱上挖一个坑或堆一个包。
 *
 * 用法（课文里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "eq-sweep", "title": "把 1 kHz 提 8 dB，听听噪声变成了什么" }
 *   ```
 *
 * 字段（都有默认值，最小 spec 只写 type + title 即可）：
 *   freq    中心频率初值（Hz）      默认 1000
 *   gain    峰值增益（dB）         默认 8（正=提升，负=衰减）
 *   Q       品质因数              默认 1.5（Q 越大，包越窄）
 *   src     测试信号 "white"|"pink" 默认 "white"（白噪声频谱平，最适合对照）
 *   volume  播放音量              默认 0.2
 *
 * 能拖什么：
 *   在频响图上按住拖动 —— 横向改中心频率（对数轴），纵向改增益。
 *   曲线上那个实心圆点就是 (中心频率, 增益) 的把手；
 *   圆点两侧的灰色竖带是「半增益带宽」（响应降到峰值增益一半的那一段），
 *   它随 Q 一起收放，是 Q 最直观的画像。
 *
 * 出声：是。带「■ 停止」按钮，离开视口自动停，默认音量 0.2。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented,
  buildReadout, rafLoop, audioShell, polyline, label, clamp, fmt,
  setSliderRow,
  clearBg,
} from '../core.js';
import { biquad, biquadResponse } from '../engines/dsp.js';
import { chain } from '../engines/audio.js';

const FMIN = 20;
const FMAX = 20000;
const DBMIN = -30;
const DBMAX = 30;
const NAMES = ['freq', 'gain', 'Q', 'volume'];

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    freq: spec.freq ?? 1000,
    gain: spec.gain ?? 8,
    Q: spec.Q ?? 1.5,
    volume: spec.volume ?? 0.2,
    src: spec.src === 'pink' ? 'pink' : 'white',
  };

  const cv = setupCanvas(host, 330);

  const seg = buildSegmented(
    [
      { label: '白噪声', value: 'white' },
      { label: '粉红噪声', value: 'pink' },
    ],
    s.src,
    (v) => {
      s.src = v;
      rebuildSource();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ 中心频率: '—', 增益: '—', Q: '—', 半增益带宽: '—', 实测峰值: '—' });
  host.appendChild(ro.box);

  let nodes = null;   // 音频节点组（未播放时为 null）
  let loop = null;    // rafLoop 句柄
  let live = null;    // 最近一帧的实测频谱（dB）
  let geo = { x0: 44, y0: 26, w: 100, h: 100 };

  /* ---------- 音频 ---------- */

  function applyFilter() {
    if (!nodes) return;
    const t = nodes.ctx.currentTime;
    nodes.filt.frequency.setTargetAtTime(s.freq, t, 0.02);
    nodes.filt.Q.setTargetAtTime(s.Q, t, 0.02);
    nodes.filt.gain.setTargetAtTime(s.gain, t, 0.02);
    nodes.eng.setMasterGain(s.volume);
  }

  function startSource(eng) {
    const ctx = eng.ctx;
    const src = ctx.createBufferSource();
    src.buffer = eng.makeNoiseBuffer(3, s.src);
    src.loop = true;
    const srcGain = ctx.createGain();
    srcGain.gain.value = 0.6;
    const filt = eng.biquad({ type: 'peaking', freq: s.freq, Q: s.Q, gain: s.gain });
    const outG = ctx.createGain();
    outG.gain.value = 1;
    chain(src, srcGain, filt, outG, eng.master);
    src.start();
    const an = eng.analyser({ fftSize: 4096, smoothing: 0.7, input: outG });
    an.node.minDecibels = -120;
    an.node.maxDecibels = 0;
    nodes = { eng, ctx, src, srcGain, filt, outG, an };
    applyFilter();
  }

  function rebuildSource() {
    if (!nodes) return;
    const eng = nodes.eng;
    stopSource();
    startSource(eng);
  }

  function stopSource() {
    if (!nodes) return;
    const { src, srcGain, filt, outG } = nodes;
    try { src.stop(); } catch (e) { void e; }
    [src, srcGain, filt, outG].forEach((n) => {
      try { n.disconnect(); } catch (e) { void e; }
    });
    nodes = null;
    live = null;
  }

  const shell = audioShell(host, (eng, api) => {
    startSource(eng);
    api.hint.textContent = '噪声正实时通过这个均衡器';
    loop = rafLoop(host, () => {
      live = nodes ? nodes.an.spectrumDb() : null;
      draw();
    });
    return () => {
      if (loop) { loop.stop(); loop = null; }
      stopSource();
      draw();
    };
  });

  /* ---------- 绘图 ---------- */

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const x0 = 44, x1 = W - 14, y0 = 26, y1 = H - 32;
    const PW = Math.max(20, x1 - x0);
    const PH = Math.max(20, y1 - y0);
    geo = { x0, y0, w: PW, h: PH };
    const M = Math.round(PW);
    const X = (f) => x0 + (Math.log(f / FMIN) / Math.log(FMAX / FMIN)) * PW;
    const Y = (db) => y1 - ((clamp(db, DBMIN, DBMAX) - DBMIN) / (DBMAX - DBMIN)) * PH;
    const F = (x) => FMIN * (FMAX / FMIN) ** (clamp((x - x0) / PW, 0, 1));

    /* 网格 + 刻度 */
    ctx.lineWidth = 1;
    [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach((f) => {
      const x = Math.round(X(f)) + 0.5;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
      label(ctx, f >= 1000 ? f / 1000 + 'k' : String(f), x, y1 + 14, C.fg, { align: 'center', size: 10 });
    });
    [-24, -12, 0, 12, 24].forEach((db) => {
      const y = Math.round(Y(db)) + 0.5;
      ctx.strokeStyle = db === 0 ? C.axis : C.grid;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      label(ctx, String(db), x0 - 6, y + 3, C.fg, { align: 'right', size: 10 });
    });
    label(ctx, 'dB', x0 - 6, y0 - 8, C.fg, { align: 'right', size: 10 });
    label(ctx, 'Hz', x1, y1 + 26, C.fg, { align: 'right', size: 10 });
    label(ctx, '在图上拖动：横向 → 中心频率，纵向 → 增益', x0 + 4, 14, C.fg, { size: 11 });

    /* 理论频响（每像素一个点） */
    const fs = nodes ? nodes.eng.sampleRate : 48000;
    const fArr = new Float64Array(M);
    for (let i = 0; i < M; i += 1) fArr[i] = FMIN * (FMAX / FMIN) ** (i / (M - 1));
    const tdb = biquadResponse(biquad('peaking', s.freq, s.Q, s.gain, fs), fArr, fs).magDb;

    /* 半增益带宽：从峰值向两侧走到响应等于峰值增益一半处 */
    let peakI = 0;
    for (let i = 1; i < M; i += 1) if (tdb[i] > tdb[peakI]) peakI = i;
    const half = s.gain / 2;
    let iL = peakI;
    let iR = peakI;
    while (iL > 0 && tdb[iL] > half) iL -= 1;
    while (iR < M - 1 && tdb[iR] > half) iR += 1;
    const bLo = fArr[iL];
    const bHi = fArr[iR];

    if (Math.abs(s.gain) > 0.5) {
      ctx.fillStyle = C.soft;
      ctx.fillRect(X(bLo), y0, Math.max(1, X(bHi) - X(bLo)), PH);
      const hy = Y(half);
      ctx.strokeStyle = C.fg;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(X(bLo), hy);
      ctx.lineTo(X(bHi), hy);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, '半增益带宽', (X(bLo) + X(bHi)) / 2, hy - 5, C.fg, { align: 'center', size: 10 });
    }

    /* 实测频谱：整条平移对齐到理论曲线的平均值，方便比形状 */
    if (live && nodes) {
      const sr = nodes.eng.sampleRate;
      const fftN = nodes.an.fftSize;
      const meas = new Float64Array(M);
      let sumM = 0;
      for (let i = 0; i < M; i += 1) {
        const pos = (fArr[i] * fftN) / sr;
        const b0 = Math.floor(pos);
        const fr = pos - b0;
        const v0 = b0 >= 0 && b0 < live.length ? live[b0] : -120;
        const v1 = b0 + 1 >= 0 && b0 + 1 < live.length ? live[b0 + 1] : v0;
        const v = v0 + (v1 - v0) * fr;
        meas[i] = v;
        sumM += v;
      }
      let sumT = 0;
      for (let i = 0; i < M; i += 1) sumT += tdb[i];
      const off = sumT / M - sumM / M;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(X(fArr[0]), y1);
      for (let i = 0; i < M; i += 1) ctx.lineTo(X(fArr[i]), Y(meas[i] + off));
      ctx.lineTo(X(fArr[M - 1]), y1);
      ctx.closePath();
      ctx.fillStyle = C.accent2;
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.restore();
      polyline(ctx, Array.from({ length: M }, (_, i) => [X(fArr[i]), Y(meas[i] + off)]), C.accent2, 1.2);

      let pk = 0;
      for (let i = 1; i < M; i += 1) if (meas[i] > meas[pk]) pk = i;
      ro.set('实测峰值', fmt(fArr[pk], 0) + ' Hz');
    } else {
      ro.set('实测峰值', '—');
      label(ctx, '点「▶ 播放」让真实噪声过一遍这个滤波器', (x0 + x1) / 2, y1 - 10, C.fg, { align: 'center', size: 11 });
    }

    /* 理论曲线 */
    polyline(ctx, Array.from({ length: M }, (_, i) => [X(fArr[i]), Y(tdb[i])]), C.accent, 2.4);

    /* 中心频率游标 + 把手 */
    const cx = X(s.freq);
    const cy = Y(s.gain);
    ctx.strokeStyle = C.fg;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, fmt(s.freq, 0) + ' Hz', clamp(cx, x0 + 2, x1 - 40), y0 + 12, C.accent, { size: 10 });

    /* 读数 */
    ro.set('中心频率', fmt(s.freq, 0) + ' Hz');
    ro.set('增益', (s.gain > 0 ? '+' : '') + fmt(s.gain, 1) + ' dB');
    ro.set('Q', fmt(s.Q, 2));
    ro.set('半增益带宽', Math.abs(s.gain) > 0.5
      ? fmt(bLo, 0) + '–' + fmt(bHi, 0) + ' Hz（' + fmt(Math.log2(bHi / bLo), 2) + ' 八度）'
      : '增益为 0，无带宽可言');
  }

  /* ---------- 拖拽 ---------- */

  function onDrag(x, y) {
    s.freq = clamp(F(x), FMIN, FMAX);
    const u = clamp(1 - (y - geo.y0) / geo.h, 0, 1);
    s.gain = DBMIN + u * (DBMAX - DBMIN);
    setSliderRow(sliders, 0, s.freq, 0, NAMES[0]);
    setSliderRow(sliders, 1, Math.round(s.gain * 10) / 10, 2, NAMES[1]);
    applyFilter();
    draw();
  }

  bindPointer(cv.canvas, {
    down(id, x, y) { void id; onDrag(x, y); },
    move(id, x, y) { void id; onDrag(x, y); },
  });

  /* ---------- 滑块 ---------- */

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'freq', label: '中心频率', min: 40, max: 12000, step: 1, value: s.freq },
        { name: 'gain', label: '增益', min: -24, max: 24, step: 0.5, value: s.gain },
        { name: 'Q', label: 'Q（品质因数）', min: 0.3, max: 12, step: 0.1, value: s.Q },
        { name: 'volume', label: '音量', min: 0, max: 0.5, step: 0.02, value: s.volume },
      ],
    },
    (st) => {
      s.freq = st.freq;
      s.gain = st.gain;
      s.Q = st.Q;
      s.volume = st.volume;
      applyFilter();
      if (!loop) draw();
    },
  );

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      shell.stop();
      if (loop) loop.stop();
    },
  };
}

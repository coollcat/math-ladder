/* =========================================================================
 * lab 组件：delay-comb（延迟线 + 反馈 = 时域一串回声，频域一把梳子）
 * -------------------------------------------------------------------------
 * 演示什么：
 *   同一件事的两副面孔。一条延迟线加反馈（y[n] = x[n] + g·y[n−D]）：
 *     时域看：冲激响应是 δ[n] + g·δ[n−D] + g²·δ[n−2D] + …，一串等间隔、逐级变小的回声；
 *     频域看：|H(f)| = |1 / (1 − g·e^{−j2πfD})|，一把齿距严格等于 1/D 的梳子。
 *   齿距 = 1/D 是这课的全部要点：延迟越短，齿越稀（听起来越「金属」）；
 *   反馈越深，齿越尖（峰谷差 = 20log₁₀((1+g)/(1−g))）。
 *
 * 用法（课文里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "delay-comb", "title": "把延迟从 10 ms 拖到 2 ms，听那把梳子怎么张开" }
 *   ```
 *
 * 字段（都有默认值，最小 spec 只写 type + title 即可）：
 *   time     延迟时间 D（ms）  默认 10（齿距 1/D = 100 Hz）
 *   fb       反馈系数 g（0–0.95） 默认 0.7
 *   wet      湿声（梳状支路）占比 0–1  默认 1（纯梳状，理论最干净）
 *   damp     反馈回路里的低通截止（Hz）默认 6000（模拟每次反射都变闷一点）
 *   fmax     频域图上限（Hz） 默认 4000
 *   src      "noise"（默认白噪声，看梳子）| "impulse"（脉冲串，听回声）
 *   volume   播放音量  默认 0.2
 *
 * 能拖什么：
 *   上图（时域）：拖第一个回声那个方块——横向改延迟 D，纵向改反馈 g。
 *   下图（频域）：横向拖动改 D，直接看梳齿的疏密跟着变。
 *
 * 出声：是。带「■ 停止」按钮，离开视口自动停，默认音量 0.2。
 *   注：反馈会把能量堆起来，所以湿声支路后面接了一个自动补偿增益
 *   1/((1−wet)+wet/(1−g))，让梳子的峰始终落在 0 dB——这样你听到的是
 *   「音色变了」而不是「变响了」。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented,
  buildReadout, rafLoop, audioShell, polyline, label, clamp, fmt,
} from '../core.js';
import { makeNoiseBuffer, chain } from '../engines/audio.js';

const TMAX = 0.3;         // 时域窗（s）
const DMAX = 100;         // 延迟上限（ms）

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    time: spec.time ?? 10,        // ms
    fb: spec.fb ?? 0.7,
    wet: spec.wet ?? 1,
    damp: spec.damp ?? 6000,
    volume: spec.volume ?? 0.2,
    src: spec.src === 'impulse' ? 'impulse' : 'noise',
  };
  const FMAX = spec.fmax ?? 4000;

  const cv = setupCanvas(host, 380);

  const seg = buildSegmented(
    [
      { label: '白噪声（看梳子）', value: 'noise' },
      { label: '脉冲串（听回声）', value: 'impulse' },
    ],
    s.src,
    (v) => {
      s.src = v;
      rebuildSource();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ 延迟时间: '—', 齿距: '—', 反馈: '—', 峰谷差: '—', '回声（−60 dB）': '—' });
  host.appendChild(ro.box);

  let nodes = null;
  let loop = null;
  let timer = null;
  let live = null;
  let geo = null;

  /* ---------- 模型 ---------- */

  const D = () => s.time / 1000;                 // 延迟（s）
  const norm = () => 1 / ((1 - s.wet) + s.wet / Math.max(1e-3, 1 - s.fb));
  /* 归一化后的梳状频响（dB）：峰落在 0 dB，谷深就是峰谷差 */
  function combDb(f) {
    const th = 2 * Math.PI * f * D();
    const re = 1 - s.fb * Math.cos(th);
    const im = s.fb * Math.sin(th);
    const d2 = re * re + im * im || 1e-12;
    const hre = (1 - s.wet) + (s.wet * re) / d2;
    const him = -(s.wet * im) / d2;
    return 20 * Math.log10(Math.max(1e-6, Math.hypot(hre, him) * norm()));
  }
  const notchDb = () => 20 * Math.log10(Math.max(1e-6,
    (((1 - s.wet) + s.wet / (1 + s.fb)) * norm())));
  const echoCount = () => (s.fb >= 0.999 ? Infinity : Math.ceil(3 / -Math.log10(Math.max(1e-3, s.fb))));

  /* ---------- 音频 ---------- */

  function applyParams() {
    if (!nodes) return;
    const t = nodes.ctx.currentTime;
    nodes.dly.delayTime.setTargetAtTime(D(), t, 0.02);
    nodes.fbG.gain.setTargetAtTime(s.fb, t, 0.02);
    nodes.lp.frequency.setTargetAtTime(s.damp, t, 0.02);
    nodes.wetG.gain.setTargetAtTime(s.wet * norm(), t, 0.05);
    nodes.dryG.gain.setTargetAtTime((1 - s.wet) * norm(), t, 0.05);
    nodes.eng.setMasterGain(s.volume);
  }

  function blip() {
    const ctx = nodes.ctx;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.01);
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, 0.012, 'white');
    src.start(t);
    src.stop(t + 0.02);
    chain(src, g, nodes.input);
    src.onended = () => {
      try { src.disconnect(); } catch (e) { void e; }
      try { g.disconnect(); } catch (e) { void e; }
    };
  }

  function startSource() {
    if (!nodes) return;
    if (s.src === 'noise') {
      const src = nodes.ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(nodes.ctx, 2, 'white');
      src.loop = true;
      const g = nodes.ctx.createGain();
      g.gain.value = 0.5;
      chain(src, g, nodes.input);
      src.start();
      nodes.cont = { src, g };
    } else {
      blip();
      timer = setInterval(blip, 700);
    }
  }

  function stopSource() {
    if (timer) { clearInterval(timer); timer = null; }
    if (nodes && nodes.cont) {
      try { nodes.cont.src.stop(); } catch (e) { void e; }
      try { nodes.cont.src.disconnect(); } catch (e) { void e; }
      try { nodes.cont.g.disconnect(); } catch (e) { void e; }
      nodes.cont = null;
    }
  }

  function rebuildSource() {
    if (!nodes) return;
    stopSource();
    startSource();
  }

  function stopNodes() {
    stopSource();
    if (!nodes) return;
    ['input', 'dly', 'fbG', 'lp', 'wetG', 'dryG', 'outG'].forEach((k) => {
      try { nodes[k].disconnect(); } catch (e) { void e; }
    });
    nodes = null;
    live = null;
  }

  const shell = audioShell(host, (eng, api) => {
    const ctx = eng.ctx;
    const input = ctx.createGain();
    const dly = ctx.createDelay(1);
    const fbG = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    const wetG = ctx.createGain();
    const dryG = ctx.createGain();
    const outG = ctx.createGain();
    dly.delayTime.value = D();
    fbG.gain.value = s.fb;
    lp.type = 'lowpass';
    lp.frequency.value = s.damp;
    chain(input, dly, wetG, outG);      // 湿声：延迟后的信号
    chain(dly, lp, fbG, dly);           // 反馈环（环里有 DelayNode，Web Audio 允许）
    chain(input, dryG, outG);           // 干声
    chain(outG, eng.master);
    const an = eng.analyser({ fftSize: 8192, smoothing: 0.6, input: outG });
    an.node.minDecibels = -120;
    an.node.maxDecibels = 0;
    nodes = { eng, ctx, input, dly, fbG, lp, wetG, dryG, outG, an, cont: null };
    applyParams();
    startSource();
    api.hint.textContent = '改延迟听「金属味」，改反馈听「回声堆」';
    loop = rafLoop(host, () => {
      live = nodes ? nodes.an.spectrumDb() : null;
      draw();
    });
    return () => {
      if (loop) { loop.stop(); loop = null; }
      stopNodes();
      draw();
    };
  });

  /* ---------- 绘图 ---------- */

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const x0 = 44, x1 = W - 16;
    const PW = Math.max(20, x1 - x0);
    const XT = (t) => x0 + (clamp(t, 0, TMAX) / TMAX) * PW;
    const TT = (x) => ((clamp(x, x0, x1) - x0) / PW) * TMAX;

    /* ===== 上：时域冲激响应（一串回声） ===== */
    const ay0 = 30, ay1 = 168;
    const AH = ay1 - ay0;
    const YA = (a) => ay1 - clamp(a, 0, 1) * AH;
    geo = { x0, x1, PW, TT, ay0, ay1, by0: 206, by1: 344 };

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let t = 0; t <= TMAX + 1e-9; t += 0.05) {
      const x = Math.round(XT(t)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, ay0);
      ctx.lineTo(x, ay1);
      ctx.stroke();
      label(ctx, (t * 1000).toFixed(0), x, ay1 + 13, C.fg, { align: 'center', size: 10 });
    }
    label(ctx, 'ms', x1, ay1 + 13, C.fg, { align: 'right', size: 10 });
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(x0, Math.round(ay1) + 0.5);
    ctx.lineTo(x1, Math.round(ay1) + 0.5);
    ctx.stroke();

    const KMAX = 60;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    let lastTop = null;
    for (let k = 0; k <= KMAX; k += 1) {
      const t = k * D();
      if (t > TMAX) break;
      const a = s.fb ** k;
      const x = Math.round(XT(t)) + 0.5;
      const y = YA(a);
      ctx.beginPath();
      ctx.moveTo(x, ay1);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(x, y, k === 0 ? 3 : 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (k === 1) lastTop = [x, y];
    }
    /* 指数衰减包络 g^(t/D) */
    const env = [];
    for (let x = x0; x <= x1; x += 2) {
      const a = s.fb ** (TT(x) / D());
      env.push([x, YA(a)]);
    }
    polyline(ctx, env, C.accent2, 1.4, [5, 4]);

    if (lastTop) {
      ctx.fillStyle = C.named('red');
      ctx.fillRect(lastTop[0] - 5, lastTop[1] - 5, 10, 10);
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(lastTop[0] - 5, lastTop[1] - 5, 10, 10);
    }
    label(ctx, '时域：等间隔回声（拖红方块：横向改延迟，纵向改反馈）', x0, ay0 - 10, C.fg, { size: 11 });
    label(ctx, '幅度', x0 - 6, ay0 + 6, C.fg, { align: 'right', size: 10 });

    /* ===== 下：频域梳状频响 ===== */
    const by0 = 206, by1 = 344;
    const DB0 = 6, DB1 = -42;
    const YB = (db) => by1 - ((clamp(db, DB1, DB0) - DB1) / (DB0 - DB1)) * (by1 - by0);
    const XF = (f) => x0 + (clamp(f, 0, FMAX) / FMAX) * PW;
    const M = Math.round(PW);

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    [0, -10, -20, -30, -40].forEach((db) => {
      const y = Math.round(YB(db)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      label(ctx, String(db), x0 - 6, y + 3, C.fg, { align: 'right', size: 10 });
    });
    const fStep = FMAX > 3000 ? 1000 : 500;
    for (let f = 0; f <= FMAX; f += fStep) {
      const x = Math.round(XF(f)) + 0.5;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(x, by0);
      ctx.lineTo(x, by1);
      ctx.stroke();
      label(ctx, f === 0 ? '0' : f / 1000 + 'k', x, by1 + 14, C.fg, { align: 'center', size: 10 });
    }
    label(ctx, 'Hz', x1, by1 + 14, C.fg, { align: 'right', size: 10 });
    label(ctx, 'dB', x0 - 6, by0 - 6, C.fg, { align: 'right', size: 10 });

    const fArr = new Float64Array(M);
    for (let i = 0; i < M; i += 1) fArr[i] = (i / (M - 1)) * FMAX;
    const tdb = new Float64Array(M);
    for (let i = 0; i < M; i += 1) tdb[i] = combDb(fArr[i]);

    /* 实测频谱（整条平移对齐到理论曲线，只比形状） */
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
        const v1 = b0 + 1 < live.length ? live[b0 + 1] : v0;
        const v = v0 + (v1 - v0) * fr;
        meas[i] = v;
        sumM += v;
      }
      let sumT = 0;
      for (let i = 0; i < M; i += 1) sumT += tdb[i];
      const off = sumT / M - sumM / M;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0, by1);
      for (let i = 0; i < M; i += 1) ctx.lineTo(XF(fArr[i]), YB(meas[i] + off));
      ctx.lineTo(x1, by1);
      ctx.closePath();
      ctx.fillStyle = C.accent2;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.restore();
      polyline(ctx, Array.from({ length: M }, (_, i) => [XF(fArr[i]), YB(meas[i] + off)]), C.accent2, 1.2);
    } else {
      label(ctx, '点「▶ 播放」看真实频谱长出同样的齿', x0 + 2, by1 - 8, C.fg, { size: 11 });
    }

    polyline(ctx, Array.from({ length: M }, (_, i) => [XF(fArr[i]), YB(tdb[i])]), C.accent, 2.2);

    /* 齿距标尺：相邻两个峰之间那一段就是 1/D */
    const pitch = 1 / D();
    if (pitch * 2 <= FMAX) {
      const ya = by0 + 14;
      ctx.strokeStyle = C.named('green');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(XF(0), ya);
      ctx.lineTo(XF(pitch), ya);
      ctx.moveTo(XF(0), ya - 4);
      ctx.lineTo(XF(0), ya + 4);
      ctx.moveTo(XF(pitch), ya - 4);
      ctx.lineTo(XF(pitch), ya + 4);
      ctx.stroke();
      label(ctx, '齿距 1/D = ' + fmt(pitch, 0) + ' Hz', XF(pitch) + 6, ya + 4, C.named('green'), { size: 10 });
    }
    /* 谷深 */
    const nd = notchDb();
    ctx.strokeStyle = C.named('red');
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    const yn = YB(nd);
    ctx.beginPath();
    ctx.moveTo(x0, yn);
    ctx.lineTo(x1, yn);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '谷深 ' + fmt(nd, 1) + ' dB', x1 - 2, yn - 4, C.named('red'), { align: 'right', size: 10 });
    label(ctx, '频域：一把齿距严格等于 1/D 的梳子（横向拖动改延迟）', x0, by0 - 8, C.fg, { size: 11 });

    /* 读数 */
    ro.set('延迟时间', fmt(s.time, 2) + ' ms');
    ro.set('齿距', fmt(pitch, 0) + ' Hz');
    ro.set('反馈', fmt(s.fb, 2));
    ro.set('峰谷差', fmt(-nd, 1) + ' dB');
    const n = echoCount();
    ro.set('回声（−60 dB）', isFinite(n) ? n + ' 次 / ' + fmt(n * s.time, 0) + ' ms' : '不衰减');
  }

  /* ---------- 拖拽 ---------- */

  function onDragTime(x, y) {
    s.time = clamp(geo.TT(x) * 1000, 0.5, DMAX);
    s.fb = clamp((geo.ay1 - y) / (geo.ay1 - geo.ay0), 0, 0.95);
    setSlider(0, Math.round(s.time * 100) / 100);
    setSlider(1, Math.round(s.fb * 100) / 100);
    applyParams();
    draw();
  }

  function onDragFreq(x) {
    s.time = clamp(geo.TT(x) * 1000, 0.5, DMAX);
    setSlider(0, Math.round(s.time * 100) / 100);
    applyParams();
    draw();
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geo) return null;
      if (y >= geo.ay0 - 14 && y <= geo.ay1 + 4) return 'time';
      if (y >= geo.by0 - 10 && y <= geo.by1 + 4) return 'freq';
      return null;
    },
    move(id, x, y) {
      if (!geo) return;
      if (id === 'time') onDragTime(x, y);
      else if (id === 'freq') onDragFreq(x, y);
    },
  });

  const NAMES = ['time', 'fb', 'wet', 'damp', 'volume'];
  const sliders = buildSliders(
    {
      sliders: [
        { name: 'time', label: '延迟 D（ms）', min: 0.5, max: DMAX, step: 0.1, value: s.time },
        { name: 'fb', label: '反馈 g', min: 0, max: 0.95, step: 0.01, value: s.fb },
        { name: 'wet', label: '湿声占比', min: 0, max: 1, step: 0.02, value: s.wet },
        { name: 'damp', label: '反馈阻尼（低通）', min: 500, max: 12000, step: 100, value: s.damp },
        { name: 'volume', label: '音量', min: 0, max: 0.5, step: 0.02, value: s.volume },
      ],
    },
    (st) => {
      s.time = st.time;
      s.fb = st.fb;
      s.wet = st.wet;
      s.damp = st.damp;
      s.volume = st.volume;
      applyParams();
      if (!loop) draw();
    },
  );

  function setSlider(i, v) {
    const row = sliders.box.children[i];
    if (!row) return;
    const range = row.querySelector('input');
    const val = row.querySelector('.ml-slider__val');
    if (range) range.value = String(v);
    if (val) val.textContent = fmt(v, 2);
    sliders.state[NAMES[i]] = v;
  }

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

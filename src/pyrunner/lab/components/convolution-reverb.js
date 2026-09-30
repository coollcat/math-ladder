/* =========================================================================
 * lab 组件：convolution-reverb（混响 = 把声音和房间脉冲响应做卷积）
 * -------------------------------------------------------------------------
 * 演示什么：
 *   混响的数学定义就是卷积：wet = dry * h，其中 h 是房间的脉冲响应（IR）。
 *   本组件用 audio.makeImpulse 现场合成一条「预延迟 + 指数衰减噪声」的 IR，
 *   喂给 ConvolverNode，让你一边听干湿差别，一边看着 IR 的形状。
 *   上图是 IR 时域波形，中图是能量衰减曲线（EDC，分贝对时间），
 *   下图是实时输出电平——击掌之后那条拖长的尾巴就是混响。
 *
 * 用法（课文里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "convolution-reverb", "title": "把混响时间从 0.3 s 拖到 3 s" }
 *   ```
 *
 * 字段（都有默认值，最小 spec 只写 type + title 即可）：
 *   seconds   指数衰减噪声的长度（s） 默认 1.5
 *   decay     衰减指数 k，包络 (1−t/T)^k  默认 3（越大掉得越猛）
 *   predelay  预延迟（s），直达声与第一批反射声之间的空档  默认 0.02
 *   wet       湿声占比 0–1   默认 0.6
 *   src       音源 "clap"（默认击掌脉冲）| "noise"（白噪声）| "tone"（正弦短音）
 *   volume    播放音量       默认 0.2
 *
 * 能拖什么：
 *   上图波形里两个把手——左边三角是「预延迟」（拖它改直达声之后的空档），
 *   右边方块是「混响尾巴末端」（拖它改 IR 长度，也就是混响时间）。
 *   衰减指数用滑块改：图里能直接看到包络从「陡降」变成「缓缓落下」。
 *
 * 出声：是。带「■ 停止」按钮，离开视口自动停，默认音量 0.2。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented,
  buildReadout, rafLoop, audioShell, polyline, label, clamp, fmt,
  setSliderRow,
  clearBg,
} from '../core.js';
import { makeImpulse, chain } from '../engines/audio.js';

const TAX = 3.2;          // 时间轴固定量程（s）：定死它，拖把手时画面才不会跟着伸缩
const NRND = 1024;
/* 画波形用的确定性伪随机序列（每帧长得一样，噪声才不会闪） */
const RND = (() => {
  const a = new Float64Array(NRND);
  let x = 20240904;
  for (let i = 0; i < NRND; i += 1) {
    x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff;
    a[i] = (x / 0x7fffffff) * 2 - 1;
  }
  return a;
})();

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    seconds: spec.seconds ?? 1.5,
    decay: spec.decay ?? 3,
    predelay: spec.predelay ?? 0.02,
    wet: spec.wet ?? 0.6,
    volume: spec.volume ?? 0.2,
    src: ['clap', 'noise', 'tone'].includes(spec.src) ? spec.src : 'clap',
  };

  const cv = setupCanvas(host, 380);

  const seg = buildSegmented(
    [
      { label: '击掌脉冲', value: 'clap' },
      { label: '白噪声', value: 'noise' },
      { label: '正弦短音', value: 'tone' },
    ],
    s.src,
    (v) => {
      s.src = v;
      rebuildSource();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ 有效混响时间: '—', 预延迟: '—', 衰减指数: '—', '直达 : 混响': '—', 'IR 长度': '—' });
  host.appendChild(ro.box);

  let nodes = null;
  let loop = null;
  let timer = null;        // 击掌/短音的重复定时器
  let irTimer = null;      // 重建 IR 的防抖定时器
  const trace = [];        // 实时电平轨迹（dB）
  let geo = null;

  /* ---------- 模型 ---------- */

  /* IR 包络：预延迟之前为零，之后是 (1−u)^decay */
  const envAt = (t) => {
    if (t < s.predelay) return 0;
    const u = clamp((t - s.predelay) / Math.max(1e-6, s.seconds), 0, 1);
    return (1 - u) ** s.decay;
  };
  /* 衰减 60 dB 所需的时间（RT60）——包络不是理想直线，所以比 IR 长度略短 */
  const t60 = () => s.seconds * (1 - 10 ** (-3 / Math.max(0.05, s.decay)));

  /* ---------- 音频 ---------- */

  function buildIR() {
    if (!nodes) return;
    nodes.conv.buffer = makeImpulse(nodes.ctx, {
      seconds: s.seconds,
      decay: s.decay,
      predelay: s.predelay,
    });
  }

  /* 换 IR 要重算整条缓冲（几万个采样点），拖滑块时防抖一下 */
  function scheduleIR() {
    if (!nodes) return;
    if (irTimer) clearTimeout(irTimer);
    irTimer = setTimeout(() => {
      irTimer = null;
      buildIR();
    }, 90);
  }

  function applyWet() {
    if (!nodes) return;
    const t = nodes.ctx.currentTime;
    nodes.wetG.gain.setTargetAtTime(s.wet, t, 0.05);
    nodes.dryG.gain.setTargetAtTime(1 - s.wet, t, 0.05);
    nodes.eng.setMasterGain(s.volume);
  }

  function blip(kind) {
    const ctx = nodes.ctx;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.05);
    let src;
    if (kind === 'tone') {
      src = ctx.createOscillator();
      src.type = 'sine';
      src.frequency.value = 330;
      src.start(t);
      src.stop(t + 0.09);
    } else {
      src = ctx.createBufferSource();
      src.buffer = nodes.eng.makeNoiseBuffer(0.02, 'white');
      src.start(t);
      src.stop(t + 0.09);
    }
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
      src.buffer = nodes.eng.makeNoiseBuffer(2, 'white');
      src.loop = true;
      const g = nodes.ctx.createGain();
      g.gain.value = 0.35;
      chain(src, g, nodes.input);
      src.start();
      nodes.cont = { src, g };
    } else {
      blip(s.src);
      timer = setInterval(() => blip(s.src), 900);
    }
  }

  function stopSource() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
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
    ['input', 'conv', 'wetG', 'dryG', 'outG'].forEach((k) => {
      try { nodes[k].disconnect(); } catch (e) { void e; }
    });
    nodes = null;
  }

  const shell = audioShell(host, (eng, api) => {
    const ctx = eng.ctx;
    const input = ctx.createGain();
    const conv = ctx.createConvolver();
    const wetG = ctx.createGain();
    const dryG = ctx.createGain();
    const outG = ctx.createGain();
    chain(input, dryG, outG);
    chain(input, conv, wetG, outG);
    chain(outG, eng.master);
    const an = eng.analyser({ fftSize: 1024, smoothing: 0.4, input: outG });
    nodes = { eng, ctx, input, conv, wetG, dryG, outG, an, cont: null };
    buildIR();
    applyWet();
    startSource();
    api.hint.textContent = '请戴耳机或把音量开小再听尾巴';
    loop = rafLoop(host, () => {
      if (!nodes) return;
      const lv = nodes.an.levelDb();
      trace.push(isFinite(lv) ? lv : -90);
      if (trace.length > 200) trace.shift();
      draw();
    });
    return () => {
      if (loop) { loop.stop(); loop = null; }
      if (irTimer) { clearTimeout(irTimer); irTimer = null; }
      trace.length = 0;
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
    clearBg(ctx, W, H, C);

    const x0 = 40, x1 = W - 16;
    const PW = Math.max(20, x1 - x0);
    const X = (t) => x0 + (clamp(t, 0, TAX) / TAX) * PW;
    const T = (x) => ((clamp(x, x0, x1) - x0) / PW) * TAX;

    /* ===== 上：脉冲响应波形 ===== */
    const ay0 = 26, ay1 = 168;
    const amid = (ay0 + ay1) / 2;
    const aamp = (ay1 - ay0) / 2 - 8;
    geo = { x0, x1, PW, ay0, ay1, T };

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let t = 0; t <= TAX; t += 0.5) {
      const x = Math.round(X(t)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, ay0);
      ctx.lineTo(x, ay1);
      ctx.stroke();
      label(ctx, t.toFixed(1), x, ay1 + 13, C.fg, { align: 'center', size: 10 });
    }
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(x0, Math.round(amid) + 0.5);
    ctx.lineTo(x1, Math.round(amid) + 0.5);
    ctx.stroke();

    /* 预延迟区间：这段是「什么都没有」，它告诉耳朵房间有多大 */
    if (s.predelay > 0.001) {
      ctx.fillStyle = C.soft;
      ctx.fillRect(X(0), ay0, X(s.predelay) - X(0), ay1 - ay0);
      label(ctx, '预延迟', X(s.predelay / 2), ay0 + 12, C.fg, { align: 'center', size: 10 });
    }

    /* 波形：确定性噪声 × 包络 */
    const pts = [];
    for (let x = x0; x <= x1; x += 1) {
      const t = T(x);
      const k = Math.floor(((x - x0) / PW) * NRND) % NRND;
      pts.push([x, amid - RND[k] * envAt(t) * aamp]);
    }
    polyline(ctx, pts, C.accent, 1);
    /* 包络线 */
    const envUp = [];
    const envDn = [];
    for (let x = x0; x <= x1; x += 2) {
      const e = envAt(T(x)) * aamp;
      envUp.push([x, amid - e]);
      envDn.push([x, amid + e]);
    }
    polyline(ctx, envUp, C.accent2, 1.8);
    polyline(ctx, envDn, C.accent2, 1.8);

    /* 两个把手 */
    const xPre = X(s.predelay);
    const xEnd = X(s.predelay + s.seconds);
    ctx.fillStyle = C.named('green');
    ctx.beginPath();
    ctx.moveTo(xPre, ay0 - 2);
    ctx.lineTo(xPre - 6, ay0 - 12);
    ctx.lineTo(xPre + 6, ay0 - 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.named('red');
    ctx.fillRect(xEnd - 5, amid - 6, 10, 12);
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(xEnd - 5, amid - 6, 10, 12);
    label(ctx, '混响末端（拖）', xEnd, amid + 24, C.named('red'), { align: 'right', size: 10 });
    label(ctx, '脉冲响应 h(t)：湿声就是干声跟它卷积', x0 + 2, ay0 - 14, C.fg, { size: 11 });
    label(ctx, 's', x1, ay1 + 13, C.fg, { align: 'right', size: 10 });

    /* ===== 中：能量衰减曲线 ===== */
    const by0 = 208, by1 = 322;
    const DB0 = 5, DB1 = -70;
    const YB = (db) => by1 - ((clamp(db, DB1, DB0) - DB1) / (DB0 - DB1)) * (by1 - by0);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    [0, -20, -40, -60].forEach((db) => {
      const y = Math.round(YB(db)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      label(ctx, String(db), x0 - 6, y + 3, C.fg, { align: 'right', size: 10 });
    });
    for (let t = 0; t <= TAX; t += 0.5) {
      const x = Math.round(X(t)) + 0.5;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(x, by0);
      ctx.lineTo(x, by1);
      ctx.stroke();
    }
    label(ctx, 'dB', x0 - 6, by0 - 6, C.fg, { align: 'right', size: 10 });

    /* 实际 EDC：包络取 20log10 */
    const edc = [];
    for (let x = x0; x <= x1; x += 2) {
      const e = envAt(T(x));
      let db = -90;
      if (e > 1e-6) db = 20 * Math.log10(e);
      edc.push([x, YB(Math.max(db, DB1))]);
    }
    polyline(ctx, edc, C.accent, 2.2);
    /* 理想直线：0 dB 起，RT60 处正好 −60 dB */
    const rt = t60();
    polyline(ctx, [[X(s.predelay), YB(0)], [X(s.predelay + rt), YB(-60)]], C.fg, 1.4, [5, 4]);
    const xr = X(s.predelay + rt);
    ctx.strokeStyle = C.named('green');
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xr, by0);
    ctx.lineTo(xr, by1);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'RT60 = ' + fmt(rt, 2) + ' s', xr + 4, by0 + 12, C.named('green'), { size: 10 });
    label(ctx, '能量衰减曲线（实线=实际，虚线=理想直线衰减）', x0 + 2, by0 - 8, C.fg, { size: 11 });

    /* ===== 下：实时输出电平 ===== */
    const cy0 = 344, cy1 = 372;
    ctx.fillStyle = C.soft;
    ctx.fillRect(x0, cy0, PW, cy1 - cy0);
    if (trace.length > 1) {
      const n = trace.length;
      const ptsL = [];
      for (let i = 0; i < n; i += 1) {
        const x = x0 + (i / 199) * PW;
        const u = clamp((trace[i] + 60) / 60, 0, 1);
        ptsL.push([x, cy1 - u * (cy1 - cy0)]);
      }
      ctx.beginPath();
      ctx.moveTo(ptsL[0][0], cy1);
      ptsL.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(ptsL[n - 1][0], cy1);
      ctx.closePath();
      ctx.fillStyle = C.accent2;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
      polyline(ctx, ptsL, C.accent2, 1.4);
      label(ctx, '实时输出电平（最近约 3 秒）', x0 + 2, cy0 - 5, C.fg, { size: 10 });
    } else {
      label(ctx, '点「▶ 播放」听干声与湿声的差别', x0 + 2, cy0 + 16, C.fg, { size: 11 });
    }

    /* 读数 */
    ro.set('有效混响时间', fmt(rt, 2) + ' s');
    ro.set('预延迟', fmt(s.predelay * 1000, 0) + ' ms');
    ro.set('衰减指数', fmt(s.decay, 2));
    ro.set('直达 : 混响', fmt(1 - s.wet, 2) + ' : ' + fmt(s.wet, 2));
    ro.set('IR 长度', fmt(s.seconds, 2) + ' s');
  }

  /* ---------- 拖拽 ---------- */

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geo || y < geo.ay0 - 16 || y > geo.ay1) return null;
      if (Math.abs(x - geo.x0 - (s.predelay / TAX) * geo.PW) < 12) return 'pre';
      if (Math.abs(x - geo.x0 - ((s.predelay + s.seconds) / TAX) * geo.PW) < 14) return 'end';
      return null;
    },
    move(id, x, y) {
      void y;
      if (!geo) return;
      const t = geo.T(x);
      if (id === 'pre') {
        s.predelay = clamp(t, 0, 0.25);
        setSliderRow(sliders, 2, Math.round(s.predelay * 100) / 100, 2, NAMES[2]);
      } else if (id === 'end') {
        s.seconds = clamp(t - s.predelay, 0.1, 3);
        setSliderRow(sliders, 0, Math.round(s.seconds * 100) / 100, 2, NAMES[0]);
      }
      scheduleIR();
      draw();
    },
  });

  const NAMES = ['seconds', 'decay', 'predelay', 'wet', 'volume'];
  const sliders = buildSliders(
    {
      sliders: [
        { name: 'seconds', label: '混响长度', min: 0.1, max: 3, step: 0.05, value: s.seconds },
        { name: 'decay', label: '衰减指数 k', min: 0.5, max: 8, step: 0.1, value: s.decay },
        { name: 'predelay', label: '预延迟', min: 0, max: 0.25, step: 0.005, value: s.predelay },
        { name: 'wet', label: '湿声占比', min: 0, max: 1, step: 0.02, value: s.wet },
        { name: 'volume', label: '音量', min: 0, max: 0.5, step: 0.02, value: s.volume },
      ],
    },
    (st) => {
      s.seconds = st.seconds;
      s.decay = st.decay;
      s.predelay = st.predelay;
      s.wet = st.wet;
      s.volume = st.volume;
      scheduleIR();
      applyWet();
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
      if (irTimer) clearTimeout(irTimer);
    },
  };
}

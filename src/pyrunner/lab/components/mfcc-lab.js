/* =========================================================================
 * lab 组件：mfcc-lab（MFCC：把一帧声音压成 13 个数字）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "mfcc-lab",
 *     "title": "六级流水线：波形 → 频谱 → 梅尔 → 对数 → DCT → 前 13 维"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   nFilters  梅尔滤波器个数，默认 26
 *   nCeps     保留的倒谱维数，默认 13
 *   frameLen  帧长（样点 @16 kHz），默认 512（32 ms；**必须是 2 的整数次幂**，
 *             否则 dsp.mfcc 里滤波组矩阵与频谱长度对不上）
 *   hop       帧移（样点），默认 160（10 ms）
 *   frame     起始帧号，默认取信号中部
 *   fs        内置信号的采样率，默认 16000
 *
 * 六块图就是整条流水线，左→右、上→下读：
 *   ① 一帧波形（已加汉宁窗）  ② 它的功率谱（dB）
 *   ③ 过梅尔滤波组后的 26 个能量  ④ 取对数后的 26 个值
 *   ⑤ DCT 之后的倒谱（前 nCeps 个高亮）  ⑥ 最后留下的那 nCeps 维
 *
 * 能玩什么：
 *   · 拖最上面波形条里的橙色指针换帧：元音段和静音段的 MFCC 差得很远
 *   · 在 ⑤ 号图里左右拖那条紫色竖线改保留维数：维数越少越"糊"，
 *     但 12 维就已经能把元音区分开——这正是当年语音识别选 12~13 的原因
 *   · 点「🎤 用麦克风」实时看自己的 MFCC 随口型变化
 *
 * 说明：⑤ 号图与 ⑥ 号图从 c1 画起。c0 是这一帧的总能量（量级比其余系数大
 *       一个数量级，画在一起会把别的全压平），它的数值放在读数栏里。
 *
 * 出声：否。麦克风：是——必须点按钮触发授权，失败给明确提示，只分析不回放。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildToolbar, mkBtn, el, label, polyline, clamp, fmt, engine, audio, rafLoop,
  setSliderRow,
  normalizeTo,
  clearBg,
  setSliderMax,
} from '../core.js';

const FS = 16000;
const PADL = 12;
const PADR = 12;

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    nFilters: spec.nFilters ?? 26,
    nCeps: spec.nCeps ?? 13,
    frameLen: spec.frameLen ?? 512,
    hop: spec.hop ?? 160,
    fs: spec.fs ?? FS,
  };

  let dsp = null;
  let sig = null;
  let nFrames = 0;
  let idx = spec.frame ?? 40;
  let fb = null;
  let cache = null;      // dsp.mfcc 的整段结果，按 (nFilters, nCeps) 缓存
  let stage = null;      // 各级中间结果

  const cv = setupCanvas(host, 450);
  const ro = buildReadout({
    帧号: '—', c0: '—', 维数: '—', '与引擎一致': '—', 音源: '—',
  });
  host.appendChild(ro.box);

  const TOP = { y: 22, h: 40 };
  const GY = 74;
  const GH = 356;
  const GAPX = 10;
  const GAPY = 14;

  const plotW = () => Math.max(120, cv.W - PADL - PADR);
  function box(i) {
    const w = plotW();
    const colW = (w - 2 * GAPX) / 3;
    const rowH = (GH - GAPY) / 2;
    return {
      x: PADL + (i % 3) * (colW + GAPX),
      y: GY + Math.floor(i / 3) * (rowH + GAPY),
      w: colW,
      h: rowH,
    };
  }
  /* 面板里的作图区（去掉标题那一行） */
  const area = (b) => ({ x: b.x, y: b.y + 16, w: b.w, h: b.h - 20 });

  const hint = el('span', 'ml-lab__hint', '');
  const micBtn = mkBtn('🎤 用麦克风');
  micBtn.addEventListener('click', () => {
    if (mic) stopMic();
    else startMic();
  });
  host.appendChild(buildToolbar(micBtn, hint));

  /* ---------- 计算 ---------- */

  function rebuildSignal() {
    sig = dsp.synthUtterance(s.fs);
    nFrames = Math.max(1, Math.floor((sig.length - s.frameLen) / s.hop) + 1);
    idx = clamp(spec.frame ?? Math.round(nFrames * 0.45), 0, nFrames - 1);
  }

  function rebuildFilterbank() {
    fb = dsp.melFilterbank({ nFilters: s.nFilters, fftSize: s.frameLen, fs: s.fs });
  }

  /* 引擎版的整段 MFCC（权威结果，用来对拍） */
  function rebuildCache() {
    cache = dsp.mfcc(sig, {
      fs: s.fs, frameLen: s.frameLen, hop: s.hop, nFilters: s.nFilters, nCeps: s.nCeps,
    });
  }

  /* 手算一遍流水线，把每一级的中间结果都留下 */
  function computeStage(x) {
    const fl = s.frameLen;
    const w = dsp.window('hann', fl);
    const seg = new Float64Array(fl);
    for (let i = 0; i < fl; i += 1) seg[i] = (x[i] || 0) * w[i];

    const { mag } = dsp.rfft(dsp.padPow2(seg, fl));
    const powDb = new Float64Array(mag.length);
    let mx = -Infinity;
    for (let k = 0; k < mag.length; k += 1) {
      powDb[k] = 20 * Math.log10(Math.max(mag[k] * mag[k], 1e-20));
      if (powDb[k] > mx) mx = powDb[k];
    }

    const melE = new Float64Array(s.nFilters);
    for (let m = 0; m < s.nFilters; m += 1) {
      let e = 0;
      for (let k = 0; k < mag.length; k += 1) e += fb[m][k] * mag[k] * mag[k];
      melE[m] = e;
    }
    const logE = new Float64Array(s.nFilters);
    for (let m = 0; m < s.nFilters; m += 1) logE[m] = Math.log(Math.max(melE[m], 1e-10));

    const cep = dsp.dct2(logE);
    return { seg, powDb, powMax: mx, melE, logE, cep, bins: mag.length };
  }

  function recompute() {
    if (!dsp || !sig) return;
    const src = micFrame || null;
    if (src) {
      stage = computeStage(src);
    } else {
      stage = computeStage(sig.subarray(idx * s.hop, idx * s.hop + s.frameLen));
    }
  }

  /* ---------- 麦克风 ---------- */

  let mic = null;
  let loop = null;
  let micFrame = null;
  let lastRead = 0;

  function setHint(t) {
    hint.textContent = t;
  }

  async function startMic() {
    if (!audio.available) {
      setHint('此浏览器不支持 Web Audio，没法用麦克风');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHint('此浏览器不给麦克风权限（需要 HTTPS 页面或 localhost）');
      return;
    }
    setHint('正在请求麦克风授权…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const mod = await audio.load();
      const eng = await mod.createEngine();
      const src = eng.ctx.createMediaStreamSource(stream);
      const an = eng.analyser({ fftSize: 2048, smoothing: 0, input: src });
      mic = { stream, eng, an, sr: eng.sampleRate };
      micBtn.textContent = '■ 停止麦克风';
      setHint('麦克风已开：发一个「啊——」，看 ⑥ 号图稳住不动');
      lastRead = 0;
      loop = rafLoop(host, tick);
    } catch (e) {
      const name = e && e.name;
      let msg = e && e.message ? e.message : String(e);
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        msg = '你（或浏览器设置）拒绝了麦克风授权，可在地址栏的站点权限里改回来';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        msg = '没检测到麦克风设备';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        msg = '麦克风被其它程序占用了';
      }
      setHint('麦克风开启失败：' + msg);
      if (mic) stopMic();
    }
  }

  function stopMic() {
    if (loop) { loop.stop(); loop = null; }
    if (mic) {
      try { mic.stream.getTracks().forEach((t) => t.stop()); } catch (e) { void e; }
      try { mic.eng.close(); } catch (e) { void e; }
      mic = null;
    }
    micFrame = null;
    micBtn.textContent = '🎤 用麦克风';
    setHint('');
    recompute();
    draw();
  }

  function tick() {
    if (!mic) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const interval = (1024 / mic.sr) * 1000;
    if (now - lastRead < interval) return;
    lastRead = now;
    const raw = mic.an.waveform();
    /* 取最后一帧（32 ms），先按 16 kHz 重采样，好让后面各级的参数与内置信号一致 */
    const need = Math.min(raw.length, Math.round((s.frameLen / s.fs) * mic.sr));
    const piece = new Float64Array(need);
    for (let i = 0; i < need; i += 1) piece[i] = raw[raw.length - need + i];
    micFrame = dsp.resample(piece, mic.sr, s.fs);
    recompute();
    draw();
  }

  /* ---------- 画图 ---------- */

  function panelTitle(b, text) {
    label(cv.ctx, text, b.x, b.y + 10, C.fg, { size: 10.5, weight: 600 });
  }

  function panelFrame(b) {
    const ctx = cv.ctx;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  }

  function drawCurve(b, vals, lo, hi, color, fill) {
    const ctx = cv.ctx;
    const a = area(b);
    const n = vals.length;
    const pts = [];
    for (let i = 0; i < n; i += 1) {
      const t = (vals[i] - lo) / Math.max(1e-9, hi - lo);
      pts.push([a.x + (i / (n - 1)) * a.w, a.y + a.h - clamp(t, 0, 1) * a.h]);
    }
    if (fill) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + a.h);
      pts.forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.lineTo(a.x + a.w, a.y + a.h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    polyline(ctx, pts, color, 1.5);
  }

  function drawBars(b, vals, opts = {}) {
    const ctx = cv.ctx;
    const a = area(b);
    const n = vals.length;
    if (!n) return;
    let mx = -Infinity;
    let mn = Infinity;
    const from = opts.from || 0;
    for (let i = from; i < n; i += 1) {
      if (vals[i] > mx) mx = vals[i];
      if (vals[i] < mn) mn = vals[i];
    }
    if (opts.sym) {
      const lim = Math.max(Math.abs(mx), Math.abs(mn), 1e-9);
      mx = lim;
      mn = -lim;
    }
    const span = Math.max(1e-9, mx - mn);
    const zeroY = a.y + a.h - ((0 - mn) / span) * a.h;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, zeroY);
    ctx.lineTo(a.x + a.w, zeroY);
    ctx.stroke();

    const bw = a.w / (n - from);
    for (let i = from; i < n; i += 1) {
      const v = clamp((vals[i] - mn) / span, 0, 1) * a.h;
      const y = a.y + a.h - v;
      ctx.fillStyle = opts.color || C.accent;
      ctx.globalAlpha = opts.dim && i >= opts.dim ? 0.3 : 0.9;
      const h = Math.abs(y - zeroY);
      ctx.fillRect(a.x + (i - from) * bw + 0.6, Math.min(y, zeroY), Math.max(1, bw - 1.2), Math.max(1, h));
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    if (!dsp || !stage) {
      label(ctx, '正在载入信号处理引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    /* --- 顶部：整段波形 + 帧指针 --- */
    const n = sig.length;
    const step = Math.max(1, Math.floor(n / plotW()));
    const pts = [];
    for (let i = 0; i < n; i += step) {
      pts.push([PADL + (i / (n - 1)) * plotW(), TOP.y + TOP.h / 2 - sig[i] * (TOP.h / 2) * 0.9]);
    }
    polyline(ctx, pts, C.axis, 1);
    if (!mic) {
      const cx = PADL + (idx / Math.max(1, nFrames - 1)) * plotW();
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx, TOP.y);
      ctx.lineTo(cx, TOP.y + TOP.h);
      ctx.stroke();
      ctx.fillStyle = C.accent2;
      ctx.beginPath();
      ctx.arc(cx, TOP.y + TOP.h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, mic ? '麦克风实时输入（指针无效）' : `拖橙点换帧 · 第 ${idx} / ${nFrames - 1} 帧 · 每帧 ${fmt((s.frameLen / s.fs) * 1000, 0)} ms，帧移 ${fmt((s.hop / s.fs) * 1000, 0)} ms`,
      PADL, TOP.y - 6, C.fg, { size: 10 });

    /* --- ① 一帧波形 --- */
    const b0 = box(0);
    panelFrame(b0);
    panelTitle(b0, '① 一帧波形（已加汉宁窗）');
    drawCurve(b0, stage.seg, -1, 1, C.accent, false);

    /* --- ② 功率谱 --- */
    const b1 = box(1);
    panelFrame(b1);
    panelTitle(b1, '② 功率谱（dB，横轴 0 → fs/2）');
    drawCurve(b1, stage.powDb, stage.powMax - 80, stage.powMax, C.named('teal'), true);
    label(ctx, `${fmt(s.fs / 2 / 1000, 0)} kHz`, b1.x + b1.w - 4, b1.y + b1.h - 4, C.fg, { align: 'right', size: 9 });

    /* --- ③ 梅尔滤波组能量 --- */
    const b2 = box(2);
    panelFrame(b2);
    panelTitle(b2, `③ 过 ${s.nFilters} 个梅尔滤波器后的能量`);
    drawBars(b2, stage.melE, { color: C.named('orange') });

    /* --- ④ 取对数 --- */
    const b3 = box(3);
    panelFrame(b3);
    panelTitle(b3, '④ 取对数（压缩动态范围）');
    drawBars(b3, stage.logE, { color: C.named('purple'), sym: true });

    /* --- ⑤ DCT 之后的倒谱（可拖截断线） --- */
    const b4 = box(4);
    panelFrame(b4);
    panelTitle(b4, '⑤ DCT-II 之后的倒谱（拖紫线改维数）');
    drawBars(b4, stage.cep, { color: C.accent, sym: true, from: 1, dim: s.nCeps });
    {
      const a = area(b4);
      const nn = s.nFilters;
      const xCut = a.x + ((s.nCeps - 1) / (nn - 1)) * a.w;
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xCut, a.y);
      ctx.lineTo(xCut, a.y + a.h);
      ctx.stroke();
      label(ctx, `保留 ${s.nCeps} 维`, xCut + 4, a.y + 11, C.named('purple'), { size: 10, weight: 600 });
      label(ctx, 'c1', a.x + 2, a.y + a.h - 3, C.fg, { size: 9 });
    }

    /* --- ⑥ 最终 MFCC --- */
    const b5 = box(5);
    panelFrame(b5);
    panelTitle(b5, `⑥ 最终 MFCC：c1 … c${s.nCeps - 1}`);
    const fin = mic
      ? Array.from(stage.cep.slice(1, s.nCeps))
      : (cache[idx] || []).slice(1, s.nCeps);
    drawBars(b5, fin, { color: C.accent2, sym: true });

    /* 读数 */
    ro.set('帧号', mic ? '麦克风实时' : `${idx} / ${nFrames - 1}（${fmt((idx * s.hop) / s.fs, 3)} s）`);
    ro.set('c0', fmt(mic ? stage.cep[0] : ((cache[idx] || [])[0] || 0), 1));
    ro.set('维数', `${s.nCeps} 维（滤波组 ${s.nFilters} 个）`);
    ro.set('音源', mic ? '麦克风' : '内置元音序列');
    if (!mic && cache[idx]) {
      let diff = 0;
      const ref = cache[idx];
      for (let i = 0; i < Math.min(s.nCeps, ref.length); i += 1) {
        diff = Math.max(diff, Math.abs(stage.cep[i] - ref[i]));
      }
      ro.set('与引擎一致', diff < 1e-6 ? '是（手算 = dsp.mfcc）' : `否（差 ${fmt(diff, 3)}）`);
    } else {
      ro.set('与引擎一致', '麦克风模式下不比对');
    }

    label(ctx, '⑤ 号图里 DCT 把 26 个高度相关的能量"解相关"了：前几个系数就够用，后面的多是细碎纹理',
      PADL, H - 5, C.fg, { size: 10 });
  }

  /* ---------- 拖拽 ---------- */

  bindPointer(cv.canvas, {
    pick(X, Y) {
      if (Y >= TOP.y - 12 && Y <= TOP.y + TOP.h + 8) return 'frame';
      const b4 = box(4);
      if (Y >= b4.y && Y <= b4.y + b4.h && X >= b4.x && X <= b4.x + b4.w) return 'nceps';
      return null;
    },
    move(id, X) {
      if (id === 'frame') {
        if (mic) return;
        const t = clamp((X - PADL) / plotW(), 0, 1);
        idx = Math.round(t * (nFrames - 1));
        setSliderRow(sliders, 0, idx);
        recompute();
        draw();
      } else if (id === 'nceps') {
        const b4 = box(4);
        const a = area(b4);
        const t = clamp((X - a.x) / a.w, 0, 1);
        s.nCeps = Math.round(clamp(1 + t * (s.nFilters - 1), 2, s.nFilters));
        setSliderRow(sliders, 1, s.nCeps);
        rebuildCache();
        draw();
      }
    },
  });

  /* ---------- 滑块 ---------- */

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'frame', label: '帧号', min: 0, max: Math.max(1, 40), step: 1, value: idx },
        { name: 'nCeps', label: '保留维数', min: 2, max: s.nFilters, step: 1, value: s.nCeps },
        { name: 'nFilters', label: '滤波器个数', min: 8, max: 40, step: 1, value: s.nFilters },
      ],
    },
    (st) => {
      idx = Math.round(st.frame);
      s.nCeps = Math.round(clamp(st.nCeps, 2, s.nFilters));
      const nf = Math.round(st.nFilters);
      if (nf !== s.nFilters) {
        s.nFilters = nf;
        rebuildFilterbank();
      }
      rebuildCache();
      recompute();
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  engine('dsp').then((m) => {
    dsp = m;
    rebuildSignal();
    rebuildFilterbank();
    rebuildCache();
    /* 帧号滑块的量程依赖实际帧数，载入后要改一次 */
    setSliderMax(sliders, 0, Math.max(1, nFrames - 1));
    sliders.state.frame = idx;
    recompute();
    draw();
  }).catch((e) => {
    void e;
  });

  return {
    slidersBox: sliders.box,
    destroy() {
      stopMic();
    },
  };
}

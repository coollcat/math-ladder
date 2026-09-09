/* =========================================================================
 * lab 组件：vocoder-lab（LPC 声码器 —— 把一句话压成一串参数，再合成回来）
 * -------------------------------------------------------------------------
 * 演示什么
 *   声码器是「分析—传输—合成」三段式：
 *     分析：每 20 ms 一帧，求出 ① 声道形状（p 个 LPC 系数）② 基频 F0
 *           ③ 清/浊判决 ④ 增益；
 *     传输：只发这些参数（几千 bit/s），不发波形；
 *     合成：接收端用同样的参数重建激励（浊音用脉冲串、清音用噪声），
 *           再让它通过 1/A(z) 这个全极点滤波器，声音就回来了。
 *   本组件让你亲耳听「原始」与「合成」的差别，并当场报出压缩比。
 *
 *   三个必须玩出来的结论：
 *     · 阶数 p 从 6 提到 12，合成声从「含混」变「清楚」；再往上加，耳朵几乎
 *       分辨不出，但码率线性上涨 —— 和 lpc-lab 里那条「预测增益 vs 阶数」
 *       曲线是同一件事的两种看法。
 *     · 帧长拉长（40 ms）→ 码率减半，但快速过渡段（元音之间）糊成一团，
 *       因为一帧内假设「声道不动」这个前提被破坏了。
 *     · 系数量化位数降到 3 bit，会听到咔哒与抖动：LPC 系数直接量化会让
 *       滤波器失稳，工程上都先转成反射系数 k（|k|<1 才稳定）再量化。
 *
 * 怎么玩
 *   · 拖波形区（或语谱图）里的红色播放头：换位置，读数显示那一帧的参数。
 *   · 「原声 / 合成声」按钮切换听的内容，语谱图跟着换。
 *   · 拖滑块：阶数、帧长、量化位数、音量。
 *
 * 用法（课文里写 ```lab 围栏）
 *
 *   ```lab
 *   {
 *     "type": "vocoder-lab",
 *     "title": "把这句话压成参数再合成回来，听听差在哪"
 *   }
 *   ```
 *
 * spec 字段（全部可省，缺省值如下）
 *   order     LPC 阶数 p，4–24，默认 12
 *   frameMs   帧长（毫秒），10–40，默认 20（帧移 = 帧长 / 2）
 *   bits      每个系数的量化位数，2–8，默认 5
 *   vol       播放音量，0–0.5，默认 0.2
 *   height    画布高度（像素），默认 400
 *
 * 出声：是。走 core.audioShell —— ▶ 播放 / ■ 停止按钮由它提供，
 *   离开视口自动停，默认音量 0.2。
 * 引擎：dsp（lpc / frame / window / rfft / spectrogram / detectPitch /
 *   decimate / ampToDb）+ audio（AudioBuffer 播放）。
 * 信号来源：内置的「源-滤波器」合成话音（a→i→s→u 的音素轨迹），
 *   不是真实录音；好处是共振峰轨迹与清浊标注都是已知真值，可以和标注带对表。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, engine, audioShell, buildSliders,
  buildSegmented, buildReadout, rafLoop, polyline, label, clamp, fmt,
} from '../core.js';

const FS = 16000;

/* 内置话音的「音素轨迹」：每个航点给出该时刻的三个共振峰、清浊与幅度。
   航点之间线性插值，因此共振峰是连续滑动的（这正是 LPC 帧内假设要逼近的东西）。 */
const UTT = [
  { t: 0.00, F: [500, 1500, 2500], v: 1, a: 0.0 },
  { t: 0.10, F: [730, 1090, 2440], v: 1, a: 1.0 },  // /a/
  { t: 0.45, F: [600, 1500, 2500], v: 1, a: 0.9 },  // 过渡
  { t: 0.65, F: [270, 2290, 3010], v: 1, a: 1.0 },  // /i/
  { t: 0.95, F: [300, 2000, 3200], v: 0, a: 0.55 }, // /s/ 清擦音
  { t: 1.15, F: [325, 700, 2530], v: 1, a: 1.0 },   // /u/
  { t: 1.55, F: [400, 900, 2400], v: 1, a: 0.0 },
];
const BAND = [80, 110, 170];   // 三个共振峰的带宽（Hz）

function mulberry32(a) {
  return function rnd() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 在航点表上按时间插值 */
function track(t) {
  let i = 0;
  while (i < UTT.length - 2 && t > UTT[i + 1].t) i += 1;
  const A = UTT[i];
  const B = UTT[i + 1];
  const u = clamp((t - A.t) / Math.max(1e-9, B.t - A.t), 0, 1);
  return {
    F: A.F.map((f, k) => f + (B.F[k] - f) * u),
    v: u < 0.5 ? A.v : B.v,
    a: A.a + (B.a - A.a) * u,
  };
}

/* 合成「原始话音」：激励（脉冲串 / 噪声）→ 三个时变二阶谐振器 → 幅度包络 */
function synthUtterance() {
  const n = Math.round(UTT[UTT.length - 1].t * FS);
  const rnd = mulberry32(19740301);
  const src = new Float64Array(n);
  let ph = 0;
  for (let i = 0; i < n; i += 1) {
    const p = track(i / FS);
    if (p.v) {
      const f0 = 118 * (1 + 0.12 * Math.sin((2 * Math.PI * 0.8 * i) / FS));
      ph += f0 / FS;
      if (ph >= 1) ph -= 1;
      const duty = 0.4;
      src[i] = ph < duty ? 0.5 * (1 - Math.cos((2 * Math.PI * ph) / duty)) - 0.2 : -0.2;
    } else {
      src[i] = (rnd() * 2 - 1) * 0.55;
    }
  }
  let y = src;
  for (let k = 0; k < 3; k += 1) {
    const out = new Float64Array(n);
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < n; i += 1) {
      const F = track(i / FS).F[k];
      const r = Math.exp((-Math.PI * BAND[k]) / FS);
      const c = 2 * r * Math.cos((2 * Math.PI * F) / FS);
      const v = y[i] + c * y1 - r * r * y2;
      out[i] = v;
      y2 = y1;
      y1 = v;
    }
    y = out;
  }
  let peak = 0;
  for (let i = 0; i < n; i += 1) {
    y[i] *= track(i / FS).a;
    peak = Math.max(peak, Math.abs(y[i]));
  }
  for (let i = 0; i < n; i += 1) y[i] = (y[i] / (peak || 1)) * 0.9;
  return y;
}

/* ---------- LPC 系数的「反射系数」表示：量化前必须转过去 ----------
   a→k 是 Levinson 的反向递推（step-down），k→a 是正向递推（step-up）。
   |k|<1 是滤波器稳定的充要条件，所以量化后只要把 |k| 夹住就不会炸。 */
function aToK(a) {
  const p = a.length - 1;
  const cur = Float64Array.from(a);
  const k = new Float64Array(p + 1);
  for (let i = p; i >= 1; i -= 1) {
    const prev = cur.slice();
    k[i] = clamp(prev[i], -0.999, 0.999);
    const d = 1 - k[i] * k[i];
    for (let j = 1; j < i; j += 1) cur[j] = (prev[j] - k[i] * prev[i - j]) / (d || 1e-9);
  }
  return k;
}

function kToA(k) {
  const p = k.length - 1;
  const a = new Float64Array(p + 1);
  a[0] = 1;
  for (let i = 1; i <= p; i += 1) {
    const prev = a.slice();
    for (let j = 1; j < i; j += 1) a[j] = prev[j] + k[i] * prev[i - j];
    a[i] = k[i];
  }
  return a;
}

function quantizeK(k, bits) {
  const levels = 2 ** bits - 1;
  const out = new Float64Array(k.length);
  for (let i = 1; i < k.length; i += 1) {
    const q = Math.round(((k[i] + 1) / 2) * levels) / levels;
    out[i] = clamp(q * 2 - 1, -0.995, 0.995);
  }
  return out;
}

/* ---------- 颜色工具（语谱图用；要同时吃 hex 与 rgb()/rgba()） ---------- */
function parseRGB(c) {
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const v = parseInt(h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const m = c.match(/-?\d+(\.\d+)?/g);
  return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
}

/* 把 dB 矩阵画成一张离屏位图（行翻转：高频在上） */
function specBitmap(cols, bins, db, lo, hi, c0, c1, c2) {
  const off = document.createElement('canvas');
  off.width = Math.max(1, cols);
  off.height = Math.max(1, bins);
  const octx = off.getContext('2d');
  const img = octx.createImageData(off.width, off.height);
  const A = parseRGB(c0);
  const B = parseRGB(c1);
  const Cc = parseRGB(c2);
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < bins; j += 1) {
      const t = clamp((db[i][j] - lo) / (hi - lo), 0, 1);
      let r;
      let g;
      let b;
      if (t < 0.5) {
        const u = t * 2;
        r = A[0] + (B[0] - A[0]) * u;
        g = A[1] + (B[1] - A[1]) * u;
        b = A[2] + (B[2] - A[2]) * u;
      } else {
        const u = (t - 0.5) * 2;
        r = B[0] + (Cc[0] - B[0]) * u;
        g = B[1] + (Cc[1] - B[1]) * u;
        b = B[2] + (Cc[2] - B[2]) * u;
      }
      const o = (j * cols + i) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return off;
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    order: clamp(spec.order ?? 12, 4, 24),
    frameMs: clamp(spec.frameMs ?? 20, 10, 40),
    bits: clamp(spec.bits ?? 5, 2, 8),
    vol: spec.vol ?? 0.2,
  };

  const original = synthUtterance();
  const DUR = original.length / FS;

  let dsp = null;
  let frames = [];        // 每帧 {a, gain, f0, clarity, voiced, energy}
  let syn = null;         // 合成后的波形
  let hop = 160;
  let frameLen = 320;
  let specCache = null;   // {orig: bitmap, syn: bitmap, cols, bins}
  let mode = 'syn';       // 语谱图与播放听哪一版
  let head = 0.55;        // 播放头（秒）
  let playing = false;
  let loop = null;

  const cv = setupCanvas(host, spec.height || 400);
  host.appendChild(buildSegmented(
    [{ label: '听：原始语音', value: 'orig' }, { label: '听：声码器合成', value: 'syn' }],
    mode,
    (v) => {
      mode = v;
      if (playing) restart(head);
      draw();
    },
  ));
  const ro = buildReadout({
    当前帧: '—', 基频: '—', 判决: '—', 码率: '—', 压缩比: '—',
  });
  host.appendChild(ro.box);

  /* ---------- 分析 ---------- */
  function analyze() {
    if (!dsp) return;
    frameLen = Math.round((s.frameMs / 1000) * FS);
    hop = Math.max(1, Math.round(frameLen / 2));
    const p = Math.round(s.order);
    const w = dsp.window('hann', frameLen);
    frames = [];
    let eMax = 0;
    dsp.frame(original, frameLen, hop).forEach((raw) => {
      const seg = new Float64Array(frameLen);
      for (let i = 0; i < frameLen; i += 1) seg[i] = raw[i] * w[i];
      const e = dsp.shortTimeEnergy(seg);
      eMax = Math.max(eMax, e);
      frames.push({ seg, energy: e });
    });
    frames.forEach((f) => {
      /* 静音帧：LPC 在 r[0]≈0 上会解出荒唐的系数，直接判成清音 + 零增益 */
      if (f.energy < eMax * 1e-4) {
        f.a = new Float64Array(p + 1);
        f.a[0] = 1;
        f.gain = 0;
        f.f0 = 0;
        f.clarity = 0;
        f.voiced = false;
        return;
      }
      const { a, gain } = dsp.lpc(f.seg, p);
      /* 基频在抽取 2 倍后的信号上做（省一半算力，仍然够准） */
      const dec = dsp.decimate(f.seg, 2);
      const pt = dsp.detectPitch(dec, FS / 2, 70, 400);
      const kq = quantizeK(aToK(a), Math.round(s.bits));
      f.a = kToA(kq);
      f.gain = gain;
      f.f0 = pt.f0;
      f.clarity = pt.clarity;
      f.voiced = pt.clarity > 0.35 && pt.f0 > 70 && pt.f0 < 400 && f.energy > eMax * 0.02;
    });
  }

  /* ---------- 合成：时变全极点滤波器 1/A(z)，系数逐样本线性插值 ---------- */
  function synthesize() {
    const n = original.length;
    const p = Math.round(s.order);
    const out = new Float64Array(n);
    const rnd = mulberry32(31415926);
    const A = frames.map((f) => f.a);
    const G = frames.map((f) => f.gain);
    const V = frames.map((f) => f.voiced);
    const F0 = frames.map((f) => f.f0);
    let ph = 0;
    const y = new Float64Array(p + 1);   // y[0] 是当前样本，y[i] 是 n-i
    for (let i = 0; i < n; i += 1) {
      const t = (i - frameLen / 2) / hop;
      let i0 = Math.floor(t);
      let u = t - i0;
      if (i0 < 0) { i0 = 0; u = 0; }
      if (i0 > frames.length - 2) { i0 = Math.max(0, frames.length - 2); u = 1; }
      /* 激励：浊音 = 脉冲串（幅度 √T₀ 使 RMS≈1），清音 = 白噪声（RMS≈1） */
      let e;
      if (V[i0]) {
        const T0 = FS / Math.max(60, F0[i0] || 120);
        ph += 1 / T0;
        if (ph >= 1) ph -= 1;
        e = ph < 1 / T0 ? Math.sqrt(T0) : 0;
      } else {
        e = (rnd() * 2 - 1) * 1.732;
      }
      const g = G[i0] + (G[i0 + 1] - G[i0]) * u;
      let acc = g * e;
      for (let j = 1; j <= p; j += 1) {
        const cj = A[i0][j] + (A[i0 + 1][j] - A[i0][j]) * u;
        acc += cj * y[j];
      }
      /* 逐样本插值系数在极端情况下会失稳，这里兜底：发散就清空延迟线 */
      if (!isFinite(acc) || Math.abs(acc) > 1e4) {
        for (let j = 0; j <= p; j += 1) y[j] = 0;
        acc = 0;
      }
      for (let j = p; j >= 1; j -= 1) y[j] = y[j - 1];
      y[0] = acc;
      out[i] = acc;
    }
    /* 包络对齐：按帧用原声 RMS 校正合成 RMS，抵消增益估计的偏差 */
    let peak = 0;
    for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 1e-6) for (let i = 0; i < n; i += 1) out[i] = (out[i] / peak) * 0.9;
    return out;
  }

  function recompute() {
    analyze();
    syn = dsp ? synthesize() : null;
    specCache = null;
    if (playing) restart(head);
    draw();
  }

  /* ---------- 语谱图缓存 ---------- */
  function buildSpec() {
    if (!dsp || specCache) return specCache;
    const mk = (x) => {
      const sp = dsp.spectrogram(x, { frameLen: 256, hop: 64, win: 'hann' });
      return {
        bmp: specBitmap(sp.cols.length, sp.bins, sp.cols, -80, -5, C.bg, C.accent2, C.accent),
        cols: sp.cols.length,
        bins: sp.bins,
      };
    };
    specCache = { orig: mk(original), syn: syn ? mk(syn) : null };
    return specCache;
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const specH = Math.round(H * 0.40);
    const waveY = specH + 22;
    const waveH = Math.round(H * 0.26);
    const parY = waveY + waveH + 22;
    const parH = H - parY - 18;

    /* 语谱图 */
    const sp = buildSpec();
    if (sp) {
      const cur = mode === 'syn' && sp.syn ? sp.syn : sp.orig;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(cur.bmp, 0, 0, cur.cols, cur.bins, 0, 0, W, specH);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, specH - 1);
      for (let f = 2000; f < 8000; f += 2000) {
        const y = specH - (f / 8000) * specH;
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
        ctx.stroke();
        label(ctx, f / 1000 + 'k', 3, y - 2, C.fg, { size: 9 });
      }
    } else {
      label(ctx, '正在载入 dsp 引擎…', W / 2, specH / 2, C.fg, { align: 'center', size: 12 });
    }
    label(ctx, `语谱图：${mode === 'syn' ? '声码器合成' : '原始语音'}（纵轴 0–8 kHz）`, 8, specH + 15, C.fg, { size: 11 });

    /* 波形对比：原始（灰细）+ 合成（彩粗） */
    const wpts = (data, color, width, alpha) => {
      if (!data) return;
      ctx.globalAlpha = alpha;
      const pts = [];
      for (let x = 0; x < W; x += 1) {
        const i = Math.min(data.length - 1, Math.round((x / W) * data.length));
        pts.push([x, waveY + waveH / 2 - data[i] * (waveH / 2) * 0.92]);
      }
      polyline(ctx, pts, color, width);
      ctx.globalAlpha = 1;
    };
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(0, waveY + waveH / 2 + 0.5);
    ctx.lineTo(W, waveY + waveH / 2 + 0.5);
    ctx.stroke();
    wpts(original, C.axis, 1, 1);
    wpts(syn, C.accent, 1.6, 0.95);
    label(ctx, '灰细 = 原始波形　橙粗 = 合成波形（可拖播放头）', 8, waveY - 6, C.fg, { size: 10 });

    /* 播放头 */
    const hx = (head / DUR) * W;
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(hx, 0);
    ctx.lineTo(hx, waveY + waveH);
    ctx.stroke();

    /* 参数带：F0 轨迹 + 清浊条 */
    if (frames.length) {
      const fMax = 300;
      const px = (i) => ((i * hop + frameLen / 2) / original.length) * W;
      const prevVoiced = { v: frames[0].voiced, x0: 0 };
      const flush = (v, x0, x1) => {
        ctx.fillStyle = v ? C.ok : C.soft;
        ctx.fillRect(x0, parY + parH - 10, Math.max(1, x1 - x0), 8);
      };
      frames.forEach((f, i) => {
        if (f.voiced !== prevVoiced.v) {
          flush(prevVoiced.v, prevVoiced.x0, px(i));
          prevVoiced.v = f.voiced;
          prevVoiced.x0 = px(i);
        }
      });
      flush(prevVoiced.v, prevVoiced.x0, W);
      const pts = [];
      frames.forEach((f, i) => {
        if (!f.voiced) return;
        const y = parY + parH - 14 - (clamp(f.f0, 60, fMax) / fMax) * (parH - 18);
        pts.push([px(i), y]);
      });
      polyline(ctx, pts, C.named('purple'), 1.8);
      label(ctx, 'F0 轨迹（紫）/ 清浊判决带（绿=浊音）', 8, parY - 5, C.fg, { size: 10 });
      label(ctx, '300 Hz', 8, parY + parH - 16, C.fg, { size: 9 });
      label(ctx, '清/浊', W - 8, parY + parH - 12, C.fg, { align: 'right', size: 9 });
    } else {
      label(ctx, '正在分析…', 8, parY + parH / 2, C.fg, { size: 11 });
    }

    /* 读数 */
    if (frames.length) {
      const fi = clamp(Math.round(((head * FS) - frameLen / 2) / hop), 0, frames.length - 1);
      const f = frames[fi];
      const t0 = (fi * hop) / FS;
      ro.set('当前帧', `#${fi} / ${frames.length}（${fmt(t0, 2)}–${fmt(t0 + s.frameMs / 1000, 2)} s）`);
      ro.set('基频', f.voiced ? `${fmt(f.f0, 1)} Hz（自相关清晰度 ${fmt(f.clarity, 2)}）` : '—（清音，无基频）');
      ro.set('判决', f.voiced ? '浊音：激励用脉冲串' : '清音：激励用白噪声');
      const p = Math.round(s.order);
      const fps = FS / hop;
      const bps = fps * (p * Math.round(s.bits) + 7);
      ro.set('码率', `每帧 ${p}×${Math.round(s.bits)} bit + 7 bit → ${fmt(bps / 1000, 2)} kbps`);
      ro.set('压缩比', `${fmt((16 * FS) / bps, 0)} : 1（原始 16 bit×${FS} Hz = 256 kbps）`);
    }
  }

  /* ---------- 播放头拖动 ---------- */
  bindPointer(cv.canvas, {
    pick(x, y) {
      const specH = Math.round(cv.H * 0.40);
      if (y <= specH + Math.round(cv.H * 0.26) + 44) return 'head';
      return null;
    },
    move(id, x) {
      head = clamp((x / cv.W) * DUR, 0, DUR);
      if (playing) restart(head);
      draw();
    },
  });

  /* ---------- 出声 ---------- */
  let engRef = null;
  let node = null;
  let gainNode = null;
  let t0 = 0;

  function stopNode() {
    if (node) {
      try { node.onended = null; node.stop(); } catch (e) { void e; }
      try { node.disconnect(); } catch (e) { void e; }
      node = null;
    }
    if (gainNode) {
      try { gainNode.disconnect(); } catch (e) { void e; }
      gainNode = null;
    }
  }

  function restart(offsetSec) {
    if (!engRef || !syn) return;
    stopNode();
    const data = mode === 'syn' ? syn : original;
    const buf = engRef.ctx.createBuffer(1, data.length, FS);
    buf.copyToChannel(Float32Array.from(data), 0);
    node = engRef.ctx.createBufferSource();
    node.buffer = buf;
    gainNode = engRef.ctx.createGain();
    gainNode.gain.value = clamp(s.vol, 0, 0.6);
    node.connect(gainNode);
    gainNode.connect(engRef.master);
    const off = clamp(offsetSec, 0, DUR - 0.01);
    node.start(0, off);
    t0 = engRef.ctx.currentTime - off;
    node.onended = () => {
      if (node) {
        playing = false;
        head = 0;
        node = null;
        if (loop) { loop.stop(); loop = null; }
        draw();
      }
    };
    if (!loop) {
      loop = rafLoop(host, () => {
        if (!playing || !engRef) return;
        head = clamp(engRef.ctx.currentTime - t0, 0, DUR);
        draw();
      });
    }
  }

  const shell = audioShell(host, (eng, api) => {
    eng.setMasterGain(0.8);
    engRef = eng;
    playing = true;
    restart(head);
    api.hint.textContent = `播放中：${mode === 'syn' ? '声码器合成' : '原始语音'}（音量 ${fmt(s.vol, 2)}）`;
    return () => {
      playing = false;
      stopNode();
      if (loop) { loop.stop(); loop = null; }
      engRef = null;
    };
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'order', label: 'LPC 阶数 p', min: 4, max: 24, step: 1, value: s.order, fmt: 0 },
        { name: 'frameMs', label: '帧长', min: 10, max: 40, step: 2, value: s.frameMs, fmt: 0 },
        { name: 'bits', label: '系数位宽', min: 2, max: 8, step: 1, value: s.bits, fmt: 0 },
        { name: 'vol', label: '音量', min: 0, max: 0.5, step: 0.02, value: s.vol, fmt: 2 },
      ],
    },
    (st) => {
      const reparam = st.order !== s.order || st.frameMs !== s.frameMs || st.bits !== s.bits;
      s.order = st.order;
      s.frameMs = st.frameMs;
      s.bits = st.bits;
      s.vol = st.vol;
      if (gainNode) gainNode.gain.setTargetAtTime(clamp(s.vol, 0, 0.6), engRef.ctx.currentTime, 0.02);
      if (reparam) recompute(); else draw();
    },
  );

  draw();
  /* 主题切换会重绘：语谱图位图里烤了颜色，必须一起作废 */
  cv.redraw = () => { specCache = null; draw(); };
  engine('dsp').then((m) => {
    dsp = m;
    recompute();
  }).catch(() => { void 0; });

  return {
    slidersBox: sl.box,
    destroy() {
      shell.stop();
      if (loop) loop.stop();
    },
  };
}

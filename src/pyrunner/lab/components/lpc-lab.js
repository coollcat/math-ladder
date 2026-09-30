/* =========================================================================
 * lab 组件：lpc-lab（线性预测 LPC —— 用一条光滑包络贴住共振峰）
 * -------------------------------------------------------------------------
 * 演示什么
 *   语音是「声源激励 + 声道滤波」的产物：声门脉冲串经过声道的几个共振腔，
 *   频谱上就出现一个个鼓包（共振峰 F1/F2/F3）。LPC 做的事是用一个 p 阶
 *   全极点模型 1/A(z) 去拟合这一帧的频谱包络：
 *       ŝ[n] = -Σ aᵢ·s[n-i]       残差 e[n] = s[n] - ŝ[n]
 *   本组件把「FFT 频谱（锯齿状）」与「LPC 包络（光滑曲线）」画在一起，
 *   让你看见：包络的峰就是共振峰；阶数 p 决定这条包络能弯几道弯。
 *
 *   三个必须玩出来的结论：
 *     · p 太小（2~4）：包络只能包住 F1、勉强包住 F2，F3 以上的结构全丢，
 *       合成出来「闷」——这就是早期声码器讲话像含着东西的原因。
 *     · p 适中（10~14，约「采样率/1000 + 2」这个经验值）：三个共振峰都被
 *       贴住，再往上加阶数，残差几乎不再下降。
 *     · p 太大（24+）：包络开始去拟合噪声与频谱毛刺（过拟合），曲线出现
 *       无意义的抖动，参数个数却线性上涨——把「加噪」滑块推大看这个现象。
 *
 * 怎么玩
 *   · 拖上方的分析窗（波形条里的高亮矩形）：换一帧，看包络怎么跟着变。
 *   · 拖下方「预测增益 vs 阶数」曲线上的游标：换阶数，看收益在哪个阶数饱和。
 *   · 元音 /a/ /i/ /u/ 三个按钮：三个共振峰位置差别很大，包络跟着大改。
 *
 * 用法（课文里写 ```lab 围栏）
 *
 *   ```lab
 *   {
 *     "type": "lpc-lab",
 *     "title": "拖动阶数，看这条包络能贴住几个共振峰"
 *   }
 *   ```
 *
 * spec 字段（全部可省，缺省值如下）
 *   vowel    'a' | 'i' | 'u'，初始元音，默认 'a'
 *   order    LPC 阶数 p，2–30，默认 12
 *   noise    叠加的观测噪声幅度，0–0.15，默认 0.02
 *   frameMs  分析帧长（毫秒），10–40，默认 25
 *   pos      分析窗起点（信号归一化位置 0–1），默认 0.35
 *   fmax     频谱横轴上限（Hz），默认 6000
 *   height   画布高度（像素），默认 360
 *
 * 出声：否（纯分析组件）。
 * 引擎：dsp（lpc / lpcEnvelope / window / rfft / padPow2 / ampToDb）。
 * 信号来源：内置的「声源-滤波器」合成元音（声门脉冲串激励三个二阶谐振器），
 *   不是真实录音——好处是共振峰的真值已知，可以直接和 LPC 估计值对表。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, engine, buildSliders, buildSegmented, buildReadout,
  polyline, label, clamp, fmt, mulberry32,
  clearBg,
} from '../core.js';

const FS = 16000;               // 语音分析常用采样率
const DUR = 0.6;                // 合成时长（秒）
const NFFT = 1024;              // FFT 点数（帧补零到这个长度，频谱更细腻）

/* 三个元音的三个共振峰（Hz）与对应带宽（Hz）—— 教科书典型值 */
const VOWELS = {
  a: { name: '/a/ 啊', F: [730, 1090, 2440], B: [80, 100, 160] },
  i: { name: '/i/ 衣', F: [270, 2290, 3010], B: [60, 110, 180] },
  u: { name: '/u/ 乌', F: [325, 700, 2530], B: [70, 90, 170] },
};

/* 确定性伪随机（同一个种子每次刷新都一样，便于课文复现） */

/* 声门脉冲串：占空比 0.4 的升余弦，自带约 -12 dB/oct 的频谱倾斜，
   与真实声门波的频谱形态接近（谐波一个比一个低）。 */
function glottal(n, f0) {
  const x = new Float64Array(n);
  const duty = 0.4;
  let ph = 0;
  for (let i = 0; i < n; i += 1) {
    ph += (f0 * (1 + 0.03 * Math.sin((2 * Math.PI * 2.7 * i) / n))) / FS;
    if (ph >= 1) ph -= 1;
    x[i] = ph < duty ? 0.5 * (1 - Math.cos((2 * Math.PI * ph) / duty)) - 0.2 : -0.2;
  }
  return x;
}

/* 二阶谐振器（一个共振峰）：y[n] = x[n] + 2r·cosθ·y[n-1] - r²·y[n-2] */
function resonator(x, F, B) {
  const r = Math.exp((-Math.PI * B) / FS);
  const c = 2 * r * Math.cos((2 * Math.PI * F) / FS);
  const r2 = r * r;
  const y = new Float64Array(x.length);
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const v = x[i] + c * y1 - r2 * y2;
    y[i] = v;
    y2 = y1;
    y1 = v;
  }
  return y;
}

/* 合成一个元音：脉冲串 → 三个串联谐振器 → 去直流 → 归一化 → 加噪 */
function synthVowel(key, noiseAmp) {
  const v = VOWELS[key] || VOWELS.a;
  const n = Math.round(DUR * FS);
  let y = glottal(n, 125);
  for (let k = 0; k < v.F.length; k += 1) y = resonator(y, v.F[k], v.B[k]);
  let mean = 0;
  for (let i = 0; i < n; i += 1) mean += y[i];
  mean /= n;
  let peak = 0;
  for (let i = 0; i < n; i += 1) {
    y[i] -= mean;
    peak = Math.max(peak, Math.abs(y[i]));
  }
  const rnd = mulberry32(20260904);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 1) out[i] = y[i] / (peak || 1) + noiseAmp * (rnd() * 2 - 1);
  return out;
}

/* 在 dB 数组上找显著峰（ prominance ≥ minProm 且单调区间内最高），
   返回按高度排序的前若干个 {bin, db} */
function findPeaks(db, i0, i1, minProm, topK) {
  const cand = [];
  for (let i = i0 + 1; i < i1 - 1; i += 1) {
    if (db[i] <= db[i - 1] || db[i] < db[i + 1]) continue;
    let l = db[i];
    for (let j = i - 1; j >= i0; j -= 1) {
      if (db[j] > db[i]) break;
      l = Math.min(l, db[j]);
    }
    let r = db[i];
    for (let j = i + 1; j < i1; j += 1) {
      if (db[j] > db[i]) break;
      r = Math.min(r, db[j]);
    }
    const prom = db[i] - Math.max(l, r);
    if (prom >= minProm) cand.push({ i, prom });
  }
  cand.sort((p, q) => q.prom - p.prom);
  return cand.slice(0, topK);
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    vowel: VOWELS[spec.vowel] ? spec.vowel : 'a',
    order: clamp(spec.order ?? 12, 2, 30),
    noise: spec.noise ?? 0.02,
    frameMs: clamp(spec.frameMs ?? 25, 10, 40),
    pos: spec.pos ?? 0.35,
    fmax: spec.fmax ?? 6000,
  };

  let dsp = null;
  let sig = synthVowel(s.vowel, s.noise);

  const cv = setupCanvas(host, spec.height || 360);
  const seg = buildSegmented(
    Object.keys(VOWELS).map((k) => ({ label: VOWELS[k].name, value: k })),
    s.vowel,
    (v) => {
      s.vowel = v;
      sig = synthVowel(s.vowel, s.noise);
      draw();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({
    阶数: '—', 残差: '—', 参数率: '—', 共振峰估计: '—', 共振峰真值: '—',
  });
  host.appendChild(ro.box);

  /* ---------- 布局：上波形条 / 中频谱 / 下增益曲线 ---------- */
  const LAY = (W, H) => {
    const waveH = Math.round(H * 0.16);
    const gainY = H - Math.round(H * 0.24);
    return {
      waveH,
      specY: waveH + 26,
      specH: gainY - waveH - 40,
      gainY,
      gainH: H - gainY - 20,
      W,
      H,
    };
  };

  let geom = null;

  function frameAt() {
    const n = Math.round((s.frameMs / 1000) * FS);
    const start = clamp(Math.round(s.pos * (sig.length - n)), 0, Math.max(0, sig.length - n));
    return { n, start };
  }

  /* 一帧的 FFT 谱与 LPC 包络（都对同一个参考归一化，可直接叠着看） */
  function analyze() {
    if (!dsp) return null;
    const { n, start } = frameAt();
    const w = dsp.window('hann', n);
    const seg = new Float64Array(n);
    for (let i = 0; i < n; i += 1) seg[i] = sig[start + i] * w[i];
    const { mag } = dsp.rfft(dsp.padPow2(seg, NFFT));
    const bins = mag.length;
    const specDb = new Float64Array(bins);
    let ref = -Infinity;
    for (let k = 0; k < bins; k += 1) {
      specDb[k] = dsp.ampToDb(mag[k]);
      if (k > 0) ref = Math.max(ref, specDb[k]);
    }
    const { a, gain } = dsp.lpc(seg, Math.round(s.order));
    const env = dsp.lpcEnvelope(a, gain, bins);
    const envDb = new Float64Array(bins);
    for (let k = 0; k < bins; k += 1) envDb[k] = dsp.ampToDb(env[k]) - ref;
    for (let k = 0; k < bins; k += 1) specDb[k] -= ref;
    const kmax = Math.min(bins - 1, Math.floor((s.fmax * NFFT) / FS));
    return { specDb, envDb, kmax, gain, a: Array.from(a) };
  }

  /* 预测增益随阶数的变化（残差增益 gain 是相对量，r[0] 已归一到 1） */
  let gainCurve = null;
  function computeGainCurve() {
    if (!dsp) return null;
    const { n, start } = frameAt();
    const w = dsp.window('hann', n);
    const seg = new Float64Array(n);
    for (let i = 0; i < n; i += 1) seg[i] = sig[start + i] * w[i];
    const pts = [];
    for (let p = 2; p <= 30; p += 1) {
      const g = dsp.lpc(seg, p).gain;
      pts.push([p, g > 1e-9 ? -20 * Math.log10(g) : 60]);
    }
    return pts;
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    const L = LAY(W, H);
    geom = L;

    /* ---------- 上：波形 + 分析窗 ---------- */
    const { n: fn, start: fs0 } = frameAt();
    const wavePts = [];
    for (let x = 0; x < W; x += 1) {
      const i = Math.min(sig.length - 1, Math.round((x / W) * sig.length));
      wavePts.push([x, L.waveH / 2 - sig[i] * (L.waveH / 2) * 0.92]);
    }
    ctx.fillStyle = C.soft;
    const wx0 = (fs0 / sig.length) * W;
    const wx1 = ((fs0 + fn) / sig.length) * W;
    ctx.fillRect(wx0, 0, Math.max(2, wx1 - wx0), L.waveH);
    polyline(ctx, wavePts, C.series(0), 1.1);
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(wx0, 0.5, Math.max(2, wx1 - wx0), L.waveH - 1);
    label(ctx, '分析窗（可左右拖动）', 8, 14, C.fg, { size: 11 });
    label(ctx, `${s.frameMs} ms / ${fn} 点`, W - 8, 14, C.fg, { align: 'right', size: 10 });

    const A = analyze();
    if (!A) {
      label(ctx, '正在载入 dsp 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    /* ---------- 中：频谱 + LPC 包络 ---------- */
    const DB_LO = -72;
    const DB_HI = 8;
    const px = (k) => (k / A.kmax) * W;
    const py = (db) => L.specY + L.specH - ((clamp(db, DB_LO, DB_HI) - DB_LO) / (DB_HI - DB_LO)) * L.specH;

    /* 频率网格 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let f = 1000; f < s.fmax; f += 1000) {
      const k = (f * NFFT) / FS;
      if (k > A.kmax) break;
      ctx.beginPath();
      ctx.moveTo(px(k) + 0.5, L.specY);
      ctx.lineTo(px(k) + 0.5, L.specY + L.specH);
      ctx.stroke();
      label(ctx, f / 1000 + 'k', px(k) + 3, L.specY + L.specH + 13, C.fg, { size: 10 });
    }
    for (let db = DB_LO + 12; db < DB_HI; db += 20) {
      const y = py(db);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
      label(ctx, db + ' dB', 4, y - 3, C.fg, { size: 10 });
    }

    /* FFT 谱（细锯齿）*/
    const sp = [];
    for (let k = 1; k <= A.kmax; k += 1) sp.push([px(k), py(A.specDb[k])]);
    polyline(ctx, sp, C.axis, 1);

    /* LPC 包络（粗） */
    const ep = [];
    for (let k = 1; k <= A.kmax; k += 1) ep.push([px(k), py(A.envDb[k])]);
    polyline(ctx, ep, C.accent, 2.4);

    /* 包络峰 = 共振峰估计 */
    const kLo = Math.max(1, Math.floor((150 * NFFT) / FS));
    const peaks = findPeaks(A.envDb, kLo, A.kmax, 3, 3)
      .map((p) => ({ f: (p.i * FS) / NFFT, db: A.envDb[p.i] }))
      .sort((u, v2) => u.f - v2.f);
    peaks.forEach((p, i) => {
      const x = px((p.f * NFFT) / FS);
      const y = py(p.db);
      ctx.fillStyle = C.named('red');
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, `F${i + 1}≈${fmt(p.f, 0)}`, x + 6, y - 4, C.named('red'), { size: 10, weight: 600 });
    });

    label(ctx, '灰细线 = 这一帧的 FFT 频谱（谐波一根根）', 8, L.specY - 6, C.fg, { size: 10 });
    label(ctx, '橙粗线 = LPC 谱包络 1/|A(e^{jω})|', 8, L.specY + 10, C.accent, { size: 10, weight: 600 });
    label(ctx, '红点 = 包络峰（共振峰估计）', W - 8, L.specY - 6, C.named('red'), { align: 'right', size: 10 });

    /* ---------- 下：预测增益 vs 阶数 ---------- */
    if (!gainCurve) gainCurve = computeGainCurve();
    const gp = gainCurve;
    const gx = (p) => ((p - 2) / 28) * (W - 16) + 8;
    let gMax = 0;
    gp.forEach((q) => { gMax = Math.max(gMax, q[1]); });
    gMax = Math.max(gMax, 6);
    const gy = (v) => L.gainY + L.gainH - (v / gMax) * L.gainH;
    polyline(ctx, gp.map((q) => [gx(q[0]), gy(q[1])]), C.named('teal'), 2);
    const cur = gp[clamp(Math.round(s.order), 2, 30) - 2];
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(gx(cur[0]), L.gainY);
    ctx.lineTo(gx(cur[0]), L.gainY + L.gainH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(gx(cur[0]), gy(cur[1]), 4.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, `p = ${Math.round(s.order)}`, clamp(gx(cur[0]), 22, W - 22), L.gainY - 5, C.bad, {
      align: 'center', size: 11, weight: 600,
    });
    label(ctx, '横轴 = 阶数 p（2→30），纵轴 = 预测增益（-20lg 残差，越大越好）', 8, L.gainY + L.gainH + 14, C.fg, { size: 10 });
    label(ctx, '曲线走平之后再加阶数，只是白花参数', W - 8, L.gainY + L.gainH + 14, C.named('teal'), {
      align: 'right', size: 10,
    });

    /* ---------- 读数 ---------- */
    const truth = VOWELS[s.vowel].F;
    ro.set('阶数', `p = ${Math.round(s.order)}（经验值 ≈ fs/1000 + 2 = ${Math.round(FS / 1000) + 2}）`);
    ro.set('残差', `预测增益 ${fmt(cur[1], 1)} dB（残差增益 ${fmt(A.gain, 4)}）`);
    const p = Math.round(s.order);
    const kbps = ((p * 5 + 7) * (1000 / (s.frameMs / 2))) / 1000;
    ro.set('参数率', `每帧 ${p} 系数（5 bit/个）+ F0/清浊 7 bit，帧移 ${fmt(s.frameMs / 2, 1)} ms → 约 ${fmt(kbps, 1)} kbps；对比原始 PCM 16 bit×${FS} = 256 kbps`);
    ro.set('共振峰估计', peaks.length
      ? peaks.map((q) => fmt(q.f, 0)).join(' / ') + ' Hz'
      : '—（阶数太低，包络还没长出峰）');
    ro.set('共振峰真值', truth.join(' / ') + ' Hz');
  }

  /* ---------- 拖拽：上拖窗位、下拖阶数 ---------- */
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geom) return null;
      if (y <= geom.waveH) return 'frame';
      if (y >= geom.gainY - 6) return 'order';
      return null;
    },
    move(id, x) {
      if (id === 'frame') {
        const { n } = frameAt();
        s.pos = clamp((x / geom.W) * sig.length - n / 2, 0, sig.length - n) / Math.max(1, sig.length - n);
        gainCurve = null;
        draw();
      } else if (id === 'order') {
        setOrder(Math.round(2 + clamp((x - 8) / (geom.W - 16), 0, 1) * 28));
      }
    },
  });

  /* 拖下方曲线改阶数时，把第一根滑块（阶数 p）同步过去 */
  function setOrder(p) {
    const v = clamp(Math.round(p), 2, 30);
    if (v === Math.round(s.order)) return;
    s.order = v;
    sl.state.order = v;
    const inp = sl.box.querySelectorAll('input')[0];
    if (inp) {
      inp.value = String(v);
      const val = inp.parentNode.querySelector('.ml-slider__val');
      if (val) val.textContent = String(v);
    }
    draw();
  }

  const sl = buildSliders(
    {
      sliders: [
        { name: 'order', label: '阶数 p', min: 2, max: 30, step: 1, value: s.order, fmt: 0 },
        { name: 'noise', label: '观测噪声', min: 0, max: 0.15, step: 0.005, value: s.noise, fmt: 3 },
        { name: 'frameMs', label: '帧长', min: 10, max: 40, step: 1, value: s.frameMs, fmt: 0 },
      ],
    },
    (st) => {
      const reSynth = st.noise !== s.noise;
      s.order = st.order;
      s.noise = st.noise;
      s.frameMs = st.frameMs;
      if (reSynth) sig = synthVowel(s.vowel, s.noise);
      gainCurve = null;
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  engine('dsp').then((m) => {
    dsp = m;
    gainCurve = null;
    draw();
  }).catch(() => { void 0; });

  return { slidersBox: sl.box };
}

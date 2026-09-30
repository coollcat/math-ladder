/* =========================================================================
 * lab 组件：audio-codec-lab（MP3 / AAC 的取舍 —— 码率花在哪些频段上）
 * -------------------------------------------------------------------------
 * 演示什么
 *   一分钟 CD 音质是 1411 kbps（16 bit × 44.1 kHz × 2 声道），MP3 用 128 kbps
 *   就能让大多数人满意——省掉的 90% 不是靠「算得更聪明」，而是靠一句心理声学：
 *   **凡是落在掩蔽阈值以下的东西，丢了也听不出来。**
 *
 *   本组件把编码器内部的取舍摊开在图上：
 *     ① 算出素材自己的掩蔽阈值 T(f)（沿用 masking-lab 的 Bark 扩展模型）；
 *     ② 每个临界频带按需付费：把噪声压到阈值以下 k dB（安全余量）需要
 *        SNR 分贝，每 6.02 dB 值 1 bit，于是一条带宽 B(Hz) 的频带每秒要花
 *        B × SNR / 6.02 bit；
 *     ③ 预算不够时，编码器**从高频往低频砍**——先牺牲带宽，再让临界带里
 *        ​冒出可听噪声。这就是低码率 MP3「发闷 + 高频嘶声」的来源。
 *
 *   三个必须玩出来的结论：
 *     · 强音所在的频带几乎不花钱（它把自己掩蔽了），花钱的是强音两侧的
 *       「裙边」——所以复杂段落（交响、摇滚）比独奏难压。拖「素材复杂度」
 *       看预算怎么被吃光。
 *     · 码率一降，最先掉的是**带宽**而不是音质：截止频率从 20 kHz 一路退到
 *       5 kHz，图上右侧整片被划掉。
 *     · 安全余量调到 0（理论极限）能省一大截码率，但真实编码器不敢这么做：
 *       掩蔽阈值是估出来的，估错一点噪声就露馅了。
 *
 * 怎么玩
 *   · 拖画面（或下方码率尺）左右移动光标 = 改码率，全图实时重算。
 *   · 点「▶ 播放」听原始与编码后的差别（音量默认 0.2）。
 *
 * 用法（课文里写 ```lab 围栏）
 *
 *   ```lab
 *   {
 *     "type": "audio-codec-lab",
 *     "title": "把码率拖到 64 kbps，看高频是怎么被砍掉的"
 *   }
 *   ```
 *
 * spec 字段（全部可省，缺省值如下）
 *   bitrate   码率（kbps，立体声总计），32–320，默认 128
 *   complexity 素材复杂度 0–1，默认 0.45（越高高频内容越多、越难压）
 *   margin    安全余量（dB），0–12，默认 6
 *   seconds   计算文件体积用的时长（秒），默认 240（4 分钟）
 *   vol       播放音量，0–0.4，默认 0.2
 *   height    画布高度（像素），默认 380
 *
 * 出声：是。走 core.audioShell（■ 停止 / 离屏自动停），默认音量 0.2。
 * 引擎：dsp（fft / window / ampToDb）+ audio（AudioBuffer 播放）。
 * 模型口径（写在注释里，别当实测数据引用）
 *   · 频谱用 Welch 平均谱，电平取「每根谱线的幅度谱级」，0 dBFS 折合 92 dB SPL。
 *   · 掩蔽阈值 T(f) = max(ATH(f), 各音调掩蔽者 L + S(Δz)，各 Bark 带噪声掩蔽者
 *     L_noise − 5 + S(Δz))，S 是 Schroeder 两斜率扩展函数。
 *   · 频带按 1 Bark 一条划分；带内需要 SNR = 带内峰值谱级 − (带内最低阈值 − 余量)。
 *   · 立体声：每声道分到 bitrate/2，再扣 8% 边信息（真实编码器的标度因子等）。
 *   · 它忽略了立体声冗余、瞬态预回声、时域噪声整形这些真实开销，所以算出来的
 *     「透明码率」比工程实际（约 128–160 kbps）偏低——这一点在读数里也标了。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, engine, audioShell, buildSliders, buildSegmented,
  buildReadout, polyline, label, clamp, fmt, mulberry32,
  clearBg,
} from '../core.js';
import {
  bark,
  spread,
  ath,
} from '../engines/dsp.js';

const FS = 44100;
const DUR = 1.0;
const N = 1024;
const HOP = 512;
const SPL_REF = 92;      // 0 dBFS 折合的声压级（常见的监听校准）
const SIDE = 0.08;       // 边信息开销
const NBARK = 24;

const F_LO = 50;
const F_HI = 22050;

/* 合成「素材」：一个和弦 + 粉噪 + 若干高频泛音 + 中段一记镲。
   complexity 越大，高频内容越多（越难压）。 */
function buildSignal(complexity) {
  const n = Math.round(DUR * FS);
  const x = new Float64Array(n);
  const rnd = mulberry32(20260831);
  for (let i = 0; i < n; i += 1) {
    const t = i / FS;
    let v = 0;
    [220, 277, 330, 440, 554].forEach((f, k) => {
      v += Math.sin(2 * Math.PI * f * t + k) * (0.42 / (k + 1));
    });
    const nHi = Math.round(3 + 9 * complexity);
    for (let k = 0; k < nHi; k += 1) {
      const f = 1800 + k * 1150 + (k % 3) * 130;
      v += Math.sin(2 * Math.PI * f * t + k * 2.1) * (0.035 + 0.05 * complexity);
    }
    x[i] = v;
  }
  /* 粉噪：白噪过一阶低通，再按复杂度定底噪高度 */
  let lp = 0;
  const pink = 0.04 + 0.10 * complexity;
  for (let i = 0; i < n; i += 1) {
    lp = lp * 0.86 + (rnd() * 2 - 1) * 0.14;
    x[i] += lp * pink * 3;
  }
  /* 镲：中段一次宽带爆发 */
  for (let i = Math.round(0.42 * FS); i < Math.round(0.52 * FS); i += 1) {
    const u = (i - 0.42 * FS) / (0.1 * FS);
    x[i] += (rnd() * 2 - 1) * 0.35 * Math.exp(-3 * u);
  }
  let peak = 0;
  for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(x[i]));
  for (let i = 0; i < n; i += 1) x[i] = (x[i] / (peak || 1)) * 0.9;
  return x;
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    bitrate: clamp(spec.bitrate ?? 128, 32, 320),
    complexity: clamp(spec.complexity ?? 0.45, 0, 1),
    margin: clamp(spec.margin ?? 6, 0, 12),
    seconds: spec.seconds ?? 240,
    vol: spec.vol ?? 0.2,
  };
  let listen = 'coded';

  let dsp = null;
  let sig = null;
  let level = null;      // 每根谱线的幅度谱级（dB SPL）
  let thr = null;        // 掩蔽阈值（dB SPL）
  let bands = [];
  let cutoff = F_HI;
  let maxExcess = 0;
  let coded = null;      // 编码后的波形

  const bins = N / 2 + 1;
  const binHz = (k) => (k * FS) / N;

  const cv = setupCanvas(host, spec.height || 380);
  host.appendChild(buildSegmented(
    [{ label: '听：原始', value: 'orig' }, { label: '听：编码后', value: 'coded' }],
    listen,
    (v) => {
      listen = v;
      if (playing) restart();
      draw();
    },
  ));
  const ro = buildReadout({
    码率: '—', 文件体积: '—', 截止频率: '—', 每样本: '—', 音质: '—',
  });
  host.appendChild(ro.box);

  /* ---------- 素材 → 频谱 → 掩蔽阈值 → 分带代价 ---------- */
  function recomputeSignal() {
    if (!dsp) return;
    sig = buildSignal(s.complexity);
    const w = dsp.window('hann', N);
    const acc = new Float64Array(bins);
    let frames = 0;
    for (let s0 = 0; s0 + N <= sig.length; s0 += HOP) {
      const re = new Float64Array(N);
      for (let i = 0; i < N; i += 1) re[i] = sig[s0 + i] * w[i];
      const im = new Float64Array(N);
      dsp.fft(re, im, false);
      for (let k = 0; k < bins; k += 1) acc[k] += Math.hypot(re[k], im[k]);
      frames += 1;
    }
    level = new Float64Array(bins);
    for (let k = 0; k < bins; k += 1) {
      /* 2·|X|/N 是这一根谱线对应的时域幅度，故叫「幅度谱级」 */
      level[k] = dsp.ampToDb((2 * (acc[k] / Math.max(1, frames))) / N) + SPL_REF;
    }
    computeThreshold();
    computeBands();
  }

  function computeThreshold() {
    thr = new Float64Array(bins);
    for (let k = 0; k < bins; k += 1) thr[k] = ath(binHz(k));
    const zs = new Float64Array(bins);
    for (let k = 0; k < bins; k += 1) zs[k] = bark(binHz(k));

    /* 音调掩蔽者：显著的谱峰（突起 ≥ 7 dB，最多取 10 个） */
    const peaks = [];
    for (let k = 2; k < bins - 2; k += 1) {
      if (level[k] <= level[k - 1] || level[k] < level[k + 1]) continue;
      let l = level[k];
      for (let j = k - 1; j >= 0 && level[j] <= level[k] && j > k - 40; j -= 1) l = Math.min(l, level[j]);
      let r = level[k];
      for (let j = k + 1; j < bins && level[j] <= level[k] && j < k + 40; j += 1) r = Math.min(r, level[j]);
      if (level[k] - Math.max(l, r) >= 7) peaks.push({ k, L: level[k] });
    }
    peaks.sort((a, b) => b.L - a.L);
    peaks.slice(0, 10).forEach((p) => {
      for (let k = 0; k < bins; k += 1) {
        thr[k] = Math.max(thr[k], p.L + spread(zs[k] - zs[p.k]));
      }
    });
    /* 噪声掩蔽者：每个 Bark 带里「不算谱峰」的那部分能量，掩蔽能力弱 5 dB */
    const peakSet = new Set(peaks.slice(0, 10).map((p) => p.k));
    for (let b = 0; b < NBARK; b += 1) {
      let pw = 0;
      let cnt = 0;
      let zsum = 0;
      for (let k = 1; k < bins; k += 1) {
        if (Math.min(NBARK - 1, Math.floor(zs[k])) !== b) continue;
        if (peakSet.has(k)) continue;
        pw += dbToAmp(level[k] - SPL_REF) ** 2;
        zsum += zs[k];
        cnt += 1;
      }
      if (!cnt) continue;
      const Ln = dsp.ampToDb(Math.sqrt(pw / cnt)) + SPL_REF - 5;
      const zb = zsum / cnt;
      for (let k = 0; k < bins; k += 1) thr[k] = Math.max(thr[k], Ln + spread(zs[k] - zb));
    }
  }

  function computeBands() {
    bands = [];
    for (let b = 0; b < NBARK; b += 1) bands.push({ b, ks: [] });
    for (let k = 1; k < bins; k += 1) {
      bands[clamp(Math.floor(bark(binHz(k))), 0, NBARK - 1)].ks.push(k);
    }
    bands = bands.filter((bd) => bd.ks.length);
    bands.forEach((bd) => {
      let peakL = -Infinity;
      let thrMin = Infinity;
      bd.ks.forEach((k) => {
        peakL = Math.max(peakL, level[k]);
        thrMin = Math.min(thrMin, thr[k]);
      });
      bd.f0 = binHz(bd.ks[0]);
      bd.f1 = binHz(bd.ks[bd.ks.length - 1]);
      bd.bw = bd.f1 - bd.f0 + FS / N;
      bd.peakL = peakL;
      bd.thrMin = thrMin;
      bd.snrNeed = Math.max(0, peakL - (thrMin - s.margin));
      bd.cost = (bd.bw * bd.snrNeed) / 6.02;
      bd.z = bark((bd.f0 + bd.f1) / 2);
    });
  }

  /* ---------- 预算分配：从低频往上买，买不起就砍 ---------- */
  function allocate() {
    if (!bands.length) return;
    let budget = (s.bitrate * 1000 * (1 - SIDE)) / 2;   // 立体声：每声道一半
    cutoff = F_HI;
    maxExcess = 0;
    let i = 0;
    for (; i < bands.length; i += 1) {
      const bd = bands[i];
      if (bd.cost <= budget) {
        budget -= bd.cost;
        bd.served = true;
        bd.snr = bd.snrNeed;
      } else {
        /* 最后一个买得起的带：按剩余预算打折，噪声就会冒出阈值 */
        bd.served = true;
        bd.snr = (budget / Math.max(1, bd.bw)) * 6.02;
        budget = 0;
        i += 1;
        break;
      }
    }
    for (; i < bands.length; i += 1) {
      bands[i].served = false;
      bands[i].snr = 0;
      cutoff = Math.min(cutoff, bands[i].f0);
    }
    bands.forEach((bd) => {
      bd.noiseDb = bd.served ? bd.peakL - bd.snr : -Infinity;
      if (bd.served) {
        for (let j = 0; j < bd.ks.length; j += 1) {
          maxExcess = Math.max(maxExcess, bd.noiseDb - thr[bd.ks[j]]);
        }
      }
    });
    maxExcess = Math.max(0, maxExcess);
  }

  /* ---------- 真的编一次：STFT → 削高频 + 按带加噪声 → 逆变换重叠相加 ---------- */
  function codeSignal() {
    if (!dsp || !sig) return null;
    const noiseAmp = new Float64Array(bins);
    bands.forEach((bd) => {
      const a = bd.served ? dbToAmp(bd.noiseDb - SPL_REF) : 0;
      bd.ks.forEach((k) => { noiseAmp[k] = a; });
    });
    const w = dsp.window('hann', N);
    const out = new Float64Array(sig.length);
    const rnd = mulberry32(424242);
    for (let s0 = 0; s0 + N <= sig.length; s0 += HOP) {
      const re = new Float64Array(N);
      const im = new Float64Array(N);
      for (let i = 0; i < N; i += 1) re[i] = sig[s0 + i] * w[i];
      dsp.fft(re, im, false);
      for (let k = 1; k < bins - 1; k += 1) {
        const f = binHz(k);
        const a = f > cutoff ? 0 : noiseAmp[k];
        if (a <= 0 && f > cutoff) {
          re[k] = 0; im[k] = 0; re[N - k] = 0; im[N - k] = 0;
          continue;
        }
        if (a <= 0) continue;
        const m = (a * N) / 2;          // 谱线幅度 → 未归一化 FFT 的模
        const ph = rnd() * Math.PI * 2;
        re[k] += m * Math.cos(ph); im[k] += m * Math.sin(ph);
        re[N - k] += m * Math.cos(ph); im[N - k] -= m * Math.sin(ph);
      }
      if (binHz(bins - 1) > cutoff) { re[N / 2] = 0; im[N / 2] = 0; }
      dsp.fft(re, im, true);
      for (let i = 0; i < N; i += 1) out[s0 + i] += re[i];
    }
    let peak = 0;
    for (let i = 0; i < out.length; i += 1) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 1e-9) {
      const g = Math.min(0.9 / peak, 1.6);
      for (let i = 0; i < out.length; i += 1) out[i] *= g;
    }
    return out;
  }

  /* ---------- 绘制 ---------- */
  const PAD = { l: 36, r: 12, t: 22 };
  let geom = null;

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const barY = H - 62;
    const plotH = barY - PAD.t - 26;
    geom = { x0: PAD.l, x1: W - PAD.r, y0: PAD.t, y1: PAD.t + plotH, barY, W, H };
    clearBg(ctx, W, H, C);

    const fx = (f) => geom.x0 + (Math.log(clamp(f, F_LO, F_HI) / F_LO) / Math.log(F_HI / F_LO)) * (geom.x1 - geom.x0);
    const DB_LO = -10;
    const DB_HI = 100;
    const dy = (db) => geom.y1 - ((clamp(db, DB_LO, DB_HI) - DB_LO) / (DB_HI - DB_LO)) * (geom.y1 - geom.y0);

    if (!dsp || !level) {
      label(ctx, '正在载入 dsp 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }
    allocate();

    /* 网格 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    [100, 1000, 10000].forEach((f) => {
      const x = fx(f);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, geom.y0);
      ctx.lineTo(x + 0.5, geom.y1);
      ctx.stroke();
      label(ctx, f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz', x, geom.y1 + 14, C.fg, { align: 'center', size: 10 });
    });
    for (let db = 0; db <= 80; db += 20) {
      const y = dy(db);
      ctx.beginPath();
      ctx.moveTo(geom.x0, y + 0.5);
      ctx.lineTo(geom.x1, y + 0.5);
      ctx.stroke();
      label(ctx, db + '', geom.x0 - 5, y + 4, C.fg, { align: 'right', size: 10 });
    }
    label(ctx, 'dB SPL', geom.x0 - 5, geom.y0 - 6, C.fg, { align: 'right', size: 10 });

    /* 被砍掉的高频：整片涂掉 */
    if (cutoff < F_HI) {
      const xc = fx(cutoff);
      ctx.fillStyle = C.soft;
      ctx.fillRect(xc, geom.y0, geom.x1 - xc, geom.y1 - geom.y0);
      ctx.save();
      ctx.strokeStyle = C.bad;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      for (let x = xc - (geom.y1 - geom.y0); x < geom.x1; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, geom.y1);
        ctx.lineTo(x + (geom.y1 - geom.y0), geom.y0);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(xc + 0.5, geom.y0);
      ctx.lineTo(xc + 0.5, geom.y1);
      ctx.stroke();
      label(ctx, `砍掉 ${fmt(cutoff / 1000, 1)} kHz 以上`, xc + 5, geom.y0 + 14, C.bad, { size: 10, weight: 600 });
    }

    /* 素材谱（灰细） */
    const sp = [];
    for (let k = 1; k < bins; k += 1) sp.push([fx(binHz(k)), dy(level[k])]);
    polyline(ctx, sp, C.axis, 1);

    /* 掩蔽阈值（虚线） */
    const tp = [];
    for (let k = 1; k < bins; k += 1) tp.push([fx(binHz(k)), dy(thr[k])]);
    polyline(ctx, tp, C.named('teal'), 1.6, [6, 4]);

    /* 量化噪声 floor（阶梯）+ 冒出阈值的部分涂红 */
    const np = [];
    bands.forEach((bd) => {
      if (!bd.served) return;
      const y = dy(bd.noiseDb);
      np.push([fx(bd.f0), y], [fx(bd.f1), y]);
      const over = bd.noiseDb > bd.thrMin + 0.2;
      if (over) {
        ctx.fillStyle = C.bad;
        ctx.globalAlpha = 0.25;
        const xa = fx(bd.f0);
        const xb = fx(bd.f1);
        ctx.fillRect(xa, y, Math.max(1, xb - xa), dy(bd.thrMin) - y);
        ctx.globalAlpha = 1;
      }
    });
    if (np.length) polyline(ctx, np, C.accent, 2.2);

    label(ctx, '灰细 = 素材频谱　青虚 = 掩蔽阈值　橙阶梯 = 量化噪声', geom.x0 + 6, geom.y0 + 14, C.fg, { size: 10 });
    if (maxExcess > 0.2) {
      label(ctx, `红色区 = 噪声冒出阈值（最多高 ${fmt(maxExcess, 1)} dB，会听出杂音）`,
        geom.x0 + 6, geom.y0 + 30, C.bad, { size: 10, weight: 600 });
    } else {
      label(ctx, '噪声全程压在阈值以下 → 这一段听不出失真', geom.x0 + 6, geom.y0 + 30, C.ok, { size: 10, weight: 600 });
    }

    /* ---------- 码率尺 ---------- */
    const bx0 = geom.x0;
    const bx1 = geom.x1;
    const by = barY;
    const bh = 16;
    ctx.fillStyle = C.soft;
    ctx.fillRect(bx0, by, bx1 - bx0, bh);
    [128, 192, 320].forEach((kb) => {
      const x = bx0 + ((kb - 32) / 288) * (bx1 - bx0);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, by - 4);
      ctx.lineTo(x + 0.5, by + bh + 4);
      ctx.stroke();
      label(ctx, String(kb), x, by + bh + 16, C.fg, { align: 'center', size: 10 });
    });
    const cx = bx0 + ((s.bitrate - 32) / 288) * (bx1 - bx0);
    ctx.fillStyle = C.accent;
    ctx.fillRect(cx - 4, by - 3, 8, bh + 6);
    label(ctx, `${fmt(s.bitrate, 0)} kbps`, clamp(cx, 30, bx1 - 30), by - 8, C.accent, {
      align: 'center', size: 11, weight: 600,
    });
    label(ctx, '← 拖我（或拖画面任何地方）改码率 →', bx0, by + bh + 30, C.fg, { size: 10 });

    /* ---------- 读数 ---------- */
    const mb = (s.bitrate * 1000 * s.seconds) / 8 / 1e6;
    const bwScore = clamp(Math.log(Math.max(cutoff, 3000) / 3000) / Math.log(20000 / 3000), 0, 1);
    const noiseScore = clamp(1 - maxExcess / 20, 0, 1);
    const q = Math.round(40 * bwScore + 60 * noiseScore);
    ro.set('码率', `${fmt(s.bitrate, 0)} kbps（每声道 ${fmt((s.bitrate * (1 - SIDE)) / 2, 1)} kbps，扣 ${Math.round(SIDE * 100)}% 边信息）`);
    ro.set('文件体积', `${fmt(s.seconds / 60, 0)} 分钟 = ${fmt(mb, 1)} MB（CD 音质同长度 ${fmt((1411 * s.seconds) / 8 / 1000, 0)} MB）`);
    ro.set('截止频率', cutoff >= F_HI - 100 ? '全带宽 22.05 kHz' : `${fmt(cutoff / 1000, 2)} kHz（${fmt((cutoff / F_HI) * 100, 0)}% 带宽）`);
    ro.set('每样本', `${fmt((s.bitrate * 1000) / (FS * 2), 2)} bit（原始 16 bit，压缩 ${fmt((16 * FS * 2) / (s.bitrate * 1000), 1)}×）`);
    ro.set('音质', `${q} / 100　${q >= 90 ? '透明' : q >= 70 ? '优' : q >= 50 ? '中' : '差'}（启发式评分：带宽 40 + 噪声 60，非 MUSHRA）`);
  }

  /* ---------- 拖拽 = 改码率 ---------- */
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geom) return null;
      if (y <= geom.y1 + 8 || (y >= geom.barY - 12 && y <= geom.barY + 34)) return 'rate';
      return null;
    },
    move(id, x) {
      const t = clamp((x - geom.x0) / (geom.x1 - geom.x0), 0, 1);
      setBitrate(Math.round(32 + t * 288));
    },
  });

  function setBitrate(kb) {
    const v = clamp(Math.round(kb), 32, 320);
    if (v === Math.round(s.bitrate)) return;
    s.bitrate = v;
    sl.state.bitrate = v;
    const inp = sl.box.querySelectorAll('input')[0];
    if (inp) {
      inp.value = String(v);
      const val = inp.parentNode.querySelector('.ml-slider__val');
      if (val) val.textContent = String(v);
    }
    scheduleCode();
    draw();
  }

  /* 编码后的音频算起来有点重（一帧一次 FFT），拖动时防抖，画面不等它 */
  let codeTimer = null;
  function scheduleCode() {
    if (codeTimer) clearTimeout(codeTimer);
    codeTimer = setTimeout(() => {
      codeTimer = null;
      coded = codeSignal();
      if (playing) restart();
    }, 220);
  }

  /* ---------- 出声 ---------- */
  let engRef = null;
  let node = null;
  let gainNode = null;
  let playing = false;

  function restart() {
    if (!engRef || !sig) return null;
    if (listen === 'coded' && !coded) coded = codeSignal();
    const data = listen === 'coded' ? coded : sig;
    if (node) {
      try { node.stop(); } catch (e) { void e; }
      try { node.disconnect(); } catch (e) { void e; }
    }
    if (gainNode) {
      try { gainNode.disconnect(); } catch (e) { void e; }
    }
    const buf = engRef.ctx.createBuffer(1, data.length, FS);
    buf.copyToChannel(Float32Array.from(data), 0);
    node = engRef.ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    gainNode = engRef.ctx.createGain();
    gainNode.gain.value = clamp(s.vol, 0, 0.5);
    node.connect(gainNode);
    gainNode.connect(engRef.master);
    node.start(0);
    return gainNode;
  }

  const shell = audioShell(host, (eng, api) => {
    eng.setMasterGain(0.8);
    engRef = eng;
    playing = true;
    const g = restart();
    api.hint.textContent = `循环播放：${listen === 'coded' ? `编码后（${fmt(s.bitrate, 0)} kbps）` : '原始'}，音量 ${fmt(s.vol, 2)}`;
    return () => {
      playing = false;
      if (node) {
        try { node.stop(); } catch (e) { void e; }
        try { node.disconnect(); } catch (e) { void e; }
        node = null;
      }
      if (g) {
        try { g.disconnect(); } catch (e) { void e; }
      }
      engRef = null;
    };
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'bitrate', label: '码率', min: 32, max: 320, step: 1, value: s.bitrate, fmt: 0 },
        { name: 'complexity', label: '素材复杂度', min: 0, max: 1, step: 0.05, value: s.complexity, fmt: 2 },
        { name: 'margin', label: '安全余量', min: 0, max: 12, step: 1, value: s.margin, fmt: 0 },
        { name: 'vol', label: '音量', min: 0, max: 0.4, step: 0.02, value: s.vol, fmt: 2 },
      ],
    },
    (st) => {
      const reSig = st.complexity !== s.complexity;
      s.bitrate = st.bitrate;
      s.complexity = st.complexity;
      s.margin = st.margin;
      s.vol = st.vol;
      if (reSig) {
        recomputeSignal();
      } else {
        computeBands();
      }
      if (gainNode && engRef) {
        gainNode.gain.setTargetAtTime(clamp(s.vol, 0, 0.5), engRef.ctx.currentTime, 0.02);
      }
      scheduleCode();
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  engine('dsp').then((m) => {
    dsp = m;
    recomputeSignal();
    coded = codeSignal();
    draw();
  }).catch(() => { void 0; });

  return {
    slidersBox: sl.box,
    destroy() {
      shell.stop();
      if (codeTimer) clearTimeout(codeTimer);
    },
  };
}

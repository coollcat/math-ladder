/* 数字信号处理引擎 —— 纯函数库，无 DOM 依赖（可在 node 里单测）。
   服务章节：61 的延伸、68 音频、69 语音、70 图像视频。
   所有频率单位 Hz，幅度默认线性，标 dB 的函数名带 Db 后缀。 */

/* ---------- 基础换算 ---------- */

const ampToDb = (a) => 20 * Math.log10(Math.max(Math.abs(a), 1e-12));
const dbToAmp = (d) => 10 ** (d / 20);
const powToDb = (p) => 10 * Math.log10(Math.max(p, 1e-12));

/* ---------- FFT：迭代基 2，原地运算 ---------- */

function bitReverse(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
}

/* 原地 FFT。n 必须是 2 的幂，不足时调用方自行补零。inverse=true 做逆变换（不归一化） */
function fft(re, im, inverse = false) {
  const n = re.length;
  bitReverse(re, im);
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k += 1) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + half] * cr - im[i + k + half] * ci;
        const vi = re[i + k + half] * ci + im[i + k + half] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i += 1) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/* 实数序列频谱：返回 { mag, phase, re, im }，长度为 N/2+1（含直流与 Nyquist） */
function rfft(x) {
  const n = x.length;
  const re = Float64Array.from(x);
  const im = new Float64Array(n);
  fft(re, im);
  const half = Math.floor(n / 2) + 1;
  const mag = new Float64Array(half);
  const phase = new Float64Array(half);
  for (let k = 0; k < half; k += 1) {
    mag[k] = Math.hypot(re[k], im[k]) / n;
    phase[k] = Math.atan2(im[k], re[k]);
  }
  return { mag, phase, re, im, bins: half };
}

function isPow2(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

/* 补零到最近的 2 的幂，便于 FFT */
function padPow2(x, minLen = 0) {
  let n = 1;
  const need = Math.max(x.length, minLen);
  while (n < need) n <<= 1;
  if (n === x.length) return Float64Array.from(x);
  const out = new Float64Array(n);
  out.set(x);
  return out;
}

/* ---------- 窗函数 ---------- */

const WINDOWS = {
  rect: (n) => new Float64Array(n).fill(1),
  hann: (n) => {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i += 1) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1 || 1));
    return w;
  },
  hamming: (n) => {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i += 1) w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1 || 1));
    return w;
  },
  blackman: (n) => {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      const t = (2 * Math.PI * i) / (n - 1 || 1);
      w[i] = 0.42 - 0.5 * Math.cos(t) + 0.08 * Math.cos(2 * t);
    }
    return w;
  },
};

function window(name, n) {
  return (WINDOWS[name] || WINDOWS.hann)(n);
}

/* 分帧：hop < frameLen 时有重叠 */
function frame(x, frameLen, hop) {
  const out = [];
  for (let s = 0; s + frameLen <= x.length; s += hop) {
    out.push(x.slice(s, s + frameLen));
  }
  return out;
}

/* ---------- 双二阶滤波器（RBJ Audio EQ Cookbook） ----------
   约定：H(z) = (b0 + b1 z^-1 + b2 z^-2) / (1 + a1 z^-1 + a2 z^-2)
   与 Web Audio BiquadFilterNode 的系数字面一致，可直接喂给 getFrequencyResponse。 */

function biquad(type, freq, Q, gainDb, fs) {
  const w0 = (2 * Math.PI * freq) / fs;
  const cw = Math.cos(w0);
  const sw = Math.sin(w0);
  const A = 10 ** ((gainDb || 0) / 40);
  let alpha = sw / (2 * Math.max(Q, 1e-6));
  if (type === 'lowshelf' || type === 'highshelf') {
    alpha = (sw / 2) * Math.sqrt((A + 1 / A) * (1 / 1 - 1) + 2);
  }
  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = alpha; b1 = 0; b2 = -alpha;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
      break;
    case 'notch':
      b0 = 1; b1 = -2 * cw; b2 = 1;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
      break;
    case 'allpass':
      b0 = 1 - alpha; b1 = -2 * cw; b2 = 1 + alpha;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
      break;
    case 'lowshelf': {
      const sa = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) - (A - 1) * cw + sa);
      b1 = 2 * A * ((A - 1) - (A + 1) * cw);
      b2 = A * ((A + 1) - (A - 1) * cw - sa);
      a0 = (A + 1) + (A - 1) * cw + sa;
      a1 = -2 * ((A - 1) + (A + 1) * cw);
      a2 = (A + 1) + (A - 1) * cw - sa;
      break;
    }
    case 'highshelf': {
      const sa = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) + (A - 1) * cw + sa);
      b1 = -2 * A * ((A - 1) + (A + 1) * cw);
      b2 = A * ((A + 1) + (A - 1) * cw - sa);
      a0 = (A + 1) - (A - 1) * cw + sa;
      a1 = 2 * ((A - 1) - (A + 1) * cw);
      a2 = (A + 1) - (A - 1) * cw - sa;
      break;
    }
    default:
      break;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/* 频率响应：给定归一化系数与频率数组，返回 { magDb, phase } */
function biquadResponse(c, freqs, fs) {
  const magDb = new Float64Array(freqs.length);
  const phase = new Float64Array(freqs.length);
  for (let i = 0; i < freqs.length; i += 1) {
    const w = (2 * Math.PI * freqs[i]) / fs;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const c2w = Math.cos(2 * w);
    const s2w = Math.sin(2 * w);
    const nr = c.b0 + c.b1 * cw + c.b2 * c2w;
    const ni = -(c.b1 * sw + c.b2 * s2w);
    const dr = 1 + c.a1 * cw + c.a2 * c2w;
    const di = -(c.a1 * sw + c.a2 * s2w);
    const dm = Math.hypot(dr, di) || 1e-12;
    magDb[i] = 20 * Math.log10(Math.hypot(nr, ni) / dm);
    phase[i] = Math.atan2(ni, nr) - Math.atan2(di, dr);
  }
  return { magDb, phase };
}

/* ---------- 多速率 ---------- */

/* 线性插值重采样 */
function resample(x, from, to) {
  if (from === to) return Float64Array.from(x);
  const ratio = from / to;
  const outLen = Math.max(1, Math.floor(x.length / ratio));
  const out = new Float64Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const p = i * ratio;
    const i0 = Math.floor(p);
    const frac = p - i0;
    const a = x[i0] || 0;
    const b = x[i0 + 1] || 0;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/* 整数倍抽取 / 插值（不做抗混叠滤波，留给调用方讲清道理） */
const decimate = (x, m) => {
  const out = new Float64Array(Math.floor(x.length / m));
  for (let i = 0; i < out.length; i += 1) out[i] = x[i * m];
  return out;
};

/* ---------- 时域特征 ---------- */

/* 自相关 r[k] = sum x[n] x[n+k]（归一化到 r[0]=1） */
function autocorr(x, maxLag) {
  const n = x.length;
  const L = Math.min(maxLag || Math.floor(n / 2), n - 1);
  const r = new Float64Array(L + 1);
  for (let k = 0; k <= L; k += 1) {
    let s = 0;
    for (let i = 0; i + k < n; i += 1) s += x[i] * x[i + k];
    r[k] = s;
  }
  if (r[0] > 0) for (let k = 0; k <= L; k += 1) r[k] /= r[0];
  return r;
}

/* 自相关法基频检测：在 [minLag, maxLag] 找最大峰，抛物插值细化 */
function detectPitch(x, fs, fmin = 70, fmax = 400) {
  const minLag = Math.max(2, Math.floor(fs / fmax));
  const maxLag = Math.min(Math.floor(fs / fmin), x.length - 1);
  if (maxLag <= minLag) return { f0: 0, clarity: 0, lag: 0 };
  const r = autocorr(x, maxLag);
  let best = minLag;
  let bestV = -Infinity;
  for (let k = minLag; k <= maxLag; k += 1) {
    if (r[k] > bestV) {
      bestV = r[k];
      best = k;
    }
  }
  /* 抛物线插值：用峰左右两点修整峰位，得到亚样本精度 */
  let lag = best;
  if (best > 0 && best < maxLag) {
    const y0 = r[best - 1];
    const y1 = r[best];
    const y2 = r[best + 1];
    const denom = 2 * (2 * y1 - y0 - y2);
    if (Math.abs(denom) > 1e-12) lag = best + (y2 - y0) / denom;
  }
  return { f0: lag > 0 ? fs / lag : 0, clarity: Math.max(0, bestV), lag };
}

/* 短时能量与过零率：清浊音判定的两个朴素指标 */
function shortTimeEnergy(x) {
  let s = 0;
  for (let i = 0; i < x.length; i += 1) s += x[i] * x[i];
  return s / Math.max(1, x.length);
}

function zeroCrossRate(x) {
  let c = 0;
  for (let i = 1; i < x.length; i += 1) if ((x[i - 1] >= 0) !== (x[i] >= 0)) c += 1;
  return c / Math.max(1, x.length - 1);
}

/* ---------- 听觉刻度与 MFCC ---------- */

const hzToMel = (f) => 2595 * Math.log10(1 + f / 700);
const melToHz = (m) => 700 * (10 ** (m / 2595) - 1);

/* 梅尔三角滤波器组：返回 nFilters × (N/2+1) 的权重矩阵 */
function melFilterbank({ nFilters = 26, fftSize = 512, fs = 16000, fmin = 0, fmax = null } = {}) {
  const hi = fmax || fs / 2;
  const bins = Math.floor(fftSize / 2) + 1;
  const loMel = hzToMel(fmin);
  const hiMel = hzToMel(hi);
  const pts = new Float64Array(nFilters + 2);
  for (let i = 0; i < nFilters + 2; i += 1) {
    const m = loMel + ((hiMel - loMel) * i) / (nFilters + 1);
    const f = melToHz(m);
    pts[i] = Math.floor(((fftSize + 1) * f) / fs);
  }
  const fb = [];
  for (let m = 1; m <= nFilters; m += 1) {
    const row = new Float64Array(bins);
    const left = pts[m - 1];
    const center = pts[m];
    const right = pts[m + 1];
    for (let k = Math.floor(left); k < Math.min(center, bins); k += 1) {
      row[k] = center === left ? 0 : (k - left) / (center - left);
    }
    for (let k = Math.floor(center); k < Math.min(right, bins); k += 1) {
      row[k] = right === center ? 0 : (right - k) / (right - center);
    }
    fb.push(row);
  }
  return fb;
}

/* DCT-II（不带正交归一，MFCC 惯用形式） */
function dct2(x) {
  const n = x.length;
  const out = new Float64Array(n);
  for (let k = 0; k < n; k += 1) {
    let s = 0;
    for (let i = 0; i < n; i += 1) s += x[i] * Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
    out[k] = s;
  }
  return out;
}

/* MFCC：分帧 → 窗 → 功率谱 → 梅尔滤波组 → 对数 → DCT */
function mfcc(x, { fs = 16000, frameLen = 400, hop = 160, nFilters = 26, nCeps = 13 } = {}) {
  const fb = melFilterbank({ nFilters, fftSize: frameLen, fs });
  const w = window('hann', frameLen);
  const out = [];
  for (let s = 0; s + frameLen <= x.length; s += hop) {
    const seg = new Float64Array(frameLen);
    for (let i = 0; i < frameLen; i += 1) seg[i] = x[s + i] * w[i];
    const { mag } = rfft(padPow2(seg, frameLen));
    const logE = new Float64Array(nFilters);
    for (let m = 0; m < nFilters; m += 1) {
      let e = 0;
      for (let k = 0; k < mag.length; k += 1) e += fb[m][k] * mag[k] * mag[k];
      logE[m] = Math.log(Math.max(e, 1e-10));
    }
    out.push(Array.from(dct2(logE).slice(0, nCeps)));
  }
  return out;
}

/* ---------- 线性预测 ---------- */

/* 自相关法 + Levinson-Durbin 递推求 p 阶 LPC 系数 a[1..p] */
function lpc(x, p) {
  const r = autocorr(x, p);
  const a = new Float64Array(p + 1);
  a[0] = 1;
  let err = Math.max(r[0], 1e-12);
  for (let i = 1; i <= p; i += 1) {
    let acc = r[i];
    for (let j = 1; j < i; j += 1) acc += a[j] * r[i - j];
    const k = -acc / err;
    const prev = a.slice();
    for (let j = 1; j < i; j += 1) a[j] = prev[j] + k * prev[i - j];
    a[i] = k;
    err *= 1 - k * k;
    if (err <= 0) {
      err = 1e-12;
      break;
    }
  }
  return { a, gain: Math.sqrt(Math.max(err, 0)) };
}

/* LPC 谱包络（用于与 FFT 谱叠加对比） */
function lpcEnvelope(a, gain, bins) {
  const out = new Float64Array(bins);
  for (let k = 0; k < bins; k += 1) {
    const w = (Math.PI * k) / (bins - 1);
    let re = 1;
    let im = 0;
    for (let i = 1; i < a.length; i += 1) {
      re -= a[i] * Math.cos(i * w);
      im += a[i] * Math.sin(i * w);
    }
    const m = Math.hypot(re, im) || 1e-12;
    out[k] = gain / m;
  }
  return out;
}

/* ---------- 其它 ---------- */

/* Goertzel：单频点检测，DTMF 与唤醒词演示用 */
function goertzel(x, freq, fs) {
  const k = Math.round((x.length * freq) / fs);
  const w = (2 * Math.PI * k) / x.length;
  const cw = Math.cos(w);
  const coeff = 2 * cw;
  let s0 = 0, s1 = 0, s2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    s0 = x[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2);
}

/* 语谱图：返回 frames × bins 的 dB 矩阵，画图直接取用 */
function spectrogram(x, { frameLen = 512, hop = 128, win = 'hann' } = {}) {
  const w = window(win, frameLen);
  const bins = Math.floor(frameLen / 2) + 1;
  const cols = [];
  for (let s = 0; s + frameLen <= x.length; s += hop) {
    const seg = new Float64Array(frameLen);
    for (let i = 0; i < frameLen; i += 1) seg[i] = x[s + i] * w[i];
    const { mag } = rfft(seg);
    const col = new Float64Array(bins);
    for (let k = 0; k < bins; k += 1) col[k] = ampToDb(mag[k]);
    cols.push(col);
  }
  return { cols, bins, hop, frameLen };
}

export {
  ampToDb,
  dbToAmp,
  powToDb,
  fft,
  rfft,
  isPow2,
  padPow2,
  window,
  WINDOWS,
  frame,
  biquad,
  biquadResponse,
  resample,
  decimate,
  autocorr,
  detectPitch,
  shortTimeEnergy,
  zeroCrossRate,
  hzToMel,
  melToHz,
  melFilterbank,
  dct2,
  mfcc,
  lpc,
  lpcEnvelope,
  goertzel,
  spectrogram,
};

/* =========================================================================
 * lab 组件：eye-matched-filter（通信工作台）
 * -------------------------------------------------------------------------
 * 一个可复用的通信实验台，把同一串比特依次送过：
 *
 *   比特 → 码型（NRZ / Manchester） → 载波（ASK / FSK / BPSK / QAM）
 *        → 噪声信道 → 接收采样 → 眼图 / 匹配滤波 / 同步 / 跳频视角
 *
 * 五种视图：
 *   link     同屏看比特、码型、载波和星座点；适合第 10/20/30/40 课
 *   eye      叠加两符号窗口，拖动采样相位，观察噪声和 ISI 如何压低眼开度
 *   matched  滑动相关，看到匹配滤波尖峰；可切换原模板、单位能量、单位峰值
 *   sync     同时看载波相位误差旋转星座、定时误差破坏眼图
 *   spread   79 频道跳频 / AFH 的命中账本
 *
 * 关键字：
 *   噪声 σ、采样相位 τ、成形滚降 β、滤波器归一化、ISI 惩罚。
 *
 * 交互约定：
 *   - 比特方块可直接点击翻转；改变后眼图、相关峰和星座一起重算。
 *   - 播放：逐符号扫描；离屏自动暂停。
 *   - prefers-reduced-motion：播放按钮停用，画面保持静态终态。
 *
 * spec 字段（都可省，默认值见 BASE）：
 *   view, bits, code, carrier, norm, noise, phase, beta, cycles, theta, jam, seed
 *   bits 可写 "1011001"。
 *
 * 工程边界：
 *   这是教学用的基带 / 低采样率模型。升余弦脉冲是理想限带脉冲的截断版，
 *   噪声用确定性伪随机序列，目的是让每次刷新可复现，不冒充射频链路模拟器。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, mergeSpec, buildSegmented,
  el, label, polyline, arrow, clamp, fmt, buildReadout,
  anim, lcg, gaussOf, mulberry32, clearBg,
} from '../core.js';

const SPS = 32;          // 每个符号的采样点数
const SPAN = 8;          // 脉冲截断半径（符号）
const EYE_WINDOW = 2;    // 眼图窗口长度（符号）
const BITS_PRESETS = [
  { label: '1011001', value: '1011001' },
  { label: '0010110', value: '0010110' },
  { label: '1110001', value: '1110001' },
];
const BASE = [
  { name: 'noise', label: '噪声 σ', min: 0, max: 1.5, step: 0.02, value: 0.35, fmt: 2 },
  { name: 'phase', label: '采样相位 τ（符号）', min: -0.5, max: 0.5, step: 0.01, value: 0, fmt: 2 },
  { name: 'beta', label: '成形滚降 β', min: 0, max: 1, step: 0.05, value: 0.35, fmt: 2 },
  { name: 'cycles', label: '载波周期/符号', min: 1, max: 8, step: 0.5, value: 4, fmt: 1 },
  { name: 'theta', label: '相位误差 θ（°）', min: -180, max: 180, step: 5, value: 0, fmt: 0 },
  { name: 'jam', label: '干扰宽度（频道）', min: 0, max: 50, step: 1, value: 22, fmt: 0 },
];

const VIEWS = [
  { label: '链路', value: 'link' },
  { label: '眼图', value: 'eye' },
  { label: '匹配滤波', value: 'matched' },
  { label: '同步', value: 'sync' },
  { label: '跳频', value: 'spread' },
];
const CODES = [
  { label: 'NRZ', value: 'nrz' },
  { label: 'Manchester', value: 'manchester' },
];
const CARRIERS = [
  { label: 'ASK', value: 'ask' },
  { label: 'FSK', value: 'fsk' },
  { label: 'BPSK', value: 'psk' },
  { label: 'QAM', value: 'qam' },
];
const NORMS = [
  { label: '原模板', value: 'raw' },
  { label: '单位能量', value: 'unit-energy' },
  { label: '单位峰值', value: 'unit-peak' },
];
const SPREAD_MODES = [
  { label: '原始跳频', value: 'raw' },
  { label: 'AFH 自适应', value: 'afh' },
];
const LEVELS = [-3, -1, 1, 3];
const LEVEL_BITS = { '-3': '00', '-1': '01', 1: '11', 3: '10' };

function parseBits(value) {
  const txt = String(value || '').replace(/[^01]/g, '');
  const bits = txt ? txt.split('').map(Number) : [1, 0, 1, 1, 0, 0, 1];
  return bits.slice(0, 18);
}

function sinc(x) {
  if (Math.abs(x) < 1e-9) return 1;
  const p = Math.PI * x;
  return Math.sin(p) / p;
}

/* 升余弦脉冲：β=0 退化为 sinc，β=1 滚降最快。截断半径由 SPAN 控制。 */
function rc(t, beta) {
  if (Math.abs(t) < 1e-9) return 1;
  const b = clamp(beta, 0, 1);
  if (b < 1e-6) return sinc(t);
  const den = 1 - (2 * b * t) ** 2;
  if (Math.abs(den) < 1e-7) return (Math.PI / 4) * sinc(1 / (2 * b));
  return sinc(t) * Math.cos(Math.PI * b * t) / den;
}

function gaussianPair(seed, count) {
  const rnd = lcg(seed, true);
  const out = [];
  for (let i = 0; i < count; i += 1) out.push([gaussOf(rnd), gaussOf(rnd)]);
  return out;
}

function noiseArray(seed, n, sigma) {
  const rnd = lcg(seed, true);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 1) out[i] = gaussOf(rnd) * sigma;
  return out;
}

function lineSymbols(bits, code) {
  const out = [];
  if (code === 'manchester') {
    bits.forEach((b) => {
      const level = b ? 1 : -1;
      out.push(level, -level);
    });
    return out;
  }
  bits.forEach((b) => out.push(b ? 1 : -1));
  return out;
}

function symbolSps(code) {
  return code === 'manchester' ? SPS / 2 : SPS;
}

function buildSignal(bits, code, beta, sigma, seed) {
  const sym = lineSymbols(bits, code);
  const sps = symbolSps(code);
  const total = Math.round((sym.length + 2 * SPAN) * sps);
  const clean = new Float64Array(total);
  const wave = new Float64Array(total);
  const nz = noiseArray(seed, total, sigma);
  for (let i = 0; i < sym.length; i += 1) {
    const start = (i + SPAN) * sps;
    const center = start + sps / 2;
    for (let k = -SPAN * sps; k <= SPAN * sps; k += 1) {
      const j = Math.round(center + k);
      if (j < 0 || j >= total) continue;
      const p = rc(k / sps, beta);
      clean[j] += sym[i] * p;
      wave[j] += sym[i] * p;
    }
  }
  for (let i = 0; i < total; i += 1) wave[i] += nz[i];
  return { sym, sps, total, clean, wave, nz };
}

function sampleAt(d, i, phase) {
  const j = Math.round((i + SPAN) * d.sps + d.sps / 2 + phase * d.sps);
  return d.wave[clamp(j, 0, d.total - 1)] || 0;
}

function clusterStats(values) {
  const pos = values.filter((v) => v >= 0);
  const neg = values.filter((v) => v < 0);
  const stat = (arr) => {
    if (!arr.length) return { mean: 0, sd: 0, n: 0 };
    const mean = arr.reduce((a, v) => a + v, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((a, v) => a + (v - mean) ** 2, 0) / arr.length);
    return { mean, sd, n: arr.length };
  };
  return { pos: stat(pos), neg: stat(neg) };
}

function measureEyeAt(d, phase) {
  const vals = [];
  for (let i = 0; i < d.sym.length; i += 1) vals.push(sampleAt(d, i, phase));
  const c = clusterStats(vals);
  if (!c.pos.n || !c.neg.n) {
    return { vals, pos: c.pos, neg: c.neg, height: 0, noiseSpan: 0, open: 0, margin: 0 };
  }
  const height = c.pos.mean - c.neg.mean;
  const noiseSpan = c.pos.sd + c.neg.sd;
  const open = Math.max(0, height - 2 * noiseSpan);
  return {
    vals,
    pos: c.pos,
    neg: c.neg,
    height,
    noiseSpan,
    open,
    margin: noiseSpan > 1e-9 ? open / noiseSpan : 0,
  };
}

function eyeScene(bits, code, beta, sigma, phase, seed) {
  const d = buildSignal(bits, code, beta, sigma, seed);
  let bestPhase = 0;
  let bestOpen = -1;
  const sweep = [];
  for (let p = -0.48; p <= 0.4801; p += 0.02) {
    const m = measureEyeAt(d, p);
    sweep.push({ phase: p, open: m.open });
    if (m.open > bestOpen) {
      bestOpen = m.open;
      bestPhase = p;
    }
  }
  const cur = measureEyeAt(d, phase);
  return {
    d,
    cur,
    bestPhase,
    bestOpen: Math.max(0, bestOpen),
    sweep,
    isiPenalty: bestOpen > 1e-9 ? clamp(1 - cur.open / bestOpen, 0, 1) : 0,
  };
}

function carrierData(bits, code, carrier, cycles, seed) {
  if (carrier === 'qam') {
    const q = [];
    for (let i = 0; i < bits.length; i += 2) {
      const b0 = bits[i] || 0;
      const b1 = bits[i + 1] || 0;
      const v = (b0 << 1) | b1;
      const table = [
        [-3, -3], [-1, -3], [1, -3], [3, -3],
        [-3, -1], [-1, -1], [1, -1], [3, -1],
        [-3, 1], [-1, 1], [1, 1], [3, 1],
        [-3, 3], [-1, 3], [1, 3], [3, 3],
      ];
      q.push({
        i: table[v][0],
        q: table[v][1],
        bits: LEVEL_BITS[table[v][0]] + LEVEL_BITS[table[v][1]],
      });
    }
    const sps = SPS * 2;
    const total = Math.round((q.length + 2 * SPAN) * sps);
    const out = new Float64Array(total);
    for (let j = 0; j < total; j += 1) {
      const idx = clamp(Math.floor(j / sps) - SPAN, 0, q.length - 1);
      const p = q[idx];
      const ph = (2 * Math.PI * cycles * j) / sps;
      out[j] = p.i * Math.cos(ph) - p.q * Math.sin(ph);
    }
    return { out, sps, total, q };
  }
  const d = buildSignal(bits, code, 0.35, 0, seed);
  const out = new Float64Array(d.total);
  let phase = 0;
  for (let j = 0; j < d.total; j += 1) {
    const idx = clamp(Math.floor((j - SPAN * d.sps) / d.sps), 0, d.sym.length - 1);
    const sym = d.sym[idx] || 0;
    if (carrier === 'fsk') {
      const f = sym >= 0 ? Math.max(2, cycles + 1) : Math.max(1, cycles - 1);
      phase += (2 * Math.PI * f) / d.sps;
      out[j] = Math.sin(phase);
    } else {
      const ph = (2 * Math.PI * cycles * j) / d.sps;
      if (carrier === 'ask') out[j] = ((sym + 1) / 2) * Math.sin(ph);
      else out[j] = sym * Math.sin(ph);
    }
  }
  return { out, sps: d.sps, total: d.total, q: null };
}

function constellationPoints(carrier) {
  if (carrier === 'qam') {
    const pts = [];
    for (let q = 0; q < 4; q += 1) {
      for (let i = 0; i < 4; i += 1) {
        const x = LEVELS[i];
        const y = LEVELS[q];
        pts.push({ x, y, bits: LEVEL_BITS[x] + LEVEL_BITS[y] });
      }
    }
    return pts;
  }
  if (carrier === 'fsk') {
    return [
      { x: -1, y: 0, bits: 'f0' },
      { x: 1, y: 0, bits: 'f1' },
    ];
  }
  return [
    { x: -1, y: 0, bits: '0' },
    { x: 1, y: 0, bits: '1' },
  ];
}

function nearestPoint(pts, x, y) {
  let best = pts[0];
  let bestD = Infinity;
  pts.forEach((p) => {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  });
  return best;
}

function rotatePoint(x, y, deg) {
  const r = (deg * Math.PI) / 180;
  return {
    x: x * Math.cos(r) - y * Math.sin(r),
    y: x * Math.sin(r) + y * Math.cos(r),
  };
}

function matchedScene(bits, beta, sigma, norm, seed, phase) {
  const taps = 4 * SPS + 1;
  const center = 2 * SPS;
  const h0 = new Float64Array(taps);
  for (let k = 0; k < taps; k += 1) h0[k] = rc((k - center) / SPS, beta);
  let energy = 0;
  let peak0 = 0;
  for (let k = 0; k < taps; k += 1) {
    energy += h0[k] * h0[k];
    peak0 = Math.max(peak0, Math.abs(h0[k]));
  }
  /* 归一化只改变接收滤波器的坐标刻度：原模板保留离散处理增益，
     单位能量除以模板能量平方根，单位峰值把主瓣钉到 1。
     发送脉冲本身不随接收机归一化而改变。 */
  const scale = norm === 'raw' ? SPS
    : norm === 'unit-energy' ? 1 / Math.sqrt(Math.max(energy, 1e-12))
      : 1 / Math.max(peak0, 1e-12);
  const h = new Float64Array(taps);
  for (let k = 0; k < taps; k += 1) h[k] = h0[k] * scale;
  const sigLen = Math.max(SPS * 12, (bits.length + 10) * SPS);
  const nz = noiseArray(seed + 101, sigLen, sigma);
  const rx = Float64Array.from(nz);
  const pulseStart = 5 * SPS;
  const clean = new Float64Array(sigLen);
  /* 接收脉冲相对模板平移 phase 个符号：phase≠0 时相关峰必然缩水。 */
  for (let j = 0; j < sigLen; j += 1) {
    const t = (j - pulseStart) / SPS - phase;
    if (Math.abs(t) <= (taps - 1) / (2 * SPS) + 0.25) {
      const v = rc(t, beta);
      clean[j] = v;
      rx[j] += v;
    }
  }
  const scoreLen = sigLen - taps + 1;
  const score = new Float64Array(scoreLen);
  const cleanScore = new Float64Array(scoreLen);
  for (let s0 = 0; s0 < scoreLen; s0 += 1) {
    let acc = 0;
    let cleanAcc = 0;
    for (let k = 0; k < taps; k += 1) {
      acc += rx[s0 + k] * h[k];
      cleanAcc += clean[s0 + k] * h[k];
    }
    score[s0] = acc;
    cleanScore[s0] = cleanAcc;
  }
  let peakIndex = 0;
  for (let i = 1; i < score.length; i += 1) if (score[i] > score[peakIndex]) peakIndex = i;
  let expectedPeak = 0;
  for (let i = 0; i < cleanScore.length; i += 1) expectedPeak = Math.max(expectedPeak, cleanScore[i]);
  const noiseStd = sigma * Math.sqrt(Math.max(energy, 1e-12)) * scale;
  return {
    h,
    h0,
    energy,
    scale,
    rx,
    clean,
    score,
    taps,
    center,
    pulseStart,
    peakIndex,
    peakScore: score[peakIndex],
    expectedPeak,
    noiseStd,
    margin: noiseStd > 1e-9 ? expectedPeak / noiseStd : Infinity,
  };
}

function spreadScene(jamWidth, afh) {
  const N = 79;
  const hops = 160;
  const rnd = mulberry32(20261017);
  const raw = [];
  for (let k = 0; k < hops; k += 1) raw.push(Math.floor(rnd() * N));
  const lo = clamp(Math.floor((N - jamWidth) / 2), 0, N);
  const hi = clamp(lo + jamWidth - 1, -1, N - 1);
  const busy = (ch) => jamWidth > 0 && ch >= lo && ch <= hi;
  const cleanChannels = [];
  for (let ch = 0; ch < N; ch += 1) if (!busy(ch)) cleanChannels.push(ch);
  const seq = raw.map((ch, k) => {
    if (!afh || !busy(ch)) return ch;
    return cleanChannels.length ? cleanChannels[k % cleanChannels.length] : ch;
  });
  const hitsRaw = jamWidth ? raw.filter(busy).length : 0;
  const hits = jamWidth ? seq.filter(busy).length : 0;
  return { N, hops, lo, hi, raw, seq, hitsRaw, hits, cleanChannels, jamWidth };
}

function bitsString(bits) {
  return bits.join('');
}

export default function render(host, spec) {
  const view = VIEWS.some((v) => v.value === spec.view) ? spec.view : 'link';
  let s = {
    view,
    bits: parseBits(spec.bits || '1011001'),
    code: CODES.some((v) => v.value === spec.code) ? spec.code : 'nrz',
    carrier: CARRIERS.some((v) => v.value === spec.carrier) ? spec.carrier : 'psk',
    norm: NORMS.some((v) => v.value === spec.norm) ? spec.norm : 'unit-energy',
    afh: spec.afh === true || spec.afh === 'afh',
    seed: Number.isFinite(Number(spec.seed)) ? Number(spec.seed) : 7,
  };

  const cv = setupCanvas(host, 460);
  const ro = buildReadout({
    '噪声 σ': '—', '眼开度': '—', '最佳采样': '—', 'ISI 惩罚': '—', '判决余量': '—',
    '相关峰': '—', '噪声底': '—', '归一化': '—', '峰值/噪声': '—',
    '当前星座': '—', '判决': '—', '相位误差': '—', '定时误差': '—',
    '跳频命中': '—', '可用频道': '—', '处理增益': '—',
  });
  host.appendChild(ro.box);

  const sliderIndex = {
    noise: 0, phase: 1, beta: 2, cycles: 3, theta: 4, jam: 5,
  };
  const sliderRows = {};

  function setSliderVisibility(names) {
    Object.keys(sliderIndex).forEach((k) => {
      const row = sliderRows[k];
      if (row) row.style.display = names.includes(k) ? '' : 'none';
    });
  }

  let player = null;
  let scan = 0;
  const bitRects = [];
  let C = themeColors();

  const viewSeg = buildSegmented(VIEWS, s.view, (v) => {
    s.view = v;
    syncUI();
    draw();
  });
  const bitsSeg = buildSegmented(BITS_PRESETS, bitsString(s.bits), (v) => {
    s.bits = parseBits(v);
    syncBitsPreset();
    draw();
  });
  const codeSeg = buildSegmented(CODES, s.code, (v) => {
    s.code = v;
    draw();
  });
  const carrierSeg = buildSegmented(CARRIERS, s.carrier, (v) => {
    s.carrier = v;
    syncUI();
    draw();
  });
  const normSeg = buildSegmented(NORMS, s.norm, (v) => {
    s.norm = v;
    draw();
  });
  const spreadSeg = buildSegmented(SPREAD_MODES, s.afh ? 'afh' : 'raw', (v) => {
    s.afh = v === 'afh';
    draw();
  });

  const controls = el('div', 'ml-lab__controls');
  function controlRow(labelText, node, key) {
    const row = el('div', 'ml-viz__controls');
    row.appendChild(el('span', 'ml-lab__hint', labelText));
    row.appendChild(node);
    controls.appendChild(row);
    row.dataset.mlControl = key;
    return row;
  }
  controlRow('视图', viewSeg, 'view');
  const bitsRow = controlRow('比特串', bitsSeg, 'bits');
  controlRow('码型', codeSeg, 'code');
  controlRow('载波', carrierSeg, 'carrier');
  controlRow('归一化', normSeg, 'norm');
  controlRow('跳频模式', spreadSeg, 'spread');
  host.appendChild(controls);

  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => {
    Object.keys(sliderIndex).forEach((k) => {
      if (sliders.state[k] !== undefined) s[k] = sliders.state[k];
    });
    draw();
  });
  Object.keys(sliderIndex).forEach((k) => {
    sliderRows[k] = sliders.box.children[sliderIndex[k]];
  });

  function syncBitsPreset() {
    const b = bitsString(s.bits);
    bitsSeg.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('is-active', btn.textContent === b);
    });
  }

  function syncUI() {
    const show = {
      bits: ['link', 'eye', 'matched', 'sync'],
      code: ['link', 'eye'],
      carrier: ['link', 'sync'],
      norm: ['matched'],
      spread: ['spread'],
    };
    ['bits', 'code', 'carrier', 'norm', 'spread'].forEach((k) => {
      const row = controls.querySelector(`[data-ml-control="${k}"]`);
      if (row) row.style.display = show[k].includes(s.view) ? '' : 'none';
    });
    bitsRow.style.display = show.bits.includes(s.view) ? '' : 'none';
    if (s.view === 'link') setSliderVisibility(['noise', 'beta', 'cycles']);
    else if (s.view === 'eye') setSliderVisibility(['noise', 'phase', 'beta']);
    else if (s.view === 'matched') setSliderVisibility(['noise', 'phase', 'beta']);
    else if (s.view === 'sync') setSliderVisibility(['noise', 'phase', 'beta', 'cycles', 'theta']);
    else setSliderVisibility(['jam']);
    syncBitsPreset();
  }

  function resetScan() {
    scan = 0;
    draw();
  }

  player = anim(host, {
    onTick(dt) {
      scan += dt * 2.4;
      if (scan > Math.max(1, s.bits.length)) scan -= Math.max(1, s.bits.length);
      draw();
    },
    onReset: resetScan,
  });

  function frame(ctx, x, y, w, h, title) {
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1));
    ctx.restore();
    if (title) label(ctx, title, x + 6, y + 14, C.fg, { size: 10.5, weight: 600 });
  }

  function drawBits(ctx, x, y, w, bits, active) {
    const gap = 3;
    const bw = Math.max(8, Math.min(30, (w - gap * (bits.length - 1)) / bits.length));
    const bh = 22;
    bitRects.length = 0;
    bits.forEach((b, i) => {
      const bx = x + i * (bw + gap);
      ctx.save();
      ctx.fillStyle = i === active ? C.named('blue') : C.soft;
      ctx.fillRect(bx, y, bw, bh);
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, bh - 1);
      ctx.restore();
      label(ctx, String(b), bx + bw / 2, y + 15, i === active ? C.bg : C.fg, {
        size: 11, weight: 700, align: 'center',
      });
      bitRects.push({ x: bx, y, w: bw, h: bh, i });
    });
  }

  function drawStep(ctx, vals, x, y, w, h, color, mid, scale) {
    const pts = [];
    const n = Math.max(1, vals.length);
    for (let i = 0; i < n; i += 1) {
      const x0 = x + (i / n) * w;
      const x1 = x + ((i + 1) / n) * w;
      const yy = mid - clamp(vals[i] * scale, -h / 2, h / 2);
      if (!pts.length || pts[pts.length - 1][1] !== yy) pts.push([x0, yy]);
      pts.push([x1, yy]);
    }
    if (pts.length) polyline(ctx, pts, color, 2);
  }

  function drawSampleWave(ctx, vals, x, y, w, h, color, mid, scale) {
    const n = vals.length;
    if (!n) return;
    const pts = [];
    const step = Math.max(1, Math.ceil(n / Math.max(20, w * 1.4)));
    for (let i = 0; i < n; i += step) {
      pts.push([x + (i / (n - 1 || 1)) * w, mid - clamp(vals[i] * scale, -h / 2, h / 2)]);
    }
    polyline(ctx, pts, color, 1.8);
  }

  function drawConstellation(ctx, x, y, w, h, carrier, points, obs, theta) {
    const cx = x + w / 2;
    const cy = y + h / 2 + 4;
    const range = carrier === 'qam' ? 4.4 : 1.55;
    const scale = Math.min(w, h) / (2 * range);
    const X = (v) => cx + v * scale;
    const Y = (v) => cy - v * scale;

    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, cy);
    ctx.lineTo(x + w - 8, cy);
    ctx.moveTo(cx, y + 8);
    ctx.lineTo(cx, y + h - 8);
    ctx.stroke();
    ctx.restore();

    if (carrier === 'qam') {
      [-2, 0, 2].forEach((v) => {
        ctx.save();
        ctx.strokeStyle = C.grid;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(X(v), y + 8);
        ctx.lineTo(X(v), y + h - 8);
        ctx.moveTo(x + 8, Y(v));
        ctx.lineTo(x + w - 8, Y(v));
        ctx.stroke();
        ctx.restore();
      });
    } else {
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(X(0), y + 8);
      ctx.lineTo(X(0), y + h - 8);
      ctx.stroke();
      ctx.restore();
    }

    points.forEach((p) => {
      const rp = theta ? rotatePoint(p.x, p.y, theta) : p;
      if (theta) {
        ctx.save();
        ctx.fillStyle = C.named('blue');
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), carrier === 'qam' ? 3.4 : 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = theta ? C.named('purple') : C.named('blue');
      ctx.globalAlpha = theta ? 0.75 : 1;
      ctx.beginPath();
      ctx.arc(X(rp.x), Y(rp.y), carrier === 'qam' ? 4 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (carrier === 'qam' && w > 220) {
        label(ctx, p.bits, X(rp.x), Y(rp.y) - 7, C.axis, { size: 8, align: 'center' });
      }
    });

    if (obs) {
      const rx = X(obs.x);
      const ry = Y(obs.y);
      ctx.save();
      ctx.fillStyle = C.named('red');
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      arrow(ctx, cx, cy, rx, ry, C.named('red'), 1.8, 7);
    }
    return { X, Y, cx, cy, scale };
  }

  function drawLink() {
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    const bits = s.bits;
    const active = Math.floor(scan) % Math.max(1, bits.length);
    drawBits(ctx, 10, 12, Math.min(W - 20, 380), bits, active);
    label(ctx, '同一比特串', 10, 48, C.axis, { size: 10 });

    const wide = W >= 620;
    const pad = 10;
    const topY = 62;
    const topH = wide ? 180 : 142;
    const lw = wide ? Math.floor((W - 3 * pad) / 2) : W - 2 * pad;
    const rx0 = wide ? pad * 2 + lw : pad;
    const rightY = wide ? topY : topY + topH + pad;
    const rightH = wide ? 180 : 142;
    const lineD = buildSignal(bits, s.code, s.beta, 0, s.seed);
    frame(ctx, pad, topY, lw, topH, `码型：${s.code === 'manchester' ? 'Manchester' : 'NRZ'}`);
    const lmid = topY + topH / 2 + 6;
    let lmax = 1;
    lineD.clean.forEach((v) => { lmax = Math.max(lmax, Math.abs(v)); });
    drawStep(ctx, lineD.clean, pad + 8, topY + 18, lw - 16, topH - 30, C.accent, lmid, (topH - 34) / (2 * lmax));
    label(ctx, '电平', pad + 8, topY + topH - 6, C.axis, { size: 9 });

    const car = carrierData(bits, s.code, s.carrier, s.cycles, s.seed);
    frame(ctx, rx0, rightY, lw, rightH, `载波：${s.carrier.toUpperCase()} · ${fmt(s.cycles, 1)} 周期/符号`);
    const cmid = rightY + rightH / 2 + 6;
    let cmax = 1;
    car.out.forEach((v) => { cmax = Math.max(cmax, Math.abs(v)); });
    drawSampleWave(ctx, car.out, rx0 + 8, rightY + 18, lw - 16, rightH - 30, C.accent2, cmid, (rightH - 34) / (2 * cmax));
    label(ctx, '正弦驮马', rx0 + 8, rightY + rightH - 6, C.axis, { size: 9 });

    const pts = constellationPoints(s.carrier);
    const q = car.q || null;
    const pi = q ? clamp(Math.floor(scan) % q.length, 0, q.length - 1) : 0;
    /* carrierData() 的 QAM 分支压的是 {i,q,bits}（复数分量口径），而
       constellationPoints()/nearestPoint() 用的是 {x,y,bits}。这里必须显式换算，
       否则 cleanP.x/cleanP.y 是 undefined、obs 立刻变成 NaN，判决永远落到 pts[0]
       = 0000 并被判「误判」。下方 drawSync() 一直是对的，可对照。 */
    const cleanP = q
      ? { x: q[pi].i, y: q[pi].q, bits: q[pi].bits }
      : pts[active < pts.length ? active : 0];
    const noisePair = gaussianPair(s.seed + 17, 1)[0];
    const obs = {
      x: cleanP.x + noisePair[0] * s.noise,
      y: cleanP.y + noisePair[1] * s.noise,
    };
    const gone = nearestPoint(pts, obs.x, obs.y);
    const constY = wide ? topY + topH + pad : rightY + rightH + pad;
    const constH = Math.max(72, Hh - constY - 12);
    frame(ctx, pad, constY, W - 2 * pad, constH,
      s.carrier === 'fsk' ? '频率状态对照：红点=带噪判决，蓝点=f0/f1' : '星座判决域：红点=带噪接收，蓝点=合法星位');
    const map = drawConstellation(
      ctx, pad + 8, constY + 16, W - 2 * pad - 16, constH - 22,
      s.carrier, pts, obs, 0,
    );
    label(ctx, `当前：${cleanP.bits || (s.bits[active] ?? 0)}`, map.X(obs.x), map.Y(obs.y) - 12, C.named('red'), { size: 10, align: 'center' });
    label(ctx, `最近星：${gone.bits}`, map.X(gone.x), map.Y(gone.y) + 16, C.named('blue'), { size: 10, align: 'center' });
    ro.set('噪声 σ', fmt(s.noise, 2));
    ro.set('当前星座', `${fmt(obs.x, 2)}, ${fmt(obs.y, 2)}`);
    ro.set('判决', `${gone.bits}（${gone.bits === (cleanP.bits || '') ? '正确' : '误判'}）`);
  }

  function drawEye() {
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    const scene = eyeScene(s.bits, s.code, s.beta, s.noise, s.phase, s.seed);
    const d = scene.d;
    const bits = s.bits;
    drawBits(ctx, 10, 12, Math.min(W - 20, 380), bits, -1);
    label(ctx, `眼图：${s.code === 'manchester' ? 'Manchester' : 'NRZ'} · β=${fmt(s.beta, 2)} · σ=${fmt(s.noise, 2)}`,
      10, 50, C.axis, { size: 10 });

    const x0 = 42;
    const y0 = 72;
    const w = W - x0 - 14;
    const h = Hh - y0 - 48;
    const mid = y0 + h / 2;
    let mx = 1;
    for (let i = 1; i < d.sym.length - 1; i += 1) {
      for (let k = 0; k <= EYE_WINDOW * d.sps; k += 1) {
        const start = Math.round((i + SPAN) * d.sps - d.sps);
        mx = Math.max(mx, Math.abs(d.wave[start + k] || 0));
      }
    }
    const scale = (h * 0.42) / (mx * 1.25 + s.noise * 0.2);
    const X = (t) => x0 + ((t + 1) / 2) * w;
    const Y = (v) => mid - clamp(v * scale, -h / 2, h / 2);
    frame(ctx, x0, y0, w, h, '');
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(x0, mid);
    ctx.lineTo(x0 + w, mid);
    ctx.stroke();
    ctx.restore();

    /* 每两条相邻符号截一窗，窗口中心对准一个理想采样点。 */
    for (let i = 1; i < d.sym.length - 1; i += 1) {
      const start = Math.round((i + SPAN) * d.sps - d.sps);
      const pts = [];
      for (let k = 0; k <= EYE_WINDOW * d.sps; k += 1) {
        const tt = k / d.sps - 1;
        pts.push([X(tt), Y(d.wave[start + k] || 0)]);
      }
      ctx.save();
      ctx.globalAlpha = 0.24;
      polyline(ctx, pts, C.named('blue'), 1);
      ctx.restore();
    }

    /* 当前采样相位与最佳采样相位。 */
    const curX = X(s.phase);
    const bestX = X(scene.bestPhase);
    ctx.save();
    ctx.strokeStyle = C.named('red');
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(curX, y0 + 5);
    ctx.lineTo(curX, y0 + h - 5);
    ctx.stroke();
    ctx.strokeStyle = C.named('green');
    ctx.beginPath();
    ctx.moveTo(bestX, y0 + 5);
    ctx.lineTo(bestX, y0 + h - 5);
    ctx.stroke();
    ctx.restore();
    label(ctx, '当前采样', curX + 4, y0 + 16, C.named('red'), { size: 9 });
    label(ctx, '最佳采样', bestX - 4, y0 + 28, C.named('green'), { size: 9, align: 'right' });

    /* 当前相位的样本点：点越挤，判决门限越安全。 */
    scene.cur.vals.forEach((v) => {
      ctx.save();
      ctx.fillStyle = C.named('red');
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(curX, Y(v), 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    const yPos = Y(scene.cur.pos.mean);
    const yNeg = Y(scene.cur.neg.mean);
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(-0.82), yPos);
    ctx.lineTo(X(-0.72), yPos);
    ctx.moveTo(X(-0.82), yNeg);
    ctx.lineTo(X(-0.72), yNeg);
    ctx.stroke();
    ctx.restore();
    label(ctx, `眼开度 ${fmt(scene.cur.open, 2)}`, X(-0.78), (yPos + yNeg) / 2, C.named('amber'), {
      size: 9, align: 'center',
    });

    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x0, Y(0));
    ctx.lineTo(x0 + w, Y(0));
    ctx.stroke();
    ctx.restore();
    label(ctx, '0 判决门限', x0 + 4, Y(0) - 5, C.axis, { size: 9 });

    ro.set('噪声 σ', fmt(s.noise, 2));
    ro.set('眼开度', fmt(scene.cur.open, 2));
    ro.set('最佳采样', `${fmt(scene.bestPhase, 2)} 符号`);
    ro.set('ISI 惩罚', `${fmt(scene.isiPenalty * 100, 1)}%`);
    ro.set('判决余量', fmt(scene.cur.margin, 2));
  }

  function drawMatched() {
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    const m = matchedScene(s.bits, s.beta, s.noise, s.norm, s.seed, s.phase);
    const bits = s.bits;
    drawBits(ctx, 10, 12, Math.min(W - 20, 380), bits, -1);
    label(ctx, `匹配滤波：β=${fmt(s.beta, 2)} · σ=${fmt(s.noise, 2)} · ${s.norm}`,
      10, 50, C.axis, { size: 10 });

    const x0 = 42;
    const w = W - x0 - 14;
    const y1 = 72;
    const h1 = Math.max(80, (Hh - y1 - 40) * 0.42);
    const y2 = y1 + h1 + 22;
    const h2 = Math.max(80, Hh - y2 - 22);
    frame(ctx, x0, y1, w, h1, '接收波形（蓝=含噪，虚线=干净脉冲，绿=模板）');
    let rmax = 1;
    m.rx.forEach((v) => { rmax = Math.max(rmax, Math.abs(v)); });
    const rmid = y1 + h1 / 2;
    const rs = (h1 * 0.40) / rmax;
    drawSampleWave(ctx, m.rx, x0 + 8, y1 + 18, w - 16, h1 - 30, C.named('blue'), rmid, rs);
    drawSampleWave(ctx, m.clean, x0 + 8, y1 + 18, w - 16, h1 - 30, C.axis, rmid, rs);
    drawSampleWave(ctx, m.h0, x0 + 8, y1 + 18, w - 16, h1 - 30, C.named('green'), rmid, rs);

    frame(ctx, x0, y2, w, h2, `滑动相关输出（${s.norm === 'raw' ? '原模板' : s.norm === 'unit-energy' ? '单位能量' : '单位峰值'}归一化）`);
    let smax = 1;
    m.score.forEach((v) => { smax = Math.max(smax, Math.abs(v)); });
    const smid = y2 + h2 - 24;
    const ss = (h2 - 46) / (2 * smax);
    drawSampleWave(ctx, m.score, x0 + 8, y2 + 18, w - 16, h2 - 30, C.named('red'), smid, ss);
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x0 + 8, smid);
    ctx.lineTo(x0 + w - 8, smid);
    ctx.stroke();
    ctx.restore();
    const px = x0 + 8 + (m.peakIndex / (m.score.length - 1 || 1)) * (w - 16);
    const py = smid - clamp(m.peakScore * ss, -h2 / 2, h2 / 2);
    ctx.save();
    ctx.strokeStyle = C.named('green');
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(px, y2 + 14);
    ctx.lineTo(px, y2 + h2 - 8);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = C.named('green');
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label(ctx, `峰 ${fmt(m.peakScore, 2)}`, px + 5, py - 7, C.named('green'), { size: 9 });
    label(ctx, '0 判决门限', x0 + 10, smid - 5, C.axis, { size: 9 });

    ro.set('噪声 σ', fmt(s.noise, 2));
    ro.set('相关峰', fmt(m.peakScore, 2));
    ro.set('噪声底', fmt(m.noiseStd, 3));
    ro.set('归一化', s.norm === 'raw' ? '原模板' : s.norm === 'unit-energy' ? '单位能量' : '单位峰值');
    ro.set('峰值/噪声', isFinite(m.noiseStd) && m.noiseStd > 1e-9 ? fmt(m.peakScore / m.noiseStd, 2) : '∞');
    ro.set('判决余量', `${fmt(m.margin, 2)}（理想 √E/σ = ${fmt(Math.sqrt(Math.max(m.energy, 0)) / Math.max(s.noise, 1e-9), 2)}）`);
  }

  function drawSync() {
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    const bits = s.bits;
    const points = constellationPoints(s.carrier === 'qam' ? 'qam' : 'psk');
    const b0 = bits[0] || 0;
    const q0 = s.carrier === 'qam'
      ? carrierData(bits, 'nrz', 'qam', s.cycles, s.seed).q[0]
      : null;
    const clean = q0 ? { x: q0.i, y: q0.q, bits: q0.bits } : points[b0 % points.length];
    const noisePair = gaussianPair(s.seed + 31, 1)[0];
    const noisy = { x: clean.x + noisePair[0] * s.noise, y: clean.y + noisePair[1] * s.noise };
    const rot = rotatePoint(noisy.x, noisy.y, s.theta);
    const nearest = nearestPoint(points, rot.x, rot.y);
    const eye = eyeScene(bits, 'nrz', s.beta, s.noise, s.phase, s.seed);

    drawBits(ctx, 10, 12, Math.min(W - 20, 380), bits, 0);
    const wide = W >= 600;
    const topY = 62;
    const leftW = wide ? Math.floor((W - 30) * 0.54) : W - 20;
    const rightX = wide ? 10 + leftW + 10 : 10;
    const rightY = wide ? topY : topY + 220;
    const rightW = wide ? W - rightX - 10 : W - 20;
    const panelH = wide ? Hh - topY - 18 : Math.max(140, Hh - (topY + 220) - 12);

    frame(ctx, 10, topY, leftW, panelH, `相位误差 θ=${fmt(s.theta, 0)}°：星座整体旋转`);
    drawConstellation(ctx, 18, topY + 16, leftW - 16, panelH - 24, s.carrier === 'qam' ? 'qam' : 'psk',
      points, { x: rot.x, y: rot.y }, s.theta);
    const cmap = {
      x: 18 + (leftW - 16) / 2,
      y: topY + 16 + (panelH - 24) / 2 + 4,
      X: (v) => 18 + (leftW - 16) / 2 + v * (Math.min(leftW - 16, panelH - 24) / (2 * (s.carrier === 'qam' ? 4.4 : 1.55))),
      Y: (v) => topY + 16 + (panelH - 24) / 2 + 4 - v * (Math.min(leftW - 16, panelH - 24) / (2 * (s.carrier === 'qam' ? 4.4 : 1.55))),
    };
    label(ctx, `收到 ${fmt(rot.x, 1)},${fmt(rot.y, 1)} → 判 ${nearest.bits}`, cmap.X(rot.x), cmap.Y(rot.y) - 12, C.named('red'), { size: 9, align: 'center' });

    frame(ctx, rightX, rightY, rightW, panelH, `定时误差 τ=${fmt(s.phase, 2)}：眼图与 ISI`);
    const ex0 = rightX + 34;
    const ey0 = rightY + 22;
    const ew = rightW - 46;
    const eh = panelH - 38;
    const emid = ey0 + eh / 2;
    let emax = 1;
    eye.d.wave.forEach((v) => { emax = Math.max(emax, Math.abs(v)); });
    const esc = (eh * 0.40) / emax;
    for (let i = 1; i < eye.d.sym.length - 1; i += 1) {
      const start = Math.round((i + SPAN) * eye.d.sps - eye.d.sps);
      const pts = [];
      for (let k = 0; k <= EYE_WINDOW * eye.d.sps; k += 1) {
        const tt = k / eye.d.sps - 1;
        pts.push([
          ex0 + ((tt + 1) / 2) * ew,
          emid - clamp((eye.d.wave[start + k] || 0) * esc, -eh / 2, eh / 2),
        ]);
      }
      ctx.save();
      ctx.globalAlpha = 0.22;
      polyline(ctx, pts, C.named('blue'), 1);
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = C.named('red');
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    const tx = ex0 + ((s.phase + 1) / 2) * ew;
    ctx.moveTo(tx, ey0);
    ctx.lineTo(tx, ey0 + eh);
    ctx.stroke();
    ctx.restore();
    label(ctx, '当前采样', tx + 4, ey0 + 12, C.named('red'), { size: 9 });
    label(ctx, `眼开度 ${fmt(eye.cur.open, 2)}`, ex0, ey0 + eh + 15, C.named('amber'), { size: 9 });

    ro.set('噪声 σ', fmt(s.noise, 2));
    ro.set('相位误差', `${fmt(s.theta, 0)}°`);
    ro.set('定时误差', `${fmt(s.phase, 2)} 符号`);
    ro.set('眼开度', fmt(eye.cur.open, 2));
    ro.set('ISI 惩罚', `${fmt(eye.isiPenalty * 100, 1)}%`);
    ro.set('当前星座', `${fmt(rot.x, 2)}, ${fmt(rot.y, 2)}`);
    ro.set('判决', nearest.bits);
  }

  function drawSpread() {
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);
    const sp = spreadScene(s.jam, s.afh);
    const x0 = 42;
    const y0 = 58;
    const w = W - x0 - 14;
    const h = Hh - y0 - 44;
    const X = (k) => x0 + (k / Math.max(1, sp.hops - 1)) * w;
    const Y = (ch) => y0 + h - (ch / (sp.N - 1)) * h;
    const spreadTitle = W < 480
      ? `${s.afh ? 'AFH' : 'FHSS'} · 干扰 ${sp.jamWidth} 频道`
      : `跳频账本：${s.afh ? 'AFH 自适应' : '原始 FHSS'} · 干扰 ${sp.jamWidth} 个频道`;
    frame(ctx, x0, y0, w, h, spreadTitle);
    if (sp.jamWidth > 0) {
      ctx.save();
      ctx.fillStyle = C.bad;
      ctx.globalAlpha = 0.14;
      ctx.fillRect(x0, Y(sp.hi), w, Math.max(2, Y(sp.lo) - Y(sp.hi)));
      ctx.restore();
      label(ctx, '干扰区', x0 + w - 6, Y(sp.hi) - 5, C.bad, { size: 9, align: 'right' });
    }
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let ch = 0; ch < sp.N; ch += 8) {
      ctx.beginPath();
      ctx.moveTo(x0, Y(ch));
      ctx.lineTo(x0 + w, Y(ch));
      ctx.stroke();
    }
    ctx.restore();
    sp.raw.forEach((ch, k) => {
      if (k % 1 !== 0) return;
      const hit = sp.jamWidth > 0 && ch >= sp.lo && ch <= sp.hi;
      ctx.save();
      ctx.fillStyle = hit ? C.bad : C.named('blue');
      ctx.globalAlpha = s.afh ? 0.26 : 0.82;
      ctx.beginPath();
      ctx.arc(X(k), Y(ch), 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    if (s.afh) {
      polyline(ctx, sp.seq.map((ch, k) => [X(k), Y(ch)]), C.named('green'), 1.2);
      sp.seq.forEach((ch, k) => {
        ctx.save();
        ctx.fillStyle = C.named('green');
        ctx.beginPath();
        ctx.arc(X(k), Y(ch), 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
    label(ctx, '频道 0', x0 - 6, Y(0) + 4, C.axis, { size: 9, align: 'right' });
    label(ctx, '频道 78', x0 - 6, Y(78) + 4, C.axis, { size: 9, align: 'right' });
    label(ctx, '时间 / 跳次 →', x0 + w, y0 + h + 20, C.axis, { size: 9, align: 'right' });

    ro.set('跳频命中', s.afh ? `${sp.hits} / ${sp.hops}` : `${sp.hitsRaw} / ${sp.hops}`);
    ro.set('可用频道', `${sp.cleanChannels.length} / ${sp.N}`);
    ro.set('处理增益', `${fmt(sp.N / Math.max(1, sp.cleanChannels.length), 2)} 倍频道摊薄`);
    ro.set('噪声 σ', '—');
  }

  function showRO(viewName) {
    const show = {
      link: ['噪声 σ', '当前星座', '判决'],
      eye: ['噪声 σ', '眼开度', '最佳采样', 'ISI 惩罚', '判决余量'],
      matched: ['噪声 σ', '相关峰', '噪声底', '归一化', '峰值/噪声', '判决余量'],
      sync: ['噪声 σ', '相位误差', '定时误差', '眼开度', 'ISI 惩罚', '当前星座', '判决'],
      spread: ['跳频命中', '可用频道', '处理增益'],
    }[viewName] || [];
    const keys = Object.keys({
      '噪声 σ': 1, '眼开度': 1, '最佳采样': 1, 'ISI 惩罚': 1, '判决余量': 1,
      '相关峰': 1, '噪声底': 1, '归一化': 1, '峰值/噪声': 1,
      '当前星座': 1, '判决': 1, '相位误差': 1, '定时误差': 1,
      '跳频命中': 1, '可用频道': 1, '处理增益': 1,
    });
    keys.forEach((k, i) => {
      const row = ro.box.children[i];
      if (row) row.style.display = show.includes(k) ? '' : 'none';
    });
  }

  function draw() {
    C = themeColors();
    bitRects.length = 0;
    if (s.view === 'eye') drawEye();
    else if (s.view === 'matched') drawMatched();
    else if (s.view === 'sync') drawSync();
    else if (s.view === 'spread') drawSpread();
    else drawLink();
    showRO(s.view);
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      for (let i = 0; i < bitRects.length; i += 1) {
        const r = bitRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return 'b' + r.i;
      }
      return null;
    },
    down(id) {
      if (!/^b\d+$/.test(id)) return;
      const i = Number(id.slice(1));
      if (i < 0 || i >= s.bits.length) return;
      s.bits[i] = s.bits[i] ? 0 : 1;
      syncBitsPreset();
      draw();
    },
  });

  syncUI();
  Object.keys(sliderIndex).forEach((k) => {
    s[k] = sliders.state[k];
  });
  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      if (player) player.stop();
    },
  };
}

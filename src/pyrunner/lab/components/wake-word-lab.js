/* =========================================================================
 * lab 组件：wake-word-lab（关键词唤醒 —— 阈值往哪边挪都是要付代价的）
 * -------------------------------------------------------------------------
 * 演示什么
 *   「小爱同学」「Hey Siri」这类功能，本质是一条**滑窗打分 + 阈值判决**的流水线：
 *     ① 每 20 ms 取一帧，算 MFCC（梅尔倒谱，压缩掉人耳不敏感的细节）；
 *     ② 用一个固定长度的关键词模板，在整条音频流上逐点滑，每滑到一个起点
 *        就比对一次，得到一个相似度得分；于是「时间 → 得分」成了一条曲线；
 *     ③ 得分过阈值就唤醒。
 *   组件把这条曲线和阈值线并排放出来，让你亲手拖那条阈值线，看
 *   **漏报（miss）与误报（false alarm）怎么此消彼长**——这是所有二分类判决
 *   的宿命，也是 ROC 曲线在讲的事。
 *
 *   三个必须玩出来的结论：
 *     · 阈值调低 → 误报变多（背景里的相似音节被当成唤醒词）；调高 → 漏报
 *       变多。中间只有很窄一段是两头都干净的。
 *     · 加长平滑窗能压掉毛刺、减少误报，代价是响应变迟钝、峰值被削低。
 *     · 第二次出现的关键词被故意放慢了 6%，得分明显低一截——固定起点对齐
 *       扛不住语速变化，真实系统要么用 DTW 对齐，要么用神经网络打分。
 *
 * 怎么玩
 *   · 上下拖红色虚线 = 改阈值，图上的检测块与下面的统计实时重算。
 *   · 拖「平滑窗长」滑块：看毛刺怎么被抹平、峰值怎么被削掉。
 *   · 环境切换（安静 / 一般 / 嘈杂）：加背景噪声，看得分曲线整体下沉。
 *
 * 用法（课文里写 ```lab 围栏）
 *
 *   ```lab
 *   {
 *     "type": "wake-word-lab",
 *     "title": "拖那条阈值线，看漏报与误报怎么此消彼长"
 *   }
 *   ```
 *
 * spec 字段（全部可省，缺省值如下）
 *   threshold 初始阈值（单位：σ，见下），0–8，默认 3
 *   smooth    平滑窗长（帧），1–31 奇数，默认 9
 *   env       环境：'quiet' | 'normal' | 'noisy'，默认 'normal'
 *   height    画布高度（像素），默认 380
 *
 * 出声：是（唤醒提示音「叮咚」，音量 0.2，走 core.audioShell）。
 * 引擎：dsp（mfcc）+ audio（提示音）。
 * 数据怎么来的（重要，别当真实系统读）
 *   · 音频流是内置的「源-滤波器」合成品：一段背景噪声 + 两段关键词 + 两段
 *     干扰语音，关键词的真值区间是写死的常量。
 *   · 模板 = 用同样的合成器单独做一遍「干净的关键词」，再取它的 MFCC 序列
 *     （76 帧 × 12 维）。
 *   · 打分 = 模板与被比窗口逐帧的余弦相似度取平均，再减去全体倒谱均值
 *     （CMS，标准做法，不然第一维能量会一家独大）。
 *   · 打完分还要**标准化**：用中位数与绝对中位差（MAD）把曲线折成
 *     「超出背景多少个 σ」。不这么做的话，两个关键词窗口占了全曲线的三成，
 *     会把尺度自己抬高、把峰值压平，阈值就没法定了。阈值于是有了物理量纲：
 *     「比背景高出几个 σ 才唤醒」。
 *   · **没有神经网络、没有 DTW**——固定长度对齐的模板匹配，好处是每一步
 *     都能在图上指出来，坏处就是上面第三条说的那样怕语速变化。
 *
 * 复用 dsp.mfcc 的一个坑：melFilterbank 的 fftSize 与 rfft 的输出长度必须
 *   对上，所以 frameLen 只能取 2 的幂（这里用 512），否则滤波器组行数不够，
 *   出来的系数全是 NaN。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, engine, audioShell, buildSliders, buildSegmented,
  buildReadout, polyline, label, clamp, fmt, mulberry32,
  clearBg,
} from '../core.js';

const FS = 16000;
const FRAME = 512;      // 32 ms，必须是 2 的幂（见文件头注释）
const HOP = 160;        // 10 ms 帧移
const NCEP = 12;        // 丢掉第 0 维（能量），只用 c1..c12
const STREAM_T = 5.2;   // 音频流时长（秒）
const BW = [90, 120, 180];

/* 关键词：四个音节来回摆，像「小—智—小—智」 */
const KW = [
  { d: 0.18, F: [700, 1200, 2500] },
  { d: 0.22, F: [300, 2200, 3000] },
  { d: 0.18, F: [700, 1200, 2500] },
  { d: 0.22, F: [300, 2200, 3000] },
];
const KW_DUR = KW.reduce((a, b) => a + b.d, 0);

/* 干扰段：共振峰轨迹与关键词不同，但也是「人说话」 */
const DIST = {
  a: [{ d: 0.25, F: [520, 1500, 2550] }, { d: 0.30, F: [450, 900, 2400] }],
  b: [{ d: 0.50, F: [600, 1100, 2500] }],
};

/* 真值：两次关键词出现的起止时刻（秒）。第二次故意放慢 6% */
const GT = [{ t0: 1.6, t1: 1.6 + KW_DUR }, { t0: 4.0, t1: 4.0 + KW_DUR / 0.94 }];

const ENV = {
  quiet: { label: '安静', noise: 0.004 },
  normal: { label: '一般', noise: 0.02 },
  noisy: { label: '嘈杂', noise: 0.07 },
};

/* 音节序列 → 共振峰轨迹（相邻音节之间 35 ms 过渡） */
function buildTrack(syls, n) {
  const F = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  const A = new Float64Array(n);
  const edges = [];
  let acc = 0;
  syls.forEach((sy) => { acc += sy.d; edges.push(acc); });
  const trans = Math.round(0.035 * FS);
  for (let i = 0; i < n; i += 1) {
    const t = i / FS;
    let k = 0;
    while (k < syls.length - 1 && t > edges[k]) k += 1;
    const dToEdge = (edges[k] - t) * FS;
    const u = (k < syls.length - 1 && dToEdge < trans) ? 0.5 * (1 - dToEdge / trans) : 0;
    const nx = Math.min(syls.length - 1, k + 1);
    for (let j = 0; j < 3; j += 1) F[j][i] = syls[k].F[j] + (syls[nx].F[j] - syls[k].F[j]) * u;
    const t0k = k === 0 ? 0 : edges[k - 1];
    const local = (t - t0k) / syls[k].d;
    A[i] = Math.min(1, Math.sin(Math.PI * clamp(local, 0, 1)) * 2.4);
  }
  return { F, A };
}

/* 声源（脉冲串 / 噪声）→ 三个时变谐振器 → 幅度包络 */
function synthSyls(syls, rate, seed) {
  const n = Math.round((syls.reduce((a, b) => a + b.d, 0) / rate) * FS);
  const { F, A } = buildTrack(syls, n);
  const rnd = mulberry32(seed);
  const src = new Float64Array(n);
  let ph = 0;
  for (let i = 0; i < n; i += 1) {
    const f0 = 130 * (1 + 0.08 * Math.sin((2 * Math.PI * 1.6 * i) / n));
    ph += f0 / FS;
    if (ph >= 1) ph -= 1;
    const duty = 0.4;
    src[i] = ph < duty ? 0.5 * (1 - Math.cos((2 * Math.PI * ph) / duty)) - 0.2 : -0.2;
  }
  let y = src;
  for (let k = 0; k < 3; k += 1) {
    const out = new Float64Array(n);
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < n; i += 1) {
      const r = Math.exp((-Math.PI * BW[k]) / FS);
      const c = 2 * r * Math.cos((2 * Math.PI * F[k][i]) / FS);
      const v = y[i] + c * y1 - r * r * y2;
      out[i] = v;
      y2 = y1;
      y1 = v;
    }
    y = out;
  }
  let peak = 0;
  for (let i = 0; i < n; i += 1) {
    y[i] *= A[i];
    peak = Math.max(peak, Math.abs(y[i]));
  }
  for (let i = 0; i < n; i += 1) y[i] = (y[i] / (peak || 1)) * 0.85;
  return y;
}

/* 整条音频流：背景噪声 + 两段干扰 + 两次关键词（第二次慢 6%） */
function buildStream(envNoise) {
  const n = Math.round(STREAM_T * FS);
  const x = new Float64Array(n);
  const rnd = mulberry32(880711);
  let lp = 0;
  for (let i = 0; i < n; i += 1) {
    lp = lp * 0.9 + (rnd() * 2 - 1) * 0.1;
    x[i] = lp * envNoise * 6;
  }
  const add = (seg, at, scale) => {
    const s0 = Math.round(at * FS);
    for (let i = 0; i < seg.length && s0 + i < n; i += 1) x[s0 + i] += seg[i] * scale;
  };
  add(synthSyls(DIST.a, 1, 11), 0.5, 0.75);
  add(synthSyls(KW, 1, 22), GT[0].t0, 1.0);
  add(synthSyls(DIST.b, 1, 33), 3.0, 0.7);
  add(synthSyls(KW, 0.94, 44), GT[1].t0, 1.0);
  let peak = 0;
  for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(x[i]));
  if (peak > 0.95) for (let i = 0; i < n; i += 1) x[i] *= 0.95 / peak;
  return x;
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    threshold: clamp(spec.threshold ?? 3, 0, 8),
    smooth: clamp(spec.smooth ?? 9, 1, 31),
    env: ENV[spec.env] ? spec.env : 'normal',
  };

  let dsp = null;
  let stream = null;
  let feat = [];        // 每帧的倒谱（已去 c0、已做 CMS、已归一）
  let tmpl = [];        // 模板倒谱序列
  let score = [];       // 每个窗口起点的标准化得分（单位 σ）
  let smoothScore = [];
  let dets = [];        // 检测到的区间（秒）
  let stats = { tp: 0, fp: 0, fn: 0 };
  let geom = null;
  let sMin0 = 0;
  let sMax0 = 6;

  const cv = setupCanvas(host, spec.height || 380);

  host.appendChild(buildSegmented(
    Object.keys(ENV).map((k) => ({ label: '环境：' + ENV[k].label, value: k })),
    s.env,
    (v) => {
      s.env = v;
      recompute();
    },
  ));

  const ro = buildReadout({
    阈值: '—', 检测: '—', 精确率: '—', 召回率: '—', 峰值: '—',
  });
  host.appendChild(ro.box);

  /* ---------- 特征与打分 ---------- */
  function featurize(x) {
    const raw = dsp.mfcc(x, { fs: FS, frameLen: FRAME, hop: HOP, nFilters: 26, nCeps: NCEP + 1 });
    /* 丢掉 c0（能量），再做倒谱均值相减（CMS）：不然每帧都被同一个大数主导，
       余弦相似度到哪儿都是 0.99，分不开 */
    const f = raw.map((v) => Float64Array.from(v.slice(1)));
    const mean = new Float64Array(NCEP);
    f.forEach((v) => { for (let i = 0; i < NCEP; i += 1) mean[i] += v[i]; });
    for (let i = 0; i < NCEP; i += 1) mean[i] /= Math.max(1, f.length);
    f.forEach((v) => {
      for (let i = 0; i < NCEP; i += 1) v[i] -= mean[i];
      let nrm = 0;
      for (let i = 0; i < NCEP; i += 1) nrm += v[i] * v[i];
      nrm = Math.sqrt(nrm) || 1;
      v.norm = nrm;
    });
    return f;
  }

  function cosine(a, b) {
    let d = 0;
    for (let i = 0; i < NCEP; i += 1) d += a[i] * b[i];
    return d / ((a.norm || 1) * (b.norm || 1));
  }

  function recompute() {
    if (!dsp) return;
    stream = buildStream(ENV[s.env].noise);
    feat = featurize(stream);
    tmpl = featurize(synthSyls(KW, 1, 22));
    const raw = [];
    const T = tmpl.length;
    for (let w = 0; w + T <= feat.length; w += 1) {
      let acc = 0;
      for (let t = 0; t < T; t += 1) acc += cosine(feat[w + t], tmpl[t]);
      raw.push(acc / T);
    }
    /* 中位数 / MAD 标准化 → 「超出背景几个 σ」 */
    const sorted = raw.slice().sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const dev = raw.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
    const mad = dev[Math.floor(dev.length / 2)] || 1e-6;
    score = raw.map((v) => (v - med) / (1.4826 * mad));
    detect();
    draw();
  }

  /* ---------- 平滑 + 阈值判决 ---------- */
  function detect() {
    const k = Math.max(1, Math.round(s.smooth));
    const half = Math.floor(k / 2);
    smoothScore = score.map((v, i) => {
      let acc = 0;
      let cnt = 0;
      for (let j = i - half; j <= i + half; j += 1) {
        if (j < 0 || j >= score.length) continue;
        acc += score[j];
        cnt += 1;
      }
      return acc / Math.max(1, cnt);
    });

    /* 过阈值的连续段 → 每段取峰，峰间距 < 0.5 s 的合并（消抖） */
    const runs = [];
    let cur = null;
    smoothScore.forEach((v, i) => {
      if (v > s.threshold) {
        if (!cur) cur = { i0: i, i1: i, peak: v, ip: i };
        else {
          cur.i1 = i;
          if (v > cur.peak) { cur.peak = v; cur.ip = i; }
        }
      } else if (cur) {
        runs.push(cur);
        cur = null;
      }
    });
    if (cur) runs.push(cur);

    dets = [];
    runs.forEach((r) => {
      const t = (r.ip * HOP) / FS;
      if (dets.length && t - dets[dets.length - 1].t < 0.5) return;
      dets.push({ t, peak: r.peak, dur: ((r.i1 - r.i0 + 1) * HOP) / FS });
    });

    /* 与真值对表：峰值落在真值区间 ±0.3 s 内算命中 */
    const hit = GT.map(() => false);
    let tp = 0;
    let fp = 0;
    dets.forEach((d) => {
      const k2 = GT.findIndex((g, i) => !hit[i] && d.t > g.t0 - 0.3 && d.t < g.t1 + 0.3);
      if (k2 >= 0) { hit[k2] = true; tp += 1; d.tp = true; } else { fp += 1; d.tp = false; }
    });
    const fn = hit.filter((h) => !h).length;
    stats = { tp, fp, fn };
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const topH = Math.round(H * 0.30);
    const botY = topH + 30;
    const botH = H - botY - 34;
    geom = { W, H, topH, botY, botH };
    clearBg(ctx, W, H, C);

    if (!dsp || !stream) {
      label(ctx, '正在载入 dsp 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    const TX = (t) => (t / STREAM_T) * W;

    /* 上：波形 + 真值带 + 检测块 */
    GT.forEach((g) => {
      ctx.fillStyle = C.ok;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(TX(g.t0), 0, TX(g.t1) - TX(g.t0), topH);
      ctx.globalAlpha = 1;
      label(ctx, '真值', TX(g.t0) + 3, 12, C.ok, { size: 10 });
    });
    const pts = [];
    const stride = Math.max(1, Math.floor(stream.length / W));
    for (let i = 0, x = 0; i < stream.length; i += stride, x += 1) {
      pts.push([x, topH / 2 - stream[i] * (topH / 2) * 0.92]);
    }
    polyline(ctx, pts, C.series(0), 1);
    label(ctx, '音频流（绿带 = 关键词真值区间）', 8, topH + 14, C.fg, { size: 11 });

    /* 下：得分曲线 + 阈值线 */
    const sMin = Math.min(...smoothScore, s.threshold) - 0.05;
    const sMax = Math.max(...smoothScore, s.threshold) + 0.05;
    const SY = (v) => botY + botH - ((clamp(v, sMin, sMax) - sMin) / (sMax - sMin || 1)) * botH;
    const SX = (i) => (i / Math.max(1, score.length - 1)) * W;

    /* 阈值线以下 = 不唤醒 */
    ctx.fillStyle = C.soft;
    ctx.fillRect(0, SY(s.threshold), W, botY + botH - SY(s.threshold));

    const rawPts = [];
    for (let i = 0; i < score.length; i += 1) rawPts.push([SX(i), SY(score[i])]);
    polyline(ctx, rawPts, C.axis, 1);
    const smPts = [];
    for (let i = 0; i < smoothScore.length; i += 1) smPts.push([SX(i), SY(smoothScore[i])]);
    polyline(ctx, smPts, C.accent, 2.2);

    /* 阈值线（可拖） */
    const ty = SY(s.threshold);
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(0, ty);
    ctx.lineTo(W, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, `阈值 ${fmt(s.threshold, 2)}（上下拖这条线）`, W - 6, ty - 6, C.bad, {
      align: 'right', size: 11, weight: 600,
    });

    /* 检测标记 */
    dets.forEach((d) => {
      const x = SX((d.t * FS) / HOP);
      ctx.strokeStyle = d.tp ? C.ok : C.bad;
      ctx.lineWidth = d.tp ? 2.4 : 1.6;
      ctx.beginPath();
      ctx.moveTo(x, botY);
      ctx.lineTo(x, botY + botH);
      ctx.stroke();
      ctx.fillStyle = d.tp ? C.ok : C.bad;
      ctx.beginPath();
      ctx.arc(x, SY(d.peak), 4, 0, Math.PI * 2);
      ctx.fill();
      /* 上面的检测块 */
      ctx.globalAlpha = 0.5;
      ctx.fillRect(TX(d.t), 0, Math.max(3, TX(d.dur)), topH);
      ctx.globalAlpha = 1;
      label(ctx, d.tp ? '命中' : '误报', x + 4, botY + 12, d.tp ? C.ok : C.bad, { size: 10 });
    });

    label(ctx, '灰细 = 逐窗得分　橙粗 = 平滑后　纵轴 = 超出背景几个 σ', 8, botY - 8, C.fg, { size: 10 });
    label(ctx, `${fmt(STREAM_T, 1)} s 音频流，窗口 ${fmt((KW_DUR * 1000), 0)} ms，帧移 ${fmt((HOP / FS) * 1000, 0)} ms`,
      8, botY + botH + 16, C.fg, { size: 10 });

    /* 读数 */
    const prec = stats.tp + stats.fp ? stats.tp / (stats.tp + stats.fp) : 0;
    const rec = stats.tp + stats.fn ? stats.tp / (stats.tp + stats.fn) : 0;
    ro.set('阈值', `${fmt(s.threshold, 1)} σ（平滑窗 ${Math.round(s.smooth)} 帧 = ${fmt((Math.round(s.smooth) * HOP) / FS * 1000, 0)} ms）`);
    ro.set('检测', `${dets.length} 次：命中 ${stats.tp} / 误报 ${stats.fp} / 漏报 ${stats.fn}`);
    ro.set('精确率', `${fmt(prec * 100, 0)}%（唤醒里有几次是对的）`);
    ro.set('召回率', `${fmt(rec * 100, 0)}%（两次真值唤醒了几次）`);
    ro.set('峰值', `最高 ${fmt(Math.max(...smoothScore), 2)} σ　→ 阈值离峰值越近越容易漏报`);
  }

  /* ---------- 拖拽：阈值线 ---------- */
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geom) return null;
      if (y >= geom.botY - 10) return 'thr';
      return null;
    },
    move(id, x, y) {
      const t = 1 - (y - geom.botY) / geom.botH;
      setThreshold(sMin0 + t * (sMax0 - sMin0));
    },
  });

  function setThreshold(v) {
    const nv = Math.round(clamp(v, 0, 8) * 10) / 10;
    if (nv === s.threshold) return;
    s.threshold = nv;
    sl.state.threshold = nv;
    const inp = sl.box.querySelectorAll('input')[0];
    if (inp) {
      inp.value = String(nv);
      const val = inp.parentNode.querySelector('.ml-slider__val');
      if (val) val.textContent = fmt(nv, 2);
    }
    detect();
    draw();
  }

  /* ---------- 唤醒提示音 ---------- */
  const shell = audioShell(host, (eng, api) => {
    eng.setMasterGain(0.8);
    const t = eng.ctx.currentTime;
    const voices = [880, 1318].map((f, i) => eng.tone({ type: 'sine', freq: f, gain: 0.0001 }));
    voices.forEach((o, i) => {
      const t0 = t + i * 0.14;
      o.gain.gain.cancelScheduledValues(t0);
      o.gain.gain.setValueAtTime(0.0001, t0);
      o.gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.015);
      o.gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    });
    api.hint.textContent = '叮咚 —— 唤醒成功后的反馈音（音量 0.2）';
    return () => voices.forEach((o) => {
      try { o.stop(); } catch (e) { void e; }
    });
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'threshold', label: '阈值(σ)', min: 0, max: 8, step: 0.1, value: s.threshold, fmt: 1 },
        { name: 'smooth', label: '平滑窗长', min: 1, max: 31, step: 2, value: s.smooth, fmt: 0 },
      ],
    },
    (st) => {
      s.threshold = st.threshold;
      s.smooth = st.smooth;
      detect();
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  engine('dsp').then((m) => {
    dsp = m;
    recompute();
    /* 阈值滑块的可用范围跟着实际得分定，免得拖半天没有反应 */
    const lo = Math.min(...smoothScore);
    const hi = Math.max(...smoothScore);
    sMin0 = Math.floor((lo - 0.05) * 20) / 20;
    sMax0 = Math.ceil((hi + 0.05) * 20) / 20;
  }).catch(() => { void 0; });

  return {
    slidersBox: sl.box,
    destroy() { shell.stop(); },
  };
}

/* =========================================================================
 * lab 组件：source-filter（源-滤波器模型：人是怎样发声的）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "source-filter",
 *     "title": "拖动 F1/F2，听元音从 /a/ 变成 /i/"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   f0        基频 Hz，默认 120（成年男声量级）
 *   src       激励：'voiced' 浊音脉冲串（默认）/ 'noise' 清音白噪声 / 'mix' 混合
 *   formants  [F1, F2, F3] 共振峰频率 Hz，默认取 vowel 预设
 *   bw        [B1, B2, B3] 三个共振峰的带宽 Hz，默认取 vowel 预设
 *   slope     声源谱斜率 dB/oct（负数），默认 -12（声门波的典型值）
 *   vowel     初始元音：'a'（默认）| 'i' | 'u' | 'e' | 'o'；给了 formants 时忽略
 *   vol       音量 0..1，默认 0.2
 *
 * 三行图在说什么：
 *   上：激励（声门脉冲串 = 周期性，所以有音高；噪声 = 无音高）
 *   中：频谱。灰色细线是声源的各次谐波（按 slope 递减），阴影是三个共振峰
 *       滤波器串起来的响应包络（声道的形状），橙色粗线是乘出来的输出谐波
 *   下：输出的时域波形——浊音是周期的，清音是乱的
 *
 * 能玩什么：
 *   · 直接拖中间图上的 F1/F2/F3 三个圆点：左右改中心频率，上下改带宽
 *     （越靠上峰越尖 = 带宽越窄 = 声音越"亮"）
 *   · 元音预设按钮一列，一键听 /a/ /i/ /u/ /e/ /o/ 之间来回跳
 *   · 切「浊音 / 清音 / 混合」，看激励换成噪声后频谱变成连续的一片
 *
 * 出声：是。走 core.audioShell —— ▶ 播放 / ■ 停止 两态按钮就在画布下方，
 *       离开视口自动停，默认音量 0.2（经 master 后即 0.2 幅度）。麦克风：否。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildSegmented, label, polyline, clamp, fmt, engine, audioShell,
  clearBg,
  lcg,
} from '../core.js';

/* 五个元音的三个共振峰（Hz）与带宽（Hz）：男声常见值，取教学用整数 */
const VOWELS = {
  a: { name: '/a/', f: [730, 1090, 2440], bw: [80, 110, 150] },
  i: { name: '/i/', f: [270, 2290, 3010], bw: [70, 120, 180] },
  u: { name: '/u/', f: [300, 870, 2240], bw: [70, 100, 160] },
  e: { name: '/e/', f: [530, 1840, 2480], bw: [75, 115, 165] },
  o: { name: '/o/', f: [570, 840, 2410], bw: [75, 105, 160] },
};

const F_LO = 60;
const F_HI = 6000;
const DB_LO = -72;
const DB_HI = 6;
const FS = 16000;      // 画图用的设计采样率（与引擎的实际采样率无关，归一化设计）
const NHARM = 60;      // 谐波最多算到第几次
const GRID = 240;      // 包络栅格点数
const PARTIALS = [];
for (let n = 1; n <= 40; n += 1) PARTIALS.push(n);

export default function render(host, spec) {
  let C = themeColors();
  const v0 = VOWELS[spec.vowel] || VOWELS.a;
  const s = {
    f0: spec.f0 ?? 120,
    vol: spec.vol ?? 0.2,
    src: spec.src ?? 'voiced',
    slope: spec.slope ?? -12,
    formants: (spec.formants || v0.f).slice(0, 3),
    bw: (spec.bw || v0.bw).slice(0, 3),
  };

  let dsp = null;
  let coefs = [];
  let envDb = null;
  let srcDb = [];
  let outDb = [];
  let vowel = spec.formants ? null : (VOWELS[spec.vowel] ? spec.vowel : 'a');

  const cv = setupCanvas(host, 420);
  const ro = buildReadout({ 基频: '—', F1: '—', F2: '—', F3: '—', 最近元音: '—' });
  host.appendChild(ro.box);

  const PADL = 44;
  const PADR = 12;
  const plotW = () => Math.max(40, cv.W - PADL - PADR);
  const fxAt = (f) => PADL + (Math.log(f / F_LO) / Math.log(F_HI / F_LO)) * plotW();
  const invFx = (px) => F_LO * ((F_HI / F_LO) ** ((px - PADL) / plotW()));
  const dbY = (db, y, h) => y + h - ((clamp(db, DB_LO, DB_HI) - DB_LO) / (DB_HI - DB_LO)) * h;

  /* ---------- 元音预设 / 激励模式 ---------- */

  const segVowel = buildSegmented(
    Object.keys(VOWELS).map((k) => ({ label: VOWELS[k].name, value: k })),
    vowel || '',
    (v) => setVowel(v),
  );
  host.appendChild(segVowel);

  const segSrc = buildSegmented(
    [
      { label: '浊音（脉冲串）', value: 'voiced' },
      { label: '清音（白噪声）', value: 'noise' },
      { label: '混合', value: 'mix' },
    ],
    s.src,
    (v) => {
      s.src = v;
      rebuildSources();
      recompute();
      draw();
    },
  );
  host.appendChild(segSrc);

  function clearSeg(box) {
    box.querySelectorAll('.ml-viz-btn').forEach((b) => b.classList.remove('is-active'));
  }

  function setVowel(k) {
    vowel = k;
    s.formants = VOWELS[k].f.slice();
    s.bw = VOWELS[k].bw.slice();
    updateAudio();
    recompute();
    draw();
  }

  /* ---------- 数值重算 ---------- */

  function filtDb(f) {
    let db = 0;
    for (let i = 0; i < coefs.length; i += 1) {
      db += dsp.biquadResponse(coefs[i], [f], FS).magDb[0];
    }
    return db;
  }

  function recompute() {
    if (!dsp) return;
    coefs = [0, 1, 2].map((i) => dsp.biquad('bandpass', s.formants[i], s.formants[i] / s.bw[i], 0, FS));

    const freqs = new Float64Array(GRID);
    for (let i = 0; i < GRID; i += 1) freqs[i] = F_LO * ((F_HI / F_LO) ** (i / (GRID - 1)));
    envDb = new Float64Array(GRID);
    for (let i = 0; i < 3; i += 1) {
      const r = dsp.biquadResponse(coefs[i], freqs, FS);
      for (let k = 0; k < GRID; k += 1) envDb[k] += r.magDb[k];
    }

    const nMax = Math.min(NHARM, Math.floor(F_HI / s.f0));
    srcDb = [0];
    outDb = [0];
    for (let n = 1; n <= nMax; n += 1) {
      const sdb = s.slope * Math.log2(n);
      srcDb[n] = sdb;
      outDb[n] = sdb + filtDb(n * s.f0);
    }
  }

  /* 合成一段波形用于画图：withFormants=false 时是纯激励 */
  function runBiquad(c, arr) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < arr.length; i += 1) {
      const x0 = arr[i];
      const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0;
      arr[i] = y0;
    }
  }

  function normalize(arr) {
    let mx = 1e-9;
    for (let i = 0; i < arr.length; i += 1) mx = Math.max(mx, Math.abs(arr[i]));
    for (let i = 0; i < arr.length; i += 1) arr[i] /= mx;
    return arr;
  }

  function synthWave(withFormants) {
    const N = 480;
    const out = new Float64Array(N);
    if (s.src === 'noise') {
      /* 定种子的伪随机：让波形别每帧乱跳，便于看清"它是乱的" */
      const rnd = lcg(20260904);
      for (let i = 0; i < N; i += 1) {
        out[i] = rnd();
      }
      if (withFormants) coefs.forEach((c) => runBiquad(c, out));
      return normalize(out);
    }
    const nMax = Math.min(NHARM, Math.floor(F_HI / s.f0));
    for (let n = 1; n <= nMax; n += 1) {
      const A = 10 ** ((s.slope * Math.log2(n)) / 20);
      const g = withFormants ? Math.pow(10, filtDb(n * s.f0) / 20) : 1;
      const amp = A * g;
      for (let i = 0; i < N; i += 1) out[i] += amp * Math.sin(2 * Math.PI * n * ((3 * i) / N));
    }
    return normalize(out);
  }

  /* ---------- 音频链路 ---------- */

  let eng = null;
  let chain = null;
  let harmSrc = null;
  let noiseSrc = null;

  function buildChain(e) {
    const input = e.ctx.createGain();
    const filts = [0, 1, 2].map((i) => e.biquad({
      type: 'bandpass', freq: s.formants[i], Q: s.formants[i] / s.bw[i],
    }));
    const outG = e.ctx.createGain();
    outG.gain.value = s.vol;
    input.connect(filts[0]);
    filts[0].connect(filts[1]);
    filts[1].connect(filts[2]);
    filts[2].connect(outG);
    outG.connect(e.master);
    return { input, filts, outG };
  }

  function startSources(e) {
    if (s.src !== 'noise') {
      harmSrc = e.harmonics({ partials: PARTIALS, base: s.f0, type: 'sine', gain: 1 });
      harmSrc.out.disconnect();
      harmSrc.out.connect(chain.input);
      harmSrc.setAmps(PARTIALS.map((n) => 10 ** ((s.slope * Math.log2(n)) / 20)));
    }
    if (s.src !== 'voiced') {
      noiseSrc = e.noise({ kind: 'white', seconds: 2, gain: s.src === 'mix' ? 0.25 : 1 });
      noiseSrc.gain.disconnect();
      noiseSrc.gain.connect(chain.input);
    }
  }

  function stopSources() {
    if (harmSrc) { harmSrc.stop(); harmSrc = null; }
    if (noiseSrc) { noiseSrc.stop(); noiseSrc = null; }
  }

  function rebuildSources() {
    if (!eng) return;
    stopSources();
    startSources(eng);
  }

  function updateAudio() {
    if (!eng || !chain) return;
    chain.outG.gain.setTargetAtTime(s.vol, eng.ctx.currentTime, 0.02);
    for (let i = 0; i < 3; i += 1) {
      chain.filts[i].frequency.setTargetAtTime(s.formants[i], eng.ctx.currentTime, 0.02);
      chain.filts[i].Q.setTargetAtTime(s.formants[i] / s.bw[i], eng.ctx.currentTime, 0.02);
    }
    if (harmSrc) {
      harmSrc.setBase(s.f0);
      harmSrc.setAmps(PARTIALS.map((n) => 10 ** ((s.slope * Math.log2(n)) / 20)));
    }
  }

  /* ---------- 画图 ---------- */

  const R1 = { y: 26, h: 72 };
  const R2 = { y: 128, h: 166 };
  const R3 = { y: 336, h: 66 };

  function drawWave(y, h, data, color) {
    const ctx = cv.ctx;
    const w = plotW();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADL, y + h / 2);
    ctx.lineTo(PADL + w, y + h / 2);
    ctx.stroke();
    const pts = [];
    for (let i = 0; i < data.length; i += 1) {
      pts.push([PADL + (i / (data.length - 1)) * w, y + h / 2 - data[i] * (h / 2) * 0.92]);
    }
    polyline(ctx, pts, color, 1.6);
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const w = plotW();
    clearBg(ctx, W, H, C);

    label(ctx, '① 激励（声源）', PADL, 18, C.fg, { size: 11 });
    label(ctx, '② 频谱：声源 × 声道 = 输出（拖 F1/F2/F3）', PADL, 118, C.fg, { size: 11 });
    label(ctx, '③ 输出波形', PADL, 326, C.fg, { size: 11 });

    if (!dsp) {
      label(ctx, '正在载入信号处理引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    /* --- ② 频谱（先画，网格铺底） --- */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    [100, 200, 500, 1000, 2000, 5000].forEach((f) => {
      const x = fxAt(f);
      ctx.beginPath();
      ctx.moveTo(x, R2.y);
      ctx.lineTo(x, R2.y + R2.h);
      ctx.stroke();
      label(ctx, f >= 1000 ? f / 1000 + 'k' : String(f), x, R2.y + R2.h + 13, C.fg, { align: 'center', size: 10 });
    });
    [0, -20, -40, -60].forEach((db) => {
      const y = dbY(db, R2.y, R2.h);
      ctx.beginPath();
      ctx.moveTo(PADL, y);
      ctx.lineTo(PADL + w, y);
      ctx.stroke();
      label(ctx, String(db), PADL - 6, y + 4, C.fg, { align: 'right', size: 10 });
    });
    label(ctx, 'dB', PADL - 6, R2.y - 4, C.fg, { align: 'right', size: 10 });
    label(ctx, 'Hz', PADL + w, R2.y + R2.h + 26, C.fg, { align: 'right', size: 10 });

    /* 声源谱倾斜线（虚线）：在对数频率轴上是一条直线 */
    ctx.save();
    ctx.setLineDash([4, 4]);
    polyline(ctx, [
      [fxAt(F_LO), dbY(s.slope * Math.log2(F_LO / s.f0), R2.y, R2.h)],
      [fxAt(F_HI), dbY(s.slope * Math.log2(F_HI / s.f0), R2.y, R2.h)],
    ], C.axis, 1);
    ctx.restore();
    label(ctx, `声源谱 ${fmt(s.slope, 0)} dB/oct`, fxAt(F_LO) + 4,
      dbY(s.slope * Math.log2(F_LO / s.f0), R2.y, R2.h) - 6, C.axis, { size: 10 });

    /* 声道响应包络 */
    ctx.beginPath();
    ctx.moveTo(PADL, R2.y + R2.h);
    for (let i = 0; i < GRID; i += 1) {
      ctx.lineTo(PADL + (i / (GRID - 1)) * w, dbY(envDb[i], R2.y, R2.h));
    }
    ctx.lineTo(PADL + w, R2.y + R2.h);
    ctx.closePath();
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.16;
    ctx.fill();
    ctx.globalAlpha = 1;
    const envPts = [];
    for (let i = 0; i < GRID; i += 1) envPts.push([PADL + (i / (GRID - 1)) * w, dbY(envDb[i], R2.y, R2.h)]);
    polyline(ctx, envPts, C.accent, 1.8);

    /* 声源谐波（灰细线）与输出谐波（橙色粗线） */
    const yBot = R2.y + R2.h;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    for (let n = 1; n < srcDb.length; n += 1) {
      const f = n * s.f0;
      if (f > F_HI) break;
      const x = fxAt(f);
      ctx.beginPath();
      ctx.moveTo(x, yBot);
      ctx.lineTo(x, dbY(srcDb[n], R2.y, R2.h));
      ctx.stroke();
    }
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2.4;
    for (let n = 1; n < outDb.length; n += 1) {
      const f = n * s.f0;
      if (f > F_HI) break;
      const x = fxAt(f);
      const y = dbY(outDb[n], R2.y, R2.h);
      ctx.beginPath();
      ctx.moveTo(x, yBot);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.fillStyle = C.accent2;
    for (let n = 1; n < outDb.length; n += 1) {
      const f = n * s.f0;
      if (f > F_HI) break;
      ctx.beginPath();
      ctx.arc(fxAt(f), dbY(outDb[n], R2.y, R2.h), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 三个可拖的共振峰把手 */
    const handles = [];
    for (let i = 0; i < 3; i += 1) {
      const px = fxAt(s.formants[i]);
      const py = dbY(filtDb(s.formants[i]), R2.y, R2.h);
      handles.push([px, py]);
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = C.fg;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, yBot);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = C.named('purple');
      ctx.fill();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, `F${i + 1} ${fmt(s.formants[i], 0)}·BW${fmt(s.bw[i], 0)}`, px + 9, py - 7, C.named('purple'), { size: 10, weight: 600 });
    }

    /* --- ① 激励波形 --- */
    drawWave(R1.y, R1.h, synthWave(false), C.axis);
    label(ctx, s.src === 'noise' ? '白噪声：没有周期性，所以没有音高'
      : `周期 1/F0 = ${fmt(1000 / s.f0, 2)} ms`, PADL + w, 18, C.fg, { align: 'right', size: 10 });

    /* --- ③ 输出波形 --- */
    drawWave(R3.y, R3.h, synthWave(true), C.accent2);

    /* 底部提示 */
    label(ctx, '拖中图的紫点：左右改共振峰频率，上下改带宽（越上越尖）', PADL, H - 5, C.fg, { size: 10 });

    /* 读数 */
    ro.set('基频', fmt(s.f0, 0) + ' Hz');
    for (let i = 0; i < 3; i += 1) {
      ro.set(`F${i + 1}`, `${fmt(s.formants[i], 0)} Hz / BW ${fmt(s.bw[i], 0)}`);
    }
    let bestK = null;
    let bestD = Infinity;
    Object.keys(VOWELS).forEach((k) => {
      const d = Math.abs(Math.log(s.formants[0] / VOWELS[k].f[0]))
        + Math.abs(Math.log(s.formants[1] / VOWELS[k].f[1]));
      if (d < bestD) { bestD = d; bestK = k; }
    });
    ro.set('最近元音', bestD < 0.45 ? `${VOWELS[bestK].name}（差 ${fmt(bestD, 2)}）` : '两个共振峰之间');
  }

  /* ---------- 拖拽 ---------- */

  bindPointer(cv.canvas, {
    pick(X, Y) {
      if (!dsp || Y < R2.y - 26 || Y > R2.y + R2.h + 26) return null;
      let best = null;
      let bd = 15;
      for (let i = 0; i < 3; i += 1) {
        const d = Math.hypot(X - fxAt(s.formants[i]), Y - dbY(filtDb(s.formants[i]), R2.y, R2.h));
        if (d < bd) { bd = d; best = 'f' + i; }
      }
      return best;
    },
    move(id, X, Y) {
      const i = Number(id.slice(1));
      const lo = i === 0 ? 150 : s.formants[i - 1] + 120;
      const hi = i === 2 ? 5200 : s.formants[i + 1] - (i === 0 ? 120 : 150);
      s.formants[i] = Math.round(clamp(invFx(clamp(X, PADL, PADL + plotW())), lo, Math.max(lo + 30, hi)));
      /* 上下 = 带宽：顶端 30 Hz（尖），底端 420 Hz（钝），按几何插值 */
      const t = clamp((Y - R2.y) / R2.h, 0, 1);
      s.bw[i] = Math.round(30 * ((420 / 30) ** t));
      vowel = null;
      clearSeg(segVowel);
      updateAudio();
      recompute();
      draw();
    },
  });

  /* ---------- 出声（audioShell 自带 ▶/■ 与离屏停止） ---------- */

  const shell = audioShell(host, (e) => {
    eng = e;
    e.setMasterGain(1);
    chain = buildChain(e);
    startSources(e);
    return () => {
      stopSources();
      chain = null;
      eng = null;
    };
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'f0', label: '基频 F0', min: 60, max: 300, step: 1, value: s.f0 },
        { name: 'slope', label: '声源谱斜率', min: -18, max: -6, step: 0.5, value: s.slope, fmt: 1 },
        { name: 'vol', label: '音量', min: 0, max: 0.8, step: 0.02, value: s.vol, fmt: 2 },
      ],
    },
    (st) => {
      s.f0 = st.f0;
      s.slope = st.slope;
      s.vol = st.vol;
      updateAudio();
      recompute();
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  engine('dsp').then((m) => {
    dsp = m;
    recompute();
    draw();
  }).catch((e) => {
    void e;
  });

  return {
    slidersBox: sliders.box,
    destroy() {
      shell.stop();
    },
  };
}

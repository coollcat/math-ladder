/* =========================================================================
 * lab 组件：spectrogram-lab（语谱图：给声音拍一张照片）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "spectrogram-lab",
 *     "title": "拖竖线：在语谱图上读出任一时刻的频谱"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   kind      'vowels' 元音序列 /a/-/i/-/u/ 加咝音（默认）
 *             / 'chirp' 上下扫频  / 'bursts' 三声噪声脉冲
 *   frameLen  帧长（样点，@16 kHz），默认 512（32 ms）
 *   hop       帧移（样点），默认 128（8 ms）
 *   range     显示的动态范围 dB，默认 60
 *   win       窗函数，默认 'hann'
 *   fs        内置信号的采样率，默认 16000
 *
 * 三行图在说什么：
 *   上：波形（时间 × 幅度）
 *   中：语谱图（时间 × 频率，颜色 = 能量）。横条纹 = 浊音里的一根根谐波；
 *       竖条纹 = 瞬态（咝音、爆破）；乱成一片没有条纹 = 清音噪声
 *   下：光标那一帧的频谱切片——语谱图就是这一条条切片并排铺出来的
 *
 * 能玩什么：
 *   · 拖中图的竖线（在波形区拖也行）扫时间，看下面那条切片怎么变
 *   · 拖帧长：帧长 ↑ 频率看得清但时间糊；帧长 ↓ 时间看得清但频率糊
 *     （这就是短时傅里叶的时频不确定关系）
 *   · 点「🎤 用麦克风」对着说：看自己的元音横条纹和 /s/ 的乱纹
 *
 * 出声：否。麦克风：是——必须由用户点按钮触发授权，失败会给明确的文字提示
 *       （拒绝授权 / 非 HTTPS / 浏览器不支持三者分开说），绝不静默失败。
 *       麦克风只做分析，不接扬声器，不会啸叫。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildSegmented, buildToolbar, mkBtn, el, label, polyline, clamp, fmt, engine, audio, rafLoop,
  normalizeTo,
  clearBg,
  cssToRGB,
  lcg,
} from '../core.js';

const FS = 16000;      // 内置信号的设计采样率
const PADL = 40;
const PADR = 12;

/* ---------- 颜色表：从主题色插值出一张 256 级色标（跟着明暗主题走） ---------- */

function buildColormap(C) {
  const stops = [
    [0.00, cssToRGB(C.bg, [255, 255, 255])],
    [0.26, cssToRGB(C.named('purple'), [90, 70, 160])],
    [0.52, cssToRGB(C.named('red'), [200, 70, 60])],
    [0.78, cssToRGB(C.named('amber'), [230, 170, 40])],
    /* 最亮那一档没有对应的主题色变量，只能按明暗各给一个：暗底配暖白，亮底配深褐 */
    [1.00, C.dark ? [255, 246, 214] : [110, 55, 15]],
  ];
  const out = [];
  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let j = 0; j < stops.length - 1; j += 1) {
      if (t >= stops[j][0] && t <= stops[j + 1][0]) { a = stops[j]; b = stops[j + 1]; break; }
    }
    const u = (t - a[0]) / Math.max(1e-9, b[0] - a[0]);
    out.push([
      Math.round(a[1][0] + (b[1][0] - a[1][0]) * u),
      Math.round(a[1][1] + (b[1][1] - a[1][1]) * u),
      Math.round(a[1][2] + (b[1][2] - a[1][2]) * u),
    ]);
  }
  return out;
}

/* ---------- 内置示例信号 ---------- */

function synthChirp(fs) {
  const dur = 1.6;
  const N = Math.round(dur * fs);
  const out = new Float64Array(N);
  for (let i = 0; i < N; i += 1) {
    const t = i / fs;
    const u = t / dur;
    /* 先升后降：频率 f(t) = 300 + 2700 * sin(π u)，相位要积分 */
    const f0 = 300;
    const k = 2700;
    const ph = 2 * Math.PI * (f0 * t + (k * dur / Math.PI) * (1 - Math.cos(Math.PI * u)));
    const env = Math.min(1, u / 0.05, (1 - u) / 0.05);
    out[i] = 0.9 * Math.sin(ph) * Math.max(0, env);
  }
  return out;
}

function synthBursts(fs) {
  const N = Math.round(1.6 * fs);
  const out = new Float64Array(N);
  const rnd = lcg(4242);
  [0.15, 0.65, 1.15].forEach((t0) => {
    const a = Math.round(t0 * fs);
    const len = Math.round(0.10 * fs);
    for (let i = 0; i < len && a + i < N; i += 1) {
      out[a + i] = rnd() * Math.exp(-i / (0.02 * fs)) * 0.9;
    }
  });
  return out;
}

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    kind: spec.kind ?? 'vowels',
    frameLen: spec.frameLen ?? 512,
    hop: spec.hop ?? 128,
    range: spec.range ?? 60,
    win: spec.win ?? 'hann',
  };

  let dsp = null;
  let sig = null;
  let sg = null;        // { cols, bins, hop, frameLen }
  let sgFs = FS;
  let sgPeak = 0;
  let cursor = 0.5;     // 归一化时间 0..1
  let cmap = null;
  let curFs = FS;
  let curData = sig;

  const cv = setupCanvas(host, 430);
  const ro = buildReadout({ 音源: '—', 帧长: '—', 帧移: '—', 时间轴: '—', 光标: '—', 峰值: '—' });
  host.appendChild(ro.box);

  const plotW = () => Math.max(40, cv.W - PADL - PADR);
  const R1 = { y: 26, h: 70 };
  const R2 = { y: 118, h: 188 };
  const R3 = { y: 336, h: 76 };

  /* ---------- 控件 ---------- */

  const segKind = buildSegmented(
    [
      { label: '元音序列', value: 'vowels' },
      { label: '上下扫频', value: 'chirp' },
      { label: '噪声脉冲', value: 'bursts' },
    ],
    s.kind,
    (v) => {
      if (mic) stopMic();
      s.kind = v;
      rebuildSignal();
      recompute();
      draw();
    },
  );
  host.appendChild(segKind);

  const hint = el('span', 'ml-lab__hint', '');
  const micBtn = mkBtn('🎤 用麦克风');
  micBtn.addEventListener('click', () => {
    if (mic) stopMic();
    else startMic();
  });
  host.appendChild(buildToolbar(micBtn, hint));

  /* ---------- 计算 ---------- */

  function rebuildSignal() {
    if (!dsp) return;
    if (s.kind === 'chirp') sig = synthChirp(FS);
    else if (s.kind === 'bursts') sig = synthBursts(FS);
    else sig = dsp.synthUtterance(FS);
    curData = sig;
    curFs = FS;
  }

  function recompute() {
    if (!dsp || !curData) return;
    /* 采样率不是 16 kHz 时（麦克风）按比例把帧长/帧移换算过去 */
    const k = curFs / FS;
    const fl = Math.max(32, Math.round(s.frameLen * k));
    const hp = Math.max(8, Math.round(s.hop * k));
    sg = dsp.spectrogram(curData, { frameLen: fl, hop: hp, win: s.win });
    sgFs = curFs;
    let mx = -Infinity;
    sg.cols.forEach((c) => {
      for (let i = 1; i < c.length; i += 1) if (c[i] > mx) mx = c[i];
    });
    sgPeak = mx;
  }

  /* ---------- 麦克风 ---------- */

  let mic = null;
  let loop = null;
  let lastRead = 0;
  let readCount = 0;

  function setHint(t) {
    hint.textContent = t;
  }

  function pushRing(arr) {
    const cap = mic.ring.length;
    for (let i = 0; i < arr.length; i += 1) {
      mic.ring[mic.wptr] = arr[i];
      mic.wptr = (mic.wptr + 1) % cap;
      if (mic.filled < cap) mic.filled += 1;
    }
  }

  function ordered(n) {
    const cap = mic.ring.length;
    const m = Math.min(n, mic.filled);
    const out = new Float64Array(m);
    const st = (mic.wptr - m + cap) % cap;
    for (let i = 0; i < m; i += 1) out[i] = mic.ring[(st + i) % cap];
    return out;
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
      /* 只接到分析器、不接 master：纯分析，不回放，杜绝啸叫 */
      const an = eng.analyser({ fftSize: 2048, smoothing: 0, input: src });
      mic = {
        stream, eng, an, sr: eng.sampleRate,
        ring: new Float64Array(Math.round(2.2 * eng.sampleRate)), wptr: 0, filled: 0,
      };
      micBtn.textContent = '■ 停止麦克风';
      setHint('麦克风已开：说「啊——」看横条纹，说「嘶——」看乱纹');
      curFs = mic.sr;
      lastRead = 0;
      readCount = 0;
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
    micBtn.textContent = '🎤 用麦克风';
    setHint('');
    curData = sig;
    curFs = FS;
    recompute();
    draw();
  }

  function tick() {
    if (!mic) return;
    const interval = (2048 / mic.sr) * 1000;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - lastRead < interval) return;
    lastRead = now;
    pushRing(mic.an.waveform());
    readCount += 1;
    /* 两次读一次：语谱图重算比读数贵，10 fps 的刷新率对肉眼够用 */
    if (readCount % 2) return;
    curData = ordered(Math.round(1.6 * mic.sr));
    recompute();
    draw();
  }

  /* ---------- 画图 ---------- */

  function drawSpectrogram(ctx, x, y, w, h) {
    if (!sg || !sg.cols.length) return;
    const nT = sg.cols.length;
    const nF = sg.bins;
    const off = document.createElement('canvas');
    off.width = nT;
    off.height = nF;
    const octx = off.getContext('2d');
    const img = octx.createImageData(nT, nF);
    const lo = sgPeak - s.range;
    for (let t = 0; t < nT; t += 1) {
      const col = sg.cols[t];
      for (let k = 1; k < nF; k += 1) {
        const v = clamp((col[k] - lo) / s.range, 0, 1);
        const c = cmap[Math.round(v * 255)];
        const idx = (((nF - 1 - k) * nT) + t) * 4;
        img.data[idx] = c[0];
        img.data[idx + 1] = c[1];
        img.data[idx + 2] = c[2];
        img.data[idx + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0, nT, nF, x, y, w, h);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function draw() {
    C = themeColors();
    cmap = buildColormap(C);
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const w = plotW();
    clearBg(ctx, W, H, C);

    label(ctx, '① 波形', PADL, 18, C.fg, { size: 11 });
    label(ctx, '② 语谱图（横轴时间，纵轴频率，颜色 = 能量；拖竖线扫时间）', PADL, 110, C.fg, { size: 11 });
    label(ctx, '③ 光标处的频谱切片', PADL, 328, C.fg, { size: 11 });

    if (!dsp) {
      label(ctx, '正在载入信号处理引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    const dur = curData ? curData.length / curFs : 0;
    const tOf = (X) => ((X - PADL) / w) * dur;

    /* --- ① 波形 --- */
    if (curData) {
      const n = curData.length;
      const step = Math.max(1, Math.floor(n / w));
      const pts = [];
      for (let i = 0; i < n; i += step) {
        pts.push([PADL + (i / (n - 1)) * w, R1.y + R1.h / 2 - curData[i] * (R1.h / 2) * 0.9]);
      }
      polyline(ctx, pts, C.accent, 1.1);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(PADL, R1.y + R1.h / 2);
      ctx.lineTo(PADL + w, R1.y + R1.h / 2);
      ctx.stroke();
    }

    /* --- ② 语谱图 --- */
    drawSpectrogram(ctx, PADL, R2.y, w, R2.h);
    /* 纵轴：频率刻度 */
    [1000, 2000, 4000, 8000].forEach((f) => {
      if (f > sgFs / 2) return;
      const y = R2.y + R2.h - (f / (sgFs / 2)) * R2.h;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(PADL, y);
      ctx.lineTo(PADL + w, y);
      ctx.stroke();
      label(ctx, f / 1000 + 'k', PADL - 5, y + 4, C.fg, { align: 'right', size: 10 });
    });
    label(ctx, 'Hz', PADL - 5, R2.y - 4, C.fg, { align: 'right', size: 10 });
    /* 横轴：时间刻度 */
    for (let i = 0; i <= 4; i += 1) {
      const t = (dur * i) / 4;
      const x = PADL + (i / 4) * w;
      label(ctx, fmt(t, 2) + 's', x, R2.y + R2.h + 14, C.fg, { align: 'center', size: 10 });
    }
    label(ctx, '秒', PADL + w, R2.y + R2.h + 14, C.fg, { align: 'right', size: 10 });

    /* 光标 */
    const cx = PADL + cursor * w;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.6;
    [R1, R2].forEach((r) => {
      ctx.beginPath();
      ctx.moveTo(cx, r.y);
      ctx.lineTo(cx, r.y + r.h);
      ctx.stroke();
    });
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.moveTo(cx, R1.y);
    ctx.lineTo(cx - 5, R1.y - 7);
    ctx.lineTo(cx + 5, R1.y - 7);
    ctx.closePath();
    ctx.fill();

    /* --- ③ 光标那一帧的频谱 --- */
    if (curData && sg) {
      const k = curFs / FS;
      const fl = Math.max(32, Math.round(s.frameLen * k));
      const st0 = clamp(Math.round(cursor * (curData.length - fl)), 0, Math.max(0, curData.length - fl));
      const wnd = dsp.window(s.win, fl);
      const seg = new Float64Array(fl);
      for (let i = 0; i < fl; i += 1) seg[i] = (curData[st0 + i] || 0) * wnd[i];
      const { mag } = dsp.rfft(dsp.padPow2(seg, Math.max(1024, fl)));
      const db = new Float64Array(mag.length);
      let mx = -Infinity;
      for (let b = 1; b < mag.length; b += 1) {
        db[b] = dsp.ampToDb(mag[b]);
        if (db[b] > mx) mx = db[b];
      }
      const pts = [];
      let pk = 1;
      for (let b = 1; b < db.length; b += 1) {
        const norm = clamp((db[b] - (mx - s.range)) / s.range, 0, 1);
        pts.push([PADL + (b / (db.length - 1)) * w, R3.y + R3.h - norm * R3.h]);
        if (db[b] > db[pk]) pk = b;
      }
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.moveTo(PADL, R3.y + R3.h);
      pts.forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.lineTo(PADL + w, R3.y + R3.h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      polyline(ctx, pts, C.accent, 1.6);
      const binHz = curFs / (2 * (db.length - 1));
      ro.set('峰值', `${fmt(pk * binHz, 0)} Hz`);
      ro.set('光标', `${fmt(tOf(cx), 3)} s`);
    }

    label(ctx, mic ? '麦克风实时分析中（不再需要时点「■ 停止麦克风」）'
      : '条纹越平越"浊"（有声带振动），越乱越"清"（像 /s/ 的噪声）', PADL, H - 5, C.fg, { size: 10 });

    ro.set('音源', mic ? '麦克风' : (s.kind === 'chirp' ? '上下扫频' : s.kind === 'bursts' ? '噪声脉冲' : '元音序列'));
    ro.set('帧长', `${s.frameLen} 点 / ${fmt((s.frameLen / FS) * 1000, 1)} ms`);
    ro.set('帧移', `${s.hop} 点 / ${fmt((s.hop / FS) * 1000, 2)} ms`);
    ro.set('时间轴', sg ? `${fmt(dur, 2)} s / ${sg.cols.length} 列` : '—');
  }

  /* ---------- 拖拽光标 ---------- */

  bindPointer(cv.canvas, {
    pick(X, Y) {
      const inR1 = Y >= R1.y - 12 && Y <= R1.y + R1.h + 12;
      const inR2 = Y >= R2.y && Y <= R2.y + R2.h;
      return (inR1 || inR2) ? 'cursor' : null;
    },
    move(id, X) {
      if (id !== 'cursor') return;
      cursor = clamp((X - PADL) / plotW(), 0, 1);
      draw();
    },
  });

  /* ---------- 滑块 ---------- */

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'frameLen', label: '帧长（点数）', min: 64, max: 1024, step: 64, value: s.frameLen },
        { name: 'hop', label: '帧移（点数）', min: 16, max: 512, step: 16, value: s.hop },
        { name: 'range', label: '动态范围', min: 20, max: 90, step: 5, value: s.range },
      ],
    },
    (st) => {
      s.frameLen = st.frameLen;
      s.hop = st.hop;
      s.range = st.range;
      recompute();
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  engine('dsp').then((m) => {
    dsp = m;
    rebuildSignal();
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

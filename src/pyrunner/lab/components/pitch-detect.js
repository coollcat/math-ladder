/* =========================================================================
 * lab 组件：pitch-detect（基频与音高检测：自相关法）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "pitch-detect",
 *     "title": "拖那条竖线：把它拖到 2 倍滞后处，音高就掉了一个八度"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   kind      'glide' 音高从 110 Hz 滑到 220 Hz 的元音（默认）
 *             / 'const' 恒定 150 Hz 的元音  / 'noisy' 掺了噪声的元音
 *   frameLen  帧长（样点 @16 kHz），默认 480（30 ms）
 *   hop       帧移（样点），默认 160（10 ms）
 *   fmin      搜索下限 Hz，默认 70
 *   fmax      搜索上限 Hz，默认 400
 *   fs        内置信号采样率，默认 16000
 *
 * 三行图在说什么：
 *   上：当前这一帧的波形（加了汉宁窗）
 *   中：它的自相关函数 r[k]。r[k] 衡量"把波形平移 k 个样点后跟自己有多像"。
 *       周期信号在 k = 一个周期处会冒出一个大峰——峰的位置就是基频
 *   下：整段的基频轨迹（横轴时间，纵轴音高），横虚线是 C3 / C4 / C5
 *
 * 能玩什么：
 *   · 拖中图的橙色竖线手动挑峰：把它拖到 2 倍滞后处，读数里的音高正好掉
 *     一个八度——这就是自相关法最经典的"八度错误"
 *   · 拖 fmin / fmax 改搜索范围：范围定错了，峰就找错地方
 *   · 切到「掺噪声」看清晰度那一栏怎么塌下来（自相关对噪声还算扛得住，
 *     但对"跑调"和"共振峰干扰"就没那么稳）
 *   · 点「🎤 用麦克风」哼一个音，看自己的音高轨迹和音分偏差
 *
 * 出声：否。麦克风：是——点按钮触发授权，失败给明确提示，只分析不回放。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildSegmented, buildToolbar, mkBtn, el, label, polyline, clamp, fmt, engine, audio, rafLoop,
} from '../core.js';

const PADL = 44;
const PADR = 12;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteOf(f) {
  if (!isFinite(f) || f <= 0) return { name: '—', cents: 0 };
  const n = 69 + 12 * Math.log2(f / 440);
  const r = Math.round(n);
  return {
    name: NOTE_NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1),
    cents: Math.round((n - r) * 100),
  };
}

/* 元音：谐波串（相位逐点累加，f0 变化时不会爆音）过三个共振峰带通 */
function synthVowel(dsp, fs, kind) {
  const dur = 1.8;
  const N = Math.round(dur * fs);
  const out = new Float64Array(N);
  const F = [730, 1090, 2440];
  const coefs = [0, 1, 2].map((i) => dsp.biquad('bandpass', F[i], F[i] / 110, 0, fs));
  const st = [0, 1, 2].map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
  const ph = new Float64Array(25);
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x3fffffff - 1;
  };
  for (let i = 0; i < N; i += 1) {
    const u = i / N;
    const f0 = kind === 'glide' ? 110 + 110 * u : 150;
    let v = 0;
    for (let n = 1; n <= 24; n += 1) {
      ph[n] += (2 * Math.PI * n * f0) / fs;
      v += (1 / (n * n)) * Math.sin(ph[n]);
    }
    if (kind === 'noisy') v = v * 0.8 + rnd() * 0.9;
    let y = v;
    for (let m = 0; m < 3; m += 1) {
      const c = coefs[m];
      const s = st[m];
      const y0 = c.b0 * y + c.b1 * s.x1 + c.b2 * s.x2 - c.a1 * s.y1 - c.a2 * s.y2;
      s.x2 = s.x1; s.x1 = y; s.y2 = s.y1; s.y1 = y0;
      y = y0;
    }
    out[i] = y;
  }
  let mx = 1e-9;
  for (let i = 0; i < N; i += 1) mx = Math.max(mx, Math.abs(out[i]));
  for (let i = 0; i < N; i += 1) out[i] = (out[i] / mx) * 0.9;
  return out;
}

/* 在已算好的自相关里按 [fmin, fmax] 挑峰（与 dsp.detectPitch 同一套判据，
   只是把昂贵的 autocorr 缓存下来，改范围时不用重算） */
function pickPeak(r, fs, fmin, fmax) {
  const minLag = Math.max(2, Math.floor(fs / fmax));
  const maxLag = Math.min(Math.floor(fs / fmin), r.length - 1);
  if (maxLag <= minLag) return { f0: 0, clarity: 0, lag: 0 };
  let best = minLag;
  for (let k = minLag; k <= maxLag; k += 1) if (r[k] > r[best]) best = k;
  let lag = best;
  if (best > 0 && best < maxLag) {
    const denom = 2 * (2 * r[best] - r[best - 1] - r[best + 1]);
    if (Math.abs(denom) > 1e-12) lag = best + (r[best + 1] - r[best - 1]) / denom;
  }
  return { f0: lag > 0 ? fs / lag : 0, clarity: Math.max(0, r[best]), lag };
}

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    kind: spec.kind ?? 'glide',
    frameLen: spec.frameLen ?? 480,
    hop: spec.hop ?? 160,
    fmin: spec.fmin ?? 70,
    fmax: spec.fmax ?? 400,
    fs: spec.fs ?? 16000,
  };

  let dsp = null;
  let sig = null;
  let nFrames = 0;
  let idx = 0;
  let autos = null;      // 每帧的自相关（只算一次，与 fmin/fmax 无关）
  let track = [];        // 每帧的 { f0, clarity }
  let cur = null;        // 当前帧的 { seg, r, det }
  let probeLag = 0;

  const cv = setupCanvas(host, 420);
  const ro = buildReadout({ 自动: '—', 手动: '—', 清晰度: '—', 音名: '—', 搜索范围: '—' });
  host.appendChild(ro.box);

  const plotW = () => Math.max(40, cv.W - PADL - PADR);
  const R1 = { y: 26, h: 78 };
  const R2 = { y: 126, h: 148 };
  const R3 = { y: 306, h: 94 };

  const segKind = buildSegmented(
    [
      { label: '音高上滑', value: 'glide' },
      { label: '恒定音高', value: 'const' },
      { label: '掺噪声', value: 'noisy' },
    ],
    s.kind,
    (v) => {
      s.kind = v;
      rebuild();
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

  const AUTO_MAX_LAG = () => Math.min(Math.floor(s.fs / 50), s.frameLen - 1);

  function rebuild() {
    if (!dsp) return;
    sig = synthVowel(dsp, s.fs, s.kind);
    nFrames = Math.max(1, Math.floor((sig.length - s.frameLen) / s.hop) + 1);
    idx = clamp(spec.frame ?? Math.round(nFrames * 0.3), 0, nFrames - 1);
    /* 自相关只依赖波形，不依赖搜索范围：算一次存着，拖 fmin/fmax 时直接重挑峰 */
    const w = dsp.window('hann', s.frameLen);
    autos = [];
    for (let i = 0; i < nFrames; i += 1) {
      const seg = new Float64Array(s.frameLen);
      for (let k = 0; k < s.frameLen; k += 1) seg[k] = sig[i * s.hop + k] * w[k];
      autos.push(dsp.autocorr(seg, AUTO_MAX_LAG()));
    }
    retrack();
  }

  function retrack() {
    track = autos.map((r) => pickPeak(r, s.fs, s.fmin, s.fmax));
  }

  function recompute() {
    if (!dsp || !sig) return;
    let seg;
    if (micFrame) {
      seg = micFrame;
    } else {
      seg = new Float64Array(s.frameLen);
      const w = dsp.window('hann', s.frameLen);
      for (let k = 0; k < s.frameLen; k += 1) seg[k] = sig[idx * s.hop + k] * w[k];
    }
    const r = dsp.autocorr(seg, AUTO_MAX_LAG());
    const det = dsp.detectPitch(seg, s.fs, s.fmin, s.fmax);
    cur = { seg, r, det };
    if (probeLag <= 0) probeLag = det.lag || 1;
  }

  /* ---------- 麦克风 ---------- */

  let mic = null;
  let loop = null;
  let micFrame = null;
  let hist = [];
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
      hist = [];
      micBtn.textContent = '■ 停止麦克风';
      setHint('麦克风已开：哼一个稳定的音，看音名和音分偏差');
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
    hist = [];
    micBtn.textContent = '🎤 用麦克风';
    setHint('');
    recompute();
    draw();
  }

  function tick() {
    if (!mic || !dsp) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - lastRead < 40) return;
    lastRead = now;
    const raw = mic.an.waveform();
    /* 取最后 30 ms，重采样到 16 kHz，好让帧长/频率轴与内置信号一致 */
    const need = Math.min(raw.length, Math.round((s.frameLen / s.fs) * mic.sr));
    const piece = new Float64Array(need);
    for (let i = 0; i < need; i += 1) piece[i] = raw[raw.length - need + i];
    const seg = dsp.resample(piece, mic.sr, s.fs);
    const w = dsp.window('hann', seg.length);
    for (let i = 0; i < seg.length; i += 1) seg[i] *= w[i];
    micFrame = seg;
    const det = dsp.detectPitch(seg, s.fs, s.fmin, s.fmax);
    hist.push(det);
    if (hist.length > 120) hist.shift();
    recompute();
    draw();
  }

  /* ---------- 画图 ---------- */

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const w = plotW();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    label(ctx, '① 当前帧的波形（已加汉宁窗）', PADL, 18, C.fg, { size: 11 });
    label(ctx, '② 自相关 r[k]：峰的位置 = 一个周期（拖橙线手动挑峰）', PADL, 118, C.fg, { size: 11 });
    label(ctx, mic ? '③ 音高轨迹（最近约 5 秒）' : '③ 整段的基频轨迹（拖横轴换帧）', PADL, 298, C.fg, { size: 11 });

    if (!dsp || !cur) {
      label(ctx, '正在载入信号处理引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    /* --- ① 波形 --- */
    {
      const seg = cur.seg;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(PADL, R1.y + R1.h / 2);
      ctx.lineTo(PADL + w, R1.y + R1.h / 2);
      ctx.stroke();
      const pts = [];
      for (let i = 0; i < seg.length; i += 1) {
        pts.push([PADL + (i / (seg.length - 1)) * w, R1.y + R1.h / 2 - seg[i] * (R1.h / 2) * 0.9]);
      }
      polyline(ctx, pts, C.accent, 1.4);
      label(ctx, `${fmt((seg.length / s.fs) * 1000, 1)} ms`, PADL + w, 18, C.fg, { align: 'right', size: 10 });
    }

    /* --- ② 自相关 --- */
    const maxLagShow = Math.min(cur.r.length - 1, Math.floor(s.fs / s.fmin));
    const lagX = (k) => PADL + (k / maxLagShow) * w;
    const invLagX = (X) => clamp(((X - PADL) / w) * maxLagShow, 1, maxLagShow);
    {
      const minLag = Math.max(2, Math.floor(s.fs / s.fmax));
      /* 搜索区间阴影 */
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.10;
      ctx.fillRect(lagX(minLag), R2.y, lagX(maxLagShow) - lagX(minLag), R2.h);
      ctx.globalAlpha = 1;

      [-0.5, 0, 0.5, 1].forEach((v) => {
        const y = R2.y + R2.h - ((v + 0.6) / 1.7) * R2.h;
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(PADL, y);
        ctx.lineTo(PADL + w, y);
        ctx.stroke();
        label(ctx, fmt(v, 1), PADL - 5, y + 4, C.fg, { align: 'right', size: 10 });
      });
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(PADL, R2.y + R2.h - (0.6 / 1.7) * R2.h);
      ctx.lineTo(PADL + w, R2.y + R2.h - (0.6 / 1.7) * R2.h);
      ctx.stroke();

      const pts = [];
      for (let k = 0; k <= maxLagShow; k += 1) {
        pts.push([lagX(k), R2.y + R2.h - ((cur.r[k] + 0.6) / 1.7) * R2.h]);
      }
      polyline(ctx, pts, C.accent, 1.8);

      /* 首峰（k=0 附近）不参与搜索，用灰虚线标出来提醒 */
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(lagX(0), R2.y);
      ctx.lineTo(lagX(0), R2.y + R2.h);
      ctx.stroke();
      ctx.restore();

      /* 自动检测到的峰 */
      const d = cur.det;
      if (d.lag > 0 && d.lag <= maxLagShow) {
        const px = lagX(d.lag);
        const py = R2.y + R2.h - ((cur.r[Math.round(d.lag)] + 0.6) / 1.7) * R2.h;
        ctx.strokeStyle = C.named('green');
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px, R2.y);
        ctx.lineTo(px, R2.y + R2.h);
        ctx.stroke();
        ctx.fillStyle = C.named('green');
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        label(ctx, `自动 ${fmt(d.f0, 1)} Hz`, px + 7, R2.y + 12, C.named('green'), { size: 10, weight: 600 });
      }

      /* 手动探针 */
      const px = lagX(clamp(probeLag, 1, maxLagShow));
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px, R2.y);
      ctx.lineTo(px, R2.y + R2.h);
      ctx.stroke();
      ctx.fillStyle = C.accent2;
      ctx.beginPath();
      ctx.moveTo(px, R2.y + R2.h);
      ctx.lineTo(px - 5, R2.y + R2.h + 8);
      ctx.lineTo(px + 5, R2.y + R2.h + 8);
      ctx.closePath();
      ctx.fill();
      label(ctx, `手动 k=${fmt(probeLag, 1)} → ${fmt(s.fs / probeLag, 1)} Hz`, px + 6, R2.y + R2.h - 6, C.accent2, { size: 10, weight: 600 });

      label(ctx, `滞后 k（样点，${fmt((maxLagShow / s.fs) * 1000, 0)} ms 内）`, PADL + w, R2.y + R2.h + 22, C.fg, { align: 'right', size: 10 });
      label(ctx, `搜索 ${fmt(s.fmin, 0)}–${fmt(s.fmax, 0)} Hz`, lagX(minLag) + 4, R2.y + R2.h - 6, C.accent, { size: 10 });
    }

    /* --- ③ 音高轨迹 --- */
    const F_HI = Math.max(450, s.fmax * 1.1);
    const fY = (f) => R3.y + R3.h - (clamp(f, 0, F_HI) / F_HI) * R3.h;
    {
      [130.81, 261.63, 523.25].forEach((f, i) => {
        if (f > F_HI) return;
        const y = fY(f);
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(PADL, y);
        ctx.lineTo(PADL + w, y);
        ctx.stroke();
        ctx.restore();
        label(ctx, ['C3', 'C4', 'C5'][i], PADL - 5, y + 4, C.fg, { align: 'right', size: 10 });
      });
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(PADL, R3.y + R3.h);
      ctx.lineTo(PADL + w, R3.y + R3.h);
      ctx.stroke();

      if (mic) {
        const pts = [];
        hist.forEach((d, i) => {
          if (d.clarity < 0.3 || d.f0 <= 0) return;
          pts.push([PADL + (i / Math.max(1, hist.length - 1)) * w, fY(d.f0)]);
        });
        polyline(ctx, pts, C.accent2, 2);
      } else {
        const pts = [];
        track.forEach((d, i) => {
          if (d.clarity < 0.3 || d.f0 <= 0) return;
          pts.push([PADL + (i / Math.max(1, track.length - 1)) * w, fY(d.f0)]);
        });
        polyline(ctx, pts, C.accent, 2);
        /* 当前帧竖线 */
        const cx = PADL + (idx / Math.max(1, track.length - 1)) * w;
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx, R3.y);
        ctx.lineTo(cx, R3.y + R3.h);
        ctx.stroke();
        const stepT = Math.max(1, Math.round(track.length / 5));
        for (let i = 0; i < track.length; i += stepT) {
          label(ctx, fmt((i * s.hop) / s.fs, 1) + 's',
            PADL + (i / Math.max(1, track.length - 1)) * w, R3.y + R3.h + 13, C.fg, { align: 'center', size: 9 });
        }
      }
      label(ctx, 'Hz', PADL - 5, R3.y + 8, C.fg, { align: 'right', size: 10 });
    }

    label(ctx, '把橙线拖到自动峰的两倍滞后处试试：波形在 2 个周期后也很像自己，这就是八度错误的来源',
      PADL, H - 5, C.fg, { size: 10 });

    /* 读数 */
    const d = cur.det;
    const manual = s.fs / probeLag;
    ro.set('自动', d.f0 > 0 ? `${fmt(d.f0, 1)} Hz` : '没找到');
    ro.set('手动', `${fmt(manual, 1)} Hz（滞后 ${fmt(probeLag, 1)} 点）`);
    ro.set('清晰度', fmt(d.clarity, 3) + (d.clarity < 0.3 ? '（太低，不可信）' : ''));
    const nt = noteOf(d.f0);
    ro.set('音名', nt.name === '—' ? '—' : `${nt.name} ${nt.cents >= 0 ? '+' : ''}${nt.cents} 音分`);
    ro.set('搜索范围', `${fmt(s.fmin, 0)} – ${fmt(s.fmax, 0)} Hz`);
  }

  /* ---------- 拖拽 ---------- */

  bindPointer(cv.canvas, {
    pick(X, Y) {
      if (Y >= R2.y - 10 && Y <= R2.y + R2.h + 12) return 'probe';
      if (!mic && Y >= R3.y && Y <= R3.y + R3.h) return 'frame';
      return null;
    },
    move(id, X) {
      if (id === 'probe') {
        const maxLagShow = Math.min(cur.r.length - 1, Math.floor(s.fs / s.fmin));
        probeLag = clamp(((X - PADL) / plotW()) * maxLagShow, 1, maxLagShow);
        draw();
      } else if (id === 'frame') {
        idx = Math.round(clamp((X - PADL) / plotW(), 0, 1) * (nFrames - 1));
        syncSlider(0, idx);
        recompute();
        draw();
      }
    },
  });

  /* ---------- 滑块 ---------- */

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'frame', label: '帧号', min: 0, max: 100, step: 1, value: 0 },
        { name: 'fmin', label: '最低基频', min: 50, max: 200, step: 1, value: s.fmin },
        { name: 'fmax', label: '最高基频', min: 200, max: 800, step: 5, value: s.fmax },
      ],
    },
    (st) => {
      idx = Math.round(st.frame);
      s.fmin = Math.round(st.fmin);
      s.fmax = Math.round(st.fmax);
      if (s.fmax <= s.fmin + 20) s.fmax = s.fmin + 20;
      retrack();
      recompute();
      if (!mic && cur && cur.det.lag > 0) probeLag = cur.det.lag;
      draw();
    },
  );

  function syncSlider(i, v) {
    const row = sliders.box.children[i];
    if (!row) return;
    const r = row.querySelector('input[type="range"]');
    const t = row.querySelector('.ml-slider__val');
    if (r) r.value = String(v);
    if (t) t.textContent = String(v);
    sliders.state[['frame', 'fmin', 'fmax'][i]] = v;
  }

  draw();
  cv.redraw = draw;

  engine('dsp').then((m) => {
    dsp = m;
    rebuild();
    recompute();
    const row = sliders.box.children[0];
    if (row) {
      const r = row.querySelector('input[type="range"]');
      if (r) r.max = String(Math.max(1, nFrames - 1));
      sliders.state.frame = idx;
    }
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

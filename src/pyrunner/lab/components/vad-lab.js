/* =========================================================================
 * lab 组件：vad-lab（清浊音与端点检测：用两把尺子把语音从静音里切出来）
 * -------------------------------------------------------------------------
 * 演示什么：端点检测（VAD）最朴素的两把尺子——短时能量与短时过零率。
 *   浊音（元音）能量高、过零率低；清音（摩擦音 /s/ 之类）能量不低、
 *   过零率高；静音两头都低。逐帧算出两条曲线，拖两个阈值线，
 *   上方波形背景里的判定着色（绿=浊音、琥珀=清音、无色=静音）跟着变，
 *   端点（语音段的起止）就是判定翻转的位置。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "vad-lab",
 *     "title": "拖两条阈值线，把语音段从静音里切出来"
 *   }
 *   ```
 *
 * 字段（全部可省，省了用默认值）：
 *   thrE     能量阈值（dB，10·log₁₀ 帧均方能量），-60 ~ -10，默认 -30
 *   thrZ     过零率阈值（每样点过零次数），0.02 ~ 0.58，默认 0.25
 *   frameMs  帧长（毫秒），10 ~ 40，默认 25（帧移固定 5 ms）
 *
 * 三行图：
 *   上：波形。背景按逐帧判定着色（绿=浊音 / 琥珀=清音 / 无色=静音）
 *   中：短时能量曲线（dB）+ 红色阈值线（可拖）
 *   下：过零率曲线 + 紫色阈值线（可拖）
 *
 * 能玩什么：
 *   - 上下拖中图的红色阈值线 → 改能量门槛，看端点怎么动
 *   - 上下拖下图的紫色阈值线 → 改过零率门槛，看清音段怎么被切出来
 *   - 鼠标在图上悬停 → 读数报该帧的三项指标与判定
 *   - 点「▶ 播放」听内置示例（静音—浊音—静音—清音—静音），播放头同步扫过
 *   - 点「🎤 用麦克风」实时检测自己说话的端点（只分析不回放）
 *
 * 出声：内置示例可播放——点「▶ 播放」才创建 AudioContext（手势内解锁），
 *   「■ 停止」随时停，滚出视口自动停，增益 0.2。麦克风模式只采集分析，不发声。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildToolbar, mkBtn, el, rafLoop, audioShell, audio,
  polyline, label, clamp, fmt,
} from '../core.js';
import { shortTimeEnergy, zeroCrossRate, frame, biquad, resample } from '../engines/dsp.js';

const FS = 16000;          /* 内置信号与帧分析统一用 16 kHz */
const SIG_SEC = 1.6;       /* 内置示例长度 */
const HOP = 80;            /* 帧移 5 ms */
const E_MIN = -70;         /* 能量轴下限 dB */
const Z_MAX = 0.6;         /* 过零率轴上限 */

/* 内置示例：静音 → 浊音 a（140 Hz 谐波串）→ 短静音 → 清音 s（高通白噪）→ 静音 */
function makeUtterance() {
  const N = Math.round(SIG_SEC * FS);
  const out = new Float64Array(N);
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x3fffffff - 1;
  };
  const hp = biquad('highpass', 3800, 0.8, 0, FS);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  const ph = new Float64Array(25);
  for (let i = 0; i < N; i += 1) {
    const t = i / FS;
    let v = rnd() * 0.004; /* 录音底噪 */
    if (t >= 0.30 && t < 0.68) {
      /* 浊音：谐波串 1/n²，f0 = 140 Hz 带轻微颤音，两端斜坡 */
      const env = Math.min(1, (t - 0.30) / 0.05, (0.68 - t) / 0.06);
      const f0 = 140 * (1 + 0.02 * Math.sin(2 * Math.PI * 5 * t));
      let vv = 0;
      for (let n = 1; n <= 24; n += 1) {
        ph[n] += (2 * Math.PI * n * f0) / FS;
        vv += (1 / (n * n)) * Math.sin(ph[n]);
      }
      v += vv * 0.6 * env;
    } else if (t >= 0.85 && t < 1.12) {
      /* 清音：白噪过高通（/s/ 的能量集中区） */
      const env = Math.min(1, (t - 0.85) / 0.04, (1.12 - t) / 0.05);
      const w = rnd();
      const y0 = hp.b0 * w + hp.b1 * x1 + hp.b2 * x2 - hp.a1 * y1 - hp.a2 * y2;
      x2 = x1; x1 = w; y2 = y1; y1 = y0;
      v += y0 * 0.5 * env;
    }
    out[i] = v;
  }
  return out;
}

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    thrE: clamp(spec.thrE ?? -30, -60, -10),
    thrZ: clamp(spec.thrZ ?? 0.25, 0.02, 0.58),
    frameMs: clamp(spec.frameMs ?? 25, 10, 40),
  };

  const sig = makeUtterance();
  let eDb = [];
  let zcr = [];
  let frameLen = Math.round((s.frameMs / 1000) * FS);
  let hoverFrame = -1;
  let playHead = -1;   /* 播放头位置（秒），-1 = 没在播 */

  let mic = null;
  let micLoop = null;
  let micBuf = null;
  let lastRead = 0;

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({
    '模式': '内置示例',
    '能量 dB': '—',
    '过零率': '—',
    '该帧判定': '—',
    '端点': '—',
  });
  host.appendChild(ro.box);

  const PADL = 46;
  const PADR = 14;
  const R1 = { y: 30, h: 74 };
  const R2 = { y: 142, h: 100 };
  const R3 = { y: 272, h: 92 };
  const plotW = () => Math.max(60, cv.W - PADL - PADR);

  /* ---------- 逐帧特征 ---------- */

  function recompute() {
    const src = micBuf || sig;
    frameLen = Math.max(80, Math.round((s.frameMs / 1000) * FS));
    const fr = frame(src, frameLen, HOP);
    eDb = [];
    zcr = [];
    fr.forEach((seg) => {
      const e = shortTimeEnergy(seg);
      eDb.push(e > 1e-12 ? 10 * Math.log10(e) : -100);
      zcr.push(zeroCrossRate(seg));
    });
  }

  const decide = (i) => (eDb[i] > s.thrE ? (zcr[i] < s.thrZ ? '浊音' : '清音') : '静音');
  const frameColor = (i) => (eDb[i] > s.thrE ? (zcr[i] < s.thrZ ? C.ok : C.named('amber')) : null);

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

    const nF = eDb.length;
    const src = micBuf || sig;
    const N = src.length;
    const xOfT = (tSec) => PADL + (tSec / (N / FS)) * w;
    const fX0 = (i) => PADL + ((i * HOP) / N) * w;
    const fW = Math.max(1, (frameLen / N) * w);

    label(ctx, '① 波形（背景色 = 逐帧判定：绿 浊音 / 琥珀 清音 / 无色 静音）', PADL, 18, C.fg, { size: 11 });
    label(ctx, '② 短时能量（dB）· 拖红色阈值线', PADL, 130, C.fg, { size: 11 });
    label(ctx, '③ 短时过零率 · 拖紫色阈值线', PADL, 260, C.fg, { size: 11 });

    if (!nF) return;

    /* --- ① 波形 + 判定着色 --- */
    {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(PADL, R1.y + R1.h / 2);
      ctx.lineTo(PADL + w, R1.y + R1.h / 2);
      ctx.stroke();

      /* 先铺判定背景 */
      for (let i = 0; i < nF; i += 1) {
        const col = frameColor(i);
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.22;
        ctx.fillRect(fX0(i), R1.y, fW + 0.5, R1.h);
        ctx.globalAlpha = 1;
      }

      /* 包络带（逐像素取 min/max） */
      const step = N / w;
      ctx.fillStyle = C.accent;
      for (let px = 0; px < w; px += 1) {
        const a = Math.floor(px * step);
        const b = Math.min(N, Math.max(a + 1, Math.floor((px + 1) * step)));
        let mn = 1e9;
        let mx = -1e9;
        for (let i = a; i < b; i += 1) {
          if (src[i] < mn) mn = src[i];
          if (src[i] > mx) mx = src[i];
        }
        const yHi = R1.y + R1.h / 2 - mx * (R1.h / 2) * 0.92;
        const yLo = R1.y + R1.h / 2 - mn * (R1.h / 2) * 0.92;
        ctx.fillRect(PADL + px, yHi, 1, Math.max(1, yLo - yHi));
      }

      /* 时间刻度 */
      for (let t = 0; t <= N / FS + 1e-9; t += 0.2) {
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(xOfT(t), R1.y + R1.h);
        ctx.lineTo(xOfT(t), R1.y + R1.h + 3);
        ctx.stroke();
        if (Math.abs(t * 5 - Math.round(t * 5)) < 1e-9) {
          label(ctx, fmt(t, 1) + 's', xOfT(t), R1.y + R1.h + 13, C.fg, { align: 'center', size: 8 });
        }
      }
    }

    /* --- ② 能量 --- */
    const yE = (db) => R2.y + R2.h - ((clamp(db, E_MIN, 0) - E_MIN) / -E_MIN) * R2.h;
    {
      [-60, -40, -20, 0].forEach((db) => {
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(PADL, yE(db));
        ctx.lineTo(PADL + w, yE(db));
        ctx.stroke();
        label(ctx, String(db), PADL - 5, yE(db) + 4, C.fg, { align: 'right', size: 9 });
      });
      const pts = [];
      for (let i = 0; i < nF; i += 1) pts.push([fX0(i) + fW / 2, yE(eDb[i])]);
      polyline(ctx, pts, C.accent, 1.6);
      /* 阈值线（可拖） */
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(PADL, yE(s.thrE));
      ctx.lineTo(PADL + w, yE(s.thrE));
      ctx.stroke();
      ctx.restore();
      label(ctx, '能量阈值 ' + fmt(s.thrE, 0) + ' dB ⇕', PADL + w - 4, yE(s.thrE) - 5, C.bad, { align: 'right', size: 10, weight: 600 });
    }

    /* --- ③ 过零率 --- */
    const yZ = (z) => R3.y + R3.h - (clamp(z, 0, Z_MAX) / Z_MAX) * R3.h;
    {
      [0, 0.2, 0.4, 0.6].forEach((z) => {
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(PADL, yZ(z));
        ctx.lineTo(PADL + w, yZ(z));
        ctx.stroke();
        label(ctx, fmt(z, 1), PADL - 5, yZ(z) + 4, C.fg, { align: 'right', size: 9 });
      });
      const pts = [];
      for (let i = 0; i < nF; i += 1) pts.push([fX0(i) + fW / 2, yZ(zcr[i])]);
      polyline(ctx, pts, C.named('purple'), 1.6);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(PADL, yZ(s.thrZ));
      ctx.lineTo(PADL + w, yZ(s.thrZ));
      ctx.stroke();
      ctx.restore();
      label(ctx, '过零率阈值 ' + fmt(s.thrZ, 2) + ' ⇕', PADL + w - 4, yZ(s.thrZ) - 5, C.named('purple'), { align: 'right', size: 10, weight: 600 });
    }

    /* 悬停 / 播放头指示 */
    const hi = hoverFrame >= 0 ? hoverFrame
      : playHead >= 0 ? Math.floor((playHead * FS) / HOP) : -1;
    if (hi >= 0 && hi < nF) {
      const hx = fX0(hi) + fW / 2;
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx, R1.y);
      ctx.lineTo(hx, R3.y + R3.h);
      ctx.stroke();
    }

    /* 端点读数：判定翻转的位置 */
    const on = [];
    for (let i = 0; i < nF; i += 1) {
      if (decide(i) !== '静音') on.push(i);
    }
    let endText = '没切到语音段';
    if (on.length) {
      const segs = [];
      let st = on[0];
      let prev = on[0];
      for (let k = 1; k < on.length; k += 1) {
        if (on[k] !== prev + 1) { segs.push([st, prev]); st = on[k]; }
        prev = on[k];
      }
      segs.push([st, prev]);
      endText = segs.map((sg) => fmt((sg[0] * HOP) / FS, 2) + '–' + fmt(((sg[1] + 1) * HOP) / FS, 2) + 's').join('　');
    }
    ro.set('端点', endText);

    /* 当前帧读数 */
    const qi = hi >= 0 && hi < nF ? hi : Math.floor(nF / 2);
    ro.set('能量 dB', fmt(eDb[qi], 1) + (eDb[qi] > s.thrE ? '（过线）' : '（未过线）'));
    ro.set('过零率', fmt(zcr[qi], 3) + (zcr[qi] < s.thrZ ? '（低，像浊音）' : '（高，像清音/噪声）'));
    ro.set('该帧判定', decide(qi) + '（t=' + fmt((qi * HOP) / FS, 2) + 's）');
  }

  /* ---------- 拖阈值 ---------- */

  function setThrE(py) {
    s.thrE = clamp(E_MIN + (1 - (py - R2.y) / R2.h) * -E_MIN, -60, -10);
    syncSliders();
    draw();
  }
  function setThrZ(py) {
    s.thrZ = clamp((1 - (py - R3.y) / R3.h) * Z_MAX, 0.02, 0.58);
    syncSliders();
    draw();
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      if (py >= R2.y - 8 && py <= R2.y + R2.h + 8) return 'thrE';
      if (py >= R3.y - 8 && py <= R3.y + R3.h + 8) return 'thrZ';
      if (py >= R1.y && py <= R1.y + R1.h) return 'hover';
      return null;
    },
    down(id, px, py) {
      if (id === 'thrE') setThrE(py);
      else if (id === 'thrZ') setThrZ(py);
      else if (id === 'hover') hoverFrame = frameAt(px);
    },
    move(id, px, py) {
      if (id === 'thrE') setThrE(py);
      else if (id === 'thrZ') setThrZ(py);
      else if (id === 'hover') hoverFrame = frameAt(px);
    },
    up() { hoverFrame = -1; draw(); },
    leave() { hoverFrame = -1; draw(); },
  });

  function frameAt(px) {
    const nF = eDb.length;
    if (!nF) return -1;
    return clamp(Math.floor(((px - PADL) / plotW()) * ((micBuf || sig).length / HOP)), 0, nF - 1);
  }

  /* ---------- 麦克风（实时模式，只分析不回放） ---------- */

  const micBtn = mkBtn('🎤 用麦克风');
  const hint = el('span', 'ml-lab__hint', '');
  micBtn.addEventListener('click', () => {
    if (mic) stopMic();
    else startMic();
  });
  host.appendChild(buildToolbar(micBtn, hint));

  function setHint(t) { hint.textContent = t; }

  async function startMic() {
    if (!audio.available) { setHint('此浏览器不支持 Web Audio'); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHint('此浏览器不给麦克风权限（需要 HTTPS 页面或 localhost）');
      return;
    }
    shell.stop();
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
      micBuf = new Float64Array(Math.round(SIG_SEC * FS));
      micBtn.textContent = '■ 停止麦克风';
      ro.set('模式', '麦克风实时（最近 ' + fmt(SIG_SEC, 1) + ' s，只分析不回放）');
      setHint('实时检测中：对着麦克风说话，看端点怎么切');
      lastRead = 0;
      micLoop = rafLoop(host, micTick);
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
      stopMic();
    }
  }

  function stopMic() {
    if (micLoop) { micLoop.stop(); micLoop = null; }
    if (mic) {
      try { mic.stream.getTracks().forEach((t) => t.stop()); } catch (e) { void e; }
      try { mic.eng.close(); } catch (e) { void e; }
      mic = null;
    }
    micBuf = null;
    micBtn.textContent = '🎤 用麦克风';
    ro.set('模式', '内置示例');
    setHint('');
    recompute();
    draw();
  }

  function micTick() {
    if (!mic) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - lastRead < 50) return;
    lastRead = now;
    const raw = mic.an.waveform();
    const piece = resample(raw, mic.sr, FS);
    const need = micBuf.length;
    const outBuf = new Float64Array(need);
    const keep = need - piece.length;
    if (keep > 0) outBuf.set(micBuf.subarray(micBuf.length - keep));
    outBuf.set(piece, keep);
    micBuf = outBuf;
    recompute();
    draw();
  }

  /* ---------- 内置示例播放（出声外壳：解锁 / 停止 / 离屏自动停） ---------- */

  let srcNode = null;
  let playGain = null;
  let playLoop = null;

  const shell = audioShell(host, (eng, api) => {
    if (mic) stopMic();
    const buf = eng.ctx.createBuffer(1, sig.length, FS);
    buf.getChannelData(0).set(sig);
    srcNode = eng.ctx.createBufferSource();
    srcNode.buffer = buf;
    playGain = eng.ctx.createGain();
    playGain.gain.value = 0.2 * s.level;
    srcNode.connect(playGain);
    playGain.connect(eng.master);
    srcNode.start();
    const t0 = eng.ctx.currentTime;
    api.hint.textContent = '播放示例（增益 0.2）：静音 → 浊音 → 静音 → 清音 → 静音';
    playLoop = rafLoop(host, () => {
      playHead = eng.ctx.currentTime - t0;
      if (playHead >= SIG_SEC) { shell.stop(); return; }
      draw();
    });
    return () => {
      if (playLoop) { playLoop.stop(); playLoop = null; }
      if (srcNode) {
        try { srcNode.stop(); } catch (e) { void e; }
        try { srcNode.disconnect(); } catch (e) { void e; }
        srcNode = null;
      }
      if (playGain) { try { playGain.disconnect(); } catch (e) { void e; } playGain = null; }
      playHead = -1;
      draw();
    };
  });

  /* ---------- 滑块 ---------- */

  let sliderEls = null;
  function syncSliders() {
    if (!sliderEls) return;
    sliderEls.thrE.value = String(s.thrE);
    sliderEls.thrEVal.textContent = fmt(s.thrE, 0);
    sliderEls.thrZ.value = String(s.thrZ);
    sliderEls.thrZVal.textContent = fmt(s.thrZ, 2);
  }
  const sliders = buildSliders(
    {
      sliders: [
        { name: 'thrE', label: '能量阈值 (dB)', min: -60, max: -10, step: 1, value: s.thrE, fmt: 0 },
        { name: 'thrZ', label: '过零率阈值', min: 0.02, max: 0.58, step: 0.01, value: s.thrZ, fmt: 2 },
        { name: 'frameMs', label: '帧长 (ms)', min: 10, max: 40, step: 5, value: s.frameMs, fmt: 0 },
      ],
    },
    (st) => {
      s.thrE = st.thrE;
      s.thrZ = st.thrZ;
      s.frameMs = Math.round(st.frameMs);
      recompute();
      draw();
    },
  );
  const inputs = sliders.box.querySelectorAll('input');
  const vals = sliders.box.querySelectorAll('.ml-slider__val');
  sliderEls = { thrE: inputs[0], thrEVal: vals[0], thrZ: inputs[1], thrZVal: vals[1] };

  recompute();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() {
      shell.stop();
      stopMic();
    },
  };
}

/* =========================================================================
 * lab 组件：harmonic-builder（加法合成：自己搭出音色）
 * -------------------------------------------------------------------------
 * 演示什么：任何周期信号都能拆成一串正弦谐波——反过来，把各次谐波按你
 *   设的幅度 a₁…aₙ 加回去（傅里叶的逆过程），就「搭」出一个音色。
 *   上图是叠加出的时域波形，下图一排杆是各次谐波的幅度（杆可以上下拖），
 *   橙色曲线是对合成波形做 FFT 的实测谱——它应当正好落在杆顶上，
 *   这是「时域卷积＝频域相乘」之外另一条更直观的验证：设了什么幅度，
 *   频谱里就真的只有那些频率。同步发声，听音色怎么随谐波结构变化。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "harmonic-builder",
 *     "title": "拖动谐波幅度，搭一个方波出来"
 *   }
 *   ```
 *
 * 字段（全部可省，省了用默认值）：
 *   base   基频（Hz），60–880，默认 220
 *   nH     谐波个数，4–12，默认 8
 *   amps   各次谐波幅度数组（0–1），默认 1/n（锯齿波谱）
 *   level  音量倍率，默认 1（实际发声增益 = 0.2 × level）
 *
 * 能玩什么：
 *   - 上下拖频谱区的杆 → 改各次谐波幅度，波形与实测谱即时重算
 *   - 工具条预设：纯正弦 / 方波（奇次 1/n）/ 三角波（奇次 1/n²）/ 锯齿波 / 清零
 *   - 拖基频滑块改音高；音量滑块改响度
 *
 * 出声组件：点「▶ 播放」才创建 AudioContext（手势内解锁），「■ 停止」随时停，
 *   滚出视口自动停，默认增益 0.2。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildToolbar, mkBtn, audioShell, polyline, label, clamp, fmt,
  clearBg,
} from '../core.js';
import { rfft } from '../engines/dsp.js';

/* 两个基波周期采 4096 点 → FFT 的偶数号 bin 恰好是各次谐波 */
const NSAMP = 2048;

export default function render(host, spec) {
  const nH = Math.round(clamp(spec.nH ?? 8, 4, 12));
  const s = {
    base: clamp(spec.base ?? 220, 60, 880),
    level: clamp(spec.level ?? 1, 0, 1.5),
    amps: Array.isArray(spec.amps) && spec.amps.length
      ? spec.amps.slice(0, nH).map((v) => clamp(Number(v) || 0, 0, 1))
      : Array.from({ length: nH }, (_, k) => 1 / (k + 1)),
  };
  while (s.amps.length < nH) s.amps.push(0);

  let harm = null;   // 正在发声的谐波组句柄
  let fftMag = null; // 合成波形的实测谱（缓存，改幅度时才重算）

  const cv = setupCanvas(host, 360);
  const ro = buildReadout({
    '基频': '—',
    '峰值': '—',
    '幅度和 Σa': '—',
    '音色提示': '—',
  });
  host.appendChild(ro.box);

  const PAD_L = 46;
  const PAD_R = 14;
  const W_TOP = 30;
  const W_BOT = 166;
  const S_TOP = 216;
  const S_BOT = 328;

  const laneW = () => Math.max(60, cv.W - PAD_L - PAD_R);
  const cw = () => laneW() / nH;
  const barH = () => S_BOT - S_TOP - 8;
  /* 第 m 次谐波（m 从 1 起）的列中心；FFT 第 b 号 bin 对应 m = b/2 */
  const xOfM = (m) => PAD_L + (m - 0.5) * cw();

  /* 重算合成波形 + 实测谱（只在幅度/设置变化时调用，拖动一帧最多几千次求值） */
  function update() {
    const N = 2 * NSAMP;
    const sig = new Float64Array(N);
    for (let i = 0; i < N; i += 1) {
      const u = (i / N) * 2; /* 两个周期 */
      let v = 0;
      for (let k = 0; k < nH; k += 1) v += s.amps[k] * Math.sin(2 * Math.PI * (k + 1) * u);
      sig[i] = v;
    }
    fftMag = { sig, mag: rfft(sig).mag };
  }

  function syncSound() {
    if (!harm) return;
    harm.setAmps(s.amps);
    harm.setBase(s.base);
    harm.setGain(0.2 * s.level);
  }

  function timbre() {
    let odd = false;
    let even = false;
    for (let k = 0; k < nH; k += 1) {
      if (s.amps[k] > 0.02) {
        if ((k + 1) % 2 === 1) odd = true; else even = true;
      }
    }
    if (!odd && !even) return '全部拉零就是静音';
    if (!even) {
      const a3 = s.amps[2] || 0;
      const a1 = s.amps[0];
      if (!odd || a3 < 0.02) return '只有基波：纯正弦，笛声一样干净';
      if (a3 < a1 * 0.16) return '奇次且衰减快：三角波族，柔和的长笛感';
      return '只有奇次谐波：方波族，空洞但嘹亮（单簧管感）';
    }
    return '奇偶谐波都有：锯齿族，明亮饱满（铜管感）';
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const sumA = s.amps.reduce((a, b) => a + b, 0);
    const halfH = (W_BOT - W_TOP) / 2;
    const scale = (halfH * 0.85) / Math.max(sumA, 1);

    /* ---------- 上：叠加波形（两个周期） ---------- */
    const mid = (W_TOP + W_BOT) / 2;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, mid);
    ctx.lineTo(W - PAD_R, mid);
    ctx.stroke();
    const pts = [];
    for (let px = PAD_L; px <= W - PAD_R; px += 1) {
      const u = ((px - PAD_L) / laneW()) * 2;
      let v = 0;
      for (let k = 0; k < nH; k += 1) v += s.amps[k] * Math.sin(2 * Math.PI * (k + 1) * u);
      pts.push([px, mid - v * scale]);
    }
    polyline(ctx, pts, C.accent, 2);
    label(ctx, 'y(t) = a₁sin(2πft) + a₂sin(4πft) + …（画出两个周期）', PAD_L, W_TOP - 8, C.fg, { size: 10 });
    label(ctx, '↓ 拖下面的杆', W - PAD_R, W_TOP - 8, C.accent2, { align: 'right', size: 10 });

    /* ---------- 下：谐波杆（可拖）+ FFT 实测谱 ---------- */
    label(ctx, '各次谐波幅度（杆可上下拖） · 橙线 = 对上面波形做 FFT 的实测谱', PAD_L, S_TOP - 8, C.fg, { size: 10 });

    /* 谱基线与频率轴 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, S_BOT + 0.5);
    ctx.lineTo(W - PAD_R, S_BOT + 0.5);
    ctx.stroke();

    /* FFT 曲线（先画曲线再画杆，杆压在曲线上便于对照） */
    if (fftMag) {
      const cpts = [];
      const maxBin = Math.min(fftMag.mag.length - 1, 2 * nH);
      for (let b = 1; b <= maxBin; b += 1) {
        const x = xOfM(b / 2);
        if (x > W - PAD_R) break;
        const a = clamp(fftMag.mag[b] * 2, 0, 1);
        cpts.push([x, S_BOT - a * barH()]);
      }
      polyline(ctx, cpts, C.accent2, 1.6);
    }

    for (let k = 0; k < nH; k += 1) {
      const a = s.amps[k];
      const cx = xOfM(k + 1);
      const bwid = Math.max(6, cw() - 8);
      const h = a * barH();
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(cx - bwid / 2, S_BOT - h, bwid, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.axis;
      ctx.strokeRect(cx - bwid / 2, S_BOT - h, bwid, h);
      if (a > 0.03) {
        label(ctx, fmt(a, 2), cx, S_BOT - h - 4, C.fg, { align: 'center', size: 9 });
      }
      label(ctx, k === 0 ? 'f' : (k + 1) + 'f', cx, S_BOT + 14, C.fg, { align: 'center', size: 9 });
    }
    label(ctx, '频率是基频的几倍 →', W - PAD_R, S_BOT + 14, C.grid, { align: 'right', size: 9 });

    ro.set('基频', fmt(s.base, 0) + ' Hz（周期 ' + fmt(1000 / s.base, 2) + ' ms，泛音到 ' + fmt(s.base * nH, 0) + ' Hz）');
    let peak = 0;
    if (fftMag) for (let i = 0; i < fftMag.sig.length; i += 1) peak = Math.max(peak, Math.abs(fftMag.sig[i]));
    ro.set('峰值', fmt(peak, 3) + '（各谐波同相叠加，峰值最多可到 Σa）');
    ro.set('幅度和 Σa', fmt(sumA, 2));
    ro.set('音色提示', timbre());
  }

  /* ---------- 拖杆改幅度 ---------- */

  function setAmp(k, py) {
    s.amps[k] = clamp((S_BOT - py) / barH(), 0, 1);
    update();
    syncSound();
    draw();
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      if (py >= S_TOP - 10 && py <= S_BOT + 10) {
        const k = Math.floor((px - PAD_L) / cw());
        if (k >= 0 && k < nH && px >= PAD_L) return 'amp' + k;
      }
      return null;
    },
    down(id, px, py) { if (id && id.indexOf('amp') === 0) setAmp(Number(id.slice(3)), py); },
    move(id, px, py) { if (id && id.indexOf('amp') === 0) setAmp(Number(id.slice(3)), py); },
  });

  /* ---------- 预设 ---------- */

  const PRESETS = [
    { label: '纯正弦', amp: (m) => (m === 1 ? 1 : 0) },
    { label: '方波', amp: (m) => (m % 2 === 1 ? 1 / m : 0) },
    { label: '三角波', amp: (m) => (m % 2 === 1 ? 1 / (m * m) : 0) },
    { label: '锯齿波', amp: (m) => 1 / m },
    { label: '清零', amp: () => 0 },
  ];
  const presetBtns = PRESETS.map((p) => {
    const b = mkBtn(p.label);
    b.addEventListener('click', () => {
      for (let k = 0; k < nH; k += 1) s.amps[k] = clamp(p.amp(k + 1), 0, 1);
      update();
      syncSound();
      draw();
    });
    return b;
  });
  host.appendChild(buildToolbar(...presetBtns));

  /* ---------- 出声外壳（解锁 / 停止 / 离屏自动停都在壳里） ---------- */

  const shell = audioShell(host, (eng, api) => {
    harm = eng.harmonics({
      partials: Array.from({ length: nH }, (_, k) => k + 1),
      base: s.base,
      gain: 0.2 * s.level,
    });
    harm.setAmps(s.amps);
    api.hint.textContent = '合成音色播放中（增益 0.2）';
    return () => { harm = null; };
  });

  /* ---------- 滑块 ---------- */

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'base', label: '基频 (Hz)', min: 60, max: 880, step: 1, value: s.base, fmt: 0 },
        { name: 'level', label: '音量', min: 0, max: 1.5, step: 0.05, value: s.level, fmt: 2 },
      ],
    },
    (st) => {
      s.base = Math.round(st.base);
      s.level = st.level;
      syncSound();
      draw();
    },
  );

  update();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { shell.stop(); },
  };
}

/* =========================================================================
 * lab 组件：tone-sweep（频率、音高与八度）
 * -------------------------------------------------------------------------
 * 演示：沿对数频率轴拖动游标扫频，看音高怎么「爬楼梯」——频率每翻一倍，音高
 * 升一个八度（台阶等宽等高）；上方固定的 20 ms 波形窗里会挤进越来越多周期，
 * 周期 T = 1/f 越来越短。同步发声，音高跟着一块儿爬。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "tone-sweep",
 *     "title": "沿频率轴拖动，听音高怎么爬楼梯"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   freq   初始频率（Hz），默认 220
 *   base   八度台阶的基准音（Hz），默认 110（A2），台阶画在 base·2^k 上
 *   fMin   频率轴下限（Hz），默认 55（A1）
 *   fMax   频率轴上限（Hz），默认 7040（A7）
 *   wave   波形：sine（默认）/ triangle / square / sawtooth
 *   level  音量倍率，默认 0.8（实际发声增益 = 0.2 × level）
 *
 * 出声组件：点「▶ 播放」才创建 AudioContext（自动播放策略要求手势内解锁），
 * 「■ 停止」随时停，滚出视口自动停，默认增益 0.2。
 *
 * 能拖：下方对数频率轴（含台阶区）任意位置按下拖动 = 扫频。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  audioShell, polyline, label, clamp, fmt,
  setSliderRow,
  clearBg,
  noteOf,
} from '../core.js';

const SOUND_SPEED = 343; /* m/s，约 20 ℃ 的空气 */
const WINDOW_S = 0.02;   /* 波形窗固定 20 ms */

/* 频率 → 音名 + 音分偏差（A4 = 440 Hz = MIDI 69） */

function hzText(f) {
  return f >= 1000 ? fmt(f / 1000, 2) + 'k' : fmt(f, 0);
}

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    freq: spec.freq ?? 220,
    base: spec.base ?? 110,
    fMin: spec.fMin ?? 55,
    fMax: spec.fMax ?? 7040,
    wave: spec.wave || 'sine',
    level: spec.level ?? 0.8,
  };
  let tone = null;

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ 频率: '—', 音名: '—', 与基准相距: '—', 空气中的波长: '—' });
  host.appendChild(ro.box);

  const PAD_L = 42;
  const PAD_R = 16;
  const W_TOP = 30;
  const W_BOT = 150;
  const STEP_TOP = 180;
  const AXIS_Y = 278;

  const laneW = () => cv.W - PAD_L - PAD_R;
  const logSpan = () => Math.log(s.fMax / s.fMin);
  const xOf = (f) => PAD_L + (Math.log(clamp(f, s.fMin, s.fMax) / s.fMin) / logSpan()) * laneW();
  const fOf = (x) => s.fMin * Math.exp(clamp((x - PAD_L) / laneW(), 0, 1) * logSpan());
  const octOf = (f) => Math.log2(f / s.base);

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    /* ---------- 上：固定 20 ms 波形窗 ---------- */
    const mid = (W_TOP + W_BOT) / 2;
    const amp = (W_BOT - W_TOP) / 2 - 20;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, mid);
    ctx.lineTo(W - PAD_R, mid);
    ctx.stroke();
    const pts = [];
    for (let x = PAD_L; x <= W - PAD_R; x += 1) {
      const t = ((x - PAD_L) / laneW()) * WINDOW_S;
      pts.push([x, mid - Math.sin(2 * Math.PI * s.freq * t) * amp]);
    }
    polyline(ctx, pts, C.accent, 2);
    label(ctx, '波形窗固定 20 ms：频率越高，窗里的周期越多、越挤',
      PAD_L, W_TOP - 8, C.fg, { size: 10 });
    label(ctx, '↕ 拖下面扫频', W - PAD_R, W_TOP - 8, C.accent2, { align: 'right', size: 10 });

    /* 周期标尺：T = 1/f，随频率变短 */
    const T = 1 / s.freq;
    const ty = W_BOT + 16;
    const tw = Math.min((T / WINDOW_S) * laneW(), laneW());
    ctx.strokeStyle = C.named('teal');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(PAD_L, ty - 5);
    ctx.lineTo(PAD_L, ty + 5);
    ctx.moveTo(PAD_L, ty);
    ctx.lineTo(PAD_L + tw, ty);
    ctx.moveTo(PAD_L + tw, ty - 5);
    ctx.lineTo(PAD_L + tw, ty + 5);
    ctx.stroke();
    label(ctx, '一个周期 T = 1/f = ' + fmt(T * 1000, 2) + ' ms',
      PAD_L + tw + 6, ty + 4, C.named('teal'), { size: 10 });

    /* ---------- 下：对数频率轴 + 八度台阶 ---------- */
    const octMin = Math.floor(octOf(s.fMin));
    const octMax = Math.ceil(octOf(s.fMax));
    const nOct = Math.max(1, octMax - octMin);
    const stepH = (AXIS_Y - STEP_TOP - 26) / nOct;
    const yOfOct = (o) => AXIS_Y - 16 - (o - octMin) * stepH;

    /* 连续音高线（每爬一格 = 一个八度） */
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = PAD_L; x <= W - PAD_R; x += 4) {
      const y = yOfOct(octOf(fOf(x)));
      if (x === PAD_L) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    /* 八度台阶（音名每一格跳一级） */
    const stair = [];
    for (let x = PAD_L; x <= W - PAD_R; x += 1) {
      stair.push([x, yOfOct(Math.floor(octOf(fOf(x))))]);
    }
    polyline(ctx, stair, C.named('purple'), 2.2);

    /* 八度竖直分隔线 + 台阶上的音名 */
    for (let k = octMin; k <= octMax; k += 1) {
      const f = s.base * 2 ** k;
      if (f < s.fMin || f > s.fMax) continue;
      const x = xOf(f);
      ctx.strokeStyle = C.grid;
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, STEP_TOP);
      ctx.lineTo(x, AXIS_Y);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, noteOf(f).name, x + 4, yOfOct(k) - 5, C.named('purple'), { size: 10 });
      label(ctx, hzText(f), x, AXIS_Y + 15, C.fg, { align: 'center', size: 9 });
    }

    /* 频率轴 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, AXIS_Y + 0.5);
    ctx.lineTo(W - PAD_R, AXIS_Y + 0.5);
    ctx.stroke();
    [100, 1000, 10000].forEach((f) => {
      if (f < s.fMin || f > s.fMax) return;
      const x = xOf(f);
      ctx.beginPath();
      ctx.moveTo(x, AXIS_Y);
      ctx.lineTo(x, AXIS_Y + 5);
      ctx.stroke();
      label(ctx, hzText(f), x, AXIS_Y + 30, C.fg, { align: 'center', size: 9 });
    });
    label(ctx, '频率（对数轴，等距离 = 等倍数）', W - PAD_R, AXIS_Y + 30, C.fg,
      { align: 'right', size: 9 });

    /* 当前游标：球踩在连续音高线上，竖线落到频率轴 */
    const cx = xOf(s.freq);
    const cy = yOfOct(octOf(s.freq));
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, STEP_TOP - 12);
    ctx.lineTo(cx, AXIS_Y + 5);
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    const nfo = noteOf(s.freq);
    const oct = octOf(s.freq);
    label(ctx, fmt(s.freq, 1) + ' Hz', cx, STEP_TOP - 16, C.accent,
      { align: 'center', size: 11, weight: 600 });
    label(ctx, '×2 = 一个八度', PAD_L, STEP_TOP - 4, C.named('purple'), { size: 9 });

    /* 读数 */
    ro.set('频率', fmt(s.freq, 1) + ' Hz　（周期 ' + fmt(T * 1000, 3) + ' ms）');
    ro.set('音名', nfo.name + (nfo.cents === 0 ? '（准）' : '　' + (nfo.cents > 0 ? '+' : '')
      + nfo.cents + ' 音分'));
    ro.set('与基准相距', fmt(oct, 2) + ' 个八度　（' + noteOf(s.base).name + ' = '
      + fmt(s.base, 0) + ' Hz，频率是它的 ' + fmt(2 ** oct, 2) + ' 倍）');
    ro.set('空气中的波长', 'λ = c/f = ' + fmt((SOUND_SPEED / s.freq) * 100, 1) + ' cm'
      + '　（' + fmt(SOUND_SPEED / s.freq, 3) + ' m）');
  }

  const shell = audioShell(host, (eng, api) => {
    tone = eng.tone({ type: s.wave, freq: s.freq, gain: 0.2 * s.level });
    api.hint.textContent = '同步发声中（增益 0.2）';
    return () => {
      tone = null;
    };
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'freq', label: '频率', min: s.fMin, max: s.fMax, step: 1, value: s.freq, fmt: 0 },
        { name: 'level', label: '音量', min: 0, max: 1.5, step: 0.05, value: s.level, fmt: 2 },
      ],
    },
    (st) => {
      s.freq = st.freq;
      s.level = st.level;
      if (tone) {
        tone.setFreq(s.freq);
        tone.setGain(0.2 * s.level);
      }
      draw();
    },
  );

  function setFreq(f) {
    s.freq = clamp(f, s.fMin, s.fMax);
    if (tone) tone.setFreq(s.freq);
    setSliderRow(sliders, 0, Math.round(s.freq), 0, 'freq');
    draw();
  }

  bindPointer(cv.canvas, {
    pick: (x, y) => (y >= STEP_TOP - 30 ? 'f' : null),
    down: (id, x) => setFreq(fOf(x)),
    move: (id, x) => setFreq(fOf(x)),
  });

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      shell.stop();
    },
  };
}

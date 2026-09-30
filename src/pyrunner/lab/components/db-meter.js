/* =========================================================================
 * lab 组件：db-meter（振幅、声压级与分贝）
 * -------------------------------------------------------------------------
 * 演示：线性振幅 a 与分贝 20·lg a 的对照。三条带子从上到下——
 *   ① 线性振幅条：参考点 1 / 0.5 / 0.1 / 0.01 全挤在左边一小段；
 *   ② 分贝标尺：同样的参考点变成 0 / −6 / −20 / −40 dB，分布均匀；
 *   ③ 映射曲线：dB = 20 lg a，把「乘法」压成「加法」。
 * 分贝不是新物理量，只是把「翻一倍」说成「+6 dB」的一把对数尺子。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "db-meter",
 *     "title": "把振幅拖一遍，看分贝为什么是对数尺子"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   amp   初始振幅 a（0–1），默认 0.5（= −6 dB）
 *   freq  试听音频率（Hz），默认 440
 *   refs  参考点数组（振幅），默认 [1, 0.5, 0.1, 0.01]
 *
 * 出声组件：点「▶ 播放」才创建 AudioContext，「■ 停止」随时停，滚出视口自动停。
 * 发声增益就等于振幅 a 本身（所以「实测峰值」与上面换算的 dB 严格相等），
 * 再经 master 0.25 出声，a = 1 时约 −12 dBFS，不会震耳朵。
 *
 * 能拖：三条带子都能横向拖——在①里拖，手感挤在左边；在②里拖，手感均匀。
 * 另有 ×2 / ÷2 / ×10 / ÷10 四个快捷键，听「乘 2 永远是 +6 dB」。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, buildToolbar,
  audioShell, rafLoop, mkBtn, polyline, label, clamp, fmt,
  setSliderRow,
  clearBg,
} from '../core.js';
import { ampToDb, dbToAmp } from '../engines/dsp.js';

const REFS = [1, 0.5, 0.1, 0.01];   /* 对应 0 / −6 / −20 / −40 dB */
const DB_MIN = -60;
const DB_TICKS = [0, -6, -20, -40, -60];

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    amp: clamp(spec.amp ?? 0.5, 0.001, 1),
    freq: spec.freq ?? 440,
  };
  const refs = (Array.isArray(spec.refs) && spec.refs.length ? spec.refs : REFS).slice();
  let tone = null;
  let analyser = null;
  let loop = null;
  let measured = null;

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ 振幅: '—', 电平: '—', 倍率关系: '—', 实测峰值: '—' });
  host.appendChild(ro.box);

  const PAD_L = 66;
  const PAD_R = 22;
  const B1 = { top: 46, h: 28 };
  const B2 = { top: 122, h: 28 };
  const B3 = { top: 196, bot: 292 };

  const bx = () => PAD_L;
  const bw = () => cv.W - PAD_L - PAD_R;
  const xOfDb = (db) => bx() + ((clamp(db, DB_MIN, 0) - DB_MIN) / -DB_MIN) * bw();
  const yOfDb = (db) => B3.bot - ((clamp(db, DB_MIN, 0) - DB_MIN) / -DB_MIN) * (B3.bot - B3.top);
  const aOfX = (x) => clamp((x - bx()) / bw(), 0.001, 1);
  const dbOfX = (x) => DB_MIN + clamp((x - bx()) / bw(), 0, 1) * -DB_MIN;

  /* 画虚线刻度（振幅条与分贝条共用） */
  function tickLine(ctx, x, top, bot) {
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bot);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    const L = bx();
    const Bw = bw();
    const db = ampToDb(s.amp);

    /* ---------- ① 线性振幅条 ---------- */
    label(ctx, '振幅 a（线性）', L - 8, B1.top + 19, C.fg, { align: 'right', size: 11 });
    ctx.fillStyle = C.soft;
    ctx.fillRect(L, B1.top, Bw, B1.h);
    ctx.fillStyle = C.accent;
    ctx.fillRect(L, B1.top, Bw * s.amp, B1.h);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(L + 0.5, B1.top + 0.5, Bw - 1, B1.h - 1);
    refs.forEach((v) => {
      const x = L + v * Bw;
      tickLine(ctx, x, B1.top, B1.top + B1.h + 8);
      label(ctx, fmt(v, v < 0.05 ? 2 : 1), x, B1.top + B1.h + 20, C.fg,
        { align: 'center', size: 9 });
    });
    const kx = L + s.amp * Bw;
    ctx.fillStyle = C.accent2;
    ctx.fillRect(kx - 2, B1.top - 5, 4, B1.h + 10);
    label(ctx, 'a = ' + fmt(s.amp, 3), kx, B1.top - 9, C.accent2,
      { align: kx > L + Bw - 70 ? 'right' : 'center', size: 10 });
    label(ctx, '0.5 在正中，0.1 和 0.01 全挤在最左边——线性尺对小数不友好',
      L, B1.top + B1.h + 32, C.fg, { size: 9 });

    /* ---------- ② 分贝标尺 ---------- */
    label(ctx, '电平（dB）', L - 8, B2.top + 19, C.fg, { align: 'right', size: 11 });
    ctx.fillStyle = C.soft;
    ctx.fillRect(L, B2.top, Bw, B2.h);
    ctx.fillStyle = C.named('teal');
    ctx.fillRect(L, B2.top, xOfDb(db) - L, B2.h);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(L + 0.5, B2.top + 0.5, Bw - 1, B2.h - 1);
    DB_TICKS.forEach((v) => {
      const x = xOfDb(v);
      tickLine(ctx, x, B2.top, B2.top + B2.h + 8);
      label(ctx, v === 0 ? '0 dB（a=1）' : String(v), x, B2.top + B2.h + 20, C.fg,
        { align: 'center', size: 9 });
    });
    const dx = xOfDb(db);
    ctx.fillStyle = C.accent2;
    ctx.fillRect(dx - 2, B2.top - 5, 4, B2.h + 10);
    label(ctx, fmt(db, 1) + ' dB', dx, B2.top - 9, C.accent2,
      { align: dx > L + Bw - 70 ? 'right' : 'center', size: 10 });
    label(ctx, '同一批参考点，换成分贝就均匀了', L + Bw, B2.top + B2.h + 32, C.fg,
      { align: 'right', size: 9 });

    /* ---------- ③ 映射曲线 ---------- */
    DB_TICKS.forEach((v) => {
      const y = yOfDb(v);
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(L, y);
      ctx.lineTo(L + Bw, y);
      ctx.stroke();
      label(ctx, String(v), L - 6, y + 3, C.fg, { align: 'right', size: 9 });
    });
    refs.forEach((v) => {
      tickLine(ctx, L + v * Bw, B3.top, B3.bot);
    });
    const pts = [];
    for (let i = 0; i <= 240; i += 1) {
      const a = 10 ** (-3 + (3 * i) / 240);
      pts.push([L + a * Bw, yOfDb(ampToDb(a))]);
    }
    polyline(ctx, pts, C.named('orange'), 2.2);
    refs.forEach((v) => {
      const x = L + v * Bw;
      const y = yOfDb(ampToDb(v));
      ctx.fillStyle = C.bg;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.named('orange');
      ctx.lineWidth = 1.6;
      ctx.stroke();
      label(ctx, fmt(ampToDb(v), 0) + ' dB', x, y - 8, C.named('orange'),
        { align: 'center', size: 9 });
    });
    const px = L + s.amp * Bw;
    const py = yOfDb(db);
    ctx.save();
    ctx.strokeStyle = C.accent2;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(L, py);
    ctx.lineTo(px, py);
    ctx.moveTo(px, py);
    ctx.lineTo(px, B3.bot);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'dB = 20 lg a', L, B3.top - 8, C.named('orange'), { size: 11 });
    label(ctx, '横轴：振幅 a（线性 0 → 1）', L + Bw / 2, B3.bot + 16, C.fg,
      { align: 'center', size: 10 });
    label(ctx, '三条带子都能横向拖', L + Bw, B3.top - 8, C.fg, { align: 'right', size: 9 });

    /* ---------- 读数 ---------- */
    ro.set('振幅', 'a = ' + fmt(s.amp, 4) + '　（' + fmt(s.amp * 100, 2) + '% 满刻度）');
    ro.set('电平', fmt(db, 2) + ' dB' + (s.amp >= 0.999 ? '　← 0 dB 就是 a = 1，不是没声音' : ''));
    ro.set('倍率关系', '×2 → +6.02 dB　÷2 → −6.02 dB　×10 → +20 dB　÷10 → −20 dB');
    ro.set('实测峰值', measured === null ? '—（点 ▶ 播放后实测）' : fmt(measured, 2) + ' dBFS');
  }

  const shell = audioShell(host, (eng, api) => {
    tone = eng.tone({ type: 'sine', freq: s.freq, gain: s.amp });
    analyser = eng.analyser({ fftSize: 2048, input: tone.gain });
    api.hint.textContent = '实测峰值 = 上面换算的 dB（发声增益就是 a 本身）';
    loop = rafLoop(host, () => {
      const w = analyser.waveform();
      let p = 0;
      for (let i = 0; i < w.length; i += 1) {
        const v = Math.abs(w[i]);
        if (v > p) p = v;
      }
      measured = ampToDb(p);
      draw();
    });
    return () => {
      if (loop) loop.stop();
      loop = null;
      measured = null;
      analyser = null;
      tone = null;
      draw();
    };
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'amp', label: '振幅 a', min: 0.001, max: 1, step: 0.001, value: s.amp, fmt: 3 },
        { name: 'freq', label: '试听频率', min: 110, max: 880, step: 1, value: s.freq, fmt: 0 },
      ],
    },
    (st) => {
      s.amp = st.amp;
      s.freq = st.freq;
      if (tone) {
        tone.setGain(s.amp);
        tone.setFreq(s.freq);
      }
      draw();
    },
  );

  function setAmp(a) {
    s.amp = clamp(a, 0.001, 1);
    if (tone) tone.setGain(s.amp);
    setSliderRow(sliders, 0, Math.round(s.amp * 1000) / 1000, 3, 'amp');
    draw();
  }

  const mk = (text, fn) => {
    const b = mkBtn(text);
    b.addEventListener('click', fn);
    return b;
  };
  host.appendChild(buildToolbar(
    mk('×2（+6 dB）', () => setAmp(s.amp * 2)),
    mk('÷2（−6 dB）', () => setAmp(s.amp / 2)),
    mk('×10（+20 dB）', () => setAmp(s.amp * 10)),
    mk('÷10（−20 dB）', () => setAmp(s.amp / 10)),
  ));

  const bandAt = (y) => {
    if (y >= B1.top - 10 && y <= B1.top + B1.h + 10) return 'amp';
    if (y >= B2.top - 10 && y <= B2.top + B2.h + 10) return 'db';
    if (y >= B3.top - 10 && y <= B3.bot + 10) return 'curve';
    return null;
  };
  bindPointer(cv.canvas, {
    pick: (x, y) => bandAt(y),
    down: (id, x) => setAmp(id === 'db' ? dbToAmp(dbOfX(x)) : aOfX(x)),
    move: (id, x) => setAmp(id === 'db' ? dbToAmp(dbOfX(x)) : aOfX(x)),
  });

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      shell.stop();
      if (loop) loop.stop();
    },
  };
}

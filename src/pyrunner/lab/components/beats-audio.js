/* =========================================================================
 * lab 组件：beats-audio（拍频与音程）
 * -------------------------------------------------------------------------
 * 演示：两个频率相近的正弦相加，波形上出现「鼓包」——拍。每秒的拍数正好等于
 * |f₁ − f₂|；差值越大，鼓包越密，超过约 20 Hz 就从「一鼓一鼓的拍」变成
 * 粗糙感，再大就听成两个分开的音。最下面一条音程尺给出常见音程的频率比与音分。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "beats-audio",
 *     "title": "把 f₂ 拖开一点，听每秒几拍"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   f1   第一个频率（Hz），默认 440
 *   df   频差 f₂ − f₁（Hz），默认 4（= 每秒 4 拍）
 *   span 中间频率条的可视跨度（Hz），默认 120（以 f₁ 为中心 ±60）
 *   win  波形窗时长（秒），默认 1.0（正好一秒，窗里鼓包数 = 拍频）
 *
 * 出声组件：点「▶ 播放」才创建 AudioContext（两条正弦各 0.1，合计 0.2），
 * 「■ 停止」随时停，滚出视口自动停。
 *
 * 能拖：中间条上的 f₁ / f₂ 两个把手（f₁ 在正中，拖它整条跟着平移）；
 * 最下面的音分尺也能拖，直接给 f₂ 定音程位置。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  audioShell, polyline, label, clamp, fmt,
  setSliderRow,
  clearBg,
} from '../core.js';

const INTERVALS = [
  { ratio: '1:1', name: '同度', cents: 0 },
  { ratio: '16:15', name: '半音', cents: 112 },
  { ratio: '9:8', name: '全音', cents: 204 },
  { ratio: '6:5', name: '小三度', cents: 316 },
  { ratio: '5:4', name: '大三度', cents: 386 },
  { ratio: '4:3', name: '纯四度', cents: 498 },
  { ratio: '3:2', name: '纯五度', cents: 702 },
  { ratio: '5:3', name: '大六度', cents: 884 },
  { ratio: '2:1', name: '八度', cents: 1200 },
];

const centsOf = (r) => 1200 * Math.log2(r);

/* 找一个简单整数比近似当前频率比（分母 ≤ 16） */
function simpleRatio(r) {
  let best = null;
  for (let q = 1; q <= 16; q += 1) {
    const p = Math.round(r * q);
    if (p < q || p > 32) continue;
    const err = Math.abs(centsOf(r) - centsOf(p / q));
    if (!best || err < best.err) best = { p, q, err, text: p + ':' + q };
  }
  return best;
}

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    f1: spec.f1 ?? 440,
    df: spec.df ?? 4,
    span: spec.span ?? 120,
    win: spec.win ?? 1.0,
  };
  let t1 = null;
  let t2 = null;

  const cv = setupCanvas(host, 338);
  const ro = buildReadout({ 'f₁': '—', 'f₂': '—', 拍频: '—', 频率比: '—', 音分差: '—', 最近音程: '—' });
  host.appendChild(ro.box);

  const PAD_L = 30;
  const PAD_R = 16;
  const W_TOP = 36;
  const W_BOT = 192;
  const F_TRACK_T = 216;
  const F_TRACK_B = 234;
  const C_TRACK_T = 298;
  const C_TRACK_B = 310;

  const laneW = () => cv.W - PAD_L - PAD_R;
  const waveMid = () => (W_TOP + W_BOT) / 2;
  const half = () => (W_BOT - W_TOP) / 2 - 12;
  const yOfWave = (v) => waveMid() - (v / 2) * half(); /* 两个单位幅度相加，峰值 2 */
  const fLo = () => s.f1 - s.span / 2;
  const xOfF = (f) => PAD_L + ((f - fLo()) / s.span) * laneW();
  const fOfX = (x) => fLo() + clamp((x - PAD_L) / laneW(), 0, 1) * s.span;
  const xOfCents = (c) => PAD_L + (clamp(c, 0, 1200) / 1200) * laneW();
  const centsOfX = (x) => clamp((x - PAD_L) / laneW(), 0, 1) * 1200;

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    const f1 = s.f1;
    const f2 = s.f1 + s.df;
    const adf = Math.abs(s.df);

    /* ---------- 上：合成波与包络 ---------- */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, waveMid());
    ctx.lineTo(W - PAD_R, waveMid());
    ctx.stroke();
    const N = Math.max(1, Math.floor(laneW()));
    const SUB = 6;
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < N; i += 1) {
      const t0 = (i / N) * s.win;
      const t1e = ((i + 1) / N) * s.win;
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = 0; k < SUB; k += 1) {
        const t = t0 + ((t1e - t0) * k) / SUB;
        const v = Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const yTop = yOfWave(hi);
      ctx.fillRect(PAD_L + i, yTop, 1, Math.max(1, yOfWave(lo) - yTop));
    }
    ctx.globalAlpha = 1;

    /* 包络 ±2|cos(π Δf t)| */
    const up = [];
    const dn = [];
    for (let i = 0; i <= N; i += 1) {
      const t = (i / N) * s.win;
      const e = 2 * Math.abs(Math.cos(Math.PI * s.df * t));
      up.push([PAD_L + i, yOfWave(e)]);
      dn.push([PAD_L + i, yOfWave(-e)]);
    }
    polyline(ctx, up, C.accent2, 1.6, [5, 4]);
    polyline(ctx, dn, C.accent2, 1.6, [5, 4]);
    label(ctx, '两个正弦相加：包络的每一鼓 = 一次拍（每秒 |f₁−f₂| 次）',
      PAD_L, W_TOP - 10, C.fg, { size: 10 });
    label(ctx, '0 → ' + fmt(s.win, 2) + ' s', W - PAD_R, W_BOT - 4, C.fg,
      { align: 'right', size: 9 });

    /* 拍周期标尺 */
    if (adf > 0.05) {
      const bw = Math.min((1 / adf) / s.win, 1) * laneW();
      const by = W_TOP + 10;
      ctx.strokeStyle = C.named('teal');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(PAD_L, by - 5);
      ctx.lineTo(PAD_L, by + 5);
      ctx.moveTo(PAD_L, by);
      ctx.lineTo(PAD_L + bw, by);
      ctx.moveTo(PAD_L + bw, by - 5);
      ctx.lineTo(PAD_L + bw, by + 5);
      ctx.stroke();
      label(ctx, '一个拍周期 ' + fmt(1 / adf, 3) + ' s', PAD_L + bw + 6, by + 4,
        C.named('teal'), { size: 10 });
    }

    /* ---------- 中：频率条（以 f₁ 为中心） ---------- */
    ctx.fillStyle = C.soft;
    ctx.fillRect(PAD_L, F_TRACK_T, laneW(), F_TRACK_B - F_TRACK_T);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD_L + 0.5, F_TRACK_T + 0.5, laneW() - 1, F_TRACK_B - F_TRACK_T - 1);
    [-1, -0.5, 0, 0.5, 1].forEach((k) => {
      const f = s.f1 + k * (s.span / 2);
      const x = xOfF(f);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(x, F_TRACK_T);
      ctx.lineTo(x, F_TRACK_B);
      ctx.stroke();
      label(ctx, fmt(f, 0), x, F_TRACK_B + 13, C.fg, { align: 'center', size: 9 });
    });
    const handle = (f, col, txt, up2) => {
      const x = xOfF(f);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, F_TRACK_T);
      ctx.lineTo(x, F_TRACK_B);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, up2 ? F_TRACK_T - 2 : F_TRACK_B + 2);
      ctx.lineTo(x - 6, up2 ? F_TRACK_T - 12 : F_TRACK_B + 12);
      ctx.lineTo(x + 6, up2 ? F_TRACK_T - 12 : F_TRACK_B + 12);
      ctx.closePath();
      ctx.fill();
      label(ctx, txt, x, up2 ? F_TRACK_T - 16 : F_TRACK_B + 26, col,
        { align: 'center', size: 10, weight: 600 });
      return x;
    };
    handle(f1, C.accent, 'f₁ = ' + fmt(f1, 1) + ' Hz', true);
    const x2 = handle(f2, C.accent2, 'f₂ = ' + fmt(f2, 1) + ' Hz', false);
    /* Δf 括号 */
    const x1 = xOfF(f1);
    const by2 = F_TRACK_B + 46;
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x1, by2 - 4);
    ctx.lineTo(x1, by2);
    ctx.lineTo(x2, by2);
    ctx.lineTo(x2, by2 - 4);
    ctx.stroke();
    label(ctx, 'Δf = ' + fmt(s.df, 1) + ' Hz → 每秒 ' + fmt(adf, 1) + ' 拍',
      (x1 + x2) / 2, by2 + 13, C.named('purple'), { align: 'center', size: 10 });

    /* ---------- 下：音分尺 ---------- */
    const cents = centsOf(f2 / f1);
    label(ctx, '音程尺（音分）：常见音程的频率比', PAD_L, C_TRACK_T - 6, C.fg, { size: 10 });
    ctx.fillStyle = C.soft;
    ctx.fillRect(PAD_L, C_TRACK_T, laneW(), C_TRACK_B - C_TRACK_T);
    ctx.strokeStyle = C.axis;
    ctx.strokeRect(PAD_L + 0.5, C_TRACK_T + 0.5, laneW() - 1, C_TRACK_B - C_TRACK_T - 1);
    /* 拍音区（差得极少才有拍） */
    ctx.fillStyle = C.accent2;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(PAD_L, C_TRACK_T, xOfCents(50) - PAD_L, C_TRACK_B - C_TRACK_T);
    ctx.globalAlpha = 1;
    INTERVALS.forEach((iv) => {
      const x = xOfCents(iv.cents);
      ctx.strokeStyle = C.fg;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, C_TRACK_T);
      ctx.lineTo(x, C_TRACK_B);
      ctx.stroke();
      label(ctx, iv.ratio, x, C_TRACK_B + 13, C.fg,
        { align: iv.cents === 0 ? 'left' : iv.cents === 1200 ? 'right' : 'center', size: 9 });
    });
    const cx = xOfCents(Math.abs(cents));
    ctx.fillStyle = C.named('purple');
    ctx.beginPath();
    ctx.moveTo(cx, C_TRACK_T - 2);
    ctx.lineTo(cx - 5, C_TRACK_T - 11);
    ctx.lineTo(cx + 5, C_TRACK_T - 11);
    ctx.closePath();
    ctx.fill();
    label(ctx, fmt(cents, 0) + ' 音分', cx, C_TRACK_T - 14, C.named('purple'),
      { align: cx > W - PAD_R - 60 ? 'right' : 'center', size: 10, weight: 600 });
    label(ctx, '拍只发生在音分差极小的一小段里（左端那块阴影，0–50 音分）；'
      + '差值越大越粗糙，最后听成两个音', PAD_L, H - 6, C.fg, { size: 9 });

    /* ---------- 读数 ---------- */
    const r = f2 / f1;
    const sr = simpleRatio(r >= 1 ? r : 1 / r);
    const srText = sr ? (r >= 1 ? sr.text : sr.q + ':' + sr.p) : null;
    let near = INTERVALS[0];
    INTERVALS.forEach((iv) => {
      if (Math.abs(iv.cents - Math.abs(cents)) < Math.abs(near.cents - Math.abs(cents))) near = iv;
    });
    ro.set('f₁', fmt(f1, 1) + ' Hz');
    ro.set('f₂', fmt(f2, 1) + ' Hz');
    ro.set('拍频', fmt(adf, 1) + ' 拍/秒'
      + (adf < 0.5 ? '　（几乎同度，起伏极慢）'
        : adf < 20 ? '　（能一鼓一鼓数清楚）'
          : adf < 40 ? '　（太快，变成粗糙感）' : '　（听成两个分开的音）'));
    ro.set('频率比', fmt(r, 4) + (sr && sr.err < 30 ? '　≈ ' + srText : '　（不是简单整数比）'));
    ro.set('音分差', fmt(cents, 1) + ' 音分　（一个半音 = 100 音分，八度 = 1200 音分）');
    ro.set('最近音程', near.name + '（' + near.ratio + '，' + near.cents + ' 音分）');
  }

  const shell = audioShell(host, (eng, api) => {
    t1 = eng.tone({ type: 'sine', freq: s.f1, gain: 0.1 });
    t2 = eng.tone({ type: 'sine', freq: s.f1 + s.df, gain: 0.1 });
    api.hint.textContent = '两路正弦各 0.1（合计 0.2）';
    return () => {
      t1 = null;
      t2 = null;
    };
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'f1', label: 'f₁', min: 110, max: 880, step: 1, value: s.f1, fmt: 0 },
        { name: 'df', label: '频差 Δf', min: -60, max: 60, step: 0.1, value: s.df, fmt: 1 },
      ],
    },
    (st) => {
      s.f1 = st.f1;
      s.df = st.df;
      if (t1) t1.setFreq(s.f1);
      if (t2) t2.setFreq(s.f1 + s.df);
      draw();
    },
  );

  function update() {
    if (t1) t1.setFreq(s.f1);
    if (t2) t2.setFreq(s.f1 + s.df);
    setSliderRow(sliders, 0, Math.round(s.f1), 0, 'f1');
    setSliderRow(sliders, 1, Math.round(s.df * 10) / 10, 1, 'df');
    draw();
  }

  const inFreq = (y) => y >= F_TRACK_T - 16 && y <= F_TRACK_B + 16;
  const inCents = (y) => y >= C_TRACK_T - 14 && y <= C_TRACK_B + 14;
  bindPointer(cv.canvas, {
    pick: (x, y) => {
      if (inCents(y)) return 'cents';
      if (inFreq(y)) {
        const d1 = Math.abs(x - xOfF(s.f1));
        const d2 = Math.abs(x - xOfF(s.f1 + s.df));
        return d1 <= d2 ? 'f1' : 'f2';
      }
      return null;
    },
    down: (id, x) => {
      if (id === 'cents') {
        s.df = clamp(s.f1 * (2 ** (centsOfX(x) / 1200)) - s.f1, -s.span / 2 + 1, s.span / 2 - 1);
      } else if (id === 'f1') {
        s.f1 = clamp(fOfX(x), 110, 880);
      } else {
        s.df = clamp(fOfX(x) - s.f1, -s.span / 2 + 1, s.span / 2 - 1);
      }
      update();
    },
    move: (id, x) => {
      if (id === 'cents') {
        s.df = clamp(s.f1 * (2 ** (centsOfX(x) / 1200)) - s.f1, -s.span / 2 + 1, s.span / 2 - 1);
      } else if (id === 'f1') {
        s.f1 = clamp(fOfX(x), 110, 880);
      } else {
        s.df = clamp(fOfX(x) - s.f1, -s.span / 2 + 1, s.span / 2 - 1);
      }
      update();
    },
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

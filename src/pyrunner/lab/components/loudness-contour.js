/* =========================================================================
 * lab 组件：loudness-contour（等响曲线）
 * -------------------------------------------------------------------------
 * 演示 Fletcher–Munson / ISO 226 思路的等响曲线族：同一条曲线上的点，听上去
 * 一样响。曲线在低频和高频两头翘起来——耳朵对这些频率不敏感，要更大的声压级
 * 才换来同样的响度；而响度级越高，曲线越平（不敏感的程度被「拉平」了）。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "loudness-contour",
 *     "title": "拖曲线上下，看等响曲线怎么抬"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   phon   初始响度级（0–100 phon），默认 40
 *   freq   初始观察频率（Hz），默认 1000
 *   levels 曲线族数组，默认 [0, 20, 40, 60, 80, 100]
 *
 * 不出声：等响曲线要靠真实声压级标定（20 μPa 基准 + 耳机/音箱灵敏度），
 * 浏览器里拿不到回放声压级，硬做「补偿试听」只会骗人，所以这里只给数。
 *
 * 能拖：在图上任意处上下拖动 = 换响度级（曲线整体升降，1 kHz 处始终等于
 * 响度级数）；横向移动鼠标 = 读某个频率需要多大声压级。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  polyline, label, clamp, fmt,
  setSliderRow,
  clearBg,
} from '../core.js';

const F_LO = 20;
const F_HI = 10000;   /* 上面的解析近似在 10 kHz 以上会发散，顶部到此为止 */
const DB_TOP = 130;
const DB_BOT = 0;
const PHONS = [0, 20, 40, 60, 80, 100];

/* 听阈（MAF）解析近似，单位 dB SPL。k = f / 1 kHz */
function thresholdDb(f) {
  const k = f / 1000;
  return 3.64 * k ** -0.8
    - 6.5 * Math.exp(-0.6 * (k - 3.3) ** 2)
    + 1e-3 * k ** 4;
}

/* 等响曲线近似：
   Lp(f, N) = N + [听阈(f) − 听阈(1k)] × k(N)
   k(N) 随响度级下降，就是「曲线在高声压级下变平」这件事。
   1 kHz 处恒等于 N（响度级按定义就等于 1 kHz 的声压级）。 */
function contourDb(f, phon) {
  const deficit = thresholdDb(f) - thresholdDb(1000);
  const flatten = Math.max(0.25, 1.08 - 0.0082 * phon);
  return phon + deficit * flatten;
}

function hzText(f) {
  return f >= 1000 ? fmt(f / 1000, f % 1000 === 0 ? 0 : 1) + 'k' : fmt(f, 0);
}

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    phon: clamp(spec.phon ?? 40, 0, 100),
    freq: clamp(spec.freq ?? 1000, F_LO, F_HI),
  };
  const levels = (Array.isArray(spec.levels) && spec.levels.length ? spec.levels : PHONS).slice();

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ '响度级': '—', '观察频率': '—', '所需声压级': '—', '相对 1 kHz': '—' });
  host.appendChild(ro.box);

  const PAD_L = 40;
  const PAD_R = 16;
  const TOP = 26;
  const BOT = 284;

  const laneW = () => cv.W - PAD_L - PAD_R;
  const xOf = (f) => PAD_L + (Math.log(clamp(f, F_LO, F_HI) / F_LO) / Math.log(F_HI / F_LO)) * laneW();
  const fOf = (x) => F_LO * Math.exp(clamp((x - PAD_L) / laneW(), 0, 1) * Math.log(F_HI / F_LO));
  const yOfDb = (db) => BOT - ((clamp(db, DB_BOT, DB_TOP) - DB_BOT) / (DB_TOP - DB_BOT)) * (BOT - TOP);
  const dbOfY = (y) => DB_BOT + clamp((BOT - y) / (BOT - TOP), 0, 1) * (DB_TOP - DB_BOT);

  /* 曲线族里当前响度级下最灵敏的频率（曲线最低点） */
  function mostSensitive(phon) {
    let bestF = 1000;
    let bestV = Infinity;
    for (let i = 0; i <= 240; i += 1) {
      const f = F_LO * Math.exp((i / 240) * Math.log(F_HI / F_LO));
      const v = contourDb(f, phon);
      if (v < bestV) {
        bestV = v;
        bestF = f;
      }
    }
    return { f: bestF, db: bestV };
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    /* ---------- 网格 ---------- */
    ctx.lineWidth = 1;
    [0, 20, 40, 60, 80, 100, 120].forEach((db) => {
      const y = yOfDb(db);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(W - PAD_R, y);
      ctx.stroke();
      label(ctx, String(db), PAD_L - 6, y + 3, C.fg, { align: 'right', size: 9 });
    });
    [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000].forEach((f) => {
      const x = xOf(f);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(x, TOP);
      ctx.lineTo(x, BOT);
      ctx.stroke();
      label(ctx, hzText(f), x, BOT + 14, C.fg, { align: 'center', size: 9 });
    });
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(PAD_L, TOP);
    ctx.lineTo(PAD_L, BOT);
    ctx.lineTo(W - PAD_R, BOT);
    ctx.stroke();
    label(ctx, '声压级（dB SPL）', PAD_L - 6, TOP - 8, C.fg, { size: 10 });
    label(ctx, '频率（Hz，对数轴）', W - PAD_R, BOT + 26, C.fg, { align: 'right', size: 10 });

    /* 1 kHz 参考线：响度级就定义在这里 */
    const xk = xOf(1000);
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xk, TOP);
    ctx.lineTo(xk, BOT);
    ctx.stroke();
    ctx.restore();
    label(ctx, '1 kHz：响度级 = 声压级', xk + 4, BOT - 6, C.fg, { size: 9 });

    /* ---------- 曲线族 ---------- */
    levels.forEach((phon) => {
      const pts = [];
      for (let i = 0; i <= 200; i += 1) {
        const f = F_LO * Math.exp((i / 200) * Math.log(F_HI / F_LO));
        pts.push([xOf(f), yOfDb(contourDb(f, phon))]);
      }
      const cur = Math.abs(phon - s.phon) < 0.5;
      polyline(ctx, pts, cur ? C.accent : C.grid, cur ? 2.6 : 1.2);
      if (cur) {
        const last = pts[pts.length - 1];
        label(ctx, fmt(phon, 0) + ' phon', last[0] - 4, last[1] - 6, C.accent,
          { align: 'right', size: 11, weight: 600 });
      } else if (phon === 0) {
        label(ctx, '听阈', pts[0][0] + 6, pts[0][1] + 12, C.fg, { size: 9 });
      }
    });

    /* 最灵敏点 */
    const ms = mostSensitive(s.phon);
    ctx.fillStyle = C.named('green');
    ctx.beginPath();
    ctx.arc(xOf(ms.f), yOfDb(ms.db), 3.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, '最灵敏 ≈ ' + hzText(ms.f) + ' Hz', xOf(ms.f), yOfDb(ms.db) + 16, C.named('green'),
      { align: 'center', size: 9 });

    /* ---------- 观察点 ---------- */
    const fx = xOf(s.freq);
    const need = contourDb(s.freq, s.phon);
    ctx.save();
    ctx.strokeStyle = C.accent2;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fx, TOP);
    ctx.lineTo(fx, BOT);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(fx, yOfDb(need), 5, 0, Math.PI * 2);
    ctx.fill();
    const nearRight = fx > W - PAD_R - 70;
    label(ctx, fmt(need, 0) + ' dB', fx + (nearRight ? -8 : 8), yOfDb(need) - 8, C.accent2,
      { align: nearRight ? 'right' : 'left', size: 11, weight: 600 });
    label(ctx, hzText(s.freq) + ' Hz', fx, TOP + 12, C.accent2,
      { align: nearRight ? 'right' : 'center', size: 10 });

    /* 1 kHz 处的把手（拖动点） */
    const hy = yOfDb(s.phon);
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(xk, hy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    /* ---------- 读数 ---------- */
    const extra = need - s.phon;
    ro.set('响度级', fmt(s.phon, 0) + ' phon　（= 1 kHz 处的 ' + fmt(s.phon, 0) + ' dB SPL）');
    ro.set('观察频率', fmt(s.freq, 0) + ' Hz');
    ro.set('所需声压级', fmt(need, 1) + ' dB SPL　（听阈约 '
      + fmt(thresholdDb(s.freq), 0) + ' dB）');
    ro.set('相对 1 kHz', (extra >= 0 ? '+' : '') + fmt(extra, 1) + ' dB'
      + (Math.abs(extra) < 0.5 ? '　（这正是响度级的定义点）'
        : '　（同样响，这里要多给 ' + fmt(Math.abs(extra), 1) + ' dB）'));

    label(ctx, '上下拖动 = 换响度级，左右移动 = 换观察频率', PAD_L, H - 22, C.fg, { size: 10 });
    label(ctx, '低频/高频两端翘起 = 耳朵不敏感；声压级越高，曲线越平',
      PAD_L, H - 8, C.fg, { size: 10 });
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'phon', label: '响度级', min: 0, max: 100, step: 1, value: s.phon, fmt: 0 },
        { name: 'freq', label: '观察频率', min: F_LO, max: F_HI, step: 1, value: s.freq, fmt: 0 },
      ],
    },
    (st) => {
      s.phon = st.phon;
      s.freq = st.freq;
      draw();
    },
  );

  function setView(f, phon) {
    s.freq = clamp(f, F_LO, F_HI);
    s.phon = clamp(phon, 0, 100);
    setSliderRow(sliders, 0, Math.round(s.phon), 0, 'phon');
    setSliderRow(sliders, 1, Math.round(s.freq), 0, 'freq');
    draw();
  }

  bindPointer(cv.canvas, {
    pick: (x, y) => (y >= TOP - 10 && y <= BOT + 10 ? 'L' : null),
    down: (id, x, y) => setView(fOf(x), dbOfY(y)),
    move: (id, x, y) => setView(fOf(x), dbOfY(y)),
    hover: (x, y) => {
      if (y >= TOP - 10 && y <= BOT + 10) {
        s.freq = clamp(fOf(x), F_LO, F_HI);
        setSliderRow(sliders, 1, Math.round(s.freq), 0, 'freq');
        draw();
      }
    },
  });

  draw();
  cv.redraw = draw;

  return { slidersBox: sliders.box, destroy() {} };
}
